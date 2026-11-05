/* BATZOOKA BASEBALL: the menu scenes. Title (with a live CPU game behind it and the attract mode after 10 idle
   seconds), exhibition setup, results, Spring Training, Home Run Derby setup, About, and the touch-only notice. */
BZ.touchOnly = () => { try { return location.hash === '#touch' || (('ontouchstart' in window || navigator.maxTouchPoints > 0) && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean))); } catch (e) { return false; } };
const TEAM_IDS = ['hay', 'lem', 'cin', 'meg'], PARK_IDS = ['corn', 'moon', 'magma', 'mega'];

/* a list of rows that change with left/right (or a click on the arrows), buttons that run on confirm; mouse hover moves the focus */
class OptionList {
  constructor(rows, o = {}) { this.rows = rows; this.i = o.start || 0; this.o = o; this.rects = []; }
  value(k) { const r = this.rows.find(x => x.key === k); return r ? r.vals[r.idx][0] : null; }
  update(dt) {
    const I = game.input, n = this.rows.length;
    let moved = false;
    if (I.repeat('up', .3, .1)) { this.i = (this.i + n - 1) % n; moved = true; }
    if (I.repeat('down', .3, .1)) { this.i = (this.i + 1) % n; moved = true; }
    const row = this.rows[this.i];
    const dir = (I.repeat('right', .3, .12) ? 1 : 0) - (I.repeat('left', .3, .12) ? 1 : 0);
    if (dir && row.vals) this.change(row, dir);
    if (I.pressed('confirm') || I.pressed('start')) { if (row.vals && !row.fn) this.change(row, 1); else if (row.fn) { BZ.sfx('coin'); row.fn(this); } }
    if (I.pressed('cancel') && this.o.onCancel) this.o.onCancel();
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse') {
      const S = game.screen.S, mx = p[0] / S, my = p[1] / S;
      for (const rc of this.rects) if (mx >= rc.x && mx <= rc.x + rc.w && my >= rc.y && my <= rc.y + rc.h) {
        const was = this.i; if (rc.i !== this.i && (this.lastMx !== mx || this.lastMy !== my)) this.i = rc.i;
        if (I.pressed('swing') || I.pressed('confirm')) { this.i = rc.i; const rw = this.rows[rc.i]; if (rw.vals) this.change(rw, mx > rc.x + rc.w / 2 ? 1 : -1); else if (rw.fn) { BZ.sfx('coin'); rw.fn(this); } }
      }
      this.lastMx = mx; this.lastMy = my;
    }
    if (moved) BZ.sfx('tick');
  }
  change(row, dir) { row.idx = (row.idx + dir + row.vals.length) % row.vals.length; BZ.sfx('tick'); if (row.onChange) row.onChange(row.vals[row.idx][0], this); }
  draw(g, x, y, w, rh = 17) {
    this.rects = [];
    this.rows.forEach((row, i) => {
      const yy = y + i * rh, sel = i === this.i;
      if (sel) { px.rect(g, x, yy - 2, w, rh - 2, 'rgba(255,210,58,.22)'); px.rect(g, x, yy - 2, 2, rh - 2, '#ffd23a'); }
      E.font.text(g, row.label, x + 8, yy + 2, sel ? '#ffffff' : '#b8b8d8', { shadow: '#000', outline: false });
      if (row.vals) {
        const t = row.vals[row.idx][1], tw = E.font.width(t);
        E.font.text(g, '←', x + w - tw - 24, yy + 2, sel ? '#ffd23a' : '#6a6a8a', { outline: false }); E.font.text(g, t, x + w - tw - 12, yy + 2, '#ffe070', { shadow: '#000', outline: false }); E.font.text(g, '→', x + w - 9, yy + 2, sel ? '#ffd23a' : '#6a6a8a', { outline: false });
      }
      this.rects.push({ i, x, y: yy - 2, w, h: rh - 2 });
    });
  }
}
BZ.OptionList = OptionList;
const optRow = (label, key, vals, idx = 0, extra = {}) => Object.assign({ label, key, vals, idx }, extra);
const frameBox = (g, x, y, w, h, title) => { px.rect(g, x, y, w, h, 'rgba(8,10,26,.88)'); px.rect(g, x, y, w, 1, '#ffd23a'); px.rect(g, x, y + h - 1, w, 1, '#ffd23a'); px.rect(g, x, y, 1, h, '#ffd23a'); px.rect(g, x + w - 1, y, 1, h, '#ffd23a'); if (title) E.font.title(g, title, x + w / 2, y + 6, { scale: 2, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' }); };
BZ.frameBox = frameBox; BZ.optRow = optRow;

/* ---- a field backdrop shared by menu scenes: the park from a high camera, a CPU game running quietly ---- */
BZ.stage = {
  start(parkId, seedOff) {
    const ids = PARK_IDS; BZ.clearListeners();
    BZ.newMatch({ park: parkId || 'corn', attract: true, diff: .9, innings: 9, seed: 40 + (seedOff || 0), away: { team: 'hay' }, home: { team: 'cin' } });
    BZ.M.noIntro = true; BZ.M.attract = true; BZ.hudReset(); BZ.hudBind(); BZ.stage.park = BZ.buildPark(BZ.M.parkDef); BZ.M.mute = true;
    BZ.cosmetic = true; BZ.stage.t = 0;
  },
  update(dt) { const M = BZ.M; if (!M) return; BZ.hudUpdate(dt); BZ.updateSim(dt); BZ.updateRigs(dt, M); BZ.umpireUpdate(dt); if (M.over) BZ.stage.start(M.parkDef.id, Math.floor(game.time)); BZ.stage.t += dt; },
  draw(r, cx, cy) {
    const M = BZ.M; if (!M) return; const P = BZ.stage.park || BZ.buildPark(M.parkDef);
    P.map.drawFloor(r); BZ.drawField(r, M); P.map.queueWalls(r); BZ.drawScenery(r, M); BZ.drawCrowd(r, M, .25);
    const bs = M.sides[M.half], ds = M.sides[1 - M.half];
    for (const a of ds.actors) if (a.rig) BZ.drawActor(r, a, a.rig, M);
    for (const rn of M.runners) if (rn.state === 'run' && rn.actor.rig) BZ.drawActor(r, rn.actor, rn.actor.rig, M);
    if (M.batter && M.batter.rig && !M.runners.find(q => q.actor === M.batter)) BZ.drawActor(r, M.batter, M.batter.rig, M);
    r.actor(G.HX, G.HY + 36, 0, (g, ox, oy) => BZ.umpireRig.draw(g, ox, oy, r.view));
    BZ.drawBall(r, M);
  },
  camera(dt, mode) {
    const M = BZ.M; let tx = G.HX, ty = G.HY - 170;
    if (M && M.phase === 'play') { tx = G.HX + M.ball.x * .6; ty = G.HY + M.ball.y * .6; }
    BZ.stage.cx = lerp(BZ.stage.cx || tx, tx, Math.min(1, dt * 2)); BZ.stage.cy = lerp(BZ.stage.cy || ty, ty, Math.min(1, dt * 2));
    game.focus(BZ.stage.cx, BZ.stage.cy, 0);
  }
};

/* ---- the title ---- */
BZ.scenes.title = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 0); game.lights.enabled = false; game.weather = { kind: 'leaves', amount: .25, wind: .3 }; game.resetCamera(); game.setZoom(.5); BZ.stage.cx = G.HX; BZ.stage.cy = G.HY - 170;
    const touch = BZ.touchOnly();
    this.touch = touch; this.idle = 0; this.sub = null;
    const items = touch ? [] : ['PLAY BALL', 'THE TOUR', 'HOME RUN DERBY', 'SPRING TRAINING', 'OPTIONS', 'ABOUT'];
    this.menu = new E.Menu(game, items, { x: 'center', y: 118, onPick: (i, it) => this.pick(it) });
    BZ.music('title'); game.cam.bounds = null; this.t = 0;
    this.best = E.store.get('bz.derbybest', 0);
    game.input.consumeAll();
    if (BZ.deepLink) BZ.deepLink();
  },
  exit() { game.weather = null; },
  pick(label) {
    BZ.sfx('coin');
    if (label === 'PLAY BALL') game.go('setup'); else if (label === 'THE TOUR') game.go('tour'); else if (label === 'HOME RUN DERBY') game.go('derbysetup');
    else if (label === 'SPRING TRAINING') game.go('training'); else if (label === 'OPTIONS') game.menu('settings'); else if (label === 'ABOUT') game.go('about');
  },
  update(dt) {
    this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt);
    const I = game.input;
    if (I.anyPressed() || (I.pointerMoved && I.pointerMoved()) || (I.move()[0] || I.move()[1])) this.idle = 0; else this.idle += dt;
    if (!this.touch) this.menu.update(dt);
    if (this.touch && (I.pressed('start') || I.clicked && I.clicked())) game.menu('settings');
    if (this.idle >= 10) { this.startAttract(); }
  },
  startAttract() {
    const n = (this.attractN = (this.attractN || 0) + 1), parks = PARK_IDS, teams = [['hay', 'cin'], ['lem', 'meg'], ['cin', 'hay'], ['meg', 'lem']];
    game.go('match', { attract: true, park: parks[n % 4], seed: 100 + n, away: { team: teams[n % 4][0] }, home: { team: teams[n % 4][1] }, innings: 9, diff: .8, humans: [false, false] });
  },
  draw(r) {
    game.lights.enabled = false;
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H;
      px.rect(g, 0, 0, W_, 92, 'rgba(6,8,22,.55)');
      E.font.title(g, 'BATZOOKA', W_ / 2, 8, { scale: 4, colors: ['#fff6c8', '#ffd23a', '#ff8a2a'], outline: '#2a0c10', depth: 3, depthColor: '#7a2a10', align: 'center' });
      E.font.title(g, 'BASEBALL', W_ / 2, 46, { scale: 3, colors: ['#ffffff', '#9ad0ff', '#4a7ae0'], outline: '#0c1230', depth: 2, depthColor: '#1a2a70', align: 'center' });
      // a rocket-bat flourish
      const bx = W_ / 2 + 120, by = 34; px.line(g, bx - 18, by + 12, bx + 16, by - 12, '#c89a5a', 4); px.line(g, bx - 18, by + 12, bx + 16, by - 12, '#e8c080', 1); px.poly(g, [[bx - 20, by + 14], [bx - 30, by + 22], [bx - 24, by + 10]], (Math.floor(game.time * 12) % 2) ? '#ffd23a' : '#ff6a20');
      if (this.touch) {
        px.rect(g, 0, H_ / 2 - 20, W_, 40, 'rgba(6,8,22,.85)'); E.font.title(g, 'CONTROLLER OR KEYBOARD REQUIRED', W_ / 2, H_ / 2 - 8, { scale: 1, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' });
        E.font.text(g, 'Tap the menu button (top right) for settings', W_ / 2, H_ / 2 + 8, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
      } else {
        this.menu.y = Math.max(96, H_ - 6 * 20 - 24);
        px.rect(g, W_ / 2 - 74, this.menu.y - 8, 148, 6 * 20 + 8, 'rgba(6,8,22,.7)');
      }
      E.font.text(g, 'v' + BZ.version + '   (c) 2026 Barnstorm Games   ' + (this.idle > 5 ? 'Demo in ' + Math.ceil(10 - this.idle) : ''), W_ / 2, H_ - 8, '#8888aa', { align: 'center', shadow: '#000', outline: false });
      if (this.best) E.font.text(g, 'DERBY BEST ' + this.best, W_ - 6, H_ - 18, '#ffe070', { align: 'right', shadow: '#000', outline: false });
      if (!this.touch) { let x = 6; const y = H_ - 20; x += BZ.prompt(g, game, x, y, 'confirm', 'Select', {}) + 4; }
    });
    if (!this.touch) this.menu.draw(r);
  }
};

