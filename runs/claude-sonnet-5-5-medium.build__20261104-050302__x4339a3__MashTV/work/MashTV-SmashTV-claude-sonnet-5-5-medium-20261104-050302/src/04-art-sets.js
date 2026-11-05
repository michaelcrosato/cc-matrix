// MASH TV: studio sets (floors, walls, doors, outside dressing, lights) and string sprites.
const H = E.hex, hash = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// ---- logo mask (rasterised once from the engine's title font; browsers only) ----
let LOGO = null;
function logoMask() {
  if (LOGO !== null) return LOGO; LOGO = false;
  try {
    if (!MT.hasDOM) return LOGO; const c = document.createElement('canvas'); c.width = 160; c.height = 44; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    E.font.title(g, 'MASH TV', 80, 8, { scale: 4, align: 'center', colors: ['#ffffff', '#ffffff'], outline: false, depth: 0 });
    const d = g.getImageData(0, 0, 160, 44).data; LOGO = { w: 160, h: 44, a: d };
  } catch (e) { LOGO = false; }
  return LOGO;
}
function logoAt(x, y) { const L = logoMask(); if (!L) return 0; const u = Math.floor(x - (CX - 80)), v = Math.floor(y - (CY - 22)); if (u < 0 || v < 0 || u >= L.w || v >= L.h) return 0; return L.a[(v * L.w + u) * 4 + 3] > 120 ? 1 : 0; }
const CX0 = MT.CX, CY0 = MT.CY;
// ---- floors ----
const F_STUDIO = (x, y) => {
  const s = 16, cx = Math.floor(x / s), cy = Math.floor(y / s), lx = x - cx * s, ly = y - cy * s;
  const edge = x < 16 || x > 352 || y < 16 || y > 224;
  let c = H(((cx + cy) & 1) ? '#2a1446' : '#1d0e36');
  const gl = (lx + ly) % 16; if (gl < 3) c = mixc(c, H('#4a2a7a'), .5);
  if (lx < 1 || ly < 1) c = mixc(c, H('#ff2e88'), .35);
  if ((cx === 1 || cx === 21 || cy === 1 || cy === 13) && !edge) { if (lx > 6 && lx < 10 || ly > 6 && ly < 10) c = mixc(c, H('#ffcc33'), .3); }
  if (logoAt(x, y)) c = mixc(H('#ff2e88'), H('#ffcc33'), Math.min(1, Math.max(0, (y - 98) / 44)));
  else if (x > 104 && x < 264 && y > 98 && y < 142 && logoMask()) { const bx = x - 104, by = y - 98; if (bx < 1 || by < 1 || bx > 158 || by > 42) c = mixc(c, H('#ffcc33'), .5); }
  return c;
};
const F_WARE = (x, y) => {
  const n = hash(Math.floor(x / 2), Math.floor(y / 2)); let c = mixc(H('#6e7078'), H('#7e8088'), n);
  const gx = x % 48, gy = y % 48; if (gx < .8 || gy < .8) c = H('#5a5c62');
  if (Math.abs((x % 96) - 48) < 1 && y > 20 && y < 220) c = mixc(c, H('#d8b030'), .75); if (Math.abs((y % 120) - 60) < 1 && x > 20 && x < 350) c = mixc(c, H('#d8b030'), .75);
  if (hash(Math.floor(x / 3), Math.floor(y / 3)) > .965) c = mixc(c, H('#4a4c52'), .5);
  return c;
};
const F_ROOF = (x, y) => {
  const s = 16, cx = Math.floor(x / s), cy = Math.floor(y / s), lx = x - cx * s, ly = y - cy * s; let c = mixc(H('#2a3038'), H('#38404a'), hash(cx, cy));
  if (lx < 1 || ly < 1) c = H('#1a1e24');
  if (x > 160 && x < 208) { c = mixc(H('#a01830'), H('#c02844'), hash(Math.floor(x / 3), Math.floor(y / 3)) * .5); if (x < 163 || x > 205) c = H('#ffcc33'); }
  const d = Math.hypot(x - 184, y - 120); if (Math.abs(d - 44) < 1.4 && x < 160 || Math.abs(d - 44) < 1.4 && x > 208) c = H('#ffcc33');
  return c;
};
const F_GREEN = (x, y) => {
  let c = mixc(H('#0f5a3a'), H('#176b45'), hash(Math.floor(x / 2), Math.floor(y / 2)));
  const px = x % 24, py = y % 24; if (Math.abs(px - 12) + Math.abs(py - 12) < 4) c = H('#e0b030'); if (px < 1 || py < 1) c = H('#0a3f28');
  return c;
};
MT.SETS = {
  studio: { name: 'STUDIO 9', floorTex: F_STUDIO, outside: '#0a0414', wall: { top: '#3a1f66', side: '#56278a', face: 'plaster', roof: 'plain' }, door: { top: '#caa030', side: '#8a6a18', face: 'plank', roof: 'plain' }, ambient: .62, trim: '#ffcc33', neon: '#ff2e88', song: 'studioBattle' },
  warehouse: { name: 'MEGAMART', floorTex: F_WARE, outside: '#16181c', wall: { top: '#7a8088', side: '#9aa0a8', face: 'plank', roof: 'slab' }, door: { top: '#c04030', side: '#a8b0b8', face: 'plank', roof: 'slab' }, ambient: .66, trim: '#f0c828', neon: '#ffaa30', song: 'warehouseFunk' },
  rooftop: { name: 'ROOFTOP', floorTex: F_ROOF, outside: '#080c18', wall: { top: '#c0a040', side: '#243c58', face: 'plain', roof: 'plain' }, door: { top: '#caa030', side: '#a88a28', face: 'plank', roof: 'plain' }, ambient: .5, trim: '#ffcc33', neon: '#2ee6ff', song: 'finaleOverture' },
  greenroom: { name: 'GREEN ROOM', floorTex: F_GREEN, outside: '#06180e', wall: { top: '#6a4a2a', side: '#8a6238', face: 'plank', roof: 'plain' }, door: { top: '#caa030', side: '#a88a28', face: 'plank', roof: 'plain' }, ambient: .62, trim: '#e0b030', neon: '#7affb0', song: 'recap' }
};
// ---- string sprites ----
const SP = MT.spr = {};
const mk = (rows, pal, sc) => E.sprite(rows, pal, sc || 1);
SP.bill = mk(['.gggggg.', 'gGGgGGgg', 'gG$gg$Gg', 'gGGgGGgg', '.gggggg.'], { g: '#2f9a4a', G: '#6ad27a', $: '#c8ffd0' });
SP.stack = mk(['.bbbbbb.', 'gGGggGGg', 'gGGggGGg', 'bbbbbbbb', 'gGGggGGg', '.gggggg.'], { g: '#2f9a4a', G: '#6ad27a', b: '#e8d048' });
SP.bar = mk(['..yyyyyy..', '.yYYYYYYy.', 'yYwYYYYYYy', 'yyyyyyyyyy', '.dddddddd.'], { y: '#e8a818', Y: '#ffd848', w: '#fffbe0', d: '#8a5a08' });
SP.case = mk(['..ssss..', '.s....s.', 'sSSSSSSs', 'sS$$$$Ss', 'sSS$$SSs', 'sSSSSSSs', 'dddddddd'], { s: '#9aa0b0', S: '#d0d6e4', $: '#2f9a4a', d: '#5a6070' });
const boxPal = { red: ['#d02838', '#ff5a68', '#ffd23a'], blue: ['#2858d0', '#5a8aff', '#ffd23a'], gold: ['#d89820', '#ffd848', '#ff3344'] };
SP.prize = {}; for (const k in boxPal) { const [a, b, c] = boxPal[k]; SP.prize[k] = mk(['..cc..cc..', '...cccc...', 'aaaacbbaaa', 'abbbcbbbba', 'abbbcbbbba', 'cccccccccc', 'abbbcbbbba', 'aaaacaaaaa'], { a, b, c }); }
SP.key = mk(['..yyy...', '.yYYYy..', '.yY.Yy..', '.yYYYy..', '..yYy...', '..yYyyy.', '..yYY.Y.', '..yYyyy.', '..yYy.Y.'], { y: '#e8a818', Y: '#ffe068' });
SP.bomb = mk(['..wwww..', '.wWWWWw.', 'wWwwwwWw', 'wWwyywWw', 'wWwwwwWw', '.wWWWWw.', '..dddd..'], { w: '#c8d0e0', W: '#fff', y: '#ffe068', d: '#6a6a80' });
SP.life = mk(['....y....', '....y....', '..yyYyy..', 'yyYYYYYyy', '.yYYuYYy.', '..yYYYy..', '.yYy.yYy.', '.yy...yy.'], { y: '#e8a818', Y: '#ffe068', u: '#fff' });
SP.statue = mk(['....yy....', '...yYYy...', '....yy....', '..yyYYyy..', '.yYYYYYYy.', '..yYYYYy..', '...yYYy...', '...yYYy...', '..yyYYyy..', '.yyyyyyyy.', '.dddddddd.'], { y: '#e8a818', Y: '#ffe068', d: '#8a5a08' }, 2);
SP.cap = mk(['.sssssss.', 'sSSSSSSSs', 'sSggggggSs', 'sSggggggSs', 'sSggggggSs', 'sSSSSSSSs', '.sssssss.', '..d...d..'], { s: '#2a1a4a', S: '#8a86b0', g: '#101828', d: '#2a1a4a' });
SP.rocket = mk(['.rr.', 'rWWr', 'rWWr', 'oyyo', '.oo.'], { r: '#ff3344', W: '#fff', o: '#ff9a3c', y: '#ffe068' });
SP.bag = mk(['.ww.', 'wyyw', 'wyyw', 'wwww'], { w: '#fff', y: '#ffd23a' });
SP.record = mk(['.yyyy.', 'yYYYYy', 'yYddYy', 'yYddYy', 'yYYYYy', '.yyyy.'], { y: '#e8a818', Y: '#ffe068', d: '#3a2a08' });
SP.heart = mk(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#d02838', R: '#ff6a7a' });
SP.head = mk(['.ss.', 'ssss', 'ssss', '.ss.'], { s: '#ffd0a0' });
SP.live = mk(['.rr.', 'rrrr', '.rr.'], { r: '#ff3344' });
SP.tomato = mk(['.gg.', 'rrrr', 'rRrr', 'rrrr', '.rr.'], { r: '#d02828', R: '#ff6a5a', g: '#3a9a3a' });
SP.tot = mk(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#a87838', B: '#d8a860' });
SP.shell = mk(['.oo.', 'oyyo', 'oyyo', '.oo.'], { o: '#c06030', y: '#ffd070' });
// prize icons (12x12): six silhouettes recoloured per prize index
const SIL = [
  ['....kkkk....', '..kkkkkkkk..', '.kkKKKKKKkk.', '.kKKKKKKKKk.', '.kKKKKKKKKk.', '.kKKwwwKKKk.', '.kKKKKKKKKk.', '.kkkkkkkkkk.', '..k......k..'],
  ['.....kk.....', '....kKKk....', '...kKKKKk...', '..kKKwwKKk..', '..kKKKKKKk..', '..kKKKKKKk..', '...kkkkkk...', '...kK..Kk...', '..kk....kk..'],
  ['kkkkkkkkkkkk', 'kKKKKKKKKKKk', 'kKwwwKKKKKKk', 'kKwwwKKKKKKk', 'kKKKKKKKKKKk', 'kKKKKKKKKKKk', 'kkkkkkkkkkkk', '...kk..kk...'],
  ['............', '....kkkkk...', '..kkKKKKkk..', '.kKKwwKKKKk.', 'kkkkkkkkkkkk', 'kKKKKKKKKKKk', '.kk.kkkk.kk.', '..kk....kk..'],
  ['..kk....kk..', '.kKKk..kKKk.', '.kKKkkkkKKk.', '..kKKKKKKk..', '..kKwKKwKk..', '..kKKKKKKk..', '...kkkkkk...', '....kKKk....'],
  ['.....kk.....', '....kKKk....', '.kkkkKKkkkk.', 'kKKKKKKKKKKk', '.kkkkKKkkkk.', '....kKKk....', '....kKKk....', '...kkkkkk...']];
const PRIZE_COL = ['#d04030', '#3070d0', '#30a060', '#d09020', '#a040c0', '#30b0c0', '#c05080', '#708030', '#e06820'];
MT.prizeIcon = (i) => { MT._pi = MT._pi || {}; if (!MT._pi[i]) { const c = PRIZE_COL[i % PRIZE_COL.length]; MT._pi[i] = mk(SIL[i % SIL.length], { k: '#14081c', K: c, w: '#fff' }); } return MT._pi[i]; };
const _cp = {}; MT.capSprite = id => _cp[id] || (_cp[id] = E.sprite(['.sssssss.', 'sSSSSSSSs', 'sSggggggSs', 'sSggggggSs', 'sSggggggSs', 'sSSSSSSSs', '.sssssss.', '..d...d..'], { s: '#2a1a4a', S: '#8a86b0', g: ({ spread: '#18603a', rockets: '#702020', popcorn: '#807020', laser: '#206078', records: '#706010', shield: '#203878', speed: '#602070' })[id] || '#101828', d: '#2a1a4a' }, 1));
