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
        id: '.',
        name: 'Byte Sized Daily Brief',
        short_name: 'Byte Sized',
        lang: 'en-US',
        description: 'Five software-engineering articles worth your attention every weekday.',
        theme_color: '#e63b2e',
        background_color: '#f5f3ee',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '.',
        scope: '.',
        prefer_related_applications: false,
        categories: ['news', 'productivity', 'education'],
        screenshots: [
          {
            src: 'screenshots/daily-brief.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: 'The daily five-story engineering brief'
          },
          {
            src: 'screenshots/evergreen-idea.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: 'One optional evergreen engineering recommendation'
          }
        ],
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
