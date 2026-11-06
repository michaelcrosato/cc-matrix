// The story: five quests as steps. Each step's objective tells the HUD, the map and the bot where to go.
import { ZONES } from '../data/zones.js';
import { MONSTERS } from '../data/monsters.js';
import { CLASS_IDS } from '../data/classes.js';
import { DT, after, emit, enterZone, findOpenNear, near, placeParty } from './world.js';
import { addProp, addPyx, applySolids, dropItem, spawnPlate } from './rules.js';
import { makeItem, rollLegendaryItem, rollSetItem } from './loot.js';
import { hostileField, spawnElitePack, spawnMonster, telegraph } from './monsters.js';
import { say, startBoss } from './bosses.js';
import { reviveHero } from './hero.js';

const F = (w) => w.story.flags;
export const questFlag = (w, f, v = true) => { w.story.flags[f] = v; };
const killsSince = (w, key) => w.stats.kills - (F(w)[key] ?? 0);

const propOf = (w, pred) => w.props.find(pred);
const objProp = (w, kind, extra = () => true) => { const p = propOf(w, (o) => o.kind === kind && extra(o)); return p ? { x: p.x, z: p.z, prop: p.id } : null; };
const walkExit = (w, to) => objProp(w, 'exit', (p) => p.to === to);

export const QUESTS = [
  { id: 'wipe', name: 'WIPE YOUR FEET', steps: [
    { text: 'BURST OUT. KILL THE PEATWALKERS.', zone: 'yard', done: (w) => F(w).firstPack, obj: (w) => { const m = w.monsters.find((o) => o.script === 'first' && !o.dead); return m ? { x: m.x, z: m.z, kill: true } : null; } },
    { text: 'WALK EAST THROUGH THE GRAVES.', zone: 'yard', done: (w) => F(w).pastGraves, obj: (w) => ({ x: 30, z: 6 }) },
    { text: 'OPEN THE UNQUIET COFFIN. SURVIVE.', zone: 'yard', done: (w) => F(w).coffinDone, obj: (w) => objProp(w, 'coffin') },
    { text: 'LEAVE BY THE GATE TO TOLLHAVEN.', zone: 'yard', done: (w) => w.zone.id === 'town', obj: (w) => walkExit(w, 'town') },
    { text: 'SPEAK TO THE CRIER.', zone: 'town', done: (w) => F(w).talk_crier1, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'crier') },
  ] },
  { id: 'causeway', name: 'THE WEEPING CAUSEWAY', steps: [
    { text: 'TAKE THE ROAD TO THE CAUSEWAY. FIND DAME BRASSE.', zone: 'causeway', done: (w) => F(w).talk_brasse_camp, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'brasse_camp') },
    { text: 'GUARD THE WAGON OF BELLS BACK DOWN THE ROAD.', zone: 'causeway', done: (w) => F(w).wagonHome, obj: (w) => (w.wagon ? { x: w.wagon.x, z: w.wagon.z, guard: true } : null) },
    { text: 'REPORT TO THE CRIER IN TOLLHAVEN.', zone: 'town', done: (w) => F(w).talk_crier2, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'crier') },
  ] },
  { id: 'bones', name: "SAINT GLOAM'S BONES", steps: [
    { text: 'SPEAK TO MOTHER OGIVE.', zone: 'town', done: (w) => F(w).talk_ogive1, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'ogive') },
    { text: "FIND SAINT GLOAM'S FINGER.", zone: 'ossuary1', done: (w) => F(w).relic_ossuary1, obj: (w) => objProp(w, 'relic') },
    { text: 'DESCEND TO THE SECOND FLOOR.', zone: 'ossuary2', done: (w) => w.zone.id === 'ossuary2' || F(w).relic_ossuary2, obj: (w) => walkExit(w, 'ossuary2') },
    { text: "FIND SAINT GLOAM'S RIB.", zone: 'ossuary2', done: (w) => F(w).relic_ossuary2, obj: (w) => objProp(w, 'relic') },
    { text: 'DESCEND TO THE THIRD FLOOR.', zone: 'ossuary3', done: (w) => w.zone.id === 'ossuary3' || F(w).relic_ossuary3, obj: (w) => walkExit(w, 'ossuary3') },
    { text: "FIND SAINT GLOAM'S JAW.", zone: 'ossuary3', done: (w) => F(w).relic_ossuary3, obj: (w) => objProp(w, 'relic') },
    { text: 'GO DOWN TO THE COUNTING HOUSE. SLAY THE BURSAR.', zone: 'countinghouse', done: (w) => w.bossKills?.bursar, obj: (w) => { const m = w.boss?.m; if (w.zone.id === 'ossuary3') return walkExit(w, 'countinghouse'); return m ? { x: m.x, z: m.z, kill: true } : null; } },
    { text: 'BRING THE BONES TO MOTHER OGIVE.', zone: 'town', done: (w) => F(w).talk_ogive2, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'ogive') },
  ] },
  { id: 'cloister', name: 'THE CINDER CLOISTER', steps: [
    { text: 'HEAR THE CRIER READ THE LEDGER.', zone: 'town', done: (w) => F(w).talk_crier3, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'crier') },
    { text: 'FIND THE LAST NOVICES. DEFEND THEM.', zone: 'cloister', done: (w) => F(w).novicesSaved, obj: (w) => objProp(w, 'novices') },
    { text: 'CONFRONT THE BISHOP IN THE CHAPTER HOUSE.', zone: 'cloister', done: (w) => w.bossKills?.ambrose, obj: (w) => { const m = w.monsters.find((o) => o.type === 'ambrose' && !o.dead); return m ? { x: m.x, z: m.z, kill: true } : null; } },
    { text: 'HEAR THE TRUTH FROM THE CRIER.', zone: 'town', done: (w) => F(w).talk_crier4, obj: (w) => objProp(w, 'npc', (p) => p.npc === 'crier') },
  ] },
  { id: 'belfry', name: 'RING IT OR DIE TRYING', steps: [
    { text: 'CLIMB THE CRACKED BELFRY.', zone: 'belfry1', done: (w) => w.zone.id === 'belfry2' || w.zone.id === 'belfry3' || w.zone.id === 'belfry_top', obj: (w) => walkExit(w, 'belfry2') },
    { text: 'KEEP CLIMBING.', zone: 'belfry2', done: (w) => w.zone.id === 'belfry3' || w.zone.id === 'belfry_top', obj: (w) => walkExit(w, 'belfry3') },
    { text: 'UP TO THE GREAT BELL.', zone: 'belfry3', done: (w) => w.zone.id === 'belfry_top', obj: (w) => walkExit(w, 'belfry_top') },
    { text: 'SILENCE MALISON. RING OLD CLEMENCY TRUE.', zone: 'belfry_top', done: (w) => w.bossKills?.malison, obj: (w) => { const m = w.boss?.m; if (!m) return null; if (m.bossState?.phase === 3) { const h = w.heroes.find((q) => !q.left) ?? w.heroes[0]; const ropes = w.props.filter((p) => p.kind === 'rope' && !p.used); const safe = ropes.filter((p) => Math.hypot(p.x - m.x, p.z - m.z) > 6); const r = (safe.length ? safe : ropes).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; if (r) return { x: r.x, z: r.z, prop: r.id, hold: true }; } return { x: m.x, z: m.z, kill: true }; } },
  ] },
];

