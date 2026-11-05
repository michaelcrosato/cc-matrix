// Scene suite: the game boots headless, the title waits, and the scenes change where they should, with no errors.
export function run({ check, G, E, ctx }) {
  const game = E.current;
  check('the game is running', !!game);
  if (!game) return;
  const snap = () => game.debug.snapshot();
  game.go('title', {});
  game.advance(1);
  check('the title is the first scene', snap().scene === 'title', JSON.stringify(snap().scene));
  check('a campaign can be started from its debug handle', typeof game.debug.newCampaign === 'function');
  game.debug.newCampaign({ humans: ['verdance'], seed: 4 });
  game.go('campaign', {});
  game.advance(.5);
  check('the campaign scene opens', snap().scene === 'campaign', String(snap().scene));
  check('the campaign starts in its tidings or muster', ['tidings', 'muster'].includes(snap().phase), String(snap().phase));
  check('no errors so far', snap().errors === 0, String(snap().errors));
}
