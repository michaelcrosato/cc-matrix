// Things on the floor: what each object, prop and drop is built from.
import { buildModel, glowMaterial, PALETTE, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { gemName, parseGem, GEM_KINDS, RARITIES } from '../data/items.js';
import { GROUND_GEO, mat as glowOf } from './fxkit.js';
import { MODELS } from './models/index.js';

const { Group, Mesh } = THREE;

export const OBJECT_MODELS = {
  lychgate: 'lychgate', shrine: 'votive_rack', coffin: 'unquiet_coffin', chest: 'chest', lever: 'lever', door: 'portcullis', book: 'ledger', relic: 'relic_altar', font: 'knell_font', board: 'writ_board', box: 'collection_box', portal: 'portal_way', rope: 'bell_rope', trap: 'pit-grate', gibbet: 'gibbet', wagon: 'wagon_of_bells', gate: 'gate', ledger: 'ledger', class_font: 'class_font',
  exit: (o) => (o.key === 'pantry_door' ? 'trapdoor' : 'stone-steps'),
  npc: (o) => (o.npc === 'crier' ? 'npc_crier' : null),
  decor: (o) => (o.label === 'coin_pile' ? 'coin_pile' : null),
};

const PROP_MODELS = { urn: 'urn', barrel: 'barrel', crate: 'crate', clay: 'clay-pot', keg: 'keg', coffin: 'coffin', tombstone: 'tombstone', basket: 'basket', bones: 'bones', amphora: 'amphora' };
export const propModel = (t) => PROP_MODELS[t] ?? 'urn';

const BOX = GROUND_GEO.box;

export function makeDropMesh(view, e) {
  const g = new Group();
  g.position.set(e.x, 0, e.z);
  const rec = { id: e.id, g, t: 0, kind: e.kind, x: e.x, z: e.z, rarity: e.rarity, name: e.name, owner: e.owner, slot: e.slot, color: 'white' };
  switch (e.kind) {
    case 'gold': case 'coin': {
      for (let i = 0; i < 3; i++) {
        const c = new Mesh(BOX, toonMaterial(PALETTE.sand));
        c.scale.set(0.14, 0.05, 0.14);
        c.position.set((i - 1) * 0.1, 0.06 + i * 0.03, (i % 2) * 0.08);
        g.add(c);
      }
      rec.color = 'sand';
      break;
    }
    case 'tallow': {
      const c = new Mesh(BOX, toonMaterial(PALETTE.white));
      c.scale.set(0.26, 0.24, 0.26);
      c.position.y = 0.13;
      g.add(c);
      const f = new Mesh(BOX, glowMaterial(PALETTE.orange));
      f.scale.set(0.08, 0.14, 0.08);
      f.position.y = 0.32;
      g.add(f);
      rec.color = 'white';
      rec.light = view.ctx.lights.request({ position: [e.x, 0.7, e.z], color: 0xffd090, intensity: 2, radius: 3, priority: 1 });
      break;
    }
    case 'gem': {
      const kind = parseGem(e.name).kind;
      const color = GEM_KINDS[kind].color;
      const c = new Mesh(BOX, glowOf(color));
      c.scale.set(0.22, 0.28, 0.22);
      c.position.y = 0.3;
      c.rotation.y = 0.7;
      g.add(c);
      rec.spin = c;
      rec.color = color;
      rec.name = gemName(e.name);
      addBeam(view, rec, color, 1.2);
      break;
    }
    case 'key': {
      const c = new Mesh(BOX, glowOf('orange'));
      c.scale.set(0.5, 0.1, 0.14);
      c.position.y = 0.3;
      g.add(c);
      rec.spin = c;
      rec.color = 'orange';
      rec.name = 'GRAND KEY';
      addBeam(view, rec, 'orange', 5);
      break;
    }
    case 'item': {
      const R = RARITIES[e.rarity] ?? RARITIES.common;
      rec.color = R.color;
      const c = new Mesh(BOX, toonMaterial(PALETTE[R.color === 'white' ? 'mist' : R.color]));
      const long = e.slot === 'main' || e.slot === 'off';
      c.scale.set(long ? 0.7 : 0.34, 0.14, long ? 0.16 : 0.34);
      c.position.y = 0.09;
      c.rotation.y = (e.id * 1.7) % 3;
      c.castShadow = true;
      g.add(c);
      if (R.beam) addBeam(view, rec, R.color, R.beam);
      break;
    }
    default: break;
  }
  setLookLayer(g, 'actors');
  return rec;
}

function addBeam(view, rec, color, height) {
  const beam = new Mesh(BOX, glowOf(color));
  const w = height >= 5 ? 0.16 : 0.1;
  beam.scale.set(w, height, w);
  beam.position.y = height / 2;
  rec.g.add(beam);
  rec.beam = beam;
  const ring = new Mesh(GROUND_GEO.thin, glowOf(color));
  ring.scale.setScalar(height >= 5 ? 0.9 : 0.45);
  ring.position.y = 0.05;
  rec.g.add(ring);
  const hex = PALETTE[color] ?? 0xffffff;
  if (height >= 5) rec.light = view.ctx.lights.request({ position: [rec.x, 0.8, rec.z], color: hex, intensity: 9, radius: 7, priority: 2 });
  else if (color === 'sand') rec.light = view.ctx.lights.request({ position: [rec.x, 0.7, rec.z], color: hex, intensity: 3, radius: 3, priority: 1 });
}

const SHOT_LOOK = { spark: ['orange', 0.22], quarrel: ['white', 0.14], note: ['sky', 0.2], sour_note: ['cyan', 0.34] };
export function makeShotMesh(view, e) {
  const [c, s] = SHOT_LOOK[e.k] ?? ['white', 0.2];
  const m = new Mesh(BOX, glowOf(c));
  m.scale.setScalar(s);
  m.position.set(e.x, 1, e.z);
  return m;
}

export const fixDecor = buildModel;
export const unusedCatalog = MODELS;
