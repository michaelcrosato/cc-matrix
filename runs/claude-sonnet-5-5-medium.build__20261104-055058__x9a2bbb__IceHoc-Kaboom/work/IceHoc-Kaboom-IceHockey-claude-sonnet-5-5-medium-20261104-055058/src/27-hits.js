/* ---- HITS, BOOM, ITEMS, FIGHTS ---- */
const Hits = (() => {
  const M = () => Sim.m;
  function startCheck(m, s) { s.state = 'check'; s.st = .3; s.cd.check = .9; const sp = Math.hypot(s.vx, s.vy); s.vx += Math.cos(s.heading) * 60; s.vy += Math.sin(s.heading) * 60; s.hitFrom = sp; Sim.emit('check_start', { s }); }
  function startPoke(m, s) { s.state = 'poke'; s.st = .35; s.cd.poke = .6; s.swing = .3; Sim.emit('poke_start', { s }); }
  function deke(m, s) {
    s.state = 'deke'; s.st = .45; s.cd.deke = .8; s.dekeSide = s.dekeAlt = -(s.dekeAlt || 1);
    const it = s.intent; if (Math.abs(it.mx) + Math.abs(it.my) > .3) { const px_ = -Math.sin(s.heading), py_ = Math.cos(s.heading); s.dekeSide = Math.sign(it.mx * px_ + it.my * py_) || s.dekeSide; }
    const nx = -Math.sin(s.heading) * s.dekeSide, ny = Math.cos(s.heading) * s.dekeSide; s.vx += nx * 90; s.vy += ny * 90; s.spin = .45;
    s.dekeBeat = { t: 1, from: m.sk.filter(o => o.side !== s.side && Math.hypot(o.x - s.x, o.y - s.y) < 40).map(o => o.id) };
    const g = m.gl[1 - s.side]; if (Math.hypot(g.x - s.x, g.y - s.y) < 70) m.dekeBite[1 - s.side] = .5;
    Sim.emit('deke', { s });
  }
  function chirp(m, s) {
    s.cd.chirp = 4; let best = null, bd = 120; for (const o of m.sk) if (o.side !== s.side && o.state !== 'bin') { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; best = o; } }
    const line = TEXT.chirps[(RNG.fx() * TEXT.chirps.length) | 0]; Sim.addBoom(m, s.side, 3);
    if (best) { best.grudge[s.id] = clamp((best.grudge[s.id] || 0) + 15, 0, 100); }
    Sim.emit('chirp', { s, target: best, line });
  }
  function bigHit(m, a, b, imp, nrm) {
    if ((m.cfg.god || m.cfg.cheats === 'god') && b.ctrl.kind === 'human') { b.state = 'stun'; b.st = .3; return; }
    b.state = 'down'; b.st = 1.4; b.hitBy = a; b.hitT = 1.4; b.flipT = .8; b.winding = false; b.plan = null;
    const sp = .8 * imp * (m.kaboom[a.side] > 0 ? 1.2 : 1); b.vx = nrm[0] * sp * .8; b.vy = nrm[1] * sp * .8;
    if (b.hasPuck) { Puck.release(m, b); m.puck.vx = nrm[0] * 140; m.puck.vy = nrm[1] * 140; m.puck.last = a; }
    a.stats.hits++; a.stats.bigHits++; m.stats.hits[a.side]++;
    b.grudge[a.id] = clamp((b.grudge[a.id] || 0) + 35, 0, 100);
    for (const o of m.sk) if (o.side === b.side && o !== b) o.grudge[a.id] = clamp((o.grudge[a.id] || 0) + 10, 0, 100);
    Sim.addBoom(m, a.side, 18); if (b.twist > 0) { b.twist = 0; b.glow = null; Sim.addBoom(m, a.side, 10); } Sim.emit('big_hit', { a, b, imp });
    Rink.addScuff(b.x, b.y, .2);
  }
  /** called every step: contacts in the check state */
  function stepChecks(m) {
    for (const a of m.sk) {
      if (a.state !== 'check') continue;
      for (const b of m.sk) {
        if (b.side === a.side || ['bin', 'down', 'getup', 'frozen', 'buried'].includes(b.state)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d > 15 || (a.hitCool && a.hitCool[b.id] > m.t)) continue;
        // deke dodge
        if (b.state === 'deke' && b.st > .15 && RNG.sim() < .7 + .04 * (b.rt.hnd - 3)) { Sim.emit('deke_beat', { s: b, from: a }); Sim.addBoom(m, b.side, 6); (a.hitCool = a.hitCool || {})[b.id] = m.t + .6; continue; }
        const nrm = [dx / (d || 1), dy / (d || 1)], closing = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        const imp = (b.twist > 0 ? 999 : 1) * T.checkPower * (closing + 60) * (a.mass / b.mass) * (.8 + .067 * a.rt.hit) * (a.turboOn ? 1.45 : 1) * (m.kaboom[a.side] > 0 ? 2 : 1) * (a.items.poutine > 0 ? 1.6 : 1) * (m.tactic[a.side] === 'grit' ? 1.05 : 1);
        (a.hitCool = a.hitCool || {})[b.id] = m.t + .6;
        if (b.items.poutine > 0 && imp < 400) { Sim.emit('bump', { a, b }); continue; }
        if (imp >= T.knockdown && !(b.items.poutine > 0)) bigHit(m, a, b, imp, nrm);
        else if (imp >= 90) { b.state = 'stun'; b.st = .5; if (b.hasPuck) { Puck.release(m, b); m.puck.vx = nrm[0] * 90; m.puck.vy = nrm[1] * 90; m.puck.last = a; } a.stats.hits++; m.stats.hits[a.side]++; b.grudge[a.id] = clamp((b.grudge[a.id] || 0) + 10, 0, 100); Sim.addBoom(m, a.side, 6); Sim.emit('check', { a, b, imp }); }
        else { b.state = 'stun'; b.st = .25; if (b.hasPuck && RNG.sim() < .5) { Puck.release(m, b); m.puck.vx = nrm[0] * 60; m.puck.vy = nrm[1] * 60; } Sim.emit('bump', { a, b }); }
        b.vx += nrm[0] * imp * .15; b.vy += nrm[1] * imp * .15;
        a.state = 'skate'; a.st = 0;
      }
    }
    // poke: strip a carried puck
    for (const a of m.sk) {
      if (a.state !== 'poke' || a.pokeDone) continue; const c = m.puck.owner;
      if (!c || c.side === a.side) continue; const bp = Rigs.stickPoint(a), tip = [bp[0] + Math.cos(a.heading) * 18, bp[1] + Math.sin(a.heading) * 18];
      if (Math.hypot(m.puck.x - tip[0], m.puck.y - tip[1]) < 14 || U.segDist(m.puck.x, m.puck.y, bp[0], bp[1], tip[0], tip[1]) < 8) {
        a.pokeDone = true; if (c.items.tape > 0) { Sim.emit('poke_fail', { a }); continue; }
        if (RNG.sim() < .55 + .08 * (a.rt.hnd - c.rt.hnd)) { Puck.release(m, c); m.puck.vx = Math.cos(a.heading) * 80; m.puck.vy = Math.sin(a.heading) * 80; m.puck.last = a; a.stats.takeaways++; Sim.emit('poke_steal', { a, c }); }
        else { Sim.emit('poke_fail', { a }); }
      }
    }
  }
  /** skater collides with a board: glass damage */
  function boardHit(m, s, vn, n) {
    if (vn > 120) Sim.emit('rattle', { s, vn });
    const hard = (s.state === 'down' || s.hitT > 0 || s.state === 'check') && vn > T.glassCrack;
    if (!hard) return;
    const pn = Rink.panelAt(s.x, s.y); if (pn.near) { if (pn.st < 2 && vn > T.glassShatter) { /* low boards on the near side */ } return; }
    if (pn.st === 0 && vn <= T.glassShatter) { pn.st = 1; pn.shake = .5; Sim.addBoom(m, s.hitBy ? s.hitBy.side : 1 - s.side, 8); Sim.emit('glass_crack', { pn, s }); }
    else if (pn.st < 2) { pn.st = 2; pn.shake = .6; m.shatterCnt++; Sim.addBoom(m, s.hitBy ? s.hitBy.side : 1 - s.side, 15); Sim.emit('glass_shatter', { pn, s, by: s.hitBy }); }
  }
  return { startCheck, startPoke, deke, chirp, bigHit, stepChecks, boardHit };
})();

