/* =============================================================================
 * 20-ai: the CPU by difficulty (ROOKIE, PRO, ALL-STAR, BATZOOKA): the pitcher,
 * the batter, the fielder with the ball, the baserunners; and THE BOT, which
 * turns these brains' choices into a player's inputs (tests, the scripted
 * playthrough and the attract mode play the real game through the real controls).
 * ========================================================================== */
BZ.LEVELS = {
  rookie: { name: 'ROOKIE', swingSd: .06, aimSd: 3.6, disc: .52, relQ: .5, after: 0, react: .34, pitchMul: .85 },
  pro: { name: 'PRO', swingSd: .042, aimSd: 2.6, disc: .68, relQ: .68, after: .3, react: .25, pitchMul: 1 },
  allstar: { name: 'ALL-STAR', swingSd: .03, aimSd: 1.8, disc: .78, relQ: .8, after: .6, react: .19, pitchMul: 1.07 },
  batzooka: { name: 'BATZOOKA', swingSd: .02, aimSd: 1.2, disc: .86, relQ: .9, after: .9, react: .14, pitchMul: 1.15 }
};
BZ.LEVEL_IDS = ['rookie', 'pro', 'allstar', 'batzooka'];
BZ.ai = {
  lv(M, side) { const T = M.teams[side]; return BZ.LEVELS[(T && T.level) || M.cpuLevel || 'pro'] || BZ.LEVELS.pro; },
  /* ---- the pitcher ---- */
  choosePitch(M, side) {
    const L = this.lv(M, side), T = M.teams[side], p = T.pitcher, rep = BZ.repertoire(p), b = M.batter, R = BZ.R;
    const ahead = M.strikes > M.balls, behind = M.balls > M.strikes + 1 || M.balls === 3;
    let slot;
    if (T.meter >= 100 && M.strikes === 2 && !M.fast) slot = 'r1';
    else {
      const r = R();
      if (behind) slot = r < .65 ? 'south' : r < .8 ? 'west' : r < .92 ? 'east' : 'north';
      else if (ahead) slot = r < .3 ? 'south' : r < .6 ? 'east' : r < .8 ? 'west' : 'north';
      else slot = r < .45 ? 'south' : r < .65 ? 'east' : r < .85 ? 'west' : 'north';
    }
    const type = slot === 'r1' ? T.def.superPitch : rep[BZ.PITCH_SLOTS.indexOf(slot)];
    const k = ((b.look && b.look.size) || 1.25) / 1.25, lo = BZ.GEO.zoneLo * k, hi = BZ.GEO.zoneHi * k;
    // targets: corners and edges, out of the zone to chase when ahead
    let tx, tz;
    const inZ = behind ? R() < .62 : ahead ? R() < .26 : R() < .43;
    if (inZ) { tx = (R() - .5) * 2 * 5 * (.5 + .5 * L.disc); tz = lerp(lo + 1.5, hi - 1.5, R()); }
    else { const s = R() < .5 ? -1 : 1; tx = s * (9 + R() * 2.5); tz = lerp(lo - 4, hi + 3, R()); if (R() < .4) { tx = (R() - .5) * 8; tz = R() < .6 ? lo - 4 - R() * 3 : hi + 3 + R() * 2; } }
    const sd = L.aimSd / Math.max(.3, TUNE.cpuPitch) * .5;
    tx += BZ.Rn(sd); tz += BZ.Rn(sd);
    const q = clamp(L.relQ * Math.min(1.3, TUNE.cpuPitch) + BZ.Rn(.15), 0, 1);
    return { slot, type, target: [tx, tz], q, after: R() < L.after ? [(R() - .5) * 2, (R() - .5) * 2] : null };
  },
  /* ---- the batter: decide at release whether to swing, and how ---- */
  batterPlan(M, side, pitch) {
    const L = this.lv(M, side), T = M.teams[side], b = M.batter, R = BZ.R;
    const c = pitch.cross(), size = (b.look && b.look.size) || 1.25;
    const inZ = BZ.inZone(c.x, c.z, size), skill = Math.max(.25, TUNE.cpuBat);
    const disc = clamp(L.disc * (M.strikes === 2 ? .8 : 1), 0, .97);
    let swing = inZ ? R() < (M.strikes === 2 ? .92 : M.balls === 3 ? .7 : .8) : R() > disc;
    if (pitch.def.vis && R() < .25) swing = !swing;   // a vanishing pitch fools the CPU too
    if (M.cheats && M.cheats.autoBatter === 'take') swing = false;
    if (M.cheats && M.cheats.perfectCPU) swing = true;
    let type = 'contact';
    if ((M.balls === 2 && M.strikes === 0) || (M.balls === 3 && M.strikes === 1) || (b.pow >= 8 && R() < .3)) type = 'power';
    let zooka = false;
    if (T.meter >= 100 && !T.batzookaArmed && (M.bases.some(Boolean) || (M.inning >= M.innings && BZ.leadBy(M) * (side ? 1 : -1) < 0) || R() < .4)) zooka = true;
    let bunt = M.bases[0] && !M.bases[1] && M.outs === 0 && b.pow <= 5 && R() < .18 && M.strikes < 2;
    if (M.fast && M.mode !== 'attract') bunt = bunt && R() < .5;
    // deception: breaking and off-speed pitches (and supers) fool the eye and the timing, more with a good release
    const kind = pitch.def.kind, dec = (kind === 'heater' ? .1 : kind === 'breaking' ? .55 : kind === 'offspeed' ? .65 : kind === 'signature' ? .85 : 1.2) * (.5 + .7 * pitch.q) * (pitch.afterUsed ? 1.2 : 1);
    const aim = L.aimSd / skill * .8 * (1 + .9 * dec), e = BZ.Rn(L.swingSd / skill * (1 + 1 * dec)) - (pitch.def.speed < .8 ? dec * .025 : 0);
    return { swing: swing || bunt, type: bunt ? 'bunt' : type, zooka, e, rx: c.x + BZ.Rn(aim), rz: c.z + BZ.Rn(aim), bunt };
  },
  /* ---- steals, at pitch select ---- */
  steals(M, side) {
    const out = {}, R = BZ.R, D = BZ.defense(M), C = M.fielders.find(f => f.pos === 'C');
    for (let b = 1; b <= 2; b++) {
      const rn = M.bases[b - 1]; if (!rn || M.bases[b]) continue;
      if (M.outs === 2 && M.strikes === 2) continue;
      const p = (rn.spd >= 7 ? .1 + (rn.spd - 7) * .07 : .02) * (C ? 1.3 - .06 * C.player.arm : 1) * TUNE.cpuRun * (b === 2 ? .5 : 1);
      if (R() < p) out[b] = true;
    }
    void D; return out;
  },
  /* ---- the fielder holding the ball ---- */
  holderDecision(M, f) {
    const P = M.park, live = BZ.play.liveRunners(M), sp = BZ.throwSpeed(M, f, .8), fsp = BZ.fielderSpeed(M, f);
    const cand = [];
    for (const r of live) {
      if (r.delay > 0) continue;
      const tgt = Math.round(r.goal), onBase = Math.abs(r.p - Math.round(r.p)) < .02 && Math.round(r.p) === tgt;
      if (onBase && !r.mustTag) continue;
      const base = r.mustTag && r.p > r.mustTag + .02 ? r.mustTag : (r.goal > r.p ? Math.ceil(r.p - 1e-6) : Math.floor(r.p + 1e-6));
      if (base < 1 || base > 4) continue;
      const bp = P.base(base), rsp = BZ.runSpeed(M, r) / 300, tR = Math.abs(base - r.p) / rsp;
      const force = (r.forced && base === r.start + 1) || (r.mustTag && base === r.mustTag);
      const dSelf = Math.hypot(f.x - bp.x, f.y - bp.y);
      const rec = BZ.play.receiverFor(M, base, f), tRec = rec ? Math.hypot(rec.x - bp.x, rec.y - bp.y) / BZ.fielderSpeed(M, rec) : 9;
      const tThrow = (['LF', 'CF', 'RF'].includes(f.pos) ? .24 : .17) + dSelf / BZ.throwPace(M, f, dSelf), tRun = dSelf / fsp;
      const value = base * 10 + (force ? 5 : 0);
      if ((force || !onBase) && tRun + .05 < tR && dSelf < 70) cand.push({ kind: 'run', base, x: bp.x, y: bp.y, value: value + 3, margin: tR - tRun });
      else if (Math.max(tThrow, tRec) + .08 < tR || (force && Math.max(tThrow, tRec) < tR + .02)) cand.push({ kind: 'throw', base, value, margin: tR - tThrow });
      // a runner caught between bases: run him down
      const rp = BZ.runnerPos(M, r.p), dr = Math.hypot(rp.x - f.x, rp.y - f.y);
      if (!onBase && !force && dr < 70) cand.push({ kind: 'run', x: rp.x, y: rp.y, value: value + 1, chase: r });
    }
    if (cand.length) {
      cand.sort((a, b) => b.value - a.value);
      const c = cand[0];
      if (c.kind === 'throw' && BZ.defense(M).meter >= 50 && !M.fast && Math.hypot(f.x - P.base(c.base).x, f.y - P.base(c.base).y) > 300 && c.margin < .4 && BZ.R() < .5) c.laser = true;
      return c;
    }
    // nothing to get: bring the ball in
    const r0 = Math.hypot(f.x - P.H.x, f.y - P.H.y);
    if (r0 > 520) {
      const lead = live.filter(r => !r.isBatter || r.p > 0).sort((a, b) => b.p - a.p)[0];
      const base = lead ? clamp(Math.floor(lead.p + 1e-6) + 1, 2, 4) : 2, bp = P.base(base), d = Math.hypot(f.x - bp.x, f.y - bp.y);
      const cut = M.fielders.find(o => o.role === 'cutoff' && o !== f);
      if (cut && d > 520 && Math.hypot(cut.x - f.x, cut.y - f.y) > 120) return { kind: 'throw', base: 0, to: cut };
      return { kind: 'throw', base };
    }
    // hold it; a pitcher walks it back to the mound, others toss it in once everyone is set
    if (f.pos !== 'P' && live.every(r => Math.abs(r.p - Math.round(r.p)) < .02) && f.holdT > .8) { const p = M.fielders.find(o => o.pos === 'P'); if (p && p !== f && Math.hypot(p.x - f.x, p.y - f.y) > 30) return { kind: 'throw', base: 0, to: p, power: .5 }; }
    return null;
  },
  /** when the ball gets to base b (seconds from now) */
  ballETA(M, base) {
    const P = M.park, bp = P.base(base), b = M.ball, h = BZ.play.holder(M), pl = M.play;
    if (h) {
      const rec = BZ.play.receiverFor(M, base, h), tRec = rec ? Math.hypot(rec.x - bp.x, rec.y - bp.y) / BZ.fielderSpeed(M, rec) : 1;
      const of = ['LF', 'CF', 'RF'].includes(h.pos), d = Math.hypot(h.x - bp.x, h.y - bp.y), tt = (h.throwT > 0 ? h.throwT : (of ? .24 : .17) + Math.max(0, h.decideT || 0)) + d / BZ.throwPace(M, h, d);
      return Math.max(Math.min(tt, d / BZ.fielderSpeed(M, h)), d < 10 ? 0 : tRec * .8);
    }
    if (b.mode === 'thrown') { const lt = pl.lastThrow, rem = lt ? Math.max(0, lt.eta - pl.t) : .3; return lt && lt.base === base ? rem : rem + .4 + Math.hypot(b.x - bp.x, b.y - bp.y) / 500; }
    // the ball is loose or in the air: the chaser gets it, then throws
    const c = pl.chaser; let tGet = 1.5, gx = b.x, gy = b.y;
    if (c) { const cp = c.catchAt || { x: c.tx, y: c.ty }; tGet = Math.max(Math.hypot(cp.x - c.x, cp.y - c.y) / BZ.fielderSpeed(M, c), pl.pred && pl.pred.land && !b.bounced ? Math.max(0, pl.pred.land.t - (pl.t - (pl.predT0 || 0))) : 0); gx = cp.x; gy = cp.y; }
    const far = Math.hypot(gx - M.park.H.x, gy - M.park.H.y) > 470;
    return tGet + (far ? .65 : .4) + Math.hypot(gx - bp.x, gy - bp.y) / 500;
  },
  runnerDecide(M, r, live) {
    if (r.human && r.orderT > 0) return;
    const b = M.ball, pl = M.play, P = M.park, rsp = BZ.runSpeed(M, r) / 300, cpu = Math.max(.3, TUNE.cpuRun);
    const humanSide = BZ.offense(M).humans.length > 0;
    if (humanSide && BZ.game && BZ.game.settings && BZ.game.settings.baserunning === 'manual' && !r.isBatter && !r.forced && !M.attract) {
      if (r.mustTag) r.goal = r.mustTag;
      return;
    }
    if (r.mustTag) { r.goal = r.mustTag; return; }
    const outs = M.outs;
    const fly = b.mode === 'batted' && !b.bounced && !b.touched;
    if (fly && pl.kind === 'batted') {
      if (r.isBatter) { r.goal = Math.max(r.goal, 1); return; }
      if (outs >= 2) { r.goal = Math.min(4, Math.max(r.goal, Math.floor(r.p + 1e-6) + 1)); return; }
      const land = pl.pred && pl.pred.land, deep = land && Math.hypot(land.x - P.H.x, land.y - P.H.y) > 560;
      if (r.start === 3 && deep) { r.goal = 3; return; }   // stay to tag
      r.goal = r.forced ? r.start + .55 : r.start + .45;
      return;
    }
    if (pl.caughtFly && !r.tagged && r.p <= r.start + .001) r.tagged = true;
    // the time race: to the next base, or (rounding a base at speed) to the one after it
    if (r.forced && r.goal < r.start + 1) r.goal = r.start + 1;
    const at = Math.floor(r.p + 1e-6), frac = r.p - at;
    if (r.goal >= at + 1 && frac > .45 && frac < .78) return;   // past halfway and going: committed
    const rounding = r.goal >= at + 1 && frac > .78 && at + 2 <= 4;
    const nb = rounding ? at + 2 : Math.min(4, at + 1);
    const margin = (r.tagged && pl.caughtFly ? .02 : .2) / cpu;
    const tR = (nb - r.p) / rsp, tB = this.ballETA(M, nb);
    if (tR + margin < tB) { r.goal = Math.max(r.goal, nb); return; }
    if (rounding) { r.goal = at + 1; return; }                                   // stop at the base ahead
    if (r.isBatter && r.p < 1) { r.goal = Math.max(r.goal, 1); return; }
    if (frac < .02) { r.goal = (r.forced && at < r.start + 1) ? r.start + 1 : at; return; }   // on a base: hold
    // caught between bases: on, or back?
    if (r.forced && at < r.start + 1) { r.goal = r.start + 1; return; }
    const back = at, tBack = frac / rsp, tBallBack = this.ballETA(M, Math.max(1, back));
    if (back < r.base || back < 1) { r.goal = at + 1; return; }
    // a runner on his way turns back only when clearly beaten; one heading back goes on only when clearly safe
    const going = r.goal > r.p;
    r.goal = going ? (tR - tB > .15 && tBack < tBallBack ? back : at + 1) : (tR + margin < tB ? at + 1 : back);
  },
  runnerTurbo(M, r) { return Math.abs(r.goal - r.p) > .05 && BZ.offense(M).turbo > 25 && (r.p - Math.floor(r.p)) > .55 && r.goal > r.p && !!BZ.play.holder(M); },   // the back half of a close race
  /* ---- the CPU's own swing: scheduled at release ---- */
  cpuSwingSchedule(M, side, pitch) {
    const plan = this.batterPlan(M, side, pitch), S = BZ.SWINGS[plan.type] || BZ.SWINGS.contact;
    if (!plan.swing) return null;
    return { plan, pressAt: pitch.T - S.delay + plan.e };
  }
};

