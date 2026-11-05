/* =====================================================================================================================
 * THE CHAMPON ROAD: the story ladder and the screens around it: the road (a painted scroll of the stops), cutscenes,
 * VS cards, promotions, the continue, game over, initials, the ending and the credits parade. KC.Save keeps the unlocks
 * and the top-ten tables; the story autosaves after each node (game.saves, the title's CONTINUE).
 * ===================================================================================================================== */
const TABLE0 = {
  story: [['MEI', 250000, 'CHAMP'], ['KYA', 180000, '8TH DAN'], ['ASA', 140000, '5TH DAN'], ['BUT', 110000, '3RD DAN'], ['IKA', 90000, '1ST DAN'], ['KIK', 70000, 'BROWN'], ['EBI', 50000, 'BLUE'], ['NEG', 30000, 'GREEN'], ['KAM', 15000, 'YELLOW'], ['TAR', 5000, 'WHITE']],
  boards: [['NEG', 6000], ['MEI', 5000], ['KAM', 4000], ['TAR', 3000], ['EBI', 2400], ['IKA', 2000], ['BUT', 1600], ['ASA', 1200], ['KIK', 800], ['KYA', 400]],
  pots: [['MEI', 9000], ['EBI', 7000], ['IKA', 6000], ['TAR', 5000], ['ASA', 4000], ['NEG', 3000], ['KAM', 2400], ['BUT', 1800], ['KIK', 1200], ['KYA', 600]],
  bull: [['BUT', 13000], ['KYA', 10000], ['MEI', 9000], ['NEG', 6000], ['TAR', 3000], ['EBI', 3000], ['IKA', 3000], ['ASA', 3000], ['KIK', 3000], ['KAM', 3000]]
};
KC.Save = {
  data: null,
  load() { const d = KC.store.get('save', null); this.data = { unlocks: {}, tables: {} }; if (d && typeof d === 'object') { Object.assign(this.data.unlocks, d.unlocks || {}); Object.assign(this.data.tables, d.tables || {}); } for (const k in TABLE0) if (!Array.isArray(this.data.tables[k])) this.data.tables[k] = TABLE0[k].map(([name, score, note]) => ({ name, score, note: note || '' })); },
  persist() { KC.store.set('save', this.data); },
  unlock(id) { if (!this.data) this.load(); if (!this.data.unlocks[id]) { this.data.unlocks[id] = true; this.persist(); return true; } return false; },
  unlocked(id) { if (!this.data) this.load(); return !!this.data.unlocks[id] || !!(KC.DEV && KC.DEV.unlockAll); },
  table(mode) { if (!this.data) this.load(); return this.data.tables[mode] || []; },
  /** a score makes the table (never while the tuning is changed: DEV) */
  qualifies(mode, score) { if (KC.tuneChanged() || score <= 0) return false; const T = this.table(mode); return T.length < 10 || score > T[T.length - 1].score; },
  enter(mode, name, score, note) { const T = this.table(mode); T.push({ name, score, note: note || '' }); T.sort((a, b) => b.score - a.score); T.length = Math.min(T.length, 10); this.persist(); return T.findIndex(e => e.name === name && e.score === score); },
  hi(mode) { const T = this.table(mode); return T.length ? T[0].score : 0; },
  reset() { this.data = null; KC.store.set('save', null); this.load(); }
};
KC.Story = {
  node: 0, rank: 'white', score: 0, lost: {}, assist: false, active: false, stats: { matches: 0, perfect: 0 },
  newGame() { Object.assign(this, { node: 0, rank: 'white', score: 0, lost: {}, assist: false, active: true, stats: { matches: 0, perfect: 0 } }); },
  state() { return { node: this.node, rank: this.rank, score: this.score, lost: this.lost, stats: this.stats, difficulty: KC.settings.difficulty }; },
  restore(d) { Object.assign(this, { node: d.node || 0, rank: d.rank || 'white', score: d.score || 0, lost: d.lost || {}, stats: d.stats || { matches: 0, perfect: 0 }, active: true, assist: false }); },
  get current() { return KC.DATA.ladder[this.node]; },
  rankName() { return KC.DATA.ranks[KC.rankIndex(this.rank)].name; },
  save() { const n = this.current; try { KC.game.saves.autosave(); } catch (e) { /* storage blocked */ } void n; },
  /** the next node, saved */
  advance() { this.node++; this.assist = false; this.save(); this.run(); },
  /** go to whatever the current node needs */
  run() {
    const n = this.current, g = KC.game;
    if (!n) { g.go('title'); return; }
    if (n.kind === 'cutscene') g.go('cutscene', { script: n.script, stage: n.stage, cast: n.script === 'prologue' ? ['taro', 'negi'] : ['taro'], next: () => this.advance() });
    else if (n.kind === 'ending') g.go('cutscene', this.endingData());
    else g.go('road', {});
  },
  /** start the node shown on the road (after its pre-match scene) */
  play() {
    const n = this.current, g = KC.game;
    if (n.kind === 'practice') g.go('practice', { lesson: n.lesson, story: true });
    else if (n.kind === 'bonus') { const go = () => g.go('bonus', { id: n.bonus, story: true }); if (n.script) g.go('cutscene', { script: n.script, stage: n.stage, cast: ['mei', 'taro'], next: go }); else go(); }
    else if (n.kind === 'match') { const go = () => g.go('vscard', this.matchData()); if (n.script) g.go('cutscene', { script: n.script, stage: n.stage, cast: n.opponent === 'mei' ? ['taro', 'mei'] : ['mei', 'taro'], meiGi: n.opponent === 'mei', next: go }); else go(); }
  },
  matchData() {
    const n = this.current, self = this, retry = () => KC.game.go('vscard', self.matchData());
    return { mode: 'story', stage: n.stage, hints: !!n.hints, mei: KC.STAGE[n.stage].mei && n.opponent !== 'mei' && this.node > 5, assist: this.assist, seed: this.node * 13 + (this.lost[n.opponent] || 0) + 1,
      sides: [{ fid: 'taro', rank: this.rank, input: KC.game.input }, { fid: n.opponent }], score: this.score, hi: KC.Save.hi('story'), retry,
      tip: (this.lost[n.opponent] || 0) >= 2 ? KC.FIGHTER[n.opponent].tip : null,
      onEnd: (w, b) => { b.storyResult = w; },
      afterEnd: (sc, dt) => { if (sc.endT < 1.2) return; sc.d.afterEnd = null; self.matchOver(sc.winner, sc.bout); } };
  },
  matchOver(w, b) {
    const n = this.current, g = KC.game;
    this.stats.matches++;
    if (w === 0) {
      this.score += b.score[0]; if (b.perfect) this.stats.perfect++;
      const from = this.rank; this.rank = n.promote || this.rank; const ri = KC.rankIndex(this.rank); this.score += 1000 * ri;
      if (n.unlock) KC.Save.unlock(n.unlock);
      g.go('promotion', { from, to: this.rank, next: () => { if (n.after) g.go('cutscene', { script: n.after, stage: n.stage, cast: ['mei', 'taro'], next: () => this.advance() }); else this.advance(); } });
    } else {
      this.lost[n.opponent] = (this.lost[n.opponent] || 0) + b.roundWins[1];
      g.go('continue', { opponent: n.opponent });
    }
  },
  endingData() { return { script: 'ending', stage: 'stadium', cast: ['taro', 'mei'], meiGi: true, trophy: true, next: () => { KC.Save.unlock('mei'); KC.Save.unlock('classic'); KC.game.go('credits', { story: true }); } }; }
};

