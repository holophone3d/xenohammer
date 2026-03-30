#ifndef SOUND_H
#define SOUND_H

#include "stdinclude.h"

class Sound
{
public:

	static void Sound::init_sound(CL_ResourceManager *sfx_resources);

	//play sfx function headers
	static void Sound::playBackgroundMusic();
	static void Sound::playBossBackgroundMusic();
	static void Sound::playBossNear();
	static void Sound::playPlayerShipFire();
	static void Sound::playEnemyLightFighterFire();
	static void Sound::playEnemyGunShipFire();
	static void Sound::playExplosionSound();
	static void Sound::playResourceCollectedSound();
	static void Sound::playAmbientBackgroundSound();
	static void Sound::playPlayerEngineSound();
	static void Sound::playGUIMouseOverSound();
	static void Sound::playGUIMouseClick();

	//stop sfx function headers
	static void Sound::stopBackgroundMusic();
	static void Sound::stopBossBackgroundMusic();
	static void Sound::stopPlayerShipFire();
	static void Sound::stopEnemyLightFighterFire();
	static void Sound::stopEnemyGunShipFire();
	static void Sound::stopAmbientBackgroundSound();
	static void Sound::stopPlayerEngineSound();

	//set sfx function headers
	static void Sound::lowerBossBackgroundMusic();

	//sound-fx resource manager
	//CL_ResourceManager *sfx_resources;


};

#endif