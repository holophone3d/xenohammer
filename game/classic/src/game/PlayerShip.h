#ifndef PLAYERSHIP_H
#define PLAYERSHIP_H

#include "stdinclude.h"
#include "Ship.h"
#include "weapon.h"
#include "explosionGenerator.h"
#include <iostream.h>  // I/O 
#include <fstream.h>   // file I/O
#include <iomanip.h>   // format manipulation


// settings for the ship powerplant
#define SHIP_POWER_SHIELDS 1
#define SHIP_POWER_ENGINES 2


#define SETTING_1 1
#define SETTING_2 2
#define SETTING_3 3

//this is the center point for each weapon
//  4 is for the height and width of the projectile
//noseblaster offset
#define NB_X_COORD 38 - 16
#define NB_Y_COORD 4 - 16
//left turret offset
#define LT_X_COORD 15 - 16
#define LT_Y_COORD 11 - 16
//right turret offset
#define RT_X_COORD 60 - 16
#define RT_Y_COORD 11 - 16
//left missle offset
#define LM_X_COORD 29 - 16
#define LM_Y_COORD 16 - 16
//right missle offset
#define RM_X_COORD 46 - 16
#define RM_Y_COORD 16 - 16

// these structs are used to hold the ship powerplant data needed to 
// switch between modes
typedef struct _powerPlantData{
	int cell1;
	int cell2;
} powerPlantData;

typedef struct _shipPowerSetting{
	powerPlantData noseBlaster;
	powerPlantData leftTurret;
	powerPlantData rightTurret;
	powerPlantData leftMissle;
	powerPlantData rightMissle;
	powerPlantData shipPower;
	int leftTurretAngle;
	int rightTurretAngle;
} shipPowerSetting;


class PlayerShip : public Ship 
{
protected:

//	CL_SoundBuffer *fire_sound;
	int enemyKills;
	int powerUpCount;

public:

	PlayerShip(int _shields, int _armor, int x, int y, GameManager *manager) 
		: Ship(_shields, _armor, x, y, manager)
	{
	enemyKills = 0;
	powerUpCount = 10;

	ranking =  (char *)malloc( sizeof(char) * 10);
	ranking = "Test Pilot";

	// offsets are no longer constant due to variable size of projectiles
	noseBlaster = new Weapon(45,BLASTER, NB_X_COORD, NB_Y_COORD,manager);
	leftTurret = new Weapon(135,TURRET, LT_X_COORD, LT_Y_COORD,manager);
	rightTurret = new Weapon(45,TURRET, RT_X_COORD, RT_Y_COORD,manager);
	leftMissle = new Weapon(0,MISSLE, LM_X_COORD, LM_Y_COORD,manager);
	rightMissle = new Weapon(0,MISSLE, RM_X_COORD, RM_Y_COORD,manager);


	//SAMPLE SETTING TESTS
	//noseblaster
	setting_1.noseBlaster.cell1 = 1;
	setting_1.noseBlaster.cell2 = 1;
	//leftturret
	setting_1.leftTurret.cell1 = 1;
	setting_1.leftTurret.cell2 = 1;
	//rightTurret
	setting_1.rightTurret.cell1 = 1;
	setting_1.rightTurret.cell2 = 1;	
	//leftMissle
	setting_1.leftMissle.cell1 = 1;
	setting_1.leftMissle.cell2 = 1;
	//rightMissle
	setting_1.rightMissle.cell1 = 1;
	setting_1.rightMissle.cell2 = 1;	
	//shipPower
	setting_1.shipPower.cell1  =  1;
	setting_1.shipPower.cell2  =  1;	
	//turret angles
	setting_1.leftTurretAngle = 135;
	setting_1.rightTurretAngle = 45;

	//noseblaster
	setting_2.noseBlaster.cell1 = 1;
	setting_2.noseBlaster.cell2 = 1;
	//leftturret
	setting_2.leftTurret.cell1 = 1;
	setting_2.leftTurret.cell2 = 1;
	//rightTurret
	setting_2.rightTurret.cell1 = 1;
	setting_2.rightTurret.cell2 = 1;	
	//leftMissle
	setting_2.leftMissle.cell1 = 1;
	setting_2.leftMissle.cell2 = 1;
	//rightMissle
	setting_2.rightMissle.cell1 = 1;
	setting_2.rightMissle.cell2 = 1;	
	//shipPower
	setting_2.shipPower.cell1  =  1;
	setting_2.shipPower.cell2  =  1;
	//turret angles
	setting_2.leftTurretAngle = 135;
	setting_2.rightTurretAngle = 45;

	//noseblaster
	setting_3.noseBlaster.cell1 = 1;
	setting_3.noseBlaster.cell2 = 1;
	//leftturret
	setting_3.leftTurret.cell1 = 1;
	setting_3.leftTurret.cell2 = 1;
	//rightTurret
	setting_3.rightTurret.cell1 = 1;
	setting_3.rightTurret.cell2 = 1;	
	//leftMissle
	setting_3.leftMissle.cell1 = 1;
	setting_3.leftMissle.cell2 = 1;
	//rightMissle
	setting_3.rightMissle.cell1 = 1;
	setting_3.rightMissle.cell2 = 1;	
	//shipPower
	setting_3.shipPower.cell1  =  1;
	setting_3.shipPower.cell2  =  1;
	//turret angles
	setting_3.leftTurretAngle = 135;
	setting_3.rightTurretAngle = 45;

	
	}
	
	~PlayerShip() { 
		delete noseBlaster;
		delete leftTurret;
		delete rightTurret;
		delete leftMissle;
		delete rightMissle;
		return; }

	void addKill(){ enemyKills++; };
	int getKillCount(){ return enemyKills; };
	void setKillCount( int newCount ){ enemyKills = newCount; };

