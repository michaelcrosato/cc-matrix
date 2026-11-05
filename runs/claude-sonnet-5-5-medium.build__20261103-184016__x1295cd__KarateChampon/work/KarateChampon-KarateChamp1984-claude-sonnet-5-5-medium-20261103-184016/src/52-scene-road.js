/* ---------- the story: save, the Champon Road, VS cards, cutscenes, promotions, continue, game over, ending ---------- */
KC.save = {
  data: null,
  load() { this.data = KC.store.get('kc:save', null); return this.data; },
  has() { const d = this.data || this.load(); return !!(d && typeof d.node === 'number' && d.node > 0 && d.node < KC.LADDER.length); },
  summary() { const d = this.data || this.load(); if (!d) return ''; const n = KC.LADDER[d.node]; return up(KC.BELTS[d.belt].short) + ' - ' + up(KC.STAGE[n.stage].name); },
  write(s) { if (SESSION) return; this.data = { node: s.node, belt: s.belt, score: s.score, difficulty: s.difficulty, unlocks: s.unlocks, stats: s.stats }; KC.store.set('kc:save', this.data); },
  erase() { this.data = null; KC.store.set('kc:save', null); }
};
KC.unlocks = { get() { return KC.store.get('kc:unlocks', { kyabetsu: false, mei: false, classic: false }); }, set(k) { const u = this.get(); u[k] = true; KC.store.set('kc:unlocks', u); }, has(k) { return KC.dev.unlocked || !!this.get()[k]; } };
KC.fighterOpen = f => { const u = KC.FIGHTER[f].unlock; return !u || (u === 'story8' ? KC.unlocks.has('kyabetsu') : KC.unlocks.has('mei')); };
KC.cab = null; KC.hiScore = () => { try { const t = KC.cab.table('story'); return t[0] ? t[0].score : 0; } catch (e) { return 0; } };

KC.Story = {
  s: null,
  fresh() { return { node: 0, belt: 0, score: 0, difficulty: KC.game.settings.difficulty || 'Normal', unlocks: {}, stats: { full: 0, half: 0, perfects: 0 }, losses: {}, continues: 0 }; },
  newGame() { this.s = this.fresh(); KC.save.erase(); KC.game.go('road'); },
  continueGame() { const d = KC.save.load(); this.s = Object.assign(this.fresh(), JSON.parse(JSON.stringify(d))); KC.game.go('road'); },
  get node() { return KC.LADDER[this.s.node]; },
  launch() {
    const n = this.node, g = KC.game; if (!n) return;
    KC.save.write(this.s);
    if (n.kind === 'cutscene') g.go('cutscene', { id: n.id, stage: n.stage, story: true, after: () => this.advance() });
    else if (n.kind === 'practice') g.go('practice', { lesson: n.lesson, stage: n.stage, story: true });
    else if (n.kind === 'match') g.go('vscard', { node: n });
    else if (n.kind === 'bonus') { if (n.bonus === 'pots') g.go('cutscene', { id: 'potsIntro', stage: n.stage, story: true, after: () => g.go('bonus', { kind: n.bonus, story: true, stage: n.stage }) }); else g.go('bonus', { kind: n.bonus, story: true, stage: n.stage }); }
    else if (n.kind === 'ending') g.go('cutscene', { id: 'ending', stage: n.stage, story: true, after: () => g.go('credits', { story: true }) });
  },
  advance() { this.s.node++; KC.save.write(this.s); if (this.s.node >= KC.LADDER.length) { g_end(); } else KC.game.go('road'); },
  matchDone(win, bout, node) {
    const S = this.s; S.score += bout.score[0]; S.stats.full += bout.stats[0].full; S.stats.half += bout.stats[0].half; if (bout.perfect && win) S.stats.perfects++;
    if (win) {
      S.belt = Math.max(S.belt, node.promote); S.score += 1000 * node.promote;
      if (node.opponent === 'kyabetsu' || node.id === 'm8') KC.unlocks.set('kyabetsu');
      if (node.opponent === 'mei') { KC.unlocks.set('mei'); KC.unlocks.set('classic'); }
      KC.game.go('promotion', { node, belt: S.belt });
    } else { S.losses[node.id] = (S.losses[node.id] || 0) + 1; KC.game.go('continue', { node }); }
  }
};
const g_end = () => { KC.game.go('credits', { story: true }); };

