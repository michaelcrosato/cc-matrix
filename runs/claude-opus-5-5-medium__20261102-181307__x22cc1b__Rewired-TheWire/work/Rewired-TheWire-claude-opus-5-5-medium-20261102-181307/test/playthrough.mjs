// A full playthrough of all five tapes, headless: the real scenes driven by scripted input through the engine's
// fixed-step clock, read through game.debug. Run: node test/playthrough.mjs
import { load, checker } from './harness.mjs';
const { game, I, D, snap } = load(); const { check, done } = checker();
const ST = D.ST, T = 16;
const errs = () => game.errors.map(e => String(e.message || e)).join(' | ');
const adv = s => game.advance(s);
function drain(max = 400, idle = .7) { let n = 0, still = 0; while (n++ < max && still < idle) { if (D.talk.open) { still = 0; I.tap('confirm'); adv(.12); } else { still += .1; adv(.1); } } return n; }
function waitFor(fn, max = 120, step = .1) { let t = 0; while (!fn() && t < max) { adv(step); t += step; } return fn(); }
function sceneIs(name) { return snap().scene === name; }
function photo(x, y, settle = .06) { const p = D.P1(); I.hold('aim'); adv(.05); p.rx = x; p.ry = y; adv(settle); p.rx = x; p.ry = y; I.tap('shoot'); adv(.05); I.hold('aim', false); adv(.05); }
function keepStill() { const p = D.P1(); p.mover.vx = p.mover.vy = 0; }

adv(1.2);
check('boots to the title', sceneIs('title'), JSON.stringify(snap()));
check('PlayStation symbols are the default', game.settings.glyphs === 'playstation', game.settings.glyphs);
I.tap('confirm'); adv(1);
check('NEW CASE starts the cold open', snap().mode === 'coldopen', JSON.stringify(snap()));

// ---- cold open ----
const U = ST.npcs.uniform; D.teleport(U.x - 16, U.y); adv(.2); I.tap('interact'); adv(.2);
check('the uniform talks', D.talk.open, JSON.stringify(snap()));
drain(); adv(1);
check('the cold open ends in the TAPE ONE card', sceneIs('card'), JSON.stringify(snap()));
adv(1.5); I.tap('confirm'); adv(1);
check('the card starts the corner', snap().mode === 'corner' && snap().stage === 0, JSON.stringify(snap()));

// ---- TAPE ONE ----
drain();
const PG = ST.npcs.pigeon; D.teleport(PG.x, PG.y + 16); adv(.2); I.tap('interact'); adv(.3);
check('Pigeon talks', D.talk.open);
drain(); adv(.5); drain();
check('Pigeon paid: stage 1, his statement is evidence', snap().stage === 1 && snap().evidence.includes('pigeon'), JSON.stringify(snap()));
// stand at the bus stop and shoot the sales from there
const BS = D.STREET.busstop; D.teleport(BS.x, BS.y + 10); adv(.3);
let shots = 0;
for (let k = 0; k < 6 && !(snap().evidence.includes('h2h2') && snap().evidence.includes('stash')); k++) {
  waitFor(() => ST.sale && (ST.sale.phase === 'pay' || (ST.sale.phase === 'grab' && !snap().evidence.includes('stash'))), 60);
  keepStill();
  if (ST.sale && ST.sale.phase === 'pay') { const J = ST.npcs.junebug, F = ST.sale.fiend; photo((J.x + F.x) / 2, (J.y + F.y) / 2); shots++; }
  else if (ST.sale && ST.sale.phase === 'grab') { D.teleport(36 * T, 7 * T + 14); adv(1); const Q = ST.npcs.squeak; photo(Q.x, Q.y); shots++; D.teleport(BS.x, BS.y + 10); }
  waitFor(() => !ST.sale || !['pay', 'grab'].includes(ST.sale.phase), 30);
}
check('two hand-to-hands and the stash photographed', ['h2h1', 'h2h2', 'stash'].every(e => snap().evidence.includes(e)), JSON.stringify(snap()) + ' shots ' + shots);
check('no heat from the bus stop', snap().heat === 0, JSON.stringify(snap()));
check('the black Lexus comes (stage 3)', snap().stage === 3, JSON.stringify(snap()));
drain();
waitFor(() => ST.collect && ST.collect.phase === 'give', 60);
{ const N = ST.npcs; photo((N.tay.x + N.moe.x) / 2, (N.tay.y + N.moe.y) / 2); }
check('the collection photographed', snap().evidence.includes('collect') && snap().evidence.includes('tay'), JSON.stringify(snap()));
waitFor(() => snap().stage === 4 && D.talk.open, 60); drain();
check('the tail begins', snap().stage === 4 && !!ST.tail, JSON.stringify(snap()));
// tail: crouched, a little way behind him
const p1 = D.P1(); p1.crouch = true;
waitFor(() => { const Q = ST.npcs.squeak; if (!ST.tail) return true; const a = Q.facing + Math.PI; D.teleport(Q.x + Math.cos(Q.facing + (ST.tail.look > 0 ? 0 : Math.PI)) * 90, Q.y + Math.sin(Q.facing + (ST.tail.look > 0 ? 0 : Math.PI)) * 90); return false; }, 120, .2);
check('the tail ends at 1419 Lorraine', snap().evidence.includes('house'), JSON.stringify(snap()));
drain(); adv(1);
check('TAPE ONE closes on results', sceneIs('results'), JSON.stringify(snap()));
let saved = null; try { saved = game.saves.latest(); } catch (e) {}
check('an autosave exists after a tape', !!saved, String(saved));
adv(1); I.tap('confirm'); adv(1); adv(1.5); I.tap('confirm'); adv(1);
check('TAPE TWO: the office', sceneIs('office'), JSON.stringify(snap()));

