// body check, evening recap, Tare's recalibration
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const DIRS = [[0, .6, 'forward'], [.6, 0, 'right'], [0, -.6, 'back'], [-.6, 0, 'left']];
G.drawFlower = (g, x, y, rad) => { const cols = ['#7fe3b8', '#8fd3f4', '#ff9f86', '#f5c842']; G.DISCIPLINES.forEach((d, i) => { const a = -Math.PI / 2 + i * Math.PI / 2, v = Math.max(.15, G.discScore(d) / 100), pr = rad * (.35 + .65 * v); px.disc(g, x + Math.cos(a) * rad * .55, y + Math.sin(a) * rad * .55, pr * .55, cols[i]); px.disc(g, x + Math.cos(a) * rad * .55, y + Math.sin(a) * rad * .55, pr * .3, E.mix(cols[i], '#ffffff', .5)); }); px.disc(g, x, y, rad * .22, '#f5b700'); };
G.drawSpineGraph = (g, x, y, w, h) => { const hist = G.S.spine.slice(-8); if (!hist.length) return; const lo = 15, hi = 75; px.rect(g, x, y + h, w, 1, '#c8dde2'); let prev = null; hist.forEach((a, i) => { const px0 = x + (hist.length === 1 ? w / 2 : i * w / (hist.length - 1)), py = y + h * (1 - (hi - a) / (hi - lo) * -1 - 0) * 0 + h * (a - lo) / (hi - lo); if (prev) px.line(g, prev[0], prev[1], px0, py, C.ACC, 1); px.disc(g, px0, py, 3, i === hist.length - 1 ? C.CORAL : C.ACC); prev = [px0, py]; }); };
G.scenes.bodycheck = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    d = d || {}; this.t = 0; this.st = 'hop'; this.st0 = 0; this.bot = d.bot ? new G.Bot(d.bot, E.rng(9)) : G.devFlags.bot ? new G.Bot(G.devFlags.bot, E.rng(9)) : null; this.attract = !!d.attract; this.short = G.S.day >= 5 || !!d.short; G.game.lights.enabled = true; G.game.lights.ambient = .95;
    this.bal = new G.Balance(Object.assign({}, G.SETS.body, { R: .2 }), E.rng(G.S.day * 13 + 5)); this.it = G.newIntent(); this.fig = G.playerFigure({ x: 0, y: 6, tgt: 1.57 }); this.fig.rig.o.size = 2.0; this.fig.set('Idle_Subtle'); this.tare = G.tare = new G.Tare(); this.tare.face = 'neutral';
    G.song('studio'); this.still = 0; this.dirI = 0; this.hold = 0; this.dirT = 0; this.leanOk = 0; this.pills = null; this.ages = null; this.said = false; G.cap = null; this.fig.y = -30; this.hopT = 0; this.ageT = 0; this.ducks = 0;
    G.caption(G.line(G.LINES.tare.hello), 'Tare', 3.6); this.hopped = false; this.tare.face = 'happy';
  },
  to(s) { this.st = s; this.st0 = this.t; },
  update(dt) {
    const input = G.game.input; this.t += dt; const tt = this.t - this.st0; G.tick(dt); this.tare.update(dt); this.fig.update(dt); G.talk && G.talk.update(dt);
    const bal = this.bal; this.tare.talk = G.cap ? .2 : 0;
    if (this.attract) { this.attractT = (this.attractT || 0) + dt; }
    const lean = () => { if (this.bot) { const u = this.bot.lean(bal, dt); this.it.ux = u.x; this.it.uy = u.y; } else G.readHuman(input, this.it, dt); bal.u.x = this.it.ux; bal.u.y = this.it.uy; bal.step(dt); this.fig.rig.wob = [bal.p.x * .5, bal.p.y * .5]; };
    if (this.st === 'hop') {
      this.hopT += dt; const k = G.clamp(this.hopT / 1.2, 0, 1); this.fig.y = G.lerp(-30, 6, k); this.fig.z = Math.sin(Math.PI * k) * 14; if (k >= 1 && !this.hopped) { this.hopped = true; this.tare.jump(40); G.snd('boop'); this.fig.z = 0; }
      if (this.hopT > 2.2) { this.bal.center = [0, 0]; this.to('still'); G.caption(G.line(G.LINES.tare.still), 'Tare', 3); }
    } else if (this.st === 'still') {
      lean(); bal.R; if (bal.inRing) this.still += dt; if (tt >= 5) { this.stillScore = this.still / 5; if (this.short) { this.to('reading'); this.prepReading(); } else { this.to('lean'); this.dirI = 0; this.dirT = 0; this.hold = 0; bal.center = [DIRS[0][0], DIRS[0][1]]; G.caption('Lean ' + DIRS[0][2] + '. Hold it for a second.', 'Tare', 3); } }
    } else if (this.st === 'lean') {
      lean(); this.dirT += dt; if (bal.inRing) this.hold += dt; else this.hold = Math.max(0, this.hold - dt * .5);
      if (this.hold >= 1 || this.dirT > 6) { if (this.hold >= 1) { this.leanOk++; G.snd('chime'); } this.dirI++; this.hold = 0; this.dirT = 0; if (this.dirI >= 4) { this.to('question'); bal.center = [0, 0]; this.qi = (G.S.day * 3 + 1) % G.LINES.questions.length; const q = G.LINES.questions[this.qi]; this.pills = new G.Pills([{ label: q[1] }, { label: q[2] }], { w: 120, y: 120, h: 17, cancel: false }); G.caption(q[0], 'Tare', 6); this.qAnswered = false; } else { bal.center = [DIRS[this.dirI][0], DIRS[this.dirI][1]]; G.caption('Now ' + DIRS[this.dirI][2] + '.', 'Tare', 2); } }
    } else if (this.st === 'question') {
      lean(); const r = this.bot ? (tt > 1.2 ? { pick: 0 } : null) : this.pills.update(dt, input); if (r && r.pick != null && !this.qAnswered) { this.qAnswered = true; G.caption(G.LINES.questions[this.qi][3], 'Tare', 4); this.qt = this.t; } if (this.qAnswered && this.t - this.qt > 2.4) { this.to('reading'); this.prepReading(); }
    } else if (this.st === 'reading') {
      lean(); if (tt > 2.2 && !this.said) { this.said = true; G.caption(G.tareSay('reading', { n: this.ducks.toFixed(1) }), 'Tare', 4.5); } if (tt > 5.6 || (tt > 1 && input.pressed('confirm') && this.said)) { this.to('age'); this.ageT = 0; this.sayAge(); }
    } else if (this.st === 'age') {
      this.ageT += dt; if (tt > 1.5 && (input.pressed('confirm') || (input.clicked && input.clicked()) || (this.bot && tt > 4.5))) this.finish();
      if (!this.attract && !this.bot && tt > 40) this.finish();
    }
  },
  prepReading() { const S = G.S; this.ducks = 10.2 + ((S.day * 7 + Math.round(this.stillScore * 10)) % 29) / 10; this.said = false; },
  sayAge() { const A = G.checkAge(), S = G.S; S.suggestion = G.suggestFor(S.day); this.A = A; let key = A.shown < A.prev ? 'age' : A.shown > A.prev ? 'ageUp' : (S.day === 3 ? 'held' : 'ageSame'); if (S.day === 3) key = 'held'; if (S.day === 4) key = 'drop'; if (S.day === 1) key = 'age'; this.remark = G.tareSay(key === 'drop' ? 'drop' : key, { n: A.shown }); if (S.day === 3) this.remark = G.tareSay('held', { n: A.shown }) + ' ' + G.tareSay('plateau'); if (S.day === 1) this.remark = 'Your Spine Age is 71. That is the number the card was written for. It is not a judgment. It is a number.'; G.cap = null; G.caption(this.remark.slice(0, 120), 'Tare', 6); },
  finish() { const S = G.S; if (this.attract) { G.game.go(this.attract); return; } S.checked = true; G.saveNow(); if (S.day === 1 && !S.sessLog.includes('guided')) { S.sessLog.push('guided'); G.lastActData = { mode: 'story', tier: 1, guided: true, day: 1 }; G.game.go('act_stork', Object.assign({}, G.lastActData)); } else if (S.day === 4 && !S.recalDone) G.game.go('recal'); else if (S.day === 5 && !S.gamesDone && !S.free) G.game.go('games'); else G.game.go('island', { from: 'bungalow' }); },
  draw(r) {
    G.game.focus(0, 0, 18); G.rooms.reception(r, this.t); const W = r.W, H = r.H, tt = this.t - this.st0;
    r.actor(0, 12, 0, (g, ox, oy) => this.tare.draw(g, ox, oy, 2.0, this.tare.face));
    r.actor(this.fig.x, this.fig.y + 6, this.fig.z + (this.st === 'hop' ? 0 : 24), (g, ox, oy) => this.fig.rig.draw(g, ox, oy, r.view));
    const bal = this.bal;
    if (this.st === 'still' || this.st === 'lean') { G.drawPlate(r, bal, W / 2, H - 34, 26); r.overlay(g => { const lab = this.st === 'still' ? 'Stillness Test' : 'Lean Test'; G.txt(g, lab, W / 2, 12, C.ACC2, { align: 'center', scale: 2 }); if (this.st === 'still') G.txt(g, Math.ceil(5 - tt) + '', W / 2, 30, C.INK, { align: 'center', scale: 2 }); else { px.rect(g, W / 2 - 30, 32, 60, 4, '#c8dde2'); px.rect(g, W / 2 - 30, 32, 60 * G.clamp(this.hold, 0, 1), 4, C.ACC); G.txt(g, (this.dirI + 1) + ' / 4', W / 2, 40, C.MUTED, { align: 'center' }); } }); G.prompt(r, [['@' + G.leanLabel(), 'Lean']]); }
    if (this.st === 'question') this.pills.draw(r);
    if (this.st === 'reading') r.overlay(g => { G.rr(g, W / 2 - 70, 24, 140, 52, C.WHITE); G.txt(g, 'Reading', W / 2, 30, C.MUTED, { align: 'center' }); G.txt(g, tt > 1.4 ? this.ducks.toFixed(1) + ' ducks' : '...', W / 2, 46, C.ACC2, { align: 'center', scale: 3 }); });
    if (this.st === 'age' && this.A) r.overlay(g => { const k = G.clamp(this.ageT * 1.6, 0, 1), shown = Math.round(G.lerp(this.A.prev + (this.A.prev - this.A.shown > 0 ? 0 : 0), this.A.shown, G.S.day === 4 ? G.ease ? k : k : 1)); G.rr(g, W / 2 - 130, 14, 260, 104, 'rgba(32,64,76,.18)'); G.rr(g, W / 2 - 130, 12, 260, 104, C.ACC); G.rr(g, W / 2 - 129, 13, 258, 102, C.WHITE);
      G.txt(g, 'Spine Age', W / 2, 18, C.MUTED, { align: 'center' }); G.bigNum(g, G.S.day === 4 ? Math.round(G.lerp(this.A.prev, this.A.shown, 1 - Math.pow(1 - k, 3))) : this.A.shown, W / 2 - 60, 34, 5, C.ACC2); G.drawSpineGraph(g, W / 2 + 6, 36, 100, 46); G.drawFlower(g, W / 2 - 60, 94, 12); G.txt(g, 'Day ' + G.S.day + '  ·  Gertrude is 19', W / 2 + 56, 90, C.MUTED, { align: 'center' });
      const sa = G.acts[G.S.suggestion]; if (sa && !this.short) G.txt(g, "Tare's Suggestion: " + sa.name, W / 2 + 6, 102, C.CORAL, { align: 'center' }); });
    G.prompt(r, this.st === 'age' ? [['confirm', 'Continue']] : []); if (this.st === 'age') G.drawCaption(r, H - 40); else G.drawCaption(r, H - 96, 130);
  }
};
// the evening: recap and bed
G.scenes.evening = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    this.t = 0; this.fig = G.playerFigure({ x: -40, y: 8, tgt: 1.4 }); this.fig.rig.o.size = 2; this.fig.set('Waiting_Loop'); G.game.lights.enabled = true; G.game.lights.ambient = .62; G.song('islandPM'); this.tare = G.tare = new G.Tare(); this.tare.face = 'sad'; this.stage = 'recap'; this.said = false; this.autoD = d && d.auto;
    G.cap = null; G.caption(G.S.early ? G.line(G.LINES.tare.early) : G.line(G.LINES.tare.gerald), 'Tare', 5); G.S.early = false; G.jingle('dayDone');
  },
  update(dt) { this.t += dt; G.tick(dt); this.tare.update(dt); this.fig.update(dt); G.gerald.update(dt); if (this.t > 6 && !this.tipSaid && this.stage === 'recap' && G.game.settings.tips !== false) { this.tipSaid = true; G.caption(G.line(G.LINES.tare.tips), 'Tare', 5); } if (this.t > .8 && !this.said) { this.said = true; for (let i = 0; i < 3; i++) setTimeout(() => G.gerald.drop(), i * 200); G.snd('clink'); G.gerald.clink(); }
    if (this.stage === 'recap' && this.t > 2 && (G.game.input.pressed('confirm') || (G.game.input.clicked && G.game.input.clicked()) || (this.autoD && this.t > 4))) { this.stage = 'night'; this.t2 = this.t; G.cap = null; G.caption(G.tareSay('night'), 'Tare', 4); const S = G.S; S.day++; S.done = 0; S.pauses = 0; S.checked = false; S.briefed = 0; S.suggestion = G.suggestFor(S.day); S.recalDone = S.recalDone; G.saveNow(); }
    if (this.stage === 'night' && this.t - this.t2 > 3.2) G.game.go('bungalow'); },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.bungalow(r, this.t); const W = r.W, S = G.S; this.fig.draw(r); const tp = r.w(30, 14, 0); r.overlay(g => { this.tare.draw(g, tp[0], tp[1], 1.3, this.stage === 'night' ? 'asleep' : 'sad'); G.rr(g, W / 2 - 110, 14, 220, 80, C.WHITE); G.txt(g, 'Evening', W / 2, 18, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, 'Day ' + Math.min(5, S.day) + ' done  ·  ' + S.done + ' of 3 sessions', W / 2, 38, C.INK, { align: 'center' }); G.gerald.draw(g, W / 2 - 56, 84, 1.4); G.txt(g, S.minutes.toFixed(1) + ' minutes in Gerald', W / 2 + 20, 56, C.ACC2, { align: 'center' }); G.drawSpineGraph(g, W / 2 + 4, 66, 90, 18); if (this.stage === 'night') { px.blend(g, G.clamp((this.t - this.t2) / 1.5, 0, 1) * .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0b1a2a')); } }); G.prompt(r, [['confirm', 'Sleep']]); G.drawCaption(r, r.H - 58); }
};
// day 4: Tare's recalibration
G.scenes.recal = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.t = 0; this.stage = 'intro'; this.fig = G.playerFigure({ x: -50, y: 8, tgt: 1.3 }); this.fig.rig.o.size = 2; this.fig.set('Idle_Subtle'); this.tare = G.tare = new G.Tare(); this.tare.face = 'worried'; G.game.lights.enabled = false; G.song('studio'); this.needle = 0; G.cap = null; G.caption("Today I am recalibrating. I will use the old scale. It is the one I was before.", 'Tare', 5); this.readT = 0; },
  update(dt) { this.t += dt; G.tick(dt); this.tare.update(dt); this.fig.update(dt); const input = G.game.input;
    if (this.stage === 'intro' && this.t > 5.5) { this.stage = 'press'; G.cap = null; G.caption('Please press ' + G.keyLabel(input, 'confirm') + ' to read the dial.', 'Tare', 8); }
    if (this.stage === 'press' && (input.pressed('confirm') || (input.clicked && input.clicked()) || this.t > 40)) { this.stage = 'read'; this.readT = 0; G.snd('creak'); }
    if (this.stage === 'read') { this.readT += dt; this.needle = this.readT < 2 ? Math.sin(this.readT * 14) * (1 - this.readT / 2) * .9 + .1 : .05; if (this.readT > 2.2 && !this.said) { this.said = true; this.tare.face = 'happy'; G.cap = null; G.caption(G.tareSay('recal'), 'Tare', 5); G.snd('bell'); } if (this.readT > 7) { G.S.recalDone = true; G.saveNow(); G.game.go('island', { from: 'bungalow' }); } } },
  draw(r) { G.game.focus(0, 0, 18); G.rooms.reception(r, this.t); const W = r.W; this.fig.draw(r); const p = r.w(24, 10, 0); r.overlay(g => { px.ell(g, p[0], p[1] + 2, 44, 10, 'rgba(32,64,76,.2)'); px.rect(g, p[0] - 40, p[1] - 24, 80, 24, '#8a6a44'); px.rect(g, p[0] - 40, p[1] - 28, 80, 5, '#b58c58'); px.rect(g, p[0] - 38, p[1] - 6, 6, 8, '#555'); px.rect(g, p[0] + 32, p[1] - 6, 6, 8, '#555'); px.disc(g, p[0], p[1] - 50, 26, '#f4efe0'); px.disc(g, p[0], p[1] - 50, 22, '#fffdf4'); for (let i = 0; i < 12; i++) { const a = -Math.PI + i * Math.PI / 11; px.line(g, p[0] + Math.cos(a) * 18, p[1] - 50 + Math.sin(a) * 18, p[0] + Math.cos(a) * 21, p[1] - 50 + Math.sin(a) * 21, '#444', 1); } const a = -Math.PI / 2 + this.needle; px.line(g, p[0], p[1] - 50, p[0] + Math.cos(a) * 18, p[1] - 50 + Math.sin(a) * 18, '#c0392b', 2); px.disc(g, p[0], p[1] - 50, 2, '#444');
    this.tare.draw(g, p[0] + 70, p[1] - 2, 1.6, this.tare.face); if (this.stage === 'read' && this.readT > 2.2) G.txt(g, '3 grams', p[0], p[1] - 90, C.ACC2, { align: 'center', scale: 2 }); }); if (this.stage === 'press') G.prompt(r, [['confirm', 'Read the dial']]); G.drawCaption(r, r.H - 58); }
};
})();
