#ifndef EXPLOSIONGENERATOR_H
#define EXPLOSIONGENERATOR_H
#include "stdinclude.h"

#define TRAIL_COUNT	5	// number of "trails" to generate per ship explosion
#define EXPLOSION_SIZE	32	// the size of the small explosion sprites in pixels
#define TRAIL_LENGTH	4	// number of explosions per trail


class explosionGenerator
{
public:
	
	// generates "trails" of explosions
	static void MakeExplosions(int SourceX, int SouceY,int _dx, int _dy, GameManager* _manager);

	
	// rnd() generates random value between 0 and 1
	static double rnd(void)
	{
		double value;
		value = rand() % 8000;
		value /= 8000;
		return value;
	}
};

#endif
