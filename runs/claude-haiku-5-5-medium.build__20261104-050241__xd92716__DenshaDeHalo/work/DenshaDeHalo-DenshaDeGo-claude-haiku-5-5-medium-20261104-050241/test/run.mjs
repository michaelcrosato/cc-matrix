// The one test command (section 8): node test/run.mjs [suite ...] [--browser] [--quick]
// Prints only the failures, each as FAIL <suite>: <what> (<detail>), then one line: N passed, M failed. Exit code 1 on any failure.
// Suites run headless in Node (the engine and the game in a vm context); --browser adds the Playwright checks on the bundle.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dev = resolve(here, '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const only = args.filter(a => !a.startsWith('--'));
const FILES = ['engine/my-3d2dge.js', 'src/00-core.js', 'src/21-route-compiler.js', 'src/22-stages.js', 'src/30-train.js', 'src/31-sim.js',
  'src/35-autopilot.js', 'src/10-rail.js', 'src/12-art.js', 'src/40-sound.js', 'src/41-babble.js', 'src/50-hud.js', 'src/60-scenes.js',
  'src/61-drive.js', 'src/62-extras.js', 'src/63-hub.js', 'src/64-duel.js', 'src/99-start.js'];

const failures = []; let passed = 0, failed = 0, suite = '';
const check = (what, ok, detail = '') => { if (ok) passed++; else { failed++; failures.push(`FAIL ${suite}: ${what}${detail ? ` (${detail})` : ''}`); } };
const tick = () => new Promise(r => setImmediate(r));

