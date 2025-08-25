import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Browsers you want legacy fallback for
      targets: ['defaults', 'safari >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true, // make sure legacy bundle is emitted
    }),
  ],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        // Modern bundle keeps hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',

        // Force legacy entry to always be named legacy.js
        manualChunks: undefined, // keep single entry bundle
      },
    },
  },
})

