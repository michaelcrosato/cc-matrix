/* SIM: magic. Mages cast from the spells memorized out of their book; clerics pray with a holy symbol in hand; both
 * spend a slot, and both hands wait 2.5 s. Scrolls cast at once (or are scribed into the book at camp); wands have
 * charges. Spells hurt monsters, never the party. */
B.casterHands = m => ['main', 'off'].some(h => { const d = B.def(m.slots[h]); return d && (d.kind === 'book' || d.kind === 'symbol'); });
B.readySpells = m => { const out = {}; for (const e of m.mem) if (e.ready || B.CHEATS.infiniteSpells) out[e.s] = (out[e.s] || 0) + 1; return out; };
B.cmdCast = (mi, s, target) => {
  const S = B.S, m = S.party.members[mi]; if (!m || !B.canAct(m) || S.over) return false;
  if (!B.casterHands(m)) { B.msg(m.name + ' needs a spellbook or holy symbol in hand.'); return false; }
  const e = m.mem.find(x => x.s === s && (x.ready || B.CHEATS.infiniteSpells)); if (!e) { B.msg(m.name + ' has no ' + B.SPELLS[s].name + ' ready.'); return false; }
  if (!B.castSpell(m, s, { target })) return false;
  if (!B.CHEATS.infiniteSpells) e.ready = false;
  return true;
};
B.castSpell = (m, s, o = {}) => {
  const S = B.S, P = S.party, sp = B.SPELLS[s], lvl = o.wand ? 5 : m.lvl, pw = B.T.spellPower, [fx, fy] = B.front();
  const tgt = typeof o.target === 'number' ? P.members[o.target] : null;
  const front = () => B.monsAt(fx, fy);
  let ok = true;
  switch (s) {
    case 'sparkDart': { const n = Math.min(3, 1 + Math.floor(lvl / 2)); for (let k = 0; k < n; k++) B.launch({ kind: 'spark', spell: s, by: m.id, dmg: (B.dice('1d4') + 1) * pw, range: 6, speed: 6, prog: -k * .35 }); break; }
    case 'wardOfBrass': { const t = tgt && tgt.state === 'ok' ? tgt : m; t.ward = 8 + lvl; B.msg(t.name + ' shimmers with brass.'); break; }
    case 'findSeams': P.fx.seeing = 90; B.msg('The seams of the world glint gold.'); break;
    case 'slumber': {
      let pool = Math.round((10 + 3 * lvl) * pw); const list = front().filter(f => { const MD = B.MONSTERS[f.type]; return MD.size <= 2 && !MD.undead && !MD.construct && !(MD.immune || '').includes('sleep'); }).sort((a, b) => a.hp - b.hp);
      let n = 0; for (const f of list) { if (f.hp > pool) break; pool -= f.hp; f.status.asleep = 20; f.wind = 0; n++; }
      B.msg(n ? 'The ' + B.MONSTERS[list[0].type].name.replace(/^The /, '') + (n > 1 ? 's fall' : ' falls') + ' asleep.' : 'Nothing in front of you sleeps.'); break;
    }
    case 'unlatch': {
      const door = B.doorIn(S.floor, fx, fy), FD = door && B.F().doors[door[0]];
      if (door && door[1].locked && (door[1].kind === 'seal' || (FD.kind === 'simple'))) { door[1].locked = false; B.setDoor(door[0], true); B.msg(door[1].kind === 'seal' ? 'The runes unravel like smoke.' : 'A ghostly key turns. The lock opens.'); B.trigger({ opened: door[0] }); B.ev('unlatch', { at: [fx, fy] }); }
      else { B.msg('Nothing happens.'); }
      break;
    }
    case 'frostbite': { const list = front(); for (const f of list) { f.status.slowed = 10; B.hurtMon(f, B.dice('2d6') * pw, { by: m, kind: 'cold' }); } if (!list.length) B.msg('Frost blooms on empty air.'); B.ev('frost', { at: [fx, fy] }); break; }
    case 'featherStep': P.fx.float = 120; B.msg('The party rises a hand above the floor.'); break;
    case 'forkedLightning': {
      const cells = []; let x = P.cx, y = P.cy, dir = P.dir, left = 5, bounced = false;
      while (left > 0) { const nx = x + DX[dir], ny = y + DY[dir]; if (!B.open(S.floor, nx, ny)) { if (bounced || !cells.length) break; bounced = true; dir = (dir + 2) % 4; continue; } x = nx; y = ny; if (x === P.cx && y === P.cy) break; cells.push([x, y]); left--; }
      const extra = Math.max(0, lvl - 5);
      for (const [cx, cy] of cells) for (const f of B.monsAt(cx, cy)) { const MD = B.MONSTERS[f.type]; B.hurtMon(f, (B.dice('3d6') + B.dice(extra + 'd6')) * pw * (MD.lightningX || 1), { by: m, kind: 'lightning' }); }
      B.ev('lightning', { cells, party: true }); B.sfx('thunder'); break;
    }
    case 'blazingOrb': B.launch({ kind: 'orb', spell: s, by: m.id, dmg: (B.dice('3d6') + lvl) * pw, range: 8, speed: 7 }); break;
    case 'mend': case 'greaterMend': {
      const t = tgt && tgt.state !== 'dead' ? tgt : B.S.party.members.filter(x => x.state !== 'dead').sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (!t) { ok = false; break; }
      const n = (s === 'mend' ? B.dice('1d8') + 1 + Math.floor(lvl / 2) : B.dice('3d8') + lvl) * pw;
      B.healMember(t, n); B.msg(t.name + ' is mended.'); break;
    }
    case 'steadyHand': P.fx.steady = 60; B.msg('A steady warmth settles on every hand.'); break;
    case 'turnDead': { const list = front().filter(f => B.MONSTERS[f.type].undead); for (const f of list) { if (f.hp <= 2 * lvl * pw) B.killMon(f); else f.status.turned = 12; } B.msg(list.length ? 'The dead recoil from the Warder\'s light!' : 'There are no dead before you.'); B.ev('flare', { at: [fx, fy] }); break; }
    case 'purge': { const t = tgt || m; delete t.status.poison; B.healMember(t, B.dice('1d4')); B.msg(t.name + "'s blood runs clean."); break; }
    case 'holdFast': { const list = front().filter(f => B.MONSTERS[f.type].humanoid && !(B.MONSTERS[f.type].immune || '').includes('hold')); let n = 0; for (const f of list) if (B.rng('combat') >= .25) { f.status.held = 10; f.wind = 0; n++; } B.msg(n ? 'Golden chains bind them fast!' : 'The chains find nothing to hold.'); break; }
    case 'loaves': for (const x of P.members) if (x.state !== 'dead') x.food = 100; B.msg('Warm bread fills every belly.'); break;
    case 'raise': { const t = tgt && tgt.state === 'dead' ? tgt : P.members.find(x => x.state === 'dead'); if (!t) { B.msg('No one here needs raising.'); ok = false; break; } B.raiseMember(t); B.msg(t.name + ' breathes again.'); break; }
    case 'freeHinge': P.fx.freeHinge = 120; for (const x of P.members) delete x.status.held; B.msg('A hinge-sign glows on every brow.'); break;
    default: ok = false;
  }
  if (!ok) return false;
  B.ev('cast', { m: m.id, s, color: sp.color, side: B.colOf(m) }); B.sfx('cast'); B.noise([P.cx, P.cy], 3);
  if (!o.wand && !o.scroll) { m.cool.main = m.coolMax.main = 2.5 * (B.CHEATS.noCooldowns ? .02 : 1); m.cool.off = m.coolMax.off = m.cool.main; }
  return true;
};
B.raiseMember = t => { t.state = 'ok'; t.hp = 1; t.status = {}; B.sfx('raise'); B.ev('raised', { m: t.id }); };
/** a spell projectile reaches its foe or a wall */
B.spellHit = (p, foe, foes) => {
  if (p.kind === 'spark') { B.hurtMon(foe, p.dmg, { by: B.S.party.members.find(x => x.id === p.by), kind: 'spark' }); B.ev('projEnd', { uid: p.uid, x: foe.cx, y: foe.cy, spell: 'sparkDart' }); }
  else if (p.kind === 'orb') B.spellBurst(p, foe.cx, foe.cy);
};
B.spellBurst = (p, x, y) => {
  if (p.kind !== 'orb' || p.burst) return; p.burst = true;
  const by = B.S.party.members.find(m => m.id === p.by);
  for (const f of B.monsAt(x, y)) B.hurtMon(f, p.dmg, { by, kind: 'fire' });
  for (const d of [0, 1, 2, 3]) for (const f of B.monsAt(x + DX[d], y + DY[d])) B.hurtMon(f, p.dmg / 2, { by, kind: 'fire' });
  B.ev('explode', { x, y }); B.sfx('explode');
};
/** use an item on a member: eat, drink, read a scroll or note, zap a wand (from the Party screen or a hand) */
B.useItem = (m, it, where = {}) => {
  const S = B.S, d = B.def(it); if (!d || m.state === 'dead') return false;
  const consume = () => { if (it.n > 1) it.n--; else if (where.slot) delete m.slots[where.slot]; else if (where.pack !== undefined) m.pack[where.pack] = null; else if (where.hand) S.party.hand = null; };
  switch (d.kind) {
    case 'food': if (m.state !== 'ok') return false; m.food = Math.min(100, m.food + d.food); consume(); B.sfx('eat'); B.msg(m.name + ' eats the ' + d.name.toLowerCase() + '.'); return true;
    case 'potion':
      if (m.state === 'down' && !d.wake && !d.heal) return false;
      if (d.heal) B.healMember(m, B.dice(d.heal)); if (d.cure) delete m.status[d.cure];
      if (d.slot) { const e = m.mem.filter(x => !x.ready).sort((a, b) => B.SPELLS[b.s].lvl - B.SPELLS[a.s].lvl)[0]; if (e) e.ready = true; }
      consume(); S.stats.potions++; B.sfx('drink'); B.msg(m.name + ' drinks the ' + d.name.toLowerCase() + '.'); return true;
    case 'scroll': {
      if (d.prayer) { if (!['C', 'P'].includes(m.cls)) { B.msg(m.name + ' cannot read the prayer.'); return false; } if (!B.castSpell(m, d.spell, { scroll: true })) return false; consume(); return true; }
      if (m.cls !== 'M') { B.msg('The script crawls before ' + m.name + "'s eyes."); return false; }
      if (!B.castSpell(m, d.spell, { scroll: true, target: S.party.members.indexOf(m) })) return false; consume(); B.sfx('scroll'); return true;
    }
    case 'note': B.readNote(it); return true;
    case 'wand': if (!(it.ch > 0)) { B.msg('The wand is spent.'); return false; } if (B.castSpell(m, d.spell, { wand: true })) { it.ch--; return true; } return false;
    default: B.msg(d.desc); return false;
  }
};
/** Scribe: a mage copies a scroll into the book (it always works; the scroll is used up) */
B.scribe = (mi, packRef) => {
  const m = B.S.party.members[mi], f = packRef; if (!m || m.cls !== 'M') return false;
  const d = B.def(f.it); if (!d || d.kind !== 'scroll' || d.prayer || m.book.includes(d.spell)) return false;
  m.book.push(d.spell); B.removeFound(f); B.msg(m.name + ' scribes ' + B.SPELLS[d.spell].name + ' into the spellbook.'); B.sfx('scroll'); return true;
};
B.scribable = m => { const out = []; for (const o of B.S.party.members) for (let i = 0; i < 12; i++) { const it = o.pack[i], d = B.def(it); if (d && d.kind === 'scroll' && !d.prayer && !m.book.includes(d.spell)) out.push({ m: o, where: 'pack', i, it }); } return out; };
