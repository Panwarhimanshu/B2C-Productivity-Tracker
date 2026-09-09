import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Overridable so the dev server can run on an alternate port (e.g. when the default
    // is already taken by something else) without editing this file.
    port: Number(process.env.DEV_PORT) || 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
