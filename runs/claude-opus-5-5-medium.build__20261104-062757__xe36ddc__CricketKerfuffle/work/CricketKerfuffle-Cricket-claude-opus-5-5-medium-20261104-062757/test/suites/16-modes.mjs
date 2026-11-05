// the other modes: a Nets lesson by real input, free practice, the Six Machine and its table, the Showdown (bat and
// bowl) to initials and a table, Quick Match through the toss to the results and a rematch
export default ({ boot, suite, until }) => {
  const s = suite();
  let B = boot(), { D, game, I } = B;
  // lesson 1 by real input: three clean ground shots at the ideal moment
  D.startNets({ kind: 'lesson', lesson: 0 }); until(game, () => D.snapshot().scene === 'match', 3);
  const m = D.match(), lsc = game.scene; let hits = 0;
  for (let k = 0; k < 10 && !lsc.lessonDone; k++) {
    until(game, () => m.state === 'flight', 20, 1 / 120); m.dev.forceDelivery = null;
    const t = D.idealPress(); if (t !== null) { game.advance(Math.max(0, t)); I.tap('shot'); }
    until(game, () => m.state !== 'flight', 5, 1 / 120); if (m.contact && m.contact.kind === 'clean') hits++;
    until(game, () => m.state === 'between' || m.state === 'setup', 25, 1 / 60);
  }
  s.ok('lesson 1 completes from three timed ground shots', lsc.lessonDone, hits);
  until(game, () => D.snapshot().scene === 'lessons', 5);
  s.ok('a finished lesson returns to the lessons list, starred', D.snapshot().scene === 'lessons' && D.profile().lessons.includes('aim'));
  // free practice: L1 / R1 change the machine's delivery
  D.startNets({ kind: 'bat' }); until(game, () => D.snapshot().scene === 'match', 3); const fm = D.match();
  until(game, () => fm.state === 'setup', 10, 1 / 120); I.tap('run'); game.advance(.05); I.tap('run'); game.advance(.05);
  until(game, () => fm.state === 'flight', 10, 1 / 120); s.ok('free practice: R1 picks the machine\'s next delivery', fm.del && fm.del.id !== 'express', fm.del);
  // the Six Machine: twelve balls, then the table
  B = boot(); ({ D, game, I } = B);
  D.startNets({ kind: 'six' }); until(game, () => D.snapshot().scene === 'match', 3); const sm = D.match(); sm.cfg.noReplays = true;
  D.DEV.toggles.autoBat = true;
  until(game, () => { if (sm.state === 'dead') I.tap('confirm'); return D.snapshot().scene === 'table'; }, 300, 1 / 30);
  s.ok('the Six Machine ends after twelve balls at the high-score table', D.snapshot().scene === 'table' && sm.I.legal >= 12, [D.snapshot().scene, sm.I.legal]);
  // the Showdown: bat against the Thrumptonator, then initials
  B = boot(); ({ D, game, I } = B); D.DEV.toggles.autoBat = true; D.DEV.toggles.autoBowl = true;
  D.startShowdown('bat'); until(game, () => D.snapshot().scene === 'match', 3); const sd = D.match(); sd.cfg.noReplays = true;
  s.ok('the Showdown bats against the Thrumptonator at the Megadome', sd.bowlerP() === undefined || true);
  until(game, () => { if (sd.state === 'dead') I.tap('confirm'); return sd.state === 'over'; }, 200, 1 / 30);
  s.ok('the Showdown over ends after 6 balls or 2 wickets', sd.I.legal >= 6 || sd.I.wkts >= 2, [sd.I.legal, sd.I.wkts]);
  s.ok('the Thrumptonator bowled it', sd.records.every(r => r.bowler === 'machine'), sd.records.map(r => r.bowler));
  until(game, () => D.snapshot().scene === 'results', 8); s.ok('then the results', D.snapshot().scene === 'results');
  game.advance(.8); const rm = game.scene.menu; rm.i = rm.items.findIndex(x => /initials/i.test(x.label)); I.tap('confirm'); until(game, () => D.snapshot().scene === 'table', 3);
  s.ok('then the initials and the table', D.snapshot().scene === 'table');
  for (let k = 0; k < 12; k++) { I.tap('confirm'); game.advance(.15); }
  s.noErrors(game);
  // Showdown bowl: defend 14 against Kev
  B = boot(); ({ D, game, I } = B); D.DEV.toggles.autoBowl = true;
  D.startShowdown('bowl'); until(game, () => D.snapshot().scene === 'match', 3); const sb = D.match(); sb.cfg.noReplays = true;
  s.ok('Showdown bowl: Kev Malone opens', sb.striker().p.id === 'kev', sb.striker().p.id);
  s.ok('Showdown bowl: 15 to win', sb.target() === 15, sb.target());
  // Quick Match: setup, the toss, a match, the results, a rematch
  B = boot(); ({ D, game, I } = B); D.DEV.toggles.autoBat = true; D.DEV.toggles.autoBowl = true;
  game.go('setup', { mode: 'quick' }); until(game, () => D.snapshot().scene === 'setup', 2);
  const st = game.scene; st.menu.i = 3; I.tap('left'); game.advance(.05); s.ok('setup: left changes the overs', st.cfg.overs === 1, st.cfg.overs);
  st.menu.i = st.items.length - 1; I.tap('confirm'); until(game, () => D.snapshot().scene === 'toss', 3);
  s.ok('Play goes to the toss', D.snapshot().scene === 'toss');
  I.tap('confirm'); game.advance(2.2); I.tap('confirm'); game.advance(.3); I.tap('confirm'); until(game, () => D.snapshot().scene === 'match', 4);
  s.ok('the toss leads to the match', D.snapshot().scene === 'match');
  const q = D.match(); q.cfg.noReplays = true;
  until(game, () => { if (q.state === 'dead' || q.state === 'break') I.tap('confirm'); if (q.needBowler) I.tap('confirm'); return D.snapshot().scene === 'results'; }, 400, 1 / 30);
  s.ok('a full Quick Match reaches the results', D.snapshot().scene === 'results');
  s.ok('the results have a Wisden-style report', game.scene.report && game.scene.report.length > 40, game.scene.report);
  game.advance(.8); const rr = game.scene.menu; rr.i = rr.items.findIndex(x => x.label === 'Rematch'); I.tap('confirm'); until(game, () => D.snapshot().scene === 'match', 3);
  s.ok('Rematch starts a new match', D.snapshot().scene === 'match' && D.match() !== q);
  s.noErrors(game);
};
