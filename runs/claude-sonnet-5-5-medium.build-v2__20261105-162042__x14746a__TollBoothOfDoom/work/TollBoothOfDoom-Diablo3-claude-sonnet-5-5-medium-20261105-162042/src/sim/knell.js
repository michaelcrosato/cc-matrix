// Knell Runs: a meter fills with kills, then a Warden falls. Also the Grand Knell and the session round.
import { ev, nid, livingHeroes, monsterLevel, giveXp, dropItem, spawnMonster, dropGold } from './core.js';
import { loadZone } from './world.js';
import { startBoss } from './bosses.js';
import { rollDrop, makeItem } from './items.js';
import { LEGENDARIES } from '../data/items.js';

export const MODIFIERS = [
  { id: 'crowded', name: 'Crowded', text: '+40% monsters' }, { id: 'swift', name: 'Swift', text: '+20% monster speed' }, { id: 'haunted', name: 'Haunted', text: 'Extra elite packs' },
  { id: 'golden', name: 'Golden', text: '+100% gold' }, { id: 'dark', name: 'Dark', text: 'Only hero lights' }, { id: 'volatile', name: 'Volatile', text: 'Monsters explode' },
];
export const WARDENS = ['warden_sexton', 'warden_chorister', 'warden_jaw'];

export function startKnell(w, { tier = 0, mods = [], grand = false, session = false, level = null }) {
  const players = Math.max(1, w.heroes.filter((h) => !h.gone && !h.bot).length || 1);
  w.knell = { active: true, phase: 'fill', fill: 0, total: (session ? 260 : 450) * (1 + 0.45 * (players - 1)), have: 0, mods, tier, grand, timer: grand ? 600 : null, floor: 1, session, startT: w.t, kills: 0, done: false, won: false };
  w.knellCrowd = mods.includes('crowded') ? 1.4 : 1; w.knellElite = mods.includes('haunted') ? 2.2 : 1; w.knellSpeed = mods.includes('swift') ? 1.2 : 1;
  w.knellHp = grand ? Math.pow(1.17, tier) : 1; w.knellDmg = grand ? Math.pow(1.08, tier) : 1; w.knellBossHp = 1;
  w.levelFloor = level || 0;
  w.hooks = w.hooks || {}; w.knellActive = true;
  loadZone(w, 'knell', { gen: { rooms: session ? 18 : 14, mixed: true }, levelFloor: level || 0, salt: 'f1:' + w.seed, density: 1, plateChance: 0.33 });
  if (mods.includes('swift')) for (const m of w.monsters) m.speed *= 1.2;
  ev(w, { t: 'knellStart', mods, tier, grand });
  ev(w, { t: 'banner', text: grand ? 'THE GRAND KNELL' : 'THE KNELL BEGINS', small: false });
  return w.knell;
}
export function knellNextFloor(w) {
  const k = w.knell; k.floor++;
  loadZone(w, 'knell', { gen: { rooms: 14, mixed: true }, levelFloor: w.levelFloor, salt: 'f' + k.floor + ':' + w.seed });
  if (k.mods.includes('swift')) for (const m of w.monsters) m.speed *= 1.2;
}
const WEIGHT = (m) => (m.rare ? 12 : m.elite ? 8 : m.big ? 3 : 1);
export function knellKill(w, m) {
  const k = w.knell; if (!k || !k.active || k.phase !== 'fill') return;
  if (m.team === 'hero' || m.prop || m.boss) return;
  k.have += WEIGHT(m); k.kills++; k.fill = k.have / k.total;
  if (k.mods.includes('volatile')) w.areas.push({ id: nid(w), kind: 'timed_blast', x: m.x, z: m.z, r: 3, t: 0.8, dmg: 0.8, fire: true });
  if (k.fill >= 1) knellToll(w);
}
function knellToll(w) {
  const k = w.knell; k.phase = 'warden'; k.fill = 1;
  ev(w, { t: 'banner', text: 'THE KNELL TOLLS', small: false }); ev(w, { t: 'sfx', name: 'bell_clemency' }); ev(w, { t: 'flash' });
  for (const m of w.monsters) if (!m.dead && !m.prop && m.team !== 'hero') { m.dead = true; ev(w, { t: 'kill', id: m.id, x: m.x, z: m.z, type: m.type, big: m.big, over: 0.4, dirx: 0, dirz: 1 }); }
  const h = livingHeroes(w)[0]; if (!h) return;
  k.wardenType = WARDENS[w.rng.int(0, WARDENS.length - 1)];
  const x = h.x + 6, z = h.z; let sx = x, sz = z; if (!w.zone.nav.walkable(sx, sz)) { sx = h.x - 6; }
  const m = startBoss(w, 'warden', sx, sz); m.state = 'aggro'; m.extra.started = true; m.hpMult = 1; m.hp = m.maxHp = m.maxHp * (k.session ? 0.6 : 1) * (k.grand ? 1 : 1);
  w.flags.bossActive = 'warden'; ev(w, { t: 'bossStart', boss: 'warden', id: m.id, name: m.name });
  // ring of bone
  for (let a = 0; a < 6.28; a += 0.45) w.areas.push({ id: nid(w), kind: 'bone_wall', x: sx + Math.cos(a) * 11, z: sz + Math.sin(a) * 11, r: 2.0, t: 600, block: true });
}
export function knellBossDead(w) {
  const k = w.knell; if (!k || k.done) return; k.done = true; k.won = true; k.phase = 'done'; k.active = false;
  const elapsed = w.t - k.startT;
  const rewards = { legendary: [], shards: 0, xp: 0, key: false };
  for (const h of livingHeroes(w)) {
    const pool = Object.keys(LEGENDARIES).filter((q) => !LEGENDARIES[q].cls || LEGENDARIES[q].cls === h.cls);
    const it = makeItem(w.lootRng, { legendary: pool[w.rng.int(0, pool.length - 1)], ilvl: Math.min(30, Math.max(8, monsterLevel(w))), cls: h.cls });
    if (!k.session) dropItem(w, it, h.x + 1, h.z + 1, h.seat); rewards.legendary.push(it.name);
    h.mats.shards += 6 + (k.grand ? 6 : 0) + k.tier; giveXp(w, h, 400 * (1 + k.tier * 0.3));
  }
  if (!k.session && (k.grand || w.rng.chance(0.25))) { if (w.acct) w.acct.grandKeys++; rewards.key = true; }
  k.result = { time: elapsed, tier: k.tier, grand: k.grand, kills: k.kills, rewards };
  if (w.acct && !k.session) { const key = (k.grand ? 'grand' : 'knell') + ':' + (livingHeroes(w)[0] ? livingHeroes(w)[0].cls : 'x'); const prev = w.acct.bests[key]; if (!prev || elapsed < prev.time) w.acct.bests[key] = { time: elapsed, tier: k.tier }; }
  ev(w, { t: 'knellDone', result: k.result });
}
export function knellTick(w, dt) {
  const k = w.knell; if (!k || !k.active) return;
  if (k.timer != null) { k.timer -= dt; if (k.timer <= 0) { k.active = false; k.won = false; k.done = true; ev(w, { t: 'knellDone', result: { failed: true, time: 600, tier: k.tier, grand: true, kills: k.kills, rewards: { legendary: [] } } }); } }
}
