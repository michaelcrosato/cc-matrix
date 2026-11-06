// stepWorld: one 60 Hz step of the whole world. Deterministic: same seed and intents, same hash.
import { CLASSES } from '../data/classes.js';
import { LORE } from '../data/lore.js';
import { SHRINES } from '../data/monsters.js';
import { DT, emit, enterZone, findOpenNear, near, nearestHero, createWorld, walkable, livingHeroes } from './world.js';
import { addBuff, autoAssignSkills, grantXp, levelUp, makeHero, refresh, reviveHero, starterGear, stepHero } from './hero.js';
import { stepFields, stepProjectiles } from './effects.js';
import { separation, stepBeams, stepGraves, stepMonster, stepRequiem, stepTelegraphs, telegraph, wake } from './monsters.js';
import { HOOKS, addProp, dropItem, grantGem, stepAllies, stepDrops, dropGold, goldAmount } from './rules.js';
import { dialogFor, openCoffin, stepQuests, visibleProp, afterTalk, finishWrit } from './quests.js';
import { stepKnell } from './knell.js';
import { ringRope } from './bosses.js';
import { makeItem } from './loot.js';
import { stepRound } from './round.js';
import { applyCommand } from './commands.js';

export function newWorld(opts = {}) {
  const w = createWorld(opts);
  w.hooks = { ...HOOKS, telegraph, bonusXp: (w2, h, n) => grantXp(w2, h, n), grantLevel: (w2, h) => levelUp(w2, h), devRing: (w2, h) => { const r = w2.props.find((p) => p.kind === 'rope' && !p.used); if (r) ringRope(w2, r, h); } };
  w.hooksExtra = { passingBell, levelPick: (w2, h, i) => w2.hooks.levelPick?.(w2, h, i) };
  w.hooks.levelUp = (w2, h) => { w2.hooks.levelPickQueue?.(w2, h); };
  return w;
}

export function addHero(w, o) {
  const h = makeHero(w, o);
  if (!o.gear) starterGear(w, h, Math.max(1, (o.level ?? 1) - 1));
  autoAssignSkills(h);
  refresh(w, h); h.hp = h.stats.maxHp;
  w.heroes.push(h);
  if (w.zone) { const p = findOpenNear(w, w.heroes[0].x + 1, w.heroes[0].z + 1); h.x = p.x; h.z = p.z; h.px = h.x; h.pz = h.z; }
  return h;
}

export function hasRope(w) { return w.props.some((p) => p.kind === 'rope' && !p.used); }

