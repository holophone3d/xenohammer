# XenoHammer Classic

The original ~2000 C++ XenoHammer source running on modern Windows — **5 minimal
game code changes**. A custom ClanLib 0.5 API shim translates all engine calls to
SDL2 + OpenGL at compile time.

The Release build produces a **single portable exe** (~14.5 MB) — all assets
embedded, all libraries statically linked, zero DLLs. Drop it on any 64-bit
Windows machine and play.

## How It Works

The original game was built on [ClanLib 0.5](http://www.clanlib.org/), an obscure
C++ game engine from the late 1990s for which no source or documentation survives.
Rather than rewrite the game, this project reverse-engineers the ClanLib API from
usage patterns in the game code and provides drop-in replacements backed by modern
libraries.

```
Original game code (untouched)
        │
        ▼
ClanLib 0.5 API headers ──► clanlib_shim_impl.cpp
   (12 shim headers)              │
                                  ▼
                         SDL2 + SDL2_image + SDL2_mixer + SDL2_ttf + OpenGL
```

### What the shim provides

| ClanLib API | SDL2/GL Implementation |
|---|---|
| `CL_Display`, `CL_SetupDisplay` | SDL2 window + OpenGL context (800×600) |
| `CL_Surface` | OpenGL textured quads with RGBA upload |
| `CL_Font` | SDL2_ttf (TTF fonts) + bitmap glyph scanner (TGA spritesheets) |
| `CL_SoundBuffer`, `CL_SetupSound` | SDL2_mixer (WAV chunks + OGG/music) |
| `CL_InputDevice`, `CL_Keyboard` | SDL2 event polling |
| `CL_ResourceManager` | Custom ClanLib 0.5 resource file parser |
| `CL_OpenGL::begin_2d/end_2d` | GL state save/restore (projection, blend, textures) |
| `CL_Canvas`, `CL_PCXProvider`, `CL_TargaProvider` | SDL2_image format loaders |
| `auxDIBImageLoadA` (GLAUX) | SDL2_image BMP → RGB24 for GL_Handler textures |

### Game source changes (5 total)

| File | Issue | Fix |
|---|---|---|
| `PlayerShip.cpp:190` | `new char(50)` allocates 1 byte, not 50 | `new char[50]` |
| `GameManager.cpp:1135` | Iterator double-increment after `erase()` | Standard erase-in-loop pattern |
| `GameObject.cpp:22` | `update_time_start/end` uninitialized | Zero-initialize in constructor |
| `pcxload.cpp:34` | Raw `fopen` can't read embedded assets | Try AssetPack first, fall back to fopen |
| `GL_Handler.cpp:49` | `fopen` existence check fails for embedded BMP assets | Try AssetPack first, fall back to fopen |

The first three bugs existed in the original code but were masked by MSVC 6.0's
lenient runtime. The last two enable the embedded asset pack (no loose files on disk).

## Project Structure

```
game/classic/
├── CMakeLists.txt              # Build config (CMake + vcpkg)
├── vcpkg.json                  # Dependencies: SDL2, SDL2_image, SDL2_mixer, SDL2_ttf, miniz
├── assets/                     # Game assets (PCX, BMP, WAV, OGG, TGA, fonts, resource files)
├── src/
│   ├── game/                   # Original C++ source (26 .cpp, 37 .h)
│   └── compat/
│       ├── clanlib_shim/
│       │   ├── ClanLib/        # 12 API headers matching ClanLib 0.5 interface
│       │   ├── asset_pack.h/cpp  # Embedded ZIP asset loader (PE resource → miniz)
│       │   └── clanlib_shim_impl.cpp   # Single-file implementation (~1,400 lines)
│       ├── io/                 # Pre-standard C++ headers (fstream.h, iostream.h, iomanip.h)
│       ├── gl/                 # GLAUX shim (glaux.h → auxDIBImageLoadA)
│       └── game/               # Build proxies for VC6 compatibility workarounds
└── build/                      # CMake build output
```

## Prerequisites

- Windows 10/11
- CMake ≥ 3.20
- MSVC 2019+ (Visual Studio or Build Tools)
- [vcpkg](https://github.com/microsoft/vcpkg) installed and bootstrapped

## Build

```powershell
cd game\classic

# First-time setup (requires vcpkg):
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="<vcpkg-root>\scripts\buildsystems\vcpkg.cmake"

# Build:
cmake --build build --config Release
```

vcpkg automatically fetches SDL2, SDL2_image, SDL2_mixer (with Vorbis), SDL2_ttf,
and miniz.

### Build Output

The default build produces a **single self-contained exe** (~14.5 MB):
- All 342 game assets packed into a ZIP and embedded as a Windows PE resource
- All libraries statically linked (`/MT`, no DLLs required)
- Fully portable — drop on any 64-bit Windows machine and run

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `COPY_ASSETS` | `OFF` | Copy loose asset files next to the exe (for development/debugging) |
| `VCPKG_TARGET_TRIPLET` | `x64-windows-static` | Static linking. Set to `x64-windows` for dynamic (DLL) builds |

```powershell
# Development build with loose assets for editing:
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="..." -DCOPY_ASSETS=ON

# Dynamic linking (produces exe + DLLs):
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="..." -DVCPKG_TARGET_TRIPLET=x64-windows
```

## Run

```powershell
.\build\Release\xenohammer-classic.exe
```

Alt+Enter toggles fullscreen. Save/load uses `savedplayer.txt` in the exe directory.

## What Works

- ✅ Start screen, Ready Room, Options, Briefing menus
- ✅ All 3 levels playable end-to-end (fighters, frigates, boss)
- ✅ Starfield parallax (GL_Handler stars with additive blending)
- ✅ Particle effects, shield bubble, energy glows (GL_Handler overlays)
- ✅ Player banking, weapons, turrets, homing missiles
- ✅ HUD with dynamic bar colors, power cell display
- ✅ Music (OGG) and sound effects (WAV) via SDL2_mixer
- ✅ Save/load game state
- ✅ Sprite transparency (palette-based color keying → RGBA alpha)
- ✅ Bitmap fonts (TGA spritesheets) and TTF fonts
- ✅ Fullscreen toggle (Alt+Enter) and resizable window
