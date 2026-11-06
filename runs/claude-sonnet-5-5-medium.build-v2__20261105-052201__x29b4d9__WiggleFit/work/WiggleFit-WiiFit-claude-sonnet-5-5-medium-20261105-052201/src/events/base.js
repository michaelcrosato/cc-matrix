import * as THREE from 'three/webgpu';
import { PhysWorld, RAPIER } from '../physics/world.js';
import { Balancer } from '../physics/balancer.js';
import { Ragdoll } from '../physics/ragdoll.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { Bot } from '../input/bot.js';
import { tuning } from '../data/tuning.js';
import { SEAT_COLORS } from '../data/config.js';
import { rng } from '../core/rng.js';

export const MEDALS = ['Attended', 'Adequate', 'Pleasant', 'Exemplary', 'Suspicious'];
export function medalOf(form, scale = 1) { const f = form / scale; return f >= 97 ? 4 : f >= 85 ? 3 : f >= 65 ? 2 : f >= 40 ? 1 : 0; }
const DIFF = [{ ankle: 1.25, dist: 0.65, win: 1.4 }, { ankle: 1, dist: 1, win: 1 }, { ankle: 0.9, dist: 1.2, win: 0.8 }];

export class Lane {
  constructor(i, spec) { Object.assign(this, { id: i, kind: 'local', dev: 'kbm', name: 'Player', colorIdx: i, paint: i, hat: 0, bot: null, score: 0, form: 0, falls: 0, fallT: 0, flails: 0, ghost: null }, spec); this.color = SEAT_COLORS[this.colorIdx % 4]; this.intent = blankIntent(); this.x = 0; this.stats = {}; this.props = []; this.floorEx = 0; }
}
export function blankIntent() { return { wx: 0, wz: 0, ax: 0, az: 0, L: 0, R: 0, footL: false, footR: false, hop: false, hopEdge: false, flail: false, flailEdge: false, breath: false, mode: 'stick', sx: 0, sz: 0 }; }

