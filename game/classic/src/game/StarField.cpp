// StarField.cpp: implementation of the StarField class.
//
//////////////////////////////////////////////////////////////////////

#include "StarField.h"
#include "GameManager.h"

#include <stdlib.h>
#include <iostream>


//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

StarField::StarField()
{
    fieldSpeed = 30;
}

StarField::~StarField()
{


}

// rnd()
// function to return a random number between 0 and 1
double StarField::rnd(void)
{
	return ((double)(rand()%4096))/4096;
}

// return between 0 and 640
double StarField::newRnd(int inputVal)
{
	return ((double)(rand()%inputVal));
}

void StarField::Initialize(int speed, bool near_earth, GameManager* _manager)
{
	
	int i;
	for(i=0;i<STARFIELD_MAX_STARS;i++)
		RenewStar(i, true);

	fieldSpeed = speed;

	starfield_start_time = CL_System::get_time();


	if( near_earth == true ){
	
	newEarth = new spaceObject(0,0,0, 150, _manager);
	newEarth->add_frame("Game/Graphics/earth");
	
	newMoon = new spaceObject(0,0,0, 200, _manager);
	newMoon->add_frame("Game/Graphics/moon");

	
	/*	//setup earth
		earth.view_object = true;
		earth.objectImage = CL_Surface::load("Game/Graphics/earth", _manager->get_resources());
		earth.objectPos.y = 30000;
		earth.objectPos.x = 0;
		earth.objectPos.z = 200;
		earth.objectPos.yscr = 300;

		//setup moon
		moon.view_object = true;
		moon.objectImage = CL_Surface::load("Game/Graphics/moon", _manager->get_resources());
		moon.objectPos.y = 60000;
		moon.objectPos.x = 0;
		moon.objectPos.z = 400;
		moon.objectPos.
	*/
	  }

}

void StarField::PickStar(void)
{
	
	if(rnd() > 0.2f)
		stars[(rand()%STARFIELD_MAX_STARS)].moving = 1;

}


void StarField::MoveStars(int speed)
{
	int i;
	int temp;
	//double newPos;

	//fieldSpeed = speed;
	for(i=0;i<STARFIELD_MAX_STARS;i++)
	{
	
		if(stars[i].moving == 1){
		
			// calculate xscr - doesn't change
			stars[i].xscr = stars[i].x;

			// calculate yscr
			// relative speed based on distance from viewpoint
			stars[i].y += speed;
			temp = (stars[i].y) / stars[i].z;
			stars[i].yscr = (int)temp;

			// calculate color
			temp = (STARFIELD_DISTANCE - (int)stars[i].z)*8;
			
			stars[i].color = ((double)temp / (double)255) / 0.5;

			// reset stars if they exit viewspace
			if(stars[i].xscr < 0 || stars[i].xscr > (SCREEN_WIDTH - 1) ||
				stars[i].yscr < 0 || stars[i].yscr > (SCREEN_HEIGHT -1) )
			{
				RenewStar(i,false);
				stars[i].xscr = 0;
				stars[i].yscr = 0;
				stars[i].color = 0;
			}
		}

	}
/*
	if( earth.view_object == true )
	{
		// lets update Earths movement
		earth.objectPos.xscr = earth.objectPos.x;
		earth.objectPos.y += speed;
		newPos = double((earth.objectPos.y)) / (double) earth.objectPos.z;
		earth.objectPos.yscr = floor( newPos );
		earth.objectPos.y = earth.objectPos.yscr;
		if( earth.objectPos.yscr > 600 )
		{
			earth.view_object = false;
			delete earth.objectImage;
		}
	
	 }
/*
	if( moon.view_object == true )
	{
		// lets update Earths movement
		moon.objectPos.xscr = moon.objectPos.x;
		moon.objectPos.y += speed;
		newPos = (double )(moon.objectPos.y) / (double) moon.objectPos.z;
		moon.objectPos.yscr = floor(newPos);
		moon.objectPos.y = moon.objectPos.yscr;
		if( moon.objectPos.yscr > 600 )
		{
			moon.view_object = false;
			delete moon.objectImage;
		}
	}
*/

}

void StarField::Draw(float speed, bool drawBckGrnd)
{
	for(int i = 0; i < STARFIELD_MAX_STARS ; i++)
			/*		if(stars[i].moving == 1){
						if(stars[i].size == 1)
							CL_Display::fill_rect(
							stars[i].xscr,
							stars[i].yscr,
							stars[i].xscr+1,
							stars[i].yscr+1,
							stars[i].color , 
							stars[i].color , 
							stars[i].color, 1.0f);
						else
							CL_Display::fill_rect(
							stars[i].xscr,
							stars[i].yscr,
							stars[i].xscr+1,
							stars[i].yscr+1,
							stars[i].color, 
							stars[i].color, 
							stars[i].color, 1.0f);

						
					}
			*/	
				PickStar();	
			
				//possible addition to enhance sense of flying faster
				//commented out cause not needed
				/*	
				float temp;
				
				if( speed < 0.1f ){
					temp  = speed + 1.0f;
					speed = (float) fieldSpeed + ((float) fieldSpeed * abs(speed));
				}
				else if (speed > 0.1f)
				{
					temp  = 1.0f - speed;
					speed = (float) fieldSpeed - ((float) fieldSpeed * (speed/2));
				}
				else 
					speed = (float) fieldSpeed;
				*/
			//	speed = (float) fieldSpeed;

				MoveStars(speed);
/*
				if( moon.view_object == true )
					moon.objectImage->put_screen(moon.objectPos.xscr, moon.objectPos.yscr );


				if( earth.view_object == true )
					earth.objectImage->put_screen(earth.objectPos.xscr, earth.objectPos.yscr );
*/

				//we only wanna draw the background if this is level 1
				if( drawBckGrnd == true && newMoon != NULL ){
					//give the player a little time to see the earth before it moves
					if( CL_System::get_time() - starfield_start_time > 300 )
					{
						newMoon->set_velocity( 0, 18);
						newEarth->set_velocity( 0, 30 );
					}

					if(newMoon->get_y() <= 600)
					{
					newMoon->update();
					newEarth->update();
					}
					//PAGING CODE TO PAGE OUT UNUSED GRAPHICS
	/*				else 
					{
						delete(newMoon);
						newMoon = NULL;
						delete(newEarth);
						newEarth = NULL;
					}
		*/
		  }

				
			
}
 
void StarField::RenewStar(int i, bool firstTime)
{
	
	//set all other props
	stars[i].z = newRnd(STARFIELD_DISTANCE) + 1;
	stars[i].x = newRnd((SCREEN_WIDTH ));
	
	stars[i].size = newRnd(2) + 1;

	// if this is the first time, we need some Y info
	if( firstTime == true) 
	{
		//have no idea why huge val is needed, seems to work tho
		stars[i].y = (int)newRnd(SCREEN_HEIGHT+10000000);
		stars[i].yscr = stars[i].y; 
		stars[i].xscr = stars[i].x; 
		stars[i].moving = 1;
	
	}
	else
	{
		stars[i].y = 0;
		stars[i].moving = 0;
	}


}
