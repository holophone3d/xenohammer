// clanlib_shim_impl.cpp – SDL2+OpenGL backend for the ClanLib 0.6.x shim
// Compile this single file into your project alongside the game sources.

#include <SDL.h>
#include <SDL_image.h>
#include <SDL_ttf.h>
#include <SDL_mixer.h>

#include <ClanLib/core.h>
#include <ClanLib/application.h>
#include <ClanLib/display.h>
#include <ClanLib/gl.h>
// Undo the glViewport macro so the shim can call the real GL function
#undef glViewport
#include <ClanLib/sound.h>
#include <ClanLib/vorbis.h>
#include <ClanLib/ttf.h>
#include <ClanLib/gui.h>

#include "asset_pack.h"

#include <cstdio>
#include <cstring>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iostream>
#include <filesystem>
#include <vector>

// ============================================================================
// Asset loading helpers — route through AssetPack (embedded ZIP) when active,
// fall back to disk files for development builds.
// ============================================================================

static SDL_Surface* asset_IMG_Load(const char* path) {
    SDL_RWops* rw = AssetPack::open(path);
    if (rw) {
        // TGA/PCX have no reliable magic bytes — provide format hint from extension
        const char* ext = strrchr(path, '.');
        const char* type = nullptr;
        if (ext) {
            ext++;
            if (_stricmp(ext, "tga") == 0) type = "TGA";
            else if (_stricmp(ext, "pcx") == 0) type = "PCX";
            else if (_stricmp(ext, "bmp") == 0) type = "BMP";
            else if (_stricmp(ext, "png") == 0) type = "PNG";
        }
        return type ? IMG_LoadTyped_RW(rw, 1, type) : IMG_Load_RW(rw, 1);
    }
    return IMG_Load(path);
}

static Mix_Chunk* asset_Mix_LoadWAV(const char* path) {
    SDL_RWops* rw = AssetPack::open(path);
    if (rw) return Mix_LoadWAV_RW(rw, 1);
    return Mix_LoadWAV(path);
}

static Mix_Music* asset_Mix_LoadMUS(const char* path) {
    SDL_RWops* rw = AssetPack::open(path);
    if (rw) return Mix_LoadMUS_RW(rw, 1);
    return Mix_LoadMUS(path);
}

static TTF_Font* asset_TTF_OpenFont(const char* path, int size) {
    SDL_RWops* rw = AssetPack::open(path);
    if (rw) return TTF_OpenFontRW(rw, 1, size);
    return TTF_OpenFont(path, size);
}

// ============================================================================
// Internal globals
// ============================================================================
static SDL_Window*   g_window     = nullptr;
static SDL_GLContext  g_glcontext  = nullptr;
static int           g_width      = 800;
static int           g_height     = 600;

// Viewport letterbox state (updated on resize/fullscreen)
static int  g_vpX = 0, g_vpY = 0, g_vpW = 800, g_vpH = 600;

// Intercept game's glViewport calls — always apply letterbox transform
void shim_glViewport(GLint /*x*/, GLint /*y*/, GLsizei /*w*/, GLsizei /*h*/) {
    glViewport(g_vpX, g_vpY, g_vpW, g_vpH);
}

// Input singletons
static CL_InputDevice g_keyboard;
static CL_InputDevice g_joystick;
CL_InputDevice* CL_Input::keyboards[1] = { &g_keyboard };
std::vector<CL_InputDevice*> CL_Input::joysticks;

static SDL_Joystick* g_sdl_joystick = nullptr;

// ============================================================================
// CL_System
// ============================================================================
unsigned int CL_System::get_time() {
    return SDL_GetTicks();
}

void CL_System::sleep(int ms) {
    SDL_Delay(ms);
}

void CL_System::keep_alive() {
    SDL_Event e;
    while (SDL_PollEvent(&e)) {
        if (e.type == SDL_QUIT) {
            // The game checks for escape; treat window-close as escape press
        }
        // Alt+Enter toggles fullscreen
        if (e.type == SDL_KEYDOWN && e.key.keysym.sym == SDLK_RETURN &&
            (e.key.keysym.mod & KMOD_ALT)) {
            Uint32 flags = SDL_GetWindowFlags(g_window);
            if (flags & SDL_WINDOW_FULLSCREEN_DESKTOP) {
                SDL_SetWindowFullscreen(g_window, 0);
            } else {
                SDL_SetWindowFullscreen(g_window, SDL_WINDOW_FULLSCREEN_DESKTOP);
            }
        }
        // Maintain viewport on resize/fullscreen change
        if (e.type == SDL_WINDOWEVENT &&
            (e.window.event == SDL_WINDOWEVENT_SIZE_CHANGED ||
             e.window.event == SDL_WINDOWEVENT_RESIZED)) {
            int winW = e.window.data1;
            int winH = e.window.data2;
            // Letterbox: fit 800x600 centered with correct aspect ratio
            float scaleX = (float)winW / g_width;
            float scaleY = (float)winH / g_height;
            float scale = (scaleX < scaleY) ? scaleX : scaleY;
            g_vpW = (int)(g_width * scale);
            g_vpH = (int)(g_height * scale);
            g_vpX = (winW - g_vpW) / 2;
            g_vpY = (winH - g_vpH) / 2;
            glViewport(g_vpX, g_vpY, g_vpW, g_vpH);
        }
    }
}

void CL_System::init() {
    // no-op; actual init happens in CL_SetupCore::init()
}

// ============================================================================
// CL_SetupCore / CL_SetupDisplay
// ============================================================================
void CL_SetupCore::init() {
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_JOYSTICK | SDL_INIT_TIMER) != 0) {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
    }
    if (IMG_Init(IMG_INIT_PNG | IMG_INIT_JPG) == 0) {
        fprintf(stderr, "IMG_Init failed: %s\n", IMG_GetError());
    }
    AssetPack::init();
    CL_Input::init();
}

void CL_SetupCore::deinit() {
    AssetPack::shutdown();
    if (g_sdl_joystick) {
        SDL_JoystickClose(g_sdl_joystick);
        g_sdl_joystick = nullptr;
    }
    IMG_Quit();
    SDL_Quit();
}

void CL_SetupDisplay::init() {
    // Display setup is deferred to set_videomode
}

