// ReplayScene: plays recorded poses with the replay director. Cross play/pause, left/right scrub, L1/R1 focus car, Triangle camera mode, R2 slow motion.
import { THREE } from '../../pixel-engine.js';
import { App, fmtTime } from '../app.js';
import { World } from '../render/world.js';
import { CarView } from '../render/carview.js';
import { Director } from '../render/director.js';
import { ChaseCam, setupCamera, angDiff } from '../render/camera.js';
import { tunedParams } from '../sim/tuning.js';
import { getTrack } from '../sim/race.js';
import { STRIDE, loadSlot } from '../sim/replay.js';
import { TRACKS } from '../data/tracks.js';
import { goMenu, go } from './flow.js';
const MODES = ['DIRECTOR', 'CHASE', 'BONNET', 'FREE'];
export class ReplayScene {
  constructor(o = {}) { this.name = 'replay'; this.o = o; this.target = new THREE.Vector3(); this.t = 0; this.frame = 0; this.playing = true; this.mode = 0; this.focus = 0; this.hideHud = false; this.free = { yaw: 0.6, pitch: 0.4, dist: 14 }; }
  async setup(ctx) {
    this.ctx = ctx; ctx.engine.input.gamepadButtons = {}; let src = this.o.source === 'slot' ? loadSlot(this.o.slot) : null; const last = App.lastRace;
    if (src) { this.rec = src.rec; this.hz = src.hz; this.meta = src.meta; } else if (last) { this.rec = last.record; this.hz = 30; this.meta = { track: last.track, hour: last.hour, rain: last.rain, params: last.params, player: last.player, laps: last.laps }; } else { this.rec = []; this.hz = 30; }
    const m = this.meta ?? { track: 'kestrel', params: [], player: 0 }; this.tid = m.track; const { tr } = getTrack(this.tid); this.tr = tr; this.world = new World(ctx, tr, this.tid, { hour: m.hour ?? TRACKS[this.tid].hour, rain: !!m.rain });
    this.views = (m.params ?? []).map((p) => { const v = new CarView(p.carId, tunedParams(p.carId, { parts: [], settings: {} }), { paint: p.paint, name: p.name, spoiler: p.spoiler ?? 0 }); ctx.scene.add(v.root); return v; }); this.ncars = this.views.length; this.focus = m.player ?? 0;
    setupCamera(ctx.camera.camera); this.cam = new ChaseCam(ctx.camera.camera); this.dir = new Director(tr, 3); this.max = Math.max(0, this.rec.length - 1) / this.hz; this.slow = 1; App.music?.play('replay'); App.ui.sounds = App.mix;
    this.nCarsTracked = this.ncars; this.lastPose = []; this.loops = 0;
  }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = App.api?.(this) ?? window.__GAME__; }
  cameraTarget() { const p = this.lastPose[this.focus]; return p ? this.target.set(p.x, p.y, p.z) : this.target.set(0, 0, 0); }
  status() { return `replay ${this.tid} ${this.t.toFixed(1)}/${this.max.toFixed(1)} ${MODES[this.mode]} car${this.focus}`; }
  fingerprint() { return String(Math.round(this.t * 10)); }
  pose(i, f) { const r = this.rec, a = Math.floor(f), b = Math.min(r.length - 1, a + 1), u = f - a, A = r[Math.min(a, r.length - 1)], B = r[b], o = i * STRIDE, g = (k) => A[o + k] + (B[o + k] - A[o + k]) * u; return { x: g(0), y: g(1), z: g(2), yaw: A[o + 3] + angDiff(B[o + 3], A[o + 3]) * u, pitch: g(4), roll: g(5), delta: g(6), rpm: g(7), thr: A[o + 8], gear: A[o + 9], flags: A[o + 10], ax: g(11) }; }
  update(ctx, dt) {
    const A = App.actions, ui = App.ui; A.frame(ctx, dt); ui.begin(ctx, A, dt); this.t0 = this.t;
    if (this.rec.length < 2) { ctx.hud.clear(); ui.center(120, 'NOTHING TO REPLAY YET.', { color: 'white' }); ui.item('b', 0, 0, 1, 1); ui.prompts([['back', 'BACK']]); ui.end(); if (A.back || A.confirm) this.leave(); return; }
    const slow = A.throttle > 0.3 || ctx.input.isDown('KeyZ') ? 0.25 : 1; if (A.confirm && !A.mouse.pressed) this.playing = !this.playing; if (A.confirm && A.mouse.pressed && A.last === 'mouse' && this.mode !== 3) this.playing = !this.playing;
    if (this.playing) this.t += dt * slow; if (A.moveX) this.t = Math.max(0, Math.min(this.max, this.t + A.moveX * 4)); if (A.tabR || A.up) this.focus = (this.focus + 1) % this.ncars; if (A.tabL || A.down) this.focus = (this.focus + this.ncars - 1) % this.ncars; if (A.info || A.camera) { this.mode = (this.mode + 1) % 4; this.cam.mode = this.mode === 1 ? 0 : this.mode === 2 ? 2 : 0; this.cam.snap(); } if (ctx.input.wasPressed('KeyH') || ctx.input.wasPressed('KeyF')) this.hideHud = !this.hideHud;
    if (this.t >= this.max) { this.t = 0; this.loops++; } const f = this.t * this.hz;
    this.lastPose = []; for (let i = 0; i < this.ncars; i++) { const p = this.pose(i, f); this.lastPose.push(p); this.views[i].place({ x: p.x, y: p.y, z: p.z, yaw: p.yaw, delta: p.delta, u: p.rpm * 0.003, ax: p.ax, ay: p.roll / 0.009, vy: 0 }, { dt, pitchRoad: p.pitch, braking: (p.flags & 1) > 0 }); }
    const fp = this.lastPose[this.focus], cam = ctx.camera.camera, tr = this.tr;
    const ref = { x: fp.x, y: fp.y, z: fp.z, vx: 20, vz: 0, s: 0, u: 20, yaw: fp.yaw }; let loc = { i: 0 }; { let bd = 1e12, bi = 0; for (let i = 0; i < tr.N; i += 4) { const d = (tr.x[i] - fp.x) ** 2 + (tr.z[i] - fp.z) ** 2; if (d < bd) { bd = d; bi = i; } } ref.s = bi * tr.ds; }
    if (this.mode === 0) { const battle = (fp.flags & 2) > 0 || this.lastPose.some((q, i) => i !== this.focus && Math.hypot(q.x - fp.x, q.z - fp.z) < 12); this.dir.update(dt, ref, cam, battle); }
    else if (this.mode === 3) { const fr = this.free; if (A.mouse.down && A.last === 'mouse') { fr.yaw -= ctx.input.mouseDelta.x * 0.01; fr.pitch = Math.max(0.05, Math.min(1.4, fr.pitch + ctx.input.mouseDelta.y * 0.01)); } fr.yaw += A.lookX * dt * 2; fr.pitch = Math.max(0.05, Math.min(1.4, fr.pitch + A.lookY * dt)); fr.dist = Math.max(4, Math.min(60, fr.dist + ctx.input.wheel * 1.5)); cam.position.set(fp.x + Math.sin(fr.yaw) * Math.cos(fr.pitch) * fr.dist, fp.y + Math.sin(fr.pitch) * fr.dist, fp.z + Math.cos(fr.yaw) * Math.cos(fr.pitch) * fr.dist); cam.lookAt(fp.x, fp.y + 1, fp.z); if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); } }
    else this.cam.update(dt, { x: fp.x, y: fp.y, z: fp.z, yaw: fp.yaw, u: 40, vy: 0, pitchRoad: fp.pitch }, { yawRate: 6 });
    if (A.mouse.pressed && A.last === 'mouse' && this.mode !== 3) { const mx = (A.mouse.x + 1) / 2 * ui.W, my = (1 - A.mouse.y) / 2 * ui.H; let best = -1, bd = 24; this.lastPose.forEach((q, i) => { const v = new THREE.Vector3(q.x, q.y + 0.8, q.z).project(cam); const d = Math.hypot((v.x + 1) / 2 * ui.W - mx, (1 - v.y) / 2 * ui.H - my); if (v.z < 1 && d < bd) { bd = d; best = i; } }); if (best >= 0) this.focus = best; }
    this.world.update(dt, this.t, cam, cam.position); App.mix?.replayFrame?.(this, dt);
    ctx.hud.clear(); const H = ui.H, W = ui.W; ui.hud.rect(0, 0, W, 14, 'ink'); ui.hud.rect(0, H - 14, W, 14, 'ink'); ui.text(6, 3, 'REPLAY', { color: 'red' }); ui.text(W - 6 - ui.width(MODES[this.mode]), 3, MODES[this.mode], { color: 'sand' });
    if (!this.hideHud) { ui.text(W / 2 - 40, 3, `${this.meta?.params?.[this.focus]?.name ?? ''}`, { color: 'white' }); const w = W - 80, x = 40; ui.hud.rect(x, H - 9, w, 3, 'night'); ui.hud.rect(x, H - 9, Math.round(w * this.t / Math.max(0.1, this.max)), 3, 'sand'); ui.text(6, H - 11, this.playing ? 'PLAY' : 'PAUSE', { color: 'white' }); ui.text(W - 6 - ui.width(fmtTime(this.t, 0)), H - 11, fmtTime(this.t, 0), { color: 'white' }); if (slow < 1) ui.center(20, 'SLOW MOTION', { color: 'cyan' }); const sub = App.mix?.subtitle; if (sub) ui.center(H - 40, sub.text.slice(0, 60), { color: 'white' }); }
    ui.item('r', 0, 0, 1, 1); ui.prompts([['confirm', 'PLAY/PAUSE'], ['scrub', 'SCRUB'], ['focusCar', 'CAR'], ['info', 'CAMERA'], ['slow', 'SLOW'], ['back', 'BACK']]); ui.end();
    if (A.back) this.leave();
  }
  leave() { const b = this.o.back; if (this.o.onLeave) return this.o.onLeave(); if (b?.mode === 'attract') return App.stopAttract?.(); const r = b?.returnTo ?? { screen: 'map', args: {} }; goMenu(r.screen, r.args); }
  dispose() {}
}
