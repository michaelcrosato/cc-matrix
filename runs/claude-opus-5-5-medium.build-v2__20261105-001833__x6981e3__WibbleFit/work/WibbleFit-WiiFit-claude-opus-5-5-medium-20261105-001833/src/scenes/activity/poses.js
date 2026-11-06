// 5.1 Holding Still. Hold the pose by keeping the Dot in the ring.
import { PALETTE, THREE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { place } from '../../art/stage.js';
import { Dot } from '../../core/dot.js';
import { BARKS } from '../../data/lines.js';
import { POSES } from '../../data/poses.js';
import { T } from '../../core/tunables.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { bar, dial } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';

const { BoxGeometry, Mesh, MeshBasicMaterial } = THREE;
export class PoseSim {
  t = 0; settle = 4; release = 2; inT = 0; holdT = 0; breathOk = 0; breathT = 0; s = 0.5; done = false; inside = false; wasInside = true; score = 0; events = []; wobbles = 0; bias = 0;
  constructor(pose, env, rng, over = {}) {
    this.pose = { ...pose, ...over }; this.env = env; this.rng = rng; this.hold = this.pose.hold;
    this.dot = new Dot(() => rng.next()); this.ph = rng.next() * 6.28; this.ring = this.pose.ring;
  }
  get ringR() { return this.ring * this.env.ringMul; }
  get phaseName() { return this.t < this.settle ? 'settle' : this.t < this.settle + this.hold ? 'hold' : 'release'; }
  breathIn() { const p = this.pose.breath; return p ? (((this.t - this.settle) % p) + p) % p < p / 2 : false; }
  mods() {
    const p = this.pose, m = { noise: this.env.noiseMul };
    const u = Math.max(0, Math.min(1, (this.t - this.settle) / this.hold));
    if (p.wander) m.bx = p.wander * T.dotAuthority * Math.sin(0.37 * this.t + this.ph);
    if (p.yNoise) m.by = (p.yNoise - 1) * T.dotNoise * Math.sin(2.9 * this.t + this.ph);
    if (p.noiseRamp) m.noise *= p.noiseRamp[0] + (p.noiseRamp[1] - p.noiseRamp[0]) * u;
    if (p.instScale) m.inst = p.instScale;
    if (p.tremorAfter && this.t - this.settle > p.tremorAfter) m.bx = (m.bx ?? 0) + 0.9 * Math.sin(23 * this.t);
    return m;
  }
  step(dt, u) {
    this.t += dt;
    const phase = this.phaseName, m = this.mods(), p = this.pose;
    if (p.breath && phase === 'hold') {
      const ok = !!u.breath === this.breathIn();
      this.s += ((ok ? 1 : 0) - this.s) * Math.min(1, dt / 0.5);
      m.noise *= 1.25 - T.breathBonus * this.s;
      this.breathT += dt; if (ok) this.breathOk += dt;
    }
    this.dot.step(dt, u.x, u.y, T, m);
    if (this.env.god) this.clampIn();
    this.inside = this.dot.dist() <= this.ringR;
    if (phase !== 'settle' && this.inside !== this.wasInside) {
      this.events.push(this.inside ? 'in' : 'out');
      if (!this.inside) this.wobbles++;
    }
    this.wasInside = this.inside;
    if (phase === 'hold') { this.holdT += dt; if (this.inside) this.inT += dt; }
    this.score = this.compute();
    if (this.t >= this.settle + this.hold + this.release) this.done = true;
  }
  clampIn() { const d = this.dot.dist(), r = this.ringR * 0.9; if (d > r && d > 0) { const k = r / d; this.dot.x *= k; this.dot.y *= k; this.dot.vx *= 0.5; this.dot.vy *= 0.5; } }
  compute() {
    if (this.holdT <= 0) return 0;
    const ring = this.inT / this.hold;
    return this.pose.breath ? 100 * (0.8 * ring + 0.2 * (this.breathT > 0 ? this.breathOk / this.hold : 0)) : 100 * ring;
  }
  result() { return { score: Math.round(this.compute()), stats: { wobbles: this.wobbles } }; }
  bot(driver, out, dt) {
    driver.brain.lean(this.dot, 0, 0, dt, out);
    const sk = driver.skill; let want = this.breathIn();
    if (driver.rng.next() < sk.mistake * dt * 4) driver.breathFlip = (driver.breathFlip ?? 0) + 0.5;
    if (driver.breathFlip > 0) { want = !want; driver.breathFlip -= dt; }
    out.breath = want;
  }
}
export const poseView = {
  kind: 'poses',
  enter(scene, lane, data) { const clip = data.clip; lane.clipName = clip; lane.avatar.play(clip); },
  update(scene, lane, dt) {
    const s = lane.sim, a = lane.avatar; if (!s) return;
    a.lean.x = s.dot.x; a.lean.y = s.dot.y;
    const d = s.dot.dist(), over = d - s.ringR;
    a.trem = over > 0 ? Math.min(1, over * 4) : 0;
    if (over > 0.55 && a.current !== 'Teeter') a.play('Teeter');
    else if (over <= 0.45 && a.current === 'Teeter') a.play(lane.clipName);
  },
  draw(scene, hud, lane, box, big) {
    const s = lane.sim; if (!s) return;
    dial(hud, box.x, box.y, box.r, { ringR: s.ringR, x: s.dot.x, y: s.dot.y, inside: s.inside, glow: s.inT / Math.max(1, s.holdT + 1), seat: box.seat });
    if (s.pose.breath && s.phaseName === 'hold') {
      const p = s.pose.breath, ph = (((s.t - s.settle) % p) + p) % p / p, f = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      if (big) {
        const bx = box.x - box.r - 24;
        bar(hud, bx, box.y - 30, 12, 60, 0, 'cyan');
        const fh = Math.round(58 * f); hud.rect(bx + 1, box.y + 29 - fh, 10, fh, s.breathIn() ? 'cyan' : 'sky');
        say(hud, bx - 38, box.y - 3, s.breathIn() ? 'In...' : 'Out...', { color: 'white' });
      } else bar(hud, box.x - box.r, box.y + box.r + 4, box.r * 2, 4, f, 'cyan');
    }
  },
  score: (s) => s.compute(),
};
export class PosesScene extends ActivityScene {
  poseData() { const p = POSES[this.def.id]; return this.hard ? { ...p, ...this.def.hard } : p; }
  makeSim(ctx, lane) { return new PoseSim(this.poseData(), App.simEnv(ctx, this.def), ctx.random.fork(`pose-${lane.i}-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    await this.buildLanes(ctx, 'pavilion');
    const d = this.poseData();
    for (const l of this.lanes) poseView.enter(this, l, d);
    this.coach.play(d.clip);
    this.kevinT = 0; this.cam = ctx.camera.camera; this.push = 0;
    ctx.particles.register('zen', { count: [1, 1], life: [2, 4], speed: [0.05, 0.2], gravity: -0.04, size: [1, 1], colors: ['white', 'sand', 'white'], radius: 4 });
    this.moteT = 0;
    this.kevinB = place(ctx, 'kevin', 5, 0.94, -3, { actors: true, turn: -20 });
    // Sunbeams: pale slanted shafts through the pavilion.
    for (const [x, w] of [[-4.2, 0.9], [-1.2, 0.6], [3.4, 1.1]]) { const b = new Mesh(new BoxGeometry(w, 7, 0.06), new MeshBasicMaterial({ color: PALETTE.sand, transparent: true, opacity: 0.16, depthWrite: false })); b.position.set(x, 2.6, -1.6); b.rotation.z = 0.32; ctx.scene.add(b); }
  }
  cardInfo() { const b = this.poseData().breath; return { goal: b ? 'Keep the dot in the circle. Breathe when told.' : 'Keep the dot in the circle.', prompts: b ? [['lean', 'Lean'], ['breath', 'Hold: breathe in']] : [['lean', 'Lean']] }; }
  view(ctx, dt, rdt) {
    for (const l of this.lanes) poseView.update(this, l, dt);
    const s = this.lanes[1].sim;
    for (const e of s.events.splice(0)) {
      if (e === 'in') { App.sfx('chimeIn'); if (this.cosmetic.chance(0.25) && !App.bark) App.barkLine(this.cosmetic.pick(BARKS.ringIn), 'ounce', 1.8); }
      else { App.sfx('chimeOut'); if (this.cosmetic.chance(0.35) && !App.bark) App.barkLine(this.cosmetic.pick(BARKS.ringOut), 'ounce', 2); }
    }
    { const k = this.kevinB.object, f = Math.sin(ctx.time * 0.7) > 0.93 ? 0.7 : 0, wl = k.getObjectByName('wingL'), wr = k.getObjectByName('wingR'); if (wl) wl.rotation.z = f; if (wr) wr.rotation.z = -f; }
    this.moteT -= dt; if (this.moteT <= 0) { this.moteT = 0.25; ctx.particles.burst('zen', [this.cosmetic.range(-5, 5), this.cosmetic.range(0.4, 3), this.cosmetic.range(-2, 2)]); }
    // A slow push-in while steady.
    const steady = this.phase === 'play' && s.inside;
    this.push += ((steady ? 1 : 0) - this.push) * Math.min(1, dt * 0.5);
    const c = ctx.camera.camera;
    if (c.isPerspectiveCamera) { c.fov = 30 - this.push * 3; c.updateProjectionMatrix(); }
  }
  drawPlay(ctx, hud) {
    const W = hud.width, s = this.lanes[1].sim;
    App.dialCenter.x = W / 2; App.dialCenter.y = 56;
    poseView.draw(this, hud, this.lanes[1], { x: Math.round(W / 2), y: 56, r: 44 }, true);
    this.drawTopBar(hud, Math.round(s.score), s.phaseName === 'settle' ? 'Settle...' : s.phaseName === 'release' ? 'Release.' : `${Math.max(0, Math.ceil(s.settle + s.hold - s.t))} s`);
    if (this.phase === 'play' && !App.attract) promptBar(hud, s.pose.breath ? [['lean', 'Lean'], ['breath', s.breathIn() ? 'Breathe in' : 'Let go'], ['pause', 'Pause']] : (App.device.last === 'keyboard' ? [['lean', 'Lean'], ['half', 'Half lean'], ['pause', 'Pause']] : [['lean', 'Lean'], ['pause', 'Pause']]));
    void center;
  }
}
