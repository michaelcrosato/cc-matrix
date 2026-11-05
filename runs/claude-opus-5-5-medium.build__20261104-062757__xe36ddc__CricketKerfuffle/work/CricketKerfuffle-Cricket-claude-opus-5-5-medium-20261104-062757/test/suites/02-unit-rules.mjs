// 5.7: the laws, scoring, innings, results, the Super Over, the Kerfuffle Method
export default ({ boot, suite }) => {
  const s = suite(), { D } = boot();
  const mk = o => { const m = new D.Match(Object.assign({ teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, seed: 3, humans: [[], []], kerfuffle: false }, o)); m.setBowler(m.eligibleBowlers()[0].id); return m; };
  const rec = (m, o = {}) => Object.assign({ strikerCard: m.I.strikeCard, nonCard: m.I.nonCard, runs: 0, boundary: 0, wide: false, noBall: false, byes: false, legByes: false, wicket: null, bonus: 0, endsSwapped: false }, o);
  let m = mk();
  m.applyBall(rec(m, { wide: true })); s.ok('a wide adds one and is not a legal ball', m.I.runs === 1 && m.I.legal === 0);
  m.applyBall(rec(m, { noBall: true })); s.ok('a no-ball adds one, is not legal, and makes the next a free hit', m.I.runs === 2 && m.I.legal === 0 && m.I.freeHit);
  m.applyBall(rec(m)); s.ok('the free hit lasts one ball', !m.I.freeHit && m.I.legal === 1);
  const st = m.I.strikeCard; m.applyBall(rec(m, { runs: 1, endsSwapped: true })); s.ok('an odd number of runs rotates the strike', m.I.strikeCard !== st);
  const st2 = m.I.strikeCard; m.applyBall(rec(m, { runs: 2 })); s.ok('two runs keep the strike', m.I.strikeCard === st2);
  const st3 = m.I.strikeCard; m.applyBall(rec(m, { runs: 3, endsSwapped: true })); s.ok('three runs rotate the strike', m.I.strikeCard !== st3);
  const st4 = m.I.strikeCard, ev = m.applyBall(rec(m)); const ev2 = m.applyBall(rec(m));
  s.ok('six legal balls end the over, and the strike changes ends', m.I.legal === 6 && ev2.some(e => e[0] === 'over:end') && m.I.strikeCard !== st4, m.I.legal);
  s.ok('a maiden is not given for an over with runs', !ev2.some(e => e[0] === 'milestone'));
  m = mk(); const sum = []; for (let k = 0; k < 12; k++) { const r = rec(m, { runs: k % 3, endsSwapped: k % 3 === 1 }); sum.push(r.runs); m.applyBall(r); }
  s.ok('the overs limit ends the innings', m.inningsOver());
  s.ok('the scorecard total equals the sum of the ball records', m.I.runs === sum.reduce((a, b) => a + b, 0) && m.I.cards.reduce((a, c) => a + c.runs, 0) === m.I.runs);
  m = mk(); for (let k = 0; k < 5; k++) m.applyBall(rec(m, { wicket: { how: 'bowled', card: m.I.strikeCard, by: 'x' } }));
  s.ok('the wickets limit ends the innings', m.inningsOver() && m.I.wkts === 5);
  // a result by runs, by wickets, a tie and its Super Over, and the tie-break on boundaries
  m = mk(); m.I.runs = 20; m.I.legal = 12; m.nextInnings(); m.setBowler(m.eligibleBowlers()[0].id);
  s.ok('the second innings has a target of first-innings runs + 1', m.target() === 21);
  m.I.runs = 15; m.I.legal = 12; m.nextInnings(); s.ok('a win by runs reads "won by 5 runs"', m.result && /won by 5 runs/.test(m.result.text), m.result && m.result.text);
  m = mk(); m.I.runs = 20; m.I.legal = 12; m.nextInnings(); m.I.runs = 21; m.I.wkts = 2; m.I.legal = 9; m.nextInnings(); s.ok('a win by wickets reads "won by 3 wickets, 3 balls to spare"', m.result && /won by 3 wickets, 3 balls to spare/.test(m.result.text), m.result && m.result.text);
  m = mk(); m.I.runs = 20; m.I.legal = 12; m.nextInnings(); m.I.runs = 20; m.I.legal = 12; const r1 = m.nextInnings();
  s.ok('a tie goes to a Super Over: 1 over, 2 wickets', r1 === 'superover' && m.I.so && m.I.overs === 1 && m.I.wmax === 2);
  m.I.runs = 8; m.I.fours = 1; m.I.legal = 6; m.nextInnings(); s.ok('the Super Over second side chases its runs + 1', m.target() === 9);
  m.I.runs = 8; m.I.fours = 0; m.I.sixes = 0; m.I.legal = 6; m.nextInnings(); s.ok('tied again: more Super Over boundaries win', m.result && m.result.winner !== null && /boundaries/.test(m.result.text), m.result && m.result.text);
  // the Kerfuffle Method (fixed numbers): first innings 30; 2nd innings 12/2 after 1 over of 3; 1 over lost
  m = mk({ overs: 3 }); m.I.runs = 30; m.I.legal = 18; m.nextInnings(); m.setBowler(m.eligibleBowlers()[0].id); m.I.runs = 12; m.I.wkts = 2; m.I.legal = 6;
  const km = m.kerfuffleMethod(1);
  // R_before = (2/3)(0.86) = 0.5733; R_after = (1/3)(0.86) = 0.2867; used = 1/3 -> floor(30 * 0.62 / 0.9067) + 1 = 21
  s.ok('the Kerfuffle Method (the plan\'s formula) revises 30 to 16 off 2 overs', km.target === 16 && km.overs === 2, km);
  m = mk({ overs: 2 }); s.ok('max overs per bowler: one each for a 2-over innings', m.maxOvers() === 1);
  const b1 = m.I.bowler; m.bowlCard(b1).overs = 1; m.I.lastBowler = b1; s.ok('a bowler at his limit is not eligible', !m.eligibleBowlers().some(p => p.id === b1));
};
