// CRACKMANIA puzzles (PLAN §5.3, §6.4): start, checkpoints and finish are placed; a build zone; no-build cells (rocks,
// hedges, a pond, pines, a canyon); an inventory of blocks. Build a route, then drive it: faster routes earn better
// medals. The editor runs in puzzle mode (editor/editor.js) with these rules
import { Track, compile } from '../track/track.js';
import { TYPES } from '../track/blocks.js';
import { PUZZLES } from '../data/tracks.js';
const HD = { E: 0, S: 1, W: 2, N: 3 };
export function puzzleDef(id) { return PUZZLES.find(p => p.id === id) || null; }
/** the puzzle's track: the fixed blocks (and with solved, its reference solution) */
export function puzzleTrack(p, solved = false) {
  let t;
  if (solved) t = compile({ id: p.id, name: p.name, env: p.env, start: p.solution.start, program: p.solution.program, nobuild: p.nobuild });
  else { t = new Track({ id: p.id, name: p.name, env: p.env, nobuild: p.nobuild }); for (const [type, x, y, L, h] of p.fixed) t.place({ type, cx: x, cy: y, L, rot: HD[h], fixed: true }, { force: true }); }
  t.id = p.id; t.name = p.name;
  for (const b of t.blocks) if (p.fixed.some(([ty, x, y, L]) => ty === b.type && x === b.cx && y === b.cy && L === b.L)) b.fixed = true;
  if (p.canyon) { const [x0, x1, y0, y1] = p.canyon; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) t.chasms.set(x + ',' + y, 'canyon'); }
  t.puzzle = p;
  return t;
}
/** the rules the editor applies in a puzzle: the zone, the inventory left */
export class PuzzleRules {
  constructor(p, track) { this.p = p; this.track = track; }
  inZone(cx, cy, L) { const [x0, x1, y0, y1, l0, l1] = this.p.zone; return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 && L >= l0 && L <= l1; }
  used(type) { return this.track.blocks.filter(b => !b.fixed && b.type === type).length + this.track.blocks.filter(b => !b.fixed && TYPES[b.type].gap && false).length; }
  left(type) { const inv = this.p.inventory[type]; if (inv === undefined) return 0; return inv - this.used(type); }
  types() { return Object.keys(this.p.inventory); }
  /** can this placement go in (beyond the track's own checks)? null or why not */
  allow(pl) { if (this.left(pl.type) <= 0) return 'none left'; for (const [x, y, l] of this.track.cellsOf(pl)) if (!this.inZone(x, y, l) && TYPES[pl.type].cells.length) return 'outside the zone'; return null; }
}
export { PUZZLES };
