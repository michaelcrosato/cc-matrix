// The title: the live village diorama with the logo. Continue, New Arrival, Visit, Settings, About.
import { drawText, panel, inRect, textWidth, dim } from '../draw.js';
import { Menu } from '../ui.js';
import { settingsScreen } from './settings.js';
import { aboutScreen } from './about.js';
import { hasSave } from '../../core/save.js';
import { startNewGame, continueGame } from '../../systems/newgame.js';
import { visitMenu } from '../../net/visitUi.js';

export function titleScreen(g) {
  const touch = g.opts.touchOnly;
  const items = [];
  if (hasSave()) items.push({ label: 'Continue', action: (gg) => continueGame(gg) });
  items.push({ label: 'New Arrival', action: (gg) => gg.ui.push(newArrivalMenu(gg)) });
  items.push({ label: 'Visit', action: (gg) => gg.ui.push(visitMenu(gg)) });
  items.push({ label: 'Settings', action: (gg) => gg.ui.push(settingsScreen(gg)) });
  items.push({ label: 'About', action: (gg) => gg.ui.push(aboutScreen(gg)) });
  const m = new Menu({ id: 'title', items, x: 160, y: 126, w: 160, itemH: 20, gap: 3, dim: false, dimBack: false, back: () => {}, prompts: [['confirm', 'Select']] });
  m.isTitle = true;
  const baseDraw = m.draw.bind(m);
  m.draw = (gg, hud) => {
    drawLogo(gg, hud);
    if (touch && !gg.inp.keyOrPadSeen) {
      panel(hud, 110, 170, 260, 24, { fill: 'navy', trim: 'sky' });
      drawText(hud, 240, 178, 'Controller or keyboard required', { align: 'center', color: 'white' });
    } else baseDraw(gg, hud);
  };
  const baseUpdate = m.update.bind(m);
  m.update = (gg, inp, dt) => { if (touch && !gg.inp.keyOrPadSeen) { if (inp.confirm || inp.back || inp.nav.up || inp.nav.down || inp.pause) gg.inp.keyOrPadSeen = true; return; } baseUpdate(gg, inp, dt); };
  return m;
}
export function drawLogo(g, hud) {
  const t = g.ctx.time;
  const y = 28 + Math.round(Math.sin(t * 1.3) * 1.5);
  drawText(hud, 240, y + 2, 'Honk If You Owe', { align: 'center', color: 'ink', scale: 4 });
  drawText(hud, 240, y, 'Honk If You Owe', { align: 'center', color: 'sand', scale: 4, shadow: 'plum' });
  drawText(hud, 240, y + 38, 'a village, a goose, and a very long payment plan', { align: 'center', color: 'white', shadow: 'ink' });
}
function newArrivalMenu(g) {
  const items = [
    { label: 'Village Time: a day takes twenty minutes', action: (gg, m) => { gg.ui.pop(m); startNewGame(gg, 'village'); } },
    { label: "Real Clock: your device's time and date", action: (gg, m) => { gg.ui.pop(m); startNewGame(gg, 'real'); } },
    { label: 'Back', action: (gg, m) => gg.ui.pop(m) },
  ];
  return new Menu({ id: 'newArrival', title: 'New Arrival', items, x: 80, y: 90, w: 320, itemH: 22, back: (gg, m) => gg.ui.pop(m), footer: hasSave() ? 'This replaces your saved village when the bus arrives.' : null });
}
export { inRect, textWidth, dim };
