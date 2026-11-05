/* ---- THE MATCH SCENE: a live match, a training drill, the attract demo, or an AI Hub session ---- */

TT.mouse = { ground: null, hoverId: -1, click: false, clickId: -1, pick: null, kickAim: null, wheel: 0 };
const diffShift = (name, k) => TT.DIFF_ORDER[clamp(TT.DIFF_ORDER.indexOf(name) + k, 0, 2)];

/** start a match: o = { home, away, venue, weather, time, halfLength, suddenDeath, cup, drill, attract, session, seed, seats } */
TT.startMatch = (o) => {
  TT.comm.reset(); TT.replay.reset(); TT.hud.banners = [];
  const halves = { '2 min': 120, '3 min': 180, '4 min': 240, '5 min': 300 }[TT.settings.halves] || 120;
  const m = TT.sim.create(Object.assign({ halfLength: o.halfLength || (o.attract ? 9999 : halves) }, o));
  const base = TT.settings.difficulty || 'Pro';
  m.diff = [0, 1].map(t => TT.DIFF[o.attract ? 'Pro' : diffShift(base, m.teams[t].diff || 0)]);
  if (o.attract) m.cheats = { noClock: true };
  if (TT.devCheats) Object.assign(m.cheats, TT.devCheats);
  // the seats: who plays (P1 on the home side by default)
  TT.seats = (o.seats || (o.attract ? [] : [{ input: TT.game.input, team: 0 }])).map((s, i) => TT.control.seat(Object.assign({ label: s.label || ('P' + (i + 1)), color: s.color || E.PLAYER_COLORS[i] || '#ffd23a' }, s)));
  TT.layerTune(m);
  if (TT.cfg.present) TT.pres.setup(m);
  if (o.drill) TT.drills.setup(m, o.drill);
  return m;
};
/** the match options layered over the balance values (half length) */
TT.layerTune = m => { TUNE.layer('match', { halfLength: m.halfLen }); };

