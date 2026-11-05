/* 20-art: the look. Wall types and floors for the level legend, Japanese props as shape data, tool icons and the clan
 * crest as string sprites, the 静斬 kanji as brush strokes, kawara roof caps, and the petal and maple weathers. */
const H = E.hex;
/* wall decorators, baked with each face */
const shoji = f => { if (f.z1 - f.z0 < 20) return; const c = f.tones; for (let z = f.z0 + 6; z < f.z1 - 4; z += 6) f.line(f.u0, z, f.u1, z, c.sh); for (let u = Math.ceil(f.u0 / 5) * 5; u < f.u1; u += 5) f.line(u, f.z0 + 4, u, f.z1 - 6, c.deep); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#3a2a20'); };
const lattice = f => { const z0 = f.z0 + 6, z1 = Math.min(f.z1 - 6, 30); for (let u = Math.ceil(f.u0 / 3) * 3; u < f.u1; u += 3) f.line(u, z0, u, z1, '#2a1a12'); f.quad(f.u0, f.z1 - 8, f.u1, f.z1 - 6, '#3a2a20'); if (f.z1 > 50) { f.quad(f.u0, 32, f.u1, 34, '#3a2a20'); for (let u = Math.ceil(f.u0 / 4) * 4; u < f.u1; u += 4) f.line(u, 38, u, f.z1 - 10, '#c8b890'); } };
const namako = f => { const z0 = f.z0, z1 = f.z0 + 12; f.quad(f.u0, z0, f.u1, z1, '#3a3a40'); for (let u = Math.floor(f.u0 / 4) * 4; u < f.u1; u += 4) { f.line(u, z0, u + 4, z1, '#e8e4dc'); f.line(u + 4, z0, u, z1, '#e8e4dc'); } f.quad(f.u0, f.z1 - 5, f.u1, f.z1 - 3, '#2a2a30'); if ((f.cx + f.cy) % 3 === 0) f.quad(f.u0 + 5, 30, f.u0 + 10, 36, '#2a2a30'); };
const noren = f => { lattice(f); if ((f.cx * 7 + f.cy * 3) % 2) return; f.quad(f.u0 + 2, f.z1 - 18, f.u1 - 2, f.z1 - 7, '#2a3a6a'); f.line(f.u0 + 8, f.z1 - 18, f.u0 + 8, f.z1 - 7, '#1a2240'); f.dot(f.u0 + 5, f.z1 - 12, '#f4ead5'); f.dot(f.u0 + 11, f.z1 - 12, '#f4ead5'); };
const pillars = f => { f.quad(f.u0, f.z0, f.u0 + 3, f.z1, '#c8402a'); f.quad(f.u1 - 3, f.z0, f.u1, f.z1, '#c8402a'); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#8a2a1a'); };
const slits = f => { if ((f.cx + f.cy) % 2) return; if (f.z1 - f.z0 > 30) f.quad(f.u0 + 7, f.z1 - 14, f.u0 + 9, f.z1 - 6, '#1a1418'); };
const bamboo = f => { for (let u = Math.floor(f.u0 / 2.5) * 2.5; u < f.u1; u += 2.5) { f.line(u, f.z0, u, f.z1, '#6a7a3a'); f.dot(u, f.z0 + 5, '#3a4a20'); f.dot(u, f.z0 + 10, '#3a4a20'); } f.line(f.u0, f.z1 - 3, f.u1, f.z1 - 3, '#4a3a20'); };
const keep = f => { if (f.z1 - f.z0 < 40) return; f.quad(f.u0, f.z0, f.u1, Math.min(f.z1, f.z0 + 24), '#6a6a72'); for (let z = f.z0 + 6; z < f.z0 + 24; z += 6) f.line(f.u0, z, f.u1, z, '#4a4a52'); for (let z = f.z0 + 40; z < f.z1 - 8; z += 30) { f.quad(f.u0, z, f.u1, z + 3, '#2a2a34'); if ((f.cx + f.cy) % 2 === 0) f.quad(f.u0 + 6, z + 8, f.u0 + 10, z + 14, '#2a2a30'); } f.quad(f.u0, f.z1 - 4, f.u1, f.z1, '#4a5468'); };
B.WALLS = {
  '#': { id: 1, h: 56, top: '#5a5a62', side: '#6a6a72', face: 'stone', roof: 'slab', cut: true, cutH: 8, decorate: slits, name: 'Castle wall' },
  W: { id: 2, h: 30, top: '#4a5468', side: '#d8d0c0', face: 'plaster', roof: 'tiles', cut: true, cutH: 6, name: 'Compound wall' },
  F: { id: 3, h: 14, top: '#5a6a2a', side: '#7a8a3a', face: 'plank', roof: 'plain', decorate: bamboo, name: 'Bamboo fence' },
  H: { id: 4, h: 40, top: '#3a3028', side: '#4a3428', face: 'timber', roof: 'plain', cut: true, cutH: 6, decorate: shoji, hall: true, name: 'Hall wall' },
  A: { id: 5, h: 40, top: '#4a5468', side: '#c8bca8', face: 'timber', roof: 'tiles', decorate: lattice, name: 'Townhouse' },
  B: { id: 6, h: 64, top: '#4a5468', side: '#b8ac98', face: 'timber', roof: 'tiles', decorate: lattice, balcony: { z: 34, color: '#3a2a1e' }, name: 'Inn' },
  C: { id: 7, h: 48, top: '#3a4458', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: namako, name: 'Storehouse' },
  D: { id: 8, h: 40, top: '#4a5468', side: '#8a6a4a', face: 'timber', roof: 'tiles', decorate: noren, name: 'Shop' },
  S: { id: 9, h: 56, top: '#3a3a44', side: '#a8483a', face: 'plank', roof: 'tiles', decorate: pillars, name: 'Shrine' },
  T: { id: 10, h: 80, top: '#4a3a2a', side: '#7a6048', face: 'plank', roof: 'slab', name: 'Watchtower' },
  G: { id: 11, h: 64, top: '#4a5468', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 1' },
  K: { id: 12, h: 112, top: '#4a5468', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 2' },
  M: { id: 13, h: 160, top: '#3a4458', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 3' },
  P: { id: 14, h: 10, top: '#3e6a3a', side: '#5a4a32', face: 'plank', roof: 'leaves', name: 'Planter' },
  R: { id: 15, h: 20, top: '#6a6a6a', side: '#5a5a5a', face: 'rock', roof: 'speckle', name: 'Rocks' }
};
B.FLOORS = { '.': ['earth', 'Earth'], ',': ['grass', 'Tall grass'], '"': ['bamboo', 'Bamboo grove'], ':': ['gravel', 'Raked gravel'], '=': ['boards', 'Boards'],
  _: ['tatami', 'Tatami'], '+': ['paving', 'Stone paving'], '~': ['deep', 'Deep water'], '-': ['shallow', 'Shallow water'], d: ['door', 'Doorway'] };
B.TYPES = {}; for (const ch in B.WALLS) B.TYPES[B.WALLS[ch].id] = B.WALLS[ch];
B.LEGEND = {}; for (const ch in B.WALLS) B.LEGEND[ch] = B.WALLS[ch].id; for (const ch in B.FLOORS) B.LEGEND[ch] = { floor: B.FLOORS[ch][0] };
const EARTH = { stones: ['#3a3430', '#423a34', '#36302c'].map(H), mortar: H('#2a2422'), hi: H('#4a423a'), lo: H('#2e2826'), speck: H('#4a4038') };
const PAVE = { stones: ['#5a5a60', '#626268', '#56565c'].map(H), mortar: H('#2e2e34'), hi: H('#72727a'), lo: H('#46464c'), speck: H('#4e4e54') };
B.floorTex = (x, y, tag) => {
  if (tag === 'grass' || tag === 'bamboo') return E.tex.grass(x, y, { base: tag === 'bamboo' ? '#2e4a2a' : '#2e4a32', dark: '#1e3422', light: '#4a6a3a' });
  if (tag === 'gravel') { const n = E.noise2(x * .7, y * .7), ring = Math.sin((y + Math.sin(x * .08) * 3) * .9) > .6; const v = 150 + n * 30 - (ring ? 34 : 0); return [v * .92, v * .92, v]; }
  if (tag === 'boards' || tag === 'door') return E.tex.planks(x, y, { base: '#5a4430', dark: '#3a2a1e', light: '#6e5438' });
  if (tag === 'tatami') { const bx = x % 32, by = y % 16, edge = bx < 1.5 || by < 1.5; if (edge) return [40, 30, 24]; const w = (Math.floor(y) % 2) ? 8 : 0; return [128 + w, 120 + w, 60]; }
  if (tag === 'deep') return E.tex.water(x, y, { deep: '#162c48', base: '#1e3a5a', light: '#4a7aa0' });
  if (tag === 'shallow') return E.tex.water(x, y, { deep: '#2a4a60', base: '#3a5a6a', light: '#6a9ab0' });
  if (tag === 'paving') return E.tex.flagstone(x, y, PAVE);
  return E.tex.dirt(x, y, { base: '#3a3430', dark: '#2a2420', light: '#4a4038' });
};
void EARTH;

/* ---- props as shape data (feet on the point, front south) ---- */
Object.assign(E.MATERIALS, { lacquer: { color: '#1a1214', pattern: 'glaze' }, lacquerRed: { color: '#8a1c1c', pattern: 'glaze' }, paperGlow: { color: '#ffd08a', glow: 1 },
  bronzeB: { color: '#7a5a2a', pattern: 'metal' }, vermilion: { color: '#c8402a' }, strawB: { color: '#b8a060', pattern: 'thatch' }, bambooG: { color: '#6a8a3a', pattern: 'planks', dir: 'v' } });
Object.assign(E.SHAPES, {
  stoneLantern: { about: 'stone lantern (ishidoro)', mats: { s: 'granite', g: 'paperGlow' }, lights: [[0, 0, 22, '#ffb060', 46]],
    parts: [['lathe', 's', [0, 0, 0], [[0, 0], [5, 0], [4, 2], [2, 3], [2, 14], [5, 15], [5, 17], [0, 17]]], ['box', 'g', [0, 0, 17], [6, 6, 6]], ['cyl', 's', [0, 0, 23], 7, 4, { r2: 0, seg: 6 }], ['ball', 's', [0, 0, 28], 1.5]] },
  chochin: { about: 'paper lantern on a post', mats: { w: 'walnut', g: 'paperGlow' }, lights: [[0, 0, 26, '#ffa050', 50]],
    parts: [['cyl', 'w', [0, 0, 0], 1, 22], ['ball', 'g', [0, 0, 26], 4, { sz: 1.3 }], ['cyl', 'w', [0, 0, 30], 2.5, 1.5]] },
  torii: { about: 'vermilion torii gate', mats: { v: 'vermilion', b: 'lacquer' },
    parts: [['mirror', 'x', ['cyl', 'v', [11, 0, 0], 1.6, 34]], ['box', 'v', [0, 0, 27], [26, 2, 2.5]], ['box', 'b', [0, 0, 34], [32, 3, 2.5]], ['box', 'v', [0, 0, 31], [2, 2, 3]]] },
  bambooClump: { about: 'bamboo stalks', mats: { b: 'bambooG', l: 'leaves' },
    parts: [['cyl', 'b', [-3, 0, 0], 1, 46], ['cyl', 'b', [2, -2, 0], 1, 52], ['cyl', 'b', [1, 3, 0], .9, 40], ['ball', 'l', [-2, 0, 46], 5, { sz: .5 }], ['ball', 'l', [2, -2, 52], 6, { sz: .5 }], ['ball', 'l', [1, 3, 41], 4, { sz: .5 }]] },
  sakeBarrel: { about: 'straw-wrapped sake barrel', mats: { s: 'strawB', r: 'lacquerRed' },
    parts: [['cyl', 's', [0, 0, 0], 6, 11], ['cyl', 'r', [0, 0, 4], 6.2, 3], ['cyl', 'lacquer', [0, 0, 11], 5.5, 1]] },
  riceBale: { about: 'rice bale (tawara)', mats: {}, parts: [['group', [0, 0, 5], [0, 90, 0], [['cyl', 'strawB', [0, 0, -7], 5, 14], ['cyl', 'lacquerRed', [0, 0, -2], 5.2, 1], ['cyl', 'lacquerRed', [0, 0, 3], 5.2, 1]]]] },
  jubako: { about: 'stack of lacquer lunchboxes', mats: { b: 'lacquer', r: 'lacquerRed', g: 'gold' },
    parts: [['box', 'b', [0, 0, 0], [10, 10, 4]], ['box', 'r', [0, 0, 4], [10, 10, 4]], ['box', 'b', [0, 0, 8], [10, 10, 3]], ['box', 'g', [0, 5, 5], [3, 1, 2]]] },
  yatai: { about: 'noodle stall', mats: { w: 'walnut', c: 'linen', r: 'lacquerRed', g: 'paperGlow' }, lights: [[0, 6, 20, '#ffb060', 54]],
    parts: [['box', 'w', [0, 0, 0], [26, 14, 12]], ['mirror', 'x', ['box', 'w', [12, -6, 12], [2, 2, 20]]], ['box', 'r', [0, 0, 32], [30, 18, 2]], ['box', 'c', [0, 8, 24], [24, 1, 8]], ['ball', 'g', [10, 8, 21], 2.5]] },
  weaponRack: { about: 'spear rack', mats: { w: 'walnut', m: 'steel' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [2, 3, 20]]], ['box', 'w', [0, 0, 14], [18, 2, 2]], ['row', 4, [4, 0, 0], ['cyl', 'w', [0, 1, 0], .5, 30]], ['row', 4, [4, 0, 0], ['cyl', 'm', [0, 1, 30], .8, 3, { r2: 0 }]]] },
  mato: { about: 'archery target', mats: {}, parts: [['mirror', 'x', ['box', 'oak', [5, 0, 0], [1.5, 1.5, 14]]], ['group', [0, 0, 12], [90, 0, 0], [['cyl', 'linen', [0, 0, -1], 7, 2], ['cyl', 'lacquerRed', [0, 0, -1.2], 4.5, 2.4], ['cyl', 'linen', [0, 0, -1.4], 2.5, 2.8]]]] },
  taiko: { about: 'taiko drum on a stand', mats: { w: 'walnut', d: 'lacquerRed', s: 'linen' },
    parts: [['mirror', 'x', ['box', 'w', [6, 0, 0], [2, 6, 10]]], ['group', [0, 0, 14], [90, 0, 0], [['lathe', 'd', [0, 0, -5], [[0, 0], [7, 0], [8, 5], [7, 10], [0, 10]]]]]] },
  hansho: { about: 'alarm bell on a frame', mats: { w: 'walnut', b: 'bronzeB', r: 'slate' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [2, 2, 34]]], ['box', 'r', [0, 0, 34], [22, 6, 3]], ['lathe', 'b', [0, 0, 16], [[0, 0], [5, 0], [4.5, 4], [4, 12], [1, 14], [0, 14]]]] },
  well: { about: 'stone well with a pulley', mats: { s: 'granite', w: 'walnut' },
    parts: [['lathe', 's', [0, 0, 0], [[7, 0], [7.5, 10], [5.5, 10], [5.5, 2], [0, 2]]], ['mirror', 'x', ['box', 'w', [7, 0, 0], [1.5, 1.5, 22]]], ['box', 'w', [0, 0, 22], [17, 2, 2]]] },
  waterBarrel: { about: 'water barrel', mats: { w: 'oak', h: 'iron' }, parts: [['cyl', 'w', [0, 0, 0], 5, 11], ['row', 2, [0, 0, 6], ['cyl', 'h', [0, 0, 2], 5.3, 1]]] },
  boat: { about: 'small moored boat', mats: {}, parts: [['box', 'walnut', [0, 0, 0], [40, 12, 4]], ['wedge', 'walnut', [22, 0, 0], [6, 12, 6]], ['box', 'oak', [0, 0, 4], [30, 9, 1]], ['cyl', 'walnut', [-14, 0, 4], .6, 16]] },
  bargeRice: { about: 'rice barge loaded with bales', mats: { w: 'walnut', s: 'strawB' }, parts: [['box', 'w', [0, 0, 0], [34, 14, 5]], ['row', 3, [9, 0, 0], ['cyl', 's', [0, 0, 5], 4, 7]]] },
  moorPost: { about: 'mooring post with rope', mats: { w: 'walnut', r: 'strawB' }, parts: [['cyl', 'w', [0, 0, 0], 2.2, 14], ['cyl', 'r', [0, 0, 9], 2.6, 2]] },
  cage: { about: 'bamboo cage', mats: { b: 'bambooG', w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [20, 20, 2]], ['box', 'w', [0, 0, 26], [20, 20, 2]], ['ring', 10, 9, ['cyl', 'b', [0, 0, 2], .7, 24]]] },
  lever: { about: 'iron lever on a post', mats: { w: 'walnut', m: 'iron' }, parts: [['box', 'w', [0, 0, 0], [5, 5, 14]], ['box', 'm', [0, 2, 12], [1.2, 1.2, 10], { rot: [30, 0, 0] }]] },
  nobori: { about: 'nobori banner pole', mats: { w: 'walnut', c: 'lacquerRed' }, parts: [['cyl', 'w', [0, 0, 0], .8, 44], ['box', 'c', [3, 0, 18], [6, .6, 24]]] },
  shachihoko: { about: 'golden shachihoko', mats: { g: 'gold' }, parts: [['ball', 'g', [0, 0, 4], 3, { sz: 1.4 }], ['cyl', 'g', [0, -2, 7], 1.5, 5, { r2: 2.5 }]] },
  dummy: { about: 'straw practice dummy', mats: { s: 'strawB', w: 'walnut' }, parts: [['cyl', 'w', [0, 0, 0], 1.2, 26], ['cyl', 's', [0, 0, 10], 4, 12], ['ball', 's', [0, 0, 26], 3.5], ['box', 'w', [0, 0, 18], [14, 1.5, 1.5]]] },
  steppingStone: { about: 'stepping stone', mats: { s: 'granite' }, parts: [['cyl', 's', [0, 0, 0], 5, 1.5, { sq: .7 }]] },
  strawMat: { about: 'straw mat', mats: { s: 'strawB' }, parts: [['box', 's', [0, 0, 0], [16, 10, .6]]] },
  persimmon: { about: 'persimmon tree', mats: { b: 'bark', l: 'leaves', f: 'lacquerRed' }, parts: [['cyl', 'b', [0, 0, 0], 2, 30, { r2: 1.2 }], ['ball', 'l', [0, 0, 38], 13, { sz: .7 }], ['ball', 'f', [5, 6, 34], 1.3], ['ball', 'f', [-6, 3, 38], 1.3], ['ball', 'f', [2, -6, 40], 1.3]] }
});
/* trees recolored: cherry and maple */
B.treeTint = { cherry: '#e8a0b8', maple: '#c8402a', pine: '#2a4a32' };

