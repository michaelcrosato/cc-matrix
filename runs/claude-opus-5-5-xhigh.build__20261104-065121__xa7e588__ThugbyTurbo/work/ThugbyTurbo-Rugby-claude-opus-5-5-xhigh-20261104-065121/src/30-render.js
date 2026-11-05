/* ---- PRESENTATION: reads a view state V (the live match, an instant-replay frame or an online client's mirror, all with
 * the same fields) and draws it: rigs posed from each player's state, the ball, the stadium, hazards, lights, camera ---- */
const V3l = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** the rugby move set as attack specs (the engine's E.MOVES format), timed by the presentation */
const SPECS = TT.SPECS = {
  pass: { rel: true, hand: 'both', a0: 1.3, a1: -1.0, z0: -5, z1: -3, reach: 6.5, wind: .06, active: .08, recover: .16, lean: .15, twist: 1.2, blade: 0 },
  passL: { rel: true, hand: 'both', a0: 1.8, a1: -1.3, z0: -5, z1: -2, reach: 7, wind: .09, active: .09, recover: .2, lean: .2, twist: 1.8, lunge: 1, blade: 0 },
  dummy: { rel: true, hand: 'both', a0: 1.4, a1: .9, z0: -5, z1: -4, reach: 6, wind: .1, active: .04, recover: .16, lean: .15, twist: 1, blade: 0 },
  offload: { rel: true, hand: 'L', a0: .6, a1: -.5, z0: -4, z1: -2, reach: 6, wind: .04, active: .06, recover: .14, blade: 0 },
  fend: { rel: true, hand: 'L', a0: .1, a1: 0, z0: 0, z1: .5, r0: 3, r1: 9.5, wind: .05, active: .08, recover: .34, lean: .3, blade: 0, hold: .6 },
  tackle: { rel: true, hand: 'both', a0: .5, a1: 0, z0: -9, z1: -11, r0: 4, r1: 8, wind: .05, active: .1, recover: .24, lunge: 4, crouch: .7, lean: .7, blade: 0 },
  dive: { rel: true, hand: 'both', a0: .3, a1: 0, z0: -2, z1: -2, r0: 6, r1: 9, wind: .04, active: .25, recover: .2, blade: 0 },
  hit: { rel: true, hand: 'L', a0: .35, a1: 0, z0: -3, z1: -3, r0: 2, r1: 5, wind: .06, active: .08, recover: .34, lunge: 5, crouch: .3, lean: .65, twist: 1.4, blade: 0, hold: .5 },
  shoulder: { rel: true, hand: 'L', a0: .5, a1: .1, z0: -3, z1: -3, r0: 2, r1: 4, wind: .05, active: .07, recover: .24, lunge: 3, lean: .5, twist: 1.2, blade: 0 },
  lunge: { rel: true, hand: 'both', a0: .4, a1: 0, z0: -8, z1: -9, r0: 4, r1: 7, wind: .05, active: .1, recover: .2, lunge: 3, crouch: .6, lean: .6, blade: 0 },
  kick: Object.assign({}, E.MOVES.kick, { reach: 7, recover: .26 }),
  drop: Object.assign({}, E.MOVES.kick, { z0: .3, z1: 1.1, reach: 7, wind: .1, recover: .3, lean: -.15 }),
  placeKick: Object.assign({}, E.MOVES.kick, { z0: .3, z1: 1.25, reach: 7.5, wind: .16, active: .1, recover: .5, lean: -.3, hold: .8 }),
  throwIn: { rel: true, hand: 'both', plane: 'side', a0: 2.6, a1: .3, reach: 7, wind: .22, active: .08, recover: .22, lean: .2, blade: 0 },
  spin: { rel: true, hand: 'both', a0: .4, a1: .4, spin: true, z0: -6, z1: -6, reach: 5, wind: .04, active: .32, recover: .1, blade: 0 },
  jackal: { rel: true, hand: 'both', plane: 'side', a0: -1.2, a1: -1.3, reach: 7, wind: .06, active: .4, recover: .2, crouch: .8, lean: .8, blade: 0 },
  highCatch: { rel: true, hand: 'both', plane: 'side', a0: 1.4, a1: 1.2, reach: 7.5, wind: .02, active: .25, recover: .25, hop: 3, blade: 0 }
};
for (const k in SPECS) SPECS[k].name = k;
const mirrorSpec = (s, side) => side >= 0 ? s : (s._m || (s._m = Object.assign({}, s, { a0: -s.a0, a1: -s.a1, _m: null, name: s.name + 'M' })));
const specState = (spec, e) => {
  const tot = spec.wind + spec.active + spec.recover;
  if (e < 0 || e > tot) return null;
  if (e < spec.wind) return { spec, phase: 'wind', u: e / spec.wind };
  if (e < spec.wind + spec.active) return { spec, phase: 'active', u: (e - spec.wind) / spec.active };
  return { spec, phase: 'recover', u: Math.min(1, (e - spec.wind - spec.active) / spec.recover) };
};
const BALL_SIDE = E.sprite(['..hhhhh..', '.hbbwbbh.', 'hbbwwwbbh', 'dbbbwbbbd', '.dbbbbbd.', '..ddddd..'], { h: '#c08a5a', b: '#8a5a32', w: '#f4f0e0', d: '#5a3a1e' });
const BALL_END = E.sprite(['.hhh.', 'hbwbh', 'hbbbd', 'dbbbd', '.ddd.'], { h: '#c08a5a', b: '#8a5a32', w: '#f4f0e0', d: '#5a3a1e' });
const STARS = [E.sprite(['..y..', '.yYy.', '..y..'], { y: '#f0d040', Y: '#ffffff' }), E.sprite(['y...y', '..Y..', 'y...y'], { y: '#f0d040', Y: '#ffffff' })];
TT.BALL_SPR = BALL_SIDE;
/** dress a rig from a roster entry and a kit */
TT.makeRig = (d, kit, o = {}) => {
  const rig = new E.Humanoid(Object.assign({
    size: d.size || 1.1, build: d.build || 'heroic', weapon: null, outfit: d.outfit || 'shirt', sleeves: 'short', hair: d.hair || 'short', hat: d.hat || null, hunch: d.hunch || 0,
    colors: Object.assign({ skin: d.skin || '#e0b090', hair: d.hairC || '#3a2a1a', cloth: kit.cloth, coat: kit.coat || kit.cloth, trim: kit.trim, pants: kit.pants, boot: kit.boot || '#1a1410', belt: kit.trim, glove: d.skin || '#e0b090' }, d.colors || {})
  }, o));
  rig._base = Object.assign({}, rig.C);
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); if (this._tt) TT.poseFix(this, this._tt); };
  return rig;
};
/** the poses the engine has no word for: the ball carried in the crook of the arm, two hands ready, arms up (the lineout),
 *  aeroplane arms (a try), the referee's arm signals */
