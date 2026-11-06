// A bot that plays: fights, loots, follows objectives, equips upgrades. Used by attract mode, dev mode, co-op fill and every playthrough test.
import { CLASSES, SKILLS } from '../data/classes.js';
import { canWear, itemScore } from './loot.js';
import { objective, visibleProp } from './quests.js';
import { interactTarget } from './step.js';
import { near } from './world.js';
import { effectiveSkill } from './effects.js';

const KIT = {
  bellwarden: ['clout', 'chain_reap', 'great_toll', 'reverberate', 'bellfall', 'clapper_charge', 'last_peal', 'hallowed_ground'],
  lamplighter: ['spark_bolt', 'lantern_hurl', 'flare', 'lamp_post', 'snuff', 'long_nights_end', 'beacon', 'dusk_step'],
  sexton: ['shovel_swat', 'bone_toss', 'raise_pallbearers', 'coffin_drop', 'exhume', 'last_rites', 'danse_macabre', 'gravewalk'],
};
export function makeBot(o = {}) { return { path: null, pathT: 0, goal: null, invT: 0, stuck: 0, lastX: 0, lastZ: 0, zone: null, wander: 0, ...o }; }

const nearestFoe = (w, h, r) => { let best = null; let bd = r; for (const m of w.active) { if (m.dead || m.untargetable || m.statue) continue; const d = Math.hypot(m.x - h.x, m.z - h.z); const score = d - (m.defn.boss ? 6 : 0) - (m.type === 'collection_plate' ? 6 : 0) - (m.defn.brain === 'necro' ? 4 : 0); if (score < bd && (d < 1.5 || w.zone.nav.lineOfSight(h.x, h.z, m.x, m.z))) { bd = score; best = m; } } return best; };

function manage(w, h, b, cmds) {
  // Equip anything better; salvage what isn't; keep the pack open.
  b.invT -= 1 / 60; if (b.invT > 0) return; b.invT = 1.5;
  const bestBy = {};
  for (const it of h.inv) { if (!canWear(it, h)) continue; const s = itemScore(it, h); if (!bestBy[it.slot] || s > bestBy[it.slot].s) bestBy[it.slot] = { s, it }; }
  for (const slot of Object.keys(bestBy)) { const cur = h.gear[slot]; const curS = cur ? itemScore(cur, h) : -1; if (bestBy[slot].s > curS) { cmds.push({ c: 'equip', uid: bestBy[slot].it.uid }); return; } }
  if (h.inv.length > 28) { const junk = h.inv.find((i) => i.rarity !== 'legendary' && i.rarity !== 'set') ?? h.inv[0]; cmds.push({ c: 'salvage', uid: junk.uid }); return; }
  // Vows and skills.
  const vowsAvail = (h.level >= 15 ? 2 : h.level >= 5 ? 1 : 0);
  if (h.vows.length < vowsAvail) { const v = CLASSES[h.cls].vows.find((x) => !h.vows.includes(x.id)); if (v) cmds.push({ c: 'setVow', index: h.vows.length, vow: v.id }); return; }
  // Later skills beat earlier ones in the bar once slots fill: keep the newest six.
  const opens = [1, 1, 3, 6, 9, 12].filter((L) => h.level >= L).length;
  const want = (KIT[h.cls] ?? []).filter((id) => h.level >= SKILLS[id].level).slice(0, opens);
  for (let i = 0; i < opens; i++) if (want[i] && h.slots[i].skill !== want[i]) { cmds.push({ c: 'setSkill', slot: i, skill: want[i] }); return; }
}

