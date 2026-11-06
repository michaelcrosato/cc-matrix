  /* =====================================================================
   * THE SOLDIER: a procedural skeleton posed every frame from what the body is doing (its speed and heading, crouch,
   * slide, air, the ledge or wall or rung or cable it holds, the gun's pose: aim, recoil, reload, a punch, a kick,
   * a throw, a hit, a death), then drawn with the pen (boots, pads, plates, pouches, a helmet and visor). The player in
   * third person, the raiders and the range's dummies are all soldiers
   * ===================================================================== */
  const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const UP = [0, 0, 1], ease = t => t * t * (3 - 2 * t), win = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
  /** a point in a frame: o + f*a + u*b + r*c */
  const at = (F, a, b, c = 0) => [F.o[0] + F.f[0] * a + F.u[0] * b + F.r[0] * c, F.o[1] + F.f[1] * a + F.u[1] * b + F.r[1] * c, F.o[2] + F.f[2] * a + F.u[2] * b + F.r[2] * c];
  /** a frame looking along yaw and pitch (and rolled): { o, f (ahead), u (up), r (right) } */
  function frameYP(o, yaw, pitch, roll = 0) {
    const cp = Math.cos(pitch), f = [Math.cos(yaw) * cp, Math.sin(yaw) * cp, Math.sin(pitch)], r0 = [-Math.sin(yaw), Math.cos(yaw), 0], u0 = cross(f, r0);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return { o, f, u: add(mul(u0, cr), r0, -sr), r: add(mul(r0, cr), u0, sr) };
  }
  /** turn a frame about its own axes: pitch (about r: the muzzle up), yaw (about u: to the right), roll (about f) */
  function turn(F, pitch, yaw, roll) {
    let { f, u, r } = F;
    if (pitch) { const c = Math.cos(pitch), s = Math.sin(pitch); [f, u] = [add(mul(f, c), u, s), add(mul(u, c), f, -s)]; }
    if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [f, r] = [add(mul(f, c), r, s), add(mul(r, c), f, -s)]; }
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll); [u, r] = [add(mul(u, c), r, s), add(mul(r, c), u, -s)]; }
    return { o: F.o, f, u, r };
  }
  /** two-bone IK: the joint between a (a hip, a shoulder) and the end b, bending toward hint; b pulled in if too far */
  function ik(a, b, L1, L2, hint) {
    let d = sub(b, a), dist = Math.hypot(...d); const mx = (L1 + L2) * .999;
    if (dist > mx) { d = mul(d, mx / dist); b = add(a, d); dist = mx; }
    dist = Math.max(dist, .01); const n = mul(d, 1 / dist);
    let h = sub(hint, mul(n, dot(hint, n))); const hl = Math.hypot(...h); h = hl < 1e-4 ? [n[1], -n[0], 0] : mul(h, 1 / hl);
    const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), y = Math.sqrt(Math.max(0, L1 * L1 - x * x));
    return [add(add(a, n, x), h, y), b];
  }
  /** a spring toward a target: s = { x, v } (or arrays of them); k stiffness, d damping */
  const spring = (s, target, k, d, dt) => { s.v += (k * (target - s.x) - d * s.v) * dt; s.x += s.v * dt; return s.x; };
  const SPR = () => ({ x: 0, v: 0 });

  const LOOKS = {
    player: { cloth: '#4a5440', plate: '#cbb48a', dark: '#2c3036', glove: '#33302c', helmet: '#4a5058', visor: '#6ef0ff', skin: '#c89a78', boot: '#2a2622', accent: '#e8742a', pack: '#3a3f36' },
    raider: { cloth: '#6e3a2a', plate: '#3c3632', dark: '#262224', glove: '#2a2420', helmet: '#d8cfbc', visor: '#ff3a2a', skin: '#a87a5a', boot: '#221e1c', accent: '#c8a03a', pack: '#4a3a2e', mask: true },
    heavy: { cloth: '#4a3a4a', plate: '#5a5048', dark: '#24222a', glove: '#2a2428', helmet: '#3a3438', visor: '#c86aff', skin: '#a87a5a', boot: '#221e1c', accent: '#b05ae8', pack: '#3a3240' },
    dummy: { cloth: '#8a8c94', plate: '#e8e4dc', dark: '#4a4c54', glove: '#5a5c64', helmet: '#e8e4dc', visor: '#ffb347', skin: '#d8d4cc', boot: '#3a3c44', accent: '#ff5a2a', pack: '#6a6c74', dummy: true }
  };
  /** a new soldier's body: what the game sets (x, y, z, yaw, aim, velocity, move, the gun's state) and the springs and
   *  phases its pose keeps */
  function body(look, k = 1) {
    return { look: LOOKS[look], k, x: 0, y: 0, z: 0, yaw: 0, aimYaw: 0, aimPitch: 0, vx: 0, vy: 0, vz: 0, grounded: true, move: 'stand', sprint: false, ads: false, weapon: 'rifle',
      act: null, actT: 0, ledge: null, wallN: null, zipP: null, ladder: null, dead: null, hit: [0, 0, 0], flinch: 0, fire: 0, visible: true, onGround: null,
      // pose state
      ph: 0, amp: 0, cr: 0, sl: 0, air: 0, adsB: 0, spB: 0, leanF: SPR(), leanS: SPR(), dip: SPR(), jx: SPR(), jy: SPR(), jz: SPR(), rec: SPR(), pvx: 0, pvy: 0, twist: 0, J: null, G: null, feet: [null, null], stance: null, low: false, lowB: 0 };
  }
  /** joints that would jump when what they do changes (a stride ends, a slide starts, a ledge is caught or let go) go
   *  there over dur seconds from where they were, carried along with the body (key: what they do now) */
  function settle(b, name, key, pts, dt, dur = .12) {
    const o = [b.x, b.y, b.z], s = b[name] || (b[name] = { key, last: null, from: null, t: 0 });
    if (key !== s.key && s.last) { s.from = s.last; s.t = 0; } s.key = key;
    if (s.from) { s.t += dt; const u = ease(clamp(s.t / dur, 0, 1)); for (let i = 0; i < pts.length; i++) if (pts[i] && s.from[i]) pts[i] = mixv(add(o, s.from[i]), pts[i], u); if (u >= 1) s.from = null; }
    s.last = pts.map(q => q && sub(q, o));
  }
  /** the ground under a foot: the level's (the terrain, a floor, a roof) by a short ray down, else the body's own */
  function footGround(world, b, x, y) {
    const h = world.ray(x, y, b.z + 14 * b.k, 0, 0, -1, 30 * b.k, { level: true });
    return h ? h.z : b.z;
  }
  /** pose a soldier for this frame (dt: game seconds since the last pose). Sets b.J (joints) and b.G (the gun's frame) */
  function pose(world, b, dt) {
    const k = b.k, LT = 7.4 * k, LS = 7.1 * k, LU = 4.9 * k, LF = 4.7 * k, sp = Math.hypot(b.vx, b.vy), fine = b.visible;
    // the blends, eased toward what the body is doing
    const ap = (v, t, r) => v + (t - v) * Math.min(1, dt * r);
    b.cr = ap(b.cr, b.move === 'crouch' ? 1 : 0, 10); b.sl = ap(b.sl, b.move === 'slide' ? 1 : 0, 12); b.air = ap(b.air, b.move === 'air' ? 1 : 0, 9);
    b.adsB = ap(b.adsB, b.ads ? 1 : 0, 12); b.spB = ap(b.spB, b.sprint && b.move === 'stand' && !b.act ? 1 : 0, 8);
    b.trB = ap(b.trB || 0, ['mantle', 'climb', 'ladder'].includes(b.move) ? 1 : 0, 14);
    b.lowB = ap(b.lowB, b.low && !b.ads && !b.sprint && !b.act && (b.move === 'stand' || b.move === 'crouch') ? 1 : 0, 7);
    const walking = (b.move === 'stand' || b.move === 'crouch') && b.grounded;
    b.amp = ap(b.amp, walking ? clamp(sp / 34, 0, 1) : 0, 8);
    const L = (b.move === 'crouch' ? 22 : 16) * k + sp * .3;   // a stride (two steps) grows with speed
    if (walking) b.ph = (b.ph + sp / L * dt) % 1;
    // leaning: into the acceleration, forward with speed, into turns
    const fw = [Math.cos(b.yaw), Math.sin(b.yaw), 0], rt = [-Math.sin(b.yaw), Math.cos(b.yaw), 0], ax = dt > 0 ? (b.vx - b.pvx) / dt : 0, ay = dt > 0 ? (b.vy - b.pvy) / dt : 0; b.pvx = b.vx; b.pvy = b.vy;
    const accF = ax * fw[0] + ay * fw[1], accS = ax * rt[0] + ay * rt[1];
    spring(b.leanF, clamp(accF * .0006 + (walking ? sp * .0024 : 0) + b.spB * .3, -.25, .5), 120, 16, dt); spring(b.leanS, clamp(accS * .0005, -.3, .3), 120, 16, dt);
    spring(b.dip, 0, 160, 15, dt); spring(b.rec, 0, 260, 22, dt);
    for (const [q, j] of [[b.jx, 0], [b.jy, 1], [b.jz, 2]]) { q.v += b.hit[j]; spring(q, 0, 140, 13, dt); } b.hit[0] = b.hit[1] = b.hit[2] = 0;
    // the pelvis: standing, crouched, sliding, in the air; the walk's bob and sway; a landing's dip
    const run = clamp((sp - 60) / 50, 0, 1), bob = walking ? Math.abs(Math.sin(b.ph * TAU)) : 0;
    let pz = (15.2 - b.cr * 5.2 - b.sl * 9.8 - b.air * .6) * k + (walking ? (bob - .6) * (.5 + run * .9) * b.amp * k : 0) + b.dip.x;
    if (b.move === 'stand' && !walking) pz += Math.sin(drawT * 1.6) * .12 * k;   // breathing
    const P = [b.x + b.jx.x * .3, b.y + b.jy.x * .3, b.z + pz];
    if (walking) { const sw = Math.sin(b.ph * TAU) * (.35 + run * .25) * b.amp * k; P[0] += rt[0] * sw; P[1] += rt[1] * sw; }
    // turning on the spot: the feet keep the heading they planted at (the hips turn over them) until the body has turned
    // past it, then step round one after the other, the foot on the side it turns to first
    if (!((b.move === 'stand' || b.move === 'crouch') && !(walking && b.amp > .02))) b.stance = null;
    else {
      if (!b.stance || Math.hypot(b.x - b.stance.x, b.y - b.stance.y) > 3 * k) b.stance = { yaw: b.yaw, x: b.x, y: b.y, from: null, t: 1, lead: 0 };
      const S0 = b.stance, dyaw = ((b.yaw - S0.yaw + Math.PI * 3) % TAU) - Math.PI, turning = Math.abs(((b.yaw - (b.pyaw ?? b.yaw) + Math.PI * 3) % TAU) - Math.PI) > dt * .3;
      S0.still = turning ? 0 : (S0.still || 0) + dt; b.pyaw = b.yaw;
      if (S0.t >= 1 && (Math.abs(dyaw) > .48 || (Math.abs(dyaw) > .2 && S0.still > .3)))   // (past the feet: step round, aiming past the turn; stopped turning askew: a last step squares them)
        Object.assign(S0, { from: { yaw: S0.yaw, x: S0.x, y: S0.y }, yaw: b.yaw + (turning ? Math.sign(dyaw) * Math.min(.35, Math.abs(dyaw) * .45) : 0), x: b.x, y: b.y, t: 0, lead: dyaw > 0 ? 1 : 0 });
      if (S0.t < 1) {   // (the hips shift over the planted foot while the other lifts, and dip a little as each lands)
        S0.t = Math.min(1, S0.t + dt / .32); const t = S0.t, u0 = clamp(t / .58, 0, 1), u1 = clamp((t - .42) / .58, 0, 1), sh = (Math.sin(u0 * Math.PI) * (S0.lead ? -1 : 1) + Math.sin(u1 * Math.PI) * (S0.lead ? 1 : -1)) * .5 * k;
        P[0] += rt[0] * sh; P[1] += rt[1] * sh; P[2] -= (Math.max(0, 1 - Math.abs(t - .6) / .1) + Math.max(0, 1 - Math.abs(t - .96) / .08)) * .3 * k;
      }
    }
    const standFoot = (i, yaw, x, y) => {
      const f = [Math.cos(yaw), Math.sin(yaw), 0], r = [-f[1], f[0], 0], side = i ? 1 : -1;
      return { p: add(add([x, y, 0], r, side * (2.1 + b.cr * .7) * k), f, (i ? 1.2 : -.9) * k * (1 + b.cr)), toe: nrm(add(f, r, side * .25)) };
    };
    // ---- the feet on the ground (the gait, standing, crouched, sliding, on a rung), before the pelvis settles to them ----
    const footZ = (x, y) => fine ? footGround(world, b, x, y) : b.z, A = [null, null], toe = [fw, fw];
    if (!(walking && b.amp > .02)) b.feetW = null;
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'slide') {   // the lead leg out ahead, the other tucked under
        const vd = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw, out = i === 1;
        A[i] = add(add([b.x, b.y, b.z], vd, out ? 9 * k : 2 * k), rt, side * (out ? 1.2 : 2.6) * k); A[i][2] = footZ(A[i][0], A[i][1]) + (out ? 1.6 : 1.1) * k; toe[i] = vd;
      } else if (b.move === 'ladder') {   // on the rungs, stepping in turn
        const Ld = b.ladder, st = .3 * M, ph = (b.z / st + i * .5) % 1, rung = Math.floor(b.z / st + i * .5) * st - i * st / 2;
        A[i] = add(add([b.x, b.y, 0], fw, 1.6 * k), rt, side * 1.9 * k); A[i][2] = Math.max(Ld ? Ld.z0 : 0, rung) + (ph < .3 ? ph * 6 : 0) * k + 1;
      } else if (walking && b.amp > .02) {   // the gait: stance plants the foot (it moves back as fast as the body goes on), swing lifts it forward
        const q = (b.ph + i * .5) % 1, duty = lerp(.6, .34, clamp((sp - 30) / 70, 0, 1)), reach = duty * L * .5, md = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw;
        let along, lift, roll = 0;
        if (q < duty) { const t = q / duty; along = reach * (1 - 2 * t); lift = 0; roll = t > .7 ? -(t - .7) / .3 * .6 : 0; }   // (the heel rises as it pushes off)
        else { const t = (q - duty) / (1 - duty); along = -reach + 2 * reach * ease(t); lift = Math.sin(t * Math.PI) * (2 + run * 3.2) * k; roll = lerp(-.7, .45, t); }   // (toe down off the ground, up to meet it)
        const base = add(add([b.x, b.y, 0], rt, side * (2.1 - run * .5) * k * (1 + b.cr * .25)), md, along * b.amp * Math.min(1, sp / 24));   // (the stride shrinks to nothing as the body turns back through a stop: its way flips there)
        // (the foot on the ground stays where it was put down while the body turns, slows or changes way over it, up
        // to half a stride from where the gait would have it; a swing carries it on from where it left the ground)
        const FW = b.feetW || (b.feetW = [null, null]); let f = FW[i], p = [base[0], base[1]];
        if (q < duty) { if (!f || !f.st) f = FW[i] = { st: true, p }; else p = f.p; }
        else { if (!f || f.st) f = FW[i] = { st: false, from: f ? f.p : p }; const u = ease((q - duty) / (1 - duty)); p = [lerp(f.from[0], p[0], u), lerp(f.from[1], p[1], u)]; }
        { const dx = p[0] - base[0], dy = p[1] - base[1], dd = Math.hypot(dx, dy), lim = (reach * .45 + 1.5 * k) * Math.min(1, b.amp * 1.5);   // (half a stride at most; as the body stops, the feet come in under it)
          if (dd > lim) { p = [base[0] + dx * lim / dd, base[1] + dy * lim / dd]; if (f.st) f.p = p; } }
        A[i] = [p[0], p[1], footZ(p[0], p[1]) + 1.15 * k + lift * b.amp]; toe[i] = nrm(add(add(fw, md, .5), UP, roll * b.amp));
      } else if (b.move === 'stand' || b.move === 'crouch') {   // standing: feet apart, the rear one turned out; crouched: wider, a knee forward
        const S0 = b.stance, now = standFoot(i, S0.yaw, S0.x, S0.y); let base = now.p, lift = 0, tq = now.toe;
        if (S0.t < 1 && S0.from) {   // a step round: lifted, carried, put down
          const u = clamp((S0.t - (i === S0.lead ? 0 : .42)) / .58, 0, 1), was = standFoot(i, S0.from.yaw, S0.from.x, S0.from.y);
          base = mixv(was.p, now.p, ease(u)); lift = Math.sin(u * Math.PI) * 2.3 * k; tq = nrm(mixv(was.toe, now.toe, u));
        }
        A[i] = [base[0], base[1], footZ(base[0], base[1]) + 1.15 * k + lift]; toe[i] = tq;
      }
    }
    // a kick: the right leg snaps out ahead at the waist and back (the torso leans away to balance)
    const kick = b.act === 'kick' ? win(b.actT, .04, .2) * (1 - win(b.actT, .3, .58)) : 0;
    if (kick > 0 && A[1]) A[1] = mixv(A[1], add(add([b.x, b.y, b.z + 9 * k], fw, 12.5 * k), rt, .8 * k), kick), toe[1] = nrm(mixv(toe[1], add(fw, UP, 1.2), kick));
    // the pelvis comes down until both legs reach their feet (a long stride lowers it: the run's bob)
    const pz0 = P[2];
    for (let i = 0; i < 2; i++) if (A[i] && !(kick > 0 && i === 1)) { const hx = P[0] + rt[0] * (i ? 1.85 : -1.85) * k - A[i][0], hy = P[1] + rt[1] * (i ? 1.85 : -1.85) * k - A[i][1], R = (LT + LS) * .985; P[2] = Math.min(P[2], A[i][2] + Math.sqrt(Math.max(0, R * R - hx * hx - hy * hy))); }
    // (the hips go down to the feet on a stiff spring, not at once: a foot held to the ground a little far, then lifted,
    // dropped the hips and sprang them back up in a frame)
    { const drop = pz0 - P[2], D = b.dropS || (b.dropS = { x: drop, v: 0 }); spring(D, drop, 900, 60, dt); P[2] = pz0 - Math.max(0, D.x); }
    // the torso: leaning, twisting toward the aim, curling back on a slide; the head looks along the aim
    const twist = clamp(((b.aimYaw - b.yaw + Math.PI * 3) % TAU) - Math.PI, -1.2, 1.2);
    const lf = b.leanF.x + b.sl * -.55 + b.cr * .18 + b.air * (b.vz > 0 ? .08 : -.05) - kick * .35, ls = b.leanS.x;
    const upT = nrm(add(add(add(UP, fw, lf), rt, ls), [b.jx.x * .05, b.jy.x * .05, 0]));
    const chestYaw = b.yaw + twist * .75, cf = [Math.cos(chestYaw), Math.sin(chestYaw), 0];
    let rtT = nrm(cross(upT, cf)); rtT = nrm(sub(rtT, mul(upT, dot(rtT, upT)))); const fT = nrm(cross(rtT, upT));
    const pitchBend = b.aimPitch * (.42 + b.adsB * .1) * (1 - b.spB);
    const upC = nrm(add(mul(upT, Math.cos(pitchBend)), fT, Math.sin(pitchBend))), fC = nrm(cross(rtT, upC));
    const C = add(add(P, upT, 5.2 * k), [b.jx.x, b.jy.x, b.jz.x]), N = add(C, upC, 4.4 * k), Hd = add(N, nrm(add(upC, fC, Math.sin(b.aimPitch) * .3 + b.spB * .45)), 2.3 * k);   // (a sprint drives the head forward and down)
    const S = [add(add(N, upC, -1.3 * k), rtT, -3.15 * k), add(add(N, upC, -1.3 * k), rtT, 3.15 * k)];
    const Hp = [add(P, rt, -1.85 * k), add(P, rt, 1.85 * k)];
    // ---- the legs: the feet that hang from the body (in the air, vaulting, at a wall, on a cable), then the knees by IK ----
    const feet = [];
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'air' || b.move === 'vault') {   // knees up on the way up, reaching down to land
        const up = clamp(b.vz / 110, -1, 1), tuck = b.move === 'vault' ? 1 : .55 + up * .4;
        A[i] = add(add(P, rt, side * 2.1 * k), fw, (i ? 2 : -1.5) * k * (1 - tuck * .4)); A[i][2] = P[2] - (13.2 - tuck * 6.5 - (i ? 1.5 : 0)) * k;
      } else if (b.move === 'mantle' || b.move === 'climb') {   // feet scrabbling at the wall, a knee up
        const tt = drawT * (b.move === 'climb' ? 9 : 4) + i * Math.PI, wn = b.wallN || mul(fw, -1);
        A[i] = add(add([b.x, b.y, b.z], rt, side * 2 * k), wn, -1.2 * k); A[i][2] = b.z + (2 + Math.max(0, Math.sin(tt)) * 5) * k + (b.move === 'mantle' ? (i ? 4 : 1) * k : 0);
      } else if (b.move === 'zip') {   // hanging: legs together, swinging a little
        A[i] = add(add(P, rt, side * 1.4 * k), fw, (1.5 + Math.sin(drawT * 3 + i) * 1.5) * k); A[i][2] = P[2] - 13.4 * k;
      }
    }
    settle(b, 'feetB', walking && b.amp > .02 ? 'gait' : (b.move === 'stand' || b.move === 'crouch') && b.stance ? b.stance : b.move, A, dt);
    for (let i = 0; i < 2; i++) if (A[i]) { const hint = nrm(add(add(fw, rt, (i ? 1 : -1) * .25), UP, -.1)); feet.push({ A: A[i], Kn: ik(Hp[i], A[i], LT, LS, hint)[0], toe: toe[i] }); }
    // ---- the gun and the hands ----
    const G = gunFrame(b, C, N, Hd, upC, fC, rtT);
    const hands = handTargets(b, G, C, Hd, fC, rtT, upC);
    settle(b, 'handsB', b.move === 'ladder' && b.ladder ? 'ladder' : b.move === 'zip' && b.zipP ? 'zip' : b.ledge && (b.move === 'mantle' || b.move === 'climb') ? 'ledge' : 'gun', hands, dt);
    const hintR = nrm(add(add(rtT, upC, -.9 + b.spB * .5), fC, -.3)), hintL = nrm(add(add(rtT, upC, -1.4 + b.spB * .5), fC, -.2 - b.spB * .4));   // (a sprint swings the elbows out)
    const arms = [ik(S[0], hands[0], LU, LF, hintL), ik(S[1], hands[1], LU, LF, hintR)];
    b.J = { P, C, N, Hd, S, Hp, feet, arms, hands, upT, upC, rtT, fT, fC, fw, rt };
    b.G = G;
    if (b.move === 'dead') deadPose(world, b);
  }
  /** where the gun is: low and across the chest at a sprint, at the shoulder (the cheek on the stock down the sights),
   *  dipped for a punch or a throw, tilted for a reload; pushed back by recoil */
  function gunFrame(b, C, N, Hd, upC, fC, rtT) {
    const k = b.k, aim = frameYP([0, 0, 0], b.aimYaw, b.aimPitch);
    let F = { o: add(add(add(N, fC, 3.1 * k), rtT, 3 * k), upC, -3 * k), f: aim.f, u: aim.u, r: aim.r };   // (the stock in the right shoulder's pocket)
    if (b.adsB > .01) F.o = mixv(F.o, add(add(add(Hd, aim.f, 3 * k), aim.u, -2.6 * k), aim.r, 1.2 * k), b.adsB);
    if (b.lowB > .01) { const lo = turn(F, -.32 * b.lowB, .16 * b.lowB, .12 * b.lowB); lo.o = mixv(F.o, add(add(add(C, fC, 2.4 * k), rtT, 4.3 * k), upC, -1.8 * k), b.lowB); F = lo; }   // (the low ready: at the right side, muzzle down, where a camera over the shoulder sees it)
    if (b.spB > .01) {   // a sprint at port arms: the rifle across the chest, muzzle up past the left shoulder, swinging with the stride
      // (the rifle rises against world up: the torso leans into the run)
      const sw = Math.sin(b.ph * TAU) * b.amp, pf = nrm(add(add(mul(rtT, -.5), UP, .87 + sw * .05), fC, .04)), pu = nrm(sub(fC, mul(pf, dot(fC, pf))));
      const f = nrm(mixv(F.f, pf, b.spB)), u0 = mixv(F.u, pu, b.spB), u = nrm(sub(u0, mul(f, dot(u0, f))));
      F = { o: mixv(F.o, add(add(add(C, fC, 3.2 * k), rtT, (2.4 + sw * .3) * k), upC, 1.6 * k), b.spB), f, u, r: cross(u, f) };   // (high port arms: from behind, the barrel's top stands clear beside and above the helmet)
    }
    if (b.move === 'slide') F = turn(F, 0, 0, -.35 * b.sl);
    const a = b.act;
    if (a) {
      const t = b.actT;
      if (a === 'reload') { const R = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); F = turn(F, R.pitch, R.yaw, R.roll); F.o = add(F.o, F.u, R.lift * k); }
      else if (a === 'melee' || a === 'throw' || a === 'kick') { const d = a === 'melee' ? win(t, 0, .07) * (1 - win(t, .32, .5)) : win(t, 0, .12) * (1 - win(t, .4, .6)); F = turn(F, -.7 * d, .5 * d, .6 * d); F.o = add(add(F.o, F.r, 1.5 * d * k), F.u, -2.2 * d * k); }
      else if (a === 'swap') { const d = Math.sin(Math.min(1, t / .5) * Math.PI); F = turn(F, -1.1 * d, 0, .3 * d); F.o = add(F.o, F.u, -3 * d * k); }
    }
    if (b.trB > .01) { const d = b.trB, o = F.o; F = turn(F, -1.3 * d, .9 * d, .3 * d); F.o = mixv(o, add(add(C, rtT, 2 * k), [0, 0, -3 * k]), d); }   // (slung for a climb, eased)
    if (b.move === 'zip') { F.o = add(add(C, fC, 3 * k), rtT, 2 * k); }
    F.o = add(F.o, F.f, -b.rec.x * 1.1 * k);
    if (b.rec.x) F = turn(F, b.rec.x * .06, 0, 0);
    return F;
  }
  /** the hands: right on the grip, left on the handguard (or the mag, the pump, the ledge, a rung, the cable, a punch) */
  function handTargets(b, G, C, Hd, fC, rtT, upC) {
    const k = b.k, W = WEAPONS[b.weapon];
    let R = at(G, -.5 * k, -1.5 * k, 0), Lh = at(G, (W.fore - (b.gun ? b.gun.pump || 0 : 0) * 2.3) * k, -.35 * k, -.2 * k);
    const a = b.act, t = b.actT;
    if (a === 'reload') { const R2 = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); if (R2.hand) Lh = at(G, R2.hand[0] * k, R2.hand[1] * k, R2.hand[2] * k); }
    if (a === 'melee') {   // the left fist: back, then out across the front at chest height, then home
      const wind = win(t, 0, .045), hit = win(t, .045, .085), back = win(t, .16, .38), aim = [Math.cos(b.aimYaw), Math.sin(b.aimYaw), Math.sin(b.aimPitch) * .6];
      const cock = add(add(C, rtT, -3.5 * k), fC, -.5 * k), strike = add(add(C, aim, 9 * k), upC, 1.6 * k);
      Lh = mixv(mixv(mixv(Lh, cock, wind), strike, hit), Lh, back);
    }
    if (a === 'throw') { const wind = win(t, .1, .35), rel = win(t, .35, .48), back = win(t, .55, .75); Lh = mixv(mixv(mixv(Lh, add(add(Hd, rtT, -3.2 * k), fC, -3 * k), wind), add(add(Hd, fC, 8 * k), upC, 1.5 * k), rel), Lh, back); }
    if (b.ledge && (b.move === 'mantle' || b.move === 'climb')) {
      const e = b.ledge, wn = b.wallN || [0, 0, 0], sd = nrm(cross(UP, wn)), up = b.move === 'climb' ? drawT * 7 : 0;
      const hl = add(add(e, sd, 2.4 * k), wn, .6), hr = add(add(e, sd, -2.4 * k), wn, .6);
      if (b.move === 'climb') { hl[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up)) * 4); hr[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up + Math.PI)) * 4); }
      Lh = hl; R = hr;
    }
    if (b.move === 'ladder' && b.ladder) {
      const Ld = b.ladder, f = [Math.cos(Ld.yaw), Math.sin(Ld.yaw), 0], s = [-f[1], f[0], 0], base = [Ld.x, Ld.y, 0], step = .3 * M;
      const rung = i => { const z = Math.floor((Hd[2] + (i ? step / 2 : 0)) / step) * step + (i ? 0 : step / 2); return add(add(base, s, (i ? 1 : -1) * .24 * M), [0, 0, Math.min(Ld.z1 + .8 * M, z)]); };
      Lh = rung(0); R = rung(1);
    }
    if (b.move === 'zip' && b.zipP) Lh = b.zipP;
    return [Lh, R];
  }
  /** a death: the knees fold and the pelvis drops (a little the shot's way), then the body falls back from the hips
   *  until it lies on the ground, the arms going limp; the gun leaves the hands and clatters down beside it */
  function deadPose(world, b) {
    const D = b.dead, t = D.t, k = b.k, J = b.J, g = D.g ?? b.z, dir = [Math.cos(D.dir), Math.sin(D.dir), 0], axis = nrm(cross(UP, dir));
    const sink = ease(win(t, 0, .4)), fall = clamp((t - .16) / .52, 0, 1), phi = fall * fall * 1.5 + Math.sin(clamp((t - .68) / .22, 0, 1) * Math.PI) * .07;
    const P0 = J.P, P = mixv(P0, [P0[0] + dir[0] * 4 * k, P0[1] + dir[1] * 4 * k, g + 2.4 * k], sink), dP = sub(P, P0);
    const c = Math.cos(phi), sn = Math.sin(phi), tilt = v => add(add(mul(v, c), cross(axis, v), sn), axis, dot(axis, v) * (1 - c));
    const rot = q => { const o = add(add(P0, tilt(sub(q, P0))), dP); o[2] = Math.max(o[2], g + 1.3 * k); return o; };
    if (!D.G0 && b.G) D.G0 = { o: b.G.o.slice(), f: b.G.f.slice(), u: b.G.u.slice(), r: b.G.r.slice() };
    for (const key of ['C', 'N', 'Hd']) J[key] = rot(J[key]);
    J.P = P; J.S = J.S.map(rot); J.Hp = J.Hp.map(q => add(q, dP));
    for (const key of ['upT', 'upC', 'fT', 'fC', 'rtT']) J[key] = tilt(J[key]);
    // the legs: the feet stay where they stood, the knees fold up between
    J.feet = [0, 1].map(i => { const side = i ? 1 : -1, A = add(add([b.x, b.y, g + 1.15 * k], J.rt, side * (2.3 + sink) * k), J.fw, (i ? 1 : -1) * sink * 1.5 * k); return { A, Kn: ik(J.Hp[i], A, 7.4 * k, 7.1 * k, nrm(add(add(J.fw, UP, .5), J.rt, side * .4)))[0], toe: nrm(add(J.fw, J.rt, side * .5)) }; });
    // the arms: on the gun until it drops, then limp beside the body, on the ground
    const let_go = win(t, .22, .5), held = J.hands.map(rot), limp = [0, 1].map(i => { const h = add(add(J.S[i], J.rtT, (i ? 1 : -1) * 3.5 * k), J.upC, -4.5 * k); h[2] = Math.max(g + 1.1 * k, h[2] - let_go * 6 * k); return h; });
    J.hands = held.map((h, i) => mixv(h, limp[i], let_go));
    J.arms = [0, 1].map(i => ik(J.S[i], J.hands[i], 4.9 * k, 4.7 * k, nrm(add(mul(J.upC, -1), J.rtT, (i ? 1 : -.4)))));
    // the gun: turning with the body, then falling free to lie on its side
    const G0 = D.G0; if (!G0) return;
    if (t < .24) b.G = { o: rot(G0.o), f: tilt(G0.f), u: tilt(G0.u), r: tilt(G0.r) };
    else {
      if (!D.Gd) { const c2 = Math.cos(phi), s2 = Math.sin(phi), tl = v => add(add(mul(v, c2), cross(axis, v), s2), axis, dot(axis, v) * (1 - c2)); D.Gd = { o: rot(G0.o), f: tl(G0.f), r: tl(G0.r) }; }
      const u = t - .24, Gd = D.Gd, fl = nrm([Gd.f[0], Gd.f[1], 0]), s = win(u, 0, .32), o = add(Gd.o, [dir[0] * Math.min(u, .4) * 18, dir[1] * Math.min(u, .4) * 18, 0]);
      o[2] = Math.max(g + .8 * k, Gd.o[2] - .5 * GRAV * u * u);
      const f = nrm(mixv(Gd.f, fl, s)), r = nrm(mixv(Gd.r, UP, s)); b.G = { o, f, r, u: nrm(cross(f, r)) };
    }
  }

  /* ---- drawing a soldier with the pen (engine units, the pen's frame at the origin) ---- */
  function drawSoldier(pen, b) {
    const J = b.J; if (!J) return;
    const c = b.look, k = b.k, tube = (a, e, r, col) => pen.tube(a[0], a[1], a[2], e[0], e[1], e[2], r * k, col), ball = (p, r, col) => pen.ball(p[0], p[1], p[2], r * k, r * k, r * k, col);
    const slab = (a, e, ac, w, t, col) => pen.slab(a[0], a[1], a[2], e[0], e[1], e[2], ac[0], ac[1], ac[2], w * k, t * k, col);
    pen.flash = b.flash > 0;
    // legs: boots, shins with guards, knee pads, thighs, a holster
    J.feet.forEach(({ A, Kn, toe }, i) => {
      const fr = nrm(cross(toe, UP)), heel = add(add(A, toe, -1.3 * k), UP, -.55 * k), tip = add(add(A, toe, 2.5 * k), UP, -.75 * k);
      slab(heel, tip, fr, 2.1, 1.7, c.boot); slab(add(heel, UP, -.6 * k), add(tip, UP, -.55 * k), fr, 2.2, .45, c.dark);
      const lf = nrm(sub(Kn, A)), legF = nrm(cross(fr, lf)).map(v => -v);
      tube(A, Kn, 1.28, c.cloth); slab(add(add(A, lf, 1.6 * k), legF, .9 * k), add(Kn, legF, .9 * k), fr, 1.7, .55, c.plate);
      ball(add(Kn, legF, .55 * k), 1.38, c.dark);
      tube(Kn, J.Hp[i], 1.75, c.cloth);
      if (i === 1) slab(add(lerpP(Kn, J.Hp[i], .55), fr, -1.4 * k), add(lerpP(Kn, J.Hp[i], .88), fr, -1.5 * k), lf, 1.5, 1, c.dark);
    });
    // the belt, the torso, its plate and pouches, the pack
    const { P, C, N, Hd, upT, upC, rtT, fT, fC } = J;
    slab(add(P, rtT, -2.5 * k), add(P, rtT, 2.5 * k), fT, 3.6, 2.6, c.dark);
    for (const s of [-1.3, 0, 1.3]) slab(add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, -.2 * k), add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, 1.1 * k), rtT, 1.1, .9, c.pack);
    slab(add(P, upT, .6 * k), add(N, upC, -.6 * k), rtT, 6.0, 3.7, c.cloth);
    slab(add(add(P, upT, 3.2 * k), fC, 1.75 * k), add(add(N, upC, -1.1 * k), fC, 1.6 * k), rtT, 5.3, 1.1, c.plate);
    for (const s of [-1.6, 0, 1.6]) slab(add(add(add(P, upT, 3.6 * k), fC, 2.4 * k), rtT, s * k), add(add(add(P, upT, 5.4 * k), fC, 2.4 * k), rtT, s * k), rtT, 1.3, .8, s ? c.pack : c.accent);
    slab(add(add(P, upT, 2.6 * k), fC, -2.6 * k), add(add(N, upC, -1.2 * k), fC, -2.8 * k), rtT, 4.6, 2.3, c.pack);
    if (!c.dummy) slab(add(add(N, upC, -1.4 * k), fC, -4 * k), add(add(N, upC, 1.6 * k), fC, -3.6 * k), rtT, .4, .4, c.dark);   // a radio's aerial
    // arms: pads, sleeves, gloves
    J.arms.forEach(([El, Hn], i) => { const Sh = J.S[i]; ball(Sh, 1.85, c.plate); tube(Sh, El, 1.22, c.cloth); ball(El, 1.15, c.dark); tube(El, Hn, 1.08, c.cloth); tube(lerpP(El, Hn, .55), Hn, 1.16, c.glove); ball(Hn, 1.1, c.glove); });
    // the neck and head: a helmet with a visor (the raiders: a pale mask with eyes that glow)
    tube(N, Hd, .95, c.dark);
    const hf = nrm(sub(Hd, N)), hfw = nrm(add(fC, hf, -dot(fC, hf))), hr = nrm(cross(hf, hfw));
    ball(add(Hd, hfw, .5 * k), 1.75, c.skin);
    ball(add(Hd,hf,.9*k),1.85,c.helmet);
    ball(add(Hd,hfw,1.9*k),.45,c.skin);
    for(const ss of [-1,1]) {
      ball(add(add(add(Hd,hfw,1.62*k),hr,ss*.65*k),hf,.25*k),.18,'#201b17');
      slab(add(add(add(Hd,hfw,1.6*k),hr,ss*.65*k-.3*k),hf,.68*k),add(add(add(Hd,hfw,1.6*k),hr,ss*.65*k+.3*k),hf,.68*k),hf,.16,.18,c.dark);
    }
    slab(add(add(Hd,hfw,1.65*k),hf,-.7*k),add(add(Hd,hfw,1.65*k),hf,-.8*k-(b.talk?Math.sin(world.time*28)*.25:0)),hr,.7,.15,c.dark);
    if(c.accent==='#9c2a1e')slab(add(N,rtT,-2*k),add(N,rtT,2*k),upC,.7,.6,c.accent);
    if (b.G) drawGun(pen, b.G, b.weapon, b.gun || GUN0, k);
    pen.flash = false;
  }
  const lerpP = (a, e, t) => [a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t];
  const GUN0 = { mag: 0, bolt: 0, pump: 0, flash: 0 };
  /** a gun in its frame (o: the grip's top, f along the barrel, u up, r right): the RANGER rifle (a holo sight, a curved
   *  mag, a two-tone handguard) or the BREACHER pump shotgun; st: { mag (0 in, 1 in the hand at st.magP, 2 out), bolt
   *  (the charging handle pulled 0..1), pump (0..1), flash (0..1), shell (a shell in the hand at st.shellP) } */
