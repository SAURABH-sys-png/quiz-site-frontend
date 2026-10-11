import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: proxy the API and Socket.IO to the backend so everything is same-origin (httpOnly cookie works).
// Prod: serve dist/ and the backend under one domain behind a reverse proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Allow Cloudflare quick-tunnel hostnames (also applies to `vite preview`).
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:5000' },
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
  build: {
    // The CodeMirror chunk is large but only loads for code questions and the admin editor.
    chunkSizeWarningLimit: 750,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
