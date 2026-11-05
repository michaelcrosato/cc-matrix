import { load } from '../tests/lib/vm.mjs';
let readyN = 0; const handlers = {};
const api = { active: true, connect: () => Promise.resolve({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }, { id: 1, name: 'B', color: '#3b82f6' }], seed: 1 }), ready: () => { readyN++; }, answer: () => {}, time: () => -Infinity, on: (e, f) => { handlers[e] = f; }, progress() {}, result() {}, send() { return true; }, rng: () => Math.random };
const ctx = load({ hub: api }), SN = ctx.SN, g = ctx.My3D2dge.current;
g.advance(.1); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
const sc = SN.scenes.session; console.log('phase', sc.phase, 'S.view', !!(SN._hubS && SN._hubS.view), 'readyCalled', SN._hubS.readyCalled, 'scene', g.sceneName);
g.advance(.2); console.log('phase', sc.phase, 'readyN', readyN, g.errors.map(e => e.message));
