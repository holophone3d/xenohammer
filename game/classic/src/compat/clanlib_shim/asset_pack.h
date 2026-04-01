#pragma once
// AssetPack: Loads game assets from an embedded ZIP resource in the EXE,
// falling back to loose files on disk for development builds.

#include <SDL.h>
#include <string>

namespace AssetPack {

// Initialize the asset pack. Call once at startup.
// Returns true if an embedded ZIP was found and loaded.
bool init();

// Shut down and free all cached data.
void shutdown();

// Returns true if the embedded pack is active (ZIP found in PE resources).
bool active();

// Open a file as SDL_RWops. If the pack is active and the file exists in the
// ZIP, returns an RWops backed by in-memory data. Otherwise returns nullptr.
// Caller owns the returned RWops (pass freesrc=1 to SDL load functions).
// The underlying memory remains valid until shutdown().
SDL_RWops* open(const std::string& path);

// Read an entire file into a string. Returns empty string if not found.
// Used for resource manifest (.res/.scr) files that need ifstream replacement.
std::string read_text(const std::string& path);

} // namespace AssetPack
