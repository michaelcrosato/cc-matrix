import { buildModel } from '../pixel-engine.js';
import { vm } from '../src/art/guns.js';
for (const k of Object.keys(vm)) { const b = buildModel(vm[k]); const names = ['Weapon','Mag','Bolt','HandL','HandR','rust1','tape'].filter(n=>b.object.getObjectByName(n)); console.log(k, names.join(',')); }
