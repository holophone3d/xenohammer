#include "Sound.h"


//sample sound buffer variables
CL_SoundBuffer *sfx_playerShipFire;
CL_SoundBuffer *sfx_playerShipRapidFire;
CL_SoundBuffer *sfx_playerShipEngine;
CL_SoundBuffer *sfx_enemyGunShipFire;
CL_SoundBuffer *sfx_enemyLightShipFire;
CL_SoundBuffer *sfx_explosion;
CL_SoundBuffer *sfx_spaceAmbient;
CL_SoundBuffer *sfx_backgroundMusic;
CL_SoundBuffer *sfx_bossBackgroundMusic;
CL_SoundBuffer *sfx_bossNear;
CL_SoundBuffer *sfx_resourceCollected;
CL_SoundBuffer *sfx_GUI;
CL_SoundBuffer *sfx_GUIMouseClick;

//sample sound session variables
CL_SoundBuffer_Session sfx_backgroundMusicSoundBuffer;
CL_SoundBuffer_Session sfx_bossBackgroundMusicSoundBuffer;
CL_SoundBuffer_Session sfx_bossNearSoundBuffer;
CL_SoundBuffer_Session sfx_playerShipEngineSoundBuffer;
CL_SoundBuffer_Session sfx_playerShipFireSoundBuffer;
CL_SoundBuffer_Session sfx_playerShipRapidFireSoundBuffer;
CL_SoundBuffer_Session sfx_enemyGunShipFireSoundBuffer;
CL_SoundBuffer_Session sfx_enemyLightShipFireSoundBuffer;
CL_SoundBuffer_Session sfx_explosionSoundBuffer;
CL_SoundBuffer_Session sfx_spaceAmbientSoundBuffer;
CL_SoundBuffer_Session sfx_resourceCollectedSoundBuffer;
CL_SoundBuffer_Session sfx_GUISoundBuffer;
CL_SoundBuffer_Session sfx_GUIMouseClickSoundBuffer;


void Sound::init_sound(CL_ResourceManager *sfx_resources)
{

	//Load sounds
	sfx_playerShipFire = CL_SoundBuffer::load("Game/Sound/sfx_playerShipFire", sfx_resources);
	sfx_playerShipRapidFire = CL_SoundBuffer::load("Game/Sound/sfx_playerShipRapidFire", sfx_resources);
	sfx_enemyLightShipFire = CL_SoundBuffer::load("Game/Sound/sfx_enemyLightShipFire", sfx_resources);
	sfx_enemyGunShipFire = CL_SoundBuffer::load("Game/Sound/sfx_enemyGunShipFire", sfx_resources);
	sfx_explosion = CL_SoundBuffer::load("Game/Sound/sfx_explosion", sfx_resources);
	sfx_spaceAmbient = CL_SoundBuffer::load("Game/Sound/sfx_spaceAmbient", sfx_resources);
	sfx_playerShipEngine = CL_SoundBuffer::load("Game/Sound/sfx_playerShipEngine", sfx_resources);
	sfx_resourceCollected = CL_SoundBuffer::load("Game/Sound/sfx_resourceCollected", sfx_resources);
	sfx_backgroundMusic = new CL_SoundBuffer(new CL_VorbisSoundProvider("Level2.ogg", sfx_resources),true);
	sfx_bossBackgroundMusic = new CL_SoundBuffer(new CL_VorbisSoundProvider("BossTEST.ogg", sfx_resources),true);
	sfx_bossNear = CL_SoundBuffer::load("Game/Sound/sfx_bossNear", sfx_resources);
	sfx_GUI = CL_SoundBuffer::load("Game/Sound/sfx_GUI", sfx_resources);
	sfx_GUIMouseClick = CL_SoundBuffer::load("Game/Sound/sfx_GUIMouseClick", sfx_resources);



/*	vol = sfx_enemyLightShipFire->get_volume();
	sfx_enemyLightShipFire->set_volume(vol*0.1f);

	vol = sfx_enemyGunShipFire->get_volume();
	sfx_enemyGunShipFire->set_volume(vol*0.1f);

	vol = sfx_explosion->get_volume();
	sfx_explosion->set_volume(vol*0.1f);

	vol = sfx_playerShipEngine->get_volume();
	sfx_playerShipEngine->set_volume(vol*0.1f);

	vol = sfx_resourceCollected->get_volume();
	sfx_resourceCollected->set_volume(vol*0.1f);

	vol = sfx_GUI->get_volume();
	sfx_GUI->set_volume(vol*0.6f);
*/
}

