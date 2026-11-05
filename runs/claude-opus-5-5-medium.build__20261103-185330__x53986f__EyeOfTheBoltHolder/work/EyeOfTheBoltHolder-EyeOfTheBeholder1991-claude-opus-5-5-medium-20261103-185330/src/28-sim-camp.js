/* SIM: camp (rest with its interruptions, memorize, pray, scribe, formation, eat), experience and levels, NPCs joining
 * and leaving, and dialogue as data (the talk the UI shows and the bot answers). */
B.enemiesNear = () => { const P = B.S.party; return B.FS().mons.some(m => m.hp > 0 && m.aware && B.manh(m.cx, m.cy, P.cx, P.cy) <= 6); };
B.cmdCamp = op => {
  const S = B.S, P = S.party;
  if (op === 'open') {
    if (S.over || S.race) return false;
    if (B.enemiesNear()) { B.msg('You may not rest with enemies near.'); return false; }
    S.camp = { rest: null }; B.ev('camp', { open: true }); return true;
  }
  if (!S.camp) return false;
  if (op === 'close') { S.camp = null; B.ev('camp', { open: false }); return true; }
  if (op === 'rest') {
    if (B.F().noRest) { B.msg('The air hums too loudly here to sleep.'); return false; }
    S.camp.rest = { hours: 0, t: 0, mended: false }; S.stats.rests++; B.ev('rest', { on: true }); return true;
  }
  if (op === 'stopRest') { if (S.camp.rest) B.endRest(false); return true; }
  if (op === 'eat') return B.campEat();
  return false;
};
B.campEat = () => {
  const S = B.S, ate = [];
  for (const m of S.party.members) {
    if (m.state !== 'ok' || m.food >= 60) continue;
    const f = B.findItem(it => B.def(it).kind === 'food' && it.id === 'ration') || B.findItem(it => B.def(it).kind === 'food');
    if (!f) break;
    const d = B.def(f.it); m.food = Math.min(100, m.food + d.food); if (f.it.n > 1) f.it.n--; else B.removeFound(f); ate.push(m.name + ' eats a ' + d.name.toLowerCase() + '.');
  }
  if (!ate.length) ate.push(S.party.members.some(m => m.state === 'ok' && m.food < 60) ? 'You have nothing to eat.' : 'No one is hungry.');
  for (const t of ate) B.msg(t); B.sfx('eat'); B.ev('ate', { lines: ate }); return true;
};
/** resting: an hour every 0.4 s; heals; clerics mend first; slots refill after 8 hours; may be interrupted */
B.updateRest = dt => {
  const S = B.S, R = S.camp && S.camp.rest; if (!R) return;
  R.t += dt; if (R.t < .4) return; R.t -= .4; R.hours++;
  const P = S.party, FS = B.FS();
  if (!R.mended) {
    R.mended = true;
    for (const c of P.members.filter(m => m.state === 'ok')) for (const e of c.mem) if (e.ready && (e.s === 'mend' || e.s === 'greaterMend')) {
      const t = P.members.filter(m => m.state !== 'dead' && m.hp < m.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!t) break;
      e.ready = false; B.healMember(t, B.dice(e.s === 'mend' ? '1d8' : '3d8') + 1 + Math.floor(c.lvl / 2)); B.msg(c.name + ' mends ' + t.name + '.');
    }
  }
  for (const m of P.members) {
    if (m.state !== 'ok') continue;
    if (m.food > 0) m.hp = Math.min(m.max, m.hp + Math.max(1, Math.round((1 + B.mod(B.stat(m, 'con'))) * B.T.restHeal)));
    m.food = Math.max(0, m.food - 15 / 8 * B.T.hunger * B.diff().hunger * (B.CHEATS.noHunger ? 0 : 1));
  }
  // an interruption: a wanderer group, two cells away and aware
  const W = B.F().wanderers;
  if (W && FS.wanderers > 0 && !B.safeCell(P.cx, P.cy) && B.rng('world') < B.T.restInt / 100 * B.diff().rest) {
    FS.wanderers--; const [type, n] = W.types[Math.floor(B.rng('world') * W.types.length)];
    const at = W.at.slice().sort((a, b) => B.manh(a[0], a[1], P.cx, P.cy) - B.manh(b[0], b[1], P.cx, P.cy))[0];
    for (let i = 0; i < n; i++) { const m = B.spawnMon(S.floor, type, at[0], at[1], {}); if (m) { m.aware = true; m.state = 'hunt'; m.lastSeen = S.time; } }
    B.msg('You are awakened by something moving!', '#e0463c'); B.endRest(true); S.camp = null; B.ev('camp', { open: false, woken: true }); return;
  }
  const full = P.members.every(m => m.state !== 'ok' || m.hp >= m.max) && P.members.every(m => m.mem.every(e => e.ready));
  if (R.hours >= 8) B.endRest(true);
  else if (full && R.hours >= 1) B.endRest(false);
};
B.endRest = (fullRest) => {
  const S = B.S, R = S.camp && S.camp.rest; if (!R) return;
  const P = S.party;
  if (fullRest || R.hours >= 8) {
    for (const m of P.members) {
      if (m.state === 'down') { m.state = 'ok'; m.hp = 1; B.msg(m.name + ' wakes.'); }
      if (m.state !== 'ok') continue;
      for (const e of m.mem) e.ready = true; m.ward = 0; if (m.cls === 'P') m.loh = 1;
      if (m.pendingLevels) { const n = m.pendingLevels; m.pendingLevels = 0; for (let i = 0; i < n; i++) B.levelUp(m); }
    }
    B.msg('The party rests ' + R.hours + ' hours.');
  } else B.msg('The party rests ' + R.hours + (R.hours === 1 ? ' hour.' : ' hours.'));
  S.camp.rest = null; B.ev('rest', { on: false });
};
B.cmdFormation = (a, b) => { const F = B.S.party.formation; while (F.length < 6) F.push(undefined); const t = F[a]; F[a] = F[b]; F[b] = t; while (F.length && F[F.length - 1] === undefined) F.pop(); B.sfx('uiConfirm'); };
B.cmdMemorize = (mi, op, s, idx) => {
  const m = B.S.party.members[mi]; if (!m) return false;
  if (op === 'add') return B.memAdd(m, s, false);
  if (op === 'remove') { m.mem.splice(idx, 1); return true; }
  return false;
};
B.layOnHands = (mi, ti) => { const m = B.S.party.members[mi], t = B.S.party.members[ti]; if (!m || m.cls !== 'P' || !m.loh || !t || t.state === 'dead') return false; m.loh = 0; B.healMember(t, 2 * m.lvl); B.msg(m.name + ' lays hands on ' + t.name + '.'); B.sfx('heal'); return true; };

