// Starting, continuing and leaving: world resets, the night bus in, Mrs. Gander at the stop, Inspector Pimm.
import { newWorld, loadWorld, saveWorld, SAVE_KEY, clearSave } from '../core/save.js';
import { hash32 } from '../core/rng.js';
import { say, ask, narrate } from './say.js';
import { keyboardFlow } from '../ui/screens/keyboard.js';
import { lookEditor } from '../ui/screens/lookEditor.js';
import { prepareDayOne } from './dayone.js';
import { dailyRespawn, handleAbsence } from './flow.js';
import { rebuildAllObjects } from '../world/objectsView.js';
import { BusPlace } from './bus.js';
import { LANDMARKS } from '../data/town.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { markSessionOpen, markSessionClean, lastSessionUnclean, saveNow } from './session.js';
import { titleScreen } from '../ui/screens/title.js';
import { hourNow } from './time.js';
import { dailyFavours } from './favours.js';
import { Actor } from '../actors/rig.js';
import { CRITTER_DEFS, HAIR_COLORS } from '../art/critter.js';
import { equip } from './tools.js';
import { deliverMail } from './mail.js';
import { cheeseDayReset } from './cheese.js';

const NAMES = ['Pip', 'Moss', 'Juniper', 'Wren', 'Ash', 'Bramble', 'Tuck', 'Fern', 'Quill', 'Sorrel', 'Basil', 'Hob'];
const TOWNS = ['Lower Nowhere', 'Much Owing', 'Little Regret', 'Bean Hollow', 'Far Enough', 'Dunhonkin', 'Upper Lateness', 'Pear Bottom'];

