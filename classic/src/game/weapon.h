#ifndef WEAPON_H
#define WEAPON_H

#include "stdinclude.h"
#include "projectile.h"

#define BLASTER 1
#define TURRET  2
#define MISSLE  3
#define ENEMYBLASTER 4
#define ENEMYCANNON  5

#define WEAPON_RATE 1
#define WEAPON_POWER 2

#define BLASTER_DAMAGE 6
#define TURRET_DAMAGE 4
#define MISSLE_DAMAGE 10

#define BLASTER_DELAY 100
#define TURRET_DELAY  250
#define MISSLE_DELAY  1000



#define ENEMY_DAMAGE_1 5


class Ship;

class Weapon : public GameObject
{
protected:

	int type;   // is this a blaster, turret or missle launcher
	int offset_x; // offset from the top left of ship sprite
	int offset_y; // offset from the top left of ship sprite
	int angle;
	int time_last_fired; //used for rate limiting
	



	//stores all the art so we only need to load it once
	//and all projectiles fired from here only need to point to the 
	//sprites, saves memory
	//Projectile* template_projectile;
	Ship* myShip;


public:

	Weapon(int _angle, int _type, int _offset_x, int _offset_y, GameManager *_manager, Ship* _myShip = NULL );

	~Weapon(){
	delete WeaponPower;
	};

	void show();

	bool update(){return true;};

	void set_offset_x( int new_offset ){ offset_x = new_offset; };
	void set_offset_y( int new_offset ){ offset_y = new_offset; };

	int get_offset_x(){ return offset_x; };
	int get_offset_y(){ return offset_y; };

	int get_angle() {return angle; };
	void set_angle(int _angle){ angle =_angle;};


	bool ready_to_fire()
	{
		int rateDelay;

		switch (type)
		{
		case (BLASTER):
			rateDelay = BLASTER_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;

		case( TURRET ):
			rateDelay = TURRET_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;

		case( MISSLE ):
			rateDelay = MISSLE_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;

		case( ENEMYBLASTER ):
			rateDelay  = BLASTER_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;

		//gunships
		case( ENEMYCANNON ):
			rateDelay  = TURRET_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;

		default:
			rateDelay = BLASTER_DELAY / WeaponPower->get_power_MUX(WEAPON_RATE);
			break;
		}


		if(CL_System::get_time() - time_last_fired > rateDelay)
		{
			time_last_fired = CL_System::get_time();
			return true;
		}
		else
			return false;
		 
	}
	
	
	int get_weapon_damage()
	{
		switch (type)
		{
		case (BLASTER):
			return  BLASTER_DAMAGE * WeaponPower->get_power_MUX(WEAPON_POWER);
			break;

		case( TURRET ):
			return TURRET_DAMAGE * WeaponPower->get_power_MUX(WEAPON_POWER);
			break;

		case( MISSLE ):
			return MISSLE_DAMAGE * WeaponPower->get_power_MUX(WEAPON_POWER);
			break;
		//lightfighter
		case( ENEMYBLASTER ):
			return 3 * ENEMY_DAMAGE_1 * WeaponPower->get_power_MUX(WEAPON_POWER);
			break;
		//gunships
		case( ENEMYCANNON ):
			return  4 * ENEMY_DAMAGE_1 * WeaponPower->get_power_MUX(WEAPON_POWER);
			break;

		default:
			return WeaponPower->get_power_MUX(WEAPON_POWER);
			break;
		}
		 
	}
	
	
	void fire(int _x, int _y);
	void fire(int _x, int _y, int _dx, int _dy);
	
	// The weapon holds the images that the projectiles need
	// since we dont want to have to reload images when
	// a projectile is created or destroyed
	// we have a different "bullet" for each power level
	// This is an array of pointers to the bitmap images:
    CL_Surface* projectile[MAX_PWR];  
	// used for collions - there is a one to one correspondance
	unsigned char *projectileMasks[MAX_PWR];  

	PowerPlant* WeaponPower; //used for rate and power information

};


#endif