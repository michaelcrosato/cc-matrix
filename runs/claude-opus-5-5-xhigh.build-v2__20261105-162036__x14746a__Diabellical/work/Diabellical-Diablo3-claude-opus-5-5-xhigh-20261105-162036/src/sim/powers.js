// Legendary powers as small hook objects: onCast, onHit, onKill, onPickup, tick, modifySkill.
// Worn or held in the Reliquary, they behave the same.
import { ev, nearestEnemy } from './core.js';
import { computeHit, gainRes, runOps, spawnShot } from './effects.js';
import { damageMonster } from './monsters.js';

const halfToll = (t) => ({ op: 'delay', t, then: { op: 'ring', radius: 6, dmg: 1.5, el: 'sound', vfx: 'ring_bronze', sfx: 'bell_mid', shake: 0.2 } });

export const POWERS = {
  widows_clapper: { modifySkill(h, sk) { if (sk.id === 'great_toll') sk.fx.push(halfToll(0.35), halfToll(0.7)); } },
  anvil_thoughts: { modifySkill(h, sk) { if (sk.id === 'clapper_charge') sk.fx[0].drag = true; } },
  verger_cowl: {},
  hymnal_greaves: {
    onHit(w, h, m, op, c) {
      if (c.sk?.id !== 'chain_reap' || op.noProc || m.dead) return;
      spawnShot(w, { owner: h.id, team: 0, kind: 'note', x: h.x, z: h.z, dx: (m.x - h.x) / (Math.hypot(m.x - h.x, m.z - h.z) || 1), dz: (m.z - h.z) / (Math.hypot(m.x - h.x, m.z - h.z) || 1), speed: 14, range: 14, tgt: m.id, op: { dmg: 0.6, el: 'sound', noProc: true }, sk: c.sk });
    },
  },
  last_wick: {},
  patient_moth: {},
  snuffers_mitts: {},
  cinderwalk_boots: {},
  second_best_crook: {},
  unpaid_graves: {},
  first_digger: {
    onCast(w, h, sk, c) {
      if (sk.id !== 'shovel_swat') return;
      h.swats = (h.swats ?? 0) + 1;
      if (h.swats % 5 === 0) addGrave(w, c.x + c.dx * 1.5, c.z + c.dz * 1.5);
    },
  },
  family_deed: { modifySkill(h, sk) { if (sk.id === 'coffin_drop') sk.fx[0].count = (sk.fx[0].count ?? 1) + 3, sk.fx[0].spread = 3.4; } },
  plate_lining: {
    onPickup(w, h, kind) {
      if (kind !== 'gold') return;
      h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * 0.01);
      h.plateStacks = Math.min(30, (h.plateStacks ?? 0) + 1);
      h.plateT = 5;
    },
    tick(w, h) { if (h.plateT > 0) { h.plateT -= 1 / 60; if (h.plateT <= 0) h.plateStacks = 0; } },
  },
  thrice_buried: {},
  malisons_knuckle: {
    onHit(w, h, m, op, c) {
      if (!m.elite || op.noProc) return;
      const next = nearestEnemy(w, m.x, m.z, 8, (o) => o.pack === m.pack && o.id !== m.id);
      if (!next) return;
      ev(w, { t: 'fx', k: 'arc', x: m.x, z: m.z, x2: next.x, z2: next.z, el: 'grave' });
      const [d, crit] = computeHit(w, h, next, 0.5, 'grave', c);
      damageMonster(w, next, d, { src: h, crit, el: 'grave', c, dx: next.x - m.x, dz: next.z - m.z });
    },
  },
  choir_baton: {},
  mourning_band: {},
  clemency_shard: {
    tick(w, h) {
      h.shardT = (h.shardT ?? 12) - 1 / 60;
      if (h.shardT > 0) return;
      h.shardT = 12;
      if (w.monsters.length === 0) return;
      runOps(w, h, [{ op: 'ring', radius: 6, dmg: 3, el: 'sound', vfx: 'ring_bronze', sfx: 'bell_mid', shake: 0.15 }], { x: h.x, z: h.z, dx: h.dirX, dz: h.dirZ, sk: null });
    },
  },
};

export function addGrave(w, x, z, life = null) {
  const g = { id: w.nextId++, x, z, t: life ?? w.graveLife ?? 12 };
  w.graves.push(g);
  ev(w, { t: 'grave', id: g.id, x, z });
  return g;
}

export { gainRes };
