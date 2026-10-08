import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoAssetsGarageCloud = path.resolve(__dirname, "../assets/js/garage-cloud-sync.mjs");
const repoGarageSavedCars = path.resolve(__dirname, "../assets/js/garage-saved-cars.mjs");
const repoBmwTechnicalSpecs = path.resolve(__dirname, "../assets/js/bmw-technical-specs.mjs");
const repoUserSavedResolved = path.resolve(__dirname, "../assets/js/user-saved-vehicles-resolved.mjs");
const repoSupabaseConfig = path.resolve(__dirname, "../assets/js/supabase-config.mjs");

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "https://esm.sh/@supabase/supabase-js@2.49.1": require.resolve("@supabase/supabase-js"),
      "@site-garage-cloud": repoAssetsGarageCloud,
      "@site-garage-saved-cars": repoGarageSavedCars,
      "@site-bmw-technical-specs": repoBmwTechnicalSpecs,
      "@site-user-saved-resolved": repoUserSavedResolved,
      "@site-supabase-config": repoSupabaseConfig,
    },
  },
  /** Garajul vine din Supabase (sesiune); același origin ca magazinul pentru cookie auth (ex. `npm run preview`). */
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
  build: {
    outDir: "../garage-engineered-engine-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        oemPlusKits: path.resolve(__dirname, "oem-plus-kits.html"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "oemPlusKits"
            ? "assets/garage-engineered-engine-oem-plus-kits.js"
            : "assets/garage-engineered-engine.js",
        chunkFileNames: "assets/garage-engineered-engine-[name].js",
        assetFileNames: "assets/garage-engineered-engine-[name][extname]",
      },
    },
  },
});
