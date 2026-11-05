// node tools-dev/floorcheck.mjs [id ...]: validates floors and prints their counts (for authoring)
import { boot } from '../tests/lib.mjs';
import { buildGame } from '../build.mjs';
buildGame();
const t = boot(), { api } = t, ids = process.argv.slice(2).length ? process.argv.slice(2) : api.FLOOR_ORDER;
for (const id of ids) {
  const F = api.get('floors', id); if (!F) { console.log(id + ': not defined'); continue; }
  const v = api.validateFloor(F), p = v.parsed, cnt = l => { const o = {}; for (const x of l) o[x.type] = (o[x.type] || 0) + 1; return JSON.stringify(o); };
  console.log(id + ' ' + p.w + 'x' + p.h + (v.ok ? ' OK' : ' INVALID: ' + v.errors.join(' | ')));
  console.log('  monsters ' + cnt(p.monsters) + '  gens ' + cnt(p.gens) + '\n  items ' + cnt(p.items) + '  doors ' + p.doors.length + ' pads ' + p.pads.length + ' runes ' + p.runes.length + ' beams ' + p.beams.length + ' spikes ' + p.spikes.length + ' stairs ' + p.stairs.map(s => s.to || 'E').join(','));
}
