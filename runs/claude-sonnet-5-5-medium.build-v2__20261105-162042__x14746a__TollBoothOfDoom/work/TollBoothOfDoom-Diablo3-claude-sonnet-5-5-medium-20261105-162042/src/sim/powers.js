// Legendary powers and set bonuses as small hook functions. Each visibly changes play.
import { ev, heal, nid, livingHeroes, allyMinions, dealToMonster, monstersNear } from './core.js';

/** Return a modified copy of a skill spec given the hero's powers and sets. */
export function modifySkill(h, spec) {
  const p = h.stats.powers, sets = h.stats.sets;
  const s = { ...spec, fx: spec.fx.map((o) => ({ ...o })), flags: [...spec.flags] };
  const id = spec.id;
  if (id === 'great_toll' && p.has('widows_clapper')) {
    s.fx.push({ op: 'delay', t: 0.35, then: { op: 'ring', r: 6, dmg: 1.5, el: 'sound', knock: 2, vfx: 'ring_bronze', sfx: 'bell_mid', shake: 0.25 } });
    s.fx.push({ op: 'delay', t: 0.7, then: { op: 'ring', r: 6, dmg: 1.5, el: 'sound', knock: 2, vfx: 'ring_bronze', sfx: 'bell_mid', shake: 0.25 } });
  }
  if (id === 'clapper_charge' && p.has('anvil_second')) s.fx[0].dragAlong = true;
  if (id === 'chain_reap' && p.has('hymnal_greaves')) s.fx[0].notes = true;
  if (id === 'spark_bolt' && p.has('last_wick') && h.res > 70) { s.fx[0].split3 = true; }
  if (id === 'lantern_hurl' && p.has('patient_moth')) s.fx[0].dragPool = true;
  if (id === 'snuff' && p.has('snuffer_mitts')) s.fx[0].refund = true;
  if (id === 'dusk_step' && p.has('cinderwalk')) s.fx[0].fireLine = true;
  if (id === 'raise_pallbearers') { if (p.has('second_best_crook')) s.fx[0].coffins = true; if (sets.perpetual_mourner >= 2) s.fx[0].n += 2; if (h.stats.vowUnion) s.fx[0].n += 1; }
  if (id === 'exhume') { if (p.has('ledger_graves')) { s.fx[0].n = 99; s.fx[0].tithePerGrave = 1; } if (sets.perpetual_mourner >= 4) { s.fx[0].dmg *= 5; s.fx[0].healMinions = true; } }
  if (id === 'lamp_post') { if (h.stats.vowKeeper) s.fx[0].max += 1; if (sets.last_lamplighter >= 4) s.fx[0].setBolt = true; }
  if (id === 'coffin_drop' && p.has('family_deed')) s.fx[0].extra = 3;
  if (s.tags.includes('toll') && sets.ringing_order >= 4) s.fx[0].dmg *= 1.0; // damage x4 applied via consume
  return s;
}
export function onCast(w, h, spec) {
  const p = h.stats.powers;
  h.spellCount++;
  if (p.has('choir_baton') && h.spellCount % 6 === 0) h.freeNext = true;
  if (spec.id === 'shovel_swat') { h.swat++; if (p.has('first_digger') && h.swat % 5 === 0) w.areas.push({ id: nid(w), kind: 'grave', x: h.x + Math.sin(h.facing) * 1.5, z: h.z + Math.cos(h.facing) * 1.5, r: 0.8, t: h.stats.vowPlot ? 20 : 12, owner: h.seat }); }
  if (spec.tags.includes('toll') && h.stats.sets.ringing_order >= 4) h.cd[4] = Math.max(0, h.cd[4] - 2);
}
export function castMultiplier(w, h) {
  if (h.freeNext) { h.freeNext = false; return { free: true, dmg: 2 }; }
  return null;
}
export function tickPowers(w, h) {
  const p = h.stats.powers;
  if (p.has('clemency_shard')) {
    h.relicTimer += 1 / 60;
    if (h.relicTimer >= 12) {
      h.relicTimer = 0;
      ev(w, { t: 'fx', name: 'ring_bronze', x: h.x, z: h.z, r: 6 }); ev(w, { t: 'sfx', name: 'bell_mid', x: h.x, z: h.z });
      for (const m of monstersNear(w, h.x, h.z, 6)) if (!m.team || m.team === 'monster') dealToMonster(w, h, m, Math.round(h.stats.weaponDps * 3 * (1 + h.stats.power / 100) * w.tuning.playerDamage), { el: 'sound' });
    }
  }
  if (h.platBuff && h.platBuff.t < w.t) h.platBuff = null;
}
export function onKillPower(w, h, m) {
  const p = h.stats.powers;
  if (p.has('malison_knuckle') && m.elite) for (const o of monstersNear(w, m.x, m.z, 8)) if (o.pack === m.pack && o !== m) dealToMonster(w, h, o, Math.round(h.stats.weaponDps * 0.8), { el: 'phys' });
}
export function onPickupGold(w, h) {
  if (h.stats.powers.has('plate_lining')) {
    heal(w, h, h.maxHp * 0.01, true);
    const b = h.platBuff || { v: 0, t: 0 };
    b.v = Math.min(0.3, b.v + 0.01); b.t = w.t + 5; h.platBuff = b;
  }
}
export function onHeroDamaged(w, h, src, amt) {
  const th = h.stats.thorns;
  if (th && src && src.hp != null && !src.stats) dealToMonster(w, h, src, th, { el: 'phys' });
}
/** Returns true if a fatal blow was survived. */
export function modifyIncomingFatal(w, h) {
  const s = h.stats;
  if (s.powers.has('thrice_buried') && w.t - h.lastStand > 90) { h.lastStand = w.t; h.hp = h.maxHp * 0.3; ev(w, { t: 'banner', text: 'THRICE BURIED. NOT TODAY', small: true }); ev(w, { t: 'fx', name: 'ring_gold', x: h.x, z: h.z, r: 3 }); return true; }
  if (s.vowLastLight && w.t - (h.lastLight ?? -999) > 90) { h.lastLight = w.t; h.hp = Math.max(1, h.maxHp * 0.15); ev(w, { t: 'banner', text: 'LAST LIGHT', small: true }); ev(w, { t: 'fx', name: 'ring_gold', x: h.x, z: h.z, r: 3 }); return true; }
  return false;
}
