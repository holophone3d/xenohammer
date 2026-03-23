// GenericAI.h: interface for the GenericAI class.
//
//////////////////////////////////////////////////////////////////////

#if !defined(AFX_GENERICAI_H__78A35DC7_1372_4DB2_8AC6_EA24EED10320__INCLUDED_)
#define AFX_GENERICAI_H__78A35DC7_1372_4DB2_8AC6_EA24EED10320__INCLUDED_

#ifdef _MSC_VER
#pragma once
#endif // _MSC_VER

typedef struct ai_think_result
{
	// movement - this is the ship's new speed (pixels per second)
	double	xmov, ymov;

	// did we fire this frame?
	bool	bFire;

	// what frame of animation are we on now?
	int		frame;

	// if the ship is running away... 
	// (this flag means to delete the ship if it has already left the screen)
	bool	bRunAway;

} AI_THINK_RESULT;

class GenericAI  
{
public:
	GenericAI();
	virtual ~GenericAI();

	virtual AI_THINK_RESULT Think(double playerShipX, double playerShipY, 
									double enemyX, double enemyY, int nFrameTic);

};

#endif // !defined(AFX_GENERICAI_H__78A35DC7_1372_4DB2_8AC6_EA24EED10320__INCLUDED_)
