import { load } from '../tests/lib/load.mjs';
const { B } = load();
const t = Date.now(); B.loadWorld('hollow'); console.log('world', Date.now() - t);
