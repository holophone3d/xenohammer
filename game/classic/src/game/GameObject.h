#ifndef GAMEOBJECT_H
#define GAMEOBJECT_H
#include "stdinclude.h"


#define MAX_SPRITE_FRAMES 50


class GameManager;

class GameObject
{
public:


	virtual ~GameObject() { return; }
	
	virtual void show()=0; // draw the object.
	virtual bool update()=0;
	//virtual void update(float time_elapsed)=0; // run the object.
	
	//virtual bool get_destroy_flag() { return destroy_flag; }

	GameManager *get_manager() { return manager; }
protected:
	
	//virtual void set_destroy_flag() { destroy_flag = true; }
	
	GameManager *manager;
	bool destroy_flag;
};

class GameObject_Sprite : public GameObject
{
	friend class Boss;
protected:
	GameManager *manager;
	int x, y;						// position of sprite
	int save_x,save_y;  		     // saved position of sprite
	int dx, dy;  			     // velocity of sprite
	int last_x_move_time;			// time last moved
	int last_y_move_time;			// time last moved
	int direction;			// all sprites can be rendered with predefined directions
	int width,height, mask_width, mask_height;   		     // dimensions of sprite in pixels
	int dest_x, dest_y;
	int visible;                 // used by sprite engine to flag whether visible or not
	int curr_frame;              // current frame index
    int num_frames;              // total number of frames


	bool move(float time_elapsed);
	

    int update_time_start, update_time_end;

	bool damageable;			//used to find out if object can be damaged
	bool is_destroyed;			//find out if we're toast


	// Possible things that may need to be used internally
	int counter_1;         	     // some counters for timing and animation
	int counter_2;
	int counter_3;

	int threshold_1;   		     // thresholds for the counters (if needed)
	int threshold_2;
	int threshold_3;

	int state;                   // state of sprite, alive, dead...

    char clipped;     	      // flag to determine if clipped or not
    
    int x_clip,y_clip;           // clipped position of sprite
    int width_clip,height_clip;  // clipped size of sprite


public:

		// This is an array of pointers to the bitmap images:
    CL_Surface *frames[MAX_SPRITE_FRAMES];  
	// used for collions - there is a one to one correspondance
	 char *frameMasks[MAX_SPRITE_FRAMES];  
int test;
	GameObject_Sprite(int x, int y, GameManager *manager );
	 ~GameObject_Sprite() { 
		/*delete[] *frames;
		delete[] *frameMasks;
		*/ // Roger 10/1/2001 - I commented this stuff out to keep frames from being freed
			// any time a game object is deleted
		return; }

	int get_x() { return x; }
	int get_y() { return y; }

	//if we need to cheat sometimes
	void set_x(int new_x) { x = new_x; }
	void set_y(int new_y) { y = new_y; }

	int get_save_x() { return save_x; }
	int get_save_y() { return save_y; }

	void get_velocity(int *new_dx, int*new_dy)
	{
		*new_dx = dx;
		*new_dy = dy;
	}

	void set_velocity(int new_dx, int new_dy) 
	{
		dx = new_dx;
		dy = new_dy;
	}

	int get_direction() { return direction; }
	void set_direction(int new_direction) { direction = new_direction; }

//	void set_last_x_move_time(int new_x_time ){ last_x_move_time = new_x_time; };
//	void set_last_y_move_time(int new_y_time ){ last_y_move_time = new_y_time; };
	
	int get_height() { return height; }
	int get_width()  { return width;  }

	void set_height(int new_height) { height = new_height; }
	void set_width(int new_width) { width = new_width; }

	int get_mask_height() { return mask_height; }
	int get_mask_width()  { return mask_width;  }
    
	void set_mask_height(int new_height) { mask_height = new_height; }
	void set_mask_width(int new_width) { mask_width = new_width; }

    int get_visible() { return visible; }
    void set_visible(int new_visible) { visible = new_visible; }
	
	bool get_is_destroyed() {return is_destroyed;}

	bool get_damageable() { return damageable; }
    void set_damageable(bool new_damageable) { damageable = new_damageable; }
	
	int get_curr_frame() { return curr_frame; }
    void set_curr_frame(int new_curr_frame) { curr_frame = new_curr_frame; }   

	int get_num_frames() { return num_frames; }
    void set_num_frames(int new_num_frames) { num_frames = new_num_frames; }   

	void add_frame(const char* resID);
	
    void show(int xscale, int yscale);
	void show();

	virtual	bool move(int _x, int _y){ x=_x;y=_y;return true;}

	void template_copy( GameObject_Sprite * );
    

};

#endif