/* ---- exhibition setup ---- */
BZ.scenes.setup = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 3); game.setZoom(.5); game.lights.enabled = false; this.pi = 0;
    const teams = TEAM_IDS.map(t => [t, BZ.get('teams', t).name]), parks = PARK_IDS.map(p => [p, BZ.get('parks', p).name]);
    const inn = [[1, '1'], [3, '3'], [5, '5'], [9, '9']], lv = [['rookie', 'ROOKIE'], ['pro', 'PRO'], ['allstar', 'ALL-STAR']];
    this.list = new OptionList([
      optRow('YOUR TEAM', 'away', teams, 0), optRow('OPPONENT', 'home', teams, 2), optRow('BALLPARK', 'park', parks, 0, { onChange: () => this.refreshPark() }),
      optRow('INNINGS', 'inn', inn, 1), optRow('CPU LEVEL', 'lv', lv, ['rookie', 'pro', 'allstar'].indexOf(game.settings.cpuLevel) < 0 ? 1 : ['rookie', 'pro', 'allstar'].indexOf(game.settings.cpuLevel), { onChange: v => game.settings.set('cpuLevel', v) }),
      optRow('PLAYERS', 'pl', [[1, '1 PLAYER'], [2, '2 PLAYERS']], 0),
      { label: 'PLAY BALL!', fn: l => this.go() }, { label: 'BACK', fn: l => game.go('title') }], { onCancel: () => game.go('title') });
  },
  refreshPark() { const id = this.list.value('park'); BZ.stage.start(id, 5); },
  go() {
    const L = this.list, pl = L.value('pl');
    if (pl === 2 && game.players.length < 2) game.addPlayer({ keys: 'right' });
    game.go('match', { away: { team: L.value('away') }, home: { team: L.value('home') }, park: L.value('park'), innings: L.value('inn'), humans: [true, pl === 2], diff: BZ.levelDiff() });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 238, x = (W_ - w) / 2, y = 22;
      frameBox(g, x - 6, y - 4, w + 12, 8 * 17 + 76, 'PLAY BALL');
      this.list.draw(g, x, y + 24, w);
      const P = BZ.get('parks', this.list.value('park')), T = BZ.get('teams', this.list.value('away'));
      E.font.text(g, P.sub, W_ / 2, y + 8 * 17 + 32, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      const wr = E.font.wrap(T.blurb, w); E.font.text(g, wr[0] || '', W_ / 2, y + 8 * 17 + 44, '#b8b8d8', { align: 'center', shadow: '#000', outline: false }); if (wr[1]) E.font.text(g, wr[1], W_ / 2, y + 8 * 17 + 54, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
      if (this.list.value('pl') === 2) E.font.text(g, 'P2: keyboard arrows + . / ,  or a second controller', W_ / 2, H_ - 26, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      BZ.prompt(g, game, 6, H_ - 14, 'confirm', 'Choose'); BZ.prompt(g, game, 80, H_ - 14, 'cancel', 'Back');
    });
  }
};

