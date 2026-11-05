/* 64-duel: two drivers on one screen, the Parallel Run at noon: P1 on track A, P2 beside on track C, split screen,
 * each with the minimal cab and a compact HUD, each seeing the other's train on the next track. P2 joins with Start on a
 * second controller or 2 on the keyboard (then P1 keeps W/S F G H R T Y, P2 takes the arrows . / , L ; '). Best score
 * wins; a tie is a tie. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T, SND = () => DH.Sound;
const COLS = ['#e8443a', '#3b82f6'];
let L = null;
DH.scenes.duelLobby = {
  input: DH.DUEL_KEYS, camera: { zoom: false },
  enter() {
    L = { ready: [false, false], t: 0 }; SND().music('parallel'); DH.lastInput = game.real;
    if (game.players.length > 1) for (const q of game.players.slice(1)) game.removePlayer(q);
    game.allowJoin({ max: 2, onJoin: () => { game.audio.sfx('ok'); L.ready[1] = false; } });
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    L.t += dt; const P = game.players;
    P.forEach((I, i) => { if (I.pressed('confirm')) { L.ready[i] = !L.ready[i]; game.audio.sfx(L.ready[i] ? 'ok' : 'back'); } });
    const ck = game.input.clicked(); if (ck && DH._duelGo && ck[0] >= DH._duelGo.x && ck[0] <= DH._duelGo.x + DH._duelGo.w && ck[1] >= DH._duelGo.y && ck[1] <= DH._duelGo.y + DH._duelGo.h) { L.ready[0] = true; if (P.length > 1) L.ready[1] = L.ready[1] || P[1].device === 'keyboard'; }
    if (P.length > 1 && L.ready[0] && L.ready[1]) { game.allowJoin(false); game.go('duel', { auto: DH.duelAuto }, { fade: 'wipe' }); return; }
    if (P[0].pressed('cancel') && !L.ready[0]) { game.go('title', null, { fade: 'wipe' }); return; }
    if (P.length < 2) DH.idleTick(dt); else DH.lastInput = game.real;
  },
  draw(r) {
    DH.drawScenic(r, 'duel');
    r.overlay(g => {
      const W = r.W, H = r.H, P = game.players; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      T(g, 'DUEL · PARALLEL RUN', W / 2, 10, '#f2c230', { align: 'center', scale: 2, shadow: '#000' }); T(g, 'Shotengai to Sakura-Koen at noon. Best score wins: stop on the mark, on time.', W / 2, 30, '#c8d0e8', { align: 'center', font: 'tiny', shadow: '#000' });
      const cw = Math.min(190, (W - 30) / 2);
      for (let i = 0; i < 2; i++) {
        const x = Math.round(W / 2 + (i ? 6 : -6 - cw)), y = 46, joined = i < P.length, I = P[i], half = joined && I.half;
        E.ui.box(g, x, y, cw, 150, { bg: ['#141a3a', '#0a0c18'], border: joined ? COLS[i] : '#3a3a50' });
        T(g, 'P' + (i + 1), x + 8, y + 6, COLS[i], { scale: 2, shadow: '#000' });
        if (!joined) { T(g, 'PRESS START', x + cw / 2, y + 50, '#ffe9a0', { align: 'center', scale: 1 }); T(g, 'on a second controller', x + cw / 2, y + 62, '#c8d0e8', { align: 'center', font: 'tiny' }); T(g, 'or 2 on the keyboard', x + cw / 2, y + 72, '#c8d0e8', { align: 'center', font: 'tiny' }); continue; }
        T(g, I.device === 'gamepad' ? 'CONTROLLER' : half ? (half === 'left' ? 'KEYBOARD, LEFT' : 'KEYBOARD, RIGHT') : 'KEYBOARD AND MOUSE', x + cw - 8, y + 10, '#c8d0e8', { align: 'right', font: 'tiny' });
        const rows = [['lever', 'LEVER'], ['call', 'CALL'], ['horn', 'HORN'], ['ats', 'ATS'], ['eb', 'EB'], ['neutral', 'N'], ['view', 'VIEW']];
        rows.forEach(([a, t], k) => { const yy = y + 28 + k * 15; DH.Glyph.draw(g, a === 'lever' ? (I.device === 'gamepad' ? 'lever' : 'up') : a, x + 10, yy, I); if (a === 'lever' && I.device !== 'gamepad') DH.Glyph.draw(g, 'down', x + 10 + DH.Glyph.width('up', I) + 1, yy, I); T(g, t, x + 64, yy + 2, '#e8e4f0'); });
        T(g, L.ready[i] ? 'READY!' : 'PRESS ' + I.label('confirm') + ' WHEN READY', x + cw / 2, y + 136, L.ready[i] ? '#6aff8a' : '#ffe9a0', { align: 'center', shadow: '#000' });
      }
      const go = DH._duelGo = { x: Math.round(W / 2 - 60), y: 202, w: 120, h: 18 };
      if (P.length > 1) { E.ui.box(g, go.x, go.y, go.w, go.h, { bg: ['#3a3220', '#241c10'], border: '#f2c230' }); T(g, 'READY (CLICK)', W / 2, go.y + 5, '#ffe9a0', { align: 'center' }); }
      DH.promptLine(g, W, H, [['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
/* ---- the race ---- */
let Q = null;
DH.scenes.duel = {
  input: DH.DUEL_KEYS, camera: { zoom: false }, pausable: true,
  enter(d = {}) {
    const P = game.players;
    Q = { drives: [], t: 0, done: false, endT: 0 };
    for (let i = 0; i < 2; i++) {
      const dv = new DH.Drive('PR', { track: i ? 'C' : 'A', input: P[i] || game.input, minimal: true, viewport: true, mute: i === 1, auto: d.auto ? { skill: 1 } : null, noStopCam: false });
      dv.cam = 'cab'; Q.drives.push(dv);
    }
    // each sees the other's train on the next track
    Q.drives.forEach((dv, i) => { const other = Q.drives[1 - i]; const gh = { s: 0, track: other.run.track, dir: 1, cars: 6, livery: 'h8000', lights: true, colour: COLS[1 - i], tag: 'P' + (2 - i) }; dv.ghosts = [gh]; dv._other = other; dv._gh = gh; });
    DH.duelDrives = Q.drives; game.splitScreen(2, { layout: 'auto' }); SND().music(null); game.input.consumeAll();
  },
  update(dt) {
    Q.t += dt;
    for (const dv of Q.drives) { dv.update(dt); const o = dv._other.run; Object.assign(dv._gh, { s: o.s, doors: o.doors, doorSide: o.doorSide }); }
    const fin = Q.drives.every(dv => dv.run.phase === 'finished' || dv.run.phase === 'over');
    if (fin) { Q.endT += dt; if (Q.endT > 4) game.go('duelResults', { sums: Q.drives.map(dv => dv.summary()) }, { fade: 'wipe' }); }
  },
  draw(r) { const i = r.viewport ? r.viewport.i : 0, dv = Q && Q.drives[i]; if (dv) dv.draw(r); },
  hud(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, a = Q.drives[0].run, b = Q.drives[1].run, sa = a.finalScore(), sb = b.finalScore(), lead = sa === sb ? 'LEVEL' : sa > sb ? 'P1 LEADS' : 'P2 LEADS';
      const y = H - 26; E.ui.box(g, Math.round(W / 2 - 46), y, 92, 22, { alpha: .85, bg: '#0a0c18', border: '#f2c230' }); T(g, DH.clockStr(a.clock), W / 2, y + 3, '#fff4c0', { align: 'center' }); T(g, lead + '  ' + sa + ' : ' + sb, W / 2, y + 13, sa === sb ? '#c8d0e8' : sa > sb ? COLS[0] : COLS[1], { align: 'center', font: 'tiny' });
    });
  }
};
DH.scenes.duelResults = {
  input: DH.DUEL_KEYS, camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; SND().music('results'); this.menu = new DH.BigMenu([{ label: 'REMATCH', onPick: () => game.go('duel', { auto: DH.duelAuto }, { fade: 'wipe' }) }, { label: 'TITLE', onPick: () => { for (const q of game.players.slice(1)) game.removePlayer(q); game.go('title', null, { fade: 'wipe' }); } }], { w: 140, scale: 1, gap: 8 }); },
  update(dt) { this.t += dt; if (this.t > 1) this.menu.update(dt); },
  draw(r) {
    DH.drawScenic(r, 'duel');
    r.overlay(g => {
      const W = r.W, H = r.H, [a, b] = this.d.sums, tie = a.score === b.score, win = tie ? -1 : a.score > b.score ? 0 : 1; px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
      F.title(g, tie ? 'A TIE!' : 'P' + (win + 1) + ' WINS!', Math.round(W / 2), 10, { scale: 3, align: 'center', colors: tie ? ['#ffffff', '#c8d0e8', '#8a90b0'] : [E.tones(COLS[win]).hi, COLS[win], E.tones(COLS[win]).sh], depth: 2 });
      const cw = Math.min(180, (W - 30) / 2);
      [a, b].forEach((s, i) => {
        const x = Math.round(W / 2 + (i ? 6 : -6 - cw)), y = 44; E.ui.box(g, x, y, cw, 124, { bg: ['#141a3a', '#0a0c18'], border: COLS[i] });
        T(g, 'P' + (i + 1), x + 8, y + 6, COLS[i], { scale: 2 }); DH.stamp(g, x + cw - 22, y + 18, s.rank, .7);
        const J = s.judgments; [['STOPS', J.map(j => j.label.replace(' HALO!', '').replace('!', '')).join(' · ') || '-'], ['ON TIME', s.onTime + ' of ' + J.length], ['CALLS', s.calls.great + ' great'], ['RIDE', s.comfort + '%'], ['SCORE', String(s.score)]].forEach(([k, v], n) => { T(g, k, x + 8, y + 40 + n * 15, '#8a90b0', { font: 'tiny' }); T(g, v, x + 8, y + 47 + n * 15, n === 4 ? '#ffe070' : '#ffffff'); });
        if (i === win) DH.drawHaro(g, x + cw / 2, y + 152 - Math.abs(Math.sin(this.t * 6)) * 8, 1.2, this.t);
      });
      this.menu.y = Math.min(H - 70, 176); this.menu.x = Math.round(W / 2 - 70); if (this.t > 1) this.menu.draw(g, W, H);
    });
  }
};
})();
