/* ---- SCENES I: title and main menu, the touch gate, the Champon Road, cutscenes, VS cards, promotions, continue,
 * game over, ending and credits, initials, records, about, the dojo and bonus menus ---- */
const scenes = KC.scenes = {};
const cab = KC.cab = new E.Arcade(game, { id: 'karate-champon', hud: false, idle: 999 });
const SC = (o) => Object.assign({ view: 'side', input: KC_KEYS, touch: [], camera: { zoom: false }, propSize: 1.4 }, o);
// a portrait rig per speaker (cutscenes): Mei in her apron, Genkotsu the referee
KC.portraits = {};
KC.portrait = id => {
  if (KC.portraits[id]) return KC.portraits[id];
  let rig;
  if (id === 'genkotsu') rig = new Referee().rig;
  else if (id === 'meiApron') rig = KC.MEI_FAN;
  else { const k = new Karateka(id, 0); rig = k.rig; }
  return (KC.portraits[id] = rig);
};

/* ---- the attract-mode idle timer: 10 s with no input on the title or any menu starts it; any input exits ---- */
KC.Attract = {
  idle: 0, on: false,
  poke() { this.idle = 0; },
  anyInput() {
    if (KC._raw) { KC._raw = false; return true; }   // any key, button or tap, bound or not (raw page events)
    const I = game.input; if (I.anyPressed()) return true;
    const p = I.pointer && I.pointer(); if (p && this._lp && (p[0] !== this._lp[0] || p[1] !== this._lp[1])) { this._lp = p.slice(); return true; } if (p) this._lp = p.slice();
    if (I.clicked && I.clicked()) return true;
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) return true; if (I.padAim) return true;
    for (const q of game.players.slice(1)) if (q.anyPressed()) return true;
    return false;
  },
  tick(dt) { if (this.anyInput()) this.idle = 0; else this.idle += dt; if (this.idle >= 10 && !SESSION) { this.idle = 0; game.go('attract', { loop: (this.loop = (this.loop || 0) + 1) }); return true; } return false; }
};

/* ---- the touch-only gate ---- */
KC.touchOnly = () => { try { return typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches === false && (navigator.maxTouchPoints || 0) > 0 && !KC._gateLifted; } catch (e) { return false; } };
if (typeof addEventListener === 'function') { for (const ev of ['keydown', 'pointerdown', 'touchstart', 'wheel']) addEventListener(ev, () => { KC._raw = true; }, { capture: true }); addEventListener('keydown', () => { KC._gateLifted = true; }); addEventListener('gamepadconnected', () => { KC._gateLifted = true; }); }
game.input.touchEnabled = false;

