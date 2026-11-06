import { freePlay } from '../tests/lib/boot.mjs';
import { PersonView } from '../src/actors/rig.js';
const { g } = await freePlay();
const v = new PersonView('civ0', g.ctx); g.ctx.scene.add(v.object);
const bad = (v2) => { v2.object.updateMatrixWorld(true); let n = 0; v2.object.traverse((m) => { if (m.isMesh && isNaN(m.matrixWorld.elements[12])) n++; }); return n; };
for (const name of ['Idle', 'Walk', 'Run', 'Sit', 'Sleep', 'Death', 'AimIdle', 'Shrug', 'SmokeIdle', 'BurnPanic', 'WoundedSit', 'WriteAtDesk', 'TeachPoint', 'CleanRifleIdle', 'Beg', 'DriveSit']) { const w = new PersonView('civ0', g.ctx); g.ctx.scene.add(w.object); w.full(name, true); w.update(0.2); w.update(0.2); console.log(name, bad(w)); }
