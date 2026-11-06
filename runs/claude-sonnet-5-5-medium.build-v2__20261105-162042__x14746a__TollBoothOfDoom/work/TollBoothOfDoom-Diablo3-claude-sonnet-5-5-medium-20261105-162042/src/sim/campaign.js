// The campaign: quests, scripted beats, NPC placement and zone gating. Plain JS; reacts to sim events.
import { QUESTS, NPCS, TAUNTS, LORE_ZONES, LORE_BOOKS } from '../data/quests.js';
import { ZONES, CAMPAIGN } from '../data/zones.js';
import { ev, nid, livingHeroes, spawnMonster, monsterLevel, giveXp, dropItem, walkable, monstersNear, snapToFloor } from './core.js';
import { loadZone, spawnProp, spawnElitePack } from './world.js';
import { makeItem } from './items.js';
import { startBoss } from './bosses.js';

export function newCampaign() {
  return { q: 0, s: 0, counters: {}, credits: false, bones: 0, visited: {}, lychgates: {}, unlocked: { yard: true }, firstKill: {}, kills: 0, moved: 0, done: false, questsDone: [], writs: [], defend: null, books: {}, seen: {} };
}
export const curQuest = (c) => QUESTS[c.q] || null;
export const curStep = (c) => { const q = curQuest(c); return q ? q.steps[c.s] : null; };

export function questLine(c) {
  const st = curStep(c); if (!st) return c.done ? 'KNELL RUNS AWAIT AT THE FONT' : '';
  return `${curQuest(c).name.toUpperCase()}: ${st.text.toUpperCase()}`;
}

function advance(w, why) {
  const c = w.camp; const q = curQuest(c); if (!q) return;
  ev(w, { t: 'questStep', quest: q.id, step: q.steps[c.s].id, text: q.steps[c.s].text, why });
  c.s++; c.counters = {}; c.moved = 0;
  if (c.s >= q.steps.length) { c.questsDone.push(q.id); ev(w, { t: 'questDone', quest: q.id, name: q.name }); c.q++; c.s = 0; for (const h of livingHeroes(w)) giveXp(w, h, 120 * (c.q) * (1 + c.q * 0.4)); if (c.q >= QUESTS.length) { c.done = true; c.credits = true; ev(w, { t: 'campaignDone' }); } }
  beginStep(w);
}
export function beginStep(w) {
  const c = w.camp; const st = curStep(c); if (!st) return;
  if (c.q === 0 && st.id === 'kill3' && w.zoneId === 'yard') {
    const h = livingHeroes(w)[0]; if (h) for (let i = 0; i < 3; i++) { const a = 0.6 + i * 0.7; const m = spawnMonster(w, 'peatwalker', h.x - Math.cos(a) * 9, h.z - Math.sin(a) * 9 + 3, { dormant: false }); if (!walkable(w, m.x, m.z, 0.4)) { m.x = h.x; m.z = h.z; snapToFloor(w, m); if (Math.hypot(m.x - h.x, m.z - h.z) < 2) { m.x += 4; snapToFloor(w, m); } } }
  }
  if (c.q === 0 && st.id === 'upgrade') { const h = livingHeroes(w)[0]; if (h) { const it = makeItem(w.lootRng, { slot: 'main', rarity: 'blessed', ilvl: 3, cls: h.cls, base: h.gear.main.base }); it.dps = Math.max(it.dps, h.gear.main.dps * 1.5); dropItem(w, it, h.x - 1.5, h.z + 1.5, h.seat); } }
}

