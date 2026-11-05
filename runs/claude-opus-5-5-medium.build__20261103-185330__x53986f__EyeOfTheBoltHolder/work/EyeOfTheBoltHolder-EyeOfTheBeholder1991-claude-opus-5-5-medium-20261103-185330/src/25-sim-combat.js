/* SIM: combat in real time. Every hand is an action with its own cooldown; formation rows decide who reaches; Party
 * Strike acts with every ready main hand; projectiles fly cell by cell; members go Down, then Dead. */
B.handItem = (m, h) => m.slots[h] || null;
B.handLocked = (m, h) => h === 'off' && m.slots.main && (B.def(m.slots.main) || {}).two;
B.canAct = m => m.state === 'ok' && !(m.status.held > 0) && !(m.status.asleep > 0);
B.setCool = (m, h, base) => {
  let t = base * B.T.cooldown * (1 - .04 * B.mod(B.stat(m, 'dex')));
  for (const it of Object.values(m.slots)) { const d = B.def(it); if (d && d.quick) t *= 1 - d.quick; }
  if (m.status.slowed > 0) t *= 1.5;
  if (B.CHEATS.noCooldowns) t = .05;
  m.cool[h] = m.coolMax[h] = Math.max(.05, t);
};
B.pop = (m, h, text, color) => { m.pop[h] = { text: String(text), color: color || '#fff', t: B.S.time }; };
/** what a hand would do now: 'melee' | 'reach' | 'throw' | 'missile' | 'cast' | 'zap' | 'brace' | 'punch' | 'use' | null */
B.handAction = (m, h) => {
  if (B.handLocked(m, h)) return null;
  const it = B.handItem(m, h), d = B.def(it), row = B.rowOf(m);
  if (!it) return row === 1 ? 'punch' : null;
  if (d.kind === 'book' || d.kind === 'symbol') return 'cast';
  if (d.kind === 'wand') return 'zap';
  if (d.kind === 'shield') return 'brace';
  if (d.kind === 'missile') return 'missile';
  if (d.kind === 'weapon') {
    const [fx, fy] = B.front(), foe = B.monsAt(fx, fy).length > 0;
    if (it.id === 'darts') return 'throw';
    if (row === 1 && (foe || !d.throw)) return 'melee';
    if (row === 2 && d.reach) return 'reach';
    if (d.throw) return 'throw';
    return row === 1 ? 'melee' : null;
  }
  if (d.kind === 'potion' || d.kind === 'food' || d.kind === 'scroll' || d.kind === 'note') return 'use';
  return null;
};
/** a member uses a hand (the source's core gesture); returns what it did, or false */
B.cmdHand = (mi, h) => {
  const S = B.S, m = S.party.members[mi]; if (!m || S.over) return false;
  if (!B.canAct(m)) { if (m.state === 'ok' && m.status.held > 0) B.msg(m.name + ' cannot move!'); return false; }
  if (m.cool[h] > 0) return false;
  const act = B.handAction(m, h), it = B.handItem(m, h), d = B.def(it);
  if (!act) { B.pop(m, h, 'X', '#8a8a8a'); return false; }
  if (act === 'cast') { B.ev('castMenu', { m: mi }); return 'cast'; }
  if (act === 'use') { B.useItem(m, it, { slot: h }); B.setCool(m, h, 1); return 'use'; }
  if (act === 'brace') { m.status.brace = 2; B.pop(m, h, 'BRACE', '#ffd36a'); B.sfx('brace'); B.setCool(m, h, 2); return 'brace'; }
  if (act === 'zap') {
    if (!(it.ch > 0)) { B.msg('The ' + d.name + ' is spent.'); return false; }
    if (!B.castSpell(m, d.spell, { wand: true })) return false;
    it.ch--; B.sfx('wand'); B.setCool(m, h, 2); return 'zap';
  }
  const [fx, fy] = B.front(), family = d ? d.family : 'punch';
  if (act === 'missile') {
    const q = m.slots.quiver;
    if (!q || q.id !== d.ammo || !(q.n > 0)) { B.msg(m.name + ' has no ' + B.ITEMS[d.ammo].name.toLowerCase() + '.'); B.pop(m, h, 'EMPTY', '#8a8a8a'); B.setCool(m, h, .5); return false; }
    q.n--; if (!q.n) delete m.slots.quiver;
    const bonus = B.toHitBonus(m) + B.mod(B.stat(m, 'dex')) + (d.hit || 0) + (m.cls === 'R' ? 1 : 0) + (m.race === 'halfling' && d.family === 'sling' ? 1 : 0);
    B.launch({ kind: 'ammo', item: B.item(d.ammo, 1), by: m.id, dmg: B.dmgRoll(m, d, false), range: 6, speed: 8, hitBonus: bonus, hand: h });
    B.sfx(d.family === 'bow' ? 'bow' : d.family === 'sling' ? 'sling' : 'crossbow'); B.ev('swing', { m: m.id, family: d.family, side: B.colOf(m) });
    B.setCool(m, h, d.speed); B.noise([B.S.party.cx, B.S.party.cy], 4); return 'missile';
  }
  if (act === 'throw') {
    let thrown = it;
    if (d.stack && it.n > 1) { it.n--; thrown = B.item(it.id, 1); } else delete m.slots[h];
    const bonus = B.toHitBonus(m) + B.mod(B.stat(m, 'str')) + (d.hit || 0) + (m.race === 'halfling' ? 1 : 0);
    B.launch({ kind: 'item', item: thrown, by: m.id, dmg: B.dmgRoll(m, d, true), range: B.T.throwRange + 2, speed: 8, hitBonus: bonus, hand: h });
    B.sfx('throw'); B.ev('swing', { m: m.id, family: 'throw', side: B.colOf(m) });
    B.setCool(m, h, d.speed); return 'throw';
  }
  // melee, reach, punch: the front cell
  const foes = B.monsAt(fx, fy);
  B.ev('swing', { m: m.id, family: act === 'punch' ? 'punch' : family, side: B.colOf(m) });
  B.sfx(act === 'punch' ? 'whiff' : 'swing' + (family === 'axe' ? 'Axe' : family === 'blunt' ? 'Blunt' : ''));
  B.setCool(m, h, act === 'punch' ? 1 : d.speed);
  if (!foes.length) { if (B.rowOf(m) === 1 && S.time - (m.airMsg || -9) > 3) { m.airMsg = S.time; B.msg(m.name + ' swings at the air.'); } return 'air'; }
  const foe = B.pickFoe(foes, B.colOf(m));
  B.attackMon(m, foe, d, h, act === 'punch' ? { dmg: '1d2' } : {});
  B.noise([fx, fy], 4);
  return act;
};
B.pickFoe = (foes, col) => {
  const P = B.S.party, rx = DX[(P.dir + 1) % 4], ry = DY[(P.dir + 1) % 4];
  const side = f => { const o = B.slotOffset(f); return o[0] * rx + o[1] * ry; };
  return foes.slice().sort((a, b) => (col ? side(b) - side(a) : side(a) - side(b)))[0];
};
/** where a monster stands in its cell: quadrants for small, halves for middling, the centre for large (units) */
B.slotOffset = mon => { const sz = B.MONSTERS[mon.type].size; if (sz >= 4) return [0, 0]; if (sz === 2) return mon.slot ? [7, 0] : [-7, 0]; return [[-8, -8], [8, -8], [-8, 8], [8, 8]][mon.slot & 3]; };
B.dmgRoll = (m, d, thrown, crit) => {
  if (!d) return Math.max(1, B.dice('1d2'));
  let dmg = B.dice(d.dmg) + (crit ? B.dice(d.dmg) : 0);
  if (d.kind !== 'missile') dmg += Math.round(B.mod(B.stat(m, 'str')) * (d.two ? 1.5 : 1));
  return dmg;
};
B.attackMon = (m, mon, d, h, o = {}) => {
  const S = B.S, MD = B.MONSTERS[mon.type];
  const roll = B.ri(1, 20);
  const bonus = B.toHitBonus(m) + B.mod(B.stat(m, 'str')) + ((d && d.hit) || 0) - (h === 'off' && m.cls !== 'R' ? 2 : 0);
  if (roll === 1 || (roll !== 20 && roll + bonus < MD.def)) { B.pop(m, h, 'MISS', '#c8c8c8'); B.sfx('whiff'); return false; }
  let dmg = o.dmg ? B.dice(o.dmg) : B.dmgRoll(m, d, false, roll === 20);
  if (d && h === 'main' && m.slots.main && m.slots.main.rust) dmg -= m.slots.main.rust;
  if (d && d.blunt && MD.bluntX) dmg *= MD.bluntX; if (d && d.blunt && MD.bluntHalf) dmg *= .5;
  if (d && d.construct && MD.construct) dmg *= d.construct;
  if (m.cls === 'T' && (mon.status.asleep > 0 || mon.status.held > 0 || !mon.aware)) { dmg *= 2; B.pop(m, h, 'BACKSTAB', '#ffd36a'); }
  dmg = Math.max(1, Math.round(dmg * B.T.partyDmg));
  if (roll === 20) { B.ev('crit'); B.sfx('crit'); }
  B.pop(m, h, dmg, roll === 20 ? '#ffd36a' : '#ffffff');
  B.hurtMon(mon, dmg, { by: m, kind: 'weapon', crit: roll === 20 });
  return true;
};
/** a monster takes damage (sleep doubles it and wakes it); death gives XP, drops and wires */
B.hurtMon = (mon, dmg, o = {}) => {
  const S = B.S, MD = B.MONSTERS[mon.type];
  if (mon.hp <= 0) return;
  if (B.CHEATS.oneHit && o.by) dmg = mon.hp;
  if (mon.status.asleep > 0) { dmg *= 2; mon.status.asleep = 0; }
  if (MD.boss) dmg = B.bossDamage(mon, dmg, o);
  dmg = Math.round(dmg); if (dmg <= 0) return;
  mon.hp -= dmg; mon.flash = .2; mon.aware = true; if (mon.state === 'asleep' || mon.state === 'idle' || mon.state === 'patrol') mon.state = 'hunt'; mon.lastSeen = S.time;
  B.ev('hit', { uid: mon.uid, dmg, crit: !!o.crit, kind: o.kind || 'weapon', mat: MD.hit });
  B.sfx('hit' + B.cap(MD.hit || 'flesh'), { at: [mon.cx, mon.cy] });
  if (mon.id) B.trigger({ hurt: mon.id, ratio: mon.hp / mon.max });
  if (mon.hp <= 0) B.killMon(mon, o);
};
B.killMon = (mon, o = {}) => {
  const S = B.S, MD = B.MONSTERS[mon.type];
  mon.hp = 0; mon.state = 'dead'; mon.deadT = 0; mon.wind = 0; S.stats.kills++;
  B.ev('death', { uid: mon.uid, type: mon.type }); B.sfx('die' + B.cap(MD.voice || 'squeak'), { at: [mon.cx, mon.cy] });
  if (S.mode === 'campaign' || S.mode === 'attract') B.msg('The ' + MD.name.replace(/^The /, '') + ' dies.');
  // experience: split among the conscious
  const live = B.alive(); for (const m of live) B.gainXp(m, MD.xp / live.length);
  // drops: the table on the loot stream, what a thief stole, named drops
  const drops = [];
  for (const [p, id, n] of MD.drops || []) if (p >= 1 || B.rng('loot') < p * B.T.loot) drops.push(B.item(id, n));
  if (mon.drop) drops.push(B.item(mon.drop));
  for (const it of mon.stole || []) drops.push(it);
  for (const it of drops) B.dropAt(S.floor, mon.cx, mon.cy, it);
  if (mon.id) B.trigger({ killed: mon.id });
  if (MD.boss) B.bossDeath(mon);
  if (S.race) B.raceKill();
};
/** which member a blow from a side reaches: front rows from the front, a column from a flank, the back from behind */
B.targetMember = (side, rnd = 'combat') => {
  const P = B.S.party, F = P.formation, ok = i => { const m = P.members[F[i]]; return m && m.state !== 'dead' ? m : null; };
  const rows = [[0, 1], [2, 3], [4, 5]], pickIn = idx => { const c = idx.map(ok).filter(m => m && m.state === 'ok'); return c.length ? c[Math.floor(B.rng(rnd) * c.length)] : null; };
  if (side === 'left' || side === 'right') { const col = side === 'left' ? [0, 2, 4] : [1, 3, 5]; for (const i of col) { const m = ok(i); if (m && m.state === 'ok') return m; } }
  const order = side === 'back' ? [2, 1, 0] : [0, 1, 2];
  for (const r of order) { const m = pickIn(rows[r]); if (m) return m; }
  // the Down are hit only when no one stands
  for (const r of order) for (const i of rows[r]) { const m = ok(i); if (m) return m; }
  return null;
};
B.hurtMember = (m, dmg, side = 'front', o = {}) => {
  const S = B.S; if (!m || m.state === 'dead') return 0;
  if (B.CHEATS.god || S.mode === 'attract') { B.ev('hurt', { m: m.id, dmg: 0, side }); return 0; }
  dmg = Math.max(0, Math.round(dmg));
  if (m.ward > 0) { const a = Math.min(m.ward, dmg); m.ward -= a; dmg -= a; if (a) B.pop(m, 'main', 'WARD', '#e8c050'); }
  if (dmg <= 0) return 0;
  m.hurt = S.time;
  if (m.state === 'down') { m.state = 'dead'; m.hp = 0; S.stats.deaths++; B.msg(m.name + ' is dead!', '#e0463c'); B.sfx('deathToll'); B.ev('memberDead', { m: m.id }); B.checkWipe(); return dmg; }
  m.hp -= dmg; B.ev('hurt', { m: m.id, dmg, side }); B.sfx('partyHurt', { pan: side === 'left' ? -.7 : side === 'right' ? .7 : 0 });
  if (m.hp <= 0) { m.hp = 0; m.state = 'down'; m.status = {}; B.msg(m.name + ' falls!', '#e0463c'); B.ev('memberDown', { m: m.id }); B.checkWipe(); }
  return dmg;
};
B.checkWipe = () => { const S = B.S; if (!B.alive().length && !S.over) { S.over = true; B.ev('over'); B.sfx('gameOver'); if (S.race) B.raceWipe(); } };
B.healMember = (m, n) => {
  if (m.state === 'dead') return 0;
  if (m.state === 'down') { m.state = 'ok'; m.hp = 0; B.msg(m.name + ' wakes.'); }
  const was = m.hp; m.hp = Math.min(m.max, m.hp + Math.round(n)); B.ev('heal', { m: m.id, n: m.hp - was }); return m.hp - was;
};

