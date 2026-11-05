import { boot } from './boot.mjs';
const B = boot({ quiet: true }); const OB = B.OB;
for (const [name, forks] of [['allL', ['L','L','L','L','L']], ['allR', ['R','R','R','R','R']], ['mix', ['L','R','L','R','L']]]) {
  const out = [];
  for (const seed of [1, 2, 3]) { const r = OB.runBot(null, seed, { forks, mode: 'arcade', limit: 120 * 2000 }); out.push(r.status + '/' + (r.goal || '-') + ' clock=' + r.clock + ' stages=' + r.routeIds.length + ' c=' + r.contacts + ' x=' + r.crashes); }
  console.log(name, out.join(' | '));
}
process.exit(0);
