/* =====================================================================================================================
 * VERSUS: player 1 (WHITE) against player 2 (RED: a second pad or the keyboard's right half, or the CPU at level 1-10).
 * Setup -> character select (a 5 x 2 grid of portraits, locks, the mouse) -> stage select (the real stage behind) -> the
 * fight -> results. With 3 or 4 players joined, KACHINUKI: winner stays on, the loser goes to the back of the queue, the
 * first to 5 bout wins is champion (KC.Kachinuki, which the online session uses too).
 * ===================================================================================================================== */
KC.Kachinuki = class {
  /** new KC.Kachinuki({ ids: [player ids in queue order], target: bout wins to be champion }) */
  constructor(o) { this.queue = o.ids.slice(); this.target = o.target || KC.TUNE.sessionTarget; this.wins = {}; this.streak = {}; this.best = {}; this.pts = {}; this.conc = {}; this.full = {}; this.half = {}; this.blocks = {}; for (const id of o.ids) { this.wins[id] = 0; this.streak[id] = 0; this.best[id] = 0; this.pts[id] = 0; this.conc[id] = 0; this.full[id] = 0; this.half[id] = 0; this.blocks[id] = 0; } this.bouts = 0; this.champion = null; this.lastWinner = null; }
  /** who fights now: [white, red] */
  current() { return [this.queue[0], this.queue[1]]; }
  /** a bout ended: winner stays (white next time), the loser goes to the back */
  result(winner, stats) {
    const [w, r] = this.current(), loser = winner === w ? r : w; this.bouts++; this.lastWinner = winner;
    this.wins[winner]++; this.streak[winner]++; this.streak[loser] = 0; this.best[winner] = Math.max(this.best[winner], this.streak[winner]);
    if (stats) for (const id of [w, r]) { const s = stats[id]; if (!s) continue; this.pts[id] += s.pts || 0; this.conc[id] += s.conceded || 0; this.full[id] += s.full || 0; this.half[id] += s.half || 0; this.blocks[id] += s.blocks || 0; }
    this.queue = [winner].concat(this.queue.filter(id => id !== winner && id !== loser), [loser]);
    if (this.wins[winner] >= this.target) this.champion = winner;
    return winner;
  }
  /** a player left: out of the queue; a bout in progress is the other's by forfeit (the caller decides) */
  remove(id) { this.queue = this.queue.filter(q => q !== id); }
  /** the standings: by bout wins, then points scored, then fewest conceded; ties grouped */
  standings() {
    const ids = Object.keys(this.wins).map(Number).filter(id => this.queue.includes(id) || this.wins[id] > 0 || true), key = id => [this.wins[id], this.pts[id], -this.conc[id]];
    const sorted = ids.slice().sort((a, b) => { const A = key(a), B = key(b); for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return B[i] - A[i]; return 0; });
    const out = []; for (const id of sorted) { const last = out[out.length - 1]; if (last && key(last[0]).join() === key(id).join()) last.push(id); else out.push([id]); }
    return out;
  }
};
const PORTRAIT_ORDER = ['taro', 'kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];
KC.locked = fid => { const F = KC.FIGHTER[fid]; return !!(F.unlock && !KC.Save.unlocked(F.unlock)); };
KC.Versus = {
  /** a quick bout (a deep link, the dev warp): taro vs an opponent on a stage */
  quickData(stage, opp) { return { mode: 'versus', stage: KC.STAGE[stage] ? stage : 'dojo', sides: [{ fid: 'taro', input: KC.game.input }, { fid: KC.FIGHTER[opp] ? opp : 'kamaboko' }], retry: () => KC.game.go('fight', KC.Versus.quickData(stage, opp)), onEnd: (w, b) => { b._w = w; }, afterEnd: (sc) => { if (sc.endT > 1.5) { sc.d.afterEnd = null; KC.game.go('results', { bout: sc.bout, data: sc.d }); } } }; },
  /** free spar against the dummy (the dojo menu) */
  sparData(dummy) { return { mode: 'freeSpar', stage: 'dojo', dummy: dummy || 'stand', sides: [{ fid: 'taro', input: KC.game.input }, { fid: 'negi' }], noCrowd: true }; }
};
KC.VersusScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.t = 0; this.mode = d.mode || 'setup'; KC.music('select'); g.lights.enabled = false; KC.idle = 0;
    if (!this.cfg) this.cfg = { cpu: true, level: 5, rounds: 2, points: 2, picks: ['taro', 'kamaboko'], stage: 0 };
    g.allowJoin({ max: 4, onJoin: (input, n) => { input.use(KC_KEYS); KC.sfx('menuOk'); g.note('PLAYER ' + n + ' JOINED'); this.cfg.cpu = false; if (input.half === 'right') this._splitKeys(); this._buildMenu(); } });
    this._splitKeys(); this._buildMenu();
    if (d.kachinuki && g.players.length < 3) { /* deep link: CPU fill-ins are not players; the menu shows how to join */ }
    if (this.mode === 'select') this._selectInit(); if (this.mode === 'stage') this._stageInit();
  },
  // two players on one keyboard: player 1 keeps WASD with T F G H, player 2 the arrows with I J K L
  _splitKeys() { const P = KC.game.players, kb = P.filter(I => I.half === 'right'); if (kb.length) { P[0].use(KC_KEYS_P1); kb.forEach(I => I.use(KC_KEYS_P2)); } else P[0].use(KC_KEYS); },
  _buildMenu() {
    const C = this.cfg, P = KC.game.players, n = P.length, items = [];
    items.push({ label: 'RED', value: n > 1 && !C.cpu ? 'PLAYER 2' : 'CPU', act: () => { if (n > 1) { C.cpu = !C.cpu; this._buildMenu(); } }, adjust: () => { if (n > 1) { C.cpu = !C.cpu; this._buildMenu(); } }, sub: n > 1 ? 'PLAYER 2 IS IN' : 'PLAYER 2: PRESS START ON A SECOND PAD, OR 2 ON THE KEYBOARD' });
    if (C.cpu || n < 2) items.push({ label: 'CPU LEVEL', value: C.level, adjust: k => { C.level = clamp(C.level + k, 1, 10); this._buildMenu(); }, act: () => { C.level = C.level % 10 + 1; this._buildMenu(); }, sub: 'LEFT AND RIGHT CHANGE IT' });
    items.push({ label: 'MATCH', value: C.rounds === 1 ? 'ONE ROUND' : 'BEST OF ' + (C.rounds * 2 - 1), adjust: k => { C.rounds = clamp(C.rounds + k, 1, 3); this._buildMenu(); }, act: () => { C.rounds = C.rounds % 3 + 1; this._buildMenu(); } });
    items.push({ label: 'POINTS TO WIN', value: C.points, adjust: k => { C.points = clamp(C.points + k * .5, 1, 3); this._buildMenu(); }, act: () => { C.points = C.points >= 3 ? 1 : C.points + .5; this._buildMenu(); } });
    items.push({ label: 'CHOOSE FIGHTERS', act: () => { this.mode = 'select'; this._selectInit(); } });
    if (n >= 3) items.push({ label: 'KACHINUKI (' + n + ' PLAYERS)', sub: KC.TEXT.kachinuki + ' FIRST TO ' + KC.TUNE.sessionTarget + ' BOUT WINS', act: () => this._kachinuki() });
    items.push({ label: 'BACK', act: () => KC.game.go('title', { menu: true }) });
    if (this.menu) this.menu.setItems(items); else this.menu = new KC.Menu({ items, y: 60, onCancel: () => KC.game.go('title', { menu: true }) });
  },
  _selectInit() {
    const C = this.cfg, P = KC.game.players; this.cur = [PORTRAIT_ORDER.indexOf(C.picks[0]), PORTRAIT_ORDER.indexOf(C.picks[1])]; this.done = [false, false];
    this.selInputs = [P[0], !C.cpu && P[1] ? P[1] : null]; this.selT = 0; this.rigs = {};
  },
  _rig(fid, side) { const k = fid + side; return this.rigs[k] || (this.rigs[k] = (() => { const r = KC.makeRig(fid, side ? 'red' : 'white', null); for (let i = 0; i < 5; i++) r.update(.05, { x: 0, y: 0, z: 0, facing: side ? PI - .5 : .5, expr: 'smile' }); return r; })()); },
  _stageInit() { this.stT = 0; KC.Stage.enter(KC.game, KC.FIGHT_STAGES[this.cfg.stage] || 'dojo'); },
  update(dt) {
    const g = KC.game; this.t += dt;
    if (this.mode === 'setup') { if (KC.idleStep(dt)) { g.go('attract'); return; } this.menu.update(dt); return; }
    if (this.mode === 'select') return this._selectStep(dt);
    if (this.mode === 'stage') return this._stageStep(dt);
  },
  _selectStep(dt) {
    const C = this.cfg; this.selT += dt; const N = PORTRAIT_ORDER.length, I0 = KC.game.input;
    // the cursor that moves now: player 1's, then player 2's (or player 1 picks the CPU's too)
    const who = !this.done[0] ? 0 : 1, I = this.selInputs[who] || this.selInputs[0];
    const mv = (dx, dy) => { let i = this.cur[who]; const c = i % 5, r = Math.floor(i / 5); i = ((r + dy + 2) % 2) * 5 + (c + dx + 5) % 5; this.cur[who] = i; KC.sfx('menuMove'); };
    if (I.repeat('left')) mv(-1, 0); if (I.repeat('right')) mv(1, 0); if (I.repeat('up')) mv(0, -1); if (I.repeat('down')) mv(0, 1);
    const p = KC.moved(I0, this), c = I0.clicked(); if (this.cells) for (const [i, x, y, w, h] of this.cells) { if (p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) { this.cur[who] = i; } if (c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.cur[who] = i; this._pick(who); } }
    if (I.pressed('confirm')) { I.consumeAll(); this._pick(who); }
    if (I.pressed('cancel')) { I.consumeAll(); if (who === 1 && this.done[0]) this.done[0] = false; else { this.mode = 'setup'; } }
    void N; void dt;
  },
  _pick(who) {
    const fid = PORTRAIT_ORDER[this.cur[who]];
    if (KC.locked(fid)) { KC.sfx('menuBack'); KC.game.note(fid === 'mei' ? 'FINISH THE CHAMPON ROAD TO UNLOCK' : 'REACH MATCH 8 OF THE ROAD TO UNLOCK'); return; }
    KC.sfx('menuOk'); KC.Voice.speak(KC.FIGHTER[fid].quotes.intro, fid); this.done[who] = true; this.cfg.picks[who] = fid;
    if (this.kachi) { this.kachi.picks.push(fid); if (this.kachi.picks.length >= this.kachi.n) { this._kachiStart(); return; } this.done = [false, false]; this.selInputs = [KC.game.players[this.kachi.picks.length], null]; return; }
    if (this.done[0] && this.done[1]) { this.mode = 'stage'; this._stageInit(); }
  },
  _stageStep(dt) {
    const C = this.cfg, n = KC.FIGHT_STAGES.length + 1, I = KC.game.input; this.stT += dt; KC.Stage.update(dt);
    const chg = k => { C.stage = (C.stage + k + n) % n; KC.sfx('menuMove'); if (C.stage < KC.FIGHT_STAGES.length) KC.Stage.enter(KC.game, KC.FIGHT_STAGES[C.stage]); };
    if (KC.anyRepeat('left')) chg(-1); if (KC.anyRepeat('right')) chg(1);
    const c = I.clicked(); if (c && this.arrows) { if (c[0] < this.arrows[0]) chg(-1); else if (c[0] > this.arrows[1]) chg(1); else this._fight(); }
    if (KC.anyPressed('confirm')) { KC.consumeAll(); this._fight(); }
    if (KC.anyPressed('cancel')) { KC.consumeAll(); this.mode = 'select'; this._selectInit(); }
    KC.camera(KC.game, [200]);
  },
  fightData() {
    const C = this.cfg, P = KC.game.players, R = KC.rng(KC.hash('st' + this.t)), st = C.stage >= KC.FIGHT_STAGES.length ? KC.FIGHT_STAGES[Math.floor(R() * KC.FIGHT_STAGES.length)] : KC.FIGHT_STAGES[C.stage];
    const data = { mode: 'versus', stage: st, seed: Math.floor(this.t * 1000) % 9973 + 1, rules: { roundsToWin: C.rounds, pointsToWin: C.points }, sides: [{ fid: C.picks[0], input: P[0] }, C.cpu || !P[1] ? { fid: C.picks[1], cpu: C.level } : { fid: C.picks[1], input: P[1] }],
      retry: () => KC.game.go('fight', data), onEnd: () => {}, afterEnd: sc => { if (sc.endT > 1.5) { sc.d.afterEnd = null; KC.game.go('results', { bout: sc.bout, data }); } } };
    return data;
  },
  _fight() { KC.game.go('fight', this.fightData()); },
  // KACHINUKI: every joined player picks a fighter in turn, then the bouts
  _kachinuki() { const n = KC.game.players.length; this.kachi = { n, picks: [] }; this.mode = 'select'; this._selectInit(); this.selInputs = [KC.game.players[0], null]; },
  _kachiStart() { const K = this.kachi; KC.LocalKachi.start(K.picks); this.kachi = null; },
  draw(r) {
    if (this.mode === 'stage') { const id = KC.FIGHT_STAGES[this.cfg.stage]; if (id) KC.Stage.draw(r, id, {}); }
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (this.mode !== 'stage') { px.rect(g, 0, 0, W, H, '#0e0a1c'); for (let y = 0; y < H; y += 4) px.rect(g, 0, y, W, 1, '#140e26'); }
      E.font.title(g, this.kachi ? 'KACHINUKI' : 'VERSUS', mid, 6, { scale: 3, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      if (this.mode === 'setup') {
        const P = KC.game.players; P.forEach((I, i) => E.font.text(g, 'P' + (i + 1) + ' ' + (I.half === 'right' ? 'KEYS (RIGHT)' : I.padIndex !== null && I.padIndex !== undefined ? 'PAD ' + (I.padIndex + 1) : 'KEYS'), 12 + i * 100, 40, E.PLAYER_COLORS ? E.PLAYER_COLORS[i] : '#ffffff', { outline: false }));
        const sub = this.menu.draw(g, W, H); if (sub) E.font.text(g, sub, mid, H - 34, '#ffe7a8', { align: 'center', outline: '#000' });
        KC.promptBar(g, W, H, [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]);
      } else if (this.mode === 'select') this._drawSelect(g, W, H);
      else {
        const C = this.cfg, n = KC.FIGHT_STAGES.length, id = KC.FIGHT_STAGES[C.stage], name = id ? KC.STAGE[id].name : 'RANDOM';
        if (!id) px.rect(g, 0, 40, W, H - 80, '#1a1430');
        E.ui.box(g, mid - 110, H - 64, 220, 30, { bg: '#0c0a18', border: '#e8d8b0', alpha: .9 });
        E.font.text(g, '← ' + name + ' →', mid, H - 58, '#fff6d0', { align: 'center', outline: false, scale: 2 }); E.font.text(g, (C.stage + 1) + '/' + (n + 1), mid, H - 42, '#a8a0c8', { align: 'center', outline: false, font: 'tiny' });
        this.arrows = [mid - 80, mid + 80];
        KC.promptBar(g, W, H, [['left', 'STAGE'], ['confirm', 'FIGHT!'], ['cancel', 'BACK']]);
      }
    });
  },
  _drawSelect(g, W, H) {
    const mid = Math.round(W / 2), cw = 34, ch = 34, x0 = mid - Math.round(cw * 2.5), y0 = 58; this.cells = [];
    PORTRAIT_ORDER.forEach((fid, i) => {
      const x = x0 + (i % 5) * cw, y = y0 + Math.floor(i / 5) * ch, lock = KC.locked(fid), rig = this._rig(fid, 0);
      if (lock) { px.rect(g, x + 1, y + 1, cw - 2, ch - 2, '#14101e'); rig.drawPortrait(g, x + 2, y + 2, cw - 4, { tint: '#000000', bg: '#14101e', zoom: 2.2 }); E.font.text(g, '?', x + cw / 2, y + 10, '#8a80a8', { align: 'center', outline: false, scale: 2 }); }
      else rig.drawPortrait(g, x + 2, y + 2, cw - 4, { bg: '#2a2040', zoom: 2.2 });
      this.cells.push([i, x, y, cw, ch]);
    });
    const cols = ['#ffffff', '#ff5a4a', '#4a8aff', '#4ad860'], label = this.kachi ? 'P' + (this.kachi.picks.length + 1) : null;
    this.cur.forEach((ci, s) => { if (s === 1 && !this.done[0]) return; if (this.kachi && s === 1) return; const x = x0 + (ci % 5) * cw, y = y0 + Math.floor(ci / 5) * ch, c = this.kachi ? cols[this.kachi.picks.length % 4] : cols[s], pulse = Math.floor(this.selT * 6) % 2; for (let k = 0; k < 2; k++) { px.rect(g, x + k, y + k, cw - 2 * k, 1, c); px.rect(g, x + k, y + ch - 1 - k, cw - 2 * k, 1, c); px.rect(g, x + k, y + k, 1, ch - 2 * k, c); px.rect(g, x + cw - 1 - k, y + k, 1, ch - 2 * k, c); } E.font.text(g, label || (s === 0 ? '1P' : this.selInputs[1] ? '2P' : 'CPU'), x + 2, y - 8 + pulse, c, { outline: '#000', font: 'tiny' }); });
    // the big portraits: name, style, three stat bars
    [0, 1].forEach(s => {
      if (this.kachi && s === 1) return;
      const fid = PORTRAIT_ORDER[this.cur[s]], F = KC.FIGHTER[fid], x = s ? W - 82 : 12, lock = KC.locked(fid);
      if (s === 1 && !this.done[0] && !this.kachi) return;
      this._rig(fid, s).drawPortrait(g, x, 56, 70, { frame: true, bg: s ? '#5a1010' : '#5a5448', tint: lock ? '#000000' : undefined, zoom: 2 });
      E.font.text(g, lock ? '???' : F.short, x + 35, 130, '#fff6d0', { align: 'center', outline: '#000', scale: 2 });
      E.font.text(g, lock ? 'LOCKED' : F.style, x + 35, 148, '#c8c0e8', { align: 'center', outline: false, font: 'tiny' });
      if (!lock) [['WALK', F.stats.walk], ['REACH', F.stats.reach], ['SPEED', F.stats.speed]].forEach(([n, v], k) => { E.font.text(g, n, x, 158 + k * 9, '#a8a0c8', { outline: false, font: 'tiny' }); E.ui.bar(g, x + 28, 158 + k * 9, 42, 5, clamp((v - .75) / .4, 0, 1), '#ffd060'); });
    });
    E.font.text(g, this.kachi ? 'PLAYER ' + (this.kachi.picks.length + 1) + ': PICK YOUR FIGHTER' : !this.done[0] ? 'WHITE: PICK YOUR FIGHTER' : this.selInputs[1] ? 'RED (PLAYER 2): PICK YOUR FIGHTER' : 'PICK THE CPU\'S FIGHTER', mid, 40, '#ffe7a8', { align: 'center', outline: '#000' });
    KC.promptBar(g, W, H, [['confirm', 'PICK'], ['cancel', 'BACK']]);
  },
  back() { if (this.mode !== 'setup') { this.mode = 'setup'; return true; } KC.game.go('title', { menu: true }); return true; }
};