/* ---- results ---- */
BZ.scenes.results = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; this.S = d.M; this.t = 0; BZ.stage.start(this.S.park, 8); game.setZoom(.5);
    const win = this.S.winner, human = this.S.humans;
    const you = human[0] ? 0 : human[1] ? 1 : 0;
    this.won = win === you; this.tie = win < 0;
    BZ.music(this.won ? 'victory' : 'tense');
    const tour = d.data && d.data.tour;
    const rows = [];
    if (tour) { rows.push({ label: this.won ? 'CONTINUE THE TOUR' : 'TRY AGAIN', fn: () => d.data.tour.after(this.won, this.S) }); if (this.won || true) rows.push({ label: 'TOUR MAP', fn: () => d.data.tour.after(this.won, this.S, true) }); }
    else { rows.push({ label: 'REMATCH', fn: () => game.go('match', Object.assign({}, d.data, { seed: (d.data.seed || 1) + 7 })) }); rows.push({ label: 'NEW GAME SETUP', fn: () => game.go('setup') }); }
    rows.push({ label: 'MAIN MENU', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
    this.fan = 0; if (tour && this.won) this.fan = tour.reward || 0;
  },
  update(dt) { this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt); if (this.t > .6) this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    const S = this.S, T = S.teams.map(t => BZ.get('teams', t));
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 270, x = (W_ - w) / 2, y = 10;
      frameBox(g, x, y, w, H_ - 20, this.tie ? 'IT\'S A TIE' : this.won ? 'YOU WIN!' : 'GAME OVER');
      // line score
      const n = Math.max(S.innings, S.line[0].length, S.line[1].length, 3), cw = 14, ly = y + 30;
      E.font.text(g, 'TEAM', x + 8, ly, '#8888bb', { outline: false });
      for (let i = 0; i < n; i++) E.font.text(g, String(i + 1), x + 100 + i * cw, ly, '#8888bb', { outline: false });
      E.font.text(g, 'R', x + 104 + n * cw, ly, '#ffd23a', { outline: false }); E.font.text(g, 'H', x + 120 + n * cw, ly, '#9ad0ff', { outline: false });
      for (let s = 0; s < 2; s++) {
        const yy = ly + 12 + s * 12; px.rect(g, x + 8, yy + 1, 5, 7, T[s].chip); E.font.text(g, T[s].short + (S.humans[s] ? ' *' : ''), x + 16, yy, '#ffffff', { outline: false });
        for (let i = 0; i < n; i++) E.font.text(g, S.line[s][i] === undefined ? (i < S.inn ? '-' : '') : String(S.line[s][i]), x + 100 + i * cw, yy, '#e8e8ff', { outline: false });
        E.font.text(g, String(S.score[s]), x + 104 + n * cw, yy, '#ffd23a', { outline: false }); E.font.text(g, String(S.stat[s].h), x + 120 + n * cw, yy, '#9ad0ff', { outline: false });
      }
      let sy = ly + 42;
      const stats = [['HOME RUNS', 'hr'], ['STRIKEOUTS', 'k'], ['WALKS', 'bb'], ['STOLEN BASES', 'sb'], ['CATCHES', 'catches'], ['DOUBLE PLAYS', 'dp'], ['BATZOOKA ROBS', 'robs']];
      for (const [lab, k] of stats) { E.font.text(g, lab, x + 20, sy, '#b8b8d8', { outline: false }); E.font.text(g, String(S.stat[0][k]), x + 150, sy, '#ffffff', { align: 'right', outline: false }); E.font.text(g, String(S.stat[1][k]), x + 200, sy, '#ffffff', { align: 'right', outline: false }); sy += 10; }
      if (S.best) E.font.text(g, 'LONGEST HOMER ' + BZ.feet(S.best) + ' FT', x + w / 2, sy + 2, '#ffe070', { align: 'center', outline: false });
      if (this.fan) E.font.text(g, '+' + this.fan + ' FAN BUCKS', x + w / 2, sy + 14, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      this.list.draw(g, x + 30, H_ - 24 - this.list.rows.length * 16, w - 60, 16);
    });
  }
};

