/* SIM ITEMS: equip rules, inventory locations, the Hand, use, throw, put down. */
B.it = ref => ref ? B.ITEMS[ref.id] : null;
B.wpnOk = (m, it) => { const c = B.CLASSES[m.cls]; if (c.wp === 'all') return true; if (it.cat === 'light' && it.id !== 'shortsword' && it.id !== 'dagger' && it.id !== 'rustdag' && m.cls === 'mage') return false; if (m.cls === 'thief' && it.cat === 'bow' && it.id !== 'shortbow') return false; return c.wp.includes(it.cat); };
B.armOk = (m, it) => { const c = B.CLASSES[m.cls]; if (c.arm === 'all') return true; return B.ARMRANK[it.arm] <= B.ARMRANK[c.arm]; };
/** can this item go in this slot for this member? returns '' if yes, else the reason */
B.slotCheck = (m, slot, ref) => {
  if (!ref) return '';
  const it = B.ITEMS[ref.id], c = B.CLASSES[m.cls];
  if (slot === 'quiver') return it.t === 'ammo' ? '' : 'Only ammunition fits the quiver.';
  if (slot === 'main' || slot === 'off') {
    if (it.t === 'shield') { if (slot !== 'off') return 'A shield rides on the off hand.'; if (!c.shield) return m.name + ' cannot use a shield.'; if (c.shield === 'buckler' && it.shield !== 'buckler') return m.name + ' can only carry a buckler.'; }
    else if (it.t === 'weapon') { if (!B.wpnOk(m, it)) return m.name + ' cannot use that weapon.'; }
    else if (it.t === 'book') { if (m.cls !== 'mage') return 'Only a mage can use a spellbook.'; }
    else if (it.t === 'symbol') { if (m.cls !== 'cleric' && m.cls !== 'paladin') return 'Only a cleric can hold the symbol.'; }
    else if (it.t === 'wand' || it.t === 'misc' || it.t === 'key' || it.t === 'potion' || it.t === 'food' || it.t === 'scroll' || it.t === 'tool') return '';
    else return 'That is not held in a hand.';
    if (it.two) { const other = slot === 'main' ? m.slots.off : m.slots.main; if (other) return 'It needs both hands free.'; if (slot !== 'main') return 'Two-handed items go in the main hand.'; }
    else { const other = slot === 'main' ? m.slots.main : m.slots.main; if (slot === 'off' && m.slots.main && B.ITEMS[m.slots.main.id].two) return 'The main hand holds a two-handed item.'; }
    return '';
  }
  if (slot === 'ring1' || slot === 'ring2') return it.t === 'ring' ? '' : 'That is not a ring.';
  if (slot === 'body') return it.t === 'armor' ? (B.armOk(m, it) ? '' : m.name + ' cannot wear that armour.') : 'That is not armour.';
  if (slot === 'head') return (it.slot === 'head') ? '' : 'That does not go on the head.';
  return it.slot === slot ? '' : 'That does not fit there.';
};
B.getLoc = (l) => { const m = B.S.party.members[l.m]; return l.k === 'slot' ? m.slots[l.s] : m.pack[l.i]; };
B.setLoc = (l, r) => { const m = B.S.party.members[l.m]; if (l.k === 'slot') m.slots[l.s] = r; else m.pack[l.i] = r; };
/** click on a location: carry its item into the Hand, or place the Hand's item there (swapping) */
B.invClick = (l) => {
  const p = B.S.party, m = p.members[l.m], cur = B.getLoc(l), h = p.hand;
  if (m.state === 'dead') return false;
  if (!h) { if (!cur) return false; p.hand = cur; B.setLoc(l, null); B.ev('pickup', {}); return true; }
  if (l.k === 'slot') { const why = B.slotCheck(m, l.s, h); if (why) { B.log(why); B.ev('lockfail', {}); return false; } }
  // stacks merge
  if (cur && cur.id === h.id && B.ITEMS[h.id].stack) { const mv = Math.min(B.ITEMS[h.id].stack - cur.n, h.n); cur.n += mv; h.n -= mv; if (h.n <= 0) p.hand = null; return true; }
  if (l.k === 'slot' && cur) { /* swap: the slot's old item must also be heldable */ }
  p.hand = cur; B.setLoc(l, h); B.ev('equip', {}); return true;
};
B.invDrop = (l) => { const p = B.S.party, r = B.getLoc(l); if (!r) return false; B.setLoc(l, null); B.dropAt(p.cx, p.cy, r, B.S.floor); return true; };
B.dropAt = (x, y, ref, floor) => {
  const S = B.S, F = S.floors[floor], d = B.FLOORS[floor], k = B.key(x, y), c = B.chAt(floor, x, y);
  if (c === 'O' && d.pits && d.pits[k]) { const pit = d.pits[k]; const T = S.floors[pit.to], kk = B.key(pit.at[0], pit.at[1]); (T.items[kk] = T.items[kk] || []).push(ref); return; }
  (F.items[k] = F.items[k] || []).push(ref);
};
B.useLoc = (l) => { // use an item from a location (eat, drink, read)
  const S = B.S, p = S.party, m = p.members[l.m], r = B.getLoc(l); if (!r || m.state === 'dead') return false; const it = B.ITEMS[r.id];
  if (it.t === 'food') { if (m.food >= 100) { B.log(m.name + ' is not hungry.'); return false; } const eat = x => { x.food = Math.min(100, x.food + it.food); }; if (it.all) p.members.forEach(x => x.state !== 'dead' && eat(x)); else eat(m); B.setLoc(l, null); B.ev('eat', {}); B.log(it.all ? 'The Loaf warms everyone.' : m.name + ' eats.', 'good'); return true; }
  if (it.t === 'potion') { if (it.heal) { if (m.state === 'down') { m.state = 'ok'; m.hp = 0; } B.healMember(m, B.dice(S, 'combat', it.heal[0], it.heal[1], it.heal[2])); S.stats.potions++; } if (it.cure) { delete m.status.poison; } B.setLoc(l, null); B.ev('drink', {}); B.log(m.name + ' drinks the ' + it.n.toLowerCase() + '.', 'good'); return true; }
  if (it.t === 'note') { B.readNote(it.note); return true; }
  if (it.t === 'scroll') return B.readScroll(l, m, r, it);
  if (it.t === 'wand') { return B.zapWand(m, r); }
  B.log('Nothing happens.'); return false;
};
/* ---- the Hand: put down and throw ---- */
B.cmdPutDown = () => {
  const S = B.S, p = S.party, h = p.hand; if (!h || S.camp) return false; const [fx, fy] = B.front();
  const tgt = (B.walkable(fx, fy) && !B.monsAt(fx, fy).length && B.cell(fx, fy) !== '#' && !B.npcAt(fx, fy)) ? [fx, fy] : [p.cx, p.cy];
  p.hand = null; B.dropAt(tgt[0], tgt[1], h, S.floor); B.ev('putdown', { to: tgt }); return true;
};
B.cmdThrow = () => {
  const S = B.S, p = S.party, h = p.hand; if (!h || S.camp) return false;
  const it = B.ITEMS[h.id], range = B.T.throw + (p.members[p.selected] && p.members[p.selected].stats.str >= 16 ? 1 : 0);
  let x = p.cx, y = p.cy, last = [x, y], hitMon = null;
  for (let i = 1; i <= range; i++) {
    const nx = p.cx + B.DX[p.dir] * i, ny = p.cy + B.DY[p.dir] * i; const c = B.cell(nx, ny);
    if (c === '#' || ((c === '+' || c === 'L' || c === 'M') && !(B.F().doors[B.key(nx, ny)] || {}).open) || (c === '=' && !B.gateOpen(nx, ny))) break;
    last = [nx, ny];
    const ms = B.monsAt(nx, ny); if (ms.length) { hitMon = ms[0]; break; }
    if (S.boss && S.boss.hp > 0 && B.bossBlocks(nx, ny)) { hitMon = 'boss'; break; }
  }
  p.hand = null;
  if (hitMon) {
    const m = p.members[p.selected], t = it.t === 'weapon' && it.throw ? B.dice(S, 'combat', it.dmg[0], it.dmg[1], B.mod(m.stats.str)) : B.dice(S, 'combat', 1, 2);
    if (hitMon === 'boss') B.hitBoss(Math.max(1, t), 'thrown'); else B.hitMon(hitMon, Math.max(1, Math.round(t * B.T.dmg)), 'thrown', m);
  }
  B.ev('throw', { from: [p.cx, p.cy], to: last, item: h.id });
  B.dropAt(last[0], last[1], h, S.floor); return true;
};
/* ---- defense and hit bonuses ---- */
B.defense = (m) => {
  let d = 10 + B.mod(m.stats.dex); for (const s of ['body', 'head', 'arms', 'ring1', 'ring2']) if (m.slots[s]) d += B.ITEMS[m.slots[s].id].def || 0;
  if (m.slots.off) { const it = B.ITEMS[m.slots.off.id]; if (it.t === 'shield') d += it.def; }
  if (m.brace > 0) d += 3; if (m.status.blessed > 0) d += 0; return d;
};
B.slotBonus = (m) => { let n = 0; for (const s of ['body', 'head', 'neck']) if (m.slots[s] && B.ITEMS[m.slots[s].id].slots1) n += B.ITEMS[m.slots[s].id].slots1; return n; };
B.hasWardGear = (m) => Object.values(m.slots).some(r => r && B.ITEMS[r.id].ward);
B.seeing = () => B.S.party.seeing > 0 || B.S.party.members.some(m => m.state === 'ok' && m.slots.head && B.ITEMS[m.slots.head.id].see);
