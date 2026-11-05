// AI Hub: the online Derby. A ghost round (mode 'ghost', 1 to 4 players): every copy plays its own Derby from the same pitch
// sequence (BZ.rng.deal is the hub's 'pitches' stream), and sees the others as ghosts. The others' swings and batted balls
// show in their seat colours; they never change this copy's round. The game's own card shows the players and the controls,
// and answers Ready (✕ or a click) or More time (△, M or a click). The round is one player's, with a hard clock from the hub.
// Outside a session (AIHub.active is false) nothing here runs.
BZ.hubOn = () => typeof AIHub !== 'undefined' && !!AIHub.active;

BZ.hubState = 'connecting';   // connecting | card | countdown | play | over | ended
BZ.hubCard = null;            // the hub's card event: left, paused, starting, ready, asking, asked
BZ.hubGhosts = {};            // id -> { name, color, score, outs, swing, comets: [] }
BZ.hubSent = { reported: false, lastProgress: -1, lastGhost: 0 };

// The round's scene: connect, then build the Derby, call ready once, and let the card and the countdown run.
BZ.hubScene = {
  enter() {
    BZ.field = BZ.field || BZ.buildField();
    BZ.park = 'moondome';
    BZ.field = BZ.buildField();
    BZ.hubState = 'connecting';
    BZ.hubConnect();
  },
  exit() { BZ.playSong(null); },
  update() {},
  draw(r) { BZ.hubDrawConnecting(r); }
};

BZ.hubConnect = () => {
  AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { BZ.game.go('title'); return; }
    BZ.hub = { info, connected: true, limitS: info.limitMs ? Math.min(120, (info.limitMs - 5000) / 1000) : 120 };
    BZ.rng.deal = AIHub.rng('pitches');
    const me = info.players.find(p => p.id === info.me) || info.players[0];
    const others = info.players.filter(p => p.id !== info.me);
    for (const o of others) BZ.hubGhosts[o.id] = { id: o.id, name: o.name, color: o.color, score: 0, outs: 0, swing: 0, comets: [] };
    const players = [{ name: me.name, color: me.color, input: BZ.game.input, id: me.id }];
    BZ.D = BZ.newDerby(players, 'hub');
    BZ.D.hub = true; BZ.D.me = me.id; BZ.D.phase = 'play';
    BZ.hubWire();
    AIHub.ready();
    BZ.hubState = 'card';
    BZ.game.go('derby');
  });
};

// The hub's events: the card, the start, the messages, a player leaving, time up, and the end of the round.
BZ.hubWire = () => {
  AIHub.on('card', c => { BZ.hubCard = c; });
  AIHub.on('start', () => { BZ.hubState = 'countdown'; });
  AIHub.on('message', (data, from) => BZ.hubMessage(data, from));
  AIHub.on('leave', ({ id }) => { delete BZ.hubGhosts[id]; });
  AIHub.on('time-up', () => { if (!BZ.hubSent.reported) BZ.hubReport(); });
  AIHub.on('end', ({ standings }) => {
    BZ.hubState = 'ended'; BZ.hubStandings = standings || [];
    BZ.muted = true; BZ.playSong(null); BZ.game.audio.music(null);   // the round's sound stops
  });
};

// The round's update. Returns true while the hub's flow owns the step (the card, the countdown, the end), else false.
BZ.hubDerbyUpdate = (game, D, dt) => {
  const st = BZ.hubState;
  if (st === 'card' || st === 'countdown') {
    if (st === 'countdown' && AIHub.time() >= 0) { BZ.hubState = 'play'; if (!D.round) { D.round = BZ.newRound(D); BZ.derbyNewPitch(D); } }
    return true;
  }
  if (st === 'ended') return true;
  if (st === 'over') return true;
  // play: report the standing once a second, send the ghost traffic, and stop when the round is over
  BZ.hubSent.lastProgress -= dt;
  BZ.hubSent.lastGhost -= dt;
  if (BZ.hubSent.lastProgress <= 0) { BZ.hubSent.lastProgress = 1; BZ.hubProgress(D); }
  if (BZ.hubSent.lastGhost <= 0) { BZ.hubSent.lastGhost = .1; BZ.hubGhostTraffic(D); }
  for (const id in BZ.hubGhosts) BZ.hubGhostStep(BZ.hubGhosts[id], dt);
  return false;
};