export class GameEvent {
  // subclasses set: static id, title, discipline, instructor, couch, session, tiers
  constructor(game, { tier = 0, lanes = [{ kind: 'local', dev: 'kbm' }], seed = 1, session = false } = {}) {
    this.game = game; this.tier = tier; this.seed = seed; this.session = session;
    this.pw = new PhysWorld(tuning.gravity); this.group = new THREE.Group(); game.gfx.stage.add(this.group);
    this.t = 0; this.phase = 'build'; this.cdT = 0; this.duration = 60; this.time = 0; this.disposed = false;
    this.lanes = lanes.map((s, i) => new Lane(i, s)); this.r = rng(this.constructor.id + ':' + seed);
    this.cam = { pos: [0, 3.2, 9], look: [0, 1, 0], fov: 38 }; this.camSnap = true; this.shake = 0; this.words = []; this.hitstop = 0;
    this.noBal = false; this.diff = DIFF[game.settings.difficulty ?? 1]; this.laneGap = 3.2; this.paletteName = 'noon'; this.music = 'balance'; this.fx = [];
    this.winScale = this.diff.win; this.gusts = [];
  }
  get cls() { return this.constructor; }
  laneX(i) { const n = this.lanes.length; return (i - (n - 1) / 2) * this.laneGap; }
  // ---- setup helpers
  makeGround(w = 6, d = 6, color = '#D9B77F') {
    this.pw.ground(w * this.lanes.length + 2, 0.5, d); const wd = (w * 1) * Math.max(1, this.lanes.length * (this.laneGap / w * 0.6 + 0.4));
    const m = new THREE.Mesh(new THREE.BoxGeometry(this.laneGap * this.lanes.length + 3, 0.5, d * 2), this.game.mat(color)); m.position.y = -0.25; m.receiveShadow = true; this.group.add(m); return m;
  }
  addDolls(params = {}) {
    for (const lane of this.lanes) {
      lane.x = this.laneX(lane.id);
      lane.doll = createDoll({ paint: lane.paint, hat: lane.hat, scale: lane.scale || 1 }); lane.doll.root.position.set(lane.x, 0, 0); this.group.add(lane.doll.root);
      lane.rig = new Rig(lane.doll); lane.rig.play('idle', 0);
      if (lane.kind !== 'ghost' && !this.noBal) {
        lane.bal = new Balancer(this.pw, { lane: lane.id, x: lane.x, y: 0, z: 0, params: Object.assign({ diff: this.diff.ankle, distScale: this.diff.dist }, params) }); lane.bal.seed = this.r() * 6;
        lane.rag = new Ragdoll(this.pw, this.group, lane.doll);
      }
      if (lane.kind === 'bot') lane.bot = new Bot(lane.skill || 'sharp', this.seed * 17 + lane.id);
      this.nameTag(lane);
    }
  }
  nameTag(lane) { if (typeof document === 'undefined') return; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.font = '700 38px Fredoka, sans-serif'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#1A1420'; x.fillStyle = lane.color; x.strokeText(lane.name, 128, 44); x.fillText(lane.name, 128, 44); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(1.6, 0.4, 1); s.position.set(0, 2.15, 0); s.renderOrder = 10; lane.doll.root.add(s); lane.tag = s; s.visible = this.lanes.length > 1; }
  // ---- lifecycle
  begin() { this.phase = 'countdown'; this.cdT = 3.99; this.game.audio.sfx('count'); }
  startPlay() { this.phase = 'play'; this.t = 0; this.onStart && this.onStart(); this.game.audio.sfx('whistle'); }
  finish() { if (this.phase === 'done') return; this.phase = 'done'; this.onFinish && this.onFinish(); this.game.audio.sfx('bell'); for (const l of this.lanes) { if (l.rig && l.kind !== 'ghost') l.rig.play(l.form > 65 ? 'cheer' : 'idle', 0.3); } }
  // ---- per tick
  readIntent(lane, dt) {
    const it = lane.intent; const g = this.game; const I = g.input;
    if (lane.kind === 'local') {
      const s = I.dev(lane.dev); const w = I.weight(lane.dev); const yaw = this.camYaw || 0; const c = Math.cos(yaw), si = Math.sin(yaw);
      it.wx = w[0] * c - w[1] * si; it.wz = w[0] * si + w[1] * c; it.mode = w[2]; it.ax = it.wx; it.az = it.wz;
      it.L = s.L; it.R = s.R; it.footL = s.footL; it.footR = s.footR; it.hop = s.hop; it.hopEdge = s.hopEdge; it.flail = s.flail; it.flailEdge = s.flailEdge; it.breath = s.breath || g.settings.autoBreathe;
      const st = I.steer(lane.dev); it.sx = st[0]; it.sz = st[1]; it.keyA = s.keyA; it.keyD = s.keyD;
      if (lane.dev !== 'kbm' || true) { /* nothing */ }
    } else if (lane.kind === 'bot') { if (!lane.bot) lane.bot = new Bot(lane.skill || 'sharp', this.seed * 17 + lane.id); this.botIntent(lane, dt, it); }
    return it;
  }
  fixed(dt) {
    if (this.disposed) return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.phase === 'countdown') { const before = Math.ceil(this.cdT); this.cdT -= dt; if (Math.ceil(this.cdT) !== before && this.cdT > 0) this.game.audio.sfx('count', Math.ceil(this.cdT) === 1 ? false : false); if (this.cdT <= 0) this.startPlay(); }
    const active = this.phase === 'play';
    if (active) this.t += dt;
    this.time += dt;
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') continue;
      if (!lane.bal) { if (this.noBal) { const it0 = this.readIntent(lane, dt); if (this.phase !== 'play') { it0.wx = it0.wz = 0; it0.footL = it0.footR = it0.flailEdge = it0.hopEdge = false; } if (this.phase === 'play') this.laneFixed(lane, it0, dt); } continue; }
      const it = this.readIntent(lane, dt);
      if (this.phase !== 'play' && this.phase !== 'countdown') { it.wx = 0; it.wz = 0; }
      if (this.phase === 'countdown' || this.phase === 'done') { it.footL = it.footR = it.flailEdge = it.hopEdge = false; }
      const b = lane.bal;
      if (!b.fallen) {
        this.laneWish(lane, it, dt);
        if (it.flailEdge && this.canFlail(lane)) { if (b.flail()) { lane.flails++; this.onFlail && this.onFlail(lane); lane.rig.play('flail', 0.05, { force: true }); this.game.audio.sfx('whoosh'); } }
        this.laneFixed(lane, it, dt);
        b.prestep(dt);
      } else if (lane.rag) { lane.fallT += dt; if (lane.fallT > tuning.recoverTime && this.phase !== 'done') this.recoverLane(lane); }
    }
    this.pw.step();
    for (const lane of this.lanes) {
      const b = lane.bal; if (!b || b.fallen) continue;
      if (lane.noFall) { if (b.checkFall()) { b.wx *= 0.3; b.wz *= 0.3; b.setWish(0, 0); } }
      else if (this.phase === 'play' && !this.godMode() && b.checkFall()) this.fallLane(lane);
      else if (this.phase === 'play' && this.godMode() && b.checkFall()) { b.setWish(0, 0); b.wx *= 0.2; b.wz *= 0.2; }
    }
    if (active) this.step(dt);
    for (const w of this.words) w.t -= dt;
    this.words = this.words.filter((w) => w.t > 0 || (w.sprite && w.sprite.removeFromParent() && false));
  }
  godMode() { return this.game.god || this.attract; }
  canFlail() { return true; }
  laneWish(lane, it) { lane.bal.setWish(it.wx, it.wz); }
  laneFixed() {}
  botIntent(lane, dt, it) { it.wx = 0; it.wz = 0; }
  step() {}
  fallLane(lane) {
    const b = lane.bal; b.disable(); lane.falls++; lane.fallT = 0; lane.floorEx++; this.game.noteFall && this.game.noteFall();
    const v = b.body.linvel(); const tp = b.body.translation(); lane.doll.root.rotation.set(0, 0, 0); lane.doll.root.position.set(b.fx, b.footBase.y, b.fz);
    lane.rag.start({ x: v.x, y: v.y, z: v.z }, { x: b.leanX * 3, y: 1.5, z: b.leanZ * 3 });
    this.game.audio.sfx('fall'); this.game.rumble(lane, 0.9, 400); this.word('CLACK!', lane.x, 1.8); this.onFall && this.onFall(lane);
    if (lane.id === 0 || this.lanes.length === 1) this.game.quip && this.game.quip('fall');
  }
  recoverLane(lane) {
    lane.rag.end(); lane.bal.recover(lane.x + (lane.recoverDX || 0), lane.recoverZ ?? 0); lane.rig.play('hop', 0.05, { force: true }); this.game.audio.sfx('spring'); lane.doll.root.position.set(lane.bal.fx, lane.bal.footBase.y, lane.bal.fz);
    this.onRecover && this.onRecover(lane);
  }
  word(text, x, y, z = 0.5) { this.game.comic && this.game.comic(this, text, x, y, z); }
  // ---- per frame
  frame(dt) {
    if (this.disposed) return;
    for (const lane of this.lanes) {
      if (!lane.doll) continue; const b = lane.bal;
      if (b) {
        if (lane.rag && lane.rag.active) lane.rag.sync();
        else { lane.doll.root.position.set(b.fx, b.footBase.y, b.fz); lane.doll.root.rotation.set(b.leanZ, 0, -b.leanX, 'XYZ'); }
      }
      if (lane.rig) { this.animLane(lane, dt); lane.rig.update(dt); this.afterRig(lane, dt); }
    }
    this.frameExtra && this.frameExtra(dt);
    this.updateCamera(dt);
  }
  animLane(lane) { const b = lane.bal; if (!b || b.fallen) return; if (b.flailLeft > 0) return; if (this.phase === 'done') return; if (lane.rig.curName === 'flail' || lane.rig.curName === 'hop') { if (lane.rig.cur && lane.rig.cur.isRunning && lane.rig.cur.isRunning()) return; } if (!lane.fixedAnim) lane.rig.play('idle', 0.25); }
  afterRig(lane, dt) { const J = lane.doll.J; if (J.head && lane.bal && !String(lane.rig.curName).startsWith('pose')) J.head.rotation.z = -lane.bal.leanX * 0.5; }
  updateCamera(dt) {
    const cam = this.game.gfx.camera, c = this.cam; const tp = new THREE.Vector3(...c.pos), tl = new THREE.Vector3(...c.look);
    const n = this.lanes.length; if (n > 1) { const d = Math.max(c.pos[2], ((n - 1) * this.laneGap / 2 + 2.5) / Math.tan(c.fov * Math.PI / 360) / 1.78 * 1.0); tp.z = Math.max(tp.z, d); tp.y = Math.max(tp.y, c.pos[1] + (d - c.pos[2]) * 0.18); }
    if (this.camSnap) { cam.position.copy(tp); this._look = tl.clone(); this.camSnap = false; } else { const a = 1 - Math.exp(-6 * dt); cam.position.lerp(tp, a); this._look = this._look || tl.clone(); this._look.lerp(tl, a); }
    if (this.shake > 0 && !this.game.settings.reduceShake) { this.shake -= dt; cam.position.x += (Math.sin(this.time * 90) * this.shake * 0.08); cam.position.y += Math.cos(this.time * 77) * this.shake * 0.08; }
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.lookAt(this._look);
  }
  // ---- results
  laneResult(i) { const l = this.lanes[i]; const form = Math.max(0, Math.min(100, l.form)); return { form, medal: medalOf(form, this.game.tuningMedalScale()), score: Math.round(form * 10), stats: l.stats, falls: l.falls }; }
  get playing() { return this.phase === 'play'; }
  snapshot() { return { id: this.constructor.id, tier: this.tier, phase: this.phase, t: +this.t.toFixed(2), score: this.lanes[0] ? Math.round(this.lanes[0].score) : 0, lanes: this.lanes.map((l) => ({ kind: l.kind, leanX: l.bal ? +l.bal.leanX.toFixed(4) : 0, leanZ: l.bal ? +l.bal.leanZ.toFixed(4) : 0, cob: l.bal ? [+l.bal.cobX.toFixed(3), +l.bal.cobZ.toFixed(3)] : [0, 0], fallen: l.bal ? l.bal.fallen : false, form: +l.form.toFixed(1), falls: l.falls, props: l.props ? l.props.length : 0 })) }; }
  bodyCount() { return this.pw.count(); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const l of this.lanes) { if (l.rag && l.rag.active) { try { l.rag.end(); } catch (e) { /* ignore */ } } }
    this.onDispose && this.onDispose();
    this.pw.free(); this.group.removeFromParent();
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
