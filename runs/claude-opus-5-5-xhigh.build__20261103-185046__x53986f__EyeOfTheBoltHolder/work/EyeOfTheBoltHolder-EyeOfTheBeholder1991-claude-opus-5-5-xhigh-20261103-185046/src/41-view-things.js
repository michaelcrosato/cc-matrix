/* =====================================================================================
 * 41-view-things: the things drawn with the pen. Wall features stand on a wall's face: local x along the wall, +y out of
 * it, z up from the floor (walls are 48 tall). Item models lie flat. Every look here is original to this game.
 * ===================================================================================== */
const VIEW_THINGS = {};
const shade = (c, k) => E.shade(c, k);
/** an item's little model, lying at (x, y, z) in the pen's current frame, turned by a */
function itemModel(p, id, x, y, z, a = 0, k = 1) {
  const d = IT(id) || {}, c = d.color || '#a8a8b0', ca = Math.cos(a) * k, sa = Math.sin(a) * k;
  const L = (u, v, w = 0) => [x + u * ca - v * sa, y + u * sa + v * ca, z + w * k];
  const tube = (u0, v0, w0, u1, v1, w1, r, col) => { const A = L(u0, v0, w0), Bq = L(u1, v1, w1); p.tube(A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], r * k, col); };
  const ball = (u, v, w, rx, ry, rz, col) => { const A = L(u, v, w); p.ball(A[0], A[1], A[2], rx * k, ry * k, rz * k, col); };
  const box = (u, v, w, sw, sd, sh, col) => { const A = L(u, v, w); p.box(A[0], A[1], A[2], sw * k, sd * k, sh * k, col, a); };
  switch (d.model) {
    case 'blade': { const l = d.long ? 9 : id.includes('agger') ? 5 : 7; box(0, 0, .5, l, 1.3, .5, c); box(-l / 2 - .4, 0, .6, .8, 3.4, .8, '#8a6a3a'); box(-l / 2 - 2, 0, .6, 2.6, .9, .9, '#5a3a22'); break; }
    case 'axe': tube(-5, 0, .6, 4, 0, .6, .5, '#6a4a2a'); box(3.4, .9, .7, 2.2, 3.4, .8, c); if (d.big) box(3.4, -1.4, .7, 2, 2.6, .8, c); break;
    case 'mace': tube(-5, 0, .6, 3, 0, .6, .5, '#6a4a2a'); ball(3.8, 0, 1.1, 1.8, 1.8, 1.4, c); break;
    case 'staff': tube(-7, 0, .6, 7, 0, .6, .6, c); ball(7, 0, .6, .8, .8, .8, '#9a9aa8'); break;
    case 'spear': tube(-7, 0, .6, 6, 0, .6, .45, '#7a5a32'); p.cone(...L(6, 0, .6), ...L(9, 0, .6), 1.1 * k, c); break;
    case 'sling': tube(-3, -1, .3, 3, 1, .3, .25, c); ball(0, 0, .5, 1.3, 1, .5, shade(c, -.2)); break;
    case 'bow': for (let i = 0; i < 6; i++) { const u0 = -6 + i * 2, u1 = u0 + 2, v0 = Math.sin((i / 6) * PI) * 2.6, v1 = Math.sin(((i + 1) / 6) * PI) * 2.6; tube(u0, v0, .4, u1, v1, .4, .35, c); } tube(-6, 0, .4, 6, 0, .4, .12, '#e8e0c8'); break;
    case 'xbow': box(0, 0, .8, 7, 1.4, 1, c); tube(2.6, -4, .9, 2.6, 4, .9, .45, '#5a5a62'); tube(2.6, -4, .9, -1, 0, .9, .12, '#e8e0c8'); tube(2.6, 4, .9, -1, 0, .9, .12, '#e8e0c8'); if (d.big) box(-2, 0, 1, 3, 2, 1.4, shade(c, -.2)); break;
    case 'darts': for (let i = -1; i <= 1; i++) { tube(-2, i * 1.2, .4, 2, i * 1.2, .4, .2, c); p.cone(...L(2, i * 1.2, .4), ...L(3, i * 1.2, .4), .45 * k, '#e8e8f0'); } break;
    case 'arrows': for (let i = -1; i <= 1; i++) { tube(-4, i * .9, .3, 4, i * .9, .3, .18, '#c8a878'); p.cone(...L(4, i * .9, .3), ...L(5, i * .9, .3), .4 * k, c); } break;
    case 'stones': for (let i = 0; i < 4; i++) ball(Math.cos(i * 1.7) * 1.6, Math.sin(i * 1.7) * 1.6, .7, 1, 1, .7, c); break;
    case 'cloth': box(0, 0, .5, 7, 6, 1, c); box(0, -2.4, .7, 7.4, 1.2, 1, shade(c, -.2)); if (d.studs) for (let i = -2; i <= 2; i += 2) ball(i, 0, 1.1, .4, .4, .3, '#c8c8d0'); break;
    case 'shield': ball(0, 0, .8, 4.2, 4.2, .9, c); ball(0, 0, 1.4, 1.2, 1.2, .6, shade(c, .3)); break;
    case 'cap': ball(0, 0, 1.4, 3, 3, 2, c); box(0, 2.4, .3, 4, 1.4, .4, shade(c, -.2)); break;
    case 'crown': for (let i = 0; i < 6; i++) { const aa = i * PI / 3; p.cone(...L(Math.cos(aa) * 2.4, Math.sin(aa) * 2.4, 0), ...L(Math.cos(aa) * 2.4, Math.sin(aa) * 2.4, 2.6), .7 * k, c); } break;
    case 'amulet': for (let i = 0; i < 8; i++) { const a0 = i * PI / 4, a1 = (i + 1) * PI / 4; tube(Math.cos(a0) * 3, Math.sin(a0) * 3, .2, Math.cos(a1) * 3, Math.sin(a1) * 3, .2, .15, '#c8a050'); } ball(0, 3, .5, 1.2, 1.2, .6, c); break;
    case 'ring': for (let i = 0; i < 8; i++) { const a0 = i * PI / 4, a1 = (i + 1) * PI / 4; tube(Math.cos(a0) * 1.2, Math.sin(a0) * 1.2, .3, Math.cos(a1) * 1.2, Math.sin(a1) * 1.2, .3, .3, '#d8b04a'); } ball(1.2, 0, .6, .5, .5, .5, c); break;
    case 'food': box(0, 0, 1, 4.4, 3, 2, c); box(0, 0, 2.1, 4.6, .6, .3, '#6a4a2a'); break;
    case 'potion': ball(0, 0, 2, 2, 2, 2, c); tube(0, 0, 3.6, 0, 0, 5.4, .7, '#cfe6f0'); box(0, 0, 5.8, 1, 1, .8, '#9a6a3a'); ball(-.6, -.8, 2.6, .5, .4, .5, '#ffffff'); break;
    case 'scroll': tube(-3, 0, .9, 3, 0, .9, .9, '#e8dcb8'); tube(-3.4, 0, .9, -3, 0, .9, 1.1, c); tube(3, 0, .9, 3.4, 0, .9, 1.1, c); break;
    case 'book': box(0, 0, .9, 4.4, 5.6, 1.6, c); box(.4, 0, .9, 3.8, 5.2, 1.2, '#e8dcc0'); break;
    case 'wand': tube(-4, 0, .4, 4, 0, .4, .35, c); p.glow(...L(4.4, 0, .5), .7 * k, c); break;
    case 'key': for (let i = 0; i < 6; i++) { const a0 = i * PI / 3, a1 = (i + 1) * PI / 3; tube(-3 + Math.cos(a0) * 1.3, Math.sin(a0) * 1.3, .4, -3 + Math.cos(a1) * 1.3, Math.sin(a1) * 1.3, .4, .32, c); } tube(-1.7, 0, .4, 3, 0, .4, .35, c); box(2.4, .9, .4, .7, 1.4, .6, c); box(1.3, .9, .4, .6, 1.1, .6, c); break;
    case 'ward': for (let i = 0; i < 10; i++) { const aa = i * PI / 5; box(Math.cos(aa) * 2.6, Math.sin(aa) * 2.6, .5, 1, 1, .7, c); } ball(0, 0, .5, 2.4, 2.4, .5, c); ball(0, 0, .9, .8, .8, .4, shade(c, -.35)); break;
    case 'gear': for (let i = 0; i < 8; i++) { const aa = i * PI / 4; box(Math.cos(aa) * 2.8, Math.sin(aa) * 2.8, .6, 1.2, 1.2, 1, c); } ball(0, 0, .6, 2.4, 2.4, .7, c); ball(0, 0, 1, .7, .7, .4, '#3a2a1a'); break;
    case 'rock': ball(0, 0, 1.8, 2.8, 2.4, 1.9, c); ball(1.2, -.8, 2.6, 1.5, 1.4, 1.2, shade(c, .12)); break;
    case 'ingot': box(0, 0, 1, 5, 2.6, 2, c); box(0, 0, 2.05, 4.2, 2, .2, shade(c, .2)); break;
    case 'bone': tube(-3.5, 0, .7, 3.5, 0, .7, .6, c); ball(-3.8, .6, .7, .9, .9, .8, c); ball(-3.8, -.6, .7, .9, .9, .8, c); ball(3.8, .6, .7, .9, .9, .8, c); ball(3.8, -.6, .7, .9, .9, .8, c); break;
    case 'picks': box(0, 0, .5, 4, 2.4, .8, '#5a3a22'); for (let i = -1; i <= 1; i++) tube(-1, i * .7, 1, 2.6, i * .7, 1, .15, c); break;
    case 'lantern': box(0, 0, 2, 2.6, 2.6, 4, '#3a3a44'); p.glow(...L(0, 0, 2), 1.1 * k, c); break;
    case 'coin': ball(0, 0, .5, 2, 2, .5, c); ball(0, 0, .8, 1.2, 1.2, .3, shade(c, .3)); break;
    default: ball(0, 0, 1, 2, 2, 1, c);
  }
}
B.itemModel = itemModel;

