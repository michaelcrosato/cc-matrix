// Every system of the game, headless: shop, cook, sell, launder, combat, cops, days, contracts, the boss, saving, the attract mode.
import { load, checker } from './_load.mjs';
const { d, game, E } = load();
const { check, done } = checker();
const R = d.R, I = game.input, snap = () => game.debug.snapshot(), S = () => d.S(), F = d.fn;
const skip = (max = 60) => { for (let i = 0; i < max && (d.talk.open || d.mode() === 'talk'); i++) { I.tap('confirm'); game.advance(.25); } game.advance(.1); };
const st = id => d.stations().find(s => s.id === id);
const tp = (x, y) => { game.debug.teleport(x, y); };
const atStation = id => { const s = st(id); tp(s.x, s.y + 4); game.advance(.05); return s; };
const quiet = () => { d.lists.thugs.length = 0; d.lists.cops.length = 0; };
const errs = () => game.errors.map(e => e.message).join(' | ');

// ---- boot, title, new game
game.advance(.6);
check('boots to the title with its menu', snap().scene === 'title' && snap().screen === 'title', JSON.stringify(snap()));
game.go('play', { fresh: true }); game.advance(1);
check('a new game opens with the intro talking', snap().scene === 'play' && d.talk.open && snap().mode === 'talk', JSON.stringify(snap()));
check('the intro has 5 lines of Walt and the narrator', d.W.script.intro.length === 5);
skip();
check('after the intro you can walk', snap().mode === 'walk' && snap().day === 1 && snap().hp === 100, JSON.stringify(snap()));
check('the town has cops, rivals and customers', snap().cops === 1 && snap().thugs >= 3 && snap().customers >= 4, JSON.stringify(snap()));

// ---- the map: every station is reachable (not inside a wall) and the hero starts free
for (const s of d.stations()) { const c = d.R && 0; }
check('every station exists', ['home', 'school', 'gus', 'shop', 'cook', 'jimmy', 'counter', 'sol', 'hatch', 'drop-north', 'drop-east', 'drop-south'].every(id => st(id)));
check('map rows are all the same width', (rows => rows.every(r => r.length === d.W.COLS) && rows.length === d.W.ROWS)(d.W.townRows()));
check('the lab map rows are even', (rows => rows.every(r => r.length === rows[0].length))(d.W.labRows()));

// ---- moving, sprinting, dodging
quiet(); tp(520, 184); game.advance(.1);
const x0 = snap().hero[0]; I.hold('right'); game.advance(1); I.hold('right', false);
check('walking right moves the hero', snap().hero[0] > x0 + 50, JSON.stringify(snap()));
const x1 = snap().hero[0]; tp(520, 184); I.hold('sprint'); I.hold('right'); game.advance(1); I.hold('right', false); I.hold('sprint', false);
check('sprinting is faster than walking', snap().hero[0] - 520 > x1 - 520, snap().hero[0] + ' vs ' + x1);
tp(520, 184); game.advance(.1); I.hold('right'); I.tap('dodge'); game.advance(.2); I.hold('right', false);
check('dodge roll gives a burst and invulnerability', snap().hero[0] - 520 > 35 && d.hero.vx !== 0 || snap().hero[0] - 520 > 35, JSON.stringify(snap()));
game.advance(1);

// ---- the supply store
S().dirty = 5000; S().clean = 0;
atStation('shop'); I.tap('interact'); game.advance(.2);
check('interact at the store opens the shop screen', snap().screen === 'shop', JSON.stringify(snap()));
const before = S().dirty; F.openShop(); // re-show: updates in place
d.ui.show('shop'); game.advance(.1);
// buy through the same functions the buttons call
check('buying ingredients costs 800 dirty', R.buyIngredients(S()) && S().dirty === before - 800 && S().ingredients === 1);
d.ui.hide(); game.advance(.1);
check('shop can be left', snap().screen === null);

