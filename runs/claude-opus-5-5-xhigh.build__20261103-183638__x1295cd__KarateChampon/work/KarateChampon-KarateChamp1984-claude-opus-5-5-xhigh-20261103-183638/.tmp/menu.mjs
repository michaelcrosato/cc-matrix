import { fresh, steps } from '../tests/lib/util.mjs';
const { KC, game } = fresh(), I = game.input;
I.tap('start'); steps(game, 10); const m = game.scene.menu; console.log('menuOn', game.scene.menuOn, 'i', m.i, 'items', m.items.map(i=>i.label).join());
I.tap('down'); steps(game, 1); console.log('after down i', m.i, game.scene.menu === m, 'pressed?', I.map.down);
I.tap('down'); game.advance(1/120); console.log('down pressed', I.pressed('down'), I.repeat('down'), m.i);
