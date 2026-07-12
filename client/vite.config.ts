import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors so the main bundle stays lean.
        manualChunks: {
          charts: ["@mui/x-charts", "@mui/material", "@emotion/react", "@emotion/styled"],
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "axios"],
        },
      },
    },
  },
});
