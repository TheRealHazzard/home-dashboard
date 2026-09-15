import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One screen, one build — unlike botc-night's host/player split, this
// kiosk only ever renders one page. server.js owns every /api/* route;
// this config only ever turns JSX into plain JS, it never becomes a
// second server. Dev mode proxies API/static requests through to
// server.js (run separately, `npm start`) so the same fetch('/api/...')
// calls work unchanged against the Vite dev server's own origin.
export default defineConfig(({ command }) => ({
  root: 'client',
  plugins: [react()],
  // server.js has no idea the build exists — it just serves whatever's
  // under public/, generic-fallback style, at the same path it lives on
  // disk. Built asset URLs need to actually be under /dist/ to match
  // where Vite writes them (../public/dist) — dev mode keeps base '/'
  // since nothing is written to disk then, matching botc-night's same
  // command-conditional split.
  base: command === 'build' ? '/dist/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3200',
      '/manifest.json': 'http://localhost:3200',
      '/icons': 'http://localhost:3200',
    },
  },
  build: {
    outDir: '../public/dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: false,
  },
}));
