/* THE AI HUB ADAPTER (Session Protocol v1, shared world, 1-4 players). The host runs the sim, the AI and the rules for
 * every seat; the other copies send their player's stick and buttons and their play calls, and render the host's
 * snapshots (interpolated). A server host has no player of its own and draws nothing. Seats alternate sides: 0 home,
 * 1 away, 2 home, 3 away; a lone player is home against a CPU away team. One half of football (2 quarters), no
 * overtime: a tie is a tie. Outside a session (AIHub.active false) nothing here runs. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game, S = FF.sim, Y = 16, BIT = FF.BIT;
const POSES = ['IDLE', 'RUN', 'STANCE3', 'STANCE2', 'QB_UC', 'QB_SG', 'SNAP', 'DROPBACK', 'THROW', 'HANDOFF_GIVE', 'HANDOFF_TAKE', 'CARRY', 'CATCH_READY', 'CATCH', 'JUMP', 'DIVE', 'TACKLE_DIVE', 'SPIN', 'STIFFARM', 'HURDLE', 'BLOCK', 'SHED', 'BIGHIT', 'TACKLED', 'FLY', 'DOWN', 'GETUP', 'PILE', 'KICK', 'HOLD', 'CELEBRATE', 'CHEER', 'DEJECTED', 'REF_TD', 'REF_FD', 'REF_INC', 'REF_SHRUG', 'CHEERLEADER', 'COACH_YELL', 'KNEEL', 'STRIP', 'LATERAL', 'DIVE_CATCH', 'SEISMIC', 'MUDSLIDE'];
const PHASES = ['IDLE', 'COIN', 'PLAYCALL', 'PRESNAP', 'LIVE', 'DEAD', 'CELEBRATE', 'QUARTER', 'HALFTIME', 'FINAL'];
const BALLS = ['held', 'pass', 'kick', 'loose', 'dead', 'snap'];
const EVENTS = ['td', 'fg', 'pat', 'int', 'fumble', 'bigHit', 'megaHit', 'sack', 'firstDown', 'hotOn', 'fiascoBreak', 'cardUsed', 'kickoff', 'lateHit', 'safety', 'touchback', 'incomplete', 'catch', 'special', 'final'];
const N = FF.net = {
  active: false, info: null, isHost: false, server: false, seats: [], started: false, ended: false, sentAt: 0, lastSnap: -Infinity, bucket: 18, budgetT: 0, sent: 0, dropped: 0, evQ: [], card: null,
  /** the token bucket: at most 18 messages a second from this copy; reliable messages are never dropped */
  send(data, o = {}) {
    if (N.ended) return false;
    if (o.reliable === false && N.bucket < 1) { N.dropped++; return false; }
    N.bucket = Math.max(0, N.bucket - 1); N.sent++;
    try { return window.AIHub.send(data, o); } catch (e) { game.fail('hub send', e); return false; }
  },
  async start() {
    const H = window.AIHub;
    const info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) { FF.inHub = false; return false; }
    N.active = true; N.info = info; N.isHost = info.isHost; N.server = !!info.server; N.me = info.me;
    const rng = H.rng('setup'), pickI = n => Math.floor(rng() * n);
    const st = FF.data.stadiums[pickI(FF.data.stadiums.length)], teams = FF.data.teams.filter(t => !t.hidden);
    const home = teams[pickI(teams.length)]; let away = teams[pickI(teams.length)]; if (away === home) away = teams[(teams.indexOf(home) + 1) % teams.length];
    N.seats = info.players.map((p, i) => ({ id: p.id, name: p.name, color: p.color, team: i % 2, gone: false }));
    const mine = N.seats.find(s => s.id === N.me);
    const limit = info.limitMs || 300000, q = Math.round(Math.max(45, Math.min(90, (limit / 1000 - 60) / 2 / 1.3)));
    const humans = N.seats.map(s => ({ input: s.id === N.me && !N.server ? game.input : null, team: s.team, remote: !(s.id === N.me && !N.server), seat: s.id, name: s.name, color: s.color }));
    N.spec = { mode: 'hub', hub: true, hubHalf: true, noOT: true, home: home.id, away: away.id, stadium: st.id, qLen: q, humans, difficulty: 'pro', seed: Math.floor(H.rng('match')() * 1e9) + 1, cards: [[FF.data.cards[Math.floor(H.rng('cards')() * 8)].id], [FF.data.cards[Math.floor(H.rng('cards')() * 8)].id]], noSave: true, cpuCallDelay: .6 };
    N.myTeam = mine ? mine.team : -1;
    H.on('card', c => { N.card = c; });
    H.on('start', () => { N.startAt = true; FF.music.play(FF.stadium(st.id).music); });
    H.on('message', (d, from) => N.onMessage(d, from));
    H.on('leave', ({ id }) => { const s = N.seats.find(x => x.id === id); if (s) s.gone = true; const h = FF.control.humans.find(x => x.seat === id); if (h) { h.cpu = true; h.remote = false; if (h.a) { h.a.cpuTag = true; } } });
    H.on('time-up', () => { if (N.isHost) N.finish(); });
    H.on('end', ({ reason }) => { N.ended = true; N.endReason = reason; FF.mute = true; try { game.audio.music(null); game.audio.mute(true); } catch (e) { /* no sound */ } FF.crowdAudio.stop(); });
    game.go('hub', { spec: N.spec });
    return true;
  },
  ready() { if (!N.readied) { N.readied = true; window.AIHub.ready(); } },
  /** each step of the hub scene */
  update(dt) {
    N.bucket = Math.min(18, N.bucket + dt * 18);
    if (N.ended) return;
    const t = window.AIHub.time();
    if (!N.started) { if (N.startAt && t >= 0) { N.started = true; if (N.isHost) S.toPhase('COIN', 1.6); } return; }
    const now = game.real;
    if (N.isHost) {
      if (now - N.sentAt >= 1 / 14) { N.sentAt = now; N.send(N.snapshot(), { reliable: false }); }
      if (N.evQ.length && now - (N.evAt || 0) > .25) { N.evAt = now; N.send({ t: 'e', l: N.evQ.splice(0, 6) }); }
      if (S.phase === 'FINAL' && !N.finished && S.phaseTime > 1.5) N.finish();
    } else {
      const h = FF.control.humans.find(x => x.seat === N.me);
      if (h && h.input && now - N.sentAt >= 1 / 15) {
        N.sentAt = now; const I = h.input, m = I.move(), v = game.view, d = v ? v.screenDirToGround(m[0], m[1]) : m;
        let held = 0; for (const k of ['b1', 'b2', 'b3', 'b4', 'lb', 'rb']) if (I.down(k)) held |= BIT[k];
        const recv = I.down('r1') ? 0 : I.down('r2') ? 1 : I.down('r3') ? 2 : -1;
        N.send({ t: 'i', q: (N.seq = (N.seq || 0) + 1), at: Math.round(window.AIHub.time()), p: h.a && N.predicted ? [Math.round(h.a.b.x), Math.round(h.a.b.y), h.a.id, Math.round(h.a.b.vx), Math.round(h.a.b.vy)] : null, m: [Math.round(d[0] * 100), Math.round(d[1] * 100)], b: held | (N.pressAcc || 0), tb: I.down('turbo') ? 1 : 0, r: recv }, { to: N.info.host, reliable: false });
        N.pressAcc = 0;
      }
      if (h && h.input) for (const k of ['b1', 'b2', 'b3', 'b4', 'lb', 'rb']) if (h.input.pressed(k)) N.pressAcc = (N.pressAcc || 0) | BIT[k];
      // the kick meter runs on the kicking player's own copy; its result goes to the host
      const a = h && h.a, kick = a && a.slot === 'K' && S.phase === 'PRESNAP' && /kickoff|punt|fg/.test(N.kind || '');
      if (kick && h.input) {
        const M = N.meter || (N.meter = { kicker: a, stage: 0, u: 0, ua: 0, power: 0, acc: 0, aim: 0, cpu: false, ph: 0, pa: 0 }), I = h.input, sp = FF.T.meterSpeed;
        if (M.stage === 0 && I.pressed('b1')) M.stage = 1;
        else if (M.stage === 1) { M.ph += dt * sp * 2; const q = M.ph % 2; M.u = q < 1 ? q : 2 - q; M.aim = Math.max(-1, Math.min(1, M.aim + I.move()[0] * .03)); if (I.pressed('b1')) { M.power = M.u; M.stage = 2; FF.sfx('meterSet'); } }
        else if (M.stage === 2) { M.pa += dt * sp * 2; const q = M.pa % 2; M.ua = (q < 1 ? q : 2 - q) * 2 - 1; if (I.pressed('b1')) { M.acc = M.ua; M.stage = 3; FF.sfx('meterSet'); N.send({ t: 'kick', p: Math.round(M.power * 1000) / 1000, a: Math.round(M.acc * 1000) / 1000, m: Math.round(M.aim * 1000) / 1000 }, { to: N.info.host }); } }
      } else N.meter = null;
    }
  },
  /** host: remote players' intents become their held athletes' intents */
  applyRemote() {
    for (const h of FF.control.humans) {
      if (!h.remote || !h.net) continue;
      const n = h.net, it = { mx: n.m[0] / 100, my: n.m[1] / 100, turbo: !!n.tb, press: 0, held: n.b & 63, recv: -1 };
      const fresh = n.q !== h.lastQ; h.lastQ = n.q;
      if (fresh) { it.press = n.b & ~(h.lastHeld || 0); h.lastHeld = n.b; }
      const a = h.a, P = S.play, B = S.ball;
      if (a && B.holder === a && P && !P.passThrown && P.kind === 'pass' && (a.slot === 'QB' || a.slot === 'K')) { if (it.press & BIT.b1) it.recv = 0; if (it.press & BIT.b2) it.recv = 1; if (it.press & BIT.b3) it.recv = 2; if (n.r >= 0) it.recv = n.r; it.press &= ~15; }
      h.netIntent = it;
      // the client's predicted position is accepted unless its athlete is locked (down, engaged, in an action the host started, a dead ball) or the report is too far
      if (fresh && n.p && a && n.p[2] === a.id && S.phase === 'LIVE' && a.down <= 0 && !a.eng && !(a.act && a.act.lunge) && !/TACKLED|DOWN|FLY|PILE|GETUP|BLOCK|DIVE|TACKLE_DIVE|DIVE_CATCH|BIGHIT|HURDLE|JUMP|SEISMIC|MUDSLIDE/.test(a.pose)) {
        const age = Math.max(0, Math.min(.25, (window.AIHub.time() - (n.at || 0)) / 1000)), rx = n.p[0] + (n.p[3] || 0) * age, ry = n.p[1] + (n.p[4] || 0) * age;   // where it is now: the report moved on by its age
        const dx = rx - a.b.x, dy = ry - a.b.y, d = Math.hypot(dx, dy);
        if (d < 6 * 16) { a.b.x = rx; a.b.y = ry; } else h.corr = (h.corr || 0) + 1;
      }
      if (fresh && (it.press & BIT.b2) && a && S.carrier() && S.carrier().team !== h.team) FF.control.switchNearest(h);
    }
  },
  snapshot() {
    const B = S.ball, ctl = {}; for (const h of FF.control.humans) if (h.a && h.seat !== undefined) ctl[h.seat] = h.a.id;
    return { t: 's', at: Math.round(window.AIHub.time()), ph: PHASES.indexOf(S.phase), pt: Math.round((S.phaseTime || 0) * 10), c: Math.round(S.clock * 10), q: S.quarter, sc: S.score, d: [S.down, S.toGo, Math.round(S.los), S.poss, S.mode === 'kickoff' ? 1 : S.mode === 'pat' ? 2 : 0],
      ball: [Math.round(B.x), Math.round(B.y), Math.round(B.z), BALLS.indexOf(B.state), B.holder ? B.holder.id : -1, Math.round(B.tx || 0), Math.round(B.ty || 0)],
      A: S.athletes.map(a => [a.id, Math.round(a.b.x), Math.round(a.b.y), Math.round(a.b.z), Math.round(a.facing * 100), POSES.indexOf(a.pose), Math.round((a.poseU || 0) * 255), (a.hot > 0 ? 2 : 0) | (a.helmetOff ? 8 : 0) | (a.cpuTag ? 32 : 0)]),
      ctl, k: S.play && S.play.kind || '', m: S.meter.map(Math.round), cards: S.cards.map(c => c.length), dir: S.dir, lights: S.lights ? 1 : 0, w: S.winner, calls: [S.calls[0] ? 1 : 0, S.calls[1] ? 1 : 0] };
  },
  /** a client: apply the host's world */
  applySnapshot(s) {
    if (s.at < N.lastSnap) return; N.lastSnap = s.at;
    const prev = S.phase; S.phase = PHASES[s.ph] || 'IDLE'; S.phaseTime = s.pt / 10;
    if (prev !== S.phase) FF.bus.emit('phase', { from: prev, to: S.phase });
    S.clock = s.c / 10; S.quarter = s.q; S.score = s.sc; S.down = s.d[0]; S.toGo = s.d[1]; S.los = s.d[2]; S.poss = s.d[3]; S.mode = s.d[4] === 1 ? 'kickoff' : s.d[4] === 2 ? 'pat' : 'normal'; S.dir = s.dir; S.meter = s.m; S.winner = s.w;
    S.lights = !!s.lights; N.kind = s.k;
    const ids = new Set(s.A.map(r => r[0]));
    for (const a of S.all) a.on = ids.has(a.id);
    S.athletes = S.all.filter(a => a.on);
    for (const r of s.A) { const a = S.athlete(r[0]); if (!a) continue; a.net = { x: r[1], y: r[2], z: r[3] }; a.facing = r[4] / 100; a.pose = POSES[r[5]] || 'IDLE'; a.poseU = r[6] / 255; a.hot = r[7] & 2 ? 1 : 0; a.helmetOff = !!(r[7] & 8); }
    const B = S.ball; B.net = { x: s.ball[0], y: s.ball[1], z: s.ball[2] }; B.state = BALLS[s.ball[3]] || 'dead'; B.holder = s.ball[4] >= 0 ? S.athlete(s.ball[4]) : null; B.tx = s.ball[5]; B.ty = s.ball[6];
    for (const h of FF.control.humans) { const id = s.ctl[h.seat]; const a = id !== undefined ? S.athlete(id) : null; if (h.a && h.a !== a) h.a.ctl = -1; h.a = a; if (a) a.ctl = FF.control.humans.indexOf(h); }
    if (S.phase === 'PLAYCALL' && prev !== 'PLAYCALL') { S.calls = [null, null]; FF.PlayCall.begin(); }
    if (S.phase === 'FINAL') S.over = true;
  },
  /** a client: ease everything toward the newest snapshot (rendered a little behind) */
  interpolate(dt) {
    const k = 1 - Math.exp(-dt / .07);
    // your own player is predicted: it moves now from your stick, eased toward the host's world, snapped back when it differs by over 2 yd or is down
    const me = FF.control.humans.find(h => h.seat === N.me), mine = me && me.a, I = me && me.input;
    if (mine && I && S.phase === 'LIVE' && mine.net && !/TACKLED|DOWN|FLY|PILE|GETUP|BLOCK|DIVE|TACKLE_DIVE|DIVE_CATCH|BIGHIT|HURDLE|JUMP|SEISMIC|MUDSLIDE/.test(mine.pose)) {
      const m = I.move(), d = game.view ? game.view.screenDirToGround(m[0], m[1]) : m, sp = S.topSpeed(mine) * (I.down('turbo') && mine.turbo > .05 ? FF.T.turboMult : 1);
      const b = mine.b; b.vx = d[0] * sp; b.vy = d[1] * sp; b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(d[0], d[1]) > .1) mine.facing = Math.atan2(d[1], d[0]);
      for (const o of S.athletes) { if (o === mine || !o.net) continue; const ox = b.x - o.b.x, oy = b.y - o.b.y, od = Math.hypot(ox, oy), min = b.r + o.b.r; if (od > 0 && od < min) { const k2 = (min - od) * (o.team === mine.team ? .35 : 1); b.x += ox / od * k2; b.y += oy / od * k2; } }   // a soft push from the athletes around, as the host's collisions do
      // the host's view of us is a round trip old: compare it with where we were over the last half second, and snap back only when it matches none of it by 2 yd
      const hist = N.hist || (N.hist = []), now = window.AIHub.time(); hist.push([now, b.x, b.y]); while (hist.length && now - hist[0][0] > 500) hist.shift();
      if (mine.netAt !== N.lastSnap) { mine.netAt = N.lastSnap; let best = 1e9; for (const q of hist) best = Math.min(best, Math.hypot(q[1] - mine.net.x, q[2] - mine.net.y)); if (best > 32) { b.x = mine.net.x; b.y = mine.net.y; hist.length = 0; N.corrections = (N.corrections || 0) + 1; } }
      N.predicted = true;
    }
    for (const a of S.athletes) { if (!a.net || (a === mine && N.predicted && S.phase === 'LIVE' && !/TACKLED|DOWN|FLY|PILE|GETUP|BLOCK|DIVE|TACKLE_DIVE|DIVE_CATCH|BIGHIT|HURDLE|JUMP|SEISMIC|MUDSLIDE/.test(a.pose))) continue; const b = a.b, vx = (a.net.x - b.x), vy = (a.net.y - b.y); if (Math.hypot(vx, vy) > 120) { b.x = a.net.x; b.y = a.net.y; } else { b.x += vx * k; b.y += vy * k; } b.z += (a.net.z - b.z) * k; b.vx = vx * 6; b.vy = vy * 6; }
    const B = S.ball; if (B.net) { B.x += (B.net.x - B.x) * k; B.y += (B.net.y - B.y) * k; B.z += (B.net.z - B.z) * k; }
  },
  onMessage(d, from) {
    if (N.ended || !d) return;
    if (N.isHost) {
      const h = FF.control.humans.find(x => x.seat === from);
      if (d.t === 'i' && h) { if (!h.net || d.q > h.net.q || d.q < h.net.q - 1000) h.net = d; }
      if (d.t === 'kick' && h && S.phase === 'PRESNAP') { N.remoteKick = N.remoteKick || {}; N.remoteKick[h.team] = { power: Math.max(0, Math.min(1, +d.p || 0)), acc: Math.max(-1, Math.min(1, +d.a || 0)), aim: Math.max(-1, Math.min(1, +d.m || 0)) }; }
      if (d.t === 'call' && h && S.phase === 'PLAYCALL' && !S.calls[h.team] && FF.control.byTeam(h.team).concat(FF.control.humans.filter(x => x.team === h.team && x.remote))[0] === h) {
        const play = FF.play(d.play); if (play) S.calls[h.team] = { play, flip: !!d.flip, card: d.card && (S.cards[h.team] || []).includes(d.card) ? d.card : null, two: d.two ? FF.play(d.two) : null };
      }
    } else if (from === N.info.host) {
      if (d.t === 's') N.applySnapshot(d);
      if (d.t === 'e') for (const ev of d.l || []) FF.bus.emit(ev[0], Object.assign({ net: true }, ev[1] || {}));
    }
  },
  /** a client's play call goes to the host */
  sendCall(t, call) { if (!N.active || N.isHost) return; N.send({ t: 'call', play: call.play.id, flip: call.flip ? 1 : 0, card: call.card || null, two: call.two ? call.two.id : null }, { to: N.info.host }); },
  finish() {
    if (N.finished || !N.isHost) return; N.finished = true;
    if (S.phase !== 'FINAL') { S.over = true; S.winner = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1; }
    const seats = N.seats.filter(s => !s.gone), w = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1;
    let standings;
    if (w < 0) standings = [seats.map(s => s.id)];
    else standings = [seats.filter(s => s.team === w).map(s => s.id), seats.filter(s => s.team !== w).map(s => s.id)].filter(a => a.length);
    const scores = {}, stats = {}; for (const s of seats) { scores[s.id] = S.score[s.team]; const st = S.stats.team[s.team]; stats[s.id] = { Yards: st.yards, TDs: st.tds, Sacks: st.sacks, 'Big Hits': st.bigHits }; }
    const awards = []; const R = FF.results.compute(); const pogSeat = R.pog && seats.find(s => s.team === R.pog.team); if (pogSeat) awards.push({ id: pogSeat.id, title: 'Player of the Game', detail: R.pog.name + ': ' + R.pog.stats });
    if (S.stats.biggestHit) { const s = seats.find(x => x.team !== S.stats.biggestHit.team) || seats[0]; if (s) awards.push({ id: s.id, title: 'Biggest Hit', detail: S.stats.biggestHit.yards.toFixed(1) + '-yard launch' }); }
    const res = { standings, scores, stats, awards }; if (seats.length === 1) { res.standings = [[seats[0].id]]; res.won = S.score[seats[0].team] > S.score[1 - seats[0].team]; }
    N.send(Object.assign(N.snapshot(), { over: 1 }));
    try { window.AIHub.finish(res); } catch (e) { game.fail('hub finish', e); }
  }
};
// the host forwards the big events, at most a few a second, so every copy plays its FX and commentary
FF.bus.on('*', e => { if (!N.active || !N.isHost || e.net || !EVENTS.includes(e.ev)) return; const o = {}; for (const k of ['player', 'team', 'yards', 'good', 'doink', 'card', 'kind', 'who', 'x', 'y', 'z', 'a', 'angle', 'winner', 'type']) if (e[k] !== undefined) o[k] = typeof e[k] === 'number' ? Math.round(e[k] * 100) / 100 : e[k]; if (N.evQ.length < 12) N.evQ.push([e.ev, o]); });

