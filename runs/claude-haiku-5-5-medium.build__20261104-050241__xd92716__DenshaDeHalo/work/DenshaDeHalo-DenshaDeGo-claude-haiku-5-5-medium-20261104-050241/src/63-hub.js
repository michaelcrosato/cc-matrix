/* Densha de Halo! · 63-hub: the AI Hub session, ghost mode (AI Hub Session Protocol v1, section 4.23). In a session the game
 * opens straight into the Parallel Run: its own card (ready or more time), the countdown on the hub's clock, one round,
 * a result once, and an end that silences the game. Each copy runs its own round on its own lane (seat 0 on track A, 1 on
 * D, 2 on C, 3 on B: the four-track festival run). The other players' trains are ghosts: drawn where they are, never
 * affecting this copy's world. Outside a session (AIHub absent or not active) none of this runs. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

DH.SEAT_LANE = ['A', 'D', 'C', 'B'];
DH.hub = {
  get on() { return !!(window.AIHub && window.AIHub.active); },
  ghosts: new Map(), round: null, ended: false, card: null, startedAt: null, reported: false
};

/* the hub's scenes: the boot (connect), the card (our own), the round (the drive), the end (the standings) */
DH.makeHubScenes = (game, prog) => {
  const H = DH.hub;
  const hubEvent = (name, fn) => { if (window.AIHub && AIHub.on) AIHub.on(name, fn); };
  const once = (() => { let done = false; return () => { if (done) return false; done = true; return true; }; })();
  const S = {};
  S.hubBoot = {
    enter() {
      H.ended = false; H.reported = false; H.ghosts.clear(); H.card = null;
      // a session's pause menu has no Retry, Dev Mode or How to Drive (section 4.23)
      if (game.o && game.o.menu) { game.o.menu.items = []; game.o.menu.quit = false; }   // (no Quit row either: the round ends by the hub)
      hubEvent('card', (c) => { H.card = c; });
      hubEvent('start', () => { H.startedAt = game.time; });
      hubEvent('time-up', () => { DH.hubReport(game, 'time-up'); });
      hubEvent('end', (e) => { H.ended = true; H.endInfo = e; });
      hubEvent('message', (data, from) => { if (data && data.t === 'g') H.ghosts.set(from, Object.assign({ at: game.time }, data)); });
      hubEvent('leave', (e) => { H.ghosts.delete(e.id); });
      window.AIHub.connect({ mode: 'ghost', seats: [2, 4], card: true }).then((info) => {
        if (!info) return game.go('title', null, { fade: 0 });
        H.info = info;
        game.go('hubCard', null, { fade: 0 });
      });
    },
    update() {}, draw(r) { r.overlay(g => E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffffff', { align: 'center', scale: 1 })); }
  };
  S.hubCard = {
    enter() {
      const seat = H.info.me, lane = DH.SEAT_LANE[seat] || 'A';
      H.lane = lane; H.seat = seat;
      // the round: the Parallel Run, on this seat's lane, a run of its own
      H.stage = 'PR';
      H.ready = false;
      this.t0 = game.time;
    },
    update() {
      const I = game.input;
      if (!H.ready) { H.ready = true; window.AIHub.ready(); }
      if (I.pressed('confirm')) window.AIHub.answer('ready');
      if (I.pressed('cancel') || I.pressed('view')) window.AIHub.answer('more');
      if (H.startedAt !== null && window.AIHub.time() >= 0) { return game.go('drive', { stage: 'PR', hub: true }, { fade: 'wipe' }); }
    },
    draw(r) {
      const c = H.card || {}, info = H.info || { players: [] };
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .94 });
        E.font.title(g, 'DENSHA DE HALO!', r.W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6c8', '#f2c230', '#b8801a'] });
        E.font.text(g, 'PARALLEL RUN: FOUR DRIVERS, FOUR TRACKS, ONE TIMETABLE', r.W / 2, 44, '#e8e0ff', { align: 'center', scale: 1 });
        E.font.text(g, 'GOAL: STOP ON THE MARK, ON TIME. HIGHER SCORE WINS.', r.W / 2, 58, '#f2c230', { align: 'center', scale: 1 });
        (info.players || []).forEach((p, i) => {
          const y = 84 + i * 22, ready = (c.ready || []).includes(p.id);
          E.px.rect(g, 40, y, 14, 14, p.color || '#ffffff');
          E.font.text(g, p.name || ('P' + (i + 1)), 62, y + 3, '#ffffff', { scale: 2 });
          E.font.text(g, ready ? 'READY' : 'WAITING', r.W - 40, y + 4, ready ? '#7ad06a' : '#8a8698', { align: 'right', scale: 1 });
        });
        E.font.text(g, 'CONTROLS: ' + DH.controlsLine(game), r.W / 2, r.H - 52, '#c8c4dc', { align: 'center', scale: 1 });
        const left = c.left ? Math.ceil(c.left / 1000) : null;
        E.font.text(g, (c.starting ? 'STARTING' : (left !== null ? 'START IN ' + left + ' S' : 'WAITING FOR THE OTHERS')), r.W / 2, r.H - 36, '#ffffff', { align: 'center', scale: 1 });
        E.font.text(g, 'ENTER / CROSS: READY      TAB / TRIANGLE: MORE TIME', r.W / 2, r.H - 20, '#f2c230', { align: 'center', scale: 1 });
      });
    }
  };
  S.hubEnd = {
    enter() { this.t0 = game.time; },
    update() {},
    draw(r) {
      const info = H.info || { players: [] }, E2 = H.endInfo || {}, order = E2.standings || [];
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#0a0814'], border: '#4a4670', alpha: .94 });
        E.font.text(g, 'THE ROUND IS OVER', r.W / 2, 16, '#f2c230', { align: 'center', scale: 2 });
        (order.length ? order : info.players.map(p => p.id)).forEach((id, i) => {
          const p = (info.players || []).find(q => q.id === id) || { name: String(id) };
          E.font.text(g, (i + 1) + '.  ' + (p.name || String(id)), 40, 56 + i * 22, '#ffffff', { scale: 2 });
        });
        E.font.text(g, 'THE HUB SHOWS THE RESULTS.', r.W / 2, r.H - 20, '#c8c4dc', { align: 'center', scale: 1 });
      });
    }
  };
  return S;
};

