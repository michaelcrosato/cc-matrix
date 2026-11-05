import { boot, suite } from './lib.mjs';
export default async () => {
  const S = suite('attract'), g = boot(), MT = g.MT, I = g.I, sc = () => g.snap().scene;
  g.adv(9); S.check('not before 10 s', sc() === 'title');
  I.tap('down'); g.adv(9.5); S.check('input resets the idle clock', sc() === 'title');
  g.adv(1.2); S.check('10 s idle on the title: attract', sc() === 'attract', sc());
  const reels = new Set(); let died = 0; const off = MT.on('world:death', () => died++);
  for (let t = 0; t < 140; t += .5) { g.adv(.5); reels.add(MT.attract.reel); }
  off(); S.check('all 10 reels play', reels.size === 10, [...reels].join(',')); S.check('the bots never die', died === 0, died);
  S.check('in order', MT.attract.played.slice(0, 10).join(',') === '0,1,2,3,4,5,6,7,8,9', MT.attract.played.join(','));
  I.press('KeyW'); g.adv(1 / 120 * 2); I.release('KeyW'); g.adv(.3); S.check('a key returns to the title', sc() === 'title', sc());
  g.adv(10.5); S.check('again', sc() === 'attract'); MT.idle.poke(); g.adv(.3); S.check('a mouse move/gamepad (any input) returns', sc() === 'title', sc());
  MT.touch.only = true; g.adv(10.5); S.check('it runs with the touch-only notice', sc() === 'attract'); MT.idle.poke(); g.adv(.3); S.check('a tap returns to the notice', sc() === 'title'); MT.touch.only = false;
  S.check('no errors', g.game.errors.length === 0, g.game.errors.map(e => e.message).slice(0, 2).join('|'));
  return S;
};