/* ---- string sprites: tool icons (16x16), the crest, small marks ---- */
const SP = (rows, pal) => E.sprite(rows, pal);
B.ICON = {
  riceball: SP(['......kk......', '.....kwwk.....', '....kwwwwk....', '...kwwwwwwk...', '..kwwwwwwwwk..', '..kwwwwwwwwk..', '.kwwwwwwwwwwk.', '.kwwwkkkkwwwk.', 'kwwwkggggkwwwk', 'kwwkggggggkwwk', 'kwwkggggggkwwk', '.kkkkkkkkkkkk.'], { k: '#1a1418', w: '#f4f0e4', g: '#2a4a2a' }),
  poison: SP(['......kk......', '.....kppk.....', '....kpwppk....', '...kppwpppk...', '..kppppppppk..', '..kppppwpppk..', '.kpppppppppk..', '.kppkkkkkpppk.', 'kpppkggggkpppk', 'kppkgsssgkkppk', 'kppkggggggkppk', '.kkkkkkkkkkkk.'], { k: '#1a1418', p: '#b8a0c8', w: '#e8e0f0', g: '#2a4a2a', s: '#5a2a6a' }),
  dango: SP(['.....kk.......', '....kppk......', '....kppk......', '.....kk.......', '....kwwk......', '....kwwk......', '.....kk.......', '....kggk......', '....kggk......', '.....kk.......', '......w.......', '......w.......'], { k: '#1a1418', p: '#f0a0b8', w: '#f4f0e4', g: '#8ac86a' }),
  plum: SP(['.......g......', '......gg......', '....kkkkk.....', '...krrrrrk....', '..krrwrrrrk...', '..krwrrrrrk...', '..krrrrrrrk...', '..krrrrrrrk...', '...krrrrrk....', '....kkkkk.....'], { k: '#2a0a10', r: '#c8302a', w: '#f0a090', g: '#4a8a3a' }),
  shuriken: SP(['......k.......', '.....kmk......', '.....kmk......', '.kk..kmk..kk..', '.kmmkkkkkmmk..', '..kmmkhkmmk...', '...kkhhhkk....', '..kmmkhkmmk...', '.kmmkkkkkmmk..', '.kk..kmk..kk..', '.....kmk......', '......k.......'], { k: '#1a1418', m: '#a8b0c0', h: '#e8ecf4' }),
  smoke: SP(['.....yy.......', '......y.......', '....kkkk......', '...kssssk.....', '..kssssssk....', '..kssssssk....', '..kssssssk....', '...kssssk.....', '....kkkk......'], { k: '#1a1418', s: '#5a5a62', y: '#e8b04a' }),
  caltrops: SP(['..............', '...k.....k....', '...mk...km....', '....mk.km.....', '.....mkm......', '....kmmmk.....', '...km.k.mk....', '..mk..k..km...', '......k.......'], { k: '#1a1418', m: '#a8b0c0' }),
  firecracker: SP(['........y.....', '.......y......', '......k.......', '.....krrk.....', '.....krrk.....', '.....krgk.....', '.....krrk.....', '.....krgk.....', '.....krrk.....', '.....kkkk.....'], { k: '#1a1418', r: '#d8402a', g: '#e8b04a', y: '#ffe080' }),
  firepot: SP(['......yy......', '.....yk.......', '....kkkk......', '...kbbbbk.....', '..kbbbbbbk....', '..kbbrbbbk....', '..kbbbbbbk....', '...kbbbbk.....', '....kkkk......'], { k: '#1a1418', b: '#5a4030', r: '#d8402a', y: '#ffa040' }),
  cloak: SP(['.....kkk......', '....kyyyk.....', '...kyyyyyk....', '...kyhyhyk....', '..kyyyyyyyk...', '..kyhyhyhyk...', '.kyyyyyyyyyk..', '.kyhyhyhyhyk..', 'kyyyyyyyyyyyk.', 'kkkkkkkkkkkkk.'], { k: '#2a2010', y: '#b8a060', h: '#8a7440' }),
  scroll: SP(['.kkkkkkkkkk.', 'kbppppppppbk', 'kbpkkkkkkpbk', 'kbppppppppbk', 'kbpkkkkkppbk', 'kbppppppppbk', '.kkkkkkkkkk.'], { k: '#1a1418', b: '#8a1c1c', p: '#f4ead5' }),
  coin: SP(['.kkkk.', 'kyyyyk', 'kyk.yk', 'kyyyyk', '.kkkk.'], { k: '#5a3a10', y: '#e8b04a' })
};
B.CREST = SP(['....kkkkkk....', '..kk......kk..', '.k..kkkkkk..k.', '.k..krrrrk..k.', 'k...krrrrk...k', 'k...kkkkkk...k', 'k...kbbbbk...k', 'k...kbbbbk...k', '.k..kkkkkk..k.', '.k..........k.', '..kk......kk..', '....kkkkkk....'], { k: '#e8b04a', r: '#d8402a', b: '#1a1214' });
/* ---- the kanji 静 (silent) and 斬 (cut) as brush strokes on a 32 grid ---- */
B.KANJI = {
  sei: [[[2, 3], [13, 3]], [[3, 7], [12, 7]], [[1, 11], [14, 11]], [[7.5, 1], [7.5, 11]], [[4, 14], [4, 27], [2, 30]], [[4, 14], [12, 14], [12, 28], [10, 30]], [[4, 19], [12, 19]], [[4, 23], [12, 23]],
    [[22, 1], [18, 8]], [[20, 5], [27, 5], [24, 10]], [[17, 12], [30, 12]], [[28, 12], [28, 22]], [[18, 17], [28, 17]], [[18, 22], [29, 22]], [[23, 8], [23, 29], [20, 30]]],
  zan: [[[2, 3], [13, 3]], [[3, 8], [12, 8]], [[3, 8], [3, 17]], [[12, 8], [12, 17]], [[3, 12.5], [12, 12.5]], [[3, 17], [12, 17]], [[1, 22], [14, 22]], [[7.5, 1], [7.5, 31]],
    [[29, 2], [19, 6]], [[19, 6], [19, 20], [16, 30]], [[19, 14], [31, 14]], [[26, 14], [26, 31]]]
};
B.drawKanji = (g, id, x, y, s, color, edge) => {
  for (const pass of [0, 1]) for (const st of B.KANJI[id]) for (let i = 0; i < st.length - 1; i++) {
    const [a0, b0] = st[i], [a1, b1] = st[i + 1], w = Math.max(1, Math.round(s * 2.6)) + (pass ? 0 : 2);
    px.line(g, Math.round(x + a0 * s), Math.round(y + b0 * s), Math.round(x + a1 * s), Math.round(y + b1 * s), pass ? color : edge, w);
    if (i === 0) px.disc(g, x + a0 * s, y + b0 * s, w * .6, pass ? color : edge);
  }
};
/* the weathers of falling petals and maple leaves (cosmetic) */
E.WEATHER.petals = Object.assign({}, E.WEATHER.leaves, { colors: ['#f0b8c8', '#e8a0b8', '#f8d0dc', '#d888a0'], n: 40, fall: 18, sway: 30, size: 1.5 });
E.WEATHER.maple = Object.assign({}, E.WEATHER.leaves, { colors: ['#c8402a', '#e05a2a', '#a8301a', '#e8803a'], n: 48 });
E.style.propSize = 1.4;
