/* =====================================================================================
 * 24-sim-items: the Hand (the one item the party holds), packs and equipment, using things in the world (doors, locks,
 * levers, buttons, catches, alcoves, candles, plaques, the Great Locks, the Undergate), picking up, putting down, throwing
 * ===================================================================================== */
/** where an item may go: an equipment slot's rule */
function fits(m, slot, it) {
  if (!it) return true;
  const d = IT(it.id);
  if (typeof slot === 'number') return true;
  if (slot === 'main' || slot === 'off') {
    if ((d.kind === 'weapon' || d.kind === 'missile' || d.kind === 'shield') && !B.canWield(m.cls, it.id)) return 'cls';
    if (d.kind === 'armor' || d.kind === 'head' || d.kind === 'neck' || d.kind === 'arms' || d.kind === 'ring' || d.kind === 'feet') return 'no';
    if (slot === 'off' && d.two) return 'two';
    if (slot === 'off' && m.slots.main && IT(m.slots.main.id).two) return 'two';
    if (slot === 'main' && d.two && m.slots.off) return 'two';
    if (d.kind === 'shield' && slot === 'main') return 'no';
    return true;
  }
  if (slot === 'quiver') return d.kind === 'ammo' || (d.stack && d.thrown) ? true : 'no';
  const want = { head: 'head', neck: 'neck', body: 'armor', arms: 'arms', ring1: 'ring', ring2: 'ring', feet: 'feet' }[slot];
  if (d.kind !== want) return 'no';
  if (d.cls && !d.cls.includes(m.cls)) return 'cls';
  return true;
}
B.fits = fits;
const getSlot = (m, s) => typeof s === 'number' ? m.pack[s] : m.slots[s];
const setSlot = (m, s, v) => { if (typeof s === 'number') m.pack[s] = v; else m.slots[s] = v; };
B.getSlot = getSlot;
/** can two stacks of a kind join */
const stacks = (a, b) => a && b && a.id === b.id && IT(a.id).stack;
/** put an item away: the first free pack slot (or a stack of its kind), the selected member first; false when no room */
function stow(it, first = S.party.sel) {
  const ms = S.party.members.map((m, i) => i).sort((a, b) => (a === first ? -1 : 0) - (b === first ? -1 : 0)).map(i => S.party.members[i]).filter(m => m.state !== 'dead');
  if (IT(it.id).stack) for (const m of ms) for (const s of ['quiver', ...m.pack.keys()]) { const t = getSlot(m, s); if (stacks(t, it) && t.n + it.n <= 30) { t.n += it.n; return m; } }
  for (const m of ms) { const i = m.pack.indexOf(null); if (i >= 0) { m.pack[i] = it; return m; } }
  return null;
}
B.stow = stow;
/** an inventory operation from the Party screen: take, place (or swap) with the Hand, use, drop */
function invOp(o) {
  const P = S.party, m = MEM(o.m); if (!m) return;
  const s = o.slot, cur = getSlot(m, s);
  if (o.op === 'take') { if (P.hand || !cur) return; if (m.state === 'dead' && typeof s !== 'number') { /* the dead keep their gear only as loot */ }
    setSlot(m, s, null); P.hand = cur; ev('hand', {}); trimMem(m); return; }
  if (o.op === 'place') {
    const h = P.hand; if (!h) return;
    if (cur && stacks(cur, h) && cur.n + h.n <= 30) { cur.n += h.n; P.hand = null; ev('hand', {}); return; }
    const f = fits(m, s, h);
    if (f !== true) { ev('refuse', { why: f, m: o.m }); say(f === 'cls' ? '{name} cannot use that.' : f === 'two' ? 'That needs both hands.' : 'It does not go there.', { name: m.name }); return; }
    setSlot(m, s, h); P.hand = cur || null; ev('hand', {}); ev('equip', { m: o.m, slot: s }); trimMem(m); return;
  }
  if (o.op === 'use') { if (cur) useItem(m, s, cur); return; }
  if (o.op === 'drop') { if (P.hand) { const it = P.hand; P.hand = null; addItem(FL(), P.cx, P.cy, it); say('m_putDown', { item: B.art(B.itemName(it)) }); ev('drop', {}); } return; }
}
B.invOp = invOp;
/** a member uses an item from a slot: eat, drink, read, zap, scribe at camp */
function useItem(m, s, it) {
  const d = IT(it.id);
  if (m.state !== 'ok') return;
  const gone = () => { if (it.n > 1) it.n--; else setSlot(m, s, null); };
  if (d.kind === 'food') { if (m.food >= 95) { say('m_full', { name: m.name }); return; } m.food = Math.min(100, m.food + d.food); m.starveT = 0; gone(); say('m_eat', { name: m.name, item: B.art(d.name) }); ev('sfx', { id: 'eat' }); return; }
  if (d.kind === 'potion') {
    gone(); S.stats.potions++; ev('sfx', { id: 'drink' }); say('m_drink', { name: m.name, item: B.art(d.name) });
    if (d.heal) B.healMember(m, dice(...d.heal, 'combat'), true);
    if (d.cure) { delete m.status.poison; say('m_cured', { name: m.name }); }
    if (d.clarity) { for (const L of [3, 2, 1]) { const j = m.spent[L].indexOf(true); if (j >= 0) { m.spent[L][j] = false; break; } } }
    return;
  }
  if (d.kind === 'note') { readNote(d.note); return; }
  if (d.kind === 'scroll') {
    if (d.holy) { if (!(m.cls === 'C' || m.cls === 'P')) { say('m_noUse'); return; } const dead = S.party.members.findIndex(x => x.state === 'dead'); if (dead < 0) { say('m_noTarget'); return; } gone(); say('m_read', { name: m.name, item: B.art(d.name) }); B.spellEffect(m, 'raise', { target: dead }, 1); return; }
    if (m.cls !== 'M') { say('m_noUse'); return; }
    if (S.camp && !m.book.includes(d.spell)) { gone(); m.book.push(d.spell); say('m_scribe', { name: m.name, spell: B.SP(d.spell).name }); ev('sfx', { id: 'scroll' }); return; }
    const tgt = B.SP(d.spell).target === 'member' ? { target: S.party.members.indexOf(m) } : {};
    if (B.spellEffect(m, d.spell, tgt, 1) !== false) { gone(); say('m_read', { name: m.name, item: B.art(d.name) }); }
    return;
  }
  if (d.kind === 'wand') { B.zap(m, it, () => setSlot(m, s, null)); return; }
  say('m_noUse');
}
B.useItem = useItem;
function readNote(id) { if (!S.notes.includes(id)) S.notes.push(id); ev('read', { note: id }); say(B.TXT[id], null, { c: '#e8dcc0' }); }
B.readNote = readNote;

