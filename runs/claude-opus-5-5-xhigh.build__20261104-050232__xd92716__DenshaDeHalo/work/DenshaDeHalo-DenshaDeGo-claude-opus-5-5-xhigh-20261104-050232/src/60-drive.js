/* 60-drive: the drive. A Drive is one player's run with everything around it: input to lever commands (the lever on
 * up/down by the Lever direction setting, the triggers, the mouse wheel, the dash's buttons and handle by mouse), the
 * cameras (cab, chase, high chase, platform, trackside) and the cab's feel (sway on curves, joint bumps, pitch under
 * braking, the EB jolt, a glance with the right stick or a right-drag), the world drawn by the rail renderer, the
 * cab, HUD, subtitles and Stop Cam, and the run's events turned into banners, sounds, voices and rumble. The drive
 * scene holds one; the duel two, in split screen; attract and the hub reuse it. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, SND = () => DH.Sound;
const T = (g, s, x, y, c, o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
const CAMS = ['cab', 'chase', 'chaseHigh', 'platform'];
// the mouse wheel moves the lever a notch at a time (80 ms apart), only in the driving scenes
const wheelQ = DH.wheelQ = []; let wheelT = 0;
if (!game.headless && typeof addEventListener === 'function') addEventListener('wheel', e => { const sn = game.sceneName; if (!['drive', 'duel', 'hubRun'].includes(sn) || game.paused || (game.shell && game.shell.screen)) return; const now = performance.now(); if (now - wheelT < 80) return; wheelT = now; wheelQ.push(e.deltaY < 0 ? 'power' : 'brake'); if (wheelQ.length > 4) wheelQ.shift(); game.input.lastDevice = 'mouse'; }, { passive: true });

class Drive {
  /** o: { track, train, cars, tod, weather, difficulty, auto: { skill, cheat, mode }, input, demo, ghosts, noStory, minimal, duel } */
  constructor(stageId, o = {}) {
    this.o = o; this.id = stageId; const S = DH.STAGES[stageId];
    this.run = new DH.Run(stageId, { track: o.track, train: o.train, cars: o.cars, tod: o.tod, weather: o.weather, difficulty: o.difficulty, autoCalls: o.autoCalls, god: o.god, seed: o.seed });
    this.R = this.run.R; this.rail = DH.railFor(this.R); this.people = new DH.People(this.run); this.devThings = []; this.cab = new DH.Cab(); this.hud = new DH.Hud(); this.story = o.story || new DH.Story(); this.story.reset();
    this.ap = o.auto ? new DH.Autopilot(this.run, o.auto) : null; this.cam = o.cam || 'cab'; this.look = [0, 0]; this.pan = [0, 0]; this.sway = 0; this.pitch = 0; this.bump = 0; this.t = 0; this.endT = 0; this.overT = 0; this.crack = 0;
    this.tod0 = this.run.tod; this.clock0 = this.run.clock; this.input = o.input || game.input; this.ghosts = o.ghosts || [];
    this.callMissSaid = false; this.flashFx = 0; this.lastSay = {};
    this._wire();
    if (!o.demo && !o.quietStart && S.events) { /* the stage's own radio lines come through the run's events */ }
  }
  get stage() { return this.run.stage; }
  /** the run's events -> what you see, hear and feel */
  _wire() {
    const run = this.run, hud = this.hud, story = this.story, cab = this.cab, A = game.audio, I = this.input, demo = this.o.demo;
    const sfx = (n, o) => { if (!this.o.mute) A.sfx(n, o); }, rumble = (a, b) => { if (!demo) I.rumble(a, b); };
    const say = (who, text, key) => { if (key && this.lastSay[key]) return; if (key) this.lastSay[key] = true; story.say([{ who, text }]); };
    run.on('lever', () => sfx('clack', { vol: .8 }));
    run.on('eb', d => { sfx('ebClunk'); rumble(.8, .4); if (!d.hazard && run.train.v > 3 && !run.stage.tutorial) hud.toast('EMERGENCY', '#ff5a4a'); });
    run.on('ebRelease', () => hud.toast('EB: STOP, THEN LEVER UP', '#ff9a7a'));
    run.on('doorsBuzz', () => { sfx('buzzer', { vol: .6 }); hud.toast(run.pilot ? 'SIGNAL!' : 'DOORS! WAIT FOR THE PILOT LAMP', '#ffa040'); });
    run.on('atsRing', () => { hud.toast('ATS!', '#ff4a3a', 2.2); rumble(.4, .2); say('hoshino', 'The bell. Answer it, then brake for the red.', 'ats'); });
    run.on('atsConfirm', () => { sfx('ok'); hud.toast('ATS CONFIRMED', '#ffd040'); });
    run.on('atsFire', () => { hud.toast('ATS EMERGENCY BRAKE', '#ff4a3a', 2.4); say('hoshino', 'You let the ATS stop us. That is not driving.'); });
    run.on('atsSpeed', () => { hud.toast('SPEED CHECK: ATS BRAKE', '#ff4a3a', 2.4); });
    run.on('spad', () => { hud.banner = { lines: [{ t: 'SIGNAL PASSED', c: '#ff3a2a', big: true }, { t: 'AT DANGER', c: '#ff8a7a' }], t: 0, dur: 3 }; sfx('jBad'); rumble(1, .5); say('hoshino', 'A red is a wall. You drove through a wall.'); });
    run.on('limit', d => { hud.toast('LIMIT! ' + d.lim, '#ff6a4a'); sfx('bad', { vol: .6 }); say('hoshino', 'Over the limit. The board does not care how late you are.', 'limit'); });
    run.on('delta', d => hud.delta(d));
    run.on('judge', J => {
      hud.judge(J, run); rumble(J.key === 'perfect' ? .3 : .15, .2);
      sfx(J.key === 'perfect' ? 'jPerfect' : J.key === 'great' ? 'jGreat' : J.key === 'good' ? 'jGood' : J.key === 'ok' ? 'jOk' : 'jBad');
      if (J.timeKey === 'ontime') sfx('jTime'); if (J.smooth) sfx('jSmooth');
      if (J.key === 'perfect' && !J.tut) this.haro = 2;
    });
    run.on('short', d => hud.toast(d.far ? 'SHORT: MOVE UP TO THE MARK' : 'SHORT: CREEP UP (6 s)', '#ffa040', 2.5));
    run.on('backup', () => hud.toast('OVER THE MARK: BACKING UP', '#ff8a5a', 3));
    run.on('missed', () => { hud.banner = { lines: [{ t: 'MISSED STOP', c: '#ff5a4a', big: true }], t: 0, dur: 2.6 }; sfx('jBad'); say('hoshino', 'Passengers were waiting there. Now they are waiting longer.'); });
    run.on('wrongStop', () => { hud.banner = { lines: [{ t: 'WRONG STOP', c: '#ff8a5a', big: true }], t: 0, dur: 2.2 }; say('hoshino', 'We pass this one. Power, and go.'); });
    run.on('pass', d => hud.toast(Math.abs(d.late) <= 5 ? 'PASSED ON TIME' : 'PASSED ' + (d.late > 0 ? '+' : '') + Math.round(d.late) + ' s', '#8ac8ff'));
    run.on('dwell', d => { if (!d.initial && !d.last && d.st) story.say([{ who: 'pa', text: d.st.name + '. ' + d.st.name + '. Thank you for riding the Halo Line.' }]); if (d.last) story.say([{ who: 'pa', text: d.st.name + '. ' + d.st.name + '. This is the last stop. Please mind your belongings.' }]); });
    run.on('doorsOpen', () => { sfx('chime'); sfx('doorThunk'); });
    run.on('melody', d => { this.melodyT = SND().melody(d.st.melody || d.st.id); });
    run.on('doorsClosing', () => { story.say([{ who: 'mika', text: 'The doors are closing! Please stand clear!' }]); sfx('chime', { vol: .6 }); });
    run.on('doorsClosed', () => sfx('doorThunk'));
    run.on('buzzer', () => sfx('buzzer'));
    run.on('pilot', () => { sfx('pilot'); hud.toast('PILOT LAMP', '#ffa030', 1.2); });
    run.on('departReady', () => hud.toast('SIGNAL CLEAR', '#6aff8a', 1.4));
    run.on('depart', () => sfx('release', { vol: .5 }));
    run.on('call', d => {
      const c = d.c; let p = null;
      if (c) p = this.rail.project(this.R.wrap(c.s), c.x, c.kind === 'signal' ? 4 : 2.2);
      else { const sg = run.signalsAhead(400, 1)[0]; if (sg) p = this.rail.project(this.R.wrap(run.U(sg.g.s)), sg.g.x, 4); }
      cab.point(p ? p[0] : game.W * .5, p ? p[1] : game.H * .35); story.callLine(d.phrase, d.great, d.auto);
      sfx(d.great ? 'callGreat' : 'callOk'); if (!d.auto) hud.toast(d.great ? 'CALL GREAT' : 'CALL', d.great ? '#ffe070' : '#c8d0e8', 1);
    });
    run.on('callMissed', () => { if (!this.callMissSaid && !demo) { this.callMissSaid = true; say('hoshino', 'You forgot to point. The rails noticed. So did I.'); } });
    run.on('hornOK', () => { hud.toast('HORN +1', '#ffe070'); });
    run.on('hornMissed', () => { hud.toast('HORN!', '#ff8a5a'); say('hoshino', 'A horn board means the horn. Every time.', 'horn'); });
    run.on('radio', d => story.say(d.lines, d));
    run.on('tip', d => { if (!demo) story.tipShow(d.id); });
    run.on('obstruction', () => { hud.toast('OBSTRUCTION AHEAD! STOP!', '#ff3a2a', 3); rumble(.6, .5); });
    run.on('hazardAvoided', () => { hud.banner = { lines: [{ t: 'HAZARD AVOIDED', c: '#6aff8a', big: true }], t: 0, dur: 2.6 }; sfx('jGreat'); });
    run.on('collision', () => { hud.banner = { lines: [{ t: 'COLLISION', c: '#ff3a2a', big: true }], t: 0, dur: 2.6 }; sfx('ebClunk'); rumble(1, .6); say('hoshino', 'Takoyaki on the windscreen. Stop when the lamps say stop.'); });
    run.on('passTrain', () => { sfx('whoosh'); sfx('toot', { vol: .7 }); rumble(.35, .3); });
    run.on('flashAnswered', () => { hud.toast('ANSWERED!', '#ffe070'); say('hoshino', '...Thank you, Sato.'); });
    run.on('flashMissed', () => say('hoshino', 'He flashed for me. You let it go. ...Hm.'));
    run.on('slip', () => { sfx('slip'); rumble(.3, .3); say('mika', 'Wheels spinning! Ease the power!', 'slip'); });
    run.on('finish', () => { this.endT = 0; });
    run.on('gameOver', () => { this.overT = 0; this.crack = 1; sfx('crack'); story.say([{ who: 'hoshino', text: run.stage.gameOver || 'That\'s enough. Hand me the key.' }], { now: true }); rumble(1, .6); });
    run.on('tutStep', d => { hud.toast(d.step.hint.toUpperCase(), '#ffe08a', 4); });
    run.on('backupDone', () => hud.toast('BACK ON THE MARK', '#ffd040'));
    run.on('aspect', d => { if (d.aspect === 'Y' && !this.lastSay.yellow && d.sig && run.U(d.sig.s) - run.s < 700 && run.U(d.sig.s) > run.s) { this.lastSay.yellow = true; if (run.weather === 'rain') say('hoshino', 'Yellow. Forty-five. Don\'t argue with yellow.'); } });
    run.on('workersAhead', () => hud.toast('TRACK WORK AHEAD: 25, HORN', '#ffd040', 2.5));
    run.on('workers', d => { if (d.w && d.w.dev) { const W = d.w, bx = q => (this.R.trackX(run.track, this.R.wrap(q)) || 0) - 2.3; this.devThings.push(DH.Art.thing('slowBoard', { s: W.s, x: bx(W.s), v: 25 }), DH.Art.thing('slowEnd', { s: W.until, x: bx(W.until) })); for (let q = W.s + 10; q < W.until; q += 60) this.devThings.push(DH.Art.thing('workSign', { s: q, x: bx(q) - .6 })); for (const c of d.w.crew) this.people.add({ s: c.s, x: c.x, y: 0, kind: 'worker', i: 0, state: 'worker', facing: c.x < 0 ? Math.PI / 2 : -Math.PI / 2, work: d.w, col: '#f87a20' }); this.people.add({ s: d.w.lookout, x: -3.2, y: 0, kind: 'worker', i: 0, state: 'lookout', facing: Math.PI, work: d.w, flagUp: true, flagCol: '#e8402a', col: '#f87a20' }); } });
    run.on('restored', d => { hud.toast(d.continue ? 'CONTINUE FROM THE LAST STATION' : 'BACK TO THE LAST STATION', '#ffe08a', 2.5); this.crack = 0; });
  }
  /** this step's commands from the player's input (or the autopilot's) */
  commands(dt) {
    const I = this.input, run = this.run, c = {};
    if (this.ap) return this.ap.cmd(dt);
    const up = DH.leverUp(), W = game.W, H = game.H, top = this.cab.top({ H }), full = this.camMode() === 'cab' && game.settings.cab === 'full' && !this.o.minimal;
    // the mouse over the dash belongs to its widgets, not to the call
    const ptr = I.pointer ? I.pointer() : null, onDash = full && ptr && I.mouse && I.mouse.active && ptr[1] >= top && !this.o.viewport;
    this.cab.hover = null;
    if (onDash) { I.suppressCode('Mouse0'); const h = this.cab.hit(ptr[0], ptr[1]); if (h) this.cab.hover = h.id; }
    c.power = I.repeat(up === 'power' ? 'up' : 'down', .25, .18) || I.repeat('power', .25, .18);
    c.brake = I.repeat(up === 'power' ? 'down' : 'up', .25, .18) || I.repeat('brake', .25, .18);
    c.neutral = I.pressed('neutral'); c.eb = I.pressed('eb'); c.call = I.pressed('call'); c.horn = I.down('horn'); c.ats = I.pressed('ats');
    if (I === game.input) while (wheelQ.length) { const w = wheelQ.shift(); c[w] = true; }
    // dash clicks: the buttons, N on the strip, the camera; drag the handle
    const ck = I.clicked && I.clicked();
    if (full && ck && ck[1] >= top) { const h = this.cab.hit(ck[0], ck[1]); if (h) { if (h.id === 'ats') { c.ats = true; this.cab.pressBtn('ats'); } else if (h.id === 'eb') { c.eb = true; this.cab.pressBtn('eb'); } else if (h.id === 'n') c.neutral = true; else if (h.id === 'view') this.nextCam(); } }
    if (full && ptr && I.held && I.held.has('Mouse0') && this.cab.hover === 'horn') c.horn = true;
    if (full && ptr && I.held && I.held.has('Mouse0') && this.cab.hover === 'handle') { const h = this.cab.hits.find(q => q.id === 'handle'); if (h) { const u = E.clamp((ptr[1] - h.y) / h.h, 0, 1), n = Math.round(h.nP - u * (h.total - 1)); if (n > run.train.notch) c.power = true; else if (n < run.train.notch) c.brake = true; } }
    if (I.pressed('ats') || c.ats) this.cab.pressBtn('ats');
    if (I.pressed('view')) this.nextCam();
    if (c.call && this.hud.skipStopCam()) c.call = false;
    return c;
  }
  camMode() { return this.cam; }
  nextCam() {
    const run = this.run, nearSt = run.phase === 'dwell' || (run.nextStop() && run.nextStop().dist < 300 && !run.nextStop().pass);
    let i = CAMS.indexOf(this.cam); for (let k = 0; k < 4; k++) { i = (i + 1) % CAMS.length; if (CAMS[i] !== 'platform' || nearSt) break; }
    this.cam = CAMS[i]; game.audio.sfx('move'); this.hud.toast(({ cab: 'CAB VIEW', chase: 'CHASE VIEW', chaseHigh: 'HIGH VIEW', platform: 'PLATFORM VIEW' })[this.cam], '#c8d0e8', 1);
  }
  update(dt) {
    const run = this.run; this.t += dt;
    const cmd = this.commands(dt);
    if (cmd.call && run.openCall && !this.ap) { /* a call: the run handles it */ }
    run.step(dt, cmd);
    this.people.update(dt); this.cab.update(dt, run, { glare: run.glareAt ? run.glareAt(run.s) : 0 }); this.hud.update(dt); this.story.update(dt);
    if (this.haro) this.haro = Math.max(0, this.haro - dt);
    DH.clockNow = run.clock;
    // the cab's feel: sway on curves, bumps at rail joints, pitch under power and braking
    const sk = game.settings.motion ? 0 : (game.settings.sway === undefined ? 1 : game.settings.sway) * DH.TUNING.sway, v = run.train.v, sg = run.seg();
    this.sway += ((sg.curve || 0) * v * v * .0009 * sk - this.sway) * Math.min(1, dt * 2);
    this.pitch += (run.train.st.a * -1.1 * sk - this.pitch) * Math.min(1, dt * 3);
    const jn = Math.floor(run.s / 25); if (jn !== this.jn) { this.jn = jn; if (v > 10) this.bump = .07 * sk; } this.bump = Math.max(0, this.bump - dt);
    // the glance: the right stick or a right-drag, springing back
    const I = this.input, aim = I.padAim, pan = I.pan && I.pan();
    if (pan) { this.pan[0] += pan[0]; this.pan[1] += pan[1]; } else { this.pan[0] *= Math.pow(.02, dt); this.pan[1] *= Math.pow(.02, dt); }
    const tx = E.clamp((aim ? aim[0] * game.W * .25 : 0) - this.pan[0], -game.W * .25, game.W * .25), ty = E.clamp((aim ? aim[1] * game.H * .1 : 0) - this.pan[1], -game.H * .1, game.H * .1);
    this.look[0] += (tx - this.look[0]) * Math.min(1, dt * 8); this.look[1] += (ty - this.look[1]) * Math.min(1, dt * 8);
    // sound
    const S = SND(); if (!this.o.mute) { S.train(run, { rumble: () => { if (!this.o.demo) I.rumble(.05, .03); } }); S.crossingBells(dt, run.events ? run.events.crossings.map(x => x.c) : [], run); S.ats(dt, run); S.ambience(dt, run); }
    if (run.grace <= 10 && !run.frozen && run.phase === 'run' && Math.floor(this.t) !== this._tk) { this._tk = Math.floor(this.t); if (!this.o.mute) game.audio.sfx('tick'); }
    if (run.phase === 'finished') this.endT += dt;
    if (run.phase === 'over') { this.overT += dt; this.crack = Math.min(2, this.crack + dt); }
  }
  /** the camera for a mode */
  camera(mode = this.cam) {
    const run = this.run, R = this.R, x0 = R.trackX(run.track, R.wrap(run.s)) || 0, fov = DH.TUNING.fov;
    if (mode === 'cab') { const s = run.s - 1.5; return { s, x: (R.trackX(run.track, R.wrap(s)) || x0) + this.sway * .02, h: 2.9, dir: 1, fov, horizon: game.settings.cab === 'full' && !this.o.minimal ? .4 : .46, lookX: this.look[0] + this.sway * 4, lookY: this.look[1], pitchPx: this.pitch + (this.bump > .03 ? 1 : 0), shakeX: run.camShake > 0 ? Math.sin(this.t * 60) * run.camShake * 3 : 0, shakeY: run.camShake > 0 ? Math.cos(this.t * 53) * run.camShake * 2 : 0 }; }
    if (mode === 'chase') return { s: run.s - run.len - 24, x: x0 + 2.2, h: 8.5, dir: 1, fov: 70, horizon: .5 };
    if (mode === 'chaseHigh') return { s: run.s - run.len - 42, x: x0 + 6, h: 22, dir: 1, fov: 70, horizon: .5 };
    if (mode === 'platform') {
      const ns = run.dwell && !run.dwell.done ? run.dwell.stop : run.stops[run.stopIdx] || run.stops[run.stops.length - 1], side = ns.st.doors[run.track] === 'R' ? 1 : -1, tx = R.trackX(run.track, R.wrap(ns.target)) || 0;
      return { s: ns.target + 16, x: tx + side * 3.4, h: 2.8, dir: -1, fov: 70, horizon: .52 };
    }
    if (mode === 'trackside') { const s = this.trackS || run.s + 120; return { s, x: x0 - 5, h: 2, dir: -1, fov: 66, horizon: .5 }; }
    return this.camera('cab');
  }
  /** the trains and people to draw this frame */
  actors(mode) {
    const run = this.run, R = this.R, out = [];
    if (mode !== 'cab') { const me = this.me || (this.me = { lights: true }); Object.assign(me, { s: run.s, track: run.track, dir: 1, cars: run.cars, livery: run.train.ty.livery, doors: run.doors, doorSide: run.doorSide, flash: 0 }); out.push({ items: DH.trainItems(me, R) }); }
    for (const a of run.actors) out.push({ items: DH.trainItems(a, R) });
    for (const gh of this.ghosts) if (gh.visible !== false) out.push({ items: DH.trainItems(gh, R) });
    out.push({ items: this.people.itemsNear(this.camera(mode).s - (mode === 'platform' ? 260 : 0), 300) });
    if (this.devThings.length) out.push({ items: this.devThings });   // (a work site's boards from Dev Mode)
    return out;
  }
  draw(r) {
    const run = this.run, vp = r.viewport ? { x: r.viewport.x, y: r.viewport.y, w: r.viewport.w, h: r.viewport.h } : { x: 0, y: 0, w: r.W, h: r.H };
    const mode = this.cam, cam = this.camera(mode), hour = DH.devTod !== null && DH.devTod !== undefined ? DH.devTod : run.clock / 3600, fogK = run.fogAt ? run.fogAt(run.s) : 0;
    const G = DH.grade(hour, run.weather, fogK), heading = this.rail.headingAt(this.R.wrap(cam.s)) + (cam.dir < 0 ? Math.PI : 0), zone = run.seg(cam.s).zone;
    const sky = DH.skyFor(G, zone, heading, run.stage.sunAz || 0, cam.fov || 75);
    const glare = run.glareAt ? run.glareAt(run.s) : 0;
    this.rail.draw(r, cam, { grade: DH.railGrade(G), sky, turn: -heading * (vp.w / 2) / Math.tan((cam.fov || 75) / 2 * Math.PI / 180), t: game.time, wet: run.weather === 'rain', headlight: mode === 'cab', fogScale: G.fogScale, actors: this.actors(mode) });
    r.overlay(g0 => {
      const g = g0; g.save(); g.beginPath(); g.rect(vp.x, vp.y, vp.w, vp.h); g.clip(); g.translate(vp.x, vp.y); px.reset(g);
      const W = vp.w, H = vp.h;
      // weather and light over the world
      if (run.weather === 'rain') for (let k = 0; k < 90; k++) { const x = (k * 97 + this.t * 260) % W, y = (k * 53 + this.t * 820 + k * 7) % H; px.line(g, x, y, x - 2, y + 7, '#b8c8d8', 1); }
      // ambient life: sakura petals drifting in the park, gulls wheeling over the harbour
      if (zone === 'park' && G.night < .6) for (let k = 0; k < 40; k++) { const sp = 20 + (k * 13) % 30, x = ((k * 97 + this.t * sp * 1.4 + Math.sin(this.t + k) * 20) % (W + 40)) - 20, y = ((k * 53 + this.t * sp) % (H * .75)); px.rect(g, x, y, k % 3 ? 1 : 2, 1, k % 2 ? '#ffc8d8' : '#ffe0ea'); }
      if (zone === 'harbor' && G.night < .6) for (let k = 0; k < 4; k++) { const x = ((k * 140 + this.t * (12 + k * 3)) % (W + 60)) - 30, y = H * (.12 + k * .05) + Math.sin(this.t * .7 + k) * 6, f = Math.sin(this.t * 6 + k * 2) > 0 ? 1 : 0; px.line(g, x - 4, y - f * 2, x, y, '#f4f4f0'); px.line(g, x, y, x + 4, y - f * 2, '#f4f4f0'); }
      if (glare > .05 && G.sun > -.05) px.blend(g, .35 * glare, 'add', () => { for (let y = 0; y < H * .55; y += 2) px.rect(g, 0, y, W, 2, y < H * .2 ? '#ffd8a0' : '#ff9a50'); });
      if (fogK > .05) px.blend(g, .2 * fogK, 'normal', () => px.rect(g, 0, 0, W, H, G.night > .5 ? '#3a4050' : '#d0d4d8'));
      if (run.phase === 'over') px.blend(g, Math.min(.6, this.overT * .4), 'normal', () => px.rect(g, 0, 0, W, H, '#3a3a3a'));
      const full = mode === 'cab' && game.settings.cab === 'full' && !this.o.minimal, top = full ? Math.round(H * .7) : H - 38;
      if (full) this.cab.paint(g, W, H, run, { night: G.night, showGlyphs: this.input.lastDevice === 'gamepad' });
      // the call target's bracket and the glove
      const oc = run.openCall; if (oc && !this.o.noBrackets && mode === 'cab') this._bracket(g, oc, vp);
      if (mode === 'cab') this.cab.drawPoint(g, W, H);
      const ca = !this.o.viewport && game.cornerArea ? game.cornerArea() : null;
      this.hud.draw(g, W, H, run, { top, minimal: !full && !this.o.demo, noRing: this.o.demo, cornerX: ca && ca.y0 < 60 ? Math.floor(ca.x0) : W, guide: DH.guideOn(), fogSight: fogK > .3 ? 180 : 600, noStation: this.o.noStation, noStopCam: this.o.noStopCam });
      const nsx = run.nextStop(), gauge = run.phase === 'run' && (nsx && !nsx.pass && nsx.dist < 600 && nsx.dist > -50 || run.stage.tutorial && run.tut && run.tut.cur && run.tut.cur.mark);
      this.story.draw(g, W, H, top, { noTips: this.o.demo, raise: gauge ? 52 : 6 });
      if (this.haro > 0) DH.drawHaro(g, W - 40, Math.round(H * .3) - Math.abs(Math.sin(this.haro * 8)) * 6, 1.4, this.t);
      if (mode !== 'cab') T(g, ({ chase: 'CHASE VIEW', chaseHigh: 'HIGH VIEW', platform: 'PLATFORM VIEW', trackside: 'TRACKSIDE VIEW' })[mode] || '', 8, 56, '#c8d0e8', { shadow: '#000' });
      if (this.crack > 0) this._crack(g, W, H);
      if (DH.debugOn && !this.o.viewport) DH.drawDebug(g, W, H, this);
      g.restore(); px.reset(g);
    });
  }
  _bracket(g, oc, vp) {
    let p = null; const run = this.run;
    if (oc.kind === 'start') { const sg = run.signalsAhead(300, 1)[0]; if (sg) p = this.rail.project(this.R.wrap(run.U(sg.g.s)), sg.g.x, 3.9); }
    else p = this.rail.project(this.R.wrap(oc.s), oc.x, oc.kind === 'signal' ? 3.9 : 2.0);
    if (!p) return; const k = Math.max(4, p[2] * 1.2), x = p[0] - vp.x, y = p[1] - vp.y, c = Math.floor(this.t * 4) % 2 ? '#ffffff' : '#ffe08a', s = Math.round(k + 3);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, x + dx * s - (dx > 0 ? 3 : 0), y + dy * s - (dy > 0 ? 0 : 0), 4, 1, c); px.rect(g, x + dx * s - (dx > 0 ? 0 : 0), y + dy * s - (dy > 0 ? 3 : 0), 1, 4, c); }
    if (!this.ap) DH.Glyph.row(g, [['call', 'CALL']], x, y + s + 4, { align: 'center', I: this.input });
  }
  _crack(g, W, H) {
    // the Halo ring cracks: the gold ring splits, shards fall
    const k = Math.min(1, this.crack), cx = 30, cy = 30;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, d = this.overT * 40 * (.5 + (i % 3) * .3); px.rect(g, cx + Math.cos(a) * (14 + d), cy + Math.sin(a) * (14 + d) + this.overT * this.overT * 30, 3, 2, i % 2 ? '#f2c230' : '#c89a20'); }
  }
  summary() { return DH.summarize(this.run); }
}
DH.Drive = Drive;
/** what the results screen and the Driver's Log keep of a run */
DH.summarize = run => {
  const J = run.judgments, stops = J.filter(j => !j.tut);
  return { stage: run.id, name: run.stage.name, rank: run.rank(), score: run.finalScore(), max: run.maxScore(), points: run.score, grace: run.grace, comfort: Math.round(run.comfort), judgments: J.map(j => ({ label: j.label, key: j.key, err: j.err, time: j.time, timeKey: j.timeKey, smooth: !!j.smooth, station: j.station })),
    calls: Object.assign({}, run.calls), horns: Object.assign({}, run.horns), misc: Object.assign({}, run.misc), perfect: stops.filter(j => j.key === 'perfect').length, onTime: stops.filter(j => j.timeKey === 'ontime').length, smooth: stops.filter(j => j.smooth).length,
    best: stops.length ? Math.min(...stops.map(j => Math.abs(j.err))) : null, km: Math.max(0, run.s - run.s0) / 1000, penalties: run.penalties.length, over: run.phase === 'over', tut: run.stage.tutorial ? { passed: run.tut && run.tut.passed, marks: run.tut ? run.tut.marks.map(m => ({ label: m.label, err: m.err, smooth: m.smooth })) : [] } : null };
};