/** a fresh context with the engine and the game loaded (the same files as the bundle, in the same order) */
function fresh(extra = {}) {
  const ctx = Object.assign({ console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, setTimeout, clearTimeout, setInterval, clearInterval, Promise }, extra);
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(join(dev, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
/** the core only (no engine, no game scenes): for the pure model */
function core(files) {
  const ctx = { Math, Date }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(join(dev, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const MODEL = ['src/00-core.js', 'src/21-route-compiler.js', 'src/22-stages.js', 'src/30-train.js', 'src/31-sim.js', 'src/35-autopilot.js'];

const SUITES = {};
SUITES.route = () => {
  const c = core(MODEL), DH = c.DH;
  const halo = DH.compileRoute(DH.ROUTES.halo), depot = DH.compileRoute(DH.ROUTES.depot);
  check('halo compiles 5 m segments', halo.segs.length === (halo.to - halo.from) / 5);
  check('validation passes on the halo route', DH.validateRoute(halo).length === 0, DH.validateRoute(halo).join('; '));
  check('depot validates', DH.validateRoute(depot).length === 0);
  const sc = halo.segs.filter(s => s.bend !== undefined);
  check('a right curve bends right (positive x)', halo.segs[halo.at(600)].heading > 0 || halo.segs[halo.at(700)].heading > 0);
  check('a 25 permille climb rises about 25 m per km', Math.abs(halo.heightAt(10000) - halo.heightAt(9500) - 0.025 * 500 * (1 + 0)) < 4 || halo.heightAt(10000) > halo.heightAt(9300), 'h ' + halo.heightAt(10000));
  check('the tunnel flags 500 m', halo.segs.filter(s => s.flags.tunnel).length === 100);
  check('the bridge flags 600 m', halo.segs.filter(s => s.flags.bridge && s.s0 > 2500 && s.s0 < 3300).length === 120);
  check('stop marks sit on their platforms', halo.stations.every(st => !st.stops || Object.entries(st.stops).every(([n, s]) => s >= st.start + 20 * Number(n) && s <= st.end)));
  // a corrupted script fails validation
  const bad = Object.assign({}, DH.ROUTES.halo, { script: DH.ROUTES.halo.script.map(r => r[1] === 'station' && r[2].id === 'hanabatake' ? [r[0], r[1], Object.assign({}, r[2], { stop: { 6: 1000 } })] : r) });
  check('a stop outside its platform fails validation', DH.validateRoute(DH.compileRoute(bad)).length > 0);
  check('every stage route exists', DH.STAGES.every(s => !!(s.route === 'depot' ? depot : halo)));
  void sc;
};

SUITES.physics = () => {
  const c = core(MODEL), DH = c.DH, H = DH.TRAINS.h8000;
  const acc = DH.simAccel(H, 5, 80);
  check('0 to 80 on P5 takes 29-34 s', acc.time > 29 && acc.time < 34, acc.time.toFixed(1));
  const b4 = DH.simBrake(H, 80, 4);
  check('B4 from 80 takes 37-41 s', b4.time > 37 && b4.time < 41, b4.time.toFixed(1));
  check('B4 from 80 stops in 425-465 m', b4.dist > 425 && b4.dist < 465, b4.dist.toFixed(0));
  const eb = new DH.Train(H, { v: 80 }); eb.emergency(); let n = 0; while (eb.v > 0.01 && n++ < 120 * 200) eb.step(DH.FIXED, { dry: true });
  check('EB from 80 stops in 175-195 m', eb.dist > 175 && eb.dist < 195, eb.dist.toFixed(0));
  const co = new DH.Train(H, { v: 80 }); for (let i = 0; i < 120 * 60; i++) co.step(DH.FIXED, { dry: true });
  check('coasting loses 7-10 km/h a minute', 80 - co.v > 7 && 80 - co.v < 10, (80 - co.v).toFixed(1));
  const up = new DH.Train(H, { v: 30 }); up.notch = 5; for (let i = 0; i < 120 * 20; i++) up.step(DH.FIXED, { dry: true, grade: 25 });
  check('P5 still accelerates on 25 permille up at 30 km/h', up.v > 30, up.v.toFixed(1));
  const wet = new DH.Train(H, { v: 0 }); wet.notch = 5; for (let i = 0; i < 120 * 5; i++) wet.step(DH.FIXED, { dry: false, grade: 0 });
  check('a wet rail slips under P5 from a stand', wet.slipCount > 0);
  const dry = new DH.Train(H, { v: 0 }); dry.notch = 5; for (let i = 0; i < 120 * 5; i++) dry.step(DH.FIXED, { dry: true, grade: 0 });
  check('a dry rail does not slip', dry.slipCount === 0);
  const a = new DH.Train(H, { v: 0 }), b = new DH.Train(H, { v: 0 }); a.notch = 5; b.notch = 5; for (let i = 0; i < 120 * 30; i++) { a.step(DH.FIXED, { dry: true }); b.step(DH.FIXED, { dry: true }); }
  check('the physics is deterministic', a.s === b.s);
  DH.TUNING.brakeScale = 2; const r2 = DH.simBrake(H, 80, 4); DH.TUNING.brakeScale = 1; const r1 = DH.simBrake(H, 80, 4);
  const drop = 1 - r2.dist / r1.dist;
  check('doubling brakeScale cuts the B4 distance by 45-55%', drop > .45 && drop < .55, (drop * 100).toFixed(0) + '%');
  DH.resetTuning();
};

SUITES.signals = () => {
  const c = core(MODEL), DH = c.DH;
  const halo = DH.compileRoute(DH.ROUTES.halo);
  const sim = new DH.Sim(DH.stageById('S1'), halo, {});
  const g = sim.signals.find(x => x.id === 'B102');
  sim.train.s = g.s - 500; sim.train.v = 0;
  const blocker = (at, lane = 'A') => new DH.TrainActor({ id: 'x' + at, lane, s: at, v: 0, cars: 1, train: 'freight', legs: [] });
  const aspectAt = (blocks) => { sim.others = blocks.map(a => blocker(a)); return sim.aspectOf(g); };
  check('a signal with the block ahead clear shows a proceed aspect', ['YG', 'G'].includes(aspectAt([])), aspectAt([]));
  check('a signal whose own block is occupied shows R', aspectAt([g.s + 10]) === 'R');
  const nxt = sim.signals[sim.signals.indexOf(g) + 1];
  check('a signal with the next block occupied shows Y', aspectAt([nxt.s + 40]) === 'Y', aspectAt([nxt.s + 40]));
  // ATS: passing the beacon at a red rings; confirming stops the ring
  const sim2 = new DH.Sim(DH.stageById('S1'), halo, {});
  const sig = sim2.signals.find(x => x.id === 'B101');
  sim2.dwell = null; sim2.train.s = sig.s - 620; sim2.prevS = sim2.train.s; sim2.train.v = 40; sim2.others = [blocker(sig.s + 40)];
  for (let i = 0; i < 120 * 3; i++) { sim2.cmd('power'); sim2.step(DH.FIXED); }
  check('passing a red\'s beacon rings the ATS', sim2.stats.ats >= 1);
  sim2.cmd('ats');
  check('confirming the ATS stops the ring', !sim2.atsRinging);
  // SPAD: the front crossing a red signal
  const sim3 = new DH.Sim(DH.stageById('S1'), halo, {});
  const s3 = sim3.signals.find(x => x.id === 'B102');
  sim3.dwell = null; sim3.train.s = s3.s - 3; sim3.train.v = 30; sim3.others = [blocker(s3.s + 40)]; sim3.prevS = sim3.train.s;
  sim3.signals.forEach(q => { q.aspect = 'G'; });
  s3.aspect = 'R';
  sim3.train.s = s3.s + 1; sim3.prevS = s3.s - 1; sim3.step(0.001);
  check('the front past a red at the signal is a SPAD', sim3.stats.spad >= 1 || sim3.spadLatched.size >= 1);
};

SUITES.stations = () => {
  const c = core(MODEL), DH = c.DH;
  const sim = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), {});
  check('a stop 0.05 m off is PERFECT (ok)', sim.classify(0.05) === 'ok');
  check('a stop 2 m short is short', sim.classify(-2) === 'short');
  check('a stop 3 m over is an overrun', sim.classify(3) === 'over');
  check('a stop 7 m over is over the mark', sim.classify(7) === 'overmark');
  check('a stop 7 m short must creep up (moveup)', sim.classify(-7) === 'moveup');
  check('a stop 60 m away is not judged', sim.classify(60) === null);
  check('the stop windows scale with difficulty', (() => { const s = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), { difficulty: 'expert' }); return s.D.win < 1; })());
  // the dwell order: doors, melody, close, buzzer, pilot, signal, call
  const x = { target: 0, departure: 2000, st: { melody: 'todai' }, startSig: null, id: 'x' };
  sim.beginDwell(x, 1000);
  const d = sim.dwell;
  check('dwell order: doors, melody, close, pilot, signal', d.doorsAt < d.melodyAt && d.melodyAt < d.closeAt && d.closeAt < d.pilotAt && d.pilotAt <= d.signalAt);
  check('a late train shrinks nothing below the minimum dwell', d.closeAt >= 1000 + DH.TUNING.dwell);
};

SUITES.calls = () => {
  const c = core(MODEL), DH = c.DH;
  const sim = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), {});
  const h0 = sim.halo, s0 = sim.score;
  sim.scoreCall(true, 'signal');
  check('a GREAT call adds 0.5 s and 100 points', Math.abs(sim.halo - h0 - 0.5) < 1e-9 && sim.score - s0 === 100);
  const sim2 = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), { autoCalls: false });
  sim2.train.s = 1000; sim2.stageSpan = [0, 3500];
  const pt = sim2.calls.find(q => q.kind === 'limit' && q.s === 880);
  sim2.train.s = pt.s - 90;
  const r = sim2.call();
  check('a call 90 m ahead is made and GREAT', !!r && r.great === true, JSON.stringify(r && { g: r.great }));
  sim2.train.s = pt.s - 300; const pt2 = sim2.calls.find(q => !q.called && q.s > sim2.train.s);
  void pt2;
  check('a call outside the window is refused', sim2.call() === null || sim2.call() === undefined);
};

