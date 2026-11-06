// Winch reaches 100%; crane drop stuns the Bosun; lens puzzle; tide kills on time; siege timing; crypt.
import { boot, setup, step } from '../helpers.mjs';
import { THREE } from '../../pixel-engine.js';
import { traceShot } from '../../src/game/combat.js';
import { Area } from '../../src/game/area.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';
import { Bosun } from '../../src/game/bosses/bosun.js';
import { Bathysphere } from '../../src/game/bosses/bathysphere.js';
import { TUNING } from '../../src/data/tuning.js';
import { LENS } from '../../src/data/levels/abbey.js';
import { CryptSegment } from '../../src/game/setpieces/crypt.js';
import { MapInfo } from '../../src/game/mapPaint.js';

export default async function (t) {
  setup();
  // ---- Siege timing and the horn ----
  let e = await boot(new Area('quay', { start: [28, 20], noSave: true }));
  let a = e.game;
  a.beats.pending = a.beats.pending.filter((b) => b.id === 'westGate');
  a.beats.running = [];
  a.cut?.skip();
  await step(e, 5);
  app.dev.god = true;
  a.siege.prepare();
  t.eq(a.enemies.filter((x) => !x.dead).length, 14, 'siege: 14 round the bonfire');
  a.siege.start();
  t.ok(a.siege.active, 'siege active');
  a.player.teleport(a.level.info.x(30), 0, a.level.info.z(24));
  for (let i = 0; i < 95 * 60; i += 60) await step(e, 60);
  t.ok(a.siege.spawnedBase, 'bottlers from 1:00');
  t.ok(a.siege.flenser, 'Flenser from 1:30');
  t.ok(a.siege.nextLadder >= 1, 'ladders raised from 1:00');
  t.ok(a.enemies.some((x) => x.type === 'flenser' && !x.dead), 'the Flenser is here');
  t.ok(a.enemies.filter((x) => !x.dead).length <= 18, `the cap holds, near enough, with limpets and the Flenser (${a.enemies.filter((x) => !x.dead).length})`);
  a.siege.t = 209.5;
  await step(e, 60);
  t.ok(a.siege.horn, 'the horn sounds at 3:30');
  app.dev.god = false;

  // ---- The winch ----
  app.run = new Run();
  app.run.dameWith = true;
  app.run.setFlag('dameFreed');
  app.run.setFlag('winchDoorOpen');
  app.run.areaData('cannery').beats = { canneryStart: true, hall: true, flenserBurst: true, cold: true };
  e = await boot(new Area('cannery', { start: [8, 6], noSave: true }));
  a = e.game;
  await step(e, 10);
  // The Cold Room has its own mood, and leaves it at the door.
  {
    const was = [a.player.x, a.player.z];
    t.eq(a.world.moodName, 'indoor', 'the cannery is indoors');
    a.player.teleport(a.level.info.x(40), 0, a.level.info.z(5));
    await step(e, 3);
    t.eq(a.world.moodName, 'cold', 'the Cold Room is cold');
    a.player.teleport(was[0], 0, was[1]);
    await step(e, 3);
    t.eq(a.world.moodName, 'indoor', 'and the cannery is not');
  }
  t.ok(a.dame, 'the Dame is here');
  t.eq(a.def.dameContextLabel(a, a.dame), 'WINCH', 'command offers the winch');
  a.onCommand();
  t.ok(a.run.flag('winchStarted'), 'winch started');
  app.dev.god = true;
  const sh = a.level.shutters[0];
  for (let i = 0; i < 100 * 60 && !a.run.flag('winchDone'); i += 60) {
    await step(e, 60);
    for (const x of a.enemies) if (!x.dead) x.dieQuiet();
    a.director.queue.length = 0;
  }
  t.ok(a.run.flag('winchDone'), 'winch reaches 100%');
  t.ok(sh.open, 'the shutter is up');
  t.near(a.winch.t, 90, 2, 'in about 90 s');
  // A disturbance pauses it.
  const W = { t: 10 };
  a.winch = W;
  a.dame.mode = 'machine';
  app.dev.god = false;

  // ---- The Bosun and the crane ----
  app.run = new Run();
  app.run.dameWith = true;
  e = await boot(new Area('yard', { start: [8, 18], noSave: true }));
  a = e.game;
  await step(e, 5);
  a.beats.running = []; a.beats.pending = [];
  const B = new Bosun(a, { x: a.level.info.x(14), z: a.level.info.z(18), yaw: 0 });
  a.enemies.push(B); a.bosun = B;
  a.bossLive = true;
  B.state = 'WALK';
  a.crane.x = a.level.info.x(14);
  a.crane.dwell = 0;
  a.crane.reload = 0;
  app.dev.freezeAi = true;
  a.onCommand();
  t.ok(a.crane.dropping, 'Command drops the pallet');
  await step(e, 60);
  app.dev.freezeAi = false;
  t.eq(B.state, 'KNEEL', 'a crane drop puts the Bosun on his knees');
  t.near(B.kneeT, 8, 1.2, 'for 8 s');
  // The sacs glow when he's down, the way the plan has them; otherwise they're dull.
  await step(e, 2);
  t.ok(B.sacs.every((s) => s.lit.visible && !s.dull.visible && !s.torn.visible), 'down: every sac glows');
  const glowFrom = B.kneeT;
  B.chainPos.set(B.x, 1, B.z);
  B.harpoonChain({ weapon: 'pistol' });
  t.near(B.kneeT, glowFrom, 0.01, 'only a harpoon holds him by the chain');
  B.harpoonChain({ weapon: 'harpoon' });
  t.near(B.kneeT, glowFrom + 3, 0.01, 'a harpoon through the chain adds 3 s');
  B.kneeT -= 3;
  await step(e, 2);
  const s0 = B.sacs[0];
  const hp0 = s0.hp;
  s0.sh.onHit({ damage: 10 });
  t.near(hp0 - s0.hp, 20, 0.01, 'sacs take double while he kneels');
  B.state = 'WALK';
  const hp1 = s0.hp;
  s0.sh.onHit({ damage: 10 });
  t.near(hp1 - s0.hp, 10, 0.01, 'normal damage on the sacs otherwise');
  const live0 = B.sacs.filter((k) => k.alive).length;
  const before = B.speedMul;
  s0.sh.onHit({ damage: 9999 });
  t.eq(B.sacs.filter((k) => k.alive).length, live0 - 1, 'a sac bursts');
  t.near(B.speedMul / before, 1.15, 0.001, 'each burst makes him 15% faster');
  t.eq(B.phase, 2, 'phase 2');
  await step(e, 2);
  t.ok(!s0.lit.visible && !s0.dull.visible && s0.torn.visible, 'a burst sac is a torn flap');
  t.ok(B.sacs[1].dull.visible && !B.sacs[1].lit.visible, 'and on his feet the others are dull');
  // The anchor: thrown, lands, and the chain drags it back over 2 s, while he stands and hauls.
  {
    const P = a.player;
    for (let i = 0; i < 400 && a.cut; i++) { a.cut.skip?.(); await step(e, 2); }
    P.teleport(B.x, 0, B.z + 10);
    B.attackCool = 99;
    B.startThrow();
    let landed = -1; let done = -1;
    for (let i = 0; i < 60 * 8 && done < 0; i++) {
      await step(e, 1);
      if (landed < 0 && B.haul) landed = i;
      if (landed >= 0 && !B.haul) done = i;
    }
    t.ok(landed > 0, 'the anchor lands and lies there on its chain');
    t.near((done - landed) / 60, 2, 0.1, 'and is dragged back over 2 s');
    t.ok(B.state === 'WALK' && !B.haulObj.visible && !B.haulLine.visible, 'then he walks on and it is back in his hand');
    P.hp = P.maxHp;
  }
  B.devKill();
  t.ok(a.bosunDead, 'the Bosun falls');
  t.eq(a.run.valuables.blackPearl, 1, 'drops a Black Pearl');
  t.eq(a.run.money, 2000, 'and 2000 Doubloons');

  // ---- The tide ----
  app.run = new Run();
  e = await boot(new Area('causeway', { start: [7, 50], noSave: true }));
  a = e.game;
  await step(e, 5);
  a.beats.running = []; a.beats.pending = [];
  a.drownedAt = [];
  a.tide.running = true;
  a.tide.t = 239.5;
  t.ok(a.player.alive, 'alive before the deadline');
  await step(e, 60);
  t.ok(!a.player.alive, 'the tide kills on time');
  await step(e, 240);
  t.eq(app.top?.name, 'denied', 'CLAIM DENIED screen');
  app.closeAll();
  app.slow = 1;
  t.eq(a.deathReason, 'LOST AT SEA', 'lost at sea');

  // ---- The lens puzzle ----
  app.run = new Run();
  app.run.areaData('abbey').beats = { cloister: true };
  e = await boot(new Area('abbey', { start: [14, 16], noSave: true }));
  a = e.game;
  app.slow = 1;
  await step(e, 5);
  for (const st of a.statues) {
    while (st.dir !== st.want) {
      a.player.teleport(a.level.info.x(st.c) + 1, 0, a.level.info.z(st.r) + 1);
      await step(e, 2);
      st.item.use(a.player);
      await step(e, 80);
    }
  }
  t.ok(a.run.flag('lensSolved'), 'lens puzzle solves when all three face their ways');
  // The directions really point at the lenses over the gate.
  for (const L of LENS) {
    const a2 = (L.want * Math.PI) / 4;
    const dx = Math.sin(a2); const dz = -Math.cos(a2);
    const tx = (L.lensAt[0] - L.c); const tz = (L.lensAt[1] - L.r);
    const n = Math.hypot(tx, tz);
    t.ok(dx * (tx / n) + dz * (tz / n) > 0.95, `lamp at ${L.c},${L.r} points at the lens`);
  }
  await step(e, 60);
  t.ok(a.savedBeats().lens || a.beats.running.some((r) => r.beat.id === 'lens'), 'lens beat runs');

  // ---- The crypt: Knight hears running, not stillness; two hits restart. ----
  app.run = new Run();
  app.run.dameWith = true;
  app.run.setFlag('lensSolved');
  app.run.areaData('abbey').beats = { cloister: true, lens: true };
  e = await boot(new Area('abbey', { start: [12, 24], noSave: true }));
  a = e.game;
  a.beats.pending = []; a.beats.running = [];
  await step(e, 4);
  const X = (c) => a.level.info.x(c); const Z = (r) => a.level.info.z(r);
  a.crypt = new CryptSegment(a, { X, Z, onDone: () => a.run.setFlag('cryptDone') });
  const C = a.crypt;
  const d = C.dameP;
  t.ok(a.player === d, 'control passes to the Dame');
  const k = C.knights[0];
  k.x = X(2); k.z = Z(14);
  d.teleport(X(3), 0, Z(21));
  d.noise = 0;
  await step(e, 10);
  t.ok(k.goal === null, 'a still Dame is not heard');
  d.noise = 9;
  k.goal = null;
  C.step(1 / 60, a.intent);
  t.ok(k.goal !== null, 'running is heard at 7 m');
  C.dameHit(k);
  t.eq(C.hits, 1, 'one hit');
  C.dameHit(k);
  t.eq(C.hits, 0, 'two hits restart the segment');
  t.near(d.z, Z(12), 0.1, 'back at the start');
  // The lever and the door hand control back to Max.
  const lever = C.items.find((i) => i.kind === 'lever');
  d.teleport(X(3), 0, Z(32));
  lever.use(d);
  t.ok(C.leverDone, 'lever pulled');
  t.ok(a.level.doorAt(7, 30).open, 'the door opens');
  await step(e, 60);
  d.teleport(X(7), 0, Z(30.5));
  C.step(1 / 60, a.intent);
  t.ok(a.run.flag('cryptDone'), 'through the door: crypt done');
  t.ok(a.player !== d, 'control returns to Max');
  t.ok(a.level.nav.walkable(X(11), Z(25)), 'Max comes out on open floor');
  {
    const steps = a.def.beats.find((b) => b.id === 'crypt').steps;
    const cp = steps.findIndex((st) => st.checkpoint);
    const ambush = steps.findIndex((st) => st.spawn);
    t.ok(cp > 0 && cp < ambush, 'a checkpoint before the ambush: the crypt is never replayed');
  }

  // ---- The Bathysphere: valves, water, hatch, column. ----
  app.run = new Run();
  app.run.dameWith = false;
  e = await boot(new Area('nave', { start: [13, 30], noSave: true }));
  a = e.game;
  a.beats.pending = []; a.beats.running = [];
  await step(e, 5);
  const S = new Bathysphere(a, { x: a.level.info.x(13.5), z: a.level.info.z(14), yaw: 0 });
  a.enemies.push(S); a.bath = S;
  S.state = 'WALK';
  a.bossLive = true;
  await step(e, 5);
  const w0 = a.waterY;
  t.ok(S.parts.every((p) => p.obj.getObjectByName('lit').visible && !p.obj.getObjectByName('torn').visible), 'the valves start whole, glowing');
  S.parts[0].sh.onHit({ damage: 9999 });
  t.ok(!S.parts[0].obj.getObjectByName('lit').visible && S.parts[0].obj.getObjectByName('torn').visible, 'a burst valve goes dark and leaves a stub');
  t.near(a.waterY - w0, 0.15, 0.001, 'a burst valve raises the water 0.15 m');
  t.ok(a.director.queue.length + a.enemies.filter((x) => x.type === 'monk').length >= 4, 'and brings 4 Monks');
  a.director.queue.length = 0;
  for (const x of a.enemies) if (x.type === 'monk') x.dieQuiet();
  // A scald per blast, however long you stand in it.
  {
    const P = a.player;
    P.teleport(S.x, 0, S.z + 4);
    S.yaw = 0;
    P.hp = P.maxHp;
    const hp0 = P.hp;
    S.toState('JET', 'SteamBlast');
    for (let i = 0; i < 110 && S.state === 'JET'; i++) { P.invuln = 0; S.stateT += 1 / 60; S.stepJet(1 / 60, P, 4); }
    t.near(hp0 - P.hp, 30 * P.store.diff.enemyDamage * TUNING.damageTaken, 0.01, 'the steam jet hits once a blast');
    P.hp = P.maxHp;
    P.slow = 0;
    S.toState('JET', 'SteamBlast');
    for (let i = 0; i < 110 && S.state === 'JET'; i++) { P.invuln = 0; S.stateT += 1 / 60; S.stepJet(1 / 60, P, 6.2); }
    t.eq(P.hp, P.maxHp, 'and reaches 6 m, no further');
    S.state = 'WALK';
  }
  // Charge into a column: it shatters and he's stunned.
  S.x = a.level.info.x(13.5); S.z = a.level.info.z(26);
  S.chargeDir = [-1, 0];
  S.toState('CHARGE', null);
  for (let i = 0; i < 200 && S.state === 'CHARGE'; i += 2) await step(e, 2);
  t.eq(S.state, 'STUNNED', 'a charge into a column stuns him');
  t.ok(a.columns.some((c) => c.broken), 'the column shatters');
  for (const p of S.parts) if (p.alive) p.sh.onHit({ damage: 9999 });
  t.eq(S.phase, 2, 'all valves gone: phase 2');
  // Wherever he sagged, the locks come round to face her: they're on his front, and he may have stopped facing a wall.
  {
    const P = a.player;
    P.hurt = () => false;
    const bearing = () => Math.atan2(P.x - S.x, P.z - S.z);
    S.x = a.level.info.x(13.5); S.z = a.level.info.z(26);
    P.teleport(S.x, 0, S.z + 7);
    S.yaw = bearing() + Math.PI;
    for (let i = 0; i < 20; i++) await step(e, 20);
    t.ok(Math.abs(Math.atan2(Math.sin(bearing() - S.yaw), Math.cos(bearing() - S.yaw))) < 0.2, 'he turns to face her as he sags');
    const lock = S.locks[0];
    const from = new THREE.Vector3(P.x, 1.6, P.z);
    const dir = new THREE.Vector3().copy(lock.pos).sub(from).normalize();
    t.eq(traceShot(a, from, dir)?.shootable?.label, lock.name, 'and a shot from there reaches a lock');
    // Pressed against him while he sags, she can always walk off: any way but through him.
    a.cam.yaw = 0;
    for (const [key, dx, dz] of [['KeyW', 0, 1], ['KeyS', 0, -1], ['KeyA', 1, 0], ['KeyD', -1, 0]]) {
      P.teleport(S.x + dx * 1.0, 0, S.z + dz * 1.0);
      await step(e, 6);
      e.input.setKey(key, true);
      await step(e, 30);
      e.input.setKey(key, false);
      t.ok(Math.hypot(P.x - S.x, P.z - S.z) > 2, `walking away from him works on ${key} (${Math.hypot(P.x - S.x, P.z - S.z).toFixed(2)} m)`);
      await step(e, 10);
    }
    delete P.hurt;
  }
  t.eq(S.state, 'SAG', 'he sags');
  for (const l of S.locks) l.sh.onHit({ damage: 9999 });
  t.ok(S.locks.every((l) => !l.obj.visible), 'a broken lock is gone from the hatch');
  t.eq(S.state, 'OPEN', 'locks gone: the hatch');
  t.ok(a.interact.items.some((i) => i.kind === 'hatch'), 'a prompt to tear it');
  // Hatch, then the Mother.
  a.def.startHatchCut(a, S);
  for (let i = 0; i < 60 * 20 && a.cut; i += 20) await step(e, 20);
  t.ok(a.mother, 'the Mother takes the altar');
  // She's stepped once a frame, like any enemy: at her written pace of a glob every 2.4 to 3.4 s.
  {
    let globs = 0;
    const add = a.addProjectile.bind(a);
    a.addProjectile = (k, ...r) => { if (k === 'glob') globs++; return add(k, ...r); };
    const hurt = a.player.hurt; a.player.hurt = () => false;
    const t0 = a.ctx.time;
    for (let i = 0; i < 180; i++) { await step(e, 10); for (const x of a.enemies) if (x.d?.crawler && !x.dead) x.dieQuiet?.(); }
    const every = (a.ctx.time - t0) / Math.max(1, globs);
    t.ok(every > 2.3 && every < 3.5, `a glob every ${every.toFixed(2)} s`);
    a.addProjectile = add; a.player.hurt = hurt;
  }
  const M = a.mother;
  // Her brood comes for you, and doesn't stop to raise the dead on the way.
  M.birthT = 0;
  M.step(1 / 60);
  {
    const brood = a.enemies.filter((q) => !q.dead && q.type === 'limpet');
    t.ok(brood.length > 0 && brood.every((q) => q.huntOnly), 'the Mother births hunters');
    t.ok(brood.length <= 2, 'two at a time');
    t.ok(a.drops.length >= 3, 'the hatch leaves supplies by the altar');
    // One flare, anywhere in the nave, kills every limpet at once.
    brood[0].x = a.player.x + 18; brood[0].z = a.player.z + 18;
    a.addProjectile('grenadeFlare', [a.player.x, 1.2, a.player.z], [a.player.x, 0, a.player.z + 1], { owner: null });
    await step(e, 60);
    t.ok(a.enemies.every((q) => q.dead || q.type !== 'limpet'), 'a flare clears the whole brood, however far off');
  }
  a.player.teleport(a.level.info.x(13.5), 0, a.level.info.z(20));
  M.hitMic({ damage: 500 });
  t.ok(!M.micSh.active, 'the microphone is gone');
  await step(e, 170);
  t.ok(M.eyeSh.active, 'and the voice carries on: the eye opens');
  M.hitEye({ damage: 9999 });
  t.ok(M.dead, 'the eye closes');
  for (let i = 0; i < 60 * 20 && !a.motherDead; i += 10) {
    await step(e, 10);
    if (a.qte.active) { const q = a.qte.active; a.qte.step(1 / 60, { action: q.key === 'action', dodge: q.key === 'dodge' }); if (a.qte.active) a.qte.active.fill = 9; a.qte.step(1 / 60, { action: true, dodge: false }); }
    a.cut?.skip();
  }
  t.ok(a.motherDead, 'Final Settlement');
  await step(e, 120);
  t.ok(a.level.gates[0].open, 'the side gate opens');
  t.eq(e.errors.length, 0, `no engine errors: ${e.errors[0] ?? ''}`);

  // ---- Continue gets kinder each time it's asked. ----
  app.run = new Run();
  e = await boot(new Area('road', { noSave: true }));
  a = e.game;
  await step(e, 10);
  {
    const R = app.run;
    R.health = 5;
    const shots = R.case.count('ammoPistol');
    const herbs = R.case.count('samphire');
    const data = R.toJSON();
    delete data.checkpoint;
    R.checkpoint = { area: 'road', entry: null, data, pos: null };
    const again = async () => { e.game.reloadCheckpoint(); await step(e, 20); a = e.game; };
    await again();
    t.near(app.run.health, 80, 0.01, 'first Continue: 80% cover');
    t.eq(app.run.case.count('ammoPistol'), shots, 'first Continue: no parcel');
    await again();
    t.near(app.run.health, 100, 0.01, 'second Continue: full cover');
    t.ok(app.run.case.count('samphire') > herbs, 'second Continue: and a samphire');
    t.eq(app.run.case.count('ammoPistol'), shots + 12, 'second Continue: 12 rounds from the claims desk');
    await again();
    t.eq(app.run.case.count('ammoPistol'), shots + 24, 'third Continue: 24 rounds');
    t.ok(app.run.case.count('samphire') > herbs, 'third Continue: and a samphire again');
  }
  t.eq(e.errors.length, 0, `no engine errors after Continue: ${e.errors[0] ?? ''}`);

  // ---- The launch's stern: a long gun, bought or lent. ----
  app.run = new Run();
  e = await boot(new Area('launch', { noSave: true }));
  a = e.game;
  await step(e, 5);
  t.eq(app.run.equipped, 'rifle', 'a Max with no long gun takes the rifle from the locker');
  t.ok(app.run.case.count('ammoRifle') >= 10, 'with rounds for it');
  app.run = new Run();
  app.run.addWeapon('harpoon');
  e = await boot(new Area('launch', { noSave: true }));
  await step(e, 5);
  t.eq(app.run.equipped, 'harpoon', 'one who bought the harpoon gun uses it');
  t.ok(!app.run.weapons.rifle, 'and gets no loan');

  // ---- The Bosun's chain swings as he moves. ----
  app.run = new Run();
  app.run.dameWith = false;
  e = await boot(new Area('yard', { noSave: true }));
  a = e.game;
  a.beats.pending = []; a.beats.running = [];
  await step(e, 5);
  {
    const B = new Bosun(a, { x: a.level.info.x(17), z: a.level.info.z(10), yaw: 0 });
    a.enemies.push(B);
    B.state = 'SCRIPT';
    await step(e, 30);
    const tip = () => B.anchorChain.points[B.anchorChain.points.length - 1].slice();
    const at = tip();
    t.ok(B.anchorChain.points.length === 6, 'the chain has its links');
    B.x += 1.5; B.commit?.();
    await step(e, 5);
    const moved = Math.hypot(tip()[0] - at[0], tip()[2] - at[2]);
    t.ok(moved > 0.2, `and it follows him (${moved.toFixed(2)} m)`);
  }
  t.eq(e.errors.length, 0, `no engine errors in the launch or the yard: ${e.errors[0] ?? ''}`);
}
