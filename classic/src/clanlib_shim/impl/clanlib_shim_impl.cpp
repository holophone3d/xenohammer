// clanlib_shim_impl.cpp – SDL2 backend for the ClanLib 0.6.x shim
// Compile this single file into your project alongside the game sources.

#include <SDL.h>
#include <SDL_image.h>
#include <SDL_ttf.h>
#include <SDL_mixer.h>

#include <ClanLib/core.h>
#include <ClanLib/application.h>
#include <ClanLib/display.h>
#include <ClanLib/gl.h>
#include <ClanLib/sound.h>
#include <ClanLib/vorbis.h>
#include <ClanLib/ttf.h>
#include <ClanLib/gui.h>

#include <cstdio>
#include <cstring>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iostream>
#include <filesystem>

// ============================================================================
// Internal globals
// ============================================================================
static SDL_Window*   g_window   = nullptr;
static SDL_Renderer* g_renderer = nullptr;
static int           g_width    = 800;
static int           g_height   = 600;

// Input singletons
static CL_InputDevice g_keyboard;
static CL_InputDevice g_joystick;
CL_InputDevice* CL_Input::keyboards[1] = { &g_keyboard };
CL_InputDevice* CL_Input::joysticks[1] = { &g_joystick };

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
    CL_Input::init();
}

void CL_SetupCore::deinit() {
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
    if (g_renderer) { SDL_DestroyRenderer(g_renderer); g_renderer = nullptr; }
    if (g_window)   { SDL_DestroyWindow(g_window);     g_window = nullptr; }
}

// ============================================================================
// CL_ConsoleWindow
// ============================================================================
CL_ConsoleWindow::CL_ConsoleWindow(const char* /*title*/) {}
void CL_ConsoleWindow::redirect_stdio() {}