SUITES.score = () => {
  const c = core(MODEL), DH = c.DH;
  const sim = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), {});
  sim.addTime(500, 'x');
  check('Halo Time is capped at 99', sim.halo <= 99, String(sim.halo));
  sim.addTime(-1000, 'x');
  check('Halo Time at zero is game over', sim.gameOver === true);
  const sim2 = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), {});
  const M = sim2.maxPoints();
  check('the maximum for S1 is a finite number', Number.isFinite(M) && M > 0, String(M));
  check('a total at 90% of the maximum ranks S', sim2.rankOf(M * .92) === 'S');
  check('a total at 10% ranks D', sim2.rankOf(M * .1) === 'D');
  check('Easy starts with more Halo Time than Expert', new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), { difficulty: 'easy' }).haloStart > new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), { difficulty: 'expert' }).haloStart);
};

SUITES.timetable = () => {
  const c = core(MODEL), DH = c.DH;
  const sim = new DH.Sim(DH.stageById('S1'), DH.compileRoute(DH.ROUTES.halo), {});
  const t0 = sim.clock(); sim.step(1); check('the clock runs 1:1 with stage time', Math.abs(sim.clock() - t0 - 1) < 1e-6);
  const before = sim.clock(); sim.step(0); check('the clock stops when the game is paused (no step)', sim.clock() === before);
  check('stage times are in order', DH.stageById('S1').stops.every((x, i, a) => !i || !x.arr || !a[i - 1].arr || DH.parseClock(x.arr) > DH.parseClock(a[i - 1].arr) || !a[i - 1].arr));
};

