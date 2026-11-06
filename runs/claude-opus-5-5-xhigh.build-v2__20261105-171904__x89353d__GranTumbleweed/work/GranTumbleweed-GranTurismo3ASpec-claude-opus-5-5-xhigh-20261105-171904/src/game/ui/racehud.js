// The race HUD. Position top-left, times top-right, speed and gear bottom-right, map and tyres bottom-left. The middle stays clear.
import { formatTime } from '../sim/race.js';
const wearColour = (w) => (w > 0.65 ? 'lime' : w > 0.38 ? 'sand' : w > 0.18 ? 'orange' : 'red');
export class RaceHud {
  constructor(sim, compact = false) {
    this.sim = sim; this.forceCompact = compact; this.compact = null; this.msg = null; this.msgT = 0; this.big = null; this.bigT = 0;
    this.layout(compact);
  }
  layout(compact) { // The map's size follows the layout, which follows the width of the screen.
    if (this.compact === compact) return;
    this.compact = compact;
    const sim = this.sim, tr = sim.tr, pts = []; let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < tr.N; i++) { minX = Math.min(minX, tr.x[i]); maxX = Math.max(maxX, tr.x[i]); minZ = Math.min(minZ, tr.z[i]); maxZ = Math.max(maxZ, tr.z[i]); }
    this.mapSize = compact ? 34 : 54; const k = (this.mapSize - 2) / Math.max(maxX - minX, maxZ - minZ); this.mapK = k; this.minX = minX; this.minZ = minZ; this.maxX = maxX; this.maxZ = maxZ;
    this.mapW = Math.round((maxX - minX) * k) + 2; this.mapH = Math.round((maxZ - minZ) * k) + 2;
    const seen = new Set();
    for (let i = 0; i < tr.N; i += 2) { const px = Math.round((maxX - tr.x[i]) * k), pz = Math.round((tr.z[i] - minZ) * k), key = px * 1000 + pz; if (!seen.has(key)) { seen.add(key); pts.push(px, pz); } }
    this.pts = pts;
  }
  flash(text, seconds = 2.2, big = false) { if (big) { this.big = text; this.bigT = seconds; } else { this.msg = text; this.msgT = seconds; } }
  mapAt(ui, x, y, car, mine) {
    const hud = ui.hud, p = this.pts;
    ui.panel(x - 2, y - 2, this.mapW + 4, this.mapH + 4, { color: 'ink', border: false });
    for (let i = 0; i < p.length; i += 2) hud.rect(x + p[i], y + this.mapH - p[i + 1] - 1, 1, 1, 'mist');
    const dot = (cx, cz, col, size) => { const px = Math.round((this.maxX - cx) * this.mapK), pz = Math.round((cz - this.minZ) * this.mapK); hud.rect(x + px - (size >> 1), y + this.mapH - pz - 1 - (size >> 1), size, size, col); };
    for (const e of this.sim.cars) if (e !== car) dot(e.c.x, e.c.z, e.player !== null ? 'sky' : 'red', 2);
    if (mine) dot(car.c.x, car.c.z, 'sand', 3);
  }
  // Draws around a car. o: { units, assists, slipOn, dev, flags, test: judge, recover, showMap, ghosts }
  draw(ui, car, dt, o = {}) {
    this.layout(this.forceCompact || ui.w < 300);
    const sim = this.sim, c = car.c, w = ui.w, h = ui.h, hud = ui.hud, compact = this.compact, kmh = o.units !== 'mph', speed = Math.abs(c.u) * (kmh ? 3.6 : 2.237), p = c.p;
    if (!compact) { if (!o.test) ui.panel(2, 2, 62, 30, { color: 'ink', border: false }); ui.panel(w - 96, 2, 94, o.test ? 58 : sim.cars.length > 1 ? 44 : 34, { color: 'ink', border: false }); ui.panel(w - 118, h - 46, 116, 44, { color: 'ink', border: false }); }
    else { ui.panel(2, 2, 50, 30, { color: 'ink', border: false }); ui.panel(w - 74, 2, 72, 28, { color: 'ink', border: false }); ui.panel(w - 72, h - 34, 70, 32, { color: 'ink', border: false }); }
    // ---- top-left: position and lap ----
    if (!o.test) {
      const raceN = sim.cars.filter((e) => !e.ghost).length;
      if (raceN > 1) ui.text(6, 5, `P${car.pos}`, { scale: 2, color: car.pos === 1 ? 'sand' : 'white' });
      if (raceN > 1) ui.text(6 + hud.measure(`P${car.pos}`, 2).width + 2, 11, `/${raceN}`, { color: 'mist' });
      if (sim.laps > 0) { const lapNow = Math.max(1, Math.min(car.lap, sim.laps)); ui.text(6, 22, `LAP ${lapNow}/${sim.laps}`, { color: car.lap === sim.laps ? 'sand' : 'mist' }); }
      else if (car.lap > 0) ui.text(6, 22, `LAP ${car.lap}`, { color: 'mist' });
    }
    // ---- top-right: time, best lap, gap ----
    const rx = w - 6; let ry = 5;
    if (o.test) {
      const J = o.test; ui.text(rx, ry, formatTime(J.totalWithBase), { align: 'right', scale: compact ? 1 : 2, color: J.running ? 'white' : 'mist' }); ry += 18;
      const m = J.test.medals;
      if (m) { for (const [name, col] of [['gold', 'sand'], ['silver', 'mist'], ['bronze', 'orange']]) { const passed = J.totalWithBase > m[name], dim = passed ? 'slate' : col; ui.text(rx, ry, `${name.toUpperCase()} ${formatTime(m[name])}`, { align: 'right', color: dim }); ry += 10; } }
      if (J.penalty > 0) { ui.text(rx, ry, `+${J.penalty.toFixed(0)} S PENALTY`, { align: 'right', color: 'red' }); ry += 10; }
      if (o.legText) { ui.text(rx, ry, o.legText, { align: 'right', color: 'sky' }); ry += 10; }
    } else {
      const t = car.ownStart !== null ? sim.time - car.ownStart : 0, lapT = car.lapStart !== null ? sim.time - car.lapStart : 0;
      if (!compact) { ui.text(rx, ry, formatTime(car.finished ? car.finishTime : t), { align: 'right', color: 'white' }); ry += 10; }
      ui.text(rx, ry, `LAP ${formatTime(lapT)}`, { align: 'right', color: 'mist' }); ry += 10;
      if (car.bestLap) { ui.text(rx, ry, `BEST ${formatTime(car.bestLap)}`, { align: 'right', color: 'sand' }); ry += 10; }
      if (o.rival) { const g = sim.clockGap(car, o.rival); if (g !== null) { ui.text(rx, ry, `${g <= 0 ? '-' : '+'}${Math.abs(g).toFixed(2)}`, { align: 'right', color: g <= 0 ? 'lime' : 'red' }); ry += 10; } }
      else if (sim.cars.length > 1) { const g = sim.gapAhead(car); if (g !== null && g < 99) { ui.text(rx, ry, `AHEAD +${g.toFixed(1)}`, { align: 'right', color: 'mist' }); ry += 10; } const b = sim.gapBehind(car); if (b !== null && b < 99 && !compact) { ui.text(rx, ry, `BEHIND -${b.toFixed(1)}`, { align: 'right', color: 'slate' }); ry += 10; } }
    }
    // ---- bottom-right: speed and gear with the rev bar ----
    const sc = compact ? 2 : 3, spTxt = String(Math.round(speed)), gearTxt = car.reverse ? 'R' : c.shift > 0 ? '-' : String(c.gear), by = h - 8 - 7 * sc;
    ui.text(rx - (compact ? 16 : 26), by, spTxt, { align: 'right', scale: sc });
    ui.text(rx - (compact ? 16 : 26), by - 9, kmh ? 'KM/H' : 'MPH', { align: 'right', color: 'mist' });
    ui.text(rx, by, gearTxt, { align: 'right', scale: sc, color: c.rpm > p.upshift ? 'red' : 'sand' });
    const segs = compact ? 10 : 18, segW = compact ? 5 : 5, bx = rx - segs * (segW + 1), byy = by - 18 - (compact ? 0 : 0), frac = Math.min(1, c.rpm / p.redline);
    for (let k = 0; k < segs; k++) { const f = (k + 1) / segs, on = frac >= f - 0.01, col = f > 0.92 ? 'red' : f > 0.8 ? 'orange' : 'lime'; ui.rect(bx + k * (segW + 1), byy, segW, 4, on ? col : 'night'); }
    if (c.rpm > p.upshift && !car.reverse) ui.rect(bx - 7, byy, 5, 4, Math.floor(ui.time * 16) % 2 ? 'white' : 'red');
    // ---- bottom-left: map, tyres, fuel, assists ----
    const mx = 6, my = h - this.mapH - 8;
    if (o.showMap !== false) this.mapAt(ui, mx, my, car, true);
    const tx = mx + this.mapW + 7, ty = h - 22, sq = 6;
    [[0, 0, 0], [1, 1, 0], [2, 0, 1], [3, 1, 1]].forEach(([i, cx, cy]) => { const col = wearColour(c.wear[i]); ui.rect(tx + cx * (sq + 2) - 1, ty + cy * (sq + 2) - 1, sq + 2, sq + 2, 'ink'); ui.rect(tx + cx * (sq + 2), ty + cy * (sq + 2), sq, sq, col); });
    if (o.fuel) { ui.text(tx, ty - 18, 'FUEL', { color: c.fuel < 0.15 ? 'red' : 'mist' }); ui.bar(tx, ty - 9, 40, 4, c.fuel, c.fuel < 0.15 ? 'red' : 'sky', 'ink'); }
    if (!compact) { let ax = tx + 20, ay = ty; for (const [on, t] of [[c.absOn && Math.abs(c.u) > 3, 'ABS'], [c.tcsOn, 'TCS'], [c.asmOn, 'STB']]) { if (on) { ui.rect(ax - 1, ay - 1, 20, 9, 'orange'); ui.text(ax, ay, t, { color: 'ink', shadow: false }); ay += 0; ax += 22; } } if (car.slip) ui.sprite(tx + 20, ty + 9, ['x..x..x..', '.x..x..x.', '..x..x..x', '.x..x..x.', 'x..x..x..'], { x: 'cyan' }); }
    if (o.dev) ui.text(6, 32, 'DEV', { color: 'red' });
    // ---- centre-top: flags and messages ----
    const cy = compact ? 34 : 38;
    if (this.bigT > 0) { this.bigT -= dt; ui.text(ui.cx, cy, this.big, { align: 'center', scale: compact ? 2 : 3, color: 'sand' }); }
    if (this.msgT > 0) { this.msgT -= dt; ui.text(ui.cx, cy + 26, this.msg, { align: 'center', color: 'white' }); }
    if (car.wrongWay) ui.text(ui.cx, cy + 40, 'WRONG WAY', { align: 'center', scale: 2, color: 'red' });
    if (car.pit) {
      const P = car.pit; ui.text(ui.cx, cy, 'PIT', { align: 'center', scale: 2, color: 'sand' });
      if (P.phase === 'box') { const left = Math.max(P.tyres, P.fuel) - P.svc; ui.text(ui.cx, cy + 18, `${Math.max(0, left).toFixed(1)} S`, { align: 'center', color: 'white' }); }
    }
    if (o.recover > 0 && !car.pit) { ui.text(ui.cx, h - 70, 'RECOVERING', { align: 'center', color: 'sand' }); ui.bar(ui.cx - 30, h - 60, 60, 4, o.recover, 'sand'); }
    void hud;
  }
}
