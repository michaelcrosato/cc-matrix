/* =============================================================================
 * 11-pitch: the pitch catalog, the delivery (pick, aim, the release ring,
 * aftertouch), the exact parametric flight (the plate crossing is known at
 * release), calls at the zone, stamina and wild pitches.
 * Coordinates are offsets from home plate: x across (+ toward 1B), y along
 * (- toward the mound), z up. The strike zone plane is y = -6.
 * ========================================================================== */
const PLATE_Y = -6, REL_Y = -198, HEATER = 340;
const wob = (u, T, ph, amp) => amp * (Math.sin(TAU * 3 * u * T + ph) * .7 + Math.sin(TAU * 1.7 * u * T + ph * 2.3) * .3);
BZ.PITCHES = {
  heater: { name: 'Heater', short: 'HEATER', speed: 1, bx: 0, bz: 1.5, k: 1, sag: 1.5, kind: 'heater', cost: 1.2, trail: 'lines' },
  curve: { name: 'Curve', short: 'CURVE', speed: .74, bx: 7, bz: -10, k: 2.2, sag: 9, kind: 'breaking', cost: 1.6 },
  slider: { name: 'Slider', short: 'SLIDER', speed: .86, bx: 9, bz: -3, k: 2, sag: 4, kind: 'breaking', cost: 1.6 },
  changeup: { name: 'Changeup', short: 'CHANGE', speed: .66, bx: -3, bz: -6, k: 1.6, sag: 8, kind: 'offspeed', cost: 1 },
  sinker: { name: 'Sinker', short: 'SINKER', speed: .92, bx: -4, bz: -6, k: 1.8, sag: 3, kind: 'offspeed', cost: 1 },
  knuckler: { name: 'Knuckleball', short: 'KNUCKLE', speed: .6, bx: 0, bz: -3, k: 1, sag: 9, kind: 'offspeed', cost: 1, wobble: 4 },
  // signatures
  butterfly: { name: 'Butterfly Knuckler', short: 'BUTTERFLY', speed: .58, bx: 0, bz: -3, k: 1, sag: 10, kind: 'signature', cost: 2.2, wobble: 6.4, trail: 'flutter' },
  kernelcannon: { name: 'Kernel Cannon', short: 'CANNON', speed: 1.15, bx: 0, bz: 2, k: 1, sag: 1, kind: 'signature', cost: 2.2, trail: 'lines' },
  riptide: { name: 'Riptide Curve', short: 'RIPTIDE', speed: .76, bx: 6, bz: -8, k: 2, sag: 8, kind: 'signature', cost: 2.2, special: (u) => [Math.sin(u * TAU) * 4 * (1 - u * .5), Math.sin(u * TAU * 1.5) * 1.5], trail: 'bubbles' },
  magmasinker: { name: 'Magma Sinker', short: 'MAGMA SINKER', speed: .9, bx: -3, bz: -10, k: 3.2, sag: 2, kind: 'signature', cost: 2.2, trail: 'embers' },
  zerog: { name: 'Zero-G Floater', short: 'ZERO-G', speed: .62, bx: 0, bz: 0, k: 1, sag: 2, kind: 'signature', cost: 2.2, special: (u) => [0, 6 * Math.sin(Math.min(1, u / .7) * Math.PI / 2) - 18 * Math.pow(Math.max(0, (u - .7) / .3), 2)], trail: 'sparkle' },
  phantomfork: { name: 'Phantom Forkball', short: 'PHANTOM FORK', speed: .84, bx: 0, bz: -8, k: 3.5, sag: 2, kind: 'signature', cost: 2.2, vis: u => u < .35 || u > .8, trail: 'ghost' },
  gigavolt: { name: 'Gigavolt Heater', short: 'GIGAVOLT', speed: 1.25, bx: 0, bz: 1, k: 1, sag: 1, kind: 'signature', cost: 2.2, special: (u) => [Math.sign(Math.sin(u * Math.PI * 7)) * 2 * Math.min(1, u * 4), 0], trail: 'zap' },
  // team supers (R1 at pitch select with a full meter)
  cornpopper: { name: 'Corn Popper', short: 'CORN POPPER', speed: 1.1, bx: 0, bz: 0, k: 1, sag: 3, kind: 'super', cost: 5, pops: [.3, .55, .8], trail: 'popcorn' },
  tidalwave: { name: 'Tidal Wave', short: 'TIDAL WAVE', speed: 1.2, bx: 0, bz: 0, k: 1, sag: 0, kind: 'super', cost: 5, special: (u) => [0, 10 * Math.sin(Math.min(1, u / .75) * Math.PI) * (u < .75 ? 1 : 0)], trail: 'wave' },
  meteorheater: { name: 'Meteor Heater', short: 'METEOR HEATER', speed: 1.35, bx: 0, bz: 1, k: 1, sag: 1, kind: 'super', cost: 5, trail: 'fire' },
  blackhole: { name: 'Black Hole Ball', short: 'BLACK HOLE', speed: 1.2, bx: 2, bz: -4, k: 2, sag: 3, kind: 'super', cost: 5, tiny: true, pull: true, trail: 'swirl' },
  banshee: { name: 'Banshee Ball', short: 'BANSHEE BALL', speed: 1.25, bx: 0, bz: -3, k: 2, sag: 2, kind: 'super', cost: 5, vis: u => u > .85, trail: 'ghost', scream: true },
  overclock: { name: 'Overclock Laser', short: 'OVERCLOCK LASER', speed: 1.5, bx: 0, bz: 0, k: 1, sag: 0, kind: 'super', cost: 5, needGood: true, trail: 'laser' },
  // the Derby's pitching machine
  machine: { name: 'Pitch-O-Matic', short: 'MACHINE', speed: .8, bx: 0, bz: 0, k: 1.5, sag: 5, kind: 'heater', cost: 0 }
};
BZ.PITCH_SLOTS = ['south', 'east', 'west', 'north'];        // heater, breaking, off-speed, signature; R1 the team super
BZ.repertoire = (p) => p.pitches || ['heater', 'slider', 'changeup', 'heater'];
BZ.staminaOf = (M, p) => { const v = M.teamOf(p).stamina[p.id]; return v === undefined ? 100 : v; };

