import { load } from './lib.mjs';
const ctx = load(['00-core.js','10-route.js','20-sim.js']); const DH = ctx.DH;
const run = new DH.Run(DH.stageById('S1'), {}); run.cal = true; run.depSched = 0;
for (let i = 0; i < 60*400 && !run.failed; i++) { DH.autopilot(run, { cheat: true }); run.step(1/60, {}); }
console.log(run.failed, run.t, run.calls, run.callsMissed);
