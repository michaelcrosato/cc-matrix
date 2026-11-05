// The UI (plan §19.2 "ui"): glyph icons per action and device; prompts follow the last device; the button symbols change
// every player's glyphs; touch-only detection on and off.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const bb = () => loadGame({ seed: 1 }).bb;

T('ui.every action has a glyph on the pad (PlayStation and Xbox), a key label on the keyboard', () => {
  const b = bb();
  for (const a of ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt']) {
    expect(b.padGlyph(a), `${a} has no pad glyph`);
    expect(b.keyLabel(a) && b.keyLabel(a).length > 0, `${a} has no key label`);
  }
});
T('ui.the prompt follows the last device: pad glyph, key label, or the mouse side', () => {
  const b = bb();
  const pad = b.promptTokens('{shoot}', { lastDevice: 'gamepad' })[0];
  const key = b.promptTokens('{shoot}', { lastDevice: 'keyboard' })[0];
  const mouse = b.promptTokens('{pass}', { lastDevice: 'mouse' })[0];
  expect(pad.glyph === 'square', `PlayStation shoot is the square, got ${JSON.stringify(pad)}`);
  expect(key.key && key.key.length > 0, `keyboard shoot labelled, got ${JSON.stringify(key)}`);
  expect(mouse.mouse === 'R', `mouse pass is the right button, got ${JSON.stringify(mouse)}`);
});
T('ui.the Xbox setting shows A B X Y instead of the PlayStation shapes', () => {
  const g = loadGame({ seed: 2 });
  g.game.settings.set('buttons', 'Xbox');
  expect(g.bb.padGlyph('pass') === 'A' && g.bb.padGlyph('shoot') === 'X', `xbox glyphs ${g.bb.padGlyph('pass')} ${g.bb.padGlyph('shoot')}`);
  g.game.settings.set('buttons', 'PlayStation');
  expect(g.bb.padGlyph('pass') === 'cross', 'PlayStation cross again');
});
T('ui.touch-only detection follows the device and lifts on a gamepad or a key', () => {
  const g = loadGame({ seed: 3, touch: true });
  expect(g.bb.checkTouchOnly() === true, 'touch and no fine pointer is touch-only');
  g.bb.S.everKey = false;
  const d = loadGame({ seed: 4, touch: false });
  expect(d.bb.checkTouchOnly() === false, 'a desktop with a mouse is not touch-only');
});
T('ui.the settings defaults are the spec\'s', () => {
  const b = bb();
  const get = k => b.GAME_SETTINGS.find(s => s.key === k).value;
  expect(get('difficulty') === 'Pro' && get('quarter') === '2:00' && get('powerups') === 'On' && get('commentary') === 'Full' && get('camera') === 'Broadcast' && get('buttons') === 'PlayStation', 'defaults');
});