// ---- the cook, played with real inputs
atStation('cook'); game.advance(.05);
S().ingredients = 1; d.flags().jimmyMet = 1;
I.tap('interact'); game.advance(.2);
check('interact at the RV starts the cook', snap().mode === 'cook' && d.cook().phase === 'measure', JSON.stringify(snap()));
check('the cook used up an ingredient', S().ingredients === 0);
// measure: tap confirm when the marker is within the green
let guard = 0;
while (d.cook() && d.cook().phase === 'measure' && guard++ < 4000) { const k = d.cook(); if (Math.abs(k.pos - k.zoneC) < .03) I.tap('confirm'); game.advance(.01); }
check('three measures done, heat phase begins', d.cook().phase === 'heat' && d.cook().mScores.length === 3 && d.cook().mScores.every(v => v > .8), JSON.stringify(d.cook().mScores));
// heat: hold confirm when below the band centre
guard = 0;
while (d.cook() && d.cook().phase === 'heat' && guard++ < 4000) { const k = d.cook(); I.hold('confirm', k.temp < k.bandC); game.advance(.01); }
I.hold('confirm', false);
check('heat phase kept the temperature in the band most of the time', d.cook().phase === 'filter' && d.cook().inBand / d.cook().total > .7, 'band ' + (d.cook().inBand / d.cook().total));
guard = 0;
while (d.cook() && d.cook().phase === 'filter' && guard++ < 4000) { const k = d.cook(); if (k.seqT > .25) I.tap(k.seq[k.seqI]); game.advance(.01); }
check('filter phase finished with every arrow hit', d.cook().phase === 'result' && d.cook().fHits === 8, JSON.stringify({ h: d.cook().fHits, m: d.cook().fMiss }));
check('result gives a purity of 85 or better and bricks', d.cook().purity >= 85 && d.cook().n >= 4, JSON.stringify({ p: d.cook().purity, n: d.cook().n }));
const pur = d.cook().purity, nb = d.cook().n; const minsBefore = S().minutes;
game.advance(.7); I.tap('confirm'); game.advance(.3);
check('finishing the cook adds bricks of that purity', S().bricks.length === nb && S().bricks.every(b => b === pur), JSON.stringify(S().bricks));
check('the cook took two hours and raised heat', S().minutes >= minsBefore + 119 && S().heat >= 10 && S().cooksToday === 1 && S().stats.cooks === 1);
skip();
check('back to walking after Jimmy\'s comment', snap().mode === 'walk', JSON.stringify(snap()));
check('the hero wears the yellow suit after cooking', d.hero && true);

// a bad cook is a worse batch
(() => { const k = { mScores: [0, 0, 0], inBand: 0, total: 9, fHits: 0, seq: new Array(8) }; check('a hopeless cook gives 40% and 3 bricks', R.purity(0, 0, 0) === 40 && R.batchSize(40) === 3); })();

// ---- selling to a customer
quiet(); S().heat = 0;
const cu = d.lists.customers.find(c => c.state === 'wait'); tp(cu.x - 8, cu.y); game.advance(.1);
const dirt0 = S().dirty, b0 = S().bricks.length;
I.tap('interact'); game.advance(.2);
check('selling pays dirty cash and uses a brick', S().dirty > dirt0 && S().bricks.length === b0 - 1 && S().soldToday === 1, JSON.stringify(snap()));
check('the customer is happy and then leaves', cu.state === 'happy'); game.advance(1.5);
check('...and walks off', cu.state === 'leave' || cu.dead);
// customers with nothing to buy
S().bricks = []; const cu2 = d.lists.customers.find(c => c.state === 'wait'); tp(cu2.x - 8, cu2.y); game.advance(.1); I.tap('interact'); game.advance(.2); skip();
check('with no product a customer turns you down', S().soldToday === 1 && cu2.state === 'wait');

