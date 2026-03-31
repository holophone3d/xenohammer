#include "GameObject.h"
#include "GameManager.h"




GameObject_Sprite::GameObject_Sprite(int _x, int _y, GameManager *_manager) 
{
	//init all values to default
	manager = _manager;
	x = _x;
	y = _y;
	dest_x = _x;
	dest_y = _y;
	save_x = save_y =0;  		   
	dx = dy =0;  			     // velocity of sprite
	last_x_move_time = last_y_move_time = CL_System::get_time();
	direction = 0;			// 2pi direction
	width = height = mask_width = mask_height = 0;   	// dimensions of sprite in pixels
	visible = 1; //set to true - used by sprite engine to flag whether visible or not
	curr_frame =0;              // current frame index
    num_frames = 0;
	update_time_start = update_time_end = 0; // [bugfix] uninitialized in original — breaks Release builds
	damageable = true;
	is_destroyed = false;
}


void GameObject_Sprite::add_frame(const char* resID)
{
	//WEIRD SHIT GOES ON HERE SOMETIMES
//	std::string testName;
	// extract the transparancy from the resource
	CL_Resource tempResource = manager->get_resources()->get_resource(resID);
	//CL_ResourceOption testOpt = tempResource.get_options().get_option("tcol");
///	testName = testOpt.get_value();
	
//	std::string testName   =  tempResource.get_options().get_option("tcol").get_value();
//	int trans_col = atoi(tempResource.get_options().get_option("tcol").get_value().c_str()); 
	const char * fileName = tempResource.get_location().c_str();
	
	
	// check to see that we still have room to add sprites
	if(num_frames < MAX_SPRITE_FRAMES)
	{
		curr_frame = num_frames; //set to the last loaded frame

	/* OLD CODE NEEDS TO BE UPDATED TO USE RESOURCES
		if(fileType == TGA_FILETYPE)
		{
			//transparacy seems messed up, so we're not using for now
			this->frames[num_frames] = CL_TargaProvider::create(fileName,NULL);
			//this->frames[num_frames] = CL_TargaProvider::create(fileName,NULL,true,false,255,0,255);

			//if this is the first frame we need to set up some properties
			if(num_frames == 0)
			{
				width = this->frames[curr_frame]->get_width(); 
				height = this->frames[curr_frame]->get_height(); 
			}
			// allocate space for the sprite mask for collision detection
			this->frameMasks[curr_frame] = (unsigned char*) malloc( sizeof(unsigned char) * (width*height));



			// build the spriteCollsion mask, we have to do this two separate ways
			// because of bugs that exist with both tga and pcx files
			CL_Canvas *tmpCan = new CL_Canvas( width, height );
  
			this->frames[curr_frame]->put_target( 0,0, 0, tmpCan );

			float r,g,b,a;

			for(int i=0; i < width; i++){
				for( int j=0; j < height; j++){
					tmpCan->get_pixel(i,j,&r,&g,&b,&a);
					// testing for magenta (1,0,1) and mark as transparent
					if(r > 0.9f && g < 0.1f && b > 0.9)
						*(this->frameMasks[curr_frame]) = 0;
					else
						*(this->frameMasks[curr_frame]) = 1;
					
					(this->frameMasks[curr_frame])++;
					
				}
			}
		}
		else if(fileType == PCX_FILETYPE)
		{
			//frames[num_frames] = (CL_Surface*)malloc(sizeof(CL_Surface));
			//loads the surface	
			frames[num_frames] =  CL_PCXProvider::create(fileName,NULL, true, trans_col);
			//builds the mask
			//if this is the first frame we need to set up some properties
			if(num_frames == 0)
			{
				width = frames[num_frames]->get_width(); 
				height = frames[num_frames]->get_height(); 
			}
			// allocate space for the sprite mask for collision detection
			//frameMasks[curr_frame] = (unsigned char*) malloc( sizeof(unsigned char) * ((width+1)*(height+1)));
			frameMasks[curr_frame] = PCXLoad::BuildMask( fileName, trans_col, &mask_width, &mask_height );
		//	PCXLoad *MaskBuilder = new PCXLoad();
		//	MaskBuilder->BuildMask(fileName, frameMasks[curr_frame], trans_col);
		//	delete MaskBuilder;
		}

	*/
			frames[num_frames] =  CL_Surface::load(resID, manager->get_resources());

			//builds the mask
			//if this is the first frame we need to set up some properties
			if(num_frames == 0)
			{
				width = frames[num_frames]->get_width(); 
				height = frames[num_frames]->get_height(); 
			}
			PCXLoad *test = new PCXLoad();
			frameMasks[curr_frame] = test->BuildMask( fileName, &mask_width, &mask_height );
			//(char*)malloc(sizeof(char));
			//mask_width =1;
			//mask_height =1;


	num_frames++;
	}

}


