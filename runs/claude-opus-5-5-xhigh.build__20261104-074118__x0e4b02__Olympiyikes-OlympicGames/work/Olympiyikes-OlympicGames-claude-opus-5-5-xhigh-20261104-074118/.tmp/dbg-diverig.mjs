import { boot } from '../tests/harness.mjs';
const h = boot({ hash: '#ev/diving/attract' }); const { O, game } = h;
game.advance(3.5);
const ctx = O.Run.ctx, s = ctx.s, a = s && s.a;
console.log('phase', ctx.phase, s && s.phase, 'z', s && s.z.toFixed(1), 'th', s && s.th.toFixed(2), 'pos', s && s.pos);
if (a) { const J = a.rig.J; console.log('head', J.head.map(v => v.toFixed(1)).join(','), 'footL', J.footL.map(v => v.toFixed(1)).join(','), 'hipC', J.hipC.map(v => v.toFixed(1)).join(','), 'pitch', a.rig.bodyPitch, 'pose', a.rig.poseName, 'poseW', a.rig._poseW); }
console.log(h.errors());
