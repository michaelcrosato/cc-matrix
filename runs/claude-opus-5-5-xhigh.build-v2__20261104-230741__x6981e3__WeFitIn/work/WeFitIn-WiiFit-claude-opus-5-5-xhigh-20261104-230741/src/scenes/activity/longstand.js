// The Long Stand. 90 seconds of standing still while the whole island tries to distract you.
import { applySky, PALETTE, Precipitation, skyAt, THREE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { Dot } from '../../core/dot.js';
import { T } from '../../core/tunables.js';
import { makeAvatar } from '../../art/avatar.js';
import { Kevin, Ounce } from '../../art/props.js';
import { STAND_SONG } from '../../audio/songs.js';
import { LOOKS } from '../../data/classmates.js';
import { STAND_LENGTH, STAND_TIMELINE } from '../../data/longstand.js';
import { say } from '../../ui/font.js';
import { drawDial } from '../../ui/widgets.js';
import { topRow } from '../../ui/activity-hud.js';
import { ActivityScene } from './base.js';
import { playerInfo } from './lanes.js';
import { plazaSet } from '../sets.js';

const { Vector3 } = THREE;

export class LongStandActivity extends ActivityScene {
  outroLength = 2.4;
  rainAt = new Vector3(0, 0, -3);
  headAt = new Vector3();

  async stage(ctx) {
    plazaSet(ctx, 17.5);
    applySky(ctx.engine, skyAt(17.5));
    const p = playerInfo();
    this.you = await makeAvatar(ctx, p.look, { at: [0, 0, 1], yaw: 0, clip: 'Idle' });
    this.addOunce(ctx, { at: [-2.1, 0.04, 0.6], yaw: 0.45, scale: 1.15 });
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at: [3.2, 0, -0.8], yaw: -0.5, clip: 'CoachStand' });
    this.coach.addPlumb();
    this.marguerite = await makeAvatar(ctx, LOOKS.marguerite, { at: [-3.4, 0, -0.8], yaw: 0.5, clip: 'Watch' });
    this.dennis = await makeAvatar(ctx, LOOKS.dennis, { at: [-4.4, 0, 0.8], yaw: 0.7, clip: 'Slump' });
    this.june = await makeAvatar(ctx, LOOKS.june, { at: [4.5, 0, 0.8], yaw: -0.7, clip: 'Watch' });
    this.kevin = new Kevin(ctx, { at: [2, 3, -2], yaw: 2 });
    this.rain = new Precipitation({ kind: 'rain', count: 1400, area: [20, 10, 7], color: PALETTE.mist });
    ctx.scene.add(this.rain);
    this.rain.intensity = 0;
    this.dot = new Dot(() => this.rng.next());
    this.begin(false);
  }

  /** One bar is 5 s: the chord line swells at t = 75. An excerpt starts partway in. */
  startMusic() {}
  onPlayStart() {
    const bar = Math.floor((this.args.from ?? 0) / 5);
    this.ctx.audio.playMusic(bar ? { ...STAND_SONG, order: STAND_SONG.order.slice(bar) } : STAND_SONG, 'stand');
    App.songName = 'stand';
  }

  begin() {
    this.time = this.args.from ?? 0;
    this.nextEvent = 0;
    while (this.nextEvent < STAND_TIMELINE.length && STAND_TIMELINE[this.nextEvent].t < this.time) this.applyEvent(STAND_TIMELINE[this.nextEvent++], true);
    if (this.nextEvent === 0) { this.ring = 0.4; this.bias = 0; this.noise = 1; }
    this.dot.reset();
    this.frames = 0; this.inside = 0;
    this.juneT = 0;
    this.wasInside = false;
    this.clapT = -1;
  }

  /** Effects from the data. silent: replaying them to reach a later starting point. */
  applyEvent(e, silent = false) {
    if (e.ring !== undefined) this.ring = e.ring;
    if (e.biasX !== undefined) this.bias = e.biasX;
    if (e.noise !== undefined) this.noise = e.noise;
    if (e.rain !== undefined) this.raining = e.rain;
    if (silent) return;
    const ctx = this.ctx;
    if (e.say) App.say(e.say[0], e.say[1]);
    if (e.kevinOn === true) this.kevin.flyTo(0, 1.78, 1, 1.1);
    if (e.kevinOn === false) { this.kevin.flyTo(-14, 9, -16, 3); this.kevinPerched = false; }
    if (e.kevinOn === true) this.kevinPerched = true;
    if (e.sneeze) { App.sfx('sneeze'); this.dennis.play('Sneeze', { once: true, fade: 0.05, then: () => this.dennis.play('Slump', { fade: 0.3 }) }); }
    if (e.impulse) this.dot.impulse(e.impulse[0], e.impulse[1]);
    if (e.clap) { this.marguerite.play('SlowClap', { fade: 0.3 }); this.clapT = 0; }
    if (e.juneText) { this.juneT = 9; this.juneMsg = e.juneText; }
    if (e.rumble) {
      App.sfx('rumble');
      ctx.engine.shake.add(0.8);
      const a = this.rng.range(0, 6.28);
      this.dot.impulse(Math.cos(a) * e.randomImpulse, Math.sin(a) * e.randomImpulse);
    }
    if (e.sun) {
      applySky(ctx.engine, skyAt(16));
      if (!App.settings.reduceFlashes) App.flash('sand', { duration: 0.4 });
    }
  }

  botInput(out, dt, brain) { brain.lean(out, this.dot, 0, 0, dt); }

  stepPlay(ctx, dt, scoring) {
    this.time += dt;
    while (this.nextEvent < STAND_TIMELINE.length && STAND_TIMELINE[this.nextEvent].t <= this.time) this.applyEvent(STAND_TIMELINE[this.nextEvent++]);
    const inp = this.readPlayer(ctx, dt, this.dial);
    this.dot.step(dt, inp.x, inp.y, T, { noise: this.noise * App.noiseScale(), bx: this.bias * T.dotAuthority });
    const ring = App.ringOf(this.ring) * this.ringBoost;
    if (App.dev.god || this.cheatRing) this.dot.clampTo(0, 0, ring * 0.9);
    const inside = Math.hypot(this.dot.x, this.dot.y) <= ring;
    if (inside !== this.wasInside) { App.sfx(inside ? 'ringIn' : 'ringOut', { volume: 0.5 }); this.wasInside = inside; }
    if (scoring) { this.frames++; if (inside) this.inside++; }
    if (this.clapT >= 0) {
      this.clapT += dt;
      if (this.clapT > 1.2 && this.time < 75) { this.clapT = 0; App.sfx('clap'); }
    }
    this.you.action('Idle').timeScale = 1;
  }

  isOver() { return this.time >= STAND_LENGTH; }
  playLength() { return STAND_LENGTH; }

  result() {
    const score = Math.round(this.frames ? (100 * this.inside) / this.frames : 0);
    return { score, seconds: this.time, display: `${score}%` };
  }

  /** Closing the game here mustn't skip the confession. */
  onFinish() {
    const slot = App.slot;
    if (this.mode === 'week' && slot?.week === 1) { slot.phase = 'ending'; App.store.write(); }
  }

  onOutroStart() {
    this.coach.play('Bow', { once: true, fade: 0.3 });
    this.marguerite.play('Idle', { fade: 0.3 });
  }

  visual(ctx, dt) {
    this.you.update(dt);
    const ring = App.ringOf(this.ring ?? 0.4);
    const d = Math.hypot(this.dot.x, this.dot.y);
    this.you.lean(this.dot.x, this.dot.y, d > ring ? Math.min(1.5, (d - ring) * 3) : 0, this.t);
    for (const a of [this.marguerite, this.dennis, this.june]) a.update(dt);
    this.rain.intensity += ((this.raining ? 1 : 0) - this.rain.intensity) * Math.min(1, dt * 1.2);
    this.rain.update(dt, this.rainAt);
    if (this.kevinPerched && this.kevin.state !== 'fly') {
      const head = this.you.head?.getWorldPosition?.(this.headAt);
      if (head) this.kevin.root.position.set(head.x, head.y + 0.42, head.z);
    }
    this.juneT = Math.max(0, this.juneT - dt);
    this.camPush = Math.min(0.6, (this.time / STAND_LENGTH) * 0.6);
  }

  drawGame(ctx) {
    if (this.phase === 'intro' || this.phase === 'results') return;
    const { hud } = ctx;
    const ring = App.ringOf(this.ring ?? 0.4) * this.ringBoost;
    const x = Math.round(hud.width / 2), y = 56, r = 44;
    this.dial = { x, y };
    const mouse = App.device.last === 'mouse' && !this.autopilot ? App.device.pointerArt(ctx) : null;
    drawDial(hud, { x, y, r, dot: this.dot, ringR: ring, inside: this.wasInside, brighten: 1, mouse });
    if (this.juneT > 0) {
      // Text drifting across the dial: June's contribution.
      const u = 1 - this.juneT / 9;
      const tx = Math.round(x - 110 + u * 150);
      say(hud, tx, y - 4 + Math.round(Math.sin(u * 9) * 8), this.juneMsg, { color: 'red', shadow: 'white', name: 'june' });
    }
  }

  drawGameHud(ctx) {
    const left = Math.max(0, STAND_LENGTH - this.time);
    topRow(ctx.hud, `${Math.ceil(left)}s`, this.frames ? `${Math.round((100 * this.inside) / this.frames)}%` : '');
  }

  overlayDot() { return `${this.dot.x.toFixed(2)},${this.dot.y.toFixed(2)} ring ${this.ring?.toFixed(2)} t ${this.time?.toFixed(1)}`; }
  fingerprint() { return `${this.dot.x.toFixed(6)}|${this.inside}|${this.frames}`; }
}