/** Called for each sim event after a tick; updates quest progress. */
export function campaignEvent(w, e) {
  const c = w.camp; if (!c) return;
  const st = curStep(c); if (!st) return;
  if (e.t === 'kill' && !e.minion) {
    c.counters.kill = (c.counters.kill || 0) + 1;
    if (st.type === 'kill' && (!st.mon || e.type === st.mon) && (c.counters.kill >= st.n)) advance(w, 'kill');
  }
  if (e.t === 'equip' && st.type === 'equip' && w.zoneId === 'yard') advance(w, 'equip');
  if (e.t === 'interact') {
    if (st.type === 'use' && st.kind === 'shrine' && e.kind === 'shrine') advance(w, 'shrine');
  }
  if (e.t === 'coffinDone' && st.type === 'coffin') advance(w, 'coffin');
  if (e.t === 'use' && e.kind === 'exit' && st.type === 'reach' && (st.id !== 'climb' || (e.spot && e.spot.toZone === 'summit')) && !(e.spot && exitLock(w, c))) advance(w, 'reach');
  if (e.t === 'use') {
    if (st.type === 'use' && st.kind === 'npc' && e.kind === 'npc' && e.npc === st.npc) advance(w, 'talk');
    if (st.type === 'use' && st.kind === 'relic' && e.kind === 'relic' && quotaLeft(w) > 0) ev(w, { t: 'toast', seat: 0, text: `THE DEAD STILL STAND: ${quotaLeft(w)} MORE` });
    else if (st.type === 'use' && st.kind === 'relic' && e.kind === 'relic') { c.bones++; e.spot.used = true; ev(w, { t: 'toast', seat: 0, text: `RELIC BONE ${c.bones} OF 3` }); if (c.bones >= st.n) advance(w, 'relic'); }
    if (e.kind === 'rope' && st.type === 'rope') { e.spot.used = true; c.counters.rope = (c.counters.rope || 0) + 1; if (c.counters.rope >= st.n) advance(w, 'rope'); }
  }
  if (e.t === 'bossDead' && st.type === 'boss' && e.boss === st.boss) advance(w, 'boss');
}

/** Per-tick checks (movement, defend timers, reach). */
export function campaignTick(w, dt) {
  const c = w.camp; if (!c) return;
  const st = curStep(c); const h = livingHeroes(w)[0];
  if (st && st.type === 'move' && h) { c.moved += Math.hypot(h.mx || 0, h.mz || 0) * 5 * dt; if (c.moved >= st.n) advance(w, 'move'); }
  if (st && st.type === 'defend' && c.defend) tickDefend(w, c, st, dt);
  // exit gating
  for (const s of w.spots) if (s.kind === 'exit') { s.locked = exitLock(w, c); }
}
// The Toll: a zone's way on stays shut until enough of its dead are down again
export function quotaLeft(w) { const q = w.zoneQuota; return q ? Math.max(0, q.need - q.killed) : 0; }
export function exitLock(w, c) {
  const base = exitLockBase(w, c); if (base) return base;
  const n = quotaLeft(w); return n > 0 ? `THE DEAD STILL STAND: ${n} MORE` : '';
}
function exitLockBase(w, c) {
  const z = w.zoneId; const st = curStep(c);
  if (z === 'yard') return st && ['move', 'kill3', 'upgrade', 'shrine', 'coffin'].includes(st.id) ? 'NOT YET' : '';
  if (z === 'causeway') return st && st.id !== 'back' ? 'THE WAGON NEEDS YOU' : '';
  if (z === 'counting') return w.flags.bursarDead ? '' : 'THE BURSAR HOLDS THE DOOR';
  if (z === 'cloister') return st && st.id === 'novices' ? 'THE NOVICES NEED YOU' : '';
  if (z === 'chapter') return w.flags.ambroseDead ? '' : 'THE BISHOP HOLDS THE DOOR';
  return '';
}
function tickDefend(w, c, st, dt) {
  const d = c.defend; const near = livingHeroes(w).some((h) => Math.hypot(h.x - d.x, h.z - d.z) < 14);
  if (!near) { d.warn = (d.warn || 0) + dt; return; }
  d.t -= dt; d.spawn -= dt;
  if (d.spawn <= 0) {
    d.spawn = 5.5; const types = ZONES[w.zoneId].mon; const n = 3 + Math.min(5, d.wave++);
    for (let i = 0; i < n; i++) { const a = w.rng.range(0, 6.28), r = w.rng.range(8, 11); const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r; if (walkable(w, x, z, 0.4)) spawnMonster(w, types[w.rng.int(0, types.length - 1)], x, z, { dormant: false }); }
  }
  if (d.t <= 0) { c.defend = null; ev(w, { t: 'banner', text: st.id === 'novices' ? 'THE BELL TOLLS. THE NOVICES ARE SAFE' : 'THE WAGON REACHES THE ROAD', small: true }); ev(w, { t: 'sfx', name: 'bell_big' }); advance(w, 'defend'); }
}