/** Swap in a world and make the scene match it. */
export function installWorld(g, world) {
  g.world = world;
  g.scripts.cancelAll();
  g.weatherKey = null;
  g.lastHour = -1;
  g.town.syncNav();
  g.refreshSeason(true);
  rebuildAllObjects(g.town);
  g.rooms.reset();
  g.town.refreshHome();
  g.town.refreshStore();
  g.player.applyLook();
  g.life.resetDay();
  g.festivals.resetDay();
  g.npcs.scatter();
  for (const n of g.npcs.all()) { n.talking = false; n.overrideClip = null; }
  g.sky.placeChanged();
  equip(g, world.player.tool, false);
}
export function startNewGame(g, mode) {
  const seed = g.opts.seed ?? hash32(`arrival:${g.ctx.time}:${g.realNow ?? 0}`);
  const w = newWorld(seed, { mode });
  g.ui.popAll();
  g.mode = 'play';
  g.demo = false;
  g.camState.zoomOverride = undefined;
  g.fixedCam = false;
  g.ctx.engine.screen.set('fade', 1);
  installWorld(g, w);
  dailyRespawn(g);
  rebuildAllObjects(g.town);
  g.events.emit('newGame', { mode });
  g.scripts.run(arrival(g), { name: 'arrival' });
}
/** Title → the night bus → the stop. Answers set your hair, colours and eyes. */
function* arrival(g) {
  const w = g.world;
  w.clock.minute = 23 * 60;
  w.flags.forceWeather = 'rain';
  g.weatherKey = null;
  g.hideHud = true;
  const bus = g.busPlace ??= new BusPlace(g);
  g.ctx.scene.add(bus.group);
  bus.setScene(0, 1, { night: true });
  g.swapPlace(bus, 0, 0, 0);
  const p = g.player;
  p.remove();
  bus.bodyGroup.add(p.root);
  p.x = 0.6; p.z = -0.8; p.y = 0.86; p.facing = Math.PI * 0.5;
  p.sitting = true;
  p.play('Sit', 0);
  g.camFocus = { x: 1.5, y: 1.2, z: 0 };
  g.camTeleport();
  g.sky.apply();
  bus.hester.play('Sit', 0);
  g.ctx.engine.screen.reveal('fade', { duration: 1 });
  yield 1.2;
  g.sound('thunder');
  yield* say(g, 'hester', ["End of the line? Nobody gets off there on purpose."]);
  yield* say(g, 'hester', ["I'm Hester. I drive the bus. Who've I got?"]);
  w.player.name = yield* keyboardFlow(g, { title: 'What do they call you?', max: 12, random: NAMES, hint: 'Type, or use the grid. Suggest asks Hester to guess.' });
  yield* say(g, 'hester', [`${w.player.name}. All right. I've heard worse. I've driven worse.`, "And what's the town called? The one at the end? Nobody's ever told me. I only drive the bus."]);
  w.player.town = yield* keyboardFlow(g, { title: "What's the town called?", max: 16, random: TOWNS, hint: "It's up to you. It's always been up to someone." });
  yield* say(g, 'hester', `${w.player.town}. Sounds about right. It's raining there. It's raining everywhere. I've checked.`);
  const a = yield* ask(g, 'hester', 'So what are you running from?', ['The usual', 'Nothing, honest', 'A very large bill', 'My family']);
  w.player.look.hair = [0, 3, 5, 4][a < 0 ? 0 : a];
  const b = yield* ask(g, 'hester', 'Favourite weather?', ['Rain', 'Sun', 'Snow', 'I like a good fog']);
  w.player.look.hairColor = ['navy', 'orange', 'white', 'plum'][b < 0 ? 0 : b];
  const c = yield* ask(g, 'hester', 'How do you take bad news?', ['Sitting down', 'Very well', 'Loudly', 'I write a letter']);
  w.player.look.eyes = [2, 1, 3, 0][c < 0 ? 0 : c];
  p.applyLook();
  p.play('Sit', 0);
  yield* narrate(g, 'A wet face looks back at you from the bus window. Is that what you look like? You could do something about that. Now would be the time.');
  yield* lookEditor(g, { title: 'The bus window' });
  p.play('Sit', 0);
  yield* say(g, 'hester', 'You look like someone who owes money.');
  yield* say(g, 'hester', "Here we are. Mind the step. There isn't a step. Mind it anyway.");
  g.sound('busBrake');
  g.engine.screen.cover('iris', { duration: 0.6 });
  yield 0.7;
  // Morning, at the stop
  p.sitting = false;
  p.remove();
  w.flags.forceWeather = null;
  w.clock.minute = 8 * 60;
  g.weatherKey = null;
  prepareDayOne(g);
  rebuildAllObjects(g.town);
  dailyFavours(g);
  g.swapPlace(g.town, LANDMARKS.busStop[0] + 1, LANDMARKS.busStop[1] + 0.3, Math.PI / 2);
  g.lastHour = hourNow(w);
  g.npcs.scatter();
  g.life.resetDay();
  g.hideHud = false;
  const gander = new Actor(CRITTER_DEFS.gander, { name: 'gander', seed: 4 });
  gander.addTo(g.town.group);
  gander.x = LANDMARKS.busStop[0] + 3; gander.z = LANDMARKS.busStop[1] + 0.3; gander.facing = -Math.PI / 2;
  g.townGander = gander;
  g.engine.screen.reveal('iris', { duration: 0.6 });
  g.actorOverride = { gander };
  yield 0.8;
  gander.play('Honk', 0.1, { once: true });
  g.sound('honk');
  yield* say(g, 'gander', ["You're late. No, you're exactly on time. I've already billed you for being late.", `Mrs. Gander. I own the store, the road you're standing on, and as of ninety seconds ago, a good part of you, ${w.player.name} dear.`, "Your new home is this way. Do keep up. I'm charging by the minute."]);
  g.engine.screen.cover('iris', { duration: 0.5 });
  yield 0.6;
  g.swapPlace(g.town, 69, 41.6, Math.PI);
  gander.x = 66.4; gander.z = 41.2; gander.facing = Math.PI / 2;
  g.engine.screen.reveal('iris', { duration: 0.5 });
  yield 0.7;
  yield* say(g, 'gander', ["Here we are. The roof is included. The rain is complimentary. The 8,000 beans are not.", "I see you've no way to pay. How lovely. Put this apron on. You'll work some of it off with errands. Look at your list, dear. Top right."]);
  w.player.look.outfit = 'apron';
  p.applyLook();
  g.sound('uiConfirm');
  yield* say(g, 'gander', "Dorrit has a parcel. Tavi has a net. Bartleby has a rod and would prefer not. The Mayor is around, slowly. Clementine at the Hall has the rest. Off you go. HONK. Pardon me. That was my indoor voice.");
  gander.remove();
  g.townGander = null;
  g.actorOverride = null;
  markSessionOpen(g);
  saveNow(g);
  g.events.emit('arrived', {});
}
export function continueGame(g) {
  const w = loadWorld();
  if (!w) { g.sound('uiError'); return; }
  const unclean = lastSessionUnclean();
  g.ui.popAll();
  g.mode = 'play';
  g.demo = false;
  g.fixedCam = false;
  g.camState.zoomOverride = undefined;
  installWorld(g, w);
  // Quit on the bus and you wake at the stop. It's not far.
  if (w.player.place === 'bus') { w.player.place = 'town'; w.player.x = LANDMARKS.busStop[0]; w.player.z = LANDMARKS.busStop[1]; }
  const place = w.player.place === 'town' || !w.player.place ? g.town : w.player.place === 'city' ? g.city : g.rooms.get(w.player.place);
  g.place.group.visible = false;
  g.swapPlace(place, w.player.x, w.player.z, w.player.facing);
  if (g.realNow) handleAbsence(g, g.realNow);
  deliverMail(g);
  markSessionOpen(g);
  g.events.emit('continued', {});
  if (unclean) g.scripts.run(pimmVisit(g), { name: 'pimm' });
}
/** Inspector Pimm: three escalating monologues, then one last resigned one. */
export function* pimmVisit(g) {
  const w = g.world;
  w.pimm.visits += 1;
  const v = w.pimm.visits;
  const bank = v === 1 ? HOSTS.pimm.first : v === 2 ? HOSTS.pimm.second : v === 3 ? HOSTS.pimm.third : v === 4 ? HOSTS.pimm.last : null;
  if (!bank) return;
  yield 0.6;
  const a = new Actor(CRITTER_DEFS.pimm, { name: 'pimm', seed: 11 });
  a.addTo(g.place.group);
  a.x = g.player.x + 6; a.z = g.player.z; a.y = g.place.height(g.player.x, g.player.z); a.facing = -Math.PI / 2;
  a.play('PimmScuttle', 0);
  g.actorOverride = { pimm: a };
  g.pimmActor = a;
  while (a.x > g.player.x + 1.6) { a.x -= 1 / 60 * 2.4; yield; }
  a.play('Idle', 0.2);
  g.player.faceToward(a.x, a.z);
  yield* say(g, 'pimm', bank);
  g.events.emit('pimm', { visit: v });
  a.play('PimmScuttle', 0.2);
  for (let i = 0; i < 120; i++) { a.x += 1 / 60 * 3; yield; }
  a.remove();
  g.pimmActor = null;
  g.actorOverride = null;
}
export function quitToTitle(g) {
  g.ui.popAll();
  g.scripts.cancelAll();
  g.engine.screen.set('fade', 0);
  g.goTitle();
}
export { saveWorld, SAVE_KEY, clearSave, cheeseDayReset, HAIR_COLORS, titleScreen, markSessionClean };