const EMPTY = { moveX: 0, moveZ: 0, pressed: {}, held: {} };
export function stepWorld(w, intents) {
  w.tick++; w.time += DT;
  // Timers fire before everything else moves.
  if (w.timers.length) { const due = w.timers.filter((t) => t.at <= w.time); if (due.length) { w.timers = w.timers.filter((t) => t.at > w.time); for (const t of due) t.fn(); } }
  // Flow fields follow each seat; dormant packs wake within 30 m.
  for (const h of w.heroes) if (!h.left && !h.dead) w.navs[h.seat % 4].flowTo(h.x, h.z);
  if (w.tick % 20 === 0) for (const m of w.monsters) if (m.dormant) { for (const h of w.heroes) if (!h.left && near(h, m.x, m.z, 30)) { wake(w, m); break; } }
  w.active = w.monsters.filter((m) => !m.dead && !m.dormant);
  for (const h of w.heroes) {
    const it = intents[h.seat] ?? EMPTY;
    stepHero(w, h, it);
    stepInteract(w, h, it);
    if (!walkable(w, h.x, h.z) && !w.cheats.noClip && !h.moveDash) { const p = findOpenNear(w, h.x, h.z); h.x = p.x; h.z = p.z; }
    if (w.tick % 15 === 0 && w.zone.explored) reveal(w, h);
  }
  for (const m of w.active) if (!m.dead) stepMonster(w, m);
  if (w.tick % 2 === 0) separation(w);
  stepAllies(w);
  stepProjectiles(w);
  stepFields(w);
  stepTelegraphs(w);
  stepBeams(w);
  stepTraps(w);
  stepGates(w);
  stepDrops(w);
  stepGraves(w);
  stepRequiem(w);
  stepQuests(w);
  stepKnell(w);
  stepRound(w);
  if (w.tick % 300 === 0) w.monsters = w.monsters.filter((m) => !m.dead || m.defn.boss);
}
function stepGates(w) {
  if (w.tick % 20 !== 0) return;
  for (const p of w.props) {
    if (p.kind !== 'lychgate' || p.touched) continue;
    if (w.heroes.some((h) => !h.left && near(h, p.x, p.z, 3.5))) {
      p.touched = true; w.story.gates = w.story.gates ?? {}; w.story.gates[p.zoneId + ':' + Math.round(p.x)] = 1;
      if (!w.story.lychgates.includes(p.zoneId)) w.story.lychgates.push(p.zoneId);
      emit(w, { t: 'toast', seat: -1, text: 'A LYCHGATE LIGHTS. YOU MAY TRAVEL FROM HERE.', color: 'sky' }); emit(w, { t: 'sfx', id: 'bell_small' }); emit(w, { t: 'tutorial', seat: 0, id: 'lychgate' }); emit(w, { t: 'save' });
    }
  }
}
function reveal(w, h) {
  const z = w.zone; const R = 11; const cx = Math.floor(h.x); const cz = Math.floor(h.z);
  for (let y = Math.max(0, cz - R); y <= Math.min(z.h - 1, cz + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(z.w - 1, cx + R); x++) if ((x - cx) ** 2 + (y - cz) ** 2 <= R * R) z.explored[y * z.w + x] = 1;
}
function stepTraps(w) {
  for (const p of w.props) {
    if (p.kind !== 'trap') continue;
    p.cycle -= DT;
    if (p.cycle <= 0) {
      p.cycle = 4;
      if (!w.heroes.some((h) => !h.left && near(h, p.x, p.z, 16))) continue;
      w.hooks.trapFire?.(w, p);
      emit(w, { t: 'trap', id: p.id });
      w.hooks.telegraph?.(w, { kind: 'circle', x: p.x, z: p.z, r: 1.3, dur: 0.7, dmg: 8 + w.zone.spec.levelFloor * 6, level: w.zone.spec.levelFloor, name: 'A FLOOR TRAP', sfx: 'spikes' });
    }
  }
}

// Interaction: tap when something's close and no hostile within 4 m, or hold always. The router decides; the intent says.
export const INTERACT_R = 2.2;
export function interactTarget(w, h, cycle = 0) {
  const list = w.props.filter((p) => p.interact && !p.used && visibleProp(w, p) && near(p, h.x, h.z, INTERACT_R + (p.r ?? 1) * 0.6));
  list.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z));
  for (const o of w.heroes) if (o !== h && o.dead && !o.left && near(o, h.x, h.z, 2.5)) list.unshift({ kind: 'revive', hero: o, x: o.x, z: o.z, label: `REVIVE ${o.name}`, hold: 2, id: -o.id });
  if (!list.length) return null;
  return list[cycle % list.length];
}
function stepInteract(w, h, it) {
  if (h.dead || h.left) return;
  if (h.state === 'dodge') return;
  const target = it.interactId !== undefined ? (w.props.find((p) => p.id === it.interactId && p.interact && !p.used && near(p, h.x, h.z, INTERACT_R + (p.r ?? 1))) ?? null) : interactTarget(w, h, it.cycle ?? 0);
  h.interactTarget = target;
  if (!target) { if (h.channel?.kind === 'hold') h.channel = null; return; }
  if (target.hold) {
    if (it.held?.interact) {
      if (!h.channel) h.channel = { kind: 'hold', t: 0, dur: target.hold, hold: 'interact', target, done: (w2, he) => useProp(w2, he, target) };
    } else if (h.channel?.kind === 'hold') h.channel = null;
    return;
  }
  if (it.pressed?.interact) useProp(w, h, target);
}

