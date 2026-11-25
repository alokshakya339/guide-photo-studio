import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // Server-side rendering bundle (vite build --ssr): one self-contained .mjs file — React and the router are bundled
  // in, because the production server only installs the API's own dependencies.
  ...(isSsrBuild ? {
    ssr: { noExternal: true },
    build: { outDir: 'dist-ssr', emptyOutDir: true, copyPublicDir: false, rollupOptions: { output: { entryFileNames: '[name].mjs', chunkFileNames: 'assets/[name]-[hash].mjs', format: 'es' } } },
  } : {}),
  server: {
    port: 5173,
    host: true, // reachable from phones on the same Wi-Fi
    proxy: Object.fromEntries(['/api', '/uploads', '/sitemap.xml', '/robots.txt', '/site.webmanifest', '/llms.txt'].map((p) => [p, process.env.API_URL || 'http://127.0.0.1:5050'])),
  },
}));
