// The attract mode, headless: 10 s of idle on the title starts it, it plays the game (cook, sell, launder, fight, Gus, a
// delivery, the Superlab and the boss), loops, and any input leaves it.
import { load, checker } from './_load.mjs';
const { d, game } = load();
const { check, done } = checker();
const snap = () => game.debug.snapshot();
game.advance(.8);
check('starts on the title', snap().scene === 'title' && snap().screen === 'title');
d.setLastInput(Date.now()); game.advance(3);
check('3 s idle: still the title', snap().scene === 'title');
d.setLastInput(Date.now() - 10500); game.advance(.5);   // ten and a half seconds without input
check('after 10 s without input the attract mode starts', snap().scene === 'attract', JSON.stringify(snap()));
const seen = []; let t = 0, lab = false, restarts = 0, lastScene = 'attract';
while (t < 400) {
  game.advance(.5); t += .5; const s = snap();
  if (s.auto && seen[seen.length - 1] !== s.auto) seen.push(s.auto);
  if (s.map === 'lab') lab = true;
  if (s.scene !== 'attract') break;
}
console.log('steps:', seen.join(' > '), '| ' + t + ' s');
for (const step of ['Cook a batch at the RV', 'Sell to a customer', 'Launder at the car wash', 'Fight the rival crew', 'Ask Gus for an order', 'Make the delivery', 'Go down to the Superlab', 'Beat Gus Frying'])
  check('the demo gets to: ' + step, seen.some(x => x.startsWith(step)));
check('it goes down into the Superlab', lab);
const loop = seen.indexOf('Cook a batch at the RV', 1); check('a whole loop of the demo takes under 3 minutes and then starts over', loop > 0 && loop === 8, 'second Cook at index ' + loop + ' of ' + seen.length);
check('the demo loops (restarts) after the boss instead of showing the ending', snap().scene === 'attract' && seen.filter(x => x.startsWith('Cook a batch')).length >= 2 || t >= 400, JSON.stringify(snap()));
check('no errors in the demo', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
// any input leaves
game.input.tap('confirm'); d.setLastInput(Date.now() + 5000); game.advance(.5);
check('any input leaves the attract mode for the title', snap().scene === 'title', JSON.stringify(snap()));
done();
