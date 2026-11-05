/* Densha de Halo! • 61-drive: the drive scene (the sim, the rail, the cab, the HUD, the input), the attract loop, Dev Mode's
 * rows, the help pages and the About text. The scene is the glue: it reads the keys and the pad, steps the sim, plays the
 * sounds the sim announces, and draws. Section 3.3 to 3.4, 4.13 to 4.14, 4.20 and 4.21. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

/* the settings the game owns (section 4.25); the engine's own (volume, controls, glyphs) are the standard ones */
DH.settingsValues = (game) => {
  const s = game.settings || {};
  return {
    difficulty: (s.difficulty || 'Normal').toLowerCase(), subtitles: s.subtitles !== 'Off', autoCalls: s.autoCalls === 'On',
    guide: s.guide === undefined ? true : s.guide === 'On', tips: s.tips !== 'Off', stopCam: s.stopCam !== 'Off', lever: s.lever || 'Up = Power',
    xbox: s.buttons === 'Xbox', driveMusic: s.driveMusic === 'On'
  };
};

/* the tips: shown the first time each mechanic comes up (section 4.18) */
DH.TIPS = {
  horn: 'Hold Space or Square at the horn board: half a second in the zone scores.',
  rain: 'Rain: the rails are slippery. Ease the lever early and brake sooner.',
  ats: 'ATS! Press Q or Triangle to confirm, then brake.',
  call: 'Point and call: press E or Cross 60 to 120 metres before a signal for GREAT.',
  eb: 'Emergency brake: it costs Halo Time and comfort. Use it only when you must.',
  limit: 'Limit boards: the speed in white. Be under it before the board, not at it.',
  slip: 'Wheels spinning: ease the power at once.',
  smooth: 'SMOOTH: ease to B1 just before the mark for a gentle stop.',
  stop: 'The Stop Cam shows where the nose came to rest, in metres from the mark.'
};
/** a tip shows the first time its mechanic comes up, once per save (section 4.18) */
DH.showTip = (S, key) => {
  if (!S || !S.settings.tips || !DH.TIPS[key]) return;
  const seen = E.store.get('dh:tips', {}) || {};
  if (seen[key]) return;
  seen[key] = true; E.store.set('dh:tips', seen);
  S.speak && S.speak('TIP', DH.TIPS[key]);
};

/* the views a drive has: the cab (default), a chase (behind, higher), the platform (at a stop, looking back) */
const VIEWS = ['cab', 'chase', 'platform', 'trackside'];

/* the camera for a view (section 4.13): the cab, a chase behind, the platform looking back at the train at a stop, or
 * the trackside 4 m beside the line, ahead of the train, looking back as it passes */
DH.camFor = (sim, view, S) => {
  const T = sim.train;
  if (view === 'cab') return { s: T.s - 1.5, x: 0, h: 2.9 + ((S && S.camBump) || 0), dir: 1, fov: DH.TUNING.fov, horizon: .40, pitchPx: -Math.round(T.a * 1.5) };
  if (view === 'chase') return { s: T.s - 25, x: 2, h: 9, dir: 1, fov: 70, horizon: .50 };
  if (view === 'trackside') return { s: T.s + 180, x: -4, h: 2, dir: -1, fov: 75, horizon: .50 };
  const st = sim.stops.find(x => x.target >= T.s - 40) || sim.stops[sim.stops.length - 1];
  return { s: st ? st.target + 15 : T.s, x: -5, h: 1.7, dir: -1, fov: 75, horizon: .50 };
};

