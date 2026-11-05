/* =====================================================================================
 * 28-sim-camp: camp (refused with enemies near), resting an hour every 0.4 s, the clerics' Mends first, interruptions,
 * eating, memorizing and praying, scribing, the formation
 * ===================================================================================== */
B.campOpen = () => {
  if (S.camp) return true;
  if (B.enemiesNear(6) || S.talk || S.transit || S.moment || S.over) { say('m_noRest', null, { rate: 1 }); return false; }
  S.camp = { rest: null }; ev('camp', { open: true }); return true;
};
B.campClose = () => { if (!S.camp) return; S.camp = null; ev('camp', { open: false }); };
B.restStart = () => {
  if (!S.camp || S.camp.rest) return false;
  S.camp.rest = { h: 0, t: 0, done: false, healed: {} }; S.stats.rests++;
  // clerics first spend their ready Mends on the wounded
  for (const c of alive()) {
    if (!(c.cls === 'C' || c.cls === 'P')) continue;
    for (const L of [1, 3]) c.mem[L].forEach((id, i) => {
      if (c.spent[L][i] || !(id === 'mend' || id === 'greaterMend')) return;
      const t = lowest(); if (!t || (t.state === 'ok' && t.hp >= t.max * .75)) return;
      c.spent[L][i] = true; spellEffect(c, id, { target: S.party.members.indexOf(t) }, 1);
    });
  }
  ev('rest', { on: true });
  return true;
};
B.restStop = () => { if (S.camp && S.camp.rest) { S.camp.rest = null; ev('rest', { on: false }); } };
const fullUp = () => S.party.members.every(m => m.state === 'dead' || (m.state === 'ok' && m.hp >= m.max && (m.food > 0))) &&
  S.party.members.every(m => m.state === 'dead' || [1, 2, 3].every(L => m.spent[L].every(x => !x)) && (m.cls !== 'P' || m.layOnHands));
/** an hour of rest */
function restHour() {
  const R = S.camp.rest, X = IX(), fl = FL(), P = S.party;
  R.h++;
  for (const m of P.members) {
    if (m.state !== 'ok' || m.food <= 0) continue;
    const n = Math.max(1, Math.round(Math.max(1, 1 + statMod(effStat(m, 'con'))) * B.T.restHeal));
    if (m.hp < m.max) { m.hp = Math.min(m.max, m.hp + n); m.fx.heal = .3; }
  }
  ev('restHour', { h: R.h });
  // a wanderer may find the camp (never in a safe room, never past the floor's budget)
  const ch = B.T.restInt / 100 * B.diff().restInt;
  if (!B.isSafe(P.cx, P.cy) && fl.wander > 0 && S.mode === 'campaign' && rnd('world') < ch) {
    if (B.spawnWanderers()) { say('m_awakened', null, { c: '#ff8a6a' }); ev('interrupt', {}); S.camp = null; ev('camp', { open: false }); return; }
  }
  if (R.h >= 8) {
    for (const m of P.members) {
      if (m.state === 'dead') continue;
      if (m.state === 'down') { m.state = 'ok'; m.hp = 1; say('m_wakeUp', { name: m.name }); }
      for (let L = 1; L <= 3; L++) m.spent[L] = m.mem[L].map(() => false);
      m.layOnHands = 1; m.ward = 0;
      m.food = Math.max(0, m.food - 15 * B.T.hunger * B.diff().hunger * (B.CHEATS.noHunger ? 0 : 1));
      if (m.pendingLvl) { m.pendingLvl = false; B.checkLevel(m, true); }
    }
    say('m_rested'); R.done = true; S.camp.rest = null; ev('rest', { on: false, done: true });
    return;
  }
  if (fullUp()) { for (const m of P.members) if (m.pendingLvl && m.state === 'ok') { m.pendingLvl = false; B.checkLevel(m, true); } say('m_rested'); S.camp.rest = null; ev('rest', { on: false, done: true }); }
}
function campStep(realDt) {
  const R = S.camp && S.camp.rest; if (!R) return;
  R.t += realDt;
  while (S.camp && S.camp.rest && R.t >= .4) { R.t -= .4; restHour(); }
}
B.campStep = campStep;
/** Eat: every member below 60% eats from the party's smallest food first */
B.eatAll = () => {
  const P = S.party, ate = [];
  for (const m of P.members) {
    if (m.state === 'dead' || m.food >= 60) continue;
    const food = [];
    for (const o of P.members) for (const s of [...o.pack.keys()]) { const it = o.pack[s]; if (it && IT(it.id).kind === 'food') food.push({ o, s, it }); }
    if (P.hand && IT(P.hand.id).kind === 'food') food.push({ hand: true, it: P.hand });
    food.sort((a, b) => IT(a.it.id).food - IT(b.it.id).food);
    const f = food[0]; if (!f) break;
    m.food = Math.min(100, m.food + IT(f.it.id).food); m.starveT = 0;
    if (f.hand) P.hand = null; else f.o.pack[f.s] = null;
    ate.push(m.name + ': ' + IT(f.it.id).name);
    say('m_eat', { name: m.name, item: B.art(IT(f.it.id).name) });
  }
  if (ate.length) ev('sfx', { id: 'eat' });
  ev('ate', { list: ate });
  return ate;
};
/** prepare a spell in the next free slot of its level (it is ready after the next full rest) */
B.memorize = (mi, id) => {
  const m = MEM(mi); if (!m || !B.knownSpells(m).includes(id)) return false;
  const L = B.SP(id).lvl, c = slotCount(m)[L - 1];
  if (m.mem[L].length >= c) return false;
  m.mem[L].push(id); m.spent[L].push(true); ev('mem', { m: mi }); return true;
};
B.forget = (mi, L, i) => { const m = MEM(mi); if (!m || !m.mem[L][i]) return false; m.mem[L].splice(i, 1); m.spent[L].splice(i, 1); ev('mem', { m: mi }); return true; };
/** Scribe: a mage copies a scroll into the spellbook (the scroll is used up) */
B.scribe = (mi, from, slot) => {
  const m = MEM(mi), o = MEM(from === undefined ? mi : from); if (!m || m.cls !== 'M' || !o) return false;
  const it = B.getSlot(o, slot); if (!it) return false; const d = IT(it.id);
  if (d.kind !== 'scroll' || !d.spell || !B.SP(d.spell).arc) return false;
  if (m.book.includes(d.spell)) { say('m_knows', { name: m.name, spell: B.SP(d.spell).name }); return false; }
  if (typeof slot === 'number') o.pack[slot] = null; else o.slots[slot] = null;
  m.book.push(d.spell); say('m_scribe', { name: m.name, spell: B.SP(d.spell).name }); ev('sfx', { id: 'scroll' }); ev('scribe', { m: mi, spell: d.spell });
  return true;
};
/** swap two places of the formation */
B.swapPlaces = (a, b) => { const F = S.party.form; [F[a], F[b]] = [F[b], F[a]]; ev('form', {}); };

