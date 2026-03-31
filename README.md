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

## Project Structure

```
xenohammer_2026/
├── game/                        # Game source and assets
│   ├── SPEC.md                  # Authoritative game specification
│   └── web/                     # Browser rewrite (TypeScript + Canvas 2D)
│       ├── src/
│       │   ├── main.ts          # Entry point, game loop
│       │   ├── engine/          # Canvas, Input, Audio, Sprite, Particles, TouchControls
│       │   ├── game/            # GameManager, Player, Enemy, Boss, Projectile, HUD, etc.
│       │   └── data/            # Ship configs, level/wave definitions
│       ├── assets/              # Game assets (sprites, sounds, fonts, icons)
│       │   ├── graphics/        # PCX→PNG converted sprites
│       │   ├── sounds/          # WAV + MP3 sound effects and music
│       │   ├── fonts/           # Custom bitmap font
│       │   └── icon-pack/       # App icons, manifest, favicons (source of truth)
│       ├── public/              # Vite static files (synced from icon-pack at build)
│       ├── debug.mjs            # Puppeteer automated test (screenshots)
│       ├── capture-hero.mjs     # Hero video capture script
│       ├── vite.config.ts       # Build config with icon sync plugin
│       └── dist/                # Vite build output (gitignored)
├── site/                        # Landing/tribute page
│   ├── index.html               # Landing page with hero video
│   ├── hero-gameplay.webm       # Gameplay capture for landing page
│   └── archives/                # Archived Tripod/external content
├── tools/
│   ├── package_site.ps1         # Build game + package site → dist/
│   └── deploy_azure.ps1         # Deploy dist/ to Azure (Storage + SWA)
├── agents.md                    # AI agent context
├── dist/                        # Packaged deployable site (gitignored)
└── README.md
```

## Quick Start

### Play the web version locally
```powershell
cd game\web
npm install
npm run dev    # → http://localhost:5173/
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
node debug.mjs                         # captures screenshots through full game flow
```

## Architecture

### Web Rewrite (`game/web/`)

The web version is a complete TypeScript rewrite using vanilla Canvas 2D — no game
engine or framework dependencies. The rendering is locked to 800×600 internal
resolution with CSS `transform: scale()` for responsive display.

| Layer | Key Files | Purpose |
|-------|-----------|---------|
| Engine | `Canvas.ts`, `Input.ts`, `Audio.ts`, `Sprite.ts`, `Particles.ts` | Core rendering, input, audio |
| Game | `GameManager.ts`, `Player.ts`, `Enemy.ts`, `Boss.ts`, `CapitalShip.ts` | Gameplay logic, AI, state machines |
| Data | `ships.ts`, `levels.ts` | Ship configs, 140 waves across 3 levels |
| Mobile | `TouchControls.ts` | Virtual joystick + buttons (mobile OS only) |

**Key technical details:**
- **Velocity scaling:** `VELOCITY_DIVISOR = 32` — all movement: `px = velocity × dt_ms / 32`
- **Play area:** 650×600 (left) + HUD 150×600 (right panel)
- **Sprite collision:** Pixel-level masks from actual sprite alpha (not bounding boxes)
- **Audio:** Web Audio API with autoplay policy handling; OGG→MP3 converted via VLC
- **Input:** `pressedQueue` pattern to handle fast keydown+keyup in same frame

### Deployment

The site is hosted on **Azure Static Web App** at [www.xenohammer.com](https://www.xenohammer.com).

- `tools/package_site.ps1` — Runs `vite build`, assembles `dist/` with landing page at root and game at `/play/`
- `tools/deploy_azure.ps1` — Deploys to Azure Storage Account and/or Static Web App
- DNS: `www.xenohammer.com` → CNAME to Azure SWA; apex forwards via GoDaddy 301

### Asset Pipeline

- Original PCX sprites → PNG (via `convert_assets.py`, one-time)
- All transparent pixels cleaned to `(0,0,0,0)` to prevent magenta bleed
- Icons: `assets/icon-pack/icon-1024.png` is the master; derived sizes generated from it
- Maskable icons: 75% content scale with dark padding for Android safe zone
- `vite.config.ts` syncs icons from `assets/icon-pack/` → `public/` at build time

## Game Specification

See [`game/SPEC.md`](game/SPEC.md) for the authoritative reference covering game flow,
timing model, entity stats, wave definitions, collision rules, sound triggers, and
asset manifest.

## Original Source

The unmodified original C++ source (read-only reference) is at `E:\Source\xenohammer\`.
