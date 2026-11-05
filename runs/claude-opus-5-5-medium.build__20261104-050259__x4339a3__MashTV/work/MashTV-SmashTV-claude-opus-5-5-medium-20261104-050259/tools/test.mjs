// MASH TV tests: one command. Prints only failing checks and a one-line count. --only a,b  --no-browser
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), t0 = Date.now();
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null, noBrowser = args.includes('--no-browser');
execFileSync(process.execPath, [join(DEV, 'tools/build.mjs')], { stdio: 'inherit' });
const ORDER = ['core', 'input', 'contestant', 'weapons', 'economy', 'ratings', 'enemies', 'rooms', 'room-sweep', 'bosses', 'playthrough', 'ui', 'dev', 'attract', 'touch', 'audio', 'net', 'proof', 'browser', 'hub'];
const BROWSER = new Set(['browser', 'hub']);
const files = readdirSync(join(DEV, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => f.replace('.test.mjs', ''));
let pass = 0, fail = 0;
for (const name of ORDER.filter(n => files.includes(n))) {
  if (only && !only.includes(name)) continue;
  if (noBrowser && BROWSER.has(name)) continue;
  try {
    const mod = await import(pathToFileURL(join(DEV, 'tests', name + '.test.mjs')).href);
    const res = await mod.default();
    pass += res.pass; fail += res.fail; for (const m of res.msgs) console.log(m);
  } catch (e) { fail++; console.log(`${name} › crashed: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
}
const s = Math.round((Date.now() - t0) / 1000);
console.log(`MASH TV tests: ${pass} passed, ${fail} failed (${Math.floor(s / 60)}m ${s % 60}s)`);
process.exit(fail ? 1 : 0);
