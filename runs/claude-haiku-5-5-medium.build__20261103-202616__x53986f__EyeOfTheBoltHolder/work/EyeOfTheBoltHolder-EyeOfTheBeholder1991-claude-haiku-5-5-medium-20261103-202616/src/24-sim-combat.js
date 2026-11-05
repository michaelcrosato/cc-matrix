/* ===== 24 sim · combat: hands, to-hit, damage, rows and reach, missiles, Party Strike, statuses =====
 * A hand is an action: a weapon strikes the cell in front (its row must reach it), a thrown weapon is thrown, a missile
 * fires its ammo along the facing line, a book or symbol opens the cast menu, a shield braces, a wand zaps. Each hand
 * has a cooldown (its weapon's speed × the attack cooldown × the DEX scaling). */
const ROW_REACH = { 0: 'melee', 1: 'reach', 2: 'none' };
/** the member's Defense: 10, the armour and shield, DEX, the brace and the buffs */
function partyDef(m) {
  let ac = 0; for (const s of ['body', 'head', 'arms', 'off', 'ring1', 'ring2', 'neck']) { const it = m.slots[s]; if (it) ac += B.ITEMS[it.id].ac || 0; }
  for (const it of Object.values(m.slots)) if (it && B.ITEMS[it.id].saves) ac += 0;
  return 10 + ac + B.MOD(m.stats.dex) + (m.brace > 0 ? 3 : 0) + (S.party.steady > 0 ? 1 : 0) + (m.ward > 0 ? 3 : 0);
}
/** the member's damage bonus and to-hit from the STR (melee), DEX (missile) and class */
const strMod = m => B.MOD(m.stats.str);
const dexMod = m => B.MOD(m.stats.dex);
/** the cooldown of a hand's action, in seconds */
function cooldownFor(m, it) {
  const spd = it ? (B.ITEMS[it.id].spd || 1) : 1; const quick = m.slots.feet ? (B.ITEMS[m.slots.feet.id].quick || 0) : 0;
  return Math.max(.3, spd * B.T.attackCd * Math.max(.3, 1 - .04 * dexMod(m)) * (1 - quick));
}
/** the hand's item (main or off), and whether the hand can act now */
function handReady(m, h) { return m.state === 'ok' && !m.status.held && m.cool[h] <= 0 && !(h === 'off' && m.slots.main && B.ITEMS[m.slots.main.id].two); }
/** a hand's action: the member uses the item in the hand. Returns { ok, why } */
function handAct(m, h) {
  if (!m || m.state !== 'ok') return { ok: false, why: 'down' };
  if (m.status.held) { msg(m.name + ' is held fast.'); return { ok: false, why: 'held' }; }
  if (m.cool[h] > 0) return { ok: false, why: 'cool' };
  if (h === 'off' && m.slots.main && B.ITEMS[m.slots.main.id].two) return { ok: false, why: 'two' };
  const it = m.slots[h];
  const pl = partyList().find(x => x[0] === m), place = pl ? pl[1] : 0;
  if (!it) { punch(m, h, place); return { ok: true }; }
  const d = B.ITEMS[it.id];
  if (d.k === 'book' || d.k === 'holy') { m.cool[h] = .3; ev('castMenu', { m: rosterOf(m), h }); return { ok: true, menu: true }; }
  if (d.k === 'wand') { useItemRef(m, { where: 'slot', m, slot: h }); m.cool[h] = cooldownFor(m, it); return { ok: true }; }
  if (d.k === 'shield') { m.brace = 2; m.cool[h] = 2; sfx('brace'); return { ok: true }; }
  if (d.k === 'missile') return fireMissile(m, h, it, place);
  if (d.k === 'weapon' && d.thr) { return throwFromHand(m, h, it, place); }
  if (d.k === 'weapon') return meleeHand(m, h, it, place);
  punch(m, h, place); return { ok: true };
}
function punch(m, h, place) {
  m.cool[h] = .8 * B.T.attackCd; const foe = frontMon(); sfx('swing');
  if (rowOf(place) === 2 || !foe) { ev('swing', { m: rosterOf(m), h, kind: 'punch', air: !foe }); return; }
  ev('swing', { m: rosterOf(m), h, kind: 'punch' });
  hitMon(foe, B.roll(S, 'combat', '1d2'), m, { how: 'punch', d20: 10, weapon: null });
}
/** a weapon strike at the cell in front (the row must reach it: row 1 melee, row 2 with reach, row 3 none) */
function meleeHand(m, h, it, place) {
  const d = B.ITEMS[it.id], row = rowOf(place), reach = row === 0 || (row === 1 && d.reach);
  m.cool[h] = cooldownFor(m, it); sfx('swing');
  if (!reach) { ev('swing', { m: rosterOf(m), h, kind: d.dmg ? (d.blunt ? 'blunt' : 'blade') : 'punch', air: true }); msg(m.name + ' cannot reach from here.'); return { ok: false, why: 'reach' }; }
  const foe = frontMon() || (d.reach && row === 1 ? frontMon(2) : null);
  ev('swing', { m: rosterOf(m), h, kind: d.blunt ? 'blunt' : d.reach ? 'thrust' : 'blade', air: !foe, dmg: 0 });
  if (!foe) return { ok: true, air: true };
  attackWith(m, it, foe, place); return { ok: true };
}
/** a thrown weapon in a hand is thrown forward at once: a dagger, darts, a hand axe, a spear */
function throwFromHand(m, h, it, place) {
  const row = rowOf(place); m.cool[h] = cooldownFor(m, it); sfx('whoosh');
  m.slots[h] = null; if (B.ITEMS[it.id].two) m.slots.off = null;
  S.proj.push({ k: 'thrown', item: it, cx: S.party.cx, cy: S.party.cy, dir: S.party.dir, left: B.T.throwRange, t: 0, by: rosterOf(m), str: strMod(m), thr: true, speed: 8, row });
  return { ok: true };
}
/** a missile weapon fires its ammo from the quiver: 6 cells along the facing line */
function fireMissile(m, h, it, place) {
  const d = B.ITEMS[it.id], q = m.slots.quiver;
  if (!q || B.ITEMS[q.id].k !== 'ammo' || q.id !== d.ammo) { msg('No ammunition for that.'); m.cool[h] = .5; return { ok: false, why: 'ammo' }; }
  if (q.n && q.n > 1) q.n--; else m.slots.quiver = null;
  m.cool[h] = cooldownFor(m, it) * 1.0; sfx('bow');
  S.proj.push({ k: 'missile', item: { id: q.id }, cx: S.party.cx, cy: S.party.cy, dir: S.party.dir, left: 6, t: 0, by: rosterOf(m), dmg: d.dmg, dex: dexMod(m), hit: (d.hit || 0) + (m.cls === 'R' ? 1 : 0), speed: 8 });
  ev('swing', { m: rosterOf(m), h, kind: 'missile' });
  return { ok: true };
}
/** a melee attack from a member: d20 + class + STR + weapon + party to-hit against the target's Defense */
function attackWith(m, it, mon, place) {
  const d = B.ITEMS[it.id];
  const nat = 1 + B.rint(S, 'combat', 20), tot = nat + classHit(m) + strMod(m) + (d.hit || 0) + Math.round(B.T.partyHit) + (S.party.steady > 0 ? 1 : 0) + (m.status.blessed ? 1 : 0);
  const def = B.MONS[mon.type].def;
  if (nat === 1 || (nat !== 20 && tot < def)) { ev('miss', { mon: mon.id, at: [mon.cx, mon.cy] }); msg('The ' + B.MONS[mon.type].name + ' is not touched.'); return false; }
  let dice = d.dmg; const dd = B.parseDice(dice); let dmg = B.roll(S, 'combat', dice) - dd[2] + strMod(m) * (d.two ? 1.5 : 1) + dd[2];
  if (nat === 20) dmg += B.roll(S, 'combat', [dd[0], dd[1], 0]);
  if (d.construct && B.MONS[mon.type].construct) dmg *= d.construct;
  if (B.MONS[mon.type].construct && d.blunt === undefined) { /* blades glance off constructs */ dmg = dmg * .8; }
  if (B.MONS[mon.type].undead && d.blunt) dmg *= 1.5;
  if (B.MONS[mon.type].construct && !d.construct) dmg = dmg;
  if (m.cls === 'T' && (mon.state === 'asleep' || mon.status.held || !mon.aware)) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg * B.T.partyDmg));
  hitMon(mon, dmg, m, { how: 'weapon', d20: nat, weapon: it.id, crit: nat === 20 });
  return true;
}
/** the monster in the cell in front of the party (or two ahead: a reach), or null */
function frontMon(n = 1) {
  const p = S.party; const x = p.cx + DX[p.dir] * n, y = p.cy + DY[p.dir] * n;
  const m = monAt(x, y); return m && !(m.dead) ? m : null;
}
/** a monster is hit: its HP down; a sleeper wakes and takes double; a kill is a death */
function hitMon(mon, dmg, by, how = {}) {
  if (mon.hp <= 0) return;
  const dd = Math.max(1, Math.round(dmg)); let d = dd;
  if (mon.state === 'asleep') { d *= 2; mon.state = 'hunt'; }
  if (B.MONS[mon.type].blunt && how.weapon && B.ITEMS[how.weapon] && B.ITEMS[how.weapon].blunt && B.MONS[mon.type].blunt) d = Math.round(d * B.MONS[mon.type].blunt);
  if (how.weapon && B.ITEMS[how.weapon] && B.ITEMS[how.weapon].blunt && mon.type === 'ooze') d = Math.round(d * .5);
  if (how.lightning && B.MONS[mon.type].lightning) d = Math.round(d * B.MONS[mon.type].lightning);
  if (mon.type === 'boltholder') { bossHit(mon, d, by, how); return; }
  mon.hp -= d; mon.aware = true; mon.lastSeen = S.time;
  ev('hit', { mon: mon.id, dmg: d, crit: !!how.crit, at: [mon.cx, mon.cy], id: mon.type, from: by ? rosterOf(by) : -1 });
  sfx(B.MONS[mon.type].undead ? 'bone' : mon.type === 'ooze' ? 'ooze' : 'hit');
  if (B.MONS[mon.type].rusts) { /* the monster's rust is on the member's hit, see monsterHitsMember */ }
  if (mon.named && B.FLOORS[S.floor].wires) wireFire('hp', mon.named, { hp: mon.hp / mon.max });
  if (mon.hp <= 0) monsterDied(mon, by);
  if (mon.named) checkHpWires(mon);
}
function checkHpWires(mon) {
  const d = curF(); if (!d.wires) return;
  d.wires.forEach((w, i) => { if (w.on.hp === mon.named && mon.hp / mon.max < (w.on.below || 0)) { if (w.once && wireFired(curFS(), i)) return; markFired(curFS(), i); runActs(w.do || [], w, i); } });
}
/** a monster dies: its XP, its drops, the wires and the record */
function monsterDied(mon, by) {
  mon.hp = 0; mon.deadT = 0; mon.state = 'dead'; mon.status = {};
  const def = B.MONS[mon.type]; S.stats.kills++; sfx(def.undead ? 'bone' : 'die');
  ev('die', { mon: mon.id, type: mon.type, at: [mon.cx, mon.cy] }); msg('The ' + def.name + ' dies.');
  if (S.race) raceKill();
  // XP to the conscious members
  if (!S.race) addXpAll(Math.round(def.xp * B.T.xp / 1));
  // drops, from the loot stream
  for (const [item, pct] of def.drops || []) if (B.rnd(S, 'loot') * 100 < pct * B.T.loot) { placeOnFloorAt(mon.cx, mon.cy, mkItem(item)); }
  for (const it of mon.stolen || []) placeOnFloorAt(mon.cx, mon.cy, it);
  wireFire('killed', mon.named || mon.type);
  if (mon.named === 'boss') bossDied(mon);
}
const placeOnFloorAt = (x, y, it) => { const f = curFS(); (f.items[key(x, y)] = f.items[key(x, y)] || []).push(it); };
/** the XP each conscious member gets: an even share, times the class and race multipliers */
function addXpAll(n) {
  const list = awake(); if (!list.length || n <= 0) return;
  const each = Math.floor(n / list.length);
  for (const m of list) {
    const k = B.CLASSES[m.cls].xp * B.RACES[m.race].xp;
    m.xp += Math.round(each * k);
    checkLevel(m);
  }
}
/** an HP and a level: each level sets HP, to-hit (class) and spell slots */
function checkLevel(m) {
  let up = false;
  while (m.lvl < 8 && m.xp >= B.XP_LEVELS[m.lvl + 1]) { m.lvl++; const mx = memberMaxHp(m, m.lvl); m.hp += mx - m.max; m.max = mx; up = true; }
  if (up) { sfx('levelUp'); ev('levelup', { m: rosterOf(m), lvl: m.lvl }); msg(m.name + ' has reached level ' + m.lvl + '!'); }
}
/** the party's damage to a member: a Down member hit again is Dead */
function hurtMember(m, dmg, how) {
  if (!m || m.state === 'dead' || cheat('god')) return;
  if (m.state === 'down') { killMember(m); return; }
  if (m.ward > 0) { const a = Math.min(m.ward, dmg); m.ward -= a; dmg -= a; if (dmg <= 0) return; }
  m.hp = Math.max(0, m.hp - Math.max(1, Math.round(dmg)));
  m.hurtT = .5; ev('hurt', { m: rosterOf(m), dmg, how: how || '' }); sfx('hurt');
  if (m.hp <= 0) { m.state = 'down'; m.status = { poison: m.status.poison }; ev('down', { m: rosterOf(m) }); msg(m.name + ' falls.'); if (!awake().length) gameOver(); }
}
function killMember(m) { m.state = 'dead'; m.hp = 0; S.stats.deaths++; ev('dead', { m: rosterOf(m) }); msg(m.name + ' is dead.'); if (!awake().length) gameOver(); }
/** a member raised (from the Shrine, a scroll, a prayer): 1 HP, awake */
function raiseMember(m, hp) { m.state = 'ok'; m.hp = Math.max(1, hp); m.status = {}; ev('raise', { m: rosterOf(m) }); msg(m.name + ' is raised.'); }
/** a monster's blow on a member: the attack roll against Defense, then the damage */
function monsterHits(mon, m) {
  const def = B.MONS[mon.type];
  const roll = 1 + B.rint(S, 'combat', 20), tot = roll + def.atk;
  if (roll === 1 || (roll !== 20 && tot < partyDef(m))) { ev('miss', { who: rosterOf(m) }); return false; }
  const dmg = Math.max(1, Math.round(B.roll(S, 'combat', def.dmg) * B.T.monDmg * (S.diffMult.monDmg)));
  hurtMember(m, dmg, mon.type);
  if (def.corrode && m.slots.body) { const b = m.slots.body; if (b.rust === undefined) b.rust = 0; }
  if (def.rusts && B.rnd(S, 'combat') < def.rusts && m.slots.main && B.ITEMS[m.slots.main.id].k === 'weapon') { m.slots.main.rust = Math.min(4, (m.slots.main.rust || 0) + 2); msg(m.name + "'s weapon rusts!"); }
  if (def.poisons && B.rnd(S, 'combat') < def.poisons && !(m.race === 'dwarf' && B.rnd(S, 'combat') < .5)) { m.status.poison = 60; msg(m.name + ' is poisoned!'); ev('poison', { m: rosterOf(m) }); }
  if (def.steal && B.rnd(S, 'combat') < def.steal && !mon.stolen.length) { const thief = mon; stealFrom(thief, m); }
  return true;
}
/** a Latchkin steals a non-quest pack item and runs; it drops the item when it dies */
function stealFrom(mon, m) {
  const i = m.pack.findIndex(it => it && !['key', 'ward', 'gear', 'note', 'junk'].includes(B.ITEMS[it.id].k));
  if (i < 0) return; const it = m.pack[i]; m.pack[i] = null; mon.stolen.push(it); mon.state = 'flee'; mon.flee = 6;
  msg('A Latchkin snatches ' + B.ITEMS[it.id].name + ' and runs!');
}
/** Party Strike: every member whose main hand is ready strikes, each by the item they carry */
/** the members who strike in a Party Strike now: a ready main hand with an item that can act from their row */
function strikers() {
  return partyList().filter(([m, place]) => {
    if (!handReady(m, 'main')) return false;
    const it = m.slots.main; if (!it) return false;
    const d = B.ITEMS[it.id];
    if (d.k === 'book' || d.k === 'holy') return false;
    if (d.k === 'weapon' && !d.thr && rowOf(place) === 2 && !d.reach) return false;
    return true;
  });
}
/** can a Party Strike happen now (someone can act)? */
const strikeReady = () => strikers().length > 0;
function partyStrike() {
  let n = 0;
  if (!strikeReady()) return false;
  for (const [m, place] of partyList()) {
    if (!handReady(m, 'main')) continue;
    const it = m.slots.main; if (it && ['book', 'holy'].includes(B.ITEMS[it.id].k)) continue;
    if (!it || B.ITEMS[it.id].k === 'weapon' && !B.ITEMS[it.id].thr && rowOf(place) === 2 && !B.ITEMS[it.id].reach) continue;
    if (it && B.ITEMS[it.id].k === 'missile' && handReady(m, 'main')) { if (fireMissile(m, 'main', it, place).ok) n++; continue; }
    if (it && B.ITEMS[it.id].k === 'weapon' && B.ITEMS[it.id].thr) { throwFromHand(m, 'main', it, place); n++; continue; }
    const r = handAct(m, 'main'); if (r.ok) n++;
  }
  if (!n) msg('The front swings at the air.');
  return n > 0;
}
/** projectiles: missiles, thrown items and monster bolts move a cell at a time; they hit the first creature */
function stepProjectiles(dt) {
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const pr = S.proj[i]; pr.t += dt; const step = 1 / pr.speed;
    if (pr.t < step) continue;
    pr.t = 0;
    const nx = pr.cx + DX[pr.dir], ny = pr.cy + DY[pr.dir];
    if (pr.k === 'mbolt' || pr.k === 'bolt' || pr.k === 'spark' || pr.k === 'hold') { /* monster bolts: see monsters */ }
    const mon = monAt(nx, ny);
    if (pr.k === 'mbolt') {
      if (nx === S.party.cx && ny === S.party.cy) { const front = partyList().filter(([m, p]) => rowOf(p) === 0).map(x => x[0]).filter(m => m.state === 'ok'); const m = front[B.rint(S, 'combat', front.length || 1)] || awake()[0]; if (m) hurtMember(m, B.roll(S, 'combat', pr.dmg), 'bolt'); S.proj.splice(i, 1); sfx('bolt'); continue; }
    }
    if (pr.k === 'missile' || pr.k === 'thrown') {
      if (mon) {
        const dd = pr.k === 'missile' ? pr.dex : pr.str; const by = S.party.roster[pr.by];
        const nat = 1 + B.rint(S, 'combat', 20), tot = nat + (by ? classHit(by) : 0) + dd + (pr.hit || 0) + Math.round(B.T.partyHit);
        if (nat === 1 || (nat !== 20 && tot < B.MONS[mon.type].def)) { ev('miss', { mon: mon.id, at: [nx, ny] }); pr.cx = nx; pr.cy = ny; dropProj(pr); S.proj.splice(i, 1); continue; }
        const dmg = pr.k === 'missile' ? B.roll(S, 'combat', pr.dmg) : (B.ITEMS[pr.item.id].dmg ? B.roll(S, 'combat', B.ITEMS[pr.item.id].dmg) + pr.str : B.roll(S, 'combat', '1d2'));
        hitMon(mon, Math.max(1, Math.round(dmg * B.T.partyDmg)), by, { how: 'missile', crit: nat === 20 });
        pr.cx = nx; pr.cy = ny; dropProj(pr); S.proj.splice(i, 1); continue;
      }
    }
    // the next cell: a wall or a shut door stops it; a pit or a plate lets it pass (a plate weighs it)
    if (!passable(nx, ny, 'proj') && !(cellOf(nx, ny) === 'O' || cellOf(nx, ny) === 'o')) { pr.left = 0; }
    else { pr.cx = nx; pr.cy = ny; pr.left--; }
    if (pr.k === 'thrown' && pr.left <= 0) { dropProj(pr); S.proj.splice(i, 1); continue; }
    if (pr.left <= 0) { if (pr.k === 'missile' && pr.item) { placeOnFloorAt(pr.cx, pr.cy, mkItem(pr.item.id, 1)); if (B.rnd(S, 'loot') < .5) { /* recovered */ } } S.proj.splice(i, 1); continue; }
    if (pr.k === 'mbolt' && pr.left <= 0) S.proj.splice(i, 1);
  }
}
/** a thrown item lands on its cell: a plate it lands on is pressed; a pit takes it below */
function dropProj(pr) {
  if (!pr.item) return;
  if (pr.k === 'thrown' && B.ITEMS[pr.item.id].k !== 'weapon' && B.ITEMS[pr.item.id].k !== 'missile') { /* junk and food land as they are */ }
  if (cellOf(pr.cx, pr.cy) === 'O' && !((curFS().pits[idAt(pr.cx, pr.cy)] || {}).bridged)) {
    const k = idAt(pr.cx, pr.cy), pd = (curF().pitTo || {})[k] || { to: 'f3', at: [2, 15, 0] }, lf = S.floors[pd.to];
    (lf.items[key(pd.at[0], pd.at[1])] = lf.items[key(pd.at[0], pd.at[1])] || []).push(pr.item); return;
  }
  placeOnFloorAt(pr.cx, pr.cy, pr.item); settle();
}
/** statuses tick: poison, held, the brace, the party's buffs, the ring of mending */
function statusTick(dt) {
  for (const [m] of partyList()) {
    if (m.state !== 'ok') continue;
    if (m.status.poison !== undefined) { m.status.poison -= dt; m.status.poisonTick = (m.status.poisonTick || 0) + dt; if (m.status.poisonTick >= 6) { m.status.poisonTick = 0; hurtMember(m, 1, 'poison'); } if (m.status.poison <= 0) { delete m.status.poison; msg(m.name + ' is no longer poisoned.'); } }
    if (m.status.held !== undefined) { m.status.held -= dt; if (m.status.held <= 0) delete m.status.held; }
    if (m.status.blessed !== undefined) { m.status.blessed -= dt; if (m.status.blessed <= 0) delete m.status.blessed; }
    m.brace = Math.max(0, (m.brace || 0) - dt);
    for (const h of ['main', 'off']) m.cool[h] = Math.max(0, m.cool[h] - dt);
    if (m.slots.ring1 && B.ITEMS[m.slots.ring1.id].heal) { m.ringT = (m.ringT || 0) + dt; if (m.ringT >= 30) { m.ringT = 0; healMember(m, 1); } }
    if (m.hurtT > 0) m.hurtT = Math.max(0, m.hurtT - dt);
  }
  S.party.steady = Math.max(0, S.party.steady - dt);
  S.party.floating = Math.max(0, S.party.floating - dt);
  S.party.seeing = Math.max(0, S.party.seeing - dt);
  S.party.freeHinge = Math.max(0, S.party.freeHinge - dt);
  S.party.shield = Math.max(0, S.party.shield - dt);
}
