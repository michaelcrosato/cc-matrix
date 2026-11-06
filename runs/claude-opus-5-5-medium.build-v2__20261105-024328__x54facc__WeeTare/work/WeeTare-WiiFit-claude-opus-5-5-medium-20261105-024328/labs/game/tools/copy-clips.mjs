/**
 * @file Copies the library clips Wee Tare plays, with their sources' rest
 * bodies, so sim-side code can import them statically. Written into labs/game/cast/clipdata/library.ts. Run once from the dev folder: node labs/game/tools/copy-clips.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WANT = {
  mesh2motion: ['Meditate', 'Pushup', 'Cheering_Two_Hands', 'Victory', 'Greeting'],
  quaternius: ['Jog_Fwd_Loop', 'Dance_Loop', 'Sitting_Idle_Loop'],
  style100_idle: ['Balance_Idle'],
  style100: ['Balance_Walk'],
  cmu: ['Wave_Hello', 'Stretch_Yawn', 'Jumping_Jacks_Loop'],
};
const sources = {};
const clips = {};
for (const [set, names] of Object.entries(WANT)) {
  const meta = JSON.parse(readFileSync(`data/anim/sets/${set}/_set.json`, 'utf8'));
  for (const name of names) {
    const clip = JSON.parse(readFileSync(`data/anim/sets/${set}/${name}.json`, 'utf8'));
    delete clip.clip;
    sources[clip.src] = meta.sources[clip.src];
    clips[name] = clip;
  }
}
const rest = JSON.parse(readFileSync('data/anim/sets/mesh2motion/_set.json', 'utf8')).sources.M2M_ANIMATED.rest;
const HEAD =
  "/**\n * @file The clips copied from the engine's library, with their sources' rest bodies, as text the sim parses. Written by\n * tools/copy-clips.mjs: sim-side code reads no files, and this typechecks where a JSON import does not.\n */\n";
writeFileSync(
  'labs/game/cast/clipdata/library.ts',
  `${HEAD}export const LIBRARY_TEXT = ${JSON.stringify(JSON.stringify({ sources, clips }))};\nexport const REST_TEXT = ${JSON.stringify(JSON.stringify(rest))};\n`,
);