export function useProp(w, h, p) {
  emit(w, { t: 'tutorial', seat: h.seat, id: 'interact' });
  switch (p.kind) {
    case 'revive': reviveHero(w, p.hero, null, 0.5); h.revives++; emit(w, { t: 'toast', seat: -1, text: `${p.hero.name} IS UP AGAIN.`, color: 'lime' }); break;
    case 'chest': {
      p.used = true; emit(w, { t: 'chest', id: p.id, x: p.x, z: p.z }); emit(w, { t: 'sfx', id: 'chest', x: p.x, z: p.z });
      for (const he of w.heroes) { if (he.left) continue; for (let i = 0; i < (p.rich ? 10 : 5); i++) dropGold(w, p.x, p.z, goldAmount(w, 1.2), 2, he.seat); dropItem(w, p.x, p.z, makeItem(w.rngs.loot, { rarity: p.rich || w.rngs.loot.chance(0.3) ? 'reliquary' : 'blessed', ilvl: Math.max(he.level, w.zone.spec.levelFloor), cls: he.cls }), he.seat); if (p.rich) grantGem(w, he, p.x, p.z); }
      break;
    }
    case 'shrine': {
      p.used = true; const s = SHRINES[p.shrine];
      for (const he of w.heroes) { if (he.left) continue; he.shrines = (he.shrines ?? 0) + 1;
        if (p.shrine === 'ardour') addBuff(w, he, { id: 'ardour', dur: 30, dmg: 0.5 });
        if (p.shrine === 'haste') addBuff(w, he, { id: 'haste', dur: 30, speed: 0.3 });
        if (p.shrine === 'ward') { he.shield = he.stats.maxHp * 0.3; addBuff(w, he, { id: 'ward', dur: 30, shield: true }); }
        if (p.shrine === 'plenty') addBuff(w, he, { id: 'plenty', dur: 30 });
      }
      emit(w, { t: 'shrine', id: p.id, x: p.x, z: p.z }); emit(w, { t: 'toast', seat: -1, text: `${s.name}: ${s.desc}`, color: s.color, big: true }); emit(w, { t: 'sfx', id: 'shrine' });
      break;
    }
    case 'coffin': openCoffin(w, p); for (const j of w.story.writs ?? []) if (!j.done && j.kind === 'coffin' && j.zone === w.zone.id) finishWrit(w, j); break;
    case 'exit': {
      if (p.to === 'town' && w.knell && w.knell.stage === 'done') { w.knell = null; emit(w, { t: 'knell', on: false }); }
      enterZone(w, p.to, p.at ?? exitAt(w, p));
      for (const o of w.heroes) if (o.dead) reviveHero(w, o, null, 1);
      emit(w, { t: 'save' });
      break;
    }
    case 'lychgate': {
      emit(w, { t: 'open', seat: h.seat, screen: 'map', travel: true }); h.lychUsed = (h.lychUsed ?? 0) + 1;
      break;
    }
    case 'lever': {
      p.used = true; const port = w.props.find((o) => o.id === p.port);
      if (port) { for (const c of port.cells) { w.zone.nav.setOpen(c.col, c.row, true); for (const n of w.navs) n.setOpen(c.col, c.row, true); } port.gone = true; port.interact = false; emit(w, { t: 'portcullis', id: port.id, x: port.x, z: port.z }); }
      emit(w, { t: 'sfx', id: 'lever', x: p.x, z: p.z }); emit(w, { t: 'lever', id: p.id }); h.levers = (h.levers ?? 0) + 1;
      break;
    }
    case 'relic': { p.used = true; w.story.flags[`relic_${p.relic}`] = true; emit(w, { t: 'toast', seat: -1, text: "A PIECE OF SAINT GLOAM. IT IS WARM.", color: 'orange', big: true }); emit(w, { t: 'sfx', id: 'bell_small' }); emit(w, { t: 'relic', id: p.id }); emit(w, { t: 'save' }); break; }
    case 'npc': { const d = dialogFor(w, p.npc); emit(w, { t: 'npc', seat: h.seat, npc: p.npc, d, id: p.id }); h.talked = h.talked ?? {}; h.talked[p.npc] = 1; break; }
    case 'stash': emit(w, { t: 'open', seat: h.seat, screen: 'stash' }); break;
    case 'knellfont': emit(w, { t: 'open', seat: h.seat, screen: 'knell' }); break;
    case 'writs': emit(w, { t: 'open', seat: h.seat, screen: 'writs' }); break;
    case 'lore': { w.lore[p.lore] = 1; emit(w, { t: 'open', seat: h.seat, screen: 'lore', lore: p.lore }); emit(w, { t: 'loreread', id: p.lore, title: LORE[p.lore].title }); break; }
    case 'book': { p.used = true; w.story.flags.overdueBook = true; emit(w, { t: 'toast', seat: -1, text: 'THE OVERDUE BOOK. THE CRIER WILL WANT THIS.', color: 'sand', big: true }); emit(w, { t: 'relic', id: p.id }); break; }
    case 'novices': { p.used = true; w.novices = { x: p.x, z: p.z, t: 45, waveT: 1, active: true }; emit(w, { t: 'defend', on: true, dur: 45 }); emit(w, { t: 'say', who: 'pyx', text: 'Bless you. Duck.' }); emit(w, { t: 'toast', seat: -1, text: 'HOLD HERE FOR 45 SECONDS.', color: 'sand', big: true }); break; }
    case 'rope': { p.used = true; ringRope(w, p, h); break; }
    case 'classfont': { w.hooks.classFontUse?.(w, h, p); break; }
    case 'portal': { p.used = true; const r = w.returnTo; w.returnTo = null; const pid = p.id; w.props = w.props.filter((o) => o.id !== pid); emit(w, { t: 'propgone', id: pid }); enterZone(w, r.zone, { x: r.x, z: r.z }); break; }
    default: break;
  }
}
function exitAt(w, p) {
  // Coming back up leaves you by the stairs you went down.
  const c = w.zoneCache.get(p.to);
  if (c) { const back = c.props.find((o) => o.kind === 'exit' && o.to === w.zone.id); if (back) return { x: back.x + 1.5, z: back.z + 1 }; }
  return null;
}

