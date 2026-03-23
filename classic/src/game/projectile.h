#ifndef PROJECTILE_H
#define PROJECTILE_H

#include "stdinclude.h"
#include "Console.h"

#define ENERGY_BLAST 1
#define ENERGY_BULLET 2
#define ENERGY_MISSLE 3



class Projectile : public GameObject_Sprite
{
public:

	bool isHoming;
	GameObject_Sprite* target;
	bool traking;
	bool done_firing;
	int old_dx,old_dy;

	Projectile(int _damage, int angle, int _type, int _x, int _y, GameManager *_manager, int _dx = 0, int _dy =0);

	

	//~Projectile();

	bool update();

	//used for specific gui stuff
	bool update_GUI(){ 
		bool retVal;
		retVal = true;
		if( x > 800 + 10 || x < 517+ 10 )
			retVal =false;
		if( y > 548 || y < 268 + 10)
			retVal = false;
		//draw only if we're in our bounds
		if( retVal == true )
			this->show(); 
		
		return retVal;
		
		};

	int get_damage() { return damage; };


	int get_type() {return type;};

	
protected:
				// see it defines to check the types
	int type;  // what type are we - this corresponds to the weapons that produce it
	int damage; // damage it will do to enemy

};

#endif