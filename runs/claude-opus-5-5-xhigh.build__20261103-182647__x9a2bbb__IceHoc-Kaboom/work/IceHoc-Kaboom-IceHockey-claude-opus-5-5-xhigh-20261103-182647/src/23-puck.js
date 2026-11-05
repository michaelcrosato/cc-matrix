/* ---- SHOTS (7.4, 7.5): passes led to the mate (tape to tape, or into space at the reticle), saucers over sticks
 * (E.arc), wrist shots, slapshots from a charge, one-timers, KABOOM shots; the aim point in the net ---- */
const Shots = (() => {
  const GRAV = 420;
  /** where in the net a shot goes: [y, z] on the goal line of net s */
  function aimPoint(m, s, kind, charge) {
    const net = m.attackNet(s.team), gx = Rink.goalX(net), g = m.goalieAt(net), it = s.intent;
    let y;
    if (it.aim) {   // the reticle (mouse) or the right stick: where its line meets the mouth
      const ax = it.aim[0], ay = it.aim[1], dx = ax - s.x; y = Math.abs(dx) > 4 ? s.y + (ay - s.y) * (gx - s.x) / dx : ay;
      y = clamp(y, Rink.C.y - 13, Rink.C.y + 13);
    } else {
      const gy = g ? g.y : Rink.C.y, open = gy > Rink.C.y ? -1 : 1;
      const stickUp = Math.abs(it.my) > .5 ? Math.sign(it.my) : 0;
      y = Rink.C.y + (stickUp ? stickUp : open) * (10 + RNG.sim() * 3);
    }
    const down = g && (g.state === 'butterfly' || g.state === 'stack');
    let z = kind === 'wrist' ? 2 + RNG.sim() * 8 : 4 + RNG.sim() * 14;
    if (kind !== 'wrist' && down) z = 14 + RNG.sim() * 4;
    if (it.my && it.aim === null && kind === 'wrist' && s.ctrl.kind !== 'cpu') z = 3 + RNG.sim() * 12;
    return [gx, y, z];
  }
  /** launch the puck from s toward (tx, ty, tz) at speed sp with lateral error sd (units at the target) */
  function launch(m, s, tx, ty, tz, sp, sd) {
    const pk = m.puck; { const [bx, by] = Skater.blade(s); pk.x = bx; pk.y = by; const w = Rink.wall(bx, by); if (w.d < 2) { pk.x += w.nx * (2 - w.d); pk.y += w.ny * (2 - w.d); } }
    const d = Math.hypot(tx - pk.x, ty - pk.y) || 1;
    const nx = (tx - pk.x) / d, ny = (ty - pk.y) / d, e = U.gauss(RNG.sim) * sd, ez = U.gauss(RNG.sim) * sd * .35;
    const ax = tx - ny * e, ay = ty + nx * e, dd = Math.hypot(ax - pk.x, ay - pk.y) || 1, t = dd / sp;
    pk.vx = (ax - pk.x) / dd * sp; pk.vy = (ay - pk.y) / dd * sp;
    pk.vz = clamp((tz + ez - 1 + GRAV * .5 * t * t) / Math.max(.05, t), 0, 320); pk.z = 1;
    pk.owner = null; pk.last = s; s.pickupCD = .3; pk.passTo = null;
  }
  function shoot(m, s, kind, charge) {
    const pk = m.puck; if (pk.owner !== s) return;
    const sh = RATE.shot(s.def), err = RATE.err(s.def) * T.shotError;
    const kab = m.kaboom[s.team] > 0 && kind === 'slap' && charge >= .95, ot = kind === 'onetimer';
    let sp, sd;
    if (kind === 'wrist') { sp = T.wristSpeed * sh; sd = 5 * err; }
    else { const c = ot ? .85 : charge; sp = (T.slapBase + T.slapGain * c) * sh; sd = 7 * err * (1.4 - .4 * c); }
    if (ot) { sp *= T.oneTimerBonus; sd *= .5; }
    if (s.turboOn) sp *= 1.12;
    if (s.items.lumber > 0) { sp *= 1.3; sd = 0; s.items.lumber--; }
    if (s.ctrl.kind === 'cpu') sd *= m.aiErr(s.team);
    if (kab) { sp = 760; sd = 0; kind = 'kaboom'; }
    if (kind === 'wrist' && s.dekeAt !== undefined && m.t - s.dekeAt < 1.6) kind = 'deke';
    if (m.puck.rebound && m.t - m.puck.rebound < 1.2 && kind !== 'kaboom') kind = kind === 'wrist' ? 'rebound' : kind;
    const [tx, ty, tz] = aimPoint(m, s, kind, charge);
    launch(m, s, tx, ty, tz, Math.min(760, sp), sd);
    pk.onFire = kind === 'kaboom'; pk.shot = { by: s.id, team: s.team, kind, speed: Math.round(Math.hypot(pk.vx, pk.vy)), t: m.t, x: s.x, y: s.y, net: m.attackNet(s.team) };
    pk.curl = s.twistShot ? (pk.y < Rink.C.y ? 1 : -1) * 1.2 : 0; pk.twister = !!s.twistShot; s.twistShot = false;
    const onGoal = willCross(pk, pk.shot.net);
    pk.shot.onGoal = onGoal;
    Skater.setState(s, 'shoot', .3); s.shotKind = kind;
    s.stats.shots++; if (onGoal) m.teams[s.team].shots++;
    s.stats.topShot = Math.max(s.stats.topShot, pk.shot.speed);
    Bus.emit('shot', { by: s.id, team: s.team, kind, speed: pk.shot.speed, onGoal, dist: Math.round(Math.abs(Rink.goalX(pk.shot.net) - s.x)) });
    if (kind === 'kaboom') Bus.emit('kaboom_shot', { by: s.id, team: s.team });
  }
  /** does the puck's line cross net n's goal line inside the mouth (and under the bar)? */
  function willCross(pk, n) {
    const gx = Rink.goalX(n), dx = gx - pk.x; if (Math.sign(dx) !== Math.sign(pk.vx) || Math.abs(pk.vx) < 1) return false;
    const t = dx / pk.vx, y = pk.y + pk.vy * t, z = pk.z + pk.vz * t - GRAV / 2 * t * t;
    return Math.abs(y - Rink.C.y) < Rink.MOUTH - 1 && z < Rink.BAR && t < 2.5;
  }
  /** the teammate a pass goes to, or a point in space (the reticle) */
  function passTarget(m, s) {
    const mates = m.teams[s.team].skaters.filter(o => o !== s && o.state !== 'bin' && o.state !== 'frozen' && o.state !== 'fight');
    if (!mates.length) return null;
    const it = s.intent;
    if (it.aim) {
      let best = null, bd = 80; for (const o of mates) { const d = Math.hypot(o.x - it.aim[0], o.y - it.aim[1]); if (d < bd) { bd = d; best = o; } }
      return best ? { mate: best } : { x: it.aim[0], y: it.aim[1] };
    }
    if (s.passPick) { const o = mates.find(q => q.id === s.passPick); s.passPick = null; if (o) return { mate: o }; }
    const dir = Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : s.facing;
    let best = null, ba = 1.31;
    for (const o of mates) { const a = Math.abs(U.angDiff(dir, U.angTo(s, o))); if (a < ba) { ba = a; best = o; } }
    if (!best) { const fwd = m.attackDir(s.team); best = mates.slice().sort((a, b) => (b.x - a.x) * fwd - (a.x - b.x) * fwd * 0 - (U.dist(a, s) - U.dist(b, s)) * .1)[0]; }
    return { mate: best };
  }
  function pass(m, s, saucer) {
    const pk = m.puck; if (pk.owner !== s) return;
    const tg = passTarget(m, s); if (!tg) return;
    { const [bx, by] = Skater.blade(s); pk.x = bx; pk.y = by; const w = Rink.wall(bx, by); if (w.d < 2) { pk.x += w.nx * (2 - w.d); pk.y += w.ny * (2 - w.d); } }
    let tx, ty, mate = tg.mate || null;
    const pq = RATE.pass(s.def);
    let sp;
    if (mate) {
      tx = mate.x; ty = mate.y; let t = 0;
      for (let k = 0; k < 2; k++) { const d = Math.hypot(tx - pk.x, ty - pk.y); sp = clamp(220 + .9 * d, T.passMin, T.passMax) * pq; t = d / sp; tx = mate.x + mate.vx * t * .9 + Math.cos(mate.facing) * 6; ty = mate.y + mate.vy * t * .9 + Math.sin(mate.facing) * 6; }
      const w = Rink.wall(tx, ty); if (w.d < 12) { tx += w.nx * (12 - w.d); ty += w.ny * (12 - w.d); }
    } else { tx = tg.x; ty = tg.y; const d = Math.hypot(tx - pk.x, ty - pk.y); sp = clamp(220 + .9 * d, T.passMin, T.passMax) * pq; }
    const sig = .06 * (1.3 - .1 * s.def.r[2]) * (s.ctrl.kind === 'cpu' ? m.aiErr(s.team) : 1) * (s.items.tape > 0 ? .3 : 1);
    const a = Math.atan2(ty - pk.y, tx - pk.x) + U.gauss(RNG.sim) * sig, d = Math.hypot(tx - pk.x, ty - pk.y);
    pk.owner = null; pk.last = s; s.pickupCD = .3;
    if (saucer) {
      const v = E.arc({ x: pk.x, y: pk.y, z: 0 }, { x: pk.x + Math.cos(a) * d, y: pk.y + Math.sin(a) * d, z: 0 }, GRAV, { apex: T.saucerApex });
      pk.vx = v.vx; pk.vy = v.vy; pk.vz = v.vz; pk.z = .5;
    } else { pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp; pk.vz = 0; pk.z = 0; }
    pk.passTo = mate; pk.passFrom = s; pk.passKind = saucer ? 'saucer' : 'pass'; pk.passT = m.t; pk.shot = null; pk.onFire = false; pk.taped = s.items.tape > 0;
    Skater.setState(s, 'pass', .2); s.passKind = saucer ? 'saucer' : 'pass';
    Bus.emit('pass', { from: s.id, to: mate ? mate.id : -1, kind: pk.passKind, team: s.team });
  }
  return { shoot, pass, willCross, aimPoint, launch };
})();

