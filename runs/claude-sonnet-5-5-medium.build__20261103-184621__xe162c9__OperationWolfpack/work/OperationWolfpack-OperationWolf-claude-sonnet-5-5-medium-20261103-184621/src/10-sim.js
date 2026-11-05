// The simulation: one operation's run. Deterministic, no DOM, no audio, no rigs. Presentation reads it and its events.
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T, { clamp, lerp } = WP;
const TY = WP.TYPES;

// ---- type registry -----------------------------------------------------------------------------
const def = (id, o) => { TY[id] = Object.assign({ id, kind: 'inf', hp: 3, score: 100, w: 9, h: 30, dmg: 6, acc: .7, tele: .9, speed: 34 }, o); TY[id].head = TY[id].kind === 'inf'; };
def('rifleman', { q: 'soldier', beh: 'walk', atk: 'shot', rig: 'grunt', score: 100 });
def('popper', { q: 'soldier', beh: 'popup', atk: 'shot', rig: 'grunt', tele: .8, score: 150 });
def('knifer', { q: 'soldier', beh: 'throw', atk: 'knife', rig: 'knifer', hp: 2, tele: .6, score: 150, speed: 42, dmg: 8, near: 80, every: 2.2 });
def('grenadier', { q: 'soldier', beh: 'throw', atk: 'grenade', rig: 'grenadier', hp: 3, tele: .9, score: 200, speed: 26, dmg: 14, near: 230, every: 3.6 });
def('heavy', { q: 'soldier', beh: 'walk', atk: 'burst', rig: 'heavy', hp: 14, tele: 1.1, score: 500, speed: 20, dmg: 3, burst: 3, headMult: 3, h: 36, w: 14 });
def('sniper', { q: 'soldier', beh: 'static', atk: 'shot', rig: 'sniper', hp: 2, tele: 1.8, score: 250, dmg: 16, acc: .85 });
def('jeep', { kind: 'veh', q: 'vehicle', beh: 'drive', atk: 'shot', hp: 16, score: 600, w: 46, h: 22, tele: 1.3, dmg: 7, speed: 58, riders: 2, shape: 'jeep' });
def('boat', { kind: 'veh', q: 'vehicle', beh: 'boat', atk: 'shot', hp: 12, score: 500, w: 40, h: 18, tele: 1.2, dmg: 7, speed: 34, shape: 'boat' });
def('skiff', { kind: 'veh', q: 'vehicle', beh: 'boat', atk: 'shot', hp: 5, score: 300, w: 26, h: 14, tele: 1.1, dmg: 6, speed: 46, shape: 'skiff' });
def('heli', { kind: 'air', q: 'air', beh: 'heli', atk: 'missile', hp: 22, score: 1200, w: 58, h: 26, tele: 1.1, dmg: 16, speed: 46, shape: 'heli', every: 3.4 });
def('civ', { kind: 'civ', hp: 1, score: 0, w: 9, h: 28, beh: 'cross', speed: 16, rig: 'civ' });
def('canoe', { kind: 'civ', hp: 2, score: 0, w: 30, h: 14, beh: 'cross', speed: 14, rig: 'civ', shape: 'canoe', pen: 1 });
def('hostage', { kind: 'host', hp: 1, score: 0, w: 9, h: 28, beh: 'run', speed: 22, rig: 'host' });
def('goat', { kind: 'animal', hp: 3, score: 0, w: 18, h: 13, beh: 'cross', speed: 12, carry: 'gren', shape: 'goat' });
def('hen', { kind: 'animal', hp: 2, score: 0, w: 10, h: 9, beh: 'cross', speed: 16, carry: 'mag', shape: 'hen' });
def('crate', { kind: 'prop', hp: 3, score: 50, w: 16, h: 14, beh: 'prop', shape: 'crate', drop: 'mag' });
def('barrel', { kind: 'prop', hp: 2, score: 50, w: 10, h: 14, beh: 'prop', shape: 'barrel', boom: 55 });
def('fuel', { kind: 'prop', hp: 5, score: 150, w: 26, h: 24, beh: 'prop', shape: 'fuel', boom: 90 });
def('mast', { kind: 'prop', hp: 16, score: 800, w: 10, h: 70, beh: 'prop', shape: 'mast', obj: true, boom: 70 });
def('cover', { kind: 'cover', hp: 99, score: 0, w: 40, h: 11, beh: 'prop', shape: 'sandbag' });
def('knife', { kind: 'proj', hp: 1, w: 6, h: 6, score: 25, shape: 'knife' });
def('grenade', { kind: 'proj', hp: 1, w: 7, h: 7, score: 50, shape: 'grenade' });
def('missile', { kind: 'proj', hp: 2, w: 8, h: 8, score: 100, shape: 'missile' });
def('shell', { kind: 'proj', hp: 3, w: 12, h: 12, score: 150, shape: 'shell' });
for (const k of ['mag', 'gren', 'med', 'fury', 'tnt', 'medal']) def('pk_' + k, { kind: 'pickup', hp: 1, w: 10, h: 10, score: k === 'medal' ? 500 : 0, shape: 'pk', pk: k });
def('boss', { kind: 'boss', hp: 100, score: 5000, w: 70, h: 44, beh: 'boss' });

// ---- bosses ----------------------------------------------------------------------------------
const B = WP.BOSSES;
B.bigear = { name: 'BIG EAR', hp: 130, w: 74, h: 46, dz: 240, sc: 1.4, wp: { dx: 0, dy: 50, r: 12 }, mult: 3, phases: [
  { at: 1, atks: ['burst', 'summon'] }, { at: .55, atks: ['shell', 'burst', 'sweep'] }, { at: .25, atks: ['shell', 'sweep', 'summon'] }] };
B.riverhog = { name: 'RIVER HOG', hp: 150, w: 90, h: 38, dz: 250, sc: 1.4, wp: { dx: -8, dy: 42, r: 12 }, mult: 3, phases: [
  { at: 1, atks: ['burst', 'shell'] }, { at: .5, atks: ['shell', 'sweep', 'summon'] }, { at: .2, atks: ['shell', 'shell', 'sweep'] }] };
B.butcher = { name: 'THE BUTCHER', hp: 170, w: 80, h: 40, dz: 230, sc: 1.4, wp: { dx: 6, dy: 40, r: 11 }, mult: 3.2, phases: [
  { at: 1, atks: ['burst', 'shell'] }, { at: .6, atks: ['shell', 'burst', 'summon'] }, { at: .3, atks: ['sweep', 'shell', 'burst'] }] };
B.kragg = { name: 'GENERAL KRAGG', hp: 210, w: 52, h: 66, dz: 255, sc: 1.1, wp: { dx: 0, dy: 70, r: 10 }, mult: 3.5, phases: [
  { at: 1, atks: ['burst', 'summon'] }, { at: .6, atks: ['shell', 'burst', 'sweep'] }, { at: .3, atks: ['sweep', 'shell', 'summon', 'burst'] }] };
const ATK = {
  burst: { tele: 1.2, n: 5, int: .12, dmg: 3.2 },
  shell: { tele: .9, proj: 'shell', flight: 2.0, dmg: 18 },
  summon: { tele: .7, type: 'rifleman', n: 3 },
  sweep: { tele: 2.3, dmg: 24, stag: 14 }
};

const FOV_K = 1.026;    // visible half-width per unit of depth at fov 60 on a 16:9 buffer
const MAXP = 4;

