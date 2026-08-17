import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],

  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'https://vakrayan.com',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    // Warn when a chunk exceeds 500 KB (default is 500 but making it explicit)
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting (function form required by Vite 8 + rolldown).
         * Returns chunk name string if the module belongs to a vendor group, or
         * undefined to let Vite decide (default code-splitting for app code).
         */
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@reduxjs/') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux')) {
            return 'vendor-redux';
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
        },
      },
    },

    // Vite 8 uses oxc for minification by default — do not override
  },
})