/* ---- TITLE + MAIN MENU ---- */
const titleStage = new Stage('dojo');
let titleFighters = null;
const mainItems = () => {
  const save = KC.store('save');
  return [
    { label: () => 'CONTINUE', hidden: !save || save.done, fn: () => KC.Story.resume(), id: 'continue' },
    { label: 'CHAMPON ROAD', fn: () => KC.Story.newGame(), id: 'road' },
    { label: 'VERSUS', fn: () => game.go('versus'), id: 'versus' },
    { label: 'DOJO', fn: () => game.go('dojoMenu'), id: 'dojo' },
    { label: 'BONUS GAMES', fn: () => game.go('bonusMenu'), id: 'bonus' },
    { label: 'RECORDS', fn: () => game.go('records'), id: 'records' },
    { label: 'OPTIONS', fn: () => game.menu('settings'), id: 'options' },
    { label: 'ABOUT', fn: () => game.go('about'), id: 'about' }
  ];
};
const VIGNETTE = { continue: 'PICK UP YOUR CLIMB', road: 'WHITE BELT TO CHAMP. 9 MATCHES.', versus: '2 PLAYERS. 3-4: WINNER STAYS ON', dojo: 'LESSONS, FREE SPAR, MOVE LIST', bonus: 'BOARDS, POTS AND A BULL', records: 'THE TOP TEN', options: 'DIFFICULTY, CALLS, CAMERA...', about: 'SOURCE, CREDITS, FEEDBACK' };
scenes.title = SC({
  enter(d) {
    KC.applyMaps(); titleStage.enter(); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players.length);
    titleFighters = [new Karateka('taro', 0, { x: 160 }), new Karateka('mei', 1, { x: 240 })]; titleFighters[1].setBelt('gold');
    this.mode = d && d.menu ? 'menu' : 'press'; this.t = 0; this.menu = new Menu(mainItems(), { onCancel: () => { this.mode = 'press'; } }); this.bowT = 0;
    KC.music('title'); KC.Attract.poke(); game.timeScale = 1;
  },
  update(dt) {
    this.t += dt; titleStage.update(dt); this.bowT += dt;
    titleFighters.forEach((f, i) => { if (this.bowT > 6) { f.setPose('bow'); } if (f.st === 'pose' && f.stT > 1.1) { f.st = 'idle'; f.poseName = null; } f.face = i ? -1 : 1; f.update(dt); });
    if (this.bowT > 6.2) this.bowT = 0;
    KC.stageCam(titleFighters);
    if (KC.Attract.tick(dt)) return;
    if (KC.touchOnly()) { if (game.input.clicked && game.input.clicked()) KC.Attract.poke(); return; }
    if (this.mode === 'press') { if (game.input.pressed('start') || game.input.pressed('confirm') || (game.input.clicked && game.input.clicked())) { KC.sfx('menuOk'); this.mode = 'menu'; this.menu.items = mainItems(); game.input.consumeAll(); } return; }
    if (game.input.pressed('dev') && DEV.enabled) KC.Dev.open();
    this.menu.update(dt);
  },
  draw(r) {
    titleStage.draw(r); titleFighters.forEach(f => f.draw(r));
    r.overlay(g => {
      const W = r.W, H = r.H, ca = game.cornerArea && game.cornerArea();
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
      const menu = this.mode === 'menu', ly = menu ? 4 : 14, s1 = menu ? 2 : 3, s2 = menu ? 3 : 4; KC.title(g, 'KARATE', W / 2, ly, s1, ['#fffbe8', '#ffe08a', '#e0662a']);
      KC.title(g, 'CHAMPON', W / 2, ly + (menu ? 18 : 28), s2, ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a']);
      // the O of CHAMPON is a noodle bowl: chopsticks and steam
      const ow = TW('CHAMPON', { scale: s2 }), ox = W / 2 - ow / 2 + TW('CHAMP', { scale: s2 }) + 3 * s2, oy = ly + (menu ? 40 : 58);
      px.line(g, ox + 2, oy - 22, ox + 14, oy - 6, '#c8302a', 2); px.line(g, ox + 6, oy - 24, ox + 16, oy - 8, '#e8b860', 2);
      for (let k = 0; k < 3; k++) { const sy = oy - 26 - ((this.t * 14 + k * 6) % 16); px.blend(g, .5, 'add', () => px.rect(g, ox - 4 + k * 5 + Math.round(Math.sin(this.t * 3 + k) * 2), sy, 1, 4, '#ffffff')); }
      T(g, E.versionLabel().replace(/·/g, '-') + ' - GAME ' + KC.VERSION, 4, H - 10, '#6a6488', { font: 'tiny' });
      if (KC.touchOnly()) {
        box(g, W / 2 - 130, H / 2 + 6, 260, 44); KC.title(g, 'CONTROLLER OR KEYBOARD', W / 2, H / 2 + 12, 2); KC.title(g, 'REQUIRED', W / 2, H / 2 + 30, 2);
        T(g, 'SETTINGS: THE MENU BUTTON, TOP RIGHT', W / 2 - TW('SETTINGS: THE MENU BUTTON, TOP RIGHT') / 2, H / 2 + 56, '#c8c0e0'); return;
      }
      if (this.mode === 'press') { if (Math.floor(this.t * 2) % 2 === 0) { const gl = KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ENTER'; KC.promptRow(g, [[gl, 'PRESS START']], W / 2, H * .62, 13); } T(g, '© 2026 KARATE CHAMPON. INSPIRED BY KARATE CHAMP (1984)', W / 2 - TW('© 2026 KARATE CHAMPON. INSPIRED BY KARATE CHAMP (1984)') / 2, H - 24, '#a89ac8'); return; }
      this.menu.draw(g, W / 2 - (W > 380 ? 60 : 0), 56, { scale: 2, lh: Math.min(24, Math.floor((H - 82) / Math.max(1, this.menu.items.filter(i => !i.hidden).length))) });
      if (W > 380) { const it = this.menu.sel, v = VIGNETTE[it && it.id] || ''; box(g, W - 132, 62, 124, 50, { alpha: .8 }); E.font.text(g, v, W - 126, 68, '#e8e0ff', { wrap: 112, shadow: '#000', outline: false }); const save = KC.store('save'); if (it && it.id === 'continue' && save) T(g, KC.RANKS[save.rank][0] + ' · ' + (KC.STAGE[KC.DATA.ladder[save.node].stage] || {}).name, W - 126, 98, '#ffd060', { font: 'tiny' }); }
      KC.bar(g, [[KC.ok(), 'SELECT'], [KC.back(), 'BACK']]);
    });
  }
});

/* ---- THE STORY: the Champon Road state, its ladder, saves and the flow between nodes ---- */
KC.Story = {
  s: null,
  newGame() { this.s = { node: 0, rank: 0, score: 0, conts: 0, lostRounds: {}, easier: false, done: false, stats: { full: 0, half: 0, perfect: 0 } }; this.save(); this.go(); },
  resume() { const s = KC.store('save'); if (!s) return this.newGame(); this.s = s; this.go(); },
  save() { if (this.s) KC.store('save', this.s); },
  node() { return KC.DATA.ladder[this.s.node]; },
  add(pts) { if (this.s) this.s.score += pts; },
  hi() { const t = cab.table('story'); return Math.max(t.length ? t[0].score : 0, this.s ? this.s.score : 0); },
  /** go to the current node */
  go() {
    const n = this.node(); if (!n) return game.go('title');
    if (n.kind === 'cutscene') return game.go('cutscene', { script: n.script, stage: n.stage, then: () => this.done() });
    if (n.kind === 'practice') return game.go('practice', { lesson: n.lesson, story: true });
    if (n.kind === 'ending') { return game.go('cutscene', { script: 'ending', stage: 'stadium', ending: true, then: () => { this.s.done = true; this.save(); KC.unlock('mei'); KC.unlock('classic'); game.go('credits', { story: true }); } }); }
    game.go('road');
  },
  /** the road's GO: a node's pre-cutscene, then its VS card or bonus */
  start() {
    const n = this.node(), next = () => n.kind === 'match' ? game.go('vs', { node: n }) : game.go('bonus', { kind: n.bonus, story: true, visit: this.s.node });
    if (n.pre && !DEV.skipCut) game.go('cutscene', { script: n.pre, stage: n.stage, then: next }); else next();
  },
  done() { this.s.node++; this.s.lostRounds = {}; this.s.easier = false; this.save(); this.go(); },
  matchWon(res) {
    const n = this.node(), s = this.s; s.stats.full += res.full || 0; s.stats.half += res.half || 0;
    if (n.unlock) KC.unlock(n.unlock);
    const after = () => game.go('promotion', { rank: n.promote, then: () => this.done() });
    if (n.post && !DEV.skipCut) game.go('cutscene', { script: n.post, stage: n.stage, then: after }); else after();
  },
  matchLost() { game.go('continue'); },
  gameOver() { game.go('gameover', { score: this.s.score, mode: 'story', rank: this.s.rank }); KC.store('save', null); }
};

/* ---- THE CHAMPON ROAD SCREEN: a painted scroll from the dojo to the stadium ---- */
const ROAD_X = n => 40 + n * 60;
scenes.road = SC({
  enter() { this.t = 0; this.cam = 0; this.hover = -1; KC.music('select'); game.lights.enabled = false; game.weather = null; },
  update(dt) {
    this.t += dt; const s = KC.Story.s, i = s.node; this.cam = lerp(this.cam, ROAD_X(i) - game.W / 2, Math.min(1, dt * 3));
    const p = game.input.pointer && game.input.pointer(), c = game.input.clicked && game.input.clicked();
    this.hover = -1; if (p) KC.DATA.ladder.forEach((n, k) => { const x = ROAD_X(k) - this.cam, y = this.nodeY(k); if (Math.abs(p[0] - x) < 14 && Math.abs(p[1] - y) < 14) this.hover = k; });
    if (game.input.pressed('confirm') || (c && this.hover === i)) { KC.sfx('menuOk'); KC.Story.start(); }
    if (game.input.pressed('cancel')) { game.go('title', { menu: true }); }
  },
  nodeY(k) { return Math.round(game.H * .5 + Math.sin(k * 1.3) * 22); },
  draw(r) {
    r.sky(['#2a1a10', '#6a4a2a', '#c8a070']);
    r.overlay(g => {
      const W = r.W, H = r.H, s = KC.Story.s, L = KC.DATA.ladder;
      px.rect(g, 0, 40, W, H - 80, '#e8d8b0'); for (let y = 44; y < H - 40; y += 6) px.rect(g, 0, y, W, 1, '#dccca4'); px.rect(g, 0, 38, W, 4, '#6a3a1a'); px.rect(g, 0, H - 42, W, 4, '#6a3a1a');
      // the painted road
      for (let k = 0; k < L.length - 1; k++) { const a = [ROAD_X(k) - this.cam, this.nodeY(k)], b = [ROAD_X(k + 1) - this.cam, this.nodeY(k + 1)]; px.line(g, a[0], a[1], b[0], b[1], k < s.node ? '#8a5a2a' : '#b8a078', 3); }
      L.forEach((n, k) => {
        const x = ROAD_X(k) - this.cam, y = this.nodeY(k); if (x < -30 || x > W + 30) return;
        const done = k < s.node, next = k === s.node, rr = n.kind === 'match' ? 10 : 7, pulse = next ? 2 + Math.round(Math.sin(this.t * 6) * 2) : 0;
        px.disc(g, x, y, rr + pulse + 2, '#3a2010'); px.disc(g, x, y, rr + pulse, done ? '#8a6a3a' : next ? '#e8402a' : '#f4ecd8');
        if (n.kind === 'match') { const f = KC.ROSTER[n.opponent]; if (done) { px.rect(g, x - 6, y - 2, 12, 4, BELT[KC.RANKS[n.promote][1]]); } else T(g, f.name[0], x - 2, y - 3, next ? '#fff' : '#3a2010', { shadow: null }); }
        else if (n.kind === 'bonus') { if (n.bonus === 'boards') px.rect(g, x - 5, y - 2, 10, 4, '#c89a5a'); else if (n.bonus === 'pots') px.ell(g, x, y, 4, 5, '#b8683a'); else { px.rect(g, x - 5, y - 2, 10, 5, '#4a2e22'); px.rect(g, x - 6, y - 4, 2, 2, '#e8dcc0'); px.rect(g, x + 4, y - 4, 2, 2, '#e8dcc0'); } }
        else T(g, n.kind === 'practice' ? 'L' : n.kind === 'ending' ? '★' : '•', x - 2, y - 3, '#3a2010', { shadow: null });
        if (k === this.hover || next) { const lab = n.label; T(g, lab, x - TW(lab) / 2, y + rr + 6, next ? '#a8301a' : '#4a3020', { shadow: null }); }
      });
      const n = KC.Story.node(), st = KC.STAGE[n.stage];
      KC.title(g, 'THE CHAMPON ROAD', W / 2, 8, 2);
      const line = 'NEXT: ' + (st ? st.name : '') + (n.opponent ? ' — ' + KC.ROSTER[n.opponent].full : n.kind === 'bonus' ? ' — ' + KC.DATA.bonus[n.bonus].title : '');
      T(g, line, W / 2 - TW(line, BIG) / 2, H - 78, '#3a1a08', Object.assign({ shadow: null }, BIG));
      T(g, KC.RANKS[s.rank][0], 10, 46, '#3a1a08', { shadow: null }); px.rect(g, 10, 56, 30, 4, BELT[KC.RANKS[s.rank][1]]);
      T(g, 'SCORE ' + U.pad(s.score, 7), W - 10 - TW('SCORE 0000000'), 46, '#3a1a08', { shadow: null });
      // the rank road: ten belts from white to Champ
      for (let k = 0; k < 10; k++) { const x = W / 2 - 100 + k * 20; px.rect(g, x, H - 54, 16, 5, BELT[KC.RANKS[k][1]]); if (k === s.rank) { px.rect(g, x - 1, H - 56, 18, 1, '#e8402a'); px.rect(g, x - 1, H - 48, 18, 1, '#e8402a'); } }
      KC.bar(g, [[KC.ok(), 'GO'], [KC.back(), 'TITLE']]);
    });
  }
});

/* ---- CUTSCENES: title cards and lines with portraits and gibberish voices ---- */
scenes.cutscene = SC({
  enter(d) {
    this.d = d; this.done = false; this.lines = (KC.SCRIPTS[d.script] || []).slice(); this.i = -1; this.t = 0; this.stage = new Stage(d.stage || 'harbor', { mei: false }); this.stage.enter();
    this.talk = new E.Dialog(game, { speed: 40 }); this.card = null;
    const who = new Set(this.lines.map(l => l[0]).filter(w => w !== 'CARD'));
    this.actors = [...who].filter(w => w !== 'genkotsu').map((w, i) => { const k = new Karateka(w, i % 2, { x: i % 2 ? 250 : 150 }); if (w === 'mei') k.setBelt(d.script === 'finalEntrance' || d.ending ? 'gold' : 'white'); return k; });
    if (who.has('genkotsu')) this.ref = new Referee(); else this.ref = null;
    if (d.ending) { const tr = this.actors.find(a => a.id === 'taro'); if (tr) tr.setBelt('gold'); }
    KC.music(d.ending ? 'ending' : d.script === 'finalEntrance' ? 'stadium' : 'practice');
    if (DEV.skipCut) { game.after(.05, () => this.finish()); return; }
    this.next();
  },
  next() {
    this.i++; const L = this.lines[this.i]; if (!L) return this.finish();
    const [who, text] = L;
    if (who === 'CARD') { this.card = { text, t: 0 }; KC.Voice.speak(text, 'genkotsu'); return; }
    this.card = null; const name = who === 'genkotsu' ? 'JUDGE GENKOTSU' : KC.ROSTER[who].full;
    KC.Voice.speak(text, who);
    this.talk.say([text], { name, portrait: KC.portrait(who === 'mei' && this.d.script === 'harborMei' ? 'meiApron' : who), onDone: () => this.next() });
    const a = this.actors.find(a => a.id === who); if (a) { a.setPose(text.includes('!') ? 'win' : 'hips'); }
  },
  finish() { if (this.done) return; this.done = true; const then = this.d.then; if (then) then(); else game.go('title'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); this.actors.forEach(a => { if (a.st === 'pose' && a.stT > 1.2) { a.st = 'idle'; a.poseName = null; } a.update(dt); }); if (this.ref) this.ref.update(dt, 200);
    KC.stageCam(this.actors.length ? this.actors : [{ x: 200 }]);
    if (game.input.pressed('start') || game.input.pressed('pause')) { game.input.consumeAll(); this.talk.close && this.talk.close(); return this.finish(); }
    if (this.card) { this.card.t += dt; if (this.card.t > 2.2 || (this.card.t > .4 && (game.input.pressed('confirm') || (game.input.clicked && game.input.clicked())))) { game.input.consumeAll(); this.next(); } return; }
    this.talk.update(dt);
  },
  draw(r) {
    this.stage.draw(r); this.actors.forEach(a => a.draw(r)); if (this.ref) this.ref.draw(r);
    if (this.d.ending) r.shape('goldenBowl', 200, -10, 0, { scale: 1.3 });
    this.talk.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); const n = Math.floor(this.card.t * 30); KC.title(g, this.card.text.slice(0, n), W / 2, H / 2 - 10, this.card.text.length > 22 ? 2 : 3); }
      KC.promptRow(g, [[KC.ok(), 'NEXT'], [KC.startG(), 'SKIP']], W / 2, 6, 10);
    });
  }
});

