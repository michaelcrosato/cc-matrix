// Paged. Source Information, Testing Feedback, Engine Feedback, Prompt Feedback, Credits.
import { ABOUT_PAGES } from '../data/about.js';
export class AboutScreen {
  constructor(app) { this.app = app; this.s = { tab: 0 }; this.scroll = 0; this.done = false; }
  update(ui) {
    ui.rect(0, 0, ui.W, ui.H, 'ink'); const titles = ABOUT_PAGES.map((p) => p.tab); const prev = this.s.tab; const tab = ui.tabs(this.s, titles, 10); if (tab !== prev) this.scroll = 0; const page = ABOUT_PAGES[tab]; const W = Math.min(ui.W - 40, 420), x = Math.round(ui.W / 2 - W / 2), top = 28, bottom = ui.H - 22;
    const lines = []; for (const [k, v] of page.rows) { if (k) lines.push({ t: k, c: 'sand' }); for (const l of ui.wrap(v, W)) lines.push({ t: l, c: 'white' }); lines.push({ t: '', c: 'white' }); }
    const vis = Math.floor((bottom - top) / 10); const maxS = Math.max(0, lines.length - vis);
    if (ui.nav.down) this.scroll++; if (ui.nav.up) this.scroll--; if (ui.wheel) this.scroll += Math.sign(ui.wheel) * 2; this.scroll = Math.max(0, Math.min(maxS, this.scroll));
    for (let i = 0; i < vis && i + this.scroll < lines.length; i++) { const L = lines[i + this.scroll]; ui.text(x, top + i * 10, L.t, { color: L.c }); }
    if (this.scroll > 0) ui.text(ui.W - 14, top, '^', { color: 'sand' }); if (this.scroll < maxS) ui.text(ui.W - 14, bottom - 10, 'V', { color: 'sand' });
    ui.prompts([['up', 'SCROLL'], ['back', 'BACK']]); if (ui.back) { ui.sound('uiback'); this.done = true; }
  }
}
