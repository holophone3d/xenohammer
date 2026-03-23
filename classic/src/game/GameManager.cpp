/**********************************************************
*
* Game Manager.cpp
* This class is the main class that handles initialization
* loading and state information in the game
*
*
* Created 8/31/2001 Brian Smith
**********************************************************/

#include "GameManager.h"
#include "GameObject.h"
#include "PlayerShip.h"
#include "EnemyShip.h"
#include "caimagemanipulation.h"
#include "Console.h"
#include "Collision.h"
#include "ExplosionGenerator.h"
#include "PowerUp.h"
#include "ShipComponent.h"
#include "CapitalShip.h"
#include "CapitalShip_Frigate.h"
#include "Boss.h"
#include "GUI.h"
#include "GameAnimation.h"
#include "TParticleClass.h"
#include "GL_Handler.h"
#include "Sound.h"




GameManager app;

GameManager::GameManager(){}
GameManager::~GameManager(){}


char *GameManager::get_title()
{
	return "Codename: XenoHammer";
}


/*
* Main - overloaded from Clanlib to run the program
*
*/
int GameManager::main(int argc,char** argv)
{
	
	started = false;
	// Open a console for debugging purposes
	CL_ConsoleWindow console("Codename: XenoHammer");
	console.redirect_stdio();
	
	try
	{
		cout << "Codename: XenoHammer" << endl;
		
		
		CL_SetupCore::init();
		CL_SetupGL::init();
		CL_SetupDisplay::init();
		CL_SetupGUI::init();
		CL_TTFSetup::init();
		CL_SetupSound::init();
		
		
		
		init_display();
		init_controls();
		
		init_objects();
		
		Sound::init_sound(sfx_resources);
		
		//set level to 0
		levelNum = 0;
		
		
		//font->change_size(26);
		
		int run_game_start = 1;
		
		
		
		while( run_game_start == 1 )
		{
			//initialize the level we are about to play
			
			run_game_start = show_menu();
			init_level(levelNum);
			//player wants to save and exit
			if( run_game_start == 0 )
			{
				//	Fighter->save_shipInfo();
				// SHUTDOWN 
				deinit();
				return 0;
			}
		
			//player wants to play
			else
			{
				switch(levelNum)
				{
				case 0:
					run_game(LEVEL_1_TIME);
					break;
				case 1:
					run_game(LEVEL_2_TIME);
					break;
				default:
					run_game(LEVEL_3_TIME);
					break;
				}
			}
			
		}
		
	}
	catch (CL_Error err)
	{
		std::cout << "Error: " << err.message.c_str() << std::endl;
		
		// Display console close message and wait for a key
		console.display_close_message();
	} 
	return 0;
}

void GameManager::init_display()
{
	// Set videomode resolution and bpp (bits per pixel) - not fullscreen
	CL_Display::set_videomode(SCREEN_WIDTH, SCREEN_HEIGHT, PIXEL_DEPTH, true);
	
	
	// Make sure the display is black at startup:
	CL_Display::clear_display();
	
	
	GL_Controller = new GL_Handler();
	GL_Controller->InitGL();
	
	//start drawing 2d only
	CL_OpenGL::begin_2d();
	
	
	
}

