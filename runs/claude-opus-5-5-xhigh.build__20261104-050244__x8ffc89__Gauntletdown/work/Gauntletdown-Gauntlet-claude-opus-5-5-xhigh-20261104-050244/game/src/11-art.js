/* ---- ART: rigs for the heroes and the bestiary, the Shade (a ghost rig), string sprites, shapes for set pieces ---- */
const ASSET_SET = E.addAssets((typeof window !== 'undefined' && window.ASSETS && window.ASSETS.gd) || { set: 'gd' });
const HAS_ASSETS = ASSET_SET.shapes.length > 0;

/* the four heroes (engine change E2 gives the axe, bow, shield and horned helmet) */
const HERO_RIGS = {
  berserker: () => new E.Humanoid({ size: 1.32, build: 'bulky', weapon: 'axe', hat: { style: 'horned', color: '#8a8478' }, hair: 'long', sleeves: 'none', outfit: 'tunic', armor: true,
    cape: { len: 5, width: 4, seg: 2.4 }, face: { bangs: .2 },
    colors: { skin: '#e8a878', hair: '#c4501e', cloth: '#9a2a22', trim: '#e8c060', pants: '#5a3a24', boot: '#3a2418', belt: '#2a1a12', glove: '#6a4428', metal: '#c8ccd4', plate: '#8a8478', staff: '#6a3e1e', cape: '#7a5a3a', capeIn: '#4a3220', eye: '#2a1a12' } }),
  shieldmaiden: () => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: 'sword', offhand: 'shield', hat: { style: 'helmet', color: '#b8c0cc' }, hair: 'ponytail', outfit: 'tunic', armor: true, sleeves: 'long',
    colors: { skin: '#f4c8a0', hair: '#f0d070', cloth: '#2a4aa0', trim: '#e8e0c8', pants: '#3a3a52', boot: '#5a4a3a', belt: '#5a3a1e', glove: '#8a6a4a', metal: '#e0e4ec', plate: '#9aa4b4', hilt: '#c8a040', shield: '#2a5ac8', eye: '#2a4a8a' } }),
  ranger: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: 'bow', hood: true, sleeves: 'long', outfit: 'coat', cape: { len: 4, width: 3.2, seg: 2.2 },
    colors: { skin: '#e8b890', hair: '#3e6a2a', cloth: '#3a7a3a', coat: '#4a6a32', trim: '#c8a868', pants: '#5a4a32', boot: '#4a3020', belt: '#6a4a2a', glove: '#7a5a3a', staff: '#8a5a2a', cape: '#2e5a2a', capeIn: '#1e3a1e', eye: '#3a5a2a' } }),
  hexer: () => new E.Humanoid({ size: 1.24, build: 'chibi', weapon: 'staff', hat: { style: 'pointed', color: '#5a2a8a' }, outfit: 'robe', sleeves: 'long', hunch: .3, hair: 'long', face: { eyes: 'big', bangs: .6 },
    colors: { skin: '#e8c8a8', hair: '#d8d4e0', cloth: '#6a3a9a', trim: '#f5b700', pants: '#4a2a6a', boot: '#3a2a1e', belt: '#f5b700', staff: '#6a4a2a', orb: '#ffd84a', eye: '#4a2a6a' } })
};

/* THE SHADE: a hungerghost. A teardrop sheet with a hem that flutters with speed, two glowing eye holes and a mouth that
   gapes as it nears a hero; half see-through. Drawn in screen pixels from the view's scale, so it reads in every view */
