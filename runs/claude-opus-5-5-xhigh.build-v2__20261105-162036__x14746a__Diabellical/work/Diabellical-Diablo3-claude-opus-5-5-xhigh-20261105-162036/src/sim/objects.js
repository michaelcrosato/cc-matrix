// World objects and breakable props: everything a hero can use or smash.
import { LORE_PLACES } from '../data/lore.js';
import { RULES } from '../data/tuning.js';
import { PROP_HP } from '../data/zones.js';
import { dist, dist2, ev, nextId, toast, unstick } from './core.js';
import { addBuff } from './effects.js';
import { BTN } from './intents.js';
import { dropGold, dropItem, dropTallow, goldAt, makeRolledItem, spawnDrop } from './loot.js';
import { monsterLevel, openSpot, spawnMonster } from './monsters.js';
import { telegraphRing } from './hazards.js';
import { onObjectUsed, onTalkStart, onCoffinDone } from './quests.js';
import { enterKnellFloor, travel } from './travel.js';
import { recalcHero } from './hero.js';

export const SHRINES = {
  ardour: { name: 'ARDOUR', desc: '+50% DAMAGE', buff: { id: 'ardour', t: 30, dmg: 0.5 } },
  haste: { name: 'HASTE', desc: '+30% SPEED', buff: { id: 'haste', t: 30, speedMul: 1.3 } },
  ward: { name: 'WARD', desc: 'A SHIELD OF 30% LIFE', buff: { id: 'ward', t: 30 } },
  plenty: { name: 'PLENTY', desc: '+100% GOLD', buff: { id: 'plenty', t: 30 } },
};

export function addObject(w, kind, x, z, o = {}) {
  const obj = { id: o.id ?? nextId(w), kind, x, z, state: 0, r: 1, hidden: false, ...o };
  // Anything placed relative to something else (a boss's last stand, a stair's side) may land in a wall.
  // Nobody can reach it there, and an exit in a wall is a run with no way home.
  if (o.announce || kind === 'exit') unstick(w, obj);
  w.objects.push(obj);
  if (o.announce) ev(w, { t: 'objadd', o: objectWire(obj) });
  return obj;
}
export const objectWire = (o) => ({ id: o.id, kind: o.kind, x: o.x, z: o.z, state: o.state, hidden: o.hidden, npc: o.npc, label: o.label, door: o.door, key: o.key });
export function setObjectState(w, o, state, extra = {}) {
  o.state = state;
  Object.assign(o, extra);
  ev(w, { t: 'obj', id: o.id, state, hidden: o.hidden, ...extra });
}
export const objectByKey = (w, key) => w.objects.find((o) => o.key === key) ?? null;

export const isUsable = (w, h, o) => {
  if (o.hidden || o.noUse) return false;
  switch (o.kind) {
    case 'npc': case 'exit': case 'lychgate': case 'font': case 'board': case 'box': case 'portal': case 'rope': case 'relic': case 'gate': return !o.locked && o.state !== 2;
    case 'shrine': case 'coffin': case 'chest': case 'book': case 'lever': case 'ledger': return o.state === 0;
    case 'body': return !!o.ref?.dead && o.ref !== h;
    default: return false;
  }
};

export function usableObjects(w, h, range = RULES.interactRange) {
  const out = [];
  for (const o of w.objects) if (isUsable(w, h, o) && dist(h.x, h.z, o.x, o.z) <= range + (o.r - 1) * 0.5) out.push(o);
  out.sort((a, b) => dist2(a.x, a.z, h.x, h.z) - dist2(b.x, b.z, h.x, h.z));
  return out;
}

export function objectLabel(o) {
  switch (o.kind) {
    case 'npc': return o.label;
    case 'exit': return o.label ?? 'LEAVE';
    case 'lychgate': return 'LYCHGATE';
    case 'font': return 'KNELL FONT';
    case 'board': return 'WRIT BOARD';
    case 'box': return 'COLLECTION BOX';
    case 'portal': return 'THE WAY BACK';
    case 'shrine': return `VOTIVE SHRINE: ${SHRINES[o.shrine]?.name ?? ''}`;
    case 'coffin': return 'UNQUIET COFFIN';
    case 'chest': return 'CHEST';
    case 'book': return 'A BOOK';
    case 'lever': return 'LEVER';
    case 'ledger': return 'THE LEDGER';
    case 'rope': return 'BELL ROPE';
    case 'relic': return 'HOLY BONE';
    case 'gate': return o.label ?? 'GATE';
    default: return o.label ?? '';
  }
}

