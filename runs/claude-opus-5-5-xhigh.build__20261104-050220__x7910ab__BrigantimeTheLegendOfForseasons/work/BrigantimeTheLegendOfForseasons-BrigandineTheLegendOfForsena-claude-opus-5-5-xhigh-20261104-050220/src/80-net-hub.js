// AI HUB (Session Protocol v1, shared world): "Banners of the Wheel" for 2 to 4 players. The host's BattleSim is the
// authority. Every command it applies (its own player's, a client's, or the AI's at a deadline) goes to every copy as
// { t: 'ev', n, cmd }; the sim is deterministic, so each copy applies the same commands in the same order and animates
// the events it gets. Snapshots ({ t: 'snap', n, state }) go out at each bell's start and on request ('need'). Clients
// send only their own troop's commands ('cmd') and their cursor ('cur', unreliable, at most 4 a second). A troop's turn
// lasts 15 s on AIHub.time(); then the host plays the rest with the battle AI (AUTO). The driver runs on its own
// setInterval(50), outside the engine's pausable update, so a pause menu never stalls the host.

const NH = G.hub = { active: false, info: null };
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const HUB = () => (typeof window !== 'undefined' && window.AIHub) || null;
NH.isSession = () => { const h = HUB(); return !!(h && h.active); };

/** connect at boot (in a session): build the round and wait for its start */
NH.begin = async () => {
  const H = HUB(); if (!H || !H.active) return false;
  NH.active = true;
  if (G.detectTouchOnly() && !G.forceTouchOnly) { try { H.fail('Controller or keyboard required'); } catch (e) { /* the hub is gone */ } }
  let info = null;
  try { info = await H.connect({ mode: 'shared-world', seats: [2, 4] }); } catch (e) { info = null; }
  if (!info) { NH.active = false; G.game.go('title'); return false; }
  NH.info = info; NH.isHost = !!info.isHost; NH.server = !!info.server; NH.me = info.me;
  NH.players = info.players.slice();
  // seats: with two players, the NE and SW corners; else seat i takes realm i
  const n = NH.players.length, seats = n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n);
  NH.seatOf = {}; NH.players.forEach((p, i) => { NH.seatOf[p.id] = seats[i]; });
  const rng = H.rng('battle'), seed = Math.floor(rng() * 1e9) + 1;
  const sides = NH.players.map((p, i) => ({ realm: G.SEAT_REALM[seats[i]], ctl: 'human', level: 10 }));
  const spec = G.skirmishSpec({ map: 'wheel_shrine', season: 'wheel', sides, seed });
  spec.sides.forEach((sd, i) => { sd.seat = seats[i]; sd.color = G.SEAT_COLORS[i] || sd.color; sd.name = String(NH.players[i].name || 'P' + (i + 1)).slice(0, 12); sd.human = true; });
  NH.sideOfPlayer = {}; NH.players.forEach((p, i) => { NH.sideOfPlayer[p.id] = i; });
  NH.mySide = NH.server ? -1 : NH.sideOfPlayer[NH.me];
  NH.n = 0; NH.q = []; NH.cursors = {}; NH.lastCur = 0; NH.deadline = null; NH.auto = {}; NH.over = false; NH.ended = false; NH.started = false; NH.left = {};
  NH.sim = G.BattleSim.create(spec);
  NH.ctx = {
    kind: 'hub', region: 'hour', playerSide: NH.mySide < 0 ? undefined : NH.mySide, speed: 2,
    sides: spec.sides.map((sd, i) => (i === NH.mySide ? 'human' : 'remote')),
    names: spec.sides.map(sd => sd.name),
    net: NH.net, onEnd: () => NH.roundOver()
  };
  // messages, leaving, time-up, the end
  H.on('message', (data, from) => NH.receive(data, from));
  H.on('leave', ({ id }) => NH.leave(id));
  H.on('time-up', () => { if (NH.isHost) NH.finish('time-up'); });
  H.on('end', ({ reason, standings }) => NH.end(reason, standings));
  H.on('start', () => { NH.started = true; });
  G.game.go('battle', { spec, sim: NH.sim, ctx: NH.ctx }, { fade: 0 });
  NH.timer = setInterval(() => { try { NH.tick(); } catch (e) { G.game.fail('hub', e); } }, 50);
  H.ready();
  return true;
};
/** the scene's network hooks */
NH.net = {
  get isHost() { return NH.isHost; },
  get cursors() { return NH.cursors; },
  /** a local player's command: the host applies it; a client sends it */
  send(cmd) { const H = HUB(); if (!H || NH.over) return; H.send({ t: 'cmd', seq: (NH.seq = (NH.seq || 0) + 1), cmd }, { to: NH.info.host }); },
  /** the host applied a command: broadcast it, and the turn's deadline */
  applied(cmd, ev) {
    if (!NH.isHost) return;
    NH.n++; HUB().send({ t: 'ev', n: NH.n, cmd });
    for (const e of ev) {
      if (e.e === 'bell') NH.snap();
      if (e.e === 'turn') { const tr = NH.sim.troop(e.troop); NH.deadline = HUB().time() + (G.TUNE_DEFAULTS.hubTurnSeconds * 1000); HUB().send({ t: 'turn', n: NH.n, seat: tr.side, troop: e.troop, deadline: NH.deadline }); }
    }
    if (NH.sim.s.over && !NH.over) NH.finish('over');
  },
  tick() {}
};
/** the battle may play only once the round has started (AIHub.time() >= 0) */
NH.waiting = () => { const H = HUB(); return NH.active && (!H || !(H.time() >= 0)); };
NH.snap = () => { if (NH.isHost) HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }); };
NH.receive = (m, from) => {
  if (!m || typeof m !== 'object' || NH.ended) return;
  if (NH.isHost) {
    if (m.t === 'cmd') {
      const side = NH.sideOfPlayer[from], tr = NH.sim.activeTroop();
      if (!tr || tr.side !== side || NH.auto[tr.id] || !NH.sim.legal(m.cmd) || !['move', 'undo', 'act', 'guard', 'wait', 'retreat', 'end'].includes(m.cmd.t)) { HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }, { to: from }); return; }
      const ev = NH.sim.apply(m.cmd); G.Battle.queue(ev); NH.net.applied(m.cmd, ev);
    } else if (m.t === 'need') HUB().send({ t: 'snap', n: NH.n, state: NH.sim.serialize() }, { to: from });
    else if (m.t === 'cur' && Array.isArray(m.cell)) { NH.cursors[NH.seatOfSide(NH.sideOfPlayer[from])] = m.cell; HUB().send({ t: 'cur', seat: NH.seatOfSide(NH.sideOfPlayer[from]), cell: m.cell }, { reliable: false }); }
    return;
  }
  if (from !== NH.info.host) return;
  if (m.t === 'ev') { NH.q.push(m); NH.q.sort((a, b) => a.n - b.n); NH.drain(); }
  else if (m.t === 'snap') {
    if (m.n >= NH.n) { const cur = NH.sim.serialize(); if (cur !== m.state) { const st = JSON.parse(m.state); Object.keys(NH.sim.s).forEach(k => delete NH.sim.s[k]); Object.assign(NH.sim.s, st); NH.sim.dirty(); G.Battle.q = []; } NH.n = m.n; NH.q = NH.q.filter(x => x.n > NH.n); NH.drain(); }
  }
  else if (m.t === 'turn') NH.deadline = m.deadline;
  else if (m.t === 'cur' && m.seat !== NH.seatOfSide(NH.mySide)) NH.cursors[m.seat] = m.cell;
  else if (m.t === 'over') { NH.over = true; NH.standings = m.standings; NH.glory = m.glory; }
};
NH.seatOfSide = side => (NH.sim && NH.sim.s.sides[side] ? NH.sim.s.sides[side].seat : side);
/** a client applies the host's commands strictly in order; a gap asks for a snapshot */
NH.drain = () => {
  while (NH.q.length && NH.q[0].n === NH.n + 1) { const m = NH.q.shift(); NH.n = m.n; const ev = NH.sim.apply(m.cmd); G.Battle.queue(ev); }
  if (NH.q.length && NH.q[0].n > NH.n + 1 && !NH.asked) { NH.asked = true; HUB().send({ t: 'need', n: NH.n }); setTimeout(() => { NH.asked = false; }, 1500); }
};
/** every 50 ms: deadlines (host), the cursor (clients), heartbeats */
NH.tick = () => {
  const H = HUB(); if (!H || NH.ended) return;
  // Create + Options belong to the hub
  if (G.game.input.down('create')) G.game.input.suppress('pause');
  if (!(H.time() >= 0)) return;
  if (NH.isHost && !NH.over) {
    const tr = NH.sim.activeTroop();
    if (tr && NH.deadline === null) { NH.deadline = H.time() + G.TUNE_DEFAULTS.hubTurnSeconds * 1000; H.send({ t: 'turn', n: NH.n, seat: tr.side, troop: tr.id, deadline: NH.deadline }); NH.snap(); }
    if (tr && !NH.auto[tr.id] && NH.deadline !== null && H.time() > NH.deadline) { NH.auto[tr.id] = true; G.Battle.delegated[tr.id] = true; G.UI.toast((NH.sim.s.sides[tr.side].name || 'A player') + ': AUTO', '#ffd060'); }
    if (tr && G.Battle.delegated[tr.id] && G.game.sceneName === 'battle') { /* the scene's AI plays it, at its own pace */ }
  }
  const now = performance.now();
  if (!NH.isHost && !NH.server && now - NH.lastCur > 260) {
    const c = G.Battle.cursor; const key = c ? c.join(',') : '';
    if (key !== NH.lastKey || now - NH.lastCur > 2000) { NH.lastKey = key; NH.lastCur = now; H.send({ t: 'cur', seat: NH.seatOfSide(NH.mySide), cell: c || [0, 0] }, { reliable: false }); }
  }
  if (NH.isHost && now - (NH.lastSnap || 0) > 3000) { NH.lastSnap = now; NH.snap(); }
};
NH.leave = id => {
  NH.left[id] = true;
  if (!NH.isHost || NH.over) return;
  const side = NH.sideOfPlayer[id]; if (side === undefined) return;
  const tr = NH.sim.s.troops.find(t => t.side === side && !t.gone);
  if (tr) { const k = NH.sim.unit(tr.knight); if (NH.sim.activeTroop() && NH.sim.activeTroop().id === tr.id) { const ev = NH.sim.apply({ t: 'retreat', u: k.id }); G.Battle.queue(ev); NH.net.applied({ t: 'retreat', u: k.id }, ev); } else { NH.auto[tr.id] = true; G.Battle.delegated[tr.id] = true; } }
  const remaining = NH.players.filter(p => !NH.left[p.id]);
  if (remaining.length < 2) NH.finish('leave');
};
/** the host ends the round: standings by glory (ties share a place), scores, stats, awards */
NH.finish = why => {
  if (!NH.isHost || NH.finished) return; NH.finished = true; NH.over = true;
  const s = NH.sim.s, ids = NH.players.filter(p => !NH.left[p.id]).map(p => p.id);
  const glory = {}, stats = {}; for (const p of NH.players) { const sd = NH.sideOfPlayer[p.id]; glory[p.id] = Math.floor(s.glory[sd] || 0); stats[p.id] = { damage: s.stats[sd].damage, kos: s.stats[sd].kos, shrine: s.stats[sd].shrine }; }
  const ranked = ids.slice().sort((a, b) => glory[b] - glory[a] || a - b), standings = [];
  for (const id of ranked) { const last = standings[standings.length - 1]; if (last && glory[last[0]] === glory[id]) last.push(id); else standings.push([id]); }
  const best = (f) => ids.slice().sort((a, b) => stats[b][f] - stats[a][f] || a - b)[0];
  const standing = ids.filter(id => { const sd = NH.sideOfPlayer[id]; return NH.sim.sideKnights(sd).length > 0; });
  const awards = [{ id: best('shrine'), title: 'Shrine Keeper', detail: 'Held the Hour Shrine longest' }, { id: best('kos'), title: 'Giant Slayer', detail: 'The most foes routed' }];
  if (standing.length === 1) awards.push({ id: standing[0], title: 'Last Standing', detail: 'The last banner on the field' });
  NH.standings = standings; NH.glory = glory;
  try { HUB().send({ t: 'over', standings, glory }); HUB().finish({ standings, scores: glory, stats, awards }); } catch (e) { G.game.fail('hub finish', e); }
};
NH.end = (reason, standings) => {
  NH.ended = true; NH.over = true; NH.endReason = reason; if (standings) NH.standings = standings;
  clearInterval(NH.timer);
  try { G.game.audio.stopMusic(.1); G.game.audio.mute(true); } catch (e) { /* no sound */ }
  G.muteAll = true;
  G.game.go('hubOver', {}, { fade: .3 });
};
NH.roundOver = () => { if (NH.isHost) NH.finish('over'); G.game.go('hubOver', {}, { fade: .3 }); };
/** the round is over: the standings until the hub removes the game */
G.SCENES.hubOver = {
  view: 'threequarter', input: G.PRESET,
  update() { G.game.input.consumeAll(); },
  draw(r) {
    r.sky(['#0a0814', '#1a1430', '#2a2050']);
    r.overlay(g => {
      const k = G.UI.k(), W = r.W;
      G.UI.title(g, 'ROUND OVER', W / 2, 20, { scale: 3 });
      const st = NH.standings || [], gl = NH.glory || {};
      let y = 64; st.forEach((ids, place) => ids.forEach(id => { const p = NH.players.find(q => q.id === id); const sd = NH.sideOfPlayer[id]; G.UI.text(g, (place + 1) + '. ' + (p ? String(p.name).slice(0, 14) : 'P' + id) + (id === NH.me ? ' (you)' : '') + '  ' + (gl[id] || 0) + ' glory', W / 2, y, G.SEAT_COLORS[NH.seatOfSide(sd)] || '#ffffff', { align: 'center' }); y += 14 * k; }));
      if (!st.length) G.UI.text(g, NH.endReason === 'host-left' ? 'The host left: the round is void.' : 'Waiting for the results...', W / 2, 70, '#e8e4f0', { align: 'center' });
    });
  }
};

/** while the session connects: the boot screen's look, no prompts */
G.SCENES.hubWait = {
  view: 'threequarter', input: G.PRESET,
  update() {},
  draw(r) { r.sky(['#0a0814', '#1a1430', '#2a2050']); r.overlay(g => { E.font.title(g, 'BRIGANTIME', r.W / 2, r.H / 2 - 30, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', align: 'center' }); G.UI.text(g, 'Banners of the Wheel: joining the round...', r.W / 2, r.H / 2 + 10, '#e8e4f0', { align: 'center' }); }); }
};
