# XenoHammer 2026 — Agent Context

> Persistent context for AI agents working on this project.
> Read this first before making any changes.

## Mission

Modernize "Codename: XenoHammer" (~2000 C++/ClanLib top-down space shooter) via two tracks:
- **`classic/`** — Original C++ running via a ClanLib 0.6 API shim backed by SDL2 + OpenGL. **Zero game code changes** (3 original-era bug fixes only). Fully playable.
- **`web/`** — Complete TypeScript/Canvas rewrite, browser-playable.

Both tracks share the same `assets/` directory and `SPEC.md` game specification.

## Source Locations

| Path | Description |
|------|-------------|
| `E:\Source\xenohammer_2026\` | This project (both tracks) |
| `E:\Source\xenohammer\` | Original C++ source — **READ-ONLY reference** |

## Project Layout

```
E:\Source\xenohammer_2026\
├── SPEC.md                         # Authoritative game spec (both tracks)
├── agents.md                       # This file — agent context
├── README.md
├── game\
│   ├── classic\                    # C++ ClanLib shim track (PLAYABLE)
│   │   ├── CMakeLists.txt          # Build config (CMake + vcpkg)
│   │   ├── vcpkg.json              # sdl2, sdl2-image, sdl2-mixer, sdl2-ttf
│   │   ├── assets\                 # Game assets (BMP, PCX, WAV, OGG, TTF, TGA, resource files)
│   │   ├── src\
│   │   │   ├── game\               # Original C++ source (26 .cpp, 37 .h) — UNTOUCHED
│   │   │   └── compat\             # ALL compatibility/shim code
│   │   │       ├── clanlib_shim\
│   │   │       │   ├── ClanLib\    # 12 API headers matching ClanLib 0.6 interface
│   │   │       │   │   └── Core\System\mutex.h
│   │   │       │   └── clanlib_shim_impl.cpp  # Single-file implementation (~1,200 lines)
│   │   │       ├── io\             # Pre-standard C++ headers (fstream.h, iostream.h, iomanip.h)
│   │   │       ├── gl\             # GLAUX shim (glaux.h → auxDIBImageLoadA via SDL2_image)
│   │   │       └── game\           # Build proxies (GameManager_proxy.cpp, Homing_proxy.cpp)
│   │   └── build\                  # CMake build output (sln lives here after cmake)
│   │
│   ├── web\                        # TypeScript rewrite (Vite + vanilla TS)
│   │   ├── src\
│   │   │   ├── main.ts             # Entry, game loop (requestAnimationFrame)
│   │   │   ├── engine\             # Canvas, Input, Audio, Sprite, Particles, AssetLoader
│   │   │   ├── game\               # GameManager, Player, Enemy, Boss, Projectile, Weapon,
│   │   │   │                       #   AI, Collision, HUD, StarField, Wave, PowerPlant, PowerUp
│   │   │   └── data\               # ships.ts (VELOCITY_DIVISOR), levels.ts (140 waves)
│   │   ├── debug.mjs               # Puppeteer automated test (9 screenshots)
│   │   └── public\assets           # Junction → ../../assets (shared)
│   └── SPEC.md
│
├── assets\                         # Shared assets (PNG, WAV, OGG, fonts)
│   ├── graphics\                   # PCX→PNG converted sprites
│   ├── sounds\
│   ├── fonts\
│   └── reference_screenshots\      # 10 screenshots from original game + README.md
│
└── tools\                          # convert_pcx_to_png.py
```

---

## Classic Track — Build & Run

### Prerequisites

- **Windows 10/11**
- **CMake ≥ 3.20**
- **MSVC 2022** (Visual Studio Community or Build Tools)
- **vcpkg** installed and bootstrapped

### First-time setup

```powershell
cd game\classic
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="C:\path\to\vcpkg\scripts\buildsystems\vcpkg.cmake"
```

vcpkg automatically fetches SDL2, SDL2_image, SDL2_mixer (with Vorbis), SDL2_ttf.
The solution file lands at `game\classic\build\xenohammer-classic.sln`.

### Build

```powershell
# From the project root or game\classic\build:
cd game\classic\build
msbuild xenohammer-classic.sln /p:Configuration=Release /p:Platform=x64 /v:minimal

