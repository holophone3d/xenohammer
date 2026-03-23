#include "ShipComponent.h"
#include "CapitalShip.h"
#include "GameManager.h"
#include "explosionGenerator.h"
#include "projectile.h"
#include "Collision.h"
#include "Sound.h"

// generates explosions and returns percentage chance of a powerup
float ShipComponent::destroy_ship()
{
	float powerUpProb;
	Sound::playExplosionSound();
	if( isCenterNode == false){
		explosionGenerator::MakeExplosions( x + width /2,
			y + height /2,
			dx, dy, manager );
	}
	else
	{
		explosionGenerator::MakeExplosions( x + 12,
			y + 79,
			0, 0, manager );
		explosionGenerator::MakeExplosions( x + 146,
			y + 85,
			0, 0, manager );
		explosionGenerator::MakeExplosions( x + 124,
			y + 132,
			0, 0, manager );
		explosionGenerator::MakeExplosions( x + 32,
			y + 139,
			0, 0, manager );
		explosionGenerator::MakeExplosions( x + 81,
			y + 146,
			0, 0, manager );
	}
	//components do not drop powerups
	powerUpProb = 0;
	is_destroyed = true;
	
	return powerUpProb;
}

bool ShipComponent::collision_update(Projectile* player_projectile)
{
	//check the if any of the player projectiles are hitting enemy ships
	if( CollisionDetection::Sprite_Collide((player_projectile), this) == 1)
	{
		//check to see if we destroy the ship
		if( (this)->take_damage( (player_projectile)->get_damage() ) == true)
		{
			destroy_ship();
			damageable = false;
			
			//update to destroyed frame
			curr_frame = num_frames - 1;
			
		}
		
		return true;
	}
	else
		return false;
	
}

bool ShipComponent::collision_update(Ship* player_ship)
{
	bool retVal = false;
	if( visible )
	{
		//check the if any of the player projectiles are hitting enemy ships
		if( CollisionDetection::Sprite_Collide((player_ship), this) == 1)
		{
			//destory the ship -  mad damage is done
			player_ship->take_damage( 10000 );
			
			retVal = true;
		}
	}
	return retVal;
}



bool ShipComponent::update()
{	
	//update its screen location
	x = parent->get_x() + x_offset;
	y = parent->get_y() + y_offset;
	
	
	this->show();
	return true;
	
	
}


