import { load } from '../lib/load.mjs';
export default function (t) {
  const { G } = load({});
  const R = new G.Rules({ pointsToWin: 7 });
  for (let i = 0; i < 6; i++) R.point(0); for (let i = 0; i < 6; i++) R.point(1);
  t.ok('no win at 7-6 path start', !R.over); R.point(0); t.ok('7-6 is not over (win by 2)', !R.over); R.point(1); R.point(0); R.point(0); t.ok('9-7 wins', R.over && R.winner === 0, R.score.join('-'));
  const R2 = new G.Rules({ pointsToWin: 7 }); for (let i = 0; i < 10; i++) { R2.point(0); R2.point(1); } R2.point(0); t.ok('the cap: first to 11 wins at 11-10', R2.over && R2.score[0] === 11, R2.score.join('-'));
  const R3 = new G.Rules({ pointsToWin: 5, sets: 3 }); for (let i = 0; i < 5; i++) R3.point(1); t.ok('a set, not the match, in best of 3', !R3.over && R3.setsWon[1] === 1); R3.nextSet(); for (let i = 0; i < 5; i++) R3.point(1); t.ok('two sets win best of 3', R3.over && R3.winner === 1);
  const ps = [{ side: 0, id: 0 }, { side: 0, id: 1 }, { side: 1, id: 2 }, { side: 1, id: 3 }], R4 = new G.Rules({});
  const s1 = R4.nextServer(0, ps), s2 = R4.nextServer(0, ps); t.ok('serve rotation alternates within a team', s1 !== s2 && s1.side === 0 && s2.side === 0);
  const R5 = new G.Rules({ pointsToWin: 7 }); for (let i = 0; i < 6; i++) R5.point(1); t.ok('the match point flag', R5.matchPoint() === 1);
  const r = R5.point(0); t.ok('a side-out', r.sideOut && R5.serveSide === 0);
}