void GameManager::init_objects()
{
	int x = CL_Display::get_width()/2;
	int y = CL_Display::get_height()/2;
	
	// *** working with some resource code here
	resources = new CL_ResourceManager("gameproject.txt", false);
	sfx_resources = new CL_ResourceManager("sfx_resources.txt", false);
	gui_resources = new CL_ResourceManager("gui_r.txt", false);
	style = new CL_StyleManager_Default(resources);
	gui = new CL_GUIManager(style);
	comp_manager = CL_ComponentManager::create("frametest.gui", false, style, gui);
	ship_selected = CL_Surface::load("Game/Graphics/ship_selected", resources);
    
	font = CL_Font::load("Fonts/fnt_clansoft",gui_resources);
	large_font = CL_Font::load("Fonts/fnt_large",gui_resources);
	inactive_font = CL_Font::load("Fonts/fnt_inactive",gui_resources);
	ingame_font = CL_Font::load("Fonts/fnt_ingame",gui_resources);
	ingame_font_1 = CL_Font::load("Fonts/fnt_ingame_1",gui_resources);
	
	game_over =  CL_Surface::load("Graphics/game_over", gui_resources);
	
	font->change_colour(0,255,0,255);
	font->change_size(18);
	
	inactive_font->change_colour(155,155,155,255);
	inactive_font->change_size(18);
	
	large_font->change_colour(0,255,0,255);
	large_font->change_size(26);
	
	// load the console art
	console = CL_Surface::load("Game/Graphics/console", resources);
	
	//set difficulty and speed variables
	difficulty =1;
	starSpeed =30;
	bossDestroyed = false;
	gameOver = false;
	bossDestroyTime = 0;
	bossMusicPlayed = false;
	
	// create a new player ship at roughly the center of the screen
	Fighter = new PlayerShip(300, HEAVY_ARMOR, x, y, this);
	// add all of the frames of animation to the ship
	Fighter->add_frame("Game/Graphics/playerShip00");
	Fighter->add_frame("Game/Graphics/playerShip01");
	Fighter->add_frame("Game/Graphics/playerShip02");
	Fighter->add_frame("Game/Graphics/playerShip03");
	Fighter->add_frame("Game/Graphics/playerShip04");
	Fighter->add_frame("Game/Graphics/playerShip05");
	Fighter->add_frame("Game/Graphics/playerShip06");
	Fighter->add_frame("Game/Graphics/playerShip07");
	Fighter->add_frame("Game/Graphics/playerShip08");
	Fighter->add_frame("Game/Graphics/playerShip09");
	Fighter->add_frame("Game/Graphics/playerShip10");
	Fighter->add_frame("Game/Graphics/playerShip11");
	Fighter->add_frame("Game/Graphics/playerShip12");
	Fighter->add_frame("Game/Graphics/playerShip13");
	Fighter->add_frame("Game/Graphics/playerShip14");
	Fighter->add_frame("Game/Graphics/playerShip15");
	Fighter->add_frame("Game/Graphics/playerShip16");
	
	//the small ship that shows the speed on the GUI
	// X and Y are "magic numbers" found in jasons GUI code
	
	speedShip = new GameAnimation( 610, (SHIELDS_Y_POS - 56), this);
	speedShip->add_frame("Game/Graphics/speed_ship");	
	
	
	// set up light fighter template
	lightFighterTemplate = new EnemyShip(0, 1, 0,  0, 0, LIGHTFIGHTER, this);
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF00");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF01");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF02");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF03");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF04");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF05");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF06");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF07");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF08");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF09");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF10");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF11");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF12");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF13");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF14");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF15");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF16");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF17");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF18");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF19");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF20");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF21");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF22");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF23");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF24");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF25");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF26");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF27");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF28");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF29");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF30");
	lightFighterTemplate->add_frame("Game/Graphics/enemyLightF31");
	
	// set up heavy fighter template
	heavyFighterTemplate = new EnemyShip(0, 1, 0,  0, 0, LIGHTFIGHTER, this);
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB00");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB01");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB02");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB03");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB04");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB05");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB06");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB07");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB08");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB09");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB10");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB11");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB12");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB13");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB14");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB15");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB16");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB17");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB18");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB19");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB20");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB21");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB22");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB23");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB24");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB25");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB26");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB27");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB28");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB29");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB30");
	heavyFighterTemplate->add_frame("Game/Graphics/enemyFighterB31");
	
	
	gunShipTemplate = new EnemyShip(0, 1, 0,  0, 0, GUNSHIP, this);
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip00");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip01");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip02");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip03");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip04");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip05");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip06");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip07");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip08");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip09");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip10");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip11");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip12");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip13");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip14");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip15");
	gunShipTemplate->add_frame("Game/Graphics/enemyGunShip16");
	
	
	explosionTemplate =  new Explosion(0,0, this);
	explosionTemplate->add_frame( "Game/Graphics/explosion00" );
	explosionTemplate->add_frame( "Game/Graphics/explosion01" );
	explosionTemplate->add_frame( "Game/Graphics/explosion02" );
	explosionTemplate->add_frame( "Game/Graphics/explosion03" );
	explosionTemplate->add_frame( "Game/Graphics/explosion04" );
	explosionTemplate->add_frame( "Game/Graphics/explosion05" );
	explosionTemplate->add_frame( "Game/Graphics/explosion06" );
	explosionTemplate->add_frame( "Game/Graphics/explosion07" );
	explosionTemplate->add_frame( "Game/Graphics/explosion08" );
	explosionTemplate->add_frame( "Game/Graphics/explosion09" );
	explosionTemplate->add_frame( "Game/Graphics/explosion10" );
	explosionTemplate->add_frame( "Game/Graphics/explosion11" );
	explosionTemplate->add_frame( "Game/Graphics/explosion12" );
	explosionTemplate->add_frame( "Game/Graphics/explosion13" );
	explosionTemplate->add_frame( "Game/Graphics/explosion14" );
	explosionTemplate->add_frame( "Game/Graphics/explosion15" );
	
	bigExplosionTemplate = new Explosion(0,0,this);
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion00" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion01" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion02" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion03" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion04" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion05" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion06" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion07" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion08" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion09" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion10" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion11" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion12" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion13" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion14" );
	bigExplosionTemplate->add_frame( "Game/Graphics/Bigexplosion15" );
	
	
	// set up templates for the weapons
	blasterTemplate = new Projectile(0,0, 1, 0, 0, this);
	blasterTemplate->add_frame("Game/Graphics/EnergyBlast0");
	blasterTemplate->add_frame("Game/Graphics/EnergyBlast1");
	blasterTemplate->add_frame("Game/Graphics/EnergyBlast2");
	blasterTemplate->add_frame("Game/Graphics/EnergyBlast3");
	blasterTemplate->add_frame("Game/Graphics/EnergyBlast4");
	
	turretTemplate = new Projectile(0,0, 2, 0, 0, this);
	turretTemplate->add_frame("Game/Graphics/EnergyBullet0");
	turretTemplate->add_frame("Game/Graphics/EnergyBullet1");
	turretTemplate->add_frame("Game/Graphics/EnergyBullet2");
	turretTemplate->add_frame("Game/Graphics/EnergyBullet3");
	turretTemplate->add_frame("Game/Graphics/EnergyBullet4");
	
	missleTemplate = new Projectile(0,0, 3, 0, 0, this);
	missleTemplate->add_frame("Game/Graphics/EnergyMissle0");
	missleTemplate->add_frame("Game/Graphics/EnergyMissle1");
	missleTemplate->add_frame("Game/Graphics/EnergyMissle2");
	missleTemplate->add_frame("Game/Graphics/EnergyMissle3");
	missleTemplate->add_frame("Game/Graphics/EnergyMissle4");
	
	
	enemyFireTemplate = new Projectile(0,0,4,0,0,this);
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast0");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast1");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast2");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast3");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast4");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast5");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast6");
	enemyFireTemplate->add_frame("Game/Graphics/EnemyBlast8");
	
	
	
	//build the needed capital ship stuff
	
	CapShipBodyTemplate =  new Frigate(this);
	CapShipBodyTemplate->add_frame("Game/Graphics/CapShipBody");
	
	CapShipNoseTemplate = new ShipComponent(0, 64, true, 500,500, CapShipBodyTemplate, this);
	CapShipNoseTemplate->add_frame("Game/Graphics/CapShipNose");
	CapShipNoseTemplate->add_frame("Game/Graphics/CapShipNoseDest");
	
	CapShipRtTemplate  = new ShipComponent(0, 64, true, 500,500, CapShipBodyTemplate, this);
	CapShipRtTemplate->add_frame("Game/Graphics/CapShipLt");
	CapShipRtTemplate->add_frame("Game/Graphics/CapShipLtDest");
	
	CapShipLtTemplate  = new ShipComponent(0, 64, true, 500,500, CapShipBodyTemplate, this);
	CapShipLtTemplate->add_frame("Game/Graphics/CapShipRt");
	CapShipLtTemplate->add_frame("Game/Graphics/CapShipRtDest");
	
	GunTurretTemplate = new ShipComponent(0, 64, true, 500,500, CapShipBodyTemplate, this);
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret00");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret01");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret02");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret03");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret04");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret05");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret06");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret07");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret08");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret09");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret10");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret11");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret12");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret13");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret14");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret15");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret16");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret17");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret18");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret19");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret20");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret21");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret22");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret23");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret24");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret25");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret26");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret27");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret28");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret29");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret30");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turret31");
	GunTurretTemplate->add_frame("Game/Graphics/gun_turretDest");
	
	powerUpTemplate = new powerUp(0,0,0,0,this);
	powerUpTemplate->add_frame( "Game/Graphics/powerUp" );
	
	// animations for the boss
	BossTemplate =  new Boss(this);
	CenterNodeTemplate = new ShipComponent(0,0,true,500,500,BossTemplate, this);
	CenterNodeTemplate->add_frame("Game/Graphics/node1");
	CenterNodeTemplate->add_frame("Game/Graphics/node1Dest"); 
	
	OuterNodeTemplate = new ShipComponent(0,0,true,500,500,BossTemplate, this);
	OuterNodeTemplate->add_frame("Game/Graphics/node2");
	
	PlatformRTemplate = new ShipComponent(0,0,true,500,500,BossTemplate, this);
	PlatformRTemplate->add_frame("Game/Graphics/platformr");
	PlatformLTemplate = new ShipComponent(0,0,true,500,500,BossTemplate, this);
	PlatformLTemplate->add_frame("Game/Graphics/platforml");
	PlatformDTemplate = new ShipComponent(0,0,true,500,500,BossTemplate, this);
	PlatformDTemplate->add_frame("Game/Graphics/platformd");
	
	OrbTemplate = new ShipComponent(0,0,true,500,500,BossTemplate,this);
	OrbTemplate->add_frame("Game/Graphics/node_orb00");
	OrbTemplate->add_frame("Game/Graphics/node_orb01");
	OrbTemplate->add_frame("Game/Graphics/node_orb02");
	OrbTemplate->add_frame("Game/Graphics/node_orb03");
	OrbTemplate->add_frame("Game/Graphics/node_orb04");
	OrbTemplate->add_frame("Game/Graphics/node_orb05");
	OrbTemplate->add_frame("Game/Graphics/node_orb06");
	OrbTemplate->add_frame("Game/Graphics/node_orb07");
	OrbTemplate->add_frame("Game/Graphics/node_orb08");
	OrbTemplate->add_frame("Game/Graphics/node_orb09");
	OrbTemplate->add_frame("Game/Graphics/node_orb10");
	OrbTemplate->add_frame("Game/Graphics/node_orb11");
	OrbTemplate->add_frame("Game/Graphics/node_orb12");
	OrbTemplate->add_frame("Game/Graphics/node_orb13");
	OrbTemplate->add_frame("Game/Graphics/node_orb14");
	OrbTemplate->add_frame("Game/Graphics/node_orb15");
	OrbTemplate->add_frame("Game/Graphics/node_orb16");
	OrbTemplate->add_frame("Game/Graphics/node_orb17");
	OrbTemplate->add_frame("Game/Graphics/node_orb18");
	OrbTemplate->add_frame("Game/Graphics/node_orb19");
	OrbTemplate->add_frame("Game/Graphics/node_orb20");
	OrbTemplate->add_frame("Game/Graphics/node_orb21");
	OrbTemplate->add_frame("Game/Graphics/node_orb22");
	OrbTemplate->add_frame("Game/Graphics/node_orb23");
	OrbTemplate->add_frame("Game/Graphics/node_orb24");
	OrbTemplate->add_frame("Game/Graphics/node_orb25");
	OrbTemplate->add_frame("Game/Graphics/node_orb26");
	OrbTemplate->add_frame("Game/Graphics/node_orb27");
	OrbTemplate->add_frame("Game/Graphics/node_orb28");
	OrbTemplate->add_frame("Game/Graphics/node_orb29");
	OrbTemplate->add_frame("Game/Graphics/node_orb30");
	OrbTemplate->add_frame("Game/Graphics/node_orb31");
	OrbTemplate->add_frame("Game/Graphics/node_orb32");
	
	//animations for level start/end
	level1_start = new GameAnimation(253, 200, this);
	level1_start->add_frame("Game/Graphics/level_anim_1");
	level1_start->add_frame("Game/Graphics/level_anim_2");
	level1_start->add_frame("Game/Graphics/level_anim_3");
	level1_start->add_frame("Game/Graphics/level_anim_4");
	level1_start->add_frame("Game/Graphics/level_anim_5");
	level1_start->add_frame("Game/Graphics/level_anim_6");
	level1_start->add_frame("Game/Graphics/level_anim_7");
	level1_start->add_frame("Game/Graphics/level_anim_8");
	
	level1_end =  new GameAnimation(223, 200,this);
	level1_end->add_frame("Game/Graphics/level_anim_1");
	level1_end->add_frame("Game/Graphics/level_anim_9");
	level1_end->add_frame("Game/Graphics/level_anim_10");
	level1_end->add_frame("Game/Graphics/level_anim_11");
	level1_end->add_frame("Game/Graphics/level_anim_12");
	level1_end->add_frame("Game/Graphics/level_anim_13");
	level1_end->add_frame("Game/Graphics/level_anim_14");
	level1_end->add_frame("Game/Graphics/level_anim_15");
	level1_end->add_frame("Game/Graphics/level_anim_16");
	level1_end->add_frame("Game/Graphics/level_anim_17");
	level1_end->add_frame("Game/Graphics/level_anim_18");
	level1_end->add_frame("Game/Graphics/level_anim_19");
	level1_end->add_frame("Game/Graphics/level_anim_20");
	level1_end->add_frame("Game/Graphics/level_anim_21");
	level1_end->add_frame("Game/Graphics/level_anim_22");
	
	level2_start = new GameAnimation(253, 200, this);
	level2_start->add_frame("Game/Graphics/level_anim_1");
	level2_start->add_frame("Game/Graphics/level_anim_2");
	level2_start->add_frame("Game/Graphics/level_anim_3");
	level2_start->add_frame("Game/Graphics/level_anim_4");
	level2_start->add_frame("Game/Graphics/level_anim_5");
	level2_start->add_frame("Game/Graphics/level_anim_6");
	level2_start->add_frame("Game/Graphics/level_anim_7");
	level2_start->add_frame("Game/Graphics/level_anim_2_start");

	level3_start = new GameAnimation(253, 200, this);
	level3_start->add_frame("Game/Graphics/level_anim_1");
	level3_start->add_frame("Game/Graphics/level_anim_2");
	level3_start->add_frame("Game/Graphics/level_anim_3");
	level3_start->add_frame("Game/Graphics/level_anim_4");
	level3_start->add_frame("Game/Graphics/level_anim_5");
	level3_start->add_frame("Game/Graphics/level_anim_6");
	level3_start->add_frame("Game/Graphics/level_anim_7");
	level3_start->add_frame("Game/Graphics/level_anim_3_start");
	
	level2_end =  new GameAnimation(223, 200,this);
	level2_end->add_frame("Game/Graphics/level_anim_1");
	level2_end->add_frame("Game/Graphics/level_anim_9");
	level2_end->add_frame("Game/Graphics/level_anim_10");
	level2_end->add_frame("Game/Graphics/level_anim_11");
	level2_end->add_frame("Game/Graphics/level_anim_12");
	level2_end->add_frame("Game/Graphics/level_anim_13");
	level2_end->add_frame("Game/Graphics/level_anim_14");
	level2_end->add_frame("Game/Graphics/level_anim_15");
	level2_end->add_frame("Game/Graphics/level_anim_16");
	level2_end->add_frame("Game/Graphics/level_anim_17");
	level2_end->add_frame("Game/Graphics/level_anim_18");
	level2_end->add_frame("Game/Graphics/level_anim_19");
	level2_end->add_frame("Game/Graphics/level_anim_20");
	level2_end->add_frame("Game/Graphics/level_anim_21");
	level2_end->add_frame("Game/Graphics/level_anim_2_end");
	
	starSpeed = 30;
}

