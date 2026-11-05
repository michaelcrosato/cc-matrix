// The race scene (plan §5.3, §7.6): one scene for every mode. It builds the run from the menu's config, reads the player
// (or the bot), draws the road, the traffic, the requests and the car, and hands over to the ending and the results.
// The bus is wired here once: banners and the passenger's lines follow the events.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const G = () => OB.game;
const T = k => OB.tune(k);
const CAMERAS = { Chase: 0, High: 350, Bumper: -620 };   // the camera height against the Tuning value

/** the passenger's chatter setting: Full speaks on most events, Less on requests and goals, Off on requests only */
function chatter(kind, race) {
  const c = G().settings.chatter || 'Full';
  if (kind === 'req') return true;
  if (c === 'Off') return false;
  if (c === 'Less') return kind === 'goal';
  // Full: most events, a seeded share of the rest (so one run's barks are the same every time)
  return kind === 'goal' || OB.rand.stream('chatter', race ? race.stepCount : 0)() < .35;
}
/** wire the bus to the banners and the passenger's lines (once) */
OB.wireRace = () => {
  const B = OB.Hud.banner.bind(OB.Hud), bark = (key, seed) => { const r = OB.race; if (r && r.passenger && chatter('bark', r)) OB.bark(r.passenger, key, seed); };
  OB.bus.on('countdown:go', () => B('GO!', '#ffe04a', 1.2));
  OB.bus.on('checkpoint', d => { OB.Music.sting('jCheckpoint'); B('CHECKPOINT!  TIME EXTENDED +' + d.bonus, '#5ae05a', 2.4); if (OB.race && OB.race.passenger) OB.bark(OB.race.passenger, 'checkpoint', d.row); });
  OB.bus.on('fork:approach', d => B('< ' + d.left.toUpperCase() + '  |  ' + d.right.toUpperCase() + ' >', '#ffffff', 2.6));
  OB.bus.on('fork:choose', d => B(d.side === 'L' ? '< TAKING THE LEFT' : 'TAKING THE RIGHT >', '#ffe04a', 1.6));
  OB.bus.on('fork:pref', d => { const r = OB.race; if (r && r.passenger) OB.bark(r.passenger, d.side === 'L' ? 'left' : 'right', 1); });
  OB.bus.on('time:low', () => { B('HURRY!', '#ff8a6a', 1.6); bark('low', 2); });
  OB.bus.on('time:up', () => B('TIME UP: THE SUN SET', '#ff8a6a', 2.6));
  OB.bus.on('goal', d => { OB.Music.sting('jGoal'); B('GOAL!', '#ffe04a', 2.6); bark('goal', 3); });
  OB.bus.on('nearmiss', () => { B('NEAR MISS +500', '#8af0ff', 1.2); bark('near', 4); });
  OB.bus.on('slingshot', () => B('SLINGSHOT!', '#ffffff', 1));
  OB.bus.on('bloom:level', d => { if (d.n === 5) { B('FULL BLOOM!', '#ff8ac0', 2.6); OB.Sfx.play('secret'); } });
  OB.bus.on('car:crash', () => { B('SPUN OUT!', '#ff6a4a', 1.4); bark('crash', 5); if (OB.race) OB.race.lastCrash = true; });
  OB.bus.on('car:bump', () => { if (OB.race) OB.race.lastRating = OB.race.lastRating; });
  OB.bus.on('air:start', () => bark('air', 6));
  OB.bus.on('req:start', d => { B(d.call, '#ffe0f0', 2.2); const r = OB.race; if (r && r.passenger) OB.bark(r.passenger, 'start', 7); });
  OB.bus.on('req:end', d => {
    const txt = { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', miss: 'MISS' }[d.rating];
    B(txt + (d.petals ? '  +' + d.petals + ' PETALS' : ''), d.rating === 'miss' ? '#ff8a6a' : '#ffe04a', 2);
    const r = OB.race; if (r) r.lastRating = d.rating;
    OB.Music.sting(d.rating === 'perfect' || d.rating === 'great' || d.rating === 'good' ? 'jRequestOk' : 'jRequestFail');
    if (r && r.passenger) OB.bark(r.passenger, d.rating === 'perfect' ? 'perfect' : d.rating === 'great' ? 'great' : d.rating === 'good' ? 'good' : 'miss', 8 + d.petals);
  });
  OB.bus.on('overtake', () => { /* (the chain points are shown by the bloom flowers) */ });
};

/** the camera height for the setting, from the Tuning value */
function camHeight() {
  const cam = G().settings.camera || 'Chase';
  if (cam === 'High') return OB.tune('cameraHeight') * 1.35;
  if (cam === 'Bumper') return 380;
  return OB.tune('cameraHeight');
}

/** the race scene */
const race = {
  pausable: true, touch: [],
  enter(data = {}) {
    if (data.resume && OB.race) return;   // back from Dev Mode: the paused run carries on as it was
    OB.race = null;
    // an AI Hub round: the Flower Sprint route, our seat's colour, the hub's seeded traffic, and the count up
    if (OB.env.hub) data = Object.assign({}, data, { mode: 'trial', car: 'orchidea', paintColor: OB.Hub.me() && OB.Hub.me().color, route: ['S1', 'S2', 'S5'], seed: OB.Hub.seed(), station: 0, passenger: 'marisol', cheats: {} });
    const cfg = Object.assign({}, data, { seed: data.seed || (Math.floor(Math.random() * 1e6) + 1) });
    if (data.demo) cfg.bot = new OB.Brain({ forks: ['L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R'], skill: 1, drift: true });
    if (data.bot) cfg.bot = new OB.Brain({ forks: data.bot.forks || [], skill: 1, drift: true });
    cfg.cheats = Object.assign({}, data.cheats || {}, { infiniteTime: !!(data.cheats && data.cheats.infiniteTime) || !!OB.devCheats.infiniteTime, noCollide: !!(data.cheats && data.cheats.noCollide) || !!OB.devCheats.noCollide });
    this.demo = !!data.demo;
    this.mode = data.mode || 'arcade';
    this.turn = 0; this.spin = 0; this.resultT = 0; this.endT = 0;
    OB.race = new OB.Race(cfg);
    OB.Hud.race = OB.race; OB.Hud.banners = []; OB.Hud.bubbleT = 0; OB.Hud.hintT = 0;
    // the settings that change the car: the transmission, the drift inputs, the steering assist
    const S = G().settings, c = OB.race.car;
    c.manual = S.transmission === 'Manual'; c.assist = S.assist === 'Off' ? null : (S.assist || 'Low');
    c.tapOk = S.driftInput !== 'Drift button'; c.btnOk = S.driftInput !== 'Brake tap';
    if (OB.game.audio && !this.engine) { this.engine = OB.game.audio.loop({ wave: 'sawtooth', freq: 60, filter: { type: 'lowpass', f: 900, q: 2 } }); this.tyre = OB.game.audio.loop({ noise: true, filter: { type: 'bandpass', f: 1400, q: 3 } }); }
    OB.Race.last = OB.race;
    // the music: the station's song for a run; the demo plays the first station
    const song = data.song || (this.demo ? OB.Music.station(0) : OB.Music.station(data.station || 0));
    OB.Music.play(song);
    if (!this.demo && this.mode !== 'trial') OB.Hud.hint('drift', 'Tap ' + (G().input.label('brake') || 'brake') + ' while steering to drift');
    if (this.mode === 'love' || this.mode === 'arcade') OB.Hud.hint('gas', 'Hold ' + G().input.label('gas') + ' to accelerate');
    this.lastShot = 0;
    // a single-stage time trial: its run is sampled for the ghost, and the best run's ghost is drawn
    this.ghostId = data.trial && data.route && data.route.length === 1 && !this.demo ? data.route[0] : null;
    this.rec = []; this.recT = 0; this.newBest = false;
  },
  exit() { OB.Hud.race = null; if (this.engine) { this.engine.stop(.3); this.tyre.stop(.2); this.engine = null; this.tyre = null; } },
  update(dt) {
    const race = OB.race; if (!race) return;
    const I = G().input;
    OB.Hud.update(dt);
    // the input: the stick or the keys steer; the gas and brake read the pedals; the drift and the shifts are presses
    const intent = { steer: I.move()[0], gas: OB.analog(I, 'gas'), brake: OB.analog(I, 'brake'), drift: I.down('drift') && G().settings.driftInput !== 'Brake tap', shiftUp: I.pressed('shiftUp'), shiftDown: I.pressed('shiftDown') };
    // the radio: the next unlocked station, crossfaded, with its name on a card
    if (!this.demo && I.pressed('radio')) { const st = OB.STATIONS, cur = OB.profile.last.station || 0; for (let k = 1; k <= st.length; k++) { const j = (cur + k) % st.length; if (!st[j].unlock || OB.Progress.owns(st[j].unlock)) { OB.profile.last.station = j; OB.Music.play(st[j].song, { fade: 1 }); OB.Hud.banner('\u266a ' + st[j].name + ' ' + st[j].freq, '#ffe6c0', 2.4); break; } } }
    // the engine's note follows the speed and the throttle; the tyres hiss in a drift (continuous voices, E7)
    if (this.engine) {
      const car = race.car, throttle = OB.analog(I, 'gas');
      this.engine.set({ freq: 36 + car.v * .55 + throttle * 14, gain: race.status === 'run' ? .02 + throttle * .02 : 0, cutoff: 500 + throttle * 1400 }, .12);
      this.tyre.set({ gain: car.drift.on ? .045 : 0, cutoff: 900 + Math.abs(car.drift.a) * 2400 }, .08);
    }
    if (!this.demo || true) { this.noteT -= dt; if (this.noteT <= 0 && race.status === 'run') { this.noteT = .09; const f = 46 + race.car.v * .9; OB.Sfx.play({ wave: 'saw', freq: Math.round(f), to: Math.round(f * .97), dur: .1, vol: .010 }); } this.squealT -= dt; if (race.car.drift.on && this.squealT <= 0) { this.squealT = .15; OB.Sfx.play({ wave: 'triangle', freq: 1100, to: 880, dur: .14, vol: .02 }); } }
    if (this.demo && (I.anyPressed && I.anyPressed())) { OB.attract.exit(); return; }
    if (OB.env.hub) { OB.Hub.tick(race, dt); if (OB.Hub.clock() < 0 && race.status === 'countdown') return; }   // the hub's clock starts the countdown; the ghosts and progress run from the start
    if (race.status === 'countdown') { race.step(dt, intent); return; }
    race.step(dt, intent);
    // the tunnels: the reverb rises in them (plan E6's room: 0.15 out, 0.6 in)
    if (OB.game.audio && race.stage.road.seg(race.car.z).tunnel) OB.game.audio.reverb(.6, .5); else if (OB.game.audio) OB.game.audio.reverb(.15, .5);
    if (OB.game.audio) OB.game.audio.voiceVolume = { Off: 0, Half: .5, Full: 1 }[G().settings.voices || 'Full'];
    if (this.ghostId) {
      if (race.status === 'run') { this.recT += dt; if (this.recT >= .1) { this.recT = 0; this.rec.push([Math.round(race.car.z), +race.car.x.toFixed(3), Math.round(race.elapsed * 1000)]); } }
      const gh = OB.Ghost.playback(this.ghostId, race.elapsed);
      race.others = gh ? [{ stage: this.ghostId, z: gh.z, x: gh.x, v: 0, color: '#bfe6ff' }] : [];
      if (race.status === 'finish' && !this.saved) { this.saved = true; this.newBest = OB.Ghost.save(this.ghostId, race.elapsed * 1000, this.rec); }
    }
    // the turn of the sky: the curve times the speed, as the sky scrolls past
    const st = race.stage; this.turn += st.road.curveAt(race.car.z) * race.car.v * dt * .02;
    if (race.status === 'over' || race.status === 'goal' || race.status === 'finish') {
      this.endT += dt;
      if (this.endT > 1.8) {
        if (this.demo) { OB.attract.next(); return; }
        if (OB.env.hub) { OB.Hub.finished(race); return; }   // the round waits for the others: the car cruises on the goal
        if (race.mission) { G().go('debrief', { id: race.mission.m.id, result: race.result() }, { fade: 'wipe' }); return; }
        if (race.status === 'goal') G().go('ending', { result: race.result() });
        else G().go('results', { result: Object.assign(race.result(), { newBest: this.newBest }) });
      }
    }
  },
  draw(r) {
    const race = OB.race; if (!race) return;
    const st = race.stage, road = st.road, car = race.car, ahead = road.ahead(camHeight());
    const cars = [];
    for (const v of race.traffic.visible(car.z)) cars.push({ z: v.z, x: v.x, w: v.w, draw: (g, sx, sy, sc) => OB.Art.vehicle(g, v, sx, sy, sc) });
    for (const q of race.requests) for (const o of q.objs) if (o.state === 'live' && o.z > car.z - 300 && o.z < car.z + 9000) cars.push({ z: o.z, x: o.x, w: 60, draw: OB.Art.requestObj(o) });
    for (const o of (race.others || [])) if (o.stage === race.stage.def.id) cars.push({ z: o.z, x: o.x, w: 380, draw: ghostDraw(o.color, o.v) });
    if (OB.env.hub) for (const gh of OB.Hub.visible(race)) cars.push({ z: gh.z, x: gh.x, w: 380, draw: ghostDraw(gh.color, gh.v) });
    const ghostDraw = (col, kmh) => (g, sx, sy, sc) => { const a = g.globalAlpha; g.globalAlpha = .5; OB.Art.vehicle(g, { def: { body: 'car' }, w: .22, col, kmh, blink: 0 }, sx, sy, sc); g.globalAlpha = a; };
    for (const pc of race.pacers) { if (pc.out) continue; const z = pc.onStage(race); if (z !== null) cars.push({ z, x: pc.lane, w: 380, draw: (g, sx, sy, sc) => OB.Art.vehicle(g, { def: { body: 'car' }, w: .22, col: pc.color, kmh: pc.kmh, blink: 0 }, sx, sy, sc) }); }
    for (const o of race.objects) if (o.state === 'live' && o.z > car.z - 300 && o.z < car.z + 9000) cars.push({ z: o.z, x: o.x, w: 60, draw: OB.Art.requestObj(o) });
    OB.drawStage(r, race, { z: car.z, x: car.x + race.camShift(), h: camHeight(), turn: this.turn, cars });
    const cs = Math.max(.6, r.H / 200), p = road.project(car.z + ahead, car.x + race.camShift(), 0);
    if (p && G().settings.camera !== 'Bumper') {
      r.overlay(g => OB.Art.playerCar(g, p[0], p[1], cs, { paint: race.cfg.paintColor || OB.Progress.paintsFor(race.carDef)[race.cfg.paint || 0], steer: G().input.move()[0] * (car.steerCur || 0), drift: car.drift.on ? car.drift.a : 0, brake: OB.analog(G().input, 'brake') > .3, rough: Math.abs(car.x) > 1, passenger: race.passenger ? { skin: '#f0c8a0', shades: race.passenger === 'vivi' } : null, passengerHair: race.passenger ? OB.CAST[race.passenger].hair : null }));
    }
    if (!race.skipHud) OB.drawHud(r, race);
    if (OB.env.hub && OB.Hub.done) r.overlay(g => {
      OB.UI.panel(g, r.W / 2 - 90, r.H / 2 - 16, 180, 32, { bg: ['#1a0e34', '#2a1450'], alpha: .92 });
      E.font.text(g, OB.Hub.over ? 'ROUND OVER' : 'WAITING FOR THE OTHERS...', r.W / 2, r.H / 2 - 6, '#ffe04a', { align: 'center', outline: false, shadow: '#000', scale: 1 });
    });
    if (race.status === 'countdown' && !race.skipHud) {
      const n = Math.ceil(race.countdown), label = n > 0 ? String(n) : 'GO!';
      r.overlay(g => E.font.title(g, label, r.W / 2, r.H * .42, { scale: 4, align: 'center' }));
    }
  },
};
OB.scenes = OB.scenes || {};
OB.scenes.race = race;
})();
