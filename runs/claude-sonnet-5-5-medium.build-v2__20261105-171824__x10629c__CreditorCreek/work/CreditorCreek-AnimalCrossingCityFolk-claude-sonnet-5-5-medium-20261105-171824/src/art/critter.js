// Critter generator: every neighbour, host, crowd member and the player come from one function.
import { THREE, toonMaterial, PALETTE, setLookLayer, buildModel } from '../engine.js';
const { Group, Mesh, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry } = THREE;
export const RIG = { joints: ['Pelvis', 'Torso', 'Head', 'ArmR', 'ArmL', 'LegR', 'LegL'], root: 'Pelvis', mirror: { ArmR: 'ArmL', ArmL: 'ArmR', LegR: 'LegL', LegL: 'LegR' }, soles: [], trace: [], limits: {}, fps: 30 };
const GEO = { box: new BoxGeometry(1, 1, 1), ball: new SphereGeometry(0.5, 9, 7), cyl: new CylinderGeometry(0.5, 0.5, 1, 8), cone: new ConeGeometry(0.5, 1, 8) };
const mat = (c) => toonMaterial(typeof c === 'number' ? c : PALETTE[c] ?? PALETTE.sand);
/** Species: parts are [shape, [w,h,d], [x,y,z], color, joint?, [rx,ry,rz]?]. Colours: c main, a accent, b belly, k ink, w white or any palette name. */
const EYES = [['box', [0.1, 0.15, 0.05], [-0.17, 0.42, 0.37], 'k'], ['box', [0.1, 0.15, 0.05], [0.17, 0.42, 0.37], 'k']];
const SPECIES = {
  wombat: { scale: 1.15, head: [1.0, 0.7, 0.85], body: [1.0, 0.6, 0.7], parts: [['ball', [0.2, 0.15, 0.12], [0, 0.3, 0.4], 'k'], ['ball', [0.17, 0.17, 0.1], [-0.33, 0.7, 0.1], 'c'], ['ball', [0.17, 0.17, 0.1], [0.33, 0.7, 0.1], 'c'], ['ball', [0.5, 0.35, 0.1], [0, 0.0, 0.2], 'b', 'Torso']] },
  quokka: { scale: 0.88, head: [0.85, 0.8, 0.8], parts: [['ball', [0.16, 0.16, 0.1], [-0.3, 0.72, 0], 'c'], ['ball', [0.16, 0.16, 0.1], [0.3, 0.72, 0], 'c'], ['ball', [0.16, 0.12, 0.1], [0, 0.3, 0.4], 'k'], ['box', [0.3, 0.05, 0.05], [0, 0.18, 0.4], 'k'], ['ball', [0.12, 0.08, 0.05], [-0.28, 0.28, 0.37], 'red'], ['ball', [0.12, 0.08, 0.05], [0.28, 0.28, 0.37], 'red'], ['ball', [0.25, 0.25, 0.25], [0, 0.35, -0.5], 'c', 'Pelvis']] },
  moose: { head: [0.8, 0.8, 0.85], body: [0.8, 0.65, 0.6], parts: [['box', [0.4, 0.3, 0.45], [0, 0.2, 0.5], 'c'], ['ball', [0.12, 0.1, 0.06], [-0.1, 0.2, 0.74], 'k'], ['ball', [0.12, 0.1, 0.06], [0.1, 0.2, 0.74], 'k'], ['box', [0.12, 0.5, 0.1], [-0.35, 0.85, 0], 'a', 'Head', [0, 0, -25]], ['box', [0.12, 0.5, 0.1], [0.35, 0.85, 0], 'a', 'Head', [0, 0, 25]], ['box', [0.3, 0.1, 0.1], [-0.55, 1.05, 0], 'a'], ['box', [0.3, 0.1, 0.1], [0.55, 1.05, 0], 'a'], ['box', [0.35, 0.28, 0.05], [-0.55, 1.02, 0.08], 'white'], ['box', [0.2, 0.22, 0.05], [0.58, 1.0, 0.08], 'sky']] },
  platypus: { head: [0.85, 0.7, 0.8], parts: [['box', [0.55, 0.1, 0.5], [0, 0.22, 0.58], 'orange'], ['ball', [0.16, 0.16, 0.1], [-0.3, 0.68, 0], 'c'], ['ball', [0.16, 0.16, 0.1], [0.3, 0.68, 0], 'c'], ['box', [0.35, 0.12, 0.1], [0, 0.78, 0.1], 'sand'], ['box', [0.6, 0.08, 0.5], [0, 0.0, -0.6], 'orange', 'Pelvis']] },
  armadillo: { head: [0.8, 0.7, 0.8], body: [0.8, 0.6, 0.65], parts: [['cone', [0.4, 0.45, 0.4], [0, 0.25, 0.5], 'c', 'Head', [90, 0, 0]], ['ball', [0.18, 0.2, 0.1], [-0.3, 0.72, 0], 'c'], ['ball', [0.18, 0.2, 0.1], [0.3, 0.72, 0], 'c'], ['box', [0.85, 0.12, 0.7], [0, 0.15, -0.05], 'a', 'Torso'], ['box', [0.85, 0.12, 0.7], [0, 0.32, -0.05], 'mist', 'Torso'], ['box', [0.85, 0.12, 0.7], [0, 0.48, -0.05], 'a', 'Torso'], ['box', [0.6, 0.08, 0.1], [0, 0.55, 0.4], 'red', 'Head']] },
  lemur: { head: [0.8, 0.75, 0.8], parts: [['ball', [0.2, 0.2, 0.1], [0, 0.28, 0.4], 'k'], ['ball', [0.25, 0.3, 0.1], [-0.17, 0.42, 0.34], 'white'], ['ball', [0.25, 0.3, 0.1], [0.17, 0.42, 0.34], 'white'], ['ball', [0.2, 0.2, 0.1], [-0.3, 0.74, 0], 'k'], ['ball', [0.2, 0.2, 0.1], [0.3, 0.74, 0], 'k'], ...Array.from({ length: 6 }, (_, i) => ['cyl', [0.16, 0.14, 0.16], [0, 0.1 + i * 0.12, -0.45 - i * 0.07], i % 2 ? 'k' : 'white', 'Pelvis', [60, 0, 0]])], tail: true },
  possum: { head: [0.8, 0.75, 0.82], parts: [['cone', [0.35, 0.5, 0.35], [0, 0.22, 0.5], 'white', 'Head', [90, 0, 0]], ['ball', [0.12, 0.1, 0.1], [0, 0.22, 0.75], 'k'], ['ball', [0.28, 0.32, 0.1], [-0.3, 0.76, 0], 'a'], ['ball', [0.28, 0.32, 0.1], [0.3, 0.76, 0], 'a'], ['cyl', [0.1, 0.6, 0.1], [0, 0.1, -0.5], 'a', 'Pelvis', [70, 0, 0]]] },
  yak: { head: [0.9, 0.85, 0.9], body: [0.95, 0.75, 0.75], parts: [['box', [1.0, 0.7, 0.1], [0, 0.2, 0.46], 'c'], ['box', [0.95, 0.9, 0.5], [0, 0.35, -0.3], 'c'], ['box', [0.25, 0.1, 0.1], [-0.5, 0.7, 0], 'sand', 'Head', [0, 0, 30]], ['box', [0.25, 0.1, 0.1], [0.5, 0.7, 0], 'sand', 'Head', [0, 0, -30]], ['box', [0.35, 0.2, 0.05], [0, 0.18, 0.5], 'k'], ['box', [1.05, 0.35, 0.8], [0, 0.0, 0.0], 'a', 'Torso']] },
  ferret: { head: [0.75, 0.68, 0.8], body: [0.65, 0.65, 0.5], parts: [['ball', [0.1, 0.1, 0.1], [0, 0.28, 0.4], 'k'], ['ball', [0.15, 0.15, 0.1], [-0.28, 0.68, 0], 'c'], ['ball', [0.15, 0.15, 0.1], [0.28, 0.68, 0], 'c'], ['box', [0.78, 0.2, 0.12], [0, 0.46, 0.34], 'k'], ['box', [0.7, 0.18, 0.2], [0, 0.4, 0.3], 'a'], ['cyl', [0.12, 0.7, 0.12], [0, 0.15, -0.5], 'a', 'Pelvis', [75, 0, 0]]] },
  goose: { head: [0.62, 0.6, 0.62], body: [0.75, 0.6, 0.6], parts: [['cyl', [0.18, 0.55, 0.18], [0, 0.75, -0.02], 'white'], ['cone', [0.2, 0.34, 0.16], [0, 0.34, 0.48], 'orange', 'Head', [90, 0, 0]], ['box', [0.5, 0.12, 0.05], [0, 0.45, 0.38], 'sand'], ['box', [0.5, 0.35, 0.65], [0, 0.0, 0.0], 'red', 'Torso'], ['box', [0.25, 0.3, 0.05], [0, 0.0, 0.32], 'white', 'Torso'], ['box', [0.75, 0.2, 0.4], [0, 0.3, -0.5], 'white', 'Pelvis']] },
  capybara: { head: [0.9, 0.78, 0.85], body: [0.9, 0.6, 0.62], parts: [['box', [0.4, 0.25, 0.3], [0, 0.25, 0.45], 'a'], ['ball', [0.15, 0.15, 0.1], [-0.35, 0.72, 0], 'c'], ['ball', [0.15, 0.15, 0.1], [0.35, 0.72, 0], 'c'], ['ball', [0.2, 0.15, 0.2], [0.1, 0.78, 0.05], 'sand'], ['box', [0.2, 0.04, 0.2], [0.1, 0.8, 0.05], 'ink']] },
  snail: { head: [0.7, 0.7, 0.7], body: [0.8, 0.5, 0.7], parts: [['cyl', [0.06, 0.3, 0.06], [-0.15, 0.78, 0.2], 'c'], ['cyl', [0.06, 0.3, 0.06], [0.15, 0.78, 0.2], 'c'], ['ball', [0.9, 0.8, 0.5], [0, 0.4, -0.4], 'a', 'Torso'], ['torusish', [0.6, 0.55, 0.52], [0, 0.4, -0.4], 'c', 'Torso'], ['box', [0.9, 0.12, 0.7], [0, 0.35, 0.02], 'red', 'Torso', [0, 0, -30]]], noLegs: true },
  pangolin: { head: [0.75, 0.7, 0.8], body: [0.8, 0.65, 0.65], parts: [['cone', [0.3, 0.55, 0.3], [0, 0.25, 0.55], 'c', 'Head', [90, 0, 0]], ...[0.1, 0.25, 0.4, 0.55].map((y, i) => ['box', [0.9 - i * 0.05, 0.1, 0.72], [0, y, -0.02], i % 2 ? 'a' : 'sand', 'Torso']), ['ball', [0.17, 0.17, 0.1], [-0.3, 0.7, 0], 'c'], ['ball', [0.17, 0.17, 0.1], [0.3, 0.7, 0], 'c'], ['box', [0.4, 0.06, 0.1], [0, 0.42, 0.4], 'night']] },
  moth: { head: [0.7, 0.65, 0.7], body: [0.6, 0.65, 0.5], parts: [['cyl', [0.04, 0.5, 0.04], [-0.15, 0.85, 0.1], 'k', 'Head', [0, 0, 20]], ['cyl', [0.04, 0.5, 0.04], [0.15, 0.85, 0.1], 'k', 'Head', [0, 0, -20]], ['box', [0.9, 0.9, 0.06], [-0.6, 0.35, -0.3], 'a', 'Torso', [0, 25, 0]], ['box', [0.9, 0.9, 0.06], [0.6, 0.35, -0.3], 'a', 'Torso', [0, -25, 0]], ['ball', [0.14, 0.14, 0.1], [-0.18, 0.4, 0.34], 'sky'], ['ball', [0.14, 0.14, 0.1], [0.18, 0.4, 0.34], 'sky']] },
  llama: { head: [0.7, 0.75, 0.7], body: [0.85, 0.65, 0.65], parts: [['cyl', [0.3, 0.6, 0.3], [0, 0.7, -0.05], 'c'], ['box', [0.35, 0.3, 0.4], [0, 0.18, 0.4], 'c'], ['box', [0.15, 0.5, 0.1], [-0.2, 0.9, 0], 'c'], ['box', [0.15, 0.5, 0.1], [0.2, 0.9, 0], 'c'], ['ball', [0.8, 0.5, 0.8], [0, 0.25, 0], 'white', 'Torso'], ['box', [0.7, 0.12, 0.05], [0, 0.0, 0.34], 'a', 'Head']] },
  bat: { head: [0.75, 0.7, 0.75], body: [0.7, 0.6, 0.55], parts: [['box', [0.18, 0.6, 0.05], [-0.3, 0.9, 0], 'a', 'Head', [0, 0, 12]], ['box', [0.18, 0.6, 0.05], [0.3, 0.9, 0], 'a', 'Head', [0, 0, -12]], ['box', [0.7, 0.8, 0.05], [-0.55, 0.3, -0.3], 'c', 'Torso', [0, 20, 0]], ['box', [0.7, 0.8, 0.05], [0.55, 0.3, -0.3], 'c', 'Torso', [0, -20, 0]], ['box', [0.25, 0.1, 0.1], [0, 0.18, 0.4], 'k'], ['box', [0.5, 0.35, 0.15], [0, 0.0, 0.3], 'sand', 'Torso']] },
  stoat: { scale: 1.1, head: [0.72, 0.68, 0.8], body: [0.65, 0.65, 0.5], parts: [['ball', [0.5, 0.4, 0.12], [0, 0.05, 0.28], 'white', 'Torso'], ['ball', [0.15, 0.1, 0.1], [-0.28, 0.82, 0], 'k'], ['ball', [0.15, 0.1, 0.1], [0.28, 0.82, 0], 'k'], ['ball', [0.1, 0.1, 0.1], [0, 0.28, 0.42], 'k'], ['ball', [0.15, 0.15, 0.1], [-0.28, 0.68, 0], 'c'], ['ball', [0.15, 0.15, 0.1], [0.28, 0.68, 0], 'c'], ['cyl', [0.12, 0.7, 0.12], [0, 0.15, -0.5], 'c', 'Pelvis', [75, 0, 0]], ['ball', [0.14, 0.16, 0.14], [0, 0.0, -0.9], 'k', 'Pelvis'], ['box', [0.9, 0.12, 0.2], [0, 0.0, 0.0], 'ink', 'Head', [0, 0, 0]]] },
  alpaca: { head: [0.7, 0.75, 0.7], body: [0.8, 0.65, 0.6], parts: [['ball', [1.1, 0.85, 0.95], [0, 0.78, 0], 'a'], ['ball', [0.5, 0.35, 0.3], [0, 0.22, 0.4], 'c'], ['box', [0.14, 0.4, 0.1], [-0.25, 0.8, 0.0], 'c'], ['box', [0.14, 0.4, 0.1], [0.25, 0.8, 0.0], 'c']] },
  flamingo: { head: [0.65, 0.62, 0.65], body: [0.7, 0.6, 0.55], legLen: 1.7, parts: [['cyl', [0.14, 0.7, 0.14], [0, 0.8, -0.05], 'c'], ['cone', [0.2, 0.3, 0.16], [0, 0.3, 0.42], 'ink', 'Head', [90, 0, 0]], ['box', [0.4, 0.14, 0.3], [0, 0.34, 0.3], 'white'], ['box', [0.7, 0.4, 0.7], [0, 0.0, -0.35], 'c', 'Pelvis']] },
  magpie: { head: [0.68, 0.64, 0.68], body: [0.65, 0.6, 0.55], parts: [['cone', [0.2, 0.36, 0.16], [0, 0.28, 0.46], 'k', 'Head', [90, 0, 0]], ['box', [0.7, 0.36, 0.1], [0, 0.0, 0.3], 'white', 'Torso'], ['box', [0.2, 0.2, 0.9], [0, 0.1, -0.5], 'sky', 'Pelvis'], ['ball', [0.5, 0.4, 0.5], [0, 0.2, 0.0], 'white', 'Head']] },
  hippo: { head: [1.0, 0.8, 0.95], body: [1.0, 0.7, 0.75], parts: [['box', [0.8, 0.4, 0.4], [0, 0.18, 0.55], 'a'], ['ball', [0.1, 0.1, 0.1], [-0.2, 0.28, 0.76], 'k'], ['ball', [0.1, 0.1, 0.1], [0.2, 0.28, 0.76], 'k'], ['ball', [0.15, 0.15, 0.1], [-0.35, 0.78, 0], 'c'], ['ball', [0.15, 0.15, 0.1], [0.35, 0.78, 0], 'c'], ['box', [0.9, 0.25, 0.7], [0, 0.0, 0.0], 'red', 'Torso']] },
  dormouse: { head: [0.75, 0.7, 0.75], body: [0.55, 0.5, 0.45], scale: 0.78, parts: [['ball', [0.38, 0.45, 0.1], [-0.33, 0.7, 0], 'a'], ['ball', [0.38, 0.45, 0.1], [0.33, 0.7, 0], 'a'], ['ball', [0.1, 0.1, 0.1], [0, 0.3, 0.4], 'k'], ['cyl', [0.06, 0.6, 0.06], [0, 0.1, -0.5], 'a', 'Pelvis', [70, 0, 0]]] },
  badger: { head: [0.85, 0.7, 0.85], body: [0.85, 0.6, 0.62], parts: [['box', [0.2, 0.7, 0.05], [0, 0.4, 0.4], 'white', 'Head'], ['ball', [0.15, 0.15, 0.1], [-0.33, 0.7, 0], 'c'], ['ball', [0.15, 0.15, 0.1], [0.33, 0.7, 0], 'c'], ['ball', [0.12, 0.1, 0.1], [0, 0.3, 0.43], 'k'], ['box', [0.5, 0.3, 0.1], [0, 0.0, 0.31], 'white', 'Torso']] },
  sloth: { head: [0.85, 0.72, 0.8], body: [0.75, 0.65, 0.6], longArms: true, parts: [['box', [0.9, 0.2, 0.05], [0, 0.4, 0.38], 'a'], ['ball', [0.12, 0.1, 0.1], [0, 0.28, 0.4], 'k'], ['box', [0.4, 0.05, 0.05], [0, 0.15, 0.4], 'k']] },
  goat: { head: [0.75, 0.75, 0.75], body: [0.7, 0.62, 0.55], parts: [['box', [0.12, 0.4, 0.12], [-0.22, 0.85, 0], 'sand', 'Head', [-20, 0, -15]], ['box', [0.12, 0.4, 0.12], [0.22, 0.85, 0], 'sand', 'Head', [-20, 0, 15]], ['box', [0.18, 0.3, 0.1], [0, 0.02, 0.38], 'white'], ['box', [0.4, 0.3, 0.3], [0, 0.18, 0.42], 'c'], ['box', [0.3, 0.3, 0.05], [0, 0.0, 0.35], 'plum', 'Torso']] },
  hermit: { head: [0.7, 0.6, 0.7], body: [0.6, 0.5, 0.5], parts: [['box', [0.7, 0.9, 0.7], [0, 0.4, -0.45], 'slate', 'Torso'], ['box', [0.55, 0.2, 0.05], [0, 0.55, -0.1], 'mist', 'Torso'], ['box', [0.55, 0.2, 0.05], [0, 0.3, -0.1], 'mist', 'Torso'], ['cyl', [0.06, 0.35, 0.06], [-0.2, 0.7, 0.2], 'c'], ['cyl', [0.06, 0.35, 0.06], [0.2, 0.7, 0.2], 'c'], ['ball', [0.25, 0.22, 0.12], [-0.5, 0.2, 0.15], 'a', 'Torso']] },
  person: { head: [0.85, 0.82, 0.82], body: [0.7, 0.6, 0.55], parts: [] },
};
const FACE_SKIP = new Set(['person']);
function addPart(joints, cols, spec) {
  let [shape, size, pos, col, joint = 'Head', rot] = spec;
  if (shape === 'torusish') shape = 'ball';
  const g = new Mesh(GEO[shape], mat(cols[col] ?? col));
  g.scale.set(...size); g.position.set(...pos); if (rot) g.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  (joints[joint] ?? joints.Head).add(g); return g;
}
/** Build a critter. spec: { species, c, a, outfit, hair, hat, scale }. Returns { object, joints, parts, height }. */
let defCount = 0;
const KIND = { ball: 'ball', box: 'box', cyl: 'cyl', cone: 'cone', torusish: 'ball' };
/** Build a critter as a ModelDef (pivot groups for the seven joints) and let the engine's buildModel make it. */
export function critterDef(spec) {
  const sp = SPECIES[spec.species] ?? SPECIES.person; const c = spec.c ?? 'sand', a = spec.a ?? 'orange';
  const cols = { c, a, b: c === 'white' ? 'mist' : 'white', k: 'ink', w: 'white' }; const col = (k) => cols[k] ?? k; const used = new Set();
  const P = (shape, size, at, k, rot) => { const cc = col(k); used.add(cc); const o = { [KIND[shape] ?? shape]: size, at, c: cc }; if (rot) o.rot = rot; return o; };
  const legLen = (sp.legLen ?? 1) * 0.5; const bodyW = sp.body?.[0] ?? 0.7, bodyH = sp.body?.[1] ?? 0.6, bodyD = sp.body?.[2] ?? 0.55;
  const outfitCol = spec.outfit ?? (spec.species === 'person' ? 'red' : c); const skin = spec.skin ?? c; const armLen = sp.longArms ? 0.62 : 0.4;
  const J = { Pelvis: [], Torso: [], Head: [], ArmR: [], ArmL: [], LegR: [], LegL: [] };
  const limb = (list, w, len, k, foot) => { list.push(P('cyl', [w, len, w], [0, -len / 2, 0], k)); if (foot) list.push(P('box', [w * 1.15, 0.1, w * 1.7], [0, -len + 0.04, w * 0.35], foot)); };
  if (!sp.noLegs) { limb(J.LegR, 0.2, legLen, spec.pants ?? c, spec.shoes ?? a); limb(J.LegL, 0.2, legLen, spec.pants ?? c, spec.shoes ?? a); } else { J.LegR.push(P('box', [0.02, 0.02, 0.02], [0, 0, 0], c)); J.LegL.push(P('box', [0.02, 0.02, 0.02], [0, 0, 0], c)); }
  limb(J.ArmR, 0.17, armLen, outfitCol); limb(J.ArmL, 0.17, armLen, outfitCol); J.ArmR.push(P('ball', [0.2, 0.2, 0.2], [0, -armLen, 0], skin)); J.ArmL.push(P('ball', [0.2, 0.2, 0.2], [0, -armLen, 0], skin));
  J.Head.push(P('ball', sp.head, [0, sp.head[1] * 0.46, 0], skin));
  const ey = sp.head[1] * 0.58, ez = sp.head[2] * 0.46;
  for (const s2 of sp.parts) { const jn = s2[4] ?? 'Head'; (J[jn] ?? J.Head).push(P(s2[0], s2[1], s2[2], s2[3], s2[5])); }
  if (spec.species === 'person') {
    const hc = spec.hair ?? 'plum', style = spec.hairStyle ?? 0; J.Head.push(P('ball', [0.95, 0.55 + (style % 3) * 0.1, 0.9], [0, 0.66, -0.04], hc)); if (style % 2) J.Head.push(P('ball', [0.3, 0.5, 0.3], [0, 0.35, -0.45], hc)); if (style >= 4) J.Head.push(P('ball', [0.3, 0.3, 0.3], [0, 0.98, -0.1], hc));
  }
  if (spec.hat) { J.Head.push(P('cyl', [0.7, 0.22, 0.7], [0, sp.head[1] * 0.95, 0], spec.hat), P('cyl', [0.42, 0.3, 0.42], [0, sp.head[1] * 0.95 + 0.2, 0], spec.hat)); }
  if (spec.glasses) J.Head.push(P('box', [0.55, 0.08, 0.04], [0, sp.head[1] * 0.58, sp.head[2] * 0.5], spec.glasses));
  const piv = (name, at, parts) => ({ group: parts, at, pivot: true, name });
  const eye = (name, x) => piv(name, [x * sp.head[0] / 0.85, ey, ez], [P('box', [0.1, 0.15, 0.05], [0, 0, 0], 'k')]);
  const headG = piv('Head', [0, bodyH * 0.9, 0], [...J.Head, eye('EyeL', 0.17), eye('EyeR', -0.17), piv('Mouth', [0, sp.head[1] * 0.28, ez + 0.02], [P('box', [0.14, 0.04, 0.05], [0, 0, 0], 'k')])]);
  const armX = bodyW * 0.5 + 0.06, armY = bodyH * 0.8;
  const torsoG = piv('Torso', [0, 0, 0], [piv('ShirtBody', [0, bodyH * 0.5, 0], [P('ball', [bodyW, bodyH * 1.15, bodyD], [0, 0, 0], outfitCol)]), ...J.Torso, headG, piv('ArmR', [-armX, armY, 0], J.ArmR), piv('ArmL', [armX, armY, 0], J.ArmL)]);
  const tailG = J.Pelvis.length ? [piv('Tail', [0, 0, 0], J.Pelvis)] : []; const pelvis = piv('Pelvis', [0, legLen, 0], [piv('LegR', [-0.17, 0, 0], J.LegR), piv('LegL', [0.17, 0, 0], J.LegL), torsoG, ...tailG]);
  used.add(outfitCol); used.add(skin); used.add('ink'); const palette = {}; for (const u of used) palette[u] = u;
  return { def: { id: 'critter-' + (defCount++), about: 'Generated critter ' + spec.species, tags: ['critter', spec.species], palette, parts: [pelvis] }, legLen, bodyH, sp };
}
export function buildCritter(spec) {
  const { def, legLen, bodyH, sp } = critterDef(spec); const built = buildModel(def); const root = built.object; root.name = 'Critter';
  const joints = {}; for (const n of ['Pelvis', 'Torso', 'Head', 'ArmR', 'ArmL', 'LegR', 'LegL']) joints[n] = root.getObjectByName(n);
  const parts = { eyeL: root.getObjectByName('EyeL'), eyeR: root.getObjectByName('EyeR'), mouth: root.getObjectByName('Mouth'), shirt: root.getObjectByName('ShirtBody'), tail: root.getObjectByName('Tail') };
  const s = (spec.scale ?? 1) * (sp.scale ?? 1) * 0.85; root.scale.setScalar(s);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  setLookLayer(root, 'actors');
  return { object: root, joints, parts, height: (legLen + bodyH * 0.9 + sp.head[1] * 0.95) * s, species: spec.species };
}
export const SPECIES_LIST = Object.keys(SPECIES);
