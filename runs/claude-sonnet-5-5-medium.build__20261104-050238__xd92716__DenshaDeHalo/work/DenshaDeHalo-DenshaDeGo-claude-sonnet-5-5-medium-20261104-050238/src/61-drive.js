/* The drive scene: input to lever, the simulation step, events to sound and text, camera, HUD, dev mode, attract mode. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, R = DH.route, clamp = E.clamp, txt = DH.txt;
const game = DH.game, A = game.audio, I = game.input, scenes = DH.scenes;
const VIEWS = DH.VIEWS;

/* the mouse wheel moves the lever one notch per click */
let wheelAcc = 0, wheelAt = 0;
if (typeof addEventListener === 'function') addEventListener('wheel', e => { if (game.sceneName === 'drive' || game.sceneName === 'attract') { const now = Date.now(); if (now - wheelAt > 80) { wheelAcc += Math.sign(e.deltaY); wheelAt = now; } e.preventDefault(); } }, { passive: false });

const TUT = [
  { id: 't1', when: r => r.t > 1.5, who: 'hoshino', say: 'Doors are open. When they shut, move the lever from brake, through N, toward POWER ({power}).' },
  { id: 't2', when: r => r.phase === 'run' && r.lever > 0, who: 'hoshino', say: 'Good. Watch the dial. The orange mark is the speed limit, and ATS watches it too.' },
  { id: 't3', when: r => r.leg && r.phase === 'run' && r.distToMark() < 650, who: 'hoshino', say: 'The station is near. Blue boards count down 300, 200, 100 metres. Ease the lever toward BRAKE.' },
  { id: 't4', when: r => !!r.callOpen, who: 'hoshino', say: 'Now point and call! Press {call} while the bracket flashes. Say what you see.' },
  { id: 't5', when: r => r.leg && r.phase === 'run' && r.distToMark() < 80 && r.v > 1, who: 'hoshino', say: 'Ease the brake off just before you stop. A good stop is a quiet stop.' },
  { id: 't6', when: r => r.results.length === 1, who: 'hoshino', say: 'That is a stop. Wait for the doors, the melody, then depart. The timetable is a promise too.' }
];