DH.driveScene = (game, prog, sfx) => {
  let S = null, hornHeld = false, hornTimer = 0, glove = null, judgmentSeen = 0;
  const bindBus = (sim) => {
    const b = sim.bus;
    b.on('notch', ({ dir }) => sfx(dir === 0 ? 'clack' : 'notch'));
    b.on('eb', () => { sfx('eb'); game.flash && game.flash('#ff6040', .2); game.shake && game.shake(4); });
    b.on('ats', () => sfx('ats'));
    b.on('atsConfirm', () => sfx('atsOk'));
    b.on('judgment', ({ label }) => { if (/SMOOTH/.test(label)) DH.showTip(S, 'smooth'); sfx(/PERFECT|GREAT|ON TIME/.test(label) ? 'perfect' : /OVERRUN|LATE|SHORT|OVER|MISSED|SIGNAL|LIMIT|EMERG|HAZARD|ATS/.test(label) ? 'overrun' : 'good'); });
    b.on('doors', ({ open }) => { sfx(open ? 'chime' : 'close'); });
    b.on('pilot', () => sfx('pilot'));
    b.on('buzzer', () => sfx('buzz'));
    b.on('melody', ({ id }) => DH.Sound.melody(DH.stationMelody(id)));
    b.on('pa', ({ id }) => S.speak && S.speak('pa', id));
    b.on('tip', ({ tip }) => DH.showTip(S, tip));
    b.on('ats', () => DH.showTip(S, 'ats'));
    b.on('eb', () => DH.showTip(S, 'eb'));
    b.on('call', ({ auto }) => { if (!auto) DH.showTip(S, 'call'); });
    b.on('limit', () => DH.showTip(S, 'limit'));
    b.on('slip', () => DH.showTip(S, 'slip'));
    b.on('gates', ({ down }) => { if (down) DH.showTip(S, 'stop'); });
    b.on('gates', ({ down }) => { if (down) sfx('gate'); });
    b.on('slip', () => sfx('slip'));
    b.on('gameover', () => sfx('hurt'));
    b.on('call', ({ great, auto }) => { if (!auto) { sfx('call'); glove = { t: 0, great }; } });
    b.on('callMiss', () => sfx('callMiss'));
    b.on('line', ({ who, text }) => { S.speak && S.speak(who, text); });
    b.on('sighted', () => {});
    b.on('obstruction', ({ on }) => { if (on) sfx('gate'); });
    b.on('hornOK', () => { S.hornNote = game.time; });
  };
  /* the HUD state the cab and the HUD read (computed in update) */
  const hudOf = (sim) => {
    const route = S.route, T = sim.train, snap = sim.snapshot();
    const names = {};
    for (const st of route.stations) names[st.id] = st.name || st.id;
    const next = sim.stops[sim.stopIdx];
    const nextName = next ? (names[next.id] || next.id) : (sim.finished ? 'END' : '');
    // the next limit ahead of the front, for the top-right plate
    let nextLimit = null;
    for (const L of route.limits) if (L.s > T.s && (!nextLimit || L.s < nextLimit.s)) nextLimit = L;
    const timetable = sim.stops.map(x => ({ name: names[x.id] || x.id, arr: x.arr ? x.arr.slice(0, 5) : (x.departure !== null && x.departure !== undefined ? DH.clock(x.departure).slice(0, 5) : '--:--'), pass: false, next: x === next }));
    for (const p of sim.passes) timetable.push({ name: (names[p.id] || p.id), arr: '', pass: true, next: false });
    const sub = sim.subtitles.length ? sim.subtitles[sim.subtitles.length - 1] : null;
    // the judgment for the centre of the screen: a new one shows for 1.6 s
    const lastJ = sim.judgments.length ? sim.judgments[sim.judgments.length - 1] : null;
    let judgment = S.judgment;
    if (lastJ && sim.judgments.length !== judgmentSeen) {
      judgmentSeen = sim.judgments.length;
      judgment = { text: lastJ.label, col: DH.judgmentColour(lastJ.label), at: game.time, sub: lastJ.halo ? (lastJ.halo > 0 ? '+' : '') + Number(lastJ.halo).toFixed(1) + ' S' : '' };
      S.judgment = judgment;
      if (/^(PERFECT|GREAT!|GOOD|OK|SHORT|OVERRUN|OVER THE MARK|MISSED STOP)/.test(lastJ.label) && S.settings.stopCam) { S.stopCam = { t0: game.time }; S.stopCamErr = sim.lastStopErr; S.stopCamLabel = lastJ.label; }
    }
    return {
      nextName, nextLimit: nextLimit ? { v: nextLimit.v, dist: Math.round(nextLimit.s - T.s) } : null, timetable,
      atsRing: sim.atsRinging, atsOn: sim.atsOn, subtitle: S.settings.subtitles ? sub : null, judgment,
      toasts: sim.toasts.map(t => t.text).filter(Boolean), call: sim.callOpen ? (sim.callOpen.kind === 'departure' ? 'SHUPPATSU, SHINKO!' : '') : '',
      guide: S.settings.guide, ebPressed: S.ebHeld, atsPressed: S.atsHeld, hornOn: sim.horn.held,
      stageName: S.st.name
    };
  };

  return {
    pausable: true,
    enter(data) {
      if (data && data.resume && DH.suspended) { S = DH.suspended; DH.suspended = null; DH.currentS = S; return; }
      const st = DH.stageById(data.stage);
      const route = DH.compiled[st.route];
      const settings = DH.settingsValues(game);
      const stage = Object.assign({}, st, data.free ? {} : {});
      if (data.free) {
        if (data.free.time === 1) stage.hour = 6; else if (data.free.time === 2) stage.hour = 12; else if (data.free.time === 3) stage.hour = 21;
        if (data.free.weather === 1) stage.weather = 'clear'; else if (data.free.weather === 2) stage.weather = 'rain'; else if (data.free.weather === 3) stage.weather = 'fog';
      }
      if (data.attract) { stage.frozenHalo = 25; }
      if (DH.TUNING.frozenHalo) stage.frozenHalo = 25;
      const difficulty = data.attract ? 'normal' : (data.free ? data.free.difficulty : settings.difficulty);
      const sim = new DH.Sim(stage, route, { difficulty, autoCalls: !!data.attract || settings.autoCalls });
      S = { st: stage, route, sim, rail: new DH.Rail(route), settings, attract: !!data.attract, auto: null, view: 0, judgment: null, toasts: [],
        ebHeld: false, atsHeld: false, data, camBump: 0, lastS: sim.train.s, speakQueue: [], speakUntil: 0,
        lessonIdx: 0, waitForPlay: false, playLines: [] };
      if (data.attract || data.auto) { S.auto = new DH.Auto(sim, { skill: data.skill || 1 }); S.keepAuto = true; }
      if (data.attract) sim.cmd('ats');
      judgmentSeen = 0; glove = null; hornHeld = false;
      bindBus(sim);
      DH.liveSim = sim; DH.liveRail = S.rail; DH.currentS = S;
      if (data.hub) { sim.train.lane = DH.hub.lane || 'A'; S.hub = true; }
      S.speak = (who, text) => { S.speakQueue.push({ who, text }); };
      sim.bus.on('radio', () => {});
      DH.Sound.attach(game);
      game.lights && (game.lights.enabled = false);
    },
    update(dt) {
      if (!S) return;
      const I = game.input, sim = S.sim;
      game.input.glyphs = game.settings.buttons === 'Xbox' ? 'xbox' : 'playstation';
      // the keys and the pad (section 2): the lever, the buttons, the call; the view; the wheel is a tap
      if (!S.attract && !S.auto) {
        const flip = S.settings.lever === 'Up = Brake';
        if (I.repeat('leverUp', .25, .18)) sim.cmd(flip ? 'brake' : 'power');
        if (I.repeat('leverDown', .25, .18)) sim.cmd(flip ? 'power' : 'brake');
        if (I.repeat('power', .25, .18)) sim.cmd('power');
        if (I.repeat('brake', .25, .18)) sim.cmd('brake');
        if (I.pressed('neutral')) sim.cmd('neutral');
        if (I.pressed('eb')) sim.cmd('eb');
        if (I.pressed('ats')) sim.cmd('ats');
        if (I.pressed('call')) sim.cmd('call');
        if (I.pressed('view')) S.view = (S.view + 1) % VIEWS.length;
        const h = I.down('horn'); if (h !== hornHeld) { hornHeld = h; sim.cmd('horn', h); }
        S.ebHeld = I.down('eb'); S.atsHeld = I.down('ats');
      } else if (S.attract && DH.anyInput(I)) {
        return game.go('title', null, { fade: 'wipe' });
      }
      if (S.hub) {
        if (DH.hub.ended) return DH.hubReport(game, 'end') || game.go('hubEnd', null, { fade: 0 });
        if (!DH.hubStep(game, sim, dt)) return;
      }
      if (DH.devAuto && !S.auto) S.auto = new DH.Auto(sim, { skill: 1 });
      else if (!DH.devAuto && S.auto && !S.keepAuto) S.auto = null;
      if (S.auto) S.auto.act(dt);
      // the horn held: the sound repeats while the horn is down
      if (sim.horn.held) { hornTimer -= dt; if (hornTimer <= 0) { hornTimer = .32; sfx('horn'); } } else hornTimer = 0;
      // the step of the sim (section 3.4)
      sim.step(dt);
      if (S.st.tutorial) { const L = DH.lessonStep(S); if (L && S.lessonSpoken !== S.lessonIdx) { S.lessonSpoken = S.lessonIdx; S.speak('Hoshino', L); } }
      // the sound follows the train
      const T = sim.train;
      const tunnel = S.route.segAt(T.s) && S.route.segAt(T.s).flags.tunnel ? 1 : 0;
      DH.Sound.frame(sim.snapshot(), { tunnelBoost: tunnel, wind: true, rain: sim.weather === 'rain' });
      // the call's glove
      if (glove) { glove.t += dt / 0.9; if (glove.t >= 1) glove = null; }
      // the speech queue (the voices, 41-babble, speak one line at a time)
      if (DH.Babble && S.speakQueue.length && game.time >= S.speakUntil) {
        const line = S.speakQueue.shift();
        S.speakUntil = game.time + DH.Babble.say(line.text, line.who, { settings: S.settings, game }) + 0.6;
      }
      // the endings
      if (sim.gameOver && !S.endSent) { S.endSent = true; if (!S.attract) return game.go('gameover', { stage: S.st.id }, { fade: 'wipe' }); return game.go('title', null, { fade: 'wipe' }); }
      if (sim.finished && !S.endSent) { S.endSent = true; if (S.hub) { DH.hubReport(game, 'finished'); return game.go('hubEnd', null, { fade: 'wipe' }); } return DH.finishDrive(game, S, prog, sfx); }
      // the HUD
      S.hud = hudOf(sim);
    },
    draw(r) {
      if (!S) return;
      const sim = S.sim, T = sim.train, rail = S.rail;
      const hud = S.hud || hudOf(sim);
      const view = VIEWS[S.view];
      const cam = DH.camFor(sim, view, S);
      const tod = DH.todGrade(sim.stage.hour === undefined ? 12 : sim.stage.hour + sim.t / 3600);
      for (const g of sim.signals) rail.aspects[g.id] = g.aspect;
      for (const id of Object.keys(sim.crossingGates)) rail.gates[id] = sim.crossingGates[id].down ? 1 : 0;
      if (!S.wraps || S.wrapsFor !== sim) { S.wrapsFor = sim; S.wraps = { player: DH.trainWrap(S.route, T), others: [] }; }
      S.wraps.others = sim.others.filter(o => !o.done).map(o => DH.trainWrap(S.route, o));
      const trains = [S.wraps.player].concat(S.wraps.others, S.hub ? DH.ghostWraps(S.route) : []);
      rail.draw(r, cam, { trains, hideTrain: view === 'cab' ? S.wraps.player : null, grade: tod, hour: sim.stage.hour, fogDist: sim.fogDist, wet: sim.weather === 'rain', flash: 0, t: game.time });
      if (S.hub) DH.drawGhostTags(r, rail);
      r.overlay(g => {
        if (view === 'cab') DH.drawCab(r, g, game, sim.snapshot(), Object.assign({}, hud, { subtitle: hud.subtitle, timetable: hud.timetable }));
        DH.drawHud(r, g, game, sim.snapshot(), hud);
        if (glove) DH.drawGlove(g, Math.round(r.W * .5), Math.round(r.H * .45), glove.t);
        if (S.stopCam && game.time - S.stopCam.t0 < 2.5) DH.drawStopCam(g, r, S, game.time - S.stopCam.t0);
        if (DH.devDebug) DH.drawDebug(g, sim);
        if (S.attract) E.font.text(g, 'DEMO', 10, r.H - 14, '#ffd23a', { scale: 2 });
      });
    }
  };
};