// ============================================================================
// CL_Display
// ============================================================================
void CL_Display::set_videomode(int w, int h, int /*bpp*/, bool fullscreen) {
    g_width  = w;
    g_height = h;

    Uint32 flags = SDL_WINDOW_SHOWN;
    if (fullscreen) flags |= SDL_WINDOW_FULLSCREEN_DESKTOP;

    if (!g_window) {
        g_window = SDL_CreateWindow("XenoHammer",
                                    SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
                                    w, h, flags);
        g_renderer = SDL_CreateRenderer(g_window, -1,
                                        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    } else {
        SDL_SetWindowSize(g_window, w, h);
        SDL_SetWindowFullscreen(g_window, fullscreen ? SDL_WINDOW_FULLSCREEN_DESKTOP : 0);
    }
}

void CL_Display::clear_display(float r, float g, float b, float a) {
    SDL_SetRenderDrawColor(g_renderer,
                           (Uint8)(r * 255), (Uint8)(g * 255),
                           (Uint8)(b * 255), (Uint8)(a * 255));
    SDL_RenderClear(g_renderer);
}

void CL_Display::flip_display() {
    SDL_RenderPresent(g_renderer);
}

void CL_Display::fill_rect(int x1, int y1, int x2, int y2,
                            float r, float g, float b, float a) {
    SDL_SetRenderDrawBlendMode(g_renderer, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(g_renderer,
                           (Uint8)(r * 255), (Uint8)(g * 255),
                           (Uint8)(b * 255), (Uint8)(a * 255));
    SDL_Rect rect = { x1, y1, x2 - x1, y2 - y1 };
    SDL_RenderFillRect(g_renderer, &rect);
}

void CL_Display::draw_line(int x1, int y1, int x2, int y2,
                            float r, float g, float b, float a) {
    SDL_SetRenderDrawBlendMode(g_renderer, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(g_renderer,
                           (Uint8)(r * 255), (Uint8)(g * 255),
                           (Uint8)(b * 255), (Uint8)(a * 255));
    SDL_RenderDrawLine(g_renderer, x1, y1, x2, y2);
}

int CL_Display::get_width()  { return g_width; }
int CL_Display::get_height() { return g_height; }

SDL_Window*   CL_Display::get_window()   { return g_window; }
SDL_Renderer* CL_Display::get_renderer() { return g_renderer; }

// ============================================================================
// CL_Surface
// ============================================================================
struct CL_Surface::Impl {
    SDL_Texture* texture = nullptr;
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
        if (impl->texture)     SDL_DestroyTexture(impl->texture);
        if (impl->sdl_surface) SDL_FreeSurface(impl->sdl_surface);
        delete impl;
    }
}

void CL_Surface::init_from_file(const char* path) {
    SDL_Surface* surf = IMG_Load(path);
    if (!surf) {
        fprintf(stderr, "CL_Surface: failed to load '%s': %s\n", path, IMG_GetError());
        return;
    }
    impl->sdl_surface = surf;
    impl->w = surf->w;
    impl->h = surf->h;
    impl->texture = SDL_CreateTextureFromSurface(g_renderer, surf);
    SDL_SetTextureBlendMode(impl->texture, SDL_BLENDMODE_BLEND);
}

CL_Surface* CL_Surface::load(const char* res_id, CL_ResourceManager* mgr) {
    CL_Surface* s = new CL_Surface();
    if (mgr) {
        auto it = mgr->resources.find(res_id);
        if (it != mgr->resources.end()) {
            std::string full = mgr->base_path + "/" + it->second.file;
            s->init_from_file(full.c_str());

            // Handle transparent-colour key if specified
            if (it->second.tcol >= 0 && s->impl->sdl_surface) {
                SDL_SetColorKey(s->impl->sdl_surface, SDL_TRUE,
                                (Uint32)it->second.tcol);
                if (s->impl->texture) SDL_DestroyTexture(s->impl->texture);
                s->impl->texture = SDL_CreateTextureFromSurface(g_renderer,
                                                                 s->impl->sdl_surface);
                SDL_SetTextureBlendMode(s->impl->texture, SDL_BLENDMODE_BLEND);
            }
        } else {
            fprintf(stderr, "CL_Surface::load: resource '%s' not found\n", res_id);
        }
    }
    return s;
}

void CL_Surface::put_screen(int x, int y) {
    if (!impl || !impl->texture) return;
    SDL_SetTextureAlphaMod(impl->texture, (Uint8)(impl->alpha * 255));
    SDL_Rect dst = { x, y, impl->w, impl->h };
    SDL_RenderCopy(g_renderer, impl->texture, nullptr, &dst);
}

void CL_Surface::put_screen(int x, int y, int srcx, int srcy, int srcw, int srch) {
    if (!impl || !impl->texture) return;
    SDL_SetTextureAlphaMod(impl->texture, (Uint8)(impl->alpha * 255));
    SDL_Rect src = { srcx, srcy, srcw, srch };
    SDL_Rect dst = { x, y, srcw, srch };
    SDL_RenderCopy(g_renderer, impl->texture, &src, &dst);
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
    }
}

CL_Canvas::CL_Canvas(int w, int h) : impl(new Impl) {
    impl->surface = SDL_CreateRGBSurfaceWithFormat(0, w, h, 32, SDL_PIXELFORMAT_RGBA32);
    impl->owns_surface = true;
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

// ============================================================================
// CL_Font
// ============================================================================
struct CL_Font::Impl {
    TTF_Font* font = nullptr;
    SDL_Color color = {255, 255, 255, 255};
    int size = 14;
    std::string path;
};

CL_Font::CL_Font() : impl(new Impl) {}

CL_Font::~CL_Font() {
    if (impl) {
        if (impl->font) TTF_CloseFont(impl->font);
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

            int size = 14;
            auto sz = it->second.options.find("size");
            if (sz != it->second.options.end()) size = std::stoi(sz->second);
            f->impl->size = size;

            f->impl->font = TTF_OpenFont(full.c_str(), size);
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
    if (size == impl->size && impl->font) return;
    impl->size = size;
    if (impl->font) TTF_CloseFont(impl->font);
    impl->font = TTF_OpenFont(impl->path.c_str(), size);
}

static void font_render_text(CL_Font::Impl* impl, int x, int y, const char* text, int align) {
    if (!impl || !impl->font || !text || !*text) return;
    SDL_Surface* surf = TTF_RenderUTF8_Blended(impl->font, text, impl->color);
    if (!surf) return;
    SDL_Texture* tex = SDL_CreateTextureFromSurface(g_renderer, surf);

    SDL_Rect dst;
    dst.w = surf->w;
    dst.h = surf->h;

    switch (align) {
        case 0: dst.x = x;              break; // left
        case 1: dst.x = x - surf->w/2;  break; // center
        case 2: dst.x = x - surf->w;    break; // right
    }
    dst.y = y;

    SDL_RenderCopy(g_renderer, tex, nullptr, &dst);
    SDL_DestroyTexture(tex);
    SDL_FreeSurface(surf);
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
    if (!impl || !impl->font) return 0;
    int w = 0, h = 0;
    TTF_SizeUTF8(impl->font, text, &w, &h);
    return w;
}

int CL_Font::get_height() {
    if (!impl || !impl->font) return 0;
    return TTF_FontHeight(impl->font);
}

// ============================================================================
// CL_OpenGL / CL_SetupGL – no-ops
// ============================================================================
void CL_OpenGL::begin_2d() {}
void CL_OpenGL::end_2d()   {}
void CL_SetupGL::init()    {}
void CL_SetupGL::deinit()  {}

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
    if (channel >= 0) {
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
        impl->music = Mix_LoadMUS(vorbis->filepath.c_str());
        if (impl->music) {
            impl->is_music = true;
        } else {
            impl->chunk = Mix_LoadWAV(vorbis->filepath.c_str());
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
            sb->impl->chunk = Mix_LoadWAV(full.c_str());
            if (!sb->impl->chunk) {
                sb->impl->music = Mix_LoadMUS(full.c_str());
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
std::string CL_Resource::get_location() {
    return entry.file;
}

// Minimal ClanLib 0.6 resource file parser.
// The format is roughly:
//   section <name>
//   {
//       <id> = <file> (type=surface, tcol=..., ...);
//   }
// We flatten to "section_name/id" keys.
CL_ResourceManager::CL_ResourceManager(const char* filename, bool /*something*/) {
    namespace fs = std::filesystem;
    base_path = fs::path(filename).parent_path().string();

    std::ifstream in(filename);
    if (!in.is_open()) {
        fprintf(stderr, "CL_ResourceManager: cannot open '%s'\n", filename);
        return;
    }

    std::string line;
    std::string current_section;

    while (std::getline(in, line)) {
        // Trim
        size_t start = line.find_first_not_of(" \t\r\n");
        if (start == std::string::npos) continue;
        line = line.substr(start);

        // Skip comments
        if (line[0] == '#' || line[0] == '/' ) continue;

        // "section <name>"
        if (line.rfind("section ", 0) == 0) {
            current_section = line.substr(8);
            // trim trailing whitespace and braces
            size_t e = current_section.find_first_of(" \t\r\n{");
            if (e != std::string::npos) current_section = current_section.substr(0, e);
            continue;
        }

        // Opening/closing braces
        if (line[0] == '{') continue;
        if (line[0] == '}') { current_section.clear(); continue; }

        // Resource line:  name = file (options...);
        size_t eq = line.find('=');
        if (eq == std::string::npos) continue;

        std::string name = line.substr(0, eq);
        // trim name
        size_t ne = name.find_last_not_of(" \t");
        if (ne != std::string::npos) name = name.substr(0, ne + 1);

        std::string rest = line.substr(eq + 1);
        // trim leading whitespace
        size_t rs = rest.find_first_not_of(" \t");
        if (rs != std::string::npos) rest = rest.substr(rs);
        // remove trailing semicolon
        size_t sc = rest.rfind(';');
        if (sc != std::string::npos) rest = rest.substr(0, sc);

        ResourceEntry entry;

        // Extract file path (first token or quoted string)
        size_t paren = rest.find('(');
        if (paren != std::string::npos) {
            entry.file = rest.substr(0, paren);
            // trim
            size_t fe = entry.file.find_last_not_of(" \t");
            if (fe != std::string::npos) entry.file = entry.file.substr(0, fe + 1);

            // Parse options inside parentheses
            size_t close = rest.find(')', paren);
            if (close != std::string::npos) {
                std::string opts = rest.substr(paren + 1, close - paren - 1);
                std::istringstream oss(opts);
                std::string opt;
                while (std::getline(oss, opt, ',')) {
                    size_t oeq = opt.find('=');
                    if (oeq != std::string::npos) {
                        std::string key = opt.substr(0, oeq);
                        std::string val = opt.substr(oeq + 1);
                        // trim
                        auto trim = [](std::string& s) {
                            size_t a = s.find_first_not_of(" \t");
                            size_t b = s.find_last_not_of(" \t");
                            if (a != std::string::npos) s = s.substr(a, b - a + 1);
                        };
                        trim(key);
                        trim(val);
                        entry.options[key] = val;

                        if (key == "type") entry.type = val;
                        if (key == "tcol") entry.tcol = std::stoi(val, nullptr, 0);
                    }
                }
            }
        } else {
            entry.file = rest;
            size_t fe = entry.file.find_last_not_of(" \t");
            if (fe != std::string::npos) entry.file = entry.file.substr(0, fe + 1);
        }

        std::string key = current_section.empty() ? name : current_section + "/" + name;
        resources[key] = entry;
    }
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

void CL_InputAxis_Group::add_invpair(CL_InputButton neg, CL_InputButton pos) {
    pairs.push_back({neg, pos});
}

float CL_InputAxis_Group::get_pos() {
    for (auto& p : pairs) {
        bool n = p.first.is_pressed();
        bool pv = p.second.is_pressed();
        if (n && !pv) return -1.0f;
        if (pv && !n) return  1.0f;
    }
    return 0.0f;
}

CL_InputButtonToAxis_Analog::CL_InputButtonToAxis_Analog(CL_InputButton b)
    : btn(b) {}

float CL_InputCursor::get_x() {
    int x, y;
    SDL_GetMouseState(&x, &y);
    return (float)x;
}

float CL_InputCursor::get_y() {
    int x, y;
    SDL_GetMouseState(&x, &y);
    return (float)y;
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
    return x;
}

int CL_Mouse::get_y() {
    int y;
    SDL_GetMouseState(nullptr, &y);
    return y;
}

// ============================================================================
// GUI stubs
// ============================================================================
CL_StyleManager_Default::CL_StyleManager_Default(CL_ResourceManager* /*mgr*/) {}
CL_ComponentManager::CL_ComponentManager(const char* /*gui_file*/,
                                         CL_StyleManager* /*style*/, ...) {}
CL_GUIManager::CL_GUIManager(CL_StyleManager* /*style*/) {}
void CL_GUIManager::run() {}
void CL_SetupGUI::init() {}
void CL_SetupGUI::deinit() {}

CL_Button*  CL_Button::get_component(const char*, CL_ComponentManager*)  { return new CL_Button(); }
CL_ListBox* CL_ListBox::get_component(const char*, CL_ComponentManager*) { return new CL_ListBox(); }
void CL_ListBox::insert_item(const char*) {}
int  CL_ListBox::get_current_item() { return 0; }
void CL_ListBox::set_current_item(int) {}
CL_Label* CL_Label::get_component(const char*, CL_ComponentManager*) { return new CL_Label(); }
void CL_Label::set_text(const char*) {}

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
