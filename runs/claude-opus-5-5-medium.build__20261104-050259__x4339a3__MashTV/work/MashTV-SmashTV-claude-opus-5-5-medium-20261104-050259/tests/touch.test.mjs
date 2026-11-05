import { boot, suite } from './lib.mjs';
export default async () => {
  const S = suite('touch'), g = boot(), MT = g.MT, I = g.I;
  S.check('no touch controls', I.touchEnabled === false);
  MT.touch.only = true; MT.touch.lifted = false; g.game.go('title'); g.adv(.5);
  const T = g.game.scene; T.menu.i = 0; I.lastDevice = 'touch'; g.adv(.5); S.check('the notice holds the title (menu inert)', g.snap().scene === 'title');
  I.lastDevice = 'keyboard'; I.tap('down'); g.adv(.1); S.check('a key press lifts the notice', MT.touch.only === false);
  MT.touch.only = true; MT.touch.lifted = false; MT.touchOnlyLift('pad'); S.check('a gamepad connecting lifts it', MT.touch.only === false);
  return S;
};
