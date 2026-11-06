// About & Credits: paged, not dense. One source of truth: data/about.js.
import { ACTIONS } from '../../core/actions.js';
import { App } from '../../app.js';
import { AI_HUB, ENGINE_FEEDBACK, PROMPT_FEEDBACK, QUESTIONS_E, QUESTIONS_P, QUESTIONS_T, SOURCE_INFO, TESTING_FEEDBACK } from '../../data/about.js';
import { CREDITS_TEXT } from '../../data/credits.gen.js';
import { TITLE } from '../../data/title.js';
import { center, say, sanitize, wrap } from '../font.js';
import { promptBar } from '../prompts.js';
import { panel, note } from '../widgets.js';
const qa = (qs, ans) => qs.map((q, i) => `${q}\n${ans[i] ?? 'unknown'}`);
const SI = SOURCE_INFO;
const LABELS = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
const si = Object.keys(LABELS).map((k) => `${LABELS[k]}: ${SI[k]}`);
export const ABOUT_PAGES = [
  { title: TITLE, lines: [AI_HUB.tagline, '', 'Host: Ounce. Coach: Plumb. Staff: Kevin.', 'Made in code by Claude for Michael Crosato.', 'Everything you see and hear is written in code.', '', 'This is not medical advice. Ounce is a scale.'] },
  { title: 'Source Information', lines: si.slice(0, 5) }, { title: 'Source Information', lines: si.slice(5, 9) }, { title: 'Source Information', lines: si.slice(9, 12) }, { title: 'Source Information', lines: si.slice(12) },
  ...qa(QUESTIONS_T, TESTING_FEEDBACK).map((l) => ({ title: 'Testing Feedback', lines: l.split('\n') })),
  ...qa(QUESTIONS_E, ENGINE_FEEDBACK).map((l) => ({ title: 'Engine Feedback', lines: l.split('\n') })),
  ...qa(QUESTIONS_P, PROMPT_FEEDBACK).map((l) => ({ title: 'Prompt Feedback', lines: l.split('\n') })),
  { title: 'Kit credits', lines: ['Pixel Engine, three.js r186 and Rapier ship under their own licences.', 'The kit library and packs carry their own credits.', 'The next page has the kit\'s CREDITS.md in full.', 'Scroll it with the stick, arrows or the wheel.'] },
  { title: 'CREDITS.md', scroll: true },
];
const CREDIT_LINES = wrap(sanitize(CREDITS_TEXT.replace(/[`*#|]/g, ' ').replace(/ +/g, ' ')), 60);
export class AboutScreen {
  id = 'about'; i = 0; top = 0; attractable = true; rep = 0;
  update(ctx, dt) {
    const inp = ctx.input, p = ABOUT_PAGES[this.i];
    if (inp.wasPressed(...ACTIONS.back)) { App.close(this); return; }
    let d = 0;
    if (inp.wasPressed(...ACTIONS.tabR, 'ArrowRight', 'KeyD', 'PadRight')) d = 1;
    if (inp.wasPressed(...ACTIONS.tabL, 'ArrowLeft', 'KeyA', 'PadLeft')) d = -1;
    if (p.scroll) {
      const sy = inp.padAxis.y, down = inp.anyDown(ACTIONS.down) || sy < -0.5, up = inp.anyDown(ACTIONS.up) || sy > 0.5;
      this.rep += dt; if (this.rep > 0.08) { this.rep = 0; if (down) this.top++; if (up) this.top--; }
      if (inp.wheel) this.top += Math.sign(inp.wheel) * 3;
      this.top = Math.max(0, Math.min(CREDIT_LINES.length - 1, this.top));
    } else {
      if (inp.wasPressed('Enter', 'Space', 'PadCross', 'MouseLeft') || inp.wheel > 0) d = 1;
      if (inp.wheel < 0) d = -1;
    }
    if (d) { this.i = (this.i + d + ABOUT_PAGES.length) % ABOUT_PAGES.length; this.top = 0; App.sfx('menuMove'); }
  }
  draw(hud) {
    const p = ABOUT_PAGES[this.i], w = Math.min(hud.width - 24, 400), x = Math.round((hud.width - w) / 2), y = 12, h = hud.height - 40;
    panel(hud, x, y, w, h, 'white', 'teal');
    center(hud, y + 6, p.title, { scale: 2, color: 'teal', shadow: false });
    const cols = Math.floor((w - 20) / 6); let ty = y + 26; const maxY = y + h - 10;
    if (p.scroll) {
      const rows = Math.floor((h - 34) / 10);
      for (let k = 0; k < rows; k++) { const l = CREDIT_LINES[this.top + k]; if (l === undefined) break; say(hud, x + 10, ty, l.slice(0, cols), { color: 'ink', shadow: false }); ty += 10; }
    } else {
      for (const para of p.lines) { for (const l of wrap(sanitize(para), cols)) { if (ty < maxY) say(hud, x + 10, ty, l, { color: 'ink', shadow: false }); ty += 10; } ty += 2; }
    }
    note(x, y, w, h, 'about');
    promptBar(hud, [['tabs', `Page ${this.i + 1}/${ABOUT_PAGES.length}`], ['back', 'Back']]);
  }
}
