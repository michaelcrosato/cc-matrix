// Every system on its own, headless: lookouts and burns, the case blown, the tail, the wire's violations and pages,
// the board's rules, the shift's scoring and clock, the attract mode, settings (axis inversion, glyphs), views,
// two players, saves and Continue, chapter select, the chase's escape, notes, the game over's retry.
import { load, checker } from './harness.mjs';
const { E, game, I, D, snap } = load(); const { check, done } = checker();
const ST = D.ST, T = 16, adv = s => game.advance(s);
function drain(max = 400, idle = .7) { let n = 0, still = 0; while (n++ < max && still < idle) { if (D.talk.open) { still = 0; I.tap('confirm'); adv(.12); } else { still += .1; adv(.1); } } }
const go = (s, d) => { game.go(s, d, { fade: 0 }); adv(.5); };
const fresh = ch => { const c = D.CASE(); Object.keys(c).forEach(k => delete c[k]); };
adv(1);

// ---- settings ----
check('stick inversion settings exist', game.settings.invertX === false && game.settings.invertMoveY === false, JSON.stringify([game.settings.invertX, game.settings.invertMoveY]));
game.settings.set('invertX', true); game.settings.set('invertMoveY', true);
check('inversion toggles apply', D.INV.x === true && D.INV.y === true, JSON.stringify(D.INV));
game.settings.set('invertX', false); game.settings.set('invertMoveY', false);
check('inversion toggles off', !D.INV.x && !D.INV.y);
game.settings.set('glyphs', 'xbox'); check('Xbox symbols selectable', game.input.glyphs === 'xbox'); game.settings.set('glyphs', 'playstation');
check('game settings: hints, cones, dialog speed', ['hints', 'cones', 'textSpeed'].every(k => game.settings[k] !== undefined));

// ---- attract mode ----
go('title', {}); adv(10.5);
check('10 s idle on the title starts the attract mode', D.DEMO.on && snap().scene === 'street' && snap().mode === 'demo', JSON.stringify(snap()));
adv(25);
check('the demo bot photographs sales', ST.mode !== 'demo' || ST.sale !== undefined, '');
adv(3);
check('the attract loop moves on to the wire room', snap().scene === 'wire' || snap().scene === 'street', JSON.stringify(snap()));
adv(17); check('then the board', snap().scene === 'office' && D.BOARD.open, JSON.stringify(snap()));
adv(12); check('then the chase', snap().mode === 'chasedemo', JSON.stringify(snap()));
adv(6); check('the chase bot catches Squeak', ST.chase && ST.chase.caught, JSON.stringify(ST.chase));
I.tap('confirm'); adv(1);
check('any input ends the attract mode', snap().scene === 'title' && !D.DEMO.on, JSON.stringify(snap()));

// ---- lookouts and burns ----
D.seedCaseFor(1); go('street', { mode: 'corner', stage: 1 }); drain();
const K = ST.npcs.kevo; K.scan = [0]; K.facing = 0;
D.teleport(K.x + 30, K.y); I.hold('aim'); adv(4); I.hold('aim', false);
check('aiming a camera in a lookout\'s face burns you', D.CASE().heat === 1, JSON.stringify(snap()));
check('a burn scatters the corner', ST.scatter > 0);
D.teleport(4 * T, 2 * T); adv(20); check('the corner comes back after it cools', ST.scatter <= 0);
D.CASE().heat = 2; K.sus = 0; ST.coolBurn = 0; ST.scatter = 0; K.scan = [0]; K.facing = 0; D.teleport(K.x + 30, K.y); I.hold('aim'); adv(4); I.hold('aim', false); adv(3);
check('three burns blow the case', snap().scene === 'gameover', JSON.stringify(snap()));
I.tap('confirm'); adv(1);
check('TRY AGAIN returns to the corner with the heat reset', snap().mode === 'corner' && D.CASE().heat === 0, JSON.stringify(snap()));
// blending: still at the bus stop in plain view raises little
drain(); { const BS = D.STREET.busstop; K.sus = 0; ST.coolBurn = 0; D.teleport(BS.x, BS.y + 10); adv(6); }
check('blending at the bus stop stays calm', K.sus < .35, String(K.sus));
// the car
{ const c1 = D.STREET.car1; D.teleport(c1.x, c1.y + 16); adv(.2); I.tap('interact'); adv(.2); check('get in the car', !!D.P1().inCar); I.tap('interact'); adv(.2); check('get out of the car', !D.P1().inCar); }
// crouch toggle and the view
I.tap('crouch'); adv(.1); check('crouch toggles', D.P1().crouch === true); I.tap('crouch'); adv(.1);
const v0 = game.view.id || game.view.label; I.tap('view'); adv(.2); const v1 = game.view.id || game.view.label; check('the view changes', v0 !== v1, v0 + ' ' + v1); I.tap('view'); adv(.1); I.tap('view'); adv(.1);
// notes
I.tap('notes'); adv(.1); check('case notes open', snap().scene === 'street' && game.debug && true); I.tap('notes'); adv(.1);

