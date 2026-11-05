/* ---- THE MATCH SIMULATION: the whole truth of a match in one plain object (M), stepped from intents. Nothing here
 * draws, plays a sound or reads a device: it emits events on TT.bus. Randomness only from M.rng (seeded) ---- */
let M = null;
const BALL_G = 600, CARRY_Z = 13;
const FREE = { run: 1, pass: 1, fend: 1, charge: 1, sidestep: 1, spin: 1, kick: 1 };
const WATCHDOG = { walkout: 12, kickoff: 25, play: 9999, ruck: 8, scrum: 20, lineout: 18, penalty: 20, setkick: 40, try: 12, stop: 8, half: 30, full: 9999, sudden: 9999 };

TT.sim = {};
TT.emit = (name, data) => { if (!M) return; data = data || {}; M.events.push([M.t, name, data]); if (M.events.length > 60) M.events.shift(); TT.bus.emit(name, data); };
const emit = TT.emit;
const rnd = () => M.rng();
const U = (a, b) => a + (b - a) * M.rng();
const cheat = k => !!(M && M.cheats && M.cheats[k]);
const dirOf = team => (team === 0 ? 1 : -1) * (M.half === 2 ? -1 : 1);
const tryLineOf = team => dirOf(team) > 0 ? G.X1 : G.X0;     // the line team attacks
const ownLineOf = team => dirOf(team) > 0 ? G.X0 : G.X1;
const pl = id => M.players[id];
const teamPlayers = team => M.players.filter(p => p.team === team);
const onField = p => p.st !== 'binned' && p.st !== 'off';
const standing = p => onField(p) && !['tackled', 'ground', 'stunned', 'launched', 'diving', 'getup', 'held'].includes(p.st);
const isFree = p => !!FREE[p.st];
const holder = () => M.ball.st === 'held' ? pl(M.ball.holder) : null;
const statOf = (p, k) => p.data.stats[k] || 5;
TT.sim.dirOf = t => dirOf(t); TT.sim.tryLineOf = t => tryLineOf(t);

/** a new match: o = { home, away (team ids), venue, weather, time, halfLength, suddenDeath, cup, drill, attract, session,
 *  seed, difficulty, kits } */
TT.sim.create = o => {
  const seed = o.seed == null ? (Date.now() & 0xffffff) : o.seed;
  const teams = [TT.teamById(o.home || 'mud'), TT.teamById(o.away || 'bad')];
  const venue = TT.venueById(o.venue || 'park');
  // kits: the away side changes when the home jerseys are too alike
  const lum = h => { const c = E.hex(h); return .3 * c[0] + .59 * c[1] + .11 * c[2]; };
  const kits = [teams[0].home, Math.abs(lum(teams[0].home.cloth) - lum(teams[1].home.cloth)) < 60 || teams[0].id === teams[1].id ? teams[1].away : teams[1].home];
  M = {
    o, seed, rng: E.rng(seed), t: 0, teams, venue, kits,
    phase: 'walkout', sub: '', phaseT: 0, ph: {},
    half: 1, clock: 0, hooter: false, hooterT: 0, suddenDeath: false, over: false, winner: -1,
    score: [0, 0], hype: [0, 0], possession: 0, lastTouch: 0, kickoffTeam: 0,
    players: [], ref: null, pu: null, puT: 0, hazards: [], hazT: { a: 20, b: 40 }, wind: { a: 0, s: venue.wind ? .5 : 0, t: 15 },
    mud: [], adv: null, cards: [], megaBoot: [0, 0], lastScorer: [-1, -1], streak: { team: -1, pid: -1, n: 0 },
    stats: [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, conv: 0, convAtt: 0, pens: 0, tackles: 0, missed: 0, bigHits: 0, monsters: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, passes: 0, kicks: 0, scrums: 0, lineouts: 0, rucks: 0 })),
    events: [], cheats: o.cheats || {}, watchdogs: 0, lastBig: null, bestHit: 0,
    useIt: null, drill: o.drill || null, ctlHint: {}
  };
  M.ball = { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: -1, kind: '', from: -1, team: 0, target: -1, t: 0, rot: 0, spin: 0, forward: false, tried: {}, bounces: 0, pen: false, startX: 0, landing: null };
  let id = 0;
  for (const team of [0, 1]) teams[team].players.forEach((d, idx) => {
    M.players.push({ id: id++, team, idx, role: ROLES[idx], data: d, x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? PI : 0,
      st: 'run', stT: 0, turbo: 1, turboIdle: 0, cool: 0, evade: 0, evadeKind: '', fendT: 0, charge: 0, stun: 0, power: null, fire: 0,
      binT: 0, yellows: 0, cheap: 0, ctl: -1, mud: 0, sideCd: 0, fendCd: 0, xTapT: 9, kickHold: 0, passHold: { l1: 0, r1: 0 }, held: 0, heldBy: -1,
      superK: '', superT: 0, homing: -1, launch: null, tries: 0, tackles: 0, metres: 0, monsters: 0, celeb: idx % 6, scale: d.size, flash: 0,
      toasted: 0, zapped: 0, sold: 0, tx: 0, ty: 0, aiT: 0, aiPlan: null, lastHitBy: -1 });
  });
  M.ref = { x: G.CX, y: G.Y0 + 60, z: 0, vx: 0, vy: 0, facing: PI / 2, down: 0, call: '', callT: 0, signal: '', signalT: 0, card: '', cardT: 0 };
  if (venue.hazard === 'mud') {   // four to six mud patches, kept off the try lines' faces
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) M.mud.push({ x: U(G.X0 + 120, G.X1 - 120), y: U(G.Y0 + 60, G.Y1 - 60), r: U(40, 70), k: U(.6, 1) });
  }
  M.weather = o.weather && o.weather !== 'venue' ? o.weather : venue.weather;
  if (M.weather === 'wind' || M.weather === 'storm') M.wind.s = M.weather === 'wind' ? .6 : .4;
  M.halfLen = o.halfLength || TUNE.v.halfLength;
  formation('walkout', 0);
  setPhase(o.drill ? 'play' : (o.skipIntro ? 'kickoff' : 'walkout'));
  if (!o.drill && o.skipIntro) startKickoff(0);
  return M;
};

