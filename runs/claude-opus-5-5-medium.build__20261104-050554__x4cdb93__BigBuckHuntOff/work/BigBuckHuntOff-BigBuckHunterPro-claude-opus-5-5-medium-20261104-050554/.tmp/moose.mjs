import { load } from '../tests/lib/load.mjs';
const { B } = load();
B.reseed(1); const p = new B.Player(0, null), play = new B.Play({ players: [p] }), site = play.startSite('muskeg-1');
for (let k = 0; k < 120 * 12; k++) play.update(1 / 120);
const w = site.world; console.log('cam', site.lens.x.toFixed(0), site.lens.y.toFixed(0), site.lens.z.toFixed(2), 'water at cam', w.waterAt(site.lens.x, site.lens.y), 'ground', w.groundAt(site.lens.x, site.lens.y).toFixed(2));
for (const a of site.herd.list.filter(a => a.cat === 'animal')) { const h = B.aimPointOf(a, 'heart'); console.log(a.kind, a.x.toFixed(0), a.y.toFixed(0), 'z', a.z.toFixed(2), 'water', w.waterAt(a.x, a.y), 'heart z', h[2].toFixed(2), 'dist', Math.hypot(a.x - site.lens.x, a.y - site.lens.y).toFixed(0)); }
