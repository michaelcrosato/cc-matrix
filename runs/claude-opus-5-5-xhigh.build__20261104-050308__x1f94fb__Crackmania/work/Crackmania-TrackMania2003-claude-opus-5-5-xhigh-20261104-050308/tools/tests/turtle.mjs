// covers: src/track/track.js, src/data/tracks.js, src/modes/puzzle.js
import { TRACKS, PUZZLES } from '../../src/data/tracks.js';
import { compile } from '../../src/track/track.js';
import { TYPES } from '../../src/track/blocks.js';
import { puzzleTrack } from '../../src/modes/puzzle.js';
const CPS = { D1: 1, D2: 1, D3: 1, D4: 2, D5: 3, R1: 1, R2: 2, R3: 1, R4: 2, R5: 3, S1: 1, S2: 2, S3: 2, S4: 1, S5: 3 };
export default T => {
  for (const d of TRACKS) {
    const t = compile(d);
    T.check(d.id + ' compiles', !t.errors.length, t.errors.join('; '));
    T.eq(d.id + ' checkpoints', t.cps.length, CPS[d.id]);
    const R = t.route(); T.check(d.id + ' route reaches the finish', R.ok, R.why);
    for (const k of t.blocks.filter(b => TYPES[b.type].kicker)) T.check(d.id + ' kicker lands', !!t.jumpFrom(k));
    T.check(d.id + ' env tokens', t.blocks.every(b => !TYPES[b.type].envs || TYPES[b.type].envs.includes(d.env)), t.blocks.filter(b => TYPES[b.type].envs && !TYPES[b.type].envs.includes(d.env)).map(b => b.type).join(','));
  }
  T.check('D2 canyons', compile(TRACKS[1]).chasms.size === 4);
  T.check('D5 big crack', compile(TRACKS.find(t => t.id === 'D5')).chasms.size === 3);
  T.check('R2 stream is water', [...compile(TRACKS.find(t => t.id === 'R2')).chasms.values()].every(v => v === 'water'));
  for (const p of PUZZLES) {
    const sol = puzzleTrack(p, true), base = puzzleTrack(p, false);
    T.check(p.id + ' solution compiles', !sol.errors.length, (sol.errors || []).join('; '));
    T.check(p.id + ' solution route', sol.route().ok, sol.route().why);
    const key = b => b.type + b.cx + ',' + b.cy + ',' + b.L + ',' + b.rot;
    T.eq(p.id + ' fixed = solution ST/CP/FN', base.blocks.map(key).sort(), sol.blocks.filter(b => ['ST', 'CP', 'FN'].includes(b.type)).map(key).sort());
    const need = {}; for (const b of sol.blocks) if (!['ST', 'CP', 'FN'].includes(b.type) && !TYPES[b.type].gap) need[b.type] = (need[b.type] || 0) + 1;
    T.check(p.id + ' inventory covers the solution', Object.entries(need).every(([k, v]) => (p.inventory[k] || 0) >= v), JSON.stringify(need));
    const [x0, x1, y0, y1, l0, l1] = p.zone; T.check(p.id + ' solution inside the zone', sol.blocks.every(b => sol.cellsOf(b).every(([x, y, l]) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && l >= l0 && l <= l1)));
    T.check(p.id + ' solution avoids no-build cells', sol.blocks.every(b => sol.cellsOf(b).every(([x, y, l, k]) => k !== 'solid' || !(p.nobuild || []).some(([nx, ny]) => nx === x && ny === y) || l > 1)));
  }
};
