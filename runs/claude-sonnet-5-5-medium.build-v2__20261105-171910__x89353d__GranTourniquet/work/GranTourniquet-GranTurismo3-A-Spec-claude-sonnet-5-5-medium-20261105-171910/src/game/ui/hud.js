// The race HUD (plan section 7). Middle of the screen stays clear.
import { App, speedStr, unitStr, fmtTime, fmtGap } from '../app.js';
const wearCol = (w) => (w > 0.6 ? 'lime' : w > 0.3 ? 'sand' : 'red');
export function drawRaceHud(ui, sc, dt) {
  const hud = ui.hud, W = ui.W, H = ui.H, sim = sc.sim, car = sc.focus, c = car.c, p = car.p, compact = sc.compact || W < 300;
  const sx = compact ? 0.8 : 1, pos = car.positionNow, total = sim.cars.length;
  // top-left: position and lap
  if (sc.mode !== 'test' && sc.mode !== 'trial' && !(sc.sim.setup.rally)) { ui.text(8, 7, `P${pos}/${total}`, { scale: compact ? 1 : 2, color: 'sand' }); ui.text(8, compact ? 18 : 25, `LAP ${Math.min(sim.laps, Math.max(1, car.crossings))}/${sim.laps}`, { color: 'white' }); }
  else if (sc.sim.setup.rally) { ui.text(8, 7, 'RALLY LEG ' + (sc.cfg.leg ?? 1), { scale: compact ? 1 : 1, color: 'sand' }); }
  else ui.text(8, 7, sc.mode === 'test' ? sc.test?.id + ' ' + sc.test?.title : 'TIME TRIAL', { color: 'sand' });
  // top-right: times
  const rt = sc.raceTime(), best = car.bestLap;
  ui.text(W - 8 - ui.width('TIME ' + fmtTime(rt)), 7, 'TIME ' + fmtTime(rt), { color: 'white' });
  if (isFinite(best)) ui.text(W - 8 - ui.width('BEST ' + fmtTime(best)), 17, 'BEST ' + fmtTime(best), { color: 'lime' });
  const gap = sc.gapText(); if (gap) ui.text(W - 8 - ui.width(gap.s), 27, gap.s, { color: gap.c });
  if (sc.penaltyText) ui.text(W - 8 - ui.width(sc.penaltyText), 37, sc.penaltyText, { color: 'orange' });
  // bottom-right: speed and gear
  const sp = String(speedStr(Math.hypot(c.vx, c.vz))), gear = c.gear;
  const gx = W - 12, gy = H - 52; ui.text(gx - ui.width(sp, 3), gy, sp, { scale: 3, color: 'white' }); ui.text(gx - ui.width(unitStr()), gy + 23, unitStr(), { color: 'mist' });
  const gs = c.shift > 0 ? '-' : (c.rev || car.inp.reverse ? 'R' : String(gear)); ui.text(gx - ui.width(sp, 3) - 30, gy, gs, { scale: 3, color: sc.focusAuto ? 'sky' : 'sand' }); ui.text(gx - ui.width(sp, 3) - 30, gy - 9, sc.focusAuto ? 'AUTO' : 'MANUAL', { color: 'mist' });
  // rev bar
  const bx = W - 130, by = H - 24, seg = 20, frac = Math.min(1.05, c.rpm / p.redline);
  for (let i = 0; i < seg; i++) { const on = i / seg < frac; const col = i > seg * 0.84 ? 'red' : i > seg * 0.7 ? 'orange' : 'sand'; hud.rect(bx + i * 6, by, 5, 5, on ? col : 'night'); }
  if (c.rpm > p.upshift * 0.985 && sc.t % 0.2 < 0.1) hud.rect(bx - 12, by - 1, 8, 7, 'red');
  // bottom-left: map + tyres + fuel
  const ms = compact ? 50 : 62; drawMiniMap(ui, sc, 8, H - ms - 24, ms);
  const tx = 8 + ms + 8, tyy = H - ms - 22; ui.text(tx, tyy, 'TYRES', { color: 'mist' }); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b], i) => hud.rect(tx + a * 8, tyy + 10 + b * 8, 7, 7, wearCol(c.wear[i])));
  if (sc.showFuel) { ui.text(tx, tyy + 30, 'FUEL', { color: 'mist' }); hud.rect(tx, tyy + 40, 36, 5, 'night'); hud.rect(tx, tyy + 40, Math.round(36 * c.fuel), 5, c.fuel > 0.2 ? 'lime' : 'red'); }
  // aid flashes
  const fl = sc.flash; let fx = 8; for (const [k, label] of [['abs', 'ABS'], ['tcs', 'TCS'], ['stb', 'STB']]) if (fl[k] > 0) { ui.text(fx, H - 22, label, { color: 'orange' }); fx += 22; }
  if (car.slip) ui.text(W / 2 - 18, H - 40, 'SLIPSTREAM', { color: 'cyan' });
  if (App.dev.on) { ui.text(W / 2 - 8, 2, 'DEV', { color: 'red' }); }
  // centre-top messages
  if (sc.message && sc.messageT > 0) ui.center(compact ? 20 : 34, sc.message, { scale: 2, color: sc.messageColour ?? 'white' });
  if (car.wrongWay) ui.center(60, 'WRONG WAY', { scale: 2, color: 'red' });
  if (car.pitState) { const ps = car.pitState; ui.center(52, ps.phase === 'service' ? `PIT ${ps.t.toFixed(1)}` : 'PIT', { scale: 2, color: 'sand' }); if (ps.phase === 'service' && ps.tyres) ui.center(72, 'CIRCLE: SKIP TYRES', { color: 'mist' }); }
  if (sc.recoverProgress > 0) { ui.center(H / 2 + 40, 'RECOVERING', { color: 'sand' }); hud.rect(W / 2 - 30, H / 2 + 52, Math.round(60 * sc.recoverProgress), 3, 'sand'); }
  // start lights
  if (sim.state === 'grid' && sim.setup.start === 'standing') { const n = Math.min(5, Math.floor(sim.lightT / 1)); for (let i = 0; i < 5; i++) hud.rect(W / 2 - 40 + i * 18, 40, 14, 14, i < n ? 'red' : 'night'); }
}
export function drawMiniMap(ui, sc, x, y, s) {
  const tr = sc.sim.tr, hud = ui.hud; if (!sc.mapPts) { const pts = []; let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9; for (let i = 0; i < tr.N; i += 3) { pts.push([tr.x[i], tr.z[i]]); mnx = Math.min(mnx, tr.x[i]); mxx = Math.max(mxx, tr.x[i]); mnz = Math.min(mnz, tr.z[i]); mxz = Math.max(mxz, tr.z[i]); } const k = (s - 6) / Math.max(mxx - mnx, mxz - mnz); sc.mapPts = { pts, mnx, mnz, k, w: (mxx - mnx) * k, h: (mxz - mnz) * k }; }
  const m = sc.mapPts; hud.rect(x - 2, y - 2, s + 4, s + 4, 'ink'); const ox = x + (s - m.w) / 2, oy = y + (s - m.h) / 2;
  for (const p of m.pts) hud.rect(Math.round(ox + (p[0] - m.mnx) * m.k), Math.round(oy + (m.h - (p[1] - m.mnz) * m.k)), 1, 1, 'slate');
  for (const car of sc.sim.cars) { const px = Math.round(ox + (car.c.x - m.mnx) * m.k), py = Math.round(oy + (m.h - (car.c.z - m.mnz) * m.k)); const col = car === sc.focus ? 'white' : (car.colour ?? 'red'); hud.rect(px - 1, py - 1, car === sc.focus ? 3 : 2, car === sc.focus ? 3 : 2, col); }
}
