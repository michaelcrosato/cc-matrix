import { initRapier, PhysWorld } from '../src/physics/world.js';
import { Balancer } from '../src/physics/balancer.js';
await initRapier();
const pw = new PhysWorld(); pw.ground(10, 0.5, 10);
const b = new Balancer(pw, {});
b.setWish(1, 0); let peak = 0, at1 = 0;
for (let i = 0; i < 480; i++) { b.prestep(1 / 120); pw.step(); peak = Math.max(peak, b.leanX); if (i == 119) at1 = b.leanX; }
console.log('lean@1s', (at1 * 57.3).toFixed(1), 'peak', (peak * 57.3).toFixed(1), 'final', (b.leanX * 57.3).toFixed(1), 'z', (b.leanZ * 57.3).toFixed(2));
b.setWish(0, 1); for (let i = 0; i < 480; i++) { b.prestep(1 / 120); pw.step(); }
console.log('z final', (b.leanZ * 57.3).toFixed(1), 'x', (b.leanX * 57.3).toFixed(1));
