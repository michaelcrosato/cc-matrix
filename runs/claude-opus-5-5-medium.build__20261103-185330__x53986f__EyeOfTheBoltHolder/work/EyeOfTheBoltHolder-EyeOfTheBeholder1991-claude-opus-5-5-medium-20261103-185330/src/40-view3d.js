/* VIEW: the presenter. One E.World3D per floor, built at boot (level text from the map, 2 x 2 tiles a cell; things for
 * doors and wall features; lights), mirrored from the sim every frame: the camera from the party's tween, doors from
 * their open values, monsters as cards or pen-drawn bodies, floor items as little pen models, projectiles, telegraphs and
 * the first-person weapon overlay. It never writes sim state. NullView (44) stands in for it in Node. */
const W3 = () => E.World3D;
B.rigCache = new Map();
/** a member's rig: race look, class dress, a beard for dwarves */
B.memberRig = m => {
  const k = m.id + ':' + m.look + ':' + m.cls; if (B.rigCache.has(k)) return B.rigCache.get(k);
  let o;
  if (m.rig && B.SPEAKERS[m.rig]) o = JSON.parse(JSON.stringify(B.SPEAKERS[m.rig].rig));
  else {
    const look = (B.LOOKS[m.race] || B.LOOKS.human)[m.look % 6], dress = B.CLASS_DRESS[m.cls] || {};
    o = Object.assign({ size: m.race === 'halfling' ? .95 : m.race === 'dwarf' ? 1.1 : 1.25, build: m.race === 'dwarf' ? 'bulky' : m.race === 'elf' ? 'heroic' : 'chibi' }, JSON.parse(JSON.stringify(dress)), { hair: look.hair, beard: look.beard || null });
    o.colors = Object.assign({}, dress.colors, look.colors);
    if (dress.hood) o.colors.hair = dress.colors.cloth;
  }
  const r = new E.Humanoid(Object.assign({ speedRef: 60 }, o)); B.rigCache.set(k, r); return r;
};
B.speakerRig = id => { const k = 'sp:' + id; if (B.rigCache.has(k)) return B.rigCache.get(k); const sp = B.SPEAKERS[id]; if (!sp || !sp.rig) return null; const r = new E.Humanoid(Object.assign({ speedRef: 60 }, sp.rig)); B.rigCache.set(k, r); return r; };
B.MON_LOOK = {
  rat: { blob: { R: 3.6, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } } },
  latchkin: { rig: { size: .85, build: 'chibi', hunch: .5, hood: true, outfit: 'tunic', bladeLen: 5, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', hair: '#4a3a2a', cloth: '#6a4a32', pants: '#3a2e22', metal: '#9a9aa8' } }, move: 'thrust' },
  ooze: { blob: { R: 8, face: 'front', mouth: true, colors: { base: '#5a8a3a', dk: '#2e5a22', lt: '#9ad06a', spec: '#e8ffd0' } } },
  snick: { rig: { size: 1.0, build: 'bulky', hunch: .3, hat: { style: 'crown', color: '#c8a040' }, armor: true, outfit: 'coat', bladeLen: 9, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', cloth: '#5a3a2a', coat: '#4a2a1a', plate: '#a08040', hair: '#3a2a1a' } }, move: 'overhead' },
  skeleton: { rig: { size: 1.2, build: 'skeleton', outfit: 'coat', bladeLen: 7, colors: { bone: '#d8cfb4', cloth: '#5a4030', coat: '#4a3020', metal: '#8a8a90' } }, move: 'overhead' },
  rustling: { blob: { R: 4.2, horns: true, feet: true, mouth: true, colors: { base: '#b8642a', dk: '#7a3a18', lt: '#e8a060' } } },
  sentinel: { rig: { size: 1.6, build: 'bulky', armor: true, hat: { style: 'helmet', color: '#8a6a3a' }, bladeLen: 14, eyeGlow: '#ff8a3a', colors: { cloth: '#6a4a2a', plate: '#b08a4a', metal: '#c8a868', skin: '#5a4a3a' } }, move: 'twohand' },
  seer: { rig: { size: 1.25, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', eyeGlow: '#8ae0ff', colors: { cloth: '#d8d0e8', hair: '#d8d0e8', skin: '#b8b0c8', trim: '#6a4a9a' } }, move: 'cast' },
  warden: { rig: { size: 1.35, build: 'heroic', armor: true, hat: { style: 'helmet', color: '#2a2434' }, weapon: 'staff', eyeGlow: '#e8e8ff', colors: { cloth: '#2a2434', plate: '#4a4458', metal: '#9a98a8', skin: '#b8b0c8' } }, move: 'thrust' },
  golem: { rig: { size: 1.9, build: 'bulky', armor: true, weapon: null, eyeGlow: '#7ad8ff', colors: { cloth: '#3a3e46', plate: '#5a606a', skin: '#4a4e56', hair: '#3a3e46' } }, move: 'haymaker' },
  gazer: { orb: { color: '#e8a040', r: 4 }, fly: 18 },
  leech: { pen: true }, ratknot: { pen: true }, spider: { pen: true }, hound: { pen: true }, boltholder: { pen: true, fly: 22 }
};
/* ---- wall features and props drawn with the pen (local +y points out of the wall, toward the party) ---- */
B.registerThings = () => {
  const T = W3().THINGS, sh = E.shade;
  T.wallLever = (p, t) => { const a = t.ang === undefined ? (t.on ? 1 : -1) : t.ang; p.box(0, .8, 22, 6, 1.6, 9, '#4a4452').box(0, 1.8, 22, 2, .8, 5.5, '#24202a').tube(0, 2.2, 22, 0, 3.8, 22 + a * 5.5, .6, '#a8a8b8').ball(0, 4, 22 + a * 6, 1.2, 1.2, 1.2, t.on ? '#4ae070' : '#e8483a'); };
  T.wallButton = (p, t) => { const d = t.pressT > 0 ? .4 : 1.4; p.box(0, .6, 20, 8, 1.2, 8, '#5a5462').ball(0, .6 + d, 20, 2.4, d, 2.4, '#c8a050'); };
  T.catchStone = (p, t) => { const c = t.color || '#5a5a58'; if (t.rivet) p.box(0, .5, 18, 5, 1, 5, '#8a6a3a').ball(0, 1.3, 18, 1.4, .8, 1.4, t.on ? '#8a7a5a' : '#e8c060'); else p.box(4, t.on ? .2 : 1, 14, 9, t.on ? .4 : 2, 6, sh(c, .12)).bar(1, 1.9, 14.5, 7, 1.9, 13.5, .4, .2, '#2a2a28'); if (t.glint) p.glow(4, 2.2, 15, 1.2 + Math.sin(t.t * 6) * .4, '#ffd36a'); };
  T.alcove = (p, t) => { p.box(0, .3, 16, 14, .6, 12, '#141218').box(0, 1.2, 10, 16, 2.4, 1.4, '#5a5462').box(0, 1.2, 22.6, 16, 2.4, 1.4, '#5a5462'); if (t.shrine) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p.ball(Math.cos(a) * 5, 1.6, 15 + Math.sin(a) * 4, 1, 1, 1, '#8a8a80'); } };
  T.plaque = (p, t) => { p.box(0, .5, 26, 18, 1, 10, '#6a6458').box(0, 1, 26, 16, .4, 8, '#7a7468'); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) p.box(-6 + j * 4, 1.3, 29 - k * 3, 2.6, .3, .8, '#2a2620'); };
  T.grate = (p) => { p.box(0, .3, 6, 16, .6, 10, '#141414'); for (let k = -6; k <= 6; k += 3) p.box(k, .8, 6, .8, .8, 10, '#4a4a48'); for (const z of [2, 10]) p.box(0, .8, z, 16, .8, .8, '#4a4a48'); };
  T.pipe = (p, t) => { p.tube(-14, 2, 34, 14, 2, 34, 2.2, '#4a5a4a').tube(6, 2, 34, 6, 2, 8, 1.8, '#4a5a4a').ball(6, 2, 8, 2.4, 2.4, 1, '#3a4a3a'); const d = ((t.t || 0) * .8) % 1; p.ball(6, 2.4, 8 - d * 8, .6, .6, .9, '#8ab0a0'); };
  T.chain = (p) => { for (let k = 0; k < 8; k++) p.ball(Math.sin(k) * .3, 2, 44 - k * 3.2, .9, .5, 1.6, '#5a5a60'); };
  T.cage = (p, t) => { for (let k = -12; k <= 12; k += 4) p.tube(k, 6, 0, k, 6, 46, .6, '#4a4a50'); p.box(0, 6, 46, 28, 2, 2, '#4a4a50'); };
  T.gearWall = (p, t) => { const a = (t.t || 0) * .6 * (t.rev ? -1 : 1); p.ball(0, .8, 26, 9, 1, 9, '#7a6a48').ball(0, 1.6, 26, 3, 1, 3, '#4a3a28'); for (let k = 0; k < 10; k++) { const b = a + k / 10 * Math.PI * 2; p.box(Math.cos(b) * 10, 1, 26 + Math.sin(b) * 10, 3, 1.4, 3, '#9a8458', -b); } };
  T.eyeRelief = (p, t) => { p.ball(0, .4, 26, 10, .8, 5, '#3a3448').ball(0, 1, 26, 4.5, .8, 4.5, '#5a5468').ball(0, 1.6, 26, 2, .6, 2, '#1a1622').bar(-10, 1.2, 26, 10, 1.2, 26, 1, .6, '#2a2434'); };
  T.candle = (p, t) => { p.box(0, 1.5, 22, 5, 3, 1, '#3a3a40').tube(0, 2.5, 23, 0, 2.5, 28, 1.1, '#e8e0d0'); if (t.on) p.glow(0, 2.5, 30 + Math.sin((t.t || 0) * 9) * .3, 1.6, '#cfe8ff').halo(0, 2.5, 30, 8, [.25, .35, .5]); };
  T.greatLock = (p, t) => { const a = (t.spin || 0); p.ball(0, 1.5, 24, 14, 2, 14, '#3a3e46').ball(0, 3.4, 24, 4, 2, 4, '#5a606a'); for (let k = 0; k < 6; k++) { const b = a + k / 6 * Math.PI * 2; p.bar(0, 3.2, 24, Math.cos(b) * 13, 3.2, 24 + Math.sin(b) * 13, 2, 1.4, '#6a707a'); p.ball(Math.cos(b) * 13, 3.6, 24 + Math.sin(b) * 13, 1.6, 1, 1.6, '#8a909a'); } if (!t.on) p.glow(0, 4, 24, 2.2, '#6ae8ff').halo(0, 4, 24, 14, [.1, .35, .45]); };
  T.gearNiche = (p, t) => { p.box(0, .3, 26, 10, .6, 10, '#141218'); p.ball(0, 1.2, 26, 5, .4, 5, '#2a2218'); };
  T.clockFace = (p, t) => { p.ball(0, 1, 28, 14, 1, 14, '#d8c8a0').ball(0, 1.6, 28, 12.5, .6, 12.5, '#e8dcc0'); for (let k = 0; k < 12; k++) { const b = k / 12 * Math.PI * 2; p.box(Math.cos(b) * 10.5, 2, 28 + Math.sin(b) * 10.5, 1, .5, 1, '#3a2a1a'); } const h = t.on ? (t.t || 0) * .1 : 1.2, m = t.on ? (t.t || 0) * 1.2 : 4.1; p.bar(0, 2.4, 28, Math.cos(h) * 6, 2.4, 28 + Math.sin(h) * 6, 1.2, .5, '#2a1a0a').bar(0, 2.6, 28, Math.cos(m) * 9.5, 2.6, 28 + Math.sin(m) * 9.5, .8, .5, '#2a1a0a'); };
  T.shrine = (p, t) => { p.box(0, 3, 4, 16, 6, 8, '#5a5248').box(0, 3, 9, 6, 4, 2, '#c8a050'); for (let k = 0; k < 8; k++) { const b = k / 8 * Math.PI * 2; p.ball(Math.cos(b) * 6, 3 + Math.sin(b) * 2, 10.5, .9, .9, 1.2, '#b89a5a'); } p.tube(0, 3, 10, 0, 3, 16, .6, '#e8c050').ball(0, 3, 17, 1.6, .5, 1.6, '#e8c050'); if (!t.on) p.halo(0, 3, 14, 8, [.3, .25, .1]); };
  T.altarSlab = (p, t) => { p.box(0, 0, 4, 22, 14, 8, '#1a1622').box(0, 0, 8.3, 20, 12, .6, '#2a2434'); p.ball(0, 0, 8.6, 4, 3, .4, '#4a4458'); };
  T.stairDown = (p, t) => { const s = t.color || '#5a5468'; p.box(-14, 0, 22, 4, 6, 44, s).box(14, 0, 22, 4, 6, 44, s).box(0, 0, 45, 32, 6, 4, s); for (let k = 0; k < 5; k++) p.box(0, -2 - k * 3, -1 - k * 3, 24, 3, 2, sh(s, -.2 - k * .05)); p.box(0, 4, 20, 24, 1, 40, '#08070a'); };
  T.stairUp = (p, t) => { const s = t.color || '#5a5468'; p.box(-14, 0, 22, 4, 6, 44, s).box(14, 0, 22, 4, 6, 44, s).box(0, 0, 45, 32, 6, 4, s); for (let k = 0; k < 7; k++) p.box(0, 2 + k * 3, 2 + k * 5, 24, 3, 4, sh(s, k * .03)); if (t.sealed) for (let k = -10; k <= 10; k += 4) p.tube(k, 4, 34, k, 4, 44, .6, '#3a3a40'); };
  T.undergate = (p, t) => {
    const o = clamp(t.open || 0, 0, 1), c = '#3a3e46';
    p.box(-17, 0, 24, 3, 8, 48, '#2a2e36').box(17, 0, 24, 3, 8, 48, '#2a2e36');
    p.box(-16 * o - 8 + 0, 0, 24, 16, 4, 46, c).box(16 * o + 8, 0, 24, 16, 4, 46, c);
    for (let k = 0; k < 7; k++) { const z = 6 + k * 6, slide = (t.bolts || 0) > k ? 10 : 0; p.bar(-6 - slide, -2.4, z, 6 + slide, -2.4, z, 2, 2, '#6a707a'); }
    for (let k = 0; k < 3; k++) { const filled = (t.wards || 0) > k; p.ball(-8 + k * 8, -2.6, 30, 2.4, .6, 2.4, filled ? ['#d0783a', '#e8c050', '#8a92a0'][k] : '#0a0a0e'); }
  };
  T.seal = (p, t) => { const o = clamp(t.open || 0, 0, 1); if (o >= 1) return; const c = '#3a3050'; p.box(-18, 0, 23, 4, 8, 46, '#4a4258').box(18, 0, 23, 4, 8, 46, '#4a4258').box(0, 0, 47, 40, 8, 4, '#4a4258'); p.box(0, 0, 23 + o * 23, 32, 3, 46 * (1 - o), c); for (let k = 0; k < 5; k++) p.glow(-10 + k * 5, -2, 14 + (k % 2) * 14 + Math.sin((t.t || 0) * 2 + k) * 2, 1.2, '#8ae0ff'); p.halo(0, -2, 24, 16, [.08, .2, .3]); };
  T.pitHole = (p, t) => { if (t.bridged) { p.box(0, 0, -.6, 30, 30, 1.4, '#3a3634'); return; } if (!t.open && !t.seams) return; if (!t.open) { p.box(0, 0, .15, 28, .4, .2, '#151515').box(0, 0, .15, .4, 28, .2, '#151515').box(0, 14, .15, 28, .4, .2, '#151515').box(0, -14, .15, 28, .4, .2, '#151515'); return; } p.box(0, 0, .12, 30, 30, .2, '#020203').box(0, 15, .4, 32, 2, .8, '#3a3a3a').box(0, -15, .4, 32, 2, .8, '#3a3a3a').box(15, 0, .4, 2, 32, .8, '#3a3a3a').box(-15, 0, .4, 2, 32, .8, '#3a3a3a'); };
  T.platePad = (p, t) => { const s = t.on ? .2 : 1.2, c = t.color || '#6a6474'; p.box(0, 0, s / 2, 22, 22, s, c).box(0, 0, s + .05, 17, 17, .1, sh(c, -.2)); };
  T.dartHoles = (p, t) => { if (!t.on) return; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.ball(s * 15.6, -6 + k * 6, 20, .4, .8, .8, '#ffd36a'); };
  T.teleField = (p, t) => { const a = (t.t || 0) * 2; for (let k = 0; k < 6; k++) { const b = a + k; p.glow(Math.cos(b) * 8, Math.sin(b) * 8, 6 + k * 5 + Math.sin(a + k) * 2, 1.4, '#8ab8ff'); } p.halo(0, 0, 20, 18, [.1, .15, .35]); };
  T.stairLight = (p, t) => { if (!t.on) return; p.box(0, 0, 24, 28, 2, 46, '#fff6d8').halo(0, -6, 24, 30, [.6, .55, .35]); for (let k = 0; k < 6; k++) p.box(0, -2 - k * 3, 2 + k * 5, 24, 3, 3, '#d8c8a0'); };
};

/* ---- the presenter ---- */
B.View3D = class {
  constructor(game) { this.game = game; this.worlds = {}; this.fid = null; this.mons = new Map(); this.fx = []; this.swing = null; this.lightning = []; this.flashT = 0; this.dissolveT = 0; this.overlayOn = true; this.hover = null; }
  get world() { return this.worlds[this.fid] && this.worlds[this.fid].world; }
  /** build every floor's world (at boot, behind the boot screen) */
  build(fid) {
    const F = B.FLOORS[fid], L = F.look, w = F.map[0].length, h = F.map.length, rows = [];
    const wallLike = (x, y) => { const c = (F.map[y] || '')[x] || '#'; return c === '#'; };
    const torchAt = {};
    for (const [, kind, x, y, face] of F.features || []) if (kind === 'torch') { const d = FACE[face], wx = x + DX[d], wy = y + DY[d], open = (d + 2) % 4; torchAt[key(wx, wy)] = open; }
    const NICHE = [['t#', '##'], ['#t', '##'], ['##', 't#'], ['t#', '##']];
    for (let y = 0; y < h; y++) for (let k = 0; k < 2; k++) {
      let row = '';
      for (let x = 0; x < w; x++) { const t = torchAt[key(x, y)]; row += t !== undefined ? NICHE[t][k] : wallLike(x, y) ? '##' : '..'; }
      rows.push(row);
    }
    const wallSpec = { wall: 48, side: L.side, color: L.wall, line: E.shade(L.wall, -.4), top: E.shade(L.wall, .2) };
    const water = L.water || [];
    const ground = (x, y) => {   // a floor colour function: flagstones, dark water channels, rune lines in the Vault
      const cx = Math.floor(x / C), cy = Math.floor(y / C), lx = x - cx * C, ly = y - cy * C;
      const n = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1, b = E.hex(L.ground), d = E.hex(L.dark), l = E.hex(L.light);
      const seam = (Math.floor(lx) % 16 === 0 || Math.floor(ly + (Math.floor(lx / 16) % 2) * 8) % 16 === 0);
      let c = seam ? d : n > .82 ? l : n < .15 ? d : b;
      for (const [x0, y0, x1, y1] of water) if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 && Math.abs(lx - 16) < 4) c = [30, 60, 52];
      if (L.runes && cx >= 3 && cx <= 9 && cy >= 1 && cy <= 5 && (Math.abs(lx - 16) < .7 || Math.abs(ly - 16) < .7)) c = [70, 160, 180];
      return c;
    };
    const lights = 1 + (F.features || []).filter(f => f[1] === 'candle').length + (fid === 'f2' ? 2 : 0) + (fid === 'f4' ? 2 : 0);
    const world = new (W3())(this.game, {
      level: { rows, legend: { '#': wallSpec, t: { torch: true } }, ground, colors: { base: L.ground, dark: L.dark, light: L.light }, side: L.side, wallSide: L.side },
      look: 'card', res: 'pixels', torchLights: B.Hub.active ? 3 : 6, torchShadows: B.Hub.active ? 0 : 2, torchPower: 18, torchReach: 150, torchColor: '#ffb070', lights, glowLights: 4,
      ambient: [L.amb[0], L.amb[1], L.amb[2] * .55], fog: { color: L.fog, near: L.near, far: L.far }, sky: L.fog, camera: { mode: 'fixed' }, overlay: { fov: 60, light: 4 },
      onDraw: wd => this.onDraw(wd)
    });
    const V = { world, things: {}, doors: {}, secrets: {}, lamp: world.light({ color: '#ffd0a0', reach: 150, power: 5 }), candles: {}, glows: [], pits: {}, plates: {}, stairs: [], traps: {} };
    // doors: a gate spans its corridor; wooden doors swing; the Undergate and seals are their own things
    for (const [id, d] of Object.entries(F.doors || {})) {
      const [x, y] = d.at, ns = wallLike(x - 1, y) && wallLike(x + 1, y), yaw = ns ? 0 : PI / 2, ch = F.map[y][x];
      const kind = d.undergate ? 'undergate' : d.seal ? 'seal' : 'door';
      V.doors[id] = world.thing(kind, mid(x), mid(y), 0, { yaw, w: 32, h: 46, swing: ch === '+' || ch === 'L' || ch === 'K', color: ch === '=' ? '#26242c' : ch === '+' ? '#6a4a2e' : '#4a3a2a', frame: E.shade(L.wall, .1), locked: d.key ? 'iron' : null });
    }
    // secret and illusory walls: blocks with the level's own wall look
    const block = (x, y) => world.box({ x: mid(x), y: mid(y), z: 0, w: 32, d: 32, h: 48, side: L.side, color: wallSpec.color, line: wallSpec.line, top: wallSpec.top, fixed: true });
    for (const [id, at] of Object.entries(F.secrets || {})) V.secrets[id] = { box: block(...at), at, z: 0 };
    for (const [, at] of Object.entries(F.illusions || {})) block(...at);
    // wall features
    for (const f of F.features || []) {
      const [id, kind, x, y, face, o = {}] = f, d = FACE[face], out = (d + 2) % 4, px = mid(x) + DX[d] * C / 2, py = mid(y) + DY[d] * C / 2, yaw = Math.atan2(DY[out], DX[out]) - PI / 2;
      const tk = { lever: 'wallLever', button: 'wallButton', catch: 'catchStone', alcove: 'alcove', inscription: 'plaque', grate: 'grate', pipe: 'pipe', chain: 'chain', cage: 'cage', gearWall: 'gearWall', eyeRelief: 'eyeRelief', candle: 'candle', greatLock: 'greatLock', gearNiche: 'gearNiche', clockFace: 'clockFace', shrine: 'shrine' }[kind];
      if (kind === 'altarSlab') { V.things[id] = world.thing('altarSlab', mid(x), mid(y), 0, {}); continue; }
      if (!tk) continue;
      V.things[id] = world.thing(tk, px, py, 0, { yaw, shrine: !!o.shrine, rivet: !!o.rivet, rev: (x + y) % 2 === 1, color: L.wall, fid, fx: x, fy: y, fd: d });
      if (kind === 'candle') V.candles[id] = world.light({ color: '#9ac8ff', reach: 90, power: 6, flicker: .2 });
    }
    if (fid === 'f2') V.glows = [[10, 2], [11, 2]].map(([x, y]) => ({ L: world.light({ color: '#ff8a3a', reach: 110, power: 10, flicker: .3 }), x: mid(x), y: mid(y) - 12, z: 8 }));
    if (fid === 'f4') { V.bossLight = world.light({ color: '#ffb040', reach: 160, power: 7 }); V.zapLight = world.light({ color: '#6ae8ff', reach: 180, power: 0 }); }
    // pits, plates, stairs, traps, teleporters
    for (const [id, p] of Object.entries(F.pits || {})) V.pits[id] = world.thing('pitHole', mid(p.at[0]), mid(p.at[1]), 0, {});
    for (const [id, p] of Object.entries(F.plates || {})) V.plates[id] = world.thing('platePad', mid(p.at[0]), mid(p.at[1]), 0, { color: E.shade(L.ground, .15) });
    for (const [id, at] of Object.entries(F.traps || {})) V.traps[id] = world.thing('dartHoles', mid(at[0]), mid(at[1]), 0, { yaw: wallLike(at[0] - 1, at[1]) ? 0 : PI / 2 });
    for (const [id, tp] of Object.entries(F.teleports || {})) if (!tp.silent) world.thing('teleField', mid(tp.at[0]), mid(tp.at[1]), 0, {});
    for (const [k, st] of Object.entries(F.stairs || {})) {
      const [x, y] = k.split(',').map(Number), open = [0, 1, 2, 3].find(dd => !wallLike(x + DX[dd], y + DY[dd]));
      const back = (open + 2) % 4, yaw = Math.atan2(DY[open], DX[open]) - PI / 2;
      V.stairs.push(world.thing(B.ch(fid, x, y) === '<' ? 'stairUp' : 'stairDown', mid(x) + DX[back] * 10, mid(y) + DY[back] * 10, 0, { yaw, sealed: !!st.sealed, color: E.shade(L.wall, .08) }));
    }
    if (fid === 'f4') V.stairLight = world.thing('stairLight', mid(6), mid(1) - 15, 0, { yaw: PI });
    world.camera.set('fixed');
    world.prepare();
    this.worlds[fid] = V;
    return V;
  }
  enter(fid) {
    if (this.fid && this.worlds[this.fid]) for (const v of this.mons.values()) if (v.mob) this.worlds[this.fid].world.remove(v.mob);
    this.mons.clear(); this.fid = fid; this.fx = []; this.lightning = [];
    if (!this.worlds[fid]) this.build(fid);
  }
  /** a monster's view: a card mob (rig, blob or orb) or a pen body, gliding to its slot */
  monView(mon) {
    let v = this.mons.get(mon.uid); if (v) return v;
    const look = B.MON_LOOK[mon.type] || {}, o = B.slotOffset(mon), x = mid(mon.cx) + o[0], y = mid(mon.cy) + o[1], z = look.fly || 0, world = this.world;
    v = { x, y, z, facing: PI / 2, t: Math.random() * 5, atkT: 0, atkU: 0, move: look.move || 'slash', mob: null, look };
    if (look.rig) v.mob = world.mob({ x, y, z: 0, rig: new E.Humanoid(Object.assign({ speedRef: 45 }, look.rig)), r: 4, half: 6 });
    else if (look.blob) v.mob = world.mob({ x, y, z: 0, blob: new E.Blob(look.blob), r: 4, half: 0 });
    else if (look.orb) v.mob = world.mob({ x, y, z, orb: look.orb, r: 3, half: 0, fly: true });
    if (v.mob) v.mob.setSolid(false);
    this.mons.set(mon.uid, v); return v;
  }
  /** each update: mirror the sim (monsters, doors, lights) and consume its events */
  sync(dt, events) {
    const V = this.worlds[this.fid]; if (!V || !B.S || B.S.floor !== this.fid) return;
    const S = B.S, FS = B.FS(), F = B.F(), world = V.world, P = S.party, P3 = this.game.particles;
    for (const e of events) this.event(e, V);
    // doors and secret walls
    for (const [id, t] of Object.entries(V.doors)) { const d = FS.doors[id]; t.open = d.open; if (t.kind === 'undergate') { t.wards = S.wards; t.bolts = S.wards >= 3 ? 7 : [0, 2, 4, 7][S.wards]; } t.locked = d.locked && d.kind === 'locked' ? 'iron' : null; }
    for (const [id, s] of Object.entries(V.secrets)) { const st = FS.secrets[id]; if (st.open > 0 && s.box) { const z = -st.open * 49 + 24; try { s.box.body.setTranslation({ x: s.box.x, y: s.box.y, z }, true); s.box.z = z; if (s.box.mesh) s.box.mesh.position.y = z / W3().U; } catch (e) { /* (a removed body) */ } if (st.open >= 1) { world.remove(s.box); s.box = null; } } }
    // features' states
    const seeing = B.seeing() || B.CHEATS.secrets;
    for (const [id, t] of Object.entries(V.things)) {
      const st = FS.feat[id]; if (!st) continue;
      t.on = !!st.on; if (t.kind === 'wallLever') { const want = t.on ? 1 : -1; t.ang = t.ang === undefined ? want : t.ang + clamp(want - t.ang, -dt * 8, dt * 8); }
      if (t.kind === 'wallButton') t.pressT = st.t !== undefined && S.time - st.t < .3 ? 1 : 0;
      if (t.kind === 'catchStone') t.glint = seeing && !st.on;
      if (t.kind === 'clockFace') t.on = !!FS.clock;
      if (t.kind === 'greatLock') { const turning = P.lock > 0 && P.lockId === id; t.spin = (t.spin || 0) + (turning ? dt * 3 : 0); }
      if (V.candles[id]) { const L = V.candles[id]; L.on = !!st.on; L.x = t.x - Math.sin(t.yaw) * 0; L.y = t.y; L.z = 30; const out = (t.fd + 2) % 4; L.x = t.x + DX[out] * 4; L.y = t.y + DY[out] * 4; }
    }
    for (const [id, t] of Object.entries(V.pits)) { const p = FS.pits[id]; t.open = p.open; t.bridged = p.bridged; t.seams = seeing || B.alive().some(m => m.cls === 'T'); }
    for (const [id, t] of Object.entries(V.plates)) t.on = FS.plates[id].down;
    for (const [id, t] of Object.entries(V.traps)) t.on = FS.traps[id].armed && (seeing || B.alive().some(m => m.cls === 'T'));
    if (V.stairLight) V.stairLight.on = !!S.flags.bossDead;
    for (const g of V.glows) { g.L.x = g.x; g.L.y = g.y; g.L.z = g.z; g.L.on = true; }
    // monsters
    const alive = new Set();
    for (const mon of FS.mons) {
      alive.add(mon.uid); const v = this.monView(mon), MD = B.MONSTERS[mon.type], o = B.slotOffset(mon);
      const tx = mid(mon.cx) + o[0], ty = mid(mon.cy) + o[1], sp = 32 / Math.max(.25, MD.move) * 1.3;
      const dx = tx - v.x, dy = ty - v.y, dd = Math.hypot(dx, dy);
      if (dd > .5) { const k = Math.min(1, sp * dt / dd); v.x += dx * k; v.y += dy * k; v.walk = 1; } else v.walk = Math.max(0, (v.walk || 0) - dt * 4);
      const want = mon.hp > 0 && (mon.aware || mon.wind > 0) ? Math.atan2(mid(P.cy) - v.y, mid(P.cx) - v.x) : dd > .5 ? Math.atan2(dy, dx) : v.facing;
      v.facing = E.approachAng(v.facing, want, dt * 8); v.t += dt;
      v.atkT = Math.max(0, v.atkT - dt);
      if (v.look.fly) v.z = v.look.fly + Math.sin(v.t * 2 + mon.uid) * 2;
      if (v.mob) this.poseMob(v, mon, MD, dt);
    }
    for (const [uid, v] of this.mons) if (!alive.has(uid)) { if (v.mob) world.remove(v.mob); this.mons.delete(uid); }
    // effects' clocks
    this.fx = this.fx.filter(f => (f.t -= dt) > 0);
    this.lightning = this.lightning.filter(f => (f.t -= dt) > 0);
    if (this.swing) { this.swing.t += dt; if (this.swing.t > this.swing.dur) this.swing = null; }
    this.flashT = Math.max(0, this.flashT - dt); this.dissolveT = Math.max(0, this.dissolveT - dt);
    world.step(dt);
  }
  poseMob(v, mon, MD, dt) {
    const a = v.mob, dead = mon.hp <= 0;
    a.place(v.x, v.y, v.look.fly ? v.z : undefined); a.facing = v.facing;
    a.flash = mon.flash > 0 ? mon.flash : 0;
    if (dead) {
      if (a.rig) a.anim = { pose: 'die' }; else if (a.blob) a.anim = { squash: -.45, squint: true };
      if (mon.deadT > 1.2) a.sink = (mon.deadT - 1.2) * 14; if (v.look.orb) a.fade = Math.max(0, 1 - mon.deadT);
      return;
    }
    const asleep = mon.status.asleep > 0, held = mon.status.held > 0;
    if (a.rig) {
      let attack = null;
      if (mon.wind > 0 && mon.windMax) attack = E.move(v.move, clamp(1 - mon.wind / mon.windMax, 0, 1), 'wind');
      else if (v.atkT > 0) attack = E.move(v.move, clamp(1 - v.atkT / .45, 0, 1), v.atkT > .25 ? 'active' : 'recover');
      a.anim = { attack, hurt: mon.flash > 0, expr: mon.aware ? 'angry' : null, pose: asleep ? 'kneel' : held ? 'guard' : mon.windKind === 'bolt' || mon.windKind === 'hold' ? 'cast' : null, run: v.walk > .3 ? .6 : 0 };
    } else if (a.blob) {
      const sq = mon.wind > 0 ? -.3 * (1 - mon.wind / (mon.windMax || 1)) : v.atkT > 0 ? .35 : asleep ? -.2 : Math.sin(v.t * 6) * .06;
      a.anim = { squash: sq, look: [Math.cos(v.facing), Math.sin(v.facing)], squint: asleep, walk: v.walk };
    }
  }
  event(e, V) {
    const P = B.S.party, G = this.game, P3 = G.particles;
    const monPos = uid => { const v = this.mons.get(uid); return v ? [v.x, v.y, (v.z || 0)] : null; };
    switch (e.t) {
      case 'hit': { const p = monPos(e.uid); if (p) { P3.sparks(p[0], p[1], p[2] + 14, e.crit ? 14 : 6, Math.atan2(mid(P.cy) - p[1], mid(P.cx) - p[0]), { color: e.mat === 'ooze' ? '#9ad06a' : e.mat === 'metal' ? '#ffe08a' : e.mat === 'bone' ? '#f0e8d0' : '#ff6a5a' }); P3.text(p[0], p[1], p[2] + 30, String(e.dmg), e.crit ? '#ffd36a' : '#fff2c4', { scale: e.crit ? 2 : 1, bounce: true }); if (e.crit) G.freeze(.05); } break; }
      case 'monAttack': { const v = this.mons.get(e.uid); if (v) v.atkT = .45; break; }
      case 'death': { const p = monPos(e.uid); if (p) { const MD = B.MONSTERS[e.type]; if (MD.construct) P3.bits(p[0], p[1], p[2] + 10, 12, ['#b8923a', '#8a6a2a', '#e8c060']); else if (e.type === 'ooze') P3.bits(p[0], p[1], p[2] + 6, 14, ['#5a8a3a', '#9ad06a']); else P3.dust(p[0], p[1], p[2] + 4, 8); } break; }
      case 'hurt': if (e.dmg > 0) { G.shake(e.side === 'front' ? 2 : 3); this.hurtSide = { side: e.side, t: .6 }; } break;
      case 'swing': this.swing = { family: e.family, side: e.side, t: 0, dur: e.family === 'crossbow' || e.family === 'bow' ? .4 : .32 }; break;
      case 'cast': this.swing = { family: 'cast', side: e.side, color: e.color, t: 0, dur: .5 }; break;
      case 'dissolve': this.dissolveT = .22; break;
      case 'lightning': this.lightning.push({ cells: e.cells, t: .3, party: e.party }); this.flashT = .12; if (V.zapLight) V.zapLight.power = 20; break;
      case 'rain': for (const [x, y] of e.cells) P3.bits(mid(x), mid(y), 30, 10, ['#6a707a', '#8a909a']); G.shake(5); break;
      case 'explode': P3.explosion(mid(e.x), mid(e.y), 12, .8, { shake: 2 }); break;
      case 'frost': P3.glints(mid(e.at[0]), mid(e.at[1]), 14, 16, '#bff4ff'); break;
      case 'flare': P3.glints(mid(e.at[0]), mid(e.at[1]), 16, 20, '#ffffff'); break;
      case 'unlatch': P3.glints(mid(e.at[0]), mid(e.at[1]), 20, 18, '#8ae0ff'); break;
      case 'projEnd': if (e.spell === 'sparkDart') P3.sparks(mid(e.x), mid(e.y), 16, 8, null, { color: '#d8b0ff' }); else if (e.wall) P3.sparks(mid(e.x) + DX[P.dir] * 12, mid(e.y) + DY[P.dir] * 12, 18, 4, null, { color: '#ffd8a0' }); break;
      case 'shake': G.shake(e.n || 4); break;
      case 'eyeDeath': this.flashT = .6; G.shake(10); break;
      case 'teleport': this.flashT = .2; break;
      default: break;
    }
  }
  /** the camera from the party's tween: steps glide (with a bob), turns ease, bumps lurch */
  camera() {
    const V = this.worlds[this.fid]; if (!V) return;
    const P = B.S.party, tw = P.tween, ease = u => u * u * (3 - 2 * u);
    let x = mid(P.cx), y = mid(P.cy), yaw = YAW(P.dir), bob = 0, lurch = 0;
    if (tw) {
      const u = clamp(tw.t / Math.max(1e-6, tw.dur), 0, 1), s = ease(u);
      if (tw.kind === 'step') { x = lerp(mid(tw.fx), x, s); y = lerp(mid(tw.fy), y, s); if (B.settingBob !== false && !(this.game.settings.reduceMotion)) bob = -Math.sin(u * PI) * .8; }
      if (tw.kind === 'turn' || tw.kind === 'step') yaw = YAW(tw.fd) + E.angDiff(YAW(tw.fd), YAW(P.dir)) * s;
      if (tw.kind === 'bump') { lurch = Math.sin(u * PI) * 4; const by = YAW(tw.bd); x += Math.cos(by) * lurch; y += Math.sin(by) * lurch; }
    }
    const lift = P.fx.float > 0 ? 3 : 0, look = B.S.bossIntro && B.S.floor === 'f4' && P.cy <= 5 ? .12 : -.04;
    V.world.camera.fixed = { x: x - Math.cos(yaw) * 4, y: y - Math.sin(yaw) * 4, z: EYE + bob + lift, yaw, pitch: look, fov: 74 };
    V.lamp.x = x; V.lamp.y = y; V.lamp.z = EYE + 4; V.lamp.on = true;
    this.pose = { x, y, yaw };
  }
  draw(r) { const V = this.worlds[this.fid]; if (!V || !B.S) return; this.camera(); V.world.draw(r); }
  /** the world's own drawing each frame: ceiling, floor items, pen creatures, projectiles, lightning, telegraphs, overlay */
  onDraw(world) {
    const V = this.worlds[this.fid]; if (!V || V.world !== world || !B.S || B.S.floor !== this.fid) return;
    const S = B.S, P = S.party, FS = B.FS(), pen = world.pen, t = S.time;
    pen.at().box(world.width / 2, world.depth / 2, 50, world.width, world.depth, 4, E.shade(B.F().look.wall, -.35));
    // floor items near the party: little pen models at the quadrant spots
    for (const [k, list] of Object.entries(FS.items)) {
      if (!list.length) continue; const [cx, cy] = k.split(',').map(Number); if (B.manh(cx, cy, P.cx, P.cy) > 7) continue;
      list.forEach((it, i) => { const q = [[-8, -8], [8, -8], [-8, 8], [8, 8]][i % 4], pile = i >= 4 ? (i - 3) * 1.2 : 0; B.drawItemModel(pen.at(mid(cx) + q[0], mid(cy) + q[1], pile, (it.uid || i) * 1.3, 1), it); });
    }
    // alcove contents
    for (const [id, th] of Object.entries(V.things)) { const st = FS.feat[id]; if (!st || !st.items || !st.items.length) continue; const out = (th.fd + 2) % 4; st.items.forEach((it, i) => B.drawItemModel(pen.at(th.x + DX[out] * 3 + (i - (st.items.length - 1) / 2) * 5 * Math.cos(th.yaw), th.y + DY[out] * 3 + (i - (st.items.length - 1) / 2) * 5 * Math.sin(th.yaw), th.kind === 'clockFace' ? 16 : 11, th.yaw, .8), it)); }
    // pen-drawn monsters
    for (const mon of FS.mons) { const v = this.mons.get(mon.uid); if (!v || v.mob && mon.type !== 'gazer') continue; B.drawCreature(pen, mon, v, t); }
    // projectiles
    for (const p of S.proj) {
      const u = clamp(p.prog, 0, 1), x = mid(p.cx) + DX[p.d] * C * u, y = mid(p.cy) + DY[p.d] * C * u, z = p.team === 'mon' ? 18 : 16;
      if (p.prog < 0) continue;
      if (p.kind === 'item' || p.kind === 'ammo') B.drawItemModel(pen.at(x, y, z, YAW(p.d) + t * (p.kind === 'item' ? 12 : 0), 1), p.item);
      else world.glow(x, y, z, p.kind === 'orb' ? 4 : p.kind === 'lockBolt' ? 3.2 : 2.2, p.kind === 'orb' ? '#ff8a3a' : p.kind === 'lockBolt' ? '#6ae8ff' : p.kind === 'spark' && p.team === 'mon' ? '#ffd36a' : '#d8b0ff', { light: true });
    }
    // lightning: jagged bars along the cells
    for (const L of this.lightning) {
      const cells = L.cells; if (!cells.length) continue;
      let px = L.party ? mid(P.cx) : mid(cells[0][0]), py = L.party ? mid(P.cy) : mid(cells[0][1]), pz = 18;
      const bm = B.bossMon(); if (!L.party && bm) { const v = this.mons.get(bm.uid); if (v) { px = v.x; py = v.y; pz = v.z + 10; } }
      for (const [cx, cy] of cells) for (let k = 0; k < 3; k++) { const nx = mid(cx) + (Math.random() - .5) * 10, ny = mid(cy) + (Math.random() - .5) * 10, nz = 14 + Math.random() * 12; pen.at().bar(px, py, pz, nx, ny, nz, 1.2, .8, '#bff8ff'); px = nx; py = ny; pz = nz; }
    }
    // the boss's telegraphs
    const bm = B.bossMon();
    if (bm && bm.boss.tele && this.fid === 'f4') {
      const T = bm.boss.tele, k = 1 - T.t / T.max, flick = Math.sin(t * 40) > 0;
      if (T.kind === 'rain') for (const [x, y] of T.cells) { world.arc(mid(x), mid(y), .3, 4, 14 * (.4 + k * .6), 0, PI * 2, '#ffb040', .35 + k * .4); world.arc(mid(x), mid(y), .35, 13, 14, 0, PI * 2, '#ff4a3a', .7); }
      if (T.kind === 'chain' && flick) for (const [x, y] of T.cells) world.arc(mid(x), mid(y), .3, 0, 15, 0, PI * 2, '#6ae8ff', .25 + k * .35);
    }
    // the first-person overlay: the striking member's weapon across its side of the view
    if (world.overlay && this.swing) B.drawSwing(world.overlay.pen, this.swing);
    if (V.zapLight) { V.zapLight.power = Math.max(0, V.zapLight.power - .6); const bmv = bm && this.mons.get(bm.uid); if (bmv) { V.zapLight.x = bmv.x; V.zapLight.y = bmv.y; V.zapLight.z = 30; } }
    if (V.bossLight) { const bmv = bm && bm.hp > 0 && this.mons.get(bm.uid); V.bossLight.on = !!bmv; if (bmv) { V.bossLight.x = bmv.x; V.bossLight.y = bmv.y; V.bossLight.z = bmv.z + 10; } }
  }
  /** what the mouse is over in the view: the front wall's feature, a door, items in front or here, a monster in front */
  pick(sx, sy) {
    const V = this.worlds[this.fid]; if (!V) return null;
    const S = B.S, P = S.party, [fx, fy] = B.front(), world = V.world, out = [];
    const add = (kind, x, y, z, label, rad = 18) => { const p = world.project(x, y, z); if (p) out.push({ kind, x: p[0], y: p[1], d: Math.hypot(p[0] - sx, p[1] - sy), label, rad }); };
    const f = B.featAt(P.cx, P.cy, P.dir);
    if (f && V.things[f.id]) { const th = V.things[f.id]; add('feature', th.x, th.y, f.kind === 'greatLock' ? 24 : 20, B.featLabel(f), 26); }
    else if (f && f.kind === 'undergate') add('feature', mid(fx), mid(fy), 24, 'The Undergate', 34);
    const door = B.doorIn(S.floor, fx, fy); if (door && door[1].open < .85) add('door', mid(fx), mid(fy), 22, door[1].kind === 'gate' ? 'Gate' : door[1].kind === 'seal' ? 'Sealed door' : door[1].locked ? 'Locked door' : 'Door', 34);
    const foes = B.monsAt(fx, fy); if (foes.length) { const v = this.mons.get(foes[0].uid); if (v) add('monster', v.x, v.y, v.z + 12, B.MONSTERS[foes[0].type].name, 30); }
    for (const [x, y] of [[fx, fy], [P.cx, P.cy]]) { const list = B.itemsAt(x, y); if (list.length && (x !== fx || y !== fy || B.open(S.floor, fx, fy))) add('item', mid(x), mid(y), 2, B.itemName(list[list.length - 1]), 22); }
    out.sort((a, b) => a.d - b.d);
    return out.find(o => o.d < o.rad) || null;
  }
  dispose() { for (const V of Object.values(this.worlds)) V.world.dispose(); this.worlds = {}; }
};
B.featLabel = f => ({ lever: 'Lever', button: 'Button', catch: 'Loose stone', alcove: 'Alcove', inscription: 'Inscription', candle: 'Candle', greatLock: 'Great Lock', gearNiche: 'Gear niche', clockFace: 'The Great Clock', shrine: 'Shrine', altarSlab: 'Altar' }[f.kind] || 'Wall');
/** an item's little 3D model, lying flat (pen already placed and turned) */
B.drawItemModel = (p, it) => {
  const d = B.def(it) || {}, c = d.color || '#a8a8b0', ic = d.icon, sh = E.shade;
  switch (ic) {
    case 'sword': case 'dagger': { const L = ic === 'sword' ? 10 : 6; p.box(0, 0, .6, L, 1.4, .5, c).box(-L / 2 - .5, 0, .6, 1, 4, .8, '#8a6a3a').box(-L / 2 - 2.5, 0, .6, 3, 1, .8, '#5a3a20'); break; }
    case 'axe': case 'pick': case 'hammer': case 'mace': p.box(-1, 0, .6, 10, 1, .8, '#6a4a2a').box(4, 0, .9, 2.4, ic === 'axe' ? 5 : 3.5, 1.4, c); break;
    case 'staff': case 'spear': case 'glaive': p.box(0, 0, .6, 16, .9, .9, '#8a6a4a').box(8.5, 0, .7, ic === 'staff' ? 1 : 3, ic === 'glaive' ? 2.4 : 1.2, .6, c); break;
    case 'bow': case 'sling': case 'crossbow': p.box(0, 0, .8, 9, 1.6, 1, '#6a4a2a').box(3, 0, .8, 1, 9, 1, c); break;
    case 'arrows': case 'darts': for (let k = 0; k < 3; k++) p.box(0, -1.5 + k * 1.5, .4, 7, .4, .4, c); break;
    case 'stones': case 'rock': p.ball(0, 0, 2, 3.5, 3, 2.4, c).ball(1.6, 1, 2.8, 2, 2, 1.6, sh(c, .12)); break;
    case 'ingot': p.box(0, 0, 1.2, 8, 3.5, 2.4, c); break;
    case 'bone': p.box(0, 0, .8, 9, 1.4, 1.4, c).ball(-4.5, 0, .9, 1.4, 1.4, 1.2, c).ball(4.5, 0, .9, 1.4, 1.4, 1.2, c); break;
    case 'potion': p.ball(0, 0, 2.2, 2.2, 2.2, 2.2, c).tube(0, 0, 4, 0, 0, 5.6, .8, '#cfe6f0'); break;
    case 'scroll': case 'note': p.tube(-3, 0, 1, 3, 0, 1, 1, ic === 'note' ? '#d8c8a0' : '#e8dcc0').box(0, 0, 1, 1, 2.4, .4, c); break;
    case 'book': p.box(0, 0, 1, 6, 4.5, 1.6, c).box(0, 0, 1.9, 5.4, 4, .2, '#e8dcc0'); break;
    case 'key': p.ball(-2.5, 0, .6, 1.6, 1.6, .5, c).box(1, 0, .6, 5, .8, .5, c).box(3, .9, .6, .8, 1.2, .5, c).box(1.6, .9, .6, .8, 1, .5, c); break;
    case 'ward': p.ball(0, 0, .6, 3.2, 3.2, .5, c); for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; p.box(Math.cos(a) * 3.4, Math.sin(a) * 3.4, .6, 1, 1, .5, c); } break;
    case 'gear': p.ball(0, 0, .6, 3, 3, .6, c); for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; p.box(Math.cos(a) * 3.4, Math.sin(a) * 3.4, .6, 1.2, 1.2, .8, c); } p.ball(0, 0, .9, 1, 1, .6, '#3a2a1a'); break;
    case 'ration': p.box(0, 0, 1.2, 5, 3.5, 2.4, c).box(0, 0, 2.5, 5.2, .6, .3, '#8a6a3a'); break;
    case 'shield': p.ball(0, 0, .8, 5, 5, .8, c).ball(0, 0, 1.3, 1.4, 1.4, .6, '#c8a050'); break;
    case 'armor': case 'mail': case 'robe': p.box(0, 0, .8, 8, 9, 1.4, c).box(0, -5, .8, 10, 2, 1.2, sh(c, -.1)); break;
    case 'cap': case 'helm': case 'crown': case 'goggles': p.ball(0, 0, 2, 3.5, 3.5, 2.6, c); break;
    case 'ring': p.ball(0, 0, .5, 1.6, 1.6, .5, c); break;
    case 'amulet': p.ball(0, 0, .5, 1.8, 1.8, .6, c).tube(-3, -3, .4, 3, -3, .4, .3, '#c8a050'); break;
    case 'boots': p.box(-1.8, 0, 1.6, 2.4, 5, 3.2, c).box(1.8, 0, 1.6, 2.4, 5, 3.2, c); break;
    case 'bracers': p.tube(-2, -2, 1, -2, 2, 1, 1.4, c).tube(2, -2, 1, 2, 2, 1, 1.4, c); break;
    case 'wand': p.box(0, 0, .5, 7, .7, .7, '#e8e8f0').glow(3.8, 0, .6, .8, c); break;
    case 'coin': p.ball(0, 0, 1.2, 2.6, 2.6, .5, c).glow(0, 0, 2.5, .6, '#ffffff'); break;
    case 'picks': p.box(0, 0, .5, 6, 3, .6, '#5a4a3a'); break;
    case 'symbol': case 'lantern': p.ball(0, 0, 1.4, 2, 2, 2, c).box(0, 0, 3.5, .6, .6, 2, c); break;
    default: p.box(0, 0, 1, 4, 4, 2, c);
  }
};