export function currentStep(w) { const q = QUESTS[w.story.q]; return q ? q.steps[w.story.step] : null; }
export function questText(w) { const s = currentStep(w); return s ? s.text : null; }
export function questName(w) { return QUESTS[w.story.q]?.name ?? null; }
export function objective(w) {
  const s = currentStep(w); if (!s) return null;
  if (s.zone && s.zone !== w.zone.id) return { zone: s.zone };
  return s.obj?.(w) ?? null;
}

export function stepQuests(w) {
  if (w.mode !== 'campaign') return;
  // Advance through steps as they complete; a step's enter fires once.
  for (let guard = 0; guard < 8; guard++) {
    const q = QUESTS[w.story.q]; if (!q) break;
    const s = q.steps[w.story.step]; if (!s) break;
    if (!s.done(w)) break;
    w.story.step++;
    if (w.story.step >= q.steps.length) {
      emit(w, { t: 'questdone', q: q.id, name: q.name }); emit(w, { t: 'sfx', id: 'quest' });
      w.story.q++; w.story.step = 0;
      const nq = QUESTS[w.story.q];
      if (nq) emit(w, { t: 'quest', name: nq.name, text: nq.steps[0].text });
    } else emit(w, { t: 'quest', name: q.name, text: q.steps[w.story.step].text });
    emit(w, { t: 'save' });
    unlockByStory(w);
  }
  zoneTick(w);
}
function unlockByStory(w) {
  const add = (z) => { if (!w.story.lychgates.includes(z)) { w.story.lychgates.push(z); emit(w, { t: 'toast', seat: -1, text: `THE ROAD IS OPEN: ${ZONES[z].name}`, color: 'sky' }); } };
  const q = w.story.q;
  if (q >= 1) add('causeway');
  if (q >= 2) add('ossuary1');
  if (q >= 3) add('cloister');
  if (q >= 4) add('belfry1');
  if (q >= 3 || w.story.flags.relic_ossuary1) add('ossuary1');
}

