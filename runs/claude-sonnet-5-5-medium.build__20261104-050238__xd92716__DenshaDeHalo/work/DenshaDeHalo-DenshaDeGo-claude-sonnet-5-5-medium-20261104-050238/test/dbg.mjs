import { load } from './lib.mjs';
const ctx = load(['00-core.js','10-route.js','20-sim.js']); const DH = ctx.DH;
const run = new DH.Run(DH.stageById(process.argv[2]||'S1'), {});
for (let i = 0; i < 60*700 && !run.failed; i++) { DH.autopilot(run); run.step(1/60, {horn: run.autoHorn}); if (i%180==0 && i/60>(+process.argv[3]||0)) { const n=run.nextSignals(1)[0]; console.log(i/60|0, run.phase, run.lever, (run.v*3.6).toFixed(0), run.s.toFixed(0), 'sig', n&&n.aspect, n&&n.dist.toFixed(0), 'lead', run.lead&&(run.lead.s-run.lead.len).toFixed(0), run.lead&&run.lead.phase, run.halo.toFixed(0), run.events.splice(0).slice(0,5).map(e=>e.kind+(e.why||'')).join(',')); } }
console.log(run.failed);
