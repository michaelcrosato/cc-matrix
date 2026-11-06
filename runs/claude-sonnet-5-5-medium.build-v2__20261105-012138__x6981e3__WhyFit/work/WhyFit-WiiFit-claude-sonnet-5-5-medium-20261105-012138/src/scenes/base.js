// BaseScene owns the frame order: update -> device -> nav -> overlays/dialogue take input first -> the scene -> hud.clear -> draw -> overlays draw.
import { say, wrap, widthOf } from '../ui/font.js';
import { panel, layoutLog, fitsScreen } from '../ui/widgets.js';
import { drawOunce } from '../art/portraits.js';
import { SPEAKER_NAMES } from '../ui/dialogue.js';
import { registerSfx } from '../audio/sfx.js';
import { THREE } from '../../pixel-engine.js';

export class BaseScene {
  static id = 'base';
  static camera = { preset: 'fixed', position: [0, 3, 9], target: [0, 1, 0], fov: 30 };
  constructor(app, args = {}) {
    this.app = app; this.args = args; this.stack = []; this.t = 0; this.phase = 'init';
    this.attractOK = false; this.barks = []; this.name = this.constructor.id; this.camera = null; this.frames = 0;
    this._target = new THREE.Vector3(0, 1, 0);
  }
  get id() { return this.constructor.id; }
  async setup(ctx) {
    this.ctx = ctx; const app = this.app; app.scene = this; app.ctx = ctx; if (!app.engine) app.attach(ctx.engine); app.engine = ctx.engine;
    registerSfx(ctx.audio);
    app.portrait = (hud, x, y, s) => drawOunce(hud, x, y, s, app.moodNow, this.t);
    app.mood = (who, mood) => { if (who === 'ounce') app.moodNow = mood ?? 'neutral'; };
    await this.build(ctx);
  }
  build() {}
  ready() { globalThis.__GAME__ = this.app; }
  cameraTarget() { return this._target; }
  fixedUpdate(ctx, dt) { if (this.stack.some((o) => o.blocks) || this.app.dialogue.active && this.dialogueBlocks) return; this.fixed(ctx, dt); }
  fixed() {}
  /** A short non-blocking remark (a bark). */
  bark(who, text, secs = 3.2) {
    if (this.barks.some((b) => b.text === text)) return;
    const b = { who, text, t: 0, secs: secs + text.length * 0.02 };
    this.barks.push(b); if (this.barks.length > 2) this.barks.shift();
    this.app.speak(who, text);
    if (who === 'ounce') this.app.moodNow = 'neutral';
  }
  push(o) { o.scene = this; o.t = 0; this.stack.push(o); if (o.pauses) { this.savedScale = this.ctx.engine.timeScale || 1; this.ctx.engine.timeScale = 0; } return o; }
  pop() {
    const o = this.stack.pop();
    if (o?.pauses && !this.stack.some((x) => x.pauses)) this.ctx.engine.timeScale = this.savedScale ?? 1;
    o?.onClose?.(); return o;
  }
  popTo(n = 0) { while (this.stack.length > n) this.pop(); }
  update(ctx, dt) {
    const app = this.app, hud = ctx.hud;
    const udt = dt > 0 ? dt : 1 / 60;
    this.frames++; this.t += udt; app.frame++;
    app.device.update(ctx, udt); app.nav.update(ctx, udt);
    app.clock.tick(dt);
    const nav = app.nav;
    if (app.session?.ended) { hud.clear(); return; }
    // attract: any input exits; the real scenes keep running
    if (app.attract && (app.attract.exit || (app.device.anyInput === app.device.frame && !(app.attract.grace > 0)))) { app.stopAttract(); return; }
    if (app.attract?.grace > 0) app.attract.grace -= udt;
    if (app.attract) { app.attract.t = (app.attract.t ?? 0) + udt; if (app.attract.t > (this.attractSecs ?? 14) && !app.busy && !this.attractLeaving) { this.attractLeaving = true; app.attractNext(); return; } }
    // idle -> attract
    if (this.attractOK && !app.session && !app.busy && !app.attract && app.device.idle >= 10 && !this.stack.some((o) => !o.attractOK)) { app.startAttract(); return; }
    const top = this.stack[this.stack.length - 1];
    const dlg = app.dialogue.active;
    if (top) top.update(nav, udt);
    else if (dlg) app.dialogue.update(nav, udt);
    for (const b of this.barks) b.t += udt;
    this.barks = this.barks.filter((b) => b.t < b.secs);
    layoutLog.clear();
    hud.clear();
    this.tick(ctx, udt, !!top || dlg);
    if (!this.stack.some((o) => o.cover)) this.draw(hud, ctx);
    const cov = this.stack.map((o) => !!o.cover).lastIndexOf(true);
    for (const o of this.stack.slice(Math.max(0, cov))) o.draw(hud);
    this.drawBarks(hud);
    if (app.devOverlay) this.drawDevOverlay(hud);
    this.pauseIcon(hud, nav);
    if (dlg) app.dialogue.draw(hud);
    if (app.attract) this.drawAttractBanner(hud);
    this.after?.(ctx, udt);
  }
  tick() {}
  draw() {}
  /** The pause icon, top right, shown while the mouse moves; a click opens the pause menu. */
  pauseIcon(hud, nav) {
    const app = this.app; if (!this.openPause || app.session || app.attract || this.stack.length || app.dialogue.active || app.device.mouseMoved <= 0 || app.device.last !== 'mouse' || this.phase === 'results') return;
    const r = { x: hud.width - 28, y: 8, w: 18, h: 18 };
    hud.rect(r.x, r.y, r.w, r.h, 'night'); hud.rect(r.x + 5, r.y + 4, 3, 10, 'white'); hud.rect(r.x + 11, r.y + 4, 3, 10, 'white');
    layoutLog.add('pause-icon', r.x, r.y, r.w, r.h);
    if (nav.click && nav.px >= r.x && nav.px < r.x + r.w && nav.py >= r.y && nav.py < r.y + r.h) { this.openPause(); }
  }
  drawDevOverlay(hud) {
    const app = this.app, e = app.engine, s = this.dotInfo?.() ?? '';
    const lines = [`scene ${this.name} ${this.phase}`, `${this.status?.() ?? ''}`.slice(0, 60), `fps ${Math.round(e.fps)}  device ${app.device.last}`, s];
    hud.rect(4, hud.height - 70, 210, 10 * lines.length + 6, 'night');
    lines.forEach((l, i) => say(hud, 8, hud.height - 66 + i * 10, l, { color: 'lime', shadow: false }));
  }
  drawBarks(hud) {
    let y = hud.height - 54;
    for (const b of [...this.barks].reverse()) {
      const lines = wrap(b.text, 230, 1), h = lines.length * 10 + 8, w = Math.max(...lines.map((l) => widthOf(l))) + 14 + (b.who === 'ounce' ? 28 : 0);
      const x = Math.floor((hud.width - w) / 2);
      const a = Math.min(1, b.t * 6, (b.secs - b.t) * 3);
      if (a < 0.3) continue;
      panel(hud, x, y - h, w, h, { fill: 'white', edge: 'mist', shadow: false });
      let tx = x + 7;
      if (b.who === 'ounce') { drawOunce(hud, x + 4, y - h + Math.floor((h - 20) / 2), 20, this.app.moodNow, this.t); tx = x + 28; }
      lines.forEach((l, i) => say(hud, tx, y - h + 5 + i * 10, l, { color: 'ink', shadow: false }));
      y -= h + 4;
    }
  }
  drawAttractBanner(hud) {
    const a = this.app.attract;
    hud.rect(0, 0, hud.width, 40, 'night');
    say(hud, hud.width / 2, 6, this.app.title ?? 'Why Fit', { anchor: 'c', scale: 2, color: 'white', shadow: 'navy' });
    say(hud, hud.width / 2, 26, 'Press any button.', { anchor: 'c', color: 'sand' });
    const line = a.line ?? 'This is a recording. The person in it is doing better than you.';
    hud.rect(0, hud.height - 30, hud.width, 30, 'night');
    const lines = wrap(line, hud.width - 30, 1);
    lines.slice(0, 2).forEach((l, i) => say(hud, hud.width / 2, hud.height - 25 + i * 10, l, { anchor: 'c', color: 'white' }));
  }
  layoutOk() { return layoutLog.rects.every((r) => fitsScreen(this.ctx.hud, r, 0)); }
  status() { return `${this.name} | ${this.phase} | t ${this.t.toFixed(1)}`; }
  fingerprint() { return `${this.name}:${this.phase}:${Math.round(this.t * 10)}`; }
  dispose() { for (const o of this.stack) o.onClose?.(); this.stack.length = 0; }
}
