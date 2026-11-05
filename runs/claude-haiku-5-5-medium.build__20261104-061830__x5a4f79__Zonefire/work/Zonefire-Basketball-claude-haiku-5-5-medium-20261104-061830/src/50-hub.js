/* ---- AI HUB (plan §15; the protocol is vendor/hub-harness/README.md): HUB SHOWDOWN, a shared world. The host's copy runs the
 * match with every human slot fed from the network; the other copies send their player's input (15 a second, unreliable)
 * and render the host's snapshots (15 a second, under 1.1 KB) with the host's events replayed once each. Outside a session
 * (HUB false, or connect() gives null) none of this runs and the game is the standalone game. ---- */
const HUB_SEATS = [0, 2, 1, 3];                   // seat i plays the slot HUB_SEATS maps: seats 0 and 2 HOME, 1 and 3 AWAY
const seatSlot = seat => HUB_SEATS[seat] !== undefined ? [0, 2, 1, 3][seat] : -1;
const HUB_PHASE = { tipoff: 0, live: 1, dead: 2, inbound: 3, break: 4, over: 5 }, HUB_PHASE_R = ['tipoff', 'live', 'dead', 'inbound', 'break', 'over'];
const HUB_STATE = { run: 0, gather: 1, jump: 2, dunk: 3, knocked: 4, steal: 5, shove: 6, spin: 7 }, HUB_STATE_R = ['run', 'gather', 'jump', 'dunk', 'knocked', 'steal', 'shove', 'spin'];
const HUB_BALL = { held: 0, dribble: 1, pass: 2, shot: 3, loose: 4, dead: 5, inbound: 6 }, HUB_BALL_R = ['held', 'dribble', 'pass', 'shot', 'loose', 'dead', 'inbound'];
S.net = { role: null, seat: -1, slotOf: {}, inputs: {}, lastSnap: null, snapN: 0, sentAt: 0, evId: 0, evSent: 0, lastRecv: -1, void: false, hostLeft: false, endReason: null, cardInfo: null, started: false, ready: false, finished: false, seq: 0 };

/** a network input: a remote player's buttons as the host reads them (the same surface as the engine's input, so the match
 * runs its one command path for every human) */
const netInput = seat => {
  const I = { move: () => (S.net.inputs[seat] || {}).m || [0, 0], held: {}, edge: {}, lastDevice: 'keyboard', pressed: {}, released: {}, seat, label: a => a };
  I.down = a => !!(S.net.inputs[seat] && S.net.inputs[seat].h && S.net.inputs[seat].h[a]);
  I.pressed = a => !!(S.net.inputs[seat] && S.net.inputs[seat].p && S.net.inputs[seat].p[a]);
  I.released = a => !!(S.net.inputs[seat] && S.net.inputs[seat].r && S.net.inputs[seat].r[a]);
  I.consume = a => { if (S.net.inputs[seat] && S.net.inputs[seat].p) S.net.inputs[seat].p[a] = false; };
  I.anyPressed = () => false;
  return I;
};
/** the host applies a client's message: its stick and held buttons, and each edge once (by id, in order) */
const netApply = (seat, msg) => {
  const st = S.net.inputs[seat] || (S.net.inputs[seat] = { m: [0, 0], h: {}, p: {}, r: {}, lastE: -1 });
  st.m = [msg.m[0] / 64, msg.m[1] / 64];
  st.h = {};
  const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
  for (let i = 0; i < names.length; i++) if (msg.h & (1 << i)) st.h[names[i]] = true;
  for (const [id, bit, down] of msg.e || []) {
    if (id <= st.lastE) continue;
    st.lastE = id;
    const a = names[bit]; if (!a) continue;
    if (down) { st.p[a] = true; st.h[a] = true; } else { st.r[a] = true; st.h[a] = false; }
  }
  st.stamp = S.match ? S.match.t : 0;
};
/** each step the host clears the one-step edges after the match has read them */
const netClearEdges = () => { for (const st of Object.values(S.net.inputs)) { st.p = {}; st.r = {}; } };

