// Authored bodies: humanoids on HERO_RIG's joint layout, plus single-piece monsters and props.
// Plain data: check with `node check.mjs --sheets src/view/models/bodies.js`.
import { model, MODEL_LIBRARY, ModelCatalog } from '../../../pixel-engine.js';

const j = (name, at, kids = []) => ({ group: kids, name, pivot: true, at });
const humanoid = ({ hips, chest, head, upperArm, foreArm, handR = [], handL = [], thigh, shin, foot }) => [
  j('Pelvis', [0, 0.62, 0], [...hips,
    j('Torso', [0, 0.05, 0], [...chest,
      j('Head', [0, 0.5, 0], head),
      j('ArmR', [-0.27, 0.42, 0], [...upperArm, j('ForearmR', [0, -0.25, 0], [...foreArm, j('HandR', [0, -0.16, 0], handR)])]),
      j('ArmL', [0.27, 0.42, 0], [...upperArm, j('ForearmL', [0, -0.25, 0], [...foreArm, j('HandL', [0, -0.16, 0], handL)])]),
    ]),
    j('LegR', [-0.14, 0, 0], [...thigh, j('ShinR', [0, -0.3, 0], [...shin, j('FootR', [0, -0.22, 0], foot)])]),
    j('LegL', [0.14, 0, 0], [...thigh, j('ShinL', [0, -0.3, 0], [...shin, j('FootL', [0, -0.22, 0], foot)])]),
  ]),
];
const B = (w, h, d, y, c, x = 0, z = 0) => ({ box: [w, h, d], at: [x, y, z], c });
const basic = (o = {}) => {
  const { skin = 'skin', cloth = 'cloth', trim = 'trim', legs = 'legs', head = [], chest = [], hips = [], upper = [], fore = [], handR = [], handL = [], bulk = 1, thighW = 0.17, boots = 'boots' } = o;
  return humanoid({
    hips: [B(0.42 * bulk, 0.2, 0.26 * bulk, 0.0, cloth), ...hips],
    chest: [B(0.46 * bulk, 0.5, 0.28 * bulk, 0.25, cloth), B(0.48 * bulk, 0.1, 0.3 * bulk, 0.02, trim), ...chest],
    head: [B(0.26, 0.28, 0.26, 0.14, skin), ...head],
    upperArm: [B(0.13 * bulk, 0.27, 0.13 * bulk, -0.125, cloth), ...upper],
    foreArm: [B(0.12 * bulk, 0.2, 0.12 * bulk, -0.1, skin), ...fore],
    handR, handL,
    thigh: [B(thighW, 0.32, thighW, -0.15, legs)],
    shin: [B(thighW * 0.9, 0.26, thighW * 0.9, -0.13, legs)],
    foot: [B(0.17, 0.1, 0.27, -0.05, boots, 0, 0.05)],
  });
};
const NAMES = new Set(['ink', 'plum', 'red', 'orange', 'sand', 'lime', 'green', 'teal', 'navy', 'blue', 'sky', 'cyan', 'white', 'mist', 'slate', 'night']);
const scan = (parts, pal) => { for (const p of parts) { if (p.c && !(p.c in pal) && NAMES.has(p.c)) pal[p.c] = p.c; if (p.group) scan(p.group, pal); if (p.mirror) scan(p.mirror, pal); } return pal; };
const T = (id, about, tags, palette, parts, extra = {}) => model({ id, about, tags, palette: scan(parts, { ...palette }), parts, ...extra });
const glow = (w, h, d, x, y, z, c = 'eye') => ({ box: [w, h, d], at: [x, y, z], c, glow: true });

export const bellwarden = T('bellwarden', 'The Bellwarden: square shoulders, a cowl and bronze trim', ['character', 'hero'],
  { skin: 'mist', cloth: 'plum', trim: 'orange', legs: 'night', boots: 'ink', cowl: 'plum', iron: 'slate' },
  basic({ bulk: 1.15, head: [B(0.34, 0.2, 0.34, 0.2, 'cowl'), B(0.3, 0.14, 0.05, 0.1, 'ink', 0, 0.14)], upper: [B(0.22, 0.12, 0.2, 0.0, 'iron')], chest: [B(0.52, 0.08, 0.32, 0.5, 'orange')] }));
