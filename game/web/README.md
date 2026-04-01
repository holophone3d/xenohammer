# XenoHammer — Web Rewrite

A complete TypeScript/Canvas 2D rewrite of XenoHammer, playable in any modern
browser. Zero runtime dependencies — vanilla TypeScript with the Canvas 2D API.

🌐 **Play now:** [www.xenohammer.com](https://www.xenohammer.com)

## Quick Start

```powershell
npm install         # first time only
npm run dev         # dev server → http://localhost:5173/
npm run build       # production build → dist/
```

## Project Structure

```
web/
├── index.html              # Entry HTML (800×600 canvas with CSS scaling)
├── package.json            # Deps: vite, typescript, puppeteer (dev only)
├── tsconfig.json
├── vite.config.ts          # Asset sync plugin + build config
├── src/
│   ├── main.ts             # Entry: game loop (requestAnimationFrame), CSS scaling
│   ├── engine/             # Core systems
│   │   ├── Canvas.ts       # Canvas rendering abstraction
│   │   ├── Input.ts        # Keyboard/mouse with pressedQueue for race conditions
│   │   ├── Audio.ts        # Web Audio API (music + SFX, autoplay policy handling)
│   │   ├── Sprite.ts       # Sprite rendering, animation, collision masks
│   │   ├── Particles.ts    # Particle system (engine flame, explosions)
│   │   └── AssetLoader.ts  # Async batch asset loading
│   ├── game/               # Gameplay
│   │   ├── GameManager.ts  # Game loop, entity management, state machine, debug menu
│   │   ├── Player.ts       # Player ship, banking, weapons, shield bubble
│   │   ├── Enemy.ts        # Fighter types (Light, Heavy, Gunship), AI
│   │   ├── Boss.ts         # Multi-component boss, all phases, cascade destruction
│   │   ├── CapitalShip.ts  # Frigate with 6-state FrigateAI, turrets
│   │   ├── Projectile.ts   # Movement, velocity scaling, homing
│   │   ├── Weapon.ts       # Weapon types, fire logic, power cells
│   │   ├── Collision.ts    # Sprite-mask collision detection
│   │   ├── HUD.ts          # HUD rendering, bar colors, power cells
│   │   ├── StarField.ts    # Parallax stars + Earth/Moon celestial bodies
│   │   ├── Wave.ts         # Wave spawning definitions
│   │   ├── PowerPlant.ts   # Power management (shields, engines, weapons)
│   │   └── PowerUp.ts      # Power-up pickups
│   └── data/               # Configuration
│       ├── ships.ts        # VELOCITY_DIVISOR, TURRET_VELOCITY_TABLE, ship/weapon configs
│       └── levels.ts       # All 140 waves across 3 levels (transcribed from C++)
├── assets/                 # Web-ready assets
│   ├── graphics/           # PNG sprites (converted from PCX, magenta→transparent)
│   ├── sounds/             # MP3 audio (converted from OGG/WAV)
│   ├── fonts/              # TTF fonts
│   └── icon-pack/          # Favicons and PWA icons
├── public/                 # Static files served at root (icons, manifest)
└── tools/
    └── debug.mjs           # Puppeteer automated screenshot test
```

## Design Constraints

- **Zero runtime dependencies** — single JS bundle + assets, no npm packages in production
- **No game engine or framework** — vanilla TypeScript + Canvas 2D API only
- **Dev dependencies are tooling only** — Vite (bundler), TypeScript (compiler), Puppeteer (testing)
- **Locked 800×600** internal resolution with CSS `transform: scale()` for responsive display

## Testing

```powershell
node tools/debug.mjs    # launches headless Chrome, plays through game, captures screenshots
```

The Puppeteer test automates the full game flow: start screen → ready room → gameplay
through all waves. Screenshots are saved to the working directory for visual comparison.

## Key Technical Details

- **Velocity scaling:** `VELOCITY_DIVISOR = 32` — all movement: `px = velocity × dt_ms / 32`
- **Screen layout:** 800×600; play area 650×600 (left) + HUD 150×600 (right)
- **Sprite collision:** Pixel-level masks built from sprite alpha channels
- **Audio:** Only 2 music tracks — `Level2.ogg` (all levels) + `bossTEST.ogg` (boss)
- **Input:** `pressedQueue` pattern handles instant keydown+keyup in same tick (Puppeteer)
- **Canvas scaling:** CSS `transform: scale()` with `getBoundingClientRect()` for input mapping

## Game Spec

See [`../SPEC.md`](../SPEC.md) for the authoritative game specification covering
all entity stats, wave definitions, collision rules, and timing values.
