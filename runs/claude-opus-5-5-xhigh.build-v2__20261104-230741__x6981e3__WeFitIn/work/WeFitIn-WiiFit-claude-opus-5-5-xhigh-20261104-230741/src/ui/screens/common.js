// Shared bits for full-screen menus.
import { App } from '../../app.js';
import { TAB_LEFT, TAB_RIGHT } from '../../core/actions.js';
import { promptBar } from '../prompts.js';
import { say, sayCentered, textWidth } from '../font.js';
import { heading, panel } from '../widgets.js';
import { ABOVE_PROMPTS } from '../layout.js';
import { drawGlyph, glyphWidth } from '../../art/glyphs.js';
import { promptGlyphs } from '../prompts.js';

export class MenuScreen {
  constructor(name, title, menu, { prompts = null, remark = null, dim = true } = {}) {
    this.name = name; this.title = title; this.menu = menu; this.prompts = prompts; this.remark = remark; this.dim = dim;
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(ctx) {
    const { hud } = ctx;
    if (this.dim) dim(hud);
    if (this.title) heading(hud, this.title);
    this.menu.draw(ctx);
    if (this.remark) drawRemark(ctx, typeof this.remark === 'function' ? this.remark() : this.remark);
    promptBar(hud, App.device, this.prompts ?? [['confirm', 'Select'], ['back', 'Back']]);
  }
}

/** Ask for the world to be dimmed behind this screen: the engine's fade uniform, under the HUD. */
export function dim() { App.wantDim = true; }

export function drawRemark(ctx, text) {
  const { hud } = ctx;
  const lines = wrapTo(text, Math.min(hud.width - 40, 320));
  const h = lines.length * 11 + 6;
  const y = hud.height - ABOVE_PROMPTS - h;
  const w = Math.min(hud.width - 24, 330);
  panel(hud, Math.round((hud.width - w) / 2), y, w, h, { fill: 'white', name: 'remark' });
  lines.forEach((l, i) => sayCentered(hud, hud.width / 2, y + 3 + i * 11, l, { color: 'ink', shadow: false, name: 'remark-text' }));
}

import { wrap, charsIn } from '../font.js';
export const wrapTo = (text, width, scale = 1) => wrap(text, charsIn(width, scale));

/** Tabs along the top: L1/R1, Q/E, wheel, or click. */
export class TabBar {
  rects = [];
  constructor(labels, { onChange } = {}) { this.labels = labels; this.i = 0; this.onChange = onChange; }
  get current() { return this.labels[this.i]; }
  set(i) { if (i !== this.i) { this.i = i; App.sfx('menuMove'); this.onChange?.(i); } }
  update(ctx, { wheel = true } = {}) {
    const { input } = ctx;
    const n = this.labels.length;
    if (input.wasPressed(...TAB_LEFT)) this.set((this.i - 1 + n) % n);
    if (input.wasPressed(...TAB_RIGHT)) this.set((this.i + 1) % n);
    if (wheel && input.wheel) this.set((this.i + Math.sign(input.wheel) + n) % n);
    if (input.wasPressed('MouseLeft')) {
      const p = App.device.pointerArt(ctx);
      for (const r of this.rects) if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) { this.set(r.i); break; }
    }
  }
  draw(ctx, y = 34) {
    const { hud } = ctx;
    const widths = this.labels.map((l) => textWidth(l) + 10);
    const col = App.device.promptColumn();
    const glyphL = promptGlyphs('tabs', col);
    const glyphW = glyphL.length === 2 ? glyphWidth(glyphL[0]) + glyphWidth(glyphL[1]) + 8 : 0;
    const total = widths.reduce((a, b) => a + b + 3, -3) + glyphW;
    let x = Math.round((hud.width - total) / 2);
    if (glyphL.length === 2) { drawGlyph(hud, x, y, glyphL[0]); x += glyphWidth(glyphL[0]) + 4; }
    this.rects = [];
    this.labels.forEach((l, i) => {
      const on = i === this.i;
      hud.rect(x, y, widths[i], 11, on ? 'cyan' : 'navy');
      say(hud, x + 5, y + 2, l, { color: on ? 'ink' : 'white', shadow: false, name: 'tab' });
      this.rects.push({ i, x, y, w: widths[i], h: 11 });
      x += widths[i] + 3;
    });
    if (glyphL.length === 2) drawGlyph(hud, x + 1, y, glyphL[1]);
  }
}
