# XenoHammer 2026

Two-track modernization of **Codename: XenoHammer**, a top-down 2D space combat arcade shooter originally written in C++ with ClanLib 0.6.x circa 2000.

## Projects

### `web/` — Web Rewrite
Complete rewrite as a browser-playable game using **HTML5 Canvas + vanilla TypeScript**. Zero dependencies. Modern, tight, simple.

### `classic/` — Classic C++ with ClanLib Shim
The original C++ game source running on a **ClanLib API emulation layer** backed by **SDL2**. The goal is zero changes to game logic — only the engine layer is replaced.

### `assets/` — Shared Converted Assets
PCX sprites converted to PNG, original WAV/OGG sound files, TTF fonts. Both projects consume from here.

### `tools/` — Build Tools
Asset conversion scripts (PCX → PNG with transparency).

## Original Source
The unmodified original C++ source lives in `E:\Source\xenohammer\`.
