// About & Credits: paged, not dense. L1/R1, arrows or click.
import { App } from '../../app.js';
import { BACK, MENU_DOWN, MENU_LEFT, MENU_RIGHT, MENU_UP, TAB_LEFT, TAB_RIGHT } from '../../core/actions.js';
import { CREDITS, DISCLAIMER, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFO, TESTING_FEEDBACK } from '../../data/about.js';
import { CREDITS_TEXT } from '../../data/credits-text.js';
import { promptBar } from '../prompts.js';
import { say, sayCentered, sanitize } from '../font.js';
import { heading, panel, SAFE } from '../widgets.js';
import { dim, wrapTo } from './common.js';

const SOURCE_LABELS = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };

function qa(block) { return block.questions.flatMap((q, i) => [{ h: q }, { t: block.answers[i] }]); }

function buildPages() {
  return [
    { title: 'Credits', rows: CREDITS.map((t) => ({ t })) },
    { title: 'Please Note', rows: [{ h: DISCLAIMER }, { t: 'The game asks for no health data. Wobble Age is a joke. So is the number it was before.' }] },
    { title: 'Source Information', rows: Object.keys(SOURCE_LABELS).flatMap((k) => [{ h: SOURCE_LABELS[k] }, { t: SOURCE_INFO[k] }]) },
    { title: 'Testing Feedback', rows: qa(TESTING_FEEDBACK) },
    { title: 'Engine Feedback', rows: qa(ENGINE_FEEDBACK) },
    { title: 'Prompt Feedback', rows: qa(PROMPT_FEEDBACK) },
    { title: 'Engine Kit Credits', rows: [{ h: 'Pixel Engine\'s own credits follow, as it asks.' }, { t: 'three.js and Rapier ship under their licences. The library and built-in models are the engine\'s own work. The full text is on the next page.' }] },
    { title: 'CREDITS.md', rows: sanitize(CREDITS_TEXT).split('\n').map((t) => ({ t, raw: true })) },
  ];
}

export class AboutScreen {
  name = 'about';
  i = 0;
  scroll = 0;
  rows = 0;
  pages = buildPages();
  repeat = 0;

  layout(hud, page) {
    const w = Math.min(hud.width - SAFE * 2, 420);
    const out = [];
    for (const r of page.rows) {
      if (r.h) { for (const l of wrapTo(r.h, w - 12)) out.push({ s: l, color: 'teal' }); } else if (r.raw) {
        const ls = wrapTo(r.t || ' ', w - 12);
        for (const l of ls) out.push({ s: l, color: 'ink' });
      } else { for (const l of wrapTo(r.t, w - 12)) out.push({ s: l, color: 'ink' }); out.push({ s: '', color: 'ink' }); }
    }
    return { w, lines: out };
  }

  update(ctx, dt) {
    const { input } = ctx;
    const n = this.pages.length;
    const page = (d) => { this.i = (this.i + d + n) % n; this.scroll = 0; App.sfx('menuMove'); };
    if (input.wasPressed(...TAB_RIGHT, ...MENU_RIGHT)) page(1);
    if (input.wasPressed(...TAB_LEFT, ...MENU_LEFT)) page(-1);
    if (input.wasPressed('MouseLeft')) {
      const p = App.device.pointerArt(ctx);
      page(p.x < ctx.hud.width / 2 ? -1 : 1);
    }
    const h = this.visible ?? 10;
    const maxScroll = Math.max(0, (this.lineCount ?? 0) - h);
    const uiDt = dt || 1 / 60;
    const dir = (input.anyDown(MENU_DOWN) || input.padAxis.y < -0.5 ? 1 : 0) - (input.anyDown(MENU_UP) || input.padAxis.y > 0.5 ? 1 : 0);
    if (dir) {
      this.repeat -= uiDt;
      if (this.repeat <= 0) { this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + dir)); this.repeat = 0.09; }
    } else this.repeat = 0;
    if (input.wheel) this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + Math.sign(input.wheel) * 3));
    if (input.wasPressed(...BACK) || input.wasPressed('MouseRight')) { App.sfx('menuBack'); App.stack.pop(this); }
  }

  draw(ctx) {
    const { hud } = ctx;
    dim(hud);
    const page = this.pages[this.i];
    heading(hud, page.title, 12, hud.width > 300 ? 2 : 1);
    const { w, lines } = this.layout(hud, page);
    this.lineCount = lines.length;
    const top = 38;
    const lineH = 11;
    const avail = hud.height - top - 42;
    this.visible = Math.max(3, Math.floor((avail - 8) / lineH));
    const x = Math.round((hud.width - w) / 2);
    const shown = Math.min(this.visible, lines.length);
    panel(hud, x, top, w, shown * lineH + 8, { fill: 'white', name: 'about' });
    for (let k = 0; k < shown; k++) {
      const l = lines[this.scroll + k];
      if (l?.s) say(hud, x + 6, top + 4 + k * lineH, l.s, { color: l.color, shadow: false, name: 'about-text' });
    }
    if (lines.length > shown) {
      const bh = shown * lineH;
      const th = Math.max(6, Math.round((bh * shown) / lines.length));
      const ty = top + 4 + Math.round(((bh - th) * this.scroll) / Math.max(1, lines.length - shown));
      hud.rect(x + w - 4, top + 4, 2, bh, 'mist');
      hud.rect(x + w - 4, ty, 2, th, 'teal');
    }
    sayCentered(hud, hud.width / 2, hud.height - 38, `${this.i + 1} / ${this.pages.length}`, { color: 'sand', name: 'about-page' });
    promptBar(hud, App.device, lines.length > shown ? [['tabs', 'Page'], ['move', 'Scroll'], ['back', 'Back']] : [['tabs', 'Page'], ['back', 'Back']]);
  }
}
