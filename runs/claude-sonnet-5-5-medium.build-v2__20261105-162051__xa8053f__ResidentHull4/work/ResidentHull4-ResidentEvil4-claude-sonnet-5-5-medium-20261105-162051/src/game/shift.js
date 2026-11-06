// Night Shift: a 4-minute hold-out on the quay at night in the rain, solo or co-op (1-4). The host simulates; clients send what their player does.
import { THREE } from '../../pixel-engine.js';
import { Area } from './area.js';
import { Enemy, S } from './enemy.js';
import { Humanoid } from './actor.js';
import { Run } from '../core/run.js';
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { WEAPONS } from '../data/weapons.js';
import { TUNING } from '../data/tuning.js';
import { MAPS } from './mapPaint.js';
import { cp, shake } from './kit.js';
import { SEAT_COLORS } from '../net/local.js';
import { loadBoard, saveBoard } from '../core/save.js';
import { clamp, angleDiff } from './geom.js';
import { settings } from '../core/settings.js';
import '../screens/lobby.js';

const { Vector3 } = THREE;
export const SHIFT_SECONDS = 240;
export const STATE_NAMES = ['WAIT', 'WORK', 'ALERT', 'APPROACH', 'CIRCLE', 'WINDUP', 'ATTACK', 'RECOVER', 'STUN', 'KNEEL', 'FLINCH', 'KNOCKDOWN', 'GETUP', 'GRAB', 'VAULT', 'CLIMB', 'BASH', 'LATCH', 'DEAD', 'SEA', 'CARRY', 'RISE', 'LUNGE', 'SEEK'];
const TYPE_NAMES = ['gaffer', 'netwife', 'bottler', 'runner', 'carrier', 'flenser', 'limpet', 'resalted', 'monk', 'knight', 'drowned', 'harpooner', 'ansgar'];
const SCARF = ['red', 'blue', 'green', 'sand'];
export const ghostModelFor = (id) => ({ palette: { scarf: SCARF[id % 4] } });

export function shiftRun() {
  const run = new Run('standard'); run.addWeapon('scatter'); run.case.take('ammo_pistol', 30); run.addItem('ammo_pistol', 60); run.addItem('ammo_shells', 24);
  run.addItem('samphire', 2); run.addItem('flare', 1); run.mags.pistol = 12; run.mags.scatter = 6; run.equipped = 'pistol'; return run;
}

