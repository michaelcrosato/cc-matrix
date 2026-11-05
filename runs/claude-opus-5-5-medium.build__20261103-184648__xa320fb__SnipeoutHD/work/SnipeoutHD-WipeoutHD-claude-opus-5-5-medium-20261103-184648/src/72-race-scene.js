// The race scene: builds a race from a setup, steps it, drives the cameras (chase/far/cockpit cycle, look back, TV while
// spectating), turns race events into sound, effects and HUD callouts, ghosts, academy drills, the pause menu items, and
// hands over to the results
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.V;

/** a race from a setup: { mode, track, cls, laps, team, pilot, seed, players: [{ team, pilot }], target, rules, event } */
SN.makeRace = (S, extra = {}) => {
  const humans = (S.players || [{ team: S.team, pilot: S.pilot }]).map((p, k) => ({ team: p.team, pilot: p.pilot, control: 'human', player: k }));
  const rules = S.mode === 'versus' ? null : null;
  const mode = S.mode === 'versus' ? (S.vmode || 'race') : S.mode === 'gp' ? 'race' : S.mode;
  const solo = ['timetrial', 'hotlap', 'overclock', 'academy'].includes(mode);
  const entrants = S.entrantsOverride || (solo ? humans : SN.field(humans));
  const g = SN.game;
  return new SN.Race(Object.assign({ track: S.track, mode, cls: S.cls, laps: S.laps || (SN.MODES[mode] || {}).laps, seed: S.seed ?? ((Math.random() * 2 ** 31) | 0), entrants, target: S.target, rules: S.rules, difficulty: g.settings.difficulty || 'Normal', intro: S.intro, hub: S.mode === 'hub', cheats: SN.devCheats ? Object.assign({}, SN.devCheats) : undefined }, extra));
};