/* ---- phases ---- */
function setPhase(name, data) {
  M.phase = name; M.phaseT = 0; M.sub = ''; M.ph = data || {};
  emit('phase', { phase: name });
}
TT.sim.setPhase = setPhase;
function setSub(s) { M.sub = s; M.ph.subT = 0; }

/* ---- formations: where everyone stands for each restart ---- */
function formation(kind, team, at) {
  const d = dirOf(team), P = M.players;
  for (const p of P) {
    if (!onField(p)) continue;
    const own = p.team === team, dd = dirOf(p.team);
    let x = G.CX, y = G.CY;
    if (kind === 'walkout') { x = G.CX + (p.team ? 1 : -1) * (40 + p.idx * 6); y = G.Y1 + 30 + p.idx * 3; }
    else if (kind === 'kickoff') {
      if (own) { if (p.idx === 4) { x = G.CX - d * 8; y = G.CY; } else { const k = [-200, -60, 60, -130, 0, 130, 200][p.idx]; x = G.CX - d * (p.idx < 3 ? 14 : 24); y = G.CY + k; } }
      else { const spots = [[120, -70], [120, 0], [120, 70], [210, -40], [300, 0], [250, 140], [250, -150]]; x = G.CX + d * spots[p.idx][0]; y = G.CY + spots[p.idx][1]; }
    }
    if (kind !== 'walkout') { x = clamp(x, G.X0 - 80, G.X1 + 80); y = clamp(y, G.Y0 + 10, G.Y1 - 10); }
    p.x = x; p.y = y; p.z = 0; p.vx = p.vy = p.vz = 0; p.facing = dd > 0 ? 0 : PI;
    resetPlayer(p);
  }
}
function resetPlayer(p) {
  if (!onField(p)) return;
  p.st = 'run'; p.stT = 0; p.charge = 0; p.evade = 0; p.fendT = 0; p.stun = 0; p.held = 0; p.heldBy = -1; p.launch = null; p.homing = -1; p.kickHold = 0; p.passHold.l1 = p.passHold.r1 = 0;
  if (p.superK === 'hurricane') { p.superK = ''; p.superT = 0; }
}

/* ---- the ball ---- */
function giveBall(p, how) {
  const b = M.ball, wasTeam = b.team;
  b.st = 'held'; b.holder = p.id; b.team = p.team; b.from = p.id; b.target = -1; b.t = 0; b.vx = b.vy = b.vz = 0; b.forward = false; b.tried = {}; b.landing = null; b.kind = '';
  b.x = p.x; b.y = p.y; b.z = CARRY_Z; b.pen = false;
  if (M.possession !== p.team) { M.possession = p.team; if (how !== 'restart') emit('turnover', { team: p.team, pid: p.id, how }); }
  M.possession = p.team; M.lastTouch = p.team;
  p.carryStart = p.x; p.lineBroken = false;
  if (M.superCarry && M.superCarry !== p.id) M.superCarry = 0;
  void wasTeam;
  emit('gather', { pid: p.id, how });
}
TT.sim.giveBall = (id, how) => giveBall(pl(id), how || 'restart');
/** launch the ball: from (x, y, z) with a velocity; kind 'pass' | 'kick' | 'grubber' | 'bomb' | 'drop' | 'place' | 'kickoff' | 'spill' */
function launchBall(from, vx, vy, vz, kind, extra) {
  const b = M.ball;
  b.st = kind === 'spill' ? 'loose' : 'air'; b.kind = kind; b.holder = -1; b.from = from ? from.id : -1; b.team = from ? from.team : b.team;
  if (from) M.lastTouch = from.team;
  b.vx = vx; b.vy = vy; b.vz = vz; b.t = 0; b.tried = {}; b.bounces = 0; b.forward = false; b.target = -1; b.startX = b.x; b.landing = null; b.pen = false;
  Object.assign(b, extra || {});
  if (kind !== 'pass' && kind !== 'spill') b.landing = predictLanding();
}
/** where a ball in the air comes down (no wind): for the landing marker and the AI */
function predictLanding() {
  const b = M.ball; let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  for (let i = 0; i < 600; i++) { const dt = 1 / 60; vz -= BALL_G * dt; x += vx * dt; y += vy * dt; z += vz * dt; vx *= 1 - .3 * dt; vy *= 1 - .3 * dt; if (z <= 0) break; }
  return { x, y };
}
TT.sim.predictLanding = predictLanding;
/** a velocity that sends the ball from a to b, landing there, with the given apex (above the higher end) */
function arcTo(ax, ay, az, bx, by, bz, apex) {
  const top = Math.max(az, bz) + apex, vz = Math.sqrt(2 * BALL_G * Math.max(.5, top - az)), tUp = vz / BALL_G, tDown = Math.sqrt(2 * Math.max(.5, top - bz) / BALL_G), t = tUp + tDown;
  const drag = 1 + .15 * t;   // (a touch more speed against the air)
  return { vx: (bx - ax) / t * drag, vy: (by - ay) / t * drag, vz, t };
}
TT.sim.arcTo = arcTo;

