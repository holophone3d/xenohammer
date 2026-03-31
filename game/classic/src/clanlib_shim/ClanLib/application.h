#pragma once
#include <SDL.h>  // Must come before class decl so #define main SDL_main
                   // applies to both base and derived virtual main()

class CL_ClanApplication {
public:
    CL_ClanApplication() { app = this; }
    virtual ~CL_ClanApplication() = default;
    virtual char* get_title() = 0;
    virtual int main(int argc, char** argv) = 0;
    static CL_ClanApplication* app;
};

// Legacy macro — no longer needed since the constructor auto-registers,
// but kept for compatibility if any code uses it.
#define CL_ClanApplication_Instance(AppClass) /* no-op */
