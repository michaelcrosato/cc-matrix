/* AMERICAN FOOTBALL FIASCO — practice drills (the tutorial) and the hook points the other modules share. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px } = E, game = FF.game, UI = FF.UI, { GL0, GL1, Y } = FF.FIELD;
const D = { i: 0, prog: 0, need: 1, done: false, t: 0 };
const START = {
  run: () => ({ poss: 0, los: GL0 + 400, by: 296 }), pass: () => ({ poss: 0, los: GL0 + 300 }), tackle: () => ({ poss: 1, los: GL1 - 450 }),
  cards: () => ({ poss: 0, los: GL0 + 400, meter: [100, 0], card: ['rocket', null] }), kick: () => ({ poss: 0, los: GL1 - 250 })
};
FF.startDrill = i => {
  const dr = FF.DRILLS[i]; FF.applyDifficulty && FF.applyDifficulty();
  game.go('match', { mode: 'drill', drill: i, autoCall: true, noClock: true, home: 'fiascos', away: 'devils', stadium: 'junction', humans: [true, false], quarters: 4, qlen: 999, start: START[dr.mode](), zoom: .6 });
};
const handlers = [];
FF.hooks = {
  enter(d, M) { for (const h of handlers) h.enter && h.enter(d, M); if (d.mode === 'drill') { D.i = d.drill; D.prog = 0; D.done = false; D.t = 0; D.need = FF.DRILLS[d.drill].mode === 'pass' ? 2 : 1; } },
  event(e, M) {
    for (const h of handlers) h.event && h.event(e, M);
    const S = FF.S; if (S.cfg.mode !== 'drill' || D.done) return; const m = FF.DRILLS[D.i].mode;
    if ((m === 'run' && e.type === 'td' && e.side === 0) || (m === 'pass' && e.type === 'catch' && M.P[e.id].side === 0) || (m === 'tackle' && (e.type === 'tackle' || e.type === 'bighit' || e.type === 'mega') && M.P[e.id].side === 0) || (m === 'cards' && e.type === 'card' && e.side === 0) || (m === 'kick' && e.type === 'fg-good')) {
      D.prog++; if (D.prog >= D.need) { D.done = true; D.t = 0; FF.sfx('fanfare'); FF.store.set('drill' + D.i, true); }
    }
  },
  tick(M, dt) {
    for (const h of handlers) h.tick && h.tick(M, dt);
    const S = FF.S; if (S.cfg.mode !== 'drill') return; const m = FF.DRILLS[D.i].mode;
    if (D.done) { D.t += dt; if (D.t > 3) game.go('title', { page: 'drills' }); return; }
    if (M.phase === 'call' && M.callStage === 0 && M.callTime < .05 && !D.reset) { D.reset = true; Object.assign(M, START[m]()); M.down = 1; M.fd = M.fdLine(); M.placeIdle(); }
    if (M.phase !== 'call') D.reset = false;
    if (M.phase === 'call' && M.callStage === 0 && M.callTime > .6) M.chooseOff(m === 'run' ? 'dive' : m === 'kick' ? 'fg' : m === 'cards' ? 'slants' : 'slants');
    if (M.phase === 'call' && M.callStage === 1 && M.callTime > .6) M.chooseDef('zone');
  },
  final(M) { for (const h of handlers) h.final && h.final(M); }
};
FF.addHooks = h => handlers.push(h);
FF.drillHud = (g, r, M) => {
  const dr = FF.DRILLS[D.i], W = r.W, m = dr.mode, L = UI.label;
  const text = m === 'run' ? 'Hold ' + L('turbo') + ' to sprint. ' + L('a') + ' juke, ' + L('b') + ' stiff-arm. Reach the end zone.' :
    m === 'pass' ? 'Drop back and throw: ' + L('a') + ', ' + L('b') + ' or ' + L('x') + ' to the receiver shown. Complete 2.' :
    m === 'tackle' ? 'You defend. Run down the carrier: ' + L('turbo') + ' into him for a BIG HIT, ' + L('a') + ' to dive. ' + L('b') + ' switches player.' :
    m === 'cards' ? 'The Fiasco Meter is full! Press ' + L('y') + ' to play your card during a play.' : 'Press ' + L('a') + ' to stop the power bar, again to stop the aim. Make the kick.';
  UI.box(g, 6, 44, 180, 56, { bg: ['#14122a', '#0a0818'], border: '#7ad8ff', alpha: .92 });
  UI.text(g, dr.title, 12, 48, '#7ad8ff');
  E.font.wrap(text, 168, {}).slice(0, 5).forEach((ln, i) => UI.text(g, ln, 12, 58 + i * 8, '#fff'));
  if (D.done) UI.big(g, 'DRILL COMPLETE!', W / 2, 90, 3, ['#ffffff', '#8aff8a', '#2aa84a', '#104010']);
  else UI.text(g, dr.goal + (D.need > 1 ? ' (' + D.prog + '/' + D.need + ')' : ''), 12, 90, '#ffe08a');
};
})();
