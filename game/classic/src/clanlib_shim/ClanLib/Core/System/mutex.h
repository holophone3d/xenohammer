#pragma once
#include <mutex>

class CL_Mutex {
    std::mutex mtx;
public:
    void enter() { mtx.lock(); }
    void leave() { mtx.unlock(); }
};
