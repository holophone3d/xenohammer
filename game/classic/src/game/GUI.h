#pragma once
#include "stdinclude.h"
#include "PlayerShip.h"

class GUI
{
protected:

	
	
public:
	
	GUI(void){};
	~GUI(void);
	
	static int setting;


	static void StartScreen(GameManager *manager);
	static int Room_GUI(GameManager *manager);
	static void Cust_GUI(GameManager *manager);
	static int Options_GUI(GameManager *manager);
	static int Briefing_Options_GUI(GameManager *manager);
	static void Backstory_GUI(GameManager *manager);
	static void Level_Briefing_GUI(GameManager *manager);
	static void console_GUI(GameManager *manager);
	static void display_power(GameManager *manager, int _x, int _y);
	static void display_stats(GameManager *manager);
	static void nose_blaster_clicked(GameManager *manager, int _x, int _y);
	static void l_turret_clicked(GameManager *manager, int _x, int _y);
	static void r_turret_clicked(GameManager *manager, int _x, int _y);
	static void l_missle__clicked(GameManager *manager, int _x, int _y);
	static void r_missle_clicked(GameManager *manager, int _x, int _y);
	static void engine_clicked(GameManager *manager, int _x, int _y);
	static int what_system(int _x, int _y, int sound_played);
	static void activate(GameManager *manager, int _x, int _y);
	static void display_ship(GameManager *manager);
	static void save_setting(GameManager *manager, int setting);
	static void engine_feedback(GameManager *manager);
	static void ship_specs(GameManager *manager);
	static int set_difficulty(GameManager *manager);
	static void Aftermath_GUI(GameManager *manager);

};