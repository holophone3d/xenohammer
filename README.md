# XenoHammer 2026

Dual-track modernization of **Codename: XenoHammer**, a top-down 2D space combat
arcade shooter originally written in C++/ClanLib in 2000.

## The Game

XenoHammer is a wave-based space shooter where you defend against alien fighters,
capital ships, and a massive multi-component boss across 3 levels. Features include:

- **3 Levels**: Outer Perimeter → Capital Engagement → Final Assault (Boss)
- **Ship Customization**: 5 weapon slots with power cell distribution
- **Multiple Enemy Types**: Light fighters, heavy fighters, gunships, frigates
- **Epic Boss Fight**: Multi-component boss with shields, orbs, turrets, and platforms
- **Power Management**: Balance between shields, engines, and weapons

## Project Structure

```
xenohammer_2026/
├── game/                    # Game source and assets
│   ├── SPEC.md              # Authoritative game specification
│   ├── web/                 # Browser rewrite (TypeScript + Canvas 2D)
│   │   ├── src/             # Game source code
│   │   ├── assets/          # Game assets (sprites, sounds, fonts)
│   │   ├── public/          # Vite static files (icons, manifest)
│   │   └── dist/            # Vite build output (gitignored)
│   └── classic/             # C++ with SDL2 ClanLib shim (scaffolded)
├── site/                    # Landing page source
│   ├── index.html           # Tribute/landing page
│   └── archives/            # Archived Tripod/external content
├── tools/                   # Build and utility scripts
│   ├── package_site.py      # Build game + package everything → dist/
│   ├── convert_assets.py    # PCX→PNG asset converter
│   └── archive_tripod.py    # Wayback Machine archiver
├── dist/                    # Packaged deployable site (gitignored)
└── README.md
```

## Quick Start

### Play the web version
```bash
cd game/web
npm install
npm run dev    # → http://localhost:5173/
```

### Build and package the full site
```bash
python tools/package_site.py          # builds game + packages to dist/
python tools/package_site.py --skip-build   # reuse existing game/web/dist
```

### Classic C++ build (scaffolded, not yet functional)
```bash
cd game/classic
cmake -B build -DCMAKE_TOOLCHAIN_FILE=[vcpkg-root]/scripts/buildsystems/vcpkg.cmake
cmake --build build
```

## Game Specification

See [`game/SPEC.md`](game/SPEC.md) for the authoritative reference covering game flow,
timing model, entity stats, wave definitions, collision rules, sound triggers, and
asset manifest.

## Original Source

The unmodified original C++ source is at `E:\Source\xenohammer\`.
The compiled original game (with assets) is in `E:\Source\xenohammer\Debug\`.
