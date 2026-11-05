import { loadGame } from './load.mjs';
export const fresh = (o) => { const g = loadGame(o); g.game.advance(.2); return g; };
// a bout already in the fight phase, fighters on given x, no controllers
export const fightBout = (G, ids = ['taro', 'ebi'], opts = {}) => {
  const { KC } = G, b = new KC.test.Bout(Object.assign({ ids, seed: 3, ctrl: [null, null], intro: false }, opts)); b.start();
  while (b.phase !== 'fight' && b.steps < 5000) b.step(); return b;
};
export const run = (b, n) => { for (let i = 0; i < n; i++) b.step(); };
