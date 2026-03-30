#pragma once
#include <string>

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
};
