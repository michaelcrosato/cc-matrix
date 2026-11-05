/* ---- DEV MODE (pause menu → DEV MODE, then ` toggles it): a 10-foot canvas panel on the right of the screen.
 * TUNING (the important numbers as live sliders, RESET ALL TO DEFAULTS), CHEATS, EVENTS (every force()), VIEW (debug
 * overlays, slow motion, frame step) and JUMP (anywhere in the game). FROZEN (the match stopped) or LIVE (it runs) ---- */
const TABS = ['TUNING', 'CHEATS', 'EVENTS', 'VIEW', 'JUMP'];
const Dev = TT.dev = {
  enabled: false, open: false, frozen: true, tab: 0, i: 0, scroll: 0, confirmReset: 0, rects: [], tabRects: [], view: { shape: false, ranges: false, lanes: false, skel: false, state: true, slow: false }, msg: '', msgT: 0,
  openPanel() { this.enabled = true; this.open = true; this.frozen = true; this.i = 0; this.scroll = 0; TT.game.input.consumeAll(); },
  close(quiet) { this.open = false; if (!quiet) TT.game.input.consumeAll(); TT.game.timeScale = this.view.slow ? .25 : 1; if (quiet) { TT.game.timeScale = 1; this.view.slow = false; } },
  toggle() { if (this.open) this.close(); else this.openPanel(); },
  rows() {
    const m = MS.m;
    if (this.tab === 0) return [{ kind: 'reset', label: this.confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS' }].concat(TUNE.specs.map(s => ({ kind: 'slider', s })));
    if (this.tab === 1) return [['god', 'God mode (my team can\'t be tackled)'], ['infTurbo', 'Infinite turbo'], ['hypeFull', 'Hype always full'], ['onFire', 'Always ON FIRE (P1)'], ['refBlind', 'Ref blind (sees nothing)'], ['refStrict', 'Ref strict (sees everything)'], ['cpuFrozen', 'CPU frozen'], ['noClock', 'No clock'], ['bigHeads', 'Big heads']].map(([k, l]) => ({ kind: 'cheat', k, label: l }));
    if (this.tab === 2) {
      const E2 = [['tryHome', 'Score a try (home)'], ['tryAway', 'Score a try (away)'], ['give', 'Give P1 the ball'], ['ball5m', 'Ball to their 5 m line'], ['knockOn', 'Knock-on: scrum'], ['touch', 'Touch: lineout'], ['penalty', 'Foul: penalty (the choice)'], ['freeKick', 'Free kick'], ['yellow', 'Yellow card (opponent)'], ['kickoff', 'Kick-off'], ['dropout', '22 drop-out'], ['ruck', 'A ruck now'], ['monster', 'Monster hit on the carrier'], ['dropGoal', 'A drop goal'], ['cheap', 'A cheap shot']]
        .concat(TT.POWERUP_ORDER.map(k => ['powerup:' + k, 'Spawn power-up: ' + TT.POWERUPS[k].name]))
        .concat(['mud', 'chicken', 'flames', 'lightning'].map(k => ['hazard:' + k, 'Hazard: ' + k]))
        .concat([['fire', 'ON FIRE for P1'], ['thunder', 'THUNDER RUN'], ['hurricane', 'HURRICANE HIT'], ['refDown', 'Flatten the ref'], ['replay', 'Replay the last 5 s'], ['hooter', 'The hooter'], ['halftime', 'Skip to half-time'], ['fulltime', 'Skip to full time'], ['sudden', 'Sudden death'], ['score:0:5', 'Score +5 home'], ['score:0:-5', 'Score -5 home'], ['score:1:5', 'Score +5 away'], ['score:1:-5', 'Score -5 away'], ['clock', 'Clock -30 s']]);
      return E2.map(([k, l]) => ({ kind: 'event', k, label: l }));
    }
    if (this.tab === 3) return [['shape', 'AI shape slots and roles'], ['ranges', 'Tackle and fend ranges'], ['lanes', 'Pass lanes and legal receivers'], ['skel', 'Rig skeletons'], ['state', 'State readout'], ['slow', 'Slow motion (0.25x)'], ['fps', 'Frame-rate readout'], ['step', 'Frame step (one step, while FROZEN)']].map(([k, l]) => ({ kind: 'view', k, label: l }));
    const J = [];
    TT.CUP.forEach((R, i) => { J.push({ kind: 'jump', label: 'Cup: ' + R.round + ' match', go: () => { Cup.s = Cup.s || Cup.fresh(); Cup.s.round = i; TT.game.go('match', Cup.matchData()); } }); J.push({ kind: 'jump', label: 'Cup: ' + R.round + ' cutscene', go: () => { Cup.s = Cup.s || Cup.fresh(); Cup.s.round = i; TT.game.go('story', { node: R.pre, after: 'cup', venue: R.venue }); } }); });
    J.push({ kind: 'jump', label: 'Cup: prologue', go: () => { Cup.s = Cup.s || Cup.fresh(); TT.game.go('story', { node: 'prologue', after: 'prologue' }); } });
    TT.DRILLS.forEach((d, i) => J.push({ kind: 'jump', label: 'Drill ' + (i + 1) + ': ' + d.name, go: () => TT.game.debug.drill(i) }));
    J.push({ kind: 'jump', label: 'Victory', go: () => TT.game.go('story', { node: 'victory', after: 'victory', venue: 'megadome' }) });
    J.push({ kind: 'jump', label: 'The third half', go: () => TT.game.go('story', { node: 'third', after: 'credits' }) });
    J.push({ kind: 'jump', label: 'Credits', go: () => TT.game.go('credits') });
    J.push({ kind: 'jump', label: 'Session-style match (75 s halves, no replays)', go: () => TT.game.go('match', { home: 'mud', away: 'gul', venue: 'docks', halfLen: 75, sessionStyle: true }) });
    J.push({ kind: 'jump', label: 'Title', go: () => TT.game.go('title') });
    return J;
  },
  update(dt) {
    const game = TT.game, I = game.input, rows = this.rows(), n = rows.length;
    this.msgT = Math.max(0, this.msgT - dt); this.confirmReset = Math.max(0, this.confirmReset - dt);
    const live = !this.frozen;
    if (I.pressed('cancel') && !live) { this.close(); return; }
    if (!live) {
      if (I.pressed('l1')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.i = 0; this.scroll = 0; }
      if (I.pressed('r1')) { this.tab = (this.tab + 1) % TABS.length; this.i = 0; this.scroll = 0; }
      if (I.repeat('up', .3, .08)) this.i = (this.i + n - 1) % n;
      if (I.repeat('down', .3, .08)) this.i = (this.i + 1) % n;
      const row = rows[this.i];
      if (row && row.kind === 'slider') { const sp = row.s.step * (I.down('turbo') ? 5 : 1); if (I.repeat('left', .25, .05)) TUNE.set(row.s.key, TUNE.v[row.s.key] - sp); if (I.repeat('right', .25, .05)) TUNE.set(row.s.key, TUNE.v[row.s.key] + sp); if (I.pressed('sq')) TUNE.reset(row.s.key); }
      if (I.pressed('x') || I.pressed('confirm')) this.fire(row);
      if (I.pressed('sq') && this.tab === 3) { this.stepOnce(); }
    }
    if (I.pressed('tri')) { this.frozen = !this.frozen; this.say(this.frozen ? 'FROZEN' : 'LIVE: THE MATCH RUNS, THE PANEL TAKES THE MOUSE'); }
    // the mouse: hover focuses, a click on a tab or a row, a drag on a slider's bar, the wheel scrolls
    const pt = I.pointer(), ck = I.clicked();
    if (ck) { this.tabRects.forEach((rc, k) => { if (UI.inRect(ck, rc)) { this.tab = k; this.i = 0; this.scroll = 0; } }); this.rects.forEach(([rc, k]) => { if (UI.inRect(ck, rc)) { this.i = k; if (rows[k] && rows[k].kind !== 'slider') this.fire(rows[k]); } }); }
    if (pt && this.lastPt && (pt[0] !== this.lastPt[0] || pt[1] !== this.lastPt[1])) this.rects.forEach(([rc, k]) => { if (UI.inRect(pt, rc)) this.i = k; });
    this.lastPt = pt;
    if (pt && I.down('mouseL') && this.barRect) { const [bx, by, bw, bh, s] = this.barRect; if (pt[1] >= by - 3 && pt[1] <= by + bh + 3 && pt[0] >= bx - 2 && pt[0] <= bx + bw + 2) TUNE.set(s.key, s.min + clamp((pt[0] - bx) / bw, 0, 1) * (s.max - s.min)); }
    if (I.wheel) this.i = clamp(this.i + Math.sign(I.wheel), 0, n - 1);
    this.i = clamp(this.i, 0, n - 1);
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + 8) this.scroll = this.i - 7;
    if (live) { /* the match runs: the scene steps it */ }
  },
  say(t) { this.msg = t; this.msgT = 2; },
  stepOnce() { const m = MS.m; if (m && this.frozen) { m.step(1 / 120); if (MS.pres) MS.pres.update(1 / 120, m); this.say('ONE STEP'); } },
  fire(row) {
    if (!row) return;
    const m = MS.m, game = TT.game;
    if (row.kind === 'reset') { if (this.confirmReset > 0) { TUNE.reset(); this.confirmReset = 0; this.say('EVERY SLIDER BACK TO ITS DEFAULT'); } else this.confirmReset = 3; return; }
    if (row.kind === 'cheat') { TT.cheats[row.k] = !TT.cheats[row.k]; if (row.k === 'bigHeads' && MS.pres) MS.pres.bigHeads(TT.cheats.bigHeads); this.say(row.label.toUpperCase() + (TT.cheats[row.k] ? ' ON' : ' OFF')); return; }
    if (row.kind === 'event' && m) {
      const [k, a, b] = row.k.split(':');
      if (k === 'powerup') m.force('powerup', { kind: a });
      else if (k === 'hazard') { if (a !== m.hazardKind && a !== 'mud') m.hazardKind = a; m.force('hazard', { kind: a }); }
      else if (k === 'score') m.force('score', { team: +a, n: +b });
      else if (k === 'replay') { if (MS.rep.start({ kind: 'dev', id: m.carrier() ? m.carrier().id : 0, t: m.t - 1 })) { MS.zoom0 = game.zoom || 1; game.setZoom(MS.zoom0 * 1.35); } this.frozen = false; }
      else m.force(k);
      this.say(row.label.toUpperCase());
      return;
    }
    if (row.kind === 'view') {
      if (row.k === 'step') return this.stepOnce();
      if (row.k === 'fps') { game.settings.set('showFps', !game.settings.showFps); return; }
      this.view[row.k] = !this.view[row.k];
      if (row.k === 'slow') game.timeScale = this.view.slow ? .25 : 1;
      return;
    }
    if (row.kind === 'jump') { this.close(true); row.go(); }
  },
  /** the debug overlays over the match, and the panel */
  draw(r) {
    const m = MS.m, V = this.view;
    if (m) {
      const S = m.shapes ? m.shapes() : null;
      if (V.shape && S) r.decal(() => { for (const id in S.slots) { const s = S.slots[id]; r.groundRing(s.x, s.y, 5, '#80ff90', .8); } for (const id in S.def) { const s = S.def[id]; r.groundRing(s.x, s.y, 5, '#ff8080', .8); } });
      if (V.ranges) r.decal(() => { for (const p of m.players) if (m.standing(p)) { r.groundRing(p.x, p.y, TUNE.v.tackleRange, '#ffffff', .25); if (p.fendT > 0) r.groundRing(p.x, p.y, 16, '#ffe060', .6); } });
      if (V.lanes) { const c = m.carrier(); if (c) r.decal(g => { for (const q of m.legalReceivers(c, 0)) { const [x0, y0] = r.w(c.x, c.y, 0), [x1, y1] = r.w(q.x, q.y, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#80ff90', 1); } }); }
      if (V.skel && MS.pres) for (const rig of MS.pres.rigs) if (rig.debug) rig.debug(r);
      if (V.state) r.overlay(g => { UI.txt(g, 'PHASE ' + m.phase.toUpperCase() + (m.sub ? '/' + m.sub : '') + '  T ' + m.phaseT.toFixed(1) + '  POSS ' + m.teams[m.poss].short + '  BALL ' + m.ball.st.toUpperCase() + (m.ball.holder >= 0 ? ' #' + m.ball.holder : ''), 6, 52, '#a0ffa0', { font: 'tiny' }); });
    }
    if (!this.open) return;
    r.overlay(g => {
      const w = Math.max(230, Math.round(r.W * .55)), x = r.W - w - 4, y = 52, rowH = 17, rows = this.rows();
      UI.panel(g, x, y - 38, w, rowH * 8 + 92, { alpha: .94, bg: ['#0e1420', '#080c14'], border: this.frozen ? '#f0c040' : '#40d0ff' });
      this.tabRects = [];
      let tx = x + 6;
      TABS.forEach((t, k) => { const tw = UI.w(t) + 8; this.tabRects.push([tx, y - 34, tw, 12]); px.rect(g, tx, y - 34, tw, 12, k === this.tab ? '#f0c040' : '#20283a'); UI.txt(g, t, tx + 4, y - 32, k === this.tab ? '#1a1206' : '#c8d0e8', { shadow: false }); tx += tw + 3; });
      UI.txt(g, 'DEV MODE: ' + (this.frozen ? 'FROZEN (THE MATCH WAITS)' : 'LIVE (THE MATCH RUNS)'), x + 6, y - 18, this.frozen ? '#ffe060' : '#40d0ff');
      this.rects = []; this.barRect = null;
      rows.slice(this.scroll, this.scroll + 8).forEach((row, j) => {
        const k = this.scroll + j, yy = y + j * rowH, on = k === this.i;
        this.rects.push([[x + 4, yy, w - 8, rowH - 2], k]);
        if (on) px.rect(g, x + 4, yy, w - 8, rowH - 2, '#2a2412');
        if (row.kind === 'slider') {
          const s = row.s, v = TUNE.v[s.key], changed = Math.abs(v - s.value) > 1e-9;
          UI.txt(g, s.label, x + 8, yy + 4, on ? '#ffe060' : changed ? '#a0e0ff' : '#e8ecf8');
          const bw = Math.round(w * .32), bx = x + w - bw - 44;
          UI.bar(g, bx, yy + 5, bw, 6, (v - s.min) / (s.max - s.min), changed ? '#40c0ff' : '#c8a040', { mark: (s.value - s.min) / (s.max - s.min) });
          UI.txt(g, String(+v.toFixed(3)), x + w - 8, yy + 4, '#ffffff', { align: 'right' });
          if (on) this.barRect = [bx, yy + 5, bw, 6, s];
        } else {
          let st = '';
          if (row.kind === 'cheat') st = TT.cheats[row.k] ? 'ON' : 'OFF';
          if (row.kind === 'view') st = row.k === 'fps' ? (TT.game.settings.showFps ? 'ON' : 'OFF') : row.k === 'step' ? '' : this.view[row.k] ? 'ON' : 'OFF';
          UI.txt(g, row.label, x + 8, yy + 4, on ? '#ffe060' : row.kind === 'reset' ? '#ff9080' : '#e8ecf8');
          if (st) UI.txt(g, st, x + w - 8, yy + 4, st === 'ON' ? '#80ff90' : '#6a7088', { align: 'right' });
        }
      });
      if (rows.length > 8) UI.txt(g, this.tab === 0 ? (this.i ? 'SLIDER ' + this.i + ' OF ' + TUNE.specs.length : TUNE.specs.length + ' SLIDERS') : (this.i + 1) + ' OF ' + rows.length, x + w - 8, y + 8 * rowH + 2, '#6a7088', { align: 'right', font: 'tiny' });
      const hint = this.tab === 0 ? '{b:left}{b:right} CHANGE  {b:sq} RESET ONE' : this.tab === 3 ? '{b:x} TOGGLE  {b:sq} ONE STEP' : '{b:x} DO IT';
      UI.prompt(g, hint, x + 6, y + 8 * rowH + 6, TT.game.input, {});
      UI.prompt(g, '{b:l1}{b:r1} TABS  {b:tri} FROZEN / LIVE', x + 6, y + 8 * rowH + 20, TT.game.input, {});
      UI.prompt(g, '{b:cancel} CLOSE   MOUSE: CLICK, DRAG A BAR', x + 6, y + 8 * rowH + 34, TT.game.input, {});
      if (this.msgT > 0) UI.txt(g, this.msg, x + w / 2, y + 8 * rowH + 48, '#80ff90', { align: 'center', font: 'tiny' });
    });
  }
};
