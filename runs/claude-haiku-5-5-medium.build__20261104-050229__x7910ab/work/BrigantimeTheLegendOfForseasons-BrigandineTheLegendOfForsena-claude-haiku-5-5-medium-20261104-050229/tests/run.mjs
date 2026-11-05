// The one test command: node tests/run.mjs (add --browser to also run the five browser playthroughs). It loads the engine and the built game (dist/game.js, run tools/build.mjs
// first) into a Node VM with no screen, runs every suite t-*.mjs, and prints only the failures and one count line.
// Exit code 1 on any failure. Each suite exports run({ check, G, E, game }) and may be async.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEV = dirname(dirname(fileURLToPath(import.meta.url)));
const ctx = { console, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const f of [join(DEV, 'engine', 'my-3d2dge.js'), join(DEV, 'dist', 'game.js')]) {
  vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
}
const E = ctx.My3D2dge, G = E.Brigantime;
let pass = 0, fail = 0;
const check = (what, ok, detail = '') => {
  if (ok) { pass++; return; }
  fail++;
  console.log('FAIL ' + what + (detail ? ': ' + detail : ''));
};
const suites = readdirSync(join(DEV, 'tests')).filter(f => /^t-.*\.mjs$/.test(f)).sort();
for (const f of suites) {
  try {
    const mod = await import(pathToFileURL(join(DEV, 'tests', f)).href);
    await mod.run({ check, G, E, ctx });
    for (const extra of ['runTargets', 'runMarch', 'runSaves', 'runHotSeat']) if (mod[extra]) await mod[extra]({ check, G, E, ctx });
  } catch (err) {
    fail++;
    console.log('FAIL ' + f + ' threw: ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err));
  }
}
console.log(`${pass + fail} checks, ${fail} failed, ${pass} passed${fail ? '' : ' (all green)'}`);
if (process.argv.includes('--browser')) {
  // the single file one level up is the deliverable; the playthroughs load it from file://
  const html = join(DEV, '..', 'BrigantimeTheLegendOfForseasons-BrigandineTheLegendOfForsena-claude-haiku-5-5-medium-20261104-050229.html');
  const r = spawnSync('python3', ['-u', join(DEV, 'tests', 'browser_playthroughs.py'), html], { encoding: 'utf8', timeout: 3600000 });
  process.stdout.write(r.stdout || '');
  if (r.status !== 0) { process.stdout.write((r.stderr || '').split('\n').slice(-5).join('\n') + '\n'); fail++; }
}
process.exit(fail ? 1 : 0);
