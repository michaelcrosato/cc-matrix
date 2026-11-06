// What PLAN.md says the game does, run rather than read: every gameplay path the other suites never execute
// (found by running them under V8 coverage). Each block quotes the plan's section.
import { boot, setup, step, press } from '../helpers.mjs';
import { THREE, compileClips } from '../../pixel-engine.js';
import { app } from '../../src/core/app.js';
import { Area } from '../../src/game/area.js';
import { Run } from '../../src/core/run.js';
import { Bot } from '../../src/game/bot.js';
import { islander, islander2, islander3 } from '../../src/models/humans.js';
import { STOCK } from '../../src/data/shop.js';
import { Bosun } from '../../src/game/bosses/bosun.js';
import { CryptSegment } from '../../src/game/setpieces/crypt.js';
import { startBeltFight } from '../../src/game/setpieces/belt.js';
import { raiseLadder } from '../../src/data/levels/quay.js';
import { explode, fireWeapon, traceShot } from '../../src/game/combat.js';
import { statsOf, GRENADES } from '../../src/data/weapons.js';
import { TUNING } from '../../src/data/tuning.js';
import { MOTHER_CLIP_DEFS, MOTHER_RIG } from '../../src/data/clips.js';
import { Bathysphere, Mother } from '../../src/game/bosses/bathysphere.js';

const V = THREE.Vector3;
let e; let a;

async function fresh(id, o = {}) {
  setup();
  app.closeAll?.();
  app.run = new Run();
  app.dev.god = false;
  o.prep?.(app.run);
  e = await boot(new Area(id, { start: o.start, noSave: true, entry: o.entry }));
  a = e.game;
  a.noLimpets = true;
  a.beats.pending = []; a.beats.running = [];
  a.cut?.skip();
  await step(e, 10);
  a.talk.queue = []; a.talk.box = null;
  return a;
}
const ahead = (d = 1.6, side = 0) => {
  const P = a.player; const f = P.facing;
  return { x: P.x + Math.sin(f) * d + Math.cos(f) * side, z: P.z + Math.cos(f) * d - Math.sin(f) * side };
};
async function spawn(type, d = 1.6, o = {}, side = 0) {
  const en = a.spawnEnemy(type, { ...ahead(d, side), state: 'SCRIPT', hpMul: 20, ...o });
  en.actor?.play('Idle');
  await step(e, 2);
  return en;
}
const hold = (code, on) => e.input.setKey(code, on);
const lookAt = (x, z) => { const P = a.player; a.cam.yaw = Math.atan2(x - P.x, z - P.z); P.facing = a.cam.yaw; };

