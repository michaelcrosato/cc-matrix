// Night Shift. The host simulates everything on 60 Hz fixed steps: enemies, drops, damage, waves, score.
// Clients own their own player. Messages (hard limits: JSON <= 16 KB, <= 20 messages/s per copy, unreliable <= 1200 bytes):
//   i client>host  12/s  own pose     a client>host  <=6/s reliable  actions
//   w host>all      9/s  snapshot     e host>all     <=8/s reliable  events
import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { Area } from '../game/area.js';
import { Enemy } from '../game/enemy.js';
import { Player } from '../game/player.js';
import { Humanoid } from '../game/actor.js';
import { Run } from '../core/run.js';
import { Intent } from '../core/intent.js';
import { fireWeapon, kickCone, knifeArc, takedownBurst, explode } from '../game/combat.js';
import { statsOf, WEAPON_ORDER } from '../data/weapons.js';
import { ENEMY_IDS } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { MapInfo } from '../game/mapPaint.js';
import { Projectile } from '../game/projectiles.js';
import { SONGS } from '../audio/songs.js';
import { openSettings } from '../screens/settings.js';
import { openResults } from '../screens/lobby.js';
import { openCard } from '../screens/card.js';
import { addToBoard } from '../core/save.js';

const { Vector3 } = THREE;
const Q = new MapInfo('quay');
export const ROUND_SECONDS = 240;
const CAP = 24;
const STATES = ['WORK', 'IDLE', 'ALERT', 'APPROACH', 'CIRCLE', 'WINDUP', 'ATTACK', 'RECOVER', 'STUN', 'KNEEL', 'FLINCH', 'KNOCKDOWN', 'GETUP', 'GRAB', 'VAULT', 'CLIMB', 'BASH', 'PIN', 'BLIND', 'THROWUP', 'SEA', 'RISE', 'CARRY', 'SCRIPT', 'LEDGE'];
const STATE_CODE = Object.fromEntries(STATES.map((s, i) => [s, i]));
const TYPE_CODE = Object.fromEntries(ENEMY_IDS.map((t, i) => [t, i]));
const SEAT_SCARF = ['red', 'blue', 'green', 'sand'];
const SEAT_COLOR = ['red', 'sky', 'lime', 'sand'];
const START_CELLS = [[28, 15], [31, 15], [28, 25], [31, 25]];
const F_AIM = 1; const F_RUN = 2; const F_DOWN = 4; const F_GONE = 8;
const REVIVE_TIME = 2;
const BLEED = 20;
const v1 = new Vector3(); const v2 = new Vector3();
const cm = (v) => Math.round(v * 100);

/** A fresh Night Shift loadout. */
export function shiftRun() {
  const r = new Run();
  r.addWeapon('scatter');
  r.case.resize(14, 8);
  r.case.add({ uid: 77001, id: 'scatter', qty: 1, x: -1, y: -1, rot: false });
  r.case.addStack('ammoPistol', 36);
  r.case.addStack('ammoShells', 10);
  r.giveItem('samphire');
  r.giveItem('samphire');
  r.giveItem('flare');
  for (const w of r.ownedWeapons()) r.weapons[w].tune = { power: 1, rate: 1, reload: 1, cap: 0 };
  return r;
}

/** Someone else's Max, on every copy. On the host it's a real target. */
class RemoteMax {
  constructor(area, info) {
    this.area = area;
    this.info = info;
    this.id = info.id;
    this.seat = info.id;
    this.isLocal = false;
    this.remote = true;
    this.alive = true;
    this.floor = 0;
    this.x = 0; this.z = 0; this.y = 0;
    this.px = 0; this.pz = 0;
    this.tx = 0; this.tz = 0; this.yaw = 0; this.tyaw = 0; this.pitch = 0;
    this.flags = 0;
    this.weapon = 0;
    this.hpv = 100;
    this.maxHp = 100;
    this.invuln = 0;
    this.gone = false;
    this.stats = newStats();
    this.actor = new Humanoid('max', { palette: { scarf: SEAT_SCARF[info.id % 4] } });
    area.ctx.scene.add(this.actor.root);
    this.actor.play('Idle');
    this.guns = this.actor.attach('HandR', 'w-pistol', { at: [0, -0.08, 0.02], rot: [Math.PI / 2, 0, 0] });
    this.downT = 0;
    this.lastPose = -1e9;
  }
  get hp() { return this.hpv; }
  get facing() { return this.yaw; }
  canBeGrabbed() { return false; }
  applySlow() {}
  /** Host only: the client doesn't decide its own health. */
  hurt(raw, from, o = {}) {
    if (!this.alive || this.invuln > 0 && !o.dot) return false;
    const dmg = raw * (o.dot ? 1 : 1);
    this.hpv -= dmg;
    if (!o.dot) { this.invuln = 0.55; this.area.event(['h', this.id, Math.round(from?.x ?? this.x), Math.round(from?.z ?? this.z)]); }
    if (this.hpv <= 0) this.area.downPlayer(this);
    return true;
  }
  pose(x, z, yaw, pitch, flags, weapon, t) {
    this.tx = x; this.tz = z; this.tyaw = yaw; this.pitch = pitch; this.flags = flags; this.weapon = weapon; this.lastPose = t;
  }
  frame(dt) {
    const k = Math.min(1, dt * 12);
    this.px = this.x; this.pz = this.z;
    this.x += (this.tx - this.x) * k;
    this.z += (this.tz - this.z) * k;
    let d = this.tyaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * k;
    const speed = dt > 0 ? Math.hypot(this.x - this.px, this.z - this.pz) / dt : 0;
    const root = this.actor.root;
    root.position.set(this.x, 0, this.z);
    root.rotation.y = this.yaw;
    const a = this.actor;
    if (this.flags & F_DOWN) { if (a.playing !== 'LieIdle') a.play('LieIdle', { fade: 0.3 }); }
    else if (speed > 0.3) a.loco(speed > 3.6 ? 'Run' : 'Walk', speed, { fade: 0.14 });
    else if (a.playing !== 'Idle') a.play('Idle', { fade: 0.2 });
    if (this.flags & F_AIM && !(this.flags & F_DOWN)) { if (a.overlay !== 'AimPistol') a.upper('AimPistol', { fade: 0.1 }); } else if (a.overlay) a.clearUpper();
    a.update(dt);
    root.visible = !this.gone;
    if (this.invuln > 0) this.invuln -= dt;
  }
}

