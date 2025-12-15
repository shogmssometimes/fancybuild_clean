import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Keep a single React instance and make HMR work under the repository base path.
const repoBasePath = "/fancybuild_clean/";
const base = process.env.VITE_BASE_PATH || repoBasePath;

export default defineConfig({
  base,
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  server: {
    hmr: {
      path: "/hmr" // avoid ws path collisions when serving under the repo base path
    }
  },
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          gm: path.resolve(__dirname, "gm.html"),
        },
    },
  },
  plugins: [react()]
});
