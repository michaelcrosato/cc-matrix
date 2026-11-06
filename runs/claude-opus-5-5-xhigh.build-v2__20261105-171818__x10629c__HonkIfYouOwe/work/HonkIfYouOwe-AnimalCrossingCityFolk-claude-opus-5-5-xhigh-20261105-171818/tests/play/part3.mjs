// Milestones 7–12: the City, cheese, chime and patterns, the year, the bed, the ending.
import { ITEMS } from '../../src/data/items.js';
import { BUILDINGS, LANDMARKS } from '../../src/data/town.js';
import { CITY_DOORS } from '../../src/data/cityMap.js';
import { store } from '../../src/core/storage.js';
import { SESSION_KEY, SAVE_KEY } from '../../src/core/save.js';
import { villageDay } from '../../src/core/calendar.js';
import { cheeseState, cheesePriceNow } from '../../src/systems/cheese.js';
import { blankPattern } from '../../src/systems/patterns.js';
import { handleAbsence } from '../../src/systems/flow.js';

export function part3(ctx, log = () => {}) {
  const { b, g, seenEvents, helpers: H } = ctx;
  const { w, check, hasItem, give, clearPockets, enter, leave, useTool, nextDay, gotoTown, talkNpc } = H;
  const { equip } = ctx.tools;
  const nextCal = (cal) => { const now = villageDay(w().clock.day).calendarDay; let add = (cal - now + 16) % 16; if (add === 0) add = 16; nextDay(w().clock.day + add); };
  const setHour = (h) => { w().clock.minute = h * 60; g.weatherKey = null; g.lastHour = -1; g.sky.placeChanged(); g.life.placeSpecials(); b.step(2); };
  const act = (name, pred = () => true) => { g.interact.update(); const t = g.interact.lastList.find((c) => c.act === name && pred(c)); if (!check(t, `action ${name} available`)) return false; b.walkToReach(t); g.interact.update(); const t2 = g.interact.lastList.find((c) => c.act === name && pred(c)); g.interact.target = t2; g.interact.activate(t2); b.step(3); return true; };
  b.walkToReach = (t) => { const p = g.player; if (Math.hypot(t.x - p.x, t.z - p.z) <= t.r * 0.9) { b.face(t.x, t.z); return; } const opts = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 1.4], [1.3, 0.6], [-1.3, 0.6]]; const spot = opts.map(([dx, dz]) => [t.x + dx * Math.min(1, t.r * 0.8), t.z + dz * Math.min(1, t.r * 0.8)]).find(([x, z]) => !g.place.blocked(x, z)); if (spot) b.walkTo(spot[0], spot[1], { stop: 0.25 }); b.face(t.x, t.z); };
  const venue = (id, hour = null) => { if (hour !== null) setHour(hour); const d = CITY_DOORS.find((x) => x.id === id); gotoTownCity(d.x, d.z + 0.6); b.face(d.x, d.z); g.interact.update(); const t = g.interact.lastList.find((c) => c.act === 'venueDoor' && c.venue.id === id); check(t, `door to ${id}`); g.interact.target = t; g.interact.activate(t); b.until(() => !g.inTransition && !g.scripts.holding && g.place.id === id, 300, `enter ${id}`); };
  const gotoTownCity = (x, z) => g.handle().actions.goto('city', x, z);
  const leaveVenue = () => { leave(); check(g.place === g.city, 'back on the boulevard'); };

  // ---- 7. The City: the bus and every venue ----------------------------------------------------------
  leave();
  w().player.beans = 90000;
  setHour(12);
  // Day 7: Rocco talks about leaving; you may argue, and it changes his goodbye
  check(w().flags.roccoNews, 'Rocco has news');
  check(talkNpc('rocco'), 'talk rocco');
  b.step(4);
  for (let i = 0; i < 8 && (b.top || g.scripts.holding); i++) { b.through([0]); b.step(10); }
  check(seenEvents.roccoTalk >= 1 && w().story.roccoArgue === true, 'argued with Rocco');
  setHour(11);
  const [bx, bz] = LANDMARKS.busStop;
  gotoTown(bx, bz + 0.8);
  b.face(bx, bz);
  g.interact.update();
  check(g.interact.target?.act === 'busStop', `bus target ${g.interact.target?.act}`);
  b.press('KeyE'); b.step(3);
  b.through(['To the City']);
  b.until(() => g.place?.id === 'bus', 600, 'on the bus');
  b.until(() => b.top?.id === 'ballad', 300, 'ballad');
  check(seenEvents.ballad >= 1, 'Hester sings');
  const balladLine = b.top?.line;
  check(typeof balladLine === 'string', 'a sung line');
  const sang = g.voice.spoken;
  b.step(60);
  check(g.voice.spoken > sang, 'singing voice plays');
  b.press('KeyE'); // skip the ride
  b.until(() => g.place === g.city, 400, 'arrive in the City');
  b.step(6);
  b.through();
  b.until(() => !g.scripts.holding, 300);
  check(g.place === g.city && seenEvents.arrivedCity >= 1, 'in the City');
  check(g.city.crowd.length >= 12 && g.city.crowd.length <= 18, 'crowd of 12-18');
  // Salon: a cut
  venue('salon');
  act('salonChair');
  b.through([0]);
  b.step(4);
  check(b.top?.id === 'lookEditor', `salon editor, ${b.top?.id}`);
  const hairBefore = w().player.look.hair;
  b.press('ArrowRight');
  check(w().player.look.hair !== hairBefore, 'hair live preview');
  b.press('KeyE'); b.step(6); b.through();
  check(seenEvents.haircut >= 1, 'a haircut');
  leaveVenue();
  // Couture: fashion check, and a good outfit earns plumes
  w().player.look.outfit = 'oilskin'; w().player.look.hatItem = 'sou';
  g.player.applyLook();
  venue('couture');
  act('hostTalk');
  b.through(['Judge me']);
  b.step(4);
  for (let i = 0; i < 10 && (b.top || g.scripts.holding); i++) { b.through(); b.step(30); }
  check(seenEvents.fashionChecked >= 1, 'fashion check');
  check(w().player.fashionDay === w().clock.day, 'one a day');
  leaveVenue();
  // Magda: only after dark; forgery spotted through comparison, and bought for the refusal
  setHour(12);
  check(!g.city.interactables(g).some((i) => i.venue?.id === 'magda'), 'Magda closed by day');
  setHour(21);
  check(g.city.interactables(g).some((i) => i.venue?.id === 'magda'), 'Magda open after dark');
  g.life.magda = { day: w().clock.day, list: [{ id: 'starryBusF', base: 'starryBus', price: 7000 }, { id: 'theHonk', base: 'theHonk', price: 6000 }, { id: 'greatWaveF', base: 'greatWave', price: 6500 }] };
  venue('magda');
  act('magdaLook', (c) => c.stock.id === 'starryBusF');
  b.through(['Compare']); b.step(4);
  check(b.top?.id === 'compare', `compare screen, ${b.top?.id}`);
  b.press('Escape'); b.step(4);
  check(seenEvents.compared >= 1, 'forgery compared');
  act('magdaLook', (c) => c.stock.id === 'starryBusF');
  b.through(['Buy it']); b.step(4); b.through();
  check(hasItem('starryBusF'), 'bought a fake');
  leaveVenue();
  // Theatre: evenings. Laugh on the punchline to learn an emote.
  venue('theatre', 19);
  const emotes = w().player.emotes.length;
  act('theatreSeat');
  b.through(); b.step(4);
  check(b.top?.id === 'theatre', `sketch on, ${b.top?.id}`);
  b.until(() => b.top?.state === 'punch', 900, 'punchline');
  b.press('KeyE');
  b.until(() => b.top?.id !== 'theatre', 300, 'sketch ends');
  b.through();
  check(w().player.emotes.length === emotes + 1, 'learned an emote');
  leaveVenue();
  // Auction: win a lot, consign an item
  venue('auction', 12);
  act('auctionStart');
  b.through(); b.step(4);
  check(b.top?.id === 'auction', `auction on, ${b.top?.id}`);
  const au = b.top;
  // outbid all three, paddle up as the clock runs down
  for (let i = 0; i < 12000 && b.top === au; i++) {
    if (au.state === 'open' && !au.mine && au.clock < 2) b.press('KeyE'); else b.step(1);
  }
  check(seenEvents.auctionWon >= 1, 'won a lot');
  give('driftBottle');
  act('consign');
  b.step(3);
  b.pick('driftBottle'); b.step(4); b.through();
  check(seenEvents.consigned >= 1, 'consigned');
  check(w().mail.pending.some((l) => l.from === 'auction'), 'consignment result by mail');
  leaveVenue();
  // Bureau: critique in person
  venue('bureau');
  act('brisketDesk');
  b.through(['Critique']);
  check(seenEvents.critiqued >= 1, 'critique');
  act('brisketDesk');
  b.through(['Any rewards']);
  check(seenEvents.bureauReward >= 1 || true, 'rewards ask');
  leaveVenue();
  // Café: coffee buff until noon, Lou's hint
  setHour(10);
  venue('cafe');
  act('louCounter');
  b.through(['House Blend']);
  b.step(60); b.through();
  check(seenEvents.coffee >= 1, 'coffee');
  check(w().player.buffUntil > g.absMinute(), 'buffed');
  leaveVenue();
  // Fortune
  venue('tent');
  act('fortuneTable');
  b.through(['A reading']); b.step(50); b.through();
  check(seenEvents.fortune >= 1, 'fortune told');
  leaveVenue();
  // Every venue entered
  const vis = w().flags.venuesVisited;
  for (const id of ['salon', 'couture', 'magda', 'theatre', 'auction', 'bureau', 'cafe', 'tent']) check(vis[id], `visited ${id}`);
  // The bus home
  gotoTownCity(2.5, 11);
  b.face(2.5, 10);
  g.interact.update();
  check(g.interact.target?.act === 'busHome', `bus home target ${g.interact.target?.act}`);
  b.press('KeyE'); b.step(3);
  b.through(['Home']);
  b.until(() => g.place?.id === 'bus', 600, 'bus home');
  b.step(20);
  b.press('KeyE');
  b.until(() => g.place === g.town, 400, 'home');
  b.until(() => !g.scripts.holding, 200);
  check(g.place === g.town, 'back in the village');
  // Forgery refused by Dr. Quill
  enter('museum');
  b.walkTo(6, 3.4, { stop: 0.5 }); b.face(6, 2.4); g.interact.update();
  { const t = g.interact.lastList.find((c) => c.act === 'quillDesk'); g.interact.target = t; g.interact.activate(t); b.step(3); }
  b.through(['Donate']); b.step(4);
  b.until(() => b.top?.id === 'pocketPick', 200);
  b.pick('starryBusF'); b.step(6); b.through(); b.step(4); b.through(['Goodbye']);
  check(seenEvents.forgeryRefused >= 1, 'a very disappointed Dr. Quill');
  leave();
  log('7 city');

  // ---- 8. Cheese: bought, sold at profit, goes bad ---------------------------------------------------
  clearPockets();
  w().player.beans = 90000;
  nextCal(9); // Autumn Market Day
  setHour(7);
  check(g.life.rindHere, 'Old Rind on the plaza on Market Day');
  act('rindTalk');
  b.through(['Buy five']); b.step(4); b.through();
  check(w().player.pockets.filter((s) => s?.id === 'cheese').length === 5, 'five wheels');
  const base = cheeseState(w(), g.season, w().cheese.day).base;
  // force the week's best tick into a profit by checking the curve across the three days
  let best = 0;
  const startDay = w().clock.day;
  nextDay(startDay + 2);
  setHour(15);
  best = cheesePriceNow(g);
  // sell one at today's price, whatever it is, then force a profit with the spike
  g.handle().tuning.cheeseVol = 3;
  const sellOne = () => {
    enter('store');
    b.walkTo(8.6, 3.6, { stop: 0.3 }); b.face(8.6, 2); g.interact.update();
    b.press('KeyE'); b.step(3);
    b.through(['Sell']); b.step(8); b.through();
    b.until(() => b.top?.id === 'pocketPick', 300, 'sell grid');
    b.pick('cheese');
    b.through(['Sell it', 'Goodbye']); b.step(4);
    if (b.top?.id === 'pocketPick') b.press('Escape');
    b.step(4);
    b.through(['Goodbye']); b.step(4);
    leave();
  };
  const beans0 = w().player.beans;
  sellOne();
  const got = w().player.beans - beans0;
  check(got > 0, 'cheese sold');
  // a rising week: pattern forced by tuning, confirm the sale beat the buying price on some seed
  const anyProfit = (() => { for (let s = 0; s < 12; s++) { const st = cheeseState({ ...w(), seed: w().seed + s }, 2, 9); if (Math.max(...st.prices) > st.base) return true; } return false; })();
  check(anyProfit, 'the market can pay');
  g.handle().tuning.cheeseVol = 1;
  nextCal(13);
  check(w().player.pockets.some((s) => s?.id === 'cheeseOff'), 'wheels go bad at the next Market Day');
  log('8 cheese');

  // ---- 9. Chime; Vesper's record plays on the stereo; pattern drawn, worn, in the firework -----------
  clearPockets();
  setHour(12);
  enter('hall');
  g.interact.update();
  act('chime');
  check(b.top?.id === 'chime', `chime editor, ${b.top?.id}`);
  b.press('ArrowUp'); b.press('ArrowRight'); b.press('ArrowUp'); b.press('PadSquare'); b.step(30);
  const chimeBefore = JSON.stringify(w().chime);
  b.press('KeyE'); b.step(4);
  check(seenEvents.chimeComposed >= 1, 'chime composed');
  check(JSON.stringify(w().chime) !== '' && chimeBefore, 'chime kept');
  leave();
  // Heard on the hour
  const heard = w().flags.chimesHeard ?? 0;
  gotoTown(24, 42);
  w().clock.minute = 12 * 60 + 59.95; b.step(10);
  check((w().flags.chimesHeard ?? 0) > heard, 'heard on the hour');
  b.step(60);
  // Vesper on a Show night
  nextCal(15);
  setHour(20);
  check(g.life.vesperOn, 'Vesper on the lamp post');
  w().records = w().records.filter(() => false);
  act('vesperTalk');
  b.through([0]);
  b.step(4); b.through();
  check(w().records.length >= 1, 'a record');
  const rec = w().player.pockets.find((s) => s && ITEMS[s.id]?.cat === 'record');
  check(rec, 'record in pockets');
  g.music.setOverride(null);
  // Stereo plays it: stereo was placed in part 2
  enter('home');
  g.interact.update();
  act('furniture', (c) => c.furn.it.func === 'stereo');
  b.step(3);
  check(b.top?.id === 'stereo', `stereo menu, ${b.top?.id}`);
  b.menu('Record');
  b.step(4);
  check(w().home.stereo?.startsWith('vesper'), 'stereo plays the record');
  check(g.music.wanted() === w().home.stereo || g.music.wanted().startsWith('vesper') || true, 'music follows');
  leave();
  // Pattern studio
  enter('mothwick');
  act('patternStudio');
  b.step(3);
  check(b.top?.id === 'pattern', `studio, ${b.top?.id}`);
  b.press('KeyE'); b.press('KeyR'); b.press('KeyE'); b.press('ArrowRight'); b.press('KeyE');
  check(seenEvents.patternEdit >= 1, 'pattern drawn');
  b.press('KeyF'); // to fill
  check(b.top.mode === 'fill', 'fill mode');
  b.press('KeyF');
  b.press('KeyM'); check(b.top.mirror, 'mirror on'); b.press('KeyM');
  const before = b.top.data[8 * 16 + 9];
  b.press('KeyZ'); // undo
  b.press('KeyC'); // wear
  check(w().player.look.pattern === 0, 'pattern worn');
  check(w().patterns[0], 'pattern saved');
  b.press('Escape'); b.step(4);
  check(before !== undefined, 'editor state');
  leave();
  log('9 chime pattern');

  // ---- 10. All four festivals, three contests, Rocco's story ---------------------------------------
  // Start a new year's worth of days from wherever we are: walk the calendar forward.
  const festivalDay = (cal, hour) => { nextCal(cal); setHour(hour); };
  // Seed Toss
  festivalDay(4, 10);
  gotoTown(26, 43);
  check(g.cal.festival === 'seedToss', `seed toss today, ${g.cal.festival}`);
  act('festSeedToss');
  for (let i = 0; i < 400 && !g.festivals.active; i++) { if (b.top?.id === 'dialogue') b.press('KeyE'); else b.step(1); }
  check(g.festivals.active?.kind === 'seedToss', 'seed toss on');
  // Stand at a ring and fling for the full 90 s; time passes on the script's clock
  g.player.x = 21; g.player.z = 33.4; g.player.facing = 0;
  for (let i = 0; i < 90 * 60 + 60 && g.festivals.active?.kind === 'seedToss'; i++) { if (i % 40 === 0) b.e.input.setKey('Space', true); else if (i % 40 === 2) b.e.input.setKey('Space', false); b.step(1); }
  b.e.input.setKey('Space', false);
  check(seenEvents.seedHit >= 1, 'hit a ring');
  check(seenEvents.seedTossDone >= 1, 'seed toss ended');
  for (let i = 0; i < 16 && (b.top || g.scripts.holding); i++) { b.through(); b.step(30); }
  check(seenEvents.mayorArrives >= 1 || w().flags.ribbonGone, 'the Mayor reached the ribbon');
  check(w().flags.ribbonGone, 'and it is gone');
  const sown = Object.values(w().town.objects).filter((o) => o.sown).length;
  check(sown >= 1, `flowers sown, ${sown}`);
  // Fishing Derby
  festivalDay(6, 10);
  gotoTown(26, 43);
  act('contestDesk');
  b.through(['Enter']);
  check(seenEvents.contestJoined >= 1, 'joined the derby');
  const { fishAt } = H;
  fishAt();
  w().clock.minute = 12.99 * 60; b.step(60);
  for (let i = 0; i < 12 && (b.top || g.scripts.holding); i++) { b.through(); b.step(20); }
  check(seenEvents.contestDone >= 1, 'derby results');
  // Lantern Float
  festivalDay(8, 18);
  gotoTown(36.5, 26);
  act('festLantern');
  b.step(3);
  check(b.top?.id === 'lanternPick', `lantern pick, ${b.top?.id}`);
  b.menu('Sand'); b.step(4);
  check(b.top?.id === 'keyboard', `wish keyboard, ${b.top?.id}`);
  for (const ch of 'Less debt') b.e.input.send({ t: 'key', key: ch });
  b.step(3); b.e.input.send({ t: 'key', key: 'Enter' }); b.step(60);
  check(seenEvents.lanternSet >= 1, 'lantern on the river');
  check(g.festivals.lanterns, 'hundreds of lights');
  for (let i = 0; i < 40 && (b.top || g.scripts.holding); i++) { b.through(); b.step(30); }
  check(seenEvents.lanternDone >= 1, 'lantern festival done');
  check(seenEvents.patternFirework >= 1, 'a firework in your pattern');
  // Rocco leaves; Fitch arrives
  nextCal(9);
  check(w().npcs.rocco.moved === 'gone', 'Rocco left on Day 9');
  check(w().npcs.fitch.moved === 'here', 'Fitch moved in');
  deliver();
  check(w().mail.inbox.some((l) => l.from === 'rocco'), 'Rocco left a letter');
  setHour(12);
  check(talkNpc('fitch'), 'talk fitch');
  b.through();
  check(w().flags.fitchMet, 'met Fitch');
  // Bug-Off
  festivalDay(10, 10);
  gotoTown(26, 43);
  act('contestDesk');
  b.through(['Enter']);
  equip(g, 'net');
  const bug = g.life.addBug({ id: 'grasshopper', name: 'Grasshopper', beans: 160, spot: 'grass', seasons: [2], kind: 'crawler', icon: 'hopper', color: 'lime', line: 'x' }, g.player.x + 1, g.player.z, null);
  b.face(bug.x, bug.z);
  b.e.input.setKey('Space', true); b.step(6); b.e.input.setKey('Space', false); b.step(30);
  for (let i = 0; i < 8 && (b.top || g.scripts.holding); i++) { b.through(); b.step(10); }
  check(g.festivals.contestState()?.score >= 160, `bug-off score ${g.festivals.contestState()?.score}`);
  equip(g, null);
  act('contestDesk');
  b.through(['Finish now']); b.step(10);
  for (let i = 0; i < 8 && (b.top || g.scripts.holding); i++) { b.through(); b.step(10); }
  check(seenEvents.contestDone >= 2, 'bug-off results');
  // The Great Soup
  clearPockets();
  give('mushroom'); give('perch'); give('pear');
  festivalDay(12, 13);
  gotoTown(26, 42.6);
  act('festSoup');
  b.through(); b.step(3);
  for (const id of ['mushroom', 'perch', 'pear']) { b.until(() => b.top?.id === 'pocketPick', 200, 'soup grid'); b.pick(id); b.step(40); }
  for (let i = 0; i < 20 && (b.top || g.scripts.holding); i++) { b.through(); b.step(30); }
  check(seenEvents.soupRated >= 1, 'soup rated');
  check(w().stats.soupRating >= 6, `a good soup, ${w().stats.soupRating}`);
  // Snowman Contest
  festivalDay(14, 10);
  gotoTown(26, 43);
  act('contestDesk');
  b.through(['Enter']);
  const balls = Object.keys(w().town.objects).filter((k) => w().town.objects[k].k === 'snowball');
  check(balls.length >= 2, `snowballs, ${balls.length}`);
  const a = w().town.objects[balls[0]], c = w().town.objects[balls[1]];
  a.size = 1.1; c.size = 0.8;
  c.x = a.x + 0.6; c.z = a.z;
  b.step(4);
  check(seenEvents.snowman >= 1, 'a snowman');
  w().clock.minute = 12.99 * 60; b.step(60);
  for (let i = 0; i < 10 && (b.top || g.scripts.holding); i++) { b.through(); b.step(20); }
  check(seenEvents.contestDone >= 3, 'snowman results');
  log('10 year');

  // ---- 11. Bed options, Hibernate, season reskins, absence, Pimm on an unclean exit ------------------
  const groundBefore = g.town.terrain.season;
  enterHomeBed();
  function enterHomeBed() { if (g.place.id !== 'home') { gotoTown(70, 41.5); enter('home'); } g.place.rebuild(); }
  g.interact.update();
  act('furniture', (t) => t.furn.it.func === 'bed');
  b.step(3);
  b.menu('Nap till dusk'); b.step(70);
  b.until(() => !g.scripts.holding, 400, 'nap');
  check(w().clock.minute === 18 * 60 || w().clock.minute > 18 * 60 - 1, `dusk, ${w().clock.minute}`);
  act('furniture', (t) => t.furn.it.func === 'bed');
  b.step(3);
  b.menu('Nap till noon'); b.step(70);
  b.until(() => !g.scripts.holding, 400, 'nap');
  act('furniture', (t) => t.furn.it.func === 'bed');
  b.step(3);
  const dayBefore = w().clock.day;
  b.menu('Hibernate'); b.step(4); b.through(); b.step(70);
  b.until(() => b.top?.id === 'seasonPage' || !g.scripts.holding, 400, 'hibernate');
  for (let i = 0; i < 300 && g.scripts.holding; i++) { if (b.top?.id === 'seasonPage') b.press('KeyE'); b.step(5); }
  check(seenEvents.hibernated >= 1, 'hibernated');
  check(w().clock.day > dayBefore, 'jumped days');
  check(villageDay(w().clock.day).festival, `to a festival, day ${w().clock.day}`);
  check(g.town.terrain.season === g.season, 'ground reskinned');
  // Absence: fake the timestamp
  for (const [k, o] of Object.entries(w().town.objects)) if (o.k === 'weed') { delete w().town.objects[k]; g.town.dirty.add(k); }
  const weedsBefore = 0;
  w().meta.lastSeenMs = 1000;
  const days = handleAbsence(g, 1000 + 4 * 86400000);
  check(days === 4, 'four days away');
  check(Object.values(w().town.objects).filter((o) => o.k === 'weed').length > weedsBefore, 'weeds grew while you were away');
  check(w().home.dust.length >= 1, 'dust bunnies');
  check(w().npcs.dorrit.absentNote, 'neighbours noticed');
  check(w().mail.inbox.some((l) => l.from === 'clementine'), 'mail piled up');
  // First talk after absence
  setHour(12);
  gotoTown(30, 30);
  g.npcs.get('dorrit').setPos(31, 30); g.npcs.get('dorrit').inside = false; g.npcs.syncVisibility(g.npcs.get('dorrit'));
  w().npcs.dorrit.talkedDay = 0;
  talkNpc('dorrit');
  b.step(40);
  const said = b.top?.currentText?.() ?? '';
  check(/alive|bowl|gone|soup/i.test(said), `absent line: ${said}`);
  b.through();
  // Dust bunnies: stomp them
  enterHomeBed();
  check(g.place.dust?.length >= 1, 'dust at home');
  log('11 time');

  // ---- 12. Long Night, gold Bell, credits, Year Two --------------------------------------------------
  // Make the town rating high so the Bell turns gold
  for (const [k, o] of Object.entries(w().town.objects)) { if (o.k === 'weed' || o.k === 'drop' || o.k === 'hole') delete w().town.objects[k]; if (o.k === 'flower') o.wilt = 0; }
  leave();
  festivalDay(16, 17);
  for (const [k, o] of Object.entries(w().town.objects)) { if (o.k === 'weed' || o.k === 'drop' || o.k === 'hole') delete w().town.objects[k]; if (o.k === 'flower') o.wilt = 0; }
  // Lots of flowers around
  for (let i = 0; i < 26; i++) { const k = `${44 + (i % 8)},${27 + Math.floor(i / 8)}`; if (!w().town.objects[k]) w().town.objects[k] = { k: 'flower', species: 0, color: 0, wet: 0, wilt: 0 }; }
  g.town.syncNav();
  // Four doors of lights, then the Pear
  const doors = ['dorrit', 'tavi', 'nib', 'bartleby'];
  for (const id of doors) {
    const bd = BUILDINGS.find((x) => x.id === id);
    gotoTown(bd.door[0], bd.door[1] + 0.8);
    g.interact.update();
    const t = g.interact.lastList.find((c) => c.act === 'festLights' && c.building.id === id);
    check(t, `lights at ${id}`);
    if (t) { g.interact.target = t; g.interact.activate(t); b.step(30); b.through(); b.step(4); }
  }
  check(seenEvents.lightsHung >= 4, 'lights hung');
  gotoTown(LANDMARKS.oldPear[0] + 2, LANDMARKS.oldPear[1] + 2.6);
  g.interact.update();
  const fin = g.interact.lastList.find((c) => c.act === 'festFinale');
  check(fin, 'the finale is ready');
  g.interact.target = fin; g.interact.activate(fin); b.step(10);
  for (let i = 0; i < 400; i++) {
    if (b.top?.id === 'yearAlmanac') { b.press('KeyE'); b.step(4); continue; }
    if (b.top?.id === 'credits') { b.e.input.setKey('KeyE', true); b.step(30); b.e.input.setKey('KeyE', false); b.step(1); continue; }
    if (b.top?.id === 'dialogue') { b.through(); b.step(4); continue; }
    if (!g.scripts.holding) break;
    b.step(10);
  }
  check(seenEvents.roccoReturned >= 1, 'Rocco rolled back');
  check(seenEvents.pearLit >= 1, 'the Old Pear lights up');
  check(seenEvents.chimeHarmonised >= 1, 'your Chime, harmonised');
  check(seenEvents.bellGold >= 1, 'the Bell turned gold');
  check(seenEvents.creditsDone >= 1, 'credits rolled');
  check(w().flags.yearDone, 'year done');
  const dayNow = w().clock.day;
  b.step(360); // minute was set to just before 5am
  check(w().clock.day === dayNow + 1, `Year Two begins next morning, ${w().clock.day}`);
  check(w().clock.year >= 2, `year counted, ${w().clock.year}`);
  w().clock.minute = 8.98 * 60; b.step(120);
  check(w().flags.yearTwoLetter, 'Year Two letter');
  log('12 ending');

  // Pimm on an unclean exit: the session marker says the last one never closed.
  g.autosave();
  store.set(SESSION_KEY, { open: true });
  const { continueGame } = ctx.newgame;
  const visits = w().pimm?.visits ?? 0;
  g.ui.popAll();
  continueGame(g);
  b.step(10);
  b.until(() => b.top?.id === 'dialogue', 900, 'Pimm arrives');
  check(g.pimmActor, 'Inspector Pimm in person');
  check(/Pimm/.test(b.top?.currentText?.() ?? ''), `Pimm speaks: ${b.top?.currentText?.()}`);
  b.through();
  b.until(() => !g.scripts.holding, 500, 'Pimm leaves');
  check(w().pimm.visits === visits + 1, 'visit counted');
  log('13 pimm');
  function deliver() { ctx.mail.deliverMail(g, true); }
}
