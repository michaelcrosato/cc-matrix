/* ---- RESULTS (12.9): the final score huge, the THREE STARS revealed one by one (portrait cards, a stat line, Chuck's
 * line), the objectives ticking ★, then CONTINUE / REMATCH / MAIN MENU. In the Cup Run: stars and unlocks saved, then
 * the post-game scene (a win) or Coach Marge's pep talk (a loss: RETRY or BACK TO MAP) ---- */
scenes.results = {
  enter(d) {
    d = d || {}; let m = d.m || Match.m;
    if (d.demo || !m) { m = Match.create(Setup.quickCfg({})); m.teams[0].score = 4; m.teams[1].score = 2; m.skaters[0].stats.goals = 2; m.skaters[1].stats.goals = 2; m.skaters[3].stats.goals = 2; m.skaters[5].stats.bigHits = 3; Match.endGame(m, 0); }
    this.m = m; this.t = 0; this.revealed = 0; this.pep = false; this.saved = false;
    const human = m.teams.findIndex(t => t.human), won = human >= 0 ? m.winner === human : m.winner >= 0;
    this.won = won; this.human = human;
    Synth.music(won || human < 0 ? 'victory' : 'defeat', { restart: true });
    this.menu = new UI.Tiles(this.items(), { cols: 3, w: 104, h: 26, gap: 8, onPick: it => this.pick(it.id) });
    this.menu.enabled = false;
    if (m.cfg.mode === 'story' && !this.saved) {
      this.saved = true; const before = Save.cheatsOpen().length, stars = m.cfg.objectives.map(o => !!m.objDone[o.id]);
      Save.chapterResult(m.cfg.chapter, stars, won); const after = Save.cheatsOpen();
      if (after.length > before) for (const c of after.slice(before)) UI.toast('UNLOCKED: ' + c[1], '#4af0f0', 4);
    }
    UI.Idle.reset();
  },
  items() {
    const m = this.m;
    if (m.cfg.mode === 'story') return this.won ? [{ id: 'continue', label: 'CONTINUE' }, { id: 'rematch', label: 'REPLAY GAME' }, { id: 'map', label: 'TO THE MAP' }] : [{ id: 'retry', label: 'RETRY' }, { id: 'map', label: 'BACK TO MAP' }, { id: 'menu', label: 'MAIN MENU' }];
    return [{ id: 'continue', label: 'CONTINUE' }, { id: 'rematch', label: 'REMATCH' }, { id: 'menu', label: 'MAIN MENU' }];
  },
  pick(id) {
    const m = this.m, n = m.cfg.chapter;
    if (id === 'rematch' || id === 'retry') { if (m.cfg.mode === 'story') { Story.st.attempt++; game.go('match', { cfg: Story.matchCfg(n) }, { fade: 'iris' }); } else Match.restart(); return; }
    if (id === 'map') return game.go('storymap', { chapter: n }, { fade: 'wipe' });
    if (id === 'menu') return game.go('title', { menu: true }, { fade: 'wipe' });
    if (id === 'continue') {
      if (m.cfg.mode === 'story') { const c = Story.ch(n); return game.go('cutscene', { id: c.post, chapter: n, onDone: () => n === 5 ? game.go('credits', { ending: true }, { fade: 'white' }) : game.go('storymap', { chapter: Math.min(5, n + 1), arrived: true }, { fade: 'wipe' }) }, { fade: 'wipe' }); }
      return game.go(m.cfg.mode === 'exhibition' ? 'setup' : 'title', { menu: true }, { fade: 'wipe' });
    }
  },
  update(dt) {
    this.t += dt;
    const reveal = Math.floor((this.t - 1.2) / 1.6);
    if (reveal > this.revealed - 1 && this.revealed < 3 && this.t > 1.2) { this.revealed++; const id = this.m.stars[3 - this.revealed], e = this.m.byId(id); if (e) { const idx = [0, 1, 2][3 - this.revealed], line = TEXT.stars[(this.revealed - 1) + 3 * Math.floor(RNG.fx() * 4)]; Talk.init(); Talk.speak('c', U.fill(line, { name: e.def.name, g: e.stats.goals || 0, s: e.stats.saves || 0 })); Synth.sfx('star'); void idx; } }
    if (UI.anyP('confirm') && this.revealed < 3 && this.t > .5) { this.revealed = 3; this.t = 1.2 + 1.6 * 3; game.players.forEach(I => I.consumeAll()); }
    if (this.revealed >= 3 && this.t > 1.2 + 1.6 * 3 + .4) {
      if (this.m.cfg.mode === 'story' && !this.won && !this.pep) { this.pep = true; Synth.say(TEXT.pep[(this.m.cfg.chapter || 1) - 1], CAST.marge.voice); }
      if (!this.menu.enabled) { this.menu.enabled = true; Talk.close(); }
      this.menu.update(dt);
    }
    Talk.step(dt);
  },
  draw(r) {
    const m = this.m, A2 = m.teams[0], B = m.teams[1];
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    r.overlay(g => {
      E.font.title(g, m.winner < 0 ? 'A TIE!' : (this.human >= 0 ? (this.won ? 'YOU WIN!' : 'TOUGH LOSS') : m.teams[m.winner].def.short + ' WIN'), r.W / 2, 8, { align: 'center', scale: 3, colors: this.won || this.human < 0 ? ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'] : ['#e8e8f0', '#a8b0c8', '#6a7090'] });
      Logo.draw(g, A2.id, r.W / 2 - 112, 38, 40); Logo.draw(g, B.id, r.W / 2 + 72, 38, 40);
      E.font.text(g, String(A2.score), r.W / 2 - 40, 40, '#ffffff', { scale: 4, align: 'center', outline: '#000' }); E.font.text(g, '-', r.W / 2, 44, UI.MUTED, { scale: 3, align: 'center', outline: false }); E.font.text(g, String(B.score), r.W / 2 + 40, 40, '#ffffff', { scale: 4, align: 'center', outline: '#000' });
      if (m.so && m.so.winner !== undefined) E.font.text(g, 'SHOOTOUT ' + m.so.marks[0].filter(Boolean).length + '-' + m.so.marks[1].filter(Boolean).length, r.W / 2, 74, UI.GOLD, { align: 'center', outline: false });
      // the three stars
      const cw = Math.min(118, (r.W - 30) / 3), x0 = r.W / 2 - cw * 1.5, y0 = 86;
      for (let k = 0; k < 3; k++) {
        const order = 2 - k, shown = this.revealed > order ? true : false, id = m.stars[k], e = m.byId(id), x = x0 + (2 - k) * cw + 3;
        UI.panel(g, x, y0, cw - 6, 70, { border: shown ? UI.GOLD : '#2a3448' });
        E.font.text(g, '★'.repeat(k + 1) + ' ' + ['FIRST', 'SECOND', 'THIRD'][k] + ' STAR', x + (cw - 6) / 2, y0 + 4, shown ? UI.GOLD : '#3a4a6a', { align: 'center', font: 'tiny', outline: false });
        if (shown && e) {
          e.rig.drawPortrait(g, x + 4, y0 + 14, 36, { zoom: 2.4, turn: .4, bg: m.teams[e.team].def.dark });
          E.font.text(g, e.def.name, x + 44, y0 + 16, '#ffffff', { outline: '#000' }); E.font.text(g, m.teams[e.team].def.abbr + ' #' + e.def.num, x + 44, y0 + 27, m.teams[e.team].def.trim, { outline: false });
          const st = e.stats, line = e.def.pos === 'G' ? st.saves + ' SAVES' : st.goals + 'G ' + st.assists + 'A ' + st.bigHits + ' HITS';
          E.font.text(g, line, x + 44, y0 + 38, '#cfe0f4', { outline: false });
          if (e.def.pos !== 'G' && st.topShot) E.font.text(g, U.kmh(st.topShot) + ' KM/H', x + 44, y0 + 49, UI.MUTED, { font: 'tiny', outline: false });
        }
      }
      // the objectives, ticking stars
      if (m.cfg.objectives.length) m.cfg.objectives.forEach((o, i) => { const ok = !!m.objDone[o.id], show = this.revealed >= 3; E.font.text(g, (show && ok ? '★ ' : '☆ ') + o.text, r.W / 2 - 100, y0 + 76 + i * 10, show && ok ? UI.GOLD : UI.MUTED, { outline: false }); });
      if (this.pep) { const pl = TEXT.pep[(m.cfg.chapter || 1) - 1]; UI.panel(g, 16, r.H - 96, r.W - 32, 34, { border: '#7ad87a' }); Rigs && Cutscene.rigOf('marge').drawPortrait(g, 20, r.H - 93, 28, { zoom: 2.2, turn: .4, bg: '#1a2a1a' }); E.font.text(g, pl, 52, r.H - 90, '#eef4ff', { wrap: r.W - 80, outline: false }); }
      if (this.menu.enabled) { this.menu.y = r.H - 58; this.menu.draw(g, r); UI.legend(g, r, [['confirm', 'SELECT']]); }
      else UI.legend(g, r, [['confirm', 'SKIP']]);
      UI.drawToasts(g, r, 60);
    });
    Talk.draw(r);
  }
};
