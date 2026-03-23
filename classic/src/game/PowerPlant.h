#ifndef POWERPLANT_H
#define POWERPLANT_H

#include "stdinclude.h"
#define MAX_PWR 5

class PowerPlant
{
public:
	PowerPlant(int init_cell_1, int init_cell_2) 
	{
		// make sure value is valid, otherwise set to 1
		if(init_cell_1 <= MAX_PWR && init_cell_1 >= 1)
			power_cell_1 = init_cell_1;
		else
			power_cell_1 = 1;

		if(init_cell_2 <= MAX_PWR && init_cell_2 >= 1)
			power_cell_2 = init_cell_2;
		else
			power_cell_2 = 1;
	}
		
	~PowerPlant() { return; }

	bool addPowerCell()
	{
		bool retVal = true;

		if( power_cell_1 <= power_cell_2 && power_cell_1 < MAX_PWR)
			power_cell_1++;
		else if( power_cell_2 <= power_cell_1 && power_cell_2 < MAX_PWR)
			power_cell_2++;
		else
			retVal = false;

		return retVal;
	}

	//mainly for GUI xfer is in one unit increments
	// valid values are 1 & 2
	bool transfer_power(int cell_num)
	{
		bool retVal =true;

		
		switch(cell_num)
		{
		// we want to transfer to powerCell1
		case 1:
			
			// we aren't full on the power cell and we have the power to transfer
			if( power_cell_1 < MAX_PWR && power_cell_2  > 1)
			{
				power_cell_1++;
				power_cell_2--;
			}
			// we are full or don't have the power to transfer
			else if( power_cell_1 == MAX_PWR || power_cell_2  == 1)
				retVal = false;
			
			break;
		// we want to transfer to powerCell2
		case 2:
			
			// we aren't full on the power cell and we have the power to transfer
			if( power_cell_2 < MAX_PWR && power_cell_1  > 1)
			{
				power_cell_2++;
				power_cell_1--;
			}
			// we are full or don't have the power to transfer
			else if( power_cell_2 == MAX_PWR || power_cell_1  == 1)
				retVal = false;
			
			break;
			
		default:
			retVal =false;
			break;
		}

	return retVal;
}

	int get_power_cell_1(){ return power_cell_1; }
	int get_power_cell_2(){ return power_cell_2; }


	// using the currently allocated power sets the cells
	bool set_power_cells(int init_cell_1, int init_cell_2) 
	{
		bool retVal = true;

		//make sure we have this much power in the first place
		if(power_cell_1 + power_cell_2 == init_cell_1 + init_cell_2)
		{
			// make sure value is valid, otherwise set to 1
			if(init_cell_1 <= MAX_PWR && init_cell_1 >= 1)
				power_cell_1 = init_cell_1;
			else
			{
				power_cell_1 = 1;
				retVal =false;
			}

			if(init_cell_2 <= MAX_PWR && init_cell_2 >= 1)
				power_cell_2 = init_cell_2;
			else
			{
				power_cell_2 = 1;
				retVal =false;
			}
		}
		else
			retVal =false;

		return retVal;
	}



	float get_power_MUX(int cell_num)
	{
		int tempCellPower;
		
		if(cell_num == 1)
			tempCellPower = power_cell_1;
		else if( cell_num == 2)
			tempCellPower = power_cell_2;
		else
			return 0;

		//powerplant multipler values
		switch(tempCellPower)
		{
		case 0:
			return 1.0f;
			break;
		case 1:
			return 1.5f;
			break;
		case 2:
			return 2.0f;
			break;
		case 3:
			return 2.5f;
			break;
		case 4:
			return 3.0f;
			break;
		case 5:
			return 5.0f;
			break;
		default:
			return tempCellPower;
			break;
		}

	}

	//used for cheating...
	void set_power_cell_1( int new_value) { power_cell_1 = new_value; };
	//used for cheating...
	void set_power_cell_2( int new_value) { power_cell_2 = new_value; };

protected:
	// represents what the powerplants are
	int power_cell_1, power_cell_2;


};




#endif