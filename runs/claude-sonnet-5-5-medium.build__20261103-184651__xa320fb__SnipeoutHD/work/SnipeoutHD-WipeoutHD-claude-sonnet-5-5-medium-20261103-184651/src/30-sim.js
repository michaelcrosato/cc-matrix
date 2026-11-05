(() => {
const E = My3D2dge, SN = globalThis.SN, U = SN.U;
const { clamp, mod, wrapAngle } = SN;
const HOVER = 20, HALF = 22;           // hover height and craft half width (units)
const neutral = () => ({ steer: 0, pitch: 0, thrust: 0, brakeL: 0, brakeR: 0, fire: false, firePressed: false, absorb: false, shiftL: false, shiftR: false });
SN.neutralControls = neutral;

// ---- ship ------------------------------------------------------------------------------------------------------
class Ship {
  constructor(race, idx, ent) {
    this.race = race; this.idx = idx; this.pilot = ent.pilot; this.team = SN.TEAMS[ent.team]; this.control = ent.control || 'ai'; this.name = ent.name || ent.pilot.name;
    this.color = ent.color || this.team.main; this.seat = ent.seat;
    this.dist = 0; this.s = 0; this.u = 0; this.psi = 0; this.v = 0; this.vu = 0; this.z = 0; this.zv = 0; this.air = false; this.h = HOVER; this.pitchVis = 0; this.roll = 0;
    this.energy = 100; this.weapon = null; this.boostT = 0; this.shieldT = 0; this.autoT = 0; this.rollT = 0; this.stun = 0; this.rollCool = 0;
    this.lap = 1; this.lapStart = 0; this.lapTimes = []; this.finished = false; this.finishTime = null; this.place = idx + 1; this.alive = true; this.elimT = 0;
    this.score = 0; this.kills = 0; this.deaths = 0; this.lockTarget = null; this.padCool = {}; this.launch = 0; this.ctl = neutral(); this.prevFire = false; this.wallT = 0; this.lastHitBy = null; this.pos = [0, 0, 0]; this.fr = null; this.lastBoostPad = -9;
    this.drill = { steerL: 0, steerR: 0, airL: 0, airR: 0, pad: 0, pickup: 0, fire: 0, absorb: 0, shift: 0, pit: 0 };
    this.stats = { hits: 0, wall: 0, pickups: 0, topKmh: 0 };
  }
  get vmax() { const T = SN.Tune.T, c = SN.CLASSES[this.race.cls]; return c.kmh / .225 * T.topSpeed * this.team.speed * (this.race.mode === 'overclock' ? 1 + .1 * this.race.zone : 1) * (this.race.rubber(this)); }
}
SN.Ship = Ship;

SN.Physics = {
  step(sh, c, dt, race) {
    const T = SN.Tune.T, tr = race.track, ev = race.events;
    if (!sh.alive) return;
    const fr = tr.frameAt(sh.s, sh._fa || (sh._fa = tr.frameAt(sh.s)));
    const vmax = sh.vmax, cls = SN.CLASSES[race.cls];
    sh.stun = Math.max(0, sh.stun - dt); sh.boostT = Math.max(0, sh.boostT - dt); sh.shieldT = Math.max(0, sh.shieldT - dt); sh.rollT = Math.max(0, sh.rollT - dt); sh.rollCool = Math.max(0, sh.rollCool - dt);
    for (const k in sh.padCool) if ((sh.padCool[k] -= dt) <= 0) delete sh.padCool[k];
    if (sh.autoT > 0) { sh.autoT -= dt; c = SN.AI.controls(sh, race, true); }
    const grounded = !sh.air;
    // speed
    let vtop = vmax * (sh.boostT > 0 ? 1 + .3 * T.boost : 1) * (1 + .06 * Math.max(0, c.pitch) - .03 * Math.max(0, -c.pitch)) * (sh.stun > 0 ? .6 : 1);
    const acc = vmax / 4.2 * cls.accel * T.accel * (sh.boostT > 0 ? 2.2 * T.boost : 1);
    if (c.thrust && sh.v < vtop) sh.v += acc * (1 - clamp(sh.v / vtop, 0, 1) * .85) * dt;
    else if (sh.v > vtop) sh.v -= (sh.v - vtop) * 1.6 * dt;
    if (!c.thrust) sh.v -= (sh.v * .22 + 30) * dt;
    const ab = clamp(c.brakeL, 0, 1) + clamp(c.brakeR, 0, 1);
    sh.v -= ab * (sh.v * .55 + 140) * T.airbrake * dt;
    sh.v -= 220 * Math.min(1, T.gravity) * fr.F[2] * dt * (grounded ? 1 : 0);
    sh.v = Math.max(0, sh.v);
    // steering
    const S = 2.5 * T.steer * sh.team.handling;
    const yawRate = S * clamp(c.steer, -1, 1) + 1.15 * T.airbrake * (clamp(c.brakeR, 0, 1) - clamp(c.brakeL, 0, 1));
    const assist = Math.sign(fr.k) === Math.sign(fr.bank) ? .6 * Math.min(1, Math.abs(fr.bank) / .45) : 0;
    const keff = fr.k * (1 - assist);
    const cosp = Math.cos(sh.psi), sinp = Math.sin(sh.psi);
    const grip = 2.0 * T.grip * (grounded ? 1 : .12);
    sh.psi += (yawRate - keff * sh.v * cosp / Math.max(.5, 1 - fr.k * sh.u) - grip * sh.psi) * dt;
    sh.psi = clamp(sh.psi, -1.1, 1.1);
    // side shift on the ground, barrel roll in the air
    if (c.shiftL || c.shiftR) {
      const dir = c.shiftR ? 1 : -1;
      if (grounded) { sh.vu += dir * 760; ev.push({ t: 'shift', ship: sh }); if (sh.control === 'human') sh.drill.shift++; }
      else if (sh.rollCool <= 0 && sh.energy > 8) { sh.rollT = .7; sh.rollDir = dir; sh.rollCool = 1.2; sh.energy -= 4; sh.v += sh.vmax * .05; sh.boostT = Math.max(sh.boostT, .8); ev.push({ t: 'roll', ship: sh, ok: true }); }
    }
    sh.vu *= Math.exp(-6 * dt);
    // position along the track
    const dsr = sh.v * cosp * dt / Math.max(.5, 1 - fr.k * sh.u);
    sh.dist += dsr; sh.s = mod(sh.dist, tr.L);
    sh.u += (sh.v * sinp + sh.vu) * dt;
    // walls
    const lim = fr.w - HALF;
    if (Math.abs(sh.u) > lim) {
      const side = Math.sign(sh.u), vn = sh.v * sinp * side + sh.vu * side;
      sh.u = side * lim;
      if (vn > 30) {
        const dmg = clamp(vn / (vmax || 1), 0, 1) * 26 * T.wallDmg * (sh.shieldT > 0 ? 0 : 1);
        if (sh.wallT <= 0) { SN.Physics.damage(sh, dmg, null, 'wall', race); ev.push({ t: 'wall', ship: sh, impact: vn / vmax, side }); sh.stats.wall++; }
        sh.wallT = .25; sh.psi = -sh.psi * .35 - side * .08; sh.v *= 1 - .22 * clamp(vn / vmax, 0, 1);
      } else { sh.psi -= side * .06; }
      sh.v *= 1 - .5 * dt; sh.vu = 0; ev.push({ t: 'scrape', ship: sh, k: 1 });
    }
    sh.wallT = Math.max(0, sh.wallT - dt);
    // vertical: hover over the surface, detach on crests, fall
    const f2 = tr.frameAt(sh.s, sh._fb || (sh._fb = tr.frameAt(sh.s)));
    sh.fr = f2;
    const surfZ = f2.C[2] + f2.R[2] * sh.u + f2.U[2] * 0, G = 330 * T.gravity * (1 - .3 * Math.max(0, -c.pitch) * (sh.air ? 1 : 0));
    const tgt = surfZ + HOVER, cz = f2.C[2], zvc = sh._lastCz == null ? 0 : clamp((cz - sh._lastCz) / dt, -2600, 2600);
    const gap = tr.inGap(sh.s);
    if (gap && !sh.air) { sh.air = true; sh.zv = zvc; }
    if (sh.air) {
      sh.zv -= G * dt; sh.zv -= c.pitch * 40 * dt * (c.pitch > 0 ? 1 : .3);
      sh.z += sh.zv * dt;
      if (gap && sh.z < surfZ - 7 * U) { SN.Physics.damage(sh, 18, null, 'land', race); if (sh.alive) { sh.dist = Math.floor(sh.dist / tr.L) * tr.L + gap[0] - 14 * U; sh.s = mod(sh.dist, tr.L); sh.u = 0; sh.psi = 0; sh.v *= .5; sh.air = false; sh.zv = 0; sh.z = tr.frameAt(sh.s).C[2] + HOVER; ev.push({ t: 'fall', ship: sh }); } }
      else if (sh.z <= tgt && !gap) { const imp = -sh.zv; sh.air = false; sh.z = tgt; sh.zv = zvc; sh.v *= imp > 240 ? .93 : 1; ev.push({ t: 'land', ship: sh, impact: imp }); if (imp > 420) SN.Physics.damage(sh, clamp((imp - 420) / 30, 0, 14), null, 'land', race); }
    } else {
      const lastZv = sh.zv, newZv = zvc;
      sh.sacc = (sh.sacc || 0) + ((newZv - lastZv) / dt - (sh.sacc || 0)) * Math.min(1, dt / .06);
      if (sh.sacc < -G * .92 && sh.v > 300) { sh.air = true; sh.zv = lastZv; sh.z += lastZv * dt - .5 * G * dt * dt; if (sh.z < tgt) { sh.air = false; sh.z = tgt; sh.zv = newZv; } else ev.push({ t: 'air', ship: sh }); }
      else { sh.zv = newZv; sh.z = tgt; }
    }
    sh._lastCz = cz;
    sh.h = Math.max(0, sh.z - surfZ); sh.pitchVis = sh.air ? Math.atan2(sh.zv, Math.max(sh.v, 1)) * .5 + c.pitch * -.15 : Math.asin(clamp(f2.F[2], -.5, .5)) - c.pitch * .08;
    sh.roll = sh.rollT > 0 ? (1 - sh.rollT / .7) * Math.PI * 2 * (sh.rollDir || 1) : clamp(-(c.steer * .35 + (c.brakeR - c.brakeL) * .2), -.6, .6);
    // world position
    for (let a = 0; a < 3; a++) sh.pos[a] = f2.C[a] + f2.R[a] * sh.u + f2.U[a] * 0; sh.pos[2] = sh.z;
    // pit strip
    if (tr.inPit(sh.s, sh.u, f2.w) && !sh.air) { sh.energy = Math.min(100, sh.energy + 14 * T.pitRate * dt); if (sh.control === 'human') { sh.drill.pit += dt; } if (!sh._inPit) { sh._inPit = true; ev.push({ t: 'pit', ship: sh }); } } else sh._inPit = false;
    sh.stats.topKmh = Math.max(sh.stats.topKmh, SN.kmh(sh.v));
    if (sh.control === 'human') { if (c.steer < -.3) sh.drill.steerL += dt; if (c.steer > .3) sh.drill.steerR += dt; sh.drill.airL += c.brakeL > .3 ? dt : 0; sh.drill.airR += c.brakeR > .3 ? dt : 0; }
    // pads
    for (const p of tr.pads) {
      const ds = mod(sh.s - p.s + tr.L / 2, tr.L) - tr.L / 2;
      if (Math.abs(ds) < 28 * U / 8 + sh.v * dt && !sh.air && !(p.id in sh.padCool)) {
        const pu = p.u * (f2.w - 80);
        if (Math.abs(sh.u - pu) < 60) {
          sh.padCool[p.id] = p.kind === 'boost' ? 1.5 : 6;
          if (p.kind === 'boost') { sh.boostT = Math.max(sh.boostT, 1.8 * T.boost); sh.v = Math.min(sh.v + vmax * .25, vmax * 1.4); ev.push({ t: 'pad', ship: sh, kind: 'boost' }); if (sh.control === 'human') sh.drill.pad++; }
          else if (race.rules.weapons && !sh.weapon) { sh.weapon = SN.weaponRoll(race.rng('pickup'), sh.place, race.ships.length); sh.stats.pickups++; ev.push({ t: 'pickup', ship: sh, weapon: sh.weapon }); if (sh.control === 'human') sh.drill.pickup++; }
          else if (race.rules.weapons && sh.weapon) { ev.push({ t: 'pad', ship: sh, kind: 'full' }); if (sh.control === 'human') sh.drill.pickup++; }
        }
      }
    }
    // weapons use
    if (race.rules.weapons && sh.alive) {
      if (c.firePressed && sh.weapon) { SN.Weapons.fire(sh, race); if (sh.control === 'human') sh.drill.fire++; }
      else if (c.absorb && sh.weapon) { sh.energy = Math.min(100, sh.energy + 24); const w = sh.weapon; sh.weapon = null; ev.push({ t: 'absorb', ship: sh, weapon: w }); if (sh.control === 'human') sh.drill.absorb++; }
    }
  },
  damage(sh, dmg, by, kind, race) {
    if (!sh.alive || race.state === 'grid') return;
    if (SN.CHEATS.god && sh.control === 'human') return;
    if (sh.shieldT > 0 && kind !== 'wall') { race.events.push({ t: 'block', ship: sh }); return; }
    if (dmg <= 0) return;
    sh.energy -= dmg * (kind === 'wall' || kind === 'land' ? 1 : 1 / sh.team.shield);
    sh.lastHitBy = by;
    if (kind !== 'wall' && kind !== 'land') { race.events.push({ t: 'hit', ship: sh, by, weapon: kind, dmg }); if (by) { by.stats.hits++; if (race.mode === 'snipeout') by.score += 1; } sh.v *= .9; }
    if (sh.energy <= 0) { sh.energy = 0; SN.Physics.eliminate(sh, by, race); }
  },
  eliminate(sh, by, race) {
    sh.alive = false; sh.elimT = race.time; sh.deaths++; sh.v = 0;
    race.events.push({ t: 'elim', ship: sh, by });
    if (by && by !== sh) { by.kills++; if (race.mode === 'snipeout') by.score += 3; }
    if (race.mode === 'snipeout' || race.rules.respawn) sh.respawnAt = race.time + 3;
  },
  respawn(sh, race) {
    sh.alive = true; sh.energy = 100; sh.u = 0; sh.psi = 0; sh.v = sh.vmax * .35; sh.air = false; sh.shieldT = 2.5; sh.weapon = null; sh.boostT = 0; sh.respawnAt = 0; sh.vu = 0;
    race.events.push({ t: 'respawn', ship: sh });
  }
};

// ---- weapons ---------------------------------------------------------------------------------------------------
SN.Weapons = {
  nearestAhead(sh, race, maxM, lane) {
    const tr = race.track; let best = null, bd = maxM * U;
    for (const o of race.ships) { if (o === sh || !o.alive || o.finished) continue; const d = mod(o.dist - sh.dist, 1e9); const dd = o.dist - sh.dist; if (dd > 40 && dd < bd && (lane == null || Math.abs(o.u - sh.u) < lane)) { bd = dd; best = o; } }
    return best;
  },
  fire(sh, race) {
    const W = sh.weapon, ev = race.events, T = SN.Tune.T; if (!W) return;
    if (!SN.CHEATS.infAmmo || sh.control !== 'human') sh.weapon = null;
    ev.push({ t: 'fire', ship: sh, weapon: W });
    const P = race.projectiles;
    switch (W) {
      case 'swarm': { const tg = SN.Weapons.nearestAhead(sh, race, 220); for (let i = 0; i < 3; i++) P.push({ kind: 'swarm', owner: sh, dist: sh.dist + 60, u: sh.u + (i - 1) * 40, v: sh.v + 900, target: tg, life: 3, dmg: 3 }); break; }
      case 'seeker': { const tg = SN.Weapons.nearestAhead(sh, race, 500); P.push({ kind: 'seeker', owner: sh, dist: sh.dist + 60, u: sh.u, v: sh.v + 1300, target: tg, life: 5, dmg: 10 }); if (tg) ev.push({ t: 'lock', ship: sh, target: tg }); break; }
      case 'cannon': P.push({ kind: 'cannon', owner: sh, dist: sh.dist + 60, u: sh.u, v: sh.v + 2300, target: null, life: 2.4, dmg: 7 }); break;
      case 'mine': for (let i = 0; i < 3; i++) P.push({ kind: 'mine', owner: sh, dist: sh.dist - 60 - i * 70, u: sh.u + (i - 1) * 60, v: 0, life: 40, dmg: 9, arm: .6 }); break;
      case 'rail': { const tg = SN.Weapons.nearestAhead(sh, race, 700, 55); ev.push({ t: 'beam', ship: sh, target: tg }); if (tg) SN.Physics.damage(tg, 13 * T.weaponDmg, sh, 'rail', race); break; }
      case 'tremor': P.push({ kind: 'tremor', owner: sh, dist: sh.dist + 20, u: 0, v: sh.v + 1600, life: 1.4, dmg: 4, hit: new Set() }); break;
      case 'bulwark': sh.shieldT = 6; break;
      case 'auto': sh.autoT = 6; break;
      case 'nitro': sh.boostT = Math.max(sh.boostT, 4 * T.boost); sh.v = Math.min(sh.v + sh.vmax * .2, sh.vmax * 1.3); break;
      case 'siphon': { const tg = SN.Weapons.nearestAhead(sh, race, 400); if (tg) { const take = Math.min(tg.energy - 1, 9 * T.weaponDmg); SN.Physics.damage(tg, take, sh, 'siphon', race); sh.energy = Math.min(100, sh.energy + take * .9); ev.push({ t: 'beam', ship: sh, target: tg, kind: 'siphon' }); } break; }
    }
  },
  step(race, dt) {
    const P = race.projectiles, T = SN.Tune.T, tr = race.track;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt; if (p.kind === 'mine') p.arm = Math.max(0, p.arm - dt);
      if (p.life <= 0) { P.splice(i, 1); continue; }
      if (p.kind !== 'mine') {
        p.dist += p.v * dt;
        if (p.target && p.target.alive) { const du = p.target.u - p.u; p.u += clamp(du, -1, 1) * Math.min(Math.abs(du), 700 * dt); if (p.kind === 'seeker' && p.target.dist < p.dist - 20) p.target = null; }
        const lim = tr.frameAt(p.dist, race._tmpf).w - 20; p.u = clamp(p.u, -lim, lim);
      }
      for (const o of race.ships) {
        if (!o.alive || o === p.owner && p.kind !== 'mine' || (o.finished && race.mode === 'race')) continue;
        if (p.kind === 'mine' && p.arm > 0) continue;
        const dd = Math.abs(o.dist - p.dist), du = Math.abs(o.u - p.u);
        if (p.kind === 'tremor') { if (dd < 600 && !p.hit.has(o) && !o.air) { p.hit.add(o); SN.Physics.damage(o, p.dmg * T.weaponDmg, p.owner, 'tremor', race); o.stun = 1.2; o.psi += (race.rng('fx')() - .5) * .5; } continue; }
        if (dd < 70 && du < 55) { SN.Physics.damage(o, p.dmg * T.weaponDmg, p.owner, p.kind, race); race.events.push({ t: 'blast', kind: p.kind, dist: p.dist, u: p.u }); P.splice(i, 1); break; }
      }
    }
  }
};

// ---- AI --------------------------------------------------------------------------------------------------------
SN.AI = {
  controls(sh, race, auto) {
    const T = SN.Tune.T, tr = race.track, c = sh.ctl = sh.ctl || neutral(), skill = (auto ? 1 : sh.pilot.skill) * T.aiSkill;
    const fr = tr.frameAt(sh.s, sh._aif || (sh._aif = undefined)); sh._aif = fr;
    const look = Math.max(120, sh.v * .18);
    const kA = tr.curvAhead(sh.s, look * 1.2);
    // lateral target: racing line, nudged around slower craft just ahead
    let ut = tr.frameAt(sh.s + look, race._tmpf).line * .85 + (sh.seat != null ? 0 : (sh.idx % 3 - 1) * 24);
    for (const o of race.ships) { if (o === sh || !o.alive) continue; const dd = o.dist - sh.dist; if (dd > 0 && dd < 380 && Math.abs(o.u - sh.u) < 60) ut += (sh.u >= o.u ? 1 : -1) * 90; }
    const lim = fr.w - 60;
    if (!auto && sh.energy < 60 && race.mode !== 'overclock') { const ds = mod(tr.pit.s0 - sh.s, tr.L); if (ds < 520 * U || sh.s > tr.pit.s0 && sh.s < tr.pit.s1) ut = fr.w * .62; }
    ut = clamp(ut, -lim, lim);
    const psiT = clamp((ut - sh.u) * .012, -.38, .38);
    let steerFF = fr.k * sh.v / (2.5 * sh.team.handling * T.steer) * (1 - .6 * Math.min(1, Math.abs(fr.bank) / .45));
    c.steer = clamp(steerFF + (psiT - sh.psi) * 2.2, -1, 1);
    // speed control: lookahead target from the track's speed profile
    let vt = Infinity; for (let d = 0; d < sh.v * .9 + 200; d += 80) vt = Math.min(vt, tr.speedLine(sh.s, d));
    vt *= .94 * skill; const over = sh.v - vt;
    c.thrust = over < 0 || sh.v < sh.vmax * .35 ? 1 : 0;
    c.brakeL = c.brakeR = 0;
    if (over > 50) { const b = clamp(over / 500, 0, .8); if (kA >= 0) c.brakeR = b; else c.brakeL = b; }
    c.pitch = 0; c.firePressed = false; c.absorb = false; c.shiftL = c.shiftR = false;
    if (!auto && race.rules.weapons && sh.weapon && sh.alive) {
      sh._fireT = (sh._fireT || 0) - 1 / 120;
      if (sh._fireT <= 0) {
        const rr = race.rng('aifire' + sh.idx); sh._fireT = (5 + rr() * 8) / Math.max(.2, T.aiAggro * (.5 + sh.pilot.aggr));
        const tg = SN.Weapons.nearestAhead(sh, race, 300, 80), w = sh.weapon;
        const def = w === 'bulwark' || w === 'nitro' || w === 'auto';
        if ((tg || def || w === 'mine' || w === 'tremor' && race.ships.some(o => o !== sh && Math.abs(o.dist - sh.dist) < 400)) && T.aiAggro > 0) c.firePressed = true;
        else if (race.rng('aiabs' + sh.idx)() < .3 && sh.energy < 65) c.absorb = true;
      }
    }
    return c;
  }
};

// ---- race ------------------------------------------------------------------------------------------------------
class Race {
  constructor(o) {
    this.track = o.track; this.mode = o.mode || 'race'; this.cls = o.cls || 'flare'; this.laps = o.laps || 3; this.seed = o.seed != null ? o.seed : 1;
    this.rules = Object.assign({ weapons: true, respawn: false, countdown: 3, timeLimit: 0, ai: true }, o.rules || {});
    this.rngs = {}; this.time = 0; this.t = 0; this.state = 'grid'; this.countdown = this.rules.countdown; this.events = []; this.projectiles = []; this.zone = 0; this.zoneT = 0; this.score = 0; this.over = false; this.ghosts = [];
    this._tmpf = this.track.frameAt(0); this.drillIdx = 0; this.drillDone = [];
    if (this.mode === 'snipeout') { this.rules.timeLimit = this.rules.timeLimit || 180; this.rules.respawn = true; this.laps = 99; }
    if (this.mode === 'overclock') { this.rules.weapons = false; this.laps = 999; this.rules.ai = false; }
    if (this.mode === 'time') { this.rules.weapons = false; this.rules.ai = false; }
    if (this.mode === 'academy') { this.rules.ai = false; this.laps = 2; }
    this.ships = [];
    const ents = o.entrants; const n = ents.length;
    ents.forEach((e, i) => { const sh = new Ship(this, i, e); sh.inputFn = e.input || null; this.ships.push(sh); });
    // grid: two abreast, slots from the back of the starting straight
    this.ships.forEach((sh, i) => { const row = Math.floor(i / 2), col = i % 2; sh.dist = -(70 + row * 110) * U / 8 * 1; sh.dist = -(8 + row * 12) * U; sh.s = mod(sh.dist, this.track.L); sh.u = (col ? 1 : -1) * 70; sh.v = 0; const f = this.track.frameAt(sh.s); sh.z = f.C[2] + f.R[2] * sh.u + HOVER; sh.place = i + 1; sh.pos = [f.C[0] + f.R[0] * sh.u, f.C[1] + f.R[1] * sh.u, sh.z]; });
    this.humans = this.ships.filter(s => s.control === 'human'); this.human = this.humans[0] || null;
    this.finishOrder = [];
  }
  rng(name) { return this.rngs[name] || (this.rngs[name] = SN.rng(this.seed ^ SN.hashStr(name))); }
  rubber(sh) {
    if (sh.control === 'human' || !this.human || this.mode === 'snipeout') return 1;
    const T = SN.Tune.T, d = (this.human.dist - sh.dist) / U; // metres the human is ahead
    return 1 + clamp(d / 1200, -.04, .06) * T.rubber;
  }
  step(dt) {
    this.events.length = 0; const ev = this.events;
    if (this.over) return;
    const T = SN.Tune.T;
    // controls
    for (const sh of this.ships) {
      let c;
      if (sh.control === 'human') c = sh.inputFn ? sh.inputFn(sh) : sh.ctl; else if (sh.control === 'ai') c = SN.CHEATS.noAI ? neutral() : SN.AI.controls(sh, this); else c = neutral();
      sh.ctl = c;
    }
    if (this.state === 'grid') {
      const prev = Math.ceil(this.countdown); this.countdown -= dt; if (Math.ceil(this.countdown) !== prev && this.countdown > 0) ev.push({ t: 'count', n: Math.ceil(this.countdown) });
      for (const sh of this.ships) { if (sh.ctl.thrust) sh.launch = Math.min(1, sh.launch + dt); else sh.launch = Math.max(0, sh.launch - dt * 2); sh.pos[2] = sh.z; }
      if (this.countdown <= 0) {
        this.state = 'racing'; ev.push({ t: 'go' });
        for (const sh of this.ships) { const good = sh.launch > .35 && sh.launch < .75 && sh.ctl.thrust; if (good || sh.control !== 'human' && this.rng('launch')() < .6) { sh.boostT = 1.4; sh.v = sh.vmax * .3; if (sh.control === 'human') ev.push({ t: 'launch', ship: sh }); } else if (sh.control === 'human' && sh.launch >= .75) { sh.stun = 1; ev.push({ t: 'stall', ship: sh }); } }
      }
      this.t = 0; return;
    }
    this.t += dt; this.time += dt;
    for (const sh of this.ships) {
      if (sh.finished && this.mode === 'race') { sh.ctl = SN.AI.controls(sh, this, true); sh.ctl.thrust = 1; }
      SN.Physics.step(sh, sh.ctl, dt, this);
      if (!sh.alive && sh.respawnAt && this.time >= sh.respawnAt) SN.Physics.respawn(sh, this);
    }
    SN.Weapons.step(this, dt);
    this.collide();
    this.progress(dt);
    // places
    this.rank();
    for (const sh of this.ships) if (sh.stats) { sh.drill.lap = sh.lap; }
    // mode rules
    if (this.mode === 'overclock') {
      this.zoneT += dt * T.zoneRamp; if (this.zoneT >= 15) { this.zoneT = 0; this.zone++; ev.push({ t: 'zone', n: this.zone }); }
      if (this.human && this.human.alive) { this.score = Math.round(this.human.dist / U / 10) + this.zone * 100; this.human.energy = Math.min(100, this.human.energy + 0 - 1.2 * dt); if (this.human.energy <= 0) SN.Physics.eliminate(this.human, null, this); }
    }
    if (this.mode === 'academy' && this.human) {
      const d = SN.DRILLS[this.drillIdx];
      if (d && d.check(this, { v: this.human.v, d: this.human.drill, lap: this.human.lap })) { ev.push({ t: 'drill', id: d.id, ok: true }); this.drillDone.push(d.id); this.drillIdx++; for (const k in this.human.drill) if (k !== 'lap') this.human.drill[k] = 0; if (this.drillIdx >= SN.DRILLS.length) this.finish(); }
    }
    if (this.mode === 'overclock' && this.rules.zoneGoal && this.zone >= this.rules.zoneGoal) this.finish();
    if (this.rules.timeLimit && this.time >= this.rules.timeLimit) this.finish();
    if (this.mode === 'snipeout' && this.human && this.human.score >= (this.rules.scoreGoal || 999)) this.finish();
    if (this.humans.length && this.humans.every(h => !h.alive && !h.respawnAt) && (this.mode === 'overclock' || this.mode === 'race' || this.mode === 'time' || this.mode === 'academy')) { this.finish(); }
    if (this.mode === 'race' || this.mode === 'time') { if (this.humans.length ? this.humans.every(h => h.finished || (!h.alive && !h.respawnAt)) : this.ships.every(s => s.finished || !s.alive)) { this.endT = (this.endT || 0) + dt; if (this.endT > 0) this.finish(); } }
  }
  progress(dt) {
    for (const sh of this.ships) {
      if (!sh.alive || sh.finished) continue;
      const lap = Math.max(1, Math.floor(sh.dist / this.track.L) + 1);
      if (this.mode !== 'snipeout' && this.mode !== 'overclock' && sh.dist >= this.laps * this.track.L) {
        sh.finished = true; sh.finishTime = this.time * 1000; const lt = (this.time - sh.lapStart) * 1000; sh.lapTimes.push(lt);
        this.finishOrder.push(sh); sh.finalPlace = this.finishOrder.length; this.events.push({ t: 'lap', ship: sh, lap: this.laps, time: lt }); this.events.push({ t: 'finish', ship: sh, place: sh.finalPlace, time: sh.finishTime });
      } else if (lap > sh.lap) { const lt = (this.time - sh.lapStart) * 1000; sh.lapStart = this.time; sh.lapTimes.push(lt); sh.lap = lap; this.events.push({ t: 'lap', ship: sh, lap: lap - 1, time: lt }); }
    }
  }
  collide() {
    const S = this.ships, L = this.track.L;
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j]; if (!a.alive || !b.alive || a.air !== b.air) continue;
      const dd = a.dist - b.dist; if (Math.abs(dd) > 130) continue; const du = a.u - b.u;
      if (Math.abs(du) < 56 && Math.abs(dd) < 100) {
        const push = (56 - Math.abs(du)) * .5 * (du >= 0 ? 1 : -1); a.u += push; b.u -= push;
        const rel = Math.abs(a.v - b.v);
        if (dd > 0) { a.v += rel * .05; b.v -= rel * .08; } else { b.v += rel * .05; a.v -= rel * .08; }
        if (!a._bump || this.time - a._bump > .3) { a._bump = this.time; this.events.push({ t: 'bump', ship: a, other: b }); if (a.control === 'human' || b.control === 'human') SN.Physics.damage(a.control === 'human' ? a : b, 1.5, null, 'wall', this); }
      }
    }
  }
  rank() {
    const order = this.ships.slice().sort((a, b) => (a.finished && b.finished) ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : this.mode === 'snipeout' ? b.score - a.score || b.dist - a.dist : b.dist - a.dist);
    order.forEach((s, i) => s.place = i + 1);
  }
  finish() {
    if (this.over) return; this.over = true; this.state = 'over'; this.events.push({ t: 'over' });
    // the rest of the field is classified at its current pace
    if (this.mode === 'race' && this.humans.some(h => h.finished)) for (const s of this.ships) if (!s.finished && s.alive) { s.finished = true; s.est = true; s.finishTime = this.time * 1000 + (this.laps * this.track.L - s.dist) / Math.max(s.v, 700) * 1000; }
    this.rank();
  }
  results() {
    const order = this.ships.slice().sort((a, b) => a.place - b.place);
    return order.map(s => ({ name: s.name, team: s.team.id, color: s.color, place: s.place, time: s.finishTime, score: s.score, kills: s.kills, finished: s.finished, best: s.lapTimes.length ? Math.min(...s.lapTimes) : null, human: s.control === 'human' }));
  }
  hash() { let h = 2166136261; const buf = new Float32Array(1), u32 = new Uint32Array(buf.buffer); const mix = x => { buf[0] = x; h ^= u32[0]; h = Math.imul(h, 16777619); }; for (const s of this.ships) { mix(s.dist); mix(s.u); mix(s.z); mix(s.v); mix(s.energy); } return h >>> 0; }
}
SN.Race = Race;

// make the full entrant list for a race
SN.makeEntrants = (o) => {
  const rnd = SN.rng(o.seed || 7), pilots = SN.PILOTS.slice().sort(() => rnd() - .5), n = o.count || 8, out = [];
  const playerTeam = SN.TEAMS[o.team || 'kestrel'];
  const used = new Set();
  const humans = o.humans || [{ name: o.name || 'YOU', team: playerTeam.id, color: null }];
  // humans take the back of the grid (like a session) unless told otherwise
  const aiCount = o.ai === false ? 0 : n - humans.length;
  const ai = pilots.filter(p => p.team !== playerTeam.id || true).slice(0, aiCount);
  ai.forEach(p => out.push({ pilot: p, team: p.team, control: 'ai', name: p.name }));
  humans.forEach((h, i) => out.push({ pilot: { id: 'human' + i, name: h.name, team: h.team, skill: 1, aggr: 0 }, team: h.team, control: h.control || 'human', name: h.name, color: h.color, seat: h.seat }));
  if (o.humanFirst) { const hs = out.filter(e => e.control === 'human'); return hs.concat(out.filter(e => e.control !== 'human')); }
  return out;
};
})();
