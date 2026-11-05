import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play('lv4'), w = ctx.world;
  // navigation over steps, through doors for residents, around doors for monsters, through walls for breakers
  const p1 = DQ.Nav.path(w, [66, 79, 9], [74, 72, 9], { kind: 'npc' }); check('a path across town', p1 && p1.length > 5);
  const door = ctx.objects.find(o => o.def.door); const inside = [door.x, door.y - 1, door.z], out = [door.x, door.y + 2, door.z];
  const pn = DQ.Nav.path(w, out, inside, { kind: 'npc' }); check('residents path through a door into a room', pn && pn.some(q => q[0] === door.x && q[1] === door.y));
  const pm = DQ.Nav.path(w, out, inside, { kind: 'monster', max: 2000 }); check('monsters never path through a closed door', !pm || !pm.some(q => q[0] === door.x && q[1] === door.y));
  const pb = DQ.Nav.path(w, out, inside, { kind: 'monster', breaker: true }); check('a breaker path goes through the wall or door', !!pb);
  w.set(66, 80, 9, DQ.blockId('stone')); const ps = DQ.Nav.path(w, [65, 80, 9], [67, 80, 9], { kind: 'npc' }); check('a path hops a 1-block step', ps && ps.length >= 2); w.set(66, 80, 9, 0);
  // schedules: beds at night, supper, the morning bubble
  ctx.clock.set(20.9); run(4);
  const wren = ctx.npcs.get('wren');
  check('beds are assigned at 21:00', wren.bed && wren.bed.id === 'strawBed', wren.bed && wren.bed.id);
  ctx.clock.set(23); run(20); check('Wren goes to sleep in her bed', wren.state === 'sleep' && Math.hypot(wren.body.x / T - (wren.bed.x + .5), wren.body.y / T - (wren.bed.y + .5)) < 1.5, wren.state);
  const bub0 = ctx.town.bubbles.length; ctx.clock.set(5.98); run(2); check('the morning brings a sleep bubble', ctx.town.bubbles.length > bub0, [bub0, ctx.town.bubbles.length]);
  check('residents wake up', wren.state !== 'sleep');
  // the gifts: Wren puts basics in the Town Chest at 07:00
  const ch = ctx.objects.find(o => o.id === 'chest' && ctx.town.inBorder(o.x, o.y)); ch.townChest = true; const n0 = DQ.count(ch.items);
  ctx.clock.set(6.9); run(4); check("Wren's morning gifts land in the Town Chest", DQ.count(ch.items) > n0, [n0, DQ.count(ch.items)]);
  // supper: residents gather at the Mess Hall
  ctx.clock.set(18.2); run(15); const mh = ctx.rooms.list.find(r => r.type === 'messHall');
  check('at supper residents gather in the Mess Hall', mh && ctx.npcs.list.filter(n => n.state === 'supper').length >= 2);
  ctx.clock.set(18.95); run(4); check('supper in a Mess Hall gives meal bubbles', ctx.town.bubbles.filter(q => q.need === 'meal').length >= 1);
  // requests: ! over a giver with a quest to give
  ctx.clock.set(10); run(1); const s1 = ctx.quests.balloonFor('wren');
  check('Wren shows ! for Bluebell Blues at level 3', s1 === '!', s1);
  // talk accepts the quest
  const b = ctx.builder; b.body.x = wren.body.x + 10; b.body.y = wren.body.y; b.body.z = wren.body.z; run(.1); ctx.npcs.talk(wren, b); for (let i = 0; i < 12 && ctx.talk.open; i++) press('confirm', .3);
  check('talking to a giver accepts the quest', ctx.quests.active('s2'), ctx.quests.st('s2').state);
  check('no errors', !game.errors.length, errs());
};
