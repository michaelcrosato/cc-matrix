/* SIM: the party. Steps, turns and strafes (tweened, one move buffered), bumps, what happens on arrival (pits,
 * teleporters, spinners, traps, stairs), using what is in front (levers, buttons, catches, alcoves, keys, doors), the
 * Hand (take, stow, put down, throw), plates' weight. */
B.stepScale = 1;   // Settings, Step animation: 1 smooth, .57 quick, 0 instant
B.moveDur = kind => (kind === 'turn' ? B.T.turnT : B.T.stepT) * B.stepScale;
B.cmdMove = rel => {
  const S = B.S, P = S.party;
  if (S.over || P.lock > 0) return false;
  if (P.tween) { P.queued = { c: 'move', d: rel }; return false; }
  const d = B.relDir(P.dir, rel), nx = P.cx + DX[d], ny = P.cy + DY[d];
  const blocked = B.CHEATS.noclip ? (nx < 0 || ny < 0 || nx >= B.RF().w || ny >= B.RF().h) : !B.open(S.floor, nx, ny) || B.monsAt(nx, ny).length > 0;
  if (blocked) {
    P.tween = { kind: 'bump', fx: P.cx, fy: P.cy, fd: P.dir, bd: d, t: 0, dur: .25 };
    B.sfx('bump');
    if (S.time - (P.bumpMsg || -9) > 2) {
      P.bumpMsg = S.time; const door = B.doorIn(S.floor, nx, ny);
      B.msg(B.monsAt(nx, ny).length ? 'Something blocks the way!' : door ? (door[1].locked && door[1].kind === 'locked' ? 'It is locked.' : door[1].kind === 'gate' ? 'The gate will not budge.' : door[1].kind === 'seal' ? 'Runes seal the door.' : door[1].kind === 'undergate' ? 'The Undergate is shut fast.' : 'The door is shut.') : "You can't go that way.");
    }
    return false;
  }
  P.tween = { kind: 'step', fx: P.cx, fy: P.cy, fd: P.dir, t: 0, dur: B.moveDur('step') };
  P.cx = nx; P.cy = ny; S.stats.steps++;
  B.sfx(B.F().step || 'stepStone');
  if (B.ch(S.floor, nx, ny) === 'I') {
    B.ev('dissolve'); const id = B.RF().illusionAt[key(nx, ny)], FS = B.FS();
    if (id && !FS.done['ill_' + id]) { FS.done['ill_' + id] = 1; B.msg('The wall is an illusion!'); B.secretFound(); }
  }
  B.look();
  if (P.tween.dur <= 0) B.endTween();
  return true;
};
B.cmdTurn = s => {
  const S = B.S, P = S.party; if (S.over || P.lock > 0) return false;
  if (P.tween) { P.queued = { c: 'turn', s }; return false; }
  P.tween = { kind: 'turn', fx: P.cx, fy: P.cy, fd: P.dir, t: 0, dur: B.moveDur('turn') };
  P.dir = (P.dir + s + 4) % 4; B.sfx('turn'); B.look();
  if (P.tween.dur <= 0) B.endTween();
  return true;
};
B.updateTween = dt => {
  const P = B.S.party; if (!P.tween) return;
  P.tween.t += dt;
  if (P.tween.t >= P.tween.dur) B.endTween();
};
B.endTween = () => {
  const P = B.S.party, tw = P.tween; P.tween = null;
  if (tw && tw.kind === 'step') B.arrive();
  if (P.queued && !B.S.over) { const q = P.queued; P.queued = null; if (q.c === 'move') B.cmdMove(q.d); else B.cmdTurn(q.s); }
};
/** the step has ended: what the cell does */
B.arrive = () => {
  const S = B.S, P = S.party, F = B.F(), FS = B.FS(), R = B.RF(), x = P.cx, y = P.cy, k = key(x, y);
  B.look();
  const floating = P.fx.float > 0;
  // pits and trapdoors
  const pit = B.pitIn(S.floor, x, y);
  if (pit && !pit.p.bridged && !floating) {
    if (!pit.p.open) { pit.p.open = true; B.sfx('trapdoor'); }
    B.msg('The floor gives way!'); return B.fall();
  }
  // teleporters (silent ones show nothing) and their loop hints
  const tp = R.tpAt[k];
  if (tp && FS.tps[tp].on) {
    const T = F.teleports[tp]; P.cx = T.to[0]; P.cy = T.to[1]; P.dir = T.to[2];
    FS.loops[tp] = (FS.loops[tp] || 0) + 1;
    if (!T.silent) { B.sfx('teleport'); B.ev('teleport'); }
    for (const h of F.hints || []) if (h.loops === tp && FS.loops[tp] === h.n) { if (h.story) B.startStory(h.story); else B.floorHint(h.text); }
    B.look(); return;
  }
  if (B.ch(S.floor, x, y) === 'S') { P.dir = Math.floor(B.rng('world') * 4); B.sfx('spinner'); B.look(); }
  // dart traps
  const tr = R.trapAt[k];
  if (tr && FS.traps[tr].armed) {
    B.msg('Darts fly from the walls!'); B.sfx('darts');
    const pool = B.alive(); for (let i = 0; i < 2 && pool.length; i++) { const m = pool.splice(Math.floor(B.rng('world') * pool.length), 1)[0]; B.hurtMember(m, Math.max(1, Math.round(B.dice('1d4', 'world') * B.T.trapDmg)), 'front'); }
  }
  // stairs
  const st = (F.stairs || {})[k];
  if (st) {
    if (st.sealed) { B.msg('The grate above is bolted fast. There is no way back.'); }
    else if (st.exit) { B.raceExit && B.raceExit(); return; }
    else return B.changeFloor(st.to, st.at, 'stairs');
  }
  // what lies here
  const items = B.itemsAt(x, y);
  if (items.length && S.mode === 'campaign') B.msg(B.lieHere(items));
  if (S.race && items.some(it => it.id === 'ratCrown')) { for (const it of items.filter(i => i.id === 'ratCrown')) { FS.items[k].splice(FS.items[k].indexOf(it), 1); B.raceCrown(); } }
  B.cellEvents(x, y);
};
B.lieHere = items => { const n = items.map(it => (B.def(it) || {}).name || it.id); return (n.length > 2 ? n.slice(0, 2).join(', ') + ' and more' : n.length === 2 ? (/^[AEIOU]/.test(n[0]) ? 'An ' : 'A ') + n[0] + ' and ' + (/^[AEIOU]/.test(n[1]) ? 'an ' : 'a ') + n[1] : (/^[AEIOU]/.test(n[0]) ? 'An ' : 'A ') + n[0]) + (n.length > 1 ? ' lie here.' : ' lies here.'); };
B.fall = () => {
  const S = B.S, F = B.F(); B.ev('fall'); B.sfx('fall');
  for (const m of B.alive()) B.hurtMember(m, B.dice('1d6', 'world'), 'none');
  if (F.fall) B.changeFloor(F.fall.to, F.fall.at, 'fall');
};
B.changeFloor = (to, at, how) => {
  const S = B.S, P = S.party;
  if (!S.floors[to]) B.initFloor(to), B.buildRuntime();
  S.proj = []; P.tween = null; P.queued = null;
  S.floor = to; P.cx = at[0]; P.cy = at[1]; P.dir = at[2];
  B.FS().visited = 1; B.look();
  B.ev('floor', { to, how });
  B.cellEvents(P.cx, P.cy);
};
/** the weight on each plate: the party (not floating), any item, a middling or large monster */
B.updatePlates = () => {
  const S = B.S, F = B.F(), FS = B.FS(), P = S.party;
  for (const [id, pd] of Object.entries(F.plates || {})) {
    const [x, y] = pd.at, st = FS.plates[id];
    const down = (P.cx === x && P.cy === y && !P.tween && P.fx.float <= 0) || (P.cx === x && P.cy === y && P.tween && P.tween.kind !== 'step' && P.fx.float <= 0) || B.itemsAt(x, y).length > 0 || B.monsAt(x, y).some(m => B.MONSTERS[m.type].size >= 2 && !B.MONSTERS[m.type].fly);
    if (down !== st.down) { st.down = down; B.sfx(down ? 'plateDown' : 'plateUp', { at: pd.at }); if (down) st.done = true; B.trigger({ plate: id, down }); }
  }
};

