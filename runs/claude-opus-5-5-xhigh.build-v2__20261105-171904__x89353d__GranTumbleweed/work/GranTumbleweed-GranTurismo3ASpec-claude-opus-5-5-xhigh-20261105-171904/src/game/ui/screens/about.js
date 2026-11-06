// About and credits, built from the exit-interview file so this screen and the chat reply can't drift apart.
import { INTERVIEW, KIT_CREDITS } from '../../data/about.gen.js';
import { ABOUT_QUESTIONS, CREDIT_LINES } from '../../data/about.js';
import { wrapText } from '../ui.js';
function pagesFor(CHARS) {
  const iv = INTERVIEW ?? {}, si = iv.sourceInformation ?? {}, up = (v) => String(v ?? 'unknown').toUpperCase().replace(/[^A-Z0-9 .,:;!?'"()\-+/%#=<>_*&@$[\]\\|^~]/g, ' ');
  const sections = [];
  const rows = [['DATE', si.date], ['SOURCE', si.source], ['PLAN', si.plan], ['GENRE', si.genre], ['PERSPECTIVE', si.perspective], ['TECH', si.tech], ['ART DIRECTION', si.artDirection], ['ANIMATION', si.animation], ['AUDIO', si.audio], ['ONLINE', si.online], ['TESTING', si.testing], ['RESEARCH', si.research], ['ENVIRONMENT', si.environment], ['MODEL', si.model], ['USAGE', si.usage]];
  sections.push({ tab: 'SOURCE INFORMATION', items: rows.map(([k, v]) => ({ head: k, text: wrapText(up(v), CHARS) })) });
  for (const [tab, key, qs] of [['TESTING FEEDBACK', 'testingFeedback', ABOUT_QUESTIONS.testing], ['ENGINE FEEDBACK', 'engineFeedback', ABOUT_QUESTIONS.engine], ['PROMPT FEEDBACK', 'promptFeedback', ABOUT_QUESTIONS.prompt]]) sections.push({ tab, items: qs.map((q, i) => ({ head: q, text: wrapText(up(iv[key]?.[i]), CHARS) })) });
  sections.push({ tab: 'CREDITS', items: CREDIT_LINES.map((l) => ({ head: l[0], text: wrapText(l[1], CHARS) })) });
  // Each section is split into pages of at most 17 lines.
  const pages = [];
  for (const s of sections) { let cur = [], n = 0, part = 1; const flush = () => { if (cur.length) { pages.push({ tab: s.tab, part: part++, lines: cur }); cur = []; n = 0; } }; for (const it of s.items) { const need = 1 + it.text.length; if (n + need > 17) flush(); cur.push({ t: it.head, head: true }); for (const l of it.text) cur.push({ t: l }); n += need; } flush(); }
  return pages;
}
const creditPages = (CHARS) => { const lines = KIT_CREDITS.split('\n').flatMap((l) => (l.trim() ? wrapText(l.replace(/[`*#|]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(), CHARS) : [''])); return lines; };
export class AboutScreen {
  constructor(app) { this.id = 'about'; this.app = app; this.page = 0; this.chars = 60; this.pages = pagesFor(this.chars); this.scroll = 0; this.kit = null; }
  draw(ui, dt) {
    const app = this.app, w = Math.min(ui.w - 16, 400), x = Math.round(ui.cx - w / 2), h = ui.h - 28, chars = Math.min(60, Math.floor((w - 16) / 6));
    if (chars !== this.chars) { this.chars = chars; this.pages = pagesFor(chars); this.page = Math.min(this.page, this.pages.length - 1); if (this.kit) this.kit = creditPages(chars); } // the lines follow the width of the screen
    ui.panel(x, 4, w, h, { color: 'ink', border: 'slate' });
    if (this.kit) { // The kit's CREDITS.md, scrollable, as it asks to be shipped.
      ui.text(x + 8, 8, 'THE KIT\'S CREDITS', { color: 'sand' });
      const rows = 20, max = Math.max(0, this.kit.length - rows); const dy = app.actions.moveY(); if (dy) this.scroll = Math.max(0, Math.min(max, this.scroll + dy * (app.actions.moveTimer.y < 0.2 ? 3 : 1))); if (app.actions.wheel) this.scroll = Math.max(0, Math.min(max, this.scroll + Math.sign(app.actions.wheel) * 3));
      this.kit.slice(this.scroll, this.scroll + rows).forEach((l, i) => ui.text(x + 8, 20 + i * 10, l, { color: 'mist' }));
      ui.text(x + w - 8, 8, `${this.scroll + 1}/${this.kit.length}`, { align: 'right', color: 'slate' });
      ui.prompts([['move', 'SCROLL'], ['back', 'BACK']]);
      return;
    }
    const p = this.pages[this.page];
    ui.text(x + 8, 8, p.tab, { color: 'sand' }); ui.text(x + w - 8, 8, `PAGE ${this.page + 1}/${this.pages.length}`, { align: 'right', color: 'slate' });
    p.lines.forEach((l, i) => ui.text(x + 8, 22 + i * 10, l.t, { color: l.head ? 'sky' : 'white' }));
    ui.button('prev', x + 6, ui.h - 40, 76, 12, 'PREVIOUS', { confirm: () => { this.page = (this.page - 1 + this.pages.length) % this.pages.length; } });
    ui.button('next', x + w - 82, ui.h - 40, 76, 12, 'NEXT', { confirm: () => { this.page = (this.page + 1) % this.pages.length; } });
    if (p.tab === 'CREDITS') ui.button('kit', x + w / 2 - 50, ui.h - 40, 100, 12, 'THE KIT\'S CREDITS', { confirm: () => { this.kit = creditPages(this.chars); this.scroll = 0; } });
    if (!this.focus) this.focus = 'next';
    if (app.actions.pressed('tabL')) this.page = (this.page - 1 + this.pages.length) % this.pages.length;
    if (app.actions.pressed('tabR')) this.page = (this.page + 1) % this.pages.length;
    ui.prompts([['confirm', 'TURN PAGE'], ['tabs', 'PAGE'], ['back', 'BACK']]);
    void dt;
  }
  onBack(ui) { if (this.kit) { this.kit = null; return; } ui.pop(); }
}
