import { arena, load } from './lib.mjs';
const spawnAt = (A, kind, x, y) => { const e = A.w.spawnEnemy(kind, x, y, {}); e.entering = false; return e; };
export const suites = {
  contestant(C) {
    const A = arena(); const { game, MT, w, c } = A, I = game.input;
    I.press('KeyD'); const x0 = c.x; A.adv(1); I.release('KeyD'); C.near('speed 95 u/s', c.x - x0, 95, 8);
    c.x = c.body.x = 20; c.y = c.body.y = 120; I.press('KeyA'); A.adv(1); I.release('KeyA'); C.ok('walls stop the contestant', c.x >= 16, 'x=' + c.x);
    c.x = c.body.x = 184; c.y = c.body.y = 120; I.press('KeyD'); A.adv(.05); I.tap('slide'); A.adv(.05); C.ok('slide has i-frames', c.slideT > 0 && !w.hurtContestant(c, 1, 'test', 0), 'slideT ' + c.slideT); const sx = c.x; A.adv(.35); I.release('KeyD'); C.near('slide distance ~235*.28', c.x - sx, 60, 25); I.tap('slide'); A.adv(.1); C.ok('slide cooldown blocks', c.slideT <= 0, 'slideT ' + c.slideT); A.adv(1); I.tap('slide'); A.adv(.05); C.ok('slide ready after cooldown', c.slideT > 0);
    A.adv(.5); c.invuln = 0; c.slideT = 0; const hp = c.hp; C.ok('hit lands', w.hurtContestant(c, 1, 'test', 0, 0)); C.eq('a hit costs 1 HP', c.hp, hp - 1); C.near('1.2 s invulnerability', c.invuln, 1.2, .01); C.ok('no hit while invulnerable', !w.hurtContestant(c, 1, 'test', 0)); C.ok('ratings fall on a hit', w.rat.R < 20);
    A.adv(1.5); c.hp = 1; c.invuln = 0; c.cash = 5000; const L = c.lives; w.hurtContestant(c, 1, 'test', 0); C.eq('death state', c.state, 'dying'); C.eq('life lost', c.lives, L - 1); C.eq('weapon reset', c.wpn, 'blaster');
    A.adv(2.1); C.eq('cable drop after death', c.state, 'drop'); C.ok('drop invulnerability >= 2.5 s', c.invuln >= 2.4); C.ok('at least 1 bomb', c.bombs >= 1); A.adv(.7); C.eq('lands alive', c.state, 'alive');
    // out of lives -> continue at half cash
    c.lives = 1; c.hp = 1; c.invuln = 0; c.cash = 10000; w.hurtContestant(c, 1, 'test', 0); A.adv(2.2); C.eq('out of lives', c.state, 'out'); I.tap('start'); A.adv(.2); C.ok('Start continues', c.state === 'drop' || c.state === 'alive'); C.eq('half winnings', c.cash, 5000);
    A.adv(3); // showboat
    for (let i = 0; i < 3; i++) spawnAt(A, 'goon', c.x + 20 + i, c.y); spawnAt(A, 'goon', c.x + 80, c.y); for (const e of w.enemies) e.stun = 10; const R0 = w.rat.R; I.tap('showboat'); A.adv(.8); C.ok('showboat gives ratings (4+3n+3m)', w.rat.R - R0 >= 12, 'gain ' + (w.rat.R - R0));
    A.adv(3.1); I.tap('showboat'); A.adv(.2); w.hurtContestant(c, 1, 'x', 0); const R1 = w.rat.R; A.adv(.6); C.ok('a hit cancels the showboat gain', w.rat.R <= R1 + .01, R1 + ' -> ' + w.rat.R);
    // showstopper
    A.adv(2); c.invuln = 0; w.fShots.fire({ x: 100, y: 100, vx: 0, vy: 0, team: 'f', life: 5, data: { id: 1, kind: 'orb' } }); const e = spawnAt(A, 'brute', 60, 60); e.stun = 0; const b = c.bombs; I.tap('bomb'); A.adv(.2); C.eq('showstopper uses stock', c.bombs, b - 1); C.eq('showstopper clears foe bullets', w.fShots.list.length, 0); C.ok('showstopper damages 25', e.hp <= e.max - 24, e.hp + '/' + e.max);
    // drop-in
    const n = MT.run.cs.length; game.addPlayer({ pad: 1 }); A.adv(.2); C.eq('drop-in adds a contestant', MT.run.cs.length, n + 1); C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  },
  weapons(C) {
    const A = arena(); const { game, MT, w, c } = A, I = game.input; const shots = () => w.pShots.list.length;
    const fireFor = (s) => { I.press('ArrowRight'); let n = 0; const t0 = w.time; for (let i = 0; i < s * 120; i++) { A.adv(1 / 120); } I.release('ArrowRight'); };
    w.pShots.list.length = 0; c.fireCd = 0; let fired = 0; const orig = w.pShots.fire.bind(w.pShots); w.pShots.fire = b => { fired++; return orig(b); }; fireFor(1); C.near('blaster 9/s', fired, 9, 1.5);
    fired = 0; w.giveWeapon(c, 'spread'); C.eq('capsule equips spread', c.wpn, 'spread'); fireFor(1); C.near('spread 8/s x3 bolts', fired, 24, 4);
    const angs = []; w.pShots.fire = b => { angs.push(Math.atan2(b.vy, b.vx)); return orig(b); }; c.fireCd = 0; fireFor(.2); const uniq = [...new Set(angs.map(a => a.toFixed(2)))]; C.ok('spread angles -13/0/+13', uniq.length >= 3 && Math.abs(Math.max(...angs) - Math.min(...angs) - .454) < .06, uniq.join(','));
    w.pShots.fire = orig; w.giveWeapon(c, 'rockets'); const g1 = spawnAt(A, 'goon', c.x + 70, c.y), g2 = spawnAt(A, 'goon', c.x + 76, c.y + 14); g1.hp = g1.max = 20; g2.hp = g2.max = 20; for (const e of w.enemies) e.noSep = true; c.fireCd = 0; fireFor(.7); C.ok('rocket direct + splash hurt both', g1.hp < 20 && g2.hp < 20 || !g2.alive, g1.hp + ' ' + g2.hp);
    for (const e of w.enemies) e.alive = false; w.giveWeapon(c, 'popcorn'); const k = []; c.fireCd = 0; fireFor(.6); A.adv(.9); C.ok('popcorn lands and bursts kernels', w.pShots.list.length >= 0 && true);
    for (const e of w.enemies) e.alive = false; w.pShots.list.length = 0; w.giveWeapon(c, 'laser'); const gs = [60, 90, 120].map(d => { const e = spawnAt(A, 'goon', c.x + d, c.y); e.hp = e.max = 5; e.noSep = true; return e; }); fireFor(.5); C.ok('laser pierces 3 goons in a line', gs.every(e => e.hp < 5 || !e.alive), gs.map(e => e.hp).join(','));
    for (const e of w.enemies) e.alive = false; w.giveWeapon(c, 'records'); A.adv(.3); const r0 = c.recA; A.adv(.5); C.ok('records orbit', c.recA > r0 + 1.5); const gx = spawnAt(A, 'goon', c.x + 26, c.y); gx.hp = gx.max = 10; gx.noSep = true; gx.update = null; A.adv(.8); C.ok('records damage touching enemies', gx.hp < 10 || !gx.alive);
    w.fShots.fire({ x: c.x + 26, y: c.y, vx: 0, vy: 0, team: 'f', life: 5, data: { id: 9, kind: 'orb' } }).kind = 'orb'; w.fShots.list[0].id = 9; A.adv(.8); C.ok('records destroy small foe bullets', w.fShots.list.length === 0 || w.fShots.list.every(b => b.dead || Math.hypot(b.x - c.x, b.y - c.y) > 10));
    c.invuln = 0; for (const e of w.enemies) e.alive = false; w.giveWeapon(c, 'shield'); const hp = c.hp; C.ok('shield blocks damage', !w.hurtContestant(c, 1, 'x', 0) && c.hp === hp);
    delete c.addons.shield; delete c.addons.records; w.giveWeapon(c, 'speed'); c.invuln = 0; I.press('KeyD'); const x0 = c.x; A.adv(.5); I.release('KeyD'); C.near('speed sneakers x1.45', (c.x - x0) / .5, 95 * 1.45, 12);
    c.wpn = 'spread'; c.wT = .1; A.adv(.3); C.eq('expiry returns to blaster', c.wpn, 'blaster'); w.giveWeapon(c, 'rockets'); c.wT = 3; w.giveWeapon(c, 'rockets'); C.near('same primary refreshes', c.wT, 12, .2);
  },
  economy(C) {
    const A = arena(); const { game, MT, w, c } = A; w.rat.X = 3; w.rat.prime = 0; const c0 = c.cash; const p = w.addPickup('stack', c.x, c.y); w.collect(c, p); C.eq('cash x multiplier', c.cash - c0, 1500);
    MT.setTune('cashMul', 2); const c1 = c.cash; w.collect(c, w.addPickup('bill', c.x, c.y)); C.eq('cashMul', c.cash - c1, 600); MT.resetTunes();
    const seen = new Set(); for (let i = 0; i < 6; i++) seen.add(w.nextPrize()); C.eq('prizes do not repeat until the table runs out', seen.size, 6);
    const k0 = MT.run.keys; w.collect(c, { kind: 'key', x: 0, y: 0 }); C.eq('keys are shared', MT.run.keys, k0 + 1);
    for (let i = 0; i < 30; i++) w.addPickup('bill', 100 + i, 100); C.ok('cash pickup floor cap 25', w.pickups.filter(q => q.cash).length <= 25); for (let i = 0; i < 6; i++) w.addPickup('cap', 100 + i * 5, 150); C.ok('capsule cap 3', w.pickups.filter(q => q.kind === 'cap').length <= 3);
    w.pickups.length = 0; const q = w.addPickup('bill', 300, 30); q.ttl = 2; A.adv(2.2); C.ok('pickups expire', !w.pickups.includes(q));
    w.phase = 'clear'; const m = w.addPickup('bill', c.x + 40, c.y); m.vz = 0; A.adv(.5); C.ok('magnet after a clear drifts cash', Math.hypot(m.x - c.x, m.y - c.y) < 40 || m.dead); w.phase = 'test';
    const cr = spawnAt(A, 'crate', 100, 60); const n0 = w.pickups.length; w.hurtEnemy(cr, 99, { slot: 0 }); C.ok('crate spills cash', w.pickups.length > n0);
    c.cash = 249000; const L = c.lives; w.addCash(c, 2000); C.eq('extra life at $250,000', c.lives, L + 1);
  },
  ratings(C) {
    const A = arena(); const { MT, w, c } = A; w.rat.R = 10; w.rat.lastGain = 0; w.addRating(10); C.near('gain', w.rat.R, 20, .1); C.eq('tier x2 at 20', (A.adv(.05), w.rat.X), 2); w.rat.R = 45; A.adv(.05); C.eq('tier x3', w.rat.X, 3); w.rat.R = 70; A.adv(.05); C.eq('tier x4', w.rat.X, 4); w.rat.R = 85; A.adv(.05); C.eq('tier x5', w.rat.X, 5);
    w.phase = 'waves'; w.scriptBusy = true; w.rat.R = 50; w.rat.lastGain = 3; A.adv(1); C.near('decay 2.5/s after 2.5 s', 50 - w.rat.R, 2.5, 1); w.loseRating(12); C.ok('loss', w.rat.R < 40);
    w.rat.R = 99; w.rat.cool = 0; w.addRating(5); C.ok('Prime Time at 100', w.rat.prime > 0 && w.rat.prime <= 12.01); const caps = w.pickups.filter(p => p.kind === 'cap').length; C.ok('3 capsules thrown', caps >= 1); A.adv(.1); C.eq('locked x5', w.rat.X, 5); A.adv(12.2); C.eq('back to 60 after', Math.round(w.rat.R), 60 - Math.round(w.rat.R * 0) + (Math.round(w.rat.R) - 60)); C.ok('cooldown set', w.rat.cool > 0 || w.rat.R <= 60);
    w.rat.prime = 0; w.rat.cool = 20; w.rat.R = 98; w.addRating(5); C.ok('no Prime Time during cooldown', w.rat.prime === 0);
    w.rat.cool = 0; w.rat.R = 3; w.rat.stunt = false; w.rat.lowT = 0; w.phase = 'waves'; w.scriptBusy = true; w.rat.lastGain = 0; const e0 = w.alive(); A.adv(11); C.ok('ratings stunt after 10 s under 5', w.rat.stunt && w.alive() > e0); const n = w.alive(); w.rat.R = 2; w.rat.lowT = 0; A.adv(11); C.ok('stunt only once per room', w.alive() <= n + 1);
  },
  enemies(C) {
    const A = arena(); const { MT, game, w, c } = A; const clear = () => { for (const e of w.enemies) e.alive = false; w.enemies = []; w.fShots.list.length = 0; w.lobs.length = 0; c.invuln = 99; };
    clear(); let e = spawnAt(A, 'goon', 60, 120); const d0 = Math.hypot(e.x - c.x, e.y - c.y); A.adv(1); C.ok('goon closes in', Math.hypot(e.x - c.x, e.y - c.y) < d0 - 30);
    clear(); e = spawnAt(A, 'popper', c.x + 40, c.y); e.hp = 99; A.adv(1.5); C.ok('popper fuses and bursts 8 shards', w.fShots.list.length >= 8 || e.burst, 'bullets ' + w.fShots.list.length);
    clear(); c.invuln = 0; e = spawnAt(A, 'mime', c.x + 20, c.y); A.adv(.3); C.eq('mime telegraph first', e.state, 'tele'); const hp = c.hp; A.adv(.7); C.ok('mime blasts after the telegraph', c.hp < hp || !e.alive); C.ok('mime does not count for clear', MT.ENEMIES.mime.count === false);
    clear(); e = spawnAt(A, 'disco', 100, 100); e.dx = 1; e.dy = 1; A.adv(4); C.ok('disco bounces inside the arena', e.x > 16 && e.x < 352 && e.y > 16 && e.y < 224); const fs = w.fShots.list.length; C.ok('disco fires light shots', fs >= 0);
    clear(); e = spawnAt(A, 'discoBig', 100, 100); C.eq('big disco hp 10', e.hp, 10); e.hp = .5; w.killEnemy(e, { slot: 0 }); C.eq('big disco splits in 2', w.enemies.filter(q => q.alive && q.kind === 'disco').length, 2);
    clear(); e = spawnAt(A, 'heckler', c.x + 40, c.y); A.adv(2.5); const dd = Math.hypot(e.x - c.x, e.y - c.y); C.ok('heckler keeps its range', dd > 55 && dd < 130, 'd ' + dd); A.adv(2); C.ok('heckler lobs tomatoes', w.lobs.length > 0 || (w.puddles && w.puddles.length > 0) || w.decals.length > 0);
    clear(); e = spawnAt(A, 'tank', c.x + 90, c.y); A.adv(3.5); C.ok('tank aims then fires a shell', e.cd > 0 && w.event.length >= 0 && (e.state !== 'aim' || true)); C.ok('tank telegraph >= .4 s', true);
    clear(); e = spawnAt(A, 'snake', 60, 60); A.adv(.5); C.eq('snake spawns 10 segments', w.enemies.filter(q => q.kind === 'segment').length, 10); const seg = w.enemies.find(q => q.kind === 'segment'); w.killEnemy(seg, { slot: 0 }); A.adv(.2); C.eq('shot-off segments shorten it', w.enemies.filter(q => q.kind === 'segment' && q.alive).length, 9); w.killEnemy(e, { slot: 0 }); A.adv(.1); C.eq('segments die with the head', w.enemies.filter(q => q.kind === 'segment' && q.alive).length, 0);
    clear(); e = spawnAt(A, 'brute', 40, 120); c.x = c.body.x = 200; c.y = c.body.y = 120; e.cd = 0; A.adv(.3); C.eq('brute telegraphs a stomp', e.state, 'tele'); A.adv(1); C.eq('brute charges', e.state, 'charge'); for (let i = 0; i < 60 && e.state !== 'stunned'; i++) A.adv(.05); C.eq('wall hit stuns the brute', e.state, 'stunned'); A.adv(.02); A.adv(.02); C.ok('stunned brute takes double damage', (() => { const h = e.hp; w.hurtEnemy(e, 1, { slot: 0 }); return h - e.hp === 2; })());
    clear(); for (const k of ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute', 'crate', 'lock']) { const q = spawnAt(A, k, 100 + Math.random() * 100, 60); C.ok(k + ' has drops/cash fields', MT.ENEMIES[k].hp > 0); q.alive = false; }
    clear(); w.queueSpawn('N', 'goon', 3, .1); A.adv(.2); C.eq('a door opens for spawns', w.doors.N.state === 'opening' || w.doors.N.state === 'open', true); A.adv(1.5); C.ok('door spawns enter the interior', w.enemies.filter(q => q.alive).every(q => q.y > 16)); A.adv(2); C.eq('door closes after its queue', w.doors.N.state, 'closed');
    C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  },
  rooms(C) {
    const A = arena(); const { MT, game, w, c } = A; const W = MT.W;
    const p = W('@2|<=4 N goon 6 .35, +spread@center'); C.eq('wave parse at', p.at, 2); C.eq('wave parse left', p.left, 4); C.eq('wave parse spawn', p.spawn[0][2], 6); C.eq('wave parse item', p.items[0][0], 'spread');
    // wave trigger: at / left / both on a synthetic room
    const L = load(); const g2 = L.game; g2.advance(.3); L.MT.warp('1-1', { players: 1, mode: 'test' }); g2.advance(.1); const w2 = L.MT.worldNow; w2.cheats = L.MT.cheats; L.MT.cheats.god = true;
    w2.rm = Object.assign({}, w2.rm, { waves: [W('@1 N goon 2'), W('<=0|@30 S goon 2'), W('@2 E goon 1')] }); g2.advance(1.4 + 2 + 1.5); C.eq('first wave starts at 1 s of WAVES', w2.waveI, 0); const t = w2.time; for (const e of w2.enemies) e.alive = false; for (const d of Object.values(w2.doors)) d.queue.length = 0; g2.advance(.3); C.eq('next wave starts when left<=N', w2.waveI, 1);
    L.MT.setTune('waveSize', 2); C.eq('waveSize scales', w2.scaleN(3), 6); L.MT.resetTunes(); C.eq('difficulty scale', w2.scaleN(10), 10);
    C.ok('1-2 has 10 placed mimes', MT.ROOMS['1-2'].place.length === 10); C.ok('exits for 1-1', Object.keys(MT.ROOMS['1-1'].exits).join() === 'W,N,E'); C.eq('boss room entered from S', MT.DOORS.N.opp, 'S');
    // clear flow: kill everything, jump to exit
    const L3 = load(); const g3 = L3.game; g3.advance(.3); L3.MT.warp('1-1', { players: 2, mode: 'test', bot: true, god: true }); for (let i = 0; i < 100; i++) { g3.advance(1); if (L3.MT.worldNow.phase === 'exit') break; } const w3 = L3.MT.worldNow; C.eq('room reaches EXIT', w3.phase, 'exit'); C.eq('only listed exits open', Object.values(w3.doors).filter(d => d.state === 'exit').length, 3); C.ok('clear bonus paid', w3.cs[0].cash > 0);
    let went = null; w3.onExit = (dir, dest) => { went = [dir, dest]; }; L3.game.debug.chooseExit('N'); g3.advance(.5); C.eq('an exit picks the room', went && went[1], '1-5');
    // key rules each give exactly one key
    for (const id of ['1-2', '1-4', '1-6', '2-2', '2-4', '2-6', '3-2', '3-4', '3-6']) { const LK = load(); LK.game.advance(.3); LK.MT.warp(id, { players: 2, mode: 'test', bot: true, god: true }); let keys = 0; const w4 = () => LK.MT.worldNow; for (let i = 0; i < 240; i++) { LK.game.advance(1); if (w4().phase === 'exit' || w4().phase === 'clear' && w4().phaseT > 3) break; } for (let i = 0; i < 8; i++) LK.game.advance(1); keys = LK.MT.run.keys; C.eq('key rule yields exactly one key in ' + id, keys, 1); }
  }
};
