import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:8090', changeOrigin: true },
      '/registration': { target: 'http://localhost:8090', changeOrigin: true },
      '/reviewer': { target: 'http://localhost:8090', changeOrigin: true },
      '/users': { target: 'http://localhost:8090', changeOrigin: true },
      '/source': { target: 'http://localhost:8090', changeOrigin: true },
      '/domains': { target: 'http://localhost:8090', changeOrigin: true },
      '/problems': { target: 'http://localhost:8090', changeOrigin: true },
      '/audit': { target: 'http://localhost:8090', changeOrigin: true },
      '/evaluation': { target: 'http://localhost:8090', changeOrigin: true },
      '/portal': { target: 'http://localhost:8090', changeOrigin: true },
      '/codejudge': { target: 'http://localhost:8090', changeOrigin: true },
      '/eureka': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
})
