

#ifndef STDINCLUDE_H
#define STDINCLUDE_H

#include <ClanLib/core.h>
#include <ClanLib/application.h>
#include <ClanLib/display.h>
#include <Clanlib/ttf.h>
#include <ClanLib/Core/System/mutex.h> 
#include <ClanLib/sound.h>
#include <ClanLib/vorbis.h>
#include <ClanLib/gl.h>

//#include <stdlib.h>     
#include <iostream>    
#include <stdio.h>
#include <malloc.h>
#ifdef _MSC_VER
#include <crtdbg.h>
#endif

using namespace std;


#include "pcxload.h"
#include "Display.h"
#include "GameObject.h"
#include "PowerPlant.h"

//used when adding a frame, tells which routine to use to load
#define  TGA_FILETYPE   1
#define	 PCX_FILETYPE   2

#endif