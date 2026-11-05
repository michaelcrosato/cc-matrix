/* BASKETBLAM - the match simulation: players, ball, actions, rules */

/* ---- rigs ---- */
const makeRig = (spec, team, opts = {}) => {
  const lk = spec.look, o = {
    size: lk.size || 1.6, build: lk.build || 'heroic', weapon: null, hair: lk.style || 'short', outfit: 'shirt', sleeves: 'none',
    colors: { skin: lk.skin, hair: lk.hair, cloth: team.color, pants: team.dark, boot: team.trim, belt: team.dark, trim: team.trim, glove: team.color }
  };
  if (lk.band) o.hat = { style: 'band', color: lk.band };
  if (lk.eye) { o.eyeGlow = lk.eye; o.colors.eye = lk.eye; }
  return new E.Humanoid(Object.assign(o, opts));
};
const makeSpeakerRig = key => {
  const v = VOICES[key], lk = v.look;
  return new E.Humanoid({ size: 1.3, build: 'chibi', weapon: null, hair: lk.style, outfit: 'shirt', hat: lk.band ? { style: 'band', color: lk.band } : undefined, eyeGlow: lk.eye, colors: { skin: lk.skin, hair: lk.hair, cloth: v.color, eye: lk.eye } });
};

/* ---- twists: gravity and friends ---- */
const courtDef = () => COURTS[S.court] || COURTS.alley;
const isMoon = () => courtDef().twist === 'moon';
const ballG = () => tune('ballGravity') * (isMoon() ? .6 : 1);
const playerG = () => tune('playerGravity') * (isMoon() ? .55 : 1);

/* ---- creating a match ---- */
const stat0 = () => ({ pts: 0, dunks: 0, threes: 0, blocks: 0, steals: 0, shoves: 0, assists: 0, perfect: 0, style: 0 });
function newMatch(cfg) {
  // cfg: { teams:[h,a], court, mode, humans: {slot: Input}, qLen, difficulty, seed, ot }
  S.mode = cfg.mode || 'exhibition'; S.court = cfg.court || 'alley'; S.teams = cfg.teams.slice();
  S.rng = E.rng(cfg.seed || (Date.now() & 0xffffff) || 7); S.fxRng = E.rng((cfg.seed || 3) + 99);
  S.powerups = []; S.fx.banners = []; S.announcerQueue = []; S.twist = { t: 0, wind: 0, windTarget: 0, spot: { x: COURT.cx, y: COURT.cy - 60, t: 0 }, puddles: [] };
  S.cfg = cfg; S.humans = cfg.humans || {};
  S.players = [];
  for (let slot = 0; slot < 4; slot++) {
    const team = slot < 2 ? 0 : 1, tdef = TEAMS[S.teams[team]], spec = tdef.players[slot % 2];
    const p = {
      slot, team, mate: slot ^ 1, tdef, spec, name: spec.name, r: spec.ratings, rig: makeRig(spec, tdef), input: S.humans[slot] || null, ai: { t: 0, think: 0, tx: 0, ty: 0, mode: '', jt: 0, shootT: 0 },
      x: COURT.cx, y: COURT.cy, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? PI : 0, turbo: 1, act: null, stun: 0, immune: 0, boost: 0, hold: 0,
      cd: { steal: 0, shove: 0, spin: 0, jump: 0, taunt: 0, call: 0 }, pu: null, puT: 0, nova: false, phase: slot * 1.7, st: stat0(), frozen: 0, tauntT: 0, cheer: 0, runAnim: 0, bigHead: 1
    };
    S.players.push(p);
  }
  S.ball = { x: COURT.cx, y: COURT.cy, z: 30, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, last: null, shot: null, roll: 0, scored: false, touchedRim: false, dribble: 0, t: 0, noCatch: {}, gold: false, trail: [] };
  S.match = {
    phase: 'pre', quarter: 1, qLen: cfg.qLen || 90, clock: cfg.qLen || 90, shotClock: tune('shotClock'), score: [0, 0], possession: 0, arrow: 0, streak: [0, 0], novaT: [0, 0], ot: 0, time: 0, t: 0,
    sudden: false, qScores: [[0, 0]], excite: 0, tip: null, inbound: null, deadT: 0, endT: 0, buzzer: false, stats: { lead: 0, bigLead: 0, longest: 0 }, powerT: tune('powerupEvery'),
    over: false, winner: -1, difficulty: cfg.difficulty || 'Pro', trash: 0, shatterT: 0, breakT: 0, breakKind: '', looseT: 0, lastScorer: -1, runs: [0, 0], styleShown: 0
  };
  S.camera.x = COURT.cx; S.camera.zoom = 1;
  S.dev.autopilot = false;
  resetPositions();
  startTip();
  return S.match;
}
function resetPositions(attackTeam = -1) {
  const M = S.match;
  S.players.forEach(p => {
    const dir = p.team === 0 ? 1 : -1;
    p.x = COURT.cx - dir * (p.slot % 2 ? 150 : 70); p.y = COURT.cy + (p.slot % 2 ? 50 : -50); p.z = 0; p.vx = p.vy = p.vz = 0; p.act = null; p.stun = 0; p.facing = dir > 0 ? 0 : PI; p.immune = 0; p.frozen = 0;
  });
}

/* ---- commands: what each slot wants this step ---- */
const NOCMD = () => ({ mx: 0, my: 0, shoot: { down: false, pressed: false, released: false }, pass: { pressed: false }, turbo: { down: false }, shove: { pressed: false }, oop: { pressed: false }, taunt: { pressed: false } });
const humanCmd = (I) => {
  const m = I.move(), c = NOCMD();
  c.mx = m[0]; c.my = m[1];
  c.shoot = { down: I.down('shoot'), pressed: I.pressed('shoot'), released: I.released('shoot') };
  c.pass.pressed = I.pressed('pass'); c.turbo.down = I.down('turbo'); c.shove.pressed = I.pressed('shove'); c.oop.pressed = I.pressed('oop'); c.taunt.pressed = I.pressed('taunt');
  if (c.turbo.down && c.pass.pressed && !c.shoot.down) { c.shove.pressed = true; }
  return c;
};

/* ---- helpers ---- */
const angAbs = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const teamOf = p => S.players.filter(q => q.team === p.team);
const opps = p => S.players.filter(q => q.team !== p.team);
const mateOf = p => S.players[p.mate];
const holder = () => S.ball.owner;
const reachBonus = p => (p.pu === 'giant' ? 1.8 : 1);
const novaOf = p => S.match.novaT[p.team] > 0;
const speedOf = p => tune('runSpeed') * (.86 + .028 * p.r.zoom) * (p.pu === 'rocket' ? 1.22 : 1) * (novaOf(p) ? 1.1 : 1);
const dunkRangeOf = p => tune('dunkRange') * (.75 + .05 * p.r.slam) * (novaOf(p) ? 1.25 : 1);
const hoopDist = (p, h) => Math.hypot(p.x - h.x, p.y - h.y);
function banner(text, o = {}) { S.fx.banners.push({ text, t: 0, life: o.life || 1.3, colors: o.colors || ['#fffbe8', '#ffd36a', '#ff6a2a'], scale: o.scale || 3, y: o.y || .34, shake: o.shake || 0 }); if (S.fx.banners.length > 4) S.fx.banners.shift(); }
function hitFx(x, y, z, big = 1, color = '#fff6c0') {
  try { P.sparks(x, y, z, 8 * big | 0, null, { color }); P.ring && P.ring(x, y, 3, 14 * big, color, .35, z); } catch (e) { }
  S.fx.shake = Math.max(S.fx.shake, 2 * big); game.shake && game.shake(1.5 * big);
}
function rumble(p, a, s) { if (p.input && game.settings.rumble2 !== 'Off') try { p.input.rumble(a, s); } catch (e) { } }

