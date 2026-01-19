import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vite configuration for one-prompt (Open Source base)
 *
 * This config is used ONLY for the renderer process.
 * Main process and preload scripts remain as Vanilla JS.
 *
 * Alias strategy:
 * - @core: Core utilities and shared logic
 * - @ui: UI components and rendering functions
 * - @services: AI services and API handling
 *
 * Private repos (one-prompt-private, one-prompt-auto) can override
 * these aliases to point to their own implementations while importing
 * from the open source base.
 */
export default defineConfig({
  root: 'src',
  base: './',

  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@services': path.resolve(__dirname, 'src/services'),
    }
  },

  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    // Target browser environment for renderer
    target: 'chrome130',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
      // External modules that should not be bundled
      external: ['electron']
    },
    // Don't minify in development for easier debugging
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production'
  },

  // Development server config
  server: {
    port: 5173,
    strictPort: true
  },

  // Optimize deps
  optimizeDeps: {
    exclude: ['electron']
  }
});
