// The operation HUD: top strip, comm strip, tool wheel, rating pop-ups, code blue and massage overlays.
import { mtext, ctext, textW, wrap, bar, ekg, fmtTime, prompts, line, SEAT_PAL, tokens } from './hud.js';
import { WHEEL } from '../input/devices.js';
import { WHO } from '../content/lines.js';
export const TOOL_NAMES = { scalpel: 'SCALPEL', forceps: 'FORCEPS', suture: 'SUTURE', drain: 'DRAIN', syringe: 'SYRINGE', gel: 'GEL', laser: 'LASER', scanner: 'SCANNER', dress: 'DRESSING' };
const ICON = {
  scalpel: ['.....xx', '....xx.', '...xx..', '..xx...', '.xx....', 'xx.....', 'x......'], forceps: ['x.....x', 'xx...xx', '.xx.xx.', '..xxx..', '...x...', '...x...', '...x...'],
  suture: ['..xxx..', '.x...x.', 'x....x.', 'x.....x'.slice(0, 7), '.x....x', '..xxxxx', '.....x.'], drain: ['....xx.', '...xx..', '..xx...', '.xx....', 'xxx....', 'xx.....', 'x......'],
  syringe: ['x......', 'xx.....', '.xxxxx.', '.x...xx', '.xxxxx.', '.....xx', '......x'], gel: ['..xxx..', '..x.x..', '.xxxxx.', '.x...x.', '.x...x.', '.x...x.', '.xxxxx.'],
  laser: ['x.....x', '.x...x.', '..x.x..', 'xxxxxxx', '..x.x..', '.x...x.', 'x.....x'], scanner: ['..xxx..', '.x...x.', 'x.x.x.x', 'x..x..x', 'x.x.x.x', '.x...x.', '..xxx..'],
  dress: ['xxxxxxx', 'x.....x', 'x.xxx.x', 'x.xxx.x', 'x.xxx.x', 'x.....x', 'xxxxxxx'],
};
export function toolIcon(hud, x, y, name, col) { hud.sprite(x, y, ICON[name] || ICON.dress, { x: col }); }
const WHEEL_POS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]; // clockwise from top (square ring)

