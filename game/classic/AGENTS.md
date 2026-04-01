# XenoHammer Classic — Agent Context

> ClanLib 0.6 API shim project. Read `AGENTS.md` at repo root first for overall context.

## What This Is

The original ~2000 C++ XenoHammer source running on modern Windows with **minimal game
code changes** (5 surgical fixes). A custom ClanLib 0.6 API shim translates all engine
calls to SDL2 + OpenGL at compile time. The 26 original game source files compile
against 12 shim headers and a single ~1,400-line implementation file.

## Build

```powershell
# First-time setup (need vcpkg installed):
cd game\classic
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="C:\path\to\vcpkg\scripts\buildsystems\vcpkg.cmake"

# Build (solution is at build\xenohammer-classic.sln):
cd build
msbuild xenohammer-classic.sln /p:Configuration=Release /p:Platform=x64 /v:minimal

# If msbuild isn't on PATH:
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" ^
  xenohammer-classic.sln /p:Configuration=Release /p:Platform=x64 /v:minimal /nologo

# Run:
.\Release\xenohammer-classic.exe
```

vcpkg fetches: SDL2, SDL2_image, SDL2_mixer (with Vorbis), SDL2_ttf, miniz.

### Build Output

By default the build produces a **single self-contained exe** (~14.5 MB). All game
assets are packed into a ZIP and embedded as a Windows PE resource. All libraries
are statically linked (no DLLs). Drop the exe anywhere and run.

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `COPY_ASSETS` | `OFF` | Copy loose asset files next to the exe (for development) |
| `VCPKG_TARGET_TRIPLET` | `x64-windows-static` | Static linking. Set to `x64-windows` for dynamic (DLL) builds |

```powershell
# Development build with loose assets for editing:
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="..." -DCOPY_ASSETS=ON

# Dynamic linking (produces exe + DLLs instead of single exe):
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="..." -DVCPKG_TARGET_TRIPLET=x64-windows
```

### Asset Embedding

All 342 game assets are packed into a ZIP at build time and embedded as a Windows
PE resource in the exe. At runtime, `AssetPack` loads the ZIP from the exe's own
memory — no disk extraction. Falls back transparently to disk I/O if no embedded
ZIP is found (development builds with `COPY_ASSETS=ON`).

## Project Structure

```
game/classic/
├── CMakeLists.txt              # Build config (CMake + vcpkg)
├── vcpkg.json                  # Dependencies: SDL2, SDL2_image, SDL2_mixer, SDL2_ttf, miniz
├── assets/                     # Game assets (BMP, PCX, WAV, OGG, TTF, TGA, .scr resource files)
├── src/
│   ├── game/                   # Original C++ source (26 .cpp, 37 .h) — DO NOT MODIFY
│   └── compat/                 # ALL compatibility/shim code lives here
│       ├── clanlib_shim/
│       │   ├── ClanLib/        # 12 API headers matching ClanLib 0.6 interface
│       │   │   ├── core.h      # CL_System (keep_alive, get_time)
│       │   │   ├── display.h   # CL_Display, CL_Surface, CL_Font, CL_Canvas
│       │   │   ├── gl.h        # CL_OpenGL::begin_2d/end_2d, glViewport intercept
│       │   │   ├── input.h     # CL_Keyboard, CL_Mouse, CL_InputDevice
│       │   │   ├── sound.h     # CL_SoundBuffer, CL_SetupSound
│       │   │   ├── resources.h # CL_ResourceManager (.scr file parser)
│       │   │   ├── application.h # CL_ClanApplication (entry point macro)
│       │   │   ├── gui.h       # Stub (not used)
│       │   │   ├── system.h    # Includes core.h
│       │   │   ├── ttf.h       # Stub (TTF handled via display.h CL_Font)
│       │   │   ├── vorbis.h    # Stub (Vorbis handled via SDL2_mixer)
│       │   │   └── Core/System/mutex.h  # CL_Mutex stub (no threading needed)
│       │   ├── asset_pack.h/cpp        # Embedded ZIP asset loader (PE resource → miniz)
│       │   └── clanlib_shim_impl.cpp    # THE implementation file (~1,400 lines)
│       ├── io/                 # fstream.h, iostream.h, iomanip.h (pre-standard → modern)
│       ├── gl/                 # glaux.h (auxDIBImageLoadA → SDL2_image BMP loader)
│       └── game/               # GameManager_proxy.cpp, Homing_proxy.cpp (VC6 workarounds)
└── build/                      # CMake output (sln, vcxproj, Debug/, Release/)
```

## Key Files

