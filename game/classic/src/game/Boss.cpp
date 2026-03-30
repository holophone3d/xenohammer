#include "Boss.h"
#include "GameManager.h"
#include "PlayerShip.h"
#include "collision.h"
#include "Sound.h"
#include "enemyship.h"

#include <math.h>

#define BOSS_WAIT	110000

#define NODE1_X		-213
#define NODE1_Y		111
#define NODE2_X		-65
#define NODE2_Y		259
#define NODE3_X		97	
#define NODE3_Y		259
#define NODE4_X		245
#define NODE4_Y		111

#define LEFTU_X		-94
#define LEFTU_Y		-68
#define RIGHTU_X	112
#define RIGHTU_Y	-65


Boss::Boss (int _x, int _y, GameManager *manager)
: CapitalShip( _x, _y, manager){
	/*ai = NULL;
	ai = new FrigateAI();*/

	int i;
	int Hp;

	if(manager->difficulty == 0)
		Hp = -200;
	else if(manager->difficulty == 1)
		Hp = 0;
	else if(manager->difficulty == 2)
		Hp = 200;
	else if(manager->difficulty == 3)
		Hp = 1000;

	orbCount = 4;
	type = BOSS;
	this->template_copy(manager->BossTemplate);

	CenterNode = new ShipComponent(0,0,true, 1000+Hp, 1000+Hp, this, manager);
	CenterNode->template_copy( manager->CenterNodeTemplate);
	CenterNode->set_curr_frame(0);
	CenterNode->isCenterNode = true;

	// construct the U things
	LeftU = new ShipComponent(LEFTU_X - 80, LEFTU_Y - 336, false, 500+Hp, 500+Hp, this, manager);
	LeftU->add_frame("Game/Graphics/bossul");
	LeftU->set_curr_frame(0);

	RightU = new ShipComponent(RIGHTU_X + 80, RIGHTU_Y - 336, false, 500+Hp, 500+Hp, this, manager);
	RightU->add_frame("Game/Graphics/bossur");
	RightU->set_curr_frame(0);

	// construct outer nodes

	OuterNodes[0] = new ShipComponent(NODE1_X,NODE1_Y, true, 500000, 500000, this, manager);
	OuterNodes[0]->template_copy( manager->OuterNodeTemplate );
	OuterNodes[0]->set_curr_frame(0);
	OuterNodes[1] = new ShipComponent(NODE2_X,NODE2_Y, true, 500000, 500000, this, manager);
	OuterNodes[1]->template_copy( manager->OuterNodeTemplate );
	OuterNodes[1]->set_curr_frame(0);
	OuterNodes[2] = new ShipComponent(NODE3_X,NODE3_Y, true, 500000, 500000, this, manager);
	OuterNodes[2]->template_copy( manager->OuterNodeTemplate );
	OuterNodes[2]->set_curr_frame(0);
	OuterNodes[3] = new ShipComponent(NODE4_X,NODE4_Y, true, 500000, 500000, this, manager);
	OuterNodes[3]->template_copy( manager->OuterNodeTemplate );
	OuterNodes[3]->set_curr_frame(0);

	// platforms
	platforms[0] = new ShipComponent(NODE1_X - 51, NODE1_Y + 23, false, 10, 10, this, manager);
	platforms[0]->template_copy(manager->PlatformLTemplate);
	platforms[0]->set_curr_frame(0);
	platforms[1] = new ShipComponent(NODE2_X - 51, NODE2_Y + 23, false, 10, 10, this, manager);
	platforms[1]->template_copy(manager->PlatformLTemplate);
	platforms[1]->set_curr_frame(0);

	platforms[2] = new ShipComponent(NODE3_X +101, NODE3_Y + 24, false, 10, 10, this, manager);
	platforms[2]->template_copy(manager->PlatformRTemplate);
	platforms[2]->set_curr_frame(0);
	platforms[3] = new ShipComponent(NODE4_X +101, NODE4_Y + 24, false, 10, 10, this, manager);
	platforms[3]->template_copy(manager->PlatformRTemplate);
	platforms[3]->set_curr_frame(0);

	platforms[4] = new ShipComponent(NODE1_X + 25, NODE1_Y + 100, false, 10, 10, this, manager);
	platforms[4]->template_copy(manager->PlatformDTemplate);
	platforms[4]->set_curr_frame(0);
	platforms[5] = new ShipComponent(NODE2_X + 25, NODE2_Y + 100, false, 10, 10, this, manager);
	platforms[5]->template_copy(manager->PlatformDTemplate);
	platforms[5]->set_curr_frame(0);
	platforms[6] = new ShipComponent(NODE3_X + 25, NODE3_Y + 100, false, 10, 10, this, manager);
	platforms[6]->template_copy(manager->PlatformDTemplate);
	platforms[6]->set_curr_frame(0);
	platforms[7] = new ShipComponent(NODE4_X + 25, NODE4_Y + 100, false, 10, 10, this, manager);
	platforms[7]->template_copy(manager->PlatformDTemplate);
	platforms[7]->set_curr_frame(0);

	// orbs
	CenterOrb = new ShipComponent(48, 48, false, 1000+Hp, 1000+Hp, this, manager);
	CenterOrb->template_copy(manager->OrbTemplate);
	CenterOrb->set_curr_frame(0);

	OuterOrbs[0] = new ShipComponent(NODE1_X + 32, NODE1_Y + 31, true, 500+Hp, 500+Hp, this, manager);
	OuterOrbs[0]->template_copy(manager->OrbTemplate);
	OuterOrbs[0]->set_curr_frame(5);
	OuterOrbs[1] = new ShipComponent(NODE2_X + 32, NODE2_Y + 31, true, 500+Hp, 500+Hp, this, manager);
	OuterOrbs[1]->template_copy(manager->OrbTemplate);
	OuterOrbs[1]->set_curr_frame(25);
	OuterOrbs[2] = new ShipComponent(NODE3_X + 32, NODE3_Y + 31, true, 500+Hp, 500+Hp, this, manager);
	OuterOrbs[2]->template_copy(manager->OrbTemplate);
	OuterOrbs[2]->set_curr_frame(10);
	OuterOrbs[3] = new ShipComponent(NODE4_X + 32, NODE4_Y + 31, true, 500+Hp, 500+Hp, this, manager);
	OuterOrbs[3]->template_copy(manager->OrbTemplate);
	OuterOrbs[3]->set_curr_frame(15);

	// turrets
	OuterTurrets[0] = new ShipComponent(NODE1_X - 51 + 8, NODE1_Y + 23 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[0]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[0]->set_curr_frame(0);
	OuterTurrets[1] = new ShipComponent(NODE2_X - 51 + 8, NODE2_Y + 23 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[1]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[1]->set_curr_frame(0);

	OuterTurrets[2] = new ShipComponent(NODE3_X +101 + 8, NODE3_Y + 24 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[2]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[2]->set_curr_frame(0);
	OuterTurrets[3] = new ShipComponent(NODE4_X +101 + 8, NODE4_Y + 24 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[3]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[3]->set_curr_frame(0);

	OuterTurrets[4] = new ShipComponent(NODE1_X + 25 + 8, NODE1_Y + 100 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[4]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[4]->set_curr_frame(0);
	OuterTurrets[5] = new ShipComponent(NODE2_X + 25 + 8, NODE2_Y + 100 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[5]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[5]->set_curr_frame(0);
	OuterTurrets[6] = new ShipComponent(NODE3_X + 25 + 8, NODE3_Y + 100 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[6]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[6]->set_curr_frame(0);
	OuterTurrets[7] = new ShipComponent(NODE4_X + 25 + 8, NODE4_Y + 100 + 8, true, 0, 600+Hp, this, manager);
	OuterTurrets[7]->template_copy(manager->GunTurretTemplate);
	OuterTurrets[7]->set_curr_frame(0);

	OuterTurretAIs[0] = new TurretAI(TURRETAI_TYPE_SWEEPING, 60);
	OuterTurretAIs[1] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	OuterTurretAIs[2] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	OuterTurretAIs[3] = new TurretAI(TURRETAI_TYPE_SWEEPING, 60);
	OuterTurretAIs[4] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	OuterTurretAIs[5] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	OuterTurretAIs[6] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	OuterTurretAIs[7] = new TurretAI(TURRETAI_TYPE_RANDOM, 2000);
	for(i=0;i<8;i++)
	{
		OuterTurretWeapons[i] = new Weapon(0, ENEMYBLASTER,
			OuterTurrets[i]->get_x_offset() + 16, 
			OuterTurrets[i]->get_y_offset() + 16,
			manager, this);
		OuterTurretWeapons[i]->WeaponPower->set_power_cell_2(4);
	}

	// U Turrets
	UTurrets[0] = new ShipComponent(LEFTU_X - 80 + 46, LEFTU_Y - 336 + 214, true, 0, 600+Hp, this, manager);
	UTurrets[0]->template_copy(manager->GunTurretTemplate);
	UTurrets[0]->set_curr_frame(0);
	UTurrets[1] = new ShipComponent(LEFTU_X - 80 + 15, LEFTU_Y - 336 + 173, true, 0, 600+Hp, this, manager);
	UTurrets[1]->template_copy(manager->GunTurretTemplate);
	UTurrets[1]->set_curr_frame(0);
	UTurrets[2] = new ShipComponent(LEFTU_X - 80 + 15, LEFTU_Y - 336 + 122, true, 0, 600+Hp, this, manager);
	UTurrets[2]->template_copy(manager->GunTurretTemplate);
	UTurrets[2]->set_curr_frame(0);

	UTurrets[3] = new ShipComponent(RIGHTU_X + 80 + 32, RIGHTU_Y - 336 + 212, true, 0, 600+Hp, this, manager);
	UTurrets[3]->template_copy(manager->GunTurretTemplate);
	UTurrets[3]->set_curr_frame(0);
	UTurrets[4] = new ShipComponent(RIGHTU_X + 80 + 60, RIGHTU_Y - 336 + 171, true, 0, 600+Hp, this, manager);
	UTurrets[4]->template_copy(manager->GunTurretTemplate);
	UTurrets[4]->set_curr_frame(0);
	UTurrets[5] = new ShipComponent(RIGHTU_X + 80 + 60, RIGHTU_Y - 336 + 120, true, 0, 600+Hp, this, manager);
	UTurrets[5]->template_copy(manager->GunTurretTemplate);
	UTurrets[5]->set_curr_frame(0);
	for(i=0;i<6;i++)
	{
		if(i < 3)
		{
			UTurretWeapons[i] = new Weapon(0, ENEMYBLASTER,
				UTurrets[i]->get_x_offset() + 16 + 80, 
				UTurrets[i]->get_y_offset() + 16 + 336,
				manager, this);
		}
		else
		{
			UTurretWeapons[i] = new Weapon(0, ENEMYBLASTER,
				UTurrets[i]->get_x_offset() + 16 - 80, 
				UTurrets[i]->get_y_offset() + 16 + 336,
				manager, this);
		}
		UTurretWeapons[i]->WeaponPower->set_power_cell_2(4);
	}

	UTurretAIs[0] = new TurretAI(TURRETAI_TYPE_SWEEPING, 30);
	UTurretAIs[1] = new TurretAI(TURRETAI_TYPE_NORMAL, 500);
	UTurretAIs[2] = new TurretAI(TURRETAI_TYPE_SWEEPING, 60);
	UTurretAIs[3] = new TurretAI(TURRETAI_TYPE_SWEEPING, 30);
	UTurretAIs[4] = new TurretAI(TURRETAI_TYPE_NORMAL, 500);
	UTurretAIs[5] = new TurretAI(TURRETAI_TYPE_SWEEPING, 60);

	// Create "connectors"
	Connectors[0] = new ShipComponent(
		(NODE1_X + NODE2_X) / 2,
		(NODE1_Y + NODE2_Y) / 2,
		false, 10000, 10000, this, manager);
	Connectors[0]->add_frame("Game/Graphics/connectorul");
	Connectors[0]->set_curr_frame(0);
	Connectors[0]->set_damageable( true );

	Connectors[1] = new ShipComponent(
		(NODE2_X + NODE3_X) / 2 + 64 - 32,
		(NODE2_Y + NODE3_Y) / 2 + 48,
		false, 10000, 10000, this, manager);
	Connectors[1]->add_frame("Game/Graphics/connectorh");
	Connectors[1]->set_curr_frame(0);
	Connectors[1]->set_damageable( true );

	Connectors[2] = new ShipComponent(
		(NODE3_X + NODE4_X) / 2,
		(NODE3_Y + NODE4_Y) / 2,
		false, 10000, 10000, this, manager);
	Connectors[2]->add_frame("Game/Graphics/connectorur");
	Connectors[2]->set_curr_frame(0);
	Connectors[2]->set_damageable( true );

	//boss shield
	bossShield = new ShipComponent(
		-48,
		-48,
		false, 50000, 50000, this, manager);
	bossShield->add_frame("Game/Graphics/bossShield");
	bossShield->set_curr_frame(0);
	bossShield->set_damageable(true);


	// other random stuff
	nLastOrbUpdate = CL_System::get_time();
	nLastMove = nLastOrbUpdate;
	nState = BOSS_WAITING;


	
}

Boss::~Boss()
{
	int i;
	/*if(ai) delete(ai);
	if(turret1_ai) delete(turret1_ai);
	if(turret2_ai) delete(turret2_ai);*/

	for(i=0;i<4;i++)
	{
		if(OuterOrbs[i])
			delete(OuterOrbs[i]);
		if(OuterNodes[i])
			delete(OuterNodes[i]);
	}
	for(i=0;i<8;i++)
	{
		if(platforms[i])
			delete(platforms[i]);
		if(OuterTurrets[i])
			delete(OuterTurrets[i]);
		if(OuterTurretAIs[i])
			delete(OuterTurretAIs[i]);
		if(OuterTurretWeapons[i])
			delete(OuterTurretWeapons[i]);
	}

	for(i=0;i<6;i++)
	{
		if(UTurrets[i]) delete(UTurrets[i]);
		if(UTurretAIs[i]) delete(UTurretAIs[i]);
		if(UTurretWeapons[i]) delete(UTurretWeapons[i]);
	}

	for(i=0;i<3;i++)
		if(Connectors[i]) delete(Connectors[i]);
	
	if(CenterOrb) delete(CenterOrb);
	if(CenterNode) delete(CenterNode);

	if(LeftU) delete(LeftU);
	if(RightU) delete(RightU);

}

bool Boss::update()
{	
	
	int i, tic;

	tic = CL_System::get_time();

	HandleEvents();

	// animate orbs
	if(tic - nLastOrbUpdate >= 60)
	{
		nLastOrbUpdate += 60;
		for(i=0;i<4;i++)
		{
			if(OuterOrbs[i] != NULL &&
				OuterOrbs[i]->get_curr_frame() != OuterOrbs[i]->get_num_frames() - 1)
				OuterOrbs[i]->set_curr_frame((OuterOrbs[i]->get_curr_frame() + 1) % 32);
		}
		if(CenterOrb != NULL &&
			CenterOrb->get_curr_frame() != CenterOrb->get_num_frames() - 1)
			CenterOrb->set_curr_frame((CenterOrb->get_curr_frame() + 1) % 32);
	}

	// run AI for outer turrets
	AI_THINK_RESULT result;
	
	if(nState != BOSS_ENTERING_SCREEN && nState != BOSS_WAITING)
	{
		for(i=0;i<8;i++)
		{
			if(OuterTurrets[i] != NULL &&
				OuterTurrets[i]->get_curr_frame() != OuterTurrets[i]->get_num_frames() - 1)
			{
				result = OuterTurretAIs[i]->Think(manager->Fighter->get_x(),
					manager->Fighter->get_y(), OuterTurrets[i]->get_x(),
					OuterTurrets[i]->get_y(), CL_System::get_time());
				OuterTurrets[i]->set_curr_frame(result.frame);
				if(result.bFire)
				{
					FireTurret(OuterTurrets[i],OuterTurretWeapons[i]);
				}
			}
		}
	}

	// run AI for U turrets
	if(nState == BOSS_FINAL)
	{
		for(i=0;i<6;i++)
		{
			if(UTurrets[i] != NULL &&
				UTurrets[i]->get_curr_frame() != UTurrets[i]->get_num_frames() - 1)
			{
				result = UTurretAIs[i]->Think(manager->Fighter->get_x(),
					manager->Fighter->get_y(), UTurrets[i]->get_x(),
					UTurrets[i]->get_y(), CL_System::get_time());
				UTurrets[i]->set_curr_frame(result.frame);
				if(result.bFire)
				{
					FireTurret(UTurrets[i],UTurretWeapons[i]);
				}
			}
		}
	}
	if(this->get_visible() == 1)
	{
		//this->show();
		if(CenterNode != NULL) CenterNode->update();
		if(CenterOrb != NULL) CenterOrb->update();
		for(i=0;i<4;i++)
		{
			if(OuterNodes[i] != NULL) OuterNodes[i]->update();
			if(OuterOrbs[i] != NULL) OuterOrbs[i]->update();
		}
		if(LeftU != NULL) LeftU->update();
		if(RightU != NULL) RightU->update();
		for(i=0;i<8;i++)
		{
			if(platforms[i] != NULL) platforms[i]->update();
			if(OuterTurrets[i] != NULL) OuterTurrets[i]->update();
		}
		for(i=0;i<6;i++)
		{
			if(UTurrets[i] != NULL) UTurrets[i]->update();
		}
		for(i=0;i<3;i++)
		{
			if(Connectors[i] != NULL) Connectors[i]->update();
		}
		
		if(bossShield != NULL) 
			bossShield->update();
	}	
	if( orbCount == 0)
	{
		delete bossShield;
		bossShield = NULL;
		orbCount--; // Make sure we don't delete again
	}

	//HANDLE DESTRUCITON OF THE FINAL ORB
	if( CenterOrb->get_is_destroyed() == true && manager->bossDestroyTime == 0)
	{	
		manager->bossDestroyed = true;
		manager->bossDestroyTime = CL_System::get_time() + 11000; 
		for(i=0; i < 6;i++)
		{
			UTurrets[i]->set_damageable(false);
			UTurrets[i]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1); 
			explosionGenerator::MakeExplosions( UTurrets[i]->get_x() + 32,
			UTurrets[i]->get_y() + 32,
			0, 0, manager );
	
		}
		
		
	}		
	
	
	//Handle component destruction
	for(i=0;i<4;i++)
	{
	 
		if(OuterOrbs[i]->get_is_destroyed() == true && OuterOrbs[i]->get_visible() == 1)
		{
			OuterOrbs[i]->set_visible( false );
			OuterNodes[i]->set_visible( false ); 
			switch(i)
			{ 
			case 0: //Left platform orb is destroyed
				OuterTurrets[0]->set_visible(false);
				OuterTurrets[4]->set_visible(false);
				OuterTurrets[0]->set_damageable(false);
				OuterTurrets[4]->set_damageable(false);
				OuterTurrets[0]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1); 
				OuterTurrets[4]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1);
				Connectors[0]->set_visible(false);
				Connectors[0]->set_damageable(false);
				platforms[0]->set_visible(false);
				platforms[4]->set_visible(false);
				orbCount--;
				destroy_ship(OuterNodes[i]->x,OuterNodes[i]->y);
				break;
			case 1: //left middle platform orb is destroyed
				OuterTurrets[1]->set_visible(false);
				OuterTurrets[5]->set_visible(false);
				OuterTurrets[1]->set_damageable(false);
				OuterTurrets[5]->set_damageable(false);
				OuterTurrets[1]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1); 
				OuterTurrets[5]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1);
				Connectors[0]->set_visible(false);
				Connectors[0]->set_damageable(false);
				Connectors[1]->set_visible(false);
				Connectors[1]->set_damageable(false);
				platforms[1]->set_visible(false);
				platforms[5]->set_visible(false);
				orbCount--;
				destroy_ship(OuterNodes[i]->x,OuterNodes[i]->y);
				break;
			case 2: //right middle platform orb is destroyed
				OuterTurrets[2]->set_visible(false);
				OuterTurrets[6]->set_visible(false);
				OuterTurrets[2]->set_damageable(false);
				OuterTurrets[6]->set_damageable(false);
				OuterTurrets[2]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1); 
				OuterTurrets[6]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1);
				Connectors[1]->set_visible(false);
				Connectors[1]->set_damageable(false);
				Connectors[2]->set_visible(false);
				Connectors[2]->set_damageable(false);
				platforms[2]->set_visible(false);
				platforms[6]->set_visible(false);
				orbCount--;
				destroy_ship(OuterNodes[i]->x,OuterNodes[i]->y);
				break;
			case 3: //right platform orb is destroyed
				OuterTurrets[3]->set_visible(false);
				OuterTurrets[7]->set_visible(false);
				OuterTurrets[3]->set_damageable(false);
				OuterTurrets[7]->set_damageable(false);
				OuterTurrets[3]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1); 
				OuterTurrets[7]->set_curr_frame(OuterTurrets[i]->get_num_frames() - 1);
				Connectors[2]->set_visible(false);
				Connectors[2]->set_damageable(false);
				platforms[3]->set_visible(false);
				platforms[7]->set_visible(false);
				orbCount--;
				destroy_ship(OuterNodes[i]->x,OuterNodes[i]->y);
				break;
			}
		}	
	}		

	return true;
}	


