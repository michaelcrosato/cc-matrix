/* Local Duel: two players, one keyboard (or a pad each is not needed), split screen, the same Parallel Run stage side by side.
 * P1: W/S lever, F call, G horn, H ATS, R emergency brake, T neutral.  P2: Up/Down lever, . call, / horn, , ATS, L emergency brake, ; neutral. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, R = DH.route, clamp = E.clamp, txt = DH.txt, game = DH.game, scenes = DH.scenes, I = game.input, A = game.audio;
const MAP = [
  { KeyW: 'up', KeyS: 'down', KeyF: 'call', KeyG: 'horn', KeyH: 'ats', KeyR: 'eb', KeyT: 'neutral' },
  { ArrowUp: 'up', ArrowDown: 'down', Period: 'call', Slash: 'horn', Comma: 'ats', KeyL: 'eb', Semicolon: 'neutral' }];
DH.DUEL_KEYS = ['W/S lever  F call  G horn  H ATS  R EB  T neutral', 'Up/Down lever  . call  / horn  , ATS  L EB  ; neutral'];
const held = [new Set(), new Set()], queue = [[], []];
DH.duelPress = (pl, a, down = true) => { if (down) { queue[pl].push(a); held[pl].add(a); } else held[pl].delete(a); };
if (typeof addEventListener === 'function') {
  addEventListener('keydown', e => { if (game.sceneName !== 'duel') return; for (let p = 0; p < 2; p++) { const a = MAP[p][e.code]; if (a) { e.preventDefault(); if (a === 'up' || a === 'down' || !e.repeat) queue[p].push(a); held[p].add(a); } } });
  addEventListener('keyup', e => { for (let p = 0; p < 2; p++) { const a = MAP[p][e.code]; if (a) held[p].delete(a); } });
}
scenes.duel = {
  input: DH.KEYS, res: 'ps1', expand: true, pausable: true, camera: { zoom: false },
  enter() {
    const st = DH.stageById('PR'); this.stage = st; this.t = 0; this.over = false; this.auto = [false, false];
    this.runs = [0, 1].map(() => new DH.Run(st, { difficulty: 'Normal' })); this.runs.forEach(r => { r.oncoming = []; });
    this.toasts = [[], []]; this.judge = [null, null]; this.hornT = [0, 0]; queue[0].length = queue[1].length = 0; held[0].clear(); held[1].clear();
    this.menu = new DH.ListMenu([{ label: 'REMATCH' }, { label: 'TITLE' }], { onPick: i => game.go(i ? 'title' : 'duel') });
    A.music(DH.SONGS.drive); DH.soundStop(); DH.drive = null;
  },
  exit() { A.music(null); },
  update(dt) {
    this.t += dt;
    if (this.over) { this.menu.update(); return; }
    this.runs.forEach((run, p) => {
      if (!run.finished && !run.failed) {
        if (this.auto[p]) DH.autopilot(run, { cheat: true });
        for (const a of queue[p].splice(0)) {
          if (a === 'up') run.notchUp(); else if (a === 'down') run.notchDown(); else if (a === 'neutral') run.neutral(); else if (a === 'eb') run.eb(); else if (a === 'call') run.call();
        }
        run.step(dt, { horn: held[p].has('horn') || (this.auto[p] && run.autoHorn), ats: held[p].has('ats') });
      } else queue[p].length = 0;
      for (const e of run.events.splice(0)) {
        if (e.kind === 'judge') { this.judge[p] = Object.assign({ life: 3 }, e); DH.sfx.judge(e.grade); }
        else if (e.kind === 'penalty') this.toasts[p].push({ text: '-' + e.amount.toFixed(1) + ' ' + e.why, life: 2 });
        else if (e.kind === 'fail') this.toasts[p].push({ text: e.why, life: 4 });
        else if (e.kind === 'call') { this.toasts[p].push({ text: e.text, life: 1.5 }); DH.sfx.call(); }
      }
      this.toasts[p] = this.toasts[p].filter(t => (t.life -= dt) > 0); if (this.judge[p] && (this.judge[p].life -= dt) <= 0) this.judge[p] = null;
    });
    if (this.runs.every(r => r.finished || r.failed)) { this.over = true; this.t = 0; DH.sfx.win(); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, hw = Math.floor(W / 2);
      this.runs.forEach((run, p) => {
        g.save(); g.translate(p * hw, 0); g.beginPath(); g.rect(0, 0, hw, H); g.clip();
        const cam = DH.camFor('cab', run, this.t, 0); cam.horizon = .42;
        const res = DH.drawWorld(g, hw, H, cam, { run, weather: run.weather, clock: run.clock, time: this.t, trains: DH.trainsFor(run, 'cab', [{ s: this.runs[1 - p].s, lane: 1, color: p ? '#e8443a' : '#3b82f6' }]), draw: 200, closeGates: c => { const d = R.wrap(c.s - run.s); return d < 420 && d > -12; } });
        DH.drawWeatherOverlay(g, hw, H, run.weather, this.t, run.v, 0);
        const y0 = H - 56; px.rect(g, 0, y0, hw, 56, '#12151e'); px.rect(g, 0, y0, hw, 2, '#3a4152');
        const col = p ? '#e8443a' : '#3b82f6'; px.rect(g, 0, 0, hw, 12, '#000b'); px.rect(g, 0, 0, 4, 12, col);
        txt(g, 'P' + (p + 1) + '  ' + String(Math.round(run.score)).padStart(5, '0') + '   HALO ' + Math.ceil(run.halo), 8, 3, '#fff', { font: 'tiny' });
        txt(g, String(Math.round(run.v * 3.6)), 8, y0 + 5, '#e8f0ff', { scale: 3 }); txt(g, 'km/h  limit ' + run.limitNow(), 8, y0 + 31, '#8a96b0', { font: 'tiny' });
        txt(g, 'LEVER ' + DH.notchName(run.lever), hw - 6, y0 + 6, run.lever < 0 ? '#7ab4ff' : run.lever > 0 ? '#78f0a0' : '#fff', { align: 'right' });
        if (run.leg) { const d = run.distToMark(); txt(g, 'NEXT ' + R.stations[run.leg.station].name.toUpperCase(), hw - 6, y0 + 20, '#c8d2ea', { font: 'tiny', align: 'right' }); txt(g, Math.abs(d) < 10 ? d.toFixed(1) + ' m' : Math.round(d) + ' m', hw - 6, y0 + 30, d < -.5 ? '#ff7a6a' : '#fff', { align: 'right' }); } else txt(g, run.finished ? 'FINISHED' : 'OUT', hw - 6, y0 + 24, '#9ef0c0', { align: 'right' });
        if (run.callOpen) txt(g, 'CALL!', hw / 2, 40, '#ffe24a', { align: 'center', scale: 2 });
        if (run.doors && run.phase === 'dwell') txt(g, 'DOORS OPEN', hw / 2, y0 - 12, '#ffc020', { align: 'center', font: 'tiny' }); else if (run.canDepart && run.phase === 'dwell') txt(g, 'GO: POWER', hw / 2, y0 - 12, '#9ef0c0', { align: 'center', font: 'tiny' });
        this.toasts[p].slice(-3).forEach((t, k) => txt(g, t.text, hw / 2, 70 + k * 9, '#ffd36a', { align: 'center', font: 'tiny' }));
        if (this.judge[p]) { const j = this.judge[p]; E.font.title(g, j.grade + '!', hw / 2, 20, { align: 'center', scale: 2, colors: ['#fff6c0', '#ffd23a', '#ff9a1a'], depth: 1 }); txt(g, (j.e > 0 ? '+' : '') + Math.round(j.e * 100) + ' cm', hw / 2, 40, '#fff', { align: 'center', font: 'tiny' }); }
        txt(g, DH.DUEL_KEYS[p], hw / 2, H - 6, '#6a7a90', { align: 'center', font: 'tiny' });
        g.restore();
      });
      px.rect(g, hw - 1, 0, 2, H, '#ffd23a');
      if (this.over) {
        const a = this.runs[0], b = this.runs[1], sa = Math.round(a.score) - (a.failed ? 99999 : 0), sb = Math.round(b.score) - (b.failed ? 99999 : 0), win = sa === sb ? 'DRAW' : sa > sb ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
        px.rect(g, 0, 40, W, 120, '#000d'); E.font.title(g, win, W / 2, 50, { align: 'center', scale: 3, colors: ['#fffbe0', '#ffd23a', '#ff9a1a'], depth: 2 });
        txt(g, 'P1 ' + Math.round(a.score) + (a.failed ? ' (' + a.failed + ')' : '') + '    P2 ' + Math.round(b.score) + (b.failed ? ' (' + b.failed + ')' : ''), W / 2, 84, '#fff', { align: 'center' });
        this.menu.draw(g, Math.round(W / 2 - 70), 104, 140, 20);
      }
    });
  }
};
})();
