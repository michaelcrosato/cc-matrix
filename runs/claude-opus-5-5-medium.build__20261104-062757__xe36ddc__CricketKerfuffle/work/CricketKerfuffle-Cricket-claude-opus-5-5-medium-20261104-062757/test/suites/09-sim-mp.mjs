// 5.16.5: local players join, sides and roles
export default ({ boot, suite, until }) => {
  const s = suite(), { D, game } = boot();
  const p2 = game.addPlayer({ keys: 'right' });
  s.ok('a second player joins on the keyboard\'s right half', !!p2 && game.players.length === 2);
  D.startMatch({ mode: 'versus', teams: ['ker', 'gen'], ground: 'green', overs: 1, wickets: 2, humans: [[game.input], [p2]], batFirst: 'ker', kerfuffle: false });
  until(game, () => D.match() && D.snapshot().scene === 'match', 3); const m = D.match(); m.cfg.noReplays = true;
  until(game, () => m.needBowler || m.state === 'setup', 10);
  s.ok('P2 captains the bowling side: the bowler picker waits for P2', !!m.needBowler);
  s.ok('P1 bats', m.ctlFor('bat') && m.ctlFor('bat').I === game.input);
  s.ok('P2 bowls', m.ctlFor('bowl') && m.ctlFor('bowl').I === p2);
  p2.tap('confirm'); game.advance(.1); until(game, () => m.state === 'setup', 5);
  s.ok("P2's confirm picks the bowler", m.state === 'setup' && !m.needBowler);
  p2.tap('shot'); game.advance(.05); s.ok("P2's shot button bowls", m.state === 'runup');
  s.ok("P2's prompts use P2's own keys", D.promptKind(p2, 'shot') !== D.promptKind(game.input, 'shot'), [D.promptKind(p2, 'shot'), D.promptKind(game.input, 'shot')]);
  // co-op: two humans on the batting side each run their own man
  const B2 = boot(); const q2 = B2.game.addPlayer({ keys: 'right' });
  B2.D.startMatch({ mode: 'versus', teams: ['ker', 'mud'], ground: 'green', overs: 1, wickets: 2, humans: [[B2.game.input, q2], []], batFirst: 'ker', kerfuffle: false });
  until(B2.game, () => B2.D.match() && B2.D.snapshot().scene === 'match', 3); const m2 = B2.D.match();
  s.ok('co-op: the non-striker is the second player', m2.ctlFor('runNon') && m2.ctlFor('runNon').I === q2);
  until(B2.game, () => m2.state === 'setup', 10); m2.forceNext('one'); until(B2.game, () => m2.state === 'inPlay', 8, 1 / 120);
  B2.game.advance(.1); B2.game.input.tap('run'); B2.game.advance(.4);
  s.ok('co-op: one call moves only the caller (a mix-up is possible)', m2.batters[0].target !== null && m2.batters[1].target === null, m2.batters.map(b => b.target));
  s.noErrors(game); s.noErrors(B2.game);
};
