import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, hold, snap, errs } = G, T = 16;
  const ctx = G.play('banner'), b = ctx.builder, w = ctx.world;
  const tp = (x, y) => { DQ.Dev.teleport(ctx, x, y); run(.3); };
  // walk speed follows the tuning
  tp(60, 60); const x0 = b.body.x, y0 = b.body.y; game.input.hold('right'); run(1); game.input.hold('right', false);
  const sp = Math.hypot(b.body.x - x0, b.body.y - y0); check('walk speed matches the tuning (~78/s)', sp > 60 && sp < 82, sp);
  DQ.tuning.set('walk', 120); tp(60, 60); const x1 = b.body.x, y1 = b.body.y; game.input.hold('right'); run(1); game.input.hold('right', false); DQ.tuning.reset('walk');
  check('the walk slider changes speed live', Math.hypot(b.body.x - x1, b.body.y - y1) > sp * 1.3);
  // jump clears 1 block, not 2
  tp(60, 60); const z0 = b.body.z; let peak = 0; press('jump', .02); for (let i = 0; i < 60; i++) { run(1 / 120); peak = Math.max(peak, b.body.z - z0); }
  check('a jump rises more than 1 block and less than 2', peak > 16 && peak < 32, peak);
  // breaking: tiers and drops
  tp(60, 60); const L = b.L0; b.body.facing = 0; run(.05);
  const cx = Math.floor(b.body.x / T) + 1, cy = Math.floor(b.body.y / T);
  w.set(cx, cy, L, DQ.blockId('stone')); run(.05);
  b.setEquip('weapon', 'darningStick'); for (let i = 0; i < 6; i++) { press('swing', .45); }
  check('stone is too tough for the darning stick', w.get(cx, cy, L) === DQ.blockId('stone'));
  b.take('cobbleClub', 1, { quiet: true }); b.setEquip('weapon', 'cobbleClub'); for (let i = 0; i < 6 && w.get(cx, cy, L); i++) press('swing', .45);
  check('the cobble club breaks stone', !w.get(cx, cy, L));
  run(1.5); check('the broken block drops into the bag', b.bag.real('stone') >= 1, JSON.stringify(snap().bag));
  // placing: reach, occupied, inside a body
  b.hotbar[0] = 'stone'; b.sel = 0; const before = b.bag.real('stone'); b.body.facing = 0; run(.05); press('place', .3);
  check('placing a block uses one from the bag', b.bag.real('stone') === before - 1 && w.get(cx, cy, b.L0) === DQ.blockId('stone'), [b.bag.real('stone'), before]);
  const mine = [Math.floor(b.body.x / T), Math.floor(b.body.y / T), b.L0];
  check('no block may be placed inside a body', b.blockedByBody(mine[0], mine[1], mine[2], 1));
  check('reach: a cell 9 blocks away is out of reach', !b.inReach({ x: mine[0] + 9, y: mine[1], z: mine[2] }));
  // Builder's Eye moves its cursor a cell at a time and up a level
  game.input.hold('eye'); run(.1); const e0 = Object.assign({}, b.eye); game.input.hold('right'); run(.05); game.input.hold('right', false); run(.2); press('jump', .05);
  check("Builder's Eye cursor steps and rises", b.eye.on && (b.eye.x !== e0.x || b.eye.y !== e0.y) && b.eye.z === e0.z + 1, JSON.stringify([e0, b.eye]));
  game.input.hold('eye', false); run(.1);
  // combat: a combo hits a monster in front
  tp(60, 60); b.body.facing = 0; const m = ctx.monsters.spawn('lintling', b.body.x + 16, b.body.y, b.body.z); m.state = 'idle'; const hp0 = m.hp;
  for (let i = 0; i < 4 && !m.dead; i++) press('swing', .4);
  check('the swing combo hurts a monster in the arc', m.hp < hp0 || m.dead);
  // Spin Stitch: hold, then let go
  for (const q of ctx.monsters.list) { q.dead = true; q.deadT = 99; } tp(66, 78); b.spinUnlocked = true; const ms = [[1, 0], [-1, 0], [0, 1]].map(([dx, dy]) => { const q = ctx.monsters.spawnCell('dyedLintling', Math.floor(b.body.x / T) + dx, Math.floor(b.body.y / T) + dy); q.state = 'idle'; return q; }); const h0 = ms.map(q => q.hp);
  hold('swing', .8); run(.3);
  check('Spin Stitch hits all around', ms.filter((q, i) => q.hp < h0[i] || q.dead).length >= 2, ms.map(q => q.hp).join(','));
  // KO: respawn at the banner, the Lost Bundle holds half of each material
  for (const q of ctx.monsters.list) { q.dead = true; q.deadT = 99; } run(.2);
  b.bag.add('straw', 10); b.bag.add('pebble', 6); const straw0 = b.bag.real('straw'), peb0 = b.bag.real('pebble'); DQ.dev.god = false; b.iframe = 0; b.hurt(999); run(4.5); while (ctx.talk.open) { press('confirm', .2); }
  const bundle = ctx.objects.find(o => o.id === 'lostBundle');
  check('KO respawns at the banner with full HP', !b.ko && b.hp === b.maxHp && Math.hypot(b.body.x / T - ctx.town.bx, b.body.y / T - ctx.town.by) < 5, JSON.stringify(snap().builder));
  check('the Lost Bundle holds half of each material stack', bundle && bundle.contents.straw === Math.floor(straw0 / 2) && bundle.contents.pebble === Math.floor(peb0 / 2) && b.bag.real('straw') === straw0 - Math.floor(straw0 / 2), bundle && JSON.stringify(bundle.contents) + ' bag straw ' + b.bag.real('straw'));
  // falling into the Unravel respawns at the last safe spot
  tp(60, 60); run(1); b.body.lastSafe = [b.body.x, b.body.y, b.body.z]; b.body.x = 1 * T; b.body.y = 1 * T; b.body.z = 3 * T; run(1.5);
  check('falling into the Unravel returns to the last safe spot', Math.abs(b.body.x / T - 60.5) < 2 && b.body.z > 0, JSON.stringify(snap().builder));
  // eating
  b.belly = 40; b.bag.add('bun', 1); b.hotbar[1] = 'bun'; b.sel = 1; run(.1); press('place', .3);
  check('eating a bun fills the belly', b.belly >= 74, b.belly);
  // gear: craft the Quilted Vest and Copper Buckler, equip them, take less damage
  ctx.crafting.know('quiltedVest', true); ctx.crafting.know('copperBuckler', true); b.bag.add('cotton', 4); b.bag.add('thread', 2); b.bag.add('copperIngot', 2); b.bag.add('planks', 2);
  check('the Quilted Vest and Copper Buckler craft', ctx.crafting.craft('quiltedVest', 1, b.bag) === 1 && ctx.crafting.craft('copperBuckler', 1, b.bag) === 1);
  const raw = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ctx.combat.formula(12, b.def)).reduce((a, c) => a + c, 0);
  b.bag.add('bun', 0); b.hotbar[2] = 'quiltedVest'; b.sel = 2; run(.05); press('place', .2); b.hotbar[3] = 'copperBuckler'; b.sel = 3; run(.05); press('place', .2);
  check('using them from the hotbar equips them (Def +7)', b.equip.body === 'quiltedVest' && b.equip.shield === 'copperBuckler' && b.def === 7, JSON.stringify(b.equip));
  const armoured = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ctx.combat.formula(12, b.def)).reduce((a, c) => a + c, 0);
  check('armour lowers the damage taken', armoured < raw, [raw, armoured]);
  check('no errors', !game.errors.length, errs());
};