function ballStep(dt) {
  const b = M.ball; b.t += dt;
  if (b.st === 'held') {
    const p = pl(b.holder);
    if (!p || !onField(p)) { b.st = 'loose'; return; }
    const f = p.facing, side = (p.idx % 2 ? -1 : 1);
    b.x = p.x + Math.cos(f) * 4 - Math.sin(f) * 3 * side; b.y = p.y + Math.sin(f) * 4 + Math.cos(f) * 3 * side; b.z = p.z + (p.st === 'tackled' || p.st === 'ground' ? 3 : CARRY_Z);
    b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.rot += Math.hypot(p.vx, p.vy) * dt * .02;
    return;
  }
  if (b.st === 'dead' || b.st === 'placed') return;
  // air and loose: gravity, drag, wind, the oval bounce, rolling friction
  const air = b.z > .5 || b.vz > 0;
  if (air) {
    b.vz -= BALL_G * dt;
    const drag = 1 - .3 * dt; b.vx *= drag; b.vy *= drag;
    if (M.wind.s > 0 && b.z > 8) { const k = 40 * M.wind.s * TUNE.v.windMult * dt; b.vx += Math.cos(M.wind.a) * k; b.vy += Math.sin(M.wind.a) * k; }
    b.rot += dt * (b.kind === 'pass' ? 18 : 12);
  }
  const prevX = b.x;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.goalCheck) goalFlight(prevX);
  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < -30) {   // the oval bounce: a random turn and a random rebound
      const chaos = TUNE.v.bounceChaos * (b.kind === 'grubber' ? 1.4 : 1), ang = (rnd() * 2 - 1) * 70 * PI / 180 * chaos, c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
      b.vx = vx * .75; b.vy = vy * .75; b.vz = -b.vz * .45 * U(.3, 1.25) * (b.kind === 'grubber' && rnd() < .3 ? 1.6 : 1);
      if (onMud(b.x, b.y)) { b.vz *= .5; }
      b.bounces++; emit('bounce', { x: b.x, y: b.y, v: -b.vz });
      if (b.st === 'air') { b.st = 'loose'; if (b.forward) { /* a forward pass that hits the ground */ return forwardPassCall(b.x, b.y); } onBallGrounded(); }
    } else {
      b.vz = 0;
      const f = Math.exp(-(onMud(b.x, b.y) ? .9 : 1.4) * dt); b.vx *= f; b.vy *= f;
      if (b.st === 'air') { b.st = 'loose'; onBallGrounded(); }
    }
  }
  // catches: the receiver of a pass, interceptions, and anyone under a kick
  if (b.st === 'air' || (b.st === 'loose' && b.z < 30)) catches(dt);
  if (b.st === 'loose') pickups();
}
function onBallGrounded() {
  const b = M.ball;
  if (b.kind === 'kickoff' || b.kind === 'dropout') checkTen();
}
/** a kick-off that bounces before ten metres (or never got there) */
function checkTen() {
  const b = M.ball, k = M.kickoffCheck; if (!k) return;
  const gone = (b.x - k.x) * dirOf(k.team);
  M.kickoffCheck = null;
  if (k.kind === 'kickoff' && gone < 102) { stop('NOT TEN!', 1.4, () => freeKick(1 - k.team, G.CX + dirOf(k.team) * 10, G.CY, 'notTen')); }
}
function catches() {
  const b = M.ball;
  for (const p of M.players) {
    if (!standing(p) || b.tried[p.id] || p.st === 'ruck' || p.st === 'scrum' || p.st === 'lineout') continue;
    if (b.from === p.id && b.t < .35) continue;
    if (b.kind !== 'pass' && b.st === 'air' && b.vz > 0 && b.t < .5) continue;   // (a kick isn't caught off the boot)
    const reach = b.kind === 'pass' ? 10 : 11, d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d > reach || b.z > 30 || b.z < (b.st === 'air' ? 0 : -1)) continue;
    b.tried[p.id] = true;
    const ownTeam = p.team === b.team;
    if (b.kind === 'pass') {
      if (b.target === p.id || (ownTeam && d < 7)) return catchPass(p);
      if (!ownTeam && b.z < 24) {   // an interception
        const human = p.ctl >= 0, intent = M.intents && M.intents[p.id];
        const ch = human ? (intent && (intent.h.x || intent.p.x) && d < 12 ? .45 : 0) : (d < 7 ? .08 : .02) * (M.diff[p.team] ? M.diff[p.team].intercept : 1) * (p.idx >= 3 ? 1.2 : .8);
        if (rnd() < ch) { giveBall(p, 'intercept'); addHype(p.team, 12); emit('interception', { pid: p.id }); return; }
      }
      continue;
    }
    // a kick (or a ball in the air off a hand): a catch, contested when both sides are under it
    const rivals = M.players.filter(q => q !== p && q.team !== p.team && standing(q) && Math.hypot(b.x - q.x, b.y - q.y) < reach + 2);
    let taker = p;
    if (rivals.length && b.st === 'air' && b.z > 6) {
      const q = rivals[0], sp = contestScore(p), sq = contestScore(q);
      taker = sp >= sq ? p : q; const loser = taker === p ? q : p;
      knockDown(loser, .7, taker); emit('contest', { pid: taker.id, lost: loser.id });
    }
    const ch = clamp(TUNE.v.catchBase * (.9 + .01 * statOf(taker, 'HND')) - (b.kind === 'bomb' ? .12 : 0) - (wet() ? .06 : 0), .3, 1);
    if (taker.fire > 0 || rnd() < ch) {
      if (b.forward) return forwardPassCall(taker.x, taker.y);
      const wasKick = b.kind; giveBall(taker, 'catch'); emit('kickCaught', { pid: taker.id, kind: wasKick });
      if (M.kickoffCheck) M.kickoffCheck = null;
      return;
    }
    return fumble(taker);
  }
}
function contestScore(p) {
  const it = M.intents && M.intents[p.id], human = p.ctl >= 0;
  const timing = human ? (it && it.p.x ? .9 : .2) : clamp(.55 + (M.diff[p.team] ? (.12 - M.diff[p.team].scrumSigma) * 2 : 0) + U(-.25, .25), 0, 1);
  return timing * .6 + statOf(p, 'HND') * .04 + U(0, .1);
}
function catchPass(p) {
  const b = M.ball, passer = pl(b.from), longP = b.long;
  let ch = TUNE.v.catchBase * (.9 + .01 * statOf(p, 'HND')) - (longP ? .06 : 0) - (wet() ? .06 : 0) - (b.offload ? .1 : 0);
  if (M.players.some(q => q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 20)) ch -= TUNE.v.pressurePenalty;
  if (p.fire > 0 || (passer && passer.fire > 0) || M.drill) ch = 1;
  if (rnd() < clamp(ch, .3, 1)) {
    if (b.forward) return forwardPassCall(p.x, p.y);
    const from = b.from; giveBall(p, 'pass'); M.stats[p.team].passes++; emit('catch', { pid: p.id, from });
    return;
  }
  fumble(p);
}
function fumble(p) {
  const b = M.ball, d = dirOf(p.team);
  if (rnd() < .5) {   // knocked forward: a knock-on
    b.st = 'loose'; b.vx = d * 60; b.vy = U(-30, 30); b.vz = 40; b.z = 10; b.from = p.id; b.team = p.team;
    emit('knockOn', { pid: p.id });
    stop('KNOCK-ON', 1.6, () => scrum(1 - p.team, p.x, p.y, 'knockOn'), { call: 'KNOCK ON!' });
  } else {
    b.st = 'loose'; b.vx = -d * U(30, 70); b.vy = U(-50, 50); b.vz = 50; b.z = 10; b.from = p.id; b.team = p.team; b.tried = { [p.id]: true }; b.t = 0;
    emit('spill', { pid: p.id });
  }
}
function forwardPassCall(x, y) {
  const b = M.ball, team = b.team;
  emit('forwardPass', { team });
  stop('FORWARD PASS', 1.6, () => scrum(1 - team, x, y, 'forwardPass'), { call: 'FORWARD!' });
}
function pickups() {
  const b = M.ball; if (b.z > 9) return;
  let best = null, bd = 1e9;
  for (const p of M.players) {
    if (!standing(p) || !isFree(p) || p.cool > 0) continue;
    if (b.from === p.id && b.t < .3) continue;
    const fast = Math.hypot(b.vx, b.vy) > 210, d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < (fast ? 4.5 : 9) && d < bd) { best = p; bd = d; }
  }
  if (!best) return;
  const sprint = Math.hypot(best.vx, best.vy) > TUNE.v.runSpeed * 1.2;
  if (sprint && statOf(best, 'HND') < 8 && best.fire <= 0 && rnd() < .15 && !M.drill) { emit('fumbleSprint', { pid: best.id }); return fumble(best); }
  giveBall(best, 'pickup');
}
const wet = () => M.weather === 'rain' || M.weather === 'storm';
function onMud(x, y) { for (const m of M.mud) if (Math.hypot(x - m.x, y - m.y) < m.r) return true; return false; }
TT.sim.onMud = (x, y) => M && onMud(x, y);

