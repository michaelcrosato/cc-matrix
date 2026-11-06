// Test 2: validateClip and analyzeClip are clean for every clip we wrote.
import { Engine, HERO_RIG, HERO_MODEL, validateClip, analyzeClip, compileClips, gaitClip } from '../../pixel-engine.js';
import { NEW_CLIPS, jogGait } from '../../src/art/clips.js';
import { readFile } from 'node:fs/promises';
export default async function (t) {
  let model; const game = { name: 'clips', async setup(ctx) { model = (await ctx.loadModel(HERO_MODEL)).scene; }, cameraTarget: () => ({ x: 0, y: 0, z: 0, set() { return this; } }) };
  const assets = async (p) => new Uint8Array(await readFile(new URL('../../' + p, import.meta.url))).buffer;
  await Engine.headless(game, { assets });
  const defs = [...NEW_CLIPS, jogGait(gaitClip)], clips = compileClips(defs, HERO_RIG, model);
  defs.forEach((d, i) => { const v = validateClip(d, HERO_RIG), a = analyzeClip(model, HERO_RIG, d, clips[i]); t.eq(v, [], `validateClip ${d.name}`); t.eq(a.problems, [], `analyzeClip ${d.name}`); });
  for (const n of ['Tree', 'Heron', 'Warrior', 'Chair', 'Fold', 'Plank', 'SquatRep', 'LungeRep', 'PressRep', 'StepL', 'StepR', 'Nod', 'Flail', 'Daze', 'Bow', 'SlowClap', 'Sneeze', 'Point', 'Tuck', 'Cannon', 'Paddle', 'Jog']) t.ok(defs.some((d) => d.name === n), `clip ${n} exists`);
}