void GameManager::create_wave( int wave_count, int wave_type, int _x, int _y)
{
	
	
	for( int i=0; i < wave_count; i++){
		if(wave_type == 0)
		{
			lightFighters.push_back(new EnemyShip(0, 10, i,  _x + i, -(i*64), LIGHTFIGHTER, this));
			//add the animations for the specific fighters
			lightFighters.back()->template_copy( lightFighterTemplate );
		}
		else if(wave_type == 1)
		{
			lightFighters.push_back(new EnemyShip(0, 30, i,  _x + i, -(i*64), HEAVYFIGHTER, this));
			//add the animations for the specific fighters
			lightFighters.back()->template_copy( heavyFighterTemplate );
		}
	}
	
	if(StarField::rnd() > 0.7f){ 
		lightFighters.push_back(new EnemyShip(0, 100, 0 /* wave position isn't used for gunships */,  _x , -128, GUNSHIP, this));
		lightFighters.back()->template_copy( gunShipTemplate );
	}
	
	
	// we want to create a capital ship
	if( wave_type == 3 ){
		capShips.push_back(new Frigate(300, -300,this) );
	}
	
	if( wave_type == 4){
		capShips.push_back(new Boss(245,-600,this) );
	}
	
	
	
	
}

void GameManager::init_level(int level)
{
	int num_ships;

	if( difficulty == 0)
	{
		num_ships = -2;
	}			
	else if( difficulty == 1)
	{
		num_ships = 0;
	}
	else if( difficulty == 2)
	{
		num_ships = 2;
	}
	else if( difficulty == 3)
	{
		num_ships = 5;
	}

	if( level == 0)
	{
		//load all needed data
		
		//build all the waves we want to throw at the player 
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 200, 0, 6 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 225, 0, 9 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 25,  0, 9 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 500, 0, 14 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 75,  0, 14 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 75,  0, 16 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 0,   0, 20 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 405, 0, 21 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 50,  0, 22 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 300, 0, 23 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 480, 0, 24 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 25,  0, 25 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 425, 0, 25 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 250, 0, 28 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 50,  0, 28 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 450, 0, 32 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 40,  0, 32 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 200, 0, 36 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 38 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 250, 0, 38 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 500, 0, 38 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 250, 0, 42 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 100, 0, 45 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 200, 0, 45 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 300, 0, 45 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 250, 0, 47 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 220, 0, 47 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 220, 0, 50 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 500, 0, 51 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 100, 0, 55 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 150, 0, 58 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 300, 0, 58 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 60 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 600, 0, 60 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 440, 0, 65 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 0  , 0, 65 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 300, 0, 70 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 500, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 100, 0, 77 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 300, 0, 77 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 200, 0, 77 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 500, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 300, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 50,  0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 50, 0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 250, 0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 450, 0, 85 ) );
		
		
		
		
	}
	else if( level == 1)
	{
		waveInfo.push_back( new Wave( num_ships+5, 0, 0,   0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 600, 0, 6 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 600, 0, 9 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 13 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 600, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 0,   0, 18 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 600, 0, 18 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 600, 0, 21 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 25 ) );
		//CREATE CAP SHIP
		waveInfo.push_back( new Wave( num_ships+1, 3, 300, -300, 28 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1,   0, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 600, 0, 30 ) );
		//just create regular units again
		waveInfo.push_back( new Wave( num_ships+3, 0,   0, 0, 42 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 600, 0, 42 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0,   0, 0, 50 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 600, 0, 50 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1,   0, 0, 56 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 600, 0, 56 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1,   0, 0, 59 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 600, 0, 59 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0,   0, 0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+5, 1, 300, 0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 600, 0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1,   0, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 300, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 600, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+8, 0, 300, 0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+10,1, 0,   0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+10,1, 600, 0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 0,   0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 100, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 200, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 300, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 400, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 500, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 50,  0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 250, 0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 450, 0, 85 ) );
		
	}
	else if( level == 2)
	{
		
	
		capShips.push_back(new Boss(245,-600,this) );
	
		waveInfo.push_back( new Wave( num_ships+4, 1, 0,   0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 100, 0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+8, 1, 200, 0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+8, 1, 300, 0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 400, 0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 500, 0, 5 ) );
		waveInfo.push_back( new Wave( num_ships+5, 1, 300, 0, 8 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 100, 0, 10 ) );
		waveInfo.push_back( new Wave( num_ships+5, 1, 250, 0, 12 ) );
		waveInfo.push_back( new Wave( num_ships+9, 1, 0,   0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 100, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+9, 1, 200, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 300, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+9, 0, 400, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 500, 0, 15 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 500, 0, 20 ) );
		waveInfo.push_back( new Wave( num_ships+6, 0, 500, 0, 22 ) );
		waveInfo.push_back( new Wave( num_ships+7, 1, 500, 0, 24 ) );
		waveInfo.push_back( new Wave( num_ships+8, 0, 500, 0, 28 ) );
		waveInfo.push_back( new Wave( num_ships+9, 1, 0,   0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+8, 0, 100, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+7, 1, 200, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+7, 1, 300, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+8, 0, 400, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+9, 1, 500, 0, 30 ) );
		waveInfo.push_back( new Wave( num_ships+3, 1, 500, 0, 34 ) );
		waveInfo.push_back( new Wave( num_ships+3, 1, 500, 0, 34 ) );
		waveInfo.push_back( new Wave( num_ships+6, 1, 500, 0, 38 ) );
		waveInfo.push_back( new Wave( num_ships+9, 1, 500, 0, 42 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 0,   0, 45 ) );
		waveInfo.push_back( new Wave( num_ships+4, 0, 100, 0, 45 ) );
		waveInfo.push_back( new Wave( num_ships+6, 1, 200, 0, 50 ) );
		waveInfo.push_back( new Wave( num_ships+6, 1, 300, 0, 50 ) );
		waveInfo.push_back( new Wave( num_ships+5, 0, 400, 0, 60 ) );
		waveInfo.push_back( new Wave( num_ships+5, 1, 500, 0, 60 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 0,   0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+5, 1, 300, 0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 600, 0, 66 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 0,   0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+3, 0, 300, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 600, 0, 72 ) );
		waveInfo.push_back( new Wave( num_ships+8, 0, 300, 0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+10,1, 0,   0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+10,1, 600, 0, 76 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 0,   0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 100, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 200, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 300, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 0, 400, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+2, 1, 500, 0, 79 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 50, 0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 250, 0, 85 ) );
		waveInfo.push_back( new Wave( num_ships+4, 1, 450, 0, 85 ) );
		
	}
}

