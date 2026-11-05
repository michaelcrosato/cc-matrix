import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, errs } = G, T = 16;
  const ctx = G.play('banner'), w = ctx.world, id = DQ.blockId;
  const site = (x, y) => { DQ.flatten(w, 60, 77, 90, 92, 9); for (const o of ctx.objects.filter(o => o.x >= 60 && o.x <= 90 && o.y >= 77 && o.y <= 92 && !o.def.fixed)) ctx.objects.remove(o, { silent: true, noRegrow: true }); w.recomputeTops(); };
  const types = () => ctx.rooms.detect().filter(r => r.inBorder || !ctx.town.planted).map(r => r.type).sort().join(',');
  const clear = () => site(76, 80);
  // a 3x3 bedroom
  clear(); DQ.buildRoom(ctx, 76, 80, 3, 3, { items: ['strawBed', 'torch'] }); check('a 3x3 room with a bed, a door and a torch is a Bedroom', types() === 'bedroom', types());
  // without the light: no room, and the hint names it
  const torch = ctx.objects.find(o => o.id === 'torch' && o.x >= 76 && o.x < 79 && o.y >= 80 && o.y < 83); ctx.objects.remove(torch, { silent: true }); ctx.builder.body.x = 77 * T; ctx.builder.body.y = 84 * T;
  check('no light, no room', types() === '', types()); check('the hint says a light is missing', ctx.rooms.lastFail && ctx.rooms.lastFail.why === 'a light', ctx.rooms.lastFail && ctx.rooms.lastFail.why);
  ctx.objects.add({ id: 'torch', x: 78, y: 82, z: 9 }, { force: true, silent: true });
  // a 1-high gap in the wall leaks
  w.set(75, 81, 10, 0); check('a wall only 1 block high leaks', types() === '', types()); check('the hint names the low wall', ctx.rooms.lastFail && /2 blocks high/.test(ctx.rooms.lastFail.why), ctx.rooms.lastFail && ctx.rooms.lastFail.why);
  w.set(75, 81, 10, id('planks')); check('mending the gap makes it a room again', types() === 'bedroom');
  // the door removed: missing a door
  const door = ctx.objects.find(o => o.def.door && o.x === 77 && o.y === 83); ctx.objects.remove(door, { silent: true }); w.set(77, 83, 9, id('planks')); w.set(77, 83, 10, id('planks'));
  check('no door, no room', types() === '' && ctx.rooms.lastFail && ctx.rooms.lastFail.why === 'a door', ctx.rooms.lastFail && ctx.rooms.lastFail.why);
  // a door on a corner does not count
  w.set(75, 83, 9, 0); w.set(75, 83, 10, 0); ctx.objects.add({ id: 'latticeDoor', x: 75, y: 83, z: 9, facing: 1 }, { force: true, silent: true });
  check('a door on a corner does not count', types() === '', types());
  // a roofed room is still a room
  clear(); DQ.buildRoom(ctx, 76, 80, 3, 3, { items: ['bench', 'chest', 'torch'] }); for (let y = 79; y <= 83; y++) for (let x = 75; x <= 79; x++) w.set(x, y, 11, id('thatch'));
  check('a roofed room with a bench and a chest is a Workshop', types() === 'workshop', types());
  // the bed removed: bedroom -> snug
  clear(); DQ.buildRoom(ctx, 76, 80, 3, 3, { items: ['strawBed', 'torch'] }); types(); const bed = ctx.objects.find(o => o.id === 'strawBed' && o.x >= 76 && o.x < 79 && o.y >= 80 && o.y < 83); ctx.objects.remove(bed, { silent: true });
  check('removing the bed turns the Bedroom into a Snug', types() === 'snug', types());
  // a 2x1 snug; too big (65 cells)
  clear(); DQ.buildRoom(ctx, 76, 80, 2, 1, { items: ['torch'] }); check('a 2x1 room is a Snug', types() === 'snug', types());
  site(66, 78); DQ.flatten(w, 62, 76, 80, 86, 9); w.recomputeTops(); ctx.builder.body.x = 70 * T; ctx.builder.body.y = 86 * T; DQ.buildRoom(ctx, 66, 79, 13, 5, { items: ['torch'] }); check('65 cells is too big', types() === '' && ctx.rooms.lastFail && /too big/.test(ctx.rooms.lastFail.why), types() + ' ' + (ctx.rooms.lastFail && ctx.rooms.lastFail.why));
  // awards: once per slot, capped by maxAwards
  const c0 = ctx.town.cheer; site(76, 80); DQ.flatten(w, 72, 76, 84, 86, 9); w.recomputeTops(); DQ.buildRoom(ctx, 76, 80, 3, 3, { items: ['hearthPot', 'chest', 'torch'] }); ctx.rooms.list = []; ctx.rooms.detect(); const c1 = ctx.town.cheer; ctx.rooms.list = []; ctx.rooms.detect();
  check('a kitchen pays its Cheer once', c1 - c0 === 25 && ctx.town.cheer === c1, [c0, c1, ctx.town.cheer]);
  // every type
  const kinds = [['strawBed'], ['bench', 'chest'], ['hearthPot', 'chest'], ['forge', 'chest'], ['table', 'stool', 'stool'], ['weaponRack', 'torch']];
  const want = ['bedroom', 'workshop', 'kitchen', 'smithy', 'messHall', 'guardPost']; let okK = 0, got = [];
  kinds.forEach((items, i) => { site(64, 64); DQ.flatten(w, 60, 60, 72, 72, 9); w.recomputeTops(); DQ.buildRoom(ctx, 76, 80, 3, 3, { items: items.concat(['torch']) }); const t = types(); got.push(t); if (t === want[i]) okK++; });
  check('every room type is recognised', okK === want.length, got.join(' / '));
  // two rooms sharing a wall
  site(74, 80); DQ.flatten(w, 70, 76, 84, 86, 9); w.recomputeTops(); DQ.buildRoom(ctx, 74, 80, 3, 3, { items: ['strawBed', 'torch'] }); DQ.buildRoom(ctx, 78, 80, 3, 3, { items: ['strawBed', 'torch'] });
  check('two rooms can share a wall', types() === 'bedroom,bedroom', types());
  // outside the border: detected, but no Cheer
  const ch0 = ctx.town.cheer; const far = 72 + 15; DQ.flatten(w, far - 2, 60, far + 4, 66, w.topZ(far, 62)); w.recomputeTops(); ctx.builder.body.x = (far + 1) * T; ctx.builder.body.y = 64 * T;
  ctx.rooms.detect({ region: [far - 4, 58, far + 6, 68] }); DQ.buildRoom(ctx, far, 61, 3, 3, { items: ['strawBed', 'torch'] }); const outside = ctx.rooms.detect({ region: [far - 4, 58, far + 6, 68] });
  check('a room outside the border is detected but pays no Cheer', outside.some(r => r.type === 'bedroom' && !r.inBorder) && ctx.town.cheer === ch0, [ctx.town.cheer, ch0]);
  check('no errors', !game.errors.length, errs());
};
