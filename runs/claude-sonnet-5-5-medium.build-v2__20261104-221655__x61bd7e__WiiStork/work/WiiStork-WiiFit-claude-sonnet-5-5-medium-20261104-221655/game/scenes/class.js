// Class: 2 to 4 players on one screen
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const CLASS = ['stork', 'candle', 'squat', 'step', 'hoop'];
const TITLES = ['Most Still', 'Best Wobble', 'Most Participated', 'Gently Present'];
G.scenes.class = {
  pausable: true, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter(d) {
    d = d || {}; this.t = 0; this.attract = d.attract || null; this.stage = this.attract ? 'play' : 'lobby'; G.game.lights.enabled = true; G.game.lights.ambient = .95; G.song('studio'); G.cap = null; this.tare = G.tare = new G.Tare(); this.tare.face = 'happy'; this.round = 0; this.total = []; this.surprise = false; this.run = null;
    this.humans = this.attract ? 0 : 1; this.regs = ['marisol', 'kevin', 'okafor'].map((id, i) => { const f = G.castFigure(id, { size: 1.5, tgt: 1.5, y: 12 }); f.set('Idle_Subtle'); return f; });
    try { G.game.allowJoin && G.game.allowJoin({ max: 4, onJoin: (input, n) => { G.snd('boop'); } }); } catch (e) {}
    this.pills = null; this.figs = [];
    if (this.attract) { this.actI = 0; this.startRound(CLASS[d.act != null ? d.act : 0], true); }
  },
  players() { const P = G.game.players || [G.game.input]; return P.slice(0, 4); },
  startRound(id, auto) {
    const def = G.acts[id], P = this.attract ? [] : this.players(), cs = [];
    P.forEach((inp, i) => cs.push(G.makeContestant({ input: inp, name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], id: i, local: true, fig: G.colorFigure(E.PLAYER_COLORS[i]) })));
    if (this.attract) for (let i = 0; i < 4; i++) { const c = G.makeContestant({ name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], id: i, local: false, fig: G.colorFigure(E.PLAYER_COLORS[i]) }); c.bot = new G.Bot(['expert', 'good', 'average', 'good'][i], E.rng(40 + i)); cs.push(c); }
    else if (cs.length < 2) { const c = G.makeContestant({ name: 'Marisol', color: E.PLAYER_COLORS[1], id: 1, local: false, fig: G.colorFigure(E.PLAYER_COLORS[1]) }); c.bot = new G.Bot('average', E.rng(77)); cs.push(c); }
    const sh = id === 'step' || id === 'squat';
    this.run = new G.ActRun(def, { tier: 1, contestants: cs, short: sh, dur: sh ? undefined : 35, mode: 'class', seed: 900 + this.round, cheat: !!this.attract, inst: false }); this.run.cs.forEach(c => { c.local = true; }); G.curRun = this.run; if (def.enter) def.enter(this.run, {});
    // the empty mats are held by Regulars
    this.stage = 'count'; this.pt = 0; this.cnt = 3; this.actId = id; G.song(def.song || 'studio');
  },
  update(dt) {
    const input = G.game.input; this.t += dt; this.tare.update(dt); G.tick(dt); this.regs.forEach(f => f.update(dt)); if (G.talk.update(dt)) return;
    if (this.stage === 'lobby') {
      const n = this.players().length; if (!this.pills || this.pn !== n) { this.pn = n; this.pills = new G.Pills([...CLASS.map(id => ({ label: G.acts[id].name })), { label: 'Surprise me' }, { label: 'Back' }], { w: 120, h: 14, gap: 2, y: 36, x: 8, cancel: true }); }
      const r = this.pills.update(dt, input); if (r && r.cancel) G.game.go('title'); else if (r && r.pick != null) { const lab = this.pills.items[r.pick].label; if (lab === 'Back') G.game.go('title'); else if (lab === 'Surprise me') { this.surprise = true; this.round = 0; this.total = []; this.order = CLASS.slice().sort(() => Math.random() - .5).slice(0, 3); this.startRound(this.order[0]); } else { this.surprise = false; this.round = 0; this.total = []; this.startRound(CLASS[r.pick]); } }
    } else if (this.stage === 'count') {
      this.run.cs.forEach(c => c.fig.update(dt)); this.pt += dt; const n = Math.ceil(3 - this.pt); if (n !== this.cnt && n > 0) { this.cnt = n; G.snd('boop'); } if (this.pt >= 3) { this.stage = 'play'; this.pt = 0; G.snd('bell'); if (this.run.def.start) this.run.def.start(this.run); }
    } else if (this.stage === 'play') {
      this.run.update(dt); if (this.run.done) { if (this.attract) { this.over = true; return; } this.scores = this.run.cs.map(c => ({ c, score: c.score, name: c.name, color: c.color })); this.scores.forEach(s => { const i = s.c.id; this.total[i] = (this.total[i] || 0) + s.score; }); this.stage = 'results'; this.pt = 0; this.pills = new G.Pills([{ label: this.surprise && this.round < 2 ? 'Next round' : 'Again' }, { label: 'Pick another' }, { label: 'Title' }], { w: 100, h: 14, y: 150, x: 8, cancel: false }); G.jingle('star3'); G.cap = null; const best = [...this.scores].sort((a, b) => b.score - a.score)[0]; G.caption('The winner is ' + best.name + '. The rest of you are also here. That counts.', 'Tare', 5); if (this.run.def.exit) this.run.def.exit(this.run); }
    } else if (this.stage === 'results') {
      this.pt += dt; const r = this.pills.update(dt, input); if (r && r.pick != null) { const lab = this.pills.items[r.pick].label; if (lab === 'Next round') { this.round++; this.startRound(this.order[this.round]); } else if (lab === 'Again') { this.startRound(this.actId); } else if (lab === 'Pick another') { this.stage = 'lobby'; this.pills = null; } else G.game.go('title'); }
    }
  },
  draw(r) {
    G.game.focus(0, 0, 18); const W = r.W, H = r.H;
    if (this.run && this.stage !== 'lobby') { this.run.draw(r); } else { G.rooms.deck(r, this.t); const P = this.players(); for (let i = 0; i < 4; i++) { const x = -66 + i * 44, p = r.w(x, 12, 0); const has = i < P.length; r.overlay(g => { G.mat(g, p[0], p[1], 38, 12, has ? E.PLAYER_COLORS[i] : '#dfe9ea'); }); if (has) { const f = this.figs[i] || (this.figs[i] = G.colorFigure(E.PLAYER_COLORS[i], { x, y: 12, tgt: 1.5 })); f.rig.o.size = 1.5; f.set('Idle_Subtle'); f.update(.016); f.draw(r); } else { const f = this.regs[i % 3]; f.x = x; f.y = 12; f.draw(r); } } }
    r.overlay(g => { if (this.stage === 'lobby') { G.txt(g, 'Class', W / 2, 8, C.ACC2, { align: 'center', scale: 3 }); G.txt(g, 'Players ' + this.players().length + ' / 4', W - 10, 14, C.INK, { align: 'right' }); G.txt(g, 'Join: Start on a free pad, or 2 on the keyboard.', W - 10, 26, C.MUTED, { align: 'right' }); } });
    if (this.stage === 'lobby' && this.pills) { this.pills.draw(r); G.prompt(r, [['confirm', 'Pick'], ['cancel', 'Back']]); }
    if (this.stage === 'count') r.overlay(g => G.bigNum(g, Math.max(1, this.cnt), W / 2, 60, 6, C.ACC2));
    if (this.stage === 'play') { this.run.hud(r); }
    if (this.attract) r.overlay(g => { G.rr(g, 8, 8, 40, 14, C.ACC); G.txt(g, 'CLASS', 28, 12, '#fff', { align: 'center' }); });
    if (this.stage === 'results') this.drawResults(r);
    G.drawCaption(r, H - 50); G.talk.draw(r);
  },
  drawResults(r) {
    const W = r.W, H = r.H, S = [...this.scores].sort((a, b) => b.score - a.score), n = S.length;
    r.overlay(g => { G.rr(g, W / 2 - 150, 10, 300, 128, 'rgba(255,255,255,.96)'); G.txt(g, 'Podium', W / 2, 14, C.ACC2, { align: 'center', scale: 2 }); const ord = n === 2 ? [1, 0] : n === 3 ? [1, 0, 2] : [1, 0, 2, 3];
      ord.forEach((k, j) => { const s = S[k]; if (!s) return; const x = W / 2 - 100 + j * 66 + (n === 2 ? 33 : 0), h = [60, 44, 32, 22][k], y = 126 - h; px.rect(g, x - 24, y, 48, h, s.color); px.rect(g, x - 24, y, 48, 3, E.mix(s.color, '#ffffff', .5)); G.txt(g, String(k + 1), x, y + 6, '#fff', { align: 'center', scale: 2, shadow: '#0006' }); px.disc(g, x, y - 12, 7, '#f6d2b0'); px.rect(g, x - 5, y - 6, 10, 6, s.color); G.txt(g, s.name, x, y - 28, C.INK, { align: 'center' }); G.txt(g, s.score + '', x, y - 20, C.ACC2, { align: 'center' }); const tt = k === 0 ? TITLES[0] : s.c.bal && s.c.bal.falls > 0 && k === n - 1 ? TITLES[1] : k === n - 1 ? TITLES[2] : TITLES[3]; G.txt(g, tt, x, y + h - 10, '#fff', { align: 'center', shadow: '#0008' }); }); });
    this.pills.draw(r);
  }
};
})();
