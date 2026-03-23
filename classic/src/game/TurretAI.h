#ifndef TURRETAI_H
#define TURRETAI_H

#include "GenericAI.h"

#define TURRET_FIRE_RATE	3000
#define TURRET_TURN_RATE	65

enum
{
	TURRETAI_TYPE_NORMAL,
		TURRETAI_TYPE_FIXED,
		TURRETAI_TYPE_SWEEPING,
		TURRETAI_TYPE_RANDOM
};

class TurretAI : public GenericAI
{
public:
	TurretAI(int turretai_type, int fire_rate);
	virtual ~TurretAI();

	AI_THINK_RESULT		Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

private:
	int		m_nFrame;
	int		m_nLastFire;
	int		m_nLastTurn;
	int		init;

	int		m_nType;
	int		m_nState;
	int		m_nFireRate;
	int		m_nTurnTarget;

	int		CalculateHeading(double playerShipX, double playerShipY, double enemyX, double enemyY);
	void	DoTurn(int nFrameTic);

};

#endif
