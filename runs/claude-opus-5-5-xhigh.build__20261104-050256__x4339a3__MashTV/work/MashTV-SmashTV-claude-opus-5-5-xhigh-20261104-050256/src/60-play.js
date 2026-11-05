// ---- the play scene: the run, the room state machine around the World, overlays, transitions, joining, continues ----
/** a new run: { mode: 'arcade' | 'rehearsal' | 'session' | 'attract' | 'test', diff, seed, ep } */
MT.newRun = (o = {}) => {
  const seed = o.seed === undefined ? (Math.floor(Math.random() * 1e9) >>> 0) : o.seed >>> 0;
  MT.seedAll(seed); MT.resetIds();
  MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed, ep: o.ep || 1, roomId: null, path: [], keys: 0, keyRooms: [], players: [], contestants: [], ratings: new Ratings(15), tut: {}, seen: {}, prizeBag: {}, devTouched: false, startedAt: game ? game.real : 0, recaps: 0 };
  LINES.clear(); MT.banners.list.length = 0; MT.tut.cur = null; MT.tut.queue.length = 0;
  return MT.run;
};
/** a contestant joins the run: { slot, look, ctl: 'local' | 'bot' | 'remote' | 'mirror', input, bot, name, netId } */
MT.addRunPlayer = (o) => {
  const run = MT.run, slot = o.slot === undefined ? run.players.length : o.slot;
  const pr = MT.makePlayerRecord(slot, o.look === undefined ? slot : o.look, o.name); if (o.netId !== undefined) pr.id = o.netId;
  run.players.push(pr);
  const c = new Contestant(pr, { ctl: o.ctl || 'local', input: o.input || null, bot: o.bot || null, netId: o.netId === undefined ? slot : o.netId });
  if (o.god) c.godMode = true; if (o.infBombs) c.infBombs = true;
  run.contestants.push(c);
  return c;
};
const PLAY = MT.play = { world: null, overlay: null, trans: null, extras: [], t: 0 };
/** load a room into a fresh World (the contestants carry over) */
PLAY.load = (roomId, entry, hold) => {
  const run = MT.run, room = MT.ROOMS[roomId];
  if (!room) { game.fail('load room', new Error('no room ' + roomId)); return null; }
  const w = new World({ room, entry: entry || 'S', run, session: run.mode === 'session', attract: run.mode === 'attract', mode: (MT.net && MT.net.active && !MT.net.isHost) ? 'mirror' : 'auth' });
  if (MT.net && MT.net.active) MT.net.attachWorld(w);
  for (const c of run.contestants) { if (c.state !== 'out') { c.state = 'play'; c.hp = Math.max(c.hp, 1); c.invuln = 0; c.boatT = 0; c.slideT = 0; } w.contestants.push(c); }
  run.roomId = roomId; run.ep = room.ep || run.ep; if (!run.path.includes(roomId)) run.path.push(roomId);
  if (room.props) w.props = room.props;
  PLAY.world = w; PLAY.extras.length = 0;
  if (hold) w.phase = 'HOLD'; else w.begin();
  const ep = MT.EPISODES[room.ep] || MT.EPISODES[1];
  if (room.type === 'boss') { /* the boss intro starts its music */ } else if (room.type === 'bonus') MT.music.play('recap'); else MT.music.play(ep.song);
  if (run.mode === 'arcade' && room.ep) { const best = E.store.get('mashtv:eps', 1); if (room.ep > best) E.store.set('mashtv:eps', room.ep); }
  game.lights.enabled = true; game.lights.ambient = w.arena.set.ambient;
  if (!game.headless) w.arena.fitCamera();
  return w;
};
/** the static wipe between rooms: out (.4 s), fn at its middle, in (.4 s) */
PLAY.wipe = (fn) => { PLAY.trans = { t: 0, fn, fired: false }; MT.sfx('static'); };
/** an overlay that holds the world still: { update(dt) -> true while it runs, draw(r) } */
PLAY.show = ov => { PLAY.overlay = ov; };
PLAY.mapCard = (cur, next, then) => {
  const ep = (MT.ROOMS[next] && MT.ROOMS[next].ep) || MT.run.ep;
  return { t: 0, update(dt) { this.t += dt; const nav = UI.nav(); if (this.t > .4 && (nav.confirm || nav.start)) this.t = 99; return this.t < 2.5; }, draw(r) { r.overlay(g => HUD.mapCard(g, r, ep, MT.run, cur, next, game.real, this.t / 1.2)); }, done: then };
};
PLAY.episodeCard = (epId, then) => {
  LINES.seq('ep' + epId); MT.music.play('theme', { fade: .3 });
  return { t: 0, update(dt) { this.t += dt; const nav = UI.nav(); if (this.t > .6 && (nav.confirm || nav.start)) { LINES.clear(); this.t = 99; } return this.t < 4.2 || (LINES.busy() && this.t < 12); }, draw(r) { r.overlay(g => HUD.episodeCard(g, r, epId, this.t)); }, done: then };
};
/** the next room through an exit */
PLAY.advance = (out) => {
  const from = MT.run.roomId, to = out.to, entry = MT.entryFor(out.exit);
  if (MT.net && MT.net.active && !MT.net.isHost) return;   // a client waits for the host's room message
  PLAY.wipe(() => {
    if (MT.run.mode === 'attract') { MT.attract.next(); return; }
    if (MT.run.mode === 'session') { PLAY.load(to, entry); if (MT.net) MT.net.roomChanged(PLAY.world); return; }
    PLAY.show(PLAY.mapCard(from, to, () => PLAY.wipe(() => PLAY.load(to, entry))));
  });
};
/** a pad's Start mid-run: a new contestant drops in on a cable */
PLAY.join = (input) => {
  const run = MT.run; if (!run || run.mode !== 'arcade' && run.mode !== 'rehearsal') return;
  const used = run.contestants.map(c => c.slot); let slot = 0; while (used.includes(slot)) slot++; if (slot > 3) return;
  input.use(MASH_PLAY);
  const c = MT.addRunPlayer({ slot, look: slot, ctl: 'local', input });
  const w = PLAY.world; if (w) { w.contestants.push(c); const [x, y] = w.freePoint(30); c.dropIn(x, y); }
  MT.banners.show('P' + (slot + 1) + ' ' + c.pr.name + ' JOINS!', { color: SLOT_COLORS[slot] });
};
PLAY.continueOverlay = () => {
  const cab = MT.cab; LINES.seq('continue'); MT.music.play(null);
  cab.continue(10, ok => {
    if (ok) { for (const c of MT.run.contestants) { c.pr.lives = startLivesNow(); c.pr.cash = Math.floor(c.pr.cash / 2); c.pr.continues++; c.state = 'dead'; c.deadT = .3; } MT.banners.show(MT.TEXT.ui.network, { color: '#ff3344' }); MT.music.play((MT.EPISODES[MT.run.ep] || MT.EPISODES[1]).song); PLAY.overlay = null; }
    else game.go('gameover', {});
  });
  let tick = 10;
  return { cont: true, update(dt) { cab.update(dt); const left = cab._cont ? Math.ceil(cab._cont.t) : 0; if (left !== tick) { tick = left; MT.music.sting('tick'); } return cab.continuing; },
    draw(r) { r.overlay(g => { const left = cab._cont ? Math.max(0, Math.ceil(cab._cont.t)) : 0; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); UI.title(g, MT.TEXT.ui.continueQ, r.W / 2, r.H * .28, 3); UI.title(g, String(left), r.W / 2, r.H * .28 + 34, 5, { colors: ['#ffffff', '#ff3344'] }); UI.text(g, MT.TEXT.ui.halfWinnings, r.W / 2, r.H * .28 + 84, '#ff3344', { align: 'center', scale: 2 }); UI.promptBar(g, r, [['confirm', 'CONTINUE']]); }); } };
};
MT.scenes = MT.scenes || {};
MT.scenes.play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MASH_PLAY, touch: [], camera: { zoom: false }, expand: true,
  enter(data = {}) {
    PLAY.overlay = null; PLAY.trans = null; PLAY.t = 0; MT.overlay.open = false;
    if (!MT.run) { MT.newRun({ mode: 'arcade' }); MT.addRunPlayer({ slot: 0, input: game.input }); }
    const run = MT.run;
    game.setView(game.settings.camView === 'Overhead' ? 'topdown' : 'threequarter');
    this.pausable = run.mode !== 'session' && run.mode !== 'attract';
    if (run.mode === 'arcade' || run.mode === 'rehearsal') game.allowJoin({ max: 4, keys: false, onJoin: (input) => PLAY.join(input) }); else game.allowJoin(false);
    for (const p of game.players) p.touchEnabled = false;
    const room = data.room || run.roomId || '1-1';
    PLAY.load(room, data.entry || 'S', !!data.intro);
    const w = PLAY.world;
    if (data.intro === 'coldOpen') { PLAY.show(MT.cut.overlay(MT.cut.coldOpen(w), () => PLAY.show(PLAY.episodeCard(1, () => { w.begin(); MT.music.play(MT.EPISODES[1].song); })))); }
    else if (data.intro === 'episode') { PLAY.show(PLAY.episodeCard(MT.ROOMS[room].ep, () => { w.begin(); MT.music.play(MT.EPISODES[MT.ROOMS[room].ep].song); })); }
    else if (data.intro === 'greenroom') { LINES.seq('greenRoomOpen'); PLAY.show({ t: 0, update(dt) { this.t += dt; return this.t < 3; }, draw(r) {}, done: () => w.begin() }); }
    if (data.after) data.after(w);
  },
  exit() { MT.overlay.open = false; if (MT.dev) MT.dev.close(true); if (!game.headless) game.screen.canvas && (game.screen.canvas.style.cursor = ''); },
  update(dt) {
    const w = PLAY.world, real = game.paused ? 0 : 1 / 120;
    PLAY.t += dt;
    if (w && !game.headless) { w.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
    if (w && MT.run.mode !== 'session') { const want = w.enemies.length >= 30; if (want !== PLAY.intense) { PLAY.intense = want; MT.music.layer('intense', want, 1); } }
    PLAY.murmur = (PLAY.murmur || 0) - dt; if (PLAY.murmur <= 0) { PLAY.murmur = 2.6; MT.babble.crowd('murmur', .25 + STUDIO.excite * .4); }
    if (PLAY.staticT > 0) PLAY.staticT -= dt;
    LINES.step(real || 0); MT.banners.step(dt); MT.tut.step(dt);
    if (MT.net && MT.net.active) MT.net.step(dt);
    if (PLAY.trans) { const T = PLAY.trans; T.t += 1 / 120; if (!T.fired && T.t >= .4) { T.fired = true; T.fn(); } if (T.t >= .8) PLAY.trans = null; }
    if (PLAY.overlay) { const ov = PLAY.overlay; if (!ov.update(dt)) { if (PLAY.overlay === ov) PLAY.overlay = null; if (ov.done) ov.done(); } if (!ov.cont) { MT.studioStep(dt, w); for (const x of PLAY.extras) x.step && x.step(dt); return; } }
    if (MT.dev && MT.dev.isOpen()) { MT.dev.update(dt); if (MT.dev.frozen()) return; }
    if (!w) return;
    if (w.phase === 'HOLD') { MT.studioStep(dt, w); return; }
    if (w.phase === 'BOSS_INTRO' && w.boss && !w.boss.introDone && w.boss.skipIntro && MT.run.mode !== 'session' && MT.run.mode !== 'attract' && game.players.some(p => p.map.confirm && p.pressed('confirm'))) { LINES.clear(); w.boss.skipIntro(); }
    if (MT.net && MT.net.active && !MT.net.isHost) MT.net.clientStep(w, dt);
    else w.step(dt);
    MT.react.drain(w); MT.studioStep(dt, w);
    for (const x of PLAY.extras) x.step && x.step(dt);
    if (MT.run.mode === 'attract') { MT.attract.step(dt, w); return; }
    // a contestant out of lives continues on their own with Start; everyone out: the continue countdown
    if (MT.run.mode !== 'session') {
      for (const c of w.contestants) if (c.state === 'out' && c.ctl === 'local' && c.input && c.input.pressed('start') && !w.allOut()) w.continueContestant(c);
      if (w.allOut() && !PLAY.overlay && !PLAY.trans) PLAY.show(PLAY.continueOverlay());
    }
    if (w.outcome && !PLAY.trans && !PLAY.overlay && !w.outcomeTaken) {
      w.outcomeTaken = true;
      if (w.outcome.exit) PLAY.advance(w.outcome);
      else if (w.outcome.done) PLAY.roomDone(w);
    }
  },
  draw(r) {
    const w = PLAY.world, t = game.real;
    if (!w) { r.sky(['#140a24', '#2a1446', '#140a24']); return; }
    w.draw(r, t);
    for (const x of PLAY.extras) x.draw && x.draw(r, t);
    if (MT.dev) MT.dev.drawWorld(r, w);
    if (w.props) for (const [id, x, y, f] of w.props) if (E.SHAPES[id]) r.shape(id, x, y, 0, { facing: f === undefined ? Math.PI / 2 : f });
    const hideHud = PLAY.overlay && PLAY.overlay.full;
    if (!hideHud) HUD.draw(r, w, t, { noTut: !!PLAY.overlay, noReticle: !!PLAY.overlay || (MT.dev && MT.dev.isOpen()) });
    if (PLAY.overlay) PLAY.overlay.draw(r);
    if (MT.run.mode === 'attract') MT.attract.drawOverlay(r);
    if (MT.dev && MT.dev.isOpen()) MT.dev.draw(r);
    if (MT.net && MT.net.active) MT.net.drawOverlay(r);
    if (PLAY.trans) { const k = PLAY.trans.t < .4 ? PLAY.trans.t / .4 : 1 - (PLAY.trans.t - .4) / .4; r.overlay(g => UI.static(g, r, k, t)); }
    if (PLAY.staticT > 0) r.overlay(g => { px.blend(g, Math.min(1, PLAY.staticT) * .8, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#ffffff')); UI.static(g, r, Math.min(1, PLAY.staticT), t); UI.title(g, MT.TEXT.ui.signalLost, r.W / 2, r.H * .4, 3, { colors: ['#140a24', '#5a5468'] }); });
    if (!game.headless && game.screen.canvas) { const aim = game.input.lastDevice === 'mouse' && !game.paused && !PLAY.overlay && !(MT.dev && MT.dev.isOpen()); game.screen.canvas.style.cursor = aim ? 'none' : ''; }
  },
};
/** a boss room or the bonus is over: the recap, the next episode, the Green Room or an ending */
PLAY.roomDone = (w) => {
  const run = MT.run, room = w.room;
  if (run.mode === 'attract') { MT.attract.next(); return; }
  if (run.mode === 'session') { if (MT.net) MT.net.roundWon(); return; }
  if (room.type === 'bonus') { game.go('ending', { kind: 'b' }); return; }
  game.go('recap', { ep: room.ep });
};
