#include "TParticleClass.h"



 float RtoD	=		0.0175f; //3.14/(float)180;
 int MaxGravityLookup = 2500;
 float Universal_Gravity_Constant = 6.52f;





void TParticleClass::CreateParticle(const TParticle AParticle)
{
  TParticle* ParticlePtr;

  ParticlePtr = (TParticle*) malloc(sizeof( TParticle ) );

  ParticlePtr->vX = AParticle.X;
  ParticlePtr->vY = AParticle.Y;
  ParticlePtr->OriginX = AParticle.X;
  ParticlePtr->OriginY = AParticle.Y;
  ParticlePtr->VectorX = AParticle.Force * sin(AParticle.Angle * RtoD );
  ParticlePtr->VectorY = -AParticle.Force * cos(AParticle.Angle* RtoD );
  ParticlePtr->NumUpdates = 0;
  ParticlePtr->ParticleHasGravity = AParticle.ParticleHasGravity;
  ParticlePtr->ParticleMass = AParticle.ParticleMass;
  ParticlePtr->CreationDelay = AParticle.CreationDelay;
  ParticlePtr->FreeParticle = false;

	//SETUP other particle properties
	ParticlePtr->active=AParticle.active;								// Make All The Particles Active
	ParticlePtr->life=AParticle.life;								// Give All The Particles Full Life
	ParticlePtr->fade=AParticle.fade;	// Random Fade Speed
	ParticlePtr->r = AParticle.r; 
	ParticlePtr->g = AParticle.g;
	ParticlePtr->b = AParticle.b;
  
  ParticleList.push_back(ParticlePtr);

}

void TParticleClass::DestroyParticle(const int Index)
{

  ParticleList.erase(ParticleList.begin() + Index);

}
  
void TParticleClass::DestroyAllParticles()
{
	ParticleList.clear();
}


void TParticleClass::MoveParticle(const int Index)
{

  float Distance;
  float GravityForce;
  int Gi;

  TParticlePtr = ParticleList.at( Index );
  if( TParticlePtr->CreationDelay == 0)
  {
    if( GravityWellList.empty() == false )
	{
      //Handle GravityWells. Don't want more procedure calls (pops/pushes too slow), so put dupe code here
        for( Gi = 0; Gi < GravityWellList.size(); Gi++ )
		{
         TGravityWellPtr = GravityWellList.at(Gi);
		  
			if (TGravityWellPtr->GravityLevel != 0)
			{
              
              Distance = DistanceBetweenPoints(TParticlePtr->X, TParticlePtr->Y, TGravityWellPtr->gX, TGravityWellPtr->gY);
              if ((Distance > TGravityWellPtr->Size) && (Distance < MaxGravityLookup))
			  {
                if ((TParticlePtr->Y > TGravityWellPtr->gY) && (TGravityWellPtr->Ground == true))
                  GravityForce = 0;
                else
                  GravityForce = TGravityWellPtr->GravityLookupTable[(int)Distance];

                if(TGravityWellPtr->Ground != true)
                {
                  if (TParticlePtr->X < TGravityWellPtr->gX)
                    TParticlePtr->VectorX = TParticlePtr->VectorX + GravityForce;
                  else if (TParticlePtr->X > TGravityWellPtr->gX)
                      TParticlePtr->VectorX = TParticlePtr->VectorX - GravityForce;
                }

                if (TParticlePtr->Y < TGravityWellPtr->gY)
                  TParticlePtr->VectorY = TParticlePtr->VectorY + GravityForce;
                else if (TParticlePtr->Y > TGravityWellPtr->gY)
                    TParticlePtr->VectorY = TParticlePtr->VectorY - GravityForce;
              }
			}
            else
			{
              if (Distance >= MaxGravityLookup ) 
                TParticlePtr->FreeParticle = true;
            }
		}
	
      TParticlePtr->vX = TParticlePtr->vX + TParticlePtr->VectorX;
      TParticlePtr->vY = TParticlePtr->vY + TParticlePtr->VectorY;
      TParticlePtr->X = (int)TParticlePtr->vX;
      TParticlePtr->Y = (int)TParticlePtr->vY;
      TParticlePtr->NumUpdates++;
    }
  else
     TParticlePtr->CreationDelay--;
  }


}



