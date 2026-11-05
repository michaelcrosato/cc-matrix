/* ---- SCENES II: the fight (every mode: story, versus, kachinuki, attract, free spar), bonus stages, practice drills,
 * versus setup, character and stage select, results, local Kachinuki, and the move list ---- */
const human = (pi) => (f, foe) => { const I = game.players[pi]; if (!I || KC.MoveList.active || game.paused) return KC.NEUTRAL; const it = KC.readIntent(I); if (it.press) { (f._inLog = f._inLog || []).push({ p: it.posture, r: it.press }); if (f._inLog.length > 12) f._inLog.shift(); } return it; };
KC.human = human;
const DUMMY_MODES = ['STAND', 'CROUCH', 'JUMP', 'BLOCK', 'ATTACK'];
const dummyCtl = (F) => { const ai = new KarateAI({ id: 'negi', level: 3, seed: 5 }); let t = 0; return (f, foe, b) => { t += 1 / 120; const m = DUMMY_MODES[F.dummy]; if (m === 'CROUCH') return { posture: 'd', press: null }; if (m === 'JUMP') return { posture: t % 1.4 < .05 ? 'u' : 'n', press: null }; if (m === 'BLOCK') { if (foe.st === 'tech' && foe.ph === 's' && foe.T && foe.T.pts) { const tw = Math.sign(foe.x - f.x) > 0 ? 'r' : 'l'; return { posture: tw === 'r' ? 'l' : 'r', press: tw }; } return KC.NEUTRAL; } if (m === 'ATTACK') return ai.control(f, foe, b); return KC.NEUTRAL; }; };

