/* ---------- Senpai's drill: watch, then do. It doubles as the tutorial ---------- */
KC.scenes.practice = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; const L = KC.LESSONS[d.lesson || 'ALL']; this.lesson = L; this.stage = new Stage(d.stage || 'dojo'); this.i = 0; this.misses = 0; this.score = 0; this.good = 0; this.state = 'intro'; this.t = 0; this.msg = ''; this.msgT = 0; this.results = [];
    this.me = new Karateka('taro', 0, { belt: KC.Story && KC.Story.s ? KC.BELTS[KC.Story.s.belt].id : 'white' }); this.sen = new Karateka('negi', 1, { belt: 'black1' }); this.me.reset(); this.sen.reset(); this.reader = new Reader(KC.game.input);
    this.talk = null; KC.music('practice'); KC.game.follow(null); this.hist = { crouch: 0 }; this.spoke = false; this.sparring = false; KC.current = this; this.demoT = 0;
    this.say('negi', L.intro);
  },
  say(who, text) { this.line = { who, text, t: 0 }; KC.speakLine(who, text); },
  drill_() { return KC.TECHS[this.lesson.drills[this.i]]; },
  begin(state) { this.state = state; this.t = 0; this.autoFired = false; this.autoHold = 0; this.pressed = null; this.me.endTech(); this.sen.endTech(); this.me.reset(); this.sen.reset(); this.sen.face = -1; this.me.crouching = false; this.senX = this.drill_() && this.drill_().id === 'revPunch' ? 150 + PUSH + 6 : 250; this.sen.x = this.senX; },
  update(dt) {
    KC.devPoll(); if (KC.overlayStep(dt)) return; if (KC.dev.open) { KC.devUpdate(dt, this); this.stage.update(dt); return; } const g = KC.game, I = g.input; this.t += dt; this.msgT -= dt; if (this.line) this.line.t += dt; this.stage.update(dt); g.focus(200, 0, 50);
    const steps = Math.min(4, Math.max(1, Math.round(dt * 120))); const dr = this.drill_();
    if (I.pressed('start') && this.state !== 'done') { I.consumeAll(); this.skip(); return; }
    for (let k = 0; k < steps; k++) {
      let c = this.reader.read(); if (KC.autopilot && this.state === 'now' && this.nowAt > .3 && this.me.state === 'free' && !this.autoFired) { this.autoFired = true; const it = KC.KarateAI.prototype.intentFor.call(null, this.drill_().id, this.me, this.sen); c = { posture: it.posture, tech: it.tech }; if (this.drill_().id === 'jump') c = { posture: 'u', tech: null }; if (this.drill_().id === 'crouch') c = { posture: 'd', tech: null }; this.autoHold = this.drill_().id === 'crouch' ? 40 : 4; this.autoC = c; } else if (KC.autopilot && this.state === 'now' && this.autoHold > 0) { this.autoHold--; c = this.autoC; } const tch = k === 0 ? c.tech : null;
      if (this.state === 'now' || this.state === 'done') this.me.step(this.sen, { posture: c.posture, tech: tch }); else this.me.step(this.sen, null);
      this.sen.step(this.me, null);
      this.sen.face = -1; this.sen.x = this.senX || this.sen.mark; if (this.state !== 'done') { this.me.x = clamp(this.me.x, 40, 330); }
      if (Math.abs(this.sen.x - this.me.x) < PUSH) this.me.x = this.sen.x - PUSH;
    }
    this.me.update(dt, this.sen); this.sen.update(dt, this.me);
    if (this.state === 'intro' && this.t > 1.6) { this.begin('watch'); this.say('negi', 'WATCH.'); }
    else if (this.state === 'watch') {
      if (this.t > .8 && !this.sen.tech && !this.demoed) { this.demoed = true; this.demoT = this.t; const t = dr; this.sen.start(t.id, this.me, t.input[0] === 'n' ? 'n' : 'x', null); if (t.id === 'crouch') this.sen.crouching = true; }
      if (this.demoed && !this.sen.tech && this.t > this.demoT + .3 && !this.sen.crouching || (this.demoed && this.sen.crouching && this.t > this.demoT + 1.2)) { this.demoed = false; this.sen.crouching = false; this.begin('now'); this.say('negi', 'NOW YOU.'); this.nowAt = 0; }
    } else if (this.state === 'now') {
      this.nowAt += dt; const me = this.me;
      let did = null;
      if (me.tech && me.t === 1 && me.lastTech) did = me.lastTech;
      if (dr.id === 'crouch') { if (me.crouching) { this.hist.crouch += dt; } else this.hist.crouch = 0; if (this.hist.crouch > .25) did = 'crouch'; }
      if (did) { if (did === dr.id) this.success(); else this.fail(); }
      else if (this.nowAt > 4) this.fail(true);
      if (this.state === 'now' && me.state === 'free' && this.nowAt > 4.2) this.fail(true);
    } else if (this.state === 'result') {
      if (this.t > 1.4) { this.i++; if (this.i >= this.lesson.drills.length) this.finish(); else { this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); this.misses = 0; } }
    } else if (this.state === 'wait') {
      if (this.t > 1.3) { this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); }
    } else if (this.state === 'done') { if (this.t > 2.5 && (I.pressed('confirm') || I.clicked())) { I.consumeAll(); this.leave(); } }
    // free movement is locked during watch; clean up
    if (this.state === 'watch') { this.me.x = this.me.mark; }
  },
  success() { const sharp = this.nowAt < 50 / 60 * 1.0 + 0; const pts = sharp ? 400 : 200; this.score += pts; this.good++; this.msg = sharp ? 'SHARP! +' + pts : 'GOOD! +' + pts; this.msgT = 1.3; this.results.push(sharp); KC.sfx('good'); this.state = 'result'; this.t = 0; this.say('negi', sharp ? 'SHARP!' : 'GOOD!'); KC.game.particles.glints(this.me.x, 0, 40, 8, '#ffe070'); },
  fail(timeout) { this.misses++; this.msg = 'NO. WATCH AGAIN.'; this.msgT = 1.3; KC.sfx('bad'); this.state = 'wait'; this.t = 0; this.say('negi', 'NO. WATCH AGAIN.'); },
  skip() { this.i++; this.misses = 0; if (this.i >= this.lesson.drills.length) { this.finish(); return; } this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); },
  finish() {
    this.state = 'done'; this.t = 0; this.senX = 250; this.me.endTech(); this.me.reset(); this.sen.reset(); this.sen.face = -1; KC.sting('victory'); this.say('negi', this.lesson.outro);
    if (this.d.story && KC.Story.s) { KC.Story.s.score += this.score; }
  },
  leave() { if (this.d.story) { KC.Story.s.node++; KC.save.write(KC.Story.s); KC.game.go('road'); } else KC.game.go('dojoMenu'); },
  draw(r) {
    this.stage.draw(r); this.me.draw(r); this.sen.draw(r);
    const dr = this.drill_();
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2;
      KC.panel(g, cx - 120, 6, 240, 46, { alpha: .75 });
      if (this.state === 'done') { KC.title(g, 'LESSON COMPLETE', cx, 12, 2); KC.text(g, this.good + '/' + this.lesson.drills.length + '   +' + this.score + ' POINTS', cx, 36, '#ffe8a0', { align: 'center' }); }
      else {
        KC.text(g, this.lesson.title + '-' + (this.i + 1) + ': ' + dr.name, cx, 10, '#ffd060', { align: 'center' });
        const w = KC.glyphTech(g, dr.id, Math.round(cx - 20), 22, {}); KC.text(g, KC.promptText(dr.id), cx, 40, '#cfc8e8', { align: 'center' });
        const lab = this.state === 'watch' ? 'WATCH.' : this.state === 'now' ? 'NOW YOU.' : this.msg; if (this.state === 'watch' || this.state === 'now') E.font.title(g, lab, cx, Math.round(H * .3), { scale: 2, align: 'center', colors: GOLD, depth: 2 });
      }
      if (this.msgT > 0) E.font.title(g, this.msg, cx, Math.round(H * .3), { scale: 2, align: 'center', colors: this.msg.startsWith('NO') ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 2 });
      if (this.misses >= 3 && this.state !== 'done') KC.text(g, 'HINT: ' + KC.promptText(dr.id) + (dr.input[0] === 'n' ? '' : ' (LEFT STICK FIRST)'), cx, H - 40, '#9ad8ff', { align: 'center' });
      if (this.line && this.line.t < 3) KC.text(g, 'NEGI: "' + this.line.text + '"', cx, H - 30, '#fff6d0', { align: 'center' });
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8');
    });
    KC.promptBar(r, this.state === 'done' ? [['confirm', 'NEXT']] : [['start', 'SKIP DRILL']]); if (KC.dev.open) KC.drawDev(r, this); KC.overlayDraw(r);
  }
};
