#pragma once

// Disable C++17 std::byte to avoid conflict with Windows SDK byte typedef
// when combined with `using namespace std;` from pre-standard game code.
#ifndef _HAS_STD_BYTE
#define _HAS_STD_BYTE 0
#endif

// Standard library headers that ClanLib 0.5 transitively provided
#include <string>
#include <list>
#include <vector>
#include <algorithm>
#include <cmath>
#include <cstdlib>

// PI constant (used by game source, originally from ClanLib or math.h extensions)
#ifndef PI
#define PI 3.14159265358979323846
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Windows macros the game assumes are available
#ifndef TRUE
#define TRUE 1
#endif
#ifndef FALSE
#define FALSE 0
#endif

class CL_System {
public:
    static unsigned int get_time();
    static void sleep(int ms);
    static void keep_alive();
    static void init();
};

class CL_SetupCore {
public:
    static void init();
    static void deinit();
};

class CL_SetupDisplay {
public:
    static void init();
    static void deinit();
};

class CL_Error {
public:
    CL_Error(const char* msg) : message(msg) {}
    std::string message;
};

class CL_ConsoleWindow {
public:
    CL_ConsoleWindow(const char* title);
    void redirect_stdio();
    void display_close_message();
};
