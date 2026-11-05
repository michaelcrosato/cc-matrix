// SNIPEOUT HD: weapons. Pickups rolled by position, the ten weapons, absorb, lock-on, projectiles and mines in track
// space (they follow the track through curves), beams, the tremor wave, and the effects on craft. Every hit goes
// through SN.Ship.damage and pushes a 'hit' event.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const W = SN.WEAPONS;

class Weapons {
  constructor(race) { this.race = race; this.shots = []; this.mines = []; this.waves = []; this.beams = []; this.rng = race.rng('pickup'); this.forceI = 0; this.nextId = 1; }
  get T() { return SN.Tune.T; }
  /** the weapon a pad gives this craft: the table for its position, sharpened or flattened by pickupLuck */
  roll(ship) {
    const R = this.race, rules = R.rules;
    if (rules.forcePickup) { const f = rules.forcePickup(ship, this); if (f) return f; }
    const n = R.ships.length, pos = ship.place || n;
    const tab = rules.table ? SN.PICKUP_TABLES[rules.table] : SN.PICKUP_TABLES[pos <= 2 ? 'front' : pos <= Math.max(3, Math.round(n * .62)) ? 'mid' : 'back'];
    const luck = this.T.pickupLuck, w = tab.map(x => x <= 0 && luck > 0 ? 0 : luck <= 1 ? 1 + (x - 1) * luck : Math.pow(x, luck));
    if (rules.noAutopilot) w[7] = 0;
    return SN.WEAPON_ORDER[SN.weighted(this.rng, w)];
  }
  give(ship, id, fromPad = false) {
    if (!id || !W[id]) return;
    ship.weapon = id; ship.ammo = id === 'cannon' ? 24 : id === 'mine' ? 5 : 1; ship.charge = 0; ship.lockT = 0; ship.lockTarget = null; ship.stats.pickups++;
    this.race.events.push({ t: 'pickup', ship, weapon: id, pad: fromPad });
  }
  /** a craft's weapon controls this step (fire held / pressed / released, absorb) */
  use(ship, c, dt) {
    const R = this.race; if (ship.elim || ship.rescue) return;
    const id = ship.weapon;
    if (ship.siphon) this._siphonStep(ship, dt);
    if (!id) return;
    if (ship.control === 'ai' && SN.cheats.aiWeaponsOff) return;
    if (c.absorb && !ship._firing) { this.absorb(ship); return; }
    const ahead = this.targetAhead(ship, 3000, 25);
    if (id === 'seeker') {
      if (ahead) { if (ship.lockTarget !== ahead.ship) { ship.lockTarget = ahead.ship; ship.lockT = 0; } ship.lockT += dt; if (ship.lockT >= .6 && !ship._lockSent) { ship._lockSent = true; R.events.push({ t: 'lock', ship, target: ahead.ship }); } ahead.ship.lockedBy = { ship, t: R.t, full: ship.lockT >= .6 }; }
      else { ship.lockT = 0; ship.lockTarget = null; ship._lockSent = false; }
      if (c.firePressed) this.fire(ship, 'seeker', ship.lockT >= .6 ? ship.lockTarget : null);
      return;
    }
    if (id === 'cannon') {
      if (c.fire) { ship._firing = true; ship._cannonT = (ship._cannonT || 0) - dt; if (ship._cannonT <= 0) { ship._cannonT += 1 / 12; this.fire(ship, 'cannon'); } }
      else { ship._firing = false; ship._cannonT = 0; }
      return;
    }
    if (id === 'rail') {
      if (c.fire) { ship._firing = true; ship.charge = Math.min(.8, ship.charge + dt); const aim = this.railAim(ship); if (aim) aim.railWarn = R.t; }
      else if (ship.charge > 0) { ship._firing = false; if (ship.charge >= .3) this.fire(ship, 'rail'); ship.charge = 0; }
      return;
    }
    if (id === 'mine' && ship._mineDrop) return;
    if (c.firePressed) this.fire(ship, id);
  }
  absorb(ship) {
    const id = ship.weapon; if (!id) return;
    const gain = W[id].absorb * this.T.absorbMul;
    ship.energy = Math.min(100, ship.energy + gain); ship.weapon = null; ship.ammo = 0; ship.charge = 0; ship.stats.absorbs++;
    this.race.events.push({ t: 'absorb', ship, weapon: id, gain });
  }
  _spent(ship, id) {
    ship.ammo--; if (ship.ammo > 0) return;
    ship.weapon = null; ship.charge = 0; ship.lockT = 0; ship.lockTarget = null; ship._lockSent = false; ship._firing = false;
    if (SN.cheats.infiniteWeapon && ship.control === 'human') this.give(ship, id);
  }
  fire(ship, id, target) {
    const R = this.race, Tr = R.track, v = ship.speed, ev = R.events, T = this.T;
    const base = { owner: ship, s: ship.s + 60, u: ship.u, h: Math.max(10, Math.min(40, ship.h)), id: this.nextId++ };
    ship.stats.fired++;
    switch (id) {
      case 'swarm':
        for (const k of [-1, 0, 1]) this.shots.push(Object.assign({}, base, { kind: 'swarm', u: ship.u + k * 1.5 * U, vs: v + 2400, vu: k * 120, life: 1.4, dmg: 10, id: this.nextId++ }));
        this._spent(ship, id); break;
      case 'seeker':
        this.shots.push(Object.assign(base, { kind: 'seeker', vs: v + 2000, vu: 0, life: 4, dmg: 24, target: target || null }));
        ship.lockT = 0; this._spent(ship, id); break;
      case 'mine': {
        ship._mineDrop = true; let k = 0;
        const drop = () => { if (ship.elim || ship.rescue) { ship._mineDrop = false; return; } this.mines.push({ kind: 'mine', owner: ship, s: (ship.s - 60 + Tr.L) % Tr.L, u: ship.u, h: 8, armT: .3, life: 30, dmg: 9, id: this.nextId++ }); ev.push({ t: 'mine', ship }); if (++k < 5) R.later(.12, drop); else { ship._mineDrop = false; ship.ammo = 1; this._spent(ship, id); } };
        drop(); break;
      }
      case 'cannon': {
        const jit = (this.rng() - .5) * U, tgt = this.targetAhead(ship, 2400, 8);
        const vu = tgt && Math.abs(tgt.du) < 1.5 * U * 2 ? E.clamp(tgt.du / Math.max(.05, tgt.ds / (v + 4200)), -400, 400) : 0;
        this.shots.push(Object.assign(base, { kind: 'cannon', u: ship.u + jit, vs: v + 4200, vu, life: .9, dmg: 1.25 }));
        this._spent(ship, id); break;
      }
      case 'rail': {
        const full = ship.charge >= .79, k = .6 + .4 * Math.min(1, ship.charge / .8), hit = this.railTrace(ship, full);
        const len = hit ? hit.ds : 4000;
        this.beams.push({ kind: 'rail', owner: ship, s: ship.s, u: ship.u, len, u1: hit ? hit.ship.u : ship.u + 4000 * this._aimTan(ship), t: 0, dur: .45 });
        if (hit) this.hit(hit.ship, ship, 'rail', 34 * k, { jolt: .82, stagger: .45 });
        ship.charge = 0; this._spent(ship, id); break;
      }
      case 'tremor':
        this.waves.push({ kind: 'tremor', owner: ship, s: ship.s, vs: v + 1800, life: 1.3, hitSet: new Set([ship]), id: this.nextId++ });
        this._spent(ship, id); break;
      case 'bulwark': ship.shieldT = 4; ev.push({ t: 'bulwark', ship, on: true }); this._spent(ship, id); break;
      case 'autopilot': ship.autoT = 5; ev.push({ t: 'autopilot', ship, on: true }); this._spent(ship, id); break;
      case 'nitro': ship.boostT = Math.max(ship.boostT, 2.2); ship.boostMul = Math.max(ship.boostMul, 1.35); ship.thrK = 2 / 1.8 * 1.25; ev.push({ t: 'nitro', ship }); this._spent(ship, id); break;
      case 'siphon': {
        const tg = this.nearestAhead(ship, 1500);
        ship.siphon = { target: tg ? tg.ship : null, t: 3 };
        this._spent(ship, id); break;
      }
    }
    ev.push({ t: 'fire', ship, weapon: id });
  }
  _aimTan(ship) { const fr = this.race.track.frameAt(ship.s, this._fr || (this._fr = undefined)); const a = Math.atan2(V.dot(ship.F, fr.R), V.dot(ship.F, fr.F)); return Math.tan(E.clamp(a, -.5, .5)); }
  /** the first craft along the railshot's line ahead (within 4000 u and +-32 u of the aim line; +16 u fully charged) */
  railTrace(ship, full) {
    const tn = this._aimTan(ship), tol = 32 + (full ? 16 : 0); let best = null;
    for (const o of this.race.ships) {
      if (o === ship || !this.targetable(o, ship)) continue;
      const ds = this.race.track.dS(ship.s, o.s); if (ds <= 0 || ds > 4000) continue;
      const ua = ship.u + ds * tn; if (Math.abs(o.u - ua) > tol || Math.abs(o.h - ship.h) > 80) continue;
      if (!best || ds < best.ds) best = { ship: o, ds };
    }
    return best;
  }
  railAim(ship) { const h = this.railTrace(ship, true); return h ? h.ship : null; }
  targetable(o, by) { return !o.elim && !o.rescue && !o.ghost && !o.hidden && !(o.finished && !this.race.rules.respawn) && o !== by; }
  /** the nearest craft ahead within range and a cone (degrees) of the track ahead: { ship, ds, du } */
  targetAhead(ship, range, coneDeg) {
    const tn = Math.tan(coneDeg * Math.PI / 180); let best = null;
    for (const o of this.race.ships) {
      if (!this.targetable(o, ship)) continue;
      const ds = this.race.track.dS(ship.s, o.s); if (ds <= 30 || ds > range) continue;
      const du = o.u - ship.u; if (Math.abs(du) > ds * tn + 40) continue;
      if (!best || ds < best.ds) best = { ship: o, ds, du };
    }
    return best;
  }
  nearestAhead(ship, range) { let best = null; for (const o of this.race.ships) { if (!this.targetable(o, ship)) continue; const ds = this.race.track.dS(ship.s, o.s); if (ds > 0 && ds < range && (!best || ds < best.ds)) best = { ship: o, ds }; } return best; }
  /** a weapon hit: damage (x weaponDamageMul), a jolt (speed x), a stagger (seconds), a pop up */
  hit(target, by, weapon, dmg, o = {}) {
    const R = this.race;
    if (target.shieldT > 0) { R.events.push({ t: 'blocked', ship: target, by, weapon }); return 0; }
    const was = target.energy;
    const d = SN.Ship.damage(target, dmg * this.T.weaponDamageMul, weapon, by, R);
    if (target.invT > 0 && !d) return 0;
    if (o.jolt) V.scale(target.V, target.V, o.jolt);
    if (o.stagger) target.stagger = Math.max(target.stagger, o.stagger);
    if (o.pop) V.addS(target.V, target.V, target.U, o.pop);
    if (by && by !== target) { by.stats.hits++; if (R.rules.onHit) R.rules.onHit(R, by, target, weapon); }
    R.events.push({ t: 'hit', ship: target, by, weapon, dmg: d, was, x: target.P[0], y: target.P[1], z: target.P[2] });
    return d;
  }
  _siphonStep(ship, dt) {
    const S = ship.siphon; S.t -= dt;
    const tg = S.target;
    if (S.t <= 0 || !tg || !this.targetable(tg, ship) || Math.abs(this.race.track.dS(ship.s, tg.s)) > 1900) { ship.siphon = null; return; }
    if (tg.shieldT > 0) return;
    const k = Math.min(tg.energy, 9 * dt * this.T.weaponDamageMul);
    if (k > 0) {
      SN.Ship.damage(tg, k / tg.st.dmgMul, 'siphon', ship, this.race); ship.energy = Math.min(100, ship.energy + k);
      S.acc = (S.acc || 0) + k; if (S.acc > 6) { S.acc = 0; this.race.events.push({ t: 'hit', ship: tg, by: ship, weapon: 'siphon', dmg: 6, x: tg.P[0], y: tg.P[1], z: tg.P[2], soft: true }); if (ship !== tg) ship.stats.hits++; }
    }
  }
  /** everything in flight: shots, mines, waves, beams */
  step(dt) {
    const R = this.race, Tr = R.track, ships = R.ships;
    for (const p of this.shots) {
      p.life -= dt; if (p.life <= 0) { p.dead = true; continue; }
      if (p.kind === 'seeker' && p.target && this.targetable(p.target, p.owner)) {
        const tg = p.target, ds = Tr.dS(p.s, tg.s);
        p.vu = E.clamp((tg.u - p.u) * 6, -900, 900); p.vs = Math.max(p.vs, tg.speed + 900); if (ds < -80) p.target = null;
        p.h += (tg.h - p.h) * Math.min(1, dt * 6);
      }
      p.s = (p.s + p.vs * dt) % Tr.L; p.u += p.vu * dt;
      const fr = Tr.frameAt(p.s, p._fr || (p._fr = undefined)); p._fr = fr;
      if (Math.abs(p.u) > fr.hw && !(fr.flags & SN.TFLAG.GAP)) { p.dead = true; R.events.push({ t: 'shotwall', kind: p.kind, s: p.s, u: Math.sign(p.u) * fr.hw, h: p.h }); continue; }
      for (const o of ships) {
        if (o === p.owner || !this.targetable(o, p.owner)) continue;
        if (Math.abs(Tr.dS(p.s, o.s)) < 40 && Math.abs(o.u - p.u) < 34 && Math.abs(o.h - p.h) < 40) {
          p.dead = true;
          if (p.kind === 'swarm') this.hit(o, p.owner, 'swarm', p.dmg, { jolt: .9, stagger: .2 });
          else if (p.kind === 'seeker') this.hit(o, p.owner, 'seeker', p.dmg, { jolt: .8, stagger: .5 });
          else this.hit(o, p.owner, 'cannon', p.dmg, { jolt: .985 });
          break;
        }
      }
    }
    for (const m of this.mines) {
      m.life -= dt; m.armT -= dt; if (m.life <= 0) { m.dead = true; continue; }
      if (m.armT > 0) continue;
      for (const o of ships) {
        if (!this.targetable(o, null) || o === m.owner && m.armT > -1) continue;
        if (Math.abs(Tr.dS(m.s, o.s)) < 40 && Math.abs(o.u - m.u) < 40 && o.h < 60) { m.dead = true; this.hit(o, m.owner === o ? null : m.owner, 'mine', m.dmg, { jolt: .88, stagger: .25 }); R.events.push({ t: 'boom', s: m.s, u: m.u, kind: 'mine' }); break; }
      }
    }
    for (const w of this.waves) {
      w.life -= dt; if (w.life <= 0) { w.dead = true; continue; }
      const s0 = w.s; w.s = (w.s + w.vs * dt) % Tr.L;
      for (const o of ships) {
        if (w.hitSet.has(o) || !this.targetable(o, w.owner)) continue;
        const a = Tr.dS(s0 - 60, o.s), b = Tr.dS(o.s, w.s + 60);
        if (a >= 0 && b >= 0) { w.hitSet.add(o); if (o.grounded) this.hit(o, w.owner, 'tremor', 15, { stagger: .4, pop: 450 }); else R.events.push({ t: 'dodge', ship: o, by: w.owner }); }
      }
    }
    for (const b of this.beams) { b.t += dt; if (b.t > b.dur) b.dead = true; }
    for (const s of ships) { if (s.shieldT > 0) { s.shieldT -= dt; if (s.shieldT <= 0) { s.shieldT = 0; R.events.push({ t: 'bulwark', ship: s, on: false }); } } if (s.autoT > 0) { s.autoT -= dt; if (s.autoT <= 0) { s.autoT = 0; R.events.push({ t: 'autopilot', ship: s, on: false }); } } }
    if (this.shots.some(p => p.dead)) this.shots = this.shots.filter(p => !p.dead);
    if (this.mines.some(p => p.dead)) this.mines = this.mines.filter(p => !p.dead);
    if (this.waves.some(p => p.dead)) this.waves = this.waves.filter(p => !p.dead);
    if (this.beams.some(p => p.dead)) this.beams = this.beams.filter(p => !p.dead);
  }
  hashList(list) { for (const p of this.shots) list.push(p.s, p.u); for (const m of this.mines) list.push(m.s, m.u); return list; }
}
SN.Weapons = Weapons;
})();
