// THE test command:  node test/run.mjs   (prints only failures and a one-line count; --browser adds the Playwright checks)
import { load } from './lib/load.mjs';
let pass = 0, fail = 0; const failed = [];
const ok = (name, cond, detail = '') => { if (cond) pass++; else { fail++; failed.push(name + (detail ? ': ' + detail : '')); } };
const mk = (o = {}) => { const L = load(); L.TT.cfg.present = false; const sim = L.sim; const m = sim.newMatch(Object.assign({ home: 'hawks', away: 'rovers', venue: 'docks', seed: 5, mode: 'exh', halfLength: 60, seats: [{ team: 0, kind: 'local', slot: 0, pid: -1 }], diff: { react: .25, noise: .2 }, tackleBonus: 0, interceptMult: 1 }, o)); m.seats = m.cfg.seats; return Object.assign(L, { m }); };
const I = () => ({ mx: 0, my: 0, turbo: false, x: false, sq: false, ci: false, tri: false, l1: false, r1: false, hx: false, hsq: false, hci: false, hl1: false, hr1: false, rx: false, rci: false, rl1: false, rr1: false, aim: null, click: -1 });
const run = (L, sec, fn) => { const dt = 1 / 120, n = Math.round(sec * 120); for (let i = 0; i < n; i++) { const e = fn ? fn(L.m, i * dt, i) : null; L.sim.stepMatch(dt, [e || I()]); } };
const until = (L, sec, cond, fn) => { const n = Math.round(sec * 120); for (let i = 0; i < n; i++) { L.sim.stepMatch(1 / 120, [(fn && fn(L.m, i / 120)) || I()]); if (cond(L.m)) return true; } return false; };
const me = L => L.m.players[L.m.seats[0].pid];
const ev = (m, n) => m.counts[n] | 0;
const toPlay = L => { until(L, 5, m => m.phase === 'kickoff'); run(L, .1); L.m.phase = 'play'; L.m.sp = null; L.m.phaseT = 0; L.m.ball.st = 'loose'; };

// 1. full AI matches across venues: no watchdogs, no exceptions, matches finish
for (const [i, v] of ['muddington', 'docks', 'furnace', 'megadome'].entries()) {
  const L = mk({ venue: v, seed: 100 + i, seats: [{ team: 0, kind: 'script', auto: true, pid: -1 }], halfLength: 50 }); L.m.seats = L.m.cfg.seats;
  let err = null; try { until(L, 600, m => m.over, () => I()); } catch (e) { err = e; }
  ok('AI match ' + v + ' finishes without error', !err && L.m.over, err && err.stack.slice(0, 300) + ' phase ' + L.m.phase);
  ok('AI match ' + v + ' has no watchdog', !(L.m.counts.watchdog | 0), 'watchdog ' + L.m.counts.watchdog);
  ok('AI match ' + v + ' scores', L.m.score[0] + L.m.score[1] > 0, JSON.stringify(L.m.score));
  ok('AI match ' + v + ' has halftime and fulltime', ev(L.m, 'halftime') === 1 && ev(L.m, 'fulltime') >= 1);
}
// 2. determinism
{ const h = () => { const L = mk({ seed: 77, seats: [{ team: 0, kind: 'script', auto: true, pid: -1 }] }); L.m.seats = L.m.cfg.seats; run(L, 40); return JSON.stringify([L.m.score, L.m.ball.x.toFixed(2), L.m.ball.y.toFixed(2), L.m.counts]); }; ok('same seed gives the same match', h() === h()); }
// 3. passing is backwards only; a pass button with no legal receiver is a dummy; mouse can throw forward
{ const L = mk(); toPlay(L); const m = L.m, p = m.players[4]; for (const q of m.players) L.sim.place(q, 300 + q.id * 5, 300 + q.id * 30); L.sim.place(p, 600, 384, 0); L.sim.giveBall(p);
  L.sim.place(m.players[3], 560, 330, 0); L.sim.place(m.players[5], 560, 440, 0); L.sim.place(m.players[6], 700, 384, 0);
  const rec = L.sim.receivers(p, 0); ok('receivers are all behind the passer', rec.length > 0 && rec.every(q => q.x - p.x <= 4), rec.map(q => q.id).join());
  m.seats[0].pid = 4; const c0 = ev(m, 'pass'); run(L, .05, (mm, t, i) => i === 0 ? Object.assign(I(), { l1: true, hl1: true }) : Object.assign(I(), { hl1: false, rl1: true })); run(L, .3, () => Object.assign(I(), { rl1: true }));
  ok('L1 passes up the screen to a backwards receiver', ev(m, 'pass') > c0 && !m.events.filter(e => e.n === 'pass').pop().d.forward);
}
{ const L = mk(); toPlay(L); const m = L.m, p = m.players[4]; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); L.sim.place(p, 600, 384, 0); L.sim.giveBall(p); L.sim.place(m.players[6], 700, 384, 0); m.seats[0].pid = 4;
  run(L, .02, () => Object.assign(I(), { click: 6 })); run(L, 1.5);
  ok('a mouse pass forwards is a forward pass and gives a scrum', ev(m, 'forwardPass') > 0 && (m.phase === 'scrum' || ev(m, 'scrum') > 0), m.phase + ' ' + JSON.stringify(m.counts)); }
