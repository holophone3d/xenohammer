# XenoHammer 2026

Dual-track modernization of **Codename: XenoHammer**, a top-down 2D space combat
arcade shooter originally written in C++/ClanLib around the year 2000.

🌐 **Play now:** [www.xenohammer.com](https://www.xenohammer.com)

## The Game

XenoHammer is a wave-based space shooter where you defend against alien fighters,
capital ships, and a massive multi-component boss across 3 levels. Features include:

- **3 Levels** — Outer Perimeter → Capital Engagement → Final Assault (Boss)
- **Ship Customization** — 5 weapon slots with power cell distribution
- **Multiple Enemy Types** — Light fighters, heavy fighters, gunships, frigates
- **Epic Boss Fight** — Multi-component boss with shields, orbs, turrets, and platforms
- **Power Management** — Balance between shields, engines, and weapons
- **Homing Missiles** — Researchable upgrade that locks onto priority targets

## Two Tracks

### 🌐 Web Rewrite (`game/web/`)

A complete TypeScript/Canvas 2D rewrite — playable in any modern browser. Zero
runtime dependencies, no game engine or framework. The rendering is locked to
800×600 internal resolution with CSS `transform: scale()` for responsive display.

### 🖥️ Classic (`game/classic/`)

The original ~2000 C++ source running on modern Windows with **zero game code
changes**. A custom ClanLib 0.6 API shim translates all engine calls to
SDL2 + OpenGL at compile time. The 26 original game source files compile
unmodified against 12 shim headers and a single ~1,200-line implementation file.
Three original-era bugs were fixed (buffer overflow, iterator invalidation,
uninitialized variables) — all present in the year-2000 source.

## Project Structure

```
xenohammer_2026/
├── game/
│   ├── SPEC.md                  # Authoritative game specification
│   ├── web/                     # TypeScript + Canvas 2D browser rewrite
│   │   ├── src/
│   │   │   ├── main.ts          # Entry point, game loop
│   │   │   ├── engine/          # Canvas, Input, Audio, Sprite, Particles
│   │   │   ├── game/            # GameManager, Player, Enemy, Boss, HUD, etc.
│   │   │   └── data/            # Ship configs, level/wave definitions
│   │   ├── assets/              # Shared game assets (sprites, sounds, fonts)
│   │   └── vite.config.ts       # Build config
│   └── classic/                 # Original C++ with ClanLib 0.6 API shim
│       ├── CMakeLists.txt       # Build config (CMake + vcpkg)
│       ├── vcpkg.json           # SDL2, SDL2_image, SDL2_mixer, SDL2_ttf
│       ├── assets/              # Original game assets (PCX, WAV, OGG, BMP, TGA)
│       └── src/
│           ├── game/            # Original C++ source (26 .cpp, 37 .h) — untouched
│           └── compat/          # All compatibility/shim code
│               ├── clanlib_shim/  # ClanLib 0.6 API headers + SDL2/GL implementation
│               ├── io/            # Pre-standard C++ header shims
│               ├── gl/            # GLAUX shim
│               └── game/          # VC6 build compatibility proxies
├── site/                        # Landing/tribute page
│   ├── index.html               # Landing page with hero video
│   └── archives/                # Archived original website content
├── tools/
│   ├── package_site.ps1         # Build game + package site → dist/
│   └── deploy_azure.ps1         # Deploy dist/ to Azure
├── AGENTS.md                    # AI agent context (root)
├── LICENSE                      # CC BY-NC-SA 4.0
└── README.md
```

## Quick Start

### Play the web version locally
```powershell
cd game\web
npm install
npm run dev    # → http://localhost:5173/
```

### Build and run the classic version
```powershell
cd game\classic

# First-time setup (requires vcpkg):
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE="<vcpkg-root>\scripts\buildsystems\vcpkg.cmake"

# Build:
cmake --build build --config Release

# Run:
.\build\Release\xenohammer-classic.exe
```

### Build and package the full site
```powershell
.\tools\package_site.ps1              # builds game + packages to dist/
.\tools\package_site.ps1 -SkipBuild   # reuse existing game/web/dist
```

### Deploy to Azure
```powershell
.\tools\deploy_azure.ps1              # deploy to both Storage + Static Web App
.\tools\deploy_azure.ps1 -Target swa  # Static Web App only
```

### Run Puppeteer tests
```powershell
cd game\web
node tools/debug.mjs                   # captures screenshots through full game flow
```

## Architecture

### Web Rewrite (`game/web/`)

The web version is a complete TypeScript rewrite using vanilla Canvas 2D — no game
engine or framework dependencies.

**Design constraints:**
- **Zero runtime dependencies** — single JS bundle + assets, no npm packages in production
- **No game engine or framework** — vanilla TypeScript + Canvas 2D API only
- **Dev dependencies are tooling only** — Vite (bundler), TypeScript (compiler), Puppeteer (testing)

| Layer | Key Files | Purpose |
|-------|-----------|---------|
| Engine | `Canvas.ts`, `Input.ts`, `Audio.ts`, `Sprite.ts`, `Particles.ts` | Core rendering, input, audio |
| Game | `GameManager.ts`, `Player.ts`, `Enemy.ts`, `Boss.ts`, `CapitalShip.ts` | Gameplay logic, AI, state machines |
| Data | `ships.ts`, `levels.ts` | Ship configs, 140 waves across 3 levels |
| Mobile | `TouchControls.ts` | Virtual joystick + buttons (mobile OS only) |

### Classic (`game/classic/`)

The classic version compiles the original C++ source unmodified. A compatibility
layer under `src/compat/` provides all the missing dependencies:

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

| ClanLib API | Shim Implementation |
|---|---|
| `CL_Display`, `CL_Surface` | SDL2 window + OpenGL textured quads |
| `CL_Font` | SDL2_ttf (TTF) + bitmap glyph scanner (TGA) |
| `CL_SoundBuffer` | SDL2_mixer (WAV + OGG) |
| `CL_Keyboard`, `CL_Mouse` | SDL2 event polling |
| `CL_ResourceManager` | Custom ClanLib 0.6 `.scr` file parser |
| `CL_OpenGL::begin_2d/end_2d` | GL state save/restore |

**Prerequisites:** Windows 10/11, MSVC 2022, CMake ≥ 3.20, vcpkg.

### Deployment

The site is hosted on **Azure Static Web App** at [www.xenohammer.com](https://www.xenohammer.com).
`tools/package_site.ps1` assembles `dist/` with the landing page at root and game at `/play/`.

## Game Specification

See [`game/SPEC.md`](game/SPEC.md) for the authoritative reference covering game flow,
timing model, entity stats, wave definitions, collision rules, sound triggers, and
asset manifest.

## Original Source

The original C++ source is at `game/classic/src/game/` within this repo (untouched except 3 bug fixes).

## License

This project is licensed under [CC BY-NC-SA 4.0](LICENSE) — you may share and adapt
for non-commercial purposes with attribution and share-alike.