class GhostEnemy extends Enemy {
  constructor(area, type, x, z, id) { super(area, type, x, z, { state: S.APPROACH, noBody: true }); this.id = id; this.buf = []; this.ghost = true; this.netState = 'APPROACH'; }
  push(t, x, z, yaw, state, hpPct) { this.buf.push({ t, x, z, yaw }); if (this.buf.length > 12) this.buf.shift(); if (state !== this.netState) { this.netState = state; this.setState(state); this.stateTimer = 0; } this.hp = this.maxHp * hpPct / 100; if (state === 'DEAD' && !this.dead) { this.dead = true; this.h.play('Death', { once: true, hold: true }); } }
  update(dt) {
    if (this.dead) return; this.px = this.x; this.pz = this.z;
    const now = this.area.time - 0.12; const b = this.buf;
    while (b.length > 2 && b[1].t <= now) b.shift();
    if (b.length >= 2) { const k = clamp((now - b[0].t) / Math.max(1e-3, b[1].t - b[0].t), 0, 1); this.x = b[0].x + (b[1].x - b[0].x) * k; this.z = b[0].z + (b[1].z - b[0].z) * k; this.yaw = b[1].yaw; }
    else if (b.length === 1) { this.x = b[0].x; this.z = b[0].z; this.yaw = b[0].yaw; }
    this.stateTimer += dt;
  }
}
class Ghost {
  constructor(area, seat, name) {
    this.id = seat.id; this.name = name || seat.name; this.color = seat.color; this.x = 0; this.z = 0; this.px = 0; this.pz = 0; this.yaw = 0; this.pitch = 0; this.hp = 100; this.maxHp = 100; this.downed = false; this.dead = false; this.bleed = 20; this.speed = 0; this.aiming = false; this.weapon = 'pistol'; this.buf = [];
    this.h = new Humanoid('max', { palette: ghostModelFor(seat.id).palette }); this.h.attachTo(area.ctx.scene); this.h.play('Idle'); this.isGhost = true; this.invuln = 0; this.revive = 0;
  }
  push(t, x, z, yaw, pitch, flags) { this.buf.push({ t, x, z, yaw }); if (this.buf.length > 10) this.buf.shift(); this.pitch = pitch; this.aiming = !!(flags & 1); this.moving = !!(flags & 2); this.flagDown = !!(flags & 4); }
  update(dt, now) {
    this.px = this.x; this.pz = this.z; const b = this.buf; const t = now - 0.12;
    while (b.length > 2 && b[1].t <= t) b.shift();
    if (b.length >= 2) { const k = clamp((t - b[0].t) / Math.max(1e-3, b[1].t - b[0].t), 0, 1); this.x = b[0].x + (b[1].x - b[0].x) * k; this.z = b[0].z + (b[1].z - b[0].z) * k; this.yaw = b[1].yaw; } else if (b.length) { this.x = b[0].x; this.z = b[0].z; this.yaw = b[0].yaw; }
  }
  visual(dt) {
    const h = this.h; h.root.position.set(this.x, 0, this.z); h.root.rotation.y = this.yaw;
    if (this.downed || this.dead) h.play('KnockedDown', { once: true, hold: true });
    else if (this.aiming) { h.layers('Idle', 'AimPistol'); h.aim.on = true; h.aim.pitch = this.pitch; }
    else { h.aim.on = false; if (this.moving) h.play('MaxJog'); else h.play('Idle'); }
    h.update(dt); h.placeShadow(0);
  }
}

export const shiftDef = {
  id: 'shift', name: 'NIGHT SHIFT', mapId: 'quay', mood: 'rain', music: 'combat', chapter: 0, noFathom: true, startYaw: Math.PI, noMender: true,
  theme: { floors: { '.': 'cobbles', ',': 'dirt', '=': 'planks', ':': 'rough-boards', '_': 'flagstones' } }, tannoyLines: [], scripts: [],
  dress: ['barrel', 'crate', 'sack', 'bucket', 'rope-coil', 'lobster-pot', 'bollard', 'drying-rack'], lamps: [[-2, -9], [-14, -3], [8, -3], [-2, 11], [20, -12], [-20, 5]],
  props: [{ id: 'foghorn-tower', at: [26, -17], rot: 0, collide: false, y: 0 }],
};

