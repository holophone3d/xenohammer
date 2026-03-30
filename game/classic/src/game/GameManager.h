#ifndef GAMEMANAGER_H
#define GAMEMANAGER_H

#include "stdinclude.h"
#include "Display.h"
#include "StarField.h"
#include "Explosion.h"
#include "wave.h"
#include <ClanLib/gui.h>


#define LIGHT_FIGHTER 1


#define LEVEL_1_TIME 95000
#define LEVEL_2_TIME 95000
#define LEVEL_3_TIME 600000 // 10 minutes


class GameObject;
class GameObject_Sprite;
class PlayerShip;
class Projectile;
class EnemyShip;
class powerUp;
class CapitalShip;
class Frigate;
class ShipComponent;
class GameAnimation;
class TParticleClass;
class GL_Handler;
class Boss;




class GameManager : public CL_ClanApplication
{
	friend class GUI;
protected:


	int levelNum;

	// resources used to manage the project data (images, sounds, etc)
	CL_ResourceManager *resources;
	CL_ResourceManager *sfx_resources;
	CL_ResourceManager *gui_resources;

	CL_StyleManager *style;
	CL_ComponentManager *comp_manager;
	CL_GUIManager *gui;
	

	//animations for level entry/exit

	GameAnimation* level1_start;
	GameAnimation* level1_end;
	GameAnimation* level2_start;
	GameAnimation* level2_end;
	GameAnimation* level3_start;

	//animated ship to show engine power
	GameAnimation* speedShip;

	bool started;


	
	CL_Surface *console;

	CL_Surface *room_GUI;

	CL_Surface *room_Screen;

	CL_Surface *b_pressed;

	CL_Surface *b_unpressed;

	CL_Surface *exit_GUI_button;

	CL_Surface *cust_GUI;

	CL_Surface *startScreen;

	CL_Surface *gui_button;

	CL_Surface *buy_button;

	CL_Surface *speed_ship;

	CL_Surface *backstory;

	CL_Surface *aftermath;
	
	CL_Surface *cust_start;

	CL_Surface *lvl_briefing_1;

	CL_Surface *lvl_briefing_2;

	CL_Surface *lvl_briefing_3;

	CL_Surface *game_over;

	CL_Surface *left_turret_pannel;

	CL_Surface *right_turret_pannel;

	CL_Surface *turret_selector;

	CL_Surface *ship_specs;
	
	EnemyShip *lightFighterTemplate;
	EnemyShip *heavyFighterTemplate;
	EnemyShip *gunShipTemplate;
	
	EnemyShip *tempEnemy;

	int start_time;


	void init_display();
	void init_controls();
	void init_level(int level);
	void init_objects();
	void init_sound();
	void draw_world_objects();
	void draw_particle_systems();
	void collision_update();
	void updateWaves();

	void update_console();
	bool run_game(int level_time);
	int show_menu();
	void show_GUI();
	void on_button1_clicked();
	void cleanupWorld();

	

	void deinit();

public: 


	GameObject_Sprite *select_target();
	CL_Surface *ship_selected;
		// starfield for the background
	StarField		m_stars;
	int starSpeed;
	int difficulty;

	bool bossDestroyed;
	int bossDestroyTime;
	bool gameOver;
		bool bossMusicPlayed;

	float warningAlpha;
	bool warningAlphaIncrease;
	float bossAlpha;
	bool bossAlphaIncrease;
	bool isHoming;
	bool turret_angle_available;
	void make_particles(int x, int y);
	void make_engine(int x, int y, float intensity);
	void make_CapShipEngine(int x, int y, float intensity);

	TParticleClass* ParticleSystem;

	GL_Handler* GL_Controller;

	CL_Font *font;
	CL_Font *inactive_font;
	CL_Font *large_font;
	CL_Font *ingame_font;
	CL_Font *ingame_font_1;
	
	PlayerShip *Fighter;
	
	// a list of all game objects

	std::list<GameObject *> objects;
	// a list of all game objects
	std::list<Projectile *> enemy_projectiles;
	std::list<Projectile *> player_projectiles;
	std::list<EnemyShip *> lightFighters;
	std::list<Explosion *> explosions;
	std::list<Wave *> waveInfo;
	std::list<powerUp *> powerUps;
	std::list<CapitalShip *> capShips;


	ShipComponent *CapShipNoseTemplate;
	ShipComponent *CapShipRtTemplate;
	ShipComponent *CapShipLtTemplate;
	ShipComponent *GunTurretTemplate;
	Frigate   *CapShipBodyTemplate;


	ShipComponent *OuterNodeTemplate;
	ShipComponent *CenterNodeTemplate;
	ShipComponent *OrbTemplate;
	ShipComponent *PlatformRTemplate;
	ShipComponent *PlatformLTemplate;
	ShipComponent *PlatformDTemplate;
	Boss		*BossTemplate;


	Explosion *explosionTemplate;
	Explosion *bigExplosionTemplate;
	Projectile *blasterTemplate;
	Projectile *turretTemplate;
	Projectile *missleTemplate;
	Projectile *enemyFireTemplate;

	powerUp *powerUpTemplate;

	GameManager();
	~GameManager();

	// All the control information goes here
	// Abstract game input from physical input:
	CL_InputButton_Group *setting_1_button;
	CL_InputButton_Group *setting_2_button;
	CL_InputButton_Group *setting_3_button;
	CL_InputButton_Group *exit_button;
	CL_InputButton_Group *fire_button;
	CL_InputButton_Group *armor_button;
	CL_InputButton_Group *sheilds_button;
	CL_InputAxis_Group *hori_axis;
	CL_InputAxis_Group *vert_axis;
	CL_InputCursor *mouseInfo;

	/*
	//sample sound stuff
	CL_SoundBuffer *sfx_playerShipFire;
	CL_SoundBuffer *sfx_playerShipRapidFire;
	CL_SoundBuffer *sfx_playerShipEngine;
	CL_SoundBuffer *sfx_enemyGunShipFire;
	CL_SoundBuffer *sfx_enemyLightShipFire;
	CL_SoundBuffer *sfx_explosion;
	CL_SoundBuffer *sfx_spaceAmbient;
	CL_SoundBuffer *sfx_backgroundMusic;
	CL_SoundBuffer *sfx_resourceCollected;
	CL_SoundBuffer *sfx_GUI;
	
	//sample sound session variables
	CL_SoundBuffer_Session sfx_backgroundMusicSoundBuffer;
	CL_SoundBuffer_Session sfx_playerShipEngineSoundBuffer;
	*/


	void show(); // draw the world.
	void update(float time_elapsed); // run the world.

	void wait( float time_delay)
	{
		int startTime, currTime;
		startTime = currTime = CL_System::get_time();
		
		while( time_delay*1000 > currTime - startTime)
		{
			//draw_world_objects();
		    //collision_update();
			CL_System::sleep(5);
			CL_Display::flip_display();	
			CL_System::keep_alive();
			currTime = CL_System::get_time();
		}
	}

	void create_wave( int wave_count, int wave_type, int _x, int _y); 
	


	CL_ResourceManager *get_resources(){ return resources; };
	virtual const char *get_title();
	virtual int main(int argc, char** argv);



};

#endif