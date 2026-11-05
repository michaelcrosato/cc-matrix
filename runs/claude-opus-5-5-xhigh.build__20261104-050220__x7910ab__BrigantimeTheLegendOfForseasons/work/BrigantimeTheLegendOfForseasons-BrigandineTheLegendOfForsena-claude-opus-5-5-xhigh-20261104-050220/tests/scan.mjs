// a helper (not a suite): node tests/scan.mjs realm seed1 seed2 ... [--boost n] — the scene-path campaign outcome per seed
import { boot } from './lib.mjs';
const args = process.argv.slice(2), bi = args.indexOf('--boost'), boost = bi >= 0 ? +args[bi + 1] : 1, realm = args[0], seeds = args.slice(1).filter((a, i) => !a.startsWith('--') && args[i] !== '--boost').map(Number).filter(n => n);
const mod = await import('./t-playthrough.mjs');
for (const seed of seeds) { const r = await mod.campaign(realm, seed, { boost }); console.log(realm, seed, JSON.stringify(r.sim.s.result), 'meridian_falls', r.seen.has('meridian_falls'), 'errors', r.errors.length); }
