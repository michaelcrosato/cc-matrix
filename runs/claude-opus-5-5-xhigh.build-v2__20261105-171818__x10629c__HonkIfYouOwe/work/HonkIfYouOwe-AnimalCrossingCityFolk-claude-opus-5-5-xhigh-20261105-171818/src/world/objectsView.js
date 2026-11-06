// Presentation of world.town.objects: one group per tile, rebuilt when marked dirty.
import { THREE, buildModel, toonMaterial, PALETTE } from '../engine.js';
import { MODELS } from '../art/models.js';
import { leafFor, swayify, BLOSSOM } from './town.js';
import { groundHeight } from './tiles.js';
import { FLOWER_COLORS, ITEMS } from '../data/items.js';
import { hash32 } from '../core/rng.js';

const { Group, Mesh, BoxGeometry } = THREE;
const build = (id, opts = {}) => {
  const o = buildModel(id, { catalog: MODELS, ...opts }).object;
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
};
const replaceColor = (obj, hex, to) => obj.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === hex) m.material = to; });

function buildObject(town, k, o) {
  const [x, z] = k.split(',').map(Number);
  const g = town.g;
  const season = g.season ?? 1;
  const cal = g.calendarDay ?? 1;
  const group = new Group();
  group.position.set(x + 0.5, groundHeight(x + 0.5, z + 0.5), z + 0.5);
  group.userData.key = k;
  const phase = (hash32(k) % 628) / 100;
  switch (o.k) {
    case 'tree': {
      const leaf = leafFor(season, cal, o.kind);
      const id = o.kind === 'pine' ? 'tree-pine' : o.kind === 'palm' ? 'tree-palm' : 'tree-pear';
      const fruitColor = o.fruitItem && ITEMS[o.fruitItem]?.iconColors?.o;
      const t = build(id, { palette: { leaf: leaf.leaf, leaf2: leaf.leaf2, ...(fruitColor ? { fruit: fruitColor } : {}) } });
      const fruit = t.getObjectByName('fruit');
      if (fruit) fruit.visible = (o.fruit ?? 0) > 0 && season !== 3;
      if (leaf.blossom) replaceColor(t, PALETTE.white, toonMaterial(BLOSSOM));
      t.rotation.y = phase;
      const s = 0.9 + (hash32(`${k}s`) % 30) / 100;
      t.scale.set(s, s, s);
      swayify(t, town.wind, 4, 1.2, 0.05, phase);
      group.add(t);
      if (o.wasp) { const n = build('wasp-nest'); n.position.set(0.7, 1.7, 0.7); group.add(n); }
      group.userData.canopy = t;
      break;
    }
    case 'sapling': { const t = build('sapling', { params: { stage: Math.min(2, o.stage ?? 0) } }); group.add(t); break; }
    case 'stump': group.add(build('stump', { params: { d: 0.6 } })); break;
    case 'rock': group.add(build('rock-prop')); break;
    case 'flower': {
      const f = build('flower', { params: { species: o.species, wilt: o.wilt >= 2 ? 1 : 0, big: o.hybrid ? 1 : 0 }, palette: { petal: FLOWER_COLORS[o.color] ?? 'red' } });
      f.rotation.y = phase;
      group.add(f);
      break;
    }
    case 'weed': group.add(build('weed')); group.rotation.y = phase; break;
    case 'hole': group.add(build('hole')); break;
    case 'crack': group.add(build('crack-mark')); group.rotation.y = phase; break;
    case 'sparkle': group.userData.sparkle = true; group.add(build('crack-mark')); group.scale.set(0.5, 1, 0.5); break;
    case 'shell': group.add(build('shell-prop')); group.rotation.y = phase; break;
    case 'driftwood': group.add(build('driftwood')); group.rotation.y = phase; break;
    case 'beanstalk': group.add(build('beanstalk', { params: { stage: Math.min(2, o.stage ?? 0) } })); break;
    case 'snowball': { const b = build('snowball'); const s = o.size ?? 0.5; b.scale.set(s, s, s); group.add(b); group.position.x = o.x ?? x + 0.5; group.position.z = o.z ?? z + 0.5; break; }
    case 'snowman': group.add(build('snowman')); break;
    case 'drop': {
      const it = ITEMS[o.item];
      let m;
      if (it?.cat === 'bag') m = build('drop-bag', { palette: { bag: it.iconColors.o, tie: it.iconColors.x } });
      else if (it?.cat === 'fruit') m = build('pear-drop', { palette: { a: it.iconColors.o } });
      else if (it?.cat === 'cheese') m = build('cheese-wheel');
      else if (it?.cat === 'gift') m = build('balloon');
      else m = build('drop-leaf', { palette: { a: it?.iconColors?.o === 'white' ? 'mist' : it?.iconColors?.o ?? 'lime', b: it?.iconColors?.x ?? 'green' } });
      group.add(m);
      if (it?.cat === 'gift') { m.position.y = -1.1; m.scale.set(1, 1, 1); group.userData.giftDrop = true; }
      group.rotation.y = phase;
      break;
    }
    case 'ring': group.add(build('chalk-ring')); break;
    case 'pattern': {
      const tex = town.g.patternTexture?.(o.slot);
      if (tex) {
        const p = new Mesh(new BoxGeometry(1, 0.02, 1), toonMaterial(PALETTE.white, { map: tex }));
        p.position.y = 0.012;
        group.add(p);
      }
      break;
    }
    case 'patternSign': {
      const tex = town.g.patternTexture?.(o.slot);
      const post = new Mesh(new BoxGeometry(0.1, 1.1, 0.1), toonMaterial(PALETTE.plum));
      post.position.y = 0.55;
      group.add(post);
      if (tex) { const board = new Mesh(new BoxGeometry(0.9, 0.9, 0.06), toonMaterial(PALETTE.white, { map: tex })); board.position.set(0, 1.3, 0.06); group.add(board); }
      break;
    }
    default: break;
  }
  return group;
}
export function syncObjects(town) {
  const objects = town.g.world.town.objects;
  for (const k of town.dirty) {
    const old = town.objectViews.get(k);
    if (old) { old.removeFromParent(); town.objectViews.delete(k); }
    const o = objects[k];
    if (o) {
      const v = buildObject(town, k, o);
      town.objectsGroup.add(v);
      town.objectViews.set(k, v);
    }
    const [x, z] = k.split(',').map(Number);
    town.nav.setOpen(x, z, !town.solid[z * 80 + x] && !town.objectBlocks(x, z));
  }
  town.dirty.clear();
}
/** Replace everything (new world, new season). */
export function rebuildAllObjects(town) {
  for (const v of town.objectViews.values()) v.removeFromParent();
  town.objectViews.clear();
  town.dirty.clear();
  for (const k of Object.keys(town.g.world.town.objects)) town.dirty.add(k);
  syncObjects(town);
  town.syncNav();
}