/** the snapshot: the match's numbers, the ball, every player, and the events of the last second (once each on the copies) */
const netSnapshot = () => {
  const m = S.match, b = S.ball;
  const g = [HUB_PHASE[m.phase] ?? 1, m.quarter, Math.round(m.clock * 10), Math.round(m.shotClock * 10), m.score[0], m.score[1], m.poss === null ? -1 : m.poss, (m.sudden ? 1 : 0) | (m.dead ? 2 : 0)];
  const bl = [Math.round(b.x), Math.round(b.y), Math.round(b.z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), b.owner ? b.owner.slot : -1, HUB_BALL[b.state] ?? 4];
  const p = S.players.map(q => [Math.round(q.body.x), Math.round(q.body.y), Math.round(q.body.z), Math.round(q.body.vx), Math.round(q.body.vy), Math.round(q.face * 100), HUB_STATE[q.state] ?? 0, Math.round(q.stateT * 100), Math.round(q.turbo * 100), (q.onCourt ? 1 : 0) | (q.hasBall ? 2 : 0) | (q.nova ? 4 : 0) | (q.knocked > 0 ? 8 : 0) | (q.human ? 16 : 0) | (q.dunk ? 32 : 0)]);
  const ev = S.events.filter(e => e.id > S.net.evSent && HUB_REPLAY.includes(e.type)).slice(-12).map(e => [e.id, e.type, e.slot ?? -1, e.side ?? -1, e.points || 0, e.dunk || '', e.blocked ? 1 : 0, e.three ? 1 : 0, e.victim ?? -1]);
  if (ev.length) S.net.evSent = ev[ev.length - 1][0];
  return { t: 's', n: ++S.net.snapN, a: +(AIHub.time() || 0).toFixed(3), g, b: bl, p, ev };
};
/** the events worth showing on the copies (captions, banners, sounds, the goal and the dunk) */
const HUB_REPLAY = ['basket', 'dunkStart', 'dunk', 'block', 'steal', 'shove', 'knockdown', 'shatter', 'supernovaOn', 'supernovaOff', 'goaltend', 'alleyoop', 'ankles', 'quarterEnd', 'halftime', 'overtime', 'gameEnd', 'tipoff', 'quarterStart', 'powerupPick', 'twist', 'reboot', 'spin', 'land'];
/** a copy applies a snapshot: the match's numbers and every body, then replays the events it has not played yet */
const netApplySnapshot = msg => {
  const g = msg.g, m = S.match; if (!m) return;
  m.phase = HUB_PHASE_R[g[0]] || 'live'; m.quarter = g[1]; m.clock = g[2] / 10; m.shotClock = g[3] / 10; m.score = [g[4], g[5]]; m.poss = g[6] < 0 ? null : g[6]; m.sudden = !!(g[7] & 1); m.dead = !!(g[7] & 2);
  const b = S.ball, bl = msg.b; b.x = bl[0]; b.y = bl[1]; b.z = bl[2]; b.vx = bl[3]; b.vy = bl[4]; b.vz = bl[5]; b.state = HUB_BALL_R[bl[7]] || 'loose';
  b.owner = bl[6] >= 0 ? S.players[bl[6]] : null;
  msg.p.forEach((q, i) => {
    const p = S.players[i]; if (!p) return;
    p.body.x = q[0]; p.body.y = q[1]; p.body.z = q[2]; p.body.vx = q[3]; p.body.vy = q[4]; p.face = q[5] / 100;
    p.state = HUB_STATE_R[q[6]] || 'run'; p.stateT = q[7] / 100; p.turbo = q[8] / 100;
    const f = q[9]; p.onCourt = !!(f & 1); p.hasBall = !!(f & 2); p.nova = !!(f & 4); p.knocked = (f & 8) ? 1 : 0; p.dunk = (f & 32) ? { net: true } : null;
    p.air = q[2] > 1; p.rig.update(1 / 30, rigState(p));
  });
  S.players.forEach((p, i) => { if (p.onCourt) p.rig.update(0, rigState(p)); });
  for (const e of msg.ev || []) {
    if (e[0] <= S.net.lastRecv) continue;
    S.net.lastRecv = e[0];
    const data = { slot: e[2] >= 0 ? e[2] : undefined, side: e[3] >= 0 ? e[3] : undefined, points: e[4], dunk: e[5] || null, blocked: !!e[6], three: !!e[7], victim: e[8] >= 0 ? e[8] : undefined };
    S.netReplay = true; try { emit(e[1], data); } finally { S.netReplay = false; }
  }
};

