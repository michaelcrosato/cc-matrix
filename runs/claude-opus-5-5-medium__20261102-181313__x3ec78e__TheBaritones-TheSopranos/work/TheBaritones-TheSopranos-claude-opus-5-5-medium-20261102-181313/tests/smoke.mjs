import { load } from './load.mjs';
const { game, I, D, snap } = load({ verbose: false });
game.advance(1); console.log(JSON.stringify(snap()));
game.go('play', { mode: 'collect' }); game.advance(2); console.log(JSON.stringify(snap()));
D.startChapter('ch1'); game.advance(2); console.log(JSON.stringify(snap()));
console.log(game.errors.map(e => e.where + ': ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')).join('\n---\n'));
