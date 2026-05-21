import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// To produce a single-file build, run `npm run build:single`.
// `npm run build` still produces the multi-chunk version for dev / preview.
const SINGLE = process.env.SINGLE === '1';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  plugins: SINGLE ? [viteSingleFile()] : [],
  build: {
    target: 'es2022',
    sourcemap: !SINGLE,
    // For single-file build, inline everything and avoid asset splitting.
    assetsInlineLimit: SINGLE ? 100_000_000 : 4096,
    cssCodeSplit: !SINGLE,
    rollupOptions: SINGLE ? { output: { inlineDynamicImports: true } } : {},
  },
});
