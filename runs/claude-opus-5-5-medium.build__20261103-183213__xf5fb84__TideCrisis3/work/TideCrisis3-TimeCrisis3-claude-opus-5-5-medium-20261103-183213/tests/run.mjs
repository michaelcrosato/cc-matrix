// THE test command: node tests/run.mjs [suite ...] [--playthrough] [--browser] [--hub] [--all]
// Loads the engine and build/game.js into a fresh vm context per suite (headless: draw is skipped), runs the suites,
// and prints only failures and one count line. Rebuilds build/game.js first when a src file is newer.
import vm from 'node:vm';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), names = args.filter(a => !a.startsWith('--'));
const built = existsSync(root + 'build/game.js') ? statSync(root + 'build/game.js').mtimeMs : 0;
const newest = Math.max(...readdirSync(root + 'src').map(f => statSync(root + 'src/' + f).mtimeMs));
if (newest > built) execFileSync('node', [root + 'tools/build.mjs', '--js']);
const ENGINE = readFileSync(root + 'engine/my-3d2dge.js', 'utf8'), GAME = readFileSync(root + 'build/game.js', 'utf8');
let passed = 0, failed = 0; const t0 = Date.now();
function load(o = {}) {
  const logs = [];
  const ctx = { console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')), info() {} }, setTimeout, clearTimeout };
  vm.createContext(ctx); vm.runInContext(ENGINE, ctx, { filename: 'engine.js' }); vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, TC = E.TC;
  return { E, game, TC, logs, debug: game.debug, step: s => game.advance(s), ctx };
}
const fast = ['core', 'content', 'cover', 'weapons', 'threats', 'enemies', 'scoring', 'timer', 'objects', 'bosses', 'story', 'audio', 'input', 'ui', 'dev', 'attract', 'coop', 'net', 'determinism', 'build'];
const slow = ['playthrough'];
let suites = names.length ? names : fast.slice();
if (flags.has('--playthrough') || flags.has('--all')) suites = suites.concat(names.length ? [] : slow);
for (const name of suites) {
  const file = root + 'tests/' + name + '.test.mjs'; if (!existsSync(file)) { console.log('FAIL ' + name + ': no such suite'); failed++; continue; }
  const mod = await import(file);
  const t = { load, root, check(what, ok, detail = '') { if (ok) passed++; else { failed++; console.log('FAIL ' + name + ' › ' + what + (detail ? ': ' + String(detail).slice(0, 400) : '')); } } };
  try { await mod.default(t); } catch (e) { failed++; console.log('FAIL ' + name + ' › threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)); }
}
for (const f of ['--browser', '--hub']) if (flags.has(f) || flags.has('--all')) {
  try { const out = execFileSync('node', [root + 'tools/' + (f === '--browser' ? 'browsercheck.mjs' : 'hubcheck.mjs')], { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: root + '.tmp' }) }); for (const l of out.split('\n')) { if (l.startsWith('FAIL')) { failed++; console.log(l); } else if (l.startsWith('PASS')) passed++; } }
  catch (e) { failed++; console.log('FAIL ' + f + ': ' + String(e.stdout || e.message).slice(0, 600)); }
}
console.log(`${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
