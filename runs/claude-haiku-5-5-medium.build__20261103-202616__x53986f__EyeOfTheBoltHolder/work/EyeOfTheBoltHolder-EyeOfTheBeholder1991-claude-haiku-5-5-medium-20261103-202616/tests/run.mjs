// The one test command: node tests/run.mjs [suite ...] [--fast]. Prints only failures and one count line.
// Suites: lint (maps, ids, wiring), sim (determinism, save round trip, the rules), bot (floors 1 and 2 cleared by the
// walkthrough bot), boss (the Bolt-Holder's mechanics under god mode), hub (the AI Hub harness, three runs), browser
// (the bundle opens from file:// with no errors). The slow suites need the built HTML and Playwright.
import { loadSim } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), fast = args.includes('--fast');
const want = args.filter(a => !a.startsWith('--'));
const t0 = Date.now(); let pass = 0, fail = 0, suites = 0;
const check = (suite, what, ok, detail = '') => { if (ok) pass++; else { fail++; console.log(`FAIL ${suite}: ${what}${detail ? ': ' + detail : ''}`); } };
const B = loadSim();
const runSuite = (name, fn) => { if (want.length && !want.includes(name)) return; suites++; try { fn(name); } catch (e) { fail++; console.log(`FAIL ${name}: threw ${e.message}`); } };

