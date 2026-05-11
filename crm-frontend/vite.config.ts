import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), TanStackRouterVite()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Todo lo que empiece con /api se reenvía a KrakenD (server-to-server, sin CORS)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Quita el prefijo /api antes de reenviar: /api/auth/login → /auth/login
        rewrite: (p) => p.replace(/^\/api/, ''),
        // Para requests con credentials (cookies)
        secure: false,
      },
    },
  },
})
