// THE test command. node tests/run.mjs [suite ...] [--playthrough] [--browser (with e2e)] [--e2e] [--hub] [--all]
// Prints only failures ("FAIL suite › check: detail") and one line: "N passed, M failed (T s)". Exit code 1 on failure.
import vm from 'node:vm';
import { readFileSync, statSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url), at = p => new URL(p, root);
const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), pick = args.filter(a => !a.startsWith('--'));
// rebuild build/game.js when a fragment is newer
const built = (() => { try { return statSync(at('build/game.js')).mtimeMs; } catch (e) { return 0; } })();
if (readdirSync(at('src')).some(f => statSync(at('src/' + f)).mtimeMs > built)) execFileSync('node', [new URL('tools/build.mjs', root).pathname, '--js-only']);
const ENGINE = readFileSync(at('engine/my-3d2dge.js'), 'utf8'), GAME = readFileSync(at('build/game.js'), 'utf8');
let passed = 0, failed = 0; const t0 = Date.now(), results = [];   // every check, for tests/last-run.txt and the requirements trace
/** a fresh headless engine + game in its own context */
function load(o = {}) {
  const ctx = { console: { log() {}, warn() {}, error: (...a) => o.errors && o.errors.push(a.join(' ')) }, setTimeout, clearTimeout, TC_NO_BOOT: !o.boot };
  vm.createContext(ctx); vm.runInContext(ENGINE, ctx); vm.runInContext(GAME, ctx);
  return { ctx, E: ctx.My3D2dge, TC: ctx.TC, game: ctx.TC.game };
}
function makeT(suite) {
  return {
    check(name, ok, detail = '') { results.push([suite + ' › ' + name, !!ok]); if (ok) passed++; else { failed++; console.log('FAIL ' + suite + ' › ' + name + (detail ? ': ' + detail : '')); } },
    load,
    /** a Sim, stepped by the given command function; returns the sim */
    sim(TC, o) { return new TC.Sim(Object.assign({ mode: 'stage', stage: 1, seed: 7, skipIntro: true }, o)); },
    step(sim, secs, cmd) { const n = Math.round(secs * 120); for (let i = 0; i < n; i++) sim.step(1 / 120, typeof cmd === 'function' ? cmd(sim, i) : cmd || []); },
    root, at
  };
}
const suites = {};
const mods = ['core', 'gameplay', 'content', 'ui', 'net'];
for (const m of mods) Object.assign(suites, (await import(new URL('./' + m + '.suite.mjs', import.meta.url))).default);
const slow = { playthrough: (await import('./playthrough.suite.mjs')).default, browser: (await import('./browser.suite.mjs')).default.browser, e2e: (await import('./e2e.suite.mjs')).default, hub: (await import('./browser.suite.mjs')).default.hub };
const run = pick.length ? pick : Object.keys(suites);
for (const name of run) {
  const s = suites[name] || slow[name]; if (!s) { console.log('FAIL runner › unknown suite ' + name); failed++; continue; }
  try { await s(makeT(name)); } catch (e) { failed++; console.log('FAIL ' + name + ' › threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
}
for (const f of ['playthrough', 'browser', 'e2e', 'hub']) if ((flags.has('--' + f) || flags.has('--all') || (f === 'e2e' && flags.has('--browser'))) && !pick.includes(f)) { try { await slow[f](makeT(f)); } catch (e) { failed++; console.log('FAIL ' + f + ' › threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); } }
// the requirements trace (with --all): every check tests/REQUIREMENTS.md names for a TASK.md item must have passed in this
// run ("name*" matches every check that starts with name)
if (flags.has('--all')) {
  const T = makeT('requirements'), md = readFileSync(at('tests/REQUIREMENTS.md'), 'utf8');
  for (const m of md.matchAll(/^\s*- `([^`]+ › [^`]+)`/gm)) {
    const ref = m[1], pre = ref.endsWith('*'), key = pre ? ref.slice(0, -1) : ref, hit = results.filter(([n]) => pre ? n.startsWith(key) : n === key);
    T.check(ref, hit.length > 0 && hit.every(([, ok]) => ok), hit.length ? hit.filter(([, ok]) => !ok).length + ' of ' + hit.length + ' failed' : 'no such check in this run');
  }
}
// every result, with what was tested, for anyone checking a claim against this run
const NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153', sha = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16) : '-';
const bundle = new URL('../' + NAME + '.html', root), exitJ = new URL('../exit-interview.json', root);
writeFileSync(at('tests/last-run.txt'), ['run: node tests/run.mjs ' + args.join(' '), 'finished: ' + new Date().toString(), 'bundle sha256: ' + sha(bundle) + '  (modified ' + statSync(bundle).mtime.toString() + ')', 'exit-interview.json sha256: ' + sha(exitJ) + '  (modified ' + statSync(exitJ).mtime.toString() + ')', passed + ' passed, ' + failed + ' failed', ''].concat(results.map(([n, ok]) => (ok ? 'PASS ' : 'FAIL ') + n)).join('\n') + '\n');
console.log(passed + ' passed, ' + failed + ' failed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(failed ? 1 : 0);
