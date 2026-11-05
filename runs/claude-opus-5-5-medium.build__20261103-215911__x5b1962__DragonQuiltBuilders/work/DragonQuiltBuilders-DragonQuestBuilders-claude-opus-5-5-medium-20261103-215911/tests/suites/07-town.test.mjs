import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play(null), b = ctx.builder, t = ctx.town;
  // planting: only on the marked spot
  b.take('banner', 1, { quiet: true }); DQ.Dev.teleport(ctx, 60, 60); run(.1);
  check('the Banner cannot be planted away from the ruins', !t.tryPlant(b) && !t.planted);
  DQ.Dev.teleport(ctx, 72, 78); run(.1); check('planting at the spot founds the town', t.tryPlant(b) && t.planted && t.inBorder(72, 76) && !t.inBorder(72 + 11, 76));
  ctx.cutscenes.skip(); run(.2); while (ctx.talk.open) press('confirm', .1);
  check('Wren moves in at the planting', !!ctx.npcs.get('wren'));
  // Cheer and levels: thresholds 40 / 130 / 250, the border grows
  let lv = []; const off = ctx.events.on('townLevel', e => lv.push(e.level));
  t.addCheer(39); check('39 Cheer is still level 1', t.level === 1);
  t.addCheer(1); check('40 Cheer is level 2 and the border grows to 13', t.level === 2 && t.radius === 13 && t.inBorder(72 + 13, 76));
  t.addCheer(500); check('levels stop at 4 until Gnarlgrim falls', t.level === 4, t.level);
  off(); check('a level-up event per level', lv.join(',') === '2,3,4', lv.join(','));
  ctx.cutscenes.skip(); run(.1); while (ctx.talk.open) press('confirm', .1);
  // the next resident arrives in daylight
  ctx.clock.set(10); run(1); while (ctx.cutscene) { ctx.cutscenes.skip(); run(.2); }
  check('a resident arrives after a level-up', ctx.npcs.list.length >= 2, ctx.npcs.list.map(n => n.id).join(','));
  // Cheer bubbles: spawn over a resident, collect by walking close
  const wren = ctx.npcs.get('wren'); const c0 = t.cheer; t.addBubble(wren, 'sleep'); b.body.x = wren.body.x + 8; b.body.y = wren.body.y; b.body.z = wren.body.z; run(1.2);
  check('walking near a Cheer bubble collects it (+5)', t.cheer === c0 + 5 && !t.bubbles.length, [c0, t.cheer]);
  // the Hall pattern: placement needs flat ground inside the border, then counts ghost cells
  DQ.flatten(ctx.world, 73, 60, 85, 70, 9); ctx.world.recomputeTops();
  b.take('hallPattern', 1, { quiet: true }); check('using the Pattern starts placement', t.startPlacing('hall', b) && !!t.placing);
  t.placingStep(Object.assign(DQ.Controls.blank(), { cursor: { x: 79, y: 65, z: 8 }, hot: 1 }), b);
  check('the pattern turns 90 degrees', t.placing.rot === 1);
  t.placingStep(Object.assign(DQ.Controls.blank(), { cursor: { x: 79, y: 65, z: 8 }, hot: -1 }), b);
  t.placingStep(Object.assign(DQ.Controls.blank(), { cursor: { x: 79, y: 65, z: 8 }, place: true }), b);
  check('placing lays the pattern and uses the scroll', t.pattern && t.pattern.id === 'hall' && !b.bag.real('hallPattern') && ctx.flags.hallPlaced, t.placing && t.placing.why);
  const P = t.pattern; run(.2);
  check("the Quilters' Hall pattern has 129 build cells", P.cells.filter(c => !c.clear && !c.fill).length === 129, P.cells.filter(c => !c.clear && !c.fill).length);
  const c = P.cells.find(q => q.block === DQ.blockId('cobble')); ctx.world.set(c.x, c.y, c.z, c.block); run(.2);
  check('a matching block counts', P.cells.find(q => q === c).ok && P.built >= 1);
  // helpers build from the Town Chest
  const ch = ctx.objects.add({ id: 'chest', x: 70, y: 80, z: ctx.world.topZ(70, 80) }, { force: true }); ch.townChest = true; ctx.flags.townChest = true;
  if (!ctx.npcs.get('mortimer')) ctx.npcs.arrive('mortimer', { quiet: true });
  ctx.clock.set(9); DQ.tuning.set('helperRate', 60); const built0 = P.built; DQ.Chest.add(ch, 'cobble', 20);
  run(25);
  check('residents build pattern cells from the Town Chest', P.built > built0 + 2 && ch.items.cobble < 20, [built0, P.built, ch.items.cobble]);
  DQ.tuning.reset('helperRate');
  // finishing the pattern forms the Hall room
  for (const q of P.cells) { if (q.clear) ctx.world.set(q.x, q.y, q.z, 0); else if (q.block) ctx.world.set(q.x, q.y, q.z, q.block); else ctx.objects.add({ id: q.obj, x: q.x, y: q.y, z: q.z, facing: q.facing }, { force: true }); }
  run(1);
  check("completing the pattern makes the Quilters' Hall", P.done && t.hallDone && ctx.rooms.list.some(r => r.type === 'hall'), ctx.rooms.list.map(r => r.type).join(','));
  check('no errors', !game.errors.length, errs());
};
