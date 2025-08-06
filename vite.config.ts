import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import * as path from 'path'

export default defineConfig({
  root: 'src/web',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: false, // Use our existing manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/localhost:\d+\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'local-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 10 // 10 minutes for dev
              }
            }
          }
        ]
      }
    })
  ],
  publicDir: '../../public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/web/index.html')
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['wenbo-macbook.dala-cobia.ts.net', 'cui.wenbo.io', 'localhost', '127.0.0.1', 'cui1.wenbo.io', 'cui2.wenbo.io', 'cui.tai.chat'],
  }
})
