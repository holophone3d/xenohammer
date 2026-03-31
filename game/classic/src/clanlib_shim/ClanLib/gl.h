#pragma once

// Pull in real OpenGL headers — the game makes raw GL calls in GL_Handler.cpp.
// We use SDL2+OpenGL context, so all GL functions are live.
#include <windows.h>
#include <GL/gl.h>
#include <GL/glu.h>

class CL_OpenGL {
public:
    // Switch between 2D orthographic (ClanLib sprite/text drawing) and
    // whatever GL state the game code sets up (GL_Handler particles/stars).
    static void begin_2d();
    static void end_2d();
};

class CL_SetupGL {
public:
    static void init();
    static void deinit();
};
