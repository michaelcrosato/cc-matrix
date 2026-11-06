import { spawnSync } from 'node:child_process'; import { resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const G = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const r = spawnSync('node', ['kit/check.mjs', '--sheets', 'src/art/models.js'], { cwd: G, encoding: 'utf8' }); const out = r.stdout + r.stderr;
console.log((r.status === 0 ? 'sheets: 1 checks, 0 failures' : 'FAIL sheets exit ' + r.status + '\n' + out.slice(0, 400) + '\nsheets: 1 checks, 1 failures'));