/** On a client, an enemy is a view: same puppet, clips chosen from state, interpolated 120 ms behind. */
class GhostEnemy extends Enemy {
  constructor(area, id, type, x, z) {
    super(area, type, { x, z, state: 'APPROACH', noLoot: true });
    this.id = id;
    this.buf = [];
    this.ghost = true;
  }
  sample(t, x, z, yaw, state, hpPct) {
    this.buf.push({ t, x, z, yaw });
    if (this.buf.length > 6) this.buf.shift();
    this.hpPct = hpPct;
    if (this.state !== state) this.setRemoteState(state);
    this.seen = t;
  }
  setRemoteState(state) {
    if (['APPROACH', 'CIRCLE'].includes(state)) { this.state = state; return; }
    this.enter(state);
  }
  step() {
    const now = this.area.netClock() - 120;
    const b = this.buf;
    if (!b.length) return;
    let a0 = b[0]; let a1 = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) if (b[i].t <= now && b[i + 1].t >= now) { a0 = b[i]; a1 = b[i + 1]; break; }
    const span = Math.max(1, a1.t - a0.t);
    const f = Math.max(0, Math.min(1, (now - a0.t) / span));
    const ox = this.x; const oz = this.z;
    this.px = this.x; this.pz = this.z;
    this.x = a0.x + (a1.x - a0.x) * f;
    this.z = a0.z + (a1.z - a0.z) * f;
    this.yaw = a1.yaw;
    const speed = Math.hypot(this.x - ox, this.z - oz) * 60;
    if (this.state === 'APPROACH' || this.state === 'CIRCLE') this.playLoco(speed);
    if (this.body) this.commit();
  }
  hit() { return { killed: false }; }
  knockdown() {} kicked() {} blast() {} blind() {} walkToSea() {} damageRaw() {}
  kill() {
    if (this.dead) return;
    this.dead = true;
    this.removeBody();
    this.stopLoops();
    if (this.actor) this.actor.play('Death', { once: true, fade: 0.08 });
    if (this.crawlObj) this.crawlObj.visible = false;
    this.area.corpses.push(this);
    if (this.area.corpses.length > 16) this.area.removeCorpse(this.area.corpses.shift());
  }
}

const newStats = () => ({ score: 0, kills: 0, heads: 0, kicks: 0, revives: 0, shots: 0, hits: 0, combo: 1, comboT: 0 });

export class ShiftArena extends Area {
  // Night Shift has a clock, so it can't stand still; and a parcel here would land for one seat only.
  stepEmptyNet() {}

  constructor(o) {
    super('shift', { noSave: true, ...o });
    this.session = o.session;
    this.hub = !!o.hub;
    this.info = o.info;
    this.isHost = this.session.isHost;
    this.server = !!this.session.server;
    this.me = this.session.me;
    this.remotes = new Map();
    this.ghosts = new Map();
    this.teamScore = 0;
    this.wave = 0;
    this.clock = -3;
    this.over = false;
    this.outbox = [];
    this.sendI = 0; this.sendW = 0; this.sendE = 0; this.sendA = 0;
    this.actions = [];
    this.lastSnapT = -1;
    this.spawnedAt = {};
    this.downed = new Map();
    this.stats = {};
    this.netStats = { maxW: 0, sent: 0, windowStart: 0, windowCount: 0, maxRate: 0 };
    this.nextDrop = 1;
    this.dropsById = new Map();
  }

  // ---- Setup ----
  async setup(ctx) {
    app.init(ctx.engine);
    app.run = shiftRun();
    await super.setup(ctx);
    this.buildSeats();
    this.bindSession();
    if (this.server) this.fixedView = () => this.overviewCam();
    // Our own card goes up as soon as there is a world behind it. ready() follows when the first frame has drawn.
    if (this.hub) openCard(this, this.session);
  }

  setupCompanion() {}
  claimsParcel() {}
  checkpoint() {}

  buildPlayer() {
    if (this.server) { this.player = null; return; }
    const [c, r] = START_CELLS[this.me % 4];
    const x = this.level.info.x(c); const z = this.level.info.z(r);
    this.player = new Player(this, this.ctx, { x, z, yaw: Math.PI, store: this.run, seat: this.me, palette: { scarf: SEAT_SCARF[this.me % 4] } });
    this.players.push(this.player);
    this.cam.yaw = Math.PI;
    this.player.scarf.boxes.forEach((b) => { b.material = toonMaterial(PALETTE[SEAT_SCARF[this.me % 4]]); });
    this.stats[this.me] = newStats();
  }