/* ---- hype ---- */
function addHype(team, n) {
  if (team < 0) return;
  const before = M.hype[team];
  M.hype[team] = clamp(M.hype[team] + n * TUNE.v.hypeMult, 0, 100);
  if (before < 100 && M.hype[team] >= 100) emit('hypeFull', { team });
}
TT.sim.addHype = (t, n) => addHype(t, n);

/* ---- stoppages and restarts ---- */
/** play stops: a banner, the whistle, then next() (or the end of the half when the hooter has gone) */
function stop(label, secs, next, o = {}) {
  const b = M.ball; if (M.phase === 'stop') return;
  b.st = 'dead'; b.vx = b.vy = b.vz = 0;
  M.adv = null;
  setPhase('stop', { label, secs, next, call: o.call || '', noHooter: !!o.noHooter });
  emit('whistle', { label, call: o.call || '' });
  if (o.call) refCall(o.call);
}
TT.sim.stop = (l, s, n, o) => stop(l, s, n, o);
function refCall(text, signal) { M.ref.call = text; M.ref.callT = 1.6; if (signal) { M.ref.signal = signal; M.ref.signalT = 1.6; } emit('refCall', { text }); }
/** after a stoppage: the half ends if the hooter has gone, else the restart runs */
function afterStop(fn) {
  if (M.hooter && !M.suddenDeath && !M.drill) return endHalf();
  fn();
}
function endHalf() {
  M.ball.st = 'dead'; M.adv = null;
  if (M.half === 1) { setPhase('half'); emit('halftime', { score: M.score.slice() }); return; }
  // full time, or sudden death when level and it must have a winner
  if (M.score[0] === M.score[1] && (M.o.cup || M.o.suddenDeath) && !M.suddenDeath && !M.o.session) {
    M.suddenDeath = true; M.hooter = false; M.sdClock = 0; emit('suddenDeath', {}); startKickoff(rnd() < .5 ? 0 : 1); return;
  }
  fullTime();
}
function fullTime() {
  M.over = true; M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  for (const p of M.players) if (onField(p)) { resetPlayer(p); if (p.team === M.winner) { p.st = 'celebrate'; p.stT = 0; } }
  setPhase('full'); emit('fulltime', { score: M.score.slice(), winner: M.winner });
}
TT.sim.endHalf = () => endHalf();
TT.sim.fullTime = () => fullTime();

