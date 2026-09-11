import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Root-hosted deployments (Netlify / production) need absolute asset URLs so SPA deep routes load JS/CSS correctly.\n  // GitHub Pages overrides this at build time with --base=/allegro-vibez/.\n  base: '/',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