/* ---- ITEMS & HAZARDS ---- */
const Items = (() => {
  function throwItem(m, forced) {
    const pool = m.arena.items; const kind = forced || pool[(RNG.sim() * pool.length) | 0];
    const tx = Rink.CX + (RNG.sim() - .5) * 400, ty = Rink.CY + (RNG.sim() - .5) * 240;
    const fx = RNG.sim() < .5 ? Rink.X0 - 20 : Rink.X1 + 20, fy = Rink.Y0 - 40;
    const o = { kind, x: tx, y: ty, t: 12, z: 0, ly: fy, fly: .7, fx, vx: 0, vy: 0 };
    m.items.push(o); Sim.emit('item_throw', { o, kind }); return o;
  }
  function applyItem(m, s, kind) {
    const d = ITEMS[kind]; Sim.emit('item_pick', { s, kind });
    if (kind === 'boombox') { Sim.addBoom(m, s.side, 40); return; }
    if (kind === 'lumber') { s.items.lumber = 30; s.lumberShots = 3; return; }
    if (kind === 'brick') { m.gl[s.side].itemBig = 12; return; }
    if (kind === 'cocoa') { s.turbo = 1; s.items.cocoa = d.dur; return; }
    s.items[kind] = d.dur;
  }
  function step(m, dt) {
    for (const s of m.sk) { for (const k in s.items) if (s.items[k] > 0) s.items[k] = Math.max(0, s.items[k] - dt); }
    // fan throws
    if (m.phase === 'play' && !m.cfg.noItems) { m.itemT -= dt; if (m.itemT <= 0) { m.itemT = T.itemEvery * (.7 + RNG.sim() * .6); if (m.items.length < 3) throwItem(m); } }
    for (const o of m.items) {
      if (o.fly > 0) { o.fly -= dt; o.z = Math.sin(clamp(1 - o.fly / .7, 0, 1) * PI) * 40; continue; }
      o.t -= dt;
      for (const s of m.sk) if (s.state !== 'bin' && s.state !== 'down' && Math.hypot(s.x - o.x, s.y - o.y) < 12) { applyItem(m, s, o.kind); o.t = 0; break; }
    }
    m.items = m.items.filter(o => o.t > 0);
    // octopi / rats slip
    for (const o of m.octos) { o.t -= dt; if (o.rat) { o.x += o.vx * dt; o.y += o.vy * dt; if (RNG.sim() < .02) { const a = RNG.sim() * TAU; o.vx = Math.cos(a) * 60; o.vy = Math.sin(a) * 60; } const n = Rink.sd(o.x, o.y); if (n > -8) { const nn = Rink.normalAt(o.x, o.y); o.vx = -nn[0] * 60; o.vy = -nn[1] * 60; } }
      for (const s of m.sk) if (!['slip', 'down', 'bin', 'frozen', 'buried'].includes(s.state) && Math.hypot(s.x - o.x, s.y - o.y) < 10 && Math.hypot(s.vx, s.vy) > 30) { s.state = 'slip'; s.st = 1.2; s.flipT = 1; o.t = Math.min(o.t, 3); Sim.emit('slip', { s, o }); } }
    m.octos = m.octos.filter(o => o.t > 0);
    // thin ice
    for (const t of m.thin) { if (t.hole) { t.re -= dt; if (t.re <= 0) { t.hole = false; t.hp = 100; } for (const s of m.sk) if (!['frozen', 'bin'].includes(s.state) && ((s.x - t.x) / t.rx) ** 2 + ((s.y - t.y) / t.ry) ** 2 < 1) { s.state = 'frozen'; s.st = 3; s.vx = s.vy = 0; s.frozeAt = [t.x, t.y]; Sim.emit('frozen', { s, t }); } if (m.puck.owner == null && ((m.puck.x - t.x) / t.rx) ** 2 + ((m.puck.y - t.y) / t.ry) ** 2 < 1 && m.puck.z < 1) { Sim.emit('puck_lost', {}); m.puck.out = true; } } }
    // mascot
    const pe = m.mascot;
    if (pe) {
      if (pe.down > 0) { pe.down -= dt; if (pe.down <= 0) pe.state = 'dance'; }
      else { pe.a += dt * .6; const hunt = m.tactic[0] === 'hunt'; pe.x = Rink.CX + Math.cos(pe.a) * 110; pe.y = Rink.CY + Math.sin(pe.a * 2) * 55; pe.heading = pe.a + 1; }
      for (const s of m.sk) { if (s.state === 'check' && pe.down <= 0 && Math.hypot(s.x - pe.x, s.y - pe.y) < 16) { pe.down = 3; pe.state = 'down'; Sim.addBoom(m, s.side, 10); Sim.emit('mascot_down', { s }); } else if (Math.hypot(s.x - pe.x, s.y - pe.y) < 12 && pe.down <= 0) { const d = Math.hypot(s.x - pe.x, s.y - pe.y) || 1; s.vx += (s.x - pe.x) / d * 60; s.vy += (s.y - pe.y) / d * 60; } }
      m.dropT -= dt; if (m.phase === 'play' && m.arena.id === 'mall' && m.dropT <= 0) { m.dropT = 40; const it = throwItem(m, m.arena.items[(RNG.sim() * 6) | 0]); it.x = Rink.CX; it.y = Rink.CY; it.drop = true; Sim.emit('discount_drop', {}); }
    }
    if (m.cfg.octoRain && m.phase === 'play' && RNG.sim() < dt * .25) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 600, y: Rink.CY + (RNG.sim() - .5) * 300, t: 14 });
  }
  function breakIceAt(m, x, y, dmg) { for (const t of m.thin) if (!t.hole && ((x - t.x) / (t.rx + 6)) ** 2 + ((y - t.y) / (t.ry + 6)) ** 2 < 1) { t.hp -= dmg; if (t.hp <= 0) { t.hole = true; t.re = 30; Sim.emit('thin_ice_break', { t, x, y }); } } }
  return { step, throwItem, applyItem, breakIceAt };
})();

