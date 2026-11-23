import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // reachable from phones on the same Wi-Fi
    proxy: Object.fromEntries(['/api', '/uploads', '/sitemap.xml', '/robots.txt', '/site.webmanifest'].map((p) => [p, process.env.API_URL || 'http://127.0.0.1:5050'])),
  },
});
