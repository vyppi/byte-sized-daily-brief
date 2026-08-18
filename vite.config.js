import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Byte Sized Daily Brief',
        short_name: 'Byte Sized',
        description: 'A finite daily reading brief for engineers and engineering managers.',
        theme_color: '#e63b2e',
        background_color: '#f5f3ee',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '.',
        scope: '.',
        categories: ['news', 'productivity', 'education'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/latest.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'daily-brief-data',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 8
              }
            }
          }
        ]
      }
    })
  ]
})
