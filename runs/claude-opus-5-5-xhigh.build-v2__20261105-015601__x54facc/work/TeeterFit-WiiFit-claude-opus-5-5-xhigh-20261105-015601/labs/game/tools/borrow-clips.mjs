/**
 * @file Copies the library clips the game reuses into one readable JSON, labs/game/cast/clipdata/borrowed.ts, with
 * each clip's source rest. Run once: `node labs/game/tools/borrow-clips.mjs`. All of them are CC0 (Mesh2Motion,
 * Quaternius); see the About screen's credits.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WANT = [
  ['mesh2motion', 'Meditate'],
  ['mesh2motion', 'Pushup'],
  ['mesh2motion', 'Cheering_Two_Hands'],
  ['mesh2motion', 'Victory'],
  ['mesh2motion', 'Greeting'],
  ['quaternius', 'Jog_Fwd_Loop'],
  ['quaternius', 'Dance_Loop'],
  ['quaternius', 'Sitting_Idle_Loop'],
];
const sources = {};
const clips = {};
for (const [set, name] of WANT) {
  const meta = JSON.parse(readFileSync(`data/anim/sets/${set}/_set.json`, 'utf8'));
  const clip = JSON.parse(readFileSync(`data/anim/sets/${set}/${name}.json`, 'utf8'));
  const source = meta.sources[clip.src];
  if (!source) throw new Error(`${set}/${name} has no source ${clip.src}`);
  sources[clip.src] = source;
  clips[name] = clip;
}
writeFileSync('out/borrowed.json', JSON.stringify({ sources, clips })); // then pasted into cast/clipdata/borrowed.ts as text
console.log(Object.keys(clips).length, 'clips', Object.keys(sources));
