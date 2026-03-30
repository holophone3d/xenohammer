#ifndef SHIPCOMPONENT_H
#define SHIPCOMPONENT_H

#include "stdinclude.h"
#include "Ship.h"

class Projectile;

class ShipComponent: public Ship
{
protected:

	int x_offset;
	int y_offset;
	Ship* parent;

public:
	ShipComponent(int _x_offset, int _y_offset, bool _damageable, int _shields, int _armor, Ship *_parent, GameManager *manager)
		: Ship(_shields, _armor, 0, 0, manager)
	{

		//set up the parent
		parent = _parent;

		//setup the offset
		x_offset = _x_offset;
		y_offset = _y_offset;

		//setup its screen location
		x = parent->get_x() + x_offset;
		y = parent->get_y() + y_offset;

		//determine if the component is destroyable
		damageable = _damageable;

		//only one case where we are the center node
		isCenterNode = false;
	};
	bool isCenterNode; // special case for blowing up the center node
	bool update();
	float destroy_ship();
	bool collision_update(Projectile* player_projectile);
	bool collision_update(Ship* player_ship);
	int get_x_offset(void) { return x_offset; }
	int get_y_offset(void) { return y_offset; }
	void set_x_offset(int _x_offset) { x_offset = _x_offset; }
	void set_y_offset(int _y_offset) { y_offset = _y_offset; }

};
#endif