/* SIM: the state (also the save format, version 1), new games, members and items. The sim is pure: it never touches the
 * 3D world, the DOM, sound or the global random; it runs the same in Node. */
B.PREMADE = [
  { name: 'Brannoc', race: 'human', cls: 'F', look: 0, stats: { str: 17, dex: 12, con: 16, int: 9, wis: 10 }, hp: 12, gear: { main: 'longSword', off: 'woodenShield', body: 'leatherArmor' }, pack: ['ration'] },
  { name: 'Ysa', race: 'elf', cls: 'R', look: 1, stats: { str: 14, dex: 17, con: 12, int: 12, wis: 13 }, hp: 8, gear: { main: 'shortSword', off: 'shortSword', body: 'leatherArmor' }, pack: ['shortBow', ['arrows', 20], 'ration'] },
  { name: 'Cobb', race: 'dwarf', cls: 'C', look: 0, stats: { str: 13, dex: 9, con: 16, int: 10, wis: 16 }, hp: 10, gear: { main: 'mace', off: 'holySymbol', body: 'leatherArmor' }, pack: ['ration'], mem: ['mend', 'mend'] },
  { name: 'Odelia', race: 'human', cls: 'M', look: 1, stats: { str: 8, dex: 14, con: 11, int: 17, wis: 11 }, hp: 4, gear: { main: 'dagger', off: 'spellbook', body: 'travellersRobe' }, pack: [['darts', 4], 'ration'], book: ['sparkDart', 'findSeams', 'slumber'], mem: ['sparkDart', 'slumber'] }
];
B.NPCS = {
  tamsin: { name: 'Tamsin', race: 'halfling', cls: 'T', lvl: 2, look: 1, stats: { str: 10, dex: 17, con: 13, int: 13, wis: 9 }, hp: 12, gear: { main: 'dagger', body: 'leatherArmor' }, pack: [['darts', 6], 'lockpicks'], rig: 'tamsin' },
  durgan: { name: 'Durgan', race: 'dwarf', cls: 'F', lvl: 3, look: 3, stats: { str: 17, dex: 10, con: 17, int: 11, wis: 10 }, hp: 28, gear: { main: 'copperhandsMaul', off: 'buckler', head: 'ironHelm', body: 'scaleMail' }, pack: [], rig: 'durgan' },
  veil: { name: 'Veil', race: 'human', cls: 'C', lvl: 4, look: 1, stats: { str: 10, dex: 13, con: 12, int: 14, wis: 17 }, hp: 23, gear: { main: 'staff', off: 'veilsLantern', body: 'paddedJerkin' }, pack: [], mem: ['mend', 'mend', 'mend', 'steadyHand', 'purge', 'purge', 'holdFast'], rig: 'veil' }
};
B.item = (id, n) => { const d = B.ITEMS[id]; const it = { id, uid: B.S ? B.uid() : 0 }; if (d && d.stack) it.n = n || 1; if (d && d.charges) it.ch = d.charges; if (d && d.uses) it.u = d.uses; return it; };
B.itemName = it => { if (!it) return ''; const d = B.ITEMS[it.id]; return (d ? d.name : it.id) + (it.n > 1 ? ' ×' + it.n : '') + (it.rust ? ' (Rusted)' : ''); };
B.def = it => it && B.ITEMS[it.id];

