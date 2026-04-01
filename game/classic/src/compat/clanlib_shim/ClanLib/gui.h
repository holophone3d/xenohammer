#pragma once
#include <cstdarg>

class CL_ResourceManager; // forward declare

class CL_StyleManager {
public:
    virtual ~CL_StyleManager() = default;
};

class CL_StyleManager_Default : public CL_StyleManager {
public:
    CL_StyleManager_Default(CL_ResourceManager* mgr);
};

class CL_GUIManager; // forward declare

class CL_ComponentManager {
public:
    CL_ComponentManager(const char* gui_file, CL_StyleManager* style, ...);
    virtual ~CL_ComponentManager() = default;

    // Static factory used by ClanLib 0.6 (4-arg version)
    static CL_ComponentManager* create(const char* gui_file, bool something,
                                        CL_StyleManager* style, CL_GUIManager* gui);
};

class CL_GUIManager {
public:
    CL_GUIManager(CL_StyleManager* style);
    void run();
    void show();
    virtual ~CL_GUIManager() = default;
};

class CL_SetupGUI {
public:
    static void init();
    static void deinit();
};

// Stub GUI widgets that ClanLib 0.6 provided
class CL_Button {
public:
    CL_Button() = default;
    static CL_Button* get_component(const char* name, CL_ComponentManager* mgr);
};

class CL_ListBox {
public:
    CL_ListBox() = default;
    static CL_ListBox* get_component(const char* name, CL_ComponentManager* mgr);
    void insert_item(const char* text);
    int  get_current_item();
    void set_current_item(int idx);
};

class CL_Label {
public:
    CL_Label() = default;
    static CL_Label* get_component(const char* name, CL_ComponentManager* mgr);
    void set_text(const char* text);
};
