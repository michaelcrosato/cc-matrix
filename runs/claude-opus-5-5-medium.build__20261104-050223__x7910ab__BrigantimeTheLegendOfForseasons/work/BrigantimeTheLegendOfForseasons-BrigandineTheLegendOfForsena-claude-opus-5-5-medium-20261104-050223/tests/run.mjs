// The one test command: node tests/run.mjs [suite ...]. Loads the engine, engine-ext and dist/game.js into a vm context
// (headless E.Game), runs each suite t-<name>.mjs, prints only failures and one count line; exit 1 on a failure.
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
execSync('node tools/build.mjs', { cwd: new URL('.', here), stdio: 'inherit' });
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const suites = readdirSync(new URL('tests/', here)).filter(f => /^t-.*\.mjs$/.test(f)).map(f => f.slice(2, -4)).filter(n => !want.length || want.includes(n));
export function boot(hash = '') {
  const errors = [];
  const ctx = { console: { log() {}, info() {}, warn() {}, error: (...a) => errors.push(a.join(' ')) }, addEventListener() {}, removeEventListener() {}, location: { hash, search: '' }, setTimeout, clearTimeout, setInterval, clearInterval };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) if (existsSync(new URL(f, here))) vm.runInContext(rd(f), ctx, { filename: f });
  return { ctx, E: ctx.My3D2dge, G: ctx.__G, game: ctx.My3D2dge.current, errors };
}
let pass = 0, fail = 0; const t0 = Date.now();
for (const s of suites) {
  const mod = await import(new URL('tests/t-' + s + '.mjs', here));
  const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error('returned false'); pass++; if (process.env.LIST) console.log('ok   ' + s + ' › ' + name); } catch (e) { fail++; console.log(s + ' › ' + name + ': ' + (e && e.message || e).toString().split('\n')[0].slice(0, 300)); } };
  try { await mod.default({ boot, t, rd }); } catch (e) { fail++; console.log(s + ' › (suite): ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); }
}
if (process.argv.includes('--browser')) { try { execSync('node tests/browser.mjs', { cwd: new URL('.', here), stdio: 'pipe', env: Object.assign({}, process.env, { TMPDIR: new URL('.tmp', here).pathname }) }); pass += 7; } catch (e) { fail++; console.log(String(e.stdout || e.message).trim()); } }
console.log(`${pass} passed, ${fail} failed (${suites.length} suites${process.argv.includes('--browser') ? ' + browser' : ''}, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
