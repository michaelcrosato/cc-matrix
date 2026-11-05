/* 31-player: a player on the court ("baller"): its rig, ratings, body, turbo, juice, heat and Supernova, power-up,
 * stats, and the input source that writes its command each step (a local device, a CPU brain, the network, a script).
 * The match never reads a device directly: every slot reads a command from its source. */
const blankCmd = () => ({ mx: 0, my: 0, shootD: false, shootP: false, shootR: false, passP: false, turboD: false, shoveP: false, oopP: false, tauntP: false });
const ratingF = {
  zoom: r => .86 + .028 * r, splash: r => .78 + .045 * r, deep: r => .70 + .06 * r, slam: r => .75 + .05 * r,
  swipe: r => .55 + .09 * r
};
/** a Humanoid dressed as a player of a team: jersey, trim, shorts and socks, sneakers, hair; the pose layer installed */
function dressPlayer(def, teamId, extra = {}) {
  const t = get('team', teamId || def.team), C = t.colors, R = def.rig, o = {
    size: R.size, build: R.build, weapon: null, outfit: 'shirt', sleeves: 'none', hair: R.hair, hat: R.hat || null, hunch: R.hunch || 0,
    shorts: { len: .55, sock: C.sock, sockLen: .35 }, eyeGlow: R.robot ? R.eye : null, face: R.gorilla ? { eyes: 'big', bangs: 0 } : undefined,
    colors: { skin: R.skin, hair: R.hairColor, cloth: C.jersey, trim: C.trim, pants: C.shorts, boot: C.sneaker, belt: C.shorts, glove: R.glove || R.skin }
  };
  if (R.legs) { o.legUpper = 7.4 * R.legs; o.legLower = 7.4 * R.legs; o.hipZ = 14.3 * R.legs; }
  const rig = new E.Humanoid(Object.assign(o, extra));
  rig.bb = { pose: null, w: 0, def, shades: !!R.shades, robot: !!R.robot, headR: rig.o.headR };
  installPoseLayer(rig);
  return rig;
}
/** a rig for a story character (CAST) */
function castRig(id) { const c = CAST[id]; const rig = new E.Humanoid(Object.assign({ weapon: null }, c.rig)); rig.bb = { pose: null, w: 0, headR: rig.o.headR }; installPoseLayer(rig); return rig; }

