// Damage per zone and weapon, stagger, kick cone, knife, QTE, shop, loot, save.
import { boot, setup, step, press } from '../helpers.mjs';
import { Area } from '../../src/game/area.js';
import { Bot } from '../../src/game/bot.js';
import { Humanoid } from '../../src/game/actor.js';
import { app } from '../../src/core/app.js';
import { TUNING, resetTuning } from '../../src/data/tuning.js';
import { fireWeapon, kickCone, zoneOnRay } from '../../src/game/combat.js';
import { statsOf } from '../../src/data/weapons.js';
import { buyItem, sellValue, tuneWeapon, tannoyPayouts } from '../../src/screens/shop.js';
import { Run } from '../../src/core/run.js';
import { THREE } from '../../pixel-engine.js';
import { loadSave, writeSave } from '../../src/core/save.js';

const V = THREE.Vector3;

function quiet(e, area) {
  area.beats.pending = [];
  area.beats.running = [];
  area.cut?.skip();
}

function shootAt(area, enemy, zone, weapon = 'pistol') {
  const p = enemy.aimPoint(zone, new V());
  const o = p.clone().add(new V(0, 0.4, 3));
  const d = p.clone().sub(o).normalize();
  // The pistol's small head pop chance has its own test below: these shots check the sums.
  return fireWeapon(area, area.player, { ...statsOf(weapon, { tune: {} }), headPop: 0 }, o, d, area.ctx.random);
}

// Holding aim doesn't slowly tip Max over: the aim pose must not add up from frame to frame.
async function aimHeld(t) {
  const plan = [{ do: (a, b, it) => { it.aim = true; a.cam.pitch = 0.3; return false; }, ignoreEnemies: true }];
  const e = await boot(new Area('quay', { start: [28, 42], noSave: true, bot: new Bot({ plan }) }));
  const a = e.game;
  a.noLimpets = true;
  a.beats.pending = []; a.beats.running = [];
  if (a.cut) a.cut.skip?.();
  await step(e, 90);
  const P = a.player;
  t.ok(P.aiming, 'aim is held');
  const J = P.actor.joints;
  const parts = ['Torso', 'Head', 'ArmR', 'ArmL'];
  const before = parts.map((n) => J[n].quaternion.clone());
  await step(e, 60 * 30);
  parts.forEach((n, i) => {
    const drift = J[n].quaternion.angleTo(before[i]);
    t.ok(drift < 0.25, `30 s of aim leaves the ${n} where it was (moved ${drift.toFixed(2)} rad)`);
  });
  const stood = parts.map((n) => J[n].quaternion.clone());
  a.brain.plan = [{ do: () => false, ignoreEnemies: true }]; a.brain.stepI = 0;
  await step(e, 120);
  t.ok(!P.aiming, 'aim is let go');
  const off = J.Head.quaternion.angleTo(stood[1]);
  t.ok(off < 0.25, `and the head comes back up (${off.toFixed(2)} rad)`);
}

// Nor does a head-turn: a head keeps its turn, whatever the clip underneath it does or doesn't move.
function headTurnHeld(t) {
  for (const clip of ['Idle', 'Walk', 'StunHands']) {
    const h = new Humanoid('max');
    h.play(clip);
    const frame = () => { h.update(1 / 60); h.lookToward(10, 1, 0.7); return h.joints.Head.quaternion.clone(); };
    for (let i = 0; i < 30; i++) frame();
    let worst = 0;
    const seen = [];
    for (let i = 0; i < 600; i++) { const q = frame(); if (i % 60 === 0) seen.push(q); }
    for (let i = 1; i < seen.length; i++) worst = Math.max(worst, seen[i].angleTo(seen[0]));
    t.ok(worst < 0.5, `a held head-turn stays put over ${clip} (moved ${worst.toFixed(2)} rad)`);
    h.dispose();
  }
  // And with an upper-body clip on top, which is where the base layer stops resetting the head.
  const h = new Humanoid('max');
  h.play('Idle');
  h.upper('AimPistol', { fade: 0.01 });
  const frame = () => { h.update(1 / 60); h.lookToward(10, 1, 0.7); return h.joints.Head.quaternion.clone(); };
  for (let i = 0; i < 30; i++) frame();
  const first = frame();
  let worst = 0;
  for (let i = 0; i < 600; i++) worst = Math.max(worst, frame().angleTo(first));
  t.ok(worst < 0.5, `a held head-turn stays put under an upper-body clip (moved ${worst.toFixed(2)} rad)`);
  h.dispose();
}

