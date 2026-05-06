import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../suspension-design-dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/suspension-design.js",
        chunkFileNames: "assets/suspension-design-[name].js",
        assetFileNames: "assets/suspension-design-[name][extname]",
      },
    },
  },
});