/* ---- possession / ball ownership ---- */
function giveBall(p) {
  const B = S.ball, M = S.match;
  if (B.owner && B.owner !== p) B.owner.hasBall = false;
  B.owner = p; p.hasBall = true; B.state = 'held'; B.last = p; B.shot = null; B.scored = false; B.vx = B.vy = B.vz = 0; B.touchedRim = false;
  if (M.possession !== p.team) { M.possession = p.team; M.shotClock = tune('shotClock'); }
  p.hold = 0;
}
function looseBall(vx, vy, vz) {
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; } B.owner = null; B.state = 'loose'; B.vx = vx; B.vy = vy; B.vz = vz; B.shot = null; B.noCatch = {}; S.match.looseT = 0;
}

/* ---- the step of one player ---- */
function playerStep(p, c, dt) {
  const M = S.match, B = S.ball, live = M.phase === 'live' || M.phase === 'inbound' || M.phase === 'pre' && false;
  const playing = M.phase === 'live' || M.phase === 'inbound' || M.phase === 'score' || M.phase === 'tip' || M.phase === 'deadball';
  for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
  p.immune = Math.max(0, p.immune - dt); p.puT = Math.max(0, p.puT - dt); if (p.pu && p.puT <= 0) { emit('powerupEnd', { p: p.slot, id: p.pu }); p.pu = null; }
  p.frozen = Math.max(0, p.frozen - dt); p.cheer = Math.max(0, p.cheer - dt); p.tauntT = Math.max(0, p.tauntT - dt);
  p.nova = novaOf(p);
  const g = playerG(), onGround = p.z <= 0 && p.vz <= 0;
  if (p.stun > 0) {
    p.stun -= dt; p.vx = approach(p.vx, 0, 500 * dt); p.vy = approach(p.vy, 0, 500 * dt);
  } else if (p.frozen > 0) { p.vx = p.vy = 0; }
  else if (p.act) actStep(p, c, dt);
  else if (playing || M.phase === 'camp') freeMove(p, c, dt, onGround);
  else { p.vx = approach(p.vx, 0, 900 * dt); p.vy = approach(p.vy, 0, 900 * dt); }
  // vertical
  if (p.z > 0 || p.vz > 0) { p.vz -= g * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; if (p.vz < -120) { sfx('thud', { vol: .5 }); P.dust && P.dust(p.x, p.y, 0, 3); } p.vz = 0; p.landed = true; } }
  // slide, puddles
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, COURT.x0 - 28, COURT.x1 + 28); p.y = clamp(p.y, COURT.y0 - 16, COURT.y1 + 20);
  // turbo
  if (S.cheats.infTurbo || novaOf(p) || p.pu === 'rocket') p.turbo = 1;
  p.turbo = clamp(p.turbo, 0, 1);
}

function freeMove(p, c, dt, onGround) {
  const B = S.ball, M = S.match, mag = Math.hypot(c.mx, c.my), moving = mag > .12;
  let sp = speedOf(p);
  const wantTurbo = c.turbo.down && moving && (p.turbo > .02);
  if (wantTurbo) { sp *= tune('turboMult'); if (!(S.cheats.infTurbo || novaOf(p) || p.pu === 'rocket')) { p.turbo -= tune('turboDrain') * dt; } p.boost = 1; p.noRefill = .35; }
  else { p.boost = 0; p.noRefill = Math.max(0, (p.noRefill || 0) - dt); if (p.noRefill <= 0) p.turbo += tune('turboRefill') * dt; }
  // puddles slow control
  let acc = tune('accel'); const pud = S.twist.puddles && S.twist.puddles.find(q => Math.hypot(q.x - p.x, q.y - p.y) < q.r);
  if (pud && onGround) acc *= .22;
  if (!onGround) acc *= .35;
  const tx = c.mx * sp, ty = c.my * sp * .82;
  const prevSp = Math.hypot(p.vx, p.vy);
  p.vx = approach(p.vx, tx, acc * dt); p.vy = approach(p.vy, ty, acc * dt);
  if (moving && onGround) {
    const want = Math.atan2(c.my, c.mx);
    // sneaker squeak on a sharp turn
    if (prevSp > 70 && Math.abs(E.angDiff ? E.angDiff(want, p.facing) : 0) > 2.2 && (p.cd.squeak || 0) <= 0) { sfx('squeak', { vol: .5 }); p.cd.squeak = .3; }
    p.cd.squeak = Math.max(0, (p.cd.squeak || 0) - dt);
    p.facing = E.approachAng ? E.approachAng(p.facing, want, dt * (p.hasBall ? 12 : 16)) : want;
  }
  // defenders face the ball handler
  const h = holder();
  if (!moving && h && h.team !== p.team) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  if (!moving && !h) { const m = (S.ball); p.facing = Math.atan2(m.y - p.y, m.x - p.x); }
  p.hold += dt;
  // buttons
  const hoop = attackHoop(p.team);
  if (M.phase === 'tip') { if (c.shoot.pressed && p.z <= 0 && M.tip && M.tip.jumpers.includes(p)) { p.vz = tune('jumpShotVz') * 1.1; M.tip.jumpT[p.slot] = M.tip.t; sfx('jump'); } return; }
  const canAct = M.phase === 'live' || M.phase === 'camp' || (M.phase === 'inbound' && M.inbound);
  if (!canAct) return;
  if (M.phase === 'inbound') { if (p === M.inbound.who && c.pass.pressed) throwInbound(); return; }
  if (p.hasBall) {
    if (c.shoot.pressed && onGround) {
      const d = hoopDist(p, hoop);
      if ((c.turbo.down || p.turbo > .4 && d < dunkRangeOf(p) * .8) && p.turbo >= .05 && d < dunkRangeOf(p)) startDunk(p);
      else startJump(p);
    } else if (c.pass.pressed) passTo(p, mateOf(p));
    else if (c.oop.pressed) throwOop(p);
    else if (c.shove.pressed && p.cd.spin <= 0 && onGround) startSpin(p, c);
  } else {
    if (c.shoot.pressed && onGround && p.cd.jump <= 0) { p.vz = tune('jumpShotVz') * (1 + (p.r.swat - 5) * .03) * (c.turbo.down ? 1.12 : 1) * (isMoon() ? 1.15 : 1); p.act = { type: 'jump', t: 0 }; p.cd.jump = .3; sfx('jump', { vol: .5 }); emit('jump', { p: p.slot }); }
    else if (c.pass.pressed && onGround && p.cd.steal <= 0) startSwipe(p);
    else if (c.shove.pressed && onGround && p.cd.shove <= 0) startShove(p, c);
    else if (c.oop.pressed && p.cd.call <= 0) { p.cd.call = 1.2; const m = mateOf(p); if (m.hasBall && !m.input) m.ai.oopCall = 1.5; emit('call', { p: p.slot }); }
    else if (c.taunt.pressed && p.cd.taunt <= 0 && !HUB) { p.cd.taunt = 1.5; p.tauntT = 1.0; emit('taunt', { p: p.slot, text: pick(p.spec.taunts) }); }
  }
}

