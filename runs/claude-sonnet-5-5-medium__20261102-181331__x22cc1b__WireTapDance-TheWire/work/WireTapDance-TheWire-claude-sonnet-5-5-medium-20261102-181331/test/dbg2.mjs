import { load } from './harness.mjs';
const t = load(); const { game, I, dbg, snap } = t; const step = s => game.advance(s);
step(.4); I.tap('confirm'); step(.5);
dbg.startCase({ stage: 'listen' }); step(.4);
const [x, y] = dbg.spawn('van'); dbg.teleport(x, y + 4); step(.1); I.tap('interact'); step(.2);
console.log(snap().overlay);
step(40); console.log('done?', dbg.listen().done, dbg.listen().call, dbg.listen().phase, 'ui.screen', !!game.shell.screen);
for (let i = 0; i < 5; i++) { I.tap('interact'); step(.3); console.log(snap().overlay, snap().stage, dbg.listen() && dbg.listen().done); }
