import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); console.log('mode', game.mode, game.state().screen, e.errors);
e.step(30); console.log('title cam', JSON.stringify(game.camState.override?.position?.map(v=>+v.toFixed(0))));
e.input.setKey('Enter', true); e.step(2); e.input.setKey('Enter', false); e.step(2); console.log('after enter', game.state().screen, e.errors);
game.ui.focus = 0; e.input.setKey('Enter', true); e.step(2); e.input.setKey('Enter', false); e.step(5);
console.log('mode after new game', game.mode, game.state().screen, e.errors.slice(0,2));
