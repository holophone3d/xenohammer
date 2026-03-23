#include "Ship.h"

// return true if the damage destroys the ship
bool Ship::take_damage( int damage ){

	bool retVal;
	int overFlow;

	//make sure we only subtract values
	if(damage < 0 )
		damage *= -1;

	
	if( shields <= 0)
		armor = armor - damage;
	else 
	{
		overFlow = shields - damage;
		shields = shields - damage;
		//carry damage over to armor if shields cannot handle all damage
		if( overFlow < 0 )
			armor += overFlow;
	}
		
	if(shields < 0)
		shields = 0;
	if(armor < 0)
		armor = 0;

	if( armor <= 0 )
		retVal = true;
	else
		retVal =false;

	return retVal;
}