function pathTo(w, h, b, x, z) {
  b.pathT -= 1 / 60;
  const moved = b.goal && Math.hypot(b.goal.x - x, b.goal.z - z) > 1.5;
  if (!b.path || b.pathT <= 0 || moved || b.zone !== w.zone.id) {
    b.path = w.zone.nav.path([h.x, 0, h.z], [x, 0, z]);
    b.pathT = 0.8; b.goal = { x, z }; b.i = 1; b.zone = w.zone.id;
  }
  if (!b.path) return null;
  while (b.i < b.path.length - 1 && Math.hypot(b.path[b.i][0] - h.x, b.path[b.i][2] - h.z) < 0.6) b.i++;
  const p = b.path[Math.min(b.i, b.path.length - 1)] ?? [x, 0, z];
  const dx = p[0] - h.x; const dz = p[2] - h.z; const d = Math.hypot(dx, dz) || 1;
  return { x: dx / d, z: dz / d, d: Math.hypot(x - h.x, z - h.z) };
}

function pickSlot(w, h, target, dist) {
  // Spend what we can: big things first, generators as filler.
  let best = -1; let bestScore = -1;
  for (let i = 0; i < 6; i++) {
    const s = h.slots[i]; if (!s?.skill || h.level < [1, 1, 3, 6, 9, 12][i]) continue;
    const sk = SKILLS[s.skill];
    const ready = (h.cds[s.skill] ?? 0) <= w.time;
    const cost = sk.cost ?? 0;
    if (!ready && !w.cheats.noCd) continue;
    if (h.res < cost && !w.cheats.infRes) continue;
    const op = sk.fx[0]; const reach = op.range ?? op.radius ?? op.dist ?? sk.range ?? 8;
    if (dist > reach + 1.5 && !sk.target) continue;
    if (s.skill === 'exhume' && w.graves.filter((g) => near(g, h.x, h.z, 12)).length < 2) continue;
    if (s.skill === 'snuff' && !w.active.some((m) => m.status.burn && near(m, h.x, h.z, 14))) continue;
    if (s.skill === 'hallowed_ground' && h.hp > h.stats.maxHp * 0.7) continue;
    const score = (sk.cd ?? 0) * 2 + cost + (sk.gen || sk.genPerTarget ? 0 : 5) + (i === (w.tick >> 6) % 6 ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

// Anything that wants to move but hasn't in 2 s shuffles sideways for a moment.
export function botIntent(w, h, b, cmds = []) {
  const it = thinkBot(w, h, b, cmds);
  if (h.dead || h.left) return it;
  if (Math.hypot(it.moveX, it.moveZ) < 0.2) { b.jamN = 0; b.jamX = h.x; b.jamZ = h.z; return it; }
  b.jamN = (b.jamN ?? 0) + 1;
  if (b.jamN >= 120) { if (Math.hypot(h.x - (b.jamX ?? h.x), h.z - (b.jamZ ?? h.z)) < 0.6 && !b.jamT) { b.jamT = 50; b.jamA = (w.tick * 2.399) % 6.283; b.pathT = 0; } b.jamN = 0; b.jamX = h.x; b.jamZ = h.z; }
  if (b.jamT > 0) { b.jamT--; it.moveX = Math.cos(b.jamA); it.moveZ = Math.sin(b.jamA); }
  return it;
}
function thinkBot(w, h, b, cmds) {
  const it = { moveX: 0, moveZ: 0, pressed: {}, held: {} };
  if (h.left) return it;
  if (h.dead) {
    if (w.round) return it;
    if (h.deadT > h.respawnWait + 0.1) cmds.push({ c: 'respawn', how: b.deaths2 && w.zone.spec.boss ? 'here' : 'here' });
    return it;
  }
  if (!w.round || w.tick % 90 === 0) manage(w, h, b, cmds);
  if (h.levelPicks?.length) cmds.push({ c: 'pick', i: 0 });
  if (h.hp < h.stats.maxHp * 0.5 && h.potionCd <= 0) it.pressed.potion = true;
  // Roll out of anything about to land.
  if (h.dodgeCd <= 0) for (const t of w.telegraphs) { if (t.left > 0.45) continue; const inside = t.kind === 'line' ? segDist(t, h) < (t.width ?? 1) : t.kind === 'circle' ? near(h, t.x, t.z, t.r) : near(h, t.x, t.z, t.r) && !near(h, t.x, t.z, t.inner ?? 0); if (inside && t.dmg) { it.pressed.dodge = true; const dx = h.x - t.x; const dz = h.z - t.z; const d = Math.hypot(dx, dz) || 1; it.moveX = dx / d; it.moveZ = dz / d; return it; } }
  const obj = w.cheatObjective ?? objective(w);
  w._botObj = obj;
  // Malison's toll: get behind a pillar.
  const mb = w.boss?.m?.bossState;
  if (mb && w.boss.m.defn.boss === 'malison' && mb.phase === 2 && mb.d < 4 && w.pillars?.length) {
    const cx = w.zone.w / 2; const cz = w.zone.h / 2;
    const ps = w.pillars.filter((p) => !p.broken).sort((p1, p2) => Math.hypot(p1.x - h.x, p1.z - h.z) - Math.hypot(p2.x - h.x, p2.z - h.z));
    if (ps[0]) { const p = ps[0]; const dx = p.x - cx; const dz = p.z - cz; const d = Math.hypot(dx, dz) || 1; const gx = p.x + (dx / d) * 2; const gz = p.z + (dz / d) * 2; const r = pathTo(w, h, b, gx, gz); if (r && r.d > 0.5) { it.moveX = r.x; it.moveZ = r.z; return it; } return it; }
  }
  // Phase three: the rope comes before the fight.
  const ropeGoal = obj?.hold;
  const foe = ropeGoal ? null : nearestFoe(w, h, w.wagon?.active || w.coffin || w.novices?.active ? 16 : 10);
  if (foe) {
    b.why = 'foe:' + foe.type + ':' + (foe.x | 0) + ',' + (foe.z | 0);
    const dx = foe.x - h.x; const dz = foe.z - h.z; const d = Math.hypot(dx, dz) || 1;
    it.aimX = dx / d; it.aimZ = dz / d; it.tx = foe.x; it.tz = foe.z;
    const slot = pickSlot(w, h, foe, d - foe.r);
    const reach = CLASSES[h.cls].id === 'lamplighter' ? 9 : h.cls === 'sexton' ? 8 : 2.4;
    if (slot >= 0) { const sk = SKILLS[h.slots[slot].skill]; const op = sk.fx[0]; const r = op.range ?? op.radius ?? op.dist ?? sk.range ?? 8; if (d - foe.r <= r || sk.target) it.pressed[`s${slot}`] = true; }
    // Throwing at something for 3 s with no effect means a wall is in the way: walk up to it.
    if (b.foeId !== foe.id || foe.hp < (b.foeHp ?? 0)) { b.foeId = foe.id; b.foeHp = foe.hp; b.foeT = 0; } else b.foeT = (b.foeT ?? 0) + 1 / 60;
    if (d - foe.r > (b.foeT > 3 ? 1.5 : reach)) { const r = pathTo(w, h, b, foe.x, foe.z); if (r) { it.moveX = r.x; it.moveZ = r.z; } }
    else if (foe.defn.boss && h.cls === 'lamplighter' && d < 6) { it.moveX = -dx / d; it.moveZ = -dz / d; }
    return it;
  }
  // Loot within reach.
  let loot = null; let ld = 12;
  if (b.loot && !b.ignore?.has(b.loot)) loot = w.drops.find((d) => d.id === b.loot) ?? null;
  if (loot) { b.lootT = (b.lootT ?? 0) + 1 / 60; if (b.lootT > 7) { (b.ignore ??= new Set()).add(loot.id); loot = null; b.loot = null; } }
  if (!loot) {
    b.lootT = 0;
    for (const dr of w.drops) { if (dr.seat >= 0 && dr.seat !== h.seat) continue; if (b.ignore?.has(dr.id)) continue; if (dr.kind === 'gold' || dr.kind === 'coins') continue; if (dr.kind === 'item' && h.inv.length >= 40) continue; const d = Math.hypot(dr.x - h.x, dr.z - h.z); if (d < ld && (d < 4 || w.zone.nav.lineOfSight(h.x, h.z, dr.x, dr.z))) { ld = d; loot = dr; } }
  }
  if (loot) { b.why = 'loot'; b.loot = loot.id; const r = pathTo(w, h, b, loot.x, loot.z); if (r) { it.moveX = r.x; it.moveZ = r.z; return it; } (b.ignore ??= new Set()).add(loot.id); b.loot = null; }
  // Used things on the way: a nearby shrine.
  if (!w.round) {
    const sees = (p) => w.zone.nav.lineOfSight(h.x, h.z, p.x, p.z);
    const shrine = w.props.find((p) => p.kind === 'shrine' && !p.used && !p.botSkip && near(p, h.x, h.z, 14) && sees(p));
    const chest = w.props.find((p) => p.kind === 'chest' && !p.used && !p.botSkip && near(p, h.x, h.z, 14) && sees(p));
    const gate = b.touchGates ? w.props.find((p) => p.kind === 'lychgate' && !p.touched && !p.botSkip && near(p, h.x, h.z, 18) && sees(p)) : null;
    let extra = chest ?? shrine ?? gate;
    if (extra) { b.tried ??= {}; b.tried[extra.id] = (b.tried[extra.id] ?? 0) + 1 / 60; if (b.tried[extra.id] > 8) { extra.botSkip = true; } }
    if (extra?.botSkip) extra = null;
    if (extra) {
      b.why = 'extra:' + extra.kind + ':' + extra.x + ',' + extra.z;
      const r = pathTo(w, h, b, extra.x, extra.z);
      if (r) { if (r.d < 1.9 && extra.kind !== 'lychgate') { it.pressed.interact = true; it.interactId = extra.id; return it; } it.moveX = r.x; it.moveZ = r.z; return it; }
    }
    // Things in the way: break what's close.
    const pr = w.props.find((p) => p.kind === 'breakable' && !p.broken && near(p, h.x, h.z, 2.5));
    if (pr && h.slots[0].skill) { const dx = pr.x - h.x; const dz = pr.z - h.z; const d = Math.hypot(dx, dz) || 1; it.aimX = dx / d; it.aimZ = dz / d; it.pressed.s0 = true; }
  }
  if (!obj) {
    if (w.knell && w.knell.stage !== 'done') return exploreKnell(w, h, b, it);
    return it;
  }
  if (obj.zone && obj.zone !== w.zone.id) return goZone(w, h, b, it, obj.zone, cmds);
  if (obj.x === undefined) return wanderToFoes(w, h, b, it);
  b.why = 'obj';
  // She has come to stand on the last rope: lead her away across the arena, then run back.
  if (obj.hold && w.boss?.m) {
    const m = w.boss.m; const dr = Math.hypot(m.x - obj.x, m.z - obj.z);
    if (dr < 5) b.lure = true; else if (dr > 14) b.lure = false;
    if (b.lure) { const cx = w.zone.w / 2; const cz = w.zone.h / 2; const dx = cx - obj.x; const dz = cz - obj.z; const d = Math.hypot(dx, dz) || 1; const rl = pathTo(w, h, b, obj.x + (dx / d) * 24, obj.z + (dz / d) * 24); if (rl) { b.why = 'lure'; it.moveX = rl.x; it.moveZ = rl.z; return it; } }
  }
  // Go there. Blocked by a portcullis? Find the lever.
  const r = pathTo(w, h, b, obj.x, obj.z);
  if (!r) { const lever = w.props.find((p) => p.kind === 'lever' && !p.used); if (lever) { const rl = pathTo(w, h, b, lever.x, lever.z); if (rl) { if (rl.d < 2) { it.pressed.interact = true; it.interactId = lever.id; return it; } it.moveX = rl.x; it.moveZ = rl.z; return it; } } return wanderToFoes(w, h, b, it); }
  if (obj.prop !== undefined && r.d < 2.2) {
    if (obj.hold) { it.held.interact = true; it.interactId = obj.prop; it.moveX = 0; it.moveZ = 0; return it; }
    it.pressed.interact = true; it.interactId = obj.prop; return it;
  }
  if (obj.guard) { if (r.d > 3) { it.moveX = r.x; it.moveZ = r.z; } return it; }
  if (r.d > 0.5) { it.moveX = r.x; it.moveZ = r.z; }
  return it;
}
const segDist = (t, h) => { const dx = t.x2 - t.x; const dz = t.z2 - t.z; const L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((h.x - t.x) * dx + (h.z - t.z) * dz) / L2)); return Math.hypot(h.x - (t.x + dx * u), h.z - (t.z + dz * u)); };

function goZone(w, h, b, it, zone, cmds) {
  const direct = w.props.filter((p) => p.kind === 'exit' && p.to === zone && visibleProp(w, p)).sort((a, c) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(c.x - h.x, c.z - h.z))[0];
  if (direct) { const r = pathTo(w, h, b, direct.x, direct.z); if (r) { if (r.d < 2.2) { it.pressed.interact = true; it.interactId = direct.id; return it; } it.moveX = r.x; it.moveZ = r.z; return it; } const lever = w.props.find((p) => p.kind === 'lever' && !p.used); if (lever) { const rl = pathTo(w, h, b, lever.x, lever.z); if (rl) { if (rl.d < 2) { it.pressed.interact = true; it.interactId = lever.id; return it; } it.moveX = rl.x; it.moveZ = rl.z; return it; } } return wanderToFoes(w, h, b, it); }
  if (w.zone.id === 'town' && w.story.lychgates.includes(zone)) { cmds.push({ c: 'travel', zone }); return it; }
  if (w.zone.id === 'town') { // The road isn't open yet: one that is leads on.
    const back = zone.startsWith('ossuary') ? 'ossuary1' : zone.startsWith('belfry') ? 'belfry1' : zone === 'countinghouse' ? 'ossuary1' : zone === 'pantry' ? 'causeway' : null;
    if (back && w.story.lychgates.includes(back)) { cmds.push({ c: 'travel', zone: back }); return it; }
    return it;
  }
  const up = w.props.find((p) => p.kind === 'exit' && p.to === 'town');
  if (up && !w.boss) { const r = pathTo(w, h, b, up.x, up.z); if (r && r.d < 25) { if (r.d < 2.2) { it.pressed.interact = true; it.interactId = up.id; return it; } it.moveX = r.x; it.moveZ = r.z; return it; } }
  if (!b.bellT || w.time > b.bellT) { b.bellT = w.time + 3; cmds.push({ c: 'bell' }); }
  return it;
}
function exploreKnell(w, h, b, it) {
  // Find the nearest dormant or awake thing and go hit it; failing that, take the stairs.
  let best = null; let bd = 1e9;
  for (const m of w.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - h.x, m.z - h.z); if (d < bd) { bd = d; best = m; } }
  if (best) { const r = pathTo(w, h, b, best.x, best.z); if (r) { it.moveX = r.x; it.moveZ = r.z; return it; } }
  const ex = w.props.find((p) => p.kind === 'exit'); if (ex) { const r = pathTo(w, h, b, ex.x, ex.z); if (r) { if (r.d < 2.2) { it.pressed.interact = true; it.interactId = ex.id; return it; } it.moveX = r.x; it.moveZ = r.z; return it; } }
  return it;
}
function wanderToFoes(w, h, b, it) { return exploreKnell(w, h, b, it); }
export { effectiveSkill, interactTarget };
