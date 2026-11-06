import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot({camera:{preset:'first'}});
console.log(e.camera.preset, e.camera.yaw, e.camera.pitch, Object.keys(e.camera).slice(0,12));