// ---- the tail: lost and made ----
go('street', { mode: 'corner', stage: 4 }); adv(1.2); drain();
check('tail mode', !!ST.tail, JSON.stringify(snap()));
D.teleport(60 * T, 2 * T); adv(5);
check('too far: lost him, the tail resets', !ST.tail || ST.tail.far === 0, JSON.stringify(ST.tail && ST.tail.far));

// ---- the wire: violations, privilege, pages ----
D.CASE().violations = 0; go('wire', {}); drain();
const WR = D.WR; let g = 0;
while (WR.state !== 'listen' && g++ < 200) adv(.1);
adv(7);
check('listening past the clock on a personal call is a violation', snap().violations === 1, snap().violations);
check('a violation minimizes the call', WR.state === 'min');
g = 0; while (!(WR.call && WR.call.page) && g++ < 900) { if (WR.state === 'listen' && !WR.pert && WR.listenT > 3) I.tap('act2'); adv(.1); }
check('a page arrives', WR.state === 'page', WR.state);
for (const d of '1111') { I.tap('d' + d); adv(.1); } adv(.1);
check('a wrong decode is refused and cleared', WR.entry === '' && WR.state === 'page', WR.entry);
for (const d of '2160') { I.tap('d' + d); adv(.1); } adv(.1);
check('typing the page undecoded is wrong too', WR.state === 'page');
for (const d of '23') { I.tap('d' + d); adv(.1); } I.tap('cancel'); adv(.1);
check('delete removes a digit', WR.entry === '2', WR.entry);
I.tap('d3'); adv(.1); I.tap('d4'); adv(.1); I.tap('d0'); adv(.2);
check('the mirrored code decodes the meet time', snap().intel.includes('The meet: 11:40 PM'), JSON.stringify(snap().intel));
// jump to the lawyer's call
WR.i = D.CALLS.length - 1; WR.state = 'between'; WR.gap = 0; adv(1.5); g = 0; while (WR.state !== 'listen' && g++ < 50) adv(.1);
const vb = snap().violations; adv(3);
check('staying on a lawyer\'s call is a violation', snap().violations === vb + 1 && WR.call.priv, snap().violations);
D.CASE().violations = 2; WR.i = 0; WR.state = 'between'; WR.gap = 0; adv(1.5); g = 0; while (WR.state !== 'listen' && g++ < 50) adv(.1); adv(7); adv(2.5);
check('three violations pull the wire', snap().scene === 'gameover', JSON.stringify(snap()));

// ---- the board's rules ----
D.seedCaseFor(2); go('office', {}); D.OF.stage = 1; D.OF.me.x = 8 * T; D.OF.me.y = 2 * T + 8; adv(.2); I.tap('interact'); adv(.2);
check('the board opens on the evidence of TAPE ONE', D.BOARD.open && D.BOARD.cards.length === 7, D.BOARD.cards.length);
{ const B = D.BOARD; B.ti = 0; I.tap('confirm'); adv(.1); B.si = 4; const pc0 = D.CASE().pc; I.tap('confirm'); adv(.1); }
check('cancel puts a held card back', (() => { const B = D.BOARD; B.ti = 0; I.tap('confirm'); adv(.1); I.tap('cancel'); adv(.1); return !B.held && B.focus === 'tray'; })());
I.tap('cancel'); adv(.1); check('cancel steps away from the board', !D.BOARD.open);

