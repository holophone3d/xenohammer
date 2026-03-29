import { defineConfig } from "vite";
import { rmSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
  },
  plugins: [
    {
      name: "exclude-unneeded-assets",
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
