#include "collision.h"

// Full object-to-object pixel-level collision detector:
int CollisionDetection::Sprite_Collide(GameObject_Sprite* object1, GameObject_Sprite* object2) {

    int left1, left2, over_left;
    int right1, right2, over_right;
    int top1, top2, over_top;
    int bottom1, bottom2, over_bottom;
    int over_width, over_height;
    int i, j;
	int obj1x, obj1y, obj1width, obj1height;
	int obj2x, obj2y, obj2width, obj2height;
	int offsetX1, offsetX2;
    char *pixel1, *pixel2;

	//Perform a quick check to see if the object is damagable
	if( object1->get_damageable() == false || object2->get_damageable() == false )
		return(0);



	//setup local vars
	obj1x = object1->get_x();
	obj1y = object1->get_y();
	obj1width = object1->get_mask_width();
	obj1height = object1->get_mask_height();

	obj2x = object2->get_x();
	obj2y = object2->get_y();
	obj2width = object2->get_mask_width();
	obj2height = object2->get_mask_height();
	

    left1 = obj1x;
    left2 = obj2x;
    right1 = obj1x + obj1width;
    right2 = obj2x + obj2width;
    top1 = obj1y;
    top2 = obj2y;
    bottom1 = obj1y + obj1height;
    bottom2 = obj2y + obj2height;


    // Trivial rejections:
    if (bottom1 < top2) return(0);
    if (top1 > bottom2) return(0);
  
    if (right1 < left2) return(0);
    if (left1 > right2) return(0);


    // Ok, compute the rectangle of overlap:
    if (bottom1 > bottom2) over_bottom = bottom2;
    else over_bottom = bottom1;
 
    if (top1 < top2) over_top = top2;
    else over_top = top1;

    if (right1 > right2) over_right = right2;
    else over_right = right1;

    if (left1 < left2) over_left = left2;
    else over_left = left1;

	//compute the needed overlap stuff
	over_height = over_bottom - over_top;
	over_width =over_right - over_left;

	if(over_left - obj1x > 0)
		offsetX1 = over_left - obj1x;
	else 
		offsetX1 = 0;

	if(over_left - obj2x > 0)
		offsetX2 = over_left - obj2x;
	else 
		offsetX2 = 0;

    // Now compute starting offsets into both objects' bitmaps:
    i = ((over_top -obj1y) * obj1width) + offsetX1;
    pixel1 = object1->frameMasks[object1->get_curr_frame()] + i;

    j = ((over_top - obj2y) * obj2width) + offsetX2;
    pixel2 = object2->frameMasks[object2->get_curr_frame()] + j;

  
    // Now start scanning the whole rectangle of overlap,
    // checking the corresponding pixel of each object's
    // bitmap to see if they're both non-zero:

    for (i=0; i < over_height; i++) {
        for (j=0; j < over_width; j++) {
             if ((*pixel1 > 0) && (*pixel2 > 0)) return(1);
            pixel1++;
            pixel2++;
        }
        pixel1 += (obj1width - over_width);
        pixel2 += (obj2width - over_width);
    }


    // Worst case!  We scanned through the whole darn rectangle of overlap 
    // and couldn't find a single colliding pixel!

    return(0);

};