export default async function (t) {
  // ---- 4.3 Knife: 8 damage, 0.4 s, 2 m arc, x3 on downed enemies, breaks crates for free. ----
  await fresh('quay', { start: [28, 42] });
  let en = await spawn('gaffer');
  let hp = en.hp;
  await press(e, 'KeyV');
  await step(e, 30);
  t.near(hp - en.hp, 8, 0.01, 'the knife does 8');
  en.enter('KNOCKDOWN');
  hp = en.hp;
  await step(e, 40);
  await press(e, 'KeyV');
  await step(e, 30);
  t.near(hp - en.hp, 24, 0.01, 'x3 on a downed enemy');
  en.dieQuiet();
  const crate = a.level.crates.find((c) => !c.broken);
  t.ok(crate, 'the quay has crates');
  a.player.teleport(crate.x, 0, crate.z + 1.2);
  lookAt(crate.x, crate.z);
  await step(e, 3);
  await press(e, 'KeyV');
  await step(e, 30);
  t.ok(crate.broken, 'the knife breaks a crate');

  // ---- 4.3 Takedown: prompt on a Kneeling enemy: hip throw, 60 damage, knockdown within 1.5 m. ----
  await fresh('quay', { start: [28, 42] });
  en = await spawn('gaffer');
  const near = await spawn('gaffer', 2.4, {}, 0.6);
  en.enter('KNEEL');
  await step(e, 3);
  t.ok(a.interact.current?.enemy === en, 'a kneeling enemy gives the prompt');
  hp = en.hp;
  const kicks = app.run.stats.kicks;
  await press(e, 'KeyE');
  await step(e, 50);
  t.near(hp - en.hp, 60, 0.01, 'the takedown does 60');
  t.eq(app.run.stats.kicks, kicks + 1, 'and counts');
  t.ok(['KNOCKDOWN', 'GETUP'].includes(near.state), `and knocks down whoever is within 1.5 m (${near.state})`);

  // ---- 3 Quick turn: 180 degrees in 0.3 s. ----
  await fresh('quay', { start: [28, 42] });
  const y0 = a.cam.yaw;
  await press(e, 'KeyQ');
  await step(e, 22);
  t.near(Math.abs(a.cam.yaw - y0), Math.PI, 0.02, 'Q is a quick 180');

  // ---- 3 Next and previous weapon; 1-4. ----
  await fresh('quay', { start: [28, 42], prep: (r) => { r.addWeapon('scatter'); r.addWeapon('rifle'); } });
  await press(e, 'PadUp');
  await step(e, 2);
  t.eq(app.run.equipped, 'scatter', 'D-pad up: next weapon');
  await press(e, 'PadDown');
  await step(e, 2);
  t.eq(app.run.equipped, 'pistol', 'D-pad down: previous weapon');
  await press(e, 'Digit3');
  await step(e, 2);
  t.eq(app.run.equipped, 'rifle', 'number keys pick a weapon');

  // ---- 4.4 Grenades: thrown at the laser dot while aiming. ----
  const fromTheCase = async (id) => {
    const before = app.run.case.count(id);
    app.run.grenade = id;
    hold('MouseRight', true);
    await step(e, 20);
    await press(e, 'KeyG');
    hold('MouseRight', false);
    t.eq(app.run.case.count(id), before - 1, `${id}: G while aiming takes one from the Case`);
    t.ok(a.projectiles.length > 0, `${id}: and throws it`);
    await step(e, 45); // the throw's cooldown
  };
  await fresh('quay', { start: [28, 42], prep: (r) => { r.giveItem('flare'); r.giveItem('depth'); r.giveItem('oil'); } });
  await fromTheCase('flare');
  await fromTheCase('depth');
  await fromTheCase('oil');
  await fresh('quay', { start: [28, 42] });
  en = await spawn('gaffer', 4);
  const crawler = await spawn('limpet', 4, { hpMul: 1 }, 1);
  const far = await spawn('gaffer', 12);
  a.throwGrenade(a.player, 'flare', { x: en.x, z: en.z });
  await step(e, 70);
  t.eq(en.state, 'BLIND', 'a flare blinds within 6 m');
  t.ok(crawler.dead, 'and kills the limpet there');
  t.ok(far.state !== 'BLIND', 'but not beyond');
  t.eq(GRENADES.flare.blind, 4, 'for 4 s');
  await fresh('quay', { start: [28, 42] });
  en = await spawn('gaffer', 5);
  hp = en.hp;
  a.throwGrenade(a.player, 'depth', { x: en.x, z: en.z });
  await step(e, 45);
  t.eq(en.hp, hp, 'a depth charge waits for its fuse');
  await step(e, 130);
  t.near(hp - en.hp, 80, 25, `then goes off: up to 80 (${(hp - en.hp).toFixed(0)})`);
  t.eq(GRENADES.depth.damage, 80, '80 damage');
  await fresh('quay', { start: [28, 42] });
  en = await spawn('gaffer', 5);
  hp = en.hp;
  a.throwGrenade(a.player, 'oil', { x: en.x, z: en.z });
  await step(e, 70);
  t.ok(a.fires.length > 0, 'a whale-oil bottle leaves a burning pool');
  await step(e, 60);
  t.ok(en.hp < hp, 'which burns whoever stands in it');
  t.eq(GRENADES.oil.burn, 3, 'for 3 s');
  t.eq(GRENADES.oil.dps, 15, 'at 15 a second');

  // ---- 4.10 Tannoy: any shot; sparks; falls silent mid-line. ----
  await fresh('quay', { start: [49, 44] });
  for (let i = 0; i < 120 && !a.talk.barkLine?.tannoy; i += 5) await step(e, 5);
  const tan = a.talk.barkLine?.tannoy;
  t.ok(tan, 'a Tannoy speaks when you come near');
  const o = tan.pos.clone().add(new V(0, 0.1, 2));
  const d = tan.pos.clone().sub(o).normalize();
  fireWeapon(a, a.player, statsOf('pistol', { tune: {} }), o, d, a.ctx.random);
  t.ok(tan.dead, 'one shot kills it');
  t.ok(app.run.tannoys.includes(tan.key), 'and it counts');
  t.ok(!a.talk.barkLine || a.talk.barkLine.tannoy !== tan || /-$/.test(a.talk.barkLine.text.slice(0, Math.floor(a.talk.barkLine.shown))) || a.talk.barkLine.cut, 'it is cut off mid-line');
  await step(e, 50);
  t.ok(/NOTED|THANK YOU/.test(a.talk.barkLine?.text ?? ''), `Max notes it (${a.talk.barkLine?.text})`);

  // ---- 4.3 Arm: drops what it holds, a held bottle explodes on them. ----
  await fresh('quay', { start: [28, 42] });
  en = await spawn('bottler', 3, { state: 'APPROACH', hpMul: 20 });
  en.state = 'SCRIPT';
  en.holding = true;
  await step(e, 2);
  const arm = en.aimPoint('arm', new V());
  const ao = arm.clone().add(new V(0, 0, 2).applyAxisAngle(new V(0, 1, 0), a.player.facing + Math.PI));
  fireWeapon(a, a.player, statsOf('pistol', { tune: {} }), ao, arm.clone().sub(ao).normalize(), a.ctx.random);
  t.ok(!en.holding, 'shooting the arm makes the Bottler drop his bottle');
  t.ok(a.fires.length > 0, 'and it burns where he stands');

  // ---- 4.9 The Dame: Hide near a barrel; dead = CLAIM DENIED. ----
  await fresh('cannery', { start: [24, 22], prep: (r) => { r.dameWith = true; } });
  const D = a.dame;
  t.ok(D, 'the Dame is here');
  const spot = a.hidingSpots[0];
  t.ok(spot, 'the cannery has somewhere to hide');
  a.player.teleport(spot.x + 1, 0, spot.z);
  D.x = spot.x + 1.5; D.z = spot.z;
  await step(e, 3);
  t.eq(D.commandLabel(), 'HIDE', 'near a barrel, Command offers HIDE');
  a.onCommand();
  t.eq(D.mode, 'hide', 'she climbs in');
  a.onCommand();
  t.eq(D.mode, 'follow', 'and comes out when called');
  D.hurt(9999, null);
  await step(e, 2);
  t.eq(a.deathReason, 'THE INSURED IS LOST', 'her death ends the claim');
  t.ok(!a.player.alive, 'with Max');
  // Leaving mid-way through the slow fall must not carry the slow motion into the next area.
  t.ok(app.slow < 1, 'her fall is in slow motion');

  // ---- 5 The crypt: floor lamps to throw for a noise distraction. ----
  await fresh('abbey', { start: [11, 20], prep: (r) => { r.dameWith = true; r.setFlag('lensSolved'); } });
  t.eq(app.slow, 1, 'and a new area starts at full speed');
  const inf = a.level.info;
  const C = new CryptSegment(a, { X: (c) => inf.x(c), Z: (r) => inf.z(r), onDone: () => {} });
  a.crypt = C;
  const lamp = C.items.find((i) => i.label === 'TAKE LAMP');
  lamp.use(C.dameP);
  t.eq(C.lamps, 1, 'a lamp can be picked up');
  const k = C.knights[0];
  C.dameP.teleport(inf.x(3), 0, inf.z(12));
  a.cam.yaw = 0;
  k.x = inf.x(2); k.z = inf.z(18); k.goal = null;
  C.throwLamp();
  t.eq(C.lamps, 0, 'and thrown');
  let heard = false;
  for (let i = 0; i < 120 && !heard; i += 5) { await step(e, 5); heard = k.goal !== null; }
  t.ok(heard, 'a knight goes to the noise');
  // Niches: in one she can't be heard or hit, and she can always get out.
  {
    const niche = C.items.find((i) => i.kind === 'niche');
    t.ok(niche, 'the crypt has niches');
    const dame = C.dameP;
    dame.teleport(niche.x + 0.5, 0, niche.z);
    k.x = niche.x + 1; k.z = niche.z; k.goal = null; k.attackT = 0; k.stunT = 0;
    await step(e, 2);
    niche.use(dame);
    t.ok(C.hidden, 'she can hide');
    t.eq(dame.state, 'script', 'and stays put while she does');
    const hits = C.hits;
    for (let i = 0; i < 180; i += 10) { await step(e, 10); k.x = niche.x + 1; k.z = niche.z; }
    t.eq(C.hits, hits, 'a knight beside her neither hears nor hits her');
    t.ok(!C.items.find((i) => i.kind === 'niche' && i.enabled?.()), 'no niche is offered from inside one');
    k.x = inf.x(2); k.z = inf.z(30);
    await press(e, 'KeyE');
    await step(e, 3);
    t.ok(!C.hidden, 'Action leaves the niche');
    t.eq(dame.state, 'free', 'and she can walk again');
    t.ok(a.level.nav.walkable(dame.x, dame.z), 'onto open floor');
  }
  C.finish();

  // ---- 6 The Bosun: Grab (within 3 m, mash, 60). Sweep (QTE dodge, 45). Brine Barrels stagger him for 4 s. ----
  const bosun = async () => {
    await fresh('yard', { start: [17, 20], prep: (r) => { r.dameWith = false; } });
    const B = new Bosun(a, { ...ahead(2.4), yaw: a.player.facing + Math.PI });
    a.enemies.push(B);
    B.state = 'SCRIPT';
    await step(e, 3);
    return B;
  };
  let B = await bosun();
  a.player.hp = a.player.maxHp;
  B.startGrab();
  for (let i = 0; i < 60 && !a.qte.active; i += 5) await step(e, 5);
  t.eq(a.qte.active?.type, 'mash', 'the Bosun grabs: a mash');
  const hurtBy = (n) => n * a.player.store.diff.enemyDamage * TUNING.damageTaken;
  for (let i = 0; i < 400 && a.qte.active; i += 10) await step(e, 10);
  t.near(a.player.maxHp - a.player.hp, hurtBy(60), 0.5, 'not broken free: 60');
  B = await bosun();
  a.player.hp = a.player.maxHp;
  B.startGrab();
  for (let i = 0; i < 60 && !a.qte.active; i += 5) await step(e, 5);
  for (let i = 0; i < 40 && a.qte.active; i++) await press(e, 'KeyE', 1);
  t.eq(a.player.hp, a.player.maxHp, 'mashed free: unhurt');
  B = await bosun();
  a.player.hp = a.player.maxHp;
  B.startSweep();
  for (let i = 0; i < 120 && !a.qte.active; i += 5) await step(e, 5);
  t.eq(a.qte.active?.type, 'press', 'the sweep: a dodge');
  for (let i = 0; i < 200 && a.qte.active; i += 5) await step(e, 5);
  t.near(a.player.maxHp - a.player.hp, hurtBy(45), 0.5, 'missed: 45');
  B = await bosun();
  a.bosun = B;
  B.state = 'WALK';
  a.def.onBrineBlast?.(a, { x: B.x, z: B.z });
  t.ok(B.staggerT >= 4 || B.state === 'STAGGER', `a Brine Barrel staggers him (${B.state} ${B.staggerT})`);

  // ---- 4.11 QTE: press, mash, alternate. ----
  await fresh('quay', { start: [28, 42] });
  let okd = 0; let failed = 0;
  a.qte.alternate({ need: 4, time: 8, onOk: () => { okd++; }, onFail: () => { failed++; } });
  for (const code of ['KeyE', 'Space', 'KeyE', 'Space']) await press(e, code, 2);
  await step(e, 3);
  t.eq(okd, 1, 'alternate: Cross, Circle, Cross, Circle succeeds');
  a.qte.alternate({ need: 4, time: 0.4, onOk: () => { okd++; }, onFail: () => { failed++; } });
  await step(e, 60);
  t.eq(failed, 1, 'and fails on time');

  // ---- 5 and 4.11 The belt: failed cutscene QTEs restart with a new quip, no reload. ----
  await fresh('cannery', { start: [24, 22], prep: (r) => { r.dameWith = true; } });
  a.player.hp = a.player.maxHp;
  const inf2 = a.level.info;
  startBeltFight(a, { X: (c) => inf2.x(c), Z: (r) => inf2.z(r), onDone: () => {} });
  const stepBefore = () => a.beltFight?.step ?? -1;
  let sawQuip = false;
  for (let i = 0; i < 900 && (a.beltFight?.fails ?? 0) < 2; i += 10) {
    await step(e, 10);
    sawQuip = sawQuip || (a.talk.barkLine && a.talk.barkLine.speaker === 'islander');
  }
  t.ok((a.beltFight?.fails ?? 0) >= 2, 'the belt fight survives failed QTEs');
  t.eq(stepBefore(), 0, 'at the same step');
  t.ok(sawQuip, 'with a quip');
  t.ok(a.player.hp < a.player.maxHp, 'and a cost');
  t.eq(a.id, 'cannery', 'and no reload');

  // ---- 6 Final Settlement: QTE (press, press, mash); failing costs a little and asks again. ----
  await fresh('nave', { start: [13, 20], prep: (r) => { r.dameWith = false; } });
  a.player.hp = a.player.maxHp;
  a.def.finalSettlement(a, null);
  for (let i = 0; i < 120 && !a.qte.active; i += 5) await step(e, 5);
  t.eq(a.qte.active?.label, 'CLIMB', 'the first press');
  for (let i = 0; i < 200 && a.qte.active; i += 5) await step(e, 5);
  t.ok(a.player.hp < a.player.maxHp, 'a miss costs a little');
  for (let i = 0; i < 120 && !a.qte.active; i += 5) await step(e, 5);
  t.eq(a.qte.active?.label, 'CLIMB', 'and it asks again');

  // ---- 6 A shattered column is gone: nothing left to walk into. ----
  await fresh('nave', { start: [13, 30], prep: (r) => { r.dameWith = false; } });
  {
    const info = a.level.info;
    const col = a.columns.find((k) => k.c0 === 8 && k.r0 === 18);
    t.ok(col, 'the aisle has its columns');
    t.eq(a.columns.length, 8, 'all eight');
    const walkNorth = async () => {
      a.player.teleport(info.x(8.5), 0, info.z(21));
      lookAt(info.x(8.5), info.z(10));
      await step(e, 3);
      hold('KeyW', true);
      await step(e, 90);
      hold('KeyW', false);
      await step(e, 2);
      return info.row(a.player.z);
    };
    t.ok(await walkNorth() >= 20, 'a whole column stops Max');
    t.ok(!a.level.nav.isOpen(8, 18), 'and the routes know it');
    a.shatterColumn(info.x(8.5), info.z(18.5));
    t.ok(col.broken, 'a charge shatters it');
    t.ok(!col.obj.visible, 'it is gone from sight');
    t.ok(a.level.nav.isOpen(8, 18) && a.level.nav.isOpen(9, 19), 'from the routes');
    t.ok(await walkNorth() < 18, 'and Max walks straight through where it stood');
  }

  // ---- 6 The final boss is Max's fight: the Dame sits it out by the door and rejoins for the flood. ----
  await fresh('nave', { start: [13, 42], prep: (r) => { r.dameWith = true; } });
  {
    const steps = a.def.beats.find((b) => b.id === 'naveStart').steps;
    const run = steps.find((st) => st.run && String(st.run).includes('bossLive'));
    a.bath = { state: 'SCRIPT', stateT: 0 };
    run.run(a);
    t.eq(a.dame.mode, 'hide', 'the Dame sits the boss out');
    t.ok(!a.dame.hurt(9999, null), 'safe from the fight');
    a.onCommand();
    t.eq(a.dame.mode, 'hide', 'and stays put when called');
    t.ok(a.dame.commandLabel() === null, 'with no command offered');
  }

  // ---- 9 MotherSpit: authored as data, and it plays. ----
  await fresh('nave', { start: [13, 20], prep: (r) => { r.dameWith = false; } });
  const M = new Mother(a, a.player.x, a.player.z - 14);
  const clips = compileClips(MOTHER_CLIP_DEFS, MOTHER_RIG, M.obj);
  t.eq(clips[0].name, 'MotherSpit', 'MotherSpit is a data clip on her own rig');
  t.ok(clips[0].tracks.length > 0, 'with tracks');
  M.spitT = 0;
  M.step(1 / 60);
  t.ok(M.spitAction.isRunning(), 'the clip plays when she spits');
  const q0 = M.rider.quaternion.clone();
  for (let i = 0; i < 8; i++) M.frame(1 / 30);
  t.ok(M.rider.quaternion.angleTo(q0) > 0.1, 'and her rider rears');

  // ---- 5 The launch: mines, boats, rock, arch, whether or not you land a shot. ----
  await fresh('launch', { prep: (r) => { r.dameWith = true; } });
  a.beats.pending = []; a.beats.running = [];
  app.dev.god = true;
  a.rolling = true;
  let shotRock = false; let sawRock = false;
  for (let i = 0; i < 60 * 150 && !a.archDone; i += 30) {
    await step(e, 30);
    const r = a.projectiles.find((q) => q.kind === 'rock' && q.alive && q.sh);
    if (r) {
      sawRock = true;
      if (!shotRock) { shotRock = true; r.sh.onHit({ damage: 14 }); t.ok(!r.alive, 'a falling rock can be shot'); }
    }
  }
  t.ok(sawRock, 'rocks fall on the run');
  t.ok(a.archDone, 'the run reaches the arch with nothing landed');
  app.dev.god = false;
  a.player.hp = a.player.maxHp;
  for (let i = 0; i < 300 && !a.qte.active; i += 5) await step(e, 5);
  t.eq(a.qte.active?.label, 'DIVE', 'the arch comes down: a QTE');
  for (let i = 0; i < 200 && a.qte.active; i += 5) await step(e, 5);
  t.ok(a.player.hp < a.player.maxHp, 'missed: it hurts');
  t.ok(a.player.alive, 'but it does not end the run');

  // ---- 4.10 Wardrobe, ladders, knock-down, windows and the hay cart. ----
  await fresh('quay', { start: [27, 10], prep: (r) => { r.setFlag('siegeStarted'); } });
  const w = a.wardrobe;
  const push = a.interact.items.find((i) => i.kind === 'push');
  a.player.teleport(push.x - 1, 0, push.z);
  await step(e, 2);
  const wx = w.obj.position.x;
  push.use(a.player);
  await step(e, 200);
  t.ok(w.pushed && w.obj.position.x > wx + 1, 'the wardrobe slides across the door');
  await fresh('quay', { start: [25, 7] });
  const up = a.interact.items.find((i) => i.kind === 'ladder' && i.floor === 0);
  t.ok(up, 'the Net Loft has its ladder');
  a.player.teleport(up.x + 0.6, 0, up.z);
  await step(e, 2);
  up.use(a.player);
  await step(e, 90);
  t.eq(a.player.floor, 1, 'up the ladder');
  t.near(a.player.y, 3.2, 0.2, 'to the loft');
  const L = a.outsideLadders?.[0];
  t.ok(L, 'outside ladders exist');
  raiseLadder(a, L);
  t.ok(L.up, 'one can be raised');
  const knock = a.interact.items.find((i) => i.label === 'KNOCK DOWN' && i.enabled?.());
  t.ok(knock, 'with a prompt to knock it down');
  a.player.state = 'free';
  knock.use(a.player);
  await step(e, 40);
  t.ok(!L.up, 'and it falls');
  const win = a.interact.items.find((i) => i.kind === 'window' && i.floor === 1);
  t.ok(win, 'the loft has windows');
  a.player.hp = a.player.maxHp;
  a.player.teleport(win.x, 3.2, win.z);
  win.use(a.player);
  await step(e, 60);
  t.eq(a.player.floor, 0, 'drop from an upper window');
  t.ok(a.player.maxHp - a.player.hp <= 10.01, 'for 10 at most');
  await step(e, 2);
  // ---- 4.10 Ladders go both ways. ----
  await fresh('quay', { start: [25, 7] });
  const upA = a.interact.items.find((i) => i.kind === 'ladder' && i.floor === 0);
  const downA = a.interact.items.find((i) => i.kind === 'ladder' && i.floor === 1 && i.label === 'CLIMB DOWN');
  upA.use(a.player);
  await step(e, 90);
  downA.use(a.player);
  await step(e, 90);
  t.eq(a.player.floor, 0, 'and back down');
  t.near(a.player.y, 0, 0.2, 'to the ground');
  // ---- 4.13 Telegraph key: a save point, on a dry room's desk. ----
  const key = a.interact.items.find((i) => i.kind === 'telegraph');
  t.ok(key, 'the chapel has a telegraph key');
  key.use(a.player);
  await step(e, 2);
  t.eq(app.top?.name, 'telegraph', 'it opens the telegraph');
  app.closeAll();

  // ---- 5 Kick enemies off the edge: water kills them. ----
  await fresh('road', { start: [10, 30] });
  const roadInfo = a.level.info;
  en = a.spawnEnemy('gaffer', { x: roadInfo.x(11), z: roadInfo.z(30), state: 'APPROACH', hpMul: 20 });
  await step(e, 2);
  t.eq(roadInfo.at(en.x + 1.2, en.z), '~', 'the bridge has water beside it');
  en.kicked(5, { x: en.x - 1, z: en.z });
  t.eq(en.state, 'SEA', 'kicked off the edge, he goes in');
  for (let i = 0; i < 600 && !en.dead; i += 20) await step(e, 20);
  t.ok(en.dead, 'sinks, and is gone');

  // ---- 4.8 and 4.9 The Carrier: 12 s until she is lost; shoot him and she drops. ----
  await fresh('cannery', { start: [24, 22], prep: (r) => { r.dameWith = true; } });
  const D2 = a.dame;
  const car = a.spawnEnemy('carrier', { x: D2.x + 0.8, z: D2.z, state: 'APPROACH', hpMul: 1 });
  await step(e, 90);
  for (let i = 0; i < 400 && !D2.taken; i += 10) await step(e, 10);
  t.ok(D2.taken, 'the Carrier shoulders her');
  t.eq(car.state, 'CARRY', 'and walks');
  const cx = car.x; const cz = car.z;
  await step(e, 120);
  t.ok(Math.hypot(car.x - cx, car.z - cz) > 0.5, 'toward the nearest door');
  t.ok(D2.takenT > 0 && D2.takenT < TUNING.dameGrabTime, `the clock runs (${D2.takenT.toFixed(1)})`);
  car.hit({ zone: 'torso', part: 'torso', damage: 999, weapon: { id: 'pistol' }, dir: new V(0, 0, 1), t: 1, point: new V(car.x, 1, car.z), by: a.player });
  await step(e, 2);
  t.ok(!D2.taken, 'shoot him and she drops');
  const car2 = a.spawnEnemy('carrier', { x: D2.x + 0.8, z: D2.z, state: 'APPROACH', hpMul: 20 });
  for (let i = 0; i < 400 && !D2.taken; i += 10) await step(e, 10);
  t.ok(D2.taken, 'taken again');
  for (let i = 0; i < 60 * (TUNING.dameGrabTime + 3) && a.player.alive; i += 30) { await step(e, 30); a.player.hp = a.player.maxHp; }
  t.ok(!a.player.alive, 'after 12 s she is lost, and so is the claim');
  void car2;

  // ---- 4.11 The last beat of each interactive scene can fail too. ----
  await fresh('cannery', { start: [24, 22], prep: (r) => { r.dameWith = true; } });
  const inf3 = a.level.info;
  startBeltFight(a, { X: (c) => inf3.x(c), Z: (r) => inf3.z(r), onDone: () => {} });
  a.beltFight.step = 99;
  let failsAt = 0;
  for (let i = 0; i < 900 && failsAt === 0; i += 10) { await step(e, 10); a.player.hp = a.player.maxHp; failsAt = a.beltFight?.fails ?? 0; }
  t.ok(failsAt > 0, 'the belt: a failed shove costs and asks again');
  t.eq(a.id, 'cannery', 'no reload');
  await fresh('nave', { start: [13, 20], prep: (r) => { r.dameWith = false; } });
  a.def.finalSettlement(a, null);
  const labels = [];
  let lastQ = null;
  for (let i = 0; i < 2000; i += 5) {
    await step(e, 5);
    a.player.hp = a.player.maxHp;
    const q = a.qte.active;
    if (q && q !== lastQ) {
      lastQ = q;
      labels.push(q.label);
      const n = labels.filter((x) => x === q.label).length;
      // Answer the climb; miss the first dodge, then answer it; miss the stamp, and see it asked again.
      if (q.label === 'CLIMB') await press(e, 'KeyE', 2);
      if (q.label === 'DODGE' && n > 1) await press(e, 'Space', 2);
      if (q.label === 'STAMP' && n > 1) break;
    }
  }
  t.ok(labels.includes('CLIMB') && labels.includes('DODGE') && labels.includes('STAMP'), `Final Settlement: press, press, mash (${labels.join(' ')})`);
  t.ok(labels.filter((x) => x === 'DODGE').length >= 2, 'a missed dodge asks again');
  t.ok(labels.filter((x) => x === 'STAMP').length >= 2, 'a missed stamp asks again');

  // ---- 5 The launch: shoot the mines; dodge the rock. ----
  await fresh('launch', { prep: (r) => { r.dameWith = true; } });
  a.beats.pending = []; a.beats.running = [];
  a.rolling = true;
  for (let i = 0; i < 60 * 40 && !a.mines.some((m) => m.alive); i += 30) await step(e, 30);
  const mine = a.mines.find((m) => m.alive);
  t.ok(mine, 'mines come');
  // A real shot, from the deck: nothing at the map's edge stops it, though it stops her.
  for (let i = 0; i < 60 * 20 && mine.pos.z < -30; i += 10) await step(e, 10);
  const deck = new THREE.Vector3(a.player.x, 1.6, a.player.z);
  t.eq(traceShot(a, deck, new THREE.Vector3().copy(mine.pos).sub(deck).normalize())?.shootable?.label, 'mine', 'a shot from the deck reaches it');
  mine.sh.onHit({ damage: 14 });
  t.ok(!mine.alive, 'and can be shot');

  // ---- 4.13 Telegraph rooms are safe once the Foghorn has sounded: calm music, enemies keep out. ----
  await fresh('quay', { start: [10, 20], prep: (r) => { r.setFlag('foghornDone'); } });
  await step(e, 10);
  t.ok(a.safe, 'the chapel is a safe room after the Foghorn');
  const outside = a.spawnEnemy('gaffer', { x: a.level.info.x(20), z: a.level.info.z(22), state: 'APPROACH', hpMul: 5 });
  await step(e, 240);
  t.ok(a.level.info.col(outside.x) > 16, 'and enemies stay out of it');
  // Stepping in while one is winding up: the swing doesn't land, and the game doesn't fall over.
  const swinger = a.spawnEnemy('gaffer', { x: a.player.x + 1, z: a.player.z, state: 'APPROACH', hpMul: 5 });
  a.director.takeToken?.(swinger);
  swinger.enter('WINDUP');
  const hpBefore = a.player.hp;
  await step(e, 90);
  t.eq(e.errors.length, 0, `a swing begun as she reached the dry room does no harm: ${e.errors[0] ?? ''}`);
  t.eq(a.player.hp, hpBefore, 'and it does not land');
  t.ok(swinger.state !== 'WINDUP' && !swinger.token, 'he gives it up and drops his token');
  const ledged = a.spawnEnemy('bottler', { x: a.player.x + 4, z: a.player.z, y: 1.05, state: 'LEDGE' });
  ledged.cool = 0;
  await step(e, 30);
  t.ok(ledged.state === 'LEDGE' && !a.projectiles.some((q) => q.owner === ledged), 'nobody on a ledge lobs a bottle at his own feet');
  ledged.dieQuiet();

  // ---- 4.8 A Limpet leaves the body it came from, scuttles to another, and can be shot on the way. ----
  await fresh('quay', { start: [28, 42] });
  a.noLimpets = false;
  const rand = a.ctx.random.chance;
  a.ctx.random.chance = () => true;
  const dead1 = await spawn('gaffer', 4, { hpMul: 1 });
  const other = await spawn('gaffer', 11, { hpMul: 1 });
  dead1.corpse = true; other.corpse = true;
  other.dieQuiet?.();
  if (!a.corpses.includes(other)) a.corpses.push(other);
  dead1.hit({ zone: 'head', part: 'head', damage: 9999, weapon: { id: 'rifle' }, dir: new V(0, 0, 1), t: 1, point: new V(dead1.x, 1.4, dead1.z), by: a.player });
  a.ctx.random.chance = rand;
  await step(e, 5);
  const lim = a.enemies.find((q) => !q.dead && q.type === 'limpet');
  t.ok(lim, 'a head kill can release a Limpet');
  t.eq(a.enemies.filter((q) => !q.dead && q.type === 'resalted').length, 0, 'it does not raise the body it just left');
  const d0 = Math.hypot(lim.x - other.x, lim.z - other.z);
  await step(e, 30);
  t.ok(Math.hypot(lim.x - other.x, lim.z - other.z) < d0 - 0.5, 'it heads for another');
  const raised = await (async () => { for (let i = 0; i < 400; i += 10) { await step(e, 10); if (a.enemies.some((q) => !q.dead && q.type === 'resalted')) return true; } return false; })();
  t.ok(raised, 'and if it arrives, that one rises');

  // ---- Across the bridge is a checkpoint, and the Bottlers out of reach can't hold up the next one. ----
  {
    const steps = (await import('../../src/data/levels/road.js')).road.beats.find((b) => b.id === 'north').steps;
    t.ok(steps.findIndex((st) => st.checkpoint) < steps.findIndex((st) => st.spawn), 'a checkpoint on reaching the far side');
    const wait = steps.find((st) => st.until);
    t.ok(wait.until({ enemies: [{ dead: false, state: 'LEDGE' }, { dead: true, state: 'APPROACH' }] }), 'ledge Bottlers do not hold up the road');
    t.ok(!wait.until({ enemies: [{ dead: false, state: 'APPROACH' }] }), 'anyone else does');
  }

  // ---- Dying in the Siege starts the Siege again. ----
  {
    const steps = (await import('../../src/data/levels/quay.js')).quay.beats.find((b) => b.id === 'siege').steps;
    const cp = steps.findIndex((st) => st.checkpoint);
    const prep = steps.findIndex((st) => st.run && String(st.run).includes('prepare'));
    t.ok(cp >= 0 && cp < prep, 'a checkpoint at the start of the Siege');
  }

  // ---- 4.4 Explosives and flares against every boss. ----
  await fresh('nave', { start: [13, 30], prep: (r) => { r.dameWith = false; } });
  const bath = new Bathysphere(a, { x: a.player.x, z: a.player.z - 8, yaw: 0 });
  a.enemies.push(bath); a.bath = bath;
  bath.state = 'WALK';
  await step(e, 3);
  const valves = () => bath.parts.reduce((n, v) => n + Math.max(0, v.hp), 0);
  const v0 = valves();
  explode(a, bath.x, 0, bath.z, 4, 80);
  t.ok(valves() < v0, 'a depth charge hurts the Bathysphere');
  a.throwGrenade(a.player, 'flare', { x: bath.x, z: bath.z });
  await step(e, 70);
  t.eq(e.errors.length, 0, 'a flare on him is harmless');
  await fresh('nave', { start: [13, 20], prep: (r) => { r.dameWith = false; } });
  const M2 = new Mother(a, a.player.x, a.player.z - 8);
  a.enemies.push(M2); a.mother = M2;
  await step(e, 3);
  const mic0 = M2.micHp;
  explode(a, M2.x, 0, M2.z, 4, 80);
  t.ok(M2.micHp < mic0, 'a depth charge hurts the Mother');
  a.throwGrenade(a.player, 'flare', { x: M2.x, z: M2.z });
  await step(e, 70);
  t.eq(e.errors.length, 0, 'a flare at the altar is harmless to her');
  await fresh('yard', { start: [17, 20], prep: (r) => { r.dameWith = false; } });
  const B3 = new Bosun(a, { ...ahead(5), yaw: 0 });
  a.enemies.push(B3);
  B3.state = 'WALK';
  await step(e, 3);
  explode(a, B3.x, 0, B3.z, 4, 80);
  t.ok(B3.staggerT >= 4, 'an explosion staggers the Bosun');
  a.throwGrenade(a.player, 'flare', { x: B3.x, z: B3.z });
  await step(e, 70);
  t.eq(e.errors.length, 0, `no engine errors: ${e.errors[0] ?? ''}`);

  // ---- 4.8 The Harpooner: a red glint before firing. ----
  await fresh('causeway', { start: [7, 90] });
  const glinter = a.spawnEnemy('harpooner', { x: a.player.x + 8, z: a.player.z, state: 'APPROACH', noLoot: true });
  t.ok(!glinter.glintMesh?.visible, 'no glint while he is only watching');
  glinter.thrownDone = false; glinter.enter('THROWUP');
  t.ok(glinter.glintMesh?.visible, 'a glint on the point as he winds up');
  for (let i = 0; i < 40 && !glinter.thrownDone; i++) await step(e, 3);
  t.ok(glinter.thrownDone && !glinter.glintMesh.visible, 'gone when the harpoon goes');
  glinter.enter('THROWUP'); glinter.enter('STUN');
  t.ok(!glinter.glintMesh.visible, 'and gone if he is stopped first');

  // ---- 4.8 The bottle's arc is telegraphed: a ring where it comes down, gone when it lands. ----
  await fresh('quay', { start: [40, 40] });
  const thrower = a.spawnEnemy('bottler', { x: a.player.x + 6, z: a.player.z, state: 'APPROACH' });
  const before = a.ctx.scene.children.length;
  a.throwFrom(thrower, a.player);
  const lob = a.projectiles[a.projectiles.length - 1];
  t.ok(lob.ring && a.ctx.scene.children.includes(lob.ring), 'a thrown bottle marks where it will land');
  t.ok(Math.hypot(lob.ring.position.x - a.player.x, lob.ring.position.z - a.player.z) < 0.5, 'which is where she stood');
  const ring = lob.ring;
  for (let i = 0; i < 80 && lob.alive; i++) await step(e, 3);
  t.ok(!lob.alive && !a.ctx.scene.children.includes(ring), `the ring goes with it (scene ${before} to ${a.ctx.scene.children.length})`);

  // ---- 4.8 Three palettes, some with the band bright, some dim. ----
  const bands = [islander, islander2, islander3].map((m) => m.palette.band);
  t.ok(new Set(bands).size > 1 && bands.includes('orange'), `islander bands differ: ${bands.join(', ')}`);

  // ---- 5 The belt: a telegraph in the north corridor. ----
  await fresh('cannery', { start: [24, 12] });
  const keys = a.level.info.find('t');
  t.ok(keys.some(([c, r]) => c >= 22 && c <= 26 && r >= 2 && r <= 9), `a telegraph in the north corridor (${JSON.stringify(keys)})`);
  t.ok(a.interact.items.some((k) => k.kind === 'telegraph' && a.level.info.row(k.z) < 10), 'and it can be used');

  // ---- 5 Exit: the West Gate is shut until the Foghorn. Walking up to it ends nothing. ----
  setup(); app.closeAll?.(); app.run = new Run();
  e = await boot(new Area('quay', { start: [4, 8], noSave: true }));
  a = e.game;
  for (let i = 0; i < 300 && a.cut; i++) { a.cut.skip?.(); await step(e, 2); }
  a.talk?.skip?.();
  a.player.teleport(a.level.info.x(2), 0, a.level.info.z(8.5), Math.PI / 2);
  await step(e, 60);
  t.eq(a.level.info.col(a.player.x), 2, 'she is at the shut West Gate');
  t.eq(app.run.chapter, 1, 'and chapter 1 goes on');
  t.ok(!app.top, `with no Claim Form (${app.top?.name})`);
  t.ok(!a.level.bySpot.get('G0,8').open, 'and the gate shut');
  app.run.setFlag('foghornDone');
  await step(e, 30);
  t.eq(app.run.chapter, 1, 'after the Foghorn, walking past along the wall ends nothing either');
  a.level.bySpot.get('G0,8').open || a.openGateAt?.(0, 8);
  await step(e, 10);
  a.player.teleport(a.level.info.x(1), 0, a.level.info.z(8.5), Math.PI / 2);
  await step(e, 30);
  t.eq(app.run.chapter, 2, 'going through the gate ends the chapter');

  // ---- 4.8 The saw dodge rolls aside, and never through anything. ----
  await fresh('quay', { start: [8, 14] });
  const qm = a.level.info;
  a.player.teleport(qm.x(8), 0, qm.z(13.2), Math.PI / 2);
  await step(e, 2);
  a.player.facing = Math.PI / 2;
  const roll = a.dodgeSpot(a.player, -1);
  t.ok(roll.z > qm.z(12) + 0.5, `asked to roll through the drying rack she goes the other way (z ${roll.z.toFixed(1)}, rack ${qm.z(12).toFixed(1)})`);
  // Somewhere with nothing near.
  let openSpot = null;
  for (let r = 16; r < 44 && !openSpot; r++) for (let c = 18; c < 46 && !openSpot; c++) {
    let open = true;
    for (let dr = -3; dr <= 3 && open; dr++) for (let dc = -3; dc <= 3 && open; dc++) if (!a.level.nav.walkable(qm.x(c + dc), qm.z(r + dr))) open = false;
    if (open) openSpot = [c, r];
  }
  a.player.teleport(qm.x(openSpot[0]), 0, qm.z(openSpot[1]), Math.PI / 2);
  await step(e, 2);
  a.player.facing = Math.PI / 2;
  const free = a.dodgeSpot(a.player, -1);
  t.ok(free.z < a.player.z - 1, `with nothing in the way she rolls the way she was asked (at ${openSpot}, z ${a.player.z.toFixed(1)} to ${free.z.toFixed(1)})`);

  // ---- 5 The roadblock: a Bottler up on a wagon, who has to be shot down. ----
  setup(); app.closeAll?.(); app.run = new Run();
  e = await boot(new Area('road', { start: [10, 56], noSave: true }));
  a = e.game;
  for (let i = 0; i < 300 && a.cut; i++) { a.cut.skip?.(); await step(e, 2); }
  await step(e, 30);
  const onWagon = a.enemies.find((q) => q.type === 'bottler' && q.state === 'LEDGE' && q.y > 0.8 && q.y < 2);
  t.ok(onWagon, 'the roadblock has its Bottler on the wagon');
  t.ok(a.level.props.some((q) => q.id === 'cart' && Math.hypot((q.obj.position.x) - onWagon?.x, (q.obj.position.z) - onWagon?.z) < 1.5), `and the wagon is under him (he is at ${onWagon?.x.toFixed(1)},${onWagon?.z.toFixed(1)})`);
  if (onWagon) {
    onWagon.hit({ zone: 'head', part: 'head', damage: 999, weapon: { id: 'rifle' }, dir: { x: 0, y: 0, z: -1 }, t: 5, point: { x: onWagon.x, y: 2, z: onWagon.z } });
    await step(e, 90);
    t.ok(onWagon.dead, 'he can be shot down');
    const crawler = a.spawnEnemy('limpet', { x: onWagon.x - 2.4, z: onWagon.z + 0.2, state: 'APPROACH', noLoot: true });
    const fromX = crawler.x; const fromZ = crawler.z;
    t.ok(!a.nearestCorpse(crawler.x, crawler.z, 16, crawler.hostCorpse) || a.nearestCorpse(crawler.x, crawler.z, 16, crawler.hostCorpse) !== a.corpses.find((c) => Math.hypot(c.x - onWagon.x, c.z - onWagon.z) < 0.5), 'a Limpet does not pick the body up on the wagon');
    await step(e, 60);
    t.ok(crawler.dead || crawler.latched || Math.hypot(crawler.x - fromX, crawler.z - fromZ) > 1, `and goes on to Max instead of waiting beside it (it moved ${Math.hypot(crawler.x - fromX, crawler.z - fromZ).toFixed(2)})`);
    t.eq(e.errors.length, 0, `with no errors: ${e.errors[0] ?? ''}`);
  }

  // ---- 4.8 Bodies are solid, and touching one never glues her to it. ----
  await fresh('road', { start: [10, 56] });
  for (let i = 0; i < 300 && a.cut; i++) { a.cut.skip?.(); await step(e, 2); }
  a.beats.pending = []; a.beats.running = [];
  for (const q of a.enemies) q.dieQuiet?.();
  app.dev.freezeAi = true;
  {
    const P = a.player; a.cam.yaw = 0;
    const cx = a.level.info.x(10.5); const cz = a.level.info.z(57);
    for (const [type, gap] of [['gaffer', 0.5], ['gaffer', 0.59], ['monk', 0.55], ['knight', 0.45]]) {
      const q = a.spawnEnemy(type, { x: cx, z: cz, state: 'SCRIPT' });
      await step(e, 2);
      for (const [key, dx, dz] of [['KeyW', 0, 1], ['KeyS', 0, -1], ['KeyA', 1, 0], ['KeyD', -1, 0]]) {
        P.teleport(q.x + dx * gap, 0, q.z + dz * gap);
        await step(e, 4);
        e.input.setKey(key, true);
        await step(e, 30);
        e.input.setKey(key, false);
        t.ok(Math.hypot(P.x - q.x, P.z - q.z) > 1.2, `a ${type} touching her at ${gap} m: she walks away on ${key} (${Math.hypot(P.x - q.x, P.z - q.z).toFixed(2)})`);
        await step(e, 4);
      }
      // Straight at him: stopped by him, and she doesn't end up the other side.
      P.teleport(q.x, 0, q.z - 3);
      await step(e, 4);
      e.input.setKey('KeyW', true);
      await step(e, 60);
      e.input.setKey('KeyW', false);
      t.ok(P.z < q.z - 0.4, `walking straight into a ${type} stops her in front of him (${(q.z - P.z).toFixed(2)} short)`);
      q.dieQuiet?.();
      await step(e, 4);
    }
  }
  app.dev.freezeAi = false;

  // ---- 6 The Mother has her own checkpoint: a death there doesn't mean the plumbing again. ----
  setup(); app.closeAll?.(); app.run = new Run(); app.run.dameWith = false;
  e = await boot(new Area('nave', { start: [13, 38] }));
  a = e.game;
  for (let i = 0; i < 200 && !a.bossLive; i++) { a.cut?.skip?.(); await step(e, 5); }
  t.ok(a.bossLive, 'the Bathysphere fight starts');
  {
    const B = a.bath;
    for (const q of [...B.parts, ...B.locks]) q.sh.onHit({ damage: 9999 });
    a.director.queue.length = 0;
    a.def.startHatchCut(a, B);
    for (let i = 0; i < 300 && (!a.mother || a.cut); i++) { a.cut?.skip?.(); await step(e, 5); }
    await step(e, 10);
    t.ok(a.mother && !a.cut, 'the hatch comes off and the Mother takes the altar');
    const waterBefore = a.waterY;
    a.reloadCheckpoint();
    for (let i = 0; i < 30; i++) await step(e, 5);
    a = e.game;
    t.ok(a.mother && !a.bath && a.bossLive, 'Continue comes back to the Mother, not the plumbing');
    t.near(a.waterY, waterBefore, 0.01, 'with the water where it was');
    t.eq(e.errors.length, 0, `with no errors: ${e.errors[0] ?? ''}`);
    a.mother.hitMic({ damage: 99999 });
    await step(e, 200);
    a.mother.hitEye({ damage: 99999 });
    await step(e, 30);
    t.ok(a.mother.dead, 'and she can still be finished from there');
  }

  // ---- 14 "Keep the player from getting caught on prop colliders": jammed in a crevice, she comes out by pushing. ----
  await fresh('road', { start: [10, 56] });
  for (let i = 0; i < 300 && a.cut; i++) { a.cut.skip?.(); await step(e, 2); }
  a.beats.pending = []; a.beats.running = [];
  for (const q of a.enemies) q.dieQuiet?.();
  {
    const P = a.player; const nav = a.level.nav;
    const jx = 0.34; const jz = 17.2;
    t.ok(!nav.walkable(jx, jz), 'a spot off the walkable grid, beside the cart');
    P.teleport(jx, 0, jz); a.cam.yaw = 0;
    for (const [ox, oz, hx, hz] of [[0.42, 0, 0.1, 0.5], [-0.42, 0, 0.1, 0.5], [0, 0.42, 0.5, 0.1], [0, -0.42, 0.5, 0.1]]) a.ctx.physics.addStaticBox({ position: [jx + ox, 1, jz + oz], halfExtents: [hx, 1, hz] });
    await step(e, 4);
    e.input.setKey('KeyW', true);
    await step(e, 30);
    t.near(Math.hypot(P.x - jx, P.z - jz), 0, 0.15, 'walled in close, pushing does not move her');
    await step(e, 120);
    e.input.setKey('KeyW', false);
    t.ok(nav.walkable(P.x, P.z) && Math.hypot(P.x - jx, P.z - jz) > 0.5, `after a moment of pushing she is back on open floor (${P.x.toFixed(2)}, ${P.z.toFixed(2)})`);
  }

  // ---- 4.8 A Net-Wife throws. Beside you she has nothing to hit you with, and she doesn't hold up the crowd. ----
  await fresh('road', { start: [10, 40] });
  app.run.rank = 1;
  const wife = a.spawnEnemy('netwife', { x: a.player.x + 1, z: a.player.z, state: 'APPROACH' });
  a.player.mag = 0; a.player.startReload?.();
  const hp4 = a.player.hp;
  let tokensHeld = 0; let staggers = 0;
  for (let i = 0; i < 40; i++) { await step(e, 6); if (wife.token) tokensHeld++; if (a.player.action?.name === 'stagger') staggers++; }
  t.eq(a.player.hp, hp4, 'she does her no harm up close');
  t.eq(staggers, 0, 'and never staggers her');
  t.eq(tokensHeld, 0, 'and never takes an attack token');
  t.ok(wife.state !== 'WINDUP' && wife.state !== 'ATTACK', `and doesn't wind up to hit her (${wife.state})`);
  const hp5 = a.player.hp; a.player.invuln = 0;
  t.eq(a.player.hurt(0, wife, {}), false, 'a hit for nothing is not a hit');
  t.eq(a.player.hp, hp5, 'and costs nothing');
  app.run.rank = 2;

  // ---- 4.8 Adaptive rank changes tokens, wind-up and the wave interval. ----
  await fresh('yard', { start: [17, 20], prep: (r) => { r.dameWith = false; } });
  t.eq(app.run.rank, 2, 'rank starts at 2');
  const waveAt = (rank) => { app.run.rank = rank; const B4 = new Bosun(a, { ...ahead(30), yaw: 0 }); return B4; };
  const gaps = {};
  for (const rank of [1, 2, 4]) {
    app.run.rank = rank;
    const before2 = a.director.queue.length;
    a.director.queueSpawn('gaffer', 2, [0, 0], { every: 2 });
    gaps[rank] = a.director.queue[a.director.queue.length - 1].delay;
    a.director.queue.length = before2;
  }
  t.ok(gaps[1] > gaps[2] && gaps[2] > gaps[4], `the gap between spawns widens with a low rank and shrinks with a high one (${JSON.stringify(gaps)})`);
  const B5 = waveAt(1);
  a.enemies.push(B5);
  B5.state = 'WALK'; B5.phase = 2; B5.waveT = 0;
  await step(e, 2);
  t.ok(B5.waveT > 40, `at rank 1 the Bosun's crew come further apart (${B5.waveT.toFixed(1)} s)`);
  a.director.queue.length = 0;
  B5.remove?.();
  app.run.rank = 2;

  // ---- The bot shops like anyone else: only what's on the shelf this chapter. ----
  await fresh('quay', { start: [45, 8] });
  app.run.money = 20000;
  const shopper = new Bot({ report: {} });
  shopper.area = a;
  shopper.shopScript();
  const sold = new Set(STOCK[1]);
  t.ok(app.run.ownsWeapon('scatter'), 'with money to burn, she buys what chapter 1 sells');
  t.ok(!app.run.ownsWeapon('rifle') && !app.run.ownsWeapon('harpoon'), 'and not the guns it does not');
  t.eq(app.run.case.count('ammoShells'), 0, 'nor a shell, in a chapter that sells none');
  for (const id of ['tin', 'dulse', 'holly', 'flare', 'depth']) if (!sold.has(id)) t.eq(app.run.case.count(id), 0, `nor ${id}`);

  // ---- The Bosun comes in through the yard's only way out. It shuts behind him and stays shut until he's dead. ----
  setup(); app.closeAll?.(); app.run = new Run(); app.dev.god = true; app.run.dameWith = true;
  e = await boot(new Area('yard', { start: [17, 28], noSave: true }));
  a = e.game;
  const northGate = a.level.bySpot.get('G17,0');
  t.ok(!northGate.open && !a.level.nav.walkable(a.level.info.x(17), a.level.info.z(0)), 'the yard gate starts shut');
  for (let i = 0; i < 400 && !a.bossLive; i++) { a.cut?.skip?.(); a.talk?.skip?.(); await step(e, 10); }
  t.ok(a.bossLive, 'the Bosun fight starts');
  t.ok(!northGate.open, 'the gate has shut behind him');
  t.ok(northGate.collider, 'and it is solid again');
  t.ok(!a.level.nav.walkable(a.level.info.x(17), a.level.info.z(0)), 'and the grid knows');
  a.player.teleport(a.level.info.x(17.5), 0, a.level.info.z(4), 0);
  a.bosun.state = 'SCRIPT';
  const walkNorth = a.player.z;
  for (let i = 0; i < 40; i++) { e.input.setKey('KeyW', true); await step(e, 6); a.player.yaw = Math.PI; a.cam.yaw = Math.PI; }
  e.input.setKey('KeyW', false);
  t.ok(a.player.z < walkNorth - 1, `she does walk north (z ${walkNorth.toFixed(1)} to ${a.player.z.toFixed(1)})`);
  t.ok(a.level.info.row(a.player.z) >= 1, `and stops at the gate (row ${a.level.info.row(a.player.z)})`);
  app.dev.god = false;

  // ---- 4.8 "Hard, not impossible, to run dry": every gun empty with nothing in reach must not stand still for ever. ----
  await fresh('quay', { start: [40, 40] });
  for (const w of app.run.ownedWeapons()) app.run.weapons[w].mag = 0;
  while (app.run.case.count('ammoPistol') > 0) app.run.case.remove(app.run.case.find('ammoPistol'));
  for (const d of a.drops) d.age = 99;
  const rounds = () => a.drops.filter((d) => d.id === 'ammoPistol' && d.age < 30);
  await step(e, 60 * 7);
  t.eq(rounds().length, 0, 'seven seconds with empty guns: nothing yet, she might still find some');
  await step(e, 60 * 2);
  t.eq(rounds().length, 1, 'eight seconds: a parcel from the Claims Desk');
  t.ok(rounds()[0] && Math.hypot(rounds()[0].x - a.player.x, rounds()[0].z - a.player.z) < 1.6, 'at her feet, within reach of the prompt');
  await step(e, 60 * 12);
  t.eq(rounds().length, 1, 'and one is enough while it lies there');
  a.pickUp(rounds()[0], a.player);
  t.eq(app.run.case.count('ammoPistol'), 18, 'eighteen rounds in the Case');
  await step(e, 60 * 12);
  t.eq(rounds().length, 0, 'none while she has anything to fire');
}