/* ---- VS CARD: split panels, the taunt typed with its voice ---- */
scenes.vs = SC({
  enter(d) { this.d = d; this.t = 0; const n = d.node; this.p = [new Karateka('taro', 0), new Karateka(n.opponent, 1)]; this.p[0].setBelt(KC.RANKS[KC.Story.s.rank][1]); KC.Voice.speak(KC.ROSTER[n.opponent].quotes.intro, n.opponent); game.audio.sfx('gong'); KC.music(null); },
  update(dt) { this.t += dt; this.p.forEach(f => f.update(dt)); if (this.t > 3 || (this.t > .6 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); const n = this.d.node; game.go('fight', { mode: 'story', stage: n.stage, white: 'taro', red: n.opponent, node: n }); } },
  draw(r) {
    r.sky(['#05040a', '#05040a']);
    r.overlay(g => {
      const W = r.W, H = r.H, k = Math.min(1, this.t * 4), n = this.d.node, f = KC.ROSTER[n.opponent];
      px.poly(g, [[0, 0], [W / 2 + 20 - (1 - k) * W, 0], [W / 2 - 20 - (1 - k) * W, H], [0, H]], '#e8e4dc'); px.poly(g, [[W, 0], [W / 2 + 20 + (1 - k) * W, 0], [W / 2 - 20 + (1 - k) * W, H], [W, H]], '#a8201a');
      this.p[0].rig.drawPortrait(g, W * .25 - 40, 40, 80, { zoom: 3, turn: .5, bg: '#c8c4bc', frame: true });
      this.p[1].rig.drawPortrait(g, W * .75 - 40, 40, 80, { zoom: 3, turn: -.5, bg: '#781410', frame: true });
      T(g, 'TARO', W * .25 - TW('TARO', BIG) / 2, 126, '#1a1418', Object.assign({ shadow: null }, BIG)); T(g, KC.RANKS[KC.Story.s.rank][0], W * .25 - TW(KC.RANKS[KC.Story.s.rank][0]) / 2, 146, '#3a2a20', { shadow: null });
      T(g, f.full, W * .75 - TW(f.full, BIG) / 2, 126, '#fff6e8', BIG); T(g, f.title, W * .75 - TW(f.title) / 2, 146, '#ffd0c0');
      KC.title(g, 'VS', W / 2, H / 2 - 20, 4);
      const q = f.quotes.intro, nn = Math.floor(Math.max(0, this.t - .3) * 28); box(g, 20, H - 56, W - 40, 26, { alpha: .9 }); T(g, '"' + q.slice(0, nn) + (nn < q.length ? '' : '"'), W / 2 - TW('"' + q + '"') / 2, H - 48, '#fff6d0');
      T(g, KC.STAGE[n.stage].name, W / 2 - TW(KC.STAGE[n.stage].name) / 2, H - 22, '#c8c0e0');
    });
  }
});

