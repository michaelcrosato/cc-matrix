/* =====================================================================================
 * 25-sim-combat: every hand is an action. To-hit and damage, cooldowns, rows and reach, missiles and thrown things as
 * projectiles cell by cell, Party Strike, the formation taking blows by side, Down and Dead, healing
 * ===================================================================================== */
/** the class's to-hit bonus at a level */
B.toHitBase = m => { const c = B.CLASSES[m.cls]; return Math.floor(c.hitK * m.lvl) + (c.extra || 0); };
/** a member's Defense: 10 + armour + shield + DEX + worn bonuses + bracing + a ward */
function memberDef(m) {
  let d = 10 + statMod(effStat(m, 'dex'));
  for (const s of SLOT_NAMES) { const it = m.slots[s]; if (!it) continue; const D = IT(it.id); if (s === 'main' && D.kind !== 'shield') continue; if (s === 'off' && D.kind !== 'shield') continue; d += (D.def || 0) - (s === 'body' ? (it.corrode || 0) : 0); }
  if (m.status.brace > 0) d += 3;
  if (m.ward > 0) d += 3;
  return d;
}
B.memberDef = memberDef;
const saveBonus = m => (B.wears(m, 'ringOfWarding') ? 1 : 0) + (S.party.steady > 0 ? 1 : 0);
/** a saving throw: d20 >= 15 - level/2 - the stat's modifier */
function save(m, stat = 'wis') { return dice(1, 20) + Math.floor(m.lvl / 2) + statMod(effStat(m, stat)) + saveBonus(m) >= 15; }
B.save = save;
/** a hand's cooldown after an act: the item's speed x the tuning x DEX x boots */
function setCool(m, h, secs) {
  const q = B.wears(m, 'quickstepBoots') ? .9 : 1;
  const c = B.CHEATS.noCooldowns ? .05 : Math.max(.2, secs * B.T.atkCool * (1 - .04 * statMod(effStat(m, 'dex'))) * q);
  m.cool[h] = c; m.coolMax[h] = c;
}
B.setCool = setCool;
/** the first living monster down the facing line within n cells (a clear way), with its cell: { mon, x, y, d } */
function lineTarget(n = 6) {
  const P = S.party; let x = P.cx, y = P.cy;
  for (let k = 1; k <= n; k++) {
    x += DX[P.dir]; y += DY[P.dir];
    if (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === x && S.boss.cy === y) return { boss: true, x, y, d: k };
    const ms = monsAt(x, y); if (ms.length) return { mon: ms[0], x, y, d: k };
    if (wallAt(x, y)) return null; const d = doorAt(x, y); if (d && !doorPass(d)) return null;
  }
  return null;
}
B.lineTarget = lineTarget;
/** the monster ahead a member's blow lands on: the one nearest the member's column */
function frontTarget(mi) {
  const [fx, fy] = B.front();
  if (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === fx && S.boss.cy === fy) return { boss: true };
  const ms = monsAt(fx, fy); if (!ms.length) return null;
  const col = colOf(mi), P = S.party, right = [(P.dir + 1) % 4];
  // a slot's side as the party sees it: quadrants 0 NW 1 NE 2 SW 3 SE; halves 0 W/N 1 E/S
  const sideOf = m => { const T = B.MON(m.type); if (T.size === 'L') return .5; const sx = T.size === 'M' ? (m.slot ? 1 : -1) : (m.slot % 2 ? 1 : -1), sy = T.size === 'M' ? (m.slot ? 1 : -1) : (m.slot > 1 ? 1 : -1); const rx = DX[right[0]], ry = DY[right[0]]; return (sx * rx + sy * ry) > 0 ? 1 : 0; };
  ms.sort((a, b) => Math.abs(sideOf(a) - col) - Math.abs(sideOf(b) - col));
  return { mon: ms[0] };
}
/** the item's kind of act from a hand */
function handKind(it) {
  if (!it) return 'fist';
  const d = IT(it.id);
  if (d.kind === 'missile') return 'missile';
  if (d.kind === 'weapon') return d.stack ? 'throwStack' : 'melee';
  if (d.kind === 'book' || d.kind === 'symbol') return 'cast';
  if (d.kind === 'wand') return 'wand';
  if (d.kind === 'shield') return 'brace';
  return 'junk';
}
B.handKind = handKind;
const canMeleeFrom = (mi, it) => { const r = rowOf(mi); return r === 0 || (r === 1 && it && IT(it.id).reach); };
/** use one hand (R2 / L2, 1-6, a click on a hand slot). Returns what happened: 'cast' asks the UI for the spell menu */
function handAct(mi, h = 'main', o = {}) {
  const m = MEM(mi); if (!canAct(m) || m.cool[h] > 0 || S.party.busy) return null;
  const it = m.slots[h], kind = handKind(it), P = S.party;
  if (h === 'off' && m.slots.main && IT(m.slots.main.id).two) return null;
  m.fx.act = .35; m.fx.actH = h;
  switch (kind) {
    case 'cast': return 'cast';
    case 'wand': B.zap(m, it, () => { m.slots[h] = null; }); setCool(m, h, 1.5); return 'wand';
    case 'brace': m.status.brace = 2; setCool(m, h, 2.5); say('m_brace', { name: m.name }, { rate: 1 }); ev('brace', { m: mi }); return 'brace';
    case 'missile': return fireMissile(m, mi, h, it) ? 'fire' : null;
    case 'throwStack': {
      if (canMeleeFrom(mi, it) && frontTarget(mi)) return melee(m, mi, h, it);
      if (!lineTarget(6) && !o.force) { if (rowOf(mi) === 0) return melee(m, mi, h, it); say('m_noTarget', null, { rate: 1 }); return null; }
      const one = { id: it.id, uid: ++S.uid, n: 1 }; if (it.n > 1) it.n--; else m.slots[h] = null;
      throwItem(m, mi, one); setCool(m, h, IT(it.id).speed); return 'throw';
    }
    case 'melee': case 'fist': case 'junk': {
      if (it && IT(it.id).thrown && rowOf(mi) > 0 && !(rowOf(mi) === 1 && IT(it.id).reach)) {
        if (!lineTarget(6)) { say('m_reach', { name: m.name }, { rate: 1.5 }); return null; }
        m.slots[h] = null; throwItem(m, mi, it); setCool(m, h, IT(it.id).speed); return 'throw';
      }
      if (!canMeleeFrom(mi, it)) { say('m_reach', { name: m.name }, { rate: 1.5 }); return null; }
      return melee(m, mi, h, it);
    }
  }
  return null;
}
B.handAct = handAct;
function throwItem(m, mi, it) {
  const d = IT(it.id), str = effStat(m, 'str');
  B.launch({ kind: 'item', item: it, dmg: [d.dmg[0], d.dmg[1], d.dmg[2] + statMod(str) - (it.rust || 0) * 2], by: mi, range: B.T.throwRange + (str >= 16 ? 1 : 0) + 2, speed: 8,
    hitBonus: B.toHitBase(m) + statMod(str) + (d.hit || 0) + (B.RACES[m.race].toss || 0) + B.T.partyHit + (S.party.steady > 0 ? 1 : 0) });
  ev('swing', { m: mi, fam: 'throw' }); ev('sfx', { id: 'throw' });
}
function fireMissile(m, mi, h, it) {
  const d = IT(it.id), q = m.slots.quiver;
  if (!q || q.id !== d.ammo || !(q.n > 0)) { say('m_noAmmo', { name: m.name }, { rate: 1.5 }); return false; }
  if (--q.n <= 0) m.slots.quiver = null;
  const bonus = B.toHitBase(m) + statMod(effStat(m, 'dex')) + (d.hit || 0) + B.T.partyHit + (S.party.steady > 0 ? 1 : 0) + (m.cls === 'R' && d.ammo !== 'slingStones' ? 1 : 0) + (d.ammo === 'slingStones' ? B.RACES[m.race].toss || 0 : 0);
  B.launch({ kind: 'missile', item: { id: d.ammo, uid: ++S.uid, n: 1 }, dmg: d.dmg.slice(), by: mi, range: 6, speed: 8, hitBonus: bonus, recover: .5 });
  setCool(m, h, d.speed); ev('swing', { m: mi, fam: d.ammo === 'bolts' ? 'xbow' : d.ammo === 'arrows' ? 'bow' : 'sling' }); ev('sfx', { id: d.ammo === 'bolts' ? 'xbow' : d.ammo === 'arrows' ? 'bow' : 'sling' });
  noise(S.party.cx, S.party.cy, 3);
  return true;
}
/** a melee blow at what stands ahead */
function melee(m, mi, h, it) {
  const d = it ? IT(it.id) : null, t = frontTarget(mi);
  const fam = !it ? 'fist' : d.model === 'axe' ? 'axe' : d.blunt ? 'blunt' : d.reach ? 'spear' : d.kind === 'weapon' ? 'blade' : 'fist';
  setCool(m, h, it && d.kind === 'weapon' ? d.speed : 1.0);
  ev('swing', { m: mi, fam, h });
  if (!t) { say('m_air', { name: m.name }, { rate: 1.2 }); ev('sfx', { id: 'whiff' }); m.cool[h] = Math.min(m.cool[h], .6); return 'air'; }
  noise(S.party.cx, S.party.cy, 4);
  const dmgD = it && d.kind === 'weapon' ? d.dmg : [1, 2, 0];
  const str = statMod(effStat(m, 'str'));
  const bonus = B.toHitBase(m) + str + (it && d.hit || 0) + B.T.partyHit + (S.party.steady > 0 ? 1 : 0) + (h === 'off' && m.cls !== 'R' ? -2 : 0);
  const two = it && d.two ? 1.5 : 1;
  const r = dice(1, 20);
  const target = t.boss ? S.boss : t.mon, def = t.boss ? 15 : B.MON(target.type).def;
  if (r === 1 || (r !== 20 && r + bonus < def)) { m.fx.miss = .6; m.pop = { n: 'MISS', t: .8, c: '#c8c0b0' }; ev('miss', { m: mi }); ev('sfx', { id: 'whiff' }); return 'miss'; }
  let dmg = (r === 20 ? dice(dmgD[0] * 2, dmgD[1], dmgD[2]) : dice(...dmgD)) + str;
  dmg = dmg * two - (it && it.rust ? it.rust * 2 : 0);
  const back = m.cls === 'T' && !t.boss && (target.st === 'asleep' || target.status.sleep > 0 || target.status.held > 0 || !target.aware) ? 2 : 1;
  dmg = Math.max(1, Math.round(dmg * back * B.T.partyDmg));
  if (t.boss) B.hurtBoss(dmg, { kind: 'phys', blunt: d && d.blunt, by: mi, crit: r === 20 });
  else hurtMon(target, dmg, { kind: 'phys', blunt: d && d.blunt, by: mi, crit: r === 20, vsC: d && d.vsConstruct });
  return 'hit';
}
/** Party Strike (□, Space, a right click): every ready main hand that can act from its row acts at once */
function strike() {
  if (S.party.busy) return 0;
  let n = 0;
  const ahead = !!frontTarget(0), line = !!lineTarget(6);
  for (let p = 0; p < 6; p++) {
    const mi = S.party.form[p]; if (mi < 0) continue; const m = MEM(mi);
    if (!canAct(m) || m.cool.main > 0) continue;
    const it = m.slots.main, k = handKind(it);
    if (k === 'cast' || k === 'wand' || k === 'brace') continue;
    if (k === 'missile') { if (line || !ahead && rowOf(mi) > 0) { if (fireMissile(m, mi, 'main', it)) n++; } continue; }
    if (ahead && canMeleeFrom(mi, it)) { m.fx.act = .35; m.fx.actH = 'main'; melee(m, mi, 'main', it); n++; continue; }
    if ((k === 'throwStack' || (it && IT(it.id).thrown)) && line && rowOf(mi) > 0) { if (handAct(mi, 'main')) n++; continue; }
  }
  if (!n && !ahead) { const fr = rowMembers(0)[0]; if (fr) { ev('swing', { m: S.party.members.indexOf(fr), fam: 'blade' }); say('m_air', { name: fr.name }, { rate: 1.2 }); ev('sfx', { id: 'whiff' }); fr.cool.main = Math.max(fr.cool.main, .5); fr.coolMax.main = .5; } }
  return n;
}
B.strike = strike;

