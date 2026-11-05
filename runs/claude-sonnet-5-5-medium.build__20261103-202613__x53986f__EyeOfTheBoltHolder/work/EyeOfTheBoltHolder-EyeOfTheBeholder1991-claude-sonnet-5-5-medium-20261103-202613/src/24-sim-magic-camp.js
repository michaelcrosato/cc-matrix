/* SIM MAGIC, CAMP, PROGRESS. */
B.slotsFor = (m) => {
  const ct = B.casterType(m.cls); if (!ct) return [0, 0, 0];
  const lvl = m.cls === 'paladin' ? Math.floor(m.lvl / 2) : m.lvl; if (lvl < 1) return [0, 0, 0];
  const row = B.SLOTS[ct][Math.min(7, lvl - 1)].slice();
  if (ct === 'mage' && m.stats.int >= 16) row[0]++; if (ct === 'cleric' && m.stats.wis >= 15) row[0]++; if (ct === 'cleric' && m.stats.wis >= 17) row[1]++;
  row[0] += B.slotBonus(m); return row;
};
B.known = (m) => { const ct = B.casterType(m.cls); if (ct === 'mage') return m.book; if (ct === 'cleric') return Object.keys(B.SPELLS).filter(k => B.SPELLS[k].cls === 'cleric'); return []; };
B.autoPrep = (m) => {
  const sl = B.slotsFor(m), kn = B.known(m); m.spent = { 1: [], 2: [], 3: [] };
  for (let l = 1; l <= 3; l++) {
    const opts0 = kn.filter(k => B.SPELLS[k].lvl === l), opts = opts0.includes('mend') ? ['mend', 'bless', 'mend', 'protect'] : opts0, want = sl[l - 1], cur = (m.prep[l] || []).filter(k => opts.includes(k));
    m.prep[l] = cur.slice(0, want); let i = 0; while (m.prep[l].length < want && opts.length) m.prep[l].push(opts[i++ % opts.length]);
    m.spent[l] = m.prep[l].map(() => false);
  }
};
B.spellLeft = (m, id) => { const l = B.SPELLS[id].lvl; if (B.CHEATS.spells) return 9; let n = 0; (m.prep[l] || []).forEach((k, i) => { if (k === id && !(m.spent[l] || [])[i]) n++; }); return n; };
B.spendSpell = (m, id) => { if (B.CHEATS.spells) return; const l = B.SPELLS[id].lvl; const i = (m.prep[l] || []).findIndex((k, j) => k === id && !m.spent[l][j]); if (i >= 0) m.spent[l][i] = true; };
B.casterGear = (m) => { const h = [m.slots.main, m.slots.off].filter(Boolean).map(r => B.ITEMS[r.id].t); return (m.cls === 'mage' && h.includes('book')) || ((m.cls === 'cleric' || m.cls === 'paladin') && h.includes('symbol')); };
B.cmdCast = (mi, id, tgt) => {
  const S = B.S, p = S.party, m = p.members[mi], sp = B.SPELLS[id]; if (!m || m.state !== 'ok' || S.camp || S.over) return false;
  if (m.status.held > 0 || S.lockBusy > 0) return false;
  if (!B.casterGear(m)) { B.log(m.name + ' needs ' + (m.cls === 'mage' ? 'a spellbook' : 'the holy symbol') + ' in a hand.'); return false; }
  if (B.spellLeft(m, id) <= 0) { B.log(m.name + ' has no ' + sp.n + ' prepared.'); B.ev('lockfail', {}); return false; }
  if ((m.cool.main > 0 || m.cool.off > 0) && !B.CHEATS.nocool) return false;
  if (!B.castEffect(m, sp, tgt)) return false;
  B.spendSpell(m, id); m.cool.main = m.cool.off = 2.5 * (B.CHEATS.nocool ? 0 : 1); B.ev('cast', { m: mi, id, col: sp.col }); return true;
};
B.spellPower = (m) => B.T.spell * (1 + 0 * m.lvl);
/** the effect of a spell; true if it did something (so the slot is spent) */
B.castEffect = (m, sp, tgt) => {
  const S = B.S, p = S.party, F = B.F(), mi = p.members.indexOf(m), id = sp.id, pw = B.T.spell, lv = Math.max(1, m.lvl);
  const say = t => B.log(t, 'good');
  switch (id) {
    case 'spark': B.fireProj({ from: 'party', kind: 'spark', mi, spell: 'spark', dmg: Math.round(B.dice(S, 'combat', 2, 4, lv) * pw), speed: 6, left: 7, col: sp.col, slot: 0 }); return true;
    case 'slumber': { const ms = B.targetsFront(false); let n = 0; for (const x of ms) if (!B.MONS[x.type].undead && !B.MONS[x.type].boss) { x.state = 'asleep'; x.status.slumber = 30; n++; } B.ev('spellFront', { col: sp.col }); if (!n) B.log('Nothing ahead to put to sleep.'); return true; }
    case 'seams': p.seeing = 120; say('Hidden things glint teal.'); return true;
    case 'unlatch': { const [fx, fy] = B.front(), c = B.cell(fx, fy), ds = F.doors[B.key(fx, fy)]; if (c === 'M' && ds && !ds.open) { ds.open = true; ds.locked = false; B.ev('door', { x: fx, y: fy, open: true, unlock: true }); say('The seal unlatches.'); return true; } B.log('There is no seal ahead.'); return false; }
    case 'orb': { const [fx, fy] = B.front(); let hit = 0; const cells = [[fx, fy], [fx + 1, fy], [fx - 1, fy], [fx, fy + 1], [fx, fy - 1]].filter(c => B.walkable(c[0], c[1]) || (c[0] === fx && c[1] === fy)); B.ev('orbBlast', { x: fx, y: fy, col: sp.col });
      for (const c of cells) { for (const mo of B.monsAt(c[0], c[1])) { B.hitMon(mo, Math.round(B.dice(S, 'combat', 3, 6) * pw), 'orb', m); hit++; } if (B.bossAt(c[0], c[1])) B.spellHitsBoss('orb', Math.round(B.dice(S, 'combat', 3, 6) * pw)); } return true; }
    case 'feather': p.floating = 60; say('The party floats.'); return true;
    case 'lightning': { const dmg = () => Math.round(B.dice(S, 'combat', 4, 6, lv) * pw); const cells = []; for (let i = 1; i <= 7; i++) { const x = p.cx + B.DX[p.dir] * i, y = p.cy + B.DY[p.dir] * i; const c = B.cell(x, y); if (c === '#' || ((c === '+' || c === 'L' || c === 'M') && !(F.doors[B.key(x, y)] || {}).open)) break; cells.push([x, y]); for (const mo of B.monsAt(x, y)) B.hitMon(mo, dmg(), 'lightning', m); if (B.bossAt(x, y)) B.spellHitsBoss('lightning', dmg()); } B.ev('lightningLine', { cells, col: sp.col }); return true; }
    case 'shield': for (const x of p.members) if (x.state !== 'dead') x.ward = Math.max(x.ward, 6 + lv * 2); say('A brass shell closes about the party.'); return true;
    case 'slow': for (const x of B.targetsFront(false)) if (!B.MONS[x.type].boss) x.status.slow = 25; B.ev('spellFront', { col: sp.col }); return true;
    case 'hold': { let n = 0; for (const x of B.targetsFront(false)) if (!B.MONS[x.type].boss) { x.status.held = 8; n++; } B.ev('spellFront', { col: sp.col }); if (!n) B.log('Nothing ahead to hold.'); return true; }
    case 'protect': for (const x of p.members) if (x.state !== 'dead') x.brace = 60; say('A shimmer of protection.'); return true;
    case 'smite': { const [fx, fy] = B.front(); B.ev('orbBlast', { x: fx, y: fy, col: sp.col }); for (const mo of B.monsAt(fx, fy)) B.hitMon(mo, Math.round(B.dice(S, 'combat', 3, 6) * (B.MONS[mo.type].undead ? 2 : 1) * pw), 'smite', m); if (B.bossAt(fx, fy)) B.hitBoss(Math.round(B.dice(S, 'combat', 3, 6) * pw), 'smite'); return true; }
    case 'mend': { const t = p.members[tgt == null ? mi : tgt]; if (!t || t.state === 'dead') return false; B.healMember(t, Math.round((B.dice(S, 'combat', 1, 8) + lv) * pw)); B.ev('spellMember', { m: tgt == null ? mi : tgt, col: sp.col }); return true; }
    case 'bless': for (const x of p.members) if (x.state !== 'dead') x.status.blessed = 120; say('A blessing settles.'); return true;
    case 'purge': { const t = p.members[tgt == null ? mi : tgt]; if (!t) return false; delete t.status.poison; B.ev('spellMember', { m: tgt == null ? mi : tgt, col: sp.col }); return true; }
    case 'freehinge': for (const x of p.members) if (x.state !== 'dead') x.status.free = 120; say('Your joints feel oiled.'); return true;
    case 'ward': for (const x of p.members) if (x.state !== 'dead') x.ward = Math.max(x.ward, 10 + lv * 2); say('A pale shell closes about the party.'); return true;
    case 'raise': { const t = p.members[tgt == null ? mi : tgt]; if (!t || t.state !== 'dead') { B.log('No one to raise there.'); return false; } B.raise(t, m.name + '\'s prayer'); return true; }
  }
  return false;
};
B.readScroll = (loc, m, r, it) => {
  const S = B.S, sp = B.SPELLS[it.spell]; if (!sp) return false;
  if (sp.cls === 'cleric' ? !(m.cls === 'cleric' || m.cls === 'paladin') : m.cls !== 'mage') { B.log(m.name + ' cannot read that scroll.'); return false; }
  if (sp.id === 'raise') { const dead = S.party.members.findIndex(x => x.state === 'dead'); if (dead < 0) { B.log('No one needs raising.'); return false; } B.castEffect(m, sp, dead); }
  else { const tg = sp.tg === 'member' ? S.party.members.indexOf(m) : null; if (!B.castEffect(m, sp, tg)) return false; }
  B.setLoc(loc, null); B.ev('read', {}); B.ev('cast', { m: S.party.members.indexOf(m), id: sp.id, col: sp.col }); return true;
};
B.zapWand = (m, ref, h) => {
  const S = B.S, it = B.ITEMS[ref.id], sp = B.SPELLS[it.spell]; if (!ref.charges) { B.log('The wand is spent.'); return false; }
  if (m.cool && h && m.cool[h] > 0 && !B.CHEATS.nocool) return false;
  const mi = S.party.members.indexOf(m); if (!B.castEffect(m, sp, mi)) return false; ref.charges--; if (h) m.cool[h] = 1.5; B.ev('cast', { m: mi, id: sp.id, col: sp.col }); return true;
};
/* ---- progress ---- */
B.xpNeed = (m) => B.XPT[Math.min(8, m.lvl + 1)] / 1;
B.giveXPTo = (m, amt, why) => {
  if (m.state === 'dead' || m.lvl >= 8) return; const c = B.CLASSES[m.cls]; m.xp += amt * B.T.xp / c.xp * (m.race === 'human' ? 1.05 : 1);
  while (m.lvl < 8 && m.xp >= B.XPT[m.lvl + 1]) { if (B.opt.lvlRest) { m.pendingLevel = true; break; } B.levelUp(m); }
};
B.giveXP = (n, why) => { for (const m of B.S.party.members) if (m.state !== 'dead') B.giveXPTo(m, n * B.CLASSES[m.cls].xp, why); };
B.levelUp = (m, silent) => {
  m.lvl++; const c = B.CLASSES[m.cls], S = B.S; const gain = Math.max(1, Math.floor(c.die / 2) + 1 + B.mod(m.stats.con)); m.max += gain; if (!silent) { m.hp = Math.min(m.max, m.hp + gain); }
  if (B.casterType(m.cls)) B.autoPrep(m); if (m.cls === 'paladin') m.lay = 1;
  if (!silent) { B.ev('levelup', { m: S.party.members.indexOf(m), lvl: m.lvl }); B.log(m.name + ' has reached level ' + m.lvl + '!', 'good'); }
};
B.raise = (m, by) => { m.state = 'ok'; m.hp = 1; m.status = {}; B.ev('raise', { m: B.S.party.members.indexOf(m) }); B.log(m.name + ' is raised by ' + by + '.', 'good'); };
B.npcJoin = (id) => {
  const S = B.S, n = B.NPCS[id], p = S.party; if (p.members.length >= 6 || S.flags['joined_' + id]) return false;
  const m = B.makeMember({ name: n.name.split(' ')[0], race: n.race, cls: n.cls, sex: id === 'tamsin' ? 'f' : 'm', lvl: n.lvl, gear: n.gear, npc: id, voice: n.voice, appearance: n.look, stats: n.cls === 'ranger' ? { str: 14, dex: 16, con: 12, int: 10, wis: 11 } : { str: 17, dex: 10, con: 16, int: 9, wis: 11 }, noRation: true });
  m.xp = B.XPT[m.lvl]; p.members.push(m); p.formation.push(p.members.length - 1); S.flags['joined_' + id] = true;
  const npc = B.F().npcs.find(x => x.id === id); if (npc) npc.gone = true; B.ev('npcJoin', { id }); B.log(n.join, 'good'); if (id === 'veil') B.veilJoined(true); return true;
};
B.dismiss = (mi) => {
  const p = B.S.party, m = p.members[mi]; if (!m || !m.npc) return false;
  for (const r of Object.values(m.slots).concat(m.pack)) if (r) B.dropAt(p.cx, p.cy, r, B.S.floor);
  p.members.splice(mi, 1); p.formation = p.formation.filter(i => i !== mi).map(i => i > mi ? i - 1 : i); p.selected = Math.min(p.selected, p.members.length - 1); B.log(m.name + ' goes home.'); return true;
};
/* ---- survival ticks ---- */
B.updateSurvival = (dt) => {
  const S = B.S, p = S.party;
  S.playTime += dt;
  for (const m of p.members) {
    if (m.state === 'dead') continue;
    m.cool.main = Math.max(0, m.cool.main - dt); m.cool.off = Math.max(0, m.cool.off - dt); m.brace = Math.max(0, m.brace - dt);
    for (const k in m.status) { if (k === 'poison') { m.status.poison -= dt; m._pt = (m._pt || 0) + dt; if (m._pt >= 6) { m._pt = 0; if (m.state === 'ok') B.hurtMember(m, 1, 'poison', true); } } else m.status[k] -= dt; if (m.status[k] <= 0) delete m.status[k]; }
    if (!B.CHEATS.nohunger && m.state !== 'dead') { m._fd = (m._fd || 0) + dt * B.T.hunger * B.diffM().hun; if (m._fd >= 60) { m._fd -= 60; const was = m.food; m.food = Math.max(0, m.food - 1); if (was > 25 && m.food <= 25) B.log(m.name + B.MSG.hungry, 'bad'); if (was > 0 && m.food <= 0) B.log(m.name + B.MSG.starving, 'bad'); } if (m.food <= 0) { m._sd = (m._sd || 0) + dt; if (m._sd >= 30) { m._sd = 0; if (m.state === 'ok') B.hurtMember(m, 1, 'hunger', true); } } }
  }
  p.floating = Math.max(0, p.floating - dt); p.seeing = Math.max(0, p.seeing - dt); S.msgT = Math.max(0, S.msgT - dt);
  S.party.members.forEach((m, i) => { if (m.pendingLevel && !B.opt.lvlRest) { m.pendingLevel = false; while (m.lvl < 8 && m.xp >= B.XPT[m.lvl + 1]) B.levelUp(m); } });
};
/* ---- camp ---- */
B.enemiesNear = () => { const p = B.S.party; return B.F().mons.some(m => m.hp > 0 && m.aware && m.state !== 'asleep' && Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy) <= 6) || (B.S.boss && B.S.floor === 'f4' && !B.S.boss.dead && B.S.boss.awake); };
B.inSafe = () => { const d = B.def(), p = B.S.party; return (d.safe || []).some(r => p.cx >= r[0] && p.cy >= r[1] && p.cx <= r[2] && p.cy <= r[3]); };
B.cmdCamp = (op, a) => {
  const S = B.S, p = S.party;
  if (op === 'open') { if (S.over || p.tween) return false; if (B.enemiesNear()) { B.log(B.MSG.rest0, 'bad'); B.ev('lockfail', {}); return false; } if (B.def().race) { B.log('There is no camping in the Rat Run.'); return false; } S.camp = { rest: false, hour: 0, acc: 0, summary: null }; B.ev('camp', { open: true }); return true; }
  if (!S.camp) return false;
  if (op === 'close') { S.camp = null; B.ev('camp', { open: false }); return true; }
  if (op === 'rest') { S.camp.rest = true; S.camp.hour = 0; S.camp.acc = 0; S.camp.summary = null; S.camp.healed = 0; return true; }
  if (op === 'stopRest') { S.camp.rest = false; return true; }
  if (op === 'memorize') { const m = p.members[a.m]; if (!m) return false; const sl = B.slotsFor(m)[a.lvl - 1]; if (a.spell == null) { m.prep[a.lvl][a.slot] = null; m.prep[a.lvl] = m.prep[a.lvl].filter(Boolean); } else if (m.prep[a.lvl].length < sl) m.prep[a.lvl].push(a.spell); m.spent[a.lvl] = m.prep[a.lvl].map(() => false); return true; }
  if (op === 'same') { const m = p.members[a.m]; B.autoPrep(m); return true; }
  if (op === 'eat') { const out = []; for (const m of p.members) { if (m.state === 'dead' || m.food >= 60) continue; let best = null; for (const mm of p.members) mm.pack.forEach((r, i) => { if (r && B.ITEMS[r.id].t === 'food' && !B.ITEMS[r.id].all && (!best || B.ITEMS[r.id].food < B.ITEMS[best.r.id].food)) best = { mm, i, r }; }); if (!best) break; m.food = Math.min(100, m.food + B.ITEMS[best.r.id].food); best.mm.pack[best.i] = null; out.push(m.name + ' ate ' + B.ITEMS[best.r.id].n); } S.camp.summary = out.length ? out.join('. ') + '.' : 'No one needs to eat, or there is nothing to eat.'; B.ev('eat', {}); return true; }
  if (op === 'scribe') { const m = p.members[a.m]; const scr = a.loc && B.getLoc(a.loc); if (!scr) return false; const it = B.ITEMS[scr.id]; if (it.t !== 'scroll' || m.cls !== 'mage' || B.SPELLS[it.spell].cls !== 'mage' || m.book.includes(it.spell)) return false; m.book.push(it.spell); B.setLoc(a.loc, null); B.autoPrep(m); B.log(m.name + ' scribes ' + B.SPELLS[it.spell].n + '.', 'good'); B.ev('read', {}); return true; }
  if (op === 'swap') { const f = p.formation, x = a.a, y = a.b; if (x === y) return false; [f[x], f[y]] = [f[y], f[x]]; return true; }
  return false;
};
B.updateCamp = (dt) => {
  const S = B.S, c = S.camp, p = S.party; if (!c || !c.rest) return;
  c.acc += dt; while (c.acc >= .4 && c.rest) {
    c.acc -= .4; c.hour++;
    for (const m of p.members) { if (m.state === 'dead') continue; if (m.state === 'down' && c.hour >= 8) continue; if (m.food <= 0) continue; if (m.state === 'ok' && m.hp < m.max) { const h = Math.max(1, Math.round((1 + B.mod(m.stats.con)) * B.T.rest)); m.hp = Math.min(m.max, m.hp + h); } }
    // clerics mend the wounded first
    for (const cl of p.members) if (cl.state === 'ok' && B.casterGear(cl) && B.spellLeft(cl, 'mend') > 0) { const w = p.members.filter(x => x.state === 'ok' && x.hp < x.max * .6).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (w) { B.spendSpell(cl, 'mend'); B.healMember(w, B.dice(S, 'combat', 1, 8) + cl.lvl); } }
    const F = B.F(), d = B.def(); const chance = B.inSafe() || F.wanders >= d.wander || d.boss ? 0 : B.T.wander * B.diffM().wan / 100;
    if (chance > 0 && B.rng(S, 'world') < chance) { B.spawnWanderer(); c.rest = false; S.camp = null; B.ev('camp', { open: false }); B.log(B.MSG.wake, 'bad'); return; }
    const full = p.members.every(m => m.state === 'dead' || (m.state === 'ok' && m.hp >= m.max) || m.food <= 0) && p.members.every(m => !B.casterType(m.cls) || m.spent[1].concat(m.spent[2], m.spent[3]).every(x => !x)) && p.members.every(m => m.state !== 'down');
    if (c.hour >= 8 || (full && c.hour >= 1)) { B.finishRest(c.hour >= 8); return; }
  }
};
B.finishRest = (long) => {
  const S = B.S, c = S.camp, p = S.party; c.rest = false;
  if (long) { for (const m of p.members) { if (m.state === 'dead') continue; m.food = Math.max(0, m.food - 15); if (m.state === 'down') { m.state = 'ok'; m.hp = 1; } if (m.cls === 'paladin' || m.cls === 'cleric') m.lay = 1; if (B.casterType(m.cls)) B.autoPrep(m); if (m.pendingLevel) { m.pendingLevel = false; while (m.lvl < 8 && m.xp >= B.XPT[m.lvl + 1]) B.levelUp(m); } } S.stats.rests++; B.autoLevelRest(); }
  c.summary = long ? 'Rested eight hours. Slots are fresh.' : 'Everyone is mended and ready.'; B.ev('restDone', {});
};
B.autoLevelRest = () => {};
B.spawnWanderer = () => {
  const S = B.S, F = B.F(), d = B.def(), p = S.party; F.wanders++; const pool = S.floor === 'f1' ? ['rat', 'rat', 'leech'] : S.floor === 'f2' ? ['rustling', 'spider'] : ['hound', 'hound'];
  let n = 0; for (let r = 2; r <= 4 && n < 2; r++) for (let y = -r; y <= r && n < 2; y++) for (let x = -r; x <= r && n < 2; x++) { if (Math.abs(x) + Math.abs(y) !== r) continue; const cx = p.cx + x, cy = p.cy + y; if (!B.walkable(cx, cy) || B.monsAt(cx, cy).length || (cx === p.cx && cy === p.cy) || B.cell(cx, cy) === 'O') continue; F.mons.push(B.makeMon(B.pick(S, 'world', pool), cx, cy, 'hunt', { aware: true, wander: true })); n++; }
};