function actStep(p, c, dt) {
  const a = p.act, B = S.ball, M = S.match; a.t += dt;
  switch (a.type) {
    case 'jump': { // a block / rebound jump
      const air = p.z > 0 || p.vz > 0; p.vx = approach(p.vx, c.mx * speedOf(p) * .5, 500 * dt); p.vy = approach(p.vy, c.my * speedOf(p) * .4, 500 * dt);
      if (!air && a.t > .05) p.act = null; break; }
    case 'shot': {
      p.vx = approach(p.vx, c.mx * 30, 600 * dt); p.vy = approach(p.vy, c.my * 25, 600 * dt);
      const V = a.V, s = Math.abs(p.vz) / V;
      if (B.owner !== p) { p.act = null; break; } // lost the ball
      const apexPast = p.vz <= 0 ? a.t - (a.apexT || (a.apexT = a.t)) : 0;
      if (!a.released && ((!c.shoot.down && a.t > .05 && p.vz < V * .85) || apexPast > .22 || a.t > .95)) { a.released = true; releaseShot(p, s, p.vz > 0); }
      if (a.released && p.z <= 0) p.act = null;
      if (p.z <= 0 && a.t > .1 && !a.released) { p.act = null; }
      break; }
    case 'dunk': dunkStep(p, dt); break;
    case 'spin': {
      const k = a.t / a.dur; p.vx = a.dx * a.sp * (1 - k * .5); p.vy = a.dy * a.sp * .8 * (1 - k * .5); p.facing = a.f0 + k * TAU * (a.dir || 1);
      p.immune = Math.max(p.immune, .05); if (a.t >= a.dur) { p.act = null; p.facing = a.f0; } break; }
    case 'shove': {
      const k = a.t / a.dur; p.vx = Math.cos(p.facing) * 120 * (1 - k); p.vy = Math.sin(p.facing) * 100 * (1 - k);
      if (!a.hit && a.t > a.dur * .3 && a.t < a.dur * .75) { a.hit = shoveHit(p); }
      if (a.t >= a.dur) p.act = null; break; }
    case 'swipe': {
      p.vx = approach(p.vx, Math.cos(p.facing) * 40, 800 * dt); p.vy = approach(p.vy, Math.sin(p.facing) * 30, 800 * dt);
      if (!a.done && a.t > a.dur * .35) { a.done = true; swipeHit(p); }
      if (a.t >= a.dur) p.act = null; break; }
    case 'oopwait': {
      // the receiver of an alley-oop: runs to the spot, then leaps so he arrives with the ball
      const hoop = attackHoop(p.team), tx = hoop.x - hoop.dir * 6;
      if (p.input) { const mv = Math.hypot(c.mx, c.my); }
      if (!p.input) { const d = Math.hypot(tx - p.x, hoop.y - p.y) || 1; const sp = speedOf(p) * 1.3; p.vx = approach(p.vx, (tx - p.x) / d * sp, 1500 * dt); p.vy = approach(p.vy, (hoop.y - p.y) / d * sp, 1500 * dt); if (d < 8) { p.vx *= .5; p.vy *= .5; } }
      else { p.vx = approach(p.vx, c.mx * speedOf(p) * 1.2, 1200 * dt); p.vy = approach(p.vy, c.my * speedOf(p) * 1.1, 1200 * dt); }
      if (c.shoot.pressed) a.press = a.t;
      p.facing = hoop.dir > 0 ? 0 : PI;
      if (a.t >= a.delay || B.state === 'loose' || B.state === 'held') {
        if (B.state === 'pass' && B.oop && B.oop === p) { startOopLeap(p, a.press !== undefined && Math.abs(a.press - a.delay) < .3); }
        else p.act = null;
      }
      break; }
    default: p.act = null;
  }
}

/* ---- shooting ---- */
function startJump(p) {
  const V = tune('jumpShotVz') * (isMoon() ? 1.18 : 1) * (1 + (p.r.swat - 5) * .01);
  p.vz = V; p.act = { type: 'shot', t: 0, V, released: false }; sfx('jump', { vol: .6 });
  p.vx *= .5; p.vy *= .5;
}
function shotChance(p, d, three, q, contest) {
  const base = d < 30 ? .93 : d < 60 ? .8 : d < 100 ? .66 : d < 136 ? .56 : d < 180 ? .42 : d < 240 ? .27 : .15;
  let r = three ? (.70 + .06 * p.r.deep) : (.78 + .045 * p.r.splash);
  let ch = base * r * q * tune('shotBase') - contest * tune('contestPenalty');
  if (novaOf(p)) ch = Math.max(ch, .78) * 1.15;
  if (p.pu === 'rocket') ch += .05;
  return clamp(ch, .03, .97);
}
function releaseShot(p, s, early) {
  const B = S.ball, M = S.match, hoop = attackHoop(p.team), d = hoopDist(p, hoop);
  const three = d > THREE_R + 6 && !(Math.abs(p.x - hoop.x) < 56 && false);
  const perfect = s < .2, q = perfect ? tune('perfectBonus') : s < .45 ? 1 : s < .8 ? .85 : .7;
  let contest = 0;
  for (const o of opps(p)) { const od = Math.hypot(o.x - p.x, o.y - p.y); if (od < 44) contest = Math.max(contest, (1 - od / 44) * (o.z > 6 ? 1.25 : 1) * (o.pu === 'giant' ? 1.4 : 1)); }
  contest = clamp(contest, 0, 1);
  let ch = shotChance(p, d, three, q, contest);
  const points = three ? tune('threeBonus') : 2;
  const make = rnd() < ch;
  B.x = p.x + Math.cos(p.facing) * 4; B.y = p.y; B.z = p.z + 58; B.owner = null; p.hasBall = false; B.state = 'shot'; B.last = p; B.noCatch = {}; B.noCatch[p.slot] = .5;
  B.shot = { shooter: p, points, three, perfect, make, d, t: 0, spot: spotHit(p), contested: contest > .4, dunk: false, rimT: 0 };
  // aim
  let tx = hoop.x, ty = hoop.y, tz = RIM_Z + 1;
  if (make) { tx += (rnd() - .5) * (perfect ? 0 : 3); ty += (rnd() - .5) * (perfect ? 0 : 3); }
  else {
    const mode = rnd();
    if (mode < .4) { const a = rnd() * TAU, rr = 10.5 + rnd() * 4; tx += Math.cos(a) * rr; ty += Math.sin(a) * rr; }
    else if (mode < .7) { tx -= hoop.dir * 14; tz = 88; ty += (rnd() - .5) * 8; } // off the glass
    else { const a = rnd() * TAU, rr = 16 + rnd() * 12; tx += Math.cos(a) * rr; ty += Math.sin(a) * rr; } // short or long
    if (d > 300 && rnd() < .3) { tx = hoop.x + (rnd() - .5) * 60; ty = hoop.y + (rnd() - .5) * 60; B.shot.air = true; }
  }
  const apex = clamp(10 + d * .09 + 14, 18, 44);
  const v = E.arc({ x: B.x, y: B.y, z: B.z }, { x: tx, y: ty, z: tz }, ballG(), { apex });
  B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.scored = false; B.touchedRim = false;
  M.shotClockStop = false;
  p.st.shots = (p.st.shots || 0) + 1;
  emit('release', { p: p.slot, perfect, three, make, d, early });
  sfx('tick', { vol: .0 }); if (perfect) { sfx('perfect'); p.st.perfect++; }
}
const spotHit = p => { if (courtDef().twist !== 'jackpot') return false; const sp = S.twist.spot; return Math.hypot(p.x - sp.x, p.y - sp.y) < 26; };

