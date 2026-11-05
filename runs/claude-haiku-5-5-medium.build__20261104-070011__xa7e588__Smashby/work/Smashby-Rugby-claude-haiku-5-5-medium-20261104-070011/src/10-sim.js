// THE MATCH SIMULATION: rules, physics, contact, set pieces, the AI. It reads intents and writes match state; it never
// draws. Seeded (SM.seed), fixed-step (the engine's update), every number from SM.TUNE.v. A human seat's intent is read
// from its engine input by SM.readSeat(); the CPU's comes from SM.brain(). Both give the same shape:
//   { mx, my (the stick), turbo (held), press: { tackle, sidestep, fend, dive, passUp, passDown, kick, superPress, mash,
//     jackal, switchUp, switchDown, chooseUp, chooseDown, scrumPress }, kickHeld (bool), kickReleased (bool) }
SM.M = null;
const G = 600;                                       // ball gravity (units per second squared)
const DIRS = s => (s === 0 ? 1 : -1);               // side 0 attacks toward +x, side 1 toward -x
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ANG = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const TUNE = (k, fallback) => (SM.TUNE.v[k] !== undefined ? SM.TUNE.v[k] : fallback);
const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const emptyIntent = () => ({ mx: 0, my: 0, turbo: false, press: {}, kickHeld: false, kickReleased: false });
SM.approach = approach; SM.emptyIntent = emptyIntent; SM.ANG = ANG; SM.DIRS = DIRS;

const statsBlock = () => ({ tries: 0, conversions: 0, tackles: 0, missed: 0, bigHits: 0, monster: 0, metres: 0, breaks: 0, turnovers: 0, cards: 0, poss: 0, terr: 0, passes: 0, kicks: 0, carries: 0 });

// a player: the stats are the team sheet's five numbers (speed, power, hands, kicking, tackling)
function makePlayer(side, pos, def, idx) {
  const [name, nick, role, build, size, hair, hairC, skin, hat, stats] = def;
  return {
    i: idx, side, pos, role, name, nick, build, size, hair, hairC, skin, hat,
    stats: { SPD: stats[0], POW: stats[1], HND: stats[2], KCK: stats[3], TKL: stats[4] },
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: side ? Math.PI : 0,
    st: 'run', stT: 0, cool: 0, turbo: TUNE('turboTank'), evade: 0, evadeT: 0, fendT: 0, fendCD: 0, diveT: 0, bigCharge: 0, bigHeld: false,
    stunT: 0, bin: 0, onFire: false, cheer: 0, mudT: 0, aiT: 0, plan: null, planT: 0, seat: null, homeT: 0, toasted: 0,
    lastPass: 0, holdKick: 0, kickHeld: false, switchCD: 0, superT: 0
  };
}

