// World HUD: date and time top-left, beans top-right, tool bottom-left, context prompt bottom-right. Fades when idle.
import { W, H } from '../ui/controls.js';
import { dateLine, fmtClock, SEASONS, DAY_TYPES } from '../core/calendar.js';
import { textWidth } from '../ui/draw.js';
import { item } from '../data/items.js';
import { drawIcon } from '../ui/icons.js';
import { groundHeight } from '../world/townMap.js';
export const hud = {
  draw(g, d) {
    if (g.mode === 'attract') { const pulse = Math.floor(g.ui.t * 2) % 2; d.rect(W - 74, 12, 62, 14, 'red'); d.text(W - 43, 15, 'DEMO', 'white', { align: 'center' }); if (pulse) { const m = g.touchOnly ? 'Controller or keyboard required' : 'Press any button'; d.rect(W / 2 - textWidth(m) / 2 - 8, H - 30, textWidth(m) + 16, 16, 'night'); d.text(W / 2, H - 26, m, 'sand', { align: 'center' }); } }
    if (g.mode !== 'play' && g.mode !== 'attract') return; const w = g.world; if (!w || g.hideHud) return;
    const ui = g.ui; const key = [w.beans, w.toolSel, Math.floor(w.min / 10), g.prompt?.label].join('|'); if (key !== this.key) { this.key = key; this.shown = 6; }
    this.shown = (this.shown ?? 6) - 1 / 60; const idle = ui.busy ? 1 : 0; const a = this.shown > 0 || idle ? 1 : 0.35;
    const fill = a > 0.5 ? 'night' : 'night';
    const t = dateLine(w.day, w.min); const tw = textWidth(t) + 14; d.rect(12, 12, tw, 16, fill); d.text(19, 16, t, a > 0.5 ? 'white' : 'mist');
    const wx = g.weather; const wl = { sun: 'Sunny', clear: 'Clear', rain: 'Rain', storm: 'Storm', fog: 'Fog', wind: 'Windy', snow: 'Snow' }[wx]; d.rect(12, 30, textWidth(wl) + 14, 14, fill); d.text(19, 33, wl, 'sky');
    const b = `${w.beans} beans`; const bw = textWidth(b) + 14; d.rect(W - 12 - bw, 12, bw, 16, fill); d.text(W - 19, 16, b, 'sand', { align: 'right' });
    if (w.debt > 0 && g.flags.showDebt !== false && w.flags.debtKnown) { const db = `Owed: ${w.debt}`; const dw = textWidth(db) + 14; d.rect(W - 12 - dw, 30, dw, 14, fill); d.text(W - 19, 33, db, 'red', { align: 'right' }); }
    const tool = w.tools[w.toolSel]; if (tool) { d.rect(12, H - 36, 88, 24, fill); drawIcon(d, 18, H - 32, 'tool_' + tool, 2); d.text(46, H - 28, item(tool).name, 'white'); }
    if (g.errandLine) { const lines = g.errandLine; const ew = Math.max(...lines.map(textWidth)) + 14; d.rect(12, 50, ew, lines.length * 12 + 6, fill); lines.forEach((l, i) => d.text(19, 53 + i * 12, l, i === 0 ? 'sand' : 'white')); }
    if (g.prompt && !ui.busy) { const p = g.prompt; const pw = textWidth(p.label) + 40; const x = W - 12 - pw, y = H - 38; d.rect(x, y, pw, 16, 'night'); const gw = d.glyph(x + 6, y + 3, p.glyph ?? { ps: 'cross', xb: 'A', kb: 'E' }, ui.dev, ui.glyphs); d.text(x + 6 + gw + 4, y + 4, p.label, 'white'); }
    if (g.fireworkPattern) { const fp = g.fireworkPattern; fp.t -= 1 / 60; const names = ['ink','plum','red','orange','sand','lime','green','teal','navy','blue','sky','cyan','white','mist','slate','night']; const sz = 5; const x0 = W / 2 - 40, y0 = 30; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = fp.pat.px[y * 16 + x]; if (c !== 12 && c !== 15) d.rect(x0 + x * 5, y0 + y * 5, 5, 5, names[c]); } }
    if (g.busText?.text) { d.rect(40, H - 60, W - 80, 24, 'night'); d.text(W / 2, H - 52, g.busText.text, 'sand', { align: 'center' }); }
    if (g.place === 'town' && !ui.busy) { const cam = g.ctx.camera.camera; for (const n of g.npcs.list) { if (n.sleeping || !n.bubble || n.bubble.t <= 0) continue; if (Math.hypot(n.pos.x - g.player.pos.x, n.pos.z - g.player.pos.z) > 3) continue; const v = new (g.cam3 ??= g.ctx.camera.camera.position.constructor)(n.pos.x, 2.3, n.pos.z).project(cam); const bx = (v.x + 1) / 2 * W, by = (1 - v.y) / 2 * H; const tw = textWidth(n.bubble.text) + 8; d.rect(bx - tw / 2, by - 12, tw, 12, 'white'); d.text(bx, by - 9, n.bubble.text, 'ink', { align: 'center' }); } }
    if (g.toolRingT > 0 && w.tools.length && !ui.busy) { g.toolRingT -= 1 / 60; const cam = g.ctx.camera.camera; const v = new (g.cam3 ??= cam.position.constructor)(g.player.pos.x, 1.0, g.player.pos.z).project(cam); const cx = (v.x + 1) / 2 * W, cy = (1 - v.y) / 2 * H; w.tools.forEach((t, i) => { const a = i / w.tools.length * Math.PI * 2 - Math.PI / 2; const x = cx + Math.cos(a) * 34 - 10, y = cy + Math.sin(a) * 26 - 10; d.rect(x - 2, y - 2, 24, 24, i === w.toolSel ? 'red' : 'night'); d.rect(x, y, 20, 20, i === w.toolSel ? 'sand' : 'slate'); drawIcon(d, x + 2, y + 2, 'tool_' + t, 2); }); d.text(cx, cy + 44, item(w.tools[w.toolSel]).name, 'white', { align: 'center', shadow: 'ink' }); }
    if (!ui.busy) g.sys.favours.drawMarkers(g, d);
    if (g.place === 'town' && !ui.busy && g.mode === 'play') { const pp = g.player, ff = pp.facing ?? { x: 0, z: 1 }; const tx = Math.floor(pp.pos.x + ff.x * 0.9), tz = Math.floor(pp.pos.z + ff.z * 0.9); const cam = g.ctx.camera.camera; const P4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => { const v = new (g.cam3 ??= cam.position.constructor)(tx + a, groundHeight(tx + .5, tz + .5), tz + b).project(cam); return [Math.round((v.x + 1) / 2 * W), Math.round((1 - v.y) / 2 * H)]; }); const col = ui.dev === 'kb' ? 'white' : 'sand'; for (let i = 0; i < 4; i++) { const [x0, y0] = P4[i], [x1, y1] = P4[(i + 1) % 4]; const n = 8; for (let k = 0; k <= n; k++) { d.rect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1, col); } } }
    if (!ui.busy && g.sys.interact.target?.at && g.place === 'town') { const cam = g.ctx.camera.camera; const tt = g.sys.interact.target; const v = new (g.cam3 ??= cam.position.constructor)(tt.at[0], 2.0, tt.at[1]).project(cam); const bx = Math.round((v.x + 1) / 2 * W), by = Math.round((1 - v.y) / 2 * H + Math.abs(Math.sin(g.t * 5)) * 3); d.hud.sprite(bx - 4, by - 12, ['#######', '.#####.', '..###..', '...#...'], { '#': 'white' }, { shadow: false }); d.hud.sprite(bx - 3, by - 11, ['.#####.', '..###..', '...#...'], { '#': 'red' }, { shadow: false }); }
    if (g.hoverTip && g.ui.c.device === 'kb') { const tip = g.hoverTip; const px = g.ui.c.ptr.x + 10, py = g.ui.c.ptr.y + 12; const tw = textWidth(tip.label) + 10; d.rect(px, py, tw, 13, 'night'); d.text(px + 5, py + 3, tip.label, 'white'); }
    if (g.banner) { const bt = g.banner.text; const bw2 = textWidth(bt) * 2 + 24; d.hud.text(W / 2, 70, bt, { anchor: 'top', scale: 2, color: 'white', shadow: 'ink' }); }
  },
};
