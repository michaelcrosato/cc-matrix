// The first-person WOLF-9 SMG overlay (9.1): a pixel-art gun drawn with px.poly from a small 2D model. It slides along
// the bottom under its crosshair and turns toward it; each shot kicks it back, brass flies right; the reload runs
// magazine out, magazine in, charging handle; FURY glows gold; a grenade throw shows the left hand arcing up.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP;
const G = WP.Gun = { st: {} };
const S = pid => G.st[pid] || (G.st[pid] = { x: WP.W / 2, a: 0, kick: 0, flash: 0, brass: [], throwT: 0, fury: 0, rel: 0 });
G.shot = pid => { const s = S(pid); s.kick = 1; s.flash = .06; s.brass.push({ x: 0, y: 0, vx: 60 + WP.fxr() * 50, vy: -90 - WP.fxr() * 60, t: 0, r: WP.fxr() * 6 }); if (s.brass.length > 24) s.brass.shift(); };
G.throw = pid => { S(pid).throwT = .45; };
G.update = (dt, players) => {
  for (const p of players) {
    const s = S(p.pid), tx = lerp(WP.W / 2, p.x, .55) + (players.length > 1 ? (p.slot - (players.length - 1) / 2) * 90 : 0);
    s.x += (tx - s.x) * Math.min(1, dt * 10);
    const ta = clamp(Math.atan2(p.x - s.x, (WP.PLAY_H + 20) - p.y) * .9, -.45, .45); s.a += (ta - s.a) * Math.min(1, dt * 12);
    s.kick = Math.max(0, s.kick - dt * 14); s.flash = Math.max(0, s.flash - dt); s.throwT = Math.max(0, s.throwT - dt);
    s.rel = p.reloadT > 0 ? 1 - p.reloadT / (p.reloadT0 || WP.T.reloadTime) : 0;
    s.fury = p.fury > 0 ? 1 : 0;
    for (const b of s.brass) { b.t += dt; b.vy += 420 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > 30 && b.vy > 0) { b.vy = -b.vy * .35; b.vx *= .6; } }
    s.brass = s.brass.filter(b => b.t < .9);
  }
};
// the model: polygons in gun space (x right, y up the barrel), pixels at scale 1
const POLY = {
  sleeveR: [[8, -40], [30, -40], [26, -6], [10, -4]], handR: [[9, -8], [24, -10], [22, 4], [12, 6]],
  sleeveL: [[-30, -40], [-12, -40], [-8, 18], [-22, 14]], handL: [[-16, 14], [-4, 16], [-3, 28], [-14, 26]],
  stock: [[-5, -30], [5, -30], [6, -8], [-6, -8]],
  body: [[-9, -10], [9, -10], [8, 30], [-8, 30]], top: [[-6, 26], [6, 26], [5, 34], [-5, 34]],
  shroud: [[-5, 30], [5, 30], [4, 62], [-4, 62]], barrel: [[-2, 60], [2, 60], [2, 74], [-2, 74]],
  sight: [[-1, 74], [1, 74], [1, 80], [-1, 80]], mag: [[-4, 4], [4, 4], [6, -26], [-2, -27]], grip: [[2, -10], [9, -10], [11, -22], [4, -23]]
};
const COL = { sleeve: '#4a5a32', sleeveDk: '#323e20', skin: '#d8a070', skinDk: '#a8704a', metal: '#2e3036', metalLt: '#5a5e68', metalHi: '#8a90a0', mag: '#24262a', gold: '#e8c040', goldLt: '#fff0a0' };
G.draw = (g, p, small) => {
  const s = S(p.pid); if (p.down) return;
  const k = small ? .7 : 1.15, base = [s.x, WP.PLAY_H + 8 + s.kick * 3 * k + (s.rel > 0 ? Math.sin(s.rel * Math.PI) * 16 * k : 0)];
  const a = s.a + s.kick * .035, ca = Math.cos(a), sa = Math.sin(a);
  const T = pts => pts.map(([x, y]) => [Math.round(base[0] + (x * ca + y * sa) * k), Math.round(base[1] + (x * sa - y * ca) * k)]);
  const fury = s.fury, metal = fury ? COL.gold : COL.metal, lt = fury ? COL.goldLt : COL.metalLt;
  const poly = (name, c, dx = 0, dy = 0) => px.poly(g, T(POLY[name].map(([x, y]) => [x + dx, y + dy])), c);
  // the reload: magazine out (.4), in (.4), charging handle (.2)
  const r = s.rel, magOff = r > 0 ? (r < .4 ? -r / .4 * 30 : r < .8 ? -(1 - (r - .4) / .4) * 30 : 0) : 0, charge = r >= .8 ? Math.sin((r - .8) / .2 * Math.PI) * 6 : 0;
  poly('sleeveR', COL.sleeve); poly('handR', COL.skin);
  poly('stock', COL.metal); poly('grip', COL.metal);
  if (!(r > .35 && r < .45)) poly('mag', COL.mag, 0, magOff);
  poly('body', metal); poly('top', lt, 0, -charge); poly('shroud', metal); poly('barrel', COL.metal); poly('sight', lt);
  // highlights: a lit left edge on the body and shroud, holes in the shroud
  for (const [x, y0, y1] of [[-7, -8, 28], [-4, 32, 60]]) { const q = T([[x, y0], [x + 1.4, y0], [x + 1.4, y1], [x, y1]]); px.poly(g, q, fury ? COL.goldLt : COL.metalHi); }
  for (let i = 0; i < 4; i++) { const q = T([[-1.5, 36 + i * 6], [1.5, 36 + i * 6], [1.5, 38.5 + i * 6], [-1.5, 38.5 + i * 6]]); px.poly(g, q, '#101012'); }
  // the left hand: on the shroud, or arcing up with a grenade, or on the magazine while reloading
  if (s.throwT > 0) { const u = 1 - s.throwT / .45, lift = Math.sin(u * Math.PI) * 60, q = T([[-40 - u * 20, -20 + lift], [-22 - u * 20, -20 + lift], [-20 - u * 20, -2 + lift], [-38 - u * 20, -2 + lift]]); px.poly(g, q, COL.skin); if (u < .6) { const c = T([[-30 - u * 20, 2 + lift]])[0]; WP.Render.sprAt(g, WP.SPR.gren, c[0], c[1], 2 * k); } }
  else if (r > 0 && r < .8) { poly('handL', COL.skin, 8, -18 + magOff); poly('sleeveL', COL.sleeve, 6, -30 + magOff * .5); }
  else { poly('sleeveL', COL.sleeve); poly('handL', COL.skin); }
  // the muzzle flash
  if (s.flash > 0) { const m = T([[0, 84]])[0], f = Math.floor(WP.time * 60) % 3, rr = (10 + f * 3) * k; px.blend(g, .9, 'add', () => { px.disc(g, m[0], m[1], rr, fury ? '#ffe040' : '#ffb040'); px.disc(g, m[0], m[1], rr * .55, '#fff8d0'); for (let i = 0; i < 3; i++) { const t = a - Math.PI / 2 + (i - 1) * .6 + f; px.line(g, m[0], m[1], m[0] + Math.cos(t) * rr * 1.8, m[1] + Math.sin(t) * rr * 1.8, '#ffe080', 2); } }); }
  if (fury) px.blend(g, .25 + .15 * Math.sin(WP.time * 12), 'add', () => px.ddisc(g, T([[0, 30]])[0][0], T([[0, 30]])[0][1], 40 * k, '#ffd040', .6));
  // brass to the right, bouncing on the HUD bar
  for (const b of s.brass) { const q = T([[12, 26]])[0]; px.rect(g, Math.round(q[0] + b.x * k), Math.round(q[1] - 20 + b.y * k), 2, 1, '#e8c040'); }
};
/** where tracers start: the muzzle on screen */
G.muzzle = pid => { const s = S(pid), a = s.a, k = 1.15; return [Math.round(s.x + 84 * Math.sin(a) * k), Math.round(WP.PLAY_H + 8 - 84 * Math.cos(a) * k)]; };
})();
