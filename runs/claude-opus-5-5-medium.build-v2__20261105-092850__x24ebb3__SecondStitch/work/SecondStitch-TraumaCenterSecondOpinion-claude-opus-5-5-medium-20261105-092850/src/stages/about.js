// About/Credits: paged, big text. Credits at the end of the shift, with the Shift Report.
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { buildSet } from '../view/sets.js';
import { CREDITS, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFO, TESTING_FEEDBACK } from '../content/about.js';
import { TITLE } from '../core/meta.js';
import { CAMPAIGN_OPS, OPS } from '../content/ops/index.js';

const san = (s) => s.toUpperCase().replace(/[^A-Z0-9 .,:;!?\-+%/()[\]'"#&*=<>]/g, ' ');
function pagesOf(title, rows) {
  // Each row is label + answer; keep at most a few to a page so it stays 10-foot.
  const pages = [];
  let cur = [], weight = 0;
  for (const [a, b] of rows) {
    const w = 1 + Math.ceil(b.length / 54);
    if (weight + w > 13 && cur.length) { pages.push({ title, rows: cur }); cur = []; weight = 0; }
    cur.push([a, b]); weight += w + 1;
  }
  if (cur.length) pages.push({ title, rows: cur });
  return pages;
}
export const ABOUT_PAGES = () => [
  ...pagesOf('SOURCE INFORMATION', SOURCE_INFO),
  ...pagesOf('TESTING FEEDBACK', TESTING_FEEDBACK),
  ...pagesOf('ENGINE FEEDBACK', ENGINE_FEEDBACK),
  ...pagesOf('PROMPT FEEDBACK', PROMPT_FEEDBACK),
  { title: 'CREDITS', rows: CREDITS.map((c) => ['', c]) },
];
export class AboutStage extends Stage {
  name = 'about';
  i = 0; t = 0;
  async build(ctx) { this.set = await buildSet(ctx, 'scrub'); app.applyLook(1, 0.6, 0); app.director?.play('ward'); this.pages = ABOUT_PAGES(); }
  status() { return `about ${this.i}/${this.pages.length}`; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.set.update(dt); app.director?.update(dt);
    setView(ctx, [3.4, 2.4, 6], [0, 1.1, 0], 34);
    const n = app.devices.nav, c = app.devices.click(ctx.input);
    if (n.back || app.devices.rightClick(ctx.input)) { ctx.audio.play('uiBack'); import('./flow.js').then(({ backToMain }) => backToMain()); return; }
    if (n.right || n.down || n.confirm || n.tabR || c) { this.i = (this.i + 1) % this.pages.length; ctx.audio.play('uiMove'); }
    if (n.left || n.up || n.tabL) { this.i = (this.i - 1 + this.pages.length) % this.pages.length; ctx.audio.play('uiMove'); }
    drawPage(ctx, this.pages[this.i], `${this.i + 1} / ${this.pages.length}`);
    app.prompts.strip(ctx.hud, 10, ctx.hud.height - 13, [['confirm', 'NEXT PAGE'], ['back', 'BACK']]);
  }
}
function drawPage(ctx, page, footer) {
  const { hud } = ctx, W = hud.width, H = hud.height;
  hud.clear();
  hud.rect(0, 0, W, H, 0x0d0b14);
  hud.text(10, 8, page.title, { color: 0xffd24d, scale: 2 });
  let y = 30;
  const width = W - 20;
  for (const [a, b] of page.rows) {
    if (a) { hud.text(10, y, san(a), { color: 0x8ad0ff }); y += 10; }
    const lines = app.prompts.draw(hud, 10, y, san(b), { width, lineH: 10, color: 0xffffff });
    y += lines * 10 + 5;
  }
  hud.text(W - hud.measure(footer).width - 10, 8, footer, { color: 0x5a6172 });
}
export class CreditsStage extends Stage {
  name = 'credits';
  t = 0;
  constructor(opts) { super(); this.opts = opts; }
  async build(ctx) { this.set = await buildSet(ctx, 'morning'); app.applyLook(1, 0.2, 0); app.director?.play('credits'); }
  status() { return 'credits'; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt); app.director?.update(dt);
    setView(ctx, [4, 2.6, 7], [0, 1.2, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.clear();
    const lines = [
      ['SHIFT REPORT', 0xffd24d, 2],
      ...CAMPAIGN_OPS.map((id) => [`${OPS[id].title.padEnd(20, ' ')} ${app.save.ranks[id] ?? '-'}`, 0xffffff, 1]),
      ['', 0, 1], [TITLE, 0xf6f2e6, 2], ['', 0, 1],
      ...['DR. ILYA MARSH', 'NURSE ODALYS REYES', 'DR. SABINE ACHTERBERG', 'CHIEF CORNELIUS BRAM', 'DR. PEMBERTON OKOYE', 'DR. HESPER LINDQVIST'].map((s) => [s, 0x8ad0ff, 1]),
      ['', 0, 1], ...CREDITS.flatMap((c) => wrap(hud, c, W - 40).map((l) => [l, 0xb8c0d0, 1])), ['', 0, 1], ['YOU HAVE A SEVEN A.M.', 0xffd24d, 2],
    ];
    let y = H - this.t * 18;
    for (const [text, color, scale] of lines) {
      if (text && y > -20 && y < H) { const w = hud.measure(text, scale).width; hud.text(Math.round(W / 2 - w / 2), Math.round(y), text, { color, scale }); }
      y += 12 + (scale - 1) * 8;
    }
    const finished = y < 0;
    app.prompts.strip(hud, 10, H - 13, [['confirm', 'END']]);
    if (finished || app.devices.nav.confirm || app.devices.click(ctx.input)) this.opts.onDone?.();
    void go;
  }
}
function wrap(hud, text, width) {
  const out = []; let line = '';
  for (const w of text.split(' ')) { if (hud.measure(`${line} ${w}`).width > width) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; }
  if (line) out.push(line);
  return out;
}
