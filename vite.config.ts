import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    proxy: {
      '/api/horizons': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/horizons/, '/api/horizons.api'),
        secure: false,
      }
    }
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@formatted_data': path.resolve(__dirname, 'formatted_data')
    }
  }
})