TT.poseFix = (rig, P) => {
  const J = rig.J, o = rig.o, L = o.armUpper + o.armLower;
  if (!J.shL || !J.hipC) return;
  if (P.carry > 0) {
    const w = P.carry, hip = J.hipC, sh = J.shL;
    J.handL = V3l(J.handL, [hip[0] + 2.6, -.9, hip[2] + o.torso * .42], w);
    J.elbowL = V3l(J.elbowL, [sh[0] - .4, sh[1] - .7, sh[2] - o.armUpper * .9], w);
  }
  if (P.two > 0) {
    const w = P.two, c = J.shC;
    J.handL = V3l(J.handL, [c[0] + 4.2, -1.3, c[2] - 3.5], w); J.handR = V3l(J.handR, [c[0] + 4.2, 1.3, c[2] - 3.5], w);
    J.elbowL = V3l(J.elbowL, [c[0] + 1.8, -2.6, c[2] - 4.5], w); J.elbowR = V3l(J.elbowR, [c[0] + 1.8, 2.6, c[2] - 4.5], w);
  }
  if (P.up > 0) {
    const w = P.up;
    J.handL = V3l(J.handL, [J.shL[0] + .8, J.shL[1] - .6, J.shL[2] + L * .95], w); J.handR = V3l(J.handR, [J.shR[0] + .8, J.shR[1] + .6, J.shR[2] + L * .95], w);
    J.elbowL = V3l(J.elbowL, [J.shL[0] + .5, J.shL[1] - 1, J.shL[2] + L * .45], w); J.elbowR = V3l(J.elbowR, [J.shR[0] + .5, J.shR[1] + 1, J.shR[2] + L * .45], w);
  }
  if (P.aero > 0) {
    const w = P.aero;
    J.handL = V3l(J.handL, [J.shL[0], J.shL[1] - L * .95, J.shL[2] + 1], w); J.handR = V3l(J.handR, [J.shR[0], J.shR[1] + L * .95, J.shR[2] - 1], w);
    J.elbowL = V3l(J.elbowL, [J.shL[0], J.shL[1] - L * .48, J.shL[2] + .6], w); J.elbowR = V3l(J.elbowR, [J.shR[0], J.shR[1] + L * .48, J.shR[2]], w);
  }
  if (P.armR) {   // the referee: 'up' (a try, a card held high), 'out' (advantage), 'pen' (out and up)
    const a = P.armR, e = a === 'up' ? [.6, .4, L * .98] : a === 'out' ? [L * .55, L * .7, 0] : [L * .5, L * .55, L * .55];
    J.handR = [J.shR[0] + e[0], J.shR[1] + e[1], J.shR[2] + e[2]];
    J.elbowR = [J.shR[0] + e[0] * .5, J.shR[1] + e[1] * .5 + .4, J.shR[2] + e[2] * .5];
  }
};
const CELES = ['cheer', 'aero', 'guard', 'hips', 'bow', 'slide'];
class Pres {
  /** the presentation of one match: its rigs and their animation clocks, the camera, the crowd's mood */
  constructor(m) {
    this.m = m; this.t = 0; this.excite = 0; this.cheer = 0; this.boo = 0; this.cheerTeam = 0; this.wave = 0;
    this.stadium = Stadium.get(m.venue.id, m.teamIds[0]);
    this.rigs = m.players.map(p => TT.makeRig(p.d, m.kits[p.team]));
    this.A = m.players.map(() => ({ act: '', t: 9, lastSt: '', lastStT: 0, carry: 0, two: 0, up: 0, aero: 0, sq: 0, seen: 0 }));
    this.refRig = TT.makeRig(TT.CAST.nigel, { cloth: '#1a1a1e', trim: '#3ac850', pants: '#1a1a1e', boot: '#0e0e10' }, { hair: 'short' });
    this.refA = { armR: null };
    this.fxT = 0; this.punch = 0; this.letter = 0; this.flashT = 0;
    this.camZoom = 1; this.kickFrame = false;
    if (TT.cheats.bigHeads || (TT.game && TT.game.settings && TT.game.settings.bigHeads)) this.bigHeads(true);
  }
  bigHeads(on) { for (const r of this.rigs.concat(this.refRig)) { if (r._headR === undefined) r._headR = r.o.headR; r.o.headR = on ? r._headR * 1.8 : r._headR; } }
  /** pose every rig from its player's state (V: the view state) */
  update(dt, V) {
    this.t += dt;
    const ball = V.ball;
    V.players.forEach((p, i) => {
      const rig = this.rigs[i], A = this.A[i];
      if (p.st === 'off') return;
      // an action (re)started: its clock back to zero
      const act = p.a.act || '';
      if (act !== A.act || (p.stT < A.lastStT - .01) || p.st !== A.lastSt) { if (act !== A.act || p.st !== A.lastSt) A.t = 0; }
      A.act = act; A.lastSt = p.st; A.lastStT = p.stT; A.t += dt;
      const has = ball.st === 'held' && ball.holder === p.id;
      A.carry = approach(A.carry, has && p.st !== 'pass' && p.st !== 'kick' ? 1 : 0, dt * 8);
      A.two = approach(A.two, has && p.st === 'free' && p.ctl >= 0 && (p.I && (p.I.hd.l1 || p.I.hd.r1)) ? 1 : 0, dt * 10);
      const s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.f };
      let up = 0, aero = 0;
      const spec = (name, side = 1) => specState(mirrorSpec(SPECS[name], side), A.t);
      switch (p.st) {
        case 'free': case 'pass': case 'kick': case 'step': case 'spin': case 'stumble': case 'lunge':
          if (p.st === 'pass') s.attack = spec(act === 'passL' ? 'passL' : act === 'dummy' ? 'dummy' : act === 'offload' ? 'offload' : 'pass', this.passSide(p, V));
          else if (p.st === 'kick') s.attack = spec(act === 'placeKick' ? 'placeKick' : act === 'drop' ? 'drop' : 'kick');
          else if (p.st === 'spin') s.attack = spec('spin');
          else if (p.st === 'lunge') s.attack = spec(act === 'hit' ? 'hit' : act === 'shoulder' ? 'shoulder' : act === 'whiff' || act === 'lunge' ? 'lunge' : 'tackle');
          else if (p.st === 'step') { s.dash = true; s.vx = p.vx; s.vy = p.vy; }
          else if (p.st === 'stumble') s.hurt = true;
          if (!s.attack && p.fendT > 0) s.attack = specState(SPECS.fend, Math.min(.2, SPECS.fend.wind + SPECS.fend.active * .99));
          if (!s.attack && act === 'fend' && A.t < .45) s.attack = spec('fend');
          if (!s.attack && act === 'highCatch' && A.t < .5) s.attack = spec('highCatch');
          if (!s.attack && act === 'throwIn' && A.t < .5) s.attack = spec('throwIn');
          if (p.charge >= 0) { s.stance = 'guard'; s.sprint = true; }
          if (p.turboOn && Math.hypot(p.vx, p.vy) > 60) s.sprint = true;
          if (p.a.sad) s.expr = 'wince';
          break;
        case 'dive': s.down = .9; s.attack = spec('dive'); break;
        case 'tdive': s.down = 1; s.expr = 'shout'; break;
        case 'down': s.down = 1; s.expr = act === 'launch' || act === 'landed' || act === 'flat' ? 'wince' : null; break;
        case 'up': s.down = 0; break;
        case 'launch': s.air = true; s.flip = clamp(p.a.flip, 0, .999); s.expr = 'shout'; break;
        case 'stun': s.hurt = true; s.expr = 'wince'; break;
        case 'cele': {
          const k = CELES[(p.a.cele || 0) % CELES.length];
          s.expr = 'shout';
          if (k === 'aero') { aero = 1; s.vx = Math.cos(this.t * 2 + i) * 30; s.vy = Math.sin(this.t * 2 + i) * 30; s.facing = Math.atan2(s.vy, s.vx); }
          else if (k === 'slide') s.down = A.t < 1.2 ? .4 : 0;
          else if (k === 'bow') s.pose = A.t % 2 < 1 ? 'kneel' : 'hips';
          else s.pose = k;
          break;
        }
        case 'ruck': s.pose = 'crouch'; s.run = .55; s.lean = .4; if (act === 'jackal') s.attack = spec('jackal'); break;
        case 'set':
          if (act === 'lift') { up = 1; s.air = p.z > 6; }
          else if (act === 'hang') { s.pose = 'crouch'; s.run = .8; }
          else { s.pose = 'crouch'; s.run = V.setp && V.setp.sub === 'push' ? .7 : 0; }
          break;
        case 'bin': s.pose = 'kneel'; s.expr = 'angry'; break;
      }
      if (V.phase === 'scrum' && p.slot === 1 && p.st === 'set') { s.pose = 'crouch'; }
      A.up = approach(A.up, up, dt * 8); A.aero = approach(A.aero, aero, dt * 6);
      rig._tt = { carry: A.carry, two: A.two, up: A.up, aero: A.aero };
      // mud builds up on the kits at Muddington; the flame-grilled are briefly blackened
      if (p.mud > 0 || p.toast > 0) { const b = rig._base, k = Math.min(.6, p.mud || 0); rig.C.cloth = E.mix ? E.mix(b.cloth, '#5a3a1e', k) : b.cloth; rig.C.pants = E.mix ? E.mix(b.pants, '#4a2e18', k) : b.pants; if (p.toast > 0) { p.toast -= dt; rig.C.skin = '#3a3030'; rig.C.cloth = '#2a2a2a'; } else rig.C.skin = b.skin; rig.C.clothDk = E.shade(rig.C.cloth, -.3); rig.C.clothLt = E.shade(rig.C.cloth, .25); }
      if (TT.cfg.present) rig.update(dt, s);
    });
    // the referee: runs, faces the ball, signals
    const R = V.ref, ra = R.sigT > 0 || R.signal ? (R.signal === 'try' || R.signal === 'card' ? 'up' : R.signal === 'advantage' ? 'out' : R.signal === 'penalty' ? 'pen' : null) : null;
    this.refRig._tt = { armR: ra };
    if (TT.cfg.present) this.refRig.update(dt, { x: R.x, y: R.y, z: 0, vx: R.vx, vy: R.vy, facing: R.f, down: R.down > 0 ? 1 : 0, expr: R.callT > 0 ? 'shout' : null });
    this.excite = approach(this.excite, this.targetExcite(V), dt * .8);
    this.cheer = Math.max(0, this.cheer - dt); this.boo = Math.max(0, this.boo - dt); this.punch = Math.max(0, this.punch - dt * 4);
    if (V.phase !== 'play' && V.phase !== 'ruck' && V.phaseT > 8) this.wave += dt * 160; else this.wave = -999;
  }
  passSide(p, V) { const b = V.ball; if (b.st !== 'air') return p.a.side || 1; const a = Math.atan2(b.vy, b.vx); return angDiff(p.f, a) > 0 ? -1 : 1; }
  targetExcite(V) {
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    if (!c) return .25;
    const toLine = Math.abs((V.dir[c.team] > 0 ? G.X1 : G.X0) - c.x);
    return clamp(.3 + (toLine < 250 ? (250 - toLine) / 250 * .6 : 0) + (c.turboOn ? .1 : 0), 0, 1);
  }
  /* ---------------------------------------------------------------- the camera */
  camera(dt, V, game, o = {}) {
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    let fx = c ? c.x : b.x, fy = c ? c.y : b.y, fz = 10;
    const att = c ? c.team : (V.poss || 0);
    if (V.phase === 'scrum' || V.phase === 'lineout' || V.phase === 'ruck' || V.phase === 'penalty') { const S = V.setp; if (S) { fx = S.x; fy = S.kind === 'lineout' ? S.ty + S.s * 70 : S.y; } }
    if (V.phase === 'kickoff' || V.phase === 'dropout') { const S = V.setp; if (S && S.aim) { fx = lerp(fx, S.aim.x, .35); fy = lerp(fy, S.aim.y, .35); } }
    fx += (V.dir[att] || 1) * 40 * (V.phase === 'play' ? 1 : 0);
    fy = lerp(fy, G.CY, .25);
    if (b.st === 'air' && b.kind !== 'pass' && b.land && b.vz !== 0 && Math.hypot(b.land.x - b.x, b.land.y - b.y) > 60) { fx = (b.x + b.land.x) / 2; fy = lerp((b.y + b.land.y) / 2, G.CY, .2); this.kickFrame = true; } else this.kickFrame = false;
    if (o.focus) { fx = o.focus.x; fy = o.focus.y; }
    game.focus(fx, fy, fz);
  }
  /* ---------------------------------------------------------------- drawing */
  draw(r, V, o = {}) {
    const S = this.stadium, Vn = S.V, view = E.charView(r.view);
    this.drawSky(r, V);
    S.map.drawFloor(r);
    // ground marks: the ref's eyes, offside lines, the landing ring, the seat rings, the kick-off reticle, lineout pods
    if (o.refCone && V.ref.down <= 0 && (V.phase === 'play' || V.phase === 'ruck')) r.sightCone({ x: V.ref.x, y: V.ref.y, z: 0, facing: V.ref.f }, { range: TUNE.v.refRange, fov: TUNE.v.refFov, alpha: .14, color: '#fff0a0' });
    this.groundMarks(r, V, o);
    S.map.queueWalls(r);
    this.drawCrowd(r, V);
    this.drawBoards(r, V);
    this.drawPosts(r, V);
    this.drawDressing(r, V);
    this.drawHazards(r, V);
    this.drawPowerups(r, V);
    // the players, the referee, the ball
    V.players.forEach((p, i) => {
      if (p.st === 'off') return;
      const rig = this.rigs[i];
      if (p.st === 'bin') { this.drawBinned(r, p, rig, view); return; }
      r.shadow(p.x, p.y, 6 * p.size, p.z > 4 ? .2 : .35);
      const fire = p.fire > 0 || (p.sup && p.sup.kind === 'thunder'), glow = p.charge >= 0 ? (p.chargeT > 1.2 ? '#ff4030' : '#ffe08a') : null;
      const ctl = p.ctl >= 0 || (V.ball.st === 'held' && V.ball.holder === p.id);
      const zap = p.zap > 0 && Math.floor(this.t * 20) % 2;
      r.actor(p.x, p.y, p.z, (g, ox, oy) => (zap ? this.skeleton(rig) : rig).draw(g, ox, oy, view), {
        xray: ctl ? { actors: true, color: ctl && p.ctl >= 0 ? (o.seatColor && o.seatColor(p.ctl)) || '#ffe08a' : '#ffffff' } : false,
        flash: glow || (p.pu && p.pu.kind === 'iron' ? '#a0b0c8' : p.pu && p.pu.kind === 'grease' && Math.floor(this.t * 8) % 2 ? '#e8e070' : false), flashMix: glow ? .35 + .25 * Math.sin(this.t * 20) : .3,
        ghost: fire || (p.sup && p.sup.kind === 'hurricane') || p.st === 'launch' ? { color: fire ? '#ff8030' : '#a0d0ff', life: .25, alpha: .5, owner: p } : null,
        emissive: false, pick: { kind: 'player', id: p.id }
      });
      if (p.zap > 0) p.zap -= 1 / 60;
      if (p.st === 'stun' || (p.st === 'down' && p.a.act === 'landed')) r.sprite(p.x, p.y, p.z + 34 * p.size, STARS[Math.floor(this.t * 6) % 2], { anchor: 'center' });
    });
    const R = V.ref;
    r.shadow(R.x, R.y, 6, .35);
    r.actor(R.x, R.y, 0, (g, ox, oy) => this.refRig.draw(g, ox, oy, view));
    if (R.signal === 'card' && R.sigT > 0) r.queue(R.x, R.y, 46, g => { const [x, y] = r.w(R.x + 3, R.y, 46); px.rect(g, Math.round(x) - 2, Math.round(y) - 6, 5, 7, R.card === 'red' ? '#e83030' : '#f0d020'); px.rect(g, Math.round(x) - 2, Math.round(y) - 6, 5, 1, '#ffffff'); }, { bias: 2 });
    this.drawBall(r, V);
    // off-screen arrows at the screen's edge: the ball, and each controlled player in his seat's colour
    if (r.visible && r.marker && V.phase !== 'setkick') {
      const b = V.ball; if (!r.visible(b.x, b.y, b.z) && b.st !== 'dead') r.marker(b.x, b.y, b.z, { color: '#ffffff', label: 'BALL' });
      for (const p of V.players) if (p.ctl >= 0 && p.st !== 'bin' && p.st !== 'off' && !r.visible(p.x, p.y, p.z + 20)) r.marker(p.x, p.y, p.z + 20, { color: (o.seatColor && o.seatColor(p.ctl)) || '#ffe060', label: o.seatLabel ? o.seatLabel(p.ctl) : '' });
    }
    this.lights(r, V);
  }
  skeleton(rig) {
    if (!this._skel) this._skel = new E.Humanoid({ build: 'skeleton', size: 1.15, weapon: null });
    this._skel.update(1 / 60, { x: rig.x, y: rig.y, z: rig.z, facing: rig.facing, hurt: true });
    return this._skel;
  }
  drawBinned(r, p, rig, view) {
    // the sin bin: the binned player sulks inside the dumpster on the touchline
    r.actor(p.x, p.y, 4, (g, ox, oy) => rig.draw(g, ox, oy, view));
  }
  drawBall(r, V) {
    const b = V.ball;
    if (b.st === 'held' && V.players[b.holder]) {
      const p = V.players[b.holder], rig = this.rigs[b.holder];
      if (TT.cfg.present && rig.J && rig.J.handL && p.st !== 'set') { const [hx, hy, hz] = rig.hand('L'); r.sprite(hx, hy, hz - 2, BALL_SIDE, { anchor: 'center', rot: p.f, bias: 1 }); return; }
    }
    if (b.st === 'dead' && V.phase !== 'setkick' && V.phase !== 'kickoff' && V.phase !== 'dropout' && V.phase !== 'scrum' && V.phase !== 'lineout' && V.phase !== 'penalty') return;
    r.shadow(b.x, b.y, 3 - Math.min(1.5, b.z * .03), .4);
    const kickish = b.st === 'air' && b.kind !== 'pass';
    const spr = kickish && Math.abs(Math.sin(b.rot)) > .6 ? BALL_END : BALL_SIDE;
    r.sprite(b.x, b.y, b.z + 3, spr, { anchor: 'center', rot: kickish ? 0 : (b.st === 'air' ? Math.atan2(b.vy, b.vx) : b.rot * .3), glow: b.mega ? .8 : 0 });
    if (b.mega && b.st === 'air') r.queue(b.x, b.y, b.z + 3, g => { const [x, y] = r.w(b.x, b.y, b.z + 3); r.glowDisc(g, x, y, 8, '#ff8030', .7); }, { emissive: true });
  }
  /** decals on the grass */
  groundMarks(r, V, o) {
    const b = V.ball, S = V.setp;
    r.decal(g => {
      // the landing ring of every kick, both teams
      if (b.st === 'air' && b.kind !== 'pass' && b.land) { const k = .6 + .4 * Math.sin(this.t * 10); r.groundRing(b.land.x, b.land.y, 10 + 3 * k, '#ffe060', .8); r.groundRing(b.land.x, b.land.y, 4, '#ffffff', .6); }
      // offside lines at rucks, scrums and lineouts (dashed, team colour)
      if (S && (S.kind === 'ruck' || S.kind === 'scrum' || S.kind === 'lineout')) for (const t of [0, 1]) {
        const d = V.dir[t], ox = S.kind === 'lineout' ? S.x - d * G.L10 : S.x - d * (S.kind === 'scrum' ? 22 : 16), col = V.kits[t].cloth;
        for (let y = G.Y0; y < G.Y1; y += 16) { const [x0, y0] = r.w(ox, y, 0), [x1, y1] = r.w(ox, y + 8, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col, 1); }
      }
      if (S && S.kind === 'ruck') r.groundRing(S.x, S.y, 16, '#ffffff', .25);
      // USE IT: a countdown ring round the ball at the base
      if (V.useIt > 0 && b.st === 'held') { const k = V.useIt / 3; r.groundArc(b.x, b.y, 9, 11, -PI / 2, -PI / 2 + TAU * k, '#ff8040', .8); }
      // the kick-off reticle and the lineout pods
      if (S && (S.kind === 'kickoff' || S.kind === 'dropout') && S.aim) { r.groundRing(S.aim.x, S.aim.y, 14, '#ffe060', .9); r.groundRing(S.aim.x, S.aim.y, 6, '#ffffff', .8); }
      if (S && S.kind === 'lineout') for (let k = 0; k < 3; k++) { const py = S.ty + S.s * (G.L5 + 16 * k), mine = o.myTeam !== undefined ? S.calls[o.myTeam] === k : false; r.groundRing(S.x, py, 7, mine ? '#ffe060' : '#ffffff', mine ? .9 : .35); }
      // the controlled players' rings in their seat colours
      for (const p of V.players) if (p.ctl >= 0 && p.st !== 'bin' && p.st !== 'off') { const c = (o.seatColor && o.seatColor(p.ctl)) || '#ffe060'; r.groundRing(p.x, p.y, 8 * p.size, c, .9); r.groundRing(p.x, p.y, 9 * p.size, '#000000', .3); }
      for (const q of V.powerups) if (q.on && !q.taken) r.groundRing(q.x, q.y, 9 + Math.sin(this.t * 6) * 2, '#fff0a0', .5);
    });
  }
  drawSky(r, V) {
    const Vn = this.stadium.V, night = V.time === 'night', dusk = V.time === 'dusk';
    const sky = V.time === Vn.time ? Vn.sky : night ? ['#06060e', '#141428', '#2a2a48'] : dusk ? ['#2a2a5a', '#c8603a', '#f0a050'] : ['#7aa0c8', '#a8c4dc', '#d0dce4'];
    r.sky(sky);
    // the skyline above the far stand's top edge, wherever the camera is
    const [, topY] = r.w(G.CX, 0, 54);
    const k = Vn.skyline, cols = Vn.skyCol;
    const W = r.W;
    this.skylineY = topY;
    r.queue(G.CX, -40, 0, gg => {
      const [sx0] = r.w(0, 0, 0), y0 = Math.round(topY);
      if (y0 < -10 || (r.view.yawDeg || 0) !== 0) return;
      const R = (n) => E.hash2(n, 3);
      if (k === 'hills') {
        for (let x = 0; x < W; x += 2) { const wx = x - sx0 * .3, h = 14 + Math.sin(wx * .012) * 8 + Math.sin(wx * .031) * 4; px.rect(gg, x, y0 - h, 2, h + 2, cols[0]); }
        for (let x = 0; x < W; x += 2) { const wx = x - sx0 * .5, h = 8 + Math.sin(wx * .02 + 2) * 5; px.rect(gg, x, y0 - h, 2, h + 2, cols[1]); }
        const sx = Math.round(W * .7 - sx0 * .3 % W); px.rect(gg, sx, y0 - 34, 3, 26, '#4a4a52'); px.poly(gg, [[sx - 2, y0 - 34], [sx + 5, y0 - 34], [sx + 1.5, y0 - 46]], '#3a3a42');
      } else if (k === 'docks') {
        for (let i = 0; i < 6; i++) { const x = Math.round(((i * 97 - sx0 * .4) % (W + 80) + W + 80) % (W + 80) - 40); px.rect(gg, x, y0 - 40, 3, 40, cols[1]); px.rect(gg, x - 18, y0 - 40, 36, 3, cols[1]); px.line(gg, x + 14, y0 - 38, x + 14, y0 - 22, cols[1], 1); }
        const lx = Math.round(W * .15 - sx0 * .2 % W); px.rect(gg, lx, y0 - 30, 6, 30, '#e8e0d0'); px.rect(gg, lx, y0 - 24, 6, 4, '#c83a2a'); px.rect(gg, lx - 1, y0 - 34, 8, 4, '#f0d060');
        for (let i = 0; i < 5; i++) { const gx = (this.t * 12 + i * 70) % W, gy = y0 - 50 + Math.sin(this.t * 2 + i) * 6; px.line(gg, gx - 3, gy, gx, gy + 2, '#f0f0f0', 1); px.line(gg, gx, gy + 2, gx + 3, gy, '#f0f0f0', 1); }
      } else if (k === 'chimneys') {
        for (let i = 0; i < 7; i++) { const x = Math.round(((i * 71 - sx0 * .35) % (W + 60) + W + 60) % (W + 60) - 30), h = 30 + R(i) * 30; px.rect(gg, x, y0 - h, 8, h, cols[0]); px.rect(gg, x - 1, y0 - h, 10, 3, '#2a1a1a'); const sp = (this.t * 20 + i * 13) % 30; px.dot(gg, x + 3 + Math.sin(this.t + i) * 2, y0 - h - sp, sp < 10 ? '#ffb040' : '#5a4040'); }
        px.rect(gg, 0, y0 - 4, W, 4, '#5a1a0e');
      } else if (k === 'city') {
        for (let i = 0; i < 14; i++) { const x = Math.round(((i * 37 - sx0 * .3) % (W + 40) + W + 40) % (W + 40) - 20), h = 24 + R(i) * 50, w = 14 + R(i + 9) * 12; px.rect(gg, x, y0 - h, w, h, cols[i % 3]); for (let wy = y0 - h + 4; wy < y0 - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (E.hash2(wx, wy) > .55) px.dot(gg, wx, wy, '#f0d880'); }
        const gx = Math.round(W * .55 - sx0 * .3 % W); E.font.text(gg, 'GOLDBRICK', gx, y0 - 70, '#e8c040', { font: 'tiny', outline: '#000' });
      }
    }, { bias: -9999 });
  }
  drawCrowd(r, V) {
    const S = this.stadium, k1 = V.kits[0], k2 = V.kits[1], t = this.t, ex = this.excite, cheer = this.cheer, ct = this.cheerTeam, wave = this.wave;
    const rows = [[], [], [], [], []];
    for (const f of S.crowd) rows[f.row].push(f);
    rows.forEach((L, ri) => {
      if (!L.length) return;
      const f0 = L[0], end = f0.end !== undefined;
      const qy = end ? G.CY : f0.y, qx = end ? (f0.end < 0 ? 20 : G.COLS * T - 20) : G.CX;
      r.queue(qx, qy, f0.z, g => {
        for (const f of L) {
          const mine = f.home ? 0 : 1, jump = (cheer > 0 && mine === ct) ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 : 0;
          const wv = wave > 0 && Math.abs(f.x - (wave % (G.COLS * T))) < 30 ? 4 : 0;
          const bob = Math.sin(t * (2 + ex * 6) + f.ph) * (.4 + ex * 1.2) + jump + wv;
          const [x, y] = r.w(f.x, f.y, f.z + bob), X = Math.round(x), Y = Math.round(y);
          const kit = mine ? k2 : k1, shirt = f.shade < .6 ? kit.cloth : f.shade < .85 ? kit.trim : '#e8e0d0';
          px.rect(g, X - 2, Y - 5, 4, 5, shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin);
          if (f.hat) px.rect(g, X - 2, Y - 9, 4, 1, kit.cloth);
          if ((jump > 1 || wv) && (f.ph * 10 | 0) % 2) { px.dot(g, X - 3, Y - 8, f.skin); px.dot(g, X + 2, Y - 8, f.skin); }
          if (f.flag) { px.rect(g, X + 2, Y - 14, 1, 9, '#d8d8d8'); px.rect(g, X + 3, Y - 14, 5, 4, kit.cloth); px.rect(g, X + 3, Y - 12, 5, 1, kit.trim); }
        }
      }, { bias: ri < 3 ? 1 : 1 });
    });
  }
  /** sponsor boards along the far touchline, their text facing the camera */
  drawBoards(r, V) {
    const B = this.stadium.V.boards, segW = 160, y = 3 * T + T, z = 6;
    for (let i = 0, x = 2 * T + 8; x < (G.COLS - 2) * T - 8; x += segW, i++) {
      const [name, bg, fg] = B[i % B.length], x0 = x, x1 = Math.min(x + segW - 4, (G.COLS - 2) * T - 8);
      r.queue((x0 + x1) / 2, y + .5, z, g => {
        const [ax, ay] = r.w(x0, y, 12), [bx] = r.w(x1, y, 12), [, by] = r.w(x0, y, 0);
        const X0 = Math.round(ax), X1 = Math.round(bx), Y0 = Math.round(ay), Y1 = Math.round(by);
        const led = V.phase === 'try' && Math.floor(this.t * 6) % 2;
        px.rect(g, X0, Y0, X1 - X0, Y1 - Y0, led ? '#f0d040' : bg); px.rect(g, X0, Y0, X1 - X0, 1, E.shade(bg, .3)); px.rect(g, X0, Y1 - 1, X1 - X0, 1, E.shade(bg, -.4));
        const txt = led ? 'TRY!' : name, s = E.font.width(txt, { font: 'tiny' }) < X1 - X0 - 4 ? 'tiny' : 'tiny';
        E.font.text(g, txt, (X0 + X1) / 2, Y0 + Math.max(1, ((Y1 - Y0) - 5) / 2), led ? '#202020' : fg, { align: 'center', font: s, outline: false });
      }, { bias: 3 });
    }
  }
  /** the goalposts: padded uprights, crossbar; depth sorted with the ball */
  drawPosts(r, V) {
    for (const gx of [G.X0, G.X1]) {
      for (const py of [G.CY - G.POSTW, G.CY + G.POSTW]) r.queue(gx, py, 0, g => {
        const [x, y0] = r.w(gx, py, 0), [, y1] = r.w(gx, py, G.POSTH), [, yp] = r.w(gx, py, 20), X = Math.round(x);
        px.rect(g, X - 1, Math.round(y1), 2, Math.round(y0 - y1), '#f4f4f0'); px.rect(g, X, Math.round(y1), 1, Math.round(y0 - y1), '#c8c8c8');
        const pad = V.kits[0].cloth; px.rect(g, X - 3, Math.round(yp), 6, Math.round(y0 - yp), pad); px.rect(g, X - 3, Math.round(yp), 2, Math.round(y0 - yp), E.shade(pad, .25)); px.rect(g, X + 1, Math.round(yp), 2, Math.round(y0 - yp), E.shade(pad, -.3));
      }, { hides: false });
      r.queue(gx, G.CY + G.POSTW, G.BAR, g => { const [x0, y0] = r.w(gx, G.CY - G.POSTW, G.BAR), [x1, y1] = r.w(gx, G.CY + G.POSTW, G.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
    }
  }
  drawDressing(r, V) {
    const t = this.t;
    // corner flags
    for (const x of [G.DX0, G.X0, G.X1, G.DX1]) for (const y of [G.Y0, G.Y1]) r.queue(x, y, 0, g => { const [X, Y] = r.w(x, y, 0), [, Yt] = r.w(x, y, 16); px.rect(g, Math.round(X), Math.round(Yt), 1, Math.round(Y - Yt), '#e8e8e8'); const fl = Math.sin(t * 6 + x) > 0 ? 1 : 0; px.rect(g, Math.round(X) + 1, Math.round(Yt), 4 + fl, 3, x === G.X0 || x === G.X1 ? '#e83a3a' : '#f0d040'); });
    // the sin bin: a green dumpster stencilled SIN BIN
    const bx = G.CX + 60, by = G.Y1 + 30;
    r.queue(bx, by + 8, 0, g => {
      r.box(g, bx - 18, by - 8, 0, bx + 18, by + 8, 16, '#3a7a3a', '#2a5a2a');
      const [x, y] = r.w(bx, by + 8, 10); E.font.text(g, 'SIN BIN', Math.round(x), Math.round(y) - 3, '#e8f0d0', { align: 'center', font: 'tiny', outline: false });
      const [lx0, ly0] = r.w(bx - 19, by - 9, 17), [lx1] = r.w(bx + 19, by - 9, 17); px.rect(g, Math.round(lx0), Math.round(ly0) - 2, Math.round(lx1 - lx0), 2, '#1e4a1e');
    }, { bias: 2 });
    // the dugouts, water bottles, kit bags and the cameramen on the near touchline
    for (const [dx, col] of [[-170, V.kits[0].cloth], [170, V.kits[1].cloth]]) {
      const x = G.CX + dx, y = G.Y1 + 70;
      r.queue(x, y, 0, g => { r.box(g, x - 34, y - 6, 0, x + 34, y + 6, 18, E.shade(col, -.2), E.shade(col, -.45)); const [X, Y] = r.w(x, y + 6, 6); E.font.text(g, dx < 0 ? 'HOME' : 'AWAY', Math.round(X), Math.round(Y) - 6, '#ffffff', { align: 'center', font: 'tiny', outline: false }); });
      for (let k = 0; k < 4; k++) r.queue(x - 24 + k * 5, G.Y1 + 44, 0, g => { const [X, Y] = r.w(x - 24 + k * 5, G.Y1 + 44, 0); px.rect(g, Math.round(X), Math.round(Y) - 5, 2, 5, k % 2 ? '#3ab0e8' : '#e8e8f0'); });
    }
    // floodlight towers on the far corners (lamps lit at dusk and night)
    for (const x of [24, G.COLS * T - 24]) r.queue(x, 20, 0, g => {
      const [X, Y] = r.w(x, 20, 0), [, Yt] = r.w(x, 20, 170), xi = Math.round(X);
      px.rect(g, xi - 1, Math.round(Yt), 3, Math.round(Y - Yt), '#5a5a64'); px.rect(g, xi - 1, Math.round(Yt), 1, Math.round(Y - Yt), '#7a7a84');
      const lit = V.time !== 'day';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) px.rect(g, xi - 7 + j * 4, Math.round(Yt) - 10 + i * 3, 3, 2, lit ? '#fff8d0' : '#a8a8b0');
      px.rect(g, xi - 8, Math.round(Yt) - 1, 17, 1, '#3a3a44');
    }, { emissive: V.time !== 'day', bias: -5 });
    // the jumbotron at the Megadome: the score, and the scorer's face on a try
    if (this.stadium.V.jumbotron) r.queue(G.CX, 2, 54, g => {
      const [x, y] = r.w(G.CX, 2, 54), X = Math.round(x) - 40, Y = Math.round(y) - 38;
      px.rect(g, X - 2, Y - 2, 84, 38, '#1a1a24'); px.rect(g, X, Y, 80, 34, '#06080e');
      if (V.phase === 'try' && this.lastScorer >= 0 && this.rigs[this.lastScorer]) { this.rigs[this.lastScorer].drawPortrait(g, X + 2, Y + 2, 30, { zoom: 2.4, turn: .3, bg: '#203060' }); E.font.text(g, 'TRY!', X + 58, Y + 12, '#ffe060', { align: 'center', outline: false }); }
      else { E.font.text(g, V.teams[0].short + ' ' + V.score[0], X + 40, Y + 6, '#ffe060', { align: 'center', outline: false }); E.font.text(g, V.teams[1].short + ' ' + V.score[1], X + 40, Y + 18, '#a0d0ff', { align: 'center', outline: false }); }
    }, { emissive: true, bias: 4 });
  }
  drawPowerups(r, V) {
    for (const q of V.powerups) {
      if (q.taken) continue;
      let x = q.x, y = q.y, z = 2;
      if (!q.on) { const u = clamp(q.t / q.fly, 0, 1); x = lerp(q.fx, q.x, u); y = lerp(q.fy, q.y, u); z = 60 * (1 - u) + Math.sin(u * PI) * 50; }
      else if (q.life - q.t < 3 && Math.floor(this.t * 8) % 2) continue;
      r.shadow(x, y, 5, .3);
      r.sprite(x, y, z + Math.sin(this.t * 4) * 1.5, TT.PU_SPR[q.kind], { anchor: 'bottom', glow: .4 });
    }
  }
  drawHazards(r, V) {
    const t = this.t;
    if (V.hazardKind === 'flames') for (const gr of TT.GRATES) r.decal(() => { r.groundDisc(gr.x, gr.y, 7, '#2a2020', .9); r.groundRing(gr.x, gr.y, 7, '#5a3a2a', .9); });
    for (const h of V.hazards) {
      if (h.kind === 'chicken' && h.t >= h.warn) {
        if (!this.chick) this.chick = new E.Blob({ R: 14, colors: { dk: '#c8c0a8', base: '#f8f4e8', lt: '#ffffff', spec: '#ffffff', eye: '#141414', pupil: '#000000' }, wings: true, feet: true, mouth: false });
        this.chick.update(1 / 60, { walk: 1, flap: 1, look: [Math.cos(h.f || 0), Math.sin(h.f || 0)], squash: Math.sin(t * 18) * .1 });
        r.shadow(h.x, h.y, 12, .4);
        r.actor(h.x, h.y, Math.abs(Math.sin(t * 9)) * 3, (g, ox, oy) => { this.chick.draw(g, ox, oy, r.view); px.poly(g, [[ox - 3, oy - 34], [ox + 3, oy - 34], [ox, oy - 40]], '#e83a2a'); px.rect(g, ox - 3, oy - 35, 6, 2, '#e83a2a'); px.poly(g, [[ox + 6, oy - 22], [ox + 13, oy - 20], [ox + 6, oy - 18]], '#f0a020'); E.font.text(g, 'C', ox, oy - 16, '#3a6ae8', { align: 'center', font: 'tiny', outline: false }); }, { pick: { kind: 'chicken' } });
      }
      if (h.kind === 'flame') {
        if (h.t >= 0 && h.t < h.warn) r.decal(() => r.groundDisc(h.x, h.y, 8 + Math.sin(t * 20) * 2, '#ff8030', .4 + .4 * (h.t / h.warn)));
        else if (h.t >= h.warn && h.t < h.warn + h.burn) r.queue(h.x, h.y, 0, g => {
          for (let i = 0; i < 6; i++) { const u = (t * 3 + i / 6) % 1, [x, y] = r.w(h.x + Math.sin(i * 2 + t * 9) * 3, h.y, u * 46); px.disc(g, Math.round(x), Math.round(y), Math.max(1, 5 * (1 - u)), u < .3 ? '#fff0a0' : u < .6 ? '#ffa030' : '#e83a1a'); }
        }, { emissive: true });
      }
      if (h.kind === 'bolt') {
        if (h.t < h.warn) r.decal(() => { const k = h.t / h.warn; r.groundRing(h.x, h.y, 36, '#c0e0ff', .3 + .5 * k); r.groundRing(h.x, h.y, 36 * (1 - k), '#ffffff', .6); });
        else if (h.t < h.warn + .25) r.queue(h.x, h.y, 0, g => {
          let [x, y] = r.w(h.x, h.y, 260); const [, yb] = r.w(h.x, h.y, 0);
          while (y < yb) { const nx = x + (E.hash2(Math.floor(y), Math.floor(t * 30)) - .5) * 14, ny = Math.min(yb, y + 10); px.line(g, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), '#ffffff', 2); px.line(g, Math.round(x) + 1, Math.round(y), Math.round(nx) + 1, Math.round(ny), '#a0c8ff', 1); x = nx; y = ny; }
        }, { emissive: true });
        else r.decal(() => r.groundDisc(h.x, h.y, 22, '#1a1414', .5));
      }
    }
  }
  /** light every scene: the day's ambient, floodlight pools at dusk and night, glows on fire */
  lights(r, V) {
    const L = TT.game ? TT.game.lights : null; if (!L) return;
    const T0 = TT.TIMES[V.time] || TT.TIMES.day;
    L.enabled = true; L.ambient = T0.ambient;
    if (V.time !== 'day') {
      for (const [x, y] of [[G.X0 + 120, G.Y0 + 60], [G.CX, G.Y0 + 40], [G.X1 - 120, G.Y0 + 60], [G.X0 + 120, G.Y1 - 60], [G.CX, G.Y1 - 40], [G.X1 - 120, G.Y1 - 60]]) L.add(x, y, 0, 360, V.time === 'night' ? .85 : .5, { color: '#fff4d8' });
    }
    for (const p of V.players) if (p.fire > 0 || (p.sup && p.sup.kind === 'thunder')) L.add(p.x, p.y, 20, 60, .9, { color: '#ff9040' });
    for (const h of V.hazards) if (h.kind === 'flame' && h.t >= h.warn - .3 && h.t < h.warn + h.burn) L.add(h.x, h.y, 10, 70, 1.1, { color: '#ff8030' });
  }
}
TT.Pres = Pres;
/* the power-ups, as string sprites with a glint */
TT.PU_SPR = {
  pie: E.sprite(['....w.w.....', '.....w......', '..oooooooo..', '.oyyyyyyyyo.', 'ossyyyyyyyso', 'oyyyyyyyyyyo', 'gggggggggggg', '.gGggggggGg.'], { o: '#a0602a', y: '#d8a050', s: '#f0d090', w: '#e8e8f0', g: '#a8a8b8', G: '#e8e8f8' }),
  iron: E.sprite(['.mmm....mmm.', 'mMMmm..mmMMm', 'mMmmmmmmmmMm', 'mmm.r..r.mmm', '.mm......mm.', '..m......m..'], { m: '#7a8090', M: '#d0d8e8', r: '#3a3a44' }),
  boot: E.sprite(['ww........ww', '.www....www.', '..wwyyyyww..', '....yYyy....', '....yyyy....', '....yyyyyyy.', '....yyyyyyyy', '.....kkkkkk.'], { y: '#e0b030', Y: '#fff0a0', w: '#f0f0f8', k: '#5a4a2a' }),
  grease: E.sprite(['..cccccccc..', '.cCccccccCc.', 'cccccccccccc', '.cc.cccc.cc.', '...cccccc...', '...cWcccc...', '...cccccc...', '...cccccc...'], { c: '#e8d040', C: '#fff8b0', W: '#ffffff' }),
  horn: E.sprite(['......rrr...', '.....rrrrr..', 'kkkkrrrrrrr.', 'kKkkrrRrrrrr', 'kkkkrrrrrrr.', '.....rrrrr..', '......rrr...'], { r: '#e83a2a', R: '#ff9a8a', k: '#2a2a30', K: '#6a6a74' })
};