// ---------------- zone scripts ----------------
export function onZoneLoaded(w, zoneId) {
  const c = w.camp; if (!c) return; const zone = w.zone; const def = w.zoneDef;
  c.visited[zoneId] = true;
  const place = (npc, x, z, face = 0, extra = {}) => { const n = NPCS[npc]; w.spots.push({ id: nid(w), kind: 'npc', npc, name: n.name, model: n.model, x, z, r: 1.0, scale: n.scale, face, ...extra }); };
  if (zoneId === 'town') {
    for (const m of zone.markers) {
      const map = { 1: ['crier', 0.4], 2: ['penny', -0.6], 3: ['brasse', 0.3], 4: ['ogive', -0.3], 5: null, 6: null, 7: null };
      if (m.t === '1') place('crier', m.x, m.z, 0.3); if (m.t === '2') place('penny', m.x, m.z, -0.6); if (m.t === '3' && c.q >= 2 || m.t === '3' && c.questsDone.length >= 1) place('brasse', m.x, m.z, 0.5);
      if (m.t === '4' && c.q >= 2) place('ogive', m.x, m.z, -0.4);
      if (m.t === '5') w.spots.push({ id: nid(w), kind: 'box', name: 'Collection Box', model: 'collection-box', x: m.x, z: m.z, r: 1.0, face: 0.5 });
      if (m.t === '6') w.spots.push({ id: nid(w), kind: 'board', name: 'Writ Board', x: m.x, z: m.z, r: 1.0 });
      if (m.t === '7' && (c.done || w.flags.lastBell)) w.spots.push({ id: nid(w), kind: 'font', name: 'Knell Font', model: 'knell-font', x: m.x, z: m.z, r: 1.2, face: 0 });
      if (m.t === 'Y') w.spots.push({ id: nid(w), kind: 'lychgate', name: 'Lychgate', model: 'lychgate', x: m.x, z: m.z, r: 1.3, n: 0, face: 0, reusable: true, unlocked: true });
    }
    // way out: leads to the current quest zone
    const ex = zone.entrance; w.spots.push({ id: nid(w), kind: 'gate', name: 'Out of Town', x: zone.w - 5, z: zone.h / 2, r: 1.5, toQuest: true, reusable: true });
    ev(w, { t: 'subtitle', who: 'crier', text: c.questsDone.length ? 'Hear ye, hear ye! The dead are still up, and so, regrettably, are you.' : NPCS.crier.lines[0] });
  }
  if (zoneId === 'yard') {
    const rooms = zone.rooms;
    const r2 = rooms[rooms.length - 1], r1 = rooms[Math.floor(rooms.length / 2)];
    // shrine and coffin in the later rooms; the gate to town is the exit
    const cx = (r2.x0 + r2.x1) / 2, cz = (r2.y0 + r2.y1) / 2;
    w.spots.push({ id: nid(w), kind: 'shrine', x: cx - 5, z: cz - 3, r: 0.8, name: 'Votive Shrine' });
    w.spots.push({ id: nid(w), kind: 'coffin', x: cx - 5, z: cz + 3, r: 0.9, name: 'Unquiet Coffin' });
    beginStep(w);
    ev(w, { t: 'subtitle', who: 'crier', text: NPCS.crier.lines[2] });
  }
  if (zoneId === 'causeway' && c.q === 1) {
    const rooms = zone.rooms; const r = rooms[Math.max(2, Math.floor(rooms.length * 0.55))];
    const bx = (r.x0 + r.x1) / 2, bz = (r.y0 + r.y1) / 2;
    place('brasse', bx, bz, 0, { gibbetCamp: true });
    c.defend = { x: bx, z: bz, t: 90, spawn: 4, wave: 0, active: false };
    w.flags.wagon = { x: bx + 2, z: bz };
    w.spots.push({ id: nid(w), kind: 'wagon', name: 'Wagon of Bells', model: 'cart', x: bx + 2.5, z: bz + 1, r: 1.2, face: 1 });
    // first Collection Plate scripted
    const pr = rooms[Math.min(rooms.length - 1, 3)]; spawnMonster(w, 'collection_plate', (pr.x0 + pr.x1) / 2, (pr.y0 + pr.y1) / 2, { dormant: true, level: monsterLevel(w) });
  }
  if (zoneId === 'cloister' && c.q === 3) {
    const r = zone.rooms[Math.floor(zone.rooms.length / 2)]; c.defend = { x: (r.x0 + r.x1) / 2, z: (r.y0 + r.y1) / 2, t: 100, spawn: 4, wave: 0 };
    for (let i = 0; i < 3; i++) w.spots.push({ id: nid(w), kind: 'novice', name: 'Novice', model: 'npc-ogive', x: c.defend.x + (i - 1) * 1.5, z: c.defend.z + 2, r: 0.6, scale: 0.8, face: 3.14 });
  }
  if (def.boss && def.next && zone.authored) { const p = { x: Math.floor(zone.w / 2) + 0.5, z: 2.5 }; snapToFloor(w, p); w.spots.push({ id: nid(w), kind: 'exit', x: p.x, z: p.z, r: 1.0, name: 'Way on', toZone: def.next }); }
  if (def.boss && zone.markers.some((m) => m.t === 'Z')) {
    const z = zone.markers.find((m) => m.t === 'Z'); startBoss(w, def.boss, z.x, z.z);
  }
  if (['ossuary1', 'ossuary2', 'ossuary3'].includes(zoneId) && c.q === 2) {
    const n = Number(zoneId.slice(-1)); const ex = zone.exit; { const p = { x: ex.x, z: ex.z - 4.5 }; snapToFloor(w, p); w.spots.push({ id: nid(w), kind: 'relic', n, name: 'Relic Bone', x: p.x, z: p.z, r: 0.8, hold: 0.8 }); }
  }
  if (zoneId === 'summit') {
    for (const m of zone.markers) if (m.t === 'O') w.spots.push({ id: nid(w), kind: 'rope', name: 'Bell Rope', model: 'bell-rope', x: m.x, z: m.z, r: 1.0, hold: 2, hidden: true });
  }
  // lore books
  const li = LORE_ZONES[zoneId];
  if (li && !w.zone.authored) { const r = zone.rooms[Math.min(zone.rooms.length - 1, 1)]; li.slice(0, 1).forEach((bi, k) => w.spots.push({ id: nid(w), kind: 'book', name: 'Lore Book', x: r.x0 + 3 + k * 2, z: r.y0 + 3, r: 0.7, lore: bi })); }
  // lychgates attuned state
  for (const s of w.spots) if (s.kind === 'lychgate' && s.n && c.lychgates[zoneId + ':' + s.n]) s.unlocked = true;
  // plates
  if (def.mon && def.mon.length && !def.tutorial && !def.scripted && w.rng.chance(0.125)) {}
}
export function onUseSpot(w, h, s) { /* UI-level reactions are in the game */ }

export function canTravel(c, zoneId) { return !!c.visited[zoneId]; }
export function questZone(c) { const q = curQuest(c); return q ? q.zone : 'town'; }