class Baller {
  constructor(slot, team, def, teamId) {
    this.slot = slot; this.team = team; this.def = def; this.id = def.id; this.r = def.ratings; this.teamId = teamId;
    this.rig = dressPlayer(def, teamId);
    this.x = CMX; this.y = CMY; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.facing = team === 0 ? 0 : PI;
    this.state = 'run'; this.st = 0; this.cmd = blankCmd(); this.source = null; this.human = null;
    this.turbo = 1; this.turboIdle = 0; this.juice = 1; this.heat = 0; this.nova = 0; this.novaBaskets = 0;
    this.cd = { steal: 0, shove: 0, spin: 0, catch: 0, jump: 0, squeak: 0 }; this.windup = 0; this.act = null; this.holdT = 0; this.kdT = .8; this.landK = 1; this.flashT = 0; this.hangT = 0;
    this.jump = null; this.dunk = null; this.kd = 0; this.dizzy = 0; this.clip = null; this.clipT = 0; this.clipX = {};
    this.dribble = { ph: 0, side: 1, cross: 0 }; this.ballAt = null; this.hasBallT = 0; this.knocks = []; this.rebootT = 0; this.overclock = 0;
    this.pu = null; this.call = 0; this.order = null; this.ghostT = 0; this.landT = 0; this.slip = 0;
    this.stats = { PTS: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, DNK: 0, REB: 0, AST: 0, STL: 0, BLK: 0, KD: 0, SHT: 0, NOVA: 0 };
    this.brain = null;
  }
  get name() { return this.def.name; }
  get mate() { return S.players.find(q => q.team === this.team && q !== this); }
  get foes() { return S.players.filter(q => q.team !== this.team); }
  get has() { return S.ball && S.ball.state === 'held' && S.ball.owner === this; }
  get size() { return this.def.rig.size; }
  /** the juice factor and rating factors */
  jf() { return .85 + .15 * this.juice; }
  f(k) { return ratingF[k](this.r[k]) * this.jf(); }
  /** how high this player's hands reach standing (arms up), world units */
  reach() { const o = this.rig.o; return (o.hipZ + o.torso + (o.armUpper + o.armLower) * .95) * o.size; }
  shoulderZ() { const o = this.rig.o; return (o.hipZ + o.torso) * o.size; }
  onFloor() { return this.z <= .01 && !['air', 'dunk', 'hang'].includes(this.state); }
  /** can this player be controlled right now (not knocked down, frozen, flying a dunk...) */
  free() { return this.state === 'run' || this.state === 'cele' || this.state === 'taunt'; }
  isNova() { return this.nova > 0 || this.overclock > 0 || (S.cheats.novaHome && this.team === 0) || (S.cheats.novaAway && this.team === 1); }
  infTurbo() { const c = S.cheats.infTurbo; return this.isNova() || c === 'all' || (c === 'p1' && this.human === 0) || (c === 'team' && S.cheats.infTurboTeam === this.team) || !!(S.attract && S.attract.cheat); }
  setState(s) { this.state = s; this.st = 0; }
}
/* ---- input sources ---- */
/** a local device: game.players[i] (P1..P4), read as a command; the screen direction it pushes becomes a ground direction */
function localSource(input) {
  return { kind: 'local', input, read(p) {
    const I = input, c = blankCmd(), m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
    c.mx = d[0]; c.my = d[1];
    c.shootD = I.down('shoot'); c.shootP = I.pressed('shoot'); c.shootR = I.released('shoot');
    c.passP = I.pressed('pass'); c.turboD = I.down('turbo'); c.shoveP = I.pressed('shove'); c.oopP = I.pressed('oop'); c.tauntP = I.pressed('taunt');
    if (c.turboD && c.passP && !p.has && !(S.ball && S.ball.owner && S.ball.owner.team === p.team)) { c.passP = false; c.shoveP = true; }   // turbo + pass without the ball also shoves
    return c;
  } };
}
/** a CPU brain (34-ai) */
function cpuSource() { return { kind: 'cpu', read(p, dt) { return aiThink(p, dt); } }; }
/** a scripted list of commands by time (tests, attract) */
function scriptSource(steps) { let t = 0; return { kind: 'script', read(p, dt) { t += dt; const c = blankCmd(); for (const [t0, t1, o] of steps) if (t >= t0 && t < t1) Object.assign(c, o); return c; } }; }
function setSource(p, src) { p.source = src; if (src.kind !== 'local') p.human = null; }