// What the party does in a zone, zone by zone.
function zoneTick(w) {
  const id = w.zone.id; const f = F(w);
  if (id === 'yard') {
    if (!f.firstPack && w.monsters.filter((m) => m.script === 'first').every((m) => m.dead)) {
      f.firstPack = true;
      const h = w.heroes[0];
      // The first upgrade is scripted: a short-beam blue weapon.
      for (const he of w.heroes) if (!he.left && !he.isPyx) dropItem(w, he.x + 1, he.z + 1, makeItem(w.rngs.loot, { slot: 'main', rarity: 'blessed', ilvl: 2, cls: he.cls }), he.seat);
      emit(w, { t: 'tutorial', seat: h.seat, show: 'equip' });
    }
    if (!f.pastGraves && w.heroes.some((h) => h.x > 28)) { f.pastGraves = true; emit(w, { t: 'tutorial', seat: 0, show: 'dodge' }); const p = w.heroes[0]; const d = spawnMonster(w, 'bloat_deacon', p.x + 5, p.z, { dormant: false, aggro: true, script: 'tele' }); d.spawnAnim = 1; }
    stepCoffin(w);
  }
  if (id === 'causeway') {
    stepCoffin(w);
    if (w.wagon?.active) stepWagon(w);
    if (!f.firstPlate && w.heroes.some((h) => h.x > w.zone.w * 0.2)) { f.firstPlate = true; const h = w.heroes[0]; spawnPlate(w, h.x + 9, h.z, { dormant: false, aggro: true }); emit(w, { t: 'toast', seat: -1, text: 'THE COLLECTION PLATE! CHASE IT!', color: 'sand', big: true }); emit(w, { t: 'tutorial', seat: 0, show: 'plate' }); }
    if (!f.firstChampion && w.heroes.some((h) => h.x > w.zone.w * 0.38)) { f.firstChampion = true; const h = w.heroes[0]; const p = findOpenNear(w, h.x + 10, h.z); spawnElitePack(w, p.x, p.z, 'champion', null, ['peatwalker'], { dormant: false, aggro: true }); emit(w, { t: 'toast', seat: -1, text: 'A CHAMPION PACK. MIND THE AFFLICTIONS.', color: 'sky' }); }
  }
  if (id === 'pantry' && !f.cellarerDead && w.bossKills?.cellarer) { f.cellarerDead = true; }
  if (id === 'cloister') {
    stepNovices(w);
    // Falling beams: the roof is still coming down.
    w.zone.beamT = (w.zone.beamT ?? 7) - DT;
    if (w.zone.beamT <= 0) { w.zone.beamT = 7 + w.rngs.quest.range(0, 4); const h = w.heroes.find((q) => !q.left && !q.dead); if (h && w.active.some((m) => near(m, h.x, h.z, 14))) { const p = findOpenNear(w, h.x + w.rngs.quest.range(-3, 3), h.z + w.rngs.quest.range(-3, 3)); telegraph(w, { kind: 'circle', x: p.x, z: p.z, r: 1.8, dur: 1, dmg: 10 + h.level * 3, level: h.level, name: 'A FALLING BEAM', vfx: 'ring_fire', sfx: 'beam_fall', shake: 0.25, color: 'orange' }); w.beamsFell = (w.beamsFell ?? 0) + 1; } }
  }
  if (w.zone.taunts) { w.zone.tauntT = (w.zone.tauntT ?? 25) - DT; if (w.zone.tauntT <= 0) { w.zone.tauntT = 45; const line = w.zone.taunts[w.rngs.quest.int(0, w.zone.taunts.length - 1)]; emit(w, { t: 'say', who: 'malison', text: line }); } }
  // Pyx banter ticks over with nothing to do.
  if (w.allies.some((a) => a.kind === 'pyx')) { w.banterT = (w.banterT ?? 30) - DT; if (w.banterT <= 0) { w.banterT = 50; emit(w, { t: 'banter', tag: 'idle' }); } }
}
function stepCoffin(w) {
  const c = w.coffin; if (!c) return;
  c.t -= DT; c.waveT -= DT;
  if (c.waveT <= 0 && c.t > 2) {
    c.waveT = 6;
    const list = w.zone.spec.monsters.length ? w.zone.spec.monsters : ['peatwalker'];
    const n = 4 + w.heroes.length * 2;
    for (let i = 0; i < n; i++) { const a = w.rngs.spawn.range(0, 6.28); const p = findOpenNear(w, c.x + Math.cos(a) * 5, c.z + Math.sin(a) * 5); const type = w.rngs.spawn.pick(list.filter((t) => !MONSTERS[t].big)); const m = spawnMonster(w, type, p.x, p.z, { dormant: false, aggro: true, summoned: false, xpMul: 0.8 }); m.spawnAnim = 1; emit(w, { t: 'vfx', kind: 'burst_grave', x: p.x, z: p.z, r: 1 }); }
  }
  if (c.t <= 0) {
    w.coffin = null; F(w).coffinDone = true; F(w).coffins = (F(w).coffins ?? 0) + 1;
    emit(w, { t: 'coffinend' }); emit(w, { t: 'sfx', id: 'fanfare' });
    const p = findOpenNear(w, c.x + 1.5, c.z);
    const ch = addProp(w, { kind: 'chest', x: p.x, z: p.z, model: 'chest', interact: true, label: 'THE COFFIN\'S DUE', rich: true }); emit(w, { t: 'propadd', id: ch.id, kind: 'chest', x: ch.x, z: ch.z, model: 'chest', label: ch.label });
    emit(w, { t: 'toast', seat: -1, text: 'YOU SURVIVED. THE COFFIN PAYS.', color: 'sand', big: true });
    w.hooks.onCoffin?.(w);
    for (const h of w.heroes) if (!h.left) { h.coffins = (h.coffins ?? 0) + 1; if (h.level < 3 && w.zone.id === 'yard') { h.xp = 0; for (let L = h.level; L < 3; L++) w.hooks.grantLevel?.(w, h); } }
  } else {
    w.coffinTimer = c.t;
  }
}
export function openCoffin(w, p) { p.used = true; w.coffin = { x: p.x, z: p.z, t: 45, waveT: 0.5 }; emit(w, { t: 'coffinstart', x: p.x, z: p.z, dur: 45 }); emit(w, { t: 'sfx', id: 'coffin_crash' }); emit(w, { t: 'shake', v: 0.4 }); }

