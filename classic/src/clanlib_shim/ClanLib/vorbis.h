#pragma once
#include <string>

class CL_ResourceManager; // forward declare

class CL_VorbisSoundProvider {
public:
    CL_VorbisSoundProvider(const char* filename, CL_ResourceManager* mgr = nullptr);
    ~CL_VorbisSoundProvider();

    std::string filepath;
};
