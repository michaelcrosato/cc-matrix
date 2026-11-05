import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx);
const E = ctx.My3D2dge; const rig = new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, hat: { style: 'helmet', color: '#e8b43a' } });
rig.update(.016, { x: 0, y: 0, z: 0, vx: 100, vy: 0, facing: 0 }); rig.update(.016, { x: 0, y: 0, z: 0, vx: 100, vy: 0, facing: 0 });
console.log(Object.keys(rig.J || {}).join(' ')); console.log(JSON.stringify(rig.J && rig.J.head), JSON.stringify(rig.J && rig.J.handR), Object.keys(rig).join(' ').slice(0, 600));
console.log(typeof rig.worldOffset, typeof E.move, typeof E.charView);