class Sim {
  constructor(o = {}) {
    this.o = o; this.opIx = o.op || 0; this.st = WP.STAGES[this.opIx];
    const st = this.st;
    this.diff = WP.DIFFS[o.difficulty || 'VETERAN'];
    this.rnd = WP.mulberry((o.seed || 1) >>> 0);
    this.cam = { x: st.x0, y: st.y0, h: st.cam.h, angle: -Math.PI / 2, pitch: st.cam.pitch, fov: 60 };
    this.m7 = new E.Mode7({ floor: () => [0, 0, 0] });
    this.t = 0; this.d = 0; this.ents = []; this.nid = 1; this.events = []; this.pend = []; this.gpend = [];
    this.beatIx = 0; this.holdIx = 0; this.hold = null;
    this.phase = 'rail'; this.endT = 0; this.reinT = 4; this.supplyT = 8; this.emergT = 0; this.lowSaid = 0;
    this.q = { need: Object.assign({}, st.quotas), got: { soldier: 0, vehicle: 0, air: 0 } };
    this.host = { saved: o.hostSaved || 0, lost: 0, total: 0, exited: 0 };
    this.stats = { kills: 0, civHits: 0, hostHits: 0, masts: 0, mastTotal: 0, shotsFired: 0, shotsHit: 0 };
    this.bossEnt = null; this.bossDone = false; this.freezeT = 0; this.tntT = 0;
    this.players = [];
    const n = o.players || 1;
    for (let i = 0; i < MAXP; i++) this.players.push(this.newPlayer(i, i < n, (o.carry || [])[i]));
    this.cheat = { inv: !!o.invincible, ammo: !!o.infAmmo, ...(o.cheats || {}) };
    this.beginView();
    for (const s of st.setup || []) this.spawn(s[0], s[1]);
  }
  newPlayer(i, active, c) {
    const p = { pid: i, active, x: 240 + (i - 1.5) * 40, y: 120, mag: T.magSize, spares: T.spare, grenades: T.grenades, dmg: 0, score: 0, streak: 0, best: 0,
      fury: 0, reload: 0, cd: 0, bloom: 0, gcd: 0, down: false, kills: 0, shots: 0, hits: 0, heads: 0, fireHeld: false, dry: 0, inv: 0, civ: 0, lastFire: -9 };
    if (c) { p.score = c.score || 0; p.kills = c.kills || 0; p.shots = c.shots || 0; p.hits = c.hits || 0; p.heads = c.heads || 0; p.civ = c.civ || 0; p.best = c.best || 0;
      p.mag = c.mag ?? p.mag; p.spares = c.spares ?? p.spares; p.grenades = c.grenades ?? p.grenades; p.dmg = c.down ? 60 : Math.min(c.dmg || 0, 90); }
    return p;
  }
  carry() { return this.players.map(p => ({ active: p.active, score: p.score, kills: p.kills, shots: p.shots, hits: p.hits, heads: p.heads, civ: p.civ, best: p.best, mag: p.mag, spares: p.spares, grenades: p.grenades, dmg: p.dmg, down: p.down })); }

  // ---- helpers ----
  r() { return this.rnd(); }
  rr(a, b) { return a + this.r() * (b - a); }
  ev(e) { if (this.events.length < 200) this.events.push(e); }
  halfW(dz) { return Math.max(40, dz * FOV_K * .96); }
  beginView() { this.m7.begin({ W: WP.W, H: WP.H }, this.cam); }
  proj(x, y, z) { return this.m7.project(x, y, z); }
  get actives() { return this.players.filter(p => p.active); }
  alive() { return this.players.filter(p => p.active && !p.down); }
  byId(id) { for (const e of this.ents) if (e.id === id) return e; return null; }
  count(fn) { let n = 0; for (const e of this.ents) if (!e.dead && e.st !== 'dying' && fn(e)) n++; return n; }

  // ---- spawning ----
  spawn(type, o = {}) {
    const ty = TY[type]; if (!ty) throw new Error('unknown type ' + type);
    const n = o.n || 1;
    if (n > 1) { for (let i = 0; i < n; i++) this.pend.push({ at: this.t + i * (o.gap || .8), type, o: Object.assign({}, o, { n: 1, side: o.alt && i % 2 ? (o.side === 'L' ? 'R' : 'L') : o.side }) }); return null; }
    const dz = o.dz ?? this.rr(160, 300), hw = this.halfW(dz);
    let lx = o.lx;
    if (o.side) lx = (o.side === 'L' ? -1 : 1) * (hw + 34);
    if (lx == null) lx = this.rr(-.7, .7) * hw;
    const e = { id: this.nid++, t: type, ty, anc: ty.kind !== 'prop' && ty.kind !== 'cover' && !o.world, lx, dz, x: 0, y: 0, z: o.z || 0, hp: Math.max(1, Math.round(ty.hp * (ty.kind === 'inf' || ty.kind === 'veh' || ty.kind === 'air' ? T.enemyHp * this.diff.hp : 1) * 10) / 10),
      age: 0, st: 'enter', stT: 0, aim: 0, aimTot: 0, tgt: null, face: 1, flash: 0, dir: lx > 0 ? -1 : 1, hold: o.hold !== false, drop: o.drop, up: 0, cd: this.rr(.2, 1.2), life: o.life ?? this.rr(7, 11), seed: this.r() };
    e.hpMax = e.hp;
    if (!e.anc) { e.x = this.cam.x + lx; e.y = this.cam.y - dz; }
    else this.place(e);
    e.tx = o.tx ?? clamp(lx > 0 ? hw * this.rr(.1, .7) : -hw * this.rr(.1, .7), -hw * .8, hw * .8);
    if (o.tx == null && o.side == null) e.tx = lx;
    if (ty.kind === 'proj' || ty.kind === 'pickup') e.hold = false;
    if (ty.kind === 'civ' || ty.kind === 'host' || ty.kind === 'animal') e.hold = false;
    if (ty.kind === 'prop' || ty.kind === 'cover') e.hold = false;
    if (type === 'heli') { e.z = o.z ?? 70; e.baseZ = e.z; }
    if (type === 'sniper') { e.z = o.z ?? 40; }
    if (ty.beh === 'drive') { e.dir = lx > 0 ? -1 : 1; e.tx = -e.dir * (hw + 90); }
    if (ty.beh === 'boat') { e.dzTarget = o.dzTarget ?? this.rr(110, 170); }
    if (ty.beh === 'cross') { e.dir = o.dir ?? (lx > 0 ? -1 : 1); }
    if (ty.beh === 'run') { e.dir = 1; }
    if (ty.beh === 'popup') {
      lx = clamp(lx, -hw * .75, hw * .75); e.lx = lx;
      const cov = this.spawn('cover', { lx, dz, world: true });
      e.cov = cov.id; e.st = 'hide'; e.stT = this.rr(.4, 1.6); e.hold = o.hold !== false;
      e.world = true; e.anc = false; e.x = cov.x; e.y = cov.y - 3;
    }
    if (type === 'hostage') { this.host.total++; }
    if (type === 'mast') this.stats.mastTotal++;
    if (o.carry) e.carry = o.carry;
    this.ents.push(e);
    if (o.say) this.radio(o.say);
    return e;
  }
  place(e) { e.x = this.cam.x + e.lx; e.y = this.cam.y - e.dz; }
  pickup(kind, x, y, z, o = {}) {
    const e = { id: this.nid++, t: 'pk_' + kind, ty: TY['pk_' + kind], anc: true, lx: x - this.cam.x, dz: this.cam.y - y, x, y, z: z || 0, vz: o.vz ?? 60, hp: 1, hpMax: 1, age: 0, st: 'pk', stT: 0, life: 11, flash: 0, hold: false, pkind: kind, aim: 0, dx: o.dx || 0, dy: o.dy || 0, seed: this.r() };
    this.ents.push(e); return e;
  }
  radio(key) { this.ev({ k: 'radio', key }); }

