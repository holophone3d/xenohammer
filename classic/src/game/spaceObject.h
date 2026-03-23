#ifndef SPACEOBJECT_H
#define SPACEOBJECT_H

#include "stdinclude.h"



class spaceObject : public GameObject_Sprite
{
protected:
	
	
public:
	
	spaceObject(int _dx, int _dy, int x, int y, GameManager *manager) 
		: GameObject_Sprite( x, y, manager)
	{
		dx = _dx;
		dy = _dy;
		
	};
	
	~spaceObject()
	{
		
		delete[] *frames;
		delete[] *frameMasks;
		
	}
	
	bool update() { this->show(32, 600); return true; };
	
	
};
#endif