// the match: teams are indexes into SM.TEAMS; venue into SM.VENUES
SM.newMatch = function (o) {
  SM.seed(o.seed || 1);
  const venue = SM.VENUES[o.venue || 0];
  const teams = [SM.TEAMS[o.home || 0], SM.TEAMS[o.away == null ? 1 : o.away]];
  const M = {
    teams, venue, half: 1, run: 0, halfLen: o.halves || TUNE('halfLength'), phase: 'kickoff', pt: 0, score: [0, 0], hype: [0, 0],
    players: [], ball: null, hooter: false, hooterWait: false, golden: false, over: false, attract: !!o.attract, cup: !!o.cup,
    stats: [statsBlock(), statsBlock()], events: [], seats: [], ruck: null, scrum: null, lineout: null, pen: null, conv: null, tryT: 0,
    lastTry: [-1, -1], lastTouch: 0, kickSide: 0, kickT: 0, halfT: 0, powerups: [], powerupT: 25, mud: [], grates: [], lightning: null,
    lightningT: 20, grateT: 9, wind: 0, windT: 18, windDir: 0, wind2: 0, refX: SM.CX, refY: SM.Y1 + 30, superT: [0, 0], fail: null,
    banner: null, bannerT: 0, t: 0, passes: 0, carrier: null, flightKind: null, scorer: null, ruckWon: [0, 0], clucky: null, scrumOver: false
  };
  SM.M = M;
  if (venue.mud) for (let k = 0; k < 6; k++) M.mud.push({ x: SM.lerp(SM.X0 + 120, SM.X1 - 120, SM.fx()), y: SM.lerp(SM.Y0 + 60, SM.Y1 - 60, SM.fx()), r: 28 + SM.fx() * 26 });
  if (venue.id === 'furnace') for (let k = 0; k < 8; k++) M.grates.push({ x: SM.lerp(SM.X0 + 100, SM.X1 - 100, k / 7), y: SM.Y0 + 22, state: 'cold', t: 0 }, { x: SM.lerp(SM.X0 + 100, SM.X1 - 100, k / 7), y: SM.Y1 - 22, state: 'cold', t: 0 });
  for (let s = 0; s < 2; s++) teams[s].players.forEach((def, k) => {
    const p = makePlayer(s, k, def, s * 7 + k);
    // the kit: the home side wears its home colours; the away side its away kit (always the away one for side 1)
    const kit = s === 0 ? teams[s].colors : teams[s].away;
    p.rig = new My3D2dge.Humanoid({ size: p.size, build: p.build, hair: p.hair, weapon: null, hat: p.hat === 'none' ? undefined : p.hat,
      colors: Object.assign({ hair: p.hairC, skin: p.skin }, kit) });
    M.players.push(p);
  });
  M.ball = { x: SM.CX, y: SM.CY, z: 0, vx: 0, vy: 0, vz: 0, state: 'placed', owner: null, lastTouch: 0, kind: null, passer: null, receiver: null, spin: 0, roll: 0, flightTo: null, bounces: 0, droppedBy: null };
  for (const h of o.humans || []) SM.seatPlayer({ input: h.input, name: h.name || 'P' + (M.seats.length + 1), color: h.color }, M.players.find(q => q.side === h.side && q.pos === h.pos));
  SM.kickoff(o.kickSide || 0);
  return M;
};

// seats: a human's input and the player it drives
SM.seatPlayer = function (seatDef, p) {
  const M = SM.M;
  const seat = Object.assign({}, seatDef, { p: null, side: p ? p.side : seatDef.side });
  M.seats.push(seat);
  if (p) SM.takeControl(seat, p);
  return seat;
};
SM.takeControl = function (seat, p) {
  if (seat.p) seat.p.seat = null;
  const prev = p.seat; if (prev && prev !== seat) prev.p = null;
  seat.p = p; p.seat = seat; seat.side = p.side;
};

// kick-offs, the formation: the kicking side in its own half, the receivers spread across the other half
SM.kickoff = function (kickSide) {
  const M = SM.M;
  if (M.hooter && M.half === 2) return SM.fullTime();
  if (M.hooter) return SM.halfOver();
  M.phase = 'kickoff'; M.pt = 0; M.kickSide = kickSide; M.kickT = 1.2;
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = SM.CX; b.y = SM.CY; b.z = 0; b.vx = b.vy = b.vz = 0;
  for (const p of M.players) {
    if (p.bin > 0) continue;
    const d = DIRS(p.side), k = p.pos;
    if (p.side === kickSide) {
      const fh = k === 4;
      p.x = fh ? SM.CX - d * 4 : SM.CX - d * (48 + k * 6); p.y = fh ? SM.CY : SM.CY + (k - 3) * 34;
    } else {
      p.x = SM.CX + d * (150 + (k % 3) * 24); p.y = SM.CY + (k - 3) * 52;
    }
    p.y = SM.clamp(p.y, SM.Y0 + 14, SM.Y1 - 14);
    p.vx = p.vy = 0; p.facing = p.side ? Math.PI : 0; p.st = 'run'; p.stT = 0; p.fendT = p.evade = p.diveT = 0; p.z = 0; p.vz = 0;
  }
  SM.event('kickoff', { side: kickSide });
};
SM.event = (t, data) => { const e = Object.assign({ t }, data || {}); SM.M.events.push(e); return e; };

