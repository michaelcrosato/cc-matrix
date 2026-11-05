/* BATZOOKA BASEBALL: the simulation. Pure logic, no drawing, no raw input: players act through "intents"
   (BZ.M.intent[side]), so the same sim runs for people, the CPU, tests and the attract mode.
   Coordinates: home plate is (0,0); x east; y negative toward center field; z up. 16 U = one tile. */
const G = BZ.G = {
  BASES: [[0, 0], [212, -212], [0, -424], [-212, -212]], MOUND: [0, -205], SEG: 300, HX: 896, HY: 1214,
  DEF: { P: [0, -200], C: [0, 18], '1B': [196, -232], '2B': [112, -330], '3B': [-196, -232], SS: [-112, -330], LF: [-360, -620], CF: [0, -720], RF: [360, -620] },
  POS: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
  PITCHES: {
    fast: { name: 'FASTBALL', speed: 360, bx: 0, bz: 0, color: '#ffffff' },
    curve: { name: 'CURVEBALL', speed: 262, bx: .35, bz: -1.0, color: '#ffe08a' },
    slider: { name: 'SLIDER', speed: 305, bx: -1.0, bz: -.15, color: '#9ae0ff' },
    change: { name: 'CHANGE-UP', speed: 215, bx: 0, bz: -.4, color: '#c8ffb0' },
    fire: { name: 'FIREBALL', speed: 540, bx: 0, bz: .12, color: '#ff8a30' }
  },
  ORDER: ['fast', 'curve', 'slider', 'change']
};
const BASES = G.BASES;
const fenceCtl = () => BZ.M.parkDef.fence;
const catmull = (p0, p1, p2, p3, t) => .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const thetaOf = (x, y) => Math.atan2(x, -y);
BZ.fenceR = (th, park) => {
  const f = (park || BZ.M.parkDef).fence, a = clamp((th + PI / 4) / (PI / 2), 0, 1) * 4, i = Math.min(3, Math.floor(a)), t = a - i;
  const g = k => f[clamp(k, 0, 4)];
  return catmull(g(i - 1), g(i), g(i + 1), g(i + 2), t) * TUNE.fence;
};
BZ.fenceH = (th, park) => {
  const p = park || BZ.M.parkDef; let h = p.fenceH;
  if (p.megaWall) { const d = th * 180 / PI; if (d > -32 && d < 8) h = lerp(h, 92, clamp(Math.min(d + 32, 8 - d) / 6, 0, 1)); }
  return h;
};
const inFair = (x, y) => y < 0 && Math.abs(x) <= -y + .01;
BZ.inFair = inFair;
const dist2 = (a, b) => hyp(a.x - b.x, a.y - b.y);
const gravity = () => TUNE.gravity * BZ.M.parkDef.gravity;
const bpos = i => BASES[((i % 4) + 4) % 4];
const segPos = p => { // position on the basepath for pos 0..4
  const i = Math.floor(p), t = p - i, a = bpos(i), b = bpos(i + 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};

/* ---------------- match construction ---------------- */
function makeActor(teamDef, i, side) {
  const p = teamDef.players[i];
  return { side, i, name: p.name, pos: p.pos, st: p, x: 0, y: 0, z: 0, vz: 0, facing: -PI / 2, anim: null, animT: 0, anim2: null, speedMul: 1, stun: 0, jump: 0, dive: 0, hasBall: false, tgtX: 0, tgtY: 0, duty: null, cool: 0, run: 0, lefty: p.lefty, cheer: 0, mood: null };
}
BZ.newMatch = (o = {}) => {
  const park = BZ.get('parks', o.park || 'corn'), seed = o.seed || ((Date.now() & 0xffff) + 1);
  BZ.seed(seed);
  const mkSide = (s, spec) => {
    const team = BZ.get('teams', spec.team);
    return { team, actors: team.players.map((_, i) => makeActor(team, i, s)), ctl: spec.ctl || null, human: !!spec.human, meter: spec.meter || 0, turbo: 1, up: spec.up || { bat: 0, legs: 0, arm: 0, meter: 0 }, order: 0,
      stat: { h: 0, hr: 0, k: 0, bb: 0, sb: 0, catches: 0, bz: 0, dp: 0, robs: 0 } };
  };
  const M = BZ.M = {
    seed, parkDef: park, mode: o.mode || 'game', innings: o.innings || 3, inn: 1, half: 0, outs: 0, balls: 0, strikes: 0, score: [0, 0], line: [[], []],
    sides: [mkSide(0, o.away || { team: 'hay' }), mkSide(1, o.home || { team: 'cin' })], intent: [{}, {}], phase: 'intro', t: 0, clock: 0, over: false, winner: -1, runners: [],
    ball: { state: 'none', x: 0, y: -205, z: 0, vx: 0, vy: 0, vz: 0, holder: null, trail: [], bounces: 0, landed: false, fair: null, fire: false, bz: false },
    pitch: null, sel: 0, aim: { u: 0, v: 0 }, cur: { u: 0, v: 0 }, sw: null, swCool: 0, bean: false, steal: false, pendingThrow: [-1, -1, 0, 0], diff: o.diff == null ? TUNE.cpuSkill : o.diff, lesson: o.lesson || null,
    batter: null, result: null, resultT: 0, rhubarb: null, playT: 0, calls: [], events: [], pop: [], shake: 0, atk: 0, derby: null, noBetween: !!o.noBetween, extra: o.extra || {}, hazards: [], lastHit: null, wind: 0, flash: null, hrCount: 0, bestDist: 0, attract: !!o.attract, fx: []
  };
  M.sides.forEach(s => s.actors.forEach(a => { a.x = 0; a.y = 40; }));
  if (o.lesson) BZ.applyLesson(o.lesson);
  BZ.setupHazards();
  BZ.startHalf(true);
  return M;
};
const off = () => BZ.M.sides[BZ.M.half], def = () => BZ.M.sides[1 - BZ.M.half];
BZ.off = off; BZ.def = def;
const fielderOf = (pos) => def().actors.find(a => a.pos === pos);
BZ.fielderOf = fielderOf;

BZ.startHalf = (first) => {
  const M = BZ.M; M.outs = 0; M.balls = 0; M.strikes = 0; M.runners = []; M.aim.u = 0; M.aim.v = 0;
  if (!M.line[M.half][M.inn - 1] && M.line[M.half][M.inn - 1] !== 0) M.line[M.half][M.inn - 1] = 0;
  for (const s of M.sides) for (const a of s.actors) { a.hasBall = false; a.anim = null; a.stun = 0; a.jump = 0; a.dive = 0; a.z = 0; a.vz = 0; a.mood = null; }
  const d = def();
  for (const a of d.actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; a.facing = -PI / 2; a.tgtX = a.x; a.tgtY = a.y; }
  d.actors.find(a => a.pos === 'C').facing = -PI / 2;
  BZ.nextBatter(); M.phase = first ? 'intro' : 'between'; M.t = 0;
  M.ball.state = 'none'; M.ball.holder = null;
  if (M.mode === 'game') BZ.emit('half', { inn: M.inn, half: M.half });
};
BZ.nextBatter = () => {
  const M = BZ.M, o = off(), a = o.actors[o.order % 9];
  M.batter = a; a.x = a.lefty ? 20 : -20; a.y = -2; a.facing = -PI / 2; a.anim = null; a.hasBall = false;
  M.cur.u = 0; M.cur.v = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.steal = false; M.bean = false;
  const p = def().actors.find(x => x.pos === 'P'); M.sel = 0;
  p.x = G.MOUND[0]; p.y = G.MOUND[1] + 6; p.facing = PI / 2; M.ball.state = 'none'; M.ball.holder = null;
  const c = def().actors.find(x => x.pos === 'C'); c.x = 0; c.y = 20; c.facing = -PI / 2;
  // runners stand on their bases
  for (const r of M.runners) { r.pos = Math.round(r.pos); [r.actor.x, r.actor.y] = segPos(r.pos); r.dir = 0; r.origin = r.pos; r.mustReturn = false; r.slide = 0; r.actor.facing = -PI / 2; }
};
const baseRunner = b => BZ.M.runners.find(r => r.state === 'run' && Math.round(r.pos) === b && Math.abs(r.pos - b) < .02);
BZ.baseRunner = baseRunner;
BZ.gain = (side, amt) => {
  const M = BZ.M, s = M.sides[side]; if (!s || M.mode === 'derby') return;
  const was = s.meter; s.meter = clamp(s.meter + amt * TUNE.meterGain * (1 + .12 * s.up.meter), 0, 100);
  if (was < 100 && s.meter >= 100) { BZ.emit('meterfull', { side }); }
};

/* ---------------- pitching ---------------- */
const pitcherSide = () => 1 - BZ.M.half, batterSide = () => BZ.M.half;
BZ.legalPitches = () => { const m = BZ.M, p = def(); return p.meter >= 100 ? G.ORDER.concat(['fire']) : G.ORDER; };
BZ.startWindup = (opt = {}) => {
  BZ.M.stealChecked = false;
  const M = BZ.M, d = def(), P = fielderOf('P'); if (M.phase !== 'setup') return;
  let type = opt.type || G.ORDER[M.sel % 4];
  if (opt.fire && d.meter >= 100) { type = 'fire'; d.meter = 0; BZ.emit('firepitch', { side: 1 - M.half }); BZ.sfx('fire'); }
  M.pitch = { type, aim: { u: opt.u == null ? M.aim.u : opt.u, v: opt.v == null ? M.aim.v : opt.v }, t: -.48, T: 0, aft: { u: 0, v: 0 }, released: false, hbp: !!opt.bean, final: null };
  M.bean = !!opt.bean; M.phase = 'windup'; M.t = 0; P.anim = 'pitch'; P.animT = 0;
  BZ.emit('windup', { type });
};
function releasePitch() {
  const M = BZ.M, p = M.pitch, P = fielderOf('P'), spec = G.PITCHES[p.type];
  const pitchStat = (P.st.pow * .4 + P.st.arm * .6) / 10;
  p.speed = spec.speed * TUNE.pitchSpeed * (.94 + pitchStat * .14);
  p.sx = P.x; p.sy = P.y - 8; p.sz = 26;
  p.T = (p.sy + 6) / p.speed * -1 * -1; p.T = (-6 - p.sy) * -1 / p.speed; p.T = Math.abs(p.sy + 6) / p.speed;
  // break: the ball seems to head to the aim, then breaks late to the final spot
  const dir = P.lefty ? -1 : 1, br = TUNE.breaking * (.7 + pitchStat * .6);
  p.brk = { u: spec.bx * dir * br * (M.batter.lefty ? -1 : 1), v: spec.bz * br };
  // wildness: low-control pitchers miss their spots a little
  const wild = (1 - pitchStat) * .22 * (P.side !== undefined ? 1 : 1);
  p.err = { u: (rnd() - .5) * wild * 2, v: (rnd() - .5) * wild * 2 };
  p.t = 0; p.released = true; M.phase = 'pitch'; M.t = 0; M.swCool = 0;
  M.ball.state = 'pitch'; M.ball.fire = p.type === 'fire'; M.ball.holder = null; M.ball.trail = []; M.ball.bounces = 0; M.ball.landed = false; M.ball.fair = null; M.ball.bz = false;
  P.anim = 'pitchrel'; P.animT = 0;
  BZ.sfx(p.type === 'fire' ? 'fire' : 'pitch');
  BZ.emit('pitch', { type: p.type, speed: p.speed, side: P.side });
}
BZ.pitchUV = (p, t) => { // where the ball is in the strike-zone frame at time t (s = t/T)
  const s = clamp(t / p.T, 0, 1.0), a = p.aim;
  // the pitcher aims where the pitch should CROSS; it heads for a spot offset by the break and bends late into the aim
  const fu = a.u + p.err.u + p.aft.u, fv = a.v + p.err.v + p.aft.v, hu = fu - p.brk.u, hv = fv - p.brk.v;
  return { u: hu * s + p.brk.u * s * s * s, v: hv * s + p.brk.v * s * s * s, fu, fv, s };
};
const zoneToWorld = (u, v) => [u * 9, 22 + v * 15];
BZ.zoneToWorld = zoneToWorld;
BZ.pitchPos = (p, t) => {
  const s = clamp(t / p.T, 0, 1.15), uv = BZ.pitchUV(p, t), w = zoneToWorld(uv.u, uv.v);
  // the ball travels from the release point to the plate, drawn in plate-relative coordinates
  const x = lerp(p.sx, w[0], s), y = lerp(p.sy, -6, s), z0 = lerp(p.sz, 22, s) + (w[1] - 22) * s * s;
  return [x, y, z0 + 0];
};

/* ---------------- batting ---------------- */
BZ.swingNow = (kind = 'normal') => {
  const M = BZ.M; if (M.swCool > 0 || M.sw) return false;
  if (M.phase !== 'pitch' && M.phase !== 'windup') return false;
  const o = off(); let k = kind;
  if (k === 'power') { if (o.meter >= 100) { k = 'bz'; o.meter = 0; M.ball.bz = false; BZ.emit('batzookaswing', { side: M.half }); BZ.sfx('rocket'); } else k = 'normal'; }
  M.sw = { kind: k, t0: M.phase === 'pitch' ? M.pitch.t : -999, start: M.clock, tc: M.phase === 'pitch' ? M.pitch.t + .085 : null };
  if (M.phase === 'windup') { M.sw.t0 = M.pitch.t; M.sw.tc = M.pitch.t + .085; }
  M.batter.anim = k === 'bunt' ? 'bunt' : 'swing'; M.batter.animT = 0; M.batter.swingKind = k;
  BZ.sfx('whiff');
  return true;
};
function resolvePlate() {
  const M = BZ.M, p = M.pitch, sw = M.sw, uv = BZ.pitchUV(p, p.T), bat = M.batter, bs = off();
  M.ball.state = 'catcher';
  const inZone = Math.abs(uv.fu) <= 1.0 && Math.abs(uv.fv) <= 1.0;
  p.final = { u: uv.fu, v: uv.fv, inZone };
  const hbp = M.bean || (Math.abs(uv.fu) > 1.5 && rnd() < .15);
  if (hbp && !sw) return plateResult('hbp');
  if (sw) {
    const k = sw.kind, win = (k === 'bz' ? .17 : k === 'bunt' ? .14 : .105) * TUNE.batWindow * (.9 + bat.st.bat * .025) * (p.type === 'fire' ? .78 : 1) * (1 + .06 * bs.up.bat * 0);
    const terr = (sw.tc || (p.T + 1)) - p.T;
    const cur = M.cur, du = cur.u - uv.fu, dv = cur.v - uv.fv, dd = hyp(du, dv * .9);
    const rad = TUNE.sweet * (k === 'bz' ? 2.4 : k === 'bunt' ? 1.4 : 1) * (.85 + bat.st.bat * .03);
    if (Math.abs(terr) <= win && dd <= rad) return makeContact(k, terr, win, du, dv, dd, rad, uv);
    // swung but missed: strike (or a foul tip when nearly there)
    if (Math.abs(terr) <= win * 1.35 && dd <= rad * 1.5 && k !== 'bunt' && rnd() < .5) return plateResult('foul', { tip: true });
    return plateResult('whiff');
  }
  return plateResult(inZone ? 'called' : 'ball');
}
function makeContact(kind, terr, win, du, dv, dd, rad, uv) {
  const M = BZ.M, b = M.ball, bat = M.batter, bs = off(), e = clamp(-terr / win, -1, 1) /* + = early */;
  const qT = 1 - Math.abs(terr) / win, qZ = 1 - dd / rad, Q = clamp(.52 * qT + .48 * qZ + (qT > .8 && qZ > .6 ? .12 : 0), 0, 1);
  const pw = .78 + bat.st.pow * .042;
  let v, ph, th;
  const pull = bat.lefty ? 1 : -1;
  if (kind === 'bunt') { v = 38 + 62 * (1 - Math.abs(e)) + rr(0, 14); ph = rr(-3, 9) * PI / 180; th = (du * 22 + e * -10 * pull) * PI / 180; }
  else {
    v = (95 + 330 * Math.pow(Q, 1.2)) * pw * TUNE.exitPower * (1 + .06 * bs.up.bat);
    if (kind === 'bz') v = Math.max(v, 330) * TUNE.batzookaPower * (.9 + Q * .3) ;
    ph = (13 + (-dv) * -38 + rr(-4, 4)) * PI / 180;   // cursor below the ball center lifts it; above it tops it
    ph = (14 + (uv.fv - M.cur.v) * 40 + rr(-9, 9) * (1.3 - Q)) * PI / 180;
    if (kind === 'bz') ph = clamp(ph, 16 * PI / 180, 30 * PI / 180);
    th = (pull * e * 44 + (M.cur.u - uv.fu) * -16 + rr(-9, 9) * (1.4 - Q)) * PI / 180;
    if (kind === 'bz') th = clamp(th, -40 * PI / 180, 40 * PI / 180);
    if (Q < .22) { v *= .6; th += rr(-.3, .3); }
  }
  if (M.lessonSpec && M.lessonSpec.setup.forceHit === 'grounder') { ph = rr(-7, 2) * PI / 180; v = rr(200, 270); th = rr(-26, 26) * PI / 180; }
  ph = clamp(ph, -16 * PI / 180, 74 * PI / 180);
  b.x = 0; b.y = -4; b.z = zoneToWorld(uv.fu, uv.fv)[1]; const sp = Math.cos(ph) * v;
  b.vx = Math.sin(th) * sp; b.vy = -Math.cos(th) * sp; b.vz = Math.sin(ph) * v;
  b.state = 'hit'; b.holder = null; b.bounces = 0; b.landed = false; b.fair = null; b.bz = kind === 'bz'; b.fire = kind === 'bz'; b.trail = []; b.hitT = 0; b.peak = 0; b.thetaHit = th; b.wall = false;
  if (M.forceHomer && kind !== 'bunt') { M.forceHomer = false; v = 640; ph = 30 * PI / 180; th = rr(-.15, .15); b.vx = Math.sin(th) * Math.cos(ph) * v; b.vy = -Math.cos(th) * Math.cos(ph) * v; b.vz = Math.sin(ph) * v; }
  M.lastHit = { v, ph, th, Q, kind, e };
  M.playT = 0; M.t = 0; M.phase = 'play'; M.quality = Q;
  BZ.emit('contact', { kind, Q, v, ph, th, bunt: kind === 'bunt', side: M.half, e });
  if (M.lesson && kind === 'bz') BZ.lessonEvent('batzooka');
  BZ.sfx(kind === 'bz' ? 'boom' : 'bat'); BZ.sfx('crack');
  M.shake = Math.max(M.shake, .25 + Q * (kind === 'bz' ? 1.2 : .6));
  startPlay();
}
function plateResult(r, o = {}) {
  const M = BZ.M; M.result = r; M.resultT = 0; M.phase = 'call'; M.t = 0;
  const bs = off(), ds = def();
  const cd = BZ.derby && M.mode === 'derby';
  if (r === 'called') { M.strikes++; BZ.emit('strike', { called: true }); BZ.sfx('strike'); }
  else if (r === 'whiff') { M.strikes++; BZ.emit('whiff', {}); BZ.emit('strike', { swing: true }); BZ.sfx('whiff'); }
  else if (r === 'ball') { M.balls++; BZ.emit('ball', {}); BZ.sfx('ball'); }
  else if (r === 'foul') { if (M.strikes < 2) M.strikes++; BZ.emit('foul', { tip: true }); BZ.sfx('strike'); }
  else if (r === 'hbp') { BZ.emit('hbp', { bean: M.bean }); }
  M.batter.anim = M.batter.anim === 'swing' || M.batter.anim === 'bunt' ? M.batter.anim : null;
  if (M.mode === 'derby') { derbyPitchEnd(r); return; }
  if (M.strikes >= 3) { settleSteal(); return finishAtBat('strikeout'); }
  if (M.balls >= 4) { settleSteal(); return finishAtBat('walk'); }
  if (r === 'hbp') { settleSteal(); return finishAtBat('hbp'); }
  if (M.steal) startStealPlay();
}
function settleSteal() { const M = BZ.M, r = M.steal; if (!r) return; r.stealing = false; r.pos = r.origin + 1; r.origin = r.pos; r.dir = 0; [r.actor.x, r.actor.y] = segPos(r.pos); M.steal = false; }
function startStealPlay() {
  const M = BZ.M, C = fielderOf('C'), b = M.ball;
  M.phase = 'play'; M.playTime = 0; M.stealPlay = true; b.state = 'held'; b.holder = C; C.hasBall = true; C.holdT = 0; b.x = C.x; b.y = C.y; b.z = 14; b.vx = b.vy = b.vz = 0;
  M.batterRun = null; M.caught = false; M.foulDead = false; M.homer = false; M.decided = true; M.throwLog = []; M.manual = [null, null]; M.queued = [-1, -1]; M.primary = C; M.predT = 0; M.fielded = true; M.outsThisPlay = 0;
  for (const a of def().actors) { a.cool = 0; a.duty = null; a.stun = 0; a.jump = 0; a.dive = 0; a.sup = 0; if (a !== C) a.hasBall = false; }
  M.runners.forEach(q => { if (q !== M.steal) { q.origin = Math.round(q.pos); q.dir = 0; } q.mustReturn = false; });
  assignFielders();
}
function stealLogic(ib) {
  const M = BZ.M, o = off();
  if (o.human && o.ctl) { if (ib.steal && !M.steal) BZ.trySteal(); return; }
  if (!M.stealChecked && M.pitch && M.pitch.released) { M.stealChecked = true; if (!M.attract || rnd() < .5) if (rnd() < .035 + .08 * M.diff) BZ.trySteal(); }
  else if (!M.stealChecked && M.phase === 'windup') { M.stealChecked = true; if (rnd() < .03 + .08 * M.diff + (M.attract ? .08 : 0)) BZ.trySteal(); }
}
function finishAtBat(kind) {
  const M = BZ.M, bs = off(), ds = def();
  if (kind === 'strikeout') {
    M.outs++; ds.stat.k++; BZ.gain(1 - M.half, 14); BZ.emit('strikeout', { batter: M.batter, side: M.half }); if (M.lesson) BZ.lessonEvent('strikeout');
    M.batter.anim = 'sulk'; M.batter.animT = 0;
    return endAtBat(false);
  }
  if (kind === 'walk' || kind === 'hbp') {
    bs.stat.bb++; BZ.emit('walk', { batter: M.batter, hbp: kind === 'hbp' });
    if (kind === 'hbp' && M.bean) { startRhubarb(); return; }
    forceWalkRunners();
    return endAtBat(true);
  }
}
function forceWalkRunners() {
  const M = BZ.M, b = M.batter;
  // the batter takes first; runners forced ahead of him advance one base
  const at = n => M.runners.find(r => r.state === 'run' && Math.round(r.pos) === n);
  const r1 = at(1), r2 = at(2), r3 = at(3);
  if (r1 && r2 && r3) { scoreRunner(r3); }
  if (r1 && r2) { r2.pos = 3; if (!r3) { } }
  if (r1 && r2) r2.pos = 3;
  if (r1) r1.pos = 2;
  if (r1 && r2 && r3) { /* the run is already scored */ }
  addRunner(b, 1);
  M.runners.forEach(r => { if (r.state === 'run') { [r.actor.x, r.actor.y] = segPos(r.pos); r.dir = 0; } });
}
function addRunner(actor, pos) {
  const M = BZ.M, r = { actor, pos, origin: pos, dir: 0, state: 'run', mustReturn: false, slide: 0, speed: 1, isBat: false, crossed: false, rest: 0 };
  [actor.x, actor.y] = segPos(pos); M.runners.push(r); return r;
}
function scoreRunner(r) {
  const M = BZ.M; if (r.state !== 'run') return;
  r.state = 'score'; r.actor.mood = 'cheer'; const s = M.half;
  M.score[s]++; M.line[s][M.inn - 1] = (M.line[s][M.inn - 1] || 0) + 1;
  BZ.gain(s, 8); BZ.emit('run', { side: s, actor: r.actor, score: M.score.slice() });
  if (M.lesson) BZ.lessonEvent('run');
}
function endAtBat(batterToBase) {
  const M = BZ.M, bs = off();
  if (M.phase !== 'call' && M.phase !== 'play') M.phase = 'call';
  M.phase = 'resolve'; M.t = 0; M.advance = batterToBase;
  bs.order++;
}

/* ---------------- ball in play ---------------- */
function startPlay() {
  const M = BZ.M, bs = off(), b = M.batter;
  // batter becomes a runner (not for a foul: decided when it is)
  let r = null; if (M.mode !== 'derby') { r = addRunner(b, 0); r.isBat = true; r.pos = 0; r.dir = 1; r.origin = 0; r.state = 'run'; b.facing = Math.atan2(BASES[1][1], BASES[1][0]); }
  M.runners.forEach(q => { q.origin = Math.round(q.pos); q.dir = 0; q.mustReturn = false; });
  M.batterRun = r; M.hold = 0; M.caught = false; M.dead = false; M.foulDead = false; M.homer = false; M.decided = false; M.throwLog = [];
  for (const a of def().actors) { a.hasBall = false; a.cool = 0; a.duty = null; a.stun = 0; a.speedMul = 1; a.jump = 0; a.dive = 0; a.sup = 0; }
  M.manual = [null, null]; M.queued = [-1, -1]; M.queuedT = [0, 0];
  M.pred = null; M.predT = 0; M.primary = null; M.fielded = false; M.playTime = 0;
  assignFielders();
}
BZ.stepBall = (b, dt, live) => {
  const M = BZ.M;
  if (b.state === 'hit' || b.state === 'loose' || b.state === 'homer') {
    const g = gravity(); b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= g * dt;
    if (b.state !== 'homer') {
      if (b.z > b.peak) b.peak = b.z;
      const r = hyp(b.x, b.y);
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -45) { b.vz = -b.vz * .46; b.vx *= .86; b.vy *= .86; b.bounces++; if (live) { BZ.sfx('step'); } if (!b.landed) { b.landed = true; b.landX = b.x; b.landY = b.y; } }
        else { b.vz = 0; const sp = hyp(b.vx, b.vy); if (sp > 2) { const k = Math.max(0, 1 - (70 + sp * .18) * dt / sp); b.vx *= k; b.vy *= k; } else { b.vx = b.vy = 0; } if (!b.landed) { b.landed = true; b.landX = b.x; b.landY = b.y; } }
      }
      // fair / foul is decided at the first touch beyond the infield, or when it rolls past it
      if (b.fair === null && b.state === 'hit') {
        if ((b.landed && r > 70) || r >= 230) b.fair = inFair(b.x, b.y);
        if (b.landed && r > 45 && !inFair(b.x, b.y)) b.fair = false;
      }
      const th = thetaOf(b.x, b.y);
      if (b.y < 0 && Math.abs(th) <= PI / 4 + .001) {
        const R = BZ.fenceR(th), H = BZ.fenceH(th);
        if (r >= R) {
          if (b.z > H && b.fair !== false) { b.state = 'homer'; b.homerAt = { x: b.x, y: b.y, z: b.z, r }; return 'homer'; }
          if (b.z <= H) { // the wall
            const nx = b.x / r, ny = b.y / r, vr = b.vx * nx + b.vy * ny;
            if (vr > 0) { b.vx -= 1.4 * vr * nx; b.vy -= 1.4 * vr * ny; b.vz *= .8; if (live && !b.wall) BZ.emit('wall', { x: b.x, y: b.y }); b.wall = true; }
            b.x = nx * (R - 1); b.y = ny * (R - 1);
          }
        }
      } else if (b.y < -20 && Math.abs(th) > PI / 4) { // beyond the foul pole lines: the stands
        const lim = hyp(b.x, b.y);
        if (Math.abs(b.x) > -b.y + 99 && b.z < 56) { const k = b.x > 0 ? 1 : -1; b.x = k * (-b.y + 99); b.vx = -b.vx * .3; b.vy *= .6; }
        if (lim > 1700) b.dead = true;
      }
      if (b.y > 110 && hyp(b.x, b.y) > 118) { const n = hyp(b.x, b.y); b.vx *= -.2; b.vy *= -.2; b.x *= 117 / n; b.y *= 117 / n; }   // the backstop
    } else if (b.z <= 0 || hyp(b.x, b.y) > 2200) { b.z = Math.max(0, b.z); b.vx *= .3; b.vy *= .3; b.vz = 0; b.state = 'homerdead'; }
  }
  return null;
};
const reachOf = f => 26 + (f.jump > 0 ? f.z : 0) + (f.sup > 0 ? 46 : 0);
function ballHeight(f) { return f.z; }
function updateBallPlay(dt) {
  const M = BZ.M, b = M.ball;
  if (b.state === 'catcher' || b.state === 'none' || b.state === 'pitch') return;
  const ev = BZ.stepBall(b, dt, true);
  if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 14) b.trail.shift(); }
  if (ev === 'homer' && !M.homer) {
    // a leaping fielder may rob it
    const rob = tryRob();
    if (!rob) { homerNow(); }
  }
  if (b.state === 'throw') updateThrow(dt);
  // fielders catch / pick up
  if (b.state === 'hit' || b.state === 'loose') {
    const d = def();
    for (const f of d.actors) {
      if (f.stun > 0 || f.cool > 0) continue;
      const dx = hyp(f.x - b.x, f.y - b.y), rad = f.dive > 0 ? 17 : 11;
      if (dx < rad && b.z <= reachOf(f) + 4 && (b.z >= f.z - 6)) {
        if (!b.landed && b.bounces === 0 && b.state === 'hit' && b.z > 3) { catchFly(f); break; }
        if (b.z <= 14 || b.bounces > 0 || b.landed) { pickUp(f); break; }
      }
    }
  }
  if (b.state === 'homerdead') { /* finished by homerNow's timers */ }
}
function tryRob() {
  const M = BZ.M, b = M.ball, h = b.homerAt, d = def();
  for (const f of d.actors) {
    if (f.stun > 0) continue;
    const dx = hyp(f.x - h.x, f.y - h.y);
    if (dx < 15 && f.jump > 0 && f.z + 30 + (f.sup > 0 ? 46 : 0) >= h.z - BZ.fenceH(thetaOf(h.x, h.y)) + BZ.fenceH(thetaOf(h.x, h.y)) - 0 && h.z <= BZ.fenceH(thetaOf(h.x, h.y)) + f.z + 34 + (f.sup > 0 ? 46 : 0)) {
      b.state = 'hit'; b.x = h.x * .985; b.y = h.y * .985; b.vx = b.vy = 0; b.vz = -10; b.z = Math.min(b.z, 60);
      def().stat.robs++; BZ.emit('robbed', { fielder: f, side: 1 - M.half }); BZ.gain(1 - M.half, 22);
      catchFly(f, true); return true;
    }
  }
  return false;
}
function homerNow() {
  const M = BZ.M, b = M.ball; M.homer = true; M.phase = 'homer'; M.t = 0;
  const bs = off(); bs.stat.h++; bs.stat.hr++;
  const dist = hyp(b.homerAt.x, b.homerAt.y);
  const full = dist + (b.vz > 0 ? 0 : 0) + b.vz * 0.0;
  // distance estimate: where it would land
  const g = gravity(), tl = (b.vz + Math.sqrt(b.vz * b.vz + 2 * g * Math.max(0, b.z))) / g, lx = b.x + b.vx * tl, ly = b.y + b.vy * tl;
  M.homerDist = Math.max(dist, hyp(lx, ly)); M.bestDist = Math.max(M.bestDist, M.homerDist);
  BZ.gain(M.half, 26); M.hrCount++;
  BZ.emit('homer', { batter: M.batter, dist: M.homerDist, bz: b.bz, side: M.half, runners: M.runners.filter(r => r.state === 'run').length });
  if (M.mode === 'derby') { derbyHomer(); return; }
  if (M.lesson) BZ.lessonEvent('homer');
  // every runner scores
  M.runners.forEach(r => { if (r.state === 'run') { scoreRunner(r); } });
  M.batterRun = null; off().order += 0;
}
function catchFly(f, robbed) {
  const M = BZ.M, b = M.ball; if (M.outs >= 3 && M.mode !== 'derby') { b.state = 'held'; b.holder = f; f.hasBall = true; f.holdT = 0; return; } b.state = 'held'; b.holder = f; f.hasBall = true; M.caught = true; M.fielded = true;
  b.vx = b.vy = b.vz = 0; b.z = 20;
  def().stat.catches++; BZ.sfx('mitt');
  const r = M.batterRun; if (r && r.state === 'run') { r.state = 'out'; }
  M.outs++; BZ.gain(1 - M.half, 10);
  if (!robbed) BZ.emit('catch', { fielder: f, foul: b.fair === false, fly: true });
  BZ.emit('out', { how: 'fly', fielder: f, side: M.half });
  if (M.lesson) BZ.lessonEvent('out');
  // runners must tag up: those off their base must go back
  for (const q of M.runners) if (q.state === 'run' && q !== r) { q.mustReturn = q.pos > q.origin + .03; q.tagWait = true; }
  M.decided = true;
  if (M.mode === 'derby') derbyOut('fly');
}
function pickUp(f) {
  const M = BZ.M, b = M.ball; if (b.state === 'held') return;
  b.state = 'held'; b.holder = f; f.hasBall = true; M.fielded = true; b.vx = b.vy = b.vz = 0; b.z = 14; f.thinkT = 0; f.holdT = 0;
  if (b.fair === null) b.fair = inFair(b.x, b.y);
  BZ.sfx('mitt');
  if (M.mode === 'derby') { if (b.fair === false) foulBall(); else derbyOut('inplay'); return; }
  if (b.fair === false && !M.homer) { foulBall(); return; }
  if (!M.decided) M.decided = true;
  BZ.emit('fielded', { fielder: f });
}
function foulBall() {
  const M = BZ.M, b = M.ball; if (M.foulDead) return;
  M.foulDead = true; M.phase = 'foul'; M.t = 0; const r = M.batterRun;
  if (r) { r.state = 'gone'; M.runners = M.runners.filter(q => q !== r); }
  for (const q of M.runners) { q.pos = q.origin; [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.mustReturn = false; }
  if (M.strikes < 2 || M.lastHit.kind === 'bunt') { if (M.strikes < 2) M.strikes++; else if (M.lastHit.kind === 'bunt') { M.strikes = 3; } }
  BZ.emit('foul', {}); BZ.sfx('strike');
  if (M.strikes >= 3) { M.phase = 'call'; M.t = 0; M.result = 'foul'; finishAtBat('strikeout'); return; }
  if (M.mode === 'derby') derbyOut('foul');
}
BZ.catchFly = catchFly;

/* ---------------- throws ---------------- */
BZ.throwTo = (f, base, o = {}) => {
  const M = BZ.M, b = M.ball; if (b.state !== 'held' || b.holder !== f) return false;
  const recv = receiverFor(base, f), tgt = recv ? [recv.x, recv.y] : bpos(base);
  const sx = f.x, sy = f.y, d0 = hyp(tgt[0] - sx, tgt[1] - sy);
  if (d0 < 6) return false;
  if (!recv && !o.force) return false;
  const arm = f.st.arm / 10, sup = f.sup > 0 || o.super;
  const err = (sup ? 0 : .045 * TUNE.throwError * (1.25 - arm * .6) * (1 - .1 * def().up.arm)) * (.5 + d0 / 500);
  const ang = Math.atan2(tgt[1] - sy, tgt[0] - sx) + (rnd() - .5) * 2 * err;
  const spd = TUNE.throwSpeed * (.88 + arm * .22) * (1 + .06 * def().up.arm) * (sup ? 2.0 : 1);
  const T = d0 / spd;
  b.state = 'throw'; b.holder = null; f.hasBall = false; f.anim = 'throw'; f.animT = 0; f.cool = .45; f.facing = ang;
  b.thr = { sx, sy, ex: sx + Math.cos(ang) * d0, ey: sy + Math.sin(ang) * d0, T, t: 0, apex: 6 + d0 * .035, recv, base, from: f, spd, dir: ang };
  b.z = 24; b.x = sx; b.y = sy; b.fire = sup;
  M.throwLog.push(base);
  BZ.emit('throw', { fielder: f, base, super: sup });
  BZ.sfx('throw');
  return true;
};
function receiverFor(base, from) {
  const M = BZ.M, d = def();
  let best = null, bd = 1e9;
  const t = bpos(base);
  for (const f of d.actors) { if (f === from || f.stun > 0) continue; const dd = hyp(f.x - t[0], f.y - t[1]) ; if (dd < bd) { bd = dd; best = f; } }
  return bd < 38 ? best : null;
}
function updateThrow(dt) {
  const M = BZ.M, b = M.ball, t = b.thr; if (!t) { b.state = 'loose'; return; }
  t.t += dt; const s = t.t / t.T;
  b.x = lerp(t.sx, t.ex, Math.min(s, 1)); b.y = lerp(t.sy, t.ey, Math.min(s, 1));
  b.z = lerp(24, 20, Math.min(s, 1)) + 4 * t.apex * Math.min(s, 1) * (1 - Math.min(s, 1));
  // catch by the receiver / any fielder crossing the line of the throw
  for (const f of def().actors) {
    if (f === t.from && s < .4) continue;
    if (f.stun > 0) continue;
    const d = hyp(f.x - b.x, f.y - b.y);
    if (d < (f === t.recv ? 15 : 11) && Math.abs(f.z + 14 - b.z) < 34 + (f.jump > 0 ? 20 : 0) && (f === t.recv || s > .25)) { b.state = 'held'; b.holder = f; f.hasBall = true; b.vx = b.vy = b.vz = 0; b.z = 16; f.thinkT = 0; f.holdT = 0; BZ.sfx('mitt'); BZ.emit('fielded', { fielder: f, thrown: true }); return; }
  }
  if (s >= 1) {   // nobody got it: it sails on
    b.state = 'loose'; const sp = t.spd * .6; b.vx = Math.cos(t.dir) * sp; b.vy = Math.sin(t.dir) * sp; b.vz = 10; b.bounces = 1; b.landed = true; b.fair = true;
    BZ.emit('wildthrow', {}); M.errors = (M.errors || 0) + 1;
  }
}
BZ.throwChoice = (f) => {
  // the smartest base for the ball holder: the lead runner who can still be beaten, else the force
  const M = BZ.M; let best = -1, bestScore = -1e9;
  const sp = TUNE.throwSpeed * (.88 + f.st.arm * .022);
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    let tb = null;
    if (r.mustReturn) tb = r.origin;
    else if (r.dir > 0 || (r.dir === 0 && r.isBat && r === M.batterRun)) tb = Math.ceil(r.pos - 1e-6);
    else if (r.dir < 0) tb = Math.floor(r.pos + 1e-6);
    if (tb === null) continue;
    if (tb <= r.pos - 0.02 && !r.mustReturn && r.dir >= 0) tb = Math.ceil(r.pos + 1e-6);
    const b = tb % 4, tgt = bpos(b), dT = hyp(tgt[0] - f.x, tgt[1] - f.y) / sp + .22;
    const rT = Math.abs(tb - r.pos) * G.SEG / (runnerSpeed(r) || 70);
    if (hyp(tgt[0] - f.x, tgt[1] - f.y) < 8 || !receiverFor(b, f)) continue;
    const margin = rT - dT, sc = r.pos * 10 + (margin > -.12 ? 100 : -100) + (isForced(r) ? 30 : 0);
    if (margin > -.35 && sc > bestScore) { bestScore = sc; best = b; }
  }
  return best;
};

