import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G;
  const bag = new DQ.Bag(3);
  check('stacks fill to 99 then a new slot', bag.add('straw', 150) === 0 && bag.slots.length === 2 && bag.count('straw') === 150);
  check('overflow comes back when the bag is full', bag.add('pebble', 300) === 300 - 99 && bag.slots.length === 3);
  check('key items are kept apart and never fill slots', bag.add('goldenNeedle', 1) === 0 && bag.keys.goldenNeedle === 1);
  check('remove takes from stacks', bag.remove('straw', 120) && bag.count('straw') === 30 && !bag.remove('straw', 31));
  const ctx = G.play('lv2'), b = ctx.builder;
  // chests: store all materials; the Town Chest from level 2, inside the border
  const ch = ctx.objects.find(o => o.id === 'chest'); b.bag.add('straw', 12); b.bag.add('stone', 5);
  const moved = DQ.Chest.storeAll(ch, b.bag);
  check('Store all moves materials and blocks into the chest', moved >= 17 && ch.items.straw >= 12 && b.bag.real('straw') === 0, moved);
  ctx.ui.open('chest', { obj: ch }); run(.1); const scr = ctx.ui.top; scr.side = 1; scr.i[1] = scr.lists()[1].length; game.input.tap('confirm'); run(.1);
  check('Make this the Town Chest (from level 2)', ch.townChest && ctx.flags.townChest);
  ctx.ui.close(); run(.1);
  // crafting: every recipe consumes its inputs and gives its output
  let ok = 0, bad = [];
  for (const r of DQ.RECIPES) {
    const t = new DQ.Bag(40); for (const k in r.inputs) t.add(k, r.inputs[k]);
    ctx.crafting.know(r.id, true); const made = ctx.crafting.craft(r.id, 1, t);
    if (made === 1 && t.real(r.out) === r.n && Object.keys(r.inputs).every(k => k === r.out || t.real(k) === 0)) ok++; else bad.push(r.id);
  }
  check('every recipe crafts and consumes its inputs', !bad.length, bad.join(','));
  const r2 = DQ.recipe('hearthPot'), t2 = new DQ.Bag(40); t2.add('stone', 4); t2.add('frayedScrap', 1);
  check('the Hearth Pot takes Frayed Scrap instead of Charcloth', ctx.crafting.craft('hearthPot', 1, t2) === 1 && t2.real('hearthPot') === 1);
  check('crafting stops when the bag cannot pay', ctx.crafting.craft('planks', 5, new DQ.Bag(40)) === 0);
  // station gating: the bench list holds bench recipes only
  check('stations list their own recipes', ctx.crafting.list('forge').every(r => r.station === 'forge') && ctx.crafting.list('pocket').some(r => r.id === 'torch'));
  // notions fire once, on the trigger
  const c2 = new DQ.Crafting(ctx); let n = 0; const off = ctx.events.on('notion', () => n++);
  c2.trigger('pickup', 'lint'); c2.trigger('pickup', 'lint'); off();
  check('a notion fires once on its trigger', c2.knows('torch') && n === 1, n);
  // the crafting screen: craft by menu actions, quantity picker x5
  b.bag.add('log', 6); ctx.crafting.know('planks', true);
  const bench = ctx.objects.find(o => o.id === 'bench'); ctx.ui.open('craft', { station: 'bench', obj: bench }); run(.1);
  const cs = ctx.ui.top, L = cs.list(); cs.focus = L.findIndex(r => r.id === 'planks');
  game.input.tap('right'); run(.05); const before = b.bag.real('planks'); game.input.tap('confirm'); run(.1);
  check('the crafting screen crafts x5 with the quantity picker', b.bag.real('planks') - before === 15, b.bag.real('planks') - before);
  // mouse: hover moves the focus, a click crafts
  game.input.tap('cancel'); run(.1); ctx.ui.open('satchel', { tab: 0 }); run(.1); game.advance(1 / 60);
  const sat = ctx.ui.top; game.input.feed('move', 10, 10); run(.05);
  check('the Satchel opens on the Bag tab', sat.tab === 0);
  game.input.tap('tabNext'); run(.05); check('L1/R1 switch Satchel tabs', sat.tab === 1);
  game.input.tap('tabNext'); run(.05); check('the Journal tab', sat.tab === 2);
  game.input.tap('cancel'); run(.1); check('cancel closes the Satchel', !ctx.ui.top);
  check('no errors', !game.errors.length, errs());
};
