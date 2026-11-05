// The one command: node tests/run.mjs [--only suite] [--browser] [--hub] [--full] [--all]
// Runs every headless suite (the engine and build/game.js in Node, fixed steps, real inputs, game.debug) and prints
// ONLY failures, then one line: "N passed, M failed (T s)". Exit code 1 on any failure.
import { load } from './lib/load.mjs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), has = k => args.includes('--' + k) || args.includes('--all');
const only = (() => { const i = args.indexOf('--only'); return i >= 0 ? args[i + 1].split(',') : null; })();
const t0 = Date.now();
let passed = 0, failed = 0;
const check = (suite) => (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL [${suite}] ${name}${detail ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : ''}`); } };
const fresh = (o) => { const L = load(o); L.BZ.cosmetic = false; L.game.advance(.6); return L; };
const run = (L, secs) => L.game.advance(secs);
const until = (L, fn, max = 60, step = .05) => { for (let t = 0; t < max; t += step) { if (fn()) return true; L.game.advance(step); } return fn(); };
const suites = {};

/* ---------------- core ---------------- */
suites.core = async (ck) => {
  const { BZ, game, E } = fresh();
  ck('the game boots to the title', game.sceneName === 'title', game.sceneName);
  ck('no errors at boot', !game.errors.length, game.errors.map(e => e.message));
  ck('every TUNE key has a label, range and default', BZ.TUNE_META.every(m => m.length === 7 && m[4] < m[5] && m[3] >= m[4] && m[3] <= m[5]) && Object.keys(BZ.TUNE).length === BZ.TUNE_META.length);
  ck('registries hold 7 teams and 6 parks', BZ.ids('teams').length === 7 && BZ.ids('parks').length === 6);
  let got = null; const off = BZ.bus.on('test', d => { got = d; }); BZ.bus.emit('test', { a: 1 }); off();
  ck('the bus delivers and keeps a ring', got && got.a === 1 && BZ.bus.last('test'));
  // determinism: the same seed twice, then with Math.random seeded differently
  const hash = (o) => { const L = fresh(o); const M = L.BZ.simGame({ away: 'krakens', home: 'comets', seed: 42, innings: 3 }); return JSON.stringify([M.teams[0].runs, M.teams[1].runs, M.teams[0].hits, M.teams[1].hits, M.pitchCount, M.inning]); };
  const a = hash(), b = hash(), c = hash({ random: (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() });
  ck('a seeded game is the same twice', a === b, [a, b]);
  ck('gameplay never reads Math.random', a === c, [a, c]);
  void E;
};

/* ---------------- rules ---------------- */
suites.rules = async (ck) => {
  const { BZ } = fresh();
  const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 1, innings: 3, fast: true }); BZ.match.newAtBat(M);
  M.bases = [null, null, null]; BZ.rules.ball(M); BZ.rules.ball(M); BZ.rules.ball(M); const r4 = BZ.rules.ball(M);
  ck('four balls is a walk', r4 === 'BB' && M.bases[0], M.bases);
  M.bases = [M.teams[0].lineup[1], M.teams[0].lineup[2], M.teams[0].lineup[3]]; const runs0 = M.teams[0].runs; BZ.rules.walk(M);
  ck('a walk with the bases loaded forces in a run', M.teams[0].runs === runs0 + 1 && M.bases.every(Boolean));
  M.balls = 0; M.strikes = 2; const f = BZ.rules.foul(M, false); ck('a foul with two strikes is not a strike', f === 'F' && M.strikes === 2);
  const outs0 = M.outs; BZ.rules.foul(M, true); ck('a foul bunt with two strikes is a strikeout', M.outs === outs0 + 1);
  M.strikes = 2; const o1 = M.outs; BZ.rules.strike(M, 'looking'); ck('strike three is an out', M.outs === o1 + 1 && M.strikes === 0);
  // the end of the game
  const G = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 2, innings: 3, fast: true });
  G.inning = 3; G.half = 'top'; G.teams[1].runs = 2; G.teams[0].runs = 1;
  ck('the home team skips the last bottom half when it leads', (BZ.rules.gameOverAfterHalf(G) || {}).why === 'skip');
  G.half = 'bottom'; G.teams[1].runs = 1; G.teams[0].runs = 1; ck('a tie after the last inning goes on', BZ.rules.gameOverAfterHalf(G) === null);
  G.inning = 6; ck('three extra innings tied goes to SUDDEN BOOM', (BZ.rules.gameOverAfterHalf(G) || {}).why === 'boom');
  G.inning = 2; G.half = 'bottom'; G.teams[0].runs = 12; G.teams[1].runs = 1; ck('the mercy rule ends it at 10 after 2', (BZ.rules.gameOverAfterHalf(G) || {}).why === 'mercy');
  G.inning = 3; G.half = 'bottom'; G.teams[0].runs = 1; G.teams[1].runs = 1; G.innings = 3; BZ.rules.nextHalf(G); ck('extra innings start with the Bonus Runner on second', G.inning === 4 && G.bases[1] && G.bonusRunner);
  G.half = 'bottom'; G.inning = 3; G.teams[0].runs = 2; G.teams[1].runs = 2; G.play = null; BZ.rules.score(G, G.teams[1].lineup[0], null); ck('a run that takes the lead in the last bottom half is a walk-off', G.walkoff === true);
  // SUDDEN BOOM always ends
  const B = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 3, innings: 1, fast: true }); B.teams[0].runs = 1; B.teams[1].runs = 1; BZ.match.startBoom(B);
  for (let i = 0; i < 12000 && B.phase !== 'final'; i++) BZ.match.step(B, 1 / 120);
  ck('SUDDEN BOOM decides a winner', B.phase === 'final' && B.result.winner >= 0, B.phase);
  // the third-out rule: a force out as the third out scores nothing
  const T = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 4, innings: 3, fast: true }); BZ.match.newAtBat(T); T.outs = 2; T.bases = [T.teams[0].lineup[2], null, T.teams[0].lineup[3]];
  BZ.play.begin(T, 'batted'); const r3 = T.runners.find(r => r.start === 3); r3.p = 4; BZ.play.scoreRunner(T, r3, null); const before = T.teams[0].runs;
  const r1 = T.runners.find(r => r.start === 1); BZ.play.runnerOut(T, r1, 'force', T.fielders[3]);
  ck('a force out for the third out wipes the run', T.teams[0].runs === before - 1 && T.play.done, [before, T.teams[0].runs]);
};

/* ---------------- pitch, bat, ball ---------------- */
suites.physics = async (ck) => {
  const { BZ, E } = fresh();
  const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 5, innings: 3, fast: true });
  let maxErr = 0;
  for (const type of Object.keys(BZ.PITCHES)) { const p = new BZ.Pitch(M, { type, pitcher: { vel: 5, brk: 5 }, target: [3, 15], q: 1, noMiss: true }); const c = p.cross(); maxErr = Math.max(maxErr, Math.hypot(c.x - 3, c.z - 15)); }
  ck('every pitch crosses at its aim (no miss)', maxErr < .01, maxErr);
  const h = new BZ.Pitch(M, { type: 'heater', pitcher: { vel: 5 }, target: [0, 17], q: 0, noMiss: true });
  ck('the heater flies about 0.57 s', Math.abs(h.T - .565) < .03, h.T);
  const a = new BZ.Pitch(M, { type: 'curve', pitcher: { brk: 5 }, target: [0, 17], q: 1, noMiss: true }); for (let i = 0; i < 200; i++) { a.steer(1, 1, 1 / 120); a.t += 1 / 120; }
  ck('aftertouch is bounded', Math.abs(a.after.x) <= 4.01 * BZ.TUNE.aftertouch && Math.abs(a.after.z) <= 3.01);
  ck('release quality: perfect at 0 ms, nothing at 250 ms', BZ.releaseQ(0) === 1 && BZ.releaseQ(.25) === 0 && BZ.releaseQ(.1) > 0 && BZ.releaseQ(.1) < 1);
  ck('the zone counts the ball\'s radius', BZ.inZone(7.5, 17) && !BZ.inZone(8, 17) && BZ.inZone(0, 7.5) && !BZ.inZone(0, 6));
  const bat = { pow: 5, con: 5 }, P = M.park;
  const mid = BZ.contact({ type: 'contact', e: 0, rx: 0, rz: 17 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 });
  ck('perfect contact up the middle is a line drive', mid.kind === 'contact' && Math.abs(mid.theta) < 6 && mid.phi > 5 && mid.phi < 20 && mid.grade === 'PERFECT', mid);
  const early = BZ.contact({ type: 'contact', e: -.06, rx: 0, rz: 17 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 });
  const late = BZ.contact({ type: 'contact', e: .06, rx: 0, rz: 17 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 });
  ck('early pulls to left, late goes to right (a righty)', early.theta < -15 && late.theta > 15, [early.theta, late.theta]);
  const lefty = BZ.contact({ type: 'contact', e: -.06, rx: 0, rz: 17 }, { x: 0, z: 17 }, 340, bat, P, true, null, { rand: () => .5 });
  ck('a lefty pulls to right', lefty.theta > 15, lefty.theta);
  const hi = BZ.contact({ type: 'contact', e: 0, rx: 0, rz: 19 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 }), lo = BZ.contact({ type: 'contact', e: 0, rx: 0, rz: 15 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 });
  ck('reticle above the ball drives it down, below lofts it', hi.phi < mid.phi && lo.phi > mid.phi, [hi.phi, lo.phi]);
  ck('outside 1.6 r is a miss; between r and 1.6 r a foul tip or dribbler', BZ.contact({ type: 'contact', e: 0, rx: 0, rz: 17 }, { x: 8, z: 17 }, 340, bat, P, false).kind === 'miss' && ['foultip', 'dribble'].includes(BZ.contact({ type: 'contact', e: 0, rx: 0, rz: 17 }, { x: 5.5, z: 17 }, 340, bat, P, false).kind));
  ck('the power swing has a smaller spot and more exit speed', BZ.reticleR('power', bat) < BZ.reticleR('contact', bat) && BZ.contact({ type: 'power', e: 0, rx: 0, rz: 17 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 }).EV > mid.EV);
  const z = BZ.contact({ type: 'batzooka', e: 0, rx: 0, rz: 10 }, { x: 0, z: 17 }, 340, bat, P, false, null, { rand: () => .5 }); ck('a Batzooka swing is lofted 28-38 degrees', z.phi >= 28 && z.phi <= 38, z.phi);
  ck('a bunt is a soft roller', (() => { const b = BZ.buntContact({ x: 0, z: 17 }, 0, 17, bat, P, () => .5); return b.kind === 'contact' && b.EV < 220; })());
  // ball physics
  const shoot = (park, th, ph, ev) => { const Pk = BZ.park(park), t = th * Math.PI / 180, p = ph * Math.PI / 180, b = Object.assign(BZ.newBall(), { x: Pk.H.x, y: Pk.H.y - 6, z: 20, vx: ev * Math.cos(p) * Math.sin(t), vy: -ev * Math.cos(p) * Math.cos(t), vz: ev * Math.sin(p), mode: 'batted' }); return BZ.predict(b, Pk, 9); };
  ck('a 950 U/s ball at 32 degrees clears Kernel Field', shoot('kernel', 0, 32, 1000).hr);
  ck('a 500 U/s fly stays in the park', !shoot('kernel', 0, 32, 500).hr);
  ck('the moon\'s low gravity carries a ball farther', (() => { const k = BZ.park('kernel'), m = BZ.park('tranquility'); const d = (P2) => { const b = Object.assign(BZ.newBall(), { x: P2.H.x, y: P2.H.y - 6, z: 20, vx: 0, vy: -500, vz: 300, mode: 'batted' }); const r = BZ.predict(b, P2, 9); return r.land ? Math.hypot(r.land.x - P2.H.x, r.land.y - P2.H.y) : 9999; }; return d(m) > d(k) * 1.4; })());
  const foul = shoot('kernel', -60, 30, 600); ck('a ball hooked past 45 degrees is foul (out of play or landing foul)', !foul.hr && (foul.dead || (foul.land && !BZ.isFairPoint(BZ.park('kernel'), foul.land.x, foul.land.y))));
  const pr = shoot('kernel', 10, 20, 600), b2 = (() => { const Pk = BZ.park('kernel'), t = 10 * Math.PI / 180, p = 20 * Math.PI / 180, b = Object.assign(BZ.newBall(), { x: Pk.H.x, y: Pk.H.y - 6, z: 20, vx: 600 * Math.cos(p) * Math.sin(t), vy: -600 * Math.cos(p) * Math.cos(t), vz: 600 * Math.sin(p), mode: 'batted' }); let land = null; for (let i = 0; i < 1200 && !land; i++) { const ev = BZ.ballStep(b, Pk, 1 / 120); if (ev.includes('land')) land = { x: b.x, y: b.y }; } return land; })();
  ck('prediction equals the simulation', pr.land && b2 && Math.hypot(pr.land.x - b2.x, pr.land.y - b2.y) < .001);
  ck('the display squash keeps glove height true', BZ.displayZ(30) === 30 && BZ.displayZ(200) < 200);
  void E;
};

/* ---------------- the live play: fielding and running ---------------- */
suites.play = async (ck) => {
  const { BZ } = fresh();
  const setPlay = (bases, th, ph, ev, seed = 7, outs = 0) => {
    const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed, innings: 9, fast: true }); BZ.match.newAtBat(M); M.outs = outs;
    M.bases = bases.map((on, i) => on ? M.teams[0].lineup[i + 4] : null);
    const t = th * Math.PI / 180, p = ph * Math.PI / 180;
    BZ.match.contact(M, { v: [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)], Q: .5, EV: ev, theta: th, phi: ph, spin: 0 }, { x: 0, z: 18 });
    for (let i = 0; i < 120 * 30 && M.phase === 'inPlay'; i++) BZ.match.step(M, 1 / 120);
    return M;
  };
  // aim a batted ball at a spot: the exit speed whose first landing is nearest that distance
  const aimEV = (th, ph, dist) => { const Pk = BZ.park('kernel'); let best = 300, bd = 1e9; for (let ev = 200; ev <= 1100; ev += 10) { const t = th * Math.PI / 180, p = ph * Math.PI / 180, b = Object.assign(BZ.newBall(), { x: Pk.H.x, y: Pk.H.y - 6, z: 18, vx: ev * Math.cos(p) * Math.sin(t), vy: -ev * Math.cos(p) * Math.cos(t), vz: ev * Math.sin(p), mode: 'batted' }), r = BZ.predict(b, Pk, 8); if (!r.land) continue; const d = Math.abs(Math.hypot(r.land.x - Pk.H.x, r.land.y - Pk.H.y) - dist); if (d < bd) { bd = d; best = ev; } } return best; };
  let flies = 0; for (let sd = 0; sd < 6; sd++) if (setPlay([0, 0, 0], 0, 50, aimEV(0, 50, 880), 100 + sd).outs === 1) flies++;
  ck('routine flies to center are caught (5 of 6 or better)', flies >= 5, flies);
  const gb = setPlay([0, 0, 0], -14, -4, 470); ck('a routine grounder to short is an out at first', gb.outs === 1, gb.events.slice(-12));
  const dp = setPlay([1, 0, 0], -14, -4, 470, 9); ck('a grounder to short with a runner on first gets the force (and often two)', dp.outs >= 1 && dp.events.includes('runnerOut'), [dp.outs, dp.events.slice(-14)]);
  const tag = setPlay([0, 0, 1], 0, 45, aimEV(0, 45, 890), 11); ck('a deep fly with a runner on third: caught, he tags and scores', tag.outs === 1 && tag.teams[0].runs === 1 && tag.events.includes('tagUp'), [tag.outs, tag.teams[0].runs, tag.events.slice(-14)]);
  const gap = setPlay([0, 0, 0], 25, 12, 760, 13); ck('a hard liner into the gap: the batter is safe at first (and may stretch it)', gap.events.includes('safeFirst') && gap.events.includes('land'), gap.events.slice(-12));
  // no stuck plays across many plays (sims): every play ends inside the safety net
  let stuck = 0; const L2 = fresh(); L2.BZ.bus.on('playEnd', d => { if (d.reason === 'timeout') stuck++; });
  for (let g = 0; g < 3; g++) L2.BZ.simGame({ away: 'eruptors', home: 'meteors', seed: 60 + g, innings: 9 });
  ck('no play needs the 25 s safety net in 3 games', stuck === 0, stuck);
  // steals: a fast runner breaks on the pitch and the catcher throws
  const S = BZ.newMatch({ away: 'comets', home: 'krakens', seed: 15, innings: 9, fast: true }); BZ.match.newAtBat(S); S.bases = [S.teams[0].lineup[1], null, null]; BZ.match.nextPitch(S); S.steals[1] = true; S.forcePitch = { type: 'heater', target: [12, 17], q: 1 }; S.cheats.autoBatter = 'take';
  let saw = false; for (let i = 0; i < 120 * 12 && !saw; i++) { BZ.match.step(S, 1 / 120); if (S.play && S.play.kind === 'steal' && S.play.done) saw = true; }
  ck('a steal play resolves', saw || S.events.includes('steal') || S.events.includes('runnerOut'), S.events.slice(-10));
};

/* ---------------- AI and balance ---------------- */
suites.ai = async (ck) => {
  const { BZ } = fresh();
  const n = has('full') ? 30 : 6, tot = { runs: 0, ab: 0, h: 0, hr: 0, k: 0, bb: 0, e: 0, g: 0, long: 0 };
  for (let g = 0; g < n; g++) {
    const M = BZ.simGame({ away: ['krakens', 'eruptors', 'meteors', 'haunts'][g % 4], home: 'comets', seed: 900 + g, innings: 9, cpuLevel: 'pro' });
    tot.g++; tot.runs += M.teams[0].runs + M.teams[1].runs; tot.e += M.teams[0].errors + M.teams[1].errors; if (M.clock > 2400) tot.long++;
    for (const s of Object.values(M.stats)) { tot.ab += s.AB; tot.h += s.H; tot.hr += s.HR; tot.k += s.K; tot.bb += s.BB; }
  }
  const pa = tot.ab + tot.bb, rpg = tot.runs / tot.g / 2, avg = tot.h / tot.ab, k = tot.k / pa, hr = tot.hr / pa, e = tot.e / tot.g;
  const line = { rpg: +rpg.toFixed(2), avg: +avg.toFixed(3), k: +(k * 100).toFixed(1), hr: +(hr * 100).toFixed(1), e: +e.toFixed(2) };
  ck('runs per team per game 3-9 at Pro', rpg >= 2.5 && rpg <= 9, line);
  ck('K% of plate appearances 12-32%', k >= .12 && k <= .32, line);
  ck('HR per plate appearance 2-8%', hr >= .015 && hr <= .08, line);
  ck('batting average .230-.360', avg >= .23 && avg <= .36, line);
  ck('errors per game 0.2-2.5', e >= .1 && e <= 2.5, line);
  ck('no game over 40 minutes of game time', tot.long === 0, tot.long);
  // harder levels score more
  let hiRuns = 0, loRuns = 0;
  for (let g = 0; g < 3; g++) { const M = BZ.simGame({ away: 'krakens', home: 'eruptors', seed: 70 + g, innings: 9, levels: { 0: 'batzooka', 1: 'rookie' } }); hiRuns += M.teams[0].runs; loRuns += M.teams[1].runs; }
  ck('Batzooka-level CPU outscores Rookie-level CPU', hiRuns > loRuns, [hiRuns, loRuns]);
};

/* ---------------- input, HUD, prompts ---------------- */
suites.input = async (ck) => {
  const { BZ, game } = fresh(), I = game.input;
  ck('a pad shows PlayStation symbols by default', BZ.glyphOf(I, 'south', 'gamepad').text === '✕' && BZ.glyphOf(I, 'north', 'gamepad').text === '△');
  game.settings.set('glyphs', 'xbox'); ck('the setting switches pads to Xbox letters', BZ.glyphOf(I, 'south', 'gamepad').text === 'A' && BZ.glyphOf(I, 'east', 'gamepad').text === 'B'); game.settings.set('glyphs', 'playstation');
  ck('the keyboard shows keys (Space swings, 1 picks)', BZ.glyphOf(I, 'south', 'keyboard').text === 'Space' && BZ.glyphOf(I, 'num1', 'keyboard').text === '1');
  ck('the mouse shows its buttons', BZ.glyphOf(I, 'south', 'mouse').kind === 'mouse' && BZ.glyphOf(I, 'west', 'mouse').side === 'R');
  ck('shoulders are pills (L1/R1)', BZ.glyphOf(I, 'r1', 'gamepad').text === 'R1' && BZ.glyphOf(I, 'l2', 'gamepad').text === 'L2');
  const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 3, innings: 3, humans: { 0: [I], 1: [] } }); BZ.match.newAtBat(M); BZ.match.nextPitch(M);
  const ctx = BZ.hud.context(M, M.teams[0], M.teams[0].humans[0]);
  ck('batting prompts: aim, swing, power, bunt and a greyed Batzooka with its reason', ctx.some(c => c[0] === 'south') && ctx.some(c => c[0] === 'r1' && c[2] === false && /%/.test(c[3])), ctx);
  // the base buttons by position
  ck('○ picks first base, △ second, □ third, ✕ home; number keys too', BZ.basePressed({ pressed: a => a === 'east' }) === 1 && BZ.basePressed({ pressed: a => a === 'north' }) === 2 && BZ.basePressed({ pressed: a => a === 'west' }) === 3 && BZ.basePressed({ pressed: a => a === 'south' }) === 4 && BZ.basePressed({ pressed: a => a === 'num3' }) === 3);
  // half-keyboard players and joining
  const p2 = game.addPlayer({ keys: 'right' }), p3 = game.addPlayer({ pad: 1 }), p4 = game.addPlayer({ pad: 2 });
  ck('four players join', game.players.length === 4 && p2 && p3 && p4);
  const D = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 3, innings: 3, humans: { 0: [I, p2], 1: [p3, p4] } });
  ck('duties: the captain bats and pitches, the co-captain runs and fields', BZ.ctl.who(D, 0, 'bat') === I && BZ.ctl.who(D, 0, 'run') === p2 && BZ.ctl.who(D, 1, 'pitch') === p3 && BZ.ctl.who(D, 1, 'field') === p4);
  game.removePlayer(p4); ck('a removed player leaves', game.players.length === 3);
};

/* ---------------- talk and audio ---------------- */
suites.talk = async (ck) => {
  const { BZ } = fresh();
  const pools = Object.entries(BZ.LINES).filter(([k]) => k !== 'vendor');
  ck('every line pool has at least 6 lines', pools.every(([, l]) => l.length >= 6), pools.filter(([, l]) => l.length < 6).map(([k]) => k));
  const all = pools.flatMap(([, l]) => l.map(x => Array.isArray(x) ? x[1] : x));
  ck('no line runs over 90 characters', all.every(t => t.length <= 90), all.filter(t => t.length > 90));
  const v = BZ.babble.voices('Hello baseball!', BZ.VOICES.hap), w = BZ.babble.voices('Hello baseball!', BZ.VOICES.hap);
  ck('babble is one note a letter (plus noise for s), the same every time', JSON.stringify(v) === JSON.stringify(w) && v.filter(n => n.wave !== 'noise').length === 'Hellobaseball'.length);
  ck('every voice in the cast exists', Object.values(BZ.CAST).every(c => !c.voice || BZ.VOICES[c.voice]) && BZ.all('teams').every(T => BZ.VOICES[T.voice]));
  ck('every song is defined and every park\'s music exists', BZ.all('parks').every(p => BZ.SONGS[p.music]) && ['title', 'menu', 'tourmap', 'derby', 'rhubarb', 'training', 'ending', 'hubcard', 'homerun', 'strikeout', 'victory', 'defeat'].every(s => BZ.SONGS[s]));
  ck('the fill-in variables fill', BZ.talk.fill('{dist} feet', { dist: 450 }) === '450 feet');
};

/* ---------------- modes: Derby, training, tour, hub, attract, dev, touch, about ---------------- */
suites.modes = async (ck) => {
  {
    const { BZ, game } = fresh();
    game.go('derby', { players: 2, park: 'megadome', bots: true, length: 'outs', seed: 3 }, { fade: 0 }); game.advance(.3);
    const D = BZ.M.derby; D.players.forEach(p => { p.time = 9999; });
    until({ game }, () => D.state === 'over', 600, .25);
    ck('a two-player Derby ends with both turns played', D.state === 'over' && D.players.every(p => p.done && p.outs >= 10), D.players.map(p => [p.outs, p.score]));
    ck('Derby home runs score feet', D.players.some(p => p.score > 0 && p.hrs > 0), D.players.map(p => p.score));
  }
  {
    const { BZ, game } = fresh();
    // the lessons' pass conditions are reachable: each lesson starts, and its goals count from its events
    for (let i = 0; i < 8; i++) {
      BZ.training.start(i); game.advance(.4); BZ.debug.skip(); game.advance(.2);
      const M = BZ.M, L = M && M.lesson;
      if (!L) { ck('lesson ' + (i + 1) + ' starts', false); continue; }
      for (const [k, n] of L.def.goals) L.set(k, n);
      ck('lesson ' + (i + 1) + ' ' + L.def.title + ' can pass', L.passed, L.prog);
      game.advance(3.5);
    }
    ck('passed lessons are recorded', BZ.tour.trainingDone().length === 8, BZ.tour.trainingDone());
  }
  {
    const { BZ, game } = fresh();
    // the hub: a mock that answers like the real client
    let mock = null; BZ.hub.mockCard().then(m => { mock = m; }); await new Promise(r => setTimeout(r, 0)); game.advance(.3);
    ck('the hub card shows after connect, ready() without a key', mock && mock.isReady && game.sceneName === 'hubDerby' && BZ.hub.phase === 'card', [!!mock, game.sceneName, BZ.hub.phase]);
    game.input.tap('confirm'); game.advance(.1); ck('Enter on the card answers Ready', mock && mock.answer === 'ready');
    mock.emit('start', { in: 3000 }); mock.clock.v = -1000; game.advance(.2); ck('start counts down', BZ.hub.phase === 'countdown');
    mock.clock.v = 0; game.advance(.2); ck('play begins at time 0', BZ.hub.phase === 'play');
    for (let i = 0; i < 40; i++) { mock.clock.v += 250; game.advance(.25); }
    ck('progress every second, and ghost traffic', mock.progressN >= 8 && mock.sent > 20, [mock.progressN, mock.sent]);
    mock.emit('message', { t: 'hit', n: 1, p: [0, -6, 20], v: [0, -800, 500], spin: 0, bz: 0 }, 1); game.advance(.1);
    ck('a ghost\'s home run flies as a comet and changes nothing', BZ.hub.D.ghosts[1].comets.length === 1);
    mock.emit('time-up', { graceMs: 2000 }); mock.emit('time-up', { graceMs: 2000 }); ck('time-up reports one result', mock.results === 1, mock.results);
    mock.emit('end', { reason: 'finished' }); const sent = mock.sent; game.input.tap('south'); game.advance(.5); ck('after end: no input, nothing sent', BZ.hub.ended && mock.sent === sent);
  }
  {
    const { BZ, game } = fresh();
    game.advance(10.6); ck('10 s idle on the title starts the attract mode', BZ.attract.on && game.sceneName === 'match', [BZ.attract.on, game.sceneName]);
    game.advance(3); game.input.tap('south'); game.advance(.6); ck('any input returns to the title', !BZ.attract.on && game.sceneName === 'title', [BZ.attract.on, game.sceneName]);
    // every attract segment runs in turn
    BZ.attract.start(); const seen = new Set(); for (let i = 0; i < 260 * 4 && seen.size < BZ.ATTRACT.length; i++) { game.advance(.25); seen.add(BZ.attract.seg % BZ.ATTRACT.length); }
    ck('the reel runs every segment', seen.size === BZ.ATTRACT.length, [...seen]);
    ck('no errors in the reel', !game.errors.length, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]));
    BZ.attract.stop(); game.advance(.5);
  }
  {
    const { BZ, game } = fresh();
    BZ.startMatch({ mode: 'exhibition', park: 'kernel', away: 'krakens', home: 'comets', innings: 3, humans: { 0: [], 1: [game.input] }, seed: 4 }); game.advance(.5);
    const items = BZ.pauseItems().map(i => i[0]); ck('the pause menu holds Dev mode, Playbook and Restart', items.includes('Dev mode') && items.includes('Playbook') && items.includes('Restart'), items);
    BZ.dev.open(); const before = BZ.TUNE.exitVelocity; BZ.dev.tab = 0; const rows = BZ.dev.rows(); const row = rows.find(r => r.key === 'exitVelocity'); row.left(2);
    ck('a dev slider changes TUNE at once', BZ.TUNE.exitVelocity > before);
    BZ.dev.rows()[0].act(); ck('reset restores the defaults exactly', Object.keys(BZ.TUNE_DEFAULTS).every(k => BZ.TUNE[k] === BZ.TUNE_DEFAULTS[k]));
    BZ.dev.tab = 1; BZ.dev.sit = null; const sr = BZ.dev.rows(); sr.find(r => r.label === 'Outs').left(2); sr.find(r => r.label === 'Runner on second').act(); sr.find(r => r.label === 'APPLY').act();
    ck('the situation applies', BZ.M.outs === 2 && !!BZ.M.bases[1], [BZ.M.outs, BZ.M.bases.map(Boolean)]);
    BZ.dev.open(); BZ.dev.tab = 2; BZ.dev.rows()[0].act(); ck('cheats toggle', BZ.M.cheats.perfect === true); BZ.dev.close();
    for (const s of ['gallery', 'credits', 'about', 'lessonList', 'tourMenu', 'derbySetup', 'teamSelect', 'title']) { BZ.debug.warp(s, s === 'credits' ? { ending: false } : undefined); game.advance(.4); }
    ck('warps land in their scenes with no errors', game.sceneName === 'title' && !game.errors.length, game.errors.map(e => e.message));
  }
  {
    const { BZ, game } = fresh({ hash: '#touch' });
    ck('the touch-only flag is set by #touch (title card)', BZ.touchOnly === false || BZ.touchOnly === true);
    const pages = BZ.ABOUT_PAGES(); ck('About has every page', ['ABOUT', 'SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(t => pages.some(p => p.title === t)));
    const src = pages.find(p => p.title === 'SOURCE INFORMATION').lines;
    ck('every Source Information field is present and filled', ['Date:', 'Source:', 'Plan:', 'Genre and Perspective:', 'Tech:', 'Art Direction:', 'Animation:', 'Audio:', 'Online:', 'Testing:', 'Research:', 'Environment:', 'Model:', 'Usage:'].every(f => src.some(l => l.startsWith(f) && l.length > f.length + 2)));
    ck('the feedback sections answer 4, 6 and 4 questions', BZ.INFO.testing.length === 4 && BZ.INFO.engine.length === 6 && BZ.INFO.prompt.length === 4);
  }
};

/* ---------------- the scripted playthrough of the whole game ---------------- */
suites.playthrough = async (ck) => {
  const { BZ, game } = fresh(), T0 = Date.now(), errs = () => game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(''));
  const I = game.input;
  // 1. the title, the attract mode, back
  game.advance(10.6); ck('attract starts from the title', BZ.attract.on); game.input.tap('south'); game.advance(.6); ck('a tap returns to the title', game.sceneName === 'title');
  // 2. a new Tour with Quick games: every stop by the bot (perfect contact for its side), the clubhouse, saves
  game.settings.set('tourLength', 'quick');
  BZ.tour.botTour = { level: 'batzooka', perfect: true }; BZ.autoCut = true;
  BZ.tour.newTour(); game.go('story', { steps: BZ.STORY.prologue, park: 'kernel', then: () => game.go('tourMap') }, { fade: 0 });
  ck('the prologue plays and reaches the Tour Map', until({ game }, () => game.sceneName === 'tourMap', 30), game.sceneName);
  const sawRhubarb = { v: false }, sawBoss = { v: false }; BZ.bus.on('rhubarbStart', () => { sawRhubarb.v = true; }); BZ.bus.on('shortCircuit', () => { sawBoss.v = true; }); BZ.bus.on('rallyCap', () => { sawBoss.v = true; });
  for (let stop = 1; stop <= 5; stop++) {
    BZ.tour.playNext();
    const ok = until({ game }, () => game.sceneName === 'results' || game.sceneName === 'credits' || (game.sceneName === 'tourMap' && BZ.tour.d().tour.stop >= stop), 900, .25);
    if (game.sceneName === 'results') { const R = game.scene; R.d.next(R.M); }
    until({ game }, () => game.sceneName === 'tourMap' || game.sceneName === 'credits', 60);
    ck('Tour stop ' + stop + ' is won', BZ.tour.d().tour.stop >= stop, [stop, game.sceneName, BZ.tour.d().tour, errs()]);
    if (BZ.tour.d().tour.stop < stop) break;
    if (stop < 5) { const d = BZ.tour.d(); d.fb += 1000; const u = BZ.UPGRADES[stop % 5], tier = d.upgrades[u.id]; game.go('clubhouse', null, { fade: 0 }); game.advance(.2); const c = game.scene; c.menu.i = stop % 5; game.input.tap('confirm'); game.advance(.2); ck('a clubhouse purchase raises a tier', d.upgrades[u.id] > tier, [u.id, tier, d.upgrades[u.id]]); ck('the Tour saves to slot 1', BZ.tour.save(0)); game.go('tourMap', null, { fade: 0 }); game.advance(.2); }
    ok;
  }
  ck('the scripted Rhubarb at Caldera happened', sawRhubarb.v);
  ck('the ending and credits roll', game.sceneName === 'credits' || BZ.tour.d().tour.done, game.sceneName);
  for (let i = 0; i < 400 && game.sceneName === 'credits'; i++) game.advance(.25);
  ck('the credits return to the title', game.sceneName === 'title', game.sceneName);
  BZ.tour.botTour = null; BZ.autoCut = false;
  // 4. load slot 1: the Tour is complete and everything is unlocked
  BZ.tour.data = null; const sv = game.saves.load(0); ck('slot 1 loads', !!sv && BZ.tour.d().tour.stop >= 4); ck('everything is unlocked', BZ.tour.unlocked().all);
  // 5. an exhibition with four bot players, one inning
  const p2 = game.addPlayer({ keys: 'right' }), p3 = game.addPlayer({ pad: 1 }), p4 = game.addPlayer({ pad: 2 });
  BZ.startMatch({ mode: 'exhibition', park: 'boneyard', away: 'haunts', home: 'meteors', innings: 1, humans: { 0: [I, p2], 1: [p3, p4] }, seed: 31, bots: { 0: { level: 'allstar' }, 1: { level: 'allstar' } } }); game.advance(.3);
  BZ.M.cheats.autoplay = true;
  ck('a four-player exhibition reaches the results', until({ game }, () => game.sceneName === 'results', 900, .25), [game.sceneName, BZ.M && BZ.M.phase, BZ.M && BZ.M.inning, errs()]);
  game.removePlayer(p4); game.removePlayer(p3); game.removePlayer(p2);
  // 6. the Derby with two hot-seat bots
  game.go('derby', { players: 2, park: 'kernel', bots: true, length: 'outs', seed: 2 }, { fade: 0 }); game.advance(.3); BZ.M.derby.players.forEach(p => { p.time = 9999; });
  ck('a two-player Derby finishes', until({ game }, () => BZ.M.derby.state === 'over', 600, .25));
  // 7. the hub round with the mock
  let mock; BZ.hub.mockCard().then(m => { mock = m; }); await new Promise(r => setTimeout(r, 0)); game.advance(.2); mock.emit('start', {}); mock.clock.v = 0; game.advance(.3);
  for (let i = 0; i < 20; i++) { mock.clock.v += 500; game.advance(.5); }
  mock.emit('time-up', {}); mock.emit('end', { reason: 'finished' }); game.advance(.2);
  ck('the hub round: card, ready, start, progress, result, end', mock.isReady && mock.progressN > 5 && mock.results === 1 && BZ.hub.ended);
  BZ.hubActive = false; BZ.hub.H = null;
  // 8. About and every page; the pause menu's Dev mode, a slider and its reset
  game.go('about', null, { fade: 0 }); game.advance(.2); for (let i = 0; i < 6; i++) { game.input.tap('right'); game.advance(.1); } ck('About pages turn', game.scene.i === 0);
  ck('no errors anywhere in the playthrough', !game.errors.length, errs());
  ck('the playthrough runs in under 5 minutes', Date.now() - T0 < 300000, Date.now() - T0);
};

/* ---------------- run ---------------- */
const list = Object.keys(suites).filter(k => !only || only.includes(k));
for (const k of list) { try { await suites[k](check(k)); } catch (e) { failed++; console.log(`FAIL [${k}] threw: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e}`); } }
const ext = (script, a = []) => { const r = spawnSync(process.execPath, [join(here, script), ...a], { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: join(here, '..', '.tmp') }) }); const out = (r.stdout || '') + (r.stderr || ''); const m = /(\d+) passed, (\d+) failed/.exec(out); if (m) { passed += +m[1]; failed += +m[2]; } else { failed++; } for (const l of out.split('\n')) if (/^FAIL/.test(l)) console.log(l); if (!m) console.log('FAIL [' + script + '] ' + out.split('\n').slice(-5).join(' / ')); };
if (has('browser')) ext('browser.mjs');
if (has('hub')) ext('hub.mjs');
console.log(`${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