void CL_SetupDisplay::deinit() {
    if (g_glcontext) { SDL_GL_DeleteContext(g_glcontext); g_glcontext = nullptr; }
    if (g_window)    { SDL_DestroyWindow(g_window);       g_window = nullptr; }
}

// ============================================================================
// CL_ConsoleWindow
// ============================================================================
CL_ConsoleWindow::CL_ConsoleWindow(const char* /*title*/) {}
void CL_ConsoleWindow::redirect_stdio() {}
void CL_ConsoleWindow::display_close_message() {
    printf("Press any key to continue...\n");
}

// ============================================================================
// CL_Display – SDL2+OpenGL backend
// ============================================================================
void CL_Display::set_videomode(int w, int h, int /*bpp*/, bool /*fullscreen*/) {
    g_width  = w;
    g_height = h;

    if (!g_window) {
        // Request an OpenGL context — the game makes raw GL calls
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 1);
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 16);

        Uint32 flags = SDL_WINDOW_SHOWN | SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE;

        int winX = SDL_WINDOWPOS_CENTERED;
        int winY = SDL_WINDOWPOS_CENTERED;

        g_window = SDL_CreateWindow("XenoHammer",
                                    winX, winY,
                                    w, h, flags);
        if (!g_window) {
            fprintf(stderr, "SDL_CreateWindow failed: %s\n", SDL_GetError());
            return;
        }

        g_glcontext = SDL_GL_CreateContext(g_window);
        if (!g_glcontext) {
            fprintf(stderr, "SDL_GL_CreateContext failed: %s\n", SDL_GetError());
            return;
        }
        SDL_GL_MakeCurrent(g_window, g_glcontext);
        SDL_GL_SetSwapInterval(1); // vsync

        // Basic OpenGL state for 2D rendering
        glViewport(0, 0, w, h);
        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        glEnable(GL_TEXTURE_2D);
    } else {
        SDL_SetWindowSize(g_window, w, h);
        glViewport(0, 0, w, h);
    }
}

void CL_Display::clear_display(float r, float g, float b, float a) {
    glClearColor(r, g, b, a);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void CL_Display::flip_display() {
    SDL_GL_SwapWindow(g_window);
}

void CL_Display::fill_rect(int x1, int y1, int x2, int y2,
                            float r, float g, float b, float a) {
    glDisable(GL_TEXTURE_2D);
    glColor4f(r, g, b, a);
    glBegin(GL_QUADS);
        glVertex2i(x1, y1);
        glVertex2i(x2, y1);
        glVertex2i(x2, y2);
        glVertex2i(x1, y2);
    glEnd();
    glEnable(GL_TEXTURE_2D);
}

void CL_Display::draw_line(int x1, int y1, int x2, int y2,
                            float r, float g, float b, float a) {
    glDisable(GL_TEXTURE_2D);
    glColor4f(r, g, b, a);
    glBegin(GL_LINES);
        glVertex2i(x1, y1);
        glVertex2i(x2, y2);
    glEnd();
    glEnable(GL_TEXTURE_2D);
}

int CL_Display::get_width()  { return g_width; }
int CL_Display::get_height() { return g_height; }

SDL_Window* CL_Display::get_window() { return g_window; }

// ============================================================================
// CL_Surface – OpenGL texture-backed
// ============================================================================

// Helper: upload an SDL_Surface to an OpenGL texture (RGBA)
// Optional tcol_r/g/b: if tcol_r >= 0, manually force alpha=0 for matching pixels
static GLuint upload_surface_to_gl(SDL_Surface* surf, int tcol_r = -1, int tcol_g = -1, int tcol_b = -1) {
    if (!surf) return 0;
    SDL_Surface* rgba = SDL_ConvertSurfaceFormat(surf, SDL_PIXELFORMAT_RGBA32, 0);
    if (!rgba) return 0;

    // Belt-and-suspenders: manually zero alpha for pixels matching the tcol color
    if (tcol_r >= 0) {
        SDL_LockSurface(rgba);
        Uint8* px = (Uint8*)rgba->pixels;
        for (int y = 0; y < rgba->h; y++) {
            Uint8* row = px + y * rgba->pitch;
            for (int x = 0; x < rgba->w; x++) {
                Uint8* p = row + x * 4;
                if (p[0] == (Uint8)tcol_r && p[1] == (Uint8)tcol_g && p[2] == (Uint8)tcol_b) {
                    p[3] = 0;
                }
            }
        }
        SDL_UnlockSurface(rgba);
    }

    GLuint tex;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP);

    SDL_LockSurface(rgba);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, rgba->w, rgba->h, 0,
                 GL_RGBA, GL_UNSIGNED_BYTE, rgba->pixels);
    SDL_UnlockSurface(rgba);
    SDL_FreeSurface(rgba);
    return tex;
}

struct CL_Surface::Impl {
    GLuint gl_texture = 0;
    int w = 0, h = 0;
    float alpha = 1.0f;
    SDL_Surface* sdl_surface = nullptr; // kept for CL_Canvas pixel access
};

CL_Surface::CL_Surface() : impl(new Impl) {}

CL_Surface::CL_Surface(const char* filename, bool /*delete_provider*/) : impl(new Impl) {
    init_from_file(filename);
}

CL_Surface::~CL_Surface() {
    if (impl) {
        if (impl->gl_texture)  glDeleteTextures(1, &impl->gl_texture);
        if (impl->sdl_surface) SDL_FreeSurface(impl->sdl_surface);
        delete impl;
    }
}

void CL_Surface::init_from_file(const char* path) {
    SDL_Surface* surf = asset_IMG_Load(path);
    if (!surf) {
        fprintf(stderr, "CL_Surface: failed to load '%s': %s\n", path, IMG_GetError());
        return;
    }
    impl->sdl_surface = surf;
    impl->w = surf->w;
    impl->h = surf->h;
    impl->gl_texture = upload_surface_to_gl(surf);
}