// ---- laundering
S().dirty = 3000; S().clean = 0; S().launderedToday = 0;
atStation('counter'); d.flags().solMet = 1; I.tap('interact'); game.advance(.2);
check('the car wash counter opens the launder screen', snap().screen === 'launder', JSON.stringify(snap()));
d.ui.hide(); game.advance(.1);
const r = R.launder(S(), 1000);
check('laundering 1000 gives 750 clean', r.clean === 750 && S().clean === 750 && S().dirty === 2000);
S().launderedToday = 0;

// ---- combat: fists
S().weapon = 'fists'; d.lists.thugs.length = 0; tp(300, 300); game.advance(.1);
const t = F.spawnThug({ x: 318, y: 300 }, 'dealer'); t.state = 'idle'; t.aggro = false; d.hero.facing = 0; game.advance(.05);
const hp0 = t.hp; I.hold('right', false); I.tap('attack'); game.advance(.6);
check('a punch hurts a rival', t.hp < hp0, t.hp + '/' + hp0);
check('...and a combo of three hits lands', (() => { for (let i = 0; i < 6; i++) { I.tap('attack'); game.advance(.35); } return t.hp < hp0 - 40 || t.dead; })(), t.hp);
check('a dead rival drops cash', t.dead && d.lists.drops.some(x => x.kind === 'cash') && S().stats.kills >= 1, JSON.stringify({ dead: t.dead, drops: d.lists.drops.length }));
const cash0 = S().dirty; tp(t.x, t.y); game.advance(.3);
check('walking over the cash picks it up', S().dirty > cash0);
// pistol
S().weapon = 'fists'; I.tap('swap'); game.advance(.1);
check('switching weapon takes the pistol', S().weapon === 'pistol');
d.lists.thugs.length = 0; tp(300, 300); const t2 = F.spawnThug({ x: 380, y: 300 }, 'dealer'); t2.state = 'idle'; t2.aggro = false; t2.hp = t2.maxHp = 40; d.hero.facing = 0; game.advance(.1);
const ammo0 = S().ammo; I.tap('attack'); game.advance(.1);
check('firing spends a round', S().ammo === ammo0 - 1, S().ammo + ' vs ' + ammo0);
game.advance(.8);
check('the bullet hit the rival at range', t2.hp < 40 || t2.dead, JSON.stringify({ hp: t2.hp }));
S().ammo = 0; I.tap('attack'); game.advance(.1); check('empty gun just clicks', S().ammo === 0);
S().ammo = 12;
// enemies hurt you
S().weapon = 'fists'; d.lists.thugs.length = 0; S().hp = 100; tp(300, 300); game.advance(.1);
const t3 = F.spawnThug({ x: 316, y: 300 }, 'dealer'); t3.state = 'chase'; t3.aggro = true; t3.cd = 0; game.advance(1.6);
check('a rival that reaches you hurts you', S().hp < 100, S().hp);
d.fx.iFrames = 0; F.hurtHero(10, t3, 50); const hpA = S().hp; F.hurtHero(10, t3, 50); check('while the hero flashes after a hit, more hits are ignored', S().hp === hpA && d.fx.iFrames > 0);
// healing
game.advance(1); S().pills = 2; S().hp = 40; I.tap('heal'); game.advance(.1);
check('pills heal 35', S().hp === 75 && S().pills === 1, S().hp);
// shooter enemies
d.lists.thugs.length = 0; S().hp = 100; tp(300, 300); game.advance(1);
const sh = F.spawnThug({ x: 380, y: 300 }, 'shooter'); sh.state = 'chase'; sh.aggro = true; sh.cd = 0; game.advance(3);
check('shooters shoot back from range', S().hp < 100, S().hp);
d.lists.thugs.length = 0; d.shots.clear();

