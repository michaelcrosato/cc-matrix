// ---------------------------------------------------------------- the rest of the flow: VS card, promotion, results, Senpai's drill, the three bonus stages (7.4, 7.5)
KC.makeScenes2 = (game, S, talk) => {
  const stageNode = (idx) => KC.DATA.ladder[idx];
  const advance = () => { const s = KC.save.load() || { node: 0, rank: 0, score: 0 }; s.node = (s.node || 0) + 1; KC.save.write(s); return s; };
  KC.advanceNode = advance;

  // the VS card before a story match: split panels, names, the stage and the taunt
  S.vs = {
    pausable: false,
    enter(data) { this.data = data.data; this.title = data.title; this.t = 0; KC.A.music(game, 'select'); },
    update(d) { this.t += d; if (this.t > 2.5 || game.input.pressed('confirm')) return game.go('fight', this.data); },
    draw(r) {
      r.sky(['#101018', '#20102a', '#0a0a14']);
      const opp = KC.DATA.roster[this.data.r];
      r.overlay(g => {
        E.px.rect(g, 0, 0, r.W / 2, r.H, '#f2eee4'); E.px.rect(g, r.W / 2, 0, r.W / 2, r.H, '#c8302a');
        E.font.title(g, 'VS', r.W / 2, r.H / 2 - 20, { scale: 4, colors: ['#fffbe8', '#ffe08a'], depth: 3, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'TARO', r.W / 4, r.H - 60, '#0b0814', { align: 'center', scale: 2, outline: false });
        E.font.text(g, opp.short, r.W * 3 / 4, r.H - 60, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, this.title || opp.name, r.W / 2, 14, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.DATA.stages[this.data.stage].name, r.W / 2, r.H - 30, '#fff6d0', { align: 'center', outline: '#0b0814' });
        E.font.text(g, '"' + opp.intro + '"', r.W / 2, r.H - 16, '#ffe08a', { align: 'center', outline: '#0b0814' });
      });
    }
  };

  // the promotion ceremony (7.7): the belt, a fanfare, the rank road
  S.promotion = {
    pausable: false,
    enter(data) { this.data = data; this.t = 0; KC.A.music(game, 'ending', { loop: false }); KC.A.sfx(game, 'gong'); this.belt = data.promote ? KC.DATA.belts[data.promote] : null; },
    update(d) { this.t += d; if (this.t > 3 || game.input.pressed('confirm')) { const s = KC.save.load(); return game.go('road', { resume: true }); } },
    draw(r) {
      r.sky(['#2a1a10', '#4a2a18', '#7a4a28']);
      r.overlay(g => {
        if (this.belt) {
          E.px.rect(g, r.W / 2 - 80, r.H / 2 - 30, 160, 10, this.belt.color);
          E.font.title(g, 'PROMOTED!', r.W / 2, r.H / 2 - 74, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          E.font.text(g, this.belt.name, r.W / 2, r.H / 2 + 14, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        } else E.font.text(g, 'ON TO THE NEXT FIGHT', r.W / 2, r.H / 2, '#fff6d0', { align: 'center', outline: '#0b0814' });
        // the rank road: ten icons from white belt to champ
        for (let i = 0; i < 10; i++) {
          const x = 30 + i * 30, col = KC.DATA.belts[KC.DATA.beltOrder[i]].color, on = i <= (this.data.rank || 0);
          E.px.rect(g, x, r.H - 40, 22, 6, on ? col : '#2a2636');
        }
      });
    }
  };

  // the results of a versus match (8.4): the winner, the score lines, and the menu
  S.results = {
    pausable: false,
    enter(data) {
      this.winner = data.winner; this.F = data.F; this.menu = new E.Menu(game, ['REMATCH', 'CHARACTER SELECT', 'STAGE SELECT', 'MAIN MENU'], {
        x: 'center', y: 150, onPick: (i) => { if (i === 0) return game.go('fight', KC.versusData('taro', 'kamaboko', KC.DATA.stages.dojo)); if (i === 1 || i === 2) return game.go('versus'); return game.go('title'); }, onCancel: () => game.go('title')
      });
      KC.A.music(game, 'select');
    },
    update(d) { this.menu.update(d); },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const P = this.F && this.F.points || [0, 0], st = this.F && this.F.stats || [{}, {}];
      r.overlay(g => {
        E.font.title(g, (this.winner === 0 ? 'WHITE' : 'RED') + ' WINS', r.W / 2, 40, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'POINTS ' + P[0] + ' – ' + P[1], r.W / 2, 90, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'FULL ' + (st[0].full || 0) + '  HALF ' + (st[0].half || 0) + '  BLOCKS ' + (st[0].blocks || 0), r.W / 2, 118, '#e8e0c8', { align: 'center', outline: '#0b0814' });
      });
      this.menu.draw(r);
    }
  };

  // Senpai's drill (7.5): watch, then do it. Three misses give a hint; success scores 200 (GOOD) or 400 (SHARP, within 50 frames)
  S.practice = {
    pausable: false,
    enter(data) {
      this.lesson = KC.DATA.lessons[data.lesson] || KC.DATA.lessons.I; this.story = !!data.story; this.node = data.node;
      this.idx = 0; this.points = 0; this.w = new KC.Karateka({ id: 'taro', side: 'w' }); this.s = new KC.Karateka({ id: 'negi', side: 'r' });
      this.w.x = 150; this.s.x = 250; this.s.facing = -1; this.w.facing = 1;
      this.rigs = { w: KC.View.rigFor('taro', 'w'), r: KC.View.rigFor('negi', 'r') };
      this.beginDrill(); KC.A.music(game, 'practice');
      this.hintOn = false;
    },
    // Senpai stands at the gap the drill's technique needs (the matrix reads the gap for a few of them)
    placeSenpai() { const gap = KC.DRILL_GAP[this.drill] || 22; this.w.x = 150; this.w.facing = 1; this.s.x = this.w.x + KC.BODY_W + gap; this.s.facing = -1; },
    beginDrill() {
      this.drill = this.lesson.drills[this.idx]; this.phase = 'watch'; this.t = 0; this.misses = 0; this.msg = KC.TEXT.drillWatch;
      this.demoDone = false; this.lastObj = null; this.sharp = false; this.crouchSeen = false;
      this.placeSenpai();
    },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.pressed('start')) { return this.nextDrill(false); }
      if (game.input.pressed('cancel') && false) return;
      this.t += d;
      let iW = KC.readControl(game.input, -1, this.prev = this.prev || {});
      // the autoplay (the tests' playthrough): the drill's own technique, once per attempt
      if (KC.autoPlay && this.phase === 'now' && !this.w.tech && this.autoFired !== this.idx + ':' + this.misses) {
        const inv = KC.DATA.inverse[this.drill]; this.autoFired = this.idx + ':' + this.misses;
        iW = inv ? { posture: inv.posture, tech: inv.stick } : null;
      }
      this.w.control(iW, this.s);
      this.s.intent = { posture: 'n', tech: null };
      if (this.phase === 'watch') {
        if (!this.demoDone && this.t > 0.3) { this.s.startTech(this.drill === 'block' ? 'block' : this.drill); this.demoDone = true; this.msg = KC.TEXT.drillWatch; }
        this.s.tick(d, this.w, false);
        if (this.demoDone && this.s.state !== 'tech' && this.t > 1.8) { this.s.reset(); this.placeSenpai(); this.phase = 'now'; this.t = 0; this.msg = KC.TEXT.drillNow; KC.A.sfx(game, 'countBeep'); }
      } else if (this.phase === 'now') {
        this.s.tick(d, this.w, false);
        this.w.tick(d, this.s, true);
        const pt = this.w.tech;
        if (this.drill === 'crouch' && this.w.crouch && !this.crouchSeen) {
          this.crouchSeen = true; this.sharp = this.t <= 50 / 120; this.score(this.sharp ? 400 : 200); this.msg = this.sharp ? KC.TEXT.drillSharp : KC.TEXT.drillGood; this.phase = 'good'; this.t = 0;
        } else if (pt && pt !== this.lastObj) {
          this.lastObj = pt;
          const ok = this.matchDrill(this.w, pt.id);
          if (ok) { this.sharp = this.t <= 50 / 120; this.score(this.sharp ? 400 : 200); this.msg = this.sharp ? KC.TEXT.drillSharp : KC.TEXT.drillGood; this.phase = 'good'; this.t = 0; }
          else { this.misses++; this.msg = KC.TEXT.drillNo; this.phase = 'bad'; this.t = 0; }
        } else if (this.matchDrill(this.w, null) && this.t > 0.1 && false) { }
        if (this.t > 4 && this.phase === 'now') { this.misses++; this.msg = KC.TEXT.drillNo; this.phase = 'bad'; this.t = 0; }
      } else if (this.phase === 'good') { this.w.tick(d, this.s, true); this.s.tick(d, this.w, false); if (this.t > 1.2) this.nextDrill(true); }
      else if (this.phase === 'bad') { this.w.tick(d, this.s, true); this.s.tick(d, this.w, false); if (this.t > 1.2) { this.phase = 'watch'; this.t = 0; this.demoDone = false; this.w.reset(); this.s.reset(); this.placeSenpai(); if (this.misses >= 3) this.hintOn = true; } }
      KC.stepPoses({ w: this.w, r: this.s, rigs: this.rigs }, d);
      this.rigsOk = true;
    },
    matchDrill(f, id) { return id === this.drill; },
    score(n) { this.points += n; const s = KC.save.load(); if (this.story && s) { s.score = (s.score || 0) + n; KC.save.write(s); } },
    nextDrill(skipped) {
      this.idx++;
      if (this.idx >= this.lesson.drills.length) {
        const endLine = this.lesson.id === 'I' ? KC.TEXT.lessonEnd : this.lesson.id === 'II' ? KC.TEXT.lessonIIEnd : KC.TEXT.lessonIIIEnd;
        this.done = true; this.msg = KC.TEXT.lessonEnd + ' ' + this.points;
        this.endLine = endLine;
        return this.finish();
      }
      this.w.reset(); this.s.reset();
      this.beginDrill();
    },
    finish() {
      this.finished = true; this.t = 0;
      if (this.story) { advance(); return game.go('road', { resume: true }); }
      return game.go('dojo');
    },
    draw(r) {
      const st = KC.DATA.stages[this.lesson.stage] || KC.DATA.stages.dojo;
      V_stage(r, st, game.time);
      KC.View.drawFighters(r, [this.w, this.s], { w: this.rigs.w, r: this.rigs.r });
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, 26, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'LESSON ' + this.lesson.id + '-' + (this.idx + 1) + ': ' + KC.DATA.techniques[this.drill].name, 12, 12, '#fff6d0', { outline: '#0b0814' });
        E.font.title(g, this.msg, r.W / 2, r.H * 0.3, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        if (this.hintOn) E.font.text(g, 'HOLD POSTURE, THEN PRESS THE RIGHT STICK', r.W / 2, r.H - 28, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, 'POINTS ' + this.points, r.W - 12, 40, '#ffe08a', { align: 'right', outline: '#0b0814' });
      });
    }
  };
  return S;
};