/** a new member from a template: { name, race, cls, look, stats, hp, gear, pack, book, mem, lvl } */
B.makeMember = (t, i) => {
  const m = { id: 'm' + i + '_' + (t.npc || t.name), name: t.name, race: t.race, cls: t.cls, look: t.look || 0, sex: t.sex || 0, lvl: 1, xp: 0, hp: t.hp, max: t.hp,
    food: 100, stats: Object.assign({}, t.stats), state: 'ok', status: {}, slots: {}, pack: new Array(12).fill(null), book: (t.book || []).slice(), mem: [], cool: { main: 0, off: 0 }, coolMax: { main: 1, off: 1 },
    ward: 0, loh: t.cls === 'P' ? 1 : 0, npc: t.npc || null, rig: t.rig || null, pop: {}, starve: 0, regen: 0, poisonT: 0 };
  for (const [s, id] of Object.entries(t.gear || {})) m.slots[s] = B.item(id);
  let k = 0; for (const p of t.pack || []) { const [id, n] = Array.isArray(p) ? p : [p]; m.pack[k++] = B.item(id, n); }
  if (t.cls === 'R' && !m.slots.quiver) { const ai = m.pack.findIndex(x => x && x.id === 'arrows'); if (ai >= 0) { m.slots.quiver = m.pack[ai]; m.pack[ai] = null; } }
  const lv = t.lvl || 1; if (t.xp) m.xp = t.xp;
  if (lv > 1) { m.xp = B.XP_LEVELS[lv - 1]; m.lvl = lv; m.max = m.hp = t.hp; }
  for (const s of t.mem || []) B.memAdd(m, s, true, true);
  return m;
};
/** the member's derived numbers: stats with gear, Defense, to-hit, slot counts */
B.stat = (m, s) => { let v = m.stats[s]; for (const it of Object.values(m.slots)) { const d = B.def(it); if (d && d[s]) v += d[s]; } return v; };
B.hasStatus = (m, s) => (m.status[s] || 0) > 0;
B.defense = m => {
  let d = 10 + B.mod(B.stat(m, 'dex'));
  for (const s of ['body', 'head', 'arms', 'ring1', 'ring2', 'neck', 'feet']) { const it = B.def(m.slots[s]); if (it && it.def) d += it.def; }
  const off = B.def(m.slots.off); if (off && off.kind === 'shield') d += off.def;
  const bd = B.def(m.slots.body); if (bd && m.slots.body.corrode) d -= m.slots.body.corrode;
  if (m.status.brace > 0) d += 3; if (m.ward > 0) d += 3;
  return d;
};
B.toHitBonus = m => { const c = B.CLASSES[m.cls]; return Math.floor(m.lvl * c.hitPer) + (m.cls === 'F' ? 1 : 0) + B.T.partyHit + (B.hasStatus(m, 'steady') || B.S.party.fx.steady > 0 ? 1 : 0); };
B.casterKind = m => m.cls === 'M' ? 'M' : (m.cls === 'C' || (m.cls === 'P' && m.lvl >= 3)) ? 'C' : null;
B.slotCount = (m, lvl) => {
  const k = B.casterKind(m); if (!k) return 0;
  if (m.cls === 'P') return lvl === 1 ? 1 : 0;
  let n = B.SLOTTAB[k][lvl - 1][Math.min(7, m.lvl - 1)];
  if (k === 'M' && lvl === 1 && B.stat(m, 'int') >= 16) n++;
  if (k === 'C' && lvl === 1 && B.stat(m, 'wis') >= 15) n++;
  if (k === 'C' && lvl === 2 && B.stat(m, 'wis') >= 17 && n > 0) n++;
  if (k === 'M' && lvl === 1) for (const it of Object.values(m.slots)) { const d = B.def(it); if (d && d.slot1) n += d.slot1; }
  return n;
};
/** the spells a member may prepare: a mage's book, a cleric's every prayer of a level it can cast */
B.knownSpells = m => {
  const k = B.casterKind(m); if (!k) return [];
  if (k === 'M') return m.book.slice();
  return Object.keys(B.SPELLS).filter(s => !B.SPELLS[s].arcane && B.slotCount(m, B.SPELLS[s].lvl) > 0 && (m.cls !== 'P' || s === 'mend'));
};
B.memAdd = (m, s, ready = false, force = false) => { const sp = B.SPELLS[s]; if (!sp) return false; if (!force && m.mem.filter(x => B.SPELLS[x.s].lvl === sp.lvl).length >= B.slotCount(m, sp.lvl)) return false; m.mem.push({ s, ready }); return true; };
B.alive = () => B.S.party.members.filter(m => m.state === 'ok');
B.partyOrder = () => B.S.party.formation.map(i => B.S.party.members[i]).filter(Boolean);
B.rowOf = m => { const k = B.S.party.formation.indexOf(B.S.party.members.indexOf(m)); return k < 0 ? 3 : Math.floor(k / 2) + 1; };
B.colOf = m => { const k = B.S.party.formation.indexOf(B.S.party.members.indexOf(m)); return k % 2; };   // 0 left, 1 right

