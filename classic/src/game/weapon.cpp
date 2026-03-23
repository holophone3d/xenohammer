#include "weapon.h"
#include "GameManager.h"
#include "Ship.h"
#include "Sound.h"


Weapon::Weapon(int _angle, int _type, int _offset_x, int _offset_y, GameManager *_manager, Ship* _myShip)
	{
		type = _type;
		offset_x = _offset_x;
		offset_y = _offset_y;
		manager = _manager;
		angle = _angle;
		myShip = _myShip;
	
		WeaponPower = new PowerPlant(1,1);

		time_last_fired = CL_System::get_time();
		

		/*
		if( type == BLASTER ){
			template_projectile = new Projectile(0,angle, 1, 0, 0, manager);
			template_projectile->add_frame("Game/Graphics/EnergyBlast");
		}
		else if( type == TURRET  ){
			template_projectile = new Projectile(0,angle, 2, 0, 0, manager);
			template_projectile->add_frame("Game/Graphics/EnergyBullet");
		}
		else if( type == MISSLE  ){
			template_projectile = new Projectile(0,angle, 3, 0, 0, manager);
			template_projectile->add_frame("Game/Graphics/EnergyMissle0");
		}
		else if( type == ENEMYBLASTER  ){
			template_projectile = new Projectile(0,angle, 4, 0, 0, manager);
			template_projectile->add_frame("Game/Graphics/EnergyMissle0");
	
	}
		*/
}
void Weapon::show()
{

}

void Weapon::fire(int _x, int _y)
	{
		int fire_x, fire_y; //where the blast shoots
		int weaponDamage =0;
	
		if(ready_to_fire() == true){

			weaponDamage = get_weapon_damage(); 
			fire_x = _x + offset_x;
			fire_y = _y + offset_y; 
			
			// build the projectile information based off of the templates 
			if( type == ENEMYBLASTER ){
				int tmp_dx, tmp_dy;
 				myShip->get_velocity( &tmp_dx, &tmp_dy);

				Sound::playEnemyLightFighterFire();

				manager->enemy_projectiles.push_back(new Projectile(weaponDamage, angle, type, fire_x, fire_y, manager, tmp_dx, tmp_dy ));
				manager->enemy_projectiles.back()->template_copy( manager->enemyFireTemplate ); 
				manager->enemy_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
				
			}
			if( type == ENEMYCANNON ){
				int tmp_dx, tmp_dy;
				myShip->get_velocity( &tmp_dx, &tmp_dy);

				//set volumes for sounds
				//float vol;
				//vol = (manager->sfx_enemyGunShipFire->get_volume())/2;
				//manager->sfx_enemyGunShipFire->set_volume(vol);

				Sound::playEnemyGunShipFire();
				
				 
				// the dx and dy aren't really needed since the speed of the projectile is set
				manager->enemy_projectiles.push_back(new Projectile(weaponDamage, angle, type, fire_x, fire_y, manager, tmp_dx, tmp_dy ));
				manager->enemy_projectiles.back()->template_copy( manager->enemyFireTemplate ); 
				manager->enemy_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
				
			}

			else if( type == BLASTER ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->blasterTemplate ); 
				manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
			}
			else if( type == TURRET ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->turretTemplate ); 
					manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1  );
			}
			else if( type == MISSLE  ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->missleTemplate );
				manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() - 1);
				if(manager->player_projectiles.back()->isHoming)
					manager->player_projectiles.back()->target = manager->select_target();
			}

		}


	}

void Weapon::fire(int _x, int _y, int _dx, int _dy)
	{
		int fire_x, fire_y; //where the blast shoots
		int weaponDamage =0;
	
		if(ready_to_fire() == true){

			weaponDamage = get_weapon_damage(); 
			fire_x = _x + offset_x;
			fire_y = _y + offset_y; 
			
			// build the projectile information based off of the templates 
			if( type == ENEMYBLASTER ){

				Sound::playEnemyLightFighterFire();

				manager->enemy_projectiles.push_back(new Projectile(weaponDamage, angle, type, fire_x, fire_y, manager, _dx, _dy ));
				manager->enemy_projectiles.back()->template_copy( manager->enemyFireTemplate ); 
				manager->enemy_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
				
			}
			if( type == ENEMYCANNON ){

				//set volumes for sounds
				//float vol;
				//vol = (manager->sfx_enemyGunShipFire->get_volume())/2;
				//manager->sfx_enemyGunShipFire->set_volume(vol);

				Sound::playEnemyGunShipFire();
				 
				// the dx and dy aren't really needed since the speed of the projectile is set
				manager->enemy_projectiles.push_back(new Projectile(weaponDamage, angle, type, fire_x, fire_y, manager, _dx, _dy ));
				manager->enemy_projectiles.back()->template_copy( manager->enemyFireTemplate ); 
				manager->enemy_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
				
			}

			else if( type == BLASTER ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->blasterTemplate ); 
				manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1 );
			}
			else if( type == TURRET ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->turretTemplate ); 
					manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() -1  );
			}
			else if( type == MISSLE  ){
				manager->player_projectiles.push_back( new Projectile(weaponDamage,angle, type, fire_x, fire_y, manager));
				manager->player_projectiles.back()->template_copy( manager->missleTemplate );
				manager->player_projectiles.back()->set_curr_frame( WeaponPower->get_power_cell_2() - 1);
			}

		}


	}