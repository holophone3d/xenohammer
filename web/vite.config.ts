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
      name: "exclude-reference-screenshots",
      closeBundle() {
        try {
          rmSync(resolve(__dirname, "dist/assets/reference_screenshots"), {
            recursive: true,
            force: true,
          });
        } catch {
          /* already absent */
        }
      },
    },
  ],
});