scenes.fight = SC({
  views: ['side', 'brawler'], pausable: !SESSION,
  enter(d) {
    KC.F = this; this.d = d; this.mode = d.mode; this.t = 0; this.result = null; this.perfect = false; this.score = null; this._auto = false; this.hintI = 0; this.tipT = 0; this.dummy = 0; this.kn = d.kachinuki || null;
    KC.applyMaps(); game.setView(game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
    const story = this.mode === 'story', node = d.node, ladderI = story ? KC.DATA.ladder.indexOf(node) : -1;
    this.stage = new Stage(d.stage, { mei: story && KC.STAGE[d.stage].mei && ladderI > 5 && d.red !== 'mei' }); this.stage.enter();
    const pal = game.settings.palette === 'Classic' && (KC.unlocks().classic || DEV.unlocked) ? 'Classic' : 'Modern';
    const W = new Karateka(d.white, 0, { palette: pal }), R = new Karateka(d.red, 1, { palette: pal });
    if (story) { W.setBelt(KC.RANKS[KC.Story.s.rank][1]); R.setBelt(KC.ROSTER[d.red].belt); }
    if (d.red === 'mei' || d.white === 'mei') (d.red === 'mei' ? R : W).setBelt('gold');
    if (d.belts) { W.setBelt(d.belts[0]); R.setBelt(d.belts[1]); }
    const lvl = d.cpuLevel, cpu = d.cpu || (story ? [false, true] : this.mode === 'versus' ? [false, !game.players[1] || d.p2cpu] : [false, false]);
    this.cpu = cpu; this.ai = [null, null];
    const ctrl = [0, 1].map(i => {
      if (d.ctrl && d.ctrl[i]) return d.ctrl[i];
      if (this.mode === 'freeSpar' && i === 1) return dummyCtl(this);
      if (cpu[i]) { const ai = KC.cpuFor(i ? d.red : d.white, (d.seed || 11) + i * 101, lvl); if (story && KC.Story.s.easier) { ai.setLevel(ai.level - 2); } this.ai[i] = ai; return (f, foe, b) => ai.control(f, foe, b); }
      return human(d.pad && d.pad[i] !== undefined ? d.pad[i] : i);
    });
    this.bout = new Bout({ fighters: [W, R], ctrl, cpu, seed: d.seed || 1, stage: d.stage, roundsToWin: d.rounds, pointsToWin: d.points, clock: d.clock, spar: this.mode === 'freeSpar', intro: d.intro, online: this.mode === 'online' });
    const B = this.bout;
    B.on('point', p => { this.stage.react(p.full ? 'full' : 'point'); if (story && p.side === 0 && !p.spar) KC.Story.add(p.pts); if (this.mode === 'versus' || this.kn) (this.score = this.score || [0, 0])[p.side] += p.pts; });
    B.on('block', () => this.stage.react('block'));
    B.on('roundEnd', e => { if (story && e.winner === 0) KC.Story.add(e.bonus); if (story && e.winner === 1) { const s = KC.Story.s, id = node.id; s.lostRounds[id] = (s.lostRounds[id] || 0) + 1; if (s.lostRounds[id] >= 2 && KC.ROSTER[d.red].tip) this.tipT = 4; } KC.sting(e.winner === 0 || this.mode !== 'story' ? 'victory' : 'defeat'); });
    B.on('matchEnd', e => this.over(e));
    if (this.mode === 'freeSpar') { DEV.boxes = true; DEV.frames = true; }
    if (d.director) B.director = b => d.director.hook(b);
    KC.music(KC.STAGE[d.stage].music); game.timeScale = 1;
    if (this.kn) this.seiza = this.kn.queue.slice(2).map((pi, k) => { const f = new Karateka(this.kn.fighters[pi], k % 2, { x: k % 2 ? 420 + k * 6 : -20 - k * 6 }); f.setPose('seiza'); return f; });
  },
  exit() { game.timeScale = 1; if (this.mode === 'freeSpar') { DEV.boxes = false; DEV.frames = false; } game.setView('side'); },
  retry() { game.go('fight', this.d); },
  over(e) {
    const B = this.bout, w = e.winner;
    if (this.mode === 'story') { if (w === 0) { if (e.perfect) { KC.Story.add(5000); this.perfect = true; KC.sting('perfect'); } this.result = { t: 0, won: true, stats: e.stats[0] }; } else this.result = { t: 0, won: false }; }
    else if (this.mode === 'versus') this.result = { t: 0, versus: true, e };
    else if (this.kn) this.result = { t: 0, kn: true, w };
    else if (this.d.onOver) this.d.onOver(e);
  },
  update(dt) {
    const B = this.bout; this.t += dt;
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    game.timeScale = TUNE.gameSpeed * (B.slow > 0 ? .35 : 1) * (DEV.slowmo ? .25 : 1);
    if (B.phase === 'award' && game.input.pressed('start')) B.skip = true;
    if (this.mode === 'freeSpar') { if (game.input.pressed('l1') || game.input.pressed('r1')) { this.dummy = (this.dummy + (game.input.pressed('l1') ? 4 : 1)) % 5; KC.sfx('menuMove'); } const c = game.input.clicked && game.input.clicked(); if (c) { const s = game.r && game.r.w ? game.r.w(B.f[1].x, 0, 30) : null; if (s && Math.abs(c[0] - s[0]) < 24 && Math.abs(c[1] - s[1]) < 50) { this.dummy = (this.dummy + 1) % 5; KC.sfx('menuMove'); } } if (game.input.pressed('cancel')) return game.go('dojoMenu'); }
    if (game.input.pressed('dev') && DEV.enabled) KC.Dev.toggle();
    if (!(DEV.frameStep && !game.input.pressed('r1'))) B.update(dt);
    this.stage.update(dt); if (this.seiza) this.seiza.forEach(f => f.update(dt));
    KC.stageCam(B.f, game.view.id);
    if (this.tipT > 0) this.tipT -= dt;
    if (this.mode === 'story' && this.d.node && this.d.node.hints && game.settings.hints) this.hintI = Math.floor(this.t / 6) % KC.HINTS.length;
    if (this.result) {
      const R = this.result; R.t += dt;
      if (R.t > 2.2 || (R.t > .8 && game.input.pressed('start'))) {
        const res = this.result; this.result = null;
        if (this.mode === 'story') { if (res.won) KC.Story.matchWon(res.stats || {}); else KC.Story.matchLost(); }
        else if (res.versus) game.go('results', { e: res.e, d: this.d, score: this.score || [0, 0] });
        else if (res.kn) KC.Kachinuki.boutOver(this.kn, res.w, this.d);
      }
    }
  },
  draw(r) {
    const B = this.bout; this.stage.draw(r);
    if (this.seiza) this.seiza.forEach(f => f.draw(r));
    B.draw(r);
    if (DEV.boxes) r.overlay(g => B.f.forEach(f => { const a = r.w(f.x - f.w / 2, 0, f.z + (f.isLow() ? 34 : 56)), b = r.w(f.x + f.w / 2, 0, f.z); px.rect(g, a[0], a[1], b[0] - a[0], 1, '#5aff8a'); px.rect(g, a[0], b[1], b[0] - a[0], 1, '#5aff8a'); px.rect(g, a[0], a[1], 1, b[1] - a[1], '#5aff8a'); px.rect(g, b[0], a[1], 1, b[1] - a[1], '#5aff8a'); if (f.st === 'tech' && f.ph === 'a' && f.T && f.T.reach) { const [mn, mx] = f.reach(); const e = f.x + f.face * f.w / 2, h = f.T.height === 'high' || f.T.height === 'air' ? 48 : f.T.height === 'low' ? 10 : 32, c0 = r.w(e + f.face * mn, 0, h), c1 = r.w(e + f.face * mx, 0, h); px.rect(g, Math.min(c0[0], c1[0]), c0[1] - 2, Math.abs(c1[0] - c0[0]) + 1, 4, '#ff4a4a'); } }));
    const story = this.mode === 'story';
    KC.HUD.draw(r, B, { score: story ? KC.Story.s.score : undefined, hi: story ? KC.Story.hi() : 0, hint: story && this.d.node && this.d.node.hints && game.settings.hints && B.phase === 'fight' ? KC.HINTS[this.hintI] : null, names: this.d.names });
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.mode === 'freeSpar') { box(g, W / 2 - 120, H - 52, 240, 34, { alpha: .85 }); KC.title(g, 'DUMMY: ' + DUMMY_MODES[this.dummy], W / 2, H - 48, 1); KC.promptRow(g, [[KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'CHANGE (OR CLICK IT)'], [KC.back(), 'EXIT']], W / 2, H - 34, 10); const p = B.popups[B.popups.length - 1]; if (p && p.t < 1.4) KC.title(g, p.text, W / 2, 50, 2); }
      if (this.tipT > 0) { box(g, 20, H * .62, W - 40, 26, { bg: ['#1a3a5a', '#0a1a2a'], border: '#a8e8ff' }); const tip = 'TIP: ' + KC.ROSTER[this.d.red].tip; T(g, tip, W / 2 - TW(tip) / 2, H * .62 + 9, '#e8f8ff'); }
      if (this.kn) { const K = this.kn; T(g, 'KACHINUKI • STREAK ' + K.streak + ' • FIRST TO ' + K.target, W / 2 - TW('KACHINUKI • STREAK ' + K.streak + ' • FIRST TO ' + K.target) / 2, 46, '#ffd060'); }
      if (this.result) { const R = this.result; if (R.won) { KC.title(g, this.perfect ? 'PERFECT!' : 'YOU WIN!', W / 2, H * .55, 3); } else if (R.won === false) KC.title(g, 'DEFEATED', W / 2, H * .55, 3, ['#ffffff', '#a0a0c0', '#4a4a6a']); }
      if (this.ai[1] && DEV.thoughts) { const a = this.ai[1]; box(g, W - 150, 50, 142, 26, { alpha: .8 }); T(g, 'CPU L' + a.level + ': ' + a.thought, W - 146, 54, '#a8ffa8'); T(g, 'REACT ' + a.react.toFixed(2) + ' READ ' + a.readP.toFixed(2), W - 146, 64, '#a8ffa8'); }
      if (DEV.frameStep) T(g, 'FRAME STEP: ' + (KC.dev() === 'pad' ? 'R1' : 'E') + ' ADVANCES', W / 2 - 60, H - 70, '#ff8a6a');
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});

/* ---- BONUS ---- */
const BONUS_DIFF = { boards: [{ n: 3, mat: 'pine' }, { n: 5, mat: 'pine' }, { n: 7, mat: 'tile' }, { n: 10, mat: 'ice' }], pots: [{ v0: 120, v1: 180, i0: 1.6, i1: 1 }, {}, { v0: 180, v1: 270, i0: 1.2, i1: .65 }], bull: [{ charges: [130, 160, 200] }, {}, { charges: [180, 230, 280] }] };
scenes.bonus = SC({
  pausable: true,
  enter(d) {
    this.d = d; const P = KC.DATA.bonus[d.kind], kind = KC.BONUS_KINDS[d.kind], diff = d.diff === undefined ? 1 : d.diff;
    const params = Object.assign({}, P, (BONUS_DIFF[d.kind] || [])[d.kind === 'boards' ? [0, 1, 3][diff] : diff] || {}, d.params || {});
    this.stage = new Stage(P.stage); this.stage.enter(); KC.applyMaps();
    const hero = new Karateka('taro', 0, { x: 170 }); if (KC.Story.s && d.story) hero.setBelt(KC.RANKS[KC.Story.s.rank][1]);
    const B = this.B = { kind: d.kind, K: kind, params, hero, t: 0, points: 0, visit: d.visit || 0, msgs: [], pops: [], cheat: !!d.cheat, auto: !!d.auto,
      say: (txt) => { B.msgs.push({ text: txt, t: 0 }); KC.Voice.speak(txt, 'genkotsu', { call: 'raw' }); },
      callout: (id, extra) => { if (id) { B.msgs.push({ text: KC.calls(id), t: 0 }); KC.Voice.speak(KC.calls(id), 'genkotsu', { call: id }); } if (extra) B.msgs.push({ text: extra, t: -.6 }); if (id === 'perfect') KC.sting('perfect'); },
      popup: (x, z, text) => B.pops.push({ x, z, text, t: 0 }),
      finish: () => this.finish(), bstate: st => { B.bull.st = st; B.bull.st0 = 0; } };
    kind.start(B); this.done = false; KC.music('bonus');
    B.msgs.push({ text: 'BONUS STAGE!', t: 0 }); B.msgs.push({ text: P.title, t: -.8 }); KC.Voice.speak('BONUS STAGE! ' + P.title, 'genkotsu');
  },
  finish() {
    if (this.done) return; this.done = true; const B = this.B, d = this.d;
    if (d.onDone) return d.onDone(B);
    if (d.story) { KC.Story.add(B.points); KC.Story.done(); return; }
    KC.initials(B.points, d.kind, () => game.go('bonusMenu'));
  },
  update(dt) {
    const B = this.B, h = B.hero; B.t += dt; this.stage.update(dt);
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    const I = game.input, auto = B.auto || this.d.autopilot;
    let it = auto ? B.K.auto(B) : KC.readIntent(I);
    if (B.kind === 'boards') { const ctl = auto ? B.K.auto(B) : { hold: I.down('tDown') }; B.K.update(B, dt, ctl); }
    else {
      const foe = B.kind === 'pots' ? (B.K.phantom(B) || { x: h.x + h.face * 50 }) : { x: B.bull ? B.bull.x : 400 };
      if (B.state === 'play' && h.st !== 'down' && h.st !== 'hurt') { h.control(it, foe, dt); } else if (h.st === 'idle' || h.st === 'walk') h.vx = 0;
      if (h.st === 'walk') { h.st = 'idle'; h.vx = 0; }   // (bonus stages: the hero holds the mark)
      h.step(dt, foe, [0, 400]); B.K.update(B, dt);
    }
    const extra = B.K.rig && B.K.rig(B, h);
    if (extra) h.rig.update(dt, Object.assign(h.rigState(), extra)); else h.update(dt);
    B.msgs.forEach(m => m.t += dt); B.msgs = B.msgs.filter(m => m.t < 1.6); B.pops.forEach(p => p.t += dt); B.pops = B.pops.filter(p => p.t < 1.2);
    KC.stageCam([h, { x: B.kind === 'bull' ? 260 : 200 }]);
  },
  draw(r) {
    const B = this.B; this.stage.draw(r); B.K.draw(B, r); B.hero.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, KC.DATA.bonus[B.kind].title, W / 2, 6, 2); T(g, 'BONUS ' + U.pad(B.points, 6), W / 2 - TW('BONUS 000000') / 2, 30, '#ffd060');
      B.K.hud(B, g, W, H, r);
      const m = B.msgs.filter(m => m.t >= 0)[0]; if (m) KC.title(g, m.text, W / 2, H * .3, m.text.length > 14 ? 2 : 3);
      for (const p of B.pops) { const s = r.w(p.x, 0, p.z + p.t * 20); T(g, p.text, s[0] - TW(p.text) / 2, s[1], '#ffe070', { outline: '#000' }); }
      if (B.state === 'over' && B.t - B.endT > .8) { box(g, W / 2 - 80, H * .5, 160, 30); KC.title(g, 'TOTAL ' + B.points, W / 2, H * .5 + 8, 2); }
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});

/* ---- PRACTICE: Senpai's drill. WATCH, then NOW YOU: copy the technique within 4 s ---- */
scenes.practice = SC({
  pausable: true,
  enter(d) {
    this.d = d; const L = this.L = KC.DATA.lessons[d.lesson]; this.stage = new Stage(L.stage); this.stage.enter(); KC.applyMaps();
    this.hero = new Karateka('taro', 0, { x: 140 }); this.senpai = new Karateka('negi', 1, { x: 270 }); if (KC.Story.s && d.story) this.hero.setBelt(KC.RANKS[KC.Story.s.rank][1]);
    this.i = 0; this.fin = false; this.crouchT = 0; this.youCrouch = 0; this.state = 'intro'; this.st = 0; this.points = 0; this.good = 0; this.misses = 0; this.msg = null; KC.music('practice');
    this.hero.onStart = (f, t) => this.attempt(t.id, f.reqTech); KC.Voice.speak(L.intro, 'negi'); this.msg = { text: L.intro, t: 0 };
  },
  setS(state) { this.state = state; this.st = 0; },
  attempt(id, req) {
    if (this.state !== 'you') return; const want = this.L.drills[this.i], W = KC.TECH[want], R = KC.TECH[req || id] || KC.TECH[id];
    // the drill checks the stick input: the same posture and technique cell (a reverse punch is front kick's cell, close in)
    const ok = id === want || (R && R.L === W.L && R.R === W.R);
    if (ok) { const sharp = this.st * 60 <= 50 * (1 / 1) && this.st < 50 / 60; const pts = sharp ? 400 : 200; this.points += pts; this.good++; this.say(sharp ? 'SHARP!' : 'GOOD!', 'negi'); game.audio.sfx('menuOk'); this.result = sharp ? 'sharp' : 'good'; this.setS('praise'); }
    else { this.misses++; this.say('NO. WATCH AGAIN.', 'negi'); game.audio.sfx('menuBack'); this.result = 'wrong'; this.setS('watch'); this.senpaiDo(); }
  },
  say(text, who) { this.msg = { text, t: 0 }; KC.Voice.speak(text, who); },
  senpaiDo() { const s = this.senpai, id = this.L.drills[this.i]; s.reset(270); s.face = -1; if (id === 'crouch') { s.st = 'crouch'; this.crouchT = .9; } else s.start(id, { x: 140 }); },
  update(dt) {
    this.st += dt; this.stage.update(dt); if (this.msg) this.msg.t += dt;
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    const I = game.input, h = this.hero, s = this.senpai, phantom = { x: 270, w: 16 };
    if (I.pressed('start') && this.state !== 'end') { game.input.consumeAll(); this.say('SKIP.', 'negi'); this.next(); }
    if (this.state === 'intro' && this.st > 1.6) { this.setS('watch'); this.senpaiDo(); this.say('WATCH.', 'negi'); }
    else if (this.state === 'watch' && this.st > 1.4 && s.st !== 'tech') { this.setS('you'); this.say('NOW YOU.', 'negi'); h.reset(140); }
    else if (this.state === 'you') {
      if (this.L.drills[this.i] === 'crouch' && h.st === 'crouch') { this.youCrouch = (this.youCrouch || 0) + dt; if (this.youCrouch > .3) { this.youCrouch = 0; this.attempt('crouch'); } }
      if (this.st > 4 && !(this.misses >= 3)) { this.misses++; this.say('WATCH AGAIN.', 'negi'); this.setS('watch'); this.senpaiDo(); }
    }
    else if (this.state === 'praise' && this.st > 1.2) this.next();
    else if (this.state === 'end' && this.st > 3) this.finish();
    if (this.crouchT > 0) { this.crouchT -= dt; if (this.crouchT <= 0) s.st = 'idle'; }
    const intent = this.state === 'you' || this.state === 'watch' || this.state === 'praise' ? (this.d.autopilot ? this.autoIntent() : KC.readIntent(I)) : KC.NEUTRAL;
    h.control(intent, phantom, dt); if (h.st === 'walk') { h.st = 'idle'; h.vx = 0; }
    h.step(dt, phantom, [0, 400]); s.step(dt, { x: 140 }, [0, 400]); if (s.st === 'idle' || s.st === 'walk') s.x = lerp(s.x, 270, dt * 4); if (h.st === 'idle') h.x = lerp(h.x, 140, dt * 4);
    h.update(dt); s.update(dt); KC.stageCam([h, s]);
  },
  autoIntent() { if (this.state !== 'you' || this.st < .2 || !this.hero.free()) return KC.NEUTRAL; const t = KC.TECH[this.L.drills[this.i]], scr = d => d === 't' ? 'r' : d === 'a' ? 'l' : d; return { posture: scr(t.L), press: t.kind === 'crouch' ? null : scr(t.R) }; },
  next() { this.i++; this.misses = 0; this.result = null; if (this.i >= this.L.drills.length) { this.setS('end'); this.say('LESSON COMPLETE.', 'negi'); this.senpai.setPose('bow'); } else { this.setS('watch'); this.senpaiDo(); } },
  finish() {
    if (this.fin) return; this.fin = true;
    if (this.d.onDone) return this.d.onDone(this);
    if (this.d.story) { KC.Story.add(this.points); const sc = 'lessonEnd' + this.d.lesson; if (KC.SCRIPTS[sc] && !DEV.skipCut) game.go('cutscene', { script: sc, stage: this.L.stage, then: () => KC.Story.done() }); else KC.Story.done(); return; }
    game.go('dojoMenu');
  },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r); this.senpai.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, t = KC.TECH[this.L.drills[this.i]];
      if (this.state !== 'end' && t) {
        box(g, W / 2 - 150, 6, 300, 44, { alpha: .9 }); const title = this.L.title + '-' + (this.i + 1) + ': ' + t.name; T(g, title, W / 2 - TW(title) / 2, 11, '#ffd060');
        const items = KC.promptFor(t.id, KC.dev()); KC.promptRow(g, items, W / 2, 26, 13);
        if (this.misses >= 3 && Math.floor(this.st * 3) % 2 === 0) { const hint = KC.hintFor(t); box(g, W / 2 - 150, 54, 300, 16, { bg: ['#3a2a0a', '#1a1404'], border: '#ffd060' }); T(g, hint, W / 2 - TW(hint) / 2, 58, '#ffe8a0'); }
        if (this.state === 'you') { const left = Math.max(0, 4 - this.st); E.ui.bar(g, W / 2 - 50, 74, 100, 4, left / 4, '#5ab0ff'); }
      }
      if (this.msg && this.msg.t < 1.4) KC.title(g, this.msg.text, W / 2, H * .36, this.msg.text.length > 14 ? 2 : 3);
      if (this.state === 'end') { box(g, W / 2 - 100, H * .5, 200, 40); KC.title(g, 'LESSON COMPLETE ' + this.good + '/' + this.L.drills.length, W / 2, H * .5 + 6, 2); T(g, '+' + this.points, W / 2 - 12, H * .5 + 26, '#ffd060'); }
      T(g, 'POINTS ' + this.points, 8, H - 30, '#ffd060');
      KC.bar(g, [[KC.startG(), 'SKIP DRILL'], [KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ESC', 'PAUSE']]);
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});
// prompts for a technique on a device: [['L:r', '+'], ['R:u', 'UPPER LUNGE PUNCH']]
KC.promptFor = (id, dev) => {
  const t = KC.TECH[id]; if (!t) return [];
  const pd = { n: null, t: 'r', a: 'l', u: 'u', d: 'd' }, kk = { u: 'W', d: 'S', l: 'A', r: 'D' }, rk = { u: 'I', d: 'K', l: 'J', r: 'L' };
  const L = pd[t.L], R = t.kind === 'crouch' ? null : pd[t.R];
  const out = [];
  if (dev === 'pad') { if (L) out.push(['L:' + L, '+']); if (R) out.push(['R:' + R, t.alt ? 'CLOSE IN' : '']); }
  else { if (L) out.push(['key:' + kk[L], '+']); if (R) out.push(['key:' + rk[R], t.alt ? 'CLOSE IN' : '']); }
  if (!R && t.kind === 'crouch') out.push([dev === 'pad' ? 'L:d' : 'key:S', 'HOLD']);
  return out;
};
KC.hintFor = t => { const P = { n: '', t: 'HOLD L TOWARD, ', a: 'HOLD L AWAY, ', u: 'PUSH L UP, ', d: 'HOLD L DOWN, ' }, R = { u: 'PUSH R UP', t: 'PUSH R TOWARD', d: 'PUSH R DOWN', a: 'PUSH R AWAY' }; return t.kind === 'crouch' ? 'HOLD L DOWN' : (P[t.L] + 'THEN ' + R[t.R]).replace(/^THEN /, ''); };

/* ---- VERSUS: setup (P2 joins, rules), select, stage select, results ---- */
const VS = KC.VS = { p2: 'cpu', level: 5, rounds: 2, points: 2, clock: 30, picks: ['taro', 'ebi'], stage: 'dojo', randomStage: false };
scenes.versus = SC({
  enter() {
    game.allowJoin({ max: 4, onJoin: () => { KC.applyMaps(); this.refresh(); } }); KC.applyMaps(); KC.music('select'); this.refresh(); KC.Attract.poke();
  },
  refresh() {
    const n = game.players.length;
    this.menu = new Menu([
      { label: () => n >= 3 ? 'START KACHINUKI (' + n + ' PLAYERS)' : 'CHARACTER SELECT', fn: () => n >= 3 ? KC.Kachinuki.startLocal() : game.go('select') },
      { label: () => 'RED: ' + (game.players[1] ? (VS.p2 === 'cpu' ? 'CPU' : 'PLAYER 2') : 'CPU'), adjust: () => { if (game.players[1]) VS.p2 = VS.p2 === 'cpu' ? 'human' : 'cpu'; }, fn: () => { if (game.players[1]) VS.p2 = VS.p2 === 'cpu' ? 'human' : 'cpu'; } },
      { label: () => 'CPU LEVEL: ' + VS.level, adjust: d => { VS.level = clamp(VS.level + d, 1, 10); }, fn: () => { VS.level = VS.level % 10 + 1; } },
      { label: () => 'ROUNDS TO WIN: ' + VS.rounds, adjust: d => { VS.rounds = clamp(VS.rounds + d, 1, 3); }, fn: () => { VS.rounds = VS.rounds % 3 + 1; } },
      { label: () => 'POINTS TO WIN: ' + VS.points, adjust: d => { VS.points = clamp(VS.points + d, 1, 5); }, fn: () => { VS.points = VS.points % 5 + 1; } },
      { label: () => 'CLOCK: ' + VS.clock, adjust: d => { const o = [30, 60, 99]; VS.clock = o[clamp(o.indexOf(VS.clock) + d, 0, 2)]; }, fn: () => { const o = [30, 60, 99]; VS.clock = o[(o.indexOf(VS.clock) + 1) % 3]; } }
    ], { onCancel: () => { game.allowJoin(false); game.go('title', { menu: true }); } });
    if (game.players[1] && this._n !== n) VS.p2 = 'human'; this._n = n;
  },
  update(dt) { if (KC.Attract.tick(dt)) return; KC.applyMaps(); this.menu.update(dt); },
  draw(r) {
    r.sky(['#1a0a10', '#3a1420', '#5a1a20']);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, 'VERSUS', W / 2, 8, 3);
      const n = game.players.length; game.players.forEach((p, i) => { box(g, 10 + i * (W - 20) / 4, 38, (W - 20) / 4 - 6, 20, { border: E.PLAYER_COLORS[i] }); T(g, p.name + ' ' + (p.device === 'gamepad' || p.lastDevice === 'gamepad' ? 'PAD' : p.half ? 'KEYS (HALF)' : 'KEYS'), 16 + i * (W - 20) / 4, 44, '#fff'); });
      if (n < 4) T(g, n < 2 ? 'PLAYER 2: PRESS 2 ON THE KEYBOARD OR OPTIONS ON A PAD' : 'MORE PLAYERS: OPTIONS ON A PAD (3-4 = KACHINUKI)', W / 2 - TW(n < 2 ? 'PLAYER 2: PRESS 2 ON THE KEYBOARD OR OPTIONS ON A PAD' : 'MORE PLAYERS: OPTIONS ON A PAD (3-4 = KACHINUKI)') / 2, 62, '#ff8a6a');
      this.menu.draw(g, W / 2, 80, { scale: 2 });
      if (game.players.some(q => q.half)) T(g, 'P1: WASD + T F G H    P2: ARROWS + I J K L', W / 2 - TW('P1: WASD + T F G H    P2: ARROWS + I J K L') / 2, H - 30, '#c8c0e0');
      KC.bar(g, [[KC.ok(), 'SELECT'], [KC.dev() === 'pad' ? 'L:l' : 'key:A', ''], [KC.dev() === 'pad' ? 'L:r' : 'key:D', 'CHANGE'], [KC.back(), 'BACK']]);
    });
  }
});
const SEL_IDS = KC.DATA.roster.map(f => f.id);
scenes.select = SC({
  enter() { this.cur = [SEL_IDS.indexOf(VS.picks[0]), SEL_IDS.indexOf(VS.picks[1])]; this.done = [false, false]; this.cpu2 = !game.players[1] || VS.p2 === 'cpu'; this.prev = SEL_IDS.map(id => new Karateka(id, 0)); this.t = 0; KC.music('select'); },
  cols() { return 5; },
  update(dt) {
    this.t += dt; this.prev.forEach(p => p.update(dt)); KC.applyMaps();
    const active = this.done[0] ? (this.cpu2 ? 0 : 1) : 0;
    const handle = (i, I) => {
      if (this.done[i]) { if (I.pressed('cancel')) { this.done[i] = false; KC.sfx('menuBack'); } return; }
      let c = this.cur[i]; if (I.repeat('left', .3, .1)) c = (c + 9) % 10; if (I.repeat('right', .3, .1)) c = (c + 1) % 10; if (I.repeat('up', .3, .1) || I.repeat('down', .3, .1)) c = (c + 5) % 10;
      if (c !== this.cur[i]) { this.cur[i] = c; KC.sfx('menuMove'); }
      if (I.pressed('confirm')) { if (KC.isUnlocked(SEL_IDS[c])) { this.done[i] = true; KC.sfx('menuOk'); KC.Voice.speak(KC.ROSTER[SEL_IDS[c]].quotes.intro, SEL_IDS[c]); } else KC.sfx('menuBack'); }
      if (I.pressed('cancel') && i === 0) game.go('versus');
    };
    if (this.cpu2) { handle(this.done[0] ? 1 : 0, game.input); }
    else { handle(0, game.players[0]); if (game.players[1]) handle(1, game.players[1]); }
    // the mouse: hover moves P1's (or the CPU pick's) cursor, a click picks
    const I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), k = this.cellAt(c || p);
    if (k >= 0) { const who = this.done[0] && this.cpu2 ? 1 : 0; if (!this.done[who]) { if (k !== this.cur[who] && p && !c) { this.cur[who] = k; } if (c && KC.isUnlocked(SEL_IDS[k])) { this.cur[who] = k; this.done[who] = true; KC.sfx('menuOk'); } } }
    if (this.done[0] && this.done[1]) { VS.picks = [SEL_IDS[this.cur[0]], SEL_IDS[this.cur[1]]]; game.go('stageSelect'); }
  },
  cell(k) { const W = game.W, cw = 38, x0 = W / 2 - cw * 2.5; return [x0 + (k % 5) * cw, 120 + Math.floor(k / 5) * 46, cw - 4, 42]; },
  cellAt(p) { if (!p) return -1; for (let k = 0; k < 10; k++) { const [x, y, w, h] = this.cell(k); if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return k; } return -1; },
  draw(r) {
    r.sky(['#0a0a1a', '#1a1438']);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, 'CHOOSE YOUR FIGHTER', W / 2, 6, 2);
      for (let k = 0; k < 10; k++) {
        const [x, y, w, h] = this.cell(k), id = SEL_IDS[k], lock = !KC.isUnlocked(id);
        this.prev[k].rig.drawPortrait(g, x, y, w, { zoom: 2.2, turn: .4, bg: '#2a2440', frame: true, tint: lock ? '#000000' : undefined });
        if (lock) KC.title(g, '?', x + w / 2, y + 12, 2); T(g, lock ? '???' : KC.ROSTER[id].name, x + w / 2 - TW(lock ? '???' : KC.ROSTER[id].name, { font: 'tiny' }) / 2, y + h - 6, '#fff', { font: 'tiny' });
        [0, 1].forEach(i => { if (this.cur[i] === k) { const c = i ? '#ff4a3a' : '#ffffff', pulse = this.done[i] ? 0 : Math.floor(this.t * 6) % 2; px.rect(g, x - 2 - pulse, y - 2 - pulse, w + 4 + pulse * 2, 2, c); px.rect(g, x - 2 - pulse, y + h - pulse, w + 4 + pulse * 2, 2, c); px.rect(g, x - 2 - pulse, y - 2, 2, h + 2, c); px.rect(g, x + w + pulse, y - 2, 2, h + 2, c); T(g, i ? (this.cpu2 ? 'CPU' : '2P') : '1P', x + (i ? w - 12 : 1), y + 1, c, { font: 'tiny' }); } });
      }
      // the big portraits each side: name, style, three stat bars
      [0, 1].forEach(i => { const id = SEL_IDS[this.cur[i]], f = KC.ROSTER[id], x = i ? W - 100 : 8, lock = !KC.isUnlocked(id); this.prev[this.cur[i]].rig.drawPortrait(g, x, 30, 84, { zoom: 3, turn: i ? -.5 : .5, bg: i ? '#5a1410' : '#c8c4bc', frame: true, tint: lock ? '#000000' : undefined });
        T(g, lock ? '???' : f.full, x, 118, i ? '#ff7060' : '#fff6e8', { scale: f.full.length > 9 ? 1 : 2 }); if (!lock) { T(g, f.style, x, 136, '#c8c0e0'); [['WALK', f.stats.walk], ['REACH', f.stats.reach], ['SPEED', f.stats.speed]].forEach(([n, v], k) => { T(g, n, x, 150 + k * 10, '#a8a0c0', { font: 'tiny' }); E.ui.bar(g, x + 34, 150 + k * 10, 50, 4, clamp((v - .8) / .35, 0, 1), i ? '#ff7060' : '#e8e4dc'); }); } });
      if (this.done[0] && this.cpu2 && !this.done[1]) T(g, 'NOW PICK THE CPU', W / 2 - TW('NOW PICK THE CPU') / 2, 28, '#ff8a6a');
      KC.bar(g, [[KC.ok(), 'PICK'], [KC.back(), 'BACK']]);
    });
  }
});
scenes.stageSelect = SC({
  enter() { this.list = KC.FIGHT_STAGES.concat(['random']); this.i = Math.max(0, this.list.indexOf(VS.stage)); this.make(); KC.music('select'); },
  make() { const id = this.list[this.i]; this.stage = new Stage(id === 'random' ? 'stadium' : id); this.stage.enter(); },
  update(dt) {
    this.stage.update(dt); KC.stageCam([{ x: 200 }]); const I = game.input, c = I.clicked && I.clicked(), n = this.list.length;
    let d = 0; if (I.repeat('left', .3, .12)) d = -1; if (I.repeat('right', .3, .12)) d = 1; if (c && c[1] < game.H - 20) { if (c[0] < 60) d = -1; else if (c[0] > game.W - 60) d = 1; else return this.go(); }
    if (d) { this.i = (this.i + d + n) % n; this.make(); KC.sfx('menuMove'); }
    if (I.pressed('confirm')) this.go(); if (I.pressed('cancel')) game.go('select');
  },
  go() { let id = this.list[this.i]; if (id === 'random') id = KC.FIGHT_STAGES[Math.floor(Math.random() * KC.FIGHT_STAGES.length)]; VS.stage = this.list[this.i]; KC.sfx('menuOk');
    const p2human = game.players[1] && VS.p2 === 'human'; game.go('fight', { mode: 'versus', stage: id, white: VS.picks[0], red: VS.picks[1], cpu: [false, !p2human], cpuLevel: VS.level, rounds: VS.rounds, points: VS.points, clock: VS.clock, seed: Math.floor(Math.random() * 1e6) }); },
  draw(r) { this.stage.draw(r); r.overlay(g => { const W = r.W, H = r.H, id = this.list[this.i], nm = id === 'random' ? 'RANDOM' : KC.STAGE[id].name; box(g, W / 2 - 110, 10, 220, 46, { alpha: .85 }); KC.title(g, nm, W / 2, 16, 2); T(g, '← ' + (this.i + 1) + '/' + this.list.length + ' →', W / 2 - 22, 40, '#ffd060'); KC.title(g, '←', 24, H / 2, 3); KC.title(g, '→', W - 24, H / 2, 3); KC.bar(g, [[KC.ok(), 'FIGHT HERE'], [KC.back(), 'BACK']]); }); }
});
scenes.results = SC({
  enter(d) { this.d = d; const e = d.e, w = e.winner; this.f = [new Karateka(d.d.white, 0), new Karateka(d.d.red, 1)]; this.f[w].setPose('win'); this.f[1 - w].setPose('lose'); this.stage = new Stage(d.d.stage); this.stage.enter(); KC.Voice.speak(KC.ROSTER[this.f[w].id].quotes.win, this.f[w].id);
    this.menu = new Menu([{ label: 'REMATCH', fn: () => game.go('fight', Object.assign({}, d.d, { seed: d.d.seed + 1 })) }, { label: 'CHARACTER SELECT', fn: () => game.go('select') }, { label: 'STAGE SELECT', fn: () => game.go('stageSelect') }, { label: 'MAIN MENU', fn: () => { game.allowJoin(false); game.go('title', { menu: true }); } }]); KC.music('select'); },
  update(dt) { this.stage.update(dt); this.f.forEach(f => f.update(dt)); KC.stageCam(this.f); this.menu.update(dt); },
  draw(r) {
    this.stage.draw(r); this.f.forEach(f => f.draw(r));
    r.overlay(g => { const W = r.W, H = r.H, e = this.d.e, w = e.winner, s = e.stats; px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
      KC.title(g, (w ? 'RED' : 'WHITE') + ' WINS ' + e.roundWins[w] + '-' + e.roundWins[1 - w], W / 2, 10, 3, w ? ['#ffe0d8', '#ff7060', '#c02020'] : TITLE_COLS);
      const lines = [['FULL POINTS', s[0].full, s[1].full], ['HALF POINTS', s[0].half, s[1].half], ['BLOCKS', s[0].blocks, s[1].blocks], ['BEST', s[0].best ? KC.TECH[s[0].best].short || KC.TECH[s[0].best].name : '-', s[1].best ? KC.TECH[s[1].best].short || KC.TECH[s[1].best].name : '-']];
      lines.forEach(([n, a, b], k) => { const y = 46 + k * 14; T(g, String(a), W / 2 - 150, y, '#fff6e8'); T(g, n, W / 2 - TW(n) / 2, y, '#ffd060'); T(g, String(b), W / 2 + 150 - TW(String(b)), y, '#ff7060'); });
      this.menu.draw(g, W / 2, 110); KC.bar(g, [[KC.ok(), 'SELECT']]); });
  }
});

