// ---- the ball in play: fielders chase and intercept (5.5), catches (the ring for a human side), throws, overthrows;
// batters run (5.4); the boundary, items and stadium targets; then the dead ball, decisions, reviews and the record.
Object.assign(Match.prototype, {
  inPlayStart(stumping) {
    this.runs = 0; this.runStart = this.t; this.lastRunT = this.t; this.chaseT = 0; this.settleT = 0; this.boundaryHit = 0; this.overthrow = false;
    this.catchQTE = null; this.throwQ = null; this.thrown = null; this.runCalled = false; this.mixup = false;
    for (const bt of this.batters) { bt.target = null; bt.sp = 0; bt.grounded = true; }
    this.batters[0].end = 0; this.batters[1].end = 1;
    if (!stumping) this._assignChase(true);
    else { const k = this.keeper(); k.anim = 'stump'; k.animT = 0; }
  },
  // ---------------------------------------------------------------- interception
  _assignChase(first) {
    const b = this.ball; if (b.phase === 'carried' || b.phase === 'dead') return;
    const path = predict(b, 6, this.env, .05, c => this.outside(c.x, c.y));
    const fs = this.fielders.filter(f => f.state !== 'down' && !f.hasBall && f.role !== 'parked');
    let best = null, second = null;
    for (const f of fs) {
      if (f.role === 'bowler' && b.lastTouch === 'bat' && first && b.y > 200) {}
      const spd = T('fieldSpeed') * (f.slow || 1) * (.85 + (f.p.fld || 5) * .03);
      for (const q of path) {
        if (this.outside(q.x, q.y)) break;
        const air = q.z > 4, reach = air ? (q.carried && q.z < 40 ? 9 : 0) : 6;
        if (air && !reach) continue;
        const d = hyp(f.x - q.x, f.y - q.y);
        if (d <= spd * Math.max(0, q.t - .18) + reach) { const c = { f, t: q.t, x: q.x, y: q.y, z: q.z, air }; if (!best || c.t < best.t) { second = best; best = c; } else if (!second || c.t < second.t) second = c; break; }
      }
    }
    for (const f of this.fielders) if (f.state === 'chase' || f.state === 'backup') f.state = 'set';
    if (best) { best.f.state = 'chase'; best.f.tx = best.x; best.f.ty = best.y; this.chaser = best.f; this.intercept = best; }
    else {
      // nobody gets there before the rope: the nearest deep fielder chases anyway (it reads well)
      const end = path[path.length - 1]; let nf = null, nd = 1e9;
      for (const f of fs) { if (f.role !== 'field') continue; const d = hyp(f.x - end.x, f.y - end.y); if (d < nd) { nd = d; nf = f; } }
      if (nf) { nf.state = 'chase'; nf.tx = end.x; nf.ty = end.y; this.chaser = nf; }
      this.intercept = null;
    }
    if (second && second.f !== (best && best.f) && second.f.role === 'field') { second.f.state = 'backup'; second.f.tx = second.x + (second.x - b.x) * .2; second.f.ty = second.y + (second.y - b.y) * .2; }
    const k = this.keeper(), bw = this.bowler();
    if (k && k.state !== 'chase') { k.state = 'stumps'; k.tx = 0; k.ty = -7; }
    if (bw && bw.state !== 'chase') { bw.state = 'stumps'; bw.tx = 2; bw.ty = 328; }
    // a human fielding side: the catch ring for an aerial chance
    if (best && best.air && b.carried && this.isHuman('field') && this.assistMode() !== 'Auto' && !this.catchQTE) {
      const p = this.catchProb(best.f, b);
      if (!(this.assistMode() === 'Assisted' && p > .85)) this.catchQTE = { f: best.f, tCatch: this.t + best.t, start: this.t + best.t - T('catchRing'), press: null, juggle: false };
    }
  },
  catchProb(f, b) {
    const sp = hyp(b.vx, b.vy, b.vz), dive = f.dive > 0 ? 1 : 0;
    return clamp((f.p.ctc || 5) / 10 * (difficulty === 'village' ? 1.05 : 1) - .25 * (sp / 400) - .3 * dive + .25, .05, .97);
  },
  // ---------------------------------------------------------------- in play
  _inPlay(dt) {
    const b = this.ball;
    // a stumping: the keeper whips the bails off while the striker is out of his ground
    if (this.stumpingAt) { if (this.t >= this.stumpingAt) { this.stumpingAt = null; const b0 = this.batters[0]; if (b0.y > PITCH.crease) { this.stumpsDown = [this.t, 0, 'stumped']; emit('stumps', { end: 0, how: 'stumped' }); this.flags.stumping = true; this._dead('stumped'); return; } this._dead('keeper'); return; } return; }
    const prev = { x: b.x, y: b.y, z: b.z };
    if (b.phase !== 'carried') {
      const ev = stepBall(b, dt, this.env);
      if (ev === 'landed' && b.lastTouch === 'bat') emit('ball:landed', {});
      if (this.chaosBall) this.chaosBall(b, prev, dt);
      if (this.token && hyp(b.x - this.token.x, b.y - this.token.y, (b.z - this.token.z) * .6) < 16 && b.phase !== 'throw') this._collectToken();
      this._targets(b, prev);
      if (this.outside(b.x, b.y) && !this.boundaryHit) {
        const six = b.carried && b.lastTouch === 'bat';
        this.boundaryHit = six ? 6 : 4; b.carried = false;
        emit('boundary', { n: this.boundaryHit, over: this.overthrow });
        this.flyOn = true;
      }
      if (this.boundaryHit) { this.flyT = (this.flyT || 0) + dt; if (this.flyT > .9 || b.phase === 'rolling') { this.flyT = 0; this._dead('boundary'); } return; }
    }
    // the throw in the air: a direct hit, or someone at the stumps collects
    if (b.phase === 'throw' && this.thrown) this._throwFlight(prev);
    this._fielders(dt);
    this._running(dt);
    if (this.state !== 'inPlay') return;
    // re-plan the chase as the ball bounces
    this.chaseT += dt; if (this.chaseT > .25 && (b.phase === 'hit' || b.phase === 'rolling')) { this.chaseT = 0; this._assignChase(false); }
    // dead: the ball settled with a fielder near the stumps (or anywhere, the batters home), or the 15 s cap
    const holder = this.fielders.find(f => f.hasBall);
    const running = this.batters.some(bt => bt.target !== null);
    if (holder && !running && !this.throwQ) {
      const near = Math.min(hyp(holder.x, holder.y), hyp(holder.x, holder.y - 320)) < 40;
      this.settleT += dt; if (this.settleT > (near ? .6 : 1.4)) { this._dead('settled'); return; }
    } else this.settleT = 0;
    if (this.st > 15 || (b.phase === 'rolling' && b.stopped && !holder && this.st > 8)) { this._dead('cap'); return; }
  },
  _fielders(dt) {
    const b = this.ball;
    for (const f of this.fielders) {
      if (f.role === 'parked') continue;
      if (f.state === 'down') { f.downT -= dt; if (f.downT <= 0) { f.state = 'set'; f.dive = 0; } continue; }
      if (f.hasBall) { this._holding(f, dt); continue; }
      let tx = f.tx, ty = f.ty;
      if (f.state === 'chase') {
        // closing on the ball itself once it's near, else running to the interception point
        const d = hyp(f.x - b.x, f.y - b.y);
        if (d < 60 || b.phase === 'rolling') { tx = b.x; ty = b.y; }
        const human = this.isHuman('field') && this.catchQTE && this.catchQTE.f === f;
        if (!human && this.isHuman('field') && this.assistMode() === 'Manual' && this.thrownBy !== f) {
          // manual fielding: the stick steers the chaser (a nudge: the run still homes on the ball)
          const m = this.pad('field').move(); if (hyp(m[0], m[1]) > .3) { tx = f.x + m[0] * 60; ty = f.y + m[1] * 60; }
        }
      }
      if (f.state === 'set' && f.role === 'field' && this.state === 'inPlay') { tx = f.x; ty = f.y; }
      const spd = T('fieldSpeed') * (f.slow || 1) * (.85 + (f.p.fld || 5) * .03) * (f.state === 'chase' || f.state === 'stumps' || f.state === 'backup' ? 1 : .5);
      const dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
      if (d > 2) { const v = Math.min(spd, d / dt); f.vx = dx / d * v; f.vy = dy / d * v; f.facing = Math.atan2(dy, dx); } else { f.vx = f.vy = 0; if (f.state === 'stumps') f.facing = Math.atan2(160 - f.y, -f.x); }
      if (this.chaosAvoid) this.chaosAvoid(f);
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.anim = hyp(f.vx, f.vy) > 20 ? 'run' : f.role === 'keeper' ? 'keep' : 'ready';
      // the gather: a catch for a ball that carried, else a stop
      if (b.phase === 'carried' || b.phase === 'dead' || b.unstoppable || (b.passR && hyp(b.x, b.y) < b.passR)) continue;
      if (b.phase === 'throw' && this.thrown && this.thrown.by === f) continue;
      if (f.phantom > 0) continue;   // a ghost fielder, phasing: the ball passes through
      const dz = b.z, dd = hyp(f.x - b.x, f.y - b.y);
      const air = b.carried && b.lastTouch === 'bat';
      let reach = air ? (dz < 40 && dz > 1.5 ? 9 : 0) : (dz < 6 ? 6 : 0);
      if (!reach && b.phase === 'throw' && dz < 24 && (f.role === 'keeper' || f.role === 'bowler' || f.state === 'stumps')) reach = 10;
      if (!reach) continue;
      // a dive for one just out of reach
      if (dd > reach && dd < reach + 18 && (f.state === 'chase') && !f.dive && hyp(b.vx, b.vy) > 60) {
        const fut = predict(b, .25, this.env, .05); const q = fut.find(q => hyp(q.x - f.x, q.y - f.y) < reach + 16);
        if (q) { f.dive = .5; f.anim = 'dive'; f.animT = 0; f.facing = Math.atan2(q.y - f.y, q.x - f.x); f.x += (q.x - f.x) * .5; f.y += (q.y - f.y) * .5; }
      }
      if (hyp(f.x - b.x, f.y - b.y) > reach + (f.dive ? 14 : 0)) continue;
      if (b.ectoLeft && f.role === 'field') { b.ectoLeft = 0; f.phantom = .5; emit('ecto', {}); continue; }
      if (air) { this._catch(f); if (this.state !== 'inPlay') return; }
      else if (b.phase === 'throw') { this._collectThrow(f); }
      else this._gather(f);
    }
  },
  _catch(f) {
    const b = this.ball, side = this.bowlT;
    let caught, perfect = false;
    const guaranteed = this.items[side] === 'sticky' || (this.sideFlags && this.sideFlags.guaranteedCatch === side) || (this.cfg.cheat && this.cfg.cheat.catches && this.cheatSide === side);
    const q = this.catchQTE;
    if (guaranteed) { caught = true; if (this.items[side] === 'sticky') { this.items[side] = null; emit('item:use', { id: 'sticky' }); } if (this.sideFlags) this.sideFlags.guaranteedCatch = null; }
    else if (q && q.f === f) {
      const w = T('catchWindow') / 1000, dlt = q.press === null ? null : q.press - this.t;
      if (dlt !== null && Math.abs(dlt) <= w) { caught = true; perfect = Math.abs(dlt) <= w / 2; }
      else if (dlt !== null && Math.abs(dlt) <= w * 2.2) { caught = rp() < .5; emit('juggle', {}); }
      else caught = false;
      this.catchQTE = null;
    } else caught = rp() < this.catchProb(f, b);
    if (this.dev.forceOutcome === 'caught') caught = true;
    if (this.dev.forceOutcome && this.dev.forceOutcome !== 'caught') caught = false;
    if (this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide !== side) caught = false;
    if (caught) {
      b.phase = 'carried'; f.hasBall = true; f.anim = f.dive ? 'diveCatch' : 'catch'; f.animT = 0; f.expr = 'shout';
      const screamer = perfect && f.dive || (f.dive && hyp(b.vx, b.vy) > 250);
      if (perfect) this.flags.perfectCatch = true;
      this.catcher = f; emit('catch', { fielder: f.p.short, screamer, perfect, keeper: f.role === 'keeper' });
      this._dead('caught'); return;
    }
    // dropped: it pops out and runs on
    b.vx *= .25; b.vy *= .25; b.vz = 30; b.carried = false; b.lastTouch = 'field'; f.state = 'down'; f.downT = .6; f.anim = 'drop'; f.animT = 0; f.expr = 'wince';
    emit('catch:dropped', { fielder: f.p.short });
    this._assignChase(false);
  },
  _gather(f) {
    const b = this.ball;
    if (b.lastTouch === 'bat' && rp() < (1 - (f.p.fld || 5) / 10) * .1 && hyp(b.vx, b.vy) > 120 && !f.misfielded) { f.misfielded = true; b.vx *= .7; b.vy *= .7; emit('misfield', { fielder: f.p.short }); f.state = 'down'; f.downT = .4; return; }
    b.phase = 'carried'; b.vx = b.vy = b.vz = 0; f.hasBall = true; f.gatherT = this.t; f.anim = 'gather'; f.animT = 0; this.catchQTE = null;
    if (b.lastTouch === 'bat' && this.legByes) {}
    emit('fielded', { fielder: f.p.short });
  },
  _holding(f, dt) {
    const b = this.ball; b.x = f.x + Math.cos(f.facing) * 3; b.y = f.y + Math.sin(f.facing) * 3; b.z = 14;
    f.vx = f.vy = 0;
    if (this.throwQ && this.throwQ.f === f) { this.throwQ.t -= dt; if (this.throwQ.t <= 0) { const e = this.throwQ.end; this.throwQ = null; this._throw(f, e); } return; }
    const near0 = hyp(f.x, f.y) < 22, near1 = hyp(f.x, f.y - 320) < 22;
    // at the stumps: break them if a batter is short of that end
    for (const [e, near] of [[0, near0], [1, near1]]) {
      if (!near) continue;
      const bt = this._runner(e);
      if (bt && !this._grounded(bt, e)) { this._breakStumps(e, f); return; }
    }
    if (near0 || near1) { f.anim = 'ready'; return; }
    if (this.t - f.gatherT < .25) return;
    // a human fielding side picks the end; the CPU picks the better run-out chance
    const human = this.isHuman('field') && this.assistMode() !== 'Auto';
    let end = null;
    if (human) {
      const pad = this.pad('field'), mc = pad.clickedEnd ? pad.clickedEnd() : null;
      if (pad.pressed('shot') || mc === 0) end = 0; else if (pad.pressed('loft') || mc === 1) end = 1; else if (pad.pressed('block')) end = 'lob';
      if (end === null && this.t - f.gatherT > 1.3) end = this._bestEnd(f);
      if (end !== null && this.t - f.gatherT < .55) this.rocket = true;
    } else end = this._bestEnd(f);
    if (end !== null) { f.anim = 'throw'; f.animT = 0; this.throwQ = { f, end, t: .18 }; }
  },
  _bestEnd(f) {
    let best = null, bm = -1e9;
    for (const e of [0, 1]) {
      const bt = this._runner(e); if (!bt || this._grounded(bt, e)) continue;
      const tThrow = hyp(f.x, f.y - e * 320) / T('throwSpeed') + .2, tRun = Math.abs(bt.y - (e ? PITCH.bCrease : PITCH.crease)) / Math.max(30, T('runSpeed'));
      const m = tRun - tThrow; if (m > bm) { bm = m; best = e; }
    }
    if (best !== null && bm > -.6) return best;
    return 'lob';
  },
  _throw(f, end) {
    const b = this.ball, lob = end === 'lob', e = lob ? (hyp(f.x, f.y) < hyp(f.x, f.y - 320) ? 0 : 1) : end;
    const tx = 0, ty = e ? 320 : 0, tz = lob ? 14 : 8, dist = hyp(f.x - tx, f.y - ty);
    let speed = T('throwSpeed') * (.8 + (f.p.fld || 5) * .03) * (lob ? .6 : 1) * (this.rocket ? 1.2 : 1);
    this.rocket = false;
    const err = lob ? 0 : gauss(rp) * T('throwError') * dist / 480 * (1.4 - (f.p.fld || 5) * .06);
    const sol = solveThrow(f.x, f.y, 18, tx + err, ty + (e ? 1 : -1) * (lob ? 8 : 0) + gauss(rp) * err * .5, tz, speed);
    f.hasBall = false; f.anim = 'throw'; f.animT = .2;
    Object.assign(b, { x: f.x, y: f.y, z: 18, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'throw', carried: false, landed: false, lastTouch: 'throw', bounces: 0, stopped: false });
    this.thrown = { by: f, end: e, lob, t: this.t };
    this.thrownBy = f;
    emit('throw', { end: e, lob });
  },
  _throwFlight(prev) {
    const b = this.ball, e = this.thrown.end, sy = e ? 320 : 0;
    // through the plane of the stumps at its end: a direct hit?
    if ((prev.y - sy) * (b.y - sy) <= 0 && !this.thrown.lob) {
      if (Math.abs(b.x) < STUMPS.hw + BALL_R && b.z < STUMPS.h + BALL_R) {
        b.vx *= -.2; b.vy *= -.2; b.phase = 'rolling'; this.thrown = null;
        const bt = this._runner(e);
        emit('direct', { end: e }); cover('direct');
        this._breakStumps(e, null, true);
        if (this.state === 'inPlay') { this.overthrow = true; this._assignChase(false); }
        return;
      }
    }
    const past = (0 - b.x) * b.vx + (sy - b.y) * b.vy < 0, far = hyp(b.x, b.y - sy);
    if ((past && far > 40) || (b.phase === 'rolling' && (far > 30 || b.stopped))) {
      // a missed shy with nobody backing up: overthrows, the batters may run on
      if (this.thrown && !this.overthrow && past && !this.thrown.lob) { this.overthrow = true; emit('overthrow', {}); cover('overthrow'); }
      this.thrown = null; this._assignChase(false);
    }
  },
  _collectThrow(f) {
    const b = this.ball; b.phase = 'carried'; b.vx = b.vy = b.vz = 0; f.hasBall = true; f.gatherT = this.t - 1; f.anim = 'gather'; this.thrown = null;
  },
  _runner(e) {   // the batter heading for (or nearest to) end e
    const [a, c] = this.batters;
    const toward = this.batters.filter(bt => bt.target === e);
    if (toward.length) return toward.sort((p, q) => Math.abs(p.y - e * 320) - Math.abs(q.y - e * 320)).pop();
    return Math.abs(a.y - e * 320) < Math.abs(c.y - e * 320) ? a : c;
  },
  _grounded(bt, e) { const reach = bt.dive > 0 ? 12 : 4; return e === 0 ? bt.y - reach <= PITCH.crease : bt.y + reach >= PITCH.bCrease; },
  _breakStumps(e, by, direct) {
    this.stumpsDown = [this.t, e, 'runout'];
    emit('stumps', { end: e, how: 'runout' });
    const bt = this._runner(e);
    if (bt && !this._grounded(bt, e)) {
      const margin = Math.abs(bt.y - (e ? PITCH.bCrease : PITCH.crease)) / Math.max(40, T('runSpeed'));
      this.runout = { bt, card: bt.card, end: e, margin, direct, by: by ? by.p.short : 'direct hit' };
      if (this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide !== this.bowlT) { this.runout = null; return; }
      this._dead('runout'); return;
    }
    // stumps broken but everyone home: the ball is dead if it's in a fielder's hands
    if (by) this._dead('settled');
  },
  // ---------------------------------------------------------------- running between the wickets
  _running(dt) {
    const pads = [this.pad('run'), this.isHuman('runNon') ? this.pad('runNon') : null];
    const [s, n] = this.batters;
    const human = this.isHuman('run'), auto = !human || S('running') === 'Auto';
    if (this.byes && !this.contact && !this.legByes) {}
    // the call
    for (let k = 0; k < 2; k++) {
      const bt = this.batters[k], pad = k === 0 ? pads[0] : (pads[1] || null);
      if (!pad || (auto && k === 0 && !pads[1])) continue;
      if (pad.pressed('run')) {
        if (bt.target === null) this._call(k === 0 && !pads[1] ? 'both' : k, 'yes');
        else if (Math.abs(bt.y - (bt.target ? PITCH.bCrease : PITCH.crease)) < 50 && this.thrown) { bt.dive = .6; bt.anim = 'dive'; bt.animT = 0; emit('dive', {}); cover('dive'); }
        else this.again = true;
      }
      if (pad.pressed('back') && bt.target !== null) this._call(k === 0 && !pads[1] ? 'both' : k, 'back');
    }
    if (auto || !human) this._aiRun();
    // movement
    for (const bt of [s, n]) {
      if (bt.out) continue;
      if (bt.target === null) { bt.vx = bt.vy = 0; bt.anim = bt.anim === 'swing' && this.t - this.runStart < .5 ? 'swing' : (bt === s ? 'stanceIdle' : 'backupIdle'); continue; }
      const ty = bt.target ? PITCH.bCrease + 14 : PITCH.crease - 14;
      const dir = sgn(ty - bt.y), maxV = T('runSpeed') * (this.env.sand ? .85 : 1) * (this.teaTreat === 'sandwich' && this.I.bat === this.cfg.teams.indexOf('ker') ? 1.1 : 1) * (bt.slip > 0 ? .6 : 1) * (bt.dive > 0 ? 1.35 : 1);
      bt.sp = Math.min(maxV, bt.sp + 600 * dt);
      bt.y += dir * bt.sp * dt; bt.vy = dir * bt.sp; bt.x += (bt.lane - bt.x) * Math.min(1, dt * 4);
      bt.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2; bt.anim = bt.dive > 0 ? 'dive' : 'run';
      if (bt.slip > 0) bt.slip -= dt; if (bt.dive > 0) { bt.dive -= dt; if (bt.dive <= 0 && this._grounded(bt, bt.target)) cover('diveSafe'); }
      if ((dir > 0 && bt.y >= ty) || (dir < 0 && bt.y <= ty)) { bt.y = ty; bt.end = bt.target; bt.arrived = true; bt.sp = 0; }
    }
    // a run completes when both have made their ground at opposite ends
    if (s.target !== null && n.target !== null && s.arrived && n.arrived && s.end !== n.end) {
      this.runs++; this.lastRunT = this.t; s.arrived = n.arrived = false;
      emit('run', { n: this.runs });
      if (s.diveUsed || n.diveUsed) {}
      if (this.again) { this.again = false; this._call('both', 'yes'); }
      else { s.target = n.target = null; }
    }
    // a mix-up: both batters at one end
    if (s.target === null && n.target === null && s.end === n.end) this.mixup = true;
  },
  _call(who, what) {
    const list = who === 'both' ? this.batters : [this.batters[who]];
    if (what === 'yes') {
      if (this.items[this.bowlT] === 'banana' && !this.bananaUsed) { this.bananaUsed = true; this.items[this.bowlT] = null; for (const bt of this.batters) bt.slip = 1; emit('item:use', { id: 'banana' }); }
      for (const bt of list) { if (bt.out) continue; bt.target = 1 - bt.end; bt.arrived = false; bt.sp = Math.max(bt.sp, 20); }
      this.runCalled = true; emit('call', { what: 'YES' });
    } else {
      for (const bt of list) { bt.target = bt.end; bt.arrived = false; }
      emit('call', { what: 'NO' });
    }
  },
  // the YES / NO / WAIT judgment (also the bubble's hint): time to complete the run vs the fielding side's best throw
  runMargin() {
    const b = this.ball, [s, n] = this.batters;
    const left = Math.max(...this.batters.map(bt => bt.target === null ? 300 : Math.abs(bt.y - (bt.target ? PITCH.bCrease : PITCH.crease)))) + (s.target === null ? 0 : 0);
    const tRun = left / T('runSpeed') + (s.target === null ? .3 : 0);
    const holder = this.fielders.find(f => f.hasBall);
    let tField;
    const tThrow = (f, x, y) => Math.min(hyp(x, y), hyp(x, y - 320)) / T('throwSpeed') + .45;
    if (holder) tField = tThrow(holder, holder.x, holder.y) - .1;
    else if (this.intercept && this.chaser) tField = Math.max(0, this.intercept.t - (this.t - this.runStart)) + .25 + tThrow(this.chaser, this.intercept.x, this.intercept.y);
    else if (b.phase === 'throw') tField = .4;
    else tField = 6;   // nobody will reach it before the rope
    return tField - tRun;
  },
  callHint() { const m = this.runMargin(); return m > .35 ? 'YES' : m < -.15 ? 'NO' : 'WAIT'; },
  _aiRun() {
    const [s, n] = this.batters, b = this.ball;
    if (this.boundaryHit) return;
    const since = this.t - this.runStart;
    if (since < .3 && !this.byes) return;
    const idle = s.target === null && n.target === null && s.end !== n.end;
    const agg = this.cfg.cheat ? 1 : T('aiAggression');
    if (idle && since - (this.t - this.lastRunT) >= 0 && this.t - this.lastRunT > .15) {
      const m = this.runMargin(), thr = .15 - agg * .3;
      if (m > thr && this.runs < 4 && b.phase !== 'carried' || (this.cfg.cheat && this.cfg.cheat.runs && this.runs < this.cfg.cheat.runs)) this._call('both', 'yes');
      else if (this.fielders.some(f => f.hasBall)) { /* stay */ }
    } else if (!idle && s.target !== null) {
      // mid-run: send back if hopeless
      const m = this.runMargin(); if (m < -.6 && Math.abs(s.y - (s.target ? 320 : 0)) > 200 && !(this.cfg.cheat && this.cfg.cheat.runs)) this._call('both', 'back');
    }
  },
  // ---------------------------------------------------------------- items and stadium targets
  _collectToken() {
    const id = this.token.id; this.token = null;
    const side = ITEMS[id].side === 'bowl' ? this.bowlT : this.batT;
    if (id === 'cake') this.hypeAdd(side, 40); else this.items[side] = id;
    cover('item:' + id); emit('item', { id, name: ITEMS[id].name, team: side });
  },
  _targets(b, prev) {
    if (b.lastTouch !== 'bat' || !this.cfg.kerfuffle) return;
    for (const tg of this.g.targets) {
      if (this.targetsHit.includes(tg.id)) continue;
      const at = this.targetPos ? this.targetPos(tg) : tg.at, k = T('boundaryScale');
      const dx = b.x - at[0] * k, dy = b.y - at[1] * k, dz = b.z - at[2];
      if (hyp(dx, dy, dz) < tg.r) {
        this.targetsHit.push(tg.id); this.bonusThisBall += tg.bonus; this.hypeAdd(this.batT, 30);
        b.vx *= -.15; b.vy *= -.15; b.vz = Math.min(b.vz, 0);
        cover('target'); emit('target:hit', { id: tg.id, name: tg.name, bonus: tg.bonus, line: tg.line });
      }
    }
  },
  // ---------------------------------------------------------------- dead ball: decisions and the record
  _enterDead(why) {
    if (this.state === 'dead') return;
    this.deadWhy = why; this._go('dead');
    const b = this.ball; if (b.phase !== 'carried') { if (why !== 'boundary') { b.vx *= .3; b.vy *= .3; } }
    this.decision = null; this.review = null; this.reviewWin = 0; this.replay = null; this.third = null;
    const I = this.I, sc = this.batters[0], h = this.strikerHand();
    let out = null;
    const freeHit = I.freeHit || this.noBall;
    if (why === 'bowled' && !freeHit) out = { how: 'bowled', card: I.strikeCard, by: this.bowlerP().short };
    if (why === 'caught' && !freeHit) out = { how: 'caught', card: I.strikeCard, by: this.catcher.p.short, keeper: this.catcher.role === 'keeper' };
    if (why === 'stumped' && !freeHit) out = { how: 'stumped', card: I.strikeCard, by: this.keeper().p.short };
    if (why === 'hitwicket' && !freeHit) out = { how: 'hit wicket', card: I.strikeCard, by: this.bowlerP().short };
    if (why === 'runout') out = { how: 'run out', card: this.runout.card, by: this.runout.by };
    if (why === 'lbw' && !freeHit) {
      // the umpire's call: right with probability accuracy; the review system can fix it
      const tr = this.padHit.truth, acc = (this.effects.lbwSeek ? .1 : 0) + (this.umps[0].p.id === 'ump1' ? .86 : .92);
      const right = this.cfg.umpWrong ? false : this.forcedLbw ? true : rp() < acc;
      const given = right ? tr.out : !tr.out;
      this.decision = { kind: 'lbw', out: given, truth: tr.out, umpCall: tr.umpCall, tr };
      emit('decision', { out: given, kind: 'lbw' });
      if (given) out = { how: 'lbw', card: I.strikeCard, by: this.bowlerP().short };
      this.reviewWin = 4;
    }
    if (why === 'runout' && this.runout.margin < .15) { this.third = { t: 0, out: true }; cover('third'); emit('review:start', { kind: 'third' }); }
    if (out && this.items[this.batT] === 'horseshoe') { this.items[this.batT] = null; emit('item:use', { id: 'horseshoe', saved: true }); this.horseshoeSaved = true; out = null; if (this.decision) this.decision.out = false; this.reviewWin = 0; }
    if (out && this.dev.invincible && this.isHumanSide(this.batT)) { out = null; this.reviewWin = 0; }
    if (out && this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide === this.batT) { out = null; this.reviewWin = 0; }
    if (this.dev.forceOutcome) { const f = this.dev.forceOutcome; this.dev.forceOutcome = null; if (f === 'bowled' || f === 'lbw' || f === 'stumped' || f === 'caught') out = out || { how: f, card: I.strikeCard, by: this.bowlerP().short }; }
    this.outRec = out;
    // runs: completed runs, or the boundary
    let runs = this.boundaryHit ? this.boundaryHit + (this.overthrow ? this.runs : 0) : this.runs;
    if (why === 'boundary' && this.boundaryHit === 4 && this.overthrow) runs = 4 + this.runs;
    if (out && out.how !== 'run out') runs = 0;
    const wide = this.wideCalled, nb = this.noBall;
    const byes = !this.contact && !this.legByes && runs > 0 && !wide, lb = this.legByes && runs > 0;
    const endsSwapped = this.batters[0].end === 1 && this.batters[1].end === 0 || (this.batters[0].y > 160 && this.batters[1].y < 160);
    let bonus = this.bonusThisBall; this.bonusThisBall = 0;
    if (this.items[this.batT] === 'teapot' && runs > 0 && !out) { bonus += runs; this.items[this.batT] = null; emit('item:use', { id: 'teapot', bonus: runs }); }
    this.ballRec = { strikerCard: I.strikeCard, nonCard: I.nonCard, runs, boundary: this.boundaryHit && !out ? this.boundaryHit : 0, wide, noBall: nb, byes, legByes: lb, wicket: out, bonus,
      endsSwapped: out && out.how !== 'run out' ? false : endsSwapped, shot: this.contact ? this.contact.shot : null, grade: this.swing ? this.swing.grade : null, kmh: this.delInfo ? this.delInfo.kmh : 0,
      del: this.delInfo ? this.delInfo.name : '', special: this.delInfo && this.delInfo.special || this.batSpecial || null, bowler: I.bowler, over: Math.floor(I.legal / 6), ball: I.legal % 6 + 1, t: this.t, freeHit: I.freeHit };
    if (out && out.how === 'bowled') cover('out:bowled'); if (out) cover('out:' + out.how);
    this._signal();
    if (this.boundaryHit === 6) { this.sixDist = hyp(b.x, b.y); }
    this.deadDur = (this.third ? 3.4 : 0) + (this.reviewWin ? .5 : 0) + (out ? 2 : this.boundaryHit ? 1.8 : 1.1);
    if (this.cfg.mode === 'hub') this.deadDur = Math.min(this.deadDur, out ? 1.6 : 1.1);
    this.bigMoment = out || this.boundaryHit === 6 || (this.ballRec.bonus > 0) || (this.contact && this.batSpecial);
    const rp_ = S('replays'), want = rp_ === 'Always' || (rp_ === 'Big moments' && this.bigMoment);
    if (want && !this.cfg.noReplays && this.cfg.mode !== 'hub' && this.rec && this.rec.length) {
      const from = Math.max(0, this.rec.findIndex(f => f.t >= (this.releaseT || 0) - .5));
      const frames = this.rec.length - from;
      if (frames > 20) { const dur = Math.min(5, frames / 60 / .5); this.replay = { from, to: this.rec.length - 1, t: 0, delay: this.deadDur * .55, dur }; this.deadDur += dur; cover('replay'); }
    }
    emit('dead', { why, runs, out: out ? out.how : null });
  },
  _signal() {
    const u = this.umps[0], r = this.ballRec; let s = null;
    if (r.wicket) s = 'out'; else if (r.boundary === 6) s = 'six'; else if (r.boundary === 4) s = 'four'; else if (r.wide) s = 'wide'; else if (r.noBall) s = 'noball'; else if (r.byes) s = 'bye'; else if (r.legByes) s = 'legbye';
    if (this.decision && !this.decision.out) s = s || 'notout';
    u.signal = s; u.animT = 0; if (s) cover('signal:' + s);
  },
  // the review (KRS): the batting side on OUT, the fielding side on NOT OUT, within 4 seconds, one per innings
  canReview() { return this.decision && this.reviewWin > 0 && !this.review && this.reviewsLeft[this.decision.out ? this.batT : this.bowlT] > 0; },
  reviewSide() { return this.decision ? (this.decision.out ? this.batT : this.bowlT) : null; },
  startReview() {
    if (!this.canReview()) return false;
    const side = this.reviewSide(), d = this.decision, tr = d.tr;
    const verdict = tr.umpCall ? d.out : tr.out;
    this.review = { t: 0, side, verdict, before: d.out, lights: [tr.pitched === 'outside leg' ? 'red' : 'green', tr.impact === 'outside off' ? 'red' : 'green', tr.umpCall ? 'amber' : tr.wickets === 'hitting' ? 'green' : 'red'], tr };
    this.reviewWin = 0; this.deadDur += 4.2; cover('review');
    emit('review:start', { kind: 'krs', side });
    return true;
  },
  _deadStep(dt) {
    const d = this.decision;
    // the review window: human sides press special (REVIEW); the CPU reviews when it is confident the umpire erred
    if (this.reviewWin > 0) {
      this.reviewWin = Math.max(0, this.reviewWin - dt);
      const side = this.reviewSide();
      const hum = this.sideHumans(side).length && !this.cfg.cheat;
      if (hum) { const pad = side === this.batT ? this.pad('bat') : this.pad('bowl'); if (pad.pressed('special')) this.startReview(); }
      else if (this.st > .8 && this.reviewsLeft[side] > 0 && d.out !== d.truth && rp() < .7) this.startReview();
      else if (this.st > .8 && (!this.reviewsLeft[side] || d.out === d.truth || hum === 0)) this.reviewWin = 0;
    }
    if (this.review) {
      this.review.t += dt;
      if (this.review.t > 3.6 && !this.review.done) {
        const r = this.review; r.done = true;
        const overturned = r.verdict !== r.before;
        if (!overturned) this.reviewsLeft[r.side]--;
        d.out = r.verdict;
        if (overturned) { emit('review:result', { overturned: true, out: d.out }); }
        else emit('review:result', { overturned: false, out: d.out });
        if (overturned && r.side === this.bowlT) this.flags.reviewWon = true;
        if (overturned && r.side === this.isHumanSideIdx()) this.flags.reviewWon = true;
        // rewrite the record
        const I = this.I;
        if (d.out && !this.ballRec.wicket) { this.ballRec.wicket = { how: 'lbw', card: I.strikeCard, by: this.bowlerP().short }; this.ballRec.runs = 0; cover('out:lbw'); }
        if (!d.out && this.ballRec.wicket && this.ballRec.wicket.how === 'lbw') this.ballRec.wicket = null;
        this.umps[0].signal = d.out ? 'out' : 'notout'; this.umps[0].animT = 0;
      }
    }
    if (this.replay) { const rq = this.replay; if (this.st >= rq.delay) { rq.t += dt; rq.on = true; if (rq.t >= rq.dur) { this.replay = null; } } }
    if (this.third) { this.third.t += dt; if (this.third.t > 3.2 && !this.third.done) { this.third.done = true; emit('review:result', { third: true, out: !!this.ballRec.wicket }); } }
  },
  isHumanSideIdx() { return this.humans.findIndex(h => h.length); },
  skipDead() { if (this.state === 'dead' && !this.review && !this.reviewWin && !this.third) { this.st = Math.max(this.st, this.deadDur); this.replay = null; } },
  _deadCheck() { return this.st >= this.deadDur && !this.reviewWin && (!this.review || this.review.done) && (!this.third || this.third.done); },
  _finishBall() {
    const rec = this.ballRec; this.ballRec = null;
    if (!rec) return;
    const I = this.I, before = { runs: I.runs, wkts: I.wkts };
    const evs = this.applyBall(rec);
    this.lastRec = rec;
    // hype and ON FIRE (5.9)
    const bt = this.batT, bo = this.bowlT, total = rec.runs + (rec.bonus || 0);
    if (rec.boundary === 6) this.hypeAdd(bt, 25); else if (rec.boundary === 4) this.hypeAdd(bt, 15); else if (rec.runs >= 3) this.hypeAdd(bt, 10);
    if (rec.grade === 'PERFECT') this.hypeAdd(bt, 8);
    if (rec.wicket) this.hypeAdd(bo, 30); else if (!total && !rec.wide && !rec.noBall) this.hypeAdd(bo, 6);
    if (rec.boundary) { this.fire.bat++; } else if (!rec.wide && !rec.noBall) { if (!total || rec.wicket) this.fire.bat = 0; }
    if (!total || rec.wicket) this.fire.bowl++; else if (rec.boundary) this.fire.bowl = 0; else this.fire.bowl = Math.max(0, this.fire.bowl - 1);
    if (this.fire.batOn) { this.fire.batBalls++; if (this.fire.batBalls >= 6 || rec.wicket || (!total && !rec.wide)) { this.fire.batOn = false; this.fire.bat = 0; emit('fire:off', { side: 'bat' }); } }
    else if (this.fire.bat >= T('fireStreak') || this.dev.alwaysFire) { this.fire.batOn = true; this.fire.batBalls = 0; emit('fire:on', { side: 'bat' }); cover('fire'); }
    if (this.fire.bowlOn) { this.fire.bowlBalls++; if (this.fire.bowlBalls >= 6 || rec.boundary) { this.fire.bowlOn = false; this.fire.bowl = 0; emit('fire:off', { side: 'bowl' }); } }
    else if (this.fire.bowl >= 3) { this.fire.bowlOn = true; this.fire.bowlBalls = 0; emit('fire:on', { side: 'bowl' }); cover('fire'); }
    if (this.dev.infiniteHype) { this.hype[0] = this.hype[1] = 100; }
    if (rec.wicket && rec.special && this.delInfo && this.delInfo.special) this.flags.specialWicket = true;
    if (this.effects.giant) { this.effects.giant = 0; this.giantBalls = (this.giantBalls || 0) + 1; if (this.giantBalls >= 2) { this.giantBalls = 0; if (this.items[bt] === 'giantBat') { this.items[bt] = null; emit('item:use', { id: 'giantBat' }); } } }
    // hat-tricks
    const bw = this.bowlCard(); bw.streak = rec.wicket && rec.wicket.how !== 'run out' ? (bw.streak || 0) + 1 : (rec.wide || rec.noBall ? bw.streak : 0);
    if (bw.streak === 3) { emit('milestone', { kind: 'hattrick' }); cover('hattrick'); }
    // bowling items: two dot balls in an over earn one
    if (this.cfg.kerfuffle && I.dotsThisOver === 2 && !this.items[bo] && !rec.wicket && !total) { const id = pick(BOWL_ITEMS, rp); if (id === 'cake') this.hypeAdd(bo, 40); else this.items[bo] = id; emit('item', { id, name: ITEMS[id].name, team: bo }); cover('item:' + id); }
    emit('ball:done', { rec });
    for (const [type, data] of evs) emit(type, data);
    if (this.chaosBallDone) this.chaosBallDone(rec);
    const hum = this.isHumanSideIdx();
    if (rec.boundary === 6 && hum === bt) { profile.stats.sixes++; }
    if (rec.boundary === 4 && hum === bt) profile.stats.fours++;
    if (rec.wicket && hum === bo) profile.stats.wickets++;
    if (hum === bo && rec.kmh > profile.stats.fastest) profile.stats.fastest = rec.kmh;
    if (this.cfg.boss && this.bowlerP() && this.bowlerP().machine) { this.bossBalls = (this.bossBalls || 0) + 1; if (rec.wicket) this.bossWicket = true; }
    // what next
    if (this.inningsOver()) {
      if (this.cfg.boss && this.bossBalls && !this.bossWicket) this.flags.bossSurvived = true;
      const r = this.nextInnings();
      if (r === 'result') { this._go('over'); return; }
      this.breakKind = r; this._go('break'); return;
    }
    if (I.legal % 6 === 0 && !rec.wide && !rec.noBall) { this._newOver(); this.holdFor = this.cfg.mode === 'hub' ? .2 : .6; }
    this._go('between');
  },
  _break(dt) {
    // the innings break (or Super Over) card: the scene shows it; it waits for confirm or 6 s (the tea treat in story)
    if (this.needTea) return;
    if (this.st > (this.cfg.mode === 'attract' ? 2.5 : 6) || this.breakGo) { this.breakGo = false; this._go('between'); }
  }
});
// the dead state's update (one name for the director)
Match.prototype._dead = function (arg) {
  if (typeof arg === 'string') return Match.prototype._enterDead.call(this, arg);
  this._deadStep(arg);
  if (this.state === 'dead' && this._deadCheck()) this._finishBall();
};
