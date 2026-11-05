/* MASH TV — 02-art: the sets (floors, walls, lights per episode), the arena's TileMap, the doors, the contestants' looks,
 * the enemy rigs and the sprites for bullets and pickups. Every picture is drawn in code with E.px and the engine's rigs. */

/* ---------- the sets: one per episode, plus the Green Room (§9.2) ---------- */
MT.SETS = {
  studio: { id: 'studio', name: 'STUDIO 9', amb: .55, floor: [[24, 12, 40], [40, 20, 68]], line: [255, 204, 51], inlay: [255, 46, 136],
    wallTop: '#4a2a6a', wallSide: '#2a1446', face: 'plaster', roof: 'slab', glow: '#ff2e88', light: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ff2e88'], spot: true },
  warehouse: { id: 'warehouse', name: 'MEGAMART WAREHOUSE', amb: .6, floor: [[86, 88, 96], [98, 100, 110]], line: [230, 190, 40], inlay: [60, 60, 70],
    wallTop: '#6e7480', wallSide: '#4a4f5a', face: 'plank', roof: 'plain', glow: '#ffb020', light: ['#ffb020', '#ffb020', '#fff0c0'], spot: false },
  rooftop: { id: 'rooftop', name: 'THE ROOFTOP GALA', amb: .42, floor: [[30, 38, 52], [38, 46, 62]], line: [212, 175, 55], inlay: [150, 30, 40],
    wallTop: '#3a4a60', wallSide: '#202a3a', face: 'stone', roof: 'plain', glow: '#ffcc33', light: ['#ffcc33', '#2ee6ff', '#ff8a4a'], spot: true },
  greenroom: { id: 'greenroom', name: 'THE GREEN ROOM', amb: .62, floor: [[20, 84, 48], [24, 96, 56]], line: [255, 204, 51], inlay: [200, 170, 60],
    wallTop: '#4a3420', wallSide: '#2e1e10', face: 'plank', roof: 'plain', glow: '#ffcc66', light: ['#ffcc66', '#ffcc66'], spot: false }
};
MT.setFloor = (set, x, y) => {
  const s = MT.SETS[set] || MT.SETS.studio, c = s.floor;
  if (set === 'rooftop') { const red = Math.abs(y - 120) < 9; if (red) return [150, 30, 40]; if (Math.hypot(x - 184, y - 120) < 26 && Math.hypot(x - 184, y - 120) > 22) return [212, 175, 55]; }
  if (set === 'warehouse') { if (Math.abs(y - 56) < 1.4 || Math.abs(y - 184) < 1.4 || Math.abs(x - 92) < 1.4 || Math.abs(x - 276) < 1.4) return s.line; }
  if (set === 'studio') { const d = ((Math.floor(x / 16) + Math.floor(y / 16)) & 1); const base = c[d]; if (Math.abs(((x - 184) + (y - 120)) % 96) < 1.1 && Math.abs(x - 184) < 150 && Math.abs(y - 120) < 90) return [96, 26, 70]; const L = MT.logoAt(x, y); if (L) return L; return base; }
  if (set === 'greenroom') { const d = ((Math.floor(x / 24) + Math.floor(y / 24)) & 1); return d ? c[1] : c[0]; }
  return c[((Math.floor(x / 16) + Math.floor(y / 16)) & 1)];
};
MT.setWall = (set) => {
  const s = MT.SETS[set] || MT.SETS.studio;
  return { 1: { h: 26, top: s.wallTop, side: s.wallSide, face: s.face, roof: s.roof, cut: true },
    2: { h: 26, top: '#6a6a78', side: '#3a3a46', face: 'plank', roof: 'plain' },
    3: { h: 26, top: s.wallTop, side: s.wallSide, face: s.face, roof: s.roof, cut: true } };
};

/* ---------- the arena: a TileMap of 23 x 15 cells; '#' wall, '=' door gap (closed: a wall type), '+' the south wall (cut) ---------- */
MT.ARENA_ROWS = (() => {
  const rows = [];
  for (let y = 0; y < 15; y++) {
    let r = '';
    for (let x = 0; x < 23; x++) {
      if (y === 14 && x >= 1 && x <= 21) { r += (x >= 10 && x <= 12) ? '=' : '+'; continue; }
      if (y === 14) { r += '#'; continue; }
      if (y === 0 && x >= 10 && x <= 12) { r += '='; continue; }
      if (x === 0 && y >= 6 && y <= 8) { r += '='; continue; }
      if (x === 22 && y >= 6 && y <= 8) { r += '='; continue; }
      if (y === 0 || x === 0 || x === 22) { r += '#'; continue; }
      r += '.';
    }
    rows.push(r);
  }
  return rows;
})();
// the MASH TV logo on the studio floor: the engine's title font rasterized once into an offscreen canvas (browsers only),
// then sampled by the floor texture, so the lettering is the floor's own (§9.4 item 2)
MT.logo = null;
MT.buildLogo = () => {
  if (MT.logo !== null || typeof document === 'undefined' || !document.createElement) { MT.logo = MT.logo || false; return; }
  try {
    const c = document.createElement('canvas'); c.width = 160; c.height = 56; const g = c.getContext('2d');
    E.font.title(g, 'MASH TV', 80, 6, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
    MT.logo = { data: g.getImageData(0, 0, 160, 56).data, w: 160, h: 56 };
  } catch (e) { MT.logo = false; }
};
MT.logoAt = (x, y) => {
  if (!MT.logo) return null;
  const px_ = Math.floor(x - 104), py = Math.floor(y - 92);
  if (px_ < 0 || py < 0 || px_ >= MT.logo.w || py >= MT.logo.h) return null;
  const i = (py * MT.logo.w + px_) * 4;
  return MT.logo.data[i + 3] > 128 ? [MT.logo.data[i], MT.logo.data[i + 1], MT.logo.data[i + 2]] : null;
};
MT.buildMap = (set) => {
  MT.buildLogo();
  const s = MT.SETS[set] || MT.SETS.studio;
  const map = new E.TileMap({ rows: MT.ARENA_ROWS, legend: { '#': 1, '=': 2, '+': 3 }, types: MT.setWall(set),
    floorTex: (x, y) => MT.setFloor(set, x, y), outside: s.wallSide });
  return map;
};
// which door cells a door's shutter occupies, and the door's cells in the room map
MT.DOOR_CELLS = { N: [[10, 0], [11, 0], [12, 0]], S: [[10, 14], [11, 14], [12, 14]], W: [[0, 6], [0, 7], [0, 8]], E: [[22, 6], [22, 7], [22, 8]] };

/* ---------- the door painter: a shutter that rolls up, a beacon and the exit sign (§5.5) ---------- */
MT.paintDoor = (r, d, W) => {
  const D = MT.DOORS[d], dr = d === 'N' || d === 'S';
  const st = d === 'N' || d === 'S' ? W.doorState[d] : W.doorState[d];
  const open = st.state === 'open' || st.state === 'opening' || st.state === 'closing' ? st.up : 0;   // 0 closed .. 1 up
  const exit = st.state === 'exit';
  const pulse = .5 + .5 * Math.sin(W.time * 6);
  const col = exit ? '#2ee66a' : st.state === 'open' || st.state === 'opening' ? '#ff3344' : '#7a2a3a';
  r.queue(D.x, D.y, 12, g => {   // the frame and the shutter (drawn over the wall, in the gap)
    const cx = D.x, cy = D.y;
    const a = r.w(cx - (dr ? 20 : 0), cy - (dr ? 0 : 20), 0), b = r.w(cx + (dr ? 20 : 0), cy + (dr ? 0 : 20), 0);
    const h = r.w(cx, cy, 26), hb = r.w(cx, cy, 0);
    const k = Math.max(0, 1 - open);
    if (k > .01) {
      const sx = (b[0] - a[0]) * k, sy = (b[1] - a[1]) * k;
      px.poly(g, [[a[0], a[1]], [a[0] + sx, a[1] + sy], [a[0] + sx, a[1] + sy - (hb[1] - h[1])], [a[0], a[1] - (hb[1] - h[1])]], '#5c5c6e');
    }
    px.line(g, a[0], a[1], a[0] - 3, a[1] - 14, '#e8c440', 2);
    px.line(g, b[0], b[1], b[0] + 3, b[1] - 14, '#e8c440', 2);
    px.disc(g, h[0], h[1] - 14, 3, col);
    if (exit) px.disc(g, h[0], h[1] - 14, 5 + pulse * 2, 'rgba(46,230,106,0.35)');
  });
  if (exit) { r.sign = r.sign || []; }
};

/* ---------- the contestants' looks (§9.3): the slot fixes the colour; four builds ---------- */
MT.LOOKS = [
  { name: 'ROCKET', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'short', hat: null, colors: { cloth: '#e8443a', coat: '#e8443a', pants: '#e8443a', skin: '#f0c8a0', hair: '#3a2a20', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } },
  { name: 'VOLT', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'ponytail', hat: { style: 'band', color: '#2a2a33' }, colors: { cloth: '#3b82f6', coat: '#3b82f6', pants: '#2a52a8', skin: '#e8b890', hair: '#f2d86a', boot: '#15121c', glove: '#b8c0d0', trim: '#ffffff' } },
  { name: 'MOXIE', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'spiky', hat: 'cap', colors: { cloth: '#22c55e', coat: '#22c55e', pants: '#1a7a40', skin: '#d8a880', hair: '#15121c', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } },
  { name: 'GOLDIE', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'long', hat: { style: 'band', color: '#ff8ad8' }, colors: { cloth: '#f5b700', coat: '#f5b700', pants: '#c08a00', skin: '#f2d0b0', hair: '#8a4a20', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } }
];
MT.LANCE_LOOK = { name: 'LANCE LUSTRE', build: 'heroic', size: 1.3, outfit: 'coat', hair: 'spiky', hat: null, colors: { cloth: '#7a2ab8', coat: '#7a2ab8', pants: '#15121c', skin: '#e8b890', hair: '#d8dce8', boot: '#15121c', glove: '#ffffff', trim: '#ffcc33' } };
MT.PENNY_LOOK = { name: 'PENNY PRIZE', build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: null, colors: { cloth: '#1fa8a0', coat: '#1fa8a0', pants: '#1fa8a0', skin: '#f5d0b8', hair: '#f06ab8', boot: '#15121c', glove: '#ffffff', trim: '#ffffff' } };
// an enemy's rig: the options its Humanoid or Blob is built with
MT.RIGS = {
  goon: { kind: 'humanoid', o: { size: 1.0, build: 'bulky', weapon: 'staff', outfit: 'coat', hair: 'short', hat: 'helmet', colors: { cloth: '#2a3a52', coat: '#2a3a52', pants: '#1a2230', skin: '#c89070', hair: '#222', boot: '#111', glove: '#111', plate: '#8a94a8', metal: '#c0c8d8' } } },
  popper: { kind: 'humanoid', o: { size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'spiky', hat: 'cap', colors: { cloth: '#ffcc33', coat: '#ffcc33', pants: '#cc3366', skin: '#f2c8a0', hair: '#c02080', boot: '#222', glove: '#222' } } },
  mime: { kind: 'humanoid', trapped: true, o: { size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { cloth: '#fafafa', coat: '#222', pants: '#111', skin: '#fbfbff', hair: '#111', boot: '#111', glove: '#fff' } } },
  heckler: { kind: 'humanoid', o: { size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'long', hat: 'band', colors: { cloth: '#ff3344', coat: '#ff3344', pants: '#fff', skin: '#e0b090', hair: '#e04a20', boot: '#222', glove: '#ffcc33' } } },
  hecklerKing: { kind: 'humanoid', o: { size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'long', hat: 'crown', colors: { cloth: '#ff3344', coat: '#ff3344', pants: '#fff', skin: '#e0b090', hair: '#e04a20', boot: '#222', glove: '#ffcc33', plate: '#ffcc33' } } },
  brute: { kind: 'humanoid', o: { size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', hat: null, colors: { cloth: '#8a5a32', coat: '#8a5a32', pants: '#5a3a22', skin: '#9a6a3a', hair: '#5a3a22', boot: '#222', glove: '#222' } } },
  clapbot: { kind: 'blob', o: { R: 6, colors: { dk: '#3a4150', base: '#c8d0e0', lt: '#f0f4ff', spec: '#ffffff', eye: '#ffcc33', pupil: '#222' }, ears: 'cat' } }
};
MT.CROWD_LOOK = { size: .8, build: 'chibi', weapon: null, hair: 'short', hat: null, outfit: 'shirt', colors: { cloth: '#7a6aa8', pants: '#333', skin: '#e8c0a0', hair: '#4a3a2a', boot: '#222', glove: '#222' } };

// rigs are built once per kind and posed each step; their draw code reads only what the render state gives them
MT.makeRig = (spec) => {
  if (!spec) return null;
  if (spec.kind === 'blob') return new E.Blob(spec.o);
  const rig = new E.Humanoid(Object.assign({}, spec.o, { colors: Object.assign({}, spec.o.colors) }));
  if (spec.trapped) {   // the mime 'trapped in a box': both hands flat on the glass at chest height, sliding along it
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const J = this.J, slide = Math.sin(this.t * 1.6) * 2.2;
      J.elbowL = [2.2, -8 + slide, 10]; J.elbowR = [2.2, 8 + slide, 10];
      J.handL = [4.2, -6 + slide, 15]; J.handR = [4.2, 6 + slide, 15];
    };
  }
  return rig;
};
MT.lookRig = (slot) => new E.Humanoid(Object.assign({}, MT.LOOKS[slot % 4], { colors: Object.assign({}, MT.LOOKS[slot % 4].colors) }));

/* ---------- sprites: bullets, pickups and icons, designed at 8-16 px ---------- */
MT.SPR = {};
MT.initSprites = () => {
  const S = MT.SPR;
  S.bolt = E.sprite(['.yy.', 'yWWy', 'yWWy', '.yy.'], { y: '#ffcc33', W: '#fffbe0' }, 1);
  S.bolt2 = E.sprite(['.cc.', 'cWWc', '.cc.'], { c: '#ff2e88', W: '#ffd0ec' }, 1);
  S.rocket = E.sprite(['.rr..', 'rrrr.', 'WWrrr', 'rrrr.', '.rr..'], { r: '#e8443a', W: '#fff0c0' }, 1);
  S.popcorn = E.sprite(['.yy.', 'yWyy', 'yyWy', '.yy.'], { y: '#f8e070', W: '#fffdf0' }, 1);
  S.kernel = E.sprite(['yy', 'Wy'], { y: '#ffe070', W: '#ffffff' }, 1);
  S.record = E.sprite(['.gg.', 'gWWg', 'gWWg', '.gg.'], { g: '#ffcc33', W: '#222' }, 1);
  S.orb = E.sprite(['.oo.', 'oWWo', '.oo.'], { o: '#ff9a3c', W: '#fff2a0' }, 1);
  S.shard = E.sprite(['oo', 'Wo'], { o: '#ffb050', W: '#fff' }, 1);
  S.coin = E.sprite(['.yy.', 'yWyy', 'yyWy', '.yy.'], { y: '#ffd040', W: '#fff8c0' }, 1);
  S.card = E.sprite(['wwww', 'wWWw', 'wwww'], { w: '#f4f4ff', W: '#ff8a8a' }, 1);
  S.bill = E.sprite(['gggggg', 'gGGGGg', 'gggggg'], { g: '#2f8a3a', G: '#8ae08a' }, 2);
  S.stack = E.sprite(['gggggggg', 'GGGGGGGG', 'gggggggg', 'GGGGGGGG'], { g: '#2f8a3a', G: '#7ad07a' }, 2);
  S.gold = E.sprite(['yyyyyy', 'YYYYYY', 'yyyyyy', 'YYYYYY'], { y: '#c8901a', Y: '#ffd850' }, 2);
  S.case = E.sprite(['cccccc', 'cWcccc', 'cccccc', 'cccccc'], { c: '#d8dce8', W: '#2a2a33' }, 2);
  S.prize = E.sprite(['rrrrrr', 'rWrrWr', 'rrrrrr', 'rrWWrr', 'rrrrrr'], { r: '#ff3344', W: '#ffffff' }, 2);
  S.key = E.sprite(['.kk.', 'kWWk', 'kkkk', '.k.k', '.kk.'], { k: '#ffcc33', W: '#fff8c0' }, 2);
  S.capsule = E.sprite(['tttttt', 'tXXXXt', 'tXXXXt', 'tttttt'], { t: '#2a2a3a', X: '#2ee6ff' }, 2);
  S.flash = E.sprite(['..f..', '.fWf.', 'fWWWf', '.fWf.', '..f..'], { f: '#ffffff', W: '#ffffe0' }, 1);
  S.star = E.sprite(['..s..', '.sss.', 'sssss', '.sss.', '..s..'], { s: '#ffdf40' }, 1);
  S.statuette = E.sprite(['..g..', '.ggg.', '.gWg.', '.ggg.', '..g..', '.ggg.', '.ggg.'], { g: '#ffcc33', W: '#fff' }, 3);
  S.crate = E.sprite(['ccccccc', 'cwwwwwc', 'cwccccc', 'cccccc', 'ccccccc'], { c: '#8a5a32', w: '#c08a50' }, 2);
  S.tomato = E.sprite(['.rr.', 'rWrr', '.rr.'], { r: '#ff3a2a', W: '#ffb0a0' }, 1);
  S.splat = E.sprite(['..rr..', '.rrrr.', 'rrrrrr', '.rrrr.', '..rr..'], { r: '#c02020' }, 1);
  return S;
};
// the twelve prize icons are drawn as small coloured boxes with their first letter (§7.6), as a banner's badge
MT.prizeIcon = (name) => {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['#ff8ad8', '#5fe0a0', '#ffcc33', '#2ee6ff', '#ff6a6a', '#b08aff'][h % 6];
};
