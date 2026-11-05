import { load } from './lib/context.mjs';
const { FF, game, errors, warnings } = load({ hash: process.argv[2] || '' });
const S = FF.sim;
const step = s => game.advance(s);
const errs = () => game.errors.map(e => (e.message || e) + ' @ ' + String(e.stack || '').split('\n').slice(0, 4).join(' | '));
step(1); console.log('scene', game.sceneName, errs());
game.input.tap('start'); step(.5); console.log('scene', game.sceneName, errs());
step(11); console.log('after idle', game.sceneName, errs());
