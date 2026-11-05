/* ---------- versus: setup, character select, stage select, results; local Kachinuki (winner stays on) ---------- */
class Kachinuki {
  constructor(ids, target) { this.ids = ids.slice(); this.q = ids.slice(); this.target = target || 5; this.s = {}; ids.forEach(id => { this.s[id] = { wins: 0, pts: 0, conc: 0, full: 0, half: 0, blocks: 0, streak: 0, best: 0 }; }); this.over = false; this.bouts = 0; this.leaders = null; }
  get pair() { return this.q.length >= 2 ? [this.q[0], this.q[1]] : null; }
  /** the bout between pair[0] and pair[1] ended: w = 0|1 (the winner's index in the pair), stats = Bout.stats */
  result(w, stats) {
    const [a, b] = this.pair, win = w === 0 ? a : b, lose = w === 0 ? b : a; this.bouts++;
    [a, b].forEach((id, i) => { const S = this.s[id], st = stats[i]; S.pts += st.raw; S.conc += st.conceded; S.full += st.full; S.half += st.half; S.blocks += st.blocks; });
    this.s[win].wins++; this.s[win].streak++; this.s[win].best = Math.max(this.s[win].best, this.s[win].streak); this.s[lose].streak = 0;
    this.q = [win, ...this.q.slice(2), lose]; if (this.s[win].wins >= this.target) this.over = true; return win;
  }
  leave(id) { this.q = this.q.filter(x => x !== id); this.left = (this.left || []).concat(id); if (this.q.length < 2) this.over = true; }
  standings() {
    const ids = this.ids.filter(id => !(this.left || []).includes(id)).concat(this.left || []), cmp = (x, y) => { const a = this.s[x], b = this.s[y]; return b.wins - a.wins || b.pts - a.pts || a.conc - b.conc; };
    const sorted = ids.slice().sort(cmp), out = []; sorted.forEach(id => { const last = out[out.length - 1]; if (last && cmp(last[0], id) === 0) last.push(id); else out.push([id]); }); return out;
  }
}
KC.Kachinuki = Kachinuki;
const padOnly = m => { const o = {}; for (const a in m) o[a] = m[a].filter(c => /^Pad\d+$/.test(c)); return o; };
KC.applyMaps = () => {
  const g = KC.game, P = g.players; if (P.length < 2) { P[0].use(KC_KEYS); return; }
  P.forEach((p, i) => { if (p.half === 'right' || (i === 1 && !p.pad && p.half !== 'left')) p.use(KC_P2); else if (p.half === 'left' || i === 0) p.use(P.some(q => q.half === 'right') ? KC_P1 : KC_KEYS); else p.use(padOnly(KC_KEYS)); });
};
KC.resetPlayers = () => { const g = KC.game; while (g.players.length > 1) g.removePlayer(g.players[g.players.length - 1]); g.players[0].use(KC_KEYS); };
const GRID = ['taro', 'kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];
const VS_STAGES = ['dojo', 'harbor', 'bamboo', 'log', 'ship', 'market', 'fuji', 'stadium'];
KC.vs = { mode: 'cpu', cpu: 5, picks: [], stage: 'dojo', last: null, k: null };
simpleScene('versusSetup', {
  enter(d) {
    const g = KC.game; this.d = d || {}; this.stage = new Stage('stadium'); this.screen = this.d.screen || 'mode'; this.t = 0; this.rigs = {}; GRID.forEach(id => { this.rigs[id] = KC.makeRig(KC.FIGHTER[id], 0, 'black1'); });
    g.allowJoin({ max: 4, onJoin: () => { KC.applyMaps(); KC.sfx('good'); } }); KC.idle.t = 0; KC.music('select'); g.follow(null); this.cur = []; this.locked = []; this.stSel = Math.max(0, VS_STAGES.indexOf(KC.vs.stage)); this.buildMode(); KC.current = this;
    if (this.screen === 'select') this.initSelect(); this.hot = [];
  },
  exit() { KC.game.allowJoin(false); },
  buildMode() {
    const V = KC.vs, modes = ['cpu', '2p', 'kachi'], names = { cpu: '1 PLAYER VS CPU', '2p': '2 PLAYERS', kachi: 'KACHINUKI (3-4 PLAYERS)' };
    this.menu = new Menu([
      { label: () => names[V.mode], sub: 'LEFT/RIGHT CHANGES THE MODE', adjust: d => { V.mode = modes[(modes.indexOf(V.mode) + d + 3) % 3]; }, onPick: () => { V.mode = modes[(modes.indexOf(V.mode) + 1) % 3]; } },
      { label: () => 'CPU LEVEL ' + V.cpu, sub: 'LEFT/RIGHT: 1 (EASY) TO 10 (MEAN)', disabled: false, adjust: d => { V.cpu = clamp(V.cpu + d, 1, 10); }, onPick: () => { V.cpu = V.cpu % 10 + 1; } },
      { label: 'START', sub: () => '', onPick: () => this.start() },
      { label: 'BACK', onPick: () => KC.game.go('title', { menu: true }) }
    ], { y: r => Math.round(r.H * .3), scale: 2, onCancel: () => KC.game.go('title', { menu: true }) });
  },
  need() { const V = KC.vs; return V.mode === 'kachi' ? 3 : V.mode === '2p' ? 2 : 1; },
  start() { const n = KC.game.players.length, V = KC.vs; if (n < this.need()) { this.warn = 2.5; KC.sfx('bad'); return; } this.initSelect(); },
  initSelect() { const V = KC.vs, n = V.mode === 'kachi' ? Math.min(4, KC.game.players.length) : 2; this.screen = 'select'; this.cur = Array.from({ length: n }, (_, i) => i * 2 % 10); this.locked = Array(n).fill(false); this.kinds = Array.from({ length: n }, (_, i) => V.mode === 'cpu' && i === 1 ? 'cpu' : 'human'); KC.sfx('menuOk'); },
  open(id) { return KC.fighterOpen(id); },
  update(dt) {
    const g = KC.game, I = g.input, P = g.players; this.t += dt; this.stage.update(dt); g.focus(200, 0, 50); this.warn = Math.max(0, (this.warn || 0) - dt);
    if (KC.anyInput()) KC.idle.t = 0; else KC.idle.t += dt; if (KC.idle.t >= 10) { KC.idle.t = 0; g.go('attract'); return; }
    if (this.screen === 'mode') { this.menu.update(dt); return; }
    if (this.screen === 'select') this.updateSelect(dt); else if (this.screen === 'stage') this.updateStage(dt);
  },
  updateSelect(dt) {
    const g = KC.game, P = g.players, V = KC.vs, n = this.cur.length, mouse = P[0];
    for (let i = 0; i < n; i++) {
      if (this.locked[i]) { if (this.kinds[i] === 'human' && P[i] && P[i].pressed('cancel')) { this.locked[i] = false; KC.sfx('menuBack'); P[i].consumeAll(); } continue; }
      const cpuNow = this.kinds[i] === 'cpu'; if (cpuNow && !this.locked.slice(0, i).every(Boolean)) continue;
      const I = cpuNow ? P[0] : P[i]; if (!I) continue; let c = this.cur[i], x = c % 5, y = Math.floor(c / 5);
      if (I.repeat('left', .35, .12)) x = (x + 4) % 5; if (I.repeat('right', .35, .12)) x = (x + 1) % 5; if (I.repeat('up', .35, .12) || I.repeat('down', .35, .12)) y = 1 - y;
      if (y * 5 + x !== c) { this.cur[i] = y * 5 + x; KC.sfx('menuMove'); }
      if (i === 0 || cpuNow) { const p = I.pointer(); if (p && (p[0] !== this._px || p[1] !== this._py)) { this._px = p[0]; this._py = p[1]; const k = this.hitCell(p); if (k >= 0) this.cur[i] = k; } }
      const click = (i === 0 || cpuNow) ? this.hitCell(I.clicked()) : -1; if (click >= 0) this.cur[i] = click;
      if (I.pressed('confirm') || click >= 0) { const id = GRID[this.cur[i]]; if (this.open(id)) { this.locked[i] = true; KC.sfx('menuOk'); I.consumeAll(); } else { KC.sfx('bad'); } }
      if (cpuNow && I.pressed('cancel')) { this.locked[0] = false; I.consumeAll(); }
      if (!cpuNow && I.pressed('cancel') && i === 0) { I.consumeAll(); KC.sfx('menuBack'); this.screen = 'mode'; return; }
    }
    if (this.locked.every(Boolean)) { KC.vs.picks = this.cur.map(c => GRID[c]); this.screen = 'stage'; KC.sfx('menuOk'); }
  },
  hitCell(p) { if (!p || !this.cells) return -1; for (let k = 0; k < this.cells.length; k++) { const c = this.cells[k]; if (p[0] >= c.x && p[0] < c.x + c.s && p[1] >= c.y && p[1] < c.y + c.s) return k; } return -1; },
  updateStage(dt) {
    const g = KC.game, I = g.input, n = VS_STAGES.length + 1;
    if (I.repeat('left', .35, .12)) { this.stSel = (this.stSel + n - 1) % n; KC.sfx('menuMove'); } if (I.repeat('right', .35, .12)) { this.stSel = (this.stSel + 1) % n; KC.sfx('menuMove'); }
    const c = I.clicked(); if (c) { if (c[0] < g.W * .25) { this.stSel = (this.stSel + n - 1) % n; return; } if (c[0] > g.W * .75) { this.stSel = (this.stSel + 1) % n; return; } }
    if (this.stSel < VS_STAGES.length && this.stage.d.id !== VS_STAGES[this.stSel]) this.stage = new Stage(VS_STAGES[this.stSel]);
    if (I.pressed('cancel')) { I.consumeAll(); this.screen = 'select'; this.locked = this.locked.map(() => false); return; }
    if (I.pressed('confirm') || (c && c[0] >= g.W * .25 && c[0] <= g.W * .75)) { I.consumeAll(); const stg = this.stSel >= VS_STAGES.length ? VS_STAGES[Math.floor(Math.random() * VS_STAGES.length)] : VS_STAGES[this.stSel]; KC.vs.stage = stg; KC.startVersus(); }
  },
  draw(r) {
    backDrop(r, this); const V = KC.vs;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.screen === 'mode') {
        KC.title(g, 'VERSUS', W / 2, 14, 3);
        const n = KC.game.players.length; KC.text(g, 'PLAYERS JOINED: ' + n + (n < this.need() ? '   (NEED ' + this.need() + ')' : ''), W / 2, Math.round(H * .3) + 118, n < this.need() ? '#ff8a6a' : '#9ad8ff', { align: 'center' });
        KC.text(g, 'PLAYER 2: PRESS 2 ON THE KEYBOARD (ARROWS + IJKL) OR START ON ANOTHER PAD', W / 2, Math.round(H * .3) + 130, '#cfc8e8', { align: 'center' });
        KC.text(g, 'KEYBOARD 2P: P1 = WASD + T F G H    P2 = ARROWS + I J K L', W / 2, Math.round(H * .3) + 140, '#8a84a8', { align: 'center' });
        if (this.warn > 0) KC.text(g, 'NOT ENOUGH PLAYERS YET', W / 2, H - 40, '#ff6a6a', { align: 'center', scale: 2 });
      } else if (this.screen === 'select') {
        KC.title(g, 'CHOOSE YOUR FIGHTER', W / 2, 6, 2); this.cells = []; const s = 40, gx = Math.round(W / 2 - 5 * (s + 4) / 2), gy = 30;
        GRID.forEach((id, k) => { const x = gx + (k % 5) * (s + 4), y = gy + Math.floor(k / 5) * (s + 4); this.cells[k] = { x, y, s }; const open = this.open(id); px.rect(g, x - 1, y - 1, s + 2, s + 2, '#05040a'); px.rect(g, x, y, s, s, '#241a40'); this.rigs[id].drawPortrait(g, x, y, s, { tint: open ? undefined : '#101018', zoom: 2.6 }); if (!open) E.font.text(g, '?', x + s / 2, y + s / 2 - 4, '#ffd060', { align: 'center', scale: 2, outline: false }); });
        const cols = ['#fff6e8', '#ff5a4a', '#5ad8ff', '#ffd060'];
        this.cur.forEach((c, i) => { const x = gx + (c % 5) * (s + 4), y = gy + Math.floor(c / 5) * (s + 4), col = cols[i], wait = this.kinds[i] === 'cpu' && !this.locked.slice(0, i).every(Boolean); px.rect(g, x - 2 - i, y - 2 - i, s + 4 + 2 * i, 2, col); px.rect(g, x - 2 - i, y + s + i, s + 4 + 2 * i, 2, col); px.rect(g, x - 2 - i, y - 2 - i, 2, s + 4 + 2 * i, col); px.rect(g, x + s + i, y - 2 - i, 2, s + 4 + 2 * i, col); KC.text(g, (this.kinds[i] === 'cpu' ? 'CPU' : 'P' + (i + 1)) + (this.locked[i] ? ' OK' : wait ? ' ...' : ''), x + s / 2, y + s + 3 + i * 8, col, { align: 'center' }); });
        // big info panels for the first two cursors
        for (let i = 0; i < Math.min(2, this.cur.length); i++) { const f = KC.FIGHTER[GRID[this.cur[i]]], x = i === 0 ? 10 : W - 120, y = gy + 2 * (s + 4) + 8; KC.panel(g, x, y, 110, 70, { alpha: .8 }); KC.text(g, f.name, x + 6, y + 6, i === 0 ? '#fff6e8' : '#ff9a8a'); KC.text(g, up(f.intro ? f.intro.replace(/^.*$/, '') + f.style : ''), x + 6, y + 17, '#cfc8e8'); [['SPEED', f.stats.speed], ['REACH', f.stats.reach], ['WALK', f.stats.walk]].forEach(([n2, v], k) => { KC.text(g, n2, x + 6, y + 30 + k * 11, '#9ad8ff'); px.rect(g, x + 44, y + 31 + k * 11, 60, 6, '#10101c'); px.rect(g, x + 45, y + 32 + k * 11, Math.round(clamp((v - .7) / .5, .05, 1) * 58), 4, '#ffd060'); }); this.rigs[f.id].drawPortrait(g, x + 66, y - 2, 44, { zoom: 2 }); }
        if (V.mode === 'cpu') KC.text(g, 'CPU LEVEL ' + V.cpu, W / 2, H - 52, '#9ad8ff', { align: 'center' });
      } else {
        KC.title(g, 'CHOOSE THE STAGE', W / 2, 8, 2); const nm = this.stSel >= VS_STAGES.length ? 'RANDOM' : KC.STAGE[VS_STAGES[this.stSel]].name;
        KC.text(g, '◂   ' + nm + '   ▸', W / 2, H - 56, '#ffd060', { align: 'center', scale: 2 }); KC.text(g, (this.stSel + 1) + '/' + (VS_STAGES.length + 1), W / 2, H - 40, '#cfc8e8', { align: 'center' });
      }
    });
    if (this.screen === 'mode') this.menu.draw(r);
    KC.promptBar(r, [['confirm', this.screen === 'mode' ? 'SELECT' : 'PICK'], ['cancel', 'BACK']]);
  }
});
KC.startVersus = () => {
  const g = KC.game, V = KC.vs, P = g.players, picks = V.picks.slice();
  if (V.mode === 'kachi') { const ids = picks.map((_, i) => 'P' + (i + 1)); KC.localK = { k: new Kachinuki(ids, T().sessionTarget), picks, stage: V.stage }; KC.nextKachi(); return; }
  const classic = g.settings.palette === 'Classic';
  const d = { mode: 'versus', stage: V.stage, ids: picks.slice(0, 2), names: V.mode === '2p' ? ['P1', 'P2'] : ['P1', 'CPU'], tags: ['WHITE', 'RED'], players: V.mode === '2p' ? ['human', 'human2'] : ['human', 'cpu'], level: [0, V.cpu], hideScore: true, seed: 11 + Math.floor(Math.random() * 1000), single: false,
    onEnd: (w, st, bout) => g.go('results', { w, st, bout: { stats: bout.stats, rounds: bout.rounds.slice(), pts: bout.pts }, d, names: d.names }) };
  g.go('fight', d);
};
KC.nextKachi = () => {
  const g = KC.game, L = KC.localK, k = L.k, pr = k.pair; if (!pr || k.over) { g.go('results', { kachi: L, w: 0 }); return; }
  const idx = id => k.ids.indexOf(id), P = g.players;
  g.go('kachiCard', { next: () => g.go('fight', { mode: 'kachinuki', stage: L.stage, ids: pr.map(id => L.picks[idx(id)]), names: pr, tags: ['WHITE', 'RED'], players: pr.map(id => (() => { const ri = idx(id); const rd = new Reader(P[ri] || P[0]); return (m, f, b) => rd.read(); })()), single: true, hideScore: true, seed: 5 + k.bouts, prompts: false,
    onEnd: (w, st, bout) => { k.result(w, bout.stats); g.go('kachiCard', { done: true, next: () => KC.nextKachi() }); } }) });
};
simpleScene('kachiCard', {
  enter(d) { this.d = d; this.t = 0; this.stage = new Stage(KC.localK.stage); KC.music('select'); KC.game.follow(null); KC.current = this; this.rigs = KC.localK.picks.map((id, i) => KC.makeRig(KC.FIGHTER[id], i % 2, 'black1')); },
  update(dt) { this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel' })); const I = KC.game.input; if (this.t > 2.4 || (this.t > .6 && (I.pressed('confirm') || I.pressed('start') || I.clicked()))) { I.consumeAll(); this.d.next(); } },
  draw(r) {
    backDrop(r, this); const k = KC.localK.k;
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, this.d.done ? 'BOUT OVER' : 'KACHINUKI!', W / 2, 12, 3); const pr = k.pair;
      if (pr && !this.d.done) KC.text(g, pr[0] + ' (WHITE)  VS  ' + pr[1] + ' (RED)', W / 2, 44, '#fff', { align: 'center', scale: 2 });
      KC.text(g, 'WINNER STAYS ON. FIRST TO ' + k.target + ' BOUT WINS.', W / 2, 66, '#ffe8a0', { align: 'center' });
      k.q.forEach((id, i) => { const S = k.s[id]; KC.text(g, (i + 1) + '. ' + id + '  WINS ' + S.wins + '  STREAK ' + S.streak, W / 2, 90 + i * 14, i < 2 ? '#fff6d0' : '#8a84a8', { align: 'center' }); });
    });
    KC.promptBar(r, [['confirm', 'NEXT']]);
  }
});
simpleScene('results', {
  enter(d) {
    this.d = d; this.t = 0; this.stage = new Stage(d.kachi ? d.kachi.stage : d.d.stage); KC.game.follow(null); KC.music('ending'); KC.sting('victory'); KC.current = this; const K = d.kachi;
    if (K) { this.items = [{ label: 'MAIN MENU', onPick: () => { KC.resetPlayers(); KC.game.go('title', { menu: true }); } }, { label: 'VERSUS MENU', onPick: () => KC.game.go('versusSetup') }]; this.rig = KC.makeRig(KC.FIGHTER[K.picks[0]], 0, 'black1'); }
    else { const w = d.w; this.rig = KC.makeRig(KC.FIGHTER[d.d.ids[w]], w, 'black1'); this.items = [{ label: 'REMATCH', onPick: () => KC.game.go('fight', Object.assign({}, d.d, { seed: (d.d.seed || 1) + 1 })) }, { label: 'CHARACTER SELECT', onPick: () => KC.game.go('versusSetup', { screen: 'select' }) }, { label: 'STAGE SELECT', onPick: () => { KC.game.go('versusSetup', { screen: 'stage' }); } }, { label: 'MAIN MENU', onPick: () => { KC.resetPlayers(); KC.game.go('title', { menu: true }); } }]; }
    this.menu = new Menu(this.items, { y: r => r.H - 82, scale: 2 }); this.menu.o.scale = 1;
  },
  update(dt) { this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); this.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'cheer', expr: 'shout' }); if (this.t > .8) this.menu.update(dt); },
  draw(r) {
    backDrop(r, this); r.actor(200, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); const d = this.d;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (d.kachi) { const K = d.kachi.k, st = K.standings(); KC.title(g, 'ROUND OVER', W / 2, 10, 2); st.forEach((grp, i) => KC.text(g, (i + 1) + '. ' + grp.join(' = ') + '   BOUT WINS ' + K.s[grp[0]].wins + '  FULL ' + K.s[grp[0]].full, W / 2, 34 + i * 12, i === 0 ? '#ffd060' : '#cfc8e8', { align: 'center' })); return; }
      const w = d.w, st = d.bout.stats[w], nm = w === 0 ? 'WHITE' : 'RED'; KC.title(g, nm + ' WINS ' + d.bout.rounds.join('-'), W / 2, 8, 3);
      const lines = ['FULL POINTS  ' + d.bout.stats[w].full, 'HALF POINTS  ' + d.bout.stats[w].half, 'BLOCKS  ' + d.bout.stats[w].blocks, 'BEST TECHNIQUE  ' + (st.best || '-')]; lines.forEach((l, i) => KC.text(g, l, W / 2, 44 + i * 12, '#fff', { align: 'center' }));
    });
    this.menu.draw(r); KC.promptBar(r, [['confirm', 'SELECT']]);
  }
});