void  TParticleClass::MoveAllParticles()
{

  float Distance;
  float GravityForce;
  int I;
  int Pi;
  int Gi;
  TParticle  *TParticlePtr2;

  for( I = 0; I < ParticleList.size(); I++)
  {
    TParticlePtr = ParticleList.at(I);
	 if (TParticlePtr->CreationDelay == 0)
	 {
		 //Handle gravitation between particles
        if (TParticlePtr->ParticleHasGravity == true)
		{
          for (Pi = 0; Pi < ParticleList.size(); Pi++)
		  {
			//ONLY USE FOR GRAVITY PROPERTY STUFF
			TParticlePtr2 = ParticleList.at(Pi);
            if ((Pi != I) && (TParticlePtr2->FreeParticle != true))  //make sure we aren't gravititating our self (it would shoot off at high velocity)
			{
				if (TParticlePtr->ParticleMass != 0)
				{
                  Distance = DistanceBetweenPoints(TParticlePtr->X, TParticlePtr->Y, TParticlePtr2->ParticleGravity.gX, TParticlePtr2->ParticleGravity.gY);
                  if (Distance > TParticlePtr2->ParticleGravity.Size)
				  {
                    //Gravity Formulae
                    GravityForce = Universal_Gravity_Constant*((abs(TParticlePtr2->ParticleMass - TParticlePtr->ParticleMass))+1) / Sqr(Distance+1);
                    if (TParticlePtr->X < TParticlePtr2->ParticleGravity.gX)
                      TParticlePtr->VectorX = TParticlePtr->VectorX + GravityForce;
                    else if (TParticlePtr->X > TParticlePtr2->ParticleGravity.gX)
                        TParticlePtr->VectorX = TParticlePtr->VectorX - GravityForce;
                   
					if (TParticlePtr->Y < TParticlePtr2->ParticleGravity.gY)
                      TParticlePtr->VectorY = TParticlePtr->VectorY + GravityForce;
                    else if (TParticlePtr->Y > TParticlePtr2->ParticleGravity.gY)
                        TParticlePtr->VectorY = TParticlePtr->VectorY - GravityForce;
                  }
                }
			}
		  }
		}
		if( GravityWellList.empty() == false )
		{
		  //Handle GravityWells. Don't want more procedure calls (pops/pushes too slow), so put dupe code here
			for( Gi = 0; Gi < GravityWellList.size(); Gi++ )
			{
			 TGravityWellPtr = GravityWellList.at(Gi);
			  
				if (TGravityWellPtr->GravityLevel != 0)
				{
              
				  Distance = DistanceBetweenPoints(TParticlePtr->X, TParticlePtr->Y, TGravityWellPtr->gX, TGravityWellPtr->gY);
				  if ((Distance > TGravityWellPtr->Size) && (Distance < MaxGravityLookup))
				  {
					if ((TParticlePtr->Y > TGravityWellPtr->gY) && (TGravityWellPtr->Ground == true))
					  GravityForce = 0;
					else
					  GravityForce = TGravityWellPtr->GravityLookupTable[(int)Distance];

					if(TGravityWellPtr->Ground != true)
					{
					  if (TParticlePtr->X < TGravityWellPtr->gX)
						TParticlePtr->VectorX = TParticlePtr->VectorX + GravityForce;
					  else if (TParticlePtr->X > TGravityWellPtr->gX)
						  TParticlePtr->VectorX = TParticlePtr->VectorX - GravityForce;
					}

					if (TParticlePtr->Y < TGravityWellPtr->gY)
					  TParticlePtr->VectorY = TParticlePtr->VectorY + GravityForce;
					else if (TParticlePtr->Y > TGravityWellPtr->gY)
						TParticlePtr->VectorY = TParticlePtr->VectorY - GravityForce;
				  }
				}
				else
				{
				  if (Distance >= MaxGravityLookup ) 
					TParticlePtr->FreeParticle = true;
				}
			}
		}
		  TParticlePtr->vX = TParticlePtr->vX + TParticlePtr->VectorX;
		  TParticlePtr->vY = TParticlePtr->vY + TParticlePtr->VectorY;
		  TParticlePtr->X = (int)TParticlePtr->vX;
		  TParticlePtr->Y = (int)TParticlePtr->vY;
		  
		  if (TParticlePtr->ParticleHasGravity == true)
		  {
        	TParticlePtr->ParticleGravity.gX = TParticlePtr->X;
			TParticlePtr->ParticleGravity.gY = TParticlePtr->Y;
		  }
		  
		  TParticlePtr->NumUpdates++;
		}
	else
    TParticlePtr->CreationDelay--;
		}


	 }
  


float TParticleClass::DistanceBetweenPoints(const int X1,const int Y1,const int X2,const int Y2 )
{
	float retVal;
	retVal = (sqrt(Sqr(abs(X1 - X2)) + Sqr(abs(Y1 - Y2))));
	return retVal;
}


void TParticleClass::SetParticleGravity(int Index, int GSize, float GLevel)
{

	TParticlePtr = ParticleList.at( Index );

	TParticlePtr->ParticleGravity.gX = TParticlePtr->X;
    TParticlePtr->ParticleGravity.gY = TParticlePtr->Y;
    TParticlePtr->ParticleGravity.Size = GSize;
  
}



void TParticleClass::GenerateRandomParticles(int NumParticles, bool ParticleGravityOn,
                                                 int pX, int pY, int MaxAngle, int MinAngle,
												 int MaxSpeed, int MinSpeed, int Delay)
{
 int I;
  TParticle AParticle;

  for( I = 0; I < NumParticles; I++)
  {
      AParticle.X = pX;
      AParticle.Y = pY;
      AParticle.Angle = (float)Random(MaxAngle - MinAngle) + (float)MinAngle + ((float)Random(100)/(float)100);
      AParticle.Force = (float)(Random(MaxSpeed - MinSpeed) + (float)MinSpeed) + ((float)Random(100)/(float)100);
      //AParticle.Force = 1;
      AParticle.CreationDelay = Random(Delay);
      AParticle.ParticleHasGravity = ParticleGravityOn;
      AParticle.ParticleMass = Random(1) + ((float)Random(100)/(float)100);
      CreateParticle(AParticle);
      SetParticleGravity(ParticleList.size()-1, 5, AParticle.ParticleMass);
  }
}