/* ---- the hub scene: the match, its own card before the start, the countdown, then the round ---- */
const hub = {
  input: FF.KEYS, view: 'broadcast', pausable: false, camera: { zoom: false },
  enter(d) {
    FF.match.setup(Object.assign({}, d.spec));
    S.toPhase('IDLE'); N.started = false;
    if (!N.isHost) S.update = () => {};   // a client renders the host's world
    N.ready();
    hub.menuOpen = false;
  },
  update(dt) {
    const I = game.input;
    if (N.ended) { FF.mute = true; return; }
    // Create + Options is the hub's: the game ignores Options while Create is held
    for (const P of game.players || [I]) if (P.down && P.down('pause') && P.downCode && P.downCode('Pad8')) { P.suppress('pause'); P.suppress('start'); }
    if (!N.started) {
      if (I.pressed('confirm') || I.pressed('b1')) window.AIHub.answer('ready');
      if (I.pressed('b4') || (I.pressed && false)) window.AIHub.answer('more');
      const c = I.clicked && I.clicked(); if (c) { const W = game.W, H = game.H; if (c[0] < W / 2) window.AIHub.answer('ready'); else window.AIHub.answer('more'); }
      N.update(dt); if (!N.server) presentationIdle(dt); return;
    }
    // Options (Esc) opens a small local menu; the world never freezes, the AI drives this player meanwhile
    if (I.pressed('pause') && !N.server) { hub.menuOpen = !hub.menuOpen; const h = FF.control.humans.find(x => x.seat === N.me); if (h) h.idle = hub.menuOpen; }
    if (hub.menuOpen) { if (I.pressed('confirm')) game.menu('settings', { pause: false }); if (I.pressed('b4')) game.menu('controls', { pause: false }); if (I.pressed('cancel')) { hub.menuOpen = false; const h = FF.control.humans.find(x => x.seat === N.me); if (h) h.idle = false; } }
    if (N.isHost) { S.netIntents = () => N.applyRemote(); if (N.server) { FF.fast = true; FF.control.update(); S.update(dt); FF.fast = false; } else FF.match.update(dt); }
    else { N.interpolate(dt); if (S.phase === 'PLAYCALL') FF.PlayCall.update(); FF.control.update && 0; clientPresentation(dt); }
    N.update(dt);
  },
  draw(r) {
    if (N.server) { r.overlay(g => { E.ui.box(g, 0, 0, game.W, game.H, { bg: '#07060d', gradient: false, alpha: 1 }); E.font.text(g, 'HOSTING THE WORLD', game.W / 2, game.H / 2, '#8a86a0', { align: 'center', outline: false }); }); return; }
    FF.match.draw(r);
    r.overlay(g => {
      if (!N.started) FF.hubCard(g);
      else if (window.AIHub.time() < 0) E.font.title(g, String(Math.ceil(-window.AIHub.time() / 1000)), game.W / 2, game.H * .35, { scale: 6, align: 'center', colors: ['#ffffff', '#ffe890', '#ffb030'] });
      if (hub.menuOpen) { FF.ui.panel(g, game.W / 2 - 80, game.H * .3, 160, 70); FF.glyph.row(g, game.W / 2, game.H * .3 + 10, [['confirm', 'SETTINGS']], { align: 'center' }); FF.glyph.row(g, game.W / 2, game.H * .3 + 30, [['b4', 'CONTROLS']], { align: 'center' }); FF.glyph.row(g, game.W / 2, game.H * .3 + 50, [['cancel', 'BACK TO THE GAME']], { align: 'center' }); }
      if (N.ended) { px.blend(g, .6, 'normal', () => E.ui.box(g, 0, game.H * .4, game.W, 40, { bg: '#000000', gradient: false, alpha: 1 })); E.font.text(g, N.endReason === 'finished' ? 'FINAL: ' + S.score[0] + ' - ' + S.score[1] : N.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND CANCELLED', game.W / 2, game.H * .4 + 12, '#ffe040', { align: 'center', scale: 2, outline: false }); }
    });
  }
};
const px = E.px;
function presentationIdle(dt) { for (const a of S.all) if (a.on) { a.pose = a.team === S.poss ? 'STANCE2' : 'STANCE3'; FF.Rigs.drive(a, dt, {}); } FF.cam.update(dt, { target: [S.los, FF.FIELD.MID_Y, 1] }); FF.cast.update(dt); FF.Stadium.update(dt); }
function clientPresentation(dt) { for (const a of S.all) if (a.on) FF.Rigs.drive(a, dt, { carry: S.ball.holder === a, fire: a.hot > 0 }); FF.cam.update(dt); FF.cast.update(dt); FF.Stadium.update(dt); FF.fx.update(dt); FF.talk.update(dt); }
/** the game's own card: the helmets, the teams, the players in their seat colors with ready ticks, how to win, controls, the countdown */
FF.hubCard = g => {
  const W = game.W, H = game.H, c = N.card || {}, home = S.teams[0], away = S.teams[1];
  px.blend(g, .75, 'normal', () => E.ui.box(g, 0, 0, W, H, { bg: '#05050c', gradient: false, alpha: 1 }));
  E.font.title(g, 'HAMERICAN FOOTBALL', W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6a0', '#ffd040', '#ff8a1a', '#e03a1a'] });
  if (home) { FF.drawHelmet(g, W / 2 - 50, 52, home.colors.helmet, home.colors.stripe, 1); FF.drawHelmet(g, W / 2 + 50, 52, away.colors.helmet, away.colors.stripe, -1); E.font.text(g, home.short, W / 2 - 50, 74, '#ffffff', { align: 'center', outline: false }); E.font.text(g, away.short, W / 2 + 50, 74, '#ffffff', { align: 'center', outline: false }); E.font.text(g, 'VS', W / 2, 48, '#ffe040', { align: 'center', scale: 2, outline: false }); }
  N.seats.forEach((s, i) => { const x = s.team === 0 ? W / 2 - 50 : W / 2 + 50, y = 86 + Math.floor(i / 2) * 11; E.font.text(g, (c.ready && c.ready.includes(s.id) ? '✓ ' : '') + s.name, x, y, s.color || '#ffffff', { align: 'center', outline: false }); });
  E.font.text(g, 'HOW TO WIN: OUTSCORE THEM OVER ONE HALF', W / 2, 114, '#ffe890', { align: 'center', outline: false });
  FF.glyph.row(g, W / 2, 128, [['up', 'RUN'], ['b1', 'HIKE/TACKLE'], ['b2', 'SWITCH'], ['turbo', 'TURBO']], { align: 'center' });
  FF.glyph.row(g, W / 2, 144, [['b1', ''], ['b2', ''], ['b3', 'THROW'], ['b3', 'SPIN'], ['b4', 'HURDLE']], { align: 'center' });
  const left = c.paused ? 'PAUSED' : c.left != null ? Math.ceil(c.left / 1000) + ' s' : c.starting ? 'STARTING...' : '';
  E.font.text(g, left, W / 2, 162, '#ffffff', { align: 'center', scale: 2, outline: false });
  FF.ui.button(g, { x: W / 2 - 104, y: H - 40, w: 100, h: 24 }, 'READY', true, { scale: 1 }); FF.ui.button(g, { x: W / 2 + 4, y: H - 40, w: 100, h: 24 }, c.asked ? 'MORE TIME ✓' : 'MORE TIME', false, { scale: 1 });
  FF.glyph.row(g, W / 2 - 54, H - 54, [['confirm', 'READY']], { align: 'center' }); FF.glyph.row(g, W / 2 + 54, H - 54, [['b4', 'MORE TIME']], { align: 'center' });
};
FF.scenes = Object.assign(FF.scenes || {}, { hub });
})();