// The Passing Bell: a portal to town and back. Not in Knell Runs or sessions.
export function passingBell(w, h) {
  if (w.knell || w.round || w.mode !== 'campaign') return false;
  if (w.zone.id === 'town' || w.zone.spec.boss && w.boss) return false;
  w.returnTo = { zone: w.zone.id, x: h.x, z: h.z };
  enterZone(w, 'town');
  const t = w.zone.marks.find((m) => m.kind === 'r');
  const pr = addProp(w, { kind: 'portal', x: t.x, z: t.z, model: 'portal', interact: true, label: 'THE PASSING BELL: BACK', r: 1.3 });
  emit(w, { t: 'propadd', id: pr.id, kind: 'portal', x: pr.x, z: pr.z, model: 'portal', label: pr.label });
  h.bellUsed = (h.bellUsed ?? 0) + 1;
  emit(w, { t: 'sfx', id: 'bell_small' });
  return true;
}

export function simHash(w) {
  let n = (w.tick * 31 + w.nextId) | 0;
  const mix = (v) => { n = (Math.imul(n, 16777619) ^ Math.round(v * 16)) | 0; };
  for (const h of w.heroes) { mix(h.x); mix(h.z); mix(h.hp); mix(h.level); mix(h.gold); }
  for (const m of w.monsters) { if (m.dead) continue; mix(m.id); mix(m.x); mix(m.z); mix(m.hp); }
  mix(w.drops.length); mix(w.rngs.loot.state); mix(w.rngs.combat.state);
  return n >>> 0;
}
export { applyCommand, CLASSES, nearestHero, livingHeroes, createWorld };
