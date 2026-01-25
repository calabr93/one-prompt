import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
  ],
  base: '/',
})