/* ---- PROMOTION: Genkotsu presents the belt; it flies to the waist; the rank road lights up ---- */
scenes.promotion = SC({
  enter(d) {
    this.d = d; this.t = 0; this.stage = new Stage('dojo'); this.stage.enter(); this.hero = new Karateka('taro', 0, { x: 170 }); this.hero.setBelt(KC.RANKS[d.rank - 1 >= 0 ? d.rank - 1 : 0][1]); this.ref = new Referee();
    const s = KC.Story.s; s.rank = Math.max(s.rank, d.rank); const bonus = 1000 * d.rank; KC.Story.add(bonus); this.bonus = bonus; KC.Story.save();
    KC.music(null); KC.sting('promotion'); KC.Voice.speak('PROMOTED! ' + KC.RANKS[d.rank][0], 'genkotsu'); this.tied = false;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); this.ref.update(dt, 230); this.hero.update(dt); KC.stageCam([this.hero, { x: 230 }]);
    if (this.t > 1.2 && !this.tied) { this.tied = true; this.hero.setBelt(KC.RANKS[this.d.rank][1]); game.audio.sfx('beltTie'); game.particles.glints(this.hero.x, 0, 30, 12, '#ffe070'); this.hero.setPose('win'); KC.Voice.speak('OSU!', 'taro'); }
    if (this.t > 1.2) this.ref.signal('winner', 0);
    if (this.t > 4.2 || (this.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); this.d.then(); }
  },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r); this.ref.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, rk = KC.RANKS[this.d.rank];
      if (this.t < 1.2) { const k = this.t / 1.2, s = r.w(lerp(230, this.hero.x, k), 0, lerp(70, 30, k)); px.rect(g, s[0] - 8, s[1] - 2, 16, 4, BELT[rk[1]]); if (rk[1] === 'gold' || rk[1] === 'black') px.rect(g, s[0] - 8, s[1] - 2, 16, 1, '#ffffff'); }
      KC.title(g, 'PROMOTED!', W / 2, 30, 3); KC.title(g, rk[0], W / 2, 60, 2, ['#ffffff', BELT[rk[1]] === '#16161c' ? '#8a8aa0' : BELT[rk[1]], '#3a3a4a']);
      for (let k = 0; k < 10; k++) { const x = W / 2 - 110 + k * 22, on = k === this.d.rank && Math.floor(this.t * 4) % 2; px.rect(g, x, H - 48, 18, 6, BELT[KC.RANKS[k][1]]); if (k <= this.d.rank) px.rect(g, x, H - 40, 18, 1, '#ffd060'); if (on) px.rect(g, x - 2, H - 50, 22, 10, '#ffffff'); }
      T(g, 'RANK BONUS +' + this.bonus, W / 2 - TW('RANK BONUS +' + this.bonus) / 2, H - 30, '#ffd060');
    });
  }
});

