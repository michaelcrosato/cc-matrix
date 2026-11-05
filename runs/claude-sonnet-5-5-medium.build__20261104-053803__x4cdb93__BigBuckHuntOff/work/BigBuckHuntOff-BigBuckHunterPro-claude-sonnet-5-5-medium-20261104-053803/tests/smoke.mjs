import { load } from './lib/load.mjs';
const { BB, game } = await load();
const err = () => game.errors.map(e => e.message + ' ' + (e.stack||'').split('\n').slice(0,4).join('|'));
game.advance(.05); console.log('adv ok', game.sceneName, err());
game.advance(1); console.log('after 1s', game.sceneName, err());
game.debug.goto('hollow1'); game.advance(.2); console.log(game.sceneName, BB.H.phase, err());
game.advance(4); console.log(BB.H.phase, JSON.stringify(game.debug.snapshot()).slice(0,400), err());
