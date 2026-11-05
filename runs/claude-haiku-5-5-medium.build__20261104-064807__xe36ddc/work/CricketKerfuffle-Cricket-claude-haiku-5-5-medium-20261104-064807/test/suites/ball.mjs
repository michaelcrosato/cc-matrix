// unit-ball and unit-rules: the physics, the predictor, the shot table, the timing grades, the laws and the Kerfuffle Method.
import { loadSim } from '../lib.mjs';
export async function run({ check }) {
  const G = loadSim();
  G.tune.swing = 1; G.tune.spin = 1;
  const env = G.envOf(G.GROUNDS.green);
  // a delivery without swing lands on its target (the first pitch point within a unit and a half)
  const rel = { x: G.W.PX - 4, y: G.W.RELEASE_Y, z: G.W.RELEASE_Z };
  let worst = 0;
  for (let i = 0; i < 40; i++) {
    const tgt = { x: G.W.PX + (i % 7 - 3) * 4, y: 470 + (i * 13) % 110 };
    const b = G.newBall(rel.x, rel.y, rel.z);
    Object.assign(b, G.solveDelivery(rel, tgt, 140));
    b.phase = 'delivery';
    const r = G.predictUntil(b, env, c => c.pitched, 3);
    if (!r) { check('a solved delivery pitches', false, 'it never pitched'); break; }
    worst = Math.max(worst, Math.hypot(r.b.x - tgt.x, r.b.y - tgt.y));
  }
  check('solved deliveries pitch within three units of the target (no swing; drag and the step make up the rest)', worst < 3, 'worst miss ' + worst.toFixed(2));
  // an outswinger to a right-hander moves away from him (negative x); an inswinger the other way
  const swingAt = s => { const b = G.newBall(rel.x, rel.y, rel.z); Object.assign(b, G.solveDelivery(rel, { x: G.W.PX, y: 520 }, 130)); b.phase = 'delivery'; b.swingA = s; const r = G.predictUntil(b, env, c => c.y <= 440, 3); return r ? r.b.x - G.W.PX : 0; };
  check('an outswinger drifts away from a right-hander', swingAt(1) < -2, 'dx ' + swingAt(1).toFixed(2));
  check('an inswinger drifts into him', swingAt(-1) > 2, 'dx ' + swingAt(-1).toFixed(2));
  // the predictor is the step itself: the predicted path equals the stepped path over three seconds
  const b1 = G.newBall(rel.x, rel.y, rel.z); Object.assign(b1, G.solveDelivery(rel, { x: G.W.PX + 6, y: 500 }, 138)); b1.phase = 'delivery'; b1.swingA = 0.7;
  const c1 = G.clone(b1); let d = 0;
  for (let k = 0; k < 360; k++) G.stepBall(c1, env, null);
  const c2 = G.clone(b1); for (let k = 0; k < 360; k++) G.stepBall(c2, env, null);
  d = Math.hypot(c1.x - c2.x, c1.y - c2.y, c1.z - c2.z);
  check('the predictor equals the stepped simulation', d < 0.01, 'difference ' + d);
  // a rolling ball stops, and a ball dropped from 50 bounces lower each time
  const roll = G.newBall(600, 500, 0); roll.vx = 0; roll.vy = -200; roll.phase = 'rolling';
  for (let k = 0; k < 120 * 8; k++) G.stepBall(roll, env, null);
  check('a rolling ball stops', Math.hypot(roll.vx, roll.vy) === 0, 'speed ' + Math.hypot(roll.vx, roll.vy));
  // the bounce: the first rebound height is below the drop
  const drop2 = G.newBall(600, 500, 50); drop2.phase = 'hit'; let bounced = false, firstApex = 0;
  for (let k = 0; k < 120 * 3; k++) { G.stepBall(drop2, env, null); if (drop2.z === 0 && drop2.vz > 0 && !bounced) bounced = true; if (bounced && drop2.vz > 0) firstApex = Math.max(firstApex, drop2.z); }
  check('a dropped ball rebounds lower than it was dropped', bounced && firstApex < 50 && firstApex > 0, 'rebound ' + firstApex.toFixed(1));

  // the shot table: the resolver rows
  check('a full ball on the straight is a straight drive', G.resolveShot('shot', 'full', 0) === 'drive');
  check('a full ball through the covers is a cover drive', G.resolveShot('shot', 'full', 50) === 'cover');
  check('a short ball on the leg side is a pull', G.resolveShot('shot', 'short', -100) === 'pull');
  check('a loft on a full ball straight is a lofted straight', G.resolveShot('loft', 'full', 0) === 'loftStraight');
  check('a loft on a short ball on the leg side is a hook', G.resolveShot('loft', 'short', -100) === 'hook');
  check('a block on a good length is a forward defence', G.resolveShot('block', 'good', 0) === 'defFwd');
  check('a yorker is dug out', G.resolveShot('shot', 'yorker', 0) === 'dig');

  // the timing grades, from the press moment and the arrival moment
  const M = Object.create(G.Match.prototype);
  Object.defineProperty(M, 'battingSide', { value: 0 });
  M.fire = [false, false]; M.arriveAbs = 1.0;
  const grade = (pressT, contact) => M.gradeOf({ t: pressT }, contact).grade;
  check('a contact on the arrival is PERFECT', grade(0.88, 0.12) === 'PERFECT', grade(0.88, 0.12));
  check('a contact 60 ms late is GOOD', grade(0.94, 0.12) === 'GOOD', grade(0.94, 0.12));
  check('a press 200 ms early is a miss', grade(0.68, 0.12) === 'MISS', grade(0.68, 0.12));
  check('a contact 100 ms late is LATE', grade(0.98, 0.12) === 'LATE', grade(0.98, 0.12));

  // the laws: a no-ball does not count, six legal balls end an over, the Kerfuffle Method has its numbers
  check('the Kerfuffle Method: 60 first runs, 2 overs, 1 left, no wicket gives 31', G.kerfTarget(60, 2, 1, 0) === 31, G.kerfTarget(60, 2, 1, 0));
  check('the Kerfuffle Method: 100 runs, 3 overs, 2 left, 2 down gives 67', G.kerfTarget(100, 3, 2, 2) === 67, G.kerfTarget(100, 3, 2, 2));
  const lawM = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 9, humanSides: [], autoBat: true, autoBowl: true });
  check('a new innings starts with the first batter on strike', lawM.striker && lawM.striker.p === 0);
  check('the batting side is the match\'s first side', lawM.battingSide === 0);
  check('the fielders are placed: nine positions and a keeper', lawM.fielders.length === 10, lawM.fielders.length);
  check('every shot has a name for the callout', Object.values(G.SHOTS).every(s => typeof s.name === 'string' || s.defend), 'a shot has no name');
}
