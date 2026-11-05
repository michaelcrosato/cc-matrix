/* ---- Puck: possession, substepped free motion against boards, glass, posts, nets, goalies, sticks and bodies; goals ---- */
const Puck = (() => {
  const R = 1.6, G = 700;
  const canTake = s => Skater.free(s) && s.state !== 'check' && s.cool.pickup <= 0 && !(M.fight && M.fight.who.includes(s));
  function step(dt) {
    const p = M.puck;
    p.trailT = (p.trailT || 0) + dt;
    if (p.inNet) { const k = Math.exp(-dt * 6); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z - 40 * dt); return; }
    if (p.held) return;   // in a goalie's glove or a referee's hand
    if (p.owner) return carried(p, dt);
    const n = 4, h = dt / n;
    for (let i = 0; i < n && !p.owner && !p.inNet && !p.dead; i++) sub(p, h);
  }
  function carried(p, dt) {
    const s = p.owner, [bx, by] = Skater.blade(s), weave = Math.hypot(s.vx, s.vy) < 60 ? Math.sin(M.t * 9) * 3 : Math.sin(M.t * 5) * 1.2;
    const tx = bx - Math.sin(s.facing) * weave, ty = by + Math.cos(s.facing) * weave, k = 1 - Math.exp(-30 * dt);
    p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.z = 0; p.vx = s.vx; p.vy = s.vy; p.vz = 0;
    // puck battles: an opposing blade within 8 of a carried puck (not one taped down by Grandma's Tape)
    p.battleT = (p.battleT || 0) - dt;
    if (p.battleT <= 0 && !(s.items.tape > 0)) {
      p.battleT = .2;
      for (const o of M.skaters) {
        if (o.team === s.team || !canTake(o)) continue;
        const [ox, oy] = Skater.blade(o); if (Math.hypot(ox - p.x, oy - p.y) > 8) continue;
        const a = s.def.hnd + s.def.hit / 2 + RNG.sim() * 3, b = o.def.hnd + o.def.hit / 2 + RNG.sim() * 3;
        Bus.emit('battle', { a: s.id, b: o.id, x: p.x, y: p.y });
        if (b > a) { take(o, p, 'battle'); M.stats[o.id].takeaways++; }
        break;
      }
    }
  }
  /** s takes the puck */
  function take(s, p, how) {
    const prev = p.owner, last = p.lastTouch;
    p.owner = s; p.vx = s.vx; p.vy = s.vy; p.vz = 0; p.z = 0; p.onFire = false; p.held = false;
    if (p.passTo && p.passTo.team === s.team && p.passFrom && p.passFrom !== s) { Bus.emit('pass_complete', { by: p.passFrom.id, to: s.id, team: s.team }); }
    else if (p.passTo && p.passFrom && p.passFrom.team !== s.team) Bus.emit('intercept', { by: s.id, team: s.team });
    if (last && last !== s) { p.prevTouch = last; }
    p.lastTouch = s; p.touchT = M.t; p.passTo = null; p.shotBy = null;
    for (const o of M.skaters) o.receiving = 0;
    Bus.emit('possession', { by: s.id, team: s.team, how: how || 'pickup' });
    if (s.oneTimer > 0 && M.phase === 'play') { s.oneTimer = 0; Skater.shoot(s, 'onetimer', .85, { aim: s.ai ? null : s.lastAim }); return; }
  }
  function sub(p, h) {
    const sp = Math.hypot(p.vx, p.vy);
    if (p.z <= .05 && sp > 0) { const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * h); p.vx *= ns / sp; p.vy *= ns / sp; }
    if (p.z > 0 || p.vz > 0) p.vz -= G * h;
    const px0 = p.x, py0 = p.y, pz0 = p.z;
    p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
    if (p.z < 0) { p.z = 0; if (p.vz < -60) { p.vx *= .9; p.vy *= .9; p.wobble = .6; } p.vz = Math.abs(p.vz) > 25 ? -p.vz * .3 : 0; }
    const cy = Rink.C.y, mouth = Rink.MOUTH;
    for (const side of [0, 1]) {
      const gx = Rink.goalX(side), od = Rink.outDir(side), was = (px0 - gx) * od, now = (p.x - gx) * od;
      // the save solver gets its look first: the goalie of this end
      const gl = M.goalies.find(g => g && Skater.ownGoal(g.team).side === side);
      if (gl && Goalie.test(gl, p, px0, py0, pz0)) return;
      if (was < 0 && now >= 0) {   // crossing the goal line
        const yAt = py0 + (p.y - py0) * (-was / (now - was || 1)), zAt = pz0 + (p.z - pz0) * (-was / (now - was || 1));
        if (Math.abs(yAt - cy) < mouth - R && zAt < Rink.BAR - R) {
          if (gl && gl.def === TEAMS.muskrats.goalie && Math.abs(Math.abs(yAt - cy) - mouth) < 4 && RNG.sim() < .2) { ping(p, side, yAt, false); p.x = gx - od * 2; return; }   // Lemmy talks to his posts
          return M.goal(side);
        }
        if (Math.abs(yAt - cy) < mouth + R && zAt >= Rink.BAR - R && zAt < Rink.BAR + R + 1) { ping(p, side, yAt, true); return; }   // the crossbar
      }
      // the posts: two thin cylinders
      for (const sy of [-1, 1]) {
        const ppx = gx, ppy = cy + sy * mouth, dd = Math.hypot(p.x - ppx, p.y - ppy);
        if (dd < R + 1.5 && p.z < Rink.BAR) { const nx = (p.x - ppx) / (dd || 1), ny = (p.y - ppy) / (dd || 1), vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= 1.82 * vn * nx; p.vy -= 1.82 * vn * ny; p.x = ppx + nx * (R + 1.6); p.y = ppy + ny * (R + 1.6); if (-vn > 60) ping(p, side, ppy, false, true); } }
      }
      // the net: solid from behind and the sides
      const inBox = (x, y) => (x - gx) * od > 0 && (x - gx) * od < Rink.NETD && Math.abs(y - cy) < mouth + 1;
      if (inBox(p.x, p.y) && !inBox(px0, py0) && p.z < Rink.BAR) {
        if (!(was < 0 && now >= 0)) { if (Math.abs(px0 - gx) * 1 >= Rink.NETD - .5 || (px0 - gx) * od >= Rink.NETD) p.vx = -p.vx * .2; else p.vy = -p.vy * .2; p.x = px0; p.y = py0; A.sfx('net', { vol: .5 }); }
      }
    }
    // boards and glass
    const d = Rink.sdf(p.x, p.y);
    if (d > -R) {
      const pan = Rink.panelAt(p.x, p.y), boardTop = M.arena.snowbank ? 9 : Rink.BOARD, glassTop = M.arena.snowbank ? 12 : boardTop + pan.h;
      if (p.z > glassTop || (pan.state === 'shattered' && p.z > 4) || (M.arena.snowbank && p.z > 9)) { p.dead = true; Bus.emit('out', { x: p.x, y: p.y }); M.stoppage('out', Rink.nearestDot(p.x, p.y)); return; }
      const n = Rink.normal(p.x, p.y), vn = p.vx * n[0] + p.vy * n[1];
      p.x -= n[0] * (d + R); p.y -= n[1] * (d + R);
      if (vn > 0) {
        const glass = p.z > boardTop, e = glass ? .5 : M.arena.snowbank ? .3 : T.boardBounce, keep = .92;
        p.vx = (p.vx - vn * n[0]) * keep - vn * e * n[0]; p.vy = (p.vy - vn * n[1]) * keep - vn * e * n[1];
        if (vn > 50) Bus.emit(glass ? 'glass_hit' : 'boards', { x: p.x, y: p.y, speed: vn, panel: pan.i, snow: !!M.arena.snowbank });
        if (p.onFire) { Bus.emit('blast', { x: p.x, y: p.y, panel: pan.i }); Hits.breakPanel(pan, 'shattered', p.lastTouch); p.onFire = false; }
        p.passTo = null;
      }
    }
    // thin-ice holes swallow the puck
    if (Items.holeAt(p.x, p.y) && p.z < 1) { p.dead = true; Bus.emit('puck_lost', { x: p.x, y: p.y }); M.stoppage('hole', Rink.nearestDot(p.x, p.y, Rink.DOTS.nz)); return; }
    // sticks: pickups, interceptions and deflections; bodies block shots
    if (p.z < 6) {
      for (const s of M.skaters) {
        if (!canTake(s)) continue;
        if (p.lastTouch === s && M.t - p.touchT < .2) continue;
        if (p.tape && p.passFrom && p.passFrom.team !== s.team && p.passTo) continue;   // taped passes can't be picked off
        const [bx, by] = Skater.blade(s), db = Math.hypot(bx - p.x, by - p.y), dbody = Math.hypot(s.x - p.x, s.y - p.y);
        const reach = T.pickupRadius * Skater.hndMul(s.def) * (s.ai ? .85 + .3 * s.ai.skill : 1);
        if (db > reach && dbody > 10) continue;
        const rel = Math.hypot(p.vx - s.vx, p.vy - s.vy);
        if (s.oneTimer > 0 || p.passTo === s || rel < 300) { take(s, p); return; }
        const chance = clamp(1.3 - rel / 450 + .08 * (s.def.hnd - 3), .1, 1);
        if (RNG.sim() < chance * (p.shotBy && p.shotBy.team !== s.team ? .55 : 1)) { take(s, p, 'catch'); if (p.shotBy && p.shotBy.team !== s.team) Bus.emit('block', { by: s.id, team: s.team }); return; }
        // it deflects off the blade (or the body: a blocked shot)
        const nx = (p.x - s.x) / (dbody || 1), ny = (p.y - s.y) / (dbody || 1), vn = p.vx * nx + p.vy * ny;
        if (vn < 0) { p.vx = (p.vx - 2 * vn * nx) * .5; p.vy = (p.vy - 2 * vn * ny) * .5; p.prevTouch = p.lastTouch; p.lastTouch = s; p.touchT = M.t; p.kind = 'deflect'; Bus.emit(dbody < 10 ? 'block' : 'deflect', { by: s.id, team: s.team }); }
        return;
      }
    }
    if (p.z < 1 && Math.hypot(p.vx, p.vy) < 4) { p.vx = p.vy = 0; }
  }
  function ping(p, side, y, bar, post) {
    p.vx = -p.vx * .82; p.vz = bar ? Math.abs(p.vz) * .4 + 40 : p.vz;
    Bus.emit('post', { by: p.lastTouch ? p.lastTouch.id : -1, team: p.lastTouch ? p.lastTouch.team : -1, bar: !!bar, x: Rink.goalX(side), y });
  }
  return { step, take, R, canTake };
})();