TT.scenes.match = {
  view: 'broadcast', views: TT.VIEW_IDS, input: TT.KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: [.55, 1.3], start: .72 },
  enter(data) {
    data = data || {};
    TT.mdata = data;
    if (data.resume && M) { this.pausable = !TT.cfg.session; return; }
    this.pausable = !data.attract && !TT.cfg.session;
    TT.startMatch(data);
    TT.fx.on = true;
    const g = TT.game, tod = M.o.time && M.o.time !== 'venue' ? M.o.time : M.venue.time;
    g.lights.enabled = true; g.lights.ambient = tod === 'day' ? .95 : tod === 'dusk' ? .66 : .48;
    const w = M.weather;
    g.weather = w === 'rain' ? { kind: 'rain', amount: M.venue.rain || .6, wind: .2 } : w === 'storm' ? { kind: 'rain', amount: .9, wind: .4, lightning: .15 } : w === 'wind' ? { kind: 'leaves', amount: .3, wind: .8 } : null;
    g.cam.smooth = .22; g.cam.bounds = v => PR.cur ? PR.cur.bounds(v) : null;
    const v = TT.settings.camera === 'High' ? 'threequarter' : TT.settings.camera === 'Overhead' ? 'topdown' : 'broadcast';
    g.setView(v);
    TT.audio.music(data.drill ? 'pub' : M.venue.music);
    TT.fx._near = TT.fx._hot = undefined;
    this.endT = 0;
    if (data.attract) TT.attract.begin();
    if (TT.cfg.session && TT.net) TT.net.matchStarted();
  },
  exit() { if (this.kickCam) { TT.game.setView(this.kickCam); this.kickCam = null; } TT.fx.on = false; TT.game.weather = null; TT.dev.close(); TT.game.cam.frame && TT.game.cam.frame(null); },
  update(dt) {
    const g = TT.game;
    if (!M) return;
    if (M.o.attract) { if (TT.attract.step(dt)) return; }
    if (TT.dev.open && TT.dev.update(dt)) { /* the dev panel took the input */ }
    TT.mouseStep();
    if (g.players.some(I => I.pressed('view')) && !M.drill) { g.nextView(); g.note(g.view.label.toUpperCase() + ' CAMERA'); }
    // replays: any button skips
    let skip = false;
    if (TT.replay.playing) skip = g.players.some(I => I.pressed('x') || I.pressed('ci') || I.pressed('confirm'));
    const isClient = TT.cfg.session && TT.net && !TT.net.isHost;
    if (isClient) TT.net.clientStep(dt);
    else if (!TT.replay.playing) {
      const intents = TT.control.collect(dt);
      if (!(TT.dev.open && TT.dev.frozen)) TT.sim.step(dt, intents);
      if (TT.cfg.session && TT.net) TT.net.hostStep(dt);
    }
    if (!TT.cfg.session) TT.replay.record(M);
    const view = TT.replay.tick(dt, M, skip) || M;
    if (M.drill) TT.drills.step(dt);
    TT.pres.update(dt, view);
    TT.hud.step(dt); TT.comm.step(dt); TT.crowd.step(dt, M); TT.fx.music(M);
    // set kicks cut to the behind-the-kicker camera, then back to the player's view
    if (TT.cfg.present && !TT.cfg.session) {
      const kick = M.phase === 'setkick' && M.sub !== 'result';
      if (kick && !this.kickCam) { this.kickCam = g.view.id; g.setView(dirOf(M.ph.team) > 0 ? 'postsE' : 'postsW'); }
      else if (!kick && this.kickCam) { g.setView(this.kickCam); this.kickCam = null; }
    }
    TT.camStep(dt, view);
    // the end: the results (or the drill list, or the title after a demo)
    if (M.phase === 'full' && !M.drill) {
      this.endT += dt;
      if (this.endT > 4 && !TT.cfg.session && !M.o.attract) TT.toResults();
    }
  },
  draw(r) {
    if (!M) return;
    const view = TT.replay.view || M;
    TT.pres.drawWorld(r, view);
    // the kick-off reticle
    if (M.phase === 'kickoff') { const a = M.ph.aim; r.groundRing(a[0], a[1], 10, '#ffe060', .9); r.groundRing(a[0], a[1], 4, '#ffffff', .9); }
    if (TT.replay.playing) r.overlay(g => { px.rect(g, 0, 0, r.W, 18, '#000'); px.rect(g, 0, r.H - 18, r.W, 18, '#000'); E.font.text(g, 'INSTANT REPLAY', 8, 5, Math.floor(PR.t * 3) % 2 ? '#ff4040' : '#ffffff', { outline: false }); TT.prompt(g, '{b:x} SKIP', r.W - 40, r.H - 13, TT.game.input); });
    else TT.hud.draw(r, M);
    TT.comm.draw(r);
    if (M.drill) TT.drills.draw(r);
    if (M.o.attract) TT.attract.draw(r);
    if (TT.dev.open) TT.dev.draw(r);
    if (TT.cfg.session && TT.net) TT.net.draw(r);
  }
};
/** the mouse in the world: the teammate under it, a click on him, the set kick's aim, a pod or a card */
TT.mouseStep = () => {
  const g = TT.game, I = g.input, mo = TT.mouse;
  mo.click = false; mo.clickId = -1; mo.pick = null; mo.wheel = 0;
  if (!TT.cfg.present || I.lastDevice !== 'mouse') { mo.hoverId = -1; return; }
  mo.ground = g.mouseGround ? g.mouseGround() : null;
  const seat = TT.seats.find(s => s.input === I);
  mo.hoverId = -1;
  if (mo.ground && seat && M) {
    let best = -1, bd = 14;
    for (const p of M.players) if (p.team === seat.team && onField(p) && p.id !== seat.pid) { const d = Math.hypot(p.x - mo.ground[0], p.y - mo.ground[1]); if (d < bd) { bd = d; best = p.id; } }
    mo.hoverId = best;
  }
  const c = I.clicked && I.clicked();
  if (c) {
    mo.click = true; mo.clickId = mo.hoverId;
    if (mo.cards) for (const b of mo.cards) if (c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) mo.pick = b[4];
  }
  const ptr = I.pointer && I.pointer();
  if (ptr && mo.kickBox && M && M.phase === 'setkick' && M.sub === 'aim') { const [x0, , bw, , sc] = mo.kickBox; mo.kickAim = clamp((ptr[0] - (x0 + bw / 2)) / sc / 60, -1, 1); } else mo.kickAim = null;
};
/** the broadcast camera: the ball (or its carrier) with a lead, pulled toward the middle; kicks framed; replays close */
TT.camStep = (dt, v) => {
  const g = TT.game; if (!v || !v.ball) return;
  const b = v.ball, att = v.possession;
  let x = b.x + dirOf(att) * 40, y = b.y + (G.CY - b.y) * .25, z = 8;
  if (v.phase === 'scrum' || v.phase === 'lineout') { x = v.ph.x != null ? v.ph.x : b.x; y = v.phase === 'lineout' ? lerp(v.ph.ty, G.CY, .35) : v.ph.y; }
  if (v.phase === 'setkick') { const d = dirOf(v.ph.team), kx = v.ph.kx || b.x; x = lerp(kx, v.ph.tl, .55); y = lerp(v.ph.ky || b.y, G.CY, .5); if (v.sub === 'flight') { x = lerp(b.x, v.ph.tl, .4); y = b.y; } }
  if (v.phase === 'kickoff') { x = lerp(v.ph.x, v.ph.aim[0], .4); y = lerp(v.ph.y, v.ph.aim[1], .4); }
  if (v.phase === 'walkout') { x = G.CX; y = G.CY + 60; }
  if (TT.replay.playing && TT.replay.focus >= 0) { const p = v.players[TT.replay.focus]; x = p.x; y = p.y; }
  if (b.st === 'air' && b.landing && b.kind !== 'pass' && v.phase === 'play') { x = lerp(b.x, b.landing.x, .5); y = lerp(b.y, b.landing.y, .5) + (G.CY - b.y) * .15; }
  g.focus(x, y, z);
};

