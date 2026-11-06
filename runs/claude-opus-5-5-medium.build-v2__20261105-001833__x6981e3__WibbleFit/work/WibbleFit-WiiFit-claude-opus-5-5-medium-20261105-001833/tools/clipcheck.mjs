import { analyzeClip, compileClips, Engine, HERO_MODEL, HERO_RIG, validateClip, THREE } from '../pixel-engine.js';
import { GAME_CLIPS } from '../src/art/clips.js';
await Engine.headless({ name: 'c', async setup(ctx) {
  const m = await ctx.loadModel(HERO_MODEL);
  const compiled = compileClips(GAME_CLIPS, HERO_RIG, m.scene);
  GAME_CLIPS.forEach((def, i) => { const v = validateClip(def, HERO_RIG); const r = analyzeClip(m.scene, HERO_RIG, def, compiled[i]); if (v.length || r.problems.length) console.log(def.name, JSON.stringify(v), JSON.stringify(r.problems).slice(0, 300)); });
  console.log('checked', GAME_CLIPS.length);
}, cameraTarget() { return new THREE.Vector3(); } });
process.exit(0);
