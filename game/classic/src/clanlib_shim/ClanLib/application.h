#pragma once

class CL_ClanApplication {
public:
    virtual ~CL_ClanApplication() = default;
    virtual char* get_title() = 0;
    virtual int main(int argc, char** argv) = 0;
    static CL_ClanApplication* app;
};

// The game defines a subclass of CL_ClanApplication. This macro wires it up
// so that SDL's main (via SDL_main) delegates to CL_ClanApplication::app->main().
#define CL_ClanApplication_Instance(AppClass) \
    CL_ClanApplication* CL_ClanApplication::app = nullptr; \
    static AppClass _cl_app_instance; \
    struct _CL_AppRegistrar { \
        _CL_AppRegistrar() { CL_ClanApplication::app = &_cl_app_instance; } \
    }; \
    static _CL_AppRegistrar _cl_app_registrar;