/* ---- the road: a painted scroll of the stops, the next one pulsing ---- */
const ROAD_ICON = { practice: 'SCROLL', boards: 'BOARDS', pots: 'POTS', bull: 'BULL' };
KC.RoadScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter() { this.t = 0; this.pan = null; this.gone = false; KC.music('select'); KC.game.lights.enabled = false; this.stops = KC.DATA.ladder.map((n, i) => ({ n, i })).filter(s => s.n.kind !== 'cutscene' && s.n.kind !== 'ending'); this.hover = -1; },
  _xy(k, W, H) { return [60 + k * 74, Math.round(H * .54 + Math.sin(k * 1.3) * 20)]; },
  _face(fid) { this.faces = this.faces || {}; if (!this.faces[fid]) { const r = KC.makeRig(fid, 'red', null); for (let i = 0; i < 4; i++) r.update(.05, { x: 0, y: 0, z: 0, facing: PI / 2 + .4, expr: 'angry' }); this.faces[fid] = r; } return this.faces[fid]; },
  update(dt) {
    this.t += dt; const I = KC.game.input, cur = KC.Story.node, ci = this.stops.findIndex(s => s.i === cur), W = KC.game.W, H = KC.game.H;
    const want = clamp(this._xy(ci, W, H)[0] - W / 2, 0, Math.max(0, this._xy(this.stops.length - 1, W, H)[0] + 60 - W));
    this.pan = this.pan === null ? want : approach(this.pan, want, dt * 300);
    const p = I.pointer(), c = I.clicked(); this.hover = -1;
    this.stops.forEach((s, k) => { const [x, y] = this._xy(k, W, H), sx = x - this.pan; if (p && Math.hypot(p[0] - sx, p[1] - y) < 14) this.hover = k; if (c && s.i === cur && Math.hypot(c[0] - sx, c[1] - y) < 14) this._go(); });
    if (this.t > .4 && (KC.anyPressed('confirm') || KC.anyPressed('start'))) this._go();
    if (KC.anyPressed('cancel')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  _go() { if (this.gone) return; this.gone = true; KC.consumeAll(); KC.sfx('menuOk'); KC.Story.play(); },
  exit() { this.gone = false; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, cur = KC.Story.node;
      px.rect(g, 0, 0, W, H, '#2a1a10');
      px.rect(g, 0, 26, W, H - 60, '#e8d8b0'); for (let y = 30; y < H - 36; y += 3) px.rect(g, 0, y, W, 1, (y % 9) ? '#e4d2a8' : '#dccaa0');
      px.rect(g, 0, 26, W, 3, '#8a5a2a'); px.rect(g, 0, H - 37, W, 3, '#8a5a2a');
      // a painted vignette over each stop: its place in ink and wash
      this.stops.forEach((s, k) => { const [x0, y] = this._xy(k, W, H), x = Math.round(x0 - this.pan), up = k % 2 === 0, vy = up ? y - 58 : y + 22; if (x < -60 || x > W + 60) return; KC.roadVignette(g, s.n.stage, x, vy, this.t); });
      // the road
      this.stops.forEach((s, k) => { if (k) { const [x0, y0] = this._xy(k - 1, W, H), [x1, y1] = this._xy(k, W, H); for (let u = 0; u < 1; u += .08) px.rect(g, Math.round(lerp(x0, x1, u) - this.pan), Math.round(lerp(y0, y1, u)), 2, 2, s.i <= cur ? '#8a3a1a' : '#a8946a'); } });
      this.stops.forEach((s, k) => {
        const [x0, y] = this._xy(k, W, H), x = x0 - this.pan, n = s.n, done = s.i < cur, next = s.i === cur;
        if (x < -30 || x > W + 30) return;
        const R = next ? 11 + Math.round(Math.sin(this.t * 6) * 2) : 9;
        px.disc(g, x, y, R + 2, '#3a2010'); px.disc(g, x, y, R, done ? '#c8a060' : next ? '#ffd060' : '#bca880');
        if (n.kind === 'match') { const rig = this._face(n.opponent); rig.drawPortrait(g, x - R + 2, y - R + 2, 2 * R - 3, { zoom: 2.4, bg: done ? '#c8a060' : next ? '#ffd060' : '#bca880', tint: done ? '#a08060' : undefined }); }
        else E.font.text(g, n.kind === 'practice' ? 'L' + ({ lessonI: 'I', lessonII: 'II', lessonIII: 'III' }[n.lesson] || '') : ROAD_ICON[n.bonus][0] + ROAD_ICON[n.bonus][1], x, y - 3, '#2a1408', { align: 'center', outline: false, font: 'tiny' });
        if (done && n.promote) { const b = KC.DATA.ranks[KC.rankIndex(n.promote)].belt; px.rect(g, x - 8, y + R + 3, 16, 3, b); }
        if (k === this.hover || next) { const label = n.kind === 'match' ? KC.STAGE[n.stage].name : n.kind === 'practice' ? KC.LESSON[n.lesson].title : KC.BONUS[n.bonus].name, below = k % 2 === 0; const lw = E.font.width(label) + 8, ly = below ? y + R + 6 : y - R - 16; E.ui.box(g, x - lw / 2, ly - 2, lw, 12, { bg: '#5a2a10', border: '#ffd060', gradient: false }); E.font.text(g, label, x, ly, '#fff6d0', { align: 'center', outline: false }); }
      });
      E.font.title(g, 'THE CHAMPON ROAD', Math.round(W / 2), 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      const n = KC.Story.current, what = !n ? '' : n.kind === 'match' ? 'NEXT: ' + KC.STAGE[n.stage].name + ' - ' + KC.FIGHTER[n.opponent].name : n.kind === 'practice' ? 'NEXT: ' + KC.LESSON[n.lesson].title + ' WITH SENPAI NEGI' : 'NEXT: BONUS STAGE! ' + KC.BONUS[n.bonus].name;
      E.font.text(g, what, Math.round(W / 2), H - 30, '#fff6e8', { align: 'center', outline: '#1a0c08', scale: W > 380 ? 1 : 1 });
      E.font.text(g, KC.Story.rankName() + '   SCORE ' + KC.commas(KC.Story.score), Math.round(W / 2), 30 - 0, '#5a2a10', { align: 'center', outline: false });
      KC.promptBar(g, W, H, [['confirm', 'GO'], ['cancel', 'MAIN MENU']]);
    });
  }
};