BZ.Pitch = class Pitch {
  /** o: { type, pitcher, target: [x, z], q (release quality 0..1), lefty, speedMul, brkMul, rand (gameplay rng), golden, noMiss } */
  constructor(M, o) {
    const def = BZ.PITCHES[o.type] || BZ.PITCHES.heater, p = o.pitcher || {};
    this.type = o.type; this.def = def; this.pitcher = p; this.q = clamp(o.q === undefined ? .3 : o.q, 0, 1); this.golden = !!o.golden;
    const st = o.stamina === undefined ? 100 : o.stamina, tired = st < 15 ? 2 : st < 40 ? 1 : 0;
    const vel = p.vel !== undefined ? BZ.factor(p.vel) : 1, brk = p.brk !== undefined ? BZ.factor(p.brk) : 1;
    this.speed = HEATER * def.speed * vel * (1 + .08 * this.q) * [1, .92, .85][tired] * TUNE.pitchSpeed * (o.speedMul || 1);
    this.T = (PLATE_Y - REL_Y) / this.speed;   // seconds from release to the plate
    const side = o.lefty ? -1 : 1;             // a lefty's break mirrors
    this.side = side;
    this.x0 = side * -4; this.y0 = REL_Y; this.z0 = BZ.GEO.releaseZ * ((p.look && p.look.size) || 1.25) / 1.25;
    const bk = TUNE.pitchBreak * (1 + .2 * this.q) * brk * (o.brkMul || 1);
    this.bx = def.bx * bk * side; this.bz = def.bz * bk; this.k = def.k || 1; this.sag = def.sag || 0;
    const R = o.rand || BZ.R;
    const missR = o.noMiss ? 0 : lerp(5, .5, this.q) * [1, 1.4, 2][tired] * (o.missMul || 1), ma = R() * TAU, mr = Math.sqrt(R()) * missR;
    this.aim = { x: o.target[0] + Math.cos(ma) * mr, z: o.target[1] + Math.sin(ma) * mr };
    this.target = { x: o.target[0], z: o.target[1] };
    this.phase = R() * TAU;
    this.pops = def.pops ? def.pops.map(u => ({ u, dx: (R() - .5) * 6, dz: (R() - .5) * 6 })) : null;
    this.after = { x: 0, z: 0 }; this.afterUsed = false;
    this.t = 0; this.done = false;
    this.calcEnd();
  }
  calcEnd() {
    // the base line ends where, once the break and the special path are added, the ball crosses at the aim
    const sp = this.def.special ? this.def.special(1, this) : [0, 0];
    this.ex = this.aim.x - this.bx - sp[0] - this.popSum('dx', 1) - this.wob(1, 0);
    this.ez = this.aim.z - this.bz - sp[1] - this.popSum('dz', 1) - this.wob(1, 1);
  }
  popSum(key, u) { if (!this.pops) return 0; let s = 0; for (const p of this.pops) if (u >= p.u) s += p[key]; return s; }
  wob(u, axis) { const a = this.def.wobble; if (!a) return 0; return wob(u, this.T, this.phase + axis * 1.3, a * (axis ? .5 : 1)) * Math.min(1, u * 3); }
  /** the ball's position (offset from home) at u = t / T (u > 1: on into the catcher's mitt) */
  pos(u) {
    if (u > 1) { const c = this.pos(1), k = Math.min(1, (u - 1) / .12); return { x: c.x, y: PLATE_Y + 22 * k, z: c.z + (13 - c.z) * k * .3 }; }
    const sp = this.def.special ? this.def.special(u, this) : [0, 0], bu = Math.pow(u, this.k);
    const x = lerp(this.x0, this.ex, u) + this.bx * bu + sp[0] + this.popSum('dx', u) + this.wob(u, 0) + this.after.x * Math.min(1, u / .4 + .25);
    const y = lerp(this.y0, PLATE_Y, u);
    const z = lerp(this.z0, this.ez, u) + this.sag * 4 * u * (1 - u) + this.bz * bu + sp[1] + this.popSum('dz', u) + this.wob(u, 1) + this.after.z * Math.min(1, u / .4 + .25);
    return { x, y, z };
  }
  get u() { return this.t / this.T; }
  /** where it crosses the plate plane */
  cross() { return this.pos(1); }
  visible(u) { return !this.def.vis || this.def.vis(u); }
  /** aftertouch: the stick bends the ball during the first 40% of the flight */
  steer(sx, sz, dt) {
    if (this.u > .4 || (!sx && !sz)) return;
    const brk = this.pitcher.brk !== undefined ? BZ.factor(this.pitcher.brk) : 1, lim = TUNE.aftertouch * brk;
    const rate = 14 * lim;
    this.after.x = clamp(this.after.x + sx * rate * dt, -4 * lim, 4 * lim);
    this.after.z = clamp(this.after.z + sz * rate * dt, -3 * lim, 3 * lim);
    this.afterUsed = true;
  }
  step(dt) { this.t += dt; }
};
/** is a crossing point in the batter's zone (the ball's radius counts)? */
BZ.inZone = (x, z, size = 1.25) => {
  const k = size / 1.25, r = BZ.GEO.ballR;
  return Math.abs(x) <= BZ.GEO.zoneHalfW + r && z >= BZ.GEO.zoneLo * k - r && z <= BZ.GEO.zoneHi * k + r;
};
/** does a crossing hit the batter? (righties stand on the third-base side: x < 0) */
BZ.hitsBatter = (x, z, lefty) => z > 3 && z < 31 && (lefty ? x > 14 : x < -14);
/** release quality from the press timing error (seconds) */
BZ.releaseQ = (err) => {
  const a = Math.abs(err), perfect = .04 * TUNE.releaseWindow, zero = .2 * TUNE.releaseWindow;
  if (a <= perfect) return 1;
  return clamp(1 - (a - perfect) / (zero - perfect), 0, 1);
};
BZ.WINDUP = .9; BZ.RING = .45;