function startWagon(w) {
  const camp = w.props.find((p) => p.npc === 'brasse_camp'); const z = w.zone;
  const start = findOpenNear(w, camp.x + 2, camp.z + 2);
  const goal = z.entrance;
  const path = z.nav.path([start.x, 0, start.z], [goal.x + 2, 0, goal.z]);
  w.wagon = { x: start.x, z: start.z, path: path ?? [[goal.x, 0, goal.z]], i: 0, active: true, speed: 3.2, spawnT: 4, facing: 0 };
  emit(w, { t: 'wagon', on: true });
  emit(w, { t: 'tutorial', seat: 0, show: 'wagon' });
}
function stepWagon(w) {
  const wg = w.wagon; const hasHero = w.heroes.some((h) => !h.dead && near(h, wg.x, wg.z, 12));
  const threatened = w.active.some((m) => !m.dead && near(m, wg.x, wg.z, 3.5) && !m.static);
  wg.blocked = !hasHero || threatened;
  if (!wg.blocked) {
    const p = wg.path[wg.i];
    if (p) {
      const dx = p[0] - wg.x; const dz = p[2] - wg.z; const d = Math.hypot(dx, dz);
      if (d < 0.2) wg.i++;
      else { wg.x += (dx / d) * wg.speed * DT; wg.z += (dz / d) * wg.speed * DT; wg.facing = Math.atan2(dx, dz); }
    } else {
      wg.active = false; F(w).wagonHome = true;
      emit(w, { t: 'toast', seat: -1, text: 'THE WAGON IS SAFE. SISTER PYX JOINS YOU.', color: 'sky', big: true }); emit(w, { t: 'sfx', id: 'bell_small' });
      if (w.heroes.filter((h) => !h.left).length === 1) addPyx(w);
      w.story.flags.brasseOpen = true; w.story.flags.writsOpen = true;
      emit(w, { t: 'dialog', key: 'pyx_join' });
      return;
    }
  }
  wg.spawnT -= DT;
  if (wg.spawnT <= 0) {
    wg.spawnT = 7;
    const n = 3 + w.heroes.length * 2;
    for (let i = 0; i < n; i++) { const a = w.rngs.spawn.range(0, 6.28); const p = findOpenNear(w, wg.x + Math.cos(a) * 9, wg.z + Math.sin(a) * 9); const m = spawnMonster(w, w.rngs.spawn.pick(['peatwalker', 'peatwalker', 'gibbet_drop']), p.x, p.z, { dormant: false, aggro: true, xpMul: 0.6 }); m.spawnAnim = 1; }
  }
}
function stepNovices(w) {
  const n = w.novices; if (!n?.active) return;
  n.t -= DT; n.waveT -= DT;
  if (n.waveT <= 0 && n.t > 3) {
    n.waveT = 6;
    for (let i = 0; i < 5 + w.heroes.length * 2; i++) { const a = w.rngs.spawn.range(0, 6.28); const p = findOpenNear(w, n.x + Math.cos(a) * 8, n.z + Math.sin(a) * 8); const m = spawnMonster(w, w.rngs.spawn.pick(['cinderling', 'cinderling', 'penitent', 'tithe_collector']), p.x, p.z, { dormant: false, aggro: true, xpMul: 0.8 }); m.spawnAnim = 1; }
    if (w.rngs.quest.chance(0.3)) emit(w, { t: 'say', who: 'malison', text: 'THEY WILL ALL COME TO ME. EVERY NOVICE. EVERY NOTE.' });
  }
  if (n.t <= 0) {
    n.active = false; F(w).novicesSaved = true;
    emit(w, { t: 'defend', on: false }); emit(w, { t: 'toast', seat: -1, text: 'THE NOVICES FLEE TO TOLLHAVEN. THE WAY OPENS.', color: 'sky', big: true }); emit(w, { t: 'sfx', id: 'bell_small' });
    emit(w, { t: 'say', who: 'pyx', text: 'Go on, little ones. Do not look at the floor.' });
    for (const he of w.heroes) if (!he.left) dropItem(w, n.x, n.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl: Math.max(11, he.level), cls: he.cls }), he.seat);
  }
}

