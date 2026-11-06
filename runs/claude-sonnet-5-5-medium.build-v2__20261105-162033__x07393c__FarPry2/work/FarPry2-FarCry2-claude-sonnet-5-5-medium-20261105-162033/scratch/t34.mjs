import { compileClips, HERO_RIG, buildModel } from '../pixel-engine.js';
import { PERSON_CLIPS } from '../src/art/clips.js';
import { CATALOG } from '../src/art/catalog.js';
const b = buildModel('civ0', { catalog: CATALOG });
const cl = compileClips(PERSON_CLIPS.slice(0, 1), { ...HERO_RIG, spine: undefined }, b.object)[0];
for (const t of cl.tracks.slice(0, 45)) { const v = Array.from(t.values); if (v.some(isNaN)) console.log('NaN in', t.name, v.slice(0, 8).join(',')); }
console.log(cl.tracks.map((t) => t.name).filter((n) => n.startsWith('Torso')).join(' '));