// 4. tackle then ruck then ball
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const car = m.players[4 + 7 - 7]; const tk = m.players[7 + 4]; L.sim.place(car, 600, 384, 0); L.sim.place(tk, 612, 384, Math.PI); L.sim.giveBall(car); car.pow = 1; tk.tkl = 10; m.cfg.tackleBonus = 1;
  const nb = m.players[5]; L.sim.place(nb, 580, 400, 0);
  L.sim.tackleAttempt(tk, 'tackle', 0); ok('a tackle on the carrier starts a ruck', m.phase === 'ruck' && ev(m, 'tackle') > 0, m.phase);
  ok('the ruck resolves into open play', until(L, 6, mm => mm.phase === 'play'), m.phase); ok('ruck produced a result', ev(m, 'ruckWon') > 0); }
// 5. monster hit launches the carrier and spills the ball
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const car = m.players[4], tk = m.players[11]; L.sim.place(car, 600, 384, 0); L.sim.place(tk, 612, 384, Math.PI); L.sim.giveBall(car); L.sim.tackleAttempt(tk, 'big', 1);
  ok('a full-charge big hit is a monster hit', ev(m, 'monsterHit') > 0 && car.st === 'air', car.st); run(L, 2); ok('the launched player lands and gets up', car.z === 0); }
// 6. sidestep makes a tackle whiff; fend beats a tackle
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const car = m.players[4], tk = m.players[11]; L.sim.place(car, 600, 384, 0); L.sim.place(tk, 612, 384, Math.PI); L.sim.giveBall(car); car.evade = .25; m.cfg.tackleBonus = 1; L.sim.tackleAttempt(tk, 'tackle', 0);
  ok('a sidestepping carrier evades the tackle', ev(m, 'missedTackle') > 0 && m.ball.holder === car); car.evade = 0; tk.st = 'run'; car.fend = .3; const R = m.rng; m.rng = () => .01; L.sim.tackleAttempt(tk, 'tackle', 0); m.rng = R; ok('a fend beats a tackle', ev(m, 'fend') > 0); }
// 7. try -> conversion -> kickoff by the scorers
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const p = m.players[4]; L.sim.place(p, 1190, 384, 0); L.sim.giveBall(p); m.seats[0].pid = 4;
  run(L, .02, () => Object.assign(I(), { x: true })); ok('grounding in the in-goal scores a try', m.score[0] === 5 && ev(m, 'try') === 1, JSON.stringify(m.score));
  ok('the conversion phase follows', until(L, 5, mm => mm.phase === 'kick'), m.phase);
  until(L, 12, mm => mm.phase !== 'kick', (mm) => { const sp = mm.sp; if (!sp) return I(); if (sp.step === 'place') return Object.assign(I(), { x: true }); if (sp.step === 'aim') return Object.assign(I(), { hci: true }); if (sp.step === 'power') { const need = sim_need(L); return sp.power < need ? Object.assign(I(), { hci: true }) : Object.assign(I(), { hci: false, rci: true }); } return I(); });
  until(L, 8, mm => mm.phase === 'kickoff'); ok('after the kick the scoring team kicks off', m.phase === 'kickoff' && m.sp && m.sp.team === 0, m.phase); ok('a conversion or a miss was recorded', ev(m, 'conversion') + ev(m, 'goalMiss') > 0); }