/* ---- KACHINUKI (winner stays on): local 3-4 players, and the same rules online (60-online.js) ---- */
const KN_FIGHTERS = ['taro', 'ebi', 'ika', 'asari'];
KC.Kachinuki = {
  /** the rules: a queue in join order; white (queue[0]) vs red (queue[1]); the winner stays, the loser to the back */
  make(n, target) { return { queue: Array.from({ length: n }, (_, i) => i), wins: Array(n).fill(0), streak: 0, best: Array(n).fill(0), full: Array(n).fill(0), half: Array(n).fill(0), blocks: Array(n).fill(0), pts: Array(n).fill(0), conceded: Array(n).fill(0), target: target || 5, champion: -1, fighters: Array.from({ length: n }, (_, i) => KN_FIGHTERS[i % 4]), bouts: 0, holder: -1 }; },
  result(K, wSide) {
    const a = K.queue[0], b = K.queue[1], winner = wSide ? b : a, loser = wSide ? a : b; K.wins[winner]++; K.bouts++;
    K.streak = K.holder === winner ? K.streak + 1 : 1; K.holder = winner; K.best[winner] = Math.max(K.best[winner], K.streak);
    K.queue = [winner].concat(K.queue.filter(p => p !== winner && p !== loser), [loser]);
    if (K.wins[winner] >= K.target) K.champion = winner;
    return winner;
  },
  standings(K, ids) {
    const order = ids.slice().sort((x, y) => K.wins[y] - K.wins[x] || K.pts[y] - K.pts[x] || K.conceded[x] - K.conceded[y]), out = [];
    for (const p of order) { const last = out[out.length - 1], q = last && last[0]; if (last && K.wins[q] === K.wins[p] && K.pts[q] === K.pts[p] && K.conceded[q] === K.conceded[p]) last.push(p); else out.push([p]); }
    return out;
  },
  startLocal() { const n = game.players.length; this.K = this.make(n, 5); this.bout(this.K); },
  bout(K) { const a = K.queue[0], b = K.queue[1]; game.go('fight', { mode: 'kachinuki', kachinuki: K, stage: 'stadium', white: K.fighters[a], red: K.fighters[b], cpu: [false, false], pad: [a, b], rounds: 1, points: 2, names: ['P' + (a + 1), 'P' + (b + 1)], seed: K.bouts + 1, intro: K.bouts === 0 }); },
  boutOver(K, wSide, d) {
    const F = KC.F, B = F && F.bout, a = K.queue[0], b = K.queue[1];
    if (B) { [a, b].forEach((p, i) => { K.full[p] += B.f[i].stats.full; K.half[p] += B.f[i].stats.half; K.blocks[p] += B.f[i].stats.blocks; }); K.pts[a] += B.f[0].stats.full + B.f[0].stats.half * .5; K.pts[b] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[a] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[b] += B.f[0].stats.full + B.f[0].stats.half * .5; }
    this.result(K, wSide);
    if (K.champion >= 0) game.go('knResults', { K }); else this.bout(K);
  }
};
scenes.knResults = SC({
  enter(d) { this.K = d.K; this.menu = new Menu([{ label: 'AGAIN', fn: () => KC.Kachinuki.startLocal() }, { label: 'MAIN MENU', fn: () => { game.allowJoin(false); game.go('title', { menu: true }); } }]); KC.sting('victory'); KC.music('select'); },
  update(dt) { this.menu.update(dt); },
  draw(r) { r.sky(['#1a0a10', '#3a1420']); r.overlay(g => { const W = r.W, K = this.K; KC.title(g, 'P' + (K.champion + 1) + ' IS CHAMPION!', W / 2, 10, 3); KC.Kachinuki.standings(K, K.queue.slice().sort()).forEach((grp, k) => grp.forEach((p, j) => { const y = 44 + (k + j) * 14; T(g, (k + 1) + '. P' + (p + 1) + '  WINS ' + K.wins[p] + '  FULL ' + K.full[p] + '  HALF ' + K.half[p] + '  BEST STREAK ' + K.best[p], 30, y, E.PLAYER_COLORS[p]); })); this.menu.draw(g, W / 2, 120); }); }
});

