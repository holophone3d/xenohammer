#ifndef BOSS_H
#define BOSS_H

#include "stdinclude.h"
#include "Ship.h"
#include "CapitalShip.h"
#include "explosionGenerator.h"
#include "ShipComponent.h"
//#include "FrigateAI.h"
#include "TurretAI.h"
#include "Weapon.h"

enum
{
	BOSS_WAITING,
	BOSS_ENTERING_SCREEN,
	BOSS_NORMAL,
	BOSS_MORPH1,
	BOSS_MORPH2,
	BOSS_FINAL
};

class Projectile;

class Boss: public CapitalShip
{
protected:
	ShipComponent *OuterNodes[4];
	ShipComponent *platforms[8];

	ShipComponent *Connectors[3];

	ShipComponent *OuterTurrets[8];
	GenericAI *OuterTurretAIs[8];

	ShipComponent *UTurrets[6];
	GenericAI *UTurretAIs[6];

	ShipComponent *bossShield;

	int nLastOrbUpdate;
	int nLastMove;




	void		FireTurret(ShipComponent *turretComponent, Weapon *turretWeapon);
	void		HandleEvents(void);

	// weapons
	Weapon *OuterTurretWeapons[8];
	Weapon *UTurretWeapons[6];



public:
	//Gotta have this out here for checking reasons.
	ShipComponent *OuterOrbs[4];
	ShipComponent *LeftU;
	ShipComponent *RightU;
	ShipComponent *CenterNode;
	ShipComponent *CenterOrb;
		int nState;

		int orbCount;
	Boss(GameManager *manager)
		: CapitalShip(manager){};
	Boss(int _x, int _y, GameManager *manager);
	virtual ~Boss();
	bool update();
	float destroy_ship(int _x, int _y);
	float destroy_orb(int _x, int _y);
	bool collision_update(Projectile* player_projectile);
	bool collision_update_ship(Ship* player_ship);
};

#endif
