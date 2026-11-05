// run.mjs — THE test command. node tests/run.mjs [suite …] [--playthrough] [--browser] [--hub] [--all]
// Prints only FAIL lines and one summary line. Rebuilds build/game.js first when src/ is newer.
import { statSync, readdirSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { dirname, join, resolve } from 'node:path';
import { T, root } from './harness.mjs';
const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), names = args.filter(a => !a.startsWith('--')), all = flags.has('--all');
const t0 = Date.now(); let n = 0; const fails = [];
const newest = Math.max(...readdirSync(join(root, 'src')).map(f => statSync(join(root, 'src', f)).mtimeMs)); let built = 0; try { built = statSync(join(root, 'build/game.js')).mtimeMs; } catch (e) { }
if (newest > built || flags.has('--build')) execFileSync('node', [join(root, 'tools/build.mjs')], { stdio: 'ignore' });
const { suites } = await import('./suites.mjs'); const { playthrough } = await import('./playthrough.mjs');
const chosen = names.length ? names : Object.keys(suites);
for (const name of (flags.has('--playthrough') && !all ? [] : chosen)) { const s = suites[name]; if (!s) { fails.push('FAIL runner: no suite ' + name); continue; } const t = new T(name); try { await s(t); } catch (e) { t.fails.push('FAIL ' + name + ' › threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); } n += t.n; fails.push(...t.fails); }
if (flags.has('--playthrough') || all) { const t = new T('playthrough'); try { await playthrough(t); } catch (e) { t.fails.push('FAIL playthrough › threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); } n += t.n; fails.push(...t.fails); }
if (flags.has('--hub') || all) { try { execFileSync('node', [join(root, 'tools/hubcheck.mjs')], { stdio: 'pipe', env: Object.assign({}, process.env, { TMPDIR: join(root, '.tmp') }) }); n += 4; } catch (e) { n += 4; fails.push('FAIL hub › ' + String(e.stdout || e.message).trim().split('\n').slice(0, 6).join(' / ')); } }
if (flags.has('--browser') || all) { try { const out = execFileSync('node', [join(root, 'tools/check.mjs'), join(root, '..', 'TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303.html'), '--seconds', '4'], { stdio: 'pipe', env: Object.assign({}, process.env, { TMPDIR: join(root, '.tmp') }) }); n++; } catch (e) { n++; fails.push('FAIL browser › ' + String(e.stdout || e.message).split('\n').filter(l => /error|Error/.test(l)).slice(0, 4).join(' / ')); } }
for (const f of fails) console.log(f);
console.log(`${n - fails.length} passed, ${fails.length} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(fails.length ? 1 : 0);
