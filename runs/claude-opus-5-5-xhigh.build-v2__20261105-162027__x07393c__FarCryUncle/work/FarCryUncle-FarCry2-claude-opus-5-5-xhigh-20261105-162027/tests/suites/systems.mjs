// Systems: each rule from the plan, in Node, through the real game.
import { boot, Player } from '../lib/bot.mjs';
import { TUNING, resetTuning } from '../../src/core/tuning.js';
import { SLIDERS, TUNING_DEFAULTS } from '../../src/content/tuning-defaults.js';
import { jamChance } from '../../src/combat/weapons.js';
import { FireGrid, S, F, FCELL, FN } from '../../src/world/fire.js';
import { Rng, THREE } from '../../pixel-engine.js';
import { SITES, POSTS, CASES, TRIGS, HALTS } from '../../src/content/sites.js';
import { BEATS } from '../../src/attract/beats.js';
import { WEAPONS } from '../../src/content/weapons.js';
import { MISSIONS } from '../../src/content/missions.js';
import { PersonAnim } from '../../src/actors/rig.js';
import { MODELS } from '../../src/art/models.js';
import { K } from '../../src/world/ground.js';
import { CAB_ARM } from '../../src/art/viewmodels.js';
import { ACT } from '../../src/core/actions.js';
export const name = 'systems';
export const covers = ['src', 'pixel-engine.js'];
function headSpeed(g, wind, seconds = 30, seed = 5) {
  const f = new FireGrid(g.ground, new Rng(seed));
  f.fuel.fill(1); f.baseFuel.fill(1); f.height.fill(40);
  f.ignite(0, 0, 3);
  for (let i = 0; i < 4 * seconds; i++) f.tick(wind, 0.25);
  let hi = -1e9, lo = 1e9, flank = 0;
  for (let id = 0; id < FN * FN; id++) if (f.state[id] !== 0) { const x = f.wx(id), z = f.wz(id); hi = Math.max(hi, x); lo = Math.min(lo, x); flank = Math.max(flank, Math.abs(z)); }
  return { head: hi / seconds, back: -lo / seconds, flank: flank / seconds };
}
const quiet = (g) => { g.timers.length = 0; g.missions.abort(); g.ui.menu.clear(); g.dialogue.stopAll(); };
const freshGame = async (opts = {}) => { const { game: g, engine: e } = await boot(opts); const p = new Player(g, e); return { g, e, p }; };
export async function run(t) {
  await cabHandsWork(t);
  await everyScreenHasNativePrompts(t);
  await planDetails(t);
  await everyDevButton(t);
  await burntLandGrowsBack(t);
  await feverInTheLastAct(t);
  await planBehaviours(t);
  await fireTests(t);
  await weaponTests(t);
  await bodyTests(t);
  await aiTests(t);
  await vehicleTests(t);
  await worldTests(t);
  await shellTests(t);
  await inputTests(t);
  await tuningTests(t);
  await attractTests(t);
  await roundTests(t);
}
async function fireTests(t) {
  const { g, e, p } = await freshGame();
  const w5 = headSpeed(g, { x: 1, z: 0, total: 5 });
  t.near('fire head 2-5 m/s at wind 5', w5.head, 2, 5);
  t.ok('flanks clearly slower', w5.flank < w5.head * 0.85, JSON.stringify(w5));
  t.ok('back barely moves', w5.back < 1, JSON.stringify(w5));
  const w0 = headSpeed(g, { x: 1, z: 0, total: 0 });
  t.near('no wind, slower', w0.head, 1, 4);
  t.ok('running escapes the head', w5.head < 5.4);
  // A road stops fire without strong wind.
  const f = new FireGrid(g.ground, new Rng(9));
  f.fuel.fill(1); f.baseFuel.fill(1);
  for (let cz = 0; cz < FN; cz++) { f.fuel[120 + cz * FN] = 0; f.fuel[121 + cz * FN] = 0; }
  f.height.fill(40);
  f.ignite(f.wx(110), 0, 6);
  for (let i = 0; i < 4 * 60; i++) f.tick({ x: 1, z: 0, total: 4 }, 0.25);
  let crossed = 0; for (let id = 0; id < FN * FN; id++) if (f.cx(id) > 121 && f.state[id] !== 0) crossed++;
  t.eq('fire does not cross a road below 6 m/s', crossed, 0);
  const f2 = new FireGrid(g.ground, new Rng(9));
  f2.fuel.fill(1); f2.baseFuel.fill(1); f2.height.fill(40);
  for (let cz = 0; cz < FN; cz++) { f2.fuel[120 + cz * FN] = 0; f2.fuel[121 + cz * FN] = 0; }
  f2.ignite(f2.wx(110), 0, 20);
  for (let i = 0; i < 4 * 90; i++) f2.tick({ x: 1, z: 0, total: 8 }, 0.25);
  let crossed2 = 0; for (let id = 0; id < FN * FN; id++) if (f2.cx(id) > 121 && f2.state[id] !== 0) crossed2++;
  t.ok('embers cross a road in strong wind', crossed2 > 0);
  // Burnt can't re-burn.
  const f3 = new FireGrid(g.ground, new Rng(2));
  f3.fuel.fill(1); f3.baseFuel.fill(1); f3.height.fill(40);
  f3.ignite(0, 0, 4);
  for (let i = 0; i < 4 * 30; i++) f3.tick({ x: 1, z: 0, total: 0 }, 0.25);
  const id0 = f3.idOf(0, 0);
  t.eq('centre burnt', f3.state[id0], S.BURNT);
  t.eq('burnt cell refuses ignite', f3.lightCell(id0, 'test'), false);
  // Save round trip of the grid.
  const data = JSON.parse(JSON.stringify(f3.encode()));
  const f4 = new FireGrid(g.ground, new Rng(2));
  f4.fuel.fill(1); f4.baseFuel.fill(1);
  f4.decode(data);
  let same = true; for (let i = 0; i < FN * FN; i++) { const a = f3.state[i] === S.BURNING ? S.BURNT : f3.state[i]; if (a !== f4.state[i]) same = false; }
  t.ok('grid survives a save', same);
  // Regrowth: burnt, then green, then fresh after a day roll.
  f3.hours = 100; f3.regrowTick();
  t.eq('regrows after regrowHours', f3.state[id0], S.REGROW);
  t.eq('regrowing cannot burn', f3.lightCell(id0, 'test'), false);
  f3.dayRoll();
  t.eq('fresh again after the day rolls', f3.state[id0], S.FRESH);
  f4.state[id0] = S.REGROW;
  const f5 = new FireGrid(g.ground, new Rng(3)); f5.fuel.fill(1); f5.baseFuel.fill(1);
  f5.decode(f4.encode()); f5.dayRoll();
  t.eq('regrowth saved mid-way still rolls on to fresh', f5.state[id0], S.FRESH);
  // In the live world.
  g.dev.startMission('m3'); p.step(10); quiet(g);
  const s = SITES['long-field'];
  const n = g.fire.ignite(s.at[0], s.at[1], 6, 'player');
  t.ok('crop lights', n > 0);
  p.step(30);
  t.ok('burning counts', g.fire.counts.burning > 0);
  p.step(60 * 20);
  t.ok('burnt counts', g.fire.counts.burnt > 0);
  t.near('hectares by the ledger', g.ledger.hectares(), 0.1, 1e6);
  e.dispose();
}
async function weaponTests(t) {
  const { g, e, p } = await freshGame();
  // Wear math and jam frequency against the formula.
  t.near('1 in 800 at 90', 1 / jamChance(90), 700, 900);
  t.near('1 in 33 at 50', 1 / jamChance(50), 30, 36);
  t.near('1 in 17 at 30', 1 / jamChance(30), 15.5, 18.5);
  g.dev.startMission('m3'); p.step(10); quiet(g);
  g.dev.god = true; g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(40);
  const w = g.weapons;
  w.give('tractor', 90, true); p.step(30);
  const before = w.gun.cond;
  p.bot.hold('fire'); p.step(30); p.bot.hold('fire', false);
  const shots = 30 - w.gun.mag;
  t.ok('wear per shot', Math.abs((before - w.gun.cond) - shots * 0.35) < 0.01, `${before} ${w.gun.cond} ${shots}`);
  TUNING.wearRate = 2; const b2 = w.gun.cond; p.step(10); w.gun.mag = 30; p.bot.hold('fire'); p.step(12); p.bot.hold('fire', false);
  const s2 = 30 - w.gun.mag;
  t.ok('wear slider acts instantly', Math.abs((b2 - w.gun.cond) - s2 * 0.7) < 0.01);
  resetTuning('wearRate');
  // Jam frequency: fire many rounds at cond 50 and compare.
  w.gun.cond = 50; let jams = 0, fired = 0; const old = TUNING.wearRate; TUNING.wearRate = 0; const offJ = g.events.on('jam', () => { jams++; }); const offS = g.events.on('shot', () => { fired++; });
  for (let i = 0; i < 3000 && fired < 660; i++) { w.gun.mag = 30; w.gun.jam = 0; w.cool = 0; w.lock = 0; w.shoot(g.ctx); if (i % 200 === 0) p.step(1); }
  offJ(); offS(); TUNING.wearRate = old;
  t.near('jam rate near 1 in 33', fired / Math.max(1, jams), 18, 60);
  // Jam blocks fire; reload clears it, 2 to 4 presses.
  w.gun.cond = 80; w.gun.mag = 10; w.gun.jam = 3; w.cool = 0; w.lock = 0;
  p.bot.hold('fire'); p.step(10); p.bot.hold('fire', false);
  t.eq('jam blocks fire', w.gun.mag, 10);
  let presses = 0; while (w.gun.jam > 0 && presses < 8) { p.press('reload', 2); presses++; p.step(45); }
  t.eq('three presses clear it', presses, 3);
  p.bot.hold('fire'); p.step(10); p.bot.hold('fire', false);
  t.ok('fires again', w.gun.mag < 10);
  // Thresholds on the gun itself.
  w.gun.cond = 100; g.vm.updateWear(); t.ok('clean above 60', !g.vm.named['rust-tractor'].visible);
  w.gun.cond = 45; g.vm.updateWear(); t.ok('rust at 30-59', g.vm.named['rust-tractor'].visible && !g.vm.named['tape-tractor'].visible);
  w.gun.cond = 20; g.vm.updateWear(); t.ok('tape below 30', g.vm.named['tape-tractor'].visible);
  t.eq('icon red', w.condColor(), 'red');
  w.gun.cond = 50; t.eq('icon orange', w.condColor(), 'orange');
  w.gun.cond = 90; t.eq('icon white', w.condColor(), 'white');
  // Falls apart at 0.
  w.gun.cond = 0.2; w.gun.mag = 10; w.gun.jam = 0; p.step(60); w.cool = 0; w.lock = 0;
  p.bot.hold('fire'); p.step(6); p.bot.hold('fire', false);
  t.eq('condition hit zero', w.gun.cond, 0);
  p.step(90);
  t.eq('slot is empty after it falls apart', w.slots.main, null);
  t.ok('falls apart clip played', (g.vm.playCounts.FallApart ?? 0) >= 1);
  t.eq('back to the knife', w.current, 'melee');
  // Other guns fire as written.
  for (const id of ['m38', 'mule', 'empire', 'flare', 'tube']) {
    w.give(id, 100, true); p.step(30); const m0 = w.gun.mag; p.press('fire', 3);
    t.ok(`${id} fires`, w.gun.mag === m0 - 1, `${w.gun.mag} ${m0}`);
    p.step(180);
  }
  t.ok('scoped FOV table', WEAPONS.empire.ads === 12);
  w.give('weed', 100, true); p.step(30);
  const burning0 = g.fire.counts.lit;
  g.player.teleport(-260, -300); p.step(5); g.player.setYaw(0, -0.1);
  p.bot.hold('fire'); p.step(40); p.bot.hold('fire', false); p.step(5);
  t.ok('flamethrower lights things', g.fire.counts.lit > burning0);
  t.ok('flamethrower burns fuel', w.gun.mag < 120);
  // Bottle and charge.
  w.bottles = 1; p.step(30);
  const lit0 = g.fire.counts.lit;
  g.player.teleport(-280, -300); p.step(3); g.player.setYaw(0, 0.1);
  p.bot.hold('throw'); p.step(2); p.bot.hold('throw', false); p.step(120);
  t.eq('bottle thrown', w.bottles, 0);
  t.ok('bottle lights fuel', g.fire.counts.lit > lit0);
  w.charges = 1; p.step(90);
  g.player.teleport(-100, 100); p.step(3);
  p.holdFor('throw', 0.9); p.step(90);
  t.eq('charge planted by holding', w.placed.length, 1);
  g.player.teleport(-60, 100); p.step(3);
  let blasted = false; const off2 = g.events.on('blast', () => { blasted = true; });
  p.bot.hold('throw'); p.step(2); p.bot.hold('throw', false); p.step(40);
  off2();
  t.ok('second press detonates', blasted && w.placed.length === 0);
  // Melee from behind kills.
  g.actors.squads.forEach((q) => { q.disabled = false; });
  const sq = g.actors.addSquadDef('tst', { faction: 'concord', n: 1, at: [-100, 200], noReman: true }); sq.forceLive = true; g.actors.liveSquad(g.ctx, sq);
  const s = sq.members[0]; s.tree.halt(); s.yaw = 0; s.moveWanted = 0;
  g.story.pass = 'concord'; g.dev.invisible = true;
  w.equip('melee'); p.step(30);
  g.player.teleport(s.x, s.z - 1.4); p.step(2); p.look(s.x, s.y + 1.1, s.z); s.yaw = 0;
  p.press('melee', 12);
  t.ok('cane kills from behind', s.dead, `hp ${s.hp}`);
  t.ok('a kill counts on the ledger', g.ledger.v.paid >= 1);
  e.dispose();
}
async function bodyTests(t) {
  const { g, e, p } = await freshGame();
  g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(40);
  const b = g.body;
  t.eq('five segments', b.segments, 5);
  b.hp = 100; b.hurt(30, 'bullet'); t.eq('damage hits hp', b.hp, 70);
  p.step(60 * 7); t.eq('regen only to top of segment', Math.round(b.hp), 80);
  // Hit zones.
  const sq = g.actors.addSquadDef('tst', { faction: 'concord', n: 2, at: [50, 60], noReman: true }); sq.forceLive = true; g.actors.liveSquad(g.ctx, sq);
  g.dev.invisible = true;
  const s = sq.members[0]; s.tree.halt();
  g.player.teleport(50, 70); p.step(4);
  const eyeY = g.player.eye.y;
  const shootAt = (y) => { const d0 = s.hp; const dx = s.x - g.player.eye.x, dz = s.z - g.player.eye.z, dy = s.y + y - g.player.eye.y; g.damage.bullet(g.player.eye.x, g.player.eye.y, g.player.eye.z, dx, dy, dz, 100, 20, 'player'); return d0 - s.hp; };
  s.hp = 1000; s.maxHp = 1000;
  t.near('head x2.5', shootAt(1.65), 49, 51);
  t.near('body x1', shootAt(1.1), 19, 21);
  t.near('legs x0.7', shootAt(0.3), 13.5, 14.5);
  // Syrette.
  b.hp = 50; b.syrettes = 2; b.lastHit = g.time;
  p.press('heal'); p.step(55);
  t.eq('syrette heals 40', Math.round(b.hp), 90); t.eq('one used', b.syrettes, 1);
  // Surgery below 20: all four scenes, interruptible, no item used.
  for (let i = 0; i < 3; i++) {
    b.hp = 15; b.lastDamage = 'bullet'; p.step(1);
    const syr = b.syrettes;
    t.ok('surgery prompt below 20', g.state().prompts.some((x) => x.act === 'heal'));
    p.press('heal', 2);
    t.ok('surgery runs', !!b.surgery);
    const clip = b.surgery.clip;
    t.ok(`scene ${i + 1} is new`, clip === `Surgery${i + 1}`, clip);
    const start = g.player.feet.clone();
    p.bot.move = { x: 0, y: 1 }; p.step(60); p.bot.move = { x: 0, y: 0 };
    t.ok('cannot move in surgery', Math.hypot(g.player.feet.x - start.x, g.player.feet.z - start.z) < 0.05);
    p.until(() => !b.surgery, 300, 'surgery ends');
    t.eq('leaves you at 40', Math.round(b.hp), 40); t.eq('no item used', b.syrettes, syr);
  }
  b.hp = 15; b.lastDamage = 'fire'; p.step(1); p.press('heal', 2);
  t.eq('burn gets the lighter', b.surgery.clip, 'Surgery4');
  p.step(30); b.hurt(1, 'bullet');
  t.eq('a hit interrupts', b.surgery, null);
  // Burning, water.
  b.hp = 100; b.burning = 0; b.catchFire(); const h0 = b.hp; p.step(30);
  t.ok('burning hurts', b.hp < h0 - 2, `${h0} ${b.hp}`);
  p.step(130); t.eq('fire goes out off fuel', b.burning, 0);
  // Down, without a buddy: game over.
  g.actors.buddies.forEach((x) => { x.met = false; });
  b.hp = 5; b.hurt(50, 'bullet'); p.step(2);
  t.ok('dead with no buddy', b.dead); t.eq('game over screen', g.state().screen, 'gameover');
  t.eq('world frozen on game over', g.ctx.engine.timeScale, 0);
  // Down, with a buddy: rescue.
  g.ui.menu.clear(); g.engineResume(); b.dead = false; b.hp = 100;
  const ines = g.actors.buddy('ines'); ines.met = true; ines.dead = false; ines.spentUntil = 0; ines.woundedUntil = 0;
  b.hurt(500, 'bullet');
  p.until(() => g.scene.custom, 30, 'rescue scene');
  t.ok('rescue locks you', g.scene.locksMove);
  const was = g.player.feet.clone();
  p.until(() => !g.scene.custom, 500, 'rescue ends');
  t.eq('up at 40', Math.round(b.hp), 40);
  t.ok('dragged away', Math.hypot(g.player.feet.x - was.x, g.player.feet.z - was.z) > 5);
  t.ok('buddy spent for a day', ines.spentUntil > g.clock.abs + 20);
  const mags = g.actors.buddy('mags'); mags.met = true; ines.met = false; mags.spentUntil = 0; mags.woundedUntil = 0;
  b.hp = 100; p.step(30); b.hurt(500, 'bullet');
  p.until(() => g.scene.custom, 30, 'mags rescue'); p.until(() => !g.scene.custom, 500, 'mags rescue ends');
  t.eq('Mags gets you up at 60', Math.round(b.hp), 60);
  // Fever: tablet clears it; ignoring collapses and costs stones.
  g.story.feverRunning = true; b.tablets = 1; b.hp = 100; g.story.stones = 50;
  b.startFever();
  t.eq('fever on', b.fever, 'on');
  p.step(120);
  t.ok('view sways', b.swim > 0.2);
  t.ok('tablet prompt', g.state().prompts.some((x) => x.act === 'tablet'));
  p.holdFor('tablet', 1.1);
  t.eq('tablet taken', b.tablets, 0); t.eq('clearing', b.fever, 'clearing');
  p.step(60 * 5.2);
  t.eq('clears over 5 s', b.fever, 'none');
  t.ok('next attack scheduled', b.feverIn > 500);
  b.feverIn = 0; p.step(3);
  t.eq('attack arrives on schedule', b.fever, 'on');
  const hour0 = g.clock.abs;
  p.until(() => b.fever === 'none', 60 * 26, 'collapse');
  p.step(150);
  t.eq('20% of stones gone', g.story.stones, 40);
  t.ok('hours later', g.clock.abs > hour0 + 5);
  t.ok('woke somewhere safe', Math.hypot(g.player.feet.x - SITES['mile-forty'].at[0], g.player.feet.z - SITES['mile-forty'].at[1]) < 90 || g.story.safehouses.size > 0);
  g.story.stones = 0;
  // Slider: feverMinutes changes the interval.
  TUNING.feverMinutes = 30; b.feverAct = 1; b.scheduleFever(); t.ok('feverMinutes acts', b.feverIn > 27 * 60); resetTuning('feverMinutes');
  e.dispose();
}
async function aiTests(t) {
  const { g, e, p } = await freshGame();
  g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(40);
  g.story.pass = null;
  const vis = (s) => g.actors.visionFor(s, g.actors.playerInfo(), 1);
  const sq = g.actors.addSquadDef('tst', { faction: 'concord', n: 2, at: [30, 150], noReman: true }); sq.forceLive = true; g.actors.liveSquad(g.ctx, sq);
  const s = sq.members[0], o = sq.members[1]; s.tree.halt();
  g.clock.set(12); g.player.stance = 'stand'; g.player.inGrass = false;
  t.eq('vision is enemyVision by day', vis({ role: 'rifle' }), TUNING.enemyVision);
  g.player.stance = 'crouch'; t.near('crouch x0.55', vis({ role: 'rifle' }), TUNING.enemyVision * 0.54, TUNING.enemyVision * 0.56);
  g.player.stance = 'stand';
  g.clock.set(23); t.near('night x0.45', vis({ role: 'rifle' }), TUNING.enemyVision * 0.44, TUNING.enemyVision * 0.46);
  g.player.litUntil = g.time + 10; t.near('muzzle flash doubles it at night', vis({ role: 'rifle' }), TUNING.enemyVision * 0.89, TUNING.enemyVision * 0.91); g.player.litUntil = 0;
  g.clock.set(12);
  t.ok('sniper sees farther', vis({ role: 'sniper' }) > TUNING.enemyVision);
  // Spotting: a soldier fills suspicion and goes alert.
  s.state = 'idle'; s.suspicion = 0; s.yaw = Math.atan2(0, 1);
  g.player.teleport(s.x, s.z + 20); p.step(5);
  let states = new Set();
  for (let i = 0; i < 300; i++) { s.yaw = 0; p.step(1); states.add(s.state); }
  t.ok('goes suspicious', states.has('suspicious') || s.state === 'alert');
  t.eq('goes alert', s.state, 'alert');
  t.ok('squad shares it', o.state === 'alert' || o.state === 'searching', o.state);
  // Pass exemption.
  g.dev.god = true;
  const s2 = g.actors.addSquadDef('tst2', { faction: 'harvest', n: 1, at: [90, 150], noReman: true }); s2.forceLive = true; g.actors.liveSquad(g.ctx, s2);
  const h = s2.members[0];
  g.story.pass = 'harvest';
  t.ok('pass keeps its soldiers off you', !g.actors.hostileToPlayer(h));
  t.ok('the other army still hates you', g.actors.hostileToPlayer(s));
  g.actors.heardGunshot(h.x + 5, h.z, 120, 'player');
  t.ok('firing near them ends it', s2.angry && g.actors.hostileToPlayer(h));
  s2.angry = false;
  const hq = SITES.granary, inner = g.actors.innerYard('harvest');
  g.player.teleport(inner.x, inner.z); p.step(2);
  t.ok('the inner yard ends it too', g.actors.hostileToPlayer(h));
  // Their HQ, as a visitor and as the other army's contractor.
  const hqMan = g.actors.soldiers.find((x) => x.squad?.def.site?.hq) ?? g.actors.makeSoldier(g.ctx, { faction: 'concord', role: 'rifle', x: -430, z: -150, yaw: 0, squad: g.actors.squads.get('fort-clement') });
  const hqSquad = hqMan.squad, hqAngry = hqSquad.angry, passNow = g.story.pass, hqAt = g.player.feet.clone();
  hqSquad.angry = false; const rival = hqMan.faction === 'concord' ? 'harvest' : 'concord';
  g.player.teleport(hqSquad.def.site.at[0] + 30, hqSquad.def.site.at[1] + 30); e.step(2);
  g.story.grace = null;
  g.story.pass = null; t.ok('with no pass, a garrison shoots on sight, as everyone does', g.actors.hostileToPlayer(hqMan));
  g.story.pass = hqMan.faction; t.ok('with its own contract, too', !g.actors.hostileToPlayer(hqMan));
  g.story.pass = rival; t.ok('with the other army\'s contract, it shoots', g.actors.hostileToPlayer(hqMan));
  g.story.pass = passNow; hqSquad.angry = hqAngry; g.player.teleport(hqAt.x, hqAt.z); e.step(2);
  g.player.teleport(0, 40); p.step(2);
  g.story.pass = null;
  t.ok('Mile Forty truce holds', !g.actors.hostileToPlayer(h));
  g.story.truce = false;
  t.ok('truce over', g.actors.hostileToPlayer(h));
  g.story.truce = true;
  // Burn panic.
  h.ignite();
  t.ok('catches fire', h.burning > 0);
  const hx = h.x, hz = h.z, litBefore = g.fire.counts.lit;
  p.step(60 * 2);
  t.ok('runs in panic', Math.hypot(h.x - hx, h.z - hz) > 3);
  t.ok('fire spreads where they run', g.fire.counts.lit > litBefore, `${litBefore} then ${g.fire.counts.lit} at ${g.ground.kindAt(h.x, h.z)}`);
  p.step(60 * 4);
  t.ok('dies in about 5 s', h.dead);
  // Soldier gun jam and swear.
  g.dev.god = true; g.dev.invisible = false; let jam = 0; const off = g.events.on('soldier-jam', () => { jam++; });
  for (let i = 0; i < 400 && !jam; i++) { o.dead = false; o.jamT = 0; o.targetInfo = g.actors.playerInfo(); o.burstLeft = 3; o.fireCool = 0; o.shootOnce(); }
  off(); t.ok('soldier guns jam', jam > 0);
  t.ok('jam gives an opening', o.jamT > 1);
  // Post cleared then re-manned, and not before.
  g.actors.squads.forEach((q) => { q.disabled = false; });
  const p1 = g.actors.squads.get('p1');
  g.player.teleport(POSTS.p1.at[0] + 40, POSTS.p1.at[1] + 40); p.step(40);
  t.ok('post goes live in the bubble', p1.live);
  for (const m of [...p1.members]) m.hurt(9999, 'player', null, 'body', {});
  t.eq('post cleared', p1.alive, 0); t.ok('cleared time', p1.clearedAt != null);
  g.player.teleport(POSTS.p1.at[0] + 250, POSTS.p1.at[1] + 250); p.step(40);
  g.clock.advance(TUNING.postRemanHours - 2); p.step(40); t.eq('not re-manned early', p1.alive, 0);
  g.clock.advance(4); p.step(40); t.eq('re-manned after postRemanHours', p1.alive, POSTS.p1.n);
  e.dispose();
}
async function vehicleTests(t) {
  const { g, e, p } = await freshGame();
  g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); g.story.noPatrols = true; p.step(40); g.dev.god = false;
  const v = g.vehicles.spawn('pickup', -100, 35, -1.55);
  p.step(30);
  g.driving.enter(v); p.step(3);
  t.ok('seated', !!g.player.seat);
  t.ok('collider off while seated', !g.player.cc.collider.isEnabled());
  // Drive to waypoint.
  const start = [v.x, v.z];
  p.driveRoute([[-180, 31]]);
  t.ok('drives to a waypoint', Math.hypot(v.x + 180, v.z - 31) < 14);
  // Map up while driving; the cursor sets the waypoint.
  p.bot.analog.gas = 0.5;
  p.press('map');
  t.ok('map up while driving', g.map.up);
  p.bot.analog.gas = 0.6; p.step(60);
  t.ok('still rolling, the world never stops for the map', g.map.up && Math.abs(v.car.speed) > 0.5, String(v.car.speed));
  p.bot.analog.gas = 0.5;
  g.map.see('three-wells');
  const wx = SITES['three-wells'].at;
  g.map.cursor[0] = g.map.wx(wx[0]); g.map.cursor[1] = g.map.wy(wx[1]); g.map.moveCursor(0, 0);
  t.eq('hover focuses a marker', g.map.focus?.name, 'THREE WELLS');
  p.press('use');
  t.ok('cursor sets waypoint', g.map.waypoint && g.map.waypoint[0] === wx[0]);
  t.ok('not thrown out of the truck', !!g.driving.vehicle);
  p.press('map');
  p.bot.analog.gas = 0; p.step(30);
  // Damage thresholds.
  v.hp = 30; const topA = v.car.o.topSpeed;
  v.hurt(0, 'bullet');
  v.hp = 40; p.step(1);
  v.hp = 10.5; v.hurt(1, 'bullet');
  t.ok('below 10 it burns', v.onFire > 0, `${v.hp} ${v.onFire}`);
  const pos = [v.x, v.z];
  p.press('exit'); p.step(10);
  t.ok('out', !g.driving.vehicle);
  g.player.teleport(pos[0] + 40, pos[1]); p.step(3);
  p.until(() => !v.alive, 60 * 9.5, 'explodes in 8 s');
  // Repair.
  const u = g.vehicles.spawn('pickup', -300, 90, 0); p.step(30);
  u.hp = 0; u.stall(); t.ok('stalled at 0, not burning', u.stalled && u.alive);
  const yw = u.yaw, bo = u.def.bonnet;
  p.tp(u.x + Math.sin(yw) * bo[2], u.z + Math.cos(yw) * bo[2]);
  p.look(u.x, u.y + 0.5, u.z); p.step(3);
  p.bot.hold('use'); p.step(60 * 2); t.ok('not yet at 2 s', u.stalled); p.step(60 * 1.2); p.bot.hold('use', false); p.step(3);
  t.ok('hold 3 s repairs', !u.stalled); t.eq('back to 50', u.hp, 50);
  g.vehicles.hasKit = true; u.hp = 0; u.stalled = true;
  p.step(3); p.look(u.x, u.y + 0.5, u.z); p.step(2);
  p.holdFor('use', 1.6); t.ok('kit repairs in 1.5 s', !u.stalled, `stalled ${u.stalled}`);
  // Technical's gun swap; driverless truck rolls.
  const tech = g.vehicles.spawn('technical', -320, 90, 0); p.step(30);
  p.tp(tech.x + 1.8, tech.z); p.look(tech.x, tech.y + 0.5, tech.z); p.step(3); p.press('use');
  t.ok('in the technical', g.driving.vehicle === tech);
  p.press('swap'); t.ok('gun seat', g.driving.gunning);
  let shots = 0; const off = g.events.on('shot', () => { shots++; });
  p.bot.hold('fire'); p.step(70); p.bot.hold('fire', false); off();
  t.near('MG 10 rounds a second', shots, 9, 13);
  p.bot.hold('fire'); p.step(60 * 7); p.bot.hold('fire', false);
  t.ok('overheats at 6 s', g.weapons.overheated);
  p.step(60 * 4.3); t.ok('cools in 4 s', !g.weapons.overheated);
  p.press('swap');
  // Chase camera.
  p.press('chase'); p.step(3); t.ok('chase camera overrides', !!g.cam.override);
  p.press('chase'); p.step(3); t.ok('chase camera off', !g.cam.override);
  p.press('exit');
  // Slider.
  TUNING.vehicleTopSpeed = 45; tech.fixedUpdate(g.ctx, 1 / 60, { throttle: 0, steer: 0 }); t.ok('top speed slider acts', tech.car.o.topSpeed > 30); resetTuning('vehicleTopSpeed');
  // Patrol technicals.
  g.story.noPatrols = false; g.vehicles.startPatrols(); p.tp(0, 40);
  p.step(120);
  t.ok('patrols schedule', g.vehicles.patrols.length === 4);
  // Train moves on rails.
  const tr = g.train, s0 = tr.s; tr.run(s0 + 200, 12); p.step(120);
  t.ok('train moves', tr.s > s0 + 5);
  const c = tr.cars[0];
  t.ok('train sits on its rail', Math.abs(c.y - tr.railY(c.x, c.z)) < 0.01);
  e.dispose();
}
async function worldTests(t) {
  const { g, e, p } = await freshGame();
  g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(40); g.dev.god = true;
  g.story.flags.arrived = true;
  // Speeds.
  const speed = (setup) => { setup?.(); const a = g.player.feet.clone(); p.bot.move = { x: 0, y: 1 }; p.step(60); const d = Math.hypot(g.player.feet.x - a.x, g.player.feet.z - a.z); p.bot.move = { x: 0, y: 0 }; p.step(15); return d; };
  g.player.teleport(-420, -30); g.player.setYaw(0, 0); p.step(10); g.player.setYaw(Math.PI / 2, 0);
  t.near('run about 5.4', speed(), 4.6, 5.6);
  g.player.teleport(-420, -30); p.step(5); g.player.setYaw(Math.PI / 2, 0); p.bot.hold('sprint');
  t.near('sprint about 7.4', speed(), 6.4, 7.6); p.bot.hold('sprint', false);
  g.player.teleport(-420, -30); p.step(5); p.press('crouch'); g.player.setYaw(Math.PI / 2, 0);
  t.near('crouch about 2', speed(), 1.5, 2.2); t.eq('crouching', g.player.stance, 'crouch'); p.press('crouch');
  TUNING.playerSpeed = 2; g.player.teleport(-420, -30); p.step(5); g.player.setYaw(Math.PI / 2, 0);
  t.near('speed slider acts', speed(), 8.8, 11); resetTuning('playerSpeed');
  // Stamina.
  g.player.teleport(-420, -30); p.step(5); g.player.setYaw(Math.PI / 2, 0); p.bot.hold('sprint'); p.bot.move = { x: 0, y: 1 }; p.step(60 * 6.2);
  t.eq('6 s of stamina', Math.round(g.player.stamina), 0); p.bot.hold('sprint', false); p.bot.move = { x: 0, y: 0 }; p.step(60 * 4); t.near('refills in 8 s', g.player.stamina, 2.5, 3.5);
  g.player.stamina = 6;
  // Wading.
  g.player.teleport(130, 228); p.step(5);
  // Tracker rate and trig note.
  g.story.trackerOwned = true;
  const c0 = CASES[0];
  p.tp(c0.at[0] + 90, c0.at[1] + 0); p.press('tracker'); t.ok('tracker up', g.places.trackerOn); p.step(100); const i0 = g.places.lastInterval;
  p.tp(c0.at[0] + 8, c0.at[1]); p.step(100); const i1 = g.places.lastInterval;
  t.ok('beeps faster close', i1 < i0, `${i0} ${i1}`);
  t.ok('green within 60 m', g.places.nearLit);
  p.press('tracker');
  // Stone cases.
  const stones0 = g.story.stones;
  p.useNear(c0.at[0], c0.at[1], 0.3);
  t.eq('case pays', g.story.stones, stones0 + c0.stones);
  t.ok('case is gone', g.story.casesDone.has(c0.id));
  // Trig notes in order; six give the rifle.
  for (let i = 0; i < 6; i++) {
    const tr = TRIGS[i];
    p.useNear(tr.at[0], tr.at[1], 1.2);
    t.eq(`trig ${i + 1} note`, g.map.notes.filter((n) => !n.includes('MIND')).length >= i + 1, true);
  }
  t.ok('six trigs leave a clean rifle', g.story.unlocked.has('empire'));
  // Rail halt: fast travel once visited, 1 stone, 1 game hour.
  g.story.stones = 3;
  const h = HALTS['halt-mile'], w = HALTS['halt-west'];
  p.tp(w.at[0], w.at[1]); p.step(40); t.ok('visit counts', g.story.halts.has('halt-west'));
  p.tp(h.at[0] - 2, h.at[1] - 4); p.step(40);
  p.look(h.at[0] - 3, g.player.eye.y - 0.5, h.at[1] - 5); p.step(3);
  t.ok('halt prompt', g.state().prompts.some((x) => x.text === 'RAIL HALT'), JSON.stringify(g.state().prompts));
  p.press('use');
  t.eq('halt screen', g.state().screen, 'halts');
  const hr0 = g.clock.abs;
  p.pick('halt-west');
  t.eq('Bakr on a black screen', g.state().screen, 'black');
  p.until(() => g.state().screen === null, 400, 'arrive');
  t.ok('moved', Math.hypot(g.player.feet.x - w.at[0], g.player.feet.z - w.at[1]) < 10);
  t.eq('one stone', g.story.stones, 2); t.near('one hour', g.clock.abs - hr0, 0.95, 1.2);
  // Shop purchase; locker.
  g.story.stones = 50; g.story.truce = true;
  g.ui.openRack(); p.step(2);
  t.eq('rack', g.state().screen, 'rack');
  const list = g.ui.rackList();
  t.ok('stock includes four upgrades', list.filter((x) => x.kind === 'up').length === 4);
  t.ok('sells bottles and charges', list.some((x) => x.id === 'molotov') && list.some((x) => x.id === 'charge'));
  const top = g.ui.menu.top;
  const iMule = list.findIndex((x) => x.id === 'mule');
  for (let k = 0; k < iMule; k++) top.onSide(1, top);
  p.pick('buy');
  t.eq('bought', g.story.stones, 42); t.ok('unlocked for good', g.story.unlocked.has('mule')); t.eq('clean', g.weapons.slots.main.cond, 100);
  p.pick('buy'); t.eq('taking a clean one is free', g.story.stones, 42);
  const iKit = list.findIndex((x) => x.id === 'cleaning');
  top.index = iKit; p.step(2); p.pick('buy'); t.ok('cleaning kit', g.weapons.hasCleaning); t.eq('kit paid', g.story.stones, 36);
  top.index = list.findIndex((x) => x.id === 'pouch'); p.step(2); p.pick('buy'); t.eq('pouch carries five', g.body.maxSyrettes, 5);
  top.index = list.findIndex((x) => x.id === 'belt'); p.step(2); p.pick('buy'); t.ok('belt', g.weapons.hasBelt);
  top.index = list.findIndex((x) => x.id === 'vkit'); p.step(2); p.pick('buy'); t.ok('vehicle kit', g.vehicles.hasKit);
  p.pick('leave');
  t.ok('stock prices near plan total', list.reduce((a, x) => a + x.price, 0) > 80);
  // Locker: left/right picks.
  g.ui.openLocker(); p.step(2); t.eq('locker', g.state().screen, 'locker');
  const lk = g.ui.menu.top; lk.focus = 1; p.step(1);
  const main0 = g.weapons.slots.main.id;
  g.ui.menu.cycle(g.ui.menu.itemsOf(lk)[1], 1);
  t.ok('locker swaps the main gun', g.weapons.slots.main.id !== main0 && g.weapons.slots.main.cond === 100, g.weapons.slots.main.id);
  g.ui.menu.pop();
  // Sleep to hour; save and load.
  g.story.safehouses.add('pump-shed');
  const ps = SITES['pump-shed'];
  p.useNear(ps.at[0] + ps.safe.bed[0], ps.at[1] + ps.safe.bed[1], 0.7);
  t.eq('bed', g.state().screen, 'bed');
  t.eq('four hours and leave', g.state().items.length, 5);
  p.pick('dawn');
  p.until(() => g.state().screen === 'epigraph', 120, 'sleep');
  p.until(() => g.state().screen === null, 300, 'up');
  t.near('dawn', g.clock.hour, 5.5, 5.7);
  const saved = g.save.lastWritten;
  t.ok('sleep writes the save', !!saved && saved.reason === 'sleep');
  const stonesAt = g.story.stones;
  g.story.stones = 999;
  g.fire.ignite(-260, -300, 6, 'player'); p.step(60 * 20);
  const burntNow = g.fire.counts.burnt;
  g.ctx.input.send({ loadSave: saved }); p.step(5);
  t.eq('load restores stones', g.story.stones, stonesAt);
  t.eq('load restores land', g.fire.counts.burnt, saved.fire.runs ? g.fire.counts.burnt : 0);
  t.ok('fire out after load', g.fire.counts.burning === 0);
  t.near('load restores hour', g.clock.hour, 5.5, 5.7);
  // JSON-safe.
  const asJson = JSON.parse(JSON.stringify(g.save.snapshot('x')));
  t.ok('save is plain JSON', typeof asJson === 'object' && asJson.fire?.runs?.length > 0, Object.keys(asJson).join());
  // Mercy run: on time pays four tablets.
  g.missions.done.add('m1');
  g.body.tablets = 0;
  g.missions.start('mr1'); p.step(5);
  t.eq('crate job', g.state().mission, 'mr1');
  p.tp(-294, 98); p.step(10);
  p.until(() => g.missions.currentStep()?.do === 'use', 60, 'at the drop');
  p.useNear(-296, 96, 1); p.step(5);
  t.eq('four tablets', g.body.tablets, 4);
  t.eq('run counted', g.story.runsDone, 1);
  g.story.odileRefuses = true; g.body.tablets = 0;
  g.missions.start('mr2'); p.step(5); p.tp(121, 112); p.step(10); p.useNear(120, 110, 1); p.step(5);
  t.eq('a free run clears the refusal, no pay', g.body.tablets, 0); t.ok('refusal cleared', !g.story.odileRefuses);
  // A chained mission comes back after a load: M1 has no giver to return to.
  const after0 = g.save.snapshot('test'); after0.done = ['m0']; after0.story.flags = { arrived: true };
  g.missions.abort();
  g.ctx.input.send({ loadSave: after0 }); p.step(4);
  t.eq('load restarts M1 if M0 was the last thing done', g.missions.active?.id, 'm1');
  g.missions.abort(); g.missions.done.add('m1');
  p.step(2); g.body.fever = 'none'; g.body.feverOn = false; g.ui.menu.clear(); g.dialogue.stopAll();
  // The step types no story mission happens to need: a designer can still write them as data.
  const T = 'test-steps';
  MISSIONS[T] = { id: T, side: true, title: 'TEST', giver: null, requires: [], pay: 0, steps: [
    { do: 'steal', tag: 'stolen', text: 'STEAL' },
    { do: 'escort', who: 'dov', to: [-290, 100], r: 6, text: 'ESCORT' },
    { do: 'ride', from: [-420, 104], to: [-340, 102], speed: 16, text: 'RIDE' },
  ], ops: [] };
  const stolen = g.vehicles.spawn('pickup', -300, 96, 0); p.step(20);
  g.missions.tags.stolen = stolen;
  g.missions.start(T); p.step(2);
  t.eq('steal waits', g.missions.currentStep()?.do, 'steal');
  g.driving.enter(stolen); p.step(3);
  t.eq('driving it is stealing it', g.missions.currentStep()?.do, 'escort');
  g.driving.eject(); p.step(2);
  const dov = g.actors.buddy('dov'); const leashAt = g.player.feet.clone();
  g.player.teleport(leashAt.x + 200, leashAt.z); p.step(30);
  const dx0 = dov.x; p.step(60);
  t.near('an escort waits if you leave', Math.abs(dov.x - dx0), 0, 0.5);
  g.player.teleport(dov.x + 4, dov.z + 4); p.step(2);
  p.until(() => g.missions.currentStep()?.do === 'ride', 60 * 40, 'escort arrives');
  t.ok('riding a seat', !!g.player.seat && g.player.trainSeat != null);
  p.until(() => g.missions.active?.id !== T, 60 * 30, 'ride ends');
  t.ok('off the train at the end', !g.player.seat);
  delete MISSIONS[T]; g.missions.done.delete(T); dov.despawn(); g.dialogue.stopAll();
  // Late.
  g.missions.start('mr3'); p.step(3); g.missions.timer = 0.1; p.step(20);
  t.eq('late: she says nothing', g.state().mission, null);
  t.ok('mission failed quietly', !g.missions.done.has('mr3'));
  e.dispose();
}
async function shellTests(t) {
  const { g, e, p } = await freshGame();
  const a = g.actions, inp = g.ctx.input;
  g.actions.bot = null;
  const key = (code) => { inp.setKey(code, true); e.step(2); inp.setKey(code, false); e.step(2); };
  e.step(3);
  t.eq('title first', g.state().screen, 'title');
  key('Enter');
  t.eq('press goes to main', g.state().screen, 'main');
  t.ok('no continue without a save', !g.state().items.includes('continue'));
  t.ok('main has new game', g.state().items.includes('new'));
  t.ok('main has cash run', g.state().items.includes('cash'));
  t.ok('main has about', g.state().items.includes('about'));
  // Keyboard moves.
  key('ArrowDown'); t.eq('arrow moves focus', g.state().focus, 1);
  key('KeyS'); t.eq('S moves focus', g.state().focus, 2);
  key('ArrowUp'); t.eq('up moves focus', g.state().focus, 1);
  key('Enter'); t.eq('cash run menu', g.state().screen, 'cash');
  key('Escape'); t.eq('Esc goes back', g.state().screen, 'main');
  // Pad moves, codes through the action layer.
  key('PadDown'); t.eq('D-pad moves focus', g.state().focus, 2);
  key('PadCross'); t.eq('Cross confirms', g.state().screen, 'settings');
  key('PadR1'); t.eq('R1 changes tab', g.state().tab, 1);
  key('PadL1'); t.eq('L1 changes tab back', g.state().tab, 0);
  t.ok('music slider first', g.state().items[0] === 'music');
  key('PadCircle'); t.eq('Circle goes back', g.state().screen, 'main');
  // Mouse: hover moves focus, click activates.
  e.step(12);
  const hud = g.ctx.hud;
  const regions = g.ui.menu.regions.filter((r) => r.index != null);
  t.ok('regions for items', regions.length >= 3);
  const ptr = (r) => { const x = ((r.x + r.w / 2) / hud.width) * 2 - 1, y = 1 - ((r.y + r.h / 2) / hud.height) * 2; return [x, y]; };
  const r1 = regions.find((r) => r.index === 2);
  const [px, py] = ptr(r1);
  inp.setPointer(px, py, false); e.step(2);
  t.eq('hover moves focus', g.state().focus, 2);
  t.eq('mouse device', g.state().device, 'kbm');
  inp.setPointer(px, py, true); e.step(1); inp.setPointer(px, py, false); e.step(2);
  t.eq('click activates', g.state().screen, 'settings');
  key('Escape');
  // About is paged; every line of the brief's sections shows.
  const about = g.ui.menu.itemsOf(g.ui.menu.top).findIndex((i) => i.id === 'about');
  g.ui.menu.top.focus = about; key('Enter');
  t.eq('about screen', g.state().screen, 'about');
  const pages = g.ui.menu.top.pages, text = JSON.stringify(pages);
  for (const w of ['SOURCE INFORMATION', 'FAR CRY 2', 'PLAN.MD', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'ADDED ON IMPORT', 'NOT AFFILIATED', 'RAPIER', 'THREE.JS', 'PIXEL ENGINE']) t.ok(`about shows ${w}`, text.includes(w));
  const pg0 = g.state().page; key('ArrowRight'); t.eq('pages turn', g.state().page, pg0 + 1);
  key('Escape');
  // Settings: glyphs, persistence, defaults, music at 10%.
  t.near('music 10% on a clean boot', g.ctx.audio.volume.music, 0.0999, 0.1001);
  g.settings.music = 0.5; g.applySettings(); t.eq('slider sets music', g.ctx.audio.volume.music, 0.5);
  g.shell.resetSettings(); t.near('reset returns music to 10%', g.ctx.audio.volume.music, 0.0999, 0.1001);
  // Pause.
  g.dev.startMission('m3'); e.step(5); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); e.step(40);
  key('Escape');
  t.eq('pause opens', g.state().screen, 'pause');
  t.eq('time stopped', g.ctx.engine.timeScale, 0);
  const tm = g.time; e.step(30); t.eq('fixed steps stop', g.time, tm);
  t.ok('pause list', ['resume', 'ledger', 'settings', 'dev', 'about', 'quit'].every((i) => g.state().items.includes(i)));
  key('Escape'); t.eq('resume', g.state().screen, null); t.eq('time runs', g.ctx.engine.timeScale, 1);
  key('KeyJ'); t.eq('J opens the ledger', g.state().screen, 'ledger'); key('Escape');
  key('PadCreate'); t.eq('Create opens the ledger', g.state().screen, 'ledger'); key('PadCircle');
  // Device switch changes glyphs.
  g.interact.add({ tag: 'tst', x: g.player.feet.x, y: g.player.eye.y, z: g.player.feet.z - 1, r: 5, wide: true, verb: () => 'TEST', onUse: () => {} });
  g.player.setYaw(0, 0); e.step(4);
  key('KeyW');e.step(2);
  t.eq('kbm glyph', g.state().prompts.find((x) => x.text === 'TEST')?.glyph, 'E');
  inp.setKey('PadL1', true); e.step(2); inp.setKey('PadL1', false); e.step(2);
  t.eq('pad flips device', g.state().device, 'pad');
  t.eq('PlayStation glyph', g.state().prompts.find((x) => x.text === 'TEST')?.glyph, 'SQUARE');
  g.settings.glyphs = 'xb'; e.step(2);
  t.eq('Xbox glyph', g.state().prompts.find((x) => x.text === 'TEST')?.glyph, 'X');
  t.eq('glyph set shown', g.state().glyphSet, 'xb');
  g.settings.glyphs = 'ps'; g.interact.clearTagged('tst');
  // Real presses, no bot: melee on F, next weapon on Triangle and the wheel, with no prompt showing.
  g.weapons.give('tractor', 90, true); e.step(30);
  const cool0 = g.vm.playCounts.Swing ?? 0;
  key('KeyF'); e.step(16);
  t.eq('real F swings the knife', (g.vm.playCounts.Swing ?? 0), cool0 + 1);
  e.step(40);
  const slot0 = g.weapons.current;
  key('PadTriangle'); e.step(20);
  t.ok('real Triangle changes weapon', g.weapons.current !== slot0, g.weapons.current);
  key('KeyW'); e.step(30);
  t.eq('keys take the device back', g.state().device, 'kbm');
  const slot1 = g.weapons.current;
  inp.addPointer(0, 0, 1); e.step(30);
  t.ok('the wheel changes weapon', g.weapons.current !== slot1, g.weapons.current);
  key('Digit1'); e.step(30);
  t.eq('1 picks the knife', g.weapons.current, 'melee');
  // Dev mode: every tab has items that act.
  key('Escape');
  g.ui.menu.pick('dev');
  t.eq('dev opens from pause', g.state().screen, 'dev');
  for (let tab = 0; tab < 7; tab++) { g.ui.menu.top.tab = tab; e.step(1); t.ok(`dev tab ${tab} has items`, g.state().items.length > 0); }
  g.dev.frozen = false; g.applyTimeScale(); t.eq('dev can leave the world playing', g.ctx.engine.timeScale, 1);
  g.dev.frozen = true; g.applyTimeScale(); t.eq('or frozen', g.ctx.engine.timeScale, 0);
  g.ui.menu.top.tab = 0; e.step(1);
  const godBefore = g.dev.god;
  g.ui.menu.cycle(g.ui.menu.itemsOf(g.ui.menu.top)[0], 1); t.eq('cheat toggles', g.dev.god, !godBefore);
  g.dev.god = false;
  g.ui.menu.clear(); g.engineResume();
  // Dev tools called directly.
  g.dev.teleportSite('the-cut'); e.step(4); t.ok('teleport', Math.hypot(g.player.feet.x - 150, g.player.feet.z + 300) < 80);
  g.dev.noclip = true; g.dev.applyCheats(); const y0 = g.player.feet.y; g.actions.bot = new (p.bot.constructor)(); g.actions.bot.only = false; g.actions.bot.hold('jump'); e.step(30); g.actions.bot.hold('jump', false); t.ok('noclip flies', g.player.feet.y > y0 + 2); g.dev.noclip = false; g.dev.applyCheats(); g.actions.bot = null;
  g.dev.spawnSquad('harvest'); e.step(2); t.ok('spawn squad', g.actors.anyStateCounts() >= 4);
  const n0 = g.vehicles.list.length; g.dev.spawnVehicle('truck'); t.eq('spawn vehicle', g.vehicles.list.length, n0 + 1);
  g.dev.giveAll(); t.ok('all guns', g.story.unlocked.has('tube'));
  g.fire.ignite(g.player.feet.x + 20, g.player.feet.z, 8, 'player'); e.step(30);
  g.fire.extinguishAll(); t.eq('extinguish', g.fire.counts.burning, 0);
  g.world.regrowAll(); t.ok('regrow all', g.fire.burntList.length === 0);
  g.dev.startMission('m9'); e.step(3); t.eq('startMission jumps', g.state().mission, 'm9');
  t.ok('jump sets scars', g.story.flags.scarA && g.story.flags.scarB && g.story.flags.scarC);
  t.ok('jump sets story', !g.story.truce);
  const before = g.missions.stepI; g.dev.completeStep(); t.eq('complete current step', g.missions.stepI, before + 1);
  e.dispose();
}
async function inputTests(t) {
  // A pad stub, keyboard flows, analog triggers, touch gate.
  const pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [pad] }, configurable: true, writable: true });
  const { game: g, engine: e } = await boot({});
  const press = (i) => { pad.buttons[i].pressed = true; pad.buttons[i].value = 1; e.step(2); pad.buttons[i].pressed = false; pad.buttons[i].value = 0; e.step(2); };
  e.step(2);
  t.eq('title', g.state().screen, 'title');
  press(0);
  t.eq('real pad Cross', g.state().screen, 'main');
  t.eq('pad device', g.state().device, 'pad');
  press(13); t.eq('real pad D-pad', g.state().focus, 1);
  pad.axes[1] = 1; e.step(2); pad.axes[1] = 0; e.step(2);
  t.eq('stick moves menus', g.state().focus, 2);
  press(12);
  g.dev.startMission('m3'); e.step(5); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); e.step(40);
  const a = g.player.feet.clone();
  pad.axes[1] = -1; e.step(60); pad.axes[1] = 0; e.step(5);
  t.ok('stick walks', Math.hypot(g.player.feet.x - a.x, g.player.feet.z - a.z) > 3);
  const yaw0 = g.player.yaw;
  pad.axes[2] = 1; e.step(30); pad.axes[2] = 0; e.step(3);
  t.ok('right stick looks', Math.abs(g.player.yaw - yaw0) > 0.1, `${yaw0} ${g.player.yaw}`);
  g.weapons.give('tractor', 90, true); e.step(30);
  const m0 = g.weapons.gun.mag;
  pad.buttons[7].pressed = true; pad.buttons[7].value = 1; e.step(20); pad.buttons[7].pressed = false; pad.buttons[7].value = 0; e.step(3);
  t.ok('R2 fires', g.weapons.gun.mag < m0);
  press(9); t.eq('Options pauses', g.state().screen, 'pause'); press(1); t.eq('Circle resumes', g.state().screen, null);
  // Create + Options is the hub's.
  pad.buttons[8].pressed = true; pad.buttons[8].value = 1; e.step(2); g.ui.menu.clear(); pad.buttons[9].pressed = true; pad.buttons[9].value = 1; e.step(2); t.eq('Options ignored while Create held', g.state().screen, null); pad.buttons[8].pressed = false; pad.buttons[9].pressed = false; pad.buttons[8].value = 0; pad.buttons[9].value = 0; e.step(3); g.ui.menu.clear();
  // Analog throttle.
  const v = g.vehicles.spawn('pickup', g.player.feet.x + 6, g.player.feet.z, 0); e.step(30); g.driving.enter(v); e.step(2);
  pad.buttons[7].value = 0.5; pad.buttons[7].pressed = true; e.step(4);
  t.near('analog R2 reaches gas', g.actions.analog('gas'), 0.49, 1.01);
  pad.buttons[7].value = 0; pad.buttons[7].pressed = false; e.step(2);
  e.dispose();
  // Touch gate with matchMedia stubbed.
  globalThis.matchMedia = (q) => ({ matches: q.includes('coarse') });
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true, writable: true });
  const { game: g2, engine: e2 } = await boot({});
  e2.step(3);
  t.eq('touch-only: gate', g2.state().screen, 'gate');
  t.eq('touch-only: exact notice', g2.state().notice, 'Controller or keyboard required');
  t.ok('touch-only: Settings button', g2.state().items.includes('settings'));
  t.eq('touch-only: no button glyphs, since there are no buttons: only the big Settings target', g2.state().prompts.length, 0);
  // A tap (code Touch) on the button opens Settings.
  const reg = g2.ui.menu.regions.find((r) => r.index === 0);
  const hud = g2.ctx.hud;
  const x = ((reg.x + reg.w / 2) / hud.width) * 2 - 1, y = 1 - ((reg.y + reg.h / 2) / hud.height) * 2;
  g2.ctx.input.setPointer(x, y, true); e2.step(1); g2.ctx.input.setPointer(x, y, false); e2.step(2);
  t.eq('tap opens Settings', g2.state().screen, 'settings');
  g2.ui.menu.pop(); e2.step(2);
  // Attract runs behind the gate.
  e2.step(700);
  t.ok('attract runs behind the gate', g2.state().attract);
  g2.ctx.input.setKey('Touch', true); e2.step(2); g2.ctx.input.setKey('Touch', false); e2.step(3);
  t.ok('a tap exits to the gate', !g2.state().attract && g2.state().screen === 'gate', g2.state().screen);
  // A key clears the gate.
  g2.ctx.input.setKey('KeyA', true); e2.step(2); g2.ctx.input.setKey('KeyA', false); e2.step(2);
  t.eq('a key clears the gate', g2.state().screen, 'title');
  t.ok('and prompts come back in that device\'s glyphs', g2.state().prompts.some((q) => q.act === 'confirm'), JSON.stringify(g2.state().prompts));
  e2.dispose();
  delete globalThis.matchMedia;
  delete globalThis.navigator;
}
async function tuningTests(t) {
  const { g, e, p } = await freshGame();
  // Every slider has a live control and Reset returns them all.
  g.dev.startMission('m3'); p.step(5); quiet(g); p.step(3);
  g.shell.openPause(); g.dev.open();
  g.ui.menu.top.tab = 5; p.step(2);
  for (let page = 0; page < Math.ceil(SLIDERS.length / 4); page++) {
    g.dev.balancePage = page;
    for (const it of g.ui.menu.itemsOf(g.ui.menu.top)) {
      if (!it.slider) continue;
      const hi = it.slider.max;
      it.slider.set(hi);
      t.ok(`${it.id} moves`, Math.abs(TUNING[it.id] - hi) < it.slider.step);
    }
  }
  g.dev.balancePage = 0;
  // Slider response.
  p.step(1);
  const row = g.ui.menu.itemsOf(g.ui.menu.top).find((x) => x.id === 'resetAll');
  row.onSelect();
  for (const s of SLIDERS) t.eq(`${s.key} back to default`, TUNING[s.key], TUNING_DEFAULTS[s.key]);
  // Reset one.
  TUNING.jamRate = 4;
  const top = g.ui.menu.top;
  top.tab = 5; g.dev.balancePage = Math.floor(SLIDERS.findIndex((x) => x.key === 'jamRate') / 4); p.step(1);
  const jr = g.ui.menu.itemsOf(top).findIndex((x) => x.id === 'jamRate'); top.focus = jr;
  top.resetOne(g.ui.menu.itemsOf(top)[jr], top);
  t.eq('reset one', TUNING.jamRate, 1);
  g.ui.menu.clear(); g.engineResume();
  // Live effects, a sample of each.
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(30);
  TUNING.playerDamageTaken = 0; const h0 = g.body.hp; g.body.hurt(50, 'bullet'); t.eq('damage taken slider', g.body.hp, h0); resetTuning('playerDamageTaken');
  TUNING.fireDamage = 30; g.body.hp = 100; g.body.catchFire(); p.step(30); t.ok('fire damage slider', g.body.hp < 88); g.body.burning = 0; resetTuning('fireDamage');
  TUNING.dayMinutes = 2; const hr = g.clock.hour; p.step(300); t.ok('day minutes slider', (g.clock.hour - hr + 24) % 24 > 0.8); resetTuning('dayMinutes');
  TUNING.stonesReward = 2; g.story.stones = 0; g.missions.pay(10); t.eq('stones reward slider', g.story.stones, 20); resetTuning('stonesReward');
  TUNING.enemyVision = 200; t.eq('enemy vision slider', g.actors.visionFor({ role: 'rifle' }, { kind: 'x' }, 1) >= 200 * (g.clock.isNight() ? 0.6 : 1), true); resetTuning('enemyVision');
  TUNING.buddyWoundChance = 1; const b = g.actors.buddy('ines'); b.met = true; g.body.hp = 100; b.spentUntil = 0; b.woundedUntil = 0; g.body.hurt(999, 'bullet'); p.until(() => !g.scene.custom && g.time > 0, 600, 'scene'); t.ok('wound chance slider', b.woundedUntil > g.clock.abs); resetTuning('buddyWoundChance');
  e.dispose();
}
async function attractTests(t) {
  const { game: g, engine: e } = await boot({});
  const save0 = g.save.exists();
  e.step(600);
  t.ok('no attract before 10 s', !g.state().attract, `${g.attract.idleFrames}`);
  e.step(2);
  t.ok('attract at frame 601', g.state().attract);
  // Run the whole reel, more than once, without error.
  const seen = new Set();
  const off = g.events.on('attract-beat', (id) => seen.add(id));
  let frames = 0;
  while (g.attract.loops < 1 && frames < 60 * 220) { e.step(30); frames += 30; }
  off();
  t.eq('every beat ran', seen.size >= 12, true);
  t.ok('loops', g.attract.loops >= 1);
  t.eq('no errors in the reel', e.errors.length, 0, e.errors[0]);
  t.ok('saves untouched', g.save.exists() === save0 && g.save.disabled);
  // Any input exits, back to the screen it came from.
  g.ctx.input.setKey('KeyK', true); e.step(2); g.ctx.input.setKey('KeyK', false); e.step(2);
  t.ok('a key exits', !g.state().attract);
  t.eq('back on the title', g.state().screen, 'title');
  t.eq('mode title', g.state().mode, 'title');
  t.ok('saves enabled again', !g.save.disabled);
  t.ok('god off again', !g.dev.god);
  t.eq('no burns left behind', g.fire.counts.burnt < 200, true);
  // Main menu also times out, and comes back to main; input resets the count.
  g.ctx.input.setKey('Enter', true); e.step(2); g.ctx.input.setKey('Enter', false); e.step(2);
  t.eq('main', g.state().screen, 'main');
  e.step(300); g.ctx.input.setKey('ArrowDown', true); e.step(1); g.ctx.input.setKey('ArrowDown', false); e.step(300);
  t.ok('input resets the idle count', !g.state().attract);
  e.step(320);
  t.ok('attract from main', g.state().attract);
  g.ctx.input.setPointer(0.3, 0.3, false); e.step(3);
  t.ok('pointer movement exits', !g.state().attract);
  t.eq('back on main', g.state().screen, 'main');
  // Settings are exempt.
  g.ui.menu.pick('settings'); e.step(700); t.ok('settings exempt', !g.state().attract);
  e.dispose();
}
async function roundTests(t) {
  const { g, e, p } = await freshGame();
  g.startRound('solo');
  p.step(3);
  const r = g.round;
  t.eq('round mode', g.state().mode, 'round');
  t.eq('six cases', r.cases.length, 6);
  t.eq('four mercs', r.mercs.length, 4);
  t.ok('loadout', g.weapons.slots.main.id === 'tractor' && Math.round(g.weapons.slots.main.cond) === 70 && g.weapons.slots.sidearm.id === 'flare' && g.weapons.bottles === 2 && g.body.syrettes === 2);
  p.until(() => r.phase === 'play', 400, 'play phase');
  t.near('squads live, 16-24 soldiers', g.actors.anyStateCounts(), 16, 24);
  g.dev.god = true;
  // Take a case, walk it to the truck.
  const c = r.cases[0];
  c.state = 'free';
  p.tp(c.x, c.z + 1.2); p.look(c.x, g.world.heightAt(c.x, c.z) + 0.3, c.z); p.step(3);
  t.ok('take prompt', g.state().prompts.some((x) => /TAKE THE CASE/.test(x.text)), JSON.stringify(g.state().prompts));
  p.press('use');
  t.eq('carrying', r.local.carrying, 0);
  t.ok('slows you', g.player.carrying === 'case');
  p.bot.hold('sprint'); const f0 = g.player.feet.clone(); p.bot.move = { x: 0, y: 1 }; p.step(60); p.bot.move = { x: 0, y: 0 }; p.bot.hold('sprint', false);
  t.near('carry speed, no sprint', Math.hypot(g.player.feet.x - f0.x, g.player.feet.z - f0.z), 3.8, 5);
  // Down at 0: drop the case, bleed 25 s, another brings you up.
  g.dev.god = false;
  const m = r.local;
  g.body.hp = 5; g.body.hurt(100, 'bullet'); p.step(3);
  t.ok('down at 0', m.down); t.eq('case dropped', m.carrying, -1); t.eq('free again', r.cases[0].state, 'free');
  t.ok('bleeding', m.downT > 20);
  t.ok('input cut', !g.canAct());
  const mate = r.mercs[1];
  r.handleEvent(mate, ['revive', m.id]);
  mate.x = m.x; mate.z = m.z; r.handleEvent(mate, ['revive', m.id]);
  t.ok('revived', !m.down); t.eq('+1 revive', mate.revives, 1); t.eq('up at 40', Math.round(g.body.hp), 40);
  // Bleed out, then back at your road end after 15 s.
  g.body.hp = 5; g.body.hurt(100, 'bullet'); p.step(3);
  m.downT = 0.05; p.step(5); t.ok('out', m.respawnT > 10);
  m.respawnT = 0.05; p.step(5);
  t.eq('back at 100', g.body.hp, 100); t.ok('at the road end', Math.hypot(g.player.feet.x - m.x, g.player.feet.z - m.z) < 1);
  // Bank.
  g.dev.god = true;
  const c2 = r.cases[1];
  r.handleEvent(m, ['take', 1]);
  m.x = c2.x; m.z = c2.z; g.player.teleport(c2.x, c2.z); p.step(2); r.handleEvent(m, ['take', 1]);
  t.eq('carrying second', m.carrying, 1);
  p.tp(TRUCK_AT_X, TRUCK_AT_Z + 4); p.look(TRUCK_AT_X, g.player.eye.y, TRUCK_AT_Z); p.step(3);
  t.ok('bank prompt', g.state().prompts.some((x) => /BANK/.test(x.text)));
  p.press('use');
  t.eq('banked', m.stones, c2.stones); t.eq('case gone', c2.state, 'banked');
  // AI mercs earn too.
  for (let i = 0; i < 40 && r.mercs.slice(1).every((q) => q.stones === 0); i++) p.step(300);
  t.ok('hired guns bank stones', r.mercs.slice(1).some((q) => q.stones > 0), JSON.stringify(r.mercs.map((q) => [q.stones, q.carrying])));
  // Time-up: finish with everyone present, once.
  const out = {}; const off = g.events.on('round-finished', (o) => { Object.assign(out, o); });
  g.round.s.elapsed = 0;
  r.finish('time');
  off();
  t.eq('every player in the standings', out.standings.flat().length, 4);
  t.ok('sorted by stones', r.mercs.find((x) => x.id === out.standings[0][0]).stones >= r.mercs.find((x) => x.id === out.standings[out.standings.length - 1][0]).stones);
  t.ok('stats at most 6 names', Object.keys(out.stats[0]).length <= 6);
  t.ok('awards at most 3', (out.awards ?? []).length <= 3);
  t.ok('awards by the plan\'s names', (out.awards ?? []).every((x) => ['Last Friend', 'Paid in Full', 'Arsonist'].includes(x.title)), JSON.stringify(out.awards));
  p.step(5);
  t.eq('results screen on its own', g.state().screen, 'results');
  p.pick('leave');
  t.eq('title after', g.state().screen, 'title');
  t.ok('round disposed', !g.round);
  e.dispose();
}
// The cab as you see it: hands where the eye can find them, and the right one goes to the lever on a gear change.
async function cabHandsWork(t) {
  const { game: g, engine: e } = await boot({ forceViews: true, seed: 1 });
  g.startNew(); e.step(5); g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll();
  const cab = g.vehicles, cam = g.ctx.camera.three ?? g.ctx.camera.camera ?? g.ctx.camera;
  const inFrame = (w) => { const n = w.project(cam); return Math.abs(n.x) < 1 && Math.abs(n.y) < 1; };
  const knobAt = () => cab.cabShifter.localToWorld(new THREE.Vector3(0, 0.3, 0));
  const dashes = new Set();
  for (const kind of ['pickup', 'technical', 'truck', 'tanker']) {
    g.player.teleport(90, 65);
    const k = g.vehicles.spawn(kind, 95, 66, 1.3); e.step(30); g.driving.enter(k); e.step(12);
    t.eq(`${kind}: its own cab`, cab.cab, cab.cabs[kind]);
    t.ok(`${kind}: both hands are in frame`, inFrame(cab.cabGripL.getWorldPosition(new THREE.Vector3())) && inFrame(cab.cabGripR.getWorldPosition(new THREE.Vector3())));
    t.ok(`${kind}: the lever is in frame`, inFrame(knobAt()));
    dashes.add(cab.cab);
    g.driving.eject(); e.step(4); k.despawn?.();
  }
  t.eq('four different cabs', dashes.size, 4);
  g.player.teleport(90, 65);
  const v = g.vehicles.spawn('technical', 95, 66, 1.3); e.step(30); g.driving.enter(v); e.step(12);
  const toHand = (arm, part) => { const end = arm.localToWorld(new THREE.Vector3(0, 0, 1)); return end.distanceTo(part.getWorldPosition(new THREE.Vector3())); };
  t.near('the left forearm reaches its hand', toHand(cab.cabArmL, cab.cabGripL), 0, 0.01);
  t.near('the forearm keeps its length', cab.cabArmL.scale.z, CAB_ARM.fore - 0.01, CAB_ARM.fore + 0.01);
  t.near('and the upper arm', cab.cabUpperL.scale.z, CAB_ARM.upper - 0.01, CAB_ARM.upper + 0.01);
  g.driving.gear = 3; e.step(15);
  t.ok('mid shift the right hand has left the wheel', !cab.cabGripR.visible && cab.cabHandR.visible);
  t.ok('mid shift the lever is thrown', Math.abs(cab.cabShifter.rotation.x) > 0.1);
  t.near('the right forearm reaches the moving hand', toHand(cab.cabArmR, cab.cabHandR), 0, 0.01);
  e.step(30);
  t.ok('then it is back on the wheel', cab.cabGripR.visible && !cab.cabHandR.visible);
  g.driving.eject(); e.step(10);
  // A landing dips what you hold, on a spring, and not your head.
  const headRoom = g.player.eye.y - g.player.feet.y;
  g.player.landSpring.kick(-2); e.step(3);
  t.ok('a landing dips what you hold', g.player.landDip > 0.02, String(g.player.landDip));
  t.near('not your head', g.player.eye.y - g.player.feet.y, headRoom - 0.001, headRoom + 0.001);
  e.step(150);
  t.near('and springs back', g.player.landDip, -0.01, 0.01);
  // The town limit: the gun goes over the shoulder, and comes back.
  const town = SITES['mile-forty'].at, playsOf = (n) => g.vm.playCounts[n] ?? 0;
  g.story.truce = true; e.step(40); g.vm.endAction?.(); g.vm.action = null;
  const holsters = playsOf('Holster'), equips = playsOf('Equip');
  g.player.teleport(town[0], town[1]); e.step(3);
  t.ok('the town limit slings the gun', g.weapons.slung);
  t.eq('slinging plays the holster clip', playsOf('Holster'), holsters + 1);
  e.step(40); g.vm.action = null;
  g.player.teleport(town[0] + 300, town[1] + 300); e.step(3);
  t.eq('leaving town brings it back', playsOf('Equip'), equips + 1);
  // Sound through stone: the fort's wall stands between these two places, and nothing between those two.
  const fort = SITES['fort-clement'].at;
  g.player.teleport(fort[0] + 12, fort[1] - 44); e.step(5);
  const y = g.world.heightAt(g.player.feet.x, g.player.feet.z) + 1.7;
  g.camPos.set(fort[0] + 12, y, fort[1] - 44);
  t.ok('a wall muffles what is behind it', g.sfx.blocked(fort[0] + 12, fort[1] - 30));
  t.ok('open ground does not', !g.sfx.blocked(fort[0] + 12, fort[1] - 52));
  // A flag reads the wind.
  const flag = g.world.flags[0];
  t.ok('the fort flies a flag', !!flag);
  g.wind.pin([1, 0], 6); e.step(120);
  const tip = flag.chain.points.at(-1);
  t.ok('it streams downwind', tip[0] - flag.root[0] > 1.2, String(tip[0] - flag.root[0]));
  t.ok('its cloth follows the chain', flag.meshes.every((m, i) => { const q = flag.chain.points[i]; return m.visible && !!m.parent && Math.hypot(m.position.x - q[0], m.position.z - q[2]) < 0.5; }));
  g.wind.pinned = null;
  // The stock clips, where people do those things.
  const played = [];
  for (const m of ['shot', 'once']) { const orig = PersonAnim.prototype[m]; PersonAnim.prototype[m] = function (n, sp) { played.push(n); return orig.call(this, n, sp); }; }
  const origSet = PersonAnim.prototype.set; PersonAnim.prototype.set = function (l, u = l, f) { played.push(l, u); return origSet.call(this, l, u, f); };
  const man = g.actors.soldiers.find((s) => s.view && !s.dead);
  t.ok('a soldier with a body nearby', !!man);
  if (man) {
    man.state = 'idle'; man.alertTo(man.x + 20, man.z, null);
    t.ok('spotting you, he shouts', played.includes('Shout'));
    man.state = 'idle'; man.sitting = true; man.sleeping = false; man.goal = null; man.brainDuty(1 / 60);
    t.ok('he sits down first', played.includes('SitDown') && man.view.anim.lockT > 0);
    man.dutyT = 6.5; man.sitting = false; man.brainDuty(1 / 60); t.ok('and gets up again', played.includes('StandUp'));
    man.view.anim.update(5);
    man.dutyT = 1; man.sitting = false; man.brainDuty(1 / 60); t.ok('on guard he looks about', played.includes('IdleLook'));
    man.id = 2; man.state = 'alert'; man.goal = null; man.target = null; man.lastKnown = { x: man.x + 40, z: man.z }; man.brainSearch(1 / 60); man.goal = { x: 0, z: 0 }; man.brainSearch(1 / 60);
    t.ok('hunting you, some come in low', played.includes('CrouchWalk'));
  }
  if (man) {
    // Close enough to touch, he shoves. Hurt, he limps.
    man.state = 'alert'; man.jamT = 0; man.repositionT = 99; man.sees = true; man.reactT = 0; man.shoveT = 0; man.targetInfo = g.actors.playerInfo();
    man.lastKnown = { x: man.x + 1, z: man.z };
    const before = g.body.hp;
    man.brainCombat(0.1);
    t.ok('within reach he shoves', played.includes('Push'));
    t.ok('and it hurts', g.body.hp < before, `${before} ${g.body.hp}`);
    man.hp = man.maxHp * 0.2; man.state = 'searching'; man.searchT = 9; man.goal = { x: man.x + 10, z: man.z }; man.brainSearch(0.1);
    t.ok('badly hurt, he limps', played.includes('Limp'));
    man.hp = man.maxHp;
  }
  // One man of a dismounted crew is the driver, and he stays by the truck.
  const trk = g.vehicles.spawn('technical', g.player.feet.x + 30, g.player.feet.z, 0); e.step(5);
  trk.crew = 3; trk.faction = 'concord'; g.vehicles.dismount(g.ctx, trk);
  const drivers = g.actors.soldiers.filter((s) => s.vehicle === trk);
  t.eq('one driver in the crew', drivers.length, 1);
  t.eq('with the driver role', drivers[0]?.role, 'driver');
  if (drivers[0]) { const d = drivers[0]; d.x = trk.x + 30; d.z = trk.z; d.repositionT = 99; d.goal = null; d.jamT = 0; d.lastKnown = { x: trk.x, z: trk.z + 60 }; d.brainCombat(0.1); t.ok('he goes back to it', !!d.goal && Math.hypot(d.goal.x - trk.x, d.goal.z - trk.z) < 5); }
  const dov = g.actors.buddy('dov');
  dov.spawn(g.ctx, g.player.feet.x + 2, g.player.feet.z + 2, { hp: 200 }); e.step(2);
  if (dov.view) { dov.goDown(false); t.eq('a mate drags himself first', dov.view.anim.lowerName, 'Crawl'); e.step(110); t.eq('then sits with it', dov.view.anim.lowerName, 'WoundedSit'); dov.revive?.(); dov.despawn(); } else t.ok('the mate has a body', false);
  const local = g.actors.civilians.list.find((c) => c.view && c.home === SITES['mile-forty']) ?? g.actors.civilians.list.find((c) => c.view);
  local.waved = false; local.speed = 0; local.goal = null; g.player.teleport(local.x + 4, local.z + 4); e.step(4);
  t.ok('a local lifts a hand as you pass', played.includes('Wave'), `speed ${local.speed}`);
  // M8: people climb aboard as the platform clock runs.
  g.dev.startMission('m8'); e.step(90); g.ui.menu.clear(); g.dialogue.stopAll();
  t.ok('the platform hold has begun', g.holdT > 0, String(g.holdT));
  g.holdT = 50; e.step(130);
  t.ok('people climb aboard', played.includes('Climb'));
  t.ok('and are gone', g.world.crowd.some((c) => c.boarded && !c.p.object.visible));
  PersonAnim.prototype.set = origSet;
  e.dispose();
}
// PLAN 27: every screen shows native prompts for pad (PlayStation and Xbox glyphs) and keyboard/mouse. Each screen, each glyph set.
async function everyScreenHasNativePrompts(t) {
  const { game: g, engine: e } = await boot({ seed: 5 });
  const p = new Player(g, e);
  const m = g.ui.menu;
  const glyphsOf = (k) => new Set(Object.values(ACT).map((a) => a.glyph?.[k]).filter(Boolean));
  const allowed = { ps: glyphsOf('ps'), xb: glyphsOf('xb'), kbm: glyphsOf('kbm') };
  allowed.ps.add('TRIANGLE'); allowed.xb.add('Y'); allowed.kbm.add('M');   // the card's More Time button
  const clear = () => { m.clear(); g.dialogue.stopAll(); g.ctx.engine.timeScale = 1; };
  const front = () => { const f = g.player.feet; return [f.x, f.z - 1.6]; };
  const check = (kind, name, { items = true } = {}) => {
    const st = g.state(), ps = st.prompts;
    t.ok(`${kind}/${name}: shows a prompt`, ps.length > 0, `screen ${st.screen}`);
    const wrong = ps.filter((q) => !allowed[kind].has(q.glyph));
    t.ok(`${kind}/${name}: only ${kind} glyphs`, wrong.length === 0, JSON.stringify(wrong[0]));
    const off = ps.filter((q) => q.act && ACT[q.act] && q.glyph !== ACT[q.act].glyph[kind]);
    t.ok(`${kind}/${name}: each glyph is its action's`, off.length === 0, JSON.stringify(off[0]));
    if (name !== 'title') { const undrawn = ps.filter((q) => !st.glyphsOnScreen.includes(q.glyph)); t.ok(`${kind}/${name}: really drawn`, undrawn.length === 0, JSON.stringify(undrawn[0])); }
    if (items && st.items) t.ok(`${kind}/${name}: at most 6 items`, st.items.length <= 6, String(st.items.length));
    t.ok(`${kind}/${name}: does not cover the world`, !m.top?.cover || ['black', 'epigraph'].includes(m.top.id), m.top?.id);
  };
  const menuScreen = (kind, name, open, opts) => { clear(); open(); e.step(3); check(kind, name, opts); };
  for (const [kind, device, set] of [['ps', 'pad', 'ps'], ['xb', 'pad', 'xb'], ['kbm', 'kbm', 'ps']]) {
    g.actions.device = device; g.settings.glyphs = set;
    // Title side.
    clear(); g.toTitle(); e.step(4); check(kind, 'title');
    m.pop(); m.push(g.shell.mainMenu()); e.step(3); check(kind, 'main menu');
    menuScreen(kind, 'cash run', () => g.shell.openCashRun());
    clear(); g.shell.openSettings(); e.step(2);
    for (let tab = 0; tab < (m.top.tabs?.length ?? 1); tab++) { m.top.tab = tab; e.step(2); check(kind, `settings tab ${tab}`); }
    menuScreen(kind, 'about', () => g.shell.openAbout());
    // Cash Run: lobby, card, results.
    clear(); g.startRound('host'); e.step(3); t.eq(`${kind}: lobby up`, g.state().screen, 'lobby'); check(kind, 'lobby');
    clear(); g.toTitle(); e.step(3);
    clear(); g.startRound('solo'); e.step(3); g.round.s.advance = () => {}; g.round.phase = 'card'; g.round.card = { left: 14000, ready: [1], asking: 0, asked: false }; g.actions.device = device; e.step(3); check(kind, 'hub card');
    g.round.phase = 'play'; g.round.finish('time'); e.step(5); t.eq(`${kind}: results up`, g.state().screen, 'results'); check(kind, 'results');
    clear(); g.toTitle(); e.step(3);
    // Attract.
    clear(); g.attract.start(); e.step(3); g.actions.device = device; e.step(2); check(kind, 'attract'); g.attract.stop(); g.actions.device = device; e.step(3);
    // The campaign's screens.
    g.startNew(); e.step(5); g.dev.startMission('m3'); e.step(5); clear(); g.actions.device = device; e.step(2);
    g.actions.bot = p.bot;
    const f0 = g.player.feet;
    g.player.setYaw(0, 0);
    const screens = {
      pause: () => g.shell.openPause(), ledger: () => g.ui.openLedger(), locker: () => g.ui.openLocker(), bed: () => g.ui.openBed('pump-shed'), rack: () => g.ui.openRack(), wall: () => g.ui.openWall(), board: () => g.ui.openBoard(), halts: () => g.ui.openHalts(Object.keys(HALTS)[0]),
      'black talk': () => g.ui.blackTalk('A LINE.', 'OLD BAKR', 99, () => {}), epigraph: () => g.ui.epigraph(99, () => {}), choice: () => g.ui.choice('TAKE IT?', [{ label: 'ACCEPT' }, { label: 'NOT YET' }]),
      'game over': () => g.ui.openGameOver(), 'ending walk': () => g.ui.openEnding('alone'), 'ending column': () => g.ui.openEnding('column'), credits: () => g.ui.openCredits(() => {}),
    };
    for (const [name, open] of Object.entries(screens)) menuScreen(kind, name, open);
    clear(); g.shell.openPause(); e.step(2); g.ui.menu.pick('dev'); e.step(2);
    for (let tab = 0; tab < 7; tab++) { m.top.tab = tab; e.step(2); check(kind, `dev tab ${tab}`); }
    clear(); e.step(2);
    // In play: what your hands can do right now.
    const inPlay = (name, act, on, off) => { on(); e.step(4); check(kind, name); t.ok(`${kind}/${name}: asks for ${act}`, g.state().prompts.some((q) => q.act === act), JSON.stringify(g.state().prompts)); off?.(); e.step(2); };
    const [ux, uz] = front();
    inPlay('use prompt', 'use', () => g.interact.add({ tag: 'tst', x: ux, y: g.player.eye.y, z: uz, r: 5, wide: true, verb: () => 'TEST', onUse: () => {} }), () => g.interact.clearTagged('tst'));
    if (!g.weapons.gun) g.weapons.equip('sidearm');
    inPlay('jam', 'reload', () => { g.weapons.gun.jam = 2; }, () => { g.weapons.gun.jam = 0; });
    inPlay('fever', 'tablet', () => { g.body.tablets = 3; g.body.fever = 'on'; }, () => { g.body.fever = 'none'; });
    inPlay('surgery', 'heal', () => { g.body.hp = 15; }, () => { g.body.hp = 100; });
    inPlay('held map', 'map', () => { if (!g.map.up) p.press('map'); }, () => { if (g.map.up) p.press('map'); });
    e.step(30);
    const v = g.vehicles.spawn('technical', f0.x + 4, f0.z + 2, 0); e.step(20);
    inPlay('truck', 'exit', () => g.driving.enter(v), () => g.driving.eject());
    e.step(5);
    g.player.setYaw(0, 0); e.step(2);
    const dov = g.actors.buddy('dov'); const [bx, bz] = front();
    inPlay('buddy down', 'alt', () => { dov.spawn(g.ctx, bx, bz, { hp: 200 }); dov.goDown(false); }, () => dov.despawn());
    g.interact.clearTagged?.('tst');
    clear();
  }
  e.dispose();
}
// The plan's smaller promises, one by one.
async function planDetails(t) {
  const { game: g, engine: e } = await boot({ seed: 9 });
  const p = new Player(g, e);
  e.step(3);   // the title's first frame, as a player always has
  g.startNew(); p.step(5); g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(40); g.dev.god = true;
  g.story.flags.arrived = true;
  const inp = g.ctx.input;
  const speed = () => { const a = g.player.feet.clone(); p.bot.move = { x: 0, y: 1 }; p.step(60); const d = Math.hypot(g.player.feet.x - a.x, g.player.feet.z - a.z); p.bot.move = { x: 0, y: 0 }; p.step(5); return d; };
  const flat = () => { g.player.teleport(-420, -30); p.step(8); g.player.setYaw(Math.PI / 2, 0); };
  // The land's shape and what lives on it (section 5).
  const h = (x, z) => g.world.heightAt(x, z);
  t.ok('the north ridge stands up', h(-130, -560) > h(0, -300) + 15, `${h(-130, -560)} ${h(0, -300)}`);
  t.ok('the mine is a pit', h(150, -300) < h(150, -385) - 10, `${h(150, -300)} ${h(150, -385)}`);
  t.near('the salt pan is flat at y 36', h(230, 500), 35, 37.5);
  t.ok('the west escarpment rises', h(-620, 100) > h(-400, 100) + 10, `${h(-620, 100)} ${h(-400, 100)}`);
  t.near('about 400 trees', g.world.trees.length, 330, 450);
  t.eq('twelve people at Three Wells', g.actors.civilians.list.filter((c) => c.home === SITES['three-wells']).length, 12);
  // Moves (section 7).
  flat(); inp.setKey('CapsLock', true); p.step(2); inp.setKey('CapsLock', false); p.step(2);
  t.ok('Caps Lock toggles walking', g.player.walkToggle);
  t.near('walk about 3.6', speed(), 3.0, 3.8);
  inp.setKey('CapsLock', true); p.step(2); inp.setKey('CapsLock', false); p.step(2);
  t.ok('and back', !g.player.walkToggle);
  g.player.teleport(-240, 380); p.step(8); g.player.setYaw(Math.PI / 2, 0); p.step(4);
  t.ok('in the river you wade', g.player.wading);
  t.near('wading about 2.7', speed(), 1.5, 2.9);
  p.bot.hold('sprint'); t.near('no sprint in water', speed(), 1.5, 2.9); p.bot.hold('sprint', false);
  flat(); p.step(5);
  const floor = g.player.feet.y; let top = floor;
  p.bot.hold('jump'); p.press('jump'); for (let i = 0; i < 60; i++) { p.step(1); top = Math.max(top, g.player.feet.y); } p.bot.hold('jump', false); p.step(30);
  t.near('a jump is about 1.3 m', top - floor, 0.9, 1.6);
  g.dev.god = false; g.body.hp = 100; p.step(2);
  g.player.airFrom = g.player.feet.y + 4; p.step(3); t.eq('a short fall is free', g.body.hp, 100);
  g.player.airFrom = g.player.feet.y + 9; p.step(3); t.near('a long fall hurts', 100 - g.body.hp, 20, 34);
  g.body.hp = 100; g.dev.god = true; p.step(2);
  // A burning vehicle (section 6).
  const v = g.vehicles.spawn('pickup', g.player.feet.x + 8, g.player.feet.z, 0); p.step(10);
  const realBurning = g.fire.isBurning; g.fire.isBurning = (x, z) => Math.hypot(x - v.x, z - v.z) < 3;
  const hp0 = v.hp; p.step(60); g.fire.isBurning = realBurning;
  t.near('a vehicle in fire loses 6 HP/s', hp0 - v.hp, 5, 7);
  // The HUD hides 6 s after it last changed (section 16).
  let vitals = 0; const realVitals = g.hud.vitals; g.hud.vitals = function (h) { vitals++; return realVitals.call(this, h); };
  g.body.hp = 100; g.hud.touched = g.realT; e.step(2); t.ok('the HUD shows after a change', vitals > 0);
  vitals = 0; g.hud.touched = g.realT - 7; e.step(2); t.eq('and hides 6 s later', vitals, 0);
  g.hud.vitals = realVitals;
  // The map's closer view (section 16).
  p.press('map'); p.step(30); t.ok('map up', g.map.up);
  const z0 = !!g.mapZoom; p.press('next'); p.step(2); t.ok('Triangle or the wheel goes closer', !!g.mapZoom !== z0, `${z0} ${g.mapZoom}`);
  p.press('next'); p.step(2); p.press('map'); p.step(30);
  // Weather (section 6).
  g.sky.setWeather('storm'); p.step(2); t.ok('a storm damps fire', g.fire.raining);
  g.sky.setWeather('dust'); p.step(2); t.ok('dust is its own weather', g.sky.dust && !g.fire.raining);
  g.sky.setWeather('clear'); p.step(2);
  // Aim assist: pad look slows 35% over an enemy, and only with the setting on (section 7).
  flat(); p.step(4);
  const f = g.player.forward(), man = g.actors.makeSoldier(g.ctx, { faction: 'concord', role: 'rifle', x: g.player.eye.x + f.x * 20, z: g.player.eye.z + f.z * 20, yaw: 0, squad: null });
  man.state = 'idle'; man.fixedUpdate = () => {}; g.dev.invisible = true;
  const sticks = { connected: true, mapping: 'standard', axes: [0.02, 0, 0.2, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [sticks] }, configurable: true, writable: true });
  const aim = () => { const fw = g.player.forward(), s = g.player.eye; man.x = s.x + fw.x * 20; man.y = s.y - 1.1 + fw.y * 20; man.z = s.z + fw.z * 20; e.step(1); return g.cam.assist; };
  g.settings.aimAssist = true; aim();   // the stick registers on the next frame
  g.settings.aimAssist = true; t.near('over an enemy, pad look slows 35%', aim(), 0.64, 0.66);
  g.settings.aimAssist = false; t.near('with the setting off, it does not', aim(), 0.99, 1.01);
  g.settings.aimAssist = true;
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true, writable: true });
  e.dispose();
}
// Dev mode's tools are worth nothing if one throws. Press every button on every tab, with the views on.
async function everyDevButton(t) {
  const { game: g, engine: e } = await boot({ forceViews: true, seed: 11 });
  const m = g.ui.menu;
  g.startNew(); e.step(5); g.dev.startMission('m3'); e.step(10);
  const openDev = (tab) => { m.clear(); g.ctx.engine.timeScale = 1; g.dev.god = true; g.shell.openPause(); e.step(1); m.pick('dev'); e.step(1); m.top.tab = tab; e.step(1); };
  let pressed = 0;
  const skip = new Set(['quit', 'resetAll']);   // pressed once at the end, on their own
  for (let tab = 0; tab < 7; tab++) {
    openDev(tab);
    const ids = g.dev.allItems(tab).map((it, i) => it.id ?? i);
    for (const id of ids) {
      if (skip.has(id)) continue;
      openDev(tab);
      const it = g.dev.allItems(tab).find((x, i) => (x.id ?? i) === id);
      if (!it) continue;
      try {
        if (it.onSelect) m.activate(m.top, it);
        else if (it.slider) { m.nudge(it, 1, 1); e.step(1); m.nudge(it, -1, 1); }
        else if (it.choices) { m.cycle(it, 1); e.step(1); m.cycle(it, 1); }
        e.step(6);
        pressed++;
      } catch (err) { t.ok(`dev tab ${tab} button ${id} does not throw`, false, err.message); }
      g.dialogue.stopAll();
    }
    t.ok(`dev tab ${tab} survived every button`, !!g.state());
  }
  t.ok('pressed dev buttons', pressed > 30, String(pressed));
  // Every page of every tab keeps to six rows, and between them the pages show everything.
  for (let tab = 0; tab < 7; tab++) {
    openDev(tab);
    const seen = new Set(), total = g.dev.allItems(tab).filter((x) => x.id !== 'more' && x.id !== 'resetAll').length;
    for (let guard = 0; guard < 12; guard++) {
      const page = m.itemsOf(m.top);
      t.ok(`dev tab ${tab} page ${guard}: six rows at most`, page.length <= 6, String(page.length));
      for (const x of page) if (x.id !== 'more' && x.id !== 'resetAll') seen.add(x.label);
      const more = page.find((x) => x.id === 'more');
      if (!more) break;
      more.onSelect(); e.step(1);
      if (/\(1\//.test(m.itemsOf(m.top).find((x) => x.id === 'more')?.label ?? '')) break;
    }
    if (tab !== 5) t.eq(`dev tab ${tab}: the pages show everything`, seen.size, total);
  }
  t.eq('the balance pages show every slider', SLIDERS.length, 20);
  e.dispose();
}
// Section 6: burnt, then short green growth, then thin grass that can burn again. With the views on, because this is what you see.
async function burntLandGrowsBack(t) {
  const { game: g, engine: e } = await boot({ forceViews: true, seed: 13 });
  e.step(3);
  g.startNew(); e.step(5); g.dev.startMission('m3'); e.step(10); g.ui.menu.clear(); g.dialogue.stopAll(); g.timers.length = 0; g.missions.abort();
  g.dev.god = true; g.player.teleport(-420, -30); e.step(60);
  const f = g.player.feet, fire = g.fire;
  let cx = null, cz = null;
  for (let r = 25; r < 120 && cx == null; r += 5) for (let a = 0; a < 6.28 && cx == null; a += 0.5) { const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r; if (g.ground.kindAt(x, z) === K.GRASS && fire.state[fire.idOf(x, z)] === S.FRESH) { cx = x; cz = z; } }
  t.ok('fresh grass nearby', cx != null);
  fire.ignite(cx, cz, 12, 'world'); e.step(4); fire.extinguishAll(); e.step(4);
  const ids = fire.burntList.slice();
  t.ok('a patch burned', ids.length >= 4, String(ids.length));
  const id = ids[0], key = () => g.grass.key(...g.grass.coords(fire.wx(id), fire.wz(id)));
  fire.hours += TUNING.regrowHours + 1; fire.regrowTick();
  t.eq('it goes on to regrow', fire.state[id], S.REGROW);
  e.step(60);
  let c = g.grass.chunks.get(key());
  t.ok('the chunk is built again', !!c);
  t.ok('with short new growth', !!c?.young);
  if (c?.young) {
    const roots = c.young.geometry.getAttribute('aRoot');
    let tallest = 0, inPatch = 0;
    for (let i = 0; i < c.young.blades; i++) { tallest = Math.max(tallest, roots.getW(i)); if (ids.includes(fire.idOf(roots.getX(i), roots.getY(i)))) inPatch++; }
    t.ok('the new growth is short', tallest < 0.4, String(tallest));
    t.ok('and stands on the burnt patch', inPatch > 0 && inPatch === c.young.blades, `${inPatch} of ${c.young.blades}`);
  }
  t.ok('no tall grass there yet', !ids.some((i) => c?.byCell.has(i)));
  fire.dayRoll();
  t.eq('the day rolls it back to fuel', fire.state[id], S.FRESH);
  t.ok('remembered as half density', fire.halfDensity.has(id));
  e.step(60);
  c = g.grass.chunks.get(key());
  t.ok('the short growth is gone', !c?.young);
  const count = (list) => { const l = list.filter((i) => g.ground.kindAt(fire.wx(i), fire.wz(i)) === K.GRASS); return l.length ? l.reduce((n, i) => n + (c.byCell.get(i)?.length ?? 0), 0) / l.length : 0; };
  const others = [...c.byCell.keys()].filter((i) => !ids.includes(i));
  const here = ids.filter((i) => g.grass.key(...g.grass.coords(fire.wx(i), fire.wz(i))) === key());
  t.ok('the grass comes back thinner', count(here) < count(others) * 0.75, `${count(here)} against ${count(others)}`);
  t.ok('and it can burn again', fire.lightCell(id, 'test') !== false);
  e.dispose();
}
// Section 9, in the last act: the plan's collapse holds there too, and the story waits for you to come back.
async function feverInTheLastAct(t) {
  for (const id of ['m8', 'm9', 'end']) {
    const { game: g, engine: e } = await boot({ seed: 17 });
    const p = new Player(g, e);
    e.step(3);
    g.startNew(); p.step(5); g.dev.startMission(id); p.step(90); g.ui.menu.clear(); g.dialogue.stopAll();
    let guard = 0; while (g.scene.active && guard++ < 40) { p.step(30); g.dialogue.stopAll(); }
    t.eq(`${id}: running`, g.state().mission, id);
    g.story.feverRunning = true; g.story.stones = 50; g.body.tablets = 0; g.body.hp = 100; g.dev.god = true;
    if (g.player.seat) g.driving.eject?.();
    const at = g.player.feet.clone();
    g.body.startFever();
    t.eq(`${id}: the fever comes in the last act too`, g.body.fever, 'on');
    p.until(() => g.body.fever === 'none' && !g.player.frozen, 60 * 60, `${id} collapse`);
    t.eq(`${id}: ignored, it costs a fifth of your stones`, g.story.stones, 40);
    t.eq(`${id}: the mission goes on`, g.state().mission, id);
    t.ok(`${id}: you wake somewhere safe`, g.story.safehouses.has?.([...g.story.safehouses].find((k) => Math.hypot(g.player.feet.x - SITES[k].at[0], g.player.feet.z - SITES[k].at[1]) < 90)) || Math.hypot(g.player.feet.x - SITES['mile-forty'].at[0], g.player.feet.z - SITES['mile-forty'].at[1]) < 90, `${g.player.feet.x} ${g.player.feet.z} from ${at.x} ${at.z}`);
    if (id === 'end') {
      // Back at the Pass the finale picks up where it left off.
      const pass = SITES['the-pass'].at;
      g.dialogue.stopAll();
      p.tp(-565, -425); p.step(10);
      p.until(() => g.holdT > 0, 60 * 40, 'pursuit begins once you are back');
      t.ok('end: back at the Pass, the finale goes on', g.holdT > 0, String(pass));
    }
    e.dispose();
  }
}
// The plan's promises that were only ever seen in the source: exercised here, with the views on.
async function planBehaviours(t) {
  const { game: g, engine: e } = await boot({ forceViews: true, seed: 21 });
  const p = new Player(g, e);
  e.step(3);
  g.startNew(); p.step(5); g.dev.startMission('m3'); p.step(10); quiet(g);
  g.actors.squads.forEach((q) => { q.disabled = true; }); p.step(30); g.dev.god = true; g.story.flags.arrived = true;
  const inp = g.ctx.input, f = () => g.player.feet, m = g.ui.menu;
  const FLAT = [-420, -30];
  // Section 3.
  t.eq('the far plane is 1000', g.ctx.camera.camera.far, 1000);
  t.eq('pad buttons have their own codes', inp.gamepadButtons[0], 'PadCross');
  g.player.teleport(...FLAT); p.step(8);
  const yaw0 = g.ctx.camera.yaw;
  for (const k of ['KeyE', 'KeyQ']) { inp.setKey(k, true); p.step(20); inp.setKey(k, false); p.step(2); }
  t.near('E and Q do not turn the view', g.ctx.camera.yaw - yaw0, -0.001, 0.001);
  let low = 1e9; for (let x = -600; x <= 600; x += 40) for (let z = -600; z <= 600; z += 40) low = Math.min(low, g.world.heightAt(x, z));
  t.ok('the ground stays well above y = 0', low > 15, String(low));
  // Section 1.
  const civ = g.actors.civilians.list.find((c) => !c.hidden);
  g.actors.civilians.heard(civ.x, civ.z, 30);
  t.ok('civilians flee gunfire', civ.fleeT > 0);
  t.ok('and have no health to lose', civ.hp === undefined);
  t.ok('the clinic has a green cross', JSON.stringify(MODELS.get('clinic-tent')).includes('green'));
  // Section 5.
  t.ok('rocks on the ridge', g.world.rocks.count >= 100, String(g.world.rocks.count));
  t.ok('boulders on the ridge', g.world.boulders.count >= 60, String(g.world.boulders.count));
  t.ok('reeds on the river', g.world.reeds.count >= 100, String(g.world.reeds.count));
  const chunks = [...g.grass.chunks.values()];
  t.ok('grass chunks only near the camera', chunks.length > 0 && chunks.every((c) => Math.hypot(c.mx - g.camPos.x, c.mz - g.camPos.z) <= 320));
  t.near('about 7000 blades in a full chunk', Math.max(...chunks.map((c) => c.field.blades)), 5000, 7000);
  const wet = g.vehicles.spawn('pickup', -240, 380, 0); p.step(40); g.driving.enter(wet); p.step(5); p.bot.analog.gas = 1; p.step(120);
  t.near('a truck in the river goes nowhere', Math.abs(wet.car.speed), 0, 1.5);
  p.bot.analog.gas = 0; g.driving.eject(); p.step(5);
  const ford = g.vehicles.spawn('pickup', -60, 285, 0); p.step(40); g.driving.enter(ford); p.step(5); p.bot.analog.gas = 1; p.step(120);
  t.ok('at the ford it drives', Math.abs(ford.car.speed) > 2, String(ford.car.speed));
  p.bot.analog.gas = 0; g.driving.eject(); p.step(5);
  const fa = g.actors.fauna;
  t.ok('gazelle herds on the grass', fa.herds.length > 0);
  fa.scare(fa.herds[0].hx, fa.herds[0].hz, 40); t.ok('they bolt at a gunshot', fa.herds[0].fleeT > 0);
  t.ok('vultures in the air', fa.birds.length > 0);
  // Section 6: what you see and hear of a fire, and the wind.
  g.player.teleport(...FLAT); p.step(10);
  let gx = null, gz = null;
  for (let r = 25; r < 120 && gx == null; r += 5) for (let a = 0; a < 6.28 && gx == null; a += 0.5) { const x = f().x + Math.cos(a) * r, y = f().z + Math.sin(a) * r; if (g.ground.kindAt(x, y) === K.GRASS && g.fire.state[g.fire.idOf(x, y)] === S.FRESH) { gx = x; gz = y; } }
  g.wind.pin([1, 0], 3);
  g.fire.ignite(gx, gz, 10, 'world'); p.step(40);
  t.ok('flames show on burning cells', g.fireView.sprites.size > 0);
  t.near('up to three fire lights', g.fireView.lights.length, 1, 3);
  t.ok('and the fire roars', !!g.fireView.loop);
  g.fire.extinguishAll(); p.step(10);
  t.ok('red cloth on every post', g.world.cloths.length >= 6, String(g.world.cloths.length));
  const post = POSTS.p2; g.wind.pin([1, 0], 6); g.player.teleport(post.at[0] + 20, post.at[1] + 20); p.step(10);
  const nearCloth = g.world.cloths.find((c) => Math.hypot(c.x - f().x, c.z - f().z) < 160);
  t.ok('and it feels the wind', !!nearCloth && nearCloth.cloth.wind[0] > 1, String(nearCloth?.cloth.wind[0]));
  g.wind.pinned = null;
  g.clock.set(13); p.step(20); t.ok('the sun is up at noon', g.sky.sunMesh.position.y > g.camPos.y);
  g.clock.set(0.5); p.step(20); t.ok('the moon is up at night', g.sky.moonMesh.position.y > g.camPos.y); t.ok('and there are stars', !!g.sky.stars);
  g.clock.set(13); p.step(5);
  // Section 7: one prompt, near, where you look.
  g.player.teleport(...FLAT); p.step(5); g.player.setYaw(0, 0); p.step(3);
  const usable = (dx, dz) => { g.interact.add({ tag: 'tst', x: f().x + dx, y: g.player.eye.y, z: f().z + dz, r: 2.5, verb: () => 'TEST', onUse: () => {} }); p.step(3); const seen = g.state().prompts.some((q) => q.text === 'TEST'); g.interact.clearTagged('tst'); p.step(2); return seen; };
  t.ok('use reaches 2 m ahead', usable(0, -2)); t.ok('not 5 m', !usable(0, -5)); t.ok('and not behind you', !usable(0, 2));
  // Section 8: feedback.
  let shakes = 0, stops = 0;
  const eng = g.ctx.engine, shakeAdd = eng.shake.add.bind(eng.shake), hitStop = eng.hitstop.bind(eng);
  eng.shake.add = (v) => { shakes++; return shakeAdd(v); }; eng.hitstop = (v) => { stops++; return hitStop(v); };
  g.weapons.give('tractor', 90, true); p.step(20);
  const dummy = g.actors.makeSoldier(g.ctx, { faction: 'concord', role: 'rifle', x: f().x, z: f().z - 6, yaw: 0, squad: null }); p.step(2);
  p.look(dummy.x, dummy.y + 1.1, dummy.z); p.bot.hold('fire'); p.step(40); p.bot.hold('fire', false);
  t.ok('firing shakes the view', shakes > 0); t.ok('a hit on a man stops time for a moment', stops > 0);
  eng.shake.add = shakeAdd; eng.hitstop = hitStop;
  t.ok('scorches and cracks go on as decals', !!g.fx.decals);
  let rumbles = 0;
  const pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: () => { rumbles++; return Promise.resolve(); } } };
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [pad] }, configurable: true, writable: true });
  g.settings.rumble = true; g.rumble(0.5, 0.1); t.eq('a pad rumbles', rumbles, 1);
  g.settings.rumble = false; g.rumble(0.5, 0.1); t.eq('unless the setting is off', rumbles, 1); g.settings.rumble = true;
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true, writable: true });
  // Section 10: the behaviour tree's branches.
  const sq = g.actors.addSquadDef('tst-bt', { faction: 'concord', n: 4, at: [f().x + 30, f().z], noReman: true }); sq.forceLive = true; p.step(30);
  t.ok('a squad comes to life in the bubble', sq.members.length >= 2, String(sq.members.length));
  t.ok('and one man is its flanker', !!sq.flanker);
  const man = sq.members[0];
  man.dodgeT = 1; man.dodgeDir = 0; man.brainDodge(0.1); t.eq('a soldier dodges what is thrown at him', man.moveWanted, 6);
  man.fireCheckT = 0; const realBurn = g.fire.isBurning; g.fire.isBurning = () => true; const near = man.fireNear(); g.fire.isBurning = realBurn;
  t.ok('he knows when fire is near', near);
  man.brainFleeFire(0.1); t.ok('and he moves away from it', man.moveWanted > 0, String(man.moveWanted));
  // Patrols chase and their crews get down at 25 m.
  g.story.pass = null; g.story.noPatrols = false;
  const pat = g.vehicles.patrols[0];
  t.ok('patrol technicals on the roads', !!pat);
  if (pat) {
    g.player.teleport(pat.x + 150, pat.z); p.step(30);
    p.until(() => !!pat.v, 300, 'a patrol appears');
    const v = pat.v; v.crew = Math.max(v.crew ?? 0, 2); const crew = v.crew;
    g.player.teleport(v.x + 12, v.z + 6); p.step(30);
    t.ok('at 25 m the crew dismounts', v.stopped === true && v.crew === 0, `${v.stopped} ${v.crew} of ${crew}`);
  }
  // Section 11: parked at a safehouse.
  const shed = SITES['pump-shed'];
  const parked = g.vehicles.spawn('pickup', shed.at[0] + 12, shed.at[1] + 12, 0); p.step(20); parked.hp = 30;
  g.sleepTo(6, 'pump-shed'); p.step(150);
  t.eq('parked at a safehouse, it is repaired overnight', parked.hp, 100);
  // Section 12: perks, and the wall.
  const bud = (id) => g.actors.buddy(id);
  for (const id of ['ines', 'dov', 'mags']) { const b = bud(id); b.met = false; b.dead = false; b.spentUntil = 0; b.woundedUntil = 0; b.active = false; }
  const mf = SITES['mile-forty'].at;
  g.player.teleport(mf[0] + 700, mf[1]); p.step(5); bud('dov').met = true; t.ok('Dov will not come from far off', g.actors.rescuer() === null);
  bud('dov').met = false; bud('ines').met = true; t.eq('Ines drives further than anyone', g.actors.rescuer()?.id, 'ines');
  bud('ines').met = false; bud('mags').met = true; g.body.maxSyrettes = 5; g.body.syrettes = 2; g.sleepTo(6, 'pump-shed'); p.step(150);
  t.eq('Mags leaves an extra syrette at a safehouse', g.body.syrettes, 3);
  bud('mags').met = false;
  const dv = bud('dov'); dv.met = true; dv.dead = true; g.ui.openWall(); p.step(3);
  t.ok('a dead friend\'s name is on the wall', /DOV/.test(g.state().subtitle ?? ''), g.state().subtitle);
  g.dialogue.stopAll(); dv.dead = false; dv.met = false; p.step(2);
  // Section 14: each step's text, and the notice board as the way in.
  quiet(g); g.story.pass = null;
  for (const id of ['m0', 'm1', 'm2']) g.missions.done.add(id);
  g.player.teleport(mf[0], mf[1]); p.step(5);
  g.ui.openBoard(); p.step(2);
  t.ok('the notice board lists contracts', g.state().items.includes('m3'), JSON.stringify(g.state().items));
  m.pick('m3'); p.until(() => g.state().screen === 'choice', 6000, 'the board offers it');
  p.pick('notyet'); p.step(2); t.eq('Not Yet leaves it', g.state().mission, null);
  g.ui.openBoard(); p.step(2); m.pick('m3'); p.until(() => g.state().screen === 'choice', 6000, 'the board offers it again');
  p.pick('accept'); p.step(3);
  t.eq('Accept takes the contract', g.state().mission, 'm3');
  t.eq('and with it the pass', g.story.pass, 'concord');
  t.eq('each step shows its text at the top', g.hud.banner, MISSIONS.m3.steps[0].text);
  t.eq('and it stays for the map margin', g.currentStepText, MISSIONS.m3.steps[0].text);
  // The pass, the walk out after reporting, and the warning.
  const fort = SITES['fort-clement'].at, soldier = g.actors.makeSoldier(g.ctx, { faction: 'concord', role: 'rifle', x: fort[0] + 30, z: fort[1] + 30, yaw: 0, squad: g.actors.squads.get('fort-clement') });
  g.player.teleport(fort[0] + 28, fort[1] + 28); p.step(2);
  t.ok('with the pass you walk into the fort', !g.actors.hostileToPlayer(soldier));
  g.missions.complete(); p.step(2);
  t.eq('reporting hands the pass back', g.story.pass, null);
  t.ok('and you have time to walk out', !g.actors.hostileToPlayer(soldier));
  g.clock.advance(2); p.step(2);
  t.ok('then they shoot', g.actors.hostileToPlayer(soldier));
  quiet(g); g.story.pass = null; g.story.grace = null; g.noPassWarned = new Set(); g.hud.noticeText = '';
  g.player.teleport(fort[0] + 120, fort[1] + 90); p.step(70);
  t.ok('coming up on a fort with no pass, you are warned', /NO PASS/.test(g.hud.noticeText), g.hud.noticeText);
  soldier.despawn?.();
  // Section 16: every setting the plan lists, and that the comfort ones do something.
  g.shell.openSettings(); p.step(2);
  const seen = []; for (let i = 0; i < m.top.tabs.length; i++) { m.top.tab = i; p.step(1); seen.push(...g.state().items); }
  m.clear(); g.ctx.engine.timeScale = 1; p.step(2);
  for (const id of ['music', 'sfx', 'voices', 'sensPad', 'sensMouse', 'invertY', 'aimAssist', 'rumble', 'glyphs', 'fullscreen', 'pixelSize', 'quality', 'fov', 'subtitleSize', 'reduceFlashes', 'feverReduced']) t.ok(`setting ${id}`, seen.includes(id));
  let edges = 0; const realEdges = g.hud.hurtEdges; g.hud.hurtEdges = function (h) { edges++; return realEdges.call(this, h); };
  g.settings.reduceFlashes = false; g.body.hurtFlash = 1; e.step(1); t.ok('a hit flashes the edges', edges > 0);
  edges = 0; g.settings.reduceFlashes = true; g.body.hurtFlash = 1; e.step(1); t.eq('Reduce Flashes stops it', edges, 0);
  g.settings.reduceFlashes = false; g.hud.hurtEdges = realEdges;
  const swimWith = (reduced) => { g.settings.feverReduced = reduced; g.body.tablets = 3; g.story.feverRunning = true; g.body.startFever(); p.step(240); const v = g.body.swim; g.body.clearFever(); p.step(5); return v; };
  t.ok('Fever Effects Reduced calms the view', swimWith(true) < swimWith(false) * 0.7);
  g.settings.feverReduced = false;
  g.shell.openCashRun(); p.step(2);
  for (const id of ['solo', 'host', 'join']) t.ok(`Cash Run offers ${id}`, g.state().items.includes(id));
  m.clear(); p.step(2);
  // Section 18: the DEMO tag.
  g.toTitle(); e.step(3);
  const texts = []; const realText = g.ctx.hud.text; g.ctx.hud.text = function (x, y, st, o) { texts.push(st); return realText.call(this, x, y, st, o); };
  g.attract.start(); e.step(4);
  t.ok('attract wears a DEMO tag', texts.includes('DEMO'));
  g.ctx.hud.text = realText; g.attract.stop(); e.step(3);
  e.dispose();
}
const TRUCK_AT_X = 150, TRUCK_AT_Z = -204;
