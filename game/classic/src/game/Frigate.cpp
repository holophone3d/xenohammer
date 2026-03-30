#include "CapitalShip_Frigate.h"
#include "GameManager.h"
#include "PlayerShip.h"
#include "collision.h"
#include "Sound.h"
#include "enemyship.h"

#include <math.h>


Frigate::Frigate(int _x, int _y, GameManager *manager)
: CapitalShip( _x, _y, manager){
	
	ai = NULL;
	ai = new FrigateAI();
	
	type = FRIGATE;

	int Hp;

	if(manager->difficulty == 0)
		Hp = -200;
	else if(manager->difficulty == 1)
		Hp = 0;
	else if(manager->difficulty == 2)
		Hp = 200;
	else if(manager->difficulty == 3)
		Hp = 1000;


	this->template_copy( manager->CapShipBodyTemplate ); 
	

	CapShipNose = new ShipComponent(0, 112, true, 900,900+Hp, this, manager);
	CapShipNose->template_copy( manager->CapShipNoseTemplate );
	CapShipNose->set_curr_frame(0 );
	
	CapShipRt = new ShipComponent(-62, 5, true, 0,300+Hp, this, manager);
	CapShipRt->template_copy( manager->CapShipRtTemplate );
	CapShipRt->set_curr_frame(0 );
	CapShipRt->set_damageable(false);
	
	CapShipLt = new ShipComponent(62, 5, true, 0,300+Hp, this, manager);
	CapShipLt->template_copy( manager->CapShipLtTemplate );
	CapShipLt->set_curr_frame(0 );
	CapShipLt->set_damageable(false);
	
	CapShipRtTurret = new ShipComponent(-47, 37, true, 0,600+Hp, this, manager);
	CapShipRtTurret->template_copy( manager->GunTurretTemplate );
	CapShipRtTurret->set_curr_frame(0 );
	
	CapShipLtTurret = new ShipComponent(79, 37, true, 0,600+Hp, this, manager);
	CapShipLtTurret->template_copy( manager->GunTurretTemplate );
	CapShipLtTurret->set_curr_frame(0 );
	
	// create turret AI objects
	turret1_ai = new TurretAI(TURRETAI_TYPE_NORMAL, 3000);
	turret2_ai = new TurretAI(TURRETAI_TYPE_NORMAL, 3000);
	
	noseBlaster = new Weapon(0, ENEMYCANNON, 32, 212, manager, this);
	turret1 = new Weapon(0, ENEMYBLASTER, -31, 53, manager, this);
	turret2 = new Weapon(0, ENEMYBLASTER, 95, 53, manager, this);
	noseBlaster->WeaponPower->set_power_cell_2(8);
	turret1->WeaponPower->set_power_cell_2(4);
	turret2->WeaponPower->set_power_cell_2(4);
	
}

Frigate::~Frigate()
{
	if(ai) delete(ai);
	if(turret1_ai) delete(turret1_ai);
	if(turret2_ai) delete(turret2_ai);
	
	if(CapShipNose) delete(CapShipNose);
	if(CapShipRt) delete(CapShipRt);
	if(CapShipLt) delete(CapShipLt);
	if(CapShipRtTurret) delete(CapShipRtTurret);
	if(CapShipLtTurret) delete(CapShipLtTurret);
	if(noseBlaster) delete(noseBlaster);
	if(turret1) delete(turret1);
	if(turret2) delete(turret2);
}