  buildSeats() {
    for (const p of this.session.players) {
      if (p.id === this.me && !this.server) continue;
      const r = new RemoteMax(this, p);
      const [c, rr] = START_CELLS[p.id % 4];
      r.x = r.tx = this.level.info.x(c); r.z = r.tz = this.level.info.z(rr);
      this.remotes.set(p.id, r);
      this.stats[p.id] = r.stats;
      if (this.isHost) this.players.push(r);
    }
    this.seatOf = (id) => (id === this.me ? this.player : this.remotes.get(id));
  }

  bindSession() {
    const s = this.session;
    this.offs = [
      s.on('message', (data, from) => this.onMessage(data, from)),
      s.on('start', (e) => this.onStart(e)),
      s.on('leave', ({ id }) => this.onLeave(id)),
      s.on('time-up', () => { if (this.isHost) this.finishRound(false, 'time'); }),
      s.on('end', (e) => this.onEnd(e)),
    ];
  }

  ready(ctx) {
    super.ready(ctx);
    if (!this.readied) { this.readied = true; this.session.ready(); }
    app.syncTime();
  }

  overviewCam() {
    const t = this.ctx.time * 0.05;
    return { position: [Math.sin(t) * 26, 22, Math.cos(t) * 20], target: [0, 0, 0], fov: 50 };
  }

  netClock() { return this.session.time(); }

  onStart() { this.started = true; app.mix.play(SONGS.siege, 'siege', 0.4); }

  // ---- Network ----
  post(data, o) {
    if (this.over) return false;
    const n = this.netStats;
    const now = typeof performance !== 'undefined' ? performance.now() : this.ctx.time * 1000;
    if (now - n.windowStart > 1000) { n.windowStart = now; n.windowCount = 0; }
    n.windowCount++;
    n.maxRate = Math.max(n.maxRate, n.windowCount);
    return this.session.send(data, o);
  }

  onMessage(d, from) {
    if (!d || this.over) return;
    switch (d.k) {
      case 'i': { // Client pose
        if (!this.isHost) return;
        const r = this.remotes.get(from);
        if (r) r.pose(d.v[0] / 100, d.v[1] / 100, (d.v[2] * Math.PI) / 180, (d.v[3] * Math.PI) / 180, d.v[4], d.v[5], this.netClock());
        break;
      }
      case 'a': // Client actions
        if (this.isHost) for (const a of d.v) this.doAction2(a, from);
        break;
      case 'w':
        if (!this.isHost) this.applySnapshot(d);
        break;
      case 'e':
        if (!this.isHost) for (const ev of d.v) this.applyEvent(ev);
        break;
      default: break;
    }
  }

  /** Host: a client did something. */
  doAction2(a, from) {
    const r = this.remotes.get(from);
    if (!r || !r.alive) return;
    const st = r.stats;
    switch (a[0]) {
      case 'f': {
        const w = WEAPON_ORDER[a[1]] ?? 'pistol';
        const stats = statsOf(w, { tune: { power: 1, rate: 1, reload: 1 } });
        v1.set(a[2] / 100, a[3] / 100, a[4] / 100); v2.set(a[5] / 1000, a[6] / 1000, a[7] / 1000).normalize();
        st.shots++;
        const res = fireWeapon(this, r, stats, v1, v2, this.ctx.random);
        if (res.hits) st.hits++;
        break;
      }
      case 'k': {
        const e = this.enemies.find((x) => x.id === a[1]);
        if (e && !e.dead && Math.hypot(e.x - r.x, e.z - r.z) < 3.6) { kickCone(this, r, e); st.kicks++; this.addScore(r.id, 50); }
        break;
      }
      case 't': {
        const e = this.enemies.find((x) => x.id === a[1]);
        if (e && !e.dead && Math.hypot(e.x - r.x, e.z - r.z) < 3.2) { takedownBurst(this, r, e); st.kicks++; this.addScore(r.id, 50); }
        break;
      }
      case 'n': knifeArc(this, r, { damage: 8, reach: 2, arc: 1.3, downed: 3 }); break;
      case 'r': this.reviveTick(r, a[1]); break;
      case 'g': this.spawnGrenade(a[1], a[2] / 100, a[3] / 100, a[4] / 100, a[5] / 100); break;
      default: break;
    }
  }

  // ---- Host: round flow ----
  stepHost(dt) {
    this.director.maxActiveOverride = CAP;
    this.waveStep(dt);
    // Combo decay, drops collected by whoever walks over them, the bleed-out timers.
    for (const st of Object.values(this.stats)) { if (st.comboT > 0) { st.comboT -= dt; if (st.comboT <= 0) st.combo = 1; } }
    this.collectDrops();
    for (const [id, D] of this.downed) {
      D.t -= dt;
      if (D.t <= 0) this.bleedOut(id);
    }
    if (this.started && !this.over) {
      const anyone = [...this.seatsAll()].some((p) => p.alive && !p.gone);
      const pendingDown = this.downed.size > 0;
      if (!anyone && !pendingDown) this.finishRound(false, 'down');
    }
  }

  *seatsAll() {
    if (this.player) yield this.player;
    for (const r of this.remotes.values()) yield r;
  }