const scene = SN.scenes.race = {
  pausable: true, input: SN.INPUT,
  enter(d) {
    d = d || this.d; this.d = d; const S = this.S = d.setup;
    SN.Input.reset();
    const R = this.race = d.replayRec ? SN.Replay.race(d.replayRec) : SN.makeRace(S, d.extra || {});
    this.replaying = !!d.replayRec;
    R.weapons.forced = S.forced || null;
    const view = this.vw = SN.loadView(S.track, R.mode === 'overclock' ? 'overclock' : 'normal');
    view.bind(R);
    const two = R.humans.length > 1, g = SN.game;
    g.splitScreen(two ? 2 : 0, { layout: 'rows' });
    if (view.world && two && view.world.cameras.length < 2) view.world.addCamera({ mode: 'fixed', far: 26000, near: 4 });
    view.cams.forEach((c, k) => { c.ship = R.humans[k] || R.ships[0]; c.mode = g.settings.camera || 'chase'; c.tv = this.replaying; c.lookBack = false; c.free = null; });
    if (this.replaying) { view.cams[0].tvTarget = () => this.follow || R.humans[0]; }
    this.ghost = null; this.ghostRec = null; this.follow = null; this.speed = 1; this.done = false; this.resultsT = 0; this.events = [];
    if (R.mode === 'timetrial' || R.mode === 'hotlap') this.setupGhost();
    SN.HUD && SN.HUD.reset(R, this);
    if (S.mode === 'academy' && SN.Academy) SN.Academy.attach(R, S);
    SN.Audio && SN.Audio.raceStart(R, S);
    if (SN.hubSession) SN.hubSession.attach(R, this);
  },
  exit() { SN.game.splitScreen(0); SN.Audio && SN.Audio.raceEnd(); SN.game.timeScale = 1; if (this.vw) for (const c of this.vw.cams) c.free = null; },
  setupGhost() {
    const R = this.race, key = R.track.id + '/' + R.cls + '/' + R.mode, b64 = SN.save && SN.save.data.ghosts[key];
    this.ghostRec = SN.Ghost.start(R.humans[0]);
    if (b64) { try { this.ghost = { data: SN.Ghost.decode(b64), key }; } catch (e) { this.ghost = null; } }
    if (this.vw.world) this.vw.setGhosts(this.ghost ? [{ key: 'tt', color: '#bff8ff', team: R.humans[0].team, pose: null }] : []);
  },
  update(dt) {
    const R = this.race, g = SN.game, I = g.input, view = this.vw;
    if (SN.Dev && SN.Dev.open) { SN.Dev.update(dt); view.step(0); return; }
    if (SN.Academy && R.mode === 'academy' && SN.Academy.blocking()) { SN.Academy.update(dt); view.step(dt); return; }
    // the intro: skip on confirm
    if (R.state === 'intro' && (I.pressed('confirm') || I.clicked())) { R.skipIntro(); I.consume && I.consume('confirm'); }
    // cameras
    for (let k = 0; k < R.humans.length; k++) {
      const P = g.players[k] || I, c = view.cams[k]; if (!c) continue;
      if (P.pressed('camera') && !this.replaying) { const i = SN.CAMS.indexOf(c.mode); c.set(SN.CAMS[(i + 1) % SN.CAMS.length]); SN.HUD && SN.HUD.note(SN.CAM_NAMES[c.mode], k); }
      c.lookBack = P.down('lookBack');
      const me = R.humans[k]; c.tv = this.replaying || me && (me.finished && R.mode !== 'snipeout' || me.dnf) && R.state !== 'intro';
      if (c.tv && !c.tvTarget) c.tvTarget = () => me && (me.finished || me.dnf) ? (R.order.find(s => !s.finished && !s.elim) || me) : me;
    }
    if (this.replaying) this.replayControls();
    // the sim
    const steps = this.replaying ? this.speed : 1;
    for (let n = 0; n < steps; n++) {
      if (R.state === 'results' || (this.replaying && R.steps >= this.d.replayRec.steps)) break;
      R.step(dt);
      if (this.ghostRec && R.going && !R.humans[0].finished) SN.Ghost.sample(this.ghostRec, R);
      if (SN.Academy && R.mode === 'academy') SN.Academy.step(R, dt);
      SN.Present && SN.Present.events(R, this);
    }
    if (SN.Audio && R.steps % 4 === 0) SN.Audio.update(R, view);
    if (this.ghost) { if (R.going && this.ghostP0 === undefined) this.ghostP0 = this.ghostRec ? this.ghostRec.p0 : R.humans[0].p; const p = R.going ? SN.Ghost.at(this.ghost.data, R.t, 0) : null; this.ghostPose = p ? { s: SN.wrap(p.p + this.ghostP0, R.track.L), p: p.p + this.ghostP0, u: p.u, h: p.h, yaw: p.yaw, roll: p.roll } : null; const gl = view.ghostList && view.ghostList[0]; if (gl) gl.pose = this.ghostPose; }
    view.step(dt);
    // the end
    if (this.replaying && R.steps >= this.d.replayRec.steps) { this.replayDone = true; if (!this.hashChecked) { this.hashChecked = true; this.replayHashOk = R.hash() === this.d.replayRec.hash; } }
    if (!this.done && !this.replaying && !(SN.hubSession && SN.hubSession.active) && (R.state === 'results' || R.sealed && R.stateT > (R.humans.length ? 3 : 1))) { this.done = true; this.finishRace(); }   // (a hub session spectates until the hub ends the round)
    if (this.replaying && (I.pressed('cancel') || this.replayDone && I.pressed('confirm'))) { SN.go('results', { result: SN.lastResult }); }
  },
  replayControls() {
    const I = SN.game.input, c = this.vw.cams[0];
    if (I.pressed('shiftR') || I.pressed('tabR')) this.speed = this.speed >= 4 ? 1 : this.speed * 2;
    if (I.pressed('shiftL') || I.pressed('tabL')) this.speed = this.speed <= 1 ? 4 : this.speed / 2;
    if (I.pressed('camera')) { c.tvMode = ((c.tvMode || 0) + 1) % 4; c.tv = c.tvMode === 0; c.mode = ['chase', 'chase', 'cockpit', 'far'][c.tvMode]; c.cutNow = true; SN.HUD && SN.HUD.note(['TV', 'CHASE', 'COCKPIT', 'FAR CHASE'][c.tvMode], 0); }
    if (I.pressed('confirm') && !this.replayDone) SN.game.timeScale = SN.game.timeScale ? 0 : 1;
    const ck = I.clicked();
    if (ck && this.vw.world) { let best = null, bd = 18; for (const sh of this.race.ships) { const p = this.vw.world.project(sh.P[0], sh.P[1], sh.P[2] + 8); if (p) { const d = Math.hypot(p[0] - ck[0], p[1] - ck[1]); if (d < bd) { bd = d; best = sh; } } } if (best) { this.follow = best; c.ship = best; c.cutNow = true; c.forceCut = true; } }
    if (!c.tv && this.follow) c.ship = this.follow;
  },
  /** the race is over: records, ghosts, season bookkeeping, then the results */
  finishRace() {
    const R = this.race, S = this.S, me = R.humans[0];
    const res = { setup: S, results: R.results(), mode: R.mode, cls: R.cls, track: R.track.id, zone: R.zone, rec: R.record(), records: [], bestLap: me ? me.bestLap : Infinity, player: me ? { place: me.place, time: me.finishTime, dnf: me.dnf, points: me.points, best: me.bestLap } : null, versus: R.humans.length > 1 ? R.humans.map(h => ({ place: h.place, name: h.name, time: h.finishTime, points: h.points, dnf: h.dnf })) : null };
    if (SN.Save && me && !R.attract) SN.Save.afterRace(R, res, this);
    SN.lastResult = res;
    SN.go(S.next || 'results', { result: res });
  },
  draw(r) {
    const v = this.vw; if (v && v.world) v.world.draw(r);
    if (SN.Audio) SN.Audio.pauseCheck();
    if (!r.viewport || SN.game.viewports.length < 2) SN.HUD && SN.HUD.draw(r, this, 0);
    else SN.HUD && SN.HUD.draw(r, this, r.viewport.i);
    if (SN.Dev && SN.Dev.open && SN.game.viewports.length < 2) SN.Dev.draw(r);
  },
  hud(r) { SN.HUD && SN.HUD.overlay(r, this); if (SN.Dev && SN.Dev.open) SN.Dev.draw(r); }
};