// the spot a player wants: the attacking shape behind the ball, or the defensive line in front of each attacker
SM.shapeFor = function (p) {
  const M = SM.M, b = M.ball, d = DIRS(p.side);
  const haveBall = b.owner && b.owner.side === p.side;
  const attacking = haveBall || (b.state !== 'held' && b.lastTouch === p.side && b.state !== 'placed');
  if (attacking) {
    if (b.owner === p) return [b.x, b.y];
    const slots = [[-14, -26], [-8, 0], [-14, 26], [-22, 0], [-42, 0], [-60, -24], [-84, -54]];
    const s = slots[p.pos];
    const tx = b.x + d * s[0], ty = b.y + s[1];
    return [SM.clamp(tx, SM.X0 - 40, SM.X1 + 40), SM.clamp(ty, SM.Y0 + 14, SM.Y1 - 14)];
  }
  // defending: the attackers by y; each defender sits in front of the attacker of the same rank
  const atk = M.players.filter(q => q.side !== p.side && q.bin <= 0).sort((a, c) => a.y - c.y);
  const mine = M.players.filter(q => q.side === p.side && q.bin <= 0).sort((a, c) => a.y - c.y);
  const rank = Math.max(0, mine.indexOf(p)), target = atk[Math.min(atk.length - 1, rank)];
  if (!target) return [b.x, b.y];
  const dd = DIRS(target.side);
  return [SM.clamp(target.x + dd * 26, SM.X0 - 30, SM.X1 + 30), SM.clamp(target.y, SM.Y0 + 14, SM.Y1 - 14)];
};

// a kick: the apex sets the flight; the landing spot sets the speed (2 * vz / G seconds in the air)
SM.kickFlight = function (fromX, fromY, tx, ty, apex, kind, kicker) {
  const b = SM.M.ball, dx = tx - fromX, dy = ty - fromY, d = Math.hypot(dx, dy) || 1;
  const vz = Math.sqrt(2 * G * apex), T = 2 * vz / G, sp = d / T;
  b.x = fromX; b.y = fromY; b.z = 8; b.vx = dx / d * sp; b.vy = dy / d * sp; b.vz = vz;
  b.state = 'air'; b.owner = null; b.kind = kind; b.passer = kicker || null; b.receiver = null; b.spin = 0; b.flightTo = [tx, ty];
  b.lastTouch = kicker ? kicker.side : b.lastTouch;
  if (kicker) SM.M.stats[kicker.side].kicks++;
};

// pass: a low, quick ball to the receiver's lead point; it is caught inside his reach (SM.ballStep decides)
SM.passTo = function (p, recv) {
  const M = SM.M, b = M.ball, T = TUNE('passSpeed');
  const d = dist(p.x, p.y, recv.x, recv.y), t = d / T;
  const tx = recv.x + recv.vx * t * .8, ty = recv.y + recv.vy * t * .8;
  const dx = tx - p.x, dy = ty - p.y, L = Math.hypot(dx, dy) || 1;
  b.x = p.x + dx / L * 8; b.y = p.y + dy / L * 8; b.z = 10; b.vx = dx / L * T; b.vy = dy / L * T; b.vz = 0;
  b.state = 'pass'; b.owner = null; b.kind = 'pass'; b.passer = p; b.receiver = recv; b.lastTouch = p.side; b.bounces = 0;
  M.stats[p.side].passes++; M.passes++;
  p.cool = .15;
};

// the legal receivers from p: teammates behind or level with him (never in front: no forward passes), on the side asked
SM.legalReceivers = function (p, up) {
  const M = SM.M, d = DIRS(p.side);
  return M.players.filter(q => q.side === p.side && q !== p && q.bin <= 0 && q.st !== 'tackled' && q.st !== 'ground' && q.stunT <= 0 &&
    (q.x - p.x) * d <= 4 && dist(p.x, p.y, q.x, q.y) < 230 && (up ? q.y < p.y - 2 : q.y > p.y + 2)).sort((a, c) => Math.abs(a.y - p.y) - Math.abs(c.y - p.y));
};