CL_Surface* CL_Surface::load(const char* res_id, CL_ResourceManager* mgr) {
    CL_Surface* s = new CL_Surface();
    if (mgr) {
        auto it = mgr->resources.find(res_id);
        if (it != mgr->resources.end()) {
            std::string full = mgr->base_path + "/" + it->second.file;

            SDL_Surface* surf = asset_IMG_Load(full.c_str());
            if (!surf) {
                fprintf(stderr, "CL_Surface::load: failed '%s': %s\n", full.c_str(), IMG_GetError());
                return s;
            }

            // Handle transparent-color key (tcol = palette index)
            int tr = -1, tg = -1, tb = -1;
            if (it->second.tcol >= 0) {
                // Extract the actual RGB color from the palette before conversion
                if (surf->format->palette &&
                    it->second.tcol < surf->format->palette->ncolors) {
                    SDL_Color& c = surf->format->palette->colors[it->second.tcol];
                    tr = c.r; tg = c.g; tb = c.b;
                } else {
                    fprintf(stderr, "CL_Surface::load: '%s' tcol=%d but palette=%s ncolors=%d\n",
                            res_id, it->second.tcol,
                            surf->format->palette ? "yes" : "NO",
                            surf->format->palette ? surf->format->palette->ncolors : 0);
                }
                SDL_SetColorKey(surf, SDL_TRUE, (Uint32)it->second.tcol);
            }

            s->impl->sdl_surface = surf;
            s->impl->w = surf->w;
            s->impl->h = surf->h;
            s->impl->gl_texture = upload_surface_to_gl(surf, tr, tg, tb);
        } else {
            fprintf(stderr, "CL_Surface::load: resource '%s' not found\n", res_id);
        }
    }
    return s;
}

void CL_Surface::put_screen(int x, int y) {
    if (!impl || !impl->gl_texture) return;

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, impl->gl_texture);
    glColor4f(1.0f, 1.0f, 1.0f, impl->alpha);

    int x2 = x + impl->w;
    int y2 = y + impl->h;
    glBegin(GL_QUADS);
        glTexCoord2f(0.0f, 0.0f); glVertex2i(x,  y);
        glTexCoord2f(1.0f, 0.0f); glVertex2i(x2, y);
        glTexCoord2f(1.0f, 1.0f); glVertex2i(x2, y2);
        glTexCoord2f(0.0f, 1.0f); glVertex2i(x,  y2);
    glEnd();
}

void CL_Surface::put_screen(int x, int y, int srcx, int srcy, int srcw, int srch) {
    if (!impl || !impl->gl_texture || impl->w == 0 || impl->h == 0) return;

    // Convert pixel source rect to texture coordinates (0..1)
    float u0 = (float)srcx / impl->w;
    float v0 = (float)srcy / impl->h;
    float u1 = (float)(srcx + srcw) / impl->w;
    float v1 = (float)(srcy + srch) / impl->h;

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, impl->gl_texture);
    glColor4f(1.0f, 1.0f, 1.0f, impl->alpha);

    int dx2 = x + srcw;
    int dy2 = y + srch;
    glBegin(GL_QUADS);
        glTexCoord2f(u0, v0); glVertex2i(x,   y);
        glTexCoord2f(u1, v0); glVertex2i(dx2, y);
        glTexCoord2f(u1, v1); glVertex2i(dx2, dy2);
        glTexCoord2f(u0, v1); glVertex2i(x,   dy2);
    glEnd();
}

int  CL_Surface::get_width()  { return impl ? impl->w : 0; }
int  CL_Surface::get_height() { return impl ? impl->h : 0; }
void CL_Surface::set_alpha(float alpha) { if (impl) impl->alpha = alpha; }

// ============================================================================
// CL_Canvas
// ============================================================================
struct CL_Canvas::Impl {
    SDL_Surface* surface = nullptr;
    bool owns_surface = false;
};

CL_Canvas::CL_Canvas(CL_Surface* surf) : impl(new Impl) {
    if (surf && surf->impl && surf->impl->sdl_surface) {
        impl->surface = surf->impl->sdl_surface;
        impl->owns_surface = false;
        width = impl->surface->w;
        height = impl->surface->h;
        bpp = impl->surface->format->BytesPerPixel;
    }
}

CL_Canvas::CL_Canvas(int w, int h) : impl(new Impl) {
    impl->surface = SDL_CreateRGBSurfaceWithFormat(0, w, h, 32, SDL_PIXELFORMAT_RGBA32);
    impl->owns_surface = true;
    width = w;
    height = h;
    bpp = 4;
}

CL_Canvas::~CL_Canvas() {
    if (impl) {
        if (impl->owns_surface && impl->surface) SDL_FreeSurface(impl->surface);
        delete impl;
    }
}

void CL_Canvas::get_pixel(int x, int y, float* r, float* g, float* b, float* a) {
    *r = *g = *b = 0.0f; *a = 1.0f;
    if (!impl || !impl->surface) return;
    SDL_Surface* s = impl->surface;
    if (x < 0 || y < 0 || x >= s->w || y >= s->h) return;

    SDL_LockSurface(s);
    Uint8 *pixels = (Uint8*)s->pixels;
    Uint8 *p = pixels + y * s->pitch + x * s->format->BytesPerPixel;
    Uint32 pixel = 0;
    memcpy(&pixel, p, s->format->BytesPerPixel);
    SDL_UnlockSurface(s);

    Uint8 rv, gv, bv, av;
    SDL_GetRGBA(pixel, s->format, &rv, &gv, &bv, &av);
    *r = rv / 255.0f;
    *g = gv / 255.0f;
    *b = bv / 255.0f;
    *a = av / 255.0f;
}

void CL_Canvas::lock() {
    if (impl && impl->surface) {
        SDL_LockSurface(impl->surface);
        pixel_data = (unsigned char*)impl->surface->pixels;
    }
}

void CL_Canvas::unlock() {
    if (impl && impl->surface) {
        SDL_UnlockSurface(impl->surface);
        pixel_data = nullptr;
    }
}

void* CL_Canvas::get_data() {
    if (impl && impl->surface) return impl->surface->pixels;
    return nullptr;
}

int CL_Canvas::get_bytes_per_pixel() {
    if (impl && impl->surface) return impl->surface->format->BytesPerPixel;
    return bpp;
}

// CL_Surface::put_target — render surface pixels into a canvas
void CL_Surface::put_target(int x, int y, int /*frame*/, CL_Canvas* canvas) {
    if (!impl || !impl->sdl_surface || !canvas || !canvas->impl || !canvas->impl->surface) return;
    SDL_Rect dst = { x, y, 0, 0 };
    SDL_BlitSurface(impl->sdl_surface, nullptr, canvas->impl->surface, &dst);
}

