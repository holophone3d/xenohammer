#include "GL_Handler.h"
#include "GameManager.h"
#include "TParticleClass.h"
#include "Projectile.h"
#include "Starfield.h"
#include "Explosion.h"
#include "PlayerShip.h"
#include "powerup.h"
#include "EnemyShip.h"
#include "CapitalShip_Frigate.h"
#include "Boss.h"


#define  TEXTURE_CNT 5


#define NODE1_X		-213
#define NODE1_Y		111
#define NODE2_X		-65
#define NODE2_Y		259
#define NODE3_X		97	
#define NODE3_Y		259
#define NODE4_X		245
#define NODE4_Y		111

#define LEFTU_X		-94
#define LEFTU_Y		-68
#define RIGHTU_X	112
#define RIGHTU_Y	-65

//Setup some variables
GLuint	loop;						// Misc Loop Variable
GLuint	col;						// Current Color Selection
GLuint	delay;						// Rainbow Effect Delay
GLuint	texture[TEXTURE_CNT];					// Storage For Our Particle Texture


void GL_Handler::createTriangleStrip(int x, int y, int x1, int y1, int offset_x, int offset_y)
{
	glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
	glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
	glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
	glTexCoord2d(1,0); glVertex3f(x1+offset_x,y1-offset_y,0.0f); // Bottom Right
	glTexCoord2d(0,0); glVertex3f(x1-offset_x,y1-offset_y,0.0f); // Bottom Left
	glEnd();	
}


AUX_RGBImageRec *GL_Handler::LoadBMP(char *Filename)				// Loads A Bitmap Image
{
	FILE *File=NULL;								// File Handle
	if (!Filename)									// Make Sure A Filename Was Given
	{
		return NULL;							// If Not Return NULL
	}
	File=fopen(Filename,"r");						// Check To See If The File Exists
	if (File)										// Does The File Exist?
	{
		fclose(File);								// Close The Handle
		return auxDIBImageLoad(Filename);			// Load The Bitmap And Return A Pointer
	}
	return NULL;									// If Load Failed Return NULL
}



int GL_Handler::LoadGLTextures()									// Load Bitmap And Convert To A Texture
{
	int Status=FALSE;		// Status Indicator
	
	AUX_RGBImageRec *TextureImage[TEXTURE_CNT];				// Create Storage Space For The Textures
	memset(TextureImage,0,sizeof(void *)*TEXTURE_CNT);		// Set The Pointer To NULL
	
	if (   (TextureImage[0]=LoadBMP("Particle.bmp")) &&
		(TextureImage[1]=LoadBMP("Shield.bmp")) && 
		(TextureImage[2]=LoadBMP("Star.bmp")) &&	
		(TextureImage[3]=LoadBMP("bar.bmp")) &&
		(TextureImage[4]=LoadBMP("ship_selected.bmp")))	// Load Particle Texture
	{
		Status=TRUE;								// Set The Status To TRUE
		glGenTextures(TEXTURE_CNT, &texture[0]);				// Create One Texture
		for (int loop=0; loop<TEXTURE_CNT; loop++)					// Loop Through All The Textures
		{
			glBindTexture(GL_TEXTURE_2D, texture[loop]);
			glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);
			glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR);
			glTexImage2D(GL_TEXTURE_2D, 0, 3, TextureImage[loop]->sizeX, TextureImage[loop]->sizeY, 0, GL_RGB, GL_UNSIGNED_BYTE, TextureImage[loop]->data);
		}
	}
	
	for (loop=0; loop<TEXTURE_CNT; loop++)
	{
		if (TextureImage[loop])						// If Texture Exists
		{
			if (TextureImage[loop]->data)			// If Texture Image Exists
			{
				free(TextureImage[loop]->data);		// Free The Texture Image Memory
			}
			free(TextureImage[loop]);			// Free The Image Structure
		}
	}
	
	return Status;									// Return The Status
}


GLvoid GL_Handler::ReSizeGLScene(GLsizei width, GLsizei height)		// Resize And Initialize The GL Window
{
	if (height==0)										// Prevent A Divide By Zero By
	{
		height=1;										// Making Height Equal One
	}
	
	glViewport(0, 0, width, height);
	glMatrixMode(GL_PROJECTION);						// Select The Projection Matrix
	glLoadIdentity();							// Reset The Projection Matrix
	glOrtho(0,width,-height, 0,-1,1);				// Set Up An Ortho Screen
	
	
}

