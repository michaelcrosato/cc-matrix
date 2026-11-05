/* THUGBY TURBO — match simulation: players, ball, contact, laws. Reads intents, writes state S. No drawing here. */
let S = null;
const N = 7;
const teamDef = t => S.teams[t];
const opp = t => 1 - t;
const atkX = t => S.dir[t] > 0 ? G.X1 : G.X0;       // the try line a team attacks
const ownX = t => S.dir[t] > 0 ? G.X0 : G.X1;
const inGoalOf = p => (p.x - atkX(p.team)) * S.dir[p.team] >= 0;
const alive = p => !p.off && p.st !== 'binned' && p.st !== 'sentOff';
const standing = p => alive(p) && !['down', 'ground', 'getUp', 'air', 'stun', 'fall'].includes(p.st);
const teamPlayers = t => S.players.filter(p => p.team === t && alive(p));
const emptyIntent = () => ({ mx: 0, my: 0, turbo: false, x: false, sq: false, ci: false, tri: false, l1: false, r1: false, hx: false, hsq: false, hci: false, hl1: false, hr1: false, rx: false, rci: false, rl1: false, rr1: false, aim: null, click: -1 });
TT.emptyIntent = emptyIntent;
let say = (who, text, t = 2.4) => { if (S) S.radio = { who, text, t }; };
const banner = (text, color = '#ffffff', t = 1.6) => { S.banners.push({ text, color, t, t0: t }); if (S.banners.length > 3) S.banners.shift(); };
const line = key => { const l = LINES[key]; if (l && S.t - (S.lastLine || -9) > 3) { const x = pick(S.fx, l); say(x[0], x[1]); S.lastLine = S.t; } };

function newMatch(cfg) {
  const rng = E.rng(cfg.seed || 1234);
  const H = TEAMS[cfg.home], A = TEAMS[cfg.away];
  S = TT.S = {
    cfg, t: 0, rng, fx: E.rng((cfg.seed || 1) + 99), phase: 'intro', phaseT: 0, sub: '', half: 1, clock: 0, hooter: false, hooterT: 0, sudden: false, over: false,
    score: [0, 0], hype: [0, 0], dir: [1, -1], teams: [H, A], venue: VENUES[cfg.venue], poss: -1, lastTeam: 0, lastTouch: -1,
    ball: { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: null, rot: 0, rotV: 0, spin: 0, lastKicker: -1 },
    players: [], ref: null, powerups: [], events: [], counts: {}, banners: [], radio: null, sp: null, adv: null, cards: [], fire: [0, 0], fireP: [-1, -1], fireT: [0, 0],
    seats: cfg.seats || [], stats: [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, convs: 0, convTries: 0, tackles: 0, missed: 0, bigHits: 0, monster: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, pens: 0 })),
    tries: [], potm: null, useIt: 0, ruckMark: null, wind: 0, windT: 8, windDir: 1, mud: [], jets: [], strike: null, strikeT: 25, chicken: null, chickT: 55, puT: 20, refDownT: 0,
    dropT: 0, shake: 0, flash: null, kickInfo: null, lastRunStart: 0, replayReq: null, frames: [], frameN: 0, drill: cfg.drill || null, drillDone: false, elapsed: 0, goldenT: 0, lastScoreT: -99, fireMan: [-1, -1], tryRun: [0, 0],
    sinbin: [], dev: { infTurbo: false, noFouls: false, aiOff: false }, win: -1
  };
  TUNE.layer('halfLength', { halfLength: () => cfg.halfLength || TUNE.base.halfLength });
  for (let t = 0; t < 2; t++) for (let r = 0; r < N; r++) S.players.push(mkPlayer(t * N + r, t, r));
  S.ref = { x: G.CX, y: G.CY + 120, facing: 0, vx: 0, vy: 0, down: 0, st: 'run', call: '', callT: 0, sig: '', sigT: 0, z: 0 };
  setupVenue();
  return S;
}

function mkPlayer(id, team, role) {
  const T = S.teams[team], b = ROLE_STATS[role], r = (id * 2654435761 >>> 0) / 4294967296;
  const m = i => clamp(Math.round(b[i] + (r * 3 - 1.5) + (T.mod || 0) * .6), 1, 10);
  const p = { id, team, role, name: T.names[role], x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? Math.PI : 0, st: 'run', stT: 0, turbo: TUNE.v.turboTank, turboCd: 0, stun: 0, spd: m(0), pow: m(1), hnd: m(2), kck: m(3), tkl: m(4),
    evade: 0, fend: 0, cd: { step: 0, fend: 0, spin: 0 }, xHold: 0, ciHold: 0, passHold: 0, passSide: 0, flags: {}, ctl: -1, am: '', amT: 0, hit: 0, power: null, powerT: 0, grease: 0, iron: 0, superT: 0, superKind: '', onFire: 0, tryStreak: 0, lastStepT: -9, off: false, immovable: !!(T.boss && role === 0),
    heldT: 0, heldBy: -1, tackledT: 0, mudT: 0, rest: false, wantX: 0, wantY: 0, aiT: Math.random() * 0, reactT: 0, name2: T.names[role], offload: 0, home: { x: 0, y: 0 }, burn: 0, smoke: 0, big: 0, carryT: 0 };
  if (p.immovable) { p.pow = 10; p.tkl = 9; p.spd = Math.max(p.spd, 5); }
  return p;
}