/* ---- BOOM / KABOOM ---- */
const Boom = (() => {
  function step(m, dt) {
    for (const s of [0, 1]) { if (m.kaboom[s] > 0 && m.phase === 'play') { m.kaboom[s] -= dt; if (m.kaboom[s] <= 0) { m.kaboom[s] = 0; Sim.emit('kaboom_end', { side: s }); } } }
    if (m.cfg.alwaysKaboom) for (const h of m.humans) if (m.kaboom[h.side] < 1) m.kaboom[h.side] = 2;
  }
  return { step };
})();

/* ---- FIGHTS ---- */
const Fight = (() => {
  const dmgMul = s => .8 + .067 * s.rt.fgt;
  function canChallenge(m, a, b) { return m.phase === 'play' && !m.fight && m.fightCount < T.fightMax && m.t - m.lastFight > 60 / 4 && a.state !== 'bin' && b.state !== 'bin'; }
  function begin(m, a, b) {
    m.fight = { a, b, ba: T.fightBalance, bb: T.fightBalance, sa: 100, sb: 100, t: 0, winner: null, end: 0, cpuT: 0, ha: {}, hb: {}, yanksA: [], yanksB: [], hoodA: 0, hoodB: 0, winT: 0, stale: 0 };
    m.fightCount++; m.stats.fights++; m.lastFight = m.t; m.phase = 'fight'; m.phaseNoPlay = true; Puck.release(m, m.puck.owner); m.puck.vx = m.puck.vy = 0; m.puck.owner = null;
    for (const s of [a, b]) { s.state = 'fight'; s.st = 99; s.vx = s.vy = 0; s.hasPuck = false; s.fightAct = null; s.fightT = 0; s.fightU = 0; s.duck = 0; s.stagger = 0; s.guardBroken = 0; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; a.x = mx - 10; b.x = mx + 10; a.y = b.y = my; a.heading = 0; b.heading = PI;
    m.fight.cx = mx; m.fight.cy = my;
    Sim.emit('fight_start', { a, b });
  }
  function act(m, f, who, kind) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a, st = who === 'a' ? 'sa' : 'sb';
    if (s.fightAct || s.stagger > 0) return false; const slow = f[st] <= 0 ? 1.4 : 1;
    const def = { jab: [.25 * slow, 8, 'jab'], hay: [.35 * slow + .1 + .35, 22, 'haymaker'], duck: [.35, 10, 'duck'], yank: [.3 * slow, 0, 'yank'] }[kind];
    if (!def || f[st] < def[1] * .3 && kind !== 'yank') return false; if (s.fightCool > 0) return false;
    f[st] = Math.max(0, f[st] - def[1]); s.fightAct = { kind, t: 0, dur: def[0], hit: false, wind: kind === 'hay' ? .35 * slow : 0 }; s.fightCool = .1;
    return true;
  }
  function stepSide(m, f, who, dt) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a, tb = who === 'a' ? 'bb' : 'ba', st = who === 'a' ? 'sa' : 'sb', ys = who === 'a' ? f.yanksA : f.yanksB;
    s.fightCool = Math.max(0, (s.fightCool || 0) - dt); s.stagger = Math.max(0, s.stagger - dt); s.guardBroken = Math.max(0, s.guardBroken - dt); f[st] = Math.min(100, f[st] + 25 * dt);
    const a = s.fightAct; s.duck = a && a.kind === 'duck' ? 1 : 0;
    if (!a) return; a.t += dt; const u = a.t / a.dur; s.fightU = clamp(u, 0, 1);
    const hitAt = a.kind === 'hay' ? a.wind / a.dur + .1 : a.kind === 'jab' ? .4 : .5;
    if (!a.hit && u >= hitAt && (a.kind === 'jab' || a.kind === 'hay' || a.kind === 'yank')) {
      a.hit = true; const oa = o.fightAct; let dmg = 0;
      if (a.kind === 'jab') { dmg = oa && oa.kind === 'duck' ? 3 : 6; }
      if (a.kind === 'hay') { dmg = oa && oa.kind === 'duck' ? 0 : 18 + clamp(a.t * 10, 0, 6); if (!dmg) { s.stagger = .5; s.fightAct = null; s.fightWhiff = true; Sim.emit('fight_whiff', { s }); return; } }
      if (a.kind === 'yank') { if (!(oa && oa.kind === 'duck')) { f[who === 'a' ? 'sb' : 'sa'] = Math.max(0, f[who === 'a' ? 'sb' : 'sa'] - 15); o.guardBroken = .6; ys.push(m.t); while (ys.length && m.t - ys[0] > 4) ys.shift(); if (ys.length >= 3) { ys.length = 0; o.hood = true; f[who === 'a' ? 'hoodB' : 'hoodA'] = 1.5; Sim.emit('fight_hood', { s: o }); } Sim.emit('fight_yank', { s, o }); } return; }
      dmg *= dmgMul(s) * (o.guardBroken > 0 ? 1.2 : 1) * (f[who === 'a' ? 'hoodB' : 'hoodA'] > 0 ? 0 : 1); if (a.kind === 'hay' && o.guardBroken > 0) dmg *= 1.2;
      f[tb] -= dmg; o.stagger = a.kind === 'jab' ? .12 : .3; Sim.emit('fight_hit', { s, o, kind: a.kind, dmg });
    }
    if (u >= 1) { s.fightAct = null; s.fightU = 0; }
  }
  function cpuThink(m, f, who, dt) {
    const s = who === 'a' ? f.a : f.b, o = who === 'a' ? f.b : f.a; if (s.ctrl.kind !== 'cpu' && !s.fightAuto) return;
    s.cpuT = (s.cpuT || 0) - dt; const oa = o.fightAct; const skill = clamp(s.skill || .5, .2, 1) * (m.cfg.practice === 'spar' && s.side === 1 ? .3 : 1);
    if (oa && oa.kind === 'hay' && oa.t < oa.dur * .6 && !s.fightAct && !s.cpuDucked) { s.cpuDucked = true; if (RNG.sim() < skill) act(m, f, who, 'duck'); }
    if (!oa || oa.kind !== 'hay') s.cpuDucked = false;
    if (s.cpuT > 0) return; s.cpuT = lerp(.7, .3, skill) * (m.cfg.practice === 'spar' && s.side === 1 ? 2.4 : 1) * (.7 + RNG.sim() * .6);
    const r = RNG.sim(); act(m, f, who, r < .55 ? 'jab' : r < .8 ? 'hay' : 'yank');
  }
  function step(m, dt) {
    const f = m.fight; if (!f) return; f.t += dt; const { a, b } = f;
    f.hoodA = Math.max(0, f.hoodA - dt); f.hoodB = Math.max(0, f.hoodB - dt); if (f.hoodA <= 0) a.hood = false; if (f.hoodB <= 0) b.hood = false;
    if (f.winner) { f.end -= dt; if (f.end <= 0) finish(m); return; }
    for (const who of ['a', 'b']) {
      const s = who === 'a' ? a : b;
      if (s.ctrl.kind === 'human' && s.ctrl.input) { const I = s.ctrl.input; if (I.pressed('pass')) act(m, f, who, 'jab'); if (I.pressed('shoot')) act(m, f, who, 'hay'); if (I.pressed('deke')) act(m, f, who, 'duck'); if (I.pressed('lob')) act(m, f, who, 'yank'); }
      else if (s.ctrl.kind === 'remote') { const it = s.intent; const lp = s.lastPress || (s.lastPress = {}); for (const [k, ac] of [['pass', 'jab'], ['shoot', 'hay'], ['deke', 'duck'], ['lob', 'yank']]) if (it.press[k] !== lp[k]) { lp[k] = it.press[k]; act(m, f, who, ac); } }
      else cpuThink(m, f, who, dt);
    }
    stepSide(m, f, 'a', dt); stepSide(m, f, 'b', dt);
    if (f.t > 40) { f.ba = f.bb = 1; }
    if (f.ba <= 0 || f.bb <= 0 || f.t > 40) {
      const w = f.ba <= 0 && f.bb > 0 ? b : f.bb <= 0 && f.ba > 0 ? a : (f.t > 40 ? null : null);
      f.winner = w || 'draw'; f.end = 2.6; const l = w === a ? b : w === b ? a : null;
      if (w) { w.state = 'fight'; l.state = 'fight'; w.stats.fightsWon++; w.stats.fights++; l.stats.fights++; Sim.addBoom(m, w.side, 45); Sim.addBoom(m, l.side, 5); }
      else { Sim.addBoom(m, 0, 10); Sim.addBoom(m, 1, 10); }
      Sim.emit('fight_end', { w, l, draw: !w, a, b });
    }
  }
  function finish(m) {
    const f = m.fight; const { a, b } = f; const w = f.winner === 'draw' ? null : f.winner, l = w ? (w === a ? b : a) : null;
    for (const s of [a, b]) { s.state = 'skate'; s.st = 0; s.fightAct = null; s.hood = false; s.grudge = {}; }
    if (l && !m.cfg.noSinBin) { l.state = 'bin'; l.bin = T.sinBin; l.vx = l.vy = 0; m.sinBin.push(l); Sim.emit('sin_bin', { s: l }); }
    m.fight = null; m.phaseNoPlay = false; const mx = f.cx, my = f.cy; m.phase = 'stoppage'; m.pt = 0; m.after = () => { const d = Rink.nearestDot(mx, my); Match.faceoffNow(d[0], d[1], false); };
    for (const s of m.sk) if (s.state === 'bin') {} Sim.emit('fight_over', { w, l });
  }
  /** challenge detection: a human holding lob near a rival with a grudge */
  function stepChallenges(m, dt) {
    if (m.phase !== 'play' || m.fight || m.cfg.noFight) return;
    for (const s of m.sk) {
      s.fightPrompt = false;
      const human = s.ctrl.kind === 'human' || s.ctrl.kind === 'remote'; 
      for (const o of m.sk) {
        if (o.side === s.side || o.state === 'bin') continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d > 40) continue;
        const g = Math.max(s.grudge[o.id] || 0, o.grudge[s.id] || 0);
        if (g < 40) continue;
        if (human) { s.fightPrompt = true; if (s.intent.lobHeld && !s.hasPuck) { s.holdLob = (s.holdLob || 0) + dt; if (s.holdLob >= .5 && canChallenge(m, s, o)) { s.holdLob = 0; challenge(m, s, o); } } else s.holdLob = 0; }
        else if (s.rt.fgt >= 4 && g >= 60 && canChallenge(m, s, o) && RNG.sim() < dt * .6) challenge(m, s, o);
      }
    }
  }
  function challenge(m, a, b) {
    Sim.emit('challenge', { a, b });
    const bh = b.ctrl.kind === 'human' || b.ctrl.kind === 'remote';
    if (bh) { m.pendingChallenge = { a, b, t: 3 }; return; }
    const g = Math.max(a.grudge[b.id] || 0, b.grudge[a.id] || 0), accept = clamp(.4 + .12 * (b.rt.fgt - 3) + g / 200, .1, .95) + (m.cfg.forceFight ? 1 : 0) + (m.cfg.story && m.cfg.story.id === 3 && ['bruisers'].includes(b.team.id) ? 1 : 0);
    if (RNG.sim() < accept) begin(m, a, b); else turtle(m, b, a);
  }
  function turtle(m, loser, ch) { Sim.addBoom(m, loser.side, -10); m.boom[loser.side] = Math.max(0, m.boom[loser.side]); Sim.addBoom(m, ch.side, 10); Sim.emit('turtle', { s: loser }); a_clear(m); }
  const a_clear = m => { m.pendingChallenge = null; };
  function stepPending(m, dt) {
    const pc = m.pendingChallenge; if (!pc) return; pc.t -= dt; const b = pc.b; if (b.intent.lobHeld) { b.holdAcc = (b.holdAcc || 0) + dt; if (b.holdAcc > .4) { b.holdAcc = 0; m.pendingChallenge = null; begin(m, pc.a, b); } } else b.holdAcc = 0;
    if (pc.t <= 0) { m.pendingChallenge = null; turtle(m, b, pc.a); }
  }
  return { begin, step, stepChallenges, stepPending, challenge, canChallenge };
})();