class Shade {
  constructor(o = {}) { this.size = o.size || 1; this.tint = o.tint || '#c8d4e8'; this.t = Math.random() * 9; this.speed = 0; this.mouth = 0; this.face = 0; this.chomp = 0; }
  update(dt, s) { this.t += dt; this.speed = Math.hypot(s.vx || 0, s.vy || 0); if (s.vx || s.vy) this.face = Math.atan2(s.vy, s.vx); this.mouth = approachV(this.mouth, s.gape || 0, dt * 4); this.size = s.size || this.size; if (s.tint) this.tint = s.tint; this.chomp = Math.max(0, this.chomp - dt); }
  draw(g, ox, oy, view) {
    const k = (view.scale || 1) * this.size, H = 20 * k, Wd = 7.5 * k, bob = Math.sin(this.t * 3) * 1.5 * k, x = ox, y = oy - 6 * k + bob, C = E.tones(this.tint), lean = Math.cos(this.face) * Math.min(1, this.speed / 50) * 2 * k;
    const pts = [], n = 14;
    for (let i = 0; i <= n; i++) {   // the sheet: a rounded head, sides widening to a fluttering hem
      const a = Math.PI + i / n * Math.PI, hx = x + Math.cos(a) * Wd * .82, hy = y - H + Wd * .9 + Math.sin(a) * Wd * .9;
      pts.push([hx, hy]);
    }
    const hem = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, hx = x + Wd * (1 - 2 * u) - lean * (1 - u), wave = Math.sin(this.t * (6 + this.speed * .08) + u * 9) * 1.6 * k; hem.push([hx, y + wave + (i % 2 ? -1.6 * k : 0)]); }
    const body = [...pts, ...hem];
    px.blend(g, .7, 'normal', () => { px.poly(g, body, C.sh); px.poly(g, body.map(([a, b]) => [a - k * .6 + (a - x) * -.12, b - k * .5]), C.base); });
    px.blend(g, .5, 'add', () => px.disc(g, x - Wd * .3, y - H + Wd * .8, Wd * .35, C.hi));
    const ex = x + Math.cos(this.face) * k * .8, ey = y - H + Wd * 1.25;   // eyes and mouth: holes into the dark, the eyes glowing
    for (const s of [-1, 1]) { px.disc(g, ex + s * Wd * .36, ey, Math.max(1, 1.4 * k), '#1a1028'); px.dot(g, ex + s * Wd * .36, ey, '#ffe060'); }
    const m = .4 + this.mouth * 1.6 + (this.chomp > 0 ? Math.abs(Math.sin(this.chomp * 30)) * 1.2 : 0);
    px.ell(g, ex, ey + Wd * .7, Math.max(1, Wd * .32), Math.max(.8, m * k), '#0e0818');
  }
}
const approachV = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

/* the bestiary's rigs; tint by rank (rank 3 the deepest color, rank 1 pale) */
const RANK_TINT = { ghost: ['#d8e0ec', '#b8c4e0', '#9aa8d8'], gnasher: ['#9aa890', '#7a9070', '#5a7a52'], lobber: ['#f0e8e0', '#e8d8c8', '#e0c8b0'], imp: ['#e89060', '#e06a3a', '#c8401e'], fryar: ['#8a7aa0', '#6a5a8a', '#4a3a6a'] };
const MON_RIGS = {
  ghost: rank => new Shade({ size: [0, .85, 1, 1.15][rank], tint: RANK_TINT.ghost[rank - 1] }),
  gnasher: rank => new E.Humanoid({ size: .95, build: 'bulky', weapon: 'club', hair: 'bald', outfit: 'tunic', sleeves: 'none', eyeGlow: '#ffd84a', hunch: .35,
    colors: { skin: RANK_TINT.gnasher[rank - 1], cloth: '#6a4a2a', trim: '#8a6a3a', pants: '#3a2a1a', boot: '#2a1a12', belt: '#2a1a12', staff: '#7a5a32' } }),
  lobber: rank => new E.Humanoid({ size: .9, build: 'chibi', weapon: null, hat: { style: 'band', color: '#ffffff' }, outfit: 'robe', sleeves: 'short', hair: 'short', face: { eyes: 'big' },
    colors: { skin: '#e8b090', hair: '#5a3a2a', cloth: RANK_TINT.lobber[rank - 1], trim: '#c84a3a', belt: '#c84a3a', boot: '#4a3a2a', eye: '#2a1a12' } }),
  imp: rank => new E.Blob({ R: 5 + rank * .5, horns: true, wings: true, tail: true, feet: true, mouth: 'fangs', face: 'front',
    colors: { dk: '#5a1a0e', base: RANK_TINT.imp[rank - 1], lt: '#ffc890', spec: '#fff0c0', eye: '#ffe070', pupil: '#2a0a04', wing: '#7a2a14', inner: '#ff8a3a', ext: '#3a1008' } }),
  fryar: rank => new E.Humanoid({ size: 1.02, build: 'heroic', weapon: 'pan', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff8a3a', hunch: .2,
    colors: { skin: '#c8a888', hair: RANK_TINT.fryar[rank - 1], cloth: RANK_TINT.fryar[rank - 1], trim: '#e8c060', belt: '#e8c060', boot: '#2a1e1a', pan: '#2a2a32', staff: '#5a3a1e' } }),
  snatcher: () => new E.Humanoid({ size: .85, build: 'chibi', weapon: null, hood: true, outfit: 'tunic', sleeves: 'long', face: { eyes: 'big' }, lean: .3,
    colors: { skin: '#c8b07a', hair: '#5a4a2a', cloth: '#7a6a4a', trim: '#a89060', pants: '#4a3a2a', boot: '#2a1e14', belt: '#3a2a1a', eye: '#1a1408' } }),
  tithe: () => new E.Humanoid({ size: 1.35, build: 'skeleton', weapon: 'scythe', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff2a2a',
    colors: { bone: '#e8e0cc', cloth: '#1e1a24', hair: '#16121c', trim: '#5a1a1a', belt: '#5a1a1a', metal: '#d0d4dc', staff: '#3a2a20', boot: '#16121c' } }),
  king: () => new E.Humanoid({ size: 2.3, build: 'skeleton', weapon: 'fork', outfit: 'robe', hat: { style: 'crown', color: '#e8c040' }, sleeves: 'long', cape: { len: 9, width: 7, seg: 3 }, eyeGlow: '#ffd040',
    colors: { bone: '#f0e8d4', cloth: '#5a1a6a', trim: '#e8c040', belt: '#e8c040', metal: '#d8c890', staff: '#6a4a2a', cape: '#7a1a2a', capeIn: '#3a0a14', boot: '#2a1a2a' } })
};

