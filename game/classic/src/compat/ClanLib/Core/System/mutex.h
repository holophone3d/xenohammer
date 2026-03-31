// Compat shim: CL_Mutex stub (ClanLib 0.6 threading primitive)
#pragma once

class CL_Mutex {
public:
    void enter() {}
    void leave() {}
};
