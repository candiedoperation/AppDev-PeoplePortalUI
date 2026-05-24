import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@root": path.resolve(__dirname),
    },
  },

  server: {
    proxy: {
      '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
      }
    }
  }
})
