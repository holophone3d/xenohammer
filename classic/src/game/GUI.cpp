#include "GUI.h"
#include "GameManager.h"
#include "GameAnimation.h"
#include "GL_Handler.h"
#include "Sound.h"



enum system_clicked {NoseBlaster, LTurret, RTurret, LMissle, RMissle, Engine, None};
int GUI::setting = 1;
int nb_overflow = 0, lt_overflow = 0, rt_overflow = 0, lm_overflow = 0, rm_overflow = 0, e_overflow = 0;
int energy_system = None;
int x=610, y=(SHIELDS_Y_POS - 56);
char* tempStr;
const char* weaponStr;

//bool turret_angle_available = false;



int selected = 0;

bool new_cust = true, new_level_briefing = true;


int level_briefed = 0;

/*
/shows the start up screen and allows the user to 
/select the start game text to start the game
*/
void GUI::StartScreen(GameManager *manager)
{
	int _x,_y,sound_played = 0;
	
	//CL_MouseCursor::set_cursor(CL_MouseCursorProvider::load("sur_cursor", manager->gui_resources));
	
	manager->startScreen = CL_Surface::load("Graphics/startScreen", manager->gui_resources);
	if(manager->started == false){
		while (manager->fire_button->is_pressed() == false)
		{
			_x = CL_Mouse::get_x();
			_y = CL_Mouse::get_y();
			
			CL_Display::clear_display();	
			manager->startScreen->put_screen(0,0);
			manager->large_font->print_center(400,580,"Start Game");
			
			//if the mouse is over the start game text play sound
			if((_x <=500  && _x >= 330) &&
				(_y <= 600 && _y >= 550)){
				if(sound_played == 0){
					//manager->sfx_GUI->play();
					//Sound::playGUIMouseOverSound();
					sound_played = 1;
				}
				//if the mouse button is pressed go to room_GUI
				if(CL_Mouse::left_pressed()){
					sound_played = 0;
					//start the ambient space sound
					//manager->sfx_spaceAmbient->play(true);
					Sound::playAmbientBackgroundSound();
					break;
				}
			}
			else
				sound_played = 0;
			
			CL_Display::flip_display();	
			CL_System::keep_alive();
		}
		
		manager->started = true;
	}
}
/*
/shows the room after the start up screen that allows the user 
/to choose to play the game customize the ship or save and exit
*/
int GUI::Room_GUI(GameManager *manager)
{
	int _x,_y,return_var = 0, sound_played = 0;
	//CL_MouseCursor::set_cursor(CL_MouseCursorProvider::load("sur_cursor", manager->gui_resources));
	
	manager->room_GUI = CL_Surface::load("Graphics/room_GUI", manager->gui_resources);
	
	//manager->room_Screen = CL_Surface::load("Graphics/cust_GUI", manager->gui_resources);
	
	
	//PAGING CODE TO DELETE START SCREEN
	if(manager->startScreen != NULL)
	{
		//	delete(manager->startScreen);
		//	manager->startScreen = NULL;
	}
	
	
	while (1)
	{
		
		_x = CL_Mouse::get_x();
		_y = CL_Mouse::get_y();
		CL_Display::clear_display();		
		manager->room_GUI->put_screen(0, 0);		
		
		CL_Display::fill_rect(0,550,800,600,0.0f,0.0f,0.0f);
		if(manager->levelNum == level_briefed)
		{
			new_level_briefing = true;
		}
		
		if((_x <= 218 && _x >= 10)&&(_y <= 380 && _y >= 260)){
			new_cust = false;
			manager->large_font->print_center(114,340, "Ship Customization");
			manager->large_font->print_center(400,580,"Click here to customize your ship.");
			if(sound_played == 0){
				//manager->sfx_GUI->play();
				//Sound::playGUIMouseOverSound();
				sound_played = 1;
			}
			if(CL_Mouse::left_pressed()){
				sound_played = 0;
				manager->show_GUI();
				
			}
			
		}
		else if((_x<=400&&_x>=200)&&(_y<=(185+33)&&_y>=(185))){
			new_level_briefing = false;
			manager->large_font->print_center(300,206, "Briefing Area and Options");
			manager->large_font->print_center(400,580,"Click here to See Briefings, Save, Load, or Quit");
			if(sound_played == 0){
				//manager->sfx_GUI->play();
				//Sound::playGUIMouseOverSound();
				sound_played = 1;
			}
			if(CL_Mouse::left_pressed()){
				sound_played = 0;
				return_var = Options_GUI(manager);
				if (return_var == 0)
					return return_var;		
			}
		}
		else if((_x <= 800 && _x >= 601)&&
			(_y <= 540 && _y >= 0)){
			manager->large_font->print_center(600,270, "Launch");
			if(manager->levelNum == 0)
			{
				if(level_briefed == 0)
				{
					manager->large_font->print_center(400,580,"Recon has new info see the level briefing.");
				}
				else if(level_briefed == 1)
				{
					manager->large_font->print_center(400,580,"Launch into the Outer Earth Sector");
				}
				
			}
			else if(manager->levelNum == 1)
			{
				if(level_briefed <= 1)
				{
					manager->large_font->print_center(400,580,"Recon has new info see the level briefing.");
				}
				else if(level_briefed == 2)
				{
					manager->large_font->print_center(400,580,"Penetrate the Outer Defense Matrix");
				}
				
			}
			else if(manager->levelNum == 2)
			{
				if(level_briefed <= 2)
				{
					manager->large_font->print_center(400,580,"Recon has new info see the level briefing.");
				}
				else if(level_briefed == 3)
				{
					manager->large_font->print_center(400,580,"Destroy the Nexus Core");
				}
				
			}
			else
			{
				manager->large_font->print_center(400,580,"You Have Completed the Mission!");
			}
			if(sound_played == 0){
				//manager->sfx_GUI->play();
				//Sound::playGUIMouseOverSound();
				sound_played = 1;
			}
			if(CL_Mouse::left_pressed()){
				sound_played = 0;
				break;
			}			
		}
		else{
			sound_played = 0;
			if( (manager->Fighter->get_is_destroyed() == false) )
				manager->large_font->print_center(400,580,"Click on a screen or the door opening");
			else if(manager->Fighter->get_is_destroyed() == true)
				manager->large_font->print_center(400,580,"You have died, your game has been restarted");
		}
		
		
		if(new_cust == true)
		{
			manager->large_font->print_center(114,340,"NEW!");
		}
		
		if(new_level_briefing == true)
		{
			manager->font->print_center(300,206,"New Level Briefing Available!");
		}
		
		CL_Display::flip_display();	
		CL_System::keep_alive();
	}
	// used for framerate calculations
	
	return 1;
}