/* ---- PUCK (7.3): possession (it eases to the blade and weaves), free motion in 4 substeps against the boards, the
 * glass, the posts and crossbar, the nets, the goalies, sticks and bodies; pickups, deflections, battles, goals, out
 * of play ---- */
const Puck = (() => {
  const R = 1.6, GRAV = 420;
  function make() { return { x: Rink.C.x, y: Rink.C.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, onFire: false, inNet: -1, out: false, passTo: null, shot: null, trail: [], curl: 0 }; }
  function setOwner(m, pk, s, why) {
    if (pk.owner === s) return;
    const was = pk.owner, last = pk.last;
    if (pk.passTo === s && pk.passFrom && pk.passFrom.team === s.team) { pk.passFrom.stats.passes++; Bus.emit('pass_complete', { from: pk.passFrom.id, to: s.id, team: s.team }); }
    else if (pk.passTo && pk.passFrom && pk.passFrom.team !== s.team) Bus.emit('intercept', { by: s.id, team: s.team });
    if (was && was.team !== s.team) { s.stats.takeaways++; Bus.emit('takeaway', { by: s.id, from: was.id, how: why }); }
    // the last two touches by the scorer's team give the assists
    if (!last || last !== s) { pk.prev = last; }
    pk.owner = s; pk.last = s; pk.passTo = null; pk.shot = null; pk.onFire = false; pk.curl = 0; pk.z = 0; pk.vz = 0;
    if (s.team !== (last ? last.team : -1)) pk.touches = [s]; else { pk.touches = (pk.touches || []).filter(t => t !== s); pk.touches.push(s); }
    Bus.emit('possession', { by: s.id, team: s.team, how: why || 'pickup' });
  }
  const loose = (m, pk) => { if (pk.owner) { pk.owner.pickupCD = .25; pk.owner = null; } };
  function step(m, dt) {
    const pk = m.puck; if (m.noPuck) return;
    if (pk.inNet >= 0) { inNetStep(m, pk, dt); return; }
    if (pk.out) return;
    if (pk.owner) {
      const s = pk.owner;
      if (!Skater.free(s) || s.state === 'fight') { loose(m, pk); pk.vx = s.vx; pk.vy = s.vy; }
      else {
        const [bx, by] = Skater.blade(s), sp = Math.hypot(s.vx, s.vy), w = Math.sin(m.t * 9 + s.id) * 3 * clamp(1 - sp / 140, .2, 1);
        const tx = bx - Math.sin(s.facing) * w, ty = by + Math.cos(s.facing) * w, k = 1 - Math.exp(-30 * dt);
        pk.x += (tx - pk.x) * k; pk.y += (ty - pk.y) * k; pk.z = 0; pk.vx = s.vx; pk.vy = s.vy; pk.vz = 0;
        const wl = Rink.wall(pk.x, pk.y); if (wl.d < R + 1) { pk.x += wl.nx * (R + 1 - wl.d); pk.y += wl.ny * (R + 1 - wl.d); }
        if (m.cheats.magnet && s.ctrl.kind !== 'human') {}
        battles(m, pk, s, dt);
        return;
      }
    }
    const N = 4, h = dt / N;
    for (let k = 0; k < N && !pk.owner && pk.inNet < 0 && !pk.out; k++) sub(m, pk, h);
    if (!pk.owner && pk.inNet < 0 && !pk.out) pickups(m, pk);
    if (m.cheats.magnet && !pk.owner) { const h1 = m.skaters.find(s => s.ctrl.kind === 'human'); if (h1 && Skater.free(h1)) { const a = U.angTo(pk, h1); pk.vx += Math.cos(a) * 900 * dt; pk.vy += Math.sin(a) * 900 * dt; } }
    pk.trail.push([pk.x, pk.y, pk.z]); if (pk.trail.length > 8) pk.trail.shift();
  }
  function sub(m, pk, h) {
    const sp = Math.hypot(pk.vx, pk.vy);
    if (pk.z <= .3 && sp > 0) { const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * h); pk.vx *= ns / sp; pk.vy *= ns / sp; }
    if (pk.curl && sp > 60) { const k = pk.curl * h; const vx = pk.vx; pk.vx += -pk.vy * k; pk.vy += vx * k; pk.curl *= Math.exp(-h * 1.2); }
    if (sp > 760) { pk.vx *= 760 / sp; pk.vy *= 760 / sp; }
    const ox = pk.x, oy = pk.y, oz = pk.z;
    pk.x += pk.vx * h; pk.y += pk.vy * h;
    if (pk.z > 0 || pk.vz > 0) { pk.vz -= GRAV * h; pk.z += pk.vz * h; if (pk.z <= 0) { pk.z = 0; if (pk.vz < -60) { pk.vx *= .9; pk.vy *= .9; Bus.emit('puck_land', { x: pk.x, y: pk.y, saucer: pk.passKind === 'saucer' }); } pk.vz = Math.abs(pk.vz) > 40 ? -pk.vz * .3 : 0; } }
    // goals, posts, the crossbar, nets
    for (const n of [0, 1]) {
      const gx = Rink.goalX(n), d = Rink.intoNet(n), was = (ox - gx) * d, now = (pk.x - gx) * d;
      // posts
      for (const py of [Rink.C.y - Rink.MOUTH, Rink.C.y + Rink.MOUTH]) {
        const dx = pk.x - gx, dy = pk.y - py, dd = Math.hypot(dx, dy), rr = Rink.POST_R + R;
        if (dd < rr && pk.z < Rink.BAR) {
          const nx = dx / (dd || 1), ny = dy / (dd || 1), vn = pk.vx * nx + pk.vy * ny;
          if (vn < 0) { pk.vx -= 1.82 * vn * nx; pk.vy -= 1.82 * vn * ny; pk.x = gx + nx * rr; pk.y = py + ny * rr; if (-vn > 80) Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: false, net: n, x: pk.x, y: pk.y }); }
        }
      }
      if (was <= 0 && now > 0 && Math.abs(pk.y - Rink.C.y) < Rink.MOUTH) {
        if (pk.z < Rink.BAR - R && Math.abs(pk.y - Rink.C.y) < Rink.MOUTH - R) { goalLine(m, pk, n); return; }
        if (pk.z >= Rink.BAR - R && pk.z < Rink.BAR + R) { pk.vz = Math.abs(pk.vz) * .5 + 60; pk.vx = -pk.vx * .6; pk.x = gx - d * .5; Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: true, net: n, x: pk.x, y: pk.y }); }
      }
      // the net's frame from behind or the sides
      if (pk.z < 14 && Rink.inNet(n, pk.x, pk.y) && !(was <= 0)) {
        const u = (pk.x - gx) * d; if (u > Rink.NET_D - 3 || Math.abs(Math.abs(pk.y - Rink.C.y) - Rink.MOUTH) < 4) { pk.x = ox; pk.y = oy; if (Math.abs(Math.abs(oy - Rink.C.y) - Rink.MOUTH) < 4 && u <= Rink.NET_D - 3) pk.vy = -pk.vy * .2; else pk.vx = -pk.vx * .2; Bus.emit('net_hit', { x: pk.x, y: pk.y }); }
      }
    }
    // goalies
    for (const g of m.goalies) if (Goalie.collide(m, g, pk, ox, oy, oz)) return;
    // bodies (a shot into a skater is a block)
    for (const s of m.skaters) {
      if (s.state === 'bin' || pk.z > 16 || s === pk.last && pk.shot && m.t - pk.shot.t < .15) continue;
      const dx = pk.x - s.x, dy = pk.y - s.y, dd = Math.hypot(dx, dy);
      if (dd < 6 + R) {
        const nx = dx / (dd || 1), ny = dy / (dd || 1), vn = pk.vx * nx + pk.vy * ny;
        if (vn < 0) {
          const fast = Math.hypot(pk.vx, pk.vy) > 280;
          if (!fast && Skater.free(s) && s.pickupCD <= 0) continue;   // (a slow puck is taken by pickups instead)
          pk.vx -= 1.35 * vn * nx; pk.vy -= 1.35 * vn * ny; pk.vx *= .55; pk.vy *= .55; pk.x = s.x + nx * (6 + R);
          if (pk.shot && pk.shot.team !== s.team) { s.stats.blocks = (s.stats.blocks || 0) + 1; Bus.emit('block', { by: s.id, team: s.team }); if (pk.onFire) { Bus.emit('kaboom_body', { victim: s.id, x: s.x, y: s.y }); Hits.knock(m, s, Math.atan2(-ny, -nx), 220, null); } pk.shot = null; pk.onFire = false; }
          else Bus.emit('body', { by: s.id });
        }
      }
    }
    // the boards and the glass; out over the top or through a broken panel
    const w = Rink.wall(pk.x, pk.y);
    if (w.d < R) {
      const pn = Rink.panelAt(pk.x, pk.y), top = Rink.BOARD_H + (pn ? pn.glassH : 28), ice = m.arena.snowbanks;
      if ((pk.z > top && !ice) || (pk.z > Rink.BOARD_H && pn && pn.state === 'shattered') || (ice && pk.z > 12)) { pk.out = true; Bus.emit('puck_out', { x: pk.x, y: pk.y }); return; }
      const glass = pk.z > Rink.BOARD_H, vn = pk.vx * w.nx + pk.vy * w.ny;
      pk.x += w.nx * (R - w.d); pk.y += w.ny * (R - w.d);
      if (vn < 0) {
        const e = ice ? .3 : glass ? .5 : T.boardBounce, tx = pk.vx - vn * w.nx, ty = pk.vy - vn * w.ny;
        pk.vx = tx * (ice ? .7 : .92) - vn * e * w.nx; pk.vy = ty * (ice ? .7 : .92) - vn * e * w.ny;
        if (-vn > 60) Bus.emit(glass ? 'puck_glass' : 'puck_boards', { x: pk.x, y: pk.y, z: pk.z, speed: -vn, snow: !!ice });
        if (pk.onFire) { Bus.emit('kaboom_boards', { x: pk.x, y: pk.y }); if (pn && !ice) Hits.glass(m, pn, 999, null); pk.onFire = false; }
        if (pk.shot) pk.shot = null;
      }
    }
  }
  function goalLine(m, pk, n) {
    pk.inNet = n; pk.inNetT = 0; const net = Rink.NETS[n]; net.bv += Math.min(14, Math.hypot(pk.vx, pk.vy) / 40); net.by = pk.y;
    pk.vx *= .35; pk.vy *= .35; pk.vz = Math.min(pk.vz, 30);
    Match.goal(n, pk);
  }
  function inNetStep(m, pk, dt) {
    const n = pk.inNet, gx = Rink.goalX(n), d = Rink.intoNet(n);
    pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.vx *= Math.exp(-4 * dt); pk.vy *= Math.exp(-4 * dt);
    if (pk.z > 0 || pk.vz > 0) { pk.vz -= GRAV * dt; pk.z = Math.max(0, pk.z + pk.vz * dt); if (pk.z === 0) pk.vz = 0; }
    const u = (pk.x - gx) * d; if (u > Rink.NET_D - 2.5) { pk.x = gx + d * (Rink.NET_D - 2.5); pk.vx = -pk.vx * .2; }
    if (u < 2) pk.x = gx + d * 2;
    pk.y = clamp(pk.y, Rink.C.y - Rink.MOUTH + 2.5, Rink.C.y + Rink.MOUTH - 2.5);
  }
  /** a loose puck near a blade: taken, caught or deflected */
  function pickups(m, pk) {
    if (pk.z > 6) return;
    if (pk.passKind === 'saucer' && pk.z > 2 && pk.passTo) return;
    let best = null, bd = 1e9;
    for (const s of m.skaters) {
      if (!Skater.free(s) || s.pickupCD > 0 || s.state === 'fight' || s.state === 'bin' || s.state === 'wind' && false) continue;
      if (m.phase !== 'play' && m.phase !== 'shootout') continue;
      if (pk.taped && pk.passTo && s.team !== pk.passTo.team) continue;
      const cut = pk.passTo && pk.passTo.team !== s.team;   // a rival cutting a pass needs the blade on it
      const [bx, by] = Skater.blade(s), rad = T.pickupRadius * RATE.hands(s.def) * (pk.passTo === s ? 1.5 : 1) * (s.ctrl.kind === 'cpu' ? 1 : 1.1) * (cut ? .85 : 1);
      const d = cut ? Math.hypot(pk.x - bx, pk.y - by) : Math.min(Math.hypot(pk.x - bx, pk.y - by), Math.hypot(pk.x - s.x, pk.y - s.y) - 3);
      if (d < rad && d < bd) { bd = d; best = s; }
    }
    if (!best) return;
    const s = best, rel = Math.hypot(pk.vx - s.vx, pk.vy - s.vy);
    // a one-timer: fire on contact
    if (pk.passTo === s && (s.otArmed > 0 || s.intent.held.shoot) && rel > 60 && Skater.free(s)) { setOwner(m, pk, s, 'onetimer'); Shots.shoot(m, s, 'onetimer', .85); Bus.emit('onetimer', { by: s.id, team: s.team }); return; }
    const cutter = pk.passTo && pk.passTo.team !== s.team;
    if ((rel < 300 && !cutter) || (cutter && rel < 160) || pk.passTo === s && rel < 460) { setOwner(m, pk, s, 'pickup'); return; }
    const ch = clamp(1.3 - rel / 450 + .08 * (s.def.r[5] - 3), .1, 1);
    if (RNG.sim() < ch) setOwner(m, pk, s, 'catch');
    else { const a = s.facing + PI / 2 * s.hand, vn = pk.vx * Math.cos(a) + pk.vy * Math.sin(a); pk.vx = (pk.vx - 2 * vn * Math.cos(a)) * .5; pk.vy = (pk.vy - 2 * vn * Math.sin(a)) * .5; s.pickupCD = .2; pk.last = s;
      if (pk.shot && pk.shot.team === s.team && Math.abs(s.x - Rink.goalX(pk.shot.net)) < 90) { pk.shot.kind = 'deflect'; pk.shot.by = s.id; Bus.emit('deflect', { by: s.id }); } else pk.shot = null; Bus.emit('clack', { by: s.id }); }
  }
  /** opposing blades near a carried puck: every 0.2 s the stronger hands take it */
  function battles(m, pk, s, dt) {
    s.battleT = (s.battleT || 0) + dt; if (s.battleT < .2) return; s.battleT = 0;
    if (s.items.tape > 0 || s.state === 'deke' && s.stateT > .15) return;
    for (const o of m.teams[1 - s.team].skaters) {
      if (!Skater.free(o) || o.state === 'bin' || o.pickupCD > 0) continue;
      const [bx, by] = Skater.blade(o); if (Math.hypot(bx - pk.x, by - pk.y) > 8) continue;
      const a = s.def.r[5] + s.def.r[3] / 2 + RNG.sim() * 3 + (s.ctrl.kind === 'human' ? .8 : 0), b = o.def.r[5] + o.def.r[3] / 2 + RNG.sim() * 3 + (o.ctrl.kind === 'cpu' ? m.aiSkill(o.team) - .6 : 0);
      Bus.emit('battle', { a: s.id, b: o.id });
      if (b > a + 1.2) { setOwner(m, pk, o, 'battle'); return; }
    }
  }
  return { make, step, setOwner, loose, R };
})();
