// Scripted playthrough of the whole game, through real input, against the plan's milestones.
import { Bot } from './bot.mjs';
import { ITEMS } from '../../src/data/items.js';
import { NEIGHBOURS } from '../../src/data/neighbours.js';
import { LANDMARKS, BUILDINGS } from '../../src/data/town.js';
import { PLAZA_CRACK, SAPLING_SPOT } from '../../src/systems/dayone.js';
import { tuning, resetTuning } from '../../src/dev/tuning.js';
import { villageDay } from '../../src/core/calendar.js';
import { CITY_DOORS } from '../../src/data/cityMap.js';
import { hasSave, loadWorld, SAVE_KEY } from '../../src/core/save.js';
import { store } from '../../src/core/storage.js';
import { waterKind } from '../../src/world/tiles.js';
import { equip } from '../../src/systems/tools.js';

export async function playthrough({ log = () => {} } = {}) {
  store.remove(SAVE_KEY); store.remove('honk:session'); store.remove('honk:settings'); store.remove('honk:tuning');
  resetTuning();
  const b = await Bot.start({ seed: 1234 });
  const g = b.g;
  const w = () => g.world;
  const seenEvents = {};
  const origEmit = g.events.emit.bind(g.events);
  g.events.emit = (name, data) => { seenEvents[name] = (seenEvents[name] ?? 0) + 1; origEmit(name, data); };
  const check = b.check.bind(b);
  const door = (id) => BUILDINGS.find((x) => x.id === id).door;
  const hasItem = (id) => w().player.pockets.some((s) => s?.id === id);
  const give = (id, meta = null) => { const p = w().player.pockets; const i = p.indexOf(null); if (i < 0) p[0] = meta ? { id, ...meta } : { id }; else p[i] = meta ? { id, ...meta } : { id }; };
  const clearPockets = () => { w().player.pockets.fill(null); };
  const enter = (id) => { const d = door(id); b.walkTo(d[0], d[1] + 0.2, { stop: 0.3 }); b.face(d[0], d[1] - 1); g.interact.update(); const t = g.interact.lastList.find((c) => c.act === 'enterBuilding' && c.building.id === id); check(t, `door of ${id}`); g.scripts.run(actionFor(t), { name: 'enterBuilding' }); b.until(() => !g.inTransition && !g.scripts.holding, 600, `enter ${id}`); };
  const actionFor = (t) => { g.interact.target = t; return g.interact.activate(t), (function* () {})(); };
  const leave = () => { const e = g.place.def.exit; b.walkTo(e.x, g.place.d - 0.9, { stop: 0.25 }); const { right, forward } = g.ctx.camera.groundBasis(); b.e.input.analog.x = right.z; b.e.input.analog.y = forward.z; b.until(() => g.scripts.has('leaveRoom') || g.inTransition, 200, 'exit'); b.e.input.analog.x = 0; b.e.input.analog.y = 0; b.until(() => !g.inTransition && !g.scripts.holding, 600, 'left room'); };
  const useTool = (key = 'Space') => { b.press(key); };
  const nextDay = (to = null) => { const target = to ?? w().clock.day + 1; let guard = 0; while (w().clock.day < target && guard++ < 80) { w().clock.minute = 299.95; b.step(8); for (let i = 0; i < 400 && b.top?.id === 'seasonPage'; i++) b.step(2); } w().clock.minute = Math.max(w().clock.minute, 8 * 60); g.weatherKey = null; g.lastHour = -1; b.step(4); for (let i = 0; i < 400 && b.top?.id === 'seasonPage'; i++) b.step(2); g.refreshSeason(); };
  const gotoTown = (x, z) => g.handle().actions.goto('town', x, z);

  // ---- 1. New Arrival through the bus --------------------------------------------------------------
  b.step(30);
  check(g.mode === 'title', 'boots to title');
  b.menu('New Arrival');
  b.step(3);
  b.menu('Village Time');
  b.step(120);
  b.through();
  // Name entry: typed characters arrive through input.send
  b.until(() => b.top?.id === 'keyboard', 1200, 'name keyboard');
  for (const ch of 'Pip') b.e.input.send({ t: 'key', key: ch });
  b.step(3);
  b.e.input.send({ t: 'key', key: 'Enter' });
  b.step(3);
  check(w().player.name === 'Pip', `name set, got ${w().player.name}`);
  b.through();
  b.until(() => b.top?.id === 'keyboard', 1200, 'town keyboard');
  // The pad's triangle suggests a town name
  b.press('PadTriangle');
  check(b.top.value.length > 0, 'triangle suggests a name');
  b.e.input.send({ t: 'key', key: 'Enter' });
  b.step(3);
  check(w().player.town !== 'Nowhere', 'town named');
  b.through([0]);
  b.through([1]);
  b.through([2]);
  b.through();
  b.until(() => b.top?.id === 'lookEditor', 2400, 'look editor');
  b.press('ArrowRight');
  b.press('KeyE');
  b.step(2);
  b.through();
  b.until(() => g.place === g.town, 2400, 'arrive at the stop');
  for (let i = 0; i < 40 && g.scripts.holding; i++) { b.through(); b.step(30); }
  b.until(() => !g.scripts.holding, 2400, 'arrival scene ends');
  check(w().player.debt === 8000, `debt 8000, got ${w().player.debt}`);
  check(w().story.day1Active, 'day one active');
  check(hasSave(), 'saved after arrival');
  log('1 arrival');

  // ---- 2. Day One errands --------------------------------------------------------------------------
  const E = () => w().story.errands;
  const talkNpc = (id) => {
    const n = g.npcs.get(id);
    n.inside = false;
    n.state = 'idle'; n.timer = 60; n.path = null;
    const d = door(NEIGHBOURS[id].building);
    if (Math.hypot(n.actor.x - g.player.x, n.actor.z - g.player.z) > 30) { n.setPos(d[0] + 1.2, d[1] + 1.6); }
    g.npcs.syncVisibility(n);
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z]) => [n.actor.x + x, n.actor.z + z]).find(([x, z]) => !g.place.blocked(x, z));
    if (!open) n.setPos(d[0], d[1] + 1.4);
    b.walkTo((open ?? [n.actor.x, n.actor.z + 1])[0], (open ?? [n.actor.x, n.actor.z + 1])[1], { stop: 0.4 });
    b.face(n.actor.x, n.actor.z);
    g.interact.update();
    const t = g.interact.lastList.find((c) => c.act === 'npcTalk' && c.npc === id);
    if (!t) { b.fails.push(`[${g.status()}] cannot talk to ${id}`); return false; }
    g.interact.target = t;
    g.interact.activate(t);
    b.step(2);
    return true;
  };
  // Parcel from Dorrit to the goose
  check(talkNpc('dorrit'), 'talk dorrit');
  b.through();
  check(E().parcel === 'got' && hasItem('parcel'), 'parcel fetched');
  // Weed: pull one, sell it at the store
  const weedKey = Object.keys(w().town.objects).filter((k) => w().town.objects[k].k === 'weed').sort((a, c) => { const [ax, az] = a.split(',').map(Number), [cx, cz] = c.split(',').map(Number); return Math.hypot(ax - g.player.x, az - g.player.z) - Math.hypot(cx - g.player.x, cz - g.player.z); })[0];
  const [wx, wz] = weedKey.split(',').map(Number);
  b.use(wx + 0.5, wz + 0.5, { act: 'pullWeed' });
  b.until(() => !g.scripts.holding, 200);
  check(hasItem('weed'), 'pulled a weed');
  check(seenEvents.weedPulled >= 1, 'weed event');
  // Store: deliver parcel, sell weed. Hold on: it's Day One, the store opens for you.
  enter('store');
  check(g.place.id === 'store', 'inside store');
  const counter = () => g.interact.lastList.find((c) => c.act === 'ganderCounter');
  b.walkTo(8.6, 3.6, { stop: 0.3 });
  b.face(8.6, 2);
  g.interact.update();
  check(counter(), 'counter target');
  b.press('KeyE');
  b.through();
  check(E().parcel === 'done', 'parcel delivered');
  check(w().player.debt === 7700, `debt after parcel, ${w().player.debt}`);
  b.press('KeyE');
  b.step(3);
  b.through(['Sell']);
  b.step(10);
  b.through();
  b.until(() => b.top?.id === 'pocketPick', 400, 'sell grid');
  b.pick('weed');
  b.through(['Sell it']);
  b.step(4);
  check(E().weeds === 'done', 'weed sold, errand done');
  if (b.top?.id === 'pocketPick') b.press('Escape');
  b.step(4);
  b.through(['Goodbye']);
  b.step(4);
  leave();
  check(g.place === g.town, 'back in town');
  // Net from Tavi: butterfly
  check(talkNpc('tavi'), 'talk tavi');
  b.through();
  check(w().player.tools.includes('net'), 'got net');
  check(w().player.tool === 'net', 'net equipped');
  // catch a bug with real swing
  const bug = g.life.addBug({ id: 'cabbageButterfly', name: 'Cabbage Butterfly', beans: 90, spot: 'flower', seasons: [0], kind: 'flier', icon: 'butterfly', color: 'white', line: 'x' }, g.player.x + 1, g.player.z, null);
  bug.y = 1; b.face(bug.x, bug.z);
  b.e.input.setKey('Space', true); b.step(6); check(g.heldNet, 'net readied on press'); b.e.input.setKey('Space', false); b.step(4);
  b.step(20);
  for (let i = 0; i < 12 && (b.top || g.scripts.holding); i++) { b.through(); b.step(10); }
  check(w().almanac.bug.cabbageButterfly >= 1, 'butterfly caught');
  check(seenEvents.caught >= 1, 'caught event');
  check(E().net === 'caught', `net errand caught, ${E().net}`);
  check(talkNpc('tavi'), 'talk tavi again');
  b.through();
  check(E().net === 'done', 'net errand done');
  // Rod from Bartleby: fish
  check(talkNpc('bartleby'), 'talk bartleby');
  b.through();
  check(w().player.tools.includes('rod'), 'got rod');
  check(w().player.tool === 'rod', 'rod equipped');
  // Cast at water with bite: stand by the river
  const fishAt = () => {
    equip(g, 'rod');
    b.walkTo(37, 22, { stop: 0.3 });
    b.face(39.5, 22);
    useTool();
    b.step(4);
    const f = g.life.fishing;
    check(f, 'cast landed');
    b.until(() => g.life.fishing?.state === 'bite', 1800, 'bite');
    useTool();
    b.step(4);
    b.until(() => !g.life.fishing, 60);
    for (let i = 0; i < 12 && (b.top || g.scripts.holding); i++) { b.through(); b.step(10); }
  };
  fishAt();
  check(w().stats.fish >= 1 || hasItem('oldBoot'), 'fish caught');
  check(E().rod === 'caught', `rod errand caught, ${E().rod}`);
  check(seenEvents.nibble >= 0, 'nibble observed');
  check(talkNpc('bartleby'), 'talk bartleby again');
  b.through();
  check(E().rod === 'done', 'rod errand done');
  // Shovel from the Mayor; dig the crack
  const m = g.life.trundle;
  b.walkTo(m.x, m.z + 1, { stop: 0.4 });
  b.face(m.x, m.z);
  g.interact.update();
  const mt = g.interact.lastList.find((c) => c.act === 'mayorTalk');
  check(mt, 'mayor target');
  g.interact.target = mt; g.interact.activate(mt);
  b.through();
  check(w().player.tools.includes('shovel'), 'got shovel');
  b.walkTo(PLAZA_CRACK[0] + 0.5, PLAZA_CRACK[1] + 1.5, { stop: 0.2 });
  b.face(PLAZA_CRACK[0] + 0.5, PLAZA_CRACK[1] + 0.5);
  b.step(2);
  g.interact.update();
  check(g.interact.tile[0] === PLAZA_CRACK[0] && g.interact.tile[1] === PLAZA_CRACK[1], `tile targets crack ${g.interact.tile}`);
  useTool();
  b.step(40);
  for (let i = 0; i < 8 && (b.top || g.scripts.holding); i++) { b.through(); b.step(10); }
  check(hasItem('unknownFossil'), 'fossil dug');
  check(E().shovel === 'done', 'shovel errand done');
  // Clementine's can; water the sapling
  enter('hall');
  b.walkTo(4.6, 3.6, { stop: 0.3 });
  b.face(4.6, 2);
  g.interact.update();
  b.press('KeyE');
  b.through();
  check(w().player.tools.includes('can'), 'got can');
  // write to Gran at the desk
  b.walkTo(1.2, 2.2, { stop: 0.3 });
  b.face(1.2, 1);
  g.interact.update();
  check(g.interact.target?.act === 'writeLetter', `desk target ${g.interact.target?.act}`);
  b.press('KeyE');
  b.step(3);
  b.menu('Gran');
  b.step(3);
  check(b.top?.id === 'keyboard', 'letter keyboard');
  for (const ch of 'Everything is fine') b.e.input.send({ t: 'key', key: ch });
  b.step(3);
  b.e.input.send({ t: 'key', key: 'Enter' });
  b.step(3);
  b.menu('No');
  b.step(4);
  b.press('KeyE');
  b.step(4);
  b.through();
  check(E().letter === 'done', 'letter errand done');
  check(w().mail.pending.some((l) => l.from === 'gran'), 'Gran will reply');
  leave();
  b.walkTo(SAPLING_SPOT[0] + 0.5, SAPLING_SPOT[1] + 1.5, { stop: 0.25 });
  b.face(SAPLING_SPOT[0] + 0.5, SAPLING_SPOT[1] + 0.5);
  b.step(2);
  useTool();
  b.until(() => !g.scripts.holding, 200);
  b.step(30);
  check(E().can === 'done', 'can errand done');
  // Evening with Mrs. Gander
  enter('store');
  b.walkTo(8.6, 3.6, { stop: 0.3 });
  b.face(8.6, 2);
  g.interact.update();
  b.press('KeyE');
  b.through();
  check(!w().story.day1Active, 'day one finished');
  check(w().flags.shackRoof, 'roof on');
  check(w().player.debt === 6000, `2,000 off the debt, ${w().player.debt}`);
  log('2 day one');
  return { b, g, seenEvents, helpers: { hasItem, give, clearPockets, enter, leave, useTool, nextDay, gotoTown, talkNpc, fishAt, door, check, w } };
}