/* =====================================================================================
 * 29 (progress, here with camp): experience, levels, hidden deeds, NPCs joining and leaving
 * ===================================================================================== */
B.gainXp = (m, n, flat = false) => {
  if (!m || m.state === 'dead') return;
  const k = flat ? B.T.xp : B.CLASSES[m.cls].xp * (B.RACES[m.race].xp || 1) * B.T.xp;
  m.xp += n * k;
  B.checkLevel(m);
};
B.checkLevel = (m, now = false) => {
  while (m.lvl < 8 && m.xp >= B.XP_AT[m.lvl]) {
    if (B.opt.levelUp === 'rest' && !now) { m.pendingLvl = true; return; }
    const cls = B.CLASSES[m.cls], before = slotCount(m);
    m.lvl++;
    const g = Math.max(1, Math.floor(cls.hd / 2) + 1 + statMod(effStat(m, 'con')));
    m.max += g; if (m.state === 'ok') m.hp += g;
    const after = slotCount(m), known = B.knownSpells(m);
    for (let L = 1; L <= 3; L++) for (let k = before[L - 1]; k < after[L - 1]; k++) { const ks = known.filter(s => B.SP(s).lvl === L); if (ks.length) { m.mem[L].push(ks[k % ks.length]); m.spent[L].push(false); } }
    m.fx.lvl = 1.6;
    say('m_level', { name: m.name, lvl: m.lvl }, { c: '#ffd36a' }); ev('levelUp', { m: S.party.members.indexOf(m) });
  }
};
B.joinNpc = id => {
  const P = S.party, def = B.NPCS[id];
  if (P.members.length >= 6) { say('m_noRoom'); return false; }
  const m = mkMember(Object.assign({}, B.clone(def), { npc: id }));
  P.members.push(m);
  const free = P.form.indexOf(-1); P.form[free] = P.members.length - 1;
  const n = FL().npcs[id]; if (n) n.state = 'joined';
  S.flags['joined_' + id] = true; S.quests[id] = 'done';
  say('m_join', { name: m.name }, { c: '#ffd36a' }); ev('sting', { id: 'npcJoin' }); ev('join', { id });
  return true;
};
B.dismiss = mi => {
  const P = S.party, m = MEM(mi); if (!m || !m.npc) return false;
  // what belongs to the quest stays with the party
  for (const s of [...m.pack.keys(), ...SLOT_NAMES]) { const it = B.getSlot(m, s); if (it && IT(it.id).quest) addItem(FL(), P.cx, P.cy, it); }
  P.members.splice(mi, 1);
  P.form = P.form.map(i => i === mi ? -1 : i > mi ? i - 1 : i);
  if (P.sel >= P.members.length) P.sel = 0;
  S.flags['dismissed_' + m.npc] = true;
  say('m_leave', { name: m.name }); ev('leave', { id: m.npc });
  return true;
};