/* ---- CONTINUE? 10 s; GAME OVER; initials ---- */
scenes['continue'] = SC({
  enter() { this.t = 10; this.stage = new Stage('harbor'); this.stage.enter(); this.hero = new Karateka('taro', 0, { x: 190 }); this.hero.setPose('lose'); this.lastBeep = 10; KC.music('continue'); KC.Voice.speak('GET UP, MOYASHI!', 'mei');
    const n = KC.Story.node(); this.menu = new Menu([{ label: 'CONTINUE', fn: () => this.pick(false) }, { label: 'CONTINUE (EASIER)', fn: () => this.pick(true), hidden: KC.diff() === 'Easy' && !KC.Story.s.easier }, { label: 'GIVE UP', fn: () => KC.Story.gameOver() }]); this.tip = KC.ROSTER[n.opponent] && KC.ROSTER[n.opponent].tip; },
  pick(easier) { const s = KC.Story.s; s.score = 0; s.conts++; s.easier = easier || s.easier; KC.Story.save(); KC.Story.start(); },
  update(dt) { this.t -= dt; this.stage.update(dt); this.hero.update(dt); KC.stageCam([this.hero]); if (Math.ceil(this.t) < this.lastBeep) { this.lastBeep = Math.ceil(this.t); KC.sfx('countBeep'); } if (this.t <= 0) return KC.Story.gameOver(); this.menu.update(dt); },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r);
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'CONTINUE?', W / 2, 24, 3); KC.title(g, String(Math.max(0, Math.ceil(this.t) - 1)), W / 2, 56, 5, ['#ffffff', '#ff8060', '#c02020']);
      T(g, 'MEI: "GET UP, MOYASHI!"', W / 2 - TW('MEI: "GET UP, MOYASHI!"') / 2, 108, '#ffd0e0'); if (this.tip) T(g, 'TIP: ' + this.tip, W / 2 - TW('TIP: ' + this.tip) / 2, 120, '#a8e8ff');
      this.menu.draw(g, W / 2, 140); KC.bar(g, [[KC.ok(), 'SELECT']]); });
  }
});
scenes.gameover = SC({
  enter(d) { this.d = d; this.t = 0; this.stage = new Stage('harbor'); this.stage.enter(); game.weather = { kind: 'rain', amount: .7, wind: .1 }; this.hero = new Karateka('taro', 0, { x: 190 }); this.hero.setPose('kneel'); KC.music('gameover'); KC.Voice.speak('TRAIN. RETURN.', 'genkotsu'); },
  update(dt) { this.t += dt; this.stage.update(dt); this.hero.update(dt); KC.stageCam([this.hero]); if (this.t > 4 || (this.t > 1 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); KC.initials(this.d.score, this.d.mode, () => game.go('title')); } },
  draw(r) { this.stage.draw(r); this.hero.draw(r); r.overlay(g => { KC.title(g, 'GAME OVER', r.W / 2, r.H * .3, 4, ['#ffffff', '#a0a0c0', '#4a4a6a']); T(g, 'GENKOTSU: "TRAIN. RETURN."', r.W / 2 - TW('GENKOTSU: "TRAIN. RETURN."') / 2, r.H * .3 + 44, '#c8c0e0'); }); }
});
/** the initials entry when the score makes the top ten (never while tuning values are changed: dev mode) */
KC.initials = (score, mode, then) => { if (score > 0 && cab.qualifies(score, mode) && !KC.tuneChanged()) game.go('initials', { score, mode, then }); else then(); };
scenes.initials = SC({
  enter(d) { this.d = d; KC.music('select'); cab.enter(d.score, d.mode, () => { this.done = true; }); this.done = false; },
  update(dt) { cab.update(dt); if (this.done) { this.done = false; game.go('records', { mode: this.d.mode, then: this.d.then }); } },
  draw(r) { r.sky(['#10081a', '#2a1440']); r.overlay(g => { KC.title(g, 'NEW RECORD!', r.W / 2, 20, 3); T(g, 'ENTER YOUR INITIALS', r.W / 2 - TW('ENTER YOUR INITIALS') / 2, 52, '#e8e0ff'); }); cab.draw(r); }
});

