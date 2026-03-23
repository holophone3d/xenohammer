
#include "GenericAI.h"
#include "FighterBAI.h"
#include "LightFighterAI.h"
#include <math.h>
#include <stdlib.h>
#include "stdinclude.h"

//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

FighterBAI::FighterBAI(int nWavePosition, int nFrameTic)
{

	// start in the "entering screen" state
	m_nState = FBAI_ENTERING_SCREEN;


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

FighterBAI::~FighterBAI()
{

}


AI_THINK_RESULT FighterBAI::Think(double playerShipX, double playerShipY, 
							 double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;
	double rad;
	int dirToPlayer;

	dirToPlayer = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);

	if(m_nFrame == dirToPlayer)
			result.bFire = true;
		else
			result.bFire = false;

	// calculate current ship heading in radians, for future use
	rad = ((double)m_nFrame)*11.25*3.14159/180;

	//std::cout << "State: " << m_nState << std::endl;

	switch(m_nState)
	{
	case FBAI_ENTERING_SCREEN:

		// just keep going straight for a number of tics (until tic counter is less than zero)
		if(enemyY > 0)
		{
			// we should go to flyby state now
			if(playerShipX > enemyX)
				m_nState = FBAI_RIGHT;
			else
				m_nState = FBAI_LEFT;

			m_nTurnCounter = 0;

		}

		// fill in result structure
		result.bFire = false;
		result.bRunAway = false;
		result.frame = m_nFrame;
		m_xmov = cos(rad)*FBAI_SPEED;
		m_ymov = -1*sin(rad)*FBAI_SPEED;

		break;
	case FBAI_LEFT:

		m_nTurnTarget = 17;
		
		if(enemyX < 100)
			m_nState = FBAI_RIGHT;
		if(enemyY > 500)
			m_nState = FBAI_RUNAWAY;

		DoTurn(nFrameTic);
		
		result.bRunAway = false;
		result.frame = m_nFrame;
		m_xmov = cos(rad)*FBAI_SPEED;
		m_ymov = -1*sin(rad)*FBAI_SPEED;
		break;

	case FBAI_RIGHT:

		m_nTurnTarget = 31;
		
		if(enemyX > 500)
			m_nState = FBAI_LEFT;
		if(enemyY > 500)
			m_nState = FBAI_RUNAWAY;

		DoTurn(nFrameTic);
		
		result.bRunAway = false;
		result.frame = m_nFrame;
		m_xmov = cos(rad)*FBAI_SPEED;
		m_ymov = -1*sin(rad)*FBAI_SPEED;
		break;
	
	case FBAI_RUNAWAY:
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
		m_xmov = cos(rad)*FBAI_SPEED;
		m_ymov = -1*sin(rad)*FBAI_SPEED;

		break;

	default:
		// uh-oh, this shouldn't be reached
		break;

	}

	// don't fire unless it's time
	if(result.bFire)
	{
		if(nFrameTic - m_nLastFire < FBAI_FIRE_RATE)
			result.bFire = false;
		else
		{
			m_nLastFire = nFrameTic;
		}
	}

	// "jitter" stuff

	xerr += m_xmov - floor(m_xmov);
	if(xerr > 1)
	{
		xerr -= 1;
		result.xmov = ceil(m_xmov);
	}
	else
		result.xmov = floor(m_xmov);

	yerr += m_ymov - floor(m_ymov);
	if(yerr > 1)
	{
		yerr -= 1;
		result.ymov = ceil(m_ymov);
	}
	else
		result.ymov = floor(m_ymov);

	m_nLastTic = nFrameTic;
	return result;
}

void FighterBAI::DoTurn(int nFrameTic)
{
	// are we facing the way we want to go?
	if(m_nFrame == m_nTurnTarget)
	{
		// keep right on going
	}
	else
	{
		// turn in the right direction
		if(m_nTurnCounter > FBAI_TURNRATE)
		{
			m_nTurnCounter -= FBAI_TURNRATE;
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
int	FighterBAI::CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY)
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

double FighterBAI::distance(double x1, double y1, double x2, double y2)
{
	return sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}