void GameManager::init_controls()  
{
	setting_1_button = new CL_InputButton_Group;
	setting_2_button = new CL_InputButton_Group;
	setting_3_button = new CL_InputButton_Group;
    exit_button = new CL_InputButton_Group;
	fire_button = new CL_InputButton_Group;
	hori_axis = new CL_InputAxis_Group;
	vert_axis = new CL_InputAxis_Group;
	armor_button = new CL_InputButton_Group;
	sheilds_button = new CL_InputButton_Group;
	
	
	
	
	// Add keyboard input:
	exit_button->add(
		CL_Input::keyboards[0]->get_button(CL_KEY_ESCAPE));
	armor_button->add(
		CL_Input::keyboards[0]->get_button(CL_KEY_A));
	
	
	//setup hotkeys
	setting_1_button->add(CL_Input::keyboards[0]->get_button(CL_KEY_Q));
	setting_2_button->add(CL_Input::keyboards[0]->get_button(CL_KEY_W));
	setting_3_button->add(CL_Input::keyboards[0]->get_button(CL_KEY_E));
	
	fire_button->add(
		CL_Input::keyboards[0]->get_button(CL_KEY_SPACE));
	
	hori_axis->add(
		new CL_InputButtonToAxis_Analog(
		CL_Input::keyboards[0]->get_button(CL_KEY_LEFT),
		CL_Input::keyboards[0]->get_button(CL_KEY_RIGHT)
		));
	
	vert_axis->add(
		new CL_InputButtonToAxis_Analog(
		CL_Input::keyboards[0]->get_button(CL_KEY_UP),
		CL_Input::keyboards[0]->get_button(CL_KEY_DOWN)
		));
	
	// Add joystick input (if available):
	if (CL_Input::joysticks.size())
	{
		fire_button->add(CL_Input::joysticks[0]->get_button(0));
		
		//add hotkeys to joystick
		setting_1_button->add(CL_Input::joysticks[0]->get_button(1));
		setting_2_button->add(CL_Input::joysticks[0]->get_button(2));
		setting_3_button->add(CL_Input::joysticks[0]->get_button(3));
		
		hori_axis->add(CL_Input::joysticks[0]->get_axis(0));
		vert_axis->add(CL_Input::joysticks[0]->get_axis(1));
	}
	
	//	armor_button->add(CL_Input::keyboards[0]->get_button(CL_KEY_A));
	
	//		sheilds_button->add(CL_Input::keyboards[0]->get_button(CL_KEY_S));
}
// will be used for main menuing system
int GameManager::show_menu()
{
	int temp;
	
	
	GUI::StartScreen(this);
	temp = GUI::Room_GUI(this);
	
	

	return temp;
	
}

void GameManager::show_GUI()
{
	
	GUI::Cust_GUI(this);
	
}