  waveStep() {
    const t = this.clock;
    const q = (at, fn) => { if (t >= at && !this.spawnedAt[at]) { this.spawnedAt[at] = true; fn(); } };
    const D = this.director;
    const door = () => this.ctx.random.pick(['1', '2', '3', '4', '5']);
    const big = this.session.players.length;
    q(0, () => { for (let i = 0; i < 8; i++) D.queueSpawn('gaffer', 1, door(), {}); this.event(['W', 1]); });
    q(30, () => { for (let i = 0; i < 6 + big; i++) D.queueSpawn('gaffer', 1, door(), {}); });
    q(60, () => { D.queueSpawn('bottler', 2 + big, door(), { every: 1.5 }); for (let i = 0; i < 6; i++) D.queueSpawn('gaffer', 1, door(), {}); this.event(['W', 2]); });
    q(90, () => { for (let i = 0; i < 8 + big; i++) D.queueSpawn('gaffer', 1, door(), {}); D.queueSpawn('netwife', 2, door(), {}); });
    q(120, () => { D.queueSpawn('flenser', 1, '2', {}); for (let i = 0; i < 6; i++) D.queueSpawn('gaffer', 1, door(), {}); this.event(['W', 3]); });
    q(150, () => { for (let i = 0; i < 8; i++) D.queueSpawn('gaffer', 1, door(), {}); D.queueSpawn('runner', 3, door(), {}); });
    q(180, () => { D.queueSpawn('flenser', 2, '1', { every: 6 }); D.queueSpawn('runner', 4 + big, door(), {}); this.event(['W', 4]); });
    q(210, () => { for (let i = 0; i < 8; i++) D.queueSpawn('gaffer', 1, door(), {}); D.queueSpawn('bottler', 2, door(), {}); });
    q(220, () => { this.event(['H', 0]); this.applyEvent(['H', 0]); });
    if (t >= ROUND_SECONDS && !this.dawned) this.dawn();
  }

  /** 4:00. The Foghorn sounds, everyone walks into the sea, and you win. */
  dawn() {
    this.dawned = true;
    this.director.queue.length = 0;
    this.event(['D', 0]);
    this.applyEvent(['D', 0]);
    for (const e of this.enemies) if (!e.dead) e.walkToSea(0.5);
    this.addDelayed(4.5, () => this.finishRound(true, 'dawn'));
  }

  finishRound(won) {
    if (this.finishedRound) return;
    this.finishedRound = true;
    const ids = this.session.players.map((p) => p.id);
    const score = (id) => Math.round(this.stats[id]?.score ?? 0);
    const sorted = ids.slice().sort((a, b) => score(b) - score(a));
    const standings = [];
    for (const id of sorted) {
      const last = standings[standings.length - 1];
      if (last && score(last[0]) === score(id)) last.push(id);
      else standings.push([id]);
    }
    const scores = Object.fromEntries(ids.map((id) => [id, score(id)]));
    const stats = Object.fromEntries(ids.map((id) => {
      const s = this.stats[id] ?? newStats();
      return [id, { Score: score(id), Kills: s.kills, Heads: s.heads, Kicks: s.kicks, Revives: s.revives, Accuracy: `${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%` }];
    }));
    const awards = [];
    const bestOf = (key, title, detail) => {
      let best = null; let v = 0;
      for (const id of ids) { const n = this.stats[id]?.[key] ?? 0; if (n > v) { v = n; best = id; } }
      if (best !== null) awards.push({ id: best, title, detail: detail(v) });
    };
    bestOf('score', 'Chief Adjuster', (v) => `${Math.round(v)} points`);
    bestOf('kicks', 'Steel Toe', (v) => `${v} kicks`);
    bestOf('revives', 'Good Samaritan', (v) => `${v} revives`);
    const result = { standings, scores, won, stats, awards };
    this.resultCache = result;
    this.session.finish(result);
    if (!this.hub && this.session.solo) addToBoard({ score: score(this.me), kills: this.stats[this.me]?.kills ?? 0, won: !!won });
  }

  onEnd(e) {
    this.over = true;
    this.overReason = e.reason;
    app.mix.stop(0.5);
    this.ctx.audio.stopLoops();
    this.ctx.audio.stopMusic();
    if (!this.hub) {
      const res = e.results ?? this.resultCache ?? this.session.results;
      openResults(this, res, e.reason);
    }
  }

  onLeave(id) {
    const r = this.remotes.get(id);
    if (!r) return;
    r.gone = true;
    r.alive = false;
    r.actor.root.visible = false;
    this.downed.delete(id);
    if (this.isHost) this.players = this.players.filter((p) => p !== r);
  }

  addScore(id, pts) {
    const st = this.stats[id];
    if (!st) return;
    st.score += pts * st.combo;
    this.teamScore += pts * st.combo;
    st.comboT = 4;
    st.combo = Math.min(5, st.combo + 0.1);
  }

  /** Host: score from kills. Called by Enemy.die through Area. */
  onEnemyKilled(e, h) {
    if (!this.isHost) return;
    this.director.killed++;
    if (e.corpse) this.corpses.push(e);
    if (this.corpses.length > 16) this.removeCorpse(this.corpses.shift());
    const by = h.by;
    const id = by?.seat ?? by?.id;
    if (id !== undefined && this.stats[id]) {
      const st = this.stats[id];
      st.kills++;
      if (h.zone === 'head') st.heads++;
      this.addScore(id, e.type === 'flenser' ? 500 : h.zone === 'head' ? 150 : 100);
    }
    this.event(['k', e.id, id ?? -1]);
    // Night Shift drops: ammo, herbs, grenades, by need of the whole party.
    if (this.ctx.random.chance(0.5) && e.type !== 'limpet') this.dropAt(e.x, e.z);
  }

  onEnemyHit(e, h) {
    const id = h.by?.seat;
    if (id !== undefined && this.stats[id]) this.addScore(id, 5);
    if (h.by && h.by !== this.player) this.event(['x', e.id, h.zone === 'head' ? 1 : 0]);
    super.onEnemyHit?.(e, h);
  }

