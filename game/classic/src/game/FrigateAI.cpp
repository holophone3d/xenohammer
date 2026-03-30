#include "GenericAI.h"
#include "FrigateAI.h"
#include <math.h>
#include <stdlib.h>

FrigateAI::FrigateAI()
{
	m_nLastFire = 0;
	m_nLastAccel = 0;
	m_nState = FAI_ENTERING_SCREEN;
	m_xmov = 0;
	m_ymov = FAI_MAX_SPEED;
	xerr = 0;
	yerr = 0;
	m_nTicCreated = -1;

}

FrigateAI::~FrigateAI()
{

}

AI_THINK_RESULT FrigateAI::Think(double playerShipX, double playerShipY, 
							 double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;
	double xtemp, ytemp, d;

	result.bRunAway = false;

	if(m_nTicCreated == -1)
	{
		m_nTicCreated = nFrameTic;

	}
	if(nFrameTic - m_nTicCreated > FAI_SCREEN_TIME)
		m_nState = FAI_RUNAWAY;

	if(fabs(enemyX - playerShipX) < 64)
	{
		if(nFrameTic - m_nLastFire > FAI_FIRE_RATE)
		{
			m_nLastFire = nFrameTic;
			result.bFire = true;
		}
		else
			result.bFire = false;
	}
	else
		result.bFire = false;

	if(nFrameTic - m_nLastAccel > FAI_ACCEL_RATE *2)
		m_nLastAccel = nFrameTic - FAI_ACCEL_RATE *2;

	switch(m_nState)
	{
	case FAI_ENTERING_SCREEN:

		// slow down if we're close to desired y coordinate
		if(FAI_DESIRED_Y - enemyY < 50)
			Accel(0,-FAI_ACCEL, nFrameTic);

		// next state
		if(m_ymov < 0.2)
		{
			m_nState = FAI_STRAFING;
			m_nLastTransition = nFrameTic;
		}

		break;
	case FAI_SITTING:
		// accelerate vertically torward desired Y position
		if(enemyY > FAI_DESIRED_Y + 30)
		{
			ytemp = -FAI_ACCEL;
		}
		else
		{
			if(enemyY < FAI_DESIRED_Y - 30)
				ytemp = FAI_ACCEL;
			else
			{
				if(fabs(m_ymov) > 0.25)
					ytemp = -FAI_ACCEL * (m_ymov/fabs(m_ymov));
				else
					ytemp = 0;
			}
		}
		// accelerate horizontally toward 0 velocity
		if(fabs(m_xmov) > 0.25)
			xtemp = -FAI_ACCEL * (m_xmov/fabs(m_xmov));
		else
			xtemp = 0;
		Accel(xtemp,ytemp,nFrameTic);

		// next state
		if(nFrameTic - m_nLastTransition > FAI_SIT_TIME)
		{
			m_nLastTransition = nFrameTic;
			m_nState = FAI_CHARGING + rand() % 2;
		}

		break;
	case FAI_CHARGING:
		
		// compute direction to player
		xtemp = playerShipX - enemyX;
		ytemp = playerShipY - enemyY;
		d = sqrt( (xtemp*xtemp) + (ytemp*ytemp));
		xtemp /= d;
		ytemp /= d;
		xtemp *= (FAI_ACCEL * 4);
		ytemp *= (FAI_ACCEL * 4);
		Accel(xtemp,ytemp,nFrameTic);

		// next state
		if(nFrameTic - m_nLastTransition > FAI_SIT_TIME / 3)
		{
			m_nLastTransition += FAI_SIT_TIME / 3;
			m_nState = FAI_RETREATING;
		}

		break;
	case FAI_STRAFING:

		// accelerate vertically torward desired Y position
		if(enemyY > FAI_DESIRED_Y + 30)
		{
			ytemp = -FAI_ACCEL;
		}
		else
		{
			if(enemyY < FAI_DESIRED_Y - 30)
				ytemp = FAI_ACCEL;
			else
			{
				if(fabs(m_ymov) > 0.25)
					ytemp = -FAI_ACCEL * (m_ymov/fabs(m_ymov));
				else
					ytemp = 0;
			}
		}

		// accelerate horizontally toward the player
		if(playerShipX > enemyX + 32)
			xtemp = FAI_ACCEL;
		else
		{
			if(playerShipX < enemyX - 32)
			{
				xtemp = -FAI_ACCEL;
			}
			else
			{
				if(fabs(m_xmov > 0.25))
					xtemp = -FAI_ACCEL * (m_xmov/fabs(m_xmov));
				else
					xtemp = 0;
			}

		}

		Accel(xtemp,ytemp,nFrameTic);

		// next state
		if(nFrameTic - m_nLastTransition > FAI_SIT_TIME)
		{
			m_nLastTransition = nFrameTic;

			if(rand() %2 == 0)
				m_nState = FAI_CHARGING;
			else
				m_nState = FAI_CHARGING; // should be sitting
		}

		break;
	case FAI_RETREATING:
		// accelerate vertically torward desired Y position
		if(enemyY > FAI_DESIRED_Y + 30)
		{
			ytemp = -FAI_ACCEL;
		}
		else
		{
			if(enemyY < FAI_DESIRED_Y - 30)
				ytemp = FAI_ACCEL;
			else
			{
				if(fabs(m_ymov) > 0.25)
					ytemp = -FAI_ACCEL * (m_ymov/fabs(m_ymov));
				else
					ytemp = 0;
			}
		}
		// accelerate horizontally toward center of screen
		if(enemyX > 360)
			xtemp = -FAI_ACCEL;
		else
		{
			if(enemyX < 300)
				xtemp = FAI_ACCEL;
			else
			{
				if(fabs(m_xmov > 0.25))
					xtemp = -FAI_ACCEL * (m_xmov/fabs(m_xmov));
				else
					xtemp = 0;
			}
		}
		Accel(xtemp*2,ytemp*2,nFrameTic);

		// next state
		if(nFrameTic - m_nLastTransition > FAI_SIT_TIME)
		{
			m_nLastTransition += FAI_SIT_TIME;
			m_nState = FAI_CHARGING + rand() % 2;
		}
		break;

	case FAI_RUNAWAY:
		Accel(0,FAI_ACCEL*2,nFrameTic);
		result.bRunAway = true;
		result.bFire = false;
		break;

	default:
		break;
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

	return result;
}

void FrigateAI::Accel(double xaccel, double yaccel, int nFrameTic)
{

	if(nFrameTic - m_nLastAccel > FAI_ACCEL_RATE)
	{
		m_nLastAccel += FAI_ACCEL_RATE;

		m_xmov += xaccel;
		m_ymov += yaccel;

		m_xmov *= FAI_DRAG;
		m_ymov *= FAI_DRAG;
	}

}