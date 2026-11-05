// A full playthrough, headless: New Story from the title, the prologue on the couch, the four chapters, the sessions,
// the diner and the credits, back to the title. A bot plays it through the game's real input (taps, holds), walking by
// teleport between places and fighting with the attract mode's autopilot. Run: node tests/playthrough.mjs [choice]
import { load } from './load.mjs';
const CHOICE = +(process.argv[2] || 0);
const { game, I, D, snap } = load();
let failed = 0, steps = 0;
const check = (what, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; };
const S = D.S, W = D.W, T = 16;
const run = (sec) => game.advance(sec);
// talk through every open line; on choices pick CHOICE (or the last one when there are fewer)
function talkThrough(max = 60, choice = CHOICE) {
  let t = 0;
  while ((D.convoBusy() || D.talk.open) && t < max) {
    if (W.mini) { playMini(); continue; }
    const k = D.talk;
    if (k.open && k.choices && !k.typing && k.i === k.pages.length - 1) { k.choice = Math.min(choice, k.choices.length - 1); }
    I.tap('confirm'); run(.12); t += .12; steps++;
  }
  return t < max;
}
// the minigames, played by watching them: the needle in the gold, the breath with the ring
function playMini(maxT = 30) {
  let t = 0;
  while (W.mini && t < maxT) {
    const m = W.mini;
    if (m.kind === 'stare') { if (Math.abs(m.u - m.center) < m.zone / 4 && !m.over) I.tap('attack'); }
    if (m.kind === 'breathe') I.hold('interact', !!m.inhale);
    run(1 / 60); t += 1 / 60;
  }
  I.hold('interact', false);
}
function use(at, dy = 12) { D.teleport(at.x, at.y + dy); run(.1); I.tap('interact'); run(.2); }
function fightAll(maxT = 90) { const h = D.hero(); h.auto = D.autoFight; let t = 0; while (W.foes.some(f => !f.dead && !f.surrender) && t < maxT) { if (h.hp < 40) h.hp = 100; if (D.convoBusy()) talkThrough(); if (W.mini) playMini(); run(.25); t += .25; } h.auto = null; return t < maxT; }
function waitFor(fn, maxT = 20) { let t = 0; while (!fn() && t < maxT) { if (D.convoBusy()) talkThrough(); if (W.mini) playMini(); run(.1); t += .1; } return fn(); }

