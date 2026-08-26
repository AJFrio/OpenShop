import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Optional HMR workflow: set DEV_API_PROXY=1 to proxy /api to the worker running
// via `npm run dev:local` (http://localhost:8787). Inert by default — the default
// dev flow serves the API and assets from the worker itself.
const apiProxy = process.env.DEV_API_PROXY
  ? { server: { proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } } } }
  : {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  ...apiProxy,
})
