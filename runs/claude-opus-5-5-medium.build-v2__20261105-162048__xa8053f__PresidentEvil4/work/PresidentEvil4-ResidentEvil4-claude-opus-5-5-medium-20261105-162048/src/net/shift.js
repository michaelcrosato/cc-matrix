// Night Shift: hold the quay till dawn. The host simulates everything; clients own their own player. See PLAN section 7.
import { setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { WEAPONS, weaponStats } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { addItem, newRun, ammoOf } from '../core/run.js';
import { BIND } from '../core/intent.js';
import { Area } from '../game/area.js';
import { Player } from '../game/player.js';
import { Humanoid } from '../game/actor.js';
import { project } from '../game/hud.js';
import { siegeRoomSetup } from '../game/setpieces.js';
import { save } from '../core/save.js';
import { SettingsScreen } from '../screens/settings.js';
export const SHIFT_SECONDS = 240;
const TYPES = Object.keys(ENEMIES); const STATES = ['APPROACH', 'CIRCLE', 'WINDUP', 'ATTACK', 'RECOVER', 'STUN', 'KNEEL', 'FLINCH', 'KNOCKDOWN', 'GETUP', 'BASH', 'VAULT', 'CLIMB', 'THROW', 'SEA', 'SINK', 'ALERT', 'WORK', 'GRAB', 'BLIND', 'PIN', 'RISE', 'DEAD'];
const CLIP = { WINDUP: 'RaiseTool', ATTACK: 'Swing', RECOVER: 'Idle', STUN: 'StunHands', KNEEL: 'KneelHit', FLINCH: 'HitReact', KNOCKDOWN: 'KnockedDown', GETUP: 'GetUp', BASH: 'BashDoor', VAULT: 'Vault', CLIMB: 'LadderUp', THROW: 'ThrowOverhand', SEA: 'WalkToSea', SINK: 'Wade', ALERT: 'Shout', WORK: 'WorkChop', GRAB: 'Grapple', BLIND: 'StunHands', PIN: 'HitReact', RISE: 'DrownedRise', DEAD: 'Death' };
const ACTIVE_ACTIONS = 6;
export function shiftRun() { const r = newRun('standard'); addItem(r, 'scatter'); r.weapons.scatter.tune = { power: 1 }; r.weapons.pistol.tune = { power: 1, capacity: 1 }; r.weapons.scatter.ammo = 6; r.items = r.items.filter((i) => i.id !== 'samphire'); addItem(r, 'ammo_shells', 18); addItem(r, 'samphire'); return r; }
/** A view of a host enemy. Same puppet, clips chosen from state, interpolated 120 ms behind. */
class GhostEnemy {
  constructor(A, id, type) { this.area = A; this.id = id; this.type = type; this.def = ENEMIES[type]; this.dead = false; this.floor = 0; this.pos = new THREE.Vector3(); this.yaw = 0; this.state = 'APPROACH'; this.buf = []; this.crawler = !!this.def.crawler; this.hp = 100; this.scale = 1; this.ghost = true;
    if (this.crawler) { this.h = null; this.zones = { head: new THREE.Vector3(), headR: 0.34 }; this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), toonMaterial(0x7d2a7e)); A.ctx.scene.add(this.ball); this.root = this.ball; } else { const model = this.def.variants ? this.def.variants[id % this.def.variants.length] : this.def.model; this.h = new Humanoid(A.ctx, model); this.root = this.h.root; this.zones = { head: new THREE.Vector3(), headR: 0.2, pelvis: new THREE.Vector3(), neck: new THREE.Vector3(), torsoR: 0.22, armRa: new THREE.Vector3(), armRb: new THREE.Vector3(), armLa: new THREE.Vector3(), armLb: new THREE.Vector3(), armR: 0.09, legRa: new THREE.Vector3(), legRb: new THREE.Vector3(), legLa: new THREE.Vector3(), legLb: new THREE.Vector3(), legR: 0.11 }; }
    if (this.def.saw) this.sawVoice = A.ctx.audio.loop('sawloop', { volume: 0 });
  }
  fixed() {}
  damage() { return false; }
  kickable() { return this.state === 'STUN' || this.state === 'BLIND'; }
  takedownable() { return this.state === 'KNEEL'; }
  get target() { return null; }
  push(t, x, z, yaw, st, hp, floor) { this.buf.push({ t, x, z, yaw }); if (this.buf.length > 6) this.buf.shift(); this.state = st; this.hp = hp; this.floor = floor; }
  update(dt) {
    const A = this.area, now = A.netTime() - 120, b = this.buf; if (b.length) { let i = b.length - 1; while (i > 0 && b[i - 1].t > now) i--; const q = b[i], p = b[Math.max(0, i - 1)]; const k = q.t > p.t ? Math.max(0, Math.min(1, (now - p.t) / (q.t - p.t))) : 1; this.pos.set(p.x + (q.x - p.x) * k, this.floor * A.floorH, p.z + (q.z - p.z) * k); let d = q.yaw - p.yaw; if (d > 180) d -= 360; if (d < -180) d += 360; this.yaw = ((p.yaw + d * k) * Math.PI) / 180; }
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; if (!this.h) { this.root.position.y = 0.2; this.zones.head.copy(this.root.position); return; }
    const moving = this.state === 'APPROACH' || this.state === 'CIRCLE'; const c = moving ? this.def.gait ?? 'Shamble' : CLIP[this.state] ?? 'Idle'; if (this.anim !== c) { this.anim = c; this.h.play(c); } this.h.update(dt);
    const J = this.h.joints, z = this.zones; this.root.updateWorldMatrix(true, true); J.Head.getWorldPosition(z.head); z.neck.copy(z.head); z.head.y += 0.13; J.Pelvis.getWorldPosition(z.pelvis); J.ArmR.getWorldPosition(z.armRa); J.HandR.getWorldPosition(z.armRb); J.ArmL.getWorldPosition(z.armLa); J.HandL.getWorldPosition(z.armLb); J.LegR.getWorldPosition(z.legRa); J.FootR.getWorldPosition(z.legRb); J.LegL.getWorldPosition(z.legLa); J.FootL.getWorldPosition(z.legLb);
    if (this.sawVoice) { const s = A.spatial(this.pos, { max: 30, ref: 3 }); this.sawVoice.set({ volume: s.gain * 0.8, pan: s.pan }); }
  }
  destroy() { this.sawVoice?.stop(); if (this.h) this.h.remove(); else this.area.ctx.scene.remove(this.ball); }
}
export class ShiftArena extends Area {
  constructor(app, session, o = {}) { super(app, 'shift', { fromSave: true, noPause: true, ...o }); this.session = session; this.name = 'area-shift'; this.seats = {}; this.score = {}; this.phase = 'card'; this.ghosts = new Map(); this.lastSnap = 0; this.sendI = 0; this.sendA = 0; this.actions = []; this.events = []; this.sendE = 0; this.clockS = 0; this.snapBytes = 0; this.stats_ = { snaps: 0, maxBytes: 0, msgs: 0 }; this.dropN = 1; this.net = []; }
  get isHost() { return this.session.isHost; }
  netTime() { return this.session.time(); }
  async setup(ctx) {
    this.app.attach(ctx.engine); this.app.run = shiftRun(); this.def = { ...this.def, setup: (a) => siegeRoomSetup(a), startYaw: 0, beats: [], music: null, mood: 'rain', dress: { wall: ['barrel', 'crate', 'bucket', 'fish-crate'], open: ['puddle'] }, decor: [['hay-cart', 32.5, 16], ['foghorn', 57, 7], ['drying-rack', 12, 3.5], ['anchor-prop', 49.5, 8]], lamps: [['lamp-post', 48, 14], ['lamp-post', 48, 28], ['lamp-post', 20, 15], ['lamp-post', 38, 15], ['lamp-post', 18, 30], ['lamp-post', 37, 30], ['campfire', 23, 28, { intensity: 16, radius: 12, color: 0xff8030 }]], barrels: [[37, 24], [24, 37], [12, 12]], treasure: [] };
    const S = this.session; ctx.engine.seed; const server = S.server; const me = S.players.find((p) => p.id === S.me);
    this.o.at = this.seatSpot(me ? me.id : 0); this.o.yaw = 3.14; this.fillLight = 1.1; await super.setup(ctx);
    const P = this.player; this.interact.items = this.interact.items.filter((x) => !x.verb?.startsWith?.('OPEN') && !x.verb?.startsWith?.('SAVE')); this.tannoys.forEach((t) => { t.dead = true; }); this.silent = false; this.tannoyTick = () => {};
    if (server || !me) { P.remote = true; P.spectator = true; P.root.visible = false; for (const m of P.scarfMeshes) m.visible = false; P.laser.visible = false; P.remoteSpect = true; P.body && ctx.physics.remove(P.body.body); }
    this.players = []; const idx = (p) => p.id;
    for (const p of S.players) { const isMe = p.id === S.me && !server; let pl; if (isMe) { pl = P; pl.index = p.id; pl.scarfColor = p.color; for (const m of pl.scarfMeshes) m.material = toonMaterial(new THREE.Color(p.color).getHex()); } else { const at = this.seatSpot(p.id); pl = new Player(this, at[0], at[1], { index: p.id, remote: true, scarf: new THREE.Color(p.color).getHex() }); } pl.seat = p; this.seats[p.id] = pl; this.players.push(pl); this.score[p.id] = { hp: 100, score: 0, kills: 0, heads: 0, kicks: 0, revives: 0, shots: 0, hits: 0, combo: 0, comboT: 0, down: false, out: false, bleed: 20, rev: 0, left: false }; }
    this.me = this.seats[S.me] && !server ? this.seats[S.me] : null; this.resolveShots = this.isHost ? undefined : false;
    this.off = []; const on = (e, f) => this.off.push(S.on(e, f));
    on('message', (d, from) => this.onMessage(d, from)); on('leave', (o) => this.onLeave(o)); on('time-up', () => { if (this.isHost) this.finishRound(false, 'time'); }); on('end', (o) => this.onEnd(o)); on('start', (o) => { this.phase = 'countdown'; }); on('card', (c) => { this.card = c; });
    if (!this.isHost) { this.level.doors.forEach((d) => { }); }
    this.ctx.audio.setVolume; this.app.mix.play(null); this.moodLights(); this.rngHost = this.rng; this.waveState = { next: 0 };
    if (this.isHost) S.send({ hi: 1 }); else if (this.me) S.send({ hi: 1 }, { to: S.host }); // Say hello at once: a round may end before any snapshot.
    if (typeof window !== 'undefined') this.timer = setInterval(() => this.netTimer(), this.isHost ? 111 : 84); if (S.ready) S.ready(); this.cardOn = !!S.isHubCard; this.ctx.input.preventKeys.add('Tab');
    if (this.session.hub && typeof window !== 'undefined') { this.keyAns = (e) => { if (this.phase === 'card' && e.code === 'Enter') window.AIHub.answer('ready'); if (this.phase === 'card' && (e.code === 'KeyM')) window.AIHub.answer('more'); }; window.addEventListener('keydown', this.keyAns); }
  }
  moodLights() { }
  seatSpot(id) { const L = [[26, 18], [30, 18], [26, 22], [30, 22]][id % 4]; const m = 64, h = 48; return [L[0] + 0.5 - m / 2, L[1] + 0.5 - h / 2]; }
  weaponOf(P) { return P === this.player || !P.remoteWeapon ? this.app.run?.weapon ?? 'pistol' : P.remoteWeapon; }
  // ----- host: world
  hostFixed(dt) {
    const s = this.session; const clock = s.time() / 1000; this.clockS = Math.max(0, clock); if (clock < 0) return;
    const alive = this.enemies.filter((e) => !e.dead).length; const spawn = (type, n) => { for (let i = 0; i < n; i++) { if (this.enemies.filter((e) => !e.dead).length >= 24) break; const doors = '12345'; const d = this.level.spawns[doors[Math.floor(this.rngHost.next() * 5)]]; this.spawnEnemy(type, d.x + this.rngHost.range(-0.5, 0.5), d.z + this.rngHost.range(-0.5, 0.5)); } };
    const w = this.waveState; while (!w.over && clock >= w.next) { const t = w.next; if (t === 0) spawn('gaffer', 8); else if (t < 236) { const k = this.players.length; if (t % 10 === 0) spawn('gaffer', 1 + Math.floor(k / 2)); if (t >= 60 && t % 20 === 0) spawn('bottler', 1); if (t === 120) { spawn('flenser', 1); } if (t >= 180 && t % 15 === 0) spawn('runner', 2); if (t === 180) spawn('flenser', 2); if (t === 220) this.event(['horn', 1]); } w.next += 5; if (w.next > SHIFT_SECONDS - 5) w.over = true; }
    if (clock >= SHIFT_SECONDS && !this.dawn) { this.dawn = true; this.event(['dawn']); this.playDawn(); for (const e of this.enemies) { if (!e.dead) { e.path = null; e.setState('SEA'); e.hesitate = this.rngHost.range(0, 1.2); e.cool = 99; } } this.ctx.tweens.call(4, () => this.finishRound(true, 'dawn')); }
    // Downed players bleed. Revive: hold Action 2 s beside them.
    for (const p of this.players) { const sc = this.score[p.seat.id]; if (sc.left) continue; sc.comboT = Math.max(0, sc.comboT - dt); if (sc.comboT <= 0) sc.combo = 0; if (sc.down && !sc.out) { sc.bleed -= dt; let rev = false; for (const q of this.players) { const qs = this.score[q.seat.id]; if (q === p || qs.down || qs.left) continue; if (q.reviving && Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < 2) { rev = q; break; } } if (rev) { sc.rev += dt; if (sc.rev >= 2) { sc.down = false; sc.hp = 50; sc.bleed = 20; sc.rev = 0; this.score[rev.seat.id].revives++; this.addScore(rev.seat.id, 100); p.down = false; this.event(['revived', p.seat.id, rev.seat.id]); } } else sc.rev = 0; if (sc.bleed <= 0) { sc.out = true; p.dead = true; this.event(['out', p.seat.id]); } } }
    const live = this.players.filter((p) => { const c = this.score[p.seat.id]; return !c.left && !c.down && !c.out; }); if (!live.length && this.players.length && clock > 2 && !this.ended_) this.finishRound(false, 'down');
    if (typeof window === 'undefined') { if (!this.lastWS) this.lastWS = 0; if (clock - this.lastWS > 1 / 9) { this.lastWS = clock; this.sendSnapshot(); } this.flushEvents(dt); }
  }
  addScore(id, n) { const s = this.score[id]; if (s) s.score += Math.round(n * (1 + s.combo * 0.1)); }
  sendSnapshot() {
    const e = [], list = this.enemies.filter((x) => !x.dead || x.sinking).slice(0, 24); for (const x of list) { e.push([x.id % 9999, TYPES.indexOf(x.type), Math.round(x.pos.x * 100), Math.round(x.pos.z * 100), Math.round((x.yaw * 180) / Math.PI), STATES.indexOf(x.state), Math.round((Math.max(0, x.hp) / x.maxHp) * 100), x.floor]); }
    const p = this.players.map((q) => { const s = this.score[q.seat.id]; return [q.seat.id, Math.round(q.pos.x * 100), Math.round(q.pos.z * 100), Math.round((q.yaw * 180) / Math.PI), (s.down ? 1 : 0) | (s.out ? 2 : 0) | (q.aiming ? 4 : 0), Math.round(s.hp), s.score, q.floor ?? 0]; });
    const msg = { w: 1, n: (this.snapN = (this.snapN ?? 0) + 1), t: Math.round(this.session.time()), e, p, s: [Math.round(this.clockS), 0, Object.values(this.score).reduce((a, b) => a + b.score, 0)] };
    const bytes = JSON.stringify(msg).length; this.stats_.maxBytes = Math.max(this.stats_.maxBytes, bytes); if (bytes < 1200) this.session.send(msg, { reliable: false }); else { msg.e = e.slice(0, 18); this.session.send(msg, { reliable: false }); }
    this.stats_.snaps++;
  }
  event(ev) { if (this.isHost) { this.events.push(ev); this.applyEvent(ev, true); } }
  flushEvents(dt) { this.sendE -= dt; if (this.sendE <= 0 && this.events.length) { this.sendE = 1 / 7; const batch = this.events.splice(0, 30); this.session.send({ e: batch }); } }
  applyEvent(ev, local) {
    const [k, a, b] = ev;
    if (k === 'hurt') { if (this.me && a === this.me.seat.id) this.meHurt(b, ev[3]); }
    else if (k === 'down') { const p = this.seats[a]; if (p) { p.down = true; if (p === this.me) this.setDown(true); } this.ctx.audio.play('sting', { volume: 0.5 }); }
    else if (k === 'revived') { const p = this.seats[a]; if (p) { p.down = false; if (p === this.me) { this.setDown(false); this.app.run.health = 50; } } this.ctx.audio.play('uiconfirm'); }
    else if (k === 'out') { const p = this.seats[a]; if (p) { p.dead = true; p.down = true; if (p === this.me) { p.locked = true; } } }
    else if (k === 'horn') { this.ctx.audio.play('foghorn', { volume: 0.5 }); this.hornWarn = 6; }
    else if (k === 'dawn') { if (!local) this.playDawn(); }
    else if (k === 'door') { const d = this.level.doors.find((x) => x.id === a); if (d && !d.open) { this.fromNet = true; this.level.openDoor(d, null); this.fromNet = false; } }
    else if (k === 'crate') { const c = this.level.crates.find((x) => x.id === a); if (c && !c.dead) { this.fromNet = true; this.level.breakCrate(c); this.fromNet = false; } }
    else if (k === 'drop') { if (!local) this.netDrop(a, b, ev[3], ev[4], ev[5]); }
    else if (k === 'dropgone') { this.removeNetDrop(a); }
    else if (k === 'give') { if (this.me && a === this.me.seat.id) { const left = addItem(this.app.run, b, ev[3]); this.ctx.audio.play('pickup'); } }
    else if (k === 'kill') { this.ctx.audio.play('dyegrunt', { volume: 0.4 }); }
    else if (k === 'fx') { this.ctx.particles.burst(a, [b / 100, 1, ev[3] / 100]); }
    else if (k === 'shot') { if (!this.me || a !== this.me.seat.id) this.ctx.audio.play(b, this.spatialPlay(this.seats[a]?.pos ?? this.player.pos, 0.7)); }
    else if (k === 'thr') { if (!local) super.spawnThrow({ def: { throws: a, dmg: 0 }, zones: { armRb: new THREE.Vector3(b / 100, 1.5, ev[3] / 100) } }, { pos: new THREE.Vector3(ev[4] / 100, 0, ev[5] / 100) }); }
    else if (k === 'blast') { this.fx.blast(new THREE.Vector3(a / 100, 0.4, b / 100), 3); this.ctx.audio.play('barrel', { volume: 0.6 }); }
  }
  meHurt(dmg, dirDeg) { const P = this.me, run = this.app.run; run.health = Math.max(0, run.health - dmg); this.ctx.audio.play('hurtmax'); this.ctx.engine.shake.add(0.3); P.h.flash(); P.hitDir = (dirDeg * Math.PI) / 180; P.hitDirT = 0.8; }
  setDown(on) { const P = this.me; P.locked = on; P.down = on; P.aiming = false; if (on) { P.h.upperName = null; P.h.play('LieIdle', { fade: 0.2 }); } else { P.h.play('GetUp', { fade: 0.2 }); } }
  // ----- damage comes here on the host
  remoteHurt(P, amount, from, o) {
    if (!this.isHost) return; const id = P.seat?.id; if (id == null) return; const sc = this.score[id]; if (!sc || sc.down || sc.out || P.remoteInvuln > this.ctx.time) return; if (!o.dot) P.remoteInvuln = this.ctx.time + 0.35; const dmg = Math.min(sc.hp, o.saw ? 60 : amount); sc.hp -= dmg; const deg = from ? Math.round((Math.atan2(from.x - P.pos.x, from.z - P.pos.z) * 180) / Math.PI) : 0; if (!o.dot) this.event(['hurt', id, Math.round(dmg), deg]); else { P.dotAcc = (P.dotAcc ?? 0) + dmg; if (P.dotAcc > 3) { this.event(['hurt', id, Math.round(P.dotAcc), deg]); P.dotAcc = 0; } }
    if (sc.hp <= 0) { sc.down = true; sc.hp = 0; sc.bleed = 20; P.down = true; this.event(['down', id]); }
  }
  // Kills and scores (host)
  onKill(e, info, head) { if (!this.isHost) return; const by = info.by?.seat?.id ?? info.byId; if (by != null && this.score[by]) { const s = this.score[by]; s.kills++; s.combo++; s.comboT = 4; if (head) { s.heads++; this.addScore(by, 25); } if (info.weapon === 'kick') { this.addScore(by, 40); } this.addScore(by, 50); } if (this.rngHost.chance(0.42)) this.hostDrop(e.pos); }
  onEnemyHit(e, zone, info) { const by = info.by?.seat?.id; if (by != null) { this.score[by].hits++; this.addScore(by, 10); } }
  hostDrop(p) { const R = this.rngHost.next(); const id = R < 0.35 ? 'ammo_pistol' : R < 0.6 ? 'ammo_shells' : R < 0.85 ? 'samphire' : R < 0.92 ? 'flare' : 'depth'; const n = this.dropN++; const count = ITEMS[id].gives ?? 1; this.netDrop(n, id, count, Math.round(p.x * 100), Math.round(p.z * 100)); this.event(['drop', n, id, count, Math.round(p.x * 100), Math.round(p.z * 100)]); }
  dropLoot() {}
  /** Thrown attacks are simulated on the host and drawn on every copy. */
  spawnThrow(e, T) { super.spawnThrow(e, T); if (this.isHost) { const f = e.zones.armRb; this.event(['thr', e.def.throws, Math.round(f.x * 100), Math.round(f.z * 100), Math.round(T.pos.x * 100), Math.round(T.pos.z * 100)]); } }
  netDrop(n, id, count, xc, zc) { const col = { ammo: 0xffcd75, herb: 0xa7f070, grenade: 0xb13e53 }[ITEMS[id].kind] ?? 0xf4f4f4; const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), toonMaterial(col)); m.position.set(xc / 100, 0.35, zc / 100); setLookLayer(m, 'actors'); this.ctx.scene.add(m); this.net.push({ n, id, count, x: xc / 100, z: zc / 100, m }); }
  removeNetDrop(n) { const i = this.net.findIndex((d) => d.n === n); if (i >= 0) { this.ctx.scene.remove(this.net[i].m); this.net.splice(i, 1); } }
  // ----- doors and crates echo across copies
  markDoor(d) { if (this.fromNet) return; if (this.isHost) this.event(['door', d.id]); else this.queueAction(['d', d.id]); }
  markCrate(c) { if (this.fromNet) return; if (this.isHost) this.event(['crate', c.id]); }
  markGate() {} markBeat() {} checkpoint() {} 
  // ----- messages
  onMessage(d, from) {
    if (d.w && !this.isHost) { for (const x of d.e) { const [id, ty, xc, zc, yaw, st, hp, fl] = x; let g = this.ghosts.get(id); if (!g) { g = new GhostEnemy(this, id, TYPES[ty]); this.ghosts.set(id, g); this.enemies.push(g); } g.seen = d.n; g.push(d.t, xc / 100, zc / 100, yaw, STATES[st], hp, fl ?? 0); } for (const [id, g] of this.ghosts) if (g.seen !== d.n && d.e.length < 24) { g.dead = true; this.enemies.splice(this.enemies.indexOf(g), 1); g.destroy(); this.ghosts.delete(id); }
      for (const q of d.p) { const [id, xc, zc, yaw, flags, hp, score, fl] = q; const pl = this.seats[id]; if (!pl) continue; if (this.score[id]) { this.score[id].score = score; this.score[id].hp = hp; } if (pl !== this.me) { pl.netT = pl.pos.clone(); pl.tgt = [xc / 100, zc / 100]; pl.yaw = (yaw * Math.PI) / 180; pl.aiming = !!(flags & 4); pl.floor = fl ?? 0; pl.down = !!(flags & 1); } else if (this.me) this.app.run.health = hp; } this.clockS = Math.max(0, d.s[0]); this.teamScore = d.s[2]; return; }
    if (d.e && !this.isHost) { for (const ev of d.e) this.applyEvent(ev); return; }
    if (d.i && this.isHost) { const pl = this.seats[from]; if (!pl) return; const [x, z, yaw, pitch, flags, wid] = d.i; pl.tgt = [x / 100, z / 100]; pl.yaw = (yaw * Math.PI) / 180; pl.camPitch = (pitch * Math.PI) / 180; pl.aiming = !!(flags & 1); pl.reviving = !!(flags & 2); pl.floor = flags & 4 ? 1 : 0; if (pl.remoteWeapon !== wid) { pl.remoteWeapon = wid; pl.setWeaponModel(); } return; }
    if (d.a && this.isHost) { for (const a of d.a) this.hostAction(from, a); }
  }
  hostAction(from, a) {
    const pl = this.seats[from], sc = this.score[from]; if (!pl || sc.down || sc.out) return; const [k] = a;
    if (k === 'f') { const [, w, ox, oy, oz, dx, dy, dz] = a; const W = weaponStats(w, w === 'pistol' ? { power: 1, capacity: 1 } : { power: 1 }); this.event(['shot', from, w]); const o = new THREE.Vector3(ox / 100, oy / 100, oz / 100), d = new THREE.Vector3(dx / 1000, dy / 1000, dz / 1000).normalize(); sc.shots++; for (let p = 0; p < W.pellets; p++) { const di = d.clone(); if (W.pellets > 1) { const ang = this.rngHost.next() * 6.28, r = Math.tan((W.cone * Math.PI) / 180) * Math.sqrt(this.rngHost.next()); pl.camYaw = Math.atan2(d.x, d.z); pl.spreadDir(di, Math.cos(ang) * r, Math.sin(ang) * r); } this.resolveShot(pl, o, di, W, w); } }
    else if (k === 'k') { const t = this.enemies.find((e) => !e.dead && e.id % 9999 === a[1]); if (t) { sc.kicks++; this.kickHitNet(pl, t, a[2]); } }
    else if (k === 'n') this.knifeHit(pl);
    else if (k === 'u') { const i = this.net.findIndex((d) => d.n === a[1]); if (i >= 0) { const d = this.net[i]; this.event(['give', from, d.id, d.count]); this.event(['dropgone', d.n]); } }
    else if (k === 'd') { const d = this.level.doors.find((x) => x.id === a[1]); if (d && !d.open) { this.fromNet = true; this.level.openDoor(d, pl.pos); this.fromNet = false; this.event(['door', d.id]); } }
    else if (k === 'g') { const G = a[1]; this.detonateAt(G, a[2] / 100, a[3] / 100); }
  }
  detonateAt(kind, x, z) { const at = new THREE.Vector3(x, 0.1, z); if (kind === 'depth') { this.ctx.tweens.call(1.5, () => { this.explode(at.clone().setY(0.4), 4, 80); this.event(['blast', Math.round(x * 100), Math.round(z * 100)]); }); } else if (kind === 'flare') { for (const e of this.enemies) if (!e.dead && e.pos.distanceTo(at) < 6) { if (e.crawler) e.die({}); else if (!e.def.heavy) e.setState('BLIND', 4); } this.event(['fx', 'flare', Math.round(x * 100), Math.round(z * 100)]); } else this.spawnFire(at, 2.6, 3); }
  kickHitNet(P, target, kind) { super.kickHit(P, target, kind); }
  kickHit(P, target, kind) { if (this.isHost) { this.score[P.seat.id].kicks++; for (const e of this.enemies) e.lastKickBy = P; super.kickHit(P, target, kind); } else { this.queueAction(['k', target.id % 9999, kind]); this.ctx.audio.play('kickhit'); this.ctx.engine.shake.add(0.3); } }
  knifeHit(P) { if (this.isHost) super.knifeHit(P); else { this.queueAction(['n']); } }
  throwGrenade(P, kind, at) { const x = at ? at.x : P.pos.x + Math.sin(P.camYaw) * 7, z = at ? at.z : P.pos.z + Math.cos(P.camYaw) * 7; super.throwGrenade(P, kind, at); if (this.isHost) this.detonateAt(kind, x, z); else this.queueAction(['g', kind, Math.round(x * 100), Math.round(z * 100)]); }
  detonate(p) { if (p.grenade === 'oil' && !this.isHost) return; this.ctx.particles.burst('flare', p.pos, { count: 10 }); this.ctx.audio.play('flare', { volume: 0.6 }); }
  queueAction(a) { this.actions.push(a); }
  fireLocal(P, o, d, wid) { if (this.isHost) { this.score[P.seat.id].shots++; this.event(['shot', P.seat.id, wid]); return; } this.queueAction(['f', wid, Math.round(o.x * 100), Math.round(o.y * 100), Math.round(o.z * 100), Math.round(d.x * 1000), Math.round(d.y * 1000), Math.round(d.z * 1000)]); }
  // ----- client: send own pose
  clientFixed(dt) {
    if (typeof window === 'undefined') this.clientSend(dt);
  }
  /** Network sends run on a timer in a page: a slow renderer must not starve the wire. */
  netTimer() { if (this.stopped || this.ended_ || this.session.time() === -Infinity) return; this.netTickN = (this.netTickN ?? 0) + 1; if (this.isHost) { this.sendSnapshot(); if (this.netTickN % 2 === 0 && this.events.length) { const batch = this.events.splice(0, 30); this.session.send({ e: batch }); } } else this.clientSend(1 / 12, this.netTickN % 2 === 0); }
  clientSend(dt, force) {
    const P = this.me; if (!P) return; if (this.session.time() === -Infinity) return; this.sendI -= dt; this.sendA -= dt;
    if (this.sendI <= 1e-6) { this.sendI = 1 / 12; const flags = (P.aiming ? 1 : 0) | (this.human.i.actionHeld ? 2 : 0) | (P.floor ? 4 : 0); this.session.send({ i: [Math.round(P.pos.x * 100), Math.round(P.pos.z * 100), Math.round((P.yaw * 180) / Math.PI), Math.round((P.camPitch * 180) / Math.PI), flags, this.app.run.weapon] }, { to: this.session.host, reliable: false }); }
    if ((this.sendA <= 0 || force) && this.actions.length) { this.sendA = 1 / 6; const batch = this.actions.splice(0, 20); this.session.send({ a: batch }, { to: this.session.host }); }
  }
  onLeave({ id }) { const p = this.seats[id]; const sc = this.score[id]; if (sc) sc.left = true; if (p && p !== this.player) { p.remove(); this.players = this.players.filter((x) => x !== p); delete this.seats[id]; } if (this.isHost) this.checkEnd?.(); }
  finishRound(won, why) {
    if (this.ended_) return; this.ended_ = true; const S = this.session; const ids = Object.keys(this.score).map(Number).filter((i) => !this.score[i].left); ids.sort((a, b) => this.score[b].score - this.score[a].score); const standings = []; for (const i of ids) { const last = standings.at(-1); if (last && this.score[last[0]].score === this.score[i].score) last.push(i); else standings.push([i]); } const scores = {}, stats = {}, awards = [];
    let top = {}; for (const i of ids) { const s = this.score[i]; scores[i] = s.score; const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0; stats[i] = { Score: s.score, Kills: s.kills, Heads: s.heads, Kicks: s.kicks, Revives: s.revives, Accuracy: `${acc}%` }; if (s.heads >= (top.h?.[1] ?? 1)) top.h = [i, s.heads]; if (s.kicks >= (top.k?.[1] ?? 1)) top.k = [i, s.kicks]; if (s.revives >= (top.r?.[1] ?? 1)) top.r = [i, s.revives]; }
    if (top.h) awards.push({ id: top.h[0], title: 'Chief Adjuster', detail: `${top.h[1]} headshots` }); if (top.k) awards.push({ id: top.k[0], title: 'Steel Toe', detail: `${top.k[1]} kicks` }); if (top.r) awards.push({ id: top.r[0], title: 'Good Samaritan', detail: `${top.r[1]} revives` });
    const out = { standings, scores, won: !!won, stats, awards }; this.finalO = out; S.finish(out); if (S.local) this.showResults(out);
  }
  onEnd(o) { this.stopped = true; clearInterval(this.timer); this.ctx.audio.stopMusic(); this.ctx.audio.stopLoops(); this.ctx.engine.timeScale = this.ctx.engine.timeScale || 1; if (this.session.local) { if (o.finish?.standings) this.showResults(o.finish); else if (o.reason === 'host-left') { this.app.session = null; this.app.goTitle(); } } }
  showResults(f) { if (this.results) return; this.results = f; const myBest = f.scores?.[this.session.me] ?? 0; if (this.session.solo_) { const b = save.get('board', []); b.push(myBest); b.sort((x, y) => y - x); save.set('board', b.slice(0, 5)); } this.app.wantPointerLock(false); }
  playDawn() { this.ctx.audio.play('foghorn'); this.ctx.engine.shake.add(0.6); this.app.mix.play('dawn', 0.4); this.ctx.engine.sun.intensity = 1; this.ctx.engine.ambient.intensity = 1.2; this.mist?.amount && (this.mist.amount.value = 0.3); }
  // ----- frames
  fixedUpdate(ctx, dt) {
    if (this.stopped) return; const S = this.session; const live = S.time() >= 0;
    for (const p of this.players) { if (p !== this.me && p.tgt) { p.prev.copy(p.pos); const k = Math.min(1, dt * 12); p.pos.x += (p.tgt[0] - p.pos.x) * k; p.pos.z += (p.tgt[1] - p.pos.z) * k; p.pos.y = (p.floor ?? 0) * this.floorH; const sp = Math.hypot(p.tgt[0] - p.pos.x, p.tgt[1] - p.pos.z) * 12; p.vel.set(Math.min(5, sp), 0, 0); } }
    if (!live) { this.freezeMe(); this.fixedExtras(dt); return; }
    if (this.me) { this.me.reviving = this.human.i.actionHeld; if (this.isHost) this.score[this.me.seat.id].live = true; }
    if (!this.player.remote) { const i = this.intent.fixed(ctx); this.bot?.fixed(dt, i); if (this.qte.active) this.qte.fixed(dt); this.player.fixed(dt, i); this.interact.pick(this.player); }
    if (this.isHost) { for (const e of [...this.enemies]) e.fixed(dt); this.hostFixed(dt); } else this.clientFixed(dt);
    this.fixedExtras(dt);
    if (this.me && !this.me.down) { for (const d of [...this.net]) if (Math.hypot(d.x - this.me.pos.x, d.z - this.me.pos.z) < 1.2 && !d.asked) { d.asked = true; if (this.isHost) this.hostAction(this.me.seat.id, ['u', d.n]); else this.queueAction(['u', d.n]); } }
    if (this.hornWarn) this.hornWarn = Math.max(0, this.hornWarn - dt);
  }
  freezeMe() { }
  gameOver() {} onPlayerDead() {} preventDeath() { return true; }
  update(ctx, dt) {
    const ui = this.app.ui, S = this.session; if (this.stopped && !this.results) { ui.begin(ctx); return; }
    if (this.results) return this.drawResults(ctx, ui);
    if (this.phase === 'card' && S.time() === -Infinity && (S.hub || S.isHubCard)) { ui.begin(ctx); this.drawCard(ui, ctx); this.camSweep(); this.basicFrame(ctx, dt); return; }
    ui.begin(ctx); this.inputFrameShift(ctx, dt, ui);
    if (this.overlay) { this.basicFrame(ctx, dt); this.overlay.update(ui); if (this.overlay.done) { this.overlay = null; if (!this.player.spectator) this.app.wantPointerLock(true); } return; }
    if (this.player.spectator) this.camSweep(); this.basicFrame(ctx, dt);
    for (const d of this.net) d.m.rotation.y += (dt || 0.016) * 2;
    drawHudShift(this, ui); this.drawTeamHud(ui); this.dialog.draw(ui);
    const t = S.time(); if (t < 0 && t > -3500) { ui.center(ui.H / 2 - 30, String(Math.ceil(-t / 1000)), { scale: 4, color: 'sand' }); }
  }
  basicFrame(ctx, dt) { const P = this.player; if (!P.spectator) P.update(dt); for (const O of this.players) if (O !== P) { if (O.tgt) O.modelYaw = O.yaw; O.update(dt); O.root.position.copy(O.pos); O.root.visible = true; } for (const e of this.enemies) e.update(dt); this.fx.update(dt); const t = ctx.physics.time; for (const w of this.waters) w.update(t, ctx.engine.sunDir); if (this.rain) this.rain.update(dt, ctx.camera.focus); this.cameraEase(dt); if (!P.spectator) P.updateLaser(); this.app.mix.update(dt || 1 / 60); }
  camSweep() { const P = this.player; const a = (this.ctx.engine.frame ?? 0) * 0.002; P.camYaw = a + Math.PI; P.camPitch = -0.35; P.cam.dist = 26; P.cam.up = 6; P.cam.side = 0; P.cam.fov = 50; P.root.position.set(0, 0, 0); P.pos.set(0, 0, 0); P.prev.copy(P.pos); }
  cameraEase(dt) { if (this.player.spectator) return; super.cameraEase(dt); }
  inputFrameShift(ctx, dt, ui) {
    const I = ctx.input, P = this.player; if (P.spectator) return; if (!this.overlay && BIND.pause.some((c) => I.wasPressed(c)) && !I.isDown('PadCreate')) { this.overlay = new SettingsScreen(this.app); ui.back = false; ui.confirm = false; this.app.wantPointerLock(false); return; } if (this.overlay) return;
    this.lookShift(ctx, dt);
  }
  lookShift(ctx, dt) { const P = this.player; if (P.locked || P.down) return; Area.prototype.inputFrame.call(this.proxy_ ??= proxy(this), ctx, dt, this.app.ui); }
  drawTeamHud(ui) { const S = this.session; const left = Math.max(0, SHIFT_SECONDS - this.clockS); const c = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} TO DAWN`; ui.center(8, c, { color: left < 30 ? 'lime' : 'sand' }); let y = 22; for (const p of S.players) { const s = this.score[p.id]; if (!s || s.left) continue; ui.rect(8, y, 4, 7, new THREE.Color(p.color).getHex()); ui.text(16, y, `${p.name}`.slice(0, 12).toUpperCase(), { color: 'mist' }); ui.text(92, y, String(s.score), { color: 'white' }); ui.bar(130, y + 2, 30, 3, s.hp / 100, s.down ? 'red' : 'lime'); y += 10; }
    if (this.me?.down) { ui.center(ui.H / 2 - 20, this.me.dead ? 'YOUR SHIFT IS OVER' : `BLEEDING OUT ${Math.ceil(this.score[this.me.seat.id]?.bleed ?? 20)}`, { color: 'red', scale: 2 }); }
    const cam = this.ctx.camera.camera; for (const p of this.players) { if (p === this.me) continue; const v = p.pos.clone().setY(p.pos.y + 1.9); const [x, yy, d] = project(cam, ui.W, ui.H, v); if (d < 1) { const col = new THREE.Color(p.seat.color).getHex(); ui.center(yy - 6, p.seat.name, { color: col }, x); if (p.down) ui.center(yy + 4, 'HOLD ACTION: REVIVE', { color: 'red' }, x); } }
    if (this.hornWarn > 0) ui.center(36, 'THE HORN. DAWN IS CLOSE.', { color: 'lime' });
  }
  drawCard(ui, ctx) {
    const S = this.session, c = this.card; ui.rect(0, 0, ui.W, 34, 'ink'); ui.center(10, 'NIGHT SHIFT', { scale: 2, color: 'sand' }); ui.panel(ui.W / 2 - 170, 50, 340, 150, { bg: 'ink', border: 'slate' }); ui.center(58, 'HOLD THE QUAY TOGETHER UNTIL DAWN', { color: 'white' });
    let y = 76; for (const p of S.players) { const rdy = c?.ready?.includes(p.id); ui.rect(ui.W / 2 - 150, y, 6, 7, new THREE.Color(p.color).getHex()); ui.text(ui.W / 2 - 138, y, `${p.name}`.slice(0, 18).toUpperCase(), { color: 'mist' }); if (rdy) ui.text(ui.W / 2 + 80, y, 'READY', { color: 'lime' }); y += 11; }
    const pr = [['aim', 'AIM'], ['fire', 'FIRE'], ['action', 'KICK, REVIVE'], ['run', 'RUN'], ['reload', 'RELOAD']]; let px = ui.W / 2 - 150; for (const [a, l] of pr) { const w = ui.action(a, px, 130); ui.text(px + w + 3, 132, l, { color: 'mist' }); px += w + ui.measure(l).width + 12; }
    const left = c?.left; ui.center(150, c?.paused ? 'HOLDING: MORE TIME ASKED' : left != null ? `STARTS IN ${Math.ceil(left / 1000)}` : c?.starting ? 'STARTING' : 'WAITING', { color: 'sand' }); ui.prompts([['confirm', 'READY'], ['tertiary', c?.asked ? 'TAKE BACK' : 'MORE TIME']], { y: 176, noBar: true });
    if (ui.input.wasPressed('Enter') || ui.input.wasPressed('PadCross') || (ui.click && ui.cy > 170 && ui.cx < ui.W / 2)) window.AIHub?.answer('ready'); if (ui.input.wasPressed('PadTriangle') || ui.input.wasPressed('KeyM') || (ui.click && ui.cy > 170 && ui.cx >= ui.W / 2)) window.AIHub?.answer('more');
  }
  drawResults(ctx, ui) {
    ui.begin(ctx); const f = this.results, S = this.session; ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.center(22, f.won ? 'DAWN. THE SHIFT IS OVER.' : 'CLAIMS DENIED', { scale: 2, color: f.won ? 'lime' : 'red' }); let y = 60; for (const g of f.standings) for (const id of g) { const p = S.players[id], st = f.stats?.[id] ?? {}; ui.rect(60, y, 6, 7, new THREE.Color(p?.color ?? '#fff').getHex()); ui.text(72, y, `${p?.name ?? 'MAX'}`.toUpperCase(), { color: 'white' }); ui.text(200, y, String(st.Score ?? 0), { color: 'sand' }); ui.text(260, y, `K ${st.Kills ?? 0}  H ${st.Heads ?? 0}  R ${st.Revives ?? 0}  ${st.Accuracy ?? ''}`, { color: 'mist' }); y += 14; }
    y += 6; for (const a of f.awards ?? []) { ui.center(y, `${a.title}: ${S.players[a.id]?.name ?? ''}, ${a.detail}`, { color: 'cyan' }); y += 11; } if (S.solo_) { const b = save.get('board', []); ui.center(y + 6, `BEST SHIFTS ${b.join(' ')}`, { color: 'mist' }); }
    ui.prompts([['confirm', 'BACK TO THE TITLE']]); if (ui.confirm || ui.click) { S.close?.(); this.app.session = null; this.app.goTitle(); }
  }
  openMenu(m) { if (m?.constructor?.name?.includes('Pause')) return; this.overlay = m; }
  closeMenu() { this.overlay = null; }
  dispose() { super.dispose?.(); clearInterval(this.timer); for (const f of this.off ?? []) f(); if (this.keyAns) window.removeEventListener('keydown', this.keyAns); }
  status() { return `shift ${Math.round(this.clockS)}s foes ${this.enemies.filter((e) => !e.dead).length} players ${this.players.length}`; }
}
function proxy(A) { const p = Object.create(A); p.cutscene = null; p.o = { ...A.o, noCase: true }; p.openMenu = () => {}; p.qte = A.qte; return p; }
function drawHudShift(A, ui) { const P = A.me; if (!P) return; A.objT = 0; A.dame = null; const h = A.hideHudShift; import_drawHud(A, ui); }
import { drawHud, drawQte } from '../game/hud.js';
function import_drawHud(A, ui) { drawHud(A, ui); drawQte(A, ui); }