/* ---------------- fielders ---------------- */
function predictBall() {
  const M = BZ.M, b = M.ball, c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, state: b.state === 'throw' ? 'loose' : b.state, bounces: b.bounces, landed: b.landed, fair: b.fair, peak: b.peak, trail: null };
  const out = []; for (let t = 0; t < 7; t += .08) { const ev = BZ.stepBall(c, .08, false); out.push({ t: t + .08, x: c.x, y: c.y, z: c.z, vz: c.vz, bounces: c.bounces, homer: ev === 'homer' || c.state === 'homer' || c.state === 'homerdead' }); if (ev === 'homer' || (c.vx === 0 && c.vy === 0 && c.z === 0)) break; }
  return out;
}
const fSpeed = f => TUNE.fielderSpeed * (.9 + f.st.spd * .02) * (1 + .04 * def().up.legs) * (f.sup > 0 ? 2.5 : 1) * f.speedMul;
function assignFielders() {
  const M = BZ.M, d = def(), b = M.ball; if (b.state === 'homer' || b.state === 'homerdead') { M.primary = null; return; }
  if (b.state === 'held') { M.primary = b.holder; const taken = new Set([b.holder]); for (const f of d.actors) f.duty = null; for (const [bs, cands] of [[2, ['2B', 'SS']], [1, ['1B', '2B', 'P']], [3, ['3B', 'SS']], [0, ['C', 'P']]]) for (const pos of cands) { const f = d.actors.find(x => x.pos === pos); if (f && !taken.has(f) && f.stun <= 0) { f.duty = bs; taken.add(f); break; } } for (const f of d.actors) if (!taken.has(f)) f.duty = 'back'; return; }
  const pred = predictBall(); M.pred = pred;
  let best = null, bestT = 1e9, bestF = null;
  for (const f of d.actors) {
    if (f.stun > 0) continue; const sp = fSpeed(f);
    for (const p of pred) {
      if (p.homer) break;
      const isFly = p.z > 26 || (p.bounces === 0 && p.z > 8);
      if (isFly && p.z > 36) continue;
      const need = hyp(p.x - f.x, p.y - f.y) / sp;
      if (need <= p.t + .12) { if (p.t < bestT) { bestT = p.t; best = f; bestF = p; } break; }
    }
  }
  if (!best) { // nobody makes it: the nearest to where it ends
    const last = pred[pred.length - 1]; let bd = 1e9;
    for (const f of d.actors) { const dd = hyp(f.x - last.x, f.y - last.y); if (dd < bd) { bd = dd; best = f; } }
    bestF = last;
  }
  M.primary = best; M.primaryPt = bestF;
  // base coverage for the others
  for (const f of d.actors) f.duty = null;
  const taken = new Set([best]), cover = [[2, ['2B', 'SS']], [1, ['1B', '2B', 'P']], [3, ['3B', 'SS']], [0, ['C', 'P']]];
  for (const [bs, cands] of cover) for (const pos of cands) { const f = d.actors.find(x => x.pos === pos); if (f && !taken.has(f) && f.stun <= 0) { f.duty = bs; taken.add(f); break; } }
  for (const f of d.actors) if (!taken.has(f)) f.duty = 'back';
}
function fielderMove(f, dt, ix, iy, mag, turbo) {
  // acceleration toward the wanted velocity
  const sp = fSpeed(f) * (turbo ? 1.2 : 1);
  const want = [ix * sp * mag, iy * sp * mag];
  f.vx = (f.vx || 0) + (want[0] - (f.vx || 0)) * Math.min(1, dt * 10); f.vy = (f.vy || 0) + (want[1] - (f.vy || 0)) * Math.min(1, dt * 10);
  f.x += f.vx * dt; f.y += f.vy * dt;
  if (mag > .05) f.facing = Math.atan2(iy, ix);
  // stay on the field: inside the fence
  const th = thetaOf(f.x, f.y), r = hyp(f.x, f.y);
  if (f.y < 0) { const R = BZ.fenceR(clamp(th, -PI / 4, PI / 4)) - 8; if (r > R) { const k = R / r; f.x *= k; f.y *= k; } }
  if (f.y > 80) f.y = 80;
}
function updateFielders(dt) {
  const M = BZ.M, d = def(), b = M.ball, sideIdx = 1 - M.half, ctl = M.intent[sideIdx] || {};
  M.predT -= dt; if (M.predT <= 0 && b.state !== 'held' && b.state !== 'throw') { assignFielders(); M.predT = .16; }
  if (b.state === 'held') M.primary = b.holder;
  for (const f of d.actors) {
    f.cool = Math.max(0, f.cool - dt); f.stun = Math.max(0, f.stun - dt); f.sup = Math.max(0, f.sup - dt);
    // jump / dive physics
    if (f.jump > 0) { f.vz -= (gravity() > 150 ? 720 * BZ.M.parkDef.gravity : 720) * dt; f.z += f.vz * dt; f.jump -= dt; if (f.z <= 0) { f.z = 0; f.jump = 0; f.vz = 0; } }
    if (f.dive > 0) { f.dive -= dt; f.x += Math.cos(f.facing) * 90 * dt * (f.dive > .25 ? 1 : 0); f.y += Math.sin(f.facing) * 90 * dt * (f.dive > .25 ? 1 : 0); }
    if (f.stun > 0) { f.vx = f.vy = 0; continue; }
    if (f.jump > 0 || f.dive > 0) continue;
    const human = d.ctl && (ctl.mx || ctl.my || ctl.swing);
    const isCtl = d.human && f === controlled(sideIdx);
    let tx, ty, mag = 1;
    if (b.state === 'held' && b.holder === f) {
      // ball holder: tag a runner nearby, run at the lead runner, else wait for the throw
      const chase = M.runners.find(r => r.state === 'run' && !onBase(r) && dist2(r.actor, f) < 70 && (r.dir !== 0));
      if (chase && !(isCtl && (ctl.mx || ctl.my))) { tx = chase.actor.x; ty = chase.actor.y; } else { tx = f.x; ty = f.y; mag = 0; }
      if (isCtl && (ctl.mx || ctl.my)) { fielderMove(f, dt, ctl.mx, ctl.my, Math.min(1, hyp(ctl.mx, ctl.my)), ctl.turbo); continue; }
    } else if (f === M.primary) {
      if (isCtl && (ctl.mx || ctl.my)) { fielderMove(f, dt, ctl.mx, ctl.my, Math.min(1, hyp(ctl.mx, ctl.my)), ctl.turbo); aiJump(f, true); continue; }
      const pt = M.primaryPt || b; tx = pt.x; ty = pt.y;
      if (b.state === 'hit' && b.z > 20 && M.primaryPt) { tx = M.primaryPt.x; ty = M.primaryPt.y; }
      if (b.state === 'loose') { tx = b.x + b.vx * .2; ty = b.y + b.vy * .2; }
      if (!isCtl || !d.human) aiJump(f, false);
    } else if (typeof f.duty === 'number') {
      const t = bpos(f.duty); tx = t[0] + (f.duty === 0 ? 0 : 0); ty = t[1] + (f.duty === 0 ? 12 : 0);
      if (f.duty > 0) { const o = def().actors.find(a => a === f); /* stand on the bag, inside edge */ tx = t[0] * .96; ty = t[1] + 2; }
    } else if (f.duty === 'back') {
      const pr = M.primary; if (pr && pr !== f) { tx = lerp(f.x, (pr.x + G.DEF[f.pos][0]) / 2, .5); ty = lerp(f.y, pr.y - 30, .3); } else { tx = G.DEF[f.pos][0]; ty = G.DEF[f.pos][1]; }
    } else { tx = G.DEF[f.pos][0]; ty = G.DEF[f.pos][1]; }
    const dx = tx - f.x, dy = ty - f.y, dd = hyp(dx, dy);
    if (dd > 2.5 && mag > 0) fielderMove(f, dt, dx / dd, dy / dd, Math.min(1, dd / 8), false); else { f.vx = f.vy = 0; if (b.state !== 'held') f.facing = Math.atan2(b.y - f.y, b.x - f.x); }
    // the human can ask for a jump/dive/super with the fielder they hold
  }
  // human actions on the controlled fielder
  const cf = controlled(sideIdx);
  if (cf && d.human) {
    if (ctl.jump && cf.jump <= 0 && cf.dive <= 0 && cf.z === 0) doJump(cf, ctl.mx || ctl.my);
    if (ctl.super && d.meter >= 100) { d.meter = 0; cf.sup = 1.8; BZ.emit('superfield', { side: sideIdx }); BZ.sfx('rocket'); }
    if (ctl.next) { const list = d.actors.filter(a => a !== M.primary).sort((a, c) => hyp(a.x - b.x, a.y - b.y) - hyp(c.x - b.x, c.y - b.y)); M.manual[sideIdx] = { f: list[0], t: 1.6 }; }
  }
  if (M.manual[sideIdx]) { M.manual[sideIdx].t -= dt; if (M.manual[sideIdx].t <= 0 || b.state === 'held') M.manual[sideIdx] = null; }
  // throws
  const h = b.state === 'held' ? b.holder : null;
  if (h && !M.over) {
    const hSide = h.side, isHuman = d.human && h === controlled(sideIdx) && ctl;
    h.holdT = (h.holdT || 0) + dt;
    const want = isHuman ? (ctl.throwBase >= 0 ? ctl.throwBase : -1) : -1;
    if (isHuman && want >= 0) { BZ.throwTo(h, want, { super: h.sup > 0 }); }
    else if (M.queued[sideIdx] >= 0 && isHuman && h.holdT > .08) { BZ.throwTo(h, M.queued[sideIdx]); M.queued[sideIdx] = -1; }
    else {
      const delay = isHuman ? 1.15 : TUNE.cpuThinks * (1.3 - (M.diff || .5) * .7) * (h === M.primary || true ? 1 : 1);
      if (h.holdT > delay) {
        const c = BZ.throwChoice(h);
        if (c >= 0 && !M.dead) { const near = bpos(c); if (hyp(near[0] - h.x, near[1] - h.y) > 10) BZ.throwTo(h, c); }
        else if (!M.dead && M.decided && allStill()) { /* nobody running: the play can end */ }
      }
    }
  }
}
function controlled(sideIdx) {
  const M = BZ.M; if (M.manual && M.manual[sideIdx] && M.manual[sideIdx].f) return M.manual[sideIdx].f;
  return M.ball.state === 'held' ? M.ball.holder : M.primary;
}
BZ.controlled = controlled;
function aiJump(f, human) {
  const M = BZ.M, b = M.ball; if (human) return;
  if (f.jump > 0 || f.dive > 0 || f.z > 0) return;
  const d = hyp(f.x - b.x, f.y - b.y);
  if (b.state === 'hit' && b.z > 34 && d < 38 && b.vz < 120 && b.landed === false) doJump(f);
  else if (b.state === 'hit' && b.z < 18 && d < 30 && d > 14 && hyp(b.vx, b.vy) > 140 && f.cool <= 0 && rnd() < .5 + .3 * (M.diff || .5)) doJump(f, true);
  else if (b.state === 'hit' && b.y < 0 && hyp(b.x, b.y) > BZ.fenceR(clamp(thetaOf(b.x, b.y), -PI / 4, PI / 4)) - 70 && b.z > 36 && d < 60) doJump(f);
}
function doJump(f, dive) {
  const M = BZ.M, b = M.ball;
  const low = b.z < 18 && hyp(f.x - b.x, f.y - b.y) > 8 && dive !== false;
  if (low && f.cool <= 0 && b.state === 'hit' && hyp(f.x - b.x, f.y - b.y) < 44) { f.dive = .55; f.facing = Math.atan2(b.y - f.y, b.x - f.x); f.cool = .3; f.anim = 'dive'; f.animT = 0; BZ.sfx('slide'); return; }
  f.jump = 1; f.vz = Math.sqrt(2 * 720 * 44 / (BZ.M.parkDef.gravity < 1 ? 1 : 1)) * (BZ.M.parkDef.gravity < 1 ? 1.28 : 1); f.anim = 'jump'; f.animT = 0; f.cool = .2; BZ.sfx('step');
}
BZ.doJump = doJump;

