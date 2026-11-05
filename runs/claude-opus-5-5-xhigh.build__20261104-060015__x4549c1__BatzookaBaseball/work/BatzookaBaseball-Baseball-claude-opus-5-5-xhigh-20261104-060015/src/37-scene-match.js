/* =============================================================================
 * 37-scene-match: the match scene. It runs the simulation (30-match) in exact
 * steps, then the cosmetics: frames, rigs, cameras, the HUD, commentary, the
 * crowd; the Moonshot Cam and the home-run trot, replays, the boss's short
 * circuit, the Tour's scripted moments, and the hand-off to the results.
 * ========================================================================== */

BZ.matchData = null;
BZ.startMatch = (data, o = {}) => { BZ.matchData = data; BZ.game.go('match', data, o); };
BZ.scenes.match = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter(data) {
    const g = BZ.game, d = data || BZ.matchData || {};
    BZ.clearLater(); BZ.hud.clear(); BZ.talk.reset();
    Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null, ring: [], zoomI: 3, cut: 0 });
    BZ.bot.sides = {};
    const M = BZ.newMatch(d);
    this.M = M; this.data = d; this.finalT = 0; this.trot = null;
    BZ.talk.install(M); BZ.crowd.install(M);
    for (const [side, o] of Object.entries(d.bots || {})) BZ.bot.on(+side, o);
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    on('homer', ev => {
      const D = BZ.defense(M);
      if (M.boss && D.id === 'mechanicals' && D.pitcher.id === D.def.ace.id) { D.shortCircuit = 2; BZ.bus.emit('shortCircuit', {}); BZ.talk.say('short_circuit', {}, 3); }
      if (M.fast) return;
      M.cinematic = { kind: 'moonshot', t: 0, done: false };
      const runners = M.runners.filter(r => r.state === 'scored').map(r => ({ id: r.player.id, p: r.start, batter: r.isBatter }));
      BZ.cams.startMoonshot(M, () => { this.startTrot(M, runners); });
    });
    on('cinematicDone', () => {});
    on('playEnd', ev => { if (M.fast) return; const big = M.play && (M.play.bowl || M.play.outs.length >= 2 || (M.play.dpSaid) || M.events.slice(-30).some(e => e === 'catch' && false)); this.maybeReplay(M, big || this.bigCatch); this.bigCatch = false; });
    on('catch', ev => { if (ev.fly && (ev.dive || ev.wall)) this.bigCatch = true; });
    on('rhubarbStart', () => {});
    on('gameEnd', ev => { this.finalT = 0; const hw = ev.winner === 1; BZ.sting(ev.winner >= 0 && M.teams[ev.winner].humans.length ? 'victory' : M.teams.some(T => T.humans.length) ? 'defeat' : 'victory'); void hw; });
    if (d.onInstall) d.onInstall(M);
    // the park: light, weather, music
    const P = M.park, pd = P.def;
    g.lights.enabled = !!pd.night || pd.ambient < .9; g.lights.ambient = pd.ambient || .8; if (pd.lightTint) g.lights.tint = pd.lightTint;
    g.weather = pd.weather && BZ.cosmetic && !(g.settings && g.settings.motion) ? Object.assign({}, pd.weather) : null;
    BZ.music(pd.music);
    g.setView(BZ.VIEWS[BZ.fieldView()] || 'broadcast'); g.setZoom(1);
    BZ.wheelOwned = true;
    BZ.cams.focus = { x: P.H.x, y: P.H.y - 200, z: 0 }; g.focus(P.H.x, P.H.y - 200, 0); g.cam.snap = true;
    if (BZ.dev) BZ.dev.close && BZ.dev.close();
    BZ.bus.emit('scene', { scene: 'match', mode: M.mode });
  },
  exit() { BZ.endMatch(this.M); BZ.wheelOwned = false; BZ.game.weather = null; BZ.game.timeScale = TUNE.gameSpeed; BZ.cams.replay = null; BZ.cams.moon = null; for (const s in BZ.bot.sides) { const T = this.M && this.M.teams[s]; if (T && T.humans[0]) BZ.bot.releaseAll(T.humans[0].input); } },
  back() { return false; },
  maybeReplay(M, big) {
    const set = (BZ.game.settings && BZ.game.settings.replays) || 'big';
    if (set === 'off' || (set === 'big' && !big) || M.attract || M.mode === 'derby') return;
    M.cinematic = { kind: 'replay', t: 0, done: false };
    BZ.cams.startReplay(M, 4.5);
  },
  startTrot(M, runners) {
    // the batter jogs the bases at double speed, high-fiving the coaches (skippable)
    this.trot = { t: 0, runners: runners.length ? runners : [{ id: M.batter.id, p: 0, batter: true }] };
    BZ.cams.mode = 'field'; BZ.cams.cut = .3; BZ.cams.zoomI = 1;
  },
  trotStep(M, dt) {
    const T = this.trot; T.t += dt;
    let all = true;
    for (const r of T.runners) { r.p = Math.min(4, r.p + dt * 146 * 2 / 300); if (r.p < 4) all = false; }
    const skip = BZ.match.anyAdvance(M) && T.t > .3;
    if (all || skip || T.t > 6) { this.trot = null; if (M.cinematic) M.cinematic.done = true; const big = (M.lastBatted && M.lastBatted.zooka) || (M.play && M.play.hr && M.play.hr.dist > 420); if (big) this.maybeReplay(M, true); }
  },
  update(dt) {
    const g = BZ.game, M = this.M;
    if (!M) return;
    BZ.inputTick(g, dt);
    if (M.attract && BZ.attract.check(g)) return;
    if (BZ.dev && BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    if (BZ.dev) BZ.dev.pinInput(dt);
    if (M.cheats.slowmo) g.timeScale = .25 * TUNE.gameSpeed; else if (!BZ.cams.moon) g.timeScale = TUNE.gameSpeed;
    if (M.cheats.autoplay) for (const T of M.teams) if (T.humans.length && !BZ.bot.active(T.side)) BZ.bot.on(T.side, { level: 'allstar' });
    if (BZ.talk.cutscene) { BZ.talk.step(dt); this.cosmetics(M, dt, true); return; }
    // the replay: frames at half speed; ✕ skips
    if (BZ.cams.replay) {
      const R = BZ.cams.replay; R.acc += dt * .5 * 60; R.i = Math.floor(R.acc);
      if (R.i >= R.frames.length - 1 || (BZ.match.anyAdvance(M) && R.acc > 10)) { BZ.cams.replay = null; if (M.cinematic) M.cinematic.done = true; g.setView(BZ.VIEWS[BZ.fieldView()]); }
      else { const fr = R.frames[R.i]; BZ.cams.animate(M, fr, dt * .5); }
      this.cosmetics(M, dt, true); return;
    }
    if (BZ.cams.moon) {
      BZ.cams.moonStep(M, dt);
      if (BZ.match.anyAdvance(M) && BZ.cams.moon && BZ.cams.moon.t > .4) { const cb = BZ.cams.moon.then; BZ.cams.moon = null; g.timeScale = TUNE.gameSpeed; if (cb) cb(); }
      this.cosmetics(M, dt, true); return;
    }
    if (this.trot) { this.trotStep(M, dt); this.cosmetics(M, dt, false); return; }
    BZ.bot.update(M, dt);
    BZ.match.step(M, dt);
    if (M.cinematic && M.cinematic.done) M.cinematic = null;
    if (M.phase === 'final') {
      this.finalT += dt;
      if (this.finalT > (M.attract ? 1.5 : 3.2) || (BZ.match.anyAdvance(M) && this.finalT > .8)) { if (this.data.onFinal) this.data.onFinal(M); else BZ.game.go('results', { M, data: this.data }); return; }
    }
    if (this.data.onStep) this.data.onStep(M, dt);
    this.cosmetics(M, dt, false);
  },
  cosmetics(M, dt, paused) {
    const fr = BZ.cams.frame(M);
    if (this.trot) for (const r of this.trot.runners) { const p = BZ.runnerPos(M, r.p), q = BZ.runnerPos(M, Math.min(4, r.p + .02)); fr.runners.push({ id: r.id, x: p.x, y: p.y, facing: Math.atan2(q.y - p.y, q.x - p.x), moving: r.p < 4, cheer: r.p >= 4 }); }
    if (!paused) BZ.cams.record(M, fr, dt);
    if (!BZ.cams.replay) BZ.cams.animate(M, fr, dt);
    BZ.cams.live = fr; this.fr = fr;
    BZ.cams.update(M, dt);
    if (BZ.cams.mode === 'field' && !BZ.cams.replay && !BZ.cams.moon && this.trot) { const r0 = this.trot.runners.find(r => r.batter) || this.trot.runners[0]; if (r0) { const p = BZ.runnerPos(M, r0.p); BZ.game.focus(p.x, p.y, 0); } }
    if (BZ.cams.replay && BZ.game.view.id !== 'iso') { BZ.game.setView('iso'); BZ.game.setZoom(.62); }
    if (BZ.cams.replay) { const R = BZ.cams.replay, f = R.frames[Math.min(R.i, R.frames.length - 1)], b = f.ball; BZ.game.focus(b.mode === 'none' || b.mode === 'held' ? M.park.H.x : b.x, b.mode === 'none' || b.mode === 'held' ? M.park.H.y - 200 : b.y, 0); }
    BZ.hud.step(dt); BZ.talk.step(dt); BZ.crowd.step(M, dt); BZ.tickLater(dt);
  },
  draw(r) {
    const M = this.M; if (!M) return;
    const fr = this.fr || BZ.cams.frame(M);
    if (BZ.cams.replay) { const R = BZ.cams.replay; BZ.cams.drawField(r, M, R.frames[Math.min(R.i, R.frames.length - 1)]); }
    else if (BZ.cams.moon) BZ.cams.drawMoon(r, M);
    else if (BZ.cams.mode === 'plate' && M.phase === 'atBat') BZ.cams.drawPlate(r, M, fr);
    else BZ.cams.drawField(r, M, fr);
    if (M.phase === 'rhubarb' && M.rhubarb && !BZ.cams.replay) BZ.rhubarb.draw(r, M, r.game.time);
    BZ.hud.draw(r, M, fr);
    r.overlay(g => {
      BZ.talk.drawRadio(g, r); BZ.talk.drawCut(g, r);
      if (M.phase === 'rhubarb' && M.rhubarb) BZ.rhubarb.hud(g, r, M);
      if (M.lesson) BZ.training.hud(g, r, M);
      if (M.phase === 'final' && M.result) {
        const w = M.result.winner, T = w >= 0 ? M.teams[w] : null;
        E.font.title(g, 'FINAL', r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd040', '#ff7a1a'], depth: 3 });
        if (T) E.font.text(g, T.def.name.toUpperCase() + ' WIN!', r.W / 2, r.H * .3 + 40, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      }
      if (M.attract && BZ.attract) BZ.attract.overlay(g, r);
    });
    if (BZ.dev && BZ.dev.isOpen()) BZ.dev.draw(r);
  }
};