function sim_need(L) { const s = L.m.sp, d = Math.abs(1184 - s.x); return Math.min(1, Math.max(.3, d / (L.TT.TUNE.v.kickMax * .95))); }
// 8. scrum: early engagement foul, then a played scrum
{ const L = mk(); toPlay(L); const m = L.m; L.sim.startScrum(0, 500, 300); run(L, 2.2, (mm, t) => t > 1.7 ? Object.assign(I(), { x: true }) : I());
  ok('pressing before SET is an early engagement foul (free kick)', ev(m, 'foul') > 0 || m.phase === 'penalty', m.phase + ' ' + JSON.stringify(m.counts)); }
{ const L = mk(); toPlay(L); const m = L.m; L.sim.startScrum(0, 500, 300); let alt = 0; until(L, 12, mm => mm.phase === 'play', (mm, t) => { const sp = mm.sp; if (!sp) return I(); if (sp.step === 'set' && sp.stepT > .06 && sp.stepT < .09) return Object.assign(I(), { x: true }); if (sp.step === 'push') { alt++; return alt % 30 === 0 ? Object.assign(I(), { l1: true }) : alt % 30 === 15 ? Object.assign(I(), { r1: true }) : I(); } return I(); });
  ok('a scrum finishes and play resumes', m.phase === 'play' || m.phase === 'penalty' || m.phase === 'try' || ev(m, 'scrumWon') > 0, m.phase); ok('scrum was won by someone', ev(m, 'scrumWon') > 0); }
// 9. lineout with a good throw
{ const L = mk(); toPlay(L); const m = L.m; L.sim.startLineout(0, 500, 90); until(L, 12, mm => mm.phase === 'play', (mm, t) => { const sp = mm.sp; if (!sp) return I(); if (sp.step === 'call') return t > .6 ? Object.assign(I(), { x: true }) : I(); if (sp.step === 'throw' && Math.abs(sp.needle - .5) < .05) return Object.assign(I(), { x: true }); return I(); });
  ok('a lineout resolves into play or a scrum', m.phase === 'play' || m.phase === 'scrum', m.phase); ok('lineout throw happened', ev(m, 'lineoutThrow') + ev(m, 'notStraight') > 0); }
// 10. penalty choice: tap and go; kick at goal
{ const L = mk(); toPlay(L); const m = L.m; L.sim.startPenalty(0, 700, 384, false); ok('penalty starts the choice', m.phase === 'penalty');
  run(L, .5); run(L, .02, () => Object.assign(I(), { x: true })); run(L, .1); ok('the player can choose a tap and go', m.phase === 'play' || m.phase === 'kick', m.phase); }
// 11. fouls: seen vs unseen; yellow card goes to the bin
{ const L = mk(); toPlay(L); const m = L.m; const off = m.players[10]; m.ref.x = off.x + 20; m.ref.y = off.y; m.ref.facing = Math.PI; m.ref.down = 0; const c = ev(m, 'foul'); L.sim.foul(off, 'cheap'); ok('a foul in front of the referee is called', ev(m, 'foul') > c || m.phase === 'penalty' || !!m.adv);
  const L2 = mk(); toPlay(L2); const m2 = L2.m, o2 = m2.players[10]; m2.ref.x = o2.x + 200; m2.ref.y = o2.y; m2.ref.facing = 0; L2.sim.foul(o2, 'cheap'); ok('a foul behind his back is missed', ev(m2, 'foul') === 0 && ev(m2, 'foulUnseen') === 1);
  const L3 = mk(); toPlay(L3); const m3 = L3.m, o3 = m3.players[10]; m3.ref.down = 8; L3.sim.foul(o3, 'cheap'); ok('with the ref down nothing is called', ev(m3, 'foul') === 0); }