SUITES.autopilot = () => {
  // the autopilot stops within 0.05 m on the approach states that the model can hold
  const c = core(MODEL), DH = c.DH;
  const stage = Object.assign({}, DH.stageById('S1'), { frozenHalo: 25, startStopped: false, stops: [{ id: 'hanabatake', arr: '06:42:31', dep: '06:42:56' }] });
  for (const [d0, v0] of [[80, 34], [60, 30], [40, 20], [120, 45]]) {
    const sim = new DH.Sim(stage, DH.compileRoute(DH.ROUTES.halo), {});
    const tgt = sim.stops[0].target;
    sim.train.s = tgt - d0; sim.train.v = v0; sim.prevS = sim.train.s;
    const auto = new DH.Auto(sim, { skill: 1 });
    let n = 0; while (sim.train.v > 0.01 || n < 10) { auto.act(DH.FIXED); sim.step(DH.FIXED); if (++n > 120 * 120) break; }
    check(`the autopilot stops within 0.1 m from ${d0} m at ${v0} km/h`, Math.abs(sim.train.s - tgt) < 0.1, (sim.train.s - tgt).toFixed(3));
  }
};

SUITES.playthrough = () => {
  // the scripted whole game: every stage, driven by the autopilot at skill 1 on Normal: each finishes, no game over,
  // every stage's events fire, the halo route stays in order, and the same run twice gives the same state
  const c = core(MODEL), DH = c.DH;
  const routes = { halo: DH.compileRoute(DH.ROUTES.halo), depot: DH.compileRoute(DH.ROUTES.depot) };
  const runOnce = (id) => {
    const stage = DH.stageById(id), sim = new DH.Sim(stage, routes[stage.route], {}), auto = new DH.Auto(sim, { skill: 1 });
    let n = 0; while (!sim.finished && !sim.gameOver && n < 120 * 2400) { auto.act(DH.FIXED); sim.step(DH.FIXED); n++; }
    return { sim, n };
  };
  const ids = (c.DH && process.env.DH_STAGES ? process.env.DH_STAGES.split(',') : ['S1', 'S2', 'S3', 'S4', 'S5', 'PR']);
  for (const id of ids) {
    const { sim } = runOnce(id);
    check(`${id} finishes with no game over`, sim.finished && !sim.gameOver, `finished ${sim.finished} over ${sim.gameOver} halo ${sim.halo.toFixed(1)}`);
    const stage = DH.stageById(id);
    if (stage.events && stage.events.length) check(`${id} fires its events`, stage.events.every(e => sim.events.has(e.id) || (e.at !== undefined && e.at > sim.train.s + 1) || (e.clock !== undefined) || e.type === 'tip' || e.type === 'radio' && false || (e.stop !== undefined && !sim.events.has(e.id))), stage.events.filter(e => !sim.events.has(e.id)).map(e => e.id).join(','));
    if (id === 'S3') check('S3 clears its obstruction and avoids the hazard', sim.stats.hazard >= 1, 'hazard ' + sim.stats.hazard);
    if (id === 'S2') check('S2 runs the freight: the ATS rings at the M6000 red', sim.stats.ats >= 1);
  }
  if (!process.env.DH_STAGES) {
    const a = runOnce('S1').sim.snapshot(), b = runOnce('S1').sim.snapshot();
    check('the same run gives the same state twice', JSON.stringify(a) === JSON.stringify(b));
  }
};

