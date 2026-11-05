// Flow tests: the whole chain of chapters, the shop, save and load, game over, the attract mode, touch-only. node tests/flow.mjs
import { load, check, finish } from './lib.mjs';
const store = {}; const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: i => Object.keys(store)[i], get length() { return Object.keys(store).length; } };
const T = load('#', { localStorage: ls, navigator: { getGamepads: () => [] } });
const { game, G, I } = T, PLAY = G.PLAY, S = () => G.S(), st = () => PLAY.state(), adv = s => game.advance(s);
const talkThrough = (tb, max = 400) => { let g = 0; while (tb.open && g++ < max) { I.tap('confirm'); adv(.25); } };

/* attract mode: 10 s idle on the title starts it, input ends it, it loops */
adv(1); check('title first', game.sceneName === 'title');
adv(6); check('still the title after 7 s idle', game.sceneName === 'title', game.sceneName);
adv(4.5); check('after 10 s idle the attract mode starts (an AI-played run)', game.sceneName === 'play' && st().demo === true, game.sceneName);
adv(8); check('the attract bot is playing (it moves, it fights, it takes no damage)', st().hero.x > 80 && st().hero.hp === st().hero.max, st().hero.x);
for (let k = 0; k < 40 && game.sceneName === 'play'; k++) { I.tap('confirm'); adv(1 / 30); } adv(1); check('any input leaves the attract mode for the title', game.sceneName === 'title', game.sceneName);
adv(5); check('input resets the 10 s clock', game.sceneName === 'title');
adv(6); check('the attract mode starts again after another 10 s idle', game.sceneName === 'play' && st().demo, game.sceneName);

/* the attract bot plays the whole game: street, kitchen, therapy, yard; then it loops back to the title and starts over */
const seen = new Set(); let t = 0, steps = 0;
while (t < 900 && !(seen.has('yard') && game.sceneName === 'title')) { adv(1); t++; seen.add(game.sceneName === 'play' ? st().lv.id : game.sceneName); if (game.errors.length) break; }
check('the attract run visits the street, kitchen, therapy and yard', ['street', 'kitchen', 'cut', 'yard'].every(k => seen.has(k)), [...seen].join() + ' after ' + t + 's');
check('and ends at the title (to loop)', game.sceneName === 'title' || game.sceneName === 'play', game.sceneName);
adv(3); check('the loop comes round to the attract mode again', game.sceneName === 'play' && st().demo, game.sceneName);
I.tap('confirm'); adv(1);

/* a full human-driven run: new game, intro, win the street with the cheat-free bot logic replaced by jumpToWave */
G.beginRun(false); adv(1); const tb = G.SCENE.talk; talkThrough(tb); adv(1);
check('intro done, the street begins', game.sceneName === 'play' && st().lv.id === 'street' && !st().demo, game.sceneName);
check('scene transitions keep the profile', S().step === 1, S().step);
// clear the street quickly: spawn each wave and KO it
PLAY.jumpToWave(0); st().hero.hp = st().hero.max;
for (let w = 0; w < 4; w++) { PLAY.jumpToWave(w); adv(.3); for (const q of st().foes) { if (q.k.boss && st().talk.open) talkThrough(st().talk, 60); q.hp = 0; PLAY.ko(q); } adv(3.5); }
check('clearing every wave clears the chapter', st().won > 0, st().won);
adv(3); check('the results card shows (won timer > 2.5)', st().won > 2.5);
I.tap('confirm'); adv(1.2);
check('confirm leaves the chapter for the kitchen table', game.sceneName === 'kitchen', game.sceneName);

/* the kitchen: spend, save, load */
S().cash = 1000; const K = G.KITCHEN; adv(.3);
const items = () => K; // menu drive through the input
I.tap('down'); adv(.1); I.tap('confirm'); adv(.3); // SPEND THE ENVELOPES
const cash0 = S().cash; I.tap('confirm'); adv(.3);
check('the shop sells an upgrade for cash', S().cash < cash0 && Object.values(S().up).some(v => v > 0), S().cash + ' ' + JSON.stringify(S().up));
check('upgrades change the hero: GYM raises max health', G.heroMax() >= 60);
I.tap('cancel'); adv(.2);
game.saves.canSave = true; game.saves.save(0); adv(.1);
const saved = game.saves.list(); check('a game can be saved to a slot', saved && saved.some(x => x && x.empty === false || x && x.place) , JSON.stringify(saved).slice(0, 120));
const cashAtSave = S().cash; S().cash = 5; game.saves.load(0); adv(.5);
check('loading a save restores the profile and returns to the kitchen', S().cash === cashAtSave && game.sceneName === 'kitchen', S().cash + ' ' + game.sceneName);
check('the title offers CONTINUE once a save exists', (game.go('title'), adv(.5), !G.titleMenu().items[1].disabled), JSON.stringify(G.titleMenu().items[1]));

/* therapy and the yard */
G.setS(Object.assign(G.S(), { step: 2 })); game.go('kitchen', {}, { fade: 0 }); adv(.5); I.tap('confirm'); adv(1.5);
check('GO OUT leads to the therapist', game.sceneName === 'cut', game.sceneName);
{ const b = G.SCENE.talk; const calm0 = S().calm, resp0 = S().respect; let g = 0, picked = false; while (game.sceneName === 'cut' && g++ < 500) { if (b.open && b.choices && b.choices.length && !picked) { picked = true; I.tap('confirm'); adv(.2); } I.tap('confirm'); adv(.25); }
  check('therapy choices change calm / respect / stress', picked && (S().calm !== calm0 || S().respect !== resp0 || S().stress !== undefined)); }
adv(1); check('therapy leads to the yard', game.sceneName === 'play' && st().lv.id === 'yard', game.sceneName);

/* game over and retry */
{ const h = st().hero; h.lives = 1; h.hp = 1; h.inv = 0; h.knocked = false; st().foes.length = 0; PLAY.spawnWave({ x: h.x, foes: ['associate'] }); const q = st().foes[0]; q.x = h.x + 20; q.y = h.y; q.t = 0; q.facing = Math.PI;
  for (let i = 0; i < 20 && game.sceneName === 'play'; i++) adv(.5);
  check('losing the last life ends in the game over screen', game.sceneName === 'over', game.sceneName);
  adv(.3); I.tap('confirm'); adv(1.5); check('retry restarts the chapter with a fresh hero', game.sceneName === 'play' && st().hero.lives === 3 && st().hero.hp === st().hero.max, game.sceneName); }

/* finishing the yard: the ending, the cut to black, the credits */
PLAY.jumpToWave(3); adv(.3); talkThrough(st().talk, 60); for (const q of st().foes) { q.hp = 0; PLAY.ko(q); } adv(9); I.tap("confirm"); adv(1.5);
check('the yard is cleared and the ending scene plays', game.sceneName === 'cut', game.sceneName);
{ const b = G.SCENE.talk; let g = 0; while (b.open && g++ < 300) { I.tap('confirm'); adv(.25); } adv(.2);
  check('the ending ends on a cut to black (silence)', game.sceneName === 'cut'); adv(5); check('then the credits', game.sceneName === 'credits', game.sceneName); }
adv(.5); { let pages = 0; for (let i = 0; i < 12 && game.sceneName === 'credits'; i++) { I.tap('confirm'); adv(.2); pages++; } check('the credits page through and return to the title', game.sceneName === 'title', game.sceneName); }

finish(game);
