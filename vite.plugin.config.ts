import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2017',
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
