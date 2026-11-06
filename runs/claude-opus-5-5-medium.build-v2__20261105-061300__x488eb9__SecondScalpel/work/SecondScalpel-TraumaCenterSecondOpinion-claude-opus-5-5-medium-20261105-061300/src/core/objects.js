// The registry of things on the table: sim behavior, what tool each wants, where to aim it. Drawing lives in src/art/objects.js.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, rnd, polyLen, polyAt } = G;
const REG = G.OBJ = {};
G.defObject = (type, d) => { REG[type] = Object.assign({ type, drain: 0, req: true, ghost: false }, d); return REG[type]; };
const O = o => REG[o.type];
G.O = O;
G.getObj = (S, id) => { for (const o of S.objs) if (o.id === id && !o.dead) return o; return null; };
G.kill = (S, o) => { o.dead = true; const d = O(o); if (d.gone) d.gone(o, S); };
G.spawn = (S, spec) => {
  const o = G.clone(spec); o.type = o.t || o.type; delete o.t; o.id = S.nextId++; o.x = o.x || 0; o.y = o.y || 0; o.age = 0;
  const d = REG[o.type]; if (!d) throw new Error('no object type ' + o.type);
  if (o.req === undefined) o.req = d.req;
  if (o.hidden) o.mark = 0;
  S.objs.push(o); if (d.init) d.init(o, S);
  ev(S, 'spawn', o.type, Math.round(o.x), Math.round(o.y), o.id);
  return o;
};
// May a tool touch it? Hidden until marked, under a pool, or behind a closed window it may not
G.visible = (S, o) => {
  if (o.dead) return false;
  if (o.hidden && !(o.mark > 0) && !G.CHEATS.reveal) return false;
  if (o.type !== 'pool' && !o.ontop) for (const q of S.objs) if (q.type === 'pool' && !q.dead && q.vol > 8 && Math.hypot(q.x - o.x, q.y - o.y) < G.poolR(q) * .85) return false;
  return true;
};
G.canTouch = (S, o) => G.visible(S, o) && (!o.needWindow || S.windowOpen) && !G.inDome(S, o.x, o.y);
G.poolR = o => 1.5 * Math.sqrt(Math.max(0, o.vol));
G.inDome = (S, x, y) => { for (const o of S.objs) if (o.type === 'dome' && !o.dead && Math.hypot(o.x - x, o.y - y) < o.r) return true; return false; };
G.beatHot = S => S.sinceBeat < .16 || S.beatLen - S.sinceBeat < .08;   // the heart is moving: the stroke may not
// A pool that grows near a bleeding thing
G.feedPool = (S, x, y, n) => { let best = null, bd = 34; for (const o of S.objs) if (o.type === 'pool' && !o.dead) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } if (!best) { if (n <= 0) return; best = G.spawn(S, { t: 'pool', x: x + 4, y: y + 5, vol: 0, req: false }); } best.vol = Math.min(420, best.vol + n); };
G.mkPull = (o, c) => { const depth = c.depth || 18; o.bx = o.x; o.by = o.y; o.pull = { a: c.a === undefined ? -1.57 : c.a, depth, prog: 0, maxV: c.maxV || 120, off: c.off || 8, tears: 0, t: 0, par: c.par || depth / 50 + 1.2, free: false }; };
const addLac = (S, x, y) => { if (S.noLac) return; let n = 0; for (const q of S.objs) if (q.type === 'laceration' && !q.dead) n++; if (n < 10) G.spawn(S, { t: 'laceration', x: clamp(x, 50, 376), y: clamp(y, 32, 200), req: S.lacReq !== false && !S.lacOpt, r: 8 }); };
G.addLac = addLac;
const covInit = o => { const R = o.r || 10, N = Math.ceil(R * 2 / 4); o.covW = N; o.cov = []; o.covTotal = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const dx = (i + .5) * 4 - R, dy = (j + .5) * 4 - R, inside = dx * dx + dy * dy <= R * R; o.cov.push(inside ? 0 : 2); if (inside) o.covTotal++; } o.covN = 0; o.st0 = 0; };
G.covInit = covInit;