/* ---- the Champon Road: a painted scroll ---- */
KC.scenes.road = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() {
    this.t = 0; this.stage = new Stage('harbor'); this.stage.d = Object.assign({}, this.stage.d, { props: [], ambient: .8 }); this.scroll = KC.Story.s.node * 56; KC.idle.t = 0; KC.game.follow(null); KC.music('select');
    this.menu = new Menu([{ label: 'GO', onPick: () => KC.Story.launch() }, { label: 'SAVE AND QUIT', onPick: () => { KC.save.write(KC.Story.s); KC.game.go('title'); } }], { y: r => r.H - 70, scale: 2, onCancel: () => KC.game.go('title') });
    this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); KC.current = this;
  },
  update(dt) {
    this.t += dt; const S = KC.Story.s; const tgt = S.node * 56; this.scroll = lerp(this.scroll, tgt, clamp(dt * 4, 0, 1)); this.stage.update(dt);
    const I = KC.game.input; this.mouseHit = null; const pt = I.pointer(); if (pt) { this.nodes && this.nodes.forEach(n => { if (Math.hypot(pt[0] - n.x, pt[1] - n.y) < 9) this.mouseHit = n; }); }
    const c = I.clicked(); if (c && this.mouseHit && this.mouseHit.i === S.node) { KC.sfx('menuOk'); KC.Story.launch(); return; }
    this.menu.update(dt);
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' });
    KC.game.focus(200, 0, 50);
  },
  draw(r) {
    const S = KC.Story.s, L = KC.LADDER; r.sky(['#1c2a58', '#6a4a7a', '#e89a6a']);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, H * .42, W, H, '#2a1a12');
      for (let i = 0; i < 60; i++) px.dot(g, (i * 53) % W, (i * 31) % Math.floor(H * .4), '#ffffff');
      px.rect(g, 0, Math.round(H * .46), W, 3, '#8a6a3a'); px.rect(g, 0, Math.round(H * .46) + 3, W, 2, '#4a3220');
      KC.title(g, 'CHAMPON ROAD', W / 2, 8, 2);
      this.nodes = [];
      const y0 = Math.round(H * .46) + 1;
      L.forEach((n, i) => {
        const x = Math.round(W / 2 + i * 56 - this.scroll), cur = i === S.node, done = i < S.node; if (x < -20 || x > W + 20) return;
        const col = n.kind === 'match' ? '#e8483a' : n.kind === 'bonus' ? '#ffd060' : n.kind === 'practice' ? '#5ad8a0' : '#9ab8ff';
        px.disc(g, x, y0, cur ? 9 : 6, '#10101c'); px.disc(g, x, y0, cur ? 8 : 5, done ? KC.BELTS[Math.min(9, (L.slice(0, i + 1).filter(m => m.promote).length))].color : col);
        if (cur) { const p = .5 + .5 * Math.sin(this.t * 6); px.blend(g, .3 + .3 * p, 'add', () => px.disc(g, x, y0, 13, '#ffd060')); }
        const ic = n.kind === 'match' ? '拳' : n.kind === 'bonus' ? '★' : n.kind === 'practice' ? '学' : '・'; E.font.text(g, n.kind === 'match' ? 'VS' : n.kind === 'bonus' ? '★' : n.kind === 'practice' ? 'LV' : '•', x, y0 - 3, '#10101c', { align: 'center', outline: false });
        this.nodes.push({ x, y: y0, i, n });
      });
      this.nodes.forEach(nd => { if (this.mouseHit === nd) KC.text(g, KC.LADDER[nd.i].label, nd.x, y0 - 28, '#fff', { align: 'center' }); });
      const n = S.node < L.length ? L[S.node] : null;
      if (n) { KC.text(g, 'NEXT: ' + up(n.label) + (n.kind === 'match' ? ' - ' + up(KC.STAGE[n.stage].name) : ''), W / 2, Math.round(H * .46) + 22, '#ffe8a0', { align: 'center', scale: 1 }); }
      KC.text(g, KC.BELTS[S.belt].name + '   SCORE ' + fmt(S.score), W / 2, Math.round(H * .46) + 36, '#cfc8e8', { align: 'center' });
      // rank road
      for (let k = 0; k < 10; k++) { const bx = W / 2 - 5 * 18 + k * 18; px.rect(g, bx, 22, 14, 6, '#10101c'); px.rect(g, bx + 1, 23, 12, 4, KC.BELTS[k].color); if (k === S.belt) px.rect(g, bx - 1, 30, 16, 2, '#ffd060'); }
    });
    r.actor(70, 0, 0, () => {}); this.menu.draw(r); KC.promptBar(r, [['confirm', 'GO'], ['cancel', 'TITLE']]);
  }
};

