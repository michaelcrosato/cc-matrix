// Quick model and texture sanity pass (no images), in Node.
import { checkModel, validateTexture } from '../src/engine.js';
import { OWN_MODELS, MODELS, ALL_TEXTURES } from '../src/art/models.js';
import { installTextures } from '../src/art/textures.js';
installTextures();
let problems = 0, warnings = 0;
const verbose = process.argv.includes('-v');
for (const d of OWN_MODELS) {
  try {
    const r = checkModel(d, { catalog: MODELS });
    for (const p of r.problems) { problems++; console.log('PROBLEM', d.id, p); }
    if (verbose) for (const w of r.warnings) { warnings++; console.log('warn', d.id, w); } else warnings += r.warnings.length;
  } catch (e) { problems++; console.log('THROW', d.id, e.message); }
}
for (const t of ALL_TEXTURES) {
  const r = validateTexture(t);
  for (const p of r.problems) { problems++; console.log('TEX PROBLEM', t.id, p); }
  if (verbose) for (const w of r.warnings) { warnings++; console.log('tex warn', t.id, w); }
}
console.log(`${OWN_MODELS.length} models, ${ALL_TEXTURES.length} textures: ${problems} problems, ${warnings} warnings`);
