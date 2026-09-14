import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // we register manually in main.jsx
      // Large marketing PNG (schedule graphic) is loaded on demand — don't precache.
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Festy Blocks',
        short_name: 'Festy Blocks',
        description:
          'Festival shift wishlist, conflict draft, and schedule for small crews.',
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#111827',
        background_color: '#0b1220',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest}'],
        // Exclude the large official schedule graphic from precache — served
        // live on demand and cached opportunistically by the runtime handler.
        globIgnores: ['**/schedule.png'],
        // Avoid caching Firestore endpoints — Firestore manages its own offline layer.
        navigateFallbackDenylist: [/^\/__\/.*/, /^https:\/\/firestore\.googleapis\.com\/.*/],
        runtimeCaching: [
          {
            urlPattern: /\/schedule\.png$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'schedule-graphic',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // keep dev fast; enable to test SW locally
      },
    }),
  ],
})
