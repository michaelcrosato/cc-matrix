// Knell Runs and the Grand Knell: a random dungeon, a meter, a Warden, and something to take home.
import { KNELL_MOD_IDS } from '../data/quests.js';
import { WARDENS } from '../data/monsters.js';
import { DIFFICULTIES } from '../data/tuning.js';
import { gemId } from '../data/items.js';
import { dist, ev, nextId, say, setCellOpen, toast } from './core.js';
import { startBoss } from './bosses.js';
import { dropItem, goldAt, makeRolledItem, spawnDrop, dropGold } from './loot.js';
import { killMonster, partyCount, openSpot } from './monsters.js';
import { addObject } from './objects.js';
import { travel } from './travel.js';
import { gainXp } from './hero.js';
import { stepSpawns, spawnPlate } from './quests.js';
import { spawnPack } from './monsters.js';
import { telegraphRing } from './hazards.js';

export function rollMods(rng, n) {
  const ids = [...KNELL_MOD_IDS];
  rng.shuffle(ids);
  return ids.slice(0, n);
}

/** Start a run. o: { grand: false, tier: 1, mods: [...] }, the UI shows the mods first. */
export function startRun(w, o = {}) {
  const rng = w.rng;
  const mods = o.mods ?? rollMods(rng, rng.int(1, 2));
  const grand = !!o.grand;
  const tier = o.tier ?? 1;
  const party = partyCount(w);
  w.run = {
    seedKey: `run${w.t}`, mods, grand, tier, meter: 0, total: Math.round(450 * (1 + 0.25 * (party - 1)) * (grand ? 0.8 : 1)), state: 'fill',
    hpMul: grand ? 1.17 ** tier : 1, dmgMul: grand ? 1.08 ** tier : 1, goldMul: mods.includes('golden') ? 2 : 1, densityMul: mods.includes('crowded') ? 1.4 : 1, speedMul: mods.includes('swift') ? 1.2 : 1,
    startT: w.time, timer: grand ? 600 : 0, startKills: 0, floor: 0, warden: null, wardenT: 0, deaths: 0, table: null,
  };
  ev(w, { t: 'run_start', mods, grand: grand ? 1 : 0, tier, total: w.run.total });
  travel(w, 'knell', 0, 'start');
}

export function knellZoneEntered(w) {
  const r = w.run;
  ev(w, { t: 'run_floor', floor: w.zone.floor });
  if (w.zone.floor === 0 && !w.round && w.rng.chance(1 / 3)) w.plateAt = w.time + w.rng.range(20, 60);
}

export function knellKill(w, m) {
  const r = w.run;
  if (!r || r.state !== 'fill') return;
  const pts = m.knellPts ?? 1;
  if (!pts) return;
  r.meter = Math.min(r.total, r.meter + pts);
  ev(w, { t: 'knell', v: r.meter, of: r.total });
  if (r.meter >= r.total) knellTolls(w);
}

function knellTolls(w) {
  const r = w.run;
  r.state = 'warden';
  ev(w, { t: 'knell_tolls' });
  toast(w, 'THE KNELL TOLLS', 'white', { big: 1 });
  for (const m of w.monsters) if (!m.dead && !m.def.boss) killMonster(w, m, null, { silent: true, big: true });
  const lead = w.heroes.find((h) => !h.dead && !h.gone && !h.companion) ?? w.heroes[0];
  const type = r.forceWarden ?? w.rng.pick(WARDENS);
  r.wardenAt = w.time + 2;
  r.wardenType = type;
  r.wardenX = lead.x; r.wardenZ = lead.z;
}

