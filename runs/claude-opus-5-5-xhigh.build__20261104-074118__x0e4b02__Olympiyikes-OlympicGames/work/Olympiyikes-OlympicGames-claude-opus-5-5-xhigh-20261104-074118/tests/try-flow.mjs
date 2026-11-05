import { boot } from './harness.mjs';
const h = boot(); const { O, game } = h;
const log = [];
let last = '';
const step = (s = .1) => { game.advance(s); const n = game.sceneName; if (n !== last) { log.push(n); last = n; } };
for (let i = 0; i < 10; i++) step();
const tapC = () => { h.tap('confirm'); step(.05); };
// title -> menu
tapC(); for (let i = 0; i < 10; i++) step();
// menu: down to single (items: continue hidden, games, single)
h.tap('down'); step(.05); tapC(); for (let i = 0; i < 6; i++) step();
// single: pick sprint (first tile)
tapC(); for (let i = 0; i < 6; i++) step();
// nations: lock SUN
tapC(); for (let i = 0; i < 15; i++) step();
// event card: start
tapC(); for (let i = 0; i < 10; i++) step();
O.autoAll = true;
for (let i = 0; i < 400 && !game.sceneName.startsWith('results'); i++) step(.1);
O.autoAll = false;
for (let i = 0; i < 12; i++) step();
tapC(); for (let i = 0; i < 30; i++) step();
tapC(); for (let i = 0; i < 30; i++) step();
console.log(log.join(' > '));
console.log('errors', h.errors());
console.log(JSON.stringify(h.snap()).slice(0, 300));
