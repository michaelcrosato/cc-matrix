/* OutBloom — the race HUD, per viewport, anchored to its corners so the road's middle stays clear: the daylight clock
 * (top centre), score and the Bloom chain (top left), the stage and the mini-map pyramid (top right), speed, tachometer
 * and gear (bottom right), the passenger panel and request card (bottom left, Love in Bloom), banners that queue in the
 * middle, the speech bubble over the passenger's seat, hints with glyphs, and the countdown. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const UI = OB.UI, C = UI.COL;
const HUD = OB.HUD = { banners: {}, hintsShown: {}, flyT: {}, fly: {} };
const big = () => OB.setting('hudSize') === 'xl' ? 1 : 0;
/** queue a banner for a player: text, colour, seconds, sub line */
HUD.banner = (car, text, o = {}) => { const q = HUD.banners[car] || (HUD.banners[car] = []); if (q.length && q[q.length - 1].text === text) return; q.push(Object.assign({ text, t: 0, life: o.life || 1.8, color: o.color || C.sun, sub: o.sub || '', icon: o.icon || null, prio: o.prio || 0 }, o)); if (q.length > 4) q.splice(1, 1); };
HUD.step = dt => { for (const q of Object.values(HUD.banners)) { if (q.length) { q[0].t += dt; if (q[0].t > q[0].life) q.shift(); } } for (const k in HUD.flyT) HUD.flyT[k] = Math.max(0, HUD.flyT[k] - dt); };
HUD.clear = () => { HUD.banners = {}; HUD.flyT = {}; };
const fmtT = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + "'" + (r < 10 ? '0' : '') + r.toFixed(2).replace('.', '"'); };
HUD.fmtT = fmtT;
const speedTxt = v => OB.setting('units') === 'mph' ? [Math.round(v * .6214), 'MPH'] : [Math.round(v), 'KM/H'];
HUD.speedTxt = speedTxt;
/** the whole HUD for one driver in its viewport */
HUD.draw = (g, race, d, vp) => {
  if (OB.cheats.hideHud) return;
  const X = vp.x, Y = vp.y, W = vp.w, H = vp.h, small = H < 220, b = big() && !small ? 1 : 0, car = d.car, t = OB.game.real;
  const ca = !small && OB.game.cornerArea && OB.game.cornerArea(), rightX = X + W - 6 - (ca && ca.y0 < 30 && d.idx === 0 ? Math.max(0, W - ca.x0 + 2) : 0);
  // the clock
  const showClock = race.mode !== 'versus' || d.idx === 0 || true;
  if (showClock) {
    const tl = race.clock, low = !race.clockUp && tl < 10, flash = low && Math.floor(t * 4) % 2 === 0;
    const label = race.clockUp ? (race.mode === 'trial' ? 'TIME' : 'TIME') : 'DAYLIGHT';
    UI.text(g, label, X + W / 2, Y + 3, { align: 'center', color: C.sun });
    OB.Art.icon(g, 'sun', X + W / 2 - UI.width(label) / 2 - 9, Y + 3);
    const digits = race.clockUp ? fmtT(tl) : String(Math.ceil(tl)), sc = (small ? 2 : race.clockUp ? 2 : 4) + b;
    UI.text(g, digits, X + W / 2, Y + 12, { align: 'center', scale: sc, color: flash ? C.bad : low ? '#ffb0a0' : '#ffffff' });
    const fl = HUD.flyT[d.id]; if (fl > 0) UI.text(g, '+' + HUD.fly[d.id], X + W / 2 + 30 + (1 - fl) * 0, Y + 14 + (1.6 - fl) * 8, { scale: 2, color: C.good });
  }
  // score and the Bloom chain
  if (race.mode !== 'trial') {
    UI.text(g, 'SCORE', X + 6, Y + 4, { color: C.dim });
    UI.text(g, String(Math.round(d.score)), X + 6, Y + 13, { scale: (small ? 1 : 2) + b });
    const B = d.bloom, nxt = OB.BLOOM_AT[B.level] || OB.BLOOM_AT[4], prv = OB.BLOOM_AT[B.level - 1] || 0, fill = B.level >= 5 ? 1 : clamp((B.points - prv) / Math.max(1, nxt - prv), 0, 1);
    const by = Y + (small ? 24 : 32);
    for (let i = 0; i < 5; i++) { const on = i < B.level - 1 || (i === B.level - 1 && B.level === 5); OB.Art.icon(g, on ? 'flower' : 'flowerOff', X + 6 + i * 11, by, small ? 1 : 2); }
    if (B.level < 5) px.rect(g, X + 6, by + (small ? 7 : 12), Math.round(54 * fill), 2, C.pink);
    UI.text(g, '×' + B.level, X + 64, by + (small ? 0 : 2), { color: B.level >= 5 ? C.sun : C.ink, scale: small ? 1 : 1 });
    if (B.level >= 5) UI.text(g, 'FULL BLOOM', X + 6, by + (small ? 10 : 16), { color: Math.floor(t * 3) % 2 ? C.pink : C.sun });
  }
  // the stage and the mini-map
  const S = OB.STAGES[d.stage];
  UI.text(g, S.name.toUpperCase(), rightX, Y + 4, { align: 'right', color: C.sun });
  UI.text(g, fmtT(race.t - d.stageT0), rightX, Y + 13, { align: 'right', color: C.dim });
  if (!small) HUD.miniMap(g, race, d, rightX - 64, Y + 24, t);
  if (race.mode === 'hub' && OB.Hub) OB.Hub.standings(g, race, rightX, Y + (small ? 24 : 70));
  // speed, tach, gear
  const [sv, su] = speedTxt(car.v), bx = rightX, byy = Y + H - 6;
  UI.text(g, su, bx, byy - 9, { align: 'right', color: C.dim });
  UI.text(g, String(sv), bx - UI.width(su) - 4, byy - (small ? 15 : 22) - b * 7, { align: 'right', scale: (small ? 2 : 3) + b });
  const gear = (car.o.transmission === 'manual' ? 'M' : 'A') + (car.gear + 1);
  UI.text(g, gear, bx - UI.width(su) - 4 - UI.width('888', (small ? 2 : 3) + b) - 8, byy - (small ? 15 : 18), { align: 'right', color: car.o.transmission === 'manual' ? C.pink : C.sea, scale: small ? 1 : 2 });
  if (!small) HUD.tach(g, bx - 96, byy - (small ? 22 : 34) - b * 7, car.rpm, race.phase === 'countdown');
  // rival gaps, mission readouts
  for (const h of race.rules) if (h.hud) h.hud(g, race, d, vp);
  // Love in Bloom: the passenger panel
  if (race.req && d.idx === 0) race.req.hud(g, race, d, vp);
  else if (d.passenger && !small && race.mode !== 'versus') HUD.passengerMini(g, race, d, X + 6, Y + H - 50);
  // banners in the middle (one at a time), countdown, hints
  const q = HUD.banners[d.id];
  if (q && q.length) { const bn = q[0], u = Math.min(1, bn.t * 6), out = clamp((bn.life - bn.t) * 5, 0, 1), sc = (small ? 2 : 3);
    const yy = Y + H * .27 - (1 - u) * 12; if (out > 0) { const tw = UI.width(bn.text, sc); if (bn.icon) OB.Art.icon(g, bn.icon, X + W / 2 - tw / 2 - 20, yy + 2, 2);
      E.font.title(g, bn.text, Math.round(X + W / 2), Math.round(yy), { align: 'center', scale: sc, colors: [bn.color, E.shade(bn.color, -.25)], depth: 2, depthColor: '#3a0a2a' });
      if (bn.sub) UI.text(g, bn.sub, X + W / 2, yy + sc * 9 + 2, { align: 'center', color: '#ffffff' }); } }
  if (race.phase === 'countdown') { const n = Math.ceil(race.cfg.hubTime ? -race.cfg.hubTime() / 1000 : 3 - race.phaseT); if (n >= 1 && n <= 3) E.font.title(g, String(n), Math.round(X + W / 2), Math.round(Y + H * .3), { align: 'center', scale: small ? 4 : 6, colors: ['#ffffff', '#ffd23a', '#ff7a3a'], depth: 3 });
    if (d.idx === 0 && !small) { const zone = car.rpm >= 6000 && car.rpm <= 7000; UI.text(g, zone ? 'IN THE GREEN!' : 'REV IN THE GREEN AT GO', X + W / 2, Y + H * .3 + 54, { align: 'center', color: zone ? C.good : C.ink }); } }
  if (race.phase === 'grid' && d.idx === 0 && !small) UI.prompt(g, X + W / 2, Y + H - 30, 'confirm', 'SKIP', { align: 'center' });
  if (race.phase === 'race' && race.t - d.stageT0 < 3 && race.t < 8 && d.idx === 0 && !small) HUD.hint(g, race, 'gas', X + W / 2, Y + H * .62);
  HUD.hints(g, race, d, vp);
  // the speech bubble over the passenger's seat
  if (OB.Talk.cur && d.idx === 0 && d.seatScreen) HUD.bubble(g, d, vp);
  if (OB.cheats.overlay && d.idx === 0) HUD.overlay(g, race, d, vp);
};
HUD.tach = (g, x, y, rpm, rev) => {   // a bar of 16 cells: the green zone at GO, the red line, the needle's cell lit
  const n = 16, on = Math.round(clamp((rpm - 1000) / 7500, 0, 1) * n);
  for (let k = 0; k < n; k++) { const v = 1000 + (k + .5) * 7500 / n, red = v >= 7500, green = rev && v >= 6000 && v <= 7000, lit = k < on;
    px.rect(g, x + k * 6, y + (k < 10 ? 2 : 0), 5, k < 10 ? 4 : 6, lit ? (green ? C.good : red ? C.bad : '#ffd8f0') : green ? '#2a6a3a' : red ? '#6a1a2a' : '#3a2a4a'); }
  UI.text(g, 'RPM', x, y - 10, { color: C.dim });
};
/** the pyramid: 15 dots, the path driven lit, a pulsing dot for the driver, both next stages pulsing on a fork's approach */
HUD.miniMap = (g, race, d, x, y, t) => {
  const route = d.routeStr, path = OB.routeStages(route), near = d.road.junctionAt && d.car.z > d.road.junctionAt - 900 * OB.SEG / 4.5 && !race.fixed;
  UI.panel(g, x - 4, y - 3, 72, 48, { alpha: .8 });
  OB.GRID.forEach((row, r) => row.forEach((id, c) => {
    const px0 = x + 31 - r * 6 + c * 12, py0 = y + r * 8, lit = path.includes(id), here = id === d.stage, next = near && OB.FORKS[d.stage] && OB.FORKS[d.stage].includes(id), fixed = race.fixed && race.fixed.includes(id);
    if (r > 0 && lit) { const pr = path[r - 1], pc = OB.GRID[r - 1].indexOf(pr); px.line(g, x + 31 - (r - 1) * 6 + pc * 12 + 1, py0 - 8 + 1, px0 + 1, py0 + 1, C.sun, 1); }
    const col = here ? (Math.floor(t * 4) % 2 ? '#ffffff' : C.pink) : next ? (Math.floor(t * 3) % 2 ? C.sea : '#ffffff') : lit ? C.sun : fixed ? '#a890c8' : '#5a4a7a';
    px.rect(g, px0 - (here ? 1 : 0), py0 - (here ? 1 : 0), here ? 5 : 4, here ? 5 : 4, '#140a24'); px.rect(g, px0 - (here ? 1 : 0), py0 - (here ? 1 : 0), here ? 4 : 3, here ? 4 : 3, col);
    if (r === 4) { const gl = OB.STAGES[id].goal; E.font.text(g, gl, px0 + 1, py0 + 5, lit ? C.sun : '#8a7a9a', { align: 'center', font: 'tiny', outline: false }); }
  }));
};
HUD.passengerMini = (g, race, d, x, y) => { OB.Cast.portrait(g, d.passenger, x, y, 32, { mood: 'happy', outfit: d.outfit }); };
HUD.bubble = (g, d, vp) => {
  const T = OB.Talk.cur, s = OB.safeText(T.text.slice(0, T.shown)), lines = E.font.wrap ? E.font.wrap(s, 150, {}) : [s];
  const ls = Array.isArray(lines) ? lines : String(lines).split('\n');
  const w = Math.max(40, ...ls.map(l => UI.width(l))) + 10, h = ls.length * 9 + 8;
  let bx = Math.round(d.seatScreen[0] - w / 2 + 10), by = Math.round(d.seatScreen[1] - h - 22);
  bx = clamp(bx, vp.x + 4, vp.x + vp.w - w - 4); by = clamp(by, vp.y + 40, vp.y + vp.h - h - 40);
  const col = OB.CAST[T.who] && OB.CAST[T.who].color || '#ffffff';
  px.rect(g, bx, by, w, h, '#fffaf2'); px.rect(g, bx, by, w, 2, col); px.rect(g, bx - 1, by + 1, 1, h - 2, '#fffaf2'); px.rect(g, bx + w, by + 1, 1, h - 2, '#fffaf2');
  px.poly(g, [[bx + w / 2 - 4, by + h], [bx + w / 2 + 4, by + h], [d.seatScreen[0] + 4, by + h + 8]], '#fffaf2');
  ls.forEach((l, i) => E.font.text(g, l, bx + 5, by + 5 + i * 9, '#2a1a3a', { outline: false }));
  UI.text(g, (OB.CAST[T.who] || {}).name || '', bx + 3, by - 9, { color: col });
};
/* ---- hints: once each per profile, with glyphs; rebinding updates them ---- */
HUD.HINTS = [['gas', 'gas', 'Hold to accelerate'], ['drift', 'drift', 'Tap while steering to drift'], ['slip', null, 'Tuck in behind a car to slipstream'], ['fork', 'steer', 'Steer left or right at the fork'], ['rev', 'gas', 'Rev in the green at GO']];
HUD.hintNow = null;
HUD.showHint = (key) => { if (!OB.setting('hints')) return; const P = OB.Profile && OB.Profile.data; if (P && P.hints[key]) return; if (P) { P.hints[key] = true; OB.Profile.save(); } const h = HUD.HINTS.find(x => x[0] === key); if (h) HUD.hintNow = { h, t: 0 }; };
HUD.hint = (g, race, act, x, y) => {};
HUD.hints = (g, race, d, vp) => {
  const H = HUD.hintNow; if (!H || d.idx !== 0) return; H.t += 1 / 60; if (H.t > 5) { HUD.hintNow = null; return; }
  const [, act, text] = H.h, y = vp.y + vp.h * .66;
  const w = UI.width(text) + (act ? 30 : 12); UI.panel(g, vp.x + vp.w / 2 - w / 2, y - 4, w, 18, { alpha: .8 });
  if (act) UI.prompt(g, vp.x + vp.w / 2, y, act, text, { align: 'center' }); else UI.text(g, text, vp.x + vp.w / 2, y + 1, { align: 'center' });
};
/* ---- the debug overlay (Dev Mode) ---- */
HUD.overlay = (g, race, d, vp) => {
  const c = d.car, info = OB.World.info(d.road, c.z, c.x, d.branch), rq = race.req && race.req.cur;
  const rows = [`stage ${d.stage} seg ${Math.floor(c.z / OB.SEG)} z ${Math.round(c.z)}`, `x ${c.x.toFixed(2)} abs ${d.absX().toFixed(2)} br ${d.branch}`, `v ${c.v.toFixed(1)} rpm ${Math.round(c.rpm)} g ${c.gear + 1}`,
    `curve ${info.curve.toFixed(2)} curv ${(info.curv * 1e5).toFixed(1)} split ${info.split.toFixed(2)}`, `drift ${c.drift.on ? 'ON' : '-'} a ${c.drift.a.toFixed(2)} sc ${Math.round(c.drift.score)}`, `slip ${c.slip.toFixed(2)} bloom ${Math.round(d.bloom.points)} L${d.bloom.level}`,
    `req ${rq ? rq.type + ' ' + rq.state + ' ' + (rq.progress || 0) : '-'}`, `traffic ${race.traffic.of(d.stage).length} fps ${OB.game.fps}`, `errors ${OB.game.errors.length}`];
  UI.panel(g, vp.x + 4, vp.y + 60, 200, rows.length * 9 + 8, { alpha: .7 });
  rows.forEach((r, i) => E.font.text(g, r, vp.x + 8, vp.y + 64 + i * 9, '#c8ffc8', { outline: false }));
};
/* ---- bus events that become banners (and hints) ---- */
HUD.listen = race => {
  const P = race.p1.id;
  return OB.bus.on('*', (e, name) => {
    const car = e && e.car; if (!car) { if (name === 'time:low') HUD.banner(P, 'HURRY UP!', { color: C.bad, life: 1.5 }); return; }
    const d = race.drivers.find(q => q.id === car); if (!d || d.kind !== 'player') return;
    switch (name) {
      case 'checkpoint': if (!race.clockUp) { HUD.banner(car, 'TIME EXTENDED!', { color: C.good, sub: '+' + e.bonus + '   ' + OB.STAGES[e.id].name.toUpperCase(), life: 2.5 }); HUD.flyT[car] = 1.6; HUD.fly[car] = e.bonus; }
        else { const bs = race.cfg.bestSplits, i = d.stageTimes.length - 1, best = bs && bs[i], delta = best ? (e.split - best) : null;
          HUD.banner(car, 'CHECKPOINT', { color: C.sea, sub: OB.STAGES[e.id].name.toUpperCase() + '   ' + fmtT(e.split || 0) + (delta !== null ? '   ' + (delta <= 0 ? '-' : '+') + Math.abs(delta).toFixed(2) + (delta <= 0 ? ' AHEAD' : ' BEHIND') : ''), life: 2.6 }); if (delta !== null) HUD.banner(car, delta <= 0 ? 'AHEAD OF YOUR BEST' : 'BEHIND YOUR BEST', { color: delta <= 0 ? C.good : C.bad, life: 1.4 }); } break;
      case 'nearmiss': HUD.banner(car, 'NEAR MISS', { color: '#ffe060', sub: '+' + 500 * d.bloom.level, life: 1 }); break;
      case 'slingshot': HUD.banner(car, 'SLINGSHOT!', { color: C.sea, life: 1 }); break;
      case 'slip:start': HUD.banner(car, 'SLIPSTREAM', { color: '#c8e8ff', life: .9 }); HUD.showHint('slip'); break;
      case 'start:perfect': HUD.banner(car, 'PERFECT START', { color: C.good, life: 1.6 }); break;
      case 'drift:end': if (e.score > 400) HUD.banner(car, 'DRIFT ' + e.score, { color: C.pink, life: 1.2 }); break;
      case 'bloom:level': if (e.n >= 5 && e.up) HUD.banner(car, 'FULL BLOOM!', { color: C.pink, life: 2.2, prio: 1 }); break;
      case 'goal': HUD.banner(car, 'GOAL!', { color: C.sun, life: 3 }); for (let k = 0; k < 4; k++) OB.FX.emit('confetti', OB.game.W * (.2 + k * .2), OB.game.H * .2, 26, { colors: ['#ff7ab8', '#ffd23a', '#5ae0ff', '#ffffff', '#7ad860'], speed: 120, grav: 70, life: 2.4, size: 3 }); break;
      case 'time:up': HUD.banner(car, 'TIME UP', { color: C.bad, life: 3, sub: 'THE SUN SET OVER ' + OB.STAGES[race.p1.stage].name.toUpperCase() }); break;
      case 'fork:approach': if (!race.fixed) { const S0 = OB.STAGES[e.left], S1 = OB.STAGES[e.right]; HUD.banner(car, '← ' + S0.name.toUpperCase() + ' | ' + S1.name.toUpperCase() + ' →', { color: '#ffffff', life: 2.6 }); HUD.showHint('fork'); } break;
      case 'gust:warn': HUD.banner(car, 'CROSSWIND!', { color: '#c8e8ff', life: 1, icon: 'draft' }); break;
      case 'go': break;
    }
  });
};
})();
