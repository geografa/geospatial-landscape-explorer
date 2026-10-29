import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
