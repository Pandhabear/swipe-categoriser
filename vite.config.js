import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Set this to your GitHub repo name so assets resolve correctly on GitHub Pages
  // e.g. if your repo is github.com/edicenjin/swipe-categoriser, base = '/swipe-categoriser/'
  base: '/swipe-categoriser/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
