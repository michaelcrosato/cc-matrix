/* ---- THE CPU BRAIN. Both CPU teams and a human's CPU teammates run it; difficulty and each team's style change its
 * numbers, never its logic. Shapes per team every .25 s; each player's decision every .15 s plus its reaction ---- */
Object.assign(Match.prototype, {
  aggr(t) { return clamp(this.teams[t].style.aggr + (TUNE.v.aiAggression - .5), 0, 1); },
  react(t) { return Math.max(0, TUNE.v.aiReaction + this.diffs[t].react + (this.teams[t].style.react || 0)); },
  /** an intent that runs p toward (x, y): arriving gently, turbo when asked */
  seek(p, x, y, turbo, slow) {
    const I = TT.emptyIntent(), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d > 3) { const k = Math.min(1, d / (slow ? 40 : 18)); I.mx = dx / d * k; I.my = dy / d * k; }
    I.turbo = !!turbo && d > 40;
    return I;
  },
  ai(p, dt) {
    if (!this.onPitch(p)) return TT.emptyIntent();
    if (TT.cheats.cpuFrozen && !this.isHumanTeam(p.team)) return TT.emptyIntent();
    if (this.parked && this.parked.has(p.id)) return TT.emptyIntent();
    if (this.forced && this.forced[p.id]) { const f = this.forced[p.id]; if (f.t > this.t) return f.I; delete this.forced[p.id]; }
    if (this.phase === 'play') return this.aiPlay(p, dt);
    if (this.phase === 'ruck') return this.aiRuck(p, dt);
    return TT.emptyIntent();
  },
  /** the team shapes: recomputed every .25 s (attack slots, defence assignments) */
  shapes() {
    if (this.shapeT && this.t - this.shapeT < .25) return this.shape;
    this.shapeT = this.t;
    const b = this.ball, c = this.carrier(), S = this.shape = { att: c ? c.team : (b.st === 'air' && b.kind === 'pass' ? b.team : this.poss), slots: {}, def: {} };
    const at = S.att, d = this.dir[at];
    const cx = c ? c.x : b.x, cy = c ? c.y : b.y;
    // attack: six support slots in a staggered line behind the carrier, three each side, wider to the open side
    const open = (G.Y1 - cy) > (cy - G.Y0) ? 1 : -1, slots = [];
    for (let k = 1; k <= 3; k++) for (const side of [open, -open]) {
      const gap = side === open ? 58 : 46;
      slots.push({ x: cx - d * (18 + 10 * k), y: clamp(cy + side * gap * k, G.Y0 + 20, G.Y1 - 20), k, side });
    }
    const sup = this.players.filter(p => p.team === at && this.standing(p) && (!c || p.id !== c.id) && p.ctl < 0);
    // forwards to the near slots, backs wider, the wing the widest open-side slot; then nearest first (with hysteresis)
    const prev = this.prevSlots || {}, used = new Set();
    const order = sup.slice().sort((a, q) => (a.slot <= 2 ? 0 : a.slot === 6 ? 2 : 1) - (q.slot <= 2 ? 0 : q.slot === 6 ? 2 : 1));
    for (const p of order) {
      let best = -1, bd = 1e9;
      slots.forEach((s, i) => {
        if (used.has(i)) return;
        let cost = dist2(p.x, p.y, s.x, s.y) + (p.slot <= 2 ? s.k * 30 : p.slot === 6 ? (s.side === open ? -s.k * 40 : 60) : 0);
        if (prev[p.id] === i) cost -= 20;
        if (cost < bd) { bd = cost; best = i; }
      });
      if (best >= 0) { used.add(best); S.slots[p.id] = slots[best]; }
    }
    this.prevSlots = {}; for (const id in S.slots) this.prevSlots[id] = slots.indexOf(S.slots[id]);
    // defence: the tackler (soonest to the carrier), the cover, the sweeper deep; the rest man on man by y order
    const df = 1 - at, defs = this.players.filter(p => p.team === df && this.standing(p) && p.ctl < 0);
    const tx = c ? c.x + c.vx * .3 : b.x, ty = c ? c.y + c.vy * .3 : b.y;
    const byTime = defs.slice().sort((a, q) => dist2(a.x, a.y, tx, ty) / this.speedOf(a) - dist2(q.x, q.y, tx, ty) / this.speedOf(q));
    const humanDef = this.players.find(p => p.team === df && p.ctl >= 0 && this.standing(p) && dist2(p.x, p.y, tx, ty) < 60);
    S.tackler = humanDef ? -1 : (byTime[0] ? byTime[0].id : -1);
    S.cover = byTime[humanDef ? 0 : 1] ? byTime[humanDef ? 0 : 1].id : -1;
    const ownLine = this.ownLine(df), toLine = Math.abs(cx - ownLine);
    const sweeper = defs.find(p => p.slot === 6 && p.id !== S.tackler && p.id !== S.cover) || defs.find(p => p.slot === 4 && p.id !== S.tackler && p.id !== S.cover);
    S.sweeper = sweeper && toLine > 200 ? sweeper.id : -1;
    const lineX = cx + d * 30;
    const rest = defs.filter(p => p.id !== S.tackler && p.id !== S.cover && p.id !== S.sweeper).sort((a, q) => a.y - q.y);
    const atts = this.players.filter(p => p.team === at && this.standing(p) && (!c || p.id !== c.id)).sort((a, q) => a.y - q.y);
    const wide = defs.length < 6 ? 1.25 : 1;
    // man on man by y order, but the line always spans the width (spaced wider with a man in the bin)
    const span = 70 * wide, mid = (rest.length - 1) / 2, half = mid * span + span * .6;
    const ccy = clamp(cy, G.Y0 + 20 + half, G.Y1 - 20 - half);   // the line fits inside the field: wide of the ball, it spreads to the open side
    rest.forEach((p, i) => {
      const m = atts[Math.round(i * (atts.length - 1) / Math.max(1, rest.length - 1))];
      const even = ccy + (i - mid) * span + (i >= mid ? span * .6 : -span * .6);
      const my = m ? lerp(m.y, even, .7) : even;
      S.def[p.id] = { x: clamp(lineX, G.DX0 + 10, G.DX1 - 10), y: clamp(my, G.Y0 + 14, G.Y1 - 14) };
    });
    if (S.cover >= 0) S.def[S.cover] = { x: cx + d * 50, y: lerp(cy, G.CY, .3) };
    if (S.sweeper >= 0) S.def[S.sweeper] = { x: cx + d * 140, y: lerp(cy, G.CY, .5) };
    return S;
  },
  aiPlay(p, dt) {
    const b = this.ball, c = this.carrier(), S = this.shapes();
    if (c === p) return this.aiCarrier(p, dt);
    if (p.ai.buy > 0) { const I = TT.emptyIntent(); I.mx = Math.cos(p.f + (p.ai.buySide || 1) * .8) * .6; I.my = Math.sin(p.f + (p.ai.buySide || 1) * .8) * .6; return I; }
    // a super on, a pie on the floor, a kick in the air, a loose ball: the special cases first
    if (p.sup && p.sup.kind === 'hurricane' && c && c.team !== p.team) { const I = this.seek(p, c.x + c.vx * .2, c.y + c.vy * .2, true); if (dist(p, c) < 16) I.cmd = { tackle: true }; return I; }
    const pu = this.powerups.find(q => q.on && !q.taken && dist(q, p) < 100 && q.chaser === p.id);
    if (pu) return this.seek(p, pu.x, pu.y, true);
    if (b.st === 'air' && b.kind !== 'pass' && b.land) return this.aiKickChase(p, S);
    if (b.st === 'loose' || (b.st === 'air' && b.kind === 'spill')) return this.aiLoose(p, S);
    if (!c) { const s = S.slots[p.id] || S.def[p.id]; return s ? this.seek(p, s.x, s.y) : this.seek(p, b.x, b.y); }
    if (c.team === p.team) {
      // support: run the slot (staying behind the carrier); a pass coming to him: run on to it
      if (b.st === 'air' && b.to === p.id) { const I = this.seek(p, p.x + this.dir[p.team] * 30, p.y); I.turbo = false; return I; }
      const s = S.slots[p.id]; if (!s) return this.seek(p, c.x - this.dir[p.team] * 30, c.y + (p.slot - 3) * 30);
      const d = this.dir[p.team], tx = (s.x - c.x) * d > -6 ? c.x - d * 6 : s.x;
      const I = this.seek(p, tx, s.y, this.breakDone && this.tryRun && this.tryRun.id === c.id, true);
      // a cheap shot on a defender, when the referee is looking the other way
      return this.aiCheap(p, I) || I;
    }
    return this.aiDefend(p, c, S, dt);
  },
  aiDefend(p, c, S, dt) {
    const t = p.team, d = this.dir[c.team];
    if (c.held > 0 && c.holdBy !== p.id && dist(p, c) < 90) { const I = this.seek(p, c.x, c.y, true); if (dist(p, c) < TUNE.v.tackleRange + 8 + (c.size - 1) * 8 && this.t >= p.ai.dec) { p.ai.dec = this.t + .1; I.cmd = { tackle: true }; } return I; }
    if (S.tackler === p.id || dist(p, c) < 26) {
      const lead = clamp(dist(p, c) / 220, 0, .5);
      const I = this.seek(p, c.x + c.vx * lead, c.y + c.vy * lead, dist(p, c) > 40);
      this.aiTackle(p, c, I, dt);
      return I;
    }
    // the human team's sweeper rule: within 200 of the line he joins the line
    const s = S.def[p.id];
    if (s) { const I = this.seek(p, s.x, s.y, Math.abs(s.x - p.x) > 120); if (!(S.cover === p.id)) { const ahead = (p.x - c.x) * d; if (ahead < 0) I.turbo = true; } return this.aiCheap(p, I) || this.aiSuperDef(p, c, I) || I; }
    return this.seek(p, c.x + d * 40, c.y);
  },
  /** the tackler's decisions: after its reaction, in reach and facing: a tackle, a big hit or a dive */
  aiTackle(p, c, I, dt) {
    const A = p.ai, aggr = this.aggr(p.team), dd = dist(p, c), facing = Math.abs(angDiff(p.f, angTo(p, c))) < 1.1;
    if (this.t < A.dec) return;
    A.dec = this.t + .15 + this.react(p.team) * (.6 + this.rng() * .8);
    const headOn = Math.abs(angDiff(c.f, angTo(c, p))) < .8;   // the tackler is in front of the runner
    if (p.boss || p.pu && p.pu.kind === 'iron') { if (dd < 40 && headOn && p.charge < 0) { I.cmd = { big: true }; return; } }
    // a big hit: wound up from 40 out at a man coming head on, let go in reach
    if (p.charge >= 0) { I.cmd = { big: dd < 16 + (c.size - 1) * 8 ? 'go' : true }; if (p.chargeT > 1.0) I.cmd = { big: 'go' }; return; }
    if ((p.pow >= 7 || aggr >= .6) && headOn && dd < 40 && dd > 18 && this.rng() < .35 * aggr) { I.cmd = { big: true }; return; }
    // a dive: chasing a faster man from behind
    const behind = Math.abs(angDiff(c.f, angTo(c, p))) > 2.2;
    if (behind && dd > 16 && dd < 30 && this.speedOf(c) >= this.speedOf(p) * .95 && this.rng() < .5) { I.cmd = { dive: true }; return; }
    if (dd < TUNE.v.tackleRange + 3 + (c.size - 1) * 8 && facing && this.rng() < .6 + .3 * aggr) I.cmd = { tackle: true };
  },
  /** a shoulder on an opponent without the ball, when the ref is turned away (a team's cheapShots rate) */
  aiCheap(p, I) {
    const rate = this.teams[p.team].style.cheap; if (rate <= 0 || this.rng() > rate * .02) return null;
    if (this.refSees(p) && this.ref.down <= 0 && this.rng() > .2) return null;   // (now and then it misjudges where the ref is looking)
    const v = this.players.find(q => q.team !== p.team && this.standing(q) && FREE[q.st] && this.ball.holder !== q.id && dist(p, q) < 14 && Math.abs(angDiff(p.f, angTo(p, q))) < 1.2);
    if (!v) return null;
    I.cmd = { cheap: v.id }; return I;
  },
  aiSuperDef(p, c, I) {
    if (this.hype[p.team] < 100 || p.sup) return null;
    const toLine = Math.abs(this.oppLine(c.team) - c.x);
    if (toLine < 120 && dist(p, c) < 120 && (this.teams[p.team].style.supers || this.rng() < .02)) { I.cmd = { super: true }; return I; }
    return null;
  },
  aiKickChase(p, S) {
    const b = this.ball, L = b.land, kt = b.team;
    if (!this.kickRoles || this.kickRoles.t !== b.t0Key) {
      const rk = p.team; void rk;
      const recv = this.players.filter(q => q.team !== kt && this.standing(q)).sort((a, q) => dist2(a.x, a.y, L.x, L.y) - dist2(q.x, q.y, L.x, L.y));
      const chase = this.players.filter(q => q.team === kt && this.standing(q) && q.id !== b.from).sort((a, q) => (dist2(a.x, a.y, L.x, L.y) / this.speedOf(a)) - (dist2(q.x, q.y, L.x, L.y) / this.speedOf(q)));
      this.kickRoles = { t: b.t0Key, catch: recv[0] ? recv[0].id : -1, back: recv[1] ? recv[1].id : -1, chase: chase.slice(0, 2).map(q => q.id) };
    }
    const R = this.kickRoles;
    if (p.id === R.catch) return this.seek(p, L.x, L.y, true);
    if (p.id === R.back) return this.seek(p, L.x + this.dir[p.team] * -30, L.y + 20, true);
    if (R.chase.includes(p.id)) return this.seek(p, L.x, L.y, true);
    const s = S.slots[p.id] || S.def[p.id];
    if (p.team === kt) return this.seek(p, L.x - this.dir[kt] * 60 + (p.slot - 3) * 8, clamp(L.y + (p.slot - 3) * 50, G.Y0 + 20, G.Y1 - 20));
    return s ? this.seek(p, s.x, s.y) : this.seek(p, L.x + this.dir[p.team] * -80, L.y + (p.slot - 3) * 40);
  },
  aiLoose(p, S) {
    const b = this.ball, k = Math.min(1, Math.hypot(b.vx, b.vy) / 200);
    const rx = b.x + b.vx * .5 * k, ry = b.y + b.vy * .5 * k;
    const mine = this.players.filter(q => q.team === p.team && this.standing(q) && FREE[q.st]).sort((a, q) => dist2(a.x, a.y, rx, ry) - dist2(q.x, q.y, rx, ry));
    if (mine.indexOf(p) >= 0 && mine.indexOf(p) < 2) return this.seek(p, rx, ry, true);
    const d = this.dir[p.team];
    return this.seek(p, rx - d * (40 + p.slot * 10), clamp(ry + (p.slot - 3) * 45, G.Y0 + 20, G.Y1 - 20));
  },
  /** the CPU carrier: run at the widest gap, pass when pressed, step or fend a committed tackler, kick when it pays */
  aiCarrier(p, dt) {
    const A = p.ai, d = this.dir[p.team], gx = this.oppLine(p.team), noise = this.diffs[p.team].noise, style = this.teams[p.team].style;
    const foes = this.players.filter(q => q.team !== p.team && this.standing(q));
    const near = foes.map(q => [q, dist(p, q)]).sort((a, q) => a[1] - q[1]);
    const closest = near[0] ? near[0][1] : 999, tk = near[0] && near[0][0];
    // the in-goal: dive to ground it, or carry on to the posts when nobody is close
    if (this.inGoal(p.team, p.x)) {
      const I = this.seek(p, gx + d * 30, G.CY, true);
      if (closest < 60 || Math.abs(p.y - G.CY) < 30 || p.inGoalT > 1.2) I.cmd = { ground: true };
      return I;
    }
    // steer: ahead, away from the defenders in front, toward the posts near the line, 20 inside touch
    let ty = p.y, tx = p.x + d * 90;
    for (const [q, dq] of near) { if (dq > 90 || (q.x - p.x) * d < -10) continue; ty += (p.y - q.y > 0 ? 1 : -1) * (90 - dq) * .9; }
    const toLine = Math.abs(gx - p.x);
    if (toLine < 120) ty = lerp(ty, G.CY, .25);
    ty = clamp(ty, G.Y0 + 22, G.Y1 - 22);
    const I = this.seek(p, tx, ty);
    I.mx = d * .85 + I.mx * .3; const m = Math.hypot(I.mx, I.my); I.mx /= m; I.my /= m;
    const space = closest > 60;
    I.turbo = (space || toLine < 160) && (p.turbo > TUNE.v.turboTank * .3 || this.unlimitedTurbo(p));
    if (this.t < A.dec) return I;
    A.dec = this.t + .15 + this.react(p.team) * (.5 + this.rng() * .5);
    const r = this.rng() + (this.rng() - .5) * noise;
    // supers: THUNDER RUN in the opponents' half with space ahead
    if (this.hype[p.team] >= 100 && !p.sup && this.adv1(p.team, p.x) > -40 && r < (style.supers ? .5 : .3)) { I.cmd = { super: true }; return I; }
    // a drop goal: the last 20 s, trailing by 3 or less, in range
    const diff = this.score[p.team] - this.score[1 - p.team], late = this.half === 2 && this.halfLen - this.clock < 20 && !this.hooter;
    if (late && diff <= 0 && diff >= -3 && toLine < 280 && closest > 18 && Math.abs(p.y - G.CY) < 140) { I.cmd = { kick: { kind: 'drop', x: gx, y: G.CY, power: .9 } }; return I; }
    if (tk && closest < 30 && (tk.x - p.x) * d > -6) {
      const committing = closest < 22 && Math.abs(angDiff(tk.f, angTo(tk, p))) < .9;
      if (committing && p.stepCd <= 0 && r < .25 * (.5 + p.spd / 20) * (1 + (this.o.attract ? 1 : 0))) { I.cmd = this.rng() < .25 ? { spin: true } : { step: this.awaySide(p) }; return I; }
      if (closest < 16 && p.pow >= 6 && p.fendCd <= 0 && r < .4) { I.cmd = { fend: true }; return I; }
      // a pass to the man with the most space
      if (r < .55 + style.pass * .4 && p.cool <= 0) {
        const L = this.legalReceivers(p, 0).filter(q => dist(q, p) < 160);
        let best = null, bs = -1e9;
        for (const q of L) {
          const lane = foes.some(f => segDist(f.x, f.y, p.x, p.y, q.x, q.y) < 12);
          const sp = foes.reduce((a, f) => Math.min(a, dist(f, q)), 999) - (lane ? 80 : 0) + (this.rng() - .5) * 60 * noise;
          if (sp > bs) { bs = sp; best = q; }
        }
        if (best && bs > closest - 10) { I.cmd = { pass: best.id, long: dist(best, p) > 100 }; return I; }
      }
    }
    // kicks: deep in the own 22 under pressure, to touch; a flat line ahead, a grubber or a bomb
    const own22 = this.adv1(p.team, p.x) < -G.W / 2 + G.L22;
    if (own22 && closest < 40 && r < .5 + style.kick * .5) { const ty2 = p.y < G.CY ? G.Y0 - 70 : G.Y1 + 70; I.cmd = { kick: { kind: 'punt', x: p.x + d * 260, y: ty2, power: .9, touch: true } }; return I; }
    if (!own22 && closest < 34 && closest > 14 && r < style.kick * .12) {
      const flat = foes.filter(q => Math.abs((q.x - p.x) * d) < 50).length >= 4;
      if (flat) { I.cmd = this.rng() < .5 ? { kick: { kind: 'grubber', x: p.x + d * 170, y: p.y, power: .5 } } : { kick: { kind: 'bomb', x: p.x + d * 200, y: p.y, power: .8 } }; return I; }
    }
    return I;
  },
  /** at a ruck: the attack's scrum-half to the base, the others in a shape round it; the defence behind its line */
  aiRuck(p, dt) {
    const S = this.setp; if (!S) return TT.emptyIntent();
    const att = S.att, d = this.dir[att], base = { x: S.x - d * 12, y: S.y };
    if (p.team === att) {
      if (p.slot === 3) return this.seek(p, base.x - d * 4, base.y + 6, true);
      const k = [0, 1, 2, -1, 1, 2, 3][p.slot], side = p.slot % 2 ? 1 : -1, open = (G.Y1 - S.y) > (S.y - G.Y0) ? 1 : -1;
      return this.seek(p, base.x - d * (20 + k * 10), clamp(base.y + open * side * (30 + Math.abs(k) * 40), G.Y0 + 20, G.Y1 - 20));
    }
    const line = S.x + d * 18;
    const rank = this.players.filter(q => q.team === p.team && this.standing(q) && q.st !== 'ruck').sort((a, q) => a.y - q.y).indexOf(p);
    const n = this.players.filter(q => q.team === p.team && this.standing(q) && q.st !== 'ruck').length;
    if (p.slot === 6 || (p.slot === 4 && n > 5)) return this.seek(p, S.x + d * 130, lerp(S.y, G.CY, .5));
    return this.seek(p, line, clamp(S.y + (rank - (n - 1) / 2) * 50, G.Y0 + 15, G.Y1 - 15));
  }
});