/* ---- ENDING CREDITS: the cast parade, each bowing with their name ---- */
const CREDITS = ['KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', 'DESIGN, CODE, ART, MUSIC AND VOICES: CLAUDE (ANTHROPIC)', 'ENGINE: MY-3D2DGE V0.85.2', 'PLAN: PLAN.MD', 'THANK YOU FOR PLAYING. OSU!'];
scenes.credits = SC({
  enter(d) { this.d = d || {}; this.t = 0; this.stage = new Stage('stadium'); this.stage.enter(); this.cast = KC.DATA.roster.map((f, i) => new Karateka(f.id, i % 2, { x: -40 })); this.i = 0; KC.music('ending'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); const per = 2.2, k = Math.floor(this.t / per);
    this.cast.forEach((c, i) => { const u = this.t / per - i; if (u < 0) { c.x = -60; return; } c.x = u < .4 ? lerp(-60, 200, u / .4) : u < 1 ? 200 : lerp(200, 460, (u - 1) / .4); c.st = u < .4 || u > 1 ? 'walk' : 'pose'; c.vx = 70; c.poseName = 'bow'; c.stT = (u - .4) * per; c.face = 1; c.update(dt); });
    KC.stageCam([{ x: 200 }]);
    if (this.t > this.cast.length * per + 6 || (this.t > 1 && game.input.pressed('start'))) { game.input.consumeAll(); if (this.d.story) KC.initials(KC.Story.s.score, 'story', () => game.go('title')); else game.go(this.d.back || 'title', { menu: true }); }
  },
  draw(r) {
    this.stage.draw(r); this.cast.forEach(c => c.draw(r));
    r.overlay(g => { const W = r.W, H = r.H, per = 2.2, k = Math.floor(this.t / per), c = this.cast[k]; if (c) { const f = KC.ROSTER[c.id]; KC.title(g, f.full, W / 2, H * .2, 3); T(g, f.title, W / 2 - TW(f.title) / 2, H * .2 + 30, '#ffd0c0'); }
      const ci = Math.floor(this.t / 3) % CREDITS.length; T(g, CREDITS[ci], W / 2 - TW(CREDITS[ci]) / 2, H - 30, '#e8e0ff'); KC.promptRow(g, [[KC.startG(), 'SKIP']], W - 60, 6, 10); });
  }
});

