/* DENSHA DE HALO! · local Duel: two players on one machine, split screen, the Parallel Run at noon. Player 1 on our
 * track (x 0), player 2 on the next (x +7); each sees the other as a real train alongside. A second controller's Start
 * or 2 on the keyboard joins; the keyboard splits in halves (keys shown in the lobby). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, R = Math.round;
const half = side => {   // a duel half: the lever on the half's up/down keys, the cab buttons in order
  const P = E.Input.halfKeys(DH.KEYS, side), pads = a => (DH.KEYS[a] || []).filter(c => /^Pad/.test(c));
  const L = side === 'left' ? { power: ['KeyW'], brake: ['KeyS'], call: ['KeyF'], horn: ['KeyG'], ats: ['KeyH'], eb: ['KeyR'], neutral: ['KeyT'], view: ['KeyY'] }
    : { power: ['ArrowUp'], brake: ['ArrowDown'], call: ['Period'], horn: ['Slash'], ats: ['Comma'], eb: ['KeyL'], neutral: ['Semicolon'], view: ['Quote'] };
  for (const a in L) P[a] = L[a].concat(pads(a));
  return P;
};
DH.duelHalf = half;
DH.scenes.duelLobby = {
  enter() {
    DH.idle = 0; DH.music('parallel'); this.ready = [false, false]; this.p2 = game.players.length > 1 ? game.players[1] : null;
    game.allowJoin({ max: 2, onJoin: (q, n) => { this.p2 = q; if (q.half) { q.use(half('right')); game.input.use(half('left')); } DH.Sound.play('confirm'); } });
  },
  exit() { game.allowJoin(false); },
  update() {
    if (game.shell && game.shell.screen) return;
    const P = game.players;
    if (P[0].pressed('confirm') || P[0].pressed('call')) { this.ready[0] = !this.ready[0] || true; DH.Sound.play('move'); }
    if (this.p2 && (this.p2.pressed('confirm') || this.p2.pressed('call'))) { this.ready[1] = true; DH.Sound.play('move'); }
    if (P[0].pressed('cancel') && !this.ready[0]) { if (this.p2) game.removePlayer(this.p2); game.input.use(DH.KEYS); game.go('title', null, { fade: 'wipe' }); return; }
    const c = game.input.clicked && game.input.clicked(); if (c && this.startRect && c[0] > this.startRect[0] && c[0] < this.startRect[0] + this.startRect[2] && c[1] > this.startRect[1] && c[1] < this.startRect[1] + this.startRect[3]) this.ready = [true, true];
    if (this.ready[0] && this.ready[1] && this.p2) game.go('duel', {}, { fade: 'wipe' });
  },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, 'DUEL: PARALLEL RUN', R(W / 2), 8, { scale: 2, colors: ['#ffffff', '#ffe27a', '#f2c230'], outline: '#0b0d18', align: 'center' });
      E.font.text(g, 'Two drivers, two tracks, one timetable. The best driving score wins.', R(W / 2), 30, '#c8d0f0', { align: 'center' });
      [0, 1].forEach(i => {
        const x = i ? W / 2 + 6 : 8, w = W / 2 - 14, y = 44, q = game.players[i];
        DH.panel(g, x, y, w, 130, 'PLAYER ' + (i + 1)); px.rect(g, x + w - 14, y + 4, 8, 8, DH.SEAT[i]);
        if (!q) { E.font.text(g, 'Press START on a second', R(x + w / 2), y + 40, '#ffffff', { align: 'center' }); E.font.text(g, 'controller, or 2 on the keyboard', R(x + w / 2), y + 50, '#ffffff', { align: 'center' }); return; }
        const dev = q.half ? 'keyboard' : q.device === 'gamepad' ? 'gamepad' : DH.device(), lab = a => q.half || dev === 'keyboard' ? q.label(a, 'keyboard') : DH.glyphLabel(a, 'gamepad');
        [['power', 'Power'], ['brake', 'Brake'], ['call', 'Call'], ['horn', 'Horn'], ['ats', 'ATS'], ['eb', 'EB'], ['neutral', 'N'], ['view', 'View']].forEach(([a, w2], k) => { E.font.text(g, w2, x + 8, y + 16 + k * 11, '#8a96c8'); E.font.text(g, lab(a), x + 60, y + 16 + k * 11, '#ffffff'); });
        E.font.text(g, this.ready[i] ? 'READY!' : 'press ' + lab('call') + ' when ready', R(x + w / 2), y + 110, this.ready[i] ? '#6aee7a' : '#ffe27a', { align: 'center' });
      });
      this.startRect = [W / 2 - 60, H - 40, 120, 14]; if (this.p2) { px.rect(g, W / 2 - 60, H - 40, 120, 14, '#2a3a7a'); E.font.text(g, 'START (both ready)', R(W / 2), H - 37, '#ffe27a', { align: 'center' }); }
      DH.prompts(g, W, H, [['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
DH.scenes.duel = {
  pausable: true, camera: { zoom: false },
  enter() {
    const runs = [new DH.Run('PR', { track: 'A', difficulty: game.settings.difficulty }), new DH.Run('PR', { track: 'D', difficulty: game.settings.difficulty })];
    this.drs = runs.map((run, i) => new DH.Drive(run, { cabMin: true, seatColor: DH.SEAT[i], input: game.players[i], others: () => [this.drs[1 - i].me], onEnd: () => { this.done[i] = true; }, onGameOver: () => { this.done[i] = true; }, mute: i === 1 }));
    this.drs.forEach((d, i) => { d.me.seatColor = DH.SEAT[i]; d.me.tag = 'P' + (i + 1); d.me.tagColor = DH.SEAT[i]; });
    this.done = [false, false]; this.endT = 0; game.splitScreen(2, { layout: 'auto' }); DH.music(null);
    DH.duelAuto = DH.duelAuto || null;
    if (DH.duelAuto) this.drs.forEach(d => { d.pilot = new DH.Autopilot(d.run, { skill: DH.duelAuto[d === this.drs[0] ? 0 : 1] }); });
  },
  exit() { DH.Sound.silence(); game.splitScreen && game.splitScreen(1); },
  update(dt) {
    this.drs.forEach((d, i) => { const q = game.players[i] || game.input; d.update(dt, this.done[i] ? {} : d.readInput(q, dt)); });
    if (this.done[0] && this.done[1]) { this.endT += dt; if (this.endT > 2) game.go('duelResults', { a: DH.summary(this.drs[0].run), b: DH.summary(this.drs[1].run) }, { fade: 'wipe' }); }
  },
  draw(r) {
    const vp = r.viewport || { i: 0, x: 0, y: 0, w: r.W, h: r.H }, d = this.drs[vp.i || 0];
    d.draw(r, { x: vp.x || 0, y: vp.y || 0, w: vp.w, h: vp.h }, { compact: true });
  },
  hud(r) {
    r.overlay(g => { const a = this.drs[0].run.finalScore(), b = this.drs[1].run.finalScore(); const lead = a === b ? 'EVEN' : a > b ? 'P1 LEADS' : 'P2 LEADS'; px.rect(g, R(r.W / 2 - 40), 0, 80, 21, '#0b0d18'); E.font.text(g, DH.clock(this.drs[0].run.clock), R(r.W / 2), 2, '#ffffff', { align: 'center' }); E.font.text(g, lead, R(r.W / 2), 11, '#ffe27a', { align: 'center' }); if (this.done[0] !== this.done[1]) E.font.text(g, 'P' + (this.done[0] ? 1 : 2) + ' FINISHED', R(r.W / 2), 24, '#ffffff', { align: 'center', shadow: '#000' }); });
  }
};
DH.scenes.duelResults = {
  enter(d) { this.d = d; this.t = 0; DH.music('resultsHi'); this.list = new DH.List([{ label: 'REMATCH', fn: () => game.go('duel', {}, { fade: 'wipe' }) }, { label: 'TITLE', fn: () => { if (game.players[1]) game.removePlayer(game.players[1]); game.input.use(DH.KEYS); game.go('title', null, { fade: 'wipe' }); } }]); },
  update(dt) { this.t += dt; if (game.shell && game.shell.screen) return; if (this.t > .8) this.list.update(); },
  winner() { const a = this.d.a.score, b = this.d.b.score; return a === b ? 0 : a > b ? 1 : 2; },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H, w = this.winner();
      [this.d.a, this.d.b].forEach((s, i) => { const x = i ? W / 2 + 6 : 8, ww = W / 2 - 14; DH.panel(g, x, 30, ww, 120, 'PLAYER ' + (i + 1)); E.font.text(g, DH.fmtNum(s.score), R(x + ww / 2), 46, '#ffe27a', { align: 'center', scale: 2 }); s.stops.forEach((q, k) => E.font.text(g, q.name + ': ' + q.label + (q.ontime ? ' ON TIME' : ''), x + 8, 70 + k * 10, '#ffffff')); E.font.text(g, s.stats.great + '/' + s.stats.calls + ' great calls', x + 8, 100, '#c8d0f0'); DH.stamp(g, x + ww - 22, 60, s.rank, .7); });
      E.font.title(g, w === 0 ? 'A TIE!' : 'PLAYER ' + w + ' WINS!', R(W / 2), 160, { scale: 2, colors: ['#ffffff', '#ffe27a', '#f2c230'], outline: '#0b0d18', align: 'center' });
      DH.drawHaro(g, W / 2, H - 50, 1.3, game.real, { hop: Math.abs(Math.sin(game.real * 4)) });
      this.list.draw(g, W / 2, H - 34, { w: 140, scale: 1, lh: 13 });
    });
  }
};
})();
