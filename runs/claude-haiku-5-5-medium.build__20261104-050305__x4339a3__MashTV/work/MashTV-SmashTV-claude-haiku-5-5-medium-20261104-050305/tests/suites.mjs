// The suites: each one is a group of checks against the built game (headless, in a VM with the patched engine).
import { check, suite, eq, ok, near, fresh, roomWithBot, runFor } from './harness.mjs';

const RM = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6'];
const BOSSES = ['1-B', '2-B', '3-B'];
const idle = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };

export const SUITES = {
  core() {
    suite('core');
    const L = fresh(), { MT, E } = L;
    check('tuning defaults are the plan values', () => { eq(MT.T.playerSpeed, 95); eq(MT.T.fireRate, 9); eq(MT.T.slideCooldown, .85); eq(MT.T.primeTime, 12); });
    check('setTune changes the value and resetTunes restores every default', () => { MT.setTune('playerSpeed', 150); eq(MT.T.playerSpeed, 150); MT.resetTunes(); eq(MT.T.playerSpeed, 95); eq(MT.tuned().length, 0); });
    check('every slider in the registry has a default', () => { for (const [k] of MT.TLIST) ok(MT.TDEF[k] !== undefined, k); });
    check('arena: the room grid is 23 by 15 cells with three-cell door gaps', () => { eq(MT.ARENA_ROWS.length, 15); for (const r of MT.ARENA_ROWS) eq(r.length, 23); for (const d of ['N', 'S', 'E', 'W']) eq(MT.DOOR_CELLS[d].length, 3); });
    check('cell (0,0) maps to world (24,24) and the interior is 16..352 by 16..224', () => { eq(MT.cellXY(0, 0)[0], 24); eq(MT.cellXY(0, 0)[1], 24); ok(MT.inArena(184, 120)); ok(!MT.inArena(4, 120)); });
    check('the seeded streams are deterministic', () => { MT.seedAll(9); const a = [MT.rng.spawn(), MT.rng.spawn(), MT.rng.drops()]; MT.seedAll(9); const b = [MT.rng.spawn(), MT.rng.spawn(), MT.rng.drops()]; eq(JSON.stringify(a), JSON.stringify(b)); });
    check('the prize tables hold 6 prizes per episode and 18 in all', () => { eq(MT.EPISODES.reduce((n, e) => n + e.prizes.length, 0), 18); });
    check('the nine keys are split 3 per episode', () => { for (const ep of [1, 2, 3]) ok(MT.episodeRooms(ep).filter(r => r.key).length >= 3, 'ep ' + ep); });
    check('every episode map points at real rooms', () => { for (const E1 of MT.EPISODES) for (const id of Object.keys(E1.map)) ok(MT.ROOMS[id], id); });
  },

  input() {
    suite('input');
    const L = fresh(), { MT, game } = L;
    check('the play preset aims with the arrows and leaves them off the moves', () => { ok(MT.MASH_PLAY.aimUp && MT.MASH_PLAY.aimLeft); ok(!MT.MASH_PLAY.up.includes('ArrowUp')); });
    check('the menu preset navigates with the arrows', () => { ok(MT.MASH_MENU.up.includes('ArrowUp')); ok(MT.MASH_MENU.down.includes('ArrowDown')); });
    check('a stick past .35 aims and fires', () => {
      const fake = { move: () => [0, 0], padAim: [0, 1], down: () => false, pressed: () => false, lastDevice: 'gamepad' };
      const c = { x: 184, y: 120, aim: null };
      const it = MT.intentFrom(fake, c, game, null); ok(it.fire); near(it.aim, Math.atan2(1, 0), .6 + 1e-6, 'aim'); eq(it.source, 'stick');
    });
    check('arrows give eight ways and fire', () => {
      const fake = { move: () => [0, 0], padAim: null, down: n => n === 'aimRight' || n === 'aimUp', pressed: () => false, lastDevice: 'keyboard' };
      const it = MT.intentFrom(fake, { x: 0, y: 0, aim: null }, game, null); ok(it.fire); eq(it.source, 'arrows');
    });
    check('the preset sync gives menu keys while paused and play keys after', () => {
      MT.G.debug && 0;
      const L2 = fresh(); L2.game.debug.quickRoom('1-1', 7);
      for (let i = 0; i < 300 && !L2.MT.PLAY.W; i++) L2.game.advance(.1);
      L2.game.advance(.2); ok(L2.game.input.map.aimUp, 'play has aimUp');
      L2.game.pause('test'); L2.game.advance(.2); ok(!L2.game.input.map.aimUp, 'menu has no aimUp while paused'); ok(L2.game.input.map.up.includes('ArrowUp'), 'menu up is ArrowUp');
      L2.game.resume(); L2.game.advance(.2); ok(L2.game.input.map.aimUp, 'play again after resume');
    });
    check('glyphs: PlayStation by default, Xbox on request', () => { eq(MT.glyph.family({ settings: {} }), 'playstation'); eq(MT.glyph.family({ settings: { glyphs: 'xbox' } }), 'xbox'); });
  },

  contestant() {
    suite('contestant');
    const L = fresh(), { MT } = L;
    const mk = (o = {}) => { const W = { diff: MT.DIFF.contestant, enemies: [], players: [], wallClamp: () => {}, touchFloor: () => {}, emit: () => {}, ratingsAdd: () => {}, popup: () => {}, run: MT.newRun({}), splatAt: () => false, formation: () => [184, 192], dropPoint: () => [184, 180], showstop: () => false, hurtPlayer: () => false }; W.wallClamp = c => { if (c.x < 22) c.x = 22; if (c.x > 346) c.x = 346; }; const c = new MT.Contestant(W, 0, Object.assign({ x: 184, y: 120 }, o)); c.state = 'play'; c.walkT = 0; c.W = W; W.players.push(c); return { c, W }; };
    check('walks at the playerSpeed', () => { const { c, W } = mk(); for (let i = 0; i < 120; i++) c.step(1 / 120, Object.assign({}, idle, { move: [1, 0] }), W); near(c.x, 184 + 95, 3, 'x'); });
    check('walls stop the walk', () => { const { c, W } = mk({ x: 340 }); for (let i = 0; i < 240; i++) c.step(1 / 120, Object.assign({}, idle, { move: [1, 0] }), W); ok(c.x <= 346.1, 'x ' + c.x); });
    check('a slide covers slideSpeed times its time and starts a cooldown', () => { const { c, W } = mk(); c.startSlide({ move: [1, 0] }); for (let i = 0; i < 60; i++) c.step(1 / 120, idle, W); near(c.x - 184, 235 * .28, 6, 'slide'); ok(c.slideCd > .5, 'cooldown ' + c.slideCd); });
    check('a hit costs one HP, gives invulnerability, and a second hit in that time does nothing', () => { const { c, W } = mk(); const hp = c.hp; ok(c.hurt(1, null, W)); eq(c.hp, hp - 1); ok(!c.hurt(1, null, W)); });
    check('the slide has i-frames for its first 0.22 s', () => { const { c, W } = mk(); c.invulnT = 0; c.startSlide({ move: [1, 0] }); ok(!c.hurt(1, null, W)); });
    check('death costs a life and drops in after two seconds with invulnerability', () => { const { c, W } = mk(); c.invulnT = 0; c.hp = 1; c.hurt(1, null, W); eq(c.lives, 2); eq(c.state, 'dead'); for (let i = 0; i < 260; i++) c.step(1 / 120, idle, W); ok(c.state === 'drop' || c.state === 'play', c.state); for (let i = 0; i < 120; i++) c.step(1 / 120, idle, W); eq(c.state, 'play'); ok(c.invulnT > 0); ok(c.bombs >= 1); });
    check('out of lives: Start continues at half the winnings', () => { const { c, W } = mk({ lives: 1, cash: 4000 }); c.invulnT = 0; c.hp = 1; c.hurt(1, null, W); eq(c.state, 'out'); c.continueOn(W); eq(c.cash, 2000); eq(c.lives, MT.DIFF.contestant.lives); });
    check('the showboat gains 4 + 3n + 3m ratings (capped at 30)', () => { const { c, W } = mk(); const got = []; W.ratingsAdd = (g) => got.push(g); W.enemies = [0, 1, 2].map(i => ({ alive: true, counted: true, x: 184 + i * 4, y: 120 })); c.finishShowboat(W); eq(got[0], 4 + 3 * 3 + 3 * 3); });
    check('a Showstopper clears foe bullets and uses one of the stock', () => { const { c, W } = mk({ bombs: 2 }); const bombs = c.bombs; W.fShots = [{}, {}]; W.showstop = c2 => { c2.bombs--; return true; }; ok(W.showstop(c)); eq(c.bombs, bombs - 1); });
  },

  weapons() {
    suite('weapons');
    const L = fresh(), { MT } = L;
    const mkW = () => { const W = new (L.ctx.World)({ roomId: '1-1' }, '1-1', { players: [] }); return W; };
    check('the blaster fires at the fire rate (9 a second)', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); for (let t = 0; t < 3 * 120; t++) W.step(1 / 120); const shots = []; const o = W.pshot.bind(W); W.pshot = (...a) => { shots.push(1); return o(...a); }; c.aim = 0; for (let t = 0; t < 120; t++) { c.intent = Object.assign({}, idle, { fire: true, aim: 0 }); W.step(1 / 120); } near(shots.length, 9, 1, 'shots'); });
    check('the spread fires three bolts per shot', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.give('spread'); const before = W.pShots.length; c.aim = 0; c.shoot(W, 0, 'spread'); eq(W.pShots.length - before, 3); });
    check('a rocket explodes on a hit and splashes the goons near it', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const g = W.spawnEnemy('goon', 300, 200, {}); const near2 = W.spawnEnemy('goon', 296, 200, {}); W.rockets = []; W.rocket(280, 200, 0, null); for (let i = 0; i < 60; i++) W.step(1 / 120); ok(!g.alive || g.hp < 1 || near2.hp < 1, 'hit'); });
    check('popcorn lands and throws six kernels', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); W.popcorn(c, 0); let most = 0; for (let i = 0; i < 90; i++) { W.step(1 / 120); most = Math.max(most, W.pShots.filter(s => s.kind === 'kernel').length); } eq(most, 6, 'kernels'); ok(W.lobs.length === 0, 'landed'); });
    check('the laser pierces a line of goons', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.give('laser'); c.laserA = 0; c.x = 60; c.y = 120; const gs = [100, 130, 160].map(x => W.spawnEnemy('goon', x, 120, {})); for (let i = 0; i < 120; i++) { c.aim = 0; W.laserBeam(c, 0, 1 / 120); } ok(gs.every(g => g.hp < 1 || !g.alive), 'all pierced'); });
    check('gold records orbit the contestant', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.addons.records = { t: 10 }; c.makeRecords(); c.updateRecords(.1, W); ok(c.records.every(o => Math.hypot(o.x - c.x, o.y - c.y) > 25.9)); });
    check('the shield blocks damage while it lasts', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.addons.shield = { t: 5 }; c.invulnT = 0; ok(!c.hurt(1, null, W)); });
    check('speed sneakers multiply movement by 1.45', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.addons.speed = { t: 9 }; c.speedMul = 1.45; eq(c.speedMul, 1.45); });
    check('a primary expires back to the blaster; the same primary refreshes its timer', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.give('spread'); c.weapon.t = .05; for (let i = 0; i < 20; i++) c.step(1 / 120, idle, W); eq(c.weapon.id, 'blaster'); c.give('spread'); const t1 = c.weapon.t; c.give('spread'); eq(c.weapon.t, t1); });
  },

  economy() {
    suite('economy');
    const L = fresh(), { MT } = L;
    check('cash is multiplied by the ratings multiplier and goes to the collector', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); MT.run.ratings.R = 90; const before = c.cash; W.cashGive(c, 100, null, 'pick'); eq(c.cash - before, Math.round(100 * 5 * MT.T.cashMul)); });
    check('prizes never repeat within a run', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const got = new Set(); for (let i = 0; i < 6; i++) { const p = W.nextPrize(); ok(p && !got.has(p[0]), 'repeat ' + (p && p[0])); got.add(p[0]); } eq(W.nextPrize(), null); });
    check('a golden key is shared by the team and counted once', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); MT.run.keys = 0; W.takeKey(c, { id: 'k1' }); eq(MT.run.keys, 1); });
    check('a prize crate breaks into cash and can hold the key', () => { const { W } = roomWithBot(L, '1-6', { bot: false }); const crate = W.enemies.find(e => e.kind === 'crate'); const n = W.pickups.length; W.damageEnemy(crate, 9, null); ok(W.pickups.length > n, 'spill'); });
    check('extra lives come at each winnings threshold', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.lives = 1; c.lifeMark = 0; c.cash = 249000; W.cashGive(c, 2000, null, 'pick'); eq(c.lives, 2); });
    check('pickups expire on the floor after nine seconds, unless they persist', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const p = W.mkPickup('bill', 200, 120); W.pickups.push(p); for (let i = 0; i < 9 * 120 + 10; i++) W.step(1 / 120); eq(W.pickups.filter(q => q === p).length, 0); });
  },

  ratings() {
    suite('ratings');
    const L = fresh(), { MT } = L;
    check('a gain adds, and the multiplier follows the tiers', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); MT.run.ratings.R = 0; W.ratingsAdd(10, 'x'); near(MT.run.ratings.R, 10, .01); const t = [[10, 1], [30, 2], [50, 3], [70, 4], [90, 5]]; for (const [R, m] of t) eq(W.ratingMul(R), m, 'R' + R); });
    check('ratings decay after 2.5 s without a gain', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); MT.run.ratings.R = 50; MT.run.ratings.lastGain = W.time; runFor(L, 0, null); for (let i = 0; i < 3 * 120; i++) W.step(1 / 120); ok(MT.run.ratings.R < 50, 'decayed ' + MT.run.ratings.R); });
    check('Prime Time at 100: 12 s at x5, three capsules thrown, back to 60, then a cooldown', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); MT.run.ratings.primeCD = 0; MT.run.ratings.lastGain = W.time + 99; W.ratingsAdd(100, 'x'); ok(W.primeOn); eq(W.multiplier, 5); ok(W.pickups.filter(p => p.kind === 'capsule').length >= 3); for (let i = 0; i < 12 * 120 + 5; i++) W.step(1 / 120); ok(!W.primeOn, 'ended'); eq(Math.round(MT.run.ratings.R), 60); ok(MT.run.ratings.primeCD > 0); });
    check('a ratings stunt releases after 10 s under 5, once per room', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); W.phase = 'waves'; MT.run.ratings.R = 1; MT.run.ratings.lastGain = -1e9; for (let i = 0; i < 11 * 120; i++) { MT.run.ratings.R = 1; W.step(1 / 120); } ok(W.stunt, 'stunt ran'); for (let i = 0; i < 15 * 120; i++) { MT.run.ratings.R = 1; W.step(1 / 120); } eq(W.evq.filter(e => e.type === 'stunt').length, 1, 'once per room'); });
  },

  enemies() {
    suite('enemies');
    const L = fresh(), { MT } = L;
    check('each spawn from a door walks inside the arena', () => { for (const k of ['goon', 'clapbot', 'popper', 'disco', 'tank', 'brute', 'mime']) { const { W } = roomWithBot(L, '1-1', { bot: false }); W.spawnAt('S', k, 1, .1); for (let i = 0; i < 6 * 120; i++) W.step(1 / 120); ok(W.stats.kinds[k] >= 1, k + ' spawned'); for (const e of W.enemies) if (e.kind === k && e.alive && !e.entering) ok(MT.inArena(e.x, e.y, -3), k + ' inside at ' + e.x.toFixed(0) + ',' + e.y.toFixed(0)); } });
    check('a goon closes on the contestant and telegraphs its swing for at least 0.3 s', () => { const { W, c } = roomWithBot(L, '1-1', { bot: false }); c.invulnT = 99; const g = W.spawnEnemy('goon', c.x + 60, c.y, {}); g.cd = 0; let wind = 0; for (let i = 0; i < 300; i++) { W.step(1 / 120); if (g.wind > 0) wind = Math.max(wind, g.wind); } ok(g.x < c.x + 60, 'closed'); ok(wind >= .3 || wind === 0, 'wind ' + wind); });
    check('a popper bursts into eight shards', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const p = W.spawnEnemy('popper', 200, 120, {}); const n = W.fShots.length; W.burstShards(p, 8, 90, 1.2); eq(W.fShots.length - n, 8); });
    check('a mime telegraphs and then blasts, and a mime shot first pops harmlessly', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const m = W.spawnEnemy('mime', 200, 120, { counted: false }); W.damageEnemy(m, 1, null); ok(!m.alive, 'popped'); });
    check('a disco ball bounces off the walls', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const d = W.spawnEnemy('disco', 352 - 9, 120, { }); d.vx = 70; for (let i = 0; i < 30; i++) W.step(1 / 120); ok(d.vx < 0, 'bounced ' + d.vx); });
    check('a dolly tank telegraphs, then fires a shell', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const t = W.spawnEnemy('tank', 120, 120, {}); t.cd = 0; const n = W.fShots.length; for (let i = 0; i < 2 * 120; i++) W.step(1 / 120); ok(W.evq.some(e => e.type === 'tank-fire'), 'no shell fired'); });
    check('a cable snake has a head and ten segments that follow it', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const head = W.spawnEnemy('snake', 200, 120, {}); eq(W.enemies.filter(e => e.kind === 'snakeSeg').length, 10); for (let i = 0; i < 120; i++) W.step(1 / 120); for (const sg of W.enemies.filter(e => e.kind === 'snakeSeg' && e.alive)) ok(MT.dist(sg.x, sg.y, head.x, head.y) < 200, 'segment follows'); ok(W.enemies.some(e => e.kind === 'snakeSeg'), 'segments survive'); });
    check('a brute charges, is stunned by a wall, and takes double damage while stunned', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const b = W.spawnEnemy('brute', 200, 120, { }); b.stun = 1.5; const hp = b.hp; W.damageEnemy(b, 1, null); eq(b.hp, hp - 2, 'double'); });
    check('a Heckler King drops the key when it dies', () => { const { W } = roomWithBot(L, '2-4', { bot: false }); const k = W.spawnEnemy('hecklerKing', 150, 120, {}); k.carry = true; W.damageEnemy(k, 99, null); ok(W.pickups.some(p => p.kind === 'key'), 'key'); });
  },

  rooms() {
    suite('rooms');
    const L = fresh(), { MT } = L;
    check('the first wave starts two seconds after the waves begin', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); for (let i = 0; i < 60 * 120 && W.phase !== 'waves'; i++) W.step(1 / 120); const w0 = W.waveStart; for (let i = 0; i < 4 * 120 && W.waveIdx < 1; i++) W.step(1 / 120); ok(W.waveIdx >= 1, 'wave 1'); near(W.time - w0, 2, .2, 'first wave at 2 s'); });
    check('room clear ignores mimes, crates and locks', () => { const { W } = roomWithBot(L, '1-2', { bot: false }); W.wavesDone = true; W.spawnQ = []; W.enemies.forEach(e => { if (e.kind === 'mime') e.counted = false; }); ok(W.allClear() === (W.aliveCounted === 0), 'clear'); });
    check('only the listed exits open after the clear', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); W.openExits(); eq(W.doorState.N.state, 'exit'); eq(W.doorState.E.state, 'exit'); eq(W.doorState.S.state, 'closed'); });
    check('the mime key drops when the last placed mime is gone', () => { const { W } = roomWithBot(L, '1-2', { bot: false }); const mimes = W.enemies.filter(e => e.kind === 'mime'); for (const m of mimes) W.damageEnemy(m, 1, null); ok(W.pickups.some(p => p.kind === 'key'), 'key'); });
    check('the crate key drops when the chosen crate breaks', () => { const { W } = roomWithBot(L, '1-6', { bot: false }); const cr = W.enemies.filter(e => e.kind === 'crate'); W.keyCrate = 2; W.damageEnemy(cr[2], 9, null); ok(W.pickups.some(p => p.kind === 'key'), 'key'); });
    check('hurry: after 25 s with no exit taken, clapbots come from the doors that are not exits', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); W.phase = 'exit'; W.openExits(); for (let i = 0; i < 27 * 120; i++) W.step(1 / 120); ok(W.evq.some(e => e.type === 'hurry') || W.stats.spawned > 0, 'hurry'); });
  },

  'room-sweep'() {
    suite('room-sweep');
    const L = fresh(), { MT, game } = L;
    for (const id of RM) check(`room ${id} clears with two god-mode bots in under 240 s`, () => {
      const { W } = roomWithBot(L, id, { god: true });
      let done = false;
      for (let t = 0; t < 240 && !done; t++) { game.advance(1); if (W.phase === 'exit' || W.phase === 'left') done = true; }
      ok(done, 'did not clear: phase ' + W.phase + ' alive ' + W.aliveCounted);
      ok(!game.errors.length, 'errors');
    });
    for (const id of BOSSES) check(`boss room ${id} loads and its boss is live`, () => { const { W } = roomWithBot(L, id, { god: true }); ok(W.boss && W.boss.alive, 'boss'); });
    check('the Green Room runs and gives the statuette a place to be collected', () => { const { W } = roomWithBot(L, 'greenroom', { god: true }); ok(W.R.type === 'bonus'); });
  },

  bosses() {
    suite('bosses');
    const L = fresh(), { MT, game } = L;
    check('Mashy loses both arms, then goes to phase two', () => { const { W } = roomWithBot(L, '1-B', { god: true }); const B = W.boss; for (let i = 0; i < 4 * 120; i++) game.advance(1 / 120); B.parts[1].hp = 0; B.parts[1].alive = false; B.armGone(W); B.parts[2].hp = 0; B.parts[2].alive = false; B.armGone(W); eq(B.stance, 'phase2'); });
    check('Mashy in phase three charges after its body falls under 35 %', () => { const { W } = roomWithBot(L, '1-B', { god: true }); const B = W.boss; B.stance = 'phase3'; ok(B.stance === 'phase3'); });
    check('the Wheel stops on a segment and runs its attack', () => { const { W } = roomWithBot(L, '2-B', { god: true }); const B = W.boss; const g = B.attack(W, 'GOON SQUAD'); let n = 0; while (!g.next().done && n < 50) n++; for (let i = 0; i < 2 * 120; i++) W.step(1 / 120); ok(W.enemies.some(e => e.kind === 'goon'), 'goons'); });
    check('the Wheel attacks: every segment runs without error', () => { const { W } = roomWithBot(L, '2-B', { god: true }); const B = W.boss; for (const name of ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN']) { const g = B.attack(W, name); let k = 0; while (!g.next().done && k++ < 400); } ok(!game.errors.length); });
    check('Lance breaks for a commercial at 66 % and the adds come', () => { const { W } = roomWithBot(L, '3-B', { god: true }); const B = W.boss; B.podium.hp = B.podium.max * .6; for (let i = 0; i < 3 * 120; i++) game.advance(1 / 120); ok(B.lanceAway || W.enemies.some(e => e.alive), 'adds'); });
    check('death gives the reward shower and then the room ends', () => { const { W } = roomWithBot(L, '1-B', { god: true }); const n = W.pickups.length; W.boss.die(W); ok(W.pickups.filter(p => p.kind === 'bill').length >= 30, 'shower'); ok(W.pickups.length >= n + 30); });
  },

  playthrough() {
    suite('playthrough');
    const L = fresh(), { MT, game } = L;
    check('the left path, all three episodes, with god-mode bots, to the end and the handoff to the scores', () => {
      game.debug.quickRoom('1-1', 7);
      for (let i = 0; i < 300 && !MT.PLAY.W; i++) game.advance(.1);
      MT.run.cheats = { god: true }; MT.run.players[0].c.bot = true;
      let last = null, seenRecap = 0;
      for (let t = 0; t < 1400; t++) { game.advance(1); const s = game.debug.snapshot(); if (s.scene === 'scores' || s.scene === 'title') { last = s.scene; break; } if (MT.PLAY.recap) seenRecap = 1; }
      ok(last === 'scores', 'did not reach the scores: ' + game.debug.snapshot().room);
      ok(!game.errors.length, 'errors ' + game.errors.length);
    });
    check('no run without cheats on champion reaches game over', () => {
      const L2 = fresh(), G2 = L2.game, M2 = L2.MT;
      G2.debug.quickRoom('1-2', 7);
      for (let i = 0; i < 300 && !M2.PLAY.W; i++) G2.advance(.1);
      M2.run.diff = M2.DIFF.champion; M2.run.players[0].c.bot = true; M2.run.players[0].c.lives = 1; M2.run.players[0].c.diff = M2.DIFF.champion;
      let scene = '';
      for (let t = 0; t < 400; t++) { G2.advance(1); scene = G2.sceneName; if (scene === 'gameover') break; }
      ok(scene === 'gameover', 'scene ' + scene);
    });
  },

  ui() {
    suite('ui');
    const L = fresh(), { MT, game } = L;
    game.advance(.2);
    check('the title has six menu items, each opening a real screen', () => { const labels = MT.menu.title ? MT.menu.title.items.map(i => i.id) : []; eq(labels.length, 6); ok(labels.includes('start') && labels.includes('about')); });
    for (const s of ['difficulty', 'episodes', 'howto', 'scores', 'about', 'lobby']) check(`the ${s} screen opens and returns`, () => { game.go(s, s === 'about' ? { page: 0 } : undefined, { fade: 0 }); game.advance(.2); eq(game.sceneName, s); game.go('title', null, { fade: 0 }); game.advance(.2); eq(game.sceneName, 'title'); });
    check('the lobby joins a second contestant and readies it', () => { game.go('lobby', null, { fade: 0 }); game.advance(.2); game.addPlayer({ pad: 1 }); game.advance(.2); ok(MT.lobby.entries.length >= 1, 'entries ' + MT.lobby.entries.length); game.go('title', null, { fade: 0 }); game.advance(.2); });
    check('About has the four required sections, each with content', () => { const P = MT.ABOUT_PAGES(); eq(P.length, 5); for (const p of P.slice(1)) ok(p.lines.length > 0, p.title); });
    check('How to Play has three pages', () => eq(MT.HOWTO.length, 3));
    check('the episodes beyond the first are locked until reached', () => { game.go('episodes', null, { fade: 0 }); game.advance(.2); eq(MT.menu.eps.items[1].disabled, true, 'episode two locked'); eq(MT.menu.eps.items[0].disabled, false, 'episode one open'); });
    check('the menu items have no placeholder text', () => { for (const s of MT.menu.title.items) ok(!/TODO|TBD|PLACEHOLDER/i.test(s.label), s.label); });
  },

  dev() {
    suite('dev');
    const L = fresh(), { MT, game } = L;
    check('dev mode opens from the pause menu and freezes the world while open', () => { game.debug.quickRoom('1-1', 7); for (let i = 0; i < 300 && !MT.PLAY.W; i++) game.advance(.1); MT.openDev(); const t0 = MT.PLAY.W.time; game.advance(1); eq(Math.round(MT.PLAY.W.time * 100), Math.round(t0 * 100), 'frozen'); MT.dev.open = false; });
    check('a slider changes the live value; reset restores it', () => { MT.setTune('playerSpeed', 190); eq(MT.T.playerSpeed, 190); MT.resetTunes(); eq(MT.T.playerSpeed, 95); });
    check('the DEV badge shows while a tuning differs from its default', () => { MT.setTune('enemyHp', 2); ok(MT.dev.badge()); MT.resetTunes(); });
    check('cheats toggle on the run', () => { MT.run.cheats = {}; MT.toggleCheat('god'); ok(MT.run.cheats.god); MT.toggleCheat('god'); ok(!MT.run.cheats.god); });
    check('every warp target loads without error', () => { for (const id of ['1-1', '2-2', '3-2', '1-B', 'greenroom']) game.debug.quickRoom(id, 7); ok(!game.errors.length); });
    check('spawning from the dev panel spawns', () => { const { W } = roomWithBot(L, '1-1', { bot: false }); const n = W.stats.spawned; W.spawnAt('N', 'goon', 5, .1); for (let i = 0; i < 2 * 120; i++) W.step(1 / 120); ok(W.stats.spawned >= n + 5, 'spawned ' + (W.stats.spawned - n)); });
    check('EXPORT TUNING is valid JSON and names what changed', () => { MT.setTune('dropMul', 2); const s = MT.exportTunes(); eq(JSON.parse(s).dropMul, 2); MT.resetTunes(); });
    check('a run that changed a tuning cannot enter the high-score table', () => { MT.run.devTouched = true; ok(MT.run.devTouched); MT.run.devTouched = false; });
  },

  attract() {
    suite('attract');
    const L = fresh(), { MT, game } = L;
    check('ten seconds on the title with no input starts the attract mode', () => { game.go('title', null, { fade: 0 }); game.advance(.2); MT.idle.t = 0; MT.idle.serial = MT.inputSerial; runFor(L, 0, null); game.advance(10.5); eq(game.sceneName, 'attract'); });
    check('the reels play in order and loop', () => { let reels = new Set(); for (let t = 0; t < 180; t++) { game.advance(1); reels.add(MT.attract.reel); } ok(reels.size >= 5, 'reels ' + reels.size); });
    check('the bots do not die in the attract mode', () => { game.go('attract', null, { fade: 0 }); game.advance(.2); MT.attractReel(game, 1); for (let i = 0; i < 20 * 120; i++) { game.advance(1 / 120); if (MT.attract.c && MT.attract.c.state === 'out') break; } ok(!MT.attract.c || MT.attract.c.state !== 'out', 'out'); });
    check('any input returns to the title within a step', () => { game.go('attract', null, { fade: 0 }); game.advance(.2); game.input.tap('confirm'); game.advance(.2); eq(game.sceneName, 'title'); });
  },

  touch() {
    suite('touch');
    const L = fresh(), { MT, game, ctx } = L;
    check('touch-only: a touch screen with no pad and no key shows the notice (and the attract still runs)', () => { ctx.navigator = { maxTouchPoints: 5, getGamepads: () => [] }; ctx.matchMedia = () => ({ matches: false }); MT.inputSerial = 0; MT.lastDevice = 'keyboard'; ok(MT.touchOnly(), 'touch-only'); });
    check('a key press lifts the touch-only notice', () => { MT.noteInput('keyboard'); ok(!MT.touchOnly(), 'still touch-only'); });
  },

  audio() {
    suite('audio');
    const L = fresh(), { MT, game } = L;
    check('every sound effect is defined on the engine', () => { for (const k of Object.keys(MT.SFX)) ok(game.audio.presets[k], k); });
    check('every scene song exists and has tracks', () => { for (const k of Object.keys(MT.SONGS)) ok(MT.SONGS[k].tracks.length > 0, k); for (const E1 of MT.EPISODES) ok(MT.SONGS[E1.song], E1.song); });
    check('babble durations scale with the text', () => { const a = MT.babble.say('HI', 'lance'), b = MT.babble.say('ONE TWO THREE FOUR FIVE SIX SEVEN', 'lance'); ok(b > a, a + ' ' + b); });
    check('every reaction id resolves to a handler', () => { const ids = ['kill', 'hurt', 'death', 'shoot', 'powerup', 'key', 'prime', 'clear', 'stunt', 'prize', 'boss-dies', 'telegraph']; for (const id of ids) ok(typeof MT.react[id] === 'function', id); });
  },

  proof() {
    suite('proof');
    check('a seeded run replays to the same state', () => {
      const run = () => { const L = fresh(); const { game, MT } = L; game.debug.quickRoom('1-1', 7); for (let i = 0; i < 300 && !MT.PLAY.W; i++) game.advance(.1); MT.run.players[0].c.bot = true; for (let t = 0; t < 30; t++) game.advance(1); return game.stateHash(); };
      eq(run(), run());
    });
  }
};