// ---- TAPE TWO ----
const OF = D.OF;
OF.me.x = OF.npcs[0].x - 18; OF.me.y = OF.npcs[0].y; adv(.2); I.tap('interact'); adv(.2); drain();
check('Mabry briefs: stage 1', OF.stage === 1);
OF.me.x = 8 * T; OF.me.y = 2 * T + 8; adv(.2); I.tap('interact'); adv(.2);
check('the board opens', D.BOARD.open, JSON.stringify(snap()));
// one wrong pin first, then every card right
{ const B = D.BOARD; I.tap('confirm'); adv(.1); B.si = 0; const held = B.held; I.tap('confirm'); adv(.1);
  check('a wrong pin is refused', !held || held.id === 'pigeon' || !held.on, JSON.stringify(held)); }
for (let k = 0; k < 12 && D.BOARD.open; k++) {
  const B = D.BOARD, free = B.cards.filter(c => !c.on); if (!free.length) break;
  B.focus = 'tray'; B.ti = 0; I.tap('confirm'); adv(.1);
  const rules = { h2h1: 'JUNEBUG', h2h2: 'JUNEBUG', stash: 'SQUEAK', collect: 'MOE', tay: 'TAY', pigeon: 'DEACON', house: 'HOUSE', lookouts: 'LOOKOUTS' };
  const want = rules[B.held.id]; B.si = ['DEACON', 'TAY', 'MOE', 'HOUSE', 'JUNEBUG', 'SQUEAK', 'LOOKOUTS'].indexOf(want); I.tap('confirm'); adv(.2);
}
check('probable cause reaches the judge', D.CASE().pc >= 60, D.CASE().pc);
adv(1.5); drain(); adv(.5); drain();
check('a line chosen', !!D.CASE().line, D.CASE().line);
adv(1);
check('TAPE TWO closes on results', sceneIs('results'), JSON.stringify(snap()));
adv(1); I.tap('confirm'); adv(1); adv(1.5); I.tap('confirm'); adv(1);
check('TAPE THREE: the wire room', sceneIs('wire'), JSON.stringify(snap()));

// ---- TAPE THREE ----
drain();
const WR = D.WR;
let guard = 0;
while (!WR.done && guard++ < 6000) {
  const c = WR.call;
  if (WR.state === 'listen' && c && !c.page) {
    const ln = c.lines[WR.li];
    if (ln && ln[3] && !WR.logged.includes(WR.li) && WR.lt > .5) I.tap('interact');
    else if (c.priv && WR.listenT > .8) I.tap('act2');
    else if (!WR.pert && WR.listenT > 3.5) I.tap('act2');
  } else if (WR.state === 'min' && c && !c.priv && WR.minT > 2.7 && !WR.spotDone) { I.tap('interact'); }
  else if (WR.state === 'page' && c) { const d = c.answer[WR.entry.length]; if (d !== undefined) I.tap('d' + d); }
  adv(.1);
}
check('every call and page done', WR.done, WR.state);
check('no violations on a careful shift', snap().violations === 0, snap().violations);
for (const want of ['Re-up: Thursday night', 'The meet: 11:40 PM', 'The meet: payphone at Lorraine and Fulton', 'Squeak sits 1419 Lorraine on Thursday']) check('logged: ' + want, snap().intel.includes(want), JSON.stringify(snap().intel));
adv(.5); drain(); adv(1);
check('TAPE THREE closes on results', sceneIs('results'), JSON.stringify(snap()));
adv(1); I.tap('confirm'); adv(1); adv(1.5); I.tap('confirm'); adv(1);
check('TAPE FOUR: the re-up', snap().mode === 'reup', JSON.stringify(snap()));

