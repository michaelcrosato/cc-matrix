// save and determinism: a save on each floor loads to the same hash; the same seed and commands give the same hash
import { kit } from './simkit.mjs';
export default async check => {
  const { B, game } = await kit();
  const script = () => { B.newState(77); B.drain(); B.Bot.start({}); for (let i = 0; i < 120 * 60; i++) { B.update(1 / 120, B.Bot.step(1 / 120)); B.drain(); } return B.hash(); };
  const h1 = script(), h2 = script();
  check('the same seed and commands give the same hash', h1 === h2, h1 + ' ' + h2);
  // a save mid-run, loaded, runs on the same as the original under the same commands
  B.newState(78); B.Bot.start({}); for (let i = 0; i < 120 * 30; i++) { B.update(1 / 120, B.Bot.step(1 / 120)); B.drain(); }
  const snap = JSON.parse(JSON.stringify(B.S)), rec = [], CY = [{ c: 'move', d: 'f' }, { c: 'strike' }, { c: 'turn', s: 1 }, { c: 'move', d: 'l' }, { c: 'use' }, { c: 'turn', s: -1 }, { c: 'move', d: 'b' }, { c: 'strike' }];
  for (let i = 0; i < 120 * 20; i++) { const c = i % 37 === 0 ? [CY[(i / 37) % CY.length]] : []; rec.push(c); B.update(1 / 120, c); B.drain(); }
  const ha = B.hash();
  B.S = JSON.parse(JSON.stringify(snap)); B.buildRuntime(); B.look();
  for (const c of rec) { B.update(1 / 120, c); B.drain(); }
  check('after a save and load the run goes on the same way', B.hash() === ha);
  // the engine's save slots: write, read
  for (const fid of ['f1', 'f2', 'f3', 'f4']) {
    B.newState(5); if (fid !== 'f1') B.changeFloor(fid, B.FLOORS[fid].start, 'warp'); B.drain(); game.go('play', { resume: true }); game.advance(.3);
    const before = B.hash(); check('saves to slot 1 on ' + fid, game.saves.save(1)); B.newState(9);
    const s = game.saves.load(1); game.advance(.1);
    check('loads the same state on ' + fid, s && B.hash() === before, B.hash() + ' vs ' + before);
  }
  check('the save carries its version', game.saves.get(1).version === 1);
  check('an empty slot loads nothing', game.saves.load(2) === null);
};