/* =============================================================================
 * THE BOT: plays a side through its player's inputs
 * ========================================================================== */
BZ.bot = {
  sides: {},   // side -> { level, cheats }
  on(side, o = {}) { this.sides[side] = Object.assign({ level: 'batzooka', perfect: false }, o); },
  off(side) { delete this.sides[side]; },
  active(side) { return !!this.sides[side]; },
  held: new Set(),
  hold(I, a, on = true) { const k = I.player + ':' + a; if (on) { if (!this.held.has(k)) { I.hold(a, true); this.held.add(k); } } else if (this.held.has(k)) { I.hold(a, false); this.held.delete(k); } },
  releaseAll(I) { for (const k of [...this.held]) { const [p, a] = k.split(':'); if (+p === I.player) { I.hold(a, false); this.held.delete(k); } } },
  steer(I, dx, dz, dead = .6) {
    this.hold(I, 'right', dx > dead); this.hold(I, 'left', dx < -dead);
    this.hold(I, 'up', dz > dead); this.hold(I, 'down', dz < -dead);
  },
  /** each step, before the match updates: press and hold the bot side's buttons */
  update(M, dt) {
    for (const side of [0, 1]) {
      const B = this.sides[side]; if (!B) continue;
      const T = M.teams[side], I = T.humans[0] && T.humans[0].input; if (!I) continue;
      const off = BZ.offense(M) === T;
      if (M.phase === 'atBat') this.atBat(M, T, I, off, B, dt);
      else if (M.phase === 'inPlay') { this.releaseDirs(I); this.inPlay(M, T, I, off, B, dt); }
      else { this.releaseAll(I); if (M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'pregame' || M.phase === 'halfStart') { if (BZ.F() < .1) I.tap('south'); } }
    }
  },
  releaseDirs(I) { for (const a of ['up', 'down', 'left', 'right']) this.hold(I, a, false); },
  atBat(M, T, I, off, B, dt) {
    const S = M.ab;
    if (!S) return;
    if (off) {
      // batting: plan at release, steer the reticle to the planned point, press at the planned time
      if (S.sub === 'flight' && S.pitch && !S.botPlan) {
        const plan = BZ.ai.batterPlan(M, T.side, S.pitch); plan.e = BZ.Rn(BZ.LEVELS[B.level].swingSd);
        if (B.perfect) { const c = S.pitch.cross(); plan.e = 0; plan.swing = BZ.inZone(c.x, c.z, (M.batter.look && M.batter.look.size) || 1.25); plan.rx = c.x; plan.rz = c.z - .8; plan.type = 'power'; plan.bunt = false; }
        if (B.take) plan.swing = false;
        S.botPlan = plan; S.botPressAt = plan.swing ? S.pitch.T - (BZ.SWINGS[plan.type] || BZ.SWINGS.contact).delay + plan.e : 99;
        if (plan.zooka && T.meter >= 100 && !T.batzookaArmed) I.tap('r1');
      }
      if (S.sub === 'select' || S.sub === 'windup') { const ret = M.reticle; this.steer(I, -ret.x * .3, (17 - ret.z) * .3, .9); }
      if (S.botPlan) {
        const p = S.botPlan, ret = M.reticle; this.steer(I, p.rx - ret.x, p.rz - ret.z, .7);
        if (p.swing && !S.swing && S.pitch.t >= S.botPressAt) {
          if (p.type === 'bunt') this.hold(I, 'north', true);
          else I.tap(p.type === 'power' ? 'west' : 'south');
        }
      }
    } else {
      // pitching: pick, aim, release on the ring
      if (S.sub === 'select' && !S.botPick && S.t > .35) {
        const ch = BZ.ai.choosePitch(M, T.side); S.botPick = ch;
        if (B.strikes) ch.target = [(BZ.R() - .5) * 6, 17];
        I.tap(ch.slot === 'r1' ? 'r1' : ch.slot);
      }
      if (S.sub === 'windup' && S.botPick) {
        const tg = S.botPick.target, mk = M.marker; this.steer(I, tg[0] - mk.x, tg[1] - mk.z, .6);
        const ringAt = S.windT - BZ.RING * 0 + .0, err = (1 - BZ.LEVELS[B.level].relQ) * .12;
        if (!S.released && !S.botRel && S.t >= S.windT + err * (BZ.R() - .5)) { S.botRel = true; I.tap(S.slot === 'r1' ? 'r1' : S.slot); }
        void ringAt;
      }
      if (S.sub === 'flight') this.releaseDirs(I);
    }
  },
  inPlay(M, T, I, off, B) {
    if (off) return;   // the bot's runners run on auto baserunning
    const h = BZ.play.holder(M);
    if (!h || !h.human || h.throwT > 0) { if (this.throwHeld) { this.hold(I, this.throwHeld, false); this.throwHeld = null; } return; }
    if (this.throwHeld) { this.botHoldT = (this.botHoldT || 0) + 1 / 120; if (this.botHoldT > .42) { this.hold(I, this.throwHeld, false); this.throwHeld = null; } return; }
    const act = BZ.ai.holderDecision(M, h);
    if (act && act.kind === 'throw' && act.base >= 1) { this.throwHeld = BZ.BASE_BTN[act.base]; this.botHoldT = 0; this.hold(I, this.throwHeld, true); }
    else if (act && act.kind === 'run') { h.botRun = act; }
  }
};