# Or via CMake:
cmake --build build --config Release
```

**If `msbuild` isn't on PATH**, use the full path:
```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" xenohammer-classic.sln /p:Configuration=Release /p:Platform=x64 /v:minimal /nologo
```

Assets are copied to the build output directory by a CMake post-build step.

### Run

```powershell
.\game\classic\build\Release\xenohammer-classic.exe
# or Debug:
.\game\classic\build\Debug\xenohammer-classic.exe
```

The game looks for assets in the working directory (the build output dir). Alt+Enter toggles fullscreen.

### What works (classic)

- ✅ All 3 levels playable end-to-end (fighters, frigates, boss)
- ✅ Start screen, Ready Room, Options, Briefing menus
- ✅ GL_Handler overlays (starfield, particles, shield bubble, energy glows)
- ✅ Player banking, all weapons, turrets, homing missiles
- ✅ HUD with dynamic bar colors, power cell display
- ✅ Music (OGG) and sound effects (WAV) via SDL2_mixer
- ✅ Save/load game state (`savedplayer.txt`)
- ✅ Bitmap fonts (TGA spritesheets) and TTF fonts
- ✅ Fullscreen toggle (Alt+Enter) and resizable window with letterbox

---

## Web Track — Build & Run

### Prerequisites

- **Node.js ≥ 18**

### Setup & Dev

```powershell
cd game\web
npm install
npx vite          # Dev server at http://localhost:5173/
```

### Test (Puppeteer)

```powershell
cd game\web
node debug.mjs    # Captures 9 screenshots through full game flow
```

Compare output against `assets\reference_screenshots\`.

---

## Architecture — Classic ClanLib Shim

The shim reverse-engineers ClanLib 0.6 from usage patterns in the game code and provides drop-in API replacements:

```
Original game code (26 .cpp, 37 .h — untouched)
        │
        ▼
ClanLib 0.6 API headers (12 shim headers)
        │
        ▼
clanlib_shim_impl.cpp (~1,200 lines)
        │
        ▼
SDL2 + SDL2_image + SDL2_mixer + SDL2_ttf + OpenGL
```

### Shim API coverage

| ClanLib API | SDL2/GL Implementation |
|---|---|
| `CL_Display`, `CL_SetupDisplay` | SDL2 window + OpenGL context (800×600, resizable, letterbox) |
| `CL_Surface` | OpenGL textured quads with RGBA upload |
| `CL_Font` | SDL2_ttf (TTF) + bitmap glyph scanner (TGA spritesheets) |
| `CL_SoundBuffer`, `CL_SetupSound` | SDL2_mixer (WAV chunks + OGG music) |
| `CL_InputDevice`, `CL_Keyboard`, `CL_Mouse` | SDL2 event polling + viewport coordinate mapping |
| `CL_ResourceManager` | Custom ClanLib 0.6 `.scr` resource file parser |
| `CL_OpenGL::begin_2d/end_2d` | GL state save/restore (projection, blend, textures) |
| `CL_Canvas`, `CL_PCXProvider`, `CL_TargaProvider` | SDL2_image format loaders |
| `auxDIBImageLoadA` (GLAUX) | SDL2_image BMP → RGB24 for GL_Handler textures |

### Game source changes (3 total — all original-era bugs)

| File | Bug | Fix |
|---|---|---|
| `PlayerShip.cpp:190` | `new char(50)` allocates 1 byte, not 50 | `new char[50]` |
| `GameManager.cpp:1135` | Iterator double-increment after `erase()` | Standard erase-in-loop pattern |
| `GameObject.cpp:22` | `update_time_start/end` uninitialized | Zero-initialize in constructor |

All three bugs existed in the original code but were masked by MSVC 6.0's lenient runtime.

### Key shim implementation details

**glViewport interception:** The game's `GL_Handler.cpp` calls `glViewport(0,0,800,600)` directly, which would override the letterbox viewport on resize/fullscreen. Solution: `#define glViewport shim_glViewport` in `ClanLib/gl.h` — the shim intercepts all viewport calls and applies the letterbox transform. The impl file `#undef`s the macro so it can call the real `glViewport`.

