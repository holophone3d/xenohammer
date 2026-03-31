#include "PlayerShip.h"
#include "Weapon.h"
#include "GameManager.h"
#include "rankings.h"
#include "GUI.h"
#include "TParticleClass.h"
#include "Sound.h"

//PlayerShip::PlayerShip(int x, int y, GameManager *manager) 
	
bool PlayerShip::update(){
  static int update_time_start, update_time_end;
  
	if( is_destroyed == true)
		return false;
	

  if(update_time_start == 0)
	update_time_end = update_time_start = CL_System::get_time();
	
  update_time_end = CL_System::get_time();
  
	// pass the controller information to the fighter so it can update
	update_input(manager->hori_axis->get_pos(), manager->vert_axis->get_pos());

		this->show();
		noseBlaster->show(); 

		//update energy settings
		if(manager->setting_1_button->is_pressed() == true)
		{
			load_ship_setting( SETTING_1 );
			GUI::setting = 1;
		}
		
		if(manager->setting_2_button->is_pressed() == true)
		{
			load_ship_setting( SETTING_2 );
			GUI::setting = 2;
		}

		if(manager->setting_3_button->is_pressed() == true)
		{
			load_ship_setting( SETTING_3 );
			GUI::setting = 3;
		}




		if(manager->armor_button->is_pressed() == true)
				manager->select_target(); 

		if(manager->sheilds_button->is_pressed() == true)
				shields--;

		


		if(update_time_end > update_time_start + 150){
			update_time_start = CL_System::get_time();


		if(manager->fire_button->is_pressed() == true)
		{
			Sound::playPlayerShipFire();
			
			noseBlaster->fire(get_x(), get_y());
			leftTurret->fire(get_x(),  get_y());
			rightTurret->fire(get_x(), get_y());
			leftMissle->fire(get_x(), get_y());
			rightMissle->fire(get_x(), get_y());

		}
		else
		{
			Sound::stopPlayerShipFire();
		}
		
		// forces the update to occur only once every 150 milliseconds
		
	

		//Handle sheild recharge
		if( shields < MAX_SHIELD)
		{
			shields += ShipPower->get_power_MUX(SHIP_POWER_SHIELDS); 
			if(shields > MAX_SHIELD)
				shields = MAX_SHIELD;
		}


		
		}

	
		
		update_ranking();
	

	return true;
}
void PlayerShip::update_gui(bool fire_gun1, bool fire_gun2, bool fire_gun3,
							bool fire_gun4, bool fire_gun5)
{
	static int update_time_start, update_time_end;

	//set the state to nothing and relocate the plane
	x= 621;
	y= 383;
	dx= 0;
	dy = 0;
	curr_frame = 8;

	this->show();

	if(update_time_start == 0)
		update_time_end = update_time_start = CL_System::get_time();
		
	  update_time_end = CL_System::get_time(); 	

	if(update_time_end > update_time_start + 150){
		update_time_start = CL_System::get_time();


		if( fire_gun1 == true)
			noseBlaster->fire(get_x(), get_y());
		if( fire_gun2 == true)
			leftTurret->fire(get_x(),  get_y());
		if( fire_gun3 == true)
			rightTurret->fire(get_x(), get_y());
		if( fire_gun4 == true)
			leftMissle->fire(get_x(), get_y());
		if( fire_gun5 == true)
		rightMissle->fire(get_x(), get_y());


		//Handle sheild recharge
		if( shields < MAX_SHIELD)
		{
			shields += ShipPower->get_power_MUX(SHIP_POWER_SHIELDS); 
			if(shields > MAX_SHIELD)
				shields = MAX_SHIELD;
		}


	}

}

void PlayerShip::update_ranking()
{
		//ranking =  (char *)malloc( sizeof(char) * 10);
		if(getKillCount() < AIRMAN)
			ranking = "TEST PILOT";
		else if(getKillCount() < SERGEANT)
			ranking = "AIRMAN";
		else if(getKillCount() < LIEUTENANT)
			ranking = "SERGEANT";
		else if(getKillCount() < CAPTAIN)
			ranking = "LIEUTENANT";
		else if(getKillCount() < MAJOR)
			ranking = "CAPTAIN";
		else if(getKillCount() < COLONEL)
			ranking = "MAJOR";
		else if(getKillCount() < GENERAL)
			ranking = "COLONEL";
		else if(getKillCount() < HERO)
			ranking = "GENERAL";
		else if(getKillCount() < SAVIOR)
			ranking = "HERO";
		else if(getKillCount() < GOD)
			ranking = "SAVIOR";
		else if(getKillCount() < PONDEROSA)
			ranking = "GOD";
		else 
			ranking = "PONDEROSA";

}

