// THE test command: node tests/run.mjs [--quick] [--only a,b]. Headless suites drive the game through game.advance and
// scripted input (as engine/game/test.mjs does); browser suites open the bundle with Playwright. Prints one line per
// failure and a one-line count; exit code 1 on any failure.
import { boot } from './lib/boot.mjs';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null, quick = args.includes('--quick');
let pass = 0, fail = 0; const t0 = Date.now();
const check = (suite, name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log('FAIL ' + suite + '/' + name + (detail ? ': ' + detail : '')); } };
const suites = {};
const S = (name, fn) => { suites[name] = fn; };
const step = (game, s) => game.advance(s);
const raceTo = (r, cond, max = 400) => { let n = 0; while (!cond() && n < max * 120) { r.step(1 / 120); n++; } return n / 120; };

S('core', () => {
  const { game, OB, snap } = boot(); step(game, .5);
  check('core', 'boot reaches the title', snap().scene === 'title', snap().scene);
  check('core', 'no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  const got = []; OB.bus.on('x:test', d => got.push(d.n)); OB.bus.emit('x:test', { n: 1 }); OB.bus.emit('x:test', { n: 2 });
  check('core', 'the bus delivers in order', got.join() === '1,2');
  OB.tuning.curvePush = 9; OB.tuning.startTime = 1; OB.resetTuning();
  check('core', 'tuning reset restores every default', Object.keys(OB.TUNING_DEFAULTS).every(k => OB.tuning[k] === OB.TUNING_DEFAULTS[k]));
  const a = OB.rand.stream('x', 3), b = OB.rand.stream('x', 3);
  check('core', 'random streams repeat for a seed', [a(), a(), a()].join() === [b(), b(), b()].join());
});

S('road', () => {
  const { OB } = boot();
  for (const id in OB.STAGES) {
    const W = OB.World.get(id), st = OB.STAGES[id];
    check('road', id + ' builds within its length', W.len === st.len && W.segs.length === st.len + (st.row < 5 ? OB.JUNC : OB.RUNIN));
    const flat = W.segs.slice(0, OB.FLAT).every(s => s.curve === 0 && s.y0 === 0 && s.y1 === 0);
    check('road', id + ' starts straight and level', flat);
    if (W.juncStart >= 0) check('road', id + ' junction is flat and straight', W.segs.slice(W.juncStart).every(s => s.curve === 0 && s.y0 === W.yEnd && s.junc));
    if (st.row === 5) check('road', id + ' has its goal arch', W.segs.some(s => s.things.some(t => t.a === 'goalarch')));
    check('road', id + ' has scenery', W.segs.reduce((a, s) => a + s.things.length, 0) > 40);
    for (const s of W.segs) for (const t of s.things) if (!OB.ART[t.a]) { check('road', id + ' art ' + t.a + ' exists', false); break; }
  }
  const W = OB.World.get('S3'), i = OB.World.info(W, 300 * OB.SEG, 2.5);
  check('road', 'info reports edges and ground', i.edgeL === 'rail' && i.edgeR === 'cliff' && !i.onRoad);
  const a = JSON.stringify(OB.World.get('S7').segs.map(s => s.things.length)); OB.World.reset(); const b = JSON.stringify(OB.World.get('S7').segs.map(s => s.things.length));
  check('road', 'scenery is placed the same twice', a === b);
});

S('junction', () => {
  const { OB, E } = boot();
  const cv = E.mkCanvas(480, 270), g = E.ctx2d(cv), r = { W: 480, H: 270, bw: 480, bh: 270, game: OB.game };
  const race = OB.Race.create({ mode: 'arcade', bot: { plan: ['R'] }, startline: false, countdown: 0 });
  const W = OB.World.get('S1'); race.teleport(race.p1, 'S1', (W.juncStart - 20) * OB.SEG, 240, 0);
  raceTo(race, () => race.p1.car.side !== 0, 30);
  check('junction', 'the side chosen is the side of the road', race.p1.car.side === 1 && race.p1.route === 'R', race.p1.route);
  // the seamless switch: the road's centre on screen, just before and after the car changes stage
  let before = null, after = null, prevStage = 'S1';
  for (let i = 0; i < 120 * 8; i++) {
    const P = race.p1, V = race.view(P, 1000, 1 / Math.tan(50 * Math.PI / 180));
    OB.Road.draw(g, { x: 0, y: 0, w: 480, h: 270, i: 0 }, { stage: V.stage, z: V.z, x: V.x, h: 1000, turn: 0, t: 0, objs: [], sibling: V.sibling, r });
    const p = OB.Road.project(P.car.stage, P.car.z, P.car.x);
    if (P.car.stage === prevStage) before = p; else { after = p; break; }
    race.step(1 / 120);
  }
  check('junction', 'the switch into the next stage is seamless', before && after && Math.abs(before[0] - after[0]) < 3 && Math.abs(before[1] - after[1]) < 3, JSON.stringify([before, after]));
  check('junction', 'the right branch leads to its stage', race.p1.car.stage === 'S3', race.p1.car.stage);
  // a fixed route's closed branch: the car ends up on the open side
  const r2 = OB.Race.create({ mode: 'versus', route: OB.ROUTES.flower, bot: { plan: ['R'] }, startline: false, countdown: 0 });
  r2.teleport(r2.p1, 'S1', (W.juncStart - 20) * OB.SEG, 240, .6);
  raceTo(r2, () => r2.p1.car.stage !== 'S1', 30);
  check('junction', 'a closed fork sends the car the open way', r2.p1.car.stage === 'S2', r2.p1.car.stage);
});

S('physics', () => {
  const { OB } = boot();
  const mk = (model = 'orchidea') => { const r = OB.Race.create({ mode: 'trial', clock: 'up', traffic: false, car: model, startline: false, countdown: 0, route: { stages: ['S4'], end: 'sprint' }, startStage: 'S4' }); r.step(1 / 120); return r; };
  for (const m of ['primavera', 'orchidea', 'gardenia', 'magnolia', 'girasole']) {
    const r = mk(m), c = r.p1.car; let t = 0; const top = OB.CARS[m].top;
    while (t < 60) { c.step(1 / 120, { gas: 1, steer: 0 }, {}); c.z = Math.min(c.z, 20000); t += 1 / 120; }
    check('physics', m + ' reaches its top speed', Math.abs(c.v - top) / top < .03, c.v.toFixed(1) + ' vs ' + top);
    const r2 = mk(m), c2 = r2.p1.car; let tt = 0; while (c2.v < 100 && tt < 20) { c2.step(1 / 120, { gas: 1 }, {}); c2.z = 20000; tt += 1 / 120; }
    check('physics', m + ' 0-100 near its time', tt < OB.CARS[m].acc * .72 * 1.15 + .2 && tt > OB.CARS[m].acc * .72 * .85, tt.toFixed(2));
  }
  const r = mk(), c = r.p1.car;
  c.v = 200; c.z = 200 * OB.SEG; for (let i = 0; i < 60; i++) c.step(1 / 120, { gas: 0, brake: 1 }, {});
  check('physics', 'brakes slow the car', c.v < 200 - 100, c.v.toFixed(0));
  // drift entry: a brake tap, the drift button; never below the minimum speed
  const tryDrift = (v, how) => { const q = mk(), car = q.p1.car; car.v = v; car.z = 10 * OB.SEG; car.x = 0; let started = false; const off = OB.bus.on('drift:start', () => { started = true; }); for (let i = 0; i < 60; i++) car.step(1 / 120, how === 'tap' ? { gas: 1, steer: .8, brake: i < 20 ? 1 : 0 } : { gas: 1, steer: .8, driftPress: i === 2, drift: true }, {}); off(); return { started, car }; };
  check('physics', 'a brake tap starts a drift', tryDrift(200, 'tap').started);
  check('physics', 'the drift button starts a drift', tryDrift(200, 'button').started);
  check('physics', 'no drift below 120 km/h', !tryDrift(100, 'button').started);
  const dr = tryDrift(220, 'button').car; for (let i = 0; i < 120; i++) dr.step(1 / 120, { gas: 1, steer: .8, drift: true }, {});
  check('physics', 'a drift scores', dr.drift.score > 500, dr.drift.score.toFixed(0));
  for (let i = 0; i < 240; i++) dr.step(1 / 120, { gas: 1, steer: -.9 }, {});
  check('physics', 'counter-steer ends the drift', !dr.drift.on);
  // the curve push: a 3 is holdable flat out, a 6 is not
  const push = cv => { const q = mk(), car = q.p1.car, st = car.stats; return cv * OB.tuning.curvePush - OB.tuning.steerRate * st.steer / 2.2 * (1 - .22); };
  check('physics', 'a curve of 3 can be held flat out', push(3) < 0, push(3).toFixed(2));
  check('physics', 'a curve of 6 cannot be held flat out', push(6) > 0);
  // slipstream and the slingshot
  const q = mk(), car = q.p1.car; car.v = 250; car.z = 20 * OB.SEG; car.x = 0; const lead = { kind: 'traffic', z: car.z + 900, x: 0, v: 245, hw: .16, len: 460 };
  let sling = false; const off = OB.bus.on('slingshot', () => { sling = true; });
  for (let i = 0; i < 120; i++) { lead.z += lead.v * OB.KMH / 120; car.step(1 / 120, { gas: 1, steer: 0 }, { traffic: [lead] }); }
  check('physics', 'the slipstream builds behind a car', car.slip > .9, car.slip.toFixed(2));
  for (let i = 0; i < 60; i++) { lead.z += lead.v * OB.KMH / 120; car.step(1 / 120, { gas: 1, steer: 1 }, { traffic: [lead] }); }
  off(); check('physics', 'pulling out gives a slingshot', sling);
  // off the road it slows; rails hold the car; a fast hit spins, a slow one bumps
  const o1 = mk(), c1 = o1.p1.car; c1.v = 250; c1.z = 300 * OB.SEG; c1.x = 1.6; c1.stage = 'S4'; for (let i = 0; i < 240; i++) { c1.step(1 / 120, { gas: 1 }, {}); c1.x = 1.6; }
  check('physics', 'off the road the car slows', c1.v < 250 * OB.tuning.offroadTop + 15, c1.v.toFixed(0));
  const o2 = OB.Race.create({ mode: 'trial', traffic: false, startline: false, countdown: 0, startStage: 'S3', route: { stages: ['S3'], end: 'sprint' }, clock: 'up' }), c2 = o2.p1.car; c2.z = 300 * OB.SEG; c2.v = 200; c2.x = 1.4;
  let scr = false; const o3 = OB.bus.on('car:scrape', () => { scr = true; }); c2.step(1 / 120, { gas: 1, steer: 1 }, {}); o3();
  check('physics', 'a rail holds the car and scrapes', scr && Math.abs(c2.x) < 1.2 && c2.crash.t === 0, c2.x.toFixed(2));
  const hit = v => { const h = mk(), cc = h.p1.car; cc.z = 20 * OB.SEG; cc.x = 0; cc.v = v; const veh = { kind: 'traffic', z: cc.z + 600, x: 0, v: 80, hw: .16, len: 460 }; let k = null; const a = OB.bus.on('car:crash', () => { k = k || 'crash'; }), b = OB.bus.on('car:bump', () => { k = k || 'bump'; }); for (let i = 0; i < 120 && !k; i++) { veh.z += veh.v * OB.KMH / 120; cc.step(1 / 120, { gas: 1 }, { traffic: [veh] }); } a(); b(); return k; };
  check('physics', 'a slow rear contact bumps', hit(120) === 'bump', hit(120));
  check('physics', 'a fast rear contact spins', hit(260) === 'crash', hit(260));
});

S('traffic', () => {
  const { OB } = boot();
  const T = new OB.Traffic({ seed: 5 }); T.activate('S1', 0);
  const list = T.inStage('S1');
  check('traffic', 'a stage fills with traffic', list.length > 8, list.length);
  let gapOk = true; for (const o of list) { const near = list.filter(p => p !== o && Math.abs(p.z - o.z) < 1000); if (near.length >= OB.STAGES.S1.lanes - 1 && near.some(p => p.lane !== o.lane) && near.length + 1 >= OB.STAGES.S1.lanes) gapOk = false; }
  check('traffic', 'a way through is always left', gapOk);
  let spacing = true; for (const o of list) if (list.some(p => p !== o && p.lane === o.lane && Math.abs(p.z - o.z) < 900)) spacing = false;
  check('traffic', 'vehicles keep their spacing', spacing);
  // overtake and near-miss detection
  const car = new OB.CarSim({ id: 'p1', stage: 'S1', z: 10000, x: 0 }), veh = T.add({ stage: 'S1', z: 10400, lane: 1, type: 'sedan', ribbon: { dx: 0 } }) || T.inStage('S1')[0];
  veh.x = car.hw + veh.hw + .05; const ev = [];
  T.detect(car, (n, d) => ev.push(n)); car.z = veh.z + 100; car.v = 250; veh.v = 100; T.detect(car, (n, d) => ev.push(n));
  check('traffic', 'passing close is an overtake and a near miss', ev.includes('overtake') && ev.includes('nearmiss'), ev.join());
  // the horn moves the car ahead
  const T2 = new OB.Traffic({ seed: 2 }), v2 = T2.add({ stage: 'S4', z: 20000, lane: 1, type: 'sedan' }), c2 = new OB.CarSim({ stage: 'S4', z: 18500, x: v2.x });
  check('traffic', 'the horn makes the car ahead change lane', !!T2.horn(c2));
});

S('race', () => {
  const { OB } = boot();
  const r = OB.Race.create({ mode: 'arcade', bot: {}, seed: 2 });
  check('race', 'a run starts with the countdown', r.phase === 'countdown');
  raceTo(r, () => r.phase === 'run', 10);
  const c0 = r.clock; let cp = null; const off = OB.bus.on('checkpoint', d => { cp = d; });
  raceTo(r, () => cp, 120); off();
  check('race', 'a checkpoint extends the clock', cp && cp.bonus > 40, JSON.stringify(cp));
  check('race', 'the route string records the fork', r.p1.route.length === 1);
  const r2 = OB.Race.create({ mode: 'arcade', seed: 3, clock: 3 }); r2.players[0].input = null;
  raceTo(r2, () => r2.done, 20);
  check('race', 'when the clock runs out the run ends', r2.done && r2.done.reason === 'timeup');
  const P = r.p1; P.bloom.pts = 0; r._chain(P, 6500);
  check('race', 'the Bloom chain levels up', P.bloom.lvl === 4, P.bloom.lvl);
  OB.bus.emit('car:crash', { car: 'p1' });
  check('race', 'a crash halves the chain and drops a level', P.bloom.lvl === 3, P.bloom.lvl);
  const sc = P.score; OB.bus.emit('nearmiss', { car: 'p1' }); r.phase = 'run';  OB.bus.emit('nearmiss', { car: 'p1' });
  check('race', 'a near miss scores by the chain level', P.score - sc >= 500 * 3, (P.score - sc).toFixed(0));
});

S('playthrough-arcade', () => {
  const { OB } = boot();
  for (let k = 0; k < 16; k++) {
    const plan = [0, 1, 2, 3].map(i => (k >> i) & 1 ? 'R' : 'L');
    const r = OB.Race.create({ mode: 'arcade', bot: { plan }, seed: 3 + k });
    raceTo(r, () => r.done, 600);
    const s = r.snapshot(), goal = OB.STAGES[s.stages[4]] && OB.STAGES[s.stages[4]].goal;
    check('playthrough-arcade', 'route ' + plan.join('') + ' reaches goal ' + goal, r.done && r.done.reason === 'goal' && s.goal === goal, JSON.stringify({ done: r.done, stages: s.stages, left: r.p1.timeLeft }));
    check('playthrough-arcade', 'route ' + plan.join('') + ' has no errors', OB.game.errors.length === 0);
  }
});

S('requests', () => {
  const { OB } = boot();
  const run = (type, mode) => {
    OB.cheats.perfectRequests = false;
    const st = Object.keys(OB.STAGES).find(id => OB.STAGES[id].slots.some(s => s.type === type)) || 'S4';
    const r = OB.Race.create({ mode: 'love', startStage: st, startline: false, countdown: 0, bot: mode === 'pass' ? { seek: true } : { avoid: false, line: 0 }, seed: 9, traffic: type === 'pass' || type === 'close' || type === 'draft' || type === 'clean' ? 1 : .2, requestTypes: [] });
    r.step(1 / 120); const W = OB.World.get(st); r.teleport(r.p1, st, 160 * OB.SEG, 200);
    const q = r.requests.start(type); let res = null; const off = OB.bus.on('req:end', d => { res = d; });
    const c = r.p1.car;
    raceTo(r, () => {
      if (q.phase === 'active' && mode === 'pass') {
        if (type === 'pass' || type === 'close') OB.bus.emit(type === 'pass' ? 'overtake' : 'nearmiss', { car: 'p1', clean: true });
        if (type === 'drift' && r.t % 1 < 1 / 120) OB.bus.emit('drift:end', { car: 'p1', score: 3000 });
        if (type === 'speed') c.v = Math.max(c.v, q.v + 10);
        if (type === 'draft') c.slip = 1;
      }
      if (q.phase === 'active' && mode === 'fail') { if (type === 'clean') OB.bus.emit('car:bump', { car: 'p1' }); if (type === 'speed') c.v = Math.min(c.v, 150); if (type === 'bees') { for (const o of r.objects) if (o.kind === 'bee' && o.alive) { o.x0 = c.x; o.sway[0] = 0; } } if (type === 'photo') r.p1.bot.o.slow = 0; if (['balloons', 'gnomes', 'bouquets', 'arches', 'cones', 'ribbons'].includes(type)) for (const o of q.objs) o.alive = false; }
      return res;
    }, 60);
    off(); return res;
  };
  for (const type of OB.REQUEST_TYPES) {
    const p = run(type, 'pass'), f = run(type, 'fail');
    check('requests', type + ': a good run rates Perfect or Great', p && p.rating <= 1, JSON.stringify(p));
    check('requests', type + ': a bad run rates Miss or Good', f && f.rating >= 2, JSON.stringify(f));
  }
  const { OB: O2 } = boot(); const r = O2.Race.create({ mode: 'love', passenger: 'juni', startline: false, countdown: 0, requestTypes: [] }); r.step(1 / 120);
  r.requests._rate(Object.assign(r.requests.start('drift'), { got: 1e6 }));
  check('requests', 'a favourite request earns ×1.2 petals', r.p1.petals === 6, r.p1.petals);
  O2.bus.emit('car:crash', { car: 'p1' });
  check('requests', 'a spin-out costs 2 petals', r.p1.petals === 4, r.p1.petals);
  check('requests', 'the grade follows the petals', O2.gradeOf(.93) === 'AAA' && O2.gradeOf(.6) === 'B' && O2.gradeOf(.1) === 'E');
});

S('missions', () => {
  const { OB } = boot();
  for (const m of OB.MISSIONS) {
    const cfg = OB.Tour.config(m, { car: 'gardenia' }); const r = OB.Race.create(Object.assign(cfg, { bot: { seek: true, plan: ['L', 'R', 'L', 'R'] } }));
    check('missions', m.id + ' builds its rules', !!r.rules && typeof r.rules.result === 'function');
    if (['B1', 'M1', 'V2', 'B4', 'M3'].includes(m.id)) {
      raceTo(r, () => r.done, 300); const res = r.rules.result();
      check('missions', m.id + ' is cleared by the bot', res.cleared, JSON.stringify(res));
    }
  }
  const p = OB.Profile.p; p.seeds = 0;
  const a = OB.Profile.mission('B1', { cleared: true, rank: 'B', value: 6 }), b = OB.Profile.mission('B1', { cleared: true, rank: 'B', value: 6 }), c = OB.Profile.mission('B1', { cleared: true, rank: 'AAA', value: 14 });
  check('missions', 'rewards pay once per rank improvement', a.seeds === 188 && b.seeds === 0 && c.seeds === 113, [a.seeds, b.seeds, c.seeds].join());
  check('missions', 'unlock chains open the next postcard', OB.Tour.unlocked(OB.MISSION.B2, p) && !OB.Tour.unlocked(OB.MISSION.B3, p));
  for (const m of OB.MISSIONS.slice(0, 8)) p.career[m.id] = { cleared: true, rank: 'C' };
  check('missions', 'the Finale stays shut at 8 cleared', !OB.Tour.unlocked(OB.MISSION.F, p));
  p.career.J1 = { cleared: true, rank: 'C' };
  check('missions', 'the Finale opens at 9 cleared', OB.Tour.unlocked(OB.MISSION.F, p));
});

S('economy', () => {
  const { OB } = boot(); const p = OB.Profile.p;
  let seeds = 0; for (const m of OB.MISSIONS) seeds += Math.round(m.seeds * OB.RANK_MULT.A);
  seeds += 6 * 220;
  const total = OB.BEDS.reduce((a, b) => a + b.cost, 0);
  check('economy', 'every bed affordable with 14 A ranks and 6 runs', seeds >= total, seeds + ' vs ' + total);
  p.seeds = 50; check('economy', 'too few seeds are refused', !OB.Profile.buy('pastel').ok);
  p.seeds = 5000; for (const m of OB.MISSIONS) p.career[m.id] = { cleared: true, rank: 'A' };
  check('economy', 'planting a car bed unlocks the car', OB.Profile.buy('gardenia').ok && p.unlocked.cars.includes('gardenia'));
  check('economy', 'planting a song bed unlocks the station', OB.Profile.buy('songMoon').ok && OB.Radio.available().includes(6));
  check('economy', 'a locked bed cannot be planted', (() => { p.career = {}; return !OB.Profile.buy('magnolia').ok; })());
});

S('trial', () => {
  const { OB } = boot();
  const r = OB.Race.create({ mode: 'trial', clock: 'up', route: { stages: ['S1'], end: 'sprint' }, traffic: false, bot: {}, trialKey: 'S1' });
  raceTo(r, () => r.done, 200);
  check('trial', 'a trial finishes with a time', r.p1.finished && r.raceT > 20, r.raceT);
  const tr = OB.Profile.trial('S1', r.raceT, r.ghostRec);
  check('trial', 'the best time is recorded', tr.best && OB.Profile.p.records.stage.S1.time === r.raceT);
  const saved = JSON.parse(JSON.stringify(OB.Profile.p.records.stage.S1.ghost));
  const r2 = OB.Race.create({ mode: 'trial', clock: 'up', route: { stages: ['S1'], end: 'sprint' }, traffic: false, bot: {}, ghost: saved });
  raceTo(r2, () => r2.raceT > 10, 30); const gd = r2.ghost.data, i = Math.floor(r2.raceT * 10);
  check('trial', 'the ghost replays its recorded positions', gd[i] && gd[i][0] === 'S1' && Math.abs(gd[i][1] - r.ghostRec[i][1]) < 1);
  check('trial', 'a medal comes from par', ['bronze', 'silver', 'gold', 'bloom', null].includes(tr.medal));
});

S('versus', () => {
  const { OB, game } = boot();
  const r = OB.Race.create({ mode: 'versus', players: 2, route: OB.ROUTES.flower, bots: [{}, { skill: .95 }], seed: 4 });
  raceTo(r, () => r.done, 300);
  check('versus', 'two bots finish the Flower Sprint', r.players.every(P => P.finished), r.players.map(P => P.car.stage + ':' + P.finished).join());
  check('versus', 'places are given', new Set(r.players.map(P => P.place)).size === 2);
  game.addPlayer({ keys: 'right' }); game.advance(.1);
  check('versus', 'a second player joins on half the keyboard', game.players.length === 2, game.players.length);
  const r2 = OB.Race.create({ mode: 'versus', players: 2, route: OB.ROUTES.flower, startline: false, countdown: 0 }); r2.step(1 / 120); game.players[1].hold('gas'); for (let i = 0; i < 240; i++) r2.step(1 / 120);
  check('versus', 'player 2 drives with their own keys', r2.players[1].car.v > 40 && r2.players[0].car.v < 5, r2.players.map(P => P.car.v.toFixed(0)).join());
});

S('hub', () => {
  let log = { sends: 0, progress: 0, results: [], answers: [], connect: null, ready: 0 }, handlers = {}, now = -Infinity;
  const hub = { active: true, connect(o) { log.connect = o; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ana', color: '#e8443a' }, { id: 1, name: 'Boï', color: '#3b82f6' }], seed: 42, mode: 'ghost' }); }, ready() { log.ready++; }, answer(a) { log.answers.push(a); }, on(n, f) { (handlers[n] || (handlers[n] = [])).push(f); return () => {}; }, time: () => now, send() { log.sends++; return true; }, progress() { log.progress++; }, result(r) { log.results.push(r); }, rng: l => { let s = 7; for (const c of l) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; } };
  const { game, OB, snap } = boot({ hub });
  const fire = (n, d) => (handlers[n] || []).forEach(f => f(d));
  return new Promise(res => setTimeout(() => {
    game.advance(.5);
    check('hub', 'connect asks for ghost, 1-4 seats and our card', log.connect && log.connect.mode === 'ghost' && log.connect.seats.join() === '1,4' && log.connect.card === true);
    check('hub', 'the title is skipped for our card', snap().scene === 'hubcard', snap().scene);
    check('hub', 'ready() comes with no key press', log.ready === 1);
    game.input.tap('confirm'); game.advance(.1); game.input.tap('more'); game.advance(.1);
    check('hub', 'Enter answers ready, T asks for more time', log.answers[0] === 'ready' && log.answers.includes('more'), log.answers.join());
    now = -3000; fire('start', { in: 3000 }); game.advance(.2);
    check('hub', 'start opens the race', snap().scene === 'race');
    game.advance(1); check('hub', 'the cars wait for the hub clock', snap().race.v === 0 && snap().race.phase === 'countdown');
    check('hub', 'sends and progress start at start', log.sends >= 8 && log.progress >= 1, log.sends + ' ' + log.progress);
    now = 10; game.advance(.1); game.advance(1); check('hub', 'GO at time 0', snap().race.phase === 'run');
    const s0 = log.sends; game.advance(2); check('hub', 'ghost sends at about 10 Hz', log.sends - s0 >= 16 && log.sends - s0 <= 24, log.sends - s0);
    check('hub', 'the session has no pause-menu extras', game.o.menu.items().length === 0 && game.o.menu.quit === false);
    handlers.message.forEach(f => f({ t: 'g', area: 'S1', z: 9000, x: .3, v: 200, yaw: 0 }, 1)); game.advance(.1);
    check('hub', 'other players show as ghosts', OB.Hub.ghosts().length === 1 && OB.Hub.ghosts()[0].name === 'Bo?', JSON.stringify(OB.Hub.ghosts()));
    fire('time-up', { graceMs: 2000 }); fire('time-up', { graceMs: 2000 });
    check('hub', 'time-up reports a score once', log.results.length === 1 && typeof log.results[0].score === 'number', JSON.stringify(log.results));
    fire('end', { reason: 'finished' }); const z = snap().race.z; game.advance(1);
    check('hub', 'end freezes the game', snap().race.z === z && OB.Hub.ended);
    check('hub', 'no errors in a session', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
    // a finish reports a time
    const b2 = boot({ hub: Object.assign({}, hub, { connect: () => Promise.resolve({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }], seed: 1 }) }) });
    setTimeout(() => {
      now = 1000; b2.game.advance(.3); handlers = handlers; b2.OB.Hub.started = true; b2.game.go('race', b2.OB.Hub.raceCfg(), { fade: 0 }); b2.game.advance(.2);
      const r = b2.OB.race; r.p1.bot = new b2.OB.Brain({}); r.cd = 0; r.phase = 'run'; r.p1.car.held = false;
      log.results = []; now = 5000;
      let n = 0; while (!r.p1.finished && n < 400) { b2.game.advance(1); n++; now += 1000; }
      b2.game.advance(.2);
      check('hub', 'the finish reports a time', log.results.length === 1 && typeof log.results[0].time === 'number', JSON.stringify(log.results));
      res();
    }, 10);
  }, 10));
});

S('attract', () => {
  const { game, OB, snap, I, store } = boot();
  game.advance(9.5); check('attract', '9.5 s idle stays on the title', snap().scene === 'title');
  game.advance(1); check('attract', '10 s idle starts the attract mode', snap().scene === 'attract', snap().scene);
  const keys = Object.keys(store).join(); const seen = new Set(); const off = OB.bus.on('*', (d, n) => seen.add(n));
  for (let i = 0; i < 100; i++) { game.advance(1); }
  off();
  for (const e of ['go', 'fork:choose', 'drift:start', 'req:end']) check('attract', 'the demo shows ' + e, seen.has(e));
  check('attract', 'the demo reaches the ending and the table', S_phases(OB).size >= 5, [...S_phases(OB)].join());
  check('attract', 'the demo writes no save', Object.keys(store).join() === keys);
  I.tap('confirm'); game.advance(.5);
  check('attract', 'any input returns to the title', snap().scene === 'title', snap().scene);
  game.go('menu', {}, { fade: 0 }); game.advance(11); check('attract', 'the menu starts it too', snap().scene === 'attract');
  game.input.feed('move', 100, 100); game.advance(.1); game.input.feed('move', 140, 120); game.advance(.3);
  check('attract', 'a mouse move returns to the menu', snap().scene === 'menu', snap().scene);
  check('attract', 'no errors in the demo', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});
const S_phases = OB => OB.__phases || new Set();

S('touch', () => {
  const { game, OB, snap } = boot(); OB.Touch.force(true); game.go('title', {}, { fade: 0 }); game.advance(.5);
  check('touch', 'touch-only shows the notice', snap().touchOnly);
  check('touch', 'no touch buttons', game.input.touchEnabled === false && Object.values(OB.SCENES).every(s => Array.isArray(s.touch) && !s.touch.length));
  game.advance(10.5); check('touch', 'the attract mode runs anyway', snap().scene === 'attract');
  game.input.lastDevice = 'touch'; game.input.feed('down', 50, 50, { touch: true }); game.input.feed('up', 50, 50, { touch: true }); game.advance(.3);
  check('touch', 'a tap does not end the demo', snap().scene === 'attract', snap().scene);
  OB.Touch.force(null);
});

S('ui', () => {
  const { game, OB, snap, I } = boot(); game.advance(.5); OB.Profile.p.seenIntro = true;
  const tapA = (a, s = .3) => { I.tap(a); game.advance(s); };
  tapA('confirm', .6); check('ui', 'title to menu', snap().scene === 'menu');
  const visit = (k, scene) => { game.go('menu', { focus: k }, { fade: 0 }); game.advance(.3); tapA('confirm', .6); const ok = snap().scene === scene; tapA('cancel', .6); return ok && snap().scene !== scene; };
  ['garage', 'garage', 'tour', 'trial', 'versus', 'garden'].forEach((sc, k) => { const got = visit(k, sc); check('ui', 'menu card ' + k + ' opens ' + sc + ' and backs out', got, snap().scene); });
  for (const [scene, d] of [['howto', {}], ['about', {}], ['radio', { mode: 'arcade' }], ['brief', { id: 'B1' }], ['credits', {}]]) { game.go(scene, d, { fade: 0 }); game.advance(.5); const items = snap().ui.items; check('ui', scene + ' has at most 7 focusable items', items <= 7, items); tapA('cancel', .8); check('ui', scene + ' has a way back', snap().scene !== scene, snap().scene); }
  game.go('menu', {}, { fade: 0 }); game.advance(.3); game.input.feed('move', 300, 300); game.advance(.1);
  const it = game.scene.scr.items.find(i => i.id === 'about'); game.input.feed('move', it.x + 5, it.y + 5); game.advance(.1);
  check('ui', 'the mouse hovers to focus', snap().ui.focus === 'about', snap().ui.focus);
  game.input.feed('down', it.x + 5, it.y + 5); game.input.feed('up', it.x + 5, it.y + 5); game.advance(.5);
  check('ui', 'a click picks', snap().scene === 'about', snap().scene);
  check('ui', 'no errors on the screens', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

S('glyphs', () => {
  const { game, OB } = boot();
  check('glyphs', 'PlayStation is the default', game.settings.glyphs === 'playstation');
  const opts = game.settings.spec('glyphs').options.map(o => o[0]).join();
  check('glyphs', 'the setting offers Xbox', opts === 'playstation,xbox', opts);
  const I = game.input;
  for (const dev of ['keys', 'pad', 'mouse']) for (const a of ['gas', 'brake', 'drift', 'confirm', 'cancel', 'horn', 'camera', 'radio', 'shiftUp']) { let w = 0; try { w = OB.UI.glyphW(a, { device: dev }); } catch (e) { w = -1; } check('glyphs', a + ' has a ' + dev + ' glyph', w > 4, w); }
  I.rebind('horn', 'keys', 'KeyJ'); check('glyphs', 'rebinding changes the prompt', OB.UI.codes('horn').includes('KeyJ'));
  I.lastDevice = 'gamepad'; check('glyphs', 'a pad shows pad glyphs', OB.UI.device() === 'pad');
  I.lastDevice = 'mouse'; check('glyphs', 'the mouse shows mouse glyphs', OB.UI.device() === 'mouse');
});

S('dev', () => {
  const { game, OB, snap, I } = boot();
  game.go('race', { mode: 'arcade', startline: false, countdown: 0, traffic: false }, { fade: 0 }); game.advance(.5);
  check('dev', 'the pause menu has Dev Mode', game.o.menu.items().some(i => i[0] === 'Dev Mode'));
  game.pause('player'); game.o.menu.items().find(i => i[0] === 'Dev Mode')[1](); game.advance(.1);
  check('dev', 'Dev Mode opens over the frozen race', snap().dev && !game.paused);
  const z = OB.race.p1.car.z; game.advance(1); check('dev', 'the race is frozen under it', OB.race.p1.car.z === z);
  const rw = OB.Dev.rows().find(r => r.id === 'topSpeedScale'); rw.set(.7);
  check('dev', 'a slider changes the value', OB.tuning.topSpeedScale === .7);
  OB.Dev.close(); game.resume(); OB.race.p1.bot = new OB.Brain({}); OB.race.traffic.list = []; game.advance(40);
  check('dev', 'the slider changes the car', OB.race.p1.car.v < OB.CARS.orchidea.top * .72, OB.race.p1.car.v.toFixed(0));
  OB.Dev.open(); OB.Dev.rows().find(r => r.id === 'resetAll').act();
  check('dev', 'reset restores the defaults', OB.tuning.topSpeedScale === 1);
  OB.Dev.tab = 1; const ch = OB.Dev.rows().find(r => r.id === 'infiniteTime'); ch.set(true); check('dev', 'a cheat toggles', OB.cheats.infiniteTime === true); ch.set(false);
  OB.Dev.tab = 2; check('dev', 'warp has its tools', ['warp', 'nextcp', 'fork', 'reqgo', 'endgo', 'missiongo', 'attract', 'credits'].every(id => OB.Dev.rows().some(r => r.id === id)));
  OB.Dev.rows().find(r => r.id === 'warp').act(); game.advance(.2); check('dev', 'a warp lands where it says', OB.race.p1.car.stage === 'S1' && !OB.Dev.active);
  OB.Dev.open(); OB.Dev.tab = 0; OB.Dev.rows().find(r => r.id === 'keep').set(true); OB.tuning.steerRate = 3; OB.Dev.persist();
  OB.tuning.steerRate = 2.2; OB.Dev.init(); check('dev', 'Keep after reload saves and restores', OB.tuning.steerRate === 3);
  check('dev', 'no errors in Dev Mode', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

S('save', () => {
  const { OB, store } = boot();
  OB.Profile.p.seeds = 77; OB.Profile.save(); OB.Profile.load();
  check('save', 'the profile round-trips', OB.Profile.p.seeds === 77);
  const b = boot({ setup: ctx => { ctx.localStorage.setItem('my3d2dge:outbloom:profile', JSON.stringify({ seeds: 12, cars: ['primavera', 'orchidea', 'gardenia'] })); } });
  check('save', 'a v0 profile migrates', b.OB.Profile.p.v === 1 && b.OB.Profile.p.seeds === 12 && b.OB.Profile.p.unlocked.cars.includes('gardenia'), JSON.stringify(b.OB.Profile.p.unlocked.cars));
  const c = boot({ setup: ctx => { ctx.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }; } });
  c.game.advance(.5); check('save', 'blocked storage is survived', c.game.errors.length === 0 && c.OB.Profile.p.seeds === 0);
});

S('voice', () => {
  const { OB } = boot();
  const a = OB.Voice.plan('Ooh, balloons! Pop them all for me!', 'marisol', 'excited'), b = OB.Voice.plan('Ooh, balloons! Pop them all for me!', 'marisol', 'excited');
  check('voice', 'the same line plans the same', JSON.stringify(a) === JSON.stringify(b));
  check('voice', 'syllables are counted', a.syllables.length >= 8 && a.syllables.length <= 12, a.syllables.length);
  check('voice', 'a line lasts a sensible time', a.duration > .5 && a.duration < 3, a.duration);
  const s = OB.Voice.plan('Hello there.', 'bruno', 'sad'), h = OB.Voice.plan('Hello there.', 'bruno', 'happy');
  check('voice', 'moods shift the pitch', s.syllables[0].f0 < h.syllables[0].f0);
  const p = OB.Voice.plan('Wait, what?', 'vivi', 'happy');
  check('voice', 'a question rises at the end', p.syllables[p.syllables.length - 1].f0 > p.syllables[0].f0 * .95);
});

S('audio-data', () => {
  const { OB } = boot();
  for (const [k, s] of Object.entries(OB.SONGS)) {
    check('audio-data', k + ' has named tracks', s.tracks.every(t => t.name));
    if (OB.STATIONS.some(st => st.song === k)) check('audio-data', k + ' has a sparkle layer', s.tracks.some(t => t.name === 'sparkle' && t.on === false));
    for (const t of s.tracks) if (t.wave !== 'drums') { const bad = t.notes.replace(/\|/g, ' ').trim().split(/\s+/).filter(x => !/^(\.|-|([A-G][#b]?\d(\+[A-G][#b]?\d)*!?))$/.test(x)); check('audio-data', k + '/' + t.name + ' parses', !bad.length, bad.slice(0, 3).join()); }
  }
  for (const n of ['pop', 'bonk', 'sting', 'snap', 'tok', 'harp', 'chime', 'shutter', 'beep', 'go', 'zing', 'crowd', 'thunk', 'squeal', 'scrape', 'plant', 'static']) check('audio-data', 'effect ' + n + ' exists', !!OB.SFX[n]);
  for (const j of ['start', 'checkpoint', 'reqStart', 'reqWin', 'reqFail', 'fork', 'bloom', 'goal', 'record', 'unlock', 'gameover']) check('audio-data', 'jingle ' + j + ' exists', !!OB.JINGLES[j]);
});

S('content', () => {
  const { OB } = boot();
  for (const k of ['start', 'perfect', 'great', 'good', 'miss', 'bump', 'crash', 'nearmiss', 'air', 'forkL', 'forkR', 'checkpoint', 'lowtime', 'goal', 'timeup']) for (const p of OB.PASSENGERS) check('content', 'line ' + k + ' for ' + p, (OB.LINES[k][p] || []).length >= 2);
  for (const t of OB.REQUEST_TYPES) for (const p of OB.PASSENGERS) check('content', 'request line ' + t + ' for ' + p, !!OB.REQ_LINES[t][p]);
  let endings = 0; for (const g in OB.GOALS) for (const m of ['bloom', 'bud', 'wilt']) for (const p of OB.PASSENGERS) if (OB.ENDING_LINES[g][m][p]) endings++;
  check('content', 'all 45 ending lines', endings === 45, endings);
  for (const g in OB.GOALS) check('content', 'goal ' + g + ' has its local', !!OB.CAST[OB.GOALS[g].local] && !!OB.LOCAL_LINES[OB.GOALS[g].local]);
  for (const st of Object.values(OB.STAGES)) check('content', st.id + ' slots are real requests', st.slots.every(s => OB.REQUESTS[s.type]));
  for (const m of OB.MISSIONS) check('content', m.id + ' has rules, rewards and a brief', !!OB.Rules[m.kind] && m.seeds > 0 && m.brief.length >= 2);
  for (const b of OB.BEDS) check('content', 'bed ' + b.id + ' has a cost and a source', b.cost > 0 && (!b.needs || !!OB.MISSION[b.needs]));
  const A = OB.ABOUT, empty = v => !v || /^\s*$/.test(v);
  for (const [k, v] of Object.entries(A.sourceInformation)) check('content', 'source information ' + k, !empty(v));
  check('content', 'feedback counts', A.testingFeedback.length === 4 && A.engineFeedback.length === 6 && A.promptFeedback.length === 4);
  check('content', 'the About pages build', A.pages().length >= 7 && A.credits().length > 20);
});

S('determinism', () => {
  const run = seed => { const { OB } = boot(); const r = OB.Race.create({ mode: 'arcade', bot: { plan: ['R', 'L'] }, seed }); for (let i = 0; i < 1200 * 4; i++) r.step(1 / 120); return r.hash(); };
  const a = run(5), b = run(5), c = run(6);
  check('determinism', 'the same seed gives the same run', a === b, a + ' / ' + b);
  check('determinism', 'another seed differs', a !== c);
});

/* ---- browser suites ---- */
const ROOT = new URL('../../', import.meta.url), NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-medium-20261104-035151.html';
S('bundle', async () => {
  try { execFileSync('node', ['build.mjs'], { cwd: new URL('../', import.meta.url).pathname, stdio: 'pipe' }); check('bundle', 'build and lint', true); } catch (e) { check('bundle', 'build and lint', false, String(e.stdout || e.message).slice(0, 300)); return; }
  const j = JSON.parse(readFileSync(new URL('exit-interview.json', ROOT), 'utf8'));
  check('bundle', 'exit-interview.json has every field', Object.keys(j.sourceInformation).length === 15 && j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4 && j.aiHub.tags.length >= 3);
  const html = readFileSync(new URL(NAME, ROOT), 'utf8');
  check('bundle', 'the session client is the first script after charset', /^<!doctype html>\s*<html lang="en">\s*<head>\s*<meta charset="utf-8">\s*<script>\/\*!? ?|^<!doctype html>\s*<html lang="en">\s*<head>\s*<meta charset="utf-8">\s*<script>/.test(html));
  check('bundle', 'the hub tags are there', ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto'].every(t => html.includes('name="' + t + '"')));
  const { chromium } = await import('playwright');
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1920, height: 1080 } }), errs = [], reqs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) reqs.push(u); });
  await page.goto(new URL(NAME, ROOT).href); await page.waitForTimeout(2500);
  const sn = await page.evaluate(() => window.__ob.game.debug.snapshot());
  check('bundle', 'the bundle reaches the title from file://', sn.scene === 'title', sn.scene);
  await page.keyboard.press('Enter'); await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(800); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
  for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(6000); await page.keyboard.up('KeyW');
  const s2 = await page.evaluate(() => window.__ob.game.debug.snapshot());
  check('bundle', 'keys drive a race in the browser', s2.scene === 'race' && s2.race && s2.race.v > 50, JSON.stringify({ sc: s2.scene, v: s2.race && s2.race.v }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const paused = await page.evaluate(() => window.__ob.game.paused); check('bundle', 'Escape pauses into the menu', paused);
  check('bundle', 'no console errors', !errs.length, errs.slice(0, 3).join(' | '));
  check('bundle', 'no network requests', !reqs.length, reqs.slice(0, 3).join(' '));
  await b.close();
});
S('touch-emulation', async () => {
  const { chromium, devices } = await import('playwright');
  const b = await chromium.launch(), ctx = await b.newContext(Object.assign({}, devices['iPhone 13'])), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(new URL(NAME, ROOT).href); await page.waitForTimeout(2500);
  const sn = await page.evaluate(() => window.__ob.game.debug.snapshot());
  check('touch-emulation', 'a phone sees the notice', sn.touchOnly === true, JSON.stringify(sn.touchOnly));
  await page.waitForTimeout(10500);
  const s2 = await page.evaluate(() => window.__ob.game.debug.snapshot());
  check('touch-emulation', 'the attract mode runs on a phone', s2.scene === 'attract', s2.scene);
  check('touch-emulation', 'no errors on a phone', !errs.length, errs.slice(0, 2).join('|'));
  await b.close();
});
S('hub-harness', async () => {
  const dir = new URL('../.cache/hubtest/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('../vendor/hub/' + f, import.meta.url), dir + f);
  copyFileSync(new URL(NAME, ROOT), dir + 'game.html');
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
  const { chromium } = await import('playwright'); const b = await chromium.launch();
  try {
    const p0 = await b.newPage(); await p0.goto(`http://127.0.0.1:${port}/game.html`); await p0.waitForTimeout(1200);
    check('hub-harness', 'the server serves our game', (await p0.title()) === 'OutBloom 2006: Coast 2 Coast'); await p0.close();
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']) {
      const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      let done = false; for (let i = 0; i < 240 && !done; i++) { await page.waitForTimeout(1000); done = await page.evaluate(() => document.body.dataset.complete === 'true'); }
      const r = await page.evaluate(() => window.__hubCheck || null);
      const failing = r && r.checks ? r.checks.filter(c => !c.ok).map(c => c.name || c.label || JSON.stringify(c)).slice(0, 5) : [];
      check('hub-harness', 'harness ' + q, r && r.pass === true, done ? JSON.stringify(failing) : 'did not complete');
      await page.close();
    }
  } finally { await b.close(); srv.kill(); }
});

const headless = ['core', 'road', 'junction', 'physics', 'traffic', 'race', 'requests', 'missions', 'economy', 'trial', 'versus', 'hub', 'attract', 'touch', 'ui', 'glyphs', 'dev', 'save', 'voice', 'audio-data', 'content', 'determinism', 'playthrough-arcade'];
const browser = ['bundle', 'touch-emulation', 'hub-harness'];
const list = (only || headless.concat(quick ? [] : browser));
for (const n of list) { try { await suites[n](); } catch (e) { check(n, 'runs', false, (e && e.stack || String(e)).split('\n').slice(0, 3).join(' / ')); } }
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
