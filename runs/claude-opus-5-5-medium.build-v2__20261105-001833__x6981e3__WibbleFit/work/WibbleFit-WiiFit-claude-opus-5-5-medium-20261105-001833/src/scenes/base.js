// BaseScene owns the frame order: device, overlays first, then the scene, then the HUD.
import { THREE } from '../../pixel-engine.js';
import { ACTIONS } from '../core/actions.js';
import { App } from '../app.js';
import { BARKS, NAMES } from '../data/lines.js';
import { TITLE } from '../data/title.js';
import { center, say, textWidth, wrap } from '../ui/font.js';
import { pointerArt } from '../ui/menu.js';
import { clearRects, line, note, panel } from '../ui/widgets.js';
const { Vector3 } = THREE;

export class BaseScene {
  id = 'scene'; attractable = false; canPause = false; args = {};
  target = new Vector3(0, 1, 0);
  constructor(args = {}) { this.args = args; this.name = `wibble:${this.constructor.name}`; }
  get attract() { return !!this.args.attract; }
  async setup(ctx) {
    if (!App.engine) App.init(ctx.engine, App.boot ?? {});
    App.ctx = ctx; App.scene = this;
    this.rng = ctx.random.fork('scene');
    this.cosmetic = ctx.random.fork('cosmetic');
    await this.build?.(ctx);
  }
  ready(ctx) { this.started?.(ctx); }
  fixedUpdate(ctx, dt) { this.tick?.(ctx, dt); }
  update(ctx, dt) {
    const rdt = App.frame(ctx, dt);
    const top = App.top();
    if (top) top.update(ctx, rdt);
    else if (this.canPause && !App.session && !App.attract) {
      if (ctx.input.wasPressed(...ACTIONS.pause) && !ctx.input.isDown('PadCreate')) App.openPause();
      else if (App.device.last === 'mouse' && ctx.input.wasPressed('MouseLeft')) { const m = pointerArt(ctx); if (m.x > ctx.hud.width - 22 && m.y < 22) App.openPause(); }
    } else if (this.canPause && App.session && !App.attract) {
      if (ctx.input.wasPressed('PadOptions', 'Escape', 'KeyP') && !ctx.input.isDown('PadCreate')) App.openPause();
    }
    // The press that closed an overlay must not also act on the scene.
    this.frame?.(ctx, dt, rdt, !top && !App.top());
    const hud = ctx.hud;
    hud.clear(); clearRects();
    if (!App.hudHidden) {
      this.draw?.(ctx, hud);
      if (App.bark && !App.top()) this.drawBark(hud);
      if (this.canPause && App.device.last === 'mouse' && !App.attract && !App.top()) { const x = hud.width - 18; hud.rect(x, 6, 12, 12, 'ink'); hud.rect(x + 3, 8, 2, 8, 'white'); hud.rect(x + 7, 8, 2, 8, 'white'); }
      for (const o of App.overlays) o.draw?.(hud, ctx);
      if (App.attract) this.drawAttract(hud);
      if (App.overlayDebug) this.drawDebug(ctx, hud);
    }
  }
  drawBark(hud) {
    const b = App.bark, lines = wrap(b.text, Math.min(52, Math.floor((hud.width - 40) / 6)));
    const w = Math.max(...lines.map((l) => textWidth(l))) + 16, name = NAMES[b.who] ?? '';
    const x = Math.round((hud.width - Math.max(w, textWidth(name) + 16)) / 2), y = this.barkY?.(hud) ?? hud.height - 46 - lines.length * 10;
    panel(hud, x, y, Math.max(w, textWidth(name) + 16), 16 + lines.length * 10, 'white', 'teal');
    say(hud, x + 8, y + 4, name, { color: 'teal', shadow: false });
    lines.forEach((l, i) => say(hud, x + 8, y + 14 + i * 10, l, { color: 'ink', shadow: false }));
  }
  drawAttract(hud) {
    hud.rect(0, 0, hud.width, 14, 'ink');
    say(hud, 12, 3, TITLE, { color: 'cyan' });
    const p = 'Press any button.'; say(hud, hud.width - 12 - textWidth(p), 3, p, { color: 'sand' });
    const line = BARKS.attract[App.attractLine];
    const ls = wrap(line, Math.floor((hud.width - 24) / 6));
    hud.rect(0, hud.height - 8 - ls.length * 10, hud.width, ls.length * 10 + 8, 'ink');
    ls.forEach((l, i) => center(hud, hud.height - 4 - (ls.length - i) * 10 + 1, l, { color: 'white' }));
    note(0, 0, hud.width, 14, 'attract');
  }
  drawDebug(ctx, hud) {
    const s = [`scene ${this.id}`, this.status?.(ctx) ?? '', `dev ${App.device.last} fps ${Math.round(App.engine.fps)}`, `dot ${this.debugDot?.() ?? '-'}`];
    hud.rect(0, 16, Math.min(hud.width, 280), s.length * 9 + 4, 'ink');
    s.forEach((t, i) => say(hud, 4, 18 + i * 9, String(t).slice(0, 44), { color: 'lime', shadow: false }));
  }
  cameraTarget() { return this.target; }
  status() { return this.id; }
  fingerprint() { return this.id; }
}
