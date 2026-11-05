// WP.Sim: one operation's run. Deterministic: fixed steps, its own seeded streams, no DOM, audio or rigs.
// Each step takes one InputFrame per player: { x, y, fire (held), grenade, reload, snap (presses this step) }.
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T, clamp = E.clamp;
const QCLS = ['soldier', 'vehicle', 'boat', 'air'];

class Sim {
  constructor(o) {
    this.o = o; this.opn = o.op; this.stage = WP.STAGES[o.op - 1];
    this.seed = (o.seed === undefined ? 1 : o.seed) >>> 0; this.R = WP.streams(this.seed);
    this.session = !!o.session; this.attract = !!o.attract;
    this.view = new WP.View(); this.t = 0; this.d = 0; this.speed = 0; this.part = 'A'; this.tB = 0;
    this.ents = []; this.byId = new Map(); this.nextId = 1; this.events = []; this.later = []; this.radioQ = [];
    this.diff = WP.diff(); this.perks = o.perks || WP.run.perks;
    this.players = o.players.map((p, i) => this.newPlayer(p, i, o.players.length));
    this.coop = 1 + .3 * (this.players.length - 1);
    this.rail = new WP.Rail(this.stage.rail);
    this.beats = this.stage.beats.map((b, i) => Object.assign({ id: 'b' + (i + 1) }, b, { fired: false, ids: [], done: false }));
    this.holds = (this.stage.holds || []).map(h => Object.assign({}, h, { state: 'wait', t: 0 }));
    const qm = T.quota * this.diff.quota * this.coop * (this.perks.commsDown && this.opn > 1 ? .8 : 1);
    this.quotaMax = {}; this.q = {};
    for (const k of QCLS) if (this.stage.quotas[k]) { this.quotaMax[k] = Math.max(1, Math.round(this.stage.quotas[k] * qm)); this.q[k] = this.quotaMax[k]; }
    this.objective = this.stage.objective ? { kind: this.stage.objective.kind, need: this.stage.objective.ids.length, have: 0 } : null;
    this.boss = null; this.bossSpawned = false; this.reinT = 2; this.cleared = false; this.clearT = 0; this.failed = false; this.done = null;
    this.spotted = 0; this.flare = 0; this.fury = 0; this.supplyT = 0; this.stats = { spawned: 0, escaped: 0, reinforce: 0 };
    const hn = this.stage.hostages ? (o.hostages === undefined ? 5 : o.hostages) : 0;
    this.host = { n: hn, saved: 0, lost: 0, list: [], pendingOut: 0 };
    this.cam = this.rail.at(0); this.view.begin(this.camNow());
    this.civHits = 0;
    for (const p of this.stage.props || []) this.addProp(p);
    if (this.stage.setup) this.stage.setup(this);
    this.ev('radio', { key: this.stage.id + '.go' });
  }
  // ------------------------------------------------------------------------------------------ players
  newPlayer(p, i, n) {
    const start = [[.42, .55], [.58, .55], [.30, .55], [.70, .55]][i] || [.5, .55];
    const mags = p.mags !== undefined ? p.mags : T.startMags;
    return { pid: p.pid === undefined ? i : p.pid, seat: i, name: p.name || WP.SEAT_NAMES[i], color: p.color || WP.SEAT[i], x: WP.W * start[0], y: WP.PLAY_H * start[1],
      damage: p.damage || 0, mag: Math.min(T.magSize, p.mag === undefined ? T.magSize : p.mag), spares: p.spares ? p.spares.slice() : Array(Math.max(0, mags - 1)).fill(T.magSize),
      grenades: p.grenades === undefined ? T.startGrenades : p.grenades, score: p.score || 0, streak: 0, streakT: 0, mult: 1, down: false, fury: 0,
      reload: 0, autoT: -1, bloom: 0, fireT: 0, prevFire: false, gcool: 0, dryT: 0, dropT: -99, refillT: 0, hurtT: 0, snap: null, snapCool: 0, grin: 0,
      stats: { shots: 0, hits: 0, kills: 0, heads: 0, inter: 0, civ: 0, soldiers: 0, vehicles: 0, hostagesEscorted: 0 }, opStart: null };
  }
  living() { return this.players.filter(p => !p.down); }
  maxMags() { return T.maxMags + (this.perks.supplies ? 2 : 0); }
  // ------------------------------------------------------------------------------------------ entities
  add(e) { e.id = this.nextId++; e.t = e.t || 0; e.st = e.st || 'enter'; this.ents.push(e); this.byId.set(e.id, e); return e; }
  get(id) { return this.byId.get(id); }
  remove(e) { e.gone = true; }
  ev(k, a = {}) { a.k = k; this.events.push(a); return a; }
  radio(key, vars) { this.ev('radio', { key, vars }); }
  tip(key) { this.ev('tip', { key }); }
  // a world point from the camera's frame now
  c2w(lx, dz) { return WP.camToWorld(this.cam, lx, dz); }
  w2c(x, y) { return WP.worldToCam(this.cam, x, y); }
  hw(dz) { return this.view.halfWidth(dz); }
  spawn(type, o = {}) {
    const Ty = WP.TYPES[type]; if (!Ty) throw new Error('unknown type ' + type);
    let lx = o.lx || 0, dz = o.dz === undefined ? 200 : o.dz;
    if (o.side) lx = (o.side === 'L' ? -1 : 1) * (this.hw(dz) + (o.off === undefined ? 30 : o.off));
    let x, y; if (o.x !== undefined) { x = o.x; y = o.y; [lx, dz] = this.w2c(x, y); } else [x, y] = this.c2w(lx, dz);
    const hpm = Ty.kind === 'boss' || Ty.kind === 'civilian' || Ty.kind === 'hostage' || Ty.kind === 'animal' || Ty.kind === 'prop' || Ty.kind === 'pickup' ? 1 : T.enemyHp;
    const e = this.add({ type, T: Ty, kind: Ty.kind, x, y, z: o.z || 0, vx: 0, vy: 0, vz: 0, facing: Math.PI / 2, hp: Ty.hp * hpm, max: Ty.hp * hpm,
      lx, dz, lz: o.z || 0, stun: 0, hurtT: 0, cam: o.anchor === 'cam', beh: o.path || o.beh || Ty.beh, o, beat: o.beat || null, quota: Ty.quota || null, pose: 'stand', side: lx < 0 ? -1 : 1 });
    if (o.carry) e.carry = o.carry;
    if (Ty.init) Ty.init(this, e);
    if (Ty.kind !== 'projectile' && Ty.kind !== 'pickup') { this.stats.spawned++; this.ev('spawn', { id: e.id, type }); }
    return e;
  }
  addProp(p) {
    const [kind, pid, x, y, opts] = p; const Ty = WP.TYPES[kind]; if (!Ty) throw new Error('unknown prop ' + kind);
    const e = this.add({ type: kind, T: Ty, kind: 'prop', x: this.stage.ox + x, y: this.stage.oy + y, z: (opts && opts.z) || 0, hp: Ty.hp, max: Ty.hp, pid, o: opts || {}, facing: (opts && opts.facing) || 0, st: 'idle' });
    if (Ty.init) Ty.init(this, e);
    return e;
  }
  prop(pid) { return this.ents.find(e => e.pid === pid && !e.gone); }
  // where an entity is now in world space (anchored ones follow the camera)
  place(e) { if (e.cam) { const w = this.c2w(e.lx, e.dz); e.x = w[0]; e.y = w[1]; if (e.zr) e.z = this.cam.h + e.lz; } }
  // ------------------------------------------------------------------------------------------ camera
  camNow() {
    if (this.part === 'B') return this.stage.partB.cam(this.tB, this);
    const c = this.rail.at(this.d), s = this.stage;
    if (s.river) { c.h += Math.sin(this.t * 2.2) * 1.2; c.pitch += Math.sin(this.t * 2.2 + 1) * .5; }
    else if (this.speed > 2) c.h += Math.sin(this.t * 10) * .4 * Math.min(1, this.speed / 10);
    return c;
  }
  // ------------------------------------------------------------------------------------------ the step
  step(dt, frames) {
    this.events.length = 0;
    if (this.done) return;
    this.t += dt;
    // timed spawns and calls
    for (let i = this.later.length - 1; i >= 0; i--) { const l = this.later[i]; if ((l.t -= dt) <= 0) { this.later.splice(i, 1); l.fn(); } }
    this.railStep(dt);
    this.cam = this.camNow(); this.view.begin(this.cam);
    if (this.spotted > 0) this.spotted -= dt; if (this.flare > 0) this.flare -= dt;
    if (this.stage.update && this.part === 'A') this.stage.update(this, dt);
    // players
    for (const p of this.players) this.playerStep(p, frames && frames[p.seat] || null, dt);
    // entities
    for (const e of this.ents) {
      if (e.gone) continue;
      this.place(e); e.t += dt;
      if (e.stun > 0) e.stun -= dt; if (e.hurtT > 0) e.hurtT -= dt;
      if (e.dead) { e.deadT = (e.deadT || 0) + dt; if (e.T.fall) this.fallStep(e, dt); if (e.deadT > (e.T.fadeT || 2.5)) e.gone = true; continue; }
      const B = WP.BEHAV[e.beh]; if (B) B(this, e, dt);
      if (e.tele) this.teleStep(e, dt);
      if (!e.cam && e.kind !== 'prop' && e.kind !== 'pickup' && e.kind !== 'projectile' && e.kind !== 'boss') this.escapeCheck(e, dt);
    }
    if (this.ents.some(e => e.gone)) { this.ents = this.ents.filter(e => { if (e.gone) this.byId.delete(e.id); return !e.gone; }); }
    this.directorStep(dt);
    // beats resolve when all their units are gone or dead
    for (const b of this.beats) if (b.fired && !b.done && b.pending <= 0 && b.ids.every(id => { const e = this.get(id); return !e || e.dead || e.escaped; })) b.done = true;
    // clear and fail
    if (this.cleared) { this.clearT += dt; if (this.clearT > 3) this.done = 'clear'; }
    else if (!this.attract && this.players.length && this.players.every(p => p.down)) { this.failed = true; this.clearT += dt; if (this.clearT > 1.6) this.done = 'fail'; }
  }
  fallStep(e, dt) { if (e.z > 0) { e.vz -= 500 * dt; e.z = Math.max(0, e.z + e.vz * dt); } }
  escapeCheck(e, dt) {
    const [lx, dz] = this.w2c(e.x, e.y); e.lx = lx; e.dz = dz;
    const out = dz < 12 || Math.abs(lx) > this.hw(Math.max(dz, 20)) + 70;
    if (out && e.t > 1.5) { e.outT = (e.outT || 0) + dt; if (e.outT > (e.kind === 'civilian' || e.kind === 'animal' || e.kind === 'hostage' ? .3 : 2)) { e.gone = true; e.escaped = true; if (e.quota) this.stats.escaped++; } } else e.outT = 0;
  }
  // ------------------------------------------------------------------------------------------ the rail, beats and holds
  railStep(dt) {
    const s = this.stage;
    if (this.part === 'B') { this.tB += dt; this.beatStep(this.tB); this.holdStepB(dt); return; }
    let target = s.speed * T.railSpeed * (this.session ? 1.3 : 1), hold = null;
    for (const h of this.holds) {
      if (h.state === 'done') continue;
      if (this.d >= h.d - .01) { hold = h; break; }
      if (h.d - this.d < Math.max(8, this.speed * .5)) { target = Math.min(target, Math.max(2, (h.d - this.d) * 2.2)); }
      break;
    }
    if (hold) {
      target = 0; this.d = hold.d; if (hold.state === 'wait') { hold.state = 'on'; hold.t = 0; this.ev('hold', { d: hold.d }); }
      hold.t += dt;
      const max = hold.max ? hold.max * (this.session ? .6 : 1) : 0;
      if (this.holdMet(hold) || (max && hold.t >= max)) { hold.state = 'done'; this.ev('release', { d: hold.d }); }
      if (hold.slow) target = hold.slow;
    }
    this.speed = E.approach ? E.approach(this.speed, target, (target < this.speed ? 1 / .6 : 1 / .8) * Math.max(8, s.speed) * dt) : target;
    if (!hold || hold.slow) this.d = Math.min(this.rail.end, this.d + this.speed * dt);
    this.beatStep(this.d);
  }
  beatStep(at) {
    for (const b of this.beats) {
      if (b.fired) continue;
      if (b.after) { const a = this.beats.find(x => x.id === b.after); if (!a || !a.done) continue; b.wait = (b.wait || 0); if ((b.wait += 1 / 120) < (b.delay || 0)) continue; }
      else if (b.t !== undefined ? at < b.t : at < b.at) continue;
      this.fireBeat(b);
    }
  }
  fireBeat(b) {
    b.fired = true; b.pending = 0;
    if (b.radio) this.radio(b.radio);
    if (b.tip) this.tip(b.tip);
    if (b.fn) b.fn(this, b);
    for (const sp of b.spawn || []) this.spawnGroup(sp[0], Object.assign({ beat: b.id }, sp[1] || {}), b);
  }
  spawnGroup(type, o, b) {
    const Ty = WP.TYPES[type], scale = Ty && (Ty.kind === 'infantry') && !o.exact ? T.spawnDensity * (this.attract ? 1 : this.coop) : 1;
    const n = Math.max(o.n === 0 ? 0 : 1, Math.round((o.n || 1) * scale));
    for (let i = 0; i < n; i++) {
      const oi = Object.assign({}, o); if (n > 1 && o.spread) oi.lx = (o.lx || 0) + (i - (n - 1) / 2) * o.spread;
      if (o.dzs) oi.dz = o.dzs[i % o.dzs.length]; if (o.lxs) oi.lx = o.lxs[i % o.lxs.length]; if (o.covers) oi.cover = o.covers[i % o.covers.length];
      if (o.sides) oi.side = o.sides[i % o.sides.length];
      const delay = (o.delay || 0) + i * (o.gap || 0);
      const go = () => { const e = this.spawn(type, oi); if (b) b.ids.push(e.id); if (b) b.pending--; };
      if (b) b.pending++;
      if (delay > 0) this.later.push({ t: delay, fn: go }); else go();
    }
  }
  holdMet(h) {
    const u = h.until || '';
    if (u.startsWith('beat:')) { const b = this.beats.find(x => x.id === u.slice(5)); return b && b.done; }
    if (u === 'air' || u === 'vehicle' || u === 'boat') return !this.ents.some(e => !e.dead && e.T.quota === u && !e.escaped) && (this.t > h.t0 || true) && h.t > 1.5;
    if (u === 'escort') return this.host.list.length > 0 && this.host.list.every(e => e.rescued || e.lost) && this.host.pendingOut <= 0 || (this.host.n === 0 && h.t > 15);
    if (u === 'quota') return this.quotaMet() && !this.ents.some(e => !e.dead && e.kind === 'infantry' && e.beh === 'chase');
    if (u === 'boss') { this.bossHold(h); return false; }
    if (u === 'objective') return this.objective && this.objective.have >= this.objective.need;
    return false;
  }
  quotaMet() { return QCLS.every(k => !this.q[k] || this.q[k] <= 0); }
  bossHold(h) {
    if (this.bossSpawned) return;
    if (!this.quotaMet()) {
      if ((this.reinT -= 1 / 120) <= 0) { this.reinforce(); this.reinT = 3 + this.R.ai() * 2; }
      return;
    }
    const alive = this.ents.filter(e => !e.dead && (e.kind === 'infantry' || e.kind === 'vehicle')).length;
    if (alive > 3 && h.t < 60) return;
    this.startBoss();
  }
  reinforce() {
    const live = this.ents.filter(e => !e.dead && e.quota).length; if (live > 7) return;
    if (!this.stats.reinforce++) this.radio('more');
    const miss = QCLS.filter(k => this.q[k] > 0), r = this.R.ai();
    const k = miss.includes('air') && r < .5 ? 'air' : miss.includes('vehicle') && r < .6 ? 'vehicle' : miss.includes('boat') && r < .6 ? 'boat' : miss.includes('soldier') ? 'soldier' : miss[0];
    const side = this.R.ai() < .5 ? 'L' : 'R';
    if (k === 'air') this.spawn('vulture', { anchor: 'cam', lx: 0, dz: 700, z: 80 });
    else if (k === 'vehicle') this.spawn('jeep', { side, dz: 180 + this.R.ai() * 120, path: 'vcross', stop: true });
    else if (k === 'boat') this.spawn('skiff', { lx: side === 'L' ? -60 : 60, dz: 420, path: 'boat' });
    else for (let i = 0; i < 3; i++) this.later.push({ t: i * .6, fn: () => this.spawn(this.R.ai() < .25 ? 'grenadier' : 'rifleman', { side, dz: 140 + this.R.ai() * 160, path: 'cross', stops: 1 }) });
  }
  startBoss() {
    this.bossSpawned = true; const B = WP.BOSSES[this.stage.boss];
    this.boss = B.spawn(this); this.radio('boss.' + this.stage.boss); this.ev('boss', { id: this.boss.id, name: B.name });
  }
  holdStepB(dt) {
    const s = this.stage.partB;
    if (!this.bossSpawned && this.tB >= s.bossAt) this.startBoss();
  }
  startPartB() {
    this.part = 'B'; this.tB = 0; this.beats = this.stage.partB.beats.map((b, i) => Object.assign({ id: 'B' + (i + 1) }, b, { fired: false, ids: [], done: false }));
    for (const e of this.ents) if (!e.dead && e.kind !== 'hostage') e.gone = true;
    this.ev('cut', { part: 'B' });
  }
  // ------------------------------------------------------------------------------------------ the director: supplies, DRY, part changes
  directorStep(dt) {
    this.supplyT -= dt;
    const live = this.living();
    if (live.length && this.supplyT <= 0 && !this.attract) {
      const low = live.find(p => p.mag + p.spares.length * T.magSize < T.magSize && p.grenades === 0);
      if (low) { this.supplyT = 20; this.spawn('chute', { lx: (this.R.loot() - .5) * 80, dz: 160, z: 150, carry: 'ammo', beh: 'chute' }); }
    }
    if (this.stage.partB && this.part === 'A') { const h = this.holds[this.holds.length - 1]; if (h && h.state === 'done') this.startPartB(); }
  }
  // ------------------------------------------------------------------------------------------ hit shapes
  // every hittable thing as screen shapes with a depth: { e, part, d, c: [x, y, r] } or { e, part, d, r: [x0, y0, x1, y1] }
  shapesOf(e, out) {
    if (e.gone || e.hidden || e.kind === 'scenery' || (e.dead && !(e.T.wreck && e.deadT < 6))) return;
    const v = this.view;
    if (e.T.shapes) return e.T.shapes(this, e, out);
    if (e.kind === 'infantry' || e.kind === 'civilian' || e.kind === 'hostage') return this.humanShapes(e, out);
    const p = v.project(e.x, e.y, e.z + (e.T.cz || 0)); if (!p) return;
    const d = v.depth(e.x, e.y), rr = e.T.r || 4, min = e.kind === 'projectile' ? 5 : e.kind === 'pickup' ? 6 : 3;
    if (e.T.box) { const b = this.boxRect(e.x, e.y, e.z, e.T.box, e.facing); if (b) out.push({ e, part: 'hull', d, r: b, cover: e.T.cover }); return; }
    out.push({ e, part: 'body', d, c: [p[0], p[1], Math.max(min, rr * p[2])] });
  }
  humanShapes(e, out) {
    const v = this.view, h = e.T.h * (e.pose === 'crouch' || e.pose === 'kneel' ? .82 : 1), z = e.z;
    const ph = v.project(e.x, e.y, z + .87 * h); if (!ph) return; const k = ph[2], d = v.depth(e.x, e.y);
    const pb0 = v.project(e.x, e.y, z + .45 * h), pb1 = v.project(e.x, e.y, z + .8 * h), pl0 = v.project(e.x, e.y, z);
    if (!pb0 || !pb1 || !pl0) return;
    let clipY = Infinity, clip = null;
    if (e.coverTop !== undefined) { const c = v.project(e.x, e.y, e.coverTop); if (c) clipY = c[1]; }
    if (e.clip) clip = this.clipRect(e);
    const add = (part, s) => {
      if (s.r) { s.r[3] = Math.min(s.r[3], clipY); if (clip) s.r = [Math.max(s.r[0], clip[0]), Math.max(s.r[1], clip[1]), Math.min(s.r[2], clip[2]), Math.min(s.r[3], clip[3])]; if (s.r[3] - s.r[1] < 1 || s.r[2] - s.r[0] < 1) return; }
      if (s.c) { if (s.c[1] > clipY + s.c[2] * .5) return; if (clip && !WP.inRect(s.c, clip)) return; }
      out.push(Object.assign({ e, part, d }, s));
    };
    const hw = Math.max(2, .17 * h * k), lw = Math.max(2, .12 * h * k), bh0 = Math.min(pb1[1], pb0[1] - 4);
    add('head', { c: [ph[0], ph[1], Math.max(2, .095 * h * k)] });
    add('body', { r: [pb1[0] - hw, bh0 < pb1[1] - 8 ? bh0 : pb1[1], pb1[0] + hw, Math.max(pb0[1], pb1[1] + 8)] });
    add('legs', { r: [pl0[0] - lw, pb0[1], pl0[0] + lw, pl0[1]] });
    if (e.chute) { const pc = v.project(e.x, e.y, z + h + 14); if (pc) add('chute', { c: [pc[0], pc[1], Math.max(4, 10 * k)] }); }
  }
  clipRect(e) {
    const c = e.clip, v = this.view, a = v.project(c[0], e.y - 3, c[2]), b = v.project(c[1], e.y - 3, c[3]);
    return a && b ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] : null;
  }
  // a box [len, wid, ht] at (x, y, z) turned by facing -> its screen rectangle
  boxRect(x, y, z, box, facing) {
    const v = this.view, c = Math.cos(facing), s = Math.sin(facing), L = box[0] / 2, Wd = box[1] / 2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (const a of [-L, L]) for (const b of [-Wd, Wd]) for (const h of [0, box[2]]) {
      const p = v.project(x + c * a - s * b, y + s * a + c * b, z + h); if (!p) continue; n++;
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    return n >= 4 ? [x0, y0, x1, y1] : null;
  }
  // a weak point at a local offset [forward, right, up] of an entity
  wpWorld(e, off) { const c = Math.cos(e.facing), s = Math.sin(e.facing); return [e.x + c * off[0] - s * off[1], e.y + s * off[0] + c * off[1], e.z + off[2]]; }
  allShapes() { const out = []; for (const e of this.ents) this.shapesOf(e, out); return out; }
  pick(sx, sy, filter) {
    let best = null; const out = [];
    for (const e of this.ents) { if (filter && !filter(e)) continue; this.shapesOf(e, out); }
    for (const s of out) { if (!(s.c ? WP.d2(sx, sy, s.c[0], s.c[1]) <= s.c[2] * s.c[2] : WP.inRect([sx, sy], s.r))) continue; if (!best || s.d < best.d || (s.d === best.d && s.part === 'head')) best = s; }
    return best;
  }
  // ------------------------------------------------------------------------------------------ the player's step: aim, weapon, grenades
  playerStep(p, f, dt) {
    if (p.hurtT > 0) p.hurtT -= dt; if (p.grin > 0) p.grin -= dt;
    if (p.down) { p.prevFire = false; return; }
    if (f) { p.x = clamp(f.x, 0, WP.W - 1); p.y = clamp(f.y, 0, WP.PLAY_H - 1); }
    if (p.snap) { p.snap.t -= dt; const u = clamp(1 - p.snap.t / .08, 0, 1); p.x = WP.lerp(p.snap.x0, p.snap.x, u); p.y = WP.lerp(p.snap.y0, p.snap.y, u); if (p.snap.t <= 0) p.snap = null; }
    if (p.snapCool > 0) p.snapCool -= dt; if (p.gcool > 0) p.gcool -= dt;
    p.bloom = Math.max(0, p.bloom - T.bloomRecover * dt);
    if (p.fury > 0) p.fury -= dt;
    if ((p.streakT += dt) > 4 && p.streak) { p.streak = 0; p.mult = 1; }
    // reload
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) this.finishReload(p); }
    if (p.autoT >= 0) { p.autoT -= dt; if (p.autoT < 0) this.startReload(p); }
    if (f && f.reload) this.startReload(p);
    // fire
    const fire = f && f.fire;
    if (fire) {
      if (!p.prevFire) p.fireT = 0;
      const rate = T.fireRate * (p.fury > 0 ? 2 : 1);
      p.fireT -= dt;
      while (p.fireT <= 0) { p.fireT += 1 / rate; this.shoot(p); }
    }
    p.prevFire = !!fire;
    if (f && f.grenade) this.throwGrenade(p);
    if (f && f.snap && p.snapCool <= 0) this.snapTo(p, f);
    this.dryStep(p, dt);
  }
  infiniteAmmo(p) { return p.fury > 0 || WP.CHEATS.ammo && p.seat === 0 || this.attract; }
  startReload(p) {
    if (p.reload > 0 || p.mag >= T.magSize || !p.spares.length || Math.max(...p.spares) <= p.mag) { p.autoT = -1; return; }
    p.autoT = -1; p.reload = T.reloadTime; this.ev('reload', { pid: p.pid });
  }
  finishReload(p) {
    p.reload = 0; if (!p.spares.length) return;
    let bi = 0; for (let i = 1; i < p.spares.length; i++) if (p.spares[i] > p.spares[bi]) bi = i;
    const next = p.spares.splice(bi, 1)[0]; if (p.mag > 0) p.spares.push(p.mag); p.mag = next; this.ev('reloaded', { pid: p.pid });
  }
  shoot(p) {
    if (p.reload > 0) return;
    if (p.mag <= 0 && !this.infiniteAmmo(p)) { if (!p.clickT || this.t - p.clickT > .25) { p.clickT = this.t; this.ev('dry', { pid: p.pid }); } if (p.autoT < 0 && p.spares.length) p.autoT = .12; return; }
    if (!this.infiniteAmmo(p)) { p.mag--; if (p.mag === 0 && p.spares.length) p.autoT = .12; }
    p.stats.shots++;
    const r = (T.spreadBase + Math.min(T.bloomMax, p.bloom)) * Math.sqrt(this.R.sim()), a = this.R.sim() * Math.PI * 2;
    p.bloom = Math.min(T.bloomMax, p.bloom + T.bloomPerShot);
    const sx = p.x + Math.cos(a) * r, sy = p.y + Math.sin(a) * r;
    this.resolveShot(p, sx, sy);
  }
  resolveShot(p, sx, sy) {
    const s = this.pick(sx, sy);
    const shot = this.ev('shot', { pid: p.pid, x: sx, y: sy, fury: p.fury > 0 });
    if (!s) { const f = this.view.toFloor(sx, sy); if (f) { shot.fx = f[0]; shot.fy = f[1]; shot.mat = this.stage.water && this.stage.water(f[0], f[1]) ? 'water' : 'dirt'; } this.panicNear(f); return; }
    const e = s.e; shot.id = e.id; shot.part = s.part;
    const pt = this.hitPoint(e, s); shot.wx = pt[0]; shot.wy = pt[1]; shot.wz = pt[2];
    this.panicNear(pt);
    if (s.cover && e.kind === 'prop') { shot.mat = e.T.mat || 'dirt'; this.damageProp(e, T.bulletDmg * (p.fury > 0 ? 1.5 : 1), p); return; }
    this.hitEntity(p, e, s.part, T.bulletDmg * (p.fury > 0 ? 1.5 : 1), shot);
  }
  hitPoint(e, s) {
    const f = this.view.toFloor(s.c ? s.c[0] : (s.r[0] + s.r[2]) / 2, s.c ? s.c[1] : (s.r[1] + s.r[3]) / 2);
    const P = this.view.project(e.x, e.y, e.z); const zz = P && s ? Math.max(0, (P[1] - (s.c ? s.c[1] : (s.r[1] + s.r[3]) / 2)) / P[2]) : 0;
    return [e.x, e.y, e.z + zz];
  }
  panicNear(pt) { if (!pt) return; for (const e of this.ents) if (e.kind === 'civilian' && !e.dead && WP.d2(e.x, e.y, pt[0], pt[1]) < 1600) e.panic = 3; }
  // a hit from a player's bullet on an entity part
  hitEntity(p, e, part, dmg, shot) {
    const K = e.kind;
    if (K === 'civilian' || K === 'hostage') return this.hitFriendly(p, e, K === 'hostage' ? 'hostage' : 'civ');
    if (K === 'animal') { p.stats.hits++; return WP.animalHit(this, e, p); }
    if (K === 'pickup') { p.stats.hits++; return this.collect(p, e); }
    if (K === 'projectile') { if (e.T.shootable === false) return; p.stats.hits++; if ((e.hp -= 1) <= 0) this.intercept(p, e); return; }
    if (K === 'prop') { p.stats.hits++; return this.damageProp(e, dmg, p); }
    if (K === 'boss') { p.stats.hits++; return WP.bossHit(this, e, part, dmg, p, shot); }
    p.stats.hits++;
    if (K === 'vehicle' && e.tele && e.tele.kind !== 'whistle') e.tele.t = Math.min(e.tele.max, e.tele.t + .04);
    if (part === 'chute') { e.chute = false; e.vz = -160; e.chuteShot = true; e.lastHit = p.pid; this.ev('chute', { id: e.id }); return; }
    if (part === 'gunner' && e.gunner) { e.gunner.hp -= dmg; if (e.gunner.hp <= 0 && !e.gunner.dead) { e.gunner.dead = true; e.tele = null; this.addScore(p, 100, e); this.ev('kill', { id: e.id, part: 'gunner', by: p.pid, type: 'rifleman' }); } return; }
    if (part && part.startsWith('wp:')) { const w = e.wps && e.wps[part.slice(3)]; if (w && !w.dead) { w.hp -= dmg; this.ev('hitwp', { id: e.id, part }); if (w.hp <= 0) { w.dead = true; this.ev('wpdown', { id: e.id, part }); if (w.onDie) w.onDie(this, e, p); } } return; }
    const head = part === 'head', mult = head ? (e.T.headMult || 2) : 1;
    if (WP.CHEATS.oneHit && p.seat === 0) dmg = 999;
    this.damage(e, dmg * mult, p, part);
  }
  // damage to any enemy (bullets, blasts): returns true when it died
  damage(e, dmg, p, part) {
    if (e.dead) return false;
    e.hp -= dmg;
    if (e.hp > 0) { if (e.T.hurtable !== false && e.kind === 'infantry') { e.hurtT = .25; if (e.tele && e.tele.kind !== 'whistle') e.tele.t = Math.max(0, e.tele.t - .25); } this.ev('hurt', { id: e.id, part }); return false; }
    this.kill(e, p, part);
    return true;
  }
  kill(e, p, part, how) {
    if (e.dead) return; e.dead = true; e.deadT = 0; e.tele = null; e.killedBy = p ? p.pid : -1; e.headshot = part === 'head';
    const T2 = e.T; let pts = T2.score || 0;
    if (e.chute && T2.airBonus) pts += T2.airBonus;
    if (part === 'head') pts = Math.round(pts * 1.5);
    if (p) { p.stats.kills++; if (part === 'head') { p.stats.heads++; } if (T2.quota === 'soldier') p.stats.soldiers++; else if (T2.quota) p.stats.vehicles++; this.addScore(p, pts, e); this.bumpStreak(p); }
    if (e.quota && this.q[e.quota] !== undefined) this.q[e.quota] = Math.max(0, this.q[e.quota] - 1);
    if (e.carry && T2.kind === 'infantry') this.drop(e.carry, e.x, e.y, e.z + 20);
    if (T2.onDie) T2.onDie(this, e, p);
    if (e.chute) { e.chute = false; }
    if (e.z > 1 && e.kind === 'infantry') e.vz = 0;
    this.ev('kill', { id: e.id, by: p ? p.pid : -1, part, type: e.type, how: how || 'shot', x: e.x, y: e.y, z: e.z });
  }
  addScore(p, pts, e) { if (!p || !pts) return; const v = Math.round(pts * p.mult); p.score += v; this.ev('score', { pid: p.pid, v, x: e ? e.x : 0, y: e ? e.y : 0, z: e ? (e.z || 0) + ((e.T && e.T.h) || 20) + 6 : 0 }); }
  bumpStreak(p) {
    p.streak++; p.streakT = 0; const m = Math.min(4, 1 + Math.floor(p.streak / 8));
    if (m > p.mult) { p.mult = m; p.grin = 1.5; this.ev('mult', { pid: p.pid, m }); }
  }
  hitFriendly(p, e, kind) {
    if (this.attract) return;
    p.streak = 0; p.mult = 1; p.stats.civ++; this.civHits++;
    if (kind === 'hostage') { this.hurtPlayer(p, 10, null, 'friendly'); p.score = Math.max(0, p.score - 2000); e.hp -= 1; this.ev('friendly', { pid: p.pid, id: e.id, kind }); if (e.hp <= 0) WP.hostageLost(this, e); return; }
    this.hurtPlayer(p, T.civilianDamage, null, 'friendly'); p.score = Math.max(0, p.score - 1000);
    e.dead = true; e.deadT = 0; e.wounded = true; this.ev('friendly', { pid: p.pid, id: e.id, kind });
  }
  intercept(p, e) {
    e.dead = true; e.deadT = 0; e.gone = true; p.stats.inter++;
    this.addScore(p, e.T.score || 50, e); this.ev('intercept', { pid: p.pid, id: e.id, type: e.type, x: e.x, y: e.y, z: e.z });
    if (e.T.onIntercept) e.T.onIntercept(this, e, p);
  }
  // ------------------------------------------------------------------------------------------ props
  damageProp(e, dmg, p) {
    if (e.dead || e.T.hp === Infinity) return;
    e.hp -= dmg; this.ev('prophit', { id: e.id });
    if (e.hp <= 0) { e.dead = true; e.deadT = 0; if (e.T.onBreak) e.T.onBreak(this, e, p); this.ev('break', { id: e.id, type: e.type, x: e.x, y: e.y, z: e.z }); if (e.T.keep) { e.deadT = -1e9; } }
  }
  // ------------------------------------------------------------------------------------------ explosions
  explode(x, y, z, R, dmg, p, o = {}) {
    this.ev('explode', { x, y, z, r: R, big: R > 70 });
    let kills = 0;
    for (const e of this.ents) {
      if (e.dead || e.gone || e === o.src) continue;
      const dd = Math.hypot(e.x - x, e.y - y, (e.z - z) * .7); if (dd > R * 1.5) continue;
      const inside = dd <= R, d = dmg * (1 - .5 * clamp(dd / R, 0, 1));
      if (e.kind === 'infantry') { if (!inside) { e.stun = 1; continue; } if (e.T.brute) { this.damage(e, d, p, 'blast'); } else { e.blast = [e.x - x, e.y - y]; this.kill(e, p, 'blast', 'blast'); kills++; } }
      else if (e.kind === 'vehicle' || e.kind === 'boss') { if (inside) { if (e.kind === 'boss') WP.bossBlast(this, e, d, p); else { this.damage(e, d, p, 'blast'); if (e.gunner && !e.gunner.dead) { e.gunner.dead = true; e.tele = null; } } } }
      else if ((e.kind === 'civilian' || e.kind === 'hostage') && inside && p && !o.enemy) this.hitFriendly(p, e, e.kind === 'hostage' ? 'hostage' : 'civ');
      else if (e.kind === 'animal' && inside) WP.animalHit(this, e, p);
      else if (e.kind === 'prop' && inside && !e.dead) this.damageProp(e, o.propDmg || d * (e.T.blastMul || 1), p);
      else if (e.kind === 'projectile' && inside && e.T.shootable !== false && !e.friendly && p) this.intercept(p, e);
    }
    if (kills >= 4 && p) { this.addScore(p, 1000, { x, y, z }); this.ev('chain', { pid: p.pid, x, y, z }); }
    return kills;
  }
  throwGrenade(p) {
    if (p.gcool > 0) return;
    if (p.grenades <= 0 && !(WP.CHEATS.grenades && p.seat === 0) && !this.attract) { this.ev('dry', { pid: p.pid }); return; }
    if (!(WP.CHEATS.grenades && p.seat === 0) && !this.attract) p.grenades--;
    p.gcool = .5;
    const s = this.pick(p.x, p.y, e => e.kind !== 'pickup' && e.kind !== 'projectile');
    let tgt; const v = this.view;
    if (s && v.depth(s.e.x, s.e.y) < T.grenadeRange) { const pt = this.hitPoint(s.e, s); tgt = pt; }
    else { const f = v.toFloor(p.x, p.y); if (f && v.depth(f[0], f[1]) <= T.grenadeRange) tgt = [f[0], f[1], 0]; else tgt = v.rayAt(p.x, p.y, T.grenadeRange); }
    const [tlx, tdz] = this.w2c(tgt[0], tgt[1]), fl = .55 + .0015 * Math.max(0, tdz);
    const g = this.spawn('pgrenade', { lx: (p.seat % 2 ? 12 : -12), dz: 14, z: this.cam.h - 6, anchor: 'none' });
    g.from = [g.x, g.y, this.cam.h - 6]; g.to = tgt; g.fl = fl; g.owner = p.pid; g.friendly = true; g.tl = [tlx, tdz];
    this.ev('throw', { pid: p.pid });
  }
  snapTo(p, f) {
    const tgt = WP.threatPoint(this, p, f); if (!tgt) return;
    p.snap = { x0: p.x, y0: p.y, x: tgt[0], y: tgt[1], t: .08 }; p.snapCool = .2;
  }
  // ------------------------------------------------------------------------------------------ damage to players
  hurtPlayer(p, amt, from, how) {
    if (p.down || this.attract) return;
    if (WP.CHEATS.god && p.seat === 0) return;
    if (how !== 'friendly') amt *= T.enemyDamage * this.diff.dmg;
    p.damage = Math.min(100, p.damage + amt); p.hurtT = .4; p.streak = 0; p.mult = 1;
    this.ev('damage', { pid: p.pid, amt, from: from ? from.id : 0, side: from ? Math.sign(this.w2c(from.x, from.y)[0]) : 0 });
    if (p.damage >= 100) this.down(p);
  }
  down(p) { p.down = true; p.reload = 0; this.ev('down', { pid: p.pid }); }
  heal(p, amt) { p.damage = Math.max(0, p.damage - amt); }
  dryStep(p, dt) {
    const dry = p.mag <= 0 && !p.spares.length && p.grenades <= 0 && p.reload <= 0 && !this.infiniteAmmo(p);
    if (!dry) { p.dryT = 0; return; }
    p.dryT += dt;
    const rule = this.diff.dry;
    if (rule === 'down' && !this.session) { if (p.dryT > .5) this.down(p); return; }
    if (rule === 'refill' && p.dryT > 3 && p.refillT <= 0) { p.mag = 15; p.refillT = 1; this.ev('refill', { pid: p.pid }); }
    if (p.refillT > 0) p.refillT -= dt;
    if (this.t - p.dropT > 30 && p.dryT > .3) {
      p.dropT = this.t; const c = this.spawn('chute', { lx: (p.x - WP.W / 2) * .5, dz: 150, z: 150, beh: 'chute' }); c.emergency = p.pid;
      this.radio('resupply');
    }
  }
  // ------------------------------------------------------------------------------------------ pickups
  drop(kind, x, y, z) {
    const e = this.spawn('pickup', { x, y, z: z || 10 }); e.pk = kind; e.vz = 90; e.life = 6; e.bounces = 0; this.ev('drop', { id: e.id, pk: kind }); return e;
  }
  roll(table) { // weighted pick from the loot stream
    let sum = 0; for (const [, w] of table) sum += w; let r = this.R.loot() * sum;
    for (const [k, w] of table) { if ((r -= w) <= 0) return k; } return table[0][0];
  }
  // the supply director's drop from a crate
  crateDrop(kind) {
    const live = this.living(), lowest = live.length ? Math.min(...live.map(p => p.mag + p.spares.length * T.magSize)) : 99, gren = live.some(p => p.grenades === 0), hurt = live.some(p => p.damage > 60);
    const ammo = kind === 'ammo';
    if (!ammo && this.R.loot() > .6 * T.dropChance * this.diff.drop) return null;
    const t = ammo ? [['mag', 50], ['ammo', 20], ['grenade', 20], ['gbox', 10]] : [['mag', 35], ['grenade', 20], ['ration', 18], ['medkit', 4 * (this.perks.village ? 2 : 1)], ['fang', 3], ['intel', 2]];
    for (const e of t) { if (lowest < 60 && (e[0] === 'mag' || e[0] === 'ammo')) e[1] *= 3; if (gren && (e[0] === 'grenade' || e[0] === 'gbox')) e[1] *= 2; if (hurt && (e[0] === 'ration' || e[0] === 'medkit')) e[1] *= 2; }
    return this.roll(t);
  }
  collect(p, e) {
    if (e.dead) return; e.dead = true; e.gone = true; const k = e.pk, mm = this.maxMags();
    const addMag = () => { if (p.spares.length < mm) p.spares.push(T.magSize); else this.addScore(p, 300, e); };
    if (k === 'mag') addMag();
    else if (k === 'ammo') { addMag(); addMag(); addMag(); }
    else if (k === 'grenade') p.grenades = Math.min(T.maxGrenades, p.grenades + 1);
    else if (k === 'gbox') p.grenades = Math.min(T.maxGrenades, p.grenades + 3);
    else if (k === 'ration') this.heal(p, 15);
    else if (k === 'medkit') this.heal(p, 35);
    else if (k === 'fury') { p.fury = T.furySeconds; this.tip('tip.fury'); }
    else if (k === 'dynamite') WP.dynamite(this, p);
    else if (k === 'flare') { this.flare = 12; }
    else if (k === 'intel') this.addScore(p, 1500, e);
    else if (k === 'fang') this.addScore(p, 500, e);
    if (p.mag === 0 && p.spares.length && p.reload <= 0) p.autoT = .05;
    this.ev('pickup', { pid: p.pid, id: e.id, pk: k, x: e.x, y: e.y, z: e.z });
  }
  // ------------------------------------------------------------------------------------------ enemy telegraphs and fire
  telegraph(e, kind, secs, fire) {
    if (WP.CHEATS.holdFire) return false;
    const live = this.living(); if (!live.length && !this.attract) return false;
    const tgt = live.length ? live[Math.floor(this.R.ai() * live.length)] : this.players[0];
    const t = secs * T.telegraph * this.diff.tele;
    e.tele = { kind, t, max: t, pid: tgt ? tgt.pid : 0, fire };
    this.ev('telegraph', { id: e.id, kind, t });
    return true;
  }
  teleStep(e, dt) {
    const tl = e.tele; if (e.stun > 0 || e.hurtT > 0) { if (e.hurtT > 0 && tl.kind === 'ring') tl.t = Math.min(tl.max, tl.t + dt); return; }
    tl.t -= dt; if (tl.t > 0) return;
    e.tele = null; tl.fire(this, e, tl);
  }
  // hitscan rounds at a player (called by telegraph fire functions)
  burst(e, pid, n, acc, dmg, gap = .1) {
    for (let i = 0; i < n; i++) this.later.push({ t: i * gap, fn: () => {
      if (e.dead || (e.gunner && e.gunner.dead) || e.stun > 0) return;
      const p = this.players.find(q => q.pid === pid); const dz = Math.max(1, this.w2c(e.x, e.y)[1]);
      const depthF = dz <= 150 ? 1 : dz >= 500 ? .55 : 1 - .45 * (dz - 150) / 350;
      const chance = acc * depthF * this.diff.acc * T.enemyAccuracy * (this.spotted > 0 ? 1.5 : 1);
      const hit = p && !p.down && this.R.ai() < chance;
      this.ev('efire', { id: e.id, hit, pid, x: e.x, y: e.y, z: e.z + (e.T.h || 20) * .7 });
      if (hit) this.hurtPlayer(p, dmg, e, 'bullet');
      else this.strayAtHostage(e);
    } });
  }
  // a stray round may strike a running hostage near the shooter's line (each hostage has HP 3 against enemy fire)
  strayAtHostage(e) {
    const run = this.host.list.filter(h => !h.dead && !h.rescued && !h.lost && !h.gone && Math.hypot(h.x - e.x, h.y - e.y) < 160);
    if (!run.length || this.R.ai() > .12 * this.diff.acc || this.attract) return;
    const h = run[0]; h.hp -= 1; this.ev('hostagehit', { id: h.id, idx: h.T.idx, hp: h.hp });
    if (h.hp <= 0) WP.hostageLost(this, h);
  }
  // a projectile toward the camera from an entity
  launch(type, e, o = {}) {
    if (WP.CHEATS.holdFire) return null;
    const live = this.living(); const tgt = live.length ? live[Math.floor(this.R.ai() * live.length)] : this.players[0];
    const z0 = o.z !== undefined ? o.z : e.z + (e.T.h || 20) * .8;
    const [lx, dz] = this.w2c(o.x !== undefined ? o.x : e.x, o.y !== undefined ? o.y : e.y);
    const p = this.spawn(type, { lx, dz, z: z0, anchor: 'cam' });
    p.from = [lx, dz, z0 - this.cam.h]; p.to = [o.tx !== undefined ? o.tx : (this.R.ai() - .5) * 40, 12, -6]; p.fl = WP.TYPES[type].flight / T.projectileSpeed * Math.sqrt(this.diff.tele); p.u = 0; p.pid = tgt ? tgt.pid : 0; p.zr = true; p.lz = z0 - this.cam.h;
    this.ev('launch', { id: p.id, type, from: e.id });
    return p;
  }
  snapshot() {
    return { op: this.opn, part: this.part, d: Math.round(this.d), t: +this.t.toFixed(2), q: Object.assign({}, this.q), boss: this.boss ? { type: this.boss.type, phase: this.boss.phase, hp: Math.round(WP.bossHp(this.boss)) } : null,
      players: this.players.map(p => ({ pid: p.pid, x: Math.round(p.x), y: Math.round(p.y), damage: Math.round(p.damage), mag: p.mag, spares: p.spares.length, grenades: p.grenades, score: p.score, streak: p.streak, down: p.down })),
      counts: { ents: this.ents.length, enemies: this.ents.filter(e => !e.dead && (e.kind === 'infantry' || e.kind === 'vehicle')).length, projectiles: this.ents.filter(e => e.kind === 'projectile').length },
      hostages: { n: this.host.n, saved: this.host.saved, lost: this.host.lost }, cleared: this.cleared, done: this.done };
  }
}
WP.Sim = Sim;
})();