/* run_game
* Main game loop is here - once simulation has begun
*/
bool GameManager::run_game(int level_time)
{
	int curr_time, total_time;
	int death_time = 4000;
	
	int cur_frame = 0;
	bool new_wave =false;
	char* tempStr;
	//float vol;
	tempStr =  (char *)malloc( sizeof(char) * 10);
	//init the alpha
	warningAlpha = 1.0f;
	warningAlphaIncrease = false;
	
	//	CL_MouseCursor::hide();
	
	
	//intialize the starField
	m_stars.Initialize(100, true, this);
	
	CL_Display::clear_display();
	large_font->print_center(400,280,"LOADING");
	if( levelNum == 2)
	{
		// FORCE THE BOSS TO DRAW SO WE SOLVE THE HICCUP PROBLEM
		for (	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
		itCapShips != capShips.end();
		itCapShips)
			
		{
			CapitalShip *tempCap = *itCapShips;
			itCapShips++;
			
			//update the enemy ships
			if(tempCap->update() == false)
			{
				capShips.remove(tempCap);
				delete(tempCap);
			}
		}
	}
	
	wait(2.0f);
	
	//update the time info
	start_time = CL_System::get_time();
	curr_time = CL_System::get_time();
	total_time = start_time + level_time;
	
	//CREATE PARTICLE SYSTEM
	ParticleSystem = new TParticleClass();
	//	ParticleSystem->CreateGravityWell(300, 300, 2, 9.5f, false);
	
	
	//RESET THE FIGHTER TO THE CENTER OF THE SCREEN
	Fighter->game_reset();
	
	//start the background volume
	Sound::playBackgroundMusic();
	
	//ambient space sound was moved to GUI::show menu
	Sound::playPlayerEngineSound();	
	
	
	// Loop until the level runs out of time
	while ((exit_button->is_pressed() == false) && (total_time > curr_time)  && (gameOver == false))
	{
		
		
		
		//update current time
		curr_time = CL_System::get_time();
		
		updateWaves();
		
		//end drawing 2d only
		CL_OpenGL::end_2d();
		
		GL_Controller->DrawGLStars(this);
		
		//end drawing 2d only
		CL_OpenGL::begin_2d();
		
		
		draw_world_objects();
		//		make_particles(400,300);
		
		
		//end drawing 2d only
		CL_OpenGL::end_2d();
		
		
		
		GL_Controller->DrawGLParticles(this);
		
		
		
		//start drawing 2d only
		CL_OpenGL::begin_2d();
		
		
		//UPDATE CONSOLE - we have to do this here b/c of the lighting overlay effects
		update_console();
		
		
		
		collision_update();
		
		/*
		//calculate and print the frames per second
		float delta_time = (CL_System::get_time()-start_time)/(float) 1000;
		tempStr = itoa(cur_frame / delta_time, tempStr, 10);
		ingame_font->print_right(30,30, (const char*) tempStr );
		ingame_font->print_right(60, 30, "fps");
		*/
		
		
		
		//Simple cheezy code to handle playership dying
		if( Fighter->armor <= 0 && Fighter->get_is_destroyed() == false)
		{
			Fighter->destroy_ship();
			//stop the player shooting sounds
			//	sfx_playerShipRapidFire->stop();
			//	sfx_playerShipFire->stop();
			//	sfx_backgroundMusicSoundBuffer.stop();
			//wait for the figther to blow up
			//	wait(0.7f);
			start_time = CL_System::get_time();
			
			while(curr_time < start_time + death_time)
			{
				curr_time = CL_System::get_time();
				
				// Clear display with alpha background:
				CL_Display::clear_display(0.0f, 0.0f, 0.0f, 0.01f);
				
				
				game_over->put_screen( 272, 268);
				
				
				// Flip front and backbuffer. This makes the changes visible:
				CL_Display::flip_display();
				
				
				// Update keyboard input and handle system events:
				CL_System::keep_alive();
			}
			
			// so when it increments it will go to 0, the first level
			levelNum = -1;
			
			
			
			
			break;
			
		}
		

		//Handle BOSS DESTRUCTION
		if( levelNum == 2 && bossDestroyed == true)
		{
			//exit the level
			if( curr_time > bossDestroyTime  )
			{
				gameOver = true;
				Sound::stopBackgroundMusic();
				Sound::stopPlayerShipFire();
				Sound::lowerBossBackgroundMusic();
				GUI::Aftermath_GUI(this);
			}

			if( curr_time + 1000 < bossDestroyTime)
			{
				if(StarField::rnd() > 0.98f){
					// draw all CapitalShips
					for (	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
					itCapShips != capShips.end();
					itCapShips)
					{	
						Boss* tempCap = (Boss*)*itCapShips;
						itCapShips++;
					/*	
						if( curr_time +2000 > bossDestroyTime && tempCap->get_visible() == 1 )
						{
							tempCap->set_visible(false);
						}
					*/
					  tempCap->destroy_orb(tempCap->get_x()-100+StarField::newRnd(300), tempCap->get_y()+StarField::newRnd(150));
						
					}		
				}
				
				if(StarField::rnd() > 0.6f){
					// draw all CapitalShips
					for (	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
					itCapShips != capShips.end();
					itCapShips)
					{	
						Boss* tempCap = (Boss*)*itCapShips;
						itCapShips++;
						
						
						explosionGenerator::MakeExplosions(tempCap->get_x()-100+StarField::newRnd(300),
							tempCap->get_y()+StarField::newRnd(150),
							0, 0, this );
						
					}		
				}
			}
		}

		// Flip front and backbuffer. This makes the changes visible:
		CL_Display::flip_display();	
		cur_frame++;
		
		//tiny rest for shitty OS'es like 98
		//	CL_System::sleep(1); 
		// Update keyboard input and handle system events:
		CL_System::keep_alive();
		
		
		
		}			
		
		//increment the level counter
		levelNum++;
		
		
		//Check to see if the level just ended or we hit escape
		if( (total_time > curr_time) && (Fighter->get_is_destroyed() == false))
		{
			Fighter->setPowerUpCount( 0 );
				levelNum--;
		}
		
		
		//delete all objects currently living in lists
		
		cleanupWorld();
		
		Sound::stopPlayerShipFire();
		
		Sound::stopBackgroundMusic();

		Sound::stopBossBackgroundMusic();
		
		Sound::stopPlayerEngineSound();
		
		free(tempStr);
		
		
		return true;	
		
}
void GameManager::updateWaves()
{
	int time_elapsed =CL_System::get_time() - start_time;
	
	// update the wave information that was set up
	for (	std::list<Wave *>::iterator itWaves = waveInfo.begin();
	itWaves != waveInfo.end();
	itWaves++)
		
	{
		
		if( (*itWaves)->get_state() == WAITING 
			&& (time_elapsed > (*itWaves)->get_start_time() * 1000) )
		{
			create_wave( (*itWaves)->get_wave_count(), 
				(*itWaves)->get_wave_type() ,
				(*itWaves)->get_x_startPos(),
				(*itWaves)->get_y_startPos());
			
			(*itWaves)->set_state( RELEASED );
			
			delete *itWaves;
			itWaves = waveInfo.erase( itWaves );
			
		}
		
	}
	
}

