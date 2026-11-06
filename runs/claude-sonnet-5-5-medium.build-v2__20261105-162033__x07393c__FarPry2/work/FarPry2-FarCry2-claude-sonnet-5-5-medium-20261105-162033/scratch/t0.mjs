import { makeLand } from '../src/world/terrain.js';
const t=Date.now(); const l=makeLand(); let mn=1e9,mx=-1e9; for(const v of l.hts){if(v<mn)mn=v;if(v>mx)mx=v;} console.log('land ms',Date.now()-t, mn, mx);
