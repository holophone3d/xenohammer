# XenoHammer 2026 — Agent Context

> Persistent context for AI agents working on this project.
> Read this first before making any changes.

## Mission

Modernize "Codename: XenoHammer" (~2000 C++/ClanLib top-down space shooter) via two tracks:
- **`web/`** — Complete TypeScript/Canvas rewrite, browser-playable
- **`classic/`** — Original C++ with SDL2-backed ClanLib API shim (future)

**Convergence goal:** Iteratively inspect original C++ → update SPEC.md → implement in web → test with Puppeteer → compare with reference screenshots → repeat.

## Project Layout

```
E:\Source\xenohammer_2026\          # This project
├── SPEC.md                         # Authoritative game spec (both tracks)
├── agents.md                       # This file — agent context
├── README.md
├── assets\                         # Shared assets (PNG, WAV, OGG, fonts)
│   ├── graphics\                   # PCX→PNG converted sprites
│   ├── sounds\
│   ├── fonts\
│   └── reference_screenshots\      # 10 screenshots from original game + README.md
├── web\                            # TypeScript rewrite (Vite + vanilla TS)
│   ├── src\
│   │   ├── main.ts                 # Entry, game loop (requestAnimationFrame)
│   │   ├── engine\                 # Canvas, Input, Audio, Sprite, Particles, AssetLoader
│   │   ├── game\                   # GameManager, Player, Enemy, Boss, Projectile, Weapon,
│   │   │                           #   AI, Collision, HUD, StarField, Wave, PowerPlant, PowerUp
│   │   └── data\                   # ships.ts (configs, VELOCITY_DIVISOR), levels.ts (waves)
│   ├── debug.mjs                   # Puppeteer automated test (9 screenshots)
│   └── public\assets → junction to ../../assets
├── classic\                        # C++ ClanLib shim (scaffolded, not yet functional)
└── tools\                          # convert_pcx_to_png.py

E:\Source\xenohammer\               # Original C++ source (READ-ONLY reference)
```

## Critical Technical Details

### Velocity Scaling — VELOCITY_DIVISOR = 32
ALL movement: `actual_px = (velocity × dt_ms) / 32`. At 60fps ≈ halves all velocities.
Web: `moveScale = dt * 1000 / 32`. Defined in `web/src/data/ships.ts`.

### Screen: 800×600. Play area: 650×600 (left). HUD: 150×600 (right, x=650–800).

### Canvas Scaling
The game is LOCKED to 800×600 internal resolution. The canvas uses CSS `transform: scale()` to best-fit the browser window while preserving the 4:3 aspect ratio. Input coordinates are automatically adjusted via `getBoundingClientRect()`. Implemented in `web/src/main.ts` (resize listener) and `web/index.html` (transform-origin).

### Music: Only TWO tracks — `Level2.ogg` (all levels) + `bossTEST.ogg` (boss).

### Weapons: Turrets use discrete 8-angle lookup table (NOT trig). Blaster always fires straight up. Missiles home after 50px travel. Enemy blaster angle = 0 (not 180).

### Player Banking: Frame 0 = banked RIGHT, Frame 8 = center, Frame 16 = banked LEFT. Moving RIGHT → frame-- ; Moving LEFT → frame++.

## Key C++ Source Files (for reference)

| File | Contents |
|------|----------|
| `GUI.cpp` | ALL menu/UI screens (Room, Options, Briefing, Customization, HUD console) |
| `GL_Handler.cpp` | Shield bubble (textured quad), OpenGL particles, boss shield |
| `GameManager.cpp` | Game loop, state machine, `make_engine()`, level animations |
| `PlayerShip.cpp` | Player update, banking, weapon offsets, shield regen |
| `GameObject.cpp` | `show()` with VELOCITY_DIVISOR scaling |
| `Projectile.cpp` | Velocity lookup table, homing logic |
| `Sound.cpp` | Music/SFX mapping |
| `Console.h` | HUD bar position constants |
| `GameAnimation.h` | Level intro frame animation (100ms/frame) |

## What Works in Web Version
- Start screen, Ready Room (basic — no dynamic tooltips)
- Gameplay: movement, banking, weapons, enemies, waves, collisions
- Starfield parallax with Earth/Moon
- HUD (basic layout — positions/colors need fixing)
- Velocity scaling (VELOCITY_DIVISOR = 32)
- Correct bullet directions (turret lookup, enemy angle=0)
- Music (Level2.ogg) and sound effects
- Puppeteer automated testing

## What's Missing / Needs Fixing

### Visual Effects (HIGH — immediately visible)
| Feature | Details | C++ Source |
|---------|---------|-----------|
| Shield bubble | Blue (0.3,0.6,0.9) translucent oval, alpha=shields/300, 129×89px at player+(38,-24) | `GL_Handler.cpp:872` |
| Engine flame | Particle: R=1.0,G/B=rand(0-2), angle~175°, at (x+38,y+47), life 0.003-0.103s | `GameManager::make_engine()` |
| Bar colors | ≥150: R=(val×-0.015)+4.5,G=1.0 / <150: R=1.0,G=val×0.0066 | `GUI.cpp:805-813` |
| Level intro | 8 sprite frames at 100ms, pos (253,200), 600ms–4000ms delay | `GameManager.cpp:1407` |

### HUD Accuracy (MEDIUM)
| Element | Correct Position | Current Issue |
|---------|-----------------|---------------|
| Rank | centered (725, 0) | May be wrong |
| Kills | (660, 130) right-aligned at 790 | Check |
| Settings | y=190/220/250, active=green, inactive=dimmed | No highlighting |
| RU's | (660, 280) | Check |
| Power cell bars | 4×4px green, exact positions per system | May be missing |

### Menu/UI Screens (MEDIUM-HIGH)
| Screen | Key Details | C++ Source |
|--------|-------------|-----------|
| Ready Room tooltips | 3 zones with hover labels + dynamic bottom text | `GUI.cpp:80-222` |
| Options menu | 6 buttons over green CRT overlay (`room_screen`) | `GUI.cpp:335-483` |
| Briefing submenu | 5 buttons → backstory/briefing/specs/quit | `GUI.cpp:485-594` |
| Scrolling briefings | Backstory 1px/60ms, levels 1px/40ms, over starfield | `GUI.cpp:595-700` |
| Ship specs | Static `ship_specs` bitmap, Done button at (680-800, 540-600) | `GUI.cpp:2275-2304` |
| Ship customization | 6 weapon zones, power cells, research, settings | `GUI.cpp:228-333` |
| Difficulty | Easy/Medium/Hard/Extremely Hard | `GUI.cpp:2306-2421` |

### Notifications
- "New Level Briefing Available!" label on ready room
- "NEW!" label near customization monitor

## Testing
- **Puppeteer:** `web/debug.mjs` — launch with `node debug.mjs`, captures 9 screenshots
- **Dev server:** `cd web && npx vite` → `http://localhost:5173/`
- **Reference:** Compare with `assets/reference_screenshots/` (10 original game screenshots + README.md)

## Implementation Priority
1. Shield bubble + engine flame + bar colors (visual effects)
2. HUD layout/power settings accuracy
3. Ready Room dynamic tooltips
4. Level intro animation
5. Options/Briefing menu system
6. Scrolling briefings + ship specs
7. Ship customization UI
8. Difficulty settings + Save/Load