// When a zone is first made: its scripted furniture. Called from enterZone via hooks.entered.
export function zoneEntered(w, z, fresh) {
  const id = z.id; const f = F(w);
  emit(w, { t: 'banner', text: z.spec.name });
  if (fresh) { buildZoneProps(w, z); applySolids(w); }
  if (id === 'countinghouse' && fresh) { const m = spawnMonster(w, 'bursar', z.w / 2, 7, { dormant: false, aggro: true, noLoot: false }); m.intro = 4; startBoss(w, m); emit(w, { t: 'cutscene', key: 'bursar_entrance', focus: m.id, dur: 4 }); }
  if (id === 'belfry_top' && fresh) {
    const m = spawnMonster(w, 'malison', z.w / 2, z.h / 2 - 2, { dormant: false, aggro: true }); m.intro = 5; startBoss(w, m);
    emit(w, { t: 'cutscene', key: 'malison_entrance', focus: m.id, dur: 5 });
  }
  if (id === 'belfry_top' && !fresh && w.monsters.some((m) => m.type === 'malison' && !m.dead)) { const m = w.monsters.find((o) => o.type === 'malison'); startBossBack(w, m); }
  if (id === 'cloister' || id.startsWith('belfry')) z.taunts = ['RUN, LITTLE RINGER. THE HOUR IS UNRUNG, AND IT IS YOURS.', 'LISTEN. THAT IS EVERY GRAVE YOU EVER WALKED ON, OPENING.', 'I KNOW YOUR NAME. I SANG IT ONCE, OVER SOMEONE ELSE.', 'COME UP. COME UP. THE VIEW IS TERRIBLE.'];
  // Monsters in a rebuilt nav read the right field again.
  w.requiem.t = 0;
  if (id === 'town') { for (const h of w.heroes) if (h.dead) reviveHero(w, h, null, 1); h0Rest(w); }
  if (f.pyx && w.heroes.filter((h) => !h.left).length === 1 && !w.allies.some((a) => a.kind === 'pyx')) addPyx(w);
  emit(w, { t: 'music', song: z.spec.song });
}
function h0Rest(w) { for (const h of w.heroes) { h.hp = h.stats.maxHp; h.recentDeaths = 0; } }
const startBossBack = (w, m) => { w.boss = { id: m.id, name: m.name, ticks: m.bossState?.ticks ?? [0.6, 0.25], m }; emit(w, { t: 'boss', id: m.id, name: m.name, ticks: w.boss.ticks, on: true }); };