// CL_Surface::create — create a surface from canvas pixel data
CL_Surface* CL_Surface::create(CL_Canvas* canvas) {
    CL_Surface* surf = new CL_Surface();
    if (canvas && canvas->impl && canvas->impl->surface) {
        surf->impl = new CL_Surface::Impl;
        // Duplicate the canvas surface
        surf->impl->sdl_surface = SDL_ConvertSurface(canvas->impl->surface,
                                                      canvas->impl->surface->format, 0);
        if (surf->impl->sdl_surface) {
            surf->impl->w = surf->impl->sdl_surface->w;
            surf->impl->h = surf->impl->sdl_surface->h;
            surf->impl->gl_texture = upload_surface_to_gl(surf->impl->sdl_surface);
        }
    }
    return surf;
}

// CL_PCXProvider / CL_TargaProvider — delegate to SDL_image
CL_Surface* CL_PCXProvider::create(const char* filename, bool /*transparent*/) {
    return new CL_Surface(filename);
}

CL_Surface* CL_TargaProvider::create(const char* filename, bool /*transparent*/) {
    return new CL_Surface(filename);
}

// ============================================================================
// CL_Font
// ============================================================================
struct CL_Font::Impl {
    TTF_Font* font = nullptr;
    SDL_Color color = {255, 255, 255, 255};
    int size = 14;
    std::string path;

    // Bitmap font support
    bool is_bitmap = false;
    GLuint bm_texture = 0;
    int bm_width = 0, bm_height = 0;
    int spacelen = 8;
    struct Glyph { int x, w; };
    std::map<char, Glyph> glyphs;
};

CL_Font::CL_Font() : impl(new Impl) {}

CL_Font::~CL_Font() {
    if (impl) {
        if (impl->font) TTF_CloseFont(impl->font);
        if (impl->bm_texture) glDeleteTextures(1, &impl->bm_texture);
        delete impl;
    }
}

CL_Font* CL_Font::load(const char* res_id, CL_ResourceManager* mgr) {
    CL_Font* f = new CL_Font();
    if (mgr) {
        auto it = mgr->resources.find(res_id);
        if (it != mgr->resources.end()) {
            std::string full = mgr->base_path + "/" + it->second.file;
            f->impl->path = full;

            // Bitmap fonts (type=font) use TGA spritesheets — scan for glyphs
            if (it->second.type == "font") {
                f->impl->is_bitmap = true;

                // Parse font-specific options
                std::string letters;
                float trans_limit = 0.05f;
                auto lo = it->second.options.find("letters");
                if (lo != it->second.options.end()) letters = lo->second;
                auto tl = it->second.options.find("trans_limit");
                if (tl != it->second.options.end()) trans_limit = std::stof(tl->second);
                auto sl = it->second.options.find("spacelen");
                if (sl != it->second.options.end()) f->impl->spacelen = std::stoi(sl->second);

                // Load the TGA/image
                SDL_Surface* surf = asset_IMG_Load(full.c_str());
                if (!surf) {
                    fprintf(stderr, "CL_Font::load: bitmap font '%s' failed to load image '%s'\n",
                            res_id, full.c_str());
                    return f;
                }

                // Convert to RGBA for alpha inspection
                SDL_Surface* rgba = SDL_ConvertSurfaceFormat(surf, SDL_PIXELFORMAT_RGBA32, 0);
                SDL_FreeSurface(surf);
                if (!rgba) return f;

                f->impl->bm_width = rgba->w;
                f->impl->bm_height = rgba->h;
                Uint8 alpha_thresh = (Uint8)(trans_limit * 255.0f);

                // Scan columns to find glyph boundaries
                SDL_LockSurface(rgba);
                Uint8* pixels = (Uint8*)rgba->pixels;
                std::vector<bool> col_transparent(rgba->w, true);
                for (int x = 0; x < rgba->w; x++) {
                    for (int y = 0; y < rgba->h; y++) {
                        Uint8 a = pixels[y * rgba->pitch + x * 4 + 3];
                        if (a > alpha_thresh) {
                            col_transparent[x] = false;
                            break;
                        }
                    }
                }
                SDL_UnlockSurface(rgba);

                // Find runs of non-transparent columns → glyphs
                int glyph_idx = 0;
                int x = 0;
                while (x < rgba->w && glyph_idx < (int)letters.size()) {
                    // Skip transparent separator
                    while (x < rgba->w && col_transparent[x]) x++;
                    if (x >= rgba->w) break;
                    // Start of glyph
                    int glyph_start = x;
                    while (x < rgba->w && !col_transparent[x]) x++;
                    int glyph_w = x - glyph_start;
                    if (glyph_idx < (int)letters.size()) {
                        f->impl->glyphs[letters[glyph_idx]] = { glyph_start, glyph_w };
                        glyph_idx++;
                    }
                }

                // Upload full image as GL texture
                f->impl->bm_texture = upload_surface_to_gl(rgba);
                SDL_FreeSurface(rgba);

                fprintf(stderr, "CL_Font::load: bitmap font '%s' — %d glyphs scanned\n",
                        res_id, glyph_idx);
                return f;
            }

            int size = 14;
            auto sz = it->second.options.find("size");
            if (sz != it->second.options.end()) size = std::stoi(sz->second);
            f->impl->size = size;

            f->impl->font = asset_TTF_OpenFont(full.c_str(), size);
            if (!f->impl->font) {
                fprintf(stderr, "CL_Font::load: TTF_OpenFont('%s') failed: %s\n",
                        full.c_str(), TTF_GetError());
            }
        } else {
            fprintf(stderr, "CL_Font::load: resource '%s' not found\n", res_id);
        }
    }
    return f;
}

void CL_Font::change_colour(int r, int g, int b, int a) {
    if (!impl) return;
    impl->color = { (Uint8)r, (Uint8)g, (Uint8)b, (Uint8)a };
}

void CL_Font::change_size(int size) {
    if (!impl) return;
    if (impl->is_bitmap) return; // bitmap fonts have fixed size
    if (size == impl->size && impl->font) return;
    impl->size = size;
    if (impl->font) TTF_CloseFont(impl->font);
    impl->font = asset_TTF_OpenFont(impl->path.c_str(), size);
}

