// The hub lobby card.
import { BURNING } from '../world/fire.js';
import { GAME_TITLE } from '../content/title.js';
import { glyphWidth } from '../ui/glyphs.js';
import { wrap } from '../ui/pixfont.js';
const TRUCK = [150, -225];
function colorName(hex) { return { '#e8443a': 'red', '#3b82f6': 'blue', '#22c55e': 'green', '#f5b700': 'sand' }[hex] ?? 'mist'; }
export class CardPart {
  padCard() {
    const g = this.game, input = g.ctx.input;
    if (input.wasPressed('PadCross')) this.s.answer('ready');
    if (input.wasPressed('PadTriangle')) this.s.answer('more');
    for (const e of input.buttonEvents) if (!e.down) { const [x, y] = g.ui.pointerXY(e); if (y > g.ctx.hud.height - 32 && y < g.ctx.hud.height - 10) this.s.answer(x < g.ctx.hud.width / 2 ? 'ready' : 'more'); }
  }
  /** The card reflows: a hub frame can be any shape. */
  drawCard() {
    const g = this.game, h = g.ctx.hud, c = this.card, W = h.width, H = h.height, cols = Math.floor((W - 16) / 6);
    const goal = [...wrap('CARRY THE MOST DIAMOND CASES OUT OF THE BURNING MINE.', cols).map((t) => [t, 'white']), ...wrap('ONE CASE AT A TIME, TO THE TRUCK SOUTH OF THE PIT. FRIENDLY FIRE IS ON.', cols).map((t) => [t, 'mist'])];
    // Controls flow onto as many rows as the width needs.
    const CONTROLS = [['fire', 'FIRE'], ['aim', 'AIM'], ['use', 'USE'], ['throw', 'BOTTLE'], ['heal', 'SYRETTE']], rows = [[]];
    let run = 8; for (const k of CONTROLS) { const w = glyphWidth(g.hud.glyph(k[0])) + 3 + k[1].length * 6 + 8; if (run + w > W - 8 && rows.at(-1).length) { rows.push([]); run = 8; } rows.at(-1).push(k); run += w; }
    const btnY = H - 30, ctlY = btnY - 4 - rows.length * 13, goalY = ctlY - 4 - goal.length * 10, panel = goalY - 4;
    h.rect(0, 0, W, 34, 'ink'); h.rect(0, panel, W, H - panel, 'ink');
    h.text(0, 8, GAME_TITLE.toUpperCase(), { anchor: 'top', scale: 2, color: 'sand' });
    if (c) { const left = c.left === null ? (c.paused ? 'HELD' : 'GO') : `${Math.ceil(c.left / 1000)}`; h.text(8, 12, left, { anchor: 'top-right', color: 'sand' }); }
    const perRow = Math.max(1, Math.floor((W - 16) / 100));
    this.order.forEach((id, i) => { const P = this.P[id], ready = c?.ready?.includes(id), x = 8 + (i % perRow) * Math.floor((W - 16) / perRow), y = 40 + Math.floor(i / perRow) * 11; h.rect(x, y, 6, 7, colorName(P.color)); h.text(x + 9, y, `${P.name.slice(0, Math.floor((Math.floor((W - 16) / perRow) - 12) / 6) - (ready ? 3 : 0))}${ready ? ' OK' : ''}`, { color: ready ? 'lime' : 'white' }); });
    goal.forEach(([t, color], i) => h.text(0, goalY + i * 10, t, { anchor: 'top', color }));
    rows.forEach((row, i) => { let px = 8; for (const [a, t] of row) px += g.hud.promptAt(px, ctlY + i * 13, a, t) + 8; });
    const bw = Math.floor((W - 24) / 2);
    h.rect(8, btnY, bw, 18, c?.ready?.includes(this.me) ? 'green' : 'orange'); g.hud.promptAt(13, btnY + 4, 'confirm', 'READY');
    h.rect(16 + bw, btnY, bw, 18, 'night'); if (g.device === 'pad') g.hud.promptAt(21 + bw, btnY + 4, 'next', 'MORE TIME'); else { h.text(21 + bw, btnY + 6, '[M] MORE TIME', { color: 'white' }); g.hud.prompts.push('[M] MORE TIME'); }
    if (c?.asking) h.text(0, H - 10, `${c.asking} ASKED FOR MORE TIME`, { anchor: 'top', color: 'mist' });
  }
}
