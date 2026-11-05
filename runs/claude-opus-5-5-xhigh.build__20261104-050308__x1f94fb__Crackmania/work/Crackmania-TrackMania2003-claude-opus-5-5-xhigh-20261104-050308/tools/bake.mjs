// node tools/bake.mjs: the author times (the bot at skill 1) of every track and puzzle solution -> src/data/medals.js
import { writeFileSync } from 'node:fs';
import { E } from './node-env.mjs';
await E.World3D.init(null, { render: false });
const { TRACKS, PUZZLES } = await import('../src/data/tracks.js');
const { compile } = await import('../src/track/track.js');
const { botRun } = await import('../src/race/medals.js');
const { puzzleTrack } = await import('../src/modes/puzzle.js');
const out = {};
for (const d of TRACKS) { const r = botRun(compile(d)); out[d.id] = r ? r.steps : null; if (!r) console.log('FAIL bake', d.id); }
for (const p of PUZZLES) { const r = botRun(puzzleTrack(p, true)); out[p.id] = r ? r.steps : null; if (!r) console.log('FAIL bake', p.id); }
writeFileSync(new URL('../src/data/medals.js', import.meta.url), '// baked by tools/bake.mjs: author times in steps (1/120 s)\nexport const MEDALS = ' + JSON.stringify(out, null, 0).replace(/,/g, ', ') + ';\n');
console.log('baked', Object.keys(out).length);