/* ---- dunks ---- */
function pickDunk(p, oop) {
  const lvl = p.r.slam + (novaOf(p) ? 2 : 0) + (oop ? 1 : 0) + Math.floor(rnd() * 3) - 1;
  const cands = DUNKS.filter(d => d.min <= lvl); return cands[Math.min(cands.length - 1, Math.floor(rnd() * 2) === 0 ? cands.length - 1 : Math.max(0, cands.length - 2))];
}
function startDunk(p, opts = {}) {
  const hoop = attackHoop(p.team), d0 = pickDunk(p, opts.oop), lvl = DUNKS.indexOf(d0);
  const dist = hoopDist(p, hoop), T = clamp(.46 + dist / 300, .5, .9) * (isMoon() ? 1.3 : 1) * (1 + (d0.h - 1) * .3);
  p.act = { type: 'dunk', t: 0, T: opts.T || T, x0: p.x, y0: p.y, tx: hoop.x - hoop.dir * 5, ty: hoop.y, dunk: d0, H: (14 + 20 * d0.h + 4 * lvl) * (isMoon() ? 1.5 : 1), rel: false, oop: !!opts.oop, rejected: false, perfect: !!opts.perfect, f0: p.facing, zEnd: 34 };
  p.turbo = Math.max(0, p.turbo - .15); p.vx = p.vy = 0; p.vz = 0; p.z = Math.max(p.z, .01);
  sfx('jump', { vol: .8 }); emit('dunkStart', { p: p.slot, dunk: d0.id });
}
function startOopLeap(p, perfect) {
  const B = S.ball; B.oop = null;
  const hoop = attackHoop(p.team), a = Math.max(.2, B.oopEta ? B.oopEta : .55);
  startDunk(p, { oop: true, T: clamp(a, .35, .7), perfect });
  p.act.noBall = true;
}
function dunkStep(p, dt) {
  const a = p.act, B = S.ball, M = S.match, u = clamp(a.t / a.T, 0, 1);
  const e = 1 - Math.pow(1 - u, 2);
  const nx = lerp(a.x0, a.tx, e), ny = lerp(a.y0, a.ty, e);
  p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt;
  p.x = nx; p.y = ny; p.vx = 0; p.vy = 0;
  const zz = a.zEnd * u + 4 * a.H * u * (1 - u) * (1.1 - u * .1) * (S.match.novaT[p.team] > 0 ? 1.15 : 1);
  p.z = Math.max(0.01, zz); p.vz = 0;
  const hoop = attackHoop(p.team);
  if (a.dunk.spin) p.facing = a.f0 + u * TAU * a.dunk.spin * (p.team ? -1 : 1) * 0.5 + (u > .8 ? 0 : 0);
  if (u > .8) p.facing = hoop.dir > 0 ? 0 : PI;
  // the ball rides in the hands
  if (!a.noBall && B.owner === p) { B.x = p.x + Math.cos(p.facing) * 3; B.y = p.y + .1; B.z = p.z + 60 + (u > .6 ? 8 : 0); }
  if (a.noBall && !a.caught && u > .62) { a.caught = true; const bb = B; if (bb.state === 'pass' && bb.oop === null || bb.state === 'pass') { giveBall(p); B.x = p.x; B.y = p.y; B.z = p.z + 62; emit('alleyoop', { p: p.slot, mate: p.mate }); } }
  // a defender in the air can reject it
  if (!a.rejected && u > .45 && u < .8) {
    for (const o of opps(p)) if (o.z > 8 && Math.hypot(o.x - p.x, o.y - p.y) < 22 && Math.abs((o.z + 55) - (p.z + 60)) < 24) {
      const ch = tune('dunkReject') * (o.r.swat + 1) / (o.r.swat + p.r.slam + 2) * 2 * (o.pu === 'giant' ? 1.5 : 1) * (novaOf(p) ? .3 : 1);
      if (rnd() < ch) { a.rejected = true; rejectBy(o, p); return; }
    }
  }
  if (!a.rel && u >= .84 && B.owner === p) {
    a.rel = true; B.owner = null; p.hasBall = false; B.state = 'shot'; B.x = hoop.x; B.y = hoop.y; B.z = RIM_Z + 10; B.vx = 0; B.vy = 0; B.vz = -260; B.scored = false; B.last = p;
    B.shot = { shooter: p, points: 2, three: false, perfect: a.perfect, make: true, dunk: a.dunk, d: 0, t: 0, spot: false, oop: a.oop, contested: false };
    M.shotClockStop = false; rimShake(hoop, 1);
    hitFx(hoop.x, hoop.y, RIM_Z, 1.6, '#ffd36a');
  }
  if (u >= 1) {
    // hang on the rim, then drop
    p.act = null; p.vz = -40; p.vx = -hoop.dir * 30; p.cheer = .8;
    if (a.dunk.nova || novaOf(p) || a.dunk.min >= 8) shatterBoard(hoop);
  }
}
function rejectBy(o, p) {
  const B = S.ball; p.act = null; p.vz = -60; p.stun = .5; p.vx = -Math.cos(p.facing) * 60;
  looseBall(-Math.cos(p.facing) * 150 + (rnd() - .5) * 80, (rnd() - .5) * 140, 160); B.last = o;
  o.st.blocks++; o.st.style += 2; p.cd.jump = .3; emit('block', { p: o.slot, victim: p.slot, dunk: true });
}

/* ---- passing ---- */
function passTo(p, m) {
  const B = S.ball; if (!p.hasBall) return;
  const d = Math.hypot(m.x - p.x, m.y - p.y), spd = 180 + 12 * p.r.dime, tt = d / spd;
  let tx = m.x + m.vx * tt * .8, ty = m.y + m.vy * tt * .8;
  const a = Math.atan2(ty - p.y, tx - p.x);
  B.owner = null; p.hasBall = false; B.state = 'pass'; B.last = p; B.target = m; B.noCatch = {}; B.noCatch[p.slot] = .25; B.shot = null; B.passer = p;
  B.x = p.x + Math.cos(a) * 6; B.y = p.y + Math.sin(a) * 6; B.z = p.z + 34;
  const dist = Math.hypot(tx - B.x, ty - B.y) || 1; B.vx = (tx - B.x) / dist * spd; B.vy = (ty - B.y) / dist * spd; B.vz = 0; B.pz = B.z; B.pTz = m.z + 40; B.pT = 0; B.pDur = dist / spd;
  p.facing = a; p.cd.steal = .2; emit('pass', { p: p.slot, to: m.slot });
  sfx('thud', { vol: .3 });
}
function throwInbound() {
  const M = S.match, ib = M.inbound; if (!ib) return;
  const who = ib.who, m = mateOf(who);
  passTo(who, m); M.inbound.thrown = true; ib.t = 0;
}
function throwOop(p) {
  const B = S.ball, m = mateOf(p), hoop = attackHoop(p.team), d = hoopDist(m, hoop);
  if (d > 330) { passTo(p, m); return; }
  const tx = hoop.x - hoop.dir * 5, ty = hoop.y, tz = RIM_Z + 8;
  const from = { x: p.x + Math.cos(p.facing) * 5, y: p.y, z: p.z + 50 };
  const apex = 40 + Math.min(50, Math.hypot(tx - from.x, ty - from.y) * .12);
  const v = E.arc(from, { x: tx, y: ty, z: tz }, ballG(), { apex });
  B.owner = null; p.hasBall = false; B.state = 'pass'; B.last = p; B.target = m; B.oop = m; B.oopEta = v.t; B.noCatch = {}; B.noCatch[p.slot] = .3; B.shot = null; B.passer = p;
  B.x = from.x; B.y = from.y; B.z = from.z; B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.pz = null;
  const runT = clamp(v.t - .55, 0, 2);
  m.act = { type: 'oopwait', t: 0, delay: runT, press: undefined };
  p.cd.steal = .2; emit('pass', { p: p.slot, to: m.slot, oop: true });
}

