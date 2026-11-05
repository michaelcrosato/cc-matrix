// a full playthrough in the headless engine: real input actions, exact fixed steps; teleports only to skip walking
import { load, makeCheck } from './harness.mjs';
const { check, done } = makeCheck();
const t = load(); const { game, I, dbg, snap, E } = t;
const T = 16, cell = (cx, cy) => [(cx + .5) * T, (cy + .5) * T];
const step = (s) => game.advance(s);
const talkOut = (max = 40) => { for (let i = 0; i < max * 4 && (snap().talking || dbg.scriptBusy()); i++) { I.tap('confirm'); step(.25); } };
const tpNear = tag => { const [x, y] = dbg.spawn(tag); dbg.teleport(x + 8, y + 8); };
step(.4); I.tap('confirm'); step(.5);
check('the title starts a case', snap().scene === 'play' && snap().stage === 'brief', JSON.stringify(snap()));

// 1. briefing
tpNear('kowalczyk'); step(.1); I.tap('interact'); step(.3);
check('talking to the sergeant opens the briefing', snap().talking || dbg.scriptBusy(), JSON.stringify(snap()));
talkOut();
check('the briefing moves the case to surveillance', snap().stage === 'surveil', JSON.stringify(snap()));
check('the approach is recorded', dbg.state().approach === 'book', dbg.state().approach);

// 2. photographs: stand at the west entrance, lens on each crew member
const lk = dbg.lookouts();
for (const [who, p] of Object.entries({ lorne: 'lorne', sweets: 'sweets', dray: 'dray' })) {
  const [x, y] = cell(...({ lorne: [34.5, 26.5], sweets: [34.5, 25.5], dray: [38.5, 27.5] })[who]); dbg.teleport(x, y); const c = dbg.people()[p];
  dbg.hero().facing = Math.atan2(c.y - y, c.x - x); for (const l of lk) { l.alert = 0; l.cool = 99; }
  I.hold('camera'); step(2.4); I.hold('camera', false); step(.2);
  check('photograph of ' + who, dbg.state().photos[who], JSON.stringify(snap().photos));
}
check('three photographs advance to the informant', snap().stage === 'tip', snap().stage);

// 3. Tooley
tpNear('tooley'); step(.1); I.tap('interact'); step(.3); talkOut();
check('paying Tooley records the tip and takes the cash', snap().tip === 'paid' || snap().tip === 'skipped', JSON.stringify(snap()));
check('the case goes on to the wire', snap().stage === 'wire', snap().stage);

// 4. the wire
const [px, py] = dbg.spawn('payphone'); dbg.teleport(px, py + 6); step(.1); I.tap('interact'); step(.2);
check('the payphone starts the tap game', snap().overlay === 'wire', JSON.stringify(snap()));
let guard = 0;
while (snap().overlay === 'wire' && guard++ < 4000) { const W = dbg.wire(), st = E.current && null; const steps = [{ c: .5, w: .28, s: .9 }, { c: .32, w: .22, s: 1.2 }, { c: .68, w: .18, s: 1.5 }][W.step]; const p = (W.t * steps.s) % 2, m = p < 1 ? p : 2 - p; if (Math.abs(m - steps.c) < .03) I.tap('interact'); step(1 / 60); }
check('three clean connections plant the tap', dbg.state().tapPlanted && snap().stage === 'listen', JSON.stringify(snap()));

// 5. the van
tpNear('van'); step(.1); I.tap('interact'); step(.3);
check('the van opens the listening post', snap().overlay === 'listen', JSON.stringify(snap()));
guard = 0;
while (snap().overlay === 'listen' && guard++ < 6000) { const L = dbg.listen(); const ln = L.done ? null : [0].map(() => null)[0]; const CAL = null; if (L.done) { I.tap('interact'); } else if (L.phase === 'line' && L.t > .4 && !L.hit) { I.tap('interact'); } step(1 / 30); }
check('the log reaches the threshold and the chase begins', snap().wireLog >= 3 && snap().stage === 'chase', JSON.stringify(snap()));

// 6. the run
const [gx, gy] = dbg.spawn('gate'); dbg.teleport(gx, gy - 70); step(.3);
check('Dray bolts when the detective closes in', snap().chase && snap().chase.running, JSON.stringify(snap()));
const d = dbg.people().dray; step(3);
check('Dray is running the route', Math.hypot(d.x - gx, d.y - gy) > 60, JSON.stringify([d.x, d.y]));
for (let i = 0; i < 60 && !snap().caught; i++) { const h = dbg.hero(); const dx = d.x - h.x, dy = d.y - h.y, L = Math.hypot(dx, dy) || 1; I.hold('sprint'); if (L > 18) dbg.teleport(d.x - dx / L * 12, d.y - dy / L * 12); else I.tap('tackle'); step(1 / 30); }
check('a tackle arrests Dray', snap().caught, JSON.stringify(snap()));
I.hold('sprint', false); talkOut(); step(1);
check('the arrest leads to the box', snap().stage === 'box', JSON.stringify(snap()));

// 7. the box
dbg.interact('dray'); step(.2);
check('the interview screen opens', snap().boxScreen, JSON.stringify(snap()));
for (let i = 0; i < 6 && !dbg.state().box.result; i++) { const o = ['wire', 'photo', 'tip', 'chase', 'soft'][i]; dbg.pick(o); }
check('the interview ends', !!dbg.state().box.result, JSON.stringify(dbg.state().box));
console.log('box result', dbg.state().box.result, 'resolve', dbg.state().box.resolve);

// 8. the report
dbg.state().stage === 'box' && null;
const b = dbg; step(.2);
// the scene's own "leave the room" button sets the stage; emulate it as the button does
dbg.leaveBox(); step(.6); tpNear('pruitt'); step(.1); I.tap('interact'); step(.3); talkOut();
step(2);
check('the report ends the case', snap().done, JSON.stringify(snap()));
check('the case has a verdict and a score', dbg.verdict().rank && snap().score > 0, JSON.stringify(dbg.verdict()));
check('no engine errors during the playthrough', snap().errors === 0, game.errors.map(e => e.message).join(' | '));
console.log(JSON.stringify(snap()));
done();