/** a stop's place on the road, in ink and a wash of colour (48 x 34) */
KC.roadVignette = (g, stage, x, y, t) => {
  const w = 48, h = 34, x0 = x - w / 2, ink = '#3a2414', wash = (c, f) => px.blend(g, .45, 'normal', f || (() => px.rect(g, x0, y, w, h, c)));
  E.ui.box(g, x0 - 2, y - 2, w + 4, h + 4, { bg: '#efe2c0', border: '#8a6a3a', gradient: false });
  if (stage === 'dojo') { wash('#e8c080'); px.poly(g, [[x0 + 4, y + 14], [x, y + 4], [x0 + w - 4, y + 14]], ink); px.rect(g, x0 + 9, y + 14, w - 18, 16, '#c8a060'); for (let i = 0; i < 4; i++) px.rect(g, x0 + 12 + i * 7, y + 17, 5, 10, '#f4ecd0'); }
  else if (stage === 'harbor') { wash('#8ab0e0'); for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) px.rect(g, x0 + 3 + k * 8 + (i % 2) * 4, y + 18 + i * 5, 5, 1, '#3a5a9a'); px.poly(g, [[x0 + 14, y + 16], [x0 + 32, y + 16], [x0 + 29, y + 20], [x0 + 17, y + 20]], ink); px.rect(g, x0 + 23, y + 4, 1, 12, ink); px.poly(g, [[x0 + 24, y + 5], [x0 + 32, y + 14], [x0 + 24, y + 14]], '#f4f4f0'); }
  else if (stage === 'bamboo') { wash('#a8d890'); for (let i = 0; i < 7; i++) { px.rect(g, x0 + 4 + i * 6, y + 2, 2, h - 4, '#3a7a3a'); for (let k = 0; k < 3; k++) px.rect(g, x0 + 3 + i * 6, y + 6 + k * 9 + (i % 3), 4, 1, ink); } }
  else if (stage === 'log') { wash('#a8c0d0'); px.poly(g, [[x0, y + h], [x0 + 8, y + 6], [x0 + 14, y + h]], '#5a6470'); px.poly(g, [[x0 + w, y + h], [x0 + w - 8, y + 8], [x0 + w - 14, y + h]], '#5a6470'); px.rect(g, x0 + 8, y + 16, w - 16, 4, '#6a4a2a'); px.rect(g, x0 + 21, y + 22, 6, h - 22, '#e8f4fc'); }
  else if (stage === 'ship') { wash('#f0a070'); px.disc(g, x, y + 20, 6, '#ffd890'); px.poly(g, [[x0 + 6, y + 22], [x0 + w - 6, y + 22], [x0 + w - 12, y + 30], [x0 + 12, y + 30]], ink); px.rect(g, x, y + 4, 1, 18, ink); px.poly(g, [[x + 1, y + 6], [x + 14, y + 18], [x + 1, y + 18]], '#f4ece0'); }
  else if (stage === 'market') { wash('#3a3050'); px.line(g, x0 + 2, y + 8, x0 + w - 2, y + 10, ink, 1); for (let i = 0; i < 5; i++) { const lx = x0 + 6 + i * 9; px.ell(g, lx, y + 13, 3, 4, '#e8402a'); } px.rect(g, x0 + 10, y + 20, w - 20, 12, '#5a2a1a'); px.rect(g, x0 + 14, y + 22, w - 28, 8, '#ffc870'); }
  else if (stage === 'fuji') { wash('#e8b0c0'); px.poly(g, [[x0 + 4, y + h - 4], [x - 6, y + 6], [x + 6, y + 6], [x0 + w - 4, y + h - 4]], '#6a5a9a'); px.poly(g, [[x - 6, y + 6], [x + 6, y + 6], [x + 10, y + 12], [x - 10, y + 12]], '#f4f0fa'); px.disc(g, x0 + 8, y + 24, 5, '#f890b0'); }
  else if (stage === 'stadium') { wash('#2a2a5a'); for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 9; i++) px.disc(g, x0 + 4 + i * 5 + (r2 % 2) * 2, y + 8 + r2 * 5, 2, '#c8a080'); px.rect(g, x0 + 6, y + 24, w - 12, 6, '#3a5ad8'); KC.Props.goldenBowl(g, x, y + 44, 1, t); }
  else if (stage === 'courtyard') { wash('#e8dcc0'); for (let i = 0; i < 5; i++) px.rect(g, x0 + 10, y + 10 + i * 3, w - 20, 2, '#d8b070'); px.rect(g, x0 + 12, y + 25, 6, 6, '#8a8a8a'); px.rect(g, x0 + w - 18, y + 25, 6, 6, '#8a8a8a'); }
  else if (stage === 'fishmarket') { wash('#c8e0f0'); KC.Props.clayPot(g, x - 10, y + 28, 1); KC.Props.bonsai(g, x + 4, y + 28, 1); KC.Props.bowl(g, x + 16, y + 26, 1); }
  else if (stage === 'pasture') { wash('#a8d890'); px.ell(g, x, y + 20, 12, 7, '#4a2e22'); px.ell(g, x + 12, y + 18, 5, 5, '#4a2e22'); px.line(g, x + 10, y + 13, x + 6, y + 8, '#e8dcc0', 2); px.line(g, x + 14, y + 13, x + 18, y + 8, '#e8dcc0', 2); for (const k of [-8, -3, 4, 8]) px.rect(g, x + k, y + 25, 2, 6, '#3a2418'); }
};
/* ---- a cutscene on a stage: the cast stands, the speaker gestures, the lines play ---- */
const GESTURE = ['point', 'hips', 'cross', 'nod', 'wave'];
KC.CutsceneScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    this.d = d; const lines = KC.SCRIPTS[d.script] || [['card', '...']]; this.t = 0;
    this.talk = new KC.Talk(lines, { meiGi: d.meiGi, rank: KC.Story.rank, onDone: () => { KC.consumeAll(); if (d.next) d.next(); } });
    KC.Stage.enter(KC.game, d.stage || 'dojo'); KC.music(d.script === 'ending' ? 'ending' : KC.STAGE[d.stage || 'dojo'].music);
    const cast = d.cast || ['taro']; this.cast = cast.map((fid, i) => { const x = cast.length === 1 ? 200 : 160 + i * 80, side = fid === 'mei' && !d.meiGi ? null : i === 0 ? 'white' : 'red'; const rig = fid === 'mei' && !d.meiGi ? KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a', belt: '#c8302a' } }) : KC.makeRig(fid, side, fid === 'taro' ? KC.Story.rank : null); return { fid, x, rig, face: i === 0 ? 0 : PI }; });
    if (d.script !== 'prologue' && d.script !== 'ending' && this.cast.length === 2 && d.script !== 'finalEntrance') this.cast.forEach(c => { c.face = c.x < 200 ? 0 : PI; });
    this.ref = d.script === 'ending' || d.script === 'finalEntrance' ? KC.makeOfficial(2.1) : null;
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); this.talk.update(dt);
    const L = this.talk.line, sp = L && L[0];
    this.cast.forEach((c, i) => { const speaking = sp === c.fid; KC.poseStep(c.rig, dt, { point: speaking && i % 2 === 0 ? 1 : 0, cross: !speaking && c.fid === 'negi' ? 1 : 0, nod: speaking ? .6 + .4 * Math.sin(this.t * 5) : 0 }); c.rig.update(dt, { x: c.x, y: 0, z: 0, facing: c.face, pose: speaking && i % 2 ? 'hips' : this.d.script === 'ending' && c.fid === 'taro' && this.t > 3 ? 'cheer' : null, expr: speaking ? 'shout' : 'smile', stance: c.fid === 'taro' && this.d.script !== 'ending' ? 'guard' : null }); });
    if (this.ref) { KC.poseStep(this.ref, dt, { sig: sp === 'genkotsu' ? (this.d.script === 'ending' ? 'winner' : 'point') : null, side: 1 }); this.ref.update(dt, { x: 200, y: -18, z: 0, facing: PI / 2 }); }
    KC.camera(KC.game, [180, 220]);
  },
  draw(r) {
    KC.Stage.draw(r, this.d.stage || 'dojo', { noCrowd: false, mei: false });
    if (this.ref) r.actor(200, -18, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    for (const c of this.cast) { r.actor(c.x, 0, 0, (g, ox, oy) => { c.rig.draw(g, ox, oy, r.view); if (c.rig.kcBeard) KC.drawBeard(g, c.rig, r, c.rig.kcBeard, ox, oy); }); r.shadow(c.x, 0, 14, .35); }
    if (this.d.trophy) r.queue(200, 10, 0, g => { const p = r.w(232, 0, 46); KC.Props.goldenBowl(g, Math.round(p[0]), Math.round(p[1]) + 40, 1, this.t); });
    r.overlay(g => { this.talk.draw(g, r.W, r.H); KC.promptBar(g, r.W, r.H, [['confirm', 'NEXT'], ['skip', 'SKIP LINE']]); });
  }
};

