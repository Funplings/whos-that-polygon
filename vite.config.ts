import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Hash-only asset names: the default keeps the source filename, and
        // polygon filenames ARE the answers — a right-click on the puzzle
        // image read "absol-Bh2k1x9.png". Applies to every asset; only the
        // production build, since the dev server serves source paths.
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
})
