// smoke: every scene, every stage in both views, every bonus and lesson runs 5 simulated seconds with no errors
import { fresh, steps } from './lib/util.mjs';
export default async t => {
  const { KC, game } = fresh();
  const run = (label, fn) => { game.errors.length = 0; try { fn(); steps(game, 600); } catch (e) { t.check(label, false, e.stack.split('\n').slice(0, 2).join(' ')); return; } t.check(label, game.errors.length === 0, game.errors.map(e => e.message).join(' | ')); };
  for (const view of ['Arcade side', 'Tatami 2.5D']) { game.settings.set('camera', view); for (const s of KC.FIGHT_STAGES) run('fight on ' + s + ' (' + view + ')', () => game.go('fight', KC.Versus.quickData(s, 'ika'))); }
  game.settings.set('camera', 'Arcade side');
  for (const b of KC.DATA.bonus) run('bonus ' + b.id, () => game.go('bonus', { id: b.id }));
  for (const l of KC.DATA.lessons) run('practice ' + l.id, () => game.go('practice', { lesson: l.id }));
  for (const d of KC.DUMMY_MODES) run('free spar vs a ' + d + ' dummy', () => game.go('fight', KC.Versus.sparData(d)));
  for (const s of ['title', 'attract', 'versus', 'dojo', 'bonusMenu', 'records', 'about', 'movelist', 'credits', 'lab']) run('scene ' + s, () => game.go(s, s === 'lab' ? { tech: 'jumpBack' } : {}));
  for (const sc of Object.keys(KC.SCRIPTS)) run('cutscene ' + sc, () => game.go('cutscene', { script: sc, stage: 'harbor', cast: ['taro', 'mei'] }));
  run('vs card', () => { KC.Story.newGame(); KC.Story.node = 9; game.go('vscard', KC.Story.matchData()); });
  run('promotion', () => game.go('promotion', { from: 'white', to: 'yellow', next: () => {} }));
  run('continue', () => game.go('continue', { opponent: 'ebi' }));
  run('game over', () => game.go('gameover', {}));
  run('initials', () => game.go('initials', { mode: 'boards', score: 9999, next: () => {} }));
  run('local kachinuki', () => KC.LocalKachi.start(['taro', 'mei', 'ebi', 'ika']));
  run('the dev panel over a fight', () => { game.go('fight', KC.Versus.quickData('dojo', 'negi')); KC.Dev.open(); }); KC.Dev.close();
};
