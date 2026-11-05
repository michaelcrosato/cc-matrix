/* =====================================================================================
 * 20-sim-state: a new game, members, items as carried, the save (serialize, load) and the hash
 * ===================================================================================== */
const SLOT_NAMES = ['head', 'neck', 'body', 'arms', 'main', 'off', 'ring1', 'ring2', 'feet', 'quiver'];
B.SLOT_NAMES = SLOT_NAMES;
/** a carried item: { id, n (stacks), ch (charges), rust, uid } */
const mkItem = (id, n) => {
  const d = IT(id); if (!d) throw new Error('unknown item ' + id);
  const it = { id, uid: ++S.uid };
  if (d.stack) it.n = Math.max(1, n || 1);
  if (d.charges) it.ch = d.charges;
  return it;
};
B.mkItem = mkItem;

/** a member from a definition: { name, race, sex, cls, stats, hp?, lvl?, gear, look, book, prep, npc } */
function mkMember(def) {
  const cls = B.CLASSES[def.cls], race = B.RACES[def.race];
  const m = { id: def.id || ('m' + (++S.uid)), name: def.name, full: def.full || def.name, race: def.race, sex: def.sex || 'm', cls: def.cls, look: B.clone(def.look || B.dressFor(B.lookOf(def.race, def.sex || 'm', 0), def.cls)),
    lvl: 1, xp: 0, hp: 1, max: 1, food: 100, stats: Object.assign({ str: 10, dex: 10, con: 10, int: 10, wis: 10 }, def.stats), state: 'ok', status: {},
    slots: {}, pack: new Array(12).fill(null), book: (def.book || (def.cls === 'M' ? (B.START_GEAR.M.book || []) : [])).slice(),
    mem: { 1: [], 2: [], 3: [] }, spent: { 1: [], 2: [], 3: [] }, cool: { main: 0, off: 0 }, coolMax: { main: 1, off: 1 }, pop: null,
    ward: 0, layOnHands: 1, npc: def.npc || null, fx: { hurt: 0, heal: 0, lvl: 0, act: 0, actH: 'main', miss: 0 }, hungry: 0, starveT: 0, regenT: 0 };
  for (const s of SLOT_NAMES) m.slots[s] = null;
  const g = def.gear || B.START_GEAR[def.cls];
  const give = (slot, v) => { if (!v) return; const [id, n] = Array.isArray(v) ? v : [v]; m.slots[slot] = mkItem(id, n); };
  for (const s of SLOT_NAMES) if (g[s]) give(s, g[s]);
  for (const p of g.pack || []) { const [id, n] = Array.isArray(p) ? p : [p]; const i = m.pack.indexOf(null); if (i >= 0) m.pack[i] = mkItem(id, n); }
  // hit points: level 1 the full die + CON modifier; levels after: half the die + 1 + CON modifier
  m.max = Math.max(1, def.hp || (cls.hd + statMod(effStat(m, 'con'))));
  const lv = def.lvl || 1;
  for (let l = 2; l <= lv; l++) { m.lvl = l; m.max += Math.max(1, Math.floor(cls.hd / 2) + 1 + statMod(effStat(m, 'con'))); }
  if (def.hp && lv > 1) m.max = def.hp;
  m.lvl = lv; m.xp = B.XP_AT[lv - 1] || 0; m.hp = m.max;
  // prepared spells
  const prep = def.prep || {};
  for (const [sp, n] of Object.entries(prep)) { const L = B.SP(sp).lvl; for (let k = 0; k < n; k++) m.mem[L].push(sp); }
  trimMem(m);
  if (def.fill) fillPrep(m);
  const v = B.memberVoice(m.race, m.sex); m.voice = v;
  return m;
}
B.mkMember = mkMember;
/** an ability score with race modifiers already in (they are in the stats) and worn items' bonuses */
function effStat(m, k) {
  let v = m.stats[k];
  for (const s of SLOT_NAMES) { const it = m.slots[s]; if (it) { const d = IT(it.id); if (d[k]) v += d[k]; } }
  return clamp(v, 3, 20);
}
B.effStat = effStat;
/** spell slots a caster has at each level: by class table, plus INT, WIS and the Robe of the Lintel */
function slotCount(m) {
  const out = [0, 0, 0];
  const cl = m.cls === 'M' ? 'mage' : m.cls === 'C' ? 'cleric' : m.cls === 'P' && m.lvl >= 3 ? 'paladin' : null;
  if (!cl) return out;
  if (cl === 'paladin') { out[0] = m.lvl >= 6 ? 2 : 1; return out; }
  const row = B.SLOTS[cl][clamp(m.lvl, 1, 8) - 1]; out[0] = row[0]; out[1] = row[1]; out[2] = row[2];
  if (cl === 'mage') { if (effStat(m, 'int') >= 16) out[0]++; for (const s of SLOT_NAMES) { const it = m.slots[s]; if (it && IT(it.id).slot1) out[0] += IT(it.id).slot1; } }
  if (cl === 'cleric') { const w = effStat(m, 'wis'); if (w >= 15) out[0]++; if (w >= 17 && out[1] > 0) out[1]++; }
  return out;
}
B.slotCount = slotCount;
/** keep the prepared lists within the slots, and the spent flags the same length */
function trimMem(m) {
  const c = slotCount(m);
  for (let L = 1; L <= 3; L++) { m.mem[L] = m.mem[L].slice(0, c[L - 1]); while (m.spent[L].length < m.mem[L].length) m.spent[L].push(false); m.spent[L] = m.spent[L].slice(0, m.mem[L].length); }
}
B.trimMem = trimMem;
/** the spells a member may prepare: a mage's book; a cleric's every prayer of a level it can cast; a paladin's Mend */
B.knownSpells = m => m.cls === 'M' ? m.book.slice() : m.cls === 'C' ? B.PRAYERS.filter(p => slotCount(m)[B.SP(p).lvl - 1] > 0) : m.cls === 'P' && m.lvl >= 3 ? ['mend'] : [];
B.isCaster = m => m.cls === 'M' || m.cls === 'C' || (m.cls === 'P' && m.lvl >= 3);