function buildZoneProps(w, z) {
  const id = z.id; const f = F(w); const rng = z.seedRng ?? w.rngs.quest;
  const mark = (k) => z.marks.find((m) => m.kind === k);
  if (id === 'yard') {
    for (let i = 0; i < 3; i++) { const m = spawnMonster(w, 'peatwalker', z.entrance.x + 3 + i, z.entrance.z + (i - 1) * 1.5, { script: 'first', dormant: false, aggro: false }); m.hp = m.maxHp; }
    const y = mark('Y'); addProp(w, { kind: 'coffin', x: y.x, z: y.z, model: 'coffin', interact: true, label: 'UNQUIET COFFIN' });
    const g = z.gates[0]; addProp(w, { kind: 'exit', x: g.x, z: g.z, to: 'town', model: 'lychgate', interact: true, label: 'TO TOLLHAVEN', r: 1.6 });
  }
  if (id === 'town') {
    const npcAt = (k, npc, model, label, o = {}) => { const m = mark(k); return addProp(w, { kind: 'npc', x: m.x, z: m.z, npc, model, interact: true, label, solid: true, facing: o.facing ?? 0, ...o }); };
    npcAt('c', 'crier', 'npc_crier', 'CRIER MAUDLIN');
    npcAt('m', 'pennywhistle', 'npc_pennywhistle', 'PENNYWHISTLE');
    npcAt('b', 'brasse', 'npc_brasse', 'DAME BRASSE', { need: 'brasseOpen' });
    npcAt('o', 'ogive', 'npc_ogive', 'MOTHER OGIVE', { need: 'q2' });
    const a = mark('p'); addProp(w, { kind: 'npc', x: a.x, z: a.z, npc: 'ambrose', model: 'npc_ambrose', interact: true, label: 'BISHOP AMBROSE', upTo: 3 });
    const s = mark('s'); addProp(w, { kind: 'stash', x: s.x, z: s.z, model: 'collection_box', interact: true, label: 'THE COLLECTION BOX' });
    const k = mark('K'); addProp(w, { kind: 'knellfont', x: k.x, z: k.z, model: 'knell_font', interact: true, label: 'THE KNELL FONT', r: 1.3 });
    const wb = mark('w'); addProp(w, { kind: 'writs', x: wb.x, z: wb.z, model: 'notice-board', interact: true, label: "THE CRIER'S WRITS", need: 'writsOpen' });
    const g = z.gates[0]; addProp(w, { kind: 'lychgate', x: g.x, z: g.z, model: 'lychgate', interact: true, label: 'LYCHGATE', zoneId: 'town', r: 1.6 });
    const road = mark('X'); addProp(w, { kind: 'lychgate', x: road.x, z: road.z, model: 'roadgate', interact: true, label: 'THE ROAD OUT', zoneId: 'town', r: 1.6 });
    const pos = z.marks.filter((m) => m.kind === 'f'); pos.forEach((m, i) => addProp(w, { kind: 'decor', x: m.x, z: m.z, model: i % 2 ? 'statue' : 'fountain', r: 1, solid: true }));
    for (const m of z.marks.filter((q) => q.kind === 'l')) { z.lights.push({ x: m.x, z: m.z, room: 0 }); addProp(w, { kind: 'decor', x: m.x, z: m.z, model: 'lamp-post', r: 0.3 }); }
    const stalls = [['market-stall', 6, 12], ['well', 20, 20], ['market-stall', 50, 12], ['cart', 30, 20], ['crate-stack', 8, 9], ['barrel', 12, 9], ['anvil', 26, 9], ['campfire', 24, 9], ['bench', 40, 14]];
    for (const [model, x, zz] of stalls) addProp(w, { kind: 'decor', x, z: zz, model, r: 0.6 });
  }
  if (id === 'causeway') {
    const m = z.marks.filter((q) => q.kind === 'X'); const campX = m[m.length - 1];
    addProp(w, { kind: 'npc', x: campX.x, z: campX.z, npc: 'brasse_camp', model: 'npc_brasse', interact: true, label: 'DAME BRASSE', hideIf: 'talk_brasse_camp_gone' });
    const y = mark('Y'); if (y) addProp(w, { kind: 'exit', x: y.x, z: y.z, to: 'pantry', model: 'exitstair', interact: true, label: 'THE DROWNED PANTRY', r: 1.2 });
    const firstX = m[0]; addProp(w, { kind: 'exit', x: firstX.x, z: firstX.z, to: 'town', model: 'lychgate', interact: true, label: 'TO TOLLHAVEN', r: 1.2, replace: true });
    const later = z.roomRects[Math.floor(z.roomRects.length * 0.55)]; const pg = findOpenNear(w, later.x + later.w / 2, later.y + later.h / 2);
    addProp(w, { kind: 'lychgate', x: pg.x, z: pg.z, model: 'lychgate', interact: true, label: 'LYCHGATE', zoneId: 'causeway', r: 1.6 });
    // An Unquiet Coffin off the road, and a shrine.
    const mid = z.roomRects[Math.floor(z.roomRects.length * 0.3)]; const c = findOpenNear(w, mid.x + mid.w / 2 + 2, mid.y + mid.h / 2 + 1);
    addProp(w, { kind: 'coffin', x: c.x, z: c.z, model: 'coffin', interact: true, label: 'UNQUIET COFFIN' });
  }
  if (id === 'pantry') {
    const last = z.marks.filter((q) => q.kind === 'X').at(-1); const m = spawnMonster(w, 'cellarer', last.x, last.z - 3, {}); m.script = 'cellarer'; addProp(w, { kind: 'book', x: last.x + 2, z: last.z - 3, model: 'lectern', interact: true, label: 'THE OVERDUE BOOK' });
  }
  if (z.spec.relic) {
    const far = [...z.roomRects].sort((a, b) => b.depth - a.depth)[1] ?? z.roomRects[z.roomRects.length - 1];
    const p = findOpenNear(w, far.x + far.w / 2, far.y + far.h / 2);
    addProp(w, { kind: 'relic', x: p.x, z: p.z, relic: id, model: 'altar', interact: true, label: 'SAINT GLOAM\'S RELIC' });
    const r0 = z.roomRects[1] ?? z.roomRects[0]; const q = findOpenNear(w, r0.x + r0.w / 2 + 1, r0.y + r0.h / 2 + 1);
    spawnElitePack(w, q.x, q.z, 'rare');
  }
  if (z.spec.lever) placeLever(w, z, rng);
  if (id === 'cloister') {
    const y = mark('Y'); if (y) addProp(w, { kind: 'novices', x: y.x, z: y.z, model: 'cage', interact: true, label: 'THE LAST NOVICES', r: 1.3 });
    const room = z.roomRects[z.roomRects.length - 1];
    spawnMonster(w, 'ambrose', room.x + room.w / 2, room.y + room.h / 2, { aggro: true });
    const r0 = z.roomRects[2] ?? z.roomRects[0]; const q = findOpenNear(w, r0.x + r0.w / 2, r0.y + r0.h / 2); spawnElitePack(w, q.x, q.z, 'rare');
  }
  if (id === 'belfry1' || id === 'ossuary1' || id === 'cloister') for (const g of z.gates.slice(0, 1)) { /* the gate placed by placeExits */ }
  // At least one shrine per zone.
  if (!z.spec.safe && z.spec.kind === 'gen' && !w.props.some((p) => p.kind === 'shrine')) { const r = z.roomRects[Math.floor(z.roomRects.length / 2)]; const p = findOpenNear(w, r.x + r.w / 2 + 2, r.y + r.h / 2); const k = rng.pick(['ardour', 'haste', 'ward', 'plenty']); addProp(w, { kind: 'shrine', x: p.x, z: p.z, shrine: k, model: 'votive', interact: true, label: `VOTIVE SHRINE: ${k.toUpperCase()}` }); }
  if (z.spec.classFonts) w.hooks.classFonts?.(w, z);
}
function placeLever(w, z, rng) {
  // A portcullis on the door of a room on the way to the exit, with its lever in the room before it.
  let r = z.roomRects[z.roomRects.length - 1]; const chain = [];
  while (r && r.parent >= 0) { chain.push(r); r = z.roomRects[r.parent]; }
  const gate = chain[Math.floor(chain.length / 2)]; if (!gate?.door) return;
  const prev = z.roomRects[gate.parent];
  const { col, row, cells } = gate.door;
  for (const c of cells) { z.nav.setOpen(c.col, c.row, false); for (const n of w.navs ?? []) n.setOpen(c.col, c.row, false); }
  const port = addProp(w, { kind: 'portcullis', x: col + 0.5, z: row + 0.5, model: 'portcullis', col, row, cells, r: 1, facing: 0, horizontal: cells.length > 1 ? cells[1].row === row : true });
  const p = findOpenNear(w, prev.x + prev.w / 2 - 2, prev.y + prev.h / 2 + 1);
  addProp(w, { kind: 'lever', x: p.x, z: p.z, model: 'lever', interact: true, label: 'PULL THE LEVER', port: port.id });
}

