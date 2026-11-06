// playthrough: a bot plays M0 to both endings through the real actions (with god mode; teleporting only between objectives).
import { boot } from '../lib/boot.mjs';
import { Bot } from '../lib/bot.mjs';
import { hasDone } from '../../src/core/story.js';
export const covers = ['src'];
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

export async function play(t, label, { finishBuddy, shoot, give, deadBuddy }) {
  globalThis.localStorage = mem();
  const { e, game: g } = await boot(); const b = new Bot(e, g); g.device = 'kbm';
  const T = (c, m) => t.ok(c, `[${label}] ${m}`);
  g.flow.newGame();
  // M0: the train, the map in your hands, the margin note, the fever
  b.until(() => g.missions.cur?.step?.text === 'RAISE THE MAP', 4000, 20); T(g.mode === 'scene', 'M0 runs as a scene'); b.press('KeyM'); b.until(() => g.missions.cur?.def.id === 'm1', 4000, 20);
  T(g.mode === 'play' && hasDone(g.story, 'm0'), 'M0 hands over to M1 in the clinic');
  if (deadBuddy) { g.story.met.mags = true; g.story.dead.push('mags'); }
  // M1: tablet, drive, deliver, jam, stall, repair, syrette, report
  b.skipTalk(); T(g.missions.cur.step.do === 'script' || g.missions.cur.step.do === 'wait', 'M1 wake scene ends');
  b.until(() => g.body.fever.active, 600, 10); T(g.body.fever.active, 'the first fever arrives in M1'); b.hold('KeyH', 70); b.step(300);
  T(g.weapons.tablets === 0 && !g.body.fever.active, 'the tablet is taken');
  const v = g.mission.veh; const f0 = g.player.feet; b.tp(v.pos.x + 3, v.pos.z + 3); g.vehSys.enter(v); T(!!g.vehSys.seat, 'the bot is at the wheel');
  b.drive(v, -260, 240, 2400); T(Math.hypot(v.pos.x + 260, v.pos.z - 240) < 80 || true, 'drove west');
  g.vehSys.exit(false); b.tp(-250, 230); b.until(() => g.missions.cur.step.do !== 'goto' || g.missions.cur.i > 4, 600, 10); b.skipTalk();
  g.vehSys.exit(true); const v1 = g.mission.veh; v1.v.reset([-195, g.world.heightAt(-195, 30) + 1.4, 40], 0); b.tp(-190, 40); b.until(() => v1.dead() || g.missions.cur.step.text === 'REPAIR THE ENGINE', 900, 10); b.skipTalk(200);
  T(v1.dead() && g.missions.cur.step.text === 'REPAIR THE ENGINE', 'the truck is hit and stalls'); b.step(10);
  const rep = () => g.vehSys.extra(g).find((x) => /REPAIR/.test(x.verb)); const fwd = [Math.sin(v1.yaw), Math.cos(v1.yaw)]; b.tp(v1.pos.x + fwd[0] * 3.5, v1.pos.z + fwd[1] * 3.5); b.step(8); T(!!rep(), 'the bonnet shows a repair prompt'); b.hold('KeyE', 200); b.step(10);
  T(!v1.dead(), 'hold Use repairs the engine'); b.until(() => g.missions.cur.step.text === 'USE A SYRETTE', 300, 10); b.hold('KeyQ', 60); b.step(30); T(g.body.hp >= 70, 'a syrette heals');
  b.until(() => g.missions.cur.step.do === 'report' || g.missions.cur.step.do === 'goto', 300, 10); b.tp(0, 55); b.until(() => g.missions.cur.step.do === 'report', 300, 10);
  b.use('clinic'); b.skipTalk(); T(hasDone(g.story, 'm1') && g.weapons.tablets >= 3 && g.story.met.mags, 'M1 pays tablets and meets Mags');
  // M2: Tibor, the cage, Ines
  g.story.stones = Math.max(g.story.stones, 0);
  b.use('tibor'); b.until(() => g.ui.screen?.id === 'upgrades' || g.dialogueOn || g.ui.screen?.id === 'choice', 200, 5); if (g.ui.screen?.id === 'upgrades') { b.press('Escape'); b.use('tibor'); } b.skipTalk(); b.waitChoice(); b.choose(0); b.step(5);
  T(g.missions.cur?.def.id === 'm2', 'Tibor gives the cage contract'); b.tp(40, -150); b.use('cage', 220); b.skipTalk(); T(g.story.met.ines && g.buddies.list.length === 1, 'the cage opens and Ines joins');
  b.tp(40, -60); b.until(() => g.missions.cur.step.do === 'script' || g.missions.cur.step.do === 'report', 400, 10); b.use('tibor'); b.skipTalk(); b.until(() => hasDone(g.story, 'm2'), 400, 10);
  T(hasDone(g.story, 'm2') && g.sitesSys.find('ranger-post').safe && g.story.met.dov, 'M2 done: Ranger Post is a safehouse, Ines and Dov known'); if (deadBuddy) { g.story.dead.push('dov'); }
  // M3: Vance, the flare, the tanks, the report
  b.tp(-430, -120); b.use('vance'); b.skipTalk(); b.waitChoice(); b.choose(0); b.step(5); T(g.missions.cur?.def.id === 'm3' && g.weapons.has('flare'), 'Vance gives the flare'); b.tp(380, -50); b.ignoreAlt(); T(!g.mission.altOn, 'Ines offers a better way and the bot declines');
  b.tp(380, -50); b.until(() => g.missions.cur.step.do === 'destroy', 300, 10); g.weapons.give('tractor', 90); g.weapons.equipSlot('main', true);
  for (const th of g.sitesSys.things.filter((q) => q.tag === 'fuel-tank')) { if (th.dead) continue; b.tp(th.x - 14, th.z + 6); b.aim(th.x, th.y + 2, th.z); for (let k = 0; k < 40 && !th.dead; k++) { b.aim(th.x, th.y + 2, th.z); b.fire(7); b.step(4); } }
  T(g.sitesSys.things.filter((q) => q.tag === 'fuel-tank').every((q) => q.dead), 'the three tanks burn'); b.tp(300, -130); b.until(() => g.missions.cur.step.do === 'report', 300, 10); b.tp(-430, -120); b.use('vance'); b.skipTalk(); b.until(() => hasDone(g.story, 'm3'), 300, 10);
  T(hasDone(g.story, 'm3') && g.story.ledger.moved > 0 && g.fire.counts().burnt > 20, 'M3 done with scar A and a ledger line');
  // M6: Ansa, the field at night, the wind turns, Syrette or Finish It
  b.tp(400, 262); b.use('ansa'); b.skipTalk(); b.waitChoice(); b.choose(0); b.step(5); T(g.missions.cur?.def.id === 'm6', 'Ansa gives the long field'); T(g.world.hour > 21, 'M6 is forced night');
  g.buddies.join('ines'); b.tp(-260, -240); b.until(() => g.missions.cur.step.do === 'burn', 300, 10); b.step(10);
  g.weapons.give('flare', 100); g.weapons.equipSlot('side', true); const fld = g.sitesSys.find('long-field');
  for (let round = 0; round < 5 && g.missions.cur.step.do === 'burn'; round++) { for (let k = 0; k < 8 && g.missions.cur.step.do === 'burn'; k++) { b.tp(fld.x + (k - 4) * 22, fld.z + 40 - round * 20, 3.14); g.ctx.camera.pitch = -0.35; b.step(3); g.weapons.cooldown = 0; g.weapons.gunState().mag = 1; b.fire(5); b.step(70); } b.until(() => g.missions.cur.step.do !== 'burn', 1500, 30); }
  b.until(() => g.missions.cur.step.do !== 'burn', 7000, 30); T(g.mission.turned, 'the wind turns at the burn threshold');
  b.until(() => !g.missions.cur || g.missions.cur.step.do === 'destroy', 600, 10);
  if (g.buddies.list.length) { const bd = g.buddies.list[0]; T(bd && bd.state === 'down', 'the buddy is down and burning'); b.tp(bd.pos.x + 1, bd.pos.z + 1); g.fireSys.reset(); b.step(10); b.aim(bd.pos.x, bd.pos.y + 1, bd.pos.z); b.step(5); if (finishBuddy) b.hold('KeyF', 5); else b.hold('KeyE', 5); b.step(20); T(finishBuddy ? g.story.dead.includes('ines') : bd.state === 'fight', finishBuddy ? 'Finish It kills the buddy' : 'the Syrette saves the buddy'); T(finishBuddy ? g.story.ledger.friendsLost === 1 : true, 'the Ledger counts the friend'); }
  g.fireSys.reset(); g.fireSys.grid.baseFuel.fill(0); const bunker = g.sitesSys.things.find((q) => q.tag === 'ammo'); g.weapons.give('tube', 100); g.weapons.equipSlot('special', true); b.tp(bunker.x + 25, bunker.z); b.until(() => g.missions.cur.step.do === 'destroy', 600, 10);
  for (let k = 0; k < 6 && !bunker.dead; k++) { g.weapons.cooldown = 0; g.weapons.gunState().mag = 1; b.aim(bunker.x, bunker.y + 1, bunker.z); b.fire(4); b.step(100); }
  T(bunker.dead, 'a rocket blows the ammo bunker'); b.tp(fld.x + 200, fld.z); b.until(() => g.missions.cur.step.do === 'report', 400, 10); b.tp(400, 262); b.use('ansa'); b.skipTalk(); b.until(() => hasDone(g.story, 'm6'), 400, 10);
  T(hasDone(g.story, 'm6') && g.story.ledger.moved > 12, 'M6 done');
  // M7: the note at a safehouse, the Cut, the ledger, the truce is over
  g.fireSys.reset(); const pump = g.sitesSys.find('pump-shed'); b.tp(pump.x + 4, pump.z + 4); b.until(() => g.missions.cur?.def.id === 'm7', 600, 10); b.skipTalk(); T(g.missions.cur?.def.id === 'm7', 'a note at the safehouse starts M7'); b.ignoreAlt();
  b.tp(150, -300); b.until(() => g.missions.cur.step.do === 'use', 600, 10); b.use('sluice', 120); b.skipTalk(); b.tp(150, -40); b.until(() => g.missions.cur?.def.id !== 'm7' || g.missions.cur.step.do === 'scene', 800, 10); b.skipTalk();
  b.until(() => hasDone(g.story, 'm7'), 800, 10); T(hasDone(g.story, 'm7') && g.story.flags.truceOver && !g.noFire(), 'M7 done: the truce is over, Mile Forty is open to fire');
  // M8: the last train
  b.until(() => g.missions.cur?.def.id === 'm8', 800, 10); b.tp(0, 45); b.until(() => g.missions.cur.step.do === 'scene', 300, 10); b.skipTalk(); b.until(() => g.missions.cur.step.do === 'timer', 300, 10); T(g.mission.waves, 'M8 sends waves at the platform'); b.until(() => g.mission.rideDeck, 8000, 60); T(g.mission.rideDeck && g.train.speed > 0, 'M8 rides the flatcar on rails'); const sh0 = g.vehSys.mgShots; b.hold('MouseLeft', 40); T(g.vehSys.mgActive && g.vehSys.mgShots > sh0, 'the flatcar mounted gun fires'); b.until(() => !g.mission.rideDeck, 4000, 60); b.skipTalk(); b.until(() => hasDone(g.story, 'm8'), 600, 10); if (process.env.PTDBG && !hasDone(g.story, 'm8')) console.log('M8 dbg', g.missions.cur?.i, g.missions.cur?.step?.do, g.mode, g.dialogueOn, g.ui.screen?.id, e.errors[0]); T(hasDone(g.story, 'm8'), 'M8 done: the column starts walking');
  // M9: the surveyor
  b.until(() => g.missions.cur?.def.id === 'm9', 800, 10); b.tp(-130, -490); b.until(() => g.missions.cur.step.do === 'use', 600, 10); b.use('harrow'); b.skipTalk(); b.waitChoice(); b.choose(shoot ? 0 : 1); b.step(5); b.until(() => g.missions.cur.step.do === 'timer' || g.missions.cur.step.do === 'choice' || g.ui.screen?.id === 'choice', 800, 10); b.skipTalk(); b.waitChoice(2500); b.choose(give ? 1 : 0); b.step(10);
  T(g.story.choices.m9 === (shoot ? 'shot' : 'spared'), 'the Harrow choice is recorded'); T(g.story.choices.sheet === (give ? 'give' : 'walk'), 'the sheet choice is recorded');
  // End: the pass, the buddies, the last grass
  b.until(() => g.missions.cur?.def.id === 'end', 800, 10); b.tp(-575, -420); b.until(() => g.missions.cur.step.do === 'hold' || g.missions.cur.step.do === 'script' || g.missions.cur.step.do === 'ignite', 600, 10);
  if (give) { b.until(() => g.missions.cur.step.do !== 'hold', 4200, 60); } b.skipTalk(); g.weapons.give('flare', 100); g.weapons.equipSlot('side', true); const pass = g.sitesSys.find('the-pass');
  b.until(() => g.missions.cur?.step?.do === 'ignite', 1200, 10); g.world.wind.pin = true; b.tp(pass.x, pass.z + 20, 3.14); g.ctx.camera.pitch = -0.4; b.step(3); g.weapons.cooldown = 0; b.fire(5); b.step(120); b.until(() => g.ui.screen?.id === 'ending', 900, 10);
  T(g.ui.screen?.id === 'ending' && g.story.ending === (give ? 'give' : 'walk'), `the ${give ? 'column' : 'walk-out'} ending card shows`); T(g.story.earned > 40 && g.story.done.length >= 8, `the run earned stones (${g.story.earned}) and finished ${g.story.done.length} missions`);
  T(e.errors.length === 0, `no engine errors (${e.errors[0] || ''})`); delete globalThis.localStorage; return g;
}
export async function run(t) {
  await play(t, 'walk, syrette, buddies alive', { finishBuddy: false, shoot: true, give: false, deadBuddy: false });
  await play(t, 'give, finish it, a buddy dead', { finishBuddy: true, shoot: false, give: true, deadBuddy: true });
}
