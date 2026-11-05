// MASH TV: the run, the flow between scenes, and the play scene.
MT.cheats = { god: false, infBombs: false, oneHit: false, freezeEnemies: false, noclip: false, autopilot: false, botPartner: false, muteChatter: false };
MT.ov = { cur: null, freeze: true };   // dev panel and other overlays
MT.openOverlay = function (o) { MT.ov.cur = o; MT.overlay.open = 1; };
MT.closeOverlay = function () { MT.ov.cur = null; MT.overlay.open = 0; };
MT.devBadge = () => !!(MT.run && MT.run.mode !== 'session' && (MT.tuneTouched() || Object.values(MT.cheats).some(Boolean) || MT.run.devTouched));

// ---- the run ----------------------------------------------------------------------------------------------------------
MT.newRun = function (o = {}) {
  const game = MT.game;
  const run = MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed: o.seed || (Date.now() % 100000) + 1, ep: o.ep || 1, roomId: null, path: [], keys: 0, seenEnemies: {}, prizeBag: null, cs: [], devTouched: false, startT: game.time, epStart: {}, lastEntry: 'S' };
  MT.seedAll(run.seed); MT.hud.reset && MT.hud.reset();
  const slots = o.players || [{ slot: 0, look: 0 }];
  for (const p of slots) {
    const c = MT.newContestant(p.slot, { look: p.look === undefined ? p.slot : p.look, input: p.input || game.players[p.slot] || null, kind: p.kind || 'local', name: p.name });
    if (p.bot) c.kind = 'bot';
    c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c);
  }
  return run;
};
MT.flow = {
  startEpisode(ep) { const run = MT.run; run.ep = ep; run.epStart = {}; for (const c of run.cs) run.epStart[c.slot] = c.cash; run.keysAtEpStart = run.keys; run.prizeBag = null; MT.game.go('episodeCard', { ep }); },
  enterRoom(id, entry) { MT.run.lastEntry = entry; MT.game.go('play', { room: id, entry }, { fade: 'dissolve', seconds: .35 }); },
  afterEpisodeCard(ep) { MT.flow.enterRoom(MT.EPISODES[ep].start, 'S'); },
  afterBoss() { const run = MT.run; if (run.mode === 'session') return; MT.game.go('recap', { ep: run.ep }); },
  afterRecap(ep) {
    const run = MT.run;
    if (ep < 3) { MT.flow.startEpisode(ep + 1); return; }
    if (run.keys >= MT.KEYS_NEEDED && run.mode !== 'rehearsal') { run.green = true; MT.flow.enterRoom('GR', 'S'); }
    else MT.game.go('ending', { which: 'A' });
  },
  afterEnding() { MT.flow.finishRun('win'); },
  finishRun(how) {
    const run = MT.run; if (!run) { MT.game.go('title'); return; }
    if (run.mode === 'rehearsal' || run.mode === 'attract' || run.mode === 'test' || MT.devBadge()) { MT.game.go('scores', { fresh: false }); return; }
    const q = run.cs.filter(c => MT.cab.qualifies(c.cash, 'show')); MT.game.go('initials', { list: q.map(c => c.slot), how });
  },
  gameOver() { MT.game.go('gameover', {}); }
};
MT.unlock = ep => { const u = MT.sget('mashtv:unlocked', 1); if (ep > u) MT.sset('mashtv:unlocked', ep); };

