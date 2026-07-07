import { defineConfig } from 'vite';

export default defineConfig({
  base: '/timi2/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