/* ---- kick-offs and drop-outs ---- */
function startKickoff(team, kind = 'kickoff') {
  M.kickoffTeam = team;
  formation('kickoff', team);
  const kicker = teamPlayers(team).find(p => p.idx === 4 && onField(p)) || teamPlayers(team).find(onField);
  const d = dirOf(team);
  let x = G.CX, y = G.CY;
  if (kind === 'dropout') { x = ownLineOf(team) + d * 225; y = G.CY; for (const p of M.players) if (onField(p)) { if (p.team === team) p.x = Math.min(p.x * d, (x - d * 10) * d) * d; else p.x = x + d * (120 + p.idx * 25); } }
  kicker.x = x - d * 8; kicker.y = y; kicker.facing = d > 0 ? 0 : PI;
  M.ball.st = 'placed'; M.ball.x = x; M.ball.y = y; M.ball.z = 0; M.ball.holder = -1;
  setPhase('kickoff', { team, kind, kicker: kicker.id, x, y, aim: [x + d * 180, y + (rnd() < .5 ? -1 : 1) * 120], power: 0, holding: false, cpuT: U(1.1, 1.8) });
  emit(kind === 'kickoff' ? 'kickoffSetup' : 'dropOut', { team });
}
TT.sim.startKickoff = (t, k) => startKickoff(t, k);
function kickoffStep(dt) {
  const ph = M.ph, k = pl(ph.kicker), it = M.intents[k.id], d = dirOf(ph.team);
  k.vx = k.vy = 0; k.x = ph.x - d * 8; k.y = ph.y;
  for (const p of M.players) if (p !== k && onField(p)) { p.vx = p.vy = 0; }
  // the aim: the stick (or the mouse) moves the reticle across the receiving half
  if (k.ctl >= 0) {
    if (it.aim) { ph.aim[0] = it.aim[0]; ph.aim[1] = it.aim[1]; }
    else { ph.aim[0] += it.mx * 220 * dt * (d > 0 ? 1 : 1); ph.aim[1] += it.my * 220 * dt; }
    if (it.h.ci || it.h.x) { ph.holding = true; ph.power = Math.min(1, ph.power + dt / .9); }
    else if (ph.holding) return kickoffKick(ph.power);
    if (M.phaseT > 8) return kickoffKick(.55);
  } else if (M.phaseT > ph.cpuT) {
    ph.aim = [ph.x + d * U(130, 200), ph.y + (rnd() < .5 ? -1 : 1) * U(60, 170)];
    if (ph.kind === 'dropout') ph.aim = [ph.x + d * U(220, 330), ph.y + U(-150, 150)];
    return kickoffKick(-1);
  }
  ph.aim[0] = clamp(ph.aim[0], Math.min(ph.x, ph.x + d * 600), Math.max(ph.x, ph.x + d * 600));
  ph.aim[1] = clamp(ph.aim[1], G.Y0 - 30, G.Y1 + 30);
}
function kickoffKick(power) {
  const ph = M.ph, k = pl(ph.kicker), d = dirOf(ph.team);
  let tx = ph.aim[0], ty = ph.aim[1];
  if (power >= 0) {   // the human's power scales the distance to the reticle; the sweet spot is true
    const dist = Math.hypot(tx - ph.x, ty - ph.y), want = dist * clamp(.55 + power * .6, .5, 1.12), a = Math.atan2(ty - ph.y, tx - ph.x) + (power > .85 ? 0 : U(-.08, .08));
    tx = ph.x + Math.cos(a) * want; ty = ph.y + Math.sin(a) * want;
  }
  const v = arcTo(ph.x, ph.y, 0, tx, ty, 0, ph.kind === 'dropout' ? 70 : 90);
  M.ball.x = ph.x; M.ball.y = ph.y; M.ball.z = 4;
  launchBall(k, v.vx, v.vy, v.vz, ph.kind === 'dropout' ? 'dropout' : 'kickoff');
  M.kickoffCheck = { team: ph.team, x: ph.x, kind: ph.kind };
  k.st = 'kick'; k.stT = 0; k.cool = .4;
  M.stats[ph.team].kicks++;
  emit('kickoff', { team: ph.team, kind: ph.kind, pid: k.id });
  setPhase('play');
  void d;
}

/* ---- scoring ---- */
function score(team, pts, kind, pid) {
  M.score[team] += pts; M.lastScorer[team] = pid;
  emit('score', { team, pts, kind, pid });
  if (M.suddenDeath) { M.winner = team; return true; }
  return false;
}
function tryScored(p, how) {
  const team = p.team, tl = tryLineOf(team), d = dirOf(team);
  const gy = clamp(p.y, G.Y0 + 2, G.Y1 - 2);
  p.tries++; M.stats[team].tries++;
  // ON FIRE: two tries in a row by the same player
  if (M.streak.pid === p.id) M.streak.n++; else M.streak = { team, pid: p.id, n: 1 };
  for (const q of M.players) if (q.team !== team) q.fire = 0;
  if (M.streak.n >= 2 && p.fire <= 0) { p.fire = 90; emit('onFire', { pid: p.id }); }
  addHype(team, 15);
  const run = Math.abs(p.x - (p.carryStart == null ? p.x : p.carryStart));
  M.ball.st = 'dead';
  const ended = score(team, how === 'penaltyTry' ? 7 : 5, how || 'try', p.id);
  M.adv = null; M.superCarry = 0; if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  for (const q of M.players) if (onField(q)) { if (q.st !== 'tackled') resetPlayer(q); if (q.team === team) { q.st = 'celebrate'; q.stT = 0; } }
  emit('try', { team, pid: p.id, x: p.x, y: gy, run, how: how || 'try' });
  refCall('TRY!', 'try');
  setPhase('try', { team, pid: p.id, y: gy, tl, how: how || 'try', ended });
  void d;
}
TT.sim.tryScored = (id, how) => tryScored(pl(id), how);