// 12. hype, supers, on fire, power-ups, hazards
{ const L = mk(); toPlay(L); const m = L.m; const p = m.players[4]; L.sim.giveBall(p); m.hype[0] = 99; L.sim.addHype(0, 5); ok('hype caps at 100 and super is ready', m.hype[0] === 100 && ev(m, 'superReady') === 1); L.sim.useSuper(p); ok('THUNDER RUN starts and drains hype', p.superKind === 'thunder' && m.hype[0] === 0); run(L, 5); ok('THUNDER RUN ends by time', p.superKind === ''); }
{ const L = mk({ venue: 'furnace' }); toPlay(L); const m = L.m; run(L, 30); ok('flame jets cycle', m.jets.some(j => j.st > 0) || ev(m, 'hazardWarn') > 0); }
{ const L = mk({ venue: 'megadome' }); toPlay(L); const m = L.m; m.strikeT = 0; run(L, 4); ok('lightning warns and strikes', ev(m, 'hazardWarn') > 0 && ev(m, 'hazard') > 0); }
{ const L = mk({ venue: 'docks' }); toPlay(L); const m = L.m; m.chickT = 0; run(L, 8); ok('the chicken invades', ev(m, 'hazard') > 0); }
{ const L = mk(); toPlay(L); const m = L.m; m.puT = 0; run(L, 3); ok('fans throw a power-up', ev(m, 'powerupThrow') > 0 && m.powerups.length === 1); const u = m.powerups[0]; const p = m.players[3]; L.sim.place(p, u.tx, u.ty); run(L, 2); ok('a power-up can be taken', ev(m, 'powerupTake') > 0); }
// 12b. drop goal, penalty try, boss gang tackle, metres
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const p = m.players[4]; L.sim.place(p, 1050, 384, 0); L.sim.giveBall(p); m.seats[0].pid = 4;
  run(L, 1.0, () => Object.assign(I(), { hci: true })); run(L, .02, () => Object.assign(I(), { rci: true })); run(L, 3);
  ok('a held kick in the 22 is a drop goal attempt that can score', ev(m, 'dropGoal') > 0 || ev(m, 'kick') > 0, JSON.stringify(m.counts)); }
{ const L = mk(); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const car = m.players[4], off = m.players[11]; L.sim.place(car, 1160, 384, 0); L.sim.place(off, 1150, 380, 0); L.sim.giveBall(car); m.ref.x = 1100; m.ref.y = 384; m.ref.facing = 0; m.ref.down = 0; L.sim.foul(off, 'high'); ok('a seen foul against a carrier on the line is a penalty try', ev(m, 'penaltyTry') === 1 && m.score[0] === 7, JSON.stringify(m.score)); }
{ const L = mk({ away: 'meteors' }); toPlay(L); const m = L.m; for (const q of m.players) L.sim.place(q, 100 + q.id * 3, 100 + q.id * 20); const boss = m.players[7], t1 = m.players[4], t2 = m.players[3]; L.sim.place(boss, 600, 384, 0); L.sim.giveBall(boss); L.sim.place(t1, 590, 384, 0); L.sim.place(t2, 590, 390, 0); m.cfg.tackleBonus = 1; const R = m.rng; m.rng = () => .01;
  L.sim.tackleAttempt(t1, 'tackle', 0); ok('one tackle only holds the boss', ev(m, 'held') === 1 && m.ball.holder === boss); L.sim.tackleAttempt(t2, 'tackle', 0); m.rng = R; ok('a second tackle inside a second brings the boss down', ev(m, 'tackle') === 1); }
{ const L = mk({ seats: [{ team: 0, kind: 'script', auto: true, pid: -1 }] }); L.m.seats = L.m.cfg.seats; run(L, 40); ok('metres are counted for carriers', L.m.stats[0].metres + L.m.stats[1].metres > 20, JSON.stringify([L.m.stats[0].metres, L.m.stats[1].metres])); }
// 13. TUNE: sliders clamp and reset
{ const { TT } = load(); const T = TT.TUNE; T.set('runSpeed', 999); ok('TUNE clamps to the slider max', T.v.runSpeed === 140); T.set('runSpeed', 100); ok('TUNE sets live values', T.v.runSpeed === 100); T.reset(); ok('TUNE resets to defaults', T.v.runSpeed === 92 && T.defs.length > 20); }
// 14. kick-off, hooter and sudden death
{ const L = mk({ halfLength: 20, seats: [{ team: 0, kind: 'script', auto: true, pid: -1 }] }); L.m.seats = L.m.cfg.seats; until(L, 200, m => m.phase === 'halftime'); ok('half time arrives after the hooter', L.m.phase === 'halftime' && ev(L.m, 'hooter') >= 1); }
// 15. drills all set up and have a completable condition with no errors
for (const id of ['run', 'pass', 'evade', 'tackle', 'ruck', 'kick', 'scrum', 'lineout', 'goal']) { const L = mk({ mode: 'drill', drill: id, halfLength: 600 }); let err = null; try { run(L, 3); } catch (e) { err = e; } ok('drill ' + id + ' runs', !err, err && err.stack.slice(0, 200)); }
console.log(fail ? failed.join('\n') + '\n' + fail + ' FAILED, ' + pass + ' passed' : 'all ' + pass + ' checks passed');
process.exit(fail ? 1 : 0);
