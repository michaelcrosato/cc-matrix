// Moving the party between places, the Passing Bell, the way back from the dead.
import { LORE_PLACES } from '../data/lore.js';
import { ZONES } from '../data/zones.js';
import { layoutAuthored, layoutFloor, scanLayout } from './zonegen.js';
import { ev, nextId, walkable } from './core.js';
import { addObject, propsFromScan, SHRINES } from './objects.js';
import { reviveHero } from './hero.js';
import { removeAlly } from './monsters.js';
import { onZoneEntered } from './quests.js';
import { NavGrid } from '../../pixel-engine.js';
import { NPC_LABELS } from '../data/dialog.js';

export const ID_BASE = 1000000;

/** Queue a move; it happens at the end of the step so nothing runs on a half-swapped world. */
export function travel(w, zone, floor = 0, entry = 'start') {
  w.pendingZone = { zone, floor, entry };
}

/** Pure: the same map from the same seed, whatever else has been drawn. */
export function buildZoneData(root, id, floor, runKey = '') {
  const def = ZONES[id];
  const rng = root.fork(`zone:${id}:${floor}:${runKey}`);
  let layout;
  if (def.kind === 'authored') layout = layoutAuthored(def.tpl);
  else if (id === 'belfry' && floor === def.gen.arenaFloor) layout = layoutAuthored(def.arena);
  else layout = layoutFloor(rng, def, floor);
  const scan = scanLayout(layout, def, rng);
  return { def, id, floor, layout, scan, rng };
}

