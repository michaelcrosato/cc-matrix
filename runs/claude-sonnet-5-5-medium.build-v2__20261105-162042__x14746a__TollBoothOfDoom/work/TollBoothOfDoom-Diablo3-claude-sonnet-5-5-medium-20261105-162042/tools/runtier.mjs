// tiny runner: node tools/runtier.mjs tests/sim/zones.mjs
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const fails = []; let count = 0;
const t = { fail: (m) => { fails.push(m); }, ok: (c, m) => { count++; if (!c) fails.push(m); } };
for (const f of process.argv.slice(2)) { const m = await import(pathToFileURL(resolve(f)).href); await m.run(t); }
for (const f of fails.slice(0, 40)) console.log('FAIL', f);
console.log(`${fails.length} failures, ${count} checks`);
process.exit(fails.length ? 1 : 0);
