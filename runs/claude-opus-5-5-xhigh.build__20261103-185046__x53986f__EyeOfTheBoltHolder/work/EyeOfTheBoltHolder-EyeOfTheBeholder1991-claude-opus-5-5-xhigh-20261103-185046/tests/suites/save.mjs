// save: a save at a point on each floor loads to the same hash; the version field; a bad save is refused
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B, game } = await fresh(), S = () => B.S;
  for (const [f, x, y, d] of [['f1', 10, 6, 1], ['f2', 10, 2, 1], ['f3', 3, 6, 0], ['f4', 6, 8, 0]]) {
    at(B, f, x, y, d); sim(B, 2); const h = B.hash(), data = B.serialize();
    B.newGame({ seed: 99 }); B.load(JSON.parse(JSON.stringify(data)));
    t.check(`${f}: save and load keep the hash`, B.hash() === h);
    sim(B, 3); const h2 = B.hash(); B.load(JSON.parse(JSON.stringify(data))); sim(B, 3); t.check(`${f}: and play on the same`, B.hash() === h2);
  }
  t.check('a save carries its version', B.serialize().v === 1);
  let threw = false; try { B.load({}); } catch (e) { threw = true; } t.check('a bad save is refused', threw);
  at(B, 'f1', 2, 13, 0); t.check('the engine save slots write the state', game.saves.save(0) !== false && !!game.saves.get(0) && game.saves.get(0).place === 'The Hasp Drains');
  const before = B.hash(); B.newGame({ seed: 4 }); game.saves.load(0); t.check('and load it back', B.hash() === before);
}
