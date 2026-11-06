// title screens.
import { EPIGRAPHS } from '../../content/dialogue.js';
import { aboutScreen } from '../about.js';
import { settingsScreen } from './pause.js';
import { cashRunScreen } from './round.js';
export function pressScreen(g) {
  return { id: 'press', cover: false, dim: false, footer: false, back: null, items: [], update() { if (g.anyMenuPress()) { g.ui.replace(mainScreen(g)); g.audio.play('ui-confirm'); } },
    draw() { const h = g.ctx.hud; g.drawTitle(); const y = h.height - 58, gl = g.hud.glyph('confirm'); h.text(0, y, 'PRESS', { anchor: 'top', color: 'white' }); g.hud.promptAt((h.width >> 1) - 16, y + 12, 'confirm', 'START'); void gl; } };
}
export function mainScreen(g) {
  const items = () => [
    ...(g.save.exists() ? [{ label: 'CONTINUE', action: () => g.continueGame() }] : []),
    { label: 'NEW GAME', action: () => g.newGame() },
    { label: 'CASH RUN', action: () => g.ui.push(cashRunScreen(g)) },
    { label: 'SETTINGS', action: () => g.ui.push(settingsScreen(g)) },
    { label: 'ABOUT AND CREDITS', action: () => g.ui.push(aboutScreen(g)) },
  ];
  return { id: 'main', top: 112, dim: false, items, back: () => g.ui.replace(pressScreen(g)), draw() { g.drawTitle(true); } };
}
export function loadingEpigraph(g) { return EPIGRAPHS[g.ctx.random.fork('epigraph').int(0, EPIGRAPHS.length - 1)]; }