**Music stop sentinel:** `CL_SoundBuffer_Session::stop()` uses `channel == -2` as a sentinel for music (vs SDL_mixer channels ≥ 0). The stop method checks for this sentinel and calls `Mix_HaltMusic()`.

**Font Y convention:** ClanLib 0.6 `print_center/print_left/print_right` Y parameter = text **baseline**. SDL_ttf renders from top-left, so: `render_y = y - TTF_FontAscent(font)`.

**Bitmap fonts:** TGA spritesheets with glyphs scanned by column. The shim walks pixel columns to find glyph boundaries and builds a width table. Rendering uses GL textured quads per glyph.

**Resource parser:** ClanLib 0.6 `.scr` files use a custom format:
```
section sprite_name
    type = sprite
    resource = pcximage(filename.pcx)
    tcol = 0, 0, 0
```
The parser handles `section/endsection`, nested sections, and `type`/`resource`/`tcol`/`leading` properties.

---

## Critical Technical Details (Both Tracks)

### Velocity Scaling — VELOCITY_DIVISOR = 32
ALL movement: `actual_px = (velocity × dt_ms) / 32`. At 60fps ≈ halves all velocities.
Web: `moveScale = dt * 1000 / 32`. Defined in `web/src/data/ships.ts`.

### Screen: 800×600. Play area: 650×600 (left). HUD: 150×600 (right, x=650–800).

### Music: Only TWO tracks — `Level2.ogg` (all levels) + `bossTEST.ogg` (boss).

### Weapons
- Turrets use discrete 8-angle lookup table (NOT trig)
- Blaster always fires straight up
- Missiles home after 50px travel
- Enemy blaster angle = 0 (straight down, not 180)

### Weapon Power System
Each weapon has TWO power cells: cell1 controls fire rate, cell2 controls damage/sprite.
- `effectiveDelay = baseDelay / getPowerMUX(cell1)`
- `actualDamage = baseDamage × getPowerMUX(cell2)`
- `getPowerMUX` is non-linear: {0→1.0, 1→1.5, 2→2.0, 3→2.5, 4→3.0, 5→5.0}
- ALL weapons (player AND enemy) use this system

### Player Banking
Frame 0 = banked RIGHT, Frame 8 = center, Frame 16 = banked LEFT.
Moving RIGHT → frame-- ; Moving LEFT → frame++.

## Key C++ Source Files (original, READ-ONLY reference)

| File | Contents |
|------|----------|
| `GUI.cpp` | ALL menu/UI screens (Room, Options, Briefing, Customization, HUD console) |
| `GL_Handler.cpp` | Shield bubble, OpenGL particles, boss shield, homing target overlay |
| `GameManager.cpp` | Game loop, state machine, `make_engine()`, level animations |
| `PlayerShip.cpp` | Player update, banking, weapon offsets, shield regen |
| `GameObject.cpp` | `show()` with VELOCITY_DIVISOR scaling |
| `Projectile.cpp` | Velocity lookup table, homing logic |
| `Sound.cpp` | Music/SFX mapping |
| `Console.h` | HUD bar position constants |
| `GameAnimation.h` | Level intro frame animation (100ms/frame) |
| `Boss.cpp` | Boss constructor (38 components), state machine, cascade destruction |
| `FrigateAI.cpp` | 6-state machine (ENTERING→STRAFING↔CHARGING↔RETREATING→SITTING→RUNAWAY) |
| `TurretAI.cpp` | AI types: NORMAL, RANDOM, SWEEPING, FIXED |

