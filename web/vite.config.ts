import { defineConfig } from "vite";
import { rmSync, copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const ICON_PACK = resolve(__dirname, "../assets/icon-pack");
const PUBLIC = resolve(__dirname, "public");

// Icons to copy from assets/icon-pack → web/public before each build
const ICONS = [
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "site.webmanifest",
];

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
  },
  plugins: [
    {
      name: "sync-icons-and-cleanup",
      buildStart() {
        mkdirSync(PUBLIC, { recursive: true });
        for (const f of ICONS) {
          try {
            copyFileSync(resolve(ICON_PACK, f), resolve(PUBLIC, f));
          } catch { /* icon-pack file missing — skip */ }
        }
      },
      closeBundle() {
        const toRemove = [
          "dist/assets/reference_screenshots",
          "dist/assets/icon-pack",
        ];
        for (const dir of toRemove) {
          try {
            rmSync(resolve(__dirname, dir), { recursive: true, force: true });
          } catch { /* already absent */ }
        }
      },
    },
  ],
});