/* ---- defense: steal, shove, spin, block ---- */
function startSwipe(p) {
  p.act = { type: 'swipe', t: 0, dur: .34, done: false }; p.cd.steal = .55 + .3 * (1 - clamp(tune('cpuSkill'), .4, 1.2) * 0); sfx('swipe');
}
function swipeHit(p) {
  const B = S.ball, h = B.owner, reach = (14 + .6 * p.r.swipe) * reachBonus(p) + 6;
  if (h && h.team !== p.team) {
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    const dir = Math.atan2(h.y - p.y, h.x - p.x), face = angAbs(dir, p.facing);
    if (d < reach && face < 1.5 && h.immune <= 0 && !(h.act && h.act.type !== 'shot')) {
      const behind = Math.cos(h.facing - p.facing) > .3 ? 1.3 : 1;
      const ch = tune('stealChance') * (.55 + .09 * p.r.swipe) / (.55 + .07 * h.r.dime) * behind * (novaOf(h) ? .5 : 1) * clamp(1 - Math.abs(p.z) / 80, .5, 1);
      if (rnd() < ch) { p.st.steals++; p.st.style += 1; h.hasBall = false; h.stun = Math.max(h.stun, .25); giveBall(p); emit('steal', { p: p.slot, victim: h.slot }); hitFx(h.x, h.y, 40, 1, '#aef'); return; }
    }
    return;
  }
  // loose ball swat/grab
  if (!h && (B.state === 'loose' || B.state === 'dead')) { const d = Math.hypot(B.x - p.x, B.y - p.y); if (d < reach + 4 && B.z < 70) { giveBall(p); } }
}
function startShove(p, c) {
  p.act = { type: 'shove', t: 0, dur: .3, hit: false }; p.turbo = Math.max(0, p.turbo - .25); p.cd.shove = .8; sfx('swipe', { pitch: .7 });
  if (c && Math.hypot(c.mx, c.my) > .3) p.facing = Math.atan2(c.my, c.mx);
}
function shoveHit(p) {
  let hit = false;
  for (const o of opps(p)) {
    const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
    if (d > 20 * reachBonus(p) || Math.abs(o.z - p.z) > 22 || o.immune > 0 || o.stun > .3) continue;
    const ang = Math.atan2(dy, dx), face = angAbs(ang, p.facing);
    if (face > 1.3) continue;
    knockdown(o, p, Math.cos(ang), Math.sin(ang)); hit = true;
  }
  return hit;
}
function knockdown(o, p, dx, dy) {
  const B = S.ball, force = tune('shoveForce') * (.7 + .06 * p.r.bump) / (.8 + .04 * o.r.bump) * (p.nova ? 1.3 : 1);
  o.vx = dx * force; o.vy = dy * force * .7; o.stun = tune('knockdownTime') * (.75 + .05 * (p.r.bump - o.r.bump) + .25) * (novaOf(o) ? .5 : 1);
  o.stun = clamp(o.stun, .3, 2.2);
  if (o.act && o.act.type === 'dunk') { o.vz = -50; }
  if (o.act && o.act.type === 'shot' && !o.act.released) { }
  o.act = null; o.vz = Math.max(o.vz, 60);
  if (B.owner === o) { o.hasBall = false; looseBall(dx * 90 + (rnd() - .5) * 60, dy * 60 + (rnd() - .5) * 60, 130); B.last = o; B.noCatch[o.slot] = .35; emit('fumble', { p: o.slot }); }
  p.st.shoves++; p.st.style += 1; hitFx(o.x, o.y, 30, 1.3, '#ffb060'); sfx('shove'); sfx('down'); rumble(o, .6, .2);
  game.freeze && game.freeze(.07); emit('shove', { p: p.slot, victim: o.slot });
}
function startSpin(p, c) {
  const m = Math.hypot(c.mx, c.my), dir = m > .2 ? [c.mx / m, c.my / m] : [Math.cos(p.facing), Math.sin(p.facing)];
  p.act = { type: 'spin', t: 0, dur: .42, dx: dir[0], dy: dir[1], sp: speedOf(p) * 1.9, f0: p.facing, dir: dir[0] >= 0 ? -1 : 1 };
  p.turbo = Math.max(0, p.turbo - .2); p.cd.spin = 1.0; p.immune = .42; sfx('swipe', { pitch: 1.4 }); emit('spin', { p: p.slot });
}

