import { loadGame } from './lib/load.mjs';
export default async t => {
  for (const [name, setup] of [['title', g => g.game.go('title', {}, { fade: 0 })], ['main menu', g => g.game.go('title', { menu: true }, { fade: 0 })], ['records (a sub-menu)', g => g.game.go('records', {}, { fade: 0 })]]) {
    const G = loadGame(); G.adv(.3); setup(G); G.adv(.2); G.KC.Attract.poke(); G.adv(9.8); const before = G.game.sceneName; G.adv(.5);
    t.check('10 s idle on the ' + name + ' starts the attract mode (9.8 s does not)', before !== 'fight' && G.KC.Attract.on, [before, G.game.sceneName]);
  }
  const G = loadGame(), { KC, game, I } = G; G.adv(.3); game.go('attract', { loop: 1 }, { fade: 0 }); G.adv(.2);
  const calls = new Set(); let steps = [];
  for (let k = 0; k < 220 * 4; k++) { G.adv(.25); const S = game.scene; if (game.sceneName === 'fight' && S.bout) S.bout.calls.forEach(c => calls.add(c)); if (KC.Attract.step && steps[steps.length - 1] !== KC.Attract.step) steps.push(KC.Attract.step); if (steps.includes('title') && KC.Attract.step === 'bout') break; }
  t.check('the loop visits bout, bonus, how-to, scores and title in order', JSON.stringify(steps.slice(0, 5)) === JSON.stringify(['bout', 'bonus', 'howto', 'scores', 'title']), steps);
  t.check('the exhibition shows a half point, a full point, an aiuchi and a hantei', ['half', 'full', 'aiuchi', 'judges'].every(c => calls.has(c)), [...calls]);
  t.check('the loop repeats', KC.Attract.on && KC.Attract.step === 'bout', KC.Attract.step);
  // any input exits: a key, a pad press, a mouse move
  G.adv(1); I.tap('confirm'); G.adv(1); t.check('a key exits to the title', !KC.Attract.on && game.sceneName === 'title', game.sceneName);
  game.go('attract', { loop: 2 }, { fade: 0 }); G.adv(2); I.feed('move', 50, 50); G.adv(.1); I.feed('move', 90, 60); G.adv(.3); t.check('a mouse move exits', !KC.Attract.on, game.sceneName);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
