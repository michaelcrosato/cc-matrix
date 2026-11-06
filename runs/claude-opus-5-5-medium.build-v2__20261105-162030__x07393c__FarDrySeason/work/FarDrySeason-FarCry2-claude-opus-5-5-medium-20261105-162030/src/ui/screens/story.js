// story screens.
import { ABOUT } from '../../content/about.js';
import { ENDINGS } from '../../content/dialogue.js';
import { GAME_TITLE } from '../../content/title.js';
import { wrap } from '../pixfont.js';
export function ledgerScreen(g) {
  return { id: 'ledger', cover: 'ink', footer: [['back', 'BACK']], items: [], draw() { const h = g.ctx.hud, l = g.ledgerNow(); h.text(0, 30, 'THE LEDGER', { anchor: 'top', scale: 2, color: 'sand' }); h.text(0, 50, 'IN HIS HAND, NOT YOURS', { anchor: 'top', color: 'mist' }); g.ledgerLines(l).forEach(([k, v], i) => { h.text(40, 76 + i * 26, k, { color: 'mist' }); h.text(h.width - 40 - v.length * 12, 72 + i * 26, v, { scale: 2, color: 'white' }); }); } };
}
export function gameOverScreen(g, text) {
  return { id: 'game-over', cover: 'ink', back: null, sub: text, title: 'THE PAPERWORK', titleColor: 'red', top: 120, items: [...(g.save.exists() ? [{ label: 'CONTINUE', action: () => g.continueGame() }] : []), { label: 'TITLE', action: () => g.toTitle() }] };
}
export function endingScreen(g) {
  const text = ENDINGS[g.story.ending ?? 'walk'];
  return { id: 'ending', cover: 'ink', back: null, footer: [['confirm', 'THE LEDGER']], items: [{ label: '', hidden: true, action: () => g.ui.replace(finalLedger(g)) }], top: 200, draw() { const h = g.ctx.hud; wrap(text.toUpperCase(), 52).forEach((l, i) => h.text(0, 70 + i * 16, l, { anchor: 'top', color: 'white' })); } };
}
export function finalLedger(g) { const s = ledgerScreen(g); s.id = 'final-ledger'; s.items = [{ label: '', hidden: true, action: () => g.ui.replace(creditsScreen(g)) }]; s.footer = [['confirm', 'CREDITS']]; s.back = null; s.top = 220; return s; }
export function creditsScreen(g) {
  return { id: 'credits', cover: 'ink', back: null, top: 215, footer: [['confirm', 'OK']], items: [{ label: 'TO THE TITLE', action: () => g.afterCredits() }], draw() { const h = g.ctx.hud; h.text(0, 30, GAME_TITLE.toUpperCase(), { anchor: 'top', scale: 3, color: 'sand' }); h.text(0, 66, 'A MAP IS A PROMISE MADE BY SOMEONE WHO HAS ALREADY LEFT.', { anchor: 'top', color: 'mist' }); ABOUT.credits.forEach((c, i) => h.text(0, 90 + i * 12, c, { anchor: 'top', color: 'white' })); } };
}
