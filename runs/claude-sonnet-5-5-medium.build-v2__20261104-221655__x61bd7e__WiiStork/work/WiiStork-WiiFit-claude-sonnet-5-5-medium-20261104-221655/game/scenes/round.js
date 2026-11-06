// AI Hub ghost round: "Morning Class" (card, three events, ghosts, reporting)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const EV = 50;   // seconds an event takes: 5 intro, 40 play, 5 scores
const H = { info: null, card: null, ghosts: {}, over: false, reported: false, total: 0, events: [], scores: [], started: false };
G.hub = H;
const hub = () => window.AIHub;
G.hubInit = async game => {
  const A = hub(); if (!A || !A.active) return;
  const info = await A.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) { H.offline = true; game.go('title'); return; }
  H.info = info; H.deal = [G.pick(['stork', 'candle', 'squat', 'pushup'], A.rng('deal')), G.pick(['step', 'hoop'], A.rng('deal')), G.pick(['slalom', 'jog'], A.rng('deal'))];
  A.on('card', c => { H.card = c; });
  A.on('start', () => { H.started = true; });
  A.on('message', (d, from) => { if (d && d.t === 'g') H.ghosts[from] = Object.assign({}, d, { at: game.real || 0 }); });
  A.on('leave', ({ id }) => { delete H.ghosts[id]; });
  A.on('time-up', () => G.hubReport());
  A.on('end', () => { H.over = true; try { game.audio.stopMusic && game.audio.stopMusic(); game.audio.mute(true); } catch (e) {} game.input.clear(); });
  await game.booted; A.ready();
};
G.hubReport = () => {
  const A = hub(); if (!A || H.reported) return; H.reported = true;
  const st = H.scores.length ? Math.round(H.scores.reduce((a, s) => a + (s.steady || 0), 0) / H.scores.length * 100) : 0, best = H.scores.slice().sort((a, b) => b.score - a.score)[0];
  A.result({ score: H.total, stats: { Steadiness: st + '%', Events: H.scores.length + ' of 3' }, awards: [{ title: st > 70 ? 'Most Still' : st > 40 ? 'Best Wobble' : 'Participated', detail: best ? 'Best: ' + best.name + ' ' + best.score : 'Present and gentle' }] });
};
const CARD_HOW = { stork: 'Stay in the ring', candle: 'Keep the flame', squat: 'Follow the bead', pushup: 'Follow the bead', step: 'Hit the steps', hoop: 'Spin the hoop', slalom: 'Ski the gates', jog: 'Hold the pace' };
G.scenes.round = {
  pausable: false, view: 'brawler', camera: { zoom: false }, res: 'ps1', expand: true, input: G.INPUT,
  enter() { this.t = 0; this.k = -1; this.run = null; this.sendT = 0; this.progT = 0; this.tare = G.tare = new G.Tare(); this.tare.face = 'happy'; G.game.lights.enabled = true; G.game.lights.ambient = .95; G.song('studio'); this.lastPhase = null; this.cardRects = {}; H.over = false; },
  evLen() { const lim = H.info && H.info.limitMs ? H.info.limitMs / 1000 - 3 : 150; return Math.min(EV, Math.max(12, lim / 3)); },
  seat() { return H.info ? Math.max(0, H.info.players.findIndex(p => p.id === H.info.me)) : 0; },
  startEvent(k) {
    const A = hub(), id = H.deal[k], def = G.acts[id], N = H.info.players.length, me = this.seat(), slots = G.slots(N), seed = Math.floor(A.rng('seed' + k)() * 1e9);
    const col = (H.info.players[me] && H.info.players[me].color) || '#ff7a59', c = G.makeContestant({ input: G.game.input, name: (H.info.players[me] && H.info.players[me].name) || 'You', color: col, id: me, local: true, fig: G.playerFigure() });
    const len = this.evLen(), dur = len * .8;
    this.run = new G.ActRun(def, { tier: 1, contestants: [c], seed, rng: A.rng('e' + k), mode: 'round', dur, hub: true, inst: false }); this.run.nplayers = N;
    if (def.enter) def.enter(this.run, {}); if (id === 'step' || id === 'rep') { }
    c.fig.x = slots[Math.min(me, 3)].x; c.fig.rig.o.size = slots[0].size; c.fig.y = 12; this.k = k; this.started = false; this.eventScore = null; G.curRun = this.run; G.song(def.song || 'yoga'); H.ghosts = H.ghosts; this.run.def.hubSlots = slots;
  },
  update(dt) {
    const A = hub(), input = G.game.input; this.t += dt; this.tare.update(dt); G.tick(dt);
    if (!H.info || H.over) return;
    const tm = A.time(); const t = tm === -Infinity ? -Infinity : tm / 1000;
    if (t === -Infinity) {   // the card
      if (input.pressed('confirm') || input.pressed('start')) A.answer('ready'); if (input.pressed('more')) A.answer('more');
      const c = input.clicked && input.clicked(); if (c) { const R = this.cardRects.ready, M = this.cardRects.more; if (R && c[0] >= R[0] && c[0] < R[0] + R[2] && c[1] >= R[1] && c[1] < R[1] + R[3]) A.answer('ready'); else if (M && c[0] >= M[0] && c[0] < M[0] + M[2] && c[1] >= M[1] && c[1] < M[1] + M[3]) A.answer('more'); }
      this.phase = 'card'; return;
    }
    const len = this.evLen(), k = t < 0 ? 0 : Math.min(2, Math.floor(t / len)), local = t - k * len, intro = len * .1, play = len * .8;
    if (t < 0) { this.phase = 'count'; if (this.k !== 0) this.startEvent(0); this.sendGhost(dt, 0); return; }
    if (t >= len * 3) { this.phase = 'done'; if (!H.reported) { this.finishEvent(); H.reported = false; G.hubReport(); } return; }
    if (k !== this.k) { if (this.k >= 0) this.finishEvent(); this.startEvent(k); }
    const run = this.run;
    if (local < intro) { this.phase = 'intro'; run.cs[0].fig.update(dt); this.sendGhost(dt, k); }
    else if (local < intro + play) { this.phase = 'play'; if (!this.started) { this.started = true; if (run.def.start) run.def.start(run); } const target = local - intro; let n = 0; while (run.time < target - 1 / 240 && n++ < 60 && !run.done) run.update(1 / 120); if (run.done && !this.eventScore) this.finishEvent(); this.sendGhost(dt, k); }
    else { this.phase = 'scores'; if (!this.eventScore) { run.time = run.dur; if (!run.done) run.update(1 / 120); this.finishEvent(); } }
    this.progT -= dt; if (this.progT <= 0) { this.progT = 1; const cur = this.run && !this.run.done ? Math.round(this.run.cs[0].bal.steadiness * 1000 * Math.min(1, this.run.time / this.run.dur)) : 0; A.progress({ score: H.total + cur, label: (H.total + cur) + ' pts' }); }
  },
  finishEvent() {
    const run = this.run; if (!run || this.eventScore) return; if (!run.done) { run.done = true; const c = run.cs[0], r = run.def.result(run, c); c.pct = G.clamp(r.pct, 0, 1); c.score = Math.round(c.pct * 1000); c.detail = r.detail; }
    const c = run.cs[0]; this.eventScore = { name: run.def.name, score: c.score, steady: c.bal.steadiness, detail: c.detail }; H.scores[this.k] = this.eventScore; H.total = H.scores.reduce((a, s) => a + (s ? s.score : 0), 0);
    if (run.def.exit) try { run.def.exit(run); } catch (e) {} G.snd('stamp');
  },
  sendGhost(dt, k) {
    this.sendT -= dt; if (this.sendT > 0) return; this.sendT = .1; const run = this.run, c = run.cs[0]; if (!run) return;
    hub().send({ t: 'g', a: k, l: [c.fig.x, c.x != null ? c.x : c.fig.y], p: c.phase || c.pose || 0, w: [c.bal.p.x, c.bal.p.y], s: Math.round(c.bal.steadiness * 1000), z: c.z != null ? c.z : (c.y || 0) }, { reliable: false });
  },
  draw(r) {
    G.game.focus(0, 0, 18); const W = r.W, Hh = r.H, A = hub(), info = H.info;
    if (!info) { G.rooms.deck(r, this.t); r.overlay(g => G.txt(g, 'Connecting to the class...', W / 2, 90, C.INK, { align: 'center', scale: 2 })); return; }
    if (this.phase === 'card' || !this.run) { this.drawCard(r); return; }
    const run = this.run; run.draw(r);
    // ghosts: translucent, seat coloured, on neighbouring mats
    const N = info.players.length, slots = G.slots(N), tm = A.time();
    info.players.forEach((p, i) => { if (p.id === info.me) return; const gh = H.ghosts[p.id]; if (!gh || gh.a !== this.k) return;
      const gf = (this.gf = this.gf || {})[p.id] || (this.gf[p.id] = G.colorFigure(p.color)); gf.x = slots[Math.min(i, 3)].x; gf.y = 12; gf.rig.o.size = slots[0].size; gf.rig.wob = [gh.w[0], gh.w[1]]; gf.alpha = .5; gf.tgt = 1.57; gf.set(run.def.id === 'stork' ? 'stork' : 'Idle_Subtle'); gf.update(.016);
      if (run.def.room !== false && run.def.id !== 'jog') { gf.draw(r, { alpha: .5 }); const pp = r.w(gf.x, 12, 0); r.overlay(g => { const w = G.tw(p.name) + 8; G.rr(g, pp[0] - w / 2, pp[1] + 6, w, 11, p.color); G.txt(g, p.name, pp[0], pp[1] + 8, '#fff', { align: 'center', shadow: '#0008' }); }); }
    });
    r.overlay(g => { // standings strip: your points and the ghosts' progress dots
      info.players.forEach((p, i) => { const gh = p.id === info.me ? { s: Math.round(run.cs[0].bal.steadiness * 1000) } : H.ghosts[p.id]; G.rr(g, 8, 28 + i * 12, 70, 10, 'rgba(255,255,255,.9)'); px.rect(g, 10, 30 + i * 12, 6, 6, p.color); G.txt(g, p.name.slice(0, 9) + ' ' + (gh && gh.s != null ? gh.s : 0), 20, 30 + i * 12, C.INK); }); });
    if (this.phase === 'play') run.hud(r);
    if (this.phase === 'intro' || this.phase === 'count') r.overlay(g => { G.rr(g, W / 2 - 110, 30, 220, 54, C.WHITE); G.txt(g, 'Event ' + (this.k + 1) + ' of 3', W / 2, 34, C.MUTED, { align: 'center' }); G.txt(g, run.def.name, W / 2, 46, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, CARD_HOW[run.def.id], W / 2, 68, C.INK, { align: 'center' }); if (tm < 0) G.bigNum(g, Math.max(1, Math.ceil(-tm / 1000)), W / 2, 100, 5, C.CORAL); });
    if (this.phase === 'scores' && this.eventScore) r.overlay(g => { G.rr(g, W / 2 - 100, 36, 200, 46, C.WHITE); G.txt(g, this.eventScore.name, W / 2, 40, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, this.eventScore.score + ' points', W / 2, 60, C.INK, { align: 'center' }); G.txt(g, 'Total ' + H.total, W / 2, 70, C.MUTED, { align: 'center' }); });
    if (this.phase === 'done') r.overlay(g => { G.rr(g, W / 2 - 100, 40, 200, 50, C.WHITE); G.txt(g, 'Class dismissed', W / 2, 46, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, H.total + ' points', W / 2, 68, C.INK, { align: 'center', scale: 2 }); });
    G.drawCaption(r, Hh - 50);
  },
  drawCard(r) {
    const W = r.W, Hh = r.H, info = H.info, A = hub(), card = H.card || {}, N = info.players.length, slots = G.slots(N); G.rooms.deck(r, this.t);
    this.figs = this.figs || {}; const ready = card.ready || [];
    info.players.forEach((p, i) => { const f = this.figs[p.id] || (this.figs[p.id] = G.colorFigure(p.color)); f.x = slots[Math.min(i, 3)].x; f.y = 12; f.rig.o.size = slots[0].size; f.set('Idle_Subtle'); f.update(.016); const pp = r.w(f.x, 12, 0); r.overlay(g => G.mat(g, pp[0], pp[1], 40, 12, p.color)); f.draw(r); });
    r.overlay(g => {
      E.font.title(g, 'WII STORK', W / 2, 6, { scale: 3, colors: ['#9ff3ff', '#2cc6e6'], outline: '#0e6d84', depth: 2, depthColor: '#0e7d96', align: 'center' });
      G.txt(g, 'Morning Class: three exercises, most points wins', W / 2, 36, C.INK, { align: 'center' });
      info.players.forEach((p, i) => { const pp = r.w(slots[Math.min(i, 3)].x, 12, 0), w = G.tw(p.name) + 22; G.rr(g, pp[0] - w / 2, pp[1] + 8, w, 12, p.color); G.txt(g, p.name, pp[0] - 4, pp[1] + 11, '#fff', { align: 'center', shadow: '#0008' }); G.txt(g, ready.includes(p.id) ? '✓' : '·', pp[0] + w / 2 - 8, pp[1] + 11, '#fff', { align: 'center' }); });
      G.rr(g, W / 2 - 150, 118, 300, 44, 'rgba(255,255,255,.95)'); G.txt(g, 'Lean: ' + (G.game.input.lastDevice === 'gamepad' ? 'left stick' : 'WASD or mouse') + '.  Breathe: ' + (G.game.input.lastDevice === 'gamepad' ? 'R2' : 'Space or click') + '.', W / 2, 123, C.INK, { align: 'center' });
      const left = card.left != null ? Math.ceil(card.left / 1000) : null; G.txt(g, card.paused ? 'Waiting a little longer' : card.starting ? 'Starting' : left != null ? 'Starts in ' + left + 's' : '', W / 2, 136, C.ACC2, { align: 'center' });
      const bw = 90, bh = 16, by = 168; this.cardRects.ready = [W / 2 - bw - 6, by, bw, bh]; this.cardRects.more = [W / 2 + 6, by, bw, bh];
      G.rr(g, W / 2 - bw - 6, by, bw, bh, ready.includes(info.me) ? C.MINT : C.ACC); G.txt(g, 'Ready  ' + G.keyLabel(G.game.input, 'confirm'), W / 2 - bw / 2 - 6, by + 5, ready.includes(info.me) ? C.INK : '#fff', { align: 'center' });
      G.rr(g, W / 2 + 6, by, bw, bh, card.asked ? C.GOLD : '#c8dde2'); G.txt(g, 'More time  ' + G.keyLabel(G.game.input, 'more'), W / 2 + 6 + bw / 2, by + 5, C.INK, { align: 'center' });
    });
    const tp = r.w(0, 36, 0); r.overlay(g => G.tare.draw(g, tp[0], tp[1], 1.1, 'happy'));
  }
};
})();
