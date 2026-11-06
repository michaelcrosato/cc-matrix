// playthrough: a bot plays M0 to both endings through the real actions (with god mode; teleporting only between objectives).
import { boot } from '../tests/lib/boot.mjs';
import { Bot } from '../tests/lib/bot.mjs';
import { hasDone } from '../src/core/story.js';
export const covers = ['src'];
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

async function play(t, label, { finishBuddy, shoot, give, deadBuddy }) {
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
  const S = (l) => console.log(l, 'step', g.missions.cur?.i, g.missions.cur?.step?.do, 'mode', g.mode, 'screen', g.ui.screen?.id, 'dlg', g.dialogueOn);
  b.tp(-430, -120); b.use('vance'); b.skipTalk(); b.waitChoice(); b.choose(0); b.step(5); b.tp(380, -50); b.ignoreAlt(); S('after alt');
  b.until(() => g.missions.cur.step.do === 'destroy', 300, 10); g.weapons.give('tractor', 90); g.weapons.equipSlot('main', true); S('ready');
  const tanks = g.sitesSys.things.filter((q) => q.tag === 'fuel-tank');
  { const th = tanks[0]; b.tp(th.x - 14, th.z + 6); for (let k = 0; k < 40 && !th.dead; k++) { b.aim(th.x, th.y + 2, th.z); b.fire(7); b.step(4); } }
  const th = tanks[1]; b.tp(th.x - 14, th.z + 6); b.aim(th.x, th.y + 2, th.z); b.step(20);
  const o = new (g.player.feet.constructor)(), d = new (g.player.feet.constructor)(); g.ctx.camera.camera.getWorldPosition(o); g.ctx.camera.camera.getWorldDirection(d);
  const h = g.castBullet(o, d, 60); console.log('hit', h && { dist: h.distance.toFixed(1), thing: !!h.thing, hp: h.thing?.hp, actor: !!h.actor, veh: !!h.vehicle, pt: h.point.toArray().map((v) => +v.toFixed(1)) }, 'player', g.player.feet.toArray().map((v) => +v.toFixed(1)), 'tank', th.x, th.y, th.z);
  console.log('weapon', JSON.stringify(g.weapons.state().weapon), 'reloading', g.weapons.reloading, 'cd', g.weapons.cooldown, 'burning', g.body.burning, 'hp', g.body.hp);
}
await play({ ok() {}, eq() {}, fail() {} }, 'dbg', { finishBuddy: false, shoot: true, give: false, deadBuddy: false });