void GameManager::make_particles(int x, int y)
{
	
				for( int Loop = 0; Loop < 1; Loop++){
				/*
				
				  ParticleSystem->CreateCompleteParticle(true,                         //Turn on gravitation for the particle.
				  300,                  //Set the X position
				  300, //Set the Y position
				  ParticleSystem->Random(360),                  //Set the angle
				  StarField::rnd(),  //Set the force
				  (float)ParticleSystem->Random(3)+1.0f,                  //Set the amount of mass
				  45,0);                          //Gravitation range
				  
					
					  
					*/	
					
					ParticleSystem->CreateCompleteParticle(false,                         //No gravity
						500,                  //Put startX at center
						400, //Put startY little above center
						280,       //Use loop to spin the angle around
						StarField::rnd()/(float)600,  //Find a decent speed
						0,                              //Since no gravity, no mass needed
						0, 0, true, 1.0f, 0.01f,
						colors[ParticleSystem->Random(12)][0],
						colors[ParticleSystem->Random(12)][1],
						colors[ParticleSystem->Random(12)][2]
						);                      
				}
}

void GameManager::make_engine(int x, int y, float intensity)
{
	float tempVal;
	for( int Loop = 0; Loop < 1; Loop++){
		tempVal = (float)StarField::newRnd(2);
		ParticleSystem->CreateCompleteParticle(false,                         //No gravity
			x,                  //Put startX at center
			y, //Put startY little above center
			175+ParticleSystem->Random(10),       //Use loop to spin the angle around
			(float)StarField::rnd()/20.0f ,  //Find a decent speed
			0,                              //Since no gravity, no mass needed
			0, 0, true, intensity, (float)((rand()%100)/1000.0f+0.003f),
			1.0f,
			tempVal ,
			tempVal
			);                      
	}
}

void GameManager::make_CapShipEngine(int x, int y, float intensity)
{
	float tempVal;
	for( int Loop = 0; Loop < 1; Loop++){
		tempVal = (float)StarField::newRnd(2);
		ParticleSystem->CreateCompleteParticle(false,                         //No gravity
			x,                  //Put startX at center
			y, //Put startY little above center
			-10 + ParticleSystem->Random(20),       //Use loop to spin the angle around
			(float)StarField::rnd()/20.0f ,  //Find a decent speed
			0,                              //Since no gravity, no mass needed
			0, 0, true, intensity, (float)((rand()%100)/1000.0f+0.003f),
			tempVal,
			tempVal,
			1.0f
			);     
		ParticleSystem->CreateCompleteParticle(false,                         //No gravity
			x+17,                  //Put startX at center
			y, //Put startY little above center
			-10 + ParticleSystem->Random(20),       //Use loop to spin the angle around
			(float)StarField::rnd()/20.0f ,  //Find a decent speed
			0,                              //Since no gravity, no mass needed
			0, 0, true, intensity, (float)((rand()%100)/1000.0f+0.003f),
			tempVal,
			tempVal,
			1.0f
			);              
	}
}



void GameManager::draw_particle_systems()
{
/*
TParticle* aParticle;
int Loop;

  CL_Target* FrameBuffer;
  FrameBuffer = CL_Display::get_target(); 
  
    //Delete pixel at the particles current XY coordinate
    for (Loop = ParticleSystem->GetTotalParticles(); Loop > 0; Loop--)
	{
	//MoveAllParticles handles all particle movements. You don't have to do anything!
	ParticleSystem->MoveAllParticles();
	
	  aParticle = ParticleSystem->GetParticle(Loop);
	  
		
		  //If our particle falls outside of our visible form, kill it.
		  if ((aParticle->X < aParticle->OriginX - 80 ) || (aParticle->X > aParticle->OriginX + 80) ||
		  (aParticle->Y < aParticle->OriginY - 80) || (aParticle->Y > aParticle->OriginY + 80) )
		  ParticleSystem->DestroyParticle(Loop);
		  }
		  
	*/
	
}




void GameManager::draw_world_objects()
{
	
	int temp;
	bool drawEarth =false;
	int currTime = CL_System::get_time();
	int timeDelta= currTime - start_time;
	
	
	
	
	
	if(levelNum == 0)
	{
		drawEarth = true;
		
		
		
	}
	
	//draw the starfield animation
	m_stars.Draw(starSpeed, drawEarth);
	
	
	//draw_particle_systems();
	
	// draw all powerUps
	for (	std::list<powerUp *>::iterator itpowerUps = powerUps.begin();
	itpowerUps != powerUps.end();
	itpowerUps++)
		
	{
		//update the enemy ships
		(*itpowerUps)->update();
	}
	
	
	
	// draw all enemy ships
	for (	std::list<EnemyShip *>::iterator itEnemyShips = lightFighters.begin();
	itEnemyShips != lightFighters.end();
	itEnemyShips)
		
	{
		EnemyShip *tempEnemy = *itEnemyShips;
		itEnemyShips++;
		
		//update the enemy ships
		if(tempEnemy->update() == false)
		{
			lightFighters.remove(tempEnemy);
			delete(tempEnemy);
		}
	}
	
	// draw all CapitalShips
	for (	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
	itCapShips != capShips.end();
	itCapShips)
		
	{
		CapitalShip *tempCap = *itCapShips;
		itCapShips++;
		
		//update the enemy ships
		if(tempCap->update() == false)
		{
			capShips.remove(tempCap);
			delete(tempCap);
		}
	}
	
	
	
	// draws all enemy projectiles
	for (	std::list<Projectile*>::iterator itEnemyProj = enemy_projectiles.begin();
	itEnemyProj != enemy_projectiles.end();
	itEnemyProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itEnemyProj;
		itEnemyProj++;
		
		if( (tempProjectile)->update() == false)
		{
			enemy_projectiles.remove(tempProjectile);
			delete(tempProjectile);
		}
	}
	
	//draws all player projetiles
	for (	std::list<Projectile*>::iterator itPlayerProj = player_projectiles.begin();
	itPlayerProj != player_projectiles.end();
	itPlayerProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itPlayerProj;
		itPlayerProj++;
		
		if( (tempProjectile)->update() == false)
		{
			player_projectiles.remove(tempProjectile);
			delete(tempProjectile);
		}
		
	}
	
	// draws the players fighter
	Fighter->update();
	
	
	//draws all explosions
	for (	std::list<Explosion*>::iterator itExpl = explosions.begin();
	itExpl != explosions.end();
	itExpl)
	{
		temp = explosions.size();
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Explosion* tempExplosion = *itExpl;
		itExpl++;
		
		if( (tempExplosion)->update() == false)
		{
			explosions.remove(tempExplosion);
			delete(tempExplosion);
		}
		
	}
	
	
	
	//draw the opening and closing anims
	if(levelNum == 0 && timeDelta < 4000 )
	{
		if( timeDelta > 600 )	
			level1_start->update();
	}
	
	else if(levelNum == 0 && timeDelta > LEVEL_1_TIME - 5000 )
		level1_end->update();
	//draw the opening and closing anims
	if(levelNum == 1 && timeDelta < 4000 )
	{
		if( timeDelta > 600 )	
			level2_start->update();
	}
	
	else if(levelNum == 1 && timeDelta > LEVEL_1_TIME - 5000 )
		level2_end->update();
	
	//draw the opening and closing anims
	if(levelNum == 2 && timeDelta < 4000 )
	{
		if( timeDelta > 600 )	
			level3_start->update();
	}
	
	
	//	printf("%d\n", temp);
}


// deletes all objects currently living in the game world

