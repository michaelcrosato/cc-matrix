/* 22-players: the player entity, movement, the human's timing judge and the actions a press makes.
 * Every press of 'play' in a contact's window counts once; quality comes from how close it is to the ball's arrival. */
G.makePlayer = function (o) {
  const c = o.cast, stats = c.stats || { POW: 5, TEC: 5, SPD: 5, JMP: 5 };
  return {
    id: o.id, name: c.short || c.name, cast: c, side: o.side, slot: o.slot, team: o.team,
    x: o.x, y: o.y, z: 0, vx: 0, vy: 0, facing: o.side === 0 ? 0 : Math.PI,
    human: o.human || null, ai: !o.human, call: 'auto', lockT: 0, act: 'ready', actT: 0, down: false, dive: null,
    stats: {}, skill: o.skill || .5, base: o.base || .4, chem: o.chem || 1, color: c.color || '#fff',
    stat(k) { return stats[k] || 5; },
    rig: null, pose: null, blockAt: null, planned: null, emote: null, celebT: 0,
    home: [o.x, o.y], jumpT: 0, jumpY: 0, diveT: 0, lastHit: -9
  };
};
/* movement toward a point, speed in units per second */
G.stepToward = function (p, tx, ty, sp, dt) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { p.vx = 0; p.vy = 0; return; }
  const s = Math.min(sp, d / Math.max(dt, 1e-4));
  p.vx = dx / d * s; p.vy = dy / d * s;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (Math.abs(p.facing - Math.atan2(dy, dx)) > 0.01) p.facing = Math.atan2(dy, dx);
};
G.Match.prototype.clampPlayer = function (p) {
  const C = G.C;
  if (p.side === 0) p.x = Math.min(p.x, C.NET_X - 6); else p.x = Math.max(p.x, C.NET_X + 6);
  p.x = G.clamp(p.x, 40, 668);
  p.y = G.clamp(p.y, 112, 432);
};
G.Match.prototype.speedOf = function (p) {
  const base = G.T.runSpeed * (.86 + .03 * p.stat('SPD'));
  return p.ai ? base * G.T.aiSpeedMul : base;
};
/* the human stick in world terms (view-relative) */
G.Match.prototype.humanMove = function (p, dt) {
  const I = p.human; if (!I) return { x: 0, y: 0 };
  const m = I.move(); let mx = m[0], my = m[1];
  if (!mx && !my) return { x: 0, y: 0 };
  const d = G.game.view.screenDirToGround(mx, my);
  return { x: d[0], y: d[1], len: Math.min(1, Math.hypot(mx, my)) };
};
G.Match.prototype.updatePlayer = function (p, dt) {
  const C = G.C;
  p.lockT = Math.max(0, p.lockT - dt);
  p.actT += dt;
  if (p.dive) {
    p.diveT += dt;
    const dv = p.dive;
    if (p.diveT < .22) { p.x += dv.x * 190 * dt; p.y += dv.y * 190 * dt; p.facing = Math.atan2(dv.y, dv.x); }
    if (p.diveT > .22 + .3 + .45) { p.dive = null; p.lockT = .1; p.diveT = 0; p.act = 'ready'; }
    this.clampPlayer(p); return;
  }
  if (p.jumpT > 0) { p.jumpT = Math.max(0, p.jumpT - dt); p.jumpY = Math.sin(Math.PI * (1 - p.jumpT / .6)) * 18 * (p.jumpT > 0 ? 1 : 0); }
  if (p.human && p.human.pos) {
    // a remote player's own copy moves her fighter; the host places it, clamped to the court
    p.x = p.human.pos[0]; p.y = p.human.pos[1];
    const mv = p.human.mv || [0, 0];
    if (mv[0] || mv[1]) p.facing = Math.atan2(mv[1], mv[0]);
    this.clampPlayer(p);
    return;
  }
  if (p.human) {
    const mv = this.humanMove(p, dt);
    const sp = this.speedOf(p);
    const pl = this.pendingFor(p);
    if (mv.len) { p.x += mv.x * sp * mv.len * dt; p.y += mv.y * sp * mv.len * dt; p.facing = Math.atan2(mv.y, mv.x); p.vx = mv.x * sp * mv.len; p.vy = mv.y * sp * mv.len; }
    else if (pl && G.T.autoMove > 0 && !p.lockT) {
      G.stepToward(p, pl.P[0], pl.P[1], sp * G.T.autoMove, dt);
    } else { p.vx = 0; p.vy = 0; }
    this.clampPlayer(p);
    return;
  }
  this.aiMove(p, dt);
  this.clampPlayer(p);
};
G.Match.prototype.pendingFor = function (p) { return this.pending && this.pending.p === p ? this.pending : null; };
/* the human's press: the judge. Returns the quality of the touch or null */
G.Match.prototype.judgePress = function (p, pend) {
  const assist = (G.DIFFICULTY[this.o.difficulty] || { assist: 1 }).assist * (this.o.timingAssist === 'tight' ? .8 : this.o.timingAssist === 'generous' ? 1.6 : 1);
  const err = this.t - pend.ts;
  const ae = Math.abs(err);
  let q = ae <= G.T.perfectWin * assist ? 'perfect' : ae <= G.T.greatWin * assist ? 'great' : ae <= G.T.okWin * assist ? 'ok' : 'miss';
  const d = Math.hypot(pend.P[0] - p.x, pend.P[1] - p.y);
  const reach = G.T.reach + .4 * p.stat('TEC');
  if (q !== 'miss') {
    if (d > reach + 8) q = 'miss';
    else if (d > reach) q = q === 'perfect' ? 'great' : q === 'great' ? 'ok' : 'stretch';
  }
  return q;
};
G.Match.prototype.humanAim = function (p) {
  const I = p.human;
  if (I.lastDevice === 'mouse' && G.game.mouseGround) {
    const g = G.game.mouseGround();
    if (g) return { x: 0, y: 0, mouse: g };
  }
  const m = I.move(); const d = G.game.view.screenDirToGround(m[0], m[1]);
  return { x: m[0] || 0, y: m[1] || 0, mouse: null, wx: d[0], wy: d[1] };
};
/* the aim: stick direction or mouse point on the opponents' half, to a target spot */
G.Match.prototype.aimTarget = function (p, kind) {
  const C = G.C, oppSide = 1 - p.side;
  const a = p.human ? this.humanAim(p) : null;
  if (a && a.mouse) {
    const g = a.mouse;
    const x = G.clamp(g[0], oppSide === 1 ? C.NET_X + 12 : C.X0 + 6, oppSide === 1 ? C.X1 - 6 : C.NET_X - 12);
    const y = G.clamp(g[1], C.Y0 + 6, C.Y1 - 6);
    return { x: (x - C.NET_X) / 64, y: (y - C.CY) / 64, abs: [x, y] };
  }
  return a ? { x: a.x, y: a.y } : { x: 0, y: 0 };
};
/* a press of play, shot, dive or call while a human plays */
G.Match.prototype.humanPress = function (p, action) {
  if (p.down) return;
  if (this.phase === 'serve' && this.server === p && (action === 'play' || action === 'shot')) { this.serveInput(p, action); return; }
  if (action === 'call') { p.call = p.call === 'auto' ? 'mine' : p.call === 'mine' ? 'yours' : 'auto'; this.callFloat(p, p.call === 'auto' ? 'AUTO' : p.call === 'mine' ? 'MINE!' : 'YOURS!'); return; }
  if (action === 'call') this.tipFor('call');
  if (action === 'dive') {
    this.tipFor('dive');
    if (p.lockT > 0 || p.dive) return;
    const pl = this.pendingFor(p);
    let dx = 0, dy = 0;
    const mv = this.humanMove(p, 0);
    if (mv.len) { dx = mv.x; dy = mv.y; }
    else if (pl) { dx = pl.P[0] - p.x; dy = pl.P[1] - p.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; }
    else { dx = p.side === 0 ? 1 : -1; dy = 0; }
    const d = Math.hypot(dx, dy) || 1;
    p.dive = { x: dx / d, y: dy / d }; p.diveT = 0; p.act = 'dive'; p.actT = 0;
    p.lockT = .9;
    this.diveAt = this.t;
    // a dive that lands on the ball is a dig
    if (pl && this.t >= pl.ts - .6) { p.digWindow = { t0: this.t }; }
    return;
  }
  if (action === 'shot' && this.L && !this.pending) {
    // block: near the net, while the other side attacks
    if (Math.abs(p.x - G.C.NET_X) < 24 && this.lastTouch && this.lastTouch.side !== p.side && this.L.tNet !== null) {
      this.tipFor('block'); p.blockAt = this.t; p.act = 'block'; p.actT = 0; p.lockT = .3; return;
    }
  }
  const pend = this.pendingFor(p);
  if (!pend) {
    if (action === 'play' && this.phase === 'serve' && this.server === p) this.serveHit(p, 'play');
    return;
  }
  if (pend.judged) return;
  if (this.t < pend.ts - .6 || this.t > pend.ts + G.T.okWin * 1.2 + .4) return;
  const q = this.judgePress(p, pend);
  pend.judged = true;
  this.resolveTouch(p, pend, q, action);
};
G.Match.prototype.resolveTouch = function (p, pend, q, action) {
  const kind = pend.kind === 'attack' && action === 'shot' ? 'attack' : pend.kind;
  const aim = this.aimTarget(p, kind);
  p.act = kind === 'bump' ? 'bump' : kind === 'set' ? 'set' : 'spike';
  p.actT = 0; p.lockT = .3;
  if (q === 'miss') {
    this.callFloat(p, 'MISS');
    this.whiff(p, kind);
    return;
  }
  this.popJudge(p, q);
  G.bark(G.barkWord(kind), p.cast.voice);
  const P = G.flightAt(this.L, this.t);
  const qn = q === 'stretch' ? 'stretch' : q;
  const opts = { shot: action === 'shot' && (kind === 'attack' || kind === 'spike'), dump: action === 'shot' && kind === 'set', free: action === 'shot' && kind === 'bump', quick: aim.y < -.4 && kind === 'set', back: aim.y > .4 && kind === 'set', deep: aim.x > .4, scatter: 1 };
  if (kind === 'bump' && action === 'shot') opts.free = true;
  if (kind === 'set' && aim.y < -.4) opts.quick = true;
  const P3 = [P.x, P.y, P.z];
  if (kind === 'attack' || kind === 'spike') this.spikeCount = (this.spikeCount || 0) + 1;
  G.bus.emit('judge', { p, q: qn, kind });
  if (kind === 'bump' || kind === 'dig') opts.free = opts.free;
  if (kind === 'set' && p.human && aim.abs) { /* a set aimed by the mouse */ }
  this.touch(p, P3, kind === 'bump' && (pend.dig) ? 'dig' : kind, qn, aim, opts);
  if (pend.dig) { p.stats.digs = (p.stats.digs || 0) + 1; }
  if (qn === 'perfect' && (kind === 'bump')) p.stats.perfects = (p.stats.perfects || 0) + 1;
  if (kind === 'set') p.stats.sets = (p.stats.sets || 0) + 1;
  if (kind === 'bump') p.stats.passes = (p.stats.passes || 0) + 1;
};
G.Match.prototype.whiff = function (p, kind) {
  // no touch: the ball goes on, the planner looks for someone else on the same side
  this.pending = null;
  this.lastFault = { p, t: this.t };
  p.stats.whiffs = (p.stats.whiffs || 0) + 1;
};
G.Match.prototype.popJudge = function (p, q) {
  const names = { perfect: 'PERFECT!', great: 'GREAT', ok: 'OK', stretch: 'STRETCH' };
  this.popups = this.popups || [];
  this.popups.push({ p, text: names[q] || q, col: q === 'perfect' ? '#ffd36a' : q === 'great' ? '#5ff0ff' : q === 'stretch' ? '#ffb27a' : '#fff8e8', t: 0 });
  if (this.popups.length > 4) this.popups.shift();
  G.bus.emit('judgeText', { p, q });
};
G.Match.prototype.callFloat = function (p, text) {
  this.popups = this.popups || [];
  this.popups.push({ p, text, col: '#fff8e8', t: 0, bubble: true });
  if (this.popups.length > 4) this.popups.shift();
};
/* the ball is the server's to toss: a float serve (play) or a jump serve (shot) */
G.Match.prototype.serveHit = function (p, action) {
  if (this.serveState !== 'toss' || this.server !== p) return;
  const jump = action === 'shot';
  const apexT = this.tossL ? this.tossL.apexT : this.t;
  const err = this.t - apexT;
  const q = Math.abs(err) <= G.T.perfectWin ? 'perfect' : Math.abs(err) <= G.T.greatWin ? 'great' : Math.abs(err) <= G.T.okWin ? 'ok' : 'miss';
  if (q === 'miss' && !(this.o.autoServe)) { this.serveMiss = true; return; }
  const aim = this.aimTarget(p, 'serve');
  const opp = 1 - p.side, C = G.C;
  let tx = opp === 1 ? C.NET_X + 80 : C.NET_X - 80, ty = C.CY;
  if (aim.abs) { tx = aim.abs[0]; ty = aim.abs[1]; }
  else { tx = opp === 1 ? (aim.x > .3 ? C.X1 - 20 : aim.x < -.3 ? C.NET_X + 30 : C.NET_X + 90) : (aim.x > .3 ? C.NET_X - 30 : aim.x < -.3 ? C.X0 + 20 : C.NET_X - 90); ty = aim.y < -.3 ? C.Y0 + 14 : aim.y > .3 ? C.Y1 - 14 : C.CY; }
  // the serve leaves from where the ball is at the press
  const P = G.flightAt(this.tossL, this.t);
  this.serveState = 'hit'; this.tossL = null;
  p.act = jump ? 'jumpserve' : 'serve'; p.actT = 0;
  const qn = q === 'miss' ? 'ok' : q;
  const scatter = jump ? 1.5 : 1;
  this.serveQ = qn;
  this.touchSpec = { jump, qn, tx, ty, scatter };
  this.touch(p, [P.x, P.y, P.z], jump ? 'jump' : 'serve', qn, { x: 0, y: 0 }, { tx, ty, scatter });
  this.touches[p.side] = 0; this.touches[opp] = 0;
  this.lastTouch = { side: p.side, p, kind: 'serve', t: this.t };
  this.serveNet = true;
  p.stats.serves = (p.stats.serves || 0) + 1;
  G.bus.emit('serve', { p, q: qn, jump });
  this.playSfx && this.playSfx('serve');
};