/** Sister Veil's choice changes floor 3: with her, the hound in the corridor is called off and she whispers the candles' order; without her, the Deeps send more hounds into the Gauntlet. */
B.veilJoined = (joined) => {
  const S = B.S, F = S.floors.f3; if (S.flags.veilDecided) return; S.flags.veilDecided = joined ? 'joined' : 'refused';
  if (joined) { for (const m of F.mons) if (m.type === 'hound' && m.cx === 18 && m.cy === 8) { m.hp = 0; m.dieT = 9; m._gone = true; } B.log('Veil: "Small, then middle, then great. The flames open in that order."', 'good'); S.hintT = 0; }
  else { for (const c of [[17, 11], [18, 9]]) if (!F.mons.some(m => m.hp > 0 && m.cx === c[0] && m.cy === c[1])) F.mons.push(B.makeMon('hound', c[0], c[1], 'idle')); }
};

/** class abilities: Lay on Hands (paladin: heal 2x level once per rest) and Turn the Dead (cleric: undead ahead flee once per rest) */
B.abilityOf = (m) => m.cls === 'paladin' ? { id: 'lay', n: 'Lay on Hands' } : m.cls === 'cleric' ? { id: 'turn', n: 'Turn the Dead' } : null;
B.cmdAbility = (mi) => {
  const S = B.S, p = S.party, m = p.members[mi], a = m && B.abilityOf(m); if (!a || m.state !== 'ok' || S.camp || S.over) return false;
  if (m.lay <= 0 && !B.CHEATS.spells) { B.log(m.name + ' has no ' + a.n + ' left until a rest.'); return false; }
  if (a.id === 'lay') { const w = p.members.filter(x => x.state !== 'dead').sort((x, y) => x.hp / x.max - y.hp / y.max)[0]; if (!w || (w.state === 'ok' && w.hp >= w.max)) { B.log('No one needs healing.'); return false; } B.healMember(w, 2 * m.lvl); B.ev('spellMember', { m: p.members.indexOf(w), col: '#fff0a0' }); }
  else { let n = 0; for (const mo of B.F().mons) if (mo.hp > 0 && B.MONS[mo.type].undead && Math.abs(mo.cx - p.cx) + Math.abs(mo.cy - p.cy) <= 4) { mo.state = 'flee'; mo.timer = 8; mo.fled = true; n++; } if (!n) { B.log('Nothing of the dead is near.'); return false; } B.log('The dead flee the holy symbol!', 'good'); B.ev('spellFront', { col: '#fff0a0' }); }
  if (!B.CHEATS.spells) m.lay--; m.cool.main = m.cool.off = 2; B.ev('cast', { m: mi, id: 'bless', col: '#fff0a0' }); return true;
};
