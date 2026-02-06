import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Build optimization for production
  build: {
    // Output directory
    outDir: 'dist',
    // Generate source maps for debugging (set to false in production if needed)
    sourcemap: false,
    // Minify output
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunk for React
          'vendor-react': ['react', 'react-dom'],
          // Vendor chunk for utilities
          'vendor-utils': ['axios', 'zustand', 'xlsx', 'zod'],
        },
        // Asset file naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: true,
  },

  // Development server configuration
  server: {
    port: 5173,
    strictPort: false,
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
})
