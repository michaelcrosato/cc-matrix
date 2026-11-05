import { load } from '../lib.mjs';
export async function run(check) {
  const { K } = load(), R = K.Rules;
  const mk = (o = {}) => { const i = R.newInnings('ker', 'mud', Object.assign({ overs: 2, wickets: 5, order: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, o)); i.striker = 'a'; i.nonStriker = 'b'; return i; };
  const ball = (i, r = {}) => R.applyBall(i, Object.assign({ bowler: 'x', striker: i.striker, nonStriker: i.nonStriker, runs: 0, ran: 0, boundary: 0, extras: {}, wicket: null, bonus: 0 }, r));
  let i = mk(); ball(i, { extras: { wd: 1 } }); ball(i, { extras: { nb: 1 } });
  check('wides and no-balls add 1 and are not legal balls', i.runs === 2 && i.balls === 0, [i.runs, i.balls]);
  check('a free hit follows a no-ball', i.freeHit === true);
  ball(i, { wicket: { how: 'bowled', batter: i.striker } }); check('on a free hit only a run out dismisses', i.wkts === 0 && !i.freeHit, i.wkts);
  i = mk(); ball(i, { runs: 1, ran: 1 }); check('one run run swaps the strike', i.striker === 'b');
  ball(i, { runs: 2, ran: 2 }); check('two runs keep the strike', i.striker === 'b');
  ball(i, { runs: 3, ran: 3 }); check('three runs swap the strike', i.striker === 'a');
  ball(i, { runs: 4, boundary: 4 }); check('a boundary keeps the strike', i.striker === 'a');
  ball(i); ball(i); check('the strike swaps at the end of the over', i.balls === 6 && i.striker === 'b', [i.balls, i.striker]);
  i = mk({ overs: 1 }); for (let k = 0; k < 6; k++) ball(i); check('the innings ends at its overs', i.done && i.end === 'overs');
  i = mk({ wickets: 2 }); ball(i, { wicket: { how: 'bowled', batter: 'a' } }); check('a new batter comes in at the dismissed end', i.striker === 'c' && i.nonStriker === 'b', [i.striker, i.nonStriker]);
  ball(i, { wicket: { how: 'caught', batter: 'c' } }); check('the innings ends at its wickets', i.done && i.end === 'allout');
  i = mk({ target: 10 }); ball(i, { runs: 6, boundary: 6 }); ball(i, { runs: 4, boundary: 4 }); check('a chase ends when the target is reached', i.done && i.end === 'target');
  const a = mk(), b = R.newInnings('mud', 'ker', { overs: 2, wickets: 5, order: ['a', 'b', 'c'] }); a.runs = 30; b.runs = 25; b.wkts = 2;
  const names = { ker: 'Kerfuffle CC', mud: 'Muddleford' };
  check('result text: won by runs', R.result(a, b, names).text === 'Kerfuffle CC won by 5 runs', R.result(a, b, names).text);
  b.runs = 31; b.balls = 10; check('result text: won by wickets with balls to spare', /won by 3 wickets \(2 balls to spare\)/.test(R.result(a, b, names).text), R.result(a, b, names).text);
  b.runs = 30; check('a tie', R.result(a, b, names).tie === true);
  b.target = 16; b.revised = { from: 31, to: 16 }; b.runs = 16; check('a revised target decides the match (the chase reached it)', R.result(a, b, names).winner === 'mud', R.result(a, b, names).text);
  b.runs = 12; check('short of a revised target: won by the runs short of par', /won by 3 runs \(Kerfuffle Method\)/.test(R.result(a, b, names).text), R.result(a, b, names).text);
  const s1 = mk(), s2 = R.newInnings('mud', 'ker', { overs: 1, wickets: 2, order: ['a', 'b', 'c'] }); s1.runs = 10; s2.runs = 10; s1.fours = 1; s2.sixes = 1; s2.fours = 1;
  check('a tied Super Over goes to the side with more boundaries', R.superResult(s1, s2, names).winner === 'mud');
  const km = R.kerfuffleMethod(30, 2, 2, 1, 0, 0); check('the Kerfuffle Method halves a target when half the overs go at the start', km.target === 16, km);
  const km2 = R.kerfuffleMethod(30, 2, 1, .5, 1, 20); check('the Kerfuffle Method mid-innings', km2.target === 24, km2);
  check('the Kerfuffle Method never sets a target below the score + 1', R.kerfuffleMethod(30, 2, 1, .1, 0, 29).target === 30);
  // max overs per bowler and scorecard totals from a bot match
  const m = new K.Match({ teams: ['ker', 'mud'], ground: 'green', overs: 3, wickets: 5, seed: 9 }); m.start(); let t = 0; while (m.phase !== 'done' && t < 900) { m.step(1 / 120); t += 1 / 120; }
  const inn = m.innings[0], sum = inn.recs.reduce((s, r) => s + r.total, 0);
  check('the scorecard total equals the sum of the ball records', sum === inn.runs, [sum, inn.runs]);
  const per = {}; for (const r of inn.recs) if (r.legal) per[r.bowler] = (per[r.bowler] || 0) + 1;
  check('no bowler bowls more than ceil(overs / 5) overs', Object.values(per).every(n => n <= 6), per);
}