// Progress for the hub's scoreboard: the score is the feet so far; the label is what the player reads.
BZ.hubProgress = D => {
  const p = D.players[0];
  AIHub.progress({ score: p.score, label: p.score.toLocaleString('en-US') + ' ft · ' + p.hr + ' HR · ' + p.outs + ' outs' });
};

// Ghost traffic: our swing state, unreliable, 10 a second; each batted ball, reliable, so the other copies can show it.
BZ.hubGhostTraffic = D => {
  const R = D.round;
  AIHub.send({ t: 'g', s: R && R.swingNow ? 1 : 0, sc: D.players[0].score, o: D.players[0].outs, a: 'derby' }, { reliable: false });
};

BZ.hubSendHit = (b, extra) => {
  AIHub.send({ t: 'hit', e: Math.round(b.exit), l: Math.round(b.launch), s: Math.round(b.spray * 10) / 10, bz: !!b.batzooka, d: extra }, { reliable: true });
};

BZ.hubMessage = (data, from) => {
  const g = BZ.hubGhosts[from];
  if (!g || !data) return;
  if (data.t === 'g') { g.score = data.sc || 0; g.outs = data.o || 0; g.swing = data.s ? 1 : 0; }
  if (data.t === 'hit') {
    const b = BZ.launchBall({ exit: data.e, launch: data.l, spray: data.s, batzooka: data.bz });
    g.comets.push({ ball: b, t: 0 });
    if (g.comets.length > 4) g.comets.shift();
  }
  if (data.t === 'done') { g.score = data.score || g.score; }
};

// A ghost's comets fly over the field's sky: their balls are simulated locally, the same physics, purely to show.
BZ.hubGhostStep = (g, dt) => {
  for (const c of g.comets) { if (!c.ball.stopped) BZ.stepBall(c.ball, dt); c.t += dt; }
  g.comets = g.comets.filter(c => c.t < 8);
};

// The round is done: the result goes to the hub once, with the stats and an award.
BZ.hubDerbyEnd = (game, D) => {
  BZ.hubState = 'over';
  BZ.hubReport();
};
BZ.hubReport = () => {
  if (BZ.hubSent.reported || !BZ.D) return;
  BZ.hubSent.reported = true;
  const p = BZ.D.players[0];
  const longest = p.longest;
  AIHub.result({
    score: p.score,
    stats: { 'Home runs': p.hr, 'Longest': longest + ' ft', 'Hits': p.hits, 'Outs': p.outs },
    awards: p.hr > 0 ? [{ title: 'Moonshot', detail: longest + ' ft' }] : []
  });
  AIHub.send({ t: 'done', score: p.score }, { reliable: true });
};

// The hub's screens: the connection, the card, the countdown, and the round's end. Returns true when it drew them.
BZ.hubDraw = (r, D) => {
  if (BZ.hubState === 'card') { BZ.hubDrawCard(r, D); return true; }
  if (BZ.hubState === 'countdown') {
    const left = Math.ceil(-AIHub.time() / 1000);
    r.sky(['#060818', '#2a2a5a']);
    r.overlay(g => E.font.title(g, left > 0 ? String(Math.min(3, left)) : 'PLAY', r.W / 2, r.H * .4, { scale: 4, align: 'center' }));
    return true;
  }
  if (BZ.hubState === 'ended' || BZ.hubState === 'over') {
    r.sky(['#060818', '#2a2a5a']);
    r.overlay(g => {
      E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .12, { scale: 2, align: 'center' });
      BZ.hubDrawStandings(g, r);
    });
    return true;
  }
  return false;
};

// The standings on the canvas: each player in their seat colour, by place, names as text only.
BZ.hubDrawStandings = (g, r) => {
  // before the hub's end, only this player's own score is known
  const rows = BZ.hubStandings ? [].concat(...BZ.hubStandings) : [BZ.D.me];
  rows.forEach((id, i) => {
    const isMe = id === BZ.D.me;
    const who = isMe ? { name: BZ.D.players[0].name, color: BZ.D.players[0].color, score: BZ.D.players[0].score } : BZ.hubGhosts[id] || { name: '—', color: '#ffffff', score: 0 };
    const y = r.H * .32 + i * 26;
    E.px.rect(g, r.W * .3 - 8, y + 2, 5, 14, who.color);
    BZ.text(g, (i + 1) + '.  ' + who.name, r.W * .3, y, '#ffffff', { scale: 1.8 });
    BZ.text(g, (who.score || 0).toLocaleString('en-US') + ' ft', r.W * .7, y, '#ffe6a0', { scale: 1.8, align: 'right' });
  });
};