/* ---- the VS card: white left, red right, the stage, the opponent's taunt typed with its voice ---- */
KC.VsCardScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.gone = false; KC.music('select'); KC.game.lights.enabled = false;
    this.rigs = d.sides.map((s, i) => { const r = KC.makeRig(s.fid, i ? 'red' : 'white', s.rank); for (let k = 0; k < 5; k++) r.update(.05, { x: 0, y: 0, z: 0, facing: i ? PI - .5 : .5, expr: 'angry', stance: 'guard' }); return r; });
    const opp = KC.FIGHTER[d.sides[1].fid]; this.quote = opp.quotes.intro; this.spoke = false; KC.sfx('taikoHit');
  },
  update(dt) {
    this.t += dt; if (!this.spoke && this.t > .5) { this.spoke = true; KC.Voice.speak(this.quote, this.d.sides[1].fid); }
    this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: i ? PI - .5 : .5, expr: this.t > .5 ? 'angry' : null, stance: 'guard' }));
    const go = this.t > (this.d.tip ? 4.5 : 2.6) || (this.t > .6 && (KC.anyPressed('confirm') || KC.anyPressed('start') || KC.game.input.clicked()));
    if (go && !this.gone) { this.gone = true; KC.consumeAll(); KC.game.go('fight', this.d); }
  },
  exit() { this.gone = false; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, k = clamp(this.t / .3, 0, 1), mid = Math.round(W / 2);
      px.rect(g, 0, 0, W, H, '#05040a');
      px.poly(g, [[0, 0], [Math.round(mid * k + 20), 0], [Math.round(mid * k - 20), H], [0, H]], '#d8d4ca'); px.poly(g, [[W, 0], [W - Math.round(mid * k - 20), 0], [W - Math.round(mid * k + 20), H], [W, H]], '#a8201a');
      this.rigs.forEach((rig, i) => rig.drawPortrait(g, i ? W - 18 - 110 : 18, 34, 110, { frame: true, bg: i ? '#5a1010' : '#8a8478', zoom: 2.4 }));
      E.font.title(g, 'VS', mid, Math.round(H * .4), { scale: 4, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 });
      this.d.sides.forEach((s, i) => { const F = KC.FIGHTER[s.fid], R = KC.DATA.ranks[KC.rankIndex(s.rank || F.rank)], x = i ? W - 18 : 18, al = i ? 'right' : 'left'; E.font.text(g, s.name || F.name, x, 152, '#fff6e8', { align: al, outline: '#000', scale: 2 }); E.font.text(g, (i ? 'RED' : 'WHITE') + ' - ' + R.name, x, 172, i ? '#ffc0b0' : '#2a2a30', { align: al, outline: false }); E.font.text(g, F.title, x, 184, i ? '#ffd8c8' : '#3a3a40', { align: al, outline: false }); });
      E.font.text(g, KC.STAGE[this.d.stage].name, mid, 12, '#ffd060', { align: 'center', outline: '#000', scale: 2 });
      const q = this.quote.slice(0, Math.max(0, Math.floor((this.t - .5) * 34))); if (q) E.font.text(g, '"' + q + (q.length === this.quote.length ? '"' : ''), mid, H - 46, '#ffffff', { align: 'center', outline: '#000' });
      if (this.d.tip) { E.ui.box(g, 20, H - 34, W - 40, 16, { bg: '#1a3a1a', border: '#8ae08a' }); E.font.text(g, 'TIP: ' + this.d.tip, mid, H - 30, '#d8ffd0', { align: 'center', outline: false }); }
    });
  }
};