export function loadZone(w, zone, floor = 0, entry = 'start') {
  if (w.run && !w.round && zone !== 'knell') w.run = null; // walked out of a run: it is over
  const data = buildZoneData(w.root, zone, floor, w.run?.seedKey ?? '');
  const { def, layout, scan } = data;
  // Clear the transient world.
  for (const a of [...w.allies]) if (a.def.ai === 'turret' || a.life) removeAlly(w, a);
  w.monsters = []; w.shots = []; w.areas = []; w.drops = []; w.sched = []; w.graves = []; w.obstacles = []; w.objects = []; w.props = [];
  w.boss = null; w.coffin = null;
  w.events.length = 0;

  const navs = [scan.nav];
  for (let i = 1; i < 6; i++) { const n = NavGrid.fromRows(scan.finalRows, { blocked: '#~P ', cell: 1, origin: [0, 0, 0] }); navs.push(n); }
  const z = {
    id: zone, floor, def, rows: scan.finalRows, w: layout.w, h: layout.h, nav: scan.nav, navs, rooms: layout.rooms, links: layout.links,
    lights: scan.lights, pillars: scan.pillars, seen: new Uint8Array(layout.w * layout.h), spawnList: [], entryX: 0, entryZ: 0, endX: 0, endZ: 0, biome: def.biome, seedKey: `${zone}:${floor}:${w.run?.seedKey ?? ''}`,
  };
  w.zone = z;
  let oid = ID_BASE;
  const id = () => oid++;
  w.props = propsFromScan(w, scan, 2000000);

  // Entrances: the first X is where you arrive, the last is the way on.
  const ents = scan.entrances;
  const startRoomIdx = layout.start?.index ?? -1;
  const endRoomIdx = layout.end?.index ?? -1;
  const startEnt = ents.find((e) => e.room === startRoomIdx) ?? ents[0];
  const endEnt = ents.find((e) => e.room === endRoomIdx) ?? null;
  if (startEnt) { z.entryX = startEnt.x; z.entryZ = startEnt.z; }
  if (endEnt) { z.endX = endEnt.x; z.endZ = endEnt.z; }

  const rngO = data.rng.fork('objects');
  for (const s of scan.shrines) addObject(w, 'shrine', s.x, s.z, { id: id(), shrine: rngO.pick(Object.keys(SHRINES)) });
  for (const c of scan.chests) addObject(w, 'chest', c.x, c.z, { id: id(), room: c.room });
  for (const t of scan.traps) addObject(w, 'trap', t.x, t.z, { id: id(), t: rngO.range(0, 3) });

  for (const n of scan.named) {
    const base = { id: id(), room: n.room };
    switch (n.name) {
      case 'lychgate': if (!w.run && !w.round) addObject(w, 'lychgate', n.x, n.z, base); break;
      case 'lever': addObject(w, 'lever', n.x, n.z, base); break;
      case 'relic': addObject(w, 'relic', n.x, n.z, { ...base, key: 'relic', hidden: false, floor }); break;
      case 'book': case 'grave_book': addObject(w, 'book', n.x, n.z, { ...base, lore: LORE_PLACES[`${zone}:${floor}`] ?? null, hidden: !LORE_PLACES[`${zone}:${floor}`] }); break;
      case 'gibbet': addObject(w, 'gibbet', n.x, n.z, base); break;
      case 'pantry_door': addObject(w, 'exit', n.x, n.z, { ...base, to: 'pantry', floor: 0, entry: 'start', label: 'THE DROWNED PANTRY', key: 'pantry_door' }); break;
      case 'npc_brasse': case 'npc_crier': case 'npc_ogive': case 'npc_pennywhistle': {
        const npc = n.name.slice(4);
        addObject(w, 'npc', n.x, n.z, { ...base, npc, label: NPC_LABELS[npc], key: n.name, r: 1.4 });
        break;
      }
      case 'wagon': addObject(w, 'wagon', n.x, n.z, { ...base, key: 'wagon', noUse: true }); break;
      case 'coin_pile': addObject(w, 'decor', n.x, n.z, { ...base, label: 'coin_pile', noUse: true }); break;
      case 'novice': addObject(w, 'novice', n.x, n.z, { ...base, key: 'novice', noUse: true, hp: 1, hidden: false }); break;
      case 'font_spot': addObject(w, 'spot', n.x, n.z, { ...base, key: 'font_spot', noUse: true }); break;
      case 'coffin_quest': addObject(w, 'coffin', n.x, n.z, { ...base, key: 'coffin_quest', time: 45, count: 5, table: [['peatwalker', 1]] }); break;
      case 'yard_gate': addObject(w, 'gate', n.x, n.z, { ...base, key: 'yard_gate', label: 'THE GATE TO TOLLHAVEN', locked: true, r: 1.6 }); break;
      case 'road_gate': addObject(w, 'lychgate', n.x, n.z, { ...base, key: 'road_gate', r: 1.6 }); break;
      case 'knell_font': addObject(w, 'font', n.x, n.z, { ...base, key: 'knell_font', r: 1.4 }); break;
      case 'writ_board': addObject(w, 'board', n.x, n.z, { ...base, key: 'writ_board', r: 1.4 }); break;
      case 'stash': addObject(w, 'box', n.x, n.z, { ...base, key: 'stash', r: 1.4 }); break;
      default: break;
    }
  }

  // Doors out of a lever room stay shut until its lever is pulled.
  const leverRoom = layout.rooms.find((r) => r.tplId === 'lever_room');
  if (leverRoom) {
    const link = layout.links.find((l) => l.a === leverRoom.index);
    if (link) {
      addObject(w, 'door', link.x + 0.5, link.y + 0.5, { id: id(), noUse: true, door: 1 });
      for (const n of navs) n.setOpen(link.x, link.y, false);
    }
  }

  // Exits.
  if (def.kind === 'gen' && !(zone === 'belfry' && floor === def.gen.arenaFloor)) {
    const lastFloor = floor >= def.floors - 1;
    if (startEnt) {
      const back = floor > 0 ? { to: zone, floor: floor - 1, entry: 'end', label: 'UP' } : zone === 'pantry' ? { to: 'causeway', floor: 0, entry: 'pantry', label: 'BACK TO THE CAUSEWAY' } : { to: 'town', floor: 0, entry: 'start', label: 'BACK TO TOLLHAVEN' };
      if (!w.round && !w.run) addObject(w, 'exit', startEnt.x - 2.5, startEnt.z + 1.5, { id: id(), ...back, key: 'exit_back' });
    }
    if (endEnt && !lastFloor && !layout.end.tpl.boss) {
      const toFloor = floor + 1;
      if (w.run) addObject(w, 'exit', endEnt.x, endEnt.z, { id: id(), run: true, floor: toFloor, label: 'DOWN', key: 'exit_on' });
      else addObject(w, 'exit', endEnt.x, endEnt.z, { id: id(), to: zone, floor: toFloor, entry: 'start', label: zone === 'belfry' && toFloor === def.gen.arenaFloor ? 'THE BELL CHAMBER' : 'ONWARD', key: 'exit_on' });
    }
  }
  if (zone === 'belfry' && floor === def.gen.arenaFloor) {
    if (startEnt) addObject(w, 'exit', startEnt.x + 2.5, startEnt.z - 1, { id: id(), to: 'belfry', floor: floor - 1, entry: 'end', label: 'DOWN', key: 'exit_back' });
  }
  z.nextObj = oid;

  // Spawns. Elite markers come up one time in three, scaled by the slider; packs wake as you near them.
  const rngS = data.rng.fork('spawns');
  const eliteP = (1 / 3) * w.tuning.eliteFrequency * (w.run?.mods?.includes('haunted') ? 2 : 1);
  if (!def.safe) {
    for (const s of scan.spawns) {
      if (s.kind === 'E' && !rngS.chance(eliteP)) continue;
      z.spawnList.push({ x: s.x, z: s.z, kind: s.kind, room: s.room, done: false });
    }
  }

  // Heroes arrive together.
  let ax = z.entryX, az = z.entryZ;
  if (entry === 'end' && endEnt) { ax = endEnt.x + 1.5; az = endEnt.z; }
  else if (entry === 'portal' && w.portalBack) { ax = w.portalBack.x; az = w.portalBack.z; w.portalBack = null; }
  else if (entry === 'pantry') { const pd = null; const door = layoutPantryDoor(w); if (door) { ax = door.x + 1.5; az = door.z; } }
  else if (entry && entry.gate) { ax = entry.gate.x; az = entry.gate.z + 1.5; }
  let k = 0;
  for (const h of w.heroes) {
    if (h.gone) continue;
    const a = (k / 4) * Math.PI * 2;
    h.x = ax + (k ? Math.cos(a) * 1.2 : 0); h.z = az + (k ? Math.sin(a) * 1.2 : 0);
    if (!walkable(w, h.x, h.z)) { h.x = ax; h.z = az; }
    h.move = null; h.dodge = null; h.cast = null; h.goal = null; h.path = null; h.channel = 0; h.air = 0; h.kx = 0; h.kz = 0;
    if (h.dead) reviveHero(w, h, 1, h.x, h.z);
    k++;
  }
  for (const a of w.allies) { a.x = ax + w.rng.range(-1.5, 1.5); a.z = az + w.rng.range(-1.5, 1.5); if (!walkable(w, a.x, a.z)) { a.x = ax; a.z = az; } }

  // Reveal the map around arrivals, remember the visit. You know your own town.
  if (def.safe) z.seen.fill(1);
  if (w.camp) {
    w.camp.visited[`${zone}:${floor}`] = 1;
    w.camp.zone = zone; w.camp.floor = floor;
  }
  ev(w, { t: 'zone', zone, floor, seedKey: z.seedKey });
  if (w.camp?.plateFirst && !def.safe && !w.round) {
    // After the first scripted one, 1 chance in 8 per load, 1 in 3 in Knell Runs.
    const p = w.run ? 1 / 3 : 1 / 8;
    if (w.rng.chance(p)) z.plateRoll = true;
  }
  onZoneEntered(w);
}

