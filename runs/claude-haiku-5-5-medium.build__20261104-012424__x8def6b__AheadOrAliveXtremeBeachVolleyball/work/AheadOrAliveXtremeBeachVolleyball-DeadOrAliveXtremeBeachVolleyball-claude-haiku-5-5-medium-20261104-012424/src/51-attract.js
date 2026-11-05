/* 51-attract: the arcade demo, on loop. After ten seconds idle on the title or the menu: an AI match, then the vacation montage,
 * then a title card, then a new match. The montage is the game itself: each beat runs a real scene (the island map, a talk on
 * the beach, a shop's try-on, a Pool Hop run, the casino slots, the photo mode, the final against The House), played by a bot
 * that only presses the scene's own buttons. Any press or a gamepad button leaves for the title. The demo runs on a throwaway
 * vacation; the player's own save is put back when it ends. */
G.MONTAGE = [
  { caption: 'FIVE DAYS IN PARADISE', secs: 8, scene: 'map', data: () => ({}),
    drive(bt, sc) { sc.list.i = Math.floor(bt * 1.1) % sc.list.items.length; G.state.slot = Math.min(2, Math.floor(bt / 2.7)); } },
  { caption: 'MAKE FRIENDS · GIVE GIFTS', secs: 8, scene: 'location', data: () => ({ place: 'beach' }),
    setup() { G.state.sched[0].lola = 'beach'; G.state.slot = 0; },
    drive(bt, sc) { if (bt > 1 && sc.mode === 'walk' && !sc._talked) { sc._talked = true; sc.openTalk('lola'); } if (bt > 3.5 && sc.mode === 'talk' && !sc._chat) { sc._chat = true; sc.doChat('lola'); } if (bt > 6 && sc.box && !sc.box.open && sc.mode === 'talk') sc.closeTalk(); } },
  { caption: 'COLLECT 21 SWIMSUITS', secs: 8, scene: 'shop', data: () => ({ shop: 'coral', back: 'map' }),
    drive(bt, sc) { if (!sc.grid || !sc.grid.items.length) return; const want = Math.floor(bt / .8) % sc.grid.items.length; if (sc.grid.i !== want) { sc.grid.i = want; sc.grid.page = Math.floor(want / sc.grid.per()); } } },
  { caption: 'POOL HOP', secs: 9, scene: 'poolhop', data: () => ({ from: 'map' }),
    drive(bt, sc) {
      if (sc.state === 'ready' && bt > .6) sc.start();
      if (sc.state === 'run' && sc.pads[sc.at] && sc._botAt !== sc.at && sc.t >= sc.nextBeat - .03) {
        sc._botAt = sc.at; const pad = sc.pads[sc.at];
        G.game.input.tap(pad.btn); if (pad.double) G.game.input.tap(pad.double[1]);
      }
    } },
  { caption: 'CASINO NIGHTS', secs: 9, scene: 'casino', data: () => ({ focus: 'slots', from: 'map' }),
    setup() { G.state.chips = 40; },
    drive(bt, sc) {
      const s = sc.slots; if (!s || sc.mode !== 'slots') return;
      if (!s.spinning && bt > 1 && (!sc._spinAt || bt - sc._spinAt > 3.2)) { sc._spinAt = bt; sc._stops = [false, false, false]; G.game.input.tap('confirm'); return; }
      if (s.spinning) { const stops = ['reel1', 'reel2', 'reel3'], at = [.9, 1.2, 1.5]; stops.forEach((a, i) => { if (!sc._stops[i] && s.t > at[i]) { sc._stops[i] = true; G.game.input.tap(a); } }); }
    } },
  { caption: 'SNAP POSTCARDS', secs: 7, scene: 'photo', data: () => ({ from: 'location', place: 'beach' }),
    drive(bt, sc) { const k = Math.floor(bt / 1.1); if (sc._k !== k) { sc._k = k; sc.pose = k % G.POSES.length; } if (bt > 5.5 && !sc._shot) { sc._shot = true; sc.take(); } } },
  { caption: 'BEAT THE HOUSE', secs: 16, scene: 'match', data: () => { const o = G.storyMatchOpts('final'); o.teams[0][0].human = null; o.attract = true; return { opts: o }; }, drive() {} }
];
/* the throwaway vacation of the demo, on one clock: the same seed each time it is made */
G.attractDemoState = function () {
  const st = G.newState({ me: 'rin', skipTutorial: true, seed: 4242 });
  st.flags.arrival = true; st.flags.welcome = true; st.chips = 20;
  return st;
};
G.attractOn = false;
G.att = null;
G.attractStep = function (dt) {
  const A = G.att; if (!A || !G.attractOn) return;
  A.t += dt;
  if (G.padPressed && G.padPressed()) return G.attractExit();
  if (A.phase !== 'beats' && G.game.input.anyPressed && G.game.input.anyPressed()) return G.attractExit();
  if (A.phase === 'match') {
    if (A.t > 45 || (A.M && (A.M.over || A.M.phase === 'over'))) { A.phase = 'beats'; A.beat = 0; A.bt = -1; A.saved = G.state; G.state = G.attractDemoState(); }
    return;
  }
  if (A.phase === 'beats') {
    const beat = G.MONTAGE[A.beat];
    if (!beat) { G.state = A.saved || null; A.phase = 'card'; A.t = 0; G.caption = null; return G.game.go('attract', { card: true }); }
    A.bt += dt;
    if (A.bt < 0) return;
    if (!A.started) { A.started = true; A.bt = 0; G.caption = beat.caption; if (beat.setup) beat.setup(); G.game.go(beat.scene, beat.data()); return; }
    if (G.curScene === beat.scene && G.game.scene && A.bt > .6) beat.drive(A.bt - .6, G.game.scene);
    if (A.bt > beat.secs) { A.beat++; A.started = false; A.bt = -1; }
    return;
  }
  if (A.phase === 'card') { if (A.t > 5) { G.caption = null; A.phase = 'match'; A.t = 0; G.game.go('attract', {}); } }
};
G.attractStart = function () { G.attractOn = true; G.att = { phase: 'match', t: 0 }; };
G.attractExit = function () {
  if (!G.attractOn) return;
  G.attractOn = false; G.caption = null;
  if (G.att && G.att.phase === 'beats' && G.att.saved !== undefined) G.state = G.att.saved;
  G.att = null;
  G.game.go('title', {});
};
G.padPressed = function () {
  try { const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons && p.buttons.some(b => b.pressed)) return true; } catch (e) { /* no gamepad API */ }
  return false;
};
G.drawCaption = function (r) {
  const W = r.W;
  r.overlay(g => { E.ui.box(g, 0, 14, W, 22, { bg: ['#0a0a14', '#14142a'], border: null, alpha: .75, gradient: true }); E.font.text(g, G.caption, W / 2, 20, '#ffd36a', { scale: 2, align: 'center', shadow: '#000' }); });
};
G.attractScene = {
  enter(data) {
    G.attractStart();
    if (data && data.card) { G.att.phase = 'card'; this.card = true; } else { this.card = false; this.startMatch(); }
    this.bg = new E.Backdrop('dusk');
    G.music(this.card ? 'title' : 'spike');
  },
  startMatch() {
    const ids = G.FIGHTERS.slice();
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(G.rng('cosmetic') * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const suits = G.SUIT_ORDER.slice(0, 6);
    const teams = [[{ id: ids[0], suit: suits[0], base: .66 }, { id: ids[1], suit: suits[1], base: .66 }], [{ id: ids[2], suit: suits[2], base: .66 }, { id: ids[3], suit: suits[3], base: .66 }]];
    this.M = G.createMatch({ teams, pointsToWin: 7, setsToWin: 1, difficulty: 'easy', court: ['day', 'sunset', 'night'][Math.floor(G.rng('cosmetic') * 3)], serveSide: 0, spectacle: true, attract: true, commentary: true });
    G.att.M = this.M;
    G.game.setView(G.courtView());
    G.game.follow(null);
  },
  update(dt) {
    if (this.card || !this.M || !G.att || G.att.phase !== 'match') return;
    const M = this.M;
    for (const p of M.players) p.skill = .95;
    M.step(dt);
    this.frame(M);
  },
  frame(M) {
    const pts = [];
    if (M.L) { const s = G.flightAt(M.L, M.t); pts.push({ x: s.x, y: s.y, z: Math.max(0, s.z) }); }
    for (const p of M.players) pts.push({ x: p.x, y: p.y, z: 0 });
    const C = G.C;
    pts.push({ x: C.X0 - 26, y: C.Y0 - 30, z: 0 }, { x: C.X1 + 26, y: C.Y1 + 30, z: 0 });
    G.game.cam.frame(pts, { margin: 16, zoom: [.6, 1] });
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.card || !G.att || G.att.phase === 'card') {
      this.bg.draw(r);
      r.overlay(g => { E.font.title(g, 'AHEAD OR ALIVE', W / 2, H * .3, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a'] }); E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, H * .5, '#fff8e8', { align: 'center', shadow: '#000' }); E.font.text(g, 'PRESS ANY BUTTON', W / 2, H * .66, '#9fd3d6', { align: 'center', shadow: '#000' }); });
    } else if (this.M) {
      this.bg.draw(r);
      G.courtMap().drawFloor(r); G.drawCourtSet(r, 'sunset'); G.drawNet(r);
      if (this.M.replay) this.M.drawReplay(r); else { this.M.drawPlayers(r); this.M.drawBall(r); this.M.hud(r); }
      r.overlay(g => E.font.text(g, 'DEMO', 6, H - 26, '#ffd36a', { shadow: '#000' }));
      if (G.touchOnly()) r.overlay(g => E.font.text(g, 'Controller or keyboard required', W / 2, 6, '#ffd36a', { align: 'center', shadow: '#000' }));
    }
    G.promptBar(r, [['confirm', 'Press any button']]);
  }
};
/* the attract mode's rigs for the card, built once per suit */
G.beatRig = function (id, opts) {
  G._beatRigs = G._beatRigs || {};
  const key = id + '|' + (opts && opts.suit || '') + '|' + (opts && (opts.acc || []).join(','));
  if (!G._beatRigs[key]) G._beatRigs[key] = G.rigFor(id, opts);
  return G._beatRigs[key];
};