  dropAt(x, z) {
    const r = this.ctx.random;
    const id = r.weighted(['ammoPistol', 'ammoShells', 'samphire', 'flare', 'depth'], (k) => ({ ammoPistol: 5, ammoShells: 3, samphire: 3, flare: 0.5, depth: 0.5 })[k]);
    const qty = ITEMS[id].max ? ITEMS[id].pickup : 1;
    const dropId = this.nextDrop++;
    this.spawnDropMesh(dropId, id, qty, x, z);
    this.event(['d', dropId, ITEMS.ammoPistol ? ['ammoPistol', 'ammoShells', 'samphire', 'flare', 'depth'].indexOf(id) : 0, qty, cm(x), cm(z)]);
  }

  spawnDropMesh(dropId, id, qty, x, z) {
    const d = this.addDrop('item', id, qty, x, z);
    if (d?.item) { this.interact.remove(d.item); d.item = null; }
    if (d) { d.netId = dropId; this.dropsById.set(dropId, d); }
  }

  /** Any player walking over a drop takes it. Host decides. */
  collectDrops() {
    for (const [id, d] of this.dropsById) {
      for (const p of this.seatsAll()) {
        if (!p.alive || p.gone) continue;
        if (Math.hypot(d.x - p.x, d.z - p.z) < 1.1) {
          const seat = p === this.player ? this.me : p.id;
          this.event(['T', id, seat, 0]);
          this.applyTaken(id, seat);
          break;
        }
      }
    }
  }

  applyTaken(id, seat) {
    const d = this.dropsById.get(id);
    if (!d) return;
    this.dropsById.delete(id);
    if (seat === this.me && !this.server) {
      this.run.giveItem(d.id, d.qty);
      this.ctx.audio.play('pickup');
      this.hud.flashText(`${ITEMS[d.id].name}`, 0.9);
    }
    this.consumeDrop(d);
  }

  breakCrate(c, o = {}) {
    if (!this.isHost) return;
    const wasBrine = c.kind === 'brine';
    if (c.broken) return;
    this.event(['c', c.c, c.r]);
    const loot = c.kind !== 'brine';
    c.loot = null;
    const keep = this.run;
    // Base class handles visuals and physics; loot here is the party drop.
    c.broken = true;
    this.ctx.physics.remove(c.collider);
    c.collider = null;
    c.obj.visible = false;
    this.level.nav.setOpen(c.c, c.r, true);
    if (wasBrine) {
      this.ctx.audio.play('brineBarrel', this.spatial(c.x, c.z, 70));
      this.addDelayed(o.chain ? 0.09 : 0, () => { explode(this, c.x, 0, c.z, 3, 60, { by: o.by }); this.event(['b', cm(c.x), cm(c.z)]); });
    } else {
      this.ctx.audio.play('crate', this.spatial(c.x, c.z, 25));
      this.ctx.particles.burst('chips', [c.x, 0.5, c.z]);
      if (loot) this.dropAt(c.x, c.z);
    }
    void keep;
  }

  // ---- Downs and revives ----
  /** Called by Player.die on the host's own player. */
  onPlayerDied(p) {
    if (p !== this.player) return;
    if (this.isHost) this.downPlayer(p);
  }

  downPlayer(p) {
    const id = p === this.player ? this.me : p.id;
    if (this.downed.has(id)) return;
    p.alive = false;
    if (p.grabbedBy) p.grabbedBy = null;
    if (p !== this.player) p.flags |= F_DOWN;
    this.downed.set(id, { t: BLEED, revive: 0, reviver: null });
    this.event(['D1', id]);
    this.applyEvent(['D1', id]);
    this.hud?.flashText(id === this.me ? 'DOWN. HOLD ON' : 'A COLLEAGUE IS DOWN', 2);
  }

  reviveTick(reviver, target) {
    const D = this.downed.get(target);
    if (!D) return;
    const p = this.seatOf(target);
    if (!p || Math.hypot(p.x - reviver.x, p.z - reviver.z) > 2.2) return;
    D.revive += 0.2;
    if (D.revive >= REVIVE_TIME) {
      this.downed.delete(target);
      const rid = reviver === this.player ? this.me : reviver.id;
      if (this.stats[rid]) { this.stats[rid].revives++; this.addScore(rid, 250); }
      this.event(['R', target]);
      this.applyEvent(['R', target]);
    }
  }

  bleedOut(id) {
    this.downed.delete(id);
    this.event(['O', id]);
    this.applyEvent(['O', id]);
    const p = this.seatOf(id);
    if (p) p.gone = true;
  }

  // ---- Effects both ways ----
  event(ev) {
    if (!this.isHost) return;
    this.outbox.push(ev);
  }

