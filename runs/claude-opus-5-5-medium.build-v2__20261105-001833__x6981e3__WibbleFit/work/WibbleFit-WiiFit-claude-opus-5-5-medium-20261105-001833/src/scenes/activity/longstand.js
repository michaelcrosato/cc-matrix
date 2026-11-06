// 5.10 The Long Stand. Stillness scoring with a data timeline. No way to fail.
import { Precipitation, THREE, applySky, skyAt } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar, PlumbBob } from '../../art/avatar.js';
import { buildPlaza } from '../../art/island.js';
import { place } from '../../art/stage.js';
import { CAST_LOOKS } from '../../data/classmates.js';
import { LONG_STAND } from '../../data/poses.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { dial } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';
import { PoseSim } from './poses.js';
import { T } from '../../core/tunables.js';
export class LongStandSim extends PoseSim {
  idx = 0; kevin = false; rain = false; drift = 0; biasX = 0; noiseK = 1; fired = [];
  constructor(env, rng, from = 0) { super({ clip: 'StandTall', ring: 0.4, hold: 90 }, env, rng); this.settle = 0; this.release = 0; this.hold = 90; this.t = from; this.from = from; this.rng2 = rng; while (this.idx < LONG_STAND.length && LONG_STAND[this.idx].t <= from && from > 0) this.apply(LONG_STAND[this.idx++], true); }
  apply(ev, silent = false) {
    if (ev.ring !== undefined) this.ring = ev.ring;
    if (ev.bias !== undefined) this.biasX = ev.bias;
    if (ev.noise !== undefined) this.noiseK = ev.noise;
    if (ev.kevin !== undefined) this.kevin = ev.kevin;
    if (ev.rain !== undefined) this.rain = ev.rain;
    if (ev.impulse && !silent) this.dot.impulse(ev.impulse[0], ev.impulse[1]);
    if (ev.randomImpulse && !silent) { const a = this.rng2.next() * 6.283; this.dot.impulse(Math.cos(a) * ev.randomImpulse, Math.sin(a) * ev.randomImpulse); }
    if (ev.drift) this.drift = 8;
    if (!silent) this.fired.push(ev);
  }
  mods() { return { noise: this.noiseK * this.env.noiseMul, bx: this.biasX * T.dotAuthority }; }
  step(dt, u) {
    while (this.idx < LONG_STAND.length && LONG_STAND[this.idx].t <= this.t) { const ev = LONG_STAND[this.idx++]; this.apply(ev); if (ev.end) { this.done = true; this.score = this.compute(); return; } }
    this.drift = Math.max(0, this.drift - dt);
    super.step(dt, u);
    this.done = false;
  }
  compute() { return this.holdT > 0 ? 100 * (this.inT / Math.max(this.holdT, this.from > 0 ? this.holdT : 90)) : 0; }
}
export class LongStandScene extends ActivityScene {
  makeSim(ctx) { return new LongStandSim(App.simEnv(ctx, this.def), ctx.random.fork(`stand-${this.simN = (this.simN ?? 0) + 1}`), this.args.from ?? 0); }
  async buildStage(ctx) {
    this.hasPractice = false;
    this.world = await buildPlaza(ctx);
    applySky(ctx.engine, skyAt(17.6));
    this.playerLane = 0;
    const avatar = await makeAvatar(ctx, this.playerLook()); avatar.setAt(0, 0, 0.8); avatar.play('StandTall');
    this.lanes.push({ i: 0, who: 'player', avatar, driver: this.localDriver(ctx), name: 'You' });
    this.lanes[0].sim = this.makeSim(ctx);
    this.coach = await makeAvatar(ctx, CAST_LOOKS.coach); this.coach.setAt(1.2, 0, -1.3); this.coach.play('StandTall'); this.bob = new PlumbBob(ctx, this.coach);
    this.marg = await makeAvatar(ctx, CAST_LOOKS.marguerite); this.marg.setAt(-3.2, 0, -0.5, 0.5);
    this.dennis = await makeAvatar(ctx, CAST_LOOKS.dennis); this.dennis.setAt(3.1, 0, -0.2, -0.5);
    this.june = await makeAvatar(ctx, CAST_LOOKS.june); this.june.setAt(-1.7, 0, -1.8, 0.2); this.june.play('Sit');
    this.ounceB = place(ctx, 'ounce', -2.6, 0, 1.7, { actors: true, scale: 1.1 }); this.ounceB.object.rotation.y = 0.4;
    this.kevinB = place(ctx, 'kevin', 0, -9, 0, { actors: true });
    this.rain = new Precipitation({ kind: 'rain', count: 2400, area: [24, 12, 14] }); ctx.scene.add(this.rain); this.rain.intensity = 0; this.rainGoal = 0;
  }
  cameraConfig() { return { preset: 'fixed', position: [0, 2.2, 8.4], target: [0, 1.2, 0], fov: 28 }; }
  cardInfo() { return { goal: 'Stand. Ninety seconds. Keep the dot in the circle.', prompts: [['lean', 'Lean']] }; }
  onPlayStart(ctx) { App.music('stand'); }
  resumeMusic() { App.music(this.lanes[0].sim.t > 75 ? 'swell' : 'stand'); return true; }
  view(ctx, dt) {
    const s = this.lanes[0].sim, a = this.lanes[0].avatar;
    a.lean.x = s.dot.x; a.lean.y = s.dot.y; const over = s.dot.dist() - s.ringR; a.trem = over > 0 ? Math.min(1, over * 4) : 0;
    this.world.update(ctx, dt);
    for (const ev of s.fired.splice(0)) {
      if (ev.say) App.barkLine(ev.say[1], ev.say[0], 3);
      if (ev.kevin === true) { App.sfx('squawk'); }
      if (ev.sneeze) { this.dennis.play('Sneeze', { once: true }); App.sfx('sneeze'); }
      if (ev.clap) { this.marg.play('SlowClap'); this.clapT = 8; }
      if (ev.rumble) { ctx.engine.shake.add(0.7); App.sfx('rumble'); }
      if (ev.swell) { App.music('swell'); applySky(ctx.engine, skyAt(17)); App.flash('sand', { duration: 0.4 }); }
      if (ev.end) { App.sfx('fanfare'); this.coach.play('Bow', { once: true }); }
    }
    if (this.clapT > 0) { this.clapT -= dt; this.clapTick = (this.clapTick ?? 0) - dt; if (this.clapTick <= 0) { this.clapTick = 1.33; App.sfx('clap'); } if (this.clapT <= 0) this.marg.play('Idle'); }
    this.rainGoal = s.rain ? 0.8 : 0; this.rain.intensity += (this.rainGoal - this.rain.intensity) * Math.min(1, dt); this.rain.update(dt, this.target);
    const k = this.kevinB.object;
    if (s.kevin) { k.position.set(a.root.position.x, 1.62, 0.8); const w = Math.sin(ctx.time * 3) > 0.9 ? 0.6 : 0; k.getObjectByName('wingL') && (k.getObjectByName('wingL').rotation.z = w); k.getObjectByName('wingR') && (k.getObjectByName('wingR').rotation.z = -w); } else k.position.y = -9;
    const needle = this.ounceB.object.getObjectByName('needle'); if (needle) needle.rotation.y = Math.PI + Math.sin(ctx.time * 7) * (s.t > 75 ? 0.4 : 0.1);
    const c = ctx.camera.camera; if (c.isPerspectiveCamera) { c.fov = 28 - Math.min(8, s.t * 0.09); c.updateProjectionMatrix(); }
    this.marg.update(dt); this.dennis.update(dt); this.june.update(dt);
  }
  drawPlay(ctx, hud) {
    const s = this.lanes[0].sim, W = hud.width;
    App.dialCenter.x = W / 2; App.dialCenter.y = 56;
    dial(hud, W / 2, 56, 44, { ringR: s.ringR, x: s.dot.x, y: s.dot.y, inside: s.inside, glow: s.t / 90 });
    if (s.drift > 0) { const x = W / 2 + 60 - (8 - s.drift) * 16; say(hud, x, 52, 'Are you nearly done?', { color: 'plum', shadow: 'white' }); }
    this.drawTopBar(hud, Math.round(s.score), `${Math.max(0, Math.ceil(90 - s.t))} s`);
    if (this.phase === 'play' && !App.attract) promptBar(hud, [['lean', 'Stand'], ['pause', 'Pause']]);
    void center;
  }
}
