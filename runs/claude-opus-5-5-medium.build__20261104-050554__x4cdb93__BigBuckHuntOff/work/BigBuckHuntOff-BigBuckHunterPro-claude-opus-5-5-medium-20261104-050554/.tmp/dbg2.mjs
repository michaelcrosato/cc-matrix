import { load } from '../tests/lib/load.mjs';
import { writeSync } from 'node:fs';
const log = (...a) => writeSync(1, a.join(' ') + '\n');
const { B } = load();
log('loaded'); B.loadWorld('muskeg'); log('world');
B.reseed(1);
const p = new B.Player(0, null); if (!process.argv[2]) p.bot = new B.Bot(p, { skill: 'average' });
const play = new B.Play({ players: [p] });
const site = play.startSite('big-mo'); log('site');
for (let n = 0; n < 600; n++) { play.update(1/120); if (n % 60 === 0) log(n, site.t.toFixed(2)); }
