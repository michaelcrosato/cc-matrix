import { load } from '../lib/load.mjs';
const L = load({}), { game } = L, X = game.debug.internals;
X.startHunt({ mode: 'single', hunt: 'hollow', seed: 3 }); L.step(.3); game.debug.skip(); L.step(.1); const H = X.G.hunt; H.skipTo('site', 'hollow-1'); L.step(.5);
const a = H.site.spawn('buck', { at: [0, 30], orders: [['hold']], hidden: false, points: 8 }); a.appear(); a.orders = [['hold']]; a.nextOrder(); a.heading = H.cam.yaw + Math.PI / 2; a.rig.facing = a.heading; for (let i = 0; i < 60; i++) a.update(1 / 120);
console.log(a.zones().map(z => z.id + ':' + z.kind + ':' + (z.r || 0).toFixed(1)).join(' '));
console.log(Object.entries(X.ZONES).map(([k, v]) => k + '=' + v.pri).join(' '));
const F = [Math.cos(a.rig.facing), Math.sin(a.rig.facing)], f = p => ((p[0] - a.rig.x) * F[0] + (p[1] - a.rig.y) * F[1]).toFixed(1) + '/' + (p[2] - a.rig.z).toFixed(1);
for (const z of a.zones()) if (['gut', 'ham'].includes(z.id)) console.log(z.id, z.kind, z.kind === 'capsule' ? f(z.a) + ' -> ' + f(z.b) : f(z.c || z.a), 'r', (z.r || 0).toFixed(1), z.rad ? z.rad.map(v => v.toFixed(1)).join(',') : '');