/* ---- the ball ---- */
function rimShake(h, a) { h.shake = a; }
function shatterBoard(h) {
  const M = S.match; h.broken = 4.5; M.shatterT = 1.6; sfx('shatter'); sfx('slam');
  S.fx.flash = .9; S.fx.shake = 8; game.shake && game.shake(5);
  try { for (let i = 0; i < 40; i++) P.sparks(h.x - h.dir * 8, h.y + (rnd() - .5) * 40, RIM_Z + 10 + rnd() * 20, 1, null, { color: pick(['#ffffff', '#bfe8ff', '#8ad0ff']) }); } catch (e) { }
  emit('shatter', { hoop: h.side });
  banner('SHATTERED!', { colors: ['#ffffff', '#bfe8ff', '#6ab8ff'], scale: 4, life: 1.8, y: .3 });
}
function scoreBasket(B, hoopIdx) {
  const M = S.match, sh = B.shot; if (!sh) return;
  const p = sh.shooter, hoop = HOOPS[hoopIdx], team = p.team;
  let pts = sh.points; let bonus = '';
  if (sh.spot) { pts += 2; bonus = 'jackpot'; }
  if (B.gold) { pts *= 2; B.gold = false; }
  else if (p.pu === 'gold') { pts *= 2; p.pu = null; bonus = bonus || 'gold'; }
  B.scored = true; rimShake(hoop, .6); hoop.net = 1;
  M.score[team] += pts; p.st.pts += pts; M.qScores[M.qScores.length - 1][team] += pts;
  if (sh.dunk) { p.st.dunks++; p.st.style += 3 + DUNKS.indexOf(sh.dunk); }
  if (sh.three) p.st.threes++; if (sh.perfect) p.st.style += 1;
  // assists
  if (B.passer && B.passer.team === team && B.passer !== p && M.time - (B.passT || 0) < 3) { B.passer.st.assists++; }
  // streaks / supernova
  M.streak[team]++; M.streak[1 - team] = 0; M.runs[team] += pts; M.runs[1 - team] = 0;
  const wasNova = M.novaT[1 - team] > 0; if (wasNova) { M.novaT[1 - team] = 0; emit('supernovaOff', { team: 1 - team }); }
  if (M.streak[team] >= tune('novaStreak') && M.novaT[team] <= 0) { M.novaT[team] = 40; emit('supernovaOn', { team, p: p.slot }); }
  M.lastScorer = team; M.excite = Math.min(1, M.excite + .5);
  const lead = Math.abs(M.score[0] - M.score[1]); M.stats.bigLead = Math.max(M.stats.bigLead, lead);
  emit('basket', { p: p.slot, team, points: pts, three: sh.three, dunk: sh.dunk && sh.dunk.id, perfect: sh.perfect, bonus, oop: sh.oop });
  if (bonus === 'jackpot') emit('jackpot', { p: p.slot });
  // flow
  if (S.mode === 'camp') { M.campT = 1.4; return; }
  M.phase = 'score'; M.deadT = 0;
  if (M.sudden || (M.ot >= 2 && false)) { endGame(); }
}
function updateBall(dt) {
  const B = S.ball, M = S.match, g = ballG();
  B.t += dt; for (const k in B.noCatch) B.noCatch[k] = Math.max(0, B.noCatch[k] - dt);
  // trail
  if (B.state === 'shot' || B.state === 'pass') { B.trail.push([B.x, B.y, B.z]); if (B.trail.length > 8) B.trail.shift(); } else if (B.trail.length) B.trail.shift();
  if (B.state === 'held' && B.owner) { dribbleBall(B.owner, dt); return; }
  if (B.state === 'tip') { return; }
  if (B.state === 'dead' || B.state === 'inboundhold') { return; }
  // wind
  const wind = courtDef().twist === 'wind' ? S.twist.wind : 0;
  const sub = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < 40 || Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) < 40 ? 4 : 1, h = dt / sub;
  for (let s = 0; s < sub; s++) ballPhysics(B, h, g, wind);
  if (B.state === 'shot' && B.shot) {
    B.shot.t += dt;
    if (B.vz < 0 && B.z < 70 && B.scored) { B.state = 'loose'; B.scored = true; }
    // blocks and goaltending
    checkBlocks(B);
  }
  if (B.state === 'pass') {
    B.pT += dt;
    // a pass is a flat throw; it rises slightly with the receiver's height
    if (B.pz !== null && B.pz !== undefined) { const u = clamp(B.pT / Math.max(.05, B.pDur), 0, 1); B.z = lerp(B.pz, B.pTz, u); B.vz = 0; }
    if (B.pT > (B.pDur || 1) + .5 && !B.oop) { B.state = 'loose'; }
    if (B.oop && B.z < 8) { B.oop = null; B.state = 'loose'; }
  }
  tryCatch(B, dt);
  // out-of-court walls (the crowd)
  const wx0 = COURT.x0 - 24, wx1 = COURT.x1 + 24, wy0 = COURT.y0 - 24, wy1 = COURT.y1 + 24;
  if (B.x < wx0) { B.x = wx0; B.vx = Math.abs(B.vx) * .5; } if (B.x > wx1) { B.x = wx1; B.vx = -Math.abs(B.vx) * .5; }
  if (B.y < wy0) { B.y = wy0; B.vy = Math.abs(B.vy) * .5; } if (B.y > wy1) { B.y = wy1; B.vy = -Math.abs(B.vy) * .5; }
  if (B.state === 'loose') { M.looseT += dt; if (M.looseT > 6 && M.phase === 'live') { const n = S.players.slice().sort((a, b) => Math.hypot(a.x - B.x, a.y - B.y) - Math.hypot(b.x - B.x, b.y - B.y))[0]; giveBall(n); M.looseT = 0; } }
}
function ballPhysics(B, h, g, wind) {
  const px0 = B.x, py0 = B.y, pz0 = B.z;
  if (B.state !== 'pass' || B.pz === null || B.pz === undefined) B.vz -= g * h;
  if (B.state === 'pass' && B.oop) { B.vz = B.vz; }
  if (wind) B.vx += wind * 22 * h * (B.z > 20 ? 1 : .2);
  B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h;
  B.roll += (Math.abs(B.vx) + Math.abs(B.vy)) * h * .1;
  // floor
  if (B.z < BALL_R) {
    B.z = BALL_R;
    if (B.vz < -40) { const bn = tune('ballBounce'); B.vz = -B.vz * bn; B.vx *= .94; B.vy *= .94; if (B.vz > 50) sfx('bounce', { vol: clamp(B.vz / 250, .15, .6) }); if (B.state === 'shot' || B.state === 'pass') { B.state = 'loose'; B.shot = B.shot; } }
    else { B.vz = 0; const f = Math.exp(-h * 1.6); B.vx *= f; B.vy *= f; }
  }
  // hoops
  for (let i = 0; i < 2; i++) {
    const hp = HOOPS[i];
    if (hp.broken > 0) { // no backboard
    } else {
      // backboard plane at x = hp.x - hp.dir*12 (court-local 40 and 600)
      const bx = hp.x - hp.dir * 12;
      if (B.z > 70 && B.z < 104 && Math.abs(B.y - hp.y) < 26) {
        const sideNow = (B.x - bx) * hp.dir, sidePrev = (px0 - bx) * hp.dir;
        if (sidePrev > 0 && sideNow < BALL_R) { B.x = bx + hp.dir * BALL_R; B.vx = Math.abs(B.vx) * .55 * hp.dir; B.vy *= .9; sfx('thud', { vol: .5 }); rimShake(hp, .4); touchRim(B); }
      }
    }
    // rim: torus
    const dx = B.x - hp.x, dy = B.y - hp.y, rr = Math.hypot(dx, dy);
    if (Math.abs(B.z - RIM_Z) < BALL_R + 2 && rr > 0.001) {
      const qx = hp.x + dx / rr * RIM_R, qy = hp.y + dy / rr * RIM_R, qz = RIM_Z;
      const ex = B.x - qx, ey = B.y - qy, ez = B.z - qz, dd = Math.hypot(ex, ey, ez);
      if (dd < BALL_R + 1.2 && dd > 0.001) {
        const nx = ex / dd, ny = ey / dd, nz = ez / dd, vn = B.vx * nx + B.vy * ny + B.vz * nz;
        if (vn < 0) { const rb = tune('rimBounce'); B.vx -= (1 + rb) * vn * nx; B.vy -= (1 + rb) * vn * ny; B.vz -= (1 + rb) * vn * nz; B.vx *= .95; B.vy *= .95; sfx('rim', { vol: clamp(-vn / 220, .2, .8) }); rimShake(hp, clamp(-vn / 260, .2, 1)); touchRim(B); }
        const push = BALL_R + 1.2 - dd; B.x += nx * push; B.y += ny * push; B.z += nz * push;
      }
    }
    // the basket
    if (!B.scored && pz0 > RIM_Z && B.z <= RIM_Z && B.vz < 0 && Math.hypot(B.x - hp.x, B.y - hp.y) < RIM_R - 1.5 && B.shot) {
      const vzb = B.vz; B.vx *= .55; B.vy *= .55; B.vz *= .6; sfx('swish', { vol: .7 });
      scoreBasket(B, i);
    }
  }
}
function touchRim(B) {
  if (!B.touchedRim && B.shot) { B.touchedRim = true; S.match.shotClock = tune('shotClock'); }
  if (B.shot && !B.scored) { B.shot.rimT++; if (B.shot.rimT >= 1) { /* loose after the first touch for rebounds */ B.noCatch = {}; B.state = B.state === 'shot' ? 'shot' : B.state; } }
}
function checkBlocks(B) {
  const sh = B.shot; if (!sh || B.scored) return;
  for (const o of S.players) {
    if (o.team === sh.shooter.team && o !== sh.shooter) continue;
    if (o === sh.shooter) continue;
    if (o.z <= 4 && !(o.pu === 'giant')) continue;
    const reach = (10 + .8 * o.r.swat + 6) * reachBonus(o);
    const hz = o.z + 58 + (o.pu === 'giant' ? 10 : 0), d = Math.hypot(o.x - B.x, o.y - B.y, (hz - B.z) * .9);
    if (d < reach) {
      const hoop = defendHoop(o.team);
      // goaltending: coming down, near and above the rim
      const gt = B.vz < 0 && Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < 18 + 0 && B.z > RIM_Z + 1 || (B.vz < 0 && Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) < 18 && B.z > RIM_Z + 1);
      if (gt && !novaOf(o) && !(o.tdef.robot)) {
        const hi = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) ? 0 : 1;
        B.shot.points = B.shot.points; B.x = HOOPS[hi].x; B.y = HOOPS[hi].y; B.z = RIM_Z - 1; B.vx = 0; B.vy = 0; B.vz = -120; emit('goaltend', { p: o.slot }); B.scored = false; return;
      }
      if (gt) continue;
      if (B.shot.dunk) continue;
      if (rnd() < tune('blockChance') * (.6 + .05 * o.r.swat) * (sh.shooter.pu === 'giant' ? .7 : 1)) {
        sh.shooter.st.style += 0; o.st.blocks++; o.st.style += 2;
        const dir = Math.atan2(B.y - o.y, B.x - o.x) + (rnd() - .5) * 1.2;
        B.state = 'loose'; B.shot = null; B.vx = Math.cos(dir) * 220; B.vy = Math.sin(dir) * 160; B.vz = 70 + rnd() * 80; B.last = o; B.noCatch[o.slot] = .35;
        hitFx(B.x, B.y, B.z, 1.5, '#9ef'); game.freeze && game.freeze(.08);
        emit('block', { p: o.slot, victim: sh.shooter.slot }); return;
      }
    }
  }
}
function dribbleBall(p, dt) {
  const B = S.ball; const sp = Math.hypot(p.vx, p.vy); p.ph = (p.ph || 0) + dt * (7 + sp * .05);
  const f = p.facing, side = Math.sin(p.phase) * 0;
  if (p.act && p.act.type === 'shot') { B.x = p.x + Math.cos(f) * 3; B.y = p.y + .2; B.z = p.z + 56 + clamp(p.vz * 0.02, -2, 6); B.vx = B.vy = B.vz = 0; return; }
  if (p.act && p.act.type === 'dunk') return;
  if (p.z > 1) { B.x = p.x + Math.cos(f) * 4; B.y = p.y; B.z = p.z + 52; return; }
  const phase = (p.ph % 1), b = Math.abs(Math.sin(phase * PI));
  const lead = 9 + Math.min(4, sp * .03);
  B.x = p.x + Math.cos(f) * lead; B.y = p.y + Math.sin(f) * lead * .6 + 3;
  const prevZ = B.z; B.z = 4.5 + b * 26;
  if (prevZ > B.z + .01 && B.z < 6 && (B.t - (B.lastBounce || 0)) > .15) { B.lastBounce = B.t; if (M_isLive()) sfx('dribble', { vol: .3 }); }
  if (p.stun > 0 || p.immune > 0 && p.act && p.act.type === 'spin') { B.z = 30; }
  B.vx = p.vx; B.vy = p.vy; B.vz = 0;
}
const M_isLive = () => S.match && (S.match.phase === 'live');

