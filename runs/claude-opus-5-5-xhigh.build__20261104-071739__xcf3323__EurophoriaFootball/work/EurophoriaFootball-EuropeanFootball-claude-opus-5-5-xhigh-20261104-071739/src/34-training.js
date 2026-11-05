/* TRAINING (section 6.25): the drill list (nine drills, each with a tick), and the drill runner on the match scene: the
 * coach explains each step in a short dialog, the drill runs on the Rec with a counter, success plays a fanfare and
 * the next step; the last step completes the drill (saved). */
EF.scenes.training = front({ music: 'training', stadium: 'rec', dim: .45,
  enter(d) {
    this.back = d.back || null; const sv = EF.Save.data();
    EF.UI.set([{ id: 'drills', focus: d.focus || 0, widgets: EF.DRILLS.map((id, i) => { const D = EF.get('drill', id); return { id, kind: 'tile', title: (i + 1) + '. ' + D.title, text: D.teaches, badge: sv.drills[id] ? 'DONE ✓'.replace('✓', '') + '★' : '', icon: EF.icon(['boot', 'ball', 'pens', 'boot', 'ball', 'whistle', 'pens', 'cup', 'whistle'][i]), onPick: () => EF.startDrill(id, this.back) }; }),
      layout(r) { const cw = Math.min(132, Math.floor((r.W - 24) / 3) - 6), ch = Math.min(56, Math.floor((r.H - 80) / 3) - 6); EF.UI.grid(this.widgets, 0, 34, r.W, r.H - 60, 3, cw, ch, 6); },
      draw: (g, r) => EF.UI.panel(g, r, 'TRAINING', Object.keys(sv.drills).length + ' OF 9 DRILLS DONE'), footer: () => [['confirm', 'START'], ['cancel', 'BACK']],
      onBack: () => { if (this.back) game.go(this.back.scene, this.back.data); else game.go('title', { menu: true, focus: 3 }); } }]);
  }
});
EF.startDrill = (id, back) => {
  game.go('match', { opts: { home: 'kipperton', away: 'reserves', stadium: 'rec', kind: 'training', seed: 11, halfLength: 999, noReplay: true, humans: [{ input: game.input, side: 0 }], cheats: { freezeClock: true }, draws: 'allowed', noVar: true },
    drill: id, back, label: 'TRAINING', onEnd: () => {} });
};
class DrillRunner {
  constructor(cur, id, back) {
    this.cur = cur; this.m = cur.m; this.id = id; this.def = EF.get('drill', id); this.back = back; this.run = { step: 0, count: 0, of: 0 }; this.phase = 'say'; this.t = 0;
    this.talk = new E.Dialog(game, { lines: 3, speed: 34, border: '#ffc83a', bg: '#0d1430' });
    const m = this.m; m.cheats.freezeClock = true; m.eventOn = false; m.o.noReplay = true;
    m.script = (f, dt) => this.def.script ? this.def.script(m, f, this.run) : null;
    m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
    try { this.def.setup(m, this.run); } catch (e) { game.fail('drill setup ' + id, e); }
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
    this.begin();
  }
  dispose() { if (this.unsub) this.unsub(); }
  get st() { return this.def.steps[this.run.step]; }
  say(lines, done) { const who = this.def.coach; this.talk.say(lines, { name: EF.Cast.name(who), portrait: EF.Cast.rig(who === 'okafor' ? 'kipperton:okafor' : who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), onDone: done }); }
  begin() {
    const st = this.st, run = this.run; run.count = 0; run.of = st.goal ? st.goal.count : 0; this.phase = 'say';
    try { if (st.setup) st.setup(this.m, run); else if (run.reset) run.reset(this.run.step === 0); } catch (e) { game.fail('drill step', e); }
    this.say(st.say, () => { this.phase = 'run'; this.t = 0; game.input.consumeAll(); });
  }
  on(ev) {
    if (this.phase !== 'run') return;
    const st = this.st, g = st.goal;
    if (st.fail && ev.type === st.fail.event && st.fail.where(ev)) { this.run.count = 0; EF.toast('NO FOULS! START AGAIN', { sound: 'buzz' }); return; }
    if (g && ev.type === g.event && safeWhen(() => g.where(ev, this.m, this.run), null, null)) { this.run.count++; EF.sfx('coin'); if (this.run.count >= g.count) this.stepDone(); }
  }
  stepDone() {
    this.phase = 'done'; EF.sfx('perfect'); EF.toast('NICE ONE!', { sound: null }); this.run.step++;
    if (this.run.step >= this.def.steps.length) { EF.Save.drill(this.id); EF.music('victory'); const last = this.def.steps[this.def.steps.length - 1]; this.say([last.done || 'That is the drill done. Champion stuff.'], () => this.exit(true)); return; }
    this.m.ballClearT = 0; game.after(.8, () => this.begin());
  }
  exit() { const b = this.back; game.go('training', { focus: EF.DRILLS.indexOf(this.id), back: b }); }
  /** true while the coach talks (the match waits) */
  update(dt) {
    this.t += dt;
    if (this.talk.open) { this.talk.update(dt); return true; }
    if (this.phase !== 'run') return false;
    const m = this.m, st = this.st, run = this.run;
    if (st.test && safeWhen(() => st.test(m, run), null, null)) return this.stepDone(), false;
    if (this.def.tick) this.def.tick(m, run, dt);
    // a goal or the ball out: reset the drill's situation rather than restart a match
    const resetNeeded = (m.mode === 'goal' && m.modeT > 1) || m.mode === 'celebrate' || m.mode === 'card' || ((m.mode === 'setpiece' || m.mode === 'kickoff') && !st.retry && m.setpiece && (m.setpiece.kind === 'goalkick' || m.setpiece.kind === 'throwback' || m.setpiece.kind === 'kickoff' || (m.setpiece.kind === 'corner' && this.id !== 'setpieces') || (m.setpiece.kind === 'freekick' && this.id === 'theatrics')));
    if (resetNeeded) { m.endCelebration(); m.setpiece = null; m.setMode('play'); m.pendingCards = []; for (const f of m.players) { f.order = null; f.frozen = false; f.setState('run'); f.tilt = null; } if (st.retry) st.retry(m, run); else if (run.reset) run.reset(this.def.id === 'air'); }
    else if (st.retry && m.mode === 'play' && !m.owner && m.ball.speed() < 5 && !m.ball.held && (this.idle = (this.idle || 0) + dt) > 2.5) { this.idle = 0; st.retry(m, run); }
    else if (m.mode === 'play' && !m.owner && m.ball.speed() < 3 && !st.retry && run.reset && (this.idle = (this.idle || 0) + dt) > 3) { this.idle = 0; run.reset(this.def.id === 'air'); }
    if (m.owner) this.idle = 0;
    if (st.skippable && game.input.pressed('through')) this.stepDone();
    return false;
  }
  draw(r) {
    const st = this.st;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), w = Math.min(r.W - 2 * mx, 300), x = Math.round(r.W / 2 - w / 2);
      E.ui.box(g, x, my, w, 30, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
      E.font.text(g, 'DRILL ' + this.def.n + ': ' + this.def.title, r.W / 2, my + 4, '#ffc83a', { align: 'center', outline: false });
      if (st) { const of = this.run.of, c = this.run.count; E.font.text(g, 'STEP ' + (this.run.step + 1) + '/' + this.def.steps.length + (of ? '   ' + Math.min(c, of) + ' / ' + of : '') + (st.hint ? '   ' + st.hint : ''), r.W / 2, my + 17, '#ffffff', { align: 'center', font: (st.hint || '').length > 20 ? 'tiny' : 'normal', outline: false }); if (st.skippable) EF.prompts(g, r.W / 2, my + 34, [['through', 'SKIP BONUS']], { input: game.input }); }
    });
    if (this.run.cones) for (const c of this.run.cones) r.queue(c.x, c.y, 0, g => { const p = r.w(c.x, c.y, 0); px.poly(g, [[p[0], p[1] - 9], [p[0] + 4, p[1]], [p[0] - 4, p[1]]], c.hit ? '#7aff9a' : '#ff7a1a'); px.rect(g, p[0] - 2, p[1] - 5, 4, 1, '#ffffff'); });
    this.talk.draw(r);
  }
}
EF.DrillRunner = DrillRunner;
/* the match scene runs a drill when it is given one */
const _mEnter = EF.scenes.match.enter, _mUpdate = EF.scenes.match.update, _mDraw = EF.scenes.match.draw, _mExit = EF.scenes.match.exit;
EF.scenes.match.enter = function (d) { _mEnter.call(this, d); if (d && d.drill && EF.cur) EF.cur.drill = new DrillRunner(EF.cur, d.drill, d.back); };
EF.scenes.match.update = function (dt) { const c = EF.cur; if (c && c.drill && c.drill.update(dt)) { c.view.update(dt * 0, c.src); EF.Camera.update(dt, c.m, c.src); return; } _mUpdate.call(this, dt); };
EF.scenes.match.draw = function (r) { _mDraw.call(this, r); const c = EF.cur; if (c && c.drill) c.drill.draw(r); EF.drawToasts(r, 1 / 60); };
EF.scenes.match.exit = function () { const c = EF.cur; if (c && c.drill) c.drill.dispose(); _mExit.call(this); };
