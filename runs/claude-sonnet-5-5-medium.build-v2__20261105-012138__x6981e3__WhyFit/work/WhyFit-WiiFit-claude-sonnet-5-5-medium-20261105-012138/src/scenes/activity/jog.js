// Island Jog: alternate left and right to build cadence; steer across the path for cups. Coach paces you on a scooter at 3 m/s.
import { SoloActivity } from './solo.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { buildPath, pathAt } from '../../data/path.js';
import { buildIsland, place } from '../../art/world.js';
import { makeAvatar, NPC_LOOKS } from '../../art/avatar.js';
import { say } from '../../ui/font.js';
import { panel, bar } from '../../ui/widgets.js';
import { BARKS, pick } from '../../data/lines.js';
import { THREE, Trail, applySky, skyAt, toonMaterial, PALETTE, buildModel } from '../../../pixel-engine.js';
import { MODELS } from '../../art/models.js';

const CUPS = 18, BAND = [2.4, 3.6], COACH_V = 3;
export class JogActivity extends SoloActivity {
  static camera = { preset: 'iso', zoom: 1.4 };
  constructor(app, args) { super(app, args); this.camera = { preset: 'iso', zoom: 1.4 }; this.path = buildPath(); }
  get duration() { return this.path.length / COACH_V + 6; }
  goal() { return 'Alternate left and right steps to build cadence. Stay near Coach. Steer for the water cups.'; }
  controls() { return [['footL', 'Left'], ['footR', 'Right'], ['lean', 'Steer']]; }
  async stage(ctx) {
    applySky(ctx.engine, skyAt(9));
    this.world = buildIsland(ctx, { palms: false });
    const r = ctx.random.fork('jog');
    this.cups = []; this.obst = [];
    for (let i = 0; i < CUPS; i++) { const s = 12 + (i / (CUPS - 1)) * (this.path.length - 30), lat = r.range(-1.3, 1.3); const m = buildModel('water-cup', { catalog: MODELS }).object; m.scale.setScalar(1.2); ctx.scene.add(m); this.cups.push({ s, lat, m, got: false }); }
    const kinds = ['sprinkler', 'picnic', 'dennis', 'kevin'];
    for (let i = 0; i < 12; i++) {
      const s = 20 + i * ((this.path.length - 40) / 12) + r.range(-3, 3), lat = r.range(-1.2, 1.2), kind = kinds[i % 4];
      let m; if (kind === 'sprinkler') m = buildModel('sprinkler', { catalog: MODELS }).object; else if (kind === 'kevin') m = buildModel('kevin', { catalog: MODELS }).object; else if (kind === 'picnic') { m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.2), toonMaterial(PALETTE.red)); m.position.y = 0.05; } else { m = (await makeAvatar(ctx, NPC_LOOKS.dennis)); m.play('Wave'); m.addTo(ctx.scene); }
      this.obst.push({ s, lat, kind, m, hit: false });
    }
    this.scooter = place(ctx, 'scooter', [0, 0, 0], { scale: 1.2 }).object;
    this.coach = await makeAvatar(ctx, NPC_LOOKS.coach); this.coach.addTo(ctx.scene); this.coach.play('Sit');
    this.trail = new Trail({ width: 0.3, life: 0.45 }); ctx.scene.add(this.trail);
    this.app.music('jog'); this.cam0 = null;
    this.reset();
  }
  reset() { Object.assign(this, { s: 0, lat: 0, cad: 0, lastStep: -9, lastFoot: '', sT: 0, stumble: 0, stitch: 0, hot: 0, stitched: 0, bandT: 0, played: 0, cupsGot: 0, coachS: 3, nstep: 0, vx: 0, finished: false, steps: [] }); for (const c of this.cups ?? []) { c.got = false; c.m.visible = true; } for (const o of this.obst ?? []) o.hit = false; }
  resetPlay() { this.reset(); }
  botControl(inp, dt) {
    const sk = SKILLS[this.driver.skill]; inp.x = inp.y = 0; if (!sk) return;
    const tgtCad = { sloppy: 2.0, average: 2.9, good: 3.0, expert: 3.05 }[this.driver.skill] ?? 2.5;
    const jit = Math.sin(this.pt * 1.3) * sk.err * 0.25;
    const period = 1 / (tgtCad * (1 + jit));
    this.botT = (this.botT ?? 0) - dt;
    if (this.botT <= 0) { this.botT = period; this.botFoot = this.botFoot === 'L' ? 'R' : 'L'; if (this.driver.skill === 'sloppy' && Math.sin(this.pt * 7.1) > 0.7) this.botFoot = this.botFoot === 'L' ? 'R' : 'L'; if (this.botFoot === 'L') inp.stepL = true; else inp.stepR = true; }
    const nxt = this.cups.find((c) => !c.got && c.s > this.s - 0.5), ob = this.obst.find((o) => o.s > this.s - 0.3 && o.s < this.s + 6);
    let want = nxt && nxt.s - this.s < 10 ? nxt.lat : 0;
    if (ob && Math.abs(ob.lat - want) < 0.7) want = ob.lat > 0 ? ob.lat - 0.9 : ob.lat + 0.9;
    inp.x = Math.max(-1, Math.min(1, (want - this.lat) * (this.driver.skill === 'sloppy' ? 0.5 : 2.5) / 1.5));
  }
  playFixed(dt, practice) {
    const inp = this.read(dt, this.pt), t = this.phase === 'play' ? this.playT : this.phaseT;
    this.sT += dt; this.stumble = Math.max(0, this.stumble - dt); this.stitch = Math.max(0, this.stitch - dt);
    for (const [pressed, foot] of [[inp.stepL, 'L'], [inp.stepR, 'R']]) {
      if (!pressed) continue;
      if (foot === this.lastFoot) { this.stumble = 0.5; this.app.sfx('wobble'); this.cad *= 0.5; }
      else { const gap = this.sT - this.lastStep; if (gap > 0.12 && gap < 1.2) { const inst = 1 / gap; this.cad = this.cad * 0.55 + inst * 0.45; } this.nstep++; this.app.sfx('step', { volume: 0.4, pitch: foot === 'L' ? 0 : 2 }); }
      this.lastFoot = foot; this.lastStep = this.sT;
    }
    if (this.sT - this.lastStep > 0.9) this.cad *= Math.max(0, 1 - dt * 2.5);
    if (this.cad > BAND[1]) { this.hot += dt; if (this.hot >= 2 && !this.stitch) { this.stitch = 3; this.hot = 0; this.stitched++; this.bark('ounce', pick(BARKS.stitch, this.app.rng('b')), 2.5); } } else this.hot = Math.max(0, this.hot - dt);
    const v = this.cad * (COACH_V / T.jogTargetCadence) * (this.stitch > 0 ? 0.5 : 1) * (this.stumble > 0 ? 0.2 : 1);
    if (!this.finished) this.s = Math.min(this.path.length - 0.5, this.s + v * dt);
    // steer
    const target = Math.max(-1.5, Math.min(1.5, inp.x * 1.5)); this.lat += (target - this.lat) * Math.min(1, dt * 6);
    // coach: exactly target speed, waits if the player is more than 12 m behind
    const coachMax = this.s + 12; this.coachS = Math.min(this.coachS + COACH_V * dt * (this.phase === 'play' || this.phase === 'practice' ? 1 : 0), Math.max(coachMax, this.s));
    if (this.phase === 'play') {
      this.playedT = (this.playedT ?? 0) + dt; if (this.cad >= BAND[0] * (T.jogTargetCadence / 3) && this.cad <= BAND[1] * (T.jogTargetCadence / 3) + 0.0001) this.bandT += dt;
      if (this.coachS - this.s > 11.9 && !this.waitBarked) { this.waitBarked = true; this.bark('coach', 'I am waiting. I am unimpressed.', 2.5); } if (this.coachS - this.s < 6) this.waitBarked = false;
    }
    for (const c of this.cups) if (!c.got && Math.abs(c.s - this.s) < 0.9 && Math.abs(c.lat - this.lat) < 0.65) { c.got = true; c.m.visible = false; this.cupsGot++; this.app.sfx('drip', { pitch: this.cupsGot % 6 }); }
    for (const o of this.obst) if (!o.hit && Math.abs(o.s - this.s) < 0.9 && Math.abs(o.lat - this.lat) < 0.75) { o.hit = true; this.stumble = 0.8; this.app.sfx(o.kind === 'kevin' ? 'squawk' : 'thwap'); this.ctx.engine.shake.add(0.25); }
    if (this.s >= this.path.length - 1 && !this.finished && this.phase === 'play') { this.finished = true; this.endEarly(); }
  }
  pacePct() { return this.playedT > 0 ? 100 * this.bandT / this.playedT : 0; }
  cupPct() { return 100 * this.cupsGot / CUPS; }
  scoreNow() { return 0.7 * this.pacePct() + 0.3 * this.cupPct(); }
  place(obj, s, lat, y = 0) { const p = pathAt(this.path, s); obj.position.set(p.x - p.dz * lat, y, p.z + p.dx * lat); }
  frameTick(ctx, dt) {
    this.world.update(dt);
    const p = pathAt(this.path, this.s);
    const x = p.x - p.dz * this.lat, z = p.z + p.dx * this.lat;
    this.av.setPos(x, 0, z, p.yaw);
    this.av.play(this.cad > 0.3 ? 'Jog' : 'Idle', { fade: 0.15, timeScale: Math.max(0.4, this.cad / 3) * (this.stumble > 0 ? 0.5 : 1) });
    this.av.update(dt);
    this.focus = new THREE.Vector3(x + p.dx * 2, 0.9, z + p.dz * 2);
    const cp = pathAt(this.path, this.coachS); this.scooter.position.set(cp.x, 0, cp.z); this.scooter.rotation.y = cp.yaw;
    this.coach.setPos(cp.x, 0.5, cp.z, cp.yaw); this.coach.update(dt);
    for (const c of this.cups) this.place(c.m, c.s, c.lat);
    for (const o of this.obst) { if (o.m.root) { const q = pathAt(this.path, o.s); o.m.setPos(q.x - q.dz * o.lat, 0, q.z + q.dx * o.lat, q.yaw + 2.5); o.m.update(dt); } else this.place(o.m, o.s, o.lat); }
    this.trail.push(this.av.root.position.clone().setY(0.3), ctx.time); this.trail.update(ctx.time, ctx.camera.camera);
  }
  cameraTarget() { return this.focus ?? this._target.set(0, 0.9, 11); }
  drawPlay(hud) {
    const w = hud.width;
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, 12, 24, `${Math.round(this.scoreNow())}%`, { scale: 2, color: 'sand' });
    say(hud, w - 12, 12, `Cups ${this.cupsGot}/${CUPS}`, { anchor: 'r', scale: 2, color: 'white' });
    const mw = 130, mx = Math.floor((w - mw) / 2), my = hud.height - 40;
    panel(hud, mx - 8, my - 20, mw + 16, 34, { shadow: false });
    say(hud, w / 2, my - 16, this.stitch > 0 ? 'Stitch!' : this.stumble > 0 ? 'Stumble' : `Cadence ${this.cad.toFixed(1)}`, { anchor: 'c', color: this.stitch > 0 ? 'red' : 'ink', shadow: false });
    hud.rect(mx, my, mw, 6, 'mist'); hud.rect(mx + Math.round(BAND[0] / 4.5 * mw), my, Math.round((BAND[1] - BAND[0]) / 4.5 * mw), 6, 'lime'); hud.rect(mx + Math.round(Math.min(4.5, this.cad) / 4.5 * mw) - 1, my - 3, 3, 12, 'ink');
    const gap = Math.max(0, this.coachS - this.s); say(hud, w / 2, hud.height - 76, gap > 0.5 ? `Coach ${gap.toFixed(0)} m ahead` : 'Alongside Coach', { anchor: 'c', color: 'white' });
    hud.rect(12, hud.height - 88, w - 24, 3, 'navy'); hud.rect(12, hud.height - 88, Math.round((w - 24) * this.s / this.path.length), 3, 'lime');
  }
  extraState() { return { act: this.actId, s: +this.s.toFixed(1), cad: +this.cad.toFixed(2), cups: this.cupsGot, pace: +this.pacePct().toFixed(1), result: this.result }; }
}