export const lamplighter = T('lamplighter', 'The Lamplighter: wide-brim hat, long coat and a lamp pole', ['character', 'hero'],
  { skin: 'sand', cloth: 'navy', trim: 'sand', legs: 'night', boots: 'ink', hat: 'ink', lamp: 'sand' },
  basic({ head: [B(0.5, 0.06, 0.5, 0.3, 'hat'), B(0.28, 0.16, 0.28, 0.38, 'hat')], hips: [B(0.46, 0.5, 0.3, -0.25, 'cloth')], chest: [{ box: [0.04, 0.9, 0.04], at: [0.2, 0.2, -0.2], c: 'trim' }, glow(0.14, 0.14, 0.14, 0.2, 0.72, -0.2, 'lamp')] }));
export const sexton = T('sexton', 'The Sexton: stovepipe hat, black frock and a grey face', ['character', 'hero'],
  { skin: 'mist', cloth: 'ink', trim: 'lime', legs: 'night', boots: 'ink', hat: 'ink' },
  basic({ skin: 'skin', head: [B(0.3, 0.3, 0.3, 0.42, 'hat'), B(0.4, 0.04, 0.4, 0.27, 'hat'), B(0.31, 0.05, 0.31, 0.3, 'trim')], hips: [B(0.44, 0.45, 0.28, -0.22, 'cloth')] }));
// NPCs
export const npcCrier = T('npc-crier', "Crier Maudlin: a severed head in a lantern on a post", ['npc'],
  { post: 'slate', glass: 'sand', skin: 'mist', hair: 'navy' },
  [{ cyl: [0.14, 1.4, 0.14], at: [0, 0.7, 0], c: 'post' }, { box: [0.5, 0.06, 0.5], at: [0, 1.43, 0], c: 'post' },
    { box: [0.4, 0.4, 0.4], at: [0, 1.66, 0], c: 'glass', glow: true }, { box: [0.22, 0.22, 0.22], at: [0, 1.62, 0], c: 'skin' }, { box: [0.24, 0.07, 0.24], at: [0, 1.76, 0], c: 'hair' }, { box: [0.5, 0.05, 0.5], at: [0, 1.9, 0], c: 'post' }]);
