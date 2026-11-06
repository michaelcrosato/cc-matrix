// The one test command: node tests/run.mjs [--fast]. Prints only failures and a one-line count. --fast skips the browser parts.
import vm from 'node:vm';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = new URL('..', import.meta.url), R = f => readFileSync(new URL(f, root), 'utf8'), fast = process.argv.includes('--fast'), only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
const man = JSON.parse(R('src/manifest.json'));
let checks = 0; const fails = [];
const check = (name, ok, detail = '') => { checks++; if (!ok) fails.push(name + (detail !== '' ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : '')); };
const safe = (name, fn) => { if (only && !name.includes(only)) return; try { fn(); } catch (e) { check(name + ' threw', false, String(e && e.stack || e)); } };
function load(o = {}) {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, performance, structuredClone, setTimeout, clearTimeout, ...o }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(R('vendor/my-3d2dge/dist/handoff/my-3d2dge.js'), ctx, { filename: 'engine' });
  ctx.GAME_ABOUT = existsSync(new URL('src/about-data.json', root)) ? JSON.parse(R('src/about-data.json')) : null;
  for (const f of [...man.sim, ...man.game]) vm.runInContext(R(f), ctx, { filename: f });
  return ctx;
}
const dt = 1 / 120;
const noop = () => ({ x: 213, y: 116, tool: 'forceps', trig: 0 });
/** a case with a bare table: one test object, no tutorial, no drain */
function table(G, spawn, o = {}) { G.defCase({ id: 'tst', hidden: true, n: 0, title: 'Test', doctor: o.doctor || 'vale', duo: o.duo, look: o.look, site: 'abdomen', clock: o.clock ?? 300, vitals: o.vitals ?? 80, drain: 0, phases: [{ id: 'p', obj: 'x', spawn, clear: o.clear }, { id: 'q', obj: 'y', clear: { t: 99 } }], barks: {} }); return G.Op.create('tst', { seed: 42, difficulty: o.diff || 'resident' }); }
/** a hand that does things: run(S, frames of input) */
function drive(G, S, seq) { const out = []; for (const inp of seq) { G.Op.step(S, [inp], dt); out.push(...S.ev); } return out; }
const hold = (n, inp) => Array.from({ length: n }, () => inp);
const path = (x0, y0, x1, y1, n, tool, trig = 1) => Array.from({ length: n }, (_, i) => ({ x: x0 + (x1 - x0) * (i + 1) / n, y: y0 + (y1 - y0) * (i + 1) / n, tool, trig }));
const has = (ev, k) => ev.some(e => e[0] === k);
const gradeOf = ev => { const g = ev.filter(e => e[0] === 'grade'); return g.length ? g[g.length - 1][3] : null; };

