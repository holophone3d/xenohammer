/* PCX routines */

#include "pcxload.h"
#include "asset_pack.h"
#include <iostream.h>
#include <stdio.h>
#include <stdlib.h>
#include <SDL.h>

 char * PCXLoad::BuildMask(const char *fname, int* width, int* height)
{
  X = Y = 0;

  // Try embedded asset pack first, fall back to disk
  SDL_RWops* rw = AssetPack::open(fname);
  if (rw) {
    SDL_RWseek(rw, 8, RW_SEEK_SET);
    unsigned char b[4];
    SDL_RWread(rw, b, 1, 4);
    Width  = (b[1] << 8 | b[0]) + 1;
    Height = (b[3] << 8 | b[2]) + 1;

    *width = Width;
    *height = Height;

    Image  = (char *)malloc(sizeof(char) * Width * Height);
    buffer = (char *)malloc(sizeof(char) * Width * Height);
    if (!Image || !buffer) { SDL_RWclose(rw); return NULL; }

    SDL_RWseek(rw, 128, RW_SEEK_SET);
    SDL_RWread(rw, Image, 1, Width * Height);
    SDL_RWclose(rw);
  } else {
    inf = fopen(fname, "rb");
    if(inf == NULL)
    {
      cout << "Could not open the file: " << fname << ".\n";
      exit(0);
    }

    fseek(inf, 8, SEEK_SET);
    Width = fgetc(inf);
    Width = ((fgetc(inf) << 8) | Width) + 1;
    Height = fgetc(inf);
    Height = ((fgetc(inf) << 8) | Height) + 1;

    *width = Width;
    *height = Height;

    Image  = (char *)malloc(sizeof(char) * Width * Height);
    buffer = (char *)malloc(sizeof(char) * Width * Height);
    if (!Image || !buffer) { fclose(inf); return NULL; }

    fseek(inf, 128, SEEK_SET);
    fread(Image, 1, Width * Height, inf);
    fclose(inf);
  }

  tempImage = ImageToClose = Image;
  tempImage++;
  transCol = *tempImage;
  tempImage =buffer;
  while( (Y < Height) && ( (X * Y) < (Width * Height) ) )
  {
    Temp1 = *Image;
    Image++;

    if((Temp1 & 192) == 192)       // Check if the top two bits of the byte
    {                              // are set.
      Temp2 = *Image;
      Image++;
		
	  int counter = 0;
      for(int i = 0; i < (Temp1 & 63); i++)
      {
	
		
		  if(Temp2 == transCol){
					*buffer = (char)0;
					buffer++;
			//	printf("%d", 0);
						
					
		  }
		  else{
					*buffer = (char)1;
					buffer++;
		//				printf("%d", 1);
					
				
		  }
	
        X++;
        if(X == Width)  {Y++; X = 0; }
      }
    }

    else                              // If they are not set, just plot it
    {                                 // to the screen.
      
		if(Temp1 == transCol){
					*buffer = (char)0;
					buffer++;
			//			printf("%d", 0);
				
		  }
		  else{
					*buffer = (char)1;
					buffer++;
			//			printf("%d", 1);
				
		  }
      
		X++;
      if(X == Width) {Y++; X = 0; }
    }

  }
// end of old destructor
  

 // Image = NULL;
 //   _free_dbg  ( Image , _CLIENT_BLOCK);
//	 free( Image );	
//	 Image = NULL;

  return tempImage;
  
  
  
}