export function stepKnell(w) {
  const r = w.run;
  if (!r) return;
  if (r.grand && r.state !== 'done') r.timer -= 1 / 60;
  if (r.state === 'warden' && r.wardenAt && w.time >= r.wardenAt) {
    r.wardenAt = 0;
    const lead = w.heroes.find((h) => !h.dead && !h.gone && !h.companion) ?? w.heroes[0];
    const p = openSpot(w, lead.x + 3, lead.z + 3, 2);
    const m = startBoss(w, r.wardenType, p.x, p.z, { noIntro: true, level: Math.max(lead.level, w.zone.def.levelFloor) });
    r.warden = m;
    r.wardenStart = w.time;
    ev(w, { t: 'fx', k: 'dust_ring', s: 'coffin_slam', sh: 0.8, wv: 1, x: p.x, z: p.z, r: 8 });
    ev(w, { t: 'warden', k: r.wardenType, x: p.x, z: p.z });
    telegraphRing(w, p.x, p.z, 3, 0.6, 0, {});
    boneRing(w, p.x, p.z, 10);
  }
  if (w.t % 15 === 0) {
    stepSpawns(w);
    if (w.plateAt && w.time > w.plateAt) { w.plateAt = 0; const h = w.heroes[0]; const p = openSpot(w, h.x + 8, h.z + 4, 4); spawnPlate(w, p.x, p.z); }
    // No more monsters and meter unfilled on the last floor: raise some more.
    if (r.state === 'fill' && w.zone.floor === w.zone.def.floors - 1 && w.monsters.length < 6 && w.zone.spawnList.every((s) => s.done)) {
      const h = w.heroes.find((o) => !o.dead && !o.gone) ?? w.heroes[0];
      for (let i = 0; i < 3; i++) { const p = openSpot(w, h.x, h.z, 9); spawnPack(w, { x: p.x, z: p.z, kind: i === 0 && w.rng.chance(0.3) ? 'E' : 'S' }); }
    }
  }
}

export function onKnellBossDead(w, m) {
  const r = w.run;
  if (!r || m !== r.warden) return;
  r.state = 'done';
  const time = w.time - r.startT;
  const beat = !r.grand || r.timer > 0;
  const L = m.level;
  const results = { time, grand: r.grand ? 1 : 0, tier: r.tier, beat: beat ? 1 : 0, keys: 0, xp: 0, shards: 0, best: 0 };
  for (const h of w.heroes) {
    if (h.gone || h.companion) continue;
    dropItem(w, h, makeRolledItem(w.lootRng, h, 'legendary', L + 1), m.x, m.z, 2);
    if (r.grand && beat) {
      dropItem(w, h, makeRolledItem(w.lootRng, h, w.lootRng.chance(0.5) ? 'set' : 'legendary', L + 1), m.x, m.z, 2);
      spawnDrop(w, { kind: 'gem', gem: gemId(w.lootRng.pick(['ember', 'salt', 'amber']), 1), x: m.x, z: m.z, owner: h.seat });
    }
    h.mats.shards += r.grand ? 3 : 1;
    results.shards = r.grand ? 3 : 1;
    const xp = (L * 120 + 500) * (r.grand ? 2 + r.tier * 0.25 : 1) * w.diffDef.reward;
    gainXp(w, h, xp);
    results.xp = Math.round(xp);
    if (!r.grand && w.lootRng.chance(1 / 4)) { spawnDrop(w, { kind: 'key', x: m.x - 1, z: m.z, owner: h.seat }); results.keys = 1; }
    if (r.grand) {
      const bests = w.account.bests;
      const cur = bests[h.cls];
      const better = beat && (!cur || r.tier > cur.tier || (r.tier === cur.tier && time < cur.time));
      if (better) { bests[h.cls] = { tier: r.tier, time: Math.round(time) }; results.best = 1; }
    }
  }
  if (w.camp) w.camp.runsDone = (w.camp.runsDone ?? 0) + 1;
  ev(w, { t: 'run_done', results });
  addObject(w, 'exit', m.x + 2, m.z, { to: 'town', floor: 0, entry: 'start', label: 'THE WAY HOME', announce: true, key: 'run_home', id: 1100000 });
}

/** A broken ring of bone around the Warden: every third cell stays open, so nobody is shut out. */
function boneRing(w, x, z, R) {
  const cells = [];
  const cx = Math.floor(x), cz = Math.floor(z);
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      const d = Math.hypot(i, j);
      if (d < R - 0.5 || d > R + 0.5 || (i + j + 300) % 3 === 0) continue;
      const col = cx + i, row = cz + j;
      if (!w.zone.nav.isOpen(col, row) || w.heroes.some((h) => Math.floor(h.x) === col && Math.floor(h.z) === row)) continue;
      cells.push([col, row]);
    }
  }
  for (const [col, row] of cells) setCellOpen(w, col, row, false);
  const o = { id: nextId(w), x, z, cells, life: 90, kind: 'bone_wall' };
  w.obstacles.push(o);
  ev(w, { t: 'obst', id: o.id, k: 'bone_wall', x, z, cells, life: 90 });
}

export function endRun(w) { w.run = null; }
export { DIFFICULTIES, dist, say, goldAt, dropGold };