/** a new game: { seed, mode: 'campaign' | 'race' | 'demo', diff, party: 'premade' | [member defs] } */
B.newGame = function (o = {}) {
  const seed = (o.seed === undefined ? 1 : o.seed) >>> 0;
  const st = { v: 1, seed, rng: { combat: B.seedOf(seed, 'combat'), ai: B.seedOf(seed, 'ai'), loot: B.seedOf(seed, 'loot'), world: B.seedOf(seed, 'world') }, uid: 0,
    time: 0, playTime: 0, mode: o.mode || 'campaign', diff: o.diff || 'normal', floor: o.floor || (o.mode === 'race' ? 'race' : 'f1'),
    party: { cx: 0, cy: 0, dir: 0, tw: null, queued: null, hand: null, sel: 0, members: [], form: [0, 1, 2, 3, -1, -1], at: null, bump: 0, busy: null,
      floating: 0, seeing: 0, steady: 0, freeHinge: 0, msgT: 0, lastCell: null },
    floors: {}, flags: {}, quests: { main: 'open' }, special: {}, secrets: {}, notes: [], log: [], hintsShown: {}, stats: { kills: 0, secrets: 0, deaths: 0, potions: 0, rests: 0, steps: 0, downs: 0 },
    talk: null, transit: null, moment: null, camp: null, proj: [], events: [], boss: null, race: null, over: false, won: false, fightT: 0, combatT: 0 };
  B.setState(st);
  const defs = o.party === 'demo' ? B.demoParty() : Array.isArray(o.party) ? o.party : B.PREMADE;
  for (const d of defs) st.party.members.push(mkMember(d));
  if (o.mode === 'race') for (const m of st.party.members) levelTo(m, 2);
  st.party.form = [0, 1, 2, 3, 4, 5].map(i => i < st.party.members.length ? i : -1);
  for (const f of Object.keys(B.FLOORS)) if (f === st.floor || (o.mode !== 'race' && f !== 'race')) initFloor(f);
  const F = B.FLOORS[st.floor], s0 = o.at || F.start;
  st.party.cx = s0[0]; st.party.cy = s0[1]; st.party.dir = s0[2]; st.party.at = [s0[0], s0[1]];
  st.floors[st.floor].visited = true;
  look();
  return st;
};
/** level a member straight to lvl (the Rat Run, the demo party, Dev Mode) */
function levelTo(m, lvl) {
  const cls = B.CLASSES[m.cls];
  while (m.lvl < lvl) { m.lvl++; m.max += Math.max(1, Math.floor(cls.hd / 2) + 1 + statMod(effStat(m, 'con'))); }
  m.xp = Math.max(m.xp, B.XP_AT[m.lvl - 1] || 0); m.hp = m.max; trimMem(m); fillPrep(m);
}
B.levelTo = levelTo;
/** fill empty slots with the first spells it knows, so a levelled caster has something ready */
function fillPrep(m) {
  const c = slotCount(m), known = B.knownSpells(m);
  for (let L = 1; L <= 3; L++) {
    const ks = known.filter(s => B.SP(s).lvl === L); if (!ks.length) continue;
    while (m.mem[L].length < c[L - 1]) m.mem[L].push(ks[m.mem[L].length % ks.length]);
    m.spent[L] = m.mem[L].map(() => false);
  }
}
B.fillPrep = fillPrep;

