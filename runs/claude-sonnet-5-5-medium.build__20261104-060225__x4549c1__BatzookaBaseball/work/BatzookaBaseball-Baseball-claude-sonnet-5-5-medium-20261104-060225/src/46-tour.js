/* BATZOOKA BASEBALL: the Tour. Four ballparks and a boss, story scenes with babbling voices, Fan Bucks and the
   clubhouse's upgrades. Progress is saved. */
BZ.tourLoad = () => E.store.get('bz.tour', null);
BZ.tourSave = t => E.store.set('bz.tour', t);
BZ.tourNew = () => ({ stop: 0, bucks: 0, up: { bat: 0, legs: 0, arm: 0, meter: 0 }, finished: false });
const voiceOf = name => { const h = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 3); return .7 + (Math.abs(h) % 70) / 100; };
const portraitCache = {};
function portraitFor(name) {
  if (portraitCache[name]) return portraitCache[name];
  for (const id of TEAM_IDS) { const T = BZ.get('teams', id), p = T.players.find(x => x.name === name); if (p) { const rig = BZ.makeRig(T, p, false); rig.update(.01, { x: 0, y: 0, z: 0, facing: PI / 2, vx: 0, vy: 0 }); return portraitCache[name] = rig; } }
  return null;
}
/* a story scene: a list of [speaker, line] told in a dialog box over the park; then next() */
BZ.scenes.story = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; BZ.stage.start(d.park || 'corn', 6); game.setZoom(.85); game.lights.enabled = false;
    this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd23a' });
    this.i = 0; this.done = false; this.title = d.title || ''; this.t = 0;
    BZ.music(d.park === 'moon' ? 'moon' : 'tense'); this.show();
  },
  show() {
    const L = this.d.lines[this.i]; if (!L) { this.done = true; return; }
    const [who, text] = L; BZ.babble(text, voiceOf(who), .08);
    this.talk.say(text, { name: who, portrait: portraitFor(who), onDone: () => { this.i++; this.show(); } });
  },
  update(dt) {
    this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt);
    this.talk.update(dt);
    if (this.t > .5 && game.input.pressed('cancel')) { this.talk.close(); this.done = true; }
    if (this.done) { this.done = false; this.d.next && this.d.next(); }
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => { if (this.title) { px.rect(g, 0, 0, r.W, 18, 'rgba(6,8,22,.75)'); E.font.title(g, this.title, r.W / 2, 4, { scale: 1, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' }); } BZ.prompt(g, game, r.W - 130, 4, 'cancel', 'Skip'); });
    this.talk.draw(r);
  }
};
BZ.scenes.tour = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 21); game.setZoom(.8); game.lights.enabled = false; this.save = BZ.tourLoad();
    const rows = [];
    if (this.save) rows.push({ label: this.save.finished ? 'TOUR COMPLETE - PLAY AGAIN' : 'CONTINUE THE TOUR', fn: () => this.save.finished ? this.fresh() : game.go('tourmap') });
    rows.push({ label: this.save ? 'NEW TOUR (ERASES SAVE)' : 'BEGIN THE TOUR', fn: () => this.fresh() });
    rows.push({ label: 'BACK', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
  },
  fresh() { BZ.tourSave(BZ.tourNew()); const intro = [['BUSTER', 'Folks, gather round. The bank wants the cornfield ballpark by Friday, and my banjo is not worth much.'], ['MABEL', 'So we take the Haymakers on the road, win four ballgames, and bring home enough hay to pay it off.'], ['BUSTER', 'Four games. Four parks. One cornfield to save. Load the wagon!']]; game.go('story', { park: 'corn', title: 'THE BARNSTORMING TOUR', lines: intro, next: () => game.go('tourmap') }); },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => { const W_ = r.W, w = 236, x = (W_ - w) / 2; frameBox(g, x - 8, 30, w + 16, 130, 'THE TOUR'); this.list.draw(g, x, 62, w, 20); E.font.text(g, 'Save the cornfield. Four parks. One boss.', W_ / 2, 140, '#ffe7a8', { align: 'center', shadow: '#000', outline: false }); });
  }
};
BZ.scenes.tourmap = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    this.t = BZ.tourLoad() || BZ.tourNew(); BZ.stage.start((BZ.TOUR[Math.min(this.t.stop, 3)] || BZ.TOUR[0]).park, 31); game.setZoom(.8); game.lights.enabled = false;
    const st = this.t.stop;
    const rows = [];
    if (st < BZ.TOUR.length) rows.push({ label: 'PLAY: ' + BZ.TOUR[st].title, fn: () => this.play() });
    rows.push({ label: 'CLUBHOUSE', fn: () => game.go('clubhouse') }, { label: 'BACK', fn: () => game.go('tour') });
    this.list = new OptionList(rows, { onCancel: () => game.go('tour') });
    BZ.music('title');
  },
  play() {
    const t = this.t, S = BZ.TOUR[t.stop];
    const startGame = () => game.go('match', {
      park: S.park, away: { team: 'hay' }, home: { team: S.opp }, innings: S.innings, diff: S.diff, humans: [true, false], seed: 500 + t.stop * 17,
      tour: { up: t.up, reward: S.fan, after: (won, M, toMap) => this.after(won, M, toMap) }
    });
    game.go('story', { park: S.park, title: S.title, lines: S.pre, next: startGame });
  },
  after(won, M, toMap) {
    const t = BZ.tourLoad() || BZ.tourNew(), S = BZ.TOUR[t.stop];
    if (!won) return game.go(toMap ? 'tourmap' : 'tourmap');
    t.bucks += S.fan; t.stop++; if (t.stop >= BZ.TOUR.length) t.finished = true; BZ.tourSave(t);
    const lines = S.post.slice(); if (t.finished) lines.push(['BUSTER', 'And that is a wrap on the Great Cornfield Tour. Thanks for playing, friend. Go hit one into orbit.']);
    game.go('story', { park: S.park, title: 'FULL TIME', lines, next: () => game.go(t.finished ? 'about' : 'clubhouse') });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, t = this.t, w = 280, x = (W_ - w) / 2;
      frameBox(g, x - 6, 8, w + 12, H_ - 16, 'THE TOUR');
      // the road: four stops and a boss
      BZ.TOUR.forEach((s, i) => {
        const cx = x + 30 + i * 74, cy = 62, done = i < t.stop, cur = i === t.stop;
        if (i) px.line(g, cx - 74 + 10, cy, cx - 10, cy, done ? '#9aff9a' : '#444466', 2);
        px.disc(g, cx, cy, 11, '#10101c'); px.disc(g, cx, cy, 9, done ? '#3a9a5a' : cur ? '#ffd23a' : '#2a2a48');
        E.font.text(g, done ? '✓' : String(i + 1), cx - 2, cy - 3, '#ffffff', { outline: false });
        E.font.text(g, BZ.get('parks', s.park).name.split(' ')[0], cx, cy + 14, cur ? '#ffd23a' : '#9898b8', { align: 'center', outline: false });
        if (s.boss) E.font.text(g, 'BOSS', cx, cy - 22, '#ff6a6a', { align: 'center', outline: false });
      });
      E.font.text(g, 'FAN BUCKS ' + t.bucks, x + 12, 96, '#9aff9a', { shadow: '#000', outline: false });
      const up = t.up; E.font.text(g, 'BAT ' + up.bat + '  LEGS ' + up.legs + '  ARM ' + up.arm + '  CROWD ' + up.meter, x + w - 12, 96, '#b8b8d8', { align: 'right', outline: false });
      this.list.draw(g, x + 8, 118, w - 16, 20);
      if (t.stop < BZ.TOUR.length) { const S = BZ.TOUR[t.stop]; E.font.text(g, BZ.get('parks', S.park).sub, W_ / 2, 176, '#ffe7a8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'vs ' + BZ.get('teams', S.opp).name + ' - ' + S.innings + ' innings', W_ / 2, 188, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
      else E.font.text(g, 'TOUR COMPLETE. THE CORNFIELD IS SAVED!', W_ / 2, 180, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
BZ.scenes.clubhouse = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() { this.t = BZ.tourLoad() || BZ.tourNew(); BZ.stage.start('corn', 33); game.setZoom(.8); game.lights.enabled = false; this.msg = 'Spend your Fan Bucks. The crowd pays for polish.'; this.build(); },
  build() {
    const rows = BZ.UPGRADES.map(u => { const lv = this.t.up[u.id], cost = u.cost[lv]; return { label: u.name + '  Lv ' + lv + '/' + u.max, fn: () => this.buy(u), tail: lv >= u.max ? 'MAXED' : cost + ' FB', desc: u.desc }; });
    rows.push({ label: 'TOUR MAP', fn: () => game.go('tourmap') });
    this.list = new OptionList(rows, { onCancel: () => game.go('tourmap'), start: this.list ? this.list.i : 0 }); this.rows = rows;
  },
  buy(u) { const lv = this.t.up[u.id]; if (lv >= u.max) { this.msg = 'Already maxed out. You are a legend.'; return; } const c = u.cost[lv]; if (this.t.bucks < c) { this.msg = 'Not enough Fan Bucks. Go win something.'; BZ.sfx('groan'); return; } this.t.bucks -= c; this.t.up[u.id]++; BZ.tourSave(this.t); this.msg = u.name + ' bought!'; BZ.sfx('coin'); this.build(); },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, w = 280, x = (W_ - w) / 2;
      frameBox(g, x - 6, 14, w + 12, 190, 'CLUBHOUSE');
      E.font.text(g, 'FAN BUCKS ' + this.t.bucks, W_ / 2, 34, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      this.list.draw(g, x + 8, 50, w - 16, 20);
      this.rows.forEach((rw, i) => { if (rw.tail) E.font.text(g, rw.tail, x + w - 14, 50 + i * 20 + 2, rw.tail === 'MAXED' ? '#9aff9a' : '#ffe070', { align: 'right', outline: false }); });
      const cur = this.rows[this.list.i]; if (cur && cur.desc) E.font.text(g, cur.desc, W_ / 2, 160, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, this.msg, W_ / 2, 176, '#ffffff', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
