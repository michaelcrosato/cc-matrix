// node tools/calibrate.mjs [stage ...]: runs the autopilot at minimum time ("par") over each stage with default tuning,
// leg by leg, and sets each arrival so par is 6-12 s early on Normal (par + 9 s, to the nearest 5 s), keeping each
// dwell's planned length; passes get par + 9 s too. Writes src/23-timetable.js (data) and prints the table.
import { writeFileSync } from 'node:fs';
import { load } from '../test/lib.mjs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['S1', 'S2', 'S3', 'S4', 'S5', 'PR'];
const { DH } = load();
const r5 = t => Math.round(t / 5) * 5, out = {};
for (const id of ids) {
  const S = DH.STAGES[id], orig = S.stops.map(p => Object.assign({}, p)), dwell = orig.map(p => p.arr && p.dep ? DH.parseClock(p.dep) - DH.parseClock(p.arr) : null);
  const tt = S.stops.map(p => Object.assign({}, p)), passes = (S.passes || []).map(p => Object.assign({}, p));
  for (let k = 1; k < tt.length; k++) {
    S.stops = tt.map(p => Object.assign({}, p)); S.passes = passes.map(p => Object.assign({}, p));
    const run = new DH.Run(id, { difficulty: 'normal' }), ap = new DH.Autopilot(run, { skill: 1, mode: 'mintime' });
    let par = null; const pclk = {};
    run.on('judge', J => { if (run.judgments.length === k) par = J.clock; });
    run.on('pass', d => { pclk[d.p.id] = run.clock; });
    const dt = 1 / 120; let t = 0;
    while (par === null && run.phase !== 'over' && t < 1500) { run.step(dt, ap.cmd(dt)); t += dt; }
    if (par === null) { console.log('FAIL ' + id + ' leg ' + k + ': no arrival (' + run.phase + ')'); process.exitCode = 1; break; }
    const arr = r5(par + 9); tt[k].arr = DH.clockStr(arr); if (dwell[k] !== null) tt[k].dep = DH.clockStr(arr + dwell[k]);
    for (const p of passes) if (pclk[p.id] !== undefined && !p.cal) { p.at = DH.clockStr(r5(pclk[p.id] + 9)); p.cal = true; }
    console.log(id + ' leg ' + k + ' par ' + DH.clockStr(par) + ' -> arr ' + tt[k].arr + (tt[k].dep ? ' dep ' + tt[k].dep : '') + '  (early by ' + (arr - par).toFixed(1) + ' s)');
  }
  out[id] = { stops: tt.map(p => { const o = { id: p.id }; if (p.arr) o.arr = p.arr; if (p.dep) o.dep = p.dep; return o; }), passes: passes.map(p => ({ id: p.id, at: p.at })) };
}
const src = `/* 23-timetable: calibrated timetables (node tools/calibrate.mjs writes this file): the autopilot at minimum time
 * arrives 6-12 s early on Normal, so a good driver can be on the second. Data; applied over 22-stages. */
(() => {
'use strict';
const DH = window.DH;
DH.TIMETABLE = ${JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ')};
for (const id in DH.TIMETABLE) { const S = DH.STAGES[id], T = DH.TIMETABLE[id]; if (!S) continue; S.stops = T.stops.map(p => Object.assign({}, p)); S.passes = T.passes.map(p => Object.assign({}, p)); }
})();
`;
if (!process.exitCode) { writeFileSync(new URL('../src/23-timetable.js', import.meta.url), src); console.log('wrote src/23-timetable.js'); }
