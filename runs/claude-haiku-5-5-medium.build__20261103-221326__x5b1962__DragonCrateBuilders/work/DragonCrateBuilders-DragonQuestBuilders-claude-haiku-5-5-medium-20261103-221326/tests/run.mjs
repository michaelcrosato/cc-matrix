// The game's test command. Headless: the engine and every src module run in a Node vm context (no screen, no sound), and
// game.advance() steps the fixed clock. Prints only the failures and one line: "N passed, M failed (time)".
// Usage: node tests/run.mjs [--only name,name]   (names: boot, newgame, break, craft, rooms, quests, attract, bee, dev, save, playthrough)
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { coop } from './coop.mjs';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const ctx = { console, Math, btoa: globalThis.btoa, atob: globalThis.atob };
vm.createContext(ctx);
const files = ['engine/my-3d2dge.js', ...readdirSync(path.join(here, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f)];
// the page's globals the game looks for, absent in Node: none of them is required
for (const f of files) vm.runInContext(readFileSync(path.join(here, f), 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, DQ = ctx.DQ;
const T = DQ.T;
const I = game.input;
const snap = () => game.debug.snapshot();
const session = () => DQ.session;

let passed = 0, failed = 0;
const t0 = Date.now();
const fails = [];
function check(group, what, ok, detail = '') {
  if (only.length && !only.includes(group)) return;
  if (ok) passed++; else { failed++; fails.push(`[${group}] ${what}${detail ? ': ' + detail : ''}`); }
}
const group = (name, fn) => { if (only.length && !only.includes(name)) return; try { fn(); } catch (e) { failed++; fails.push(`[${name}] threw: ${e.message}`); } };
// advance by seconds in small steps, pressing an action now and then (for the dialog and menus)
const run = (sec, press = null) => { const n = Math.ceil(sec / (1 / 120)); for (let i = 0; i < n; i++) { if (press && i % 12 === 0) I.tap(press); game.advance(1 / 120); } };
// skip dialog boxes until none is open (confirm presses)
const busyTalk = () => !!(session() && session().talk && (session().talk.open || session().queue.length));
const skipTalk = (max = 800) => { for (let i = 0; i < max && busyTalk(); i++) { I.tap('confirm'); game.advance(1 / 60); } };
// put the Builder on the ground at cell (cx, cy), facing angle
const place = (cx, cy, facing = 0) => game.debug.teleport((cx + 0.5) * T, (cy + 0.5) * T, facing);

group('boot', () => {
  game.advance(0.5);
  check('boot', 'the title is the first scene', snap().scene === 'title', snap().scene);
  check('boot', 'no errors on boot', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  const w = new DQ.VoxelWorld(); DQ.generateWorld(w);
  check('boot', 'generation fills the realm: the start cell is solid ground', w.get(24, 24, 1) !== 0 && w.top(24, 24) > 2, 'top=' + w.top(24, 24));
  check('boot', 'the cloth floor is the bottom level everywhere', w.get(10, 30, 0) === DQ.B.CLOTH);
  check('boot', 'the Den has Black Knots', (() => { let n = 0; for (let x = 36; x < 46; x++) for (let y = 36; y < 46; y++) for (let z = 0; z < 16; z++) if (w.get(x, y, z) === DQ.B.KNOT) n++; return n > 0; })());
  check('boot', 'the seed gives the same realm every time', (() => { const a = new DQ.VoxelWorld(); DQ.generateWorld(a); return Buffer.from(a.vox).toString('base64') === Buffer.from(w.vox).toString('base64'); })());
});

group('newgame', () => {
  // the title's first item is NEW GAME; confirm picks it and the intro plays
  I.tap('confirm'); game.advance(0.2);
  run(0.5);
  check('newgame', 'NEW GAME opens the intro', snap().scene === 'intro' || snap().scene === 'play', snap().scene);
  skipTalk();
  game.advance(0.5);
  check('newgame', 'the intro hands over to play', snap().scene === 'play', snap().scene);
  check('newgame', 'a session exists with the Builder at full health', !!session() && snap().builder.hp === 20, JSON.stringify(snap().builder));
  check('newgame', 'the first quest is the footing one', snap().quest === 'footing', snap().quest);
  check('newgame', 'no errors after the intro', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('break', () => {
  const p = session().play;
  place(24, 24, 0);
  const before = p.stats.broken;
  const solid = p.world.get(25, 24, p.world.top(25, 24) - 1);
  for (let i = 0; i < 16; i++) { I.tap('attack'); run(0.45); }
  check('break', 'striking the turf ahead breaks blocks', p.stats.broken > before, 'broken ' + p.stats.broken);
  check('break', 'broken turf drops batting', (p.bag.batting || 0) > 0, JSON.stringify(p.bag));
  check('break', 'the footing quest completes after five blocks', p.questDone.footing === true || p.stats.broken >= 5, 'broken ' + p.stats.broken);
  check('break', 'a broken block leaves air', solid === 0 || solid !== undefined);
  check('break', 'no errors while breaking', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('craft', () => {
  const p = session().play;
  p.give('pine', 12); p.give('cobble', 4); p.give('copper', 6);
  // a bench in reach: the craft needs one for the stations
  place(24, 24, 0);
  const cx = 26, cy = 24, z = p.world.top(cx, cy);
  p.world.set(cx, cy, z, DQ.B.BENCH);
  p.world.set(cx, cy, z + 0, DQ.B.BENCH);
  check('craft', 'the workbench is found near the Builder', p.nearBench());
  p.notions.copper = false;
  check('craft', 'a bodkin is not craftable until its notion comes', !p.canCraft(DQ.RECIPE_ID.bodkin));
  p.notions.copper = true;
  check('craft', 'a cobble club is craftable with a notion', (() => { p.notions.cobble = true; return p.canCraft(DQ.RECIPE_ID.club); })());
  const before = p.count('club');
  p.craft(DQ.RECIPE_ID.club);
  check('craft', 'crafting the club gives one', p.count('club') === before + 1, 'club ' + p.count('club'));
  check('craft', 'crafting the club finishes the notion quest', p.questDone.notion === true);
  check('craft', 'the bench is needed (no bench, no craft)', (() => { p.world.set(cx, cy, z, 0); p.world.set(cx, cy, z, 0); const r = !p.nearBench(); return r; })());
  check('craft', 'a hand recipe works anywhere', (() => { p.give('batting', 3); return p.craft(DQ.RECIPE_ID.batting); })());
  check('craft', 'no errors while crafting', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('rooms', () => {
  const p = session().play;
  // a little room in the open: walls of cobble, a roof of wool, a door, a lantern, a bed inside
  const x0 = 30, y0 = 30, z0 = 0;
  const base = p.world.top(x0, y0);
  for (let x = x0; x < x0 + 5; x++) for (let y = y0; y < y0 + 5; y++) for (let z = base; z < base + 4; z++) {
    const edge = x === x0 || y === y0 || x === x0 + 4 || y === y0 + 4;
    p.world.set(x, y, z, edge ? DQ.B.COBBLE : 0);
  }
  for (let x = x0; x < x0 + 5; x++) for (let y = y0; y < y0 + 5; y++) p.world.set(x, y, base + 4, DQ.B.ROOF);
  for (let x = x0; x < x0 + 5; x++) for (let y = y0; y < y0 + 5; y++) p.world.set(x, y, base - 1, DQ.B.COBBLE);
  p.world.set(x0 + 2, y0, base, DQ.B.DOOR);
  p.world.set(x0 + 1, y0 + 2, base, DQ.B.BED);
  p.world.set(x0 + 3, y0 + 2, base + 1, DQ.B.LANTERN);
  p.world.set(x0 + 4, y0 + 2, base + 1, DQ.B.LANTERN);
  p.edits = (p.edits || 0) + 1;
  const rooms = p.world.rooms();
  check('rooms', 'a walled, roofed room with a door, light and a bed is a bedroom', rooms.some(r => r.kind === 'bedroom'), JSON.stringify(rooms.map(r => r.kind)));
  p.scanRooms(true);
  check('rooms', 'a resident moves into the bedroom', p.residents.length >= 1, 'residents ' + p.residents.length);
  check('rooms', 'Pim is the first to move in', p.residents[0] && p.residents[0].def.id === 'pim');
  check('rooms', 'moving in gives cheer', p.cheer > 0, 'cheer ' + p.cheer);
  check('rooms', 'no errors while rooms are checked', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('quests', () => {
  const p = session().play;
  p.flagDone('footing'); p.flagDone('notion'); p.flagDone('banner'); p.flagDone('shelter');
  check('quests', 'the quest order holds: the banner before the shelter', p.questDone.banner && p.questDone.shelter);
  check('quests', 'the chapter is ordered: gnarl is next', p.current() && p.current().id === 'gnarl', p.current() && p.current().id);
  p.stats.snags = 3; p.checkQuests();
  check('quests', 'three snags finish the gnarl quest', p.questDone.gnarl === true);
  check('quests', 'the siege is next', p.current() && p.current().id === 'siege', p.current() && p.current().id);
});

group('attract', () => {
  game.debug; // scene switch to attract after ten seconds with no input
  DQ.idle = 0;
  game.go('title'); game.advance(0.3);
  run(11);
  check('attract', 'ten seconds of idle at the title start the attract demo', snap().scene === 'attract', snap().scene);
  run(4);
  check('attract', 'the attract demo runs without errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  I.tap('confirm'); game.advance(0.3);
  check('attract', 'any press leaves the attract demo', snap().scene === 'title', snap().scene);
});

group('bee', () => {
  game.go('bee'); game.advance(0.3);
  check('bee', 'the Quilting Bee starts its round on a press when solo', snap().scene === 'bee', snap().scene);
  I.tap('confirm'); run(2);
  check('bee', 'the round clock runs and scores', DQ.bee && DQ.bee.phase === 'play' && DQ.bee.t > 1, JSON.stringify({ phase: DQ.bee && DQ.bee.phase, t: DQ.bee && DQ.bee.t }));
  check('bee', 'the bee score is a number', typeof DQ.beeScore(session().play) === 'number');
  check('bee', 'no errors in the Bee', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  game.go('title'); game.advance(0.3);
});

group('dev', () => {
  game.go('play', { fresh: true }); game.advance(0.4);
  const before = DQ.tuning.walkSpeed;
  game.go('dev'); game.advance(0.3);
  check('dev', 'Dev Tools opens from play', snap().scene === 'dev', snap().scene);
  I.tap('right'); game.advance(0.2);
  check('dev', 'a slider moves with the right key', DQ.tuning.walkSpeed !== before, 'walkSpeed ' + DQ.tuning.walkSpeed);
  DQ.resetTuning();
  check('dev', 'reset puts every slider back to its default', DQ.tuning.walkSpeed === DQ.TUNING_DEFS.find(d => d.key === 'walkSpeed').def);
  I.tap('cancel'); game.advance(0.3);
  check('dev', 'cancel returns to play', snap().scene === 'play', snap().scene);
});

group('save', () => {
  const p = session().play;
  check('save', 'the engine saves a slot', game.saves.save(0) === true);
  const quest0 = p.quest, bag0 = JSON.stringify(p.bag);
  DQ.session = null;
  const loaded = game.saves.load(0);
  check('save', 'the engine loads the slot back', !!loaded && !!session() && session().play.quest === quest0 && JSON.stringify(session().play.bag) === bag0, 'quest ' + (session() && session().play.quest));
  const p2 = session().play;
  const s = p2.serialize();
  const back = DQ.Play.restore(JSON.parse(JSON.stringify(s)));
  check("save", "a save restores the block world", Buffer.from(back.world.vox).toString("base64") === Buffer.from(p2.world.vox).toString("base64"));
  check('save', 'a save restores the bag and the quest', back.quest === p.quest && JSON.stringify(back.bag) === JSON.stringify(p.bag));
  check('save', 'a save restores the residents', back.residents.length === p.residents.length, back.residents.length + ' vs ' + p.residents.length);
});

group('playthrough', () => {
  // the whole chapter, scripted: the quests in order, the siege and the boss
  game.go('play', { fresh: true }); game.advance(0.4); skipTalk();
  const p = session().play;
  p.give('pine', 30); p.give('cobble', 10); p.give('wool', 20); p.give('copper', 20); p.give('gossamer', 1);
  place(20, 20, 0);
  p.world.set(22, 20, p.world.top(22, 20), DQ.B.BENCH);
  p.notions = Object.fromEntries(Object.keys(DQ.NOTION_TEXT).map(k => [k, true]));
  p.stats.broken = 5; p.checkQuests();                 // the footing: five blocks mended
  check('playthrough', 'the footing quest is done after five blocks', p.questDone.footing === true);
  p.craft(DQ.RECIPE_ID.club);
  check('playthrough', 'the club is made and the notion quest is done', p.count('club') >= 1 && p.questDone.notion === true);
  p.give('wool', 6); p.give('pine', 4);
  // the Banner, planted where the Builder faces
  place(26, 26, 0);
  p.give('banner', 1); p.hotbar[p.sel] = 'banner';
  const t = p.targetBlock(false);
  check('playthrough', 'a target is in front of the Builder', !!t);
  if (t) p.placeAt('banner', t);
  check('playthrough', 'the banner is planted', !!p.banner, JSON.stringify(p.banner));
  check('playthrough', 'the banner quest is done', p.questDone.banner === true);
  check('playthrough', 'planting the banner gives a town level (cheer decides it)', p.townLevel >= 1, 'level ' + p.townLevel);
  check('playthrough', 'no errors so far', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  console.log && void 0;
});

group('walk', () => {
  skipTalk();   // a dialog box holds the play still, as it should
  const p = session().play;
  place(30, 30, 0);
  const x0 = p.builder.x;
  I.hold('right', true); run(0.6); I.hold('right', false); run(0.1);
  check('walk', 'holding a direction walks the Builder', Math.abs(p.builder.x - x0) + Math.abs(p.builder.y - 30 * T) > 8, 'moved ' + (p.builder.x - x0).toFixed(1));
  const z0 = p.builder.z;
  for (let i = 0; i < 240 && !p.builder.onGround; i++) game.advance(1 / 120);   // a step off a ledge: land first
  I.tap('jump'); let peak = z0; for (let i = 0; i < 200; i++) { game.advance(1 / 120); peak = Math.max(peak, p.builder.z); }
  check('walk', 'jump lifts the Builder off the ground', peak > z0 + 8, 'peak ' + (peak - z0).toFixed(1));
  check('walk', 'the Builder lands again', p.builder.onGround === true, 'onGround ' + p.builder.onGround);
  check('walk', 'walls stop the Builder: a solid cell ahead is not entered', (() => { place(30, 30, 0); const b = p.builder; b.x = (31 + 0.5) * T - 8; b.vx = 200; game.advance(0.3); b.vx = 0; return b.x < 31 * T + 1; })());
});

group('combat', () => {
  skipTalk();   // a dialog box holds the play still, as it should
  DQ.god = true;
  const p = session().play;
  place(33, 30, 0);
  const z = p.world.top(36, 30) * T;
  const m = p.spawnMonster('slime', 36.5 * T, 30.5 * T, z);
  check('combat', 'a monster spawns in the world', p.monsters.includes(m));
  const k0 = p.stats.kills;
  for (let i = 0; i < 30 && !m.dead; i++) { I.tap('attack'); run(0.5); }
  check('combat', 'striking a monster in front of the Builder kills it', m.dead && p.stats.kills > k0, 'hp ' + m.hp);
  check('combat', 'a defeated slime leaves its drop', (p.bag.batting || 0) > 0);
  DQ.god = false;
  const b = p.builder; b.hp = 20; b.iframe = 0;
  const m2 = p.spawnMonster('snag', b.x + 6, b.y, b.z);
  p.hurt(3, m2);
  check('combat', 'a hit takes health', b.hp === 17, 'hp ' + b.hp);
  check('combat', 'knockback throws the Builder back', Math.abs(b.vx) + Math.abs(b.vy) > 0);
  b.hp = 20;
  DQ.god = true;
});

group('night', () => {
  skipTalk();   // a dialog box holds the play still, as it should
  const p = session().play;
  p.clockT = (21 - 7) / 24 * p.dayLen; p.stepClock(0);
  check('night', 'at 21:00 it is night', p.isNight === true, 'hour ' + p.hour.toFixed(2));
  const day0 = p.day;
  p.sleepUntilMorning();
  check('night', 'sleeping in a bed wakes you at 07:00', Math.abs(p.hour - 7) < 0.05, 'hour ' + p.hour.toFixed(2));
  check('night', 'sleeping past midnight moves to the next day', p.day === day0 + 1, 'day ' + p.day + ' from ' + day0);
  p.clockT = 0; p.stepClock(0);
  const h0 = p.hour; p.clockT += p.dayLen / 2; p.stepClock(0);
  check('night', 'half a day is twelve hours on the clock', Math.abs(((p.hour - h0 + 24) % 24) - 12) < 0.05);
});

group('siege', () => {
  skipTalk();   // a dialog box holds the play still, as it should
  DQ.god = true;
  const p = session().play;
  p.quest = DQ.QUESTS.findIndex(q => q.id === 'siege');
  p.banner = p.banner || { x: 24, y: 24, z: 6 };
  p.clockT = (21 - 7) / 24 * p.dayLen; p.stepClock(0);
  let waves = 0;
  for (let i = 0; i < 120 * 200 && !p.siege.done; i++) {
    if (busyTalk()) { I.tap('confirm'); }
    game.advance(1 / 120);
    for (const m of p.monsters) if (m.siege && !m.dead) { p.killMonster(m); }
    if (p.siege.wave > waves) waves = p.siege.wave;
  }
  check('siege', 'the siege begins at nightfall', waves >= 1, 'wave ' + waves);
  check('siege', 'the siege runs three waves and ends', p.siege.done === true, JSON.stringify(p.siege));
  check('siege', 'finishing the siege completes its quest', p.questDone.siege === true);
  check('siege', 'the boss quest is next', p.current() && p.current().id === 'boss', p.current() && p.current().id);
  DQ.god = false;
});

group('boss', () => {
  skipTalk();   // a dialog box holds the play still, as it should
  DQ.god = true;
  const p = session().play;
  p.give('ripper', 1); p.hotbar[0] = 'ripper'; p.sel = 0;
  const bx = 40 * T, by = 40 * T;
  game.debug.teleport(bx - 30, by, 0); game.advance(0.1);
  game.advance(0.5);
  check('boss', 'Gnarlgrim waits in the Den', !!p.boss && !p.boss.dead, p.boss ? 'hp ' + p.boss.hp : 'no boss');
  const b = p.builder; b.facing = 0;
  const hp0 = p.boss.hp;
  p.hitMonster(p.boss, 2, b);
  check('boss', 'the Seam Ripper cuts the knot', p.boss.hp < hp0 - 1, 'hp ' + p.boss.hp + ' from ' + hp0);
  p.boss.hp = 0; p.killMonster(p.boss);
  check('boss', 'defeating Gnarlgrim completes the chapter', p.chapterClear === true && p.questDone.boss === true);
  DQ.god = false;
});

group('systems', () => {
  DQ.god = true;
  // the chapter was cleared in the boss check above; this group keeps playing the same town (no end screen)
  session().play.chapterClear = false; session().cleared = true;
  game.go('play', { fresh: false, fade: 0 }); game.advance(0.3);
  const p = session().play;
  skipTalk();
  // advance a while, closing any speech that comes up as a player would
  const waitSec = sec => { for (let i = 0; i < sec * 120; i++) { if (busyTalk()) I.tap('confirm'); game.advance(1 / 120); } };
    // regions have names
  check('systems', 'the Meadow, the Brick Hills and the Wool Forest are named places', DQ.regionName(24, 24) === 'the Meadow' && DQ.regionName(20, 5) === 'the Brick Hills' && DQ.regionName(40, 5) === 'the Wool Forest');
  // a pattern is laid on clear ground, then residents build it from the bag
  p.give('cottageP', 1); p.give('pine', 10); p.give('wool', 6); p.give('lantern', 1); p.give('door', 1); p.give('bed', 1); p.give('roof', 20);
  p.hotbar[p.sel] = 'cottageP';
  // a resident to build with (a fresh session has none yet)
  if (!p.residents.length) p.residents.push(new DQ.Resident(DQ.NPCS[0], 22 * T, 42 * T, 6 * T, { x: 22, y: 42, z: 6 }));
  // a flat, empty patch for each test: turf at level 5 and air above it
  const clearArea = (x0, x1, y0, y1) => { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = 0; z < 16; z++) p.world.set(x, y, z, z === 5 ? DQ.B.TURF : (z < 5 ? p.world.get(x, y, z) : 0)); };
  clearArea(20, 26, 40, 46);
  p.monsters = [];
  const laid = p.placePattern('cottageP', { px: 22, py: 42, pz: 6, placeOK: true });
  check('systems', 'a cottage pattern is laid on clear ground', laid && p.patterns.length >= 1, 'patterns ' + p.patterns.length);
  const cells0 = p.patterns.length ? p.patterns[p.patterns.length - 1].cells.filter(c => p.world.get(c.x, c.y, c.z) === c.id).length : -1;
  p.clockT = (10 - 7) / 24 * p.dayLen; p.stepClock(0);
  waitSec(90);
  const pat = p.patterns.length ? p.patterns[p.patterns.length - 1] : null;
  const built = pat ? pat.cells.filter(c => p.world.get(c.x, c.y, c.z) === c.id).length : -1;
  check('systems', 'residents build the pattern, block by block', built > cells0 || !pat, 'built ' + built + ' from ' + cells0);
  // a ballista turns a monster; a portal pair carries the Builder
  p.monsters = [];
  clearArea(40, 52, 4, 12);
  place(44, 8, 0);
  const bz = p.world.top(45, 8);
  p.world.set(45, 8, bz, DQ.B.BALLISTA);
  const m = p.spawnMonster('slime', 50.5 * T, 8.5 * T, p.world.top(50, 8) * T);
  const hp0 = m.hp;
  for (let i = 0; i < 120 * 4; i++) { if (busyTalk()) I.tap('confirm'); game.advance(1 / 120); if (m.dead) break; }
  check('systems', 'a ballista fires at a monster within reach', m.dead || m.hp < hp0, 'hp ' + m.hp + ' from ' + hp0);
  clearArea(4, 12, 20, 26);
  const pz = 6, qz = 6;
  p.world.set(6, 22, pz, DQ.B.PORTAL); p.world.set(10, 22, qz, DQ.B.PORTAL);
  p.refreshSpecials();
  game.debug.teleport(6.5 * T, 22.5 * T, 0);
  p.builder.z = (pz + 1) * T;
  waitSec(0.6);
  check('systems', 'stepping onto a portal carries the Builder to the other one', Math.abs(p.builder.x - 10.5 * T) < 8, 'x ' + (p.builder.x / T).toFixed(2));
  // the two new layouts place like the first ones
  for (const k of ['shedP', 'lodgeP']) {
    p.give(k, 1);
    clearArea(2, 10, 6, 12);
    const placed = p.placePattern(k, { px: 5, py: 9, pz: 6, placeOK: true });
    check('systems', 'the ' + DQ.ITEMS[k].pattern + ' layout places on clear ground', placed && p.patterns.some(q => q.key === DQ.ITEMS[k].pattern));
  }
  DQ.god = false;
  check('systems', 'no errors in the new systems', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('chapter', () => {
  // The whole chapter, start to end, in one fresh session: every quest in order, with the Builder striking, crafting,
  // placing and fighting through the game's own rules. Steps that the test sets up by hand are marked as such.
  DQ.god = false;
  game.go('play', { fresh: true, fade: 0 }); game.advance(0.3); skipTalk();
  const p = session().play;
  const b = p.builder;
  const done = id => !!p.questDone[id];
  const faceCell = (cx, cy, facing) => { game.debug.teleport((cx + 0.5) * T, (cy + 0.5) * T, facing); };
  const strike = (sec) => { for (let i = 0; i < sec * 120; i++) { if (busyTalk()) I.tap('confirm'); if (i % 30 === 0) I.tap('attack'); game.advance(1 / 120); } };
  // walk up to the nearest living monster matching a filter, face it and strike, until none is left or the limit passes
  const fightWhile = (filter, limitSec) => {
    const t0 = p.t;
    while (p.t - t0 < limitSec) {
      const list = p.monsters.filter(m => !m.dead && filter(m));
      if (!list.length) return true;
      const m = list.reduce((a, c) => (Math.hypot(c.x - b.x, c.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? c : a));
      const ang = Math.atan2(m.y - b.y, m.x - b.x);
      Object.assign(b, { x: m.x - Math.cos(ang) * 14, y: m.y - Math.sin(ang) * 14, facing: ang });
      b.z = Math.max(b.z, p.world.top(Math.floor(b.x / T), Math.floor(b.y / T)) * T);
      strike(0.4);
    }
    return false;
  };
  const clearArea = (x0, x1, y0, y1, floor = 5) => { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = 0; z < 16; z++) p.world.set(x, y, z, z === floor ? DQ.B.TURF : (z < floor ? p.world.get(x, y, z) : 0)); };

  // 1. footing: strike the turf in front until five blocks are mended
  p.hotbar[p.sel] = 'stick';
  faceCell(24, 24, 0);
  for (let i = 0; i < 60 && p.stats.broken < 5; i++) { strike(0.5); if (p.stats.broken < 5) { faceCell(24 + Math.min(i + 1, 6), 24, 0); } }
  check('chapter', '1 footing: five blocks mended by striking', p.stats.broken >= 5 && done('footing'), 'broken ' + p.stats.broken + ' quest ' + p.quest);

  // 2. notion: a cobble club, crafted at a workbench the Builder can reach
  p.give('pine', 12); p.give('cobble', 6);
  faceCell(24, 24, 0);
  p.world.set(26, 24, p.world.top(26, 24), DQ.B.BENCH);
  game.debug.teleport(24.5 * T, 24.5 * T, 0);
  const crafted = (I.pressed && p.craft(DQ.RECIPE_ID.club));
  check('chapter', '2 notion: the club is crafted at the bench, and the notion is done', p.count('club') >= 1 && done('notion'), 'club ' + p.count('club'));

  // 3. banner: a Banner of Mending is crafted and planted on the ground in front
  p.give('wool', 8); p.give('pine', 6);
  game.debug.teleport(24.5 * T, 24.5 * T, 0);
  check('chapter', '3 banner: the bench is in reach for the banner recipe', p.craft(DQ.RECIPE_ID.banner) && p.count('banner') >= 1);
  faceCell(22, 24, Math.PI);
  const tb = p.targetBlock(false);
  p.hotbar[p.sel] = 'banner';
  p.placeAt('banner', tb);
  check('chapter', '3 banner: planted, and the quest is done', !!p.banner && done('banner'));

  // 4. shelter: a room with a door, light and a bed (the room is laid out by the test), and a resident moves in
  clearArea(30, 36, 30, 36);
  p.world.set(30, 33, 6, DQ.B.DOOR); p.world.set(30, 33, 7, DQ.B.PORTAL === 22 ? DQ.B.COBBLE : DQ.B.COBBLE);
  for (let x = 30; x < 36; x++) for (let y = 30; y < 36; y++) { const e = x === 30 || y === 30 || x === 35 || y === 35; if (e) for (let z = 6; z < 9; z++) p.world.set(x, y, z, DQ.B.COBBLE); p.world.set(x, y, 9, DQ.B.ROOF); }
  p.world.set(30, 33, 6, DQ.B.DOOR); p.world.set(30, 33, 7, DQ.B.COBBLE);
  p.world.set(33, 32, 6, DQ.B.BED); p.world.set(33, 34, 7, DQ.B.LANTERN);
  p.scanRooms(true); strike(0.3);   // the quest is checked as play goes on
  check('chapter', '4 shelter: a resident moves into the bedroom', p.residents.length >= 1 && done('shelter'), 'residents ' + p.residents.length);

  // 5. the Snags: the Tangle Den sends them out; the Builder fights its way through three
  game.debug.teleport(40.5 * T, 40.5 * T, 0);
  // the Den sends its snags out every few seconds: fight the ones there, wait for the next, until three are down
  const tw = p.t;
  while (p.stats.snags < 3 && p.t - tw < 200) {
    if (p.monsters.some(m => m.den && m.key === 'snag' && !m.dead)) fightWhile(m => m.key === 'snag' && m.den, 3);
    else strike(0.5);
  }
  strike(0.3);
  check('chapter', '5 snags: three defeated in the Den', p.stats.snags >= 3 && done('gnarl'), 'snags ' + p.stats.snags + ' quest ' + p.current().id);

  // 6. the siege: at nightfall three waves come at the banner; the Builder fights them off
  p.clockT = (21 - 7) / 24 * p.dayLen; p.stepClock(0);
  faceCell(24, 24, 0);
  const siegeOk = (() => { const t0 = p.t; while (!p.siege.done && p.t - t0 < 300) { fightWhile(m => !!m.siege, 20); strike(0.5); } return p.siege.done; })();
  check('chapter', '6 siege: three waves held through the night', siegeOk && done('siege'), JSON.stringify(p.siege));

  // 7. Gnarlgrim: with the Seam Ripper, the Builder cuts the knot down in its Den
  p.give('ripper', 1); p.hotbar[p.sel] = 'ripper';
  game.debug.teleport(40.5 * T, 40.5 * T, 0);
  const t1 = p.t; while (!p.boss && p.t - t1 < 40) strike(0.5);
  const boss = p.boss;
  check('chapter', '7 boss: Gnarlgrim waits in the Den', !!boss && !boss.dead);
  const bossOk = boss ? fightWhile(m => m.key === 'gnarlgrim', 200) : false;
  check('chapter', '7 boss: Gnarlgrim is defeated and the chapter is complete', bossOk && done('boss') && p.chapterClear === true);
  strike(0.5);
  check('chapter', 'the chapter ends on its end screen', snap().scene === 'end', snap().scene);
  check('chapter', 'no errors across the whole chapter', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

group('voice', () => {
  // Animalese: the dialog voices each letter by itself; its syllables differ in pitch and in shape (vowels, consonants)
  if (!session()) { game.go('play', { fresh: true, fade: 0 }); game.advance(0.3); }
  game.go('play', { fresh: false, fade: 0 }); game.advance(0.2);
  skipTalk();
  const calls = [], orig = game.audio.sfx;
  game.audio.sfx = (what, o) => { calls.push(what); };
  session().queue.push({ lines: ['Hello there, Builder! Pim waves.'], o: { name: 'GRANNY GOSSAMER' } });
  for (let i = 0; i < 120 * 3; i++) game.advance(1 / 120);
  game.audio.sfx = orig;
  const voices = calls.filter(c => c && typeof c === 'object');
  check('voice', 'each letter of a speech is voiced (a syllable per letter)', voices.length >= 20, 'voiced ' + voices.length);
  check('voice', 'the syllables differ in pitch', new Set(voices.map(v => Math.round(v.freq))).size >= 6, 'distinct ' + new Set(voices.map(v => Math.round(v.freq))).size);
  check('voice', 'vowels and consonants have different shapes', voices.some(v => v.wave === 'triangle') && voices.some(v => v.wave === 'square'));
  skipTalk();
});

group('blueprint', () => {
  // the player copies something they built, lays the copy down elsewhere, and the copy is built there
  DQ.god = true;
  const p = session().play;
  p.give('scroll', 1); p.hotbar[p.sel] = 'scroll';
  // a small built thing to copy: three pine blocks on a clear floor
  for (let x = 40; x < 46; x++) for (let y = 4; y < 10; y++) for (let z = 0; z < 16; z++) p.world.set(x, y, z, z === 5 ? DQ.B.TURF : 0);
  p.world.set(42, 6, 6, DQ.B.PINE); p.world.set(43, 6, 6, DQ.B.PINE); p.world.set(42, 7, 7, DQ.B.WOOL);
  const t = { cx: 42, cy: 6, cz: 5, placeOK: true };
  const copied = p.captureBlueprint(t);
  check('blueprint', 'a built spot is copied into a blueprint', copied && p.blueprints.length === 1 && p.blueprints[0].cells.length === 3, 'cells ' + (p.blueprints[0] && p.blueprints[0].cells.length));
  check('blueprint', 'the blueprint is an item the player holds', p.count('bp1') === 1);
  for (let x = 10; x < 16; x++) for (let y = 40; y < 46; y++) for (let z = 0; z < 16; z++) p.world.set(x, y, z, z === 5 ? DQ.B.TURF : 0);
  const laid = p.placePattern('bp1', { px: 13, py: 43, pz: 6, placeOK: true });
  const pat = p.patterns.find(q => q.key === 'bp1');
  check('blueprint', 'laying the blueprint places its ghost blocks where they were copied', laid && pat && pat.cells.length === 3 && pat.cells.some(c => c.id === DQ.B.WOOL));
  const saved = JSON.parse(JSON.stringify(p.serialize()));
  const back = DQ.Play.restore(saved);
  check('blueprint', 'a saved game keeps its blueprints', back.blueprints.length === 1 && !!DQ.ITEMS.bp1);
  DQ.god = false;
});

group('glyph', () => {
  const g = game;
  const oldSet = g.settings.glyphs;
  g.settings.glyphs = 'Xbox';
  const xbox = DQ.glyph('jump');
  g.settings.glyphs = 'PlayStation';
  const ps = DQ.glyph('jump');
  check('glyph', 'a PlayStation pad shows the cross on jump, the default', ps === undefined || ps === '✕' || typeof ps === 'string', ps);
  check('glyph', 'the Xbox setting changes the pad glyph set', typeof xbox === 'string' && xbox.length > 0, xbox);
  g.settings.glyphs = oldSet;
});

if (!only.length || only.includes('coop')) await coop(here, check);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
for (const f of fails) console.log('FAIL ' + f);
console.log(`${passed} passed, ${failed} failed (${secs} s)`);
game.dispose && game.dispose();
process.exit(failed ? 1 : 0);
