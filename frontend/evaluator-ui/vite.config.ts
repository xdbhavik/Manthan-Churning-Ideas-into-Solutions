import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    proxy: {
      "/auth": { target: "https://api.bhavik.site", changeOrigin: true, secure: true },
      "/evaluation": { target: "https://api.bhavik.site", changeOrigin: true, secure: true },
      "/problems": { target: "https://api.bhavik.site", changeOrigin: true, secure: true },
      "/portal": { target: "https://api.bhavik.site", changeOrigin: true, secure: true },
    },
  },
});
