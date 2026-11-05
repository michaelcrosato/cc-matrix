// covers: src/modes/campaign.js, src/scenes/{title,menu,results,race}.js, src/save/profile.js, src/story/story.js
import { ctx } from '../../src/ctx.js';
import * as C from '../../src/modes/campaign.js';
import { migrate, fresh } from '../../src/save/profile.js';
export default async T => {
  const { game, api } = await T.game(); const I = game.input, P = ctx.profile;
  P.reset(); game.go('title'); api.until(() => game.sceneName === 'title', 2);
  T.check('only D1 and D2 open at start', C.trackOpen('D1') && C.trackOpen('D2') && !C.trackOpen('D3'));
  T.check('hedgerow closed at start', !C.envOpen('hedgerow') && !C.puzzlesOpen('dustbowl') && !C.survivalOpen('dustbowl'));
  // title -> welcome -> menu, all by keys
  api.until(() => game.sceneName === 'title' && game._fade === null, 2); api.tap('confirm');
  T.check('welcome beat speaks', api.until(() => ctx.talk.open, 2));
  for (let i = 0; i < 12 && ctx.talk.open; i++) { api.until(() => !ctx.talk.dlg.typing, 4); api.tap('confirm'); }
  T.check('welcome beat ends in the menu', api.until(() => game.sceneName === 'menu', 3), game.sceneName);
  T.check('the welcome beat is remembered', P.seen('welcome'));
  // RACE -> DUSTBOWL -> D1
  api.tap('confirm'); api.tap('confirm'); T.eq('on the track select', api.menu.stack.map(s => s.page).join('>'), 'main>env>tracks');
  api.tap('confirm'); T.check('the race starts', api.until(() => game.sceneName === 'race', 3));
  T.check('the bot finishes D1 as the player', api.driveToFinish(90));
  T.check('results follow', api.until(() => game.sceneName === 'results', 5), game.sceneName);
  T.check('D1 gold or better', P.medal('D1') >= 3, P.medal('D1')); T.eq('coppers paid once per tier', P.coppers, 300 + [0, 60, 150, 300, 600][P.medal('D1')]);
  T.check('D3 opens after a medal on D2? not yet', !C.trackOpen('D3'));
  // the first medal's beat comes on leaving the results
  game.advance(.5); api.tap('confirm'); api.until(() => game.sceneName === 'menu', 3);
  T.check('first medal beat', api.until(() => ctx.talk.open || P.seen('firstMedal'), 3) && P.seen('firstMedal'));
  ctx.talk.skip();
  // the unlock rules through the profile
  for (const [id, m] of [['D2', 2], ['D3', 1]]) P.finish(id, 'race', 99999, m, null, [], 'dustbowl');
  T.check('D3 then D4 open on medals', C.trackOpen('D3') && C.trackOpen('D4') && !C.trackOpen('D5'));
  T.check('puzzles open with a medal on the 2nd track', C.puzzlesOpen('dustbowl')); T.check('survival opens with the 3rd', C.survivalOpen('dustbowl'));
  T.check('hedgerow opens with 3 dustbowl medals', C.envOpen('hedgerow') && !C.envOpen('frostpeak'));
  const before = C.openState(); for (const id of ['R1', 'R2', 'R3']) P.finish(id, 'race', 99999, 3, null, [], 'hedgerow'); const after = C.openState();
  T.check('frostpeak opens with 3 hedgerow medals', C.envOpen('frostpeak'));
  T.check('the beats a result opens', C.beatsFor(before, after).some(b => b[0] === 'frostpeak'));
  // packs and patterns cost coppers
  const c0 = P.coppers; T.check('buy a pack', P.spend(250) && P.coppers === c0 - 250); T.check('not with too few coppers', !P.spend(1e9));
  // migrations: an old profile gains the new fields
  const old = { v: 0, name: 'OLD', coppers: 5, records: {} }, m = migrate(old, 0); T.check('profile migrates', m.v === 1 && Array.isArray(m.slots) && m.coppers === 5 && m.name === 'OLD');
  P.reset();
};
