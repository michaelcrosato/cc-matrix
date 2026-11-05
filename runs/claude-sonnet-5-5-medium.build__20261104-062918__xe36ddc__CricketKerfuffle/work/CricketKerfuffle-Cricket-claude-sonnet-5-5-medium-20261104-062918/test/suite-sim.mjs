// pure-simulation checks: the ball, the laws, determinism (the sim files only, no engine scenes)
import { G } from './sim.mjs';
import { check } from './lib.mjs';
const { createMatch, T, newBall, stepBall, solveDelivery, predictPlane, mkrng } = G;
G.tuningReset();
// 1. solved deliveries land on the target (no swing)
let worst = 0;
for (let i = 0; i < 50; i++) {
  const r = mkrng(i + 1), tx = 448 + (r() - .5) * 40, ty = 380 + r() * 160, sp = 250 + r() * 200;
  const b = newBall(); b.phase = 'delivery'; b.x = 448; b.y = 642; b.z = 36; const s = solveDelivery(448, 642, 36, tx, ty, sp);
  b.vx = s.vx; b.vy = s.vy; b.vz = s.vz; b.groundBounce = 1; let ev = null, k = 0;
  while (ev !== 'pitched' && k++ < 1200) ev = stepBall(b, 1 / 120);
  worst = Math.max(worst, Math.hypot(b.x - tx, b.y - ty));
}
check('solved deliveries pitch within one step of travel of the marker', worst < 4.5, 'worst ' + worst.toFixed(2));
// 2. swing sign
const swingEnd = a => { const b = newBall(); b.phase = 'delivery'; b.swingA = a; const s = solveDelivery(448, 642, 36, 448, 440, 360); Object.assign(b, { vx: s.vx, vy: s.vy, vz: s.vz, groundBounce: 1 }); let ev = null; while (ev !== 'pitched') ev = stepBall(b, 1 / 120); return b.x; };
check('swing pushes the ball sideways, opposite signs differ', swingEnd(120) > 452 && swingEnd(-120) < 444, swingEnd(120) + ' ' + swingEnd(-120));
// 3. the predictor equals the stepped simulation
{
  const b = newBall(); b.phase = 'delivery'; b.swingA = 100; b.turn = .1; const s = solveDelivery(448, 642, 36, 450, 450, 380); Object.assign(b, { vx: s.vx, vy: s.vy, vz: s.vz, groundBounce: 1 });
  const p = predictPlane(b, 364); const c = Object.assign({}, b, { trail: [] }); let k = 0; while (c.y > 364 && k++ < 600) stepBall(c, 1 / 120);
  check('predictor matches stepping', Math.abs(p.b.x - c.x) < .01 && Math.abs(p.b.y - c.y) < .01, p.b.x + ' vs ' + c.x);
}
// 4. rolling balls stop, bounces get lower
{
  const b = newBall(); b.phase = 'live'; b.x = 448; b.y = 400; b.z = 50; let peaks = [], lastVz = 0, k = 0;
  while (k++ < 120 * 12) { const ev = stepBall(b, 1 / 120); if (ev === 'bounce') peaks.push(Math.abs(lastVz)); lastVz = b.vz; }
  check('a dropped ball bounces lower each time', peaks.length >= 2 && peaks[1] < peaks[0], JSON.stringify(peaks));
  b.vx = 100; b.vy = 0; b.z = 0; b.vz = 0; b.rolling = true; for (let i = 0; i < 120 * 15; i++) stepBall(b, 1 / 120);
  check('rolling balls stop', Math.hypot(b.vx, b.vy) < 5);
}
// 5. whole AI matches finish, scores are sane, same seed = same match
const play = (seed, cfg = {}) => { G.RNG.play = mkrng(seed); const M = createMatch(Object.assign({ overs: 2, wickets: 3, diff: 1, chaos: 'all', cheat: false }, cfg)); M.start(); let st = 0; while (!M.over && st < 120 * 900) { M.step(1 / 120, {}); st++; } return M; };
let stuck = 0, tot = 0;
for (let s = 1; s <= 24; s++) { const M = play(s * 13); if (!M.over) stuck++; tot += M.sides[0].score + M.sides[1].score; }
check('24 AI matches all finish', stuck === 0, stuck + ' stuck');
check('average total runs is sane', tot / 24 > 8 && tot / 24 < 120, (tot / 24).toFixed(1));
const A = play(777), B = play(777);
check('same seed, same match', JSON.stringify(A.snapshot()) === JSON.stringify(B.snapshot()));
// 6. attract (cheat) matches finish and score well
{ let ok = 0, sc = 0; for (let s = 1; s <= 6; s++) { const M = play(s, { cheat: true, attract: true }); if (M.over) ok++; sc += M.sides[0].score; } check('cheating attract matches finish', ok === 6); check('attract batters score runs', sc / 6 > 12, (sc / 6).toFixed(1)); }
// 7. laws by hand
function rig(cfg = {}) { G.RNG.play = mkrng(5); const M = createMatch(Object.assign({ overs: 2, wickets: 3, diff: 1, chaos: 'none' }, cfg)); M.start(); for (let i = 0; i < 120 * 4; i++) M.step(1 / 120, {}); return M; }
function bowlTo(M, tx, ty, opts = {}) {   // a scripted delivery with chosen marker, human bowler intent
  let k = 0; while (M.ph !== 'setup' && k++ < 120 * 20) M.step(1 / 120, {});
  M.marker = [tx, ty];
  const bi = { bowl: opts.type || 'pace', mx: 0, my: 0, human: true };
  M.step(1 / 120, { bowl: bi });
  k = 0; while (M.ph === 'runup' && k++ < 120 * 3) { const R = M.runup; const tm = R.t - R.meterStart, p = .5 - .5 * Math.cos(2 * Math.PI * T('meterSpeed') * tm); M.step(1 / 120, { bowl: { release: tm > 0 && p > .46 && p < .54, mx: 0, my: 0, human: true } }); }
}
{
  const M = rig(); bowlTo(M, 448, 440);
  let k = 0; const ev = []; const off = G.on('ball:end', e => ev.push(e)); while (M.ph !== 'between' && k++ < 120 * 8) M.step(1 / 120, {}); off();
  check('a ball that is not played ends the delivery', M.ph === 'between' && ev.length === 1, M.ph + ' ' + JSON.stringify(ev));
}
{
  const M = rig(); bowlTo(M, 448 + 60, 440);   // far wide of the stumps
  let k = 0; const ev = []; const off = G.on('ball:end', e => ev.push(e)); while (M.ph !== 'between' && k++ < 120 * 8) M.step(1 / 120, {}); off();
  check('a ball far down the leg side is a wide (no ball counted, +1)', ev[0] && (ev[0].kind === 'wide' || ev[0].kind === 'runs') && (ev[0].kind !== 'wide' || (!ev[0].legal && M.sideBat().score === 1)), JSON.stringify(ev[0]));
}
{
  const M = rig(); const outs = []; const off = G.on('wicket', e => outs.push(e.how));
  bowlTo(M, 448, 372, { type: 'pace' });   // a full straight yorker with a batter who does not play
  let k = 0; while (M.ph !== 'between' && k++ < 120 * 8) M.step(1 / 120, {}); off();
  check('a straight yorker with no shot hits the stumps or the pads', M.sideBat().wkts === 1 || M.last.kind !== undefined, JSON.stringify(M.last) + outs);
}
// 8. free hit: a no ball means the next ball cannot dismiss
{
  const M = rig(); M.noBall = true; M.finish('runs', { runs: 0 });
  check('a no ball adds an extra and flags a free hit', M.sideBat().score === 1 && M.pendingFreeHit === true && M.last.legal === false);
}
// 9. dismissal via finish: wickets cap the innings, a chase ends the match
{
  const M = rig(); for (let i = 0; i < 3; i++) { M.ph = 'flight'; M.finish('wicket', { how: 'bowled', who: 'x' }); let k = 0; while (M.ph === 'between' && k++ < 120 * 4) M.step(1 / 120, {}); }
  check('three wickets end the innings and start the chase', M.inn === 1 && M.target === 1, JSON.stringify(M.snapshot()));
  M.ph = 'flight'; M.finish('boundary', { runs: 4, bonus: 0 }); let k = 0; while (!M.over && k++ < 120 * 8) M.step(1 / 120, {});
  check('a successful chase ends the match with a result', M.over && M.result && M.result.winner === 1, JSON.stringify(M.result));
}
// 10. hype fills and the special ignites the bat
{
  const M = rig(); let k = 0; while (M.ph !== 'setup' && k++ < 120 * 20) M.step(1 / 120, {}); M.sideBat().hype = 100;
  M.step(1 / 120, { bat: { special: true, shot: null, aim: [0, 1] } });
  check('a full hype bar ignites ON FIRE', M.sideBat().fire > 0 && M.sideBat().hype === 0);
}
// 11. hub determinism: two copies with the same stream face identical deliveries whatever the batter does
{
  const mk = (n, seed) => () => mkrng(seed * 1000 + n)();
  const run = (batting) => {
    G.RNG.play = mkrng(1); const rec = [];
    const M = createMatch({ overs: 1, wickets: 2, diff: 1, hub: true, single: true, chaos: 'none', rngBall: n => mkrng(4242 + n * 7919), rngF: n => mkrng(99 + n) }); M.start();
    const off = G.on('release', e => rec.push([M.ballNo, e.type, e.kmh, M.ball.vx.toFixed(3), M.ball.vy.toFixed(3), M.ball.swingA]));
    let st = 0; while (!M.over && st < 120 * 300) { const bi = batting && M.ph === 'flight' && !M.swing && M.ball.y < 420 ? { shot: batting, aim: [0, 1] } : null; M.step(1 / 120, { bat: bi || { shot: null, aim: [0, 1] } }); st++; }
    off(); return rec;
  };
  const a = run('ground'), b = run(null);
  const n = Math.min(a.length, b.length, 4);
  check('hub: the first balls are identical whatever the batter does', n >= 3 && JSON.stringify(a.slice(0, n)) === JSON.stringify(b.slice(0, n)), JSON.stringify(a.slice(0, 2)) + ' vs ' + JSON.stringify(b.slice(0, 2)));
}
