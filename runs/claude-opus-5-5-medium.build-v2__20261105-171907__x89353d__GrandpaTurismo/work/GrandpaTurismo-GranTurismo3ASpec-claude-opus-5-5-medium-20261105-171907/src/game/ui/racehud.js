// The race HUD. Top-left: position, lap. Top-right: time, best, gap. Bottom-right: speed, gear, revs. Bottom-left: map, tyres, fuel, assist flashes.
import { fmtTime, clean } from './ui.js';
export function miniMap(tr, size) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < tr.N; i++) { x0 = Math.min(x0, tr.x[i]); x1 = Math.max(x1, tr.x[i]); z0 = Math.min(z0, tr.z[i]); z1 = Math.max(z1, tr.z[i]); }
  const k = (size - 2) / Math.max(x1 - x0, z1 - z0), pts = [], w = (x1 - x0) * k, h = (z1 - z0) * k, last = {};
  const map = (x, z) => [Math.round(size - 1 - (x - x0) * k - (size - w) / 2), Math.round(size - 1 - (z - z0) * k - (size - h) / 2)];
  for (let i = 0; i < tr.N; i += 1) { const [px, py] = map(tr.x[i], tr.z[i]), key = `${px},${py}`; if (!last[key]) { last[key] = 1; pts.push(px, py); } }
  return { pts, map, size };
}
export function drawMap(hud, m, x, y, cars, focus) {
  for (let i = 0; i < m.pts.length; i += 2) hud.rect(x + m.pts[i], y + m.pts[i + 1], 1, 1, 'mist');
  for (const c of cars) { if (c === focus) continue; const [px, py] = m.map(c.x, c.z); hud.rect(x + px - 1, y + py - 1, 3, 3, 'ink'); hud.rect(x + px, y + py, 1, 1, c.hudColor ?? 'red'); }
  if (focus) { const [px, py] = m.map(focus.x, focus.z); hud.rect(x + px - 2, y + py - 2, 5, 5, 'ink'); hud.rect(x + px - 1, y + py - 1, 3, 3, 'lime'); }
}
const WEAR = (w) => (w > 0.6 ? 'lime' : w > 0.3 ? 'sand' : w > 0.1 ? 'orange' : 'red');
export function drawRaceHud(hud, s) {
  const { sim, car: c, units, map, compact, tag } = s, W = hud.width, H = hud.height, mph = units === 'mph';
  const box = (x, y, w, h) => hud.rect(x, y, w, h, 'ink');
  const speed = Math.abs(c.u ?? 0) * 3.6 * (mph ? 0.6214 : 1), R = sim?.run;
  // position and lap
  if (!R) {
    box(4, 4, compact ? 62 : 72, 28);
    hud.text(7, 6, `P${c.position}/${sim.cars.length}`, { scale: 2, color: 'sand' });
    hud.text(7, 22, c.lap === 0 ? `LAP -/${sim.laps}` : `LAP ${Math.min(c.lap, sim.laps)}/${sim.laps}`, { color: 'white' });
    box(W - (compact ? 74 : 84), 4, compact ? 70 : 80, 34);
    const t = c.finishT ?? (sim.green && sim.t > c.startT ? sim.t - c.startT : 0), lapT = c.lap > 0 && c.finishT == null ? sim.t - c.lapStart : 0;
    hud.text(W - (compact ? 71 : 81), 6, fmtTime(lapT), { color: 'white' });
    hud.text(W - (compact ? 71 : 81), 16, `B ${fmtTime(c.bestLap)}`, { color: 'mist' });
    if (s.gap != null) hud.text(W - (compact ? 71 : 81), 26, s.gap, { color: s.gapColor ?? 'lime' }); else hud.text(W - (compact ? 71 : 81), 26, `T ${fmtTime(t)}`, { color: 'mist' });
  } else {
    box(4, 4, 100, 18); hud.text(7, 8, clean(R.test.id + ' ' + fmtTime(R.time + R.hits)), { color: 'sand' });
    if (R.hits) hud.text(7, 26, `+${R.hits} S`, { color: 'orange' });
    box(W - 88, 4, 84, 34); const m = R.test.medals; if (m) { hud.text(W - 85, 6, `G ${fmtTime(m.gold)}`, { color: 'sand' }); hud.text(W - 85, 16, `S ${fmtTime(m.silver)}`, { color: 'mist' }); hud.text(W - 85, 26, `B ${fmtTime(m.bronze)}`, { color: 'orange' }); }
  }
  // speed and gear, rev bar with shift light
  const p = c.p, rpmF = Math.min(1, (c.rpm ?? 0) / p.redline), sw = compact ? 72 : 96, sx = W - sw - 4, sy = H - 40;
  box(sx, sy, sw, 36);
  const sp = String(Math.round(speed)).padStart(3, ' ');
  hud.text(sx + 3, sy + 3, sp, { scale: compact ? 2 : 3, color: 'white' });
  hud.text(sx + (compact ? 48 : 74), sy + 3, c.reversing ? 'R' : String(c.gear), { scale: compact ? 2 : 3, color: 'sand' });
  hud.text(sx + 3, sy + 26, mph ? 'MPH' : 'KM/H', { color: 'mist' });
  const segs = 12, seg = Math.floor((sw - 6 - 24) / segs), rs = Math.round(rpmF * segs), flash = rpmF > 0.94;
  for (let i = 0; i < segs; i++) hud.rect(sx + 27 + i * seg, sy + 27, seg - 1, 5, i < rs ? (i >= segs - 2 ? 'red' : i >= segs - 4 ? 'orange' : 'lime') : 'night');
  if (flash && Math.floor(sim.t * 14) % 2) hud.rect(sx + 3, sy - 4, sw - 6, 3, 'red');
  // bottom-left: map, wear, fuel, assists
  const mapSize = map?.size ?? 0, mx = 4, my = H - mapSize - 6;
  if (map) { box(mx, my - 2, mapSize + 4, mapSize + 4); drawMap(hud, map, mx + 2, my, sim.cars.filter((x) => x.visibleOnMap !== false), c); }
  const wx = mx + mapSize + 8, wy = H - 22;
  if (s.showWear !== false) { box(wx, wy, 19, 18); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b], i) => hud.rect(wx + 2 + a * 8, wy + 2 + b * 8, 7, 6, WEAR(c.wear[i]))); }
  if (sim.rules.endurance || s.showFuel) { box(wx + 21, wy, 42, 18); hud.text(wx + 23, wy + 2, 'FUEL', { color: c.fuel < 0.15 ? 'red' : 'mist' }); hud.rect(wx + 23, wy + 11, 38, 4, 'night'); hud.rect(wx + 23, wy + 11, Math.round(38 * c.fuel), 4, c.fuel < 0.15 ? 'red' : 'sky'); }
  let ax = wx + (sim.rules.endurance ? 65 : 21);
  for (const [lab, on] of [['ABS', s.flash?.abs], ['TCS', s.flash?.tcs], ['STB', s.flash?.stb]]) { if (on) { box(ax, wy, 22, 11); hud.text(ax + 2, wy + 2, lab, { color: 'orange' }); ax += 24; } }
  if (c.slip) { box(ax, wy, 28, 11); hud.text(ax + 2, wy + 2, '>>>', { color: 'cyan' }); }
  if (tag) { hud.text(W / 2 - 9, 4, tag, { color: 'orange' }); }
}
export function drawLights(hud, n, cx, y, on) { if (!on) return; const w = 5 * 18; hud.rect(cx - w / 2 - 3, y - 3, w + 6, 22, 'ink'); for (let i = 0; i < 5; i++) { hud.rect(cx - w / 2 + i * 18 + 2, y, 14, 16, i < n ? 'red' : 'night'); } }
export function banner(hud, text, y = 44, c = 'sand', scale = 2) { const t = clean(text), w = t.length * 6 * scale; hud.rect(Math.round(hud.width / 2 - w / 2 - 6), y - 3, w + 12, 7 * scale + 6, 'ink'); hud.text(Math.round(hud.width / 2 - w / 2), y, t, { scale, color: c }); }
