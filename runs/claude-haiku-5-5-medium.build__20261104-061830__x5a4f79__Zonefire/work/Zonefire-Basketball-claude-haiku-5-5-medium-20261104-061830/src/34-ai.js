/* ---- THE CPU (plan §8): one brain per CPU player. It decides at 10 Hz (staggered per player), commits to what it chose for
 * a moment, and steers every step by writing the same command a human's controls would. Roles per possession: HANDLER,
 * OFFBALL, DEFENDER (a mark), LOOSE (the nearest chases a loose ball). Difficulty sets the noise, reaction delay, release
 * error, block timing, steal tries and shove rate (the table in §8). ---- */
const DIFF = {
  Rookie: { noise: .35, react: .35, release: .12, block: .18, steal: .6, shove: .20, turbo: .50 },
  Pro: { noise: .60, react: .22, release: .08, block: .12, steal: 1.0, shove: .45, turbo: .75 },
  'All-Star': { noise: .80, react: .14, release: .05, block: .07, steal: 1.4, shove: .65, turbo: .90 },
  BLAM: { noise: .95, react: .08, release: .03, block: .04, steal: 1.8, shove: .80, turbo: 1.0 }
};
/** the difficulty's numbers for a CPU player: the setting, shifted by the Tour's stop (§10.5), and skill's offset */
const diffOf = p => {
  const names = ['Rookie', 'Pro', 'All-Star', 'BLAM'], base = names.indexOf(setting('difficulty') || 'Pro');
  const shift = (S.tourShift || 0), v = clamp(base + shift + tune('cpuSkill') * 2, 0, 3), lo = Math.floor(v), hi = Math.min(3, lo + 1), f = v - lo;
  const a = DIFF[names[lo]], b = DIFF[names[hi]], out = {};
  for (const k of Object.keys(a)) out[k] = lerp(a[k], b[k], f);
  return out;
};
/** a normal draw (Box-Muller) from the match's seeded stream */
const gauss = () => { const u = Math.max(1e-6, S.rng()), v = S.rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v); };

/** a fresh brain for a CPU player */
const newBrain = (p, stagger) => ({ next: stagger, dec: null, decT: 0, move: [0, 0], wantShoot: false, wantPass: null, wantDrive: false, plan: 0, lastDec: -1 });

/** the nearest opponent (and its distance) to a point */
const nearestOpp = (p, x = p.body.x, y = p.body.y) => {
  let best = null, bd = 1e9;
  for (const q of S.players) { if (q.side === p.side || !q.onCourt) continue; const d = Math.hypot(q.body.x - x, q.body.y - y); if (d < bd) { bd = d; best = q; } }
  return { who: best, d: bd };
};
/** the open-ness of a teammate: the distance to its nearest opponent */
const openness = (mate) => nearestOpp(mate).d;

/** the handler's choice, rated every decision: shoot (its chance), drive (the lane), pass (a teammate more open) */
const handlerDecide = (p, bs, dif) => {
  const rim = attackRim(p.side), R = RIMW[rim], d = rimDist(p.body.x, p.body.y, rim);
  const sc = shotChance(p, rim, 0).p;
  const mate = teammateOf(p), mo = mate ? openness(mate) : 0, mine = nearestOpp(p);
  // a shot is taken when it is good, or when the clock forces one; otherwise a pass to someone more open, else the drive
  const urgent = S.match.shotClock < 4, good = sc >= .3 * (1 + (1 - dif.noise) * .4);
  const passOk = mate && mo > 40 && mo > mine.d * 1.2;
  if (urgent || (good && d < 300)) return { k: 'shoot', sc };
  if (passOk && S.rng() < .5 + dif.noise * .2) return { k: 'pass', to: mate };
  return { k: 'drive', rim, sc };
};

/** a player's roles and spots (the formation, §8 Off the ball and Defense) */
const offSpot = p => {
  const rim = attackRim(p.side), R = RIMW[rim], dc = rim === 1 ? -1 : 1, mate = teammateOf(p);
  const spotX = R.x + dc * (p.slot % 2 ? 150 : 100), spotY = CENTRE().y + (p.slot % 2 ? -70 : 70);
  if (mate && mate.hasBall) return [spotX, spotY + (p.slot % 2 ? -30 : 30)];
  return [spotX, spotY];
};
const defSpot = p => {
  const b = S.ball, own = defendRim(p.side), R = RIMW[own];
  const mark = S.players.find(q => q.side !== p.side && q.onCourt && (q.hasBall)) || nearestOpp(p).who;
  const target = mark || { body: { x: CENTRE().x, y: CENTRE().y } };
  const dx = R.x - target.body.x, dy = R.y - target.body.y, d = Math.hypot(dx, dy) || 1;
  const k = mark && mark.hasBall ? 18 : 26;
  return [target.body.x + dx / d * k, target.body.y + dy / d * k, mark];
};

