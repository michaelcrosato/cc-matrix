/* =====================================================================================
 * 27-sim-magic: Vancian magic. Mages cast from the spellbook, clerics (and paladins from level 3) from a holy symbol in
 * a hand; each cast spends a prepared slot (refilled by a full rest) and puts both hands on cooldown. Scrolls and wands
 * cast too. Every effect is x the Spell power slider
 * ===================================================================================== */
const SPELL_TAKES = { M: 'book', C: 'symbol', P: 'symbol' };
/** may this member cast now (the right item in a hand, conscious, free, hands ready) */
function canCast(m) {
  if (!canAct(m) || !B.isCaster(m)) return false;
  const need = SPELL_TAKES[m.cls];
  return ['main', 'off'].some(h => m.slots[h] && IT(m.slots[h].id).kind === need);
}
B.canCast = canCast;
/** the prepared spells still ready: { id: count } */
B.readySpells = m => { const o = {}; for (let L = 1; L <= 3; L++) m.mem[L].forEach((id, i) => { if (!m.spent[L][i] || B.CHEATS.infiniteSpells) o[id] = (o[id] || 0) + 1; }); return o; };
/** cast a prepared spell: { m, spell, target } (target: a member index for member and dead spells) */
function castCmd(mi, id, tgt = {}) {
  const m = MEM(mi); if (!m) return false;
  if (id === 'layOnHands') return layOnHands(m, tgt);
  if (!canCast(m)) { say('m_cantCast', { name: m.name }); return false; }
  const sp = B.SP(id), L = sp.lvl, j = m.mem[L].findIndex((s, i) => s === id && (!m.spent[L][i] || B.CHEATS.infiniteSpells));
  if (j < 0) { say('m_noSlots', { name: m.name }); return false; }
  if (spellEffect(m, id, tgt, 1) === false) return false;
  if (!B.CHEATS.infiniteSpells) m.spent[L][j] = true;
  setCool(m, 'main', 2.5); setCool(m, 'off', 2.5); m.coolMax.main = m.coolMax.off = m.cool.main;
  m.fx.act = .5;
  return true;
}
B.castCmd = castCmd;
function layOnHands(m, tgt) {
  if (m.cls !== 'P' || !canAct(m) || !m.layOnHands) return false;
  const t = MEM(tgt.target); if (!t || t.state === 'dead') return false;
  m.layOnHands = 0; B.healMember(t, 2 * m.lvl, true); say('m_layHands', { name: m.name }); ev('spell', { id: 'mend', m: S.party.members.indexOf(m), t: tgt.target });
  return true;
}
/** zap a wand: its spell at its power; a charge spent */
B.zap = (m, it, gone) => {
  const d = IT(it.id); if ((it.ch || 0) <= 0) { say('m_wandEmpty', { item: d.name }); return false; }
  if (spellEffect(m, d.spell, {}, 1, d.power) === false) return false;
  it.ch--; say('m_wand', { name: m.name, item: d.name }); ev('sfx', { id: 'wand' });
  if (it.ch <= 0) say('m_wandEmpty', { item: d.name });
  return true;
};
/** a spell's effect. power: an overriding caster level (a wand's); returns false when it had nothing to act on */
function spellEffect(m, id, tgt = {}, k = 1, power) {
  const P = S.party, lvl = power || m.lvl, SPW = B.T.spellPower * k, sp = B.SP(id), mi = S.party.members.indexOf(m);
  const tm = tgt.target !== undefined ? MEM(tgt.target) : null;
  const [fx, fy] = B.front(), frontMons = monsAt(fx, fy), bossFront = S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === fx && S.boss.cy === fy;
  const told = () => { say(sp.arc ? 'm_cast' : 'm_pray', { name: m.name, spell: sp.name }); ev('spell', { id, m: mi, t: tgt.target }); ev('swing', { m: mi, fam: 'cast', color: sp.color }); };
  switch (id) {
    case 'sparkDart': {
      const n = power ? power : Math.min(3, 1 + Math.floor(lvl / 2)); told();
      for (let i = 0; i < n; i++) B.launch({ kind: 'spark', spell: id, dmg: [1, 4, 1], speed: 6, range: 6, u: -i * .25, by: mi, k: SPW, color: sp.color });
      noise(P.cx, P.cy, 4); return true;
    }
    case 'wardOfBrass': { const t = tm || m; if (t.state !== 'ok') return false; told(); t.ward = Math.round((8 + lvl) * SPW); say('m_ward', { name: t.name }); return true; }
    case 'findSeams': told(); P.seeing = 90 * SPW; say('m_seams'); return true;
    case 'slumber': {
      if (!frontMons.length) { say('m_noTarget'); return false; }
      told(); let pool = Math.round((10 + 3 * lvl) * SPW);
      for (const mo of frontMons.slice().sort((a, b) => a.hp - b.hp)) { const T = B.MON(mo.type); if (T.size === 'L' || !T.living || T.boss) continue; if (mo.hp > pool) break; pool -= mo.hp; mo.status.sleep = 20; mo.wind = 0; say('m_sleep', { mon: T.name }); ev('status', { uid: mo.uid, k: 'sleep' }); }
      return true;
    }
    case 'unlatch': {
      const d = doorAt(fx, fy), st = d && FL().doors[d.id];
      if (!d || !(d.kind === 'seal' || (d.lk === 'simple' && st.locked)) || st.want) { say('m_noUnlatch'); return false; }
      told(); st.locked = false; st.want = 1; say(d.kind === 'seal' ? 'm_runes' : 'm_door'); ev('door', { id: d.id, open: 1, kind: d.kind, x: d.x, y: d.y }); ev('unlatch', { x: fx, y: fy }); return true;
    }
    case 'frostbite': {
      if (!frontMons.length && !bossFront) { say('m_noTarget'); return false; }
      told(); ev('frost', { x: fx, y: fy });
      for (const mo of frontMons) { hurtMon(mo, dice(2, 6) * SPW, { kind: 'cold', by: mi }); if (mo.hp > 0) { mo.status.slow = 10; say('m_slowed', { mon: B.MON(mo.type).name }, { rate: 1 }); } }
      if (bossFront) B.hurtBoss(dice(2, 6) * SPW, { kind: 'cold', by: mi });
      return true;
    }
    case 'featherStep': told(); P.floating = 120 * SPW; say('m_feather'); return true;
    case 'forkedLightning': {
      told(); const cells = []; let x = P.cx, y = P.cy, d = P.dir, left = 5, bounced = false;
      while (left-- > 0) {
        const nx = x + DX[d], ny = y + DY[d];
        if (B.opaque(S.floor, nx, ny) || (doorAt(nx, ny) && !doorPass(doorAt(nx, ny)))) { if (bounced) break; bounced = true; d = (d + 2) % 4; left++; continue; }
        x = nx; y = ny; if (x === P.cx && y === P.cy) continue; cells.push([x, y]);
      }
      ev('lightning', { cells, from: [P.cx, P.cy] }); noise(P.cx, P.cy, 6);
      const dmg = () => dice(3 + Math.max(0, lvl - 5), 6) * SPW;
      for (const [cx, cy] of cells) {
        for (const mo of monsAt(cx, cy)) hurtMon(mo, dmg(), { kind: 'shock', by: mi });
        if (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === cx && S.boss.cy === cy) B.hurtBoss(dmg(), { kind: 'shock', by: mi });
      }
      return true;
    }
    case 'blazingOrb': told(); B.launch({ kind: 'orb', spell: id, dmg: [3, 6, lvl], speed: 5, range: 7, by: mi, k: SPW, color: sp.color, burstAtWall: true }); noise(P.cx, P.cy, 5); return true;
    case 'mend': case 'greaterMend': {
      const t = tm || lowest(); if (!t || t.state === 'dead') { say('m_noTarget'); return false; }
      told(); const n = id === 'mend' ? dice(1, 8, 1 + Math.floor(lvl / 2)) : dice(3, 8, lvl); B.healMember(t, n * SPW, true); return true;
    }
    case 'steadyHand': told(); P.steady = 60 * SPW; say('m_steady'); return true;
    case 'turnDead': {
      const und = frontMons.filter(mo => B.MON(mo.type).undead); if (!und.length) { say('m_noTarget'); return false; }
      told(); ev('flare', { x: fx, y: fy });
      for (const mo of und) { if (mo.hp <= 2 * lvl * SPW) { say('m_crumble', { mon: B.MON(mo.type).name }); hurtMon(mo, mo.hp, { kind: 'holy', by: mi }); } else { mo.status.turned = 12; mo.wind = 0; say('m_turned', null, { rate: 1 }); } }
      return true;
    }
    case 'purge': { const t = tm || alive().find(x => x.status.poison > 0) || m; if (!t || t.state === 'dead') return false; told(); delete t.status.poison; B.healMember(t, dice(1, 4) * SPW); say('m_cured', { name: t.name }); return true; }
    case 'holdFast': {
      const hum = frontMons.filter(mo => B.MON(mo.type).humanoid); if (!hum.length) { say('m_noTarget'); return false; }
      told(); for (const mo of hum) if (rnd() >= .25) { mo.status.held = 10 * SPW; mo.wind = 0; say('m_holdFast', { mon: B.MON(mo.type).name }); ev('status', { uid: mo.uid, k: 'held' }); }
      return true;
    }
    case 'loaves': told(); for (const x of P.members) if (x.state !== 'dead') { x.food = 100; x.starveT = 0; } say('m_bread'); return true;
    case 'raise': {
      const t = tm && tm.state === 'dead' ? tm : P.members.find(x => x.state === 'dead'); if (!t) { say('m_noTarget'); return false; }
      told(); t.state = 'ok'; t.hp = 1; say('m_raised', { name: t.name }); ev('raise', { m: P.members.indexOf(t) }); return true;
    }
    case 'freeHinge': told(); P.freeHinge = 120 * SPW; for (const x of P.members) delete x.status.held; say('m_free'); return true;
  }
  return false;
}
B.spellEffect = spellEffect;
const lowest = () => alive().concat(S.party.members.filter(x => x.state === 'down')).sort((a, b) => (a.state === 'down' ? -1 : a.hp / a.max) - (b.state === 'down' ? -1 : b.hp / b.max))[0];
B.lowest = lowest;
/** a spell's projectile reaches its target */
B.spellHit = (p, ms, boss, x, y) => {
  if (p.kind === 'spark') {
    const t = ms[0]; const dmg = dice(...p.dmg) * (p.k || 1);
    if (boss) B.hurtBoss(dmg, { kind: 'arc', by: p.by }); else if (t) hurtMon(t, dmg, { kind: 'arc', by: p.by });
    ev('sparkHit', { x, y }); return;
  }
  if (p.kind === 'orb') burst(p, x, y);
};
/** the Blazing Orb's burst: full to the cell, half to the four beside it */
function burst(p, x, y) {
  ev('burst', { x, y }); noise(x, y, 6);
  const full = dice(...p.dmg) * (p.k || 1);
  for (const mo of monsAt(x, y)) hurtMon(mo, full, { kind: 'fire', by: p.by });
  if (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === x && S.boss.cy === y) B.hurtBoss(full, { kind: 'fire', by: p.by });
  for (let d = 0; d < 4; d++) for (const mo of monsAt(x + DX[d], y + DY[d])) hurtMon(mo, full / 2, { kind: 'fire', by: p.by });
}
B.burst = burst;
