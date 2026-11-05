// input: labels per device (PlayStation by default, Xbox by the setting); prompts follow the device used last; the d-pad
// picks tools and never moves the hero; the wheel cycles tools
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game, I } = t; t.step(.3);
  check('keys: Space', I.codeLabel('Space') === 'Space', I.codeLabel('Space'));
  check('the pad shows PlayStation symbols by default', I.codeLabel('Pad0') === '✕' && game.settings.glyphs === 'playstation', I.codeLabel('Pad0'));
  game.settings.set('glyphs', 'xbox'); check('the Xbox option shows A', I.codeLabel('Pad0') === 'A', I.codeLabel('Pad0')); game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'gamepad'; check('a pad prompt: the pad code', B.Glyph.code('attack') === 'Pad2', B.Glyph.code('attack'));
  I.lastDevice = 'mouse'; check('a mouse prompt: the mouse button', B.Glyph.code('attack') === 'Mouse0', B.Glyph.code('attack'));
  I.lastDevice = 'keyboard'; check('a keyboard prompt: the key', B.Glyph.code('attack') === 'KeyJ', B.Glyph.code('attack'));
  const M = loadYard(t), h = M.hero; h.bento = [{ tool: 'riceball', n: 3 }, { tool: 'shuriken', n: 10 }, null, null, null, null, null, null]; h.sel = 0;
  game.debug.teleport(C(12), C(11), 0); B.testIntent = null; const x0 = h.x, y0 = h.y;
  I.press('Pad15'); t.step(.4); I.release('Pad15'); t.step(.1);
  check('the d-pad does not move the hero', Math.hypot(h.x - x0, h.y - y0) < 1, Math.hypot(h.x - x0, h.y - y0));
  check('the d-pad picks the next tool', h.sel === 1, h.sel);
  B.wheel = -1; t.step(.05); check('the wheel cycles tools', h.sel === 0, h.sel);
  I.hold('right'); t.step(.4); I.hold('right', false); check('the keys move the hero', Math.hypot(h.x - x0, h.y - y0) > 10, Math.hypot(h.x - x0, h.y - y0));
}
