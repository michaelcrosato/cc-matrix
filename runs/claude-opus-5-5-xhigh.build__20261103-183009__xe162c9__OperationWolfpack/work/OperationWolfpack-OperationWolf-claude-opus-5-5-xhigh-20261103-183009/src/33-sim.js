// WP.Sim: one operation's run. Deterministic: fixed steps, seeded streams, no DOM, audio, rigs or Math.random.
// step(dt, frames) takes one InputFrame per player { x, y, fire, grenade, reload, snap, device }.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp, lerp } = WP;
const BEH = WP.BEH = WP.BEH || {};   // behaviors by name: (sim, e, dt) => {}
const SPAWN_KEYS = new Set(['x', 'y', 'z', 'lx', 'dz', 'side', 'off', 'anchor', 'beat', 'extra', 'n', 'gap', 'delay', 'spread', 'lxs', 'dzs', 'covers', 'alt', 'exact', 'hp', 'beh', 'chute']);

class Sim {
  constructor(o) {
    const st = this.stage = typeof o.stage === 'string' ? WP.STAGE[o.stage] : o.stage;
    this.o = o; this.seed = (o.seed === undefined ? 1 : o.seed) >>> 0; this.R = new WP.Streams(this.seed);
    this.run = o.run || WP.newRun(); this.diff = WP.DIFFS[this.run.diff] || WP.DIFFS.VETERAN; this.loop = this.run.loop || 1;
    this.perks = this.run.perks || {}; this.hub = !!o.hub; this.tempo = o.tempo || 1; this.cheats = o.cheats || {};
    this.view = new WP.View3D(); this.t = 0; this.d = o.d || 0; this.speed = 0; this.ents = []; this.nextId = 1; this.events = []; this.log = [];
    this.state = 'play'; this.boss = null; this.bossDone = false; this.shapes = []; this.flags = {}; this.timers = []; this.stats = { escaped: 0, spawned: { soldier: 0, vehicle: 0, air: 0, boat: 0 }, reinf: 0 };
    this.part = 'A'; this.spotted = 0; this.flare = 0; this.darkness = st.darkness || 0; this.radioSeen = o.tipsSeen || {};
    this.rail = new WP.Rail(st.rail, st.cam); this.holdsDone = new Set(); this.hold = null; this.reinfT = 0;
    // players
    const n = (o.players || [{ pid: 0 }]).length;
    this.coop = 1 + .3 * (n - 1);
    this.players = (o.players || [{ pid: 0 }]).map((p, i) => WP.Players.make(this, p, i, o.loadouts && o.loadouts[p.pid]));
    // quotas (7.14, 7.16): difficulty x perk x co-op x slider x loop
    const loopK = this.loop > 1 ? 1.15 : 1, qk = this.diff.quota * (this.perks.commsDown && st.n > 1 ? .8 : 1) * this.coop * WP.T.quota * (o.quotaK || 1) * loopK;
    this.quotaMax = {}; this.quotas = {};
    for (const k in st.quotas) { this.quotaMax[k] = Math.max(1, Math.round(st.quotas[k] * qk)); this.quotas[k] = this.quotaMax[k]; }
    this.objective = st.objective ? { kind: st.objective.kind, ids: st.objective.ids.slice(), done: 0, need: st.objective.ids.length } : null;
    this.hostages = { list: [], saved: 0, lost: 0, n: st.hostages ? (o.hostages === undefined ? this.run.hostagesFreed : o.hostages) : 0, ids: [] };
    // beats
    this.beats = st.beats.map((b, i) => Object.assign({ id: 'b' + (i + 1) }, b, { fired: false, cleared: false, spawned: [], firedAt: 0 }));
    this.beatById = {}; for (const b of this.beats) this.beatById[b.id] = b;
    // props from the stage
    for (const p of st.props || []) this.addProp(p);
    if (st.init) st.init(this);
    // jump into the middle (dev, attract, tests)
    if (o.d) { for (const b of this.beats) if (b.at !== undefined && b.at < o.d - 1) { b.fired = b.cleared = true; } for (const h of st.holds) if (h.d < o.d - 1) this.holdsDone.add(h.d); }
    this.cam = this.rail.at(this.d); this.view.begin(this.cam);
    this.ev('start', { op: st.id });
  }
  // ---------- events and radio ----------
  ev(k, a = {}) { a.k = k; a.t = this.t; this.events.push(a); return a; }
  drain() { const e = this.events; this.events = []; return e; }
  radio(key, vars) { if (!WP.TEXT[key]) return; this.ev('radio', { key, vars }); }
  tip(key, vars) { if (this.radioSeen[key] || this.o.noTips) return; this.radioSeen[key] = true; this.ev('tip', { key }); this.radio(key, vars); }
  after(s, fn) { this.timers.push({ t: this.t + s, fn }); }
  // ---------- multipliers ----------
  get accK() { return this.diff.acc * WP.T.enemyAccuracy * (this.loop > 1 ? 1.15 : 1); }
  get teleK() { return this.diff.tele * WP.T.telegraph / (this.loop > 1 ? 1.15 : 1); }
  get dmgK() { return this.diff.dmg * WP.T.enemyDamage * (this.loop > 1 ? 1.15 : 1); }
  get dropK() { return this.diff.drop * WP.T.dropChance; }
  get hpK() { return WP.T.enemyHp * (this.loop > 1 ? 1.15 : 1); }
  count(n) { return Math.max(1, Math.round(n * WP.T.spawnDensity * this.coop)); }
  livePlayers() { return this.players.filter(p => !p.down && !p.gone); }
  // ---------- entities ----------
  spawn(type, o = {}) {
    const tp = WP.TYPES[type]; if (!tp) { this.ev('warn', { text: 'unknown type ' + type }); return null; }
    const e = Object.assign({ id: this.nextId++, type, kind: tp.kind, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: Math.PI / 2, t: 0, st: 'enter', stt: 0, hp: 1, maxHp: 1, dead: false, gone: false, pose: null, beat: null }, o.extra || {});
    // position: world, or in the camera's frame at this moment (side: just off that edge)
    if (o.x !== undefined) { e.x = o.x; e.y = o.y; }
    else {
      const dz = o.dz === undefined ? 200 : o.dz; let lx = o.lx === undefined ? 0 : o.lx;
      if (o.side === 'L') lx = -(this.view.halfWidth(dz) + (o.off || 30)); else if (o.side === 'R') lx = this.view.halfWidth(dz) + (o.off || 30);
      if (o.anchor === 'cam') { e.anchor = 'cam'; e.lx = lx; e.dz = dz; }
      const w = this.view.toWorld(lx, dz); e.x = w[0]; e.y = w[1];
    }
    e.z = o.z || 0; e.baseZ = e.z;
    if (o.opening && this.stage.openings) {   // a window or door of a house: in front of it, clipped to it
      const op = this.stage.openings[o.opening];
      if (op) { const inside = o.beh === 'window' || o.beh === 'door'; e.x = op.cx; e.y = op.fy + 1.5; e.z = inside ? op.standZ : 0; if (inside) { e.facade = op.corners; e.floorZ = op.standZ; } }
    }
    const hp = (o.hp || tp.hp || 1) * (tp.kind === 'infantry' || tp.kind === 'vehicle' || tp.kind === 'air' || tp.kind === 'boat' ? this.hpK : 1);
    e.hp = e.maxHp = (tp.kind === 'prop' || tp.kind === 'civ' || tp.kind === 'hostage' || tp.kind === 'animal' || tp.kind === 'boss') ? (o.hp || tp.hp || 1) : Math.max(1, Math.round(hp * 4) / 4);
    for (const k in o) if (!SPAWN_KEYS.has(k) && o[k] !== undefined) e[k] = o[k];
    if (o.beat) { e.beat = o.beat.id; o.beat.spawned.push(e.id); }
    this.ents.push(e);
    const init = BEH['init:' + tp.kind]; if (init) init(this, e, o);
    if (tp.quota && !e.noQuota) this.stats.spawned[tp.quota] = (this.stats.spawned[tp.quota] || 0) + 1;
    this.ev('spawn', { id: e.id, type });
    return e;
  }
  byId(id) { for (const e of this.ents) if (e.id === id) return e; return null; }
  addProp(p) {
    // ['crate', id, x, depth, { drop, z, ... }] in stage coords (x along a sideways rail; depth ahead); or { world: [x, y] }
    const [type, pid, x, depth, o = {}] = p, w = this.stage.toWorld ? this.stage.toWorld(x, depth) : [x, WP.Y0 - depth];
    const e = this.spawn(type, Object.assign({ x: w[0], y: w[1], z: o.z || 0 }, o));
    if (!e) return null;
    e.pid = pid; e.facing = o.facing === undefined ? Math.PI / 2 : o.facing; e.dropKind = o.drop; e.st = 'idle';
    if (o.size) e.size = o.size;
    return e;
  }
  propById(pid) { for (const e of this.ents) if (e.pid === pid) return e; return null; }
  // ---------- scoring ----------
  score(p, points, at, o = {}) {
    if (!p || !points) return 0;
    const k = o.raw ? 1 : (1 + Math.min(3, Math.floor(p.streak / 8)));
    const v = Math.round(points * k); p.score += v;
    if (at) this.ev('points', { pid: p.pid, v, x: at.x, y: at.y, z: at.z || 0 });
    return v;
  }
  streakUp(p) {
    p.streak++; p.streakT = 4;
    if (p.streak === 24) { this.ev('packFury', { pid: p.pid }); }   // (the multiplier reaches x4 at 24)
  }
  streakReset(p) { if (p.streak >= 8) this.ev('streakLost', { pid: p.pid }); p.streak = 0; p.streakT = 0; }
  // ---------- damage to players ----------
  hurtPlayer(p, amount, from = {}) {
    if (!p || p.down || p.gone || amount <= 0) return;
    if (this.cheats.god || p.god) { this.ev('damage', { pid: p.pid, v: 0, from: from.kind, dir: from.dir || 0 }); return; }
    p.damage = Math.min(100, p.damage + amount); p.hurtT = .35; this.streakReset(p);
    this.ev('damage', { pid: p.pid, v: amount, from: from.kind, dir: from.dir || 0 });
    if (p.damage >= 100) this.downPlayer(p, from.kind || 'damage');
  }
  downPlayer(p, why) {
    if (p.down) return;
    p.down = true; p.damage = 100; p.fury = 0; this.ev('down', { pid: p.pid, why });
    if (!this.livePlayers().length && this.state !== 'clear') { this.state = 'fail'; this.failT = 0; this.ev('fail', {}); }
  }
  heal(p, v) { p.damage = Math.max(0, p.damage - v); }
  // ---------- kills ----------
  kill(e, by, part, how = 'shot') {
    if (e.dead) return;
    const tp = WP.TYPES[e.type]; e.dead = true; e.hp = 0; e.st = 'die'; e.stt = 0; e.dieHow = how; e.diePart = part; e.atk = null;
    const p = by === undefined || by === null ? null : this.players.find(q => q.pid === by);
    let points = tp.score || 0;
    if (e.type === 'para' && e.z > 8) points += 100;
    if (part === 'head') points = Math.round(points * 1.5);
    if (p) {
      if (tp.kind !== 'prop') { p.kills++; this.streakUp(p); if (part === 'head') p.headshots++; }
      this.score(p, points, { x: e.x, y: e.y, z: e.z + 30 });
    }
    // quotas
    const q = !e.noQuota && (e.quota || tp.quota);
    if (q && this.quotas[q] !== undefined) {
      const was = this.quotas[q]; this.quotas[q] = Math.max(0, this.quotas[q] - 1);
      if (was > 0 && this.quotas[q] === 0) this.ev('quotaMet', { q });
    }
    if (p && p.blast) { p.blast.kills++; }
    this.ev('kill', { id: e.id, type: e.type, by: p ? p.pid : -1, part, how, x: e.x, y: e.y, z: e.z });
    const die = BEH['die:' + tp.kind]; if (die) die(this, e, p, part, how);
    if (e.drop) this.dropAt(e, e.drop, p);
  }
  // ---------- explosions (world distance, 3D) ----------
  explode(x, y, z, r, dmg, o = {}) {
    const by = o.by === undefined ? null : o.by, p = by === null ? null : this.players.find(q => q.pid === by);
    this.ev('explode', { x, y, z, r, big: r >= 80 ? 2 : r >= 45 ? 1 : 0, kind: o.kind || 'grenade' });
    if (p) p.blast = { kills: 0 };
    o.at = [x, y, r, z];
    const hit = [];
    for (const e of this.ents) {
      if (e.dead || e.gone || e === o.skip) continue;
      const tp = WP.TYPES[e.type];
      const cz = e.z + (tp.kind === 'infantry' || tp.kind === 'civ' || tp.kind === 'hostage' ? 16 : 6);
      const dd = Math.hypot(e.x - x, e.y - y, cz - z), reach = r + (tp.box ? Math.max(tp.box[0], tp.box[1]) * .35 : 6);
      if (tp.kind === 'boss') { hit.push([e, 0, reach, tp]); continue; }
      if (dd > reach * 1.5) continue;
      hit.push([e, dd, reach, tp]);
    }
    for (const [e, dd, reach, tp] of hit) {
      if (e.dead || e.gone) continue;
      const k = clamp(1 - dd / reach, 0, 1), d = dmg * (.5 + .5 * k);
      if (dd > reach) { if (tp.kind === 'infantry' && !e.dead) { e.stun = 1; e.atk = null; } continue; }   // stunned in 1.5 x radius
      BEH.blastHit(this, e, d, p, o);
    }
    if (p) {
      if (p.blast.kills >= 4) { this.score(p, 1000, { x, y, z: z + 30 }, { raw: true }); this.ev('chain', { pid: p.pid, n: p.blast.kills }); }
      p.blast = null;
    }
    // players near the blast (only when it lands at the camera)
    if (o.atCam) for (const q of this.livePlayers()) if (!o.target || o.target === q.pid) this.hurtPlayer(q, o.camDmg || dmg, { kind: o.kind || 'blast', dir: o.dir || 0 });
  }
  // ---------- rail and holds ----------
  holdAt() {
    for (const h of this.stage.holds) if (!this.holdsDone.has(h.d) && this.d >= h.d - .01) return h;
    return null;
  }
  holdReleased(h) {
    const u = h.until || '';
    if (u.startsWith('beat:')) { const b = this.beatById[u.slice(5)]; return b && b.fired && this.beatDone(b); }
    if (u === 'vehicle' || u === 'air' || u === 'boat') return !this.ents.some(e => !e.dead && !e.gone && (e.quota || WP.TYPES[e.type].quota) === u && WP.TYPES[e.type].kind !== 'boss');
    if (u === 'escort') return !!this.flags.escortDone;
    if (u === 'quota') return this.quotasMet();
    if (u === 'boss') return this.bossDone;
    if (u === 'partB') return false;
    if (u === 'flag') return !!this.flags[h.flag];
    if (u.startsWith('prop:')) { const p = this.propById(u.slice(5)); return !p || p.dead || p.fallen; }
    return true;
  }
  beatDone(b) { return b.spawned.every(id => { const e = this.byId(id); return !e || e.dead || e.gone || WP.TYPES[e.type].kind === 'prop' || WP.TYPES[e.type].kind === 'civ' || WP.TYPES[e.type].kind === 'animal'; }); }
  quotasMet() { for (const k in this.quotas) if (this.quotas[k] > 0) return false; return true; }
  stepRail(dt) {
    const st = this.stage, base = (st.speed || 16) * WP.T.railSpeed * this.tempo;
    const h = this.holdAt();
    let target = base;
    if (h) {
      if (!this.hold || this.hold.h !== h) { this.hold = { h, t: 0 }; this.ev('hold', { d: h.d, until: h.until }); if (h.radio) this.radio(h.radio); }
      this.hold.t += dt;
      const max = h.max ? h.max * (this.hub ? .6 : 1) : 0;
      if (this.holdReleased(h) || (max && this.hold.t >= max)) {
        this.holdsDone.add(h.d); this.ev('release', { d: h.d });
        if (max && this.hold.t >= max) for (const e of this.ents) if (!e.dead && !e.gone && e.holdTag === h.d) e.leave = true;
        this.hold = null;
      } else target = h.slow ? h.slow : 0;
    }
    if (st.speedAt) target = st.speedAt(this, target);
    // ease to the target (to 0 over .6 s, back up over .8 s)
    const rate = target < this.speed ? base / .6 : base / .8;
    this.speed = WP.approach(this.speed, target, rate * dt);
    let nd = this.d + this.speed * dt;
    const hh = this.holdAt(); if (hh && nd > hh.d) nd = hh.d;
    for (const x of st.holds) if (!this.holdsDone.has(x.d) && this.d <= x.d && nd > x.d) nd = x.d;
    this.d = Math.min(this.rail.length, nd);
    this.lastCam = this.cam ? [this.cam.x, this.cam.y] : null;
    const c = this.rail.at(this.d);
    // bob and sway: river bob, a walk's sway on land
    if (st.bob) { c.h += Math.sin(this.t * 2.2) * 1.2; c.pitch += Math.sin(this.t * 2.2 + 1) * .5; }
    else if (this.speed > 2) c.h += Math.sin(this.t * 10) * .4 * (this.speed / base);
    if (st.camFx) st.camFx(this, c);
    if (this.deathCam) { const u = clamp(this.deathCam / .8, 0, 1); c.h = lerp(c.h, 8, u); c.pitch = lerp(c.pitch, -10, u); }
    this.cam = c; this.view.begin(c);
  }
  // ambient animals and birds: they appear as the camera comes near
  stepAmbient() {
    const A = this.stage.ambient; if (!A) return;
    this.ambDone = this.ambDone || new Set();
    A.forEach((a, i) => {
      if (this.ambDone.has(i)) return;
      const [type, x, depth, carry] = a, w = this.stage.toWorld(x, depth);
      const L = this.view.lateral(w[0], w[1]), D = this.view.depth(w[0], w[1]);
      if (D > 20 && Math.abs(L) < this.view.halfWidth(D) + 160) { this.ambDone.add(i); this.spawn(type, { x: w[0], y: w[1], carry, dir: L < 0 ? 1 : -1 }); }
    });
  }
  /** swap in a new stage (Op 6's takeoff): its rail, holds, beats, look; the players, hostages and score carry on */
  swapStage(st, part) {
    this.stage = st; this.part = part || 'B'; this.partT = this.t; this.d = 0; this.speed = 0; this.rail = new WP.Rail(st.rail, st.cam); this.holdsDone = new Set(); this.hold = null;
    this.beats = st.beats.map((b, i) => Object.assign({ id: 'b' + (i + 1) }, b, { fired: false, cleared: false, spawned: [], firedAt: 0 }));
    this.beatById = {}; for (const b of this.beats) this.beatById[b.id] = b;
    for (const e of this.ents) if (WP.TYPES[e.type].kind !== 'hostage') e.gone = true;
    this.ents = this.ents.filter(e => !e.gone);
    for (const p of st.props || []) this.addProp(p);
    this.quotaMax = Object.assign({}, st.quotas || {}); this.quotas = Object.assign({}, st.quotas || {});
    this.flags.bossCalled = false; this.darkness = st.darkness || 0;
    if (st.init) st.init(this);
    this.cam = this.rail.at(0); this.view.begin(this.cam);
    this.ev('stageSwap', { id: st.id, part: this.part });
  }
  // ---------- beats ----------
  stepBeats() {
    for (const b of this.beats) {
      if (!b.fired) {
        let go = false;
        if (b.at !== undefined && this.d >= b.at) go = true;
        if (b.time !== undefined && this.t - (this.partT || 0) >= b.time) go = true;
        if (b.after) { const a = this.beatById[b.after]; if (a && a.fired && (a.cleared || this.beatDone(a))) { if (b._wait === undefined) b._wait = this.t + (b.delay || 0); if (this.t >= b._wait) go = true; } }
        if (b.when && !b.when(this)) go = false;
        if (go) this.fireBeat(b);
      } else if (!b.cleared && this.beatDone(b) && this.t > b.firedAt + .5) { b.cleared = true; this.ev('beatClear', { id: b.id }); }
    }
  }
  fireBeat(b) {
    b.fired = true; b.firedAt = this.t; this.ev('beat', { id: b.id });
    if (b.radio) this.radio(b.radio);
    if (b.tip) this.tip(b.tip);
    for (const sp of b.spawn || []) this.spawnSpec(sp, b);
    for (const p of b.props || []) { const e = this.addProp(p); if (e) { e.beat = b.id; } }
    if (b.run) b.run(this, b);
  }
  /** ['rifleman', { side, dz, n, gap, beh, ... }]: n spawns gap seconds apart (n scaled by density and co-op) */
  spawnSpec(sp, b) {
    const [type, o0 = {}] = sp, tp = WP.TYPES[type]; if (!tp) return;
    const scaled = tp.kind === 'infantry', n = scaled && !o0.exact ? this.count(o0.n || 1) : (o0.n || 1);
    for (let i = 0; i < n; i++) {
      const o = Object.assign({}, o0, { beat: b });
      if (o.spread) o.lx = (o.lx || 0) + (i - (n - 1) / 2) * o.spread;
      if (o.lxs) o.lx = o.lxs[i % o.lxs.length];
      if (o.dzs) o.dz = o.dzs[i % o.dzs.length];
      if (o.covers) o.cover = o.covers[i % o.covers.length];
      if (o.alt) o.dir = (o.dir || 1) * (i % 2 ? -1 : 1);
      if (o.alt && o.side) o.side = (i % 2) ? (o0.side === 'L' ? 'R' : 'L') : o0.side;
      const delay = (o.gap || 0) * i + (o.delay || 0);
      if (delay > 0) this.after(delay, () => { if (this.state === 'play' || this.state === 'boss') { const e = this.spawn(type, o); if (e && b.hold) e.holdTag = b.hold; } });
      else { const e = this.spawn(type, o); if (e && b.hold) e.holdTag = b.hold; }
    }
  }
  // ---------- the reinforcement loop (7.14) ----------
  stepReinforce(dt) {
    const st = this.stage, bh = st.holds.find(h => h.until === 'boss'), end = this.d >= (bh ? bh.d : this.rail.length) - .5 || (st.reinfAt && this.d >= st.reinfAt);
    if (!end || this.boss || this.bossDone || this.state !== 'play' || this.quotasMet()) return;
    const live = this.ents.filter(e => !e.dead && !e.gone && WP.TYPES[e.type].quota).length;
    this.reinfT -= dt;
    if (this.reinfT > 0 || live > 10) return;
    this.reinfT = 3 + this.R.ai() * 2;
    if (!this.flags.reinfSaid) { this.flags.reinfSaid = true; this.radio('reinf'); }
    const need = Object.keys(this.quotas).filter(k => this.quotas[k] > 0);
    const k = need.includes('air') && !this.ents.some(e => !e.dead && e.type === 'heli') ? 'air' : need.includes('boat') && this.R.ai() < .6 ? 'boat' : need.includes('vehicle') && this.R.ai() < .5 ? 'vehicle' : need.includes('soldier') ? 'soldier' : need[0];
    const R = this.R.ai, side = R() < .5 ? 'L' : 'R', list = st.reinforce || {};
    this.stats.reinf++;
    if (k === 'air') this.spawn('heli', { lx: (R() - .5) * 200, dz: 700, z: 80, beh: 'heli' });
    else if (k === 'boat') this.spawn(list.boat || 'skiff', { lx: (R() - .5) * 120, dz: 520, beh: 'river' });
    else if (k === 'vehicle') this.spawn(list.vehicle || 'jeep', { side, dz: 180 + R() * 120, dir: side === 'L' ? 1 : -1, beh: 'cross' });
    else {
      const t = WP.pick(R, list.soldier || ['rifleman', 'rifleman', 'grenadier', 'rifleman', 'knife']);
      const n = 2 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) this.spawn(t, { side: (i % 2 ? (side === 'L' ? 'R' : 'L') : side), dz: 140 + R() * 160, beh: t === 'knife' ? 'advance' : 'cross', stops: 1, dir: 0 });
    }
  }
  // ---------- one step ----------
  step(dt, frames = {}) {
    if (this.state === 'clear' || this.state === 'done') { this.t += dt; this.stepEnts(dt); this.stepTimers(); return; }
    this.t += dt;
    if (this.state === 'fail') { this.failT = (this.failT || 0) + dt; this.deathCam = (this.deathCam || 0) + dt; this.stepRail(dt); this.stepEnts(dt); return; }
    this.stepRail(dt);
    this.stepTimers();
    this.stepBeats();
    this.stepAmbient();
    this.stepEnts(dt);
    this.buildShapes();
    WP.Players.step(this, dt, frames);
    this.stepReinforce(dt);
    WP.Supply.step(this, dt);
    if (this.spotted > 0) this.spotted -= dt;
    if (this.flare > 0) this.flare -= dt;
    // the boss comes when the rail's end is reached and every quota is met
    const st = this.stage;
    const bh = st.holds.find(h => h.until === 'boss'), bossD = bh ? bh.d : this.rail.length;
    if (!this.boss && !this.bossDone && st.boss && this.d >= bossD - .5 && this.quotasMet() && !this.flags.bossCalled && (!st.bossWhen || st.bossWhen(this))) {
      this.flags.bossCalled = true; this.after(1.2, () => WP.Bosses.start(this, st.boss));
    }
    if (this.boss) WP.Bosses.step(this, this.boss, dt);
    if (st.step) st.step(this, dt);
    this.cleanup(dt);
  }
  stepTimers() {
    if (!this.timers.length) return;
    const due = this.timers.filter(t => t.t <= this.t); if (!due.length) return;
    this.timers = this.timers.filter(t => t.t > this.t);
    for (const t of due) t.fn();
  }
  stepEnts(dt) {
    const P = this.view.P;
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i]; if (e.gone) continue;
      e.t += dt; e.stt += dt;
      if (e.anchor === 'cam') { const w = this.view.toWorld(e.lx, e.dz); e.x = w[0]; e.y = w[1]; }
      const tp = WP.TYPES[e.type];
      if (e.dead) { const f = BEH['dead:' + tp.kind] || BEH.dead; f(this, e, dt); continue; }
      if (e.stun > 0) { e.stun -= dt; if (tp.kind === 'infantry') { e.atk = null; continue; } }
      const f = BEH[e.beh] || BEH[tp.kind]; if (f) f(this, e, dt);
      if (e.anchor === 'cam') { const w = this.view.toWorld(e.lx, e.dz); e.x = w[0]; e.y = w[1]; }
    }
    void P;
  }
  cleanup(dt) {
    // enemies that leave the screen for 2 s despawn as escaped (not toward the quota)
    for (const e of this.ents) {
      if (e.gone || e.dead) continue;
      const tp = WP.TYPES[e.type]; if (tp.kind === 'prop' || tp.kind === 'boss' || tp.kind === 'pickup') continue;
      const p = this.view.project(e.x, e.y, e.z + 10), D = this.view.depth(e.x, e.y);
      const off = !p || D < 10 || p[0] < -60 || p[0] > WP.W + 60;
      if (off && e.t > 1.5 && !e.offOK) { e.offT = (e.offT || 0) + dt; if (e.offT > 2) { e.gone = true; e.escaped = true; if (tp.quota) this.stats.escaped++; this.ev('gone', { id: e.id }); } }
      else e.offT = 0;
    }
    if (this.ents.some(e => e.gone)) this.ents = this.ents.filter(e => !e.gone);
  }
  // ---------- hit shapes, nearest first (7.2) ----------
  buildShapes() {
    const out = this.shapes = [], V = this.view;
    for (const e of this.ents) {
      if (e.gone) continue;
      const f = BEH['shapes:' + WP.TYPES[e.type].kind]; if (f) f(this, e, out, V);
    }
    out.sort((a, b) => a.D - b.D);
    return out;
  }
  /** the nearest shape at a screen point (filter: skip some) */
  pick(x, y, filter) {
    for (const s of this.shapes) { if (filter && !filter(s)) continue; if (WP.Hit.contains(s, x, y)) return s; }
    return null;
  }
  dropAt(e, kind, p) { WP.Supply.drop(this, e.x, e.y, (e.z || 0) + 10, kind, p); }
  /** the debug and test handle's summary */
  snapshot() {
    const c = { enemies: 0, projectiles: 0, pickups: 0, civilians: 0, hostages: 0, props: 0 };
    for (const e of this.ents) { if (e.dead || e.gone) continue; const k = WP.TYPES[e.type].kind; if (k === 'infantry' || k === 'vehicle' || k === 'air' || k === 'boat' || k === 'boss') c.enemies++; else if (k === 'proj') c.projectiles++; else if (k === 'pickup') c.pickups++; else if (k === 'civ') c.civilians++; else if (k === 'hostage') c.hostages++; else if (k === 'prop') c.props++; }
    const b = this.boss;
    return { op: this.stage.id, part: this.part, d: Math.round(this.d), t: Math.round(this.t * 10) / 10, state: this.state, hold: this.hold ? this.hold.h.d : null,
      beat: (this.beats.filter(x => x.fired).pop() || {}).id || null, beatsFired: this.beats.filter(x => x.fired).length, beats: this.beats.length,
      quotas: Object.assign({}, this.quotas), quotaMax: Object.assign({}, this.quotaMax), objective: this.objective ? this.objective.done + '/' + this.objective.need : null,
      boss: b ? { id: b.type, phase: b.phase, hp: Math.round(WP.Bosses.hp(b)) } : (this.bossDone ? { done: true } : null),
      players: this.players.map(p => ({ pid: p.pid, x: Math.round(p.x), y: Math.round(p.y), damage: Math.round(p.damage), mag: p.mag, spares: p.spares.slice(), grenades: p.grenades, score: p.score, streak: p.streak, down: p.down, kills: p.kills, shots: p.shots, hits: p.hits, civHits: p.civHits, fury: Math.round(p.fury * 10) / 10 })),
      counts: c, hostages: { saved: this.hostages.saved, lost: this.hostages.lost, n: this.hostages.n }, spotted: this.spotted > 0, stats: this.stats };
  }
}
WP.Sim = Sim;

// default dead-body update: fall, lie, fade after 2.5 s
BEH.dead = (sim, e, dt) => {
  if (e.z > (e.floorZ || 0) && !e.anchor) { e.vz = (e.vz || 0) - 400 * dt; e.z = Math.max(e.floorZ || 0, e.z + e.vz * dt); }
  if (e.stt > (e.fadeAt || 2.5)) e.gone = true;
};
})();