  applyEvent(ev) {
    const [k] = ev;
    const { ctx } = this;
    switch (k) {
      case 'W': this.hud?.flashText(`WAVE ${ev[1]}`, 1.6); this.wave = ev[1]; break;
      case 'H': this.hud?.flashText('THE HORN IS WARMING UP', 2.4); ctx.audio.play('bellToll', { volume: 0.7 }); break;
      case 'D':
        ctx.audio.play('foghorn'); ctx.engine.shake.add(0.8);
        this.world.setMood('dawn');
        app.mix.cut();
        this.hud?.flashText('DAWN. THEY WALK INTO THE SEA', 4);
        break;
      case 'D1': {
        const p = this.seatOf(ev[1]);
        if (p === this.player && p) {
          p.alive = false; p.state = 'dead'; p.hp = 0;
          p.actor.clearUpper(0.05); p.actor.play('LieIdle', { fade: 0.2 });
          p.laser.visible = false;
          ctx.audio.play('sting');
        } else if (p) p.flags |= F_DOWN;
        this.downedView = this.downedView ?? new Map();
        this.downedView.set(ev[1], BLEED);
        this.refreshReviveItems();
        break;
      }
      case 'R': {
        const p = this.seatOf(ev[1]);
        if (p === this.player && p) { p.revive(50); p.hp = 50; p.laser.visible = false; }
        else if (p) { p.flags &= ~F_DOWN; p.alive = true; p.hpv = 50; p.invuln = 2; }
        this.downedView?.delete(ev[1]);
        this.refreshReviveItems();
        ctx.audio.play('heal');
        break;
      }
      case 'O': {
        this.downedView?.delete(ev[1]);
        const p = this.seatOf(ev[1]);
        if (p) { p.gone = true; if (p !== this.player) p.actor.root.visible = false; }
        if (p === this.player) this.hud?.flashText('YOUR SHIFT IS OVER', 4);
        this.refreshReviveItems();
        break;
      }
      case 'k': {
        const g = this.ghosts.get(ev[1]);
        if (g) { g.kill(); this.ghosts.delete(ev[1]); }
        if (ev[2] === this.me && !this.isHost) { /* the host keeps score */ }
        break;
      }
      case 'x': {
        const g = this.ghosts.get(ev[1]);
        if (g) ctx.particles.burst('blood', [g.x, ev[2] ? 1.4 : 1, g.z]);
        break;
      }
      case 'h': {
        if (ev[1] === this.me && this.player) {
          this.hud?.addHurtArc(ev[2] - this.player.x, ev[3] - this.player.z);
          ctx.audio.play('maxHurt');
          ctx.engine.shake.add(0.3);
          this.rumble(1, 0.6, 180);
        }
        break;
      }
      case 'd': {
        const id = ['ammoPistol', 'ammoShells', 'samphire', 'flare', 'depth'][ev[2]];
        this.spawnDropMesh(ev[1], id, ev[3], ev[4] / 100, ev[5] / 100);
        break;
      }
      case 'T': this.applyTaken(ev[1], ev[2]); break;
      case 'c': {
        const c = this.level.bySpot.get(`C${ev[1]},${ev[2]}`);
        if (c && !c.broken) {
          c.broken = true;
          this.ctx.physics.remove(c.collider);
          c.collider = null;
          c.obj.visible = false;
          ctx.audio.play('crate', this.spatial(c.x, c.z, 25));
          ctx.particles.burst('chips', [c.x, 0.5, c.z]);
        }
        break;
      }
      case 'b': this.fx.explosion(ev[1] / 100, 0, ev[2] / 100, 3); ctx.audio.play('brineBarrel', this.spatial(ev[1] / 100, ev[2] / 100, 70)); break;
      case 'p': // A thrown thing, for show on clients.
        this.projectiles.push(new Projectile(this, ev[1], [ev[2] / 100, 1.6, ev[3] / 100], [ev[4] / 100, 0.1, ev[5] / 100], { onLand: (x, z) => { ctx.particles.burst('flame', [x, 0.3, z], { count: 8 }); } }));
        break;
      default: break;
    }
  }

  refreshReviveItems() {
    for (const it of this.reviveItems ?? []) this.interact.remove(it);
    this.reviveItems = [];
    for (const id of this.downedView?.keys() ?? []) {
      if (id === this.me) continue;
      const p = this.seatOf(id);
      if (!p) continue;
      const it = this.interact.add({
        kind: 'revive', get x() { return p.x; }, get z() { return p.z; }, prio: 0.8, radius: 2, facing: false, label: 'HOLD: REVIVE',
        use: () => {},
      });
      it.targetId = id;
      this.reviveItems.push(it);
    }
  }

  throwFrom(e, T) {
    super.throwFrom(e, T);
    const kinds = { bottle: 'bottle', net: 'net' };
    const k = kinds[e.d.thrown];
    if (k) this.event(['p', k, cm(e.x), cm(e.z), cm(T.x), cm(T.z)]);
  }

  /** Client: my own shot. Effects now, the host resolves the hit with its own zones. */
  resolveShot(by, stats, o, d) {
    if (this.isHost) {
      const st = this.stats[this.me];
      if (st) st.shots++;
      const res = fireWeapon(this, by, stats, o, d, this.ctx.random);
      if (res.hits && st) st.hits++;
      return res;
    }
    this.actions.push(['f', WEAPON_ORDER.indexOf(stats.id), cm(o.x), cm(o.y), cm(o.z), Math.round(d.x * 1000), Math.round(d.y * 1000), Math.round(d.z * 1000)]);
    return { hits: 0, heads: 0 };
  }
  resolveKick(by, target) {
    if (this.isHost) { const n = kickCone(this, by, target); const st = this.stats[this.me]; if (st) { st.kicks++; this.addScore(this.me, 50); } return n; }
    this.actions.push(['k', target.id]);
    return 1;
  }
  resolveTakedown(by, target) {
    if (this.isHost) { takedownBurst(this, by, target); const st = this.stats[this.me]; if (st) { st.kicks++; this.addScore(this.me, 50); } return; }
    this.actions.push(['t', target.id]);
  }
  resolveKnife(by, knife) {
    if (this.isHost) return knifeArc(this, by, knife);
    this.actions.push(['n']);
    return 0;
  }

