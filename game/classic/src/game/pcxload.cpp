/* PCX routines */

#include "pcxload.h"
#include <iostream.h>
#include <stdio.h>
#include <stdlib.h>

 char * PCXLoad::BuildMask(const char *fname, int* width, int* height)
{
  X = Y = 0;

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

  Image = (char *)malloc(sizeof(char) * Width * Height );
  buffer = (char *)malloc(sizeof(char) * Width * Height );

	if(Image == NULL )
		return NULL;
	if( buffer == NULL )
		return NULL;


  
  fseek(inf, 128, SEEK_SET);
  fread(Image, 1, Width * Height, inf);

  fclose(inf);

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
