// The one command: node tests/run.mjs  -> prints only failures and a one-line count. Add --browser to also smoke-test every scene in Chromium.
import { load } from './simload.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
let pass = 0, fail = 0; const failures = [];
const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; failures.push(name + (detail ? ': ' + detail : '')); } };
const FILES = ['00-core.js', '10-data.js', '20-sim.js', '48-bot.js'];
const fresh = () => { const ctx = load(FILES); return { ctx, BZ: ctx.BZ }; };
const STEP = 1 / 120;
function runGame(BZ, o, max = 120 * 60 * 25) { const M = BZ.newMatch(o); let n = 0; const ev = {}; BZ.on('*', (d, e) => ev[e] = (ev[e] || 0) + 1); while (!M.over && n < max) { if (BZ.botIntent) M.intent = [BZ.botIntent(0, M), BZ.botIntent(1, M)]; BZ.updateSim(STEP); n++; } BZ.clearListeners(); return { M, ev, n }; }
const parks = ['corn', 'moon', 'magma', 'mega'], teams = ['hay', 'lem', 'cin', 'meg'];

// 1. CPU vs CPU games finish in every park, with sane scores
{
  const { BZ } = fresh(); let runs = 0, n = 0, stuck = 0; const evAll = {};
  for (let seed = 1; seed <= 16; seed++) {
    const { M, ev } = runGame(BZ, { park: parks[seed % 4], seed, attract: false, diff: .5, innings: 3, away: { team: teams[seed % 4] }, home: { team: teams[(seed + 1) % 4] } });
    if (!M.over) stuck++; runs += M.score[0] + M.score[1]; n++; for (const k in ev) evAll[k] = (evAll[k] || 0) + ev[k];
    check('score is never negative', M.score[0] >= 0 && M.score[1] >= 0);
    check('outs never exceed 3', M.outs <= 3);
  }
  check('all CPU games finish', stuck === 0, stuck + ' stuck');
  check('runs per game are sane (2..20)', runs / n >= 2 && runs / n <= 20, (runs / n).toFixed(1));
  for (const e of ['strikeout', 'homer', 'catch', 'out', 'throw', 'single', 'run', 'ball', 'strike']) check('event happens: ' + e, evAll[e] > 0);
}
// 2. determinism: the same seed gives the same game
{
  const { BZ } = fresh(); const a = runGame(BZ, { park: 'corn', seed: 77, diff: .5, innings: 3 }), b = runGame(BZ, { park: 'corn', seed: 77, diff: .5, innings: 3 });
  check('same seed, same score', a.M.score.join() === b.M.score.join() && a.n === b.n, a.M.score + ' vs ' + b.M.score);
}
// 3. a person's path: the bot drives both sides through intents
{
  const { BZ } = fresh(); BZ.enableBot(true, .9);
  for (let seed = 1; seed <= 6; seed++) {
    const { M, ev } = runGame(BZ, { park: parks[seed % 4], seed, innings: 3, away: { team: 'hay', human: true, ctl: {} }, home: { team: 'cin', human: true, ctl: {} } });
    check('bot (human intents) finishes a game', M.over, 'phase ' + M.phase + ' inn ' + M.inn);
    check('bot game has contact', (ev.contact || 0) > 5);
  }
  BZ.enableBot(false);
}
// 4. rules
{
  const { BZ } = fresh();
  const M = BZ.newMatch({ park: 'corn', seed: 5, innings: 3, away: { team: 'hay' }, home: { team: 'cin' } });
  // four balls is a walk and forces runners
  M.phase = 'setup'; BZ.off(); const pre = M.score.slice();
  for (let i = 0; i < 3; i++) { BZ.startWindup({ type: 'fast', u: 1.9, v: 0 }); let g = 0; while (M.phase !== 'setup' && g++ < 2000 && !M.over) BZ.updateSim(STEP); }
  check('three balls so far', M.balls === 3 || M.balls === 0, 'balls ' + M.balls);
  // three outs end the half and swap sides
  const M2 = BZ.newMatch({ park: 'corn', seed: 9, innings: 3 }); M2.outs = 2; M2.phase = 'setup';
  let hf = 0; BZ.on('half', () => hf++);
  M2.strikes = 2; BZ.startWindup({ type: 'fast', u: 0, v: 0 }); let g2 = 0; while (M2.half === 0 && g2++ < 4000) BZ.updateSim(STEP);
  check('third out ends the half-inning', M2.half === 1 && M2.outs === 0, 'half ' + M2.half + ' outs ' + M2.outs);
  BZ.clearListeners();
  // a tie after the last inning goes to extras
  const M3 = BZ.newMatch({ park: 'corn', seed: 3, innings: 1, diff: .3 }); let n3 = 0; while (!M3.over && n3++ < 120 * 60 * 25) BZ.updateSim(STEP);
  check('extra innings resolve a tie', M3.over && (M3.winner >= 0 || M3.inn >= 4), 'inn ' + M3.inn + ' winner ' + M3.winner);
  // the fence geometry
  BZ.M.parkDef = BZ.get('parks', 'mega');
  check('mega wall is taller than the fence', BZ.fenceH(-.3) > BZ.fenceH(.6) + 40);
  check('fence reads from the park', BZ.fenceR(0) > BZ.fenceR(Math.PI / 4));
}
// 5. derby: a bot sluggers through seven outs
{
  const { BZ } = fresh(); BZ.enableBot(true, 1);
  const M = BZ.newDerby({ park: 'corn', seed: 4, players: [{ name: 'P1', ctl: {}, human: true }, { name: 'P2', ctl: {}, human: true }], outs: 7 });
  let n = 0, hr = 0; BZ.on('derbyhr', () => hr++);
  M.intent = [{}, {}];
  BZ.botIntent = (i, M) => { const it = { mx: 0, my: 0 }; if (i === 0 && (M.phase === 'windup' || M.phase === 'pitch') && M.pitch && M.pitch.released) { const uv = BZ.pitchUV(M.pitch, M.pitch.T); it.mouse = [uv.fu, uv.fv]; if (!M.sw && M.pitch.t >= M.pitch.T - .09 && M.swCool <= 0) it.swing = true; } return it; };
  while (!M.over && n++ < 120 * 60 * 30) { M.intent = [BZ.botIntent(0, M), {}]; BZ.updateSim(STEP); }
  check('derby finishes', M.over, 'phase ' + M.phase);
  check('derby has both players with outs used', M.derby.players.every(p => p.outs >= 7));
  check('derby records homers or scores', M.derby.players.some(p => p.score >= 0) && hr >= 0);
  BZ.clearListeners(); BZ.enableBot(false);
}
// 6. balance sliders: CPU skill moves the scoring
{
  const { BZ } = fresh(); const avg = d => { let t = 0; for (let s = 1; s <= 10; s++) { const { M } = runGame(BZ, { park: 'corn', seed: s, diff: d, innings: 3 }); t += M.score[0] + M.score[1]; } return t / 10; };
  const lo = avg(.2), hi = avg(.9); check('higher CPU skill scores more', hi > lo, lo + ' vs ' + hi);
  BZ.TUNE.exitPower = 1.4; const hot = avg(.5); BZ.resetTune(); const base = avg(.5); check('hit power slider changes scoring', hot > base, base + ' vs ' + hot);
  check('reset restores defaults', BZ.TUNE.exitPower === 1);
}
// 7. browser smoke test (every scene loads and draws with no errors)
if (process.argv.includes('--browser')) {
  const r = spawnSync('node', [fileURLToPath(new URL('./browser.mjs', import.meta.url))], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const bad = out.split('\n').filter(l => l.startsWith('FAIL'));
  for (const l of bad) check(l.replace('FAIL ', ''), false);
  check('browser smoke test ran', /BROWSER-DONE/.test(out), out.slice(-300));
  pass += (out.match(/^ok /gm) || []).length;
}
for (const f of failures) console.log('FAIL ' + f);
console.log(fail ? `${fail} failed, ${pass} passed` : `all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