/* ---------------- runners ---------------- */
const runnerSpeed = r => TUNE.runnerSpeed * (.82 + r.actor.st.spd * .036) * (1 + .04 * off().up.legs) * (r.turbo ? TUNE.turboBoost : 1) * (r.slide > 0 ? 1.04 : 1);
const onBase = r => Math.abs(r.pos - Math.round(r.pos)) < .015;
function isForced(r) {
  const M = BZ.M; if (r.state !== 'run') return false;
  if (r.isBat && r.origin === 0) return true;
  const q = M.runners.find(x => x !== r && x.state === 'run' && x.origin === r.origin - 1);
  if (r.origin === 0) return true;
  return !!(q && (q.origin === 0 ? true : isForced(q)));
}
function updateRunners(dt) {
  const M = BZ.M, o = off(), ctl = M.intent[M.half] || {}, d = def(), b = M.ball;
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    const prev = r.pos; r.turbo = !!(o.human && ctl.turbo && o.turbo > 0);
    if (!(M.phase === 'play' || r.stealing)) continue;
    // decide direction
    let want = r.dir;
    const human = o.human && !!o.ctl;
    if (r.mustReturn) want = -1;
    else if (M.caught && r.tagWait) { r.tagWait = false; r.dir = 0; }
    if (!r.mustReturn) {
      if (r.isBat && r === M.batterRun && !r.crossed) { want = M.foulDead ? 0 : 1; }
      else if (M.caught && r.tagWait === false || (!M.caught && !M.foulDead)) { want = runnerAI(r, ctl, human); }
      else want = r.dir;
    }
    if (M.caught && r.mustReturn && r.pos <= r.origin + .001) { r.mustReturn = false; r.dir = 0; r.pos = r.origin; want = 0; }
    r.dir = want;
    if (r.dir !== 0) {
      let np = r.pos + r.dir * runnerSpeed(r) / G.SEG * dt;
      // not past the runner ahead
      const ahead = M.runners.filter(x => x !== r && x.state === 'run' && x.pos > r.pos - .001 && x.dir === 0 && onBase(x)).sort((a, c) => a.pos - c.pos)[0];
      if (ahead && np > ahead.pos - .02 && r.dir > 0) np = Math.min(np, ahead.pos - .02);
      // a runner never goes behind where the batter-runner stands, or before his origin when returning
      np = clamp(np, r.mustReturn ? r.origin : (r.dir < 0 ? r.floorBase || r.origin : 0), 4);
      if (r.dir < 0) np = Math.max(np, Math.floor(r.floorBase !== undefined ? r.floorBase : r.origin));
      r.pos = np;
      [r.actor.x, r.actor.y] = segPos(r.pos);
      r.actor.facing = Math.atan2(...(() => { const a = segPos(r.pos + r.dir * .02), c = segPos(r.pos); return [a[1] - c[1], a[0] - c[0]]; })());
      if (r.pos >= 4 - .001) { r.pos = 4; scoreRunner(r); }
      // arrived at a base: stop (the AI decides to go on)
      const rb = Math.round(r.pos);
      if (Math.abs(r.pos - rb) < .012 && rb !== Math.round(prev) || (Math.abs(r.pos - rb) < .012 && r.dir !== 0 && Math.abs(prev - rb) >= .012)) {
        if (rb < 4) { r.pos = rb; r.origin = rb; r.floorBase = rb; r.dir = 0; r.crossed = true; r.slide = 0; if (r.isBat && rb === 1) { /* batter on first */ } r.stealing = false; BZ.emit('arrive', { runner: r, base: rb }); if (r.wasSteal) { r.wasSteal = false; off().stat.sb++; BZ.gain(M.half, 10); BZ.emit('steal', { runner: r, base: rb }); } }
      }
    }
    r.slide = Math.max(0, r.slide - dt);
  }
  M.runners = M.runners.filter(r => r.state === 'run' || r.state === 'score' && false);
  // refill list: keep scored/out out
}
function runnerAI(r, ctl, human) {
  const M = BZ.M, b = M.ball, d = def();
  const forced = isForced(r);
  const nextBase = Math.floor(r.pos + 1e-6) + 1;
  const moving = !onBase(r);
  // a human sends and recalls with advance/retreat
  if (human) {
    if (ctl.advance) { r.hold = false; r.ordered = 1; }
    if (ctl.retreat) { r.ordered = -1; }
  }
  if (r.ordered === -1) { if (moving || r.pos > r.origin + 1e-6) { r.floorBase = Math.floor(r.pos + 1e-6); return -1; } r.ordered = 0; }
  if (moving) { // between bases: carry on unless a recall or a rundown turns him
    const holder = b.state === 'held' ? b.holder : null;
    if (r.dir > 0) {
      const nb = Math.ceil(r.pos), tgt = bpos(nb);
      if (holder && hyp(holder.x - tgt[0], holder.y - tgt[1]) < 14 && !forced && (nb - r.pos) * G.SEG > 40 && r.pos - Math.floor(r.pos) < .5) { r.floorBase = Math.floor(r.pos + 1e-6); return -1; }
    }
    return r.dir || 1;
  }
  // on a base
  if (r.ordered === 1) { r.ordered = 0; return 1; }
  if (M.foulDead) return 0;
  if (forced && !M.caught && M.ball.fair !== false) return 1;
  if (r.isBat && r === M.batterRun && !r.crossed) return 1;
  if (M.caught) { // tag up when the catch was deep enough, human or CPU
    if (r.tagWait === false || r.tagWait === undefined) {
      if (!human && r.tagReady) return 1;
    }
    return 0;
  }
  if (human) return 0;
  // CPU runner: go on a ball that is past the infield and not yet in hand
  if (b.state === 'held' || b.state === 'throw') return 0;
  if (b.fair === null || b.state === 'hit' && b.z > 20) return 0;
  const tgt = bpos(nextBase), pr = M.primary;
  if (!pr) return 0;
  const tField = hyp(pr.x - b.x, pr.y - b.y) / fSpeed(pr) + hyp(tgt[0] - b.x, tgt[1] - b.y) / (TUNE.throwSpeed * .95) + .6;
  const tRun = G.SEG / runnerSpeed(r) + .2;
  return tField > tRun * (1.05 - (M.diff || .5) * .2) && b.landed ? 1 : 0;
}
function allStill() { return BZ.M.runners.every(r => r.state !== 'run' || r.dir === 0); }