/* ---- the promotion: Genkotsu presents the belt; it flies to the waist; the rank road lights the new one ---- */
KC.PromotionScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.gone = false; KC.sting('promotion'); KC.music(null); this.taro = KC.makeRig('taro', 'white', d.from); this.ref = KC.makeOfficial(2.1); KC.Stage.enter(KC.game, 'dojo'); this.tied = false; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    if (!this.tied && this.t > 1.4) { this.tied = true; this.taro = KC.makeRig('taro', 'white', this.d.to); KC.sfx('beltTie'); KC.game.particles.glints(180, 0, 30, 14, '#ffe070'); KC.Voice.speak('PROMOTED!', 'genkotsu'); KC.Stage.cheer = 1; KC.Voice.crowd(.8, 1.4); }
    KC.poseStep(this.taro, dt, { bow: this.t > .4 && this.t < 1.1 ? 1 : 0 }); this.taro.update(dt, { x: 180, y: 0, z: 0, facing: 0, pose: this.t > 2 ? 'cheer' : null, expr: this.t > 1.4 ? 'smile' : null });
    KC.poseStep(this.ref, dt, { point: this.t < 1.4 ? 1 : 0, bow: this.t > .4 && this.t < 1.1 ? 1 : 0 }); this.ref.update(dt, { x: 225, y: 0, z: 0, facing: PI });
    KC.camera(KC.game, [180, 225]);
    if (this.t > 2.6 && (KC.anyPressed('confirm') || KC.anyPressed('start') || KC.game.input.clicked() || this.t > 6)) { if (!this.gone) { this.gone = true; KC.consumeAll(); this.d.next(); } }
  },
  exit() { this.gone = false; },
  draw(r) {
    KC.Stage.draw(r, 'dojo', {});
    r.actor(180, 0, 0, (g, ox, oy) => this.taro.draw(g, ox, oy, r.view)); r.actor(225, 0, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H, R = KC.DATA.ranks[KC.rankIndex(this.d.to)];
      if (this.t < 1.4) { const k = clamp((this.t - .6) / .8, 0, 1), p0 = r.w(222, 0, 40), p1 = r.w(181, 0, 30); const x = Math.round(lerp(p0[0], p1[0], k)), y = Math.round(lerp(p0[1], p1[1], k) - Math.sin(k * PI) * 30); px.rect(g, x - 10, y, 20, 4, R.belt); px.rect(g, x - 10, y, 20, 1, E.shade(R.belt, .4)); }
      E.font.title(g, 'PROMOTED!', Math.round(W / 2), 22, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 });
      if (this.t > 1.2) E.font.title(g, R.name, Math.round(W / 2), 52, { scale: 2, align: 'center', colors: ['#ffffff', E.shade(R.belt, .3), R.belt === '#16161c' ? '#8a8a9a' : R.belt] });
      // the rank road: ten belts, the new one lit
      const n = KC.DATA.ranks.length, ri = KC.rankIndex(this.d.to), w = 22, x0 = Math.round(W / 2 - n * w / 2);
      KC.DATA.ranks.forEach((rk, i) => { const x = x0 + i * w, on = i <= ri, cur = i === ri && this.t > 1.4; px.rect(g, x + 2, H - 46, w - 4, 6, on ? rk.belt : '#2a2438'); if (rk.id === 'champ' && on) px.rect(g, x + 2, H - 46, w - 4, 2, '#fff6c0'); if (cur) { px.rect(g, x, H - 49, w, 1, '#ffd060'); px.rect(g, x, H - 38, w, 1, '#ffd060'); } });
      E.font.text(g, '+' + KC.commas(1000 * ri) + '  RANK BONUS', Math.round(W / 2), H - 34, '#ffe08a', { align: 'center', outline: '#000' });
      if (this.t > 2.6) KC.promptBar(g, W, H, [['confirm', 'CONTINUE']]);
    });
  }
};

