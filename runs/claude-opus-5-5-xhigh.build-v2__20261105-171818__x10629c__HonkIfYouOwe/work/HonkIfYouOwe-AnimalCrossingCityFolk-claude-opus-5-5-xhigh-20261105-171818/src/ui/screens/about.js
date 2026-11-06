// About/Credits: paged, big type. Source Information, feedback, cast, licences. Reachable from title and pause.
import { panel, drawText, inRect, dim, wrap } from '../draw.js';
import { ABOUT_PAGES } from '../../data/about.js';

class About {
  constructor(g) {
    this.id = 'about';
    this.pages = paginate(ABOUT_PAGES, kitCredits());
    this.i = 0;
  }
  labels() { return this.pages.map((p) => p.title); }
  focusIndex() { return this.i; }
  currentText() { return this.pages[this.i].lines.join('\n'); }
  allText() { return this.pages.map((p) => `${p.title}\n${p.lines.join('\n')}`).join('\n'); }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.right || inp.nav.down || (m.click && inRect(m, 410, 232, 50, 20))) { this.i = Math.min(this.pages.length - 1, this.i + 1); g.sound('almanacTurn'); }
    if (inp.nav.left || inp.nav.up || (m.click && inRect(m, 20, 232, 50, 20))) { this.i = Math.max(0, this.i - 1); g.sound('almanacTurn'); }
    if (inp.back || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); }
  }
  prompts() { return [['back', 'Close']]; }
  draw(g, hud) {
    hud.rect(0, 0, 480, 270, 'ink');
    const p = this.pages[this.i];
    panel(hud, 14, 12, 452, 216, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 20, p.title, { align: 'center', color: 'ink', scale: 2 });
    p.lines.forEach((l, k) => drawText(hud, 24, 42 + k * 12, l, { color: l.startsWith('* ') ? 'plum' : 'ink' }));
    panel(hud, 20, 232, 50, 20, { fill: this.i > 0 ? 'sand' : 'mist', trim: 'orange' });
    drawText(hud, 45, 238, '<', { align: 'center', color: 'ink' });
    panel(hud, 410, 232, 50, 20, { fill: this.i < this.pages.length - 1 ? 'sand' : 'mist', trim: 'orange' });
    drawText(hud, 435, 238, '>', { align: 'center', color: 'ink' });
    drawText(hud, 240, 238, `Page ${this.i + 1} of ${this.pages.length}`, { align: 'center', color: 'mist' });
  }
}
function kitCredits() {
  if (typeof document === 'undefined') return [];
  const el = document.getElementById('kit-credits');
  return el ? el.textContent.split('\n') : [];
}
function paginate(sections, licences) {
  const out = [];
  const W = 432, MAX = 15;
  for (const s of sections) {
    const lines = s.lines.flatMap((l) => wrap(l, W));
    for (let i = 0; i < lines.length; i += MAX) out.push({ title: s.title + (lines.length > MAX ? ` ${Math.floor(i / MAX) + 1}` : ''), lines: lines.slice(i, i + MAX) });
  }
  // The kit's CREDITS.md ships in the page and reads here: long, but honest.
  const lic = licences.filter((l) => l.trim() && !l.startsWith('|-')).flatMap((l) => wrap(l.replace(/[#*|`]/g, ' ').replace(/\s+/g, ' ').trim(), W));
  for (let i = 0; i < lic.length; i += MAX) out.push({ title: `Licences ${Math.floor(i / MAX) + 1}`, lines: lic.slice(i, i + MAX) });
  return out;
}
export const aboutScreen = (g) => new About(g);
export { dim };
