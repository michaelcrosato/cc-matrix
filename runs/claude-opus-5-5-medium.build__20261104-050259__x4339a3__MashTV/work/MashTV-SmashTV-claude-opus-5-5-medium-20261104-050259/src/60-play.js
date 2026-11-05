// ---------------------------------------------------------------- the run and the show runner (room flow, cards, transitions, continue)
MT.newRun = (o = {}) => {
  MT.seed(o.seed || ((Date.now() & 0xffffff) | 1)); MT.resetIds(); MT.tut.reset(); MT.lines.clear(); MT.banner.clear();
  const run = MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed: MT.rng.seed, ep: o.ep || 1, roomId: null, path: [], keys: 0, keyRooms: {},
    contestants: [], introduced: {}, seen: {}, killedKinds: {}, usedW: {}, bossesSeen: {}, bombsUsed: 0, boats: 0, continues: 0, lanceRobot: false,
    ratings: new MT.Ratings(), prizeBags: {}, epCardShown: {}, scenes: [], devTouched: false, recaps: 0, greenRoom: false };
  for (const p of o.players || [{ slot: 0, look: 0, input: MT.game.input }]) {
    const c = new MT.Contestant(p.slot, { look: p.look, input: p.input, ctl: p.ctl || (p.input ? 'local' : 'bot'), name: p.name });
    if (p.name) c.named = true; if (p.color) { c.color = p.color; c.rig = MT.looks.make(c.look, c.color); }
    c.botOpts = p.botOpts || {}; run.contestants.push(c);
  }
  return run;
};
MT.Show = {
  W: null, state: 'idle', t: 0, card: null, map: null, staticK: 0, next: null, entry: 'S', cont: null, cab: null,
  begin(roomId, entry = 'S', o = {}) {
    const run = MT.run, room = MT.ROOMS[roomId]; if (!room) throw new Error('no room ' + roomId);
    if (this.W) this.W.dispose();
    run.roomId = roomId; run.ep = room.ep <= 3 ? room.ep : run.ep; run.path.push(roomId);
    const isStart = MT.EPISODES[room.ep] && MT.EPISODES[room.ep].start === roomId;
    if (isStart && !o.keepRatings) { run.ratings.R = 30; run.ratings.prime = 0; }
    const W = this.W = new MT.World({ room, contestants: run.contestants, entry, ratings: run.ratings, mode: run.mode, tutorial: !!room.tutorial && run.mode !== 'attract' && run.mode !== 'session' && !MT.tut.shown.move,
      keysOn: run.mode !== 'attract' || true, intro: run.mode !== 'attract' });
    for (const c of run.contestants) { c.bot = null; c.cheer = false; }
    W.start();
    MT.music.play(room.boss ? null : room.bonus ? 'recap' : (MT.EPISODES[room.ep] || MT.EPISODES[1]).song, { fade: .5 });
    if (room.bonus) MT.lines.sayAll(MT.TEXT.greenRoom, { prio: 3 });
    this.state = 'room'; this.t = 0; this.staticK = o.static ? 1 : 0;
    if (isStart && !run.epCardShown[room.ep] && run.mode !== 'attract' && run.mode !== 'session' && !o.noCard) { run.epCardShown[room.ep] = true; this.card = { ep: room.ep, t: 0 }; this.state = 'card'; MT.music.sting('stCard'); MT.lines.sayAll(MT.TEXT.epCard[room.ep], { prio: 3 }); }
    MT.emit('roomBegin', { id: roomId });
    return W;
  },
  intents(W) {
    const out = {};
    for (const c of W.contestants) {
      if (c.ctl === 'bot' || (c.slot === 0 && MT.CHEATS.autopilot && c.ctl === 'local')) out[c.slot] = MT.bot.intent(c, W, c.botOpts || {});
      else if (c.ctl === 'local') out[c.slot] = MT.intentFrom(c.input, c, W);
      else out[c.slot] = c.netIntent || MT.NOINTENT();
    }
    return out;
  },
  update(dt) {
    const W = this.W; if (!W) return;
    this.t += dt; this.staticK = Math.max(0, this.staticK - dt / .4);
    if (this.state === 'card') {
      this.card.t += dt;
      if (this.card.t > 1 && MT.ui.nav('confirm')) { this.card.t = 99; MT.lines.skipAll(); }
      if (this.card.t >= 3.6 && !MT.lines.busy || this.card.t > 30) { this.state = 'room'; this.card = null; this.staticK = 1; MT.lines.skipAll(); }
      return;
    }
    if (this.state === 'map') {
      this.map.t += dt;
      if (this.map.t > .6 && MT.ui.nav('confirm')) this.map.t = 99;
      if (this.map.t >= 2.6) { const n = this.map; this.map = null; this.begin(n.dest, n.entry, { static: true }); }
      return;
    }
    if (this.state === 'wipe') { this.wipeT += dt; this.staticK = Math.min(1, this.wipeT / .4); if (this.wipeT >= .4) { this.state = 'map'; this.map = Object.assign(this.pendingMap, { t: 0 }); MT.sfx('static', { vol: .5 }); } return; }
    if (this.state === 'continue') { this.contStep(dt); return; }
    // the room itself
    const it = this.intents(W);
    W.step(dt, it);
    if (W.phase === 'bossIntro' && MT.ui.held('confirm') && this.t > .5) { /* holding confirm skips the intro lines */ MT.lines.skipAll(); }
    if (MT.run.mode !== 'attract') MT.music.layer('intense', W.alive() >= 30 ? 1 : 0, 1);
    if (MT.run.mode !== 'attract' && MT.run.mode !== 'session' && W.contestants.length && W.contestants.every(c => c.state === 'out' || c.state === 'gone') && W.phase !== 'done') { this.startContinue(); return; }
    if (W.phase === 'done') this.roomDone(W);
  },
  roomDone(W) {
    const run = MT.run;
    if (this.onRoomDone && this.onRoomDone(W)) return;
    if (W.result === 'exit') { const dest = W.exitDest, entry = AR.opposite[W.exitDir]; this.pendingMap = { dest, entry, from: W.room.id }; this.state = 'wipe'; this.wipeT = 0; return; }
    if (W.result === 'boss') { MT.game.go('recap', { ep: W.room.ep }); this.state = 'idle'; return; }
    if (W.result === 'bonus') { run.greenRoom = true; MT.game.go('ending', { kind: 'b' }); this.state = 'idle'; return; }
    this.state = 'idle';
  },
  startContinue() {
    this.state = 'continue'; MT.music.play(null, { fade: .6 }); MT.lines.say(MT.TEXT.cont[0], MT.TEXT.cont[1], { prio: 3 });
    this.cont = { t: 10, tick: 10 }; this.cab.continue(10, ok => {
      if (ok) { for (const c of MT.run.contestants) if (c.state === 'out') { c.cash = Math.floor(c.cash / 2); c.lives = MT.startLives(); c.hp = MT.maxHp(); c.respawn(this.W); } MT.run.continues++; this.state = 'room'; this.W.event('continueOne', {}); MT.music.play((MT.EPISODES[this.W.room.ep] || MT.EPISODES[1]).song, { fade: .5 }); }
      else { this.state = 'idle'; MT.game.go('gameover', {}); }
    });
  },
  contStep(dt) {
    this.cab.update(dt); const c = this.cab._cont;
    if (c) { const n = Math.ceil(c.t); if (n !== this.cont.tick) { this.cont.tick = n; MT.sfx('countdown'); } this.cont.t = c.t; }
  },
  draw(r) {
    const W = this.W; if (!W) return;
    W.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0);
    if (this.state === 'map' && this.map) { this.drawMap(r, this.map); return; }
    W.draw(r);
    if (MT.run.mode !== 'attract') MT.hud.draw(r, W); else r.overlay(g => { MT.ui.banners(g, r); if (MT.lines.current) MT.ui.lowerThird(g, r); });
    if (this.state === 'card' && this.card) this.drawCard(r, this.card);
    if (this.state === 'continue') this.drawContinue(r);
    if (this.staticK > 0) r.overlay(g => MT.ui.static(g, r, this.staticK));
  },
  drawCard(r, c) {
    const ep = MT.EPISODES[c.ep];
    r.overlay(g => {
      const u = Math.min(1, c.t / .4), cx = r.W / 2, cy = r.H / 2;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const w = Math.min(300, r.W - 30), h = 110, x = cx - w / 2, y = cy - h / 2 - (1 - u) * 30;
      MT.ui.panel(g, x, y, w, h, { border: '#ff2e88' }); MT.ui.bulbs(g, x - 3, y - 3, w + 6, h + 6, MT.game.real);
      MT.ui.T(g, 'EPISODE ' + ep.n, cx, y + 12, '#2ee6ff', { align: 'center', scale: 2 });
      E.font.title(g, ep.title, cx, y + 36, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24', depth: 1 });
      MT.ui.T(g, 'LIVE FROM ' + ep.setName, cx, y + 80, '#fff7e8', { align: 'center' });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
      if (c.t > 1) MT.ui.promptBar(g, r, [['confirm', 'SKIP']]);
      if (c.t < .4) MT.ui.static(g, r, 1 - c.t / .4);
    });
  },
  drawMap(r, m) {
    const ep = MT.EPISODES[MT.ROOMS[m.dest].ep] || MT.EPISODES[1], run = MT.run;
    r.sky(['#0a0414', '#1a0a2c', '#2a1446']);
    r.overlay(g => {
      const cx = r.W / 2, top = 20; MT.ui.title(g, r, 'NEXT ON MASH TV', 10, '#ff2e88');
      MT.ui.T(g, 'EPISODE ' + ep.n + ': ' + ep.title, cx, top + 22, '#2ee6ff', { align: 'center' });
      const cw = 96, ch = 46, ox = cx - cw * 1.5, oy = top + 40;
      const pos = id => { const R = MT.ROOMS[id]; return [ox + R.cell[0] * cw + cw / 2, oy + R.cell[1] * ch + ch / 2]; };
      for (const id of ep.rooms) { const R = MT.ROOMS[id]; for (const d in R.exits || {}) { const a = pos(id), b = pos(R.exits[d]); const lit = run.path.includes(id) && run.path.includes(R.exits[d]); px.line(g, a[0], a[1], b[0], b[1], lit ? '#ffcc33' : '#4a3a5a', lit ? 2 : 1); } }
      const u = Math.min(1, m.t / 1.2), a = pos(m.from || m.dest), b = pos(m.dest); px.line(g, a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u), '#22ff66', 3);
      for (const id of ep.rooms) {
        const R = MT.ROOMS[id], [x, y] = pos(id), cur = id === m.dest, seen = run.path.includes(id), w = 84, h = 34;
        MT.ui.panel(g, x - w / 2, y - h / 2, w, h, { alpha: .95, border: cur ? (Math.floor(m.t * 4) % 2 ? '#22ff66' : '#ffffff') : seen ? '#ffcc33' : '#5a3a6a', bg: seen ? ['#3a1a4c', '#20102e'] : ['#1a0e28', '#100818'] });
        MT.hud.roomIcon(g, x - w / 2 + 4, y - h / 2 + 4, MT.roomIcon(R));
        const lines = E.font.wrap(R.name, w - 8, { font: 'tiny' }); lines.slice(0, 3).forEach((s, i) => MT.ui.T(g, s, x, y - 6 + i * 7, cur ? '#ffffff' : '#c8c0e0', { align: 'center', font: 'tiny' }));
        if (R.key) { const got = run.keyRooms[id]; MT.ui.T(g, '★', x + w / 2 - 9, y - h / 2 + 3, got ? '#5a4a20' : '#ffe060'); }
      }
      MT.ui.T(g, '★ ' + run.keys + '/9 GOLDEN KEYS', cx, r.H - 34, '#ffe060', { align: 'center' });
      MT.ui.promptBar(g, r, [['confirm', 'SKIP']]);
      if (m.t < .3) MT.ui.static(g, r, 1 - m.t / .3);
    });
  },
  drawContinue(r) {
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const cx = r.W / 2, cy = r.H / 2, n = Math.max(0, Math.ceil(this.cont.t));
      E.font.title(g, 'CONTINUE?', cx, cy - 50, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' });
      MT.ui.T(g, String(n), cx, cy - 14, '#ff2e88', { align: 'center', scale: 4 });
      MT.ui.T(g, '-50% WINNINGS', cx, cy + 22, '#fff7e8', { align: 'center' });
      MT.ui.promptBar(g, r, [['confirm', 'CONTINUE']]);
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
// joining mid-run: a free pad presses Options and drops in on a cable
MT.joinPlayer = (input, n) => {
  const run = MT.run; if (!run || run.contestants.length >= 4) return;
  const slot = run.contestants.length, c = new MT.Contestant(slot, { look: slot, input, ctl: 'local' });
  run.contestants.push(c); input.use(MT.wantPreset());
  if (MT.Show.W && MT.Show.W.contestants !== run.contestants) MT.Show.W.contestants.push(c);
  if (MT.Show.W) { c.lives = MT.startLives(); c.respawn(MT.Show.W); }
  MT.banner.show('P' + (slot + 1) + ' JOINS THE SHOW!', { color: c.color });
};

// ---------------------------------------------------------------- the play scene
MT.scenes = MT.scenes || {};
MT.scenes.play = {
  pausable: true, input: MT.PLAY, playInput: true, camera: { zoom: false },
  enter(d = {}) {
    const g = MT.game; g.lights.enabled = true; g.lights.ambient = .55;
    g.allowJoin({ max: 4, keys: false, onJoin: (inp, n) => MT.joinPlayer(inp, n) });
    MT.Show.cab = MT.cab; MT.Show.onRoomDone = null;
    if (!MT.run || d.fresh) MT.newRun(d.run || {});
    const room = d.room || MT.EPISODES[d.ep || 1].start;
    MT.Show.begin(room, d.entry || 'S', { noCard: d.noCard });
    if (d.dev) MT.dev.open();
    this.pausable = true;
  },
  exit() { const g = MT.game; g.allowJoin(false); MT.hud.cursor(false); if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; } MT.overlay.open = false; MT.overlay.kind = null; MT.dev.close(true); g.timeScale = 1; },
  update(dt) {
    MT.frame(dt);
    const g = MT.game; g.lights.ambient = MT.Show.W ? MT.Show.W.arena.set.ambient : .55;
    if (MT.overlay.open) { MT.overlayUpdate(dt); this.pausable = false; if (MT.overlay.frozen()) return; } else this.pausable = true;
    g.timeScale = MT.T.timeScale;
    MT.Show.update(dt);
  },
  draw(r) { MT.Show.draw(r); if (MT.overlay.open) MT.overlayDraw(r); }
};
// per-step bookkeeping shared by every scene
MT.frame = (dt) => {
  const g = MT.game, rdt = 1 / 120;
  MT.ui.tick(); MT.laterTick(rdt); MT.lines.update(rdt); MT.banner.update(rdt); MT.tut.update(rdt); MT.cast.tick(rdt);
  if (!g.headless && MT.W && MT.run && MT.run.mode !== 'session') MT.babble.ambience(rdt, MT.W.ratings.R / 100);
  if (MT.lines.current && MT.lines.current.prio >= 3 && g.scene && g.scene.skippable && MT.ui.nav('confirm')) MT.lines.skip();
};
// the pause menu's items open these overlays (they freeze the show themselves)
MT.overlay.frozen = () => MT.overlay.kind === 'dev' ? MT.dev.freeze : true;
MT.overlayUpdate = (dt) => {
  const k = MT.overlay.kind;
  if (k === 'dev') MT.dev.update(dt);
  else if (k === 'map') { if (MT.ui.nav('cancel') || MT.ui.nav('confirm') || MT.ui.clicked()) MT.closeOverlay(); }
  else if (k === 'howto') MT.howtoPanel.update(dt);
};
MT.overlayDraw = (r) => {
  const k = MT.overlay.kind;
  if (k === 'dev') MT.dev.draw(r);
  else if (k === 'map') { const W = MT.Show.W; MT.Show.drawMap(r, { dest: W.room.id, from: W.room.id, t: 2 }); r.overlay(g => MT.ui.promptBar(g, r, [['cancel', 'BACK']])); }
  else if (k === 'howto') MT.howtoPanel.draw(r);
};
MT.openOverlay = (kind) => { MT.game.resume(); MT.overlay.open = true; MT.overlay.kind = kind; MT.game.players.forEach(p => p.consumeAll()); if (kind === 'howto') MT.howtoPanel.open(() => MT.closeOverlay()); };
MT.closeOverlay = () => { MT.overlay.open = false; MT.overlay.kind = null; MT.game.players.forEach(p => { p.consumeAll(); }); };
