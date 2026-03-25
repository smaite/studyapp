import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/ai': {
        target: 'https://gthpanel.qzz.io', // Target AI API server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '')
      }
    }
  }
})