bool Frigate::update()
{	
	
	int _x, _y;
	
	// run ai routines for turrets
	AI_THINK_RESULT result;
	
	_x = get_x()+16;
	_y = get_y()+16;
	
	
	
	// turret #1
	if(CapShipRtTurret->get_curr_frame() != CapShipRtTurret->get_num_frames() - 1)
	{
		// we're not dead yet
		result = turret1_ai->Think(manager->Fighter->get_x(),manager->Fighter->get_y(),
			CapShipRtTurret->get_x(),CapShipRtTurret->get_y(),CL_System::get_time());
		
		CapShipRtTurret->set_curr_frame(result.frame);
		if(result.bFire)
		{
			FireTurret1();
		}
	}
	// turret #2
	if(CapShipLtTurret->get_curr_frame() != CapShipLtTurret->get_num_frames() - 1)
	{
		// we're not dead yet
		result = turret2_ai->Think(manager->Fighter->get_x(),manager->Fighter->get_y(),
			CapShipLtTurret->get_x(),CapShipLtTurret->get_y(),CL_System::get_time());
		
		CapShipLtTurret->set_curr_frame(result.frame);
		if(result.bFire)
		{
			FireTurret2();
		}
	}
	
	// run our ai
	result = ai->Think(manager->Fighter->get_x(),manager->Fighter->get_y(),
		get_x(),get_y(),CL_System::get_time());
	
	set_velocity(result.xmov,result.ymov);
	if(result.bFire)
	{
		FireNose();
	}
	
	this->show();
	CapShipNose->update();
	CapShipLt->update();
	CapShipRt->update();
	CapShipRtTurret->update();
	CapShipLtTurret->update();
	
	//Hack to handle turrets and wings being damagable
	if( CapShipRtTurret->get_damageable() == false && CapShipRt->get_curr_frame() == 0  )
		CapShipRt->set_damageable( true );
	if( CapShipLtTurret->get_damageable() == false && CapShipLt->get_curr_frame() == 0 )
		CapShipLt->set_damageable( true );
	
	if(result.bRunAway == true && get_y() > 600)
		return false;
	
	
	//draw the frigate engines
	manager->make_CapShipEngine(this->get_x()+40, this->get_y(), 1.0f);
	
//	manager->ship_selected->put_screen(_x,_y);
	
	return true;
}	


//checks each component for collision
bool Frigate::collision_update(Projectile* player_projectile)
{
	bool retVal =false;
	
	if(CapShipNose->collision_update(player_projectile) == true)
		retVal =true;
	else if(CapShipRt->collision_update(player_projectile) == true)
		retVal =true;
	else if(CapShipLt->collision_update(player_projectile) == true)
		retVal =true;
	else if(CapShipRtTurret->collision_update(player_projectile) == true)
		retVal =true;
	else if(CapShipLtTurret->collision_update(player_projectile) == true)
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

//checks each component for collision with player ship
bool Frigate::collision_update_ship(Ship* player_ship)
{
	bool retVal =false;
	
	if(CapShipNose->collision_update(player_ship) == true)
		retVal =true;
	else if(CapShipRt->collision_update(player_ship) == true)
		retVal =true;
	else if(CapShipLt->collision_update(player_ship) == true)
		retVal =true;
	else if(CapShipRtTurret->collision_update(player_ship) == true)
		retVal =true;
	else if(CapShipLtTurret->collision_update(player_ship) == true)
		retVal =true;
	//check the if any of the player projectiles are hitting enemy ships
	else if( CollisionDetection::Sprite_Collide((player_ship), this) == 1)
	{
		//destory the ship -  mad damage is done
		player_ship->take_damage( 10000 );
		
		retVal = true;		
	}
	
	return retVal;
}


// generates explosions and returns percentage chance of a powerup
float Frigate::destroy_ship()
{
	float powerUpProb;
	Sound::playExplosionSound();
	
	
	explosionGenerator::MakeExplosions( x + 20,
		y  + 18,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x + 77,
		y + 18,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x + 45,
		y + 45,
		dx, dy, manager );
				
	explosionGenerator::MakeExplosions( x + width /2,
		y + 8,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x + 47,
		y + 91,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x + 46,
		y + 142,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x + 46,
		y + 110,
		dx, dy, manager );
	
	explosionGenerator::MakeExplosions( x -20,
		y + 50,
		dx, dy, manager );
	//components do not drop powerups
	powerUpProb = 0;
	
	return powerUpProb;
}

void Frigate::FireNose(void)
{
	if(CapShipNose->get_curr_frame() == CapShipNose->get_num_frames() - 1)
		return; // nose is dead, don't shoot
	noseBlaster->fire(get_x(),get_y(),0,FAI_MAX_SPEED);
	
}

void Frigate::FireTurret1(void)
{
	double rad;
	double x_off, y_off;
	
	rad = CapShipRtTurret->get_curr_frame();
	rad -= 8; // 0 is down, not right
	rad /= 32; // 32 frames per turret (plus the destroyed one)
	rad *= (2* 3.14159);
	
	x_off = cos(rad)*24;
	y_off = sin(rad)*-24;
	
	turret1->fire(get_x() + (int)x_off,get_y() + (int)y_off, x_off/2, y_off/2);
}

void Frigate::FireTurret2(void)
{
	double rad;
	double x_off, y_off;
	
	rad = CapShipLtTurret->get_curr_frame();
	rad -= 8;
	rad /= 32;
	rad *= (2* 3.14159);
	
	x_off = cos(rad)*24;
	y_off = sin(rad)*-24;
	
	turret2->fire(get_x() + (int)x_off,get_y() + (int)y_off, x_off/2, y_off/2);
}