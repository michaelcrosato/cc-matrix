// The operation sim: plain data in, plain data out. No draw, audio or DOM. Never touches Math.random or the clock.
(() => {
const G = (window.GAME ||= {}), T = G.T;
const CAV = G.CAV = { cx: 213, cy: 116, rx: 171, ry: 91 };
const TOOLS = G.TOOLS = ['forceps', 'scalpel', 'suture', 'salve', 'syringe', 'cautery', 'suction', 'sonar'];
G.TOOL_NAMES = { forceps: 'Forceps', scalpel: 'Scalpel', suture: 'Suture', salve: 'Salve', syringe: 'Syringe', cautery: 'Cautery', suction: 'Suction', sonar: 'Sonar' };
const DIFF = G.DIFF = { Intern: { drain: .7, clock: 1.3, assist: .2, iv: 24, hints: 0 }, Resident: { drain: 1, clock: 1, assist: 0, iv: 18, hints: 6 }, Attending: { drain: 1.3, clock: .8, assist: 0, iv: 12, hints: 10, noBlue: true } };
const OBJ = G.OBJ = {}; // type -> { drain, init(S,o,spec), tick(S,o,dt), req, hid, grip, burn, sed, label }
G.defObject = (type, spec) => { OBJ[type] = spec; };
const Op = G.Op = {};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, hyp = Math.hypot;
// ---- rng stored in S
const rnd = S => { let t = (S.rng = (S.rng + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Op.rnd = rnd;
const inCav = (x, y, m = 0) => ((x - CAV.cx) / (CAV.rx - m)) ** 2 + ((y - CAV.cy) / (CAV.ry - m)) ** 2 <= 1;
Op.inCav = inCav;
// ---- helpers
const ev = (S, ...a) => { if (S.ev.length < 400) S.ev.push(a); };
Op.ev = ev;
const ptSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9, t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1); return [ax + dx * t, ay + dy * t, t]; };
// nearest point on a polyline: { d, s (arc length), x, y }
const polyNear = (pts, px, py) => { let best = null, acc = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = hyp(bx - ax, by - ay), [qx, qy, t] = ptSeg(px, py, ax, ay, bx, by), d = hyp(px - qx, py - qy); if (!best || d < best.d) best = { d, s: acc + L * t, x: qx, y: qy, i }; acc += L; } return best; };
const polyLen = pts => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += hyp(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; };
const polyAt = (pts, s) => { for (let i = 0; i < pts.length - 1; i++) { const L = hyp(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (s <= L || i === pts.length - 2) { const t = clamp(s / (L || 1), 0, 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; } s -= L; } return pts[0]; };
G.geo = { ptSeg, polyNear, polyLen, polyAt, inCav };
// ---- objects
Op.add = (S, type, o) => { const spec = OBJ[type]; if (!spec) throw new Error('unknown object type ' + type); const ob = { id: S.nid++, type, ph: S.ph, x: 213, y: 116, ...o }; ob.t0 = S.t; ob.x0 = ob.x; ob.y0 = ob.y; if (spec.init) spec.init(S, ob, o); S.objs.push(ob); return ob; };
Op.byId = (S, id) => S.objs.find(o => o.id === id);
Op.alive = (S, type) => S.objs.filter(o => !o.done && (!type || o.type === type));
Op.scatter = (S, n, o = {}) => { const out = [], sep = o.sep || 34, m = o.margin || 24; for (let i = 0; i < n; i++) { let best = null, bd = -1; for (let k = 0; k < 24; k++) { const a = rnd(S) * 6.283, r = Math.sqrt(rnd(S)), x = CAV.cx + Math.cos(a) * (CAV.rx - m) * r * (o.spread || 1), y = CAV.cy + Math.sin(a) * (CAV.ry - m) * r * (o.spread || 1); let d = 1e9; for (const q of S.objs.concat(out)) if (!q.done && q.type !== 'pool') d = Math.min(d, hyp(q.x - x, q.y - y)); if (d > sep) { best = [x, y]; break; } if (d > bd) { bd = d; best = [x, y]; } } out.push({ x: best[0], y: best[1], type: 'tmp', done: false }); } return out.map(p => [p.x, p.y]); };
// An object is visible/targetable unless hidden and unmarked, or under a pool.
const covered = (S, o) => { for (const q of S.objs) if (q.type === 'pool' && !q.done && q !== o && hyp(q.x - o.x, q.y - o.y) < q.r) return true; return false; };
Op.visible = (S, o) => !o.done && !(o.hid && !(o.mk > S.rt)) && !(o.sub && covered(S, o)) && !o.gone;
Op.near = (S, x, y, r, pred) => { let best = null, bd = r; for (const o of S.objs) { if (!Op.visible(S, o) || (pred && !pred(o))) continue; const d = hyp(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } return best; };
// ---- scoring
const MULT = { Sloppy: .4, Clean: 1, Textbook: 1.5 };
Op.award = (S, p, x, y, grade, base = 100) => {
  const flow = 1 + Math.min(1, S.chain * .05 / 1); // +5% per chained non-sloppy action up to x2
  const nf = clamp(1 + (S.chain >= 3 ? (S.chain) * .05 : 0), 1, 2);
  if (grade === 'Sloppy') S.chain = 0; else S.chain++;
  S.stats.bestChain = Math.max(S.stats.bestChain, S.chain);
  const pts = Math.round(base * MULT[grade] * nf * (S.learn ? 1 : 1)); S.score += pts; if (p) p.score = (p.score || 0) + pts;
  S.stats.n++; if (grade !== 'Sloppy') S.stats.clean++; if (grade === 'Textbook') { S.stats.textbook++; if (p) p.tb = (p.tb || 0) + 1; }
  if (p) p.n = (p.n || 0) + 1;
  const gain = (grade === 'Textbook' ? 10 : grade === 'Clean' ? 5 : 0) * T('steadyGain'); if (!S.lb) S.steady = Math.min(100, S.steady + gain);
  if (S.learn) { S.learn = false; ev(S, 'learned'); }
  ev(S, 'grade', x, y, grade, S.chain >= 3 ? Math.round(nf * 100) / 100 : 1, p ? p.i : 0);
  return pts;
};
Op.slip = (S, p, x, y, dmg, why) => {
  if (S.learn) { ev(S, 'slip', x, y, why || '', 0); return; }
  S.vitals = Math.max(0, S.vitals - dmg * T('slip') * (S.diff === 'Intern' ? .8 : 1)); S.chain = 0; S.stats.slips++; if (p) p.slips = (p.slips || 0) + 1; ev(S, 'slip', x, y, why || '', dmg);
};
Op.heal = (S, v) => { S.vitals = Math.min(99, S.vitals + v * T('heal')); };
// ---- create
Op.newPlayer = (i, col) => ({ i, x: 213, y: 116, vx: 0, vy: 0, tool: 'forceps', trig: 0, pt: 0, fine: 0, g: null, heat: 0, lock: 0, fill: 0, cd: 0, swap: 0, score: 0, n: 0, tb: 0, slips: 0, st: 0, suc: 0, burn: 0, gone: false, char: 0, off: 0, drag: 0, gp: 0, pcon: 0, color: col || '#e8443a', son: null });
Op.create = (def, opt = {}) => {
  const n = opt.players || 1, cols = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
  const diff = opt.difficulty || 'Resident', D = DIFF[diff];
  const S = { v: 1, case: def.id, seed: opt.seed || 1, rng: (opt.seed || 1) * 2654435761 >>> 0, t: 0, rt: 0, diff, np: n, clock: def.clock * D.clock * T('clock'), clock0: def.clock * D.clock * T('clock'), vitals: def.vitals, v0: def.vitals, ph: 0, phT: 0, objs: [], nid: 1, pl: [], steady: opt.steady || 0, lb: false, sl: 0, wf: 1, chain: 0, score: 0, stats: { slips: 0, n: 0, clean: 0, textbook: 0, bestChain: 0, fails: 0 }, ev: [], buf: [], ghosts: null, cb: null, cbUsed: false, close: null, over: null, why: '', tilt: [0, 0], hb: 0, learn: false, doc: def.doc || 'vale', zones: [], chars: [], capped: false, pool: 0, hold: 0, bat: 0, dev: false, frozen: false, lights: null, phase: null, chk: null, tfail: 0, lbT: 0, wfT: 0, dim: 0, blackout: 0 };
  for (let i = 0; i < n; i++) S.pl.push(Op.newPlayer(i, cols[i]));
  S.def = def.id; Op.enterPhase(S, def, 0, true); return S;
};
Op.def = S => G.CASES[S.case];
const clone = S => { const b = S.buf, g = S.ghosts, e = S.ev, c = S.chk; S.buf = []; S.ghosts = null; S.ev = []; S.chk = null; const o = structuredClone(S); S.buf = b; S.ghosts = g; S.ev = e; S.chk = c; return o; };
Op.clone = clone;
Op.restore = (S, snap) => { const keep = { buf: S.buf, ev: S.ev, chk: S.chk }; for (const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(snap), keep); };
Op.enterPhase = (S, def, i, first) => {
  S.ph = i; S.phT = 0; S.tfail = 0; const ph = def.phases[i]; if (!ph) return;
  S.hold = 0; S.zones = [];
  for (const sp of ph.spawn || []) { const { t, ...rest0 } = sp; const fixed = sp.x != null, n = fixed ? 1 : (sp.n || 1), rest = fixed ? rest0 : (({ n: _n, ...r }) => r)(rest0); const pts = sp.x == null ? Op.scatter(S, n, { sep: sp.sep, margin: sp.margin, spread: sp.spread }) : null; for (let k = 0; k < n; k++) { const o = { ...rest }; if (pts) { o.x = pts[k][0]; o.y = pts[k][1]; } else if (n > 1) { o.x += k * 28; } if (o.under) { Op.add(S, 'pool', { x: o.x, y: o.y, vol: 260, req: false }); } Op.add(S, t, o); } }
  if (ph.init) ph.init(S, Op);
  S.learn = !!ph.learn && !S.capped; if (S.learn) ev(S, 'learn', ph.learn);
  if (ph.vitalsTo != null) S.vitals = Math.min(S.vitals, ph.vitalsTo);
  S.chk = null; S.chk = clone(S);
  ev(S, 'phase', i, ph.obj || '');
};
Op.phaseDone = (S, def) => {
  const ph = def.phases[S.ph]; if (!ph) return true;
  if (ph.until && !ph.until(S)) return false;
  if (ph.minT && S.phT < ph.minT) return false;
  for (const o of S.objs) if (!o.done && o.ph === S.ph && o.req !== false && (OBJ[o.type].req !== false)) return false;
  return true;
};
// Retry from this phase: restores the phase's starting state, rank capped at B.
Op.retry = S => { if (!S.chk) return; const keepSteady = S.steady, ch = S.chk; Op.restore(S, ch); S.chk = ch; S.capped = true; S.stats.fails++; S.over = null; S.cb = null; S.steady = Math.max(keepSteady * .5, 20); S.vitals = Math.max(S.vitals, 40); S.clock = Math.max(S.clock, 30); S.chk = clone(S); };
// Targets for the cursor's magnet and the bot: points valid for a tool right now.
Op.targets = (S, tool) => { const out = []; for (const o of S.objs) { if (!Op.visible(S, o)) continue; const s = OBJ[o.type]; if (s.tools && s.tools(S, o, tool)) { const p = s.pt ? s.pt(S, o, tool) : [o.x, o.y]; out.push({ x: p[0], y: p[1], o }); } } return out; };
Op.guide = (S, p) => { const g = p.g; if (!g) return null; if (g.k === 'cut') { const o = Op.byId(S, g.id); return o ? o.pts : null; } if (g.k === 'st') { const o = Op.byId(S, g.id), s = o.st[g.i]; return [s.a, s.b]; } return null; };
Op.diffD = S => DIFF[S.diff];
// ---- step
Op.step = (S, inputs, dt) => {
  if (S.over) return;
  const def = G.CASES[S.case], D = DIFF[S.diff];
  S.rt += dt; S.phT += dt;
  for (let i = 0; i < S.pl.length; i++) { const p = S.pl[i], q = inputs[i]; if (!q || p.gone) continue; p.vx = (q.x - p.x) / dt; p.vy = (q.y - p.y) / dt; p.px = p.x; p.py = p.y; p.x = q.x; p.y = q.y; p.pt = p.trig; p.trig = q.trig || 0; p.fine = q.fine || 0; p.gift = q.gift; p.cancel = q.cancel; if (q.tool && q.tool !== p.tool) { p.tool = q.tool; p.g = null; p.swap = .12; p.fill = 0; } if (q.consult && def.consult) { S.doc = S.doc === 'vale' ? 'sokolova' : 'vale'; ev(S, 'consult', S.doc); } }
  if (S.pl.some(p => p.gift && !p.giftHeld)) Op.gift(S, def); for (const p of S.pl) p.giftHeld = !!p.gift;
  if (S.cb) return Op.codeBlue(S, inputs, dt);
  if (S.close) return Op.closing(S, inputs, dt, def);
  // record for Second Look
  if (!S.noRewind) { S.bufT = (S.bufT || 0) + dt; if (S.bufT >= .1) { S.bufT = 0; S.buf.push({ rt: S.rt, st: clone(S) }); while (S.buf.length > 62) S.buf.shift(); } }
  // Long Breath: the world slows, the hands do not
  if (S.lb) { S.steady -= T('lbDrain') * dt; if (S.steady <= 0) { S.steady = 0; S.lb = false; ev(S, 'lb', 0); } }
  const wf = S.wf = S.lb ? T('lbFactor') : 1, wdt = dt * wf;
  S.wdt = wdt; if (!S.lb) S.steady = Math.min(100, S.steady + .5 * dt * T('steadyGain')); S.t += wdt;
  S.hb = (S.hb + wdt * (1 + (1 - clamp(S.vitals / 99, 0, 1)) * 1.4) * 1.1) ; if (S.hb >= 1) { S.hb -= 1; ev(S, 'beat', S.vitals); if (Op.beatHooks) Op.beatHooks(S); }
  // tools
  for (const p of S.pl) if (!p.gone) Op.tool(S, p, dt, def);
  // hazards and clock
  if (!S.frozen && !S.learn) {
    let drain = def.drain || 0; for (const o of S.objs) if (!o.done && !o.paused) { const s = OBJ[o.type]; if (s.drain) drain += typeof s.drain === 'function' ? s.drain(S, o) : s.drain; }
    if (S.cheatLock) drain = 0;
    S.vitals = clamp(S.vitals - drain * T('drain') * D.drain * wdt, 0, 99);
    if (!S.cheatFreezeClock) S.clock -= wdt;
  }
  for (const o of S.objs.slice()) { if (o.done) continue; const s = OBJ[o.type]; if (s.tick && !o.paused) s.tick(S, o, wdt, dt); }
  Op.pools(S, wdt);
  if (def.tick) def.tick(S, wdt, dt);
  S.objs = S.objs.filter(o => !o.done || (o.keep && S.t < o.keep));
  if (S.sl > 0) S.sl -= dt;
  if (S.cheatLock) S.vitals = Math.max(S.vitals, 30);
  // end conditions
  if (S.clock <= 0 && !S.cheatFreezeClock) { S.clock = 0; return Op.lose(S, 'time', 'Time of death.'); }
  if (S.vitals <= 0) {
    if (!S.cbUsed && !D.noBlue) { S.cb = { t: 0, ph: 0, pass: 0, hits: 0, tries: 4, last: -1, tb: 0, flash: 0 }; S.lb = false; ev(S, 'codeblue'); return; }
    return Op.lose(S, 'vitals', 'The line goes flat.');
  }
  if (def.fail && def.fail(S)) return Op.lose(S, 'device', 'The device went off.');
  if (Op.phaseDone(S, def)) { if (S.ph + 1 >= def.phases.length) Op.beginClose(S); else { ev(S, 'phasedone', S.ph); Op.enterPhase(S, def, S.ph + 1); } }
};
Op.lose = (S, why, line) => { S.over = 'lost'; S.why = why; S.line = line; ev(S, 'lost', why); };
Op.beginClose = S => { S.close = { t: 0, len: 1.8, hit: null }; S.lb = false; ev(S, 'close'); };
Op.closing = (S, inputs, dt, def) => {
  const c = S.close; c.t += dt; const press = S.pl.some(p => p.trig > .3 && p.pt <= .3);
  if (c.hit == null && (press || c.t > c.len + 1.2)) {
    const off = Math.abs(c.t - c.len), g = off < .12 ? 'Textbook' : off < .35 ? 'Clean' : 'Sloppy'; c.hit = g; c.hitT = c.t; Op.award(S, S.pl[0], 213, 116, g, 150); ev(S, 'stamp', g);
    const bonus = Math.round(Math.max(0, S.clock) * 2 + S.vitals * 3); S.score += bonus; S.bonus = bonus;
  }
  if (c.hit && c.t > c.hitT + 1.6) { S.over = 'won'; ev(S, 'won'); }
};
Op.gift = (S, def) => {
  if (S.doc === 'vale' || def.noSokolova) { if (S.lb) { S.lb = false; ev(S, 'lb', 0); } else if (S.steady >= 35) { S.lb = true; ev(S, 'lb', 1); } else ev(S, 'nogift'); }
  else if (!def.noRewind && !S.noRewind) {
    if (S.steady < 45) { ev(S, 'nogift'); return; }
    const want = S.rt - T('slSeconds'); let k = S.buf.findIndex(b => b.rt >= want); if (k < 0) k = 0; const e = S.buf[k]; if (!e) { ev(S, 'nogift'); return; }
    const after = S.buf.slice(k + 1), keepP = S.pl.map(p => [p.x, p.y]), steady = S.steady - 45, ghosts = { t: 0, len: T('slSeconds'), s: after.map(b => ({ t: b.rt - e.rt, c: b.st.pl.map(p => [p.x | 0, p.y | 0]), o: b.st.objs.filter(o => o.ghost !== false && (o.strain || o.type === 'bead')).map(o => [o.x | 0, o.y | 0, o.type]) })) };
    const ch = S.chk, buf = S.buf.slice(0, k); Op.restore(S, e.st); S.buf = buf; S.chk = ch; S.steady = steady; S.sl = 1.2; S.ghosts = ghosts; S.lb = false; S.rewound = (S.rewound || 0) + 1;
    S.pl.forEach((p, i) => { p.x = keepP[i][0]; p.y = keepP[i][1]; p.g = null; p.trig = 0; p.pt = 0; p.fill = 0; }); ev(S, 'rewind');
  }
};
Op.codeBlue = (S, inputs, dt) => {
  const c = S.cb; c.t += dt; c.ph = (c.t % .9) / .9; const peak = .5, pass = Math.floor(c.t / .9);
  const press = S.pl.some(p => p.trig > .3 && p.pt <= .3 && !p.gone);
  if (press && pass > c.last) { c.last = pass; const off = Math.abs(c.ph - peak) * .9; if (off <= .14) { c.hits++; if (off <= .06) c.tb++; ev(S, 'shockhit', off <= .06 ? 1 : 0); } else ev(S, 'shockmiss'); c.pressed = pass; }
  if (pass > c.pass) { c.pass = pass; if (c.last < pass - 1) { c.last = pass - 1; ev(S, 'shockmiss'); } }
  const done = c.pass >= c.tries;
  if (c.hits >= 2) { S.cbUsed = true; S.vitals = 30; S.cb = null; S.stats.codeblue = (S.stats.codeblue || 0) + 1; S.flashT = 1; ev(S, 'revive'); return; }
  if (done || (c.tries - c.pass) + c.hits < 2) { S.cb = null; S.cbUsed = true; return Op.lose(S, 'code', 'Time of death.'); }
};
// pools drift, merge, and are fed by bleeders
Op.pools = (S, dt) => {
  for (const o of S.objs) if (o.type === 'pool' && !o.done) { o.r = Math.sqrt(Math.max(0, o.vol)) * 1.15; const k = S.tilt; if (k && (k[0] || k[1])) { o.x = clamp(o.x + k[0] * dt * .35, 40, 386); o.y = clamp(o.y + k[1] * dt * .35, 50, 190); } if (o.vol <= 0) { o.done = true; } }
};
Op.feed = (S, x, y, rate, dt) => { let best = null, bd = 30; for (const o of S.objs) if (o.type === 'pool' && !o.done) { const d = hyp(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } const pools = S.objs.filter(o => o.type === 'pool' && !o.done).length; if (!best && pools < 7) best = Op.add(S, 'pool', { x, y, vol: 0, req: false, ph: S.ph }); if (best) best.vol = Math.min(900, best.vol + rate * T('bleed') * dt); };
G.OpHelpers = { rnd, clamp, hyp, ev };
})();
