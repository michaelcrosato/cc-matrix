// ---------------------------------------------------------------- online: an AI Hub session (shared world, Kachinuki, 2-4 players)
// The host's copy runs the world (the bouts and the queue) and sends snapshots and events; every other copy sends its own
// player's inputs to the host and draws the world from the host's snapshots. Only the hub's messages are used (AIHub.send).
KC.hubRef = (typeof AIHub !== 'undefined') ? AIHub : null;
KC.SESSION = !!(KC.hubRef && KC.hubRef.active);
KC.NET_CHARS = ['taro', 'kamaboko', 'negi', 'ebi'];   // by seat order
KC.Net = {
  info: null, host: false, server: false, me: null, ids: [], queue: [], wins: {}, pts: {}, conc: {}, streak: {}, full: {}, half: {},
  bout: null, boutN: 0, a: null, b: null, snap: null, inbox: {}, outEvents: [], lastSnapReal: 0, lastHb: 0, lastIn: {}, lastCall: null,
  endInfo: null, ended: false, began: false, status: 'connecting', popup: null, prevPosture: null, unsub: [], view: null, lastRoundAt: 0
};
const N = KC.Net;
N.connect = function (scene) {
  const hub = KC.hubRef;
  N.status = 'connecting';
  hub.connect({ mode: 'shared-world', seats: [2, 4], card: true }).then((info) => {
    if (!info) { N.status = 'alone'; return KC.game.go('title'); }
    N.info = info; N.host = !!info.isHost; N.server = !!info.server; N.me = info.me;
    N.ids = info.players.map(p => p.id);
    N.queue = N.ids.slice();
    for (const id of N.ids) { N.wins[id] = 0; N.pts[id] = 0; N.conc[id] = 0; N.streak[id] = 0; N.full[id] = 0; N.half[id] = 0; }
    N.unsub.push(hub.on('message', (data, from) => N.onMessage(data, from)));
    N.unsub.push(hub.on('start', () => N.begin()));
    N.unsub.push(hub.on('card', (c) => { N.card = c; }));
    N.unsub.push(hub.on('time-up', () => N.timeUp()));
    N.unsub.push(hub.on('leave', (m) => N.onLeave(m)));
    N.unsub.push(hub.on('end', (m) => N.onEnd(m)));
    N.status = 'waiting';
    hub.ready();
  }, () => { N.status = 'alone'; KC.game.go('title'); });
};
// the round begins on the hub's start: the host starts the first bout
N.begin = function () {
  if (N.began) return;
  N.began = true; N.status = 'playing';
  KC.game.go('online', { resume: true });
  if (N.host) N.startBout();
};
// who fights and how: the first two in the queue; the fighter of seat id gives the roster character
N.fighterId = (pid) => KC.NET_CHARS[N.ids.indexOf(pid) % KC.NET_CHARS.length];
N.startBout = function () {
  if (N.queue.length < 2) return N.finish('finished');
  const aId = N.queue[0], bId = N.queue[1];
  N.a = new KC.Karateka({ id: N.fighterId(aId), side: 'w' });
  N.b = new KC.Karateka({ id: N.fighterId(bId), side: 'r' });
  N.aId = aId; N.bId = bId;
  const seed = (N.info.seed >>> 0) + 17 * (N.boutN + 1);
  N.bout = new KC.Bout({ white: N.a, red: N.b, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
  N.boutN++;
  N.bout.on('point', (p) => { const e = { k: 'point', side: p.side, pts: p.pts, full: p.full, counter: p.counter, tech: p.tech }; N.outEvents.push(e); N.tally(p); N.applyEvent(e); });
  N.bout.on('call', (c) => { const e = { k: 'call', text: c.text, sub: c.sub }; N.outEvents.push(e); N.applyEvent(e); });
  N.bout.on('block', (b) => N.outEvents.push({ k: 'block', by: b.by, tech: b.tech }));
  N.bout.on('aiuchi', () => N.outEvents.push({ k: 'aiuchi' }));
  N.outEvents.push({ k: 'queue', q: N.queue.slice(), a: aId, b: bId });
};
N.tally = function (p) {
  const who = p.side === 0 ? N.aId : N.bId, other = p.side === 0 ? N.bId : N.aId;
  N.pts[who] += p.pts; N.conc[other] += p.pts;
  if (p.full) N.full[who]++; else N.half[who]++;
};
// the host's step: the bout, the inputs, the snapshots and the events
N.step = function (dt) {
  if (!N.host || !N.bout || N.ended) return;
  const ia = N.intentFor(N.aId, N.a, N.b), ib = N.intentFor(N.bId, N.b, N.a);
  N.bout.step(dt, { a: () => ia, b: () => ib });
  N.syncRigs();
  KC.stepPoses({ w: N.a, r: N.b, rigs: N.rigs }, dt);
  if (N.bout.phase === 'matchEnd' && N.bout.phaseT > N.bout.phaseLen - 0.01) N.boutEnd();
  N.sendEvents();
  N.snapTick = (N.snapTick || 0) + dt;
  if (N.snapTick >= 0.083) { N.snapTick = 0; N.sendSnapshot(); }
};
N.heldPost = {};
N.intentFor = function (pid, f, foe) {
  if (!N.server && pid === N.me) return KC.readControl(KC.game.input, foe.x < f.x ? -1 : 1, N.prevLocal || (N.prevLocal = {}));
  // a guest's posture holds until it changes; a technique press is used once, in order
  const q = N.inbox[pid] || (N.inbox[pid] = []);
  let tech = null;
  while (q.length) { const m = q.shift(); if (m.p !== undefined) N.heldPost[pid] = m.p; if (m.h) { tech = m.h; break; } }
  return { posture: N.heldPost[pid] || 'n', tech };
};
N.syncRigs = function () {
  N.rigs = N.rigs || { w: null, r: null };
  if (!N.rigs.w || N.rigs.w.kId !== N.a.id) N.rigs.w = KC.View.rigFor(N.a.id, 'w');
  if (!N.rigs.r || N.rigs.r.kId !== N.b.id) N.rigs.r = KC.View.rigFor(N.b.id, 'r');
};
N.boutEnd = function () {
  const side = N.bout.matchOver;
  const win = side === 0 ? N.aId : N.bId, lose = side === 0 ? N.bId : N.aId;
  N.wins[win]++; N.streak[win]++; N.streak[lose] = 0;
  N.outEvents.push({ k: 'bout', winner: win, loser: lose, wins: N.wins[win] });
  N.queue = [win].concat(N.queue.slice(2), [lose]);
  N.bout = null;
  if (N.wins[win] >= KC.TUNE.sessionTarget) return N.finish('finished');
  N.lastRoundAt = KC.game.time;
  N.nextAt = KC.game.time + 2.5;
};
N.standings = function () {
  const ids = N.ids.slice().sort((x, y) => (N.wins[y] - N.wins[x]) || (N.pts[y] - N.pts[x]) || (N.conc[x] - N.conc[y]));
  const groups = [];
  for (const id of ids) {
    const last = groups[groups.length - 1];
    if (last && N.wins[last[0]] === N.wins[id] && N.pts[last[0]] === N.pts[id] && N.conc[last[0]] === N.conc[id]) last.push(id);
    else groups.push([id]);
  }
  return groups;
};
N.finish = function (why) {
  if (!N.host || N.ended) return;
  N.ended = true;
  const standings = N.standings();
  const scores = {};
  for (const id of N.ids) scores[id] = N.wins[id];
  const stats = {}, awards = [];
  for (const id of N.ids) stats[id] = { 'Bouts won': N.wins[id], 'Full points': N.full[id], 'Half points': N.half[id], 'Best streak': N.streak[id] };
  let best = null; for (const id of N.ids) if (!best || N.full[id] > N.full[best]) best = id;
  if (best !== null && N.full[best] > 0) awards.push({ id: best, title: 'IPPON HUNTER', detail: N.full[best] + ' full points' });
  KC.hubRef.finish({ standings, scores, stats, awards });
  N.outEvents.push({ k: 'over', why });
  N.sendEvents();
};
N.timeUp = function () { if (N.host) N.finish('time-up'); };
N.onLeave = function (m) {
  if (!N.host) return;
  N.queue = N.queue.filter(id => id !== m.id);
  if (N.bout && (m.id === N.aId || m.id === N.bId)) {
    // a fighter who leaves forfeits the bout; the other side takes it
    const side = m.id === N.aId ? 1 : 0;
    N.bout.matchOver = side;
    N.bout.roundWins[side] = 1;
    N.boutEnd();
    return;
  }
  if (N.queue.length < 2) N.finish('finished');
};
N.onEnd = function (m) {
  N.ended = true; N.endInfo = m;
  KC.game.audio.stopMusic(0.3);
};
// the messages: a snapshot (from the host), the events, a player's inputs (to the host), and heartbeats
N.onMessage = function (data, from) {
  if (!data || typeof data !== 'object') return;
  if (data.t === 's') { if (!N.host) N.snap = data; }
  else if (data.t === 'ev') { if (!N.host) for (const e of data.list) N.applyEvent(e); }
  else if (data.t === 'in') { if (N.host) (N.inbox[from] || (N.inbox[from] = [])).push({ p: data.p, h: data.h }); }
};
N.applyEvent = function (e) {
  if (e.k === 'call') { N.lastCall = { text: e.text, sub: e.sub, at: KC.game.time }; KC.A.sfx(KC.game, 'flagSnap'); }
  if (e.k === 'point') { N.popup = { t: 1.2, text: (e.full ? 'FULL' : 'HALF') + (e.counter ? ' COUNTER' : '') + ' · ' + KC.DATA.techniques[e.tech].name + ' ' + e.pts, color: e.full ? '#ffe070' : '#ffffff' }; KC.A.sfx(KC.game, e.full ? 'thwackFull' : 'thwackHalf'); }
  if (e.k === 'block') KC.A.sfx(KC.game, 'clack');
  if (e.k === 'queue') { N.queue = e.q; N.aId = e.a; N.bId = e.b; }
  if (e.k === 'bout') { N.wins[e.winner] = e.wins; N.queue = [e.winner].concat(N.queue.slice(2), [e.loser]); }
  if (e.k === 'over') { N.ended = true; }
};
// the events go out together, reliably, in order
N.sendEvents = function () {
  if (!N.outEvents.length) return;
  KC.hubRef.send({ t: 'ev', list: N.outEvents.splice(0) }, { reliable: true });
};
N.sendSnapshot = function () {
  const pts = N.bout ? N.bout.points.slice() : [0, 0];
  KC.hubRef.send({
    t: 's', a: +KC.hubRef.time().toFixed(3), c: N.bout ? +N.bout.clock.toFixed(2) : 0, ph: N.bout ? N.bout.phase : 'between',
    pts, aId: N.aId, bId: N.bId, q: N.queue.slice(), w: N.ids.map(id => N.wins[id]),
    f: N.a && N.b ? [N.a.poseState(), N.b.poseState()] : null, steps: N.bout ? N.bout.steps : 0
  }, { reliable: false });
};
// the guest's own input: its posture and its technique presses, only when they change
N.guestStep = function (dt) {
  if (N.host || N.ended || !N.began) return;
  const me = N.me, sn = N.snap; if (!sn || !sn.f) return;
  const mine = sn.aId === me ? 0 : sn.bId === me ? 1 : -1;
  const foeDir = mine === 0 ? 1 : -1;
  if (mine < 0) return;
  const my = sn.f[mine];
  const intent = KC.readControl(KC.game.input, my.x < sn.f[1 - mine].x ? 1 : -1, N.prevLocal || (N.prevLocal = {}));
  const send = {};
  if (intent.posture !== N.lastIn.p) { send.p = intent.posture; N.lastIn.p = intent.posture; }
  if (intent.tech) send.h = intent.tech;
  if (Object.keys(send).length) KC.hubRef.send(Object.assign({ t: 'in' }, send), { reliable: true });
};
// heartbeats from everyone who is not the host, so traffic flows both ways
N.heartbeat = function (dt) {
  N.lastHb += dt;
  if (!N.host && N.lastHb >= 0.5) { N.lastHb = 0; KC.hubRef.send({ t: 'hb', a: +KC.hubRef.time().toFixed(3) }, { reliable: false }); }
};
// the scene: the card while the round waits, then the bouts (host) or the snapshots (guests)
KC.makeOnline = (game, S) => {
  S.session = {
    pausable: false,
    enter() { if (!N.info && N.status === 'connecting') N.connect(); KC.A.music(game, 'select'); this.t = 0; },
    // the game's own card (connect with card: true): the players, who is ready, the goal, the countdown; Enter or cross is Ready
    update(d) {
      this.t += d; game.focus(200, 0, 30);
      if (N.status === 'waiting' && N.info) {
        if (game.input.pressed('confirm')) { KC.hubRef.answer('ready'); KC.A.sfx(game, 'menuOk'); }
        if (game.input.pressed('triangle')) KC.hubRef.answer('more');
      }
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const c = N.card || {}, ready = c.ready || [];
      const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
      r.overlay(g => {
        E.font.title(g, 'KARATE CHAMPON', r.W / 2, 22, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.onlineCard.kach, r.W / 2, 70, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.onlineCard.firstTo, r.W / 2, 90, '#fff6d0', { align: 'center', outline: '#0b0814' });
        const players = N.info ? N.info.players : [];
        players.forEach((p, i) => {
          const x = r.W / 2 - 150 + i * 100, y = 130;
          E.ui.box(g, x, y, 90, 56, { bg: ['#1a1428', '#0e0a18'], border: colors[i % 4] });
          E.px.rect(g, x + 4, y + 4, 6, 48, colors[i % 4]);
          E.font.text(g, String(p.name || '?').toUpperCase().slice(0, 10), x + 14, y + 8, '#fff6d0', { outline: '#0b0814', font: 'tiny' });
          E.font.text(g, ready.includes(p.id) ? 'READY' : 'WAITING', x + 14, y + 32, ready.includes(p.id) ? '#8ef0a8' : '#a9a1c8', { outline: '#0b0814', font: 'tiny' });
          if (p.id === N.me) E.font.text(g, 'YOU', x + 14, y + 44, '#ffe08a', { outline: '#0b0814', font: 'tiny' });
        });
        const left = c.left != null ? Math.ceil(c.left / 1000) : null;
        E.font.text(g, left != null ? 'STARTS IN ' + left : (N.status === 'waiting' ? 'WAITING FOR THE HUB' : 'CONNECTING'), r.W / 2, r.H - 70, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'ENTER / CROSS: READY    TRIANGLE: MORE TIME', r.W / 2, r.H - 36, '#a9a1c8', { align: 'center', outline: '#0b0814', font: 'tiny' });
      });
    }
  };
  S.online = {
    pausable: false,
    enter() { game.focus(200, 0, 30); KC.A.music(game, 'stadium'); this.stadium = KC.DATA.stages.stadium; N.rigs = N.rigs || { w: null, r: null }; },
    update(d) {
      game.focus(200, 0, 30);
      if (N.host) { N.step(d); if (N.nextAt && game.time >= N.nextAt && !N.bout && !N.ended) { N.nextAt = 0; N.startBout(); } }
      else N.guestStep(d);
      N.heartbeat(d);
      if (N.popup && N.popup.t > 0) N.popup.t -= d;
    },
    draw(r) {
      const st = this.stage || KC.DATA.stages.stadium;
      if (N.bout) {
        N.syncRigs();
        KC.View.drawStage(r, st, game.time);
        KC.View.drawFighters(r, [N.a, N.b], { w: N.rigs.w, r: N.rigs.r });
        KC.View.hud(r, N.bout, { popup: N.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, N.popup) : null });
      } else if (N.snap && N.snap.f) {
        const sn = N.snap, fakeBout = N.fakeBout(sn);
        KC.View.drawStage(r, st, game.time);
        const rigA = N.rigFor(sn.aId, 'w'), rigB = N.rigFor(sn.bId, 'r');
        const fa = Object.assign({ side: 'w', x: sn.f[0].x, z: sn.f[0].z }, sn.f[0]), fb = Object.assign({ side: 'r', x: sn.f[1].x, z: sn.f[1].z }, sn.f[1]);
        KC.View.applyPose(rigA, sn.f[0], 1 / 120); KC.View.applyPose(rigB, sn.f[1], 1 / 120);
        KC.View.drawFighters(r, [fa, fb], { w: rigA, r: rigB });
        KC.View.hud(r, fakeBout, { popup: N.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, N.popup) : null });
      } else {
        KC.View.drawStage(r, st, game.time);
      }
      r.overlay(g => {
        const line = N.ended ? (N.endInfo && N.endInfo.reason === 'host-left' ? 'HOST LEFT' : 'ROUND OVER') : (N.bout ? '' : KC.TEXT.onlineCard.kach);
        if (line) E.font.title(g, line, r.W / 2, r.H * 0.42, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const q = (N.bout || !N.snap) ? N.queue : N.snap.q;
        const wins = N.wins;
        E.ui.box(g, 6, r.H - 30, r.W - 12, 24, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        const names = (q || []).map(id => (N.info ? (N.info.players.find(p => p.id === id) || { name: '?' }).name : '?') + ' ' + (wins[id] || 0));
        E.font.text(g, 'QUEUE: ' + names.join('  ·  ').replace(/·/g, '-'), 12, r.H - 24, '#fff6d0', { outline: '#0b0814' });
      });
    }
  };
  return S;
};
// the guests' rigs by character, and a bout-shaped record for the HUD from a snapshot
N.rigFor = (pid, side) => {
  N.rigCache = N.rigCache || {};
  const k = (side + ':' + N.fighterId(pid));
  if (!N.rigCache[k]) N.rigCache[k] = KC.View.rigFor(N.fighterId(pid), side);
  return N.rigCache[k];
};
N.fakeBout = (sn) => {
  const nameOf = (id) => N.info ? ((N.info.players.find(p => p.id === id) || { name: '?' }).name) : '?';
  return {
    phase: sn.ph, clock: sn.c, points: sn.pts, roundWins: [0, 0], roundsToWin: 1, steps: sn.steps,
    a: { r: { short: nameOf(sn.aId).slice(0, 10) } }, b: { r: { short: nameOf(sn.bId).slice(0, 10) } },
    lastCall: N.lastCall ? { text: N.lastCall.text, sub: N.lastCall.sub, step: sn.steps } : null
  };
};
