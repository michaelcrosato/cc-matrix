/* ===== 21 sim · new game, the party, movement, the floors and their features =====
 * The party moves one cell at a time. The cell changes when a step starts; the arrival effects (plates, pits, teleporters,
 * spinners, traps, wires) happen when it ends. One command is buffered while a step runs. */
const PREMADE = [
  { name: 'Brannoc Ironside', race: 'human', cls: 'F', base: { str: 17, dex: 12, con: 16, int: 9, wis: 10 }, gear: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor' }, pack: ['ration'] },
  { name: 'Ysa Thornfeather', race: 'elf', cls: 'R', base: { str: 14, dex: 17, con: 12, int: 12, wis: 13 }, gear: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor', quiver: 'arrows' }, pack: ['shortBow', 'ration', 'arrows'] },
  { name: 'Father Cobb', race: 'dwarf', cls: 'C', base: { str: 13, dex: 9, con: 16, int: 10, wis: 16 }, gear: { main: 'mace', off: 'holySymbol', body: 'leatherArmor' }, pack: ['ration'], prep: { 1: ['mend', 'mend'] } },
  { name: 'Odelia Fenn', race: 'human', cls: 'M', base: { str: 8, dex: 14, con: 11, int: 17, wis: 11 }, gear: { main: 'dagger', off: 'spellbook', body: 'travellersRobe' }, pack: ['darts', 'darts', 'darts', 'darts', 'ration'], book: ['sparkDart', 'findSeams', 'slumber'], prep: { 1: ['sparkDart', 'slumber'] } }];
/** the NPCs who may join: their stats and gear (PLAN §7.9) */
const NPCS = {
  tamsin: { name: 'Tamsin Pell', race: 'halfling', cls: 'T', base: { str: 10, dex: 17, con: 13, int: 13, wis: 9 }, gear: { main: 'dagger', body: 'leatherArmor' }, pack: ['darts', 'darts', 'darts', 'darts', 'darts', 'darts', 'lockpicks'], npc: 'tamsin' },
  durgan: { name: 'Durgan Copperhand', race: 'dwarf', cls: 'F', base: { str: 17, dex: 10, con: 17, int: 11, wis: 10 }, gear: { main: 'copperhandsMaul', off: 'buckler', head: 'ironHelm', body: 'scaleMail' }, pack: [], npc: 'durgan' },
  veil: { name: 'Sister Veil', race: 'human', cls: 'C', base: { str: 10, dex: 13, con: 12, int: 14, wis: 17 }, gear: { main: 'staff', neck: 'veilsLantern', body: 'paddedJerkin' }, pack: [], prep: { 1: ['mend', 'mend', 'mend'] }, npc: 'veil', lvl: 4 }
};
/** the premade party's stats, gear and HP: a member record */
function makeMember(o, lvl) {
  const raceMods = B.RACES[o.race].mods, st = {};
  for (const k of ['str', 'dex', 'con', 'int', 'wis']) st[k] = Math.max(3, Math.min(18, (o.base[k] || 10) + (raceMods[k] || 0)));
  const m = { name: o.name, race: o.race, cls: o.cls, lvl: 1, xp: 0, hp: 0, max: 0, food: 100, stats: st, state: 'ok', status: {},
    slots: { head: null, neck: null, body: null, arms: null, main: null, off: null, ring1: null, ring2: null, feet: null, quiver: null }, pack: Array(12).fill(null),
    book: (o.book || []).slice(), prep: { 1: [], 2: [], 3: [] }, used: { 1: 0, 2: 0, 3: 0 }, cool: { main: 0, off: 0 }, ward: 0, layOnHands: 1, mendOnce: 1,
    npc: o.npc || null, beard: B.RACES[o.race].beard || null, voice: o.race, sex: o.sex || 'f', look: o.look || 0, _xpTo: 0, hurtT: 0 };
  for (const [slot, id] of Object.entries(o.gear || {})) m.slots[slot] = mkItem(id);
  (o.pack || []).forEach((id, i) => { m.pack[i] = mkItem(id, 1); });
  const want = o.prep || {}; for (const l of [1, 2, 3]) m.prep[l] = (want[l] || []).slice();
  m.max = memberMaxHp(m, 1); m.hp = m.max;
  for (let i = 1; i < (o.lvl || lvl || 1); i++) levelUpSilently(m);
  return m;
}
/** HP for a level: level 1 the die and CON; each later level half the die plus one plus CON (at least 1) */
function memberMaxHp(m, lvl) {
  const die = B.CLASSES[m.cls].die, cm = B.MOD(m.stats.con), extra = Math.max(1, Math.floor(die / 2) + 1 + cm);
  return Math.max(1, die + cm + (lvl - 1) * extra);
}
/** the class's to-hit bonus (a level's share) */
const classHit = m => Math.floor(B.CLASSES[m.cls].hit * m.lvl);
/** the spell slots a caster has at each level (mage: arcane; cleric: prayers; paladin/ranger/thief: none) */
function slotsMax(m) {
  const out = { 1: 0, 2: 0, 3: 0 }; const tbl = B.SLOT_TABLE[m.cls];
  if (m.cls === 'M' && tbl) { for (const l of [1, 2, 3]) out[l] = tbl[l][Math.min(7, m.lvl - 1)]; if (m.stats.int >= 16) out[1]++; }
  if (m.cls === 'C' && tbl) { for (const l of [1, 2, 3]) out[l] = tbl[l][Math.min(7, m.lvl - 1)]; if (m.stats.wis >= 15) out[1]++; if (m.stats.wis >= 17) out[2]++; }
  if (m.cls === 'P' && m.lvl >= 3) out[1] = 1;
  const robe = Object.values(m.slots).some(it => it && it.id === 'robeOfTheLintel');
  if (robe && (m.cls === 'M')) out[1]++;
  return out;
}
function levelUpSilently(m) {
  m.lvl++; const mx = memberMaxHp(m, m.lvl); m.hp += mx - m.max; m.max = mx;
}
/** a fresh game: the premade party (or the given roster), the first floor, the party at its start */
function newGame(o = {}) {
  const seed = (o.seed || 1) >>> 0;
  S = { v: 1, seed, rng: B.seedStreams(seed), time: 0, play: 0, floor: 'f1', diff: o.diff || 'Normal', diffMult: B.DIFF[o.diff || 'Normal'],
    events: [], log: [], hints: {}, flags: {}, deeds: {}, secrets: 0, notes: [], stats: { kills: 0, secrets: 0, deaths: 0, potions: 0, rests: 0, steps: 0, falls: 0 },
    npcState: {}, floors: {}, proj: [], over: null, won: false, race: null, bumpT: 0, freeze: 0, ended: false, cam: null, lastRest: -99, fight: 0, callPts: 0 };
  for (const f of [...FLOOR_ORDER, 'race']) S.floors[f] = makeFloorState(f);
  const roster = (o.members || PREMADE).map(p => makeMember(p, o.lvl));
  const f1 = B.FLOORS.f1;
  S.party = { cx: f1.start[0], cy: f1.start[1], dir: f1.start[2], tween: null, queued: null, hand: null, sel: 0, roster, place: [0, 1, 2, 3, -1, -1],
    light: 1, floating: 0, seeing: 0, steady: 0, freeHinge: 0, shield: 0, brace: 0, held: 0, tmp: {} };
  S.floors.f1.visited = true; reveal();
  return S;
}
/* ---- the roster and the formation ---- */
/** the roster indices in the party, in place order */
const inParty = () => S.party.place.filter(i => i >= 0);
/** the member at a place (0..5), or null */
const memAt = p => { const i = S.party.place[p]; return i >= 0 ? S.party.roster[i] : null; };
/** the members in the party, in place order, with their places: [[member, place]] */
const partyList = () => S.party.place.map((i, p) => [i >= 0 ? S.party.roster[i] : null, p]).filter(x => x[0]);
/** the row of a place: 0 front (places 0,1), 1 middle (2,3), 2 back (4,5) */
const rowOf = p => Math.floor(p / 2);
/** the members who are conscious (not Down or Dead) */
const awake = () => partyList().map(x => x[0]).filter(m => m.state === 'ok');
/** the party's members as roster indices */
const rosterIdx = m => S.party.roster.indexOf(m);
/* ---- movement ---- */
const stepTime = () => B.T.stepT * (S.stepMode === 'quick' ? .57 : S.stepMode === 'instant' ? 0 : 1);
const turnTime = () => B.T.turnT * (S.stepMode === 'quick' ? .6 : S.stepMode === 'instant' ? 0 : 1);
/** the party may step (not while a tween runs; a queued command runs when it ends) */
function partyBusy() { return !!S.party.tween; }
/** a move command in the party's direction: forward, back or sideways (f b l r) */
function moveCmd(which) {
  const p = S.party; if (p.tween) { if (!p.queued) p.queued = { c: 'move', d: which }; return { ok: true, queued: true }; }
  return tryMove(which);
}
function tryMove(which) {
  const p = S.party, d = rel(p.dir, which), x = p.cx + DX[d], y = p.cy + DY[d];
  if (monAt(x, y)) { msgLimit('Something blocks the way!'); ev('bump', { d: which }); return { ok: false, why: 'monster' }; }
  if (!passable(x, y, 'party')) {
    const c = cellOf(x, y), k = idAt(x, y), f = S.floors[S.floor];
    const why = c === '=' ? 'The gate will not budge.' : (c === 'L' || c === 'K') ? 'It is locked.' : (c === 'M') ? 'The magic seal holds.' : c === 'U' ? 'The Undergate will not open.' : "You can't go that way.";
    if (c === '=' && k && f.gates[k] && f.gates[k].open === false) msgLimit('The gate will not budge.');
    else msgLimit(why);
    ev('bump', { d: which }); return { ok: false, why: 'wall' };
  }
  p.from = [p.cx, p.cy]; p.cx = x; p.cy = y; p.tween = { k: 'step', fx: p.from[0], fy: p.from[1], fdir: p.dir, t: 0, dur: stepTime(), arrive: true };
  S.stats.steps++; sfx('step');
  if (p.tween.dur <= 0) finishTween();
  return { ok: true };
}
function turnCmd(s) {
  const p = S.party; if (p.tween) { if (!p.queued) p.queued = { c: 'turn', s }; return { ok: true, queued: true }; }
  const fdir = p.dir; p.dir = (p.dir + s + 4) % 4; p.tween = { k: 'turn', fx: p.cx, fy: p.cy, fdir, t: 0, dur: turnTime(), arrive: false };
  sfx('turn'); if (p.tween.dur <= 0) finishTween();
  return { ok: true };
}
/** a message that repeats at most once in 2 seconds */
function msgLimit(text) { if (S.time - S.bumpT < 2 && S.lastBump === text) return; S.bumpT = S.time; S.lastBump = text; msg(text); }
/** the step's tween ends: arrival effects for a move */
function finishTween() {
  const p = S.party, tw = p.tween; p.tween = null;
  if (tw && tw.arrive) arrive();
  if (p.queued && !p.tween) { const q = p.queued; p.queued = null; if (q.c === 'move') tryMove(q.d); else turnCmd(q.s); }
}
/** the party has come into its cell: the stairs, pits, teleporters, traps, plates, spinners and the wires */
function arrive() {
  const p = S.party, c = cellOf(p.cx, p.cy), k = idAt(p.cx, p.cy), f = curFS();
  reveal();
  // stairs: change floor (a sealed one only tells you so)
  const st = curF().stairs && curF().stairs[key(p.cx, p.cy)];
  if (st) {
    if (st.to === 'sealed') { msg('The grate above is bolted fast. There is no way back.'); }
    else if (st.to === 'exit') { raceFinish(); return; }
    else { goFloor(st.to, st.at, 'stairs'); return; }
  }
  if (c === 'T') { dartTrap(k); }
  if (c === '^' && f.teles[k] && f.teles[k].on) { f.loops[k] = (f.loops[k] || 0) + 1; wireFire('loops', [p.cx, p.cy], { n: f.loops[k] }); teleportTo(curF().teleporters[k]); return; }
  if (c === 'S' && f.teles[k] && f.teles[k].spin) { spinParty(); }
  if (c === 'O' || c === 'o') { if (!p.floating && !(f.pits[k] && f.pits[k].bridged)) { if (c === 'o' && !f.pits[k]) { f.pits[k] = { open: true }; } fall(k); return; } }
  if (c === 'P' && f.plates[k]) { /* plates are read by weight in settle() */ }
  // wires for entering a cell or an area
  wireEnter(p.cx, p.cy);
  settle();
}
/** the plates weigh the party, items and monsters; a change fires its wires */
function settle() {
  const f = curFS(), d = curF();
  for (const [pk, pl] of Object.entries(f.plates)) {
    const [x, y] = d.ids[pk]; const cell = curF().rows[y][x];
    if (cell !== 'P') continue;
    const weight = (S.party.cx === x && S.party.cy === y && !S.party.floating) || (f.items[key(x, y)] && f.items[key(x, y)].length > 0) || monsOn().some(m => m.hp > 0 && m.cx === x && m.cy === y && monUnits(m) >= 2);
    if (!!weight !== pl.down) { pl.down = !!weight; ev('plate', { id: pk, down: pl.down }); sfx(pl.down ? 'plate' : 'click'); firePlate(pk, pl); }
  }
  checkLevers();
}
/** a dart trap: 1d4 each to the two front members (a thief who has looked may see it) */
function dartTrap(id) {
  const f = curFS(); if (f.traps && f.traps[id] && f.traps[id].off) return;
  sfx('dart'); msg('Darts fly from the walls!');
  const targets = [0, 1].map(pl => memAt(pl)).filter(m => m && m.state === 'ok');
  for (const m of targets) hurtMember(m, Math.max(1, Math.round(B.roll(S, 'world', '1d4') * B.T.trapDmg)), 'darts');
}
/** a silent or visible teleporter: the party goes to its target (the loops count the passes) */
function teleportTo(t) {
  const [x, y, d] = t.to; S.party.cx = x; S.party.cy = y; S.party.dir = d; S.party.tween = null;
  ev('tele', { to: [x, y, d], silent: !!t.silent }); if (!t.silent) sfx('whoosh');
  reveal(); wireEnter(x, y); settle();
}
function spinParty() {
  const d = B.rint(S, 'world', 4); S.party.dir = d; ev('spin', {}); sfx('grind'); msg('You feel a twisting underfoot.');
}
/** a pit: the party falls to the floor below, 1d6 each, and lands at the pit's landing */
function fall(id) {
  const pits = curF().pits || {}, pd = curF().pitTo && curF().pitTo[id]; const to = (pd || { to: 'f3', at: [2, 15, 0] });
  S.stats.falls++; sfx('fall'); msg('The floor gives way!'); ev('fall', { id });
  for (const [m] of partyList()) hurtMember(m, B.roll(S, 'world', '1d6'), 'fall');
  goFloor(to.to, to.at, 'fall');
}
/** change the floor: the party to the arrival cell; the floor card; an autosave (the view saves) */
function goFloor(to, at, how) {
  const from = S.floor; S.floor = to; const f = S.floors[to]; f.visited = true;
  S.party.cx = at[0]; S.party.cy = at[1]; S.party.dir = at[2]; S.party.tween = null; S.party.queued = null; S.party.floating = S.party.floating;
  for (const m of monsOn()) if (m.aware) m.aware = false;
  reveal(); ev('floor', { to, from, how, card: B.FLOORS[to].card, name: B.FLOORS[to].name, song: B.FLOORS[to].song });
  if (B.FLOORS[to].song) ev('music', { song: B.FLOORS[to].song });
  wireEnter(at[0], at[1]);
  settle();
}
/* ---- wall features: use from the cell in front (or the cell itself, for the feature on its face) ---- */
/** the wall feature the party faces: in its cell, the face it looks at */
function faced() { const p = S.party; return featAt(p.cx, p.cy, p.dir); }
/** the cell in front of the party */
function frontCell() { const p = S.party; return [p.cx + DX[p.dir], p.cy + DY[p.dir]]; }
/** the object the party faces: a feature on the wall, a door or gate in front, a monster, or nothing */
function facing() {
  const p = S.party, [fx, fy] = frontCell(), w = faced();
  if (w) return { kind: 'feature', w };
  const d = curF(), c = d.rows[fy] && d.rows[fy][fx];
  if (c === '+' || c === 'L' || c === 'K' || c === 'M' || c === 'H' || c === 'U' || c === 'T' || c === '=') return { kind: 'cell', c, x: fx, y: fy, id: idAt(fx, fy) };
  return null;
}
/** the feature a use acts on, and what it did: { ok, why } */
function useFeature(w) {
  const k = w.k, f = curFS();
  if (k === 'lever') { const lv = f.levers[w.id]; lv.on = !lv.on; sfx('lever'); ev('lever', { id: w.id, on: lv.on }); wireFire('lever', w.id, { on: lv.on }); settle(); return { ok: true }; }
  if (k === 'button') { pressButton(w.id); sfx('click'); return { ok: true }; }
  if (k === 'catch') { sfx('click'); wireFire('catch', w.id); return { ok: true }; }
  if (k === 'plaque') { if (w.text) { readNote(w.id, w.text); } return { ok: true }; }
  if (k === 'torch') return { ok: false, why: null };
  if (k === 'alcove' || k === 'clock') return alcoveUse(w);
  if (k === 'candle') return candleUse(w);
  if (k === 'shrine') return shrineUse(w);
  if (k === 'greatLock') return { ok: true, boss: w.id };
  return { ok: false, why: null };
}
/** a plaque or inscription: the text to the log, and to the Journal's notes */
function readNote(id, text) {
  if (!S.notes.some(n => n.id === id)) S.notes.push({ id, text });
  msg(text, 'note');
}
/** a button: its press time; both in the window opens what they wire */
function pressButton(id) {
  const f = curFS(); f.buttons = f.buttons || {}; const now = S.time;
  f.buttons[id] = now;
  wireFire('button', id);
}
/** candles: lit or not, in the sequence; the wrong order gutters them all */
function candleUse(w) {
  const f = curFS(); const c = f.candles[w.id];
  if (!c) return { ok: false };
  if (c.lit) { c.lit = false; sfx('click'); ev('candle', { id: w.id, lit: false }); return { ok: true }; }
  c.lit = true; sfx('click'); ev('candle', { id: w.id, lit: true });
  const done = f.lit || (f.lit = []);
  const expect = done.length + 1;
  if (w.seq === expect) { done.push(w.id); if (done.length === 6) { wireFire('sequence', 'C'); } }
  else { gutter(); msg('The candles gutter and die.'); }
  return { ok: true };
}
function gutter() { const f = curFS(); for (const c of Object.values(f.candles)) c.lit = false; f.lit = []; ev('gutter', {}); }
/** the Shrine of the Threshold raises one dead member, once */
function shrineUse(w) {
  const f = curFS(); if (f.flags.shrineUsed) { msg('The shrine is quiet now.'); return { ok: true }; }
  const dead = S.party.roster.find(m => m.state === 'dead' && inParty().includes(S.party.roster.indexOf(m)));
  if (!dead) { msg('The shrine waits, unused.'); return { ok: true }; }
  f.flags.shrineUsed = true; raiseMember(dead, 1); msg(dead.name + ' draws breath.'); sfx('raise'); return { ok: true };
}
/** a cell's door or gate in front: open or close a door; unlock with a key in the party's hands or packs */
function useCell(c) {
  const f = curFS(), d = curF();
  if (c.c === '+') { const dr = f.doors[c.id]; if (!dr) return { ok: false }; dr.open = !dr.open; sfx(dr.open ? 'door' : 'door'); ev('door', { id: c.id, open: dr.open }); return { ok: true }; }
  if (c.c === 'L' || c.c === 'K') { const dr = f.doors[c.id]; if (dr.open) { return { ok: false }; } return unlockWith(c.id, dr); }
  if (c.c === 'U') return undergateUse();
  if (c.c === 'T') return disarmTrap(c.id || c.x + ',' + c.y);
  if (c.c === '=') { msg('The gate will not budge.'); sfx('thud'); return { ok: false }; }
  if (c.c === 'M') { msg('The magic seal holds. Only a spell, a scroll or a wand will move it.'); return { ok: false }; }
  return { ok: false };
}
/** the key that fits: the Hand first, then the packs, and the lockpick for a thief on a simple lock */
function unlockWith(id, dr) {
  const d = B.FLOORS[S.floor].doors[id] || {};
  const want = d.lock; const found = findItem(it => B.ITEMS[it.id] && B.ITEMS[it.id].lock === want);
  if (found) {
    consumeRef(found);
    dr.open = true; dr.locked = false; S.floors[S.floor].doors[id] = dr;
    sfx('unlock'); ev('door', { id, open: true }); msg('The ' + B.ITEMS[found.item.id].name + ' turns. The door opens.');
    wireFire('unlock', id); return { ok: true };
  }
  if (d.kind === 'simple') {
    const thief = partyList().find(([m]) => m.cls === 'T' && m.state === 'ok');
    const pk = thief && findItem(it => it.id === 'lockpicks');
    if (thief && pk) {
      if (B.rnd(S, 'world') < .6) { dr.open = true; dr.locked = false; sfx('unlock'); ev('door', { id, open: true }); msg('The lock gives with a click.'); return { ok: true }; }
      sfx('scratch'); msg('The pick scratches. The lock holds.'); return { ok: false };
    }
  }
  sfx('locked'); msg(d.kind === 'warded' ? 'The lock is warded. Only its own key will turn it.' : 'It is locked.'); return { ok: false };
}
/** a thief disarms a dart trap in front of them; a fail fires it */
function disarmTrap(id) {
  const f = curFS(), pl = partyList().find(([m]) => m.cls === 'T' && m.state === 'ok');
  if (!pl) { msg('Nobody here can find the wires of it.'); return { ok: false }; }
  const [m] = pl, chance = .5 + .1 * B.MOD(m.stats.dex) + .05 * m.lvl;
  f.traps = f.traps || {};
  if (B.rnd(S, 'world') < chance) { f.traps[id] = { off: true }; msg('The trap clicks, and is still.'); sfx('click'); return { ok: true }; }
  msg('The trap springs!'); dartTrap(id); return { ok: true };
}
/** the Undergate: its three wards each draw bolts; with all three in, it opens */
function undergateUse() {
  const f = curFS(); f.undergate = f.undergate || { open: false, copper: false, brass: false, iron: false, bolts: 0 };
  const ug = f.undergate; if (ug.open) return { ok: false };
  const ref = findItem(it => B.ITEMS[it.id].lock === 'undergate' && !ug[B.ITEMS[it.id].id.replace(/Ward$/, '')]);
  if (!ref) { msg('Three wards for one gate. Copper, brass and iron.'); return { ok: false }; }
  const nm = ref.item.id.replace(/Ward$/, ''); consumeRef(ref); ug[nm] = true; ug.bolts += B.ITEMS[ref.item.id].bolts;
  sfx('lockTurn'); ev('ward', { id: nm, bolts: ug.bolts });
  msg('The ' + nm + ' ward sinks into its socket. ' + ug.bolts + ' of seven bolts draw back.');
  if (ug.copper && ug.brass && ug.iron) { ug.open = true; ev('undergate', {}); msg('The Undergate swings open.'); wireFire('undergate', 'U1'); }
  return { ok: true };
}
/** the wall feature's alcove: take the top item into the Hand, or place the Hand's item if it fits */
function alcoveUse(w) {
  const f = curFS(); const list = (f.alcoves[w.id] = f.alcoves[w.id] || []);
  const p = S.party;
  if (p.hand) {
    if (w.accepts && fitsAlcove(w, p.hand.item)) {
      const it = p.hand.item; p.hand = null; list.push(it); sfx('alcove');
      ev('alcoveIn', { id: w.id, item: it.id }); wireFire('alcove', w.id, { item: it });
      return { ok: true };
    }
    if (!w.accepts) { const it = p.hand.item; p.hand = null; list.push(it); sfx('alcove'); return { ok: true }; }
    msg('It does not fit here.'); return { ok: false };
  }
  if (list.length) { const it = list.pop(); p.hand = { item: it, from: 'alcove' }; sfx('take'); ev('alcoveOut', { id: w.id, item: it.id }); return { ok: true }; }
  if (w.text) readNote(w.id, w.text);
  return { ok: true };
}
const fitsAlcove = (w, it) => { const a = w.accepts; if (a === 'key') return B.ITEMS[it.id].k === 'key'; if (a === 'gear') return B.ITEMS[it.id].k === 'gear'; return a === it.id; };
/** a lever, plaque or gear niche in the feature table: consumes what it takes (key, gear) on the wires */
function giveTo(itemId, dest) {
  const f = curFS(), w = (curF().walls || []).find(x => x.id === dest);
  const it = mkItem(itemId);
  if (w && (w.k === 'alcove' || w.k === 'clock')) { (f.alcoves[dest] = f.alcoves[dest] || []).push(it); return; }
  const cell = w ? w.at : curF().ids[dest];
  if (!cell) return;
  const kk = key(cell[0], cell[1]); (f.items[kk] = f.items[kk] || []).push(it);
}
/* ---- items on the floor ---- */
/** the top item of a cell (the last one put down) */
const topItem = (x, y) => { const f = curFS(), l = f.items[key(x, y)]; return l && l.length ? l[l.length - 1] : null; };
/** the item ref of a found item (for keys, wards): searches the Hand, then the members' slots and packs */
function findItem(pred) {
  const p = S.party;
  if (p.hand && pred(p.hand.item)) return { item: p.hand.item, where: 'hand' };
  for (const [m, pl] of partyList()) {
    for (let i = 0; i < 12; i++) if (m.pack[i] && pred(m.pack[i])) return { item: m.pack[i], where: 'pack', m, i };
  }
  return null;
}
/** takes out one item of a found ref (a key used up, a ward placed) */
function consumeRef(ref) {
  if (ref.where === 'hand') S.party.hand = null;
  else if (ref.where === 'pack') ref.m.pack[ref.i] = null;
}
/** a stack's count: an ammo or a food item may stack up to its max */
function stackCount(it) { return it.n || 1; }
/* ---- wires on entering a cell or an area ---- */
function wireEnter(x, y, extra) {
  wireFire('enter', [x, y], extra);
  for (const [area, [x0, y0, x1, y1]] of Object.entries(curF().areas || {})) {
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) wireFire('enterArea', area, extra);
  }
}
