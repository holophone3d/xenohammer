
#ifndef FIGHTERBAI_H
#define FIGHTERBAI_H

#include "GenericAI.h"


// speed of the light fighter, in pixels per second
#define		FBAI_SPEED		12

// fire rate...
#define		FBAI_FIRE_RATE	1000

// turn rate of the light fighter - tics per turn (32 turns = 360 degrees)
#define		FBAI_TURNRATE		60 // 60 tics = about 16 turns per second (180 degrees per second)

// wave positioning
#define		FBAI_WAVEOFFSET	64 // 128 pixels from one ship to the next one in the same wave, at least to start

enum
{
	FBAI_NONE,
	FBAI_ENTERING_SCREEN,
	FBAI_RIGHT,
	FBAI_LEFT,
	FBAI_RUNAWAY
};

class FighterBAI: public GenericAI  
{
public:

	// constructors
	FighterBAI(int nWavePosition, int nFrameTic); // nWavePosition = 0,1,2,...
	virtual ~FighterBAI();

	// methods
	AI_THINK_RESULT			Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

private:
	// methods
	void	DoTurn(int nFrameTic);
	int		CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY);
	double	distance(double x1, double y1, double x2, double y2);

	// vars
	int		m_nState; // keep track of what task (state) the AI is doing at the moment
	int		m_nLastTic; // this is the tic # of the last time we were called
	int		m_nTurnTarget; // the desired frame # to reach when doing turns (0 = right, 8 = up, 16 = left, etc...)
	int		m_nTurnCounter; // keep track of tics we need to wait before we can turn again
	int		m_nWavePosition;
	int		m_nFrame;
	int		m_nLastFire;

	double	xerr, yerr, m_xmov, m_ymov;

};

#endif // !defined(AFX_LIGHTFIGHTERAI_H__0D3168C0_93D6_4EA2_87E0_DB0E10C90854__INCLUDED_)
