/* KICKING: the 3-press meter (power, then accuracy) for a human kicker, CPU kicks from KCK and difficulty, the kick's
 * flight (kickoffs, squibs, onsides, punts, field goals and PATs), blocked kicks, fair catches and the field-goal test
 * against the uprights. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, T = FF.T, S = FF.sim, { clamp } = E, Y = 16, F = FF.FIELD;
const hyp = Math.hypot, r = () => FF.r();
let M = null;   // the meter: { kind, kicker, stage, u, power, acc, aim, ctl, done, cpu, at }

const K = FF.kick = {
  get meter() { return M; },
  active: () => !!M && !M.fired,
  /** a human starts the meter (b1 in PRESNAP): the needle sweeps the power bar */
  start(kicker, kind, ctl) { if (!kicker) return; M = { kind, kicker, stage: 1, u: 0, power: 0, acc: 0, aim: 0, ctl: ctl === undefined ? 0 : ctl, t: 0, cpu: false, fired: false, superFoot: S.superFoot === kicker.team }; if (M.superFoot) S.superFoot = -1; FF.bus.emit('meter', { stage: 1 }); },
  /** the CPU's kick: power and accuracy from KCK and difficulty plus noise; it fires on its own time */
  cpu(kicker, kind, given) {
    if (!kicker) return;
    const k = kicker.r.KCK, noise = (S.isHuman(kicker.team) ? 1 : S.diff().kick);
    let power = clamp(.7 + k * .025 + FF.gauss() * .08 * noise, .4, 1), acc = clamp(FF.gauss() * .1 * noise * (1.3 - k * .05), -1, 1);
    let aim = 0;
    if (kind === 'fg') { const yd = fgYards(); power = clamp(Math.max(power, (yd - 25) / (25 + k * 1.6) + .08), .4, 1); }
    if (kind === 'kickoff') { const ko = S.play.kick; if (ko === 'onside') power = .5; aim = (r() - .5) * .6; }
    if (kind === 'punt') { power = clamp(power, .5, 1); }
    M = { kind, kicker, stage: 3, power, acc, aim, cpu: true, fired: false, at: kind === 'kickoff' ? 1.0 : kind === 'punt' ? .95 : .85, t: 0, superFoot: S.superFoot === kicker.team };
    if (M.superFoot) S.superFoot = -1;
    if (given) { M.power = given.power; M.acc = given.acc; M.aim = given.aim; M.at = kind === 'kickoff' ? 1 : .6; }
    if (S.cheats.forceKick) { M.acc = 0; M.power = 1; }
  },
  cancel() { M = null; },
  /** b1 presses from the kicking player, and the meter's needle; called by the match each step */
  input(press, stickX) {
    if (!M || M.cpu || M.fired) return;
    if (M.stage === 1) {
      M.aim = clamp(M.aim + stickX * .03, -1, 1);
      if (press) { M.power = M.u; M.stage = 2; M.u = 0; FF.bus.emit('meter', { stage: 2, power: M.power }); }
    } else if (M.stage === 2 && press) { M.acc = M.ua; M.stage = 3; FF.bus.emit('meter', { stage: 3, acc: M.acc }); }
  },
  update(dt) {
    if (!M || M.fired) return;
    M.t += dt;
    const P = S.play;
    if (!M.cpu) {
      const sp = T.meterSpeed * (M.superFoot ? .7 : 1);
      if (M.stage === 1) { M.ph = (M.ph || 0) + dt * sp * 2; const k = M.ph % 2; M.u = k < 1 ? k : 2 - k; }
      if (M.stage === 2) { M.pa = (M.pa || 0) + dt * sp * 2 * (M.power > .95 ? 1.5 : 1); const k = M.pa % 2; M.ua = (k < 1 ? k : 2 - k) * 2 - 1; }
      // time runs out: the kick goes with what it has
      if (M.t > (M.kind === 'kickoff' ? 6 : 3.2)) { if (M.stage === 1) M.power = .6; if (M.stage <= 2) M.acc = (r() - .5) * .8; M.stage = 3; }
      if (M.stage < 3) return;
      M.at = M.at || M.t + .15;
      if (M.t < M.at) return;
    } else if (M.t < M.at) return;
    // the kicker needs the ball (punts) or the holder to have it (FG)
    const kk = M.kicker, B = S.ball;
    if (M.kind === 'punt' && B.holder !== kk) { if (B.state === 'held' && B.holder && B.holder.team !== kk.team) M = null; return; }
    if (M.kind === 'fg') { const h = S.bySlot(kk.team, 'QB'); if (!h || B.holder !== h) { if (B.state !== 'pass' && !(B.state === 'held' && B.holder === h)) M = null; return; } h.act = { id: 'hold', t: 0, dur: 1 }; }
    if (M.kind === 'kickoff') {   // a run-up to the ball
      const tx = S.los - S.dir[kk.team] * 1.2, ty = F.MID_Y;
      const d = hyp(tx - kk.b.x, ty - kk.b.y);
      if (d > 4) { kk.b.vx = (tx - kk.b.x) / d * 150; kk.b.vy = (ty - kk.b.y) / d * 150; kk.b.x += kk.b.vx * dt; kk.b.y += kk.b.vy * dt; kk.pose = 'RUN'; return; }
    }
    fire();
  },
  /** the ball in the air: returners catch kicks, a field goal meets the uprights. True when it handled the step */
  flight() {
    const B = S.ball, P = S.play;
    if (B.kickKind === 'fg') {
      const ex = S.dir[B.team] > 0 ? F.END_R : F.END_L;
      if ((B.x - ex) * S.dir[B.team] >= 0 && !B.fgDone) { B.fgDone = true; fgResult(); return true; }
      if (B.z <= 0 && !B.fgDone) { B.fgDone = true; B.z = 0; fgResult(true); return true; }
      return false;
    }
    if (B.blocked) return false;
    // the receiving side's returner (or anyone of theirs) catches it coming down
    if (B.vz < 0 && B.z < 34) {
      for (const a of S.athletes) {
        if (a.team === B.team || a.down > 0) continue;
        const d = hyp(a.b.x - B.x, a.b.y - B.y);
        if (d < 1.4 * Y && B.z < 30 + a.b.z) {
          if (B.kickKind === 'onside' && r() < .45) continue;   // a high bounce is hard to field
          if (B.kickKind === 'squib' && r() < .5) continue;
          S.giveBall(a, 'kickCatch'); S.ball.possX = a.b.x;
          const cover = S.athletes.some(o => o.team !== a.team && hyp(o.b.x - a.b.x, o.b.y - a.b.y) < 3 * Y);
          const fair = P.kind === 'punt' && ((a.ctl >= 0 && a.intent.press & FF.BIT.b1) || (a.ctl < 0 && cover));
          FF.bus.emit('kickCaught', { a: a.id, fair });
          if (fair) { FF.bus.emit('fairCatch', { a: a.id }); S.deadBall('down', { x: a.b.x }); }
          else if (a.ctl < 0 && S.inOwnEndzone(a.b.x, a.team) && Math.abs(a.b.x - S.ownGoalX(a.team)) > 3 * Y) a.brain.kneel = true;
          return true;
        }
      }
    }
    return false;
  },
  fgYards
};
function fgYards() { return Math.round(100 - S.yardline(S.los, S.poss) + 17); }

