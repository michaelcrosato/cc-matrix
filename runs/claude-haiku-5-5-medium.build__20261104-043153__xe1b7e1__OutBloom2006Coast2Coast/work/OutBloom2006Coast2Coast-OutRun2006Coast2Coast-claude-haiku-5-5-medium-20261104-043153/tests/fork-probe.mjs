import { boot } from './boot.mjs';
const B = boot({ quiet: true }); const OB = B.OB;
const st = OB.World.stage('S1');
console.log('junction', st.junction, 'decideZ', st.decideZ, 'forkZ', st.forkZ, 'len', st.len);
process.exit(0);
