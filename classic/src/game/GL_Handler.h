#ifndef GL_HANDLER_H
#define GL_HANDLER_H

#include "stdinclude.h"
#include <gl\glaux.h>

class GameManager;

static GLfloat colors[12][3]=		// Rainbow Of Colors
{
	{1.0f,0.5f,0.5f},{1.0f,0.75f,0.5f},{1.0f,1.0f,0.5f},{0.75f,1.0f,0.5f},
	{0.5f,1.0f,0.5f},{0.5f,1.0f,0.75f},{0.5f,1.0f,1.0f},{0.5f,0.75f,1.0f},
	{0.5f,0.5f,1.0f},{0.75f,0.5f,1.0f},{1.0f,0.5f,1.0f},{1.0f,0.5f,0.75f}
};






class GL_Handler
{
public:


	void createTriangleStrip(int x, int y, int x1, int y1, int x_offset, int y_offset);

	AUX_RGBImageRec *LoadBMP(char *Filename);

	int LoadGLTextures();

	GLvoid ReSizeGLScene(GLsizei width, GLsizei height);


	int InitGL(GLvoid);

	int DrawGLScene(GLvoid);

	int DrawGLParticles(GameManager* _manager);

	int DrawGLStars(GameManager* _manager);
};

#endif