// LightFighterAI.h: interface for the LightFighterAI class.
//
//////////////////////////////////////////////////////////////////////

/*
	=====================
	Assumptions
	=====================

	- When calling the constructor, nWavePosition is the zero-based index
		of the ship's position in its wave.  For example, the first ship in a
		wave would be 0, the second ship would be 1, the third ship would be 2,
		and so on
	- Ships start off a fixed number of pixels behind each other, determined by their wave position

*/

#if !defined(AFX_LIGHTFIGHTERAI_H__0D3168C0_93D6_4EA2_87E0_DB0E10C90854__INCLUDED_)
#define AFX_LIGHTFIGHTERAI_H__0D3168C0_93D6_4EA2_87E0_DB0E10C90854__INCLUDED_

#if _MSC_VER > 1000
#pragma once
#endif // _MSC_VER > 1000

#include "GenericAI.h"

// screen size
#define		LF_SCREEN_WIDTH		800
#define		LF_SCREEN_HEIGHT	600
// speed of the light fighter, in pixels per second
#define		LF_SPEED		10

// fire rate...
#define		LF_FIRE_RATE	400

// turn rate of the light fighter - tics per turn (32 turns = 360 degrees)
#define		LF_TURNRATE		60 // 60 tics = about 16 turns per second (180 degrees per second)

// wave positioning
#define		LF_WAVEOFFSET	64 // 128 pixels from one ship to the next one in the same wave, at least to start

/*	
	=========================
	Light Fighter AI States

	LFAI_NONE
		This isn't a real state and shouldn't ever be reached.

	LFAI_ENTERING_SCREEN
		When the fighter first appears on the screen it will be in this state.  In this state
		it will just fly forward (down the screen) until its tic count falls below zero, then it
		will transition into the LFAI_FLYBY state.  If all goes well, this tic count will be
		different for each ship in the wave so that they all end up turning at the same spot on
		the screen.

	LFAI_TARGETING
		In this state the ship will try to head directly towards the player.  Once facing the
		player's current position, the ship will fire one shot then transition into the
		LFAI_SCATTER state.

	LFAI_FLYBY
		The ship will just fly across the screen for a short while and then go to LFAI_TARGETTING

	LFAI_SCATTER
		The ship should fly away from the player for a short time then either transition back to 
		the LFAI_FLYBY state or run away (LFAI_RUNAWAY)
	
	LFAI_RUNAWAY
		The ship will head off the screen.  Once off the screen it should be deleted.

	=========================
  */

enum
{
	LFAI_NONE,
	LFAI_ENTERING_SCREEN,
	LFAI_TARGETING,
	LFAI_FLYBY,
	LFAI_SCATTER,
	LFAI_RUNAWAY
};

class LightFighterAI: public GenericAI  
{
public:

	// constructors
	LightFighterAI(int nWavePosition, int nFrameTic); // nWavePosition = 0,1,2,...
	virtual ~LightFighterAI();

	// methods
	AI_THINK_RESULT			Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

private:
	// methods
	void	DoTurn(int nFrameTic);
	int		CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY);

	// vars
	int		m_nState; // keep track of what task (state) the AI is doing at the moment
	int		m_nTicCount; // for certain states we keep a tic count (turn for x tics, etc...)
	int		m_nLastTic; // this is the tic # of the last time we were called
	int		m_nTurnTarget; // the desired frame # to reach when doing turns (0 = right, 8 = up, 16 = left, etc...)
	int		m_nTurnCounter; // keep track of tics we need to wait before we can turn again
	int		m_nWavePosition;
	int		m_nFrame;
	int		m_nLastFire;

};

#endif // !defined(AFX_LIGHTFIGHTERAI_H__0D3168C0_93D6_4EA2_87E0_DB0E10C90854__INCLUDED_)
