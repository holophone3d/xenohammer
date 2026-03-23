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

## Projects

### 🌐 `web/` — Browser Rewrite (TypeScript + Canvas 2D)
Complete rewrite as a browser-playable game. Zero dependencies.

```bash
cd web
npm install
npm run dev    # → http://localhost:5173/
```

### 🎮 `classic/` — C++ with SDL2 (ClanLib Shim)
Original C++ source running on a ClanLib API emulation layer backed by SDL2.

```bash
cd classic
cmake -B build -DCMAKE_TOOLCHAIN_FILE=[vcpkg-root]/scripts/buildsystems/vcpkg.cmake
cmake --build build
```

### 📦 `assets/` — Shared Converted Assets
- 336 PNGs converted from original PCX sprites (with transparency)
- 24 sound files (WAV + OGG Vorbis)
- 11 font files (TTF)
- `manifest.json` — asset ID to file path mapping
- `game-constants.json` — extracted gameplay data

### 🔧 `tools/` — Build Scripts
- `convert_assets.py` — Batch PCX→PNG converter with ClanLib tcol transparency

### 📋 `SPEC.md` — Game Specification
Authoritative reference for both implementations. Covers game flow, timing model,
all entity stats, wave definitions, collision rules, sound triggers, and asset manifest.

## Original Source
The unmodified original C++ source is at `E:\Source\xenohammer\`.
The compiled original game (with assets) is in `E:\Source\xenohammer\Debug\`.
