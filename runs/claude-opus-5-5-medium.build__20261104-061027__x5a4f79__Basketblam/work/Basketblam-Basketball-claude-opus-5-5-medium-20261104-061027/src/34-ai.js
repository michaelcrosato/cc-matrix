/* CPU AI: a brain per CPU player decides at 10 Hz (staggered) and steers every step, writing the same command a human's
 * controls would. Roles: handler (dunk / shoot / drive / pass / oop / spin, committed for at least .3 s), off the ball
 * (spot up, cut, call for it, chase power-ups), defender (man to man, steals, shoves, blocks), rebounder. Difficulty sets
 * decision noise, reaction, release timing and aggression; the comeback assist helps a trailing team. */
function newBrain(p, diffName) {
  return { diff: diffName || setting('difficulty') || 'pro', next: (p.slot * .025), plan: null, planT: 0, releaseAt: null, react: 0, mark: null, intent: '', jumpAt: -1, wait: 0 };
}
function diffOf(p) {
  const d = DIFF[p.brain.diff] || DIFF.pro, cb = comebackBonus(p.team) * .1;
  return { q: clamp(d.q + tune('cpuSkill') + cb, .05, 1), react: d.react * tune('cpuReaction'), rel: d.rel, blk: d.blk, steal: d.steal * tune('cpuAggression') * (p.def.team === 'blambots' ? 1.2 : 1), shove: d.shove * tune('cpuAggression') * (p.def.team === 'blambots' ? 1.3 : 1), turbo: d.turbo };
}
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += S.rng(); return (u - 2) / .58; };
/** how open p is: distance to the nearest defender */
const openness = p => Math.min(...foes(p).filter(f => f.state !== 'knocked' && f.reboot <= 0).map(f => dist2(f, p)), 200);
function laneClear(p, h) {
  for (const f of foes(p)) {
    if (f.state === 'knocked' || f.reboot > 0) continue;
    const vx = h.x - p.x, vy = h.y - p.y, L = Math.hypot(vx, vy) || 1, u = ((f.x - p.x) * vx + (f.y - p.y) * vy) / L;
    if (u > 0 && u < L && Math.abs((f.x - p.x) * vy - (f.y - p.y) * vx) / L < 16) return false;
  }
  return true;
}
function steer(c, p, tx, ty, o = {}) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < (o.stop || 5)) { c.mx = 0; c.my = 0; return d; }
  let mx = dx / d, my = dy / d;
  // keep clear of oil slicks and lava rings when it can
  const t = S.match && S.match.twist;
  if (t && (t.slicks || t.bombs)) for (const h of [...(t.slicks || []).map(s => ({ x: s.x, y: s.y, r: s.rx + 14 })), ...t.bombs.filter(b => !b.hit).map(b => ({ x: b.x, y: b.y, r: 30 }))]) {
    const hx = h.x - p.x, hy = h.y - p.y, hd = Math.hypot(hx, hy); if (hd < h.r && hd > 1) { mx -= hx / hd * .9; my -= hy / hd * .9; }
  }
  const l = Math.hypot(mx, my) || 1, k = o.slow ? clamp(d / o.slow, .3, 1) : 1; c.mx = mx / l * k; c.my = my / l * k; return d;
}
function brainStep(p, passive) {
  const B = p.brain, c = p.cmd, m = S.match, dt = 1 / 120, b = S.ball;
  const keep = { sD: c.sD };
  Object.assign(c, emptyCmd()); if (!m || !B) return;
  const D = diffOf(p), h = attackHoop(p.team), own = defendHoop(p.team), o = owner();
  B.next -= dt; const decide = B.next <= 0; if (decide) B.next = .1;
  if (p.reboot > 0 || p.state === 'knocked') return;
  if (p.force && forcedStep(p)) return;
  if (S.cheats.cpuPassive && !p.human && p.team !== 0 && !(p.order && hasBall(p))) { if (p.state === 'jumpshot') { c.sD = p.jump.t < p.jump.apexT; c.sR = !c.sD; } return; }
  p.intent = '';
  // the tip-off: jump when the ball comes down toward the hands' reach
  if (m.phase === 'tipoff') {
    if (m.jumpers.includes(p) && m.tip && m.tip.tossed && !p.jump) {
      if (B.jumpAt < 0) B.jumpAt = .12 + gauss() * D.blk;
      if (m.tipT >= B.jumpAt) c.sP = true;
    } else B.jumpAt = -1;
    p.intent = 'TIP'; return;
  }
  B.jumpAt = -1;
  if (m.phase === 'inbound') {
    const I = m.inb;
    if (p === I.to) steer(c, p, I.rx, I.ry);
    else if (p.team !== I.team) { const mk = foes(p).filter(f => f !== I.who)[0] || I.to; steer(c, p, lerp(mk.x, own.x, .3), lerp(mk.y, own.y, .3)); }
    p.intent = 'INBOUND'; return;
  }
  if (passive || m.phase === 'scored') {   // heading back: the scored-on team to attack, the scorers to defend
    const tx = lerp(XM, own.x, .55), ty = YM + (p.slot % 2 ? 50 : -50); steer(c, p, tx, ty); p.intent = 'BACK'; return;
  }
  const want = (p.turbo > .25 || infTurbo(p)) && S.rng() < D.turbo;
  // a pass on its way to me: meet the ball
  if (b.state === 'pass' && b.pass && b.pass.to === p && !b.pass.oop) { const t2 = Math.max(0, b.pass.T - b.pass.t); steer(c, p, b.x + b.vx * t2, b.y + b.vy * t2, { stop: 4, slow: 20 }); p.intent = 'CATCH'; return; }
  /* ---- with the ball ---- */
  if (o === p) {
    if (p.state === 'jumpshot') {   // hold, release at the top (with its timing error)
      if (B.releaseAt === null) B.releaseAt = p.jump.apexT + gauss() * D.rel - .01;
      c.sD = p.jump.t < B.releaseAt; c.sR = !c.sD; p.intent = 'SHOOT'; if (!c.sD) B.releaseAt = null; return;
    }
    if (busy(p) || isAir(p)) { c.sD = keep.sD; return; }
    const d = Math.hypot(p.x - h.x, p.y - h.y), t = mate(p);
    // a human teammate's orders
    if (p.order && (p.order.t -= dt) > 0) {
      const k = p.order.kind; p.order = null;
      if (k === 'pass') { c.pP = true; return; } if (k === 'oop') { c.oP = true; return; } if (k === 'shoot') { if (canDunkFrom(p) && want) { c.tD = true; } c.sP = true; return; }
    }
    if (decide || !B.plan || B.planT <= 0) {
      const opts = [];
      const urgent = m.shotClock < 4 || (m.clock < 3 && m.phase === 'live');
      const lane = laneClear(p, h), dunkable = (p.turbo >= .1 || infTurbo(p)) && d <= dunkRange(p) && (p.x - h.x) * h.dir > -6;
      if (dunkable) { const guarded = foes(p).some(f => f.state === 'run' && Math.hypot(f.x - h.x, f.y - h.y) < Math.hypot(p.x - h.x, p.y - h.y) && dist2(f, p) < 45); opts.push(['dunk', (lane ? .62 : .3) * (.55 + rate(p, 'slam') * .045) - (guarded ? .25 : 0) + (urgent ? .4 : 0)]); }
      const ch = shotChance(p, 'good'), pts = isThree(p.x, p.y, h) ? 3 : 2;
      opts.push(['shoot', ch.p * pts * .55 + (urgent ? .8 : 0) - (d > 230 ? .6 : 0) - (d < 60 && dunkable ? .15 : 0)]);
      if (d > 50 && lane) opts.push(['drive', .5 + (d > 120 ? .2 : 0)]);
      if (t && t.state === 'run') {
        const open = openness(t), mine = openness(p), risk = foes(p).some(f => segDistAI(f, p, t) < 12) ? .35 : 0, td = Math.hypot(t.x - h.x, t.y - h.y);
        opts.push(['pass', (open - mine) / 80 + .25 - risk + (td < d - 40 ? .25 : 0) + (p.hold > 3 ? .3 : 0)]);
        if (td <= dunkRange(t) * 1.15 + rate(p, 'dime') * 4 && open > 22 && (t.x - h.x) * h.dir > -6) opts.push(['oop', .6 + rate(p, 'dime') * .03 - risk]);
      }
      const ahead = foes(p).find(f => dist2(f, p) < 22 && Math.abs(E.angDiff(Math.atan2(h.y - p.y, h.x - p.x), Math.atan2(f.y - p.y, f.x - p.x))) < .8);
      if (ahead && (p.turbo > .25 || infTurbo(p)) && p.cool.spin <= 0) opts.push(['spin', .7]);
      if (!lane && d > 60) opts.push(['probe', .45]);
      if (m.twist && m.twist.kind === 'wind' && m.wind && m.shotClock > 6 && d > 100) opts.push(['wait', .7]);
      // the vent: a VOLCANO LAUNCH from a puffing vent in the offensive half
      if (m.twist && m.twist.kind === 'eruption') { const v = VENTS.find(v => (v.x - XM) * h.dir < 0 === false && Math.hypot(v.x - p.x, v.y - p.y) < 90 && (v.x - XM) * h.dir > 0); if (v) opts.push(['vent', .9]); }
      for (const op of opts) op[1] += (S.rng() - .5) * (1 - D.q) * 1.4;
      opts.sort((a, c2) => c2[1] - a[1]);
      B.plan = opts[0][0]; B.planT = .3;
    }
    B.planT -= dt; p.intent = B.plan.toUpperCase();
    switch (B.plan) {
      case 'dunk': steer(c, p, h.x - h.dir * 4, h.y); c.tD = true; if (d <= dunkRange(p) * (.6 + S.rng() * .4)) c.sP = true; break;
      case 'shoot': c.mx = c.my = 0; c.sP = true; c.sD = true; B.releaseAt = null; B.plan = null; break;
      case 'drive': steer(c, p, h.x - h.dir * 10, h.y + (p.y - h.y) * .3); c.tD = want && d > 70; break;
      case 'probe': { const side = p.y < YM ? 1 : -1; steer(c, p, lerp(p.x, h.x, .3), YM + side * 80); c.tD = want; break; }
      case 'pass': c.pP = true; B.plan = null; break;
      case 'oop': c.oP = true; B.plan = null; break;
      case 'spin': c.vP = true; steer(c, p, h.x, h.y); B.plan = null; break;
      case 'wait': steer(c, p, p.x - h.dir * 10, p.y, { stop: 8 }); break;
      case 'vent': { const v = VENTS.find(v => (v.x - XM) * h.dir > 0) || VENTS[0]; const dd = steer(c, p, v.x, v.y, { stop: 4 }); if (dd < 14 && m.twist.ventOn) { c.tD = true; c.sP = true; } break; }
    }
    return;
  }
  /* ---- the ball loose or a shot in the air: rebound or chase ---- */
  if (!o && (b.state === 'loose' || b.state === 'shot' || (b.state === 'pass' && b.pass && b.pass.to.team !== p.team))) {
    const mine = S.players.filter(q => q.team === p.team), near = mine.sort((a, c2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c2.x - b.x, c2.y - b.y))[0];
    let tx = b.x, ty = b.y;
    if (b.state === 'shot' && b.shot) { const hh = HOOPS[b.shot.hoop]; tx = hh.x + hh.dir * 30; ty = hh.y + (p.slot % 2 ? 16 : -16); }
    if (b.state === 'pass') { tx = b.x + b.vx * .2; ty = b.y + b.vy * .2; }
    if (near === p || b.state === 'shot') {
      steer(c, p, tx, ty); c.tD = want && Math.hypot(tx - p.x, ty - p.y) > 40; p.intent = b.state === 'shot' ? 'BOX OUT' : 'CHASE';
      const hd = Math.hypot(b.x - p.x, b.y - p.y);
      if (hd < 16 && b.z > p.z + reach(p) * .9 && b.z < p.z + reach(p) + 40 && b.vz < 60 && !isAir(p) && S.rng() < .2 + D.q * .4) c.sP = true;
    } else { steer(c, p, lerp(b.x, own.x, .4), YM + (p.slot % 2 ? 40 : -40)); p.intent = 'GET BACK'; }
    return;
  }
  /* ---- teammate has it: get open ---- */
  if (o && o.team === p.team) {
    const d = Math.hypot(o.x - h.x, o.y - h.y), cutting = d < 140 && o.state === 'run';
    let tx, ty;
    if (cutting) { tx = h.x - h.dir * 40; ty = h.y + (o.y < YM ? 50 : -50); p.intent = 'CUT'; }
    else { tx = h.x - h.dir * 120; ty = o.y < YM ? Y1 - 50 : Y0 + 50; p.intent = 'SPOT UP'; }
    const pu = m.powerups.find(q => Math.hypot(q.x - p.x, q.y - p.y) < 120);
    if (pu) { tx = pu.x; ty = pu.y; p.intent = 'POWER-UP'; }
    if (Math.hypot(o.x - p.x, o.y - p.y) < 60) { ty += p.y < o.y ? -40 : 40; }
    steer(c, p, tx, ty, { slow: 30 }); c.tD = want && Math.hypot(tx - p.x, ty - p.y) > 80;
    if (o.human && openness(p) > 50 && decide && S.rng() < .05) emit('call', { slot: p.slot, kind: 'open' });
    return;
  }
  /* ---- defense: man to man ---- */
  if (o && o.team !== p.team) {
    const fs = foes(p), t = mate(p);
    // marks: the pairing with the least running; the nearer defender takes the handler when it drives
    if (decide || !B.mark || !fs.includes(B.mark)) {
      const [a1, a2] = fs, other = t;
      const cost1 = Math.hypot(p.x - a1.x, p.y - a1.y) + (other ? Math.hypot(other.x - a2.x, other.y - a2.y) : 0);
      const cost2 = Math.hypot(p.x - a2.x, p.y - a2.y) + (other ? Math.hypot(other.x - a1.x, other.y - a1.y) : 0);
      B.mark = cost1 <= cost2 ? a1 : a2;
      if (other && other.human) B.mark = fs.sort((x, y) => dist2(p, x) - dist2(p, y))[0];
    }
    const mk = B.mark, onBall = mk === o, gap = onBall ? 16 : 30;
    const vx = own.x - mk.x, vy = own.y - mk.y, L = Math.hypot(vx, vy) || 1, gx = mk.x + vx / L * gap, gy = mk.y + vy / L * gap;
    steer(c, p, gx, gy, { stop: 3 }); c.tD = want && Math.hypot(gx - p.x, gy - p.y) > 50;
    p.intent = onBall ? 'MARK ' + o.name : 'HELP';
    // blocks: the shooter rising nearby, after the reaction delay
    if (onBall || dist2(o, p) < 40) {
      if (o.state === 'jumpshot' || o.state === 'layup' || o.state === 'dunk') {
        B.react += dt;
        if (B.react > D.react + Math.abs(gauss()) * D.blk && !isAir(p) && dist2(o, p) < 46 && S.rng() < .5 + D.q * .4) { c.sP = true; p.intent = 'BLOCK'; }
      } else B.react = 0;
      // steals and shoves
      const dd = dist2(o, p);
      if (dd < tune('stealReach') + 4 && p.cool.steal <= 0 && o.state === 'run' && S.rng() < D.steal * dt * (.6 + rate(p, 'swipe') * .06)) { c.pP = true; p.intent = 'STEAL'; }
      const paint = Math.hypot(o.x - own.x, o.y - own.y) < 90;
      if (dd < 24 && p.cool.shove <= 0 && (p.turbo > .3 || infTurbo(p)) && (paint || o.state === 'jumpshot') && S.rng() < D.shove * dt * 2.2) { c.vP = true; p.intent = 'SHOVE'; }
    } else {
      // knock down the off-ball cutter now and then (it's legal)
      if (dist2(mk, p) < 22 && p.cool.shove <= 0 && p.turbo > .5 && S.rng() < D.shove * dt * .4) c.vP = true;
    }
    return;
  }
  // nobody has it (a pass in flight to our team): drift toward the rim
  steer(c, p, lerp(p.x, h.x, .3), p.y);
}
const segDistAI = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };
