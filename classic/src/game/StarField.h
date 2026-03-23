// StarField.h: interface for the StarField class.
//
//////////////////////////////////////////////////////////////////////
#ifndef STARFIELD_H
#define STARFIELD_H

#include "stdinclude.h"
#include "spaceObject.h"

#define STARFIELD_MAX_STARS		600
#define STARFIELD_DISTANCE		300
#define STARFIELD_SPEED			30


typedef struct _starinfo
{
	double	x,y,z ,color;
	int xscr,yscr,moving, size;
} STARINFO;
/*
typedef struct _spaceObject
{
	CL_Surface * objectImage;
	bool view_object;
	STARINFO objectPos;

} spaceObject;
*/


class StarField  
{
public:
	StarField();
	virtual ~StarField();

static double newRnd(int inputVal);
static double rnd(void);

	void		Initialize(int speed, bool near_earth, GameManager* _manager);
	void		MoveStars(int speed);
	STARINFO	stars[STARFIELD_MAX_STARS];
	void		PickStar(void);
	void        Draw(float speed, bool drawBckGrnd);

		spaceObject* newEarth;
	spaceObject* newMoon;

private:
	void	RenewStar(int i, bool firstTime);
	int fieldSpeed;

	int starfield_start_time;
/*	
	spaceObject earth;
	spaceObject moon;
*/


};

#endif
