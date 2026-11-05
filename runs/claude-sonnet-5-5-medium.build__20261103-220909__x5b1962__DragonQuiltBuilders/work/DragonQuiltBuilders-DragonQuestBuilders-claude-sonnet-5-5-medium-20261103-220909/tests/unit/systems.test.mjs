import { boot } from '../lib/helpers.mjs';
export default async function () {
  const H = boot(), { DQ, game, I, T, cellC, check, tick } = H;
  // world generation is deterministic and varied
  const a = DQ.generateStory(), h1 = a.hash(); DQ.reseed(20261103); const b = DQ.generateStory();
  check('worldgen is deterministic', h1 === b.hash());
  check('world has plants, portals, buttons', ['tree', 'portal', 'button', 'berrybush'].every(t => a.list.some(o => o.type === t)));
  check('the start and plaza are walkable', a.walkable(...DQ.POI.start) && a.walkable(...DQ.POI.plaza));
  const pth = a.path(...DQ.POI.start, 36, 47, { cap: 6000 }); check('road path from start to plaza exists', !!pth && pth.length > 10);
  // rooms
  const w = DQ.generateStory(); const solid = DQ.blockId('cobble');
  const build = (x0, y0, n, hgt, door, light) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const e = x === 0 || y === 0 || x === n - 1 || y === n - 1; if (!e) continue; if (door && x === door[0] && y === door[1]) continue; const col = []; for (let k = 0; k < hgt; k++) col.push(solid); w.setColumn(x0 + x, y0 + y, col); } };
  const free = (x, y) => { w.setColumn(x, y, []); };
  for (let y = 40; y < 52; y++) for (let x = 40; x < 52; x++) free(x, y);
  build(41, 41, 5, 2, [2, 4]); w.addObj('door', 43, 45, { silent: true }); w.addObj('torch', 42, 42, { silent: true });
  let rooms = DQ.detectRooms(w, { x0: 30, x1: 60, y0: 30, y1: 60 }).filter(r => r.ok); check('walled room with door + light is a room', rooms.length === 1 && rooms[0].type === 'Snug', JSON.stringify(rooms.map(r => r.type)));
  w.addObj('bed', 44, 43, { silent: true }); rooms = DQ.detectRooms(w, { x0: 30, x1: 60, y0: 30, y1: 60 }).filter(r => r.ok); check('a bed makes it a Bedroom', rooms[0] && rooms[0].type === 'Bedroom');
  w.setColumn(44, 41, [solid]); const leak = DQ.detectRooms(w, { x0: 30, x1: 60, y0: 30, y1: 60 }); check('a 1-high gap in the wall leaks', !leak.some(r => r.ok) && leak.some(r => !r.ok && /2 blocks/.test(r.leak[2])), JSON.stringify(leak.map(r => r.ok + (r.leak || []).join())));
  w.setColumn(44, 41, [solid, solid]); w.removeObj(w.objAt(42, 42), true); rooms = DQ.detectRooms(w, { x0: 30, x1: 60, y0: 30, y1: 60 }); check('no light = no room', !rooms.some(r => r.ok) && rooms.some(r => /light/.test(r.leak[2])));
  build(41, 48, 11, 2, [5, 10]); w.addObj('door', 46, 58, { silent: true }); rooms = DQ.detectRooms(w, { x0: 30, x1: 60, y0: 30, y1: 70 }); check('rooms over 64 cells are refused', !rooms.some(r => r.ok && r.size > 64));
  // inventory
  H.newGame(); const S = DQ.S; for (let i = 0; i < 60; i++) { S.bag['x' + i] = 1; } DQ.ITEMS.x1 = DQ.ITEMS.x1 || { id: 'x1', kind: 'mat', stack: 99, name: 'x' }; 
  S.bag = {}; for (const k of Object.keys(DQ.ITEMS).filter(k => DQ.ITEMS[k].kind === 'mat' || DQ.ITEMS[k].kind === 'block')) DQ.inv.add(k, 99, true);
  check('stacks cap at 99', DQ.inv.count('branch') === 99);
  check('add returns 0 when the stack is full', DQ.inv.add('branch', 5, true) === 0);
  S.bag = { cobble: 21, branch: 5, stick: 1, banner: 1 }; const lost = DQ.inv.dropBundle(); check('KO bundle takes half of materials only', lost && lost.cobble === 10 && lost.branch === 2 && S.bag.stick === 1 && S.bag.banner === 1, JSON.stringify(lost));
  // belly and starvation
  const hero = S.hero; hero.belly = 0; hero.hp = 30; tick(9); check('starving drains HP', hero.hp < 30, hero.hp);
  DQ.inv.add('crumpet', 1, true); const hp = hero.hp; DQ.eat('crumpet'); check('eating restores belly and HP', hero.belly >= 30 && hero.hp > hp);
  // day/night clock
  S.clock.hour = 23.99; DQ.clockTick(.5 * 60 * DQ.tuning.dayMinutes / 24 * 2); check('the day rolls over', S.clock.day === 2 && S.clock.hour < 1, JSON.stringify(S.clock));
  check('night is darker than day', DQ.ambient(2).a < DQ.ambient(12).a);
  // save / load round trip
  DQ.devBeat('rooms'); H.skipTalk(); tick(2); H.skipTalk(); tick(2); H.skipTalk();
  H.wall(41, 53, 5, 2, [2, 4]); H.place(43, 57, 'door'); H.place(42, 54, 'torch'); tick(1);
  const before = { hash: S.world.hash(), cheer: S.town.cheer, bag: JSON.stringify(S.bag), res: S.residents.length, quests: JSON.stringify(S.quests), rooms: S.town.rooms.length };
  const data = JSON.parse(JSON.stringify(DQ.serialize())); DQ.deserialize(data); const S2 = DQ.S;
  check('save/load keeps the world', S2.world.hash() === before.hash);
  check('save/load keeps progress', S2.town.cheer === before.cheer && JSON.stringify(S2.bag) === before.bag && S2.residents.length === before.res && JSON.stringify(S2.quests) === before.quests, JSON.stringify([S2.town.cheer, before.cheer]));
  tick(1); check('rooms are rebuilt after load', S2.town.rooms.length === before.rooms, S2.town.rooms.length + '/' + before.rooms);
  check('no errors', game.errors.length === 0 && DQ.errors.length === 0, game.errors.map(e => e.message || e).concat(DQ.errors).join('|').slice(0, 500));
  return H;
}