/* ---- VS card ---- */
KC.scenes.vscard = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.n = d.node; this.t = 0; this.opp = KC.FIGHTER[this.n.opponent]; this.rigA = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); this.rigB = KC.makeRig(this.opp, 1, 'black1');
    const loss = KC.Story.s.losses[this.n.id] || 0; this.tip = loss >= 1 && this.opp.tip ? this.opp.tip : null;
    this.line = ''; KC.music('select'); KC.game.follow(null); this.spoke = false; KC.current = this;
  },
  update(dt) {
    this.t += dt; const I = KC.game.input; KC.game.focus(200, 0, 50);
    const full = this.opp.rig.intro || this.opp.intro; const txt = this.opp.intro; this.line = txt.slice(0, Math.floor(this.t * 22));
    if (!this.spoke && this.t > .5) { this.spoke = true; KC.speakLine(this.opp.id, txt); }
    this.rigA.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' }); this.rigB.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard' });
    if (this.t > 2.5 || (this.t > .7 && (I.pressed('start') || I.pressed('confirm') || I.clicked()))) { I.consumeAll(); this.go(); }
  },
  go() {
    const S = KC.Story.s, n = this.n, opp = this.opp, diffMod = S.difficulty;
    KC.game.go('fight', { mode: 'story', stage: n.stage, ids: ['taro', n.opponent], belts: [KC.BELTS[S.belt].id, KC.BELTS[Math.min(9, n.promote + 2)].id], names: ['TARO', opp.name.split(' ')[opp.name.split(' ').length - 1] === 'MOYASHI' ? 'TARO' : opp.name.replace('MASTER ', '').replace('SENPAI ', '').replace('CAPTAIN ', '')], players: ['human', 'cpu'], hints: n.hints, seed: 1000 + S.node * 7 + (S.losses[n.id] || 0) * 131 + S.continues * 17,
      onEnd: (w, st, bout) => KC.Story.matchDone(w === 0, bout, n) });
  },
  draw(r) {
    r.sky(['#10101c', '#2a1a3a', '#10101c']);
    r.overlay(g => {
      const W = r.W, H = r.H, k = clamp(this.t / .4, 0, 1), ease = 1 - Math.pow(1 - k, 3);
      px.rect(g, 0, 0, Math.round(W / 2 * ease), H, '#e8e4dc'); px.rect(g, Math.round(W - W / 2 * ease), 0, Math.ceil(W / 2 * ease), H, '#a82a22');
      px.poly(g, [[W / 2 - 14, 0], [W / 2 + 14, 0], [W / 2 - 14 + 6, H], [W / 2 - 14 - 22, H]], '#10101c');
      E.font.title(g, 'VS', W / 2, H / 2 - 20, { scale: 4, align: 'center', colors: GOLD, depth: 3 });
      KC.title(g, 'TARO', W * .25, 16, 2); KC.title(g, up(this.opp.name), W * .75, 16, 1);
      KC.text(g, KC.BELTS[KC.Story.s.belt].name, W * .25, 38, '#10101c', { align: 'center' }); KC.text(g, up(this.opp.title), W * .75, 38, '#fff', { align: 'center' });
      KC.text(g, '"' + this.line + '"', W / 2, H - 52, '#fff6d0', { align: 'center' });
      KC.text(g, up(KC.STAGE[this.n.stage].name), W / 2, H - 38, '#ffd060', { align: 'center' });
      if (this.tip) KC.text(g, 'TIP: ' + this.tip, W / 2, H - 24, '#ffe8a0', { align: 'center' });
      // the portraits
      this.rigA.drawPortrait(g, Math.round(W * .25 - 28), 52, 56, { zoom: 3 }); this.rigB.drawPortrait(g, Math.round(W * .75 - 28), 52, 56, { zoom: 3, turn: -.3 });
    });
    KC.promptBar(r, [['start', 'SKIP']]);
  }
};

