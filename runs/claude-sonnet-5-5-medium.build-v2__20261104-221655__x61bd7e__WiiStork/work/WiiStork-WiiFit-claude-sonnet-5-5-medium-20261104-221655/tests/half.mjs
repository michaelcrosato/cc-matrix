export async function run(T) {
  const { loadGame } = await import('./lib.mjs'); const { G, game } = loadGame({ draw: false }); game.advance(.3);
  game.go('class'); game.advance(.5); game.addPlayer({ keys: 'right' }); game.advance(.2);
  const [p1, p2] = game.players; T.ok(!!p2, 'second keyboard player joins');
  p2.hold('nR', true); game.advance(.1); const it = G.newIntent(); G.readHuman(p2, it, .1); T.ok(p2.down('nR'), 'right half: arrow nudges player 2');
  p2.hold('nR', false); p1.hold('wL', true); game.advance(.05); T.ok(p1.down('wL') && !p2.down('wL'), 'left half keys stay with player 1'); p1.hold('wL', false);
  p2.hold('catchL', true); game.advance(.05); T.ok(p2.down('catchL') && !p1.down('catchL'), 'player 2 catch is its own'); p2.hold('catchL', false);
}
