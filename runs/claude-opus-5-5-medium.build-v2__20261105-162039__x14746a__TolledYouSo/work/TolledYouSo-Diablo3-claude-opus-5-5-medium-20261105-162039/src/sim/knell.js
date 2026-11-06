// Knell Runs, the Grand Knell, and the session round's Knell.
import { MODIFIER_IDS, MONSTERS } from '../data/monsters.js';
import { ZONES } from '../data/zones.js';
import { DT, emit, enterZone, findOpenNear, near, playerCount } from './world.js';
import { KNELL_OF, killMonster, spawnMonster } from './monsters.js';
import { dropItem, addProp } from './rules.js';
import { rollLegendaryItem, makeItem } from './loot.js';
import { say } from './bosses.js';

export function startKnell(w, { grandTier = null, mods = null, session = false } = {}) {
  const rng = w.rngs.quest;
  const n = playerCount(w);
  mods ??= session ? [rng.pick(MODIFIER_IDS.filter((m) => m !== 'dark'))] : rng.shuffle([...MODIFIER_IDS]).slice(0, rng.int(1, 2));
  w.knell = {
    meter: 0, total: Math.round(450 * (1 + 0.3 * (n - 1))), mods, stage: 'fill', hpMul: grandTier !== null ? 1.17 ** grandTier : 1, dmgMul: grandTier !== null ? 1.08 ** grandTier : session ? 0.7 : 1, speedMul: mods.includes('swift') ? 1.2 : 1,
    grand: grandTier !== null ? { tier: grandTier, t: 600 } : null, floor: 1, session, startT: w.time, reinforceT: 15, returning: { zone: w.zone?.id },
  };
  w.zoneCache.delete('knell1'); w.zoneCache.delete('knell2'); w.zoneCache.delete('session');
  w.root = w.root.fork(`run:${w.tick}`);
  enterZone(w, session ? 'session' : 'knell1');
  // Fit the meter to what this map holds: most of its monsters, never more.
  let sum = 0; for (const m of w.monsters) sum += KNELL_OF(m);
  w.knell.total = Math.max(60, Math.min(w.knell.total, Math.round(sum * (session ? 0.7 : 0.85))));
  if (session) w.knell.total = Math.max(w.knell.total, 60);
  emit(w, { t: 'knell', on: true, total: w.knell.total, mods, grand: w.knell.grand?.tier ?? null });
  emit(w, { t: 'music', song: 'knell' });
}
export function knellOnKill(w, m) {
  const k = w.knell; if (!k || k.stage !== 'fill') return;
  k.meter += KNELL_OF(m);
  emit(w, { t: 'meter', v: k.meter / k.total });
  if (k.meter >= k.total) knellTolls(w);
}
export function knellTolls(w) {
  const k = w.knell; k.stage = 'warden'; k.meter = k.total;
  emit(w, { t: 'flash', color: 'white' }); emit(w, { t: 'banner', text: 'THE KNELL TOLLS', big: true }); emit(w, { t: 'sfx', id: 'bell_big' }); emit(w, { t: 'shake', v: 0.9 });
  for (const m of [...w.monsters]) if (!m.dead) { m.noLoot = true; m.hp = 0; killMonster(w, m, null, {}); }
  const h = w.heroes.find((o) => !o.left && !o.dead) ?? w.heroes[0];
  const kinds = ['hollow_sexton', 'grand_chorister', 'clapperjaw_prime'];
  const type = w.rngs.quest.pick(kinds);
  const p = findOpenNear(w, h.x + 3, h.z + 1);
  const m = spawnMonster(w, type, p.x, p.z, { dormant: false, aggro: true, name: MONSTERS[type].name });
  m.spawnAnim = 2;
  k.warden = m.id;
  // An arena ring of bone around the fight.
  const R = 11;
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const x = h.x + Math.cos(a) * R; const z = h.z + Math.sin(a) * R; if (!w.zone.nav.walkable(x, z)) continue; const o = { id: w.nextId++, x, z, r: 0.7, t: 95, look: 'bone' }; w.obstacles.push(o); emit(w, { t: 'obstacle', id: o.id, x, z, r: 0.7, look: 'bone', dur: 95 }); }
  say(w, 'warden', 'YOU RANG. WE ANSWERED.');
  emit(w, { t: 'music', song: 'ledger' });
}
export function wardenDead(w, m, killer) {
  const k = w.knell; if (!k) return;
  k.stage = 'done'; k.endT = w.time;
  const time = w.time - k.startT;
  emit(w, { t: 'banner', text: 'THE WARDEN FALLS', big: true });
  emit(w, { t: 'sfx', id: 'fanfare' });
  if (w.round) { w.round.wardenDead = true; return; }
  const rng = w.rngs.loot;
  const beat = k.grand ? time <= 600 : true;
  for (const h of w.heroes) {
    if (h.left) continue;
    dropItem(w, m.x, m.z, rollLegendaryItem(rng, h.cls, Math.max(h.level, m.level)), h.seat);
    if (k.grand && beat) dropItem(w, m.x, m.z, makeItem(rng, { rarity: 'reliquary', ilvl: h.level + 2, cls: h.cls }), h.seat);
    h.mats.shards += 2 + (k.grand?.tier ?? 0);
    if (rng.chance(0.25)) { h.mats.keys++; emit(w, { t: 'toast', seat: h.seat, text: 'A GRAND KEY!', color: 'sand', big: true }); }
    w.hooks.bonusXp?.(w, h, 2000 + m.level * 200 * (k.grand ? 2 + k.grand.tier : 1));
    if (k.grand && beat) { w.devotion.xp += 3000 * (1 + k.grand.tier); }
    const b = (w.bests[h.cls] = w.bests[h.cls] ?? { knells: 0, tier: 0, time: null });
    b.knells++;
    if (k.grand && beat) { if (k.grand.tier > b.tier || (k.grand.tier === b.tier && (b.time === null || time < b.time))) { b.tier = k.grand.tier; b.time = Math.round(time); } }
    h.knells = (h.knells ?? 0) + 1;
  }
  k.results = { time: Math.round(time), tier: k.grand?.tier ?? null, beat, kills: w.stats.kills };
  emit(w, { t: 'knellresults', ...k.results });
  emit(w, { t: 'save' });
  w.unlocks.knell = true;
  const pos = findOpenNear(w, m.x + 2, m.z);
  const p = addProp(w, { kind: 'exit', x: pos.x, z: pos.z, to: 'town', model: 'exitstair', interact: true, label: 'BACK TO TOLLHAVEN', r: 1.4 }); emit(w, { t: 'propadd', id: p.id, kind: 'exit', x: p.x, z: p.z, model: p.model, label: p.label });
}
export function stepKnell(w) {
  const k = w.knell; if (!k) return;
  if (k.grand && k.stage !== 'done') { k.grand.t -= DT; if (k.grand.t <= 0 && !k.grand.warned) { k.grand.warned = true; emit(w, { t: 'toast', seat: -1, text: 'TIME. THE GRAND KNELL IS UNIMPRESSED, BUT FINISH IT.', color: 'red', big: true }); } }
  if (k.stage === 'fill') {
    k.reinforceT -= DT;
    if (k.reinforceT <= 0) {
      k.reinforceT = 12;
      if (w.active.filter((m) => !m.dead).length < 15) {
        const h = w.heroes.find((o) => !o.left && !o.dead); if (!h) return;
        const list = w.zone.spec.monsters.filter((t) => !MONSTERS[t].big);
        for (let i = 0; i < 10; i++) { const a = w.rngs.spawn.range(0, 6.28); const p = findOpenNear(w, h.x + Math.cos(a) * 11, h.z + Math.sin(a) * 11); spawnMonster(w, w.rngs.spawn.pick(list), p.x, p.z, { dormant: false, aggro: true }); }
      }
    }
  }
}
export function leaveKnell(w) { w.knell = null; emit(w, { t: 'knell', on: false }); }
export { near, ZONES };
