// ReplayScene: plays recorded poses with the replay director. Replays never re-simulate.
import { THREE, PALETTE, Precipitation } from '../../pixel-engine.js';
import { getTrack, profileFor } from '../sim/race.js';
import { CarView } from '../render/carview.js';
import { buildTrackMeshes, drivingLineMesh } from '../render/trackmesh.js';
import { dressTrack, lampPools } from '../render/dressing.js';
import { setSky, buildSkyDome, followSky, nightOf } from '../render/sky.js';
import { TVDirector, ChaseCam } from '../render/camera.js';
import { registerParticles } from '../render/particles.js';
import { SkidMarks } from '../render/skid.js';
import { fmtTime } from '../ui/ui.js';
import { tunedParams } from '../sim/tuning.js';
import { CARS } from '../data/cars.js';
import { SPEAKERS } from '../audio/voice.js';
const { Vector3 } = THREE;
const CH = 12;
export class ReplayScene {
  name = 'replay';
  constructor(app, data, back) { this.app = app; this.data = data; this.back = back; this.target = new Vector3(); this.t = 0; this.playing = true; this.focus = Math.max(0, data.cars.findIndex((c) => c.seat === 0)); this.mode = 0; this.hideHud = false; this.views = []; this.orbit = { a: 0.6, p: 0.4, d: 14 }; this.state = {}; this.time = 0; }
  async setup(ctx) {
    const { app, data } = this; app.bind(ctx, this); this.ctx = ctx; const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix(); registerParticles(ctx.particles);
    const T = (this.T = getTrack(data.track)), hour = data.hour; setSky(ctx.engine, hour, { rain: data.rain }); const carP = tunedParams(data.cars[0].carId, data.cars[0].install ?? {}), speeds = profileFor(data.track, carP, data.rain), pools = data.track === 'harbour' && nightOf(hour) > 0.2 ? lampPools(T.tr) : null;
    for (const m of buildTrackMeshes(T, T.id, { speeds, pools })) ctx.scene.add(m); this.dress = dressTrack(ctx, T); this.dome = buildSkyDome(T.id, hour, { rain: data.rain }); ctx.scene.add(this.dome);
    if (data.rain) { this.rain = new Precipitation({ kind: 'rain', count: 900, area: [60, 26, 60] }); ctx.scene.add(this.rain); }
    this.skids = new SkidMarks(600, T.tr.surface === 'dirt' ? PALETTE.plum : PALETTE.ink); ctx.scene.add(this.skids.mesh); void drivingLineMesh;
    data.cars.forEach((c) => { const v = new CarView(c.carId, c.install ?? null, {}); ctx.scene.add(v.root); this.views.push(v); });
    app.ui.subLift = 15; // above the replay's bottom strip
    this.dur = data.n / data.hz; this.tv = new TVDirector(T); this.chase = new ChaseCam(cam, app); app.mix.music('replay');
  }
  sample(i, t) { const d = this.data, a = d.data[i], f = Math.min(d.n - 1.001, t * d.hz), k = Math.floor(f), w = f - k, o = k * CH, q = (k + 1) * CH; const s = this.state; const lerp = (c) => a[o + c] + (a[q + c] - a[o + c]) * w; s.x = lerp(0); s.y = lerp(1); s.z = lerp(2); let dy = a[q + 3] - a[o + 3]; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI; s.yaw = a[o + 3] + dy * w; s.ax = lerp(4); s.ay = lerp(5); s.delta = lerp(6); s.rpm = lerp(7); s.throttle = a[o + 8]; s.gear = a[o + 9]; s.flags = a[o + 10]; s.u = lerp(11); s.brake = !!(s.flags & 1); s.sliding = !!(s.flags & 2); return s; }
  update(ctx, dt) {
    const app = this.app; app.frameStart(ctx); ctx.hud.clear(); this.time += dt; const a = app.actions, input = ctx.input, pad = a.padNow, cam = ctx.camera.camera;
    const slow = (pad && (pad.b[7] ?? 0) > 0.3) || input.isDown('ShiftLeft', 'ShiftRight'), rate = slow ? 0.25 : 1;
    if (a.pressed('confirm')) this.playing = !this.playing;
    if (this.playing) { this.t += dt * rate; if (this.t >= this.dur) this.t = 0; }
    if (a.now.left) this.t = Math.max(0, this.t - dt * 6); if (a.now.right) this.t = Math.min(this.dur - 0.1, this.t + dt * 6);
    if (a.pressed('tabL')) { this.focus = (this.focus - 1 + this.views.length) % this.views.length; this.tv.timer = 0; this.manual = true; } if (a.pressed('tabR')) { this.focus = (this.focus + 1) % this.views.length; this.tv.timer = 0; this.manual = true; }
    if (a.pressed('info')) { this.mode = (this.mode + 1) % 4; this.chase.mode = this.mode === 2 ? 2 : 1; this.chase.init = false; }
    if (a.pressed('alt') || input.wasPressed('KeyH')) this.hideHud = !this.hideHud;
    // mouse: click a car to focus it, drag to orbit in Free, wheel to zoom
    if (a.click) { const o = new Vector3(), d = new Vector3(); ctx.camera.rayAt(input.pointer.x, input.pointer.y, o, d); let best = -1, bd = 6; this.views.forEach((v, i) => { const p = v.root.position, along = p.clone().sub(o).dot(d), dist = p.clone().sub(o.clone().add(d.clone().multiplyScalar(along))).length(); if (along > 0 && dist < bd) { bd = dist; best = i; } }); if (best >= 0) { this.focus = best; this.tv.timer = 0; this.manual = true; } }
    if (input.isDown('MouseLeft') && this.mode === 3) { this.orbit.a -= input.mouseDelta.x * 0.01; this.orbit.p = Math.max(0.05, Math.min(1.4, this.orbit.p + input.mouseDelta.y * 0.01)); } if (a.wheel && this.mode === 3) this.orbit.d = Math.max(5, Math.min(60, this.orbit.d + a.wheel * 2)); if (pad && this.mode === 3) { this.orbit.a -= (pad.a[2] ?? 0) * dt * 2; this.orbit.p = Math.max(0.05, Math.min(1.4, this.orbit.p + (pad.a[3] ?? 0) * dt)); }
    const tr = this.T.tr; let fs = null;
    // the director: at a cut, prefer a slide or a battle over the car it was following
    if (this.mode === 0 && !this.manual && this.tv.timer <= dt && this.playing) { const pick = this.interest(); if (pick >= 0 && pick !== this.focus) this.focus = pick; }
    this.commentary(dt, rate);
    this.views.forEach((v, i) => { const s = this.sample(i, this.t); if (i === this.focus) fs = { ...s }; s.i = nearIndex(tr, s.x, s.z); v.pose(s, this.playing ? dt * rate : 0, tr); });
    this.target.set(fs.x, fs.y + 0.5, fs.z);
    if (this.mode === 0) { const near = nearIndex(tr, fs.x, fs.z); this.tv.update(cam, { s: near * tr.ds, x: fs.x, y: fs.y, z: fs.z, u: fs.u }, dt * (this.playing ? 1 : 0)); }
    else if (this.mode === 3) { const o = this.orbit; cam.position.set(fs.x + Math.sin(o.a) * Math.cos(o.p) * o.d, fs.y + Math.sin(o.p) * o.d, fs.z + Math.cos(o.a) * Math.cos(o.p) * o.d); cam.lookAt(fs.x, fs.y + 0.6, fs.z); if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); } }
    else this.chase.update(fs, dt);
    followSky(this.dome, cam, this.time); this.dress.focus = fs; this.dress.update(dt, this.time); if (this.rain) this.rain.update(dt, this.target);
    if (this.playing && fs.sliding && this.time % 0.05 < dt) ctx.particles.burst(tr.surface === 'dirt' ? 'dust' : 'tyreSmoke', [fs.x, fs.y + 0.2, fs.z]);
    app.mix.driving([{ rpm: fs.rpm, throttle: fs.throttle, level: 0.7 }], { speed: Math.abs(fs.u) }, dt);
    if (!this.mixBuilt) { this.mixBuilt = true; app.mix.setCars([{ carId: this.data.cars[this.focus].carId, params: tunedParams(this.data.cars[this.focus].carId, this.data.cars[this.focus].install ?? {}) }]); }
    const hud = ctx.hud; if (!this.hideHud) { hud.rect(0, 0, hud.width, 14, 'ink'); hud.rect(0, hud.height - 32, hud.width, 14, 'ink'); hud.text(6, 4, 'REPLAY', { color: 'red' }); hud.text(50, 4, this.data.label || '', { color: 'mist' }); hud.text(hud.width - 66, 4, fmtTime(this.t), { color: 'white' }); const c = this.data.cars[this.focus]; hud.text(6, hud.height - 29, `${c.name}  ${Math.abs(fs.u * 3.6).toFixed(0)} KM/H`, { color: 'sand' }); hud.text(hud.width - 70, hud.height - 29, ['DIRECTOR', 'CHASE', 'BONNET', 'FREE'][this.mode], { color: 'white' }); hud.rect(150, hud.height - 25, hud.width - 240, 2, 'night'); hud.rect(150, hud.height - 25, Math.round((hud.width - 240) * (this.t / this.dur)), 2, 'sand'); app.ui.prompts([['confirm', this.playing ? 'PAUSE' : 'PLAY'], ['lr', 'SCRUB'], ['tabs', 'CAR'], ['info', 'CAMERA'], ['slow', 'SLOW'], ['alt', 'HIDE'], ['back', 'LEAVE']]); }
    if (a.pressed('back') || a.rightClick) { app.mix.ui('back'); app.mix.clearEngines(); app.leaveReplay(this.back); }
    if (app.ui.subtitle && !this.hideHud) app.ui.drawSubtitle(dt);
    app.frameEnd(ctx, dt, true);
  }
  /** A sliding car, else the rear car of the closest battle, else -1. */
  interest() { const cars = this.views.map((_, i) => ({ ...this.sample(i, this.t), i })); const slide = cars.find((c) => c.sliding && Math.abs(c.u) > 8); if (slide) return slide.i; let best = -1, bd = 14; for (const a of cars) for (const b of cars) { if (a.i >= b.i) continue; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < bd) { bd = d; const sn = Math.sin(a.yaw), cs = Math.cos(a.yaw); best = (b.x - a.x) * sn + (b.z - a.z) * cs > 0 ? a.i : b.i; } } return best; }
  /** Dell: gibberish over the replay, with subtitles of plain facts. */
  commentary(dt, rate) { if (!this.playing) return; this.dellT = (this.dellT ?? 3) - dt * rate; if (this.dellT > 0) return; this.dellT = 8; const s = this.sample(this.focus, this.t), c = this.data.cars[this.focus], kmh = Math.round(Math.abs(s.u) * 3.6), info = CARS[c.carId], n = (this.dellN = (this.dellN ?? 0) + 1), line = s.sliding ? `${c.name} is sliding. This was not in the brochure.` : n % 3 === 0 ? `${info.shortName}. ${info.phys.powerPS} PS, ${info.phys.massKg} kilograms.` : n % 3 === 1 ? `${c.name}, ${kmh} kilometres per hour, gear ${Math.round(s.gear)}.` : `${c.name} in the ${info.shortName}. The tyres are round. This is correct.`; this.app.ui.say(line, SPEAKERS.dell, { time: 4 }); }
  cameraTarget() { return this.target; }
  status() { return `replay t=${this.t.toFixed(1)}/${this.dur.toFixed(1)} mode=${this.mode}`; }
  ready(ctx) { this.app.onReady?.(ctx, this); }
  dispose() { this.app.ui.subLift = 0; this.app.mix.clearEngines(); this.app.mix.quietDriving(); }
}
let hintI = 0;
function nearIndex(tr, x, z) { let best = hintI, bd = Infinity; for (let i = 0; i < tr.N; i += 6) { const d = (x - tr.x[i]) ** 2 + (z - tr.z[i]) ** 2; if (d < bd) { bd = d; best = i; } } hintI = best; return best; }
