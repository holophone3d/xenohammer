# XenoHammer Web — Agent Context

> TypeScript/Canvas browser rewrite. Read `agents.md` at repo root first for overall context.

## What This Is

A complete TypeScript/Canvas rewrite of the ~2000 C++ XenoHammer space shooter,
playable in any modern browser. Uses Vite for bundling, vanilla TypeScript (no
framework), and the Canvas 2D API for rendering.

## Build & Run

```powershell
cd game\web
npm install         # First time only
npx vite            # Dev server → http://localhost:5173/
npm run build       # Production build → dist/
```

### Puppeteer Testing

```powershell
cd game\web
node debug.mjs      # Captures 9 screenshots through full game flow
```

Compare output against `assets\reference_screenshots\` (10 original game captures).

## Project Structure

```
game/web/
├── index.html              # Entry HTML (800×600 canvas with CSS scaling)
├── package.json            # Deps: vite, typescript, puppeteer (dev only)
├── tsconfig.json
├── vite.config.ts          # Asset sync plugin (copies from assets/)
├── debug.mjs               # Puppeteer automated screenshot test
├── src/
│   ├── main.ts             # Entry: game loop (requestAnimationFrame), CSS scaling
│   ├── engine/
│   │   ├── Canvas.ts       # Canvas 2D rendering abstraction
│   │   ├── Input.ts        # Keyboard/mouse with pressedQueue for race conditions
│   │   ├── Audio.ts        # Web Audio API (music + SFX), autoplay policy handling
│   │   ├── Sprite.ts       # Sprite rendering, animation, collision masks
│   │   ├── Particles.ts    # Particle system (engine flame, explosions)
│   │   ├── AssetLoader.ts  # Async batch asset loading
│   │   ├── TouchControls.ts # Mobile touch input
│   │   └── index.ts        # Engine barrel export
│   ├── game/
│   │   ├── GameManager.ts  # Game loop, state machine, entity management (~2100 lines)
│   │   ├── Player.ts       # Player ship, banking, weapons, shield bubble
│   │   ├── Enemy.ts        # LightFighter, FighterB, Gunship types + AI
│   │   ├── Boss.ts         # Boss fight: components, state machine, energy effects (~1600 lines)
│   │   ├── CapitalShip.ts  # Frigate with FrigateAI 6-state machine, turrets (~733 lines)
│   │   ├── Projectile.ts   # Movement, velocity scaling, homing
│   │   ├── Weapon.ts       # Weapon types, fire logic, power cells
│   │   ├── Collision.ts    # Sprite-level collision masks (per-pixel)
│   │   ├── HUD.ts          # HUD rendering, bar colors, power cell display
│   │   ├── StarField.ts    # Parallax stars + Earth/Moon celestial bodies
│   │   ├── Wave.ts         # Wave spawning definitions
│   │   ├── Explosion.ts    # Explosion rendering + particles
│   │   ├── AI.ts           # Shared AI utilities
│   │   ├── Screens.ts      # Menu/UI screens (start, ready room, options, briefing)
│   │   ├── PowerPlant.ts   # Power management (shields, engines, weapons)
│   │   ├── PowerUp.ts      # Power-up pickups
│   │   └── maskUtil.ts     # Collision mask building from sprite images
│   └── data/
│       ├── ships.ts        # VELOCITY_DIVISOR=32, TURRET_VELOCITY_TABLE, ship/weapon configs
│       └── levels.ts       # All 140 waves transcribed from C++ across 3 levels
├── public/
│   └── assets/             # Junction → ../../assets (shared with classic track)
└── assets/                 # Symlink target for Vite asset serving
```

## Critical Technical Details

### Velocity Scaling — VELOCITY_DIVISOR = 32
```typescript
const moveScale = dt * 1000 / VELOCITY_DIVISOR; // dt in seconds
actualPx = velocity * moveScale;
```
At 60fps (dt≈16.67ms): moveScale ≈ 0.52, effectively halving all velocities.
Defined in `data/ships.ts`.

### Canvas Scaling
Internal resolution LOCKED at 800×600. CSS `transform: scale(factor)` where
`factor = Math.min(innerWidth/800, innerHeight/600)`. Input uses
`getBoundingClientRect()` which handles CSS transforms automatically.

### Screen Layout
- Play area: 650×600 (left, x=0-650)
- HUD panel: 150×600 (right, x=650-800)

### Weapon Power System
```typescript
effectiveDelay = baseDelay / getPowerMUX(cell1)   // fire rate
actualDamage = baseDamage * getPowerMUX(cell2)     // damage
// getPowerMUX: {0→1.0, 1→1.5, 2→2.0, 3→2.5, 4→3.0, 5→5.0}
```

### Turret Aiming — 8-Angle Lookup Table (NOT trig)
```
Frame 0 (down):  dx=0, dy=speed      Frame 4 (right): dx=speed, dy=0
Frame 8 (up):    dx=0, dy=-speed     Frame 12 (left): dx=-speed, dy=0
Diagonals at frames 2,6,10,14: ±speed*0.707
```

### Additive Blending
C++ uses `glBlendFunc(GL_SRC_ALPHA, GL_ONE)`. Canvas equivalent:
```typescript
ctx.globalCompositeOperation = 'lighter';
// ALWAYS save/restore after use
```

### Audio — Web Audio API
- Only TWO music tracks: `Level2.ogg` (all levels) + `bossTEST.ogg` (boss)
- Chrome blocks AudioContext before user gesture → defer creation, queue operations
- OGG files are pre-standard Vorbis — converted to MP3 via VLC for browser compat
- Non-blocking `loadMusic()` — don't await, let it load in background

### Input Race Condition
Puppeteer (and fast human input) fires keydown+keyup in same tick.
Fix: `pressedQueue: Set<string>` cleared at `endFrame()`.
`wasPressed(key)` checks the queue. Same pattern for mouse: `mouseClickQueued`.

### Sprite Collision Masks
Built from actual sprite images using offscreen canvas + `getImageData()`.
Each pixel → 1 byte (0=transparent, 1=opaque). Avoids bounding-box false positives.

### Sprite Transparency
Original PCX had magenta (255,0,255) for transparency. PNG conversion preserved
magenta RGB at alpha=0 pixels. Canvas anti-aliasing bleeds the color → pink halos.
Fix: All 241 sprites post-processed to (0,0,0,0) for transparent pixels.

## C++ Reference

The original source at `E:\Source\xenohammer\` is the authoritative reference.
Always read the actual C++ code — don't guess. Key files:

| C++ File | Web Equivalent | What to check |
|----------|---------------|---------------|
| `Boss.cpp` | `game/Boss.ts` | 38 components, positions, cascade destruction |
| `GL_Handler.cpp` | Various | Shield bubble, particles, energy effects |
| `GameManager.cpp` | `game/GameManager.ts` | State machine, entity management |
| `GUI.cpp` | `game/Screens.ts` + `game/HUD.ts` | ALL menu/UI, positions, colors |
| `PlayerShip.cpp` | `game/Player.ts` | Banking, weapon offsets |
| `Projectile.cpp` | `game/Projectile.ts` | Velocity lookup, homing |
| `FrigateAI.cpp` | `game/CapitalShip.ts` | 6-state machine, constants |
| `Console.h` | `game/HUD.ts` | Bar position constants |

## What Works

- ✅ Start screen, Ready Room (basic — no dynamic tooltips)
- ✅ All 3 levels: fighters, frigates, boss fight
- ✅ Player banking, all weapons, turrets, homing missiles
- ✅ Starfield parallax with Earth/Moon
- ✅ HUD with dynamic bar colors, power cells
- ✅ Boss: all phases, shield, turret AI, cascade destruction, U-arms
- ✅ Music + SFX
- ✅ Puppeteer automated testing
- ✅ Debug menu: backtick to toggle, 1/2/3 = level jumps, G = god mode

## What Needs Work

### Visual Effects (HIGH)
- Shield bubble: Blue translucent oval, alpha=shields/300 (`GL_Handler.cpp:872`)
- Engine flame: Particles at (x+38,y+47), R=1.0, G/B=rand (`make_engine()`)
- HUD bar colors: Green→yellow→red gradient (`GUI.cpp:805-813`)
- Level intro: 8 sprite frames at 100ms (`GameManager.cpp:1407`)

### Menu/UI (MEDIUM-HIGH)
- Ready Room dynamic tooltips (`GUI.cpp:80-222`)
- Options menu with 6 buttons (`GUI.cpp:335-483`)
- Briefing submenu (`GUI.cpp:485-594`)
- Scrolling briefing text over starfield (`GUI.cpp:595-700`)
- Ship customization with power cells (`GUI.cpp:228-333`)
- Difficulty selection (`GUI.cpp:2306-2421`)

## Common Pitfalls

1. **Always read the C++ source** — it IS the spec. Don't guess values.
2. **Trace full call chains** — Boss::FireTurret → Weapon::fire → Projectile. Each step adds offsets.
3. **VELOCITY_DIVISOR applies to EVERYTHING** — movement, projectiles, particles.
4. **Wave type 1 = HEAVYFIGHTER, not gunship** — gunships are 30% random spawns.
5. **Projectile frames are NOT animated** — frame = power_cell_2 - 1, set once.
6. **Enemy blaster angle = 0 (down), not 180** — a recurring mistake.
7. **Player banking is counter-intuitive** — moving RIGHT decrements frame (toward 0 = banked right).
8. **Gunship fires BOTH weapons simultaneously** per burst, not alternating.
9. **Earth/Moon use YSCALE=600**, not 32 — much slower movement.
10. **Boss timing drift** — `nLastMove -= interval` with `if` (not `while`) causes accumulated drift.
