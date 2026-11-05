import { load } from '../tests/lib/load.mjs';
import { writeSync } from 'node:fs';
const log = (...a) => writeSync(1, a.join(' ') + '\n');
const { B } = load();
B.reseed(1);
const play = new B.Play({ players: [new B.Player(0, null)] });
const site = play.startSite('big-mo');
for (let n = 0; n < 298; n++) play.update(1/120);
const co = site.co, oldStep = co.step.bind(co);
co.step = (dt, t) => { log('co in', t.toFixed(3), JSON.stringify(co.wait), co.until); oldStep(dt, t); log('co out'); };
const a = site.herd.list[0], os = a.step.bind(a);
a.step = (dt, s) => { log('a in', a.orders.map(o => o[0])); os(dt, s); log('a out'); };
for (let n = 0; n < 6; n++) { log('step', n); play.update(1/120); }