export default async function (t) {
  setup();
  await aimHeld(t);
  setup();
  headTurnHeld(t);
  setup();
  const e = await boot(new Area('quay', { start: [28, 42], noSave: true }));
  const a = e.game;
  quiet(e, a);
  await step(e, 10);
  t.eq(a.player.state, 'free', 'player free after skipping the cut');
  a.noLimpets = true;
  const spawn = (type, dz = 6, o = {}) => a.spawnEnemy(type, { x: a.player.x, z: a.player.z - dz, state: 'SCRIPT', ...o });

  // Each zone, pistol.
  const en = spawn('gaffer');
  en.actor.play('Idle');
  await step(e, 2);
  const hpFull = en.hp;
  shootAt(a, en, 'torso');
  t.near(hpFull - en.hp, 14, 0.01, 'pistol torso = 14');
  let before = en.hp;
  shootAt(a, en, 'head');
  t.near(before - en.hp, 28, 0.01, 'pistol head = x2');
  await step(e, 2);

  const legs = spawn('gaffer', 8);
  legs.actor.play('Idle');
  await step(e, 2);
  before = legs.hp;
  shootAt(a, legs, 'leg');
  t.near(before - legs.hp, 9.8, 0.2, 'pistol leg = x0.7');
  t.ok(legs.state !== 'KNEEL', 'one leg shot: still up');
  shootAt(a, legs, 'leg');
  t.eq(legs.state, 'KNEEL', 'two leg shots: kneel');
  t.ok(legs.canTakedown(), 'kneeling can be taken down');
  t.ok(!legs.canKick(), 'kneeling is not a kick');

  // Stun chance across many heads.
  TUNING.staggerChance = 1;
  legs.dieQuiet(); // the kneeling one would be in the line of fire
  await step(e, 2);
  const stunned = spawn('gaffer', 10, { hpMul: 50 });
  stunned.actor.play('Idle');
  await step(e, 2);
  stunned.state = 'APPROACH';
  shootAt(a, stunned, 'head');
  t.eq(stunned.state, 'STUN', 'stagger chance 1: head stuns');
  t.ok(stunned.canKick(), 'stunned can be kicked');
  resetTuning('staggerChance');

  // Kick cone: everyone in front takes it, not behind.
  const front1 = spawn('gaffer', 1.2, { hpMul: 10 });
  const front2 = a.spawnEnemy('gaffer', { x: a.player.x + 1, z: a.player.z - 1.2, state: 'APPROACH', hpMul: 10 });
  const behind = a.spawnEnemy('gaffer', { x: a.player.x, z: a.player.z + 2, state: 'APPROACH', hpMul: 10 });
  a.player.facing = Math.PI;
  await step(e, 1);
  const h0 = [front1.hp, front2.hp, behind.hp];
  kickCone(a, a.player, front1);
  t.near(h0[0] - front1.hp, 40, 0.01, 'kick: 40 to the target');
  t.near(h0[1] - front2.hp, 25, 0.01, 'kick: 25 to others in the cone');
  t.eq(behind.hp, h0[2], 'kick: nothing behind');
  t.eq(front2.state, 'KNOCKDOWN', 'kick knocks down');
  for (const x of [...a.enemies]) x.dieQuiet();
  await step(e, 2);

  // Scatter pellets knock back at close range; rifle pierces one; head pop chance on the pistol stat.
  t.eq(statsOf('pistol', { tune: {} }).headPop, 0.06, 'pistol head pop 6%');
  t.eq(statsOf('pistol', { tune: { power: 4, rate: 4, reload: 4, cap: 4 } }).headPop, 0.3, 'tuned pistol perk 30%');
  t.eq(statsOf('rifle', { tune: { power: 4, rate: 4, reload: 4, cap: 4 } }).pierce, 99, 'tuned rifle pierces all');
  t.eq(statsOf('harpoon', { tune: { power: 4, rate: 4, reload: 4, cap: 4 } }).reload, 1, 'tuned harpoon reloads in 1 s');
  t.ok(statsOf('pistol', { tune: { cap: 2 } }).mag > 12, 'capacity tune raises mag');
  const r1 = spawn('gaffer', 6, { hpMul: 10 }); const r2 = spawn('gaffer', 8, { hpMul: 10 });
  r1.actor.play('Idle'); r2.actor.play('Idle');
  r1.x = a.player.x; r2.x = a.player.x; r2.z = r1.z - 1;
  await step(e, 2);
  const rh = [r1.hp, r2.hp];
  const pp = r1.aimPoint('torso', new V());
  fireWeapon(a, a.player, statsOf('rifle', { tune: {} }), pp.clone().add(new V(0, 0, 2)), new V(0, 0, -1), a.ctx.random);
  t.ok(r1.hp < rh[0] && r2.hp < rh[1], 'rifle pierces one body');
  for (const x of [...a.enemies]) x.dieQuiet();

  // Harpoon pins.
  const pinned = spawn('gaffer', 6, { hpMul: 10 });
  pinned.actor.play('Idle');
  await step(e, 2);
  pinned.state = 'APPROACH';
  shootAt(a, pinned, 'torso', 'harpoon');
  t.eq(pinned.state, 'PIN', 'harpoon pins');
  pinned.dieQuiet();

  // QTE paths.
  let okCount = 0; let failCount = 0;
  a.qte.press({ key: 'action', onOk: () => okCount++, onFail: () => failCount++ });
  t.ok(a.qte.active, 'QTE open');
  t.eq(app.slow, 0.5, 'QTE slows time');
  e.input.setKey('KeyE', true);
  await step(e, 2);
  e.input.setKey('KeyE', false);
  await step(e, 2);
  t.eq(okCount, 1, 'QTE success path');
  t.eq(app.slow, 1, 'time back after QTE');
  a.qte.press({ key: 'action', window: 0.2, onOk: () => okCount++, onFail: () => failCount++ });
  await step(e, 60);
  t.eq(failCount, 1, 'QTE failure path by timeout');
  a.qte.mash({ key: 'action', time: 3, onOk: () => okCount++, onFail: () => failCount++ });
  for (let i = 0; i < 14; i++) { e.input.setKey('KeyE', true); await step(e, 1); e.input.setKey('KeyE', false); await step(e, 2); }
  await step(e, 2);
  t.eq(okCount, 2, 'mash QTE success');
  await step(e, 6);

  // Grab: mash free.
  const grabber = a.spawnEnemy('gaffer', { x: a.player.x, z: a.player.z - 1, state: 'APPROACH' });
  grabber.enter('GRAB');
  a.player.startGrab(grabber, 6, false);
  t.eq(a.player.state, 'grabbed', 'grabbed');
  for (let i = 0; i < 12; i++) { e.input.setKey('KeyE', true); await step(e, 1); e.input.setKey('KeyE', false); await step(e, 3); }
  t.eq(a.player.state, 'free', 'mashed free');
  grabber.dieQuiet();

  // Shop: buy, can't afford, sell, tune.
  const run = a.run;
  run.money = 100;
  t.eq(buyItem(a, 'scatter').why, 'poor', "can't afford");
  run.money = 5000;
  t.ok(buyItem(a, 'scatter').ok, 'buy the scattergun');
  t.ok(run.ownsWeapon('scatter'), 'owns scatter');
  t.eq(buyItem(a, 'scatter').why, 'have', "won't sell it twice");
  const m0 = run.money;
  t.ok(buyItem(a, 'ammoPistol').ok, 'buy ammo');
  t.eq(run.money, m0 - 150, 'ammo costs 150');
  t.ok(tuneWeapon(a, 'pistol', 'power').ok, 'tune');
  t.eq(run.tuneLevel('pistol', 'power'), 1, 'tune level up');
  t.eq(sellValue({ treasure: true, id: 'pearl' }), 500, 'treasure pays full');
  t.eq(sellValue({ id: 'samphire' }), 30, 'other things pay half');
  run.money = 99999;
  t.ok(buyItem(a, 'caseMedium').ok, 'case upgrade');
  t.eq(`${run.case.w}x${run.case.h}`, '12x7', 'case grew to 12x7');
  t.ok(buyItem(a, 'caseLarge').ok, 'second upgrade');
  t.eq(`${run.case.w}x${run.case.h}`, '14x8', 'case grew to 14x8');
  // Tannoy prizes.
  run.tannoys = Array.from({ length: 15 }, (_, i) => `x${i}`);
  const before2 = run.money;
  const prize = tannoyPayouts(run);
  t.eq(prize.length, 3, 'three Tannoy prizes');
  t.eq(run.money, before2 + 1000, 'first prize pays 1000');
  t.eq(run.valuables.blackPearl, 1, 'last prize is a Black Pearl');
  t.eq(tannoyPayouts(run).length, 0, 'prizes only once');
  // Save round trip through storage.
  writeSave({ area: 'quay', entry: null, data: run.toJSON() });
  const s = loadSave();
  t.eq(Run.from(s.data).money, run.money, 'save slot keeps money');
  t.eq(e.errors.length, 0, `no engine errors: ${e.errors[0] ?? ''}`);
}
