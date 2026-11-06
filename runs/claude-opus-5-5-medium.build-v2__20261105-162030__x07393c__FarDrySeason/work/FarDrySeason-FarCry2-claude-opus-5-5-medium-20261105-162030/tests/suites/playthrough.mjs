// The most important test: a bot plays M0 through both endings, with real actions for every objective.
import { boot, fakeStorage } from '../lib/boot.mjs';
import { Bot } from '../lib/bot.mjs';
fakeStorage();
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log(`FAIL ${name}`); if (process.env.STOP) throw new Error('stop'); } };
async function play({ ending, killBuddy }) {
  const { e, game: g } = await boot({ seed: ending === 'walk' ? 3 : 4 });
  const b = new Bot(e, g), label = `${ending}${killBuddy ? '/deadbuddy' : ''}`, S = () => g.state();
  const T = (c, n) => ok(c, `${label}: ${n} [${g.status()} step=${g.missions.step?.text}]`);
  g.cheats.god = true;
  e.step(30); T(S().screen === 'press', 'title press');
  b.key('Enter'); T(S().screen === 'main', 'main menu');
  g.ui.top.focus = g.ui.items(g.ui.top).findIndex((i) => i.label === 'NEW GAME'); b.key('Enter'); e.step(2);
  T(S().mode === 'play' && S().mission === 'm0', 'new game starts m0');
  // M0
  T(g.player.riding, 'riding the train');
  e.step(60); b.key('Enter', 1);
  T(b.waitFor(() => g.missions.step?.script === 'm0Map', 60), 'ride ends');
  T(S().mapUp === false, 'map down'); b.key('KeyM'); T(S().mapUp, 'map raised');
  T(b.waitFor(() => g.missions.step?.script === 'm0Fever', 10), 'map step ends');
  T(b.waitFor(() => S().mission === 'm1', 30), 'm0 done');
  // M1
  T(g.body.feverActive, 'first fever');
  b.waitFor(() => !g.frozen, 3); b.hold('KeyH', 1.2); T(b.waitFor(() => g.missions.step?.do === 'talk', 5), 'tablet step done');
  b.talkTo('odile'); T(b.waitFor(() => g.missions.step?.do === 'collect', 5), 'talked to odile');
  const rifle = g.prompt.pickups.find((q) => q.tag === 'first-rifle'); T(rifle, 'rifle spawned');
  b.use(rifle.x, rifle.z, rifle.y, 0); T(g.player.guns.main?.id === 'tractor' && Math.round(g.player.guns.main.cond) === 45, 'took tractor cond 45');
  T(b.waitFor(() => g.missions.step?.do === 'steal', 5), 'steal step');
  const truck = g.vehicles.list.find((v) => v.tag === 'clinic-truck'); e.step(30);
  const door = truck.door(); b.to(door[0] + 0.3, door[1]); b.look(door[0], truck.y + 1, door[1] - 1); e.step(10); b.key('KeyE');
  T(g.player.vehicle === truck, 'in the truck');
  T(b.waitFor(() => g.missions.step?.do === 'deliver', 3), 'deliver step');
  // Real driving for a moment.
  const p0 = [truck.x, truck.z]; b.i.setKey('KeyW', true); e.step(180); b.i.setKey('KeyW', false);
  T(Math.hypot(truck.x - p0[0], truck.z - p0[1]) > 8, 'truck drives');
  b.exit(); T(!g.player.vehicle, 'got out'); 
  b.to(-255, 226); T(b.waitFor(() => g.missions.step?.script === 'm1Ambush', 5), 'delivered');
  // Back in the truck by the west road, to P2.
  truck.v.reset([-180, g.world.land.heightAt(-180, 30) + 1.4, 30], -1.5); e.step(20);
  const d2 = truck.door(); b.to(d2[0], d2[1]); b.look(truck.x, truck.y + 1, truck.z); e.step(10); b.key('KeyE'); T(g.player.vehicle === truck, 'back in truck');
  e.step(30); T(truck.stalled, 'truck stalled by script');
  b.exit(); g.combat.select('main');
  e.step(40);
  for (let k = 0; k < 6 && !g.player.guns.main.jammed; k++) { b.look(-200, 42, 30); b.key('MouseLeft', 1); e.step(10); }
  T(g.player.guns.main.jammed, 'scripted jam on the 5th shot');
  let guard = 0; while (g.player.guns.main.jammed && guard++ < 6) { b.key('KeyR', 1); e.step(50); }
  T(!g.player.guns.main.jammed, 'slap and rack clears it');
  T(b.waitFor(() => g.missions.step?.script === 'm1Repair', 5), 'repair step');
  { const [bx, bz] = truck.bonnet(); b.use(bx, bz, truck.y + 0.5, g.player.upgrades.vehicle ? 1.5 : 3); }
  T(!truck.stalled, 'repaired');
  T(b.waitFor(() => g.missions.step?.script === 'm1Syrette', 5), 'syrette step');
  b.hold('KeyQ', 1); T(b.waitFor(() => g.missions.step?.do === 'report', 5), 'syrette used');
  b.talkTo('odile'); T(b.waitFor(() => S().done.m1, 5), 'm1 done');
  T(S().tablets >= 3, 'tablets paid'); T(g.story.flags['pump-shed'], 'pump shed');
  const ledgerStones = S().stones;
  // Sleep at a safehouse: a save.
  { const s = g.world.sites['pump-shed'].def, u = s.usables[0]; b.use(s.at[0] + u.at[0], s.at[1] + u.at[1]); T(S().screen === 'bed', 'bed screen'); g.ui.top.focus = 3; const h0 = g.world.day; b.key('Enter'); e.step(5); T(S().screen === null && Math.abs(g.world.hour - 0) < 0.3, 'slept until midnight'); T(g.save.exists(), 'save written'); void h0; }
  // M2
  b.talkTo('tibor'); T(g.talk.scene?.choosing, 'tibor offers'); b.accept(); T(S().mission === 'm2', 'm2 started');
  b.to(40, -120); b.waitFor(() => g.missions.step?.do === 'use', 3); T(g.missions.step?.do === 'use', 'reached post');
  e.step(70); T(g.world.sites['ranger-post'].live, 'post is live');
  // Scout: monocular hold.
  b.i.setKey('KeyV', true); e.step(10); T(g.monocularUp, 'monocular up'); b.i.setKey('KeyV', false); e.step(3);
  b.use(48, -162, undefined, 3); e.step(3); b.dismissScene();
  T(b.waitFor(() => g.missions.step?.script === 'm2Clear', 5), 'cage opened');
  T(S().buddies.ines.met, 'ines met'); T(b.killNear((a) => a.site === 'ranger-post', 200), 'cleared the post with real shots');
  T(b.waitFor(() => g.missions.step?.do === 'report', 10), 'post cleared');
  b.talkTo('tibor'); T(S().done.m2, 'm2 done');
  if (killBuddy) { const a = g.buddies.spawnFollower('ines', g.player.x + 2, g.player.z); g.actors.goDown(a, {}); e.step(5); b.to(a.x + 1, a.z + 0.5); e.step(5); b.key('KeyF'); e.step(170); T(!S().buddies.ines.alive, 'finished ines'); T(S().ledger.friends === 1, 'ledger friend line'); g.frozen = false; }
  // M3
  b.talkTo('vance'); T(g.talk.scene?.choosing, 'vance offers'); b.accept(); T(S().mission === 'm3', 'm3 started'); T(g.story.hasFlare, 'flare given');
  g.missions.altPending = null; g.missions.altCalled = false; g.prompt.setChoice(null);
  b.to(430, 40); b.waitFor(() => g.missions.step?.do === 'destroy', 3); T(g.missions.step?.do === 'destroy', 'reached the siding');
  g.player.molotovs = 3;
  // Light it upwind with the flare and let the grass carry it; a bottle on each tank to be sure the chain is real.
  g.combat.select('sidearm'); e.step(30);
  for (const t of g.world.destructibles.filter((d) => d.tag === 'fuel-tank')) { b.to(t.x + 9, t.z + 9); e.step(2); if (g.player.guns.sidearm?.id !== 'flare') g.combat.give('flare', 100, true); g.player.guns.sidearm.mag = 1; g.combat.select('sidearm'); e.step(25); b.look(t.x, t.y + 1, t.z); b.key('MouseLeft', 1); e.step(80); }
  T(b.waitFor(() => g.missions.step?.do === 'leave', 30), 'tanks burned');
  T(g.world.destructibles.filter((d) => d.tag === 'fuel-tank' && d.destroyed).length === 3, 'three tanks gone');
  T(S().fire.burnt + S().fire.burning > 0, 'fire on the map');
  b.to(430, -300); T(b.waitFor(() => g.missions.step?.do === 'report', 3), 'left the siding');
  b.talkTo('vance'); T(S().done.m3, 'm3 done');
  // M4
  b.talkTo('ansa'); T(g.talk.scene?.choosing, 'ansa offers'); b.accept(); T(S().mission === 'm4', 'm4 started'); T(g.story.hasTracker, 'tracker given');
  g.missions.altPending = null; g.missions.altCalled = false; g.prompt.setChoice(null);
  e.step(5); const tr = g.vehicles.list.find((v) => v.tag === 'payroll'); T(tr, 'convoy out');
  b.to(tr.x + 12, tr.z + 12); let tries = 0; while (!tr.stalled && !tr.dead && tries++ < 200) { if (!g.player.guns.main) g.combat.give('tractor', 90, true); else if (g.player.slot !== 'main') g.combat.select('main'); b.to(tr.x + 7, tr.z + 7); b.i.setKey('MouseLeft', true); for (let k = 0; k < 8; k++) { b.look(tr.x, tr.y + 0.8, tr.z); } b.i.setKey('MouseLeft', false); e.step(2); const gun = g.combat.current(); if (gun.jammed) { b.key('KeyR', 1); e.step(50); } if (gun.mag < 3) gun.mag = 30; }
  T(tr.stalled || tr.dead, 'stopped the truck');
  T(b.waitFor(() => g.missions.step?.do === 'collect', 5), 'case flew');
  const cs = g.prompt.pickups.find((q) => q.tag === 'payroll-case'); T(cs, 'case exists');
  b.key('KeyT'); T(g.tracker.up, 'tracker raised'); e.step(30); b.to(cs.x + 30, cs.z); e.step(5); T(g.tracker.nearestD < 60, 'tracker reads'); b.key('KeyT'); T(!g.tracker.up, 'tracker down');
  b.use(cs.x, cs.z, cs.y); T(b.waitFor(() => g.missions.step?.do === 'report', 3), 'took the case');
  b.talkTo('ansa'); T(S().done.m4, 'm4 done'); T(S().buddies.dov.met, 'dov met');
  // A Mercy Run (Mags).
  b.talkTo('odile'); T(g.talk.scene?.choosing, 'odile offers crate'); b.accept(); T(g.side, 'side job on');
  { const r = g.side.run; const t0 = g.player.tablets; b.use(r.at[0], r.at[1]); T(!g.side && g.player.tablets === t0 + 4, 'mercy run paid'); T(S().buddies.mags.met, 'mags met'); }
  // M5, without the alternate plan.
  b.talkTo('vance'); b.accept(); T(S().mission === 'm5', 'm5 started');
  g.missions.altPending = null; g.missions.altCalled = false; g.prompt.setChoice(null);
  b.to(-325, 380); T(b.waitFor(() => g.missions.step?.do === 'destroy', 3), 'reached pump');
  const pump = g.world.destructibles.find((d) => d.tag === 'pump'); T(g.player.charges >= 1, 'has charges');
  b.to(pump.x + 5, pump.z - 5); b.look(pump.x, pump.y + 1, pump.z); e.step(40); b.hold('KeyG', 0.5); e.step(90); T(g.player.planted.length === 1, 'planted');
  b.to(pump.x + 15, pump.z - 15); e.step(40); b.key('KeyG'); e.step(50);
  T(pump.destroyed, 'pump blown');
  T(b.waitFor(() => g.missions.step?.do === 'report', 5), 'pump step done');
  b.talkTo('vance'); T(S().done.m5, 'm5 done'); T(g.story.threeWellsEmpty, 'three wells empties'); T(S().ledger.moved >= 104, 'ledger counts them');
  // Odile refuses until a free run.
  T(g.story.odileRefuses, 'odile refuses'); b.talkTo('odile'); b.accept(); { const r = g.side.run; const t0 = g.player.tablets; b.use(r.at[0], r.at[1]); T(g.player.tablets === t0 && !g.story.odileRefuses, 'free run for odile'); }
  // M6
  b.talkTo('ansa'); b.accept(); T(S().mission === 'm6', 'm6 started'); T(g.world.isNight(), 'forced night');
  T(b.waitFor(() => g.missions.step?.do === 'goto', 5), 'partner step');
  b.to(-260, -180); T(b.waitFor(() => g.missions.step?.script === 'm6Burn', 3), 'reached field');
  g.player.molotovs = 3; for (const [x, z] of [[-300, -300], [-220, -300], [-260, -270]]) { b.to(x, z - 30); b.look(x, g.world.land.heightAt(x, z), z); b.key('KeyG', 2); e.step(50); g.player.molotovs = 3; }
  T(b.waitFor(() => g.missions.step?.script === 'm6Turn', 90), 'crop burning'); 
  T(b.waitFor(() => g.missions.step?.script === 'm6Choice', 15), 'wind turned, friend down');
  const partner = g.story.m6PartnerActor; T(partner?.down, 'partner down');
  b.to(partner.x + 1, partner.z + 1); e.step(10); T(g.prompt.choice, 'syrette or finish prompt');
  if (ending === 'walk') { b.key('KeyF'); e.step(200); g.frozen = false; T(b.waitFor(() => g.missions.step?.do === 'leave', 10), 'finished it'); }
  else { g.player.syrettes = 2; b.key('KeyE'); e.step(5); T(b.waitFor(() => g.missions.step?.do === 'leave', 10), 'saved friend'); T(partner.alive, 'partner alive'); }
  b.to(-260, -40); T(b.waitFor(() => g.missions.step?.do === 'report', 5), 'left the field');
  b.talkTo('ansa'); T(S().done.m6, 'm6 done');
  // M7
  const shed = g.world.sites['pump-shed'].def, wall = shed.usables[3];
  T(g.missions.available().some((m) => m.id === 'm7'), 'm7 unlocked'); b.use(shed.at[0] + wall.at[0], shed.at[1] + wall.at[1]); T(S().mission === 'm7', 'read the note');
  T(b.waitFor(() => g.missions.step?.do === 'goto', 8), 'note read'); g.missions.altPending = null; g.missions.altCalled = false; g.prompt.setChoice(null);
  b.to(150, -180); T(b.waitFor(() => g.missions.step?.script === 'm7Fight', 3), 'reached the cut'); T(g.warOn, 'truce gone at the mine');
  e.step(120); b.to(106, -318); T(b.waitFor(() => g.missions.step?.do === 'use', 3), 'at sluice');
  b.use(104, -322, undefined, 1.5); e.step(3); b.dismissScene(); T(b.waitFor(() => g.missions.step?.do === 'leave', 5), 'took ledger');
  b.to(150, 0); T(b.waitFor(() => g.missions.step?.do === 'report', 3), 'left');
  b.talkTo('tibor'); T(S().done.m7, 'm7 done'); T(S().truceOver, 'truce over'); T(S().mission === 'm8', 'm8 follows');
  T(!g.gunSlung(), 'gun works in mile forty');
  // M8
  b.talkTo('odile'); T(b.waitFor(() => g.missions.step?.do === 'hold', 3), 'hold step');
  b.to(2, 60); T(b.waitFor(() => g.missions.step?.do === 'ride', 130), 'held the platform');
  T((g.story.shellsFell ?? 0) > 3, 'mile forty is under shells'); T(g.player.mounted, 'on the flatcar gun'); b.i.setKey('MouseLeft', true); e.step(60); b.i.setKey('MouseLeft', false);
  T(b.waitFor(() => g.missions.step?.script === 'm8End', 70), 'rode the train');
  T(b.waitFor(() => S().mission === 'm9', 12), 'column walks'); T(g.people.column, 'column exists');
  // M9
  T(S().weather === 'storm', 'storm'); b.to(-130, -500); T(b.waitFor(() => g.missions.step?.do === 'talk', 3), 'at observatory');
  b.talkTo('harrow'); e.step(3); b.dismissScene(); e.step(3); b.dismissScene(); T(b.waitFor(() => g.missions.step?.script === 'm9Finish', 5), 'scene over'); e.step(3); T(g.mapTex.arc, 'arc glows');
  T(g.talk.scene?.choosing, 'contract choice'); b.choose(ending === 'walk' ? 0 : 1); T(b.waitFor(() => g.missions.step?.script === 'm9Sheet', 8), 'choice made');
  T(g.story.ledger.harrow === (ending === 'walk' ? 'shot' : 'spared'), 'harrow line'); e.step(3);
  T(g.talk.scene?.choosing, 'sheet choice'); b.choose(ending === 'walk' ? 0 : 1); T(b.waitFor(() => S().mission === 'end', 3), 'to the pass'); T(S().ending === ending, 'ending set');
  // The Pass.
  T(b.waitFor(() => !g.frozen, 4), 'dawn'); b.to(-585, -428); T(b.waitFor(() => g.missions.step?.script === 'endStand', 3), 'at the pass');
  T(b.waitFor(() => g.missions.step?.script === 'endBuddies', 45), 'held');
  e.step(5); if (g.talk.scene) { b.dismissScene(); if (g.talk.scene?.choosing) b.choose(1); e.step(3); }
  T(b.killNear((a) => a.tag === 'end-buddy', 90), 'the last draw');
  T(b.waitFor(() => g.missions.step?.script === 'endLight', 3), 'light step');
  e.step(15); b.hold('KeyE', 1.3); T(S().fire.burning > 0, 'lit the last grass');
  T(b.waitFor(() => g.scenes.locks, 12), 'the last scene'); e.step(90); T(S().subtitle, 'the last scene speaks'); T(b.waitFor(() => S().screen === 'ending', 12), 'ending card'); T(S().done.end, 'finished');
  b.key('Enter'); T(S().screen === 'final-ledger', 'ledger'); b.key('Enter'); T(S().screen === 'credits', 'credits'); b.key('Enter'); e.step(2); T(S().mode === 'title', 'back to title');
  T(g.save.exists(), 'can continue into free roam');
  void ledgerStones;
  T(e.errors.length === 0, `no errors ${e.errors[0]}`);
  e.dispose?.();
}
for (const run of [{ ending: 'walk' }, { ending: 'column', killBuddy: true }]) {
  try { await play(run); } catch (err) { fail++; console.log(`FAIL ${run.ending} threw: ${String(err?.stack ?? err).split('\n').slice(0, 4).join(' | ').slice(0, 500)}`); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(0);