export class ShiftArea extends Area {
  constructor(o = {}) {
    super({ ...shiftDef, scripts: [] }, { ...o, shift: true, run: o.run || shiftRun(), noPause: !!app.hub, noSave: true });
    this.session = o.session || null; this.role = !this.session ? 'solo' : this.session.isHost ? 'host' : 'client'; this.isServer = !!(this.session && this.session.server);
    this.ghosts = []; this.seq = 0; this.shiftOver = false; this.clock = 0; this.wave = 0; this.score = {}; this.stats = {}; this.combo = { n: 0, t: 0 }; this.started = o.started ?? true; this.countdown = 0; this.evq = []; this.sendAcc = 0; this.snapAcc = 0; this.actq = []; this.lastPoseSend = 0; this.bleed = 20; this.horn = false; this.won = false; this.ghostEnemies = new Map();
    this.def.fixed = (a, dt) => a.shiftTick(dt);
    this.results = null;
    this.netBytesMax = 0; this.sentLast = [];
  }
  spawn(type, x, z, o = {}) {
    if (this.role !== 'client' && !this.drainingSpawns && this.aliveEnemies().length >= 24) { (this.pendingSpawns ||= []).push([type, x, z, o]); return { dead: true, stub: true, hp: 0, state: 'DEAD' }; }
    return super.spawn(type, x, z, o);
  }
  drainSpawns() { if (!this.pendingSpawns?.length) return; this.drainingSpawns = true; while (this.pendingSpawns.length && this.aliveEnemies().length < 24) { const [t, x, z, o] = this.pendingSpawns.shift(); super.spawn(t, x, z, o); } this.drainingSpawns = false; }
  allPlayers() { return [...(this.isServer ? [] : [this.player]), ...this.ghosts]; }
  mySeat() { return this.session ? this.session.me : 0; }
  async setup(ctx) {
    await super.setup(ctx);
    const players = this.session ? this.session.players : [{ id: 0, name: 'MAX', color: SEAT_COLORS[0] }];
    const [px, pz] = [this.player.x, this.player.z];
    for (const s of players) {
      this.score[s.id] = 0; this.stats[s.id] = { Score: 0, Kills: 0, Heads: 0, Kicks: 0, Revives: 0, Hits: 0, Shots: 0 };
      if (s.id === this.mySeat() && !this.isServer) continue;
      const g = new Ghost(this, s); g.x = g.px = px - 2 + s.id * 1.2; g.z = g.pz = pz + 1; this.ghosts.push(g);
    }
    const me = this.mySeat();
    this.player.teleport(px - 2 + me * 1.2, pz + 0.2);
    if (this.isServer) { this.player.h.root.visible = false; this.player.invuln = 1e9; this.dev.god = true; this.player.noMove = true; }
    else if (this.session) this.player.h.root.traverse?.(() => {});
    if (this.session) {
      this.session.on('message', (d, from) => this.onNet(d, from));
      this.session.on('leave', ({ id }) => this.onLeave(id));
    }
    this.def.dress = this.def.dress; this.lastEnemyId = 0;
    if (this.role !== 'client') this.scripts.start(this.hostScript.bind(this), 'shift');
    this.ctx.engine.timeScale = 1;
  }
  onLeave(id) { const g = this.ghosts.find((x) => x.id === id); if (g) { g.dead = true; g.h.root.visible = false; g.left = true; } }
  // ---------- host: waves by clock ----------
  *hostScript(a) {
    const spawn = (type, n, gap = 0.8) => a.scripts.start(function* () { for (let i = 0; i < n; i++) { if (a.aliveEnemies().length < 24) a.spawnAtDoor(type, ['1', '2', '3', '4', '5'][a.rng.int(0, 4)], { state: S.APPROACH }); yield gap; } }, 'stream');
    const at = (t) => (function* () { while (a.clock < t) yield 0.2; })();
    a.wave = 1; spawn('gaffer', 8);
    yield* at(60); a.wave = 2; a.evq.push(['wave', 2]); spawn('bottler', 4, 2); spawn('gaffer', 6);
    yield* at(120); a.wave = 3; a.evq.push(['wave', 3]); a.spawnAtDoor('flenser', '2', { state: S.APPROACH }); spawn('gaffer', 6);
    yield* at(180); a.wave = 4; a.evq.push(['wave', 4]); a.spawnAtDoor('flenser', '2', { state: S.APPROACH }); a.spawnAtDoor('flenser', '4', { state: S.APPROACH }); spawn('runner', 6, 1.2);
    yield* at(220); a.horn = true; a.evq.push(['horn', 1]);
    yield* at(SHIFT_SECONDS); yield* a.dawn();
  }
  *dawn() {
    this.won = true; this.evq.push(['horn', 2]); app.mix?.play(null); this.audio('foghorn'); shake(this, 0.8);
    for (const e of this.enemies) if (!e.dead) { e.releaseToken?.(); e.setState(S.SEA); }
    this.scripts.tasks = this.scripts.tasks.filter((t) => !['stream'].includes(t.name));
    yield 3; this.endShift(true);
  }
  // ---------- per fixed step ----------
  shiftTick(dt) {
    if (this.shiftOver) return;
    const sess = this.session;
    if (sess && sess.time() < 0) { this.countdown = -sess.time() / 1000; this.player.invuln = 1; return; }
    this.clock += dt; this.run.stats.time = this.clock;
    this.combo.t -= dt; if (this.combo.t <= 0) this.combo.n = 0;
    // trickle spawns keep the pressure on
    if (this.role !== 'client') {
      this.trickle = (this.trickle || 0) + dt;
      if (this.trickle > 12 && this.aliveEnemies().length < 12 && !this.won && this.clock < SHIFT_SECONDS - 25) { this.trickle = 0; for (let i = 0; i < 2; i++) this.spawnAtDoor('gaffer', ['1', '2', '3', '4', '5'][this.rng.int(0, 4)], { state: S.APPROACH }); }
      this.updateDowned(dt); this.drainSpawns();
    }
    // networking
    if (sess && !this.isServer && this.role === 'client') this.sendPose(dt);
    if (this.role === 'host') { this.snapAcc += dt; if (this.snapAcc >= 1 / 9) { this.snapAcc = 0; this.sendSnapshot(); } this.flushEvents(dt); }
    if (this.role === 'client') { this.flushActions(dt); }
    for (const g of this.ghosts) g.update(dt, this.time);
    this.localDowned(dt);
  }
  updateDowned(dt) {
    // every downed player bleeds out unless revived; the host decides who is down
    for (const g of this.ghosts) {
      if (g.left) continue;
      if (g.downed) { g.bleed -= dt; const near = this.revivers(g); if (near) { g.revive += dt; if (g.revive >= 2) { g.downed = false; g.dead = false; g.hp = g.maxHp * 0.5; g.revive = 0; this.stats[near.id] && this.stats[near.id].Revives++; this.addScore(near.id, 150); this.evq.push(['rev', g.id]); } } else g.revive = Math.max(0, g.revive - dt); if (g.bleed <= 0) { g.downed = false; g.dead = true; this.evq.push(['dead', g.id]); } }
    }
    const p = this.player;
    if (!this.isServer && p.downed) { this.bleed -= dt; const r = this.revivers(p); if (r) { p.revive = (p.revive || 0) + dt; if (p.revive >= 2) this.reviveLocal(r); } else p.revive = 0; if (this.bleed <= 0) { p.downed = false; p.dead = true; this.localDead(); } }
    // all down?
    const alive = this.allPlayers().filter((x) => !x.dead && !x.downed && !x.left);
    if (!alive.length && !this.won && !this.shiftOver) this.endShift(false);
  }
  revivers(target) {
    for (const o of this.allPlayers()) { if (o === target || o.dead || o.downed || o.left) continue; if (Math.hypot(o.x - target.x, o.z - target.z) < 1.6 && (o === this.player ? this.cur.action : o.reviving)) return o; }
    return null;
  }
  reviveLocal(r) { const p = this.player; p.downed = false; p.dead = false; this.run.hp = this.run.maxHp * 0.5; p.revive = 0; this.bleed = 20; this.addScore(r.id, 150); if (this.stats[r.id]) this.stats[r.id].Revives++; this.evq.push(['rev', this.mySeat()]); this.audio('heal'); }
  localDowned(dt) {
    const p = this.player; if (this.isServer) return;
    // reviving friends: hold Action near a downed friend
    for (const g of this.ghosts) if (g.downed && Math.hypot(g.x - p.x, g.z - p.z) < 1.6 && this.cur.action && !p.downed) { if (this.role === 'client') this.queueAction(['u', g.id]); }
  }
  hurtGhost(g, dmg, fx, fz) {
    if (g.downed || g.dead || g.invuln > 0) return; g.hp -= dmg; this.evq.push(['hurt', g.id, Math.round(g.hp)]);
    if (g.hp <= 0) { g.hp = 0; g.downed = true; g.bleed = 20; this.evq.push(['down', g.id]); }
  }
  hurtPlayer(dmg, fx, fz, kind, soft) { return super.hurtPlayer(dmg, fx, fz, kind, soft); }
  playerDied(kind) {
    const p = this.player; if (p.dead || p.downed) return;
    if (!this.session || this.session.players.length <= 1) { p.dead = true; this.run.stats.deaths++; this.audio('deathSting'); this.endShift(false); return; }
    p.downed = true; this.bleed = 20; this.audio('deathSting'); this.evq.push(['down', this.mySeat()]);
    if (this.role === 'client') this.queueAction(['d', 1]);
  }
  localDead() { const p = this.player; p.dead = true; if (this.role === 'client') this.queueAction(['d', 2]); }
  // ---------- scoring ----------
  addScore(seat, pts) { const m = 1 + Math.min(4, this.combo.n) * 0.25; this.score[seat] = (this.score[seat] || 0) + Math.round(pts * m); if (this.stats[seat]) this.stats[seat].Score = this.score[seat]; }
  onKill(e, o) {
    super.onKill(e, o);
    if (o.sink || o.source === 'fire') return;
    const seat = o.by ?? this.mySeat(); this.combo.n++; this.combo.t = 3;
    const st = this.stats[seat]; if (st) { st.Kills++; if (o.zone === 'head' || e.lastHitZone === 'head') st.Heads++; if (o.source === 'kick') st.Kicks++; }
    this.addScore(seat, 100 + (e.lastHitZone === 'head' ? 50 : 0) + (o.source === 'kick' ? 75 : 0) + (e.def.boss ? 300 : 0));
    this.evq.push(['kill', e.id, seat]);
  }
  // ---------- local fire ----------
  firePlayer() {
    if (this.role !== 'client') { this.stats[this.mySeat()].Shots++; return super.firePlayer(); }
    const p = this.player, run = this.run, w = p.weapon, st = run.stat(w.id);
    p.fireCd = st.interval / TUNING.fireRate; run.mags[w.id] = (run.mags[w.id] ?? 0) - 1;
    const ray = this.combat.aimRay({}); p.recoil = 1; const muz = p.muzzle(new Vector3()); this.fx.muzzle(muz); this.ctx.engine.shake.add(0.12);
    this.audio(w.id === 'pistol' ? 'pistol' : 'scatter'); this.stats[this.mySeat()].Shots++;
    const hit = this.combat.trace(ray, 80, {}); if (hit.kind === 'world') this.ctx.particles.burst('spark', hit.point);
    this.queueAction(['f', w.id === 'pistol' ? 0 : 1, Math.round(ray.ox * 100), Math.round(ray.oy * 100), Math.round(ray.oz * 100), Math.round(ray.dx * 1000), Math.round(ray.dy * 1000), Math.round(ray.dz * 1000)]);
  }
  // ---------- network ----------
  sendPose(dt) {
    this.lastPoseSend += dt; if (this.lastPoseSend < 1 / 12) return; this.lastPoseSend = 0;
    const p = this.player; const flags = (p.aiming ? 1 : 0) | (p.speed > 0.3 ? 2 : 0) | (p.downed ? 4 : 0) | (this.cur.action ? 8 : 0);
    this.session.send({ i: [Math.round(p.x * 100), Math.round(p.z * 100), Math.round(p.yaw * 180 / Math.PI), Math.round(this.cam.pitch * 180 / Math.PI), flags, p.weapon.id === 'pistol' ? 0 : 1], t: Math.round(this.time * 1000) }, { to: this.session.host, reliable: false });
  }
  queueAction(a) { this.actq.push(a); }
  flushActions(dt) { this.sendAcc += dt; if (this.sendAcc < 1 / 6 || !this.actq.length) return; this.sendAcc = 0; const batch = this.actq.splice(0, 6); this.session.send({ a: batch }, { to: this.session.host, reliable: true }); }
  flushEvents(dt) { this.evAcc = (this.evAcc || 0) + dt; if (this.evAcc < 1 / 8 || !this.evq.length) return; this.evAcc = 0; const ev = this.evq.splice(0, 12); this.session.send({ e: ev }, { reliable: true }); this.applyEvents(ev, true); }
  snapshot() {
    const e = []; const list = this.enemies.filter((x) => !x.dead || (x.deadT || 0) < 1.5).slice(0, 24);
    for (const x of list) e.push([x.id, Math.max(0, TYPE_NAMES.indexOf(x.type)), Math.round(x.x * 100), Math.round(x.z * 100), Math.round(x.yaw * 180 / Math.PI), Math.max(0, STATE_NAMES.indexOf(x.state)), Math.max(0, Math.round(x.hp / x.maxHp * 100))]);
    const p = [];
    const me = this.player; if (!this.isServer) p.push([this.mySeat(), Math.round(me.x * 100), Math.round(me.z * 100), Math.round(me.yaw * 180 / Math.PI), (me.aiming ? 1 : 0) | (me.speed > 0.3 ? 2 : 0) | (me.downed ? 4 : 0), Math.round(this.run.hp)]);
    for (const g of this.ghosts) p.push([g.id, Math.round(g.x * 100), Math.round(g.z * 100), Math.round(g.yaw * 180 / Math.PI), (g.aiming ? 1 : 0) | (g.moving ? 2 : 0) | (g.downed ? 4 : 0), Math.round(g.hp)]);
    return { n: ++this.seq, t: Math.round(this.time * 1000), e, p, s: [Math.round(this.clock), this.wave, Math.round(Object.values(this.score).reduce((a, b) => a + b, 0))] };
  }
  sendSnapshot() { const s = this.snapshot(); const raw = JSON.stringify(s); this.netBytesMax = Math.max(this.netBytesMax, raw.length); this.session.send(s, { reliable: false }); }
  onNet(d, from) {
    if (this.role === 'host') {
      if (d.i) { const g = this.ghosts.find((x) => x.id === from); if (g && !g.downed) { g.push(this.time, d.i[0] / 100, d.i[1] / 100, d.i[2] * Math.PI / 180, d.i[3] * Math.PI / 180, d.i[4]); g.reviving = !!(d.i[4] & 8); g.weapon = d.i[5] ? 'scatter' : 'pistol'; } }
      if (d.a) for (const act of d.a) this.hostAction(from, act);
    } else {
      if (d.n !== undefined) this.applySnapshot(d);
      if (d.e) this.applyEvents(d.e, false);
    }
  }
  hostAction(from, act) {
    const g = this.ghosts.find((x) => x.id === from); if (!g || g.dead) return;
    const [k] = act;
    if (k === 'f') {
      const w = WEAPONS[act[1] ? 'scatter' : 'pistol']; const ray = { ox: act[2] / 100, oy: act[3] / 100, oz: act[4] / 100, dx: act[5] / 1000, dy: act[6] / 1000, dz: act[7] / 1000 };
      const l = Math.hypot(ray.dx, ray.dy, ray.dz) || 1; ray.dx /= l; ray.dy /= l; ray.dz /= l; this.stats[from].Shots++;
      const pellets = w.pellets;
      for (let i = 0; i < pellets; i++) {
        let r = ray; if (w.cone) { const sp = w.cone * Math.PI / 180; r = { ...ray, dx: ray.dx + this.rng.range(-sp, sp), dy: ray.dy + this.rng.range(-sp, sp), dz: ray.dz + this.rng.range(-sp, sp) }; const ll = Math.hypot(r.dx, r.dy, r.dz); r.dx /= ll; r.dy /= ll; r.dz /= ll; }
        const hit = this.combat.trace(r, 80, {});
        if (hit.kind === 'enemy') { const res = hit.enemy.takeHit({ amount: w.damage, zone: hit.zone, fromX: g.x, fromZ: g.z, pellets: pellets > 1, knock: pellets > 1 ? 1.2 : 0.2, by: from, source: w.id }); this.stats[from].Hits++; this.addScore(from, hit.zone === 'head' ? 15 : 10); this.evq.push(['hit', hit.enemy.id]); if (res.killed && hit.zone === 'head') { /* head bonus counted in onKill */ } }
      }
    } else if (k === 'k') {
      const e = this.enemies.find((x) => x.id === act[1]); if (e && !e.dead && Math.hypot(e.x - g.x, e.z - g.z) < 3) { for (const o of this.enemies) if (!o.dead && Math.hypot(o.x - g.x, o.z - g.z) < TUNING.kickRadius) { o.takeHit({ amount: o === e ? 40 : TUNING.kickDamage, zone: 'torso', fromX: g.x, fromZ: g.z, raw: true, by: from, source: 'kick' }); if (!o.dead) o.knockdown(2.2, g.x, g.z); } this.stats[from].Kicks++; }
    } else if (k === 'n') { for (const o of this.enemies) if (!o.dead && Math.hypot(o.x - g.x, o.z - g.z) < 2) o.takeHit({ amount: 8, zone: 'torso', fromX: g.x, fromZ: g.z, raw: true, by: from, knife: true }); }
    else if (k === 'u') { /* revive handled by proximity and the reviving flag */ g.reviving = true; }
    else if (k === 'd') { if (act[1] === 1) { g.downed = true; g.bleed = 20; } else { g.downed = false; g.dead = true; } }
  }
  applySnapshot(d) {
    if (this.lastSnap && d.n <= this.lastSnap) return; this.lastSnap = d.n; this.clock = d.s[0]; this.wave = d.s[1]; this.teamScore = d.s[2];
    const t = this.time; const seen = new Set();
    for (const r of d.e) {
      const [id, ti, x, z, yaw, si, hp] = r; seen.add(id);
      let g = this.ghostEnemies.get(id);
      if (!g) { g = new GhostEnemy(this, TYPE_NAMES[ti] || 'gaffer', x / 100, z / 100, id); this.ghostEnemies.set(id, g); this.enemies.push(g); }
      g.push(t, x / 100, z / 100, yaw * Math.PI / 180, STATE_NAMES[si], hp);
    }
    for (const [id, g] of [...this.ghostEnemies]) if (!seen.has(id)) { if (!g.dead) { g.dead = true; g.h.play('Death', { once: true, hold: true }); } this.ghostEnemies.delete(id); }
    for (const r of d.p) {
      const [id, x, z, yaw, fl, hp] = r;
      if (id === this.mySeat()) { if (hp <= 0 && !this.player.downed && !this.player.dead) { this.run.hp = 0; } continue; }
      const g = this.ghosts.find((q) => q.id === id); if (g) { g.push(t, x / 100, z / 100, yaw * Math.PI / 180, 0, fl); g.hp = hp; g.downed = !!(fl & 4); }
    }
  }
  applyEvents(ev, local) {
    for (const e of ev) {
      const [k, a1, a2] = e;
      if (k === 'hit' && !local) { /* hit feedback */ }
      else if (k === 'down' && a1 === this.mySeat() && !local) { this.player.downed = true; this.bleed = 20; this.run.hp = 0; }
      else if (k === 'rev' && a1 === this.mySeat() && !local) { this.player.downed = false; this.player.dead = false; this.run.hp = this.run.maxHp * 0.5; this.bleed = 20; }
      else if (k === 'horn') { if (!local) { this.horn = true; if (a1 === 2) { this.audio('foghorn'); this.won = true; } } }
      else if (k === 'hurt' && a1 === this.mySeat() && !local) { this.run.hp = a2; }
      if (k === 'dead' && a1 === this.mySeat()) this.player.dead = true;
    }
  }
  // ---------- end ----------
  endShift(won) {
    if (this.shiftOver) return; this.shiftOver = true; this.won = won;
    const seats = this.session ? this.session.players : [{ id: 0, name: 'MAX' }];
    const acc = (id) => { const s = this.stats[id]; return s && s.Shots ? Math.round(s.Hits / s.Shots * 100) + '%' : '0%'; };
    const order = seats.map((s) => s.id).sort((a, b) => (this.score[b] || 0) - (this.score[a] || 0));
    const standings = []; for (const id of order) { const last = standings[standings.length - 1]; if (last && (this.score[last[0]] || 0) === (this.score[id] || 0)) last.push(id); else standings.push([id]); }
    const stats = {}; for (const s of seats) stats[s.id] = { ...this.stats[s.id], Accuracy: acc(s.id) };
    const awards = []; const best = (key) => seats.slice().sort((a, b) => (this.stats[b.id]?.[key] || 0) - (this.stats[a.id]?.[key] || 0))[0];
    if (seats.length) { const b = best('Kills'); if (this.stats[b.id]?.Kills) awards.push({ id: b.id, title: 'CHIEF ADJUSTER', detail: `${this.stats[b.id].Kills} CLAIMS CLOSED` }); const k = best('Kicks'); if (this.stats[k.id]?.Kicks) awards.push({ id: k.id, title: 'STEEL TOE', detail: `${this.stats[k.id].Kicks} KICKS` }); const r = best('Revives'); if (this.stats[r.id]?.Revives) awards.push({ id: r.id, title: 'GOOD SAMARITAN', detail: `${this.stats[r.id].Revives} REVIVES` }); }
    this.results = { standings, scores: { ...this.score }, won, stats, awards };
    if (!this.session) { const board = loadBoard(); board.push({ score: this.score[0] || 0, won, at: Date.now(), name: 'MAX' }); board.sort((a, b) => b.score - a.score); saveBoard(board); }
    if (this.session && this.role === 'host') { this.session.finish(this.results); }
    this.onShiftOver?.(this.results);
    app.mix?.play(null);
    this.ctx.engine.timeScale = 1;
    this.showResults();
  }
  showResults() { app.push(new app.ResultsScreen(this)); }
  hudExtra = null;
  update(ctx, dt) {
    super.update(ctx, dt);
    this.drawShiftHud(ctx);
  }
  drawShiftHud(ctx) {
    if (app.top()) return;
    const W = ui.W, H = ui.H; const left = Math.max(0, SHIFT_SECONDS - this.clock); const m = Math.floor(left / 60), s = Math.floor(left % 60);
    ui.text(W / 2, 6, `${m}:${String(s).padStart(2, '0')}`, { align: 'center', scale: 2, color: left < 20 ? 'red' : 'sand' });
    ui.text(W / 2, 24, this.horn ? 'THE HORN... HOLD ON' : `WAVE ${this.wave}`, { align: 'center', color: this.horn ? 'red' : 'mist' });
    const tot = Object.values(this.score).reduce((a, b) => a + b, 0);
    ui.text(8, 8, `SCORE ${this.session ? tot : (this.score[0] || 0)}`, { color: 'white' }); if (this.combo.n > 1) ui.text(8, 18, `COMBO X${(1 + Math.min(4, this.combo.n) * 0.25).toFixed(2)}`, { color: 'orange' });
    if (this.session && this.countdown > 0 && this.clock < 0.1) ui.text(W / 2, H / 2 - 20, String(Math.ceil(this.countdown)), { align: 'center', scale: 5, color: 'sand' });
    // name tags and colours
    for (const g of this.ghosts) { if (g.left) continue; const v = new Vector3(g.x, 2.2, g.z).project(ctx.camera.camera); if (v.z > 1 || v.z < -1) continue; const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; ui.text(x, y, g.name + (g.downed ? ' DOWN' : ''), { align: 'center', color: SCARF[g.id % 4] === 'sand' ? 'sand' : SCARF[g.id % 4] }); if (g.downed) ui.bar(x - 15, y + 9, 30, 3, g.bleed / 20, 'red'); }
    const p = this.player; if (p.downed) { ui.text(W / 2, H / 2 - 30, 'DOWN! WAIT FOR A FRIEND', { align: 'center', scale: 2, color: 'red' }); ui.bar(W / 2 - 40, H / 2 - 10, 80, 5, this.bleed / 20, 'red'); }
    if (this.ghosts.some((g) => g.downed && Math.hypot(g.x - p.x, g.z - p.z) < 1.8)) ui.text(W / 2, H - 56, 'HOLD ACTION TO REVIVE', { align: 'center', color: 'lime' });
  }
}
export { GhostEnemy, Ghost, TYPE_NAMES };
