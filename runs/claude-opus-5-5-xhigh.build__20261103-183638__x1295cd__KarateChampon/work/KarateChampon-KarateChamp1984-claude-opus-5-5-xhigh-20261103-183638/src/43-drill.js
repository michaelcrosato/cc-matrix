/* =====================================================================================================================
 * PRACTICE: Senpai Negi's drill (KC.Drill). He shows a technique ("WATCH."), then the player copies it ("NOW YOU.") within
 * 4 seconds: the right one is GOOD! (+200), or SHARP! (+400) when it starts within 50 frames; a wrong one is "NO. WATCH
 * AGAIN."; after 3 misses a hint shows the two sticks and the drill waits for it. START skips a drill. data: { lesson,
 * story, demo (the attract mode's how-to: Senpai alone, the stick icons lighting up), done }.
 * ===================================================================================================================== */
KC.Drill = class {
  constructor(lesson) { this.L = KC.LESSON[lesson] || KC.LESSON.lessonI; this.i = 0; this.state = 'watch'; this.t = 0; this.misses = 0; this.points = 0; this.passed = 0; this.result = null; this.log = []; }
  get tech() { return this.L.drills[this.i]; }
  get done() { return this.i >= this.L.drills.length; }
  /** the player started technique id (or 'crouch' held): judge it */
  attempt(id, t) {
    if (this.state !== 'now' || this.done) return null;
    if (id === this.tech) { const sharp = t <= 50 / 60; this.points += sharp ? 400 : 200; this.passed++; this.result = sharp ? 'sharp' : 'good'; this.log.push([this.tech, this.result]); this.state = 'pass'; this.t = 0; return this.result; }
    this.misses++; this.result = 'miss'; this.state = 'miss'; this.t = 0; return 'miss';
  }
  skip() { if (this.done) return; this.log.push([this.tech, 'skip']); this.next(); }
  next() { this.i++; this.misses = 0; this.state = 'watch'; this.t = 0; this.result = null; }
};
KC.PracticeScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.drill = new KC.Drill(d.lesson); this.t = 0; this.finished = false; KC.scene = this; g.timeScale = 1; g.setView('kcside');
    KC.Stage.enter(g, this.drill.L.stage); KC.music('practice');
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: 150, rank: d.story ? KC.Story.rank : 'white' }); this.senpai = new KC.Karateka({ fid: 'negi', side: 1, x: 262 });
    this.bus = new KC.Bus(); this.hero.bus = this.bus; this.senpai.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero, this.senpai] }, g, this.fx);
    this.bus.on('start', e => { if (e.f === this.hero && this.drill.state === 'now') this._judge(e.tech); });
    this.reader = d.demo ? null : new KC.Reader(g.input); this.crouchT = 0; this.ended = false; this.endT = 0;
    this.talk = d.demo ? null : new KC.Talk([['negi', this.drill.L.intro]], { auto: true });
    this.hero.release(this.senpai); this.senpai.release(this.hero); this.hero.ctlOn = false;
  },
  exit() { KC.scene = null; KC.game.weather = null; },
  _judge(id) {
    const D = this.drill, r = D.attempt(id, D.t);
    if (r === 'good' || r === 'sharp') { KC.sfx('menuOk'); KC.Voice.speak(r === 'sharp' ? KC.TEXT.sharp : KC.TEXT.good, 'negi'); KC.game.particles.text(this.hero.x, 0, 80, (r === 'sharp' ? KC.TEXT.sharp + ' +400' : KC.TEXT.good + ' +200'), r === 'sharp' ? '#ffe070' : '#ffffff', { bounce: false }); }
    else if (r === 'miss') { KC.sfx('menuBack'); KC.Voice.speak(KC.TEXT.watchAgain, 'negi'); }
  },
  update(dt) {
    const g = KC.game, D = this.drill, h = this.hero, s = this.senpai; this.t += dt; D.t += dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    if (this.talk && !this.talk.done) this.talk.update(dt);
    // the senpai stands close for the close-range punch
    const sx = D.tech === 'revPunch' ? h.x + 26 : 262; if (s.free) s.x = approach(s.x, sx, dt * 120);
    if (!this.ended && D.done) { this.ended = true; this.endT = 0; s.script('nod', null); KC.Voice.speak(KC.TEXT.lessonDone, 'negi'); KC.sting('victory'); }
    if (this.ended) { this.endT += dt; if (this.endT > (this.d.demo ? 1 : 3.2) && (this.d.demo || KC.anyPressed('confirm') || KC.anyPressed('start') || this.endT > 6)) this._finish(); }
    else if (D.state === 'watch') {
      h.ctlOn = false;
      if (D.t > .6 && D.t - dt <= .6) { KC.Voice.speak(KC.TEXT.watch, 'negi'); this._demo(); }
      if (D.t > 2.4 && s.free) {
        D.state = this.d.demo ? 'demoNext' : 'now'; D.t = 0; if (!this.d.demo) KC.Voice.speak(KC.TEXT.nowYou, 'negi');
        // back to the marks for each try (a lunge carries the hero forward; too close, a lunge would be its close variant)
        if (h.free && !h.airborne) { h.x = 150; s.x = D.tech === 'revPunch' ? 150 + 26 : 262; h.face = 1; s.face = -1; }
      }
    } else if (D.state === 'demoNext') { if (D.t > .4) D.next(); }
    else if (D.state === 'now') {
      h.ctlOn = true;
      if (D.tech === 'crouch') { this.crouchT = h.st === 'crouch' ? this.crouchT + dt : 0; if (this.crouchT > .3) this._judge('crouch'); }
      if (D.t > 4 && D.misses < 3) { D.attempt('__none', D.t); KC.Voice.speak(KC.TEXT.watchAgain, 'negi'); }
      if (KC.anyPressed('skip') && !this.d.demo) { KC.consumeAll(); D.skip(); }
    } else if (D.state === 'pass') { if (D.t > 1.2 && h.free) D.next(); }
    else if (D.state === 'miss') { if (D.t > 1.1 && h.free) { D.state = D.misses >= 3 ? 'now' : 'watch'; D.t = D.misses >= 3 ? -99 : 0; if (D.state === 'now' && !h.airborne) { h.x = 150; s.x = D.tech === 'revPunch' ? 176 : 262; } } }
    h.control(this.reader ? this.reader.read() : { posture: 'n', press: null });
    h.update(dt, s); s.update(dt, h); KC.Bout.push(h, s);
    h.pose(dt); s.pose(dt);
    KC.camera(g, [h.x, s.x]);
  },
  // the senpai performs the drill's technique into the air
  _demo() { const s = this.senpai, id = this.drill.tech; s.face = -1; if (id === 'crouch') { s.ctlOn = true; s.control({ posture: 'd', press: null }); KC.game.after(1, () => { s.control({ posture: 'n', press: null }); s.ctlOn = false; }); return; } s.ctlOn = false; s.startTech(id, null); s.face = -1; },
  _finish() {
    if (this.finished) return; this.finished = true; const D = this.drill, d = this.d, g = KC.game;
    if (d.done) { d.done(D.points); return; }
    if (d.story) { KC.Story.score += D.points; if (D.L.id === 'lessonI') g.go('cutscene', { script: 'lessonEnd', stage: 'dojo', cast: ['taro', 'negi'], next: () => KC.Story.advance() }); else KC.Story.advance(); return; }
    g.go('dojo');
  },
  draw(r) {
    const D = this.drill;
    KC.Stage.draw(r, D.L.stage, {});
    this.hero.draw(r); this.senpai.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (!D.done) {
        const T = KC.TECH[D.tech], idx = D.i + 1, card = D.L.title + '-' + idx + ': ' + T.name;
        E.ui.box(g, 10, 6, W - 20, 44, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .92 });
        E.font.text(g, card, mid, 11, '#fff6d0', { align: 'center', outline: false, scale: W > 380 && card.length < 30 ? 2 : 1 });
        const blink = D.state === 'miss' || D.misses > 0 ? Math.floor(this.t * 4) % 2 === 0 : true, parts = KC.promptFor(D.tech, KC.game.input, this.d.demo ? (Math.floor(this.t / 6) % 2 ? 'keyboard' : 'gamepad') : undefined);
        if (blink) { const w = KC.iconRow(g, 0, 0, parts, 2, false); KC.iconRow(g, mid - Math.round(w / 2), 28, parts, 2); }
        const st = D.state === 'watch' ? KC.TEXT.watch : D.state === 'now' ? KC.TEXT.nowYou : D.state === 'pass' ? (D.result === 'sharp' ? KC.TEXT.sharp : KC.TEXT.good) : D.state === 'miss' ? KC.TEXT.watchAgain : '';
        if (st) E.font.title(g, st, mid, 62, { scale: 2, align: 'center', colors: D.state === 'miss' ? ['#ffd0c0', '#ff5a4a'] : ['#fff6d0', '#ffd060', '#e8782a'] });
        if (D.misses >= 3 && D.state === 'now') { const c = KC.cellOf(D.tech) || ['d', null], p = { u: 'UP', d: 'DOWN', f: '→ TOWARD', b: '← AWAY', n: 'NEUTRAL' }[c[0]], t = c[1] ? { u: 'UP', d: 'DOWN', f: '→', b: '←' }[c[1]] : null; const hint = 'HOLD L ' + p + (t ? ', THEN PUSH R ' + t : ''); E.ui.box(g, 20, 84, W - 40, 16, { bg: '#1a3a1a', border: '#8ae08a' }); E.font.text(g, hint, mid, 88, '#d8ffd0', { align: 'center', outline: false }); }
        E.font.text(g, 'POINTS ' + D.points + '   ' + idx + '/' + D.L.drills.length, 12, H - 30, '#fff6e8', { outline: '#000' });
      } else {
        E.font.title(g, KC.TEXT.lessonDone, mid, Math.round(H * .3), { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
        E.font.text(g, D.passed + '/' + D.L.drills.length + '   +' + D.points, mid, Math.round(H * .3) + 34, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
      }
      if (this.talk && !this.talk.done) this.talk.draw(g, W, H);
      if (!this.d.demo) KC.promptBar(g, W, H, D.done ? [['confirm', 'CONTINUE']] : [['skip', 'SKIP DRILL'], ['pause', 'PAUSE']]);
    });
  },
  debugState() { const D = this.drill; return { lesson: D.L.id, index: D.i, state: D.state, result: D.result, points: D.points, misses: D.misses, done: D.done }; }
};