int GL_Handler::InitGL(GLvoid)										// All Setup For OpenGL Goes Here
{
	if (!LoadGLTextures())								// Jump To Texture Loading Routine
	{
		return FALSE;									// If Texture Didn't Load Return FALSE
	}
	
	glShadeModel(GL_SMOOTH);							// Enable Smooth Shading
	glClearColor(0.0f,0.0f,0.0f,0.0f);					// Black Background
	glClearDepth(1.0f);									// Depth Buffer Setup
	glDisable(GL_DEPTH_TEST);							// Disable Depth Testing
	glEnable(GL_BLEND);									// Enable Blending
	glBlendFunc(GL_SRC_ALPHA,GL_ONE);					// Type Of Blending To Perform
	glHint(GL_PERSPECTIVE_CORRECTION_HINT,GL_NICEST);	// Really Nice Perspective Calculations
	glHint(GL_POINT_SMOOTH_HINT,GL_NICEST);				// Really Nice Point Smoothing
	glEnable(GL_TEXTURE_2D);							// Enable Texture Mapping
	glBindTexture(GL_TEXTURE_2D,texture[0]);			// Select Our Texture
	
	return TRUE;										// Initialization Went OK
}

int GL_Handler::DrawGLScene(GLvoid)										// Here's Where We Do All The Drawing
{
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);		// Clear Screen And Depth Buffer
	
	return TRUE;											// Everything Went OK
}


int GL_Handler::DrawGLStars(GameManager* _manager)
{
	int temp;
	float x,y, intensity;
	
	ReSizeGLScene(SCREEN_WIDTH, SCREEN_HEIGHT);
	
	glMatrixMode(GL_MODELVIEW);			
	
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);	
	
	for(int i = 0; i < STARFIELD_MAX_STARS ; i++)
	{
		if(	_manager->m_stars.stars[i].moving == 1){
			
			x = (float)_manager->m_stars.stars[i].xscr;
			y = -(float)_manager->m_stars.stars[i].yscr;
			
			// calculate intensity
			temp = (STARFIELD_DISTANCE - (int)_manager->m_stars.stars[i].z);
			
			intensity = ((float)temp / (float)STARFIELD_DISTANCE);
			//	printf("%lf\n", intensity);
			glBindTexture(GL_TEXTURE_2D, texture[2]);
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(1.0f,1.0f,1.0f, intensity);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+2.0f,y+2.0f,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-2.0f,y+2.0f,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+2.0f,y-2.0f,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-2.0f,y-2.0f,0.0f); // Bottom Left
			glEnd();			
			glBindTexture(GL_TEXTURE_2D, texture[0]);
		}
	}
	
	return 1;
	
}