const npcBody = (id, about, pal, o) => T(id, about, ['character', 'npc'], pal, basic(o));
export const npcBrasse = npcBody('npc-brasse', 'Dame Brasse: wide, in an apron, with a hammer', { skin: 'sand', cloth: 'red', trim: 'orange', legs: 'plum', boots: 'ink', apron: 'sand' }, { bulk: 1.3, chest: [B(0.5, 0.5, 0.05, 0.2, 'apron', 0, 0.16)], head: [B(0.3, 0.1, 0.3, 0.3, 'plum')] });
export const npcOgive = npcBody('npc-ogive', 'Mother Ogive: veiled, in grey', { skin: 'mist', cloth: 'slate', trim: 'white', legs: 'slate', boots: 'ink' }, { head: [B(0.34, 0.34, 0.34, 0.14, 'white'), B(0.4, 0.08, 0.4, 0.32, 'white')], hips: [B(0.5, 0.4, 0.34, -0.2, 'cloth')] });
export const npcPenny = npcBody('npc-penny', 'Pennywhistle: a beak mask and an enormous pack', { skin: 'white', cloth: 'teal', trim: 'sand', legs: 'night', boots: 'ink', pack: 'orange' }, { head: [B(0.1, 0.1, 0.3, 0.1, 'trim', 0, 0.27), B(0.34, 0.12, 0.3, 0.3, 'night')], chest: [B(0.5, 0.5, 0.3, 0.3, 'pack', 0, -0.28)] });
export const npcAmbrose = npcBody('npc-ambrose', 'Bishop Ambrose: a pale mitre and a spade', { skin: 'white', cloth: 'white', trim: 'sand', legs: 'mist', boots: 'ink' }, { head: [B(0.22, 0.34, 0.2, 0.42, 'trim')], hips: [B(0.5, 0.5, 0.32, -0.25, 'cloth')] });
// Monsters
const monsterBody = (id, about, pal, o) => T(id, about, ['character', 'monster'], pal, basic(o));
export const peatwalker = monsterBody('peatwalker', 'Peatwalker: a slumped man of black mud', { skin: 'night', cloth: 'night', trim: 'slate', legs: 'night', boots: 'night', eye: 'lime' }, { bulk: 1.1, head: [glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')], upper: [] });
export const gibbetDrop = monsterBody('gibbet-drop', 'Gibbet Drop: a lean hanged thing in rags', { skin: 'mist', cloth: 'slate', trim: 'red', legs: 'night', boots: 'night', eye: 'red' }, { bulk: 0.9, head: [glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')] });
export const rattlebones = monsterBody('rattlebones', 'Rattlebones: a skeleton with a rusty sword', { skin: 'white', cloth: 'mist', trim: 'white', legs: 'mist', boots: 'mist', eye: 'orange' }, { bulk: 0.75, thighW: 0.1, head: [glow(0.05, 0.06, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.06, 0.03, 0.06, 0.16, 0.14, 'eye')] });
export const pallidBearer = monsterBody('pallid-bearer', 'Pallid Bearer: a pale giant with a coffin on its back', { skin: 'white', cloth: 'slate', trim: 'mist', legs: 'night', boots: 'night', coffin: 'plum', eye: 'cyan' }, { bulk: 1.3, chest: [B(0.4, 0.8, 0.3, 0.45, 'coffin', 0, -0.3)], head: [glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')] });
export const cinderling = monsterBody('cinderling', 'Cinderling: a small imp of embers', { skin: 'red', cloth: 'orange', trim: 'sand', legs: 'red', boots: 'red', eye: 'sand' }, { bulk: 0.9, head: [B(0.06, 0.12, 0.06, 0.34, 'trim', -0.1), B(0.06, 0.12, 0.06, 0.34, 'trim', 0.1), glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')] });
export const titheCollector = monsterBody('tithe-collector', 'Tithe Collector: a clerk in green with a ledger', { skin: 'mist', cloth: 'green', trim: 'sand', legs: 'night', boots: 'ink', book: 'orange', eye: 'sand' }, { head: [B(0.3, 0.08, 0.3, 0.3, 'night'), glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')], handL: [B(0.2, 0.3, 0.06, -0.1, 'book')] });
export const penitent = monsterBody('penitent', 'Penitent: a robed figure with a bowed hood', { skin: 'mist', cloth: 'red', trim: 'night', legs: 'red', boots: 'night', eye: 'white' }, { head: [B(0.34, 0.3, 0.34, 0.2, 'cloth'), glow(0.05, 0.03, 0.03, 0, 0.14, 0.17, 'eye')], hips: [B(0.46, 0.5, 0.3, -0.25, 'cloth')] });
export const shadeAcolyte = monsterBody('shade-acolyte', 'Shade Acolyte: a thin robed necromancer', { skin: 'plum', cloth: 'plum', trim: 'lime', legs: 'night', boots: 'night', eye: 'lime' }, { bulk: 0.85, head: [B(0.32, 0.22, 0.32, 0.22, 'cloth'), glow(0.05, 0.04, 0.03, -0.05, 0.14, 0.14, 'eye'), glow(0.05, 0.04, 0.03, 0.05, 0.14, 0.14, 'eye')], hips: [B(0.44, 0.45, 0.28, -0.22, 'cloth')] });
export const skeletonMinion = monsterBody('skeleton-minion', 'Raised skeleton: bone white with a green glow', { skin: 'white', cloth: 'mist', trim: 'lime', legs: 'mist', boots: 'mist', eye: 'lime' }, { bulk: 0.7, thighW: 0.09, head: [glow(0.05, 0.06, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.06, 0.03, 0.06, 0.16, 0.14, 'eye')] });
export const bursar = monsterBody('bursar', 'The Bursar: a bloated demon accountant in a stolen cope', { skin: 'red', cloth: 'plum', trim: 'sand', legs: 'night', boots: 'ink', belly: 'orange', eye: 'sand', abacus: 'sand' }, { bulk: 1.5, chest: [B(0.7, 0.55, 0.5, 0.15, 'belly', 0, 0.12), B(0.8, 0.1, 0.5, 0.52, 'trim')], head: [B(0.08, 0.2, 0.08, 0.34, 'eye', -0.1), B(0.08, 0.2, 0.08, 0.34, 'eye', 0.1), glow(0.06, 0.05, 0.03, -0.07, 0.16, 0.14, 'eye'), glow(0.06, 0.05, 0.03, 0.07, 0.16, 0.14, 'eye')], handR: [B(0.5, 0.4, 0.06, -0.15, 'abacus')], handL: [B(0.3, 0.4, 0.08, -0.15, 'plum')] });
export const ambrose = monsterBody('ambrose', 'Bishop Ambrose, risen: a mitre, a censer, a spade', { skin: 'white', cloth: 'white', trim: 'sand', legs: 'mist', boots: 'ink', eye: 'red' }, { bulk: 1.2, head: [B(0.24, 0.4, 0.22, 0.44, 'trim'), glow(0.05, 0.05, 0.03, -0.06, 0.16, 0.14, 'eye'), glow(0.05, 0.05, 0.03, 0.06, 0.16, 0.14, 'eye')], hips: [B(0.55, 0.55, 0.36, -0.27, 'cloth')] });
// Non-humanoids: single bodies, hovering or crawling
// a two-bone leg hanging from its hip: Leg{i} (upper, length a) holds Shin{i} (lower, length b); the view bends the knee with twoBoneIK
const leg2 = (i, at, a, b, th, c) => ({ group: [{ box: [th, a, th], at: [0, -a / 2, 0], c }, { group: [{ box: [th * 0.8, b, th * 0.8], at: [0, -b / 2, 0], c }], name: `Shin${i}`, pivot: true, at: [0, -a, 0] }], name: `Leg${i}`, pivot: true, at });
const solid = (id, about, tags, pal, parts, extra) => T(id, about, ['monster', ...tags], pal, parts, extra);
export const choirSkull = solid('choir-skull', 'Choir Skull: a floating skull with a gaping mouth', ['hover'], { bone: 'white', eye: 'cyan', jaw: 'mist' },
  [{ ball: [0.6, 0.55, 0.6], at: [0, 0.8, 0], c: 'bone' }, { box: [0.4, 0.15, 0.4], at: [0, 0.5, 0.05], c: 'jaw' }, glow(0.12, 0.14, 0.05, -0.15, 0.85, 0.28), glow(0.12, 0.14, 0.05, 0.15, 0.85, 0.28)], { floats: true });
export const tombCrawler = solid('tomb-crawler', 'Tomb Crawler: a six-legged bone spider', ['crawl'], { bone: 'mist', dark: 'night', eye: 'lime' },
  [{ box: [0.5, 0.2, 0.4], at: [0, 0.3, 0], c: 'bone' }, { ball: [0.3, 0.2, 0.3], at: [0, 0.34, 0.28], c: 'dark' }, glow(0.06, 0.06, 0.04, -0.07, 0.38, 0.4), glow(0.06, 0.06, 0.04, 0.07, 0.38, 0.4),
    ...[-0.2, 0, 0.2].flatMap((z, k) => [leg2(k * 2, [-0.1, 0.3, z], 0.28, 0.3, 0.07, 'dark'), leg2(k * 2 + 1, [0.1, 0.3, z], 0.28, 0.3, 0.07, 'dark')])], { floats: true });
export const bloatDeacon = solid('bloat-deacon', 'Bloat Deacon: a swollen figure in a green cope', ['blob'], { skin: 'green', cope: 'plum', trim: 'sand', eye: 'sand' },
  [{ ball: [1.3, 1.3, 1.2], at: [0, 0.8, 0], c: 'skin' }, { ball: [0.5, 0.5, 0.5], at: [0, 1.6, 0.1], c: 'skin' }, { box: [1.0, 0.2, 0.9], at: [0, 1.1, 0], c: 'cope' }, glow(0.08, 0.08, 0.05, -0.12, 1.65, 0.34), glow(0.08, 0.08, 0.05, 0.12, 1.65, 0.34)]);
export const clapperjaw = solid('clapperjaw', 'Clapperjaw: a bell with teeth on four legs', ['quad'], { bell: 'orange', dark: 'night', tooth: 'white', eye: 'red' },
  [{ lathe: [[0.2, 0], [0.6, 0.1], [0.7, 0.6], [0.5, 1.0], [0.1, 1.1]], at: [0, 0.5, 0], c: 'bell' }, { box: [0.7, 0.18, 0.2], at: [0, 0.55, 0.62], c: 'dark' }, { box: [0.1, 0.12, 0.05], at: [-0.25, 0.65, 0.7], c: 'tooth' }, { box: [0.1, 0.12, 0.05], at: [0.25, 0.65, 0.7], c: 'tooth' }, glow(0.1, 0.08, 0.05, -0.3, 0.9, 0.52), glow(0.1, 0.08, 0.05, 0.3, 0.9, 0.52),
    ...[[-0.4, 0.4], [0.4, 0.4], [-0.4, -0.4], [0.4, -0.4]].map(([x, z], i) => leg2(i, [x, 0.52, z], 0.26, 0.25, 0.18, 'dark'))]);
export const ashGargoyle = solid('ash-gargoyle', 'Ash Gargoyle: winged stone with ember eyes', ['hover'], { stone: 'slate', dark: 'night', eye: 'orange' },
  [{ box: [0.5, 0.7, 0.35], at: [0, 0.8, 0], c: 'stone' }, { box: [0.34, 0.3, 0.34], at: [0, 1.3, 0.05], c: 'stone' }, glow(0.07, 0.07, 0.04, -0.09, 1.34, 0.24), glow(0.07, 0.07, 0.04, 0.09, 1.34, 0.24),
    { box: [0.9, 0.08, 0.5], at: [-0.7, 1.0, -0.1], rot: [0, 0, 25], c: 'dark' }, { box: [0.9, 0.08, 0.5], at: [0.7, 1.0, -0.1], rot: [0, 0, -25], c: 'dark' }], { floats: true });
export const collectionPlate = solid('collection-plate', 'The Collection Plate: an offering dish on little legs', ['quad'], { gold: 'sand', rim: 'orange', coin: 'white', leg: 'night', eye: 'red' },
  [{ lathe: [[0.05, 0], [0.5, 0.05], [0.55, 0.2], [0.4, 0.16]], at: [0, 0.25, 0], c: 'gold' }, { cyl: [0.3, 0.05, 0.3], at: [0, 0.38, 0], c: 'coin' }, glow(0.06, 0.06, 0.04, -0.12, 0.42, 0.3), glow(0.06, 0.06, 0.04, 0.12, 0.42, 0.3),
    ...[[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]].map(([x, z], i) => leg2(i, [x, 0.27, z], 0.13, 0.14, 0.1, 'leg'))]);
export const crawlerNest = solid('crawler-nest', 'Crawler Nest: a heap of bone and webbing', ['static'], { bone: 'mist', dark: 'night', egg: 'lime' },
  [{ lump: [1.3, 0.8, 1.3], at: [0, 0.4, 0], c: 'bone' }, { ball: [0.4, 0.4, 0.4], at: [0.2, 0.9, 0.1], c: 'egg', glow: true }, { box: [0.2, 0.7, 0.2], at: [-0.4, 0.5, -0.2], rot: [10, 0, 20], c: 'dark' }]);
export const unrungFont = solid('unrung-font', 'Unrung Font: a stone font brimming with black fire', ['static'], { stone: 'slate', dark: 'night', fire: 'orange' },
  [{ lathe: [[0.4, 0], [0.55, 0.1], [0.3, 0.7], [0.65, 1.0], [0.55, 1.1]], at: [0, 0, 0], c: 'stone' }, { cyl: [0.9, 0.1, 0.9], at: [0, 1.0, 0], c: 'fire', glow: true }]);
export const malison = solid('malison', 'Malison, the Unrung Saint: a huge entombed saint wrapped in bell ropes', ['boss'], { stone: 'mist', rope: 'sand', dark: 'night', crack: 'cyan', eye: 'white' },
  [{ box: [1.6, 2.2, 1.0], at: [0, 3.0, 0], c: 'stone' }, { box: [1.0, 1.0, 0.9], at: [0, 4.6, 0], c: 'stone' }, glow(0.18, 0.1, 0.05, -0.25, 4.7, 0.46, 'eye'), glow(0.18, 0.1, 0.05, 0.25, 4.7, 0.46, 'eye'), { box: [0.7, 1.5, 0.3], at: [0, 3.6, 0.52], c: 'crack', glow: true },
    ...[[-0.9, 3.8], [0.9, 3.8], [-0.9, 2.6], [0.9, 2.6]].map(([x, y], i) => ({ group: [{ tube: [[0, 0, 0], [0, -1.4, 0]], r: 0.3, c: 'rope' }, { group: [{ tube: [[0, 0, 0], [0, -1.6, 0]], r: 0.26, c: 'rope' }], name: `Fore${i}`, pivot: true, at: [0, -1.4, 0] }], name: `Arm${i}`, pivot: true, at: [x, y, 0] })),
    { box: [1.8, 1.8, 1.1], at: [0, 1.0, 0], c: 'dark' }], { floats: true });
export const oldClemency = solid('old-clemency', 'Old Clemency: the great cracked bell', ['prop'], { bronze: 'orange', dark: 'night', crack: 'ink' },
  [{ lathe: [[0.5, 0], [2.6, 0], [2.4, 1.2], [1.8, 3.2], [1.0, 4.3], [0.4, 5]], at: [0, 0, 0], c: 'bronze' }, { box: [0.15, 3.0, 0.15], at: [0.9, 1.8, 2.0], rot: [0, 0, 8], c: 'crack' }, { cyl: [0.5, 0.5, 0.5], at: [0, 0.2, 0], c: 'dark' }], { floats: true });
// Props the library lacks
export const lychgate = T('lychgate', 'A roofed graveyard gate, wood and stone', ['prop', 'gate'], { wood: 'red', stone: 'mist', roof: 'night' },
  [{ box: [0.3, 2.2, 0.3], at: [-1.1, 1.1, 0], c: 'wood' }, { box: [0.3, 2.2, 0.3], at: [1.1, 1.1, 0], c: 'wood' }, { box: [2.9, 0.2, 1.2], at: [0, 2.3, 0], c: 'roof' }, { wedge: [3.0, 0.5, 1.5], at: [0, 2.6, 0], c: 'roof' }, { box: [2.4, 0.1, 1.0], at: [0, 0.05, 0], c: 'stone' }]);
export const knellFont = T('knell-font', 'The Knell Font: a bronze bowl of cold fire', ['prop', 'font'], { bronze: 'orange', stone: 'slate', fire: 'cyan' },
  [{ cyl: [0.9, 0.3, 0.9], at: [0, 0.15, 0], c: 'stone' }, { lathe: [[0.15, 0], [0.5, 0.1], [0.7, 0.7], [0.6, 0.8]], at: [0, 0.3, 0], c: 'bronze' }, { cyl: [0.8, 0.06, 0.8], at: [0, 1.0, 0], c: 'fire', glow: true }], { light: { at: [0, 1.3, 0], c: 'fire', intensity: 6, radius: 6 } });
export const votiveRack = T('votive-rack', 'A rack of votive candles', ['prop'], { wood: 'red', wax: 'white', flame: 'sand' },
  [{ box: [1.2, 0.6, 0.5], at: [0, 0.3, 0], c: 'wood' }, ...[-0.4, -0.2, 0, 0.2, 0.4].flatMap((x, i) => [{ cyl: [0.1, 0.25 + (i % 2) * 0.1, 0.1], at: [x, 0.75, 0], c: 'wax' }, glow(0.06, 0.1, 0.06, x, 0.95 + (i % 2) * 0.1, 0, 'flame')])], { light: { at: [0, 1.1, 0], c: 'flame', intensity: 5, radius: 5, flicker: 'torch' } });
export const offeringBox = T('collection-box', 'The Collection Box: a stash chest with a slot', ['prop'], { wood: 'orange', band: 'night', gold: 'sand' },
  [{ box: [1.0, 0.7, 0.7], at: [0, 0.35, 0], c: 'wood' }, { box: [1.05, 0.12, 0.75], at: [0, 0.76, 0], c: 'band' }, { box: [0.3, 0.05, 0.05], at: [0, 0.8, 0.28], c: 'gold', glow: true }]);
export const bellRope = T('bell-rope', 'A thick bell rope hanging from the dark', ['prop'], { rope: 'sand', knob: 'orange' },
  [{ tube: [[0, 5, 0], [0.1, 3, 0.1], [0, 1.4, 0]], r: 0.1, c: 'rope' }, { ball: [0.35, 0.4, 0.35], at: [0, 1.3, 0], c: 'knob' }]);
export const ledger = T('ledger', 'A ledger on a stand', ['prop'], { book: 'red', page: 'white', stand: 'night' },
  [{ box: [0.1, 0.9, 0.1], at: [0, 0.45, 0], c: 'stand' }, { box: [0.6, 0.08, 0.45], at: [0, 0.95, 0], rot: [-25, 0, 0], c: 'book' }, { box: [0.5, 0.06, 0.38], at: [0, 1.0, 0], rot: [-25, 0, 0], c: 'page' }]);
export const gibbet = T('gibbet', 'A gibbet with a cage', ['prop'], { wood: 'red', iron: 'night' },
  [{ box: [0.2, 3.0, 0.2], at: [0, 1.5, 0], c: 'wood' }, { box: [1.2, 0.18, 0.18], at: [0.5, 2.9, 0], c: 'wood' }, { box: [0.5, 0.7, 0.5], at: [1.0, 2.3, 0], c: 'iron' }]);
export const marker = T('marker', 'A flat ring marker for selection and seats', ['prop'], { c: 'white' }, [{ cyl: [1.0, 0.04, 1.0], at: [0, 0.02, 0], c: 'c', glow: true }]);

export const ALL_DEFS = [bellwarden, lamplighter, sexton, npcCrier, npcBrasse, npcOgive, npcPenny, npcAmbrose, peatwalker, gibbetDrop, rattlebones, pallidBearer, cinderling, titheCollector, penitent, shadeAcolyte, skeletonMinion, bursar, ambrose,
  choirSkull, tombCrawler, bloatDeacon, clapperjaw, ashGargoyle, collectionPlate, crawlerNest, unrungFont, malison, oldClemency, lychgate, knellFont, votiveRack, offeringBox, bellRope, ledger, gibbet, marker];
export const CATALOG = new ModelCatalog([...MODEL_LIBRARY.all(), ...ALL_DEFS]);
export const HUMANOIDS = new Set(['bellwarden', 'lamplighter', 'sexton', 'npc-brasse', 'npc-ogive', 'npc-penny', 'npc-ambrose', 'peatwalker', 'gibbet-drop', 'rattlebones', 'pallid-bearer', 'cinderling', 'tithe-collector', 'penitent', 'shade-acolyte', 'skeleton-minion', 'bursar', 'ambrose']);
