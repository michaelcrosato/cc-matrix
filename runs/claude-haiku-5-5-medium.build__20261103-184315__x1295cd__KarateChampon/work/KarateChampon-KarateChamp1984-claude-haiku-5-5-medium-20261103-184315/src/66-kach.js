// ---------------------------------------------------------------- local Kachinuki (9, 12.1): 2-4 seats on one machine, the winner stays on
// Seat 0 is the keyboard player; the other seats are CPU rivals. The queue rotates: the winner stays, the loser goes to the back.
// The first to 5 bout wins is the champion.
KC.makeKach = (game, S) => {
  // seat 0: the keyboard (WASD, IJKL); seat 1: the keyboard's second half (arrows, numpad); seats 2 and 3: gamepads 0 and 1
  const K = { prevA: {}, prevB: {}, isHuman: (seat) => seat <= 1 || KC.padConnected(seat - 2), seatIntent: (seat, dir, prev) => seat === 0 ? KC.readControl(KC.game.input, dir, prev) : seat === 1 ? KC.readKeys(KC.game, prev, dir) : (KC.padIntent(seat - 2, dir, prev) || { posture: 'n', tech: null }), seats: 2, queue: [], wins: [], ids: [], bout: null, a: null, b: null, rigs: {}, boutN: 0, over: false, popup: null, t: 0, champion: null };
  KC.kach = K;
  const boutStart = () => {
    if (K.queue.length < 2) return;
    const aSeat = K.queue[0], bSeat = K.queue[1];
    K.a = new KC.Karateka({ id: K.ids[aSeat], side: 'w' }); K.b = new KC.Karateka({ id: K.ids[bSeat], side: 'r' });
    K.aSeat = aSeat; K.bSeat = bSeat;
    const seed = 500 + K.boutN * 31;
    K.bout = new KC.Bout({ white: K.a, red: K.b, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
    K.boutN++;
    K.aiA = K.isHuman(aSeat) ? null : new KC.KarateAI(K.a, seed + 3, { level: KC.DATA.roster[K.ids[aSeat]].ai.level });
    K.aiB = K.isHuman(bSeat) ? null : new KC.KarateAI(K.b, seed + 5, { level: KC.DATA.roster[K.ids[bSeat]].ai.level });
    K.rigs = { w: KC.View.rigFor(K.ids[aSeat], 'w'), r: KC.View.rigFor(K.ids[bSeat], 'r') };
    K.bout.on('point', (p) => { K.popup = { t: 1.2, text: (p.full ? 'FULL' : 'HALF') + ' · ' + KC.DATA.techniques[p.tech].name + ' ' + p.pts, color: p.full ? '#ffe070' : '#ffffff' }; });
    K.bout.on('aiuchi', () => { K.popup = { t: 1, text: 'AIUCHI! NO POINT', color: '#ffffff' }; });
  };
  const boutEnd = () => {
    const side = K.bout.matchOver;
    const winSeat = side === 0 ? K.aSeat : K.bSeat, loseSeat = side === 0 ? K.bSeat : K.aSeat;
    K.wins[winSeat]++;
    K.queue = [winSeat].concat(K.queue.slice(2), [loseSeat]);
    K.bout = null;
    if (K.wins[winSeat] >= 5) { K.over = true; K.champion = winSeat; return; }
    K.nextAt = K.t + 2.5;
  };
  S.kach = {
    pausable: false,
    enter(data) {
      K.seats = data.seats || 2; K.ids = data.roster.slice(0, K.seats); K.stage = KC.DATA.stages[data.stage] || KC.DATA.stages.dojo;
      K.queue = K.ids.map((_, i) => i); K.wins = K.ids.map(() => 0); K.boutN = 0; K.over = false; K.t = 0; K.champion = null; K.nextAt = 0;
      K.prevA = {}; K.prevB = {};
      boutStart(); KC.A.music(game, K.stage.music);
    },
    update(d) {
      K.t += d; game.focus(200, 0, 30);
      if (K.over) { if (game.input.pressed('confirm')) return game.go('title'); return; }
      if (!K.bout) { if (K.t >= K.nextAt) boutStart(); return; }
      const dirA = K.a.x < K.b.x ? 1 : -1, dirB = -dirA;
      const iA = K.aiA ? K.aiA.intent(K.b, d) : K.seatIntent(K.aSeat, dirA, K.prevA);
      const iB = K.aiB ? K.aiB.intent(K.a, d) : K.seatIntent(K.bSeat, -dirA, K.prevB);
      K.bout.step(d, { a: () => iA, b: () => iB });
      KC.stepPoses({ w: K.a, r: K.b, rigs: K.rigs }, d);
      if (K.popup && K.popup.t > 0) K.popup.t -= d;
      if (K.bout.phase === 'matchEnd' && K.bout.phaseT > K.bout.phaseLen - 0.01) boutEnd();
    },
    draw(r) {
      KC.View.drawStage(r, K.stage, game.time);
      if (K.bout) {
        KC.View.drawFighters(r, [K.a, K.b], { w: K.rigs.w, r: K.rigs.r });
        KC.View.hud(r, K.bout, { popup: K.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, K.popup) : null });
      }
      r.overlay(g => {
        E.ui.box(g, 6, r.H - 30, r.W - 12, 24, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        const parts = K.queue.map(seat => (seat === 0 ? 'YOU' : 'CPU ' + KC.DATA.roster[K.ids[seat]].short) + ' ' + K.wins[seat]);
        E.font.text(g, 'KACHINUKI  ' + parts.join('  -  '), 12, r.H - 24, '#fff6d0', { outline: '#0b0814' });
        if (K.over) E.font.title(g, (K.champion === 0 ? 'YOU ARE CHAMP' : 'CPU ' + KC.DATA.roster[K.ids[K.champion]].short + ' WINS') + '!', r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        if (K.over) E.font.text(g, 'CROSS: TITLE', r.W / 2, r.H * 0.55, '#fff6d0', { align: 'center', outline: '#0b0814' });
      });
    }
  };
};