/* ---- projectiles: { kind, x, y, dir, u (0..1 to the next cell), n (cells gone), range, speed, dmg, by, item, team } ---- */
B.launch = o => {
  const P = S.party;
  const p = Object.assign({ x: P.cx, y: P.cy, dir: P.dir, u: 0, n: 0, team: 'party', id: ++S.uid }, o);
  S.proj.push(p); return p;
};
function projStep(dt) {
  const P = S.party;
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const p = S.proj[i]; p.u += p.speed * dt;
    let done = false;
    while (p.u >= 1 && !done) {
      p.u -= 1;
      const nx = p.x + DX[p.dir], ny = p.y + DY[p.dir];
      const blocked = wallAt(nx, ny) || (() => { const d = doorAt(nx, ny); return d && (d.kind === 'illusion' || !doorPass(d)); })();
      if (p.team === 'party') {
        const boss = S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === nx && S.boss.cy === ny;
        const ms = boss ? [] : monsAt(nx, ny);
        if (!blocked && (ms.length || boss)) { projHit(p, ms, boss, nx, ny); land(p, nx, ny, true); done = true; break; }
        if (blocked) { land(p, p.x, p.y, false); done = true; break; }
        p.x = nx; p.y = ny; p.n++;
        if (p.n >= p.range) { land(p, nx, ny, false); done = true; }
      } else {
        if (nx === P.cx && ny === P.cy) { monProjHit(p); done = true; break; }
        if (blocked || ++p.n > p.range) { ev('fizzle', { x: p.x, y: p.y, kind: p.kind }); done = true; break; }
        p.x = nx; p.y = ny;
      }
    }
    if (done) S.proj.splice(i, 1);
  }
}
B.projStep = projStep;
/** what a party projectile does to the monster it reaches */
function projHit(p, ms, boss, x, y) {
  if (p.spell) { B.spellHit(p, ms, boss, x, y); return; }
  const t = boss ? S.boss : (() => { const by = MEM(p.by), col = by ? colOf(p.by) : 0; return ms.sort((a, b) => (a.slot % 2 === col ? -1 : 1) - (b.slot % 2 === col ? -1 : 1))[0]; })();
  const def = boss ? 15 : B.MON(t.type).def, r = dice(1, 20);
  if (r === 1 || (r !== 20 && r + (p.hitBonus || 0) < def)) { ev('projMiss', { x, y }); return; }
  let dmg = r === 20 ? dice(p.dmg[0] * 2, p.dmg[1], p.dmg[2]) : dice(...p.dmg);
  dmg = Math.max(1, Math.round(dmg * B.T.partyDmg));
  if (boss) B.hurtBoss(dmg, { kind: 'phys', by: p.by }); else hurtMon(t, dmg, { kind: 'phys', by: p.by, crit: r === 20 });
}
/** a thrown item lands (it stays where it stopped; spent ammo comes back half the time) */
function land(p, x, y, hit) {
  if (!p.item) { if (p.kind === 'orb' && !hit) B.burst(p, x, y); else if (!hit) ev('fizzle', { x, y, kind: p.kind }); return; }
  if (p.recover && rnd('loot') >= p.recover) return;
  if (pitOpen(x, y) && B.FLOORS[S.floor].fall) { const F = B.FLOORS[S.floor]; if (!S.floors[F.fall.to]) initFloor(F.fall.to); addItem(S.floors[F.fall.to], F.fall.at[0], F.fall.at[1], p.item); ev('drop', { x, y, pit: true }); return; }
  addItem(FL(), x, y, p.item); ev('land', { x, y, item: p.item.id });
}
/** a monster's bolt reaches the party: the side it came from takes it */
function monProjHit(p) {
  const P = S.party, side = relSide(P.dir, P.cx, P.cy, p.x, p.y);
  if (p.kind === 'mbolt' || p.kind === 'gaze') { const ts = pickTargets(side, 1); for (const m of ts) hurtMember(m, Math.round(dice(...p.dmg, 'ai') * B.T.monDmg * B.diff().monDmg), { side, src: p.kind }); ev('boltHit', { side }); }
}
/** the members a blow from a side can reach: front, the front-most row; left and right, that column front first; back,
 *  the back-most row */
