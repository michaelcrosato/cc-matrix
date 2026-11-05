import { boot } from '../lib/helpers.mjs';
export default async function () {
  const H = boot(), { DQ, game, I, check, tick } = H; H.newGame(); const S = DQ.S;
  DQ.devBeat('rooms'); H.skipTalk(); tick(2); H.skipTalk(); tick(2); H.skipTalk(); tick(1);
  DQ.inv.add('pattern', 1, true); H.tp(39, 60); DQ.forceTarget = { cx: 40, cy: 50 }; S.hotbar[S.sel] = 'pattern'; check('pattern lays out inside the border', DQ.placeAction() && !!S.pattern); DQ.forceTarget = null;
  const p0 = DQ.patternProgress(); check('ghost starts empty', p0.done === 0 && p0.total === 13 + 8 - 0 || p0.done === 0);
  // a correct block counts, a wrong one does not
  H.place(40, 50, 'plank'); check('wrong block does not count', DQ.patternProgress().done === 0); for (let i = 0; i < 5; i++) DQ.breakAt(40, 50); H.place(40, 50, 'cobble'); check('right block counts', DQ.patternProgress().done === 1);
  // helpers build from the Town Chest
  const ch = S.world.addObj('chest', 36, 56, { }); ch.townChest = true; S.town.chestId = ch.id; ch.items = [{ id: 'cobble', n: 40 }, { id: 'door', n: 1 }, { id: 'torch', n: 1 }, { id: 'bed', n: 1 }];
  DQ.tuning.helperRate = 6; tick(120); H.skipTalk(); tick(5);
  check('helpers finish the pattern and Cheer is paid', !S.pattern && S.stats.patterns === 1, JSON.stringify(DQ.patternProgress()) + JSON.stringify(S.pattern && [...S.pattern.cells.filter(c => !(S.world.blockAt(c.x, c.y, c.z) === DQ.blockId('cobble'))), ...S.pattern.objs.filter(o => !S.world.objAt(o.x, o.y))]));
  check('the finished cottage is a room', DQ.roomCount('Bedroom') >= 1);
  check('no errors', game.errors.length === 0 && DQ.errors.length === 0, DQ.errors.join('|').slice(0, 400));
  return H;
}
