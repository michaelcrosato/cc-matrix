/* ---- ACTIONS (plan §6.7, §6.9, §6.11): the shot model (decided at release, flown after), passes that arrive at a
 * teammate's chest, catches, pickups of loose balls and the inbound. Every chance is one formula: no hidden rolls. ---- */
const ATTACK = [1, 0];                       // side 0 (HOME) attacks rim 1 (the right end); side 1 attacks rim 0
const attackRim = side => ATTACK[side];
const defendRim = side => 1 - ATTACK[side];
const ballReach = { h: 10, z: 59 };          // a catch: horizontal reach, and the height of standing hands (plan §6.11)

/** the distance from a point to a rim, in the same flat plane (world units) */
const rimDist = (x, y, rim) => Math.hypot(x - RIMW[rim].x, y - RIMW[rim].y);
/** the base chance by distance (§6.7): dist in court units */
const baseChance = d => {
  if (d <= 40) return .85;
  if (d <= 80) return lerp(.85, .70, (d - 40) / 40);
  if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64);
  if (d <= 320) return lerp(.30, .08, (d - 200) / 120);
  return .03;
};
/** the nearest defender between the shooter and the rim, for the contest (§6.7) */
const contestOf = (p, rim) => {
  let best = null, bd = 1e9;
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt) continue;
    const d = Math.hypot(q.body.x - p.body.x, q.body.y - p.body.y);
    if (d < bd) { bd = d; best = q; }
  }
  if (!best) return { mult: 1, who: null };
  const span = RIMW[rim].x - p.body.x, along = best.body.x - p.body.x;
  const between = along * span > 0 && Math.abs(along) < Math.abs(span);
  const airborne = best.body.z > 8 || best.state === 'block';
  if (between && bd < 30 && airborne) return { mult: 1 - tune('contestPenalty'), who: best };
  if (bd < 30) return { mult: .8, who: best };
  if (bd < 50) return { mult: .92, who: best };
  return { mult: 1, who: best };
};

/** the decided chance of a jump shot (§6.7): every factor is a formula, and the result is clamped to [0.02, 0.97] */
const shotChance = (p, rim, release, o = {}) => {
  const d = rimDist(p.body.x, p.body.y, rim), three = d > 136;
  const factor = three ? .70 + .06 * rate(p, 'deep') : .78 + .045 * rate(p, 'splash');
  let rel = 1;
  const window = tune('perfectWindow') * (p.laser > 0 ? 2 : 1);
  if (Math.abs(release) <= window / 2) rel = 1 + tune('perfectBonus');
  else if (Math.abs(release) <= window) rel = 1;
  else rel = 1 - tune('badReleasePenalty');
  const c = contestOf(p, rim);
  const wind = (S.twist.wind || 0), sideways = Math.abs(p.body.vy) > 150 && Math.abs(p.body.vy) > Math.abs(p.body.vx) ? .9 : 1;
  const windM = 1 - .35 * Math.abs(wind) * d / 320;
  let bonus = 0;
  if (p.nova) bonus += tune('novaShotBonus');
  if (p.laser > 0) bonus += .30;
  if (o.comeback) bonus += o.comeback;
  const k = (three ? tune('threeSkill') : tune('shotSkill')) * juiceFactor(p);
  let v = baseChance(d) * factor * rel * c.mult * k * (p.turboOn ? 1.05 : 1) * sideways * windM + bonus;
  if (o.extra) v += o.extra;
  return { p: clamp(v, .02, .97), three, d, contest: c.who };
};

/** the points of a shot (§6.6 Scoring): 2 inside the arc, 3 beyond it, decided by where the shooter left the floor */
const shotPoints = (p, rim) => rimDist(p.body.x, p.body.y, rim) > 136 ? 3 : 2;

/** a shot: decided at release, flown after (§6.7). from: the shooter; release: seconds from the top of its jump (negative
 * early); the aim (made or missed) and the target spot follow the decision */
const releaseShot = (p, release, kind = 'jump') => {
  const rim = attackRim(p.side), comeback = comebackOf(p.side);
  const dec = shotChance(p, rim, release, { comeback });
  let made = S.rng() < dec.p;
  if (S.cheats.shotsIn) made = true; else if (S.cheats.shotsOut) made = false;   // the dev panel's shots, always in or always out
  const from = { x: p.body.x + Math.cos(p.face) * 6, y: p.body.y + Math.sin(p.face) * 6, z: p.body.z + 46 };
  const R = RIMW[rim], dc = rim === 1 ? -1 : 1;   // dc: the court's direction from this rim (x)
  let target;
  if (made) {
    const rattle = S.rng() < .25, spread = rattle ? 6 : 1.5;   // one make in four is rattled in from 3 units off the centre
    target = { x: R.x + (S.rng() - .5) * spread, y: R.y + (S.rng() - .5) * spread, z: R.z - 2 };
  } else {
    const off = (S.rng() < .5 ? -1 : 1) * (10.5 + S.rng() * 2.5), ang = S.rng();
    if (ang < .12 && dec.d > 136) target = { x: R.x + dc * 40, y: R.y + off, z: R.z + 8 };                       // an airball, far off
    else if (ang < .3) target = { x: BOARD_PLANE[rim] + dc * 9, y: R.y + off * .4, z: 86 };                    // the glass, from the court side
    else target = { x: R.x + dc * (10.5 + S.rng() * 2.5), y: R.y + off, z: R.z + 2 };                          // the front rim
  }
  const rise = clamp(18 + dec.d * .10, 18, 60) * tune('shotArc');   // (E.arc's apex: how far it rises over the higher end)
  const v = ballFlight(from, target, rise);
  const rec = { shooter: p.slot, made, p: dec.p, points: shotPoints(p, rim), three: dec.three, perfect: Math.abs(release) <= tune('perfectWindow') / 2, release, kind, dist: dec.d, rim, t: S.match.clock, age: 0 };
  p.shot = null;   // the shooter's machine is done: it lands from here
  ballRelease(S.ball, from, v, 'shot', rec);
  S.ball.owner = null; p.hasBall = false;
  S.match.shotsInFlight = (S.match.shotsInFlight || 0) + 1;
  p.stats.fga++; if (rec.three) p.stats.tpa++;
  emit('shotStart', { slot: p.slot, shooter: p.id, p: dec.p, three: rec.three, perfect: rec.perfect, dist: dec.d, side: p.side, kind });
  emit('release', { slot: p.slot, shooter: p.id, perfect: rec.perfect, three: rec.three, release });
  return rec;
};

