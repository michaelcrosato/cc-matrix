/* THE BALL (section 6.2): an E.Body that rolls by the surface, bounces, curls by its spin, drifts in the wind, rings
 * off the woodwork, bulges the net, and follows a super strike's path when it has one. */
class Ball extends E.Body {
  constructor(m) {
    super({ x: P.CX, y: P.CY, r: 3, friction: 0, bounce: EF.T.ballBounce, gravity: EF.T.ballGravity });
    this.m = m; this.spin = 0; this.roll = 0; this.owner = null; this.pass = null; this.trail = []; this.superPath = null; this.decoys = null;
    this.held = false; this.dead = false; this.prevX = this.x; this.prevY = this.y; this.shot = null; this.screamer = false; this.lastBounce = 0;
  }
  pos() { return { x: this.x, y: this.y, z: this.z }; }
  speed() { return Math.hypot(this.vx, this.vy); }
  place(x, y, z = 0) { this.x = x; this.y = y; this.z = z; this.vx = this.vy = this.vz = 0; this.spin = 0; this.onGround = z <= 0; this.superPath = null; this.decoys = null; this.prevX = x; this.prevY = y; this.trail.length = 0; this.pass = null; this.shot = null; this.screamer = false; }
  /** kick it: velocity, lift, spin; who kicked it and what kind of kick (for passes and shots) */
  kick(vx, vy, vz, o = {}) {
    const m = this.m; if (m.owner) m.setOwner(null);
    this.vx = vx; this.vy = vy; this.vz = vz || 0; this.onGround = !(vz > 0); this.spin = o.spin || 0; this.superPath = null; this.held = false;
    this.pass = o.pass || null; this.shot = o.shot || null; this.screamer = !!o.screamer; this.dead = false; this.heldBy = null; this.inNet = false;
    if (o.who) { m.lastKick = o.who; m.touch(o.who); o.who.cool = o.cool !== undefined ? o.cool : .3; }
    m.kickHold = 0;
  }
  /** the surface under the ball now */
  surface() { return this.m.pitch.surfaceAt(this.x, this.y, this.m.surface); }
  /** where the ball will be after t seconds of free flight (no bounces): for keepers, air moves and the AI */
  predict(t) {
    const g = this.gravity, z = Math.max(0, this.z + this.vz * t - .5 * g * t * t);
    if (this.z <= .5 && this.vz <= 0) { const k = EF.T.ballFriction * EF.SURF[this.surface()].fr, f = (1 - Math.exp(-k * t)) / k; return { x: this.x + this.vx * f, y: this.y + this.vy * f, z: 0 }; }
    return { x: this.x + this.vx * t, y: this.y + this.vy * t, z };
  }
  /** when and where it crosses the goal line at x = gx in flight (y, z), or null */
  crossing(gx) {
    if (Math.abs(this.vx) < 1 || Math.sign(gx - this.x) !== Math.sign(this.vx)) return null;
    const t = (gx - this.x) / this.vx; if (t < 0 || t > 3) return null;
    const p = this.predict(t); return { t, y: p.y, z: p.z };
  }
  update(dt) {
    const m = this.m; if (this.owner) return;
    if (this.held) { if (this.heldBy && !this.heldBy.sentOff) { const h = this.heldBy.handPoint(); this.x = h[0]; this.y = h[1]; this.z = h[2]; } return; }
    this.prevX = this.x; this.prevY = this.y;
    if (this.superPath) { this.followPath(dt); this.trailPush(); return; }
    const surf = EF.SURF[this.surface()] || EF.SURF.grass, sp = Math.hypot(this.vx, this.vy);
    this.gravity = EF.T.ballGravity; this.bounce = EF.T.ballBounce * surf.bo / .55;
    if (this.spin && sp > 20) { const k = this.spin * dt, vx0 = this.vx, vy0 = this.vy; this.vx += -vy0 * k; this.vy += vx0 * k; this.spin *= Math.exp(-1.4 * dt); }
    if (this.z <= .5 && Math.abs(this.vz) < 30) {
      const f = Math.exp(-dt * EF.T.ballFriction * surf.fr); this.vx *= f; this.vy *= f;
      if (m.stadium.uneven && sp > 40 && m.rng() < dt * .8) { const a = (m.rng() - .5) * .5, c = Math.cos(a), s = Math.sin(a), vx = this.vx; this.vx = vx * c - this.vy * s; this.vy = vx * s + this.vy * c; }
      if (sp < 2) { this.vx = this.vy = 0; }
    } else { const f = Math.exp(-dt * .12); this.vx *= f; this.vy *= f; }
    const W = m.weather; if (W && W.wind && this.z > 14) this.vy += W.wind * 20 * dt * (m.stadium.windDir || 1);
    super.update(dt, m.pitch.map);
    if (this.hitWall) { this.spin = 0; if (sp > 60) m.emit('boards', { x: this.x, y: this.y, z: this.z, speed: sp }); }
    if (this.bounced) { this.lastBounce = m.t; m.emit('bounce', { x: this.x, y: this.y, z: 0, surf: this.surface(), speed: Math.abs(this.vz) }); if (this.surface() === 'puddle') { this.vx *= .3; this.vy *= .3; this.vz *= .3; m.emit('splash', { x: this.x, y: this.y }); } }
    this.roll += sp * dt;
    this.woodwork(dt);
    this.netStep();
    this.trailPush();
    if (!this.dead) m.ballRules(this);
  }
  trailPush() { const T = this.trail; if (this.screamer || this.superPath || T.length) { T.push([this.x, this.y, this.z]); if (T.length > 14 || (!this.screamer && !this.superPath)) T.shift(); } }
  /** posts and bar: cylinders of radius 2 (section 6.2) */
  woodwork() {
    const m = this.m, r = this.r + P.POST;
    for (const gx of [P.X0, P.X1]) {
      if (Math.abs(this.x - gx) > 8) continue;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) {
        const dx = this.x - gx, dy = this.y - py, d = Math.hypot(dx, dy);
        if (d < r && this.z < P.BAR + 1) {
          const nx = dx / (d || 1), ny = dy / (d || 1), vn = this.vx * nx + this.vy * ny;
          if (vn < 0) { this.vx -= 1.7 * vn * nx; this.vy -= 1.7 * vn * ny; this.x = gx + nx * r; this.y = py + ny * r; this.spin = 0; m.emit('woodwork', { x: this.x, y: this.y, z: this.z, speed: -vn, who: m.lastKick, part: 'post' }); }
        }
      }
      if (Math.abs(this.y - P.CY) < P.GH) {
        const dx = this.x - gx, dz = this.z - P.BAR, d = Math.hypot(dx, dz);
        if (d < r) {
          const nx = dx / (d || 1), nz = dz / (d || 1), vn = this.vx * nx + this.vz * nz;
          if (vn < 0) { this.vx -= 1.7 * vn * nx; this.vz -= 1.7 * vn * nz; this.x = gx + nx * r; this.z = P.BAR + nz * r; this.onGround = false; this.spin = 0; m.emit('woodwork', { x: this.x, y: this.y, z: this.z, speed: -vn, who: m.lastKick, part: 'bar' }); }
        }
      }
    }
  }
  /** inside a goal: the net's sides, back and top stop it softly and ripple */
  netStep() {
    const s = this.x < P.X0 - this.r ? -1 : this.x > P.X1 + this.r ? 1 : 0; if (!s) return;
    const gx = s < 0 ? P.X0 : P.X1, back = gx + s * P.NET, inside = Math.abs(this.y - P.CY) < P.GH + 1 && this.z < P.BAR + 1 && (s < 0 ? this.x > back - 2 : this.x < back + 2);
    if (!inside || !this.inNet) { if (inside && P.inGoal(this)) this.inNet = true; else return; }
    let hit = null;
    if (s < 0 ? this.x < back + this.r : this.x > back - this.r) { this.x = back - s * this.r; this.vx *= -.2; hit = [this.x, this.y, this.z]; }
    if (Math.abs(this.y - P.CY) > P.GH - this.r) { this.y = P.CY + Math.sign(this.y - P.CY) * (P.GH - this.r); this.vy *= -.2; hit = [this.x, this.y, this.z]; }
    if (this.z > P.BAR - this.r) { this.z = P.BAR - this.r; this.vz = Math.min(0, this.vz) * .2; hit = [this.x, this.y, this.z]; }
    if (hit) { this.vx *= .6; this.vy *= .6; EF.Nets.hit(s < 0 ? 0 : 1, hit, Math.min(1, this.speed() / 300 + .3)); if (this.m.mode === 'goal') this.m.emit('netHit', { x: hit[0], y: hit[1], z: hit[2] }); }
  }
  /* ---- super strikes: a path from the shooter to the goal (registry super, section 6.9) ---- */
  startPath(kind, from, to, o = {}) {
    const m = this.m; if (m.owner) m.setOwner(null);
    const d = Math.hypot(to.x - from.x, to.y - from.y), dur = Math.max(.35, d / (o.speed || EF.T.superSpeed)) * (kind === 'meteor' ? 1.9 : kind === 'around' ? 1.25 : 1);
    this.superPath = { kind, t: 0, dur, from: Object.assign({}, from), to: Object.assign({}, to), o, bumps: kind === 'around' ? this.aroundBumps(from, to) : null, bounces: 0, side: o.side };
    this.decoys = kind === 'split' ? [{ k: -1, alive: true }, { k: 1, alive: true }] : null;
    this.pass = null; this.shot = { super: true, side: o.side }; this.spin = 0; this.held = false;
  }
  aroundBumps(from, to) {   // every body near the straight path pushes a bulge away from it
    const bumps = [], L = Math.hypot(to.x - from.x, to.y - from.y) || 1, ux = (to.x - from.x) / L, uy = (to.y - from.y) / L;
    for (const f of this.m.players) {
      const rx = f.body.x - from.x, ry = f.body.y - from.y, along = rx * ux + ry * uy, across = -rx * uy + ry * ux;
      if (along > 20 && along < L - 4 && Math.abs(across) < 26) bumps.push({ u: along / L, k: (across > 0 ? -1 : 1) * (26 - Math.abs(across) + 10) });
    }
    return bumps;
  }
  pathAt(sp, u) {
    const { from, to, kind, o } = sp, L = Math.hypot(to.x - from.x, to.y - from.y) || 1, nx = -(to.y - from.y) / L, ny = (to.x - from.x) / L;
    let x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u), z = lerp(from.z || 4, to.z, u), off = 0;
    if (kind === 'wobble') off = Math.sin(u * TAU * (o.freq || 3.5)) * (o.amp || 16) * Math.sin(u * Math.PI);
    else if (kind === 'zigzag') { const K = [0, 1, -1, .6, 0], i = Math.min(3, Math.floor(u * 4)), f = u * 4 - i; off = lerp(K[i], K[i + 1], f) * (o.amp || 30); }
    else if (kind === 'hammer') z = Math.abs(Math.sin(u * Math.PI * 3)) * 22 * (1 - u * .4) + (to.z * u);
    else if (kind === 'meteor') { if (u < .45) { const k = u / .45; z = (from.z || 4) + ease.outQuad(k) * 320; x = lerp(from.x, lerp(from.x, to.x, .7), k); y = lerp(from.y, lerp(from.y, to.y, .7), k); } else { const k = (u - .45) / .55; z = lerp(320, to.z, ease.inQuad(k)); x = lerp(lerp(from.x, to.x, .7), to.x, k); y = lerp(lerp(from.y, to.y, .7), to.y, k); } }
    else if (kind === 'around' && sp.bumps) for (const b of sp.bumps) off += b.k * Math.exp(-Math.pow((u - b.u) / .09, 2));
    return { x: x + nx * off, y: y + ny * off, z: Math.max(0, z) };
  }
  followPath(dt) {
    const sp = this.superPath, m = this.m, u0 = sp.t / sp.dur; sp.t += dt; const u = Math.min(1.02, sp.t / sp.dur);
    const p = this.pathAt(sp, Math.min(1, u)), q = this.pathAt(sp, Math.min(1, u + .01));
    this.vx = (q.x - p.x) / (sp.dur * .01); this.vy = (q.y - p.y) / (sp.dur * .01); this.vz = (q.z - p.z) / (sp.dur * .01);
    this.x = p.x; this.y = p.y; this.z = p.z; this.roll += EF.T.superSpeed * dt;
    if (sp.kind === 'hammer') { const b = Math.floor(u * 3); if (b > sp.bounces && b < 3) { sp.bounces = b; m.emit('hammer', { x: this.x, y: this.y }); } }
    if (sp.kind === 'around' || sp.kind === 'rocket' || sp.kind === 'hammer' || sp.kind === 'zigzag') {   // through a body: it goes down
      for (const f of m.players) if (f.side !== sp.side && f.role !== 'GK' && f.state !== 'down' && f.state !== 'launched' && H.d2(f.body.x, f.body.y, this.x, this.y) < 7 && this.z < 26) f.knock(Math.atan2(this.vy, this.vx), 1.2, 'super');
    }
    if (u0 < .86 && u >= .86) m.superAtKeeper(this);
    if (!this.superPath) return;
    if (u >= 1) {   // it reaches the goal line: in (unless a save took it)
      this.superPath = null; this.decoys = null;
      const s = sp.to.x < P.CX ? -1 : 1; this.vx = s * EF.T.superSpeed * .6; this.vy = 0; this.vz = 0;
      this.x = (s < 0 ? P.X0 : P.X1) + s * (this.r + 1); this.inNet = true;
      m.emit('decoysBurst', { x: this.x, y: this.y });
      m.ballRules(this, true);
    }
  }
}
EF.Ball = Ball;

/* ---- the nets: a 7 x 4 mesh a side that springs back from where the ball hit it (drawn by the match view) ---- */
EF.Nets = {
  mesh: [null, null],
  reset() { this.mesh = [this.make(), this.make()]; },
  make() { const pts = []; for (let i = 0; i < 8 * 5; i++) pts.push({ d: 0, v: 0 }); return pts; },
  hit(i, p, k) {
    const M = this.mesh[i] || (this.mesh[i] = this.make());
    for (let j = 0; j < 8; j++) for (let q = 0; q < 5; q++) {
      const y = P.CY - P.GH + j / 7 * P.GH * 2, z = q / 4 * P.BAR, d = Math.hypot(y - p[1], z - p[2]);
      M[j * 5 + q].v += k * 90 * Math.max(0, 1 - d / 40);
    }
  },
  update(dt) {
    for (const M of this.mesh) if (M) for (const n of M) { n.v += (-60 * n.d - 8 * n.v) * dt; n.d += n.v * dt; n.d = clamp(n.d, -4, 10); }
  }
};
EF.Nets.reset();
