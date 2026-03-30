#ifndef CAPITALSHIP_FRIGATE_H
#define CAPITALSHIP_FRIGATE_H

#include "stdinclude.h"
#include "Ship.h"
#include "CapitalShip.h"
#include "explosionGenerator.h"
#include "ShipComponent.h"
#include "FrigateAI.h"
#include "TurretAI.h"
#include "Weapon.h"

class Projectile;

class Frigate: public CapitalShip
{
protected:
	ShipComponent *CapShipNose;
	ShipComponent *CapShipRt;
	ShipComponent *CapShipLt;
	ShipComponent *CapShipLtTurret;
	ShipComponent *CapShipRtTurret;
	GenericAI *ai; // generic AI pointer

	// weapons
	Weapon *noseBlaster;
	Weapon *turret1;
	Weapon *turret2;

	// hold onto a couple turret AIs
	GenericAI *turret1_ai, *turret2_ai;

	void FireTurret1(void);
	void FireTurret2(void);
	void FireNose(void);

public:
	Frigate(GameManager *manager)
		: CapitalShip(manager){};
	Frigate(int _x, int _y, GameManager *manager);
	virtual ~Frigate();
	bool update();
	float destroy_ship();
	bool collision_update(Projectile* player_projectile);
	bool collision_update_ship(Ship* player_ship);
};

#endif