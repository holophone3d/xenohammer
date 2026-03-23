// GunshipAI.cpp: implementation of the GunshipAI class.
//
//////////////////////////////////////////////////////////////////////

#include "GenericAI.h"
#include "GunshipAI.h"
#include <math.h>
#include "stdinclude.h"

#ifdef _DEBUG
#undef THIS_FILE
static char THIS_FILE[]=__FILE__;
#define new DEBUG_NEW
#endif

//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

GunshipAI::GunshipAI()
{
	m_nFrame = (GS_FRAMES - 1) / 2;
	m_nState = GSAI_ENTERING_SCREEN;
	xmov = 0;
	ymov = GS_MAXSPEED;
	m_nPasses = 0;
	m_nLastBurst = 0;

}

GunshipAI::~GunshipAI()
{

}

AI_THINK_RESULT GunshipAI::Think(double playerShipX, double playerShipY, 
							 double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;

	switch(m_nState)
	{
	case GSAI_ENTERING_SCREEN:
		result.bFire = false;
		result.bRunAway = false;
		result.frame = (GS_FRAMES - 1) /2;
		result.xmov = xmov;
		result.ymov = ymov;

		// keep going straight until we're on the screen
		if(enemyY >= 16)
		{
			m_nPasses++;
			if(playerShipX > enemyX)
				m_nState = GSAI_FLYBY_RIGHT;
			else
				m_nState = GSAI_FLYBY_LEFT;
			m_nLastFire = nFrameTic;
			m_nLastAccelerate = nFrameTic;
			m_nLastBank = nFrameTic;
			m_nLastBurst= nFrameTic;
		}
		break;
	case GSAI_FLYBY_LEFT:
		// accelerate in the right direction
		if(ymov > 1)
			Accelerate(GS_ACCELERATE_LEFT,GS_ACCELERATE_UP,nFrameTic);
		else
			Accelerate(GS_ACCELERATE_LEFT,GS_ACCELERATE_NONE,nFrameTic);
		result.frame = m_nFrame;
		result.xmov = xmov;
		result.ymov = ymov;
		result.bRunAway = false;

		if(fabs(playerShipX - enemyX) < GS_FIRERANGE)
		{
			result.bFire = Fire(nFrameTic);
		}
		else
			result.bFire = false;

		// next state
		if( enemyX < GS_SCREEN_WIDTH / 4)
		{
			m_nPasses++;
			if(m_nPasses > GS_MAX_PASSES)
				m_nState = GSAI_RUNAWAY_RIGHT;
			else
				m_nState = GSAI_FLYBY_RIGHT;
		}
		break;
	case GSAI_FLYBY_RIGHT:
		// accelerate in the right direction
		if(ymov > 1)
			Accelerate(GS_ACCELERATE_RIGHT,GS_ACCELERATE_UP,nFrameTic);
		else
			Accelerate(GS_ACCELERATE_RIGHT,GS_ACCELERATE_NONE,nFrameTic);
		result.frame = m_nFrame;
		result.xmov = xmov;
		result.ymov = ymov;
		result.bRunAway = false;

		// see if we should fire
		if(fabs(playerShipX - enemyX) < GS_FIRERANGE)
		{
			result.bFire = Fire(nFrameTic);
		}
		else
			result.bFire = false;

		// next state
		if( enemyX > GS_SCREEN_WIDTH - GS_SCREEN_WIDTH / 4)
		{
			m_nPasses++;
			if(m_nPasses > GS_MAX_PASSES)
				m_nState = GSAI_RUNAWAY_LEFT;
			else
				m_nState = GSAI_FLYBY_LEFT;
		}
		break;
	case GSAI_RUNAWAY_LEFT:
		// accelerate in the right direction
		Accelerate(GS_ACCELERATE_LEFT,GS_ACCELERATE_DOWN,nFrameTic);
		result.frame = m_nFrame;
		result.xmov = xmov;
		result.ymov = ymov;
		result.bRunAway = true;

		// see if we should fire
		if(fabs(playerShipX - enemyX) < GS_FIRERANGE)
		{
			result.bFire = Fire(nFrameTic);
		}
		else
			result.bFire = false;
		break;

	case GSAI_RUNAWAY_RIGHT:
		// accelerate in the right direction
		Accelerate(GS_ACCELERATE_RIGHT,GS_ACCELERATE_DOWN,nFrameTic);
		result.frame = m_nFrame;
		result.xmov = xmov;
		result.ymov = ymov;
		result.bRunAway = true;

		// see if we should fire
		if(fabs(playerShipX - enemyX) < GS_FIRERANGE)
		{
			result.bFire = Fire(nFrameTic);
		}
		else
			result.bFire = false;

		break;

	}

	return result;

}

void GunshipAI::Accelerate(int nHorizontalDirection, int nVerticalDirection, int nFrameTic)
{
	bool bAccel = false, bBank = false;

	if(nFrameTic - m_nLastAccelerate > GS_ACCELERATE_RATE)
	{
		bAccel = TRUE;
		m_nLastAccelerate += GS_ACCELERATE_RATE;
	}
	if(nFrameTic - m_nLastBank > GS_BANK_RATE)
	{
		bBank = true;
		m_nLastBank += GS_BANK_RATE;
	}

	if(nHorizontalDirection == GS_ACCELERATE_LEFT)
	{
		if(bBank && m_nFrame < (GS_FRAMES - 1))
			m_nFrame++;
		if(bAccel)
		{
			xmov -= GS_ACCEL;
			xmov *= GS_DRAG;
		}
	}
	if(nHorizontalDirection == GS_ACCELERATE_RIGHT)
	{
		if(bBank && m_nFrame > 0)
			m_nFrame--;
		if(bAccel)
		{
			xmov += GS_ACCEL;
			xmov *= GS_DRAG;
		}
	}
	if(bAccel)
	{
		if(nVerticalDirection == GS_ACCELERATE_UP)
		{
			ymov -= GS_ACCEL;
			ymov *= GS_DRAG;
		}
		if(nVerticalDirection == GS_ACCELERATE_DOWN)
		{
			ymov += GS_ACCEL;
			ymov *= GS_DRAG;
		}
	}
	// done
}

bool GunshipAI::Fire(int nFrameTic)
{
	// fire in bursts - check to see if enough
	// time has lapsed to be ready for another burst
	if(nFrameTic - m_nLastBurst > GS_BURST_RATE)
	{
		m_nLastBurst += GS_BURST_RATE;
		m_nLastFire = nFrameTic;
	}

	// see if we've already fired enough bullets in this burst

	// check against maximum fire rate
	if(nFrameTic - m_nLastFire < GS_FIRE_RATE)
	{
		return true;
	}
	
	return false;
}