/* ---- string sprites (8-16 px) ---- */
const SPR = {
  key: E.sprite(['..yy....', '.y..y...', '.y..yyyy', '..yy.y.Y', '........'], { y: '#f8d048', Y: '#a87818' }),
  gold: E.sprite(['...yy...', '.yYYyy..', 'yYYyYYy.', 'dyyyyyyd', '.dddddd.'], { y: '#f0c030', Y: '#fff0a0', d: '#a87010' }),
  gem: E.sprite(['..w..', '.wGg.', 'wGGgg', '.gGd.', '..d..'], { w: '#e8fff0', G: '#56e070', g: '#1e9a3a', d: '#0e5a24' }),
  ruby: E.sprite(['..w..', '.wRr.', 'wRRrr', '.rRd.', '..d..'], { w: '#ffe8f0', R: '#ff5a7a', r: '#c81a3a', d: '#6a0a1a' }),
  crown: E.sprite(['y..y..y', 'yy.yy.y', 'yYyyyYy', 'yRyByRy', 'dddddd.'], { y: '#f0c030', Y: '#fff0a0', d: '#a87010', R: '#e83a4a', B: '#3a8ae8' }),
  jug: E.sprite(['..cc..', '.cDDc.', 'cDLDDc', 'cDDDDc', 'cDDDDc', '.cccc.'], { c: '#6a3a1e', D: '#c87a3a', L: '#f0c890' }),
  flask: E.sprite(['..cc..', '..ww..', '.wBBw.', 'wBLBBw', 'wBBBBw', '.wwww.'], { c: '#8a5a2a', w: '#c8e0f0', B: '#3a6ae8', L: '#a8d8ff' }),
  chomp: E.sprite(['.w.', 'w.w', '.w.'], { w: '#ffffff' }),
  skull: E.sprite(['.www.', 'wwwww', 'w.w.w', '.www.', '.w.w.'], { w: '#e8e0cc' }),
  heart: E.sprite(['.R.R.', 'RWRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a', W: '#ffd0d6' }),
  bell: E.sprite(['..yy..', '.yYYy.', '.yYYy.', 'yYYYYy', 'dddddd', '..dd..'], { y: '#d8a030', Y: '#fff0a0', d: '#8a5a10' }),
  menu: E.sprite(['.www.', 'w.w.w', 'wwwww', '.w.w.'], { w: '#ffd060' })
};
/** a potion sprite in a special's color */
const potionSprite = c => E.sprite(['..cc..', '..ww..', '.wPPw.', 'wPLPPw', 'wPPPPw', '.wwww.'], { c: '#8a5a2a', w: '#e8e8f0', P: c, L: E.shade(c, .5) });
const amuletSprite = c => E.sprite(['.yyy.', 'y...y', 'y...y', '.yAy.', '.AWA.', '..A..'], { y: '#e8c060', A: c, W: E.shade(c, .6) });
for (const s of all('specials')) SPR['sp_' + s.id] = potionSprite(s.color);
for (const a of all('amulets')) SPR['am_' + a.id] = amuletSprite(a.color);
/* hero projectiles (turned with rot), the bestiary's, and their colors */
const SHOT_SPR = {
  axe: E.sprite(['..ss...', '.sSSs..', 'sSSSSw.', '..ww.w.', '..w....'], { s: '#9aa4b0', S: '#e8ecf4', w: '#8a5a2a' }),
  javelin: E.sprite(['ww......', '.wwbbbbS', 'ww......'], { w: '#e8e0c8', b: '#8a5a2a', S: '#e8ecf4' }),
  arrow: E.sprite(['r......', '.bbbbbS', 'r......'], { r: '#e84a3a', b: '#c8a868', S: '#e8ecf4' }),
  hex: E.sprite(['.pPp.', 'pPWPp', 'PWWWP', 'pPWPp', '.pPp.'], { p: '#8a3ac8', P: '#d070ff', W: '#fff0ff' }),
  crock: E.sprite(['.cc.', 'cCCc', 'cCCc', '.cc.'], { c: '#8a4a2a', C: '#d08a4a' }),
  plate: E.sprite(['.www.', 'wWWWw', 'wWyWw', 'wWWWw', '.www.'], { w: '#c8c8d4', W: '#ffffff', y: '#e8c060' }),
  fireball: E.sprite(['.oo.', 'oYYo', 'oYYo', '.oo.'], { o: '#ff6a1a', Y: '#fff0a0' })
};

