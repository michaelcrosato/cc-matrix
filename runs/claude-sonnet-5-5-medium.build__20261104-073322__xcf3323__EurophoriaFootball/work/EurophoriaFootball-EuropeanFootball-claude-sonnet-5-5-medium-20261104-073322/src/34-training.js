/* ============ 34-training: nine drills on the Rec, each a short list of steps counted from match events ============ */
EF.DRILL_CFG = {
  move: { dummies: 1, cones: [[300, 220], [420, 330], [540, 220], [640, 320]], eu: 1 }, passing: { dummies: 1, eu: 1 }, shooting: { dummies: 1, eu: 1 }, air: { dummies: 1, eu: 1 }, skills: { dummies: 1, eu: 1 },
  defending: { dummies: 0, live: true, ai: .7 }, setpieces: { dummies: 1, sp: ['penalty', 'freekick', 'corner'] }, euphoria: { dummies: 1, euCheat: 6 }, theatrics: { dummies: 0, live: true, ai: .6 }
};
EF.scenes.training = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter(d) {
    EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); this.back = d && d.back; const sv = EF.Save.load(); sv.drills = sv.drills || {};
    const items = EF.all('drill').sort((a, b) => a.n - b.n).map(dr => ({ label: dr.n + '. ' + dr.title, sub: sv.drills[dr.id] ? 'DONE' : '', hint: dr.teaches, onPick: () => this.start(dr.id) }));
    items.push({ label: this.back === 'cup' ? 'BACK TO THE CUP' : 'BACK', onPick: () => game.go(this.back === 'cup' ? 'cup' : 'title', this.back === 'cup' ? { resume: true } : undefined) });
    this.menu = new UI.Menu(items, { y: 40, w: 250, h: 17, scale: 1, onCancel: () => game.go(this.back === 'cup' ? 'cup' : 'title', this.back === 'cup' ? { resume: true } : undefined) });
  },
  start(id) { EF.startDrill(id, this.back); },
  update(dt) { EF.idleStep(dt, 'training'); this.menu.update(dt); },
  draw(r) { UI.stadiumBg(r, game.time); r.overlay(g => { E.font.title(g, 'TRAINING', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); }); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'START DRILL'], ['cancel', 'BACK']])); }
};
EF.startDrill = (id, back) => {
  const dr = EF.get('drill', id), cfg = EF.DRILL_CFG[id] || {}, C = {}; let si = 0, doneT = 0, finished = false, spT = 0, menu = null, offs = [], conesHit = {}, lastSP = 0;
  const bump = k => { C[k] = (C[k] || 0) + 1; };
  const d = { mode: 'training', home: 'kip', away: 'dummies', stadium: 'rec', ref: 'patience', humans: [{ idx: 0, side: 0 }], noResults: true, noReplay: true, noEvents: true, quickKick: true, seed: 5 + dr.n, quiet: true, noMusic: false, music: 'rec',
    rules: { training: true, euphoria: true, noExtra: true, advantage: false }, dummies: cfg.dummies === 1 ? 1 : undefined, aiSpeed: cfg.ai || 1,
    cheat: cfg.euCheat ? { euphoria: cfg.euCheat } : cfg.eu ? { euphoria: 1.5 } : null,
    onSetup(M, sc) {
      const on = (t, fn) => offs.push(EF.bus.on(t, e => { if (e.match === M) fn(e); }));
      on('passDone', e => { if (e.side === 0) bump('passes'); }); on('pass', e => { if (e.side === 0 && e.through) bump('throughs'); }); on('oneTwo', e => bump('onetwos'));
      on('goal', e => { if (e.side === 0) { bump('onTarget'); if (M.penaltyLive || e.pen) bump('penGoals'); if (e.fk) bump('fkGoals'); if (e.sup) bump('supers'); if (M.lastSP === 'corner') bump('cornerGoals'); } }); on('save', e => { if (e.side === 1 && !e.shootout) bump('onTarget'); });
      on('shot', e => { if (e.side === 0 && e.power > .85) bump('screamers'); }); on('lob', e => { if (e.side === 0 && Math.abs(e.x - Pitch.X1) < 190) bump('chips'); if (e.side === 0) bump('lobs'); });
      on('header', e => { if (e.side === 0) bump('headers'); }); on('volley', e => { if (e.side === 0) bump('volleys'); }); on('skill', e => { if (e.side === 0 && e.move === 'stepover') bump('stepovers'); }); on('nutmeg', e => { if (e.side === 0) bump('nutmegs'); }); on('rainbow', e => { if (e.side === 0) bump('rainbows'); });
      on('tackleWon', e => { if (e.side === 0) bump('tackles'); }); on('switch', e => bump('switches')); on('intercept', e => { if (e.side === 0) bump('intercepts'); });
      on('euphoriaFull', e => { if (e.side === 0) bump('euFull'); }); on('europhoria', e => { if (e.side === 0) bump('europhorias'); }); on('superStrike', e => { if (e.side === 0) bump('superShots'); });
      on('diveWon', e => bump('diveWins')); on('diveBooked', e => bump('diveBooked')); on('setPieceTaken', e => { M.lastSP = e.type; lastSP = M.t; });
      if (cfg.live) { M.rules.training = false; M.o.noClock = true; M.rules.euphoria = false; }
      if (id === 'defending') { M.kickoff(1); } if (cfg.sp) { M.o.spIdx = 0; M.setPiece(cfg.sp[0], 0, Pitch.X1 - 150, Pitch.CY + 30, {}); M.lastSP = cfg.sp[0]; }
      if (id === 'euphoria') { M.eu[0] = .4; }
      if (id === 'setpieces') EF.notice('SET PIECES: TAKE THEM ONE BY ONE', '#ffe7a8', 2.5, 2);
    },
    onUpdate(M, dt, sc) {
      if (finished) { if (menu) menu.update(dt); return; }
      const h = M.humans[0], f = h && h.f; if (f) { if (f.sprinting && Math.hypot(f.vx, f.vy) > 40) C.sprintSecs = (C.sprintSecs || 0) + dt; else if ((C.sprintSecs || 0) > 2 && Math.hypot(f.vx, f.vy) > 8 && Math.hypot(f.vx, f.vy) < 60) C.jogSecs = (C.jogSecs || 0) + dt;
        if (cfg.cones) cfg.cones.forEach((c, k) => { const cx = Pitch.X0 + c[0] * 1.2 - 100, cy = Pitch.Y0 + c[1] * .8 - 40; if (!conesHit[k] && Math.hypot(f.x - cx, f.y - cy) < 16) { conesHit[k] = 1; bump('cones'); EF.sfx('euTick'); } }); if (cfg.cones && Object.keys(conesHit).length >= cfg.cones.length) conesHit = {}; }
      // set-piece drills: take them in turn, start a new one when the last is over
      if (cfg.sp && (M.mode === 'kickoff' || (M.mode === 'play' && M.t - lastSP > 7 && lastSP > 0 && M.t - spT > 7))) { spT = M.t; const step = si < dr.steps.length ? si : 0, ty = cfg.sp[Math.min(step, cfg.sp.length - 1)]; M.setPiece(ty, 0, ty === 'corner' ? 0 : Pitch.X1 - (ty === 'freekick' ? 170 : 150), Pitch.CY + (ty === 'freekick' ? 60 : 0), {}); M.lastSP = ty; lastSP = M.t; }
      if (id === 'defending' && M.mode === 'play' && M.ball.owner && M.ball.owner.side === 0 && M.t % 4 < dt) { /* hand it back so the drill keeps flowing */ M.kickoff(1); }
      if (id === 'theatrics' && M.mode === 'play' && M.t - spT > 6) { spT = M.t; M.kickoff(0); }
      const stp = dr.steps[si]; if (stp && (C[stp.k] || 0) >= stp.n) { si++; EF.notice('STEP COMPLETE!', '#9aff9a', 1.4, 3); EF.sfx('euphoriaFull'); if (si >= dr.steps.length) { finished = true; const sv = EF.Save.load(); sv.drills = sv.drills || {}; sv.drills[id] = 1; EF.Save.save(); EF.sfx('duelWin'); menu = new UI.Menu([{ label: 'MORE TRAINING', onPick: () => game.go('training', { back }) }, { label: 'AGAIN', onPick: () => EF.startDrill(id, back) }], { y: 130, w: 180, h: 20, scale: 1, onCancel: () => game.go('training', { back }) }); } }
    },
    drawExtra(r, M, sc) {
      r.overlay(g => { const W = r.W, H = r.H, stp = dr.steps[Math.min(si, dr.steps.length - 1)]; UI.panel(g, 6, 62, Math.min(W - 12, 220), 52, { alpha: .88 }); TXT(g, dr.n + '. ' + dr.title + '  (' + Math.min(si + 1, dr.steps.length) + '/' + dr.steps.length + ')', 12, 66, '#ffe08a', { font: 'tiny' }); wrapTxt(g, stp.text, 12, 76, 208, '#fff6e0', { font: 'tiny' }); E.ui.bar(g, 12, 106, 208, 3, Math.min(1, (C[stp.k] || 0) / stp.n), '#7aff9a');
        if (finished) { UI.panel(g, W / 2 - 100, 50, 200, 70); TXT(g, 'DRILL COMPLETE!', W / 2, 60, '#9aff9a', { scale: 2, align: 'center' }); TXT(g, dr.who + ': "NOT BAD. NOT GOOD. BUT NOT BAD."', W / 2, 84, '#c8d4ff', { font: 'tiny', align: 'center' }); } });
      if (finished && menu) menu.draw(r);
    }
  };
  d.extraWorld = (r, view) => { if (cfg.cones) cfg.cones.forEach((c, k) => { const cx = Pitch.X0 + c[0] * 1.2 - 100, cy = Pitch.Y0 + c[1] * .8 - 40; r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 0), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 5, Y], [X + 5, Y], [X, Y - 11]], conesHit[k] ? '#5aff7a' : '#ff7a1a'); px.rect(g, X - 6, Y, 12, 2, '#e8e8e8'); }, {}); }); };
  game.go('match', d);
};
