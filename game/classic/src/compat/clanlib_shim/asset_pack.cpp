// AssetPack: Serves game assets from a ZIP archive embedded as a Windows PE
// resource, with transparent fallback to loose files on disk.
//
// The ZIP is packed at build time by CMake and embedded via assets.rc as
// RCDATA resource "ASSETS_ZIP". At runtime, miniz reads directly from the
// in-memory resource — no temp files, no extraction to disk.

#include "asset_pack.h"

#include <miniz.h>

#include <cstdio>
#include <algorithm>
#include <unordered_map>
#include <vector>
#include <mutex>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#endif

namespace AssetPack {

static mz_zip_archive              s_zip{};
static bool                        s_active = false;
static std::mutex                  s_cache_mutex;

// Cache: extracted file data keyed by normalized path.
// Data lives until shutdown() so SDL_RWops pointers remain valid.
static std::unordered_map<std::string, std::vector<uint8_t>> s_cache;

// Normalize path: lowercase, forward-slash, strip leading "./" or "/"
static std::string normalize(const std::string& path) {
    std::string p = path;
    // Backslash → forward slash
    std::replace(p.begin(), p.end(), '\\', '/');
    // Strip leading "./"
    while (p.size() >= 2 && p[0] == '.' && p[1] == '/') p = p.substr(2);
    // Strip leading "/"
    while (!p.empty() && p[0] == '/') p = p.substr(1);
    // Lowercase for case-insensitive matching
    std::transform(p.begin(), p.end(), p.begin(),
                   [](unsigned char c) { return (char)std::tolower(c); });
    return p;
}

bool init() {
#ifdef _WIN32
    HRSRC hRes = FindResourceA(nullptr, "ASSETS_ZIP", RT_RCDATA);
    if (!hRes) {
        fprintf(stderr, "AssetPack: no embedded ZIP resource found — using loose files\n");
        return false;
    }
    HGLOBAL hData = LoadResource(nullptr, hRes);
    if (!hData) return false;

    const void* data = LockResource(hData);
    DWORD size = SizeofResource(nullptr, hRes);
    if (!data || size == 0) return false;

    memset(&s_zip, 0, sizeof(s_zip));
    if (!mz_zip_reader_init_mem(&s_zip, data, size, 0)) {
        fprintf(stderr, "AssetPack: failed to open embedded ZIP: %s\n",
                mz_zip_get_error_string(mz_zip_get_last_error(&s_zip)));
        return false;
    }

    int count = (int)mz_zip_reader_get_num_files(&s_zip);
    fprintf(stderr, "AssetPack: loaded embedded ZIP — %d files, %u bytes\n", count, (unsigned)size);
    s_active = true;
    return true;
#else
    fprintf(stderr, "AssetPack: not supported on this platform — using loose files\n");
    return false;
#endif
}

void shutdown() {
    if (s_active) {
        mz_zip_reader_end(&s_zip);
        s_active = false;
    }
    s_cache.clear();
}

bool active() {
    return s_active;
}

// Find a file in the ZIP by normalized name. miniz stores paths as-is from the
// ZIP, so we normalize both sides for comparison.
static int find_file(const std::string& norm_path) {
    int count = (int)mz_zip_reader_get_num_files(&s_zip);
    for (int i = 0; i < count; i++) {
        char name[512];
        mz_zip_reader_get_filename(&s_zip, i, name, sizeof(name));
        if (normalize(name) == norm_path) return i;
    }
    return -1;
}

// Extract a file into the cache. Returns pointer to cached data, or nullptr.
static const std::vector<uint8_t>* extract(const std::string& norm_path) {
    std::lock_guard<std::mutex> lock(s_cache_mutex);

    auto it = s_cache.find(norm_path);
    if (it != s_cache.end()) return &it->second;

    int idx = find_file(norm_path);
    if (idx < 0) return nullptr;

    mz_zip_archive_file_stat stat;
    if (!mz_zip_reader_file_stat(&s_zip, idx, &stat)) return nullptr;

    std::vector<uint8_t> buf((size_t)stat.m_uncomp_size);
    if (!mz_zip_reader_extract_to_mem(&s_zip, idx, buf.data(), buf.size(), 0)) {
        fprintf(stderr, "AssetPack: failed to extract '%s'\n", norm_path.c_str());
        return nullptr;
    }

    auto [inserted, _] = s_cache.emplace(norm_path, std::move(buf));
    return &inserted->second;
}

SDL_RWops* open(const std::string& path) {
    if (!s_active) return nullptr;

    const auto* data = extract(normalize(path));
    if (!data || data->empty()) return nullptr;

    // SDL_RWFromConstMem does NOT take ownership or free the buffer.
    // The cache keeps it alive until shutdown().
    return SDL_RWFromConstMem(data->data(), (int)data->size());
}

std::string read_text(const std::string& path) {
    if (!s_active) return {};

    const auto* data = extract(normalize(path));
    if (!data) return {};

    return std::string(reinterpret_cast<const char*>(data->data()), data->size());
}

} // namespace AssetPack
