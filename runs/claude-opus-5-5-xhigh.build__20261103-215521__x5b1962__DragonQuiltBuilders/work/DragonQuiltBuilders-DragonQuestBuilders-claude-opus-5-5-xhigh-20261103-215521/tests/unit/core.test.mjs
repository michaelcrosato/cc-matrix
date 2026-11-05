// Core systems, headless: the voxel world (bounds, tops, ground, ceilings, collision, water, rays, picking, diffs,
// determinism), rooms (the rule and the types), crafting and notions, inventory, font-safe strings, the About data.
export default async function ({ load, check }) {
  const L = load({ test: { scene: 'title' } }), { game, DQ, E } = L; await game.booted; game.advance(.1);
  const T = 16, B = k => DQ.blockId(k);
  // ---------------- voxel world
  const w = new DQ.VoxelWorld(24, 24, 12);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) DQ.WG.column(w, x, y, 4, 'grass');
  DQ.WG.recalc(w);
  check('topZ after columns', w.topZ(5, 5) === 4, w.topZ(5, 5));
  check('get outside the world is air', w.get(-1, 0, 0) === 0 && w.get(0, 0, 99) === 0);
  w.set(10, 10, 4, B('cobble')); check('set raises topZ', w.topZ(10, 10) === 5);
  w.set(10, 10, 4, 0); check('clearing lowers topZ', w.topZ(10, 10) === 4);
  check('canStand on the surface', w.canStand(5, 5, 4) && !w.canStand(5, 5, 3));
  check('groundAt is the block top', w.groundAt(5 * T + 8, 5 * T + 8, 5, 64, 2) === 64);
  w.set(6, 5, 4, B('cobble'));
  check('a 1-high block is not ground until you are on it', w.groundAt(5 * T + 8, 5 * T + 8, 5, 64, 2) === 64);
  const body = new DQ.VoxelBody({ x: 5 * T + 8, y: 5 * T + 8, z: 64 });
  for (let i = 0; i < 60; i++) { body.vx = 78; body.update(1 / 120, w); }
  check('a 1-high block stops a walker (collide)', body.x < 6 * T && body.x > 5 * T + 8, body.x);
  body.vx = 0; body.onGround = true; body.jump(215); let maxZ = 0; for (let i = 0; i < 120; i++) { body.vx = body.x < 6 * T + 8 ? 60 : 0; body.update(1 / 120, w); maxZ = Math.max(maxZ, body.z); }
  check('a jump clears 1 block and lands on it', body.z === 80 && maxZ > 80, [body.z, maxZ]);
  w.fill(8, 8, 4, 8, 8, 5, B('cobble')); const b2 = new DQ.VoxelBody({ x: 7 * T + 8, y: 8 * T + 8, z: 64 }); b2.jump(215); let top2 = 0; for (let i = 0; i < 120; i++) { b2.vx = 60; b2.update(1 / 120, w); top2 = Math.max(top2, b2.z); }
  check('a 2-high wall cannot be jumped', b2.x < 8 * T && b2.z === 64, [b2.x, b2.z]);
  // ceiling: a roof two blocks over the floor; a jump bumps the head
  w.fill(12, 12, 6, 14, 14, 6, B('planks')); const b3 = new DQ.VoxelBody({ x: 13 * T + 8, y: 13 * T + 8, z: 64 }); b3.jump(300); let top3 = 0; for (let i = 0; i < 90; i++) { b3.update(1 / 120, w); top3 = Math.max(top3, b3.z); }
  check('a ceiling stops a jump (h 28 under a 2-high roof)', top3 <= 96 - 28 + .01, top3);
  check('ceilingAt finds the roof', w.ceilingAt(13 * T + 8, 13 * T + 8, 5, 64) === 96);
  // stairs: a ramp
  w.set(3, 3, 4, B('stairsPlank'), { rot: 0 });
  w.set(4, 3, 4, B('planks')); const gs = w.groundAt(3 * T + 12, 3 * T + 8, 2, 78, 2);
  check('stairs are a ramp', gs > 64 && gs < 80, gs);
  const b4 = new DQ.VoxelBody({ x: 2 * T + 8, y: 3 * T + 8, z: 64 }); for (let i = 0; i < 80; i++) { b4.vx = b4.x < 4 * T + 8 ? 78 : 0; b4.update(1 / 120, w); }
  check('walking up stairs needs no jump', b4.z === 80 && b4.x > 4 * T, [b4.x, b4.z]);
  // water: shallow wades, deep blocks
  w.set(16, 16, 3, DQ.WATER); w.set(17, 16, 3, DQ.WATER); w.set(17, 16, 2, DQ.WATER);
  check('deep water blocks a walker', w.blocksBody(17, 16, { z: 64, step: 2, h: 28 }, 17 * T + 8, 16 * T + 8));
  check('shallow water does not', !w.blocksBody(16, 16, { z: 64, step: 2, h: 28 }, 16 * T + 8, 16 * T + 8));
  // rays and picking
  const hit = w.raycast([5 * T + 8, 5 * T + 8, 200], [0, 0, -1], 400);
  check('raycast down hits the surface block', hit && hit.z === 3 && hit.nz === 1, JSON.stringify(hit));
  for (const yaw of [0, 90, 180, 270]) {
    const v = new E.View('iso', 'Isometric', 45 + yaw, 30, Math.SQRT2, E.VIEWS.iso.zBoost);
    const cx = 20, cy = 6, cz = 3, P = v.p(cx * T + 8, cy * T + 8, cz * T + 16), pk = w.pickScreen(v, P[0], P[1]);
    check('pickScreen finds a top face in iso turn ' + yaw, pk && pk.x === cx && pk.y === cy && pk.z === cz && pk.n[2] === 1, JSON.stringify(pk));
  }
  { const v = E.VIEWS.threequarter, P = v.p(20 * T + 8, 6 * T + 8, 3 * T + 16), pk = w.pickScreen(v, P[0], P[1]); check('pickScreen in three-quarter', pk && pk.x === 20 && pk.y === 6 && pk.z === 3, JSON.stringify(pk)); }
  w.snapshotBase(); w.set(2, 2, 4, B('feltRed')); w.set(2, 2, 3, 0);
  const diff = w.diff(), w2 = new DQ.VoxelWorld(24, 24, 12); for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) DQ.WG.column(w2, x, y, 4, 'grass'); DQ.WG.recalc(w2);
  w2.vox.set(w.base); w2.rotm.set(w.baseRot); DQ.WG.recalc(w2); w2.applyDiff(diff);
  check('diff / applyDiff round trip', w2.hash() === w.hash() && diff.length === 2, [diff.length, w.hash(), w2.hash()]);
  // determinism of the story world
  const A1 = new DQ.VoxelWorld(144, 144, 24), A2 = new DQ.VoxelWorld(144, 144, 24), g1 = DQ.generateWorld(A1), g2 = DQ.generateWorld(A2);
  check('world generation is deterministic', A1.hash() === A2.hash() && g1.objects.length === g2.objects.length, [A1.hash(), A2.hash()]);
  check('every POI has a standing level', Object.entries(g1.poi).every(([k, p]) => k === 'riftCenter' || p.L > 0), JSON.stringify(Object.entries(g1.poi).filter(([k, p]) => k !== 'riftCenter' && !(p.L > 0))));
  check('three Ancient Buttons exist', g1.objects.filter(o => o.id === 'ancientButton').length === 3);
  check('six portals exist', g1.objects.filter(o => o.id === 'portal').length === 6);
  // ---------------- rooms
  const ctx = DQ.Play.make(game, { mode: 'story' }); DQ.ctx = ctx;
  const t = ctx.town, p = ctx.poi.bannerSpot; t.plant(p.x, p.y, p.L, { instant: true });
  const room = (x0, y0, wd, dp, o = {}) => {
    const W = ctx.world, Lz = o.L || p.L;
    for (let y = y0 - 1; y <= y0 + dp; y++) for (let x = x0 - 1; x <= x0 + wd; x++) for (let z = Lz; z < Lz + 4; z++) { W.set(x, y, z, 0, { silent: true }); const ob = ctx.objects.at(x, y, z); if (ob) ctx.objects.remove(ob, { silent: true }); }
    for (let y = y0 - 1; y <= y0 + dp; y++) for (let x = x0 - 1; x <= x0 + wd; x++) W.set(x, y, Lz - 1, B('planks'), { silent: true });
    for (let y = y0; y < y0 + dp; y++) for (let x = x0; x < x0 + wd; x++) { const edge = x === x0 || y === y0 || x === x0 + wd - 1 || y === y0 + dp - 1; if (!edge) continue; const door = o.door !== false && x === (o.doorX !== undefined ? o.doorX : x0 + (wd >> 1)) && y === y0 + dp - 1; if (door) continue; for (let z = Lz; z < Lz + (o.h || 2); z++) W.set(x, y, z, B(o.wall || 'cobble'), { silent: true }); }
    if (o.door !== false) ctx.objects.add('latticeDoor', o.doorX !== undefined ? o.doorX : x0 + (wd >> 1), y0 + dp - 1, Lz, 1, { silent: true });
    for (const [dx, dy, id] of o.objs || []) ctx.objects.add(id, x0 + dx, y0 + dy, Lz, 1, { silent: true });
    if (o.light !== false) ctx.objects.add('torch', x0 + 1, y0 + 1, Lz, 1, { silent: true });
    ctx.rooms.timer = 0; ctx.rooms.detect(); return ctx.rooms.roomAt(x0 + 1, y0 + 1, Lz);
  };
  const X = p.x - 8, Y = p.y - 8;
  check('a 2x1 snug', (room(X, Y, 4, 3) || {}).type === 'snug');
  check('a 3x3 bedroom', (room(X, Y, 5, 5, { objs: [[2, 2, 'strawBed']] }) || {}).type === 'bedroom');
  check('a 1-high wall leaks', !room(X, Y, 5, 5, { h: 1, objs: [[2, 2, 'strawBed']] }));
  check('a missing door: no room', !room(X, Y, 5, 5, { door: false }));
  check('a missing light: no room', !room(X, Y, 5, 5, { light: false }));
  check('a door on a corner does not count', !room(X, Y, 5, 5, { doorX: X }));
  check('too big (over 64 cells) is no room', !room(X - 2, Y - 2, 11, 10));
  check('workshop: bench and chest', (room(X, Y, 6, 5, { objs: [[2, 2, 'bench'], [3, 2, 'chest']] }) || {}).type === 'workshop');
  check('kitchen: hearth pot and chest', (room(X, Y, 6, 5, { objs: [[2, 2, 'hearthPot'], [3, 2, 'chest']] }) || {}).type === 'kitchen');
  check('smithy: forge and chest', (room(X, Y, 6, 5, { objs: [[2, 2, 'forge'], [3, 2, 'chest']] }) || {}).type === 'smithy');
  check('mess hall: table and 2 stools', (room(X, Y, 6, 5, { objs: [[2, 2, 'table'], [3, 2, 'stool'], [2, 3, 'stool']] }) || {}).type === 'messHall');
  check('guard post: rack and 2 lights', (room(X, Y, 6, 5, { objs: [[2, 2, 'weaponRack'], [3, 3, 'torch']] }) || {}).type === 'guardPost');
  check('felt in the walls is noticed', (room(X, Y, 5, 5, { wall: 'feltBlue', objs: [[2, 2, 'strawBed']] }) || {}).felt === true);
  const rr = room(X, Y, 5, 5, { objs: [[2, 2, 'strawBed']] }), Lz = ctx.world.topZ(X - 1, Y - 1);
  ctx.objects.remove(ctx.objects.at(X + 2, Y + 2, rr.L)); ctx.rooms.timer = 0; ctx.rooms.detect();
  check('removing the bed turns a bedroom into a snug', (ctx.rooms.roomAt(X + 1, Y + 1, rr.L) || {}).type === 'snug');
  ctx.rooms.dirty(112, 70); const far = room(110, 68, 5, 5, { objs: [[2, 2, 'strawBed']], L: ctx.world.topZ(110, 68) });
  check('a room outside the border is detected but not in town', far && !far.inTown);
  check('awards are capped by maxAwards', (ctx.rooms.awards.bedroom || 0) <= DQ.ROOM.bedroom.maxAwards);
  check('diagnose names a missing door', (() => { room(X, Y, 5, 5, { door: false }); return /door/i.test(ctx.rooms.diagnose(X + 2, Y + 2, rr.L) || ''); })());
  // ---------------- crafting and notions
  const cr = ctx.crafting, bag = ctx.builder.bag;
  check('pocket recipes need a notion', !cr.knows('torch'));
  cr.trigger('pickup', 'lint'); check('picking up lint teaches the torch', cr.knows('torch'));
  bag.add('branch', 3); bag.add('lint', 2);
  check('craft consumes and gives', cr.craft('torch', 1, ctx.builder, { quiet: true }) === 1 && bag.count('torch') >= 1 && bag.count('branch') === 2);
  check('cannot craft without materials', cr.craft('torch', 5, ctx.builder, { quiet: true }) === 0);
  cr.learn('hearthPot', { silent: true }); bag.add('stone', 4); bag.add('frayedScrap', 1);
  check('an alternate input stands in (frayed scrap for coal)', cr.craft('hearthPot', 1, ctx.builder, { quiet: true }) === 1 && bag.count('frayedScrap') === 0);
  check('every recipe output and input is a known item', DQ.RECIPES.every(r => DQ.ITEMS[r.out] && Object.keys(r.in).every(k => DQ.ITEMS[k])), DQ.RECIPES.filter(r => !DQ.ITEMS[r.out] || Object.keys(r.in).some(k => !DQ.ITEMS[k])).map(r => r.id).join());
  check('every object item has an object', Object.values(DQ.ITEMS).filter(i => i.kind === 'obj').every(i => DQ.OBJECTS[i.obj]));
  // ---------------- inventory
  const b = new DQ.Bag(); b.add('earth', 150);
  check('stacks of 99 overflow into a new slot', b.slots.filter(Boolean).length === 2 && b.count('earth') === 150);
  check('remove takes from stacks', b.remove('earth', 120) && b.count('earth') === 30);
  check('key items live apart', (b.add('banner', 1), b.keys.banner === 1 && b.slots.filter(Boolean).length === 1));
  check('new placeables fill the hotbar', b.hotbar.includes('earth'));
  const st = new DQ.Store(20); b.add('straw', 5); const moved = DQ.storeAll(b, st);
  check('store all moves materials, keeps keys', moved === 35 && st.count('straw') === 5 && b.keys.banner === 1);
  // ---------------- strings are font-safe
  const bad = [];
  const scan = (o, path) => { if (typeof o === 'string') { if (/[^\x20-\x7e♥★←→↑↓•×♪▸©\n]/.test(o.replace(/\{btn:[A-Za-z0-9@]+\}/g, ''))) bad.push(path + ': ' + o.slice(0, 40)); } else if (o && typeof o === 'object') for (const k in o) scan(o[k], path + '.' + k); };
  scan(DQ.QUESTS, 'QUESTS'); scan(DQ.LINES, 'LINES'); scan(DQ.NPCS, 'NPCS'); scan(DQ.PROLOGUE, 'PROLOGUE'); scan(Object.values(DQ.ITEMS).map(i => [i.name, i.desc]), 'ITEMS'); scan(DQ.BLOCKS.filter(Boolean).map(b2 => [b2.name, b2.desc]), 'BLOCKS'); scan(DQ.ROOMS, 'ROOMS'); scan(DQ.LEVELS, 'LEVELS');
  check('every string table is font-safe', !bad.length, bad.slice(0, 5).join(' | '));
  check('no engine errors', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | '));
}