export function interact(w, h, it, forced = null) {
  let o = forced;
  if (!o) {
    const list = usableObjects(w, h);
    if (!list.length) return false;
    o = list[(h.useSel ?? 0) % list.length];
  }
  h.useSel = 0;
  return useObject(w, h, o);
}

export function useObject(w, h, o) {
  if (!isUsable(w, h, o)) return false;
  switch (o.kind) {
    case 'npc':
      ev(w, { t: 'talk', npc: o.npc, seat: h.seat, id: o.id, x: o.x, z: o.z });
      onTalkStart(w, h, o);
      break;
    case 'exit':
      if (o.run) { enterKnellFloor(w, o.floor); break; }
      travel(w, o.to, o.floor ?? 0, o.entry ?? 'start');
      break;
    case 'lychgate': ev(w, { t: 'open', ui: 'map', seat: h.seat }); touchGate(w, o); break;
    case 'gate': onObjectUsed(w, h, o); break;
    case 'font': ev(w, { t: 'open', ui: 'knell', seat: h.seat }); break;
    case 'board': ev(w, { t: 'open', ui: 'writs', seat: h.seat }); break;
    case 'box': ev(w, { t: 'open', ui: 'stash', seat: h.seat }); break;
    case 'portal': {
      const p = w.camp?.portal;
      if (p) { w.camp.portal = null; travel(w, p.zone, p.floor, 'portal'); w.portalBack = p; }
      else travel(w, 'town', 0, 'start');
      break;
    }
    case 'shrine': useShrine(w, h, o); break;
    case 'coffin': startCoffin(w, h, o); break;
    case 'chest': openChest(w, h, o); break;
    case 'book':
      setObjectState(w, o, 1);
      if (o.lore && w.camp) { w.camp.lore[o.lore] = 1; ev(w, { t: 'lore', id: o.lore, seat: h.seat }); }
      onObjectUsed(w, h, o);
      break;
    case 'lever': pullLever(w, h, o); break;
    case 'relic': case 'ledger':
      setObjectState(w, o, 2, { hidden: true });
      onObjectUsed(w, h, o);
      break;
    case 'rope': break;
    default: return false;
  }
  return true;
}

/** Hold-to-use things. Returns true if the hero is holding one this frame. */
export function channelObject(w, h, it) {
  if (!(it.held & BTN.INTERACT)) { if (h.ropeT) h.ropeT = 0; return false; }
  const rope = w.objects.find((o) => o.kind === 'rope' && !o.hidden && o.state === 0 && dist(h.x, h.z, o.x, o.z) <= RULES.interactRange);
  if (!rope) return false;
  h.ropeT = (h.ropeT ?? 0) + 1 / 60;
  h.state = 'channel';
  h.cast = null;
  h.moving = false;
  h.channel = h.ropeT;
  if (h.ropeT >= rope.hold) {
    h.ropeT = 0; h.channel = 0;
    setObjectState(w, rope, 1, { hidden: true });
    onObjectUsed(w, h, rope);
  }
  return true;
}

function useShrine(w, h, o) {
  setObjectState(w, o, 1);
  const def = SHRINES[o.shrine];
  for (const a of w.heroes) {
    if (a.gone) continue;
    addBuff(a, { ...def.buff });
    if (o.shrine === 'ward') a.shield = a.stats.maxHp * 0.3;
  }
  ev(w, { t: 'fx', k: 'shrine', s: 'shrine', x: o.x, z: o.z, r: 3 });
  toast(w, `${def.name}: ${def.desc}`, 'sand', { big: 1 });
  if (w.camp) w.camp.shrines = (w.camp.shrines ?? 0) + 1;
  onObjectUsed(w, h, o);
}

