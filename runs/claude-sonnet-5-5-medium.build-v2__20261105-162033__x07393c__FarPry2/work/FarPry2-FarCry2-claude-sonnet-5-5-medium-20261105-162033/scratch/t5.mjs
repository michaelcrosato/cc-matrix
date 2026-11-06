import { compileClips, validateClip, analyzeClip, HERO_RIG, buildModel, HERO_CLIPS } from '../pixel-engine.js';
import { PERSON_CLIPS } from '../src/art/clips.js';
import { CATALOG } from '../src/art/catalog.js';
const b = buildModel('soldier-concord-0-beret', { catalog: CATALOG });
const rig = { ...HERO_RIG, spine: undefined };
const clips = compileClips([...HERO_CLIPS.filter(c=>['Idle','Walk','Run','HitReact','Death','Crouch','Sit','Sleep'].includes(c.name)), ...PERSON_CLIPS], rig, b.object);
console.log(clips.length, clips.map(c=>c.name+':'+c.tracks.length).join(' ').slice(0,300));
for (const c of PERSON_CLIPS.slice(0,3)) { const v = validateClip(c, rig); console.log(c.name, JSON.stringify(v).slice(0,200)); }
console.log(clips[0].tracks.slice(0,6).map(t=>t.name).join(' '), clips[0].tracks.length);