/** a floor's runtime state from its data */
function initFloor(f) {
  const F = B.FLOORS[f], X = B.idx(f), fl = { doors: {}, plates: {}, levers: {}, feats: {}, items: {}, mons: [], seen: '0'.repeat(X.W * X.H), flags: {}, wander: F.wander ? F.wander.budget : 0,
    visited: false, npcs: {}, pits: {}, tps: {}, traps: {}, hintT: {}, loops: 0, btn: null, btnFails: 0, seq: [], tpUsed: {}, spinSeen: false, plateSeen: {} };
  S.floors[f] = fl;
  for (const d of Object.values(X.doors)) fl.doors[d.id] = { open: d.kind === 'illusion' ? 0 : 0, want: 0, locked: !!d.lock || d.kind === 'seal', wards: 0 };
  for (const id of Object.keys(F.plates || {})) fl.plates[id] = false;
  for (const ft of X.featList) {
    const o = ft.o || {}, st = {};
    if (ft.kind === 'lever') st.on = false;
    if (['alcove', 'shrine', 'gearNiche', 'clockFace'].includes(ft.kind)) st.items = (o.holds || []).map(id => mkItem(id));
    if (ft.kind === 'candle') st.lit = false;
    if (ft.kind === 'catch') st.used = false;
    if (ft.kind === 'greatLock') st.turned = false;
    if (ft.kind === 'raiseShrine') st.used = false;
    fl.feats[ft.id] = st;
  }
  for (const [x, y, id, n] of F.items || []) addItem(fl, x, y, mkItem(id, n));
  for (const [id, p] of Object.entries(F.pits || {})) fl.pits[id] = { open: !(p[2] && p[2].trapdoor), bridged: false };
  for (const id of Object.keys(F.tps || {})) fl.tps[id] = true;
  for (const id of Object.keys(F.traps || {})) fl.traps[id] = true;
  for (const [id, x, y, dir, o] of F.npcs || []) fl.npcs[id] = { x, y, dir, state: o && o.hidden ? 'hidden' : 'here' };
  for (const [x, y, type, n, o] of F.mons || []) if (type === 'boltholder') B.makeBoss(x, y); else for (let k = 0; k < n; k++) spawnMon(fl, type, x, y, Object.assign({}, o || {}, n > 1 && o && o.id ? { id: o.id + k } : {}));
  return fl;
}
B.initFloor = initFloor;
function addItem(fl, x, y, it) { const k = key(x, y); (fl.items[k] || (fl.items[k] = [])).push(it); }
B.addItem = addItem;
/** a monster on a floor: it takes the free slot of its cell */
function spawnMon(fl, type, x, y, o = {}) {
  const T = B.MON(type);
  let hp = Math.max(1, Math.round(T.hp * B.T.monHP * B.diff().monHP * (T.boss ? B.T.bossHP : 1)));
  const m = { uid: ++S.uid, type, id: o.id || null, cx: x, cy: y, slot: 0, hp, max: hp, st: o.asleep ? 'asleep' : o.patrol ? 'patrol' : 'idle', aware: false, lost: 0,
    atkT: 1 + (S.uid % 7) * .2, wind: 0, windK: null, re: 0, mt: 0, glide: 0, gx: x, gy: y, dir: 2, status: {}, patrol: o.patrol || null, pi: 0,
    stole: [], drop: o.fixed || null, flash: 0, dead: 0, boltT: 2 + (S.uid % 5) * .5, holdT: 6, gazeT: 2, gaze: 0, flee: 0, sightBark: o.sight || null, half: o.half || null, death: o.death || null, halfDone: false, group: o.group || null, zap: 0 };
  m.slot = freeSlot(fl, x, y, T.size);
  fl.mons.push(m);
  return m;
}
B.spawnMon = spawnMon;
/** the units taken in a cell (living monsters), and a free slot there for a monster of a size */
const unitsIn = (fl, x, y, except) => fl.mons.reduce((a, m) => a + (m.hp > 0 && m !== except && m.cx === x && m.cy === y ? B.UNITS[B.MON(m.type).size] : 0), 0);
function freeSlot(fl, x, y, size) {
  if (size === 'L') return 0;
  const taken = new Set(fl.mons.filter(m => m.hp > 0 && m.cx === x && m.cy === y).map(m => m.slot));
  const n = size === 'M' ? 2 : 4; for (let i = 0; i < n; i++) if (!taken.has(i)) return i;
  return 0;
}
B.unitsIn = unitsIn; B.freeSlot = freeSlot;

/* ---- the save and the hash ---- */
B.serialize = () => { const o = Object.assign({}, S); o.events = []; return JSON.parse(JSON.stringify(o)); };
B.load = data => { const s = JSON.parse(JSON.stringify(data)); s.events = []; if (!s.v) throw new Error('not a save'); B.setState(s); B._fovKey = null; look(); return s; };
B.hash = () => { const o = Object.assign({}, S); delete o.events; return fnv(stable(o)); };

/** the attract mode's party: the premade four at level 5 plus Tamsin and Durgan, every spell, good gear */
B.demoParty = () => {
  const p = B.clone(B.PREMADE).concat([B.clone(B.NPCS.tamsin), B.clone(B.NPCS.durgan)]);
  p[0].gear = { main: 'wardensBlade', off: 'ironShield', body: 'chainShirt', head: 'leatherCap', pack: ['ration', 'potionHealing'] };
  p[3].book = B.ARCANE.slice();
  for (const d of p) { d.lvl = 5; delete d.hp; d.fill = true; }
  p.forEach(d => { d.npc = d.id === 'tamsin' || d.id === 'durgan' ? d.id : null; });
  return p;
};