// the referee: standing behind play on the attack side, seeing a cone toward the ball
SM.refUpdate = function (dt) {
  const M = SM.M, b = M.ball, atk = b.lastTouch;
  const d = DIRS(atk);
  const tx = b.x - d * 56, ty = SM.Y1 + 32;
  M.refX = SM.lerp(M.refX, SM.clamp(tx, SM.X0 - 60, SM.X1 + 60), .08); M.refY = SM.lerp(M.refY, ty, .08);
  M.refFace = Math.atan2(b.y - M.refY, b.x - M.refX);
};
SM.refSees = function (p) {
  if (SM.CHEATS.refBlind) return false;
  if (SM.CHEATS.refStrict) return true;
  const M = SM.M, dx = p.x - M.refX, dy = p.y - M.refY, d = Math.hypot(dx, dy);
  if (d > TUNE('refRange') || d < 1) return d < 1;
  return Math.abs(ANG(M.refFace, Math.atan2(dy, dx))) < TUNE('refFov') / 2 + .2;
};

// a foul: the penalty goes to the other side at the mark. The offender may be carded (cheap and high tackles).
SM.foul = function (kind, offender, x, y, seenOnly) {
  const M = SM.M;
  const seen = seenOnly ? SM.refSees(offender) : true;
  if (!seen) { SM.event('unseen', { kind, side: offender.side }); return false; }
  const pen = M.pen = { side: 1 - offender.side, x: SM.clamp(x, SM.X0 + 10, SM.X1 - 10), y: SM.clamp(y, SM.Y0 + 10, SM.Y1 - 10), kind, offender, choice: null, t: 0, wait: 0.4 };
  SM.event('foul', { kind, side: offender.side, name: offender.nick });
  if (kind === 'cheap' || kind === 'high') SM.sendOff(offender);
  M.ball.owner = null; M.ball.state = 'placed'; M.ball.x = pen.x; M.ball.y = pen.y; M.ball.z = 0;
  SM.setPhase('penalty');
  return true;
};

// the sin bin: a yellow card, the team plays with six for sinBin seconds of play
SM.sendOff = function (p) {
  const M = SM.M;
  // a second yellow for the same player is a red card: off for the rest of the match
  p.yellows = (p.yellows || 0) + 1;
  const red = p.yellows >= 2;
  p.bin = red ? Infinity : TUNE('sinBin'); p.st = 'bin'; p.seat = null; p.sentOff = red;
  M.stats[p.side].cards++;
  if (M.ball.owner === p) SM.dropBall(p, 0);
  for (const s of M.seats) if (s.p === p) { s.p = null; }
  SM.event(red ? 'red' : 'yellow', { side: p.side, name: p.nick });
  SM.replaceControl(p.side);
};

// the seats of a side that lost their player move to the nearest teammate with the ball or near it
SM.replaceControl = function (side) {
  const M = SM.M;
  for (const s of M.seats) {
    if (s.p || s.side !== side) continue;
    const cand = M.players.filter(q => q.side === side && q.bin <= 0 && !q.seat).sort((a, c) => dist(a.x, a.y, M.ball.x, M.ball.y) - dist(c.x, c.y, M.ball.x, M.ball.y))[0];
    if (cand) SM.takeControl(s, cand);
  }
};

SM.setPhase = function (name) {
  const M = SM.M;
  if (M.phase === name) return;
  M.phase = name; M.pt = 0;
  SM.event('phase', { name });
};

// when play would resume after a stoppage: the half ends if the hooter has gone
SM.resumePlay = function () {
  const M = SM.M;
  if (M.hooter) { M.hooter = false; return SM.halfOver(); }
  SM.setPhase('play');
};

SM.halfOver = function () {
  const M = SM.M;
  if (M.half === 1) {
    M.half = 2; M.run = 0; M.hooter = false;
    M.phase = 'half'; M.pt = 0; M.halfT = 3.0;
    SM.event('halftime', { score: M.score.slice() });
  } else SM.fullTime();
};
SM.fullTime = function () {
  const M = SM.M;
  if (M.score[0] === M.score[1] && !M.golden && !M.attract) {
    M.golden = true; M.hooter = false; M.run = 0; SM.event('golden');
    SM.kickoff(0); return;
  }
  M.over = true; M.phase = 'full'; M.pt = 0; M.hooter = false;
  SM.event('fulltime', { score: M.score.slice() });
};