// Dialogue that belongs to an NPC at this point in the story.
export function dialogFor(w, npc) {
  const f = f0(w); const q = w.story.q; const s = w.story.step;
  switch (npc) {
    case 'crier':
      if (q === 0) return { key: 'crier_intro', flag: 'talk_crier1' };
      if (q === 1 && s === 2) return { key: 'crier_causeway_done', flag: 'talk_crier2' };
      if (q === 3 && s === 0) return { key: 'crier_after_bursar', flag: 'talk_crier3' };
      if (q === 3 && s === 3) return { key: 'crier_truth', flag: 'talk_crier4' };
      if (f.overdueBook && !f.bookReturned) return { key: 'crier_book', flag: 'bookReturned', reward: 'book' };
      if (q >= 5) return { key: 'crier_post' };
      return { key: 'crier_idle' };
    case 'pennywhistle': return { key: f.metPenny ? 'penny_shop' : 'penny_intro', flag: 'metPenny', open: 'vendor' };
    case 'brasse_camp': return { key: 'brasse_camp', flag: 'talk_brasse_camp', after: 'wagon' };
    case 'brasse': return { key: 'brasse_shop', open: 'brasse' };
    case 'ambrose': return { key: 'ambrose_early' };
    case 'ogive':
      if (q === 2 && s === 0) return { key: 'ogive_bones', flag: 'talk_ogive1' };
      if (q === 2 && s === 7) return { key: 'ogive_done', flag: 'talk_ogive2', open: 'ogive' };
      if (f.talk_ogive2) return { key: 'ogive_shop', open: 'ogive' };
      return { key: 'ogive_bones' };
    default: return null;
  }
}
const f0 = (w) => w.story.flags;
export function afterTalk(w, d) {
  if (d?.flag) w.story.flags[d.flag] = true;
  if (d?.after === 'wagon' && !w.wagon) { const camp = w.props.find((p) => p.npc === 'brasse_camp'); startWagon(w); if (camp) camp.hidden = true; }
  if (d?.reward === 'book') { const h = w.heroes[0]; h.gold += 500; for (const he of w.heroes) if (!he.left) dropItem(w, he.x + 1, he.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl: he.level, cls: he.cls }), he.seat); emit(w, { t: 'toast', seat: -1, text: 'THE CRIER PAYS YOU 500 GOLD FOR THE RETURN.', color: 'sand' }); }
  emit(w, { t: 'save' });
}
export const visibleProp = (w, p) => {
  if (p.hidden) return false;
  if (p.upTo !== undefined && w.story.q > p.upTo) return false;
  if (p.need === 'q2') return w.story.q >= 2;
  if (p.need) return !!w.story.flags[p.need];
  return true;
};