/* ---- wall features ---- */
Object.assign(VIEW_THINGS, {
  wallLever(p, t) {
    const a = t.on ? -1 : 1, base = t.color || '#4a4452';
    p.box(0, .8, 22, 7, 1.6, 11, base).box(0, 1.8, 22, 2.2, .8, 6.5, '#24202a')
      .tube(0, 2.2, 22, 0, 4.2, 22 + a * 6, .6, '#a8a8b8').ball(0, 4.4, 22 + a * 6.4, 1.3, 1.3, 1.3, t.on ? '#c8a050' : '#8a4a3a');
    if (t.glow) p.halo(0, 2, 22, 9, [.25, .2, .08]);
  },
  wallButton(p, t) {
    const pr = clamp(t.press || 0, 0, 1);
    p.box(0, .6, 20, 8, 1.2, 8, t.color || '#5a5260').box(0, 1.6 - pr * .9, 20, 3.6, 1.2, 3.6, '#c8a050').ball(0, 2.2 - pr * .9, 20, 1.2, .6, 1.2, '#ffe08a');
  },
  catch(p, t) {
    if (t.look === 'rivet') { p.box(4, .25, 17, 4, .5, 3, '#8a6a3a').ball(4, .7, 17, 1, .5, 1, t.used ? '#7a5a2a' : '#d8b04a'); }
    else { const c = t.color || '#4a5048'; p.box(-3, t.used ? .2 : 1.1, 15, 7, 2.2, 4, shade(c, .08)).box(-3, t.used ? .5 : 1.4, 13.1, 7.2, 2.4, .5, shade(c, -.25)); }
    if (t.glint) p.glow(t.look === 'rivet' ? 4 : -3, 2, t.look === 'rivet' ? 17 : 15, .6 + Math.sin((t.t || 0) * 6) * .25, '#fff6c8').halo(t.look === 'rivet' ? 4 : -3, 2, 16, 6, [.3, .26, .1]);
  },
  alcove(p, t) {
    const c = t.color || '#4a4452', dk = '#0e0c12';
    p.box(0, .4, 8, 16, .8, 2, shade(c, .1)).box(0, .4, 24, 16, .8, 2, shade(c, .1)).box(-8, .4, 16, 2, .8, 18, shade(c, .05)).box(8, .4, 16, 2, .8, 18, shade(c, .05));
    p.box(0, -.4, 16, 14, .4, 14, dk).box(0, 1.6, 8.6, 14, 3, .8, shade(c, -.1));
    (t.items || []).forEach((id, i) => itemModel(p, id, (i - (t.items.length - 1) / 2) * 4, 1.8, 9.2, PI / 2 + i * .4, .9));
    if (t.shrine) for (let i = 0; i < 7; i++) { const a = PI + i * PI / 6; p.ball(Math.cos(a) * 9, 3 + Math.sin(a) * 1.2, 4 + Math.abs(Math.sin(a)) * 3, 1.3, 1.6, 1.2, '#7a7068').cone(Math.cos(a) * 9, 3, 6, Math.cos(a) * 9, 3.6, 7.6, .6, '#6a6058'); }
    if (t.glint) p.halo(0, 2, 12, 10, [.2, .17, .08]);
  },
  gearNiche(p, t) {
    p.ball(0, .3, 26, 4.6, .6, 4.6, '#2a2420').ball(0, .6, 26, 3.2, .6, 3.2, '#140e0a');
    if ((t.items || []).length) for (let i = 0; i < 8; i++) { const q = (t.t || 0) * (t.on ? 1.5 : 0) + i * PI / 4; p.box(Math.cos(q) * 3, 1.6, 26 + Math.sin(q) * 3, 1.2, 1, 1.2, '#c8a050'); }
    if ((t.items || []).length) p.ball(0, 1.6, 26, 2.5, .8, 2.5, '#c8a050').ball(0, 2, 26, .8, .5, .8, '#3a2a1a');
  },
  clockFace(p, t) {
    p.ball(0, .4, 30, 11, .8, 11, '#c8b890').ball(0, .8, 30, 9.5, .6, 9.5, '#f0e8d0');
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; p.box(Math.cos(a) * 8, 1.1, 30 + Math.sin(a) * 8, 1, .4, 1, '#3a2a1a'); }
    const h = t.on ? (t.t || 0) * .3 : -.6, m = t.on ? (t.t || 0) * 2 : 1.2;
    p.tube(0, 1.3, 30, Math.sin(h) * 5, 1.3, 30 + Math.cos(h) * 5, .5, '#2a1a10').tube(0, 1.5, 30, Math.sin(m) * 7.5, 1.5, 30 + Math.cos(m) * 7.5, .35, '#2a1a10').ball(0, 1.7, 30, 1, .5, 1, '#c8a050');
    p.box(0, .8, 15, 10, 1.6, 4, '#6a5030');
    (t.items || []).forEach((id, i) => itemModel(p, id, (i - (t.items.length - 1) / 2) * 5, 2.2, 17.4, PI / 2, .9));
    if (t.on) p.halo(0, 2, 30, 14, [.18, .15, .06]);
  },
  plaque(p, t) {
    p.box(0, .5, 24, 14, 1, 10, '#6a6460').box(0, 1.05, 24, 12.4, .2, 8.4, '#5a5450');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) p.box(-4.5 + i * 3 + (r % 2), 1.2, 27 - r * 3, 2, .2, .7, '#2a2624');
    if (t.read) p.halo(0, 1.5, 24, 9, [.12, .1, .06]);
  },
  candle(p, t) {
    p.box(0, 1, 18, 4, 2, 1, '#8a8a98').tube(0, 1.6, 18.5, 0, 1.6, 23, .9, '#e8e4d8');
    if (t.on) { const f = 1 + Math.sin((t.t || 0) * 13 + t.x) * .15; p.glow(0, 1.6, 24.6, 1 * f, '#bfe0ff').halo(0, 1.6, 24.6, 9, [.12, .2, .32]); }
    else p.tube(0, 1.6, 23, 0, 1.6, 23.8, .15, '#2a2a2a');
  },
  greatLock(p, t) {
    const a = t.turn || 0, rune = t.on ? '#3a4050' : '#8ae0ff';
    p.ball(0, .6, 24, 15, 1.2, 15, '#3a3e48').ball(0, 1.4, 24, 12, 1, 12, '#2a2e36');
    for (let i = 0; i < 6; i++) { const q = a + i * PI / 3; p.tube(0, 2.4, 24, Math.cos(q) * 11, 2.4, 24 + Math.sin(q) * 11, 1, '#9a8a6a').ball(Math.cos(q) * 11.5, 2.6, 24 + Math.sin(q) * 11.5, 1.6, 1.4, 1.6, '#c8a050'); }
    p.ball(0, 3, 24, 3.4, 1.4, 3.4, '#c8a050');
    for (let i = 0; i < 8; i++) { const q = i * PI / 4; p.box(Math.cos(q) * 14, 1.4, 24 + Math.sin(q) * 14, 1.6, .6, 1.6, rune); }
    if (!t.on) p.halo(0, 2, 24, 18, [.08, .2, .26]);
  },
  raiseShrine(p, t) {
    p.box(0, .6, 18, 18, 1.2, 22, '#5a5448').box(0, 1.4, 18, 10, .6, 14, '#2a2620');
    for (let i = 0; i < 9; i++) { const q = i * PI / 4.5; p.box(Math.cos(q) * 7.5, 1.6, 18 + Math.sin(q) * 7.5, 1.4, .6, 2.6, '#c8a050'); }
    p.box(0, 2, 18, 2.4, 1.6, 4, t.used ? '#5a4a30' : '#ffd36a');
    if (!t.used) p.halo(0, 2, 18, 12, [.22, .18, .06]);
  },
  grate(p) { p.box(0, .3, 4, 14, .6, 7, '#1a1a1c'); for (let i = -6; i <= 6; i += 2) p.box(i, .7, 4, .7, .6, 7, '#5a5a5e'); },
  pipe(p, t) { p.tube(-12, 2.5, 40, -2, 2.5, 40, 2, '#4a5a4a').tube(-2, 2.5, 40, -2, 2.5, 30, 2, '#4a5a4a').ball(-2, 2.5, 30, 2.4, 2.4, 1, '#5a6a5a'); const d = ((t.t || 0) * .7 + t.x) % 1; p.ball(-2, 2.5, 29 - d * 28, .5, .5, .8, '#8ac8b8'); },
  chain(p) { for (let i = 0; i < 9; i++) p.ball(0, 1.6, 44 - i * 3, i % 2 ? .5 : 1.1, i % 2 ? 1.1 : .5, 1.6, '#6a5040'); p.ball(0, .8, 45, 1.6, .8, 1.6, '#4a4a4a'); },
  gearWall(p, t) {
    const a = (t.t || 0) * (t.x % 2 ? .4 : -.3), R = 8;
    for (let i = 0; i < 10; i++) { const q = a + i * PI / 5; p.box(Math.cos(q) * R, .8, 28 + Math.sin(q) * R, 2.2, 1.6, 2.2, '#9a7a40'); }
    p.ball(0, .8, 28, R - 1, 1, R - 1, '#7a5a30').ball(0, 1.4, 28, 2.4, .8, 2.4, '#3a2a1a');
    for (let i = 0; i < 4; i++) { const q = a + i * PI / 2; p.tube(0, 1.6, 28, Math.cos(q) * 5.6, 1.6, 28 + Math.sin(q) * 5.6, .8, '#8a6a38'); }
  },
  eyeRelief(p) {
    p.ball(0, .3, 26, 9, .8, 5, '#3a3448').ball(0, .7, 26, 7, .6, 1.2, '#1e1a28');
    for (let i = -3; i <= 3; i++) p.box(i * 2, .9, 24.4, .5, .3, 1.6, '#4a4458');
  },
  /* ---- doors ---- */
  sealDoor(p, t) {
    const o = clamp(t.open || 0, 0, 1), w = 32, h = 46, z0 = o * h;
    p.box(-w / 2 - 2, 0, h / 2, 4, 8, h, '#4a4458').box(w / 2 + 2, 0, h / 2, 4, 8, h, '#4a4458').box(0, 0, h + 2, w + 8, 8, 4, '#4a4458');
    if (o < 1) {
      p.box(0, 0, z0 + (h - z0) / 2, w, 3, h - z0, '#3a3450');
      const glow = (1 - o) * (.7 + Math.sin((t.t || 0) * 3) * .3);
      for (let i = 0; i < 12; i++) { const gx = -12 + (i % 4) * 8, gz = 8 + Math.floor(i / 4) * 12 + z0 * .3; if (gz > z0 && gz < h) p.box(gx, -1.8, gz, 3, .4, 4, glow > .2 ? '#c8a8ff' : '#5a4a7a').box(gx, 1.8, gz, 3, .4, 4, '#5a4a7a'); }
      p.halo(0, -3, h / 2, 16 * (1 - o), [.18 * glow, .12 * glow, .3 * glow]);
    }
  },
  undergate(p, t) {
    const o = clamp(t.open || 0, 0, 1), w = 32, h = 48, z0 = o * h, bolts = t.bolts || 0;
    p.box(-w / 2 - 3, 0, h / 2, 6, 10, h, '#2a2434').box(w / 2 + 3, 0, h / 2, 6, 10, h, '#2a2434');
    if (o < 1) {
      p.box(0, 0, z0 + (h - z0) / 2, w, 6, h - z0, '#3a3a44');
      for (let i = 0; i < 7; i++) {
        const z = 6 + i * 6 + z0, out = i < bolts ? 1 : 0, side = i % 2 ? 1 : -1; if (z > h - 2) continue;
        p.box(side * (w / 2 - 6 - out * 14) , -3.4, z, 18, 2.2, 2.6, '#7a7e8a').box(side * (w / 2 - 6 - out * 14 + 9), -3.6, z, 2.4, 2.8, 3.6, '#5a5e6a');
      }
      const kh = [['#d0703a', 'copper'], ['#e0b84a', 'brass'], ['#8a8ea0', 'iron']];
      kh.forEach(([c, k], i) => { const x = (i - 1) * 9, z = h * .55 + z0; if (z > h) return; p.ball(x, -3.6, z, 3.2, .8, 3.2, t['w_' + k] ? c : '#1a1820'); if (t['w_' + k]) p.halo(x, -4, z, 6, [.25, .18, .06]); });
    }
  },
  /* ---- floor features ---- */
  pit(p, t) {
    if (t.bridged) { p.box(0, 0, -.6, 30, 30, 2, '#5a5a5e').box(0, 0, .5, 26, 26, .3, '#6a6a70'); return; }
    if (t.closed) { if (t.seams) { for (const s of [-1, 1]) { p.box(s * 13, 0, .2, .6, 26, .2, '#141216').box(0, s * 13, .2, 26, .6, .2, '#141216'); } } return; }
    p.box(0, 0, .15, 30, 30, .3, '#030204').box(0, -15.5, .4, 31, 1.5, .8, '#2a2a2e').box(0, 15.5, .4, 31, 1.5, .8, '#2a2a2e').box(-15.5, 0, .4, 1.5, 31, .8, '#2a2a2e').box(15.5, 0, .4, 1.5, 31, .8, '#2a2a2e');
  },
  plateF(p, t) { const s = t.on ? .2 : 1, c = t.color || '#6a6474'; p.box(0, 0, s / 2, 22, 22, s, c).box(0, 0, s + .05, 17, 17, .1, E.shade(c, -.2)); },
  dartTrap(p, t) { p.box(0, 0, .3, 20, 20, .5, t.color || '#4a4e4a'); for (let i = 0; i < 4; i++) p.ball(-6 + i * 4, 0, .7, .6, .6, .3, '#141414'); if (t.glint) p.glow(0, 0, 1.5, .7, '#fff6c8'); },
  stairDown(p, t) {
    const s = t.color || '#5a5468';
    p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s);
    for (let k = 0; k < 5; k++) p.box(0, -2 - k * 3, -1 - k * 2.6, 22, 3, 2, '#3a3644');
    p.box(0, -14, 10, 22, 1, 30, '#0a080e');
    if (t.on) p.glow(0, -8, 16, 4, '#fff6d8').halo(0, -8, 16, 20, [.3, .28, .2]);
  },
  stairUp(p, t) {
    const s = t.color || '#5a5468';
    p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s);
    for (let k = 0; k < 7; k++) p.box(0, -2 - k * 3, 1 + k * 3, 22, 3, 2 + k * 6 > 0 ? 2 : 2, '#4a4654');
    if (t.sealed) for (let i = -2; i <= 2; i++) p.box(i * 4.5, -8, 24, 1.2, 1.2, 30, '#6a6a72');
  },
  ladder(p) { for (const s of [-1, 1]) p.tube(s * 6, -14, 0, s * 6, -14, 48, .8, '#6a4a2a'); for (let i = 0; i < 8; i++) p.tube(-6, -14, 4 + i * 6, 6, -14, 4 + i * 6, .5, '#7a5a32'); },
  brazierGlow(p, t) { p.halo(0, 0, 4, 10, [.4, .2, .05]); },
  forge(p, t) { p.box(0, 0, 6, 14, 10, 12, '#3a3030').box(0, -5.2, 7, 10, .6, 6, '#ff7a2a'); p.glow(0, -5, 7, 3 + Math.sin((t.t || 0) * 5) * .4, '#ffb050'); },
  anvil(p) { p.box(0, 0, 4, 6, 4, 8, '#3a3a40').box(0, 0, 9, 14, 5, 3, '#4a4a52').cone(7, 0, 9, 11, 0, 9, 1.6, '#4a4a52'); },
  bench(p) { p.box(0, 0, 10, 26, 10, 2, '#5a3a22'); for (const [x, y] of [[-11, -4], [11, -4], [-11, 4], [11, 4]]) p.box(x, y, 5, 2, 2, 10, '#4a2e1a'); p.box(-6, 0, 12, 4, 3, 2, '#9a9aa8').ball(6, 2, 12, 2, 2, 1, '#c8a050'); },
  bones(p) { p.tube(-5, 0, .8, 5, 2, .8, .7, '#d8cfb4').tube(-2, -4, .8, 3, 4, .8, .6, '#d8cfb4').ball(4, -3, 2, 2.6, 2.4, 2.4, '#e0d8c0').ball(5, -4.6, 2, .6, .4, .6, '#1a1210'); },
  banner(p, t) { p.tube(-7, .6, 44, 7, .6, 44, .5, '#6a5040'); const w = Math.sin((t.t || 0) * 1.4 + t.x) * .4; p.slab(0, 1.4, 43, w, 1.4, 22, 1, 0, 0, 12, .4, t.color || '#4a3a6a'); p.ball(0, 1.8, 34, 2.6, .4, 1.2, '#d8d0e8').ball(0, 2, 34, 1, .3, .6, '#1a1428'); },
  cobweb(p) { for (let i = 0; i < 5; i++) { const a = i * PI / 8; p.tube(0, 0, 0, Math.cos(a) * 9, 0, -Math.sin(a) * 9, .12, '#c8c8d0'); } for (let r = 3; r <= 7; r += 4) for (let i = 0; i < 4; i++) { const a0 = i * PI / 8, a1 = (i + 1) * PI / 8; p.tube(Math.cos(a0) * r, 0, -Math.sin(a0) * r, Math.cos(a1) * r, 0, -Math.sin(a1) * r, .1, '#b8b8c0'); } },
  altarSlab(p, t) { p.box(0, 0, 4, 20, 14, 8, '#2a2434').box(0, 0, 8.4, 22, 16, .8, '#3a3448'); (t.items || []).forEach((id, i) => itemModel(p, id, (i - (t.items.length - 1) / 2) * 6, 0, 9, 0, 1)); if (t.on) p.halo(0, 0, 10, 14, [.1, .16, .26]); }
});