//checks each component for collision
bool Boss::collision_update(Projectile* player_projectile)
{
	int i;
	
	if(CenterOrb != NULL && CenterOrb->collision_update(player_projectile) == true)
		return true;

	if(CenterNode != NULL && CenterNode->collision_update(player_projectile) == true)
		return true;

	for(i=0;i<4;i++)
	{
		if(OuterOrbs[i] != NULL && OuterOrbs[i]->collision_update(player_projectile) == true)
			return true;
	}

	for(i=0;i<8;i++)
	{
		if(OuterTurrets[i] != NULL && OuterTurrets[i]->collision_update(player_projectile) == true)
			return true;
	}

	for(i=0;i<3;i++)
	{
		if(Connectors[i] != NULL && Connectors[i]->collision_update(player_projectile) == true)
			return true;
	}


	for(i=0;i<6;i++)
	{
		if(UTurrets[i] != NULL && UTurrets[i]->collision_update(player_projectile) == true)
			return true;
	}
	
	if(bossShield != NULL && bossShield->collision_update(player_projectile) == true)
	return true;

	return false;
}

//checks each component for collision with player ship
bool Boss::collision_update_ship(Ship* player_ship)
{
	bool retVal =false;
	int i;

	if(CenterNode != NULL && CenterNode->collision_update(player_ship) == true)
		return true;

	for(i=0;i<4;i++)
	{
		if(OuterNodes[i] != NULL && OuterNodes[i]->collision_update(player_ship) == true)
			return true;
	}
	
	if(LeftU != NULL && LeftU->collision_update(player_ship) == true) return true;
	if(RightU != NULL && RightU->collision_update(player_ship) == true) return true;
	
	
	for(i=0;i<3;i++)
	{
		if(Connectors[i] != NULL && Connectors[i]->collision_update(player_ship) == true)
			return true;
	}

	if(bossShield != NULL && bossShield->collision_update(player_ship) == true)
	return true;

	return false;
}


