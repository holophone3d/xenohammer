#pragma once
#include <string>
#include <map>

struct ResourceEntry {
    std::string file;
    std::string type;
    int tcol = -1;
    std::map<std::string, std::string> options;
};

class CL_Resource {
public:
    const std::string& get_location();
    ResourceEntry entry;
};

class CL_ResourceManager {
public:
    CL_ResourceManager() = default;
    CL_ResourceManager(const char* filename, bool something = false);
    ~CL_ResourceManager();

    CL_Resource get_resource(const char* id);
    CL_ResourceManager* get_resources();

    std::string base_path;
    std::map<std::string, ResourceEntry> resources;
};
