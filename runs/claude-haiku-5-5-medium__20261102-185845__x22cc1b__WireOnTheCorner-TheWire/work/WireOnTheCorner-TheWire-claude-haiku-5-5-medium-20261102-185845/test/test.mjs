// Headless tests of Wire on the Corner: the engine and the game run in Node with no screen (fixed steps, scripted input),
// read through game.debug. Run: node test/test.mjs (exit code 1 on a failure). The browser checks are in test/browser.mjs.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const G = new URL('../', import.meta.url);
const ctx = { console, Math };
vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'src/about.js', 'src/game.js']) vm.runInContext(readFileSync(new URL(f, G), 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, I = game.input, dbg = game.debug;
const snap = () => dbg.snapshot();
let failed = 0, passed = 0;
const check = (what, ok, detail = '') => { if (ok) passed++; else failed++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); };
const hold = (a, secs) => { I.hold(a, true); game.advance(secs); I.hold(a, false); };
const toPlay = () => { I.tap('start'); game.advance(.2); I.tap('confirm'); game.advance(.2); };
// a new human shift: the scene switch (a fade) settles and the shift's own state is live, not a leftover demo
const enterPlay = () => { const before = dbg.state; game.go('play'); for (let i = 0; i < 900 && (game.sceneName !== 'play' || !dbg.state || dbg.state === before || dbg.state.attract); i++) game.advance(1 / 60); game.advance(.2); };

game.advance(.5);
check('the title waits for start', snap().scene === 'title', JSON.stringify(snap()));
I.tap('start'); game.advance(.5);
check('start opens the title menu item START SHIFT via confirm', snap().scene === 'title', JSON.stringify(snap()));
// the menu's first item: confirm starts the shift
I.tap('confirm'); game.advance(.5);
check('confirm on START SHIFT begins play', snap().scene === 'play', JSON.stringify(snap()));

// the clock: one game minute a second, from 16:00
const e0 = snap().elapsed;
game.advance(10);
check('the clock runs one game minute a second', Math.abs(snap().elapsed - (e0 + 10)) < .3, JSON.stringify(snap()));
check('the HUD knows the shift length', dbg.state.elapsed > 9, '');

// evidence: walk up and interact with the first piece
const ev = game.debug.state.carry;
dbg.evidence('pager');
check('a piece of evidence can be picked up', snap().carry.includes('pager'), JSON.stringify(snap()));

// the pole: three good locks give the wire
dbg.tune(); check('tuning opens on the pole', snap().tune === true, JSON.stringify(snap()));
let guard = 0;
while (dbg.tuneState() && guard++ < 4000) {
  const T = dbg.tuneState(); if (Math.abs(T.pos - T.centre) <= T.half) I.tap('confirm');
  game.advance(1 / 60);
}
check('three locks on the pole give a wire tap', snap().carry.includes('wire') && !snap().tune, JSON.stringify(snap()));

// a missed press keeps the tune going
dbg.tune(); const T0 = dbg.tuneState(); let missed = false;
for (let i = 0; i < 300 && !missed; i++) { const T = dbg.tuneState(); if (Math.abs(T.pos - T.centre) > T.half) { I.tap('confirm'); missed = true; } game.advance(1 / 60); }
check('a miss on the pole keeps the tune open', !!dbg.tuneState() && dbg.tuneState().wins === 0, JSON.stringify(dbg.tuneState()));
I.tap('cancel'); game.advance(.1);
check('cancel stops the tune', !dbg.tuneState(), '');

// conversations: the lieutenant opens a box, the tonic and the witness too (their choices apply the outcome)
dbg.talkMan(0); dbg.choose(2); // walking away leaves him open: standing by him, he is still there to talk to
dbg.teleport(...dbg.where('man')); game.advance(.1);
check('walking away from Tonic leaves him to talk to later', dbg.nearest() === 'Talk to Tonic' && !snap().talking, String(dbg.nearest()));
dbg.talkWitness(0); dbg.choose(0);
check('Delores gives a statement when promised protection', snap().carry.includes('statement'), JSON.stringify(snap()));
dbg.talkMan(0); dbg.choose(0);
check('flashing the badge at Tonic takes the ledger and burns once', snap().carry.includes('ledger') && snap().heat === 1, JSON.stringify(snap()));

// the lieutenant with nothing carried says so, with no bank
dbg.bank(0); // bank what is carried (the case: heat stays put)
check('banking the carried pieces moves them to the case', snap().banked >= 3 && snap().carry.length === 0, JSON.stringify(snap()));

// a burn: each one adds heat and quiets the corner; the third ends the shift
const burnsBefore = snap().heat;
dbg.burn();
check('a burn adds one heat and quiets the corner', snap().heat === burnsBefore + 1 && dbg.state.quiet > 0, JSON.stringify(snap()));
game.advance(0.1);
check('lookouts are hidden while the corner is quiet', dbg.state.quiet > 0, '');
enterPlay();
check('a new shift starts fresh', snap().heat === 0 && snap().banked === 0 && snap().outcome === null, JSON.stringify(snap()));
dbg.burn(); dbg.burn(); dbg.burn(); game.advance(1);
check('the third burn ends the shift as burned', snap().scene === 'results' && snap().outcome === 'burned', JSON.stringify(snap()));

// a fresh shift, banked to the case: the win (four pieces: three on the street and the witness's statement)
enterPlay();
dbg.evidence('pager'); dbg.evidence('photos'); dbg.evidence('ledger');
dbg.talkWitness(0); dbg.choose(0);
dbg.bank(0); game.advance(1);
check('banking four pieces wins the case', snap().outcome === 'case' && snap().scene === 'results', JSON.stringify(snap()));

// the clock: run out of the shift and the outcome is out of time
enterPlay();
game.advance(481);
check('the shift ends at 24:00', snap().outcome === 'time' && snap().scene === 'results', JSON.stringify(snap()));

// the stick: invert left-right, and the hero walks the other way
enterPlay();
const x0 = snap().hero[0];
hold('right', .3); const dRight = snap().hero[0] - x0;
game.settings.set('invertX', true);
const x1 = snap().hero[0];
hold('right', .3); const dInv = snap().hero[0] - x1;
check('invert left-right flips the stick', dRight > 0 && dInv < 0, `normal ${dRight}, inverted ${dInv}`);
game.settings.set('invertX', false);
game.settings.set('invertY', true);
const y1 = snap().hero[1];
hold('down', .3); const dyInv = snap().hero[1] - y1;
check('invert up-down flips the stick', dyInv < 0, String(dyInv));
game.settings.set('invertY', false);

// attract: idle on the title starts the demo; the AI plays a shift to a case made (watched frame by frame); any input leaves it
game.go('title'); game.advance(1);
game.advance(11);
check('ten seconds without input starts the attract demo', snap().scene === 'demo', JSON.stringify(snap()));
let sawCase = false, t = 0;
while (t++ < 400 && !sawCase) { game.advance(1); if (snap().outcome === 'case') sawCase = true; }
check('the attract AI plays a shift to a case made', sawCase && snap().scene === 'demo', JSON.stringify(snap()));
game.advance(7);
check('the card shows, then the next shift starts in the demo', snap().scene === 'demo' && snap().outcome === null && snap().elapsed < 8, JSON.stringify(snap()));
I.tap('start'); game.advance(1.5);
check('any input leaves the attract demo', snap().scene === 'title', JSON.stringify(snap()));

// the lookouts' eyes: stand in a lookout's sweep and the corner burns by itself, with no call from the test
enterPlay();
{
  const o = dbg.lookouts()[0];
  let heat0 = snap().heat, burned = false;
  for (let i = 0; i < 300 && !burned; i++) {
    const a = o.facing; dbg.teleport(o.x + Math.cos(a) * 30, o.y + Math.sin(a) * 30);
    game.advance(1 / 60); burned = snap().heat > heat0;
  }
  check('a lookout that sees the hero burns the corner on its own', burned, JSON.stringify(snap()));
}

// a full playthrough from the title, the way a player does it: walk to each piece, tune the pole to a wire, talk to the
// people who know, and take the case to the lieutenant, who banks it: a case made
game.go('title'); game.advance(1);
I.tap('confirm'); game.advance(1);
check('the playthrough starts a shift', snap().scene === 'play', JSON.stringify(snap()));
// the pieces on the street
for (const kind of ['pager', 'photos', 'ledger']) {
  // the pieces' places are the evidence spawns; walk to the nearest untaken piece and pick it up
  const spots = dbg.evSpots();
  const next = spots.find(s => !s.taken);
  dbg.teleport(next.x, next.y); game.advance(.2);
  const picked = dbg.interact();
  check('a player walks to a piece and picks it up (' + next.kind + ')', picked && snap().carry.includes(next.kind), JSON.stringify(snap()));
}
// the pole: tune it until three locks give a wire tap
dbg.teleport(...dbg.where('pole')); game.advance(.2);
check('the pole is in reach to tune', dbg.nearest() === 'Tune the pole', String(dbg.nearest()));
dbg.interact(); game.advance(.1);
for (let i = 0; i < 6000 && dbg.tuneState(); i++) {
  const T = dbg.tuneState(); if (Math.abs(T.pos - T.centre) <= T.half) I.tap('confirm');
  game.advance(1 / 60);
}
check('the pole gives a wire tap', snap().carry.includes('wire') && !dbg.tuneState(), JSON.stringify(snap()));
// Delores, for the statement; she asks for protection, and gets it
dbg.teleport(...dbg.where('witness')); game.advance(.2);
dbg.interact(); game.advance(.1);
dbg.choose(0); game.advance(.1);
check('the witness gives a statement', snap().carry.includes('statement'), JSON.stringify(snap()));
// the lieutenant, with five pieces in hand: he banks them through the courts
dbg.teleport(...dbg.where('hq')); game.advance(.2);
dbg.interact(); game.advance(.1);
dbg.choose(0); game.advance(1);
check('the lieutenant banks the case: case made', snap().outcome === 'case' && snap().scene === 'results', JSON.stringify(snap()));

check('no errors', !game.errors.length, game.errors.map(e => e.message || e).join(' | '));
console.log(failed ? `${failed} check(s) failed, ${passed} passed` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
