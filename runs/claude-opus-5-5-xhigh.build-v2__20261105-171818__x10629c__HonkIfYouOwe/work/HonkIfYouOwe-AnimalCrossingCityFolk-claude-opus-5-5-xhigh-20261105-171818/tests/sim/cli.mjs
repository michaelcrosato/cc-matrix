import { runSim } from './sim.mjs';
const { n, fails } = runSim();
for (const f of fails) console.log(f);
console.log(`sim: ${n} checks, ${fails.length} failures`);
process.exit(fails.length ? 1 : 0);
