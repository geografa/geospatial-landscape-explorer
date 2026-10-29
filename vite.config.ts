import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same build works at a GitHub Pages project
  // subpath (/geospatial-landscape-explorer/), a custom domain, or locally.
  base: "./",
  build: {
    // Cytoscape alone is ~450 kB minified and can't be split further.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          cytoscape: ["cytoscape", "cytoscape-fcose"],
          react: ["react", "react-dom", "zustand"],
        },
      },
    },
  },
});
