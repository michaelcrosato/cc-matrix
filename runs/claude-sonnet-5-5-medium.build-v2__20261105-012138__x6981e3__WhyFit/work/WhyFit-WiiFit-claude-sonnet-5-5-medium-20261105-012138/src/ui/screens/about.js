import { aboutPages } from '../../data/about.js';
import { say, wrap, sayWrapped } from '../font.js';
import { panel, layoutLog } from '../widgets.js';
import { drawPrompts } from '../prompts.js';

export class AboutScreen {
  id = 'about'; blocks = true; cover = true; attractOK = true;
  constructor(app, onDone) { this.app = app; this.onDone = onDone; this.pages = aboutPages(app.creditsText); this.i = 0; this.scrollY = 0; }
  go(d) { this.i = (this.i + d + this.pages.length) % this.pages.length; this.scrollY = 0; this.app.sfx('move', { volume: 0.5 }); }
  update(nav) {
    if (nav.tabL || nav.left) this.go(-1);
    if (nav.tabR || nav.right) this.go(1);
    if (nav.click) { const p = this.rects; if (p) { if (nav.px < p.x + 40 && nav.py > p.y + p.h - 18) this.go(-1); else if (nav.px > p.x + p.w - 40 && nav.py > p.y + p.h - 18) this.go(1); } }
    const pg = this.pages[this.i];
    if (pg.scroll) { if (nav.down) this.scrollY += 22; if (nav.up) this.scrollY = Math.max(0, this.scrollY - 22); if (nav.wheel) this.scrollY = Math.max(0, this.scrollY + Math.sign(nav.wheel) * 22); }
    if (nav.back || nav.rclick || nav.pause) { this.app.sfx('back'); this.scene.pop(); this.onDone?.(); }
  }
  draw(hud) {
    const w = Math.min(hud.width - 40, 400), h = hud.height - 70, x = Math.floor((hud.width - w) / 2), y = 14;
    this.rects = { x, y, w, h };
    panel(hud, x, y, w, h);
    const pg = this.pages[this.i];
    say(hud, x + 10, y + 8, pg.title, { color: 'teal', shadow: false, scale: 2 });
    let yy = y + 30;
    const maxY = y + h - 22;
    if (pg.scroll) {
      const lines = wrap(pg.text, w - 24, 1);
      const per = Math.floor((maxY - yy) / 9);
      const start = Math.min(Math.max(0, lines.length - per), Math.floor(this.scrollY / 9));
      lines.slice(start, start + per).forEach((l, k) => say(hud, x + 12, yy + k * 9, l, { color: 'ink', shadow: false }));
      say(hud, x + w - 10, y + 10, `${start + 1}/${lines.length}`, { anchor: 'r', color: 'slate', shadow: false });
    } else {
      for (const b of pg.blocks) {
        if (b.h) { say(hud, x + 12, yy, b.h, { color: 'navy', shadow: false }); yy += 10; }
        yy += sayWrapped(hud, x + 12, yy, b.t, w - 24, { color: 'ink', shadow: false, lineGap: 9 }) + 5;
      }
    }
    say(hud, x + 12, y + h - 14, `< ${this.i + 1}/${this.pages.length} >`, { color: 'slate', shadow: false });
    drawPrompts(this.app, hud, [['tabs', 'Page'], ['back', 'Back']]);
  }
}