/* ---- shapes: set pieces drawn from any view and facing (docs/ASSETS.md), with damage states as params ---- */
Object.assign(E.MATERIALS, {
  'gd-ash': { color: '#8a8478', pattern: 'speck', amount: .2 }, 'gd-clay': { color: '#a86a4a', pattern: 'glaze' }, 'gd-crack': { color: '#a86a4a', pattern: 'glaze', over: [['cracks']] },
  'gd-earth': { color: '#6a5038', pattern: 'stones', size: 4 }, 'gd-hole': { color: '#120a06', pattern: 'none' }, 'gd-ember': { color: '#ff7a2a', pattern: 'none', glow: 1 },
  'gd-wax': { color: '#f0e8d0', pattern: 'none' }, 'gd-rune': { color: '#6ae8e0', pattern: 'none', glow: 1 }, 'gd-redrune': { color: '#ff4a6a', pattern: 'none', glow: 1 },
  'gd-goldrune': { color: '#ffd04a', pattern: 'none', glow: 1 }, 'gd-soup': { color: '#7ab83a', pattern: 'speck', amount: .3 }, 'gd-dark': { color: '#2a2230', pattern: 'metal' }
});
const SH = (id, about, mats, make, params) => { E.SHAPES[id] = { about, tags: 'gauntletdown', mats, params, make }; };
SH('gd-urn', 'Ash Urn: a clay urn spilling ash (ghost generator)', { c: 'gd-clay', k: 'gd-crack', a: 'gd-ash', h: 'gd-hole' }, p => {
  const top = [15, 12, 7][p.dmg], m = p.dmg ? 'k' : 'c';
  return [['cyl', 'a', [0, 0, 0], 9, 1.5, { r2: 7 }], ['lathe', m, [0, 0, 1], [[0, 0], [4, 0], [6, 3], [7, 7], [6.4, Math.min(11, top - 1)], [5, top], [0, top]]], ['cyl', 'h', [0, 0, top], 3.2, .4], ['cyl', 'a', [0, 0, top], 2.4, 1.2, { r2: .4 }]];
}, { dmg: 0 });
SH('gd-den', 'Gnasher Den: a mound of earth and bone round a black hole', { d: 'gd-earth', h: 'gd-hole', b: 'bone' }, p => [
  ['rock', 'd', [0, 0, 0], [11, 9, 7][p.dmg], { sz: .62, seed: 3 }], ['cyl', 'h', [0, 4, 0], [4.5, 4, 3.4][p.dmg], [6, 4.5, 3][p.dmg], { sq: .7 }],
  ['box', 'b', [-6, 5, 0], [5, 1.5, 1.5], { rot: 30 }], ['box', 'b', [5, -5, 0], [4, 1.4, 1.4], { rot: -40 }]].slice(0, p.dmg === 2 ? 2 : 4), { dmg: 0 });