/* finish a stage: the totals, the rank, the results screen (or the ending after S5) */
DH.finishDrive = (game, S, prog, sfx) => {
  const sim = S.sim, t = sim.totals(), rank = sim.rankOf(t.total), st = S.st;
  if (S.attract) return game.go('attract', { step: 1 }, { fade: 'wipe' });
  const p = prog(); p.stats.km = (p.stats.km || 0) + sim.stats.km; p.stats.stops = (p.stats.stops || 0) + sim.stats.stops;
  p.stats.perfect = (p.stats.perfect || 0) + sim.stats.perfect; p.stats.calls = (p.stats.calls || 0) + sim.stats.calls;
  const got = DH.unlockPostcards(p, sim);
  DH.Progress.save(p);
  const order = DH.stageIds, i = order.indexOf(st.id), next = i >= 0 && i + 1 < order.length ? order[i + 1] : null;
  const line = { S: 'Exactly there. Exactly then.', A: 'Good. Now do it four hundred more times.', B: 'Acceptable. Your brakes are nervous.', C: 'You drove. That is all I will say.', D: 'We will talk about this at the depot.' }[rank];
  const rows = [['STOPS', sim.stats.perfect + ' perfect • ' + (sim.stats.stops - sim.stats.perfect) + ' other'], ['PUNCTUALITY', sim.stats.onTime + ' on time • ' + sim.stats.late + ' late'],
    ['CALLS & HORN', sim.stats.callsGreat + ' great • ' + sim.stats.horn + ' horn'], ['SMOOTHNESS', sim.stats.smooth + ' smooth • comfort ' + t.comfort], ['PENALTIES', sim.stats.overruns + ' overrun • ' + sim.stats.limit + ' limit • ' + sim.stats.ebs + ' EB']];
  if (got.length) rows.push(['POSTCARD', got.map(c => c.title).join(', ')]);
  const data = { stage: st.id, rank, passed: rank !== 'D' || sim.halo > 0, next: next === 'S5' || next === null ? null : next, rows, halo: sim.halo, line, total: t.total, attract: false };
  if (st.id === 'S5') { S.endSent = true; return game.go('ending', null, { fade: 'wipe' }); }
  game.go('results', Object.assign(data, { next }), { fade: 'wipe' });
};

