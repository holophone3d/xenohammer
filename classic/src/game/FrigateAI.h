#ifndef FRIGATEAI_H
#define FRIGATEAI_H

#include "GenericAI.h"

#define FAI_MAX_SPEED	6
#define FAI_DRAG		0.95
#define FAI_ACCEL		0.2
#define FAI_ACCEL_RATE	100
#define FAI_FIRE_RATE	3000
#define FAI_DESIRED_Y	25

#define FAI_SIT_TIME	3078

#define FAI_SCREEN_TIME	60000

// the frigate AI only handles movement
enum
{
	FAI_ENTERING_SCREEN,
	FAI_SITTING,
	FAI_CHARGING,
	FAI_STRAFING,
	FAI_RETREATING,
	FAI_RUNAWAY
};

class FrigateAI : public GenericAI
{
public:
	FrigateAI();
	virtual ~FrigateAI();

	AI_THINK_RESULT		Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

private:
	int		m_nState;
	int		m_nLastTransition;
	double	m_xmov, m_ymov;
	int		m_nLastAccel;
	int		m_nLastFire;
	double xerr, yerr;
	int		m_nTicCreated;

	void	Accel(double xaccel, double yaccel, int nFrameTic);

};
#endif