export function drawWheel(hud, app, op, seat, ox, oy, rects) {
  const S = 16; hud.rect(ox - 1, oy - 1, S * 3 + 2, S * 3 + 2, 'ink'); hud.rect(ox, oy, S * 3, S * 3, 'night');
  WHEEL.forEach((n, i) => {
    const [dx, dy] = WHEEL_POS[i], x = ox + (dx + 1) * S, y = oy + (dy + 1) * S, on = op.unlocked.includes(n), cur = seat.sel === n && seat.tool !== 'dress';
    hud.rect(x + 1, y + 1, S - 2, S - 2, cur ? 'sand' : on ? 'navy' : 'ink');
    toolIcon(hud, x + 4, y + 4, n, cur ? 'ink' : on ? 'white' : 'slate'); hud.text(x + 2, y + 2, String(i + 1), { color: cur ? 'ink' : 'slate', shadow: false });
    rects.push([x, y, S, S, n, on]);
  });
  const cx = ox + S, cy = oy + S; hud.rect(cx + 1, cy + 1, S - 2, S - 2, 'slate'); toolIcon(hud, cx + 4, cy + 4, seat.tool, 'sand');
}
export function drawOpHud(hud, app, view, t) {
  const { sim, def, seat, comm, pops, hint } = view, w = hud.width, h = hud.height, tbv = sim.tables[seat.tb];
  // top strip
  hud.rect(0, 0, w, 20, 'ink'); hud.rect(0, 20, w, 1, 'navy');
  const fake = sim.flags.fakeVitals && !sim.flags.trueVitals; const vit = Math.round(fake ? 99 : tbv.vitals);
  const low = vit < 30, vc = low ? ((t * 4 | 0) % 2 ? 'red' : 'orange') : vit < 55 ? 'sand' : 'lime';
  hud.text(4, 3, String(vit), { scale: 2, color: vc }); hud.text(4 + (vit > 99 ? 36 : vit > 9 ? 24 : 12) + 3, 2, 'VIT', { color: 'mist', shadow: false });
  const bps = 0.8 + (100 - (fake ? 99 : tbv.vitals)) / 80;
  ekg(hud, 40, 2, 70, 16, t, bps, low ? 'red' : 'lime', fake ? 0.35 : 0);
  const clock = fmtTime(sim.clock); hud.text(Math.round(w / 2) - Math.round(textW(hud, clock, 2) / 2), 3, clock, { scale: 2, color: sim.clock < 30 ? 'red' : 'white' });
  if (sim.tables.length > 1) sim.tables.forEach((tb, i) => { const x = Math.round(w / 2) + 44 + i * 27, cur = i === seat.tb; hud.rect(x, 2, 25, 16, cur ? 'sand' : 'navy'); hud.text(x + 3, 3, 'ABC'[i], { color: cur ? 'ink' : 'white', shadow: false }); hud.text(x + 3, 11, String(Math.round(tb.vitals)), { color: tb.vitals < 30 ? (cur ? 'red' : 'orange') : cur ? 'ink' : 'mist', shadow: false }); });
  if (sim.composureShown || sim.awakened) { const cw = 70; hud.text(w - cw - 30, 3, 'COMPOSURE', { color: 'mist', shadow: false }); bar(hud, w - cw - 6, 3, cw, 6, sim.composure / 100, sim.quiet ? 'cyan' : 'sky'); hud.text(w - 28, 11, `STRK ${sim.score.streak}`, { color: sim.score.streak ? 'sand' : 'slate', shadow: false }); }
  else hud.text(w - 70, 3, `SCORE ${Math.max(0, sim.score.pts)}`, { color: 'mist', shadow: false });
  if (sim.cold > 0) { hud.text(w / 2 - 40, 22, 'COLD TIME', { color: 'cyan' }); bar(hud, w / 2 + 4, 22, 70, 6, sim.cold / (sim.coldMax || 120), sim.cold < 30 ? 'red' : 'cyan'); }
  if (sim.heart) { const hh = sim.heart; hud.text(48, 24, `${Math.round(hh.bpm)} BPM`, { color: hh.bpm >= 110 ? 'red' : 'sand' }); const ph = hh.arrest ? 0.9 : hh.phase; hud.rect(48, 33, 40, 4, 'slate'); hud.rect(48, 33, Math.round(40 * 0.35), 4, 'red'); hud.rect(48 + Math.round(40 * 0.35), 33, 40 - Math.round(40 * 0.35), 4, 'green'); hud.rect(48 + Math.round(40 * ph), 31, 2, 8, 'white'); hud.text(92, 32, hh.sys ? 'SYSTOLE' : hh.arrest ? 'ARREST' : 'DIASTOLE', { color: hh.sys ? 'red' : 'lime' }); }
  // hint objective (top-left under strip)
  if (view.objective) hud.text(4, h - 74 > 60 ? 44 : 44, '', {});
  // comm strip
  const nL = w < 400 ? 3 : 2, csH = 22 + nL * 9 + 2; hud.rect(0, h - csH, w, csH, 'ink'); hud.rect(0, h - csH - 1, w, 1, 'navy');
  const who = comm?.who || (def.noVoice ? 'none' : 'reyes'); const nm = (def.noVoice && !comm) ? WHO.none : (WHO[comm?.who] || WHO[who] || '');
  if (!def.noVoice) { hud.rect(3, 33, 40, 1, 'sand'); hud.rect(3, 73, 40, 1, 'sand'); hud.rect(3, 33, 1, 41, 'sand'); hud.rect(42, 33, 1, 41, 'sand'); } view.bustRect = [4, 34, 38, 38];
  hud.text(4, h - csH + 2, nm, { color: def.noVoice ? 'red' : 'sand' });
  if (comm) { const lines = wrap(hud, tokens(app, comm.shown), w - 4 - 112); lines.slice(0, nL).forEach((l, i) => mtext(hud, 4, h - csH + 12 + i * 9, l, { color: 'white', hi: 'sand' })); }
  else if (def.noVoice) hud.text(4, h - csH + 12, 'NO SIGNAL', { color: ((t * 2) | 0) % 2 ? 'red' : 'maroon' });
  // wheel
  view.wheelRects = []; drawWheel(hud, app, sim, seat, w - 52, h - 52, view.wheelRects);
  const doseX = w - 52 - 40; hud.text(doseX, h - 50, 'DOSES', { color: 'mist', shadow: false }); for (let i = 0; i < sim.doses; i++) hud.rect(doseX + (i % 6) * 5, h - 41 + ((i / 6) | 0) * 6, 3, 5, 'lime');
  hud.text(doseX, h - 22 - 6, TOOL_NAMES[seat.tool] || '', { color: 'white' });
  if (seat.syr !== null && seat.syr !== undefined) { const f = Math.min(1, seat.syr / 0.45); bar(hud, doseX, h - 14 - 6, 36, 5, f, f >= 1 ? 'lime' : 'sand'); }
  // pops
  for (const p of pops) { const a = Math.min(1, p.life / 0.3); const y = p.y - (1 - p.life / 1.1) * 14; const col = p.g === 'clean' ? 'lime' : p.g === 'good' ? 'sky' : p.g === 'sloppy' ? 'orange' : 'red'; const tx = p.g === 'mistake' ? 'MISTAKE' : p.g.toUpperCase(); hud.text(Math.round(p.x - textW(hud, tx, 2) / 2), Math.round(y), tx, { scale: 2, color: col, shadow: 'ink' }); if (p.pts) hud.text(Math.round(p.x - 8), Math.round(y) + 15, '+' + p.pts, { color: 'white' }); }
  // streak banner
  if (sim.score.streak >= 3) hud.text(w / 2 - 25, 32, `STREAK X${(Math.min(2, 1 + 0.1 * sim.score.streak)).toFixed(1)}`, { color: 'sand' });
  // hint marker
  if (hint && sim.hintOn) { const b = Math.round(Math.sin(t * 6) * 2); hud.sprite(Math.round(hint[0]) - 3, Math.round(hint[1]) - 14 + b, ['xxxxxxx', '.xxxxx.', '..xxx..', '...x...'], { x: 'sand' }); }
  if (view.stageTitle && t - view.stageTitleT < 2.2) { ctext(hud, 36, view.stageTitle, { scale: 2, color: 'white' }); }
}
import { CAST } from '../content/cast.js';
/** A 28x28 pixel-art talking face for the comm strip (the same cast data and mouth animation as the 3D busts). */
export function drawFace(hud, x, y, id, mouth, emo, t) {
  const c = CAST[id]; if (!c || id === 'none' || id === 'system') { hud.rect(x + 2, y + 2, 24, 24, 'ink'); hud.text(x + 4, y + 10, 'NO', { color: 'red', shadow: false }); return; }
  const col = (n) => n; hud.rect(x, y, 28, 28, 'navy');
  hud.rect(x + 6, y + 6, 16, 18, c.skin); hud.rect(x + 8, y + 24, 12, 4, c.scrub);
  if (c.hair && c.hairStyle !== 'bald') { hud.rect(x + 5, y + 3, 18, 6, c.hair); hud.rect(x + 4, y + 5, 2, 12, c.hair); hud.rect(x + 22, y + 5, 2, 12, c.hair); if (c.hairStyle === 'bun') hud.rect(x + 11, y, 6, 4, c.hair); }
  if (c.cap) hud.rect(x + 4, y + 2, 20, 5, c.cap);
  const blink = ((t * 0.5) % 3.2) > 3.05; const ey = emo === 'angry' || emo === 'stern' ? 1 : 0;
  for (const ex of [9, 17]) { hud.rect(x + ex, y + 11 + ey, 3, blink ? 1 : 3, 0xf8f8f8); if (!blink) hud.rect(x + ex + 1, y + 12 + ey, 1, 2, 0x201018); hud.rect(x + ex - 1, y + 9 + (emo === 'sad' || emo === 'panic' ? -1 : ey), 5, 1, c.brows === 'fierce' ? 0x101010 : (c.hair || 0x4a3a2a)); }
  if (c.glasses) { hud.rect(x + 8, y + 10, 5, 5, c.glasses); hud.rect(x + 9, y + 11, 3, 3, c.skin); hud.rect(x + 16, y + 10, 5, 5, c.glasses); hud.rect(x + 17, y + 11, 3, 3, c.skin); }
  if (c.moustache) hud.rect(x + 9, y + 18, 10, 2, c.moustache);
  const mo = Math.round(mouth * 3); hud.rect(x + 11, y + 20 + (c.moustache ? 1 : 0), 6, 1 + mo, emo === 'smile' ? 0xa03030 : 0x7a2030);
}
export function drawCodeBlue(hud, app, sim, t) {
  const cb = sim.cb, w = hud.width, h = hud.height; if (!cb) return;
  hud.rect(0, 0, w, h, 'ink'); if (cb.flash > 0) hud.rect(0, 0, w, h, 'white');
  ctext(hud, 28, cb.fib ? 'FIBRILLATION' : 'CODE BLUE', { scale: 3, color: 'red' });
  // flatline
  line(hud, 20, 80, w - 20, 80, 'lime'); const x = ((t * 80) % (w - 40)) + 20; hud.rect(x, 76, 3, 8, 'white');
  const bw = 260, bx = Math.round((w - bw) / 2), by = 110; hud.rect(bx - 2, by - 2, bw + 4, 24, 'slate'); hud.rect(bx, by, bw, 20, 'night');
  const zw = Math.round(bw * app_zone(sim)), zc = Math.round(bw * 0.7); hud.rect(bx + zc - Math.round(zw / 2), by, zw, 20, 'green');
  const nx = bx + Math.round(bw * cb.pos); hud.rect(nx - 1, by - 5, 3, 30, cb.charging ? 'white' : 'mist');
  ctext(hud, 142, cb.charging ? 'RELEASE IN THE GREEN' : 'HOLD BOTH TRIGGERS TO CHARGE', { color: 'white' });
  ctext(hud, 156, `GOOD SHOCKS ${cb.goods}/${cb.need ?? 2}`, { color: 'sand' }); ctext(hud, 168, `TIME ${Math.max(0, cb.left).toFixed(1)}`, { color: cb.left < 4 ? 'red' : 'mist' });
  prompts(hud, app, [{ act: 'paddles', label: 'CHARGE' }], 'center', h - 40);
}
import { cfg } from '../core/config.js';
const app_zone = () => cfg.codeBlueZone;
export function drawMass(hud, app, sim, t) {
  const m = sim.mass, h = sim.heart; if (!m) return; const w = hud.width;
  ctext(hud, 40, 'CARDIAC ARREST - MASSAGE', { scale: 2, color: 'red' }); ctext(hud, 62, `ALTERNATE ON THE BEAT  ${m.n}/${m.need}`, { color: 'white' });
  const ph = h ? h.phase : 0; const r = 14 + Math.round(Math.max(0, 1 - ph * 3) * 10); const cx = Math.round(w / 2), cy = 110;
  for (let a = 0; a < 6.28; a += 0.08) hud.rect(Math.round(cx + Math.cos(a) * 24), Math.round(cy + Math.sin(a) * 24), 1, 1, 'slate'); for (let a = 0; a < 6.28; a += 0.1) hud.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2, ph < 0.25 || ph > 0.75 ? 'lime' : 'red');
  hud.text(cx - 36, cy - 3, m.last === 'L' ? 'NOW: RIGHT' : 'NOW: LEFT', { color: 'sand' });
  prompts(hud, app, [{ act: 'paddles', label: 'ALTERNATE LEFT / RIGHT' }], 'center', 140);
}