function resolveOuts() {
  const M = BZ.M, b = M.ball, h = b.state === 'held' ? b.holder : null; if (!h) return;
  const ds = def();
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    let out = null;
    // force or tag-up: the holder with the ball on the bag before the runner
    for (let bi = 0; bi < 4; bi++) {
      const tgt = bpos(bi); if (hyp(h.x - tgt[0], h.y - tgt[1]) > 11) continue;
      const b4 = bi === 0 ? 4 : bi;
      if (r.mustReturn && r.origin === (bi === 0 ? 0 : bi) && !onBase(r)) out = 'tagup';
      else if (!r.mustReturn && isForced(r) && Math.ceil(r.pos - 1e-6) === b4 && r.pos < b4 - .02 && r.dir > 0 && r.pos >= r.origin) out = 'force';
      else if (!r.mustReturn && isForced(r) && r.isBat && r === M.batterRun && b4 === 1 && r.pos < .98 && r.origin === 0) out = 'force';
    }
    // a tag
    if (!out && !onBase(r) && dist2(h, r.actor) < (r.slide > 0 ? 7 : 10) && r.actor.z === 0) out = 'tag';
    if (out) putOut(r, out, h);
  }
}
function putOut(r, how, h) {
  const M = BZ.M, d = def(); if (r.state !== 'run' || M.outs >= 3) return;
  r.state = 'out'; r.actor.anim = 'out'; r.actor.animT = 0; M.outs++; BZ.gain(1 - M.half, 10);
  BZ.emit('out', { how, runner: r, fielder: h, side: M.half, isBat: r.isBat });
  if (how === 'force' || how === 'tag' || how === 'tagup') BZ.sfx('out');
  M.outsThisPlay = (M.outsThisPlay || 0) + 1;
  if (M.outsThisPlay >= 2) { d.stat.dp++; BZ.emit('doubleplay', {}); BZ.gain(1 - M.half, 20); }
  if (M.lesson) BZ.lessonEvent('out');
  // a play can leave a runner where he stands; remove from list at the end
  r.removed = true;
}