int PlayerShip::load_shipInfo(GameManager *manager)
{
	int i; //loop counter
	int iKillCount;
	int iPowerUpCount;
	int iPowerCell1;
	int iPowerCell2;
	int iTurretAngle;
	int iTechnology;
	char *buffer = new char[50]; // was new char(50) — original bug: () allocates 1 byte, [] allocates 50

	// declare and open
	ifstream fp_in("savedplayer.txt", ios::in);

	// input stream didn't open
	if(!fp_in) return -1;

	//load the player's kills
	fp_in.getline(buffer, 50, '\n');
	fp_in >> iKillCount;
	fp_in.getline(buffer, 50, '\n');
	fp_in.getline(buffer, 50, '\n');

	setKillCount(iKillCount);

	//load the resource units
	fp_in.getline(buffer, 50, '\n');
	fp_in >> iPowerUpCount;
	fp_in.getline(buffer, 50, '\n');
	fp_in.getline(buffer, 50, '\n');

	setPowerUpCount(iPowerUpCount);

	//load the researched technology
	fp_in.getline(buffer, 50, '\n');
	fp_in >> iTechnology;

	if(iTechnology == 1){
		manager->turret_angle_available = true;
	}
	else{
		manager->turret_angle_available = false;
	}

	fp_in.getline(buffer, 50, '\n');
	fp_in >> iTechnology;

	if(iTechnology == 1){
		manager->isHoming = true;
	}
	else{
		manager->isHoming = false;
	}
	

	fp_in.getline(buffer, 50, '\n');
	fp_in.getline(buffer, 50, '\n');


	//save the 3 settings
	for(i = 1; i <= 3; i++)
	{

		fp_in.getline(buffer, 50, '\n');

		//noseblaster
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');

		noseBlaster->WeaponPower->set_power_cell_1(iPowerCell1);
		noseBlaster->WeaponPower->set_power_cell_2(iPowerCell2);

		fp_in.getline(buffer, 50, '\n');

		//leftturret
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iTurretAngle;
		fp_in.getline(buffer, 50, '\n');

		leftTurret->WeaponPower->set_power_cell_1(iPowerCell1);
		leftTurret->WeaponPower->set_power_cell_2(iPowerCell2);
		leftTurret->set_angle(iTurretAngle);

		fp_in.getline(buffer, 50, '\n');

		//rightTurret
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iTurretAngle;
		fp_in.getline(buffer, 50, '\n');

		rightTurret->WeaponPower->set_power_cell_1(iPowerCell1);
		rightTurret->WeaponPower->set_power_cell_2(iPowerCell2);
		rightTurret->set_angle(iTurretAngle);

		fp_in.getline(buffer, 50, '\n');

		//leftMissle
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');

		leftMissle->WeaponPower->set_power_cell_1(iPowerCell1);
		leftMissle->WeaponPower->set_power_cell_2(iPowerCell2);

		fp_in.getline(buffer, 50, '\n');

		//rightMissle
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');

		rightMissle->WeaponPower->set_power_cell_1(iPowerCell1);
		rightMissle->WeaponPower->set_power_cell_2(iPowerCell2);

		fp_in.getline(buffer, 50, '\n');

		//shipPower
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell1;
		fp_in.getline(buffer, 50, '\n');
		fp_in >> iPowerCell2;
		fp_in.getline(buffer, 50, '\n');

		ShipPower->set_power_cell_1(iPowerCell1);
		ShipPower->set_power_cell_2(iPowerCell2);

		fp_in.getline(buffer, 50, '\n');

		if(i == 1)
		{
			save_ship_setting( SETTING_1 );
		}
		else if(i == 2)
		{
			save_ship_setting( SETTING_2 );
		}
		else //must be 3
		{
			save_ship_setting( SETTING_3 );
		}

	}

	fp_in.close();

	return 1;

}

