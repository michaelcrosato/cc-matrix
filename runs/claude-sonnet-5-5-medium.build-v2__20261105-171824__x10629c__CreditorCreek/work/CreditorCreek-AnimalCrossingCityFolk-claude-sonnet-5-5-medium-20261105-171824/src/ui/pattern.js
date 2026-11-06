// Pattern studio: a 16x16 pixel editor on the 16 palette colours; 8 slots; pen, fill, mirror, undo; live preview.
import { W, H } from './controls.js';
import { PALETTE } from '../engine.js';
const NAMES = ['ink', 'plum', 'red', 'orange', 'sand', 'lime', 'green', 'teal', 'navy', 'blue', 'sky', 'cyan', 'white', 'mist', 'slate', 'night'];
export const PALETTE_NAMES = NAMES;
export const blankPattern = () => ({ px: new Array(256).fill(12), name: 'Untitled' });
export class PatternStudio {
  constructor(slot) { this.id = 'pattern'; this.slot = slot; this.cx = 8; this.cy = 8; this.col = 2; this.tool = 0; this.mirror = false; this.undo = []; this.freeze = true; this.promise = new Promise(r => { this.resolve = r; }); this.pc = 0; }
  open(ui) { const w = ui.game.world; w.patterns[this.slot] ??= blankPattern(); this.pat = w.patterns[this.slot]; }
  set(i, c) { this.pat.px[i] = c; }
  paint(x, y) { const px = this.pat.px; this.undo.push(px.slice()); if (this.undo.length > 30) this.undo.shift(); if (this.tool === 1) { const t = px[y * 16 + x]; if (t === this.col) return; const q = [[x, y]]; while (q.length) { const [a, b] = q.pop(); if (a < 0 || b < 0 || a > 15 || b > 15 || px[b * 16 + a] !== t) continue; px[b * 16 + a] = this.col; q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } } else { px[y * 16 + x] = this.col; if (this.mirror) px[y * 16 + (15 - x)] = this.col; } }
  tick(ui, dt, active) {
    const d = ui.d, g = ui.game; d.rect(0, 0, W, H, 'night'); d.panel(16, 8, 448, 254, { fill: 'white', trim: 'sand' }); d.text(240, 14, `Pattern studio: slot ${this.slot + 1}`, 'navy', { align: 'center' });
    const gx = 30, gy = 28, cs = 12; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = this.pat.px[y * 16 + x]; d.rect(gx + x * cs, gy + y * cs, cs - 1, cs - 1, NAMES[c]); const hv = ui.hit('g' + x + y, gx + x * cs, gy + y * cs, cs, cs, active); if (hv.over && ui.c.ptr.moved) { this.cx = x; this.cy = y; } if (hv.over && ui.c.ptr.leftDown && this.tool === 0) { this.cx = x; this.cy = y; this.paint(x, y); } else if (hv.click) { this.paint(x, y); } }
    d.rect(gx + this.cx * cs - 1, gy + this.cy * cs - 1, cs + 1, 2, 'white'); d.rect(gx + this.cx * cs - 1, gy + this.cy * cs + cs - 1, cs + 1, 2, 'white'); d.rect(gx + this.cx * cs - 1, gy + this.cy * cs - 1, 2, cs + 1, 'white'); d.rect(gx + this.cx * cs + cs - 1, gy + this.cy * cs - 1, 2, cs + 2, 'white');
    for (let i = 0; i < 16; i++) { const x = 238 + (i % 8) * 24, y = 40 + Math.floor(i / 8) * 24; const hv = ui.hit('c' + i, x, y, 22, 22, active); if (hv.click) this.col = i; d.rect(x - 1, y - 1, 24, 24, i === this.col ? 'red' : 'ink'); d.rect(x, y, 22, 22, NAMES[i]); }
    d.text(238, 92, `Tool: ${['Pen', 'Fill'][this.tool]}   Mirror: ${this.mirror ? 'On' : 'Off'}`, 'navy'); d.text(238, 106, 'Preview:', 'navy'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) d.rect(300 + x * 2, 104 + y * 2, 2, 2, NAMES[this.pat.px[y * 16 + x]]);
    d.rect(238, 140, 60, 40, 'mist'); const L = g.world.look; d.rect(246, 148, 44, 28, NAMES[this.pat.px[(Math.floor(g.t) % 16) * 16 + 5]]); d.text(268, 182, 'On a shirt', 'navy', { align: 'center' });
    d.text(30, 226, 'Move with the stick. Confirm paints. Tool: Square/F. Mirror: Triangle/X. Colour: L1/R1. Undo: L2/Q.', 'navy');
    if (active) { const n = ui.c.nav; if (n.x) this.cx = (this.cx + n.x + 16) % 16; if (n.y) this.cy = (this.cy + n.y + 16) % 16; if (ui.c.pressed('confirm') && !ui.c.input.wasPressed('Enter')) this.paint(this.cx, this.cy); if (ui.c.input.wasPressed('Enter')) this.paint(this.cx, this.cy); if (ui.c.pressed('tool')) { this.tool = 1 - this.tool; } if (ui.c.pressed('alt')) this.mirror = !this.mirror; if (ui.c.pressed('nextTool') || ui.c.input.wasPressed('KeyP')) this.col = (this.col + 1) % 16; if (ui.c.pressed('prevTool') || ui.c.input.wasPressed('KeyO')) this.col = (this.col + 15) % 16; if (ui.c.pressed('camL') && this.undo.length) this.pat.px = this.undo.pop(); if (ui.c.backPressed()) { g.world.patterns[this.slot] = this.pat; ui.pop(this); this.resolve(this.pat); } }
    ui.prompt('confirm', 'Paint'); ui.prompt('back', 'Save');
  }
}