function touchGate(w, o) {
  if (!w.camp) return;
  const k = `${w.zone.id}:${w.zone.floor}`;
  if (!w.camp.gates[k]) {
    w.camp.gates[k] = { zone: w.zone.id, floor: w.zone.floor, x: o.x, z: o.z };
    ev(w, { t: 'toast', text: 'LYCHGATE AWAKENED', color: 'lime' });
    ev(w, { t: 'sfx', k: 'gate', x: o.x, z: o.z });
  }
  w.camp.lastGate = k;
}

function startCoffin(w, h, o) {
  setObjectState(w, o, 1);
  o.left = o.time ?? 45;
  o.wave = 0;
  w.coffin = o;
  ev(w, { t: 'coffin', state: 'start', x: o.x, z: o.z, left: o.left });
  ev(w, { t: 'fx', k: 'dust_ring', s: 'coffin_slam', sh: 0.4, x: o.x, z: o.z, r: 3 });
  if (w.camp) w.camp.coffins = (w.camp.coffins ?? 0) + 1;
}

function stepCoffin(w, o) {
  if (o.state !== 1) return;
  o.left -= 1 / 60;
  o.wave -= 1 / 60;
  if (o.wave <= 0 && o.left > 3) {
    o.wave = 6;
    const zd = w.zone.def;
    const table = o.table ?? zd.monsters.filter(([t]) => t !== 'crawler_nest' && t !== 'unrung_font');
    const count = Math.round((o.count ?? 7) * w.tuning.monsterDensity);
    for (let i = 0; i < count; i++) {
      const p = openSpot(w, o.x, o.z, 7);
      const type = w.rng.weighted(table, (t) => t[1])[0];
      spawnMonster(w, type, p.x, p.z, { state: 'chase', from: 'ground', noXp: false, knellPts: 0 });
    }
    ev(w, { t: 'sfx', k: 'raise', x: o.x, z: o.z });
  }
  if (o.left <= 0) {
    setObjectState(w, o, 2);
    w.coffin = null;
    ev(w, { t: 'coffin', state: 'done', x: o.x, z: o.z });
    addObject(w, 'chest', o.x + 1.4, o.z, { rich: true, announce: true });
    toast(w, 'THE COFFIN IS QUIET. COLLECT YOUR FEE.', 'sand', { big: 1 });
    onCoffinDone(w, o);
  }
}

function openChest(w, h, o) {
  setObjectState(w, o, 1);
  ev(w, { t: 'fx', k: 'chest', s: 'chest', x: o.x, z: o.z, r: 2 });
  const L = monsterLevel(w);
  for (const a of w.heroes) {
    if (a.gone || a.companion) continue;
    const rich = o.rich;
    for (let i = 0; i < (rich ? 8 : 3); i++) dropGold(w, a, goldAt(L) * (rich ? 3 : 1.5) * w.tuning.goldRate * w.diffDef.reward, o.x, o.z, 1.6);
    const items = rich ? 2 : w.lootRng.chance(0.5) ? 1 : 0;
    for (let i = 0; i < items; i++) dropItem(w, a, makeRolledItem(w.lootRng, a, rich && i === 0 ? 'reliquary' : w.lootRng.chance(0.3) ? 'reliquary' : 'blessed', L), o.x, o.z, 1.6);
    if (o.gem) spawnDrop(w, { kind: 'gem', gem: o.gem, x: o.x + 0.6, z: o.z + 0.6, owner: a.seat });
  }
  if (w.camp) w.camp.chests = (w.camp.chests ?? 0) + 1;
  onObjectUsed(w, h, o);
}

function pullLever(w, h, o) {
  setObjectState(w, o, 1);
  ev(w, { t: 'sfx', k: 'lever', x: o.x, z: o.z });
  for (const d of w.objects) {
    if (d.kind !== 'door' || d.state !== 0) continue;
    setObjectState(w, d, 1);
    for (const n of w.zone.navs) n.setOpen(Math.floor(d.x), Math.floor(d.z), true);
    ev(w, { t: 'fx', k: 'dust_ring', s: 'portcullis', x: d.x, z: d.z, r: 1.5 });
  }
  if (w.camp) w.camp.levers = (w.camp.levers ?? 0) + 1;
  toast(w, 'SOMEWHERE A PORTCULLIS RISES', 'mist');
  onObjectUsed(w, h, o);
}