/* ---- the referee: runs behind the play, turns to the ball, sees (or misses) fouls ---- */
function refStep(dt) {
  const r = M.ref, b = M.ball;
  r.callT = Math.max(0, r.callT - dt); r.signalT = Math.max(0, r.signalT - dt); r.cardT = Math.max(0, r.cardT - dt);
  if (r.down > 0) { r.down -= dt; r.vx = r.vy = 0; if (r.down <= 0) { r.down = 0; emit('refUp', {}); } return; }
  const att = M.possession, d = dirOf(att);
  const tx = clamp(b.x - d * 50, G.X0 - 60, G.X1 + 60), ty = clamp(b.y - 40 - (b.y > G.CY ? 30 : 0), G.Y0 + 14, G.Y1 - 14);
  let dx = tx - r.x, dy = ty - r.y; const dd = Math.hypot(dx, dy);
  // steer round players
  for (const p of M.players) { const ex = r.x - p.x, ey = r.y - p.y, e = Math.hypot(ex, ey); if (e < 14 && e > .1) { dx += ex / e * 30; dy += ey / e * 30; } }
  const sp = dd > 8 ? 95 : 0, m = Math.hypot(dx, dy) || 1;
  r.vx = TT.approach(r.vx, dx / m * sp, 500 * dt); r.vy = TT.approach(r.vy, dy / m * sp, 500 * dt);
  r.x += r.vx * dt; r.y += r.vy * dt;
  r.facing = E.approachAng(r.facing, Math.atan2(b.y - r.y, b.x - r.x), 4 * dt);
}
/** does the referee see this? (down: no; dev cheats: blind or strict) */
function refSees(p) {
  if (cheat('refStrict')) return true;
  if (cheat('refBlind') || M.ref.down > 0 || M.o.drill) return false;
  const r = M.ref, d = Math.hypot(p.x - r.x, p.y - r.y);
  if (d > TUNE.v.refRange) return false;
  return Math.abs(TT.angDiff(r.facing, Math.atan2(p.y - r.y, p.x - r.x))) < TUNE.v.refFov / 2;
}
TT.sim.refSees = p => refSees(p);
/** a foul by p (offender) against team: called if seen (now or 0.3 s later); advantage when the victims have the ball */
function foul(p, kind, card, victim) {
  const seen = refSees(p);
  if (!seen) { M.pendingFoul = { pid: p.id, kind, card, t: .3, victim: victim ? victim.id : -1 }; emit('foulUnseen', { pid: p.id, kind }); return false; }
  return callFoul(p, kind, card, victim);
}
function callFoul(p, kind, card, victim) {
  const victims = 1 - p.team;
  M.stats[p.team].pens++;
  emit('foul', { pid: p.id, kind, card: !!card });
  if (card) giveCard(p, kind);
  // a penalty try: a foul on a carrier near the line with nobody between him and it
  const h = victim && victim.team === victims ? victim : holder();
  if (h && h.team === victims && Math.abs(tryLineOf(victims) - h.x) < 60 && !M.players.some(q => q.team === p.team && standing(q) && (q.x - h.x) * dirOf(victims) > 0 && q !== p)) {
    emit('penaltyTry', { team: victims });
    if (h.st === 'launched') { h.st = 'ground'; h.z = 0; h.launch = null; }
    tryScored(h, 'penaltyTry'); return true;
  }
  if (M.phase === 'play' && (M.possession === victims || (M.ball.st === 'loose' && M.ball.team === victims))) {
    M.adv = { team: victims, t: 0, x: h ? h.x : M.ball.x, mark: [p.x, p.y], kind };
    refCall('ADVANTAGE!', 'adv'); emit('advantage', { team: victims });
    return true;
  }
  stop('PENALTY', 1.6, () => penalty(victims, p.x, p.y, kind), { call: 'PENALTY!' });
  return true;
}
function giveCard(p, kind) {
  p.yellows++;
  const red = p.yellows >= 2;
  M.ref.card = red ? 'red' : 'yellow'; M.ref.cardT = 2.2;
  M.cards.push({ pid: p.id, team: p.team, red, t: M.clock });
  M.stats[p.team].cards++;
  if (M.ball.holder === p.id) { M.ball.st = 'loose'; M.ball.vz = 20; }
  p.st = red ? 'off' : 'binned'; p.binT = red ? 1e9 : TUNE.v.sinBin; p.x = G.BIN.x + (p.team ? 8 : -8); p.y = G.BIN.y; p.vx = p.vy = 0;
  if (p.ctl >= 0) p.ctl = -1;
  emit('card', { pid: p.id, red, kind });
  emit(red ? 'red' : 'sinBinIn', { pid: p.id });
}
function advStep(dt) {
  const a = M.adv; if (!a) return;
  a.t += dt; const h = holder();
  if (h && h.team === a.team && (h.x - a.x) * dirOf(a.team) > 100) { M.adv = null; emit('advantageOver', {}); refCall('ADVANTAGE OVER'); return; }
  if ((h && h.team !== a.team) || a.t > 5) {
    const m = a.mark, k = a.kind; M.adv = null;
    stop('PENALTY', 1.4, () => penalty(a.team, m[0], m[1], k), { call: 'PENALTY!' });
  }
}