/* ---- promotion ceremony ---- */
KC.scenes.promotion = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.t = 0; this.belt = d.belt; this.node = d.node; this.stage = new Stage(d.node.stage === 'dojo' ? 'dojo' : d.node.stage); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[d.belt - (d.node.promote === d.belt ? 1 : 0)].id); this.ref = KC.makeRig({ rig: { size: 2.1, build: 'heroic', hair: 'bald', colors: { skin: '#e8b088' } } }, 1, 'black8'); this.tied = false; KC.sting('promotion'); KC.music(null); KC.game.follow(null); KC.current = this;
    this.cab = null; this.perfect = false;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); const I = KC.game.input;
    if (!this.tied && this.t > 1.8) { this.tied = true; KC.sfx('beltTie'); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[this.belt].id); KC.game.particles.glints(150, 0, 30, 14, '#ffe070'); }
    this.rig.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: this.tied ? 'cheer' : undefined, stance: this.tied ? undefined : 'guard', expr: this.tied ? 'smile' : undefined });
    this.ref.update(dt, { x: 200, y: 8, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: this.t < 1.6 ? 'hips' : 'wave' });
    KC.game.focus(200, 0, 50);
    if (this.t > 3.2 && (I.pressed('start') || I.pressed('confirm') || I.clicked() || this.t > 9)) { I.consumeAll(); const N = this.node; KC.Story.s.node++; KC.save.write(KC.Story.s); if (N.after) KC.game.go('cutscene', { id: N.after, stage: N.stage, story: true, after: () => KC.game.go('road') }); else if (N.id === 'm3') KC.game.go('cutscene', { id: 'afterHarbor', stage: N.stage, story: true, after: () => KC.game.go('road') }); else KC.game.go('road'); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); r.actor(200, 8, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, 60, '#07060d'));
      KC.title(g, 'PROMOTED!', W / 2, 8, 3); if (this.tied) E.font.title(g, up(KC.BELTS[this.belt].name), W / 2, 40, { scale: 2, align: 'center', colors: ['#fff', KC.BELTS[this.belt].color === '#16161c' ? '#c8c8d8' : KC.BELTS[this.belt].color, KC.BELTS[this.belt].color], depth: 2 });
      KC.text(g, 'RANK UP BONUS +' + (1000 * this.node.promote), W / 2, H - 56, '#ffe8a0', { align: 'center' }); KC.text(g, 'SCORE ' + fmt(KC.Story.s.score), W / 2, H - 44, '#fff', { align: 'center' });
      for (let k = 0; k < 10; k++) { const bx = W / 2 - 5 * 18 + k * 18; px.rect(g, bx, H - 32, 14, 7, '#10101c'); px.rect(g, bx + 1, H - 31, 12, 5, k <= this.belt ? KC.BELTS[k].color : '#2a2a3a'); if (k === this.belt) px.rect(g, bx - 1, H - 23, 16, 2, '#ffd060'); }
    });
    if (this.t > 3.2) KC.promptBar(r, [['confirm', 'NEXT']]);
  }
};

