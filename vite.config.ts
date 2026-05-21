import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      'xlsx-js-style': path.resolve(__dirname, 'node_modules/xlsx-js-style/dist/xlsx.min.js'),
    },
  },
})
