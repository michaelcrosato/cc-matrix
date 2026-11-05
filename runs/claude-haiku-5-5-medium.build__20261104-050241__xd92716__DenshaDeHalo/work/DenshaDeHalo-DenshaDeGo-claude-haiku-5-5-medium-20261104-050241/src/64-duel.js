/* Densha de Halo! · 64-duel: the local duel (section 4.24): two drivers on one keyboard, each in half the screen, on the
 * Parallel Run. P1 is on track A (x 0), P2 on track D (x +7); each sees the other as a real train on the next track. Keys:
 * P1 W/S lever, T neutral, R emergency, F call, G horn, H ATS, Y view; P2 Up/Down lever, ; neutral, L emergency, . call,
 * / horn, , ATS, ' view. The lobby starts when both are ready (P1 Enter, P2 Right Shift). The better score wins; a tie is a tie. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

DH.DUEL_VIEWS = ['cab', 'chase', 'platform', 'trackside'];

const KEYS = {
  p1: { up: 'KeyW', down: 'KeyS', neutral: 'KeyT', eb: 'KeyR', call: 'KeyF', horn: 'KeyG', ats: 'KeyH', view: 'KeyY' },
  p2: { up: 'ArrowUp', down: 'ArrowDown', neutral: 'Semicolon', eb: 'KeyL', call: 'Period', horn: 'Slash', ats: 'Comma', view: 'Quote' }
};

DH.makeDuelScenes = (game) => {
  const D = { keys: new Set(), prev: { p1: {}, p2: {} }, ready: { p1: false, p2: false } };
  DH.duelState = D;
  const down = (e) => { D.keys.add(e.code); };
  const up = (e) => { D.keys.delete(e.code); };
  const listen = () => { if (window.addEventListener) { window.addEventListener('keydown', down); window.addEventListener('keyup', up); } };
  const unlisten = () => { if (window.removeEventListener) { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); } };
  const pressed = (who, act) => { const code = KEYS[who][act], now = D.keys.has(code), was = !!D.prev[who][act]; D.prev[who][act] = now; return now && !was; };
  const held = (who, act) => D.keys.has(KEYS[who][act]);

  const makeSims = () => {
    const stage = Object.assign({}, DH.stageById('PR'));
    const route = DH.compiled.halo;
    const p1 = new DH.Sim(stage, route, { difficulty: 'normal' }), p2 = new DH.Sim(stage, route, { difficulty: 'normal' });
    p1.train.lane = 'A'; p2.train.lane = 'D';
    return { p1, p2 };
  };

  /* the drive for one player: lever with repeat, the buttons, the view */
  const drivePlayer = (who, sim, dt) => {
    const rep = D.rep = D.rep || { p1: {}, p2: {} }, R = rep[who];
    const step = (act, fn) => { if (pressed(who, act)) { fn(); R[act] = 0.25; } else if (held(who, act)) { R[act] = (R[act] || 0) - dt; if (R[act] <= 0) { fn(); R[act] = 0.18; } } else R[act] = 0; };
    step('up', () => sim.cmd('power'));
    step('down', () => sim.cmd('brake'));
    if (pressed(who, 'neutral')) sim.cmd('neutral');
    if (pressed(who, 'eb')) sim.cmd('eb');
    if (pressed(who, 'ats')) sim.cmd('ats');
    if (pressed(who, 'call')) sim.cmd('call');
    if (pressed(who, 'view')) D.view[who] = (D.view[who] + 1) % DH.DUEL_VIEWS.length;
    const h = held(who, 'horn'); if (h !== !!sim.horn.held) sim.cmd('horn', h);
  };

  /* one half of the screen: the cab's essentials, drawn in the half's own space */
  const half = (r, g, x0, w, H, sim, label, colour) => {
    const sn = sim.snapshot();
    E.ui.box(g, x0 + 4, H - 74, w - 8, 70, { bg: ['#0c0a18', '#0a0814'], border: colour, alpha: .9 });
    E.font.text(g, label, x0 + 10, H - 70, colour, { scale: 2 });
    E.font.text(g, String(Math.round(sn.v)) + ' KM/H', x0 + 10, H - 50, '#ffffff', { scale: 2 });
    E.font.text(g, 'NOTCH ' + sn.notch, x0 + 10, H - 30, '#e8e0ff', { scale: 1 });
    E.font.text(g, 'HALO ' + Math.max(0, Math.round(sn.halo)), x0 + w * .42, H - 70, '#f2c230', { scale: 1 });
    E.font.text(g, 'SCORE ' + sn.score, x0 + w * .42, H - 58, '#ffffff', { scale: 1 });
    if (sn.nextStop) E.font.text(g, 'MARK ' + sn.nextStop.dist + ' M', x0 + w * .42, H - 46, '#9ad0ff', { scale: 1 });
    if (sn.lastJudgment) E.font.text(g, sn.lastJudgment.label, x0 + w / 2, Math.round(H * .3), DH.judgmentColour(sn.lastJudgment.label), { align: 'center', scale: 2, shadow: '#000' });
    if (sn.ats.ringing) E.font.text(g, 'ATS!', x0 + w / 2, Math.round(H * .42), '#ff5a4a', { align: 'center', scale: 2 });
  };

  const duel = {
    pausable: false,
    enter() {
      listen();
      D.sims = makeSims(); D.t = 0; D.done = false; D.rep = { p1: {}, p2: {} }; D.view = { p1: 0, p2: 0 };
      DH.Sound.attach(game);
    },
    exit() { unlisten(); },
    update(dt) {
      if (!D.sims || D.done) return;
      const { p1, p2 } = D.sims;
      drivePlayer('p1', p1, dt); drivePlayer('p2', p2, dt);
      p1.step(dt); p2.step(dt);
      D.t += dt;
      if ((p1.finished || p1.gameOver) && (p2.finished || p2.gameOver)) { D.done = true; return game.go('duelEnd', { a: p1.totals(), b: p2.totals(), ga: p1.gameOver, gb: p2.gameOver }, { fade: 'wipe' }); }
    },
    draw(r) {
      if (!D.sims) return;
      const { p1, p2 } = D.sims, W = r.W, H = r.H, half2 = Math.round(W / 2);
      const rail = D.rail = D.rail || new DH.Rail(DH.compiled.halo);
      const tod = DH.todGrade(12);
      const drawSide = (sim, other, x0, w, label, colour, who) => {
        const vr = { W: w, H, viewport: { x: x0, y: 0, w, h: H }, overlay: (fn) => r.overlay(fn), game };
        const ownWrap = DH.trainWrap(DH.compiled.halo, sim.train), otherWrap = DH.trainWrap(DH.compiled.halo, other.train);
        const T = sim.train;
        const v = D.view[who], cam = DH.camFor(sim, DH.DUEL_VIEWS[v], null);
        const trains = v === 0 ? [otherWrap] : [otherWrap, ownWrap];
        rail.draw(vr, cam, { trains, hideTrain: v === 0 ? ownWrap : null, grade: tod, hour: 12, fogDist: sim.fogDist, t: D.t });
        r.overlay(g => half(r, g, x0, w, H, sim, label, colour));
      };
      drawSide(p1, p2, 0, half2 - 2, 'P1', '#ff5a40', 'p1');
      drawSide(p2, p1, half2 + 2, W - half2 - 2, 'P2', '#40a0ff', 'p2');
      r.overlay(g => { E.px.rect(g, half2 - 1, 0, 2, H, '#0a0a14'); E.font.text(g, 'DUEL  ' + DH.clock(p1.clock()).slice(0, 5), W / 2, 4, '#f2c230', { align: 'center', scale: 1, shadow: '#000' }); });
    }
  };

  const lobby = {
    enter() { D.ready = { p1: false, p2: false }; listen(); this.rebuild(); },
    exit() { unlisten(); },
    rebuild() {
      const items = [{ label: 'P1 READY: ' + (D.ready.p1 ? 'YES' : 'NO') }, { label: 'P2 READY: ' + (D.ready.p2 ? 'YES' : 'NO') }, { label: 'START THE DUEL' }, { label: 'BACK' }];
      this.menu = new E.Menu(game, items, {
        x: 'center', y: 110, onPick: (i) => {
          if (i === 0) D.ready.p1 = !D.ready.p1;
          else if (i === 1) D.ready.p2 = !D.ready.p2;
          else if (i === 2) { if (D.ready.p1 && D.ready.p2) return game.go('duel', null, { fade: 'wipe' }); }
          else return game.go('title', null, { fade: 'wipe' });
          this.rebuild();
        }
      });
    },
    update(dt) {
      const I = game.input;
      if (D.keys.has('ShiftRight') && !this.p2Was) { D.ready.p2 = !D.ready.p2; this.rebuild(); }
      this.p2Was = D.keys.has('ShiftRight');
      this.menu.update(dt);
      if (I.pressed('cancel')) game.go('title', null, { fade: 'wipe' });
    },
    draw(r) {
      DH.drawBackdrop(r, 12);
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .92 });
        E.font.text(g, 'DUEL  •  PARALLEL RUN', r.W / 2, 16, '#f2c230', { align: 'center', scale: 2 });
        E.font.text(g, 'P1  W/S LEVER  T NEUTRAL  R EB  F CALL  G HORN  H ATS  Y VIEW', r.W / 4, 60, '#ff8a70', { align: 'center', scale: 1 });
        E.font.text(g, 'P2  UP/DOWN LEVER  ; NEUTRAL  L EB  . CALL  / HORN  , ATS  \' VIEW', r.W * 3 / 4, 60, '#70b0ff', { align: 'center', scale: 1 });
        E.font.text(g, 'P2 CAN ALSO READY WITH RIGHT SHIFT', r.W / 2, r.H - 30, '#c8c4dc', { align: 'center', scale: 1 });
      });
      this.menu.draw(r);
    }
  };

  const duelEnd = {
    enter(data) { this.d = data; },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) game.go('title', null, { fade: 'wipe' }); },
    draw(r) {
      const d = this.d || { a: { total: 0 }, b: { total: 0 } };
      DH.drawBackdrop(r, 20);
      const winner = d.a.total === d.b.total ? 'A TIE' : (d.a.total > d.b.total ? 'P1 WINS' : 'P2 WINS');
      r.overlay(g => {
        E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .92 });
        E.font.title(g, winner, r.W / 2, 22, { scale: 2, align: 'center', colors: ['#fff6c8', '#f2c230', '#b8801a'] });
        E.font.text(g, 'P1  ' + d.a.total + (d.ga ? '  (GAME OVER)' : ''), r.W / 4, 80, '#ff8a70', { align: 'center', scale: 2 });
        E.font.text(g, 'P2  ' + d.b.total + (d.gb ? '  (GAME OVER)' : ''), r.W * 3 / 4, 80, '#70b0ff', { align: 'center', scale: 2 });
        E.font.text(g, 'ENTER: TITLE', r.W / 2, r.H - 24, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };
  return { duelLobby: lobby, duel, duelEnd };
};
})();