### `compat/clanlib_shim/clanlib_shim_impl.cpp` — The heart of the shim (~1,200 lines)

| Section | What it does |
|---------|-------------|
| Lines ~1-40 | Globals: SDL window, renderer, viewport letterbox state |
| Lines ~41-43 | `shim_glViewport()` — intercepts game's glViewport calls |
| Lines ~64-96 | `keep_alive()` — SDL event pump, Alt+Enter fullscreen, resize handler |
| Lines ~100-170 | `CL_SetupDisplay::init()` — window creation (SDL2 + OpenGL context) |
| Lines ~170-400 | `CL_Surface` — sprite loading (PCX/PNG/BMP → OpenGL textures) |
| Lines ~400-500 | `CL_ResourceManager` — .scr resource file parser |
| Lines ~500-700 | `CL_Font` — TTF font loading and rendering |
| Lines ~700-750 | `font_render_text()` — THE font rendering function (Y=baseline) |
| Lines ~750-850 | `CL_SoundBuffer` — WAV/OGG loading and playback |
| Lines ~850-1000 | `CL_OpenGL::begin_2d/end_2d` — GL state management |
| Lines ~1000-1200 | `CL_Keyboard`, `CL_Mouse`, input handling, coordinate mapping |

### CMakeLists.txt — Build quirks

- **CapitalShip.cpp is excluded** — dead code, original VS6 project didn't compile it
- **GameManager.cpp → GameManager_proxy.cpp** — wraps with VC6 for-scope compat
- **Homing.cpp → Homing_proxy.cpp** — fixes include ordering
- Include order matters: `compat/io/` FIRST (intercepts `<fstream.h>` etc.)
- All shim code lives under `src/compat/` (clanlib_shim, io, gl, game proxies)

## Game Source Changes (5 total)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `PlayerShip.cpp` | 190 | `new char(50)` = 1 byte alloc | `new char[50]` |
| `GameManager.cpp` | 1135 | Iterator double-increment after erase | Standard erase-in-loop |
| `GameObject.cpp` | 22 | `update_time_start/end` uninitialized | Zero-init in constructor |
| `pcxload.cpp` | 34 | Raw `fopen` can't read embedded assets | Try AssetPack first, fall back to fopen |
| `GL_Handler.cpp` | 49 | `fopen` existence check fails for embedded BMP assets | Try AssetPack first, fall back to fopen |

Minimize changes to `src/game/` files. All shim/compat work goes in `src/compat/`.

## Critical Implementation Details

### glViewport Interception
Game's `GL_Handler.cpp` calls `glViewport(0,0,800,600)` in `ReSizeGLScene()`.
This overrides the letterbox viewport on resize/fullscreen.
Solution: `#define glViewport shim_glViewport` in `ClanLib/gl.h`.
The shim impl `#undef`s it to call the real `glViewport`.

### Font Y = Baseline
ClanLib 0.6 `print_center/print_left/print_right` Y = text baseline.
SDL_ttf renders from top-left. Conversion: `render_y = y - TTF_FontAscent(font)`.
Bitmap fonts (TGA spritesheets) use Y = top of text with no adjustment.

### Music Channel Sentinel
`CL_SoundBuffer_Session` uses `channel = -2` for music (vs SDL_mixer channels ≥ 0).
`stop()` must check `channel == -2` → `Mix_HaltMusic()`, not just `channel >= 0`.

### Resource File Format (.scr)
ClanLib 0.6 custom format parsed by `CL_ResourceManager`:
```
section sprite_name
    type = sprite
    resource = pcximage(filename.pcx)
    tcol = 0, 0, 0
endsection
```
Supports nested sections, `leading` property for fonts, multiple frames.

### Letterbox Viewport
Window is resizable + fullscreen (Alt+Enter). Internal resolution locked at 800×600.
`scale = min(winW/800, winH/600)`, viewport centered. Mouse coordinates mapped
through inverse viewport transform via `mouse_to_game_x/y()`.

## Common Pitfalls

1. **Don't modify game source** — fix things in the shim, not in `src/game/`
2. **Release builds expose uninitialized vars** — Debug MSVC fills heap with 0xCD
3. **Include order in CMakeLists.txt matters** — compat headers must intercept first
4. **GL state is shared** — `begin_2d/end_2d` must save/restore ALL GL state the game touches
5. **Texture IDs are GL names** — `CL_Surface` stores actual OpenGL texture IDs
6. **Color keying** — PCX/BMP use palette color 0 as transparent, converted to RGBA alpha=0
7. **Sound channels** — SDL_mixer has limited channels; music uses `Mix_PlayMusic()` not `Mix_PlayChannel()`
