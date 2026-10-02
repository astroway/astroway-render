// Browser build: one ESM bundle of the whole package plus one per renderer, minified, with raw and gzip sizes.
// platform 'browser' makes any node: import a build error; the globals check catches Buffer/process use.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';

const ENTRIES = {
  index: 'src/index.ts',
  'wheel-western': 'src/wheel-western.ts',
  'wheel-western-pro': 'src/wheel-western-pro.ts',
  'wheel-vedic': 'src/wheel-vedic.ts',
  'aspect-grid': 'src/aspect-grid.ts',
  cosmogram: 'src/cosmogram.ts',
  'moon-phase': 'src/moon-phase.ts',
  timeline: 'src/timeline.ts',
  biorhythm: 'src/biorhythm.ts',
  'eclipse-path': 'src/eclipse-path.ts',
  'star-map': 'src/star-map.ts',
};

await build({
  entryPoints: ENTRIES,
  outdir: 'dist/browser',
  bundle: true,
  splitting: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
});

const NODE_GLOBALS = /\b(Buffer|process|require|__dirname|__filename|global)\s*[.(\[]/;
let failed = false;
console.log('file'.padEnd(26), 'raw'.padStart(8), 'gzip'.padStart(8));
for (const f of readdirSync('dist/browser').filter((n) => n.endsWith('.js')).sort()) {
  const code = readFileSync(`dist/browser/${f}`);
  const hit = NODE_GLOBALS.exec(code.toString('utf8'));
  if (hit) { failed = true; console.error(`${f}: Node global "${hit[1]}"`); }
  console.log(f.padEnd(26), String(code.length).padStart(8), String(gzipSync(code, { level: 9 }).length).padStart(8));
}
if (failed) process.exit(1);