/* ---- projectiles: cell by cell along a line ---- */
B.launch = (o) => {
  const P = B.S.party;
  const p = Object.assign({ cx: P.cx, cy: P.cy, d: P.dir, prog: 0, left: o.range || 6, team: 'party', uid: B.uid() }, o);
  B.S.proj.push(p); B.ev('proj', { uid: p.uid }); return p;
};
B.updateProj = dt => {
  const S = B.S, P = S.party;
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const p = S.proj[i]; p.prog += p.speed * dt;
    while (p.prog >= 1 && !p.done) {
      p.prog -= 1;
      const nx = p.cx + DX[p.d], ny = p.cy + DY[p.d];
      if (!B.open(S.floor, nx, ny) && !(p.team === 'mon' && nx === P.cx && ny === P.cy)) { B.projEnd(p, p.cx, p.cy, true); break; }
      p.cx = nx; p.cy = ny; p.left--;
      if (p.team === 'party') {
        const foes = B.monsAt(nx, ny).filter(m => !(B.MONSTERS[m.type].fly && p.kind === 'item' && false));
        if (foes.length) { B.projHit(p, foes); break; }
      } else if (nx === P.cx && ny === P.cy) { B.projHitParty(p); break; }
      if (p.left <= 0) { B.projEnd(p, nx, ny, false); break; }
    }
    if (p.done) S.proj.splice(i, 1);
  }
};
B.projHit = (p, foes) => {
  const S = B.S, m = S.party.members.find(x => x.id === p.by) || S.party.members[0];
  const foe = B.pickFoe(foes, m ? B.colOf(m) : 0), MD = B.MONSTERS[foe.type];
  if (p.spell) { B.spellHit(p, foe, foes); p.done = true; return; }
  const roll = B.ri(1, 20);
  if (roll === 20 || (roll !== 1 && roll + (p.hitBonus || 0) >= MD.def)) {
    const dmg = Math.max(1, Math.round(p.dmg * B.T.partyDmg));
    if (m && p.hand) B.pop(m, p.hand, dmg);
    B.hurtMon(foe, dmg, { by: m, kind: 'missile' });
  } else { if (m && p.hand) B.pop(m, p.hand, 'MISS', '#c8c8c8'); B.sfx('whiff'); }
  B.projEnd(p, p.cx, p.cy, false);
};
B.projEnd = (p, x, y, wall) => {
  p.done = true; B.ev('projEnd', { uid: p.uid, x, y, wall, spell: p.spell });
  if (p.spell) return B.spellBurst(p, x, y);
  if (p.kind === 'item') { B.sfx('land'); B.landItem(p.item, x, y); }
  else if (p.kind === 'ammo' && B.rng('loot') < .5) B.landItem(p.item, x, y);
};
B.projHitParty = p => {
  p.done = true; const P = B.S.party, side = B.sideOf(P.cx, P.cy, P.dir, P.cx - DX[p.d], P.cy - DY[p.d]);
  const m = B.targetMember(side); B.ev('projEnd', { uid: p.uid, x: P.cx, y: P.cy, party: true });
  if (!m) return;
  if (p.kind === 'lockBolt') { B.hurtMember(m, B.dice('1d6+2') * B.T.monDmg * B.diff().dmg, side); B.sfx('zap'); }
  else if (p.kind === 'spark') B.hurtMember(m, B.dice('1d6') * B.T.monDmg * B.diff().dmg, side);
};

