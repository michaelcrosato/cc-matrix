// The scripted playthrough: real mechanics early, story beats jumped where repetition adds nothing, real siege and bosses.
import { boot } from '../lib/helpers.mjs';
export default async function () {
  const H = boot(), { DQ, game, I, T, cellC, check, tick } = H; const S0 = () => DQ.S;
  H.newGame(); let S = DQ.S, h = S.hero;
  check('new game starts in play', game.sceneName === 'play');
  check('first quest running', S.quests.stitch === 0);
  // --- break and place through real input
  DQ.inv.add('felt', 6, true); S.hotbar[S.sel] = 'felt'; h.facing = 0; const [hx, hy] = H.here();
  I.tap('place'); tick(.3); check('place puts a block down', S.stats.placed === 1 && S.world.height(hx + 1, hy) === 1, JSON.stringify(S.stats));
  for (let i = 0; i < 6 && S.stats.broken < 1; i++) { I.tap('attack'); tick(.5); }
  check('swing breaks the block', S.stats.broken === 1);
  tick(2); check('drop is picked up', DQ.inv.count('felt') === 6);
  DQ.breakAt(hx + 1, hy); for (let i = 0; i < 3; i++) { H.place(hx + 1, hy + 1, 'felt'); DQ.breakAt(hx + 1, hy + 1); DQ.breakAt(hx + 1, hy + 1); }
  H.place(hx + 2, hy, 'felt'); H.place(hx + 2, hy, 'felt'); tick(.2); DQ.questTick(); tick(.2);
  check('First Stitches completes', DQ.questDone('stitch'), JSON.stringify(S.quests)); H.skipTalk(); tick(.5);
  check('Granny offers the notion quest', S.quests.gather === 0, JSON.stringify(S.quests));
  // --- notions and crafting through the pocket
  DQ.inv.add('branch', 12, true); DQ.inv.add('cotton', 6, true); DQ.inv.add('straw', 4, true); DQ.inv.add('cobble', 10, true); tick(.1); DQ.questTick(); tick(.2);
  check('picking up branch gives a notion (plank)', S.known.plank === 1);
  check('picking up cotton gives a notion (wool block)', S.known.woolblock === 1);
  check('torch notion from the start', S.known.torch === 1);
  DQ.craft(DQ.recipeFor('torch')); DQ.craft(DQ.recipeFor('woolblock')); DQ.craft(DQ.recipeFor('plank'), 4); DQ.craft(DQ.recipeFor('door')); DQ.craft(DQ.recipeFor('workbench')); tick(.3); DQ.questTick();
  check('crafting works', DQ.inv.count('torch') === 2 && DQ.inv.count('door') === 1 && DQ.inv.count('workbench') === 1, JSON.stringify(S.bag));
  H.skipTalk(); tick(.5);
  check('Thimbleton quest begins, banner given', S.quests.thimbleton === 0 && DQ.inv.count('banner') === 1, JSON.stringify(S.quests));
  // --- plant the banner
  H.tp(DQ.POI.banner[0], DQ.POI.banner[1] + 2); tick(.5); DQ.questTick();
  S.hotbar[S.sel] = 'banner'; DQ.placeAction(); H.skipTalk(); tick(1);
  check('banner planted', S.town.planted && S.world.list.some(o => o.type === 'banner'));
  H.skipTalk(); tick(1); H.skipTalk();
  check('Wren arrives', S.residents.some(r => r.id === 'wren'), JSON.stringify(S.flags));
  // --- bedroom with a door, a torch and a bed
  const bx = 41, by = 52; H.tp(bx + 2, by + 6); DQ.inv.add('plank', 20, true); DQ.inv.add('woolblock', 4, true);
  H.wall(bx, by, 5, 2, [2, 4]); tick(.3);
  check('walls built 2 high', S.world.height(bx, by) === 2 && S.world.height(bx + 2, by + 4) === 0);
  check('no room without door/light', S.town.rooms.length === 0);
  H.place(bx + 2, by + 4, 'door'); H.place(bx + 1, by + 1, 'torch'); tick(.6);
  check('a room needs a bed to be a Bedroom (door+light = Snug)', S.town.rooms.length === 1 && S.town.rooms[0].type === 'Snug', JSON.stringify(S.town.rooms.map(r => r.type)));
  // workbench near, craft bed, place it
  H.tp(bx + 2, by + 2); H.place(bx + 3, by + 3, 'workbench'); tick(.2);
  check('station is detected nearby', !!DQ.stationNear('workbench'));
  DQ.learn(DQ.recipeFor('bed'), 'test'); DQ.craft(DQ.recipeFor('bed')); check('bed crafted at the bench', DQ.inv.count('bed') === 1, JSON.stringify(S.bag));
  H.place(bx + 3, by + 1, 'bed'); tick(.8);
  check('Bedroom forms', DQ.roomCount('Bedroom') === 1, JSON.stringify(S.town.rooms.map(r => r.type)));
  check('cheer awarded', S.town.cheer >= 25, S.town.cheer);
  DQ.questTick(); tick(.5);
  // Wren's quest: talk -> accept -> ready -> turn in
  const wren = S.residents.find(r => r.id === 'wren'); H.tp(Math.floor(wren.x / T), Math.floor(wren.y / T) + 1); tick(.2);
  H.skipTalk(); tick(1); H.skipTalk(); DQ.talkTo(wren); H.skipTalk(); tick(.3); check('Wren request accepted', typeof S.quests.wrenbed === 'number', JSON.stringify(S.quests));
  DQ.questTick(); tick(.3); check('quest ready to turn in', S.ready && S.ready.wrenbed, JSON.stringify(S.ready));
  H.skipTalk(); DQ.talkTo(wren); H.skipTalk(); tick(.3); check("Wren's Bed done", DQ.questDone('wrenbed'));
  // night: sleep in the bed
  S.clock.hour = 20; tick(.2); H.tp(bx + 2, by + 2);
  const bed = S.world.list.find(o => o.type === 'bed'); DQ.trySleep(bed); H.skipTalk(200); tick(3); H.skipTalk();
  check('sleeping skips the night', S.clock.hour >= 5.9 && S.clock.hour < 8, S.clock.hour);
  // --- dev beats for the middle of the story, then real combat
  DQ.devBeat('siege'); H.skipTalk(); tick(1); H.skipTalk(); tick(1); H.skipTalk(); tick(.5);
  check('residents moved in', S.residents.length >= 4, S.residents.map(r => r.id).join());
  check('seam ripper in the bag', DQ.inv.count('ripper') === 1);
  // tier gating
  H.tp(53, 38); const k = DQ.blockId('knot'); S.world.setColumn(55, 38, [k, k]); h.facing = 0; DQ.inv.add('stick', 1, true); S.equip.weapon = 'stick'; const rip = S.bag.ripper; delete S.bag.ripper; DQ.inv.equipBest();
  DQ.breakAt(55, 38); check('stick cannot cut a Black Knot', S.world.height(55, 38) === 2); S.bag.ripper = rip; DQ.inv.equipBest();
  for (let i = 0; i < 6; i++) DQ.breakAt(55, 38); check('Seam Ripper cuts a Black Knot', S.world.height(55, 38) < 2, S.world.height(55, 38));
  // combat: monsters
  H.tp(50, 40); const m = DQ.spawnMonster('lintling', cellC(52), cellC(40)); S.hero.facing = 0; DQ.god = false; h.hp = h.maxHp;
  for (let i = 0; i < 40 && m.hp > 0; i++) { h.facing = Math.atan2(m.y - h.y, m.x - h.x); I.tap('attack'); tick(.45); }
  check('hero can kill a Lintling', m.hp <= 0, m.hp);
  // KO and respawn with lost bundle
  tick(1.2); S.bag.cobble = 20; h.hp = 1; DQ.hurtHero(30, h.x + 5, h.y); tick(2.5); check('KO respawns at the banner with full HP', h.hp === h.maxHp && !h.dead, h.hp);
  check('a Lost Bundle holds half the cobble', S.bundle && S.bundle.items.cobble >= 10, JSON.stringify(S.bundle));
  // --- Sir Buttonsworth
  S.quests.buttons = 0; H.tp(DQ.POI.arena[0], DQ.POI.arena[1] + 5); DQ.startCutscene('buttons'); H.skipTalk(); tick(.5);
  const bm = S.boss; check('Sir Buttonsworth appears', !!bm);
  DQ.god = true; let slams = 0, charges = 0, volleys = 0;
  for (let i = 0; i < 1800 && bm.hp > 0; i++) { tick(.1); if (bm.atkName === 'slam' && bm.state === 'windup') slams++; if (bm.atkName === 'charge') charges++; if (bm.atkName === 'volley') volleys++; h.facing = Math.atan2(bm.y - h.y, bm.x - h.x); if (Math.hypot(bm.x - h.x, bm.y - h.y) > 24) { const a = h.facing; h.x += Math.cos(a) * 6; h.y += Math.sin(a) * 6; } I.tap('attack'); }
  check('boss shows his moves', slams + charges + volleys > 3, slams + '/' + charges + '/' + volleys);
  check('Sir Buttonsworth is defeated', bm.hp <= 0 && S.flags.boss_buttons);
  check('he drops the Golden Needle', S.drops.some(d => d.id === 'needle') || DQ.inv.count('needle') > 0);
  DQ.god = false; H.skipTalk(); tick(1);
  // --- the siege
  DQ.devBeat('siege'); for (const q of ['siegeprep']) { } H.skipTalk(); tick(1); H.skipTalk();
  S.town.level = Math.max(S.town.level, 3); DQ.questTick(); tick(.5); H.skipTalk(); tick(.5); H.skipTalk();
  check('siege quest started', S.quests.siegeprep !== undefined, JSON.stringify(S.quests));
  H.tp(DQ.POI.banner[0] - 3, DQ.POI.banner[1] + 3); DQ.inv.add('ballista', 2, true);
  H.place(DQ.POI.banner[0] - 4, DQ.POI.banner[1] + 2, 'ballista'); H.place(DQ.POI.banner[0] + 4, DQ.POI.banner[1] + 2, 'ballista'); DQ.questTick(); tick(.3);
  check('2 ballistas placed', S.stats.placedObj.ballista === 2);
  const mort = S.residents.find(r => r.id === 'mortimer'); check('Mortimer present', !!mort);
  H.tp(Math.floor(mort.x / T), Math.floor(mort.y / T) + 1); DQ.talkTo(mort); tick(2); // text types; pick choice 0
  for (let i = 0; i < 12 && DQ.talk.open && !DQ.talk.choices; i++) { I.tap('confirm'); tick(.5); } for (let i = 0; i < 12 && DQ.talk.open && DQ.talk.i < DQ.talk.pages.length - 1; i++) { I.tap('confirm'); tick(.5); } tick(2);
  if (DQ.talk.open) { I.tap('confirm'); tick(.3); I.tap('confirm'); tick(.3); }
  H.skipTalk(); tick(.5);
  check('siege prep begins', S.siege.phase === 'prep' || S.siege.phase === 'wave', S.siege.phase + JSON.stringify(S.quests));
  DQ.tuning.siegePrep = 5; S.siege.t = 3; DQ.god = true; h.hp = h.maxHp;
  let sawWave = {}, guard = 0;
  while (guard++ < 400 && !['boss', 'done', 'failed'].includes(S.siege.phase)) { tick(1); if (S.siege.phase === 'wave') sawWave[S.siege.wave] = 1; for (const m of S.monsters) if (m.siege && !m.def.boss && m.hp > 0 && Math.hypot(m.x - h.x, m.y - h.y) < 400 && DQ.chance(.5, 'test')) { m.hp = 0; DQ.killMonster(m); } S.town.bannerHp = Math.max(S.town.bannerHp, 150); }
  check('all three waves came', sawWave[1] && sawWave[2] && sawWave[3], JSON.stringify(sawWave) + S.siege.phase);
  // Gnarlgrim
  guard = 0; while (guard++ < 40 && !S.boss) { tick(.5); H.skipTalk(); }
  const g = S.boss; check('Gnarlgrim enters', !!g && g.id === 'gnarlgrim', JSON.stringify(S.siege) + ' cut=' + (S.cut && S.cut.kind) + ' talk=' + DQ.talk.open + ' mons=' + S.monsters.map(m => m.id + m.hp).join()); H.skipTalk(); tick(.5);
  const hp0 = g.hp; DQ.damageMonster(g, 17, h.x, h.y, {}); check('tight skin: a normal hit does 1ish damage', hp0 - g.hp <= 6, hp0 - g.hp);
  DQ.tangleHit(g, {}); DQ.tangleHit(g, {}); check('two ballista spools Tangle him', g.tangle > 0);
  const hp1 = g.hp; DQ.damageMonster(g, 17, h.x, h.y, { weapon: 'ripper' }); check('tangled he takes big damage', hp1 - g.hp >= 25, hp1 - g.hp);
  let ph = new Set(); guard = 0;
  while (guard++ < 600 && g.hp > 0) { tick(.4); ph.add(g.phase); if (g.tangle <= 0 && Math.hypot(g.x - h.x, g.y - h.y) < 80) { DQ.tangleHit(g, {}); DQ.tangleHit(g, {}); } if (g.tangle > 0) DQ.damageMonster(g, 60, h.x, h.y, { weapon: 'ripper', silent: true }); H.skipTalk(); }
  check('boss goes through 3 phases', ph.has(1) && ph.has(2) && ph.has(3), [...ph].join());
  check('Gnarlgrim falls', g.hp <= 0 && S.flags.boss_gnarlgrim);
  tick(1); H.skipTalk(300); tick(1); H.skipTalk(300); tick(1);
  check('siege done and chapter clear', S.siege.phase === 'done' && S.chapterClear, S.siege.phase + S.chapterClear);
  DQ.god = false;
  tick(1); check('results screen opens', game.sceneName === 'play' && (DQ.ui.top() && DQ.ui.top().panel === 'results'), String(DQ.ui.top() && DQ.ui.top().panel));
  check('no engine or game errors', game.errors.length === 0 && DQ.errors.length === 0, game.errors.map(e => e.message || e).concat(DQ.errors).join(' | ').slice(0, 600));
  return H;
}