/* ---- the clock, the hooter, possession and territory ---- */
function clockStep(dt) {
  const running = M.phase === 'play' || M.phase === 'ruck';
  if (!running || M.drill || cheat('noClock')) return;
  if (M.suddenDeath) { M.sdClock = (M.sdClock || 0) + dt; if (!M.o.cup && M.sdClock > 120 && !M.over) { fullTime(); } return; }
  M.clock += dt;
  if (!M.hooter && M.clock >= M.halfLen) { M.hooter = true; M.hooterT = 0; emit('hooter', {}); }
  if (M.hooter) M.hooterT += dt;
  const s = M.stats[M.possession]; if (s) s.poss += dt;
  const b = M.ball; if ((b.x - G.CX) * dirOf(0) > 0) M.stats[0].terr += dt; else M.stats[1].terr += dt;
  // the sin bin's clock
  for (const p of M.players) if (p.st === 'binned') { p.binT -= dt; if (p.binT <= 0) { p.st = 'run'; p.x = G.CX + (p.team ? 20 : -20); p.y = G.Y1 - 6; emit('sinBinOut', { pid: p.id }); } }
}

/* ---- out of play, tries, dead balls ---- */
function lawsStep() {
  const b = M.ball, h = holder();
  if (M.phase !== 'play') return;
  const x = b.x, y = b.y;
  // touch: the ball (or the carrier's feet) over a touchline
  const carrierOut = h && (h.y < G.Y0 || h.y > G.Y1) && h.x > G.X0 && h.x < G.X1;
  const ballOut = !h && (y < G.Y0 || y > G.Y1) && b.z < 40 && (x > G.X0 && x < G.X1);
  if (carrierOut || ballOut) {
    const lastTeam = h ? h.team : b.team, throwTeam = b.pen && !h ? b.team : 1 - lastTeam;
    const lx = clamp(x, G.X0 + 51, G.X1 - 51), side = y < G.CY ? 0 : 1;
    if (M.kickoffCheck && b.kind === 'kickoff' && !h) { const k = M.kickoffCheck; M.kickoffCheck = null; return stop('OUT ON THE FULL', 1.4, () => scrum(1 - k.team, G.CX, G.CY, 'kickoff')); }
    if (!h && (b.kind === 'kick' || b.kind === 'bomb' || b.kind === 'grubber')) emit('kickTouch', { team: b.team, pen: b.pen });
    emit('touch', { team: throwTeam });
    return stop('TOUCH', 1.5, () => lineout(throwTeam, lx, side), { call: 'TOUCH!' });
  }
  // in-goal: a carrier over the line he attacks
  if (h) {
    const tl = tryLineOf(h.team), d = dirOf(h.team), inGoal = (h.x - tl) * d > 0, deadX = tl + d * G.IN;
    if (inGoal && h.st !== 'tackled') {
      h.inGoalT = (h.inGoalT || 0) + 1 / 120;
      if (h.inGoalT > 2.5 || (h.x - deadX) * d > -16) return tryScored(h);
    } else h.inGoalT = 0;
    // a carrier in his own in-goal touching down: a drop-out (or a 5 m scrum if he carried it in)
    const own = ownLineOf(h.team), inOwn = (h.x - own) * d < 0;
    if (inOwn) { h.ownGoalT = (h.ownGoalT || 0) + 1 / 120; if (h.ownGoalT > 1.5) { const t = h.team; return stop('TOUCHDOWN', 1.4, () => startKickoff(t, 'dropout')); } } else h.ownGoalT = 0;
    if (h.x < G.DEAD[0] || h.x > G.DEAD[1]) { const t = h.team; return stop('DEAD BALL', 1.4, () => startKickoff(1 - t, 'dropout')); }
    // the line break: past every defender but the sweeper
    if (!h.lineBroken && M.phase === 'play') {
      const behind = teamPlayers(1 - h.team).filter(q => onField(q) && (q.x - h.x) * d < 0).length, total = teamPlayers(1 - h.team).filter(onField).length;
      if (total - behind <= 1 && (h.x - (h.carryStart || h.x)) * d > 20) { h.lineBroken = true; M.stats[h.team].breaks++; addHype(h.team, 8); emit('lineBreak', { pid: h.id }); }
    }
    return;
  }
  // a loose ball over the dead-ball line or touch-in-goal
  if (b.st === 'loose' || b.st === 'air') {
    const inGoalSide = x < G.X0 ? 0 : x > G.X1 ? 1 : -1;
    if (inGoalSide >= 0 && b.z < 30 && (x < G.DEAD[0] || x > G.DEAD[1] || y < G.Y0 || y > G.Y1)) {
      const lineX = inGoalSide ? G.X1 : G.X0, attackers = [0, 1].find(t => tryLineOf(t) === lineX), last = b.team;
      if (last === attackers) return stop('DEAD BALL', 1.4, () => startKickoff(1 - attackers, 'dropout'));
      return stop('DEAD BALL', 1.4, () => scrum(attackers, lineX - dirOf(attackers) * 51, clamp(y, G.Y0 + 51, G.Y1 - 51), 'dead'));
    }
    // a loose ball grounded in the in-goal by an attacker who reaches it
    if (inGoalSide >= 0 && b.z < 4) {
      const lineX = inGoalSide ? G.X1 : G.X0, attackers = [0, 1].find(t => tryLineOf(t) === lineX);
      const a = M.players.find(p => p.team === attackers && standing(p) && Math.hypot(p.x - x, p.y - y) < 8);
      if (a) { giveBall(a, 'pickup'); return tryScored(a); }
    }
    if (x < G.DEAD[0] - 60 || x > G.DEAD[1] + 60) return stop('DEAD BALL', 1.4, () => startKickoff(1 - b.team, 'dropout'));
  }
}