/*
/shows the custimization gui that allows the user to modify his/her ship
*/
void GUI::Cust_GUI(GameManager *manager)
{
	
	//need to setup the timer for animation purposes
	manager->start_time = CL_System::get_time(); 
	
	
	
	manager->room_Screen = CL_Surface::load("Graphics/cust_GUI", manager->gui_resources);
	
	
	manager->b_unpressed = CL_Surface::load("Graphics/b_unpressed", manager->gui_resources);
	manager->b_pressed = CL_Surface::load("Graphics/b_pressed", manager->gui_resources);
	manager->gui_button = CL_Surface::load("Graphics/gui_button", manager->gui_resources);
	manager->buy_button = CL_Surface::load("Graphics/buy_button", manager->gui_resources);
	manager->cust_start = CL_Surface::load("Graphics/cust_start", manager->gui_resources);
	manager->left_turret_pannel = CL_Surface::load("Graphics/left_turret_pannel", manager->gui_resources);
	manager->right_turret_pannel = CL_Surface::load("Graphics/right_turret_pannel", manager->gui_resources);
	manager->turret_selector = CL_Surface::load("Graphics/turret_selector", manager->gui_resources);
	
	int _x, _y; 
	int	sound_played = 0;
	int sound_played_system = 0;
	int done = 0;
	
	tempStr =  (char *)malloc( sizeof(char) * 10);
	weaponStr =  (char *)malloc( sizeof(char) * 25);
	
	manager->Fighter->load_ship_setting( SETTING_1 );
	
	manager->b_pressed->put_screen(0,45);		
	manager->b_unpressed->put_screen(0,45);		
	while (done == 0)
	{
		_x = CL_Mouse::get_x();
		_y = CL_Mouse::get_y();
		
		CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		
		//checks to see if the mouse is over the done button
		if((_x <= 800 && _x >= 517)&&
			(_y <= 600 && _y >= 553))
		{
			manager->b_pressed->put_screen(0,45);		
			if(CL_Mouse::left_pressed())
			{
				done = 1;
				manager->Fighter->shields = 300;
				manager->Fighter->armor = 300;
				return;
			}
			
			if(sound_played == 0){
				Sound::playGUIMouseOverSound();
				sound_played = 1;
			}
		}	
		else
		{ 
			sound_played = 0;
			manager->b_unpressed->put_screen(0,45);
		}
		
		
		//setting up background color
		CL_Display::fill_rect(0,0,800,40,0.0f,0.0f,0.0f);
		CL_Display::fill_rect(0,301,512,600,0.0f,0.0f,0.0f);
		CL_Display::fill_rect(512,45,800,553,0.0f,0.0f,0.0f);
		CL_Display::fill_rect(512,553,517,600,0.0f,0.0f,0.0f);
		
		//check to see if your over the ship
		//and if you are what ship should you activate
		if((_x<=512&&_x>=0)&&(_y<=301&&_y>=45))
		{
			if(CL_Mouse::left_pressed())
			{
				sound_played_system = what_system(_x, _y, sound_played_system);
			}
			else
				sound_played_system = 0;
		}
		
		//set active window stuff
		activate(manager, _x, _y);
		
		//displays the power stuff
		display_power(manager, _x, _y);
		
		//displays player stats
		display_stats(manager);
		
		//displays realtime feedback
		display_ship(manager);
		
		//shows what has been decided on
		manager->gui->show();
		
		//Fighter->update();
		
		CL_System::keep_alive();
		CL_Display::flip_display();
	}	
	free(tempStr);
	free(weaponStr);
	
}

int GUI::Options_GUI(GameManager *manager)
{
	int _x,_y,done = 0, room_started = 0;
	int sound_played = 0;
	
	bool save_success = false, load_success = false;
	
	
	manager->room_Screen = CL_Surface::load("Graphics/room_screen", manager->gui_resources);
	
	while (done == 0)
	{
		_x = CL_Mouse::get_x();
		_y = CL_Mouse::get_y();
		
		CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		manager->room_Screen->put_screen(0,0);
		CL_Display::fill_rect(0,550,800,600,0.0f,0.0f,0.0f);
		CL_Display::fill_rect(200,(110-33),600,110,0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,(185-33),600,185,0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,(260-33),600,260,0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,(335-33),600,335,0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,(410-33),600,410,0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,(485-33),600,485,0.2f,0.25f,0.2f);
		manager->large_font->print_center(400, 100, "Briefing Area");
		manager->large_font->print_center(400, 175, "Save Your Game");
		manager->large_font->print_center(400, 250, "Load Your Game");
		manager->large_font->print_center(400, 325, "Set Difficulty");
		manager->large_font->print_center(400, 400, "Quit to the Ready Room");
		manager->large_font->print_center(400, 475, "Quit to System");
		//briefing
		if((_x<=600&&_x>=200)&&(_y<=110&&_y>=(110-33)))
		{
			manager->large_font->print_center(400,580,"XenoHammer Back Story or Level Briefing");
			if(CL_Mouse::left_pressed())
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}
				
				int temp = Briefing_Options_GUI(manager);
				if (temp == 1)
					return 1;
			}			
		}
		//save
		else if((_x<=600&&_x>=200)&&(_y<=185&&_y>=(185-33)))
		{
			if(save_success == true)
			{
				manager->large_font->print_center(400,580,"Save Done");
			}
			else
			{
				manager->large_font->print_center(400,580,"Click Here To Save");
			}
			if(CL_Mouse::left_pressed())
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}
				if(manager->Fighter->save_shipInfo(manager) == 1)
					save_success = true;
				else
					save_success = false;
			}
			
		}
		//load
		else if((_x<=600&&_x>=200)&&(_y<=260&&_y>=(260-33)))
		{
			if(load_success == true)
			{
				manager->large_font->print_center(400,580,"Load Done");
			}
			else
			{
				manager->large_font->print_center(400,580,"Load Your Saved Game");
			}
			if(CL_Mouse::left_pressed())
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}
				
				if(manager->Fighter->load_shipInfo(manager) == 1)
					load_success = true;
				else
					load_success = false;
			}
		}
		//difficulty
		else if((_x<=600&&_x>=200)&&(_y<=335&&_y>=(335-33)))
		{
			manager->large_font->print_center(400,580,"Set Difficulty");
			if(CL_Mouse::left_pressed())
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}
				
				int temp = set_difficulty(manager);
			}
		}
		//ready room
		else if((_x<=600&&_x>=200)&&(_y<=400&&_y>=(400-33)))
		{
			manager->large_font->print_center(400,580,"Go Back to the Ready Room");
			if(CL_Mouse::left_pressed() && room_started == 1)
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}
				
				return 1;
			}
		}
		//exit
		else if((_x<=600&&_x>=200)&&(_y<=475&&_y>=(475-33)))
		{
			manager->large_font->print_center(400,580,"Exit The Game");
			if(CL_Mouse::left_pressed() && room_started == 1)
			{
				if(sound_played == 0){
					////Sound::playGUIMouseClick();
					sound_played = 1;
				}

				CL_System::sleep(20);
				
				return 0;
			}
		}
		else
			sound_played = 0;
		
		CL_System::keep_alive();
		CL_Display::flip_display();
		room_started = 1;
	}
	
	return -1;
	
}

