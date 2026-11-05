// THE TEST COMMAND. Runs the game headless (the engine and src/game.js in Node, with no screen), drives it with fixed steps
// (game.advance) and scripted input (input.tap / hold), and reads it through game.debug. Prints only the failures and one
// count line. Exit code 1 on a failure. Run: node tools/test.mjs
import vm from 'node:vm';
import { gameSource, engineSource } from './build.mjs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(engineSource(), ctx, { filename: 'engine/my-3d2dge.js' });
vm.runInContext(gameSource(), ctx, { filename: 'src/game.js' });
const E = ctx.My3D2dge, game = E.current, I = game.input, D = game.debug;
const snap = () => D.snapshot();
const adv = s => { for (let n = 0; n < Math.round(s * 120); n++) game.advance(1 / 120); };
const tap = a => { I.tap(a); adv(.2); };   // (a press, then a gap: two taps in one step are one press)

let total = 0, failed = 0;
const check = (what, ok, detail = '') => { total++; if (!ok) { failed++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); } };

// 1. boot: the menu is up, with no errors
adv(.5);
check('boots to the menu', D.mode() === 'menu' && game.sceneName === 'main', JSON.stringify(snap()));
check('no errors at boot', !game.errors.length, game.errors.map(e => e.message).join(' | '));

// 2. kick-about: a match from the kickoff, into play
D.kickAbout('kip', 'hoo'); adv(.1);
check('kick-about starts with a kickoff', D.mode() === 'kickoff', D.mode());
adv(1.5);
check('the kickoff hands over to play', D.mode() === 'play', D.mode());

// 3. a whole CPU match (both sides run the formation's brain) reaches full time and records a result
let steps = 0;
while (D.mode() !== 'full' && steps < 120 * 600) { game.advance(1 / 120); steps++; }
const fin = snap();
check('a CPU match reaches full time', fin.mode === 'full', JSON.stringify(fin));
check('the scores are whole numbers', fin.score.every(Number.isInteger), JSON.stringify(fin.score));
check('the goals recorded match the score', fin.stats && fin.stats.goals === fin.score[0] + fin.score[1], JSON.stringify(fin));
check('no errors in a full match', !game.errors.length, game.errors.map(e => e.message).join(' | '));

// 4. the cup run: the back page, the match, the result, and the next round's page
D.toMenu(); adv(.1);
D.startCup(); adv(.1);
check('the cup opens on its back page', D.mode() === 'card' && snap().card === 'pre', JSON.stringify(snap()));
tap('confirm'); adv(.1);
check('the team talk leads into the round', D.mode() === 'kickoff' && snap().cup && snap().cup.round === 0, JSON.stringify(snap()));
D.setScore(2, 0); D.forceEnd(); adv(4);
check('a win gives the win page', D.mode() === 'card' && snap().card === 'win', JSON.stringify(snap()));
tap('confirm');
check('the next page is the next round', D.mode() === 'card' && snap().card === 'pre' && snap().cup.round === 1, JSON.stringify(snap()));
tap('confirm'); adv(.1);
D.setScore(0, 3); D.forceEnd(); adv(4);
check('a loss gives the full-time page', D.mode() === 'card' && snap().card === 'lose' && snap().cup.lost === 1, JSON.stringify(snap()));
tap('confirm');
check('a loss can be tried again from the same round', snap().card === 'pre' && snap().cup.round === 1, JSON.stringify(snap()));
tap('cancel');
check('cancel leaves the cup for the menu', D.mode() === 'menu', D.mode());

// 5. euphoria: the meter fills, a full meter releases a Europhoria, and the next shot is a super strike
D.kickAbout('kip', 'hoo'); adv(1.5);
D.setEu(0, 100); D.triggerEuphoria(0); adv(.05);
check('a full meter releases a Europhoria', snap().europhoria[0] > 0 && snap().eu[0] === 0, JSON.stringify(snap()));
const before = snap().stats.supers;
D.setOwner(0, 0); D.shot(0, 0, 1, 0); adv(.1);
check('a shot in Europhoria is a super strike', snap().stats.supers === before + 1, JSON.stringify(snap().stats));
D.setCFG('overTheTop', false); D.setEu(0, 100); D.triggerEuphoria(0);
check('pure football: no Europhoria', D.triggerEuphoria(0) === false, JSON.stringify(snap()));
D.setCFG('overTheTop', true);

// 6. attract: idle ten seconds on the menu starts a demo; any input leaves it
D.toMenu(); adv(.2);
adv(10.5);
check('ten seconds idle starts the attract demo', snap().demo === true, JSON.stringify(snap()));
adv(20);
check('the demo plays on without errors', snap().demo === true && !game.errors.length, JSON.stringify(snap()) + ' ' + game.errors.map(e => e.message).join(' | '));
tap('confirm'); adv(.1);
check('any input leaves the demo for the menu', snap().demo === false && D.mode() === 'menu', JSON.stringify(snap()));

// 7. dev mode: the sliders change and save, and reset to defaults
const defaults = D.cfg();
D.openDev(); adv(.05);
check('the dev panel opens', D.mode() === 'dev', D.mode());
tap('down'); tap('right');
check('a slider moves a step', D.cfg().playerSpeed === defaults.playerSpeed + 4, JSON.stringify(D.cfg().playerSpeed));
D.setDevSel(10); tap('confirm');
const reset = D.cfg();
check('reset to defaults restores every value', reset.playerSpeed === 92 && reset.shotPower === 1 && reset.europhoriaPower === 1.35 && reset.overTheTop === true, JSON.stringify(reset));
tap('cancel');
check('back leaves the dev panel', D.mode() === 'menu', D.mode());

check('no errors at the end', !game.errors.length, game.errors.map(e => e.message).join(' | '));

// 8. the page itself, in headless Chromium: it loads from file://, the keys drive it, and the frames draw with no error
const here = path.dirname(fileURLToPath(import.meta.url));
const shot = spawnSync('python3', [path.join(here, 'browser-check.py')], { encoding: 'utf8' });
check('the page loads and draws in headless Chromium', shot.status === 0, (shot.stdout + shot.stderr).trim().split('\n').slice(-3).join(' | '));

console.log(failed ? `${failed} of ${total} checks failed` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
