// The crowd: tokens, attacks, doors, windows, ladders, the Foghorn, Carriers, Limpets, Knights.
import { boot, setup, step } from '../helpers.mjs';
import { Area } from '../../src/game/area.js';
import { app } from '../../src/core/app.js';
import { Dame } from '../../src/game/companion.js';

function quiet(area) {
  area.beats.pending = []; area.beats.running = []; area.cut?.skip();
}

export default async function (t) {
  setup();
  const e = await boot(new Area('quay', { start: [28, 42], noSave: true }));
  const a = e.game;
  quiet(a);
  await step(e, 5);
  app.dev.god = true;
  // A crowd of 30 reaches the player and attacks; tokens never exceeded.
  const P = a.player;
  P.teleport(a.level.info.x(28), 0, a.level.info.z(26));
  for (let i = 0; i < 30; i++) a.spawnEnemy('gaffer', { x: P.x + Math.cos(i) * (10 + i % 5), z: P.z + Math.sin(i) * (10 + i % 5) });
  let maxTokens = 0; let attacks = 0; let inWindup = 0;
  const hurtOrig = P.hurt.bind(P);
  P.hurt = (...args) => { attacks++; return hurtOrig(...args); };
  for (let i = 0; i < 40; i++) {
    await step(e, 15);
    maxTokens = Math.max(maxTokens, a.director.tokens);
    inWindup = Math.max(inWindup, a.enemies.filter((x) => !x.dead && (x.state === 'WINDUP' || x.state === 'ATTACK')).length);
  }
  t.ok(attacks > 0, `a crowd of 30 reaches the player and attacks (${attacks})`);
  t.ok(maxTokens <= a.director.limit, `tokens never exceeded (${maxTokens}/${a.director.limit})`);
  t.ok(inWindup <= a.director.limit, `never more than the limit winding up (${inWindup})`);
  P.hurt = hurtOrig;
  const circling = a.enemies.filter((x) => !x.dead && x.state === 'CIRCLE').length;
  t.ok(circling > 0, `others hold off in a ring (${circling})`);
  for (const x of [...a.enemies]) x.dieQuiet();

  // Foghorn sends everyone to sea.
  for (let i = 0; i < 10; i++) a.spawnEnemy('gaffer', { x: P.x + i - 5, z: P.z + 5 });
  a.spawnEnemy('flenser', { x: P.x + 5, z: P.z + 8 });
  await step(e, 20);
  a.siege.foghorn();
  t.ok(a.cut, 'Foghorn plays its scene');
  for (let i = 0; i < 60 * 32 && a.cut; i += 30) await step(e, 30);
  await step(e, 30);
  t.ok(a.enemies.every((x) => x.dead), 'Foghorn: everyone gone');
  t.ok(a.run.flag('foghornDone'), 'Foghorn flag set');
  t.ok(a.level.gates[0].open, 'West Gate opens after the Foghorn');
  await step(e, 60);

  // Door bash.
  const door = a.level.doorAt(41, 30);
  door.open = false;
  const doorE = a.spawnEnemy('gaffer', { x: a.level.info.x(41.5), z: a.level.info.z(28) });
  P.teleport(a.level.info.x(41.5), 0, a.level.info.z(33));
  door.collider = door.collider ?? a.ctx.physics.addStaticBox({ position: [door.x, 1.6, door.z], halfExtents: [1, 1.6, 0.14] });
  door.hp = 3;
  let sawBash = false;
  for (let i = 0; i < 400 && !door.open; i += 10) { await step(e, 10); if (doorE.state === 'BASH') sawBash = true; }
  t.ok(sawBash, 'enemy at a closed door bashes');
  t.ok(door.open, 'bashing breaks the door');
  doorE.dieQuiet();

  // Vault: an enemy goes through a window.
  P.teleport(a.level.info.x(45), 0, a.level.info.z(34));
  const vaulter = a.spawnEnemy('gaffer', { x: a.level.info.x(48.5), z: a.level.info.z(34) });
  let vaulted = false;
  for (let i = 0; i < 600 && !vaulted; i += 10) { await step(e, 10); if (vaulter.state === 'VAULT') vaulted = true; }
  t.ok(vaulted, 'enemy vaults a window');
  vaulter.dieQuiet();

  // Ladder and floor links: Max upstairs, enemy climbs.
  const up = a.level.upper;
  P.teleport(a.level.info.x(30), up.y, a.level.info.z(8));
  P.floor = 1;
  await step(e, 5);
  t.near(P.y, up.y, 0.1, 'Max stands on the loft floor');
  const climber = a.spawnEnemy('gaffer', { x: a.level.info.x(26), z: a.level.info.z(8) });
  let climbed = false;
  for (let i = 0; i < 900 && !climbed; i += 10) { await step(e, 10); if (climber.state === 'CLIMB') climbed = true; }
  t.ok(climbed, 'enemy on the wrong floor climbs the ladder');
  for (let i = 0; i < 120; i += 10) await step(e, 10);
  t.eq(climber.floor, 1, 'enemy reached the loft');
  climber.dieQuiet();
  // Outside ladders knocked down from above.
  const L = a.outsideLadders[0];
  const { raiseLadder, knockLadder } = await import('../../src/data/levels/quay.js');
  raiseLadder(a, L);
  t.ok(L.link.active, 'outside ladder raised');
  const faller = a.spawnEnemy('gaffer', { x: L.link.x, z: L.link.z });
  faller.startClimb(L.link);
  knockLadder(a, L);
  t.ok(!L.link.active, 'ladder knocked down');
  t.eq(faller.state, 'KNOCKDOWN', 'anyone on it falls');
  faller.dieQuiet();
  P.teleport(a.level.info.x(28), 0, a.level.info.z(26));
  P.floor = 0;
  await step(e, 5);

  // Carrier takes the Dame; shooting him drops her.
  const D = new Dame(a, P.x + 1, P.z + 1, 0);
  a.dame = D;
  const car = a.spawnEnemy('carrier', { x: D.x + 0.5, z: D.z + 0.3 });
  for (let i = 0; i < 60 && !D.carrier; i++) await step(e, 2);
  t.ok(D.carrier === car, 'Carrier takes the Dame');
  t.eq(D.mode, 'carried', 'she is carried');
  await step(e, 30);
  car.hit({ zone: 'torso', part: 'torso', damage: 20, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 3, point: car.pos3(), by: P });
  t.ok(!D.carrier, 'shooting him drops her');
  t.eq(D.mode, 'follow', 'she runs back');
  car.dieQuiet();
  // Lost after the timer.
  const car2 = a.spawnEnemy('carrier', { x: D.x + 0.4, z: D.z + 0.2 });
  for (let i = 0; i < 60 && !D.carrier; i++) await step(e, 2);
  D.takenT = 0.1;
  app.dev.god = false;
  P.hurt = () => false;
  const die = P.die.bind(P);
  let lost = false;
  P.die = () => { lost = true; };
  await step(e, 12);
  t.ok(lost, 'the Dame carried past the timer loses the game');
  P.die = die; delete P.hurt;
  D.alive = true; D.carrier = null; D.taken = false; D.mode = 'follow';
  car2.dieQuiet();
  app.dev.god = true;
  a.friendlies.length = 0;
  a.dame.actor.root.visible = false;
  a.dame = null;

  // A Limpet reaches a corpse and raises a Re-Salted.
  const corpseE = a.spawnEnemy('gaffer', { x: P.x + 6, z: P.z });
  await step(e, 2);
  corpseE.hp = 0;
  corpseE.die({ weapon: { id: 'x' }, dir: { x: 0, y: 0, z: 1 }, zone: 'torso', point: corpseE.pos3() });
  const lim = a.spawnEnemy('limpet', { x: P.x + 8, z: P.z, noLoot: true });
  let risen = false;
  for (let i = 0; i < 300 && !risen; i += 5) { await step(e, 5); risen = a.enemies.some((x) => x.type === 'resalted' && !x.dead); }
  t.ok(risen, 'a Limpet raises a corpse as a Re-Salted');
  for (const x of [...a.enemies]) x.dieQuiet();
  void lim;

  // A flare kills Limpets and blinds the rest.
  const lim2 = a.spawnEnemy('limpet', { x: P.x + 3, z: P.z });
  const blind = a.spawnEnemy('gaffer', { x: P.x + 3, z: P.z + 1 });
  a.projectiles.push(new (await import('../../src/game/projectiles.js')).Projectile(a, 'grenadeFlare', [P.x, 1, P.z], [P.x + 3, 0, P.z], {}));
  for (let i = 0; i < 100 && !lim2.dead; i += 5) await step(e, 5);
  t.ok(lim2.dead, 'a flare kills a Limpet');
  t.eq(blind.state, 'BLIND', 'a flare blinds an Islander');
  blind.dieQuiet();

  // Knight: armour blocks the body, helmet then head.
  const kn = a.spawnEnemy('knight', { x: P.x, z: P.z - 8, state: 'SCRIPT' });
  kn.actor.play('Idle');
  await step(e, 3);
  const k0 = kn.hp;
  kn.hit({ zone: 'torso', damage: 14, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 8, point: kn.pos3(), by: P });
  t.ok(k0 - kn.hp < 2, 'armour blocks a body shot');
  for (let i = 0; i < 4 && kn.helmet > 0; i++) kn.hit({ zone: 'head', damage: 28, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 8, point: kn.pos3(), by: P });
  t.ok(kn.helmet <= 0, 'shots take the helmet off');
  t.ok(kn.helmetOff, 'helmet off flag');
  const k1 = kn.hp;
  kn.hit({ zone: 'head', damage: 28, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 8, point: kn.pos3(), by: P });
  t.near(k1 - kn.hp, 28, 0.01, 'then the head takes full damage');
  kn.dieQuiet();
  // Monk: shield blocks the front until the arm is hit.
  const mk = a.spawnEnemy('monk', { x: P.x, z: P.z - 6, state: 'SCRIPT', yaw: 0 });
  mk.actor.play('Idle');
  await step(e, 2);
  const m0 = mk.hp;
  mk.hit({ zone: 'torso', damage: 14, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: -1 }, t: 6, point: mk.pos3(), by: P });
  t.eq(mk.hp, m0, 'shield blocks a front torso shot');
  mk.hit({ zone: 'arm', damage: 10, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: -1 }, t: 6, point: mk.pos3(), by: P });
  t.ok(!mk.shieldUp, 'an arm shot drops the shield');
  mk.dieQuiet();
  // Flenser: only head hits or scatter stagger him; the saw kills on Standard unless dodged.
  const fl = a.spawnEnemy('flenser', { x: P.x, z: P.z - 2, state: 'APPROACH' });
  fl.hit({ zone: 'torso', damage: 14, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 2, point: fl.pos3(), by: P });
  t.ok(fl.state !== 'STUN', 'torso does not stagger the Flenser');
  fl.hit({ zone: 'head', damage: 28, weapon: { id: 'pistol' }, dir: { x: 0, y: 0, z: 1 }, t: 2, point: fl.pos3(), by: P });
  t.eq(fl.state, 'STUN', 'a head shot does');
  fl.dieQuiet();
  app.dev.god = false;
  a.sawAttack(fl, P);
  t.ok(a.qte.active, 'the saw opens a dodge QTE');
  a.qte.step(0, { action: false, dodge: true });
  t.ok(!a.qte.active, 'dodged');
  P.invuln = 0;
  await step(e, 40);
  const hp0 = P.hp;
  a.sawAttack(fl, P);
  a.qte.step(0, { action: true, dodge: false });
  t.ok(!P.alive || P.hp < hp0, 'failing the saw QTE on Standard kills');
  t.eq(e.errors.length, 0, `no engine errors: ${e.errors[0] ?? ''}`);
}
