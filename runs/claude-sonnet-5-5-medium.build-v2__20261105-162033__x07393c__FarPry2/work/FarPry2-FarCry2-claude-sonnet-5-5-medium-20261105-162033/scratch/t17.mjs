import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); console.log('title', game.mode);
e.step(601); console.log('after 601 frames', game.mode, JSON.stringify(game.state().attract), e.errors.slice(0,3));
for (let b = 0; b < 14; b++) { e.step(60 * 14); console.log(JSON.stringify(game.state().attract), game.mode, e.errors.slice(0,2)); }
e.input.setKey('KeyX', true); e.step(3); e.input.setKey('KeyX', false); console.log('after input', game.mode, game.state().screen, JSON.stringify(game.state().attract));
