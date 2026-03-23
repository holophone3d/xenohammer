// LightFighterAI.cpp: implementation of the LightFighterAI class.
//
//////////////////////////////////////////////////////////////////////

#include "GenericAI.h"
#include "LightFighterAI.h"
#include <math.h>
#include <stdlib.h>
#include "stdinclude.h"

#ifdef _DEBUG
#undef THIS_FILE
static char THIS_FILE[]=__FILE__;
#define new DEBUG_NEW
#endif

//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

LightFighterAI::LightFighterAI(int nWavePosition, int nFrameTic)
{
	double temp;

	// start in the "entering screen" state
	m_nState = LFAI_ENTERING_SCREEN;

	// calculate how long to wait before turning
	// based on wave position, ship speed, and distance between ships in the wave
	//temp = LF_WAVEOFFSET / LF_SPEED;
	temp = 410; // (LF_WAVEOFFSET / 312) * 1000
	m_nTicCount = 300 + nWavePosition * ((int)temp);

	// remember the wave position
	m_nWavePosition = nWavePosition;

	// remember the tic
	m_nLastTic = nFrameTic;

	// don't need a turn target, set to zero anyway
	m_nTurnTarget = 0;

	// start off looking straight down
	m_nFrame = 24; 

	m_nLastFire = nFrameTic;

}

LightFighterAI::~LightFighterAI()
{

}

/*
	===============
	Think()

	This should be called every time a new frame is drawn.  This method does the "thinking" for
	the ship.  It doesn't actually change any of the ship's data (frame number, position, etc...),
	but it puts the information needed to make these changes into a LIGHTFIGHTER_AI_RESULT
	structure and returns it.

		playerShipX = x coordinate of the player ship, in pixels
		playerShipY = y coordinate of the player ship, in pixels.  0 = top of the screen
		enemyX = x coordinate of this ship
		enemyY = y coordinate of this ship
		nFrameTic = millisecond timer value for this frame


	===============
*/