void GameManager::cleanupWorld()
{
	
	
	// deletes all powerUps
	for (	std::list<powerUp *>::iterator itpowerUps = powerUps.begin();
	itpowerUps != powerUps.end();
	itpowerUps)
		
	{
		powerUp *tempPowerUp = *itpowerUps;
		itpowerUps++;
		
		powerUps.remove(tempPowerUp);
		delete(tempPowerUp);
		
		
		
	}
	
	
	
	
	
	// deletes all enemy ships
	for (	std::list<EnemyShip *>::iterator itEnemyShips = lightFighters.begin();
	itEnemyShips != lightFighters.end();
	itEnemyShips)
		
	{
		EnemyShip *tempEnemy = *itEnemyShips;
		itEnemyShips++;
		
		lightFighters.remove(tempEnemy);
		delete(tempEnemy);
		
	}
	
	// deletes all CapitalShips
	for (	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
	itCapShips != capShips.end();
	itCapShips)
		
	{
		CapitalShip *tempCap = *itCapShips;
		itCapShips++;
		
		
		capShips.remove(tempCap);
		delete(tempCap);
		
	}
	
	
	
	// deletes all enemy projectiles
	for (	std::list<Projectile*>::iterator itEnemyProj = enemy_projectiles.begin();
	itEnemyProj != enemy_projectiles.end();
	itEnemyProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itEnemyProj;
		itEnemyProj++;
		
		enemy_projectiles.remove(tempProjectile);
		delete(tempProjectile);
		
	}
	
	//deletes all player projetiles
	for (	std::list<Projectile*>::iterator itPlayerProj = player_projectiles.begin();
	itPlayerProj != player_projectiles.end();
	itPlayerProj)
	{
		// update the projectiles - i.e draw and move them
		// if they get drawn off the screen destory them
		Projectile* tempProjectile = *itPlayerProj;
		itPlayerProj++;
		
		player_projectiles.remove(tempProjectile);
		delete(tempProjectile);
		
		
	}
	
	
	//deletes all explosions
	for (	std::list<Explosion*>::iterator itExpl = explosions.begin();
	itExpl != explosions.end();
	itExpl)
	{
		
		
		Explosion* tempExplosion = *itExpl;
		itExpl++;
		
		explosions.remove(tempExplosion);
		delete(tempExplosion);
		
		
	}
	
	
	
	// deletes all list data
	powerUps.clear();
	
	lightFighters.clear();
	
	capShips.clear();
	
	enemy_projectiles.clear();
	
	player_projectiles.clear();
	
	explosions.clear();
	
	waveInfo.clear();
	
	
}


