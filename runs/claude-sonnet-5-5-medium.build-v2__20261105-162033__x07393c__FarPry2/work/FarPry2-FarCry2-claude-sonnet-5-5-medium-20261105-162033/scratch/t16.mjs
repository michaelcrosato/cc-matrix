import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); game.flow.newGame(); game.device = 'kbm';
const M = () => game.state().mission;
for (let i = 0; i < 300 && M()?.step < 2; i++) e.step(10);
console.log('at', JSON.stringify(M()), game.train.s.toFixed(0));
e.input.setKey('KeyM', true); e.step(3); e.input.setKey('KeyM', false);
for (let i = 0; i < 300 && M()?.id === 'm0'; i++) e.step(10);
console.log('m0 done ->', JSON.stringify(M()), game.mode, 'pos', game.status(), 'errors', e.errors);
