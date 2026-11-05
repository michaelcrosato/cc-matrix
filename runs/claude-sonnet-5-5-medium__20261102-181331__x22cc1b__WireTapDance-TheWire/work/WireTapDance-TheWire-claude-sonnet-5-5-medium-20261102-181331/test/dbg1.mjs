import { load } from './harness.mjs';
const t = load(); const { game, I, dbg, snap } = t;
const step = s => game.advance(s);
step(.4); I.tap('confirm'); step(.5);
dbg.startCase({ stage: 'report' }); step(.5);
console.log(JSON.stringify(snap()).slice(0,300));
const [x, y] = dbg.spawn('pruitt'); dbg.teleport(x + 8, y + 8); step(.1);
I.tap('interact'); step(.3); console.log('after interact', snap().talking, dbg.scriptBusy(), snap().overlay);
for (let i = 0; i < 20; i++) { I.tap('confirm'); step(.25); console.log(i, snap().talking, dbg.scriptBusy(), snap().overlay, snap().stage, snap().done); }
