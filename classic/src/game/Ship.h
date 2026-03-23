#ifndef SHIP_H
#define SHIP_H

#include "stdinclude.h"

//defines for the ship powerplant data
#define SHIELD_POWER 1
#define ENGINE_POWER 2
//defines for the armor data
#define LIGHT_ARMOR 100
#define MEDIUM_ARMOR 200
#define HEAVY_ARMOR 300

#define MAX_SHIELD 300

class Ship : public GameObject_Sprite
{
public:
	Ship(int _shields, int _armor, int x, int y, GameManager *manager) 
		: GameObject_Sprite( x, y, manager)
	{
		ShipPower = NULL;

	// create a new powerplant to power the ships shields and engines
	ShipPower = new PowerPlant(1,1);
	// give the armor a starting rating
	armor = _armor;
	// give the shields a starting rating
	shields = _shields;
	}
	~Ship() { if(ShipPower) delete ShipPower; return; }

	bool take_damage( int damage );

	// to be overloaded in subclasses
	// generates explosions and returns percentage chance of a powerup
	float destroy_ship(){};

	PowerPlant* ShipPower; //used for shields and manuvering

	int armor; // holds the remaining armor of the ship
	int shields; // holds the remaining shield power of the ship



};

#endif