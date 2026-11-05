/* THUGBY TURBO — the match scene: live play, drills, attract demo, online sessions. */
const DIFFS = [
  { name: 'Rookie', react: .40, noise: .35, tackleBonus: -.12, mash: 6, interceptMult: .5, sigma: .25, lineoutRead: .25 },
  { name: 'Pro', react: .25, noise: .20, tackleBonus: 0, mash: 9, interceptMult: 1, sigma: .12, lineoutRead: .35 },
  { name: 'Legend', react: .14, noise: .08, tackleBonus: .08, mash: 12, interceptMult: 1.5, sigma: .06, lineoutRead: .45 }
];
function secondPad(game) { try { const P = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; const mine = game.input.padIndex; const p = P.find(q => q && q.connected && q.index !== mine); return p ? p.index : -1; } catch (e) { return -1; } }
function matchConfig(d) {
  const game = TT.game, mode = d.mode, di = Math.max(0, DIFFS.findIndex(x => x.name === TT.settings.difficulty));
  const cfg = { mode, seed: d.seed || (Date.now() & 0xffffff), halfLength: TUNE.base.halfLength, seats: [], noSudden: false };
  let seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }];
  if (mode === 'cup') { const c = CUP[d.cup]; Object.assign(cfg, { home: 'hawks', away: c.opp, venue: c.venue, cup: d.cup }); cfg.dstep = Math.min(2, di + (d.cup >= 2 ? 1 : 0)); }
  else if (mode === 'exh') { Object.assign(cfg, { home: d.home, away: d.away, venue: d.venue, halfLength: d.half }); cfg.dstep = di; if (d.players === 1) seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }, { team: 0, kind: 'local', slot: 1, pid: -1 }]; if (d.players === 2) seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }, { team: 1, kind: 'local', slot: 1, pid: -1 }]; }
  else if (mode === 'drill') { Object.assign(cfg, { home: 'hawks', away: 'rovers', venue: 'docks', drill: d.drill, halfLength: 600 }); cfg.dstep = 0; }
  else if (mode === 'attract') { const n = d.n || 0; Object.assign(cfg, { home: TEAM_IDS[(n * 2) % 7], away: TEAM_IDS[(n * 2 + 3) % 7], venue: VENUE_IDS[n % 4], halfLength: 45 }); cfg.dstep = 1; seats = [{ team: 0, kind: 'script', auto: true, slot: 0, pid: -1 }]; }
  else if (mode === 'online') { Object.assign(cfg, { home: 'hawks', away: 'rovers', venue: VENUE_IDS[(d.seed >>> 3) % 4], halfLength: 75, seed: d.seed }); cfg.dstep = 1; cfg.noSudden = true; }
  const D = DIFFS[cfg.dstep]; cfg.diff = { react: D.react, noise: D.noise }; cfg.tackleBonus = D.tackleBonus; cfg.interceptMult = D.interceptMult; cfg.mashMult = D.mash / 9; cfg.cpuScrum = D.mash; cfg.lineoutSigma = D.sigma * 1.6; cfg.lineoutRead = D.lineoutRead; cfg.kickErr = 1.6 - cfg.dstep * .4;
  if (mode === 'cup' && TEAMS[cfg.away].boss) cfg.diffMult = { spd: 1 };
  cfg.seats = seats; return cfg;
}
const DEVSTATE = { infTurbo: false, noFouls: false, aiOff: false, showIds: false, unstoppable: false, monster: false };
SCENES.match = {
  pausable: true, view: 'broadcast', views: CAM_VIEWS, input: KEYS, res: 'ps1', expand: true, touch: [], camera: { zoom: [.55, 1.5], start: .8 },
  enter(d) {
    const game = TT.game; d = d || { mode: 'exh', home: 'hawks', away: 'rovers', venue: 'muddington', players: 0, half: 120 }; this.d = d; game.input.touchEnabled = false;
    const cfg = matchConfig(d); this.cfg = cfg;
    if (cfg.seats.some(s => s.slot === 1) && game.players.length < 2) { const pi = secondPad(game); game.addPlayer(pi >= 0 ? { pad: pi } : { keys: 'right' }); this.addedP2 = true; }
    newMatch(cfg); S.seats = cfg.seats; S.seatI = []; TT.settings.autoSwitch = game.settings.autoSwitch || 'Assisted';
    if (cfg.noSudden) TT.settings.suddenDeath = false;
    Object.assign(S.dev, DEVSTATE, d.mode === 'attract' ? { infTurbo: true } : {});
    TUNE.layer('difficulty', { aiReaction: () => DIFFS[cfg.dstep].react, cpuMash: () => DIFFS[cfg.dstep].mash });
    V.portraits = getPortraits(); initView(); UI.t = 0; this.exitT = 0; this.endT = 0; this.attractT = 0; this.spec = 0; this.specT = 14; this.n = d.n || 0; this.replayAt = 0; this.lastReplay = -99;
    S.dir = [1, -1]; music('match'); game.timeScale = 1;
    if (d.mode === 'online') { this.waiting = true; }
    S.hype[0] = d.mode === 'attract' ? 50 : 0;
    if (d.mode === 'drill') { this.drillT = 0; }
  },
  exit() { const game = TT.game; if (this.addedP2) { while (game.players.length > 1) game.removePlayer(game.players.length); this.addedP2 = false; } TUNE.layer('difficulty', {}); TUNE.layer('halfLength', {}); Object.assign(DEVSTATE, { infTurbo: S.dev.infTurbo, noFouls: S.dev.noFouls, aiOff: S.dev.aiOff, showIds: S.dev.showIds, unstoppable: S.dev.unstoppable, monster: S.dev.monster }); if (this.d.mode === 'attract') DEVSTATE.infTurbo = false; game.weather = null; game.lights.enabled = false; },
  update(dt) {
    const game = TT.game, inp = game.input, d = this.d;
    if (TT.devOpenReq) { TT.devOpenReq = false; DEV.open = true; }
    if (TT.devMode && TT.devToggleReq) DEV.open = !DEV.open; TT.devToggleReq = false;
    if (d.mode === 'attract') { this.attractT += dt; if (this.attractT > .6 && (anyInput(inp) || (inp.clicked && inp.clicked()))) return game.go('title'); }
    if (V.replay) { this.stepReplay(dt, inp); return; }
    if (this.waiting) { if (!TT.net || !TT.net.canPlay()) { presentStep(dt); return; } this.waiting = false; }
    if (TT.net && TT.net.over) { presentStep(dt); return; }
    let seatI = S.seats.map((seat, i) => seat.kind === 'cpu' || seat.auto ? emptyIntent() : readIntent(game.players[seat.slot] || inp, i));
    if (DEV.open) { devUpdate(inp); seatI = seatI.map(() => emptyIntent()); }
    if (d.mode === 'attract') this.director(dt);
    // halftime skip needs a button even in versus
    stepMatch(dt, seatI);
    presentStep(dt); TT.audio.musicLayers(); TT.audio.crowdBed(dt);
    this.replayLogic(dt);
    if (S.phase === 'fulltime') { this.endT += dt; if (this.endT > (d.mode === 'attract' ? 4 : 3.2) && !S.replayPlaying) this.finish(); }
    if (d.mode === 'drill' && !this.drillDone && S.drillDef && S.drillDef.cond(S)) { this.drillDone = true; banner('DRILL COMPLETE!', '#80ff80', 2.5); TT.game.audio.sfx('oneup'); const dn = loadJSON('thugby:drills', {}); dn[S.drillDef.id] = 1; saveJSON('thugby:drills', dn); this.drillEnd = 2.4; }
    if (this.drillEnd) { this.drillEnd -= dt; if (this.drillEnd <= 0) { this.drillEnd = 0; this.finish(true); } }
    if (d.mode === 'drill' && !this.drillDone && inp.pressed('cancel') && false) {}
  },
  director(dt) {
    this.specT -= dt; S.dev.infTurbo = true; if (S.phase === 'fulltime') return;
    if (this.specT <= 0) { this.specT = 16; const k = this.spec++ % 6;
      if (k === 0) S.hype[S.poss >= 0 ? S.poss : 0] = 100; else if (k === 1) S.puT = 0; else if (k === 2) { S.strikeT = 0; S.jetT = 0; S.chickT = 0; } else if (k === 3) refDown(); else if (k === 4) { const p = S.players.filter(q => alive(q) && q.team === 1)[3]; if (p && S.phase === 'play') cardPlayer(p, 'yellow'); } else { S.hype[0] = S.hype[1] = 100; } }
  },
  replayLogic(dt) {
    if (S.replayReq && !this.replayAt) { this.replayAt = S.t + 0.9; this.replayKind = S.replayReq; }
    S.replayReq = null;
    if (this.replayAt && S.t >= this.replayAt) {
      const kind = this.replayKind; this.replayAt = 0; const mode = this.d.mode, set = TT.settings.replays;
      if (set === 'Off' || mode === 'attract' || mode === 'online' || mode === 'drill' || S.phase === 'fulltime' || S.over) return;
      if (set === 'All tries' && kind !== 'try') return; if (kind !== 'try' && S.t - this.lastReplay < 30) return;
      this.lastReplay = S.t; this.startReplay(kind);
    }
  },
  startReplay(kind) {
    const fr = S.frames.slice(-200); if (fr.length < 30) return;
    const key = fr[fr.length - 1].b; V.replay = { frames: fr, i: 0, acc: 0, t: 0, key: { x: fr[Math.floor(fr.length * .5)].b[0], y: fr[Math.floor(fr.length * .5)].b[1] }, back: snapFrame(), holder: S.ball.holder ? S.ball.holder.id : -1, ballSt: S.ball.st };
    S.replayPlaying = true; line('replay'); banner('INSTANT REPLAY', '#ff8080', 1.2); TT.game.setZoom && TT.game.setZoom(1.3);
  },
  stepReplay(dt, inp) {
    const R = V.replay; R.t += dt; R.acc += dt * .5;
    const skip = inp.pressed('x') || inp.pressed('confirm') || inp.pressed('ci');
    while (R.acc >= 1 / 60 && R.i < R.frames.length - 1) { R.acc -= 1 / 60; R.i++; }
    const f = R.frames[R.i]; applyFrame(f); presentStep(dt * .5);
    if (R.i >= R.frames.length - 1 || skip) { applyFrame(R.back); S.ball.holder = R.holder >= 0 ? S.players[R.holder] : null; S.ball.st = R.ballSt; V.replay = null; S.replayPlaying = false; TT.game.setZoom && TT.game.setZoom(.8); }
  },
  finish(drill) {
    const game = TT.game, d = this.d;
    if (d.mode === 'attract') return game.go('match', { mode: 'attract', n: this.n + 1 });
    const potm = S.potm, sum = { score: S.score.slice(), win: drill ? 0 : S.win, st: S.stats.map(x => Object.assign({}, x)), teams: [S.teams[0].id, S.teams[1].id], potm, potmName: potm !== null && S.players[potm] ? S.players[potm].name : '' };
    if (d.mode === 'online') { if (TT.net) TT.net.matchOver(sum); return; }
    for (const p of S.players) { /* per-player metres are not tracked individually */ }
    game.go('results', { mode: d.mode, cup: d.cup, drill: d.drill, sum, again: d });
  },
  draw(r) {
    const inp = TT.game.input; drawWorld(r); drawHUD(r, inp);
    if (S.flash) r.overlay(g => px.rect(g, 0, 0, r.W, r.H, S.flash.c));
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.d.mode === 'attract') { E.font.title(g, 'THUGBY TURBO', W / 2, H - 42, { scale: 1, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000' }); if (Math.floor(UI.t * 2) % 2 === 0 || true) E.font.text(g, TT.touchOnly ? 'TAP TO START' : 'PRESS ANY BUTTON', W / 2, H - 26, Math.floor(V.t * 2) % 2 ? '#ffffff' : '#ffe070', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'DEMO', W - 6, 6, '#ff6060', { align: 'right', shadow: '#000', outline: false }); }
      if (this.d.mode === 'drill' && S.drillDef) { E.ui.box(g, W / 2 - 150, 4, 300, 24, { alpha: .85 }); E.font.text(g, S.drillDef.name + ': ' + S.drillDef.text, W / 2, 8, '#fff', { align: 'center', font: 'tiny', wrap: 290 }); E.font.text(g, 'GOAL: ' + S.drillDef.goal, W / 2, 18, this.drillDone ? '#80ff80' : '#ffe070', { align: 'center', font: 'tiny' }); }
      if (this.waiting) { E.ui.box(g, W / 2 - 90, 80, 180, 40, { alpha: .9 }); E.font.text(g, 'WAITING FOR KICK-OFF', W / 2, 96, '#fff', { align: 'center', scale: 1, shadow: '#000', outline: false }); }
      if (DEV.open) devDraw(g, W, H, inp);
      if (TT.net) TT.net.draw(g, W, H);
    });
  }
};
function applyFrame(f) {
  S.players.forEach((p, i) => { const q = f.p[i]; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.facing = q[3]; p.st = q[4]; p.am = q[5]; p.amT = q[6]; p.vx = q[7]; p.vy = q[8]; p.off = !!q[9]; p.flip = q[12]; p.superKind = q[10] ? 'thunder' : ''; p.onFire = q[11] ? 50 : 0; });
  const b = S.ball; b.x = f.b[0]; b.y = f.b[1]; b.z = f.b[2]; b.holder = f.b[3] >= 0 ? S.players[f.b[3]] : null; b.st = b.holder ? 'held' : 'loose'; S.ref.x = f.r[0]; S.ref.y = f.r[1]; S.ref.facing = f.r[2]; S.score = f.score.slice();
}