function tryCatch(B, dt) {
  const M = S.match;
  if (!(B.state === 'loose' || B.state === 'pass' || B.state === 'shot' && (B.touchedRim || B.shot && B.shot.t > .3 && B.z < 62 && B.vz < 0 && B.shot.d > 400))) return;
  if (M.phase !== 'live' && M.phase !== 'inbound' && M.phase !== 'camp') return;
  let best = null, bd = 1e9;
  for (const p of S.players) {
    if (p.stun > 0 || p.frozen > 0 || (B.noCatch[p.slot] || 0) > 0 || p.act && (p.act.type === 'dunk' && !p.act.noBall || p.act.type === 'shot' || p.act.type === 'spin')) continue;
    const rad = (8 + (p.z > 4 ? 4 : 0)) * reachBonus(p), dz = B.z - (p.z + 30);
    const d = Math.hypot(B.x - p.x, B.y - p.y);
    const zMax = (p.z > 4 ? 66 : 50) + (reachBonus(p) > 1 ? 14 : 0);
    if (d < rad && B.z >= p.z - 2 && B.z <= p.z + zMax) {
      const sp = Math.hypot(B.vx, B.vy, B.vz);
      if (B.state === 'shot' && !B.touchedRim) continue;
      // a pass can be caught by its target easily; others need a better chance
      let ok = true;
      if (B.state === 'pass' && B.target !== p) ok = rnd() < (.35 + .06 * p.r.swipe) * .08 * 8 && p.team !== (B.last ? B.last.team : -1);
      if (B.state === 'pass' && p.team === (B.last ? B.last.team : -1) && B.target !== p) ok = false;
      if (ok && d < bd) { best = p; bd = d; }
    }
  }
  if (best) {
    const wasPass = B.state === 'pass', pas = B.passer, tgt = B.target, last = B.last;
    giveBall(best);
    if (wasPass && tgt !== best && last && last.team !== best.team) { best.st.steals++; emit('steal', { p: best.slot, victim: last.slot, pass: true }); }
    else if (wasPass && pas && pas.team === best.team) { B.passT = M.time; B.passer = pas; }
    else if (!wasPass && last && last.team !== best.team && B.touchedRim) emit('rebound', { p: best.slot });
    if (M.phase === 'inbound') { M.phase = 'live'; M.inbound = null; }
    if (best.vz > 0 || best.z > 4) { }
  }
}

/* ---- match flow ---- */
function startTip() {
  const M = S.match, B = S.ball, a = S.players[0], b = S.players[2];
  resetPositions();
  a.x = COURT.cx - 14; a.y = COURT.cy; b.x = COURT.cx + 14; b.y = COURT.cy; a.facing = 0; b.facing = PI;
  const m1 = S.players[1], m2 = S.players[3]; m1.x = COURT.cx - 70; m1.y = COURT.cy - 40; m2.x = COURT.cx + 70; m2.y = COURT.cy + 40;
  M.phase = 'tip'; M.tip = { t: 0, jumpers: [a, b], jumpT: {}, done: false, T: .9 };
  B.state = 'tip'; B.owner = null; B.x = COURT.cx; B.y = COURT.cy; B.z = 20; B.vx = B.vy = B.vz = 0; B.shot = null;
  S.players.forEach(p => p.hasBall = false);
  emit('tipoff', { a: a.slot, b: b.slot });
}
function tipStep(dt) {
  const M = S.match, B = S.ball, T = M.tip; T.t += dt;
  B.z = 20 + 100 * Math.sin(clamp(T.t / (T.T * 2), 0, 1) * PI); B.x = COURT.cx; B.y = COURT.cy;
  for (const p of T.jumpers) {
    if (!p.input && T.jumpT[p.slot] === undefined) {
      if (!p.ai.tipT) p.ai.tipT = .62 + (rnd() - .5) * .5 / clamp(tune('cpuSkill') * DIFF[M.difficulty], .4, 1.8) + .05;
      if (T.t >= p.ai.tipT && p.z <= 0) { p.vz = tune('jumpShotVz') * 1.1; T.jumpT[p.slot] = T.t; sfx('jump'); }
    }
  }
  if (T.t >= T.T && !T.done) {
    T.done = true;
    const err = p => T.jumpT[p.slot] === undefined ? 9 : Math.abs(T.jumpT[p.slot] - (T.T - .28));
    const w = err(T.jumpers[0]) <= err(T.jumpers[1]) ? T.jumpers[0] : T.jumpers[1];
    M.arrow = 1 - w.team;
    const m = mateOf(w);
    B.state = 'pass'; B.last = w; B.target = m; B.noCatch = {}; B.noCatch[w.slot] = .5; B.passer = w; B.pz = null;
    const v = E.arc({ x: B.x, y: B.y, z: B.z }, { x: m.x, y: m.y, z: 34 }, ballG(), { apex: 10 }); B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.pDur = v.t;
    M.phase = 'live'; M.possession = w.team; M.shotClock = tune('shotClock'); sfx('tip'); M.tip = null;
    emit('tipwon', { p: w.slot });
  }
}
function startInbound(team, x, y, who) {
  const M = S.match, B = S.ball, tm = S.players.filter(p => p.team === team);
  const ib = who || tm.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  ib.x = x; ib.y = y; ib.vx = ib.vy = 0; ib.act = null; ib.stun = 0; ib.z = 0; ib.vz = 0; ib.facing = x < COURT.cx ? 0 : PI;
  if (Math.abs(x - COURT.cx) < 40) ib.facing = team === 0 ? 0 : PI;
  const mate = mateOf(ib); mate.x = clamp(x + (team === 0 ? 1 : -1) * 90, COURT.x0 + 20, COURT.x1 - 20); mate.y = COURT.cy + (mate.y > COURT.cy ? 40 : -40);
  giveBall(ib); B.state = 'held'; M.possession = team; M.shotClock = tune('shotClock');
  M.phase = 'inbound'; M.inbound = { who: ib, t: 0, thrown: false, x, y };
  // opponents stay clear
  for (const o of S.players.filter(p => p.team !== team)) { const d = Math.hypot(o.x - x, o.y - y); if (d < 30) { const a = Math.atan2(o.y - y, o.x - x) || 0; o.x = x + Math.cos(a) * 34; o.y = y + Math.sin(a) * 34; } }
  emit('inbound', { p: ib.slot });
}
function afterBasket() {
  const M = S.match, scorer = M.lastScorer, team = 1 - scorer, h = defendHoop(team);
  const bx = h.side === 0 ? COURT.x0 - 10 : COURT.x1 + 10;
  startInbound(team, bx, COURT.cy);
}
function endQuarter() {
  const M = S.match; M.buzzer = false; sfx('buzzer'); emit('quarterEnd', { q: M.quarter });
  M.phase = 'break'; M.breakT = M.quarter === 2 ? 8 : 5; M.breakKind = M.quarter === 2 ? 'half' : 'quarter';
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; B.owner = null; } B.state = 'dead';
  if (S.cfg && S.cfg.hub) M.breakT = 2;
  if (M.quarter >= 4 || M.ot > 0) {
    if (M.score[0] !== M.score[1] || (S.cfg && S.cfg.noOT)) { endGame(); return; }
    // overtime
    M.ot++; M.breakKind = 'ot'; M.breakT = 4; M.qLen = 60; if (M.ot >= 3) { M.sudden = true; M.breakKind = 'sudden'; emit('sudden', {}); } else emit('overtime', {});
    M.qScores.push([0, 0]);
    return;
  }
  if (M.quarter === 2) emit('halftime', {});
  M.qScores.push([0, 0]);
}
function nextQuarter() {
  const M = S.match;
  if (M.breakKind === 'ot' || M.breakKind === 'sudden') { M.quarter++; M.clock = M.sudden ? 600 : 60; }
  else { M.quarter++; M.clock = M.qLen; }
  M.shotClock = tune('shotClock');
  const team = M.arrow; M.arrow = 1 - M.arrow;
  resetPositions();
  startInbound(team, COURT.cx, COURT.y0 - 6);
  emit('quarterStart', { q: M.quarter });
}
function endGame() {
  const M = S.match; if (M.over) return;
  M.over = true; M.phase = 'end'; M.endT = 0; M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; } B.owner = null; B.state = 'dead';
  S.players.forEach(p => { p.cheer = p.team === M.winner ? 99 : 0; p.act = null; });
  emit('gameEnd', { winner: M.winner, score: M.score.slice() });
}
function mvpOf() { let best = S.players[0], bs = -1; for (const p of S.players) { const s = p.st.pts * 2 + p.st.style * 3 + p.st.blocks * 4 + p.st.steals * 4 + p.st.assists * 3; if (s > bs) { bs = s; best = p; } } return best; }