/* ---- continue / game over / initials ---- */
KC.scenes.continue = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.node = d.node; this.left = 10; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .3 }); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); KC.music('continue'); KC.game.follow(null); this.mei = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); this.spoke = false; KC.sting('defeat'); KC.current = this; },
  update(dt) {
    this.t += dt; this.left -= dt; this.stage.update(dt); const I = KC.game.input; KC.game.focus(200, 0, 50);
    this.rig.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel', expr: 'wince' }); this.mei.update(dt, { x: 260, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: 'hips' });
    if (!this.spoke && this.t > .8) { this.spoke = true; KC.speakLine('mei', 'GET UP, MOYASHI!'); }
    if (Math.ceil(this.left) !== this.lastN) { this.lastN = Math.ceil(this.left); KC.sfx('countBeep'); }
    if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { I.consumeAll(); const S = KC.Story.s; S.score = 0; S.continues++; KC.game.go('vscard', { node: this.node }); return; }
    if (I.pressed('cancel') || this.left <= 0) { I.consumeAll(); KC.game.go('gameover', { score: KC.Story.s.score }); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); r.actor(260, 0, 0, (g, ox, oy) => this.mei.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#07060d')); KC.title(g, 'CONTINUE?', W / 2, 20, 3); E.font.title(g, String(Math.max(0, Math.ceil(this.left))), W / 2, 62, { scale: 6, align: 'center', colors: this.left < 4 ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 3 }); KC.text(g, '"GET UP, MOYASHI!"  - MEI', W / 2, H - 56, '#ffe8a0', { align: 'center' }); KC.text(g, 'CONTINUING RESETS YOUR SCORE. RANK IS KEPT.', W / 2, H - 44, '#cfc8e8', { align: 'center' }); });
    KC.promptBar(r, [['confirm', 'CONTINUE'], ['cancel', 'GIVE UP']]);
  }
};
KC.scenes.gameover = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.score = d.score || 0; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .2 }); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s ? KC.Story.s.belt : 0].id); KC.music('gameover', { loop: false }); this.spoke = false; KC.game.follow(null); KC.game.weather = { kind: 'rain', amount: .6, wind: .1 }; KC.current = this; },
  update(dt) {
    this.t += dt; const I = KC.game.input; this.stage.update(dt); KC.game.focus(200, 0, 50);
    this.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel', expr: 'wince' });
    if (!this.spoke && this.t > 1.5) { this.spoke = true; KC.speakLine('genkotsu', 'TRAIN. RETURN.'); }
    if (this.t > 4 && (I.pressed('confirm') || I.pressed('start') || I.clicked() || this.t > 9)) { I.consumeAll(); KC.game.weather = null; KC.finishRun(this.score, 'story', () => KC.game.go('title')); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(200, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'GAME OVER', W / 2, 30, 4); if (this.t > 1.5) KC.text(g, '"TRAIN. RETURN."  - JUDGE GENKOTSU', W / 2, 90, '#ffe8a0', { align: 'center', scale: 1 }); KC.text(g, 'SCORE ' + fmt(this.score), W / 2, H - 50, '#fff', { align: 'center' }); });
    if (this.t > 4) KC.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};
// record a run on a table (initials on E.Arcade's letter wheel), unless the dev tuning is active
KC.finishRun = (score, mode, done) => {
  const g = KC.game, cab = KC.cab;
  if (!cab || KC.tuned() || SESSION || score <= 0 || !cab.qualifies(score, mode)) { done(); return; }
  g.go('initials', { score, mode, done });
};
KC.scenes.initials = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.opened = false; KC.music('select'); KC.game.follow(null); KC.current = this; },
  update(dt) {
    const cab = KC.cab; cab.update(dt); KC.game.focus(200, 0, 50);
    if (!this.opened) { this.opened = true; cab.enter(this.d.score, this.d.mode, () => { KC.game.go('records', { mode: this.d.mode, after: this.d.done }); }); }
  },
  draw(r) { r.sky(['#10101c', '#2a1a3a', '#10101c']); KC.cab.draw(r); }
};

