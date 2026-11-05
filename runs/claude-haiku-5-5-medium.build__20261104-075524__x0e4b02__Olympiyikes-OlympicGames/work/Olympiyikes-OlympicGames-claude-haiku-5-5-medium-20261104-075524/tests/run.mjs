// The one test command: node tests/run.mjs
// Loads the engine and src/game.js into a Node vm (the engine's headless mode: fixed steps, no screen or sound), plays
// the game through scripted input and reads its state through game.debug.snapshot(). Prints only failures and a count.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const files = ['vendor/my-3d2dge/dist/handoff/my-3d2dge.js', 'src/game.js'];
const store = new Map();
const ctx = { console, Date, Math, localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } };
vm.createContext(ctx);
for (const f of files) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });

const E = ctx.My3D2dge, game = E.current, I = game.input;
const snap = () => game.debug.snapshot();
const DT = 1 / 120;
let passed = 0, failed = 0;
const check = (what, ok, detail = '') => { if (ok) passed++; else { failed++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); } };
const run = (sec) => game.advance(sec);
// a scene change goes through the engine's short fade, and input during the fade is not read: wait it out
const goTo = (name, data) => { game.debug.go(name, data); run(.8); };
const tapFor = (action, sec = DT) => { I.tap(action); run(sec); };
const press = (action) => { I.tap(action); run(DT * 2); };

// the first step is the engine's start: title
run(.2);
check('the title is the first scene', snap().scene === 'title', JSON.stringify(snap()));

// title -> menu with confirm; the menu's first entry is QUICK GAMES
press('confirm'); run(.2);
check('confirm on the title opens the menu', snap().scene === 'menu', JSON.stringify(snap()));

// the game's title and menu go to attract after 10 s of no input
goTo('title'); run(.2);
run(11);
check('10 s idle on the title starts attract', snap().scene === 'ev' && snap().event && snap().event.attract, JSON.stringify(snap()));
press('confirm');
check('any input leaves attract for the title', (run(.1), snap().scene === 'title'), JSON.stringify(snap()));

// the event's bot: plays one event to its results, given the event id
function playEvent(id, maxSec = 120) {
  let guard = 0, alt = 'L', lastT = 0, takeoffTry = 0, holdUntil = -1;
  while (guard++ < maxSec * 120) {
    const s = snap();
    if (!s.event || s.event.id !== id) break;
    const ph = s.event.phase;
    if (ph === 'done') { press('confirm'); run(.8); if (snap().scene !== 'ev') break; continue; }
    if (id === 'sprint' && ph === 'race') {
      if (lastT <= 0) { I.tap(alt === 'L' ? 'mashL' : 'mashR'); alt = alt === 'L' ? 'R' : 'L'; lastT = .118; }
      lastT -= DT; run(DT); continue;
    }
    if (id === 'skijump' && ph === 'run') {
      // mash down the inrun; press take-off when the sweep is in the middle of the green
      const pos = Math.abs(((s.event.bar * 1.4) % 2) - 1);
      if (s.event.barOn && !takeoffTry && Math.abs(pos - .5) < .04) { I.tap('action'); takeoffTry = 1; }
      if (lastT <= 0) { I.tap(alt === 'L' ? 'mashL' : 'mashR'); alt = alt === 'L' ? 'R' : 'L'; lastT = .15; }
      lastT -= DT; run(DT); continue;
    }
    if (id === 'archery' && ph === 'shoot') {
      if (lastT <= 0) { I.tap('action'); lastT = .6; }
      lastT -= DT; run(DT); continue;
    }
    run(DT);
  }
}

// one event, human: sprint to a result with a real time
goTo('ev', { id: 'sprint', seed: 1 }); run(.1);
check('a sprint starts in its intro', snap().event && snap().event.phase === 'intro', JSON.stringify(snap().event));
playEvent('sprint');
check('the sprint ends at the results screen', snap().scene === 'results', JSON.stringify(snap()));
const sp = E.store.get('oly:best:sprint', null);
check('the sprint records a time', !!sp && sp.value > 5 && sp.value < 30, JSON.stringify(sp));

// a skijump: a distance on the screen, a balance, a landing
goTo('ev', { id: 'skijump', seed: 2 }); run(.1);
playEvent('skijump', 60);
check('the ski jump ends at its results', snap().scene === 'results', JSON.stringify(snap()));
const sj = E.store.get('oly:best:skijump', null);
check('the ski jump records a distance above zero', !!sj && sj.value > 0, JSON.stringify(sj));

// archery: three arrows, a total
goTo('ev', { id: 'archery', seed: 3 }); run(.1);
playEvent('archery', 60);
check('archery ends at its results', snap().scene === 'results', JSON.stringify(snap()));
const ar = E.store.get('oly:best:archery', null);
check('archery records a total between 0 and 30', !!ar && ar.value >= 0 && ar.value <= 30, JSON.stringify(ar));

// quick games: the title's menu, QUICK GAMES, three events in a row, then the medal table
goTo('menu'); run(.1);
press('confirm'); run(.8);
check('QUICK GAMES starts with the first event', snap().scene === 'ev' && snap().event.id === 'sprint', JSON.stringify(snap()));
const quickOrder = [];
for (let k = 0; k < 3; k++) {
  const id = snap().event.id; quickOrder.push(id);
  playEvent(id, 90);
}
check('Quick Games runs the three events in order', quickOrder.join() === 'sprint,skijump,archery', quickOrder.join());
check('Quick Games ends at the medal table', snap().scene === 'medals', JSON.stringify(snap()));
const medalTotal = game.debug.medals().reduce((a, r) => a + r.g + r.s + r.b, 0);
check('the medal table hands out nine medals over three events', medalTotal === 9, String(medalTotal));
press('confirm'); run(.1);
check('the medal table returns to the title', snap().scene === 'title', JSON.stringify(snap()));

// attract: plays the three events by itself, then returns to the title
goTo('attract'); run(.1);
let seen = new Set();
for (let i = 0; i < 120 * 120 && snap().scene !== 'title'; i++) { if (snap().event) seen.add(snap().event.id); run(DT); }
check('attract plays all three events and returns to the title', seen.size === 3 && snap().scene === 'title', [...seen].join() + ' ' + snap().scene);

// dev mode: a slider changes a value and saves it; reset puts every value back
goTo('dev', { from: { name: 'title', data: null } }); run(.1);
const before = snap().tune.sprintGain;
press('right');
check('the dev slider moves on right', Math.abs(snap().tune.sprintGain - (before + .05)) < 1e-9, before + ' -> ' + snap().tune.sprintGain);
for (let i = 0; i < 9; i++) press('down');
press('confirm');
check('reset to defaults restores every tunable', snap().tune.sprintGain === 1 && snap().tune.turboMult === 1.3, JSON.stringify(snap().tune));
check('the dev mode returns with cancel', (press('cancel'), snap().scene === 'title'), JSON.stringify(snap()));

// no error from the game's code during all of that
check('no error in the game code', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));

console.log(failed ? `${failed} check(s) failed, ${passed} passed` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