// ------------------------------------------------------------------ tools
safe('tools', () => {
  const ctx = load(), G = ctx.GAME, T = G.TUNING, Op = G.Op; const pre = (S, tool) => { G.Op.step(S, [{ x: 100, y: 200, tool, trig: 0 }], dt); drive(G, S, hold(20, { x: 100, y: 200, tool, trig: 0 })); };
  // Forceps
  let S = table(G, [{ type: 'shard', x: 200, y: 100, ang: 0, depth: 20 }]), o = S.objs[0]; pre(S, 'forceps');
  let ev = drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1 }, ...path(200, 100, 224, 100, 48, 'forceps'), ...path(224, 100, 240, 100, 12, 'forceps'), { x: 240, y: 100, tool: 'forceps', trig: 0 }]);
  check('forceps: a slow pull frees and the dish catches', o.done && has(ev, 'dish'), ev.map(e => e[0])); check('forceps: textbook', gradeOf(ev) === 'Textbook', gradeOf(ev));
  S = table(G, [{ type: 'shard', x: 200, y: 100, ang: 0, depth: 20 }]); o = S.objs[0]; pre(S, 'forceps'); let v0 = S.vitals;
  ev = drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1 }, ...path(200, 100, 230, 100, 8, 'forceps')]);
  check('forceps: too fast tears', has(ev, 'tear') && S.vitals <= v0 - T.tearVitals + .01 && S.stats.slips === 1 && S.objs.some(q => q.type === 'laceration'), [S.vitals, ev.map(e => e[0])]);
  S = table(G, [{ type: 'shard', x: 200, y: 100, ang: 0, depth: 20 }]); pre(S, 'forceps'); ev = drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1 }, ...path(200, 100, 205, 112, 40, 'forceps')]);
  check('forceps: off axis tears', has(ev, 'tear'));
  S = table(G, [{ type: 'hook', tag: 'h', x: 200, y: 100, ang: 0, depth: 30, barbs: 2 }]); pre(S, 'forceps'); ev = drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1 }, ...path(200, 100, 210, 100, 40, 'forceps')]);
  check('hook: tears with barbs set', has(ev, 'tear'));
  // Scalpel
  S = table(G, [{ type: 'guide', pts: [[150, 100], [250, 100]] }]); o = S.objs[0]; pre(S, 'scalpel');
  ev = drive(G, S, [{ x: 150, y: 100, tool: 'scalpel', trig: 1 }, ...path(150, 100, 252, 100, 60, 'scalpel')]); check('scalpel: a clean trace finishes, textbook', o.done && gradeOf(ev) === 'Textbook', [o.prog, gradeOf(ev)]);
  S = table(G, [{ type: 'guide', pts: [[150, 100], [250, 100]] }]); o = S.objs[0]; pre(S, 'scalpel');
  ev = drive(G, S, [{ x: 150, y: 100, tool: 'scalpel', trig: 1 }, ...path(150, 100, 190, 100, 30, 'scalpel'), ...hold(30, { x: 190, y: 120, tool: 'scalpel', trig: 1 })]); check('scalpel: off the line slips', has(ev, 'slip') && S.objs.some(q => q.type === 'laceration'));
  S = table(G, [{ type: 'guide', pts: [[150, 100], [250, 100]] }]); o = S.objs[0]; pre(S, 'scalpel'); drive(G, S, [{ x: 150, y: 100, tool: 'scalpel', trig: 1 }, ...path(150, 100, 190, 100, 30, 'scalpel'), { x: 190, y: 100, tool: 'scalpel', trig: 0 }]); ev = drive(G, S, [{ x: 192, y: 100, tool: 'scalpel', trig: 1 }, ...path(192, 100, 252, 100, 40, 'scalpel')]); check('scalpel: resume after release', o.done);
  S = table(G, [{ type: 'nerve', pts: [[200, 60], [200, 160]] }, { type: 'guide', pts: [[120, 100], [180, 100]] }]); pre(S, 'scalpel'); v0 = S.vitals; ev = drive(G, S, [{ x: 196, y: 110, tool: 'scalpel', trig: 1 }, ...path(196, 110, 206, 110, 20, 'scalpel')]); check('scalpel: crossing gold costs 12 and a slip', has(ev, 'nerve') && S.vitals <= v0 - 11.9, [v0, S.vitals]);
  // Suture
  S = table(G, [{ type: 'wound', x: 200, y: 100, ang: 0, n: 2, len: 20, gap: 8 }]); o = S.objs[0]; pre(S, 'suture'); let st = o.stitches[0];
  ev = drive(G, S, [{ x: st.a[0], y: st.a[1], tool: 'suture', trig: 1 }, ...path(st.a[0], st.a[1], st.b[0], st.b[1], 30, 'suture'), { x: st.b[0], y: st.b[1], tool: 'suture', trig: 0 }]); check('suture: a stitch lands', o.sewn === 1 && has(ev, 'stitch'));
  st = o.stitches[1]; v0 = S.vitals; ev = drive(G, S, [{ x: st.a[0], y: st.a[1], tool: 'suture', trig: 1 }, ...path(st.a[0], st.a[1], st.a[0] + 3, st.a[1] + 3, 10, 'suture'), { x: st.a[0] + 3, y: st.a[1] + 3, tool: 'suture', trig: 0 }]); check('suture: a bad release is loose, costs vitals', o.sewn === 1 && has(ev, 'loose') && S.vitals < v0);
  ev = drive(G, S, [{ x: st.a[0], y: st.a[1], tool: 'suture', trig: 1 }, ...path(st.a[0], st.a[1], st.b[0], st.b[1], 30, 'suture'), { x: st.b[0], y: st.b[1], tool: 'suture', trig: 0 }]); check('suture: the wound closes', o.done);
  // Salve
  S = table(G, [{ type: 'patch', x: 200, y: 100, r: 10 }]); o = S.objs[0]; pre(S, 'salve'); v0 = S.vitals; ev = drive(G, S, hold(60, { x: 200, y: 100, tool: 'salve', trig: 1 })); check('salve: covers and heals', o.done && has(ev, 'healed') && S.vitals > v0 - 1, [o.cells && o.cells.got, o.cells && o.cells.n]);
  // Syringe
  S = table(G, [{ type: 'clot', x: 200, y: 100, ang: 0 }]); o = S.objs[0]; pre(S, 'syringe'); ev = drive(G, S, [...hold(70, { x: 200, y: 100, tool: 'syringe', trig: 1 }), { x: 200, y: 100, tool: 'syringe', trig: 0 }]); check('syringe: a targeted dose, full, is textbook', o.dosed && gradeOf(ev) === 'Textbook', gradeOf(ev));
  S = table(G, [{ type: 'clot', x: 200, y: 100, ang: 0 }]); o = S.objs[0]; pre(S, 'syringe'); ev = drive(G, S, [...hold(160, { x: 200, y: 100, tool: 'syringe', trig: 1 }), { x: 200, y: 100, tool: 'syringe', trig: 0 }]); check('syringe: too long gets an air bubble, sloppy', has(ev, 'bubble') && gradeOf(ev) === 'Sloppy');
  S = table(G, [], { vitals: 40, clear: { t: 99 } }); pre(S, 'syringe'); v0 = S.vitals; ev = drive(G, S, [...hold(70, { x: 100, y: 200, tool: 'syringe', trig: 1 }), { x: 100, y: 200, tool: 'syringe', trig: 0 }]); check('syringe: anywhere else, the IV', has(ev, 'iv') && Math.abs(S.vitals - v0 - T.ivDose) < .5, [v0, S.vitals]);
  // Cautery
  S = table(G, [{ type: 'bleeder', x: 200, y: 100 }]); o = S.objs[0]; pre(S, 'cautery'); ev = drive(G, S, hold(60, { x: 200, y: 100, tool: 'cautery', trig: 1 })); check('cautery: burns a bleeder, textbook', o.done && gradeOf(ev) === 'Textbook');
  S = table(G, [{ type: 'bleeder', x: 300, y: 100 }]); pre(S, 'cautery'); v0 = S.vitals; ev = drive(G, S, hold(90, { x: 200, y: 100, tool: 'cautery', trig: 1 })); check('cautery: on bare tissue chars, then slips', S.marks.length > 0 && has(ev, 'slip') && S.vitals < v0);
  S = table(G, [{ type: 'bleeder', x: 300, y: 100, need: 99 }]); pre(S, 'cautery'); ev = drive(G, S, hold(300, { x: 300, y: 100, tool: 'cautery', trig: 1 })); check('cautery: heat locks', has(ev, 'lock'));
  // Suction
  S = table(G, [{ type: 'pool', x: 200, y: 100, vol: 30 }, { type: 'polyp', x: 200, y: 100 }]); o = S.objs[0]; pre(S, 'suction'); check('a pool hides what is under it', !Op.valid(S, S.objs[1], 'cautery')); ev = drive(G, S, hold(100, { x: 200, y: 100, tool: 'suction', trig: 1 })); check('suction: empties a pool', o.done && Op.valid(S, S.objs.find(q => q.type === 'polyp'), 'cautery')); check('suction never breaks Flow', S.stats.slips === 0);
  // Sonar
  S = table(G, [{ type: 'bleeder', x: 200, y: 100, hidden: true }]); o = S.objs[0]; pre(S, 'sonar'); check('hidden cannot be touched', !Op.valid(S, o, 'cautery')); ev = drive(G, S, hold(10, { x: 210, y: 100, tool: 'sonar', trig: 1 })); check('sonar marks what is hidden', o.marked > 0 && has(ev, 'found') && Op.valid(S, o, 'cautery')); drive(G, S, hold(120 * 5, { x: 10, y: 10, tool: 'forceps', trig: 0 })); check('a mark fades after four seconds', !(o.marked > 0));
  // a key or click counts as a full press; analog is never more power: partial travel still acts past the threshold
  S = table(G, [{ type: 'pool', x: 200, y: 100, vol: 60 }]); o = S.objs[0]; pre(S, 'suction'); drive(G, S, hold(30, { x: 200, y: 100, tool: 'suction', trig: .4 })); const half = 60 - o.vol; S = table(G, [{ type: 'pool', x: 200, y: 100, vol: 60 }]); o = S.objs[0]; pre(S, 'suction'); drive(G, S, hold(30, { x: 200, y: 100, tool: 'suction', trig: 1 })); check('analog gives no more power', Math.abs(half - (60 - o.vol)) < .01);
});
// ------------------------------------------------------------------ cursor and wheel
safe('cursor', () => {
  const ctx = load(), G = ctx.GAME, C = G.Cursor, W = G.Wheel, T = G.TUNING;
  let c = C.make(10, 120); for (let i = 0; i < 120; i++) C.update(c, { stick: [1, 0], assist: .6, bounds: [2000, 240, 0, 0] }, null, null, dt); check('cursor: full stick for 1 s moves 300 u or more', c.x - 10 >= 300, c.x);
  c = C.make(10, 120); for (let i = 0; i < 120; i++) C.update(c, { stick: [1, 0], fine: true, assist: .6, bounds: [2000, 240, 0, 0] }, null, null, dt); check('cursor: fine, 120 u or less', c.x - 10 <= 120, c.x);
  let S = table(G, [{ type: 'polyp', x: 200, y: 100 }]); const h = S.hands[0]; h.tool = 'cautery'; c = C.make(190, 96, 'cautery'); for (let i = 0; i < 240; i++) C.update(c, { stick: [0, 0], assist: .6 }, S, h, dt); check('cursor: the magnet settles on a target', Math.hypot(c.x - 200, c.y - 100) < 1, [c.x, c.y]);
  c = C.make(190, 96, 'cautery'); for (let i = 0; i < 240; i++) C.update(c, { stick: [0, 0], assist: 0 }, S, h, dt); check('cursor: no assist, no pull', Math.hypot(c.x - 190, c.y - 96) < .01);
  S = table(G, [{ type: 'guide', pts: [[120, 100], [300, 100]] }]); const g = S.objs[0], h2 = S.hands[0]; h2.tool = 'scalpel'; h2.stroke = g.id; c = C.make(120, 100, 'scalpel'); let far = 0; for (let i = 0; i < 90; i++) { C.update(c, { stick: [.7, .35], assist: 1 }, S, h2, dt); far = Math.max(far, Math.abs(c.y - 100)); g.prog = Math.max(g.prog, c.x - 120); } check('cursor: at full assist a rough push traces the line', far < 6 && c.x > 170, [far, c.x]);
  c = C.make(0, 0); C.update(c, { mouse: [123, 45] }, null, null, dt); check('cursor: the mouse is 1:1', c.x === 123 && c.y === 45);
  const dirs = [[0, -1], [.7, -.7], [1, 0], [.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7]]; dirs.forEach((d, i) => { const q = C.make(); q.tool = 'sonar'; if (G.TOOLS[i] === 'sonar') q.tool = 'forceps'; let t = 0; while (q.tool !== G.TOOLS[i] && t < .3) { W.update(q, { wheelStick: d, step: 0, digit: -1 }, dt); t += dt; } check('wheel: direction ' + i + ' picks ' + G.TOOLS[i] + ' within 100 ms', q.tool === G.TOOLS[i] && t <= .1, t); });
  for (let i = 0; i < 8; i++) { const q = C.make(); W.update(q, { digit: i, step: 0 }, dt); check('wheel: key ' + (i + 1), q.tool === G.TOOLS[i]); }
  let q = C.make(); W.update(q, { digit: -1, step: 1 }, dt); check('wheel: step forward', q.tool === 'scalpel'); W.update(q, { digit: -1, step: -1 }, dt); check('wheel: step back', q.tool === 'forceps');
  q = C.make(); W.update(q, { digit: -1, step: 0, mouseHold: true, mousePos: [100, 100] }, dt); W.update(q, { digit: -1, step: 0, mouseHold: true, mousePos: [140, 100] }, dt); W.update(q, { digit: -1, step: 0, mouseHold: false, mousePos: [140, 100] }, dt); check('wheel: mouse hold and flick', q.tool === 'suture', q.tool);
});
// ------------------------------------------------------------------ vitals, clock, Code Blue, checkpoints, grades, ranks
safe('vitals', () => {
  const ctx = load(), G = ctx.GAME, T = G.TUNING, Op = G.Op, Score = G.Score;
  let S = table(G, [{ type: 'bleeder', x: 200, y: 100, feed: 0 }, { type: 'wound', x: 120, y: 100, n: 2 }], { clear: { t: 99 } }), v0 = S.vitals; S.drain = .3; drive(G, S, hold(120 * 10, noop())); check('vitals: drains add up as table 7 says', Math.abs((v0 - S.vitals) - (.3 + .5 + .4) * 10) < .4, v0 - S.vitals); check('clock counts world time', Math.abs(S.clock - 290) < .05, S.clock);
  S = table(G, [{ type: 'polyp', x: 200, y: 100 }], { vitals: 1 }); S.drain = 50; let ev = drive(G, S, hold(30, noop())); check('code blue: first time at 0', S.status === 'code' && has(ev, 'codeBlue'));
  ev = []; const shockAt = t => { while (S.code.t < t) { G.Op.step(S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, shock: false }], dt); ev.push(...S.ev); } G.Op.step(S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, shock: true }], dt); ev.push(...S.ev); G.Op.step(S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, shock: false }], dt); ev.push(...S.ev); };
  shockAt(T.codeEvery); check('code blue: on the peak is a hit', S.code.hits === 1); shockAt(T.codeEvery * 2 + .1); check('code blue: two hits revive', S.status === 'play' && Math.abs(S.vitals - T.codeRevive) < 1 && has(ev, 'revive'), [S.status, S.vitals, S.code.hits]);
  S = table(G, [{ type: 'polyp', x: 200, y: 100 }], { vitals: 1 }); S.drain = 50; drive(G, S, hold(30, noop())); ev = drive(G, S, hold(120 * 5, noop())); check('code blue: missing every peak loses the patient', S.status === 'lost' && S.lost === 'vitals', [S.status]);
  S = table(G, [{ type: 'polyp', x: 200, y: 100 }], { vitals: 1, diff: 'attending' }); S.drain = 50; drive(G, S, hold(120, noop())); check('attending: no code blue', S.status === 'lost');
  S = table(G, [{ type: 'polyp', x: 200, y: 100 }], { clock: 1 }); drive(G, S, hold(200, noop())); check('clock at 0 is lost', S.status === 'lost' && S.lost === 'clock');
  // phase checkpoints restore exactly
  S = table(G, [{ type: 'pool', x: 200, y: 100, vol: 20 }], { clear: {} }); const cpJ = JSON.stringify(Object.assign({}, S, { ev: [] })); drive(G, S, [{ x: 200, y: 100, tool: 'suction', trig: 0 }, ...hold(40, { x: 200, y: 100, tool: 'suction', trig: 1 })]); Op.retryPhase(S); const cpA = JSON.parse(cpJ), now = JSON.parse(JSON.stringify(Object.assign({}, S, { ev: [] }))); now.capB = cpA.capB; now.keep = cpA.keep; check('checkpoint restores exactly, rank capped', JSON.stringify(cpA) === JSON.stringify(now) && S.capB === true);
  // grades and ranks
  check('Flow goes up by non-sloppy actions', (() => { const q = table(G, []); q.ev = []; Score.award(q, q.hands[0], 0, 0, 'Clean', 100); Score.award(q, q.hands[0], 0, 0, 'Textbook', 100); return q.flow === 2 && q.bestFlow === 2; })());
  check('a slip resets Flow', (() => { const q = table(G, []); q.ev = []; Score.award(q, q.hands[0], 0, 0, 'Clean', 100); Score.slip(q, q.hands[0], 0, 0, 1); return q.flow === 0 && q.stats.slips === 1; })());
  const rk = (f, o = {}) => { const q = table(G, []); q.ev = []; G.CASES.tst.par = 1000; q.clock = 0; q.vitals = 0; q.score = f * 1000; Object.assign(q, o); Score.finish(q); return q; }; check('ranks by score against par', rk(.95).rank === 'S' && rk(.8).rank === 'A' && rk(.6).rank === 'B' && rk(.4).rank === 'C' && rk(.2).rank === 'D'); check('a retried case caps at B', rk(.99, { capB: true }).rank === 'B');
  const d = rk(1, { diff: 'attending' }); check('Attending S with no slips earns the star', d.star === true);
  // difficulty
  const I = G.Op.create('glasshouse', { difficulty: 'intern', seed: 1 }), A = G.Op.create('glasshouse', { difficulty: 'attending', seed: 1 }); check('difficulty: clock x1.3 and x.8', Math.abs(I.clock - 180 * 1.3) < .01 && Math.abs(A.clock - 180 * .8) < .01);
});
// ------------------------------------------------------------------ gifts
safe('gifts', () => {
  const ctx = load(), G = ctx.GAME, T = G.TUNING, Op = G.Op;
  let S = table(G, [{ type: 'polyp', x: 300, y: 100 }], { clear: { t: 99 } }); S.steady = 100; drive(G, S, hold(10, noop())); drive(G, S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, gift: true }]); check('Long Breath switches on', S.breath); const t0 = S.t, c0 = S.clock; drive(G, S, hold(120, { x: 0, y: 0, tool: 'forceps', trig: 0, gift: true })); check('Long Breath: world at .25', Math.abs((S.t - t0) - T.breathFactor) < .02 && Math.abs((c0 - S.clock) - T.breathFactor) < .02, S.t - t0);
  const q = table(G, [{ type: 'bleeder', x: 200, y: 100, feed: 0 }]); q.steady = 100; const qo = q.objs[0]; drive(q.ev && G, q, [{ x: 200, y: 100, tool: 'cautery', trig: 0 }, ...hold(20, { x: 200, y: 100, tool: 'cautery', trig: 0 })]); drive(G, q, [{ x: 200, y: 100, tool: 'cautery', trig: 0, gift: true }]); drive(G, q, hold(Math.ceil(T.burnBleeder * 120) + 2, { x: 200, y: 100, tool: 'cautery', trig: 1 })); check('Long Breath: hands at full speed', qo.done);
  S = table(G, [], { clear: { t: 99 } }); S.steady = 10; drive(G, S, hold(5, noop())); drive(G, S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, gift: true }]); check('Long Breath needs its gauge', !S.breath);
  // Second Look: restored S deep-equals the old snapshot; ghosts are filled
  S = table(G, [{ type: 'pool', x: 200, y: 100, vol: 2000 }, { type: 'bead', x: 120, y: 100 }], { doctor: 'sokolova', look: true, clear: { t: 99 } }); const A = G.aux(S); S.steady = 100; drive(G, S, hold(120 * 8, { x: 200, y: 100, tool: 'suction', trig: 1 })); const target = S.rt + dt - 6; const snapE = A.hist.find(e => e.rt >= target), snap = JSON.parse(JSON.stringify(snapE.snap)), v1 = S.objs[0].vol; check('the buffer holds snapshots every .1 s', A.hist.length >= 55 && A.hist.length <= 62, A.hist.length);
  check('Second Look is ready', Op.canLook(S)); drive(G, S, [{ x: 200, y: 100, tool: 'suction', trig: 1, gift: true }]); check('Second Look: rewinds, shows the tape', S.status === 'rewind' && S.objs[0].vol > v1, [S.status, S.objs[0].vol, v1]);
  const now = JSON.parse(JSON.stringify(S)); for (const k of ['ev', 'steady', 'status', 'rewindT', 'stats', 'keep', 'seenTut', 'hands', 'breath', 'flags']) { delete now[k]; delete snap[k]; } check('Second Look: restored state deep-equals the old snapshot', JSON.stringify(now) === JSON.stringify(snap)); check('Second Look: the ghost list is filled', A.ghosts && A.ghosts.frames.length > 40 && A.ghosts.frames.some(f => f.strains.some(s => s.k === 'bead'))); check('Second Look: costs its gauge', S.steady <= 100 - T.lookCost + 1);
  S.hands[0].held = 0; drive(G, S, hold(200, noop())); check('Second Look: play resumes', S.status === 'play');
  // a rewind can never force a slip: anything held is let go
  S = table(G, [{ type: 'shard', x: 200, y: 100, ang: 0, depth: 40 }], { doctor: 'sokolova', look: true, clear: { t: 99 } }); S.steady = 100; drive(G, S, hold(90, { x: 100, y: 200, tool: 'forceps', trig: 0 })); drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1 }]); check('held before', !!S.hands[0].held); drive(G, S, [{ x: 200, y: 100, tool: 'forceps', trig: 1, gift: true }]); check('a rewind lets go', !S.hands[0].held && S.stats.slips === 0);
  // Consult
  S = table(G, [], { doctor: 'vale', duo: true, clear: { t: 99 } }); drive(G, S, [{ x: 0, y: 0, tool: 'forceps', trig: 0, consult: true }]); check('Consult hands over', S.doctor === 'sokolova' && S.consultT > 0);
  // determinism
  const run = () => { const q2 = G.Op.create('whistling', { seed: 77, difficulty: 'resident', dev: { noTut: true } }), bot = G.Bot.create(q2, 0, {}); for (let i = 0; i < 120 * 25; i++) G.Op.step(q2, [G.Bot.step(bot, q2, dt)], dt); return G.U.hash(Object.assign({}, q2, { ev: [] })); }; check('same seed and inputs give the same hash', run() === run());
});
// ------------------------------------------------------------------ strains: every stage reaches its end; failure branches
safe('strains', () => {
  const ctx = load(), G = ctx.GAME, Op = G.Op, T = G.TUNING, run = (id, o = {}) => { const S = Op.create(id, { difficulty: o.diff || 'resident', seed: o.seed ?? 100, players: o.players, dev: o.dev, phase: o.phase }), bots = S.hands.map((_, i) => G.Bot.create(S, i, o.skill || {})), seen = new Set(); let n = 0; while (S.status !== 'closed' && S.status !== 'lost' && n++ < 120 * (o.max || 900)) { G.Op.step(S, bots.map(b => G.Bot.step(b, S, dt)), dt); for (const e of S.ev) seen.add(e[0]); } return { S, seen, n }; };
  for (const id of G.CASE_ORDER) { const { S, seen, n } = run(id); check('perfect bot closes ' + id, S.status === 'closed', [S.status, S.ph, S.lost, n / 120 | 0]); const clockFrac = S.clock / S.clockMax; check('perfect bot, 30% clock left on ' + id, clockFrac >= .3, clockFrac); check('perfect bot, 40 vitals on ' + id, S.vitals >= 40, S.vitals | 0); check(id + ' has a par near the bot', S.rank === 'S' || S.rank === 'A', [S.score | 0, G.CASES[id].par, S.rank]); }
  const w = run('whistling'); check('Staccato: nests and beads die', w.seen.has('strainDead') && w.seen.has('beadLand'));
  const b = run('bedside'); check('Tremolo: all stages', ['shellCrack', 'tremTear', 'strainDead', 'sedate'].every(k => b.seen.has(k)), [...b.seen].join());
  const s = run('slur'); check('Legato: surfaces, clamps, barbs', ['legatoUp', 'barbOut', 'clamp', 'legatoDone'].every(k => s.seen.has(k)), [...s.seen].join());
  const f = run('fromthetop'); check('Da Capo: lobes die', f.seen.has('lobeDead') && f.seen.has('strainDead'));
  const e = run('eloquent'); check('Fermata: domes fall, the eye opens', ['domeRise', 'domeFall', 'eyeOpen', 'eyeHit'].every(k => e.seen.has(k)));
  const l = run('lastnote'); check('Cantor: all four movements', ['hush', 'recapWind', 'strainHit', 'noteDraw', 'noteOut', 'oneBeep'].every(k => l.seen.has(k)), [...l.seen].join());
  const c = run('crane9'); check('Case 3: the guaranteed Code Blue', c.seen.has('codeBlue') && c.seen.has('revive')); check('Case 3: Long Breath is asked for', c.S.stats.longBreaths >= 1);
  const k = run('forcenine'); check('Case 7: the lurch and Second Look', k.seen.has('lurch') && k.S.stats.rewinds >= 1 && k.seen.has('rewind'), [...k.seen].join());
  const dm = run('deadman'); check('Case 9: the wires go in the true order', dm.S.flags.wireI === 3 && dm.S.flags.boardRead);
  // failure branches
  let S = table(G, [{ type: 'legato', route: G.U.ring(213, 116, 90, 50, 24), segs: 8, hidden: false }], { clear: { t: 99 } }); let wrm = S.objs.find(o => o.type === 'legato'); G.OBJ.legato.slurCut(S, S.hands[0], wrm, { slurI: 0 }); wrm.s = wrm.slurs[0]; G.OBJ.legato.slurCut(S, S.hands[0], wrm, { slurI: 0 }); const ax = wrm.anchor[0], ay = wrm.anchor[1]; drive(G, S, hold(10, { x: ax, y: ay, tool: 'forceps', trig: 0 })); const evs = drive(G, S, [{ x: ax, y: ay, tool: 'forceps', trig: 1 }, ...path(ax, ay, ax + 30, ay, 6, 'forceps')]); check('Legato snaps if pulled too fast', has(evs, 'legatoSnap') && wrm.state === 'roam', evs.map(q => q[0]));
  S = table(G, [{ type: 'dacapo', x: 213, y: 100, speed: 1, limit: 2 }], { clear: { t: 99 } }); const lobe = S.objs.find(o => o.type === 'lobe' && o.kind === 'A'); lobe.open = true; G.OBJ.lobe.burned(S, S.hands[0], lobe, 'Clean'); check('Da Capo: first kill starts the count', S.objs.find(o => o.type === 'dacapo').countdown > 0); let vv = S.vitals; const ev2 = drive(G, S, hold(120 * 3, noop())); check('Da Capo: at zero the dead regrow, from the top', has(ev2, 'daCapo') && !lobe.dead && S.vitals < vv - 7, ev2.map(q => q[0]).slice(0, 8));
  S = Op.create('lastnote', { seed: 9, difficulty: 'resident', phase: 3, dev: { noTut: true } }); S.steady = 100; const rec = S.objs.find(o => o.type === 'cantorRecap'); rec.t = rec.every - 3.05; S.keep.recap = 0; let ev3 = []; for (let i = 0; i < 120 * 5 && !ev3.some(q => q[0] === 'recapFire'); i++) { G.Op.step(S, [{ x: 100, y: 200, tool: 'forceps', trig: 0 }], dt); ev3.push(...S.ev); } check('Cantor: it forcibly rewinds the field', has(ev3, 'recapFire') && S.status === 'rewind' && S.stats.rewinds >= 1, ev3.map(q => q[0]).slice(-6));
  // Grand Rounds, 1 to 4 bots
  for (const n of [1, 2, 3, 4]) { const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'P' + i })); const r = run('grandrounds', { players, skill: { react: .1, speed: 300 } }); check('Grand Rounds with ' + n + ': the patient closes', r.S.status === 'closed', [r.S.status, r.S.ph, r.S.lost]); check('Grand Rounds with ' + n + ': the retractor', r.seen.has('slash') || r.S.ph > 2); if (n > 1) { const st = G.grandStandings ? 1 : 0; const scorers = r.S.hands.filter(h => h.score > 0).length; check('Grand Rounds with ' + n + ': everyone scores', scorers >= 1, scorers); } }
});
// ------------------------------------------------------------------ the content validator
safe('content', () => {
  const ctx = load(), G = ctx.GAME;
  for (const id in G.CASES) { const def = G.CASES[id]; check('site ' + def.site, !!G.SITES[def.site]); for (const ph of def.phases) { for (const q of ph.spawn || []) check(id + ' spawns a known type: ' + q.type, !!G.OBJ[q.type]); for (const a of [...(ph.enter || []), ...(ph.script || []).flatMap(s => s.do)]) check(id + ' action ' + a[0], !!G.ACTIONS[a[0]]); }
    if (def.patient && def.patient.face) check(id + ' face', !!G.CAST[def.patient.face]);
    for (const key of ['enter', 'done', 'hint']) for (const b of (def.barks && def.barks[key]) || []) if (b && b[1]) { check(id + ' bark who: ' + b[0], !!G.CAST[b[0]]); check(id + ' bark is one line: ' + b[1], b[1].length <= 44, b[1].length); } for (const k in (def.barks && def.barks.extra) || {}) for (const b of def.barks.extra[k]) check(id + ' extra bark: ' + b[1], !!G.CAST[b[0]] && b[1].length <= 44, b[1].length); }
  for (const id in G.STORIES) for (const st of G.STORIES[id]) { if (Array.isArray(st)) { check(id + ' who ' + st[0], !!G.CAST[st[0]]); check(id + ' expr ' + st[2], !st[2] || G.EXPRS.includes(st[2])); check(id + ' line fits two rows: ' + st[1], st[1].length <= 100, st[1].length); } else { if (st.stage) check(id + ' stage ' + st.stage, !!G.STAGES[st.stage]); if (st.music && st.music !== 'none') check(id + ' music ' + st.music, !!G.SONGS[st.music]); if (st.cine) check(id + ' cine ' + st.cine, G.Cine.has(st.cine)); if (st.sfx) check(id + ' sfx ' + st.sfx, typeof G.Sfx[st.sfx] === 'function'); for (const a of st.enter || []) check(id + ' enters ' + a[0], !!G.CAST[a[0]]); } }
  const reach = new Set(); for (const e of G.CAMPAIGN) { if (e.story) { check('campaign story ' + e.story, !!G.STORY_NODES[e.story]); reach.add(e.story); } if (e.case) check('campaign case ' + e.case, !!G.CASES[e.case]); if (e.ward) check('campaign ward ' + e.ward, !!G.WARD_MAPS[e.ward]); } for (const id in G.STORY_NODES) check('story node reachable: ' + id, reach.has(id));
  for (const id of G.CASE_ORDER) check('every story case in the campaign: ' + id, G.CAMPAIGN.some(e => e.case === id));
  for (const k in G.BARKS) for (const l of G.BARKS[k]) check('shared bark fits: ' + l, l.length <= 44, l.length); const total = Object.values(G.BARKS).reduce((a, b) => a + b.length, 0); check('at least 40 shared Quill lines', total >= 40, total);
  const ban = /Derek Stiles|Angie Thompson|Naomi Kimishima|Nozomi Weaver|Robert Hoffman|Kenneth Blackwell|Hope Hospital|Angeles Bay|Caduceus|Delphi\b|\bGUILT\b|Healing Touch/; const scan = d => { for (const n of readdirSync(new URL(d, root))) { const p = d + n; if (statSync(new URL(p, root)).isDirectory()) scan(p + '/'); else { const s = R(p); check('originality: ' + p, !ban.test(s), (s.match(ban) || [])[0]); check('no leftovers: ' + p, !/\b(TODO|FIXME|placeholder|stub)\b/i.test(s), (s.match(/.{30}\b(TODO|FIXME|placeholder|stub)\b.{20}/i) || [])[0]); } } }; scan('src/');
});
// ------------------------------------------------------------------ the whole game, through the real scenes, with the bot's cheats off
safe('playthrough', () => {
  const ctx = load(), G = ctx.GAME, E = ctx.My3D2dge, game = G.game, I = game.input; game.fadeTime = 0; const seen = new Set(); let guard = 0, lastScene = '', stuck = 0, cases = [];
  game.advance(.5); check('boots to the title', game.sceneName === 'title', game.sceneName); check('music defaults to 10%', game.settings.music === .1 && game.audio.musicVolume === .1);
  const pressAndGo = () => { I.tap('confirm'); game.advance(.1); };
  while (guard++ < 200000) {
    const sc = game.scene, nm = game.sceneName; seen.add(nm); if (nm !== lastScene) { lastScene = nm; stuck = 0; } else stuck++;
    if (game.errors.length) break;
    if (nm === 'title') { if (G.Flow.prog.seenEnding) break; I.tap('start'); game.advance(.1); }
    else if (nm === 'menu') { sc.menu.i = 1; pressAndGo(); }
    else if (nm === 'difficulty') { sc.i = 1; pressAndGo(); }
    else if (nm === 'story') { I.hold('skip', true); I.tap('confirm'); game.advance(.25); I.hold('skip', false); if (sc.cine) { I.tap('confirm'); game.advance(.5); } }
    else if (nm === 'chart') { game.advance(.3); pressAndGo(); }
    else if (nm === 'lightbox') { const m = sc.markXY(game.W, game.H); sc.c.x = m[0]; sc.c.y = m[1]; game.advance(.1); sc.c.x = m[0]; sc.c.y = m[1]; I.tap('useTool'); game.advance(.1); for (let i = 0; i < 20 && game.sceneName === 'lightbox'; i++) game.advance(.2); }
    else if (nm === 'op') { const L = sc.locals[0]; if (!L.bot) { L.bot = G.Bot.create(sc.S, 0, {}); cases.push(sc.S.caseId); } game.advance(1); if (sc.S.status === 'lost') cases.push('LOST ' + sc.S.caseId); }
    else if (nm === 'results') { game.advance(.3); I.tap('confirm'); game.advance(.1); }
    else if (nm === 'lost') { sc.menu.i = 1; game.advance(.6); sc.menu.i = 1; pressAndGo(); }
    else if (nm === 'ward') { if (!sc.toured) { sc.toured = true; game.saves.canSave && check('ward: the pause menu may save', true); for (const p of sc.people) { sc.use(p); for (let i = 0; i < 6 && sc.talk.open; i++) { I.tap('confirm'); game.advance(.4); } } } sc.hero.x = sc.door.x - 8; sc.hero.y = sc.door.y; game.advance(.05); sc.use(sc.door); game.advance(.1); }
    else if (nm === 'credits') { I.hold('confirm', true); game.advance(1); I.hold('confirm', false); if (sc.state === 'last') { sc.t = 99; game.advance(.1); } }
    else if (nm === 'about') { I.tap('cancel'); game.advance(.1); }
    else { game.advance(.2); }
    if (stuck > 3000) { check('stuck in ' + nm, false, JSON.stringify(game.debug.snapshot())); break; }
  }
  check('no errors in the whole game', !game.errors.length, game.errors.map(e => String(e.message || e)).slice(0, 3).join(' | '));
  check('the playthrough reaches the ending', G.Flow.prog.seenEnding, [game.sceneName, G.Flow.prog.i, cases.join()]);
  check('it plays every case', G.CASE_ORDER.every(id => cases.includes(id)), cases.join()); check('it loses nothing', !cases.some(c => c.startsWith('LOST')), cases.join());
  for (const s of ['title', 'menu', 'difficulty', 'story', 'chart', 'lightbox', 'op', 'results', 'ward', 'credits', 'about']) check('the playthrough saw ' + s, seen.has(s), [...seen].join());
  const best = G.Flow.bestRanks(); check('ranks are saved per case', G.CASE_ORDER.every(id => best[id] && best[id].resident), Object.keys(best).join());
  check('the ending unlocks the Incoming folder', G.scenes.casefiles.entries().some(e => e.kind === 'incoming'));
  const saved = game.saves.list().filter(s => s && s.data !== undefined || s); check('the ward autosaved', !!game.saves.latest());
  // Skills Lab and the case files
  game.go('casefiles', {}); game.advance(.1); check('case files open', game.sceneName === 'casefiles'); const sc = game.scene; sc.i = sc.list.findIndex(e => e.kind === 'lab'); I.tap('confirm'); game.advance(.2); check('Skills Lab opens the op scene', game.sceneName === 'op' && game.scene.S.mode === 'lab'); game.advance(2); check('Skills Lab has things on the table', game.scene.S.objs.filter(o => !o.done).length >= 8 && game.scene.S.status === 'play');
  const lab = game.scene.S, v0 = lab.vitals; for (const q of lab.objs) if (q.type === 'polyp') q.done = true; game.advance(2); check('Skills Lab respawns', lab.objs.some(q => q.type === 'polyp' && !q.done)); check('Skills Lab locks vitals', lab.vitals === v0);
});
// ------------------------------------------------------------------ draw changes nothing and throws nothing
safe('draw', () => {
  const ctx = load({ GAME_DRAW: true }), G = ctx.GAME, game = G.game; game.fadeTime = 0; const run = (id, ph) => { game.go('op', { caseId: id, phase: ph, seed: 3, difficulty: 'resident', dev: { noTut: true, lock: true, freeze: true }, attract: true, botSkill: { iv: 0 } }); game.advance(6, { draw: true }); };
  game.advance(.3); run('glasshouse', 0); for (const [c, p] of [['lowbrass', 1], ['crane9', 2], ['whistling', 2], ['slur', 2], ['bedside', 1], ['forcenine', 1], ['fromthetop', 1], ['deadman', 3], ['eloquent', 1], ['lastnote', 1], ['lastnote', 2], ['lastnote', 3], ['lastnote', 5]]) run(c, p);
  check('no draw errors in the op scene', !game.errors.length, game.errors.map(e => String(e.stack || e)).slice(0, 2).join(' | '));
  for (const [s, d] of [['title', {}], ['menu', {}], ['difficulty', {}], ['story', { node: 'c1_open', onDone() {} }], ['chart', { caseId: 'lowbrass' }], ['lightbox', { caseId: 'lowbrass' }], ['casefiles', {}], ['about', {}], ['lobby', {}], ['credits', {}], ['ward', { ward: 'ward3', chapter: 2 }], ['ward', { ward: 'ship', chapter: 3 }], ['stinger', { op: { caseId: 'glasshouse', dev: { noTut: true } }, who: 'vale' }]]) { game.go(s, d); game.advance(1.2, { draw: true }); check('no draw errors in ' + s, !game.errors.length, game.errors.map(e => String(e.message || e)).slice(0, 2).join(' | ')); game.errors.length = 0; }
  // the same run with and without drawing gives the same state
  const hash = (draw) => { const c2 = load(draw ? { GAME_DRAW: true } : {}), G2 = c2.GAME, g = G2.game; g.fadeTime = 0; g.advance(.2); g.go('op', { caseId: 'glasshouse', seed: 11, difficulty: 'resident', attract: true, dev: { noTut: true }, botSkill: { iv: 0 } }); g.advance(.05); g.advance(6, { draw }); return G2.U.hash(Object.assign({}, g.scene.S, { ev: [] })); }; check('draw changes nothing', hash(false) === hash(true));
  for (const id of Object.keys(G.STAGES)) { const st = G.STAGES[id]; check('stage has a bake: ' + id, !!st.bake); } check('at least nine stages', Object.keys(G.STAGES).length >= 9);
  for (const id in G.CAST) { for (const e of G.EXPRS) G.bust(id, { expr: e }); } check('every bust, every expression', !game.errors.length);
});
// ------------------------------------------------------------------ attract
safe('attract', () => {
  const ctx = load(), G = ctx.GAME, game = G.game, I = game.input; game.fadeTime = 0; game.advance(.2);
  game.advance(9.5); check('no reel before 10 s', !G.Attract.active); game.advance(.8); check('the title idles into the reel', G.Attract.active, game.sceneName); const cycle = []; game.advance(.1); cycle.push(game.sceneName);
  const seen = new Set(); for (let i = 0; i < 400 && G.Attract.loops < 2; i++) { game.advance(1); seen.add(game.sceneName + (game.scene.S ? ':' + game.scene.S.caseId : '')); } check('it loops at least twice', G.Attract.loops >= 2, G.Attract.loops); check('no errors in the reel', !game.errors.length, game.errors.map(e => String(e.message || e)).slice(0, 3).join(' | '));
  for (const s of ['story', 'op:glasshouse', 'op:crane9', 'op:bedside', 'op:forcenine', 'op:grandrounds', 'op:lastnote', 'results:glasshouse', 'title']) check('the reel shows ' + s, seen.has(s), [...seen].join());
  const exitBy = (fn, label) => { game.go('title', {}, { fade: 0 }); game.advance(.2); G.Attract.idle = 0; game.advance(10.3); check(label + ': reel running', G.Attract.active); game.advance(1); fn(); game.advance(.15); check(label + ' exits to the title', !G.Attract.active && game.sceneName === 'title', [G.Attract.active, game.sceneName]); check(label + ': the press does nothing else', game.sceneName === 'title'); };
  exitBy(() => I.tap('confirm'), 'a key'); exitBy(() => { I.press && I.press('Mouse0'); I.feed('down', 50, 50); I.feed('up', 50, 50); }, 'a click');
  exitBy(() => { I.hold('up', true); game.advance(.02); I.hold('up', false); }, 'a held direction');
  game.go('about', {}, { fade: 0 }); game.advance(.2); G.Attract.idle = 0; game.advance(12); check('not on reading screens', !G.Attract.active && game.sceneName === 'about');
  game.go('menu', {}, { fade: 0 }); game.advance(.2); G.Attract.idle = 0; game.advance(10.3); check('the menu idles too', G.Attract.active); I.tap('confirm'); game.advance(.2);
  check('the reel saves nothing', !game.saves.latest());
});
// ------------------------------------------------------------------ dev mode
safe('dev', () => {
  const ctx = load(), G = ctx.GAME, game = G.game, I = game.input, T = G.TUNING, D = G.TUNING_DEFAULTS, Dev = G.Dev, E = ctx.My3D2dge; game.fadeTime = 0; game.advance(.2);
  game.go('op', { caseId: 'glasshouse', seed: 5, difficulty: 'resident', dev: null }); game.advance(.2); Dev.open(); check('dev opens', Dev.panelOpen); let S = game.scene.S;
  check('the pause menu lists Dev Mode', (game.o.menu.items() || []).some(i => i[0] === 'Dev Mode')); check('the op scene lists Restart Phase', (game.o.menu.items() || []).some(i => i[0] === 'Restart Phase'));
  for (const page of G.TUNING_PAGES) for (const r of page.rows) { const before = T[r[0]], to = before === r[3] ? r[2] : r[3]; Dev.setT(r[0], to); check('slider moves ' + r[0], T[r[0]] === to && before !== to); Dev.setT(r[0], D[r[0]]); }
  // behavior changes live: suction rate
  const tab = (tabI, page = 0) => { Dev.tab = tabI; Dev.page = page; Dev.row = 0; }; tab(0, 4); const rows = Dev.rows(); check('at most 8 rows a page', rows.length <= 8, rows.length);
  G.defCase; let q = (() => { const c = table(G, [{ type: 'pool', x: 200, y: 100, vol: 200 }], { clear: { t: 99 } }); drive(G, c, hold(30, { x: 200, y: 100, tool: 'suction', trig: 0 })); return c; })(); Dev.setT('suctionRate', 120); drive(G, q, hold(60, { x: 200, y: 100, tool: 'suction', trig: 1 })); check('a slider changes behavior live', q.objs[0].vol < 200 - 55, q.objs[0].vol); Dev.resetAll(); check('Reset restores TUNING', Object.keys(D).every(k => T[k] === D[k]));
  Dev.setT('drainX', 2); tab(0, 0); const p0 = G.TUNING_PAGES[0]; Dev.resetPage(p0); check('Reset per page', T.drainX === D.drainX);
  // cheats
  Dev.flags = { lock: true }; game.advance(.05); S = game.scene.S; check('cheat: lock vitals reaches the sim', S.dev && S.dev.lock); const v0 = S.vitals; G.Score.hurt(S, 10); check('cheat: lock works', S.vitals === v0);
  Dev.flags = { freeze: true }; game.advance(.05); const c0 = S.clock; S.tut = null; game.advance(1); check('cheat: freeze clock', S.clock === c0, [c0, S.clock]);
  Dev.flags = { steady: true }; game.advance(.1); check('cheat: infinite Steady', S.steady === 100); Dev.flags = { reveal: true }; game.advance(.05); check('cheat: reveal', S.dev.reveal); Dev.flags = { radii: true }; game.advance(.05); check('cheat: radii', S.dev.radii); Dev.flags = { oneHit: true }; game.advance(.05); check('cheat: one-hit', S.dev.oneHit); Dev.flags = {};
  Dev.activate(game, { kind: 'toggle', key: 'auto' }); check('cheat: the autosurgeon takes over', !!game.scene.locals[0].bot); Dev.activate(game, { kind: 'toggle', key: 'auto' }); check('cheat: and lets go', !game.scene.locals[0].bot);
  Dev.activate(game, { kind: 'toggle', key: 'slow' }); check('cheat: slow motion', game.timeScale === .5); for (let i = 0; i < 3; i++) Dev.activate(game, { kind: 'toggle', key: 'slow' }); check('cheat: back to normal', game.timeScale === 1);
  // jump
  tab(2); let J = Dev.rows(), act = l => J.find(r => r.label === l || r.label.startsWith(l)); check('jump: force win', !!act('Force win')); act('Force win').fn(); game.advance(.1); check('jump: force win closes', S.status === 'closing' || S.status === 'closed'); game.go('op', { caseId: 'crane9', phase: 1, seed: 5, dev: null }); game.advance(.2); check('jump: any case, any phase', game.scene.S.caseId === 'crane9' && game.scene.S.ph === 1); J = Dev.rows(); act('Code Blue').fn(); game.advance(.1); check('jump: Code Blue', game.scene.S.status === 'code'); game.go('op', { caseId: 'crane9', seed: 5, dev: null }); game.advance(.2); J = Dev.rows(); act('Force lost').fn(); game.advance(.1); check('jump: force lost', game.scene.S.status === 'lost');
  game.go('op', { caseId: 'crane9', seed: 5, dev: null }); game.advance(.2); J = Dev.rows(); const n0 = game.scene.S.objs.length; act('Spawn').fn(); check('jump: spawn at the cursor', game.scene.S.objs.length === n0 + 1);
  tab(3); check('info shows a hash', Dev.rows().some(r => r.label.startsWith('Hash'))); check('a DEV-marked case saves no rank', Dev.changed()); Dev.draw && 0;
  Dev.close(); check('dev closes', !Dev.panelOpen);
});
// ------------------------------------------------------------------ couch co-op and the ward's hands
safe('couch', () => {
  const ctx = load(), G = ctx.GAME, game = G.game, I = game.input; game.fadeTime = 0; game.advance(.2); game.go('lobby', {}); game.advance(.1); const sc = game.scene; check('the lobby opens with player 1 seated', game.sceneName === 'lobby' && sc.seats[0] && !sc.seats[1]);
  sc.pick(1); check('add an AI colleague', sc.seats[1] && sc.seats[1].kind === 'bot'); sc.pick(1); sc.pick(1); sc.pick(2); check('remove one', !sc.seats[3] && sc.seats[2].kind === 'bot');
  const q = game.addPlayer({ keys: 'right' }); check('a second keyboard half can join', !!q && game.players.length === 2); sc.seats[3] = { kind: 'p', input: q, name: 'P4' };
  sc.pick(0); game.advance(.2); check('Grand Rounds starts with those seats', game.sceneName === 'op' && game.scene.S.hands.length === 4 && game.scene.S.mode === 'rounds', game.sceneName); const op = game.scene; check('each seat has a color and a cursor', new Set(op.S.hands.map(h => h.color)).size === 4 && op.locals.length === 4);
  q.hold('curR', true); const x0 = op.locals[3].c.x; game.advance(.5); q.hold('curR', false); check('player 4 moves their own cursor', op.locals[3].c.x > x0 + 40, op.locals[3].c.x - x0);
  q.tap('toolNext'); game.advance(.2); check('player 4 steps their own tool', op.S.hands[3].tool === 'scalpel', op.S.hands[3].tool); op.locals[0].bot = G.Bot.create(op.S, 0, {}); let n = 0; while (game.sceneName === 'op' && n++ < 700) game.advance(1); check('the couch round ends on the results', game.sceneName === 'roundsend', game.sceneName); const r = game.scene; check('standings and awards are ready', r.st.length >= 1 && Array.isArray(r.aw)); I.tap && game.advance(1.2); I.tap('confirm'); game.advance(.2); check('back to the lobby', game.sceneName === 'lobby', game.sceneName); check('no errors on the couch', !game.errors.length, game.errors.map(e => String(e.stack || e)).slice(0, 2).join(' | '));
  G.Flow.prog.patients = ['glasshouse']; G.Flow.prog.chapter = 2; game.go('ward', { ward: 'ward3', chapter: 2 }); game.advance(.2); const w = game.scene; check('saved patients are in the beds', w.people.some(p => p.id === 'agnes' && p.bed)); check('the ward can save', game.saves.canSave); const hx = w.hero.x; I.hold('right', true); game.advance(.5); I.hold('right', false); check('walking', w.hero.x > hx + 10, w.hero.x - hx); const ag = w.people.find(p => p.id === 'agnes'); w.hero.x = ag.x; w.hero.y = ag.y + 20; game.advance(.05); I.tap('interact'); game.advance(.1); check('talking', w.talk.open); for (let i = 0; i < 5 && w.talk.open; i++) { I.tap('confirm'); game.advance(.3); } for (const p of w.people) { w.use(p); for (let i = 0; i < 5 && w.talk.open; i++) { I.tap('confirm'); game.advance(.3); } } check('talk to everyone: morale', G.Flow.prog.morale === true);
  const k = G.Op.create('glasshouse', { seed: 1, steady: 10 }); check('morale starts the next case with +10 Steady', k.steady === 10);
});
// ------------------------------------------------------------------ failing, retrying, and the save
safe('retry', () => {
  const ctx = load(), G = ctx.GAME, game = G.game, I = game.input, E = ctx.My3D2dge; game.fadeTime = 0; game.advance(.2);
  G.Flow.newGame('resident'); game.advance(.2); check('New Game goes to the story', game.sceneName === 'story'); G.Flow.prog.i = G.CAMPAIGN.findIndex(e => e.case === 'lowbrass') - 3; G.Flow.advance(); game.advance(.1); check('a story beat', game.sceneName === 'story'); G.Flow.advance(); game.advance(.1); check('the ward first', game.sceneName === 'ward', game.sceneName); check('arrival autosaves', !!game.saves.latest()); G.Flow.advance(); game.advance(.1); check('then the chart', game.sceneName === 'chart'); game.go('op', { caseId: 'lowbrass', seed: 5, difficulty: 'resident', dev: null }); game.advance(.2); let S = game.scene.S;
  G.Op.lose(S, 'vitals'); game.advance(2); check('losing goes to the Lost screen', game.sceneName === 'lost', game.sceneName); let L = game.scene; check('Retry and Restart are offered', L.act.includes('retry') && L.act.includes('restart') && !L.act.includes('ease')); L.pick('retry'); game.advance(.2); check('Retry returns to the same phase, capped', game.sceneName === 'op' && game.scene.S === S && S.capB && S.status === 'play', [game.sceneName, S.status]);
  G.Op.lose(S, 'clock'); game.advance(2); L = game.scene; check('after two failures, Intern is offered', game.sceneName === 'lost' && L.act.includes('ease'), L.act); L.pick('ease'); game.advance(.1); game.advance(.2); check('Intern for this case', game.scene.S && game.scene.S.diff === 'intern', [game.sceneName]); S = game.scene.S; S.objs.length = 0;
  game.go('title', {}, { fade: 0 }); game.advance(.1); game.go('menu', {}, { fade: 0 }); game.advance(.1); check('Continue is offered', !game.scene.menu.items[0].disabled); const pi = G.Flow.prog.i; G.Flow.prog = { i: 0 }; game.scene.menu.i = 0; I.tap('confirm'); game.advance(.2); check('Continue returns to the save', game.sceneName === 'ward' && G.Flow.prog.chapter === 1 && G.Flow.prog.i > 0, [game.sceneName, G.Flow.prog.i]);
  game.go('op', { caseId: 'glasshouse', seed: 5, difficulty: 'resident', dev: null }); game.advance(.2); S = game.scene.S; S.tut = null; const n0 = S.objs.filter(o => o.type === 'shard').length; S.objs.filter(o => o.type === 'shard')[0].done = true; game.advance(.1); G.Flow.restartPhase(game.scene); check('Restart Phase restores the phase', S.objs.filter(o => o.type === 'shard' && !o.done).length === n0 && S.capB); check('no errors', !game.errors.length, game.errors.map(e => String(e.stack || e)).slice(0, 2).join(' | '));
});
// ------------------------------------------------------------------ about data and the exit interview
safe('about', () => {
  const A = JSON.parse(R('src/about-data.json')), SI = A.sourceInformation || {}; for (const k of ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) check('about: ' + k, typeof SI[k] === 'string' && SI[k].length > 0); check('about: usage', SI.usage === 'added on import');
  check('about: 4 testing answers', (A.testingFeedback || []).length === 4); check('about: 6 engine answers', (A.engineFeedback || []).length === 6); check('about: 4 prompt answers', (A.promptFeedback || []).length === 4); const h = A.aiHub || {}; for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls']) check('aiHub: ' + k, typeof h[k] === 'string' && h[k].length > 0); check('aiHub: tags', Array.isArray(h.tags) && h.tags.length >= 3 && h.tags.length <= 6);
  const exit = new URL('../exit-interview.json', root); check('the exit interview exists and parses', existsSync(exit) && !!JSON.parse(readFileSync(exit, 'utf8')).sourceInformation);
});
// ------------------------------------------------------------------ browsers
if (!fast && !only) {
  const py = (script, ...args) => spawnSync('python3', [new URL(script, root).pathname, ...args], { encoding: 'utf8', timeout: 900000 });
  for (const s of ['tests/browser.py', 'tests/hub.py']) { const r = py(s); const lines = (r.stdout || '').trim().split('\n'), last = lines[lines.length - 1] || ''; for (const l of lines) if (l.startsWith('FAIL')) fails.push(l.slice(5)); const m = last.match(/^(\d+) /); checks += m ? +m[1] : 0; if (!m) fails.push(s + ' did not finish: ' + (r.stderr || '').slice(-300)); }
}
for (const f of fails) console.log('FAIL ' + f);
console.log(`${checks} checks, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
