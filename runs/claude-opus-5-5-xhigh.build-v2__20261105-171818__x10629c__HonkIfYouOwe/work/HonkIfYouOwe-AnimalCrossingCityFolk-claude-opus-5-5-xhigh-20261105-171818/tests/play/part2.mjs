// Milestones 3–6: catches and memory, the small verbs, museum wings, debt tiers and home.
import { ITEMS } from '../../src/data/items.js';
import { BUILDINGS, LANDMARKS } from '../../src/data/town.js';
import { HOME_SIZES } from '../../src/world/home.js';
import { memoryLine } from '../../src/systems/memory.js';
import { FISH } from '../../src/data/fish.js';
import { BUGS } from '../../src/data/bugs.js';
import { FOSSILS } from '../../src/data/fossils.js';
import { ART } from '../../src/data/art.js';
import { THREE } from '../../src/engine.js';
import { CONSTELLATIONS } from '../../src/systems/stargaze.js';

export function part2(ctx, log = () => {}) {
  const { b, g, seenEvents, helpers: H } = ctx;
  const { w, check, hasItem, give, clearPockets, enter, leave, useTool, nextDay, gotoTown, talkNpc, fishAt } = H;
  // Bed, for real, from your shack (Gran's reply and a neighbour's letter next morning)
  leave();
  enter('home');
  check(g.place.key === 'main', 'home room');
  g.place.rebuild();
  const homeDo = (func) => { g.interact.update(); const t = g.interact.lastList.find((c) => c.act === 'furniture' && c.furn.it.func === func); if (!check(t, `furniture ${func}`)) return null; b.walkTo(Math.min(t.x, g.place.w - 1), Math.min(t.z + t.furn.d / 2 + 0.6, g.place.d - 1), { stop: 0.3 }); b.face(t.x, t.z); g.interact.update(); const t2 = g.interact.lastList.find((c) => c.act === 'furniture' && c.furn.it.func === func); g.interact.target = t2; g.interact.activate(t2); b.step(3); return t2; };
  homeDo('bed');
  check(b.top?.id === 'bed', `bed menu, on ${b.top?.id}`);
  const beforeDay = w().clock.day;
  b.menu('Sleep till morning');
  b.step(70);
  b.until(() => !g.scripts.holding, 600, 'sleep');
  check(w().clock.day === beforeDay + 1, 'slept to next day');
  check(w().clock.minute >= 8 * 60, 'woke at 8');
  // reach 9am for the mail, in a real clock tick
  w().clock.minute = 8.98 * 60; b.step(120);
  check(w().mail.inbox.some((l) => l.from === 'gran'), "Gran's reply arrived");
  check(w().mail.inbox.some((l) => l.from === 'tavi'), "A neighbour's letter arrived");
  leave();
  // Read the mail
  const [mx, mz] = LANDMARKS.mailbox;
  b.use(mx, mz, { act: 'mailbox' });
  b.step(4);
  check(b.top?.id === 'mailbox', `mailbox opens, ${b.top?.id}`);
  const unread = w().mail.inbox.filter((l) => !l.read).length;
  for (let i = 0; i < unread + 3; i++) { if (b.top?.id !== 'mailbox') break; if (!b.top.items.some((it) => (typeof it.label === 'function' ? it.label(g) : it.label).startsWith('*'))) break; b.menu('* '); b.step(3); check(b.top?.id === 'letterRead', 'letter opens'); b.press('KeyE'); b.step(3); }
  check(w().mail.inbox.every((l) => l.read), 'all read');
  check(hasItem('fig'), "took Gran's fig");
  b.press('Escape');
  b.step(4);
  log('2b bed and mail');

  // ---- 3. Fish, bug, fossil; sell a fish; memory; a neighbour references it ------------------------
  clearPockets();
  give('unknownFossil');
  fishAt();
  check(w().stats.fish >= 1, 'another fish');
  const fishSlot = w().player.pockets.find((s) => s && ITEMS[s.id]?.cat === 'fish');
  if (!fishSlot) give('perch');
  const fishId = (w().player.pockets.find((s) => s && ITEMS[s.id]?.cat === 'fish')).id;
  const before = w().player.beans;
  enter('store');
  b.walkTo(8.6, 3.6, { stop: 0.3 }); b.face(8.6, 2); g.interact.update();
  b.press('KeyE'); b.step(3);
  b.through(['Sell']); b.step(10); b.through();
  b.until(() => b.top?.id === 'pocketPick', 400, 'sell grid');
  b.pick(fishId);
  b.through(['Sell it']); b.step(4);
  check(w().player.beans > before, 'fish sold for beans');
  check(w().stats.sold[fishId] === 1, 'sold stat');
  if (b.top?.id === 'pocketPick') b.press('Escape');
  b.step(4);
  b.through(['Goodbye']); b.step(4);
  leave();
  // Memory: the village heard
  g.world.memory.push({ k: 'catch', day: w().clock.day, heard: [], catch: 'Pike' });
  const line = memoryLine(g, 'yolanda');
  check(line && /pike/i.test(line.text), `memory line references the catch: ${line?.text}`);
  log('3 catches');

  // ---- 4. Tree, sapling, flower, hybrid, weed, balloon, wasp and cure, beanstalk, wish -------------
  clearPockets();
  const treeKey = Object.keys(w().town.objects).find((k) => { const o = w().town.objects[k]; return o.k === 'tree' && o.kind === 'pear' && o.fruit > 0 && !o.wasp; });
  const [tx, tz] = treeKey.split(',').map(Number);
  const objsBefore = Object.keys(w().town.objects).length;
  b.use(tx + 0.5, tz + 0.5, { act: 'shakeTree' });
  b.step(40);
  check(seenEvents.shake >= 1, 'shook a tree');
  check(Object.keys(w().town.objects).length > objsBefore, 'fruit fell');
  check(w().town.objects[treeKey].fruit === 0, 'tree picked clean');
  // pick up a pear
  const dropKey = Object.keys(w().town.objects).find((k) => w().town.objects[k].k === 'drop' && w().town.objects[k].item === 'pear');
  const [dx, dz] = dropKey.split(',').map(Number);
  b.use(dx + 0.5, dz + 0.5, { act: 'pickObject' });
  b.step(30);
  check(hasItem('pear'), 'picked up a pear');
  // fruit regrows after tuning days: verified below by nextDay
  // Sapling planted
  give('sapling');
  gotoTown(47.5, 33.5);
  b.step(3);
  const plantFrom = (id) => { b.press('Tab'); b.step(3); check(b.top?.id === 'pockets', 'pockets open'); const i = w().player.pockets.findIndex((s) => s?.id === id); while (b.top.focus !== i) b.press('ArrowRight'); b.press('KeyE'); b.step(3); b.menu('Plant'); b.step(4); };
  plantFrom('sapling');
  check(seenEvents.planted >= 1, 'sapling planted');
  // Flowers: two touching, watered, hybrids at 100%
  give('seedTulip'); give('seedTulip');
  const startX = 48, startZ = 30;
  gotoTown(startX + 0.5, startZ + 0.5);
  g.player.facing = Math.PI / 2; b.step(2);
  plantFrom('seedTulip');
  gotoTown(startX + 1.5, startZ + 0.5);
  g.player.facing = Math.PI / 2; b.step(2);
  plantFrom('seedTulip');
  const flowers = Object.entries(w().town.objects).filter(([k, o]) => o.k === 'flower' && Math.abs(Number(k.split(',')[0]) - (startX + 1)) < 3 && Math.abs(Number(k.split(',')[1]) - startZ) < 2);
  check(flowers.length >= 2, `two flowers planted, ${flowers.length}`);
  g.handle().tuning.hybridChance = 1;
  const { grantTool, equip } = ctx.tools;
  equip(g, 'can');
  const fk = flowers[0][0].split(',').map(Number);
  gotoTown(fk[0] + 0.5, fk[1] + 1.6);
  b.face(fk[0] + 0.5, fk[1] + 0.5);
  useTool();
  b.step(50);
  check(seenEvents.watered >= 1, 'watered flowers');
  check(flowers.every(([, o]) => o.wet === w().clock.day), 'neighbours watered too');
  const hybridsBefore = w().stats.hybrids ?? 0;
  nextDay();
  check((w().stats.hybrids ?? 0) > hybridsBefore, 'hybrid formed');
  g.handle().tuning.hybridChance = 0.15;
  // Weed pulled
  const weedK = Object.keys(w().town.objects).find((k) => w().town.objects[k].k === 'weed');
  const [wx, wz] = weedK.split(',').map(Number);
  gotoTown(wx + 0.5, wz + 1.6);
  b.face(wx + 0.5, wz + 0.5);
  g.interact.update();
  check(g.interact.target?.act === 'pullWeed', `weed target ${g.interact.target?.act}`);
  const weedsPulled = w().stats.weeds;
  b.press('KeyE'); b.step(30);
  check(w().stats.weeds === weedsPulled + 1, 'weed pulled');
  // Balloon shot
  equip(g, 'slingshot');
  gotoTown(30, 28);
  const bl = g.life.launchBalloon({ z: 28, gift: 'bagOfBeans' });
  bl.x = 30;
  g.player.facing = 0;
  b.step(30);
  useTool();
  b.step(80);
  check(seenEvents.balloonPopped >= 1, 'balloon popped');
  const giftKey = Object.keys(w().town.objects).find((k) => w().town.objects[k].k === 'drop' && w().town.objects[k].item === 'bagOfBeans');
  check(giftKey, 'gift fell somewhere');
  // Wasp sting and cure
  equip(g, null);
  gotoTown(30, 28);
  g.life.startWasps(g.player.x + 1, g.player.z);
  b.until(() => w().player.puffy, 300, 'stung');
  check(seenEvents.sting >= 1, 'sting event');
  b.step(40);
  give('medicine');
  b.press('Tab'); b.step(3);
  { const i = w().player.pockets.findIndex((s) => s?.id === 'medicine'); while (b.top.focus !== i) b.press('ArrowRight'); b.press('KeyE'); b.step(3); b.menu('Take it'); b.step(4); }
  check(!w().player.puffy, 'medicine cured');
  // Bag buried, beanstalk tripled
  equip(g, 'shovel');
  clearPockets();
  give('bagOfBeans');
  gotoTown(48.5, 33.5);
  g.player.facing = Math.PI; b.step(2);
  b.step(1);
  g.interact.update();
  useTool();
  b.step(40);
  check(Object.values(w().town.objects).some((o) => o.k === 'hole'), 'dug a hole');
  const hole = Object.keys(w().town.objects).find((k) => w().town.objects[k].k === 'hole' && Math.hypot(Number(k.split(',')[0]) - g.player.x, Number(k.split(',')[1]) - g.player.z) < 3);
  check(hole, 'hole nearby');
  const [hx, hz] = hole.split(',').map(Number);
  b.face(hx + 0.5, hz + 0.5);
  g.interact.update();
  const buryT = g.interact.lastList.find((c) => c.act === 'bury');
  check(buryT, 'bury target');
  g.interact.target = buryT; g.interact.activate(buryT); b.step(3);
  b.pick('bagOfBeans');
  b.step(6);
  b.through();
  check(w().town.objects[hole]?.k === 'beanstalk', 'beanstalk planted');
  nextDay(); nextDay();
  check((w().town.objects[hole]?.stage ?? 0) >= 2, 'beanstalk grown after two days');
  const bb = w().player.beans;
  gotoTown(hx + 0.5, hz + 1.6);
  b.face(hx + 0.5, hz + 0.5);
  g.interact.update();
  check(g.interact.target?.act === 'harvestStalk', `harvest target ${g.interact.target?.act}`);
  b.press('KeyE'); b.step(30); b.through();
  check(w().player.beans === bb + 3000, `tripled: ${w().player.beans - bb}`);
  // Regrow check on the tree
  check(w().town.objects[treeKey]?.fruit > 0, 'fruit regrew');
  // Shooting star: night at the Lookout
  equip(g, null);
  w().clock.minute = 22 * 60;
  g.weatherKey = null; g.lastHour = -1; g.sky.placeChanged(); b.step(3);
  const [lx, lz] = LANDMARKS.lookoutBench;
  gotoTown(lx, lz + 1.2);
  b.face(lx, lz);
  g.interact.update();
  check(g.interact.target?.act === 'lookoutBench', `bench target ${g.interact.target?.act}`);
  b.press('KeyE'); b.step(40);
  check(b.top?.id === 'stargaze', `stargazing, ${b.top?.id}`);
  const sky = b.top;
  check(g.ctx.camera.preset === 'fixed', `the glide flies a fixed camera, ${g.ctx.camera.preset}`);
  check(g.player.sitting && Math.abs(g.player.x - lx) < 1, 'sitting on the bench for the glide');
  check(sky.glide && sky.rise > 0 && sky.rise < 1, `mid glide, the sky is part way down, ${sky.rise}`);
  const midY = g.ctx.camera.camera.position.y;
  check(midY > sky.ground.position[1] && midY < sky.sky.position[1], 'mid glide, the camera is part way up');
  const midDir = g.ctx.camera.camera.getWorldDirection(new THREE.Vector3()).y;
  b.until(() => !sky.glide, 300, 'the glide reaches the sky');
  check(sky.rise === 1, `the sky covers the screen, ${sky.rise}`);
  check(Math.abs(g.ctx.camera.camera.position.y - sky.sky.position[1]) < 1e-3, 'the camera arrives at the top');
  g.ctx.camera.camera.updateMatrixWorld();
  check(g.ctx.camera.camera.getWorldDirection(new THREE.Vector3()).y > midDir, 'the camera tips up as it rises');
  b.until(() => b.top?.shooter, 900, 'a shooting star');
  b.press('KeyE');
  check(seenEvents.wished >= 1, 'wished');
  b.press('KeyD'); b.press('KeyE');
  check(Object.keys(w().almanac.stars).length >= 1, 'a constellation marked');
  b.press('Escape'); b.step(4);
  check(sky.glide && b.top === sky, 'standing up glides back down first');
  b.until(() => !g.scripts.holding, 240);
  check(g.ctx.camera.preset === 'iso' && !g.fixedCam && !g.hideHud, 'the usual view and HUD come back');
  check(!g.player.sitting, 'stood up from the bench');
  // A press skips the glide; the press that sat you down doesn't.
  gotoTown(lx, lz + 1.2); b.face(lx, lz); g.interact.update();
  b.press('KeyE');
  check(b.top?.id === 'stargaze' && b.top.glide, 'the opening press does not skip the glide');
  b.step(30); b.press('KeyE');
  check(b.top?.id === 'stargaze' && !b.top.glide && b.top.rise === 1, 'a later press skips to the sky');
  // Thrown out mid-glide (a Visit arriving, say): nothing is left flying the camera.
  g.ui.popAll(); b.step(3);
  check(g.ctx.camera.preset === 'iso' && !g.fixedCam && !g.hideHud && !g.scripts.holding, 'losing the screen ends the scene cleanly');
  // Naming in the Almanac
  const starId = Object.keys(w().almanac.stars)[0];
  const starIdx = CONSTELLATIONS.findIndex((c) => c.id === starId);
  const unknownIdx = CONSTELLATIONS.findIndex((c) => !w().almanac.stars[c.id]);
  b.press('KeyJ'); b.step(3);
  for (let i = 0; i < 4; i++) b.press('KeyR');
  check(b.top?.id === 'almanac' && b.top.tab === 4, `Almanac on the Stars page, ${b.top?.tab}`);
  const book = b.top;
  while (book.focus !== unknownIdx) b.press('ArrowRight');
  check(!g.ui.model().prompts.includes('Name it'), 'no naming a constellation you have not found');
  b.press('KeyE');
  check(b.top === book, 'an unfound constellation will not take a name');
  while (book.focus !== starIdx) b.press('ArrowRight');
  check(g.ui.model().prompts.includes('Name it'), 'found constellations offer Name it');
  const given = CONSTELLATIONS[starIdx].name;
  check(book.entries(g)[starIdx].name === given, 'it starts with the name people call it');
  b.press('KeyE'); b.step(2);
  check(b.top?.id === 'keyboard', `naming opens the keyboard, ${b.top?.id}`);
  b.press('Escape'); b.step(2);
  check(b.top === book && book.entries(g)[starIdx].name === given, 'backing out keeps the name');
  b.press('KeyE'); b.step(2);
  for (const ch of 'Big Regret') b.e.input.send({ t: 'key', key: ch });
  b.step(3); b.e.input.send({ t: 'key', key: 'Enter' }); b.step(3);
  check(b.top === book, 'back on the Almanac page');
  check(book.entries(g)[starIdx].name === 'Big Regret', 'the Almanac shows the new name');
  check(w().almanac.starNames[starId] === 'Big Regret', 'the name goes in the save');
  check(JSON.parse(JSON.stringify(w())).almanac.starNames[starId] === 'Big Regret', 'the name survives a save round trip');
  b.press('KeyE'); b.step(2);
  b.press('KeyT'); b.step(2);
  b.e.input.setKey('Tab', true); b.step(2); b.e.input.setKey('Tab', false); b.step(2);
  check(CONSTELLATIONS[starIdx].suggest.includes(b.top?.value), `the keyboard suggests a name, ${b.top?.value}`);
  b.press('Escape'); b.step(2);
  b.press('Escape'); b.step(3);
  check(!g.ui.has('almanac'), 'Almanac closed');
  const wishMail = () => w().mail.pending.some((l) => l.from === 'wish') || w().mail.inbox.some((l) => l.from === 'wish');
  check(wishMail(), 'wish reply in the post');
  log('4 verbs');

  // ---- 5. Museum donations appear in each wing; Almanac updates --------------------------------------
  clearPockets();
  give('perch'); give('moth'); give('moatSkull'); give('monaLlama');
  w().clock.minute = 12 * 60; g.weatherKey = null; g.lastHour = -1; g.sky.placeChanged();
  enter('museum');
  const donate = (id, wing) => {
    b.walkTo(6, 3.4, { stop: 0.5 }); b.face(6, 2.4); g.interact.update();
    const t = g.interact.lastList.find((c) => c.act === 'quillDesk');
    g.interact.target = t; g.interact.activate(t); b.step(3);
    b.through(['Donate']); b.step(6);
    b.until(() => b.top?.id === 'pocketPick', 240, 'donate grid');
    b.pick(id); b.step(6); b.through(); b.step(6);
    b.through(['Goodbye']); b.step(6);
    check(w().museum[wing][id], `${id} in the ${wing} wing`);
  };
  donate('perch', 'fish'); donate('moth', 'bug'); donate('moatSkull', 'fossil'); donate('monaLlama', 'art');
  const wingIds = { fish: 'museum_fish', bug: 'museum_bug', fossil: 'museum_fossil', art: 'museum_art' };
  for (const [wing, room] of Object.entries(wingIds)) {
    const hall = g.place;
    const r = g.rooms.get(room);
    g.swapPlace(r, 6, 7, Math.PI);
    b.step(2);
    check(r.dyn.children.length > 0, `${wing} wing has displays`);
    const shown = r.dynInteract.filter((d) => d.act === 'museumLook' && d.label.startsWith('Look at')).length;
    check(shown === 1, `one donation visible in ${wing}, ${shown}`);
    g.swapPlace(hall, 6, 5, Math.PI);
    b.step(1);
  }
  check(w().almanac.art.monaLlama, 'Almanac records art');
  check(Object.keys(w().almanac.fish).length >= 1, 'Almanac records fish');
  // appraise a fossil
  give('unknownFossil');
  b.walkTo(6, 3.4, { stop: 0.5 }); b.face(6, 2.4); g.interact.update();
  { const t = g.interact.lastList.find((c) => c.act === 'quillDesk'); g.interact.target = t; g.interact.activate(t); b.step(3); }
  b.through(['Appraise']); b.step(6); b.through(); b.step(6); b.through(['Goodbye']); b.step(6);
  check(!hasItem('unknownFossil') && seenEvents.appraised >= 1, 'fossil appraised');
  leave();
  // Almanac and map screens from the world
  b.press('KeyJ'); b.step(3); check(b.top?.id === 'almanac', 'almanac opens'); b.press('KeyR'); b.press('KeyR'); b.press('Escape'); b.step(3);
  b.press('KeyM'); b.step(3); check(b.top?.id === 'map', 'map opens'); b.press('ArrowRight'); b.press('Escape'); b.step(3);
  b.press('KeyG'); b.step(3); check(b.top?.id === 'emote', 'emote wheel'); while (b.top.focus !== 7 && w().player.emotes.includes('dance')) b.press('ArrowRight'); b.press('Escape'); b.step(3);
  log('5 museum');

  // ---- 6. Debt tiers, home, placement, wallpaper, lamp, stereo, mirror, TV, Bureau by mail ------------
  const payOff = () => {
    enter('store');
    b.walkTo(8.6, 3.6, { stop: 0.3 }); b.face(8.6, 2); g.interact.update();
    b.press('KeyE'); b.step(3);
    b.through(['Pay the debt']); b.step(6); b.through();
    b.until(() => b.top?.id === 'number', 300, 'pay number');
    b.press('PadSquare'); // all of it
    check(b.top.value === Math.min(w().player.beans, w().player.debt), 'all of it');
    b.press('KeyE'); b.step(6);
    check(w().player.debt === 0, `debt cleared, ${w().player.debt}`);
    b.through(['Sign for the next house', 'Sign', 'Goodbye']);
    b.step(6);
  };
  for (const tier of [2, 3, 4]) {
    w().player.beans = 400000;
    payOff();
    check(w().player.homeTier === tier, `tier ${tier}, got ${w().player.homeTier}`);
    check(w().player.debt > 0, 'new debt');
    b.through(['Goodbye']); b.step(6);
    leave();
  }
  // last tier cleared: the deed
  w().player.beans = 400000;
  enter('store');
  b.walkTo(8.6, 3.6, { stop: 0.3 }); b.face(8.6, 2); g.interact.update();
  b.press('KeyE'); b.step(3);
  b.through(['Pay the debt']); b.step(6); b.through();
  b.until(() => b.top?.id === 'number', 300, 'pay number');
  b.press('PadSquare'); b.press('KeyE'); b.step(6); b.through(); b.step(6);
  check(w().player.debt === 0, 'all debt cleared');
  check(w().home.deedGold, 'gold-edged deed');
  b.through(['Goodbye']); b.step(6);
  leave();
  // Home interiors by tier
  enter('home');
  check(g.place.w === HOME_SIZES[4].main[0], 'main room grew');
  // Placement mode: a lamp, a stereo, a mirror, a tv, a seat, a rug and table, a plant
  clearPockets();
  const placeAt = (id, x, z) => {
    give(id);
    b.press('Tab'); b.step(3);
    const i = w().player.pockets.findIndex((s) => s?.id === id);
    while (b.top.focus !== i) b.press('ArrowRight');
    b.press('KeyE'); b.step(3);
    b.menu('Place here'); b.step(5);
    check(b.top?.id === 'placement', `placement open, ${b.top?.id}`);
    const pl = b.top;
    while (pl.cx !== x) b.press(pl.cx < x ? 'ArrowRight' : 'ArrowLeft');
    while (pl.cz !== z) b.press(pl.cz < z ? 'ArrowDown' : 'ArrowUp');
    b.press('KeyE'); b.step(3);
    check(w().home.rooms.main.items.some((o) => o.id === id && o.x === x && o.z === z), `${id} placed at ${x},${z}`);
    b.press('Escape'); b.step(5);
  };
  // move out of the way of the door
  placeAt('cottageLamp', 3, 1);
  placeAt('cottageChair', 4, 1);
  placeAt('stereo', 5, 1);
  placeAt('tv', 6, 3);
  placeAt('mirror', 0, 3);
  placeAt('cottageRug', 2, 3);
  placeAt('cottageTable', 2, 3);
  placeAt('pottedPlant', 7, 5);
  placeAt('toilet', 0, 7);
  placeAt('fishTank', 6, 6);
  // can't block the door
  give('cottageSide');
  b.press('Tab'); b.step(3);
  { const i = w().player.pockets.findIndex((s) => s?.id === 'cottageSide'); while (b.top.focus !== i) b.press('ArrowRight'); b.press('KeyE'); b.step(3); b.menu('Place here'); b.step(5); const pl = b.top; while (pl.cx !== 4) b.press(pl.cx < 4 ? 'ArrowRight' : 'ArrowLeft'); while (pl.cz !== 7) b.press('ArrowDown'); b.press('KeyE'); b.step(3); check(!w().home.rooms.main.items.some((o) => o.id === 'cottageSide' && o.z === 7), "can't block the door"); b.press('Escape'); b.step(5); }
  // Wallpaper
  give('wall-mint');
  b.press('Tab'); b.step(3);
  { const i = w().player.pockets.findIndex((s) => s?.id === 'wall-mint'); while (b.top.focus !== i) b.press('ArrowRight'); b.press('KeyE'); b.step(3); b.menu('Hang here'); b.step(4); }
  check(w().home.rooms.main.wall === 'wall-mint', 'wallpaper applied');
  // Lamp off and on
  g.place.rebuild();
  homeDo('lamp'); b.until(() => !g.scripts.holding, 120);
  check(seenEvents.lamp >= 1, 'lamp toggled');
  // Mirror opens the wardrobe
  homeDo('mirror'); b.step(4);
  check(b.top?.id === 'lookEditor', `mirror, ${b.top?.id}`);
  b.press('ArrowRight'); b.press('Escape'); b.step(6);
  check(seenEvents.mirror >= 1, 'mirror used');
  // TV feed
  homeDo('tv'); b.step(4); b.through();
  check(seenEvents.watchedTV >= 1, 'watched the plaza');
  // Toilet flushes pointlessly
  homeDo('toilet'); b.step(4); b.through();
  check(seenEvents.flushed >= 1, 'flushed');
  // Fish tank
  give('perch');
  homeDo('tank'); b.step(4); b.pick('perch'); b.step(4);
  check(w().home.tankFish.perch, 'fish in the tank');
  // Annex and upstairs doors
  g.interact.update();
  const annex = g.interact.lastList.find((c) => c.id === 'toAnnex');
  check(annex, 'annex door at tier 3+');
  g.interact.target = annex; g.interact.activate(annex); b.until(() => !g.inTransition && !g.scripts.holding, 300);
  check(g.place.id === 'home_annex', `annex, ${g.place.id}`);
  leave();
  check(g.place.id === 'home', 'annex exit leads home');
  const up = (g.interact.update(), g.interact.lastList.find((c) => c.id === 'toUp'));
  check(up, 'stairs at tier 4');
  g.interact.target = up; g.interact.activate(up); b.until(() => !g.inTransition && !g.scripts.holding, 300);
  check(g.place.id === 'home_upstairs', `upstairs, ${g.place.id}`);
  leave();
  check(g.place.id === 'home', 'upstairs exit leads home');
  // Bureau: scored on Show Day nights, by mail, with a reward
  const showDayAhead = () => { let d = w().clock.day; while (true) { d++; if ((d - 1) % 4 === 2) return d; } };
  nextDay(showDayAhead());
  check(w().home.lastGrade, 'Bureau graded the home');
  w().clock.minute = 9.02 * 60; b.step(4);
  const { deliverMail } = ctx.mail;
  deliverMail(g, true);
  check(w().mail.inbox.some((l) => l.from === 'bureau'), 'Bureau result by mail');
  log('6 home');
}
