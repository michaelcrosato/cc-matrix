/* ---- THE NETS AND THE SHOWDOWN.
 * Nets: Mrs Crumb's lessons (each checks its goal before moving on; 12 balls at most), free practice (the bowling
 * machine with a chosen delivery, or bowling at a dummy batter) and the Six Machine (12 balls; runs plus target
 * bonuses; a high-score table). Showdown: BAT (6 balls from the Thrumptonator 3000, a seeded mixed set ending with the
 * Triple Threat, 2 wickets; score = runs) or BOWL (defend 14 against Kev Malone; score = (14 - conceded) x 10 + 25 a
 * wicket), with E.Arcade tables and initials. The Showdown's BAT is the AI Hub round too. ---- */
const cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, hud: false });
K.cab = cab;
/** a lesson's controller: counts its goal from the bus, shows Mrs Crumb's card, ends after the goal or 12 balls */
function lessonExtra(list, then) {
  const st = { i: 0, count: 0, balls: 0, card: true, done: false, offs: [] };
  const L = () => LESSONS[list[st.i]];
  const listen = () => {
    st.offs.forEach(f => f()); st.offs = [];
    const on = (t, f) => st.offs.push(bus.on(t, d => { if (d.match !== Play.m) return; f(d); }));
    const goal = L().goal;
    on('bat:press', d => { if (goal === 'good' && (d.grade === 'perfect' || d.grade === 'good') && L().btn === 'shot') st.count++; });
    on('bat:contact', d => { if (goal === 'loft' && d.kind === 'clean' && d.family === 'loft') st.count++; if (goal === 'charge' && Play.m.cur.charged && d.kind === 'clean') st.count++; });
    on('ball:done', d => { st.balls++; if (goal === 'survive' && !d.rec.wicket) st.count++; if (goal === 'runs') st.count += d.rec.ran || 0; if (goal === 'aftertouch' && Math.abs(d.rec.aftertouch || 0) > .03) st.count++; if (goal === 'green' && d.rec.meter === 'green') st.count++; });
    on('special', () => { if (goal === 'special') st.count++; });
    on('wicket', d => { if (goal === 'catch' && d.how === 'caught') st.count++; });
    on('field:throw', () => { if (goal === 'throw') st.count++; });
    on('review:start', d => { if (goal === 'review' && d.kind !== 'third') st.count++; });
  };
  const setup = m => {
    const l = L(); st.count = 0; st.balls = 0; st.card = true;
    m.cfg.humans = { 0: [game.input] };   // Kerfuffle CC, batting or bowling as the lesson needs
    m.cfg.cheat = {};
    if (l.goal === 'special') m.hype[m.bowlSide] = 100;
    if (l.goal === 'review') m.cfg.cheat.lbwGiven = false;
    listen();
  };
  return {
    lesson: st,
    pre(dt, m) {
      if (st.done) return;
      if (!st.started) { st.started = true; setup(m); }
      const l = L();
      if (st.card) { m.hold = Math.max(m.hold, .05); const I = game.input; if (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())) { I.consumeAll(); st.card = false; K.sfx('confirm'); } return; }
      // keep the lesson's situation: the right side human, forced outcomes for the fielding lessons
      if (m.phase === 'setup' && m.pt < .02) {
        if (l.field) m.force.outcome = { kind: l.goal === 'catch' ? 'caughtHuman' : 'pushToField' };
        if (l.goal === 'review') { m.force.outcome = { kind: 'review' }; m.cfg.cheat.lbwGiven = false; }
        if (l.goal === 'special' && st.count === 0) m.hype[m.bowlSide] = 100;
      }
      if (st.count >= l.count || st.balls >= 12) {
        Story.data && (Story.data.lessons[list[st.i]] = true); Profile.data.lessons[list[st.i]] = true; Profile.save();
        st.i++; K.sfx('item');
        if (st.i >= list.length) { st.done = true; st.offs.forEach(f => f()); if (then) game.after(.1, then); else game.go('nets'); return; }
        const sameSide = !!(L().bowl || L().field) === !!(l.bowl || l.field);
        if (!sameSide) { m.innings[m.innNo].done = true; m.innings[m.innNo].end = 'lesson'; m.cfg.battingFirst = L().bowl || L().field ? 1 : 0; m.startInnings(0); }
        setup(m);
      }
    },
    draw(r, m) {
      if (st.done) return;
      const l = L();
      r.overlay(g => {
        if (st.card) {
          px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
          UI.panel(g, r.W / 2 - 160, 36, 320, 126);
          Cast.extra('crumb').drawPortrait(g, r.W / 2 - 152, 46, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
          UI.text(g, 'LESSON ' + l.n + ': ' + l.title.toUpperCase(), r.W / 2 - 104, 46, UI.gold);
          UI.para(g, l.text, r.W / 2 - 104, 60, 258, '#ffffff');
          UI.text(g, '"Watch the ball, dear, not the cake."', r.W / 2, 146, '#c8c0a8', { align: 'center' });
          Glyphs.row(g, r.W / 2, 170, game.input, [['confirm', 'START']], { align: 'center' });
        } else {
          px.blend(g, .7, 'normal', () => px.rect(g, r.W / 2 - 90, 2, 180, 22, '#0c1410'));
          UI.text(g, 'LESSON ' + l.n + ': ' + l.title.toUpperCase(), r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' });
          UI.text(g, Math.min(st.count, l.count) + ' / ' + l.count + '   (BALL ' + (st.balls + 1) + ' OF 12)', r.W / 2, 13, '#ffffff', { align: 'center', font: 'tiny' });
        }
      });
    }
  };
}
/* forced outcomes the lessons use: a catch coming to a fielder for the human ring, a push into the field to throw */
const _forcedShot = AI.forcedShot;
AI.forcedShot = function (m, f, len, line) {
  if (f.kind === 'caughtHuman') { const r = _forcedShot.call(this, m, { kind: 'caught' }, len, line); m.cfg.cheat.catchesOnce = false; return r; }
  if (f.kind === 'pushToField') { m.flags.forceRun = 1; return _forcedShot.call(this, m, { kind: '1' }, len, line); }
  return _forcedShot.call(this, m, f, len, line);
};
scenes.nets = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    d = d || {}; Idle.reset();
    if (d.lessons) { this.run(d.lessons, d.then); return; }
    this.state = 'menu'; Audio.music('tea'); K.game.setView(Views.v.story);
    this.menu = new UIList({ w: 230, rowH: 17, y: 80, onBack: () => game.go('title'), items: [
      { label: 'LESSONS 1-6: BATTING AND BOWLING', act: () => this.run([1, 2, 3, 4, 5, 6]), help: 'Aim, ground shots, lofts, defending, running, charging, the meter.' },
      { label: 'LESSONS 7-11: THE ARCADE BITS', act: () => this.run([7, 8, 9, 10, 11]), help: 'Aftertouch, specials, the catch ring, throws and reviews.' },
      { label: 'FREE PRACTICE: BATTING', act: () => { this.state = 'pick'; }, help: 'The bowling machine bowls what you choose.' },
      { label: 'FREE PRACTICE: BOWLING', act: () => this.practice('bowl'), help: 'Bowl at a dummy batter who mostly defends.' },
      { label: 'THE SIX MACHINE', act: () => this.sixMachine(), help: '12 balls. Runs plus target bonuses. High scores.' },
      { label: 'BACK', act: () => game.go('title') }
    ] });
    this.del = 0; this.delList = Object.keys(DELIVERIES).filter(k => DELIVERIES[k].fam !== 'machine');
  },
  netsCfg(o) { return Object.assign({ mode: 'nets', teams: ['ker', 'mud'], ground: 'nets', overs: 50, wickets: 10, difficulty: K.settings('difficulty'), kerfuffleRules: true, humans: { 0: [game.input] }, toss: false, superOver: false, battingFirst: 0, commentary: true, tutorial: true }, o); },
  run(list, then) { const first = LESSONS[list[0]]; game.go('match', { cfg: this.netsCfg({ cheat: {}, battingFirst: first.bowl || first.field ? 1 : 0 }), hooks: { extra: lessonExtra(list, then), onEnd: () => game.go('nets') } }); },
  practice(role, del) {
    const cfg = this.netsCfg(role === 'bowl' ? { battingFirst: 1 } : {});
    const extra = { pre(dt, m) { if (del && m.phase === 'setup' && m.pt < .02) { m.force.delivery = null; m.cpuPlan = null; const D = DELIVERIES[del]; m.deliveryChoices = [del, del, del]; } if (role === 'bowl' && m.phase === 'setup' && m.pt < .02) m.cfg.cheat.dummy = true; }, draw(r) { r.overlay(g => { UI.text(g, role === 'bowl' ? 'FREE PRACTICE: BOWLING' : 'FREE PRACTICE: ' + (del ? DELIVERIES[del].name.toUpperCase() : 'MIXED'), r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'PAUSE MENU TO QUIT', r.W / 2, 13, '#a8a090', { align: 'center', font: 'tiny' }); }); } };
    if (role !== 'bowl' && del) cfg.forceBowlerFamily = DELIVERIES[del].fam;
    game.go('match', { cfg, hooks: { extra, onEnd: () => game.go('nets') } });
  },
  sixMachine() {
    const cfg = this.netsCfg({ overs: 2, wickets: 10, kerfuffleRules: true, sixMachine: true });
    let balls = 0, score = 0;
    const extra = {
      pre(dt, m) { if (!m.sixInit) { m.sixInit = true; m.ground = Object.assign({}, m.ground, { targets: SIX_BOARDS }); } },
      step(dt, m) {},
      draw(r, m) { r.overlay(g => { px.blend(g, .75, 'normal', () => px.rect(g, r.W / 2 - 70, 2, 140, 22, '#0c1410')); UI.text(g, 'THE SIX MACHINE', r.W / 2, 4, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'BALL ' + Math.min(12, m.inn.balls + 1) + '/12   SCORE ' + m.inn.runs, r.W / 2, 13, '#ffffff', { align: 'center', font: 'tiny' }); }); }
    };
    void balls; void score;
    game.go('match', { cfg, hooks: { extra, onEnd: m => game.go('scores', { mode: 'sixmachine', score: m.innings[0].runs, back: 'nets' }) } });
  },
  update(dt) {
    const I = game.input; if (this.state === 'run') return;
    if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (this.state === 'pick') {
      if (I.repeat('left', .3, .1)) this.del = (this.del + this.delList.length) % (this.delList.length + 1) - 0 || 0, this.del = (this.del - 1 + this.delList.length + 1) % (this.delList.length + 1);
      if (I.repeat('right', .3, .1)) this.del = (this.del + 1) % (this.delList.length + 1);
      if (I.pressed('confirm')) { I.consume('confirm'); this.practice('bat', this.del === 0 ? null : this.delList[this.del - 1]); }
      if (I.pressed('cancel')) { I.consume('cancel'); this.state = 'menu'; }
      return;
    }
    this.menu.update(dt, I);
  },
  back() { if (this.state === 'pick') { this.state = 'menu'; return true; } game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, 'THE NETS', r.W / 2, 14, UI.gold, { align: 'center', scale: 2 });
      Cast.extra('crumb').drawPortrait(g, 14, 14, 40, { zoom: 3, turn: .3, bg: '#2a3a2a' });
      if (this.state === 'pick') {
        const name = this.del === 0 ? 'MIXED (THE MACHINE CHOOSES)' : DELIVERIES[this.delList[this.del - 1]].name.toUpperCase() + ' - ' + FAMILY[DELIVERIES[this.delList[this.del - 1]].fam].label;
        UI.panel(g, r.W / 2 - 130, 80, 260, 50); UI.text(g, 'THE BOWLING MACHINE BOWLS:', r.W / 2, 88, '#c8c0a8', { align: 'center' }); UI.text(g, '← ' + name + ' →', r.W / 2, 106, '#ffffff', { align: 'center' });
        UI.footer(g, r, game.input, [['left', 'DELIVERY'], ['confirm', 'START'], ['cancel', 'BACK']]);
        return;
      }
      this.menu.draw(g, r); UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
