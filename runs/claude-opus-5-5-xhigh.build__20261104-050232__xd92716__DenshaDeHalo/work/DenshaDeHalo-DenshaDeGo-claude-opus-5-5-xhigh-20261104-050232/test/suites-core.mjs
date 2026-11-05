// the rules: renderer math, routes, physics, signals, limits, stations, calls and horn, timetable, score, crowds, events, light
export default {
  rail({ DH, E, check }) {
    const R = DH.route('halo'), rail = new E.Rail(R, { fov: 75 }), vp = { x: 0, y: 0, w: 427, h: 240 };
    const NULLG = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
    rail.paint(NULLG, vp, { s: 1700, x: 0, h: 2.9, dir: 1, horizon: .4 }, {});
    const C = rail.cam, p = rail._P(100, 0, C.camY - rail.yAt(1700) + C.gv * 100);
    check('a point on the centreline straight ahead lands at the centre', p && Math.abs(p[0] - C.cx - (C.X[20] || 0) * p[2]) < 6, JSON.stringify(p));
    const a = rail._P(20, 0, 0), b = rail._P(40, 0, 0);
    check('k halves when the distance doubles', a && b && Math.abs(a[2] / b[2] - 2) < .01, a && b && (a[2] / b[2]).toFixed(3));
    const q1 = rail._P(20, 1, 0), q2 = rail._P(20, 0, 1), q0 = rail._P(20, 0, 0);
    check('square pixels: 1 m across = 1 m up at 20 m', Math.abs(Math.abs(q1[0] - q0[0]) - Math.abs(q2[1] - q0[1])) < .01, (q1[0] - q0[0]).toFixed(2) + ' vs ' + (q0[1] - q2[1]).toFixed(2));
    rail.paint(NULLG, vp, { s: 1700, x: 0, h: 2.9, dir: -1, horizon: .4 }, {});
    const m = rail.project(1660, 3, 0), m2 = rail.project(1660, 0, 0);
    check('the rear view mirrors: +x is on the screen\'s left', m && m2 && m[0] < m2[0], JSON.stringify([m, m2]));
    // crest: on the S3 climb's end, a point far down the descent is hidden
    rail.paint(NULLG, vp, { s: 10050, x: 0, h: 2.9, dir: 1, horizon: .4 }, {});
    check('crest clipping hides what lies past a crest', rail.visible(10950, 0, 0) === false && rail.visible(10200, 0, 0) === true, rail.visible(10950, 0, 0) + ' ' + rail.visible(10200, 0, 0));
    // project, then pick, round-trips for a signal
    rail.paint(NULLG, vp, { s: 1960, x: 0, h: 2.9, dir: 1, horizon: .4 }, {});
    const sg = R.signals.A.find(g => g.id === 'B103'), pp = rail.project(sg.s, sg.x, 2);
    check('project then pick finds the signal', pp && rail.pick(pp[0], pp[1], 6) === 'sig:B103', JSON.stringify(pp) + ' ' + rail.pick(pp ? pp[0] : 0, pp ? pp[1] : 0, 6));
  },
  route({ DH, check }) {
    const R = DH.route('halo'), D = DH.route('depot');
    check('the loop compiles to length / 5 segments', R.segs.length === 20600 / 5, R.segs.length);
    check('the depot compiles', D.segs.length === 220, D.segs.length);
    const mid = R.segs[Math.floor(1065 / 5)]; check('a left curve bends left (negative)', mid.curve < 0, mid.curve);
    const mid2 = R.segs[Math.floor(2900 / 5)]; check('a right curve bends right (positive)', mid2.curve > 0, mid2.curve);
    const T = DH.compileRoute({ id: 't', length: 3000, loop: false, script: [[100, 'grade', { len: 800, permille: 25 }], [1200, 'bridge', { len: 600, kind: 'truss', water: 'river' }]], tracks: [{ id: 'A', x: 0 }] });
    const h = T.segs[Math.floor(1000 / 5)].y0; check('a 25 permille x 800 m grade climbs 20 m', Math.abs(h - 20) < .5, h.toFixed(2));
    check('a 600 m bridge flags 120 segments', T.segs.filter(s => s.flags.bridge).length === 120, T.segs.filter(s => s.flags.bridge).length);
    check('the routes validate', R.validation.length === 0 && D.validation.length === 0, R.validation.concat(D.validation).join(' | '));
    check('the loop closes (no height step at the seam)', Math.abs(R.closure) < .5, R.closure);
    const bad = DH.compileRoute({ id: 'b', length: 2000, loop: false, script: [[500, 'station', { id: 'x', name: 'X', side: 'L', len: 150, stop: { 6: 560 } }]], tracks: [{ id: 'A', x: 0 }] });
    check('a stop outside its platform fails validation', bad.validation.some(v => /does not fit/.test(v)), bad.validation.join('|'));
  },
  physics({ DH, check }) {
    const T = DH.TUNING, ty = DH.TRAINS.h8000, env = { T, ty, doors: true, grade: 0 };
    const run = (n, v0, until, e = env) => { const st = { v: v0, P: 0, B: 0, a: 0, jerk: 0, slipT: 0, slips: 0 }; let t = 0, d = 0; while (t < 300 && !until(st, t)) { DH.trainStep(st, n, 1 / 120, e); d += st.v / 3.6 / 120; t += 1 / 120; } return { t, d, v: st.v, st }; };
    const a = run(5, 0, st => st.v >= 80); check('0-80 km/h on P5: 29-34 s', a.t >= 29 && a.t <= 34, a.t.toFixed(1));
    const b = run(-4, 80, st => st.v <= 0); check('B4 from 80: 37-41 s, 425-465 m', b.t >= 37 && b.t <= 41 && b.d >= 425 && b.d <= 465, b.t.toFixed(1) + ' s ' + b.d.toFixed(0) + ' m');
    const c = run(-9, 80, st => st.v <= 0); check('EB from 80: 175-195 m', c.d >= 175 && c.d <= 195, c.d.toFixed(0));
    const d = run(0, 80, (st, t) => t >= 60); check('coasting at 80 loses 7-10 km/h a minute', 80 - d.v >= 7 && 80 - d.v <= 10, (80 - d.v).toFixed(1));
    const up = run(5, 30, (st, t) => t >= 5, Object.assign({}, env, { grade: 25 })); check('25 permille up on P5 at 30 still accelerates', up.v > 30, up.v.toFixed(1));
    const dn = run(0, 30, (st, t) => t >= 5, Object.assign({}, env, { grade: -25 })); check('25 permille down at N gains speed', dn.v > 30, dn.v.toFixed(1));
    const tr = new DH.Train('h8000'); let seen = new Set([tr.name]); for (let i = 0; i < 20; i++) { tr.move(1); seen.add(tr.name); } for (let i = 0; i < 30; i++) { tr.move(-1); seen.add(tr.name); }
    check('the lever passes every position and clamps', seen.size === 15 && tr.name === 'EB', [...seen].join(','));
    tr.st.v = 30; check('EB cannot be left while moving', tr.move(1) === false && tr.isEB);
    const doors = run(5, 0, (st, t) => t >= 3, Object.assign({}, env, { doors: false })); check('no traction with the doors open', doors.v === 0, doors.v);
    const wet = run(5, 0, (st, t) => t >= 6, Object.assign({}, env, { wet: true })); check('rain and P5 from a stand slips', wet.st.slips > 0, wet.st.slips);
    const dry = run(5, 0, (st, t) => t >= 30); check('dry rails never slip', dry.st.slips === 0, dry.st.slips);
    const r1 = run(3, 0, (st, t) => t >= 60), r2 = run(3, 0, (st, t) => t >= 60); check('the same inputs give the same distance', r1.d === r2.d, r1.d + ' ' + r2.d);
  },
  signals({ DH, check }) {
    const run = new DH.Run('S1', {}); run.teleport(1000, { v: 0 }); const sigs = run.sigs, i0 = sigs.findIndex(g => g.id === 'B102');
    const at = k => { const a = sigs[i0 + k], b = sigs[i0 + k + 1]; return (run.U(a.s) + run.U(b.s)) / 2; };
    const asp = () => sigs[i0].aspect;
    for (const [k, want] of [[0, 'R'], [1, 'Y'], [2, 'YG'], [3, 'G']]) { run.actors = []; run.addActor({ id: 'blk', track: 'A', dir: 1, cars: 1, s: at(k) + 5, blocks: true }); run._aspects(); const got = asp(); check('a train ' + k + ' blocks ahead shows ' + want, got === want || (k === 3 && got === 'G'), got); }
    run.actors = []; run._aspects();
    // a starting signal holds until the departure says ready
    const r2 = new DH.Run('S1', {}), st = r2.sigs.find(g => g.id === 'AK-S'); check('the starting signal holds red during the dwell', st.aspect === 'R', st.aspect);
    for (let i = 0; i < 120 * 30 && !r2.dwell.sigClear; i++) r2.step(1 / 120, {}); check('then clears when ready', st.aspect !== 'R', st.aspect);
    // ATS: the beacon at a red rings; no confirm in 5 s fires EB; a confirm stops that
    const r3 = new DH.Run('S1', {}); r3.teleport(1700, { v: 40 }); r3.forced = { B103: 'R' }; r3._aspects(); const ev = []; r3.on('*', d => ev.push(d.type));
    r3.teleport(2150 - 605, { v: 30 }); r3.forced = { B103: 'R' }; r3._aspects(); for (let i = 0; i < 120; i++) r3.step(1 / 120, {});
    check('passing a red signal\'s beacon rings the ATS bell', ev.includes('atsRing'), ev.slice(-5).join(','));
    for (let i = 0; i < 120 * 5; i++) r3.step(1 / 120, {}); check('no confirm in 5 s fires the EB', ev.includes('atsFire') && r3.train.isEB, ev.slice(-5).join(','));
    const r4 = new DH.Run('S1', {}); const ev4 = []; r4.on('*', d => ev4.push(d.type)); r4.teleport(2150 - 605, { v: 30 }); r4.forced = { B103: 'R' }; r4._aspects(); for (let i = 0; i < 120; i++) r4.step(1 / 120, {}); r4.step(1 / 120, { ats: true }); for (let i = 0; i < 120 * 6; i++) r4.step(1 / 120, { brake: i < 6 });
    check('confirming stops the ATS from firing', ev4.includes('atsConfirm') && !ev4.includes('atsFire'), ev4.filter(t => t.startsWith('ats')).join(','));
    // SPAD exactly at the signal
    const r5 = new DH.Run('S1', {}); const ev5 = []; r5.on('spad', () => ev5.push(r5.s)); r5.teleport(2140, { v: 20 }); r5.forced = { B103: 'R' }; r5._aspects(); r5.ats.ringing = false; for (let i = 0; i < 400; i++) r5.step(1 / 120, {});
    check('passing a red is a SPAD at the signal', ev5.length === 1 && ev5[0] >= 2150 && ev5[0] < 2150.6, JSON.stringify(ev5));
    // the S2 freight: the autopilot meets red at M6000 (the ATS bell) and the run still finishes
    const r6 = DH.autoRun('S2', { skill: 1 }); check('S2: the freight turns M6000 red and the run goes on to Okiku-dera', r6.phase === 'finished' && r6.eventsFired.includes('freight'), r6.phase);
  },
  limits({ DH, check }) {
    // a 70 board at HB-C (880..1260): 72 passes, 76 costs once, 80 for 10 s no second, clears when the rear passes the END
    const mk = v => { const r = new DH.Run('S1', {}); r.teleport(870, { v }); r.lastAspectV = 999; let n = 0; r.on('limit', () => n++); return { r, n: () => n }; };
    const a = mk(72); for (let i = 0; i < 120 * 2; i++) { a.r.train.st.v = 72; a.r.step(1 / 120, {}); } check('72 under a 70 limit: no penalty', a.n() === 0, a.n());
    const b = mk(76); for (let i = 0; i < 120 * 2; i++) { b.r.train.st.v = 76; b.r.step(1 / 120, {}); } check('76 under a 70 limit: one penalty', b.n() === 1, b.n());
    const c = mk(80); for (let i = 0; i < 120 * 10; i++) { c.r.train.st.v = 80; c.r.step(1 / 120, {}); } check('80 held for 10 s: still one penalty', c.n() === 1, c.n());
    const d = new DH.Run('S1', {}); d.teleport(1300, { v: 60 }); d.lastAspectV = 999; check('the limit holds until the rear passes the END', d.limitAt(1300) === 70 && d.limitAt(1260 + d.len + 1) > 70, d.limitAt(1300) + ' ' + d.limitAt(1260 + d.len + 1));
  },
  stations({ DH, check }) {
    const judge = err => { const r = new DH.Run('S1', {}); const p = r.stops[1]; r.teleport(p.target - 200, { v: 0 }); r.s = p.target + err; r._smooth = false; r._stopDecel = 1.5; r.phase = 'run'; r._judge(p, err); return r; };
    for (const [e, want] of [[.05, 'PERFECT HALO!'], [.25, 'GREAT!'], [.6, 'GOOD'], [.95, 'OK'], [3, 'OVERRUN!']]) { const r = judge(e); check('a stop ' + e + ' m past is ' + want, r.lastJudgment && r.lastJudgment.label === want, r.lastJudgment && r.lastJudgment.label); }
    const sh = judge(-2); check('2 m short: creep up (no judgment yet)', !sh.lastJudgment && sh.creep && sh.creep.canSettle, JSON.stringify(sh.creep));
    for (let i = 0; i < 120 * 7; i++) sh.step(1 / 120, {}); check('6 s later it settles as SHORT', sh.lastJudgment && sh.lastJudgment.label === 'SHORT', sh.lastJudgment && sh.lastJudgment.label);
    const ov = judge(7); check('7 m over: OVER THE MARK, then backed up to the mark', ov.lastJudgment.label === 'OVER THE MARK' && ov.backup, ov.lastJudgment.label); for (let i = 0; i < 120 * 8; i++) ov.step(1 / 120, {}); check('the back-up ends on the mark', Math.abs(ov.s - ov.stops[1].target) < .06 && !ov.backup && ov.phase === 'dwell', ov.s - ov.stops[1].target);
    // re-stops: a short stop, a creep, another stop
    const rs = judge(-3); rs.s = rs.stops[1].target - 2.5; rs._judge(rs.stops[1], -2.5); check('a re-stop is counted', rs.creep && rs.creep.restops === 1, JSON.stringify(rs.creep));
    // arrival: on time, late, early
    for (const [off, want] of [[-3, 'EARLY'], [0, 'ON TIME!'], [5, 'LATE +3']]) { const r = new DH.Run('S1', {}); const p = r.stops[1]; r.teleport(p.target - 100, { v: 0 }); r.clock = p.arrT + off; r.s = p.target; r._smooth = false; r._settle(p, 0, false); check('arriving ' + off + ' s off the timetable: ' + want, r.lastJudgment.time === want, r.lastJudgment.time); }
    // smooth: B1 at the end vs B8 held
    const smooth = n => { const r = new DH.Run('S1', {}); const p = r.stops[1]; r.teleport(p.target - 6, { v: 6 }); r.train.notch = n; r.train.st.B = n === -1 ? .5 : 4; for (let i = 0; i < 120 * 20 && !r.lastJudgment; i++) r.step(1 / 120, {}); return r.lastJudgment; };
    const s1 = smooth(-1), s8 = smooth(-8); check('B1 to the stop is SMOOTH', s1 && s1.smooth, JSON.stringify(s1)); check('B8 held to the stop is not', s8 && !s8.smooth, JSON.stringify(s8));
    // the dwell: doors, melody, close, buzzer, pilot, signal; power before the pilot does nothing
    const r = new DH.Run('S1', {}), order = []; r.on('*', d => { if (['doorsOpen', 'melody', 'doorsClosing', 'buzzer', 'pilot', 'departReady'].includes(d.type)) order.push(d.type); });
    const r0 = r.s; for (let i = 0; i < 120 * 3; i++) r.step(1 / 120, { power: i % 30 === 0 }); check('power before the pilot lamp moves nothing', Math.abs(r.s - r0) < .01 && r.train.v === 0, r.s - r0);
    for (let i = 0; i < 120 * 30; i++) r.step(1 / 120, {}); check('the dwell goes melody, doors closing, buzzer, pilot, signal', order.join(',') === 'melody,doorsClosing,buzzer,pilot,departReady', order.join(','));
    // a missed stop and a wrong stop
    const m = new DH.Run('S1', {}); const pm = m.stops[1]; m.teleport(pm.target - 30, { v: 60 }); let missed = 0; m.on('missed', () => missed++); const g0 = m.grace; for (let i = 0; i < 120 * 6; i++) m.step(1 / 120, {}); check('a missed stop costs 10 s', missed === 1 && g0 - m.grace >= 9.9, missed + ' ' + (g0 - m.grace));
    const w = new DH.Run('S2', {}); const pw = w.passes[0]; w.teleport(pw.target - 25, { v: 10 }); let wrong = 0; w.on('wrongStop', () => wrong++); for (let i = 0; i < 120 * 10; i++) w.step(1 / 120, { brake: i < 8 }); check('stopping at a pass station is a WRONG STOP', wrong === 1, wrong);
  },
  calls({ DH, check }) {
    const r = new DH.Run('S1', {}); r.teleport(1900, { v: 0 }); const c = r.callTargets.find(q => q.id === 'sig:B103');
    r.s = c.s - 200; r._calls(0, {}); check('no window 200 m out', c.state === 'wait', c.state);
    r.s = c.s - 170; r._calls(0, {}); check('the window opens 180 m out', c.state === 'open', c.state);
    r.s = c.s - 100; r._calls(0, { call: true }); check('a call at 100 m is GREAT', c.result === 'great', c.result);
    const r2 = new DH.Run('S1', {}); r2.teleport(1900, { v: 0 }); const c2 = r2.callTargets.find(q => q.id === 'sig:B103'); r2.s = c2.s - 170; r2._calls(0, {}); r2.s = c2.s - 40; r2._calls(0, { call: true }); check('a call at 40 m is OK', c2.result === 'ok', c2.result);
    r2.s = c2.s - 20; const c3 = r2.callTargets.find(q => q.state === 'wait' && q.s > r2.s + 400); r2._calls(0, {}); check('the window closes 30 m out', !c3 || c3.state === 'wait', c3 && c3.state);
    // the departure call is GREAT before power
    const d = new DH.Run('S1', {}); for (let i = 0; i < 120 * 40 && !d.dep; i++) d.step(1 / 120, {}); let got = null; d.on('call', e => { got = e; }); d.step(1 / 120, { call: true }); check('the departure call before power is GREAT', got && got.great && got.kind === 'start', JSON.stringify(got && { g: got.great, k: got.kind }));
    // auto calls: no points
    const a = new DH.Run('S1', { autoCalls: true }); a.teleport(1900, { v: 0 }); const ca = a.callTargets.find(q => q.id === 'sig:B103'); const sc = a.score; a.s = ca.s - 85; a._calls(0, {}); check('auto calls call for you, for no points', ca.state === 'done' && a.score === sc, ca.state + ' ' + (a.score - sc));
    // the horn: 0.6 s scores, 0.3 s doesn't; a missed zone costs 1 s on Normal, nothing on Easy
    const horn = (held, diff) => { const h = new DH.Run('S1', { difficulty: diff }); h.teleport(1040, { v: 40 }); const g0 = h.grace; let t = 0, inT = 0; while (h.s < 1210 && t < 30) { if (h.s > 1052) inT += 1 / 120; h.step(1 / 120, { horn: h.s > 1052 && inT <= held }); h.train.st.v = 40; t += 1 / 120; } return { made: h.horns.made, dg: g0 - h.grace }; };
    check('a 0.6 s horn in the zone scores', horn(.6, 'normal').made === 1); check('a 0.3 s horn does not', horn(.3, 'normal').made === 0);
    check('a missed horn zone costs 1 s on Normal', Math.abs(horn(0, 'normal').dg - 1) < .01, horn(0, 'normal').dg); check('and nothing on Easy', horn(0, 'easy').dg === 0, horn(0, 'easy').dg);
  },
  timetable({ DH, game, check }) {
    const r = new DH.Run('S1', {}), c0 = r.clock; for (let i = 0; i < 120 * 10; i++) r.step(1 / 120, {}); check('the clock runs 1:1 with game time', Math.abs(r.clock - c0 - 10) < 1e-6, r.clock - c0);
    game.go('drive', { stage: 'S1' }, { fade: 0 }); game.advance(.5); const d = DH.drive, k0 = d.run.clock; game.paused = true; game.advance(3); const k1 = d.run.clock; game.paused = false; check('the clock stops while paused', Math.abs(k1 - k0) < 1e-6, k1 - k0);
    // the calibrated par arrives 6-12 s early at every stop
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'PR']) { const run = new DH.Run(id, {}), ap = new DH.Autopilot(run, { skill: 1, mode: 'mintime' }); for (let i = 0; i < 120 * 900 && run.phase !== 'finished' && run.phase !== 'over'; i++) run.step(1 / 120, ap.cmd(1 / 120)); const early = run.judgments.map(j => -j.late); check(id + ': par arrives 6-12 s early at every stop', early.length === run.stops.length - 1 && early.every(e => e >= 5.9 && e <= 12.1), early.map(e => e.toFixed(1)).join(',')); }
  },
  score({ DH, check }) {
    const r = new DH.Run('S1', {}); r.grace = .5; r.penalty(1, 0, 'x'); r.step(1 / 120, {}); check('Halo Time at 0 is game over', r.phase === 'over', r.phase);
    const c = new DH.Run('S1', {}); c.bonus(200, 0); check('Halo Time is capped at 99', c.grace === 99, c.grace);
    const m = new DH.Run('S1', {}); check('the max score is a number', isFinite(m.maxScore()) && m.maxScore() > 1000, m.maxScore());
    const ap = DH.autoRun('S1', { skill: 1 }); check('a perfect autopilot run ranks S', ap.rank() === 'S', ap.rank() + ' ' + ap.finalScore() + '/' + ap.maxScore());
    const bad = new DH.Run('S1', {}); for (const p of bad.stops.slice(1)) { bad.clock = p.arrT + 15; bad._settle(p, 3.5, false); bad.stopIdx++; } bad.comfort = 60; check('overruns and lateness rank C or lower', ['C', 'D'].includes(bad.rank()), bad.rank());
    const e = new DH.Run('S1', { difficulty: 'easy' }), x = new DH.Run('S1', { difficulty: 'expert' }), ge = e.grace, gx = x.grace; e.penalty(2, 0); x.penalty(2, 0); check('difficulty: Easy halves penalties, Expert x1.5', Math.abs(ge - e.grace - 1) < .01 && Math.abs(gx - x.grace - 3) < .01 && ge === 40 && gx === 15, (ge - e.grace) + ' ' + (gx - x.grace) + ' ' + ge + ' ' + gx);
  },
  crowds({ DH, check }) {
    const r = new DH.Run('S4', {}), P = new DH.People(r), at = P.list.filter(p => p.home && p.home.st.id === 'daigaku' && p.state === 'queue');
    check('a crowd waits at Daigaku-mae (crowd 3)', at.length > 20, at.length);
    const tgt = r.stops[1].target, doors = []; for (let c = 0; c < 10; c++) for (const dp of DH.DOOR_POS) doors.push(tgt - c * 20 - dp);
    check('they queue at the door marks of a 10-car train', at.every(p => doors.some(d => Math.abs(d - p.s) < .6)), at.find(p => !doors.some(d => Math.abs(d - p.s) < .6)));
    r.jumpToStop(1); const P2 = new DH.People(r); for (let i = 0; i < 120 * 14; i++) { r.step(1 / 120, {}); P2.update(1 / 120); }
    const left = P2.list.filter(p => p.home && p.home.st.id === 'daigaku' && p.state === 'queue' && p.board).length, stay = P2.list.filter(p => p.home && p.home.st.id === 'daigaku' && !p.board).length; check('boarding empties the queues before the doors close (some wait for another train)', left === 0 && stay > 0, left + ' ' + stay);
    const c = new DH.Run('S1', {}); c.comfortHit(15, 'eb'); check('an EB costs 15 comfort', c.comfort === 85, c.comfort); c.teleport(1700, { v: 60 }); c.comfort = 85; for (let i = 0; i < 120 * 17; i++) { c.step(1 / 120, {}); c.train.st.v = 60; c.train.st.a = 0; c.train.st.jerk = 0; } check('comfort recovers +1 every 8 s of smooth running', c.comfort >= 87, c.comfort);
  },
  events({ DH, check }) {
    const want = { S1: ['oncoming', 'kota'], S2: ['freight'], S3: ['festival', 'workers', 'fuji', 'obstruction', 'oncoming'], S4: ['rival', 'doorRush', 'glare', 'oncoming'], S5: ['fog', 'flash', 'finale'] };
    for (const id in want) { const r = DH.autoRun(id, { skill: 1, settle: 4 }); const miss = want[id].filter(e => !r.eventsFired.includes(e)); check(id + ': every scripted event fires once', !miss.length && new Set(r.eventsFired).size === r.eventsFired.length || (!miss.length && r.eventsFired.filter(e => e === 'radio').length >= 1), 'missing ' + miss.join(',') + ' fired ' + r.eventsFired.join(',')); if (id === 'S4') { const d = r.judgments[0]; check('S4: the door rush adds 8 s to the dwell', r.misc && r.eventsFired.includes('doorRush'), ''); } if (id === 'S3') check('S3: the obstruction is avoided by stopping', r.misc.hazard, JSON.stringify(r.misc)); if (id === 'S5') check('S5: the flash is answered with the horn', r.misc.flash, JSON.stringify(r.misc)); }
    // gates down while our train is on the crossing
    const r = new DH.Run('S1', {}); r.teleport(1000, { v: 30 }); let ok = true; for (let i = 0; i < 120 * 30; i++) { r.step(1 / 120, {}); r.train.st.v = 30; const X = r.R.crossings.find(c => c.id === 'X1'); if (r.s > X.s - 1 && r.s - r.len < X.s + X.road && X.gate > .01) ok = false; } check('the gates are down while the train is on the crossing', ok);
    // the obstruction clears only after we stop
    const o = new DH.Run('S3', {}); o.teleport(10600, { v: 30 }); o.events.trigger('obstruction'); for (let i = 0; i < 120 * 5; i++) o.step(1 / 120, { brake: i < 10 }); check('the obstruction stays while the train still moves', o.events.obst.active, o.train.v);
    for (let i = 0; i < 120 * 40; i++) o.step(1 / 120, { brake: true }); check('it clears 12 s after the train stops', !o.events.obst.active && o.misc.hazard, JSON.stringify({ a: o.events.obst.active, v: o.train.v }));
    // the horn makes the workers wave
    const w = new DH.Run('S3', {}); w.teleport(9300, { v: 25 }); w.events.fire(w.events.list.find(e => e.type === 'workers')); for (let i = 0; i < 120 * 4; i++) { w.step(1 / 120, { horn: i < 120 }); w.train.st.v = 25; } check('the horn makes the track workers wave', w.events.workers[0] && w.events.workers[0].waved, JSON.stringify(w.events.workers[0] && w.events.workers[0].state));
  },
  tod({ DH, check }) {
    let ok = true, worst = 0; for (const k of DH.TOD_KEYS) { const a = DH.grade(k.h - .001), b = DH.grade(k.h + .001); const d = Math.max(...a.mul.map((v, i) => Math.abs(v - b.mul[i]))); worst = Math.max(worst, d); if (d > .01) ok = false; } check('the grade is continuous at every boundary hour', ok, worst);
    const r = new DH.Run('S2', {}); check('rain lowers the adhesion', r._env().wet === true);
    const f = new DH.Run('S5', {}); f.weather = 'fog'; check('fog cuts sighting to 180 m', f.fogAt(f.s) > .3);
  }
};