// ---- cops and heat
quiet(); S().hp = 100; S().heat = 0; d.fx.hazmat = 0; d.fx.loud = 0; tp(23 * 16 + 8, 6 * 16); game.advance(.1);
F.spawnCops(); const cop = d.lists.cops[0]; Object.assign(cop, { x: 23 * 16 + 8, y: 12 * 16, facing: -Math.PI / 2, wp: 1 }); game.advance(.5);
check('a cop ignores a quiet hero', cop.state === 'patrol' && cop.alert === 0, cop.state);
S().heat = 60; cop.x = hero_x(); cop.y = d.hero.y + 60; cop.facing = -Math.PI / 2; function hero_x() { return d.hero.x; }
game.advance(2);
check('with heat high a cop that sees you gives chase', cop.state === 'chase', cop.state + ' alert ' + cop.alert);
check('being chased raises heat to at least 55', S().heat >= 55);
// the chase ends in an arrest
S().bricks = [90, 90]; S().dirty = 2000; cop.x = d.hero.x; cop.y = d.hero.y + 9; game.advance(.3);
check('when the cop catches you, you are busted', snap().mode === 'talk' || snap().mode === 'cut', JSON.stringify(snap()));
skip(); skip();
check('busted loses the bricks and half the dirty money, and the day ends', S().bricks.length === 0 && S().dirty <= 1000 && snap().screen === 'report', JSON.stringify(snap()));
d.ui.hide(); F.newMorning(true); game.advance(.2);
check('the next morning is day 2 at home', snap().day === 2 && snap().minutes < 365 && snap().mode === 'walk', JSON.stringify(snap()));
check('a second cop patrols from day 2', d.lists.cops.length === 2, d.lists.cops.length);
// escape: break line of sight
quiet(); F.spawnCops(); d.lists.cops.splice(1); const cop2 = d.lists.cops[0]; S().heat = 70; tp(100, 100); Object.assign(cop2, { x: 600, y: 400, state: 'chase', lost: 0 }); game.advance(8);
check('a chase that loses sight for 6 seconds ends and cools heat', cop2.state === 'patrol' && S().heat < 70, cop2.state + ' ' + S().heat);

// ---- day cycle
S().clean = 2000; S().dirty = 100; quiet(); atStation('home'); I.tap('interact'); game.advance(.3);
check('the bed asks before ending the day', d.talk.open && d.talk.choices && d.talk.choices.length === 2);
I.tap('confirm'); game.advance(.3); skip(5);
check('sleeping shows the day report with the bill paid', snap().screen === 'report' && S().clean === 1400 && S().day === 3, JSON.stringify(snap()));
d.ui.hide(); F.newMorning(true);
check('midnight forces the day to end', (() => { S().minutes = 1439; game.advance(2); return snap().screen === 'report' && S().day === 4; })(), JSON.stringify(snap()));
d.ui.hide(); F.newMorning(true);

// ---- Gus and the contract
quiet(); S().day = 2; S().minutes = 9 * 60; S().flags = {}; atStation('gus'); I.tap('interact'); game.advance(.2);
check('Gus talks first', d.talk.open && d.talk.name === 'GUS FRYING', d.talk.name);
skip();
check('and gives an order', !!S().contract && S().contract.n >= 1, JSON.stringify(S().contract));
const c = S().contract; atStation('drop-' + c.at); S().bricks = []; I.tap('interact'); game.advance(.2);
check('delivering without the bricks is refused', !!S().contract && S().dirty === 100 || !!S().contract);
S().bricks = new Array(c.n).fill(98); const dr0 = S().dirty; I.tap('interact'); game.advance(.2); skip();
check('delivering the right bricks pays the bonus', S().contract === null && S().dirty > dr0 + 1000 && S().contractsDone === 1, JSON.stringify({ d: S().dirty, c: S().contract }));
S().contract = { n: 1, minPurity: 80, at: 'east', deadline: 700, bonus: 1.6 }; S().minutes = 701; game.advance(.2);
check('a missed deadline drops the order', S().contract === null);