G.defObject('shard', { drain: .1, ghost: true,
  init(o) { G.mkPull(o, { a: o.a, depth: o.depth || 16, maxV: o.maxV }); }, want: () => 'forceps', verb: 'Pull' });
G.defObject('laceration', { drain: .2,
  init(o) { o.r = o.r || 9; o.ang = o.ang === undefined ? o.x * .07 : o.ang; covInit(o); }, want: () => 'salve', verb: 'Paint',
  step(o, S, w) { if (o.age > 7 && !S.tut) G.feedPool(S, o.x, o.y, 1.5 * w * G.T.bleedX); } });
G.defObject('patch', { drain: .1, init(o) { o.r = o.r || 13; covInit(o); }, want: () => 'salve', verb: 'Paint' });
const buildStitches = o => { const n = o.n || 4, L = o.len || 44, w = o.w || 11, a = o.a || 0, c = Math.cos(a), s = Math.sin(a); o.st = []; for (let i = 0; i < n; i++) { const t = (i + .5) / n - .5, mx = o.x + c * L * t, my = o.y + s * L * t; o.st.push([mx - s * w, my + c * w, mx + s * w, my - c * w]); } o.si = 0; o.times = []; };
G.stPts = (o, S, i) => { const q = o.st[i]; if (!o.shift) return q; const k = Math.sin(S.t * 1.1 + i) * o.shift, j = Math.cos(S.t * .8 + i) * o.shift * .6; return [q[0] + k, q[1] + j, q[2] + k, q[3] + j]; };
G.defObject('wound', { drain: .4,
  init: buildStitches, want: () => 'suture', verb: 'Stitch',
  drainOf: o => .4 * (1 - o.si / o.st.length),
  aim(o, S) { const q = G.stPts(o, S, o.si); return [q[0], q[1]]; },
  step(o, S, w) { if (o.bleeds !== false && !S.tut) G.feedPool(S, o.x + 4, o.y + 8, 1.2 * (1 - o.si / o.st.length) * w * G.T.bleedX); } });
G.defObject('arteryTear', { drain: 1, ghost: true,
  init(o) { o.n = 3; o.len = o.len || 22; o.w = 9; buildStitches(o); }, want: () => 'suture', verb: 'Stitch',
  drainOf: o => 1 - o.si / o.st.length,
  aim(o, S) { const q = G.stPts(o, S, o.si); return [q[0], q[1]]; },
  step(o, S, w) { if (!S.tut) G.feedPool(S, o.x + 6, o.y + 10, 14 * (1 - o.si / o.st.length) * w * G.T.bleedX); } });
G.defObject('bleeder', { drain: .5, ghost: true,
  init(o) { o.burn = o.burn0 = o.burn || .35; }, want: () => 'cautery', verb: 'Burn',
  step(o, S, w) { if (!S.tut && !(o.hidden && !(o.mark > 0)) && !G.inDome(S, o.x, o.y)) G.feedPool(S, o.x + 5, o.y + 6, 6 * w * G.T.bleedX); } });
G.defObject('pool', { req: false, init(o) { o.vol = o.vol === undefined ? 90 : o.vol; }, want: (o) => o.vol > 2 ? 'suction' : null, verb: 'Drain',
  step(o, S, w) { if (S.tilt) { const k = o.vol > 8 ? 1 : 0; o.x = clamp(o.x + S.tilt[0] * 25 * w * k, 60, 366); o.y = clamp(o.y + S.tilt[1] * 25 * w * k, 40, 192); } if (o.vol <= 2 && o.age > 3) G.kill(S, o); } });
G.defObject('polyp', { drain: .1, init(o) { o.burn = o.burn0 = .5; }, want: () => 'cautery', verb: 'Burn' });
G.defObject('guide', { req: true,   // a marker line: pts, ring, between (only between beats), slur (a Legato's mark), link (an object told when done)
  init(o) { o.len = polyLen(o.pts); o.prog = 0; o.sum = 0; o.n = 0; o.x = o.pts[0][0]; o.y = o.pts[0][1]; if (o.ontop === undefined) o.ontop = true; },
  want: () => 'scalpel', verb: 'Cut', aim: o => polyAt(o.pts, o.prog),
  drainOf: o => o.drainV || 0 });
