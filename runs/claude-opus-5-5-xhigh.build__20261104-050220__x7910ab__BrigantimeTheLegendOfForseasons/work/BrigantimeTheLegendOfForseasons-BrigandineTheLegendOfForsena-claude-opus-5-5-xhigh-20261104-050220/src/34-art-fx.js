// EFFECTS: timed visual effects the battle's event player starts (projectiles, spell bursts by element, breath,
// heals, buffs, statuses, summoning circles, capture chains, level-up columns, promotion ribbons, the Hour Hand), plus
// the bell clock face for the HUD. Each effect: { t, dur, update(dt), draw(r), done }. Particles do the rest.

const { px: FXP } = E;
const ELC = { spring: ['#9ad86a', '#f4b8d0', '#ffffff', '#ffe060'], summer: ['#ffd040', '#ff8a20', '#ff4a1a', '#fff0a0'], autumn: ['#e07a1e', '#c84a1a', '#8a5a2a', '#ffd040'], winter: ['#ffffff', '#a8e8ff', '#6ab0e8', '#e8fcff'], hour: ['#d8c070', '#b0a8c8', '#f0e8d8', '#5a5a6a'], none: ['#ffffff', '#fff0a0', '#ffe8c0', '#ffd060'] };
G.ELC = ELC;
class FXList {
  constructor() { this.list = []; }
  clear() { this.list = []; }
  add(fx) { fx.t = 0; this.list.push(fx); return fx; }
  update(dt) { for (const f of this.list) { f.t += dt; if (f.update) f.update(dt); } this.list = this.list.filter(f => f.t < f.dur); }
  draw(r) { for (const f of this.list) if (f.draw) f.draw(r, Math.min(1, f.t / f.dur)); }
  get busy() { return this.list.some(f => f.blocking); }
}
G.FXList = FXList;
const P = () => G.game.particles;
const RM = () => G.game.settings && G.game.settings.reduceMotion;
const FX = G.FX = {};
/** a projectile from a to b (world points [x, y, z]); kind: arrow (an arc) | bolt (straight, glowing) | ice | rock */
FX.projectile = (list, a, b, kind, elem, dur = .32) => list.add({ dur, blocking: true, draw(r, k) {
  const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, z = a[2] + (b[2] - a[2]) * k + (kind === 'arrow' || kind === 'rock' ? Math.sin(k * Math.PI) * 18 : 0);
  const col = (ELC[elem] || ELC.none);
  r.queue(x, y, z, g => {
    const q = r.w(x, y, z), q2 = r.w(x - (b[0] - a[0]) * .06, y - (b[1] - a[1]) * .06, z - (b[2] - a[2]) * .06 + (kind === 'arrow' ? Math.cos(k * Math.PI) * 4 : 0));
    if (kind === 'arrow') { FXP.line(g, q2[0], q2[1], q[0], q[1], '#e8dcc0', 1); FXP.dot(g, q[0], q[1], '#ffffff'); }
    else if (kind === 'ice') { FXP.poly(g, [[q[0], q[1] - 3], [q[0] + 3, q[1]], [q[0], q[1] + 3], [q[0] - 3, q[1]]], '#c8f0ff'); FXP.dot(g, q[0], q[1], '#ffffff'); }
    else { r.glowDisc(g, q[0], q[1], 7, col[0], .7); FXP.disc(g, q[0], q[1], 2, col[3] || '#ffffff'); FXP.line(g, q2[0], q2[1], q[0], q[1], col[1], 2); }
  }, { emissive: kind !== 'arrow' });
  if (kind !== 'arrow') G.game.lights.add(x, y, z, 30, .7, { color: col[0] });
} });
/** an element burst at a world point (r: radius in world units) */
FX.burst = (list, at, elem, rad = 14, big) => {
  const [x, y, z] = at, col = ELC[elem] || ELC.none, p = P(), n = big ? 26 : 12;
  switch (elem) {
    case 'spring': p.bits(x, y, z + 8, n, col); p.glints(x, y, z + 10, 6, '#ffffff'); break;
    case 'summer': p.fire(x, y, z, big ? 14 : 7, { size: big ? 1.5 : 1 }); p.explosion(x, y, z + 6, big ? 1 : .5, { debris: false, freeze: false, shake: big ? 2 : 0 }); break;
    case 'autumn': p.bits(x, y, z + 10, n, col); p.smoke(x, y, z + 6, 4, { color: '#8a6a5a' }); break;
    case 'winter': p.bits(x, y, z + 8, n, col); p.glints(x, y, z + 10, 8, '#e8fcff'); break;
    case 'hour': p.bits(x, y, z + 8, n, col); p.sparks(x, y, z + 8, 6, 0); break;
    default: p.glints(x, y, z + 10, 12, '#fff8d0'); p.bits(x, y, z + 8, 8, col);
  }
  p.ring(x, y, 2, rad, col[0], .35);
  list.add({ dur: .5, draw(r, k) {
    G.game.lights.add(x, y, z + 6, rad * 2.5, (1 - k) * 1.2, { color: col[0] });
    if (elem === 'winter') r.decal(g => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, q0 = r.w(x, y, 0), q1 = r.w(x + Math.cos(a) * rad * (.4 + k), y + Math.sin(a) * rad * (.4 + k), 0); FXP.line(g, q0[0], q0[1], q1[0], q1[1], k < .5 ? '#ffffff' : '#a8e8ff', 1); } });
    if (elem === 'hour') FX.clockFace(r, x, y, rad * (.6 + k * .5), k * 6, 1 - k);
    if (elem === 'summer' && big) r.queue(x, y, z + 20, g => { const q = r.w(x, y, z + 20 + k * 10); r.glowDisc(g, q[0], q[1], 14 * (1 - k * .5), '#fff0a0', 1 - k); }, { emissive: true });
  } });
};
/** a clock-face ring decal with sweeping hands (Hour magic, Stop) */
FX.clockFace = (r, x, y, rad, ang, a = 1) => {
  if (a <= .05) return;
  r.decal(g => {
    const pts = r.groundPts(x, y, rad, 24, 0);
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; FXP.line(g, p[0], p[1], q[0], q[1], '#d8c070', 1); }
    for (let i = 0; i < 12; i++) { const ag = i / 12 * Math.PI * 2, q = r.w(x + Math.cos(ag) * rad * .85, y + Math.sin(ag) * rad * .85, 0); FXP.dot(g, q[0], q[1], '#f0e8d8'); }
    const c0 = r.w(x, y, 0), h1 = r.w(x + Math.cos(ang) * rad * .8, y + Math.sin(ang) * rad * .8, 0), h2 = r.w(x + Math.cos(ang / 12) * rad * .5, y + Math.sin(ang / 12) * rad * .5, 0);
    FXP.line(g, c0[0], c0[1], h1[0], h1[1], '#f0e8d8', 1); FXP.line(g, c0[0], c0[1], h2[0], h2[1], '#d8c070', 2);
  }, { emissive: .6 });
};
/** a cone or line of breath from a mouth over cells (world centres) */
FX.breath = (list, from, cells, elem, dur = .55) => list.add({ dur, blocking: true, update() {
  const k = Math.min(1, this.t / dur), p = P(), col = ELC[elem] || ELC.none;
  for (const c of cells) { if (Math.random() > .35) continue; const d = Math.hypot(c[0] - from[0], c[1] - from[1]) / 60; if (k < d) continue; if (elem === 'summer') p.fire(c[0] + (Math.random() - .5) * 8, c[1] + (Math.random() - .5) * 6, 2, 1); else p.bits(c[0], c[1], 8, 2, col); }
}, draw(r, k) { const col = (ELC[elem] || ELC.none)[0]; for (const c of cells) G.game.lights.add(c[0], c[1], 6, 24, .5 * (1 - k), { color: col }); } });
/** rising sparkles of healing */
FX.heal = (list, at) => { const [x, y, z] = at; P().glints(x, y, z + 10, 10, '#a8ffa8'); list.add({ dur: .7, draw(r, k) { r.queue(x, y, z, g => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + k * 4, q = r.w(x + Math.cos(a) * 7, y + Math.sin(a) * 5, z + k * 26); FXP.rect(g, q[0], q[1] - 1, 1, 3, '#c8ffc8'); FXP.rect(g, q[0] - 1, q[1], 3, 1, '#c8ffc8'); } }, { emissive: true }); G.game.lights.add(x, y, z + 10, 30, .6 * (1 - k), { color: '#a8ffa8' }); } }); };
/** a buff: chevrons (valor), speed lines (haste), a shield (warded) */
FX.buff = (list, at, kind) => { const [x, y, z] = at, col = { valor: '#ff5a4a', haste: '#ffe04a', warded: '#4aa0ff', frostarmor: '#bfefff', windup: '#d8c070' }[kind] || '#ffffff'; list.add({ dur: .7, draw(r, k) { r.queue(x, y, z, g => { const q = r.w(x, y, z + 14 + k * 14); if (kind === 'warded' || kind === 'frostarmor') { FXP.poly(g, [[q[0] - 5, q[1] - 5], [q[0] + 5, q[1] - 5], [q[0] + 5, q[1] + 1], [q[0], q[1] + 6], [q[0] - 5, q[1] + 1]], col); FXP.poly(g, [[q[0] - 3, q[1] - 3], [q[0] + 3, q[1] - 3], [q[0] + 3, q[1]], [q[0], q[1] + 3], [q[0] - 3, q[1]]], '#ffffff'); } else for (let i = 0; i < 2; i++) FXP.poly(g, [[q[0] - 5, q[1] + i * 4], [q[0], q[1] - 4 + i * 4], [q[0] + 5, q[1] + i * 4], [q[0] + 5, q[1] + 2 + i * 4], [q[0], q[1] - 2 + i * 4], [q[0] - 5, q[1] + 2 + i * 4]], col); }, { emissive: true }); } }); };
/** the summoning: a rotating rune ring, a pillar of light, rising particles */
FX.summon = (list, at, elem, dur = 1.4) => { const [x, y] = at, col = ELC[elem] || ELC.none; list.add({ dur, blocking: true, update() { if (Math.random() < .5) P().glints(x + (Math.random() - .5) * 20, y + (Math.random() - .5) * 14, 4, 1, col[0]); }, draw(r, k) {
  const a = k * 5, rad = 16 + Math.sin(k * Math.PI) * 4;
  r.decal(g => { const pts = r.groundPts(x, y, rad, 28, 0); for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; FXP.line(g, p[0], p[1], q[0], q[1], col[0], 1); } for (let i = 0; i < 6; i++) { const ag = a + i / 6 * Math.PI * 2, q = r.w(x + Math.cos(ag) * rad * .75, y + Math.sin(ag) * rad * .75, 0); FXP.rect(g, q[0] - 1, q[1] - 1, 3, 3, col[1]); } const pts2 = r.groundPts(x, y, rad * .55, 18, 0); for (let i = 0; i < pts2.length; i += 2) { const p = pts2[i]; FXP.dot(g, p[0], p[1], col[3]); } }, { emissive: 1 });
  r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 60 * Math.min(1, k * 2)); FXP.blend(g, .5 * Math.sin(k * Math.PI), 'add', () => FXP.rect(g, b[0] - 5, tp[1], 10, b[1] - tp[1], col[0])); }, { emissive: true });
  G.game.lights.add(x, y, 10, 60, Math.sin(k * Math.PI) * 1.4, { color: col[0] });
} }); };
/** a chain of light from a captor to a captured monster */
FX.chain = (list, a, b) => list.add({ dur: .9, blocking: true, draw(r, k) { r.queue((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 10, g => { const n = 10; for (let i = 0; i <= n * Math.min(1, k * 1.6); i++) { const t = i / n, q = r.w(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 12 + Math.sin(t * Math.PI) * 8); FXP.disc(g, q[0], q[1], i % 2 ? 1 : 2, i % 2 ? '#fff8d0' : '#ffd060'); } }, { emissive: true }); } });
/** level up: a gold column and the gains popping up */
FX.levelUp = (list, at, gains) => { const [x, y, z] = at; const lines = Object.entries(gains || {}).filter(([k, v]) => k !== 'learned' && v > 0).slice(0, 4).map(([k, v]) => '+' + v + ' ' + k.toUpperCase()); lines.forEach((l, i) => G.game.after(.15 * i, () => P().text(x, y, z + 30 + i * 2, l, '#ffe080', { scale: 1, bounce: false }))); list.add({ dur: 1, draw(r, k) { r.queue(x, y, 0, g => { const b = r.w(x, y, 0), tp = r.w(x, y, 50); FXP.blend(g, .45 * (1 - k), 'add', () => FXP.rect(g, b[0] - 4, tp[1], 8, b[1] - tp[1], '#ffd040')); }, { emissive: true }); } }); };
/** promotion: a white flash and spiralling ribbons in the element's colours */
FX.promote = (list, at, elem) => { const [x, y, z] = at, col = ELC[elem] || ELC.none; G.game.flash('#ffffff', .2, .6); list.add({ dur: 1.2, blocking: true, draw(r, k) { r.queue(x, y, z, g => { for (let i = 0; i < 3; i++) for (let j = 0; j < 12; j++) { const t = j / 12, a = k * 12 + i * 2.1 + t * 4, q = r.w(x + Math.cos(a) * (14 - t * 8), y + Math.sin(a) * (10 - t * 6), z + t * 40 * k); FXP.disc(g, q[0], q[1], 1.5, col[i % col.length]); } }, { emissive: true }); G.game.lights.add(x, y, 20, 60, 1.2 * (1 - k), { color: col[0] }); } }); };
/** the Hour Hand's line across the Sanctum floor (glowing faintly all bell, bright when it strikes) */
FX.handLine = (r, field, cells, strength) => { r.decal(g => { for (const c of cells) FXP.polyDither(g, field.hexPts(r, c, .7), '#d8c070', strength, r.ix, r.iy); }, { emissive: strength }); };
/** the HUD's bell clock: a 12-hour dial whose hand points at the current bell */
FX.bellClock = (g, cx, cy, R, bell, of, t) => {
  FXP.disc(g, cx, cy, R + 2, '#14121c'); FXP.disc(g, cx, cy, R + 1, '#d8c070'); FXP.disc(g, cx, cy, R, '#f0e8d8');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2, on = i < bell; FXP.dot(g, cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), on ? '#c83a2a' : '#5a5a6a'); }
  const a = bell / Math.max(1, of) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 20) * .02;
  FXP.line(g, cx, cy, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), '#14121c', 1); FXP.dot(g, cx, cy, '#c83a2a');
};
