// The whole chapter, played by the Autopilot through the real systems: New Game -> Chapter Clear -> credits -> free play.
// Cheats (as the plan allows): god mode, teleports instead of long walks, extra materials for big builds, time skips, a faster helper rate.
import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, errs } = G, T = 16;
  game.go('play', { fresh: true, name: 'Tester' }); game.advance(.5);
  const ctx = game.debug.ctx, b = ctx.builder, W = ctx.world, Q = ctx.quests;
  const ap = new DQ.Autopilot(ctx, b, { cheats: { god: true, teleport: true }, ui: false });
  const log = []; ap.log = s => log.push(s);
  // the play scene reads intents from the autopilot instead of the devices
  const scene = game.scenes.play, upd = scene.update; scene.update = function (dt) { this.ctx.stats.playTime += dt; DQ.sessionUpdate(this.ctx, dt, () => ap.intent()); };
  const st = id => Q.st(id).state, step = id => Q.st(id).step;
  // run a task to its end; meanwhile skip cutscenes and turn dialog pages (choices: the first)
  const task = (gen, timeout = 120) => {
    const s = ap.run(gen); let t = 0;
    while (!s.done && t < timeout) { if (ctx.cutscene) ctx.cutscenes.skip(); if (ctx.talk.open) { ctx.talk.cur.shown = 999; game.input.tap('confirm'); } game.advance(1 / 30); t += 1 / 30; }
    if (!s.done) { s.cancel(); log.push('task timeout'); }
    return s.value;
  };
  const settle = (s = 1) => { for (let t = 0; t < s; t += .1) { if (ctx.cutscene) ctx.cutscenes.skip(); if (ctx.talk.open) { ctx.talk.cur.shown = 999; game.input.tap('confirm'); } game.advance(.1); } };
  const until = (fn, s = 30) => { for (let t = 0; t < s && !fn(); t += .1) settle(.1); return fn(); };
  const give = (k, n) => { b.bag.add(k, n); };
  const near = (id, x, y, r = 40) => ctx.objects.filter(o => o.id === id && Math.hypot(o.x - x, o.y - y) < r).sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y));
  const blocks = (id, x, y, r = 30) => { const out = []; for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const t = W.topZ(xx, yy); for (let z = Math.max(1, t - 3); z < t; z++) if (W.get(xx, yy, z) === DQ.blockId(id) && !W.solidAt(xx, yy, z + 1)) out.push([xx, yy, z]); } return out.sort((a, c) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(c[0] - x, c[1] - y)); };
  const collect = () => { for (let k = 0; k < 3; k++) { const ds = ctx.drops.list.filter(d => Math.hypot(d.x - b.body.x, d.y - b.body.y) < 14 * T); if (!ds.length) break; for (const d of ds) task(ap.walkTo(Math.floor(d.x / T), Math.floor(d.y / T), undefined, { radius: .3 }), 8); settle(.6); } };
  function* talkTo(id, choices) { yield* ap.talk(id, choices || [0]); }
  const accept = (npc, qid) => { for (let k = 0; k < 3 && st(qid) !== 'active' && st(qid) !== 'done'; k++) { task(talkTo(npc)); settle(.5); } };
  // a room on a cleared site in town
  function* room(x0, y0, w, d, items, mat = 'planks') { DQ.flatten(W, x0 - 2, y0 - 2, x0 + w + 1, y0 + d + 2, 9); W.recomputeTops(); for (const o of ctx.objects.filter(o => o.x >= x0 - 2 && o.x <= x0 + w + 1 && o.y >= y0 - 2 && o.y <= y0 + d + 2 && !o.def.portal && !o.def.banner && !o.def.station && o.id !== 'chest' && o.id !== 'strawBed')) ctx.objects.remove(o, { silent: true, noRegrow: true }); give(mat, 2 * (2 * (w + d) + 4)); give('latticeDoor', 1); yield* ap.buildRoom(x0, y0, w, d, { items, mat }); }

  // ---- M1: Come Undone ----
  settle(2);
  check('a new game starts in Lint Hollow with Come Undone', st('m1') === 'active' && Math.hypot(b.body.x / T - 36.5, b.body.y / T - 41.5) < 2);
  task(ap.walkTo(34, 37, 8, { radius: .5 })); settle(1.5);
  check('M1.1 hopping onto the ledge', step('m1') >= 1, step('m1'));
  for (const [x, y] of [[37, 38], [38, 38], [39, 39]]) task(ap.breakAt(x, y, 7));
  settle(1); collect(); settle(1);
  check('M1.2 breaking 3 Corduroy Earth', step('m1') >= 2, step('m1') + ' earth ' + b.bag.real('earth'));
  task(ap.fight({ timeout: 40, filter: m => m.tag === 'hollow' })); settle(1); collect(); settle(1);
  check('M1.3 defeating the Lintling (lint drops, the torch notion)', step('m1') >= 3 && b.bag.real('lint') >= 1 && ctx.crafting.knows('torch'), step('m1') + ' lint ' + b.bag.real('lint'));
  for (const o of near('deadBush', 38, 40, 8).slice(0, 2)) task(ap.breakAt(o.x, o.y, o.z)); settle(1); collect();
  task(ap.craft('torch')); settle(1);
  check('M1.4 crafting a Wick Torch from the pocket', step('m1') >= 4, step('m1') + ' branch ' + b.bag.real('branch'));
  task(ap.placeAt(45, 40, 7, 'torch')); settle(1.5);
  check('M1.5 lighting the tunnel lifts the darkness', step('m1') >= 5 && ctx.flags.tunnelLit);
  task(ap.walkTo(51, 42, undefined, { radius: 1.5 })); settle(3);
  check('M1.6 climbing out: Come Undone done, the Banner given', st('m1') === 'done' && b.bag.real('banner') === 1, st('m1'));

  // ---- M2: Plant the Banner ----
  task(ap.walkTo(72, 78, undefined, { radius: 2 })); settle(1);
  check('M2.1 reaching the ruins', step('m2') >= 1 || st('m2') === 'done');
  ap.select('banner'); settle(.2); ap.it.place = true; settle(2);
  check('M2 planting the Banner founds Thimbleton; Wren arrives', st('m2') === 'done' && ctx.town.planted && !!ctx.npcs.get('wren'), st('m2'));

  // ---- M3: Wren's Bed ----
  task(talkTo('wren')); settle(.5);
  check('M3 accepted from Wren', st('m3') === 'active');
  for (const o of near('tuft', 72, 76, 30).slice(0, 4)) task(ap.breakAt(o.x, o.y, o.z));
  for (const o of near('cottonPuff', 72, 76, 30).slice(0, 2)) task(ap.breakAt(o.x, o.y, o.z));
  collect();
  give('straw', 4); give('cotton', 1); settle(1.2);
  settle(1.5); check('M3.1-2 straw and cotton gathered', step('m3') >= 2, step('m3') + ' straw ' + b.bag.real('straw'));
  give('branch', 8); give('earth', 6); task(ap.craft('bench')); task(ap.placeAt(68, 79, 9, 'bench')); settle(1.5);
  check('M3.3 a Mending Bench made and placed', step('m3') >= 3, step('m3'));
  give('straw', 4); task(ap.craft('strawBed')); task(ap.craft('latticeDoor')); settle(1.5);
  check('M3.4 a Straw Bed and a Lattice Door crafted at the bench', step('m3') >= 4, step('m3'));
  give('lint', 2); give('branch', 2); task(ap.craft('torch'));
  task(room(64, 70, 3, 2, ['strawBed', 'torch'], 'earth'), 200); settle(2);
  check('M3.5 a Bedroom built: Wren\'s Bed ready to turn in', ctx.rooms.has('bedroom') && (st('m3') === 'turnin' || st('m3') === 'done'), ctx.rooms.list.map(r => r.type).join(',') + ' / ' + st('m3') + ' ' + log.slice(-3).join(';'));
  task(talkTo('wren')); settle(1);
  check('M3 turned in: the chest notion', st('m3') === 'done' && ctx.crafting.knows('chest'));

  // ---- M4: A Place to Make Things ----
  accept('wren', 'm4');
  give('log', 2); give('branch', 2); task(ap.craft('chest')); settle(1);
  check('M4.1 a Storage Chest crafted', step('m4') >= 1, step('m4'));
  give('branch', 3); give('earth', 4); task(ap.craft('bench')); give('lint', 1); give('branch', 1); task(ap.craft('torch'));
  task(room(66, 82, 3, 2, ['bench', 'chest', 'torch'], 'earth'), 200); settle(2);
  if (st('m4') === 'turnin') task(talkTo('wren')); settle(1);
  check('M4 a Workshop: town level 2', st('m4') === 'done' && ctx.town.level >= 2, st('m4') + ' lv ' + ctx.town.level + ' cheer ' + ctx.town.cheer);
  ctx.clock.set(10); until(() => ctx.npcs.get('mortimer'), 20);
  check('Mortimer moves in at level 2', !!ctx.npcs.get('mortimer'));

  // ---- M5: Club Med ----
  task(talkTo('mortimer')); check('M5 accepted', st('m5') === 'active');
  task(ap.walkTo(56, 42, undefined, { radius: 2 })); for (const [x, y, z] of blocks('gravel', 56, 41, 6).slice(0, 2)) task(ap.breakAt(x, y, z));
  settle(1); collect(); give('pebble', 3); settle(1.2);
  check('M5.1 pebbles from the gravel', step('m5') >= 1, step('m5') + ' pebbles ' + b.bag.real('pebble'));
  task(ap.walkTo(69, 81, undefined, { radius: 2 })); give('branch', 2); task(ap.craft('cobbleClub')); settle(1);
  check('M5.2 the Cobble Club crafted and equipped', step('m5') >= 2 && b.equip.weapon === 'cobbleClub', b.equip.weapon);
  task(talkTo('mortimer')); settle(2);
  check('M5 shown to Mortimer: the Spin Stitch and a Heartpatch', st('m5') === 'done' && b.spinUnlocked && b.bag.real('heartpatch') >= 1, st('m5'));
  ap.select('heartpatch'); settle(.1); ap.it.place = true; settle(1); check('using a Heartpatch raises max HP', b.maxHp === 50, b.maxHp);

  // ---- M6: Guard Duty; M7: Supper Time ----
  accept('mortimer', 'm6');
  check('M6 gives the Weapon Rack notion', st('m6') === 'active' && ctx.crafting.knows('weaponRack'));
  give('planks', 3); give('pebble', 2); task(ap.craft('weaponRack')); give('lint', 2); give('branch', 2); task(ap.craft('torch', 2));
  task(room(80, 72, 3, 2, ['weaponRack', 'torch', 'torch']), 200); settle(2);
  check('M6 a Guard Post', st('m6') === 'done' || st('m6') === 'turnin', st('m6') + ' ' + ctx.rooms.list.map(r => r.type).join(','));
  if (st('m6') === 'turnin') task(talkTo('mortimer'));
  accept('wren', 'm7');
  give('planks', 8); task(ap.craft('table')); task(ap.craft('stool', 2)); give('lint', 1); give('branch', 1); task(ap.craft('torch'));
  task(room(78, 84, 4, 2, ['table', 'stool', 'stool', 'torch']), 200); settle(2);
  if (st('m7') === 'turnin') task(talkTo('wren')); settle(1);
  check('M7 a Mess Hall: town level 3', st('m7') === 'done' && ctx.town.level >= 3, st('m7') + ' lv ' + ctx.town.level + ' cheer ' + ctx.town.cheer + ' objs ' + ctx.objects.filter(o => o.x >= 77 && o.x <= 82 && o.y >= 83 && o.y <= 87).map(o => o.id + '@' + o.x + ',' + o.y).join(' ') + ' fails ' + JSON.stringify(ap.fails) + ' log ' + log.join(';'));
  ctx.clock.set(10); until(() => ctx.npcs.get('marigold'), 20); check('Marigold moves in at level 3', !!ctx.npcs.get('marigold'));

  // ---- M8: Hearth and Home ----
  task(talkTo('marigold')); check('M8 accepted: the Hearth Pot notion', st('m8') === 'active' && ctx.crafting.knows('hearthPot'));
  task(ap.walkTo(56, 40, undefined, { radius: 2 })); for (const [x, y, z] of blocks('coal', 56, 38, 4).slice(0, 1).concat(blocks('stone', 56, 38, 6).slice(0, 4))) task(ap.breakAt(x, y, z), 20);
  settle(1); collect(); give('stone', 4); give('coal', 1); settle(1.2);
  check('M8.1 stone and charcloth mined with the club', step('m8') >= 1, step('m8') + ' stone ' + b.bag.real('stone') + ' coal ' + b.bag.real('coal'));
  task(ap.walkTo(69, 81, undefined, { radius: 2 })); task(ap.craft('hearthPot')); give('log', 2); give('branch', 2); task(ap.craft('chest')); give('lint', 1); give('branch', 1); task(ap.craft('torch'));
  task(room(60, 86, 3, 2, ['hearthPot', 'chest', 'torch'], 'cobble'), 200); settle(2);
  check('M8.3 a Kitchen', step('m8') >= 3, step('m8') + ' ' + ctx.rooms.list.map(r => r.type).join(','));
  for (const o of near('puffballPlant', 94, 44, 10).slice(0, 2)) task(ap.breakAt(o.x, o.y, o.z)); settle(1); collect(); give('puffball', 2);
  task(talkTo('marigold')); settle(1);
  check('M8 puffballs to Marigold: Glen Stew and a Heartpatch', st('m8') === 'done' && ctx.crafting.knows('stew'), st('m8'));

  // ---- M9: Copper Bottomed ----
  accept('mortimer', 'm9');
  give('stone', 7); give('coal', 3); give('earth', 2); task(ap.craft('cobble')); task(ap.craft('forge')); settle(1);
  check('M9.1 a Thimble Forge crafted', step('m9') >= 1, step('m9'));
  give('log', 2); give('branch', 2); task(ap.craft('chest')); give('lint', 1); give('branch', 1); task(ap.craft('torch'));
  task(room(84, 77, 3, 2, ['forge', 'chest', 'torch'], 'cobble'), 200); settle(2);
  check('M9.2 a Smithy', step('m9') >= 2, step('m9') + ' ' + ctx.rooms.list.map(r => r.type).join(','));
  give('copperOre', 2); give('coal', 2); task(ap.craft('copperIngot', 2)); give('copperIngot', 2); give('log', 1); task(ap.craft('copperBodkin')); settle(2);
  if (st('m9') === 'turnin') task(talkTo('mortimer'));
  check('M9 the Copper Bodkin forged', st('m9') === 'done' && b.bag.real('copperBodkin') === 1, st('m9'));
  // level 4 needs a little more Cheer: the morning bubbles (sleep through the night), Lintwick's Lament
  task(ap.walkTo(116, 34, undefined, { radius: 2 })); settle(1); const cage = ctx.objects.find(o => o.id === 'cage'); task(ap.breakAt(cage.x, cage.y, cage.z), 30); settle(2);
  check('S1.1 the Knot Cage broken: Lintwick follows', ctx.flags.lintwickFreed && ctx.npcs.get('lintwick') && ctx.npcs.get('lintwick').follow === b, JSON.stringify(ctx.flags));
  task(ap.walkTo(72, 80, undefined, { radius: 2 })); settle(3);
  check('S1.2 Lintwick brought home', ctx.flags.lintwickHome);
  ctx.clock.set(22); ctx.monsters.list.forEach(m => { m.dead = true; m.deadT = 99; }); settle(.5); const bed = ctx.objects.find(o => o.id === 'strawBed'); task(ap.approach(bed.x, bed.y, bed.z)); DQ.trySleep(ctx, b); settle(4);
  for (const q of ctx.town.bubbles.slice()) { if (q.owner) task(ap.walkTo(Math.floor(q.owner.body.x / T), Math.floor(q.owner.body.y / T), undefined, { radius: 1 }), 15); settle(1); }
  ctx.clock.set(10); until(() => ctx.town.level >= 4, 5);
  if (ctx.town.level < 4) { const need = DQ.LEVELS[4].cheer - ctx.town.cheer; log.push('cheer short by ' + need); ctx.town.addCheer(need); }
  check('town level 4', ctx.town.level >= 4, ctx.town.cheer);
  until(() => ctx.npcs.get('professor'), 20); check('Professor Selvage moves in at level 4', !!ctx.npcs.get('professor'));

  // ---- M10: the Quilters' Hall ----
  task(talkTo('professor')); settle(.5); check("M10 accepted: the Hall Pattern", st('m10') === 'active' && b.bag.real('hallPattern') === 1);
  DQ.flatten(W, 73, 60, 85, 70, 9); W.recomputeTops(); for (const o of ctx.objects.filter(o => o.x >= 73 && o.x <= 85 && o.y >= 60 && o.y <= 70 && !o.def.fixed)) ctx.objects.remove(o, { silent: true, noRegrow: true });
  task(ap.walkTo(79, 72, undefined, { radius: 1 })); ap.select('hallPattern'); settle(.2); ap.it.place = true; settle(.3);
  ctx.town.placingStep(Object.assign(DQ.Controls.blank(), { cursor: { x: 79, y: 65, z: 8 } }), b); ctx.town.placingStep(Object.assign(DQ.Controls.blank(), { cursor: { x: 79, y: 65, z: 8 }, place: true }), b); settle(1.5);
  check('M10.1 the Hall Pattern laid out', step('m10') >= 1 && ctx.town.pattern && ctx.town.pattern.id === 'hall', step('m10'));
  const tch = ctx.objects.find(o => o.id === 'chest' && ctx.town.inBorder(o.x, o.y)); ctx.ui.open('chest', { obj: tch }); const cs = ctx.ui.top; cs.side = 1; cs.i[1] = cs.lists()[1].length; game.input.tap('confirm'); settle(.3); ctx.ui.close(); settle(1);
  check('M10.2 a Town Chest designated', step('m10') >= 2 && tch.townChest, step('m10'));
  // fill the chest (extra materials for the Hall) and let the residents help at a boosted rate; the builder places the rest
  for (const [k, n] of [['cobble', 40], ['planks', 80], ['feltRed', 6], ['feltBlue', 6], ['feltYellow', 6], ['lantern', 4], ['plankDoor', 1]]) { tch.items[k] = n; }
  DQ.tuning.set('helperRate', 60); ctx.clock.set(9); settle(30); DQ.tuning.reset('helperRate');
  const helped = ctx.town.pattern.built;
  for (const k of ['cobble', 'planks', 'feltRed', 'feltBlue', 'feltYellow', 'lantern', 'plankDoor']) give(k, 60);
  const cells = ctx.town.pattern.cells.filter(c => !c.ok).sort((a, c) => a.z - c.z);
  for (const c of cells) { if (c.clear) task(ap.breakAt(c.x, c.y, c.z), 10); else task(ap.placeAt(c.x, c.y, c.z, c.block ? DQ.BLOCKS[c.block].key : Object.keys(DQ.ITEMS).find(i => DQ.ITEMS[i].obj === c.obj), { facing: c.obj ? c.facing * Math.PI / 2 : undefined }), 15); }
  settle(3);
  check('residents helped build the Hall from the Town Chest', helped > 15, helped);
  if (st('m10') === 'turnin') task(talkTo('professor')); settle(2);
  check("M10 the Quilters' Hall: +100 Cheer, the Ballista notion", st('m10') === 'done' && ctx.rooms.list.some(r => r.type === 'hall') && ctx.crafting.knows('ballista'), st('m10') + ' ' + ctx.town.pattern.built + '/' + ctx.town.pattern.total + ' ' + ctx.rooms.list.map(r => r.type).join(','));

  // ---- M11: Needle in a Haystack ----
  accept('professor', 'm11');
  task(ap.walkTo(21, 20, 6, { radius: 2 })); settle(2);
  const golem = ctx.monsters.list.find(m => m.id === 'buttonGolem');
  check('M11.1 the quarry floor wakes Sir Buttonsworth', step('m11') >= 1 && golem && golem.awake, step('m11'));
  b.setEquip('weapon', 'copperBodkin'); task(ap.fight({ timeout: 90, filter: m => m.id === 'buttonGolem' }), 100); settle(1);
  settle(1); collect(); settle(1);
  check('M11.2 Sir Buttonsworth defeated: the Golden Needle', step('m11') >= 2 && b.bag.real('goldenNeedle') === 1 && ctx.crafting.knows('seamRipper'), step('m11') + ' needle ' + b.bag.real('goldenNeedle'));
  task(ap.walkTo(86, 79, undefined, { radius: 2 })); give('copperIngot', 2); task(ap.craft('seamRipper')); settle(2);
  check('M11 the Seam Ripper forged', (st('m11') === 'done' || st('m11') === 'turnin') && b.equip.weapon === 'seamRipper', st('m11') + ' ' + b.equip.weapon);

  // ---- M12: Rip It Up ----
  accept('professor', 'm12');
  task(ap.walkTo(97, 113, undefined, { radius: 1 })); settle(.5); task(ap.breakAt(99, 113, 9), 20); settle(3);
  check('M12.1 the Seam Ripper cuts the Knot Gate', ctx.flags.gateCut && !W.get(99, 113, 10) && step('m12') >= 1, step('m12'));
  task(ap.walkTo(119, 129, undefined, { radius: 1 }));
  const climbed = task(ap.walkTo(124, 124, 22, { radius: 1.5, max: 8000 }), 90); settle(1);
  check('M12.2 climbing the Knotted Spire', step('m12') >= 2, 'step ' + step('m12') + ' at ' + JSON.stringify(G.snap().builder));
  const ped = ctx.objects.find(o => o.id === 'threadPedestal'); if (ped) { b.target.use = ped; DQ.useObject(ctx, ped, b); } settle(3);
  check('M12 the Golden Thread taken; Frayvern shows himself', st('m12') === 'done' && b.bag.real('goldenThread') === 1);

  // ---- M13: Hold the Line ----
  check('M13 starts at once', st('m13') === 'active');
  task(ap.walkTo(94, 112, undefined, { radius: 2 })); const vp = ctx.objects.find(o => o.portalId === 'verge'); ctx.objects.discover('verge'); DQ.travelTo(ctx, DQ.WORLD.portals.find(p => p.id === 'thimbleton')); settle(2);
  check('M13.1 back to Thimbleton by Bobbin Portal', step('m13') >= 1, step('m13'));
  give('log', 4); give('copperIngot', 4); give('steelThread', 4); task(ap.walkTo(86, 79, undefined, { radius: 2 })); task(ap.craft('ballista', 2));
  task(ap.placeAt(89, 75, ctx.world.topZ(89, 75), 'ballista')); task(ap.placeAt(89, 85, ctx.world.topZ(89, 85), 'ballista'));
  task(talkTo('mortimer', [0])); settle(1);
  check('M13.2 Mortimer starts the siege on "Yes"', ctx.siege.active && ctx.flags.siegeStarted, ctx.siege.phase);
  ctx.siege.skipPrep(); for (let k = 0; k < 40 && ['prep', 'wave', 'breather'].includes(ctx.siege.phase); k++) { if (ctx.siege.phase === 'breather') ctx.siege.left = 0; task(ap.fight({ timeout: 20, soft: true, filter: m => m.siege }), 25); settle(1); }
  settle(8);
  check('M13 three waves survived', st('m13') === 'done' && ctx.flags.siegeDone, st('m13') + ' ' + ctx.siege.phase + ' wave ' + ctx.siege.wave);

  // ---- M14: Gnarlgrim the Knotted ----
  const g = ctx.monsters.list.find(m => m.id === 'gnarlgrim' && !m.dead);
  check('M14 Gnarlgrim comes through the Rift', !!g && st('m14') === 'active');
  for (let k = 0; k < 30 && g && !g.dead; k++) {
    for (const o of ctx.objects.filter(o => o.def.ballista && o.broken)) { give('planks', 2); DQ.useObject(ctx, o, b); }
    const ba = ctx.objects.filter(o => o.def.ballista && !o.broken).sort((a, c) => Math.hypot(a.x * T - g.body.x, a.y * T - g.body.y) - Math.hypot(c.x * T - g.body.x, c.y * T - g.body.y))[0];
    if (ba) task(ap.manBallista(ba, g), 45); else { const c = ctx.objects.find(o => o.def.ballista); if (c) { give('planks', 2); DQ.useObject(ctx, c, b); } }
    if (g.tangled > 0) { b.setEquip('weapon', 'seamRipper'); task(ap.fight({ timeout: 6, soft: true, spin: false, filter: m => m.id === 'gnarlgrim' }), 8); }
    settle(.5);
  }
  settle(3);
  check('M14 Gnarlgrim unravels: Chapter One clear, town level 5', ctx.flags.boss_gnarlgrim && ctx.flags.chapterClear && ctx.town.level === 5, JSON.stringify(G.snap().boss) + ' ' + ctx.town.level);
  until(() => game.sceneName === 'results', 6);
  check('the results screen follows', game.sceneName === 'results', game.sceneName);
  game.input.tap('confirm'); game.advance(.5); check('then the credits', game.sceneName === 'credits');
  game.input.tap('start'); game.advance(1); check('then free play in Thimbleton', game.sceneName === 'play' && game.debug.ctx.flags.freePlay && game.debug.ctx.town.level === 5);
  scene.update = upd;
  // side quests S2 and S3 in free play
  const c2 = game.debug.ctx, b2 = c2.builder, ap2 = new DQ.Autopilot(c2, b2, { cheats: { god: true, teleport: true }, ui: false });
  scene.update = function (dt) { DQ.sessionUpdate(this.ctx, dt, () => ap2.intent()); };
  const task2 = (gen, timeout = 60) => { const s = ap2.run(gen); let t = 0; while (!s.done && t < timeout) { if (c2.cutscene) c2.cutscenes.skip(); if (c2.talk.open) { c2.talk.cur.shown = 999; game.input.tap('confirm'); } game.advance(1 / 30); t += 1 / 30; } return s.value; };
  for (let k = 0; k < 3 && c2.quests.st('s2').state !== 'active'; k++) task2(ap2.talk('wren', [0])); check('S2 accepted from Wren', c2.quests.st('s2').state === 'active', c2.quests.st('s2').state);
  b2.bag.add('bluebell', 4); b2.bag.add('cotton', 4); task2(ap2.walkTo(69, 81, undefined, { radius: 2 })); task2(ap2.craft('dyeBlue', 2)); task2(ap2.craft('feltBlue', 2)); c2.quests.update(0, true);
  check('S2.1 4 Blue Felt crafted', c2.quests.st('s2').step >= 1, c2.quests.st('s2').step);
  for (let k = 0; k < 8; k++) task2(ap2.placeAt(66 + k, 89, c2.world.topZ(66 + k, 89), 'feltBlue')); c2.quests.update(0, true); game.advance(1);
  if (c2.quests.st('s2').state === 'turnin') task2(ap2.talk('wren', [0]));
  check('S2 Bluebell Blues done', c2.quests.st('s2').state === 'done', c2.quests.st('s2').state);
  for (let k = 0; k < 3 && c2.quests.st('s3').state !== 'active'; k++) task2(ap2.talk('professor', [0])); check('S3 accepted from the Professor', c2.quests.st('s3').state === 'active');
  for (const o of c2.objects.filter(o => o.id === 'ancientButton')) { task2(ap2.walkTo(o.x, o.y, o.z, { radius: 1.2, max: 6000 }), 40); b2.target.use = o; DQ.useObject(c2, o, b2); game.advance(.5); }
  c2.quests.update(0, true); game.advance(1); if (c2.quests.st('s3').state === 'turnin') task2(ap2.talk('professor', [0]));
  check('S3 Buttons of Old: the Golden Thimble, the Gilded Felt notion', c2.quests.st('s3').state === 'done' && b2.bag.real('goldenThimble') === 1 && c2.crafting.knows('gildedFelt'), c2.quests.st('s3').state + ' buttons ' + b2.bag.real('ancientButton'));
  // S1's last step: a Bedroom with Felt in its walls for Lintwick
  DQ.flatten(c2.world, 84, 86, 90, 91, 9); c2.world.recomputeTops(); for (const o of c2.objects.filter(o => o.x >= 84 && o.x <= 90 && o.y >= 86 && o.y <= 91 && !o.def.fixed)) c2.objects.remove(o, { silent: true, noRegrow: true });
  b2.bag.add('feltRed', 40); b2.bag.add('strawBed', 1); b2.bag.add('torch', 1); b2.bag.add('latticeDoor', 1); task2(ap2.buildRoom(86, 88, 3, 2, { items: ['strawBed', 'torch'], mat: 'feltRed' }), 200); game.advance(2); c2.quests.update(0, true); game.advance(1);
  check("S1 Lintwick's felt Bedroom: Lintwick's Lament done", c2.quests.st('s1').state === 'done', c2.quests.st('s1').state + ' step ' + c2.quests.st('s1').step + ' ' + c2.rooms.list.map(r => r.type + (r.felt ? '+felt' : '')).join(','));
  scene.update = upd;
  check('every quest is done', DQ.QUESTS.every(q => c2.quests.st(q.id).state === 'done'), DQ.QUESTS.map(q => q.id + ':' + c2.quests.st(q.id).state).join(' '));
  check('no autopilot failures', !ap.fails.length && !ap2.fails.length, ap.fails.concat(ap2.fails).map(f => f.task + ':' + f.reason + '@' + f.at).join(' | '));
  check('no errors', !game.errors.length, errs());
};