/* ---- movement, turbo, juice: a player's body each step ---- */
function moveSpeed(p) {
  let sp = tune('runSpeed') * p.f('zoom');
  if (p.turboOn) sp *= tune('turboMult');
  if (p.pu && p.pu.id === 'rocket') sp *= 1.4;
  if (p.has) sp *= .96;
  return sp;
}
function locomote(p, c, dt, k = 1) {
  const m = Math.min(1, Math.hypot(c.mx, c.my)), sp = moveSpeed(p) * k, onOil = TWIST.oil && onSlick(p.x, p.y);
  const acc = tune('accel') * (onOil ? .15 : 1) * (p.pu && p.pu.id === 'rocket' ? 1.3 : 1);
  const tvx = c.mx * sp, tvy = c.my * sp;
  // a hard turn at speed squeaks (and on an oil slick at turbo speed, may slip)
  const v0 = Math.hypot(p.vx, p.vy);
  if (m > .5 && v0 > 80) {
    const turn = Math.abs(E.angDiff(Math.atan2(p.vy, p.vx), Math.atan2(c.my, c.mx)));
    if (turn > 1.6 && p.cd.squeak <= 0) { p.cd.squeak = .35; sfx('squeak', { vol: .25 }); P.dust(p.x, p.y, 0, 3); if (onOil && p.turboOn && S.rng() < .3) { slipOnOil(p); return; } }
  }
  p.vx = approach(p.vx, tvx, acc * dt); p.vy = approach(p.vy, tvy, acc * dt);
  if (onOil && m < .2) { p.vx *= Math.exp(-dt * .5); p.vy *= Math.exp(-dt * .5); }
  // facing: toward the move; a defender with the ball in front faces the handler (a defensive shuffle)
  const b = S.ball, h = b && b.state === 'held' ? b.owner : null;
  if (h && h.team !== p.team && dist2(p.x, p.y, h.x, h.y) < 70 && !p.has) p.facing = E.approachAng(p.facing, Math.atan2(h.y - p.y, h.x - p.x), dt * 10);
  else if (m > .2) p.facing = E.approachAng(p.facing, Math.atan2(c.my, c.mx), dt * (p.has ? 10 : 14));
}
function turboStep(p, c, dt) {
  const moving = Math.hypot(p.vx, p.vy) > 20;
  p.turboOn = c.turboD && p.turbo > 0.01 && p.state === 'run';
  if (p.infTurbo()) { p.turbo = 1; return; }
  if (c.turboD && moving) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt); p.turboIdle = 0; p.juice = Math.max(0, p.juice - .01 * dt * tune('fatigue')); }
  else if (!c.turboD) {
    p.turboIdle += dt;
    if (p.turboIdle > tune('turboRefillDelay')) { const k = (p.pu && p.pu.id === 'rocket' ? 2 : 1) * (1 + .5 * comebackK(p.team)); p.turbo = Math.min(1, p.turbo + tune('turboRefill') * k * dt); }
  }
}
/** the team trailing gets a little help (PLAN 8, comeback assist): 0..1 */
function comebackK(team) {
  const M = S.match; if (!M || M.quarter < 2 || M.tournament) return 0;
  const d = M.score[1 - team] - M.score[team]; if (d < 4) return 0;
  const c = M.comeback !== undefined ? M.comeback : tune('comeback');
  return c * Math.min(d, 15) / 15;
}
/** walls: invisible, 24 outside the lines */
function clampToArena(p) {
  const r = 6;
  if (p.x < WALL.x0 + r) { p.x = WALL.x0 + r; p.vx = Math.max(0, p.vx); } if (p.x > WALL.x1 - r) { p.x = WALL.x1 - r; p.vx = Math.min(0, p.vx); }
  if (p.y < WALL.y0 + r) { p.y = WALL.y0 + r; p.vy = Math.max(0, p.vy); } if (p.y > WALL.y1 - r) { p.y = WALL.y1 - r; p.vy = Math.min(0, p.vy); }
}
/** players push each other apart (no damage); box-outs: the stronger holds its spot */
function separate(dt) {
  const L2 = S.players;
  for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) {
    const a = L2[i], b = L2[j]; if (a.state === 'dunk' || b.state === 'dunk' || a.state === 'hang' || b.state === 'hang' || a.state === 'knock' || b.state === 'knock') continue;
    if (Math.abs(a.z - b.z) > 30) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 11;
    if (d < min && d > .01) {
      const push = (min - d), ka = a.team !== b.team ? clamp(.5 + (b.r.bump - a.r.bump) * .05, .2, .8) : .5;
      a.x -= dx / d * push * ka; a.y -= dy / d * push * ka; b.x += dx / d * push * (1 - ka); b.y += dy / d * push * (1 - ka);
    }
  }
}
/** juice: knockdowns, turbo and minutes on the court wear a player down; breaks restore it */
function juiceStep(p, dt) { p.juice = Math.max(0, p.juice - .004 * dt * tune('fatigue')); }
