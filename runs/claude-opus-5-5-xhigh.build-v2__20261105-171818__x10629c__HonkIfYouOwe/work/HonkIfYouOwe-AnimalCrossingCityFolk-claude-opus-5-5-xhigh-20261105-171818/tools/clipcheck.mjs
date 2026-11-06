import { validateClip } from '../src/engine.js';
import { CLIPS } from '../src/actors/clips.js';
const RIG = { joints:['Pelvis','Torso','Head','ArmR','ArmL','LegR','LegL'], root:'Pelvis', mirror:{ArmR:'ArmL',ArmL:'ArmR',LegR:'LegL',LegL:'LegR'}, soles:[], trace:[], limits:{}, fps:30 };
let n=0; for (const c of CLIPS){ const p=validateClip(c,RIG); for(const x of p){n++;console.log(c.name,x);} } console.log(CLIPS.length,'clips',n,'problems');
