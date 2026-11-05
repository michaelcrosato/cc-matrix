/* ---- Skater: the pure skating step, ratings, and the puck actions (pass, saucer, wrist, slap, one-timer, deke, poke, check) ---- */
let M = null;   // the match being played (Match owns it; every simulation module reads it)
const Skater = (() => {
  const spdMul = d => .85 + .05 * d.spd, shotMul = d => .85 + .05 * d.sht, errMul = d => 1.3 - .1 * d.sht, passMul = d => .9 + .033 * d.pas, hitMul = d => .8 + .067 * d.hit, hndMul = d => .85 + .05 * d.hnd;
  const BUSY = { down: 1, getup: 1, stun: 1, bin: 1, fight: 1, frozen: 1, buried: 1, slip: 1, celebrate: 1, faceoff: 0 };
  const free = s => !BUSY[s.state];
  /** the top speed of a skater now */
  function vmax(s, turbo) {
    let v = T.skateMax * spdMul(s.def) * (turbo ? T.turboMul : 1) * (M && M.puck.owner === s ? .94 : 1) * (s.winding ? .6 : 1);
    if (s.items.cocoa > 0) v *= 1.2; if (M && M.boost && M.boost[s.team] > 0) v *= 1.1; if (M && M.tactic && M.tactic[s.team] === 'finesse') v *= 1.04;
    if (s.slowT > 0) v *= .6;
    return v;
  }
  /** one fixed step of skating (pure on s: the network's prediction runs it too) */
  function skateStep(s, mx, my, turbo, dt, noStop) {
    const vm = vmax(s, turbo), sp = Math.hypot(s.vx, s.vy), m = Math.min(1, Math.hypot(mx, my));
    if (s.state === 'stop') {
      const ns = Math.max(0, sp - T.stopDecel * dt); if (sp > 0) { s.vx *= ns / sp; s.vy *= ns / sp; }
      s.stateT += dt; if (s.stateT > .22 && (ns < 30 || m < .1)) s.state = 'skate';
      return null;
    }
    let ev = null;
    if (m > .15) {
      const dir = Math.atan2(my, mx), va = Math.atan2(s.vy, s.vx);
      if (!noStop && sp > (s.ctrl === 'cpu' ? 100 : 60) && Math.abs(U.angDiff(dir, va)) > (s.ctrl === 'cpu' ? 2.6 : 2.09) && s.state === 'skate') { s.state = 'stop'; s.stateT = 0; s.stopSide = U.angDiff(dir, va) > 0 ? 1 : -1; return 'stop'; }
      if (sp > 1) { const rate = lerp(T.turnSlow, T.turnFast, Math.min(1, sp / vm)), nva = U.approachAng(va, dir, rate * dt); s.vx = Math.cos(nva) * sp; s.vy = Math.sin(nva) * sp; s.turning = Math.sign(U.angDiff(dir, va)) * Math.min(1, Math.abs(U.angDiff(dir, va)) * 2); }
      const acc = T.skateAccel * (1 - .6 * Math.min(1, Math.pow(sp / vm, 2))) * m;
      s.vx += Math.cos(dir) * acc * dt; s.vy += Math.sin(dir) * acc * dt;
      const ns = Math.hypot(s.vx, s.vy), cap = vm * Math.max(.4, m);
      if (ns > cap) { const k = Math.max(cap, ns - (ns - cap) * 3 * dt - T.iceGlide * dt) / ns; s.vx *= k; s.vy *= k; }
    } else {
      s.turning = 0;
      if (sp > 0) { const ns = Math.max(0, sp - T.iceGlide * dt); s.vx *= ns / sp; s.vy *= ns / sp; }
    }
    // edge grip: the part of the velocity across the facing decays (carves, not slides)
    const f = s.facing, cf = Math.cos(f), sf = Math.sin(f), along = s.vx * cf + s.vy * sf, across = -s.vx * sf + s.vy * cf, k = Math.exp(-T.edgeGrip * dt);
    if (along > 0) { s.vx = cf * along - sf * across * k; s.vy = sf * along + cf * across * k; }
    const ns = Math.hypot(s.vx, s.vy);
    if (ns > 12) s.facing = U.approachAng(s.facing, Math.atan2(s.vy, s.vx), 11 * dt);
    else if (m > .15) s.facing = U.approachAng(s.facing, Math.atan2(my, mx), 9 * dt);
    return ev;
  }
  /** the blade point (where a carried puck rides) */
  const blade = (s, reach = 11) => { const c = Math.cos(s.facing), n = Math.sin(s.facing), h = s.def.hand || 1; return [s.x + c * reach - n * h * 4, s.y + n * reach + c * h * 4]; };
  /** the goal a team attacks: { x, y, side } */
  const attackGoal = team => { const side = 1 - (team ^ M.flip); return { x: Rink.goalX(side), y: Rink.C.y, side }; };
  const ownGoal = team => { const side = team ^ M.flip; return { x: Rink.goalX(side), y: Rink.C.y, side }; };
  /** where in the net to aim: aim (a world point or null), stickY (-1..1 near/far), the goalie's position */
  function aimPoint(s, o = {}) {
    const g = attackGoal(s.team), gl = M.goalies[1 - s.team], C = Rink.C, mouth = Rink.MOUTH - 5;
    let y;
    if (o.aim) { const ax = o.aim[0], ay = o.aim[1], t = Math.abs(ax - s.x) > 1 ? (g.x - s.x) / (ax - s.x) : 0; y = t > 0 ? s.y + (ay - s.y) * t : ay; }
    else if (o.stickY) y = C.y + o.stickY * mouth;
    else y = gl && gl.y > C.y ? C.y - mouth : C.y + mouth;   // the open side
    y = clamp(y, C.y - mouth, C.y + mouth);
    return [g.x, y];
  }
  /** release the puck from s with a velocity */
  function release(s, vx, vy, vz, kind) {
    const p = M.puck; p.owner = null; p.vx = vx; p.vy = vy; p.vz = vz || 0; p.z = Math.max(p.z, .2); p.prevTouch = p.lastTouch; p.lastTouch = s; p.touchT = M.t;
    p.shotBy = null; p.passTo = null; p.kind = kind; p.onFire = false; p.lumber = false;
    s.cool.pickup = .25; s.shootHold = 0; s.winding = false; s.charge = 0;
  }
  /** a shot: wrist, slap (charge 0..1), onetimer or kaboom */
  function shoot(s, kind, charge = 0, o = {}) {
    const p = M.puck, d = s.def, [bx, by] = blade(s);
    p.x = bx; p.y = by;
    let speed = kind === 'wrist' ? T.wristSpeed * shotMul(d) : (T.slapBase + T.slapGain * charge) * shotMul(d);
    let sigma = (kind === 'wrist' ? 5 : 7 * (1.4 - .4 * charge)) * errMul(d) * T.shotError;
    if (kind === 'onetimer') { speed = (T.slapBase + T.slapGain * .85) * shotMul(d) * T.oneTimerBonus; sigma *= .5; }
    if (o.turbo) speed *= 1.12;
    if (s.items.lumber > 0) { speed *= 1.3; sigma = 0; s.items.lumberShots = (s.items.lumberShots || 3) - 1; if (s.items.lumberShots <= 0) s.items.lumber = 0; }
    const kab = M.kaboomT[s.team] > 0 && (kind === 'slap' && charge >= .95);
    if (kab) { kind = 'kaboom'; speed = 760; sigma = 0; }
    speed = Math.min(760, speed);
    if (s.ai && s.ai.errK) sigma *= s.ai.errK;
    const goalie = M.goalies[1 - s.team], down = goalie && (goalie.state === 'butterfly' || goalie.state === 'stack');
    const [tx, ty] = aimPoint(s, o);
    const dist = Math.hypot(tx - bx, ty - by), t = dist / speed;
    const lift = kind === 'wrist' ? 2 + RNG.sim() * 5 : kind === 'kaboom' ? 6 + RNG.sim() * 6 : kind === 'onetimer' ? 3 + RNG.sim() * 12 : 13 + RNG.sim() * 4;   // wristers low, clappers top shelf
    const err = U.gauss(RNG.sim) * sigma / Math.max(30, dist) * 1.4;
    const a = Math.atan2(ty - by, tx - bx) + err, vz = (lift + .5 * 700 * t * t) / t;
    release(s, Math.cos(a) * speed, Math.sin(a) * speed, Math.min(vz, 260), kind);
    p.shotBy = s; p.onFire = kab; p.shotT = M.t; p.shotKind = kind;
    // on goal: does the line cross the goal line inside the mouth?
    const gx = tx, yAt = by + Math.tan(a) * (gx - bx), onGoal = Math.abs(yAt - Rink.C.y) < Rink.MOUTH && Math.cos(a) * (gx - bx) > 0;
    M.stats[s.id].shots++; M.shots[s.team] += onGoal ? 1 : 0;
    Bus.emit('shot', { by: s.id, team: s.team, kind, speed, onGoal, dist: Math.round(dist), x: bx, y: by });
    if (kab) Bus.emit('kaboom_shot', { by: s.id, team: s.team });
    s.act = { kind: 'follow', t: 0 };
    return p;
  }
  /** the teammate a pass goes to: the one nearest the aim's bearing (within 75 degrees), the reticle, else the nearest ahead */
  function passTarget(s, o = {}) {
    const mates = M.skaters.filter(m => m.team === s.team && m !== s && m.state !== 'bin' && m.state !== 'fight');
    if (!mates.length) return null;
    if (o.aim) { let best = null, bd = 80; for (const m of mates) { const d = Math.hypot(m.x - o.aim[0], m.y - o.aim[1]); if (d < bd) { bd = d; best = m; } } if (best) return best; }
    const dir = o.dir !== undefined ? o.dir : s.facing; let best = null, ba = 1.31;
    for (const m of mates) { const a = Math.abs(U.angDiff(Math.atan2(m.y - s.y, m.x - s.x), dir)); if (a < ba) { ba = a; best = m; } }
    if (best) return best;
    const g = attackGoal(s.team); return mates.slice().sort((a, b) => Math.abs(a.x - g.x) - Math.abs(b.x - g.x))[0];
  }
  function pass(s, o = {}) {
    const p = M.puck, d = s.def, [bx, by] = blade(s); p.x = bx; p.y = by;
    const m = o.to || passTarget(s, o);
    let tx, ty;
    if (m) {
      tx = m.x; ty = m.y; let sp = 300;
      for (let i = 0; i < 2; i++) { const dd = Math.hypot(tx - bx, ty - by); sp = clamp(220 + .9 * dd, T.passMin, T.passMax) * passMul(d); const tf = dd / sp; tx = m.x + m.vx * tf * .9; ty = m.y + m.vy * tf * .9; }
      // keep it on the ice
      const k = Rink.sdf(tx, ty); if (k > -10) { const n = Rink.normal(tx, ty); tx -= n[0] * (k + 10); ty -= n[1] * (k + 10); }
      o.speed = sp;
    } else if (o.aim) { tx = o.aim[0]; ty = o.aim[1]; }
    else { tx = bx + Math.cos(s.facing) * 120; ty = by + Math.sin(s.facing) * 120; }
    const dd = Math.hypot(tx - bx, ty - by), sp = o.speed || clamp(220 + .9 * dd, T.passMin, T.passMax) * passMul(d);
    const sig = .06 * (1.3 - .1 * d.pas) * (s.items.tape > 0 ? .3 : 1), a = Math.atan2(ty - by, tx - bx) + U.gauss(RNG.sim) * sig;
    if (o.saucer) {
      const v = E.arc({ x: bx, y: by, z: 1 }, { x: bx + Math.cos(a) * dd, y: by + Math.sin(a) * dd, z: 0 }, 700, { apex: T.saucerApex });
      release(s, v.vx * .95, v.vy * .95, v.vz, 'saucer');
    } else release(s, Math.cos(a) * sp, Math.sin(a) * sp, 0, 'pass');
    p.passTo = m || null; p.passFrom = s; p.passT = M.t; p.tape = s.items.tape > 0;
    if (m) { m.receiving = .9; }
    Bus.emit('pass', { from: s.id, to: m ? m.id : -1, team: s.team, kind: o.saucer ? 'saucer' : 'pass' });
    s.act = { kind: 'pass', t: 0, saucer: !!o.saucer };
    return m;
  }
  /** a check: a lunge along the facing for 0.3 s; the hit itself is resolved by Hits on contact */
  function check(s) {
    if (s.cool.check > 0) return false;
    s.state = 'check'; s.stateT = 0; s.cool.check = .7; s.hitDone = {};
    const sp = 60 + (s.items.poutine > 0 ? 20 : 0); s.vx += Math.cos(s.facing) * sp; s.vy += Math.sin(s.facing) * sp;
    return true;
  }
  function deke(s, side) {
    if (s.cool.deke > 0) return false;
    s.cool.deke = .8; s.state = 'deke'; s.stateT = 0; s.dekeSide = side || (s.lastDekeSide = -(s.lastDekeSide || 1));
    const a = s.facing + s.dekeSide * PI / 2; s.vx += Math.cos(a) * 90; s.vy += Math.sin(a) * 90;
    s.spin = s.turbo > 0 && s.holdTurbo;
    Bus.emit('deke', { by: s.id, team: s.team });
    // a goalie close by bites
    const gl = M.goalies[1 - s.team]; if (gl && Math.hypot(gl.x - s.x, gl.y - s.y) < 70) gl.dekedT = M.t;
    s.dekeVs = M.skaters.filter(o => o.team !== s.team && Math.hypot(o.x - s.x, o.y - s.y) < 40).map(o => o.id); s.dekeAt = M.t;
    return true;
  }
  function poke(s) {
    if (s.cool.poke > 0) return false;
    s.cool.poke = .6; s.act = { kind: 'poke', t: 0 }; s.pokeHit = false;
    return true;
  }
  return { spdMul, shotMul, passMul, hitMul, hndMul, free, vmax, skateStep, blade, attackGoal, ownGoal, aimPoint, release, shoot, pass, passTarget, check, deke, poke };
})();