/* ---- local kachinuki: bouts of one round, winner stays on, the others kneel in seiza by the mat ---- */
KC.LocalKachi = {
  start(picks) { const P = KC.game.players; this.picks = picks; this.K = new KC.Kachinuki({ ids: picks.map((_, i) => i), target: KC.TUNE.sessionTarget }); this.bout(); void P; },
  bout() {
    const K = this.K, P = KC.game.players, [w, r] = K.current(), cols = ['#ffffff', '#ff5a4a', '#4a8aff', '#4ad860'], stage = 'stadium';
    const data = { mode: 'kachinuki', stage, seed: K.bouts + 1, rules: { roundsToWin: 1, pointsToWin: 2, intro: K.bouts === 0 }, noBelt: true,
      sides: [{ fid: this.picks[w], input: P[w], name: 'P' + (w + 1), color: cols[w], tag: 'STREAK ' + K.streak[w] }, { fid: this.picks[r], input: P[r], name: 'P' + (r + 1), color: cols[r], tag: 'STREAK ' + K.streak[r] }],
      bench: K.queue.slice(2).map(id => ({ fid: this.picks[id], color: cols[id] })),
      onEnd: (win, b) => { const ids = [w, r], st = {}; ids.forEach((id, s) => { st[id] = { pts: b.score[s], conceded: b.conceded[s], full: b.f[s].stats.full, half: b.f[s].stats.half, blocks: b.f[s].stats.blocks }; }); K.result(ids[win], st); },
      afterEnd: sc => { if (sc.endT > 1.6) { sc.d.afterEnd = null; if (K.champion !== null) KC.game.go('results', { kachinuki: K, picks: this.picks }); else this.bout(); } },
      overlay: (g, W, H) => { E.font.text(g, KC.TEXT.kachinuki + '  FIRST TO ' + K.target, Math.round(W / 2), H - 26, '#ffe7a8', { align: 'center', outline: '#000' }); K.queue.slice(2).forEach((id, i) => E.font.text(g, 'NEXT: P' + (id + 1), 8 + i * 50, H - 40, cols[id], { outline: '#000' })); } };
    KC.game.go('fight', data);
  }
};

