import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('input'), g = room(), MT = g.MT, I = g.I, W = g.W, c = g.c;
  S.check('play uses the PLAY preset (arrows aim)', I.preset === MT.PLAY);
  c.aim = 0; I.hold('aimUp'); g.adv(.2); const fired = W.pShots.list.length; I.hold('aimUp', false);
  S.check('ArrowUp fires up in play', fired > 0 && Math.abs(Math.sin(c.aim) + 1) < .3, c.aim.toFixed(2));
  g.game.pause(); g.adv(.1); S.check('paused: the MENU preset (arrows navigate)', I.preset === MT.MENU);
  g.game.resume(); g.adv(.1); S.check('resumed: the PLAY preset again', I.preset === MT.PLAY);
  // the pad's right stick aims and fires
  I.padAim = [1, 0]; I.lastDevice = 'gamepad'; let it = MT.intentFrom(I, c, W); I.padAim = null;
  S.check('the right stick aims and auto-fires', it.fire && it.aim !== null);
  I.hold('aimLeft'); I.hold('aimDown'); g.adv(.05); it = MT.intentFrom(I, c, W); I.hold('aimLeft', false); I.hold('aimDown', false);
  S.check('two arrows: a diagonal', it.fire && it.aim > 1.5 && it.aim < 3.1, it.aim);
  c.aim = 1; I.hold('fire'); g.adv(.05); it = MT.intentFrom(I, c, W); I.hold('fire', false); S.check('R2 fires along the last aim', it.fire && Math.abs(it.aim - c.aim) < .01);
  // glyphs follow the device
  I.lastDevice = 'gamepad'; I.glyphs = 'playstation'; S.check('gamepad: PlayStation glyph codes', MT.glyph.codeFor('slide', I) === 'Pad6' && MT.glyph.family(I) === 'playstation');
  g.game.settings.set('glyphs', 'xbox'); S.check('the setting switches every player to Xbox', g.game.players.every(p => p.glyphs === 'xbox') && MT.glyph.family(I) === 'xbox');
  g.game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'keyboard'; S.check('keyboard: Space, E, Q', MT.glyph.codeFor('slide', I) === 'Space' && MT.glyph.codeFor('bomb', I) === 'KeyE' && MT.glyph.codeFor('showboat', I) === 'KeyQ');
  I.lastDevice = 'mouse'; S.check('mouse: left click fires', MT.glyph.codeFor('fire', I) === 'Mouse0');
  S.check('the default glyphs are PlayStation', g.game.settings.default('glyphs') === 'playstation');
  return S;
};
