// dist/: one ESM module plus .d.ts per source file, then the browser bundles in dist/browser.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

rmSync('dist', { recursive: true, force: true });
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { stdio: 'inherit' });

// tsc rewrites .ts specifiers in emitted JS but not in declarations, which would point consumers at files we do not ship.
let fixed = 0;
for (const f of readdirSync('dist').filter((n) => n.endsWith('.d.ts'))) {
  const src = readFileSync(`dist/${f}`, 'utf8');
  const out = src.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
  if (out !== src) { writeFileSync(`dist/${f}`, out); fixed++; }
}
const left = readdirSync('dist').filter((n) => n.endsWith('.d.ts') && /from\s+['"]\.{1,2}\/[^'"]+\.ts['"]/.test(readFileSync(`dist/${n}`, 'utf8')));
if (left.length) { console.error(`.ts specifiers left in ${left.join(', ')}`); process.exit(1); }
console.log(`dist: ${readdirSync('dist').filter((n) => n.endsWith('.js')).length} modules, ${fixed} declaration files rewritten`);

await import('./build-browser.mjs');
