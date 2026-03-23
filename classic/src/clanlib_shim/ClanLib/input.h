#pragma once
#include <SDL.h>
#include <vector>
#include <utility>

// ClanLib 0.6.x key constants mapped to SDL2 scancodes
#define CL_KEY_ESCAPE  SDL_SCANCODE_ESCAPE
#define CL_KEY_SPACE   SDL_SCANCODE_SPACE
#define CL_KEY_ENTER   SDL_SCANCODE_RETURN
#define CL_KEY_RETURN  SDL_SCANCODE_RETURN
#define CL_KEY_UP      SDL_SCANCODE_UP
#define CL_KEY_DOWN    SDL_SCANCODE_DOWN
#define CL_KEY_LEFT    SDL_SCANCODE_LEFT
#define CL_KEY_RIGHT   SDL_SCANCODE_RIGHT
#define CL_KEY_A       SDL_SCANCODE_A
#define CL_KEY_B       SDL_SCANCODE_B
#define CL_KEY_C       SDL_SCANCODE_C
#define CL_KEY_D       SDL_SCANCODE_D
#define CL_KEY_E       SDL_SCANCODE_E
#define CL_KEY_F       SDL_SCANCODE_F
#define CL_KEY_G       SDL_SCANCODE_G
#define CL_KEY_H       SDL_SCANCODE_H
#define CL_KEY_I       SDL_SCANCODE_I
#define CL_KEY_J       SDL_SCANCODE_J
#define CL_KEY_K       SDL_SCANCODE_K
#define CL_KEY_L       SDL_SCANCODE_L
#define CL_KEY_M       SDL_SCANCODE_M
#define CL_KEY_N       SDL_SCANCODE_N
#define CL_KEY_O       SDL_SCANCODE_O
#define CL_KEY_P       SDL_SCANCODE_P
#define CL_KEY_Q       SDL_SCANCODE_Q
#define CL_KEY_R       SDL_SCANCODE_R
#define CL_KEY_S       SDL_SCANCODE_S
#define CL_KEY_T       SDL_SCANCODE_T
#define CL_KEY_U       SDL_SCANCODE_U
#define CL_KEY_V       SDL_SCANCODE_V
#define CL_KEY_W       SDL_SCANCODE_W
#define CL_KEY_X       SDL_SCANCODE_X
#define CL_KEY_Y       SDL_SCANCODE_Y
#define CL_KEY_Z       SDL_SCANCODE_Z
#define CL_KEY_0       SDL_SCANCODE_0
#define CL_KEY_1       SDL_SCANCODE_1
#define CL_KEY_2       SDL_SCANCODE_2
#define CL_KEY_3       SDL_SCANCODE_3
#define CL_KEY_4       SDL_SCANCODE_4
#define CL_KEY_5       SDL_SCANCODE_5
#define CL_KEY_6       SDL_SCANCODE_6
#define CL_KEY_7       SDL_SCANCODE_7
#define CL_KEY_8       SDL_SCANCODE_8
#define CL_KEY_9       SDL_SCANCODE_9
#define CL_KEY_TAB     SDL_SCANCODE_TAB
#define CL_KEY_F1      SDL_SCANCODE_F1
#define CL_KEY_F2      SDL_SCANCODE_F2
#define CL_KEY_F3      SDL_SCANCODE_F3
#define CL_KEY_F4      SDL_SCANCODE_F4
#define CL_KEY_F5      SDL_SCANCODE_F5
#define CL_KEY_F6      SDL_SCANCODE_F6
#define CL_KEY_F7      SDL_SCANCODE_F7
#define CL_KEY_F8      SDL_SCANCODE_F8
#define CL_KEY_F9      SDL_SCANCODE_F9
#define CL_KEY_F10     SDL_SCANCODE_F10
#define CL_KEY_F11     SDL_SCANCODE_F11
#define CL_KEY_F12     SDL_SCANCODE_F12
#define CL_KEY_LSHIFT  SDL_SCANCODE_LSHIFT
#define CL_KEY_RSHIFT  SDL_SCANCODE_RSHIFT
#define CL_KEY_LCTRL   SDL_SCANCODE_LCTRL
#define CL_KEY_RCTRL   SDL_SCANCODE_RCTRL
#define CL_KEY_DELETE  SDL_SCANCODE_DELETE
#define CL_KEY_INSERT  SDL_SCANCODE_INSERT
#define CL_KEY_HOME    SDL_SCANCODE_HOME
#define CL_KEY_END     SDL_SCANCODE_END
#define CL_KEY_PAGEUP  SDL_SCANCODE_PAGEUP
#define CL_KEY_PAGEDOWN SDL_SCANCODE_PAGEDOWN

// Joystick button aliases (mapped to high scancode range to avoid collisions)
#define CL_JOY_BUTTON_0  (SDL_NUM_SCANCODES + 0)
#define CL_JOY_BUTTON_1  (SDL_NUM_SCANCODES + 1)
#define CL_JOY_BUTTON_2  (SDL_NUM_SCANCODES + 2)
#define CL_JOY_BUTTON_3  (SDL_NUM_SCANCODES + 3)

class CL_InputButton {
public:
    CL_InputButton() = default;
    explicit CL_InputButton(int sc) : scancode(sc) {}
    bool is_pressed();
    int scancode = 0;
};

class CL_InputButton_Group {
public:
    void add(CL_InputButton btn);
    bool is_pressed();
private:
    std::vector<CL_InputButton> buttons;
};

class CL_InputDevice {
public:
    CL_InputButton get_button(int key);
};

class CL_InputAxis_Group {
public:
    void add_invpair(CL_InputButton neg, CL_InputButton pos);
    float get_pos();
private:
    std::vector<std::pair<CL_InputButton, CL_InputButton>> pairs;
};

class CL_InputButtonToAxis_Analog {
public:
    CL_InputButtonToAxis_Analog(CL_InputButton btn);
    operator CL_InputButton() const { return btn; }
private:
    CL_InputButton btn;
};

class CL_InputCursor {
public:
    float get_x();
    float get_y();
};

class CL_Input {
public:
    static CL_InputDevice* keyboards[1];
    static CL_InputDevice* joysticks[1];
    static void init();
};

class CL_Mouse {
public:
    static bool left_pressed();
    static bool right_pressed();
    static int get_x();
    static int get_y();
};
