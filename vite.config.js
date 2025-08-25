import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Browserslist targets — adjust to your audience
      targets: [
        'defaults',        // covers >0.5% usage, last 2 versions, not dead
        'safari >= 11'     // important for iOS Safari
      ],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      modernPolyfills: true, // injects only what's needed for modern browsers
    })
  ],
  build: {
    // Keep modern syntax for modern browsers
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'FlowApp'
      }
    }
  }
})

