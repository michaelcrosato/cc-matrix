import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
for (const id of SN.TRACK_ORDER) {
  const t0 = Date.now(); let T;
  try { T = SN.Track.build(SN.TRACKS[id], { validate: false }); } catch (e) { console.log(id, 'ERR', e.message); continue; }
  let err = ''; try { T.validate(); } catch (e) { err = e.message; }
  console.log(id, 'L', (T.L/16/1000).toFixed(3), 'N', T.N, 'ms', Date.now()-t0, 'over', JSON.stringify(T.overpasses.map(o=>[Math.round(o.sLow/16), Math.round(o.sHigh/16), o.clearance.toFixed(1)])), 'overlap', T.overlapping.length,
    'laps', SN.CLASS_ORDER.map(c=>T.idealLap(c).toFixed(1)).join('/'), 'minR', (1/Math.max(...T.kappa.map(Math.abs))/16).toFixed(0), err);
}
