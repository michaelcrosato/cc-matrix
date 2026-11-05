import { G } from './sim.mjs';
const { createMatch, T } = G;
let events = {};
G.on('*', (t) => { events[t] = (events[t] || 0) + 1; });
function runMatch(seed, cfg) {
  G.RNG.play = G.mkrng(seed);
  const M = createMatch(Object.assign({ overs: 2, wickets: 3, diff: 1, cheat: false, chaos: 'all' }, cfg));
  M.start();
  let steps = 0;
  while (!M.over && steps < 120 * 600) { M.step(1 / 120, {}); steps++; }
  return { M, steps };
}
for (let s = 1; s <= 6; s++) {
  const { M, steps } = runMatch(s, {});
  console.log(s, JSON.stringify(M.snapshot().score), JSON.stringify(M.snapshot().wkts), M.snapshot().balls, M.result && M.result.margin, (steps / 120).toFixed(0) + 's', M.over);
}
console.log(events);
