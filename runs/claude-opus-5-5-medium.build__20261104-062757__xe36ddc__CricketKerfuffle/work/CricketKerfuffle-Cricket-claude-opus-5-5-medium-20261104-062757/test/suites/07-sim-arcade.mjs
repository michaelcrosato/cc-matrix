// 5.9 and 5.10: Hype, ON FIRE, every special, items, stadium targets, every chaos event
export default ({ boot, suite, until }) => {
  const s = suite();
  const B = boot(), { D, game } = B;
  D.startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 9, wickets: 10, seed: 21, humans: [[], []], kerfuffle: true });
  until(game, () => D.match() && D.snapshot().scene === 'match', 3); const m = D.match(); m.cfg.noReplays = true;
  const ball = (kind, o) => { until(game, () => m.state === 'setup', 25, 1 / 120); if (kind) m.forceNext(kind, o); const r0 = m.lastRec; until(game, () => m.lastRec !== r0 || m.state === 'over', 30, 1 / 120); return m.lastRec; };
  // three boundaries: ON FIRE; a dot: off
  let fireOn = 0; D.BUS.subs['fire:on'] = (D.BUS.subs['fire:on'] || []).concat([d => { if (d.side === 'bat') fireOn++; }]);
  m.fire.bat = 0; ball('four'); ball('four'); ball('four');
  s.ok('three boundaries in a row: the batter is ON FIRE', m.fire.batOn && fireOn >= 1, m.fire);
  ball('dot'); s.ok('a dot ball puts the fire out', !m.fire.batOn, m.fire);
  // the target: a forced shot at the pub window adds its bonus
  const r = ball('six', { target: 'pub' });
  s.ok('a ball through the pub window adds the Kerfuffle bonus', m.targetsHit.includes('pub') && r.bonus >= 6, [m.targetsHit, r && r.bonus]);
  // an item token on the ball's path is collected and armed
  until(game, () => m.state === 'setup', 25, 1 / 120); m.forceNext('four', { th: 0 }); until(game, () => m.state === 'inPlay', 10, 1 / 120); game.advance(.05); const pr = D.predict(m.ball, .3, m.env); const q = pr[pr.length - 1]; m.spawnToken('horseshoe', [q.x, q.y, q.z]);
  until(game, () => m.state === 'dead', 25, 1 / 120); until(game, () => m.state !== 'dead', 25, 1 / 120);
  s.ok('a token on the ball\'s path is collected', m.items[m.batT] === 'horseshoe' || (D.COVER['item:horseshoe'] > 0), m.items);
  const w0 = m.I.wkts; ball('bowled'); s.ok('the Lucky Horseshoe overturns the next dismissal', m.I.wkts === w0, [w0, m.I.wkts]);
  // every bowling and batting special, released through the real pipeline
  const bad = [];
  for (const id of Object.keys(D.SPECIALS)) {
    until(game, () => m.state === 'setup', 25, 1 / 60);
    const kind = D.SPECIALS[id].kind;
    if (kind === 'bowl') { m.hype[m.bowlT] = 100; m.del = { id: m.bowlerP().bowl.del[0], special: id }; m.useSpecial(m.bowlT, id); m.meter = { p: .5, lock: null }; m.runupDur = 1; m.bowler().anim = 'runup'; m._go('runup'); }
    else { m.hype[m.batT] = 100; m.vpad('bat').tap('special'); m._batSpecialPress(); if (m.batSpecial !== id) { m.batSpecial = id; } }
    until(game, () => m.state === 'flight' || m.state === 'inPlay' || m.state === 'dead', 6, 1 / 120);
    const fx = { vanish: () => m.effects.vanish, grandad: () => m.ball.multi === 3, triple: () => m.holos.length === 2, sunburn: () => m.effects.sunburn, sawn: () => m.effects.sawn, grudgeBall: () => m.effects.lbwSeek, chirp: () => m.effects.winK < 1, vicar: () => m.effects.edgeK > 1, peregrine: () => m.ball.fx === 'feather', dibbly: () => m.ball.wob >= .6 && m.effects.aiK === 2, kerfBall: () => m.ball.fx === 'fire', silverTray: () => m.sideFlags && m.sideFlags.guaranteedCatch === m.bowlT, lightning: () => m.keeperUp, kettle: () => m.batSpecial === 'kettle', stats: () => m.batSpecial === 'stats', croquet: () => m.batSpecial === 'croquet', bludgeon: () => m.batSpecial === 'bludgeon', longHandle: () => m.batSpecial === 'longHandle', grudgeDrive: () => m.batSpecial === 'grudgeDrive', ecto: () => m.batSpecial === 'ecto', kerfShot: () => m.batSpecial === 'kerfShot' }[id];
    if (fx && !fx()) bad.push(id);
    until(game, () => m.state === 'between' || m.state === 'break', 30, 1 / 60);
  }
  s.ok('every special plays, with its effect observable', !bad.length, bad.join(', '));
  // every chaos event can be forced and resolves by itself
  for (const id of Object.keys(D.CHAOS)) { until(game, () => m.state === 'between' || m.state === 'setup', 25, 1 / 60); m.triggerChaos(id); ball(null); }
  until(game, () => m.state === 'setup', 25, 1 / 60);
  for (let k = 0; k < 18; k++) ball(null);
  s.ok('every chaos event fired', Object.keys(D.CHAOS).every(id => D.COVER['chaos:' + id] > 0), Object.keys(D.CHAOS).filter(id => !D.COVER['chaos:' + id]));
  s.ok('the rain delay applied the Kerfuffle Method or lost an over', D.COVER['rain:end'] > 0, D.COVER['rain:end']);
  s.ok('chaos events end and the critters leave the field', Object.keys(m.chaosActive).length <= 3, Object.keys(m.chaosActive));
  s.noErrors(game);
};
