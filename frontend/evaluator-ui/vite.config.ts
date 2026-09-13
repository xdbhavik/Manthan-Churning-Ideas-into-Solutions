import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    proxy: {
      "/auth": { target: "http://localhost:8090", changeOrigin: true },
      "/evaluation": { target: "http://localhost:8090", changeOrigin: true },
      "/problems": { target: "http://localhost:8090", changeOrigin: true },
      "/portal": { target: "http://localhost:8090", changeOrigin: true },
    },
  },
});
