// About / Credits: paged, scrolling with stick or wheel. Every page reads from src/data/about.js.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { TITLE } from '../config.js';
import { SOURCE_INFO, FEEDBACK, CREDITS } from '../data/about.js';

const upper = (s) => String(s).toUpperCase().replace(/[^0-9A-Z .,:;\-+=/()[\]{}%_!?<>#'*@&|\\~^$]/g, ' ');
const Q = { testing: ['HOW MANY ISSUES DID TESTING CATCH?', 'HOW MANY WERE CRITICAL OR GAME BREAKING?', 'MOST HELPFUL TEST?', 'LEAST HELPFUL TEST?'],
  engine: ['WHAT I LIKED MOST', 'DID I GET STUCK OR GUESS WRONG?', 'MOST IMPORTANT THING I BUILT MYSELF', 'HARDEST PART', 'WHAT I CHANGED IN THE ENGINE', 'ONE THING I WOULD CHANGE'],
  prompt: ['WHAT I LIKED MOST', 'WHAT WAS CONFUSING', 'HARDEST THING TO DO', 'WHAT I WOULD CHANGE'] };
export const PAGES = ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'];
export function pageLines(page) {
  const out = [];
  if (page === 0) { const k = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' }; for (const [f, l] of Object.entries(k)) out.push([l, SOURCE_INFO[f] || 'unknown']); }
  else if (page <= 3) { const key = ['', 'testing', 'engine', 'prompt'][page]; const qs = Q[key]; (FEEDBACK[key].length ? FEEDBACK[key] : []).forEach((a, i) => out.push([qs[i] || 'NOTE', a])); if (!FEEDBACK[key].length) out.push(['', 'unknown']); }
  else { out.push(['TITLE', TITLE]); CREDITS.forEach((c) => out.push(['', c])); }
  return out;
}
export class AboutScreen {
  constructor() { this.page = 0; this.scroll = 0; }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    ui.text(10, 6, 'ABOUT', { scale: 2, color: 'sand' });
    const c = ui.tabs(10, 24, ['SOURCE', 'TESTING', 'ENGINE', 'PROMPT', 'CREDITS'], this.page); if (c >= 0) { this.page = c; this.scroll = 0; }
    if (nav.prev) { this.page = (this.page + 4) % 5; this.scroll = 0; } if (nav.next) { this.page = (this.page + 1) % 5; this.scroll = 0; }
    ui.text(10, 42, PAGES[this.page], { color: 'orange' });
    const rows = pageLines(this.page);
    // lay out wrapped lines
    const lines = [];
    for (const [k, v] of rows) { if (k) lines.push({ t: k, c: 'sand' }); for (const l of ui.wrap(upper(v), W - 28)) lines.push({ t: l, c: 'white' }); lines.push({ t: '', c: 'white' }); }
    const view = Math.floor((H - 82) / 10); const max = Math.max(0, lines.length - view);
    if (nav.down) this.scroll = Math.min(max, this.scroll + 2); if (nav.up) this.scroll = Math.max(0, this.scroll - 2); if (nav.scroll) this.scroll = Math.max(0, Math.min(max, this.scroll + Math.sign(nav.scroll) * 3));
    lines.slice(this.scroll, this.scroll + view).forEach((l, i) => ui.text(14, 56 + i * 10, l.t, { color: l.c }));
    if (max > 0) { ui.rect(W - 8, 56, 3, view * 10, 'night'); ui.rect(W - 8, 56 + Math.round((this.scroll / max) * (view * 10 - 12)), 3, 12, 'sand'); }
    if (nav.back) { app.pop(); ctx.audio.play('uiBack'); }
    ui.prompts([['prev', 'PAGE'], ['back', 'BACK']]);
  }
}
