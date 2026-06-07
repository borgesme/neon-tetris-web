import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Neon Tetris',
        short_name: 'Tetris',
        description: 'A responsive neon Tetris game for desktop and mobile.',
        theme_color: '#070a12',
        background_color: '#070a12',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});