/** the roster of a session: two street crews from the seed (the same on every copy) with the HOME court */
const hubRoster = () => {
  const R = AIHub.rng('roster'), ok = all('team').filter(t => !t.locked && !t.secret);
  const a = ok[Math.floor(R() * ok.length)], rest = ok.filter(t => t.id !== a.id), b = rest[Math.floor(R() * rest.length)];
  return { home: a.id, away: b.id, court: a.court };
};
/** the host's round: the match with every seat's human; empty seats are CPU (Pro); the round's rules (§15.2) */
const hubBuild = (info) => {
  const r = hubRoster();
  S.setup = { home: r.home, away: r.away, court: r.court, qLen: 90, difficulty: 'Pro', powerups: true, twists: true, mode: 'hub' };
  const humans = [];
  info.players.forEach((pl, seat) => { const slot = seatSlot(seat); if (slot >= 0) humans.push({ slot, input: seat === S.net.seat ? game.input : netInput(seat), seat }); });
  S.hubHumans = humans;
  S.net.slotOf = {};
  for (const h of humans) S.net.slotOf[h.seat] = h.slot;
  game.allowJoin && game.allowJoin(false);
  S.cheats = {};
  setupMatch({ court: r.court, home: r.home, away: r.away, qLen: 90, humans: humans.map(h => ({ slot: h.slot, input: h.input })), powerups: true, twists: true, mode: 'hub' });
  S.hubReady = true;
  S.match.hubHalves = true;
};
/** the card's answers and the card's state (the hub's card reads them; the game's own card is the scene 'hubcard') */
S.hubCardInfo = null;
on('card', () => {});

/** the network's step (each frame): the host sends snapshots and reads inputs; a copy sends its input and applies the last
 * snapshot. Outside a session this never runs. */
const hubStep = dt => {
  if (!HUB || !S.net.role) return;
  const net = S.net;
  net.sendT = (net.sendT || 0) + dt;
  if (net.sendT >= 1 / 15) {
    net.sendT = 0;
    if (net.role === 'host' && S.hubReady && S.match && S.match.t > 0) AIHub.send(netSnapshot(), { reliable: false });
    if (net.role === 'client' && net.seat >= 0) {
      const I = game.input, mv = I.move();
      const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
      let h = 0; names.forEach((a, i) => { if (I.down(a)) h |= 1 << i; });
      const e = (net.edges || []);
      AIHub.send({ t: 'i', s: ++net.seq, a: +(AIHub.time() || 0).toFixed(3), m: [Math.round(mv[0] * 64), Math.round(mv[1] * 64)], h, e: e.slice(-8) }, { reliable: false });
      net.edges = [];
    }
  }
  if (net.role === 'client' && net.seat >= 0) {   /* the presses and releases since the last send, as edges (each id once) */
    const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
    names.forEach((a, i) => { if (game.input.pressed(a)) netEdge(i, true); if (game.input.released(a)) netEdge(i, false); });
  }
  if (net.role === 'host') netClearEdges();
};
/** a client's buttons pressed this step: the edges go out with the next input (each id once, in order) */
const netEdge = (bit, down) => { const net = S.net; net.edgeId = (net.edgeId || 0) + 1; (net.edges = net.edges || []).push([net.edgeId, bit, down ? 1 : 0]); };

/** the hub's messages: a host reads a client's input; a copy reads the host's snapshot */
const hubMessage = (data, from) => {
  if (!data || typeof data !== 'object') return;
  if (S.net.role === 'host' && data.t === 'i') {
    const seat = from;
    if (S.net.slotOf[seat] === undefined) return;
    if (data.s !== undefined && (S.net.inputs[seat] || {}).lastS >= data.s) return;
    netApply(seat, data); (S.net.inputs[seat] || {}).lastS = data.s;
  } else if (S.net.role === 'client' && data.t === 's') {
    if (data.n > (S.net.lastSnapN || 0)) { S.net.lastSnapN = data.n; S.net.lastSnap = data; S.net.lastSnapT = game.time; netApplySnapshot(data); }
  }
};

/** the result the host sends the hub: each team's humans, the scores and the box score (the hub's standings) */
const hubFinish = () => {
  if (S.net.finished) return; S.net.finished = true;
  const m = S.match, hs = [], as = [], scores = {}, stats = {};
  for (const [seat, slot] of Object.entries(S.net.slotOf)) { const p = S.players[slot]; if (!p) continue; scores[seat] = p.side === HOME ? m.score[0] : m.score[1]; stats[seat] = { PTS: p.stats.pts, DUNKS: p.stats.dunks, STL: p.stats.stl, BLK: p.stats.blk }; (p.side === HOME ? hs : as).push(+seat); }
  let standings;
  if (m.score[0] === m.score[1]) standings = [hs.concat(as)];
  else standings = m.score[0] > m.score[1] ? [hs, as] : [as, hs];
  const awards = Object.keys(stats).slice(0, 3).map((id, i) => ({ id: +id, title: ['Dunk of the Round', 'Pickpocket', 'Wall'][i], detail: '' }));
  if (HUB && AIHub.isHost) AIHub.finish({ standings, scores, won: m.score[0] !== m.score[1] ? undefined : undefined, stats, awards });
};
on('gameEnd', () => { if (S.net.role === 'host' && S.hubReady) hubFinish(); });