function setupVenue() {
  const v = S.venue.hazard, R = E.rng(S.cfg.seed + 5);
  S.mud = []; S.jets = [];
  if (v === 'mud') for (let i = 0; i < 6; i++) S.mud.push({ x: G.X0 + 150 + R() * (G.X1 - G.X0 - 300), y: G.Y0 + 60 + R() * (G.Y1 - G.Y0 - 120), r: 38 + R() * 30 });
  if (v === 'flames') for (let s = 0; s < 2; s++) for (let i = 0; i < 8; i++) S.jets.push({ x: G.X0 + 70 + i * 126, y: s ? G.Y1 - 32 : G.Y0 + 32, st: 0, t: 0 });
  S.windT = 8 + R() * 8;
}

const mudAt = (x, y) => { for (const m of S.mud) if (Math.hypot(x - m.x, y - m.y) < m.r) return true; return false; };

// ---------- placing and formations
function place(p, x, y, face) { p.x = x; p.y = y; p.z = 0; p.vx = p.vy = p.vz = 0; if (face !== undefined) p.facing = face; if (alive(p) && p.st !== 'celebrate') { p.st = 'run'; } p.stT = 0; p.evade = p.fend = 0; p.am = ''; p.xHold = 0; p.ciHold = 0; p.passHold = 0; p.flags = {}; }
function ballTo(x, y, st = 'dead') { const b = S.ball; b.holder = null; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.st = st; }
function giveBall(p) {
  const b = S.ball; b.holder = p; b.st = 'held'; b.vx = b.vy = b.vz = 0; S.poss = p.team; S.lastTeam = p.team; S.lastTouch = p.id; p.carryT = 0; p.ciHold = 0; p.passHold = 0; p.xHold = 0;
  if (S.adv && S.adv.team !== p.team && S.adv.t > 0) { /* ball lost under advantage */ S.adv.lost = true; }
  if (p.superKind === 'hurricane') endSuper(p);
  holdPos(p); S.tryRun[p.team] = S.tryRun[p.team] || 0; p.runFrom = p.x; S.lastRunStart = S.t;
}
function holdPos(p) { const b = S.ball; b.x = p.x + Math.cos(p.facing) * 4; b.y = p.y + Math.sin(p.facing) * 4 + 1; b.z = 13 + p.z; }
function dropBall(vx, vy, vz) { const b = S.ball, h = b.holder; if (!h) return; b.holder = null; b.st = 'loose'; b.vx = vx; b.vy = vy; b.vz = vz; b.rotV = 8; S.poss = -1; S.lastTeam = h.team; }

function formation(team, x, kind) {
  // kinds: 'line' (deep attack shape behind x), 'def' (flat line ahead)
  const d = S.dir[team], P = teamPlayers(team), out = {};
  const ys = [-70, -20, 25, -30, 0, 60, 125];
  const deep = [20, 22, 20, 34, 52, 74, 96];
  for (const p of P) { const r = p.role; out[p.id] = { x: x - d * (kind === 'def' ? -deep[r] * .35 + 4 : deep[r]) * 1, y: clamp(G.CY + ys[r] * (team ? -1 : 1) * 1.1, G.Y0 + 30, G.Y1 - 30) }; }
  return out;
}
function lineUp(team, x, dep) { const f = formation(team, x, dep); for (const p of teamPlayers(team)) { const q = f[p.id]; place(p, clamp(q.x, G.X0 - 80, G.X1 + 80), q.y, S.dir[team] > 0 ? 0 : Math.PI); } }

