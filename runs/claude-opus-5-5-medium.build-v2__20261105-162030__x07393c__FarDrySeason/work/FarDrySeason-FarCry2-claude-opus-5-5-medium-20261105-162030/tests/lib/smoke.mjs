import { boot, fakeStorage } from './boot.mjs';
fakeStorage();
const t0 = Date.now();
const { e, game } = await boot();
console.log('boot', Date.now() - t0, 'ms', e.state().status);
e.step(60); console.log(JSON.stringify(game.state()).slice(0, 400));
console.log('errors', e.errors);
