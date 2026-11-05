// bake author times: node tools/bake.mjs  -> src/medals_baked.js
import { E } from './node-env.mjs';
import { writeFileSync } from 'node:fs';
globalThis.My3D2dge = E;
const { COURSES, COURSE_IDS, PUZZLES } = await import('../src/data.js');
const A = await import('../src/arena.js');
const { puzzleCourse } = await import('../src/puzzle.js');
const game = new E.Game({ headless: true, canvas: 'screen', res: 'ps1', expand: true, bg: null });
await E.World3D.init(game);
const out = {};
for (const id of COURSE_IDS) { const r = A.botRun(game, COURSES[id], { skill: 1 }); if (!r.finished) throw new Error(id + ' bot failed'); out[id] = r.steps; }
for (const p of PUZZLES) { const r = A.botRun(game, puzzleCourse(p, p.solution.split(' ')), { skill: 1 }); if (!r.finished) throw new Error(p.id + ' bot failed'); out[p.id] = r.steps; }
writeFileSync(new URL('../src/medals_baked.js', import.meta.url), 'export default ' + JSON.stringify(out) + ';\n');
console.log(JSON.stringify(out));