const hubOn = DH.hubOn;
scenes.drive = {
  input: DH.KEYS, res: 'ps1', expand: true, pausable: true, camera: { zoom: false },
  enter(data) {
    data = data || {}; this.data = data; this.attract = !!data.attract; this.hub = !!data.hub;
    const opts = data.opts || {}, base = data.stage || DH.stageById('S0'), stage = opts.train ? Object.assign({}, base, { train: opts.train }) : base;
    this.stage = stage;
    this.run = new DH.Run(stage, { difficulty: opts.difficulty || (this.attract || this.hub ? 'Normal' : game.settings.difficulty) || 'Normal', weather: opts.weather || undefined, tod: opts.tod !== undefined && opts.tod !== null ? opts.tod : undefined });
    if (this.attract) { this.run.tune = Object.assign({}, DH.TUNING, { infiniteHalo: 1 }); this.run.atsOff = true; }
    const run = this.run;
    this.ui = { toasts: [], judge: null, sub: null, subQ: [], time: 0, weather: run.weather, rain: run.weather === 'rain' || run.weather === 'storm', buttons: [], subOn: game.settings.subtitles !== false, exterior: false, callScreen: null };
    this.view = 0; this.endT = 0; this.leaving = false; this.hornTimer = 0; this.auto = this.attract; this.lightning = 0; this.tipsDone = new Set(); this.annArr = new Set(); this.glove = null; this.lastMouse = I.mouse.t; this.attractT = 0;
    this.dev = { open: false, i: 0, scroll: 0, rects: [] }; this.stopcam = null; this.shake = 0; this.flash = 0;
    this.ghosts = []; this.station = stage.from; wheelAcc = 0;
    DH.drive = this; DH.soundStop();
    const night = DH.todAt(run.clock).light < .45;
    A.music(night ? DH.SONGS.night : DH.SONGS.drive);
    if (this.attract) { this.vignette = data.vignette || 0; this.camT = 0; }
    this.say('mimi', this.attract ? 'Demonstration mode. Please do not touch the lever. Any button returns to the title.' : 'Control to driver: ' + stage.title + '. Doors will close shortly. Mind the timetable.');
    if (this.hub && DH.hubEnter) DH.hubEnter(this);
    this.sorted = false;
  },
  exit() { DH.soundStop(); A.music(null); if (DH.drive === this) DH.drive = null; },
  /* ---- text and voices ---- */
  say(who, text, dur) {
    const c = DH.CAST[who]; const full = text.replace(/\{(\w+)\}/g, (_, a) => DH.promptOf(a).text);
    const item = { who: c.name, col: c.color, text: full, life: dur || 0, voice: c.voice };
    if (this.ui.sub && this.ui.sub.life > 0) { this.ui.subQ.push(item); if (this.ui.subQ.length > 3) this.ui.subQ.shift(); return; }
    this.startSub(item);
  },
  startSub(item) { const d = DH.babble(item.text, item.voice); item.life = Math.max(item.life, 2.6, d + 1.4); this.ui.sub = item; },
  toast(text, color, big, life = 2.4) { this.ui.toasts.push({ text, color, big, life }); if (this.ui.toasts.length > 4) this.ui.toasts.shift(); },
  /* ---- commands ---- */
  doCall() { const t = this.run.call(); return t; },
  setLever(l) {
    const run = this.run; if (run.atsMode || run.failed) return;
    if (l === -9) { run.eb(); return; }
    if (run.lever === -9 && run.v >= .3) return;
    if (l > 0 && !run.canDepart) { run.push('doors'); return; }
    run.lever = clamp(l, -8, run.T.pn); run.push('notch');
  },
  readInput(dt) {
    const run = this.run, ui = this.ui, flip = game.settings.leverDir === 'Up = Brake';
    let up = I.repeat('up', .25, .18), down = I.repeat('down', .25, .18); if (flip) [up, down] = [down, up];
    if (up || I.repeat('power', .25, .18)) run.notchUp();
    if (down || I.repeat('brake', .25, .18)) run.notchDown();
    while (wheelAcc <= -1) { run.notchUp(); wheelAcc++; } while (wheelAcc >= 1) { run.notchDown(); wheelAcc--; } wheelAcc = 0;
    if (I.pressed('neutral')) run.neutral(); if (I.pressed('eb')) run.eb();
    let ats = I.pressed('ats'); if (I.pressed('call') && !this.clickCall) this.doCall();
    if (I.pressed('view')) { this.view = (this.view + 1) % VIEWS.length; A.sfx('select'); }
    const c = I.clicked();
    if (c) {
      const b = ui.buttons.find(b => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h);
      if (b) { if (b.kind === 'notch') this.setLever(b.notch); else if (b.kind === 'horn') this.hornTimer = .7; else if (b.kind === 'ats') ats = true; else if (b.kind === 'eb') run.eb(); else if (b.kind === 'neutral') run.neutral(); else if (b.kind === 'view') { this.view = (this.view + 1) % VIEWS.length; } }
      else if (c[1] < (ui.y0 || 160)) this.doCall();
    }
    if (game.settings.autoCall && run.callOpen && run.callOpen.dist < run.callOpen.win * .55) this.doCall();
    this.hornTimer = Math.max(0, this.hornTimer - dt);
    return { horn: I.down('horn') || this.hornTimer > 0, ats };
  },
  /* ---- events from the simulation ---- */
  handle(dt) {
    const run = this.run, ui = this.ui; let notchSfx = 0;
    for (const e of run.events.splice(0)) {
      switch (e.kind) {
        case 'notch': if (!notchSfx++) DH.sfx.notch(); break;
        case 'eb': DH.sfx.eb(); this.toast('EMERGENCY BRAKE', '#ff6a5a', false); I.rumble(.8, .4); this.shake = .5; break;
        case 'penalty': this.toast('-' + e.amount.toFixed(1) + ' HALO  ' + e.why, '#ff9a8a', false); DH.sfx.penalty(); I.rumble(.3, .12); break;
        case 'doors': this.toast('DOORS OPEN - WAIT FOR THE CHIME', '#ffd36a', false, 1.6); break;
        case 'atsWarn': DH.sfx.atsWarn(); this.toast('ATS: ' + e.reason, '#ffc020', false); break;
        case 'ats': DH.sfx.ats(); this.toast('ATS BRAKE: ' + e.reason, '#ff6a5a', true, 2.2); this.shake = .3; break;
        case 'atsRelease': this.toast('ATS released', '#9ef0c0', false, 1.5); break;
        case 'call': DH.sfx.call(); DH.babble(e.text, 'rookie', 11); this.toast(e.text, '#9ef0c0', false, 1.4); this.glove = { t: 0, text: e.text }; break;
        case 'callMiss': this.toast('MISSED CALL', '#ffb090', false, 1.4); break;
        case 'hornOk': DH.sfx.hornOk(); this.toast('HORN +1', '#9fd8ff', false, 1.2); break;
        case 'radio': this.say(e.who === 'Control' ? 'mimi' : 'daichi', e.text); break;
        case 'obsClear': this.say('mimi', e.how === 'horn' ? 'The vehicle has moved off. Well sounded, driver.' : 'The crossing is clear. Proceed with care.'); break;
        case 'short': this.toast('SHORT OF THE MARK - CREEP FORWARD', '#ffd36a', false, 2.5); break;
        case 'rush': this.say(...DH.STORY[this.stage.id].rush || ['daichi', 'Passengers rushing the doors!']); this.toast('DOOR RUSH!', '#ffd36a', true); DH.sfx.doorChime(); break;
        case 'board': this.toast(['A child waves from the platform.', 'A salaryman bows to the cab.', 'Someone tosses a thumbs-up.', 'An old lady offers you a mochi. You cannot accept.', 'A station cat watches you stop.'][Math.floor(run.t) % 5], '#d9e0ee', false, 2.6); break;
        case 'judge': this.onJudge(e); break;
        case 'doorsClosed': DH.sfx.doorChime(); DH.sfx.doorsClose(); E.current.after(1.2, () => DH.melody(run.stops[Math.max(0, run.nextIdx - 1)] !== undefined ? this.station : this.station)); this.say('daichi', DH.ANNOUNCE.doors); break;
        case 'departReady': this.toast('DEPARTURE: ' + R.stations[run.nextIdx < run.stops.length ? run.stops[run.nextIdx] : run.stops[run.stops.length - 1]].name.toUpperCase(), '#9ef0c0', false, 2); break;
        case 'depart': if (run.nextIdx < run.stops.length) this.say('daichi', DH.ANNOUNCE.depart(R.stations[run.stops[run.nextIdx]].name)); break;
        case 'fail': DH.sfx.fail(); this.toast(e.why, '#ff6a5a', true, 3); this.shake = .8; I.rumble(1, .6); break;
        case 'finish': DH.sfx.win(); break;
      }
    }
    // announcements before the stop
    if (run.leg && run.phase === 'run' && run.distToMark() < 520 && !this.annArr.has(run.nextIdx)) { this.annArr.add(run.nextIdx); this.say('daichi', DH.ANNOUNCE.arrive(R.stations[run.leg.station].name)); }
    // tutorial
    if (this.stage.tutorial && !this.attract) for (const t of TUT) if (!this.tipsDone.has(t.id) && t.when(run)) { this.tipsDone.add(t.id); this.say(t.who, t.say); break; }
    // lightning in a storm
    if (run.weather === 'storm') { if (this.lightning > 0) this.lightning -= dt * 2; else if (run.rng() < dt * .06) { this.lightning = .9; E.current.after(.6 + run.rng() * 1.5, () => { const a = A; if (a) a.sfx({ wave: 'noise', freq: 120, dur: 1.1, vol: .3 }); }); } }
  },
  onJudge(e) {
    const run = this.run; this.station = e.station; this.ui.judge = Object.assign({ life: 4 }, e); this.stopcam = { rec: e, t: 0 };
    DH.sfx.judge(e.grade); I.rumble(e.grade === 'PERFECT' ? .5 : .3, .2);
    if (e.grade === 'PERFECT') { this.flash = .5; this.toast('+' + (e.pts + e.tpts + e.cpts) + ' PTS', '#ffd23a', false, 2.5); }
    this.toast(R.stations[e.station].name.toUpperCase() + ' - ' + e.grade, '#fff', false, 2.5);
    if (e.reset) this.say('daichi', e.grade === 'OVERRUN' ? 'Overrun. We will back the train up. Please remain seated.' : 'We stopped short. Please excuse the shuffle.');
    const st = DH.STORY[this.stage.id];
    if (this.stage.tutorial && run.results.length === 1 && st && st.arrive) this.say(...st.arrive);
  },
  /* ---- the step ---- */
  update(dt) {
    const run = this.run, ui = this.ui; ui.time += dt;
    for (const t of ui.toasts) t.life -= dt; ui.toasts = ui.toasts.filter(t => t.life > 0);
    if (ui.judge) { ui.judge.life -= dt; if (ui.judge.life <= 0) ui.judge = null; }
    if (ui.sub) { ui.sub.life -= dt; if (ui.sub.life <= 0) { ui.sub = null; if (ui.subQ.length) this.startSub(ui.subQ.shift()); } }
    if (this.stopcam) { this.stopcam.t += dt; if (this.stopcam.t > 6) this.stopcam = null; }
    if (this.glove) { this.glove.t += dt; if (this.glove.t > 1) this.glove = null; }
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt);
    ui.subOn = game.settings.subtitles !== false; ui.sway = game.settings.cabSway === false ? 0 : 1;
    if (this.attract) return this.attractUpdate(dt);
    if (this.dev.open) { this.devUpdate(dt); return; }
    if (this.hub && DH.hubPlaying && !DH.hubPlaying()) { this.audio({ horn: false }); return; }
    let inp = { horn: false, ats: false };
    if (!run.finished && !run.failed) inp = this.auto ? this.autoInput() : this.readInput(dt);
    else this.endT += dt;
    this.step(dt, inp);
    if (this.hub && DH.hubTick) DH.hubTick(this, dt);
    this.handle(dt);
    this.audio(inp);
    if (run.finished && this.endT > 2.5 && !this.leaving) { this.leaving = true; this.finish(); }
    if (run.failed && this.endT > 2.4 && !this.leaving) { this.leaving = true; if (this.hub && DH.hubFail) DH.hubFail(this); else game.go('gameover', { run, why: run.failed, stage: this.data.partial ? this.data.stage : (this.data.stage || this.stage), opts: this.data.opts, career: this.data.career, free: this.data.free }, { fade: 'wipe' }); }
  },
  step(dt, inp) {
    const run = this.run, sdt = dt * (this.hub ? 1 : DH.TUNING.timeScale);
    run.step(sdt, inp);
  },
  autoInput() { const run = this.run; DH.autopilot(run, { cheat: true }); return { horn: !!run.autoHorn, ats: run.atsRing }; },
  audio(inp) {
    const run = this.run;
    DH.soundUpdate({ v: run.v, s: run.s, power: run.lever > 0 ? run.lever / run.T.pn : 0, brake: run.T ? run.brakeEff / run.T.brake : 0, horn: !!inp.horn, tunnel: !!(R.at.flags(run.s) & 1), rain: run.weather === 'rain' ? 1 : run.weather === 'storm' ? 1.6 : 0, active: !this.dev.open });
  },
  finish() {
    const run = this.run, sum = run.summary();
    if (this.hub && DH.hubFinish) { DH.hubFinish(this, sum); return; }
    game.go('results', { sum, stage: this.stage, career: this.data.career && !this.data.partial ? true : this.data.career, km: (run.s - run.s0) / 1000, free: this.data.free }, { fade: 'wipe' });
  },
  /* ---- attract mode: the autopilot (with infinite Halo Time) drives a tour of the stages; any input ends it ---- */
  attractUpdate(dt) {
    const run = this.run; this.attractT += dt; this.camT += dt;
    const moved = I.mouse.t !== this.lastMouse, any = I.anyPressed() || I.clicked() || moved;
    if (any && this.attractT > .6) { game.go('title', null, { fade: 'wipe' }); return; }
    if (this.attractT < .6) this.lastMouse = I.mouse.t;
    run.cal = true; run.depSched = 0;
    DH.autopilot(run, { cheat: true }); this.step(dt * 2.2, { horn: !!run.autoHorn, ats: run.atsRing }); run.halo = run.haloMax;
    if (this.camT > 7) { this.camT = 0; this.view = (this.view + 1) % VIEWS.length; }
    this.handle(dt); this.audio({ horn: run.autoHorn });
    if (run.failed) { run.failed = null; run.v = 0; run.s -= 5; }
    if (run.finished || this.attractT > 36 + (this.vignette % 2) * 8) { const n = ((this.vignette || 0) + 1) % 6, st = DH.STAGES[n]; game.go('attract', { vignette: n, stage: st }, { fade: 'wipe' }); }
  },
  /* ---- dev mode (from the pause menu) ---- */
  devItems() {
    const run = this.run, d = this;
    const items = DH.SLIDERS.map(s => ({ t: 'slider', s })).concat(DH.TOGGLES.map(t => ({ t: 'toggle', k: t.k, label: t.label })));
    const acts = [
      ['Autopilot drives: ' + (this.auto ? 'ON' : 'off'), () => { this.auto = !this.auto; }],
      ['Jump to next station approach', () => { if (run.leg) { run.s = run.leg.s - 520; run.v = 15; run.lever = 0; run.brakeEff = 0; run.phase = 'run'; run.doors = false; run.canDepart = true; this.annArr.delete(run.nextIdx); } }],
      ['Weather: ' + run.weather + ' (cycle)', () => { const w = ['clear', 'rain', 'fog', 'storm']; run.weather = w[(w.indexOf(run.weather) + 1) % 4]; this.ui.weather = run.weather; this.ui.rain = run.weather === 'rain' || run.weather === 'storm'; }],
      ['Time of day +2 h', () => { run.tod += 7200; run.clock += 7200; }],
      ['Refill Halo Time', () => { run.halo = run.haloMax; }],
      ['Force next signal red/green', () => { const n = run.nextSignals(1)[0]; if (n) { run.lead = null; n.e.aspect = n.e.aspect === 'R' ? 'G' : 'R'; n.e.pinned = true; } }],
      ['Finish stage (perfect run)', () => { while (run.nextIdx < run.stops.length) { run.leg && run.judge && (run.s = run.leg.s, run.v = 0, run.stopJudged = false, run.judge(0)); } run.finished = true; this.dev.open = false; }],
      ['Fail stage', () => { run.fail('DEV: FAILED'); this.dev.open = false; }],
      ['RESET TO DEFAULTS', () => { DH.resetTuning(); }],
      ['Close Dev Mode', () => { this.dev.open = false; }]
    ];
    return items.concat(acts.map(a => ({ t: 'act', label: a[0], fn: a[1] })));
  },
  devUpdate(dt) {
    const items = this.devItems(), D = this.dev, n = items.length; D.i = clamp(D.i, 0, n - 1);
    if (I.repeat('up', .3, .1)) D.i = (D.i + n - 1) % n; if (I.repeat('down', .3, .1)) D.i = (D.i + 1) % n;
    const it = items[D.i], dir = (I.repeat('right', .3, .06) ? 1 : 0) - (I.repeat('left', .3, .06) ? 1 : 0);
    if (dir && it.t === 'slider') DH.TUNING[it.s.k] = clamp(+(DH.TUNING[it.s.k] + dir * it.s.step).toFixed(3), it.s.min, it.s.max);
    if (dir && it.t === 'toggle') DH.TUNING[it.k] = DH.TUNING[it.k] ? 0 : 1;
    const p = I.pointer(); if (I.mouse.t !== D.mt) { D.mt = I.mouse.t; const k = D.rects.findIndex(r => p && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h); if (k >= 0) D.i = k + D.scroll; }
    const c = I.clicked(); let pick = I.pressed('confirm');
    if (c) { const k = D.rects.findIndex(r => c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h); if (k >= 0) { D.i = k + D.scroll; const r = D.rects[k], q = items[D.i]; if (q.t === 'slider' && c[0] > r.x + r.w * .45) { const u = clamp((c[0] - (r.x + r.w * .45)) / (r.w * .5), 0, 1); DH.TUNING[q.s.k] = clamp(+(Math.round((q.s.min + u * (q.s.max - q.s.min)) / q.s.step) * q.s.step).toFixed(3), q.s.min, q.s.max); } else pick = true; } }
    if (pick) { const q = items[D.i]; if (q.t === 'act') { A.sfx('confirm'); q.fn(); } else if (q.t === 'toggle') DH.TUNING[q.k] = DH.TUNING[q.k] ? 0 : 1; }
    if (I.pressed('cancel') || I.pressed('view')) { D.open = false; I.consumeAll(); }
    this.audio({ horn: false });
  },
  /* ---- drawing ---- */
  draw(r) {
    const run = this.run, ui = this.ui;
    r.overlay(g => {
      const W = r.W, H = r.H, view = VIEWS[this.view];
      ui.exterior = view !== 'cab';
      const sway = ui.sway ? Math.sin(ui.time * 6.3 + run.s * .05) * Math.min(1.2, run.v / 25) * 1.2 + (this.shake ? (Math.random() - .5) * this.shake * 6 : 0) : 0;
      const cam = DH.camFor(view, run, ui.time, sway); if (view === 'cab' && ui.sway) cam.pitch = Math.sin(ui.time * 9.1) * Math.min(.8, run.v / 30) + (this.shake ? (Math.random() - .5) * this.shake * 4 : 0);
      const extras = [];
      if (run.obs && run.obs.active) extras.push({ s: run.obs.s, x: 0, draw: (g2, x, y, k) => { const w = k * 1.9, h = k * 1.4; px.rect(g2, x - w / 2, y - h, w, h * .65, '#c33'); px.rect(g2, x - w * .35, y - h * 1.3, w * .7, h * .5, '#922'); px.rect(g2, x - w * .28, y - h * 1.22, w * .56, h * .32, '#9cc4dc'); if (Math.floor(ui.time * 3) % 2) px.rect(g2, x - w * .5, y - h * .45, Math.max(1, k * .2), Math.max(1, k * .2), '#ffcc00'); } });
      if (run.slow) { for (let s = run.slow.s0; s <= run.slow.s1; s += 24) { extras.push({ s, x: -2.6, draw: (g2, x, y, k) => DH.drawThing(g2, { k: 'cone' }, x, y, k, { time: ui.time }, 40, run) }); } extras.push({ s: run.slow.s0 + 30, x: -3.4, draw: (g2, x, y, k) => DH.drawThing(g2, { k: 'worker' }, x, y, k, { time: ui.time }, 40, run) }, { s: run.slow.s0 + 90, x: -3.8, draw: (g2, x, y, k) => DH.drawThing(g2, { k: 'worker' }, x, y, k, { time: ui.time }, 40, run) }, { s: run.slow.s0 - 120, x: 2.0, draw: (g2, x, y, k) => DH.drawThing(g2, { k: 'sign', text: 'SLOW ' + run.slow.limit, bg: '#f2d21b' }, x, y, k, { time: ui.time }, 40, run) }); }
      const sc = { run, weather: run.weather, clock: run.clock, time: ui.time, trains: DH.trainsFor(run, view, this.ghosts), draw: 240, extras, closeGates: c => { const d = R.wrap(c.s - run.s); return (d < 420 && d > -12) || (run.obs && run.obs.active && run.obs.id === c.id && d < 800); } };
      const res = DH.drawWorld(g, W, H, cam, sc);
      DH.drawWeatherOverlay(g, W, H, run.weather, ui.time, run.v, Math.max(0, this.lightning));
      if (this.flash > 0) px.blend(g, this.flash, 'add', () => px.rect(g, 0, 0, W, H, '#fff6c0'));
      // call target on screen
      ui.callScreen = null;
      if (run.callOpen && res.project) { const c = run.callOpen, q = c.kind === 'marker' ? res.project(c.pos, -1.55, 2.4) : c.kind === 'slow' ? res.project(c.pos, 2, 2.6) : res.project(c.pos, 2.0, 5.2); if (q) ui.callScreen = [q[0], q[1]]; else ui.callScreen = [W / 2, H * .3]; }
      DH.drawCab(g, W, H, run, ui, I.pointer());
      // the pointing glove
      if (this.glove && ui.callScreen !== undefined) { const gl = this.glove, u = Math.min(1, gl.t * 5), tgt = ui.callScreen || [W / 2, H * .3], x0 = W * .56, y0 = H - 4, x1 = x0 + (tgt[0] - x0) * u * .55, y1 = y0 + (tgt[1] - y0) * u * .55; px.line(g, x0, y0, x1, y1, '#f4f4f4', 6); px.disc(g, x0, y0, 7, '#f4f4f4'); px.disc(g, x1, y1, 4, '#f4f4f4'); px.line(g, x1, y1, x1 + (tgt[0] - x1) * .12, y1 + (tgt[1] - y1) * .12, '#f4f4f4', 2); txt(g, gl.text, W / 2, 62, '#ffe24a', { align: 'center', scale: 2 }); }
      // stop cam
      if (this.stopcam) { const sc2 = this.stopcam, cw = Math.min(150, W - 40), cx0 = W - cw - 8, cy0 = 34; DH.drawStopCam(g, cx0, cy0, cw, 62, sc2.rec, run.T, sc2.t / 3); }
      if (this.hub) { if (DH.hubDraw) DH.hubDraw(g, W, H, this); }
      if (this.attract) { const bl = Math.floor(ui.time * 2) % 2; px.rect(g, 0, 0, W, 22, '#000a'); E.font.title(g, 'DENSHA DE HALO!', W / 2, 3, { align: 'center', scale: 2, colors: ['#fffbe0', '#ffd23a', '#ff9a1a'], depth: 1 }); txt(g, 'DEMONSTRATION: ' + this.stage.title.toUpperCase(), 6, 26, '#9fd8ff', { font: 'tiny' }); if (bl) txt(g, 'PRESS ANY BUTTON', W / 2, H * .5 - 40, '#fff', { align: 'center', scale: 2 }); }
      if (this.dev.open) this.devDraw(g, W, H);
      if (DH.TUNING.showDebug) { const L = ['s ' + run.s.toFixed(1) + ' v ' + (run.v * 3.6).toFixed(1) + ' km/h', 'lever ' + run.lever + ' brake ' + run.brakeEff.toFixed(2), 'grade ' + (R.at.grade(run.s) * 100).toFixed(2) + '% limit ' + run.limitNow(), 'phase ' + run.phase + ' halo ' + run.halo.toFixed(1), 'jerk ' + run.jerkF.toFixed(2) + ' comfort ' + run.comfort.toFixed(0), 'dist ' + (run.leg ? run.distToMark().toFixed(2) : '-')]; L.forEach((l, k) => txt(g, l, 6, 44 + k * 8, '#9cff9c', { font: 'tiny' })); }
    });
  },
  devDraw(g, W, H) {
    const items = this.devItems(), D = this.dev, rh = 12, vis = Math.max(6, Math.floor((H - 34) / rh)), x = 6, w = Math.min(250, W - 12);
    if (D.i < D.scroll) D.scroll = D.i; if (D.i >= D.scroll + vis) D.scroll = D.i - vis + 1;
    px.rect(g, x - 2, 4, w + 4, 22 + vis * rh, '#050810e8'); px.rect(g, x - 2, 4, w + 4, 2, '#ffd23a');
    txt(g, 'DEV MODE  balance + tools', x + 2, 9, '#ffd23a');
    txt(g, 'Sim is paused. Sliders are live.', x + 2, 18, '#8a96b0', { font: 'tiny' });
    D.rects = [];
    items.slice(D.scroll, D.scroll + vis).forEach((it, k) => {
      const y = 28 + k * rh, on = D.scroll + k === D.i; D.rects.push({ x, y, w, h: rh - 1 });
      px.rect(g, x, y, w, rh - 1, on ? '#ffd23acc' : '#161b2cc0'); const fc = on ? '#10131a' : '#eef2fa';
      if (it.t === 'slider') { txt(g, it.s.label, x + 4, y + 2, fc, { font: 'tiny', shadow: null }); const bx = x + w * .45, bw = w * .38, u = (DH.TUNING[it.s.k] - it.s.min) / (it.s.max - it.s.min); px.rect(g, bx, y + 4, bw, 3, '#2a3042'); px.rect(g, bx, y + 4, bw * u, 3, on ? '#10131a' : '#ffd23a'); px.rect(g, bx + bw * u - 1, y + 2, 3, 7, on ? '#10131a' : '#fff'); txt(g, it.s.fmt(DH.TUNING[it.s.k]), x + w - 4, y + 2, fc, { font: 'tiny', align: 'right', shadow: null }); }
      else if (it.t === 'toggle') { txt(g, it.label, x + 4, y + 2, fc, { font: 'tiny', shadow: null }); txt(g, DH.TUNING[it.k] ? 'ON' : 'off', x + w - 4, y + 2, DH.TUNING[it.k] ? (on ? '#10131a' : '#9ef0c0') : (on ? '#4a4a4a' : '#8a96b0'), { font: 'tiny', align: 'right', shadow: null }); }
      else txt(g, it.label, x + 4, y + 2, fc, { font: 'tiny', shadow: null });
    });
    DH.promptLine(g, [['left', 'ADJUST'], ['confirm', 'SELECT'], ['cancel', 'CLOSE']], x + w / 2, H - 6, 'center');
  }
};

