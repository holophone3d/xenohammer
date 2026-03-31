#ifndef PCXLOAD_H
#define PCXLOAD_H
#include <stdio.h>
#include <crtdbg.h>
#include <stdlib.h>

class PCXLoad
{
protected:
	FILE *inf;
    char *Image;
	char* buffer;
    int Width, Height;
	char Temp1, Temp2, transCol;
	int X, Y;
	char* tempImage, *ImageToClose;

public:
    char * BuildMask(const char *, int* , int* );

	~PCXLoad()
	{ 
		free( ImageToClose);
		free( buffer );
		free( Image );
	};
};


#endif
