// Flows: drive beats to their end and check the story moved on (no softlocks).
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
let ERR = 0, LAST = ''; const ctx = { console: { log: console.log, info() {}, warn() {}, error: (...a) => { ERR++; LAST = String(a[0]).slice(0, 300); } }, addEventListener() {}, location: { hash: '' }, setTimeout: f => f(), performance: { now: () => Date.now() } };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('dev-bundle.js', 'utf8'), ctx);
const g = ctx.My3D2dge.current, D = ctx.__wt, I = g.input; g.advance(.5); let fails = 0;
const ok = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' · ' + x : '')); if (!c) fails++; };
const tapUntil = (cond, secs, act = 'confirm') => { for (let i = 0; i < secs * 10 && !cond(); i++) { I.tap(act); g.advance(.1); } return cond(); };
const to = (x, y) => { D.FD.me.body.x = x * 16 + 8; D.FD.me.body.y = y * 16 + 8; };
// cold open
D.Director.newGame(); g.advance(.5);
to(31.4, 37.4); tapUntil(() => D.FD.flags.step >= 1, 20, 'interact'); tapUntil(() => !D.FD || D.FD.flags.step >= 1 && !g.debug.snapshot().ui && !ctx.__x, 3);
for (const [st, x, y] of [[2, 30.9, 39.5], [3, 33.4, 37.4]]) { for (let k = 0; k < 60 && D.FD.flags.step < st; k++) { to(x, y); I.tap('interact'); g.advance(.1); for (let j = 0; j < 8; j++) { I.tap('confirm'); g.advance(.1); } } }
tapUntil(() => D.state().beat !== 'e1.cold', 20);
ok('cold open plays through', D.state().beat !== 'e1.cold', D.state().beat + ' step ' + (D.FD.flags && D.FD.flags.step));
// eyes: facts in, then the Chevy
D.Director.start('e1.eyes'); g.advance(.5); tapUntil(() => false, 2);
for (const id of ['tee', 'rook', 'corey', 'pigeon']) D.state().facts.push('face:' + id); D.state().facts.push('obs:tee:lieutenant', 'obs:rook:muscle'); D.state().flags.pocketsMet = true;
to(34.5, 29.3); I.tap('interact'); g.advance(2);
ok('eyes on ends at the Chevy', D.state().beat === 'e1.board', D.state().beat);
// the chase: put Dana on Corey, tackle, cuff
D.Director.preset(2); D.Director.start('e2.phones'); g.advance(.5); tapUntil(() => false, 2);
D.MISSIONS.phones.radio(D.FD); tapUntil(() => !!D.FD.ch, 10);
let caught = false; for (let i = 0; i < 600 && !caught; i++) { const r = D.FD.ch && D.FD.ch.r; if (!r) break; D.FD.me.body.x = r.x - 6; D.FD.me.body.y = r.y; D.FD.me.moving = true; I.hold('right', true); I.hold('interact', D.FD.ch.down ? true : i % 2 === 0); g.advance(1 / 30); caught = D.FD.ch && D.FD.ch.cuffed; }
I.hold('right', false); I.hold('interact', false);
ok('the chase: tackle and cuff', caught, D.FD.ch ? 'down ' + D.FD.ch.down : 'no chase');
tapUntil(() => D.state().beat === 'e2.box', 60, 'confirm');
ok('after the chase: the box', D.state().beat === 'e2.box', D.state().beat);
// the box: lean, offer until it ends
for (let i = 0; i < 300 && D.state().beat === 'e2.box'; i++) { const s = D.UI.top(); if (s && s.id === 'box') s.keys[i % 2 ? 'boxRight' : 'boxBottom'](s); else { I.tap('confirm'); } g.advance(.15); }
ok('the box ends', D.state().beat !== 'e2.box', D.state().beat + ' facts ' + D.state().facts.filter(f => f.startsWith('stmt:corey')).join(','));
// a wire shift runs to its result with nobody touching it
D.Director.preset(3); D.Director.start('e3.wire2'); g.advance(.5);
let wr = false; for (let i = 0; i < 2400 && D.state().beat === 'e3.wire2'; i++) { const s = D.UI.top(); if (s && s.id === 'cards') s.confirm ? s.confirm(s) : s.items[0] && s.items[0]._act(); if (s && s.id === 'wres') { wr = true; s.confirm ? s.confirm(s) : s.items[s.items.length - 1]._act(); } if (s && s.id === 'cipher') s.cancel(s); I.tap('confirm'); g.advance(.25); }
ok('wire session 2 reaches its end of shift', D.state().beat !== 'e3.wire2', D.state().beat + ' legal ' + Math.round(D.state().meters.legal) + ' flip ' + D.state().cipher.dir);
// Tee's night: run it out, the count, the choice
D.Director.preset(1); D.Director.start('e1.i1'); g.advance(.5); tapUntil(() => false, 3);
for (let i = 0; i < 260 && D.state().beat === 'e1.i1'; i++) { const s = D.UI.top(); if (s && (s.id === 'count' || s.id === 'cards')) s.confirm(s); else if (s && s.id) s.cancel && s.cancel(s); I.tap('confirm'); g.advance(1); }
ok("Tee's night ends with the count", D.state().beat !== 'e1.i1', D.state().beat + ' count $' + D.state().crew.count);
// paper: decode, write, chambers
D.Director.preset(2); const S2 = D.state(); S2.evidence.push({ id: 'pager', kind: 'seizure', text: 'pager', direct: true }, { id: 'act:tee:payphone', kind: 'photo', act: 'payphone', who: 'tee', text: 'Tee on P1' }); S2.facts.push('stmt:corey:code'); for (const k of ['P1','P2','P3']) S2.numbers[k].known = true;
D.Director.start('e2.paper'); g.advance(.5); tapUntil(() => false, 3);
for (const pg of D.Cipher && ['555-0781 22 07', '555-0743 11 00', '555-0769 33 07']) D.Cipher.solve(pg, D.Cipher.match(pg, 1));
D.Director.paperRes = null; let done = false; D.Paper.open((res, nec) => { D.Director.paperRes = [res, nec]; done = true; }); const ps = D.UI.top(); ps.confirm ? ps.confirm(ps) : null;
ok('affidavit: lines scored', done && D.Director.paperRes[0].some(l => l.ok), done ? D.Director.paperRes[0].map(l => l.id + ':' + l.p).join(' ') : 'not done');
D.Director.start('e2.chambers'); g.advance(.5); tapUntil(() => D.state().beat !== 'e2.chambers', 60);
ok('chambers: the judge rules', D.state().beat === 'e2.i2' || D.state().beat === 'e2.more', D.state().beat + ' wire ' + JSON.stringify(D.state().wire.lines));
// the raid: plan, breach, react, search
D.Director.preset(5); D.state().flags.path = 'A'; D.Director.start('e5.raid'); g.advance(.5); tapUntil(() => D.UI.top() && D.UI.top().id === 'cards', 10);
D.UI.top().confirm(D.UI.top()); g.advance(.5); I.tap('interact'); D.MISSIONS.raid.breach(D.FD); for (let i = 0; i < 40; i++) g.advance(1);
for (const i of D.FD.flags.stash) { const sp = D.FD.flags.spots[i]; to(sp[1] - .5, sp[2] - .5); I.hold('interact', true); g.advance(2.4); I.hold('interact', false); g.advance(.2); }
tapUntil(() => D.state().beat !== 'e5.raid', 30);
ok('the raid: found the package and the cash', D.state().beat === 'e5.press', D.state().beat + ' phase ' + (D.FD.flags && D.FD.flags.phase));
// the long lens: three stars on Easy
D.Director.preset(5); D.state().flags.path = 'B'; D.Director.start('e5.count'); g.advance(.5); tapUntil(() => false, 3);
D.FD.flags.phase = 'lens'; D.FD.me.locked = true; D.FD.lens.aim = [-.25, -.1];
for (let i = 0; i < 300 && !D.FD.lens.got; i++) { g.advance(.1); if (D.FD.lens.win && D.FD.lens.focus >= 1) I.tap('photo'); }
ok('the long lens: Easy in the act', D.FD.lens.got, 'photos ' + D.state().photos.length);
ok('no runtime errors', ERR === 0, ERR + ' ' + LAST);
process.exit(fails ? 1 : 0);