game.settings.set('difficulty', 'easy');
run(1);
check('the title shows first', snap().scene === 'title');
I.tap('confirm'); run(.6);   // CONTINUE is off with no save: the cursor starts on NEW STORY
check('NEW STORY opens the prologue on the couch', snap().scene === 'therapy', JSON.stringify(snap()));
run(1.5); talkThrough();
check('the prologue ends in chapter one', waitFor(() => snap().scene === 'play' && snap().ch === 1), JSON.stringify(snap()));
run(1);
// CHAPTER ONE
const t1 = D.TOWN.at;
check('Sal starts in his robe', snap().hero.robe === true);
D.teleport(t1.paper.x, t1.paper.y - 2); run(1.2); talkThrough();
check('the newspaper is picked up', S.flags.paper === 1, JSON.stringify(snap()));
check('step two: the ducks', waitFor(() => snap().objective === 'Feed the ducks'), snap().objective);
use({ x: 13.6 * T, y: 5 * T }, 0); talkThrough();
check('the ducks are fed (stress down)', S.flags.ducks === 1);
check('step three: get dressed', waitFor(() => snap().objective === 'Get dressed'), snap().objective);
use(t1.houseDoor, 8); run(1); talkThrough();
check('Sal gets dressed', snap().hero.robe === false && S.flags.dressed === 1, JSON.stringify(snap()));
waitFor(() => /Gino/.test(snap().objective || ''));
// drive the SUV a little on the way
const car = W.cars[0]; D.teleport(car.x + 14, car.y); run(.1); I.tap('interact'); run(.2);
check('Sal gets in the SUV', snap().hero.car === true);
I.hold('fire'); run(1.2); I.hold('fire', false); const moved = Math.hypot(car.x - t1.suv.x, car.y - t1.suv.y);
check('the SUV drives on the gas', moved > 20, 'moved ' + moved);
I.hold('block'); run(1.5); I.hold('block', false); I.tap('interact'); run(.2);
check('Sal gets out of the SUV', snap().hero.car === false);
use(t1.gino); talkThrough();
check('Gino gives the rounds', S.flags.rounds === 1);
waitFor(() => /rounds/i.test(snap().objective || ''));
use(t1.baker); talkThrough(10, 0);
check('Dolce Vita pays', S.flags.bakery === 1 && S.cash >= 500, JSON.stringify(snap()));
use(t1.murray); talkThrough(10, 0); playMini(); talkThrough();
check('Spin City pays after the stare-down', S.flags.laundry === 1 && S.cash >= 900, JSON.stringify(snap()));
D.teleport(t1.chef.x, t1.chef.y + 60); run(.5); talkThrough();
check('Falsettis at Il Gabbiano', snap().foes >= 3, JSON.stringify(snap()));
check('the brawl is won', fightAll());
run(1); use(t1.chef); talkThrough();
check('Il Gabbiano pays', S.flags.gabbiano === 1, JSON.stringify(snap()));
waitFor(() => /envelopes/.test(snap().objective || ''));
use(t1.gino); talkThrough();
check('the gabagool brings on a panic attack', waitFor(() => W.mini && W.mini.kind === 'breathe', 5), JSON.stringify(snap()));
playMini(); talkThrough();
check('chapter one ends on the couch', waitFor(() => snap().scene === 'therapy'), JSON.stringify(snap()));
// SESSION TWO
run(1.5); talkThrough();
check('session two ends in chapter two (night)', waitFor(() => snap().scene === 'play' && snap().ch === 3) && W.night, JSON.stringify(snap()));
run(1);
use(t1.frankie); talkThrough();
check('Frankie hands over the pistol', S.flags.gun === 1 && S.ammo >= 24);
check('three waves at the Velvet Brass', waitFor(() => snap().foes > 0, 5) && fightAll(150) && waitFor(() => snap().foes > 0 || S.flags.clubSafe, 5) && fightAll(150) && waitFor(() => snap().foes > 0 || S.flags.clubSafe, 5) && fightAll(150), JSON.stringify(snap()));
check('the club is safe', waitFor(() => S.flags.clubSafe), JSON.stringify(snap()) + ' left: ' + W.foes.filter(f => !f.dead).map(f => f.kind + '@' + Math.round(f.x / T) + ',' + Math.round(f.y / T) + ' hp' + f.hp + ' stun' + f.stun.toFixed(2) + ' z' + f.z.toFixed(1)).join(' '));
waitFor(() => /Frankie/.test(snap().objective || ''));
run(3); use(t1.frankie); talkThrough();
check('chapter three: the Pine Barrens', waitFor(() => snap().place === 'barrens', 10), JSON.stringify(snap()));
run(1);
const b = D.BARRENS.at;
check('Nicky comes along', snap().heroes === 2);
D.teleport(b.shoe.x, b.shoe.y - 2); run(1.2); talkThrough();
check('Lenny lost a shoe', S.flags.shoe === 1, JSON.stringify(snap()));
check('the cold drains warmth', W.cold < 100);
waitFor(() => /trail/.test(snap().objective || ''));
D.teleport(b.pond.x - 60, b.pond.y); run(.5); talkThrough();
check('the ambush by the pond', S.flags.ambush === 1 && fightAll(), JSON.stringify(snap()));
waitFor(() => /cabin/.test(snap().objective || ''));
D.teleport(b.lenny.x, b.lenny.y + 40); run(.5); talkThrough();
check('Lenny the Ledger fights, then gives up', fightAll(120) && W.lenny && W.lenny.surrender, JSON.stringify(snap()));
waitFor(() => D.convoBusy(), 4); talkThrough(30, CHOICE % 2);
const bag = W.items.find(i => i.kind === 'bag');
check('the bag drops', !!bag);
if (bag) { D.teleport(bag.x, bag.y); run(1); talkThrough(); }
check('the book and the money', S.flags.book === 1 && S.cash >= 5000, JSON.stringify(snap()));
waitFor(() => /road/.test(snap().objective || ''));
D.teleport(b.exit.x, b.exit.y); run(.5); talkThrough();
check('session three', waitFor(() => snap().scene === 'therapy'), JSON.stringify(snap()));
run(1.5); talkThrough();
check('chapter four: rain at night', waitFor(() => snap().scene === 'play' && snap().ch === 6) && game.weather && game.weather.kind === 'rain', JSON.stringify(snap()));
run(1); use(t1.gino); talkThrough();
waitFor(() => /yard/.test(snap().objective || ''));
D.teleport(t1.yardGate.x, t1.yardGate.y); run(.5);
check('the yard gate fight', fightAll(120) && waitFor(() => S.flags.gateDone), JSON.stringify(snap()));
waitFor(() => !!W.carmine); talkThrough();
check('Carmine "The Tenor" fights in three movements', fightAll(240) && !!W.carmine && W.carmine.surrender, JSON.stringify(snap()) + ' phase ' + (W.carmine && W.carmine.phase));
talkThrough();
check('the Feds take him', waitFor(() => S.flags.yard), JSON.stringify(snap()));
waitFor(() => /Diner/.test(snap().objective || ''));
use(t1.diner, 10);
check('the epilogue at the diner', waitFor(() => snap().scene === 'diner', 5), JSON.stringify(snap()));
check('the diner plays out and cuts to black, then the credits', waitFor(() => snap().scene === 'credits', 90), JSON.stringify(snap()));
I.tap('start'); run(1);
check('the credits end on the title', snap().scene === 'title', JSON.stringify(snap()));
check('a save is there to continue', game.saves.any);
check('no errors', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
console.log(`final: cash ${S.cash}, respect ${S.respect}, family ${S.family}, panics ${S.panics || 0}, choices ${S.choices.length}`);
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