/** the brain for one step: the decision (every 0.1 s after a reaction delay), then the steering that follows it */
const brainCmd = (p, dt) => {
  const bs = p.brain || (p.brain = newBrain(p, 0)), dif = diffOf(p), c = emptyCmd();
  bs.next -= dt;
  bs.decided = false;
  if (bs.next <= 0) {
    bs.next = .1; bs.decided = true;   // the decision tick: the chance rolls below happen here, once a tenth of a second
    const b = S.ball, m = S.match;
    if (p.hasBall) bs.dec = handlerDecide(p, bs, dif);
    else bs.dec = { k: 'off' };
  }
  const dec = bs.dec || { k: 'off' };
  if (S.match.phase === 'break' || S.match.over) return c;
  if (p.hasBall) {
    if (dec.k === 'shoot' && p.state !== 'gather' && p.state !== 'jump' && p.body.z < 1.5) {
      if (!p.shot) { c.shoot.pressed = true; c.shoot.down = true; p.nextShotPlan = gauss() * dif.release; }   // the release error, drawn for this shot
    }
    if (dec.k === 'pass' && dec.to && p.cool.pass <= 0) c.pass.pressed = true;
    // a spin move against a defender right in front; a shove against a defender in the paint
    const foe = nearestOpp(p);
    if (bs.decided && foe.who && foe.d < 22 && p.cool.spin <= 0 && p.turbo > .3 && S.rng() < .04 * dif.shove * 3 && p.body.z < 1) c.shove.pressed = true;
    const rim = attackRim(p.side), R = RIMW[rim];
    const dx = R.x - p.body.x, dy = R.y - p.body.y, d = Math.hypot(dx, dy) || 1;
    c.move = [dx / d, dy / d];
    const inDunk = d < dunkRangeOf(p) && rate(p, 'slam') >= 4;
    c.turbo.down = inDunk ? (bs.decided && S.rng() < .16) : (bs.decided ? S.rng() < dif.turbo * .35 : !!p.turboOn) && d > 90;   // turbo for a dunk in range (rarely: one in three baskets), or to run
  } else if (p.side === S.ball.owner?.side || (S.ball.owner && S.ball.owner.side === p.side)) {
    // offence without the ball: spread to a spot
    const [sx, sy] = offSpot(p), dx = sx - p.body.x, dy = sy - p.body.y, d = Math.hypot(dx, dy);
    c.move = d > 6 ? [dx / d, dy / d] : [0, 0];
    c.turbo.down = S.rng() < dif.turbo * .5 && d > 60;
  } else {
    // defence: a mark, between it and the own rim; the loose ball goes to the nearest
    const loose = !S.ball.owner && (S.ball.state === 'loose' || S.ball.state === 'pass' || S.ball.state === 'shot');
    const nearestToBall = S.players.filter(q => q.side === p.side && q.onCourt).sort((a, z) => Math.hypot(a.body.x - S.ball.x, a.body.y - S.ball.y) - Math.hypot(z.body.x - S.ball.x, z.body.y - S.ball.y))[0] === p;
    let tx, ty, mark;
    if (loose && nearestToBall) { tx = S.ball.x; ty = S.ball.y; }
    else { [tx, ty, mark] = defSpot(p); }
    const dx = tx - p.body.x, dy = ty - p.body.y, d = Math.hypot(dx, dy);
    c.move = d > 5 ? [dx / d, dy / d] : [0, 0];
    c.turbo.down = S.rng() < dif.turbo * .4 && d > 60;
    brainDefend(p, c, dif, bs.decided);
    // a jump to block or rebound when the ball is in the air near us
    const ballUp = S.ball.z > 20, onFloor = p.body.z < 1 && !p.jumping && p.state !== 'jump' && p.state !== 'gather';
    if (bs.decided && S.ball.state === 'shot' && Math.hypot(S.ball.x - p.body.x, S.ball.y - p.body.y) < 40 && p.cool.block <= 0 && onFloor && S.rng() < dif.block) c.shoot.pressed = true;
    if (bs.decided && loose && nearestToBall && d < 12 && ballUp && onFloor && S.rng() < .3) c.shoot.pressed = true;   // a rebound jump, for a ball in the air
  }
  return c;
};

/** the CPU's buttons without the ball (§8 Defense): a steal swipe when adjacent from a good angle, a shove in the paint
 * against the handler; a block jump (above) and a rebound jump are in the decision. Called from the brain's steering. */
const brainDefend = (p, c, dif, tick) => {
  const h = S.ball.owner;
  if (!tick || !h || h.side === p.side) return;
  const d = Math.hypot(h.body.x - p.body.x, h.body.y - p.body.y);
  if (d < 16 && p.cool.steal <= 0 && S.rng() < .3 * dif.steal) c.pass.pressed = true;   // (a swipe: the pass button without the ball)
  if (d < 18 && p.turbo > .2 && p.cool.shove <= 0 && S.rng() < .08 * dif.shove * tune('cpuAggression')) c.shove.pressed = true;
};