function fire() {
  const kk = M.kicker, B = S.ball, P = S.play, kind = M.kind, d = S.dir[kk.team];
  M.fired = true; P.kicked = true;
  kk.act = { id: 'kick', t: 0, dur: .6 }; kk.pose = 'KICK';
  // a block: a rusher at the kick point
  const kp = kind === 'fg' ? (S.bySlot(kk.team, 'QB') || kk).b : kk.b;
  if (kind !== 'kickoff') {
    const rusher = S.athletes.find(a => a.team !== kk.team && a.down <= 0 && !a.eng && hyp(a.b.x - kp.x, a.b.y - kp.y) < 1.4 * Y);
    if (rusher && r() < T.blockChance) {
      B.blocked = true; S.loose(kp.x + d * 10, kp.y, 20, -d * 40 + (r() - .5) * 60, (r() - .5) * 80, 120, 'blocked');
      FF.bus.emit('kickBlocked', { a: rusher.id, player: rusher.name, team: rusher.team });
      if (kind === 'fg') { S.ball.state = 'dead'; S.endPlay({ type: 'fg', good: false, blocked: true }); }
      return;
    }
  }
  const band = T.accBand * (M.superFoot ? 2.5 : 1), acc = M.acc, hooked = Math.abs(acc) > band ? acc : 0;
  const red = M.power > .95 ? 1.05 : 1, kck = kk.r.KCK;
  let yards, apex, hook, aimA = 0;
  if (kind === 'fg') { yards = (25 + M.power * (25 + kck * 1.6)) * red + (M.superFoot ? 15 : 0); apex = T.apexFg; hook = hooked * 9 * Math.PI / 180; }
  else if (kind === 'punt') { yards = (30 + M.power * 25) * red + (M.superFoot ? 15 : 0); apex = T.apexPunt; hook = hooked * 14 * Math.PI / 180; aimA = M.aim * 15 * Math.PI / 180; }
  else {
    const ko = P.kick;
    if (ko === 'onside') { yards = 10 + M.power * 5; apex = 60; }
    else if (ko === 'squib') { yards = 30 + M.power * 10; apex = 20; }
    else { yards = (35 + M.power * 35) * red + (M.superFoot ? 15 : 0); apex = T.apexKickoff; }
    hook = hooked * 14 * Math.PI / 180; aimA = M.aim * 15 * Math.PI / 180;
  }
  const from = { x: kp.x + d * 8, y: kp.y, z: kind === 'kickoff' ? 2 : 6 };
  let base = d > 0 ? 0 : Math.PI;
  if (kind === 'fg') { const px = d > 0 ? F.END_R : F.END_L; base = Math.atan2(F.MID_Y - from.y, px - from.x); }
  if (S.cheats.forceKick) hook = 0;
  const an = base + aimA + hook, dx = Math.cos(an) * yards * Y, dy = Math.sin(an) * yards * Y;
  let tx = from.x + dx, ty = from.y + dy;
  if (kind === 'fg') { // the FG flies on past the end line: aim the arc at its full distance
    tx = from.x + Math.cos(an) * yards * Y; ty = from.y + Math.sin(an) * yards * Y;
  }
  const v = E.arc(from, { x: tx, y: ty, z: 0 }, T.kickGravity, { apex });
  Object.assign(B, { state: 'kick', holder: null, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, g: T.kickGravity, t: 0, T: v.t, tx, ty, team: kk.team, kickKind: kind === 'kickoff' ? P.kick : kind, fgDone: false, blocked: false, spin: 0, last: kk, kickFrom: [from.x, from.y] });
  P.kickYards = Math.round(yards);
  if (kind === 'kickoff' && P.kick === 'onside') P.onsideLegal = true;
  if (kind === 'kickoff' && P.kick !== 'deep') P.onsideLegal = true;
  FF.bus.emit(kind === 'kickoff' ? 'kickoff' : kind === 'punt' ? 'punt' : 'fgKick', { a: kk.id, yards: Math.round(yards), kind, onside: P.kick === 'onside' });
  M = null;
}
function fgResult(short) {
  const B = S.ball, P = S.play, t = B.team, yd = Math.round(Math.abs((B.kickFrom[0] - S.goalX(t)) / Y) + 10);
  const half = 49.5, off = B.y - F.MID_Y;
  let good = !short && Math.abs(off) < half && B.z > 53, doink = false;
  if (!short && Math.abs(Math.abs(off) - half) < 3.5 && B.z > 40) { doink = true; good = r() < .5; }
  if (!short && Math.abs(off) < half && B.z <= 53 && B.z > 47) { doink = true; good = r() < .4; }   // off the crossbar
  if (good) { S.score[t] += P.xp ? 1 : 3; if (!P.xp) S.stats.team[t].fg++; }
  FF.bus.emit(P.xp ? 'pat' : 'fg', { team: t, good, doink, yards: yd, xp: !!P.xp });
  B.state = 'dead'; B.vx *= .3; B.vy *= .3;
  if (good && !P.xp && (!S.stats.longestFg || yd > S.stats.longestFg.yards)) S.stats.longestFg = { yards: yd, team: t };
  S.endPlay({ type: 'fg', good, doink });
}
})();
