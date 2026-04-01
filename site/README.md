# XenoHammer — Website

Static landing page and tribute site for XenoHammer, hosted at
[www.xenohammer.com](https://www.xenohammer.com).

## Structure

```
site/
├── index.html              # Main landing page (~41KB, self-contained CSS+JS)
├── hero-gameplay.webm      # Hero section gameplay video (autoplay, muted, loop)
└── archives/
    ├── index.html          # Archives landing page
    ├── museum/             # Original game museum content
    ├── museum.css          # Museum-specific styles
    ├── images/             # Archive images
    └── raw/                # Raw original game files
```

## Design

- **Theme:** Dark sci-fi (`--bg: #08080f`, green accent `--green: #00ff66`)
- **Font:** Custom `XenoFont` loaded from `game/web/assets/fonts/mine.ttf`
- **Background:** Animated canvas starfield (JS embedded in `index.html`)
- **Responsive:** `clamp()` sizing, mobile-friendly layout
- **No build step** — pure static HTML/CSS/JS, no framework

## Deployment

The site is deployed to **Azure Static Web App** via `tools/deploy_azure.ps1`.

The `dist/` directory at repo root is the deploy target, assembled by
`tools/package_site.ps1`:

| Source | Destination | Contents |
|--------|-------------|----------|
| `site/index.html` | `dist/index.html` | Landing page |
| `site/hero-gameplay.webm` | `dist/hero-gameplay.webm` | Hero video |
| `site/archives/` | `dist/archives/` | Museum content |
| `game/web/dist/` | `dist/play/` | Built web game (after `npm run build`) |

```powershell
# Build and package everything:
..\..\tools\package_site.ps1

# Deploy:
..\..\tools\deploy_azure.ps1
```

## Notes

- The "Play" button links to `/play/` which serves the built web game
- `index.html` is fully self-contained (all CSS and JS inline) — edit carefully
- Hero video requires `muted` attribute for Chrome autoplay policy
- Archives are a separate page, not part of the main SPA