// ---------- phases
function setPhase(ph, sub = '') { S.phase = ph; S.sub = sub; S.phaseT = 0; }
function startMatch() {
  S.dir = [1, -1];
  const cfg = S.cfg;
  if (cfg.mode === 'drill') return startDrill(cfg.drill);
  doKickoff(0, true);
}
function doKickoff(kickTeam, first) {
  const rec = opp(kickTeam), kp = kickerOf(kickTeam);
  S.ruckMark = null; S.adv = null; S.useIt = 0; S.sp = null; S.hooterT = 0;
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'air' || p.st === 'stun' || p.st === 'fall' || p.st === 'getUp' || p.st === 'celebrate' || p.st === 'getup') p.st = 'run'; p.flags = {}; }
  // kicking team behind the ball line on its own half, receivers in their half
  const dk = S.dir[kickTeam];
  for (const p of teamPlayers(kickTeam)) { const k = p.role; place(p, G.CX - dk * (6 + (k === 4 ? 0 : 24 + k * 10)), G.CY + (k - 3) * 52 * (kickTeam ? -1 : 1) + (k === 4 ? 0 : 0), dk > 0 ? 0 : Math.PI); }
  place(kp, G.CX - dk * 6, G.CY, dk > 0 ? 0 : Math.PI);
  const dr = S.dir[rec];
  for (const p of teamPlayers(rec)) { const k = p.role; place(p, G.CX - dr * (130 + (k < 3 ? 60 : 130) + k * 8), G.CY + (k - 3) * 56, dr > 0 ? 0 : Math.PI); }
  ballTo(G.CX, G.CY, 'placed'); S.ball.z = 2;
  S.sp = { type: 'kickoff', team: kickTeam, kicker: kp.id, aim: { x: 0, y: 0 }, power: 0, charging: false, t: 0, drop: false, aimY: 0 };
  setPhase('kickoff'); S.sinbin.forEach(b => { /* keep binned */ });
  banner(first ? 'KICK OFF!' : 'RESTART', '#fff4c0'); bus.emit('kickoff', { team: kickTeam }); line('kickoff');
}
function kickerOf(team) { return S.players.find(p => p.team === team && p.role === 4 && alive(p)) || teamPlayers(team)[0]; }

function startDrill(id) {
  const D = DRILLS.find(d => d.id === id), me = S.players[4], dr = 1;
  S.drillDef = D; setPhase('play');
  for (const p of S.players) { if (p.team === 1) { p.off = true; } }
  const home = teamPlayers(0);
  const away = S.players.filter(p => p.team === 1);
  const ON = (p, x, y) => { p.off = false; place(p, x, y, Math.PI); p.dummy = true; };
  for (const p of home) place(p, G.CX - 400 - p.role * 16, G.CY + (p.role - 3) * 44, 0);
  place(me, G.X0 + 120, G.CY, 0);
  const carry = () => { giveBall(me); };
  switch (D.setup) {
    case 'solo': carry(); ON(away[0], G.CX, G.CY - 50); ON(away[4], G.CX + 300, G.CY + 40); for (const p of home) if (p !== me) p.off = true; break;
    case 'passing': carry(); for (const p of home) if (p !== me) place(p, me.x - 40 - p.role * 6, G.CY + (p.role - 3) * 60, 0); S.cfg.noScore = true; break;
    case 'evade': carry(); for (const p of home) if (p !== me) p.off = true; ON(away[0], me.x + 140, G.CY); ON(away[1], me.x + 260, G.CY - 40); ON(away[2], me.x + 380, G.CY + 40); for (const a of [away[0], away[1], away[2]]) a.dummy = false; break;
    case 'tackle': for (const p of home) if (p !== me) p.off = true; ON(away[4], me.x + 260, G.CY); giveBall(away[4]); away[4].dummy = false; break;
    case 'ruck': carry(); ON(away[0], me.x + 40, G.CY); away[0].dummy = false; for (const p of home) if (p !== me && p.role > 2) p.off = true; break;
    case 'kick': carry(); for (const p of home) if (p !== me) p.off = true; break;
    case 'scrum': for (const p of away) p.off = false; startScrum(0, G.CX, G.CY); break;
    case 'lineout': for (const p of away) p.off = false; startLineout(0, G.CX - 100, G.Y0); break;
    case 'goal': { for (const p of home) if (p !== me) p.off = true; startConversion(0, me, G.CY, 'conv'); break; }
  }
  S.score = [0, 0];
}

// ---------- ball physics
function stepBall(dt) {
  const b = S.ball;
  if (b.st === 'held') { if (b.holder) holdPos(b.holder); return; }
  if (b.st === 'dead' || b.st === 'placed') { b.rot += 0; return; }
  const windF = S.wind * 40 * TUNE.v.windMult * S.windDir;
  if (b.z > 2) { b.vx += windF * dt; b.vx -= b.vx * .3 * dt; b.vy -= b.vy * .3 * dt; }
  b.vz -= 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rot += b.rotV * dt;
  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < -30) {
      const ch = TUNE.v.bounceChaos, ang = (S.rng() * 2 - 1) * 70 * Math.PI / 180 * ch, c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx * .75; b.vy = vy * .75; b.vz = -b.vz * .45 * U(S.rng, .3 / .45 * .6, 1.25 / .45 * .6) * .8;
      if (S.mud.length && mudAt(b.x, b.y)) { b.vx *= .5; b.vy *= .5; b.vz *= .5; }
      b.st = 'loose'; bus.emit('bounce', { x: b.x, y: b.y });
    } else { b.vz = 0; b.vx -= b.vx * 1.4 * dt; b.vy -= b.vy * 1.4 * dt; if (b.st !== 'loose') b.st = 'loose'; if (Math.hypot(b.vx, b.vy) < 3) { b.vx = b.vy = 0; } }
  }
}