  // ---- projectiles ----
  proj_(type, from, tgtPlayer, flight, dmg, o = {}) {
    const ty = TY[type];
    const hostTgt = o.host;
    const tx = hostTgt ? hostTgt.x : this.cam.x + this.rr(-9, 9) + (tgtPlayer ? (tgtPlayer.pid - 1.5) * 6 : 0);
    const ty_ = hostTgt ? hostTgt.y : this.cam.y - 14;
    const tz = hostTgt ? 14 : this.cam.h - 4;
    const e = { id: this.nid++, t: type, ty, anc: false, x: from.x, y: from.y, z: from.z, fx: from.x, fy: from.y, fz: from.z, tx, tyy: ty_, tz, T: flight, a: 0, pid: tgtPlayer ? tgtPlayer.pid : -1, hid: hostTgt ? hostTgt.id : 0, dmg, hp: ty.hp, hpMax: ty.hp, age: 0, st: 'fly', stT: 0, flash: 0, hold: false, arc: type === 'grenade' ? 36 : 0, aim: 0, seed: this.r() };
    this.ents.push(e); this.ev({ k: 'throw', t: type, x: e.x, y: e.y });
    return e;
  }

  // ---- damage to players / friendlies ----
  hurt(p, amt, why) {
    if (!p || !p.active || p.down) return;
    if (this.cheat.inv || p.inv > 0) return;
    amt *= T.enemyDmg * this.diff.dmg;
    p.dmg = Math.min(100, p.dmg + amt); p.streak = 0; p.hitT = .4;
    this.ev({ k: 'hurt', pid: p.pid, amt, why });
    if (p.dmg >= 100) { p.down = true; p.fury = 0; this.ev({ k: 'down', pid: p.pid }); }
  }
  pickTarget(e) {
    const al = this.alive();
    if (!al.length) return null;
    if (this.opIx === 3) {
      const hs = this.ents.filter(h => h.ty.kind === 'host' && !h.dead && h.st !== 'dying' && Math.abs(h.dz - e.dz) < 260 && Math.abs(h.lx) < this.halfW(h.dz));
      if (hs.length && this.r() < .45) { const h = hs[Math.floor(this.r() * hs.length)]; return { h: h.id, col: '#ffffff' }; }
    }
    const p = al[Math.floor(this.r() * al.length)];
    return { p: p.pid, col: WP.SEAT[p.pid] };
  }