/** the controls line for the card, from the bound keys (what this player will use) */
DH.controlsLine = (game) => {
  const I = game.input;
  return [I.label('power'), I.label('brake'), 'LEVER'].join(' ') + '   ' + I.label('call') + ' CALL   ' + I.label('horn') + ' HORN   ' + I.label('ats') + ' ATS';
};

/** report the round's result once: the time-up, or the finish (the score is the points, higher wins) */
DH.hubReport = (game, why) => {
  const H = DH.hub, S = DH.liveSim;
  if (!H.on || H.reported) return;
  H.reported = true;
  const score = S ? S.totals().total : 0;
  const stats = S ? { 'Perfect stops': S.stats.perfect, 'On time': S.stats.onTime, 'Calls great': S.stats.callsGreat } : {};
  try { window.AIHub.result({ score, stats }); } catch (e) { /* the hub's result refused: the round is over anyway */ }
};

/** the drive's hub hooks: play waits for the hub's clock, the state is sent to the other copies, the progress once a second */
DH.hubStep = (game, sim, dt) => {
  const H = DH.hub;
  if (!H.on) return true;
  if (window.AIHub.time() < 0) return false;   // the countdown: nothing moves
  H.sendAcc = (H.sendAcc || 0) + dt; H.progAcc = (H.progAcc || 0) + dt;
  if (H.sendAcc >= 0.1) { H.sendAcc = 0; const T = sim.train; window.AIHub.send({ t: 'g', s: Math.round(T.s * 10) / 10, v: Math.round(T.v * 10) / 10, n: T.notch, lane: H.lane, st: sim.stopIdx }, { reliable: false }); }
  if (H.progAcc >= 1) { H.progAcc = 0; const t = sim.totals(); window.AIHub.progress({ score: t.total, label: 'SCORE ' + t.total }); }
  return true;
};

/** the ghosts: each other player's last state, moved on by its speed since it was sent */
DH.ghostWraps = (route) => {
  const out = [], H = DH.hub;
  for (const [id, g] of H.ghosts) {
    if (id === (H.info && H.info.me)) continue;
    const dt = Math.max(0, Math.min(1, (game_now() - g.at)));
    const s = g.s + (g.v / 3.6) * dt;
    const lane = g.lane || DH.SEAT_LANE[id] || 'D';
    const player = (H.info.players || []).find(p => p.id === id) || {};
    const ghost = { s, dir: 1, cars: 6, lane, spec: DH.TRAINS.h8000, livery: player.color || '#c9ced6', stripe: '#ffffff', length: 120 };
    out.push(DH.trainWrap(route, ghost));
  }
  return out;
};
function game_now() { return DH.game ? DH.game.time : 0; }

})();
