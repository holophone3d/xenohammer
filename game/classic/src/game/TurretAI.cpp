#include "GenericAI.h"
#include "TurretAI.h"
#include <math.h>
#include <stdlib.h>

TurretAI::TurretAI(int turretai_type, int fire_rate)
{
	m_nFrame = 0;
	m_nLastTurn = 0;
	m_nLastFire = 0;
	init = 1;

	m_nFireRate = fire_rate;
	m_nType = turretai_type;
	m_nState = 0;
}

TurretAI::~TurretAI()
{

}

AI_THINK_RESULT TurretAI::Think(double playerShipX, double playerShipY, 
							 double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;
	int desired_heading;

	// turrets don't move...
	result.xmov = 0;
	result.ymov = 0;
	result.bRunAway = false;
	result.bFire = false;

	if( init == 1)
	{
		init = 0;
		m_nLastTurn = nFrameTic;
		m_nLastFire = nFrameTic;

		result.bFire = false;
		result.frame = m_nFrame;

		return result;
	}

	switch(m_nType)
	{
	case TURRETAI_TYPE_NORMAL:
	case TURRETAI_TYPE_RANDOM:

		// are we pointed correctly?
		desired_heading = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);
		if(m_nFrame == desired_heading)
		{
			// see if it's time to fire
			if(nFrameTic - m_nLastFire < m_nFireRate)
			{
				// not ready to fire yet
				result.bFire = false;
				result.frame = m_nFrame;
				m_nLastTurn = nFrameTic;
				return result;
			}

			result.bFire = true;
			if(m_nType == TURRETAI_TYPE_NORMAL)
				m_nLastFire = nFrameTic;
			else
				m_nLastFire = nFrameTic - rand() % 500;
			result.frame = m_nFrame;
			return result;
		}
		// not pointed correctly, so turn
		if(nFrameTic - m_nLastTurn >= TURRET_TURN_RATE)
		{
			m_nLastTurn = nFrameTic;
	
			// turn in the correct direction
			if(abs(m_nFrame - (desired_heading + 32)) < abs(m_nFrame - desired_heading) )
				m_nFrame++;
			else
			{
				if(abs((m_nFrame  + 32) - desired_heading) < abs(m_nFrame - desired_heading) )
				{
					m_nFrame--;
					if(m_nFrame < 0)
						m_nFrame += 32;
				}
				else
				{
					if(desired_heading > m_nFrame)
						m_nFrame++;
					else
						m_nFrame--;
				}
			}
			m_nFrame = m_nFrame % 32;
		}
		result.frame = m_nFrame;
		result.bFire = false;
		break;
	case TURRETAI_TYPE_FIXED:
		// are we pointed correctly?
		desired_heading = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);
		if(m_nFrame == desired_heading)
		{
			// see if it's time to fire
			if(nFrameTic - m_nLastFire < m_nFireRate)
			{
				// not ready to fire yet
				result.bFire = false;
				result.frame = m_nFrame;
				m_nLastTurn = nFrameTic;
				return result;
			}

			result.bFire = true;
			m_nLastFire = nFrameTic;
			result.frame = m_nFrame;
			return result;
		}
		result.frame = m_nFrame;
		result.bFire = false;
		break;

	case TURRETAI_TYPE_SWEEPING:
		desired_heading = CalculateHeading(playerShipX,playerShipY,enemyX,enemyY);
		// 3 states:
		//		0 = waiting
		//		1 = sweeping
		if(m_nState == 0)
		{
			// turn to left of player's direction and hold
			desired_heading = (desired_heading - 5 + 32) % 32;
			m_nTurnTarget = desired_heading;
			DoTurn(nFrameTic);

			// next state
			if(nFrameTic - m_nLastFire > 3000)
			{
				m_nLastFire = nFrameTic;
				m_nLastTurn = nFrameTic;
				m_nState = 1;
			}
			result.bFire = false;
		}
		else
		{
			// turn and fire
			if(nFrameTic - m_nLastFire >= m_nFireRate)
			{
				result.bFire = true;
				m_nFrame = (m_nFrame + 1) % 32;
				m_nLastFire += m_nFireRate;
			}
			else
				result.bFire = false;

			if(m_nFrame == (desired_heading + 5 ) % 32 )
			{
				m_nState = 0;
				m_nLastFire = nFrameTic;
				m_nLastTurn = nFrameTic;
			}
		}

		result.frame = m_nFrame;
		
		break;
	}

	return result;
}

int	TurretAI::CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY)
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
	heading = (heading + 8 ) % 32;

	return heading;
}

void TurretAI::DoTurn(int nFrameTic)
{
	// are we facing the way we want to go?
	if(m_nFrame == m_nTurnTarget)
	{
		// keep right on going
	}
	else
	{
		// turn in the right direction
		if(nFrameTic - m_nLastTurn >= TURRET_TURN_RATE)
		{
			m_nLastTurn += TURRET_TURN_RATE;
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
	}

	// done
}