#pragma once

// ClanLib 0.6.x OpenGL helpers – in the SDL2 shim these are no-ops since
// we use SDL_Renderer (or could be wired to real GL later).

class CL_OpenGL {
public:
    static void begin_2d();
    static void end_2d();
};

class CL_SetupGL {
public:
    static void init();
    static void deinit();
};
