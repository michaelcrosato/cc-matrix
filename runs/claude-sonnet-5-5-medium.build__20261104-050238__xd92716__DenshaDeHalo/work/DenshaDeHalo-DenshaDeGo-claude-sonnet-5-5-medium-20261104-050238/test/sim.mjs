import { load } from './lib.mjs';
const ctx = load(['00-core.js','10-route.js','20-sim.js']); const DH = ctx.DH;
console.log('route', DH.route.length, DH.route.signals.length, 'signals');
for (const st of DH.STAGES) {
  const run = new DH.Run(st, {}); const dt = 1/60; let i = 0;
  for (; i < 60*900 && !run.finished && !run.failed; i++) { DH.autopilot(run); run.step(dt, { horn: run.autoHorn }); }
  const r = run.results.map(q => q.grade + ' ' + q.e.toFixed(1) + 'm ' + q.timeGrade + ' ' + q.late.toFixed(0) + 's ' + q.smooth).join(' | ');
  console.log(st.id, 'fin', run.finished, 'fail', run.failed, 't', run.t.toFixed(0), 'halo', run.halo.toFixed(0), 'score', Math.round(run.score), '\n   ', r);
}