export function stepObjects(w) {
  for (const o of w.objects) {
    switch (o.kind) {
      case 'coffin': stepCoffin(w, o); break;
      case 'trap': {
        o.t = (o.t ?? 0) - 1 / 60;
        if (o.t > 0) break;
        o.t = 3;
        const near = w.heroes.some((h) => !h.dead && !h.gone && dist(h.x, h.z, o.x, o.z) < 5);
        if (near) {
          const dmg = 7 * 1.12 ** (monsterLevel(w) - 1) * w.diffDef.dmg * w.tuning.monsterDamage;
          telegraphRing(w, o.x, o.z, 1.4, 0.7, dmg, { vfx: 'spikes', sfx: 'spikes' });
        }
        break;
      }
      case 'lychgate': {
        if (!w.camp) break;
        const k = `${w.zone.id}:${w.zone.floor}`;
        if (!w.camp.gates[k] && w.heroes.some((h) => !h.gone && !h.companion && dist(h.x, h.z, o.x, o.z) < 4)) touchGate(w, o);
        if (w.camp.gates[k] && w.heroes.some((h) => !h.gone && dist(h.x, h.z, o.x, o.z) < 4)) w.camp.lastGate = k;
        break;
      }
      case 'gibbet': {
        if (o.state === 0 && w.heroes.some((h) => !h.dead && !h.gone && dist(h.x, h.z, o.x, o.z) < 9)) {
          setObjectState(w, o, 1);
          const n = 1 + (w.rng.chance(0.5) ? 1 : 0);
          for (let i = 0; i < n; i++) spawnMonster(w, 'gibbet_drop', o.x + w.rng.range(-0.5, 0.5), o.z + w.rng.range(-0.5, 0.5), { state: 'chase', from: 'drop' });
        }
        break;
      }
      case 'class_font': {
        if (w.round && w.round.playT < 30) {
          for (const h of w.heroes) {
            if (h.gone || h.cls === o.cls) { continue; }
            if (dist(h.x, h.z, o.x, o.z) < 1.4) {
              h.fontT = (h.fontT ?? 0) + 1 / 60;
              if (h.fontT >= 2) { h.fontT = 0; w.swapClass?.(w, h, o.cls); }
            }
          }
        }
        break;
      }
      default: break;
    }
  }
}

// ---- Breakable props ------------------------------------------------------------------------
export function hitPropsIn(w, x, z, r, h) {
  for (const p of w.props) {
    if (p.broken) continue;
    if (dist2(p.x, p.z, x, z) > (r + 0.5) ** 2) continue;
    p.hp--;
    if (p.hp > 0) { ev(w, { t: 'prop_hit', id: p.id }); continue; }
    breakProp(w, p, x, z, h);
  }
}

export function breakProp(w, p, x, z, h) {
  p.broken = true;
  if (w.camp) w.camp.broken = (w.camp.broken ?? 0) + 1;
  ev(w, { t: 'prop', id: p.id, x: p.x, z: p.z, fx: x, fz: z, k: p.type });
  for (const a of w.heroes) {
    if (a.gone || a.companion || a.dead) continue;
    if (w.lootRng.chance(0.4)) dropGold(w, a, goldAt(monsterLevel(w)) * 0.6 * w.diffDef.reward * w.tuning.goldRate, p.x, p.z);
  }
  if (w.lootRng.chance(0.05)) dropTallow(w, p.x, p.z);
}

export function propsFromScan(w, scan, idBase) {
  const out = [];
  let id = idBase;
  for (const b of scan.breakables) {
    out.push({ id: id++, x: b.x, z: b.z, type: b.type, hp: PROP_HP[b.type] ?? 1, broken: false, room: b.room });
  }
  return out;
}

export const loreFor = (zone, floor) => LORE_PLACES[`${zone}:${floor}`] ?? null;
export { recalcHero };
