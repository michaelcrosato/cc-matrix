import { load, until, quickMatch } from '../lib.mjs';
/** player 1 bats; a forced delivery; returns the match after the press (offset seconds from the ideal moment) */
function face(seed, del, press) {
  const env = load({ seed }), { game, I, D } = env, m = quickMatch(env, { seed });
  until(game, () => m.phase === 'setup', 6); m.force.delivery = Object.assign({ grade: 'green', straight: true }, del);
  until(game, () => m.phase === 'flight', 8);
  if (press) {
    if (press.hold) I.hold(press.hold);
    const t = D.idealPress(press.btn || 'shot', press.aim || null); game.advance(Math.max(0, t + (press.off || 0)) - 1 / 120); I.tap(press.btn || 'shot');
  }
  game.advance(.6); if (press && press.hold) I.hold(press.hold, false);
  return { env, m };
}
export async function run(check) {
  let r = face(1, { id: 'dobber', target: [-4, 80] }, { off: 0 }); check('a press at the ideal moment is PERFECT', r.m.cur.grade === 'perfect', r.m.cur.grade);
  r = face(1, { id: 'dobber', target: [-4, 80] }, { off: .06 }); check('60 ms late is GOOD', r.m.cur.grade === 'good', r.m.cur.grade);
  r = face(1, { id: 'dobber', target: [-4, 80] }, { off: -.2 }); check('a press 200 ms early misses', r.m.cur.grade === 'miss', r.m.cur.grade);
  r = face(1, { id: 'dobber', target: [-4, 50] }, { off: 0, hold: 'down' }); check('stick straight and a PERFECT drive goes within 10 degrees of straight', r.m.contact && Math.abs(r.m.contact.theta) < 10, r.m.contact && r.m.contact.theta);
  r = face(1, { id: 'dobber', target: [-4, 50] }, { off: 0, hold: 'left' }); check('stick left (the off side) sends it through the off side', r.m.contact && r.m.contact.theta > 30, r.m.contact && r.m.contact.theta);
  r = face(2, { id: 'dobber', target: [-1.5, 60] }, null); until(r.env.game, () => r.m.phase === 'between', 16);
  let last = r.m.inn.recs[r.m.inn.recs.length - 1]; check('leaving a ball on the stumps gets the batter bowled', last && last.wicket && last.wicket.how === 'bowled', last && last.wicket);
  r = face(3, { id: 'dobber', target: [-22, 80] }, null); until(r.env.game, () => r.m.phase === 'between', 16);
  last = r.m.inn.recs[r.m.inn.recs.length - 1]; check('leaving a ball 20 units outside off is safe', last && !last.wicket && !last.extras.wd, last && { w: last.wicket, ex: last.extras });
  r = face(4, { id: 'bouncer', target: [-2, 175] }, null); until(r.env.game, () => r.m.phase === 'between', 16);
  last = r.m.inn.recs[r.m.inn.recs.length - 1]; check('ducking a bouncer: not out, and no wide (it was under head height)', last && !last.wicket, last && { w: last.wicket, ex: last.extras });
  r = face(5, { id: 'dobber', target: [-18, 60] }, { off: 0, aim: [-.77, .64], hold: 'left' }); check('a ball outside a drive\'s zone takes an edge', r.m.cur.edge || (r.m.contact && r.m.contact.kind === 'edge') || r.m.cur.beaten, { edge: r.m.cur.edge, c: r.m.contact && r.m.contact.kind });
  r = face(6, { id: 'dobber', target: [-4, 80] }, { off: 0, btn: 'loft', hold: 'down' }); check('a PERFECT loft goes in the air', r.m.contact && r.m.contact.launch > 25, r.m.contact && r.m.contact.launch);
  r = face(7, { id: 'dobber', target: [-4, 80] }, { off: 0, btn: 'block' }); check('a block is a defensive stroke', r.m.cur.shot === 'forwardDefence' || r.m.cur.shot === 'backDefence', r.m.cur.shot);
  // the AI never presses after the contact plane (its batPress returns false then): a CPU v CPU match has no late presses
  const env = load({ seed: 9 }); env.game.advance(.3); env.D.startMatch({ humans: {}, seed: 9 }); env.game.advance(.1); const m = env.D.match(); let late = 0; env.K.bus.on('bat:press', d => { if (d.delta > .2) late++; });
  until(env.game, () => m.phase === 'done', 400, 1 / 30); check('the CPU never presses after the ball has passed', late === 0, late);
}