// Bitmap font text rendering
static void bitmap_render_text(CL_Font::Impl* impl, int x, int y, const char* text, int align) {
    if (!impl || !impl->bm_texture || !text || !*text) return;

    // Calculate total width for alignment
    int total_w = 0;
    for (const char* p = text; *p; p++) {
        if (*p == ' ') { total_w += impl->spacelen; continue; }
        auto it = impl->glyphs.find(*p);
        if (it != impl->glyphs.end()) total_w += it->second.w + 1; // +1 spacing
    }

    int dx;
    switch (align) {
        case 0: dx = x;          break; // left
        case 1: dx = x - total_w / 2; break; // center
        case 2: dx = x - total_w;     break; // right
        default: dx = x;         break;
    }

    float tw = (float)impl->bm_width;
    float th = (float)impl->bm_height;

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, impl->bm_texture);
    glColor4f(impl->color.r / 255.0f, impl->color.g / 255.0f,
              impl->color.b / 255.0f, impl->color.a / 255.0f);

    for (const char* p = text; *p; p++) {
        if (*p == ' ') { dx += impl->spacelen; continue; }
        auto it = impl->glyphs.find(*p);
        if (it == impl->glyphs.end()) { dx += impl->spacelen; continue; }

        float u0 = it->second.x / tw;
        float u1 = (it->second.x + it->second.w) / tw;
        int gw = it->second.w;

        glBegin(GL_QUADS);
            glTexCoord2f(u0, 0.0f); glVertex2i(dx,      y);
            glTexCoord2f(u1, 0.0f); glVertex2i(dx + gw, y);
            glTexCoord2f(u1, 1.0f); glVertex2i(dx + gw, y + impl->bm_height);
            glTexCoord2f(u0, 1.0f); glVertex2i(dx,      y + impl->bm_height);
        glEnd();
        dx += gw + 1;
    }
}

static void font_render_text(CL_Font::Impl* impl, int x, int y, const char* text, int align) {
    if (!impl || !text || !*text) return;

    // Bitmap font path
    if (impl->is_bitmap) {
        bitmap_render_text(impl, x, y, text, align);
        return;
    }

    // TTF font path
    if (!impl->font) return;
    SDL_Surface* surf = TTF_RenderUTF8_Blended(impl->font, text, impl->color);
    if (!surf) return;

    // Upload text surface to a temporary GL texture
    GLuint tex = upload_surface_to_gl(surf);
    if (!tex) { SDL_FreeSurface(surf); return; }

    int tw = surf->w;
    int th = surf->h;
    SDL_FreeSurface(surf);

    // ClanLib 0.6 print_* treats Y as the bottom of the text
    // ClanLib 0.6 Y = text baseline; SDL_ttf renders from top-left
    int adjusted_y = y - TTF_FontAscent(impl->font);

    int dx;
    switch (align) {
        case 0: dx = x;          break; // left
        case 1: dx = x - tw / 2; break; // center
        case 2: dx = x - tw;     break; // right
        default: dx = x;         break;
    }

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glColor4f(1.0f, 1.0f, 1.0f, impl->color.a / 255.0f);

    int x2 = dx + tw;
    int y2 = adjusted_y + th;
    glBegin(GL_QUADS);
        glTexCoord2f(0.0f, 0.0f); glVertex2i(dx, adjusted_y);
        glTexCoord2f(1.0f, 0.0f); glVertex2i(x2, adjusted_y);
        glTexCoord2f(1.0f, 1.0f); glVertex2i(x2, y2);
        glTexCoord2f(0.0f, 1.0f); glVertex2i(dx, y2);
    glEnd();

    glDeleteTextures(1, &tex);
}

void CL_Font::print_center(int x, int y, const char* text) {
    font_render_text(impl, x, y, text, 1);
}

void CL_Font::print_right(int x, int y, const char* text) {
    font_render_text(impl, x, y, text, 2);
}

void CL_Font::print_left(int x, int y, const char* text) {
    font_render_text(impl, x, y, text, 0);
}

int CL_Font::get_text_width(const char* text) {
    if (!impl) return 0;
    if (impl->is_bitmap) {
        int w = 0;
        for (const char* p = text; *p; p++) {
            if (*p == ' ') { w += impl->spacelen; continue; }
            auto it = impl->glyphs.find(*p);
            if (it != impl->glyphs.end()) w += it->second.w + 1;
            else w += impl->spacelen;
        }
        return w;
    }
    if (!impl->font) return 0;
    int w = 0, h = 0;
    TTF_SizeUTF8(impl->font, text, &w, &h);
    return w;
}

int CL_Font::get_height() {
    if (!impl) return 0;
    if (impl->is_bitmap) return impl->bm_height;
    if (!impl->font) return 0;
    return TTF_FontHeight(impl->font);
}

// ============================================================================
// CL_OpenGL / CL_SetupGL – real OpenGL projection management
// ============================================================================
void CL_OpenGL::begin_2d() {
    // Save GL state that we modify (blend func, enables, texture binding, etc.)
    // GL_Handler::InitGL sets additive blending; we need normal blending for sprites.
    // glPopAttrib in end_2d restores blend state AND texture binding so GL_Handler
    // gets its own textures (Particle.bmp etc.) back after sprite rendering.
    glPushAttrib(GL_COLOR_BUFFER_BIT | GL_ENABLE_BIT | GL_TEXTURE_BIT);

    glMatrixMode(GL_PROJECTION);
    glPushMatrix();
    glLoadIdentity();
    // Standard screen coords: (0,0) top-left, Y increases downward
    glOrtho(0, g_width, g_height, 0, -1, 1);
    glMatrixMode(GL_MODELVIEW);
    glPushMatrix();
    glLoadIdentity();

    // Standard 2D rendering state — normal alpha blending for sprite rendering
    glDisable(GL_DEPTH_TEST);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glEnable(GL_TEXTURE_2D);
}

void CL_OpenGL::end_2d() {
    // Restore matrices
    glMatrixMode(GL_MODELVIEW);
    glPopMatrix();
    glMatrixMode(GL_PROJECTION);
    glPopMatrix();
    glMatrixMode(GL_MODELVIEW);

    // Restore GL state — this gives GL_Handler its additive blending back
    glPopAttrib();
}

void CL_SetupGL::init()  {}
void CL_SetupGL::deinit() {}

