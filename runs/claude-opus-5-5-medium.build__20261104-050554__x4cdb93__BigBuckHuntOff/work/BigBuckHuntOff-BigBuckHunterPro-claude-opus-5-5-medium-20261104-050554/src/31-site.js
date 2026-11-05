// The site runtime: a site is data plus a script (a generator on site time). The director moves the shared camera by
// keyframes (and, in single player, follows the live bucks). End rules: every scheduled buck bagged, escaped or lost
// and the script done; time out; every player benched. Time-boxed sites (AI Hub rounds, Quick Draw) loop their waves.
(() => {
const B = BB, E = B.E;

// ---- coroutines on site time ----
class Co {
  constructor(gen) { this.g = gen; this.wait = null; this.done = false; this.next(); }
  next(v) { const r = this.g.next(v); if (r.done) { this.done = true; this.wait = null; } else this.wait = r.value; }
  step(dt, t) {
    while (!this.done) {
      const w = this.wait;
      if (w === undefined || w === null) { if (this.stepped === t) return; this.stepped = t; this.next(); return; }
      if (typeof w === 'number') { if (this.until === undefined) { this.until = t + w; if (w <= 0) return; } if (t + 1e-9 >= this.until) { this.until = undefined; this.next(); continue; } return; }
      if (typeof w === 'function') { if (w()) { this.next(); continue; } return; }
      if (Array.isArray(w)) {   // any of
        if (this.until === undefined) { const n = w.find(x => typeof x === 'number'); this.until = n !== undefined ? t + n : Infinity; }
        if (t + 1e-9 >= this.until || w.some(x => typeof x === 'function' && x())) { this.until = undefined; this.next(); continue; }
        return;
      }
      this.next();
    }
  }
}
B.Co = Co;

// ---- patterns (data-driven spawns) ----
const PAT = B.PATTERNS = {};
const pat = (id, fn) => { PAT[id] = fn; };
const pathOf = (S, pts) => new B.Path(pts.map(p => { const [x, y] = B.rel(S.v, p[0], p[1]); return [x, y, p[2]]; }));
const kindOf = (S, k) => { const sp = S.species; if (k === 'buck' || k === 'male') return sp.targets[0]; if (k === 'doe' || k === 'female') return sp.protect[0]; if (k === 'fawn' || k === 'young') return sp.protect[1]; return k; };
const animal = (S, k, o) => B.makeAnimal(S.site, kindOf(S, k), o);
const gaitOrder = g => (g === 'bound' || g === 'run' ? 'run' : g === 'trot' ? 'trot' : 'walk');
pat('cross', (S, o) => {
  const a = animal(S, o.kind, o); a.path = pathOf(S, o.path);
  const g = gaitOrder(o.gait);
  a.orders = o.orders ? o.orders.slice() : [[g, { to: 1 }], ['exit']];
  if (o.delay) a.orders.unshift(['stand', o.delay]);
  return S.place(a);
});
pat('graze', (S, o) => {
  const a = animal(S, o.kind, o);
  a.path = pathOf(S, [o.from || [o.at[0] + 45, o.at[1] + 15], o.at, o.to || [o.at[0] - 55, o.at[1] + 20]]);
  a.orders = [['walk', { to: .5 }], ['graze', o.secs || 4], ['look', 1.2], ['graze', 2], ['walk', { to: 1 }], ['exit']];
  return S.place(a);
});
pat('emerge', (S, o) => {
  const a = animal(S, o.kind, o); a.path = pathOf(S, o.path);
  a.orders = [['hide', o.wait || 1.5], ['look', .8], [gaitOrder(o.gait || 'trot'), { to: 1 }], ['exit']];
  a.hidden = true; return S.place(a);
});
pat('herdPass', (S, o) => {
  const out = [];
  o.kinds.forEach((k, i) => {
    const a = animal(S, k, o); a.path = pathOf(S, o.path); const g = gaitOrder(o.gait);
    a.orders = [['stand', i * (o.spacing || 1.1) + S.rng.range(0, .3)], [g, { to: 1 }], ['exit']]; a.herdLeader = i ? out[0] : null;
    out.push(S.place(a));
  });
  return out;
});
pat('stand', (S, o) => {
  const a = animal(S, o.kind, o); a.path = pathOf(S, [o.from, o.at, o.to]);
  a.orders = [['walk', { to: .5 }], ['stand', o.secs || 3], ['look', 1], ['walk', { to: 1 }], ['exit']];
  return S.place(a);
});
pat('bolt', (S, o) => {
  const a = animal(S, o.kind, o); a.path = pathOf(S, o.path);
  a.orders = [['hide', o.wait || 12], ['run', { to: 1 }], ['exit']]; a.hidden = true; a.boltOnShot = true; a.temper = .01;
  return S.place(a);
});
pat('charge', (S, o) => {
  const a = animal(S, o.kind, o); a.path = pathOf(S, o.path);
  a.orders = [['run', { to: 1 }], ['exit']]; a.speedMul = o.speedMul || 1.1; a.noSpook = true;
  return S.place(a);
});
pat('fight', (S, o) => {   // two bulls lock antlers, then split
  const [x, y] = B.rel(S.v, o.at[0], o.at[1]), out = [];
  for (const sd of [1, -1]) {
    const a = animal(S, 'buck', o); const ang = S.v.yaw + Math.PI / 2;
    const px = x + Math.cos(ang) * sd * 1.6 * S.species.size, py = y + Math.sin(ang) * sd * 1.6 * S.species.size;
    const out1 = B.rel(S.v, o.at[0] + sd * 50, o.at[1] + 30);
    a.path = new B.Path([[px + Math.cos(ang) * sd * 30, py + Math.sin(ang) * sd * 30], [px, py], out1]);
    a.pathD = 30; a.heading = ang + (sd > 0 ? Math.PI : 0); a.x = px; a.y = py;
    a.orders = [['stand', o.secs || 6], ['run', { to: 1 }], ['exit']]; a.fighting = true; a.lockIn = o.secs || 6;
    out.push(S.place(a));
  }
  return out;
});
// critters: a path (with an altitude for flyers), and how they move
pat('critter', (S, o) => {
  const a = B.makeCritter(S.site, o.kind, o);
  a.path = pathOf(S, o.path); a.orders = o.orders ? o.orders.slice() : [[o.gait || 'run', { to: 1 }], ['exit']];
  if (o.alt) a.alt = o.alt;
  if (o.delay) a.orders.unshift(['stand', o.delay]);
  return S.place(a);
});

// ---- the site ----
class Site {
  constructor(id, o = {}) {
    const def = this.def = B.get('site', id);
    this.id = id; this.o = o; this.hunt = B.get('hunt', def.hunt); this.world = B.loadWorld(def.hunt);
    this.v = this.world.vantages[def.vantage]; if (!this.v) throw new Error('vantage ' + def.vantage);
    this.species = B.speciesFor(def.hunt);
    this.rng = B.mkRng(B.hashStr(id) ^ Math.imul(B.runSeed, 7919) ^ (o.wave || 0));
    this.herd = new B.Herd(this);
    this.t = 0; this.timeLimit = (o.time || def.time || 60) * (o.timeBox ? 1 : B.TUNING.siteTime);
    this.ended = false; this.endReason = null; this.endT = 0; this.subs = [];
    this.scheduled = def.bucks || 0; this.spawnedLegal = 0;
    this.lens = new B.Lens({ x: this.v.x, y: this.v.y, z: this.v.z, yaw: this.v.yaw, pitch: def.frame.pitch || 3, fov: def.frame.fov || 30, W: o.W || 480, H: o.H || 270 });
    this.cam = { bearing: (def.director && def.director[0] && def.director[0][1].bearing) || 0, pitch: def.frame.pitch || 3, fov: def.frame.fov || 30, follow: false, from: null };
    this.keys = (def.director || []).slice(); this.keyI = 0;
    this.kick = 0; this.bobT = 0;
    this.S = this.api();
    this.co = new Co(def.script(this.S));
    this.critCo = def.critters ? new Co(critterScript(this.S, def.critters)) : null;
    B.bus.emit('siteStart', { site: this });
  }
  api() {
    const site = this, S = {
      site, v: this.v, get species() { return site.species; }, rng: this.rng,
      get time() { return site.t; },
      get bucksLeft() { return Math.max(site.scheduled, site.spawnedLegal) - site.resolvedLegal(); },
      get actors() { return site.herd.list; },
      get last() { return site.lastActor; },
      get allResolved() { return site.herd.list.every(a => a.cat !== 'animal' || !a.legal || !a.live); },
      get liveBucks() { return site.herd.list.filter(a => a.cat === 'animal' && a.legal && a.live).length; },
      get shots() { return site.shotsFired || 0; },
      pattern(id, o) { const f = PAT[id]; if (!f) throw new Error('pattern ' + id); const r = f(S, Object.assign({}, o)); return r; },
      place(a) { a.site = site; if (a.path && !a.hidden && !a.fighting && !a.trophy && !a.noSkip) site.skipToView(a); if (a.path) { const p = a.path.at(a.pathD); a.x = p.x; a.y = p.y; if (!a.fighting) a.heading = p.angle; } a.z = site.world.groundAt(a.x, a.y); if (a.cat === 'animal' && a.legal && !a.trophy) site.spawnedLegal++; site.herd.add(a); site.lastActor = a; return a; },
      bark(cat, data) { B.bus.emit('bark', Object.assign({ cat }, data || {})); },
      say(who, line) { B.bus.emit('caption', { who, line }); },
      on(evt, fn) { site.subs.push(B.bus.on(evt, fn)); },
      rel: (b, d) => B.rel(site.v, b, d),
      doe: () => B.TUNING.doeShare * B.diff().doe,
      chance: p => site.rng.chance(p)
    };
    return S;
  }
  // start a walker just outside the current view, so it comes on screen at once (arcade pacing)
  skipToView(a) {
    const L = this.lens, hf = Math.atan((L.W / 2) / L.f) / B.DEG + 5, cb = this.cam.bearing, P = a.path;
    for (let d = 0; d < P.length * .6; d += 1) {
      const q = P.at(d), brg = -B.wrapA(Math.atan2(q.y - this.v.y, q.x - this.v.x) - this.v.yaw) / B.DEG;
      if (brg > cb - hf && brg < cb + hf) { a.pathD = Math.max(0, d - 1); return; }
    }
  }
  resolvedLegal() { let n = 0; for (const a of this.herd.list) if (a.cat === 'animal' && a.legal && !a.trophy && !a.live) n++; return n; }
  bagged() { return this.herd.list.filter(a => a.cat === 'animal' && a.legal && a.dead); }
  outOfFan(a) {
    const [b0, b1] = this.def.frame.bearings, brg = -B.wrapA(Math.atan2(a.y - this.v.y, a.x - this.v.x) - this.v.yaw) / B.DEG;
    if (brg > b0 + 2 && brg < b1 - 2) a.entered = true;
    return a.entered && (brg < b0 - 14 || brg > b1 + 14);
  }
  update(dt, players) {
    if (this.ended) { this.endT += dt; for (const a of this.herd.list) a.step(dt, this); this.director(dt, players); return; }
    this.t += dt;
    this.co.step(dt, this.t);
    if (this.critCo) this.critCo.step(dt, this.t);
    if (this.o.timeBox && this.co.done) { this.co = new Co(this.def.script(this.S)); }
    for (const a of this.herd.list) a.step(dt, this);
    this.director(dt, players);
    // end rules
    const allBenched = players.length && players.every(p => p.benched);
    if (!this.o.timeBox && this.co.done && this.herd.list.every(a => a.cat !== 'animal' || !a.legal || !a.live) && this.spawnedLegal >= this.scheduled) this.end(this.resolvedLegal() && this.bagged().length >= this.spawnedLegal ? 'clear' : 'done');
    else if (this.t >= this.timeLimit) this.end('time');
    else if (allBenched && !this.o.timeBox) this.end('benched');
  }
  end(reason) {
    if (this.ended) return;
    this.ended = true; this.endReason = reason; this.endT = 0;
    for (const a of this.herd.list) if (a.live && a.cat !== 'target') { a.flee = true; a.frozen = 0; a.alertT = 0; a.orders = [['run', { to: 1 }], ['exit']]; }
    for (const u of this.subs) u(); this.subs = [];
    B.bus.emit('siteEnd', { site: this, reason });
  }
  // ---- the camera ----
  director(dt, players) {
    const c = this.cam, d = this.def, t = this.t;
    while (this.keyI < this.keys.length && this.keys[this.keyI][0] <= t) {
      const k = this.keys[this.keyI][1]; this.keyI++;
      if (k.mode === 'follow') { c.follow = !this.o.shared; continue; }
      c.follow = false; c.from = { bearing: c.bearing, pitch: c.pitch, fov: c.fov, t0: t, dur: k.dur || 0, to: k, ease: k.ease || 'inOutSine' };
    }
    if (c.from) {
      const f = c.from, u = f.dur ? B.clamp((t - f.t0) / f.dur, 0, 1) : 1, e = (E.ease[f.ease] || (x => x))(u);
      if (f.to.bearing !== undefined) c.bearing = B.lerp(f.bearing, f.to.bearing, e);
      if (f.to.pitch !== undefined) c.pitch = B.lerp(f.pitch, f.to.pitch, e);
      if (f.to.fov !== undefined) c.fov = B.lerp(f.fov, f.to.fov, e);
      if (u >= 1) c.from = null;
    }
    if (c.follow && !this.ended) {
      const live = this.herd.list.filter(a => a.cat === 'animal' && a.legal && a.live && !a.hidden && a.entered);
      if (live.length) {
        let sx = 0, sy = 0; for (const a of live) { sx += a.x; sy += a.y; }
        const brg = -B.wrapA(Math.atan2(sy / live.length - this.v.y, sx / live.length - this.v.x) - this.v.yaw) / B.DEG;
        const lim = (d.frame.bearings[1] - d.frame.bearings[0]) / 2 - c.fov * .45, mid = (d.frame.bearings[0] + d.frame.bearings[1]) / 2;
        const want = B.clamp(brg, mid - Math.max(0, lim), mid + Math.max(0, lim));
        c.bearing += (want - c.bearing) * Math.min(1, dt / .8) * .6;
      }
    }
    this.bobT += dt; this.kick = Math.max(0, this.kick - dt / .25);
    const canoe = this.v.kind === 'canoe', bob = canoe ? Math.sin(this.bobT * 2 * Math.PI / 3.1) : 0;
    const breath = this.o.shared ? 0 : Math.sin(this.bobT * .7) * .15;
    const L = this.lens;
    L.x = this.v.x; L.y = this.v.y; L.z = this.v.z + bob * .04 + (this.v.onWater ? (this.world.waterAt(this.v.x, this.v.y) || 0) + .9 - this.v.z : 0);
    L.yaw = this.v.yaw - (c.bearing + breath * .3) * B.DEG; L.pitch = c.pitch + this.kick * .4 + breath * .2; L.fov = c.fov; L.roll = bob * .6;
    if (this.camOverride) this.camOverride(L, dt);
    L.update();
  }
}
B.Site = Site;

// critters by schedule: [kind, { at (s), path, alt, orders, gait }]
function* critterScript(S, list) {
  const sorted = list.slice().sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  let t = 0;
  for (const [kind, o] of sorted) {
    const w = (o.at || 0) - t; if (w > 0) yield w; t = o.at || 0;
    S.pattern('critter', Object.assign({ kind }, o));
  }
}
})();
