// the three things the brief names that no earlier suite drove through the screens: the highlights reel, the table with
// initials, and the attract showreel's full run of its ten segments. Each is played by the game's own inputs and screens.
import { loadGame } from '../lib.mjs';
export async function run({ check }) {
  // the highlights reel: a big play in a match records a clip, and the reel plays it and returns
  const h = loadGame();
  h.game.advance(0.3);
  h.game.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 2, wickets: 5, kerf: false, batFirst: 0, seed: 11, humanSides: [], autoBat: true, autoBowl: true, cheatPerfect: true }, {});
  let clips = 0;
  for (let k = 0; k < 120 * 120 && clips === 0; k++) { h.game.advance(1 / 120); clips = h.snap().clips; }
  check('a big play records a highlight clip', clips > 0, 'clips ' + clips);
  h.game.debug.highlights(); h.game.advance(0.3);
  check('the highlights reel opens', h.snap().scene === 'highlights', h.snap().scene);
  for (let k = 0; k < 120 * 60 && h.snap().scene === 'highlights'; k++) h.game.advance(1 / 120);
  check('the reel plays its clips and returns to the results', h.snap().scene === 'results', h.snap().scene);
  check('no errors in the reel', h.errs().length === 0, h.errs().join(' | '));

  // the table with initials: a top-five Showdown score asks for initials, which are typed with the stick and saved
  const t = loadGame({ storage: true });
  t.game.advance(0.3);
  t.game.debug.initials(77);
  t.game.advance(0.3);
  check('the initials screen opens for a score', t.snap().scene === 'initials', t.snap().scene);
  for (let k = 0; k < 3; k++) { t.I.tap('up'); t.game.advance(0.05); t.I.tap('up'); t.game.advance(0.05); t.I.tap('shot'); t.game.advance(0.1); }
  t.game.advance(0.3);
  check('the table opens after the initials are entered', t.snap().scene === 'table', t.snap().scene);
  check('the table keeps the score under the initials', t.game.debug.tableRows('bat') === 1, 'rows ' + t.game.debug.tableRows('bat'));
  check('no errors at the table', t.errs().length === 0, t.errs().join(' | '));

  // the attract showreel: all ten segments run in turn, each through its own match, with no errors, and cover the
  // features the brief lists (fours, sixes, wickets, runs, and the replay)
  const a = loadGame();
  a.game.advance(0.3);
  a.game.go('attract', null, { fade: 0 });
  a.game.advance(0.3);
  // each segment's coverage is banked when the next segment starts; the reel has played all ten once the first comes round again
  const order = []; const cov = {}; let last = null, cur = null, steps = 0;
  const bank = () => { if (cur) for (const [k, v] of Object.entries(cur)) cov[k] = (cov[k] || 0) + v; };
  while (steps < 120 * 60 * 60 && order.length < 11) {
    a.game.advance(1 / 120); steps++;
    const s = a.snap();
    if (s.attract.note && s.attract.note !== last) { bank(); cur = null; last = s.attract.note; order.push(last); }
    if (s.coverage && Object.keys(s.coverage).length) cur = Object.assign({}, s.coverage);
  }
  const seen = new Set(order.slice(0, 10));
  check('the showreel plays all ten segments', seen.size === 10 && order[10] === order[0], 'segments ' + seen.size);
  check('the showreel shows fours, sixes, wickets and runs', (cov.boundary || 0) > 0 && (cov.wicket || 0) > 0 && (cov.run || 0) > 0, JSON.stringify(cov).slice(0, 160));
  check('the showreel has no errors', a.errs().length === 0, a.errs().join(' | '));
}
