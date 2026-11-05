// Dipout HD: the simulation. Craft ride a hover height over a banked road (track space: s along, u across, z up).
// Node-safe and deterministic: all randomness comes from seeded streams, time from the fixed step.
(() => {
  const SN = globalThis.SN;
  const CRAFT_HALF = 1.3;        // craft half width (m)
  const DETACH = 2.4;            // above this height over the road the craft is airborne
  const SPRING_K = 70, SPRING_D = 8;
  const LAND_SAFE = 9;           // landing speed (m/s) that does no damage
  const STEER_A = 16, LAT_DAMP = 2.6;
  const BRAKE_TURN = 6;          // airbrake yaw (one side turns the craft)
  const PAD_BOOST = 14;          // m/s gained when crossing a pad

  // ---------- ship ----------
  SN.makeShip = (o) => ({
    id: o.id, index: o.index, name: o.name, team: o.team, human: !!o.human,
    cls: o.cls, lane: o.lane || 0, skill: o.skill || 1,
    s: 0, u: o.u || 0, P: o.P || 0, v: o.v || 0, vu: 0, zc: 0, vz: 0, h: 0, grounded: true,
    energy: 100, energyMax: 100, weapon: null, shield: 0, immune: 0, elimT: 0, eliminated: false,
    lap: 0, lapStart: 0, lapTimes: [], finished: false, finishT: 0, place: 0,
    pitch: 0, steer: 0, roll: 0, damageT: 0, pickupCool: 0, padCool: 0, safeP: o.P || 0,
    stats: { hits: 0, elims: 0, wallHits: 0, fired: 0, pads: 0, airTime: 0, jumps: 0, maxAir: 0 },
    fx: { air: false, landed: 0, lastHit: 0, fireCool: 0 },
    rng: o.rng,
  });

  // Place a ship at its progress on the grid or after a respawn.
  SN.placeShip = (race, sh, P, u) => {
    const tr = race.track, q = SN.frameInto(tr, P, {});
    sh.P = P; sh.s = SN.wrap(P, tr.L); sh.u = u;
    sh.zc = SN.roadZ(tr, sh.s, u) + 0.4; sh.vz = 0; sh.v = 0; sh.vu = 0;
    sh.grounded = true; sh.h = 0.4;
    return q;
  };

  // Gather the events for presentation. Each event is a plain object; tests read them too.
  const ev = (race, e) => { race.events.push(e); };

  // ---------- one physics step for a ship ----------
  SN.stepShip = (race, sh, c, dt) => {
    const tr = race.track, Tn = SN.Tune.T, cls = sh.cls;
    const topV = cls.top * Tn.topSpeed;
    // Timers
    sh.shield = Math.max(0, sh.shield - dt);
    sh.immune = Math.max(0, sh.immune - dt);
    sh.pickupCool = Math.max(0, sh.pickupCool - dt);
    sh.padCool = Math.max(0, sh.padCool - dt);
    sh.damageT = Math.max(0, sh.damageT - dt);
    sh.fx.fireCool = Math.max(0, sh.fx.fireCool - dt);
    if (sh.eliminated) {
      sh.elimT -= dt;
      if (sh.elimT <= 0) {
        sh.eliminated = false;
        sh.energy = sh.energyMax * 0.5;
        SN.placeShip(race, sh, sh.safeP, 0);
        sh.immune = 2.5;
        ev(race, { t: 'respawn', ship: sh.index });
      }
      return;
    }
    if (sh.finished) { c = { steer: 0, pitch: 0, thrust: 0, brakeL: 0.4, brakeR: 0.4, fire: false, absorb: false }; }
    const fr = SN.frameInto(tr, sh.s, {});
    const brake = Math.min(1, (c.brakeL || 0) + (c.brakeR || 0));
    // Longitudinal: thrust, drag, brakes, gravity on the slope.
    let acc = 0;
    if (c.thrust) acc += cls.thrust * Tn.thrust * (sh.grounded ? 1 : 0.35) * (1 + 0.18 * Math.max(0, c.pitch || 0));
    acc -= sh.v * 0.012 + brake * (16 + sh.v * 0.08);
    if (sh.v > topV) acc -= (sh.v - topV) * 1.6;
    if (sh.grounded) acc -= Tn.gravity * fr.slope;
    sh.v = Math.max(0, sh.v + acc * dt);
    // Lateral: steer and airbrakes, damped.
    const steer = Math.max(-1, Math.min(1, c.steer || 0));
    const grip = cls.grip * Tn.grip * (sh.grounded ? 1 : 0.25);
    sh.vu += (steer * STEER_A * grip - sh.vu * LAT_DAMP * grip + ((c.brakeR || 0) - (c.brakeL || 0)) * BRAKE_TURN) * dt;
    sh.u += sh.vu * dt;
    sh.steer = steer; sh.pitch = Math.max(-1, Math.min(1, c.pitch || 0));
    const wl = 9.0 - CRAFT_HALF;
    if (Math.abs(sh.u) > wl) {
      const hit = Math.abs(sh.vu) + sh.v * 0.02;
      sh.u = Math.sign(sh.u) * wl; sh.vu = -sh.vu * 0.4; sh.v *= 0.985;
      if (hit > 4) {
        sh.stats.wallHits++;
        if (!sh.immune) sh.energy -= hit * 0.5 * Tn.wallDamage;
        sh.damageT = 3;
        ev(race, { t: 'wall', ship: sh.index, impact: hit });
      }
    }
    // Side-shift (L1 / R1, Z / X): a sharp lateral kick on the road.
    if (sh.grounded && c.shiftLPressed) sh.vu -= 9;
    if (sh.grounded && c.shiftRPressed) sh.vu += 9;
    // Advance along the road.
    sh.P += sh.v * dt;
    sh.s = SN.wrap(sh.P, tr.L);
    const f2 = SN.frameInto(tr, sh.s, {});
    const Sz = f2.C[2] + f2.R[2] * sh.u;
    // Vertical: hover spring when near the road, ballistic when airborne.
    const hTarget = Tn.hover - 0.35 * sh.pitch;
    const h = sh.zc - Sz;
    const slopeV = f2.slope * sh.v;
    if (h < DETACH) {
      if (!sh.grounded && sh.vz < -LAND_SAFE) {
        const impact = -sh.vz - LAND_SAFE;
        if (!sh.immune) sh.energy -= impact * 1.2 * Tn.wallDamage;
        sh.damageT = 2;
        ev(race, { t: 'land', ship: sh.index, impact: -sh.vz });
      }
      if (!sh.grounded) ev(race, { t: 'landed', ship: sh.index });
      sh.grounded = true;
      const a = SPRING_K * (hTarget - h) - SPRING_D * (sh.vz - slopeV);
      sh.vz += a * dt;
    } else {
      if (sh.grounded) { ev(race, { t: 'air', ship: sh.index }); sh.stats.jumps++; sh.fx.air = true; }
      sh.grounded = false;
      sh.vz -= Tn.gravity * dt;
      sh.stats.airTime += dt;
      sh.stats.maxAir = Math.max(sh.stats.maxAir, h);
    }
    sh.zc += sh.vz * dt;
    const hNow = sh.zc - Sz;
    if (hNow < 0.25) { sh.zc = Sz + 0.25; sh.vz = Math.max(sh.vz, 0); }
    sh.h = sh.zc - Sz;
    // Visual roll follows steering and bank.
    sh.roll = SN.lerp(sh.roll, steer * 0.5 - f2.bank * 0.2, Math.min(1, dt * 8));

    // Pads: a boost on the road.
    if (sh.grounded && sh.padCool <= 0) {
      for (const p of tr.pads) {
        const d = SN.wrap(sh.s - p.s, tr.L);
        if (d < p.len) {
          sh.v = Math.min(sh.v + PAD_BOOST * Tn.boostPower, topV * 1.25);
          sh.padCool = 0.5;
          sh.stats.pads++;
          ev(race, { t: 'pad', ship: sh.index });
          break;
        }
      }
    }
    // Pickups as the craft crosses one.
    if (sh.pickupCool <= 0 && !sh.weapon) {
      for (let k = 0; k < tr.pickups.length; k++) {
        const pk = tr.pickups[k];
        if (race.pickupTaken[k] > race.time) continue;
        const d = SN.wrap(sh.s - pk.s, tr.L);
        if (d < 3 && Math.abs(sh.u - pk.u) < 3.2) {
          race.pickupTaken[k] = race.time + 10 / Math.max(0.01, Tn.pickupRate);
          sh.weapon = race.drawWeapon(sh);
          sh.pickupCool = 0.6;
          ev(race, { t: 'pickup', ship: sh.index, weapon: sh.weapon });
          break;
        }
      }
    }
    // Absorb: the held weapon becomes shield energy.
    if (c.absorb && sh.weapon) {
      sh.energy = Math.min(sh.energyMax * 1.3, sh.energy + 25);
      ev(race, { t: 'absorb', ship: sh.index, weapon: sh.weapon });
      sh.weapon = null;
    }
    // Fire the held weapon.
    if (c.firePressed && sh.weapon && sh.fx.fireCool <= 0) race.fire(sh);
    // Energy: a slow recovery once the craft has had a clean spell.
    if (sh.damageT <= 0 && sh.energy < sh.energyMax) sh.energy = Math.min(sh.energyMax, sh.energy + 1.2 * dt);
    sh.energy = Math.min(sh.energy, sh.energyMax * 1.3);
    // Elimination.
    if (sh.energy <= 0 && !sh.eliminated) {
      sh.eliminated = true; sh.elimT = 3; sh.energy = 0; sh.v = 0; sh.weapon = null;
      sh.stats.elims++;
      ev(race, { t: 'elim', ship: sh.index });
    }
    // Safe progress marker for respawns (only when on a road and not in the air).
    if (sh.grounded && sh.v > 20) sh.safeP = sh.P - 60;
    // Laps and finish.
    const lapNow = Math.max(0, Math.floor(sh.P / tr.L));
    while (sh.lap < lapNow) {
      sh.lap++;
      const t = race.time;
      const lt = t - sh.lapStart;
      sh.lapStart = t;
      sh.lapTimes.push(lt);
      ev(race, { t: 'lap', ship: sh.index, lap: sh.lap, time: lt });
    }
    if (!sh.finished && sh.P >= race.laps * tr.L) {
      sh.finished = true; sh.finishT = race.time;
      race.finishCount++;
      sh.place = race.finishCount;
      ev(race, { t: 'finish', ship: sh.index, place: sh.place, time: sh.finishT });
    }
  };

  // ---------- projectiles, mines, shockwaves ----------
  const frameS = (tr, s) => SN.frameInto(tr, s, {});
  // Distance along the track between two progress values, in (-L/2, L/2].
  const dAlong = (L, a, b) => { let d = SN.wrap(a - b, L); if (d > L / 2) d -= L; return d; };

  SN.stepProjectiles = (race, dt) => {
    const tr = race.track;
    for (const p of race.proj) {
      p.life -= dt; p.armT = (p.armT || 0) - dt;
      if (p.kind === 'swarm') {
        // Steer toward the nearest craft ahead, then fly the lane.
        let best = null, bd = 90;
        for (const sh of race.ships) {
          if (sh.index === p.owner || sh.eliminated) continue;
          const d = dAlong(tr.L, sh.P, p.P);
          if (d > 0 && d < bd) { bd = d; best = sh; }
        }
        if (best) p.u = SN.approach(p.u, best.u, dt * 26);
        p.v = SN.approach(p.v, p.speed, dt * 160);
      } else if (p.kind === 'cannon') {
        p.v = p.speed;
      } else if (p.kind === 'mine') {
        p.v = 0;
      }
      if (p.kind !== 'mine') p.P += p.v * dt;
      p.s = SN.wrap(p.P, tr.L);
      const q = frameS(tr, p.s);
      p.z = q.C[2] + q.R[2] * p.u + 0.8;
      // Hit tests against craft.
      if (p.kind === 'tremor') continue;
      for (const sh of race.ships) {
        if (sh.index === p.owner || sh.eliminated || sh.immune > 0) continue;
        if (p.kind === 'mine' && p.armT > 0) continue;
        const dP = Math.abs(dAlong(tr.L, sh.P, p.P)), du = Math.abs(sh.u - p.u), dz = Math.abs(sh.zc - p.z);
        if (dP < 3.2 && du < 2.6 && dz < 3.2) {
          const base = SN.WEAPONS[p.kind].dmg * SN.Tune.T.weaponDamage;
          const dmg = base * (sh.shield > 0 ? 0.2 : 1) * (sh.cls.shieldMul || 1);
          sh.energy -= dmg; sh.damageT = 3; sh.stats.hits++;
          sh.v *= 0.9; sh.vz += 4;
          ev(race, { t: 'hit', ship: sh.index, by: p.owner, weapon: p.kind, dmg });
          p.life = 0; p.hit = true;
          break;
        }
      }
    }
    // Shockwaves: instant effect, then a short-lived ring.
    for (const w of race.shocks) {
      w.life -= dt;
    }
    race.proj = race.proj.filter((p) => p.life > 0 && !p.hit && Math.abs(p.P) < 1e7);
    race.shocks = race.shocks.filter((w) => w.life > 0);
  };

  SN.spawnProjectile = (race, owner, kind, P, u, speed) => {
    const W = SN.WEAPONS[kind];
    const p = { kind, owner, P, s: SN.wrap(P, race.track.L), u, v: speed, speed, life: W.life, armT: kind === 'mine' ? 1.5 : 0, id: race.nextId++ };
    race.proj.push(p);
    return p;
  };

  // ---------- AI pilot ----------
  // Returns the controls the AI wants this step.
  SN.aiControls = (race, sh) => {
    const tr = race.track, Tn = SN.Tune.T;
    const cls = sh.cls;
    // Look ahead along the road for the slowest bend we must brake for.
    const look = Math.max(45, sh.v * 1.7);
    let vmaxAhead = Infinity;
    for (let d = 0; d <= look; d += 15) {
      const f = frameS(tr, sh.s + d);
      vmaxAhead = Math.min(vmaxAhead, f.vmax);
    }
    const trueTop = cls.top * Tn.topSpeed;
    // Rubber band: pull back laggards a little, slow the leader a little.
    const leader = race.ships.reduce((m, o) => (o.P > m ? o.P : m), -Infinity);
    const gap = leader - sh.P;
    const rb = 1 + Math.max(-0.05, Math.min(0.06, gap / 2000)) * Tn.rubberBand;
    let vTarget = Math.min(trueTop, vmaxAhead * 0.96) * sh.skill * Tn.aiSkill * rb;
    // Lane choice: our lane, shifted away from a craft just ahead on the same line.
    let uTarget = sh.lane;
    for (const o of race.ships) {
      if (o === sh || o.eliminated) continue;
      const d = dAlong(tr.L, o.P, sh.P);
      if (d > 0 && d < 9 && Math.abs(o.u - sh.u) < 3) uTarget = sh.u + (sh.u >= o.u ? 3.5 : -3.5);
    }
    uTarget = SN.clamp(uTarget, -(9 - 2.2), 9 - 2.2);
    const steer = SN.clamp(0.7 * (uTarget - sh.u) - 0.45 * sh.vu, -1, 1);
    const thrust = sh.v < vTarget - 1 ? 1 : 0;
    const brake = sh.v > vTarget + 10 ? 0.7 : 0;
    const c = { steer, pitch: 0, thrust, brakeL: brake, brakeR: brake, fire: false, firePressed: false, absorb: false };
    // Weapons: use what we hold when it pays.
    if (sh.weapon && !sh.eliminated) {
      let ahead = false, behind = false;
      for (const o of race.ships) {
        if (o === sh || o.eliminated) continue;
        const d = dAlong(tr.L, o.P, sh.P);
        if (d > 0 && d < 60) ahead = true;
        if (d < 0 && d > -22) behind = true;
      }
      const w = sh.weapon;
      if ((w === 'swarm' || w === 'cannon') && ahead && sh.rng() < 0.05 * sh.skill) c.firePressed = true;
      if (w === 'mine' && behind && sh.rng() < 0.05) c.firePressed = true;
      if (w === 'tremor' && sh.rng() < 0.01) c.firePressed = true;
      if (w === 'bulwark' && sh.damageT > 0 && sh.rng() < 0.05) c.firePressed = true;
      if (w === 'mine' && !behind && ahead && sh.rng() < 0.01) c.firePressed = true;
    }
    return c;
  };

  // ---------- race ----------
  // opts: { track, cls, laps, seed, entrants: [{ name, team, pilot, human, grid, lane, skill }], mode }
  SN.Race = function Race(opts) {
    this.track = opts.track;
    this.cls = opts.cls;
    this.laps = opts.laps || 3;
    this.seed = opts.seed >>> 0;
    this.mode = opts.mode || 'race';
    this.time = 0;
    this.events = [];
    this.proj = [];
    this.shocks = [];
    this.nextId = 1;
    this.finishCount = 0;
    this.finished = false;
    this.pickupTaken = this.track.pickups.map(() => -1);
    this.contacts = new Set();
    this.weaponRng = SN.stream(this.seed, 'pickup');
    this.ships = [];
    opts.entrants.forEach((e, i) => {
      const rng = SN.stream(this.seed, 'ai:' + i);
      const laneRng = SN.stream(this.seed, 'lane:' + i);
      const sh = SN.makeShip({
        id: 'ship' + i, index: i, name: e.name, team: e.team, human: e.human,
        cls: this.cls, lane: e.lane != null ? e.lane : laneRng.range(-4.5, 4.5), skill: e.skill || 1, rng,
      });
      const row = Math.floor(i / 2), side = i % 2 ? 3 : -3;
      const P0 = -8 - 9 * row;
      SN.placeShip(this, sh, P0, e.human && opts.entrants.length === 1 ? 0 : side);
      sh.energyMax = SN.Tune.T.energyMax * (this.cls.shieldMul || 1) * 1.0;
      sh.energy = sh.energyMax;
      sh.safeP = P0;
      this.ships.push(sh);
    });
    this.positions();
  };
  SN.Race.prototype.drawWeapon = function (sh) {
    const r = this.weaponRng;
    const order = SN.WEAPON_TABLE;
    // Weighted by place: those behind see more of the strong weapons.
    const back = this.ships.filter((o) => o.P > sh.P).length / Math.max(1, this.ships.length - 1);
    const weights = [3, 3 + back * 2, 2, 2 + back * 2, 1.5 + back];
    const total = weights.reduce((a, b) => a + b, 0);
    let x = r() * total;
    for (let i = 0; i < order.length; i++) { x -= weights[i]; if (x <= 0) return order[i]; }
    return order[order.length - 1];
  };
  SN.Race.prototype.fire = function (sh) {
    const w = sh.weapon, tr = this.track;
    sh.fx.fireCool = 0.35;
    sh.stats.fired++;
    if (w === 'swarm') SN.spawnProjectile(this, sh.index, 'swarm', sh.P + 4, sh.u, 60);
    else if (w === 'cannon') SN.spawnProjectile(this, sh.index, 'cannon', sh.P + 4, sh.u, SN.WEAPONS.cannon.speed);
    else if (w === 'mine') SN.spawnProjectile(this, sh.index, 'mine', sh.P - 4, sh.u, 0);
    else if (w === 'tremor') {
      this.shocks.push({ owner: sh.index, life: SN.WEAPONS.tremor.life, r: SN.WEAPONS.tremor.radius, P: sh.P, u: sh.u, z: sh.zc });
      for (const o of this.ships) {
        if (o === sh || o.eliminated || o.immune > 0 || !o.grounded) continue;
        const d = Math.hypot(dAlong(tr.L, o.P, sh.P), o.u - sh.u);
        if (d < SN.WEAPONS.tremor.radius) {
          const dmg = SN.WEAPONS.tremor.dmg * SN.Tune.T.weaponDamage * (o.shield > 0 ? 0.2 : 1);
          o.energy -= dmg; o.vz += 6; o.damageT = 3; o.stats.hits++;
          this.events.push({ t: 'hit', ship: o.index, by: sh.index, weapon: 'tremor', dmg });
        }
      }
    } else if (w === 'bulwark') {
      sh.shield = SN.WEAPONS.bulwark.life;
    }
    this.events.push({ t: 'fire', ship: sh.index, weapon: w });
    sh.weapon = null;
  };

  SN.Race.prototype.positions = function () {
    const act = this.ships.slice();
    act.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishT - b.finishT;
      return b.P - a.P || a.index - b.index;
    });
    act.forEach((s, i) => { s.rank = i + 1; });
  };

  SN.Race.prototype.step = function (dt, controls) {
    this.events.length = 0;
    this.time += dt;
    const tr = this.track;
    for (let i = 0; i < this.ships.length; i++) {
      const sh = this.ships[i];
      let c = controls && controls[i];
      if (!sh.human || !c) c = SN.aiControls(this, sh);
      SN.stepShip(this, sh, c, dt);
    }
    // Craft against craft, in index order.
    const nowContacts = new Set();
    for (let i = 0; i < this.ships.length; i++) {
      for (let j = i + 1; j < this.ships.length; j++) {
        const a = this.ships[i], b = this.ships[j];
        if (a.eliminated || b.eliminated) continue;
        const dP = dAlong(tr.L, b.P, a.P), du = b.u - a.u, dz = b.zc - a.zc;
        const key = i * 64 + j;
        if (Math.abs(dP) < 3.4 && Math.abs(du) < 2.6 && Math.abs(dz) < 2.6) {
          const push = (2.6 - Math.abs(du)) * 0.5 * Math.sign(du || 1);
          a.u -= push; b.u += push;
          const vmin = Math.min(a.v, b.v);
          a.v = SN.lerp(a.v, vmin, 0.15); b.v = SN.lerp(b.v, vmin, 0.15);
          if (!this.contacts.has(key)) {   // a bump costs energy once, when the contact starts
            if (!a.immune) a.energy -= 3 * SN.Tune.T.wallDamage;
            if (!b.immune) b.energy -= 3 * SN.Tune.T.wallDamage;
            this.events.push({ t: 'bump', a: i, b: j });
          }
          nowContacts.add(key);
        }
      }
    }
    this.contacts = nowContacts;
    SN.stepProjectiles(this, dt);
    this.positions();
    this.finished = this.finishCount >= this.ships.length;
  };

  // The race is over for a human when they finish (AI can keep racing for a clean result).
  SN.Race.prototype.humanDone = function () { return this.ships.some((s) => s.human && s.finished); };

  SN.Race.prototype.results = function () {
    return this.ships.slice().sort((a, b) => a.rank - b.rank).map((s) => ({
      name: s.name, index: s.index, human: s.human, rank: s.rank, finished: s.finished,
      time: s.finished ? s.finishT : null, lapTimes: s.lapTimes.slice(), elims: s.stats.elims,
      hits: s.stats.hits, wallHits: s.stats.wallHits, fired: s.stats.fired, pads: s.stats.pads,
      jumps: s.stats.jumps, maxAir: s.stats.maxAir, airTime: s.stats.airTime,
    }));
  };

  SN.Race.prototype.hash = function () {
    const nums = [];
    for (const s of this.ships) nums.push(s.P, s.u, s.zc, s.v, s.energy, s.lap);
    for (const p of this.proj) nums.push(p.s, p.u);
    return SN.hashNums(nums);
  };
})();