/* ---- Spring Training ---- */
BZ.scenes.training = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 11); game.setZoom(.5); game.lights.enabled = false;
    const done = E.store.get('bz.lessons', {});
    const rows = [1, 2, 3, 4, 5].map(n => { const L = BZ.get('lessons', n); return { label: (done[n] ? '★ ' : '') + n + '. ' + L.name, fn: () => game.go('match', { lesson: n, humans: [true, false], park: 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 99, diff: n === 3 ? 1 : .35, onUpdate: (sc) => { } }) }; });
    rows.push({ label: 'BACK', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 270, x = (W_ - w) / 2, y = 24;
      frameBox(g, x - 4, y - 8, w + 8, 190, 'SPRING TRAINING');
      this.list.draw(g, x + 4, y + 22, w - 8, 18);
      const i = this.list.i, L = BZ.get('lessons', i + 1);
      if (L) { const ls = E.font.wrap(L.hint, w - 10); ls.slice(0, 3).forEach((t, k) => E.font.text(g, t, W_ / 2, y + 140 + k * 10, '#ffe7a8', { align: 'center', shadow: '#000', outline: false })); }
      BZ.prompt(g, game, 6, H_ - 14, 'confirm', 'Start lesson'); BZ.prompt(g, game, 96, H_ - 14, 'cancel', 'Back');
    });
  }
};
BZ.on0 = null;
BZ.markLesson = n => { const d = E.store.get('bz.lessons', {}); d[n] = true; E.store.set('bz.lessons', d); };

