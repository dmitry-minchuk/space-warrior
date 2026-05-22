import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// To produce a single-file build, run `npm run build:single`.
// `npm run build` still produces the multi-chunk version for dev / preview.
const SINGLE = process.env.SINGLE === '1';

// Dev-only telemetry sink. Client posts the running session JSON every ~1.5 s
// (and once more on game-over / level-clear); we just dump it to disk so it's
// readable by anything that can `cat` a file. No prod build sees these endpoints.
function telemetryPlugin(): Plugin {
  const ROOT = resolve(import.meta.dirname ?? __dirname, 'telemetry');
  const RUNS = resolve(ROOT, 'runs');
  return {
    name: 'space-warrior-telemetry',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__telemetry/')) return next();
        if (req.method !== 'POST') return next();
        try {
          if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true });
          if (!existsSync(RUNS)) mkdirSync(RUNS, { recursive: true });
          const chunks: Buffer[] = [];
          for await (const ch of req) chunks.push(ch as Buffer);
          const body = Buffer.concat(chunks).toString('utf8');
          if (req.url === '/__telemetry/current') {
            writeFileSync(resolve(ROOT, 'current-run.json'), body, 'utf8');
          } else if (req.url === '/__telemetry/snapshot') {
            // Server picks the filename — derive a slug from runId + result.
            let slug = `run-${Date.now()}`;
            try {
              const parsed = JSON.parse(body) as { runId?: string; result?: string; level?: number };
              const safeId = (parsed.runId ?? '').replace(/[^a-z0-9-]/gi, '');
              const safeRes = (parsed.result ?? 'snap').replace(/[^a-z0-9-]/gi, '');
              const lvl = typeof parsed.level === 'number' ? `-lvl${parsed.level}` : '';
              if (safeId) slug = `run-${safeId}${lvl}-${safeRes}`;
            } catch { /* malformed JSON — keep timestamp slug */ }
            writeFileSync(resolve(RUNS, `${slug}.json`), body, 'utf8');
          } else {
            return next();
          }
          res.statusCode = 204;
          res.end();
        } catch (e) {
          res.statusCode = 500;
          res.end(`telemetry write failed: ${(e as Error).message}`);
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  plugins: SINGLE ? [viteSingleFile()] : [telemetryPlugin()],
  build: {
    target: 'es2022',
    sourcemap: !SINGLE,
    // For single-file build, inline everything and avoid asset splitting.
    assetsInlineLimit: SINGLE ? 100_000_000 : 4096,
    cssCodeSplit: !SINGLE,
    rollupOptions: SINGLE ? { output: { inlineDynamicImports: true } } : {},
  },
});
