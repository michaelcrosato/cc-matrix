// Shared by the build and the tests: the script order, and the game's source as one script.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const manifest = JSON.parse(readFileSync(join(ROOT, 'build/manifest.json'), 'utf8'));
export const read = f => readFileSync(join(ROOT, f), 'utf8');
/** the game's files in one IIFE (they share one scope), with a table of where each file starts */
export function gameSource() {
  const parts = [], map = []; let line = 3;
  for (const f of manifest.src) { const s = read(f); map.push([line, f]); parts.push('/* ===== ' + f + ' ===== */\n' + s); line += s.split('\n').length + 1; }
  const rep = existsSync(join(ROOT, 'report.json')) ? readFileSync(join(ROOT, 'report.json'), 'utf8') : 'null';
  return { code: '(() => {\n\'use strict\'; const __REPORT__ = ' + rep.replace(/\n/g, ' ') + ';\n' + parts.join('\n') + '\n})();\n', map };
}
/** a line of the joined source -> file:line */
export function where(map, n) { let f = map[0]; for (const m of map) if (m[0] <= n) f = m; return f[1] + ':' + (n - f[0]); }
export const engineFiles = () => manifest.engine.map(f => [f, read(f)]);
