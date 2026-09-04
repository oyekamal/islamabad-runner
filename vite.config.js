import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2019', outDir: 'dist', assetsInlineLimit: 0, sourcemap: false,
    rollupOptions: { input: { main: 'index.html' } } },
  server: { host: true, port: 5173 },
});