/* ---- Derby setup ---- */
BZ.scenes.derbysetup = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 17); game.setZoom(.5); game.lights.enabled = false;
    this.list = new OptionList([
      optRow('PLAYERS', 'pl', [[1, '1'], [2, '2'], [3, '3'], [4, '4']], 0), optRow('OUTS', 'outs', [[5, '5'], [7, '7'], [10, '10']], 1),
      optRow('BALLPARK', 'park', PARK_IDS.map(p => [p, BZ.get('parks', p).name]), 0, { onChange: () => BZ.stage.start(this.list.value('park'), 9) }),
      { label: 'STEP UP!', fn: () => this.go() }, { label: 'BACK', fn: () => game.go('title') }], { onCancel: () => game.go('title') });
    BZ.music('derby');
  },
  go() {
    const n = this.list.value('pl'); while (game.players.length < n) { if (!game.addPlayer({ keys: game.players.length === 1 ? 'right' : undefined })) break; }
    game.go('match', { derby: true, park: this.list.value('park'), players: ['P1', 'P2', 'P3', 'P4'].slice(0, n), outs: this.list.value('outs'), humans: [true, false], seed: (Date.now() & 0xfff) + 1, innings: 99 });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 230, x = (W_ - w) / 2, y = 34;
      frameBox(g, x - 6, y - 8, w + 12, 150, 'HOME RUN DERBY');
      this.list.draw(g, x, y + 24, w);
      E.font.text(g, 'Pitches come straight down the pipe. Hit them far.', W_ / 2, y + 128, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, 'Players take turns on one screen.', W_ / 2, y + 138, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
/* derby ending: initials on the engine's letter wheel, then the table */
BZ.scenes.derbyend = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; BZ.stage.start('corn', 2); game.setZoom(.5); this.arc = new E.Arcade(game, { id: 'batzooka-derby', lives: 1, hud: false });
    this.arc.start(1); this.step = 0; this.t = 0;
    const res = d.players.slice().sort((a, b) => b.score - a.score); this.res = res; this.pi = 0;
    BZ.music('victory');
    this.next();
  },
  next() {
    const p = this.res[this.pi]; if (!p) { this.step = 2; return; }
    if (this.arc.qualifies(p.score, 'derby')) { this.step = 1; this.arc.enter(p.score, 'derby', name => { this.pi++; this.next(); }); }
    else { this.pi++; this.next(); }
    const best = E.store.get('bz.derbybest', 0); if (p.score > best) E.store.set('bz.derbybest', p.score);
  },
  update(dt) {
    BZ.stage.update(dt); BZ.stage.camera(dt); this.t += dt; this.arc.update(dt);
    if (this.step === 2 && this.t > .8 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.pressed('cancel'))) game.go('title');
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W;
      if (this.step === 2) {
        frameBox(g, W_ / 2 - 130, 14, 260, 210, 'DERBY RESULTS');
        this.res.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + p.score + ' pts   ' + p.hr + ' HR   best ' + p.best + ' ft', W_ / 2, 44 + i * 11, i === 0 ? '#ffe070' : '#e8e8ff', { align: 'center', shadow: '#000', outline: false }));
        this.arc.drawTable(r, 'derby', 100, 'HALL OF FAME');
        BZ.prompt(g, game, W_ / 2 - 30, 218, 'confirm', 'Done');
      }
    });
    if (this.step === 1) this.arc.draw(r);
  }
};