/* ---- the world in front of the party ---- */
/** ✕ / F / a click: use what is ahead: a wall feature, a door, an NPC; else take an item; else put the Hand away */
function useAhead() {
  const P = S.party, [fx, fy] = B.front(), fl = FL();
  const ft = B.featAt(P.cx, P.cy, P.dir);
  if (ft && useFeature(ft)) return true;
  const d = doorAt(fx, fy);
  if (d && useDoor(d)) return true;
  if (useTrap(fx, fy)) return true;
  if (!P.hand) {
    if (pickTop()) return true;
    if (ft) { say('m_nothing'); return true; }
    return false;
  }
  const who = stow(P.hand); if (who) { say('m_stow', { name: who.name, item: B.art(B.itemName(P.hand)) }); P.hand = null; ev('hand', {}); return true; }
  say('m_packFull'); return true;
}
B.useAhead = useAhead;
/** take the top item ahead (if that cell is open and free) or here */
function pickTop() {
  const P = S.party, [fx, fy] = B.front();
  const cell = B.openFree(fx, fy) && B.itemsAt(fx, fy).length ? [fx, fy] : B.itemsAt(P.cx, P.cy).length ? [P.cx, P.cy] : null;
  if (!cell) return false;
  const its = B.itemsAt(cell[0], cell[1]); return pick(cell[0], cell[1], its.length - 1);
}
/** take item i from a cell (ahead or here) into the Hand */
function pick(x, y, i) {
  const P = S.party, fl = FL(), [fx, fy] = B.front();
  if (!((x === P.cx && y === P.cy) || (x === fx && y === fy && B.openFree(fx, fy)))) return false;
  const its = fl.items[key(x, y)]; if (!its || !its[i]) return false;
  if (P.hand) { const who = stow(P.hand); if (!who) { say('m_packFull'); return true; } P.hand = null; }
  const it = its.splice(i, 1)[0]; if (!its.length) delete fl.items[key(x, y)];
  P.hand = it; say('m_take', { item: B.art(B.itemName(it)) }); ev('pickup', { x, y, id: it.id }); ev('hand', {});
  if (it.id === 'ratCrown' && S.race) { S.race.crowns++; S.race.score += 25; P.hand = null; ev('sting', { id: 'coin' }); }
  return true;
}
B.pick = pick;
/** hold ✕ / H: set the Hand down ahead (or here, when ahead is blocked); into a pit, it falls to the floor below */
function putDown() {
  const P = S.party, [fx, fy] = B.front(), fl = FL(); if (!P.hand) return false;
  const it = P.hand; P.hand = null; ev('hand', {});
  const ahead = B.openFree(fx, fy) && !wallAt(fx, fy);
  const [x, y] = ahead ? [fx, fy] : [P.cx, P.cy];
  if (pitOpen(x, y) && B.FLOORS[S.floor].fall) { const F = B.FLOORS[S.floor]; if (!S.floors[F.fall.to]) initFloor(F.fall.to); addItem(S.floors[F.fall.to], F.fall.at[0], F.fall.at[1], it); say('You drop {item} into the pit.', { item: B.art(B.itemName(it)) }); ev('drop', { x, y, pit: true }); return true; }
  addItem(fl, x, y, it); say('m_putDown', { item: B.art(B.itemName(it)) }); ev('drop', { x, y });
  return true;
}
B.putDown = putDown;
/** ○ / G: throw the Hand ahead, up to the throw range (+1 at STR 16+) */
function throwHand() {
  const P = S.party; if (!P.hand) return false;
  const it = P.hand, m = MEM(P.sel) && up(MEM(P.sel)) ? MEM(P.sel) : alive()[0]; if (!m) return false;
  P.hand = null; ev('hand', {});
  const d = IT(it.id), str = effStat(m, 'str');
  const range = B.T.throwRange + (str >= 16 ? 1 : 0);
  const dmg = d.thrown && d.dmg ? [d.dmg[0], d.dmg[1], d.dmg[2] + statMod(str)] : [1, 2, 0];
  B.launch({ kind: 'item', item: it, dmg, by: S.party.members.indexOf(m), range, speed: 8, hitBonus: statMod(str) + B.toHitBase(m) + (B.RACES[m.race].toss || 0) });
  say('m_throw', { item: B.art(B.itemName(it)) }); ev('throw', { m: S.party.members.indexOf(m) });
  return true;
}
B.throwHand = throwHand;
/** a door ahead: open or close a wooden one, unlock a locked one, the seal and gates say what they are */
function useDoor(d) {
  const P = S.party, fl = FL(), st = fl.doors[d.id];
  if (d.kind === 'illusion' || d.kind === 'secret') return false;
  if (d.kind === 'gate') { say('m_gate', null, { rate: 1.5 }); return true; }
  if (d.kind === 'seal') { if (st.open < .5) { say('m_seal'); hint('h_seal'); } return true; }
  if (d.kind === 'undergate') return false;
  if (st.locked) return unlock(d);
  if (monsAt(d.x, d.y).length || B.itemsAt(d.x, d.y).length && st.want) { say('m_doorBlocked'); return true; }
  st.want = st.want ? 0 : 1; ev('door', { id: d.id, open: st.want, kind: d.kind, x: d.x, y: d.y }); noise(d.x, d.y, 4);
  return true;
}
/** a locked door: its key from the Hand or any pack (used up); a thief's picks on a simple lock */
function unlock(d) {
  const P = S.party, fl = FL(), st = fl.doors[d.id];
  const keyRef = findItem(r => r.id === d.lock);
  if (keyRef) {
    keyRef.take(); st.locked = false; st.want = 1; say('m_keyTurn', { key: IT(d.lock).name }); ev('unlock', { id: d.id }); ev('door', { id: d.id, open: 1, kind: d.kind, x: d.x, y: d.y }); return true;
  }
  if (P.hand && IT(P.hand.id).kind === 'key') { say('m_noKey'); ev('sfx', { id: 'lockFail' }); return true; }
  const thief = alive().find(m => m.cls === 'T');
  if (thief && d.lk === 'simple') {
    const picks = findItem(r => r.id === 'lockpicks', thief);
    if (!picks) { say('m_noPicks', { name: thief.name }); return true; }
    const chance = .5 + .1 * statMod(effStat(thief, 'dex')) + .05 * thief.lvl;
    if (rnd('world') < chance) { st.locked = false; st.want = 1; say('m_picked', { name: thief.name }); ev('unlock', { id: d.id, picked: true }); ev('door', { id: d.id, open: 1, kind: d.kind, x: d.x, y: d.y }); }
    else { picks.ref.ch = (picks.ref.ch || 1) - 1; say('m_pickSnap', { name: thief.name }); ev('sfx', { id: 'pickSnap' }); if (picks.ref.ch <= 0) picks.take(); }
    return true;
  }
  say(d.lk === 'warded' ? 'm_wardedLock' : 'm_locked'); ev('sfx', { id: 'lockFail' });
  return true;
}
/** find a carried item (the Hand first, then the packs and slots): { ref, take() } */
function findItem(test, only) {
  const P = S.party;
  if (!only && P.hand && test(P.hand)) return { ref: P.hand, take: () => { P.hand = null; ev('hand', {}); } };
  for (const m of only ? [only] : P.members) for (const s of [...m.pack.keys(), ...SLOT_NAMES]) { const r = getSlot(m, s); if (r && test(r)) return { ref: r, m, take: () => setSlot(m, s, null) }; }
  return null;
}
B.findItem = findItem;
/** a dart trap or a trapdoor ahead: a thief disarms it */
function useTrap(x, y) {
  const X = IX(), fl = FL(), tr = X.trapAt[key(x, y)], pit = X.pitAt[key(x, y)];
  const armed = tr && fl.traps[tr.id] ? tr : pit && pit.trapdoor && !fl.pits[pit.id].open && !fl.pits[pit.id].bridged ? pit : null;
  if (!armed) return false;
  const thief = alive().find(m => m.cls === 'T'); if (!thief) return false;
  const chance = .5 + .1 * statMod(effStat(thief, 'dex')) + .05 * thief.lvl;
  if (rnd('world') < chance) { if (tr) fl.traps[tr.id] = false; else fl.pits[pit.id].bridged = true; say('m_disarm', { name: thief.name }); ev('sfx', { id: 'disarm' }); B.gainXp(thief, 20); }
  else { say('m_disarmFail', { name: thief.name }); if (tr) darts(); }
  return true;
}
/** a wall feature ahead */
function useFeature(ft) {
  const P = S.party, fl = FL(), st = fl.feats[ft.id], o = ft.o || {};
  switch (ft.kind) {
    case 'lever': st.on = !st.on; ev('lever', { id: ft.id, on: st.on }); say('m_lever', null, { rate: .5 }); noise(P.cx, P.cy, 4); trigger('lever', { id: ft.id }); return true;
    case 'button': st.t = .4; ev('button', { id: ft.id }); say('m_button', null, { rate: .5 }); trigger('button', { id: ft.id }); return true;
    case 'catch': if (st.used) { say('m_nothing'); return true; } st.used = true; ev('catch', { id: ft.id }); say(o.look === 'rivet' ? 'm_rivet' : 'm_stone'); trigger('catch', { id: ft.id }); return true;
    case 'plaque': readPlaque(ft); return true;
    case 'candle': if (st.lit) { say('m_candleLit'); return true; } st.lit = true; ev('candle', { id: ft.id }); say('m_candle'); trigger('candle', { id: ft.id }); return true;
    case 'alcove': case 'shrine': case 'gearNiche': case 'clockFace': return useAlcove(ft, st);
    case 'raiseShrine': {
      if (st.used) { say('m_shrineSpent'); return true; }
      const dead = P.members.find(m => m.state === 'dead');
      if (!dead) { say('m_shrineNone'); return true; }
      st.used = true; dead.state = 'ok'; dead.hp = 1; say('m_raiseShrine', { name: dead.name }); ev('raise', { m: P.members.indexOf(dead) }); return true;
    }
    case 'greatLock': return B.turnLock(ft);
    case 'undergate': return insertWard(ft);
    default: return false;
  }
}
B.useFeature = useFeature;
function readPlaque(ft) { const id = ft.o.text; if (!S.notes.includes(id)) S.notes.push(id); say(B.TXT[id], null, { c: '#e8dcc0' }); ev('read', { note: id, plaque: true }); }
/** an alcove: the empty Hand takes its top item; a held item goes in when the alcove takes it */
function useAlcove(ft, st) {
  const P = S.party, o = ft.o || {};
  if (!P.hand) {
    if (!st.items.length) { say(ft.kind === 'clockFace' ? 'x_clock' : 'm_alcoveEmpty'); return true; }
    if (ft.kind === 'gearNiche') { say('m_nothing'); return true; }
    const it = st.items.pop(); P.hand = it; say('m_takeAlcove', { item: B.art(B.itemName(it)) }); ev('alcoveTake', { id: ft.id }); ev('hand', {}); return true;
  }
  const it = P.hand, d = IT(it.id);
  if (ft.kind === 'gearNiche' && it.id !== 'tumblerGear') { say('m_alcoveNo'); return true; }
  if (ft.kind === 'gearNiche' && st.items.length) { say('m_alcoveFull'); return true; }
  if (ft.kind === 'clockFace') { say('m_alcoveNo'); return true; }
  if (o.accepts && ft.kind === 'shrine' && it.id !== o.accepts) { say('m_alcoveNo'); return true; }
  if (st.items.length >= 4) { say('m_alcoveFull'); return true; }
  P.hand = null; st.items.push(it); say('m_place', { item: B.art(B.itemName(it)) }); ev('alcovePlace', { id: ft.id }); ev('hand', {});
  trigger('alcove', { id: ft.id, item: it, feat: ft.id });
  return true;
}
/** the Undergate: a ward from the Hand or any pack slides in; three open it */
function insertWard(ft) {
  const fl = FL(), d = IX().doors.U1, st = fl.doors.U1;
  if (st.want) { say('m_nothing'); return true; }
  const w = findItem(r => IT(r.id).kind === 'ward' && !st['w_' + IT(r.id).ward]);
  if (!w) { say('m_wardNeed', { n: 3 - st.wards }); return true; }
  const kind = IT(w.ref.id).ward, n = kind === 'iron' ? 3 : 2;
  w.take(); st['w_' + kind] = true; st.wards++; say('m_wardIn', { item: IT(w.ref.id).name, n }); ev('ward', { kind, n: st.wards });
  if (st.wards >= 3) { S.moment = { id: 'undergate', t: 0, dur: 10 }; ev('moment', { id: 'undergate' }); }
  return true;
}
/** Examine (R3 / X): what is ahead, in the source's voice */
function examine() {
  const P = S.party, [fx, fy] = B.front(), fl = FL(), X = IX();
  const mons = monsAt(fx, fy);
  if (S.floor === 'f4' && S.boss && S.boss.alive && S.boss.cx === fx && S.boss.cy === fy) return B.T_('x_eye');
  if (mons.length) { const m = mons[0], T = B.MON(m.type), r = m.hp / m.max; const how = m.st === 'asleep' || m.status.sleep ? 'how_sleep' : r > .8 ? 'how_0' : r > .5 ? 'how_1' : r > .25 ? 'how_2' : 'how_3'; return B.T_('x_mon', { mon: T.short || T.name, how: B.TXT[how] }); }
  const npc = Object.entries(fl.npcs).find(([, n]) => n.state === 'here' && n.x === fx && n.y === fy);
  if (npc) return B.T_('x_npc', { name: (B.NPCS[npc[0]] || B.PEOPLE[npc[0]]).full || B.PEOPLE[npc[0]].name });
  const ft = B.featAt(P.cx, P.cy, P.dir), base = S.floor === 'f2' ? 'x_wall2' : S.floor === 'f3' ? 'x_wall3' : 'x_wall';
  if (ft) {
    const st = fl.feats[ft.id] || {};
    switch (ft.kind) {
      case 'lever': return B.T_('x_lever', { state: st.on ? 'down' : 'up' });
      case 'button': return B.T_('x_button');
      case 'catch': return B.T_(base) + B.TXT[ft.o.look === 'rivet' ? 'x_rivet' : 'x_proud'];
      case 'plaque': return B.T_('x_plaque') + ' ' + B.TXT[ft.o.text];
      case 'candle': return B.T_('x_candle', { state: st.lit ? 'lit' : 'cold' });
      case 'alcove': case 'shrine': case 'gearNiche': { const its = (st.items || []).map(i => B.art(B.itemName(i))); return (ft.o.text ? B.T_(ft.o.text) + ' ' : '') + (its.length ? B.T_('x_alcoveHolds', { items: B.cap(andList(its)) }) : B.T_('m_alcoveEmpty')); }
      case 'clockFace': return B.T_(st.running ? 'x_clockOk' : 'x_clock');
      case 'raiseShrine': return B.T_('x_raise');
      case 'greatLock': return B.T_('x_greatLock') + (st.turned ? ' It has been turned.' : '');
      case 'undergate': return B.T_('x_undergate');
      case 'torch': return 'A brazier burns in a niche.';
      case 'grate': return 'An iron drain grate. Water gurgles somewhere beneath.';
      case 'pipe': return 'A dripping pipe, green with age.';
      case 'chain': return 'A rusty chain hangs from an iron ring.';
      case 'gearWall': return 'A great gear turns in the wall, slowly, for no one.';
      case 'eyeRelief': return 'An eye is carved into the stone. It is shut.';
    }
  }
  const d = doorAt(fx, fy);
  if (d && !(d.kind === 'illusion' || d.kind === 'secret')) { const st = fl.doors[d.id]; if (st.open >= .85) return B.T_('x_floor'); return B.T_(d.kind === 'gate' ? 'x_gate' : d.kind === 'seal' ? 'x_seal' : d.kind === 'undergate' ? 'x_undergate' : st.locked ? 'x_lockedDoor' : 'x_door'); }
  if (pitOpen(fx, fy)) return B.T_('x_pit');
  const stc = X.stairAt[key(fx, fy)]; if (stc) return B.T_(stc.up ? 'x_stairsUp' : 'x_stairs');
  const its = B.itemsAt(fx, fy).concat(B.openFree(fx, fy) ? [] : []).map(i => B.art(B.itemName(i)));
  if (its.length) return B.T_(its.length > 1 ? 'm_lie' : 'm_lies', { items: B.cap(andList(its.slice(-3))) });
  if (wallAt(fx, fy) || (d && (d.kind === 'illusion' || (d.kind === 'secret' && fl.doors[d.id].open < .5)))) {
    let t = B.T_(base);
    if (d && B.seeing()) t += ' Its seams show plainly.';
    return t;
  }
  const here = B.itemsAt(P.cx, P.cy).map(i => B.art(B.itemName(i)));
  if (here.length) return B.T_(here.length > 1 ? 'm_lie' : 'm_lies', { items: B.cap(andList(here.slice(-3))) });
  return B.T_('x_floor');
}
B.examine = examine;
