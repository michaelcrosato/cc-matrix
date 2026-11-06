// BaseScene owns the frame order: update -> device -> overlays take input first -> scene ->
// hud.clear() -> scene draw -> overlays draw. Gameplay goes in onFixed, skipped while timeScale is 0.
import { THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { Bark } from '../ui/dialogue.js';
import { layout } from '../ui/layout.js';
import { say } from '../ui/font.js';
import { drawGlyph } from '../art/glyphs.js';
import { PAUSE_KEYS } from '../core/actions.js';

const { Vector3 } = THREE;

export class BaseScene {
  name = 'Scene';
  id = 'scene';
  canPause = false;       // Esc / Options opens the pause menu
  allowsAttract = false;  // the title and its menus
  idle = 0;
  focus = new Vector3();
  args = {};
  t = 0;

  constructor(args = {}) { this.args = args; }

  cameraConfig() { return undefined; }

  async setup(ctx) {
    this.ctx = ctx;
    App.ensureInit(ctx.engine);
    App.attach(ctx, this);
    this.bark = new Bark();
    App.bark = this.bark;
    await this.build(ctx);
  }

  async build() {}
  ready() { App.onSceneReady?.(this); }

  get paused() { return App.stack.open && App.stack.screens.some((s) => s.freezes); }
  /** True when something else has the input. */
  get blocked() { return App.loading || App.stack.open; }

  fixedUpdate(ctx, dt) { this.onFixed(ctx, dt); }
  onFixed() {}

  update(ctx, dt) {
    App.frame++;
    const uiDt = dt || 1 / 60;
    App.uiT += uiDt;
    this.t += dt;
    layout.begin();
    App.device.update(ctx);
    this.bark.tick(dt);
    if (App.attract) App.attract.tick(ctx, uiDt);

    if (this.allowsAttract && !App.session && !App.attract) {
      if (App.device.anyInput || App.loading) this.idle = 0;
      else this.idle += uiDt;
      if (this.idle >= 10) { this.idle = 0; App.startAttract?.(); }
    }

    const hadOverlay = App.stack.open;
    if (!App.loading && !App.attract) App.stack.update(ctx, dt);
    if (!App.stack.open && !hadOverlay && !App.loading && !App.attract) {
      if (this.canPause && this.pausePressed(ctx)) App.openPause?.();
      else this.onInput(ctx, dt);
    }
    this.onUpdate(ctx, dt);
    ctx.hud.clear();
    if (!App.dev.hideHud) this.onDraw(ctx, dt);
    App.stack.draw(ctx, dt);
    if (!App.dev.hideHud) {
      if (!App.stack.open) this.bark.draw(ctx.hud, this.barkBottom());
      this.drawPauseIcon(ctx);
    }
    if (App.attract) App.attract.draw(ctx);
    if (App.dev.overlay) this.drawOverlay(ctx);
    this.applyDim(ctx);
  }

  /** Menus dim the world through the engine's transition uniform, never while a real transition runs. */
  applyDim(ctx) {
    const want = App.wantDim && !App.loading;
    App.wantDim = false;
    if (want !== !!App.dimmed) {
      App.dimmed = want;
      if (!App.loading) ctx.engine.screen.set(want ? 'fade' : null, want ? 0.55 : 0);
    }
  }

  pausePressed(ctx) {
    const { input } = ctx;
    if (input.wasPressed(...PAUSE_KEYS)) return true;
    if (input.wasPressed('PadOptions') && !input.isDown('PadCreate')) return true;
    if (this.pauseIconHit && input.wasPressed('MouseLeft')) {
      const p = App.device.pointerArt(ctx);
      const r = this.pauseIconHit;
      if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return true;
    }
    return false;
  }

  /** Top right, while the mouse moves. */
  drawPauseIcon(ctx) {
    if (!this.canPause || App.stack.open || App.attract || App.session) { this.pauseIconHit = null; return; }
    if (App.device.moved > 0) this.iconT = 2.5;
    this.iconT = Math.max(0, (this.iconT ?? 0) - (1 / 60));
    if (this.iconT <= 0 || App.device.last !== 'mouse') { this.pauseIconHit = null; return; }
    const x = ctx.hud.width - 12 - 11;
    const y = 12;
    drawGlyph(ctx.hud, x, y, 'pauseIcon');
    this.pauseIconHit = { x: x - 3, y: y - 3, w: 17, h: 17 };
  }

  /** How far up a bark sits: above any prompts along the bottom. */
  barkBottom() { return 12; }

  onInput() {}
  onUpdate() {}
  onDraw() {}

  /** Dev overlay: scene, state, Dot, ring, fps, last device. */
  drawOverlay(ctx) {
    const { hud } = ctx;
    const rows = [
      `scene ${this.id}`,
      `${String(this.status(ctx)).slice(0, 44)}`,
      `dot ${this.overlayDot?.() ?? '-'}`,
      `fps ${Math.round(ctx.engine.fps)}  device ${App.device.last}`,
      `t ${ctx.time.toFixed(1)}  scale ${ctx.engine.timeScale}`,
    ];
    hud.rect(0, 40, 200, rows.length * 10 + 4, 'ink');
    rows.forEach((r, i) => say(hud, 3, 42 + i * 10, r, { color: 'lime', shadow: false, name: 'overlay' }));
  }

  cameraTarget() { return this.focus; }
  status() { return this.id; }
  fingerprint() { return ''; }
}

/** A fixed lane camera, pushed back on narrow windows so outer mats don't clip. */
export function aspectDistance() {
  const a = typeof window !== 'undefined' && window.innerHeight ? window.innerWidth / window.innerHeight : 16 / 9;
  return Math.max(1, (16 / 9) / a);
}

export function laneCamera(mats) {
  const k = aspectDistance();
  if (mats >= 4) return { preset: 'fixed', position: [0, 3 * k, 9.5 * k], target: [0, 1, 0], fov: 32 };
  return { preset: 'fixed', position: [0, 2.3 * k, 8.2 * k], target: [0, 1.15, 0], fov: 30 };
}