/* ---- USE: what is in front, else the Hand, else picking up ---- */
B.cmdUse = () => {
  const S = B.S, P = S.party; if (S.over || P.lock > 0) return;
  const f = B.featAt(P.cx, P.cy, P.dir), [fx, fy] = B.front(), FS = B.FS(), hand = P.hand;
  if (f && B.useFeature(f, FS.feat[f.id])) return;
  const door = B.doorIn(S.floor, fx, fy);
  if (door && B.useDoor(door[0], door[1])) return;
  const tr = B.RF().trapAt[key(fx, fy)];
  if (tr && FS.traps[tr].armed && !hand) { const th = B.alive().find(m => m.cls === 'T'); if (th) return B.disarm(th, tr); }
  if (hand) {
    const d = B.def(hand);
    if (d && d.kind === 'note') return B.readNote(hand);
    const r = B.giveParty(hand); P.hand = null; B.sfx('stow');
    if (r === null) B.msg('You have no room. It drops at your feet.');
    return;
  }
  B.pickUp();
};
B.pickUp = (hereOnly) => {
  const S = B.S, P = S.party, [fx, fy] = B.front();
  const frontOk = !hereOnly && B.open(S.floor, fx, fy) && !B.monsAt(fx, fy).length;
  for (const [x, y] of frontOk ? [[fx, fy], [P.cx, P.cy]] : [[P.cx, P.cy]]) {
    const list = B.FS().items[key(x, y)];
    if (list && list.length) { P.hand = list.pop(); B.sfx('pickup'); B.msg('You take the ' + B.itemName(P.hand) + '.'); return true; }
  }
  return false;
};
B.useFeature = (f, st) => {
  const S = B.S, P = S.party, hand = P.hand, hd = B.def(hand);
  switch (f.kind) {
    case 'lever': st.on = !st.on; st.moved = true; B.sfx('lever', { at: [f.x + DX[f.d] * .5, f.y + DY[f.d] * .5] }); B.noise([f.x, f.y], 4); B.trigger({ lever: f.id }); return true;
    case 'button': st.t = S.time; B.sfx('button'); B.trigger({ button: f.id }); return true;
    case 'catch': if (st.on) { B.msg('Nothing happens.'); return true; } st.on = true; B.sfx('catch'); B.trigger({ catch: f.id }); return true;
    case 'inscription': B.readInscription(f); return true;
    case 'alcove': case 'gearNiche': case 'clockFace': case 'altarSlab':
      if (hand && f.kind !== 'clockFace') {
        if (f.kind === 'gearNiche' && (hand.id !== 'tumblerGear' || st.items.length)) { B.msg(st.items.length ? 'The niche already holds a gear.' : 'The niche is shaped for a gear.'); return true; }
        st.items.push(hand); P.hand = null; B.sfx('alcove'); B.trigger({ alcove: f.id, item: st.items[st.items.length - 1] });
        if (f.kind === 'gearNiche') B.trigger({ gear: f.id });
        return true;
      }
      if (!hand && st.items.length) { P.hand = st.items.pop(); B.sfx('pickup'); B.msg('You take the ' + B.itemName(P.hand) + '.'); return true; }
      if (!hand) { B.msg(f.o.text || (f.kind === 'gearNiche' ? 'An empty niche, shaped for a gear.' : f.kind === 'clockFace' ? 'The Great Clock. Four of its gears are missing.' : 'The alcove is empty.')); return true; }
      return false;
    case 'candle': if (!st.on) { st.on = true; B.sfx('candle'); B.trigger({ candle: f.id }); } else B.msg('The candle burns pale and steady.'); return true;
    case 'greatLock': return B.turnGreatLock(f, st);
    case 'shrine':
      if (st.on) { B.msg('The shrine is silent now.'); return true; }
      { const dead = S.party.members.find(m => m.state === 'dead'); if (!dead) { B.msg('A little shrine of the Warder of Thresholds. Its key waits for one who has passed.'); return true; }
        st.on = true; B.raiseMember(dead); B.msg("The shrine's key turns. " + dead.name + ' draws breath.'); return true; }
    case 'undergate':
      if (hd && hd.kind === 'ward') {
        P.hand = null; S.wards++; st.items.push(hand); B.sfx('keyTurn'); B.ev('ward', { id: hand.id, n: S.wards });
        B.msg('The ' + hd.name + ' turns in its keyhole. Bolts draw back into the stone.'); B.ev('sting', { name: 'wardFound' });
        B.trigger({ wards: S.wards }); return true;
      }
      B.msg(S.wards >= 3 ? 'The Undergate stands open.' : 'Three keyholes shaped like toothed discs: copper, brass and iron. ' + S.wards + ' of 3 are filled.'); return true;
    default: return false;
  }
};
B.readInscription = f => { B.msg(f.o.text, '#e8d8a8'); B.sfx('read'); const k = B.S.floor + ':' + f.id; if (!B.S.notes.includes(k)) B.S.notes.push(k); B.ev('read', { text: f.o.text }); };
B.readNote = it => { const d = B.def(it), k = 'note:' + d.note; if (!B.S.notes.includes(k)) B.S.notes.push(k); B.sfx('scroll'); B.ev('reader', { note: d.note }); };
B.useDoor = (id, d) => {
  const S = B.S, P = S.party, hand = P.hand, FD = B.F().doors[id];
  if (d.kind === 'door') { B.setDoor(id, 'toggle'); return true; }
  if (d.kind === 'locked' && d.locked) {
    const fits = it => it.id === FD.key;
    const f = hand && fits(hand) ? { where: 'hand', it: hand } : B.findItem(fits);
    if (f) { B.removeFound(f); d.locked = false; B.setDoor(id, true); B.sfx('keyTurn'); B.msg('The ' + B.ITEMS[FD.key].name + ' turns. The door opens.'); B.trigger({ opened: id }); return true; }
    if (hand && (B.def(hand) || {}).kind === 'key') { B.sfx('lockFail'); B.msg('This key does not fit.'); return true; }
    const th = B.alive().find(m => m.cls === 'T'), picks = B.findItem(it => it.id === 'lockpicks');
    if (th && FD.kind === 'simple' && picks) {
      const ch = .5 + .1 * B.mod(B.stat(th, 'dex')) + .05 * th.lvl;
      if (B.rng('world') < ch) { d.locked = false; B.setDoor(id, true); B.sfx('pick'); B.msg(th.name + ' picks the lock.'); B.trigger({ opened: id }); }
      else { B.sfx('pickSnap'); picks.it.u = (picks.it.u || 6) - 1; B.msg(th.name + "'s pick snaps in the lock."); if (picks.it.u <= 0) { B.removeFound(picks); B.msg('The last lockpick is gone.'); } }
      return true;
    }
    B.sfx('lockFail'); B.msg(FD.kind === 'warded' ? 'It is locked. The lock is warded: no pick will open it.' : 'It is locked.'); return true;
  }
  if (d.kind === 'locked' && !d.locked) { B.setDoor(id, 'toggle'); return true; }
  if (d.kind === 'seal' && d.locked) { B.msg('Runes crawl across the door. It will not open by hand.'); return true; }
  if (d.kind === 'gate' && d.open < .5) { B.msg('The gate will not budge.'); return true; }
  return false;
};
B.disarm = (th, tr) => {
  const ch = .5 + .1 * B.mod(B.stat(th, 'dex')) + .05 * th.lvl;
  if (B.rng('world') < ch) { B.FS().traps[tr].armed = false; B.sfx('pick'); B.msg(th.name + ' disarms the dart trap.'); }
  else { B.msg('Click. ' + th.name + ' springs the trap!'); B.sfx('darts'); B.hurtMember(th, B.dice('1d4', 'world'), 'front'); }
};
/** hold ✕ (H): put the Hand's item down in front (on a plate it presses; in a pit it falls below), else here */
B.cmdPutDown = () => {
  const S = B.S, P = S.party; if (!P.hand) return;
  const [fx, fy] = B.front(); let [x, y] = B.open(S.floor, fx, fy) && !B.monsAt(fx, fy).length ? [fx, fy] : [P.cx, P.cy];
  const it = P.hand; P.hand = null; B.sfx('drop');
  B.landItem(it, x, y);
};
B.landItem = (it, x, y) => {
  const S = B.S, F = B.F();
  if (B.pitOpen(S.floor, x, y) && F.fall) { if (!S.floors[F.fall.to]) { B.initFloor(F.fall.to); B.buildRuntime(); } B.dropAt(F.fall.to, F.fall.at[0], F.fall.at[1], it); B.msg('It falls into the darkness below.'); return; }
  B.dropAt(S.floor, x, y, it);
};
/** ○ (G): throw the Hand's item down the facing line */
B.cmdThrow = () => {
  const S = B.S, P = S.party; if (!P.hand || S.over) return;
  const thrower = B.partyOrder().find(m => m.state === 'ok') || B.alive()[0]; if (!thrower) return;
  const it = P.hand, d = B.def(it); P.hand = null;
  const range = B.T.throwRange + (B.stat(thrower, 'str') >= 16 ? 1 : 0);
  let dmg = 0; if (d.throw || d.kind === 'weapon') dmg = Math.max(1, B.dice(d.dmg) + B.mod(B.stat(thrower, 'str')));
  else dmg = B.dice('1d2');
  B.launch({ kind: 'item', item: it, by: thrower.id, dmg, range, speed: 8, hitBonus: B.toHitBonus(thrower) + B.mod(B.stat(thrower, 'str')) + (thrower.race === 'halfling' ? 1 : 0) });
  B.sfx('throw'); B.ev('swing', { m: thrower.id, family: 'throw', side: B.colOf(thrower) });
};
