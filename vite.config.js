import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Plugin to copy static files that aren't bundled
 */
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist/renderer');

      // Copy libs (marked, purify)
      copyDir(
        path.resolve(__dirname, 'src/libs'),
        path.resolve(distDir, 'libs')
      );

      // Copy utils (logger-renderer.js)
      copyDir(
        path.resolve(__dirname, 'src/utils'),
        path.resolve(distDir, 'utils')
      );

      // Copy locales
      copyDir(
        path.resolve(__dirname, 'src/locales'),
        path.resolve(distDir, 'locales')
      );

      // Copy styles
      copyDir(
        path.resolve(__dirname, 'src/styles'),
        path.resolve(distDir, 'styles')
      );

      // Copy core-bridge.js
      copyFileSync(
        path.resolve(__dirname, 'src/core-bridge.js'),
        path.resolve(distDir, 'core-bridge.js')
      );

      // Note: renderer.js is now imported by renderer-entry.js and bundled by Vite
      // No longer needs to be copied separately

      console.log('Static files copied to dist/renderer');
    }
  };
}

/**
 * Vite configuration for one-prompt (Open Source base)
 *
 * This config is used ONLY for the renderer process.
 * Main process and preload scripts remain as Vanilla JS.
 *
 * Alias strategy:
 * - @app: Application modules (extracted from renderer.js)
 * - @core: Core utilities and shared logic
 * - @ui: UI components and rendering functions
 * - @services: Application settings and configuration
 *
 * Private repos (one-prompt-private, one-prompt-auto) can override
 * these aliases to point to their own implementations while importing
 * from the open source base.
 */
export default defineConfig({
  root: 'src',
  base: './',

  plugins: [copyStaticFiles()],

  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
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
    strictPort: true,
    // Allow serving files from assets folder (outside root)
    fs: {
      allow: ['..']
    }
  },

  // Public directory for static assets
  publicDir: '../assets',

  // Optimize deps
  optimizeDeps: {
    exclude: ['electron']
  }
});
