#pragma once
#include <string>

class CL_ResourceManager; // forward declare

// ---------------------------------------------------------------------------
// CL_SoundBuffer_Session – handle to a playing sound
// ---------------------------------------------------------------------------
class CL_SoundBuffer_Session {
public:
    CL_SoundBuffer_Session();

    void play();
    void stop();
    bool is_playing();
    void set_volume(float vol);
    void set_looping(bool loop);

    int channel = -1;
};

// ---------------------------------------------------------------------------
// CL_SoundBuffer – a loaded sound effect or music
// ---------------------------------------------------------------------------
class CL_SoundBuffer {
public:
    CL_SoundBuffer();
    CL_SoundBuffer(void* provider, bool delete_provider);
    ~CL_SoundBuffer();

    static CL_SoundBuffer* load(const char* res_id, CL_ResourceManager* mgr);

    CL_SoundBuffer_Session play(bool loop = false);
    CL_SoundBuffer_Session prepare();
    void stop();

    float get_volume();
    void  set_volume(float vol);

    struct Impl;
    Impl* impl = nullptr;
};

// ---------------------------------------------------------------------------
// CL_SetupSound
// ---------------------------------------------------------------------------
class CL_SetupSound {
public:
    static void init();
    static void deinit();
};
