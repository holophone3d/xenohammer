#pragma once
#include <SDL.h>

class CL_ResourceManager; // forward declare
class CL_Canvas;          // forward declare

// ---------------------------------------------------------------------------
// CL_Display – static interface wrapping the SDL2+OpenGL window
// ---------------------------------------------------------------------------
class CL_Display {
public:
    static void set_videomode(int w, int h, int bpp, bool fullscreen);
    static void clear_display(float r = 0, float g = 0, float b = 0, float a = 1);
    static void flip_display();
    static void fill_rect(int x1, int y1, int x2, int y2,
                          float r, float g, float b, float a = 1.0f);
    static void draw_line(int x1, int y1, int x2, int y2,
                          float r, float g, float b, float a = 1.0f);
    static int get_width();
    static int get_height();

    static SDL_Window* get_window();
};

// ---------------------------------------------------------------------------
// CL_Surface
// ---------------------------------------------------------------------------
class CL_Surface {
public:
    CL_Surface();
    CL_Surface(const char* filename, bool delete_provider = false);
    ~CL_Surface();

    static CL_Surface* load(const char* res_id, CL_ResourceManager* mgr);
    static CL_Surface* create(CL_Canvas* canvas);

    void put_screen(int x, int y);
    void put_screen(int x, int y, int srcx, int srcy, int srcw, int srch);
    void put_target(int x, int y, int frame, CL_Canvas* canvas);
    int  get_width();
    int  get_height();
    void set_alpha(float alpha);

    struct Impl;
    Impl* impl = nullptr;

private:
    void init_from_file(const char* path);
};

// ---------------------------------------------------------------------------
// CL_PCXProvider – PCX image loader (facade over SDL_image)
// ---------------------------------------------------------------------------
class CL_PCXProvider {
public:
    static CL_Surface* create(const char* filename, bool transparent = false);
};

// ---------------------------------------------------------------------------
// CL_TargaProvider – TGA image loader (facade over SDL_image)
// ---------------------------------------------------------------------------
class CL_TargaProvider {
public:
    static CL_Surface* create(const char* filename, bool transparent = false);
};

// ---------------------------------------------------------------------------
// CL_Canvas – pixel-level access to a surface
// ---------------------------------------------------------------------------
class CL_Canvas {
public:
    CL_Canvas(CL_Surface* surf);
    CL_Canvas(int w, int h);
    ~CL_Canvas();

    void lock();
    void unlock();
    void* get_data();
    int  get_bytes_per_pixel();
    void get_pixel(int x, int y, float* r, float* g, float* b, float* a);

    int width = 0;
    int height = 0;
    unsigned char* pixel_data = nullptr;
    int bpp = 4;

    struct Impl;
    Impl* impl = nullptr;
};

// ---------------------------------------------------------------------------
// CL_Font – TTF and bitmap font rendering
// ---------------------------------------------------------------------------
class CL_Font {
public:
    CL_Font();
    ~CL_Font();

    static CL_Font* load(const char* res_id, CL_ResourceManager* mgr);

    void change_colour(int r, int g, int b, int a = 255);
    void change_size(int size);
    void print_center(int x, int y, const char* text);
    void print_right(int x, int y, const char* text);
    void print_left(int x, int y, const char* text);
    int  get_text_width(const char* text);
    int  get_height();

    struct Impl;
    Impl* impl = nullptr;
};

// Input subsystem
#include "input.h"
