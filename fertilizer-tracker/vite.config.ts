import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'quotation-header.jpg', 'quotation-footer.jpg', 'visit-header.jpg', 'visit-footer.jpg'],
      manifest: {
        name: 'Adike Besaya - Fertilizer Tracker',
        short_name: 'Adike Besaya',
        description: 'CRM for agricultural sales - leads, field visits, quotations, payments',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: 'logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      },
      workbox: {
        // Cache all app assets (JS, CSS, HTML, images)
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        // Cache API calls with network-first strategy
        runtimeCaching: [
          {
            // Cache Google Fonts (NotoSans, NotoSansKannada)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache only attendance API calls for offline use
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/attendance.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['uuid', 'zustand'],
        },
      },
    },
  },
})
