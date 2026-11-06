// Things many screens share: money, the status strip, a car's spec panel, medals, mini-maps, tumbleweeds.
import { CAR_INFO, LAYOUT_WORDS } from '../../data/cars.js';
import { carEntry, licenceTier } from '../../sim/career.js';
import { specOf } from '../../sim/tuning.js';
import { LICENCES } from '../../data/licences.js';
import { buildTrack } from '../../sim/sim.js';
import { TRACKS } from '../../data/tracks.js';
export const cr = (n) => `${Math.round(n).toLocaleString('en-US')} CR`;
export const num = (n) => Math.round(n).toLocaleString('en-US');
export function statusStrip(ui, app) {
  const p = app.profile, car = carEntry(p), t = licenceTier(p), w = ui.w;
  ui.panel(0, 0, w, 15, { color: 'ink', border: false });
  ui.text(6, 4, cr(p.credits), { color: 'sand' });
  ui.text(w * 0.33, 4, `DAY ${p.day}`, { color: 'mist' });
  ui.text(w * 0.46, 4, t ? `LICENCE ${LICENCES[t].name}` : 'NO LICENCE', { color: t ? 'lime' : 'slate' });
  ui.text(w - 6, 4, car ? CAR_INFO[car.carId].short : 'NO CAR', { align: 'right', color: car ? 'white' : 'slate' });
}
// Marque badges: a swallow, a thunderbolt, a castle, a B, an ox's horns, a compass, and the works' kingfisher.
const BADGES = {
  tsubame: { c: 'sky', rows: ['x.......x', 'xx.....xx', '.xx...xx.', '..xx.xx..', '...xxx...', '....x....', '...x.x...'] },
  kaminari: { c: 'sand', rows: ['....xxx..', '...xxx...', '..xxxxx..', '....xx...', '...xx....', '..xx.....', '..x......'] },
  castellan: { c: 'lime', rows: ['x.x.x.x.x', 'xxxxxxxxx', '.xxxxxxx.', '.xxx.xxx.', '.xxx.xxx.', '.xxxxxxx.', '.xxxxxxx.'] },
  brandt: { c: 'mist', rows: ['xxxxxxx..', 'xx....xx.', 'xx...xx..', 'xxxxxx...', 'xx...xx..', 'xx....xx.', 'xxxxxxx..'] },
  ironwood: { c: 'orange', rows: ['x.......x', 'x.......x', '.x.....x.', '..xxxxx..', '..xxxxx..', '...xxx...', '....x....'] },
  vespucci: { c: 'red', rows: ['....x....', '...xxx...', '..x.x.x..', 'xxxxxxxxx', '..x.x.x..', '...xxx...', '....x....'] },
  halcyon: { c: 'cyan', rows: ['...xxx...', '..xxxxx..', 'xxxxxxx..', '..xxxxxxx', '..xxxxx..', '...xxx...', '...x.x...'] },
};
export const marqueBadge = (ui, x, y, marque) => { const b = BADGES[marque]; if (b) ui.sprite(x, y, b.rows, { x: b.c }); };
// A spec card: name, year, layout, PS, kg, then a price or more. At most six numbers.
export function specCard(ui, x, y, w, carId, install, o = {}) {
  const i = CAR_INFO[carId], s = specOf(carId, install), rows = [['YEAR', String(i.year)], ['LAYOUT', s.layout + (s.turbo ? ' TURBO' : '')], ['POWER', `${s.ps} PS`], ['WEIGHT', `${s.kg} KG`], ...(o.extra ?? [])];
  const h = 25 + rows.length * 10 + (o.foot ? 12 : 0);
  ui.panel(x, y, w, h, { color: 'ink', border: 'slate' });
  marqueBadge(ui, x + w - 15, y + 13, i.marque);
  ui.text(x + 6, y + 5, i.name.length * 6 > w - 12 ? i.short : i.name, { color: 'sand' });
  ui.text(x + 6, y + 14, LAYOUT_WORDS[s.layout] ?? '', { color: 'slate' });
  rows.forEach(([k, v], n) => { ui.text(x + 6, y + 25 + n * 10, k, { color: 'mist' }); ui.text(x + w - 6, y + 25 + n * 10, v, { align: 'right' }); });
  if (o.foot) ui.text(x + w - 6, y + h - 11, o.foot, { align: 'right', color: o.footColor ?? 'sand' });
  return h;
}
const MEDAL = ['..xxxxx..', '.xoooooo.', 'xoooooooo', 'xooooooox', 'xooooooox', 'xooooooox', 'xooooooox', '.xoooooo.', '..xxxxx..'];
const COLS = { gold: ['orange', 'sand'], silver: ['slate', 'mist'], bronze: ['plum', 'orange'], none: ['night', 'ink'] };
export function medalIcon(ui, x, y, medal) { const c = COLS[medal ?? 'none']; ui.sprite(x, y, MEDAL, { x: c[0], o: c[1] }); }
export const MEDAL_NAME = { gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE' };
// Mini-maps for tracks, drawn in dots and cached.
const MAPS = new Map();
export function trackDots(id, size) {
  const key = `${id}:${size}`; if (MAPS.has(key)) return MAPS.get(key);
  const tr = buildTrack(TRACKS[id]); let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (let i = 0; i < tr.N; i++) { a = Math.min(a, tr.x[i]); b = Math.max(b, tr.x[i]); c = Math.min(c, tr.z[i]); d = Math.max(d, tr.z[i]); }
  const k = (size - 2) / Math.max(b - a, d - c), seen = new Set(), pts = []; for (let i = 0; i < tr.N; i += 2) { const x = Math.round((b - tr.x[i]) * k), y = Math.round((tr.z[i] - c) * k), q = x * 1000 + y; if (!seen.has(q)) { seen.add(q); pts.push(x, y); } }
  const out = { pts, w: Math.round((b - a) * k) + 2, h: Math.round((d - c) * k) + 2, length: tr.length, corners: tr.cornerS.length, name: TRACKS[id].name };
  MAPS.set(key, out); return out;
}
export function miniMap(ui, x, y, id, size, col = 'mist') { const m = trackDots(id, size); for (let i = 0; i < m.pts.length; i += 2) ui.hud.rect(x + m.pts[i], y + m.h - m.pts[i + 1] - 1, 1, 1, col); return m; }
// A small tumbleweed, rolling. The game's name has to come from somewhere.
const W = [['..o.o.o..', '.o.ooo.o.', 'oo.o.o.oo', '.ooo.ooo.', 'o.o.o.o.o', '.ooo.ooo.', 'oo.o.o.oo', '.o.ooo.o.', '..o.o.o..'], ['...oo.o..', '.oo.o.oo.', 'o.ooo.o.o', '.o.o.oo..', 'oo.ooo.oo', '..oo.o.o.', 'o.o.ooo.o', '.oo.o.oo.', '..o.oo...']];
export const tumbleweed = (ui, x, y, f, col = 'orange') => ui.sprite(x, y, W[Math.abs(Math.floor(f)) % 2], { o: col });
// A simple modal: a question, then buttons.
export class Dialog {
  constructor(app, title, lines, buttons) { this.id = 'dialog'; this.app = app; this.title = title; this.lines = lines; this.buttons = buttons; }
  draw(ui) {
    this.under?.draw?.(ui, 0);
    ui.items.length = 0; ui.clicks.length = 0;
    const w = Math.min(ui.w - 30, 320), h = 40 + this.lines.length * 10 + 22, x = Math.round(ui.cx - w / 2), y = Math.round(ui.h / 2 - h / 2);
    ui.panel(x, y, w, h, { color: 'ink', border: 'sand' });
    ui.text(ui.cx, y + 8, this.title, { align: 'center', color: 'sand' });
    this.lines.forEach((l, i) => ui.text(ui.cx, y + 22 + i * 10, l, { align: 'center' }));
    const bw = Math.floor((w - 20 - (this.buttons.length - 1) * 6) / this.buttons.length);
    this.buttons.forEach(([id, label, fn], i) => ui.button(id, x + 10 + i * (bw + 6), y + h - 22, bw, 15, label, { confirm: fn }));
    ui.prompts([['confirm', 'OK'], ['back', 'BACK']]);
  }
}