  // ---- the step ----
  step(dt, frames) {
    this.events = [];
    this.t += dt;
    if (this.freezeT > 0) { this.freezeT -= dt; }
    this.beginView();
    this.stepPlayers(dt, frames || []);
    if (this.phase === 'fail' || this.phase === 'clear') { this.endT += dt; this.stepEnts(dt, true); this.reap(); return; }
    this.stepRail(dt);
    this.stepPend();
    this.stepEnts(dt, false);
    this.stepSupply(dt);
    this.reap();
    this.stepPhase(dt);
  }
  stepRail(dt) {
    const st = this.st, sp = st.speed * T.railSpeed;
    const holds = st.holds;
    if (!this.hold && this.holdIx < holds.length && this.d >= holds[this.holdIx].d) this.hold = { h: holds[this.holdIx], t: 0 };
    if (this.hold) {
      this.hold.t += dt;
      const busy = this.ents.some(e => e.hold && !e.dead && e.st !== 'dying') || this.pend.length;
      const h = this.hold.h;
      if (h.until === 'end') { /* the rail ends here; the phase logic takes over */ }
      else if ((!busy && this.hold.t > .6) || this.hold.t > (h.max || 25)) { this.hold = null; this.holdIx++; }
    } else if (this.phase === 'rail' && this.d < st.len) {
      this.d = Math.min(st.len, this.d + sp * dt);
      if (st.hold_after_end) { /* none */ }
    }
    if (this.d >= st.len && !this.hold && this.holdIx >= holds.length) this.hold = { h: { until: 'end' }, t: 0 };
    // camera
    const moving = !this.hold && this.d < st.len;
    if (st.travel === 'x') { this.cam.x = st.x0 + this.d; this.cam.y = st.y0; } else { this.cam.y = st.y0 - this.d; this.cam.x = st.x0; }
    this.cam.h = st.cam.h + (moving ? Math.sin(this.t * 2.1) * .5 : 0);
    // beats
    while (this.beatIx < st.beats.length && this.d >= st.beats[this.beatIx].at) {
      const b = st.beats[this.beatIx++];
      if (b.say) this.radio(b.say);
      if (b.card) this.ev({ k: 'card', text: b.card });
      for (const s of b.spawn || []) this.spawn(s[0], s[1] || {});
      if (b.fn) b.fn(this);
    }
  }
  stepPend() {
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const p = this.pend[i];
      if (this.t >= p.at) { this.pend.splice(i, 1); this.spawn(p.type, p.o); }
    }
  }
  stepPhase(dt) {
    const st = this.st, q = this.q;
    // reinforcements while the rail is held at its end and the quotas are not met
    const quotaMet = Object.keys(q.need).every(k => q.got[k] >= q.need[k]);
    const objMet = !st.objective || this.stats.masts >= this.stats.mastTotal;
    if (this.phase === 'rail' && this.hold && this.hold.h.until === 'end') {
      if (quotaMet && objMet && !this.pend.length && (this.hold.t > 40 || !this.ents.some(e => e.hold && !e.dead && e.st !== 'dying' && e.ty.q))) {
        for (const e of this.ents) if (e.hold && e.ty.q) e.dead = true;
        this.phase = 'boss'; this.spawnBoss();
      } else {
        this.reinT -= dt;
        if (this.reinT <= 0) {
          this.reinT = 3.2 / Math.max(.3, T.enemyRate);
          const live = this.count(e => e.ty.q && e.hold);
          if (live < 4) {
            for (const k of ['soldier', 'vehicle', 'air']) {
              const left = (q.need[k] || 0) - q.got[k];
              if (left > 0 && live < 4) { this.reinforce(k, Math.min(left, 3)); break; }
            }
            if (!objMet && !this.ents.some(e => e.t === 'mast' && !e.dead)) { /* masts gone but unmet: impossible */ }
          }
        }
      }
    }
    if (this.phase === 'boss' && this.bossEnt && this.bossEnt.dead) { this.phase = 'clear'; this.endT = 0; this.finish(); }
    if (this.actives.length && this.actives.every(p => p.down) && this.phase !== 'fail') { this.phase = 'fail'; this.endT = 0; this.ev({ k: 'fail' }); }
  }
  reinforce(kind, n) {
    const st = this.st, pool = (st.reinforce && st.reinforce[kind]) || (kind === 'soldier' ? ['rifleman'] : kind === 'vehicle' ? ['jeep'] : ['heli']);
    for (let i = 0; i < n; i++) {
      const t = pool[Math.floor(this.r() * pool.length)];
      this.spawn(t, { side: this.r() < .5 ? 'L' : 'R', dz: this.rr(150, 320), n: 1 });
    }
  }
  spawnBoss() {
    const b = B[this.st.boss], hpScale = 1 + .55 * (this.actives.length - 1);
    const e = this.spawn('boss', { lx: 0, dz: b.dz + 120, hold: true });
    e.boss = b; e.hp = e.hpMax = Math.round(b.hp * hpScale * T.bossHp * this.diff.hp);
    e.ty = Object.assign({}, TY.boss, { w: b.w * b.sc, h: b.h * b.sc }); e.wp = { dx: b.wp.dx * b.sc, dy: b.wp.dy * b.sc, r: b.wp.r * b.sc }; e.ph = 0; e.st = 'enter'; e.dz0 = b.dz; e.stun = 0; e.cdA = 2; e.hold = true;
    this.bossEnt = e;
    this.radio(this.st.bossSay); this.ev({ k: 'boss', name: b.name });
  }
  finish() {
    const heal = this.st.clearHeal * T.healClear * this.diff.heal;
    for (const p of this.players) if (p.active) {
      p.down = false; p.dmg = Math.max(0, p.dmg - heal);
      if (this.st.refill) { p.spares = Math.max(p.spares, T.spare); p.grenades = Math.max(p.grenades, T.grenades); p.mag = T.magSize; }
    }
    this.ev({ k: 'clear', op: this.opIx });
  }

  // ---- players: weapon, grenades, reload ----
  stepPlayers(dt, frames) {
    for (const p of this.players) {
      if (!p.active) continue;
      const f = frames[p.pid];
      if (p.hitT > 0) p.hitT -= dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.fury > 0) p.fury -= dt;
      if (f) { p.x = clamp(f.x, 0, WP.W - 1); p.y = clamp(f.y, 0, WP.H - 1); }
      p.cd -= dt; p.gcd -= dt; p.dry -= dt;
      p.bloom = Math.max(0, p.bloom - dt * 18);
      if (p.down || !f || this.phase !== 'rail' && this.phase !== 'boss') { p.fireHeld = false; if (p.reload > 0 && p.down) p.reload = 0; continue; }
      if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) this.finishReload(p); }
      if (f.reload && p.reload <= 0 && p.mag < T.magSize && (p.spares > 0 || this.cheat.ammo)) this.startReload(p);
      if (f.grenade && p.gcd <= 0 && (p.grenades > 0 || this.cheat.ammo)) this.throwGrenade(p);
      if (f.snap) this.snap(p);
      const rate = 9 * T.fireRate * (p.fury > 0 ? 1.8 : 1);
      p.fireHeld = !!f.fire;
      if (f.fire && p.reload <= 0) {
        if (p.mag <= 0 && p.fury <= 0 && !this.cheat.ammo) {
          if (p.spares > 0 && WP.opts.autoReload !== false) this.startReload(p);
          else if (p.dry <= 0) { p.dry = .35; this.ev({ k: 'dry', pid: p.pid }); }
        } else {
          let guard = 4;
          while (p.cd <= 0 && guard-- > 0 && (p.mag > 0 || p.fury > 0 || this.cheat.ammo)) { this.fire(p); p.cd += 1 / rate; }
        }
      }
      if (p.cd < -.2) p.cd = -.05;
      // out of everything: the emergency drop
    }
    const al = this.alive();
    if (al.length && al.every(p => p.mag <= 0 && p.spares <= 0 && p.grenades <= 0 && p.fury <= 0)) {
      this.emergT += dt;
      if (this.emergT > 3.5 && this.diff.emergency) { this.emergT = -8; this.radio('drop'); this.pickup('mag', this.cam.x + this.rr(-40, 40), this.cam.y - 120, 90, { vz: 0 }).st = 'dropping'; }
    } else this.emergT = Math.min(0, this.emergT);
  }
  startReload(p) { p.reload = T.reloadTime; this.ev({ k: 'reload', pid: p.pid }); }
  finishReload(p) {
    if (this.cheat.ammo) { p.mag = T.magSize; return; }
    if (p.spares > 0) { p.spares--; p.mag = T.magSize; this.ev({ k: 'reloaded', pid: p.pid }); }
  }
  snap(p) {
    let best = null, bs = -1;
    for (const e of this.ents) {
      if (e.dead || e.st === 'dying') continue;
      const k = e.ty.kind; let s = -1;
      if (k === 'proj') s = 100 - e.a / e.T * 0 + (e.a / e.T) * 50;
      else if (k === 'inf' || k === 'veh' || k === 'air' || k === 'boss') { if (e.st === 'hide' || e.st === 'rise') continue; s = 20 + (e.aimTot > 0 ? 60 * (e.aim / e.aimTot) : 0) - e.dz / 80; if (k === 'boss') s += 10; }
      else if (k === 'pickup') s = 15;
      if (s > bs) { bs = s; best = e; }
    }
    if (!best) return;
    const c = this.center(best, true);
    if (c) { p.x = c.x; p.y = c.y; this.ev({ k: 'snap', pid: p.pid }); }
  }
  // screen center of an entity's hit zone (or its weak point)
  center(e, weak) {
    const ty = e.ty;
    let zc = e.z + ty.h * .55;
    if (weak && e.boss) { const w = e.wp; const pr = this.proj(e.x + w.dx, e.y, e.z + w.dy); return pr ? { x: pr[0], y: pr[1], k: pr[2] } : null; }
    if (weak && ty.head) zc = e.z + ty.h * .88;
    const pr = this.proj(e.x, e.y, zc);
    return pr ? { x: pr[0], y: pr[1], k: pr[2] } : null;
  }
  hitShape(e) {
    const ty = e.ty, k = ty.kind;
    let h = ty.h, w = ty.w, z = e.z;
    if (ty.beh === 'popup') { h = ty.h * e.up; z = e.z + ty.h - h; }
    const pr = this.proj(e.x, e.y, z + h / 2);
    if (!pr) return null;
    const s = pr[2];
    let hw = Math.max(w * s / 2, k === 'proj' ? 8 : k === 'pickup' ? 9 : 5), hh = Math.max(h * s / 2, k === 'proj' ? 8 : k === 'pickup' ? 9 : 5);
    return { x: pr[0], y: pr[1], hw, hh, k: s };
  }
  fire(p) {
    if (p.fury <= 0 && !this.cheat.ammo) p.mag--;
    p.shots++; this.stats.shotsFired++; p.lastFire = this.t;
    p.bloom = Math.min(10, p.bloom + 1.1);
    const sp = (2 + p.bloom) * T.bloom;
    const a = this.r() * Math.PI * 2, rr = Math.sqrt(this.r()) * sp;
    const sx = p.x + Math.cos(a) * rr, sy = p.y + Math.sin(a) * rr;
    const res = this.shoot(sx, sy, p, 1);
    this.ev({ k: 'shot', pid: p.pid, x: sx, y: sy, hit: res });
  }
  // resolve one shot at a screen point; returns what it hit
  shoot(sx, sy, p, power) {
    // priority 1: projectiles and pickups (small, must be shootable)
    let cand = null, best = 1e9;
    for (const e of this.ents) {
      if (e.dead || e.st === 'dying') continue;
      const k = e.ty.kind; if (k !== 'proj' && k !== 'pickup') continue;
      const hs = this.hitShape(e); if (!hs) continue;
      if (Math.abs(sx - hs.x) <= hs.hw && Math.abs(sy - hs.y) <= hs.hh) { const d = Math.hypot(sx - hs.x, sy - hs.y); if (d < best) { best = d; cand = e; } }
    }
    if (cand) { this.damage(cand, 1, p, false); return cand.ty.kind; }
    // priority 2: everything else, nearest first
    const list = [];
    for (const e of this.ents) {
      if (e.dead || e.st === 'dying') continue;
      const k = e.ty.kind; if (k === 'proj' || k === 'pickup') continue;
      if (e.ty.beh === 'popup' && (e.st === 'hide' || e.up < .5)) continue;
      if (e.t === 'cover' || k === 'prop' || k === 'civ' || k === 'host' || k === 'animal' || k === 'inf' || k === 'veh' || k === 'air' || k === 'boss') list.push(e);
    }
    list.sort((a, b) => b.y - a.y);   // y larger = nearer
    for (const e of list) {
      const hs = this.hitShape(e); if (!hs) continue;
      let weakHit = false;
      if (e.boss) { const w = e.wp, pr = this.proj(e.x + w.dx, e.y, e.z + w.dy); weakHit = !!pr && Math.hypot(sx - pr[0], sy - pr[1]) <= Math.max(5, w.r * pr[2]); }
      if (!weakHit && (Math.abs(sx - hs.x) > hs.hw || Math.abs(sy - hs.y) > hs.hh)) continue;
      if (e.t === 'cover') { this.ev({ k: 'spark', x: sx, y: sy }); return 'cover'; }
      let dmg = power * T.playerDmg * (p && p.fury > 0 ? 1.3 : 1), head = false, weak = false;
      if (e.ty.head || e.ty.kind === 'inf') { if (sy < hs.y - hs.hh * .45) { head = true; dmg *= e.ty.headMult || 2.2; } }
      if (e.boss) { if (weakHit) { weak = true; dmg *= e.boss.mult * (e.stun > 0 ? 1.5 : 1); } else dmg *= .3; }
      this.damage(e, dmg, p, head, weak, sx, sy);
      return e.ty.kind;
    }
    return null;
  }
  damage(e, dmg, p, head, weak, sx, sy) {
    if (e.dead || e.st === 'dying') return;
    const k = e.ty.kind;
    if (p) { p.hits++; this.stats.shotsHit++; if (head) p.heads++; }
    e.hp -= dmg; e.flash = .09;
    if (e.boss) { e.stagDmg = (e.stagDmg || 0) + (weak ? dmg : 0); }
    this.ev({ k: 'hit', id: e.id, t: e.t, x: sx, y: sy, head, weak, kind: k });
    if (k === 'host' || k === 'civ') { this.civilianHit(e, p); return; }
    if (k === 'animal') { this.animalHit(e, p); return; }
    if (e.hp <= 0) this.kill(e, p, head);
  }
  civilianHit(e, p) {
    const pen = e.ty.kind === 'host' ? 22 : 12;
    this.kill(e, p, false, true);
    if (e.ty.kind === 'host') { this.stats.hostHits++; this.host.lost++; } else this.stats.civHits++;
    if (p) { p.dmg = Math.min(100, p.dmg + pen * T.civPenalty * (this.cheat.inv ? 0 : 1)); p.score = Math.max(0, p.score - Math.round((e.ty.kind === 'host' ? 1000 : 500) * T.civPenalty)); p.streak = 0; p.civ++; p.hitT = .4;
      if (p.dmg >= 100 && !p.down) { p.down = true; this.ev({ k: 'down', pid: p.pid }); } }
    this.ev({ k: 'civ', id: e.id, host: e.ty.kind === 'host', pid: p ? p.pid : -1 });
    this.radio(e.ty.kind === 'host' ? 'civ' : 'civ');
  }
  animalHit(e, p) {
    if (e.st === 'flee') return;
    e.st = 'flee'; e.dir = (e.lx >= 0 ? 1 : -1); e.hp = 99; e.speed = 80;
    this.pickup(e.carry || 'mag', e.x, e.y, 8, { vz: 90 });
    this.ev({ k: 'animal', id: e.id, x: e.x, y: e.y });
    if (p) p.score += 50;
  }
  addScore(p, pts, e) {
    if (!p) return;
    const mult = 1 + Math.min(4, Math.floor(p.streak / 5));
    p.score += pts * mult;
    this.ev({ k: 'score', pid: p.pid, pts: pts * mult, id: e ? e.id : 0, x: e ? e.x : null, y: e ? e.y : null, z: e ? e.z + e.ty.h : null });
  }
  kill(e, p, head, silent) {
    if (e.st === 'dying' || e.dead) return;
    const ty = e.ty, k = ty.kind;
    e.st = 'dying'; e.stT = 0; e.hp = 0; e.aim = 0; e.aimTot = 0;
    if (k === 'proj') {
      e.dead = true;
      this.ev({ k: 'explode', x: e.x, y: e.y, z: e.z, size: e.t === 'shell' ? 14 : 8 });
      this.addScore(p, ty.score, e);
      if (p) p.streak++;
      return;
    }
    if (k === 'pickup') { e.dead = true; this.collect(e, p); return; }
    if (silent) { return; }
    if (p) { p.kills++; p.streak++; p.best = Math.max(p.best, p.streak); }
    this.stats.kills++;
    let pts = ty.score + (head ? 50 : 0);
    this.addScore(p, pts, e);
    if (ty.q) this.q.got[ty.q]++;
    this.ev({ k: 'kill', id: e.id, t: e.t, by: p ? p.pid : -1, head, x: e.x, y: e.y, z: e.z });
    if (k === 'veh' || k === 'air' || k === 'boss' || ty.boom) {
      this.ev({ k: 'explode', x: e.x, y: e.y, z: e.z + ty.h / 2, size: k === 'boss' ? 30 : ty.boom ? 18 : 16 });
      e.dead = !(k === 'boss');
    }
    if (ty.boom) { this.boom(e.x, e.y, e.z, ty.boom, 10, p); }
    if (ty.obj) { this.stats.masts++; if (this.stats.masts < this.stats.mastTotal) this.radio('op1.mast'); }
    if (e.t === 'jeep') for (let i = 0; i < ty.riders; i++) this.spawn('rifleman', { lx: e.lx + (i ? 18 : -18), dz: e.dz, hold: true, tx: e.lx + (i ? 24 : -24) });
    // drops
    if (e.drop || ty.drop || this.r() < .08 * T.dropRate * (this.diff.supply)) {
      const kind = e.drop || ty.drop || this.randDrop(p);
      this.pickup(kind, e.x, e.y, (e.z || 0) + ty.h / 2, { vz: 90 });
    }
    if (k === 'boss') { this.freezeT = .5; e.stT = 0; e.st = 'dying'; }
  }
  randDrop(p) {
    const roll = this.r();
    if (roll < .45) return 'mag'; if (roll < .65) return 'gren'; if (roll < .8) return 'med'; if (roll < .88) return 'fury'; if (roll < .94) return 'tnt'; return 'medal';
  }
  // area damage at world point
  boom(x, y, z, R, dmg, p) {
    for (const e of this.ents) {
      if (e.dead || e.st === 'dying') continue;
      const k = e.ty.kind; if (k === 'pickup') continue;
      const d = Math.hypot(e.x - x, (e.y - y) * 1.0, (e.z - z) * .5);
      if (d > R) continue;
      const f = 1 - d / (R * 1.2);
      if (k === 'proj') { this.kill(e, p); continue; }
      if (k === 'cover') continue;
      this.damage(e, dmg * f * (k === 'inf' ? 1.3 : 1) * (e.boss ? .6 : 1), p, false, false);
    }
    // the blast hurts nearby players only when it is a prop explosion close to the camera
    if (Math.hypot(x - this.cam.x, y - this.cam.y) < R * .5) for (const q of this.alive()) this.hurt(q, 8, 'blast');
  }
  throwGrenade(p) {
    if (!this.cheat.ammo) p.grenades--;
    p.gcd = .6;
    // target: the floor under the crosshair, or the thing under it
    let tx, ty;
    const fl = this.m7.toFloor(p.x, p.y);
    if (fl) { tx = fl[0]; ty = fl[1]; } else { tx = this.cam.x; ty = this.cam.y - 700; }
    let near = null, nd = 1e9;
    for (const e of this.ents) { if (e.dead || e.st === 'dying' || !(e.ty.q || e.boss || e.ty.kind === 'proj')) continue; const c = this.center(e); if (!c) continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < 22 && d < nd) { nd = d; near = e; } }
    if (near) { tx = near.x; ty = near.y; }
    ty = Math.min(ty, this.cam.y - 60);
    this.gpend.push({ at: this.t + .55, pid: p.pid, x: tx, y: ty });
    this.ev({ k: 'gthrow', pid: p.pid, x: p.x, y: p.y });
  }
  collect(e, p) {
    if (!p || !p.active) return;
    const k = e.pkind;
    if (k === 'mag') { p.spares = Math.min(9, p.spares + 1); if (p.mag <= 0 && p.reload <= 0) this.startReload(p); }
    else if (k === 'gren') p.grenades = Math.min(9, p.grenades + 2);
    else if (k === 'med') p.dmg = Math.max(0, p.dmg - 30);
    else if (k === 'fury') { p.fury = T.furyTime; this.radio('fury'); }
    else if (k === 'tnt') this.dynamite(p);
    else if (k === 'medal') this.addScore(p, 500, e);
    if (k !== 'tnt') this.ev({ k: 'pickup', pid: p.pid, kind: k, x: e.x, y: e.y });
  }
  dynamite(p) {
    this.ev({ k: 'tnt', pid: p.pid });
    for (const e of this.ents.slice()) {
      if (e.dead || e.st === 'dying') continue;
      const kd = e.ty.kind;
      if (kd === 'inf' || kd === 'veh' || kd === 'air') this.damage(e, 9, p, false);
      else if (kd === 'boss') this.damage(e, e.hpMax * .06, p, false, false);
      else if (kd === 'proj') this.kill(e, p);
      else if (kd === 'civ' || kd === 'host') { if (this.proj(e.x, e.y, e.z)) this.civilianHit(e, p); }
      else if (kd === 'prop') this.damage(e, 5, p, false);
    }
  }

  // ---- entity behaviors ----
  stepEnts(dt, frozen) {
    const cam = this.cam;
    for (const e of this.ents.slice()) {
      if (e.dead) continue;
      e.age += dt; e.stT += dt; if (e.flash > 0) e.flash -= dt;
      const k = e.ty.kind;
      if (e.st === 'dying') {
        if (k === 'boss') { e.dying = (e.dying || 0) + dt; if (Math.random() < 0) { /* never */ } if (Math.floor(e.dying * 9) !== Math.floor((e.dying - dt) * 9)) this.ev({ k: 'explode', x: e.x + this.rr(-30, 30), y: e.y, z: e.z + this.rr(5, 40), size: 14 }); if (e.dying > 2.4) { this.ev({ k: 'explode', x: e.x, y: e.y, z: e.z + 20, size: 36 }); e.dead = true; } }
        else if (e.stT > (k === 'inf' ? .9 : .5)) e.dead = true;
        if (e.anc) this.place(e);
        continue;
      }
      if (frozen && k !== 'proj') { if (e.anc) this.place(e); continue; }
      switch (k) {
        case 'inf': case 'veh': case 'air': this.stepEnemy(e, dt); break;
        case 'boss': this.stepBoss(e, dt); break;
        case 'civ': case 'host': case 'animal': this.stepFriend(e, dt); break;
        case 'proj': this.stepProj(e, dt); break;
        case 'pickup': this.stepPickup(e, dt); break;
        case 'prop': case 'cover': if (e.y > cam.y + 30 || (this.st.travel === 'x' && e.x < cam.x - 700)) e.dead = true; break;
      }
      if (e.anc) this.place(e);
    }
  }
  stepEnemy(e, dt) {
    const ty = e.ty, hw = this.halfW(e.dz);
    // attack-phase machine shared by all shooters
    const startAim = (tele) => {
      e.tgt = this.pickTarget(e);
      if (!e.tgt) { e.cd = 1; return; }
      e.st = 'aim'; e.stT = 0; e.aimTot = tele * T.teleTime; e.aim = 0;
      this.ev({ k: 'tele', id: e.id, x: e.x, y: e.y });
    };
    const aimTick = (done) => {
      e.aim += dt;
      if (e.aim >= e.aimTot) { e.aim = 0; e.aimTot = 0; done(); }
    };
    switch (ty.beh) {
      case 'walk': {
        if (e.st === 'enter') { const dx = e.tx - e.lx; e.lx += Math.sign(dx) * Math.min(Math.abs(dx), ty.speed * dt); e.dir = Math.sign(dx) || e.dir; if (Math.abs(dx) < 1) { e.st = 'rest'; e.stT = 0; e.cd = this.rr(.2, .8); } }
        else if (e.st === 'rest') { e.cd -= dt; if (e.life -= dt, e.life < 0) { e.st = 'leave'; } else if (e.cd <= 0) startAim(ty.tele); }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'rest'; e.cd = this.rr(.7, 1.6); });
        else if (e.st === 'leave') { e.dir = e.lx >= 0 ? 1 : -1; e.lx += e.dir * ty.speed * 1.6 * dt; if (Math.abs(e.lx) > hw + 50) e.dead = true; }
        break;
      }
      case 'static': {
        if (e.st === 'enter') { e.st = 'rest'; e.cd = this.rr(.5, 1.5); }
        if (e.st === 'rest') { e.cd -= dt; if (e.cd <= 0) startAim(ty.tele); }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'rest'; e.cd = this.rr(2, 3.5); });
        break;
      }
      case 'popup': {
        const cov = this.byId(e.cov);
        if (!cov || cov.dead) { e.hp = 0; this.kill(e, null); break; }
        e.x = cov.x; e.y = cov.y - 3; e.dz = this.cam.y - e.y; e.lx = e.x - this.cam.x;
        if (e.st === 'hide') { e.up = Math.max(0, e.up - dt * 4); e.stT += 0; if (e.stT > e.cd + 1.2) { e.st = 'rise'; e.stT = 0; } }
        else if (e.st === 'rise') { e.up = Math.min(1, e.up + dt * 3.5); if (e.up >= 1) startAim(ty.tele); }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'up'; e.stT = 0; });
        else if (e.st === 'up') { if (e.stT > .6) { e.st = 'hide'; e.stT = 0; e.cd = this.rr(.2, 1.4); } }
        if (e.st === 'enter') { e.st = 'hide'; }
        break;
      }
      case 'throw': {
        if (e.st === 'enter') {
          const dx = e.tx - e.lx; e.lx += Math.sign(dx) * Math.min(Math.abs(dx), ty.speed * dt);
          if (e.dz > ty.near) e.dz -= Math.min(e.dz - ty.near, 30 * dt);
          if (Math.abs(dx) < 2 && e.dz <= ty.near + 1 || e.stT > 5) { e.st = 'rest'; e.cd = this.rr(.3, 1); }
        } else if (e.st === 'rest') { e.cd -= dt; e.life -= dt; if (e.life < -2) e.st = 'leave'; else if (e.cd <= 0) startAim(ty.tele); }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'rest'; e.cd = ty.every * this.rr(.8, 1.2); });
        else if (e.st === 'leave') { e.dir = e.lx >= 0 ? 1 : -1; e.lx += e.dir * ty.speed * 1.8 * dt; if (Math.abs(e.lx) > hw + 50) e.dead = true; }
        break;
      }
      case 'drive': {
        if (e.st === 'enter') e.st = 'go';
        if (e.st === 'go' || e.st === 'rest') {
          if (e.st === 'go') { e.lx += e.dir * ty.speed * dt; if (Math.abs(e.lx - e.tx) < 2 || e.stT > 40) e.dead = true; }
          e.cd -= dt;
          if (e.cd <= 0 && Math.abs(e.lx) < hw * .9) { startAim(ty.tele); e.cd = 99; }
        }
        if (e.st === 'aim') { e.lx += e.dir * ty.speed * .7 * dt; aimTick(() => { this.enemyAttack(e); e.st = 'go'; e.cd = this.rr(1.2, 2.2); }); }
        break;
      }
      case 'boat': {
        if (e.st === 'enter') e.st = 'go';
        if (e.dz > e.dzTarget) e.dz -= ty.speed * dt;
        e.lx += Math.sin(e.age * .6 + e.seed * 6) * 10 * dt;
        e.lx += (Math.abs(e.lx) > hw * .7 ? -Math.sign(e.lx) : 0) * 20 * dt;
        if (e.st === 'go') { e.cd -= dt; if (e.cd <= 0 && e.dz < e.dzTarget + 80) startAim(ty.tele); }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'go'; e.cd = this.rr(1.2, 2.4); });
        if (e.age > 70) e.dead = true;
        break;
      }
      case 'heli': {
        e.z = e.baseZ + Math.sin(e.age * 1.3) * 5;
        if (e.st === 'enter') { const dx = e.tx - e.lx; e.lx += Math.sign(dx) * Math.min(Math.abs(dx), ty.speed * dt); if (e.dz > 200) e.dz -= 40 * dt; if (Math.abs(dx) < 2) { e.st = 'rest'; e.cd = 1.2; e.tx = this.rr(-.6, .6) * hw; } }
        else if (e.st === 'rest') { const dx = e.tx - e.lx; e.lx += Math.sign(dx) * Math.min(Math.abs(dx), ty.speed * .6 * dt); e.cd -= dt; if (e.cd <= 0) startAim(ty.tele); if (Math.abs(dx) < 2) e.tx = this.rr(-.6, .6) * hw; }
        else if (e.st === 'aim') aimTick(() => { this.enemyAttack(e); e.st = 'rest'; e.cd = ty.every * this.rr(.8, 1.2); });
        break;
      }
    }
    if (e.st === 'aim' && e.tgt && e.tgt.h) { const h = this.byId(e.tgt.h); if (!h || h.dead || h.st === 'dying') { e.tgt = this.pickTarget(e); } }
  }
  // the attack at the end of a telegraph
  enemyAttack(e, spec) {
    const ty = e.ty, tgt = e.tgt; if (!tgt) return;
    const at = spec || ty;
    const kind = ty.atk;
    const p = tgt.p != null ? this.players[tgt.p] : null;
    const hostT = tgt.h ? this.byId(tgt.h) : null;
    if (tgt.h && (!hostT || hostT.dead || hostT.st === 'dying')) return;
    const from = { x: e.x, y: e.y, z: e.z + ty.h * .7 };
    this.ev({ k: 'efire', id: e.id, t: e.t, x: e.x, y: e.y, z: from.z, atk: kind });
    if (kind === 'shot' || kind === 'burst') {
      const n = kind === 'burst' ? ty.burst : 1;
      const acc = clamp(ty.acc * T.enemyAcc * this.diff.acc * clamp(1.25 - e.dz / 1400, .5, 1.1), 0, .98);
      for (let i = 0; i < n; i++) {
        if (this.r() < acc) {
          if (hostT) { this.kill(hostT, null, false, true); this.host.lost++; this.stats.hostHits++; this.ev({ k: 'hostdead', id: hostT.id }); }
          else this.hurt(p, ty.dmg, 'shot');
        } else this.ev({ k: 'miss', x: e.x, y: e.y });
      }
    } else {
      const fl = kind === 'grenade' ? 1.5 : kind === 'knife' ? .95 : kind === 'missile' ? 1.8 : 2;
      this.proj_(kind, from, p, fl / Math.max(.6, 1), ty.dmg, { host: hostT });
    }
  }
  stepProj(e, dt) {
    e.a += dt;
    const u = Math.min(1, e.a / e.T);
    e.x = lerp(e.fx, e.tx, u); e.y = lerp(e.fy, e.tyy, u); e.z = lerp(e.fz, e.tz, u) + Math.sin(u * Math.PI) * e.arc;
    if (u >= 1) {
      e.dead = true;
      const big = e.t === 'grenade' || e.t === 'shell' || e.t === 'missile';
      this.ev({ k: 'impact', x: e.x, y: e.y, z: e.z, big, t: e.t });
      if (e.hid) { const h = this.byId(e.hid); if (h && !h.dead && h.st !== 'dying') { this.kill(h, null, false, true); this.host.lost++; this.stats.hostHits++; this.ev({ k: 'hostdead', id: h.id }); } }
      else {
        const p = this.players[e.pid];
        if (p) this.hurt(p, e.dmg, e.t);
        if (big && e.t !== 'shell') for (const q of this.alive()) if (q !== p && this.players.length > 1) this.hurt(q, e.dmg * .3, e.t);
      }
    }
  }
  stepPickup(e, dt) {
    if (e.st === 'dropping') { e.z -= 30 * dt; if (e.z <= 6) { e.z = 6; e.st = 'pk'; e.vz = 0; } e.life -= dt * .3; }
    else { e.z += e.vz * dt; e.vz -= 260 * dt; if (e.z <= 6) { e.z = 6; e.vz = e.vz < -30 ? -e.vz * .4 : 0; } }
    e.life -= dt; if (e.life <= 0) e.dead = true;
  }
  stepFriend(e, dt) {
    const ty = e.ty, hw = this.halfW(e.dz);
    if (ty.beh === 'run') {
      e.lx += ty.speed * dt; e.dir = 1;
      if (e.lx > hw + 20) { e.dead = true; this.host.saved++; this.host.exited++; this.ev({ k: 'saved', id: e.id }); }
      return;
    }
    if (e.st === 'flee') { e.lx += e.dir * 80 * dt; if (Math.abs(e.lx) > hw + 60) e.dead = true; return; }
    e.lx += e.dir * ty.speed * dt;
    if (Math.abs(e.lx) > hw + 60) e.dead = true;
  }
  stepBoss(e, dt) {
    const b = e.boss, hw = this.halfW(e.dz);
    if (e.stun > 0) e.stun -= dt;
    const frac = e.hp / e.hpMax;
    let ph = 0; for (let i = 0; i < b.phases.length; i++) if (frac <= b.phases[i].at) ph = i;
    if (ph !== e.ph) { e.ph = ph; this.ev({ k: 'phase', n: ph }); e.cdA = Math.min(e.cdA, 1.2); }
    if (e.st === 'enter') { e.dz -= 50 * dt; if (e.dz <= e.dz0) { e.dz = e.dz0; e.st = 'idle'; e.cdA = 1.5; } return; }
    // sway
    if (e.st !== 'stun') e.lx = Math.sin(e.age * .45) * hw * .35;
    if (e.stun > 0) { e.st = 'stun'; e.aim = 0; e.aimTot = 0; return; }
    if (e.st === 'stun') { e.st = 'idle'; e.cdA = 1.2; }
    if (e.st === 'idle') {
      e.cdA -= dt;
      if (e.cdA <= 0) {
        const atks = b.phases[e.ph].atks; e.atk = atks[Math.floor(this.r() * atks.length)];
        const a = ATK[e.atk]; e.tgt = this.pickTarget(e); if (!e.tgt) { e.cdA = 1; return; }
        e.st = 'aim'; e.aimTot = a.tele * T.teleTime; e.aim = 0; e.stagDmg = 0; this.ev({ k: 'tele', id: e.id, x: e.x, y: e.y, big: e.atk === 'sweep' });
      }
    } else if (e.st === 'aim') {
      e.aim += dt;
      const a = ATK[e.atk];
      if (e.atk === 'sweep' && e.stagDmg >= a.stag * (1 + 0.4 * (this.actives.length - 1))) { e.stun = 3; e.aim = 0; e.aimTot = 0; e.st = 'stun'; this.ev({ k: 'stagger' }); return; }
      if (e.aim >= e.aimTot) {
        e.aim = 0; e.aimTot = 0;
        const p = e.tgt && e.tgt.p != null ? this.players[e.tgt.p] : this.alive()[0];
        const from = { x: e.x + e.wp.dx * .5, y: e.y, z: e.z + e.ty.h * .6 };
        this.ev({ k: 'efire', id: e.id, t: 'boss', x: e.x, y: e.y, z: from.z, atk: e.atk });
        if (e.atk === 'burst') { e.burstLeft = a.n; e.burstT = 0; e.st = 'burst'; return; }
        if (e.atk === 'shell') this.proj_('shell', from, p, a.flight, a.dmg);
        else if (e.atk === 'summon') { for (let i = 0; i < a.n; i++) this.spawn(a.type, { side: i % 2 ? 'L' : 'R', dz: this.rr(140, 220), hold: true }); }
        else if (e.atk === 'sweep') for (const q of this.alive()) this.hurt(q, a.dmg, 'sweep');
        e.st = 'idle'; e.cdA = this.rr(1.4, 2.4);
      }
    } else if (e.st === 'burst') {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burstT = ATK.burst.int; e.burstLeft--;
        const p = e.tgt && e.tgt.p != null ? this.players[e.tgt.p] : this.alive()[0];
        if (this.r() < clamp(.75 * T.enemyAcc * this.diff.acc, 0, .98)) this.hurt(p, ATK.burst.dmg, 'burst');
        this.ev({ k: 'efire', id: e.id, t: 'boss', x: e.x, y: e.y, z: e.z + 20, atk: 'burst' });
        if (e.burstLeft <= 0) { e.st = 'idle'; e.cdA = this.rr(1.2, 2.2); }
      }
    }
  }
  stepSupply(dt) {
    this.supplyT -= dt;
    // delayed grenades
    for (let i = this.gpend.length - 1; i >= 0; i--) {
      const g = this.gpend[i];
      if (this.t >= g.at) {
        this.gpend.splice(i, 1);
        const R = 60 * T.grenRadius;
        this.ev({ k: 'explode', x: g.x, y: g.y, z: 6, size: 24, gren: true });
        this.boom(g.x, g.y, 0, R, 14, this.players[g.pid]);
      }
    }
    if (this.supplyT > 0 || this.phase !== 'rail' && this.phase !== 'boss') return;
    this.supplyT = 13 / this.diff.supply / Math.max(.3, T.dropRate || .01);
    if (T.dropRate <= 0) return;
    const al = this.alive();
    const low = al.some(p => p.spares <= 1 && p.mag < T.magSize * .5 || p.grenades === 0);
    if (!low) return;
    if (this.count(e => e.t === 'crate' || e.ty.kind === 'animal') >= 2) return;
    const animals = this.st.animals || ['goat'];
    if (this.r() < .5) this.spawn(animals[Math.floor(this.r() * animals.length)], { side: this.r() < .5 ? 'L' : 'R', dz: this.rr(90, 170), carry: this.r() < .5 ? 'mag' : 'gren' });
    else { const c = this.spawn('crate', { lx: this.rr(-.5, .5) * this.halfW(120), dz: 120, drop: this.r() < .7 ? 'mag' : 'gren', world: true }); }
    this.radio('low.ammo');
  }
  reap() {
    this.ents = this.ents.filter(e => !e.dead);
  }

  // ---- jumping (dev mode, attract mode, tests) ----
  jump(d) {
    const st = this.st; this.d = clamp(d, 0, st.len);
    this.beatIx = st.beats.findIndex(b => b.at >= this.d); if (this.beatIx < 0) this.beatIx = st.beats.length;
    this.holdIx = st.holds.findIndex(h => h.d >= this.d); if (this.holdIx < 0) this.holdIx = st.holds.length;
    this.hold = null; this.pend.length = 0;
    this.ents = this.ents.filter(e => e.ty.kind === 'prop' || e.ty.kind === 'cover' || e.ty.kind === 'pickup');
    this.stepRail(0);
  }
  skipToBoss() {
    const st = this.st; this.d = st.len; this.beatIx = st.beats.length; this.holdIx = st.holds.length; this.hold = null; this.pend.length = 0;
    for (const k in this.q.need) this.q.got[k] = this.q.need[k];
    for (const e of this.ents) { if (e.ty.obj) { e.dead = true; this.stats.masts++; } if (e.hold) e.dead = true; }
    this.stats.masts = this.stats.mastTotal; this.stepRail(0);
  }

  // ---- views for tests / the net ----
  snapshot() {
    return { op: this.opIx, d: Math.round(this.d), t: Math.round(this.t * 10) / 10, phase: this.phase, q: JSON.parse(JSON.stringify(this.q)), host: Object.assign({}, this.host), boss: this.bossEnt ? { hp: this.bossEnt.hp, max: this.bossEnt.hpMax, ph: this.bossEnt.ph, dead: !!this.bossEnt.dead } : null,
      counts: { ents: this.ents.length, enemies: this.count(e => e.ty.q), proj: this.count(e => e.ty.kind === 'proj'), pick: this.count(e => e.ty.kind === 'pickup') },
      players: this.players.filter(p => p.active).map(p => ({ pid: p.pid, dmg: Math.round(p.dmg), mag: p.mag, spares: p.spares, gren: p.grenades, score: p.score, streak: p.streak, down: p.down, fury: p.fury > 0 })), stats: this.stats };
  }
}
WP.Sim = Sim;
WP.ATK = ATK;
})();