/* ---- the drive scene ---- */
let D = null;
DH.scenes.drive = {
  pausable: true, input: DH.KEYS, camera: { zoom: false }, view: 'side',
  enter(d = {}) {
    if (d.resume) { D = DH.drive = d.resume; D.run.restoreCheckpoint({ continue: true }); D.overT = 0; D.crack = 0; D.endT = 0; game.input.consumeAll(); SND().music(game.settings.driveMusic ? 'groove' : null); return; }
    DH.lastStage = d.stage; DH.diffOverride = d.free && d.free.difficulty || null;
    const f = d.free || {};
    D = DH.drive = new Drive(d.stage || 'S1', { tod: f.tod, weather: f.weather, train: f.train, cars: f.train && f.train !== DH.STAGES[d.stage].train ? 6 : undefined, auto: DH.devAuto ? { skill: DH.devAutoSkill || 1 } : null, god: DH.devGod });
    D.free = !!d.free; D.freeOpts = f;
    if (game.settings.driveMusic) SND().music('groove'); else SND().music(null);
    game.input.consumeAll();
  },
  exit() { SND().stop(); DH.Babble.stop(); },
  update(dt) {
    if (!D) return;
    if (DH.devTimeScale && DH.devTimeScale !== 1) game.timeScale = DH.devTimeScale;
    D.update(dt);
    const run = D.run;
    if (run.phase === 'finished' && D.endT > (run.stage.tutorial ? 3.5 : 4.5) && (!D.story.busy() || D.endT > 14)) { const sum = D.summary(), cards = !D.free ? DH.Progress.record(sum, run) : DH.Progress.recordFree(sum, run); DH.lastResult = sum; game.go('results', { sum, free: D.free, freeOpts: D.freeOpts, cards }, { fade: 'wipe' }); D = null; return; }
    if (run.phase === 'over' && D.overT > 3) { DH.lastDrive = D; DH.lastResult = D.summary(); game.go('gameOver', { stage: run.id, canContinue: !!run.checkpoint, free: D.free, freeOpts: D.freeOpts }, { fade: 'dissolve' }); return; }
  },
  draw(r) { if (D) D.draw(r); else r.overlay(g => px.rect(g, 0, 0, r.W, r.H, '#000')); },
  back() { return false; }
};
/** the pause menu's own items (the engine adds Settings, Controls, Full screen and Quit) */
DH.pauseItems = () => {
  if (DH.hubInfo) return [];
  const sn = game.sceneName, items = [];
  if (sn === 'drive' && DH.drive) {
    items.push(['Retry stage', () => { const st = DH.drive.id, f = DH.drive.free ? DH.drive.freeOpts : null; game.resume(); if (game.shell) game.shell.hide(); game.go('drive', { stage: st, free: f }, { fade: 'wipe' }); }]);
    if (DH.drive.run.checkpoint) items.push(['Retry from last station', () => { game.resume(); if (game.shell) game.shell.hide(); DH.drive.run.restoreCheckpoint(); DH.drive.hud.stopCam = null; }]);
    items.push(['Dev Mode', () => DH.Dev.open()]);
  }
  if (sn === 'duel') items.push(['Back to the duel lobby', () => { game.resume(); if (game.shell) game.shell.hide(); game.go('duelLobby'); }]);
  items.push(['How to Drive', () => DH.showHelp()]);
  return items;
};
})();
