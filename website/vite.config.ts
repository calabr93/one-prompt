import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
// The second build (`vite build --ssr src/entry-server.tsx`) only renders the home page for
// scripts/prerender.mjs: it needs neither the static assets nor the public folder.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    ...(isSsrBuild
      ? []
      : [
          viteStaticCopy({
            targets: [
              {
                src: '../assets/ai-services/*',
                dest: 'assets/ai-services'
              },
              {
                src: '../assets/logo/*',
                dest: 'assets/logo'
              },
              {
                src: '../assets/website/*',
                dest: 'assets/media'
              },
              {
                src: 'src/data/prompts.md',
                dest: 'data'
              }
            ]
          })
        ])
  ],
  base: '/',
  build: isSsrBuild ? { copyPublicDir: false } : {},
}))
