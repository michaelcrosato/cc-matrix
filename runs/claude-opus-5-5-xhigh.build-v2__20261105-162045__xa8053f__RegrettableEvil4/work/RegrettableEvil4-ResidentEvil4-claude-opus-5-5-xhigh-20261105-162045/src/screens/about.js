// About and credits: paged, scrolling with stick or wheel. Every field TASK.md asks for.
import { app } from '../core/app.js';
import { CREDITS, ENGINE_FEEDBACK, ENGINE_QUESTIONS, PROMPT_FEEDBACK, PROMPT_QUESTIONS, SOURCE_INFORMATION, SOURCE_LABELS, TESTING_FEEDBACK, TESTING_QUESTIONS } from '../data/about.js';
import { wrap } from '../core/ui.js';
import { TITLE, TAGLINE } from '../config.js';

const PAGES = ['SOURCE', 'TESTING', 'ENGINE', 'PROMPT', 'CREDITS'];

function pageLines(i, width) {
  const out = [];
  const add = (label, text) => {
    if (label) out.push({ t: label, c: 'sand' });
    for (const l of wrap(text, width)) out.push({ t: l, c: 'white' });
    out.push({ t: '', c: 'white' });
  };
  if (i === 0) for (const [label, key] of SOURCE_LABELS) add(label, SOURCE_INFORMATION[key]);
  if (i === 1) TESTING_QUESTIONS.forEach((q, n) => add(q, TESTING_FEEDBACK[n]));
  if (i === 2) ENGINE_QUESTIONS.forEach((q, n) => add(q, ENGINE_FEEDBACK[n]));
  if (i === 3) PROMPT_QUESTIONS.forEach((q, n) => add(q, PROMPT_FEEDBACK[n]));
  if (i === 4) {
    add(TITLE, TAGLINE);
    for (const c of CREDITS) add('', c);
  }
  return out;
}

export function openAbout() {
  let page = 0;
  let scroll = 0;
  let cache = null;
  let cachePage = -1;
  const screen = {
    frozen: true,
    name: 'about',
    page: () => page,
    lineCount: () => cache?.length ?? 0,
    scrollTo: (n) => { scroll = n; },
    scrolled: () => scroll,
    update(ctx, ui) {
      ctx.hud.clear();
      ctx.hud.rect(0, 0, ui.W, ui.H, 'ink');
      ui.heading('ABOUT', 6);
      const next = ui.tabs('atabs', 32, PAGES, page);
      if (next !== page) { page = next; scroll = 0; }
      const width = Math.floor((ui.W - 40) / 6);
      if (cachePage !== page) { cache = pageLines(page, width); cachePage = page; }
      const top = 50; const rows = Math.floor((ui.H - top - 20) / 9);
      const maxScroll = Math.max(0, cache.length - rows);
      if (ui.held.down > 0 && ui.nav.down) scroll++;
      if (ui.held.up > 0 && ui.nav.up) scroll--;
      if (ui.nav.wheel) scroll += ui.nav.wheel > 0 ? 3 : -3;
      if (ui.mouseDown && ui.mx > ui.W - 16) scroll = Math.round(((ui.my - top) / (rows * 9)) * maxScroll);
      scroll = Math.max(0, Math.min(maxScroll, scroll));
      for (let i = 0; i < rows; i++) {
        const l = cache[i + scroll];
        if (l) ui.text(20, top + i * 9, l.t, { color: l.c });
      }
      if (maxScroll > 0) {
        const barH = Math.max(8, Math.round((rows / cache.length) * rows * 9));
        const barY = top + Math.round((scroll / maxScroll) * (rows * 9 - barH));
        ctx.hud.rect(ui.W - 10, top, 2, rows * 9, 'night');
        ctx.hud.rect(ui.W - 11, barY, 4, barH, 'sand');
      }
      ui.promptBar([['tabPrev', ''], ['tabNext', 'PAGE'], ['back', 'BACK']]);
      if (ui.nav.back) { ctx.audio.play('uiBack'); app.close(screen); }
    },
  };
  app.open(screen);
  return screen;
}
export { PAGES as ABOUT_PAGES };
