#include "CapitalShip.h"
#include "GameManager.h"
#include "PlayerShip.h"
#include "collision.h"
#include "Sound.h"
	

	CapitalShip::CapitalShip(int _x, int _y, GameManager *manager)
		: Ship(500, 500, _x, _y, manager){

			ai = new LightFighterAI(0, CL_System::get_time());

		this->template_copy( manager->CapShipBodyTemplate ); 

		CapShipNose = new ShipComponent(0, 64, true, 500,500, this, manager);
		CapShipNose->template_copy( manager->CapShipNoseTemplate );
		CapShipNose->set_curr_frame(0 );
	
	}

bool CapitalShip::update()
	{	
		/*	static int update_time_start, update_time_end;
		static int xjitter = 0, yjitter = 0;

		int xmov = 0 , ymov = 0;

		AI_THINK_RESULT result;
  
			result = ai->Think(manager->Fighter->get_x(),manager->Fighter->get_y(),
				get_x(),get_y(),CL_System::get_time());

			// "jitter" xmov and ymov to make up for integer velocities
			xjitter += ((result.xmov - floor(result.xmov)) * 100);
			yjitter += ((result.ymov - floor(result.ymov)) * 100);
			if(xjitter > 100)
			{
				xmov++;
				xjitter-= 100;
			}
			if(yjitter > 100)
			{
				ymov++;
				yjitter-= 100;
			}
			xmov += (int)result.xmov;
			ymov += (int)result.ymov;
			// done with jitter

			set_velocity(xmov,ymov);		

		*/
		this->show();
		CapShipNose->update();

		return true;
	}	

	bool CapitalShip::collision_update(Projectile* player_projectile)
	{
		bool retVal =false;

		if(CapShipNose->collision_update(player_projectile) == true)
			retVal =true;
		//check the if any of the player projectiles are hitting enemy ships
		else if( CollisionDetection::Sprite_Collide((player_projectile), this) == 1)
		{
			//check to see if we destroy the ship
			if( (this)->take_damage( (player_projectile)->get_damage() ) == true)
			{
				
				is_destroyed = true;
			
			}
			retVal = true;		
		}

		return retVal;
	}
	

	// generates explosions and returns percentage chance of a powerup
float CapitalShip::destroy_ship()
	{
		float powerUpProb;
		Sound::playExplosionSound();

		explosionGenerator::MakeExplosions( x + width /2,
											y + height /2,
											dx, dy, manager );

		//components do not drop powerups
		powerUpProb = 0;

		return powerUpProb;
	}