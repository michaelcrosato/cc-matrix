// contestant, weapons, economy and ratings suites
import { playRoom } from './core.test.mjs';
const quiet = w => { if (w.script) w.script.cancel(); for (const d of ['N', 'E', 'S', 'W']) w.arena.doors[d].queue.length = 0; w.timers.length = 0; for (const e of w.enemies) e.dead = true; w.enemies.length = 0; w.fShots.clear(); w.pickups.length = 0; };
export const suites = {
  contestant(t) {
    const P = playRoom(t, '1-1'), { MT, game, c } = P, w = P.w(), I = game.input; quiet(w);
    c.place(100, 120, 0); I.press('KeyD'); game.advance(1); I.release('KeyD'); game.advance(.02);
    t.check('the contestant walks at playerSpeed', Math.abs(c.x - (100 + MT.T.playerSpeed)) < 6, c.x);
    c.place(30, 120); I.press('KeyA'); game.advance(1.5); I.release('KeyA');
    t.check('walls stop it (and it never leaves the interior)', c.x >= MT.AR.X0 + 4, c.x);
    c.place(100, 120, 0); c.slideCD = 0; game.advance(.02); I.tap('slide'); game.advance(.03);
    const slid = c.slideT > 0; game.advance(.4);
    t.check('a slide dashes in the facing', slid && c.x > 140, [slid, c.x]);
    t.check('the slide has a cooldown', c.slideCD > 0, c.slideCD);
    c.place(200, 120); c.slideT = .2; const hp0 = c.hp; w.hurtContestant(c, 1, { kind: 'test' });
    t.check('the slide gives i-frames', c.hp === hp0); c.slideT = 0; c.invuln = 0;
    const R0 = w.ratings.R; w.ratings.R = 50; w.hurtContestant(c, 1, { kind: 'test', x: 190, y: 120 }); game.advance(.02);
    t.check('a hit costs 1 HP, gives invulnerability and ratings -12', c.hp === hp0 - 1 && c.invuln > 1 && Math.abs(w.ratings.R - 38) < 1, [c.hp, c.invuln, w.ratings.R]);
    t.check('the hit knocks it back', c.body.vx > 0 || c.x > 200, [c.x, c.body.vx]);
    w.hurtContestant(c, 1, {}); t.check('invulnerable after a hit', c.hp === hp0 - 1);
    const lives = c.pr.lives; c.invuln = 0; c.hp = 1; w.hurtContestant(c, 1, {});
    t.check('HP 0: mashed, a life lost', c.state === 'dead' && c.pr.lives === lives - 1, [c.state, c.pr.lives]);
    c.pr.bombs = 0; game.advance(2.2);
    t.check('two seconds later it drops in on a cable', c.state === 'drop' || c.state === 'play', c.state);
    game.advance(.7); t.check('the drop ends in play with invulnerability and a Showstopper', c.state === 'play' && c.invuln > 1 && c.pr.bombs >= 1 && c.hp === MT.maxHpNow(), [c.state, c.invuln, c.pr.bombs, c.hp]);
    c.pr.lives = 1; c.invuln = 0; c.hp = 1; w.hurtContestant(c, 1, {}); game.advance(2.3);
    t.check('out of lives: out', c.state === 'out', c.state);
    const bot = game.debug.addBot(); game.advance(.6);
    c.pr.cash = 10000; I.tap('start'); game.advance(.1);
    t.check('Start continues on its own: full lives, half the winnings', c.pr.lives === MT.startLivesNow() && c.pr.cash === 5000 && c.state !== 'out', [c.pr.lives, c.pr.cash, c.state]);
    game.advance(1.2); c.invuln = 0;
    w.contestants.splice(w.contestants.indexOf(bot), 1);
    // showboat: the formula and its cancel
    const g0 = w.ratings.R; w.ratings.R = 10; c.place(200, 120); c.boatCD = 0;
    for (let i = 0; i < 3; i++) w.spawnEnemy('goon', 200 + 40, 120 + i * 5, { inside: true });
    w.spawnEnemy('goon', 220, 120, { inside: true });
    for (const e of w.enemies) e.stunT = 9;
    I.tap('showboat'); game.advance(.75);
    const gain = w.ratings.R - 10;
    const want = (4 + 3 * 4 + 3 * 1) * MT.T.ratingsGain; t.check('showboat: (4 + 3n + 3m) × ratings gain (less the decay)', gain > want - 2.2 && gain <= want + .01, [gain, want]);
    w.ratings.R = 10; c.boatCD = 0; I.tap('showboat'); game.advance(.2); c.invuln = 0; w.hurtContestant(c, 1, {}); game.advance(.6);
    t.check('a hit during the pose cancels the gain', w.ratings.R < 10 - 5, w.ratings.R);
    // the showstopper
    c.invuln = 3; c.pr.bombs = 2; quiet(w); for (let i = 0; i < 5; i++) w.spawnEnemy('popper', 60 + i * 50, 60, { inside: true }); w.fireFoe('orb', 300, 200, 0, 50);
    I.tap('bomb'); game.advance(.1);
    t.check('a Showstopper uses stock, clears foe shots and kills small fry', c.pr.bombs === 1 && w.fShots.list.filter(b => b.data.kind === 'orb').length === 0 && w.enemies.filter(e => e.kind === 'popper').length === 0, [c.pr.bombs, w.fShots.list.length, w.enemies.length]);
    const n0 = MT.run.contestants.length, q = game.addPlayer({ pad: 2 }); game.advance(.2);
    t.check('a pad pressing Start drops in a new contestant', MT.run.contestants.length === n0 + 1 && MT.run.contestants[n0].state !== 'out', MT.run.contestants.length);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
  weapons(t) {
    const P = playRoom(t, '1-1'), { MT, game, c } = P, w = P.w(), I = game.input; quiet(w);
    c.place(60, 120, 0); I.press('ArrowRight'); game.advance(1); const n = w.pShots.list.length + 0; I.release('ArrowRight'); game.advance(.02);
    let fired = 0; const count = (sec) => { let k = 0; const f0 = w.pShots.list.length; return f0; };
    // fire rate: count shots over 2 s by watching new bullets
    game.advance(1); w.pShots.clear(); const seen = new Set(); I.press('ArrowRight'); for (let i = 0; i < 240; i++) { game.advance(1 / 120); for (const b of w.pShots.list) seen.add(b); } I.release('ArrowRight');
    t.check('the blaster fires at fireRate (±5%)', Math.abs(seen.size / 2 - MT.T.fireRate) <= MT.T.fireRate * .05 + .5, seen.size / 2);
    quiet(w); w.pShots.clear(); game.advance(.5);
    const fireFor = (s, dir = 'ArrowRight') => { const set = new Set(); I.press(dir); for (let i = 0; i < s * 120; i++) { game.advance(1 / 120); for (const b of w.pShots.list) set.add(b); } I.release(dir); game.advance(.02); return set; };
    w.addPickup(MT.makePickup('capsule', c.x, c.y, { wpn: 'spread' })); game.advance(.05);
    t.check('a capsule equips its weapon', c.weapon === 'spread' && c.wT > 13, [c.weapon, c.wT]);
    const sp = [...fireFor(.13)]; const angs = [...new Set(sp.map(b => Math.round(Math.atan2(b.vy, b.vx) * 100)))].sort((a, b) => a - b);
    t.check('the spread fires 3 bolts at -13°/0°/+13°', angs.length === 3 && Math.abs(angs[0] / 100 + .227) < .02 && Math.abs(angs[2] / 100 - .227) < .02, angs);
    w.addPickup(MT.makePickup('capsule', c.x, c.y, { wpn: 'spread' })); c.wT = 3; game.advance(.05);
    t.check('the same weapon refreshes its timer', c.wT > 13, c.wT);
    c.wT = .05; game.advance(.2); t.check('expiry goes back to the blaster', c.weapon === 'blaster');
    quiet(w); c.place(60, 120, 0); MT.giveItem(w, c, 'rockets');
    const g1 = w.spawnEnemy('goon', 160, 120, { inside: true }), g2 = w.spawnEnemy('goon', 172, 132, { inside: true }); g1.stunT = g2.stunT = 9; g1.hp = 4; g2.hp = 3;
    fireFor(.7); game.advance(.4);
    t.check('a rocket explodes with splash damage', g1.dead && g2.dead, [g1.hp, g2.hp]);
    quiet(w); MT.giveItem(w, c, 'popcorn'); c.place(60, 120, 0);
    const pc = w.spawnEnemy('goon', 150, 120, { inside: true }); pc.stunT = 9; pc.hp = 1.5;
    I.press('ArrowRight'); game.advance(.05); I.release('ArrowRight'); const bag = w.proj.find(p => p.kind === 'bag'); game.advance(.7);
    t.check('popcorn lobs a bag that lands and throws kernels', !!bag && pc.dead, [!!bag, pc.hp]);
    quiet(w); MT.giveItem(w, c, 'laser'); c.place(40, 120, 0); c.laserAng = null;
    const L = [0, 1, 2].map(i => { const e = w.spawnEnemy('goon', 100 + i * 40, 120, { inside: true }); e.stunT = 9; e.hp = 2; return e; });
    I.press('ArrowRight'); game.advance(.4); I.release('ArrowRight'); game.advance(.02);
    t.check('the laser pierces three goons in a line', L.every(e => e.dead), L.map(e => +e.hp.toFixed(2)));
    quiet(w); MT.giveItem(w, c, 'records'); c.place(200, 120);
    const rg = w.spawnEnemy('goon', 226, 120, { inside: true }); rg.stunT = 9; rg.hp = 2; w.fireFoe('orb', 200, 94, Math.PI / 2, 1);
    game.advance(1.2);
    t.check('gold records orbit, cut enemies and eat shots', rg.dead && w.fShots.list.length === 0, [rg.hp, w.fShots.list.length]);
    quiet(w); MT.giveItem(w, c, 'shield'); c.invuln = 0; const hp = c.hp; w.fireFoe('orb', c.x + 20, c.y, Math.PI, 120); game.advance(.4);
    t.check('the shield blocks damage', c.hp === hp, c.hp);
    quiet(w); c.addons.shield = 0; MT.giveItem(w, c, 'speed'); c.place(80, 120, 0); I.press('KeyD'); game.advance(.5); I.release('KeyD');
    t.check('sneakers give x1.45 speed', Math.abs((c.x - 80) - MT.T.playerSpeed * 1.45 * .5) < 5, c.x - 80);
    c.addons.speed = .01; game.advance(.1); t.check('add-ons expire', c.addons.speed === 0);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
  economy(t) {
    const P = playRoom(t, '1-1', { players: 2 }), { MT, game, c } = P, w = P.w(); quiet(w);
    const c2 = MT.run.contestants[1]; c2.ctl = 'local'; c2.input = null;
    w.ratings.R = 45; c.pr.cash = 0; c2.pr.cash = 0; c.place(100, 100); c2.place(300, 200);
    w.addPickup(MT.makePickup('stack', 100, 100)); game.advance(.05);
    t.check('cash × the multiplier goes to the collector only', c.pr.cash === 500 * 3 && c2.pr.cash === 0, [c.pr.cash, c2.pr.cash, w.ratings.X]);
    const names = []; for (let i = 0; i < 6; i++) names.push(MT.nextPrize(w).name);
    t.check('prizes never repeat within a table', new Set(names).size === 6, names);
    const k0 = MT.run.keys; w.addPickup(MT.makePickup('key', 300, 200)); game.advance(.05);
    t.check('keys are shared by the team', MT.run.keys === k0 + 1);
    quiet(w); for (let i = 0; i < 10; i++) w.addPickup(MT.makePickup('capsule', 50, 50 + i));
    const e = w.spawnEnemy('tank', 200, 120, { inside: true }); MT.T.dropMul = 5; for (let i = 0; i < 30; i++) MT.rollDrops(w, e); MT.T.dropMul = 1;
    t.check('at most 3 capsules on the floor from drops', w.pickups.filter(p => p.kind === 'capsule').length <= 10 && w.pickups.filter(p => p.kind === 'capsule').length - 10 <= 0);
    quiet(w); for (let i = 0; i < 40; i++) MT.rollDrops(w, Object.assign({}, e, { kind: 'mime' }));
    t.check('at most 25 cash pickups from drops', w.pickups.filter(p => MT.PICKUPS[p.kind].cashy).length <= 25, w.pickups.length);
    quiet(w); const p = w.addPickup(MT.makePickup('bill', 30, 200)); game.advance(7); const blink = p.ttl < 2.5 && p.ttl > 0; game.advance(2.5);
    t.check('pickups blink, then expire after 9 s', blink && !w.pickups.includes(p), [blink, p.ttl]);
    quiet(w); c.place(120, 120); const m = w.addPickup(MT.makePickup('bill', 160, 120)); w.phase = 'EXIT'; game.advance(.4);
    t.check('after a clear the magnet pulls cash in', m.dead || m.x < 155, m.x); w.phase = 'WAVES';
    quiet(w); const cr = w.addTarget('crate', 200, 120, { key: true }); w.keyDropped = false; w.damageTarget(cr, 3, { owner: c.netId });
    t.check('a crate breaks and spills cash (and its key)', cr.dead && w.pickups.some(q => q.kind === 'key') && w.pickups.filter(q => MT.PICKUPS[q.kind].cashy).length >= 3, w.pickups.map(q => q.kind));
    c.pr.cash = 249000; c.pr.nextLife = 0; const L0 = c.pr.lives; w.ratings.R = 0; w.credit(c, 2000);
    t.check('an extra life at $250,000', c.pr.lives === L0 + 1, [c.pr.cash, c.pr.lives]);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
  ratings(t) {
    const P = playRoom(t, '1-1'), { MT, game, c } = P, w = P.w(), Rt = w.ratings; quiet(w); c.godMode = true;
    Rt.R = 50; Rt.since = 0; game.advance(2); t.check('no decay for 2.5 s after a gain', Rt.R === 50, Rt.R);
    game.advance(2); t.check('then it decays at ratingsDecay a second', Rt.R < 50 && Rt.R > 50 - MT.T.ratingsDecay * 2.5, Rt.R);
    const tiers = [[10, 1], [30, 2], [50, 3], [70, 4], [90, 5]].every(([r, x]) => { Rt.R = r; return Rt.X === x; });
    t.check('the multiplier tiers: ×1 to ×5', tiers);
    Rt.R = 99; Rt.primeCD = 0; w.ratings.add(2, w); game.advance(.05);
    t.check('100 starts Prime Time (×5)', Rt.prime > 11 && Rt.X === 5, [Rt.prime, Rt.X]);
    t.check('the audience throws three capsules', w.pickups.filter(p => p.kind === 'capsule').length === 3, w.pickups.length);
    game.advance(12.2);
    t.check('after Prime Time the ratings are 60, with a cooldown', Rt.prime === 0 && Math.abs(Rt.R - 60) < 3 && Rt.primeCD > 15, [Rt.prime, Rt.R, Rt.primeCD]);
    Rt.R = 100; w.ratings.add(5, w); t.check('no second Prime Time during the cooldown', Rt.prime === 0);
    quiet(w); w.phase = 'WAVES'; Rt.R = 2; Rt.lowT = 0; Rt.stuntDone = false; Rt.since = 99; let stunt = false; const off = MT.on('ev:stunt', () => { stunt = true; });
    for (let i = 0; i < 11 * 4; i++) { game.advance(.25); Rt.R = Math.min(Rt.R, 2); }
    off();
    t.check('ratings under 5 for 10 s: the producers release a stunt', stunt && w.arena.pendingSpawns() + w.enemies.length > 0, [stunt, w.arena.pendingSpawns()]);
    t.check('the stunt happens once per room', Rt.stuntDone);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
};