// ============================================================================
// CL_TTFSetup
// ============================================================================
void CL_TTFSetup::init() {
    if (TTF_Init() != 0) {
        fprintf(stderr, "TTF_Init failed: %s\n", TTF_GetError());
    }
}

void CL_TTFSetup::deinit() {
    TTF_Quit();
}

// ============================================================================
// CL_SoundBuffer_Session
// ============================================================================
CL_SoundBuffer_Session::CL_SoundBuffer_Session() {}

void CL_SoundBuffer_Session::play() {
    // Actual play happens when CL_SoundBuffer::play() returns this session
}

void CL_SoundBuffer_Session::stop() {
    if (channel == -2) {
        // Music sentinel — stop the global music stream
        Mix_HaltMusic();
        channel = -1;
    } else if (channel >= 0) {
        Mix_HaltChannel(channel);
        channel = -1;
    }
}

bool CL_SoundBuffer_Session::is_playing() {
    if (channel < 0) return false;
    return Mix_Playing(channel) != 0;
}

void CL_SoundBuffer_Session::set_volume(float vol) {
    if (channel >= 0) {
        Mix_Volume(channel, (int)(vol * MIX_MAX_VOLUME));
    }
}

void CL_SoundBuffer_Session::set_looping(bool /*loop*/) {
    // Looping is set at play time via Mix_PlayChannel
}

float CL_SoundBuffer_Session::get_volume() {
    if (channel >= 0) return Mix_Volume(channel, -1) / (float)MIX_MAX_VOLUME;
    return 1.0f;
}

// ============================================================================
// CL_SoundBuffer
// ============================================================================
struct CL_SoundBuffer::Impl {
    Mix_Chunk* chunk   = nullptr;
    Mix_Music* music   = nullptr;
    float      volume  = 1.0f;
    bool       is_music = false;
};

CL_SoundBuffer::CL_SoundBuffer() : impl(new Impl) {}

CL_SoundBuffer::CL_SoundBuffer(void* provider, bool /*delete_provider*/) : impl(new Impl) {
    // provider is expected to be a CL_VorbisSoundProvider*
    auto* vorbis = static_cast<CL_VorbisSoundProvider*>(provider);
    if (vorbis && !vorbis->filepath.empty()) {
        // Try loading as music (for long files like .ogg)
        impl->music = asset_Mix_LoadMUS(vorbis->filepath.c_str());
        if (impl->music) {
            impl->is_music = true;
        } else {
            impl->chunk = asset_Mix_LoadWAV(vorbis->filepath.c_str());
        }
    }
}

CL_SoundBuffer::~CL_SoundBuffer() {
    if (impl) {
        if (impl->chunk) Mix_FreeChunk(impl->chunk);
        if (impl->music) Mix_FreeMusic(impl->music);
        delete impl;
    }
}

CL_SoundBuffer* CL_SoundBuffer::load(const char* res_id, CL_ResourceManager* mgr) {
    CL_SoundBuffer* sb = new CL_SoundBuffer();
    if (mgr) {
        auto it = mgr->resources.find(res_id);
        if (it != mgr->resources.end()) {
            std::string full = mgr->base_path + "/" + it->second.file;
            sb->impl->chunk = asset_Mix_LoadWAV(full.c_str());
            if (!sb->impl->chunk) {
                sb->impl->music = asset_Mix_LoadMUS(full.c_str());
                sb->impl->is_music = (sb->impl->music != nullptr);
            }
            if (!sb->impl->chunk && !sb->impl->music) {
                fprintf(stderr, "CL_SoundBuffer::load: failed '%s': %s\n",
                        full.c_str(), Mix_GetError());
            }
        } else {
            fprintf(stderr, "CL_SoundBuffer::load: resource '%s' not found\n", res_id);
        }
    }
    return sb;
}

CL_SoundBuffer_Session CL_SoundBuffer::play(bool loop) {
    CL_SoundBuffer_Session session;
    if (!impl) return session;

    if (impl->is_music && impl->music) {
        Mix_VolumeMusic((int)(impl->volume * MIX_MAX_VOLUME));
        Mix_PlayMusic(impl->music, loop ? -1 : 1);
        session.channel = -2; // sentinel for music
    } else if (impl->chunk) {
        int ch = Mix_PlayChannel(-1, impl->chunk, loop ? -1 : 0);
        if (ch >= 0) {
            Mix_Volume(ch, (int)(impl->volume * MIX_MAX_VOLUME));
        }
        session.channel = ch;
    }
    return session;
}

CL_SoundBuffer_Session CL_SoundBuffer::prepare() {
    // Return a session without playing; caller will call session.play()
    CL_SoundBuffer_Session session;
    if (impl && impl->chunk) {
        // Reserve a channel but don't play yet
        int ch = Mix_PlayChannel(-1, impl->chunk, 0);
        if (ch >= 0) Mix_Pause(ch);
        session.channel = ch;
    }
    return session;
}

void CL_SoundBuffer::stop() {
    if (impl && impl->is_music) {
        Mix_HaltMusic();
    }
}

float CL_SoundBuffer::get_volume() { return impl ? impl->volume : 1.0f; }
void  CL_SoundBuffer::set_volume(float vol) {
    if (impl) impl->volume = vol;
}

// ============================================================================
// CL_SetupSound
// ============================================================================
void CL_SetupSound::init() {
    if (Mix_OpenAudio(44100, MIX_DEFAULT_FORMAT, 2, 2048) != 0) {
        fprintf(stderr, "Mix_OpenAudio failed: %s\n", Mix_GetError());
    }
    Mix_AllocateChannels(32);
}

void CL_SetupSound::deinit() {
    Mix_CloseAudio();
}

// ============================================================================
// CL_VorbisSoundProvider
// ============================================================================
CL_VorbisSoundProvider::CL_VorbisSoundProvider(const char* filename,
                                               CL_ResourceManager* mgr) {
    if (mgr && mgr->base_path.size()) {
        filepath = mgr->base_path + "/" + filename;
    } else {
        filepath = filename;
    }
}

CL_VorbisSoundProvider::~CL_VorbisSoundProvider() {}

// ============================================================================
// CL_Resource / CL_ResourceManager
// ============================================================================
const std::string& CL_Resource::get_location() {
    return entry.file;
}