/* ---- About / Credits (the Source Information and feedback live here) ---- */
BZ.scenes.about = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() { BZ.stage.start('moon', 4); game.setZoom(.5); this.page = 0; this.scroll = 0; game.lights.enabled = false; BZ.music('title'); },
  update(dt) {
    BZ.stage.update(dt); BZ.stage.camera(dt);
    const I = game.input;
    if (I.pressed('cancel') || I.pressed('pause')) { game.go('title'); return; }
    if (I.pressed('left')) { this.page = (this.page + BZ.ABOUT.length - 1) % BZ.ABOUT.length; this.scroll = 0; }
    if (I.pressed('right') || I.pressed('confirm')) { this.page = (this.page + 1) % BZ.ABOUT.length; this.scroll = 0; }
    if (I.repeat('down', .2, .03)) this.scroll += 4; if (I.repeat('up', .2, .03)) this.scroll = Math.max(0, this.scroll - 4);
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && I.pressed('swing')) { const S = game.screen.S; if (p[0] / S > game.W / 2) this.page = (this.page + 1) % BZ.ABOUT.length; else this.page = (this.page + BZ.ABOUT.length - 1) % BZ.ABOUT.length; this.scroll = 0; }
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = Math.min(W_ - 20, 380), x = (W_ - w) / 2, pg = BZ.ABOUT[this.page];
      frameBox(g, x, 6, w, H_ - 12, pg[0]);
      const lines = []; for (const para of pg[1].split('\n')) { if (!para) { lines.push(''); continue; } for (const l of E.font.wrap(para, w - 20)) lines.push(l); }
      const top = 30, bottom = H_ - 26, rows = Math.floor((bottom - top) / 9), maxS = Math.max(0, lines.length - rows) * 9;
      this.scroll = Math.min(this.scroll, maxS);
      const start = Math.floor(this.scroll / 9);
      for (let i = 0; i < rows; i++) { const l = lines[start + i]; if (l !== undefined) E.font.text(g, l, x + 10, top + i * 9, '#e8e8ff', { shadow: '#000', outline: false }); }
      if (maxS > 0) { px.rect(g, x + w - 6, top, 2, bottom - top, '#2a2a48'); px.rect(g, x + w - 6, top + (bottom - top - 12) * (this.scroll / maxS), 2, 12, '#ffd23a'); }
      E.font.text(g, (this.page + 1) + ' / ' + BZ.ABOUT.length, W_ / 2, H_ - 22, '#8888aa', { align: 'center', outline: false });
      BZ.prompt(g, game, x + 8, H_ - 14, 'left', ''); E.font.text(g, '← → Page   ↑ ↓ Scroll', x + 26, H_ - 12, '#aaaacc', { outline: false });
      BZ.prompt(g, game, x + w - 62, H_ - 14, 'cancel', 'Back');
    });
  }
};
