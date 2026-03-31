// Compat shim: <gl\glaux.h> — replaces ancient GLAUX library
// Provides AUX_RGBImageRec and auxDIBImageLoad stub backed by SDL_image
#pragma once

#include <windows.h>
#include <GL/gl.h>
#include <GL/glu.h>

// The original glaux AUX_RGBImageRec struct
typedef struct {
    GLint sizeX;
    GLint sizeY;
    unsigned char* data;
} AUX_RGBImageRec;

// Load a BMP file into an AUX_RGBImageRec (implemented in clanlib_shim_impl.cpp)
AUX_RGBImageRec* auxDIBImageLoadA(const char* filename);

// The game uses auxDIBImageLoad which on Windows maps to auxDIBImageLoadA
#define auxDIBImageLoad auxDIBImageLoadA