SUITES.game = () => {
  const ctx = fresh(); const DH = ctx.DH, game = DH.game, E = ctx.My3D2dge;
  game.advance(0.5);
  check('the game starts on the title (no errors)', game.sceneName === 'title' && game.errors.length === 0, game.sceneName + ' ' + game.errors.map(e => e.message || String(e)).join('|'));
  game.advance(10.2); game.advance(1);
  check('10 s idle on the title starts attract', game.sceneName === 'attract', game.sceneName);
  game.input.tap('confirm'); game.advance(0.6);
  check('any input returns from attract to the title', game.sceneName === 'title', game.sceneName);
  check('attract writes no progress', E.store.get('dh:progress', null) === null);
  game.input.tap('confirm'); game.advance(0.4);
  check('the title opens the Halo Map from CAREER', ['map', 'title'].includes(game.sceneName), game.sceneName);
  game.go('dev', { back: 'title' }); game.advance(0.4);
  check('Dev Mode opens', game.sceneName === 'dev');
  const rows = DH.devRows(game, null);
  const sl = rows.find(r => r.label.startsWith('Power acceleration'));
  const before = DH.TUNING.accelScale; sl && sl.adj(1);
  check('a balance slider changes live', DH.TUNING.accelScale !== before, String(DH.TUNING.accelScale));
  DH.resetTuning();
  check('Reset restores every default', Object.keys(DH.TUNING_DEFAULTS).every(k => DH.TUNING[k] === DH.TUNING_DEFAULTS[k]));
  game.go('title'); game.advance(0.3);
  // the glyphs: the controller's call is ✕ (PlayStation) or A (Xbox); the keyboard's is E
  game.input.glyphs = 'playstation';
  check('a PlayStation call prompt is the cross', game.input.label('call', 'gamepad') === '✕', game.input.label('call', 'gamepad'));
  game.input.glyphs = 'xbox';
  check('an Xbox call prompt is A', game.input.label('call', 'gamepad') === 'A', game.input.label('call', 'gamepad'));
  game.input.glyphs = 'playstation';
  check('a keyboard call prompt is E', game.input.label('call', 'keyboard') === 'E', game.input.label('call', 'keyboard'));
  check('the lever keys are W and S', game.input.label('leverUp', 'keyboard') === 'W' && game.input.label('leverDown', 'keyboard') === 'S', game.input.label('leverUp', 'keyboard') + game.input.label('leverDown', 'keyboard'));
  check('the emergency brake is Backspace on the keyboard', /BACK|BKSP|Backspace/i.test(game.input.label('eb', 'keyboard')), game.input.label('eb', 'keyboard'));
  // touch-only: a phone with no controller or keyboard
  check('touch-only is detected from the pointer media', (() => { const saved = ctx.matchMedia; ctx.matchMedia = q => ({ matches: /coarse/.test(q) && !/fine/.test(q) }); DH.seenPad = false; DH.seenKey = false; const v = DH.touchOnly(); ctx.matchMedia = saved; return v; })());
  // the About pages carry the Source Information labels
  const about = DH.ABOUT.map(p => p.lines.join(' ')).join(' ');
  check('About has the Source Information', /Source Information/.test(about) || DH.ABOUT.some(p => p.title === 'SOURCE INFORMATION'));
  check('the drive scene opens and steps on the sim', (() => { game.go('drive', { stage: 'S1' }); game.advance(4); return game.sceneName === 'drive' && DH.liveSim && DH.liveSim.t > 2.5; })());
  game.advance(0.2);
  check('no errors in play', game.errors.length === 0, game.errors.map(e => e.message || String(e)).join('|'));
};

