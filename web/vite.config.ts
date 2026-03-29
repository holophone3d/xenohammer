import { defineConfig } from "vite";
import { rmSync, cpSync, copyFileSync, existsSync, realpathSync } from "fs";
import { resolve } from "path";

const ASSETS_ROOT = resolve(__dirname, "../assets");
const PUBLIC = resolve(__dirname, "public");

// Game asset directories to sync from assets/ → public/assets/
const ASSET_DIRS = ["graphics", "sounds", "fonts"];

// Individual asset files to sync from assets/ → public/assets/
const ASSET_FILES = ["manifest.json", "game-constants.json"];

// Icons to sync from assets/icon-pack/ → public/ (site root)
const ICON_FILES = [
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "site.webmanifest",
];

/** Copy src→dst unless they resolve to the same real path (e.g. junction). */
function safeCopy(src: string, dst: string, recursive = false) {
  if (!existsSync(src)) return;
  try {
    if (existsSync(dst) && realpathSync(src) === realpathSync(dst)) return;
  } catch { /* dst doesn't exist yet — fine, copy it */ }
  if (recursive) {
    cpSync(src, dst, { recursive: true, force: true });
  } else {
    copyFileSync(src, dst);
  }
}

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
  },
  plugins: [
    {
      name: "sync-assets",
      buildStart() {
        const pubAssets = resolve(PUBLIC, "assets");

        // Sync game asset directories
        for (const dir of ASSET_DIRS) {
          safeCopy(resolve(ASSETS_ROOT, dir), resolve(pubAssets, dir), true);
        }

        // Sync individual asset files
        for (const f of ASSET_FILES) {
          safeCopy(resolve(ASSETS_ROOT, f), resolve(pubAssets, f));
        }

        // Sync icons to public root
        const iconPack = resolve(ASSETS_ROOT, "icon-pack");
        for (const f of ICON_FILES) {
          safeCopy(resolve(iconPack, f), resolve(PUBLIC, f));
        }
      },
      closeBundle() {
        // Remove dirs that leak through the public/assets junction during dev
        for (const dir of ["dist/assets/reference_screenshots", "dist/assets/icon-pack"]) {
          try {
            rmSync(resolve(__dirname, dir), { recursive: true, force: true });
          } catch { /* already absent */ }
        }
      },
    },
  ],
});