// The card: the game's own, before play. Lines up the players, shows how to win and the controls, and takes Ready / More time.
BZ.hubDrawCard = (r, D) => {
  const W = r.W, H = r.H, c = BZ.hubCard || {};
  const ready = c.ready || [];
  r.sky(['#060818', '#2a2a5a']);
  r.overlay(g => {
    E.font.title(g, 'BATZOOKA DERBY', W / 2, H * .08, { scale: 2, align: 'center' });
    BZ.text(g, 'ONLINE · HOME RUN DERBY', W / 2, H * .24, '#ffe6a0', { align: 'center', scale: 1.1 });
    const seats = BZ.hub.info.players;
    seats.forEach((p, i) => {
      const y = H * .36 + i * 24, isReady = ready.includes(p.id);
      E.px.rect(g, W * .2, y + 2, 6, 14, p.color);
      BZ.text(g, p.name + (p.id === BZ.hub.info.me ? '  (you)' : ''), W * .2 + 14, y, '#ffffff', { scale: 1.5 });
      BZ.text(g, isReady ? 'READY' : '', W * .8, y, '#7ad06a', { align: 'right', scale: 1.4 });
    });
    BZ.text(g, 'HOW TO WIN: HIT THE MOST HOME-RUN FEET IN TWO MINUTES', W / 2, H * .62, '#ffffff', { align: 'center', scale: 1.2 });
    BZ.text(g, 'AIM ' + BZ.keyNames(['up', 'left', 'down', 'right']) + '   SWING ' + BZ.prompt('confirm', '') + '   BATZOOKA ' + BZ.prompt('power', ''), W / 2, H * .7, '#c8d0f0', { align: 'center', scale: 1.1 });
    const left = c.left != null ? Math.ceil(c.left / 1000) : null;
    const status = c.paused ? 'WAITING FOR MORE TIME…' : c.starting ? 'STARTING…' : c.asked ? 'YOU ASKED FOR MORE TIME' : left != null ? 'STARTS IN ' + left : '';
    BZ.text(g, status, W / 2, H * .8, '#ffe6a0', { align: 'center', scale: 1.4 });
    BZ.text(g, BZ.prompt('confirm', 'READY') + '      ' + BZ.prompt('more', 'MORE TIME'), W / 2, H * .9, '#ffffff', { align: 'center', scale: 1.4 });
  });
};

BZ.keyNames = acts => acts.map(a => BZ.game.input.label(a)).join('');
BZ.hubDrawConnecting = r => {
  r.sky(['#060818', '#2a2a5a']);
  r.overlay(g => BZ.text(g, 'CONNECTING TO THE HUB…', r.W / 2, r.H / 2, '#ffe6a0', { align: 'center', scale: 1.6 }));
};

// The card's answers: ✕ or a click on READY; △, M or a click on MORE TIME. They go to the hub, and change nothing here.
BZ.hubCardInput = game => {
  if (BZ.hubState !== 'card') return;
  const I = game.input, click = game.input.clicked();
  if (I.pressed('confirm') || (click && click[1] > game.H * .86 && click[0] < game.W / 2)) AIHub.answer('ready');
  if (I.pressed('more') || (click && click[1] > game.H * .86 && click[0] >= game.W / 2)) AIHub.answer('more');
};

// A swing in a hub round also tells the ghosts (its batted ball, reliable).
BZ.hubOnHit = (b) => { if (BZ.hubOn() && BZ.hubState === 'play') BZ.hubSendHit(b, Math.round(b.landDist)); };

// The ghosts' drawing: their comets in their seat colours, over the field.
BZ.hubDrawGhosts = (g, r) => {
  const rows = Object.values(BZ.hubGhosts);
  rows.slice(0, 3).forEach((gh, i) => {
    E.ui.box(g, r.W - 180, 90 + i * 22, 168, 18, { bg: ['#1a1d2a', '#0b0d16'], border: gh.color, alpha: .85 });
    E.px.rect(g, r.W - 176, 96 + i * 22, 4, 10, gh.color);
    BZ.text(g, gh.name + '  ' + (gh.score || 0) + ' ft', r.W - 168, 94 + i * 22, '#ffffff', { scale: 1.1, shadow: null });
  });
};
