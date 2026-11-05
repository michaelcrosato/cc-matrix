import { load } from '../tests/lib/load.mjs';
const { game, KC } = load({ error: m => console.log('ERR', m) });
game.advance(1);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message));
for (const s of ['fight', 'bonus', 'practice', 'lab', 'versus', 'dojo', 'bonusMenu', 'records', 'about', 'attract', 'credits', 'road']) {
  try { if (s === 'road') KC.Story.newGame(); game.go(s, s === 'fight' ? KC.Versus.quickData('harbor', 'ebi') : s === 'bonus' ? { id: 'pots' } : s === 'practice' ? { lesson: 'lessonI' } : {}); game.advance(5); console.log(s, '->', game.sceneName, game.errors.length ? game.errors.map(e => e.message + ' ' + (e.stack||'').split('\n')[1]).join(' | ') : 'ok'); game.errors.length = 0; }
  catch (e) { console.log(s, 'THROW', e.stack.split('\n').slice(0,3).join(' / ')); }
}
