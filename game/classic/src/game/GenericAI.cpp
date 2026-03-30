// GenericAI.cpp: implementation of the GenericAI class.
//
//////////////////////////////////////////////////////////////////////


#include "GenericAI.h"
#include "stdinclude.h"

#ifdef _DEBUG
#undef THIS_FILE
static char THIS_FILE[]=__FILE__;
#define new DEBUG_NEW
#endif

//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

GenericAI::GenericAI()
{

}

GenericAI::~GenericAI()
{

}

AI_THINK_RESULT GenericAI::Think(double playeShipX, double playerShipY, double enemyX, double enemyY, int nFrameTic)
{
	AI_THINK_RESULT result;

	result.xmov = 0;
	result.ymov = 0;

	// not supposed to get called...
	std::cout << "AI ERROR: generic Think being called" << std::endl;

	return result;
}