SH('gd-hutch', 'Crockery Hutch: a dresser of pots and plates (lobber generator)', { w: 'walnut', o: 'oak', p: 'porcelain', c: 'gd-clay' }, p => {
  const h = [20, 15, 9][p.dmg];
  return [['box', 'w', [0, 0, 0], [16, 8, h]], ['box', 'o', [0, 0, h], [17, 9, 1.2]], ['row', 3, [5, 0, 0], ['cyl', 'p', [0, 4.2, h * .62], 2, .6, { sq: .3 }]], ['row', 2, [7, 0, 0], ['cyl', 'c', [0, 2, h + 1.2], 2.2, 3, { r2: 1.6 }]]];
}, { dmg: 0 });
SH('gd-grate', 'Ember Grate: an iron grate over glowing coals (imp generator)', { i: 'iron', g: 'gd-ember', r: 'rusted' }, p => [
  ['box', p.dmg ? 'r' : 'i', [0, 0, 0], [16, 16, 2]], ['box', 'g', [0, 0, 1.6], [[13, 10, 7][p.dmg], [13, 10, 7][p.dmg], .6]], ['row', 3, [4, 0, 0], ['box', 'i', [0, 0, 2.2], [1.2, 15, .8]]]], { dmg: 0 });
SH('gd-shrine', 'Candle Shrine: a stone altar crowded with candles (fryar generator)', { s: 'stone', w: 'gd-wax', v: 'velvet' }, p => {
  const n = [3, 2, 1][p.dmg], h = [10, 8, 6][p.dmg];
  return [['box', 's', [0, 0, 0], [14, 9, h]], ['box', 'v', [0, 0, h], [14.5, 9.5, .8]], ['row', n, [4, 0, 0], ['cyl', 'w', [0, 0, h + .8], 1.2, 5 - p.dmg]]];
}, { dmg: 0 });
E.SHAPES['gd-shrine'].flames = [[-4, 0, 16, 2, 3], [0, 0, 16, 2, 3], [4, 0, 16, 2, 3]];
SH('gd-sacks', 'Sack Heap: stolen sacks piled high (snatcher generator)', { b: 'burlap', r: 'linen' }, p => [
  ['use', 'sack', [-4, 2, 0], { rot: 20 }], ['use', 'sack', [4, 1, 0], { rot: -30 }], ['use', 'sack', [0, -3, 0], { rot: 70 }], ['use', 'sack', [0, 0, 8], { rot: 10, scale: .8 }]].slice(0, 4 - p.dmg), { dmg: 0 });
SH('gd-tureen', 'Soup Tureen: a great bowl of ghost soup on the table', { p: 'porcelain', s: 'gd-soup', g: 'gold' }, p => [
  ['lathe', 'p', [0, 0, 0], [[0, 0], [3, 0], [6, 2], [7, 5], [6.5, 7], [0, 7]]], ['cyl', 's', [0, 0, 6.8], 5.6, .4], ['cyl', 'g', [0, 0, 7.2], 6.6, .8, { r2: 6.2 }]].slice(0, p.dmg === 2 ? 2 : 3), { dmg: 0 });