/* the attract loop (section 4.20): autopilot runs with cheats through the stages, the camera cutting between them */
DH.attractScene = (game, prog) => {
  const SEQ = ['S1', 'S3', 'S5'];
  let inner = null, idx = 0, t = 0;
  const drive = DH.driveScene(game, prog, (n) => DH.Sound.play(n));
  return {
    enter(data) { idx = data && data.step ? data.step % SEQ.length : 0; t = 0; this.start(); },
    start() {
      inner = drive; drive.enter({ stage: SEQ[idx], attract: true, skill: 1 });
    },
    update(dt) {
      const I = game.input;
      if (DH.anyInput(I)) return game.go('title', null, { fade: 'wipe' });
      t += dt;
      inner.update(dt);
      if (t > 240) return game.go('title', null, { fade: 'wipe' });
    },
    draw(r) {
      inner.draw(r);
      r.overlay(g => {
        E.font.text(g, 'PRESS ' + game.input.label('confirm').toUpperCase(), r.W / 2, r.H - 14, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
        E.font.text(g, DH.touchOnly() ? 'CONTROLLER OR KEYBOARD REQUIRED' : '', r.W / 2, r.H - 26, '#ffb040', { align: 'center', scale: 1 });
      });
    },
    exit() { inner = null; }
  };
};

/* Dev Mode's rows: every balance number as a live slider (with reset), the tools, the sound board */
DH.devRows = (game, scene) => {
  const rows = [];
  const live = () => DH.liveSim, cur = () => DH.currentS;
  for (const [key, [lo, hi, step, label]] of Object.entries(DH.TUNING_RANGES)) {
    rows.push({ label, value: () => Number(DH.TUNING[key]).toFixed(step < 1 ? 2 : 0), adj: (d) => { DH.TUNING[key] = Math.round(DH.clamp(DH.TUNING[key] + d * step, lo, hi) / step) * step; } });
  }
  rows.push({ label: 'Reset to defaults', value: () => 'PRESS', act: () => DH.resetTuning() });
  // the tools: auto-drive, God mode, time, jumps, the world, the camera, the overlay
  rows.push({ label: 'Auto-drive', value: () => (DH.devAuto ? 'ON' : 'OFF'), act: () => { DH.devAuto = !DH.devAuto; } });
  rows.push({ label: 'God mode (no Halo Time loss)', value: () => (DH.TUNING.frozenHalo ? 'ON' : 'OFF'), act: () => { DH.TUNING.frozenHalo = DH.TUNING.frozenHalo ? 0 : 1; if (live()) live().stage.frozenHalo = DH.TUNING.frozenHalo ? 25 : undefined; } });
  rows.push({ label: 'Time scale', value: () => game.timeScale + 'x', act: () => { const v = [0.25, 0.5, 1, 2, 4]; const i = v.indexOf(game.timeScale); game.timeScale = v[(i + 1) % v.length]; } });
  rows.push({ label: 'Jump: next stop (arrive)', value: () => 'PRESS', act: () => { const s = live(); const x = s && s.stops[s.stopIdx]; if (x) { s.train.s = x.target; s.train.v = 0; s.train.notch = 0; s.prevS = s.train.s; } } });
  rows.push({ label: 'Finish this stage', value: () => 'PRESS', act: () => { if (live()) live().endStage(); } });
  rows.push({ label: 'Fail this stage (game over)', value: () => 'PRESS', act: () => { if (live()) live().addTime(-999, 'DEV'); } });
  rows.push({ label: 'Time of day (hour)', value: () => (live() ? Math.floor(live().stage.hour) + ':00' : '-'), adj: (d) => { if (live()) live().stage.hour = (live().stage.hour + d + 24) % 24; } });
  rows.push({ label: 'Weather', value: () => (live() ? live().weather : '-'), act: () => { const s = live(); if (!s) return; const w = ['clear', 'rain', 'fog']; s.weather = w[(w.indexOf(s.weather) + 1) % 3]; s.dryRail = s.weather !== 'rain'; } });
  rows.push({ label: 'Force next signal aspect', value: () => { const s = live(); const g = s && s.signals.find(q => q.s > s.train.s); return g ? g.id + ' ' + (g.forced || 'AUTO') : '-'; }, act: () => { const s = live(); const g = s && s.signals.find(q => q.s > s.train.s); if (!g) return; const a = [null, 'R', 'Y', 'YG', 'G']; g.forced = a[(a.indexOf(g.forced || null) + 1) % a.length]; } });
  rows.push({ label: 'Trigger the next event', value: () => 'PRESS', act: () => { const s = live(); const e = s && (s.stage.events || []).find(q => !s.events.has(q.id)); if (e) s.runEvent(e); } });
  rows.push({ label: 'Camera', value: () => (cur() ? VIEWS[cur().view] : '-'), act: () => { if (cur()) cur().view = (cur().view + 1) % VIEWS.length; } });
  rows.push({ label: 'Braking guide', value: () => (cur() && cur().settings.guide ? 'ON' : 'OFF'), act: () => { if (cur()) cur().settings.guide = !cur().settings.guide; } });
  rows.push({ label: 'Debug overlay', value: () => (DH.devDebug ? 'ON' : 'OFF'), act: () => { DH.devDebug = !DH.devDebug; } });
  rows.push({ label: 'Unlock all stages', value: () => 'PRESS', act: () => { const p = DH.Progress.load(); p.unlocked = DH.stageIds.slice(); DH.Progress.save(p); } });
  rows.push({ label: 'Reset save data', value: () => 'PRESS', act: () => { E.store.remove('dh:progress'); } });
  // the sound board: any melody, any effect, any voice
  for (const id of Object.keys(DH.MELODIES)) rows.push({ label: 'Melody: ' + id, value: () => 'PLAY', act: () => DH.Sound.melody(id) });
  for (const id of Object.keys(DH.SFX)) rows.push({ label: 'Effect: ' + id, value: () => 'PLAY', act: () => DH.Sound.play(id) });
  for (const id of Object.keys(DH.VOICES)) rows.push({ label: 'Voice: ' + id, value: () => 'PLAY', act: () => DH.Babble.say('Good morning, Driver! Thank you for riding the Halo Line.', id, { game }) });
  return rows;
};

/* the debug overlay (section 4.21): the numbers the balance is judged by, in small pixels */
DH.drawDebug = (g, sim) => {
  const sn = sim.snapshot(), lines = [
    'FPS ' + Math.round(1 / Math.max(1e-3, DH.game.real || 1 / 60)) + '  T ' + sn.t,
    's ' + sn.s + ' m  v ' + sn.v + ' km/h  a ' + Number(sn.a).toFixed(2) + '  jerk ' + Number(sn.jerk || 0).toFixed(0),
    'notch ' + sn.notch + '  P ' + Number(sn.P).toFixed(2) + '  B ' + Number(sn.B).toFixed(2) + (sn.slip ? '  SLIP' : '') + (sn.slide ? '  SLIDE' : ''),
    'limit ' + sn.limit + '  cap ' + sim.aspectCap + '  next stop ' + (sn.nextStop ? sn.nextStop.dist + ' m' : '-'),
    'signals ' + sn.signals.map(x => x.id + ':' + x.aspect + '@' + x.dist).join(' '),
    'halo ' + sn.halo + '  score ' + sn.score + '  comfort ' + sn.comfort + '  events ' + sim.fired.length,
    'stage ' + sim.stage.id + '  auto ' + (DH.devAuto ? 'on' : 'off') + '  view ' + (DH.currentS ? DH.currentS.view : '-')
  ];
  lines.forEach((t, i) => E.font.text(g, t, 4, 4 + i * 8, '#9af0a0', { scale: 1, shadow: '#000' }));
};

/* How to Drive: the pages (controls are read from the device in use) */
DH.controlsHelp = (g, r) => {
  const I = DH.game.input;
  const rows = [['LEVER UP / DOWN', I.label('power') + ' / ' + I.label('brake')], ['NEUTRAL', I.label('neutral')], ['EMERGENCY BRAKE', I.label('eb')],
    ['POINT AND CALL', I.label('call')], ['HORN (HOLD)', I.label('horn')], ['ATS CONFIRM', I.label('ats')], ['CHANGE VIEW', I.label('view')], ['PAUSE', 'ESC or P']];
  rows.forEach(([a, b], i) => { E.font.text(g, a, 16, r.H - 104 + i * 10, '#c8c4dc', { scale: 1 }); E.font.text(g, b, Math.round(r.W * .42), r.H - 104 + i * 10, '#ffffff', { scale: 1 }); });
};
DH.HELP_PAGES = [
  { title: 'THE LEVER', body: ['Power and brake are the one lever: notch up to power (P1..P5), down through N to the brakes (B1..B8).', 'Power is refused until the pilot lamp is lit. Emergency brake (EB) comes off only at a standstill.'] },
  { title: 'STOP ON THE MARK', body: ['Every stop is judged against the mark on the platform. The Stop Gauge shows the metres to go.', 'PERFECT is within 10 cm. Ease to B1 just before the stop for a SMOOTH stop.'] },
  { title: 'BE ON TIME', body: ['Each stop has a time on the timetable. Arrive within two seconds for ON TIME.', 'Early is not on time. Late costs Halo Time for every second.'] },
  { title: 'POINT AND CALL', body: ['Call every signal, limit board, approach board and horn board: 60 to 120 metres before it for GREAT.', 'Hold the horn for half a second in the horn zone.'] },
  { title: 'SIGNALS AND ATS', body: ['Signals show red, yellow, yellow-green or green. Passing a red is a SIGNAL PASSED AT DANGER.', 'A red ahead rings the ATS: confirm it, then brake. You cannot steer, open doors or choose a route.'] }
];

/* About & Credits (section 4.26, 9.5): the credits, the Source Information, the three feedback sets, and what this build
 * does not include. Written at the end of the build; the same text is in the chat reply and exit-interview.json. */
DH.ABOUT = [
  { title: 'CREDITS', lines: ['DENSHA DE HALO!', 'An original homage to Densha de Go! (Taito). Not affiliated.', 'Built on my-3D2dge v0.85.2 (the engine, MIT License) by Michael Crosato.', 'AI Hub client session.js 1.4.0 (AI Hub).', 'Made by claude-haiku-5-5 (Claude Code, headless).'] },
  { title: 'SOURCE INFORMATION', lines: [
    'Date: 2026-11-04 05:02:41', 'Source: Densha de Go! (Taito)', 'Plan: PLAN.md',
    'Genre: train driving simulation with arcade scoring. Perspective: first-person cab view (pseudo-3D), with chase and platform cameras and a Halo Map.',
    'Tech: my-3D2dge v0.85.2 (full engine, handoff package) with a custom rail renderer; AI Hub session client 1.4.0; vanilla JavaScript; Node and Playwright 1.63.0 for tests.',
    'Art: the engine\'s pixel style; new code-drawn trains, cab, signals, stations and townscape.',
    'Animation: code-tweened gloved call, gates, needle, notch cells and judgment banners. Character rigs are not drawn in play.',
    'Audio: all procedural: Web Audio traction, rolling, wind and brake layers, chip sound effects, 12 departure melodies, gibberish voices (syllable synthesis).',
    'Online: AI Hub session, ghost mode, 2 to 4 players (protocol v1).', 'Testing: headless suites (node test/run.mjs), a mock hub contract, the scripted playthrough and Playwright browser checks.',
    'Research: the engine handoff docs and the AI Hub protocol; no web research.', 'Environment: Claude Code CLI (headless); Linux (WSL2); Chromium for the browser checks.',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium.', 'Usage: unknown.'] },
  { title: 'TESTING FEEDBACK', lines: [
    'Issues caught: about twenty changed the code, from rail drawing and the autopilot to the timetable and halo start.',
    'Critical: about six. The rail drew nothing; the autopilot stuck in EB; the halo started at zero; a permanent 25 km/h cap; strips only on their first segment; parked trains left the blocks.',
    'Most helpful: the stop-accuracy runs from several start states (the last metres of every approach).',
    'Least helpful: the no-op draw and the screenshots: they catch exceptions and layout, not feel.'] },
  { title: 'ENGINE FEEDBACK', lines: [
    'Liked most: the fixed step with game.advance, the scenes, the pixel primitives and the Dialog and Menu.',
    'Stuck or guessed: the road module is a fork candidate, not a fit (it needs multiple tracks and strips); the settings-group filter was not used; scene data for game.start was unclear.',
    'Built myself: the rail renderer, the train model, the signal and stop logic, the autopilot, the dev sliders.',
    'Hardest: projection and occlusion for long strips; the font has no button symbols and no middle dot.',
    'Changed in the engine: nothing. Dev Mode and settings are our own screens.',
    'One change: a font with common UI symbols, and a documented settings-group filter for dev screens.'] },
  { title: 'PROMPT FEEDBACK', lines: [
    'Liked most: the plan with checkable numbers (the check values made the physics testable).',
    'Confusing: the scope (about fifty subsystems) against one session; the plan and TASK disagree on file layout in places.',
    'Hardest: getting an end-to-end game with tests in one session; several features had to be cut.',
    'Change: a priority order, with a minimum to ship, and a time budget per milestone.'] },
  { title: 'LIMITS OF THIS BUILD', lines: [
    'Platform crowds are simple silhouettes, not rigged figures; the speaker portraits are the only Humanoid rigs.',
    'The Halo 3000 cab is a green panel with two handles, not a detailed period cab.',
    'Timetables and calibrated stops come from the autopilot, not from human play.',
    'The S0 lessons are short and the tips cover three mechanics.',
    'The hub session pause menu drops the game items and the Quit row.'] }
];

})();