function pickTargets(side, n = 1) {
  const out = [], take = list => { const pool = list.filter(m => up(m) && !out.includes(m)); while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rnd('ai') * pool.length), 1)[0]); };
  const rows = [0, 1, 2].map(r => rowMembers(r));
  if (side === 0) { for (const r of rows) if (r.length) { take(r); break; } }
  else if (side === 2) { for (const r of rows.slice().reverse()) if (r.length) { take(r); break; } }
  else { const col = side === 1 ? 1 : 0; for (let r = 0; r < 3; r++) { const m = atPlace(r * 2 + col); if (up(m)) { take([m]); break; } } }
  if (out.length < n) take(alive());
  return out;
}
B.pickTargets = pickTargets;
/** a member takes harm (a ward soaks it first; at 0 a member is Down; Down and hit again, Dead) */
function hurtMember(m, dmg, o = {}) {
  if (!m || m.state === 'dead') return;
  if (B.CHEATS.god || S.mode === 'demo') { m.fx.hurt = .3; ev('hurt', { m: S.party.members.indexOf(m), n: 0, side: o.side }); return; }
  if (m.ward > 0 && dmg > 0) { const a = Math.min(m.ward, dmg); m.ward -= a; dmg -= a; if (m.ward <= 0) m.ward = 0; if (!dmg) { m.pop = { n: 'WARD', t: .8, c: '#ffd36a' }; return; } }
  const mi = S.party.members.indexOf(m);
  if (m.state === 'down') { m.state = 'dead'; m.hp = 0; say('m_dead', { name: m.name }, { c: '#ff6a5a' }); S.stats.deaths++; ev('dead', { m: mi }); checkWipe(); return; }
  m.hp -= dmg; m.fx.hurt = .5; m.pop = { n: dmg, t: .9, c: '#ff5a4a' };
  ev('hurt', { m: mi, n: dmg, side: o.side === undefined ? null : o.side, src: o.src });
  if (m.hp <= 0) { m.hp = 0; m.state = 'down'; delete m.status.held; say('m_down', { name: m.name }, { c: '#ff8a6a' }); S.stats.downs++; ev('down', { m: mi }); checkWipe(); }
}
B.hurtMember = hurtMember;
function checkWipe() { if (!alive().length && !S.over) { S.over = true; ev('wipe', {}); if (S.race) B.raceWipe(); } }
B.healMember = (m, n, wake = false) => {
  if (!m || m.state === 'dead') return 0;
  if (m.state === 'down') { if (!wake && n <= 0) return 0; m.state = 'ok'; m.hp = 0; say('m_wakeUp', { name: m.name }); }
  const before = m.hp; m.hp = Math.min(m.max, m.hp + Math.max(1, Math.round(n))); m.fx.heal = .6; m.pop = { n: '+' + (m.hp - before), t: .9, c: '#6aff8a' };
  ev('heal', { m: S.party.members.indexOf(m), n: m.hp - before });
  return m.hp - before;
};
/** a monster takes harm. kind: phys, fire, cold, shock, holy */
function hurtMon(mon, dmg, o = {}) {
  if (mon.hp <= 0) return;
  const T = B.MON(mon.type);
  if (o.blunt && T.blunt) dmg *= T.blunt;
  if (o.blunt && T.bluntHalf) dmg *= .5;
  if (o.kind === 'shock' && T.shock) dmg *= T.shock;
  if (o.vsC && T.construct) dmg *= o.vsC;
  if (mon.status.sleep > 0 || mon.st === 'asleep') dmg *= mon.status.sleep > 0 ? 2 : 1;
  if (B.CHEATS.oneHit) dmg = mon.hp;
  dmg = Math.max(1, Math.round(dmg));
  mon.hp -= dmg; mon.flash = .18;
  if (mon.status.sleep > 0) delete mon.status.sleep;
  if (mon.st === 'asleep') mon.st = 'hunt';
  mon.aware = true; mon.lost = 0;
  ev('monHurt', { uid: mon.uid, n: dmg, crit: !!o.crit, kind: o.kind, x: mon.cx, y: mon.cy });
  if (mon.half && !mon.halfDone && mon.hp > 0 && mon.hp <= mon.max / 2) { mon.halfDone = true; if (mon.half.bark) bark(mon.half.bark); if (mon.half.spawn) { const [ty, at, n] = mon.half.spawn; act(['spawn', ty, at, n]); } }
  if (mon.hp <= 0) killMon(mon, o.by);
  else if (T.coward && mon.hp < mon.max * .25 && !mon.flee) { mon.flee = 6; say('m_flee', { mon: T.name }); }
}
B.hurtMon = hurtMon;
function killMon(mon, by) {
  const T = B.MON(mon.type), fl = FL();
  mon.hp = 0; mon.dead = .001; mon.wind = 0;
  S.stats.kills++;
  say(T.named ? 'm_killNamed' : 'm_kill', { mon: T.named ? T.name : T.name }, { c: T.named ? '#ffd36a' : null });
  ev('monDie', { uid: mon.uid, x: mon.cx, y: mon.cy, type: mon.type });
  if (mon.death) bark(mon.death);
  // experience, split among the conscious
  const ok = alive(); if (ok.length) for (const m of ok) B.gainXp(m, T.xp / ok.length);
  // drops: a named monster's, what a thief stole, a roll on the table
  const drops = [];
  for (const id of mon.drop || T.fixed || []) drops.push(mkItem(id));
  for (const it of mon.stole) drops.push(it);
  for (const [p, id, n] of T.drops || []) if (rnd('loot') < p * B.T.loot) drops.push(mkItem(id, n));
  for (const it of drops) addItem(fl, mon.cx, mon.cy, it);
  if (drops.length) ev('appear', { x: mon.cx, y: mon.cy });
  if (S.race) { S.race.kills++; S.race.score += 10; B.raceCheck(); }
  if (mon.id) trigger('killed', { id: mon.id });
}
B.killMon = killMon;