function layoutPantryDoor(w) { return w.objects.find((o) => o.key === 'pantry_door') ?? null; }

export function enterKnellFloor(w, floor) { w.pendingZone = { zone: w.zone.id, floor, entry: 'start' }; }

export function usePassingBell(w, h) {
  if (w.run || w.round || w.zone.def.safe || w.zone.def.bellOk === false) return false;
  if (w.camp) w.camp.portal = { zone: w.zone.id, floor: w.zone.floor, x: h.x, z: h.z };
  w.camp.bells = (w.camp.bells ?? 0) + 1;
  ev(w, { t: 'fx', k: 'portal', s: 'bell_mid', x: h.x, z: h.z, r: 2 });
  travel(w, 'town', 0, 'start');
  return true;
}

export function riseAtGate(w, h, how) {
  if (how === 'town' || !w.camp?.lastGate) { travel(w, 'town', 0, 'start'); return; }
  const g = w.camp.gates[w.camp.lastGate];
  if (!g) { travel(w, 'town', 0, 'start'); return; }
  if (g.zone === w.zone.id && g.floor === w.zone.floor) { reviveHero(w, h, 1, g.x, g.z + 1); return; }
  travel(w, g.zone, g.floor, { gate: g });
}

export function goToGate(w, key) {
  const g = w.camp.gates[key];
  if (!g) return false;
  travel(w, g.zone, g.floor, { gate: g });
  return true;
}
export { nextId };