function twistStep(dt) {
  const T = S.twist, M = S.match, kind = courtDef().twist; T.t += dt;
  if (kind === 'wind') { T.windT = (T.windT || 0) - dt; if (T.windT <= 0) { T.windT = 4 + rnd() * 5; T.windTarget = (rnd() - .5) * 2.2; } T.wind = approach(T.wind, T.windTarget, dt * .5); }
  if (kind === 'jackpot') { T.spot.t += dt; if (T.spot.t > 14) { T.spot.t = 0; const x = COURT.cx + (rnd() < .5 ? -1 : 1) * (120 + rnd() * 90), y = COURT.y0 + 40 + rnd() * (CH - 80); T.spot.x = x; T.spot.y = y; } }
  if (kind === 'puddle' && !T.puddles.length) T.puddles = [{ x: COURT.cx - 120, y: COURT.cy + 50, r: 22 }, { x: COURT.cx + 110, y: COURT.cy - 60, r: 24 }, { x: COURT.cx, y: COURT.cy + 85, r: 18 }];
}
function powerupStep(dt) {
  const M = S.match;
  if (S.mode === 'camp') return;
  M.powerT -= dt;
  if (M.powerT <= 0 && S.powerups.length < 2 && (M.phase === 'live')) {
    M.powerT = tune('powerupEvery') * (.8 + rnd() * .5); const pu = POWERUPS[Math.floor(rnd() * POWERUPS.length)];
    S.powerups.push({ id: pu.id, x: COURT.x0 + 140 + rnd() * (CW - 280), y: COURT.y0 + 40 + rnd() * (CH - 80), t: 0, life: 14 }); emit('powerupSpawn', { id: pu.id });
  }
  for (const u of S.powerups) {
    u.t += dt; u.life -= dt;
    for (const p of S.players) if (!u.taken && Math.hypot(p.x - u.x, p.y - u.y) < 13 && p.z < 12) { u.taken = true; grantPower(p, u.id); }
  }
  S.powerups = S.powerups.filter(u => !u.taken && u.life > 0);
}
function grantPower(p, id) {
  const def = POWERUPS.find(q => q.id === id); sfx('power');
  if (id === 'freeze') { const o = opps(p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; o.frozen = def.dur; o.vx = o.vy = 0; sfx('freeze'); if (S.ball.owner === o && rnd() < .5) { o.hasBall = false; looseBall(0, 0, 80); } emit('powerupPick', { p: p.slot, id, victim: o.slot }); return; }
  p.pu = id; p.puT = def.dur; if (id === 'gold') S.ball.gold = false; emit('powerupPick', { p: p.slot, id });
}

/* ---- the whole step ---- */
function matchStep(dt, cmdFor) {
  const M = S.match; if (!M) return;
  M.time += dt; M.excite = Math.max(0, M.excite - dt * .08);
  if (M.phase === 'camp') { M.time = M.time; }
  const cmds = S.players.map(p => cmdFor(p));
  // shatter pause: the world freezes briefly
  if (M.shatterT > 0) { M.shatterT -= dt; for (const h of HOOPS) { if (h.broken > 0) { } } return; }
  for (let i = 0; i < 4; i++) playerStep(S.players[i], cmds[i], dt);
  // separation
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = S.players[i], b = S.players[j]; if ((a.act && a.act.type === 'dunk') || (b.act && b.act.type === 'dunk')) continue;
    if (Math.abs(a.z - b.z) > 30) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 12;
    if (d < m && d > .001) { const push = (m - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
  for (const h of HOOPS) { h.shake = Math.max(0, (h.shake || 0) - dt * 1.4); h.net = Math.max(0, (h.net || 0) - dt * 1.2); if (h.broken > 0) { h.broken -= dt; } }
  twistStep(dt);
  switch (M.phase) {
    case 'tip': tipStep(dt); break;
    case 'live': {
      updateBall(dt);
      if (!S.cheats.noClock) {
        const b = S.ball;
        if (M.clock > 0) M.clock -= dt;
        if (b.owner || b.state !== 'dead') { if (b.owner || b.state === 'loose') M.shotClock -= dt * (b.state === 'loose' ? .5 : 1); }
        if (M.clock <= 0) {
          M.clock = 0;
          if (!(b.state === 'shot' && !b.scored && b.shot && b.z > 30 && b.shot.t < 3)) { if (M.phase === 'live') endQuarter(); }
        } else if (M.shotClock <= 0 && b.owner) {
          emit('shotClockViolation', { team: b.owner.team }); sfx('buzzer'); const tm = 1 - b.owner.team; const w = b.owner; w.hasBall = false;
          startInbound(tm, COURT.cx + (rnd() < .5 ? -1 : 1) * 100, COURT.y0 - 6);
        }
      }
      break; }
    case 'score': {
      updateBall(dt); M.deadT += dt;
      if (M.deadT > 1.2) afterBasket();
      break; }
    case 'inbound': {
      updateBall(dt); const ib = M.inbound; if (!ib) { M.phase = 'live'; break; }
      ib.t += dt;
      // the inbounder's rig: hold ball
      if (!ib.thrown && S.ball.owner === ib.who) { S.ball.x = ib.who.x + Math.cos(ib.who.facing) * 6; S.ball.y = ib.who.y; S.ball.z = ib.who.z + 50; }
      if (!ib.who.input && ib.t > .6 && !ib.thrown) throwInbound();
      if (ib.who.input && ib.t > 3 && !ib.thrown) throwInbound();
      for (const o of S.players.filter(p => p.team !== ib.who.team)) { const d = Math.hypot(o.x - ib.x, o.y - ib.y); if (d < 24 && d > .01) { o.x = ib.x + (o.x - ib.x) / d * 24; o.y = ib.y + (o.y - ib.y) / d * 24; } }
      if (ib.thrown && ib.t > 2.5) { M.phase = 'live'; M.inbound = null; }
      if (ib.thrown && S.ball.owner && S.ball.owner.team === ib.who.team && S.ball.owner !== ib.who) { M.phase = 'live'; M.inbound = null; }
      break; }
    case 'break': {
      M.breakT -= dt; if (M.breakT <= 0) nextQuarter(); break; }
    case 'end': M.endT += dt; break;
    case 'camp': updateBall(dt); if (M.campT > 0) { M.campT -= dt; if (M.campT <= 0 && typeof lessonSetup === 'function') lessonSetup(); } break;
  }
  powerupStep(dt);
  // clock stops on baskets etc; streak bookkeeping
  for (let t = 0; t < 2; t++) if (M.novaT[t] > 0) { M.novaT[t] -= dt; if (M.novaT[t] <= 0) emit('supernovaOff', { team: t }); }
  const lead = M.score[0] - M.score[1]; M.stats.lead = lead;
}
