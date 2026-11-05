import { load } from '../lib/load.mjs';
export default function (check) {
  const { G, game, I } = load();
  game.advance(.5);
  check('title scene boots', game.sceneName === 'title', game.sceneName);
  I.tap('confirm'); game.advance(.6);
  check('confirm leaves the title for the menu', game.sceneName === 'menu', game.sceneName);
  check('no engine errors on boot', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  check('PlayStation glyphs by default', game.input.padStyle() === 'playstation', game.input.padStyle());
  game.go('match', { cfg: { teams: [['mika', 'you'], ['ruby', 'tomo']] } }, { fade: 0 }); game.advance(.5);
  I.lastDevice = 'gamepad';
  const labels = ['✕', '○', '□', '△'];
  check('pad prompts use PlayStation symbols', G.label('play') === labels[0] && G.label('dive') === labels[1] && G.label('call') === labels[2] && G.label('cam') === labels[3], [G.label('play'), G.label('dive'), G.label('call'), G.label('cam')].join(','));
  game.settings.set('glyphs', 'xbox');
  check('Settings option switches to Xbox A B X Y', G.label('play') === 'A' && G.label('dive') === 'B' && G.label('call') === 'X' && G.label('cam') === 'Y', G.label('play') + G.label('dive'));
  game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'keyboard'; check('keyboard prompts name keys', G.label('play') === 'Space', G.label('play'));
  game.advance(2); check('no errors after a second of match', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
}
