import { checkModel, validateTexture } from '../pixel-engine.js';
import { MODEL_DEFS, MODELS } from '../src/art/models.js';
import { TEXTURE_DEFS } from '../src/art/textures.js';
for (const d of MODEL_DEFS) { const r = checkModel(d, { catalog: MODELS }); if (r.problems.length || r.warnings.length) console.log(d.id, 'P:', r.problems.map(x=>x.message??x).join(' | ').slice(0,300), 'W:', r.warnings.map(x=>x.message??x).join(' | ').slice(0,400)); }
for (const t of TEXTURE_DEFS) { const r = validateTexture(t); if (r.problems.length) console.log(t.id, r.problems); }
console.log('models', MODEL_DEFS.length);
