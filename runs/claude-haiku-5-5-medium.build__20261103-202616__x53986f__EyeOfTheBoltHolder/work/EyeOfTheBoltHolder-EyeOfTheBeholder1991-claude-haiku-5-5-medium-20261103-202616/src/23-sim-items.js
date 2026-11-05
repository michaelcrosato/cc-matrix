/* ===== 23 sim · items: the Hand, the packs and slots, equipping, use, throwing, putting down =====
 * The party holds one item at a time: S.party.hand = { item, from }. Locations: { where: 'slot', m, slot } (a member's
 * equipment), { where: 'pack', m, i }, { where: 'floor', x, y }, { where: 'alcove', id }. */
const SLOTS = ['head', 'neck', 'body', 'arms', 'main', 'off', 'ring1', 'ring2', 'feet', 'quiver'];
const rosterOf = m => S.party.roster.indexOf(m);
/** can a member hold or wear this item (its classes, and the slot it fits) */
const canUse = (m, it) => { const d = B.ITEMS[it.id]; return !!d && d.cls.includes(m.cls); };
/** the slot an item goes to, for a member (the first free slot of its kind for rings) */
function slotFor(it, m) {
  const d = B.ITEMS[it.id];
  if (d.k === 'weapon' || d.k === 'missile' || d.k === 'book' || d.k === 'holy') return 'main';
  if (d.k === 'shield') return 'off';
  if (d.k === 'ammo') return 'quiver';
  if (d.k === 'armor') { if (d.slot === 'ring') return m.slots.ring1 ? (m.slots.ring2 ? 'ring1' : 'ring2') : 'ring1'; return d.slot; }
  return null;
}
/** the member's pack: an item goes to the first free place; stacks grow first */
function pushPack(it, m) {
  const mem = m || selMember(); const def = B.ITEMS[it.id];
  if (def.stack) for (const p of mem.pack) if (p && p.id === it.id && (p.n || 1) < def.stack) { const add = Math.min(def.stack - (p.n || 1), it.n || 1); p.n = (p.n || 1) + add; it.n = (it.n || 1) - add; if (it.n <= 0) return true; }
  for (const mm of [mem, ...awake().filter(x => x !== mem)]) { const i = mm.pack.indexOf(null); if (i >= 0) { mm.pack[i] = it; return true; } }
  return false;
}
/** the selected member (the one the Party screen shows, or the first member) */
function selMember() { const p = partyList(); const sel = memAt(S.party.sel); return sel || (p[0] && p[0][0]); }
/** a location's item (or null) */
function itemAt(loc) {
  if (loc.where === 'slot') return loc.m.slots[loc.slot];
  if (loc.where === 'pack') return loc.m.pack[loc.i];
  if (loc.where === 'floor') return topItem(loc.x, loc.y);
  if (loc.where === 'hand') return S.party.hand ? S.party.hand.item : null;
  return null;
}
/** take the item at a location into the Hand (the Hand must be empty) */
function takeFrom(loc) {
  if (S.party.hand) { msg('Your hand is full.'); return { ok: false }; }
  const it = itemAt(loc); if (!it) return { ok: false, why: 'empty' };
  if (loc.where === 'slot') loc.m.slots[loc.slot] = null;
  else if (loc.where === 'pack') loc.m.pack[loc.i] = null;
  else if (loc.where === 'floor') { const f = curFS(), l = f.items[key(loc.x, loc.y)]; l.pop(); if (!l.length) delete f.items[key(loc.x, loc.y)]; }
  if (loc.where === 'slot' && loc.slot === 'main' && B.ITEMS[it.id].two) loc.m.slots.off = loc.m.slots.off; // (two hands: the off hand was empty)
  S.party.hand = { item: it, from: loc.where }; sfx('take'); ev('handTook', { id: it.id });
  if (S.race && B.ITEMS[it.id].k === 'coin') raceCrown();
  if (S.race && it.id === 'ironKey') raceCheckpoint('Key found');
  return { ok: true };
}
/** put the Hand's item into a location: a slot must fit the member; a swap returns the old item to the Hand */
function placeInto(loc) {
  const p = S.party; if (!p.hand) return { ok: false, why: 'nohand' };
  const it = p.hand.item, d = B.ITEMS[it.id];
  if (loc.where === 'pack') {
    const cur = loc.m.pack[loc.i]; if (cur) { if (cur.id === it.id && d.stack) { if (pushPack(it, loc.m)) { p.hand = null; return { ok: true }; } } return swapHand(loc, cur); }
    loc.m.pack[loc.i] = it; p.hand = null; sfx('drop'); return { ok: true };
  }
  if (loc.where === 'slot') {
    const want = loc.slot;
    if (!canUse(loc.m, it)) { msg(loc.m.name + ' cannot use that.'); return { ok: false, why: 'class' }; }
    const fits = slotFor(it, loc.m) === want || (d.k === 'weapon' && want === 'off' && !d.two) || (d.k === 'shield' && want === 'off') || (d.k === 'armor' && d.slot === 'ring' && (want === 'ring1' || want === 'ring2'));
    if (!fits) { msg('That does not go there.'); return { ok: false, why: 'slot' }; }
    if (d.two && want === 'main' && loc.m.slots.off) { msg('Both hands are needed. Clear the off hand first.'); return { ok: false, why: 'two' }; }
    if (want === 'off' && loc.m.slots.main && B.ITEMS[loc.m.slots.main.id].two) { msg('A two-handed weapon fills both hands.'); return { ok: false, why: 'two' }; }
    const cur = loc.m.slots[want]; loc.m.slots[want] = it; p.hand = null;
    if (d.two && want === 'main') loc.m.slots.off = null;
    sfx('equip'); ev('equip', { m: rosterOf(loc.m), slot: want });
    if (cur) { p.hand = { item: cur, from: 'swap' }; }
    return { ok: true };
  }
  if (loc.where === 'floor') return placeOnFloor(it);
  return { ok: false };
}
function swapHand(loc, cur) { const it = S.party.hand.item; loc.m.pack[loc.i] = it; S.party.hand = { item: cur, from: 'swap' }; sfx('take'); return { ok: true }; }
/** put the Hand's item down on the front cell, or on the party's own cell if the front is blocked; a pit takes it to the level below */
function putDown() {
  const p = S.party; if (!p.hand) return { ok: false, why: 'nohand' };
  const [fx, fy] = frontCell(); let x = p.cx, y = p.cy;
  if (passable(fx, fy, 'party') && !monAt(fx, fy) && !featAt(p.cx, p.cy, p.dir)) { x = fx; y = fy; }
  if (cellOf(x, y) === 'O' && !(curFS().pits[idAt(x, y)] || {}).bridged) return throwIntoPit(x, y);
  return placeOnFloor(p.hand.item, x, y);
}
function placeOnFloor(it, x, y) {
  if (x === undefined) { x = S.party.cx; y = S.party.cy; }
  const f = curFS(); (f.items[key(x, y)] = f.items[key(x, y)] || []).push(it); S.party.hand = null;
  sfx('drop'); ev('itemDown', { x, y, id: it.id }); settle(); return { ok: true };
}
/** an item put into a pit falls to the landing of the floor below */
function throwIntoPit(x, y) {
  const k = idAt(x, y), pd = (curF().pitTo || {})[k] || { to: 'f3', at: [2, 15, 0] }, it = S.party.hand.item; S.party.hand = null;
  const lf = S.floors[pd.to]; (lf.items[key(pd.at[0], pd.at[1])] = lf.items[key(pd.at[0], pd.at[1])] || []).push(it);
  msg('It falls into the dark.'); sfx('fall'); return { ok: true };
}
/** the Hand's item is thrown forward: it flies up to the throw range, stops before walls and shut doors, hits the first monster */
function throwHand() {
  const p = S.party; if (!p.hand) return { ok: false, why: 'nohand' };
  const it = p.hand.item, d = B.ITEMS[it.id], strM = B.MOD(selMember().stats.str) + (selMember().stats.str >= 16 ? 0 : 0);
  const range = B.T.throwRange + (selMember().stats.str >= 16 ? 1 : 0);
  p.hand = null;
  S.proj.push({ k: 'thrown', item: it, cx: p.cx, cy: p.cy, dir: p.dir, left: range, t: 0, by: rosterOf(selMember()), str: strM, thr: !!d.thr, speed: 8 });
  sfx('whoosh'); return { ok: true };
}
/** the item used by a hand or a command: eat, drink, read, zap; a scroll for a mage is cast at once */
function useItemRef(m, loc) {
  const it = itemAt(loc); if (!it) return { ok: false };
  const d = B.ITEMS[it.id];
  if (d.k === 'food') { m.food = Math.min(100, m.food + d.food); consume(loc); sfx('eat'); msg(m.name + ' eats.'); return { ok: true }; }
  if (d.k === 'potion') {
    if (d.heal) { const amt = B.roll(S, 'combat', d.heal); if (d.wakes && m.state === 'down') { m.state = 'ok'; m.hp = 0; } healMember(m, amt); }
    if (d.cures === 'poison') delete m.status.poison;
    if (d.restSlot) { const lv = [3, 2, 1].find(l => m.used[l] > 0); if (lv) m.used[lv]--; msg('A spell comes back to ' + m.name + '.'); }
    consume(loc); S.stats.potions++; sfx('drink'); return { ok: true };
  }
  if (d.k === 'scroll') {
    if (d.spell === 'raise') { if (m.cls === 'C' || m.cls === 'P') { const dead = partyList().map(x => x[0]).find(x => x.state === 'dead'); if (!dead) { msg('Nobody needs raising.'); return { ok: false }; } raiseMember(dead, 1); consume(loc); sfx('raise'); return { ok: true }; } msg('Only a cleric or paladin can read that.'); return { ok: false }; }
    if (m.cls !== 'M') { msg(m.name + ' cannot read that.'); return { ok: false }; }
    consume(loc); castScroll(m, d.spell); return { ok: true };
  }
  if (d.k === 'wand') {
    if (!it.charges) { msg('The wand is spent.'); return { ok: false }; }
    it.charges--; sfx('zap'); msg('The wand hums.'); castSpellFx(m, d.spell, 'wand'); return { ok: true };
  }
  if (d.k === 'note') { readNote(it.id, B.NOTE_TEXT[d.text] || d.desc); return { ok: true }; }
  return { ok: false, why: 'nouse' };
}
/** use up one of a stack, or the item itself */
function consume(loc) {
  const it = itemAt(loc); if (!it) return;
  if (it.n && it.n > 1) { it.n--; return; }
  if (loc.where === 'slot') loc.m.slots[loc.slot] = null;
  else if (loc.where === 'pack') loc.m.pack[loc.i] = null;
  else if (loc.where === 'hand') S.party.hand = null;
  else if (loc.where === 'floor') { const f = curFS(), l = f.items[key(loc.x, loc.y)]; l.pop(); if (!l.length) delete f.items[key(loc.x, loc.y)]; }
}
/** a member's HP up (by the heal amount); a Down member wakes at the amount */
function healMember(m, n) {
  if (m.state === 'dead') return;
  if (m.state === 'down') { m.state = 'ok'; m.hp = 0; }
  const was = m.hp; m.hp = Math.min(m.max, m.hp + Math.max(0, n)); m.hurtT = 0; if (m.hp > was) ev('heal', { m: rosterOf(m), n: m.hp - was });
}
/** the member a pack item's location: loc for the selected member's pack */
function packLocs(m) { return m.pack.map((it, i) => it ? { where: 'pack', m, i } : null).filter(Boolean); }
