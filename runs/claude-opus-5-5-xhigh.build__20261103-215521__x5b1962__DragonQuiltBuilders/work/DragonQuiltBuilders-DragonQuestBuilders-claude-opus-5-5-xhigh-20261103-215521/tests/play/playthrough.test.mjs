// The scripted playthrough: New Game -> Chapter Clear -> results -> credits -> free play. The Autopilot plays through the
// real builder, physics, crafting, rooms and story code; every quest completes through its own triggers. Cheats used:
// god mode, teleports for long walks, time skips, extra materials and a fast helper rate for the Hall.
export default async function ({ load, check }) {
  const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ } = L; await game.booted;
  game.advance(.2); game.go('play', { name: 'Tester' }); game.advance(.6);
  const ctx = DQ.ctx, b = ctx.builder, w = ctx.world, T = 16, B = k => DQ.blockId(k), qs = ctx.quests;
  const ap = new DQ.Autopilot(ctx, b, { cheats: { teleport: true }, autoTalk: true }); ctx.driver = ap; ctx.dev.god = true; b.cheatGod = true;
  const fails = []; ctx.events.on('apFail', f => fails.push(f.task + ':' + f.reason)); let tangles = 0; ctx.events.on('bossTangled', () => tangles++);
  let simT = 0;
  const run = (task, maxS = 240) => { ap.run(task); let t = 0; while (!ap.done && t < maxS) { game.advance(.25); t += .25; simT += .25; } return ap.done; };
  const step = (s = 1) => { game.advance(s); simT += s; };
  const st = id => qs.s[id].status, done = id => st(id) === 'done';
  const near = (x, y, r = 30) => (o) => Math.hypot(o.x - x, o.y - y) <= r;
  // ---- helpers (generators over the autopilot)
  function* gatherPlant(id, item, n) { const tried = new Set(); for (let k = 0; k < 40 && b.bag.count(item) < n; k++) { const o = ctx.objects.list.filter(q => q.id === id && !q.gone && !tried.has(q)).sort((p, q) => DQ.d2(p.x, p.y, b.cx, b.cy) - DQ.d2(q.x, q.y, b.cx, b.cy))[0]; if (!o) break; tried.add(o); yield* ap.breakAt(o.x, o.y, o.z); yield .6; } }
  const skip = new Set();
  function* gatherBlock(ids, item, n, cx = b.cx, cy = b.cy, rad = 40) {
    for (let k = 0; k < 120 && b.bag.count(item) < n; k++) {
      let best = null, bd = 1e9;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const x = cx + dx, y = cy + dy; if (!w.inside(x, y, 0)) continue; if (ctx.town.planted && ctx.town.inside(x, y, 1)) continue; const t = w.topZ(x, y), surf = ids.includes(B('grass')); for (let z = surf ? t - 1 : Math.max(1, t - (ids.includes(B('log')) ? 10 : 4)); z < t; z++) if (ids.includes(w.get(x, y, z)) && (!DQ.SOLID[w.get(x, y, z + 1)] || !DQ.SOLID[w.get(x + 1, y, z)] || !DQ.SOLID[w.get(x, y + 1, z)] || !DQ.SOLID[w.get(x - 1, y, z)] || !DQ.SOLID[w.get(x, y - 1, z)])) { const d = DQ.d2(x, y, b.cx, b.cy) + (t - 1 - z) * 9; if (d < bd && !w.objIdx.get(w.idx(x, y, z + 1)) && !DQ.LIQUID[w.get(x, y, z + 1)] && !skip.has(x + ',' + y + ',' + z)) { bd = d; best = [x, y, z]; } } }
      if (!best) break; const ok = yield* ap.breakAt(...best, { timeout: 10 }); if (!ok) skip.add(best.join(',')); yield .7;
    }
  }
  /** lint from Lintlings in the Glen (the region spawner makes them) */
  function* getLint(n) {
    for (let k = 0; k < 12 && b.bag.count('lint') < n; k++) {
      let m = ctx.monsters.list.find(q => !q.dead && (q.kind === 'lintling' || q.kind === 'dyedLintling') && !q.fixed && Math.hypot(q.cx - 56, q.cy - 58) < 30);
      if (!m) { ap.teleport(56, 58, w.topZ(56, 58)); yield .2; for (let i = 0; i < 6 && !m; i++) { ctx.monsters.trySpawn(b, false); m = ctx.monsters.list.find(q => !q.dead && (q.kind === 'lintling' || q.kind === 'dyedLintling') && Math.hypot(q.cx - b.cx, q.cy - b.cy) < 30); } }
      if (!m) { yield 1; continue; }
      yield* ap.walkTo(m.cx, m.cy, m.L, { radius: 1.5 }); yield* ap.fight({ range: 12, timeout: 10, filter: q => q === m }); yield* ap.collect(5);
    }
  }
  function* talk(id, choices = [0]) { yield* ap.talk(id, choices); yield .3; }
  /** a room: walls two high (one wall block), a door in the middle of the south wall, objects inside */
  function* room(x0, y0, wd, dp, Lz, wall, door, objs, accent) {
    const cells = [];
    for (let z = Lz; z < Lz + 2; z++) for (let y = y0; y < y0 + dp; y++) for (let x = x0; x < x0 + wd; x++) { const edge = x === x0 || y === y0 || x === x0 + wd - 1 || y === y0 + dp - 1; if (!edge) continue; if (x === x0 + (wd >> 1) && y === y0 + dp - 1) continue; if (DQ.OPAQUE[w.get(x, y, z)]) continue; cells.push({ x, y, z, block: B(accent && x === x0 + 1 && y === y0 && z === Lz ? accent : wall) }); }
    for (const [dx, dy, id] of objs) { const x = x0 + dx, y = y0 + dy; ap.teleport(x, y + (dy === dp - 2 ? -1 : 1), Lz); yield .1; yield* ap.placeAt(x, y, Lz, id, { facing: 1, noWalk: true }); }
    ap.teleport(x0 + (wd >> 1), y0 + dp + 1, Lz); yield .1;
    yield* ap.buildStamp(cells);
    yield* ap.placeAt(x0 + (wd >> 1), y0 + dp - 1, Lz, door, { facing: 1 });
    yield .8;
  }
  function* clearArea(x0, y0, x1, y1, Lz) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { for (let z = Lz; z < w.H; z++) { const o = ctx.objects.at(x, y, z); if (o) ctx.objects.remove(o, { silent: true }); if (DQ.SOLID[w.get(x, y, z)]) w.set(x, y, z, 0, { silent: true }); } if (!DQ.SOLID[w.get(x, y, Lz - 1)]) w.set(x, y, Lz - 1, B('earth'), { silent: true }); } yield; }
  const craft = (r, n = 1) => ap.craft(r, n);
  // ===================================================== M1 Come Undone
  step(1);
  check('M1 starts after waking', st('M1') === 'active', st('M1'));
  run((function* () { yield* ap.walkTo(35, 36, 8, { radius: .3 }); yield .5; })());
  check('M1 step 1: the ledge', qs.s.M1.step >= 1, JSON.stringify(qs.s.M1));
  run((function* () { for (const [x, y] of [[38, 37], [39, 37], [41, 39]]) yield* ap.breakAt(x, y, 7); yield 1; })());
  check('M1 step 2: three earth', qs.s.M1.step >= 2, JSON.stringify([qs.s.M1, b.bag.count('earth')]));
  step(.5); run((function* () { yield* ap.fight({ range: 16, timeout: 30 }); yield 1.5; })());
  check('M1 step 3: the Lintling defeated', qs.s.M1.step >= 3, JSON.stringify([qs.s.M1, ctx.monsters.list.map(m => m.kind)]));
  check('picking up lint taught the torch', ctx.crafting.knows('torch'));
  run((function* () { yield* gatherPlant('deadBush', 'branch', 2); yield* craft('torch'); })());
  check('M1 step 4: a torch crafted from the Bag', qs.s.M1.step >= 4, JSON.stringify(qs.s.M1));
  run((function* () { yield* ap.walkTo(44, 41, 7, { radius: .5 }); yield* ap.placeAt(45, 41, 7, 'torch'); yield .5; })());
  check('M1 step 5: the tunnel is lit', ctx.flags.tunnelLit && qs.s.M1.step >= 5, JSON.stringify(qs.s.M1));
  run((function* () { yield* ap.walkTo(52, 41, 10, { radius: 1 }); yield 1; })());
  check('M1 done: out of the Hollow', done('M1') && b.bag.count('banner') === 1, JSON.stringify([qs.s.M1, b.cx, b.cy, b.L]));
  // ===================================================== M2 Plant the Banner
  run((function* () { yield* ap.walkTo(72, 78, 9, { radius: 1 }); yield .5; ap.select('banner'); ap.want.place = true; yield 1.5; })());
  check('M2 done: Thimbleton founded', done('M2') && ctx.town.planted && ctx.town.rShown >= 1, JSON.stringify(qs.s.M2));
  check('Wren arrived', !!ctx.npcs.get('wren'));
  check('the bench and door notions', ctx.crafting.knows('bench') && ctx.crafting.knows('latticeDoor'));
  // ===================================================== M3 Wren's Bed
  step(1); check('Wren offers a quest (!)', qs.balloonFor('wren') === '!', qs.balloonFor('wren'));
  run(talk('wren')); check('M3 started', st('M3') === 'active', st('M3'));
  run((function* () { yield* gatherPlant('tuft', 'straw', 8); yield* gatherPlant('cottonPuff', 'cotton', 1); })(), 300);
  check('M3: straw and cotton', b.bag.count('straw') >= 4 && b.bag.count('cotton') >= 1 && qs.s.M3.step >= 2, JSON.stringify([b.bag.count('straw'), b.bag.count('cotton'), qs.s.M3]));
  run((function* () { yield* gatherPlant('deadBush', 'branch', 9); yield* gatherBlock([B('grass'), B('earth')], 'earth', 40, 80, 88); })(), 400);
  run((function* () { yield* craft('bench'); yield* clearArea(64, 78, 65, 81, 9); ap.teleport(64, 80, 9); yield .2; yield* ap.placeAt(64, 79, 9, 'bench', { noWalk: true }); yield .5; })());
  check('M3 step 3: the bench placed', qs.s.M3.step >= 3, JSON.stringify([qs.s.M3, b.bag.count('bench')]));
  run((function* () { yield* craft('strawBed'); yield* craft('latticeDoor'); yield* craft('latticeDoor'); if (b.bag.count('lint') < 1) yield* getLint(1); if (b.bag.count('branch') < 1) yield* gatherPlant('deadBush', 'branch', 1); yield* craft('torch'); yield .5; })(), 300);
  check('M3 step 4: bed and door crafted', qs.s.M3.step >= 4, JSON.stringify([qs.s.M3, b.bag.ids()]));
  // the bedroom: the old 5 x 5 outline at (62, 67), one more layer on top, the door in its gap
  run((function* () {
    const cells = []; for (let y = 67; y <= 71; y++) for (let x = 62; x <= 66; x++) { const edge = x === 62 || x === 66 || y === 67 || y === 71; if (!edge || (x === 64 && y === 71)) continue; if (!DQ.SOLID[w.get(x, y, 9)]) cells.push({ x, y, z: 9, block: B('earth') }); cells.push({ x, y, z: 10, block: B('earth') }); }
    ap.teleport(64, 69, 9); yield .2; yield* ap.placeAt(63, 68, 9, 'strawBed', { noWalk: true, facing: 1 }); yield* ap.placeAt(65, 68, 9, 'torch', { noWalk: true });
    ap.teleport(64, 73, 9); yield .2; yield* ap.buildStamp(cells); yield* ap.placeAt(64, 71, 9, 'latticeDoor', { facing: 1 }); yield 1.5;
  })(), 300);
  check('M3: a Bedroom formed', ctx.rooms.has('bedroom'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / ') + ' ' + (ctx.rooms.diagnose(64, 69, 9) || ''));
  check('Wren waits with a ? to report', qs.balloonFor('wren') === '?' || st('M3') === 'ready', st('M3'));
  run(talk('wren')); check('M3 done (reported)', done('M3') && ctx.crafting.knows('chest'));
  // ===================================================== M4 A Place to Make Things: a workshop around the bench
  run(talk('wren')); check('M4 started', st('M4') === 'active', st('M4'));
  run((function* () { const t = w; let tree = null; for (let r = 4; r < 40 && !tree; r++) for (let dy = -r; dy <= r && !tree; dy++) for (let dx = -r; dx <= r && !tree; dx++) { const x = 72 + dx, y = 76 + dy; for (let z = 8; z < 14; z++) if (t.get(x, y, z) === B('log')) { tree = [x, y, z]; break; } } if (tree) { for (let z = tree[2]; z < tree[2] + 5; z++) if (t.get(tree[0], tree[1], z) === B('log')) yield* ap.breakAt(tree[0], tree[1], z, { timeout: 10 }); } yield 1; })(), 200);
  run((function* () { yield* gatherBlock([B('log')], 'log', 2, 60, 62); yield* gatherPlant('deadBush', 'branch', 7); yield* getLint(3); yield* craft('chest'); yield* craft('latticeDoor'); yield* craft('torch'); yield* craft('torch'); })(), 500);
  check('M4 step 1: a chest', qs.s.M4.step >= 1, JSON.stringify([qs.s.M4, b.bag.count('log'), b.bag.count('chest')]));
  run((function* () {
    ap.teleport(65, 80, 9); yield .2; yield* ap.placeAt(65, 79, 9, 'chest', { noWalk: true }); yield* ap.placeAt(64, 81, 9, 'torch', { noWalk: true });
    const cells = []; for (let y = 77; y <= 82; y++) for (let x = 63; x <= 66; x++) { const edge = x === 63 || x === 66 || y === 77 || y === 82; if (!edge || (x === 65 && y === 82)) continue; if (!DQ.SOLID[w.get(x, y, 9)]) cells.push({ x, y, z: 9, block: B('earth') }); cells.push({ x, y, z: 10, block: B('earth') }); }
    ap.teleport(65, 84, 9); yield .2; yield* gatherBlock([B('grass'), B('earth')], 'earth', 30, 80, 90); ap.teleport(65, 84, 9); yield* ap.buildStamp(cells); yield* ap.placeAt(65, 82, 9, 'latticeDoor', { facing: 1 }); yield 1.5;
  })(), 400);
  check('M4: a Workshop formed', ctx.rooms.has('workshop'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / ') + ' ' + (ctx.rooms.diagnose(64, 79, 9) || ''));
  run(talk('wren')); check('M4 done', done('M4'), st('M4'));
  check('Town Level 2', ctx.town.level >= 2, ctx.town.cheer);
  ctx.clock.setHour(9); step(2); check('Mortimer moved in', !!ctx.npcs.get('mortimer'));
  if (process.env.PT_UNTIL === 'M4') { console.log('fails', fails.join(' | ')); return; }
  // ===================================================== M5 Club Med
  run(talk('mortimer')); check('M5 started', st('M5') === 'active', st('M5'));
  run((function* () { ap.teleport(30, 40, w.topZ(30, 40)); yield .3; yield* gatherBlock([B('gravel')], 'pebble', 5, 30, 40, 26); })(), 300);
  check('M5: pebbles from gravel', b.bag.count('pebble') >= 3, b.bag.count('pebble'));
  run((function* () { yield* gatherPlant('deadBush', 'branch', 3); yield* craft('cobbleClub'); b.equipItem('cobbleClub'); yield .2; })(), 200);
  check('M5 step 2: the club crafted', qs.s.M5.step >= 2, JSON.stringify([qs.s.M5, b.bag.count('branch'), b.bag.count('pebble')]));
  run(talk('mortimer')); check('M5 done: the Spin Stitch', done('M5') && ctx.flags.spinStitch, JSON.stringify(qs.s.M5));
  run((function* () { ap.select('heartpatch'); ap.want.place = true; yield .5; })()); check('a Heartpatch raises max HP', b.maxHp >= 50, b.maxHp);
  // ===================================================== M6 Guard Duty, M7 Supper Time (rooms east of the plaza)
  run(talk('mortimer')); check('M6 started with the rack notion', st('M6') === 'active' && ctx.crafting.knows('weaponRack'));
  run((function* () { yield* gatherBlock([B('log')], 'log', 6, 86, 58); yield* craft('planks', 6); yield* gatherBlock([B('gravel')], 'pebble', 3, 30, 40, 26); yield* gatherPlant('deadBush', 'branch', 12); yield* gatherPlant('cottonPuff', 'cotton', 2); yield* getLint(4); yield* craft('weaponRack'); yield* craft('latticeDoor'); yield* craft('torch'); yield* craft('torch'); yield* craft('torch'); yield* craft('torch'); })(), 400);
  run((function* () { yield* gatherBlock([B('grass'), B('earth')], 'earth', 40, 92, 92); yield* clearArea(77, 65, 83, 71, 9); yield* room(78, 66, 5, 5, 9, 'earth', 'latticeDoor', [[1, 1, 'weaponRack'], [3, 1, 'torch'], [1, 3, 'torch']]); })(), 500);
  check('M6: a Guard Post formed', ctx.rooms.has('guardPost'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / ') + ' ' + (ctx.rooms.diagnose(79, 67, 9) || ''));
  run(talk('mortimer')); check('M6 done', done('M6'), st('M6'));
  run(talk('mortimer')); check('M7 started', st('M7') === 'active', st('M7'));
  run((function* () { yield* craft('table'); yield* craft('stool'); yield* craft('stool'); yield* craft('latticeDoor'); yield* craft('torch'); yield* gatherBlock([B('grass'), B('earth')], 'earth', 40, 92, 60); yield* clearArea(77, 81, 83, 87, 9); yield* room(78, 82, 5, 5, 9, 'earth', 'latticeDoor', [[2, 1, 'table'], [1, 1, 'stool'], [3, 1, 'stool'], [1, 3, 'torch']]); })(), 500);
  check('M7: a Mess Hall formed', ctx.rooms.has('messHall'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / ') + ' ' + (ctx.rooms.diagnose(79, 83, 9) || ''));
  run(talk('mortimer')); check('M7 done', done('M7'), st('M7'));
  check('Town Level 3', ctx.town.level >= 3, ctx.town.cheer);
  ctx.clock.setHour(9); step(2); check('Marigold moved in', !!ctx.npcs.get('marigold'));
  // ===================================================== M8 Hearth and Home
  run(talk('marigold')); check('M8 started', st('M8') === 'active' && ctx.crafting.knows('hearthPot'));
  run((function* () { ap.teleport(22, 26, w.topZ(22, 26)); yield .3; yield* gatherBlock([B('stone')], 'stone', 20, 22, 30, 16); yield* gatherBlock([B('coal')], 'coal', 7, 30, 30, 30); yield* gatherBlock([B('copperOre')], 'copperOre', 6, 30, 30, 30); })(), 700);
  check('M8 step 1: stone and coal', qs.s.M8.step >= 1, JSON.stringify([qs.s.M8, b.bag.count('stone'), b.bag.count('coal')]));
  run((function* () { yield* craft('hearthPot'); yield* gatherBlock([B('log')], 'log', 6, 86, 58); yield* gatherPlant('deadBush', 'branch', 14); yield* craft('chest'); yield* craft('chest'); yield* craft('latticeDoor'); yield* craft('latticeDoor'); yield* getLint(4); yield* craft('torch', 4); })(), 500);
  run((function* () { yield* gatherBlock([B('grass'), B('earth')], 'earth', 40, 50, 80); yield* clearArea(55, 73, 61, 79, 9); yield* room(56, 74, 5, 5, 9, 'earth', 'latticeDoor', [[1, 1, 'hearthPot'], [3, 1, 'chest'], [1, 3, 'torch']]); })(), 500);
  check('M8: a Kitchen formed', ctx.rooms.has('kitchen'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / '));
  run((function* () { ap.teleport(112, 40, w.topZ(112, 40)); yield .3; yield* gatherPlant('puffball', 'puffball', 2); })(), 300);
  run(talk('marigold')); check('M8 done: stew notion', done('M8') && ctx.crafting.knows('stew'), JSON.stringify(qs.s.M8));
  // ===================================================== M9 Copper Bottomed
  run(talk('mortimer')); check('M9 started', st('M9') === 'active' && ctx.crafting.knows('forge'));
  run((function* () { yield* gatherBlock([B('grass'), B('earth')], 'earth', 50, 50, 90); yield* craft('cobble', 1); yield* craft('forge'); })(), 300);
  check('M9 step 1: the forge', qs.s.M9.step >= 1, JSON.stringify([qs.s.M9, b.bag.ids()]));
  run((function* () { yield* clearArea(55, 82, 61, 88, 9); yield* room(56, 83, 5, 5, 9, 'earth', 'latticeDoor', [[2, 1, 'forge'], [3, 3, 'chest'], [1, 3, 'torch']]); })(), 500);
  check('M9: a Smithy formed', ctx.rooms.has('smithy'), JSON.stringify(ctx.rooms.list.map(r => r.type)) + ' fails: ' + fails.slice(-4).join(' / '));
  run((function* () { yield* craft('copperIngot', 4); yield* craft('copperBodkin'); b.equipItem('copperBodkin'); yield .3; })(), 200);
  if (st('M9') === 'ready') run(talk('mortimer'));
  check('M9 done: a Copper Bodkin', done('M9'), JSON.stringify([qs.s.M9, b.bag.count('copperIngot')]));
  // ===================================================== S1 Lintwick's Lament (Cheer toward Lv4)
  run((function* () { yield* ap.walkTo(116, 32, w.topZ(116, 32), { radius: 1.5 }); yield .5; const cage = ctx.objects.find('cage'); if (cage) { DQ.Interact.cage(ctx); yield* ap.readDialog([0]); yield .2; for (let k = 0; k < 30 && !cage.gone; k++) { ap.want.cursor = { x: cage.x, y: cage.y, z: cage.z }; ap.want.swing = true; yield .45; } } yield 1; })(), 200);
  check('S1: Lintwick freed', ctx.flags.lintwickFreed && !!ctx.npcs.get('lintwick'), JSON.stringify([qs.s.S1, !!ctx.objects.find('cage')]));
  run((function* () { yield* ap.walkTo(72, 80, 9, { radius: 1 }); yield 2; })());
  check('S1: Lintwick led home', qs.s.S1.step >= 2, JSON.stringify(qs.s.S1));
  run((function* () { for (const p of [['berryBush', 'thimbleberry', 2], ['cottonPuff', 'cotton', 4]]) yield* gatherPlant(...p); yield* gatherPlant('tuft', 'straw', 4); yield* craft('dyeRed'); yield* craft('feltRed'); yield* craft('strawBed'); yield* gatherPlant('deadBush', 'branch', 5); yield* getLint(2); yield* craft('latticeDoor'); yield* craft('torch'); })(), 500);
  run((function* () { yield* clearArea(85, 73, 91, 79, 9); yield* gatherBlock([B('grass'), B('earth')], 'earth', 40, 100, 70); yield* room(86, 74, 5, 5, 9, 'earth', 'latticeDoor', [[2, 1, 'strawBed'], [1, 3, 'torch']], 'feltRed'); })(), 500);
  step(2); check('S1 done: a felt bedroom', done('S1') || st('S1') === 'ready', JSON.stringify([qs.s.S1, ctx.rooms.list.map(r => r.type + (r.felt ? '*' : ''))]) + ' ' + ctx.rooms.diagnose(88, 76, 9) + ' fails: ' + fails.slice(-4).join(' / ') + ' felt ' + b.bag.count('feltRed') + ' bed ' + b.bag.count('strawBed'));
  if (st('S1') === 'ready') run(talk('lintwick'));
  if (process.env.PT_UNTIL === 'S1') { console.log('fails', fails.slice(-6).join(' | ')); return; }
  // comfort bubbles at noon
  ctx.clock.setHour(12.5); step(3); run((function* () { for (const bb of ctx.npcs.bubbles.slice()) { yield* ap.walkTo(Math.floor(bb.x / T), Math.floor(bb.y / T), w.topZ(Math.floor(bb.x / T), Math.floor(bb.y / T)), { radius: .5 }); yield .3; } })(), 200);
  check('Town Level 4', ctx.town.level >= 4, ctx.town.cheer);
  ctx.clock.setHour(9); step(3); check('the Professor moved in', !!ctx.npcs.get('professor'));
  // ===================================================== M10 The Quilters' Hall
  run(talk('professor')); check('M10 started: the Hall Pattern', st('M10') === 'active' && b.bag.count('hallPattern') === 1, st('M10'));
  run((function* () { yield* clearArea(65, 57, 77, 67, 9); ap.teleport(71, 68, 9); yield .3; ap.select('hallPattern'); ap.want.place = true; yield .3; ap.want.cursor = { x: 71, y: 62, z: 9, place: { x: 71, y: 62, z: 9 } }; yield .3; ap.want.cursor = { x: 71, y: 62, z: 9, place: { x: 71, y: 62, z: 9 } }; ap.want.place = true; yield .5; ap.want.cursor = null; })());
  check('M10 step 1: the Pattern laid out', ctx.flags.hallPlaced && ctx.town.patterns.length === 1, JSON.stringify([ctx.town.placing && ctx.town.placing.why, ctx.town.patterns.length]));
  run((function* () { const ch = ctx.objects.list.find(o => o.def.chest && ctx.town.inside(o.x, o.y)); ap.teleport(ch.x, ch.y + 1, ch.z); yield .2; DQ.Menus.openChest(ctx, ch); yield .2; ctx.ui.top.makeTown(); ctx.ui.closeAll(); yield .3; })());
  check('M10 step 2: a Town Chest', ctx.flags.townChest && !!ctx.town.townChest(), JSON.stringify(qs.s.M10));
  // extra materials for the Hall (a cheat), a fast helper rate, and the builder lends a hand
  const tc = ctx.town.townChest(); for (const [k, n] of [['cobble', 40], ['planks', 80], ['feltRed', 8], ['feltBlue', 8], ['feltYellow', 8], ['plankDoor', 1], ['lantern', 4]]) tc.data.store.add(k, n);
  DQ.tuning.set('helperRate', 60); ctx.clock.setHour(9);
  step(30);
  check('helpers build from the Town Chest', ctx.town.patterns[0] && ctx.town.patterns[0].progress > 10, ctx.town.patterns[0] && ctx.town.patterns[0].progress);
  if (!ctx.town.patterns[0]) return;
  run((function* () { const p = ctx.town.patterns[0]; for (const [k, n] of [['cobble', 40], ['planks', 80], ['feltRed', 8], ['feltBlue', 8], ['feltYellow', 8], ['plankDoor', 1], ['lantern', 4]]) b.bag.add(k, n); for (let k = 0; k < 3 && !p.done; k++) { yield* ap.buildStamp(p.cells.filter(c => !c.done)); yield 2; ctx.town.checkPattern(p); } })(), 700);
  step(2);
  check('M10: the Hall complete', ctx.town.patterns[0].done, ctx.town.patterns[0].progress + '/' + ctx.town.patterns[0].total + ' left ' + JSON.stringify(ctx.town.patterns[0].cells.filter(c => !c.done)) + ' fails ' + fails.slice(-3).join(' / '));
  check('the Quilters\' Hall is a room', ctx.rooms.has('hall'), JSON.stringify(ctx.rooms.list.map(r => r.type)));
  run(talk('professor')); check('M10 done: the ballista notion', done('M10') && ctx.crafting.knows('ballista'), JSON.stringify(qs.s.M10));
  // ===================================================== M11 Needle in a Haystack
  run(talk('professor')); check('M11 started', st('M11') === 'active', st('M11'));
  run((function* () { ap.teleport(30, 18, w.topZ(30, 18)); yield .5; yield* ap.walkTo(23, 18, 6, { radius: 2 }); yield 2; })(), 120);
  const golem = ctx.bosses.list.find(m => m.kind === 'buttonGolem');
  check('Sir Buttonsworth wakes', golem && golem.awake, JSON.stringify([qs.s.M11, golem && golem.awake]));
  run((function* () { yield* ap.fight({ range: 20, timeout: 120, filter: m => m.kind === 'buttonGolem' || m.kind === 'lintling' }); yield 2; })(), 200);
  check('M11 step 2: Buttonsworth defeated', ctx.flags.boss_buttonGolem, golem && golem.hp);
  run((function* () { for (let k = 0; k < 12 && !b.bag.count('goldenNeedle'); k++) { const d = ctx.drops.list.find(q => q.id === 'goldenNeedle'); if (!d) break; yield* ap.walkTo(Math.floor(d.x / T), Math.floor(d.y / T), Math.floor(d.z / T), { radius: .3 }); yield .6; } })(), 60);
  check('the Golden Needle, and the Seam Ripper notion', b.bag.count('goldenNeedle') === 1 && ctx.crafting.knows('seamRipper'), JSON.stringify(b.bag.keys));
  run((function* () { yield* craft('seamRipper'); b.equipItem('seamRipper'); })(), 200);
  if (st('M11') === 'ready') run(talk('professor'));
  check('M11 done: the Seam Ripper', done('M11'), JSON.stringify([qs.s.M11, b.bag.count('steelThread'), b.bag.count('copperIngot')]));
  // ===================================================== M12 Rip It Up
  run(talk('professor')); check('M12 started', st('M12') === 'active', st('M12'));
  run((function* () { ap.teleport(97, 113, 9); yield .4; yield* ap.breakAt(99, 113, 10, { timeout: 6 }); yield 1; })());
  check('M12 step 1: the Knot Gate cut', ctx.flags.gateCut && w.get(99, 112, 9) === 0, JSON.stringify(qs.s.M12));
  run((function* () { yield* ap.walkTo(124, 116, 9, { radius: 1, tpOver: 60 }); yield* ap.walkTo(124, 123, 22, { radius: 1.5 }); yield 1; })(), 200);
  check('M12 step 2: the Spire top', qs.s.M12.step >= 2, JSON.stringify([qs.s.M12, b.cx, b.cy, b.L]));
  run((function* () { const ped = ctx.objects.find('goldenThreadPedestal'); const r = DQ.Interact.objAct(ctx, b, ped); r.act(); yield 1; })());
  check('M12 done: the Golden Thread', done('M12') && b.bag.count('goldenThread') === 1, JSON.stringify(qs.s.M12));
  // ===================================================== M13 Hold the Line
  check('M13 starts', st('M13') === 'active', st('M13'));
  run((function* () { ap.teleport(72, 80, 9); yield 1.5; })());
  check('M13 step 1: home', qs.s.M13.step >= 1, JSON.stringify(qs.s.M13));
  // build two ballistas and lay out pin traps first
  run((function* () { b.bag.add('log', 4); b.bag.add('copperIngot', 4); b.bag.add('steelThread', 4); yield* craft('ballista', 2); yield* ap.placeAt(80, 76, 9, 'ballista', { facing: 0 }); yield* ap.placeAt(76, 70, 9, 'ballista', { facing: 0 }); b.bag.add('pins', 3); b.bag.add('planks', 1); ctx.crafting.learn('pinTrap', { silent: true }); yield* craft('pinTrap'); yield* ap.placeAt(84, 76, 9, 'pinTrap'); })(), 200);
  check('ballistas placed', ctx.objects.all('ballista').length >= 2, ctx.objects.all('ballista').length);
  run(talk('mortimer', [0])); step(.5);
  check('M13 step 2: the siege begins', ctx.flags.siegeStarted && ctx.siege.active, JSON.stringify([qs.s.M13, ctx.siege.phase]));
  ctx.siege.t = .1; step(1);
  ctx.dev.oneHit = true;
  for (let wave = 0; wave < 3; wave++) {
    run((function* () { for (let k = 0; k < 40 && ctx.siege.phase === 'wave'; k++) { yield* ap.fight({ range: 40, timeout: 20 }); yield .5; const m = ctx.monsters.list.find(q => !q.dead && q.siege); if (m) ap.teleport(m.cx + 1, m.cy, m.L); } })(), 400);
    check('siege wave ' + (wave + 1) + ' cleared', ctx.siege.phase !== 'wave', JSON.stringify([ctx.siege.phase, ctx.siege.wave, ctx.siege.alive()]));
    if (ctx.siege.phase === 'breather') ctx.siege.t = .1; step(1.5);
  }
  ctx.dev.oneHit = false;
  check('M13 done: the siege survived', done('M13') && ctx.flags.siegeDone, JSON.stringify([qs.s.M13, ctx.siege.phase]));
  // ===================================================== M14 Gnarlgrim the Knotted
  step(1.5); const gn = ctx.bosses.list.find(m => m.kind === 'gnarlgrim' && !m.dead);
  check('Gnarlgrim attacks', !!gn && st('M14') === 'active', JSON.stringify([st('M14'), !!gn]));
  if (gn) {
    run((function* () { b.equipItem('seamRipper'); yield .5; b.combo.cancel(); yield* ap.fight({ range: 3, timeout: 1.5, filter: m => m === gn }); })(), 30);
    const before = gn.hp; run((function* () { for (let k = 0; k < 4; k++) { ap.want.swing = true; b.targetFacing = Math.atan2(gn.y - b.y, gn.x - b.x); yield .45; } })(), 10);
    check('wound too tight: plain hits barely hurt', before - gn.hp <= 20, before - gn.hp);
    for (let cycle = 0; cycle < 6 && !gn.dead; cycle++) {
      const inArc = o => { const base = o.data.base === undefined ? o.data.aim : o.data.base, a = Math.atan2(gn.y - (o.y * T + 8), gn.x - (o.x * T + 8)); return Math.abs(DQ.E.angDiff(base, a)) < 1 && Math.hypot(gn.x - o.x * T, gn.y - o.y * T) < 14 * T && w.sight([o.x * T + 8, o.y * T + 8, o.z * T + 11], [gn.x, gn.y, gn.z + 12]); };
      let bal = ctx.objects.list.filter(o => o.def.ballista && !o.data.broken && !o.gone && inArc(o))[0];
      if (!bal) { // no ballista has him in its arc: build one where it can see him (the nearest free cell with a clear line)
        let spot = null;
        for (let rr = 3; rr <= 8 && !spot; rr++) for (let k = 0; k < 24 && !spot; k++) { const an = k / 24 * Math.PI * 2, x = Math.round(gn.cx + Math.cos(an) * rr), y = Math.round(gn.cy + Math.sin(an) * rr); if (!w.inside(x, y, 1)) continue; const Lb = w.topZ(x, y), a = Math.atan2(gn.y - (y * T + 8), gn.x - (x * T + 8));
          if (!ctx.objects.canPlace('ballista', x, y, Lb, DQ.quarter(a), b) && w.sight([x * T + 8, y * T + 8, Lb * T + 11], [gn.x, gn.y, gn.z + 12]) && (() => { const sx = x - Math.round(Math.cos(a)), sy = y - Math.round(Math.sin(a)); return w.inside(sx, sy, 1) && w.canStand(sx, sy, w.topZ(sx, sy)); })()) spot = [x, y, Lb, a]; }
        if (spot) { const [x, y, Lb, a] = spot, sx = x - Math.round(Math.cos(a)), sy = y - Math.round(Math.sin(a)); ap.teleport(sx, sy, w.topZ(sx, sy)); step(.1); b.bag.add('ballista', 1); run((function* () { yield* ap.placeAt(x, y, Lb, 'ballista', { facing: DQ.quarter(a), noWalk: true }); })(), 10); bal = ctx.objects.at(x, y, Lb); if (bal && bal.def.ballista) { bal.data.aim = a; bal.data.base = a; } else bal = null; }
        if (!bal) bal = ctx.objects.list.filter(o => o.def.ballista && !o.data.broken && !o.gone)[0]; }
      run((function* () { yield* ap.manBallista(bal, gn, { untilTangled: true, timeout: 14 }); })(), 30);
      run((function* () { for (let k = 0; k < 18 && gn.tangled > 0 && !gn.dead; k++) { const a = Math.atan2(b.y - gn.y, b.x - gn.x); if (Math.hypot(gn.x - b.x, gn.y - b.y) > 30 || Math.abs(DQ.E.angDiff(gn.facing, a)) > 1) { const fx = gn.x + Math.cos(gn.facing) * 26, fy = gn.y + Math.sin(gn.facing) * 26; b.place3(fx, fy, b.z); } b.targetFacing = Math.atan2(gn.y - b.y, gn.x - b.x); ap.want.swing = true; yield .3; } })(), 20);
    }
    run((function* () { yield 3; })(), 10);
    check('manned ballista hits Tangle him', tangles > 0, tangles + ' fails: ' + fails.slice(-6).join(' / '));
    check('Gnarlgrim unravels', gn.dead && ctx.flags.boss_gnarlgrim, JSON.stringify([gn.hp, gn.brain.phase]));
  }
  check('M14 done', done('M14'), st('M14'));
  check('Chapter clear: Town Level 5, the Rift healed', ctx.flags.chapterClear && ctx.town.level === 5 && ctx.flags.riftHealed, JSON.stringify([ctx.town.level, ctx.flags.riftHealed]));
  step(2.5); check('the results screen', game.sceneName === 'results', game.sceneName);
  game.input.tap('ok'); step(1); check('the credits', game.sceneName === 'credits', game.sceneName);
  for (let i = 0; i < 40 && game.sceneName === 'credits'; i++) { game.input.hold('ok', true); step(1); } game.input.hold('ok', false); step(.5);
  check('free play continues after the credits', game.sceneName === 'play' && DQ.ctx === ctx && ctx.flags.chapterClear, game.sceneName);
  check('every main quest done', ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14'].every(done), JSON.stringify(qs.s));
  check('few autopilot failures (unreachable gathering targets are skipped)', fails.filter(f => !/out of reach|still there/.test(f)).length < 4, fails.filter(f => !/out of reach|still there/.test(f)).slice(0, 10).join(' | '));
  check('no engine errors in the playthrough', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')).join(' | '));
  check('the playthrough fits in simulated time', simT < 3600, simT);
}
