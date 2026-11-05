// THE one test command: node test/run.mjs [suite ...]  (prints only failures, then one line: "N passed, M failed").
// Every suite runs the engine, rail.js and src/*.js headless in a Node vm (test/lib.mjs) and drives the game with
// game.advance, the input's tap/hold, and game.debug. "playthrough" is the scripted whole game.
import { load } from './lib.mjs';
let passed = 0, failed = 0;
const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const check = (suite, what, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL ${suite}: ${what}${detail !== '' ? ' (' + detail + ')' : ''}`); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const stubCtx = () => new Proxy({ canvas: { width: 427, height: 240 }, globalAlpha: 1, globalCompositeOperation: 'source-over' }, { get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
const runFor = (DH, id, o = {}) => new DH.Run(id, Object.assign({ difficulty: 'Normal' }, o));
const free = (run) => { run.phase = 'run'; run.dw = null; run.doors = 'closed'; run.pilot = true; run.events = []; run.calls = []; run.limits = []; run.horns = []; run.sigs.forEach(s => s.held = false); run.stops = [run.stops[0]]; run.stopIdx = 1; run.o.cheat = true; return run; };
const steps = (run, sec, c = {}) => { for (let i = 0; i < sec * 120; i++) { run.step(1 / 120, typeof c === 'function' ? c(i) : c); } };
const drive = (DH, run, sec, skill = 1, mode) => { const ap = new DH.Autopilot(run, { skill, mode }); const out = []; for (let i = 0; i < sec * 120 && !run.done && run.phase !== 'over'; i++) { run.step(1 / 120, ap.step(1 / 120)); for (const e of run.out) out.push(e); run.out.length = 0; } return out; };
const suites = {
  rail() {
    const { DH } = load(); const R = DH.route('halo'), rail = new DH.Rail(R, { fov: 75 }), g = stubCtx(), vp = { x: 0, y: 0, w: 427, h: 240 };
    rail.paint(g, vp, { s: 2000, x: 0, h: 2.9, dir: 1, horizon: .4 }, { grade: DH.grade(12, 'clear', R) });
    const p = rail.project(2100, 0, 2.9), p2 = rail.project(2200, 0, 0), p1 = rail.project(2100, 0, 0);
    check('rail', 'a point on the centreline ahead lands at cx', p && near(p[0], 213.5, 3), p && p[0]);
    check('rail', 'k halves when the distance doubles', p1 && p2 && near(p1[2] / p2[2], 2, .15), p1 && p2 && p1[2] / p2[2]);
    const a = rail.project(2020, .5, 0), b = rail.project(2020, -.5, 1);
    check('rail', 'square pixels: 1 m x 1 m at 20 m', a && b && near(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), 1.5), a && b && [a[0] - b[0], a[1] - b[1]].join());
    rail.paint(g, vp, { s: 2100, x: 0, h: 2.9, dir: -1, horizon: .4 }, { grade: DH.grade(12, 'clear', R) });
    const q = rail.project(2050, 3, 0); check('rail', 'the rear view mirrors a point', q && q[0] < 213.5, q && q[0]);
    rail.paint(g, vp, { s: 9150, x: 0, h: 2.9, dir: 1 }, { grade: DH.grade(12, 'clear', R) });
    check('rail', 'project/pick round-trips for a signal', (() => { rail.paint(g, vp, { s: 600, x: 0, h: 2.9, dir: 1 }, { grade: DH.grade(12, 'clear', R) }); const sg = R.signals.find(s => s.id === 'B101'), pp = rail.project(sg.s, -2.4, 5); const w = pp && rail.pick(pp[0], pp[1]); return w && w.sig === sg; })());
    check('rail', 'the gallery draws all 13 shots', (() => { const { DH: D2, game } = load({ hash: '#gallery' }); game.advance(.2); try { for (let i = 0; i < 13; i++) { D2.scenes.gallery.i = i; D2.scenes.gallery.draw({ W: 427, H: 240, overlay: f => f(stubCtx()), sky() {} }); } return !game.errors.length; } catch (e) { return false; } })());
    const st = R.strips.flat().find(x => x.kind === 'platform'); check('rail', 'platform strips exist with a top face', !!(st && st.faces.top));
  },
  route() {
    const { DH } = load(); const R = DH.route('halo'), D = DH.route('depot');
    check('route', 'segments = length / 5', R.n === 4120 && D.n === 200, R.n + ' ' + D.n);
    check('route', 'a right curve has + curve mid-way', R.curveAt(1020 + 100) < 0 && R.curveAt(2900) > 0);
    const before = R.yAt(9150), after = R.yAt(10350); check('route', 'a 25 permille x 1100 m climb rises about 27 m', near(after - before, 27.5, 2.5), (after - before).toFixed(2));
    let br = 0; for (let i = 0; i < R.n; i++) if ((R.flags[i] & 2) && i * 5 >= 2600 && i * 5 < 3200) br++; check('route', 'a 600 m bridge flags 120 segments', br === 120, br);
    check('route', 'validation passes', DH.validateRoute(R, Object.values(DH.STAGES)).length === 0 && DH.validateRoute(D).length === 0, DH.validateRoute(R).join('; '));
    const bad = DH.compileRoute({ id: 'bad', len: 2000, loop: false, script: [[0, 'zone', 'downtown'], [100, 'station', { id: 'x', len: 150, side: 'L', stop: { 6: 400 } }]] });
    check('route', 'a stop outside its platform fails validation', DH.validateRoute(bad).length > 0);
  },
  physics() {
    const { DH } = load(); const mk = () => { const r = free(runFor(DH, 'S1')); r.s = 5000; r.R.gradeAt = () => 0; return r; };
    let r = mk(); r.li = 5; let t = 0; while (r.v < 80 && t < 60) { r.step(1 / 120, {}); t += 1 / 120; } check('physics', '0-80 on P5 in 29-34 s', t >= 29 && t <= 34, t.toFixed(1));
    r = mk(); r.v = 80; r.li = -4; t = 0; let s0 = r.s; while (r.v > 0 && t < 60) { r.step(1 / 120, {}); t += 1 / 120; } check('physics', 'B4 from 80: 37-41 s and 425-465 m', t >= 37 && t <= 41 && r.s - s0 >= 425 && r.s - s0 <= 465, t.toFixed(1) + ' s ' + (r.s - s0).toFixed(0) + ' m');
    r = mk(); r.v = 80; r.li = -9; s0 = r.s; while (r.v > 0) r.step(1 / 120, {}); check('physics', 'EB from 80: 175-195 m', r.s - s0 >= 175 && r.s - s0 <= 195, (r.s - s0).toFixed(0));
    r = mk(); r.v = 80; r.li = 0; steps(r, 60); check('physics', 'coasting at 80 loses 7-10 km/h a minute', 80 - r.v >= 7 && 80 - r.v <= 10, (80 - r.v).toFixed(1));
    r = mk(); r.R.gradeAt = () => 25; r.v = 30; r.li = 5; steps(r, 3); check('physics', 'P5 at 30 still accelerates up 25 permille', r.v > 30);
    r = mk(); r.R.gradeAt = () => -25; r.v = 30; r.li = 0; steps(r, 3); check('physics', 'N on 25 permille down gains speed', r.v > 30);
    r = mk(); r.v = 0; r.li = 0; for (let i = 0; i < 20; i++) r.step(1 / 120, { power: true }); check('physics', 'the lever clamps at P5', r.li === 5);
    for (let i = 0; i < 30; i++) r.step(1 / 120, { brake: true }); check('physics', 'the lever clamps at EB', r.notchName === 'EB');
    r = mk(); r.v = 40; r.li = -9; r.step(1 / 120, { power: true }); check('physics', 'no leaving EB while moving', r.notchName === 'EB');
    r = mk(); r.pilot = false; r.doors = 'open'; r.li = 5; steps(r, 2); check('physics', 'no traction with the doors open', r.v < .1);
    r = mk(); r.rain = true; r.li = 5; steps(r, 3); check('physics', 'rain plus P5 from a stand slips', r.stats.slips > 0);
    r = mk(); r.li = 5; steps(r, 6); check('physics', 'dry track never slips', r.stats.slips === 0);
    const a = mk(), b = mk(); a.li = b.li = 4; steps(a, 60); steps(b, 60); check('physics', 'determinism', a.s === b.s);
  },
  signals() {
    const { DH } = load(); const r = runFor(DH, 'S2'); r.freight.blocks = false; r.actors = []; r.sigs.forEach(s => s.held = false);
    const sg = r.sigs.find(s => s.id === 'B201'), i = r.sigs.indexOf(sg);
    const put = k => { r.actors = [new DH.TrainActor({ id: 't', s: r.sigs[i + k].s + 100, cars: 2, track: 'A', blocks: true })]; r._aspects(); return sg.aspect; };
    check('signals', 'aspect R/Y/YG/G for a train 0/1/2/3 blocks ahead', put(0) === 'R' && put(1) === 'Y' && put(2) === 'YG' && put(3) === 'G', [0, 1, 2, 3].map(put).join());
    const r2 = runFor(DH, 'S1'); r2._aspects(); check('signals', 'a starting signal stays R until ready', r2.sigs.find(s => s.id === 'AK-S').aspect === 'R');
    const r3 = free(runFor(DH, 'S1')); const b = r3.sigs.find(s => s.id === 'B102'); r3.force.B102 = 'R'; r3.s = b.s - 615; r3.v = 50; r3.li = 0; steps(r3, 1.5);
    check('signals', 'passing a red beacon rings ATS', r3.ats.ringing); steps(r3, 6); check('signals', 'no confirm in 5 s fires EB', r3.notchName === 'EB');
    const r4 = free(runFor(DH, 'S1')); r4.force.B102 = 'R'; r4.s = b.s - 615; r4.v = 50; steps(r4, 1.5); r4.step(1 / 120, { ats: true }); steps(r4, 6); check('signals', 'confirming stops the EB', r4.notchName !== 'EB' && r4.ats.confirmed);
    const r5 = free(runFor(DH, 'S1')); r5.o.cheat = false; r5.force.B102 = 'R'; r5.s = b.s - 1; r5.v = 30; r5.li = 0; steps(r5, .3); check('signals', 'SPAD detected when the front crosses', r5.stats.spad === 1 && r5.notchName === 'EB');
    const out = drive(DH, runFor(DH, 'S2'), 600); check('signals', 'the S2 freight holds M6000 at red, ATS rings', out.some(e => e.k === 'ats' && e.on));
  },
  limits() {
    const { DH } = load(); const mk = () => { const r = free(runFor(DH, 'S1')); r.limits = DH.route('halo').limits.map(l => Object.assign({}, l, { state: 'idle' })); r.o.cheat = false; return r; };
    let r = mk(); r.s = 860; r.v = 72; r.li = 0; let lim = []; for (let i = 0; i < 400; i++) { r.step(1 / 120, {}); r.v = 72; } check('limits', '72 under a 70 board: no penalty (tolerance 3)', r.grace === 25, r.grace);
    r = mk(); r.s = 860; for (let i = 0; i < 1200; i++) { r.step(1 / 120, {}); r.v = 76; } check('limits', '76 under 70: one penalty only', r.grace === 23, r.grace);
    r = mk(); r.s = 860; r.v = 60; for (let i = 0; i < 120 * 21; i++) { r.step(1 / 120, {}); r.v = 60; } check('limits', 'the limit holds until the rear passes END', r.limitNow().v === 70);
    for (let i = 0; i < 2400; i++) { r.step(1 / 120, {}); r.v = 60; } check('limits', 'it clears after the rear passes', r.limitNow().v > 70, r.limitNow().v);
  },
  stations() {
    const { DH } = load();
    const judge = err => { const r = runFor(DH, 'S1'); r.phase = 'run'; r.stopIdx = 1; const sp = r.stops[1]; r.s = sp.target + err; r.clock = sp.arr; r._judge(sp, err, false); const j = r.out.find(e => e.k === 'judge'); return j && j.label; };
    check('stations', 'judgment table', judge(.05) === 'PERFECT HALO!' && judge(.25) === 'GREAT!' && judge(.6) === 'GOOD' && judge(.95) === 'OK' && judge(3) === 'OVERRUN!' && judge(7) === 'OVER THE MARK', [.05, .25, .6, .95, 3, 7].map(judge).join());
    const arr = off => { const r = runFor(DH, 'S1'); r.stopIdx = 1; const sp = r.stops[1]; r.clock = sp.arr + off; r._judge(sp, 0, false); return r.out.find(e => e.k === 'judge').items.map(x => x[0]).join(' '); };
    check('stations', 'ON TIME, LATE, EARLY', /ON TIME/.test(arr(0)) && /LATE/.test(arr(5)) && /EARLY/.test(arr(-5)), [arr(-5), arr(0), arr(5)].join('|'));
    const smooth = notch => { const r = runFor(DH, 'S1'); r.stopIdx = 1; const sp = r.stops[1]; r.s = sp.target; r.clock = sp.arr; r.ebUsedAt = -1e9; r.stopDecel = notch * .5; r._judge(sp, 0, false); const j = r.out.find(e => e.k === 'judge'); return j && j.items.some(x => x[0] === 'SMOOTH!'); };
    check('stations', 'SMOOTH when eased to B1, none on B6 to the stop', smooth(1) && !smooth(6));
    const r = runFor(DH, 'S1'), order = [];
    for (let i = 0; i < 40 * 120; i++) { r.step(1 / 120, {}); for (const e of r.out) if (['doors', 'melody', 'pilot', 'clear'].includes(e.k)) order.push(e.k + (e.k === 'doors' ? (e.open ? '+' : '-') : '')); if (r.out.some(e => e.k === 'sfx' && e.name === 'buzzer')) order.push('buzzer'); r.out.length = 0; }
    check('stations', 'dwell order: melody, doors close, buzzer, pilot, signal', order.join(',') === 'melody,doors-,buzzer,pilot,clear', order.join(','));
    const r2 = runFor(DH, 'S1'); steps(r2, 3, { power: true }); check('stations', 'power before the pilot lamp gives no movement', r2.v < .01);
    const r3 = free(runFor(DH, 'S1')); r3.stops = runFor(DH, 'S1').stops; r3.stopIdx = 1; r3.s = r3.stops[1].target - 10; r3.v = 30; r3.li = 0; steps(r3, 9); check('stations', 'a missed stop costs Halo Time', r3.out.some(e => e.k === 'judge' && e.label === 'MISSED STOP'));
  },
  calls() {
    const { DH } = load(); const r = runFor(DH, 'S1'); const ap = new DH.Autopilot(r, {});
    let opened = null; for (let i = 0; i < 120 * 120; i++) { r.step(1 / 120, i < 60 * 120 ? ap.step(1 / 120) : {}); const o = r.calls.find(c => c.kind === 'limit' && c.state === 'open'); if (o && !opened) opened = r.dTo(o.s); r.out.length = 0; }
    check('calls', 'a window opens within 180 m', opened !== null && opened <= 180 && opened > 150, opened);
    const g = (d, auto) => { const r2 = free(runFor(DH, 'S1')); r2.calls = DH.route('halo').calls.filter(c => c.kind === 'limit').map(c => Object.assign({}, c, { state: 'open' })); const c = r2.calls.find(q => q.v === 70); r2.s = c.s - d; r2.makeCall({ call: c }, auto); return r2.out.find(e => e.k === 'call').grade; };
    check('calls', 'GREAT at 90 m, OK at 40 m', g(90) === 'GREAT' && g(40) === 'OK');
    check('calls', 'auto calls give no points', (() => { const r2 = free(runFor(DH, 'S1')); const c = DH.route('halo').calls.find(q => q.kind === 'limit'); r2.s = c.s - 90; r2.makeCall({ call: Object.assign({}, c) }, true); return r2.score === 0; })());
    const horn = (hold, diff) => { const r2 = free(runFor(DH, 'S1', { difficulty: diff })); r2.horns = DH.route('halo').horns.map(h => Object.assign({}, h, { hold: 0, done: false, inside: false })); r2.s = 1052; r2.v = 40; r2.li = 0; r2.o.cheat = false; for (let i = 0; i < 25 * 120; i++) { r2.step(1 / 120, { horn: i > 60 && i < 60 + hold * 120 }); r2.v = 40; } return r2.grace - r2.graceStart; };
    check('calls', 'a 0.6 s horn in the zone scores; 0.3 s does not', horn(.6, 'Normal') === 1 && horn(.3, 'Normal') === -1, horn(.6, 'Normal') + ' ' + horn(.3, 'Normal'));
    check('calls', 'a missed horn zone costs nothing on Easy', horn(0, 'Easy') === 0, horn(0, 'Easy'));
  },
  timetable() {
    const { DH, game } = load(); const r = runFor(DH, 'S1'), c0 = r.clock; steps(r, 10); check('timetable', 'the clock runs 1:1', near(r.clock - c0, 10, .01));
    game.go('drive', { stage: 'S1' }); game.advance(1); const c1 = DH.current.run.clock; game.paused = true; game.advance(2); check('timetable', 'the clock stops while paused', near(DH.current.run.clock, c1, .01)); game.paused = false;
  },
  score() {
    const { DH } = load(); const r = runFor(DH, 'S1'); r.addGrace(200); check('score', 'Halo Time capped at 99', r.grace === 99);
    r.addGrace(-200); check('score', 'game over at 0', r.phase === 'over' && r.out.some(e => e.k === 'gameOver'));
    check('score', 'max computes with no NaN', Number.isFinite(runFor(DH, 'S1').maxScore) && runFor(DH, 'S1').maxScore > 0);
    const e = runFor(DH, 'S1', { difficulty: 'Easy' }), x = runFor(DH, 'S1', { difficulty: 'Expert' }); check('score', 'difficulty sets the starting Halo Time', e.grace === 40 && x.grace === 15);
    const o = runFor(DH, 'S1'); for (let i = 0; i < 3; i++) { o.stopIdx = 1; o._judge(o.stops[1], 3, false); } check('score', 'three overruns rank C or lower', 'CD'.includes(o.rank()), o.rank());
  },
  autopilot() {
    const { DH } = load();
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'PR']) { const r = runFor(DH, id); drive(DH, r, 900); const good = r.stats.judged.every(l => /PERFECT|GREAT|GOOD/.test(l)); check('autopilot', id + ': skill 1 finishes, every stop GOOD or better, rank S', r.done && good && r.rank() === 'S', r.rank() + ' ' + r.stats.judged.join('/') + ' grace ' + r.grace); }
    for (const id of ['S1', 'S3']) { const r = runFor(DH, id); drive(DH, r, 900, .6); check('autopilot', id + ': skill 0.6 finishes with no game over', r.done && r.phase !== 'over', r.phase); }
    const a = DH.proof('S1', 60), b = DH.proof('S1', 60); check('autopilot', 'the proof hash is stable', a.hash === b.hash);
  },
  events() {
    const { DH } = load();
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) { const r = runFor(DH, id); drive(DH, r, 900); const all = r.events.filter(e => e.type !== 'tip' || true).map(e => e.id), miss = all.filter(id2 => !r.fired.includes(id2)); check('events', id + ': every event fires once', !miss.length, miss.join(',')); if (id === 'S3') check('events', 'S3: the obstruction is avoided', !!r.stats.hazard); if (id === 'S4') check('events', 'S4: the door rush happened', !!r.stats.rush); }
  },
  tod() {
    const { DH } = load(); let ok = true; for (let h = 0; h < 24; h += .05) { const a = DH.grade(h, 'clear'), b = DH.grade(h + .01, 'clear'); if (Math.abs(a.amb[0] - b.amb[0]) > .05) ok = false; } check('tod', 'the grade blends continuously', ok);
    check('tod', 'rain lowers adhesion', runFor(DH, 'S2').rain && DH.T.adhesionRain < 6);
    const r = runFor(DH, 'S5'); r.fog = { from: r.s, to: r.s + 500 }; r.fogActive = true; check('tod', 'fog sets sighting to 180 m', r.sightDist() === 180);
  },
  hud() {
    const { DH, game } = load(); game.go('drive', { stage: 'S1' }); game.advance(.5); const d = DH.current;
    for (const [w, h] of [[320, 240], [427, 240], [320, 690]]) { let err = null; try { DH.HUD.cab(stubCtx(), d, { x: 0, y: 0, w, h }); DH.HUD.hud(stubCtx(), d, { x: 0, y: 0, w, h }); } catch (e) { err = e.message; } check('hud', 'draws at ' + w + 'x' + h, !err, err); const off = d.widgets.filter(q => q.x < 0 || q.x + q.w > w + 1); check('hud', 'widgets on screen at ' + w + 'x' + h, !off.length, off.map(q => q.id).join()); }
    const eb = d.widgets.find(q => q.id === 'eb'); check('hud', 'the EB widget exists to click', !!eb);
  },
  input() {
    const { DH, game } = load(); game.settings.set('symbols', 'playstation');
    check('input', 'PlayStation call is ✕', DH.glyphLabel('call', 'gamepad') === '✕', DH.glyphLabel('call', 'gamepad'));
    game.settings.set('symbols', 'xbox'); check('input', 'Xbox call is A', DH.glyphLabel('call', 'gamepad') === 'A'); game.settings.set('symbols', 'playstation');
    check('input', 'keyboard call is E, mouse call is LMB', DH.glyphLabel('call', 'keyboard') === 'E' && DH.glyphLabel('call', 'mouse') === 'LMB');
    game.settings.set('leverDir', 'up-brake'); DH.applyLeverDir(); check('input', 'Up = Brake flips W but not R2', game.input.map.brake.includes('KeyW') && game.input.map.power.includes('Pad7')); game.settings.set('leverDir', 'up-power'); DH.applyLeverDir();
    const t = load({ touch: true }); t.game.advance(.5); check('input', 'touch-only shows the notice', t.DH.touchOnly === true);
    t.game.advance(11); check('input', 'touch-only still runs attract', t.game.sceneName === 'attract', t.game.sceneName);
  },
  sound() {
    const { DH } = load(); const p = v => DH.soundParams({ v, P: 2, train: 'vvvf' });
    check('sound', 'VVVF steps down at a band edge', p(23.9).vvvf.f > p(24.1).vvvf.f);
    check('sound', 'wind grows with v squared', near(p(80).wind.vol / p(40).wind.vol, 4, .05));
    check('sound', 'every sfx and song exists', ['clack', 'doorchime', 'buzzer', 'atsbell', 'crossbell', 'joint', 'whoosh', 'jingle_perfect', 'stamp'].every(DH.Sound.has) && ['title', 'menu', 'brief', 'resultsHi', 'gameover', 'parallel', 'ending', 'drive'].every(k => DH.SONGS[k]) && Object.keys(DH.MELODIES).length >= 12);
  },
  babble() {
    const { DH } = load(); const a = DH.Babble.syllabify('The next station is Hanabatake.', 'pa'), b = DH.Babble.syllabify('The next station is Hanabatake.', 'pa');
    check('babble', 'deterministic syllables', JSON.stringify(a) === JSON.stringify(b));
    check('babble', 'length scales with the text', DH.Babble.syllabify('Hello there, driver, good morning to you all.').length > DH.Babble.syllabify('Hello.').length);
    const q = DH.Babble.syllabify('Ready?'), e = DH.Babble.syllabify('Ready.'); check('babble', 'punctuation shapes the pitch', q[q.length - 1].pitch > e[e.length - 1].pitch);
    check('babble', 'every voice exists', Object.values(DH.CAST).every(c => DH.VOICES[c.voice]));
  },
  story() {
    const { DH, E } = load(); let ok = true, long = [];
    for (const id in DH.STAGES) { const s = DH.STAGES[id]; if (!s.briefing || !s.results || !'SABCD'.split('').every(k => s.results[k])) ok = false; for (const l of s.briefing.concat(s.events.filter(e => e.line).map(e => [e.who, e.line]))) if (E.font.wrap(l[1], 290).length > 3) long.push(l[1].slice(0, 20)); }
    check('story', 'every stage has a briefing and S-D results lines', ok); check('story', 'no line longer than 3 rows', !long.length, long.join('|'));
    const r = runFor(DH, 'S1'); r._say('mika', 'a'); r._say('hoshino', 'b'); const st = new DH.Story(); for (const e of r.out) st.say(e.who, e.line); check('story', 'radio lines queue', st.q.length === 2);
  },
  attract() {
    const { DH, game, I } = load(); game.advance(10.5); check('attract', '10 s idle on the title starts attract', game.sceneName === 'attract', game.sceneName);
    const order = []; for (let i = 0; i < DH.ATTRACT_LEN + 10; i++) { game.advance(1); order.push(DH.scenes.attract.vi); }
    check('attract', 'the vignettes advance in order and loop', order.includes(DH.ATTRACT.length - 1) && order[order.length - 1] <= 1, [...new Set(order)].join());
    for (const how of ['tap', 'press', 'move']) { const t = load(); t.game.advance(12); if (how === 'tap') t.I.tap('confirm'); if (how === 'press') t.I.press('KeyA'); if (how === 'move') { t.I.feed('move', 10, 10); t.game.advance(.1); t.I.feed('move', 100, 100); } t.game.advance(.5); check('attract', how + ' returns to the title', t.game.sceneName === 'title', t.game.sceneName); }
    check('attract', 'no records written', !Object.keys(DH.progress.ranks).length && !DH.progress.postcards.length);
  },
  dev() {
    const { DH, game } = load(); const mk = () => { const r = free(runFor(DH, 'S1')); r.s = 5000; r.R.gradeAt = () => 0; r.v = 80; r.li = -4; return r; };
    let r = mk(), s0 = r.s; while (r.v > 0) r.step(1 / 120, {}); const d1 = r.s - s0;
    DH.setTuning('brakeScale', 2); r = mk(); s0 = r.s; while (r.v > 0) r.step(1 / 120, {}); const d2 = r.s - s0;
    check('dev', 'doubling brakeScale cuts the B4 distance 45-55%', d2 / d1 > .45 && d2 / d1 < .56, (d2 / d1).toFixed(2));
    DH.resetTuning(); check('dev', 'Reset restores every default', Object.keys(DH.TUNING_DEFAULTS).every(k => DH.T[k] === DH.TUNING_DEFAULTS[k]));
    check('dev', 'the Dev group is not in the standard Settings list', game.settings.spec('dev_brakeScale').group === 'Dev');
    game.go('drive', { stage: 'S1' }); game.advance(.3); check('dev', 'Dev Mode is in the pause menu', DH.pauseItems().some(i => i[0] === 'Dev Mode'));
    const run = DH.current.run; DH.jump(run, 1000, { v: 30 }); check('dev', 'jump puts s within 1 m', near(run.s, 1000, 1));
    DH.devFinish(run); game.advance(1); check('dev', 'finishing a stage reaches results', game.sceneName === 'results', game.sceneName);
  },
  progress() {
    const { DH, ctx } = load(); const s = { id: 'S1', rank: 'S', score: 8000, stats: { stopErr: [.05], perfect: 1, km: 3, calls: 10, great: 10, missed: 0, overruns: 0, slides: 0 }, stops: [{ id: 'hanabatake', label: 'PERFECT HALO!', ontime: true, smooth: true }], tutorial: false };
    const cards = DH.recordResult(s); check('progress', 'postcards 1, 2, 7, 8 unlock from a perfect S1', [1, 2, 7, 8].every(n => cards.includes(n)), cards.join());
    check('progress', 'S2 unlocks after S1', DH.progress.unlocked.includes('S2'));
    const saved = JSON.parse(ctx.localStorage.getItem('my3d2dge:dh:progress')); check('progress', 'progress round-trips through the store', saved && saved.ranks.S1 === 'S');
    DH.attractOn = true; const n0 = DH.progress.postcards.length; DH.recordResult(Object.assign({}, s, { id: 'S5' })); check('progress', 'attract unlocks nothing', DH.progress.postcards.length === n0); DH.attractOn = false;
  },
  settings() {
    const { DH, game } = load(); game.settings.set('subtitles', false); check('settings', 'subtitles off', game.settings.subtitles === false);
    game.settings.set('guide', 'on'); check('settings', 'braking guide on', DH.guideOn()); game.settings.set('guide', 'auto'); game.settings.set('difficulty', 'Easy'); check('settings', 'guide auto is on for Easy', DH.guideOn());
    game.settings.set('symbols', 'xbox'); check('settings', 'button symbols apply', game.input.glyphs === 'xbox');
  },
  screens() {
    const { DH, game, I } = load(); game.advance(.5);
    I.tap('confirm'); game.advance(.6); check('screens', 'CAREER opens the halo map', game.sceneName === 'halomap', game.sceneName);
    I.tap('cancel'); game.advance(.6); check('screens', 'cancel goes back to the title', game.sceneName === 'title');
    game.go('halomap'); game.advance(.5); DH.scenes.halomap.i = 3; I.tap('confirm'); game.advance(.5); check('screens', 'a locked stage cannot start', game.sceneName === 'halomap');
    DH.scenes.halomap.i = 0; I.tap('confirm'); game.advance(.6); check('screens', 'the tutorial starts from the map', game.sceneName === 'briefing');
    for (const id of ['freerun', 'log', 'about', 'duelLobby']) { game.go(id); game.advance(.5); check('screens', id + ' opens', game.sceneName === id); I.tap('cancel'); game.advance(.6); check('screens', id + ' closes with cancel', game.sceneName === 'title', game.sceneName); }
    const text = JSON.stringify(DH.ABOUT_PAGES()); check('screens', 'About has every Source Information label', ['Date:', 'Source:', 'Plan:', 'Genre:', 'Perspective:', 'Tech:', 'Art Direction:', 'Animation:', 'Audio:', 'Online:', 'Testing:', 'Research:', 'Environment:', 'Model:', 'Usage:'].every(l => text.includes(l)));
  },
  hub() {
    const calls = { ready: 0, result: 0, progress: 0, send: 0, maxBytes: 0, times: [] }; let t0 = null, handlers = {}, nowMs = -1e9;
    const hub = { active: true, seed: 42, rng: l => { let s = 7 + l.length; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }, connect: async () => ({ me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], mode: 'ghost' }),
      ready: () => { calls.ready++; }, on: (e, f) => { handlers[e] = f; return () => {}; }, answer: () => {}, time: () => nowMs, send: (d) => { calls.send++; calls.maxBytes = Math.max(calls.maxBytes, JSON.stringify(d).length); calls.times.push(nowMs); return true; }, progress: () => { calls.progress++; }, result: () => { calls.result++; }, fail: () => {} };
    const { DH, game } = load({ hub });
    const scenes = new Set(); const tick = s => { for (let i = 0; i < s * 10; i++) { game.advance(.1); scenes.add(game.sceneName); if (nowMs > -1e8) nowMs += 100; } };
    tick(1); return new Promise(res => setTimeout(() => {
      tick(1); check('hub', 'ready() with no input', calls.ready === 1); check('hub', 'our card shows', game.sceneName === 'hubCard', game.sceneName);
      handlers.start && handlers.start({ in: 3000 }); nowMs = -3000; tick(1.5);
      const s0 = DH.current && DH.current.run.s; tick(1); check('hub', 'play is gated until time() >= 0', DH.current && DH.current.run.s === s0 && DH.current.run.t === 0);
      handlers.message && handlers.message({ t: 'g', s: 12105, v: 10, n: 'P1', st: 'run' }, 1);
      DH.current.pilot = new DH.Autopilot(DH.current.run, {}); tick(330);
      check('hub', 'progress at >= 1 a second', calls.progress >= 300, calls.progress);
      const rate = calls.times.filter(t => t >= 10000 && t < 20000).length / 10; check('hub', 'send rate <= 20 a second, payloads < 16 KB', rate <= 20 && calls.maxBytes < 16000, rate + ' ' + calls.maxBytes);
      handlers['time-up'] && handlers['time-up']({ graceMs: 3000 }); check('hub', 'result() exactly once', calls.result === 1, calls.result);
      handlers.end && handlers.end({ reason: 'finished', standings: [[0], [1]] }); tick(.5); check('hub', 'end silences and blocks', DH.hubState.ended && game.audio.muted);
      check('hub', 'no title or attract ever entered', !scenes.has('title') && !scenes.has('attract'), [...scenes].join());
      check('hub', 'no Dev Mode in the pause menu', !DH.pauseItems().length);
      res();
    }, 10));
  },
  duel() {
    const { DH, game } = load(); game.go('duelLobby'); game.advance(.3); game.addPlayer({ keys: 'right' }); DH.duelAuto = [1, .6]; game.go('duel'); game.advance(.5);
    check('duel', 'two runs on two tracks', DH.scenes.duel.drs.length === 2 && DH.scenes.duel.drs[1].run.track === 'D');
    game.players[1].hold('power', true); game.advance(.1); game.players[1].hold('power', false);
    for (let i = 0; i < 400 && game.sceneName === 'duel'; i++) game.advance(1);
    check('duel', 'two autopilots finish, results shown', game.sceneName === 'duelResults', game.sceneName);
    const R = DH.scenes.duelResults; check('duel', 'the winner is the higher score', R.winner() === (R.d.a.score === R.d.b.score ? 0 : R.d.a.score > R.d.b.score ? 1 : 2));
  },
  playthrough() {
    const { DH, game, I } = load(); const seen = new Set();
    const adv = (s, until) => { for (let i = 0; i < s * 10; i++) { game.advance(.1); seen.add(game.sceneName); if (until && until()) return true; } return false; };
    adv(1); check('playthrough', 'boots to the title', game.sceneName === 'title');
    adv(11); check('playthrough', 'idle reaches attract', game.sceneName === 'attract'); I.tap('confirm'); adv(1); check('playthrough', 'input returns to the title', game.sceneName === 'title');
    DH.dev.auto = true; DH.dev.autoSkill = 1; const ranks = {};
    I.tap('confirm'); adv(1);   // CAREER -> the map, S0 selected
    for (const id of DH.CAREER) {
      check('playthrough', id + ' selected on the map', DH.scenes.halomap.order[DH.scenes.halomap.i] === id || game.sceneName !== 'halomap', id);
      if (game.sceneName === 'halomap') { I.tap('confirm'); adv(1); }
      if (game.sceneName === 'briefing') { I.tap('cancel'); adv(.5); I.tap('confirm'); adv(1); }
      check('playthrough', id + ' drives', game.sceneName === 'drive', game.sceneName);
      adv(900, () => game.sceneName === 'results');
      check('playthrough', id + ' reaches results', game.sceneName === 'results', game.sceneName + ' ' + JSON.stringify(game.debug.snapshot()).slice(0, 200));
      ranks[id] = DH.scenes.results.s && DH.scenes.results.s.rank; adv(1.5);
      I.tap('confirm'); adv(1.2);
    }
    check('playthrough', 'every service stage ranks S', ['S1', 'S2', 'S3', 'S4', 'S5'].every(k => ranks[k] === 'S'), JSON.stringify(ranks));
    check('playthrough', 'the ending plays', game.sceneName === 'ending', game.sceneName); adv(5); I.tap('cancel'); adv(3); I.tap('confirm'); adv(1.5); check('playthrough', 'the credits return to the title', game.sceneName === 'title', game.sceneName);
    check('playthrough', 'every postcard unlocked', DH.progress.postcards.length === 8, DH.progress.postcards.join());
    check('playthrough', 'no errors', !game.errors.length, game.errors.map(e => e.message).slice(0, 3).join(' | '));
  }
};
const names = want.length ? want : Object.keys(suites);
const extra = process.argv.includes('--browser') ? ['test/browser.mjs'] : [];
if (process.argv.includes('--hub')) extra.push('test/hub-harness.mjs');
for (const n of names) { try { await suites[n](); } catch (e) { check(n, 'ran without throwing', false, (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); } }
if (extra.length) { const { spawnSync } = await import('node:child_process'); for (const f of extra) { const r = spawnSync(process.execPath, [new URL('../' + f, import.meta.url).pathname], { encoding: 'utf8' }); const lines = (r.stdout + r.stderr).split('\n').filter(l => l.startsWith('FAIL')); for (const l of lines) console.log(l); if (r.status === 0) passed++; else { failed++; if (!lines.length) console.log('FAIL ' + f + ': exit ' + r.status); } } }
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
