#include "explosionGenerator.h"
#include "GameManager.h"

// generates "trails" of explosions
void explosionGenerator::MakeExplosions(int SourceX, int SourceY, int _dx, int _dy, GameManager* _manager)
{
	int trailnum, explosionnum;
	double TrailVelocityX, TrailVelocityY, TrailPositionX, TrailPositionY;

//	_manager->make_particles(SourceX, SourceY); 
	// loop through the total number of trails that we're going to generate
	for(trailnum = 0; trailnum < TRAIL_COUNT; trailnum++)
	{
		// initialize this trail

		// first determine velocity (random direction)
		double TrailDirection, TrailSpeed;
		TrailDirection = rnd() * 2 * PI; // get a random direction, in radians
		TrailSpeed = (rnd() + 0.5) * (EXPLOSION_SIZE / 4); // get a random speed
		TrailVelocityX = TrailSpeed * cos( TrailDirection );
		TrailVelocityY = -TrailSpeed * sin( TrailDirection );

		// setup trail position
		TrailPositionX = SourceX;
		TrailPositionY = SourceY;


		// generate the correct number of explosions for this trail
		for(explosionnum = 0; explosionnum < TRAIL_LENGTH; explosionnum++)
		{
			// first move our trail position
			TrailPositionX += TrailVelocityX;
			TrailPositionY += TrailVelocityY;

			// account for "gravity", so we get a parabolic trajectory
			TrailVelocityY += EXPLOSION_SIZE / 16;

			// create the explosion with the position and a delay factor based on how
			// far down the trail we are	
		
			_manager->explosions.push_back( new Explosion((int)TrailPositionX,(int)TrailPositionY, _manager) );

			_manager->explosions.back()->template_copy( _manager->explosionTemplate );
			_manager->explosions.back()->set_curr_frame( -explosionnum*2 );
			//make the explosions move a little
			_manager->explosions.back()->set_velocity( _dx/2, _dy/2 );

		}

		

	}

	// done
			_manager->explosions.push_back( new Explosion(SourceX -48,
											SourceY - 48,
											_manager) );

			_manager->explosions.back()->template_copy( _manager->bigExplosionTemplate );
			_manager->explosions.back()->set_curr_frame( 0 );
			//make the explosions move a little
			_manager->explosions.back()->set_velocity( _dx/4, _dy/4 );


}