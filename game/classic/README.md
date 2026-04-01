# XenoHammer Classic

The original ~2000 C++ XenoHammer source running on modern Windows — **virtually
zero game code changes**. A custom ClanLib 0.6 API shim translates all engine
calls to SDL2 + OpenGL at compile time. The 26 original game source files compile
unmodified against 12 shim headers and a single ~1,200-line implementation file.

## How It Works

The original game was built on [ClanLib 0.6](http://www.clanlib.org/), an obscure
C++ game engine from the late 1990s for which no source or documentation survives.
Rather than rewrite the game, this project reverse-engineers the ClanLib API from
usage patterns in the game code and provides drop-in replacements backed by modern
libraries.

```
Original game code (untouched)
        │
        ▼
ClanLib 0.6 API headers ──► clanlib_shim_impl.cpp
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
| `CL_ResourceManager` | Custom ClanLib 0.6 resource file parser |
| `CL_OpenGL::begin_2d/end_2d` | GL state save/restore (projection, blend, textures) |
| `CL_Canvas`, `CL_PCXProvider`, `CL_TargaProvider` | SDL2_image format loaders |
| `auxDIBImageLoadA` (GLAUX) | SDL2_image BMP → RGB24 for GL_Handler textures |

### Game source changes (3 total, all original-era bugs)

| File | Bug | Fix |
|---|---|---|
| `PlayerShip.cpp:190` | `new char(50)` allocates 1 byte, not 50 | `new char[50]` |
| `GameManager.cpp:1135` | Iterator double-increment after `erase()` | Standard erase-in-loop pattern |
| `GameObject.cpp:22` | `update_time_start/end` uninitialized | Zero-initialize in constructor |

All three bugs existed in the original code but were masked by MSVC 6.0's
lenient runtime. Modern MSVC debug/release modes expose them.

## Project Structure

```
game/classic/
├── CMakeLists.txt              # Build config (CMake + vcpkg)
├── vcpkg.json                  # Dependencies: SDL2, SDL2_image, SDL2_mixer, SDL2_ttf
├── assets/                     # Game assets (PCX→PNG sprites, WAV/OGG sounds, fonts)
├── src/
│   ├── game/                   # Original C++ source (26 .cpp, 37 .h) — UNTOUCHED
│   └── compat/
│       ├── clanlib_shim/
│       │   ├── ClanLib/        # 12 API headers matching ClanLib 0.6 interface
│       │   └── clanlib_shim_impl.cpp   # Single-file implementation (~1,200 lines)
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
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="<vcpkg-root>\scripts\buildsystems\vcpkg.cmake"
cmake --build build --config Debug
```

vcpkg automatically fetches SDL2, SDL2_image, SDL2_mixer (with Vorbis), and SDL2_ttf.
Assets are copied to the build output directory by a post-build step.

## Run

```powershell
.\build\Debug\xenohammer-classic.exe
```

The game looks for assets in the working directory (the build output dir).
A `savedplayer.txt` file in the same directory provides save/load support.

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
