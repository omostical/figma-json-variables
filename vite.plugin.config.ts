import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/plugin/code.ts',
      formats: ['iife'],
      name: 'code',
      fileName: () => 'code.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
