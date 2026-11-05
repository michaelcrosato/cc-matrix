// helpers that drive the game with real inputs
export const until = (game, cond, cap = 600, stepS = .25) => { let t = 0; while (!cond() && t < cap) { game.advance(stepS); t += stepS; } return t; };
export const press = (game, act, wait = .3) => { game.input.tap(act); game.advance(wait); };
export const sceneIs = (game, n) => game.scene && game.scene.name === n;
