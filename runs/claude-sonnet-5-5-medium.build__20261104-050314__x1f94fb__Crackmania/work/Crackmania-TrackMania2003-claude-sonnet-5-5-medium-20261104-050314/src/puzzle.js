import { BLOCKS, parse } from './data.js';
/** a puzzle course: pre + the blocks chosen for the slots + post. choices: array of block letters ('' = empty) */
export function puzzleCourse(p, choices) {
  const toks = [p.pre]; for (const c of choices) if (c) toks.push(BLOCKS[c].tok);
  toks.push(p.post);
  return { id: p.id, env: p.env, name: p.name, start: p.start, width: 8, segs: parse(toks.join(' ')) };
}
/** does the chosen set reach the finish? the post piece must end where the reference solution's does (within 1.5 m) */
export function puzzleSolved(p, choices, compile) {
  if (choices.filter(Boolean).length !== p.slots) return false;
  const a = compile(puzzleCourse(p, choices)), b = compile(puzzleCourse(p, p.solution.split(' '))), la = a.line[a.line.length - 1], lb = b.line[b.line.length - 1];
  const dx = la.x - lb.x, dy = la.y - lb.y, dz = la.z - lb.z, da = Math.abs(Math.atan2(Math.sin(la.angle - lb.angle), Math.cos(la.angle - lb.angle)));
  return Math.hypot(dx, dy) < 24 && Math.abs(dz) < 20 && da < .1;
}
