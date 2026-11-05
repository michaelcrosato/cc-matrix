// Weapons and pickups (§3.4): projectiles, mines, waves and beams live in track space (s along, u across) and hug the
// track the way the source's do; every hit goes through SN.Ship.damage
(() => {
const SN = globalThis.SN, V = SN.V;
const IDS = SN.WEAPONS.map(w => w.id);

class Weapons {
  constructor(race) {
    this.race = race; this.proj = []; this.mines = []; this.waves = []; this.beams = []; this.siphons = []; this.forced = null; this.forcedI = 0; this.rng = race.rng('pickup');
  }
  /** a weapon pad under a craft: roll a weapon, weighted by its position */
  pickup(sh, pad) {
    const R = this.race;
    if (sh.weapon || sh.shieldT > 0 || sh.autoT > 0 || sh.elim) return;
    let id;
    if (this.forced) id = this.forced[this.forcedI++ % this.forced.length];
    else if (sh.control === 'human' && R.cheats.giveWeapon) id = R.cheats.giveWeapon;
    else {
      const tab = SN.PICKUP_TABLE[R.mode === 'snipeout' ? 'snipeout' : sh.place <= 2 ? 'front' : sh.place <= 5 ? 'mid' : 'back'], luck = SN.Tune.T.pickupLuck;
      const wts = tab.map(w => w > 0 ? Math.pow(w, luck) : (luck < .5 ? .5 : 0));
      if (R.mode === 'snipeout' || R.hub) wts[7] = 0;   // no AUTOPILOT where points or ghosts count
      const tot = wts.reduce((a, b) => a + b, 0); let x = this.rng() * tot, k = 0; for (; k < wts.length - 1; k++) { x -= wts[k]; if (x < 0) break; }
      id = IDS[k];
    }
    this.give(sh, id);
    R.emit({ t: 'pickup', ship: sh, weapon: id, pad: pad && pad.id });
  }
  give(sh, id) { sh.weapon = id; sh.ammo = id === 'cannon' ? 24 : id === 'mine' ? 5 : 1; sh.charge = 0; sh.lockT = 0; sh.lockOn = null; sh.pickT = .5; }
  /** the craft ahead nearest the line of fire, within range (u) and lateral tolerance (du) */
  targetAhead(sh, range, du) {
    const T = this.race.track; let best = null, bd = 1e9;
    for (const o of this.race.ships) { if (o === sh || o.elim || o.ghost || o.rescueT > 0) continue; const ds = SN.wrapDiff(sh.s, o.s, T.L); if (ds > 30 && ds < range && Math.abs(o.u - sh.u) < du + ds * .05 && ds < bd) { bd = ds; best = o; } }
    return best;
  }
  /** the heading of a craft relative to the track (radians, + = pointing right) */
  heading(sh) { const f = this.race.track.frameAt(sh.s); return Math.atan2(V.dot(sh.F, f.R), V.dot(sh.F, f.F)); }
  railTarget(sh, tol = 32) {
    const T = this.race.track, th = Math.tan(Math.max(-.5, Math.min(.5, this.heading(sh)))); let best = null, bd = 1e9;
    for (const o of this.race.ships) { if (o === sh || o.elim || o.ghost || o.rescueT > 0) continue; const ds = SN.wrapDiff(sh.s, o.s, T.L); if (ds < 20 || ds > 4000) continue; const ua = sh.u + ds * th; if (Math.abs(o.u - ua) < tol + ds * .025 && ds < bd) { bd = ds; best = o; } }
    return best;
  }
  lockedOn(sh) { return this.race.ships.some(o => o !== sh && o.weapon === 'seeker' && o.lockOn === sh && o.lockT > .2) || this.proj.some(p => p.target === sh); }
  /** one craft's weapon controls for this step */
  use(sh, c) {
    const R = this.race, w = sh.weapon, dt = SN.DT;
    if (sh.pickT > 0) sh.pickT -= dt;
    // effects running
    if (sh.autoT > 0) { sh.autoT -= dt; if (sh.autoT <= 0) R.emit({ t: 'autoOff', ship: sh }); }
    if (sh.siphonT > 0) {
      sh.siphonT -= dt; const tg = sh.siphonTo, ds = tg ? SN.wrapDiff(sh.s, tg.s, R.track.L) : 0;
      if (!tg || tg.elim || ds < -200 || ds > 1900) { sh.siphonT = 0; sh.siphonTo = null; }
      else { const got = SN.Ship.damage(tg, 9 * dt * SN.Tune.T.weaponDamageMul / tg.st.dmgMul, 'siphon', sh, R); sh.energy = Math.min(100, sh.energy + got); }
    }
    if (sh.mineQueue > 0) { sh.mineCD -= dt; if (sh.mineCD <= 0) { sh.mineCD = .12; sh.mineQueue--; this.mines.push({ s: SN.wrap(sh.s - 60, R.track.L), u: sh.u, owner: sh, arm: .3, life: 30, armed: false, spin: 0 }); R.emit({ t: 'mineDrop', ship: sh }); } }
    if (sh.cannonN > 0) { sh.cannonT -= dt; if (sh.cannonT <= 0) { sh.cannonT = 1 / 12; sh.cannonN--; this.bolt(sh); } }
    if (!w || sh.elim || R.state !== 'racing' && !(R.state === 'finished' && R.mode === 'snipeout') || sh.rescueT > 0) { sh.charge = 0; return; }
    if (sh.finished && R.mode !== 'snipeout') return;
    if (c.absorb && sh.pickT <= 0) {
      const amt = SN.WEAPON[w].absorb * SN.Tune.T.absorbMul; sh.energy = Math.min(100, sh.energy + amt); sh.weapon = null; sh.charge = 0; sh.stats.absorbs++;
      R.emit({ t: 'absorb', ship: sh, weapon: w, amount: amt }); return;
    }
    // seeker lock
    if (w === 'seeker') {
      const tg = this.targetAhead(sh, 3000, 420);
      if (tg && tg === sh.lockOn) { const was = sh.lockT; sh.lockT += dt; if (was < .6 && sh.lockT >= .6) R.emit({ t: 'lock', ship: sh, target: tg }); }
      else { sh.lockOn = tg; sh.lockT = 0; }
    }
    if (sh.pickT > 0) return;
    const pressed = c.firePressed, held = c.fire;
    const done = () => { if (sh.control === 'human' && R.cheats.infiniteWeapon) { this.give(sh, w); sh.pickT = 0; } else sh.weapon = null; };
    switch (w) {
      case 'swarm': if (pressed) { for (const k of [-1, 0, 1]) this.proj.push({ kind: 'swarm', owner: sh, s: SN.wrap(sh.s + 60, R.track.L), u: sh.u + k * 24, vs: SN.Ship.fwdSpeed(sh) + 2400, vu: k * 120, life: 1.4, dmg: 8, h: 14 }); R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'seeker': if (pressed) { const locked = sh.lockT >= .6 ? sh.lockOn : null; this.proj.push({ kind: 'seeker', owner: sh, s: SN.wrap(sh.s + 60, R.track.L), u: sh.u, vs: SN.Ship.fwdSpeed(sh) + 2000, vu: 0, life: 4, dmg: 18, target: locked, h: 14 }); R.emit({ t: 'fire', ship: sh, weapon: w, target: locked }); sh.lockOn = null; sh.lockT = 0; done(); } break;
      case 'mine': if (pressed) { sh.mineQueue = 5; sh.mineCD = 0; R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'cannon': if (pressed || held) { if (!sh.cannonN) { sh.cannonN = 24; sh.cannonT = 0; R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } } break;
      case 'rail':
        if (held && !c.fireReleased) { const was = sh.charge; sh.charge = Math.min(.8, sh.charge + dt); if (!was) R.emit({ t: 'railCharge', ship: sh }); }
        if ((c.fireReleased || !held) && sh.charge > 0) { this.rail(sh, sh.charge >= .8); sh.charge = 0; done(); }
        break;
      case 'tremor': if (pressed) { this.waves.push({ owner: sh, s: SN.wrap(sh.s + 40, R.track.L), vs: Math.max(0, SN.Ship.fwdSpeed(sh)) + 1800, life: .9, t: 0, hit: new Set() }); R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'bulwark': if (pressed) { sh.shieldT = 4; R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'auto': if (pressed) { sh.autoT = 5; R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'nitro': if (pressed) { sh.nitroT = 2.2; R.emit({ t: 'fire', ship: sh, weapon: w }); done(); } break;
      case 'siphon': if (pressed) { const tg = this.targetAhead(sh, 1500, 400); sh.siphonTo = tg; sh.siphonT = tg ? 3 : 0; R.emit({ t: 'fire', ship: sh, weapon: w, target: tg }); done(); } break;
    }
  }
  bolt(sh) {
    const R = this.race, tg = this.targetAhead(sh, 2400, 24), j = (R.rng('fx')() - .5) * 16;
    this.proj.push({ kind: 'cannon', owner: sh, s: SN.wrap(sh.s + 50, R.track.L), u: sh.u + j, vs: SN.Ship.fwdSpeed(sh) + 4200, vu: tg ? (tg.u - sh.u) * 2 : 0, life: .9, dmg: 2, h: 14 });
    R.emit({ t: 'bolt', ship: sh });
  }
  rail(sh, full) {
    const R = this.race, tg = this.railTarget(sh, full ? 48 : 32), T = R.track, len = tg ? SN.wrapDiff(sh.s, tg.s, T.L) : 4000;
    this.beams.push({ owner: sh, s0: sh.s, u0: sh.u, s1: SN.wrap(sh.s + len, T.L), u1: tg ? tg.u : sh.u + len * Math.tan(this.heading(sh)), life: .4, hit: !!tg });
    R.emit({ t: 'fire', ship: sh, weapon: 'rail', target: tg });
    if (tg) this.hit(tg, sh, 'rail', 30, { jolt: .8, stagger: .4 });
  }
  hit(tg, by, weapon, dmg, o = {}) {
    const R = this.race;
    if (tg.shieldT > 0) { R.emit({ t: 'blocked', ship: tg, by, weapon }); return; }
    const was = tg.elim, d = SN.Ship.damage(tg, dmg * SN.Tune.T.weaponDamageMul, weapon, by, R);
    if (o.jolt) V.scale(tg.V, o.jolt, tg.V);
    if (o.stagger) tg.stagger = Math.max(tg.stagger, o.stagger);
    if (o.pop && tg.grounded) { tg.V[2] += 520; tg.grounded = false; tg.airT = 0; }
    by.stats.hits++;
    R.emit({ t: 'hit', ship: tg, by, weapon, dmg: d });
    R.onHit(tg, by, weapon, !was && tg.elim);
  }
  /** move everything for one step */
  step(dt) {
    const R = this.race, T = R.track, L = T.L;
    for (const p of this.proj) {
      p.life -= dt;
      if (p.kind === 'seeker' && p.target && !p.target.elim) { const tg = p.target, ds = SN.wrapDiff(p.s, tg.s, L); p.vs = Math.max(p.vs, SN.Ship.fwdSpeed(tg) + 900); const du = tg.u - p.u; p.vu = Math.max(-900, Math.min(900, du * 6)); if (ds < -100) p.target = null; }
      if (p.kind === 'swarm') p.vu = Math.sign(p.vu) * Math.min(400, Math.abs(p.vu) + 0 * dt);
      p.s = SN.wrap(p.s + p.vs * dt, L); p.u += p.vu * dt;
      const fr = T.frameAt(p.s);
      if (fr.kind !== 1 && Math.abs(p.u) > fr.hw - 4) { p.life = 0; R.emit({ t: 'boom', s: p.s, u: Math.sign(p.u) * fr.hw, weapon: p.kind, wall: true }); continue; }
      for (const o of R.ships) {
        if (o === p.owner || o.elim || o.ghost || o.rescueT > 0) continue;
        if (Math.abs(SN.wrapDiff(p.s, o.s, L)) < 40 + (p.vs - SN.Ship.fwdSpeed(o)) * dt && Math.abs(p.u - o.u) < 34 && o.h < 60) {
          p.life = 0;
          if (p.kind === 'swarm') this.hit(o, p.owner, 'swarm', p.dmg, { jolt: .9, stagger: .2 });
          else if (p.kind === 'seeker') this.hit(o, p.owner, 'seeker', p.dmg, { jolt: .75, stagger: .5 });
          else this.hit(o, p.owner, 'cannon', p.dmg, { jolt: .98 });
          R.emit({ t: 'boom', s: p.s, u: p.u, weapon: p.kind });
          break;
        }
      }
    }
    this.proj = this.proj.filter(p => p.life > 0);
    for (const m of this.mines) {
      m.life -= dt; m.arm -= dt; m.spin += dt; if (m.arm <= 0) m.armed = true; if (!m.armed) continue;
      for (const o of R.ships) {
        if (o.elim || o.ghost || o.rescueT > 0 || o.h > 60) continue;
        if (Math.abs(SN.wrapDiff(m.s, o.s, L)) < 40 && Math.abs(m.u - o.u) < 40) { m.life = 0; this.hit(o, m.owner, 'mine', 8, { jolt: .9, stagger: .25 }); R.emit({ t: 'boom', s: m.s, u: m.u, weapon: 'mine' }); break; }
      }
    }
    this.mines = this.mines.filter(m => m.life > 0);
    for (const w of this.waves) {
      const s0 = w.s; w.t += dt; w.life -= dt; w.s = SN.wrap(w.s + w.vs * dt, L);
      for (const o of R.ships) {
        if (o === w.owner || o.elim || o.ghost || w.hit.has(o) || o.rescueT > 0) continue;
        const a = SN.wrapDiff(s0, o.s, L); if (a >= -40 && a <= w.vs * dt + 40) { if (o.grounded) { w.hit.add(o); this.hit(o, w.owner, 'tremor', 15, { stagger: .4, pop: true }); } else { w.hit.add(o); R.emit({ t: 'dodge', ship: o, weapon: 'tremor' }); } }
      }
    }
    this.waves = this.waves.filter(w => w.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter(b => b.life > 0);
  }
  hashList(out) { for (const p of this.proj) out.push(p.s, p.u); for (const m of this.mines) out.push(m.s, m.u); }
}
SN.Weapons = Weapons;
})();