int GL_Handler::DrawGLParticles(GameManager* _manager)										// Here's Where We Do All The Drawing
{
	
	float x,y;
	TParticle* aParticle;
	
	
	int width = 800;
	int height = 600;
	int type, offset_x, offset_y, x1, y1;
	
	ReSizeGLScene(SCREEN_WIDTH, SCREEN_HEIGHT);
	
	glMatrixMode(GL_MODELVIEW);			
	
	
	//THINKING ABOUT GIVING GUNSHIPS ENGINE GLOW
	
	//UPDATE WARNING ALPHA
	if(_manager->warningAlphaIncrease == false)
	{
		_manager->warningAlpha -= 0.01f;
		if( _manager->warningAlpha < 0.3f )
		{
			_manager->warningAlphaIncrease = true;
		}
	}
	else
	{
		_manager->warningAlpha += 0.1f;
		if( _manager->warningAlpha > 1.0f )
		{
			_manager->warningAlphaIncrease = false;
		}
	}
	
	
	//UPDATE BOSS ALPHA
	if(_manager->bossAlphaIncrease == false)
	{
		_manager->bossAlpha -= 0.01f;
		if( _manager->bossAlpha < 0.1f )
		{
			_manager->bossAlphaIncrease = true;
		}
	}
	else
	{
		_manager->bossAlpha += 0.01f;
		if( _manager->bossAlpha > 0.6f )
		{
			_manager->bossAlphaIncrease = false;
		}
	}
	
	
	// draw all enemy ships target
	
	for (	std::list<EnemyShip *>::iterator itEnemyShips = _manager->lightFighters.begin();
	itEnemyShips != _manager->lightFighters.end();
	itEnemyShips)
		
	{
		EnemyShip *tempEnemy = *itEnemyShips;
		itEnemyShips++;
		
		
		
		if(tempEnemy->selected)
		{
			
			
			if(tempEnemy->get_type() == LIGHTFIGHTER||tempEnemy->get_type() == HEAVYFIGHTER)
			{
				x = tempEnemy->get_x()+30;
				y = -tempEnemy->get_y()-30;
			}
			else if(tempEnemy->get_type() == GUNSHIP)
			{
				x = tempEnemy->get_x()+46;
				y = -tempEnemy->get_y()-46;
			}
			
			
			offset_x = 30;
			offset_y = 30;
			glBindTexture(GL_TEXTURE_2D, texture[4]);
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
			
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
			glEnd();	
			glBindTexture(GL_TEXTURE_2D, texture[0]);
		}
		
		
	}
	
	// draw all CapitalShips
	for (	std::list<CapitalShip *>::iterator itCapShips = _manager->capShips.begin();
	itCapShips != _manager->capShips.end();
	itCapShips)
		
	{
		if( (*itCapShips)->get_type() == FRIGATE )
		{
			CapitalShip *tempCap = *itCapShips;
			itCapShips++;
			
			if(tempCap->cap_selected != 0)
			{
				
				
				
				x = tempCap->get_x()+47;
				y = -tempCap->get_y()-47;
				
				
				
				offset_x = 45;
				offset_y = 45;
				glBindTexture(GL_TEXTURE_2D, texture[4]);
				// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
				glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
				
				
				
				glBindTexture(GL_TEXTURE_2D, texture[0]);
			}
		}
		else if( (*itCapShips)->get_type() == BOSS )
		{
			
			Boss *tempCap = (Boss*)*itCapShips;
			itCapShips++;
			
			
			//Draw the BOSS shield
			x = tempCap->get_x()+80;
			y = -tempCap->get_y()-80;
			
			offset_x = 130;
			offset_y = 115;
			
			glColor4f(0.4f,0.15f,1.0f,((float)tempCap->orbCount)/4.0f );
			glBindTexture(GL_TEXTURE_2D, texture[1]);
			createTriangleStrip(x,y,x,y,offset_x,offset_y);			
			glBindTexture(GL_TEXTURE_2D, texture[0]);
			
			//GL ORBS
			//Draw the central glowy orb
			x = tempCap->get_x()+80;
			y = -tempCap->get_y()-80;
			
			offset_x = 90;
			offset_y = 90;
			glColor4f(1.0f,0.0f,0.0f,_manager->bossAlpha );
			createTriangleStrip(x,y,x,y,offset_x,offset_y);			
			
			//draw node 1 glowy orb
			if(tempCap->OuterOrbs[0]->get_visible())
			{
				x = tempCap->get_x()+NODE1_X+64;
				y = -tempCap->get_y()-NODE1_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);		
			}
			//draw node 2 glowy orb
			if(tempCap->OuterOrbs[1]->get_visible())
			{
				x = tempCap->get_x()+NODE2_X+64;
				y = -tempCap->get_y()-NODE2_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			//draw node 3 glowy orb
			if(tempCap->OuterOrbs[2]->get_visible())
			{
				x = tempCap->get_x()+NODE3_X+64;
				y = -tempCap->get_y()-NODE3_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			//draw node 4 glowy orb
			if(tempCap->OuterOrbs[3]->get_visible())
			{
				x = tempCap->get_x()+NODE4_X+64;
				y = -tempCap->get_y()-NODE4_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			//GL GLOWY CONNECTOR POINTS & CONNECTORS
			offset_x = 30;
			offset_y = 30;
			glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
			
			//draw center connector point 1
			if(tempCap->OuterOrbs[0]->get_visible() || tempCap->OuterOrbs[1]->get_visible())
			{
				x = tempCap->get_x()+12;
				y = -tempCap->get_y()-148;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);		
			}
			glColor4f(0.4f,0.15f,1.0f,_manager->warningAlpha * 0.5f );
			//draw connector from node1 to center connector  1
			if(tempCap->OuterOrbs[0]->get_visible())
			{
				x1 = tempCap->get_x()+NODE1_X+128;
				y1 = -tempCap->get_y()-NODE1_Y-64+10;
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y-16,x1,y1,offset_x,offset_y);	
				glBindTexture(GL_TEXTURE_2D, texture[0]);	
			}
			//draw connector from node2 to center connector 1
			if(tempCap->OuterOrbs[1]->get_visible())
			{
				x1 = tempCap->get_x()+NODE2_X+64;
				y1 = -tempCap->get_y()-NODE2_Y;
				offset_x = 20;
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y,x1,y1,offset_x,offset_y);	
				glBindTexture(GL_TEXTURE_2D, texture[0]);
				offset_x = 30;
			}
			
			glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
			//draw node 1 glowy connector point
			if(tempCap->OuterOrbs[0]->get_visible())
			{
				x = tempCap->get_x()+NODE1_X+128;
				y = -tempCap->get_y()-NODE1_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);		
			}
			
			if(tempCap->OuterOrbs[1]->get_visible())
			{
				//draw node 2 glowy connector point
				x = tempCap->get_x()+NODE2_X+64;
				y = -tempCap->get_y()-NODE2_Y;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			
			
			//draw center connector point 2
			if(tempCap->OuterOrbs[2]->get_visible() || tempCap->OuterOrbs[3]->get_visible())
			{
				x = tempCap->get_x()+148;
				y = -tempCap->get_y()-148;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			
			glColor4f(0.4f,0.15f,1.0f,_manager->warningAlpha * 0.5f);
			//draw connector from node3 to center connector 2
			if(tempCap->OuterOrbs[2]->get_visible())
			{
				x1 = tempCap->get_x()+NODE3_X+64;
				y1 = -tempCap->get_y()-NODE3_Y;
				offset_x = 20;
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y,x1,y1,offset_x,offset_y);	
				glBindTexture(GL_TEXTURE_2D, texture[0]);	
				offset_x = 30;
			}
			//draw connector from node4 to center connector 2
			if(tempCap->OuterOrbs[3]->get_visible())
			{
				x1 = tempCap->get_x()+NODE4_X;
				y1 = -tempCap->get_y()-NODE4_Y-64+10;
				
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y-16,x1,y1,offset_x,offset_y);	
				glBindTexture(GL_TEXTURE_2D, texture[0]);	
			}
			
			glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
			//draw node 3 glowy connector point
			if(tempCap->OuterOrbs[2]->get_visible())
			{
				x = tempCap->get_x()+NODE3_X+64;
				y = -tempCap->get_y()-NODE3_Y;	
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			//draw node 4 glowy connector point
			if(tempCap->OuterOrbs[3]->get_visible())
			{
				x = tempCap->get_x()+NODE4_X;
				y = -tempCap->get_y()-NODE4_Y-64;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			//GL DRAW GLOWY BARS
			offset_x = 30;
			offset_y = 30;
			glColor4f(0.0f,0.0f,1.0f,_manager->bossAlpha );
			
			//draw left glowy bar
			if(tempCap->OuterOrbs[0]->get_visible() && tempCap->OuterOrbs[1]->get_visible())
			{
				x = tempCap->get_x()+NODE1_X+104;
				y = -tempCap->get_y()-NODE1_Y-104-16;
				
				x1 = tempCap->get_x()+NODE2_X+26;
				y1 = -tempCap->get_y()-NODE2_Y-26+16;
				
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y,x1,y1,offset_x,offset_y);	
			}
			//draw right glowy bar
			if(tempCap->OuterOrbs[2]->get_visible() && tempCap->OuterOrbs[3]->get_visible())
			{
				x = tempCap->get_x()+NODE4_X+26;
				y = -tempCap->get_y()-NODE4_Y-104-16;
				
				x1 = tempCap->get_x()+NODE3_X+104;
				y1 = -tempCap->get_y()-NODE3_Y-26+16;
				
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y,x1,y1,offset_x,offset_y);	
			}
			
			//draw center glowy bar
			if(tempCap->OuterOrbs[1]->get_visible() && tempCap->OuterOrbs[2]->get_visible())
			{
				x = tempCap->get_x()+NODE2_X+148;
				y = -tempCap->get_y()-NODE2_Y-65;
				
				offset_x = 50;
				offset_y = 25;
				
				//glColor4f(1.0f,1.0f,1.0f,_manager->warningAlpha );
				glBindTexture(GL_TEXTURE_2D, texture[3]);
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
			}
			
			
			glBindTexture(GL_TEXTURE_2D, texture[0]);
			
			//draw glowy on U arms red lights
			if(tempCap->orbCount == -1) // we know all the orbs have been destroyed
			{
				
				offset_x = 20;
				offset_y = 20;
				glColor4f(1.0f,0.0f,0.0f,_manager->bossAlpha );
				createTriangleStrip(x,y,x,y,offset_x,offset_y);			
				
				x = tempCap->LeftU->get_x()+96;
				y = -tempCap->LeftU->get_y()-281;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);		
				
				x = tempCap->RightU->get_x()+43;
				y = -tempCap->RightU->get_y()-281;
				createTriangleStrip(x,y,x,y,offset_x,offset_y);	
				
				
			}
	}
	
	}
	
	
	// draw all powerUps
	for (	std::list<powerUp *>::iterator itpowerUps = _manager->powerUps.begin();
	itpowerUps != _manager->powerUps.end();
	itpowerUps++)
		
	{
		
		powerUp* tempPowerUp = *itpowerUps;
		
		
		x = (float)tempPowerUp->get_x() + 18;
		y = -(float)tempPowerUp->get_y() - 10;
		
		
		offset_x = 50;
		offset_y = 30;
		
		// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
		glColor4f(0.0f,1.0f,0.0f,0.7f);
		
		
		glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
		glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
		glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
		glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
		glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
		glEnd();	
		
	}
	
	
	
	// draws all enemy projectiles
	for (	std::list<Projectile*>::iterator itEnemyProj = _manager->enemy_projectiles.begin();
	itEnemyProj != _manager->enemy_projectiles.end();
	itEnemyProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itEnemyProj;
		itEnemyProj++;
		
		
		
		x = (float)tempProjectile->get_x() + 18;
		y = -(float)tempProjectile->get_y() - 18;
		
		switch( tempProjectile->get_curr_frame() )
		{
		case(0):
			offset_x = 27;
			offset_y = 27;
			break;
		case(1):
			offset_x = 30;
			offset_y = 30;
			break;
		case(2):
			offset_x = 35;
			offset_y = 35;
			break;
		case(3):
			offset_x = 40;
			offset_y = 40;
		case(4):
			offset_x = 45;
			offset_y = 45;
			break;
		case(5):
			offset_x = 45;
			offset_y = 45;
			break;
		case(6):
			offset_x = 45;
			offset_y = 45;
			break;
		case(7):
			offset_x = 47;
			offset_y = 137;
			break;
		default:
			offset_x = 27;
			offset_y = 27;
			
		}
		
		// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
		glColor4f(1.0f,0.2f,0.0f,0.9f);
		
		
		glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
		glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
		glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
		glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
		glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
		glEnd();		
		
	}
	
	
	
	//draws all player projetiles
	for (	std::list<Projectile*>::iterator itPlayerProj = _manager->player_projectiles.begin();
	itPlayerProj != _manager->player_projectiles.end();
	itPlayerProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itPlayerProj;
		itPlayerProj++;
		
		
		
		x = (float)tempProjectile->get_x() + 18;
		y = -(float)tempProjectile->get_y() - 18;
		
		type = tempProjectile->get_type();
		
		if(type == ENERGY_BLAST)
		{
			
			switch( tempProjectile->get_curr_frame() )
			{
			case(0):
				offset_x = 27;
				offset_y = 27;
				break;
			case(1):
				offset_x = 28;
				offset_y = 30;
				break;
			case(2):
				offset_x = 29;
				offset_y = 35;
				break;
			case(3):
				offset_x = 30;
				offset_y = 40;
			case(4):
				offset_x = 35;
				offset_y = 55;
				break;
			default:
				offset_x = 27;
				offset_y = 27;
				
			}
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(0.0f,1.0f,0.2f,0.7f);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
			glEnd();			
		}
		else if(type == ENERGY_BULLET )
		{
			switch( tempProjectile->get_curr_frame() )
			{
			case(0):
				offset_x = 27;
				offset_y = 27;
				break;
			case(1):
				offset_x = 30;
				offset_y = 30;
				break;
			case(2):
				offset_x = 35;
				offset_y = 35;
				break;
			case(3):
				offset_x = 40;
				offset_y = 40;
			case(4):
				offset_x = 45;
				offset_y = 45;
				break;
			default:
				offset_x = 27;
				offset_y = 27;
				
			}
			
			
			
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(0.0f,1.0f,0.5f,0.7f);
			
			//minor modification to draw coords
			y += 4;
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
			glEnd();	
		}
		else if( type == ENERGY_MISSLE)
		{
			
			switch( tempProjectile->get_curr_frame() )
			{
			case(0):
				offset_x = 27;
				offset_y = 27;
				break;
			case(1):
				offset_x = 35;
				offset_y = 35;
				break;
			case(2):
				offset_x = 40;
				offset_y = 40;
				break;
			case(3):
				offset_x = 45;
				offset_y = 45;
			case(4):
				offset_x = 55;
				offset_y = 55;
				break;
			default:
				offset_x = 27;
				offset_y = 27;
				
			}
			
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(0.0f,0.0f,1.0f,0.7f);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+offset_x,y+offset_y,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-offset_x,y+offset_y,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+offset_x,y-offset_y,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-offset_x,y-offset_y,0.0f); // Bottom Left
			glEnd();	
			
		}
		
		}
		
		
		//draws all explosions
		for (	std::list<Explosion*>::iterator itExpl = _manager->explosions.begin();
		itExpl != _manager->explosions.end();
		itExpl)
		{
			//	temp = explosions.size();
			// update the projectiles - i.e draw and move them
			// if they get drawn off the screen destory them
			Explosion* tempExplosion = *itExpl;
			itExpl++;
			
			x = (float)tempExplosion->get_x() + 18;
			y = -(float)tempExplosion->get_y() - 18;
			
			
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(5.0f,2.0f,0.0f,0.15f);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+24.5f,y+24.5f,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-24.5f,y+24.5f,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+24.5f,y-24.5f,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-24.5f,y-24.5f,0.0f); // Bottom Left
			glEnd();		
			
			
			
		}
		
		
		
		
		//Draws the engine effects
		for (int Loop = _manager->ParticleSystem->GetTotalParticles(); Loop > 0; Loop--)
		{
			//MoveAllParticles handles all particle movements. You don't have to do anything!
			_manager->ParticleSystem->MoveAllParticles();
			
			aParticle = _manager->ParticleSystem->GetParticle(Loop);														
			
			if(aParticle->active == true) //particle is alive
			{
				x=aParticle->vX;						// Grab Our Particle X Position
				y=-aParticle->vY;						// Grab Our Particle Y Position
				
				// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
				glColor4f(aParticle->r,aParticle->g,aParticle->b,aParticle->life);
				
				glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
				glTexCoord2d(1,1); glVertex3f(x+16.5f,y+16.5f,0.0f); // Top Right
				glTexCoord2d(0,1); glVertex3f(x-16.5f,y+16.5f,0.0f); // Top Left
				glTexCoord2d(1,0); glVertex3f(x+16.5f,y-16.5f,0.0f); // Bottom Right
				glTexCoord2d(0,0); glVertex3f(x-16.5f,y-16.5f,0.0f); // Bottom Left
				glEnd();			
				
				
				//modify the life of the particle
				aParticle->life-=aParticle->fade;
				
				if (aParticle->life<0.0f)					// If Particle Is Burned Out
				{
					_manager->ParticleSystem->DestroyParticle(Loop);
				}
			}
		}						
		
		if(_manager->Fighter->shields > 0)
		{
			x = _manager->Fighter->get_x() + 38;
			y = -_manager->Fighter->get_y() - 24;
			
			
			glBindTexture(GL_TEXTURE_2D, texture[1]);
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(0.3f,0.6f,0.9f,(float)_manager->Fighter->shields/300.0f);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+64.5f,y+44.5f,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-64.5f,y+44.5f,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+64.5f,y-44.5f,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-64.5f,y-44.5f,0.0f); // Bottom Left
			glEnd();		
			glBindTexture(GL_TEXTURE_2D, texture[0]);
		}
		
	/*	
		//SHOW SHIELDS WARNING
		if(_manager->Fighter->shields < 100 && _manager->Fighter->armor < 250)
			//			if(_manager->Fighter->shields > 0)
			
		{
			x = 325;
			y = -574;
			
			
			
			glBindTexture(GL_TEXTURE_2D, texture[3]);
			// Draw The Particle Using Our RGB Values, Fade The Particle Based On It's Life
			glColor4f(0.9f,0.0f,0.0f,_manager->warningAlpha);
			
			glBegin(GL_TRIANGLE_STRIP);						// Build Quad From A Triangle Strip
			glTexCoord2d(1,1); glVertex3f(x+300.5f,y+20.5f,0.0f); // Top Right
			glTexCoord2d(0,1); glVertex3f(x-300.5f,y+20.5f,0.0f); // Top Left
			glTexCoord2d(1,0); glVertex3f(x+300.5f,y-20.5f,0.0f); // Bottom Right
			glTexCoord2d(0,0); glVertex3f(x-300.5f,y-20.5f,0.0f); // Bottom Left
			glEnd();		
			glBindTexture(GL_TEXTURE_2D, texture[0]);
		}
	*/	
		
		
		
		return TRUE;											// Everything Went OK
}


