// GunshipAI.h: interface for the GunshipAI class.
//
//////////////////////////////////////////////////////////////////////

#if !defined(AFX_GUNSHIPAI_H__3ABB0F60_D0A3_407F_995A_B6C51EAE2D62__INCLUDED_)
#define AFX_GUNSHIPAI_H__3ABB0F60_D0A3_407F_995A_B6C51EAE2D62__INCLUDED_

#ifdef _MSC_VER
#pragma once
#endif // _MSC_VER


// screen size
#define GS_SCREEN_WIDTH		640
#define GS_SCREEN_HEIGHT	600

// acceleration / drag / etc
#define GS_DRAG		0.9
#define GS_ACCEL	(( 14 / GS_DRAG ) - 14)
#define GS_MAXSPEED	9

#define GS_ACCELERATE_RATE		100
#define GS_BANK_RATE			80
#define	GS_FIRE_RATE			600

#define GS_FRAMES				17
#define GS_FIRERANGE			64
#define GS_MAX_PASSES			3
#define GS_BURST_RATE			3000


// AI states
enum
{
	GSAI_NONE,
	GSAI_ENTERING_SCREEN,
	GSAI_FLYBY_RIGHT,
	GSAI_FLYBY_LEFT,
	GSAI_RUNAWAY_LEFT,
	GSAI_RUNAWAY_RIGHT
};

#define GS_ACCELERATE_NONE	0
#define GS_ACCELERATE_LEFT	1
#define GS_ACCELERATE_RIGHT	2
#define GS_ACCELERATE_UP	3
#define GS_ACCELERATE_DOWN	4


class GunshipAI : public GenericAI
{
public:
	GunshipAI();
	virtual ~GunshipAI();

	// methods
	AI_THINK_RESULT		Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

private:
	void	Accelerate(int nHorizontalDirection, int nVerticalDirection, int nFrameTic);
	bool	Fire(int nFrameTic);

	// vars
	int		m_nPasses;
	int		m_nState;
	int		m_nLastFire;
	int		m_nLastAccelerate;
	int		m_nLastBank;
	int		m_nFrame;

	int		m_nLastBurst;

	double	xmov;
	double	ymov;

};

#endif // !defined(AFX_GUNSHIPAI_H__3ABB0F60_D0A3_407F_995A_B6C51EAE2D62__INCLUDED_)
