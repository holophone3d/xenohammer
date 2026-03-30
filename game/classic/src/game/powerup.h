#ifndef POWERUP_H
#define POWERUP_H

#include "stdinclude.h"



class powerUp : public GameObject_Sprite
{
protected:


public:

	powerUp(int _dx, int _dy, int x, int y, GameManager *manager) 
		: GameObject_Sprite( x, y, manager)
	{
		dx = _dx;
		dy = _dy;

	};


	bool update() { this->show(); return true; };


};
#endif