const SIX_BOARDS = [[-260, 460, 40], [0, 560, 60], [260, 460, 40], [-420, 200, 30], [420, 200, 30], [0, 380, 90]].map(([x, y, z], i) => ({ id: 'board' + i, label: 'BOARD ' + (i + 1), at: [x, y, z], size: [44, 10, 30], bonus: [4, 6, 4, 3, 3, 8][i], line: 'six', fx: 'spark', shape: 'KERFUFFLE:adBoard', face: Math.PI / 2 }));
/* ---- the showdown ---- */
const SHOWDOWN_BALLS = [{ id: 'piston', target: [-3, 90] }, { id: 'steamBouncer', target: [-2, 175] }, { id: 'piston', target: [0, 22], kmh: 158 }, { id: 'piston', target: [-4, 70], kmh: 112, slower: true }, { id: 'piston', target: [10, 60], kmh: 128, swing: 3 }, { id: 'piston', special: 'triple', target: [0, 80] }];
function showdownBat(o = {}) {
  const cfg = { mode: o.hub ? 'hub' : 'showdown', teams: ['ker', 'thr'], ground: 'dome', overs: 1, wickets: 2, difficulty: o.hub ? 'county' : K.settings('difficulty'), kerfuffleRules: true, humans: { 0: o.inputs || [game.input] }, toss: false, battingFirst: 0, superOver: false, timeOfDay: 'night', weather: 'clear', seed: o.seed || 7 };
  const balls = o.balls || SHOWDOWN_BALLS;
  const extra = { pre(dt, m) { if (m.phase === 'setup' && m.pt < .02 && m.inn) { const b = balls[Math.min(balls.length - 1, m.inn.balls)]; m.force.delivery = Object.assign({ grade: 'green' }, b); } }, draw: o.draw };
  return { cfg, extra };
}
scenes.showdown = {
  view: 'threequarter', camera: { zoom: false },
  enter() {
    Idle.reset(); Audio.music('showdown'); K.game.setView(Views.v.story);
    this.menu = new UIList({ w: 230, rowH: 18, y: 96, onBack: () => game.go('title'), items: [
      { label: 'BAT: FACE THE THRUMPTONATOR', act: () => { const s = showdownBat(); game.go('match', { cfg: s.cfg, hooks: { extra: s.extra, onEnd: m => game.go('scores', { mode: 'bat', score: m.innings[0].runs, back: 'showdown' }) } }); }, help: 'Six balls of steam and spite, two wickets. Score: runs.' },
      { label: 'BOWL: DEFEND 14 AGAINST KEV', act: () => this.bowl(), help: 'Kev "Thongs" Malone needs 15. Score: (14 - runs) x 10 + 25 a wicket.' },
      { label: 'HIGH SCORES', act: () => game.go('scores', { mode: 'bat', back: 'showdown', view: true }) },
      { label: 'BACK', act: () => game.go('title') }
    ] });
  },
  bowl() {
    const cfg = { mode: 'showdown', showdownBowl: true, teams: ['lar', 'ker'], ground: 'dome', overs: 1, wickets: 2, difficulty: K.settings('difficulty'), kerfuffleRules: true, humans: { 1: [game.input] }, toss: false, battingFirst: 0, superOver: false, timeOfDay: 'night', weather: 'clear', scenario: { innings: 1, battingFirst: 1, firstRuns: 14, firstWkts: 0 } };
    const lar = TEAMS.lar; lar.order = [lar.players.find(p => p.id === 'kev')].concat(lar.order.filter(p => p.id !== 'kev'));
    cfg.scenario.battingFirst = 1;
    game.go('match', { cfg, hooks: { onEnd: m => { const i = m.innings[1]; game.go('scores', { mode: 'bowl', score: Math.max(0, (14 - i.runs) * 10 + i.wkts * 25), back: 'showdown' }); } } });
  },
  update(dt) { if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; } this.menu.update(dt, game.input); },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0618')); E.font.title(g, 'SUPER OVER SHOWDOWN', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#ffffff', '#c8a0ff', '#7a3aff'], depth: 2 }); UI.text(g, 'THE THRUMPTON MEGADOME - MIDNIGHT', r.W / 2, 40, '#ffcf3a', { align: 'center' }); this.menu.draw(g, r); UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]); });
  }
};
/* ---- high scores: initials on a letter wheel, then the table ---- */
scenes.scores = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; Idle.reset(); this.entering = false; if (!d.view && d.score !== undefined && cab.qualifies(d.score, d.mode)) { this.entering = true; cab.enter(d.score, d.mode, () => { this.entering = false; }); } },
  update(dt) {
    this.t += dt; cab.update(dt); if (this.entering) return;
    const I = game.input; if (this.t > .8 && (I.pressed('confirm') || I.pressed('cancel') || (I.clicked && I.clicked()))) { I.consumeAll(); game.go(this.d.back || 'title'); }
  },
  draw(r) {
    r.sky(['#0a0618', '#1a1040', '#2a1a5a']);
    r.overlay(g => { E.font.title(g, { bat: 'SHOWDOWN: BAT', bowl: 'SHOWDOWN: BOWL', sixmachine: 'THE SIX MACHINE' }[this.d.mode] || 'HIGH SCORES', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd36a', '#c8a040'] }); if (this.d.score !== undefined && !this.d.view) UI.text(g, 'YOUR SCORE: ' + this.d.score, r.W / 2, 34, '#ffffff', { align: 'center' }); });
    if (!this.entering) cab.drawTable(r, this.d.mode, 50, 'TOP TEN');
    cab.draw(r);
    r.overlay(g => { if (!this.entering) UI.footer(g, r, game.input, [['confirm', 'CONTINUE']]); });
  }
};
K.showdownBat = showdownBat; K.SHOWDOWN_BALLS = SHOWDOWN_BALLS;
