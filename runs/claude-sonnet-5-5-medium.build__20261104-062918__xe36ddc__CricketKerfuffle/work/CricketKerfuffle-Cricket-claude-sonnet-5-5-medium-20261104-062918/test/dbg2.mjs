import { G } from './sim.mjs';
G.RNG.play = G.mkrng(5); const M = G.createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'none' }); M.start(); for (let i = 0; i < 480; i++) M.step(1/120, {});
console.log(M.ph, M.t, M.sideBat().hype, M.sideBat().fire);
M.sideBat().hype = 100; let k = 0; while (M.ph !== 'setup' && k++ < 2400) M.step(1/120, {});
console.log(M.ph, M.t, M.sideBat().hype, M.sideBat().fire, k);
M.step(1/120, { bat: { special: true, shot: null, aim: [0,1] } });
console.log(M.ph, M.sideBat().hype, M.sideBat().fire);