  throwGrenade(by, id, to) {
    if (this.isHost) { super.throwGrenade(by, id, to); return; }
    const kinds = { flare: 0, depth: 1, oil: 2 };
    this.actions.push(['g', kinds[id], cm(by.x), cm(by.z), cm(to.x), cm(to.z)]);
    // Show it right away, harmless here: the host's copy does the work.
    const kindsP = { flare: 'grenadeFlare', depth: 'grenadeDepth', oil: 'grenadeOil' };
    this.projectiles.push(new Projectile(this, kindsP[id], [by.x, 1.5, by.z], [to.x, 0.05, to.z], { onLand: () => {} }));
  }

  spawnGrenade(kind, x, z, tx, tz) {
    const names = ['grenadeFlare', 'grenadeDepth', 'grenadeOil'];
    this.projectiles.push(new Projectile(this, names[kind], [x, 1.5, z], [tx, 0.05, tz], {}));
  }

  // ---- Snapshots ----
  buildSnapshot() {
    const list = this.enemies.filter((e) => !e.dead);
    const near = list.length > CAP ? list.slice(0, CAP) : list;
    const e = near.map((x) => [x.id, TYPE_CODE[x.type] ?? 0, cm(x.x), cm(x.z), Math.round((x.yaw * 180) / Math.PI) % 360, STATE_CODE[x.state] ?? 3, Math.round((x.hp / x.hpMax) * 100)]);
    const p = [];
    for (const pl of this.seatsAll()) {
      const id = pl === this.player ? this.me : pl.id;
      const yaw = pl === this.player ? this.player.facing : pl.yaw;
      const flags = pl === this.player ? (this.player.aiming ? F_AIM : 0) | (this.downed.has(id) ? F_DOWN : 0) | (this.player.gone ? F_GONE : 0) : pl.flags | (this.downed.has(id) ? F_DOWN : 0) | (pl.gone ? F_GONE : 0);
      p.push([id, cm(pl.x), cm(pl.z), Math.round((yaw * 180) / Math.PI) % 360, flags, Math.round(pl.hp)]);
    }
    return { k: 'w', n: (this.snapN = (this.snapN ?? 0) + 1), t: Math.round(this.netClock()), e, p, s: [Math.round(this.clock), this.wave, Math.round(this.teamScore)] };
  }

  applySnapshot(d) {
    if (d.n <= (this.lastN ?? 0)) return;
    this.lastN = d.n;
    this.clock = d.s[0];
    this.wave = d.s[1];
    this.teamScore = d.s[2];
    const seen = new Set();
    for (const [id, tc, x, z, yaw, st, hp] of d.e) {
      seen.add(id);
      let g = this.ghosts.get(id);
      if (!g) {
        const type = ENEMY_IDS[tc];
        g = new GhostEnemy(this, id, type, x / 100, z / 100);
        this.enemies.push(g);
        this.ghosts.set(id, g);
      }
      g.sample(d.t, x / 100, z / 100, (yaw * Math.PI) / 180, STATES[st] ?? 'APPROACH', hp);
    }
    for (const [id, g] of this.ghosts) {
      if (!seen.has(id) && !g.dead && d.t - (g.seen ?? 0) > 1500) { g.dieQuiet(); this.ghosts.delete(id); }
    }
    for (const [id, x, z, yaw, flags, hp] of d.p) {
      if (id === this.me) {
        const P = this.player;
        if (P && P.alive) P.hp = Math.min(P.hp, hp);
        if (P && hp > 0 && hp > P.hp + 15 && P.alive) P.hp = hp;
        continue;
      }
      const r = this.remotes.get(id);
      if (r) { r.pose(x / 100, z / 100, (yaw * Math.PI) / 180, 0, flags, 0, d.t); r.hpv = hp; if (flags & F_GONE) r.gone = true; }
    }
  }

  // ---- Stepping ----
  fixedUpdate(ctx, dt) {
    if (this.over) return;
    const t = this.netClock();
    if (Number.isFinite(t)) this.clock = this.isHost ? t / 1000 : this.clock;
    const playing = Number.isFinite(t) && t >= 0;
    this.frozenPlay = !playing;
    // Before play: nobody moves.
    if (!playing) {
      if (this.player) { this.human.fixed(ctx, dt, app.device); this.intent.clearPresses(); this.player.stay(dt); }
      this.world.update(dt, this.cameraTarget());
      return;
    }
    if (this.player && !this.player.alive) { this.intent.clearPresses(); this.player.stay(dt); }
    super.fixedUpdate(ctx, dt);
    if (this.isHost) this.stepHost(dt);
    this.stepRevive(dt);
    this.netSend(dt);
  }

  stepRevive(dt) {
    const P = this.player;
    if (!P || !P.alive) return;
    const cur = this.interact.current;
    if (cur?.kind === 'revive' && this.intent.actionHeld) {
      this.reviveHold = (this.reviveHold ?? 0) + dt;
      if (this.reviveHold >= 0.2) {
        this.reviveHold = 0;
        if (this.isHost) this.reviveTick(P, cur.targetId);
        else this.actions.push(['r', cur.targetId]);
      }
    }
  }