	void addPowerUp(){ powerUpCount++; };
	int getPowerUpCount(){ return powerUpCount; };
	void setPowerUpCount( int newCount) { powerUpCount = newCount; };
	

	void update_gui(bool fire_gun1 = true, bool fire_gun2 = true,
					bool fire_gun3 = true, bool fire_gun4 = true,
					bool fire_gun5 = true);


	void update_ranking();
	bool update_input(float hori_axis, float vert_axis);
	bool update();

	int save_shipInfo(GameManager *manager);
	int load_shipInfo(GameManager *manager);

	bool save_ship_setting( int shipSetting )
	{
		shipPowerSetting tempSetting;	

		// read out in the current power setting
		
		//noseblaster
		tempSetting.noseBlaster.cell1 = noseBlaster->WeaponPower->get_power_cell_1();
		tempSetting.noseBlaster.cell2 = noseBlaster->WeaponPower->get_power_cell_2();
		//leftturret
		tempSetting.leftTurret.cell1 = leftTurret->WeaponPower->get_power_cell_1();
		tempSetting.leftTurret.cell2 = leftTurret->WeaponPower->get_power_cell_2();
		//rightTurret
		tempSetting.rightTurret.cell1 = rightTurret->WeaponPower->get_power_cell_1();
		tempSetting.rightTurret.cell2 = rightTurret->WeaponPower->get_power_cell_2();	
		//leftMissle
		tempSetting.leftMissle.cell1 = leftMissle->WeaponPower->get_power_cell_1();
		tempSetting.leftMissle.cell2 = leftMissle->WeaponPower->get_power_cell_2();
		//rightMissle
		tempSetting.rightMissle.cell1 = rightMissle->WeaponPower->get_power_cell_1();
		tempSetting.rightMissle.cell2 = rightMissle->WeaponPower->get_power_cell_2();	
		//shipPower
		tempSetting.shipPower.cell1  =  ShipPower->get_power_cell_1();
		tempSetting.shipPower.cell2  =  ShipPower->get_power_cell_2();	

		tempSetting.leftTurretAngle = leftTurret->get_angle();
		tempSetting.rightTurretAngle = rightTurret->get_angle();

		//assign the new power setting
		switch( shipSetting )
		{

		case( SETTING_1 ):
			setting_1 = tempSetting;
			break;
		case( SETTING_2 ):
			setting_2 = tempSetting;
			break;
		case( SETTING_3 ):
			setting_3 = tempSetting;
			break;
		default:
			setting_1 = tempSetting;
			break;
		}

		return true;
	}


	bool load_ship_setting( int shipSetting )
	{
		shipPowerSetting tempSetting;	

		//setup the powersetting to be swapped in
		switch( shipSetting )
		{

		case( SETTING_1 ):
			tempSetting = setting_1;
			break;
		case( SETTING_2 ):
			tempSetting = setting_2;
			break;
		case( SETTING_3 ):
			tempSetting = setting_3;
			break;
		default:
			tempSetting = setting_1;
			break;
		}

		// swap in the current power setting
		
		//noseblaster
		noseBlaster->WeaponPower->set_power_cell_1( tempSetting.noseBlaster.cell1 );
		noseBlaster->WeaponPower->set_power_cell_2( tempSetting.noseBlaster.cell2 );
		//leftturret
		leftTurret->WeaponPower->set_power_cell_1( tempSetting.leftTurret.cell1 );
		leftTurret->WeaponPower->set_power_cell_2( tempSetting.leftTurret.cell2 );
		//rightTurret
		rightTurret->WeaponPower->set_power_cell_1( tempSetting.rightTurret.cell1 );
		rightTurret->WeaponPower->set_power_cell_2( tempSetting.rightTurret.cell2 );	
		//leftMissle
		leftMissle->WeaponPower->set_power_cell_1( tempSetting.leftMissle.cell1 );
		leftMissle->WeaponPower->set_power_cell_2( tempSetting.leftMissle.cell2 );	
		//rightMissle
		rightMissle->WeaponPower->set_power_cell_1( tempSetting.rightMissle.cell1 );
		rightMissle->WeaponPower->set_power_cell_2( tempSetting.rightMissle.cell2 );	
		//shipPower
		ShipPower->set_power_cell_1( tempSetting.shipPower.cell1 );
		ShipPower->set_power_cell_2( tempSetting.shipPower.cell2 );	
			
		leftTurret->set_angle( tempSetting.leftTurretAngle );
		rightTurret->set_angle( tempSetting.rightTurretAngle );
		
		return true;


	}

	//resets the fighter so it can start in the middle of the screen

	void game_reset()
	{

		x = 287; //center relative to ship size
		y = 300;
		dx =0;
		dy = 0;
		curr_frame = 8;
		
		// ressurect if dead
		is_destroyed = false;
		damageable = true;


		armor = HEAVY_ARMOR;
		shields = MAX_SHIELD;

		load_ship_setting(1);

	//	is_destroyed = false;

	}


	float destroy_ship()
	{
			is_destroyed =true;
			damageable =false;
			armor = -1;
				
			explosionGenerator::MakeExplosions( x + width /2,
												y + height /2,
												dx, dy, manager );
				
			explosionGenerator::MakeExplosions( x + width /3,
												y + height -5,
												dx, dy, manager );

			explosionGenerator::MakeExplosions( x + width -15,
												y + height -5,
												dx, dy, manager );
	
		return 0;
	
	}

	Weapon *noseBlaster;
	Weapon *leftTurret;
	Weapon *rightTurret;
	Weapon *leftMissle;
	Weapon *rightMissle;

	shipPowerSetting setting_1;
	shipPowerSetting setting_2;
	shipPowerSetting setting_3;

	char *ranking;

};



#endif