/* the attract scene shares the drive scene's code */
scenes.attract = Object.assign({}, scenes.drive, {
  pausable: false,
  enter(data) {
    data = data || {}; const n = data.vignette || 0, st = data.stage || DH.STAGES[0];
    const opts = { weather: ['clear', 'clear', 'rain', 'clear', 'fog', 'storm'][n], tod: [8.5 * 3600, 7.7 * 3600, 11.4 * 3600, 17.3 * 3600, 21.1 * 3600, 23.1 * 3600][n] };
    scenes.drive.enter.call(this, { stage: st, opts, attract: true, vignette: n });
    this.run.lead = st.lead ? this.run.lead : null; this.view = n % 3; if (n > 0) { const run = this.run; run.cal = true; }
    DH.idleReset();
  },
  exit() { scenes.drive.exit.call(this); }
});

/* pause menu: retry, dev mode */
DH.pauseItems = () => {
  if (game.sceneName !== 'drive' || hubOn()) return [];
  const sc = scenes.drive;
  return [
    ['Retry stage', () => { game.resume(); const d = sc.data; game.go('drive', { stage: d.stage, opts: d.opts, career: d.career, free: d.free }, { fade: 'wipe' }); }],
    ['Retry from last station', () => { const run = sc.run; if (run.nextIdx > 0 && run.nextIdx < run.stops.length) { game.resume(); const d = sc.data, st = Object.assign({}, d.stage, { from: run.stops[run.nextIdx - 1], stops: run.stops.slice(run.nextIdx) }); game.go('drive', { stage: st, opts: d.opts, career: d.career, free: d.free, partial: true }, { fade: 'wipe' }); } else { sc.toast('Make one stop first', '#ffd36a', false); game.resume(); } }],
    ['Dev Mode', () => { sc.dev.open = true; game.resume(); }]
  ];
};
})();