void TParticleClass::CreateCompleteParticle(bool AParticleGravityOn, int ApX, int ApY,
											float AAngle, float AForce,
                                            int AMass, int GSize, int ACreationDelay,
												bool AActive, float ALife, float AFade,
											float Ar, float Ag, float Ab)
{
	TParticle AParticle;

    AParticle.X = ApX;
    AParticle.Y = ApY;
    AParticle.Angle = AAngle;
    AParticle.Force = AForce;
    AParticle.CreationDelay = ACreationDelay;
    AParticle.ParticleHasGravity = AParticleGravityOn;
    AParticle.ParticleMass = AMass  + ((float)Random(100)/(float)100);
    AParticle.active = AActive;
	AParticle.life = ALife;
	AParticle.fade = AFade;
	AParticle.r = Ar;
	AParticle.g = Ag;
	AParticle.b = Ab;


    CreateParticle(AParticle);
    SetParticleGravity(ParticleList.size()-1, GSize, AParticle.ParticleMass);
}	


 void  TParticleClass::CreateGravityWell(int X, int Y, int GSize, float GLevel, bool Ground = true)
 {

	TGravityWell* GravityPtr;

  GravityPtr = (TGravityWell*) malloc(sizeof( TGravityWell ) );

    
  GravityPtr->Ground = Ground;
  GravityPtr->gX = X;
  GravityPtr->gY = Y;

  if (Ground == false)
    GravityPtr->GravityLevel = GLevel * 15;
  else
    GravityPtr->GravityLevel = GLevel * 250; //need 10 times the strength for realistic land style gravity

  if (GSize < 2)
    GravityPtr->Size = 2;
  else
    GravityPtr->Size = GSize;

  GenerateGravityLookupTable(GravityPtr);
  GravityWellList.push_back(GravityPtr);
 
 }
	
 void TParticleClass::DestroyGravityWell(int Index)
{

    GravityWellList.erase(GravityWellList.begin() + Index);

 }


 void TParticleClass::DestroyAllGravityWells()
 {

  if (GravityWellList.empty() == false) 
	  GravityWellList.clear();
 }




void TParticleClass::GenerateGravityLookupTable( TGravityWell *GravityPtr)
{

  int I;
  int  Factor;

	if (GravityPtr->Ground == false)
		Factor = 15;
	else
		Factor = 250;

	for (I = 0; I < MaxGravityLookup; I++)
	{
		GravityPtr->GravityLookupTable[I] = ((GravityPtr->GravityLevel) - (1 * Factor)) / Sqr(I+1);
	}
}



TParticle* TParticleClass::GetParticle(int Index)
{

	return ParticleList.at( Index );
}
	
	

void TParticleClass::SetParticle(int Index, const TParticle Value)
{
	TParticle* temp;
	temp = ParticleList.at(Index);

	//memberwise copy
	temp->Angle = Value.Angle;
	temp->CreationDelay = Value.CreationDelay;
	temp->Force = Value.Force;
	temp->FreeParticle = Value.FreeParticle;
	temp->NumUpdates = Value.NumUpdates;
	temp->OriginX = Value.OriginX;
	temp->OriginY  = Value.OriginY;
	temp->ParticleGravity = Value.ParticleGravity;
	temp->ParticleHasGravity =  Value.ParticleHasGravity;
	temp->ParticleMass = Value.ParticleMass;
	temp->VectorX = Value.VectorX;
	temp->VectorY =  Value.VectorY;
	temp->vX = Value.vX;
	temp->vY = Value.vY;
	temp->X  = Value.X;
	temp->Y = 	Value.Y;

}





int TParticleClass::GetTotalParticles()
{
	return ParticleList.size() -1 ;
}

int TParticleClass::GetTotalGravityWells()
{

  return GravityWellList.size()-1;
}
/*

{--------------------------------------------------------------------------------------------}
function TParticleClass.GetGravityWell(Index: Integer): TGravityWell;
begin
  if (GravityWellList <> nil) and (Index > -1) and (Index <= GravityWellList.Count-1) then
    Result := TGravityWell(TGravityWellPtr(GravityWellList.Items[Index])^);
end;
{--------------------------------------------------------------------------------------------}
procedure TParticleClass.SetGravityWell(Index: Integer; const Value: TGravityWell);
begin
  if (GravityWellList <> nil) and (Index > -1) and (Index <= GravityWellList.Count-1) then
    TGravityWell(TGravityWellPtr(GravityWellList.Items[Index])^) := Value;
end;
{--------------------------------------------------------------------------------------------}
end.
	
*/