G.defObject('mass', { drain: .2,
  init(o, S) { o.r = o.r || 24; G.mkPull(o, { a: o.a === undefined ? -1.57 : o.a, depth: o.depth || 18, maxV: 100, par: 2.4 }); o.cut = false; const g = G.spawn(S, { t: 'guide', pts: G.circlePts(o.x, o.y, o.r + 6, (o.r + 6) * .85), ring: true, link: o.id }); o.gid = g.id; },
  want: o => o.cut ? 'forceps' : null, canGrip: o => o.cut, verb: 'Lift', linked(o) { o.cut = true; },
  caught(o, S, p) { if (o.leaves) { for (const sp of o.leaves) G.spawn(S, Object.assign({ x: o.bx, y: o.by }, sp)); } } });
G.defObject('hook', { drain: .3, ghost: true,   // relief cuts at each barb first; pulled with a barb set, it tears
  init(o, S) { G.mkPull(o, { a: o.a, depth: o.depth || 34, maxV: 90, par: 3.2 }); o.barbs = 0; const c = Math.cos(o.a), s = Math.sin(o.a); for (const k of [o.b1 === undefined ? -10 : o.b1, o.b2 === undefined ? 10 : o.b2]) { const bx = o.x + c * k - s * 12, by = o.y + s * k + c * 12; G.spawn(S, { t: 'guide', pts: [[bx - s * 10, by + c * 10], [bx + s * 10, by - c * 10]], link: o.id }); o.barbs++; } },
  linked(o) { o.barbs--; }, want: o => o.barbs > 0 ? null : 'forceps', verb: 'Pull',
  gripGate(o, S, p) { if (o.barbs > 0) { o.pull.tears++; G.slip(S, p, o.x, o.y, 4, 'tear'); ev(S, 'tear', o.x, o.y); return false; } return true; } });
G.defObject('clot', { drain: .3,
  init(o) { G.mkPull(o, { a: o.a === undefined ? -1.57 : o.a, depth: 12, maxV: 110 }); o.dose = true; },
  want: o => o.dose ? 'syringe' : 'forceps', canGrip: o => !o.dose, verb: 'Dose', dosed(o, S, p, g) { o.dose = false; G.grade(S, p, o.x, o.y, g, 'dose'); } });
G.defObject('nerve', { req: false, want: () => null,   // gold no-touch line
  init(o) { o.x = o.pts[0][0]; o.y = o.pts[0][1]; o.ontop = true; } });
G.defObject('retractorHandle', { req: false, ontop: true,
  init(o) { o.held = false; o.ontop = true; }, want: (o, S) => S.players.filter(q => !q.gone).length > 1 ? 'forceps' : null, verb: 'Hold',
  grip(o, S, p) { p.hold = { k: 'retract', id: o.id }; o.held = true; ev(S, 'grip', o.x, o.y); return true; }, held() {}, release(o, S, p) { p.tension = 0; },
  step(o, S, w, h) { let held = false; for (const p of S.players) if (p.hold && p.hold.id === o.id) held = true; o.held = held; const solo = S.players.filter(q => !q.gone).length < 2; o.q = (o.q || 0) + h; S.windowOpen = held || (solo && (o.q % 6) < 3) || (!solo && (o.q % 12) < 2); } });
G.defObject('windowTarget', { drain: .3, init(o) { o.needWindow = true; G.mkPull(o, { a: o.a === undefined ? -1.57 : o.a, depth: 12, maxV: 120 }); o.slashed = false; o.r = 10; },
  want: o => o.slashed ? 'forceps' : 'scalpel', canGrip: o => o.slashed, slashable: o => !o.slashed, verb: 'Cut',
  slash(o, S, p) { o.slashed = true; G.grade(S, p, o.x, o.y, 'clean', 'slash'); } });
// A hopping Staccato, its nests and the bites they leave are in strains/staccato.js, and so on for each strain.
})();
