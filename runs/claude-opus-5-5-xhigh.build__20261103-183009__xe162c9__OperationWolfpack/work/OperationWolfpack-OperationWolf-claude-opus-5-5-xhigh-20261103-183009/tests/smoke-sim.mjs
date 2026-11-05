import { load } from './lib.mjs';
const { WP } = load();
const sim = new WP.Sim({ stage: 'op1', seed: 7, players: [{ pid: 0 }], cheats: { god: true, ammo: true } });
let frame = { x: 240, y: 120, fire: false };
const dt = 1 / 120;
let kills = 0, t = 0;
for (let i = 0; i < 120 * 240 && sim.state !== 'clear'; i++) {
  // aim at the nearest hostile body
  const s = sim.shapes.find(s => ['infantry', 'vehicle', 'air', 'boss', 'proj', 'pickup'].includes(WP.TYPES[s.e.type].kind) && !s.cover);
  if (s) { const c = WP.Hit.center(s); frame = { x: c[0], y: c[1], fire: true }; } else frame = { x: frame.x, y: frame.y, fire: false };
  sim.step(dt, { 0: frame });
  for (const e of sim.drain()) { if (e.k === 'kill') kills++; if (e.k === 'warn') console.log('WARN', e.text); }
  t += dt;
}
console.log(JSON.stringify(sim.snapshot()).slice(0, 900));
console.log('kills', kills, 't', t.toFixed(1));
