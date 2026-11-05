import { load } from '../tests/lib/load.mjs';
let t = Date.now(); const { B } = load(); console.log('load', Date.now() - t);
t = Date.now(); B.loadWorld('hollow'); console.log('world', Date.now() - t);
B.reseed(1);
const p = new B.Player(0, null); p.bot = new B.Bot(p, { skill: 'average' });
const play = new B.Play({ players: [p] });
t = Date.now(); const site = play.startSite('hollow-1'); console.log('site', Date.now() - t);
for (let s = 0; s < 10; s++) { t = Date.now(); for (let i = 0; i < 120; i++) play.update(1/120); console.log('sec', s, Date.now() - t, 'ms', site.herd.list.length, p.site.shots); }
