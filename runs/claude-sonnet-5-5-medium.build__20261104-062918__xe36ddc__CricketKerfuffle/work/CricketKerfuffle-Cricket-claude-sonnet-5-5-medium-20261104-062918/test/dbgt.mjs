import { G } from './sim.mjs';
const got = {}; G.on('target', d => got[d.t.id] = d.t.pts);
for (const t of ['window', 'clock', 'urn', 'bell']) {
  const T = [{ window: -34, urn: 38, clock: 90, bell: 150 }][0][t];
  G.RNG.play = G.mkrng(3); const M = G.createMatch({ overs: 2, wickets: 3, chaos: 'none' }); M.start();
  let k = 0; while (M.ph !== 'flight' && k++ < 5000) M.step(1 / 120, {});
  const a = T * Math.PI / 180, b = M.ball; M.ph = 'inplay'; M.hit = { q: 1, tried: {} }; b.phase = 'live'; b.hitBy = 0; b.carried = true; b.bounces = 0; b.rolling = false;
  b.x = G.CX + G.bndRX() * Math.cos(a) * .9; b.y = G.MY + G.bndRY() * Math.sin(a) * .9; b.z = 60; b.vx = Math.cos(a) * 200; b.vy = Math.sin(a) * 200; b.vz = 10;
  M.batters.forEach(x => x.moving = false); k = 0; while (M.ph === 'inplay' && k++ < 2000) M.step(1 / 120, {});
}
console.log(JSON.stringify(got));
