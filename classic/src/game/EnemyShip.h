#ifndef ENEMYSHIP_H
#define ENEMYSHIP_H

#include "stdinclude.h"
#include "Ship.h"
#include "weapon.h"
#include "explosionGenerator.h"

#include "LightFighterAI.h"
#include "GunshipAI.h"
#include "FighterBAI.h"
#include "Sound.h"
#include <math.h>

// ship types
#define LIGHTFIGHTER 0
#define GUNSHIP      1
#define HEAVYFIGHTER 2
#define FRIGATE      3
#define BOSS         4

class EnemyShip : public Ship
{
protected:
	GenericAI *ai; // generic AI pointer
	int		type; // ship type identifier

public:

	bool selected;

	EnemyShip(int _shields, int _armor, int wave_position, int x, int y, int _type, GameManager *manager) 
		: Ship(_shields, _armor, x, y, manager)
	{
		type = _type;
		ai = NULL;
		noseBlaster = NULL;
		weapon2 = NULL;
		weapon3 = NULL;
		selected = false;

		// create a different AI based on ship type
		switch(_type)
		{
		case LIGHTFIGHTER:
			noseBlaster = new Weapon(0,ENEMYBLASTER, 16, 16,manager, this);
			ai = new LightFighterAI(/* wave position = 0 */ wave_position, CL_System::get_time());
			break;
		case HEAVYFIGHTER:
			noseBlaster = new Weapon(0,ENEMYBLASTER, 16, 16,manager, this);
			ai = new FighterBAI(/* wave position = 0 */ wave_position, CL_System::get_time());
			break;
		case GUNSHIP:
			weapon2 = new Weapon(0,ENEMYCANNON, 11, 51,manager, this);
			weapon3 = new Weapon(0,ENEMYCANNON, 85, 51,manager, this);
			weapon2->WeaponPower->set_power_cell_2( 2 );
			weapon3->WeaponPower->set_power_cell_2( 2 );
			ai = new GunshipAI();
			break;

		}

		
	
	}
	
	~EnemyShip() { 
		if(ai) delete(ai); 
		if(noseBlaster) delete noseBlaster;
		if(weapon2) delete(weapon2);
		if(weapon3) delete(weapon3);
		return; }

	int get_type(){return type; };


	// generates explosions and returns percentage chance of a powerup
	float destroy_ship()
	{
		float powerUpProb;
		Sound::playExplosionSound();


		//make different explosions based on the type of ship
		switch(type )
		{
		case LIGHTFIGHTER:
							
			explosionGenerator::MakeExplosions( x + width /2,
												y + height /2,
												dx, dy, manager );
			//5% chance you get a powerup
			powerUpProb = 0.05f;
			break;
		case HEAVYFIGHTER:
							
			explosionGenerator::MakeExplosions( x + width /2,
												y + height /2,
												dx, dy, manager );
			//5% chance you get a powerup
			powerUpProb = 0.1f;
			break;
		case GUNSHIP:
				explosionGenerator::MakeExplosions( x + width /2,
												y + height /2,
												dx, dy, manager );
				
				explosionGenerator::MakeExplosions( x + width /3,
												y + height -5,
												dx, dy, manager );

				explosionGenerator::MakeExplosions( x + width -15,
												y + height -5,
												dx, dy, manager );
			//25% chance you get a powerup
			powerUpProb = 0.25f;
			break;
		default:
			explosionGenerator::MakeExplosions( x + width /2,
												y + height /2,
												dx, dy, manager );
			//5% chance you get a powerup
			powerUpProb = 0.05f;
			break;


		}

		return powerUpProb;

	}

	bool update_input(float hori_axis, float vert_axis);
	bool update(){	
		static int update_time_start, update_time_end;
		static int xjitter = 0, yjitter = 0;
		int _x,_y;

		int xmov = 0 , ymov = 0;

		if(selected)
		{
		
		
			if(type == LIGHTFIGHTER||type == HEAVYFIGHTER)
				{
					_x = get_x();
					_y = get_y();
				}
				else if(type == GUNSHIP)
				{
					_x = get_x()+16;
					_y = get_y()+16;
				}
				
			
		}

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
			set_curr_frame(result.frame);

			if(result.bFire)
			{
				int temp_dx, temp_dy;
				get_velocity(&temp_dx,&temp_dy);

				// each ship fires in a different way
				switch(type)
				{
				case LIGHTFIGHTER:
					noseBlaster->fire(get_x(), get_y(), temp_dx,temp_dy);
					break;
				case HEAVYFIGHTER:
					noseBlaster->fire(get_x(), get_y(), temp_dx,temp_dy);
					break;
				case GUNSHIP:
					weapon2->fire(get_x(), get_y());
					weapon3->fire(get_x(), get_y());
					break;

				}
				
			}
		
			this->show(); 
		//	manager->ship_selected->put_screen(_x,_y);

			// check for ship running away
			if(result.bRunAway == true &&
				(get_x() < -64 || get_x() > SCREEN_WIDTH_TO_CONSOLE + 64 ||
				get_y() < -64 || get_y() > SCREEN_HEIGHT + 64))
				return false;
			
			return true; }

	Weapon *noseBlaster;
	Weapon *weapon2;
	Weapon *weapon3;
	



};



#endif