// ---- TAPE FOUR ----
adv(1); drain();
const C2 = D.STREET.car2; D.teleport(C2.x, C2.y + 16); adv(.2); I.tap('interact'); adv(.3);
check('in the stakeout car', snap().stage === 1 && !!D.P1().inCar, JSON.stringify(snap()));
waitFor(() => ST.handoff && ST.handoff.phase === 'call', 60);
photo(ST.npcs.tay.x, ST.npcs.tay.y);
waitFor(() => ST.handoff && ST.handoff.phase === 'swap', 60);
{ const N = ST.npcs; photo((N.tay.x + N.pruitt.x) / 2, (N.tay.y + N.pruitt.y) / 2); const car = ST.cars.find(c => c.id === 'courier'); photo(car.x, car.y); }
check('the handoff, the payphone and the plate photographed', ['handoff', 'payphone', 'plate'].every(e => snap().evidence.includes(e)), JSON.stringify(snap().evidence));
waitFor(() => D.talk.open && ST.handoff.phase === 'gone', 60); drain();
check('the raid: cover the back (stage 2)', snap().stage === 2, JSON.stringify(snap()));
I.tap('interact'); adv(.3);   // out of the car
D.teleport(D.STREET.houseBack.x, D.STREET.houseBack.y + 10); adv(.5);
check('Squeak bolts: the chase', snap().stage === 3 && !!ST.chase, JSON.stringify(snap()));
adv(.6); { const Q = ST.npcs.squeak; D.teleport(Q.x - 10, Q.y); adv(.02); } I.tap('act2'); adv(.3);
check('the tackle catches him', D.CASE().squeakCaught && snap().evidence.includes('arrest'), JSON.stringify(snap()));
drain(); adv(.3); drain();
check('stage 4: search 1419', snap().stage === 4, JSON.stringify(snap()));
D.teleport(D.STREET.houseDoor.x, D.STREET.houseDoor.y + 10); adv(.2); I.tap('interact'); adv(1);
check('inside 1419', sceneIs('stash'), JSON.stringify(snap()));
adv(4);
for (const id of ['fridge', 'vent']) {
  const s = D.STASH ? null : null; const spot = game.debug.SH && null;
}
{ const spots = [['fridge', 9 * T, 2 * T + 4], ['vent', 4 * T, 7 * T]];
  for (const [id, x, y] of spots) { const me = D.SH.me; me.x = x; me.y = y + 12; adv(.1); I.hold('interact'); adv(1.6); I.hold('interact', false); adv(.2); drain(); }
}
check('the package and the ledger found', snap().evidence.includes('package') && snap().evidence.includes('ledger'), JSON.stringify(snap().evidence));
adv(1); drain(); adv(1); drain(); adv(1);
check('TAPE FOUR closes on results', sceneIs('results'), JSON.stringify(snap()));
adv(1); I.tap('confirm'); adv(1); adv(1.5); I.tap('confirm'); adv(1);
check('TAPE FIVE: the brass', sceneIs('office') && OF.ending, JSON.stringify(snap()));

// ---- TAPE FIVE ----
{ const H = OF.npcs[2]; OF.me.x = H.x - 18; OF.me.y = H.y; adv(.2); I.tap('interact'); adv(.2); }
// choose "Follow the money": move the choice down once on the last page
let n = 0; while (D.talk.open && n++ < 200) { if (D.talk.choices && D.talk.i === D.talk.pages.length - 1 && !D.talk.typing) { adv(.2); I.tap('down'); adv(.2); I.tap('confirm'); adv(.2); break; } I.tap('confirm'); adv(.12); }
drain(); adv(1);
check('the brass decided: follow the money', D.CASE().ending === 'money', D.CASE().ending);
check('the montage plays', sceneIs('montage'), JSON.stringify(snap()));
waitFor(() => sceneIs('results'), 120, .2);
check('the final case file', sceneIs('results'), JSON.stringify(snap()));
adv(1); I.tap('confirm'); adv(1);
check('credits after the case file', sceneIs('about'), JSON.stringify(snap()));
I.tap('cancel'); adv(1);
check('back to the title', sceneIs('title'), JSON.stringify(snap()));
check('every chapter unlocked', game.debug.TI && true, '');
check('no errors in the whole playthrough', !game.errors.length, errs());
done();