/** the pause menu's items (engine pause screen), by mode */
SN.pauseItems = () => {
  const g = SN.game, sc = g.scene && SN.scenes[g.sceneName];
  if (SN.hubSession && SN.hubSession.active) return [];
  if (g.sceneName !== 'race') return [['Dev mode', () => { g.resume(); SN.Dev && SN.Dev.show(); }], ['How to play', () => { g.resume(); SN.UI && SN.UI.overlayHelp(); }]];
  const R = SN.scenes.race.race;
  return [
    !SN.scenes.race.replaying && ['Restart', () => { g.resume(); SN.go('race', SN.scenes.race.d); }],
    R && (R.mode === 'hotlap' || R.mode === 'overclock') && R.going && ['End run', () => { g.resume(); R.endRun(); }],
    ['Camera: ' + SN.CAM_NAMES[SN.scenes.race.vw ? SN.scenes.race.vw.cams[0].mode : 'chase'], () => { const c = SN.scenes.race.vw.cams[0], i = SN.CAMS.indexOf(c.mode); c.set(SN.CAMS[(i + 1) % SN.CAMS.length]); g.settings.set('camera', c.mode); }],
    ['How to play', () => { g.resume(); SN.UI && SN.UI.overlayHelp(); }],
    ['Dev mode', () => { g.resume(); SN.Dev && SN.Dev.show(); }]
  ].filter(Boolean);
};
})();
