// Track validator: builds every track and prints its numbers (§4.3, App. C)
import { load } from '../tests/lib/vm.mjs';
const ctx = load(), SN = ctx.SN;
for (const id of SN.TRACK_IDS) {
  const t0 = Date.now(), T = SN.Track.build(SN.TRACKS[id]), st = T.stats();
  console.log(id.padEnd(9), st.km.toFixed(3) + ' km', 'rmin ' + st.rmin.toFixed(0) + ' m @' + st.at.toFixed(0), 'slope ' + st.smin.toFixed(1) + '..' + st.smax.toFixed(1) + '%', 'over ' + st.overpasses.map(c => c.toFixed(1)).join(','), 'slices ' + st.slices, 'jumps ' + T.jumps.map(j => j.kind + ' ' + ((j.zLip - j.z1) / 16).toFixed(1) + 'm ' + ((j.b - j.a) / 16).toFixed(0) + 'm').join(' '), (Date.now() - t0) + ' ms',
    'lap est ' + ['spark', 'flare', 'storm', 'singularity'].map(c => { let t = 0; for (let i = 0; i < T.n; i++) t += T.ds / T.profiles[c][i]; return t.toFixed(1); }).join('/'));
}