export function onKillQuest(w, m, killer) {
  if (w.mode !== 'campaign') return;
  const wr = w.story.writs; if (wr) for (const j of wr) if (!j.done) { if (j.kind === 'kill' && j.type === m.type) finishWrit(w, j); if (j.kind === 'clear' && w.zone.id === j.zone) { j.n = (j.n ?? 0) + 1; if (j.n >= j.goal) finishWrit(w, j); } }
  if (m.type === 'cellarer') { w.bossKills = w.bossKills ?? {}; w.bossKills.cellarer = 1; }
  if (w.wagon?.active) w.wagon.spawnT = Math.min(w.wagon.spawnT, 7);
  if (m.elite) emit(w, { t: 'banter', tag: 'elite', rate: 0.3 });
}
export function onBossDead(w, m, killer) {
  const legGuarantee = (slotCount = 1, withSet = false) => { for (const h of w.heroes) { if (h.left) continue; for (let i = 0; i < slotCount; i++) dropItem(w, m.x, m.z, rollLegendaryItem(w.rngs.loot, h.cls, Math.max(m.level, h.level)), h.seat); if (withSet) dropItem(w, m.x, m.z, rollSetItem(w.rngs.loot, h.cls, Math.max(m.level, h.level)), h.seat); } };
  if (m.defn.boss === 'bursar') { emit(w, { t: 'say', who: 'bursar', text: 'MY LEDGER! THE INTEREST! YOU WILL BE ... AUDITED.' }); if (!w.story.flags.bursarLoot) { w.story.flags.bursarLoot = true; legGuarantee(1); } }
  if (m.defn.boss === 'ambrose') { emit(w, { t: 'say', who: 'ambrose', text: 'Four times, then. Mark it in the book, my child.' }); legGuarantee(0); for (const h of w.heroes) if (!h.left) dropItem(w, m.x, m.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl: m.level, cls: h.cls }), h.seat); }
  if (m.defn.boss === 'malison') { if (!w.story.flags.malisonLoot) { w.story.flags.malisonLoot = true; legGuarantee(1, true); } emit(w, { t: 'ending' }); w.unlocks.penance = true; w.unlocks.knell = true; emit(w, { t: 'save' }); w.dark = false; emit(w, { t: 'dark', on: false }); }
  const wr = w.story.writs; if (wr) for (const j of wr) if (!j.done && j.kind === 'kill' && j.type === m.type) finishWrit(w, j);
}
// Writs: three random jobs on existing maps. Finish all three for a cache.
const WRIT_POOL = [
  { kind: 'kill', type: 'bursar', text: 'SERVE NOTICE ON THE BURSAR.', zone: 'countinghouse' },
  { kind: 'kill', type: 'cellarer', text: 'COLLECT THE CELLARER.', zone: 'pantry' },
  { kind: 'clear', zone: 'causeway', goal: 25, text: 'CLEAR 25 FROM THE CAUSEWAY.' },
  { kind: 'clear', zone: 'ossuary1', goal: 30, text: 'CLEAR 30 FROM THE OSSUARY.' },
  { kind: 'clear', zone: 'cloister', goal: 30, text: 'CLEAR 30 FROM THE CLOISTER.' },
  { kind: 'coffin', zone: 'causeway', text: 'OPEN A COFFIN ON THE CAUSEWAY.' },
];
export function rollWrits(w) {
  const r = w.rngs.quest;
  const list = r.shuffle([...WRIT_POOL]).filter((j) => (w.story.lychgates.includes(j.zone) || j.zone === 'countinghouse' && w.story.q > 2 || j.zone === 'pantry')).slice(0, 3).map((j) => ({ ...j, done: false, n: 0 }));
  w.story.writs = list;
}
export function finishWrit(w, j) {
  j.done = true; emit(w, { t: 'toast', seat: -1, text: `WRIT DONE: ${j.text}`, color: 'lime' }); emit(w, { t: 'sfx', id: 'quest' }); w.story.writsDone = (w.story.writsDone ?? 0) + 1;
  if (w.story.writs.every((q) => q.done)) {
    for (const he of w.heroes) if (!he.left && !he.isPyx) { he.mats.shards += 4; he.gold += 400 + he.level * 30; dropItem(w, he.x + 1, he.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl: he.level, cls: he.cls }), he.seat); }
    emit(w, { t: 'toast', seat: -1, text: 'ALL WRITS SERVED. THE CACHE IS YOURS.', color: 'lime', big: true });
    w.story.writs = null; w.story.writCaches = (w.story.writCaches ?? 0) + 1;
    rollWrits(w);
  }
}
export { CLASS_IDS, enterZone, placeParty, after, hostileField, telegraph, say };