/* ---- RESULTS (versus and local kachinuki) ---- */
KC.ResultsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; this.t = 0; KC.music('ending'); KC.Stage.enter(KC.game, 'stadium'); KC.idle = 0;
    if (d.kachinuki) { const K = d.kachinuki; this.win = KC.makeRig(d.picks[K.champion], 'white', null); this.menu = new KC.Menu({ items: [{ label: 'AGAIN', act: () => KC.LocalKachi.start(d.picks) }, { label: 'MAIN MENU', act: () => KC.game.go('title', { menu: true }) }], y: 130 }); }
    else { const b = d.bout, w = b.winner; this.win = KC.makeRig(b.f[w].fid, w ? 'red' : 'white', b.f[w].rank); const V = KC.VersusScene; this.menu = new KC.Menu({ items: [{ label: 'REMATCH', act: () => KC.game.go('fight', d.data) }, { label: 'CHARACTER SELECT', act: () => KC.game.go('versus', { mode: 'select' }) }, { label: 'STAGE SELECT', act: () => KC.game.go('versus', { mode: 'stage' }) }, { label: 'MAIN MENU', act: () => KC.game.go('title', { menu: true }) }], y: 124 }); void V; }
  },
  update(dt) { this.t += dt; KC.Stage.update(dt); this.win.update(dt, { x: 120, y: 0, z: 0, facing: .3, pose: 'cheer', expr: 'shout' }); KC.camera(KC.game, [200]); if (this.t > 1) this.menu.update(dt); if (KC.idleStep(dt)) KC.game.go('attract'); },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    r.actor(120, 0, 0, (g, ox, oy) => this.win.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2) + 40;
      px.blend(g, .55, 'normal', () => px.rect(g, mid - 120, 6, 240, H - 30, '#05040a'));
      if (this.d.kachinuki) {
        const K = this.d.kachinuki; E.font.title(g, 'P' + (K.champion + 1) + ' IS CHAMPION!', mid, 12, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        K.standings().flat().forEach((id, i) => E.font.text(g, (i + 1) + '. P' + (id + 1) + '  ' + K.wins[id] + ' WINS  BEST STREAK ' + K.best[id], mid, 40 + i * 16, '#fff6e8', { align: 'center', outline: false }));
      } else {
        const b = this.d.bout, w = b.winner, f = b.f;
        E.font.title(g, (w ? 'RED' : 'WHITE') + ' WINS ' + b.roundWins[w] + '-' + b.roundWins[1 - w], mid, 12, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const rows = [['FULL POINTS', f[0].stats.full, f[1].stats.full], ['HALF POINTS', f[0].stats.half, f[1].stats.half], ['BLOCKS', f[0].stats.blocks, f[1].stats.blocks], ['BEST', f[0].stats.best ? KC.TECH[f[0].stats.best].name : '-', f[1].stats.best ? KC.TECH[f[1].stats.best].name : '-']];
        E.font.text(g, 'WHITE', mid - 90, 40, '#fff6e8', { outline: false }); E.font.text(g, 'RED', mid + 90, 40, '#ff5a4a', { align: 'right', outline: false });
        rows.forEach(([n, a, c], i) => { const y = 54 + i * 16; E.font.text(g, n, mid, y, '#ffd060', { align: 'center', outline: false }); E.font.text(g, String(a), mid - 90, y, '#fff6e8', { outline: false, font: typeof a === 'string' ? 'tiny' : undefined }); E.font.text(g, String(c), mid + 90, y, '#ffd0c0', { align: 'right', outline: false, font: typeof c === 'string' ? 'tiny' : undefined }); });
      }
      this.menu.x = mid - 80; this.menu.w = 160; if (this.t > 1) this.menu.draw(g, W, H);
      KC.promptBar(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};