int PlayerShip::save_shipInfo(GameManager *manager)
{
	int i; //loop counter


	// declare and open
	ofstream fp_out("savedplayer.txt", ios::out);

	// output stream didn't open
	if(!fp_out) return -1;

	//save the player kills
	fp_out << "[player kills]" << endl;
	fp_out << getKillCount() << endl;
	fp_out << endl;

	//save the resource units
	fp_out << "[resource units]" << endl;
	fp_out << getPowerUpCount() << endl;
	fp_out << endl;

	//save the researched technology
	fp_out << "[researched technology]" << endl;
	fp_out << manager->turret_angle_available << endl;
	fp_out << manager->isHoming << endl;
	fp_out << endl;


	//save the 3 settings
	for(i = 1; i <= 3; i++)
	{
		if(i == 1)
		{
			load_ship_setting( SETTING_1 );
			fp_out << "[setting 1]" << endl;
		}
		else if(i == 2)
		{
			load_ship_setting( SETTING_2 );
			fp_out << "[setting 2]" << endl;
		}
		else //must be 3
		{
			load_ship_setting( SETTING_3 );
			fp_out << "[setting 3]" << endl;
		}

		//noseblaster
		fp_out << "[noseblaster]" << endl;
		fp_out << noseBlaster->WeaponPower->get_power_cell_1() << endl;
		fp_out << noseBlaster->WeaponPower->get_power_cell_2() << endl;
		fp_out << endl;

		//leftturret
		fp_out << "[left turret]" << endl;
		fp_out << leftTurret->WeaponPower->get_power_cell_1() << endl;
		fp_out << leftTurret->WeaponPower->get_power_cell_2() << endl;
		fp_out << leftTurret->get_angle() << endl;
		fp_out << endl;

		//rightTurret
		fp_out << "[right turret]" << endl;
		fp_out << rightTurret->WeaponPower->get_power_cell_1() << endl;
		fp_out << rightTurret->WeaponPower->get_power_cell_2() << endl;
		fp_out << rightTurret->get_angle() << endl;
		fp_out << endl;

		//leftMissle
		fp_out << "[left missle]" << endl;
		fp_out << leftMissle->WeaponPower->get_power_cell_1() << endl;
		fp_out << leftMissle->WeaponPower->get_power_cell_2() << endl;
		fp_out << endl;

		//rightMissle
		fp_out << "[right missle]" << endl;
		fp_out << rightMissle->WeaponPower->get_power_cell_1() << endl;
		fp_out << rightMissle->WeaponPower->get_power_cell_2() << endl;
		fp_out << endl;

		//shipPower
		fp_out << "[ship power]" << endl;
		fp_out << ShipPower->get_power_cell_1() << endl;
		fp_out << ShipPower->get_power_cell_2() << endl;
		fp_out << endl;

	}

	fp_out.close();

	return 1;

}


bool PlayerShip::update_input(float hori_axis, float vert_axis)
{


		int speedFactor = 2;
		float intensity = 0.4f;

		speedFactor = 7 + speedFactor*ShipPower->get_power_MUX(ENGINE_POWER);

	

		if( hori_axis > 0.2f) {
			dx = speedFactor;
			if(curr_frame > 0)
				curr_frame--;
		}
		else if( hori_axis < -0.2f){ 
			dx = -speedFactor;
			if(curr_frame < num_frames -1 )
				curr_frame++;
		}
		else{
			dx = 0;
		if( curr_frame < 8)
			curr_frame++;
		else if ( curr_frame > 8)
			curr_frame--;
		}


		if(x > (SCREEN_WIDTH - CONSOLE_WIDTH) - width)
			x = (SCREEN_WIDTH - CONSOLE_WIDTH) - width;
		else if (x < 0)
			x = 0;
		if( vert_axis > 0.2f) 
			dy = speedFactor;
		
		else if( vert_axis < -0.2f) 
		{
			dy = -speedFactor;
			intensity = 0.6f;
		}
		else 
			dy =0;


		manager->make_engine(this->get_x()+38, this->get_y()+47, intensity);

		if(y > SCREEN_HEIGHT - height)
			y = SCREEN_HEIGHT - height;
		else if (y < 0)
			y = 0;

		//	x = CL_Mouse::get_x();
		//	y = CL_Mouse::get_y(); 


	return true;
}