/* ---- RECORDS: one table per page; L1/R1, Q/E or click the tabs ---- */
const REC_MODES = [['story', 'CHAMPON ROAD'], ['boards', 'BOARDS'], ['pots', 'POTS AHOY!'], ['bull', 'STOP THE BULL']];
scenes.records = SC({
  enter(d) { this.d = d || {}; this.i = Math.max(0, REC_MODES.findIndex(m => m[0] === this.d.mode)); this.t = 0; KC.music('select'); },
  update(dt) {
    this.t += dt; if (KC.Attract.tick(dt)) return; const I = game.input, c = I.clicked && I.clicked();
    if (I.pressed('l1') || I.pressed('left')) { this.i = (this.i + 3) % 4; KC.sfx('menuMove'); } if (I.pressed('r1') || I.pressed('right')) { this.i = (this.i + 1) % 4; KC.sfx('menuMove'); }
    if (c && c[1] < 40) { const k = Math.floor(c[0] / (game.W / 4)); if (k >= 0 && k < 4) { this.i = k; KC.sfx('menuMove'); } }
    if (I.pressed('cancel') || I.pressed('confirm') || (c && c[1] > game.H - 20)) { if (this.d.then) this.d.then(); else game.go('title', { menu: true }); }
  },
  draw(r) {
    r.sky(['#10081a', '#2a1440', '#3a1a30']);
    r.overlay(g => {
      const W = r.W, H = r.H, m = REC_MODES[this.i], tb = cab.table(m[0]);
      REC_MODES.forEach((mm, k) => { const x = k * W / 4, on = k === this.i; box(g, x + 2, 4, W / 4 - 4, 22, { alpha: on ? .95 : .5, border: on ? '#ffd060' : '#5a5070' }); T(g, mm[1], x + W / 8 - TW(mm[1]) / 2, 11, on ? '#ffd060' : '#a8a0c0'); });
      KC.title(g, m[1], W / 2, 34, 2);
      for (let k = 0; k < 10; k++) { const e = tb[k], y = 54 + k * 16, col = k === 0 ? '#ffd060' : '#f4ecd8'; T(g, (k + 1) + '.', W / 2 - 110, y, col, BIG); T(g, e ? e.name : '---', W / 2 - 70, y, col, BIG); T(g, e ? U.pad(e.score, 7) : '-------', W / 2 + 10, y, col, BIG); }
      KC.bar(g, [[KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'PAGE'], [KC.back(), 'BACK']]);
    });
  }
});

