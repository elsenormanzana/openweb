import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget = env.VITE_API_URL || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Only split vendor deps into stable named chunks. App block modules
          // are deliberately NOT grouped here — forcing dynamically-imported
          // modules into a manual chunk makes Rollup hoist that chunk into the
          // entry's static graph, which would ship framer-motion on every page.
          // Vite auto-splits each lazy block into its own chunk; BlockRenderer's
          // preloadBlocks() fetches the needed ones in parallel.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("@tiptap") || id.includes("prosemirror")) return "tiptap";
            if (
              id.includes("framer-motion") ||
              id.includes("motion-dom") ||
              id.includes("motion-utils")
            ) {
              return "framer-motion";
            }
            // Stable core — rarely changes, so it caches across deploys.
            if (
              id.includes("/react-router") ||
              id.includes("/react-dom/") ||
              id.includes("/react/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor";
            }
            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/uploads": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
        "/sitemap.xml": { target: apiTarget, changeOrigin: true },
        "/robots.txt": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