/** the comeback assist (§8): a team trailing by 4 or more from Q2 on gets a chance bonus; Tournament mode turns it off */
const comebackOf = side => {
  const m = S.match, lvl = setting('comeback'), k = { Off: 0, Low: .2, Normal: .35 }[lvl] ?? tune('comeback');
  if (!m || k <= 0 || m.quarter < 2 || S.cheats.tournament) return 0;
  const d = m.score[1 - side] - m.score[side];
  return d >= 4 ? k * Math.min(d, 15) / 15 * .12 : 0;
};

/** a pass to a teammate (§6.9): the ball flies at the receiver's chest, led by its velocity; speed by DIME */
const passBall = (p, to) => {
  const b = S.ball, m = to || teammateOf(p);
  if (!m) return null;
  const from = { x: p.body.x + Math.cos(p.face) * 8, y: p.body.y + Math.sin(p.face) * 8, z: p.body.z + 30 };
  const sp = (180 + 12 * rate(p, 'dime')) * 1.6;
  const d = Math.hypot(m.body.x - from.x, m.body.y - from.y);
  const t = Math.max(.1, d / sp), lead = Math.min(t, .8);
  const tx = m.body.x + m.body.vx * lead * .6, ty = m.body.y + m.body.vy * lead * .6, tz = m.body.z + 30;
  const v = { vx: (tx - from.x) / t, vy: (ty - from.y) / t, vz: (tz - from.z + .5 * tune('ballGravity') * t * t) / t };
  ballRelease(b, from, v, 'pass', null);
  b.to = m.slot; b.from = p.slot; b.passT = S.match.clock;
  p.cool.pass = .2; p.passT = 0;
  p.hasBall = false; b.owner = null;
  if (S.match && S.match.phase === 'inbound') { S.match.phase = 'live'; S.match.dead = false; }   // the inbound's pass ends the wait
  emit('pass', { slot: p.slot, to: m.slot, side: p.side, dist: d });
  return m;
};
/** the teammate a pass goes to: the one ahead or open (never the player itself) */
const teammateOf = p => S.players.find(q => q.side === p.side && q !== p && q.onCourt) || null;

/** a player takes the ball: it is in his hands from now (held), and the other team's stealing ends */
const takeBall = (p, how = 'catch') => {
  const b = S.ball;
  if (b.owner === p) return;
  if (b.owner) b.owner.hasBall = false;
  b.owner = p; p.hasBall = true; b.state = b.state === 'inbound' ? 'inbound' : 'held';
  b.shot = null; b.scored = [false, false]; b.roll = 0;
  b.lastTouch = p.slot;
  if (how !== 'loose-steal') newPossession(p.side);
  emit(how === 'rebound' ? 'rebound' : 'catch', { slot: p.slot, side: p.side, how });
  if (how === 'rebound') p.stats.reb++;
  return p;
};

/** the ball goes loose: nobody holds it; the next player to reach it takes it */
const releaseLoose = (b, spd = 0) => { if (b.owner) { b.owner.hasBall = false; b.owner = null; } b.state = b.state === 'held' || b.state === 'dribble' ? 'loose' : b.state; b.lastTouch = null; };

/** a shot resolves: its count leaves the flight, the rebound is known (the match reads the record) */
const shotOver = b => { const m = S.match; if (m && m.shotsInFlight > 0) m.shotsInFlight--; if (b.shot) b.shot.resolved = true; };

/** pick up loose balls and balls the player reaches: a pass for its receiver, a missed shot in the air (a rebound), a
 * ball on the floor. A made shot is never caught; the shooter can't take its own shot back for .4 s. */
const reachBall = p => {
  const b = S.ball;
  if (!p.onCourt || b.owner || b.state === 'dead' || b.state === 'inbound') return false;
  const d = Math.hypot(b.x - p.body.x, b.y - p.body.y);
  const top = p.body.z + ballReach.z + (p.jumping ? 14 : 0);
  if (d > ballReach.h || b.z < p.body.z - 4 || b.z > top) return false;
  if (b.state === 'pass' && b.to !== p.slot) return false;
  if (b.state === 'shot') {
    if (b.shot.made) return false;
    if (b.shot.shooter === p.slot && b.shot.age < .4) return false;
    if (b.z > 40 && b.vz > 0) return false;
    shotOver(b);
    return takeBall(p, 'rebound'), true;
  }
  takeBall(p, 'catch');
  if (b.state === 'pass') b.to = null;
  return true;
};