/* ---- ABOUT: paged, at most 8 lines a page (the same text as the chat reply and exit-interview.json) ---- */
KC.aboutPages = () => {
  const A = KC.ABOUT, pages = [], wrapW = Math.min(game.W - 48, 400), push = (title, lines) => { const all = []; for (const l of lines) all.push(...E.font.wrap(l, wrapW)); for (let i = 0; i < all.length; i += 8) pages.push({ title: title + (all.length > 8 ? ' ' + (i / 8 + 1) + '/' + Math.ceil(all.length / 8) : ''), lines: all.slice(i, i + 8) }); };
  const si = A.sourceInformation, L = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  push('SOURCE INFORMATION', Object.keys(L).map(k => L[k] + ': ' + si[k]));
  const TQ = ['ISSUES CAUGHT', 'CRITICAL', 'MOST HELPFUL TEST', 'LEAST HELPFUL TEST'], EQ = ['LIKED MOST', 'STUCK OR GUESSED WRONG', 'BUILT MYSELF', 'HARDEST PART', 'ENGINE CHANGES', 'ONE CHANGE'], PQ = ['LIKED MOST', 'CONFUSING', 'HARDEST', 'WOULD CHANGE'];
  push('TESTING FEEDBACK', A.testingFeedback.map((a, i) => TQ[i] + ': ' + a));
  push('ENGINE FEEDBACK', A.engineFeedback.map((a, i) => EQ[i] + ': ' + a));
  push('PROMPT FEEDBACK', A.promptFeedback.map((a, i) => PQ[i] + ': ' + a));
  push('CREDITS', ['GAME: KARATE CHAMPON, AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (DATA EAST, 1984).', 'MADE BY CLAUDE (ANTHROPIC, CLAUDE-OPUS-5-5) FOR MICHAEL CROSATO.', 'ENGINE: MY-3D2DGE V0.85.2 (MIT), EXTENDED.', 'ONLINE: AI HUB SESSION CLIENT 1.4.0.', 'ALL ART, MUSIC, SOUND AND VOICES ARE GENERATED IN CODE.', 'THANKS: THE ARCADE PIONEERS OF 1984.']);
  return pages;
};
scenes.about = SC({
  enter(d) { this.d = d || {}; this.p = 0; this.pages = KC.aboutPages(); KC.music('select'); },
  update(dt) {
    if (KC.Attract.tick(dt)) return; const I = game.input, c = I.clicked && I.clicked();
    if (I.repeat('right', .35, .12) || I.pressed('r1') || I.pressed('confirm') || (c && c[0] > game.W / 2 && c[1] < game.H - 20)) { this.p = Math.min(this.pages.length - 1, this.p + 1); KC.sfx('menuMove'); }
    if (I.repeat('left', .35, .12) || I.pressed('l1') || (c && c[0] <= game.W / 2 && c[1] < game.H - 20)) { this.p = Math.max(0, this.p - 1); KC.sfx('menuMove'); }
    if (I.pressed('cancel') || (c && c[1] >= game.H - 20)) game.go(this.d.back || 'title', { menu: true });
  },
  draw(r) {
    r.sky(['#0a0814', '#1a1030']);
    r.overlay(g => { const W = r.W, H = r.H, pg = this.pages[this.p]; KC.title(g, pg.title, W / 2, 10, 2); box(g, 14, 34, W - 28, H - 60, { alpha: .9 });
      pg.lines.forEach((l, i) => { const k = l.indexOf(': '), head = /^[A-Z][A-Z .]+: /.test(l) ? l.slice(0, k + 2) : ''; T(g, head, 22, 44 + i * 19, '#ffd060'); T(g, l.slice(head.length), 22 + TW(head), 44 + i * 19, '#f4ecd8'); });
      T(g, (this.p + 1) + ' / ' + this.pages.length, W - 60, H - 40, '#a8a0c0'); KC.bar(g, [[KC.dev() === 'pad' ? 'L:l' : 'key:A', ''], [KC.dev() === 'pad' ? 'L:r' : 'key:D', 'PAGE'], [KC.back(), 'BACK']]); });
  }
});

/* ---- the DOJO and BONUS GAMES menus ---- */
const menuScene = (title, items, sub) => SC({
  enter() { this.menu = new Menu(items(), { onCancel: () => game.go('title', { menu: true }) }); this.stage = new Stage(sub); this.stage.enter(); this.f = [new Karateka('negi', 1, { x: 260 }), new Karateka('taro', 0, { x: 140 })]; KC.music(sub === 'dojo' ? 'practice' : 'bonus'); KC.Attract.poke(); },
  update(dt) { this.stage.update(dt); this.f.forEach(f => f.update(dt)); KC.stageCam(this.f); if (KC.Attract.tick(dt)) return; this.menu.update(dt); },
  draw(r) { this.stage.draw(r); this.f.forEach(f => f.draw(r)); r.overlay(g => { px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614')); KC.title(g, title, r.W / 2, 16, 3); this.menu.draw(g, r.W / 2, 64); KC.bar(g, [[KC.ok(), 'SELECT'], [KC.back(), 'BACK']]); }); }
});
scenes.dojoMenu = menuScene('DOJO', () => [
  { label: 'LESSON I: BASICS', fn: () => game.go('practice', { lesson: 'I' }) }, { label: 'LESSON II: STEP IN', fn: () => game.go('practice', { lesson: 'II' }) },
  { label: 'LESSON III: SPINS', fn: () => game.go('practice', { lesson: 'III' }) }, { label: 'ALL TECHNIQUES (21)', fn: () => game.go('practice', { lesson: 'ALL' }) },
  { label: 'FREE SPAR', fn: () => game.go('fight', { mode: 'freeSpar', stage: 'dojo', white: 'taro', red: 'negi' }) }, { label: 'MOVE LIST', fn: () => KC.MoveList.open('dojoMenu') }], 'dojo');
let bonusDiff = 1;
scenes.bonusMenu = menuScene('BONUS GAMES', () => [
  { label: 'BREAK THE BOARDS', fn: () => game.go('bonus', { kind: 'boards', diff: bonusDiff }) }, { label: 'POTS AHOY!', fn: () => game.go('bonus', { kind: 'pots', diff: bonusDiff }) },
  { label: 'STOP THE BULL', fn: () => game.go('bonus', { kind: 'bull', diff: bonusDiff }) },
  { label: () => '← ' + ['EASY', 'NORMAL', 'HARD'][bonusDiff] + ' →', adjust: d => { bonusDiff = clamp(bonusDiff + d, 0, 2); }, fn: () => { bonusDiff = (bonusDiff + 1) % 3; } }], 'courtyard');
