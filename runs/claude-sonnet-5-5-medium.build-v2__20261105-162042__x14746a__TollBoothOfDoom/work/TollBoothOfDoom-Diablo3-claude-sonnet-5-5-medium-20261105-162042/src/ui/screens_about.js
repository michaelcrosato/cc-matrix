// About and Credits: Source Information, Testing/Engine/Prompt Feedback, and the credits, paged on L1/R1 or the wheel.
import { TITLE } from '../data/meta.js';
import { ABOUT } from '../data/about.generated.js';
import { CREDITS_TEXT } from '../data/credits.generated.js';

const LABELS = [['date', 'DATE'], ['source', 'SOURCE'], ['plan', 'PLAN'], ['genre', 'GENRE AND PERSPECTIVE'], ['tech', 'TECH'], ['artDirection', 'ART DIRECTION'], ['animation', 'ANIMATION'], ['audio', 'AUDIO'], ['online', 'ONLINE'], ['testing', 'TESTING'], ['research', 'RESEARCH'], ['environment', 'ENVIRONMENT'], ['model', 'MODEL'], ['usage', 'USAGE']];
export function aboutPages() {
  const pages = []; const si = ABOUT.sourceInformation;
  pages.push({ title: 'SOURCE INFORMATION', items: LABELS.map(([k, l]) => [l, k === 'genre' ? `${si.genre}. ${si.perspective}` : si[k]]) });
  pages.push({ title: 'TESTING FEEDBACK', items: ABOUT.questions.testing.map((q, i) => [q, ABOUT.testingFeedback[i]]) });
  pages.push({ title: 'ENGINE FEEDBACK', items: ABOUT.questions.engine.map((q, i) => [q, ABOUT.engineFeedback[i]]) });
  pages.push({ title: 'PROMPT FEEDBACK', items: ABOUT.questions.prompt.map((q, i) => [q, ABOUT.promptFeedback[i]]) });
  pages.push({ title: 'CREDITS', credits: true });
  return pages;
}
export function drawAbout(game, ui, nav, o, overlay) {
  const hud = ui.hud; const W = ui.hudW, H = ui.hudH; hud.rect(0, 0, W, H, 'ink');
  const pages = aboutPages(); game.aboutPage = Math.max(0, Math.min(pages.length - 1, game.aboutPage || 0));
  if (nav.tabNext || nav.right) { game.aboutPage = (game.aboutPage + 1) % pages.length; game.aboutScroll = 0; } if (nav.tabPrev || nav.left) { game.aboutPage = (game.aboutPage + pages.length - 1) % pages.length; game.aboutScroll = 0; }
  const p = pages[game.aboutPage]; ui.text(12, 6, `${TITLE.toUpperCase()}: ABOUT`, { color: 'sand' }); ui.text(W - 12 - hud.measure(`${game.aboutPage + 1}/${pages.length}`).width, 6, `${game.aboutPage + 1}/${pages.length}`, { color: 'mist' });
  ui.center(18, p.title, { scale: 2, color: 'white' });
  // build wrapped lines
  const lines = [];
  if (p.credits) { for (const para of CREDITS_TEXT) { if (para === '') { lines.push(['', 'mist']); continue; } for (const l of ui.wrap(para.toUpperCase(), W - 40)) lines.push([l, para.startsWith('#') ? 'sand' : 'white']); } }
  else for (const [k, v] of p.items) { for (const l of ui.wrap(k.toUpperCase() + ':', W - 40)) lines.push([l, 'sand']); for (const l of ui.wrap(String(v).toUpperCase(), W - 50)) lines.push(['  ' + l, 'white']); lines.push(['', 'white']); }
  game.aboutScroll = game.aboutScroll || 0; const view = 17; const maxS = Math.max(0, lines.length - view);
  if (nav.down) game.aboutScroll = Math.min(maxS, game.aboutScroll + 3); if (nav.up) game.aboutScroll = Math.max(0, game.aboutScroll - 3);
  const wh = game.ctx.input.wheel; if (wh) { game.aboutScroll = Math.max(0, Math.min(maxS, game.aboutScroll + Math.sign(wh) * 3)); game.ctx.input.wheel = 0; }
  lines.slice(game.aboutScroll, game.aboutScroll + view).forEach(([l, c], i) => { if (l) ui.text(20, 40 + i * 10, l, { color: c }); });
  ui.zone('about', 0, 0, 1, 1);
  if (maxS > 0) ui.text(W - 80, H - 28, game.aboutScroll < maxS ? 'MORE BELOW' : 'END', { color: 'slate' });
  ui.prompts([['tabPrev', 'PREV'], ['tabNext', 'NEXT'], ['nav', 'SCROLL'], ['back', 'BACK']], H - 14);
  if (nav.back) { if (overlay) game.closeOverlay(); else { game.mode = 'menu'; ui.setFocus(null); } }
}
