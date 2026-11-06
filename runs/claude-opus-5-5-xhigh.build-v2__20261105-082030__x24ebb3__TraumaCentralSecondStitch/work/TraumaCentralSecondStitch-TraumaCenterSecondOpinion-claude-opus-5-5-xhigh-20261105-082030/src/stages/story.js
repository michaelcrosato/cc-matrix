// A story scene: set plus busts, typewriter text with gibberish voice, the speaker leaning in and the
// other dimmed. Wide shots use full-body figures and the engine's Timeline.
import { THREE, Timeline } from '../../pixel-engine.js';
import { App } from '../app.js';
import { SPEAKER_NAMES } from '../content/lines.js';
import { SCENES } from '../content/scenes/index.js';
import { pauseAfter } from '../audio/voice.js';
import { BustRig } from '../view/bust.js';
import { Figure } from '../view/figure.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { Stage } from './stage.js';

const SLOTS = { L: -1.3, R: 1.3 };
const FIGS = { ilya: 'Idle', reyes: 'Idle', sabine: 'IdleLook', bram: 'Idle', pem: 'Sit', hesper: 'Idle', tomasz: 'Idle', zamboni: 'Wave', anselm: 'Idle', ottilie: 'Idle', ollie: 'Idle' };

export class StoryStage extends Stage {
  name = 'story';
  constructor(o) {
    super();
    this.o = o;
    this.scene = SCENES[o.sceneId];
    this.i = -1;
    this.chars = 0;
    this.acc = 0;
    this.pause = 0;
    this.busts = {};
    this.slots = { L: null, R: null };
    this.figures = [];
    this.markT = 0;
    this.mark = null;
    this.skipHold = 0;
    this.camMode = 'close';
    this.done = false;
    this.ambT = 8;
    this.autoT = 0;
    this.busy = false;
  }
  cameraConfig = { preset: 'fixed', position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30, minZoom: 1, maxZoom: 1 };

  async build(ctx) {
    this.setId = this.scene.set;
    this.set = new SetView(ctx, this.setId);
    this.makeKey(ctx);
    this.placeFigures(ctx);
    App.director.play(this.scene.music, { now: true });
    applyLook(ctx.engine, App.save.settings);
    this.rain = this.scene.rain || this.setId === 'helipad' ? ctx.audio.loop('rainLoop', { volume: this.setId === 'helipad' ? 1 : 0.5 }) : null;
    this.next();
  }
  makeKey(ctx) {
    // A key light for the faces, whatever the room is doing.
    this.key?.release();
    this.key = ctx.lights.request({ position: [0.4, 3, 3.4], color: 0xfff0e0, intensity: 7, radius: 8, priority: 8 });
  }
  placeFigures(ctx) {
    for (const f of this.figures) ctx.scene.remove(f.object);
    this.figures = [];
    const who = [...new Set(this.scene.beats.map((b) => b.who).filter(Boolean))].slice(0, this.set.spots?.length ?? 3);
    const figsFor = { ilya: 'ilya', reyes: 'reyes', sabine: 'sabine', bram: 'bram', pem: 'pem', hesper: 'hesper' };
    const spots = this.set.spots ?? [];
    who.forEach((w, i) => {
      const s = spots[i];
      if (!s) return;
      const clip = this.scene.id === 'end' && w === 'reyes' ? 'Sit' : FIGS[w] ?? 'Idle';
      const f = new Figure(ctx, figsFor[w] ?? 'patient', [s[0], s[1], s[2]], s[3], clip);
      this.figures.push(f);
    });
    // A patient on the table, an orderly in the corridor: rooms should have people in them.
    if (this.setId === 'corridor') {
      this.figures.push(new Figure(ctx, 'extra', [2.6, 0, -4.2], -1.2, 'Run'));
      this.figures.push(new Figure(ctx, 'extra', [-2.8, 0, -7.4], 1.4, 'Walk'));
    }
  }