AI_THINK_RESULT LightFighterAI::Think(double playerShipX, double playerShipY, 
							 double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;
	double rad;

	// calculate current ship heading in radians, for future use
	rad = ((double)m_nFrame)*11.25*3.14159/180;

	//std::cout << "State: " << m_nState << std::endl;

	switch(m_nState)
	{
	case LFAI_ENTERING_SCREEN:

		// just keep going straight for a number of tics (until tic counter is less than zero)
		if(m_nTicCount < 0)
		{
			// we should go to flyby state now
			m_nState = LFAI_FLYBY;

			// determine which way we want to go 
			if(enemyX < LF_SCREEN_WIDTH / 2)
				m_nTurnTarget = (8 + 25) % 32;
			else
				m_nTurnTarget = (-8 + 25) % 32;
			m_nTurnCounter = 0;

			// do the flyby for 1600 milliseconds before starting to target the player
			m_nTicCount += 1600;

		}
		else
			// decrease tic counter
			m_nTicCount -= (nFrameTic - m_nLastTic);

		// fill in result structure
		result.bFire = false;
		result.bRunAway = false;
		result.frame = m_nFrame;
		result.xmov = cos(rad)*LF_SPEED;
		result.ymov = -1*sin(rad)*LF_SPEED;

		break;
	case LFAI_FLYBY:

		// fire at the player if we happen to be facing in that general direction
		if(CalculateHeading(playerShipX,playerShipY,enemyX,enemyY) == m_nFrame)
		{
			if(nFrameTic - m_nLastFire >= LF_FIRE_RATE)
			{
				result.bFire = true;
				m_nLastFire = nFrameTic;
			}
			else
				result.bFire = false;
		}
		else
			result.bFire = false;

		// is our tic count up?
		if(m_nTicCount < 0)
		{
			// go to targeting state
			m_nState = LFAI_TARGETING;
			m_nTicCount = 0;
		}
		else
		{
			// turn in the right direction
			DoTurn(nFrameTic);

			// decrease tic counter
			m_nTicCount -= (nFrameTic - m_nLastTic);
		}


		// fill in result structure
		result.bRunAway = false;
		result.frame = m_nFrame;
		result.xmov = cos(rad)*LF_SPEED;
		result.ymov = -1*sin(rad)*LF_SPEED;
		break;

	case LFAI_TARGETING:
		// calculate the direction to the player
		m_nTurnTarget = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);

		// turn toward target
		DoTurn(nFrameTic);

		// if we're facing the target, fire a shot and go to next state
		if(m_nTurnTarget == m_nFrame && fabs(playerShipX - enemyX) < LF_SCREEN_WIDTH / 2 && fabs(playerShipY - enemyY) < LF_SCREEN_HEIGHT / 2)
		{
			result.bFire = true;
			m_nState = LFAI_SCATTER;
			m_nTicCount = 1200; // scatter for 1200 msec
			
		}
		else
		{
			result.bFire = false;

		}
		//std::cout << "Target heading: " << m_nTurnTarget << "Current heading: " << m_nFrame << std::endl;

		result.bRunAway = false;
		result.frame = m_nFrame;
		result.xmov = cos(rad)*LF_SPEED;
		result.ymov = -1*sin(rad)*LF_SPEED;

		break;
	case LFAI_SCATTER:

		// is our tic count up?
		if(m_nTicCount < 0)
		{
			if(rand()%3 == 0)
			{
				// run away
				m_nState = LFAI_RUNAWAY;
			}
			else
			{
				m_nState = LFAI_FLYBY;

				// head toward the farthest corner
				if(playerShipX > LF_SCREEN_WIDTH / 2)
					m_nTurnTarget = CalculateHeading(0,0,enemyX,enemyY);
				else
					m_nTurnTarget = CalculateHeading(LF_SCREEN_WIDTH,0,enemyX,enemyY);

				m_nTicCount += 2000;
			}

		}
		else
		{
			// calculate direction to player
			m_nTurnTarget = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);

			if(m_nWavePosition % 2 == 0)
				m_nTurnTarget -= 8;  // go ..tanget?... from the player, not towards
			else
				m_nTurnTarget += 8;
			m_nTurnTarget += 32;
			m_nTurnTarget %= 32;

			// do our turn
			DoTurn(nFrameTic);

			// decrease tic counter
			m_nTicCount -= (nFrameTic - m_nLastTic);

		}

		result.bFire = false;
		result.bRunAway = false;
		result.frame = m_nFrame;
		result.xmov = cos(rad)*LF_SPEED;
		result.ymov = -1*sin(rad)*LF_SPEED;

		break;
	case LFAI_RUNAWAY:
		// head towards the closest side
		if(enemyX < LF_SCREEN_WIDTH / 2)
			m_nTurnTarget = 16 + (m_nWavePosition % 7) - 3;
		else
			m_nTurnTarget = 32 + (m_nWavePosition % 7) - 3;
		m_nTurnTarget = m_nTurnTarget % 32;

		// do the turn
		DoTurn(nFrameTic);

		result.bFire = false;
		result.bRunAway = true; // run away
		result.frame = m_nFrame;
		result.xmov = cos(rad)*LF_SPEED;
		result.ymov = -1*sin(rad)*LF_SPEED;

		break;

	default:
		// uh-oh, this shouldn't be reached
		break;

	}

	m_nLastTic = nFrameTic;
	return result;
}

void LightFighterAI::DoTurn(int nFrameTic)
{
	// are we facing the way we want to go?
	if(m_nFrame == m_nTurnTarget)
	{
		// keep right on going
	}
	else
	{
		// turn in the right direction
		if(m_nTurnCounter > LF_TURNRATE)
		{
			m_nTurnCounter -= LF_TURNRATE;
			if(abs(m_nFrame - (m_nTurnTarget + 32)) < abs(m_nFrame - m_nTurnTarget) )
				m_nFrame++;
			else
			{
				if(abs((m_nFrame  + 32) - m_nTurnTarget) < abs(m_nFrame - m_nTurnTarget) )
				{
					m_nFrame--;
					if(m_nFrame < 0)
						m_nFrame += 32;
				}
				else
				{
					if(m_nTurnTarget > m_nFrame)
						m_nFrame++;
					else
						m_nFrame--;
				}
			}
			m_nFrame = m_nFrame % 32;
		}
		m_nTurnCounter += (nFrameTic - m_nLastTic);
	}

	// done
}

// calculates the correct ship heading (0-31) to face the player's ship
int	LightFighterAI::CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY)
{
	int heading;

	// calculate the direction to the player
	double xoffset, yoffset, target_rad;
	xoffset = playerShipX - enemyX;
	yoffset = (playerShipY - enemyY)*-1; // real coordinates are opposite of game coordinates
	if(fabs(xoffset) >0.01) // watch out for divide-by-zero errors
		target_rad = atan(yoffset/xoffset);
	else
		target_rad = atan(yoffset/0.01);
	if(xoffset < 0) target_rad += 3.1514926;
	target_rad += 2*3.1415926; // don't want negative angles

	// caculate which frame # is facing that direction
	heading = (int)((target_rad + 0.0982)/0.19635);
	heading = heading % 32;

	return heading;
}