/* ---- experience and levels ---- */
B.levelFor = xp => { let l = 1; while (l < 8 && xp >= B.XP_LEVELS[l]) l++; return l; };
B.gainXp = (m, n, flat) => {
  if (m.state === 'dead') return;
  const c = B.CLASSES[m.cls]; let g = n * B.T.xp; if (!flat) g *= c.xpX * (m.race === 'human' ? 1.05 : 1);
  m.xp += g;
  const want = B.levelFor(m.xp), have = m.lvl + (m.pendingLevels || 0);
  if (want > have) {
    if ((B.settingLevelUp || 'now') === 'rest' && B.S.mode === 'campaign') { m.pendingLevels = (m.pendingLevels || 0) + want - have; B.msg(m.name + ' feels ready to grow, after a rest.'); }
    else for (let i = have; i < want; i++) B.levelUp(m);
  }
};
B.levelUp = m => {
  const c = B.CLASSES[m.cls]; m.lvl++;
  const gain = Math.max(1, Math.floor(c.die / 2) + 1 + B.mod(B.stat(m, 'con')));
  m.max += gain; if (m.state === 'ok') m.hp += gain;
  B.S.stats.levels++; B.msg(m.name + ' has reached level ' + m.lvl + '!', '#ffd36a'); B.ev('levelUp', { m: m.id }); B.ev('sting', { name: 'levelUp' });
};

/* ---- NPCs ---- */
B.joinNpc = id => {
  const S = B.S, P = S.party; if (P.members.length >= 6) return false;
  const t = Object.assign({ npc: id }, B.NPCS[id]), m = B.makeMember(t, P.members.length);
  P.members.push(m); P.formation.push(P.members.length - 1);
  S.flags['joined_' + id] = 1; B.msg(m.name + ' joins the party.', '#ffd36a'); B.ev('sting', { name: 'npcJoin' }); return true;
};
B.dismiss = mi => {
  const S = B.S, P = S.party, m = P.members[mi]; if (!m || !m.npc) return false;
  for (const it of [...m.pack, ...Object.values(m.slots)]) if (it && B.isQuest(it.id)) B.giveParty(it);
  P.members.splice(mi, 1); P.formation = P.formation.filter(i => i !== mi).map(i => i > mi ? i - 1 : i);
  P.selected = Math.min(P.selected, P.members.length - 1);
  S.flags['dismissed_' + m.npc] = 1; B.msg(m.name + ' bids you farewell and turns for home.'); return true;
};
B.veilHelp = () => {
  if (B.S.party.members.length < 6) B.joinNpc('veil');
  else { B.giveParty(B.item('lidlessWard')); B.msg('Veil presses an amulet into your hand: "Then take this. It kept me sane."'); }
};

/* ---- dialogue: a story's lines, then its choices; the world waits while a story is open (barks do not) ---- */
B.startStory = id => {
  const st = B.STORIES[id]; if (!st) return;
  if (st.bark) { B.S.barks.push({ id, t: B.S.time }); B.ev('bark', { id }); return; }
  if (B.S.talk) { (B.S.talkQueue || (B.S.talkQueue = [])).push(id); return; }
  B.S.talk = { id, i: 0, stage: 'lines', lines: st.lines }; B.ev('talk', { id });
  if (st.do) B.act(st.do);
};
B.cmdTalk = (op, i) => {
  const S = B.S, T = S.talk; if (!T) return false;
  const st = B.STORIES[T.id];
  if (op === 'next') {
    if (T.stage === 'choice') return false;
    T.i++;
    if (T.i < T.lines.length) return true;
    if (T.stage === 'lines' && st.choices) { T.stage = 'choice'; return true; }
    S.talk = null; B.ev('talkEnd', { id: T.id });
    if (S.talkQueue && S.talkQueue.length) B.startStory(S.talkQueue.shift());
    return true;
  }
  if (op === 'choose' && T.stage === 'choice') {
    const c = st.choices[i]; if (!c) return false;
    S.flags['choice_' + T.id] = i; B.act(c.do || []);
    if (c.reply && c.reply.length) { T.stage = 'reply'; T.lines = c.reply; T.i = 0; } else { S.talk = null; B.ev('talkEnd', { id: T.id }); if (S.talkQueue && S.talkQueue.length) B.startStory(S.talkQueue.shift()); }
    return true;
  }
  return false;
};