/* ---- THE TRAINING GROUND: each drill a setup, a goal and an auto script (SHOW ME, and the tests' proof) ---- */
TT.drills = {
  list: TT.DRILLS,
  setup(m, id) {
    const def = TT.DRILLS.find(d => d.id === id) || TT.DRILLS[0];
    m.drill = { id: def.id, def, t: 0, done: false, doneT: 0, n: {}, msg: '', resetT: 0, part: 0, arcade: def.id === 'turbo', noConversion: def.id !== 'posts', easyTackles: def.id === 'hit' || def.id === 'ruck' };
    m.cheats = Object.assign({}, m.cheats, { noClock: true });
    this.listeners = [];
    const count = (ev, k, f) => this.listeners.push(TT.bus.on(ev, d => { if (!M || !M.drill || M.drill.done) return; if (!f || f(d)) { M.drill.n[k] = (M.drill.n[k] || 0) + 1; TT.audio.sfx('coin'); } }));
    const mine = d => d.pid != null && M.players[d.pid] && M.players[d.pid].team === 0;
    const me = d => d.pid != null && M.players[d.pid] && M.players[d.pid].ctl >= 0;
    if (id === 'legs') count('try', 'try', mine);
    if (id === 'hands') { count('pass', 'up', d => M.players[d.pid].team === 0 && M.players[d.to].y < M.players[d.pid].y && !d.long); count('pass', 'down', d => M.players[d.pid].team === 0 && M.players[d.to].y > M.players[d.pid].y && !d.long); count('pass', 'long', d => d.long); count('catch', 'caught', mine); }
    if (id === 'feet') { count('stepMove', 'step', me); count('spinMove', 'spin', me); count('fend', 'fend', mine); }
    if (id === 'hit') { count('tackle', 'tackle', d => M.players[d.pid].team === 0 && d.kind === 'tackle'); count('bigHit', 'big', mine); count('monsterHit', 'big', mine); count('diveTackle', 'dive', mine); count('switch', 'switch'); }
    if (id === 'ruck') { count('ruckWon', 'won', d => d.team === 0); count('jackal', 'jackal', mine); }
    if (id === 'boot') { count('kick', 'grubber', d => mine(d) && d.kind === 'grubber'); count('kickTouch', 'touch', d => d.team === 0); count('dropGoal', 'drop', d => d.team === 0); }
    if (id === 'set') { count('scrumWon', 'scrum', d => d.team === 0); count('lineoutWon', 'lineout', d => d.team === 0); count('lineoutSteal', 'lineout', d => d.team === 0); }
    if (id === 'posts') count('conversion', 'conv', d => d.team === 0);
    if (id === 'turbo') { count('powerupTake', 'pie', mine); count('superStart', 'super', mine); count('try', 'try', mine); }
    this.reset(m);
  },
  goals: {
    legs: n => [['GROUND IT OVER THE LINE', n.try >= 1]],
    hands: n => [['PASS UP THE LINE (L1)', n.up >= 1], ['PASS DOWN THE LINE (R1)', n.down >= 1], ['A LONG PASS (HOLD)', n.long >= 1], ['FIVE CATCHES', (n.caught || 0) >= 5]],
    feet: n => [['TWO SIDESTEPS', (n.step || 0) >= 2], ['ONE SPIN', n.spin >= 1], ['FEND THE DEFENDER', n.fend >= 1]],
    hit: n => [['A TACKLE', n.tackle >= 1], ['A BIG HIT', n.big >= 1], ['A DIVE TACKLE', n.dive >= 1], ['SWITCH PLAYER', n.switch >= 1]],
    ruck: n => [['WIN TWO RUCKS', (n.won || 0) >= 2], ['JACKAL ONE', n.jackal >= 1]],
    boot: n => [['A GRUBBER', n.grubber >= 1], ['A PUNT INTO TOUCH', n.touch >= 1], ['A DROP GOAL', n.drop >= 1]],
    set: n => [['WIN A SCRUM', n.scrum >= 1], ['WIN A LINEOUT', n.lineout >= 1]],
    posts: n => [['CONVERT THE TRY', n.conv >= 1]],
    turbo: n => [['GRAB THE PIE', n.pie >= 1], ['THUNDER RUN', n.super >= 1], ['SCORE', n.try >= 1]]
  },
  /** put the drill's pieces where its next step needs them */
  reset(m) {
    const d = m.drill, id = d.id, n = d.n;
    d.resetT = 0;
    for (const p of m.players) { p.st = 'off'; p.x = -500; p.y = -500; p.vx = p.vy = 0; p.ctl = -1; p.power = null; p.superK = ''; }
    m.ball.st = 'dead'; m.hazards = []; m.pu = null; m.useIt = null; m.adv = null; M.puT = 0;
    const H = idx => m.players[idx], A = idx => m.players[7 + idx];
    const put = (p, x, y) => { p.st = 'run'; p.stT = 0; p.x = x; p.y = y; p.z = 0; p.facing = dirOf(p.team) > 0 ? 0 : PI; p.turbo = 1; };
    const X = (u) => G.X0 + u;   // home attacks +x in the first half
    TT.sim.setPhase('play');
    if (id === 'legs') { put(H(6), X(225), G.CY); TT.sim.giveBall(6); }
    else if (id === 'hands') { put(H(3), X(300), G.CY - 60); [4, 5, 6, 2].forEach((k, i) => put(H(k), X(270 - i * 12), G.CY - 60 + (i + 1) * 45 * (i % 2 ? 1 : 1))); put(H(1), X(258), G.CY - 105); TT.sim.giveBall(3); }
    else if (id === 'feet') { put(H(5), X(250), G.CY); [0, 1, 2].forEach(k => { put(A(k), X(330 + k * 70), G.CY + (k - 1) * 30); A(k).st = 'run'; }); put(A(5), X(560), G.CY); TT.sim.giveBall(5); m.drill.bags = [7, 8, 9]; }
    else if (id === 'hit') { put(H(5), X(500), G.CY); put(H(6), X(500), G.CY + 120); put(A(6), X(700), G.CY + (n.tackle ? 40 : 0)); put(A(4), X(760), G.CY - 60); TT.sim.giveBall(13); }
    else if (id === 'ruck') {
      if ((n.won || 0) < 2) { put(H(5), X(400), G.CY); put(H(0), X(380), G.CY - 30); put(H(3), X(370), G.CY + 30); put(A(5), X(470), G.CY); put(A(0), X(520), G.CY + 40); TT.sim.giveBall(5); }
      else { put(H(5), X(450), G.CY); put(H(1), X(440), G.CY + 40); put(A(5), X(560), G.CY); put(A(3), X(600), G.CY + 30); TT.sim.giveBall(12); }
    }
    else if (id === 'boot') {
      if (!n.grubber) { put(H(4), X(820), G.CY); put(A(6), X(1010), G.CY - 100); TT.sim.giveBall(4); }
      else if (!n.touch) { put(H(4), X(300), G.CY + 150); TT.sim.giveBall(4); }
      else { put(H(4), X(1024 - 300), G.CY); TT.sim.giveBall(4); }
    }
    else if (id === 'set') {
      for (let k = 0; k < 7; k++) { put(H(k), X(500), G.CY); put(A(k), X(540), G.CY); }
      if (!n.scrum) TT.sp.scrum(0, X(500), G.CY, 'drill'); else TT.sp.lineout(0, X(500), 0);
    }
    else if (id === 'posts') { for (let k = 0; k < 7; k++) { put(H(k), X(1000), G.CY); put(A(k), X(1050), G.CY); } TT.sp.startSetKick(0, 'conv', G.Y0 + 90); }
    else if (id === 'turbo') {
      put(H(6), X(400), G.CY); [1, 3, 5].forEach((k, i) => put(A(k), X(620 + i * 70), G.CY + (i - 1) * 40));
      TT.sim.giveBall(6); m.hype[0] = 100; if (!n.pie) TT.arc.spawnPowerup('pie', [X(470), G.CY - 30, 0]);
    }
    // the human takes the piece
    if (TT.seats[0]) { const h = holder(); TT.seats[0].pid = h && h.team === 0 ? h.id : (m.players.find(p => p.team === 0 && p.st !== 'off') || {}).id; }
  },
  step(dt) {
    const m = M, d = m.drill; if (!d) return;
    d.t += dt;
    const goals = this.goals[d.id](d.n), all = goals.every(g => g[1]);
    if (all && !d.done) { d.done = true; d.doneT = 0; TT.audio.sting('win'); TT.hud.banner('DRILL COMPLETE!', { scale: 3 }); const done = E.store.get('thugby:drills', {}) || {}; done[d.id] = true; if (!TT.cfg.session) E.store.set('thugby:drills', done); TT.bus.emit('drillDone', { id: d.id }); }
    if (d.done) { d.doneT += dt; if (d.doneT > 2.5 && !d.stay) { if (TT.drillNext) TT.drillNext(d.id); } return; }
    // SHOW ME: the coach's auto script drives the human's player
    const I = TT.game.input;
    if (I.pressed('view') && !d.showMe && TT.seats[0]) { d.showMe = true; TT.seats[0].kind = 'script'; TT.comm.show('barry', 'Watch me, you muppets.'); TT.comm.talk.name = 'COACH GRISTLE'; }
    if (TT.seats[0] && TT.seats[0].kind === 'script') { TT.seats[0].intent = this.auto(d.id, TT.seats[0]); }
    // stoppages the drill didn't ask for, a tackle, a lost ball: reset in a second
    const bad = (m.phase === 'stop' && !(d.id === 'boot' && m.ph.label === 'DROP GOAL!')) || (m.phase === 'ruck' && d.id !== 'ruck') || (m.phase === 'play' && m.ball.st === 'held' && pl(m.ball.holder).team === 1 && d.id !== 'hit' && !(d.id === 'ruck' && (d.n.won || 0) >= 2)) || m.phase === 'full' || (m.phase === 'scrum' && d.id !== 'set') || (m.phase === 'lineout' && d.id !== 'set') || m.phase === 'penalty' || m.phase === 'kickoff';
    const idle = m.phase === 'play' && m.ball.st === 'dead';
    const tryDone = m.phase === 'try' && m.phaseT > 2;
    const kickDone = m.phase === 'setkick' && m.sub === 'result' && m.ph.subT > 1.2;
    const hitDone = d.id === 'hit' && m.phase === 'ruck';
    const ruckOut = d.id === 'ruck' && m.phase === 'play' && m.ball.st === 'held' && m.phaseT > .8;
    const setOut = d.id === 'set' && m.phase === 'play' && m.phaseT > .8;
    if (bad || idle || tryDone || kickDone || hitDone || ruckOut || setOut || (m.phase === 'play' && d.t > 25)) { d.resetT += dt; if (d.resetT > (hitDone ? .8 : 1)) { d.t = 0; this.reset(m); } }
  },
  /** the coach's (and the tests') way through each drill: an intent for the human's player */
  auto(id, seat) {
    const m = M, it = TT.blankIntent(), p = m.players[seat.pid]; if (!p) return it;
    const d = m.drill, n = d.n, t = m.t, dirX = dirOf(0), tick = Math.floor(t * 4);
    const run = (x, y, turbo) => { const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy) || 1; it.mx = dx / l; it.my = dy / l; it.turbo = !!turbo; };
    const tap = k => { if (tick % 2 === 0 && !d['_' + k + tick]) { d['_' + k + tick] = 1; it.p[k] = true; it.r[k] = true; } };
    if (m.phase === 'setkick') { if (m.sub === 'place') it.p.x = true; else if (m.sub === 'aim') { it.kickAim = 0; if (!d._pow) d._pow = 0; d._pow += 1 / 120; if (m.ph.power < Math.min(1, m.ph.need + .07) && d._pow < .97) it.h.ci = true; else { it.r.ci = true; d._pow = 0; } } return it; }
    if (m.phase === 'scrum') { if (m.sub === 'set' && m.ph.subT >= .48 && m.ph.subT < .55) it.p.x = true; if (m.sub === 'push') { const k = Math.floor(t * 20) % 2 ? 'l1' : 'r1'; it.p[k] = true; } return it; }
    if (m.phase === 'lineout') { if (m.sub === 'call' && m.ph.subT > .3) it.p.x = true; if (m.sub === 'throw' && Math.abs(m.ph.needle) < .2) it.p.x = true; return it; }
    if (m.phase === 'ruck') { if (Math.floor(t * 24) % 2) it.p.x = true; if (m.phaseT < .3) it.p.sq = true; return it; }
    const carrying = m.ball.holder === p.id;
    const tl = tryLineOf(0);
    if (id === 'legs' || (id === 'turbo' && n.super)) { run(tl + 30, G.CY, true); if ((p.x - tl) * dirX > 4) tap('x'); }
    else if (id === 'turbo') { if (m.pu) { run(m.pu.x, m.pu.y, true); } else { tap('tri'); run(tl + 30, G.CY, true); } }
    else if (id === 'hands') {
      it.mx = .1 * dirX;
      if (carrying && m.phaseT > .2 && p.stT > .5 && p.cool <= 0) {
        if (!n.up) tap('l1'); else if (!n.down) tap('r1');
        else if (!n.long) { d._lh = (d._lh || 0) + 1 / 120; if (d._lh < .35) it.h.l1 = true; else { it.r.l1 = true; d._lh = 0; } }
        else tap(p.y > G.CY ? 'l1' : 'r1');
      }
    }
    else if (id === 'feet') { run(p.x + dirX * 60, G.CY + Math.sin(t) * 40, false); const f = TT.sim.nearestFoe(p); if (f && Math.hypot(f.x - p.x, f.y - p.y) < 30) { if ((n.step || 0) < 2) tap('x'); else if (!n.spin) { tap('x'); if (p.st === 'sidestep' && p.stT > .05) it.p.x = true; } else if (!n.fend) { if (Math.hypot(f.x - p.x, f.y - p.y) < 24) tap('sq'); } } }
    else if (id === 'hit' || (id === 'ruck' && (n.won || 0) >= 2)) {
      const h = holder();
      if (!n.switch) { tap('ci'); tap('l1'); }
      if (h && h.team === 1) {
        const dd = Math.hypot(h.x - p.x, h.y - p.y); run(h.x, h.y, dd > 30);
        if (id === 'ruck') { if (dd < 12) tap('x'); }
        else if (!n.tackle) { if (dd < 11) tap('x'); }
        else if (!n.big) { if (dd > 16) it.h.x = p.st === 'charge' ? p.charge < TUNE.v.bigHitCharge * 1.05 : true; else it.r.x = true; }
        else if (!n.dive) { if (dd < 22) tap('sq'); }
      }
    }
    else if (id === 'ruck') { run(p.x + dirX * 80, p.y, false); }
    else if (id === 'boot') {
      if (!n.grubber) { if (carrying) { it.mx = dirX; tap('ci'); } else if (m.ball.st !== 'held') run(m.ball.x, m.ball.y, true); }
      else if (!n.touch) { if (carrying) { it.mx = dirX * .5; it.my = .9; d._kh = (d._kh || 0) + 1 / 120; if (d._kh < .7) it.h.ci = true; else { it.r.ci = true; d._kh = 0; } } }
      else if (!n.drop) { if (carrying) { it.mx = dirX * .2; d._dh = (d._dh || 0) + 1 / 120; if (d._dh < .85) it.h.ci = true; else { it.r.ci = true; d._dh = 0; } } }
    }
    return it;
  },
  draw(r) {
    const d = M.drill; if (!d) return;
    r.overlay(g => {
      const W = r.W, goals = this.goals[d.id](d.n), x = W - 150, y = 50;
      TT.ui.panel(g, x, y, 144, 22 + goals.length * 12);
      E.font.text(g, 'DRILL: ' + d.def.name, x + 6, y + 5, '#ffe080', { outline: false });
      goals.forEach(([lab, ok], i) => { E.font.text(g, (ok ? '★ ' : '• ') + lab, x + 6, y + 18 + i * 12, ok ? '#80ff90' : '#ffffff', { font: 'tiny', outline: false }); });
      E.ui.box(g, W / 2 - 170, 52, 340, 15, { bg: '#0c1020', border: '#3a4460', alpha: .8, gradient: false });
      TT.prompt(g, d.def.prompt, W / 2, 56, TT.game.input);
      if (!d.done) TT.prompt(g, d.showMe ? 'COACH IS SHOWING YOU' : '{b:view} SHOW ME', W - 78, y + 30 + goals.length * 12, TT.game.input);
    });
  },
  stop() { for (const off of this.listeners || []) off(); this.listeners = []; }
};