/* ---- CONTINUE? A 10-second countdown; continuing retries with the score reset and the rank kept ---- */
KC.ContinueScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.last = 10; KC.music('continue'); KC.game.lights.enabled = false; this.mei = KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a' } });
    this.menu = new KC.Menu({ items: [{ label: 'CONTINUE', act: () => this._yes(false) }, { label: 'CONTINUE (EASIER)', sub: 'LOWER DIFFICULTY FOR THIS MATCH?', act: () => this._yes(true) }, { label: 'GIVE UP', act: () => this._no() }], y: 120 });
    KC.Voice.speak(KC.TEXT.getUp, 'mei');
  },
  _yes(easy) { KC.Story.score = 0; KC.Story.assist = easy; KC.game.go('vscard', KC.Story.matchData()); },
  _no() { KC.game.go('gameover', {}); },
  update(dt) {
    this.t += dt; const left = Math.max(0, 10 - this.t), sec = Math.ceil(left);
    if (sec !== this.last) { this.last = sec; KC.sfx('countBeep'); }
    this.mei.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, pose: 'hips', expr: 'angry' });
    if (left <= 0) { this._no(); return; }
    this.menu.update(dt);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#0a0610');
      E.font.title(g, KC.TEXT.cont, Math.round(W / 2), 16, { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c0302a'], depth: 3 });
      E.font.title(g, String(Math.max(0, Math.ceil(10 - this.t) - 1)), Math.round(W / 2), 52, { scale: 5, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 });
      this.mei.drawPortrait(g, W - 80, 20, 60, { frame: true, bg: '#3a1a2a' }); E.font.text(g, '"' + KC.TEXT.getUp + '"', W - 50, 86, '#ff9ab8', { align: 'center', outline: false });
      const sub = this.menu.draw(g, W, H); if (sub) E.font.text(g, sub, Math.round(W / 2), H - 32, '#c8c0e8', { align: 'center', outline: false });
      KC.promptBar(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};

/* ---- GAME OVER: Taro kneels in the rain ---- */
KC.GameOverScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() { this.t = 0; this.gone = false; KC.music('gameover'); KC.Stage.enter(KC.game, 'dojo'); KC.game.weather = { kind: 'rain', amount: .7, wind: .2 }; KC.game.lights.ambient = .35; this.taro = KC.makeRig('taro', 'white', KC.Story.rank); this.ref = KC.makeOfficial(2.1); this.talk = new KC.Talk(KC.SCRIPTS.gameOver, { auto: true, onDone: () => {} }); KC.Story.active = false; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); this.talk.update(dt);
    this.taro.update(dt, { x: 185, y: 0, z: 0, facing: 0, pose: 'kneel', expr: 'wince' }); KC.poseStep(this.ref, dt, { cross: 1 }); this.ref.update(dt, { x: 225, y: 0, z: 0, facing: PI });
    KC.camera(KC.game, [185, 225]);
    if (this.t > 2.5 && (KC.anyPressed('confirm') || KC.anyPressed('start') || this.t > 7)) this._next();
  },
  _next() { if (this.gone) return; this.gone = true; KC.consumeAll(); const sc = KC.Story.score; if (KC.Save.qualifies('story', sc)) KC.game.go('initials', { mode: 'story', score: sc, note: KC.DATA.ranks[KC.rankIndex(KC.Story.rank)].name.replace('BLACK BELT ', ''), next: () => KC.game.go('title') }); else KC.game.go('title'); },
  exit() { this.gone = false; KC.game.weather = null; },
  draw(r) {
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    r.actor(185, 0, 0, (g, ox, oy) => this.taro.draw(g, ox, oy, r.view)); r.actor(225, 0, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => { E.font.title(g, KC.TEXT.gameOver, Math.round(r.W / 2), 30, { scale: 4, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 3 }); this.talk.draw(g, r.W, r.H); });
  }
};

