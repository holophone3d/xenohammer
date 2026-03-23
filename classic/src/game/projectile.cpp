#include "projectile.h"
#include "GameManager.h"
#include "PlayerShip.h"


int old_dx, old_dy;


Projectile::Projectile(int _damage, int angle, int _type, int _x, int _y, GameManager *_manager, int _dx, int _dy)
: GameObject_Sprite( _x, _y, _manager)
{
	
	isHoming = _manager->isHoming;
	done_firing = false;
	traking = true;
	
	save_x = x;
	save_y = y;
	
	damage = _damage;
	type = _type;
	if(type == ENERGY_BLAST)
		dy = -27;
	if(type == ENERGY_BULLET){
		
		switch( angle )
		{
		case(0):
			dy=0;
			dx = 29;
			break;
		case(45):
			dy = -21;
			dx = 20;
			break;
		case(90):
			dy = -29;
			dx =0;
			break;
		case(135):
			dy = -21;
			dx= -20;
			break;
		case(180):
			dy =0;
			dx = -29;
			break;
		case(225):
			dy = 21;
			dx= -20;
			break;
		case(270):
			dy = 29;
			dx =0;
			break;
		case(315):
			dy = 21;
			dx = 20;
			break;
		default:
			dy = -29;
			dx =0;
			break;
		}
		
		
	}
	if(type == ENERGY_MISSLE)
		dy = -17;
	if(type == 4 )
	{
		dx = _dx * 2;
		dy = _dy * 2;
	}
	
	else if( type == 5 )
	{
		dx =0;
		dy = 21;
	}
	
}

bool Projectile::update(){ 
	int _x, _y,hyp;
	int trak = 64; 
	bool retVal;
	retVal = true;
	if(target != NULL)
	{			
		if((type==ENERGY_MISSLE)&&(isHoming))
		{
			if(!done_firing)
				if(abs(y - get_save_y())>50)
					done_firing = true;
				if((traking)&&(done_firing))
				{
					done_firing = true;
					_x = target->get_x()+(target->get_width()/2);
					_y = target->get_y()+(target->get_height()/2);
					
					_x = (_x-x);
					_y = (_y-y);
					hyp = sqrt(((_x)*(_x))+((_y)*(_y)));
					
					//if at anytime the projectile is with in 16 pixels it stops traking forever
					if((abs(_x)<=trak)&&(abs(_y)<=trak))
					{
						traking = false;
					}
					else
						traking = true;
					
					if((hyp!=0))
					{
						_x = ((_x*20)/hyp);
						_y = ((_y*20)/hyp);
						dx = _x;
						dy = _y;
						old_dx = dx;
						old_dy = dy;
					}
					else
					{
						dx = old_dx;
						dy = old_dy;
					}
				}
				else if(!done_firing)
				{
					dx = 0;
					dy = -27;
				}
				else 
				{
					dx = old_dx;
					dy = old_dy;
				}
		}
	}
	
	if( x > SCREEN_WIDTH_TO_CONSOLE || x < 0 )
		retVal =false;
	if( y > SCREEN_HEIGHT || y < 0)
		retVal = false;
	if( dx == 0 && dy == 0 )
		retVal = false;
	
	this->show(); 
	return retVal;
	
}
