import { fresh } from './lib/helpers.mjs';
export default async t => {
  const { KC } = fresh();
  const errs = KC.validateData(); t.check('validateData passes', errs.length === 0, errs.join('; '));
  t.check('15 scoring techniques', KC.SCORING.length === 15, KC.SCORING.length);
  t.check('21 techniques in all', KC.TECH.length === 21, KC.TECH.length);
  t.check('10 fighters', KC.ROSTER.length === 10); t.check('11 stages', KC.STAGES.length === 11);
  t.check('ladder has 19 nodes', KC.LADDER.length === 19); t.check('lessons 7/6/8', KC.LESSONS.I.drills.length === 7 && KC.LESSONS.II.drills.length === 6 && KC.LESSONS.III.drills.length === 8);
  t.check('all-techniques lesson has 21 drills', KC.LESSONS.ALL.drills.length === 21);
  for (const id in KC.CALLS) t.check('call ' + id + ' has EN and JP', KC.CALLS[id].length === 2 && KC.CALLS[id].every(Boolean));
};