/* ---- the step ---- */
TT.sim.step = (dt, intents) => {
  if (!M || M.frozen) return;
  dt *= TUNE.v.gameSpeed;
  M.t += dt; M.phaseT += dt; if (M.ph.subT != null) M.ph.subT += dt;
  M.intents = intents;
  TT.sim.timers(dt);
  if (M.phaseT > (WATCHDOG[M.phase] || 9999)) { M.watchdogs++; emit('watchdog', { phase: M.phase, sub: M.sub }); watchdogRescue(); }
  M.megaBoot[0] = Math.max(0, M.megaBoot[0] - dt); M.megaBoot[1] = Math.max(0, M.megaBoot[1] - dt);
  if (M.pendingFoul) { const f = M.pendingFoul; f.t -= dt; if (f.t <= 0) { M.pendingFoul = null; const p = pl(f.pid); if (M.phase === 'play' && refSees(p)) callFoul(p, f.kind, f.card, f.victim >= 0 ? pl(f.victim) : null); else if (M.phase === 'play') { addHype(p.team, 8); emit('cheapUnseen', { pid: p.id, kind: f.kind }); } } }
  switch (M.phase) {
    case 'walkout': walkoutStep(dt); break;
    case 'kickoff': kickoffStep(dt); playersStep(dt, true); break;
    case 'play': playStep(dt); break;
    case 'ruck': TT.sp.ruckStep(dt); playersStep(dt); ballStep(dt); break;
    case 'scrum': TT.sp.scrumStep(dt); playersStep(dt, true); break;
    case 'lineout': TT.sp.lineoutStep(dt); playersStep(dt, true); break;
    case 'penalty': TT.sp.penaltyStep(dt); playersStep(dt, true); break;
    case 'setkick': TT.sp.setkickStep(dt); playersStep(dt, true); ballStep(dt); break;
    case 'try': tryStep(dt); playersStep(dt, true); break;
    case 'stop': stopStep(dt); playersStep(dt, true); ballStep(dt); break;
    case 'half': halfStep(dt); break;
    case 'full': playersStep(dt, true); break;
  }
  refStep(dt);
  clockStep(dt);
  if (M.phase === 'play' || M.phase === 'ruck') TT.arc.step(dt);
  else TT.arc.idle(dt);
  if (M.useIt) useItStep(dt);
};
function watchdogRescue() {
  const b = M.ball;
  if (M.phase === 'play') return;
  if (M.phase === 'full' || M.phase === 'half') return;
  // resolve whatever stalled by restarting with a scrum at the ball
  b.st = 'dead';
  const team = M.possession;
  scrum(team, clamp(b.x, G.X0 + 51, G.X1 - 51), clamp(b.y, G.Y0 + 51, G.Y1 - 51), 'watchdog');
}
function walkoutStep(dt) {
  // both teams jog out to their kick-off spots; captains meet; skippable
  const team = M.kickoffTeam, d = dirOf(team);
  for (const p of M.players) {
    const own = p.team === team, dd = dirOf(p.team);
    const spots = own ? [G.CX - d * 14, G.CY + [-200, -60, 60, -130, 0, 130, 200][p.idx]] : [G.CX + d * [120, 120, 120, 210, 300, 250, 250][p.idx], G.CY + [-70, 0, 70, -40, 0, 140, -150][p.idx]];
    const tx = spots[0], ty = spots[1], dx = tx - p.x, dy = ty - p.y, m = Math.hypot(dx, dy);
    const sp = m > 4 ? 75 : 0; p.vx = dx / (m || 1) * sp; p.vy = dy / (m || 1) * sp; p.x += p.vx * dt; p.y += p.vy * dt;
    p.facing = m > 4 ? Math.atan2(dy, dx) : (dd > 0 ? 0 : PI);
  }
  const skip = Object.values(M.intents || {}).some(it => it && (it.p.x || it.p.ci));
  if (M.phaseT > 5.5 || skip || M.o.attract && M.phaseT > 3) startKickoff(M.kickoffTeam);
}
function stopStep(dt) {
  for (const p of M.players) if (isFree(p)) { p.vx *= Math.exp(-4 * dt); p.vy *= Math.exp(-4 * dt); }
  if (M.phaseT >= (M.ph.secs || 1.5)) { const n = M.ph.next; if (M.ph.noHooter) n(); else afterStop(n); }
}
function tryStep() {
  const ph = M.ph;
  if (M.phaseT < 2.6) return;
  if (ph.ended) return fullTime();
  if (ph.how === 'penaltyTry') return afterStop(() => startKickoff(ph.team));
  if (M.drill && M.drill.noConversion) return;
  TT.sp.startSetKick(ph.team, 'conv', ph.y);
}
function halfStep() {
  const skip = Object.values(M.intents || {}).some(it => it && it.p.x);
  if (M.phaseT > 7 || (skip && M.phaseT > 1.2) || M.o.attract) {
    M.half = 2; M.clock = 0; M.hooter = false;
    for (const p of M.players) if (p.st === 'binned' || p.st === 'off') { /* stays */ } else resetPlayer(p);
    startKickoff(1);
  }
}
function useItStep(dt) {
  const u = M.useIt, h = holder();
  if (M.phase !== 'play' || !h || h.id !== u.pid || Math.hypot(h.x - u.x, h.y - u.y) > 14) { M.useIt = null; return; }
  u.t += dt;
  if (u.t > 3) { M.useIt = null; const t = h.team; stop('USE IT!', 1.4, () => scrum(1 - t, h.x, h.y, 'useIt'), { call: 'USE IT!' }); }
}

/* ---- open play: every player's step, the ball, the laws ---- */
function playStep(dt) {
  playersStep(dt);
  ballStep(dt);
  if (M.phase !== 'play') return;
  lawsStep();
  advStep(dt);
  if (M.phase === 'play' && M.hooter && M.hooterT > 30 && M.ball.st === 'held' && pl(M.ball.holder).st === 'tackled') endHalf();
  const h = holder(); if (h) { const g = (h.x - (h._mx == null ? h.x : h._mx)) * dirOf(h.team); if (g > 0) { M.stats[h.team].metres += g; h.metres += g; } h._mx = h.x; }
}