// Minimal ClanLib 0.6 resource file parser.
// Supports nested sections: section Game { section Graphics { ... } }
// Handles: "section X {" on one line, multi-line parenthetical options.
// Flattens to "Game/Graphics/id" keys.
CL_ResourceManager::CL_ResourceManager(const char* filename, bool /*something*/) {
    namespace fs = std::filesystem;
    base_path = fs::path(filename).parent_path().string();
    if (base_path.empty()) base_path = ".";

    // Try embedded asset pack first, fall back to disk
    std::string content = AssetPack::read_text(filename);
    if (content.empty()) {
        std::ifstream in(filename);
        if (!in.is_open()) {
            fprintf(stderr, "CL_ResourceManager: cannot open '%s'\n", filename);
            return;
        }
        content.assign((std::istreambuf_iterator<char>(in)),
                         std::istreambuf_iterator<char>());
    }

    // Preprocess: join multi-line entries (lines inside unclosed parentheses)
    std::vector<std::string> lines;
    {
        std::string accum;
        int paren_depth = 0;
        std::istringstream stream(content);
        std::string raw;
        while (std::getline(stream, raw)) {
            // Trim trailing \r
            if (!raw.empty() && raw.back() == '\r') raw.pop_back();
            for (char c : raw) {
                if (c == '(') paren_depth++;
                else if (c == ')') { if (paren_depth > 0) paren_depth--; }
            }
            if (accum.empty()) {
                accum = raw;
            } else {
                accum += " " + raw; // join continuation lines with space
            }
            if (paren_depth == 0) {
                lines.push_back(accum);
                accum.clear();
            }
        }
        if (!accum.empty()) lines.push_back(accum);
    }

    std::vector<std::string> section_stack;
    std::string pending_section;

    auto build_prefix = [&]() -> std::string {
        std::string prefix;
        for (auto& s : section_stack) {
            if (!prefix.empty()) prefix += "/";
            prefix += s;
        }
        return prefix;
    };

    auto trim_str = [](std::string& s) {
        size_t a = s.find_first_not_of(" \t\r\n");
        size_t b = s.find_last_not_of(" \t\r\n");
        if (a == std::string::npos) { s.clear(); return; }
        s = s.substr(a, b - a + 1);
    };

    // Process a single token (could be section, brace, resource, or comment)
    auto process_token = [&](std::string line) {
        trim_str(line);
        if (line.empty()) return;

        // Skip comments
        if (line[0] == '#') return;
        if (line.size() >= 2 && line[0] == '/' && line[1] == '/') return;

        // "section <name>" possibly followed by "{"
        if (line.rfind("section ", 0) == 0) {
            std::string secname = line.substr(8);
            size_t e = secname.find_first_of(" \t\r\n{");
            if (e != std::string::npos) secname = secname.substr(0, e);
            pending_section = secname;
            // Check if { appears on the same line
            if (line.find('{') != std::string::npos) {
                section_stack.push_back(pending_section);
                pending_section.clear();
            }
            return;
        }

        // Opening brace
        if (line[0] == '{') {
            section_stack.push_back(pending_section.empty() ? "" : pending_section);
            pending_section.clear();
            return;
        }

        // Closing brace
        if (line[0] == '}') {
            if (!section_stack.empty()) section_stack.pop_back();
            return;
        }

        // Resource line: name = file (options...);
        size_t eq = line.find('=');
        if (eq == std::string::npos) return;

        std::string name = line.substr(0, eq);
        trim_str(name);

        std::string rest = line.substr(eq + 1);
        trim_str(rest);
        // Remove trailing semicolon
        size_t sc = rest.rfind(';');
        if (sc != std::string::npos) rest = rest.substr(0, sc);
        trim_str(rest);

        ResourceEntry entry;

        size_t paren = rest.find('(');
        if (paren != std::string::npos) {
            entry.file = rest.substr(0, paren);
            trim_str(entry.file);

            size_t close = rest.rfind(')');
            if (close != std::string::npos && close > paren) {
                std::string opts = rest.substr(paren + 1, close - paren - 1);
                std::istringstream oss(opts);
                std::string opt;
                while (std::getline(oss, opt, ',')) {
                    size_t oeq = opt.find('=');
                    if (oeq != std::string::npos) {
                        std::string key = opt.substr(0, oeq);
                        std::string val = opt.substr(oeq + 1);
                        trim_str(key);
                        trim_str(val);
                        // Remove surrounding quotes from val
                        if (val.size() >= 2 && val.front() == '"' && val.back() == '"')
                            val = val.substr(1, val.size() - 2);
                        entry.options[key] = val;

                        if (key == "type") entry.type = val;
                        if (key == "tcol") {
                            try { entry.tcol = std::stoi(val, nullptr, 0); }
                            catch (...) {}
                        }
                    }
                }
            }
        } else {
            entry.file = rest;
            trim_str(entry.file);
        }

        std::string prefix = build_prefix();
        std::string key = prefix.empty() ? name : prefix + "/" + name;
        resources[key] = entry;
    };

    for (auto& line : lines) {
        process_token(line);
    }

    fprintf(stderr, "CL_ResourceManager: loaded %d resources from '%s'\n",
            (int)resources.size(), filename);
}

CL_ResourceManager::~CL_ResourceManager() {}

CL_Resource CL_ResourceManager::get_resource(const char* id) {
    CL_Resource res;
    auto it = resources.find(id);
    if (it != resources.end()) {
        res.entry = it->second;
    }
    return res;
}

CL_ResourceManager* CL_ResourceManager::get_resources() {
    return this;
}

// ============================================================================
// Input system
// ============================================================================
void CL_Input::init() {
    // Open first joystick if available
    if (SDL_NumJoysticks() > 0) {
        g_sdl_joystick = SDL_JoystickOpen(0);
        if (g_sdl_joystick) {
            joysticks.push_back(&g_joystick);
        }
    }
}

bool CL_InputButton::is_pressed() {
    // Joystick buttons are mapped above SDL_NUM_SCANCODES
    if (scancode >= SDL_NUM_SCANCODES) {
        int btn = scancode - SDL_NUM_SCANCODES;
        if (g_sdl_joystick && btn < SDL_JoystickNumButtons(g_sdl_joystick)) {
            return SDL_JoystickGetButton(g_sdl_joystick, btn) != 0;
        }
        return false;
    }
    const Uint8* state = SDL_GetKeyboardState(nullptr);
    return state[scancode] != 0;
}