// ---------- movement
function speedOf(p) {
  let s = TUNE.v.runSpeed * (.8 + .04 * p.spd);
  if (S.ball.holder === p) s *= .96;
  if (S.mud.length && mudAt(p.x, p.y)) { s *= .8; p.mudT += .01; }
  if (p.superKind === 'thunder') s *= 1.35;
  if (p.superKind === 'hurricane') s *= 2;
  if (p.xHold > .18) s *= 1.15;
  if (p.heldT > 0) s *= .4;
  if (S.cfg.diffMult && p.team === 1) s *= S.cfg.diffMult.spd || 1;
  return s;
}
function moveStep(p, I, dt) {
  const canMove = p.st === 'run' || p.st === 'charge';
  let tx = 0, ty = 0;
  const m = Math.hypot(I.mx, I.my);
  if (canMove && m > .05) {
    const k = Math.min(1, m); let sp = speedOf(p);
    const wantTurbo = I.turbo && (p.turbo > 0 || S.dev.infTurbo || p.power === 'pie' || p.onFire > 0 || p.superKind);
    if (wantTurbo && (p.turbo > 0 || S.dev.infTurbo || p.power === 'pie' || p.onFire > 0 || p.superKind === 'thunder')) { sp *= TUNE.v.turboMult; if (!(S.dev.infTurbo || p.power === 'pie' || p.onFire > 0)) p.turbo = Math.max(0, p.turbo - dt); p.turboCd = .6; p.turboOn = true; } else p.turboOn = false;
    tx = I.mx / m * sp * k; ty = I.my / m * sp * k;
  } else p.turboOn = false;
  if (!p.turboOn) { p.turboCd -= dt; if (p.turboCd <= 0 && p.turbo < TUNE.v.turboTank) p.turbo = Math.min(TUNE.v.turboTank, p.turbo + dt * .3 * 1.0); }
  if (p.st === 'air') { /* ballistic */ }
  else if (canMove || p.st === 'fall' || p.st === 'stun') {
    const ac = TUNE.v.accel * (S.mud.length && mudAt(p.x, p.y) ? .6 : 1) * dt, k2 = (canMove ? 1 : .3);
    const ddx = tx - p.vx, ddy = ty - p.vy, dl = Math.hypot(ddx, ddy);
    if (dl > ac) { p.vx += ddx / dl * ac * k2; p.vy += ddy / dl * ac * k2; } else if (canMove) { p.vx = tx; p.vy = ty; } else { p.vx *= (1 - 4 * dt); p.vy *= (1 - 4 * dt); }
  } else { p.vx *= (1 - 7 * dt); p.vy *= (1 - 7 * dt); }
  // update facing toward velocity if moving
  if (canMove && Math.hypot(p.vx, p.vy) > 12) { const ta = Math.atan2(p.vy, p.vx), rate = (S.ball.holder === p ? 8 : 10) * dt; p.facing += clamp(angDiff(ta, p.facing), -rate, rate); }
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.st === 'air') { p.vz -= 700 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; landed(p); } }
  p.x = clamp(p.x, G.X0 - G.ING - 28, G.X1 + G.ING + 28); p.y = clamp(p.y, G.Y0 - 44, G.Y1 + 44);
}
function landed(p) {
  p.st = 'ground'; p.stT = 1.1; p.am = ''; p.vx *= .5; p.vy *= .5; bus.emit('thud', { x: p.x, y: p.y, big: true }); if (TT.cfg.present) { TT.fxDust && TT.fxDust(p.x, p.y); }
  S.shake = Math.max(S.shake, 3);
}
function separate(dt) {
  const P = S.players;
  for (let i = 0; i < P.length; i++) { const a = P[i]; if (!standing(a)) continue; for (let j = i + 1; j < P.length; j++) { const c = P[j]; if (!standing(c)) continue; const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < 8 && d > .01) { const k = (8 - d) * .5 * Math.min(1, dt * 20); a.x -= dx / d * k; a.y -= dy / d * k; c.x += dx / d * k; c.y += dy / d * k; } } }
}
