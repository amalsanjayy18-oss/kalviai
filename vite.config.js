import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'KalviAI Educational Portal',
        short_name: 'KalviAI',
        description: 'Bilingual offline-first AI companion for TN State Board students.',
        theme_color: '#f4efe8',
        background_color: '#f4efe8',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Caches offline syllabus datasets and assets for Airplane mode
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ]
})