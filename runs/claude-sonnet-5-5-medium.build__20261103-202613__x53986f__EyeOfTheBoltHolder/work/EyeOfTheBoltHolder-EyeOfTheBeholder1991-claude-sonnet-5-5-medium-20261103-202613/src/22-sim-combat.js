/* SIM COMBAT: hands, to-hit, damage, rows, projectiles, monsters and their minds. */
B.diffM = () => ({ easy: { dmg: .7, hp: .8, hun: .5, wan: 1 }, normal: { dmg: 1, hp: 1, hun: 1, wan: 1 }, hard: { dmg: 1.3, hp: 1.25, hun: 1, wan: 2 } }[B.S.diff] || { dmg: 1, hp: 1, hun: 1, wan: 1 });
B.hitBonus = (m) => Math.floor(m.lvl * B.CLASSES[m.cls].hit) + (m.status.blessed > 0 ? 1 : 0) + B.T.hit + (m.race === 'halfling' ? 0 : 0);
B.hurtMember = (m, dmg, src, ignoreDef) => {
  const S = B.S; dmg = Math.max(0, Math.round(dmg)); if (m.state === 'dead' || dmg <= 0) return 0;
  if (B.CHEATS.god) return 0;
  if (m.ward > 0) { const a = Math.min(m.ward, dmg); m.ward -= a; dmg -= a; if (dmg <= 0) { B.ev('absorb', { m: S.party.members.indexOf(m) }); return 0; } }
  const mi = S.party.members.indexOf(m);
  if (m.state === 'down') { m.state = 'dead'; m.hp = 0; S.stats.deaths++; B.ev('death', { m: mi }); B.log(m.name + ' dies.', 'bad'); B.afterHurt(); return dmg; }
  m.hp -= dmg; B.ev('hurt', { m: mi, dmg, src });
  if (m.hp <= 0) { m.hp = 0; m.state = 'down'; B.ev('down', { m: mi }); B.log(m.name + ' falls unconscious!', 'bad'); }
  B.afterHurt(); return dmg;
};
B.afterHurt = () => { const S = B.S; if (!S.over && S.party.members.every(m => m.state !== 'ok')) { S.over = true; B.ev('wipe', {}); } };
B.healMember = (m, n) => { if (m.state === 'dead') return; if (m.state === 'down') { m.state = 'ok'; m.hp = 0; } m.hp = Math.min(m.max, m.hp + Math.max(1, Math.round(n))); B.ev('heal', { m: B.S.party.members.indexOf(m), n }); };
/** where the attacker stands relative to the party's facing: 0 front, 1 right, 2 back, 3 left */
B.relDir = (ax, ay) => { const p = B.S.party; const dx = ax - p.cx, dy = ay - p.cy; const d = dx > 0 && Math.abs(dx) >= Math.abs(dy) ? 1 : dx < 0 && Math.abs(dx) >= Math.abs(dy) ? 3 : dy > 0 ? 2 : 0; return (d - p.dir + 4) % 4; };
B.pickTarget = (rel) => {
  const S = B.S, p = S.party, ok = p.members.map((m, i) => i).filter(i => p.members[i].state === 'ok'); if (!ok.length) return null;
  const posOf = i => p.formation.indexOf(i); let pool = [];
  if (rel === 0 || rel === 2) { const rows = ok.map(i => posOf(i) >> 1); const row = rel === 0 ? Math.min(...rows) : Math.max(...rows); pool = ok.filter(i => (posOf(i) >> 1) === row); }
  else { const col = rel === 3 ? 0 : 1; const c = ok.filter(i => (posOf(i) & 1) === col); if (c.length) { const mn = Math.min(...c.map(posOf)); pool = c.filter(i => posOf(i) === mn); } else pool = ok; }
  return pool[B.int(S, 'combat', pool.length)];
};
/* ---- monsters in cells ---- */
B.freeSlot = (x, y, mon) => { const used = new Set(B.monsAt(x, y).filter(m => m !== mon).map(m => m.slot)); for (let s = 0; s < 4; s++) if (!used.has(s)) return s; return 0; };
B.targetsFront = (reach2) => {
  const p = B.S.party, [fx, fy] = B.front(); let ms = B.monsAt(fx, fy);
  if (!ms.length && reach2) { const nx = fx + B.DX[p.dir], ny = fy + B.DY[p.dir]; if (B.walkable(fx, fy) || B.cell(fx, fy) === '=') ms = B.monsAt(nx, ny); }
  return ms;
};
B.bossAt = (x, y) => B.S.boss && B.S.boss.hp > 0 && B.bossBlocks(x, y);
B.attackRoll = (m, it, kind, def, sleeping) => {
  const S = B.S, r = 1 + B.int(S, 'combat', 20); let b = B.hitBonus(m) + (kind === 'melee' ? B.mod(m.stats.str) : B.mod(m.stats.dex)) + (it && it.bonus || 0);
  if (kind !== 'melee' && m.race === 'halfling' && it && (it.cat === 'sling' || it.cat === 'thrown')) b += 1;
  if (m.cls === 'ranger' && (kind === 'missile') && it && (it.cat === 'bow' || it.cat === 'xbow')) b += 1;
  if (sleeping) b += 4;
  return { r, hit: r === 20 || (r !== 1 && r + b >= def), crit: r === 20 };
};
B.weaponDamage = (m, it, kind, crit, mult) => {
  const S = B.S; const dice = it ? it.dmg : [1, 2]; let n = dice[0] * (crit ? 2 : 1);
  let dmg = B.dice(S, 'combat', n, dice[1], kind === 'melee' || kind === 'thrown' ? Math.round(B.mod(m.stats.str) * (it && it.two ? 1.5 : 1)) : 0);
  return Math.max(1, Math.round(dmg * B.T.dmg * (mult || 1)));
};
B.cmdHand = (mi, h) => {
  const S = B.S, p = S.party, m = p.members[mi]; if (!m || m.state !== 'ok' || S.camp || S.over || p.tween && p.tween.kind === 'fall') return false;
  if (m.status.held > 0 || (S.lockBusy > 0)) return false;
  if (m.cool[h] > 0 && !B.CHEATS.nocool) return false;
  const ref = h === 'main' ? m.slots.main : m.slots.off, it = ref ? B.ITEMS[ref.id] : null, pos = p.formation.indexOf(mi), row = pos >> 1;
  let cd = 1; const mult = B.T.cool * (1 - .04 * B.mod(m.stats.dex));
  if (it && (it.t === 'book' || it.t === 'symbol')) { if (B.casterType(m.cls)) { B.ev('castmenu', { m: mi }); return true; } B.log(m.name + ' cannot cast.'); return false; }
  if (it && it.t === 'wand') { return B.zapWand(m, ref, h); }
  if (it && it.t === 'shield') { m.brace = 2; cd = 1.2; B.ev('brace', { m: mi }); m.cool[h] = cd * mult; return true; }
  if (it && it.t === 'weapon' && it.missile) {
    const q = m.slots.quiver; if (!q || B.ITEMS[q.id].ammo !== it.missile) { B.log(m.name + ' has no ' + it.missile + 's in the quiver.'); B.ev('lockfail', {}); return false; }
    q.n--; if (q.n <= 0) m.slots.quiver = null;
    B.fireProj({ from: 'party', kind: it.missile, mi, it, dmg: null, speed: 8, left: 6, ammo: it.missile, ammoId: q.id, col: '#e8d8a0' });
    cd = it.spd; B.ev('shoot', { m: mi, kind: it.missile }); m.cool[h] = cd * mult; return true;
  }
  if (it && it.t === 'weapon' && it.cat === 'thrown') {
    ref.n--; if (ref.n <= 0) { if (h === 'main') m.slots.main = null; else m.slots.off = null; }
    B.fireProj({ from: 'party', kind: 'dart', mi, it, dmg: null, speed: 8, left: 5, ammoId: 'darts', col: '#d0d0d8', drop: B.ref('darts', { n: 1 }) });
    cd = it.spd; B.ev('shoot', { m: mi, kind: 'dart' }); m.cool[h] = cd * mult; return true;
  }
  // melee
  if (row === 2 || (row === 1 && !(it && it.reach))) { B.log(m.name + ' cannot reach from here.'); B.ev('lockfail', {}); return false; }
  const ms = B.targetsFront(it && it.reach && it.two); const col = pos & 1;
  let tgt = ms.length ? (ms.find(x => (x.slot & 1) === col) || ms[0]) : null; const [fx, fy] = B.front(), bossT = !tgt && (B.bossAt(fx, fy));
  cd = it ? it.spd : .8; const kind = 'melee';
  if (tgt) {
    const def = B.MONS[tgt.type].def, sleeping = tgt.state === 'asleep' || tgt.status.slumber > 0, off = h === 'off' && m.cls !== 'ranger' ? -2 : 0;
    const a = B.attackRoll(m, it, kind, def - off, sleeping);
    if (a.hit) { let mult = (sleeping ? 2 : 1) * (m.cls === 'thief' && (sleeping || tgt.status.held > 0 || !tgt.aware) ? 2 : 1); B.hitMon(tgt, B.weaponDamage(m, it, kind, a.crit, mult), 'melee', m, a); } else { B.ev('miss', { m: mi, h, x: tgt.cx, y: tgt.cy }); }
    B.noise(p.cx, p.cy, 3, true);
  } else if (bossT) {
    const a = B.attackRoll(m, it, kind, B.MONS.boltholder.def, false); if (a.hit) B.hitBoss(B.weaponDamage(m, it, kind, a.crit, 1), 'melee', m, a); else B.ev('miss', { m: mi, h });
  } else { B.ev('swing', { m: mi, h, air: true }); }
  B.ev('swingfx', { m: mi, h, it: it ? it.id : 'fist', cat: it ? it.cat : 'fist' });
  m.cool[h] = cd * mult; return true;
};
B.cmdStrike = () => {
  const S = B.S, p = S.party; if (S.camp || S.over) return false; let any = false;
  for (const mi of p.formation) { const m = p.members[mi]; if (!m || m.state !== 'ok') continue; const ref = m.slots.main, it = ref ? B.ITEMS[ref.id] : null; if (it && (it.t === 'book' || it.t === 'symbol' || it.t === 'wand' || it.t === 'shield')) continue; const row = p.formation.indexOf(mi) >> 1;
    if (row === 2 && !(it && (it.missile || it.cat === 'thrown'))) continue; if (row === 1 && !(it && (it.reach || it.missile || it.cat === 'thrown'))) continue;
    if (m.cool.main > 0 && !B.CHEATS.nocool) continue; if (B.cmdHand(mi, 'main')) any = true; }
  if (any) B.ev('strike', {}); return any;
};
B.hitMon = (mon, dmg, src, member, roll) => {
  const S = B.S; if (mon.hp <= 0) return; if (B.CHEATS.onehit) dmg = 9999; if (mon.status.slumber > 0) delete mon.status.slumber;
  mon.hp -= dmg; mon.hurtT = .25; if (mon.state === 'asleep') B.wake(mon); mon.aware = true; mon.lost = 0;
  B.ev('mhit', { id: mon.id, x: mon.cx, y: mon.cy, dmg, crit: roll && roll.crit, src, slot: mon.slot });
  if (mon.hp <= 0) B.killMon(mon, member);
  else if (B.MONS[mon.type].coward && mon.hp < mon.max * .25 && !mon.fled) { mon.fled = true; mon.state = 'flee'; mon.timer = 6; }
};
B.wake = (mon) => { if (mon.state === 'asleep') { mon.state = 'hunt'; mon.aware = true; B.ev('wake', { id: mon.id, type: mon.type }); } };
B.killMon = (mon, member) => {
  const S = B.S, F = B.F(), t = B.MONS[mon.type]; mon.hp = 0; mon.dieT = 0; mon.state = 'dead'; S.stats.kills++;
  B.ev('mdie', { id: mon.id, type: mon.type, x: mon.cx, y: mon.cy });
  const drops = []; if (mon.stolen) drops.push(mon.stolen); if (mon.carry) drops.push(B.ref(mon.carry));
  for (const [id, ch] of t.drops) if (ch >= 1 || B.rng(S, 'loot') < ch * B.T.loot) drops.push(B.ref(id, B.ITEMS[id].stack ? { n: 4 + B.int(S, 'loot', 6) } : null));
  for (const r of drops) { const k = B.key(mon.cx, mon.cy); (F.items[k] = F.items[k] || []).push(r); }
  const live = S.party.members.filter(m => m.state === 'ok'); const share = t.xp * .85;
  for (const m of live) B.giveXPTo(m, share, 'kill'); if (mon.summoned) S.boss && (S.boss.gazers = Math.max(0, (S.boss.gazers || 0) - 1));
  B.signal('killed:' + mon.type); const grp = B.def().groups; B.checkKillWires();
};
B.checkKillWires = () => {};
/* ---- projectiles ---- */
B.fireProj = (o) => {
  const S = B.S, p = S.party; const q = Object.assign({ cx: p.cx, cy: p.cy, dx: B.DX[p.dir], dy: B.DY[p.dir], t: 0, left: 6, speed: 8, floor: S.floor, fx: p.cx, fy: p.cy }, o);
  S.proj.push(q); return q;
};
B.updateProj = (dt) => {
  const S = B.S, p = S.party;
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const q = S.proj[i]; if (q.floor !== S.floor) { S.proj.splice(i, 1); continue; }
    q.t += dt * q.speed; let done = false;
    while (q.t >= 1 && !done) {
      q.t -= 1; const nx = q.cx + q.dx, ny = q.cy + q.dy; q.fx = q.cx; q.fy = q.cy;
      const c = B.cell(nx, ny);
      if (c === '#' || ((c === '+' || c === 'L' || c === 'M') && !(B.F().doors[B.key(nx, ny)] || {}).open) || (c === '=' && !B.gateOpen(nx, ny) && q.kind !== 'bolt')) { done = true; B.projEnd(q, 'wall'); break; }
      q.cx = nx; q.cy = ny; q.left--;
      if (q.from === 'party') {
        const ms = B.monsAt(nx, ny);
        if (ms.length) { const tg = ms.find(m => m.slot === (q.dx === 0 ? 0 : q.slot)) || ms[0]; done = true; B.projHit(q, tg); break; }
        if (B.bossAt(nx, ny)) { done = true; B.projHitBoss(q); break; }
      } else if (nx === p.cx && ny === p.cy) { done = true; B.projHitParty(q); break; }
      if (q.left <= 0) { done = true; B.projEnd(q, 'range'); break; }
    }
    if (done) S.proj.splice(S.proj.indexOf(q), 1);
  }
};
B.projEnd = (q, why) => { const S = B.S; B.ev('projEnd', { x: q.cx, y: q.cy, kind: q.kind, col: q.col, why }); if (q.from === 'party' && q.ammo && B.rng(S, 'loot') < .5) B.dropAt(q.cx, q.cy, B.ref(q.ammoId, { n: 1 }), S.floor); if (q.drop) B.dropAt(q.cx, q.cy, q.drop, S.floor); };
B.projHit = (q, mon) => {
  const S = B.S, m = S.party.members[q.mi];
  if (q.spell) { B.hitMon(mon, q.dmg, q.spell, m); if (q.spell === 'lightning') { /* chain to a neighbour */ } B.ev('projEnd', { x: q.cx, y: q.cy, kind: q.kind, col: q.col, hit: true }); return; }
  const a = B.attackRoll(m, q.it, 'missile', B.MONS[mon.type].def, mon.state === 'asleep'); if (a.hit) B.hitMon(mon, B.weaponDamage(m, q.it, q.kind === 'dart' ? 'thrown' : 'missile', a.crit, 1), q.kind, m, a); else B.ev('miss', { m: q.mi, x: mon.cx, y: mon.cy, h: 'main' });
  B.projEnd(q, 'hit');
};
B.projHitBoss = (q) => {
  const S = B.S, m = S.party.members[q.mi];
  if (q.spell) { B.spellHitsBoss(q.spell, q.dmg); return; }
  const a = B.attackRoll(m, q.it, 'missile', B.MONS.boltholder.def, false); if (a.hit) B.hitBoss(B.weaponDamage(m, q.it, 'missile', a.crit, 1), 'missile', m, a); else B.ev('miss', { m: q.mi, h: 'main' }); B.projEnd(q, 'hit');
};
B.projHitParty = (q) => {
  const S = B.S, p = S.party, rel = B.relDir(q.cx - q.dx, q.cy - q.dy), mi = B.pickTarget(rel); B.ev('projEnd', { x: q.cx, y: q.cy, kind: q.kind, col: q.col, hit: true });
  if (mi == null) return; const m = p.members[mi]; const dm = q.dmg * B.T.mdmg * B.diffM().dmg;
  if (q.status === 'hold' && !B.heldImmune(m)) { /* sleeping gaze */ }
  B.ev('partyHit', { rel, m: mi }); B.hurtMember(m, dm, q.kind);
};
B.heldImmune = m => m.status.free > 0 || B.hasWardGear(m) || m.ward > 0;
/* ---- monster minds ---- */
B.sightOf = (mon) => B.T.sight + (B.MONS[mon.type].sight - 5);
B.canPass = (mon, x, y) => { const t = B.MONS[mon.type], c = B.cell(x, y); if (c === '#' || c === 'I') return false; if (!B.walkable(x, y)) return false; if ((c === 'O' || c === 'o') && !t.fly) return false; if (c === 'T' && false) return false; const p = B.S.party; if (x === p.cx && y === p.cy) return false; if (B.npcAt(x, y)) return false; if (B.S.boss && B.bossBlocks(x, y)) return false; return B.unitsAt(x, y, mon) + mon.size <= 4; };
B.pathStep = (mon, tx, ty, adjacentOk) => { // BFS from the monster to any cell adjacent to (tx,ty); returns next [x,y] or null
  const d = B.def(); const start = B.key(mon.cx, mon.cy), prev = { [start]: null }, q = [[mon.cx, mon.cy]]; let goal = null, n = 0;
  while (q.length && n++ < 400) {
    const [x, y] = q.shift(); if (Math.abs(x - tx) + Math.abs(y - ty) === 1) { goal = [x, y]; break; }
    for (let k = 0; k < 4; k++) { const nx = x + B.DX[k], ny = y + B.DY[k], kk = B.key(nx, ny); if (kk in prev || !B.canPass(mon, nx, ny)) continue; prev[kk] = [x, y]; q.push([nx, ny]); }
  }
  if (!goal) return null; let cur = goal, p = prev[B.key(cur[0], cur[1])]; if (!p) return null;
  while (p && B.key(p[0], p[1]) !== start) { cur = p; p = prev[B.key(cur[0], cur[1])]; } return cur;
};
B.moveMon = (mon, x, y) => { const t = B.MONS[mon.type]; mon.fx = mon.cx; mon.fy = mon.cy; mon.face = Math.atan2(y - mon.cy, x - mon.cx); mon.cx = x; mon.cy = y; mon.slot = B.freeSlot(x, y, mon); mon.mt = mon.mdur = t.mv * (mon.status.slow > 0 ? 1.5 : 1) * (B.CHEATS.freeze ? 99 : 1); };
B.updateMons = (dt) => {
  const S = B.S, p = S.party, F = B.F(); if (B.CHEATS.freeze) return;
  for (const m of F.mons) {
    if (m.hp <= 0) { m.dieT += dt; continue; }
    const t = B.MONS[m.type]; m.hurtT = Math.max(0, m.hurtT - dt); m.cool = Math.max(0, m.cool - dt); if (m.mt > 0) m.mt = Math.max(0, m.mt - dt);
    for (const k in m.status) { m.status[k] -= dt; if (m.status[k] <= 0) delete m.status[k]; }
    if (m.status.held > 0 || m.state === 'asleep') continue;
    const dist = Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy), adj = dist === 1;
    // awareness
    if (!m.aware && m.state === 'idle' && dist <= B.sightOf(m) && B.los(m.cx, m.cy, p.cx, p.cy)) { m.aware = true; m.state = 'hunt'; B.ev('aware', { id: m.id, type: m.type }); B.groupAlert(m); }
    if (m.aware && m.state !== 'flee') { if (dist <= B.sightOf(m) + 3 && B.los(m.cx, m.cy, p.cx, p.cy)) m.lost = 0; else { m.lost += dt; if (m.lost > 12) { m.aware = false; m.state = 'idle'; } } }
    if (m.state === 'flee') { m.timer -= dt; if (m.timer <= 0) { m.state = m.aware ? 'hunt' : 'idle'; } else if (m.mt <= 0) { let best = null, bd = -1; for (let k = 0; k < 4; k++) { const nx = m.cx + B.DX[k], ny = m.cy + B.DY[k]; if (!B.canPass(m, nx, ny)) continue; const dd = Math.abs(nx - p.cx) + Math.abs(ny - p.cy); if (dd > bd) { bd = dd; best = [nx, ny]; } } if (best && bd > dist) B.moveMon(m, best[0], best[1]); } continue; }
    if (m.state === 'wind') { m.timer -= dt; if (m.timer <= 0) B.resolveAttack(m); continue; }
    if (m.state === 'idle') { m.pathT -= dt; if (m.pathT <= 0 && m.mt <= 0) { m.pathT = 3 + B.int(S, 'ai', 4); const k = B.int(S, 'ai', 4), nx = m.cx + B.DX[k], ny = m.cy + B.DY[k]; if (Math.abs(nx - m.home[0]) + Math.abs(ny - m.home[1]) <= 2 && B.canPass(m, nx, ny)) B.moveMon(m, nx, ny); } continue; }
    if (m.state === 'hunt') {
      if (m.mt > 0) continue;
      if (t.mind === 'caster') { // keep away, shoot along a clear line
        const aligned = (m.cx === p.cx || m.cy === p.cy) && B.los(m.cx, m.cy, p.cx, p.cy) && dist <= 7;
        if (aligned && m.cool <= 0) { m.state = 'wind'; m.timer = t.wind * B.T.wind / .5; m.cool = 0; B.ev('windup', { id: m.id, type: m.type, caster: true }); continue; }
        if (dist < 3) { let best = null, bd = dist; for (let k = 0; k < 4; k++) { const nx = m.cx + B.DX[k], ny = m.cy + B.DY[k]; if (B.canPass(m, nx, ny)) { const dd = Math.abs(nx - p.cx) + Math.abs(ny - p.cy); if (dd > bd) { bd = dd; best = [nx, ny]; } } } if (best) { B.moveMon(m, best[0], best[1]); continue; } }
        if (!aligned) { const nx = B.pathStepAlign(m); if (nx) { B.moveMon(m, nx[0], nx[1]); continue; } }
        continue;
      }
      if (adj) { if (m.cool <= 0) { m.state = 'wind'; m.timer = t.wind * B.T.wind / .5; B.ev('windup', { id: m.id, type: m.type }); } continue; }
      const nx = B.pathStep(m, p.cx, p.cy); if (nx) B.moveMon(m, nx[0], nx[1]);
    }
  }
};
B.pathStepAlign = (m) => { const p = B.S.party; let best = null, bd = 99; for (let k = 0; k < 4; k++) { const nx = m.cx + B.DX[k], ny = m.cy + B.DY[k]; if (!B.canPass(m, nx, ny)) continue; const dd = Math.min(Math.abs(nx - p.cx), Math.abs(ny - p.cy)) * 3 + Math.abs(nx - p.cx) + Math.abs(ny - p.cy) * 0; if (dd < bd) { bd = dd; best = [nx, ny]; } } return best; };
B.groupAlert = (m) => { for (const o of B.F().mons) if (o !== m && o.hp > 0 && o.state === 'idle' && Math.abs(o.cx - m.cx) + Math.abs(o.cy - m.cy) <= 3) { o.aware = true; o.state = 'hunt'; } };
B.resolveAttack = (m) => {
  const S = B.S, p = S.party, t = B.MONS[m.type]; m.state = 'hunt'; m.cool = t.int * B.T.mint;
  if (t.mind === 'caster') { // fire a bolt along the line toward the party if still aligned
    const dx = Math.sign(p.cx - m.cx), dy = Math.sign(p.cy - m.cy); if ((m.cx === p.cx || m.cy === p.cy) && (dx || dy)) { B.fireProj({ from: 'mon', kind: 'bolt', cx: m.cx, cy: m.cy, fx: m.cx, fy: m.cy, dx, dy, speed: 5, left: 9, dmg: B.dice(S, 'combat', t.dmg[0], t.dmg[1], t.dmg[2]), col: m.type === 'gazer' ? '#e8c040' : '#6af0ff' }); B.ev('mshoot', { id: m.id, type: m.type }); } return;
  }
  const dist = Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy);
  if (dist !== 1) { B.ev('snap', { id: m.id, type: m.type, x: m.cx, y: m.cy }); B.log('The ' + t.n.toLowerCase().replace('the ', '') + '\'s ' + (m.type === 'rat' ? 'bite' : 'blow') + ' snaps on air.'); return; }
  const rel = B.relDir(m.cx, m.cy), mi = B.pickTarget(rel); if (mi == null) return; const mem = p.members[mi];
  const r = 1 + B.int(S, 'combat', 20), def = B.defense(mem);
  B.ev('mattack', { id: m.id, type: m.type, rel, x: m.cx, y: m.cy }); S.lastHitRel = rel;
  if (r === 20 || (r !== 1 && r + t.atk >= def)) {
    const dm = B.dice(S, 'combat', t.dmg[0], t.dmg[1], t.dmg[2]) * B.T.mdmg * B.diffM().dmg; B.ev('partyHit', { rel, m: mi, type: m.type });
    B.hurtMember(mem, dm, m.type);
    if (t.poison && B.rng(S, 'combat') < t.poison && !(mem.race === 'dwarf' && B.rng(S, 'combat') < .5)) { mem.status.poison = 60; B.log(mem.name + ' is poisoned!', 'bad'); }
    if (t.rust && mem.slots.main && B.ITEMS[mem.slots.main.id].t === 'weapon') { mem.slots.main.rust = Math.min(4, (mem.slots.main.rust || 0) + 2); B.log(mem.name + '\'s weapon rusts.', 'bad'); }
    if (t.thief) { const cands = []; mem.pack.forEach((r2, i) => { if (r2 && !B.ITEMS[r2.id].key) cands.push(i); }); if (cands.length && !m.stolen) { const i = cands[B.int(S, 'combat', cands.length)]; m.stolen = mem.pack[i]; mem.pack[i] = null; B.log('The Latchkin snatches ' + B.ITEMS[m.stolen.id].n + '!', 'bad'); m.state = 'flee'; m.timer = 8; } }
  } else B.ev('mmiss', { id: m.id, type: m.type, m: mi });
};
/** party cell changed: monsters next to us wait a moment before winding up again */
B.reengage = () => { for (const m of B.F().mons) if (m.hp > 0 && m.state === 'hunt') m.cool = Math.max(m.cool, B.T.reeng); };