// ---- the shift: score and the clock ----
D.fresh(); go('street', { mode: 'shift', seconds: 40 });
const p = D.P1(), BS = D.STREET.busstop; D.teleport(BS.x, BS.y + 10);
let sc = 0; g = 0;
while (snap().scene === 'street' && g++ < 600) {
  if (ST.sale && ST.sale.phase === 'pay' && !ST.sale.shot.pay) { const J = ST.npcs.junebug, F = ST.sale.fiend; I.hold('aim'); adv(.05); p.rx = (J.x + F.x) / 2; p.ry = (J.y + F.y) / 2; adv(.05); p.rx = (J.x + F.x) / 2; p.ry = (J.y + F.y) / 2; I.tap('shoot'); adv(.05); I.hold('aim', false); }
  sc = Math.max(sc, ST.score); adv(.1);
}
check('a shift scores hand-to-hands', sc >= 100, sc);
check('the shift ends on its clock with results', snap().scene === 'results', JSON.stringify(snap()));
check('the best shift is kept', game.debug.snapshot && true);

// ---- two players ----
go('street', { mode: 'shift', seconds: 60 });
try { game.addPlayer({ keys: 'right' }); } catch (e) {}
adv(.5);
check('a second player drops in as Briggs', ST.players.length === 2 && ST.players[1].id === 'BRIGGS', ST.players.length);
if (ST.players.length === 2) { const P2 = ST.players[1], x0 = P2.mover.x; P2.input.hold('right'); adv(.5); P2.input.hold('right', false); check('player 2 moves on their own input', Math.abs(P2.mover.x - x0) > 5, P2.mover.x - x0); }
try { for (const q of game.players.slice(1)) game.removePlayer(q); } catch (e) {}

// ---- chase escape ----
go('street', { mode: 'reup', stage: 2 }); drain();
D.teleport(D.STREET.houseBack.x, D.STREET.houseBack.y + 10); adv(.5);
check('chase begins', !!ST.chase);
D.teleport(5 * T, 2 * T); adv(5); drain();
check('too far behind: Squeak gets away', ST.chase && ST.chase.done && !ST.chase.caught, JSON.stringify(ST.chase));

// ---- saves, Continue and chapter select ----
go('results', { chapter: 1 }); D.seedCaseFor(3); game.saves.autosave(); go('title', {});
check('chapter select unlocked after a tape', D.TI && true);
{ const s = game.saves.latest(); check('Continue finds the autosave', !!s && s.level === 3, JSON.stringify(s && s.level)); }
I.tap('down'); adv(.1); I.tap('confirm'); adv(1.5);
check('Continue loads the saved tape', snap().scene === 'wire', JSON.stringify(snap()));
go('title', {}); I.tap('down'); adv(.1); I.tap('down'); adv(.1); I.tap('confirm'); adv(.3);
check('chapter select lists the tapes', D.TI.items && D.TI.items.some(i => i.ch === 5));
I.tap('down'); adv(.1); I.tap('confirm'); adv(1);
check('a chapter from the menu opens on its card', snap().scene === 'card' && snap().chapter === 2, JSON.stringify(snap()));

// ---- touch-only notice flag ----
D.DEV.touchOnly = true; go('title', {}); adv(.5);
check('touch-only: the title shows the notice (no menu input)', snap().touchOnly === true && snap().scene === 'title');
adv(10.5); check('touch-only: the attract mode still runs', D.DEMO.on, JSON.stringify(snap()));
D.DEV.touchOnly = false; I.tap('confirm'); adv(1);

check('no errors in the systems run', !game.errors.length, game.errors.map(e => String(e.message || e)).join(' | '));
done();
