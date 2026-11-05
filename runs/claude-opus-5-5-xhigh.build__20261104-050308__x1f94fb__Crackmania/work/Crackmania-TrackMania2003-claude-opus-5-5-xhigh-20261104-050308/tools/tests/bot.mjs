// covers: src/race/bot.js, src/race/medals.js, src/data/medals.js (and everything a drive touches)
import { E } from '../node-env.mjs';
import { compile } from '../../src/track/track.js';
import { TRACKS, PUZZLES } from '../../src/data/tracks.js';
import { botRun } from '../../src/race/medals.js';
import { MEDALS } from '../../src/data/medals.js';
import { puzzleTrack } from '../../src/modes/puzzle.js';
import { Course } from '../../src/race/course.js';
import { Plan } from '../../src/race/bot.js';
export default T => {
  for (const d of TRACKS) {
    const r = botRun(compile(d));
    if (!T.check(d.id + ' author bot finishes', !!r)) continue;
    T.eq(d.id + ' no respawns', r.respawns, 0);
    T.eq(d.id + ' matches the baked author time (node tools/bake.mjs)', r.steps, MEDALS[d.id], 1);
    const p = new Plan(new Course(compile(d), E.RAPIER), { dustbowl: 'coyote', hedgerow: 'pebble', frostpeak: 'moose' }[d.env], 1);
    for (const j of p.jumps) T.check(d.id + ' speed plan makes its jump', j.have >= j.need, (j.have * 3.6).toFixed(0) + ' < ' + (j.need * 3.6).toFixed(0) + ' km/h');
  }
  for (const p of PUZZLES) { const r = botRun(puzzleTrack(p, true)); T.check(p.id + ' solution validates', !!r); if (r) T.eq(p.id + ' matches its baked time', r.steps, MEDALS[p.id], 1); }
  const slow = botRun(compile(TRACKS[0]), { skill: .8 }); T.check('skill 0.8 is slower', slow && slow.steps > MEDALS.D1, slow && slow.steps);
};