// ---- the play scene -------------------------------------------------------------------------------------------------------
const play = MT.scenes = MT.scenes || {};
play.play = {
  pausable: true, camera: { zoom: false }, input: MT.PLAY,
  enter(d) {
    const game = MT.game, run = MT.run || (MT.newRun({ mode: 'test' })); const rm = MT.ROOMS[d.room]; if (!rm) throw new Error('no room ' + d.room);
    this.d = d; run.roomId = d.room; if (!run.path.includes(d.room)) run.path.push(d.room); if (run.mode === 'arcade' || run.mode === 'rehearsal') { if (rm.ep) MT.unlock(rm.ep); }
    this.session = run.mode === 'session'; this.pausable = !this.session; this.cont = null; this.over = false; this.leaving = false; this.sceneT = 0;
    for (const c of run.cs) { c.rig = c.rig || null; if (c.state === 'gone') continue; if (c.state === 'out') c.state = 'out'; else c.state = 'alive'; }
    const w = this.w = new MT.World({ room: rm, contestants: run.cs, entry: d.entry || 'S', session: this.session, demo: run.mode === 'attract', mode: d.netMode || 'solo', R: d.R });
    MT.worldNow = w; w.onExit = (dir, dest) => this.exitRoom(dir, dest); w.onBossDone = () => this.bossDone(); w.onAllOut = () => this.allOut();
    w.onDone = () => this.greenDone();
    game.lights.enabled = true; game.lights.ambient = MT.SETS[w.set].ambient; game.timeScale = MT.T.timeScale;
    game.cam.bounds = v => w.map.bounds(v); game.focus(MT.CX, MT.CY, 0); this._z = 0;
    const ep = MT.EPISODES[rm.ep]; const song = rm.boss ? 'bossShowdown' : rm.green ? 'recap' : ep ? ep.song : 'studioBattle'; MT.music.play(song, { fade: .5 }); MT.music._i = null;
    MT.hud.cursorOn(false); MT.lines.clear();
    if (!this.session && run.mode !== 'attract') game.allowJoin({ max: 4, keys: false, onJoin: (input, n) => this.dropIn(input, n) }); else game.allowJoin(false);
    if (MT.net && w.session) MT.net.onWorld(w, this);
    this.bossLines = false; this.robotLines = false;
    MT.emit('roomEnter', w);
  },
  exit() { MT.hud.cursorOn(true); MT.worldNow = null; if (MT.net && MT.net.onWorldExit) MT.net.onWorldExit(); MT.closeOverlay(); this.w = null; MT.music._i = null; },
  dropIn(input, n) {
    const run = MT.run, w = this.w; if (!w || run.cs.find(c => c.input === input)) return;
    const slot = [0, 1, 2, 3].find(s => !run.cs.some(c => c.slot === s)); if (slot === undefined) return;
    const c = MT.newContestant(slot, { look: slot, input }); c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c); c.state = 'alive'; w.respawn(c); c.hp = c.maxHp; if (w.cs !== run.cs) w.cs.push(c);
  },
  update(dt) {
    const w = this.w, game = MT.game; if (!w) return; this.sceneT += dt; MT.audioTick();
    MT.hud.update(dt);
    // overlays (dev panel etc.)
    const ov = MT.ov.cur; if (ov) { ov.update(dt); }
    this.pausable = !this.session && !ov;
    let dtw = dt; if (ov && MT.ov.freeze && !(ov.stepOnce)) dtw = 0; if (ov && ov.stepOnce) { dtw = 1 / 30; ov.stepOnce = false; }
    if (this.cont) { MT.cab.update(dt); if (MT.cab.continuing) { dtw = 0; } }
    if (this.session && MT.net) { MT.net.update(w, dt, this); }
    else {
      if (w.phase === 'bossIntro' && !this.bossLines) { this.bossLines = true; this.startBossIntro(); }
      w.step(dtw);
    }
    if (w.phase === 'bossIntro' && (MT.game.players.some(p => p.pressed('confirm'))) && !this.session) MT.lines.skip();
    if (w.boss && !this.deadLine && w.phase === 'bossDeath') { this.deadLine = true; const k = w.boss.kind, T = MT.TEXT.boss[k]; if (k === 'lance') { for (const [s, t] of T.dead) MT.lines.say(s, t, { prio: 3, force: true }); } else MT.lines.say('LANCE', T.dead, { prio: 3, force: true }); }
    if (w.boss && w.boss.kind === 'lance') {
      if (w.boss.sub === 'crash' && !this.robotLines) { this.robotLines = true; for (const [s, t] of MT.TEXT.boss.lance.robot) MT.lines.say(s, t, { prio: 3, force: true }); }
      if (w.boss.stage === 'network' && !this.netLines) { this.netLines = true; MT.music.layer('phase2', 1, 1); for (const [s, t] of MT.TEXT.boss.lance.network) MT.lines.say(s, t, { prio: 3, force: true }); }
    }
    if (w.boss && w.boss.phase >= 2) MT.music.layer('phase2', 1, 1);
    game.focus(MT.CX, MT.CY, 0);
    const ex = w.rm.boss && w.rm.boss !== 'mashy' ? 46 : w.rm.boss ? 22 : 6; const z = MT.fitZoom(game, w.map, ex); if (Math.abs(z - this._z) > .002) { this._z = z; game.setZoom(z); } game.cam.offset = [0, Math.round(ex / 2)];
    MT.music.intense(w.alive() >= 30 && !w.boss);
    if (this.w && w.cheats !== MT.cheats) w.cheats = MT.cheats;
    if (!this.session && game.settings.camView === 'Overhead' && game.view.id !== 'topdown') game.setView('topdown'); else if (!this.session && game.settings.camView !== 'Overhead' && game.view.id !== 'threequarter') game.setView('threequarter');
    // tutorials (arcade first room)
    if (w.rm.tutorial && w.phase === 'waves') this.tutorials(w);
    if (w.cs.some(c => c.intent && c.intent.aimSrc === 'mouse')) MT.hud.cursorOn(true && false);
    const mouseAim = w.cs[0] && w.cs[0].intent && w.cs[0].intent.aimSrc === 'mouse' && w.cs[0].state === 'alive'; MT.hud.cursorOn(!mouseAim && !!MT.ov.cur);
  },
  tutorials(w) {
    const H = MT.hud, T = MT.TEXT.tut;
    if (w.waveI === 0) { H.tutorial('move', 'move', T.move, 4); H.tutorial('aim', 'aim', T.aim, 4); }
    if (w.pickups.some(p => p.kind === 'cap')) H.tutorial('cap', null, T.cap, 4);
    if (w.waveI >= 2) H.tutorial('boat', 'showboat', T.boat, 4);
    if (w.waveI >= 3) H.tutorial('slide', 'slide', T.slide, 4);
    if (w.alive() >= 20) H.tutorial('bomb', 'bomb', T.bomb, 4);
  },
  startBossIntro() {
    const w = this.w, k = w.boss.kind, list = MT.TEXT.boss[k].intro, game = MT.game;
    game.script(function* () { for (const [s, t] of list) { const h = MT.lines.cut(s, t); yield E.until(() => h.done); } w.bossIntroDone = true; });
    MT.music.play('bossShowdown'); w.bossIntroLock = true; game.after(1.2, () => { if (w) w.bossIntroLock = false; });
  },
  exitRoom(dir, dest) {
    if (this.leaving) return; this.leaving = true; const run = MT.run;
    if (this.session) { MT.net.exitRoom(this.w, dir, dest); return; }
    MT.game.go('mapcard', { from: this.w.rm.id, to: dest, dir, ep: this.w.rm.ep }, { fade: 'dissolve', seconds: .4 });
  },
  bossDone() {
    if (this.over) return; this.over = true;
    if (this.session) { MT.net.bossDone(this.w); return; }
    const run = MT.run; if (run.mode === 'arcade' || run.mode === 'rehearsal') MT.unlock(Math.min(3, run.ep + 1));
    MT.game.after(1.2, () => { if (run.mode === 'test' && MT.test && MT.test.noFlow) return; MT.flow.afterBoss(); });
  },
  greenDone() { if (this.over) return; this.over = true; MT.game.after(1.2, () => MT.game.go('ending', { which: 'B' })); },
  allOut() {
    const w = this.w, run = MT.run; if (this.session || this.cont) return;
    if (run.mode === 'attract') { return; }
    this.cont = true; MT.lines.say('LANCE', MT.TEXT.cont, { prio: 3, force: true });
    MT.cab.continue(10, ok => { this.cont = null; if (ok) this.continueRun(); else MT.flow.gameOver(); });
  },
  continueRun() {
    const w = this.w, run = MT.run, d = MT.DIFF[run.diff]; w.allOutFired = false;
    for (const c of run.cs) { c.lives = MT.T.startLives || d.lives; c.cash = Math.floor(c.cash / 2); c.continues++; c.hp = c.maxHp; if (c.state === 'out') w.respawn(c); }
    MT.hud.banner('THE NETWORK TAKES ITS CUT!', '#ff3344', 2);
  },
  draw(r) {
    const w = this.w, game = MT.game; if (!w) return;
    w.draw(r);
    MT.hud.draw(r, w, this);
    if (this.cont) MT.cab.draw(r);
    if (MT.ov.cur) MT.ov.cur.draw(r);
    if (this.session && MT.net) MT.net.drawOverlay(r, w);
  }
};