/* ---- MOVE LIST: one posture row at a time; the four techniques around a big R-stick; R (or a click) previews ---- */
KC.MoveList = {
  active: false, row: 0, sel: null, back: null, t: 0,
  open(from) { if (from === 'dojoMenu' || from === 'title') { game.go('movelist', { back: from }); return; } this.active = true; this.row = 0; this.sel = null; this.t = 0; this.make(); game.input.consumeAll(); },
  make() { this.prev = new Karateka('taro', 0, { x: 200 }); this.phantom = { x: 250 }; },
  close() { this.active = false; game.input.consumeAll(); if (this.back) { const b = this.back; this.back = null; game.go(b); } },
  update(dt) {
    this.t += dt; const I = game.input, P = KC.POSTURES;
    if (I.repeat('up', .3, .12)) { this.row = (this.row + P.length - 1) % P.length; KC.sfx('menuMove'); } if (I.repeat('down', .3, .12)) { this.row = (this.row + 1) % P.length; KC.sfx('menuMove'); }
    const d = I.pressed('tUp') ? 'u' : I.pressed('tDown') ? 'd' : I.pressed('tLeft') ? 'a' : I.pressed('tRight') ? 't' : null;
    const c = I.clicked && I.clicked(); if (c && this.rects) for (const k in this.rects) { const r = this.rects[k]; if (c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]) this.play(k); }
    if (d) this.play(d);
    if (I.pressed('cancel') || I.pressed('pause')) { KC.sfx('menuBack'); this.close(); return; }
    const p = this.prev; p.step(dt, this.phantom, [0, 400]); if (p.st === 'walk' || p.st === 'idle') { p.x = 200; p.st = 'idle'; } if (p.st === 'crouch' && this.crouchT !== undefined) { this.crouchT -= dt; if (this.crouchT < 0) p.st = 'idle'; } p.update(dt);
  },
  play(dir) { const id = KC.MATRIX[KC.POSTURES[this.row][0]][dir]; this.sel = id; const p = this.prev; p.reset(200); p.face = 1; if (id === 'crouch') { p.st = 'crouch'; this.crouchT = 1; } else p.start(id, this.phantom); KC.sfx('menuOk'); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, P = KC.POSTURES[this.row], cx = W / 2 + 60, cy = H / 2 + 6;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#08060e')); KC.title(g, 'MOVE LIST', W / 2, 6, 2);
      KC.POSTURES.forEach((pp, k) => { const y = 40 + k * 26, on = k === this.row; box(g, 8, y, 96, 22, { alpha: on ? .95 : .5, border: on ? '#ffd060' : '#4a4060' }); KC.glyph(g, 14, y + 5, pp[2], 12); T(g, pp[1], 32, y + 7, on ? '#ffd060' : '#c8c0e0'); });
      // the R-stick and the four techniques in their directions
      px.disc(g, cx, cy, 20, '#16141e'); px.disc(g, cx, cy, 18, '#3a3650'); T(g, 'R', cx - 2, cy - 3, '#fff');
      this.rects = {};
      [['u', 0, -46], ['t', 70, 0], ['d', 0, 46], ['a', -70, 0]].forEach(([d, dx, dy]) => {
        const id = KC.MATRIX[P[0]][d], t = KC.TECH[id], nm = t.short || t.name, w = Math.max(70, TW(nm) + 8), x = cx + dx - w / 2, y = cy + dy - 10, on = this.sel === id;
        box(g, x, y, w, 22, { alpha: .9, border: t.pts ? (on ? '#ffd060' : '#a89060') : '#5a6a8a' }); T(g, nm, x + w / 2 - TW(nm) / 2, y + 3, t.pts ? '#fff6d0' : '#a8c8ff'); T(g, t.pts ? t.pts[0] + '-' + t.pts[1] + (t.pts[1] >= 600 ? ' ★FULL' : '') : (t.kind || 'move').toUpperCase(), x + w / 2 - 30, y + 12, '#ffd060', { font: 'tiny' });
        this.rects[d] = [x, y, w, 22];
        const arrow = { u: '↑', t: '→', d: '↓', a: '←' }[d]; T(g, arrow, cx + dx * .32 - 3, cy + dy * .5 - 3, '#ffd060');
      });
      // the live preview
      const bx = 112, by = H - 100; box(g, bx, by, 90, 80, { bg: ['#1a1830', '#0c0a18'] });
      const sv = r.view; this.prev.rig.draw(g, bx + 45, by + 74, sv);
      if (this.sel) { const t = KC.TECH[this.sel]; T(g, t.jp, bx + 4, by + 3, '#a8a0c0', { font: 'tiny' }); }
      KC.bar(g, [[KC.dev() === 'pad' ? 'L:u' : 'key:W', 'POSTURE'], [KC.dev() === 'pad' ? 'R:r' : 'key:L', 'PREVIEW'], [KC.back(), 'CLOSE']]);
    });
  }
};
scenes.movelist = SC({ enter(d) { KC.MoveList.back = d.back === 'title' ? 'title' : d.back; KC.MoveList.active = true; KC.MoveList.make(); KC.MoveList.row = 0; KC.MoveList.sel = null; this.stage = new Stage('dojo'); this.stage.enter(); }, update(dt) { if (!KC.MoveList.active) return; KC.MoveList.update(dt); }, draw(r) { this.stage.draw(r); KC.MoveList.draw(r); } });