/** a fresh game state; party: an array of member templates (the premade four by default) */
B.newState = (seed = 1, party = B.PREMADE, o = {}) => {
  B.S = { v: 1, seed, rng: B.seedRng(seed), nextUid: 1, time: 0, playTime: 0, floor: o.floor || 'f1', diff: o.diff || 'normal', mode: o.mode || 'campaign',
    party: { cx: 0, cy: 0, dir: 0, tween: null, queued: null, hand: null, selected: 0, members: [], formation: [], fx: { float: 0, seeing: 0, steady: 0, freeHinge: 0 }, lock: 0 },
    floors: {}, flags: {}, quests: { main: 'Find what holds the city\'s bolts, and break its grip.' }, special: {}, notes: [], log: [], stats: { kills: 0, secrets: 0, deaths: 0, potions: 0, rests: 0, steps: 0, levels: 0 },
    events: [], hintsShown: {}, talk: null, barks: [], camp: null, over: false, won: false, proj: [], wards: 0, race: null, bossIntro: 0 };
  B.S.party.members = party.map((t, i) => B.makeMember(t, i));
  B.S.party.formation = B.S.party.members.map((_, i) => i);
  for (const id of o.floors || (B.S.mode === 'race' ? ['race'] : B.FLOOR_ORDER)) B.initFloor(id);
  const st = B.FLOORS[B.S.floor].start; B.S.party.cx = st[0]; B.S.party.cy = st[1]; B.S.party.dir = st[2];
  B.buildRuntime(); B.look();
  return B.S;
};
/** a floor's state from its data: doors, plates, features, items, monsters */
B.initFloor = id => {
  const F = B.FLOORS[id], FS = { doors: {}, plates: {}, feat: {}, items: {}, mons: [], seen: {}, done: {}, pits: {}, tps: {}, loops: {}, secrets: {}, traps: {}, wand: 0, visited: 0, hintT: {}, btn: {}, seq: [], wanderers: (F.wanderers || {}).budget || 0, trapdoors: {} };
  B.S.floors[id] = FS;
  for (const [did, d] of Object.entries(F.doors || {})) {
    const ch = F.map[d.at[1]][d.at[0]];
    FS.doors[did] = { open: 0, want: 0, locked: !!d.key || !!d.seal || !!d.undergate, kind: ch === '+' ? 'door' : ch === '=' ? 'gate' : d.seal ? 'seal' : d.undergate ? 'undergate' : 'locked' };
  }
  for (const pid of Object.keys(F.plates || {})) FS.plates[pid] = { down: false, done: false };
  for (const [pid, p] of Object.entries(F.pits || {})) FS.pits[pid] = { bridged: false, open: !p.trapdoor };
  for (const tid of Object.keys(F.teleports || {})) FS.tps[tid] = { on: true };
  for (const sid of Object.keys(F.secrets || {})) FS.secrets[sid] = { open: 0, want: 0 };
  for (const tid of Object.keys(F.traps || {})) FS.traps[tid] = { armed: true };
  for (const [fid, kind, , , , o = {}] of F.features || []) {
    const f = { on: kind === 'lever' ? !!o.up : false, items: (o.holds || []).map(i => B.item(i)), moved: false };
    FS.feat[fid] = f;
  }
  for (const [x, y, iid, n] of F.items || []) B.dropAt(id, x, y, B.item(iid, n));
  for (const [type, x, y, n = 1, o = {}] of F.mons || []) for (let i = 0; i < n; i++) B.spawnMon(id, type, x, y, Object.assign({}, o, { id: n > 1 && o.id ? o.id + i : o.id }));
};
B.dropAt = (fid, x, y, it) => { const FS = B.S.floors[fid], k = key(x, y); (FS.items[k] || (FS.items[k] = [])).push(it); return it; };
/** put an item somewhere in the party: a stack it joins, the selected member's pack, anyone's; else the floor */
B.giveParty = it => {
  const P = B.S.party, order = [P.members[P.selected], ...P.members].filter(m => m && m.state !== 'dead');
  const d = B.def(it);
  if (d && d.stack) for (const m of order) for (const s of [...m.pack, m.slots.quiver]) if (s && s.id === it.id && s.n < d.stack) { const t = Math.min(d.stack - s.n, it.n); s.n += t; it.n -= t; if (!it.n) return 'stack'; }
  for (const m of order) { const i = m.pack.indexOf(null); if (i >= 0) { m.pack[i] = it; return m; } }
  B.dropAt(B.S.floor, P.cx, P.cy, it); return null;
};
B.findItem = (pred) => { for (const m of B.S.party.members) { if (m.state === 'dead') continue; for (let i = 0; i < 12; i++) if (m.pack[i] && pred(m.pack[i])) return { m, where: 'pack', i, it: m.pack[i] }; for (const s of B.SLOTS) if (m.slots[s] && pred(m.slots[s])) return { m, where: 'slot', i: s, it: m.slots[s] }; } const h = B.S.party.hand; if (h && pred(h)) return { where: 'hand', it: h }; return null; };
B.removeFound = f => { if (!f) return; if (f.where === 'hand') B.S.party.hand = null; else if (f.where === 'pack') f.m.pack[f.i] = null; else delete f.m.slots[f.i]; };
B.countItem = id => { let n = 0; for (const m of B.S.party.members) { for (const it of [...m.pack, ...Object.values(m.slots)]) if (it && it.id === id) n += it.n || 1; } if (B.S.party.hand && B.S.party.hand.id === id) n += B.S.party.hand.n || 1; return n; };

/* ---- events and messages ---- */
B.ev = (t, o = {}) => { o.t = t; B.S.events.push(o); return o; };
B.msg = (text, color) => { const S = B.S; S.log.push({ text, t: S.time, color: color || null }); if (S.log.length > 100) S.log.shift(); B.ev('msg', { text, color }); };
B.sfx = (name, o = {}) => B.ev('sfx', Object.assign({ name }, o));
B.hint = id => { if (B.S.hintsShown[id] || B.S.mode !== 'campaign') return; B.S.hintsShown[id] = 1; B.ev('hint', { id }); };
B.quest = (id, text) => { B.S.quests[id] = text; };