// a carrier over the try line: the try, the points, the celebrations and then the conversion
SM.tryScored = function (p) {
  const M = SM.M, s = p.side;
  M.score[s] += 5; M.stats[s].tries++; M.hype[s] = Math.min(100, M.hype[s] + 15 * TUNE('hypeMult'));
  M.scorer = p;
  if (M.lastTry[s] === p.i) { p.onFire = true; SM.event('onFire', { name: p.nick, side: s }); }
  M.lastTry[s] = p.i; M.lastTry[1 - s] = -1;
  for (const q of M.players) if (q.side !== s) q.onFire = false;
  SM.event('try', { side: s, name: p.nick, x: p.x, y: p.y });
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = p.x; b.y = p.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  for (const q of M.players) if (q.side === s && q !== p) q.cheer = 3;
  p.cheer = 3;
  SM.setPhase('try'); M.tryT = 3;
  M.conv = { side: s, x: SM.clamp(p.x, SM.X0 + 4, SM.X1 - 4), y: p.y, kind: 'conv' };
};

// the conversion (or a penalty goal): the kicker places the ball, and the power meter decides it (human) or the roll
SM.startConversion = function (kind) {
  const M = SM.M, c = M.conv, s = c.side, d = DIRS(s);
  c.kind = kind || c.kind; c.postX = s === 0 ? SM.POST1 : SM.POST0;
  c.dist = Math.abs(c.postX - c.x);
  c.kicker = M.players.find(q => q.side === s && q.pos === 4 && q.bin <= 0) || M.players.find(q => q.side === s && q.bin <= 0);
  c.meter = 0; c.up = true; c.t = 0; c.aim = 0; c.done = false;
  if (c.kicker) { c.kicker.x = c.x - d * 14; c.kicker.y = c.y; c.kicker.facing = s === 0 ? 0 : Math.PI; c.kicker.vx = c.kicker.vy = 0; }
  SM.setPhase('conv');
};
// the outcome: power (0..1) and aim (-1..1) from the meter, or null for the CPU
SM.decideKick = function (power, aim) {
  const M = SM.M, c = M.conv, s = c.side;
  const need = SM.clamp(c.dist / (TUNE('kickMax') * .9), .2, .95);
  const k = c.kicker;
  let good;
  if (power === null) {
    const kck = k ? k.stats.KCK : 6;
    good = SM.R() < SM.clamp(.92 - c.dist / 1600 + (kck - 6) * .03, .3, .97);
  } else good = Math.abs(power - need) < .07 && Math.abs(aim) < .35;
  if (good) {
    const pts = c.kind === 'pen' ? 3 : c.kind === 'drop' ? 3 : 2;
    M.score[s] += pts; M.hype[s] = Math.min(100, M.hype[s] + 5 * TUNE('hypeMult'));
    if (c.kind === 'conv') M.stats[s].conversions++;
    SM.event('goal', { side: s, kind: c.kind, pts, name: k ? k.nick : '' });
    M.conv = null;
    if (M.golden) return SM.fullTime();
    return SM.kickoff(s);
  }
  SM.event('miss', { side: s, kind: c.kind });
  M.conv = null;
  return SM.dropOut(1 - s);
};

// a 22 drop-out: the defenders restart from their own 22
SM.dropOut = function (side) {
  const M = SM.M, x = side === 0 ? SM.X0 + 225 : SM.X1 - 225;
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = x; b.y = SM.CY; b.z = 0; b.vx = b.vy = b.vz = 0;
  const pl = M.players.filter(q => q.side === side && q.bin <= 0).sort((a, c) => dist(a.x, a.y, x, SM.CY) - dist(c.x, c.y, x, SM.CY))[0];
  if (pl) { pl.x = x - DIRS(side) * 10; pl.y = SM.CY; pl.facing = side === 0 ? 0 : Math.PI; b.x = pl.x + DIRS(side) * 6; b.y = pl.y; b.owner = pl; b.state = 'held'; }
  SM.event('dropOut', { side });
  SM.resumePlay();
};

