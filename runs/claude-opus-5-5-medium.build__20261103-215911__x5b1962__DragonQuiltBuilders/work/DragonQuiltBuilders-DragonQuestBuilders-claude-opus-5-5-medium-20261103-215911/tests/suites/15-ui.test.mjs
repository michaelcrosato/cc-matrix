import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  // touch-only: the notice, no touch buttons, the attract still runs
  const T = await boot({ matchMedia: q => ({ matches: /coarse/.test(q) && !/any-pointer: fine/.test(q), addEventListener() {}, removeEventListener() {} }) });
  T.DQ._forceTouch = true; T.run(.5);
  check('touch-only devices see the controller-or-keyboard notice', T.DQ.touchOnly(T.game));
  T.run(10.5); check('the attract mode runs on touch-only devices', T.game.sceneName === 'attract');
  // the title menu: focus by keys, pick with confirm
  const G = await boot(), { game, DQ, run, errs } = G;
  run(.3); const menu = game.scene.menu; menu.focus = 1; game.input.tap('confirm'); run(.4);
  check('New Game opens the name entry', game.sceneName === 'newgame', game.sceneName);
  const ng = game.scene; ng.row = 0; ng.gx = 0; ng.gy = 0; ng.name = ''; game.input.tap('confirm'); run(.05); game.input.tap('right'); run(.05); game.input.tap('confirm'); run(.05);
  check('the letter grid types a name with the pad', ng.name === 'AB', ng.name);
  ng.row = 4; game.input.tap('confirm'); run(.4); check('Begin goes to the intro', game.sceneName === 'intro');
  for (let i = 0; i < 12 && game.sceneName === 'intro'; i++) { game.input.tap('confirm'); run(.25); }
  check('the intro leads into play', game.sceneName === 'play');
  const ctx = game.debug.ctx; check('the name carries into play', ctx.builder.name === 'AB');
  // settings additions persist
  game.settings.set('dqTextSpeed', 'Fast'); check('a game setting is kept', game.settings.dqTextSpeed === 'Fast');
  // About & Credits: every Source Information field and the feedback lists
  const A = await boot({ about: { sourceInformation: { date: 'd', source: 'Dragon Quest Builders', plan: 'PLAN.md', genre: 'g', perspective: 'p', tech: 't', artDirection: 'a', animation: 'an', audio: 'au', online: 'o', testing: 'te', research: 'r', environment: 'e', model: 'm', usage: 'u' }, testingFeedback: ['1', '2', '3', '4'], engineFeedback: ['1', '2', '3', '4', '5', '6'], promptFeedback: ['1', '2', '3', '4'] } });
  const actx = A.play('banner'); actx.ui.open('about', {}); const P = actx.ui.top.pages();
  check('About has Credits, Source Information, Testing, Engine and Prompt Feedback and Licenses', P.map(p => p[0]).join('|') === 'Credits|Source Information|Testing Feedback|Engine Feedback|Prompt Feedback|Licenses');
  check('Source Information lists every field', P[1][1].length === 15 && P[1][1].every(([k, v]) => v && v !== 'unknown'));
  check('the feedback pages answer every question', P[2][1].length === 4 && P[3][1].length === 6 && P[4][1].length === 4);
  check('no errors', !game.errors.length && !T.game.errors.length && !A.game.errors.length, errs() + T.errs() + A.errs());
};