void GameManager::collision_update()
{
	std::list<Projectile *> Delete_enemy_projectiles;
	std::list<Projectile *> Delete_player_projectiles;
	std::list<EnemyShip *> Delete_lightFighters;
	std::list<CapitalShip *> Delete_capShips;
	std::list<powerUp *> Delete_powerUps;
	float powerUpProb;
	
	//COLLISION DETECTION CODE
	
	//ENEMY FIGHTERS COLLIDING WITH PLAYER PROJECTILES
	for (	std::list<EnemyShip *>::iterator itEnemyShips = lightFighters.begin();
	itEnemyShips != lightFighters.end();
	itEnemyShips++)
		
	{
		
		//check the enemy ship colliding against any of the players projectiles
		// creates an iterator to handle the list of player projectiles
		for (	std::list<Projectile*>::iterator itPlayerProj = player_projectiles.begin();
		itPlayerProj != player_projectiles.end();
		itPlayerProj++)
		{
			
			//check the if any of the player projectiles are hitting enemy ships
			if( CollisionDetection::Sprite_Collide((*itPlayerProj), (*itEnemyShips)) == 1)
			{
				
				//check to see if we destroy the ship
				if( (*itEnemyShips)->take_damage( (*itPlayerProj)->get_damage() ) == true)
				{
					
					//creates explosions and returns chance that ship drops powerup
					powerUpProb = (*itEnemyShips)->destroy_ship();
					//if we destroy the ship, add the ship to the destroy list 
					Delete_lightFighters.push_back( (*itEnemyShips) );
					Fighter->addKill(); 
					
					//create the powerups based on ship type  chance
					if( StarField::rnd() > (1.0f - powerUpProb) ){
						powerUps.push_back( new powerUp( 0, 4, 
							(*itEnemyShips)->get_x() + (*itEnemyShips)->get_width() /2,
							(*itEnemyShips)->get_y() + (*itEnemyShips)->get_height() /2,
							this) );
						powerUps.back()->template_copy( powerUpTemplate );
						
					}
				}
				int _dx, _dy;
				(*itPlayerProj)->get_velocity( &_dx, &_dy);
				Delete_player_projectiles.push_back( (*itPlayerProj) );
				explosions.push_back( new Explosion((*itPlayerProj)->get_x(),(*itPlayerProj)->get_y(), this) );
				explosions.back()->template_copy( explosionTemplate );
				
				//make the explosions move a little
				explosions.back()->set_velocity( _dx/5, _dy/5 );
				
				
				break;
			}
			
			
			
		}
		
	}
			 
	
	//CAPITAL SHIPS COLLIDING WITH PLAYER PROJECTILES
	for (std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
	itCapShips != capShips.end();
	itCapShips++)
		
	{
		
		//check the enemy ship colliding against any of the players projectiles
		// creates an iterator to handle the list of player projectiles
		for (	std::list<Projectile*>::iterator itPlayerProj = player_projectiles.begin();
		itPlayerProj != player_projectiles.end();
		itPlayerProj++)
		{
			
			// we hit the ship somewhere
			if( (*itCapShips)->collision_update(*itPlayerProj) == true )
			{
				//not only did we damage the ship, we destroyed it
				if( (*itCapShips)->get_is_destroyed() == true )
				{
					//creates explosions and returns chance that ship drops powerup
					powerUpProb = (*itCapShips)->destroy_ship();
					//if we destroy the ship, add the ship to the destroy list 
					Delete_capShips.push_back( (*itCapShips) );
					Fighter->addKill(); 
					
					//create the powerups based on ship type  chance
					if( StarField::rnd() > (1.0f - powerUpProb) ){
						powerUps.push_back( new powerUp( 0, 4, 
							(*itEnemyShips)->get_x() + (*itEnemyShips)->get_width() /2,
							(*itEnemyShips)->get_y() + (*itEnemyShips)->get_height() /2,
							this) );
						powerUps.back()->template_copy( powerUpTemplate );
						
					}
					
				}
				int _dx, _dy;
				(*itPlayerProj)->get_velocity( &_dx, &_dy);
				Delete_player_projectiles.push_back( (*itPlayerProj) );
				explosions.push_back( new Explosion((*itPlayerProj)->get_x(),(*itPlayerProj)->get_y(), this) );
				explosions.back()->template_copy( explosionTemplate );
				
				//make the explosions move a little
				explosions.back()->set_velocity( _dx/5, _dy/5 );
				
				
				break;
			}
			
			
			
		}
		
	}
	
	
	//CAPITAL SHIPS COLLIDING WITH PLAYER SHIP
	for (itCapShips = capShips.begin();
	itCapShips != capShips.end();
	itCapShips++)
		
	{
		// we hit the ship somewhere
		if( (*itCapShips)->collision_update_ship(Fighter) == true )
		{
			Fighter->take_damage(10000);  
			//blow up player ship
			
		}
		
	}
	
	
	
	//ENEMY FIGHTERS COLLIDING WITH PLAYER 
	for (itCapShips = capShips.begin();
	itCapShips != capShips.end();
	itCapShips++)
		
	{
		// we hit the ship somewhere
		//if( (*itCapShips)->collision_update(Fighter) == true )
		{
			//destroy player
			
		}
		
	}
	
	
	
	
	
	//ENEMY FIGHTERS COLLIDING WITH PLAYER 
	for (itEnemyShips = lightFighters.begin();
	itEnemyShips != lightFighters.end();
	itEnemyShips++)
		
	{
		//check to see if we are hitting the player ship
		//check the if any of the player projectiles are hitting enemy ships
		if( CollisionDetection::Sprite_Collide(Fighter, (*itEnemyShips)) == 1)
		{
			//creates explosions and returns chance that ship drops powerup
			powerUpProb = (*itEnemyShips)->destroy_ship();
			//if we destroy the ship, add the ship to the destroy list 
			Delete_lightFighters.push_back( (*itEnemyShips) );
			Fighter->take_damage( (*itEnemyShips)->armor + (*itEnemyShips)->shields );
			Fighter->addKill(); 
			
			//create the powerups 
			if( StarField::rnd() > (1 - powerUpProb)){
				powerUps.push_back( new powerUp( 0, 4, 
					(*itEnemyShips)->get_x() + (*itEnemyShips)->get_width() /2,
					(*itEnemyShips)->get_y() + (*itEnemyShips)->get_height() /2,
					this) );
				powerUps.back()->template_copy( powerUpTemplate );
			}
			
		}
		
	}
	
	//POWERUPS COLLIDING WITH PLAYER 
	for (std::list<powerUp*>::iterator itPowerUps = powerUps.begin();
	itPowerUps != powerUps.end();
	itPowerUps++)
		
	{
		//check to see if we are hitting the player ship
		//check the if any of the player projectiles are hitting enemy ships
		if( CollisionDetection::Sprite_Collide(Fighter, (*itPowerUps)) == 1)
		{
			Sound::playResourceCollectedSound();
			
			Fighter->addPowerUp();
			Delete_powerUps.push_back( (*itPowerUps) );
		}
		
	}
	
	
	
	//ENEMY PROJECTILES COLLIDING WITH PLAYER
	// creates an iterator to handle the list of enemy projectiles
	for (	std::list<Projectile*>::iterator itEnemyProj = enemy_projectiles.begin();
				itEnemyProj != enemy_projectiles.end();
				itEnemyProj++)
				{
					
					//check the player ship colliding against any of the enemy projectiles
					if( CollisionDetection::Sprite_Collide(Fighter, (*itEnemyProj)) == 1)
					{
						Fighter->take_damage( (*itEnemyProj)->get_damage() ); 
						Delete_enemy_projectiles.push_back( (*itEnemyProj) );
						
						// special explosions for big ass cap ship nose cannon
						if( (*itEnemyProj)->get_damage() > 150)
						{
							int _dx, _dy;
							(*itEnemyProj)->get_velocity( &_dx, &_dy);
							explosionGenerator::MakeExplosions( (*itEnemyProj)->get_x() + 16,
								(*itEnemyProj)->get_y() + 16,
								_dx, _dy, this );
						}
						//just a normal explosion
						else
						{
							int _dx, _dy;
							(*itEnemyProj)->get_velocity( &_dx, &_dy);
							explosions.push_back( new Explosion((*itEnemyProj)->get_x(),(*itEnemyProj)->get_y(), this) );
							explosions.back()->template_copy( explosionTemplate );
							//make the explosions move a little
							explosions.back()->set_velocity( _dx/5, _dy/5 );
						}
						
					}
					
				}
				
				
				//GARBAGE COLLECT RESOURCES THAT NEED TO BE DELETED
				
				//Handle deleting enemy ships
				for (	std::list<EnemyShip *>::iterator itDelEnemyShips = Delete_lightFighters.begin();
				itDelEnemyShips != Delete_lightFighters.end();
				itDelEnemyShips++)
					
				{
					EnemyShip *tempEnemyShip = *itDelEnemyShips;
					lightFighters.remove(tempEnemyShip);
					//CRASH BUG: for some reason this can randomly crash the game
					// it is a memory leak, but small... so its not a problem
					//delete(tempEnemyShip);
					
				}
				
				
				//Handle deleting Capital ships
				for (	std::list<CapitalShip *>::iterator itDelCapShips = Delete_capShips.begin();
				itDelCapShips != Delete_capShips.end();
				itDelCapShips++)
					
				{
					CapitalShip *tempEnemy = *itDelCapShips;
					capShips.remove(tempEnemy);
					delete(tempEnemy);
				}
				
				
				//Handle deleting player projectiles
				for (	std::list<Projectile*>::iterator itDelPlayerProj = Delete_player_projectiles.begin();
				itDelPlayerProj != Delete_player_projectiles.end();
				itDelPlayerProj++)
				{
					player_projectiles.remove(*itDelPlayerProj);
				}
				
				
				//Handle deleting enemy projectiles
				for (	std::list<Projectile*>::iterator itDelEnemyProj = Delete_enemy_projectiles.begin();
				itDelEnemyProj != Delete_enemy_projectiles.end();
				itDelEnemyProj++)
				{
					Projectile *tempProjectile = *itDelEnemyProj;
					enemy_projectiles.remove(tempProjectile);
					delete(tempProjectile);
				}
				
				
				//Handle deleting powerups
				for (	std::list<powerUp *>::iterator itDelPowerUps = Delete_powerUps.begin();
				itDelPowerUps != Delete_powerUps.end();
				itDelPowerUps++)
				{
					powerUp *tempPowerup = *itDelPowerUps;
					powerUps.remove(tempPowerup);
					delete(tempPowerup);
				}
				
				
				
}

void GameManager::update_console()
{
	GUI::console_GUI(this);
}
void GameManager::deinit()
{
	
	
	CL_SetupSound::deinit();
	CL_SetupGL::deinit();
	
	delete resources;
	delete fire_button;
	delete hori_axis;
	delete vert_axis;
}

GameObject_Sprite *GameManager::select_target()
{
	
	std::list<EnemyShip *>::iterator itEnemyShips = lightFighters.begin();
	std::list<CapitalShip *>::iterator itCapShips = capShips.begin();
	
	if(capShips.empty() != true)
	{
		if((*itCapShips)->get_type() == BOSS)
		{
			Boss *tempCap = (Boss*)*itCapShips;
			if(tempCap->nState == BOSS_FINAL)
			{
				CapitalShip *tempEnemy = *itCapShips;
				while((tempEnemy->cap_selected <=6)&&(itCapShips != capShips.end()))
				{
					tempEnemy=*itCapShips;
					*itCapShips++;
				}
				
				tempEnemy->cap_selected++;
				return (GameObject_Sprite *)tempEnemy;
			}
		}
		else
		{
			CapitalShip *tempEnemy = *itCapShips;
			while((tempEnemy->cap_selected <=6)&&(itCapShips != capShips.end()))
			{
				tempEnemy=*itCapShips;
				*itCapShips++;
			}
			
			tempEnemy->cap_selected++;
			return (GameObject_Sprite *)tempEnemy;
		}
	}
	if(lightFighters.empty() != true)
	{
		EnemyShip *tempEnemy = *itEnemyShips;
		while((tempEnemy->selected == true)&&(itEnemyShips != lightFighters.end()))
		{
			tempEnemy=*itEnemyShips;
			*itEnemyShips++;
		}
		
		tempEnemy->selected = true;
		return (GameObject_Sprite *)tempEnemy;
	}
	else
		return NULL;
}