void Sound::lowerBossBackgroundMusic()
{
	sfx_bossBackgroundMusicSoundBuffer.set_volume(2.0f);
}

/***************************** play sfx functions *******************************/
void Sound::playPlayerShipFire()
{
	if(sfx_playerShipFireSoundBuffer.is_playing() == true){
		
		// stop the single shot sound from finishing
		sfx_playerShipFireSoundBuffer.stop();

		// play and loop the rapid gun fire sound
		sfx_playerShipRapidFireSoundBuffer = sfx_playerShipRapidFire->play(true);
		

		// set the sound buffer of the single shot with the rapid shot
		// so that we don't play multiple rapid fire sounds at once
		sfx_playerShipFireSoundBuffer = sfx_playerShipRapidFireSoundBuffer;
	}
	else{
		sfx_playerShipFireSoundBuffer = sfx_playerShipFire->play();
		
	}
}

void Sound::playEnemyLightFighterFire()
{
	sfx_enemyLightShipFireSoundBuffer = sfx_enemyLightShipFire->play();
}

void Sound::playEnemyGunShipFire()
{
	sfx_enemyGunShipFireSoundBuffer = sfx_enemyGunShipFire->play();
	sfx_enemyGunShipFireSoundBuffer.set_volume(sfx_enemyGunShipFireSoundBuffer.get_volume()/2);
}

void Sound::playExplosionSound()
{
	sfx_explosionSoundBuffer = sfx_explosion->play();
}

void Sound::playResourceCollectedSound()
{
	sfx_resourceCollectedSoundBuffer = sfx_resourceCollected->play();
}

void Sound::playAmbientBackgroundSound()
{
	sfx_spaceAmbientSoundBuffer = sfx_spaceAmbient->play(true);
}

void Sound::playPlayerEngineSound()
{
	sfx_playerShipEngineSoundBuffer = sfx_playerShipEngine->play(true);
}

void Sound::playGUIMouseOverSound()
{
	sfx_GUISoundBuffer = sfx_GUI->play();
}

void Sound::playGUIMouseClick()
{
	sfx_GUIMouseClickSoundBuffer = sfx_GUIMouseClick->play();
}

void Sound::playBackgroundMusic()
{
	sfx_backgroundMusicSoundBuffer = sfx_backgroundMusic->play();
	sfx_backgroundMusicSoundBuffer.set_volume(4.0f);
}

void Sound::playBossBackgroundMusic()
{
	if(sfx_backgroundMusicSoundBuffer.is_playing() == true)
		Sound::stopBackgroundMusic();

	if(sfx_bossBackgroundMusicSoundBuffer.is_playing() == false){
		sfx_bossBackgroundMusicSoundBuffer = sfx_bossBackgroundMusic->play();
		sfx_bossBackgroundMusicSoundBuffer.set_volume(4.0f);
	}
}

void Sound::playBossNear()
{
	sfx_bossNearSoundBuffer = sfx_bossNear->play();
	sfx_bossNearSoundBuffer.set_volume(4.0f);
}

/*************************** end of play sfx functions **************************/

/***************************** stop sfx functions *******************************/
void Sound::stopPlayerShipFire()
{
	// if the rapid player gun fire is playing, play the final shots fire
	if(sfx_playerShipRapidFireSoundBuffer.is_playing() == true){
		sfx_playerShipRapidFireSoundBuffer.stop();
		sfx_playerShipFireSoundBuffer = sfx_playerShipFire->play();
	}
}

void Sound::stopEnemyLightFighterFire()
{
	sfx_enemyLightShipFireSoundBuffer.stop();
}

void Sound::stopEnemyGunShipFire()
{
	sfx_enemyGunShipFireSoundBuffer.stop();
}

void Sound::stopAmbientBackgroundSound()
{
	sfx_spaceAmbientSoundBuffer.stop();
}

void Sound::stopPlayerEngineSound()
{
	sfx_playerShipEngineSoundBuffer.stop();
}

void Sound::stopBackgroundMusic()
{
	sfx_backgroundMusicSoundBuffer.stop();
}

void Sound::stopBossBackgroundMusic()
{
	sfx_bossBackgroundMusicSoundBuffer.stop();
}


/************************** end of stop sfx functions ***************************/