/* ---- INITIALS: three letters on a wheel (up and down turn it, left and right move, confirm takes a letter) ---- */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!- ';
KC.InitialsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) { this.d = d; this.name = [0, 0, 0]; this.i = 0; this.t = 0; KC.music('ending'); this.done = false; },
  update(dt) {
    this.t += dt; if (this.done) return;
    const n = LETTERS.length, I = KC.game.input, c = I.clicked();
    if (KC.anyRepeat('up')) { this.name[this.i] = (this.name[this.i] + 1) % n; KC.sfx('menuMove'); }
    if (KC.anyRepeat('down')) { this.name[this.i] = (this.name[this.i] + n - 1) % n; KC.sfx('menuMove'); }
    if (KC.anyRepeat('left')) this.i = Math.max(0, this.i - 1);
    if (KC.anyRepeat('right')) this.i = Math.min(2, this.i + 1);
    if (c && this.cells) for (const [k, x0, y0, w, h, dir] of this.cells) if (c[0] >= x0 && c[0] < x0 + w && c[1] >= y0 && c[1] < y0 + h) { if (dir === 'ok') this.i = 3; else { this.i = k; this.name[k] = (this.name[k] + dir + n) % n; } }
    if (KC.anyPressed('confirm') || this.i === 3) { KC.consumeAll(); KC.sfx('menuOk'); if (this.i < 2) this.i++; else this._finish(); }
    if (KC.anyPressed('cancel') && this.i > 0) { KC.consumeAll(); this.i--; }
  },
  _finish() { this.done = true; const nm = this.name.map(k => LETTERS[k]).join('').trim() || 'AAA'; this.rank = KC.Save.enter(this.d.mode, nm, this.d.score, this.d.note); KC.game.after(1.4, () => this.d.next ? this.d.next() : KC.game.go('records', { mode: this.d.mode })); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2); px.rect(g, 0, 0, W, H, '#0a0818');
      E.font.title(g, 'NEW HIGH SCORE!', mid, 16, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      E.font.text(g, KC.commas(this.d.score) + '  ' + ({ story: 'CHAMPON ROAD', boards: 'BREAK THE BOARDS', pots: 'POTS AHOY!', bull: 'STOP THE BULL' }[this.d.mode] || ''), mid, 52, '#ffe7a8', { align: 'center', outline: false, scale: 2 });
      this.cells = [];
      for (let k = 0; k < 3; k++) {
        const x = mid - 66 + k * 44, y = 96, on = k === this.i && !this.done, L = LETTERS[this.name[k]];
        E.ui.box(g, x, y, 36, 44, { bg: on ? '#3a2a5a' : '#1a1430', border: on ? '#ffd060' : '#8a7ab0' });
        E.font.title(g, L === ' ' ? '_' : L, x + 18, y + 10, { scale: 3, align: 'center', colors: on ? ['#ffffff', '#ffd060'] : ['#c8c0e8', '#8a80a8'] });
        E.font.text(g, '↑', x + 18, y - 12, on ? '#ffd060' : '#5a5078', { align: 'center', outline: false, scale: 2 }); E.font.text(g, '↓', x + 18, y + 48, on ? '#ffd060' : '#5a5078', { align: 'center', outline: false, scale: 2 });
        this.cells.push([k, x, y - 16, 36, 16, 1], [k, x, y + 44, 36, 18, -1]);
      }
      const ok = this.i === 3; E.ui.box(g, mid + 70, 108, 34, 20, { bg: ok ? '#3a5a2a' : '#1a2a1a', border: '#8ae08a' }); E.font.text(g, 'OK', mid + 87, 113, '#d8ffd0', { align: 'center', outline: false }); this.cells.push([3, mid + 70, 108, 34, 20, 'ok']);
      if (this.done) E.font.text(g, 'RANK ' + (this.rank + 1) + '!', mid, 170, '#ffd060', { align: 'center', outline: '#000', scale: 2 });
      KC.promptBar(g, W, H, [['up', 'LETTER'], ['right', 'NEXT'], ['confirm', 'TAKE']]);
    });
  }
};

