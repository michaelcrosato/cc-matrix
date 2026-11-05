import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play('lv2'), b = ctx.builder, w = ctx.world;
  // doors: open for the builder, a wall for monsters
  const door = ctx.objects.find(o => o.def.door);
  DQ.Dev.teleport(ctx, door.x, door.y + 2); run(.1); b.body.x = (door.x + .5) * T; b.body.y = (door.y + 1.6) * T; run(.6);
  check('a door swings open for the builder nearby', door.open > .5, door.open);
  DQ.Dev.teleport(ctx, door.x + 8, door.y + 8); run(1); check('it closes behind', door.open < .5, door.open);
  check('a closed door blocks monsters, not residents', w.blocks(door.x, door.y, door.z, 'monster', door.z * T, 2) && !w.blocks(door.x, door.y, door.z, 'npc', door.z * T, 2));
  // beds: only at night, only when safe
  ctx.clock.set(12); DQ.trySleep(ctx, b); run(.1); check('no sleeping in the day', !b.sleeping); while (ctx.talk.open) press('confirm', .1);
  ctx.clock.set(22); for (const m of ctx.monsters.list) { m.dead = true; m.deadT = 99; } run(.2); DQ.trySleep(ctx, b); run(3);
  check('sleeping at night skips to 06:00', Math.floor(ctx.clock.hour) === 6 && !b.sleeping, ctx.clock.hour);
  // the pin trap hurts monsters standing on it
  DQ.Dev.teleport(ctx, 60, 60); const L = w.topZ(62, 60); const trap = ctx.objects.add({ id: 'pinTrap', x: 62, y: 60, z: L }, { force: true });
  const m = ctx.monsters.spawnCell('knotbrute', 62, 60); m.state = 'idle'; const hp0 = m.hp; m.update = function () { this.body.vx = this.body.vy = 0; }; run(2);
  check('a pin trap hurts a monster on it', m.hp < hp0, [hp0, m.hp]);
  m.dead = true; m.deadT = 99;
  // ballistas: fire when manned, reload, repair
  const ba = ctx.objects.add({ id: 'ballista', x: 64, y: 62, z: w.topZ(64, 62), facing: 0 }, { force: true });
  b.seat = ba; ba.manned = true; ba.reload = 0; ctx.objects.fire(ba, true, 30);
  check('a manned ballista fires a bolt and reloads', ctx.objects.bolts.length === 1 && ba.reload > 2, ba.reload); run(3); check('the reload ends', ba.reload === 0);
  b.seat = null; ba.manned = false; ba.broken = true; b.bag.add('planks', 2); DQ.useObject(ctx, ba, b);
  check('a broken ballista is repaired with 2 planks', !ba.broken && ba.hp === 150);
  // portals: touching one attunes it; travel lands in front of the other
  const pc = ctx.objects.find(o => o.portalId === 'coast'); ctx.objects.discovered.delete('coast');
  DQ.Dev.teleport(ctx, pc.x, pc.y + 1); run(.3); check('touching a portal attunes it', ctx.objects.discovered.has('coast'));
  DQ.travelTo(ctx, DQ.WORLD.portals.find(p => p.id === 'thimbleton')); run(1);
  check('travel lands by the Thimbleton portal', Math.hypot(b.body.x / T - 69.5, b.body.y / T - 81.5) < 2.5, JSON.stringify(G.snap().builder));
  // plants regrow after a day
  const tuft = ctx.objects.find(o => o.id === 'tuft'); const at = [tuft.x, tuft.y, tuft.z]; b.hitObject(tuft); run(.2);
  check('a plant breaks in one hit and drops', !ctx.objects.at(...at) && ctx.drops.list.length > 0);
  ctx.clock.total += 25; run(.2); check('it regrows after a day', ctx.objects.at(...at) && ctx.objects.at(...at).id === 'tuft');
  check('no errors', !game.errors.length, errs());
};
