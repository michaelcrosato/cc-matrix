import { compileClips, validateClip, HERO_RIG, buildModel } from './pixel-engine.js';
import { NEW_CLIPS } from './src/view/clips.js';
import { CATALOG } from './src/view/models/bodies.js';
const b = buildModel('bellwarden', { catalog: CATALOG });
const cl = compileClips(NEW_CLIPS, HERO_RIG, b.object);
console.log(cl.length, cl.map(c=>c.name+':'+c.duration.toFixed(2)).join(' '));
for (const c of NEW_CLIPS) { try { const r = validateClip(c, HERO_RIG); if (r && (r.problems?.length)) console.log(c.name, r.problems); } catch (e) { console.log('ERR', c.name, e.message); } }