/* ---- the ending's credits parade: the cast walks in and bows, each with a name; then the credits ---- */
KC.CreditsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d || {}; this.t = 0; this.gone = false; KC.music('ending'); KC.Stage.enter(KC.game, 'stadium');
    this.cast = KC.DATA.roster.map((F, i) => ({ F, rig: KC.makeRig(F.id, F.id === 'mei' ? 'red' : 'white', F.rank), at: 1 + i * 2.2, x: -60 }));
    this.lines = ['KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', 'BUILT ON THE MY-3D2DGE ENGINE', 'ART, ANIMATION, MUSIC, VOICES: ALL WRITTEN IN CODE', 'PROPS: KENNEY AND KAYKIT (CC0)', 'CLAUDE OPUS 5.5 (ANTHROPIC)', 'THANK YOU FOR PLAYING!'];
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    for (const c of this.cast) { const lt = this.t - c.at; const tx = 200; if (lt > 0) c.x = lt < 1.2 ? lerp(-40, tx, lt / 1.2) : lt < 2.2 ? tx : lerp(tx, 460, (lt - 2.2) / 1.2); KC.poseStep(c.rig, dt, { bow: lt > 1.2 && lt < 2 ? 1 : 0 }); c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: lt > 0 && (lt < 1.2 || lt > 2.2) && lt < 3.4 ? 70 : 0, facing: lt > 1.2 && lt < 2.2 ? PI / 2 : 0, expr: 'smile' }); }
    KC.camera(KC.game, [200]);
    const end = this.cast[this.cast.length - 1].at + 4 + this.lines.length * 1.4;
    if (this.t > end || (this.t > 1 && KC.anyPressed('start'))) this._next();
  },
  _next() { if (this.gone) return; this.gone = true; KC.consumeAll(); const sc = KC.Story.score; if (this.d.story && KC.Save.qualifies('story', sc)) KC.game.go('initials', { mode: 'story', score: sc, note: 'CHAMP', next: () => KC.game.go('title') }); else KC.game.go('title'); },
  exit() { this.gone = false; },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    for (const c of this.cast) if (this.t > c.at && c.x < 470) r.actor(c.x, 0, 0, (g, ox, oy) => { c.rig.draw(g, ox, oy, r.view); if (c.rig.kcBeard) KC.drawBeard(g, c.rig, r, c.rig.kcBeard, ox, oy); });
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      const cur = this.cast.find(c => this.t - c.at > 1 && this.t - c.at < 2.6); if (cur) { E.font.title(g, cur.F.name, mid, 40, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); E.font.text(g, cur.F.title, mid, 62, '#e8e0ff', { align: 'center', outline: '#000' }); }
      const lt = this.t - (this.cast[this.cast.length - 1].at + 3.4);
      if (lt > 0) { E.font.title(g, KC.TEXT.champon, mid, 30, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); this.lines.forEach((l, k) => { if (lt > k * 1.2) E.font.text(g, l, mid, 60 + k * 16, k === 0 ? '#ffd060' : '#fff6e8', { align: 'center', outline: '#000' }); }); }
      KC.promptBar(g, W, H, [['start', 'SKIP']]);
    });
  }
};
// the autosave's contents (the title's CONTINUE loads it)
KC.hookSaves = game => { game.saves.write = () => ({ data: KC.Story.state(), place: KC.Story.current ? KC.STAGE[KC.Story.current.stage].name : 'THE ROAD', level: KC.Story.rankName() }); game.saves.read = s => { KC.Story.restore(s.data); }; };
