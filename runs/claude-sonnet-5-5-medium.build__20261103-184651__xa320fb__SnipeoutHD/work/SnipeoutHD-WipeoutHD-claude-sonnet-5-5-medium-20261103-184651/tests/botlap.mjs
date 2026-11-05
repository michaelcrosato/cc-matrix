import { loadSim } from './lib/load.mjs';
const SN = loadSim();
for (const id of SN.TRACK_ORDER) {
  const tr = SN.getTrack(id);
  const ents = SN.makeEntrants({ seed: 3, count: 1, humans: [{ name: 'BOT', team: 'kestrel' }], ai: false });
  const r = new SN.Race({ track: tr, mode: 'time', cls: process.argv[2] || 'flare', laps: 2, seed: 5, entrants: ents, rules: { weapons: false } });
  const sh = r.ships[0]; sh.inputFn = s => SN.AI.controls(s, r, true);
  let walls = 0, air = 0, steps = 0; const t0 = Date.now();
  while (!r.over && steps < 120 * 400) { r.step(1 / 120); steps++; for (const e of r.events) { if (e.t === 'wall') walls++; if (e.t === 'air') air++; } }
  console.log(id, 'L=', tr.lengthM.toFixed(0), 'm minR=', tr.minRadius.toFixed(0), 'h', tr.heightRange.map(x => (x / 16).toFixed(0)).join('..'), 'laps', sh.lapTimes.map(t => SN.fmtTime(t)).join(' '), 'walls', walls, 'air', air, 'top', sh.stats.topKmh.toFixed(0), 'e', sh.energy.toFixed(0), 'ms', Date.now() - t0);
}