  netSend(dt) {
    this.sendI += dt; this.sendW += dt; this.sendE += dt; this.sendA += dt;
    if (this.isHost) {
      if (this.sendW >= 1 / 9) {
        this.sendW = 0;
        const snap = this.buildSnapshot();
        const bytes = JSON.stringify(snap).length;
        this.netStats.maxW = Math.max(this.netStats.maxW, bytes);
        this.post(snap, { reliable: false });
      }
      if (this.outbox.length && this.sendE >= 1 / 8) {
        this.sendE = 0;
        const batch = this.outbox.splice(0, 30);
        this.post({ k: 'e', v: batch }, { reliable: true });
      }
    } else if (this.player) {
      if (this.sendI >= 1 / 12) {
        this.sendI = 0;
        const P = this.player;
        const flags = (P.aiming ? F_AIM : 0) | (this.human.intent.run ? F_RUN : 0);
        this.post({ k: 'i', v: [cm(P.x), cm(P.z), Math.round((P.facing * 180) / Math.PI) % 360, Math.round((this.cam.pitch * 180) / Math.PI), flags, WEAPON_ORDER.indexOf(this.run.equipped)] }, { to: this.session.host, reliable: false });
      }
      if (this.actions.length && this.sendA >= 1 / 6) {
        this.sendA = 0;
        this.post({ k: 'a', v: this.actions.splice(0, 24) }, { to: this.session.host, reliable: true });
      }
    }
  }

  update(ctx, dt) {
    if (this.over && !app.stack.length) { ctx.hud.clear(); return; }
    super.update(ctx, dt);
    for (const r of this.remotes.values()) r.frame(dt);
    if (this.downedView) for (const [k, v] of this.downedView) this.downedView.set(k, v - dt);
  }

  /** In a session there's no pausing the world: a small Settings overlay while the round runs. */
  checkMenuKeys(ctx) {
    const { input } = ctx;
    const create = input.isDown('PadCreate');
    const opt = input.wasPressed('PadOptions') && !create;
    const esc = input.wasPressed('Escape', 'KeyP');
    if (opt || esc) {
      if (this.session.solo && !this.hub) { this.openSoloPause(); return; }
      const s = openSettings();
      s.frozen = false;
    }
    if (input.wheel && this.player?.state === 'free' && app.device.kind === 'kbm') this.player.cycleWeapon(input.wheel > 0 ? 1 : -1);
  }

  openSoloPause() {
    const screen = {
      frozen: true,
      name: 'shift-pause',
      update: (ctx, ui) => {
        ui.dim();
        const w = 200; const x = (ui.W - w) >> 1;
        ui.heading('ON HOLD', 40);
        if (ui.item('resume', x, 90, w, 'RESUME')) app.close(screen);
        if (ui.item('settings', x, 112, w, 'SETTINGS')) openSettings();
        if (ui.item('quit', x, 134, w, 'QUIT SHIFT')) { app.closeAll(); this.session.close(); app.scenes.title(); }
        ui.promptBar([['confirm', 'SELECT'], ['back', 'RESUME']]);
        if (ui.nav.back) app.close(screen);
      },
    };
    app.open(screen);
  }

  /** Night Shift's HUD on top of the usual one. */
  drawExtra(ctx, ui) { this.drawShiftHud(ctx, ui); }

  /** Clients don't run AI; ghosts interpolate in step(). The base loop calls e.step for all. */
  targetFor(e) { return this.isHost ? super.targetFor(e) : null; }

  /** The Claim Form doesn't apply: end of round goes through the session. */
  finishChapter() {}

  // ---- HUD on top ----
  drawShiftHud(ctx, ui) {
    const { W, H } = ui;
    const t = this.netClock();
    if (!Number.isFinite(t)) return;
    if (t < 0) {
      const n = Math.ceil(-t / 1000);
      ui.centerText((H >> 1) - 24, String(n), { scale: 4, color: 'sand' });
      return;
    }
    const left = Math.max(0, ROUND_SECONDS - this.clock);
    const clock = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    ui.centerText(5, `DAWN IN ${clock}`, { scale: 1, color: left < 30 ? 'orange' : 'sand' });
    ui.centerText(15, `SCORE ${Math.round(this.teamScore)}`, { color: 'white' });
    // Everyone's name in their colour, and how they are doing.
    let y = 6;
    for (const p of this.session.players) {
      const seat = this.seatOf?.(p.id);
      const hp = p.id === this.me ? (this.player?.hp ?? 0) : (seat?.hp ?? 0);
      const down = this.downedView?.has(p.id);
      const col = SEAT_COLOR[p.id % 4];
      ui.text(W - 96, y, p.name.slice(0, 10), { color: col });
      ui.bar(W - 36, y + 1, 30, 5, down ? 0 : hp / 100, down ? 'red' : 'lime');
      y += 10;
    }
    // Name tags over colleagues.
    for (const r of this.remotes.values()) {
      if (r.gone) continue;
      const [x, y2] = this.hud.projectDot(ui, v1.set(r.x, 2, r.z));
      if (x > 0 && x < W && y2 > 0 && y2 < H) ui.text(x - (ui.width(r.info.name) >> 1), y2, r.info.name, { color: SEAT_COLOR[r.id % 4] });
    }
    const P = this.player;
    if (P && !P.alive && !P.gone) {
      const leftBleed = this.downedView?.get(this.me) ?? 0;
      ui.centerText((H >> 1) - 16, `DOWN. BLEEDING OUT: ${Math.ceil(Math.max(0, leftBleed))}`, { scale: 1, color: 'red' });
    }
    if (P?.gone) ui.centerText((H >> 1) - 16, 'YOUR SHIFT IS OVER', { scale: 2, color: 'mist' });
  }

  dispose() {
    for (const off of this.offs ?? []) off();
    for (const r of this.remotes.values()) r.actor.dispose();
    super.dispose();
  }

  status() {
    return `shift t ${this.clock?.toFixed?.(0)} score ${Math.round(this.teamScore)} enemies ${this.enemies.filter((e) => !e.dead).length} host ${this.isHost} players ${this.session.players.length}`;
  }
}

export { Intent, Q };