// generates explosions and returns percentage chance of a powerup
float Boss::destroy_ship(int _x, int _y)
{
	float powerUpProb;
	Sound::playExplosionSound();
	
	
	
	explosionGenerator::MakeExplosions( _x + 32,
		_y  + 32,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( _x + 32,
		_y + 96,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( _x + 96,
		_y + 32,
		dx, dy, manager );
				
	explosionGenerator::MakeExplosions( _x + 96,
		_y + 96,
		dx, dy, manager );

	explosionGenerator::MakeExplosions( _x + 62,
		_y  + 32,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( _x + 62,
		_y + 96,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( _x + 96,
		_y + 62,
		dx, dy, manager );
				
	explosionGenerator::MakeExplosions( _x + 32,
		_y + 62,
		dx, dy, manager );

	explosionGenerator::MakeExplosions( _x + 62,
		_y + 62,
		dx, dy, manager );
	
	
	//components do not drop powerups
	powerUpProb = 0;
	
	return powerUpProb;
}

float Boss::destroy_orb(int _x, int _y)
{
	float powerUpProb;
	Sound::playExplosionSound();
	
	
	
	explosionGenerator::MakeExplosions( _x + 32,
		_y  + 32,
		dx, dy, manager );
	

	
	explosionGenerator::MakeExplosions( _x + 96,
		_y + 32,
		dx, dy, manager );
				


	explosionGenerator::MakeExplosions( _x + 62,
		_y  + 32,
		dx, dy, manager );
	

	
	explosionGenerator::MakeExplosions( _x + 96,
		_y + 62,
		dx, dy, manager );
				
	explosionGenerator::MakeExplosions( _x + 32,
		_y + 62,
		dx, dy, manager );

	
	
	//components do not drop powerups
	powerUpProb = 0;
	
	return powerUpProb;
}


void Boss::FireTurret(ShipComponent *turretComponent, Weapon *turretWeapon)
{
	double rad;
	double x_off, y_off;
	
	rad = turretComponent->get_curr_frame();
	rad -= 8; // 0 is down, not right
	rad /= 32; // 32 frames per turret (plus the destroyed one)
	rad *= (2* 3.14159);
	
	x_off = cos(rad)*24;
	y_off = sin(rad)*-24;
	
	turretWeapon->fire(get_x() + (int)x_off,get_y() + (int)y_off, x_off/2, y_off/2);
}


void Boss::HandleEvents(void)
{
	int tic,i;

	tic = CL_System::get_time();

	// wait
	if(nState == BOSS_WAITING)
	{
		if((tic - nLastMove >= BOSS_WAIT - 14000) && (manager->bossMusicPlayed == false))
		{
			manager->bossMusicPlayed = true;
			Sound::playBossNear();
			Sound::playBossBackgroundMusic();
		}

		if(tic - nLastMove >= BOSS_WAIT){
			nState = BOSS_ENTERING_SCREEN;
			
		}
		return;
	}

	// event #1: move onto the screen
	if(get_y() < -50)
	{
		if(tic - nLastMove >= 100)
		{
			nLastMove -= 100;
			y++;
			if(y == -50)
				nState = BOSS_NORMAL;
		}
	}

	// event #2: move U thing forward
	if(nState == BOSS_MORPH1)
	{
		if(tic - nLastMove >= 100)
		{
			// move U down
			nLastMove -= 100;
			LeftU->set_y_offset(LeftU->get_y_offset() + 1);
			RightU->set_y_offset(RightU->get_y_offset() + 1);
			for(i=0;i<6;i++)
				UTurrets[i]->set_y_offset(UTurrets[i]->get_y_offset() + 1);
		}
		
		if(LeftU->get_y_offset() == LEFTU_Y - 80)
			nState = BOSS_MORPH2;
	}
	else
	{
		if(nState == BOSS_MORPH2)
		{
			if(tic - nLastMove >= 100)
			{
				nLastMove -= 100;
				LeftU->set_y_offset(LeftU->get_y_offset() + 1);
				LeftU->set_x_offset(LeftU->get_x_offset() + 1);
				RightU->set_y_offset(RightU->get_y_offset() + 1);
				RightU->set_x_offset(RightU->get_x_offset() - 1);
				for(i=0;i<6;i++)
				{
					UTurrets[i]->set_y_offset(UTurrets[i]->get_y_offset() + 1);
					if(i < 3)
						UTurrets[i]->set_x_offset(UTurrets[i]->get_x_offset() + 1);
					else
						UTurrets[i]->set_x_offset(UTurrets[i]->get_x_offset() - 1);
				}
					
			}
			if(LeftU->get_y_offset() == LEFTU_Y)
			{
				nState = BOSS_FINAL;
				CenterNode->set_damageable(true);
				CenterOrb->set_damageable(true);
			}
		}
	}


	// if the 4 outer nodes are destroyed then we move to morph 1 stage
	if(nState == BOSS_NORMAL &&
		OuterOrbs[0]->get_curr_frame() == OuterOrbs[0]->get_num_frames() - 1 &&
		OuterOrbs[1]->get_curr_frame() == OuterOrbs[1]->get_num_frames() - 1 &&
		OuterOrbs[2]->get_curr_frame() == OuterOrbs[2]->get_num_frames() - 1 &&
		OuterOrbs[3]->get_curr_frame() == OuterOrbs[3]->get_num_frames() - 1)
	{
		nState = BOSS_MORPH1;
		nLastMove = tic;
	}


}