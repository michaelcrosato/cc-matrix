/* ---- AI HUB SESSIONS (Session Protocol v1, client 1.4.0, parallel mode): every player bats the same over from the
 * Thrumptonator 3000 at the Megadome (deliveries from AIHub.rng('over')), most runs wins. No title, menus or prompts
 * before the round: our own card (the Megadome at night, the players in their seat colours with READY ticks, the goal,
 * this player's controls in their device's glyphs, the time left; Ready = Cross / Enter / a click, More time =
 * Triangle / T / a click). ready() is called as soon as the round is built. Progress after every ball, one result,
 * an immediate result on time-up, and on end: no input, no sound, the scene frozen. Never send(); no storage; no
 * alert, confirm, prompt or window.open. Outside a session nothing here runs. ---- */
const Hub = {
  info: null, card: null, phase: 'connect', started: false, sent: { progress: 0, result: 0 }, ended: false, endReason: null, balls: null, readyAnswered: false, more: false,
  async connect() {
    const A = window.AIHub;
    let info = null;
    try { info = await A.connect({ mode: 'parallel', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { game.hubActive = false; game.go('title'); return; }
    this.info = info; this.phase = 'card';
    // the round, from the shared seed: six deliveries for every copy
    const R = A.rng('over'), pick = list => list[Math.floor(R() * list.length) % list.length];
    this.balls = [0, 1, 2, 3, 4, 5].map(i => i === 5 ? { id: 'piston', special: 'triple', target: [0, 80] } : pick([{ id: 'piston', target: [Math.round((R() - .5) * 10), 70 + Math.round(R() * 40)] }, { id: 'steamBouncer', target: [Math.round((R() - .5) * 6), 160 + Math.round(R() * 20)] }, { id: 'piston', target: [0, 20 + Math.round(R() * 6)], kmh: 156 }, { id: 'piston', target: [-4, 70], kmh: 112 }, { id: 'piston', target: [10, 60], kmh: 128 }]));
    A.on('card', c => { this.card = c; });
    A.on('start', () => { this.phase = 'countdown'; this.startRound(); });
    A.on('time-up', () => { if (!this.sent.result) this.sendResult(); });
    A.on('end', e => { this.ended = true; this.endReason = e && e.reason; this.phase = 'ended'; try { game.input.clear(); } catch (er) { /* off */ } Audio.stopAll(); });
    A.ready();
  },
  startRound() {
    const s = showdownBat({ hub: true, balls: this.balls, inputs: [game.input], seed: (this.info && this.info.seed) || 7 });
    Hub.round = s; game.go('hubround', {}, { fade: 0 });
  },
  canBowl() { const A = window.AIHub; return !A || !A.active || A.time() >= 0; },
  progress(m) { const i = m.innings[0]; if (!i || this.ended) return; this.sent.progress++; try { window.AIHub.progress({ score: i.runs, label: i.runs + '/' + i.wkts + ' (' + i.balls + ' balls)' }); } catch (e) { /* hub */ } },
  sendResult() {
    if (this.sent.result || this.ended) return; this.sent.result = 1;
    const m = Play.m, i = m && m.innings[0], runs = i ? i.runs : 0;
    const best = i ? i.recs.filter(r => r.contact && r.shot).sort((a, b) => (b.runs || 0) - (a.runs || 0))[0] : null;
    try { window.AIHub.result({ score: runs, stats: { boundaries: i ? i.fours + i.sixes : 0, sixes: i ? i.sixes : 0, 'best shot': best && SHOTS[best.shot] ? SHOTS[best.shot].name : 'none' } }); } catch (e) { /* hub */ }
  }
};
K.Hub = Hub; K.hub = Hub;
scenes.hubcard = {
  view: 'threequarter', camera: { zoom: false },
  enter() { this.t = 0; K.game.setView(Views.v.wide); if (!Hub.info && Hub.phase === 'connect') Hub.connect(); this.crowdR = window.AIHub && window.AIHub.rng ? window.AIHub.rng('card') : () => .5; },
  update(dt) {
    this.t += dt; if (Hub.ended) return;
    const I = game.input, A = window.AIHub; if (!A || Hub.phase !== 'card') return;
    const c = I.clicked && I.clicked(), L = this.btns || {};
    const inB = b => b && c && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
    if (I.pressed('confirm') || I.pressed('shot') || inB(L.ready)) { I.consumeAll(); A.answer('ready'); Hub.readyAnswered = true; K.sfx('confirm'); }
    if (I.pressed('special') || inB(L.more)) { I.consumeAll(); A.answer('more'); Hub.more = !Hub.more; K.sfx('select'); }
  },
  draw(r) {
    const B = Ground.get('dome'), g = game;
    g.lights.enabled = true; g.lights.ambient = .45;
    for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) g.lights.add(B.OX + fx, B.OY + fy, 220, 1100, .75, { color: '#fff4dc' });
    r.sky(['#05050f', '#0a0a1e', '#141030']); B.map.drawFloor(r); B.map.queueWalls(r);
    r.shape('KERFUFFLE:thrumptonator', B.OX, B.OY + 330, 0, { facing: -Math.PI / 2, params: { angle: Math.floor(this.t * 4) % 16 } });
    r.shape('KERFUFFLE:stumps', B.OX, B.OY, 0, { facing: Math.PI / 2 });
    for (const t of GROUNDS.dome.targets) if (t.shape) r.shape(t.shape, B.OX + t.at[0], B.OY + t.at[1], 0, { facing: t.face || 0 });
    g.focus(B.OX, B.OY + 200, 0);
    const info = Hub.info, card = Hub.card || {}, I = g.input;
    r.overlay(gg => {
      px.blend(gg, .55, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, '#05040c'));
      E.font.title(gg, 'CRICKET KERFUFFLE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#5ab04a'], depth: 1 });
      UI.text(gg, 'SUPER OVER SHOWDOWN AT THE MEGADOME', r.W / 2, 30, '#c8a0ff', { align: 'center' });
      UI.text(gg, 'MOST RUNS FROM ONE OVER WINS', r.W / 2, 44, UI.gold, { align: 'center', scale: 1 });
      UI.text(gg, '6 balls from the Thrumptonator 3000 - 2 wickets', r.W / 2, 56, '#ffffff', { align: 'center' });
      const players = info ? info.players : [];
      players.forEach((p, i) => { const x = r.W / 2 - players.length * 40 + i * 80, y = 72, ready = (card.ready || []).includes(p.id); px.rect(gg, x, y, 76, 26, p.color); px.rect(gg, x + 1, y + 1, 74, 24, '#10101a'); UI.text(gg, String(p.name || 'Player').slice(0, 11), x + 38, y + 4, p.color, { align: 'center' }); UI.text(gg, ready ? 'READY!' : '...', x + 38, y + 15, ready ? '#6aff8a' : '#a8a8a8', { align: 'center' }); if (info && p.id === info.me) px.rect(gg, x, y + 26, 76, 2, '#ffffff'); });
      Glyphs.row(gg, r.W / 2, 112, I, [['aim', 'AIM'], ['shot', 'HIT'], ['loft', 'LOFT'], ['block', 'DEFEND'], ['run', 'RUN']], { align: 'center' });
      const left = card.left, status = card.starting ? 'STARTING...' : card.paused ? 'PAUSED: MOST PLAYERS WANT MORE TIME' : left !== null && left !== undefined ? 'STARTS IN ' + Math.ceil(left / 1000) + 's' : 'GET READY';
      UI.text(gg, status, r.W / 2, 132, '#ffffff', { align: 'center' });
      const bw = 90, by = 150; this.btns = { ready: [r.W / 2 - bw - 6, by, bw, 22], more: [r.W / 2 + 6, by, bw, 22] };
      px.rect(gg, ...this.btns.ready, Hub.readyAnswered ? '#2a6a3a' : '#3a8a4a'); Glyphs.draw(gg, this.btns.ready[0] + 4, by + 6, I, 'confirm'); UI.text(gg, 'READY', this.btns.ready[0] + 56, by + 7, '#ffffff', { align: 'center' });
      px.rect(gg, ...this.btns.more, card.asked ? '#6a4a8a' : '#4a3a6a'); Glyphs.draw(gg, this.btns.more[0] + 4, by + 6, I, 'special'); UI.text(gg, card.asked ? 'ASKED' : 'MORE TIME', this.btns.more[0] + 56, by + 7, '#ffffff', { align: 'center' });
      if (Hub.ended) { px.rect(gg, 0, r.H / 2 - 14, r.W, 28, '#000000'); UI.text(gg, Hub.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); }
    });
  }
};
scenes.hubround = {
  pausable: true, view: 'threequarter', camera: { zoom: false },
  enter() {
    const s = Hub.round; this.t = 0; this.done = false; this.off = null; this.none = !s;
    // no round to play (opened by a link, not by the session): back to the session's card, or the title outside one
    if (!s) { game.after(0, () => game.go(window.AIHub && Hub.phase !== 'connect' ? 'hubcard' : 'title', {}, { fade: 0 })); return; }
    Play.begin(s.cfg, { extra: Object.assign({}, s.extra, { draw: r => this.countdown(r) }), onEnd: () => { this.done = true; Hub.sendResult(); } });
    Hub.progress(Play.m);
    this.off = bus.on('ball:done', d => { if (d.match === Play.m) Hub.progress(Play.m); });
  },
  exit() { if (this.off) this.off(); },
  update(dt) {
    if (Hub.ended || this.none) return;
    const m = Play.m;
    if (!this.done) Play.update(dt);
    if (m && m.innings[0] && m.innings[0].done && !Hub.sent.result) Hub.sendResult();
    if (m && m.phase === 'done' && !Hub.sent.result) Hub.sendResult();
  },
  countdown(r) {
    const A = window.AIHub, t = A && A.time ? A.time() : 0;
    r.overlay(g => {
      if (t < 0) { const n = Math.ceil(-t / 1000); E.font.title(g, n > 0 ? String(n) : 'PLAY!', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#ffd36a', '#c8402a'] }); }
      else if (t < 900) E.font.title(g, 'PLAY!', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 4, colors: ['#ffffff', '#6aff8a', '#2a8a3a'] });
      if (Hub.sent.result && !Hub.ended) { px.rect(g, 0, r.H / 2 + 20, r.W, 20, '#000000'); UI.text(g, 'WAITING FOR THE OTHERS...', r.W / 2, r.H / 2 + 26, '#ffffff', { align: 'center' }); }
      if (Hub.ended) { px.rect(g, 0, r.H / 2 - 14, r.W, 28, '#000000'); UI.text(g, Hub.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); }
    });
  },
  draw(r) { if (this.none) { r.sky(['#05050f', '#0a0a1e', '#141030']); return; } Play.draw(r); }
};