/* ---- cutscenes: E.Dialog with portraits and gibberish voices ---- */
KC.scenes.cutscene = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; this.fin = false; this.stage = new Stage(d.stage || 'dojo'); this.script = KC.SCRIPTS[d.id] || []; this.i = -1; this.t = 0; this.card = null; this.talk = new E.Dialog(KC.game, { speed: 30 });
    this.rigs = { taro: KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story ? (KC.Story.s ? KC.Story.s.belt : 0) : 0].id), mei: KC.makeRig(KC.FIGHTER.mei, 1, 'black5'), negi: KC.makeRig(KC.FIGHTER.negi, 1, 'green'), genkotsu: KC.makeRig({ rig: { size: 2.1, build: 'heroic', hair: 'bald', colors: { skin: '#e8b088' } } }, 1, 'black8') };
    KC.music(d.id === 'ending' ? 'ending' : 'dojo'); KC.game.follow(null); KC.current = this; this.advance();
  },
  advance() {
    this.i++;
    if (this.i >= this.script.length || KC.dev.skipCut) { this.finish(); return; }
    const [who, text] = this.script[this.i];
    if (who === 'card') { this.card = { text, t: 0 }; this.talk.close(); KC.speakLine('negi', text); return; }
    this.card = null; const rig = this.rigs[who];
    KC.speakLine(who, text);
    this.talk.say([text], { name: KC.WHO[who] || up(who), portrait: rig, place: 'bottom', onDone: () => this.advance() });
  },
  finish() { if (this.fin) return; this.fin = true; const a = this.d.after; if (a) a(); else KC.game.go('title'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input;
    const poses = { taro: { x: 140, f: 0 }, mei: { x: 260, f: Math.PI }, negi: { x: 260, f: Math.PI }, genkotsu: { x: 260, f: Math.PI } };
    for (const k in this.rigs) this.rigs[k].update(dt, { x: poses[k].x, y: 0, z: 0, facing: poses[k].f, vx: 0, vy: 0, pose: 'hips' });
    if (this.card) { this.card.t += dt; if (this.card.t > 1.2 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.card.t > 3.2) { I.consumeAll(); this.advance(); } return; }
    if (I.pressed('start')) { I.consumeAll(); this.talk.close(); this.finish(); return; }
    this.talk.update(dt);
  },
  draw(r) {
    this.stage.draw(r);
    const cur = this.script[this.i];
    const show = cur && this.d.id !== 'prologue' || (cur && cur[0] !== 'card');
    if (this.d.id === 'finalEntrance' || this.d.id === 'ending') { r.actor(140, 0, 0, (g, ox, oy) => this.rigs.taro.draw(g, ox, oy, r.view)); r.actor(260, 0, 0, (g, ox, oy) => this.rigs.mei.draw(g, ox, oy, r.view)); }
    else { r.actor(140, 0, 0, (g, ox, oy) => this.rigs.taro.draw(g, ox, oy, r.view)); const o = this.script.some(s => s[0] === 'negi') ? 'negi' : this.script.some(s => s[0] === 'mei') ? 'mei' : 'negi'; r.actor(260, 0, 0, (g, ox, oy) => this.rigs[o].draw(g, ox, oy, r.view)); }
    if (this.d.id === 'ending') r.overlay(g => { const gx = r.W / 2, gy = r.H * .55; px.rect(g, gx - 10, gy + 12, 20, 4, '#8a6a20'); px.ell(g, gx, gy + 6, 12, 7, '#ffd060'); px.ell(g, gx, gy + 3, 10, 3, '#fff0a0'); });
    r.overlay(g => { if (this.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, this.card.text, r.W / 2, r.H / 2 - 12, { scale: 2, align: 'center', colors: GOLD, depth: 2, wrap: r.W - 40 }); } });
    this.talk.draw(r); KC.promptBar(r, [['confirm', 'NEXT'], ['start', 'SKIP']]);
  }
};

/* ---- credits and the cast parade (the ending) ---- */
KC.scenes.credits = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d || {}; this.fin = false; this.t = 0; this.stage = new Stage('stadium'); this.rigs = KC.ROSTER.map((f, i) => ({ f, rig: KC.makeRig(f, i % 2, 'black1') })); KC.music('ending'); KC.game.follow(null); KC.current = this;
    const ab = KC.about(); this.lines = ['YOU ARE THE KARATE CHAMPON', '', 'KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY', 'KARATE CHAMP (1984, DATA EAST)', '', 'BUILT WITH MY-3D2DGE v0.85.2', 'ASSETS: CODE-DRAWN. KENNEY AND KAYKIT (CC0) THANKS', 'MODEL: ' + up(ab.sourceInformation.model), '', 'THANK YOU FOR PLAYING'];
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); const I = KC.game.input; KC.game.focus(200, 0, 50);
    const idx = Math.floor(this.t / 2.2) % this.rigs.length, a = this.rigs[idx];
    this.rigs.forEach((o, i) => { o.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: i === idx ? ((this.t % 2.2) < 1.4 ? 'cheer' : 'crouch') : undefined }); });
    if (this.t > 6 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.t > this.rigs.length * 2.2 + 6) { I.consumeAll(); this.finish(); }
  },
  finish() {
    if (this.fin) return; this.fin = true; const S = KC.Story.s, done = () => { KC.game.go('title'); };
    if (this.d.story && S) { const sc = S.score + 10000; KC.save.erase(); KC.finishRun(sc, 'story', done); } else done();
  },
  draw(r) {
    this.stage.draw(r); const idx = Math.floor(this.t / 2.2) % this.rigs.length, a = this.rigs[idx];
    r.actor(200, 0, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, up(a.f.name), W / 2, H - 34, 1); KC.text(g, up(a.f.title), W / 2, H - 22, '#cfc8e8', { align: 'center' }); this.lines.forEach((l, i) => { const y = Math.round(H - 20 - (this.t * 12 - i * 14) + H * .2); if (y > -10 && y < H - 30) KC.text(g, l, W / 2, y, i === 0 ? '#ffd060' : '#fff', { align: 'center' }); }); });
    KC.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};
