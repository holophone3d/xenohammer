#include "Homing.h"
#include "GameManager.h"
#include "GameAnimation.h"
#include "GL_Handler.h"
#include "EnemyShip.h"
#include "PlayerShip.h"

void Homing::selection(GameManager *manager)
{
	for(std::list<EnemyShip *>::iterator itEnemyShips = manager->lightFighters.begin();
			itEnemyShips != manager->lightFighters.end();
			itEnemyShips)
	
		{
			EnemyShip *tempEnemy = *itEnemyShips;
			itEnemyShips++;

			//update the enemy ships
			if(tempEnemy->update() == false)
			{
				manager->lightFighters.remove(tempEnemy);
				delete(tempEnemy);
			}
		}
}