/* ---- THE ATTRACT MODE: CPU against CPU with the clock off; a director walks a showcase of every feature ---- */
TT.attract = {
  loop: 0, active: false,
  start() {
    if (TT.cfg.session) return;
    const pairs = [['mud', 'bad', 'park'], ['gul', 'irn', 'docks'], ['irn', 'mud', 'furnace'], ['meg', 'gul', 'dome']];
    const [h, a, v] = pairs[this.loop++ % pairs.length];
    TT.game.go('match', { attract: true, home: h, away: a, venue: v, seed: 1000 + this.loop });
  },
  begin() { this.active = true; this.t = 0; this.stepI = 0; this.stepT = 0; this.fired = []; this.grace = .6; },
  STEPS: ['walkout', 'run', 'passes', 'monster', 'jackal', 'knockon', 'touch', 'powerup', 'hazard', 'thunder', 'conversion', 'cheap', 'fire', 'dropgoal', 'end'],
  step(dt) {
    this.t += dt; this.grace -= dt;
    if (this.grace <= 0 && TT.anyInput()) { TT.game.players.forEach(I => I.consumeAll()); this.active = false; TT.idle.t = 0; TT.game.go('title'); return true; }
    this.stepT += dt;
    const s = this.STEPS[this.stepI];
    const ready = M.phase === 'play' && M.ball.st === 'held' && this.stepT > 3.5;
    const next = () => { this.fired.push(s); this.stepI++; this.stepT = 0; };
    if (s === 'walkout') { if (M.phase === 'play') next(); }
    else if (s === 'run' || s === 'passes') { if (this.stepT > 6) next(); }
    else if (ready || this.stepT > 12) {
      const F = TT.force;
      if (s === 'monster') F('monsterHit'); else if (s === 'jackal') F('ruck', { jackal: true }); else if (s === 'knockon') F('knockOn'); else if (s === 'touch') F('touch');
      else if (s === 'powerup') F('powerup', { kind: TT.POWERUP_IDS[this.loop % 5] }); else if (s === 'hazard') F('hazard', { kind: M.venue.hazard === 'mud' ? 'chicken' : M.venue.hazard });
      else if (s === 'thunder') F('thunderTry'); else if (s === 'conversion') { /* comes with the try */ } else if (s === 'cheap') F('yellow'); else if (s === 'fire') F('onFireTry'); else if (s === 'dropgoal') F('dropGoal');
      else if (s === 'end') { this.active = false; TT.game.go('records', { attract: true }); return true; }
      next();
    }
    return false;
  },
  draw(r) {
    r.overlay(g => {
      E.font.title(g, 'DEMO', r.W / 2, 40, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      if (Math.floor(PR.t * 2) % 2) E.font.text(g, TT.cfg.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', r.W / 2, r.H - 30, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
      E.font.title(g, 'THUGBY TURBO', r.W - 70, r.H - 64, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd040', '#e06020'] });
    });
  }
};

/* ---- results: after a match ---- */
TT.toResults = () => {
  if (!M) return;
  const s = M.stats, w = M.winner;
  const potmTeam = w >= 0 ? w : 0;
  let best = null, bs = -1;
  for (const p of M.players) if (p.team === potmTeam) { const v = p.tries * 10 + p.monsters * 4 + p.tackles + TT.metres(p.metres) / 10; if (v > bs) { bs = v; best = p; } }
  const r = { home: M.teams[0].id, away: M.teams[1].id, score: M.score.slice(), winner: w, stats: s.map(x => Object.assign({}, x)), potm: best ? { team: M.teams[potmTeam].id, idx: best.idx, tries: best.tries, tackles: best.tackles, metres: TT.metres(best.metres) } : null, cup: M.o.cup, seats: TT.seats.map(x => x.team), hit: TT.metres(M.bestHit), tries: Math.max(s[0].tries, s[1].tries), venue: M.venue.id };
  TT.game.go('results', r);
};
