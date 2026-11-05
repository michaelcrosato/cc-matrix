import { load } from './lib.mjs';
const { game, G, ctx } = load();
const err = () => game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join('|')).join('\n');
try { game.advance(1); } catch (e) { console.log('ADV ERR', e.stack.split('\n').slice(0, 6).join('\n')); }
console.log('scene', game.sceneName, 'errors', game.errors.length); if (game.errors.length) console.log(err());
for (const sc of ['sides', 'setup', 'storymap', 'practice', 'records', 'about', 'attract', 'lab']) { try { game.go(sc, null, { fade: 0 }); game.advance(2); console.log(sc, game.sceneName, game.errors.length); } catch (e) { console.log(sc, 'ERR', e.stack.split('\n').slice(0, 5).join('\n')); } if (game.errors.length) { console.log(err()); game.errors.length = 0; } }
// story cutscene
for (const k of [1, 2, 5]) { game.go('cutscene', { id: k, kind: 'pre' }, { fade: 0 }); game.advance(1); for (let i = 0; i < 40; i++) { game.input.tap('confirm'); game.advance(.5); } console.log('cut', k, game.sceneName, game.errors.length); if (game.errors.length) { console.log(err()); game.errors.length = 0; } }
// match scene
game.go('match', { cfg: { home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [{ side: 0, input: game.input, seat: 0 }], intros: true, periodLen: 20 }, kind: 'exh' }, { fade: 0 });
game.advance(6); console.log('match', game.sceneName, JSON.stringify(game.debug.snapshot()).slice(0, 300));
game.input.hold('right'); game.advance(3); game.input.hold('right', false); game.input.tap('shoot'); game.advance(1);
for (let i = 0; i < 40; i++) { game.advance(5); if (game.sceneName !== 'match') break; }
console.log('end scene', game.sceneName, 'errors', game.errors.length); if (game.errors.length) console.log(err());
