#ifndef GAMEANIMATION_H
#define GAMEANIMATION_H

#include "stdinclude.h"


class GameAnimation : public GameObject_Sprite
{
public:
	GameAnimation( int x, int y, GameManager *manager) 
		: GameObject_Sprite( x, y, manager){ state = 0; curr_frame = 0;};

	
	bool update() 
	{

	
	if(state == 0)
	{ 
		if( get_curr_frame() > 0)
			set_curr_frame(0);
		state = 1;
	}
	else if (state == 1){
		if(update_time_start == 0)
			update_time_end = update_time_start = CL_System::get_time();

		update_time_end = CL_System::get_time(); 	
 		if(update_time_end > update_time_start + 100)
	{
				update_time_start = CL_System::get_time();

				if(get_curr_frame() < (get_num_frames() - 1))
					set_curr_frame(get_curr_frame() + 1);
				else
					state = 2;
		}
			
	}

	this->show();
	
	if(state == 2)
		return false;
	else
		return true;
	}
};
#endif


	