/* SIM: one step. B.update(dt, commands) runs the commands (from the player's controls, the bot, the attract mode or a
 * test: all plain JSON), then the world. The events it pushes (B.S.events) drive the 3D view, the sound and the HUD. */
B.dispatch = c => {
  const S = B.S, P = S.party;
  if (S.talk && c.c !== 'talk') return false;
  switch (c.c) {
    case 'talk': return B.cmdTalk(c.op, c.i);
    case 'move': return !S.camp && B.cmdMove(c.d);
    case 'turn': return !S.camp && B.cmdTurn(c.s);
    case 'use': return !S.camp && B.cmdUse();
    case 'putDown': return B.cmdPutDown();
    case 'throw': return !S.camp && B.cmdThrow();
    case 'strike': return !S.camp && B.cmdStrike();
    case 'hand': return !S.camp && B.cmdHand(c.m, c.h);
    case 'cast': return B.cmdCast(c.m, c.spell, c.target);
    case 'select': if (P.members[c.m]) P.selected = c.m; return true;
    case 'inv': return B.cmdInv(c);
    case 'camp': return B.cmdCamp(c.op);
    case 'formation': return B.cmdFormation(c.a, c.b);
    case 'memorize': return B.cmdMemorize(c.m, c.op, c.spell, c.i);
    case 'scribe': { const m = P.members[c.m], list = B.scribable(m); return B.scribe(c.m, list[c.i]); }
    case 'dismiss': return B.dismiss(c.m);
    case 'loh': return B.layOnHands(c.m, c.target);
    case 'examine': return B.examine();
    case 'pick': return !S.camp && !P.hand && B.pickUp(c.here);
    case 'stow': { if (!P.hand) return false; const r = B.giveParty(P.hand); P.hand = null; return r !== null; }
    case 'toHand': { if (P.hand) return false; const f = B.findItem(it => it.id === c.id && (!c.uid || it.uid === c.uid)); if (!f || f.where === 'hand') return false; if (f.it.n > 1 && !c.all) { f.it.n--; P.hand = B.item(f.it.id, 1); } else { B.removeFound(f); P.hand = f.it; } return true; }
    case 'useItem': { const f = B.findItem(it => it.id === c.id); if (!f) return false; const m = c.m !== undefined ? P.members[c.m] : (f.m || P.members[0]); if (!m) return false; const own = m === f.m, where = own ? (f.where === 'pack' ? { pack: f.i } : f.where === 'slot' ? { slot: f.i } : {}) : f.where === 'hand' ? { hand: true } : {}; const ok = B.useItem(m, f.it, where); if (ok && !own && f.where !== 'hand') { const d = B.def(f.it); if (d.kind === 'potion' || d.kind === 'food' || (d.kind === 'scroll')) { if (f.it.n > 1) f.it.n--; else B.removeFound(f); } } return ok; }
    case 'equip': { const m = P.members[c.m], f = B.findItem(it => it.uid === c.uid); if (!m || !f || f.where === 'hand') return false; const why = B.canEquip(m, f.it, c.slot); if (why) return false; B.removeFound(f); const old = m.slots[c.slot]; m.slots[c.slot] = f.it; if (old) B.giveParty(old); return true; }
    default: return false;
  }
};
B.update = (dt, cmds = []) => {
  const S = B.S;
  for (const c of cmds) B.dispatch(c);
  if (S.talk) return S.events;
  if (S.camp) { B.updateRest(dt); return S.events; }
  if (S.over) return S.events;
  S.time += dt; S.playTime += dt;
  const P = S.party;
  if (P.lock > 0) { P.lock -= dt; if (P.lock <= 0) { P.lock = 0; B.lockDone(); } }
  B.updateTween(dt); B.updateDoors(dt); B.updatePlates(); B.updateMembers(dt); B.updateMonsters(dt); B.updateProj(dt); B.updateHints(dt); B.updateRace(dt);
  S.barks = S.barks.filter(b => S.time - b.t < 4);
  return S.events;
};
/** Party Strike: every ready main hand that can act from its row acts at once (spells are skipped: they need a choice) */
B.cmdStrike = () => {
  const S = B.S, P = S.party; let n = 0, air = false;
  P.members.forEach((m, i) => {
    if (!B.canAct(m) || m.cool.main > 0) return;
    const a = B.handAction(m, 'main'); if (!a || a === 'cast' || a === 'use' || a === 'brace' || a === 'zap') return;
    if (a === 'missile') { const d = B.def(m.slots.main), q = m.slots.quiver; if (!q || q.id !== d.ammo || !(q.n > 0)) return; }
    if (a === 'missile' || a === 'throw') { const ahead = B.line(P.cx, P.cy, P.dir, 6).some(c => c.ok && B.monsAt(c.x, c.y).length); if (!ahead) return; }
    const r = B.cmdHand(i, 'main'); if (r) n++; if (r === 'air') air = true;
  });
  return n > 0;
};
B.canEquip = (m, it, slot) => {
  const d = B.def(it); if (!d) return 'Nothing to place.';
  const clsOk = (d.cls || 'FPRCMT').includes(m.cls);
  if (slot === 'main' || slot === 'off') {
    if ((d.kind === 'weapon' || d.kind === 'missile' || d.kind === 'shield') && !clsOk) return m.name + ' cannot use the ' + d.name + '.';
    if (m.cls === 'C' && d.kind === 'weapon' && !d.blunt && d.id !== 'darts') return 'A cleric may wield only blunt weapons.';
    if (slot === 'off' && d.two) return 'It needs both hands: hold it in the main hand.';
    if (slot === 'off' && B.handLocked(m, 'off')) return 'Both hands are on the ' + B.def(m.slots.main).name + '.';
    if (slot === 'main' && d.two && m.slots.off) return 'Free the other hand first.';
    if (d.kind === 'shield' && slot === 'main') return 'A shield goes in the off hand.';
    return null;
  }
  if (slot === 'quiver') return d.kind === 'ammo' ? null : 'Only arrows, bolts and sling stones go in the quiver.';
  const want = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
  if (d.kind !== want) return 'That does not go there.';
  if (!clsOk) return m.name + ' cannot wear the ' + d.name + '.';
  if (slot === 'body' && d.def > B.ARMOR_OK[m.cls]) return 'Too heavy for a ' + B.CLASSES[m.cls].name.toLowerCase() + '.';
  return null;
};
/** the Party screen's moves: take into the Hand, place from it (swapping), use, drop at your feet */
B.cmdInv = c => {
  const S = B.S, P = S.party, m = P.members[c.m]; if (!m || m.state === 'dead') return false;
  const get = r => r.slot ? m.slots[r.slot] || null : m.pack[r.pack] || null;
  const set = (r, it) => { if (r.slot) { if (it) m.slots[r.slot] = it; else delete m.slots[r.slot]; } else m.pack[r.pack] = it || null; };
  if (c.op === 'take') { if (P.hand) return B.cmdInv(Object.assign({}, c, { op: 'place' })); const it = get(c.ref); if (!it) return false; set(c.ref, null); P.hand = it; B.sfx('pickup'); return true; }
  if (c.op === 'place') {
    const it = P.hand; if (!it) return B.cmdInv(Object.assign({}, c, { op: 'take' }));
    const old = get(c.ref), d = B.def(it);
    if (c.ref.slot) { const why = B.canEquip(m, it, c.ref.slot); if (why) { B.msg(why); B.sfx('uiError'); return false; } }
    if (old && d.stack && old.id === it.id) { const t = Math.min(d.stack - old.n, it.n); old.n += t; it.n -= t; if (!it.n) P.hand = null; B.sfx('drop'); return true; }
    set(c.ref, it); P.hand = old; B.sfx('drop'); return true;
  }
  if (c.op === 'use') { const it = get(c.ref); if (!it) return false; return B.useItem(m, it, c.ref.slot ? { slot: c.ref.slot } : { pack: c.ref.pack }); }
  if (c.op === 'drop') { const it = c.ref ? get(c.ref) : P.hand; if (!it) return false; if (c.ref) set(c.ref, null); else P.hand = null; B.dropAt(S.floor, P.cx, P.cy, it); B.sfx('drop'); return true; }
  if (c.op === 'stow') { if (!P.hand) return false; const i = m.pack.indexOf(null); if (i < 0) { B.msg(m.name + "'s pack is full."); return false; } m.pack[i] = P.hand; P.hand = null; return true; }
  return false;
};
/** Examine: what is in front, in the source's voice */
B.examine = () => {
  const S = B.S, P = S.party, [fx, fy] = B.front(), f = B.featAt(P.cx, P.cy, P.dir), FS = B.FS();
  const foes = B.monsAt(fx, fy);
  if (foes.length) { const m = foes[0], r = m.hp / m.max, n = B.MONSTERS[m.type].name.replace(/^The /, ''); B.msg('The ' + n + (r > .75 ? ' looks unhurt.' : r > .4 ? ' is wounded.' : ' looks badly hurt.') + (m.status.asleep > 0 ? ' It sleeps.' : m.status.held > 0 ? ' It is held fast.' : '')); return true; }
  if (f) {
    const st = FS.feat[f.id], T = {
      lever: 'A lever, set ' + (st.on ? 'up' : 'down') + '.', button: 'A square stone button.', catch: 'A wall of slick stone. One ' + (f.o.rivet ? 'brass rivet sits proud of the rest.' : 'stone sits proud of the rest.'),
      inscription: 'Words are carved here: ' + f.o.text, alcove: st.items.length ? 'A niche holding ' + B.itemName(st.items[st.items.length - 1]) + '.' : (f.o.text || 'An empty niche.'),
      candle: st.on ? 'A pale candle burns in its sconce.' : 'An unlit candle in an iron sconce.', greatLock: 'A Great Lock, a wheel of iron as tall as a man.' + (st.on ? ' It has been turned.' : ''),
      gearNiche: st.items.length ? 'A niche with a gear in it.' : 'An empty niche, shaped for a gear.', clockFace: FS.clock ? 'The Great Clock ticks, whole again.' : 'The Great Clock, stopped. Four of its gears are missing.',
      shrine: 'A ring of tiny brass rats around a key: a shrine of the Warder of Thresholds.', undergate: 'The Undergate: three keyholes, ' + S.wards + ' filled.', torch: 'A brazier burns in a niche.'
    };
    if (T[f.kind]) { B.msg(T[f.kind]); return true; }
  }
  const door = B.doorIn(S.floor, fx, fy);
  if (door) { const d = door[1]; B.msg(d.kind === 'gate' ? (d.open > .5 ? 'A raised portcullis.' : 'An iron portcullis, lowered.') : d.kind === 'seal' && d.locked ? 'A door of crawling runes.' : d.locked ? 'A locked door. The lock is ' + (B.F().doors[door[0]].kind === 'warded' ? 'warded.' : 'simple.') : 'A heavy door.'); return true; }
  const items = B.itemsAt(fx, fy); if (items.length && B.open(S.floor, fx, fy)) { B.msg(B.lieHere(items)); return true; }
  const tr = B.RF().trapAt[key(fx, fy)]; if (tr && FS.traps[tr].armed && (P.fx.seeing > 0 || B.alive().some(m => m.cls === 'T'))) { B.msg('Tiny holes stud the walls ahead. A dart trap.'); return true; }
  const pit = B.pitIn(S.floor, fx, fy); if (pit && (pit.p.open || P.fx.seeing > 0 || B.alive().some(m => m.cls === 'T'))) { B.msg(pit.p.bridged ? 'A stone bridge spans a pit.' : pit.p.open ? 'A pit drops into darkness.' : 'Thin seams outline a trapdoor.'); return true; }
  if (B.isWall(S.floor, fx, fy)) { const c = B.ch(S.floor, fx, fy); B.msg(c === 'H' && (P.fx.seeing > 0 || B.seeing()) ? 'Fine seams outline a hidden door.' : B.F().depth === 1 ? 'A wall of slick stone.' : B.F().depth === 2 ? 'Dressed stone, scored by old tools.' : B.F().depth === 3 ? 'Black stone, faintly warm.' : 'Cold stone that hums.'); return true; }
  B.msg('You see nothing of note.'); return true;
};
/** take the events pushed since the last drain (the view, sound and HUD consume them) */
B.drain = () => { const e = B.S.events; B.S.events = []; return e; };
B.seeing = () => B.S.party.fx.seeing > 0 || B.S.party.members.some(m => m.state === 'ok' && Object.values(m.slots).some(it => it && B.def(it).seeing));
