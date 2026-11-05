// playthrough: the whole story, scripted (autopilot routes, teleports and god mode): the Trial, Rice and Ash, Kiri Lake,
// Moon over Kokaku, then the results, the unlocks, the save; then Rice and Ash as Kaede, and the Night Delivery
import { runRoute } from './routes.mjs';
export default async function (t) {
  const { B, check, game } = t;
  t.step(.5);
  B.Save.data = B.Save.fresh('sojiro'); B.Save.get().story = true;
  for (const id of ['training', 'm1', 'm2', 'm3']) {
    const M = runRoute(t, id, { mode: 'story' });
    const objs = M.objectives.map(o => o.id + ':' + o.state).join(' ');
    check(id + ': the mission is won', M.ended && M.result === 'win', 'objectives ' + objs + ' flags ' + JSON.stringify(M.flags) + ' t ' + M.t.toFixed(1) + ' beat ' + B.Autopilot.i + ' ' + B.Autopilot.log.slice(-3).join('; ') + ' hero ' + Math.round(M.hero.x / 16) + ',' + Math.round(M.hero.y / 16) + ',' + Math.round(M.hero.z));
    t.step(2.5);
    check(id + ': the results are shown', game.sceneName === 'results', game.sceneName);
    const d = B.Save.get();
    check(id + ': the save records it', d.completed[id] && d.best[id] && d.best[id].sojiro, JSON.stringify(d.best[id]));
  }
  const d = B.Save.get();
  check('every story mission is completed in the save', ['training', 'm1', 'm2', 'm3'].every(id => d.completed[id]), JSON.stringify(d.completed));
  // the ending: from the last results, Continue plays the ending, the credits and the post-credits, then the title
  B.Flow.after({ mode: 'story', mid: 'm3', char: 'sojiro', M: B.M });
  for (let i = 0; i < 400 && game.sceneName !== 'credits'; i++) { t.step(.25); if (B.Cutscene.talk.open) B.Cutscene.clear(); }
  check('the ending leads to the credits', game.sceneName === 'credits', game.sceneName);
  t.hold('confirm'); for (let i = 0; i < 200 && game.sceneName === 'credits'; i++) t.step(.25); t.hold('confirm', false);
  for (let i = 0; i < 200 && game.sceneName !== 'title'; i++) { t.step(.25); if (B.Cutscene.talk.open) B.Cutscene.clear(); }
  check('the credits return to the title', game.sceneName === 'title', game.sceneName);
  const K = runRoute(t, 'm1', { mode: 'missions', char: 'kaede' });
  check('Rice and Ash as Kaede is won', K.ended && K.result === 'win', K.objectives.map(o => o.id + ':' + o.state).join(' '));
  const T = runRoute(t, 'delivery', { mode: 'trial' });
  check('the Night Delivery is won', T.ended && T.result === 'win', T.objectives.map(o => o.id + ':' + o.state).join(' '));
  t.step(2.5);
  check('the trial shows its board', game.sceneName === 'trialResults' && B.Save.trial().board.length >= 1, game.sceneName);
}