/* ---------------- phases ---------------- */
BZ.updateSim = (dt) => {
  const M = BZ.M; if (!M || M.over) return;
  M.clock += dt; M.t += dt; M.shake = Math.max(0, M.shake - dt * 2);
  for (const s of M.sides) { s.turbo = clamp(s.turbo + dt * .18, 0, 1); }
  updateAnims(dt);
  updateHazards(dt);
  const ph = M.phase;
  const ib = M.intent[batterSide()] || {}, ip = M.intent[pitcherSide()] || {};
  if (ph === 'intro') { if (M.t > (M.noIntro ? .1 : 1.6) && !M.hold) { M.phase = 'setup'; M.t = 0; BZ.emit('batterup', { batter: M.batter }); if (M.mode === 'derby') derbyNext(); } }
  else if (ph === 'between') { if (M.t > 2.8) { M.phase = 'setup'; M.t = 0; BZ.emit('batterup', { batter: M.batter }); } }
  else if (ph === 'setup') {
    // pitcher chooses; the batter may warm up the cursor
    batterCursor(dt, ib);
    const ps = def(), pitchSide = 1 - M.half;
    if (ps.human && ps.ctl && !M.autoPitch) {
      if (ip.next) M.sel = (M.sel + 1) % 4; if (ip.prev) M.sel = (M.sel + 3) % 4;
      M.aim.u = clamp(M.aim.u + (ip.mx || 0) * 2 * dt, -1.35, 1.35); M.aim.v = clamp(M.aim.v + (ip.my || 0) * 2 * dt * -1 * -1 * 1, -1.35, 1.35);
      if (ip.swing) BZ.startWindup({ bean: ip.bean, fire: ip.power });
    } else if (M.mode === 'derby') { if (M.t > .55 && !M.hold && M.dMach) BZ.startWindup({ type: M.dMach.type, u: M.dMach.u, v: M.dMach.v }); }
    else if (M.t > .7 + (M.attract ? 0 : .5) && !M.hold) cpuPitch();
  } else if (ph === 'windup') {
    batterCursor(dt, ib);
    M.pitch.t += dt; if (M.pitch.t >= 0) releasePitch();
    cpuBatterPlan(dt, ib); stealLogic(ib);
    if (!M.sw && ib.swing) BZ.swingNow(ib.bunt ? 'bunt' : 'normal');
    if (!M.sw && ib.power) BZ.swingNow('power');
  } else if (ph === 'pitch') {
    const p = M.pitch;
    batterCursor(dt, ib);
    // aftertouch from the pitcher
    if (def().human && ip.mx !== undefined) { p.aft.u = clamp(p.aft.u + (ip.mx || 0) * 1.1 * dt, -.55, .55); p.aft.v = clamp(p.aft.v + (ip.my || 0) * -1 * -1 * 1.1 * dt, -.55, .55); }
    cpuBatterPlan(dt, ib); stealLogic(ib); if (M.steal) updateRunners(dt);
    if (!M.sw) { if (ib.swing && M.swCool <= 0) BZ.swingNow(ib.bunt ? 'bunt' : 'normal'); else if (ib.power && M.swCool <= 0) BZ.swingNow('power'); }
    p.t += dt;
    const pos = BZ.pitchPos(p, p.t); M.ball.x = pos[0]; M.ball.y = pos[1]; M.ball.z = pos[2];
    M.ball.trail.push([pos[0], pos[1], pos[2]]); if (M.ball.trail.length > 10) M.ball.trail.shift();
    if (p.t >= p.T) resolvePlate();
  } else if (ph === 'call') {
    M.resultT += dt; batterCursor(dt, ib); if (M.steal) updateRunners(dt);
    if (M.t > (M.mode === 'derby' ? .5 : 1.05)) {
      if (M.outs >= 3 || (M.strikes >= 3) || (M.balls >= 4) || M.result === 'hbp') { /* handled in finishAtBat */ }
      M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.ball.state = 'none'; M.cur.u = 0; M.cur.v = 0;
      const P = fielderOf('P'); P.anim = null; M.batter.anim = null; BZ.emit('nextpitch', {});
      if (M.mode === 'derby') derbyNext();
    }
  } else if (ph === 'play') {
    M.playTime += dt;
    updateBallPlay(dt); updateFielders(dt); updateRunners(dt);
    if (M.phase === 'play') {
      resolveOuts(); stepPlayEnd(dt);
      if (M.mode === 'derby') derbyPlayStep(dt);
    }
  } else if (ph === 'homer') {
    const b = M.ball; BZ.stepBall(b, dt, false); if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 18) b.trail.shift(); }
    updateFielders(dt);
    if (M.t > (M.mode === 'derby' ? 1.6 : 3.6)) { if (M.mode === 'derby') { derbyNext2(); } else { finishPlay(); } }
    // runners trot
    for (const r of M.runners) if (r.state === 'run') { r.pos = Math.min(4, r.pos + dt * .55); [r.actor.x, r.actor.y] = segPos(r.pos); }
  } else if (ph === 'foul') {
    updateBallPlay(dt); updateFielders(dt);
    if (M.t > 1.5) { M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.ball.state = 'none'; M.cur.u = 0; M.cur.v = 0; fielderOf('P').anim = null; M.batter.anim = null; fieldersHome(); M.batter.hasBall = false; if (M.mode === 'derby') derbyNext(); }
  } else if (ph === 'resolve') {
    if (M.t > .7) { applyAtBat(); }
  } else if (ph === 'rhubarb') { updateRhubarb(dt); }
  else if (ph === 'steal') { /* handled in play */ }
  if (M.sw) {
    M.sw.age = (M.sw.age || 0) + dt;
    if (M.sw.age > .55) { M.sw = null; }
  }
  M.swCool = Math.max(0, M.swCool - dt);
};
function batterCursor(dt, ib) {
  const M = BZ.M, s = off(), c = M.cur;
  if (s.human && s.ctl) {
    if (ib.mouse) { c.u = lerp(c.u, ib.mouse[0], Math.min(1, dt * 9)); c.v = lerp(c.v, ib.mouse[1], Math.min(1, dt * 9)); }
    else { c.u += (ib.mx || 0) * 2.3 * dt; c.v += (ib.my || 0) * 2.3 * dt * -1 * -1; }
    c.u = clamp(c.u, -1.6, 1.6); c.v = clamp(c.v, -1.6, 1.6);
  }
}
function cpuPitch() {
  const M = BZ.M, d = def(), P = fielderOf('P'), sk = M.diff;
  let type = pickOf(G.ORDER);
  const fire = d.meter >= 100 && rnd() < .5;
  const corner = rnd() < .45 + sk * .3;
  const u = corner ? pickOf([-.85, .85, 0, -.7, .7]) : rr(-.6, .6), v = corner ? pickOf([-.85, .8, 0, -.7]) : rr(-.5, .5);
  const wide = rnd() < .22 - sk * .1;
  M.aim.u = wide ? pickOf([-1.35, 1.35]) : u; M.aim.v = wide ? pickOf([-1.3, 1.3]) : v;
  M.sel = G.ORDER.indexOf(type);
  BZ.startWindup({ type: fire ? 'fire' : type, u: M.aim.u, v: M.aim.v, fire });
}
function cpuBatterPlan(dt, ib) {
  const M = BZ.M, s = off(); if (s.human && s.ctl) return;
  const p = M.pitch; if (!p || !p.released) { if (M.phase === 'windup') { M.cpu = null; } return; }
  if (!M.cpu || M.cpu.pitchId !== p.t0id) {
    const sk = clamp(M.diff * .7 + M.batter.st.bat * .04 + (M.attract ? .5 : 0), 0, 1);
    const swing = true && (rnd() < (.35 + sk * .45)) ;
    M.cpu = { pitchId: p.t0id = (p.t0id || (BZ.pid = (BZ.pid || 0) + 1)), swing, err: (rnd() - .5) * 2 * (.15 * (1 - sk) + .012), cu: 0, plan: false, power: s.meter >= 100 && rnd() < .6 || M.attract && s.meter >= 100, sk };
    const uv = BZ.pitchUV(p, p.T);
    const isStrike = Math.abs(uv.fu) <= 1.05 && Math.abs(uv.fv) <= 1.05;
    M.cpu.swing = isStrike ? rnd() < .5 + sk * .45 : rnd() < .12 * (1 - sk);
    if (M.attract) M.cpu.swing = isStrike || rnd() < .3;
    M.cpu.target = { u: uv.fu + (rnd() - .5) * (1 - sk) * 2.4, v: uv.fv + (rnd() - .5) * (1 - sk) * 2.4 };
  }
  const c = M.cpu;
  M.cur.u = lerp(M.cur.u, c.target.u, Math.min(1, dt * 8)); M.cur.v = lerp(M.cur.v, c.target.v, Math.min(1, dt * 8));
  if (c.swing && !M.sw && M.swCool <= 0 && p.t >= p.T - .085 + c.err - 0.0) { BZ.swingNow(c.power ? 'power' : 'normal'); c.swing = false; }
}
function updateAnims(dt) {
  const M = BZ.M;
  for (const s of M.sides) for (const a of s.actors) { if (a.anim) { a.animT += dt; } }
}
function fieldersHome() {
  const M = BZ.M; for (const a of def().actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; a.z = 0; a.jump = 0; a.dive = 0; a.hasBall = false; a.facing = -PI / 2; a.vx = a.vy = 0; a.stun = 0; a.sup = 0; }
  const P = fielderOf('P'); P.facing = PI / 2; P.y = G.MOUND[1] + 6;
  const c = fielderOf('C'); c.x = 0; c.y = 20; c.facing = -PI / 2;
}
function stepPlayEnd(dt) {
  const M = BZ.M, b = M.ball; if (M.mode === 'derby') return;
  if (M.homer || M.foulDead) return;
  const h = b.state === 'held' ? b.holder : null;
  if (M.outs >= 3 && M.outsTimer === undefined) M.outsTimer = 0;
  if (M.outs >= 3) { M.outsTimer = (M.outsTimer || 0) + dt; if (M.outsTimer > .9) { M.outsTimer = undefined; finishPlay(); } return; }
  if (b.dead && b.state !== 'held') { }
  if (h) {
    const still = M.runners.every(r => r.state !== 'run' || (r.dir === 0 && onBase(r)));
    // a pitcher / catcher with the ball and nobody going: dead
    if (still && h.holdT > .5 && !(M.caught && M.runners.some(r => r.state === 'run' && r.mustReturn))) { finishPlay(); return; }
    // fly caught: a runner may still tag up
    if (M.caught && still && h.holdT > 1.6) { finishPlay(); return; }
  }
  if (M.playTime > 22) { finishPlay(true); }
  // CPU runners tag up on a deep catch
  if (M.caught && b.state === 'held') { for (const r of M.runners) if (r.state === 'run' && r.tagWait !== true && r.tagReady === undefined) { const dist = hyp(b.holder.x, b.holder.y); r.tagReady = dist > 520 && r.origin >= 1 && r.dir === 0 ? true : false; } }
  if (M.caught && b.state === 'held') for (const r of M.runners) if (r.state === 'run' && r.tagWait === true && onBase(r)) { r.tagWait = false; }
}
function finishPlay(force) {
  const M = BZ.M, b = M.ball, bs = off();
  if (M.phase === 'resolved') return;
  if (M.stealPlay) {
    M.stealPlay = false; M.steal = false; M.outsThisPlay = 0; M.outsTimer = undefined;
    M.runners = M.runners.filter(q => q.state === 'run');
    for (const q of M.runners) { q.stealing = false; q.pos = clamp(Math.round(q.pos), 1, 3); [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.origin = q.pos; q.mustReturn = false; q.floorBase = undefined; }
    const seen = new Set(); M.runners.sort((a, c) => c.pos - a.pos).forEach(q => { while (seen.has(q.pos) && q.pos < 3) q.pos++; seen.add(q.pos); [q.actor.x, q.actor.y] = segPos(q.pos); });
    M.phase = 'resolved'; M.ball.state = 'none'; return checkHalfEnd(true);
  }
  // classify the hit for the stats and commentary
  const r = M.batterRun;
  let how = 'out';
  if (M.homer) how = 'homer';
  else if (r && r.state === 'run') {
    const base = Math.round(r.pos); how = ['out', 'single', 'double', 'triple', 'homer'][clamp(base, 0, 4)] || 'single';
    if (base >= 1) { bs.stat.h++; BZ.gain(M.half, 10); BZ.emit(how, { batter: M.batter }); if (M.lesson) BZ.lessonEvent('hit'); }
  } else if (r && r.state === 'out' && !M.caught) { BZ.emit('groundout', { batter: M.batter }); }
  if (M.lastHit && M.lastHit.kind === 'bunt' && r && r.state === 'run') BZ.emit('bunthit', {});
  if (M.lesson) BZ.lessonEvent('playend');
  M.outsThisPlay = 0; M.outsTimer = undefined;
  M.runners = M.runners.filter(q => q.state === 'run');
  for (const q of M.runners) { if (!onBase(q)) { q.pos = Math.round(q.pos) === 0 ? Math.max(1, Math.ceil(q.pos)) : Math.round(q.pos); } q.pos = clamp(Math.round(q.pos), 1, 3); [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.origin = q.pos; q.mustReturn = false; q.isBat = false; q.crossed = false; q.tagWait = undefined; q.tagReady = undefined; q.floorBase = undefined; }
  // two runners on the same base: the front one moves up
  const seen = new Set(); M.runners.sort((a, c) => c.pos - a.pos).forEach(q => { while (seen.has(q.pos) && q.pos < 3) q.pos++; seen.add(q.pos); [q.actor.x, q.actor.y] = segPos(q.pos); });
  M.batterRun = null; bs.order++;
  endPlayToNext();
}
function endPlayToNext() {
  const M = BZ.M;
  M.phase = 'resolved'; M.t = 0; M.ball.state = 'none';
  setTimeout; checkHalfEnd();
}
function applyAtBat() {
  const M = BZ.M;
  // after a strikeout / walk: place the batter, move on
  if (M.advance) { addRunner(M.batter, 1); }
  M.runners = M.runners.filter(q => q.state === 'run');
  M.advance = false;
  // a walk into a full house is handled in forceWalkRunners
  checkHalfEnd();
}
function checkHalfEnd(keep) {
  const M = BZ.M;
  if (M.mode === 'derby') return;
  const ending = M.outs >= 3;
  const lead = M.score[1] - M.score[0];
  const last = M.inn >= M.innings;
  // walk-off
  if (M.half === 1 && last && lead > 0) return endGame();
  if (ending) {
    M.runners = [];
    if (M.half === 0 && last && lead > 0) return endGame();
    if (M.half === 1 && last && lead !== 0) return endGame();
    if (M.half === 1 && M.inn >= 3 && Math.abs(lead) >= TUNE.mercy) return endGame();
    if (M.half === 1 && M.inn >= M.innings + 3) return endGame();
    if (M.half === 1) { M.inn++; M.half = 0; } else M.half = 1;
    BZ.startHalf(false); fieldersHome();
    return;
  }
  if (keep) { const rs = M.runners; M.cur.u = 0; M.cur.v = 0; M.sw = null; M.swCool = 0; M.pitch = null; fieldersHome(); M.phase = 'setup'; M.t = 0; M.ball.state = 'none'; M.batter.anim = null; return; }
  BZ.nextBatter(); fieldersHome(); M.phase = 'setup'; M.t = 0; M.pitch = null;
  M.ball.state = 'none'; M.sw = null; M.swCool = 0; M.outsThisPlay = 0;
  BZ.emit('batterup', { batter: M.batter });
}
function endGame() {
  const M = BZ.M; M.over = true; M.phase = 'over'; M.t = 0;
  M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  BZ.emit('gameover', { winner: M.winner, score: M.score.slice() });
}
BZ.endGame = endGame;

/* ---------------- the Rhubarb: a bench-clearing dust-cloud scrum ---------------- */
function startRhubarb() {
  const M = BZ.M; M.phase = 'rhubarb'; M.t = 0;
  M.rhubarb = { t: 0, dur: 7, bar: 0, taps: [0, 0], done: false, from: M.half, rot: 0 };
  BZ.emit('rhubarb', {}); BZ.sfx('horn');
}
function updateRhubarb(dt) {
  const M = BZ.M, R = M.rhubarb; R.t += dt;
  const b0 = M.intent[0] || {}, b1 = M.intent[1] || {};
  for (let s = 0; s < 2; s++) {
    const sd = M.sides[s], it = M.intent[s] || {};
    if (sd.human && sd.ctl) { if (it.swing || it.power) { R.taps[s]++; R.bar += (s === 0 ? 1 : -1) * .045; BZ.sfx('punch'); } }
    else if (!sd.human || !sd.ctl) { R.cpuAcc = (R.cpuAcc || [0, 0]); R.cpuAcc[s] += dt * (3.2 + (s === 1 - M.half ? 1 : 0) * 0 + (M.attract ? 3 : 0) * (s === 0 ? 1 : 0) + rnd()); if (R.cpuAcc[s] >= 1) { R.cpuAcc[s] -= 1; R.taps[s]++; R.bar += (s === 0 ? 1 : -1) * .04; if (rnd() < .5) BZ.sfx('punch'); } }
  }
  R.bar = clamp(R.bar * (1 - dt * .15), -1, 1);
  if (R.t >= R.dur) {
    const w = R.bar > .02 ? 0 : R.bar < -.02 ? 1 : (rnd() < .5 ? 0 : 1);
    R.winner = w; M.sides[w].meter = 100; BZ.emit('rhubarbend', { winner: w }); BZ.emit('meterfull', { side: w });
    M.rhubarb = null; M.phase = 'rhubarbwin'; M.t = 0; M.rwin = w;
    setPhaseAfter(1.6, () => { forceWalkRunners(); endAtBat(true); });
  }
}
function setPhaseAfter(s, fn) { const g = My3D2dge.current; if (g) g.after(s, fn); else fn(); }

/* ---------------- stealing ---------------- */
BZ.trySteal = () => {
  const M = BZ.M; if (M.phase !== 'pitch' && M.phase !== 'windup') return false;
  if (M.steal) return false;
  const r = M.runners.filter(x => x.state === 'run' && x.dir === 0 && onBase(x) && Math.round(x.pos) < 3 && !M.runners.find(y => y !== x && y.state === 'run' && y.pos === x.pos + 1)).sort((a, c) => c.pos - a.pos)[0];
  if (!r) return false;
  M.steal = r; r.stealing = true; r.wasSteal = true; r.dir = 1; r.origin = Math.round(r.pos); r.floorBase = r.origin; BZ.emit('stealgo', { runner: r });
  return true;
};

/* ---------------- hazards (per park) ---------------- */
BZ.setupHazards = () => {
  const M = BZ.M, p = M.parkDef; M.hazards = [];
  if (p.hazard === 'magma') [[-250, -540], [260, -520], [-80, -620], [120, -430], [-300, -420]].forEach((h, i) => M.hazards.push({ kind: 'geyser', x: h[0], y: h[1], phase: i * 2.1, state: 'idle', t: 3 + i * 1.7 }));
  if (p.hazard === 'corn') M.hazards.push({ kind: 'corn', x: 470, y: -600, r: 70 });
  if (p.hazard === 'moon') M.hazards.push({ kind: 'crater', x: -210, y: -520, r: 46 }, { kind: 'crater', x: 250, y: -640, r: 38 });
  if (p.hazard === 'mega') M.hazards.push({ kind: 'drone', x: 0, y: -400, t: 0 });
};
function updateHazards(dt) {
  const M = BZ.M;
  for (const h of M.hazards) {
    if (h.kind === 'geyser') {
      h.t -= dt;
      if (h.state === 'idle' && h.t <= 0) { h.state = 'warn'; h.t = 1.2; }
      else if (h.state === 'warn' && h.t <= 0) { h.state = 'blast'; h.t = .7; BZ.emit('geyser', { h }); if (M.phase === 'play') for (const f of def().actors) if (hyp(f.x - h.x, f.y - h.y) < 26 && f.stun <= 0) { f.stun = 1.4; f.anim = 'burn'; f.animT = 0; BZ.emit('burn', { f }); } }
      else if (h.state === 'blast' && h.t <= 0) { h.state = 'idle'; h.t = 5 + (BZ.rng.fx() * 4); }
    } else if (h.kind === 'corn') {
      const b = M.ball;
      if (M.phase === 'play' && (b.state === 'hit' || b.state === 'loose') && b.landed && hyp(b.x - h.x, b.y - h.y) < h.r) { b.vx *= .1; b.vy *= .1; if (!h.lost) { h.lost = true; BZ.emit('lostincorn', {}); } }
      if (M.phase !== 'play') h.lost = false;
    } else if (h.kind === 'moon') { }
    else if (h.kind === 'crater') {
      const b = M.ball;
      if (M.phase === 'play' && (b.state === 'hit' || b.state === 'loose') && b.landed && hyp(b.x - h.x, b.y - h.y) < h.r) { b.vx *= .5; b.vy *= .5; }
    }
  }
}

/* ---------------- Home Run Derby (shares the pitch/bat/ball code) ---------------- */
BZ.newDerby = (o = {}) => {
  const players = o.players || [{ name: 'P1', ctl: null, human: true }];
  const M = BZ.newMatch({ park: o.park || 'corn', mode: 'derby', away: { team: 'hay', ctl: players[0].ctl, human: players[0].human }, home: { team: 'cin' }, seed: o.seed, innings: 99, noBetween: true });
  M.derby = { players: players.map(p => ({ name: p.name, ctl: p.ctl, human: p.human, hr: 0, dist: 0, best: 0, outs: 0, swings: 0, score: 0, streak: 0 })), cur: 0, outsMax: o.outs || 7, over: false, round: 1, pitches: 0, longest: 0, hub: !!o.hub, pitchSeq: o.pitchSeq || null, clockLimit: o.clockLimit || 0 };
  M.sides[0].human = true; M.sides[1].human = false;
  M.phase = 'intro'; M.noIntro = true;
  M.sides[0].ctl = players[0].ctl; M.sides[0].meter = 0;
  derbyPrep();
  return M;
};
function derbyPrep() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  M.sides[0].ctl = p.ctl; M.sides[0].human = p.human;
  M.batter = M.sides[0].actors[(D.cur * 2) % 9]; M.batter.x = M.batter.lefty ? 20 : -20; M.batter.y = -2; M.batter.facing = -PI / 2;
  M.half = 0; M.outs = 0; M.balls = 0; M.strikes = 0; M.runners = []; M.cur.u = 0; M.cur.v = 0;
  for (const a of M.sides[1].actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; }
  M.sides[1].actors.forEach(a => { if (a.pos !== 'P' && a.pos !== 'C') { a.x = 9999; a.y = 9999; } });
}
function derbyMachine() {
  // the machine throws the same sequence to every player in a hub round
  const M = BZ.M, D = M.derby, r = D.pitchSeq ? D.pitchSeq : BZ.rng.deal;
  const u = (r() - .5) * 1.4, v = (r() - .5) * .8;
  return { type: r() < .2 ? 'curve' : 'fast', u, v };
}
function derbyNext() {
  const M = BZ.M, D = M.derby; if (D.over) return;
  const mach = derbyMachine(); M.aim.u = mach.u; M.aim.v = mach.v; M.sel = G.ORDER.indexOf(mach.type);
  M.dMach = mach;
  M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.ball.state = 'none'; M.hold = false;
  D.pitches++;
}
function derbyNext2() { derbyAfterBall(); }
function derbyPitchEnd(r) { // a pitch the batter took or missed
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (r === 'whiff' || r === 'called') { if (r === 'whiff') { p.swings++; p.outs++; derbyCheckOver(); } else { /* a taken strike costs nothing */ } }
  else if (r === 'foul') { }
  M.strikes = 0; M.balls = 0;
}
function derbyHomer() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  p.hr++; p.streak++; const d = Math.round(BZ.feet(M.homerDist)); p.best = Math.max(p.best, d); D.longest = Math.max(D.longest, d);
  p.score += 100 + Math.round(d / 4) + (M.ball.bz ? 50 : 0) + p.streak * 10;
  M.derbyPopup = { t: 0, text: d + ' FT' };
  BZ.emit('derbyhr', { player: D.cur, dist: d });
}
function derbyOut(how) {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (how === 'foul') { M.phase = 'foul'; return; }
  p.outs++; p.streak = 0; BZ.emit('derbyout', { how }); derbyCheckOver();
  M.phase = 'call'; M.t = 0; M.derbyOutAt = M.clock; M.result = 'out';
}
function derbyPlayStep(dt) {
  const M = BZ.M, b = M.ball, D = M.derby;
  if (M.homer) return;
  // a ball that lands in the field without clearing the fence is an out for the batter once it rests or is caught
  if (b.landed && (b.vx === 0 && b.vy === 0 || hyp(b.vx, b.vy) < 8 || M.playTime > 5)) { if (M.phase === 'play') { derbyOut('inplay'); } }
  if (M.playTime > 9 && M.phase === 'play') derbyOut('inplay');
}
function derbyCheckOver() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (p.outs >= D.outsMax) {
    p.done = true;
    if (D.cur + 1 < D.players.length) { D.cur++; derbyPrep(); BZ.emit('derbynext', { player: D.cur }); M.sides[0].meter = 0; }
    else { D.over = true; M.over = true; M.phase = 'over'; BZ.emit('derbyover', {}); }
  }
}
function derbyAfterBall() {
  const M = BZ.M, D = M.derby; if (D.over) return;
  M.phase = 'call'; M.t = 0; M.result = 'hr'; M.ball.state = 'none';
}
// in the derby the "call" phase afterwards starts the next pitch
BZ.afterCallDerby = derbyNext;

/* ---------------- Spring Training lessons ---------------- */
BZ.applyLesson = (n) => {
  const M = BZ.M, L = BZ.get('lessons', n); if (!L) return;
  M.lessonSpec = L; M.lessonCount = 0;
  const s = L.setup;
  if (s.meter) { M.sides[0].meter = s.meter; M.sides[1].meter = 0; }
  if (s.role === 'field') M.autoPitch = true;
  if (s.role === 'bat' || s.role === 'run') { M.sides[0].human = true; M.sides[1].human = false; }
  else if (s.role === 'pitch' || s.role === 'field') { M.half = 1; M.sides[1].human = false; M.sides[0].human = false; M.sides[1].human = false; }
  M.noBetween = true;
};
BZ.lessonEvent = (ev) => {
  const M = BZ.M, L = M.lessonSpec; if (!L || M.lessonDone) return;
  const goal = L.goal;
  if (ev === goal || (goal === 'hit' && ev === 'homer') || (goal === 'strikeout' && ev === 'strikeout')) {
    M.lessonCount++; if (M.lessonCount >= L.need) { M.lessonDone = true; BZ.emit('lessondone', { lesson: L }); }
  }
};