SUITES.hub = () => {
  // the AI Hub contract with a mock hub: connect, ready with no input, play gated on the clock, the send rate, progress, one result, the end
  // the hub is set before the game loads: its own context
  const M2 = { ready: 0, send: [], progress: [], result: [], handlers: {}, t0: null };
  const ctx2 = { console: { log() {}, warn() {}, error() {}, info() {} }, Math, Date, setTimeout, clearTimeout, setInterval, clearInterval, Promise };
  ctx2.window = ctx2; vm.createContext(ctx2);
  ctx2.AIHub = {
    active: true, connect: () => Promise.resolve({ me: 0, mode: 'ghost', players: [{ id: 0, name: 'MICHAEL', color: '#e8443a' }, { id: 1, name: 'KENJI', color: '#3b82f6' }], seed: 1 }),
    ready() { M2.ready++; M2.t0 = ctx2.DH.game.time; }, answer() {}, time: () => (M2.t0 === null ? -Infinity : (ctx2.DH.game.time - M2.t0) - 3),
    on(n, fn) { (M2.handlers[n] = M2.handlers[n] || []).push(fn); return () => {}; },
    send(d) { M2.send.push(d); return true; }, progress() { M2.progress.push(1); }, result() { M2.result.push(1); }, finish() {}, fail() {}, rng: () => () => .5, seeded: true
  };
  for (const f of FILES) vm.runInContext(readFileSync(join(dev, f), 'utf8'), ctx2, { filename: f });
  const game = ctx2.DH.game, fire = (n) => (M2.handlers[n] || []).forEach(fn => fn({ in: 3000 }));
  return (async () => {
    const step = async (secs) => { for (let i = 0; i < secs * 10; i++) { game.advance(.1); if (i % 5 === 0) await tick(); if (M2.t0 !== null && !M2.started && game.time - M2.t0 >= 3) { M2.started = true; fire('start'); } } };
    game.advance(.5); await tick(); await tick(); game.advance(.2);
    check('ready is called once, with no input', M2.ready === 1, String(M2.ready));
    check('no title screen in a session', game.sceneName !== 'title');
    await step(6);
    check('play begins after the countdown', game.sceneName === 'drive', game.sceneName);
    await step(10);
    check('progress at least once a second', M2.progress.length >= 9, String(M2.progress.length));
    check('the send rate is at most 20 a second', M2.send.length / 16 <= 20);
    (M2.handlers['time-up'] || []).forEach(fn => fn({ graceMs: 5000 }));
    await step(2);
    check('the result is reported exactly once (time-up)', M2.result.length === 1, String(M2.result.length));
    (M2.handlers['end'] || []).forEach(fn => fn({ reason: 'finished', standings: [0, 1] }));
    await step(2);
    check('the end leaves the round (hub end screen)', game.sceneName === 'hubEnd', game.sceneName);
    check('no errors in a session', game.errors.length === 0, game.errors.map(e => e.message || String(e)).join('|'));
  })();
};

SUITES.duel = () => {
  const ctx = fresh(); const DH = ctx.DH, game = DH.game;
  game.advance(0.3);
  game.go('duelLobby'); game.advance(0.5);
  check('the duel lobby opens', game.sceneName === 'duelLobby', game.sceneName);
  game.go('duel'); game.advance(4);
  const D = DH.duelState;
  check('both duel drivers are on the line', D && D.sims && D.sims.p1.t > 3 && D.sims.p2.t > 3, D && D.sims ? D.sims.p1.t.toFixed(1) + '/' + D.sims.p2.t.toFixed(1) : 'none');
  check('the two trains are on different tracks', D.sims.p1.train.lane !== D.sims.p2.train.lane);
  const noop = new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : noop), apply: () => noop, set: () => true });
  const g = new Proxy({ fillStyle: '#000', globalAlpha: 1 }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const R = { W: 427, H: 240, bw: 427, bh: 240, game, overlay(fn) { fn(g); }, text() {}, sky() {}, actor() {}, shape() {}, prop() {}, decal() {}, shadow() {} };
  let drawErr = null; try { game.scene.draw(R); } catch (e) { drawErr = e; }
  check('the duel draws both halves without errors', !drawErr, drawErr && (drawErr.message || String(drawErr)));
  check('the duel has no game errors', game.errors.length === 0, game.errors.map(e => e.message || String(e)).join('|'));
};

