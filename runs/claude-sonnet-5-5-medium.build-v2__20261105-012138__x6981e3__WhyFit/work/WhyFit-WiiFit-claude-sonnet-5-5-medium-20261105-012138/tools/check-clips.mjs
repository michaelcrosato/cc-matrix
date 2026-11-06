import { Engine, HERO_RIG, HERO_MODEL, HERO_CLIPS, validateClip, analyzeClip, compileClips, gaitClip } from '../pixel-engine.js';
import { NEW_CLIPS, jogGait } from '../src/art/clips.js';
import { readFile } from 'node:fs/promises';
let model;
const game = { name: 't', async setup(ctx) { model = (await ctx.loadModel(HERO_MODEL)).scene; }, cameraTarget: () => ({ x: 0, y: 0, z: 0, set() { return this; } }) };
const assets = async (p) => new Uint8Array(await readFile(new URL('../' + p, import.meta.url))).buffer;
const eng = await Engine.headless(game, { assets });
const defs = [...NEW_CLIPS, jogGait(gaitClip)];
const clips = compileClips(defs, HERO_RIG, model);
let bad = 0;
defs.forEach((d, i) => {
  const v = validateClip(d, HERO_RIG); const a = analyzeClip(model, HERO_RIG, d, clips[i]);
  if (v.length || a.problems.length) { bad++; console.log(d.name, v, a.problems); }
  else if (process.argv[2] === '-w' && a.warnings.length) console.log(d.name, 'warn', a.warnings);
});
console.log(defs.length, 'clips,', bad, 'bad');
process.exit(0);
