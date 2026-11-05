// WIRETAP headless tests: the engine and the bundled game script in a Node vm, on the engine's fixed-step clock.
// node tests/headless.mjs [name ...]   (prints one line per check; exit 1 on a failure)
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const ctx = { console, setTimeout, clearTimeout };
ctx.window = ctx; ctx.addEventListener = () => {}; ctx.location = { hash: '', search: '', pathname: '/wiretap' };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', here), 'utf8'), ctx, { filename: 'engine.js' });
vm.runInContext(readFileSync(new URL('.game.js', here), 'utf8'), ctx, { filename: 'game.js' });
const W = ctx.__wiretap, game = W.game, I = game.input, snap = () => game.debug.snapshot();
let failed = 0; const only = process.argv.slice(2);
const check = (what, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + String(detail).slice(0, 400))); if (!ok) failed++; };
const run = (name, fn) => { if (only.length && !only.includes(name)) return; try { fn(); } catch (e) { check(name, false, e.stack); } };
game.advance(.5);
run('boot', () => { check('boot reaches the title', snap().scene === 'title', JSON.stringify(snap())); check('no errors at boot', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | ')); });
globalThis.__t = { ctx, game, I, snap, check, run, W };
const extra = new URL('./suite.mjs', here);
try { const m = await import(extra); await m.default(globalThis.__t); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') check('suite', false, e.stack); }
console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);
