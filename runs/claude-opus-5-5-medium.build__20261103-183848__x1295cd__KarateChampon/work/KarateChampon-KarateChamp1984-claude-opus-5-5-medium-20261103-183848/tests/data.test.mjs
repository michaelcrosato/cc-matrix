import { loadGame } from './lib/load.mjs';
export default async t => {
  const { KC, game } = loadGame();
  let ok = true; try { KC.validateData(); } catch (e) { ok = e.message; } t.check('validateData passes', ok === true, ok);
  for (const p in KC.MATRIX) for (const r in KC.MATRIX[p]) t.check('matrix ' + p + r + ' is a technique', !!KC.TECH[KC.MATRIX[p][r]]);
  t.check('15 scoring techniques', KC.SCORING.length === 15, KC.SCORING.length);
  for (const s of KC.DATA.stages) t.check('stage music ' + s.id, !!KC.SONGS[s.music]);
  for (const n of KC.DATA.ladder) if (n.stage) t.check('ladder stage ' + n.id, !!KC.STAGE[n.stage]);
  t.check('17 ladder nodes, 9 matches, 3 bonus, 3 lessons', KC.DATA.ladder.length === 17 && KC.DATA.ladder.filter(n => n.kind === 'match').length === 9 && KC.DATA.ladder.filter(n => n.kind === 'bonus').length === 3 && KC.DATA.ladder.filter(n => n.kind === 'practice').length === 3);
  t.check('ALL TECHNIQUES lesson has 21 drills', KC.DATA.lessons.ALL.drills.length === 21);
  t.check('no boot errors', !game.errors.length, game.errors.map(e => e.message));
};