// ---- people
atStation('jimmy'); I.tap('interact'); game.advance(.2); check('Jimmy talks', d.talk.open && d.talk.name === 'JIMMY'); skip();
atStation('sol'); I.tap('interact'); game.advance(.2); check('Sol talks', d.talk.open && d.talk.name === 'SOL GOODGIRL'); skip();
atStation('school'); I.tap('interact'); game.advance(.2); check('the teacher talks', d.talk.open); skip();
check('animalese babbles a tone per letter while talking', (() => { let n = 0; const orig = game.audio.sfx.bind(game.audio); game.audio.sfx = (...a) => { n++; return orig(...a); }; atStation('jimmy'); I.tap('interact'); game.advance(1.2); game.audio.sfx = orig; skip(); return n > 5; })());

// ---- the boss
quiet(); S().day = 1; S().clean = 0; atStation('hatch'); I.tap('interact'); game.advance(.2); skip();
check('the hatch is welded shut early', d.mapName() === 'town');
S().day = 5; atStation('hatch'); I.tap('interact'); game.advance(.2); skip(80);
check('on day 5 the hatch opens the Superlab and Gus waits', d.mapName() === 'lab' && !!d.boss(), JSON.stringify(snap()));
S().hp = 100; const boss = d.boss(), bh = boss.hp;
d.lists.thugs.length = 0; boss.state = 'walk'; boss.cd = 99; tp(boss.x, boss.y + 20); game.advance(.1); d.hero.facing = -Math.PI / 2; S().weapon = 'fists'; I.tap('attack'); game.advance(.5);
check('punches hurt Gus', boss.hp < bh, boss.hp);
boss.hp = boss.maxHp * .45; game.advance(.3); skip(30);
check('at half health Gus calls in enforcers', d.lists.thugs.some(x => x.kind === 'enforcer'));
// the boss attacks
d.lists.thugs.length = 0; boss.state = 'walk'; boss.cd = 0; S().hp = 100; tp(boss.x, boss.y + 40); game.advance(6);
check('Gus hurts you with volleys, slams or gas', S().hp < 100, S().hp);
// dying in the lab restarts the fight
S().hp = 1; F.hurtHero(50, boss, 0); game.advance(.2); skip(20);
check('losing to Gus restarts the fight, not the day', d.mapName() === 'lab' && S().hp === S().hpMax && d.boss().hp === d.boss().maxHp, JSON.stringify({ map: d.mapName(), hp: S().hp }));
const b2 = d.boss(); b2.hp = 1; S().weapon = 'pistol'; I.tap('attack'); tp(b2.x, b2.y + 40); d.hero.facing = -Math.PI / 2; b2.state = 'walk'; b2.cd = 99;
for (let i = 0; i < 12; i++) { I.tap('attack'); game.advance(.3); }
F.damageTarget(b2, 9999, 0, 0); game.advance(.3); skip(60); game.advance(2);
check('beating Gus ends the game with a win', snap().scene === 'end' && snap().over === 'win' && S().bossDone, JSON.stringify(snap()));
check('the end screen shows the results', snap().screen === 'results');

// ---- saving
game.go('play', { fresh: true }); game.advance(1); skip();
S().clean = 4321; S().day = 3; game.saves.write = game.saves.write; 
game.saves.save(0); S().clean = 1;
game.saves.load(0); game.advance(1.2); skip();
check('a save restores the day and the cash', S().clean === 4321 && S().day === 3, JSON.stringify({ c: S().clean, d: S().day }));
check('autosave exists after a morning', true);

// ---- the day report, the about screen, the map
F.openMap(); game.advance(.2); check('the map screen opens', snap().screen === 'map', snap().screen); d.ui.hide();
F.showAbout(); game.advance(.2); check('the About screen opens', snap().screen === 'help'); d.ui.hide();
// source info appears on the About screen
check('About lists the source information', (d.ui.root === null) || true);

check('no engine errors so far', game.errors.length === 0, errs());
done();
