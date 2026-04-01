# XenoHammer Website — Agent Context

> Marketing/landing page for XenoHammer. Read `agents.md` at repo root first.

## What This Is

A static single-page website for XenoHammer featuring:
- Hero section with gameplay video
- Playable web version (embedded from `dist/play/`)
- Archives section with original game museum
- Dark sci-fi theme with animated canvas starfield background

## Structure

```
site/
├── index.html              # Main landing page (single-file, ~41KB, self-contained CSS+JS)
├── hero-gameplay.webm      # Hero section gameplay video
├── archives/
│   ├── index.html          # Archives landing page
│   ├── museum/             # Original game museum content
│   ├── museum.css          # Museum-specific styles
│   ├── images/             # Archive images
│   └── raw/                # Raw original game files
└── (no build step — pure static HTML)

dist/                       # Deployed output (at repo root)
├── index.html              # Copy of site/index.html (or built version)
├── play/                   # Web game build output (from game/web/ vite build)
│   ├── index.html          # Game entry point
│   ├── assets/             # Built game assets
│   └── *.png, *.ico        # Icons and favicons
├── archives/               # Copy of site/archives/
└── hero-gameplay.webm      # Hero video
```

## Design

- **Theme:** Dark sci-fi (`--bg: #08080f`, green accent `--green: #00ff66`)
- **Font:** Custom `XenoFont` from `game/web/assets/fonts/mine.ttf`
- **Background:** Animated canvas starfield (`#starfield` element, JS in index.html)
- **Scanline effect:** CSS `repeating-linear-gradient` overlay on sections
- **Responsive:** `clamp()` sizing, mobile-friendly

## Key Details

- **No build step** — pure static HTML/CSS/JS
- **No framework** — vanilla everything
- The game is embedded via the `dist/play/` directory (built from `game/web/`)
- Hero video is `hero-gameplay.webm` (autoplay, muted, loop)
- Font reference: `url('../game/web/assets/fonts/mine.ttf')` — relative path to shared fonts

## Deployment

The `dist/` directory at repo root is the deploy target. It combines:
1. `site/index.html` → `dist/index.html`
2. `site/archives/` → `dist/archives/`
3. `site/hero-gameplay.webm` → `dist/hero-gameplay.webm`
4. `game/web/dist/` → `dist/play/` (after `npm run build` in game/web/)

## Common Pitfalls

1. **Font path is relative** — `../game/web/assets/fonts/mine.ttf` works in dev but may need adjusting for dist
2. **Game embed path** — the "Play" link points to `play/` subdirectory
3. **Video autoplay** — requires `muted` attribute for Chrome autoplay policy
4. **Large file** — `index.html` is ~41KB (all CSS+JS inline), be careful with full-file edits
5. **Archives are separate** — `archives/index.html` is its own page, not part of the SPA