// a scrum: the forwards bind at the mark; the timed push (CROUCH, BIND, SET) decides who wins the ball
SM.startScrum = function (x, y, feedSide, forPen) {
  const M = SM.M;
  M.scrum = { x: SM.clamp(x, SM.X0 + 60, SM.X1 - 60), y: SM.clamp(y, SM.Y0 + 60, SM.Y1 - 60), feed: feedSide, t: 0, setAt: 1.9, early: false, pressedAt: null, push: [0, 0], resolveAt: 3.4 };
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = M.scrum.x; b.y = M.scrum.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  for (const q of M.players) {
    if (q.bin > 0 || q.pos > 2) continue;
    const d = DIRS(q.side);
    q.x = M.scrum.x - d * 6 + (q.side ? 0 : 0); q.y = M.scrum.y + (q.pos - 1) * 14; q.facing = q.side ? Math.PI : 0;
  }
  SM.setPhase('scrum');
  SM.event('scrum', { x: M.scrum.x, y: M.scrum.y });
};

// the lineout: pods (front, middle, back) and a timed throw; a contest when both sides pick the same pod
SM.startLineout = function (x, y, thrower) {
  const M = SM.M;
  M.lineout = { x: SM.clamp(x, SM.X0 + 40, SM.X1 - 40), y: SM.clamp(y, SM.Y0 + 60, SM.Y1 - 60), thrower, t: 0, pick: [null, null], resolveAt: 2.4 };
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = M.lineout.x; b.y = M.lineout.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  SM.setPhase('lineout');
  SM.event('lineout', { x: M.lineout.x, y: M.lineout.y, thrower });
};

// the ruck: the carrier goes down, the ball sits on the ground, both sides tug; the bar's end decides possession
SM.startRuck = function (x, y, attackSide) {
  const M = SM.M;
  M.ruck = { x: SM.clamp(x, SM.X0 - 10, SM.X1 + 10), y: SM.clamp(y, SM.Y0 + 10, SM.Y1 - 10), attack: attackSide, bar: .2, t: 0, jackal: false, jackalAt: null };
  const b = M.ball; b.owner = null; b.state = 'placed'; b.x = M.ruck.x; b.y = M.ruck.y; b.z = 0; b.vx = b.vy = b.vz = 0; b.lastTouch = attackSide;
  SM.setPhase('ruck');
  SM.event('ruck', { x: M.ruck.x, y: M.ruck.y });
};

SM.dropBall = function (p, spill) {
  const M = SM.M, b = M.ball;
  if (b.owner !== p) return;
  // a carrier who loses it forward (a tackle, a bump) has knocked it on: a scrum to the other side
  if (!spill && SM.R() < .3) { b.owner = null; b.state = 'placed'; b.x = p.x + DIRS(p.side) * 4; b.y = p.y; b.z = 0; SM.event('knockOn', { side: p.side, name: p.nick }); return SM.startScrum(b.x, b.y, 1 - p.side); }
  b.owner = null; b.state = 'loose'; b.x = p.x + Math.cos(p.facing) * 8; b.y = p.y + Math.sin(p.facing) * 8; b.z = 6;
  const sp = spill || 0;
  b.vx = Math.cos(p.facing) * (30 + sp * 80); b.vy = Math.sin(p.facing) * (30 + sp * 80); b.vz = 30 + sp * 40; b.lastTouch = p.side; b.bounces = 0; b.droppedBy = p; b.kind = 'loose';
};

// the sides' possession and territory: time by the side holding the ball and the ball's half
SM.tally = function (dt) {
  const M = SM.M, b = M.ball;
  if (b.owner) M.stats[b.owner.side].poss += dt;
  if (b.state !== 'placed' || M.phase !== 'scrum') {
    const inOpp = (side) => (side === 0 ? b.x > SM.CX : b.x < SM.CX);
    M.stats[0].terr += inOpp(0) ? dt : 0; M.stats[1].terr += inOpp(1) ? dt : 0;
  }
};
