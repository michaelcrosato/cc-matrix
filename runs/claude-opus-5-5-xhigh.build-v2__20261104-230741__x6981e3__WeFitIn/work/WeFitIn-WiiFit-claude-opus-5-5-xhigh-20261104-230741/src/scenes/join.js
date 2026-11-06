// Family Hour: each device claims a mat by pressing Cross or Enter. Up to 4 pads plus keyboard and mouse.
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { place } from '../art/props.js';
import { PRESET_LOOKS } from '../data/classmates.js';
import { SEAT_COLORS, SEAT_PALETTE } from '../core/net.js';
import { say, sayCentered } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { heading } from '../ui/widgets.js';
import { BaseScene, laneCamera } from './base.js';
import { box, plazaSet } from './sets.js';

const MATS = [-3, -1, 1, 3];

export class JoinScene extends BaseScene {
  name = 'join';
  id = 'join';
  allowsAttract = true;
  canPause = false;
  seats = [null, null, null, null];
  bots = true;
  prevPads = [];
  avatars = [];

  cameraConfig() { return laneCamera(4); }

  async build(ctx) {
    plazaSet(ctx, 11);
    box(ctx, 14, 0.14, 4, [0, -0.05, 0.8], 'white', { cast: false });
    for (let i = 0; i < 4; i++) {
      place(ctx, 'yoga-mat', { at: [MATS[i], 0, 0.8], palette: { mat: SEAT_PALETTE[i] }, shadow: false });
      const a = await makeAvatar(ctx, PRESET_LOOKS[i], { at: [MATS[i], 0.05, 0.8], clip: 'Idle' });
      a.root.visible = false;
      if (a.shadow) a.shadow.visible = false;
      this.avatars.push(a);
    }
    App.music('title');
  }

  /** The pads, read by index: the engine merges them into one. */
  pads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
    return [...navigator.getGamepads()];
  }

  seatOf(kind, index = 0) { return this.seats.findIndex((s) => s && s.kind === kind && (kind !== 'pad' || s.index === index)); }

  claim(device) {
    const free = this.seats.findIndex((s) => !s);
    if (free < 0) return;
    this.seats[free] = device;
    const a = this.avatars[free];
    a.root.visible = true;
    if (a.shadow) a.shadow.visible = true;
    a.play('Wave', { once: true, fade: 0.1, then: () => a.play('Idle', { fade: 0.2 }) });
    a.squash.kick(1);
    App.sfx('menuConfirm', { pitch: free * 2 });
    this.idle = 0;
  }

  drop(i) {
    this.seats[i] = null;
    const a = this.avatars[i];
    a.root.visible = false;
    if (a.shadow) a.shadow.visible = false;
    App.sfx('menuBack');
  }

  begin() {
    const list = [];
    this.seats.forEach((s, i) => {
      if (s) list.push({ ...s, name: `Player ${i + 1}`, look: PRESET_LOOKS[i] });
      else if (this.bots) list.push({ kind: 'bot', skill: ['good', 'sloppy', 'expert', 'average'][i], look: undefined });
    });
    App.sfx('countGo');
    App.go('medley', { family: list });
  }

  onInput(ctx) {
    const { input } = ctx;
    const joined = this.seats.filter(Boolean).length;
    // Keyboard and mouse claim one mat between them.
    if (input.wasPressed('Enter')) {
      const k = this.seatOf('keyboard');
      if (k < 0) this.claim({ kind: 'keyboard' });
      else this.begin();
      return;
    }
    if (input.wasPressed('Escape', 'Backspace')) {
      const k = this.seatOf('keyboard');
      if (k >= 0) this.drop(k);
      else App.go('title', { menu: 'main' });
      return;
    }
    if (input.wasPressed('KeyT') || input.wasPressed('KeyB')) { this.bots = !this.bots; App.sfx('menuMove'); }
    if (input.wasPressed('MouseLeft')) {
      const p = App.device.pointerArt(ctx);
      const r = this.startRect;
      if (r && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h && joined) this.begin();
      else if (this.seatOf('keyboard') < 0) this.claim({ kind: 'keyboard' });
    }
    if (input.wasPressed('MouseRight')) {
      const k = this.seatOf('keyboard');
      if (k >= 0) this.drop(k); else App.go('title', { menu: 'main' });
      return;
    }
    // Each pad, by its own index.
    const pads = this.pads();
    pads.forEach((pad, i) => {
      if (!pad) return;
      const was = this.prevPads[i] ?? {};
      const is = { cross: !!pad.buttons[0]?.pressed, circle: !!pad.buttons[1]?.pressed, square: !!pad.buttons[2]?.pressed, options: !!pad.buttons[9]?.pressed, create: !!pad.buttons[8]?.pressed };
      const seat = this.seatOf('pad', i);
      if (is.cross && !was.cross) { if (seat < 0) this.claim({ kind: 'pad', index: i }); else if (this.seats.filter(Boolean).length) this.begin(); }
      if (is.circle && !was.circle) { if (seat >= 0) this.drop(seat); else App.go('title', { menu: 'main' }); }
      if (is.square && !was.square) { this.bots = !this.bots; App.sfx('menuMove'); }
      if (is.options && !was.options && !is.create && this.seats.filter(Boolean).length) this.begin();
      this.prevPads[i] = is;
    });
  }

  onUpdate(ctx, dt) {
    for (const a of this.avatars) a.update(dt);
  }

  onDraw(ctx) {
    const { hud } = ctx;
    heading(hud, 'Family Hour');
    const cx = Math.round(hud.width / 2);
    sayCentered(hud, cx, 36, 'Press your confirm button to take a mat.', { color: 'white', name: 'join-help' });
    const cell = Math.min(Math.floor((hud.width - 28) / 4) - 2, 100);
    const total = 4 * (cell + 2) - 2;
    let x = Math.round((hud.width - total) / 2);
    const y = 50;
    this.seats.forEach((s, i) => {
      hud.rect(x, y, cell, 26, s ? SEAT_COLORS[i] : 'navy');
      say(hud, x + 3, y + 3, `Mat ${i + 1}`, { color: 'white', shadow: false, name: 'seat' });
      const who = s ? (s.kind === 'pad' ? `Pad ${s.index + 1}` : 'Keys+mouse') : this.bots ? 'Bot' : 'Empty';
      say(hud, x + 3, y + 14, who.slice(0, Math.floor((cell - 4) / 6)), { color: s ? 'white' : 'mist', shadow: false, name: 'seat-who' });
      x += cell + 2;
    });
    const joined = this.seats.filter(Boolean).length;
    if (joined) {
      const w = 110;
      this.startRect = { x: cx - Math.round(w / 2), y: y + 30, w, h: 16 };
      hud.rect(this.startRect.x, this.startRect.y, w, 16, 'cyan');
      sayCentered(hud, cx, y + 34, 'Start the Medley', { color: 'ink', shadow: false, name: 'join-start' });
    } else this.startRect = null;
    const list = joined ? [['confirm', 'Start'], ['sit', this.bots ? 'Bots: on' : 'Bots: off'], ['back', 'Leave']] : [['confirm', 'Join'], ['sit', this.bots ? 'Bots: on' : 'Bots: off'], ['back', 'Back']];
    promptBar(hud, App.device, list);
  }

  fingerprint() { return `${this.seats.map((s) => (s ? s.kind : '-')).join()}|${this.bots}`; }
  status() { return `join | seats ${this.seats.map((s) => (s ? s.kind : '-')).join(',')} | bots ${this.bots}`; }
}
