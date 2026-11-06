// One bot, three jobs: attract mode, scripted playthrough, balance runs. Drives a virtual stick into Cursor.update.
(() => {
const G = (window.GAME ||= {}), T = G.T, Op = G.Op, OBJ = G.OBJ, { clamp, hyp } = G.OpHelpers, geo = G.geo;
const PRI = { bleeder: 0, arteryTear: 0, bead: 3, mouth: 1, nest: 0, tendril: 1, pool: 2, shard: 3, hook: 3, polyp: 3, incision: 2, mass: 3, wound: 6, laceration: 5, patch: 5, screw: 3, clot: 3, lobe: 3, tremolo: 2, legato: 2, fermata: 2, voicebox: 2, repeat: 0, note: 2, spiral: 2, lead: 2, wire: 3, device: 3, retractorHandle: 9, dacapo: 9, cantor: 9, reed: 9 };
class Bot {
  constructor(o = {}) { this.o = { speed: 260, react: .25, err: 3, cheat: false, ...o }; this.dev = { ax: 0, ay: 0, fine: 0 }; this.trig = 0; this.toolName = 'forceps'; this.gen = null; this.gift = 0; this.wait_ = 0; this.cur = null; this.id = null; this.lastPlan = ''; this.idle = 0; this.tgt = null; this.errx = 0; this.erry = 0; this.errT = 0; this.cooldown = 0; }
  // ---- primitives (generators yield once per step)
  *tool(n) { if (this.toolName !== n) { this.toolName = n; this.trig = 0; if (!this.o.cheat) yield* this.wait(.14); } }
  *wait(s) { let t = s; while (t > 0) { this.dev.ax = this.dev.ay = 0; t -= this.dt; yield; } }
  press() { this.trig = 1; } release() { this.trig = 0; }
  aim(x, y, cap, tolr = 2) { // set the virtual stick toward (x,y); returns distance
    const c = this.c, ex = this.o.cheat ? 0 : this.errx, ey = this.o.cheat ? 0 : this.erry, dx = x + ex - c.x, dy = y + ey - c.y, d = hyp(dx, dy);
    if (d < .3) { this.dev.ax = this.dev.ay = 0; return d; }
    const fineMul = this.dev.fine ? T('fine') : 1, v = Math.min(cap || this.o.speed, d / Math.max(this.dt, .008) * .6, d * 16 + 8), m = Math.pow(clamp(v / (T('cursorSpeed') * fineMul), 0, 1), 1 / T('curve'));
    this.dev.ax = dx / d * m; this.dev.ay = dy / d * m; return d;
  }
  *go(x, y, o = {}) { const tl = o.tol || 3; let n = 0; while (n++ < 400) { const d = this.aim(typeof x === 'function' ? x()[0] : x, typeof x === 'function' ? x()[1] : y, o.speed, tl); if (d < tl) break; yield; } this.dev.ax = this.dev.ay = 0; }
  *goF(f, o = {}) { const tl = o.tol || 3; let n = 0; while (n++ < 500) { const [x, y] = f(); const d = this.aim(x, y, o.speed, tl); if (d < tl) break; yield; } this.dev.ax = this.dev.ay = 0; }
  S() { return this.s; } ob() { return Op.byId(this.s, this.id); }
  // ---- main
  read(S, p, c, dt) {
    this.s = S; this.p = p; this.c = c; this.dt = dt;
    this.errT -= dt; if (this.errT <= 0) { this.errT = .35; const e = this.o.err; this.errx = (Math.sin(S.rt * 7.3) * e) * .5; this.erry = (Math.cos(S.rt * 5.9) * e) * .5; }
    const out = () => ({ dev: this.dev, trig: this.trig, tool: this.toolName, fine: this.dev.fine, gift: this.gift });
    this.gift = 0;
    if (S.cb) { this.gen = null; this.trig = 0; const cb = S.cb; this.dev.ax = this.dev.ay = 0; const lead = this.o.cheat ? .02 : .05; if (cb.ph * .9 > .45 - lead && cb.ph * .9 < .55 && cb.last < cb.pass + 0 && this.s.cb.last !== Math.floor(cb.t / .9)) this.trig = 1; else this.trig = 0; return out(); }
    if (S.close) { this.gen = null; this.dev.ax = this.dev.ay = 0; const c2 = S.close; this.trig = (c2.hit == null && c2.t > c2.len - .03 - (this.o.cheat ? 0 : .08 * 0)) ? 1 : 0; return out(); }
    if (S.sl > 0) return out();
    if (this.wait_ > 0) { this.wait_ -= dt; this.dev.ax = this.dev.ay = 0; return out(); }
    // emergency IV
    if (!this.gen || this.lastPlan !== 'iv') { if (S.vitals < (this.o.ivAt || 34) && !S.learn && !Op.def(S).phases[S.ph].noIV && p.cd <= 0 && !S.cb && S.pl[0] === p) { this.gen = this.ivPlan(); this.lastPlan = 'iv'; } }
    if (!this.gen) { this.gen = this.choose(); if (!this.gen && S.vitals < 72 && p.cd <= 0 && Op.def(S).phases[S.ph].iv) { this.gen = this.ivPlan(); this.lastPlan = 'iv'; } if (!this.gen) { this.dev.ax = this.dev.ay = 0; this.trig = 0; this.idle++; return out(); } }
    let r; try { r = this.gen.next(); } catch (e) { this.err = e; r = { done: true }; this.gen = null; this.trig = 0; if (this.o.onError) this.o.onError(e); return out(); }
    if (r.done) { this.gen = null; this.trig = 0; this.dev.ax = this.dev.ay = 0; this.lastPlan = ''; if (!this.o.cheat) this.wait_ = this.o.react * .5; }
    return out();
  }
  *ivPlan() { yield* this.tool('syringe'); let n = 0; while (this.s.vitals < 60 && n++ < 6) { const [x, y] = [Op.inCav(this.c.x, this.c.y) ? this.c.x : 213, this.c.y]; this.trig = 1; let f = 0; while (this.p.fill < 1.0 && f++ < 100) { yield; } this.trig = 0; yield; yield* this.wait(.4); if (this.s.vitals > 55) break; } this.gen = null; this.lastPlan = ''; }
  choose() {
    const S = this.s, cands = [];
    for (const o of S.objs) {
      if (o.done || o.dead) continue; const plan = PLANS[o.type]; if (!plan) continue;
      if (!Op.visible(S, o) && !o.hid) { continue; }
      const ready = READY[o.type]; if (ready && !ready(this, o)) continue;
      if (S.np > 1 && o.claim != null && o.claim !== this.p.i && o.claimT > S.rt) continue;
      const pri = o.type === 'retractorHandle' ? -1000 : (o.type === 'pool' && o.req === false && !S.objs.some(q => q.sub && !q.done && hyp(q.x - o.x, q.y - o.y) < o.r + 4) ? 7 : (PRI[o.type] ?? 4)) * 1000 + hyp(o.x - this.c.x, o.y - this.c.y); cands.push({ o, pri });
    }
    if (!cands.length) return null; cands.sort((a, b) => a.pri - b.pri); const o = cands[0].o; this.id = o.id; this.lastPlan = o.type; o.claim = this.p.i; o.claimT = S.rt + 3;
    return this.planFor(o);
  }
  *planFor(o) { const S = this.s; if (o.hid && !(o.mk > S.rt)) { yield* this.find(o); if (!o.mk || !(o.mk > S.rt)) return; } yield* PLANS[o.type](this, o); }
  *find(o) { yield* this.tool('sonar'); const S = this.s; yield* this.go(o.x, o.y, { tol: 4 }); this.press(); let n = 0; while (!(o.mk > S.rt) && !o.done && n++ < 400) { this.aim(o.x + Math.sin(n * .3) * 10, o.y + Math.cos(n * .3) * 10, 90); yield; } this.release(); }
  // generic pull along an object's axis
  *pull(o, speed, extra = 30, tool = 'forceps') {
    yield* this.tool(tool); yield* this.go(o.x0, o.y0, { tol: 3 }); this.press(); yield; const S = this.s; let n = 0;
    while (!o.free && !o.done && n++ < 1500) { if (!this.p.g) { this.release(); yield; yield* this.go(o.x, o.y, { tol: 3 }); this.press(); yield; continue; } const tx = o.x0 + o.ax[0] * (o.depth + 3), ty = o.y0 + o.ax[1] * (o.depth + 3); this.aim(tx, ty, speed); yield; }
    if (o.done) { this.release(); return; }
    // carry it out of the cavity edge or 30 u away, then let go
    const tx = o.x0 + o.ax[0] * (o.depth + extra), ty = o.y0 + o.ax[1] * (o.depth + extra); yield* this.go(tx, ty, { tol: 4, speed: 200 }); this.release(); yield; yield;
  }
}
const PLANS = {}, READY = {};
PLANS.shard = function* (B, o) { yield* B.pull(o, 82); };
PLANS.hook = function* (B, o) { yield* B.pull(o, 62); };
READY.hook = (B, o) => o.cut;
PLANS.mass = function* (B, o) { yield* B.pull(o, 80); }; READY.mass = (B, o) => o.cut;
PLANS.device = function* (B, o) { yield* B.pull(o, 24); };
PLANS.clot = function* (B, o) {
  if (!o.sedated) { yield* B.tool('syringe'); yield* B.go(o.x, o.y, { tol: 3 }); B.press(); let n = 0; while (B.p.fill < .97 && n++ < 100) yield; B.release(); yield; yield* B.wait(.4); return; }
  yield* B.pull(o, 80);
};
PLANS.screw = function* (B, o) { yield* B.tool('forceps'); yield* B.go(o.x + 8, o.y, { tol: 2 }); B.press(); yield; let a = 0, n = 0; while (!o.free && !o.done && n++ < 1200) { a += B.dt * 5.5; B.aim(o.x + Math.cos(a) * 9, o.y + Math.sin(a) * 9, 160); yield; } yield* B.go(o.x, o.y, { tol: 3 }); B.release(); yield; };
PLANS.laceration = PLANS.patch = function* (B, o) { yield* B.tool('salve'); yield* B.go(o.x, o.y, { tol: 3 }); B.press(); let a = 0, n = 0; while (!o.done && n++ < 900) { a += B.dt * 9; B.aim(o.x + Math.cos(a) * 5, o.y + Math.sin(a) * 5, 160); yield; } B.release(); yield; };
PLANS.wound = function* (B, o) {
  yield* B.tool('suture'); let guard = 0;
  while (!o.done && guard++ < 40) { const s = o.st.find(q => !q.done); if (!s) break; yield* B.goF(() => s.a, { tol: 2.5, speed: 300 }); B.press(); yield; if (B.p.g == null) { B.release(); yield; continue; }
    let n = 0; while (hyp(B.c.x - s.b[0], B.c.y - s.b[1]) > 2.5 && n++ < 60) { B.aim(s.b[0], s.b[1], 330); yield; }
    if (o.beatOnly) { let w = 0; while (!G.beatWindow(B.s) && w++ < 200) { B.aim(s.b[0], s.b[1], 50); yield; } }
    B.release(); yield; yield; }
};
PLANS.arteryTear = PLANS.wound;
PLANS.bleeder = PLANS.polyp = PLANS.lead = PLANS.mouth = PLANS.bead = function* (B, o) { yield* B.tool('cautery'); let n = 0, guard = 0; yield* B.goF(() => [o.x, o.y], { tol: 2 }); B.press(); while (!o.done && guard++ < 700) { B.aim(o.x, o.y, 200); if (B.p.heat > .82 || B.p.lock > 0) { B.release(); yield* B.wait(.7); B.press(); } if (o.paused) { } yield; } B.release(); yield; };
PLANS.pool = function* (B, o) { yield* B.tool('suction'); yield* B.goF(() => [o.x, o.y], { tol: 5 }); B.press(); let n = 0; while (!o.done && n++ < 900) { B.aim(o.x, o.y, 120); yield; } B.release(); yield; };
PLANS.incision = function* (B, o) {
  yield* B.tool('scalpel'); const start = geo.polyAt(o.pts, o.prog); yield* B.go(start[0], start[1], { tol: 2 }); B.press(); yield; let n = 0;
  while (!o.cut && n++ < 1600) { if (!B.p.g) { B.release(); yield; const h = geo.polyAt(o.pts, o.prog); yield* B.go(h[0], h[1], { tol: 2 }); B.press(); yield; continue; }
    const goal = geo.polyAt(o.pts, Math.min(o.len, o.prog + 9)); if (o.spiral && !G.beatWindow(B.s)) { B.dev.ax = B.dev.ay = 0; } else B.aim(goal[0], goal[1], o.spiral ? 55 : 120); yield; }
  B.release(); yield;
};
READY.incision = (B, o) => !o.cut && !o.slur;
PLANS.nest = function* (B, o) {
  if (!o.cut) { yield* B.tool('scalpel'); yield* B.go(o.x - 36, o.y + 2, { tol: 4 }); B.press(); yield; let n = 0; while (!o.cut && n++ < 60) { B.aim(o.x + 36, o.y, 330); yield; } B.release(); yield; if (!o.cut) return; }
  yield* B.pull(o, 40, 30);
};
PLANS.tendril = PLANS.repeat = function* (B, o) { yield* B.tool('scalpel'); yield* B.go(o.x - 30, o.y, { tol: 5 }); const S = B.s; let w = 0; while (!o.open && o.type === 'tendril' && w++ < 400) { B.aim(o.x - 30, o.y, 50); yield; } B.press(); yield; let n = 0; while (!o.done && n++ < 80) { B.aim(o.x + 36, o.y, 330); yield; } B.release(); yield; };
PLANS.wire = function* (B, o) { yield* B.tool('scalpel'); const S = B.s; const next = Math.min(...S.objs.filter(q => q.type === 'wire' && !q.cut && !q.done).map(q => q.rank)); if (o.rank !== next) { yield; return; } yield* B.go(o.x - 36, o.y, { tol: 4 }); B.press(); yield; let n = 0; while (!o.done && n++ < 80) { B.aim(o.x + 40, o.y, 330); yield; } B.release(); yield; };
READY.wire = (B, o) => { const next = Math.min(...B.s.objs.filter(q => q.type === 'wire' && !q.done).map(q => q.rank)); return o.rank === next; };
PLANS.voicebox = function* (B, o) { yield* B.tool('syringe'); yield* B.go(o.x, o.y, { tol: 3 }); let n = 0; while (!o.done && n++ < 600) { B.aim(o.x, o.y, 90); if (!(o.mk > B.s.rt) && B.p.fill < .1) break; if (o.win && B.p.fill < .1 && B.p.cd <= 0 && !B.trig) { B.press(); } if (B.trig) { if (B.p.fill >= .95 && o.win) { B.release(); yield; yield* B.wait(.3); } else if (!o.win && B.p.fill > .5) { B.release(); } } yield; } B.release(); };
PLANS.lobe = function* (B, o) {
  const S = B.s; let n = 0;
  while (!o.dead && !o.done && n++ < 900) {
    const open = o.open;
    if (o.k === 'A') { yield* B.tool('cautery'); yield* B.go(o.x, o.y, { tol: 2 }); while (!o.open && n++ < 900) { yield; } B.press(); let k = 0; while (o.open && !o.dead && k++ < 400) { B.aim(o.x, o.y, 150); if (B.p.heat > .85) { B.release(); yield* B.wait(.6); B.press(); } yield; } B.release(); yield; if (o.dead) return; }
    if (o.k === 'B') { if (!o.cut) { yield* B.tool('scalpel'); yield* B.go(o.x - 30, o.y, { tol: 4 }); while (!o.open && n++ < 900) { B.aim(o.x - 30, o.y, 60); yield; } B.press(); yield; let k = 0; while (!o.cut && k++ < 60) { B.aim(o.x + 30, o.y, 330); yield; } B.release(); yield; } else { yield* B.tool('forceps'); yield* B.go(o.x, o.y + 4, { tol: 3 }); while (!o.open && n++ < 900) { yield; } B.press(); yield; let k = 0; while (!o.dead && k++ < 400) { B.aim(o.x, o.y - 40, 70); if (o.prog >= o.depth) { B.aim(o.x, o.y - 70, 200); } if (!B.p.g) break; yield; } B.release(); yield; } }
    if (o.k === 'C') { if (!o.sedd) { yield* B.tool('syringe'); yield* B.go(o.x, o.y, { tol: 3 }); while (!o.open && n++ < 900) { B.aim(o.x, o.y, 60); yield; } B.press(); let k = 0; while (B.p.fill < .97 && k++ < 100) { B.aim(o.x, o.y, 60); yield; } B.release(); yield; yield* B.wait(.3); } else { yield* B.tool('salve'); yield* B.go(o.x, o.y, { tol: 3 }); while (!o.open && n++ < 900) { yield; } B.press(); let a = 0, k = 0; while (!o.dead && !o.done && o.open && k++ < 500) { a += B.dt * 9; B.aim(o.x + Math.cos(a) * 5, o.y + Math.sin(a) * 5, 160); yield; } B.release(); yield; } }
    if (!o.dead) yield;
  }
};
PLANS.reed = function* () {};
PLANS.tremolo = function* (B, o) {
  const S = B.s; let n = 0;
  while (!o.done && n++ < 3000) {
    if (o.stage <= 2 && (o.amp > .2 || o.stage === 1)) { const reed = o.reeds.map(id => Op.byId(S, id)).find(r => r && !(r.asleep > 0)); if (!reed) { yield; continue; }
      yield* B.tool('syringe'); yield* B.goF(() => [reed.x, reed.y], { tol: 4 }); let k = 0;
      // press just after a beat, release on the next one, when the plunger is full
      while (k++ < 400) { B.aim(reed.x, reed.y, 80); if (o.flare > .15) break; yield; }
      B.press(); k = 0; while (o.flare > 0 && k++ < 60) { B.aim(reed.x, reed.y, 80); yield; } k = 0; while (!(o.flare > 0 && B.p.fill >= .93) && k++ < 120 && B.p.fill < 1.28) { B.aim(reed.x, reed.y, 80); yield; } B.release(); yield; yield* B.wait(.4); continue; }
    if (o.stage === 2) { yield* B.tool('cautery'); yield* B.go(o.x, o.y, { tol: 3 }); B.press(); let k = 0; while (o.stage === 2 && o.amp <= .2 && k++ < 800) { B.aim(o.x, o.y, 100); if (B.p.heat > .85) { B.release(); yield* B.wait(.6); B.press(); } yield; } B.release(); yield; continue; }
    if (o.stage === 3) { yield* B.pull(o, 36, 40); return; }
    yield;
  }
};
PLANS.legato = function* (B, o) {
  const S = B.s; let n = 0;
  while (!o.done && n++ < 6000) {
    if (o.state === 'under') { const m = o.marks.find(q => { const i = Op.byId(S, q.id); return i && !i.cut; }); const marked = o.mk > S.rt;
      if (m) { const inc = Op.byId(S, m.id); const g = B.planFor(inc); let r; while (o.state === 'under' && inc && !inc.cut && !(r = g.next()).done) yield; B.release(); yield; continue; }
      yield* B.tool('sonar'); B.press(); let k = 0; while (o.state === 'under' && k++ < 80) { B.aim(o.x, o.y, 120); yield; } B.release(); yield; continue; }
    if (o.clamped) { yield* B.tool('cautery'); yield* B.go(o.x, o.y, { tol: 2 }); B.press(); let k = 0; while (o.clamped && k++ < 300) { B.aim(o.x, o.y, 100); if (B.p.heat > .85) { B.release(); yield* B.wait(.6); B.press(); } yield; } B.release(); yield; continue; }
    if (o.state === 'up') { yield* B.tool('forceps'); yield* B.go(o.x0 + o.ax[0] * o.prog, o.y0 + o.ax[1] * o.prog, { tol: 3 }); B.press(); yield; let k = 0;
      while (o.state === 'up' && !o.clamped && !o.done && k++ < 1200) { if (!B.p.g) break; if (o.free) { const z = S.zones.find(q => q.for === o.id); if (z && o.barbs[o.bi] != null && o.prog < o.depth - 1) { yield* B.go(z.x, z.y, { tol: 5, speed: 140 }); B.release(); yield; yield; break; } if (o.prog >= o.depth - 1) { yield* B.go(o.x0 + o.ax[0] * (o.depth + 30), o.y0 + o.ax[1] * (o.depth + 30), { tol: 4 }); B.release(); yield; break; } }
        else B.aim(o.x0 + o.ax[0] * (o.depth + 3), o.y0 + o.ax[1] * (o.depth + 3), 34); yield; }
      B.release(); yield; continue; }
    yield;
  }
};
PLANS.fermata = function* (B, o) {
  const S = B.s; let n = 0;
  while (!o.done && n++ < 4000) {
    if (o.stage === 1) { yield* B.tool('cautery'); yield* B.go(o.x, o.y, { tol: 2 }); while (!(o.eye > 0) && o.stage === 1 && n++ < 4000) { B.aim(o.x, o.y, 100); yield; } B.press(); let k = 0; while (o.stage === 1 && o.eye > 0 && k++ < 200) { B.aim(o.x, o.y, 100); yield; } B.release(); yield; continue; }
    if (o.stage === 2) { if (S.objs.some(q => q.type === 'legato' && !q.done)) return; yield* B.find(o); yield; continue; }
    if (o.stage === 3) { yield* B.pull(o, 20, 40); return; }
    yield;
  }
};
PLANS.dacapo = PLANS.cantor = function* () {};
PLANS.retractorHandle = function* (B, o) { yield* B.tool('forceps'); yield* B.go(o.x, o.y, { tol: 4 }); B.press(); yield; let n = 0; while (n++ < 3000) { const t = Op.byId(B.s, o.target); if (!t || t.done) break; B.aim(o.x, o.y, 60); yield; } B.release(); yield; };
READY.retractorHandle = (B, o) => { const t = Op.byId(B.s, o.target); return B.s.np > 1 && B.p.i === 0 && t && !t.done; }; 
PLANS.spiral = function* (B, o) { yield* PLANS.incision(B, o); };
PLANS.note = function* (B, o) { yield* B.tool('forceps'); yield* B.go(o.x0, o.y0, { tol: 3 }); B.press(); yield; let n = 0; while (!o.done && n++ < 2000) { B.aim(o.x0, o.y0 - o.depth - 4, 30); yield; } B.release(); yield; };
READY.reed = () => false;
READY.fermata = (B, o) => o.stage !== 2 || !B.s.objs.some(q => q.type === 'legato' && !q.done);
G.Bot = Bot; G.BotPlans = PLANS;
})();