/* ---- Goalie: positioning, the save solver (reaction, lateral speed, save shapes), freezes and rebounds, the KABOOM blast ---- */
const Goalie = (() => {
  const scale = gl => (.9 + .033 * gl.size) * T.goalieReach * (gl.bricks > 0 ? 1.35 : 1) * (gl.bossScale || 1);
  function reactTime(gl, p) {
    let r = T.goalieReact - .015 * (gl.rfx - 3) + (M.goalieOffset ? M.goalieOffset[gl.team] : 0);
    if (M.kaboomT[gl.team] > 0) r -= .03;
    // screened: a body within 14 of the shot line between the shooter and the net
    const g = Skater.ownGoal(gl.team);
    for (const s of M.skaters) if (s !== p.lastTouch && U.segDist(s.x, s.y, p.x, p.y, g.x, g.y) < 14 && Math.hypot(s.x - g.x, s.y - g.y) < Math.hypot(p.x - g.x, p.y - g.y) - 10) { r += .08; break; }
    if (gl.dekedT && M.t - gl.dekedT < .5) r += .12 * (gl.def.look && gl.def.look.boss ? 1.5 : 1);
    if (gl.slowT > 0) r += .1;
    if (p.shotKind === 'onetimer' && M.t - (p.shotT || 0) < .5) r += .07;   // the one-timer: no time to set
    return Math.max(.03, r);
  }
  function update(gl, dt) {
    if (gl.disabled) return;
    gl.stateT += dt; gl.cool = Math.max(0, (gl.cool || 0) - dt); gl.bricks = Math.max(0, (gl.bricks || 0) - dt);
    if (gl.state === 'blasted') { if (gl.stateT > 1.2) gl.state = 'ready'; return rig(gl, dt); }
    if (['glove', 'blocker', 'stack', 'butterfly', 'poke', 'cover', 'celebrate'].includes(gl.state) && gl.stateT > (gl.state === 'stack' ? 1 : gl.state === 'cover' ? 99 : gl.state === 'celebrate' ? 99 : .45)) gl.state = 'ready';
    const g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side), p = M.puck, C = Rink.C;
    let tx, ty;
    if (gl.manual) { tx = gl.mx; ty = gl.my; }
    else {
      const behind = (p.x - g.x) * into < 0;
      if (behind) { tx = g.x + into * 4; ty = C.y + (p.y > C.y ? 1 : -1) * (Rink.MOUTH - 3); }
      else {
        const a = Math.atan2(p.y - g.y, (p.x - g.x)), dist = Math.hypot(p.x - g.x, p.y - g.y), dd = clamp(lerp(10, 26, (dist - 40) / 260), 10, 26);
        tx = g.x + Math.cos(a) * dd; ty = clamp(g.y + Math.sin(a) * dd, C.y - 22, C.y + 22);
        if ((tx - g.x) * into < 6) tx = g.x + into * 6;
      }
      const tr = gl.track;
      if (tr && M.t - tr.t0 >= tr.react && M.t - tr.t0 < 1.2) ty = tr.y;
    }
    const lat = T.goalieLateral * (.85 + .05 * gl.rfx) * (gl.vaultCracked ? .9 : 1), dx = tx - gl.x, dy = ty - gl.y, d = Math.hypot(dx, dy), push = d > 10 ? 230 : lat;
    // a pass across the crease: the goalie reads it late (that's what makes one-timers work)
    const passing = !gl.manual && p.passTo && !p.owner && M.t - (p.passT || 0) < T.goalieReact + .16 + .015 * (3 - gl.rfx) && p.passTo.team !== gl.team;
    if (gl.state !== 'stack' && gl.state !== 'cover' && !passing) { const st = Math.min(d, push * dt); if (d > .01) { gl.x += dx / d * st; gl.y += dy / d * st; gl.vy = dy / d * st / dt; } else gl.vy = 0; }
    gl.facing = U.approachAng(gl.facing, Math.atan2(p.y - gl.y, p.x - gl.x), 8 * dt);
    // poke check a carrier in the crease's mouth
    if (!gl.manual && p.owner && p.owner.team !== gl.team && gl.cool <= 0 && Math.hypot(p.owner.x - gl.x, p.owner.y - gl.y) < 22 && (p.owner.x - gl.x) * into > 0) {
      gl.cool = 1.5; gl.state = 'poke'; gl.stateT = 0;
      if (RNG.sim() < .4 * gl.rfx / 3) { const s = p.owner; Skater.release(s, into * 120, (RNG.sim() - .5) * 160, 0, 'poke'); p.lastTouch = null; Bus.emit('poke', { by: 'g' + gl.team, ok: true, goalie: true }); }
    }
    // a slow loose puck in the crease: cover it
    if (!p.owner && !p.inNet && !p.held && Math.hypot(p.x - gl.x, p.y - gl.y) < 9 && Math.hypot(p.vx, p.vy) < 90 && p.z < 4 && Math.hypot(p.x - g.x, p.y - g.y) < 32 && M.phase === 'play') {
      gl.state = 'cover'; gl.stateT = 0; p.held = true; p.vx = p.vy = 0; Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind: 'cover', freeze: true });
      M.stoppage('freeze', Rink.nearestDot(gl.x, gl.y));
    }
    // the save solver's look at a shot coming in
    if (!p.owner && !p.inNet && !p.held) {
      const vin = p.vx * -into; if (vin > 60) {
        const tc = (gl.x - p.x) / (p.vx || 1e-6);
        if (tc > 0 && tc < 1) {
          const yc = p.y + p.vy * tc, key = p.shotT + ':' + (p.lastTouch ? p.lastTouch.id : '') + ':' + Math.round(p.touchT * 10);
          if (Math.abs(yc - C.y) < Rink.MOUTH + 10 && (!gl.track || gl.track.key !== key)) {
            const sp = Math.hypot(p.vx, p.vy), dist = Math.max(20, Math.abs(gl.x - p.x)), sig = T.goalieRead * (1 + sp / 70) * (1.25 - .08 * gl.rfx) * clamp(140 / dist, .5, 2.2) * (p.passTo ? 1.6 : 1) * (p.shotKind === 'onetimer' && M.t - (p.shotT || 0) < .5 ? 2 : 1);
            gl.track = { key, t0: M.t, react: reactTime(gl, p), y: clamp(yc + U.gauss(RNG.sim) * sig, C.y - 24, C.y + 24), zc: p.z + p.vz * tc - 350 * tc * tc };
          }
        }
      }
    }
    rig(gl, dt);
  }
  /** does the goalie stop the puck as it crosses his plane this substep? true when the save ended the substep */
  function test(gl, p, px0, py0, pz0) {
    if (gl.state === 'blasted' || p.owner || gl.disabled) return false;
    const g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side), plane = gl.x - into * 1;
    const was = (px0 - plane) * into, now = (p.x - plane) * into;
    if (!(was > 0 && now <= 0)) return false;
    const u = was / (was - now || 1), y = py0 + (p.y - py0) * u, z = pz0 + (p.z - pz0) * u, dy = y - gl.y, w = scale(gl);
    const reacted = gl.track && M.t - gl.track.t0 >= gl.track.react;
    let kind = null;
    if (gl.manual) {
      if (gl.state === 'butterfly' && ((Math.abs(dy) < 14 * w && z < 10) || (Math.abs(dy) < 6 * w && z < 20))) kind = 'pad';
      else if (gl.state === 'stack' && Math.abs(dy) < 18 * w && z < 8) kind = 'stack';
      else if (Math.abs(dy) < 8 * w && z < 22) kind = z > 10 ? (dy * into < 0 ? 'glove' : 'blocker') : 'pad';
      else if (Math.abs(dy) < 12 * w && z > 10 && z < 21) kind = dy * into < 0 ? 'glove' : 'blocker';
    } else {
      const low = z < 9;
      if (Math.abs(dy) < 8 * w && z < 22) kind = z > 12 ? (dy * into < 0 ? 'glove' : 'blocker') : 'pad';
      else if (reacted && low && ((Math.abs(dy) < 12 * w && z < 9) || (Math.abs(dy) < 6 * w && z < 20))) kind = 'butterfly';
      else if (reacted && z >= 10 && z < 21 && Math.abs(dy) < 12 * w) kind = dy * into < 0 ? 'glove' : 'blocker';
      else if (reacted && Math.abs(dy) < 15 * w && z < 7 && M.t - gl.track.t0 > gl.track.react + .02) kind = 'stack';
    }
    if (!kind) return false;
    if (Math.abs(p.y - Rink.C.y) > Rink.MOUTH + 12) return false;
    // a KABOOM shot: blast the goalie back; it may carry through
    if (p.onFire) {
      gl.state = 'blasted'; gl.stateT = 0; Bus.emit('blast', { goalie: 'g' + gl.team, team: gl.team, x: gl.x, y: gl.y });
      if (gl.def.look && gl.def.look.boss && !gl.vaultCracked) {
        gl.vaultHits = (gl.vaultHits || 0) + 1;
        if (gl.vaultHits >= 2) { gl.vaultCracked = true; gl.bossScale = 1.4 / 1.75; gl.rfx = Math.max(1, gl.rfx - 1); gl.rig.o.size = 1.4; Bus.emit('vault_cracked', {}); }
        else Bus.emit('vault_locked', {});
      } else if (RNG.sim() < T.kaboomBlast) { gl.x -= into * 6; p.onFire = true; return false; }
      p.onFire = false; p.vx = into * 40; p.vy = (RNG.sim() - .5) * 40; p.vz = 0; p.z = 0; p.x = gl.x + into * 6; p.y = y;
      Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind: 'blast', freeze: false, by: p.lastTouch ? p.lastTouch.id : -1 });
      M.stats['g' + gl.team].saves++; return true;
    }
    gl.state = kind === 'pad' ? (z < 9 ? 'butterfly' : 'ready') : kind; gl.stateT = 0;
    const freeze = (kind === 'glove' && RNG.sim() < T.gloveCatch + .06 * (gl.reb - 3)) || (kind === 'butterfly' && RNG.sim() < .4 + .05 * (gl.reb - 3));
    M.stats['g' + gl.team].saves++;
    Bus.emit('save', { goalie: 'g' + gl.team, team: gl.team, kind, freeze, by: p.lastTouch ? p.lastTouch.id : -1, x: gl.x, y });
    if (freeze) { gl.state = kind === 'glove' ? 'glove' : 'cover'; p.held = true; p.x = gl.x; p.y = gl.y; p.z = kind === 'glove' ? 14 : 0; p.vx = p.vy = p.vz = 0; M.stoppage('freeze', Rink.nearestDot(gl.x, gl.y)); return true; }
    const sp = Math.hypot(p.vx, p.vy) * T.reboundSpeed, a = (into > 0 ? 0 : PI) + (RNG.sim() * 2 - 1) * .87;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = z > 10 ? 60 : 20; p.x = plane + into * 2; p.y = y; p.z = Math.min(z, 10);
    p.lastTouch = null; p.shotBy = null; p.kind = 'rebound'; p.reboundT = M.t;
    return true;
  }
  function rig(gl, dt) {
    const hk = gl.rig.hk || (gl.rig.hk = { mode: 'goalie' });
    hk.state = gl.state; hk.dy = gl.track ? gl.track.y - gl.y : 0;
    gl.rig.update(dt, { x: gl.x, y: gl.y, z: 0, vx: 0, vy: gl.vy || 0, facing: gl.facing, pose: gl.state === 'celebrate' ? 'cheer' : null, expr: gl.state === 'blasted' ? 'wince' : null, down: gl.state === 'blasted' ? Math.min(1, gl.stateT * 3) * (1 - Math.max(0, gl.stateT - .9) * 3) : 0 });
  }
  return { update, test, scale, reactTime };
})();
