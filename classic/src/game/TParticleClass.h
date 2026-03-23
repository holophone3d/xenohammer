#ifndef TPARTICLECLASS_H
#define TPARTICLECLASS_H

#include "stdinclude.h"
#include "GameManager.h"
#include "GL_Handler.h"

#define Sqr( A )  ((A)*(A))

	//PARTICLE SYSTEM STUFF
	typedef struct _TGravityWell
{
	int gX;
	int gY;
	float GravityLookupTable[2500];
	float GravityLevel;
	int Size;
	bool Ground;
} TGravityWell;



typedef struct _TGravityProperty
{
	int gX;
	int gY;
	int Size;
	
} TGravityProperty;

typedef struct _TParticle
{
	//User settings
    int X;            //Truncted version of vX
    int Y;            //Truncted version of vY
    float Angle;           //The angle you want the vector to travel upon
    float Force;           //The force with which it moves.
    int CreationDelay;//How many updates must pass before it will become active;
    bool ParticleHasGravity;       //Set to true if pariticle is gravitational
    TGravityProperty ParticleGravity; //The Gravity Properties of the particle itself
    float ParticleMass;            //The mass of the particles.

    //Private. These are used internally and you have no need to set these.
    float vX;              //Untruncated version of X
    float vY;              //Untruncated version of Y
    int OriginX;      //The very first X location it started at.
    int OriginY;      //The very first Y location it started at.
    float VectorX;
    float VectorY;
    int NumUpdates;   //how many times have I been updated?
    bool FreeParticle; //Set to true if you need to free the particle.
	bool active;								// Make All The Particles Active
	float life;								// Give All The Particles Full Life
	float fade;	// Random Fade Speed
	float r;
	float g;
	float b;
} TParticle;


   

class TParticleClass
{
	
protected:
   
		
	void GenerateGravityLookupTable( TGravityWell *GravityPtr);
	
    
	/*
		
    function GetGravityWell(Index: Integer): TGravityWell;
    procedure SetGravityWell(Index: Integer; const Value: TGravityWell);

	*/


public:

	TGravityWell *TGravityWellPtr;
	TParticle *TParticlePtr;


	std::vector <TParticle *> ParticleList;
	std::vector <TGravityWell *> GravityWellList;
	
	//TParticleClass();
	//~TParticleClass();

    void CreateParticle(const TParticle AParticle);
	
    void DestroyParticle(const int Index);
    
	void DestroyAllParticles();
	
    void MoveParticle(const int Index);
    void MoveAllParticles();
	
    int  DistanceFromOrigin(const int Index){}; //Returns how many pixels away it is from starting position
    float DistanceBetweenPoints(const int X1,const int Y1,const int X2,const int Y2 ); //Returns how many pixels away it is from starting position
    

	void SetParticleGravity(int Index, int GSize, float GLevel);
    void GenerateRandomParticles(int NumParticles, bool ParticleGravityOn,
                                  int pX, int pY, int MaxAngle, int MinAngle, int MaxSpeed, int MinSpeed, int Delay);
    void CreateCompleteParticle(bool AParticleGravityOn, int ApX, int ApY,
											float AAngle, float AForce,
                                            int AMass, int GSize, int ACreationDelay,
											bool AActive, float ALife, float AFade,
											float Ar, float Ag, float Ab);

   
    void CreateGravityWell(int X, int Y, int GSize, float GLevel, bool Ground);
	
	void DestroyGravityWell(int Index);
	void DestroyAllGravityWells();
	

	TParticle* GetParticle(int Index);
    void SetParticle(int Index, TParticle Value);
    
	int GetTotalParticles();
	int GetTotalGravityWells();
    
	  
	/*    
	property  Particle[Index : Integer]: TParticle read GetParticle write SetParticle;
    property  GravityWell[Index : Integer]: TGravityWell read GetGravityWell write SetGravityWell;
    property  TotalParticles : Integer read GetTotalParticles;
    property  TotalGravityWells : Integer read GetTotalGravityWells;
   
	 */

	//returns a number between 0 and upperbound
    int Random(int upperBound)
	{

		return (int)(rand()%upperBound);

	};



};


#endif