void GameObject_Sprite::template_copy( GameObject_Sprite * _template)
{
	int tmpFrameCount;

	//point to the templates frames

	tmpFrameCount = _template->get_num_frames(); 
	for(int i =0; i < tmpFrameCount; i++ ){
		frames[i] = _template->frames[i];
		frameMasks[i] = _template->frameMasks[i];
	}

	// copy other needed data
	height = _template->get_height();
	width = _template->get_width();

	mask_height = _template->get_mask_height(); 
	mask_width = _template->get_mask_width(); 

	num_frames = _template->get_num_frames();
	curr_frame = _template->get_num_frames() - 1;
	
	


}
// just added sample code to attempt to normalize over
// various framerates
void GameObject_Sprite::show()
	{

 int XSCALE=32; //to scale back horizontal motion
  int YSCALE=32; //to scale back vertical motion
 
  int xdelta,ydelta; //change in position
  int time=CL_System::get_time(); //current time
  int tfactor; //time since last move

  
	//horizontal motion
      tfactor=time-last_x_move_time; //time since last move
      xdelta=(dx*tfactor)/XSCALE; //x distance moved 
      x+=xdelta; //x motion
      
      if(xdelta||dx==0) //record time of move
        last_x_move_time=time;
      //vertical motion
      tfactor=time-last_y_move_time; //time since last move
      ydelta=(dy*tfactor)/YSCALE; //y distance moved
      y+=ydelta; //y motion
     
      if(ydelta||dy==0) //record time of move
        last_y_move_time=time;

		if( curr_frame >= 0 )
			//draw the object
			if(visible == 1) frames[curr_frame]->put_screen(x,y); 
			
	
			
}


// just added sample code to attempt to normalize over
// various framerates
void GameObject_Sprite::show(int xscale, int yscale)
	{

 int XSCALE=xscale; //to scale back horizontal motion
  int YSCALE=yscale; //to scale back vertical motion
 
  int xdelta,ydelta; //change in position
  int time=CL_System::get_time(); //current time
  int tfactor; //time since last move

  
	//horizontal motion
      tfactor=time-last_x_move_time; //time since last move
      xdelta=(dx*tfactor)/XSCALE; //x distance moved 
      x+=xdelta; //x motion
      
      if(xdelta||dx==0) //record time of move
        last_x_move_time=time;
      //vertical motion
	  time=CL_System::get_time();
      tfactor=time-last_y_move_time; //time since last move
      ydelta=(dy*tfactor)/YSCALE; //y distance moved
      y+=ydelta; //y motion
     
      if(ydelta||dy==0) //record time of move
        last_y_move_time=time;

		if( curr_frame >= 0 )
			//draw the object
			if(visible == 1) frames[curr_frame]->put_screen(x,y); 
			
	
			
}



/*
bool GameObject_Moving::do_move()
{
	if (verify_move(dx,dy) == false) return false;

	//save our old position
	save_x = x;
	save_y = y;

	x =_x;
	y = _y;

	return true;
}


/*
bool GameObject_Moving::move(float time_elapsed)
{
        bool big_move = true;

	do
	{
	        big_move = true;
	        float delta_x = dest_x-x;

		if (fabs(delta_x) < time_elapsed*speed)
		{
		        x = dest_x;
		}
		else if (delta_x>0)
		{
		        x += time_elapsed*speed;
		}
		else
		{
		        x -= time_elapsed*speed;
		}

		float delta_y = dest_y-y;
		if (fabs(delta_y) < time_elapsed*speed)
		{
		        y = dest_y;
	        }
		else if (delta_y>0)
		{
		        y += time_elapsed*speed;
		}
		else
		{
		        y -= time_elapsed*speed;
		}

	        if (fabs(delta_x) < time_elapsed*speed &&
		    fabs(delta_y) < time_elapsed*speed)
		{
		        if (delta_x < delta_y) time_elapsed -= fabs(delta_y)/speed;
			        else time_elapsed -= fabs(delta_x)/speed;
			big_move = !event_reached_dest();
		}
	} 
	while (!big_move);

	return true;
}
*/