int GUI::Briefing_Options_GUI(GameManager *manager)
{
	int started = 0,_x,_y,done = 0;
	int sound_played = 0;
	
	manager->room_Screen = CL_Surface::load("Graphics/room_screen", manager->gui_resources);
	
	while (done == 0)
	{
		_x = CL_Mouse::get_x();
		_y = CL_Mouse::get_y();
		
		CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		manager->room_Screen->put_screen(0,0);
		CL_Display::fill_rect(0,550,800,600,0.0f,0.0f,0.0f);
		CL_Display::fill_rect(200,110,600,(110+33),0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,185,600,(185+33),0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,260,600,(260+33),0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,335,600,(335+33),0.2f,0.25f,0.2f);
		CL_Display::fill_rect(200,410,600,(410+33),0.2f,0.25f,0.2f);
		manager->large_font->print_center(400, 100+33, "Back Story");
		manager->large_font->print_center(400, 175+33, "Level Briefing");
		manager->large_font->print_center(400, 250+33, "XenoHammer Ship Specifications");
		manager->large_font->print_center(400, 325+33, "Quit to the Options Screen");
		manager->large_font->print_center(400, 400+33, "Quit to the Ready Room");
		//back story
		if((_x<=600&&_x>=200)&&(_y<=(110+33)&&_y>=(110)))
		{
			manager->large_font->print_center(400,580,"History Log");
			if(CL_Mouse::left_pressed())
			{
				 if(sound_played == 0){
					 //Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 Backstory_GUI(manager);
			}
		}
		//Level Briefing
		else if((_x<=600&&_x>=200)&&(_y<=(185+33)&&_y>=(185)))
		{
			manager->large_font->print_center(400,580,"Pre-Flight briefing data");
			
			if(CL_Mouse::left_pressed())
			{
				 if(sound_played == 0){
					 //Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 Level_Briefing_GUI(manager);
			}
			
		}
		//ship specs
		else if((_x<=600&&_x>=200)&&(_y<=(260+33)&&_y>=(260)))
		{
			manager->large_font->print_center(400,580,"The XennoHammer's specifications");
			
			if(CL_Mouse::left_pressed())
			{
				 if(sound_played == 0){
					 //Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 ship_specs(manager);
			}
		}
		//Quit to the Options Screen
		else if((_x<=600&&_x>=200)&&(_y<=(335+33)&&_y>=(335)))
		{
			manager->large_font->print_center(400,580,"Back to the Options Screen");
			
			if(CL_Mouse::left_pressed())
			{
				 if(sound_played == 0){
				//	 //Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 return 2;
			}
		}
		//Quit to the Ready Room
		else if((_x<=600&&_x>=200)&&(_y<=(410+33)&&_y>=(410)))
		{
			manager->large_font->print_center(400,580,"Back to the Ready Room");
			
			if(CL_Mouse::left_pressed())
			{
				 if(sound_played == 0){
				//	 //Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 return 1;
			}
		}
		else
			sound_played = 0;

		CL_System::keep_alive();
		CL_Display::flip_display();
	}

	
	return -1;	
}
void GUI::Backstory_GUI(GameManager *manager)
{
	int t = CL_System::get_time(), i = 475;
	manager->backstory = CL_Surface::load("Graphics/backstory", manager->gui_resources);
	//intialize the starField
	manager->m_stars.Initialize(100, false, manager);
	CL_OpenGL::end_2d();
	
	while(manager->exit_button->is_pressed() == false)
	{
		//CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		
		//end drawing 2d only
		CL_OpenGL::end_2d();
		
		manager->m_stars.Draw(manager->starSpeed , false);
		
		manager->GL_Controller->DrawGLStars(manager);
		
		//begin drawing 2d only
		CL_OpenGL::begin_2d();
		if(i>-550)
			i= 475 - ((CL_System::get_time()-t)/60);
		else
			break;
		manager->backstory->put_screen(0,i);
		
		CL_System::keep_alive();
		CL_Display::flip_display();
		
	}
	
	CL_OpenGL::begin_2d();
	
	//PAGE OUT BACKSTORY GRAPHIC
	//	(manager->backstory)->~CL_Surface();
	//	delete manager->backstory; 
}
void GUI::Level_Briefing_GUI(GameManager *manager)
{
	
	int length = 0;
	int level_on = manager->levelNum;
	int t = CL_System::get_time(), i = 600;
	manager->m_stars.Initialize(100, false, manager);
	CL_OpenGL::end_2d();
	
	while(manager->exit_button->is_pressed() == false)
	{
		
		//CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		
		//end drawing 2d only
		CL_OpenGL::end_2d();
		
		manager->m_stars.Draw(manager->starSpeed , false);
		
		manager->GL_Controller->DrawGLStars(manager);
		
		//begin drawing 2d only
		CL_OpenGL::begin_2d();
		
		if(i<0&&CL_Mouse::left_pressed())
			break;
		
		if(i>length)
			i= 600 - ((CL_System::get_time()-t)/40);
		else
			break;
		
		switch(level_on+1)
		{
		case 1:
			manager->lvl_briefing_1 = CL_Surface::load("Graphics/briefing_lvl_1", manager->gui_resources);
			
			manager->lvl_briefing_1->put_screen(0,i);
			length = -620;
			level_briefed = 1;
			break;
		case 2:
			manager->lvl_briefing_2 = CL_Surface::load("Graphics/briefing_lvl_2", manager->gui_resources);
			
			manager->lvl_briefing_2->put_screen(0,i);
			length = -420;
			level_briefed = 2;
			break;
		case 3:
			manager->lvl_briefing_3 = CL_Surface::load("Graphics/briefing_lvl_3", manager->gui_resources);
			
			manager->lvl_briefing_3->put_screen(0,i);
			length = -400;
			level_briefed = 3;
			break;
		default:
			break;
		};
		
		CL_System::keep_alive();
		CL_Display::flip_display();
		
		
	}
	
	CL_OpenGL::begin_2d();
	
}

void GUI::console_GUI(GameManager *manager)
{
	int temp;
	
	int tempPixelCntSheild = manager->Fighter->ShipPower->get_power_cell_1();
	int tempPixelCntEngine = manager->Fighter->ShipPower->get_power_cell_2();
	
	int tempPixelCntLTRate = manager->Fighter->leftTurret->WeaponPower->get_power_cell_1();  
	int tempPixelCntLTPower = manager->Fighter->leftTurret->WeaponPower->get_power_cell_2(); 
	
	int tempPixelCntRTRate = manager->Fighter->rightTurret->WeaponPower->get_power_cell_1();
	int tempPixelCntRTPower = manager->Fighter->rightTurret->WeaponPower->get_power_cell_2();
	
	int tempPixelCntLMRate = manager->Fighter->leftMissle->WeaponPower->get_power_cell_1();
	int tempPixelCntLMPower = manager->Fighter->leftMissle->WeaponPower->get_power_cell_2();
	
	int tempPixelCntRMRate = manager->Fighter->rightMissle->WeaponPower->get_power_cell_1();
	int tempPixelCntRMPower = manager->Fighter->rightMissle->WeaponPower->get_power_cell_2();
	
	int tempPixelCntBRate = manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1();
	int tempPixelCntBPower = manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2();
	
	
	manager->console->put_screen(SCREEN_WIDTH - CONSOLE_WIDTH, 0); 
	
	//manager->ingame_font->print_left(660,130,"Kills");
	
	char* newStr;
	newStr =  (char *)malloc( sizeof(char) * 10);
	newStr = itoa(manager->Fighter->getKillCount(), newStr, 10);
	
	manager->ingame_font->print_left(660,130,"Kills");
	manager->ingame_font->print_right(790,130, (const char*) newStr );
	
	manager->ingame_font->print_center(725,0,(const char*) manager->Fighter->ranking); 
	
	if(setting == 1)
	{
		manager->ingame_font->print_left(660,190,"speed setting 'Q'");
		manager->ingame_font_1->print_left(660,220,"power setting 'W'");
		manager->ingame_font_1->print_left(660,250,"armor setting 'E'");
	}
	else if(setting == 2)
	{
		manager->ingame_font_1->print_left(660,190,"speed setting 'Q'");
		manager->ingame_font->print_left(660,220,"power setting 'W'");
		manager->ingame_font_1->print_left(660,250,"armor setting 'E'");
	}
	else if(setting == 3)
	{
		manager->ingame_font_1->print_left(660,190,"speed setting 'Q'");
		manager->ingame_font_1->print_left(660,220,"power setting 'W'");
		manager->ingame_font->print_left(660,250,"armor setting 'E'");
	}
	
	
	newStr = itoa(manager->Fighter->getPowerUpCount(), newStr, 10);
	
	manager->ingame_font->print_left(660,280,"RU's");
	manager->ingame_font->print_left(700,280, (const char*) newStr);
	
	manager->ingame_font->print_center(688,335,"Shields");
	manager->ingame_font->print_center(760,335,"Armor");
	
	free (newStr);
	
	for (temp = 0; temp<tempPixelCntSheild; temp++)	
		CL_Display::fill_rect( SHIP_SHIELD_X_POS, SHIP_Y_POS-((temp*BAR_HEIGHT)+2), SHIP_SHIELD_X_POS+BAR_WIDTH, (SHIP_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntEngine; temp++)	
		CL_Display::fill_rect( SHIP_ENGINE_X_POS, SHIP_Y_POS-((temp*BAR_HEIGHT)+2), SHIP_ENGINE_X_POS+BAR_WIDTH, (SHIP_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLTRate; temp++)	
		CL_Display::fill_rect( L_TURRET_RATE_X_POS, TURRET_Y_POS-((temp*BAR_HEIGHT)+2), L_TURRET_RATE_X_POS+BAR_WIDTH, (TURRET_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLTPower; temp++)
		CL_Display::fill_rect( L_TURRET_POWER_X_POS, TURRET_Y_POS-((temp*BAR_HEIGHT)+2), L_TURRET_POWER_X_POS+BAR_WIDTH, (TURRET_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRTRate; temp++)	
		CL_Display::fill_rect( R_TURRET_RATE_X_POS, TURRET_Y_POS-((temp*BAR_HEIGHT)+2), R_TURRET_RATE_X_POS+BAR_WIDTH, (TURRET_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRTPower; temp++)	
		CL_Display::fill_rect( R_TURRET_POWER_X_POS, TURRET_Y_POS-((temp*BAR_HEIGHT)+2), R_TURRET_POWER_X_POS+BAR_WIDTH, (TURRET_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLMRate; temp++)	
		CL_Display::fill_rect( L_MISSLE_RATE_X_POS, MISSLE_Y_POS-((temp*BAR_HEIGHT)+2), L_MISSLE_RATE_X_POS+BAR_WIDTH, (MISSLE_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLMPower; temp++)	
		CL_Display::fill_rect( L_MISSLE_POWER_X_POS, MISSLE_Y_POS-((temp*BAR_HEIGHT)+2), L_MISSLE_POWER_X_POS+BAR_WIDTH, (MISSLE_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRMRate; temp++)	
		CL_Display::fill_rect( R_MISSLE_RATE_X_POS, MISSLE_Y_POS-((temp*BAR_HEIGHT)+2), R_MISSLE_RATE_X_POS+BAR_WIDTH, (MISSLE_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRMPower; temp++)
		CL_Display::fill_rect( R_MISSLE_POWER_X_POS, MISSLE_Y_POS-((temp*BAR_HEIGHT)+2), R_MISSLE_POWER_X_POS+BAR_WIDTH, (MISSLE_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntBRate; temp++)	
		CL_Display::fill_rect( BLASTER_RATE_X_POS, BLASTER_Y_POS-((temp*BAR_HEIGHT)+2), BLASTER_RATE_X_POS+BAR_WIDTH, (BLASTER_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntBPower; temp++)
		CL_Display::fill_rect( BLASTER_POWER_X_POS, BLASTER_Y_POS-((temp*BAR_HEIGHT)+2), BLASTER_POWER_X_POS+BAR_WIDTH, (BLASTER_Y_POS-((temp*BAR_HEIGHT)))-BAR_HEIGHT,0.0f,1.0f,0.0f);
	
	//armour display caluculation
	if (manager->Fighter->armor >=150)	
		CL_Display::fill_rect( ARMOR_X_POS, ARMOR_Y_POS, ARMOR_X_POS+ARMOR_BAR_WIDTH,ARMOR_Y_POS-(manager->Fighter->armor*(.666f)),(((float)manager->Fighter->armor*(-0.015f))+4.5f),1.0f,0.0f);
	else if(manager->Fighter->armor >0 && manager->Fighter->armor <150)
		CL_Display::fill_rect( ARMOR_X_POS, ARMOR_Y_POS, ARMOR_X_POS+ARMOR_BAR_WIDTH,ARMOR_Y_POS-(manager->Fighter->armor*(.666f)),1.0f,((float)manager->Fighter->armor*.0066f),0.0f);
	//shields display calculations
	if (manager->Fighter->shields >=150)
		CL_Display::fill_rect( SHIELDS_X_POS, SHIELDS_Y_POS, SHIELDS_X_POS+SHIELDS_BAR_WIDTH,SHIELDS_Y_POS-(manager->Fighter->shields*(.666f)),(((float)manager->Fighter->shields*(-0.015f))+4.5f),1.0f,0.0f);
	else if(manager->Fighter->shields >0 && manager->Fighter->shields <150)
		CL_Display::fill_rect( SHIELDS_X_POS, SHIELDS_Y_POS, SHIELDS_X_POS+SHIELDS_BAR_WIDTH,SHIELDS_Y_POS-(manager->Fighter->shields*(.666f)),1.0f,((float)manager->Fighter->shields*.0066f),0.0f);
	
}

void GUI::display_stats(GameManager *manager)
{
	tempStr = itoa(manager->Fighter->getKillCount(), tempStr, 10);
	
	
	manager->font->print_left(600,35,"Kills:");
	manager->font->print_left(675,35, (const char*) tempStr );
	
	manager->font->print_center(400,35,(const char*) manager->Fighter->ranking); 
	
	tempStr = itoa(manager->Fighter->getPowerUpCount(), tempStr, 10);
	
	manager->font->print_left(5,35,"RU's:");
	manager->font->print_left(55,35, (const char*) tempStr);
	
}


//takes care of showing the power settings
void GUI::display_power(GameManager *manager, int _x, int _y)
{
	int temp;
	
	//update energy settings
	if(manager->setting_1_button->is_pressed() == true)
	{
		manager->Fighter->load_ship_setting( SETTING_1 );
		setting = 1;
	}
	if((_x<=800 && _x >=520)&&(_y<=110 && _y >=80))
	{
		if(CL_Mouse::left_pressed())
		{
			manager->Fighter->load_ship_setting( SETTING_1 );
			setting = 1;
		}
	}
	
	if(manager->setting_2_button->is_pressed() == true)
	{
		manager->Fighter->load_ship_setting( SETTING_2 );
		setting = 2;
	}
	if((_x<=800 && _x >=520)&&(_y<=140 && _y >=111))
	{
		if(CL_Mouse::left_pressed())
		{
			manager->Fighter->load_ship_setting( SETTING_2 );
			setting = 2;
		}
	}
	
	if(manager->setting_3_button->is_pressed() == true)
	{
		manager->Fighter->load_ship_setting( SETTING_3 );
		setting = 3;
	}
	if((_x<=800 && _x >=520)&&(_y<=170 && _y >=141))
	{
		if(CL_Mouse::left_pressed())
		{
			manager->Fighter->load_ship_setting( SETTING_3 );
			setting = 3;
		}
	}
	manager->font->print_left(520,80,"User Settings");
	if(setting == 1)
	{
		manager->font->print_left(520,110,"speed setting (HOTKEY 'Q')");
		manager->inactive_font->print_left(520,140,"power setting (HOTKEY 'W')");
		manager->inactive_font->print_left(520,170,"armor setting (HOTKEY 'E')");
		
	}
	else if(setting == 2)
	{
		manager->inactive_font->print_left(520,110,"speed setting (HOTKEY 'Q')");
		manager->font->print_left(520,140,"power setting (HOTKEY 'W')");
		manager->inactive_font->print_left(520,170,"armor setting (HOTKEY 'E')");
		
	}
	else if(setting == 3)
	{
		manager->inactive_font->print_left(520,110,"speed setting (HOTKEY 'Q')");
		manager->inactive_font->print_left(520,140,"power setting (HOTKEY 'W')");
		manager->font->print_left(520,170,"armor setting (HOTKEY 'E')");
		
	}
				
				
	int tempPixelCntSheild = manager->Fighter->ShipPower->get_power_cell_1();
	int tempPixelCntEngine = manager->Fighter->ShipPower->get_power_cell_2();
	
	int tempPixelCntLTRate = manager->Fighter->leftTurret->WeaponPower->get_power_cell_1();  
	int tempPixelCntLTPower = manager->Fighter->leftTurret->WeaponPower->get_power_cell_2(); 
	
	int tempPixelCntRTRate = manager->Fighter->rightTurret->WeaponPower->get_power_cell_1();
	int tempPixelCntRTPower = manager->Fighter->rightTurret->WeaponPower->get_power_cell_2();
	
	int tempPixelCntLMRate = manager->Fighter->leftMissle->WeaponPower->get_power_cell_1();
	int tempPixelCntLMPower = manager->Fighter->leftMissle->WeaponPower->get_power_cell_2();
	
	int tempPixelCntRMRate = manager->Fighter->rightMissle->WeaponPower->get_power_cell_1();
	int tempPixelCntRMPower = manager->Fighter->rightMissle->WeaponPower->get_power_cell_2();
	
	int tempPixelCntBRate = manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1();
	int tempPixelCntBPower = manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2();
	
	for (temp = 0; temp<tempPixelCntSheild; temp++)
		CL_Display::fill_rect(  C_SHIP_SHIELD_X_POS, 
		C_SHIP_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_SHIP_SHIELD_X_POS+C_BAR_WIDTH, 
		(C_SHIP_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntEngine; temp++)	
		CL_Display::fill_rect(  C_SHIP_ENGINE_X_POS, 
		C_SHIP_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_SHIP_ENGINE_X_POS+C_BAR_WIDTH, 
		(C_SHIP_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	for (temp = 0; temp<tempPixelCntLTRate; temp++)	
		CL_Display::fill_rect(  C_L_TURRET_RATE_X_POS, 
		C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_L_TURRET_RATE_X_POS+C_BAR_WIDTH, 
		(C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLTPower; temp++)
		CL_Display::fill_rect( C_L_TURRET_POWER_X_POS, 
		C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_L_TURRET_POWER_X_POS+C_BAR_WIDTH, 
		(C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRTRate; temp++)	
		CL_Display::fill_rect( C_R_TURRET_RATE_X_POS, 
		C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_R_TURRET_RATE_X_POS+C_BAR_WIDTH, 
		(C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRTPower; temp++)	
		CL_Display::fill_rect( C_R_TURRET_POWER_X_POS, 
		C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_R_TURRET_POWER_X_POS+C_BAR_WIDTH, 
		(C_TURRET_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntLMRate; temp++)	
		CL_Display::fill_rect( C_L_MISSLE_RATE_X_POS, 
		C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_L_MISSLE_RATE_X_POS+C_BAR_WIDTH, 
		(C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);	
	
	for (temp = 0; temp<tempPixelCntLMPower; temp++)	
		CL_Display::fill_rect( C_L_MISSLE_POWER_X_POS, 
		C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_L_MISSLE_POWER_X_POS+C_BAR_WIDTH, 
		(C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRMRate; temp++)	
		CL_Display::fill_rect( C_R_MISSLE_RATE_X_POS, 
		C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_R_MISSLE_RATE_X_POS+C_BAR_WIDTH, 
		(C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntRMPower; temp++)
		CL_Display::fill_rect( C_R_MISSLE_POWER_X_POS, 
		C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_R_MISSLE_POWER_X_POS+C_BAR_WIDTH, 
		(C_MISSLE_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntBRate; temp++)	
		CL_Display::fill_rect( C_BLASTER_RATE_X_POS, 
		C_BLASTER_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_BLASTER_RATE_X_POS+C_BAR_WIDTH, 
		(C_BLASTER_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);
	
	for (temp = 0; temp<tempPixelCntBPower; temp++)
		CL_Display::fill_rect( C_BLASTER_POWER_X_POS, 
		C_BLASTER_Y_POS-((temp*C_BAR_HEIGHT)+4), 
		C_BLASTER_POWER_X_POS+C_BAR_WIDTH, 
		(C_BLASTER_Y_POS-((temp*C_BAR_HEIGHT)))-C_BAR_HEIGHT,
		0.0f,1.0f,0.0f);	
	
	
 }
 
 void GUI::nose_blaster_clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Nose Blaster";
	 manager->gui_button->put_screen(250,63);
	 manager->font->print_left(20, 390, "Research:");
	 manager->font->print_left(50, 420, "n/a");
	 manager->font->print_left(160,420, "cost = ");
	 manager->font->print_left(240,420, "0");
	 manager->buy_button->put_screen(300, 400);
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shot Rate");
	 manager->font->print_left(20, 350, "Right column determines Shot Power");
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_1((
							 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_2((
							 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 nb_overflow = 1;
					 }			 
				 }
				 if(nb_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
			 }
		 }
	 }
	 if (nb_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 //arrow button		
	 if(_x >= 250 && _x <= 250+10)
	 {
		 if((_y >= 63 && _y <=63+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_1((
					 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1() + 1));
				 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_2((
					 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=63+20 && _y<=63+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_2((
					 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_2() + 1));
				 manager->Fighter->noseBlaster->WeaponPower->set_power_cell_1((
					 manager->Fighter->noseBlaster->WeaponPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
	 
 }
 void GUI::l_turret_clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Left Turret";
	 manager->gui_button->put_screen(132,123);
	 manager->font->print_left(20, 390, "Research:");
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shot Rate");
	 manager->font->print_left(20, 350, "Right column determines Shot Power");
	 if(manager->turret_angle_available)
	 {
		 manager->font->print_left(110, 390, "Already Researched");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "n/a");
		 manager->left_turret_pannel->put_screen(450,350);
		 //turret angle slector
		 if((_x >= 450 && _x <= 472) && (_y >= 350 && _y <= 382))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 1;
				 manager->Fighter->leftTurret->set_angle(90);
				 manager->Fighter->save_ship_setting(setting);
				 
			 }
		 }
		 else if((_x >= 450 && _x <= 472) && (_y >= 392 && _y <= 424))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 2;
				 manager->Fighter->leftTurret->set_angle(135);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 434 && _y <= 466))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 3;
				 manager->Fighter->leftTurret->set_angle(180);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 476 && _y <= 508))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 4;
				 manager->Fighter->leftTurret->set_angle(225);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 518 && _y <= 550))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 5;
				 manager->Fighter->leftTurret->set_angle(270);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 switch(manager->Fighter->leftTurret->get_angle())
		 {
		 case 90:
			 selected = 1;
			 break;
		 case 135:
			 selected = 2;
			 break;
		 case 180:
			 selected = 3;
			 break;
		 case 225:
			 selected = 4;
			 break;
		 case 270:
			 selected = 5;
			 break;
		 default:
			 break;
		 }
		 switch(selected)
		 {
		 case 1:
			 manager->turret_selector->put_screen(450,350);
			 break;
		 case 2:
			 manager->turret_selector->put_screen(450,392);
			 break;
		 case 3:
			 manager->turret_selector->put_screen(450,434);
			 break;
		 case 4:
			 manager->turret_selector->put_screen(450,476);
			 break;
		 case 5:
			 manager->turret_selector->put_screen(450,518);
			 break;
		 default:
			 break;
		 }
	 }
	 else if(!manager->turret_angle_available)
	 {
		 manager->font->print_left(110, 390, "Turret Rotation");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "5");
		 manager->buy_button->put_screen(300, 400);
		 
		 
		 //research buy button
		 if((_x >= 300 && _x <= 364) && (_y >= 400 && _y <= 432))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 if(sound_played == 0){
					 Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 else
				 {
					 sound_played = 0;
				 }
				 
				 if(manager->Fighter->getPowerUpCount()>=5)
				 {
					 manager->turret_angle_available = true;
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 5);
				 }
				 else
				 {
					 manager->large_font->print_left(20, 590, "You Don't Have Enough Resource Units!");
				 }
			 }
		 }
	 }
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->leftTurret->WeaponPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->leftTurret->WeaponPower->set_power_cell_1((
							 manager->Fighter->leftTurret->WeaponPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->leftTurret->WeaponPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->leftTurret->WeaponPower->set_power_cell_2((
							 manager->Fighter->leftTurret->WeaponPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 lt_overflow = 1;
					 }			 
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
				 if(lt_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
				 
			 }
		 }
	 }
	 if (lt_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 //arrow button
	 if(_x >= 132 && _x <= 132+10)
	 {
		 if((_y >= 123 && _y <=123+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->leftTurret->WeaponPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->leftTurret->WeaponPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->leftTurret->WeaponPower->set_power_cell_1((
					 manager->Fighter->leftTurret->WeaponPower->get_power_cell_1() + 1));
				 manager->Fighter->leftTurret->WeaponPower->set_power_cell_2((
					 manager->Fighter->leftTurret->WeaponPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=123+20 && _y<=123+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->leftTurret->WeaponPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->leftTurret->WeaponPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->leftTurret->WeaponPower->set_power_cell_2((
					 manager->Fighter->leftTurret->WeaponPower->get_power_cell_2() + 1));
				 manager->Fighter->leftTurret->WeaponPower->set_power_cell_1((
					 manager->Fighter->leftTurret->WeaponPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
	 
	 
 }
 void GUI::r_turret_clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Right Turret";
	 manager->gui_button->put_screen(372,123);
	 manager->font->print_left(20, 390, "Research:");
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shot Rate");
	 manager->font->print_left(20, 350, "Right column determines Shot Power");
	 if(manager->turret_angle_available)
	 {
		 manager->font->print_left(110, 390, "Already Researched");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "n/a");
		 manager->right_turret_pannel->put_screen(450,350);
		 //turret angle slector
		 if((_x >= 450 && _x <= 472) && (_y >= 350 && _y <= 382))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 1;
				 manager->Fighter->rightTurret->set_angle(90);
				 manager->Fighter->save_ship_setting(setting);
				 
			 }
		 }
		 else if((_x >= 450 && _x <= 472) && (_y >= 392 && _y <= 424))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 2;
				 manager->Fighter->rightTurret->set_angle(45);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 434 && _y <= 466))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 3;
				 manager->Fighter->rightTurret->set_angle(0);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 476 && _y <= 508))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 4;
				 manager->Fighter->rightTurret->set_angle(315);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 else if((_x >= 450 && _x <= 472) && (_y >= 518 && _y <= 550))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 selected = 5;
				 manager->Fighter->rightTurret->set_angle(270);
				 manager->Fighter->save_ship_setting(setting);
			 }
		 }
		 
		 switch(manager->Fighter->rightTurret->get_angle())
		 {
		 case 90:
			 selected = 1;
			 break;
		 case 45:
			 selected = 2;
			 break;
		 case 0:
			 selected = 3;
			 break;
		 case 315:
			 selected = 4;
			 break;
		 case 270:
			 selected = 5;
			 break;
		 default:
			 break;
		 }
		 switch(selected)
		 {
		 case 1:
			 manager->turret_selector->put_screen(450,350);
			 break;
		 case 2:
			 manager->turret_selector->put_screen(450,392);
			 break;
		 case 3:
			 manager->turret_selector->put_screen(450,434);
			 break;
		 case 4:
			 manager->turret_selector->put_screen(450,476);
			 break;
		 case 5:
			 manager->turret_selector->put_screen(450,518);
			 break;
		 default:
			 break;
		 }
	 }
	 else if(!manager->turret_angle_available)
	 {
		 manager->font->print_left(110, 390, "Turret Rotation");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "5");
		 manager->buy_button->put_screen(300, 400);
		 
		 
		 //research buy button
		 if((_x >= 300 && _x <= 364) && (_y >= 400 && _y <= 432))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 if(sound_played == 0){
					 Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 else
				 {
					 sound_played = 0;
				 }
				 
				 if(manager->Fighter->getPowerUpCount()>=5)
				 {
					 manager->turret_angle_available = true;
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 5);
				 }
				 else
				 {
					 manager->large_font->print_left(20, 590, "You Don't Have Enough Resource Units!");
				 }
			 }
		 }
	 }
	 
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->rightTurret->WeaponPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->rightTurret->WeaponPower->set_power_cell_1((
							 manager->Fighter->rightTurret->WeaponPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->rightTurret->WeaponPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->rightTurret->WeaponPower->set_power_cell_2((
							 manager->Fighter->rightTurret->WeaponPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 rt_overflow = 1;
					 }			 
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
				 if(rt_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
			 }
		 }
	 }
	 if (rt_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 
	 //arrow stuff
	 if(_x >= 372 && _x <= 372+10)
	 {
		 if((_y >= 123 && _y <=123+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->rightTurret->WeaponPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->rightTurret->WeaponPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->rightTurret->WeaponPower->set_power_cell_1((
					 manager->Fighter->rightTurret->WeaponPower->get_power_cell_1() + 1));
				 manager->Fighter->rightTurret->WeaponPower->set_power_cell_2((
					 manager->Fighter->rightTurret->WeaponPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=123+20 && _y<=123+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->rightTurret->WeaponPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->rightTurret->WeaponPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->rightTurret->WeaponPower->set_power_cell_2((
					 manager->Fighter->rightTurret->WeaponPower->get_power_cell_2() + 1));
				 manager->Fighter->rightTurret->WeaponPower->set_power_cell_1((
					 manager->Fighter->rightTurret->WeaponPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
 }
 void GUI::l_missle__clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Left Photon Torpedo";
	 manager->gui_button->put_screen(209,133);
	 manager->font->print_left(20, 390, "Research:");
	 /*manager->font->print_left(20, 450, "Homing");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "15");
	 manager->buy_button->put_screen(300, 400);*/
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shot Rate");
	 manager->font->print_left(20, 350, "Right column determines Shot Power");
	 //homing
	 if(manager->isHoming)
	 {
		 manager->font->print_left(110, 390, "Already Researched");
		 
		 manager->font->print_left(240,420, "Homing Researched");
	 }
	 else
	 {
		 manager->font->print_left(110, 390, "Homing");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "15");
		 manager->buy_button->put_screen(300, 400);
		 //research buy button
		 if((_x >= 300 && _x <= 364) && (_y >= 400 && _y <= 432))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 if(sound_played == 0){
					 Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 else
				 {
					 sound_played = 0;
				 }
				 if(manager->Fighter->getPowerUpCount()>=15)
				 {
					 manager->isHoming = true;
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 15);
				 }
				 else
				 {
					 manager->large_font->print_left(20, 590, "You Don't Have Enough Resource Units!");
				 }
			 }
		 }
	 }
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->leftMissle->WeaponPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->leftMissle->WeaponPower->set_power_cell_1((
							 manager->Fighter->leftMissle->WeaponPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->leftMissle->WeaponPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->leftMissle->WeaponPower->set_power_cell_2((
							 manager->Fighter->leftMissle->WeaponPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 lm_overflow = 1;
					 }			 
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
				 if(lm_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
			 }
		 }
	 }
	 if (lm_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 
	 //arrow stuff
	 if(_x >= 209 && _x <= 209+10)
	 {
		 if((_y >= 133 && _y <=133+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->leftMissle->WeaponPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->leftMissle->WeaponPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->leftMissle->WeaponPower->set_power_cell_1((
					 manager->Fighter->leftMissle->WeaponPower->get_power_cell_1() + 1));
				 manager->Fighter->leftMissle->WeaponPower->set_power_cell_2((
					 manager->Fighter->leftMissle->WeaponPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=133+20 && _y<=133+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->leftMissle->WeaponPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->leftMissle->WeaponPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->leftMissle->WeaponPower->set_power_cell_2((
					 manager->Fighter->leftMissle->WeaponPower->get_power_cell_2() + 1));
				 manager->Fighter->leftMissle->WeaponPower->set_power_cell_1((
					 manager->Fighter->leftMissle->WeaponPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
 }
 void GUI::r_missle_clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Right Photon Torpedo";
	 manager->gui_button->put_screen(297,133);
	 manager->font->print_left(20, 390, "Research:");
	 /*manager->font->print_left(50, 420, "n/a");
	 manager->font->print_left(160,420, "cost = ");
	 manager->font->print_left(240,420, "0");
	 manager->buy_button->put_screen(300, 400);*/
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shot Rate");
	 manager->font->print_left(20, 350, "Right column determines Shot Power");
	 //homing
	 if(manager->isHoming)
	 {
		 manager->font->print_left(110, 390, "Already Researched");
		 
		 manager->font->print_left(240,420, "Homing Researched");
	 }
	 else
	 {
		 manager->font->print_left(110, 390, "Homing");
		 manager->font->print_left(160,420, "cost = ");
		 manager->font->print_left(240,420, "15");
		 manager->buy_button->put_screen(300, 400);
		 //research buy button
		 if((_x >= 300 && _x <= 364) && (_y >= 400 && _y <= 432))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 if(sound_played == 0){
					 Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 else
				 {
					 sound_played = 0;
				 }
				 
				 if(manager->Fighter->getPowerUpCount()>=15)
				 {
					 manager->isHoming = true;
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 15);
				 }
				 else
				 {
					 manager->large_font->print_left(20, 590, "You Don't Have Enough Resource Units!");
				 }
			 }
		 }
	 }
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->rightMissle->WeaponPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->rightMissle->WeaponPower->set_power_cell_1((
							 manager->Fighter->rightMissle->WeaponPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->rightMissle->WeaponPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->rightMissle->WeaponPower->set_power_cell_2((
							 manager->Fighter->rightMissle->WeaponPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 rm_overflow = 1;
					 }			 
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
				 if(rm_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
			 }
		 }
	 }
	 if (rm_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 
	 //arrow stuff
	 if(_x >= 297 && _x <= 297+10)
	 {
		 if((_y >= 133 && _y <=133+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->rightMissle->WeaponPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->rightMissle->WeaponPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->rightMissle->WeaponPower->set_power_cell_1((
					 manager->Fighter->rightMissle->WeaponPower->get_power_cell_1() + 1));
				 manager->Fighter->rightMissle->WeaponPower->set_power_cell_2((
					 manager->Fighter->rightMissle->WeaponPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=133+20 && _y<=133+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->rightMissle->WeaponPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->rightMissle->WeaponPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->rightMissle->WeaponPower->set_power_cell_2((
					 manager->Fighter->rightMissle->WeaponPower->get_power_cell_2() + 1));
				 manager->Fighter->rightMissle->WeaponPower->set_power_cell_1((
					 manager->Fighter->rightMissle->WeaponPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
 }
 void GUI::engine_clicked(GameManager *manager, int _x, int _y)
 {
	 int sound_played = 0;
	 
	 weaponStr = "Power Plant";
	 manager->gui_button->put_screen(249,213);
	 manager->font->print_left(20, 390, "Research:");
	 manager->font->print_left(50, 420, "n/a");
	 manager->font->print_left(160,420, "cost = ");
	 manager->font->print_left(240,420, "0");
	 manager->buy_button->put_screen(300, 400);
	 manager->font->print_left(20, 450, "Power pods:");
	 manager->font->print_left(160,480, "cost = ");
	 manager->font->print_left(240,480, "1");
	 manager->buy_button->put_screen(300, 460);
	 manager->font->print_left(20, 325, "Left column determines Shield Recharge Rate");
	 manager->font->print_left(20, 350, "Right column determines Ship Maneuverability");
	 //power pod buy button stuff
	 if((_x >= 300 && _x <= 364) && (_y >= 460 && _y <= 492))
	 {
		 if(CL_Mouse::left_pressed())
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 else
			 {
				 sound_played = 0;
			 }
			 
			 if(manager->Fighter->getPowerUpCount()>0)
			 {
				 for(int i = 1; i<4; i++)
				 {
					 
					 manager->Fighter->load_ship_setting( i );
					 if(manager->Fighter->ShipPower->get_power_cell_1() < 5)
					 {
						 manager->Fighter->ShipPower->set_power_cell_1((
							 manager->Fighter->ShipPower->get_power_cell_1() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else if(manager->Fighter->ShipPower->get_power_cell_2() < 5)
					 {
						 manager->Fighter->ShipPower->set_power_cell_2((
							 manager->Fighter->ShipPower->get_power_cell_2() + 1));
						 save_setting(manager, i );
						 CL_System::sleep(40);
					 }
					 else
					 {
						 e_overflow = 1;
					 }			 
				 }
				 manager->Fighter->load_ship_setting( GUI::setting);
				 if(e_overflow != 1)
				 {
					 manager->Fighter->setPowerUpCount(manager->Fighter->getPowerUpCount() - 1);
				 }
			 }
		 }
	 }
	 if (e_overflow == 1)
	 {
		 manager->large_font->print_left(20, 590, "Max Number of Power Cells Reached!");
	 }
	 else if (manager->Fighter->getPowerUpCount()<=0)
	 {
		 manager->large_font->print_left(20, 590, "You Have No More Resource Units!");
	 }
	 
	 
	 //arrow stuff
	 if(_x >= 249 && _x <= 249+10)
	 {
		 if((_y >= 213 && _y <=213+10)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->ShipPower->get_power_cell_1()<5)
				 &&
				 (manager->Fighter->ShipPower->get_power_cell_2()>1))
			 {
				 manager->Fighter->ShipPower->set_power_cell_1((
					 manager->Fighter->ShipPower->get_power_cell_1() + 1));
				 manager->Fighter->ShipPower->set_power_cell_2((
					 manager->Fighter->ShipPower->get_power_cell_2() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
		 else if((_y >=213+20 && _y<=213+30)&&(CL_Mouse::left_pressed()))
		 {
			 if((manager->Fighter->ShipPower->get_power_cell_2()<5)
				 &&
				 (manager->Fighter->ShipPower->get_power_cell_1()>1))
			 {
				 manager->Fighter->ShipPower->set_power_cell_2((
					 manager->Fighter->ShipPower->get_power_cell_2() + 1));
				 manager->Fighter->ShipPower->set_power_cell_1((
					 manager->Fighter->ShipPower->get_power_cell_1() - 1));
				 save_setting(manager, GUI::setting);
				 CL_System::sleep(80);
			 }
		 }
	 }
	 
	 //show feedback
	 GUI::engine_feedback(manager);
	 
	 
	 
	 
 }
 int GUI::what_system(int _x, int _y, int sound_played)
 {	
	 if((_x>=215 && _x<=290)&&
		 (_y>=45 && _y<=110))
	 {
		 if(sound_played == 0){
			 Sound::playGUIMouseClick();
			 sound_played = 1;
		 }
		 
		 if(CL_Mouse::left_pressed())
		 {
			 energy_system = NoseBlaster;
		 }
	 }
	 else 
		 if((_x>=100 && _x<=170)&&
			 (_y>=105 && _y<=170))
		 {
			 if(sound_played == 0){
				 Sound::playGUIMouseClick();
				 sound_played = 1;
			 }
			 
			 if(CL_Mouse::left_pressed())
			 {
				 energy_system = LTurret;
			 }
		 }
		 else 
			 if((_x>=340 && _x<=410)&&
				 (_y>=105 && _y<=170))
			 {
				 if(sound_played == 0){
					 Sound::playGUIMouseClick();
					 sound_played = 1;
				 }
				 
				 if(CL_Mouse::left_pressed())
				 {
					 energy_system = RTurret;
				 }
			 }
			 else 
				 if((_x>=180 && _x<=245)&&
					 (_y>=115 && _y<=180))
				 {
					 if(sound_played == 0){
						 Sound::playGUIMouseClick();
						 sound_played = 1;
					 }
					 
					 if(CL_Mouse::left_pressed())
					 {
						 energy_system = LMissle;
					 }
				 }
				 else 
					 if((_x>=265 && _x<=335)&&
						 (_y>=115 && _y<=180))
					 {
						 if(sound_played == 0){
							 Sound::playGUIMouseClick();
							 sound_played = 1;
						 }
						 
						 if(CL_Mouse::left_pressed())
						 {
							 energy_system = RMissle;
						 }
					 }
					 else 
						 if((_x>=220 && _x<=290)&&
							 (_y>=195 && _y<=265))
						 {
							 if(sound_played == 0){
								 Sound::playGUIMouseClick();
								 sound_played = 1;
							 }
							 
							 if(CL_Mouse::left_pressed())
							 {
								 energy_system = Engine;
							 }
						 }
						 else{
							 sound_played = 0;
							 energy_system = None;
						 }
						 return sound_played;
						 
 }
 void GUI::activate(GameManager *manager, int _x, int _y)
 {
	 switch(energy_system)
	 {
	 case NoseBlaster:
		 nose_blaster_clicked(manager,_x,_y);
		 break;
	 case LTurret:
		 l_turret_clicked(manager,_x,_y);
		 break;
	 case RTurret:
		 r_turret_clicked(manager,_x,_y);
		 break;
	 case LMissle:
		 l_missle__clicked(manager,_x,_y);
		 break;
	 case RMissle:		 
		 r_missle_clicked(manager,_x,_y);
		 break;
	 case Engine:		
		 engine_clicked(manager,_x,_y);
		 break;
	 case None:
		 weaponStr = "All";
		 manager->cust_start->put_screen(0,300);
		 engine_feedback(manager);
		 break;
	 default:
		 weaponStr = "not working";
		 break;
	 }
	 
	 manager->font->print_left(10,285, "System Selected:");
	 manager->font->print_left(160,285, (const char*) weaponStr);
	 manager->font->print_right(490,260, "Select All Systems");
 }
 
 //draws ship and projectiles
 void GUI::display_ship(GameManager *manager)
 {
	 bool nose, lt, rt, lm, rm;
	 
	 
	 //switch sets up which weapons to fire
	 switch(energy_system)
	 {
	 case NoseBlaster:
		 nose = true;
		 lt =false;
		 rt =false;
		 lm =false;
		 rm =false;
		 break;
	 case LTurret:
		 lt =true;
		 nose = false;
		 rt =false;
		 lm =false;
		 rm =false;
		 break;
	 case RTurret:
		 rt = true;
		 nose = false;
		 lt =false;
		 lm =false;
		 rm =false;
		 break;
	 case LMissle:
		 lm = true;
		 nose = false;
		 lt =false;
		 rt =false;
		 rm =false;
		 break;
	 case RMissle:
		 rm = true;
		 nose = false;
		 lt =false;
		 rt =false;
		 lm =false;
		 
		 break;
	 case Engine:
		 nose = false;
		 lt =false;
		 rt =false;
		 lm =false;
		 rm =false;
		 
		 break;
	 case None:
		 nose = true;
		 lt =true;
		 rt =true;
		 lm =true;
		 rm =true;
		 break;
	 default:
		 nose = false;
		 lt =false;
		 rt =false;
		 lm =false;
		 rm =false;
		 break;
	 }
	 
	 manager->Fighter->update_gui(nose,lt,rt,lm,rm);
	 //draws all player projetiles
	 for (	std::list<Projectile*>::iterator itPlayerProj = manager->player_projectiles.begin();
	 itPlayerProj !=  manager->player_projectiles.end();
	 itPlayerProj)
	 {
		 // update the projectiles - i.e draw and move them
		 // if they get drawn off the screen destory them
		 Projectile* tempProjectile = *itPlayerProj;
		 itPlayerProj++;
		 
		 if( (tempProjectile)->update_GUI()  == false)
		 {
			 manager->player_projectiles.remove(tempProjectile);
			 delete(tempProjectile);
		 }
		 
	 }
	 
 }
 
 void GUI::save_setting(GameManager *manager, int setting)
 {
	 switch (setting)
	 {
	 case 1:
		 manager->Fighter->save_ship_setting(SETTING_1);
		 break;
	 case 2:
		 manager->Fighter->save_ship_setting(SETTING_2);
		 break;
	 case 3:
		 manager->Fighter->save_ship_setting(SETTING_3);
		 break;
	 default:
		 break;
	 }
	 
 }
 
 void GUI::engine_feedback(GameManager *manager)
 {
	 static int move = 0; 
	 //sheild stuff
	 manager->font->print_left((SHIELDS_X_POS + 73),(SHIELDS_Y_POS - 220), "Shields");
	 if(manager->Fighter->shields == 300)
	 {
		 manager->Fighter->shields = 0;
	 }
	 if (manager->Fighter->shields >=150)
		 CL_Display::fill_rect( (SHIELDS_X_POS + 73), (SHIELDS_Y_POS - 20), (SHIELDS_X_POS + 73)+SHIELDS_BAR_WIDTH,(SHIELDS_Y_POS - 20)-(manager->Fighter->shields*(.666f)),(((float)manager->Fighter->shields*(-0.015f))+4.5f),1.0f,0.0f);
	 else if(manager->Fighter->shields >0 && manager->Fighter->shields <150)
		 CL_Display::fill_rect( (SHIELDS_X_POS + 73), (SHIELDS_Y_POS - 20), (SHIELDS_X_POS + 73)+SHIELDS_BAR_WIDTH,(SHIELDS_Y_POS - 20)-(manager->Fighter->shields*(.666f)),1.0f,((float)manager->Fighter->shields*.0066f),0.0f);
	 
	 
	 //speed stuff
	 if(move>=0)
	 {
		 //gotta add the "7" here
		 move =  2*manager->Fighter->ShipPower->get_power_MUX(ENGINE_POWER);
	 }
	 else
	 {
		 //gotta add the "-7" here
		 move =   -2*manager->Fighter->ShipPower->get_power_MUX(ENGINE_POWER);
	 }
	 
	 if(manager->speedShip->get_x() >=(SHIELDS_X_POS + 30))
	 {
		 move = move*(-1);
	 }
	 else if(manager->speedShip->get_x()<=520)
	 {
		 move = move*(-1);
	 }
	 //manager->speedShip->set_velocity(move, 0);
	 
	 manager->speedShip->set_x( manager->speedShip->get_x() + move);
	 manager->speedShip->show(); 
	 //x = x + move;
	 //manager->speed_ship->put_screen(x,y);
 }
 //displays the XenoHammer ship specs
 void GUI::ship_specs(GameManager *manager)
 {
	 int _x,_y;
	 int sound_played = 0;
	 
	 manager->ship_specs = CL_Surface::load("Graphics/ship_specs", manager->gui_resources);
	 
	 while(1)
	 {
		 _x = CL_Mouse::get_x();
		 _y = CL_Mouse::get_y();
		 CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		 manager->ship_specs->put_screen(0,0);
		 if((_x >= 680 && _x <= 800) && (_y >= 540 && _y <= 600))
		 {
			 if(CL_Mouse::left_pressed())
			 {
				 if(sound_played == 0){
					//Sound::playGUIMouseClick();
					sound_played = 1;
				 }

				 break;
			 }
		 }
		 CL_System::keep_alive();
		 CL_Display::flip_display();
	 }
 }
 
 int GUI::set_difficulty(GameManager *manager)
 {
	 int started = 0,_x,_y,done = 0;
	 int sound_played = 0;
	 
	 manager->room_Screen = CL_Surface::load("Graphics/room_screen", manager->gui_resources);
	 
	 while (done == 0)
	 {
		 _x = CL_Mouse::get_x();
		 _y = CL_Mouse::get_y();
		 
		 CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		 manager->room_Screen->put_screen(0,0);
		 CL_Display::fill_rect(0,550,800,600,0.0f,0.0f,0.0f);
		 CL_Display::fill_rect(200,110,600,(110+33),0.2f,0.25f,0.2f);
		 CL_Display::fill_rect(200,185,600,(185+33),0.2f,0.25f,0.2f);
		 CL_Display::fill_rect(200,260,600,(260+33),0.2f,0.25f,0.2f);
		 CL_Display::fill_rect(200,335,600,(335+33),0.2f,0.25f,0.2f);
		 CL_Display::fill_rect(200,410,600,(410+33),0.2f,0.25f,0.2f);
		 
		 manager->large_font->print_center(400, 100+33, "Easy");
		 manager->large_font->print_center(400, 175+33, "Medium");
		 manager->large_font->print_center(400, 250+33, "Hard");
		 manager->large_font->print_center(400, 325+33, "Extremly Hard");
		 manager->large_font->print_center(400, 400+33, "Done");
		 
		 //easy
		 if((_x<=600&&_x>=200)&&(_y<=(110+33)&&_y>=(110)))
		 {
			 //manager->large_font->print_center(400,580,"Easy");
			 if(CL_Mouse::left_pressed())
			 {
				 											 if(sound_played == 0){
																 //Sound::playGUIMouseClick();
																 sound_played = 1;
															 }
															 
															 manager->difficulty = 0;
			 }
		 }
		 //medium
		 else if((_x<=600&&_x>=200)&&(_y<=(185+33)&&_y>=(185)))
		 {
			 //manager->large_font->print_center(400,580,"Medium");			
			 if(CL_Mouse::left_pressed())
			 {
				 											 if(sound_played == 0){
																 //Sound::playGUIMouseClick();
																 sound_played = 1;
															 }
															 
															 manager->difficulty = 1;
			 }
			 
		 }
		 //hard
		 else if((_x<=600&&_x>=200)&&(_y<=(260+33)&&_y>=(260)))
		 {
			 //manager->large_font->print_center(400,580,"Hard");			
			 if(CL_Mouse::left_pressed())
			 {
				 											 if(sound_played == 0){
																 //Sound::playGUIMouseClick();
																 sound_played = 1;
															 }
															 
															 manager->difficulty = 2;
			 }
		 }
		 //Extremely Hard
		 else if((_x<=600&&_x>=200)&&(_y<=(335+33)&&_y>=(335)))
		 {
			 //manager->large_font->print_center(400,580,"Extremely Hard");			
			 if(CL_Mouse::left_pressed())
			 {
				 											 if(sound_played == 0){
																 //Sound::playGUIMouseClick();
																 sound_played = 1;
															 }
															 
															 manager->difficulty = 3;
			 }
		 }
		 //Done
		 else if((_x<=600&&_x>=200)&&(_y<=(410+33)&&_y>=(410)))
		 {
			 //manager->large_font->print_center(400,580,"Done");			
			 if(CL_Mouse::left_pressed())
			 {
				 											 if(sound_played == 0){
																 //Sound::playGUIMouseClick();
																 sound_played = 1;
															 }
															 
															 return 2;
			 }
		 }
		 else
			 sound_played = 0;
		 
		 if(manager->difficulty == 0)
			 manager->large_font->print_center(400,580,"Easy is currently selected");
		 else if(manager->difficulty == 1)
			 manager->large_font->print_center(400,580,"Medium is currently selected");
		 else if(manager->difficulty == 2)
			 manager->large_font->print_center(400,580,"Hard is currently selected");
		 else if(manager->difficulty == 3)
			 manager->large_font->print_center(400,580,"Extremely Hard is currently selected");
		 
		 
		 CL_System::keep_alive();
		 CL_Display::flip_display();
	 }	
	 return -1;	
 }
 
 void GUI::Aftermath_GUI(GameManager *manager)
 {
	 int t = CL_System::get_time(), i = 600;
	 manager->aftermath = CL_Surface::load("Graphics/aftermath", manager->gui_resources);
	 //intialize the starField
	 manager->m_stars.Initialize(100, false, manager);
	 CL_OpenGL::end_2d();
	 
	 while(manager->exit_button->is_pressed() == false)
	 {
		 //CL_Display::clear_display(0.0f, 0.0f, 0.0f);
		 
		 //end drawing 2d only
		 CL_OpenGL::end_2d();
		 
		 manager->m_stars.Draw(manager->starSpeed , false);
		 
		 manager->GL_Controller->DrawGLStars(manager);
		 
		 //begin drawing 2d only
		 CL_OpenGL::begin_2d();
		 if(i>-550)
			 i= 600 - ((CL_System::get_time()-t)/60);
		 else
			 break;
		 manager->aftermath->put_screen(0,i);
		 
		 CL_System::keep_alive();
		 CL_Display::flip_display();
		 
	 }
	 
	 CL_OpenGL::begin_2d();
	 
	 //PAGE OUT BACKSTORY GRAPHIC
	 //	(manager->backstory)->~CL_Surface();
	 //	delete manager->backstory; 
 }