SH('gd-pad', 'transporter pad: a ring of glowing runes', { s: 'slate', r: 'gd-rune' }, () => [['cyl', 's', [0, 0, 0], 7, .8], ['cyl', 'r', [0, 0, .8], 5.6, .3], ['cyl', 's', [0, 0, .9], 4.2, .3]]);
SH('gd-plate', 'pressure plate: a worn iron plate in the floor', { i: 'iron' }, () => [['box', 'i', [0, 0, 0], [11, 11, .9]], ['box', 'i', [0, 0, .9], [8, 8, .4]]]);
SH('gd-rune', 'stun rune: a red rune sunk in the floor', { s: 'slate', r: 'gd-redrune' }, () => [['box', 's', [0, 0, 0], [12, 12, .5]], ['box', 'r', [0, 0, .5], [8, 2, .3], { rot: 45 }], ['box', 'r', [0, 0, .5], [8, 2, .3], { rot: -45 }]]);
SH('gd-pylon', 'force-field pylon: a stone post with a glowing cap', { s: 'stone', r: 'gd-rune' }, () => [['box', 's', [0, 0, 0], [5, 5, 14]], ['ball', 'r', [0, 0, 16], 2.4]]);
SH('gd-bell', 'the Dinner Bell: a brass bell on an oak frame', { o: 'oak', b: 'bronze' }, () => [['mirror', 'x', ['box', 'o', [7, 0, 0], [2, 2, 22]]], ['box', 'o', [0, 0, 21], [16, 2, 2]], ['lathe', 'b', [0, 0, 9], [[0, 0], [5, 0], [4, 3], [3, 8], [1.5, 11], [0, 11]]]]);
SH('gd-throne', 'King Famish\'s throne: gold and purple velvet', { g: 'gold', v: 'velvet' }, () => [['box', 'g', [0, 0, 0], [22, 18, 9]], ['box', 'v', [0, 2, 9], [18, 12, 2]], ['box', 'g', [0, -7, 9], [22, 4, 30]], ['box', 'v', [0, -5, 12], [16, 1, 22]], ['mirror', 'x', ['ball', 'g', [10, -7, 40], 2.5]]]);
SH('gd-pillar', 'banquet pillar: marble with a gold band', { m: 'marble', g: 'gold' }, () => [['box', 'm', [0, 0, 0], [12, 12, 3]], ['cyl', 'm', [0, 0, 3], 4.5, 30], ['cyl', 'g', [0, 0, 18], 4.9, 1.5], ['box', 'm', [0, 0, 33], [12, 12, 3]]]);
SH('gd-spikeplate', 'spike trap at rest: a plate full of holes', { i: 'iron', h: 'gd-hole' }, () => [['box', 'i', [0, 0, 0], [14, 14, .8]], ['row', 3, [4, 0, 0], ['row', 3, [0, 4, 0], ['cyl', 'h', [0, 0, .8], .9, .2]]]]);
SH('gd-spikes', 'spike trap raised', { i: 'iron', s: 'steel' }, () => [['box', 'i', [0, 0, 0], [14, 14, .8]], ['row', 3, [4, 0, 0], ['row', 3, [0, 4, 0], ['cyl', 's', [0, 0, .8], 1.3, 9, { r2: 0, seg: 4 }]]]]);
SH('gd-jar', 'a jar of brine with a pickled king inside', { g: 'crystal', b: 'gd-soup', c: 'oak' }, () => [['cyl', 'b', [0, 0, 0], 4.6, 12], ['cyl', 'g', [0, 0, 0], 5, 13], ['cyl', 'c', [0, 0, 13], 5.4, 2]]);
SH('gd-rack', 'smoking rack: poles of hanging hams', { o: 'oak', m: 'gd-clay' }, () => [['mirror', 'x', ['box', 'o', [6, 0, 0], [1.5, 1.5, 18]]], ['box', 'o', [0, 0, 17], [14, 1.5, 1.5]], ['row', 3, [4, 0, 0], ['lathe', 'm', [0, 0, 8], [[0, 0], [2, 1], [2.6, 4], [1.4, 7], [.4, 8.5], [0, 8.5]]]]]);
SH('gd-anvil', 'a soot-black anvil', { i: 'iron' }, () => [['box', 'i', [0, 0, 0], [8, 6, 3]], ['box', 'i', [0, 0, 3], [4, 3, 4]], ['box', 'i', [0, 0, 7], [12, 5, 3]], ['cyl', 'i', [7, 0, 8.5], 1.6, 3, { r2: 0, seg: 6 }]]);
SH('gd-stairsign', 'stair marker: a stone arch over the stairwell', { s: 'stone', g: 'gd-goldrune' }, () => [['mirror', 'x', ['box', 's', [7, 0, 0], [2.5, 3, 18]]], ['box', 's', [0, 0, 17], [17, 3, 3]], ['box', 'g', [0, 1.6, 17.5], [7, .3, 2]]]);
/** a store shape by its short name when the set loaded, else a core stand-in (so the game draws either way) */
const ASH = (id, fallback) => HAS_ASSETS && E.SHAPES['gd:' + id] ? 'gd:' + id : fallback;