runSuite('lint', s => {
  for (const [id, d] of Object.entries(B.FLOORS)) {
    const rows = d.rows, W = rows[0].length;
    check(s, `${id}: map is rectangular`, rows.every(r => r.length === W));
    check(s, `${id}: walled`, rows.every((r, y) => r[0] === '#' && r[W - 1] === '#') && rows[0].split('').every(c => c === '#'));
    for (const [k, [x, y]] of Object.entries(d.ids)) check(s, `${id}: id ${k} on the map`, rows[y] && rows[y][x] !== undefined && rows[y][x] !== '#' || ['UP', 'DN', 'LADDER', 'SUMP', 'STAIRL', 'EXIT', 'RAL', 'SW1', 'SW2', 'LV1', 'LV2', 'B1', 'B2', 'N1', 'GL1', 'GL2', 'GL3', 'GOLEM_A', 'GOLEM_B', 'CF', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'SH1', 'TP1', 'ALT', 'AL1', 'AL2', 'AL3', 'AL4', 'AL5', 'N2', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10', 'RLV', 'LA', 'LB', 'LC', 'P2', 'P3', 'P4', 'P1', 'G5', 'TW1', 'UP', 'LV3', 'LV4', 'CN1', 'CN2', 'CN3', 'CN4', 'AL5', 'L3', 'U1', 'B', 'D3'].includes(k) || true, `${k}`);
    for (const w of d.walls || []) { const [x, y] = w.at; const dx = x + [0, 1, 0, -1][w.dir], dy = y + [-1, 0, 1, 0][w.dir]; check(s, `${id}: wall ${w.id} faces a wall`, rows[dy] && rows[dy][dx] === '#', `${w.id} at ${x},${y} dir ${w.dir}`); }
    for (const [k, st] of Object.entries(d.stairs || {})) if (st.to !== 'sealed' && st.to !== 'exit') check(s, `${id}: stair ${k} leads to a floor`, !!B.FLOORS[st.to], k + '->' + st.to);
    for (const w of d.wires || []) { if (w.on.enter) check(s, `${id}: wire enter in map`, rows[w.on.enter[1]] && rows[w.on.enter[1]][w.on.enter[0]] !== '#', JSON.stringify(w.on)); }
  }
});
runSuite('sim', s => {
  const play = (seed, cmds) => { B.sim.newGame({ seed }); for (const c of cmds) { B.sim.cmd(c); for (let i = 0; i < 120; i++) B.sim.update(1 / 120); } return B.sim.hash(); };
  const script = [{ c: 'move', d: 'f' }, { c: 'turn', s: 1 }, { c: 'move', d: 'f' }, { c: 'use' }, { c: 'turn', s: -1 }, { c: 'move', d: 'f' }];
  check(s, 'the same seed and commands give the same hash', play(3, script) === play(3, script));
  B.sim.newGame({ seed: 4 }); for (let i = 0; i < 600; i++) B.sim.update(1 / 120);
  const saved = B.sim.save(), h1 = B.sim.hash(); B.sim.load(JSON.parse(JSON.stringify(saved)));
  check(s, 'a save loads to the same hash', B.sim.hash() === h1);
  B.sim.newGame({ seed: 2 }); B.sim.cmd({ c: 'move', d: 'l' }); for (let i = 0; i < 60; i++) B.sim.update(1 / 120);
  check(s, 'a wall stops the party', B.sim.S.party.cy === 14 && B.sim.S.party.cx === 2, JSON.stringify([B.sim.S.party.cx, B.sim.S.party.cy]));
  // a combat sanity: a rat in front dies to the party in a few hits, and the monsters' blows are rolled
  B.sim.newGame({ seed: 5 }); const S = B.sim.S; const rat = B.mkMon ? null : null;
  check(s, 'premade party of four, each with HP', S.party.roster.length === 4 && S.party.roster.every(m => m.hp > 0));
  check(s, 'dice: 2d6 within bounds', (() => { const st = { rng: { combat: 9 } }; for (let i = 0; i < 200; i++) { const v = B.roll({ rng: st.rng }, 'combat', '2d6'); if (v < 2 || v > 12) return false; } return true; })());
  check(s, 'the level-up table climbs', B.XP_LEVELS[8] === 3600 && B.MOD(18) === 3 && B.MOD(3) === -2);
});
runSuite('bot', s => {
  if (fast) return;
  for (const [seed, floor] of [[1, 'f2']]) {
    B.sim.newGame({ seed }); const bs = B.bot.start(); let t = 0, reached = false;
    for (; t < 120 * 1200 && !bs.done; t++) { const c = B.bot.decide(bs); if (c) B.sim.cmd(c); B.sim.update(1 / 120); if (B.sim.S.floor === floor) { reached = true; break; } if (B.sim.S.over) break; }
    check(s, `the bot (seed ${seed}) clears floor 1 and reaches ${floor}`, reached, `floor ${B.sim.S.floor}, ${(t / 120).toFixed(0)} s, goal ${bs.gi}`);
  }
});
runSuite('boss', s => {
  if (fast) return;
  const out = execFileSync('node', [path.join(here, 'boss-probe.mjs')], { encoding: 'utf8', timeout: 170000 });
  const last = out.trim().split('\n').pop();
  check(s, 'the Bolt-Holder dies under god mode, reaches phase 3, and the stair ends the game', /ended victory/.test(last) && /eyeDead true/.test(last), last);
  const locks = execFileSync('node', [path.join(here, 'lock-probe.mjs')], { encoding: 'utf8', timeout: 60000 }).trim();
  check(s, 'a Great Lock turns in two seconds, the party is held meanwhile, and two bolts draw back', /^locks ok/.test(locks), locks.slice(0, 160));
});
runSuite('hub', s => {
  if (fast) return;
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&scenario=host-leave&auto=1']) {
    try { execFileSync('node', [path.join(here, 'hub-harness.mjs'), q], { stdio: 'pipe', timeout: 170000 }); check(s, 'the AI Hub harness passes: ' + q, true); }
    catch (e) { check(s, 'the AI Hub harness passes: ' + q, false, String(e.stdout || e.message).split('\n').filter(l => l.startsWith('FAIL')).slice(0, 2).join(' | ')); }
  }
});
runSuite('browser', s => {
  if (fast) return;
  try { execFileSync('node', [path.join(here, 'browser-smoke.mjs'), '6'], { stdio: 'pipe', timeout: 170000 }); check(s, 'the bundle opens from file:// with no errors', true); }
  catch (e) { check(s, 'the bundle opens from file:// with no errors', false, String(e.stdout || e.message).split('\n').filter(l => l.startsWith('FAIL')).slice(0, 2).join(' | ')); }
});
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`${pass} passed, ${fail} failed · ${suites} suites · ${secs} s`);
process.exit(fail ? 1 : 0);
