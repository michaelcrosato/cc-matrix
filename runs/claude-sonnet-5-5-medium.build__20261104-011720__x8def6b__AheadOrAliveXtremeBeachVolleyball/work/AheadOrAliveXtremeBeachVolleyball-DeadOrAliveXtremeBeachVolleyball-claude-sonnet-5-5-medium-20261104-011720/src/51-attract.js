/* 51-attract: after 10 seconds without input on the title or menu, an AI-played broadcast loops until any input.
 * The AI cheats freely: all-CPU matches, a Pool Hop that never misses, a slot machine that plays itself. */
G.ATTRACT = [
  { cap: 'Two-on-two beach volleyball. One button, perfect timing.', scene: 'match', data: () => ({ attract: true, cfg: { teams: [['mika', 'hana'], ['ruby', 'tomo']], to: 3, skipIntro: true, fastPoints: true, skillBonus: [.3, .3], attract: true }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0, music: 'match' }) },
  { cap: 'Chat, gift and team up. Your partner plays better when you are close.', scene: 'location', data: () => ({ loc: 'courts', attract: true, time: 11 }) },
  { cap: 'Pool Hop: hop the lagoon on the beat.', scene: 'poolhop', data: () => ({ auto: true, attract: true, done: () => G.attractNext() }) },
  { cap: 'Shop the Promenade. Swimsuits, hats and gifts.', scene: 'location', data: () => ({ loc: 'promenade', attract: true, time: 10 }) },
  { cap: 'Casino Fortuna after dark: Fortuna Sevens, blackjack and roulette.', scene: 'casino', data: () => ({ game: 'slots', attract: true, back: 'casino', time: 12 }) },
  { cap: 'Serve Cam: the view from behind your team.', scene: 'match', data: () => ({ attract: true, camStart: 'servecam', cfg: { teams: [['gwen', 'you'], ['ines', 'sonny']], to: 3, skipIntro: true, fastPoints: true, skillBonus: [.3, .3], attract: true, house: true }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0, music: 'match' }) },
  { cap: 'Snap postcards. Befriend everyone. Win the Fortuna Cup.', scene: 'location', data: () => ({ loc: 'pool', attract: true, time: 9 }) }
];
G.attract = null;
G.startAttract = () => {
  if (G.attract) return; G.attractSaved = G.state; G.state = G.newState(31); G.state.partner = 'mika'; G.state.slot = 2; G.state.day = 3; G.reseedWorld();
  G.attract = { i: 0, t: 0, start: G.game.real, ptr: null }; G.sfx('confirm', { vol: .3 }); G.attractNext();
};
G.attractNext = () => {
  if (!G.attract) return; const seg = G.ATTRACT[G.attract.i % G.ATTRACT.length]; G.attract.i++; G.attract.cap = seg.cap; G.attract.t = 0;
  G.game.go(seg.scene, seg.data());
};
G.stopAttract = () => { if (!G.attract) return; G.attract = null; if (G.attractSaved !== undefined) { G.state = G.attractSaved; G.attractSaved = null; } G.idle.t = 0; G.locState = null; G.game.weather = null; G.game.go('title'); };
G.attractExitCheck = dt => {
  const A = G.attract, I = G.game.input; A.t += dt; A.age = (A.age || 0) + dt; if (A.age < .6) { A.ptr = null; return false; }
  const p = I.pointer(); let act = I.anyPressed() || !!I.clicked() || Math.hypot(...I.move()) > .4;
  if (p) { if (A.ptr && Math.abs(p[0] - A.ptr[0]) + Math.abs(p[1] - A.ptr[1]) > 6) act = true; A.ptr = [p[0], p[1]]; }
  if (act && !G.touchOnly) { G.stopAttract(); return true; }
  return false;
};
G.drawAttract = r => {
  const A = G.attract; if (!A) return; const W = r.W, H = r.H;
  r.overlay(g => {
    px.rect(g, 0, H - 24, W, 24, '#000000b0'); G.text(g, A.cap || '', W / 2, H - 20, '#fff6c8', { align: 'center' });
    if (Math.floor(G.game.real * 1.5) % 2 === 0) G.text(g, G.touchOnly ? 'Controller or keyboard required' : 'PRESS ANY BUTTON', W / 2, H - 10, '#ffd24a', { align: 'center' });
    E.font.title(g, G.TITLE, W - 6, 4, { align: 'right', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1, depthColor: '#5a1030' });
  });
};
