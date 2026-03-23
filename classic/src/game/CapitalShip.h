#ifndef CAPITALSHIP_H
#define CAPITALSHIP_H

#include "stdinclude.h"
#include "Ship.h"
#include "explosionGenerator.h"
#include "ShipComponent.h"
#include "LightFighterAI.h"

class Projectile;

class CapitalShip: public Ship
{
protected:

		GenericAI *ai; // generic AI pointer

public:
	int cap_selected;
		bool selected;
		int type;

		int get_type(){ return type;};

	CapitalShip(GameManager *manager)
		: Ship(0, 0,0, 0, manager){ cap_selected = 0;};
	CapitalShip(int _x, int _y, GameManager *manager)
		: Ship(500, 500, _x, _y, manager){};
	
	virtual float destroy_ship(){return 0;};
	virtual bool collision_update(Projectile* player_projectile){return true;};
	virtual bool collision_update_ship(Ship* player_ship){return true;};
};

#endif