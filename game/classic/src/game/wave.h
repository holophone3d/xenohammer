#ifndef WAVE_H
#define WAVE_H

#include "stdinclude.h"
#define WAITING 0
#define RELEASED 1


class Wave
{
public:
	Wave( int _wave_count, int _wave_type, int _x_startPos, int _y_startPos, int _start_time)
	{
		wave_count = _wave_count;
		wave_type = _wave_type;
		x_startPos = _x_startPos;
		y_startPos = _y_startPos;
		start_time = _start_time;
		state = WAITING;
	};


	int get_wave_count() { return wave_count; };

	int get_wave_type() { return wave_type; };

	int get_x_startPos() { return x_startPos; };

	int get_y_startPos() { return y_startPos; };

	int get_start_time() { return start_time; };

	int get_state() { return state; };

	void set_state(int new_state) { state =  new_state; };

protected:

	int wave_count, wave_type;
	int x_startPos, y_startPos;
	int start_time, state;

};
#endif