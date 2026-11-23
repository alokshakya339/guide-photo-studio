import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // BabySteps' own API server (babysteps/server, port 5060): content, admin, media uploads, client galleries.
    proxy: {
      '/api': 'http://127.0.0.1:5060',
      '/uploads': 'http://127.0.0.1:5060',
    },
  },
});
