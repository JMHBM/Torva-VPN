import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  base: "./",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(dir, "../src") },
  },
  build: {
    outDir: resolve(dir, "dist-renderer"),
    emptyOutDir: true,
    target: "chrome128",
    sourcemap: false,
  },
});