## What Works in Web Version
- Start screen, Ready Room (basic — no dynamic tooltips)
- Gameplay: movement, banking, weapons, enemies, waves, collisions
- Starfield parallax with Earth/Moon
- HUD (basic layout — positions/colors need fixing)
- Velocity scaling (VELOCITY_DIVISOR = 32)
- Correct bullet directions (turret lookup, enemy angle=0)
- Music (Level2.ogg) and sound effects
- Puppeteer automated testing
- Weapon power cell system with getPowerMUX multipliers
- Boss fight: all phases, shield collision, turret AI with dual timing gates
- Boss cascade destruction, death sequence, U-arm deployment
- Debug menu: level jumps, god mode, +10 RUs

## What's Missing / Needs Fixing (Web)

### Visual Effects (HIGH)
| Feature | Details | C++ Source |
|---------|---------|-----------|
| Shield bubble | Blue (0.3,0.6,0.9) translucent oval, alpha=shields/300 | `GL_Handler.cpp:872` |
| Engine flame | Particle: R=1.0,G/B=rand(0-2), angle~175° | `GameManager::make_engine()` |
| Bar colors | Green→yellow→red gradient based on value | `GUI.cpp:805-813` |
| Level intro | 8 sprite frames at 100ms, pos (253,200) | `GameManager.cpp:1407` |

### Menu/UI Screens (MEDIUM-HIGH)
| Screen | C++ Source |
|--------|-----------|
| Ready Room tooltips | `GUI.cpp:80-222` |
| Options menu | `GUI.cpp:335-483` |
| Briefing submenu | `GUI.cpp:485-594` |
| Scrolling briefings | `GUI.cpp:595-700` |
| Ship customization | `GUI.cpp:228-333` |
| Difficulty | `GUI.cpp:2306-2421` |

## Testing
- **Classic:** Build & run the .exe, play through all 3 levels
- **Web Puppeteer:** `cd game\web && node debug.mjs` — captures 9 screenshots
- **Web dev server:** `cd game\web && npx vite` → `http://localhost:5173/`
- **Reference:** Compare with `assets\reference_screenshots\`

## Common Pitfalls (lessons learned across 70+ sessions)

1. **Always read the actual C++ code** — don't guess. The C++ IS the spec.
2. **Trace full call chains** — e.g., `Boss::FireTurret()` → `Weapon::fire()` → `Projectile()`. Each step adds offsets.
3. **glViewport is intercepted** in classic — don't call the real one from game code, it goes through the shim.
4. **Music uses channel sentinel -2** — session stop must check for this, not just `channel >= 0`.
5. **ClanLib font Y = baseline** — not top, not bottom. Use `TTF_FontAscent()` for the offset.
6. **Bitmap fonts use Y = top** — no baseline adjustment needed for TGA spritesheet fonts.
7. **Release builds expose uninitialized vars** — Debug MSVC fills heap with 0xCD, Release uses garbage.
8. **CapitalShip.cpp is dead code** — excluded from CMake build (original VS6 project didn't compile it either).
9. **GameManager.cpp and Homing.cpp** need proxy files for VC6 compatibility (leaked loop vars, include ordering).
10. **OGG files are pre-standard Vorbis** — modern decoders may fail silently. Convert to MP3 via VLC if needed.
11. **Sprite transparency** — magenta (255,0,255) at alpha=0 causes pink halos with canvas anti-aliasing. Fix: set to (0,0,0,0).
12. **Only TWO music tracks exist** — don't search for level-specific music.
13. **Wave type 1 = HEAVYFIGHTER, not gunship** — gunships are 30% random spawns per wave.
14. **Projectile frames are NOT animated** — frame = power_cell_2 - 1, set once at creation.
