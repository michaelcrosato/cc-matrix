/* =============================================================================
 * 19-ctl: the human controls in the live play. Which player does which job
 * (one human does everything; with two on a side the captain bats and pitches
 * and the co-captain runs and fields), the controlled fielder (switch, run,
 * jump, climb, dive, turbo, throw with power, the Laser Arm, click a base), and
 * the runners' orders (advance, back, one runner, turbo, Afterburners, the
 * headfirst dive; mouse clicks on bases).
 * ========================================================================== */
BZ.ctl = {
  /** the input that does a duty for a side ('bat' | 'pitch' | 'run' | 'field'), or null for the CPU */
  who(M, side, duty) {
    const H = M.teams[side].humans; if (!H.length) return null;
    if (H.length === 1 || duty === 'bat' || duty === 'pitch') return H[0].input;
    return H[1].input;
  },
  /** the controlled fielder for a human defense */
  pick(M) {
    const D = BZ.defense(M), I = this.who(M, D.side, 'field');
    for (const f of M.fielders) f.human = null;
    if (!I) return;
    let f = M.ctlF && M.fielders.includes(M.ctlF) ? M.ctlF : null;
    if (!f || (M.play && M.play.chaser && f !== M.play.chaser && !f.has && !M.ctlLocked)) f = (M.play && M.play.chaser) || f || M.fielders.find(o => o.pos === 'P');
    const h = BZ.play.holder(M); if (h) f = h;
    M.ctlF = f; f.human = I;
  },
  switchFielder(M) {
    const b = M.ball, list = M.fielders.filter(f => f !== M.ctlF && f.state !== 'down').sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
    if (list[0]) { if (M.ctlF) M.ctlF.human = null; M.ctlF = list[0]; M.ctlLocked = true; BZ.sfx('select'); }
  },
  /** the live-play step for every human: defense and offense */
  step(M, dt) {
    const D = BZ.defense(M), O = BZ.offense(M), P = M.park;
    // ---- defense ----
    const FI = this.who(M, D.side, 'field');
    if (FI) {
      if (FI.pressed('l1') && !BZ.play.holder(M)) this.switchFielder(M);
      this.pick(M);
      const f = M.ctlF;
      if (f && !f.has) {
        f.turbo = FI.down('l2') && D.turbo > 0;
        if (f.turbo) { D.turbo = Math.max(0, D.turbo - 40 * TUNE.turboDrain * dt); }
        if (FI.pressed('r1')) {
          const th = BZ.theta(f.x - P.H.x, f.y - P.H.y), r = Math.hypot(f.x - P.H.x, f.y - P.H.y);
          if (f.y < P.H.y && Math.abs(th) <= P.span && P.R(th) - r < 22) BZ.play.climb(M, f); else BZ.play.jump(M, f);
        }
        if (FI.pressed('r2')) BZ.play.dive(M, f, f.facing);
      }
    }
    // ---- offense: the runners' orders ----
    const RI = this.who(M, O.side, 'run');
    if (RI && M.play && M.play.kind) {
      const live = BZ.play.liveRunners(M);
      for (const r of live) { r.human = true; r.turboHeld = RI.down('l2'); }
      const held = BZ.baseHeld(RI);
      if (RI.pressed('r1') && RI.down('l2') && O.meter >= 50 && O.afterburn <= 0) { O.meter -= 50; O.afterburn = 3; BZ.bus.emit('super', { kind: 'afterburners' }); }
      else if (RI.pressed('r1')) this.order(M, live, held, +1);
      if (RI.pressed('l1')) this.order(M, live, held, -1);
      // the headfirst dive near a base
      if (RI.pressed('south')) for (const r of live) { const d = Math.abs(Math.round(r.goal) - r.p) * 300; if (r.state === 'run' && d < 40 && d > 4 && !r.headfirst) { r.headfirst = true; r.slideBoost = true; BZ.bus.emit('headfirst', { runner: r.player }); } }
      // the mouse: left-click a base sends the runner who can reach it, right-click brings him back
      if (RI.lastDevice === 'mouse' && BZ.game.mouseGround) {
        const g = BZ.game.mouseGround(), btn0 = RI.pressed('south') && RI.held && RI.held.has && RI.held.has('Mouse0'), btn2 = RI.pressed('west') && RI.held && RI.held.has && RI.held.has('Mouse2');
        if (g && (btn0 || btn2)) {
          for (let b = 1; b <= 4; b++) { const bp = P.base(b); if (Math.hypot(g[0] - bp.x, g[1] - bp.y) < 26) {
            if (btn0) { const r = live.filter(q => q.p < b).sort((a, c) => c.p - a.p)[0]; if (r) { r.goal = b; r.orderT = 2; } }
            else { const r = live.find(q => Math.round(q.goal) === b || (q.p > b - 1 && q.p <= b)); if (r) { r.goal = Math.max(r.isBatter ? 1 : r.base - 0, b - 1); r.orderT = 2; } }
          } }
        }
      }
    }
  },
  order(M, live, base, dir) {
    let list = live;
    if (base) list = live.filter(r => dir > 0 ? Math.ceil(r.p - 1e-6) === base || Math.floor(r.p + 1e-6) + 1 === base : Math.round(r.goal) === base || Math.ceil(r.p - 1e-6) === base);
    for (const r of list) {
      if (dir > 0) r.goal = Math.min(4, Math.floor(r.p + 1e-6) + 1);
      else { if (r.forced) continue; r.goal = Math.max(r.isBatter ? 1 : 1, Math.floor(r.p - 1e-6)); if (r.goal < 1) r.goal = 1; }
      r.orderT = 1.6;
    }
    if (list.length) BZ.bus.emit('order', { dir, n: list.length });
  },
  /** a human-controlled fielder's movement; returns true when the human (or the manual setting) moved it */
  fielderMove(M, f, dt, tx, ty) {
    const I = f.human, mv = I.move(), mode = (BZ.game.settings && BZ.game.settings.fielding) || 'assisted';
    if (Math.hypot(mv[0], mv[1]) > .2) {
      const d = BZ.game.view.screenDirToGround ? BZ.game.view.screenDirToGround(mv[0], mv[1]) : [mv[0], mv[1]], sp = BZ.fielderSpeed(M, f) * Math.min(1, Math.hypot(mv[0], mv[1]));
      f.vx = d[0] * sp; f.vy = d[1] * sp; f.x += f.vx * dt; f.y += f.vy * dt; f.facing = Math.atan2(d[1], d[0]); f.state = 'run'; f.humanOverride = true;
      return true;
    }
    if (mode === 'manual') { f.vx = f.vy = 0; f.state = 'set'; return true; }
    return false;
  },
  /** a human fielder holding the ball: run with it, charge and throw with a base button, or click a base */
  holder(M, f, dt) {
    const I = f.human, P = M.park, D = BZ.defense(M);
    const mv = I.move();
    if (Math.hypot(mv[0], mv[1]) > .2) {
      const d = BZ.game.view.screenDirToGround(mv[0], mv[1]), sp = BZ.fielderSpeed(M, f) * (I.down('l2') && D.turbo > 0 ? 1.35 : 1);
      if (I.down('l2')) D.turbo = Math.max(0, D.turbo - 40 * TUNE.turboDrain * dt);
      f.vx = d[0] * sp; f.vy = d[1] * sp; f.x += f.vx * dt; f.y += f.vy * dt; f.facing = Math.atan2(d[1], d[0]); f.state = 'run';
    } else if (f.botRun) { if (BZ.moveTo(f, f.botRun.x, f.botRun.y, BZ.fielderSpeed(M, f), dt)) f.botRun = null; }
    else { f.vx = f.vy = 0; if (f.state === 'run') f.state = 'hold'; }
    // charge a throw while a base button is held; let go to throw
    if (!f.charge) {
      const b = BZ.basePressed(I);
      if (b) {
        // a base clicked with the mouse throws at once
        const click = I.lastDevice === 'mouse' && I.held && I.held.has && (I.held.has('Mouse0') || I.held.has('Mouse2'));
        if (!click) f.charge = { base: b, t: 0, laser: I.down('r1') && D.meter >= 50 };
      }
      if (I.lastDevice === 'mouse' && BZ.game.mouseGround && (I.pressed('south') || I.pressed('west')) && I.held && I.held.has && (I.held.has('Mouse0') || I.held.has('Mouse2'))) {
        const g = BZ.game.mouseGround();
        if (g) for (let k = 1; k <= 4; k++) { const bp = P.base(k); if (Math.hypot(g[0] - bp.x, g[1] - bp.y) < 26) { BZ.play.startThrow(M, f, k, .8, I.down('r1') && D.meter >= 50); return; } }
        // a stray click never throws: the mouse buttons are the widget's this step
        if (I.suppressCode) { I.suppressCode('Mouse0'); I.suppressCode('Mouse2'); }
        f.charge = null;
      }
    } else {
      f.charge.t += dt;
      if (I.down('r1') && D.meter >= 50) f.charge.laser = true;
      if (BZ.baseReleased(I, f.charge.base) || f.charge.t > 1.2) {
        const power = Math.min(1, f.charge.t / .6);
        BZ.play.startThrow(M, f, f.charge.base, f.charge.laser ? 1 : power, f.charge.laser);
        f.charge = null;
      }
    }
  }
};
