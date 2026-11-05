import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  // every beat gives a consistent state
  for (const bt of DQ.BEATS) {
    const ctx = G.play(bt), s = G.snap();
    const ok = s.scene === 'play' && !s.errors && (bt === 'start' || s.town.planted) && (DQ.BEATS.indexOf(bt) < 2 || s.residents.length >= 2) && (DQ.BEATS.indexOf(bt) < 5 || ctx.town.hallDone);
    check('beat ' + bt + ' is consistent', ok, JSON.stringify({ lv: s.town.level, rooms: s.town.rooms, res: s.residents.length, hall: ctx.town.hallDone }));
  }
  // a mid-game save loads back the same in a fresh context
  const ctx = G.play('lv3'); ctx.builder.take('copperOre', 7, { quiet: true }); ctx.world.set(66, 66, 12, DQ.blockId('feltRed')); ctx.clock.set(15.5); ctx.clock.day = 3; ctx.builder.body.x = 70 * T; run(.3);
  const save = DQ.Save.write(ctx), json = JSON.stringify(save.data);
  check('a save stores only the world\'s differences (small)', json.length < 60000, json.length);
  const G2 = await boot(); G2.game.go('play', { load: JSON.parse(JSON.stringify(save)) }); G2.run(.5); const c2 = G2.game.debug.ctx;
  check('load: the world hash matches', c2.world.hash() === ctx.world.hash());
  check('load: the bag matches', c2.builder.bag.real('copperOre') === 7 && c2.builder.bag.real('cobbleClub') === 1);
  check('load: quests, town and residents match', JSON.stringify(G2.snap().quests) === JSON.stringify(G.snap().quests) && c2.town.level === 3 && c2.npcs.list.length === ctx.npcs.list.length);
  check('load: the clock matches', c2.clock.day === 3 && Math.abs(c2.clock.hour - ctx.clock.hour) < .1);
  check('load: rooms are recomputed', c2.rooms.list.length === ctx.rooms.list.length, [c2.rooms.list.length, ctx.rooms.list.length]);
  // the engine's slots: autosave after a quest is done
  game.saves.erase && game.saves.erase('auto'); ctx.save.auto('quest'); const a = game.saves.get('auto');
  check('the autosave writes to the auto slot', a && a.data && a.data.v === 1, a && Object.keys(a));
  check('Continue finds the latest save', !!game.saves.latest());
  check('migrate is identity for version 1', DQ.Save.migrate({ x: 1 }, 1).x === 1);
  check('no errors', !game.errors.length && !G2.game.errors.length, errs() + G2.errs());
};