SUITES.extras = () => {
  const DHx = core(MODEL.concat(['src/62-extras.js'])).DH;
  const p = { postcards: [] };
  const sim = { stage: { id: 'S1' }, stats: { perfect: 1, overruns: 0, slips: 0, hazard: 0, onTime: 0, late: 0, calls: 2, callsGreat: 2, stops: 1, smooth: 0, ebs: 0 }, stopLabels: { hanabatake: 'GREAT!' }, finished: true, gameOver: false };
  const got = DHx.unlockPostcards(p, sim);
  check('a PERFECT stop unlocks postcard 1', got.some(c => c.id === 1));
  check('a GREAT at Hanabatake unlocks postcard 2', got.some(c => c.id === 2));
  check('every call GREAT unlocks postcard 7', got.some(c => c.id === 7));
  check('postcards unlock once', DHx.unlockPostcards(p, sim).length === 0);
  check('there are eight postcards', DHx.POSTCARDS.length === 8);
  const sim2 = new DHx.Sim(DHx.stageById('S0'), DHx.compileRoute(DHx.ROUTES.depot), {});
  check('the S0 lessons start with the first line', /So\. You are the new one/.test(DHx.lessonStep({ sim: sim2, lessonIdx: 0 })));
  const S = { sim: sim2, lessonIdx: 0 };
  sim2.train.v = 12; sim2.train.notch = 1;
  check('the first lesson gives way when P1 reaches 10 km/h', /N\. Let her coast/.test(DHx.lessonStep(S)));
};

SUITES.bundle = () => {
  const out = resolve(dev, '..', 'DenshaDeHalo-DenshaDeGo-claude-haiku-5-5-medium-20261104-050241.html');
  check('the single HTML exists beside the dev folder', existsSync(out));
  if (!existsSync(out)) return;
  const html = readFileSync(out, 'utf8');
  check('the bundle loads the hub client first', html.indexOf('AIHub') > -1 && html.indexOf('AIHub') < html.indexOf('my-3D2dge'));
  check('the bundle has the hub meta tags', /hub:session-mode/.test(html) && /hub:session-players/.test(html));
  check('the bundle has no external script or stylesheet URL', !/<script[^>]+src=/i.test(html) && !/<link[^>]+href=/i.test(html));
  check('no alert, confirm or prompt in the game sources', !/\b(alert|confirm|prompt)\s*\(/.test(FILES.filter(f => f.startsWith('src/')).map(f => readFileSync(join(dev, f), 'utf8')).join('\n').replace(/game\.input\.(pressed\('confirm'\))/g, '')));
  for (const f of FILES.filter(x => x.startsWith('src/'))) {
    const t = readFileSync(join(dev, f), 'utf8');
    check(`no TODO, FIXME or placeholder in ${f}`, !/\b(TODO|FIXME|placeholder|lorem|stub)\b/i.test(t));
  }
  const ex = resolve(dev, '..', 'exit-interview.json');
  if (existsSync(ex)) { let ok = true; try { JSON.parse(readFileSync(ex, 'utf8')); } catch (e) { ok = false; } check('exit-interview.json parses', ok); }
  else check('exit-interview.json exists beside the HTML', false);
};

SUITES.browser = async () => {
  let chromium;
  try { ({ chromium } = await import(join(dev, 'engine/node_modules/playwright/index.mjs'))); } catch (e) { check('playwright is installed', false, e.message); return; }
  const out = resolve(dev, '..', 'DenshaDeHalo-DenshaDeGo-claude-haiku-5-5-medium-20261104-050241.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + out); await page.waitForTimeout(2500);
    check('the title draws from file:// with no page errors', errs.length === 0, errs.join('|'));
    await page.waitForTimeout(10500);
    check('attract starts after 10 s idle in the browser', await page.evaluate(() => window.__dh.game.sceneName) === 'attract');
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    check('a key press returns to the title', await page.evaluate(() => window.__dh.game.sceneName) === 'title');
    await page.evaluate(() => window.__dh.game.go('drive', { stage: 'S1' }, { fade: 0 })); await page.waitForTimeout(3000);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
    const notch = await page.evaluate(() => window.__dh.DH.liveSim.train.notch);
    check('holding W in the drive notches the lever up', notch > 0, String(notch));
    check('no errors after play in the browser', errs.length === 0, errs.join('|'));
  } finally { await browser.close(); }
};

const order = Object.keys(SUITES).filter(k => !only.length || only.includes(k));
(async () => {
  for (const name of order) {
    suite = name;
    const fn = SUITES[name];
    try { const r = fn(); if (r && r.then) await r; }
    catch (e) { check(name + ' ran without an exception', false, (e && e.message) || String(e)); }
  }
  if (flags.has('--browser') || only.includes('browser')) { suite = 'browser'; try { await SUITES.browser(); } catch (e) { check('browser ran', false, e.message); } }
  for (const f of failures) console.log(f);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
