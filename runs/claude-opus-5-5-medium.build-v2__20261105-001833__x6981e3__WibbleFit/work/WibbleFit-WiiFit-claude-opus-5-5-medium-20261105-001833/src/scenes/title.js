// Title and the Main Menu. Idle 10 seconds here and the recording starts.
import { ACTIVITIES } from '../data/activities.js';
import { applySky, skyAt } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { buildPlaza } from '../art/island.js';
import { place } from '../art/stage.js';
import { hardOpen, shownAge } from '../core/progress.js';
import { newSlot } from '../core/save.js';
import { AVATARS } from '../data/classmates.js';
import { BARKS } from '../data/lines.js';
import { TAGLINE, TITLE } from '../data/title.js';
import { center, plateCenter, say, textWidth, wrap } from '../ui/font.js';
import { Menu } from '../ui/menu.js';
import { promptBar } from '../ui/prompts.js';
import { AboutScreen } from '../ui/screens/about.js';
import { HowToScreen } from '../ui/screens/howto.js';
import { SettingsScreen } from '../ui/screens/settings.js';
import { note, panel, stars } from '../ui/widgets.js';
import { BaseScene } from './base.js';

const LETTERS = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ-', 'abcdefghi', 'jklmnopqr', 'stuvwxyz.', '0123456789'.slice(0, 9)];
class NameEntry {
  id = 'name'; name = ''; r = 0; c = 0; attractable = true; t = 0; rects = [];
  constructor(onDone, onBack) { this.onDone = onDone; this.onBack = onBack; this.onKey = (e) => this.key(e); if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKey); App.say('What shall I put on the form?', 'ounce'); }
  key(e) {
    if (App.top() !== this) return;
    if (e.key === 'Backspace') { this.name = this.name.slice(0, -1); e.preventDefault(); this.typed = true; }
    else if (e.key.length === 1 && /[A-Za-z0-9.\- ]/.test(e.key) && this.name.length < 8) { if (e.key !== ' ' || this.name.length) this.name += e.key; this.typed = true; }
  }
  close() { if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKey); App.close(this); }
  update(ctx, dt) {
    const i = ctx.input, n = this.nav ??= new (App.scenes.Nav)(); const m = n.read(ctx, dt);
    const typing = this.typed; this.typed = false;
    if (typing) return;
    if (m.up) { this.r = (this.r + LETTERS.length) % (LETTERS.length + 1); App.sfx('menuMove'); }
    if (m.up) this.r = (this.r + LETTERS.length) % (LETTERS.length + 1);
    if (m.down) { this.r = (this.r + 1) % (LETTERS.length + 1); App.sfx('menuMove'); }
    if (m.left && this.r < LETTERS.length) { this.c = (this.c + 8) % 9; App.sfx('menuMove'); }
    if (m.right && this.r < LETTERS.length) { this.c = (this.c + 1) % 9; App.sfx('menuMove'); }
    // Mouse
    const px = ((i.pointer.x + 1) / 2) * ctx.hud.width, py = ((1 - i.pointer.y) / 2) * ctx.hud.height;
    const hit = this.rects.find((q) => px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + q.h);
    if (hit && App.device.last === 'mouse' && App.device.moved > 0) { this.r = hit.r; this.c = hit.c ?? this.c; }
    const click = hit && i.wasPressed('MouseLeft');
    if (i.wasPressed('PadCross', 'Enter') || click) {
      if (this.r === LETTERS.length) { if (this.c <= 4 || click && hit.ok) this.finish(); return; }
      const ch = LETTERS[this.r][this.c]; if (this.name.length < 8) { this.name += ch; App.sfx('menuMove'); }
    }
    if (i.wasPressed('PadSquare', 'PadCircle') && this.name) this.name = this.name.slice(0, -1);
    if (i.wasPressed('PadTriangle') || (i.wasPressed('Tab'))) { this.finish(); return; }
    if (i.wasPressed('Escape') || (i.wasPressed('PadCircle') && !this.name) || i.wasPressed('MouseRight')) { this.close(); this.onBack?.(); }
  }
  finish() { this.close(); this.onDone(this.name.trim() || 'Guest'); }
  draw(hud) {
    const cell = 18, w = 9 * cell + 24, h = LETTERS.length * cell + 72, x = Math.round((hud.width - w) / 2), y = Math.max(8, Math.round((hud.height - 16 - h) / 2));
    panel(hud, x, y, w, h, 'white', 'teal');
    say(hud, x + 10, y + 6, 'Your name', { color: 'teal', shadow: false });
    hud.rect(x + 10, y + 18, w - 20, 16, 'night'); say(hud, x + 14, y + 19, this.name + (Math.floor(App.frames / 30) % 2 ? '_' : ' '), { color: 'white', shadow: false, scale: 2 });
    this.rects = [];
    LETTERS.forEach((row, j) => [...row].forEach((ch, k) => {
      const cx = x + 12 + k * cell, cy = y + 40 + j * cell, on = this.r === j && this.c === k;
      if (on) hud.rect(cx - 2, cy - 2, 14, 16, 'teal');
      say(hud, cx, cy, ch, { color: on ? 'white' : 'ink', shadow: false, scale: 2 }); this.rects.push({ x: cx - 3, y: cy - 3, w: cell, h: cell, r: j, c: k });
    }));
    const oy = y + 40 + LETTERS.length * cell, on = this.r === LETTERS.length;
    if (on) hud.rect(x + 10, oy - 2, w - 20, 16, 'teal');
    center(hud, oy, 'That\'s me', { color: on ? 'white' : 'ink', shadow: false, scale: 2 });
    this.rects.push({ x: x + 10, y: oy - 2, w: w - 20, h: 16, r: LETTERS.length, ok: true });
    note(x, y, w, h, 'name');
    promptBar(hud, [['confirm', 'Letter'], ['alt', 'Delete'], ['more', 'Done']]);
  }
}
class AvatarPick {
  id = 'avatar'; i = 0; attractable = true;
  constructor(scene, onPick, onBack) {
    this.scene = scene;
    this.menu = new Menu({ title: 'Who is this?', items: AVATARS.map((a, i) => ({ label: `Guest ${i + 1}`, on: () => { App.close(this); onPick(i); } })), onBack: () => { App.close(this); onBack?.(); }, scale: 1, rowH: 15, w: 140 });
    App.say('Please choose a body. They are all fine.', 'ounce');
  }
  update(ctx, dt) { this.menu.update(ctx, dt); this.scene.previewLook(this.menu.index); }
  draw(hud) { this.menu.x = 16; this.menu.draw(hud); promptBar(hud, [['confirm', 'Choose'], ['back', 'Back']]); }
}
export class TitleScene extends BaseScene {
  id = 'title'; attractable = true; t = 0; pressed = false; previewI = -1;
  camera() { return { preset: 'fixed', position: [0, 2.2, 10], target: [0, 1.6, 0], fov: 30 }; }
  async build(ctx) {
    this.ctx = ctx;
    this.world = await buildPlaza(ctx);
    applySky(ctx.engine, skyAt(10));
    App.music('plaza');
    this.ounce = place(ctx, 'ounce', 1.5, 0, 2, { actors: true, scale: 1.6 }); this.ounce.object.rotation.y = -0.25;
    this.needle = this.ounce.object.getObjectByName('needle');
    this.av = await makeAvatar(ctx, AVATARS[0]); this.av.setAt(-1.4, 0, 2, 0.3); this.av.play('Tree');
    this.kevin = place(ctx, 'kevin', -3.6, 0, -0.6, { actors: true });
    App.dialCenter = { x: 240, y: 56 };
    App.slotIndex = this.args.keepSlot ? App.slotIndex : null;
    if (this.args.page === 'dropin') { this.pressed = true; this.openMain(); this.openDropIn(); }
    else if (this.args.page === 'main') { this.pressed = true; this.openMain(); }
    this.hopT = 0;
  }
  async previewLook(i) {
    if (i === this.previewI || this.previewBusy) return;
    this.previewBusy = true; this.previewI = i;
    const a = await makeAvatar(this.ctx, AVATARS[i]); a.setAt(0.6, 0, 2, 0); a.play('Wave');
    if (this.av) { this.av.root.visible = false; this.av.shadow.visible = false; }
    this.av = a; this.previewBusy = false;
  }
  openMain() { App.open(new MainMenu(this)); }
  openDropIn() { App.open(new DropInMenu()); }
  frame(ctx, dt, rdt, free) {
    this.t += rdt; this.av.update(dt); this.world.update(ctx, dt);
    if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(ctx.time * 1.3) * 0.4;
    this.hopT += dt; this.ounce.object.position.y = Math.abs(Math.sin(this.hopT * 1.8)) * 0.14;
    if (free && !this.pressed && this.t > 0.3 && !App.attract) {
      if (App.touchOnly) return;
      if (this.anyPress(ctx)) { this.pressed = true; App.sfx('menuConfirm'); this.openMain(); }
    } else if (free && this.pressed) this.pressed = false;
  }
  anyPress(ctx) {
    const i = ctx.input, h = i.state?.().held ?? [];
    return (i.queuedPresses?.length > 0 || h.length > 0) && !h.includes('Touch') && !i.queuedPresses?.includes('Touch');
  }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    const sc = W < 300 ? 2 : W > 460 ? 5 : 4;
    const y = W < 300 ? 26 : 20;
    if (!App.top()) {
      const tw = textWidth(TITLE, sc);
      say(hud, (W - tw) / 2 + 2, y + 2, TITLE, { scale: sc, color: 'navy', shadow: false });
      say(hud, (W - tw) / 2, y, TITLE, { scale: sc, color: 'white', shadow: false });
      note((W - tw) / 2, y, tw, 7 * sc, 'title');
      center(hud, y + 7 * sc + 8, TAGLINE, { color: 'navy', shadow: false });
      if (App.touchOnly) {
        const cols = Math.max(14, Math.floor((W - 24) / 6)), ls = wrap('Controller or keyboard required', cols);
        ls.forEach((l, i) => plateCenter(hud, H - 30 - (ls.length - i) * 10, l, { color: 'sand' }));
        note(12, H - 30 - ls.length * 10, W - 24, ls.length * 10, 'touch-message');
        App.lastTouchMsg = true;
      } else if (Math.floor(this.t * 1.6) % 3 !== 2) plateCenter(hud, H - 34, BARKS.title[0], { scale: W > 460 ? 2 : 1, color: 'white' });
    }
  }
  status() { return `title | ${App.top()?.id ?? 'press'}`; }
}
class MainMenu {
  id = 'main'; attractable = true;
  constructor(scene) {
    this.scene = scene;
    this.menu = new Menu({ title: TITLE, items: [
      { label: 'The Week', on: () => App.open(new SlotMenu(scene)) },
      { label: 'Drop-In Class', on: () => scene.openDropIn() },
      { label: 'Family Hour', on: () => App.go('join') },
      { label: 'How to play', on: () => App.open(new HowToScreen()) },
      { label: 'Settings', on: () => App.open(new SettingsScreen()) },
      { label: 'About & Credits', on: () => App.open(new AboutScreen()) },
    ], onBack: () => { App.close(this); scene.pressed = false; }, scale: 2 });
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(hud) { this.menu.draw(hud); promptBar(hud, [['confirm', 'Select'], ['back', 'Back']]); }
}
class SlotMenu {
  id = 'slots'; attractable = true;
  constructor(scene) { this.scene = scene; this.rebuild(); }
  rebuild() {
    const slots = App.save.data.slots;
    const items = slots.map((s, i) => s ? {
      label: `${s.name}`, value: () => (s.week > 1 ? `Week ${s.week}` : `Day ${s.day}`), on: () => this.load(i),
    } : { label: `Guest ${i + 1}: empty`, on: () => this.start(i) });
    items.push({ label: 'Erase a guest', value: () => (this.erase === undefined ? '' : `Guest ${this.erase + 1}`), adjust: (d) => { this.erase = ((this.erase ?? -1) + d + 3) % 3; }, on: () => { if (this.erase === undefined) { this.erase = 0; return; } if (slots[this.erase]) { slots[this.erase] = null; App.writeSave(); App.sfx('wobble'); } this.erase = undefined; this.rebuild(); } });
    items.push({ label: 'Back', on: () => App.close(this) });
    this.menu = new Menu({ title: 'The Week', subtitle: 'Three guests. I keep their files.', items, onBack: () => App.close(this), scale: 2 });
  }
  load(i) {
    App.slotIndex = i; const s = App.slot;
    if (s.phase === 'ferry') App.go('ferry');
    else if (s.phase === 'weighin') App.go('weighin');
    else App.go('hub');
  }
  start(i) {
    App.open(new NameEntry((name) => {
      App.open(new AvatarPick(this.scene, (av) => {
        App.save.data.slots[i] = newSlot(name, { ...AVATARS[av], equipped: [] }, av);
        App.slotIndex = i; App.writeSave();
        App.go('ferry');
      }));
    }));
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(hud) { this.menu.draw(hud); promptBar(hud, [['confirm', 'Select'], ['back', 'Back']]); void panel; void shownAge; }
}
class DropInMenu {
  id = 'dropin'; attractable = true; hard = false;
  constructor() {
    const rec = App.save.data.dropIn;
    const items = ACTIVITIES.map((a) => ({ label: a.name, on: () => { App.slotIndex = null; App.go('activity', { id: a.id, mode: 'dropin', hard: this.hard }); }, value: () => (rec[a.id] ? String(Math.round(rec[a.id].best)) : ''), draw: (hud, x, ry, w) => { if (rec[a.id]) stars(hud, x + w - 100, ry + 2, rec[a.id].stars, 1); } }));
    if (hardOpen(null)) items.push({ label: 'Version', value: () => (this.hard ? 'Hard' : 'Normal'), adjust: () => { this.hard = !this.hard; }, on: () => { this.hard = !this.hard; } });
    items.push({ label: 'Back', on: () => App.close(this) });
    this.menu = new Menu({ title: 'Drop-In Class', subtitle: 'Records only. No Drips. No story. Nobody is angry.', items, onBack: () => App.close(this), scale: 1, rowH: 15, maxRows: 8, w: 360 });
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(hud) { this.menu.draw(hud); promptBar(hud, [['confirm', 'Select'], ['back', 'Back']]); }
}