void CL_InputButton_Group::add(CL_InputButton btn) {
    buttons.push_back(btn);
}

bool CL_InputButton_Group::is_pressed() {
    for (auto& b : buttons) {
        if (b.is_pressed()) return true;
    }
    return false;
}

CL_InputButton CL_InputDevice::get_button(int key) {
    CL_InputButton btn;
    btn.scancode = key;
    return btn;
}

CL_InputAxis* CL_InputDevice::get_axis(int axis_index) {
    // Grow the hw_axes vector to fit
    while ((int)hw_axes.size() <= axis_index) {
        hw_axes.emplace_back((int)hw_axes.size());
    }
    return &hw_axes[axis_index];
}

void CL_InputAxis_Group::add(CL_InputAxis* axis) {
    axes.push_back(axis);
}

float CL_InputAxis_Group::get_pos() {
    for (auto* ax : axes) {
        float v = ax->get_pos();
        if (v != 0.0f) return v;
    }
    return 0.0f;
}

float CL_InputButtonToAxis_Analog::get_pos() {
    bool n = neg_btn.is_pressed();
    bool p = pos_btn.is_pressed();
    if (n && !p) return -1.0f;
    if (p && !n) return  1.0f;
    return 0.0f;
}

float CL_JoystickAxis::get_pos() {
    if (!g_sdl_joystick) return 0.0f;
    Sint16 raw = SDL_JoystickGetAxis(g_sdl_joystick, axis_idx);
    return raw / 32767.0f;
}

// Map raw window mouse coordinate to game coordinate (accounts for letterbox viewport)
static int mouse_to_game_x(int raw) {
    return (int)((raw - g_vpX) * (float)g_width / g_vpW);
}
static int mouse_to_game_y(int raw) {
    return (int)((raw - g_vpY) * (float)g_height / g_vpH);
}

float CL_InputCursor::get_x() {
    int x, y;
    SDL_GetMouseState(&x, &y);
    return (float)mouse_to_game_x(x);
}

float CL_InputCursor::get_y() {
    int x, y;
    SDL_GetMouseState(&x, &y);
    return (float)mouse_to_game_y(y);
}

bool CL_Mouse::left_pressed() {
    return (SDL_GetMouseState(nullptr, nullptr) & SDL_BUTTON(SDL_BUTTON_LEFT)) != 0;
}

bool CL_Mouse::right_pressed() {
    return (SDL_GetMouseState(nullptr, nullptr) & SDL_BUTTON(SDL_BUTTON_RIGHT)) != 0;
}

int CL_Mouse::get_x() {
    int x;
    SDL_GetMouseState(&x, nullptr);
    return mouse_to_game_x(x);
}

int CL_Mouse::get_y() {
    int y;
    SDL_GetMouseState(nullptr, &y);
    return mouse_to_game_y(y);
}

// ============================================================================
// GUI stubs
// ============================================================================
CL_StyleManager_Default::CL_StyleManager_Default(CL_ResourceManager* /*mgr*/) {}
CL_ComponentManager::CL_ComponentManager(const char* /*gui_file*/,
                                         CL_StyleManager* /*style*/, ...) {}
CL_GUIManager::CL_GUIManager(CL_StyleManager* /*style*/) {}
void CL_GUIManager::run() {}
void CL_GUIManager::show() {}
void CL_SetupGUI::init() {}
void CL_SetupGUI::deinit() {}

CL_Button*  CL_Button::get_component(const char*, CL_ComponentManager*)  { return new CL_Button(); }
CL_ListBox* CL_ListBox::get_component(const char*, CL_ComponentManager*) { return new CL_ListBox(); }
void CL_ListBox::insert_item(const char*) {}
int  CL_ListBox::get_current_item() { return 0; }
void CL_ListBox::set_current_item(int) {}
CL_Label* CL_Label::get_component(const char*, CL_ComponentManager*) { return new CL_Label(); }
void CL_Label::set_text(const char*) {}

CL_ComponentManager* CL_ComponentManager::create(const char* gui_file, bool /*something*/,
                                                  CL_StyleManager* style, CL_GUIManager* /*gui*/) {
    return new CL_ComponentManager(gui_file, style);
}

// ============================================================================
// CL_ClanApplication – static member definition
// ============================================================================
CL_ClanApplication* CL_ClanApplication::app = nullptr;

// ============================================================================
// auxDIBImageLoad – replacement for ancient GLAUX BMP loader
// ============================================================================
#include <gl/glaux.h>

AUX_RGBImageRec* auxDIBImageLoadA(const char* filename) {
    SDL_Surface* bmp = asset_IMG_Load(filename);
    if (!bmp) {
        fprintf(stderr, "auxDIBImageLoad: failed to load '%s': %s\n", filename, IMG_GetError());
        return nullptr;
    }
    // Convert to 24-bit RGB
    SDL_Surface* rgb = SDL_ConvertSurfaceFormat(bmp, SDL_PIXELFORMAT_RGB24, 0);
    SDL_FreeSurface(bmp);
    if (!rgb) return nullptr;

    // Use malloc — the game frees these with free()
    AUX_RGBImageRec* rec = (AUX_RGBImageRec*)malloc(sizeof(AUX_RGBImageRec));
    rec->sizeX = rgb->w;
    rec->sizeY = rgb->h;
    int dataSize = rgb->w * rgb->h * 3;
    rec->data = (unsigned char*)malloc(dataSize);

    // SDL surfaces may have padding per row; copy row by row
    SDL_LockSurface(rgb);
    unsigned char* src = (unsigned char*)rgb->pixels;
    unsigned char* dst = rec->data;
    for (int y = 0; y < rgb->h; y++) {
        memcpy(dst, src + y * rgb->pitch, rgb->w * 3);
        dst += rgb->w * 3;
    }
    SDL_UnlockSurface(rgb);
    SDL_FreeSurface(rgb);
    return rec;
}

// ============================================================================
// SDL main entry point – delegates to CL_ClanApplication
// ============================================================================
int main(int argc, char* argv[]) {
    if (CL_ClanApplication::app) {
        return CL_ClanApplication::app->main(argc, argv);
    }
    fprintf(stderr, "No CL_ClanApplication instance registered.\n");
    return 1;
}