  beat() { return this.scene.beats[this.i]; }
  next() {
    this.i++;
    if (this.i >= this.scene.beats.length) { this.finish(); return; }
    const b = this.beat();
    if (b.set && b.set !== this.setId) { this.swapSet(b.set); }
    this.startBeat(b);
  }
  async swapSet(id) {
    this.busy = true;
    const ctx = this.ctx;
    await ctx.engine.screen.cover('fade', { duration: 0.2 });
    this.set.dispose();
    ctx.scene.remove(this.set.group);
    this.setId = id;
    this.set = new SetView(ctx, id);
    this.makeKey(ctx);
    this.placeFigures(ctx);
    this.busy = false;
    await ctx.engine.screen.reveal('fade', { duration: 0.2 });
  }
  startBeat(b) {
    this.text = (b.say ?? b.narr ?? '').replace(/\*/g, '');
    this.rich = b.say ?? b.narr ?? '';
    this.chars = 0;
    this.acc = 0;
    this.pause = 0;
    this.wrapped = null;
    this.camMode = b.cam ?? (b.narr ? 'wide' : b.who ? 'close' : this.camMode);
    if (b.cam === 'wide' || b.narr) {
      const w = this.set.wide;
      const dx = w.position[0], dz = w.position[2];
      this.tl = new Timeline({ shots: [{ at: 0, position: w.position, target: w.target, fov: w.fov, cut: true }, { at: 7, position: [dx * 0.86, w.position[1] - 0.25, dz * 0.82], target: w.target, fov: w.fov }], bars: 0 });
      this.tl.play();
    } else this.tl = null;
    if (b.who) {
      const bust = this.ensureBust(b.who);
      bust.setEmotion(b.emo ?? 'neutral');
      for (const other of Object.values(this.busts)) if (other !== bust) other.setFocus(false);
      bust.setFocus(true);
      this.current = bust;
    } else this.current = null;
    if (b.mark) { this.mark = b.mark; this.markT = 0.55; App.sfx('reaction'); }
    if (b.cue) this.cue(b.cue);
  }
  ensureBust(who) {
    if (!this.busts[who]) {
      const rig = new BustRig(this.ctx, who);
      this.ctx.scene.add(rig.object);
      this.busts[who] = rig;
    }
    const rig = this.busts[who];
    if (this.slots.L !== who && this.slots.R !== who) {
      // The slot whose occupant spoke longest ago gives way.
      const free = !this.slots.L ? 'L' : !this.slots.R ? 'R' : this.lastSlot === 'L' ? 'R' : 'L';
      const old = this.slots[free];
      if (old && this.busts[old]) this.busts[old].object.visible = false;
      this.slots[free] = who;
      rig.object.visible = true;
      rig.object.position.x = SLOTS[free];
      rig.object.rotation.y = free === 'L' ? 0.2 : -0.2;
      rig.popT = 0.25;
    }
    this.lastSlot = this.slots.L === who ? 'L' : 'R';
    return rig;
  }
  cue(c) {
    const ctx = this.ctx;
    switch (c) {
      case 'thunder': App.sfx('thunder'); App.flash('white', { duration: 0.25, strength: 0.5 }); App.shake(0.2); break;
      case 'horn': App.sfx('horn'); break;
      case 'bell': App.sfx('bell'); break;
      case 'door': App.sfx('click', { pitch: -9 }); App.sfx('whoosh', { pitch: -3 }); break;
      case 'reaction': App.sfx('stamp', { volume: 0.5 }); App.shake(0.2); break;
      case 'tremor': App.shake(0.1); break;
      case 'collapse': App.sfx('stamp'); App.shake(0.7); App.sfx('flatline', { volume: 0.4 }); break;
      case 'breach': App.sfx('sobWave'); App.flash('lime', { duration: 0.3, strength: 0.5 }); App.shake(0.8); if (this.set.canister) this.set.canister.rotation.z = 1.3; break;
      case 'hiss': App.sfx('gelLoop'); App.sfx('whoosh'); ctx.particles.burst('foam', [1.6, 1, -3.6], { count: 24, colors: ['lime', 'white'], speed: 2 }); break;
      case 'fall': App.sfx('stamp', { volume: 0.7 }); break;
      case 'wheel': App.sfx('tick'); App.sfx('tick', { pitch: 3 }); break;
      default: break;
    }
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.o.onDone?.();
  }
  showCursor() { return App.devices.last === 'kbm'; }

  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    for (const f of this.figures) f.update(dt);
    for (const r of Object.values(this.busts)) if (r.object.visible) {
      r.update(dt);
      if (r.popT > 0) { r.popT -= dt; r.object.position.y = -Math.max(0, r.popT) * 3; } else r.object.position.y = 0;
    }
    const closeUp = this.camMode === 'close';
    for (const f of this.figures) f.object.visible = !closeUp;
    for (const who of [this.slots.L, this.slots.R]) if (who && this.busts[who]) this.busts[who].object.visible = closeUp;
    const cam = ctx.camera.camera;
    if (this.tl) {
      this.tl.update(dt);
      const s = this.tl.camera();
      if (s) {
        cam.position.set(...s.position);
        cam.fov = s.fov;
        cam.updateProjectionMatrix();
        cam.lookAt(...s.target);
      }
    } else {
      const c = this.set.close;
      const sw = Math.sin(this.t * 0.4) * 0.03;
      const narrow = Math.max(1, (16 / 9) / Math.max(0.2, cam.aspect));
      cam.position.set(c.position[0] + sw, c.position[1], c.position[2] * narrow);
      if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      cam.lookAt(c.target[0], c.target[1], c.target[2]);
    }
    // Room sounds under the talk.
    this.ambT -= dt;
    if (this.ambT <= 0) {
      this.ambT = 9 + Math.random() * 10;
      App.sfx(Math.random() < 0.5 ? 'bell' : 'horn', { volume: 0.5 });
    }
    if (overlay || this.busy) return;
    // Typewriter.
    const b = this.beat();
    if (!b) return;
    if (this.chars < this.text.length) {
      const rate = 34 * (App.save.settings.textSpeed ?? 1) * (b.narr ? 1.3 : 1);
      if (this.pause > 0) this.pause -= dt * rate;
      else {
        this.acc += dt * rate;
        while (this.acc >= 1 && this.chars < this.text.length && this.pause <= 0) {
          this.acc -= 1;
          const i = this.chars++;
          if (b.who && App.voiceChar(b.who, this.text, i)) this.current?.syllable();
          this.pause = pauseAfter(this.text[i], this.text, i);
        }
      }
    }
    if (this.o.auto) { this.autoT += dt; if (this.autoT > 2.2 && this.chars >= this.text.length) { this.autoT = 0; this.next(); } return; }
    const d = App.devices;
    const nav = d.nav;
    const advance = nav.confirm || d.click;
    if (advance) {
      if (this.chars < this.text.length) { this.chars = this.text.length; } else { App.sfx('uiMove'); this.next(); }
      return;
    }
    // Pause, and hold to skip.
    const holdSkip = ctx.input.isDown('Escape') || d.pads.some((p) => p.down[3]);
    if (holdSkip) {
      this.skipHold += dt;
      if (this.skipHold >= 0.8) { this.skipHold = 0; this.finish(); }
    } else this.skipHold = 0;
    if (d.pads.some((p) => p.edge[9] && !p.down[8])) this.openPause();
    this.markT = Math.max(0, this.markT - dt);
  }
  openPause() {
    import('../ui/overlays.js').then((m) => { if (!App.overlays.length) App.overlays.push(new m.PauseOverlay(this)); });
  }
  draw(ctx, ui) {
    const b = this.beat();
    if (!b || this.done) return;
    const w = ui.w, h = ui.h;
    const boxH = 58;
    const y = h - boxH - 5;
    ui.rect(8 + 2, y + 2, w - 16, boxH, 'ink');
    ui.rect(8, y, w - 16, boxH, 'night');
    ui.outline(8, y, w - 16, boxH, b.narr ? 'slate' : 'mist');
    const tx = 20, tw = w - 40;
    if (!this.wrapped) this.wrapped = ui.wrap(this.rich, tw, 1);
    if (b.who) {
      const name = SPEAKER_NAMES[b.who] ?? b.who.toUpperCase();
      const nw = ui.hud.measure(name, 1).width + 12;
      ui.rect(tx - 4, y - 6, nw, 13, 'navy');
      ui.outline(tx - 4, y - 6, nw, 13, 'sand');
      ui.text(tx + 2, y - 3, name, { color: 'sand', shadow: false });
    }
    let left = this.chars;
    this.wrapped.slice(0, 4).forEach((line, i) => {
      ui.rich(tx, y + 11 + i * 11, line, { chars: left, hi: 'orange', color: b.narr ? 'mist' : 'white' });
      left -= line.replace(/\*/g, '').length + 1;
    });
    if (this.chars >= this.text.length && Math.sin(this.t * 6) > -0.3) ui.action(w - 14 - ui.actionWidth('confirm'), y + boxH - 13, 'confirm');
    // Reaction marks and speed lines.
    if (this.markT > 0 && this.current && b.mark) {
      const speakerX = this.slots.L === b.who ? 0.28 : 0.72;
      const sx = w * speakerX + 54, sy = h * 0.12;
      if (b.mark === '!') {
        ui.text(sx, sy, '!', { color: 'white', scale: 5, shadow: 'ink' });
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * 6.283 + this.t;
          const r0 = 150 + (i % 3) * 30, r1 = r0 + 26;
          for (let k = 0; k < 6; k++) { const q = r0 + ((r1 - r0) * k) / 5; ui.rect(w / 2 + Math.cos(a) * q * 1.3, h * 0.4 + Math.sin(a) * q * 0.7, 2, 2, 'white'); }
        }
      } else if (b.mark === '?') ui.text(sx, sy, '?', { color: 'sand', scale: 5, shadow: 'ink' });
      else if (b.mark === '...') ui.text(sx - 8, sy + 8, '...', { color: 'white', scale: 3, shadow: 'ink' });
      else if (b.mark === 'sweat') ui.text(sx, sy + 4, '!?', { color: 'cyan', scale: 3, shadow: 'ink' });
    }
    if (this.skipHold > 0) {
      ui.text(w - 70, 6, 'SKIPPING', { color: 'white' });
      ui.rect(w - 70, 15, 60 * (this.skipHold / 0.8), 3, 'sand');
    } else if (!this.o.auto) ui.hints([['skip', 'HOLD TO SKIP']], 5);
    if (this.o.attractLabel) this.o.attractLabel(ui);
  }
  status() { return `story ${this.scene.id} beat=${this.i}/${this.scene.beats.length}`; }
  dispose() { this.rain?.stop(); this.key?.release(); }
}
