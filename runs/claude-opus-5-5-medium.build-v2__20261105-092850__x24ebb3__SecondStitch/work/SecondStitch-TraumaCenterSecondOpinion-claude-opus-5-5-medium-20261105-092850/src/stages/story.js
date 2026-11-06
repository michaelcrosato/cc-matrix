// Story scene: a set plus talking heads. Typewriter text with gibberish voice, the speaker leaning in, the other dimmed.
import { THREE } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { SCENES } from '../content/scenes/index.js';
import { buildSet, buildFigure } from '../view/sets.js';
import { BustView } from '../view/bust.js';
import { CAST } from '../content/cast.js';

const CLOSE = [[0.2, 1.75, 5.1], [0, 1.42, 0]];
export class StoryStage extends Stage {
  name = 'story';
  constructor(opts) { super(); this.opts = opts; this.scene = SCENES[opts.scene]; this.i = -1; this.typed = 0; this.t = 0; this.hold = 0; this.busts = {}; this.figures = []; this.marks = []; this.camA = 0; }
  async build(ctx) {
    this.set = await buildSet(ctx, this.scene.set);
    this.rain = this.set.def.rain ? ctx.audio.loop('rain', { volume: 0.6 }) : null;
    app.director?.play(this.scene.music);
    app.applyLook(1, 0.3, 0);
    // Busts live on a stage of their own in front of the set.
    this.front = new THREE.Group();
    this.front.position.set(0, 0, 2);
    ctx.scene.add(this.front);
    for (const f of this.scene.figures ?? []) {
      const fig = buildFigure(ctx, f[0], this.set.group, [f[1][0], 0, f[1][1]], Math.atan2(-f[1][0], 3 - f[1][1]), f[0] === 'ilya' ? { masked: false } : {});
      fig.play(f[2]);
      this.figures.push(fig);
    }
    const ids = new Set(this.scene.cast);
    for (const b of this.scene.beats) { if (b.who && CAST[b.who]) ids.add(b.who); if (b.swap) ids.add(b.swap); }
    for (const id of ids) { const v = new BustView(ctx, id, { parent: this.front }); v.root.visible = false; this.busts[id] = v; }
    this.left = this.scene.cast[0]; this.right = this.scene.cast[1];
    this.next(ctx);
  }
  status() { return `story ${this.scene.id} beat=${this.i}/${this.scene.beats.length}`; }
  next(ctx) {
    this.i++;
    if (this.i >= this.scene.beats.length) { this.finish(); return; }
    const b = this.scene.beats[this.i];
    this.typed = 0; this.hold = 0;
    if (b.swap && b.swap !== this.right && b.swap !== this.left) this.left = b.swap;
    if (b.cue) ctx.audio.play(b.cue);
    this.camMode = b.cam === 'wide' ? 'wide' : 'close';
    this.camA = 0;
  }
  finish() { if (this.done) return; this.done = true; this.opts.onDone?.(); }
  update(ctx, dt) {
    if (this.done) return;
    const devs = app.devices;
    devs.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt);
    app.director?.update(dt);
    for (const f of this.figures) f.update(dt);
    const beat = this.scene.beats[this.i];
    if (!beat) return;
    const plain = beat.say.replace(/\*/g, '');
    const cast = CAST[beat.who];
    const speed = 34 * (app.settings.textSpeed ?? 1) * (cast?.voice?.speed ?? 1);
    const prev = Math.floor(this.typed);
    this.typed = Math.min(plain.length, this.typed + dt * speed);
    const now = Math.floor(this.typed);
    const bust = this.busts[beat.who];
    for (let k = prev; k < now; k++) {
      const end = plain.slice(k).search(/[.!?]/);
      if (app.voice.letter(ctx.audio, plain[k], beat.who, cast, k, end >= 0 ? plain[k + end] : '')) bust?.talk(1);
    }
    // Who's on stage.
    const speakerSide = beat.who === this.right ? 'right' : beat.who === this.left ? 'left' : 'left';
    if (beat.who !== this.left && beat.who !== this.right) this.left = beat.who;
    const wide = this.camMode === 'wide';
    for (const f of this.figures) f.obj.visible = wide;
    for (const [id, v] of Object.entries(this.busts)) {
      const side = id === this.left ? -1 : id === this.right ? 1 : 0;
      v.root.visible = !!side && !wide;
      if (!side) continue;
      const on = id === beat.who;
      v.leanTarget = on ? 1 : 0;
      v.setDim(!on);
      const tx = side * (on ? 0.95 : 1.25), ty = on ? -0.1 : -0.36, tz = on ? 0.35 : -0.6;
      const r = v.root.position, k = Math.min(1, dt * 8);
      r.x += (tx - r.x) * k; r.y += (ty - r.y) * k; r.z += (tz - r.z) * k;
      v.root.rotation.y = -side * 0.22;
      if (on) { if (v.emotion !== beat.emo) v.setEmotion(beat.emo); } else if (beat.other && v.emotion !== beat.other) v.setEmotion(beat.other);
      v.update(dt);
      v.look = side * -0.06;
    }
    // Camera
    this.camA = Math.min(1, this.camA + dt * 1.5);
    if (wide) { const W = this.set.def.wide, f = 1 - this.camA * 0.08; setView(ctx, [W.pos[0] * f + Math.sin(this.t * 0.2) * 0.12, W.pos[1], W.pos[2] * f], [W.target[0], W.target[1] - 0.75, W.target[2]], 34); } else { const off = speakerSide === 'right' ? 0.12 : -0.12; setView(ctx, [CLOSE[0][0] + off + Math.sin(this.t * 0.4) * 0.02, CLOSE[0][1] + 0.02 * Math.sin(this.t * 0.6), CLOSE[0][2] + 2.4], [off, CLOSE[1][1], 2], 30); }
    // Text box
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.clear();
    const boxH = 54, y = H - boxH;
    hud.rect(0, y - 1, W, boxH + 1, 0x0d0b14);
    hud.rect(0, y - 1, W, 1, cast?.color ?? 0xffffff);
    hud.text(10, y + 5, cast?.name ?? '', { color: cast?.color ?? 0xffffff });
    app.prompts.draw(hud, 10, y + 16, beat.say, { width: W - 20, limit: now, lineH: 11 });
    hud.text(10, 8, this.scene.title, { color: 0x8a93a6 });
    hud.text(W - hud.measure(this.set.def.label).width - 10, 8, this.set.def.label, { color: 0x5a6172 });
    const complete = this.typed >= plain.length;
    if (complete && Math.floor(this.t * 3) % 2) hud.rect(W - 14, H - 12, 6, 6, 0xffd24d);
    app.prompts.strip(hud, 10, H - 11, [['confirm', 'NEXT'], ['skipScene', 'HOLD: SKIP']]);
    // comic marks
    if (!wide && (beat.emo === 'shock' || beat.emo === 'panic') && this.typed < 12) {
      const sx = beat.who === this.right ? W * 0.72 : W * 0.28, sy = H * 0.22;
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3, R = 26 + (i % 2) * 6; hud.rect(Math.round(sx + Math.cos(a) * R), Math.round(sy + Math.sin(a) * R), 2, 2, 0xffffff); hud.rect(Math.round(sx + Math.cos(a) * (R + 5)), Math.round(sy + Math.sin(a) * (R + 5)), 2, 2, 0xffffff); }
    }
    // Input: advance or skip
    const n = devs.nav, click = input => input.wasPressed('MouseLeft');
    const pad = devs.pads.find(Boolean);
    const skipHeld = ctx.input.isDown('Escape') || (pad && pad.buttons[3] > 0.5);
    this.skipT = skipHeld ? (this.skipT ?? 0) + dt : 0;
    if (this.skipT > 0) { hud.rect(10, H - 3, Math.round((W - 20) * Math.min(1, this.skipT / 0.8)), 2, 0xffd24d); }
    if (this.skipT >= 0.8) { this.finish(); return; }
    if (n.confirm || click(ctx.input) || (pad && pad.buttons[0] > 0.5 && !(pad.prev[0] > 0.5) && false)) {
      if (!complete) this.typed = plain.length;
      else { ctx.audio.play('uiMove'); this.next(ctx); }
    }
    void go;
  }
}