/* ---- statuses, food and the slow clocks of each member ---- */
B.updateMembers = dt => {
  const S = B.S;
  for (const m of S.party.members) {
    for (const h of ['main', 'off']) if (m.cool[h] > 0) m.cool[h] = Math.max(0, m.cool[h] - dt);
    if (m.state !== 'ok') continue;
    for (const k of Object.keys(m.status)) { if (m.status[k] > 0) { m.status[k] -= dt; if (m.status[k] <= 0) { delete m.status[k]; if (k === 'held') B.msg(m.name + ' can move again.'); if (k === 'poison') B.msg(m.name + ' is no longer poisoned.'); } } }
    if (m.status.poison > 0) { m.poisonT = (m.poisonT || 0) + dt; if (m.poisonT >= 6) { m.poisonT = 0; B.hurtMember(m, 1, 'none'); } }
    const ring = Object.values(m.slots).find(it => it && B.def(it).regen);
    if (ring && m.hp < m.max) { m.regen = (m.regen || 0) + dt; if (m.regen >= 30) { m.regen = 0; m.hp++; } }
    // hunger
    if (!B.CHEATS.noHunger && S.mode === 'campaign') {
      const was = m.food; m.food = Math.max(0, m.food - dt / 60 * B.T.hunger * B.diff().hunger);
      if (was > 25 && m.food <= 25) B.msg(m.name + ' is hungry.', '#c8a040');
      if (was > 0 && m.food <= 0) B.msg(m.name + ' is starving!', '#e0463c');
      if (m.food <= 0) { m.starve = (m.starve || 0) + dt; if (m.starve >= 30) { m.starve = 0; B.hurtMember(m, 1, 'none'); } }
    }
  }
  const fx = S.party.fx; for (const k of Object.keys(fx)) if (fx[k] > 0) { fx[k] = Math.max(0, fx[k] - dt); if (!fx[k] && k === 'float') { B.msg('Your feet touch the ground again.'); B.arriveFloatEnd(); } }
};
B.arriveFloatEnd = () => { const P = B.S.party; if (B.pitOpen(B.S.floor, P.cx, P.cy)) { B.msg('The floor gives way!'); B.fall(); } };
/** noise wakes the monsters near it (combat, doors, levers, falls); hounds hear further */
B.noise = (at, r) => {
  for (const mon of B.FS().mons) if (mon.hp > 0 && !mon.aware && mon.state !== 'turned') {
    const d = B.manh(mon.cx, mon.cy, at[0], at[1]);
    if (mon.status.asleep > 0 && mon.status.asleep < 1000) continue;   // (a spell's sleep holds through noise)
    if (d <= (B.MONSTERS[mon.type].hears || r)) { mon.aware = true; mon.state = 'hunt'; mon.status.asleep = 0; mon.lastSeen = B.S.time; }
  }
};
