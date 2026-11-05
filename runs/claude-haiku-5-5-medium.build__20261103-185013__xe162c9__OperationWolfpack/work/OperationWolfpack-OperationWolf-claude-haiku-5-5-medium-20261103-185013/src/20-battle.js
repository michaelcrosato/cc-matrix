// The battle: one operation's rules, with no DOM, no audio and no drawing. step(dt, inputs) advances it in fixed steps.
// inputs: one per player (an array), or one object for player 1. Each input: { mx, my (crosshair velocity, -1..1),
// aim: [x, y] | null, fire (held), grenade (pressed), reload (pressed) }. Every noteworthy thing goes into battle.events;
// the renderer reads battle.booms, battle.popups, the entities and the players. Enemies telegraph every shot with a
// closing ring (tg): the shot lands when the ring closes unless the enemy is killed first.
(() => {
'use strict';
const WP = globalThis.WP;
const { clamp, proj, unproj } = WP;
const QUOTA_KEYS = ['soldier', 'vehicle', 'boat', 'air'];

const makePlayer = (id, carry) => {
  const T = WP.T;
  const p = {
    id, cx: WP.W / 2 + (id - 1) * 40, cy: 120, mag: T.magSize, spares: T.spares, grenades: T.grenades,
    damage: 0, score: 0, streak: 0, bestStreak: 0, shots: 0, hits: 0,
    kills: { soldier: 0, vehicle: 0, boat: 0, air: 0, boss: 0 },
    reload: 0, cool: 0, gcool: 0, bloom: 0, muzzle: 0, dmgFlash: 0, hitFlash: 0, reloads: 0,
    down: false, fury: 0, intercepts: 0, guards: 0,
  };
  if (carry) Object.assign(p, { score: carry.score, damage: carry.damage, spares: carry.spares, grenades: carry.grenades, kills: Object.assign(p.kills, carry.kills) });
  return p;
};

WP.Battle = class Battle {
  constructor(opId, o = {}) {
    const op = (this.op = WP.OPS[opId]);
    if (!op) throw new Error('no operation ' + opId);
    this.opId = opId;
    this.diff = WP.DIFF[o.difficulty || 'veteran'];
    this.god = !!o.god;             // the attract mode and the tests: damage does nothing
    this.infinite = !!o.infinite;   // the attract mode and the tests: magazines never run dry
    this.rand = WP.rng(o.seed === undefined ? WP.hashSeed(opId) : o.seed);
    this.tempo = o.tempo || 1;      // a session runs the rail quicker and the holds shorter (about four minutes an operation)
    this.t = 0;
    this.dist = 0;
    this.camX = WP.railX(op.rail, 0);
    this.phase = 'rail';            // rail | endhold | boss | done
    this.hold = null;
    this.holdT = 0;
    this.beats = WP.beatsFor(op, this.rand);
    this.nextBeat = 0;
    this.decor = WP.decorFor(op, this.rand);
    this.ents = [];
    this.nid = 1;
    this.events = [];
    this.booms = [];
    this.popups = [];
    this.grens = [];
    this.result = null;
    this.resultAt = 0;
    this.reinfT = 1.5;
    this.reinfN = 0;
    this.emergencyAt = -99;
    this.boss = null;
    this.hostagesTotal = op.hostages.length;
    this.quota = Object.assign({}, op.quotas);
    this.done = { soldier: 0, vehicle: 0, boat: 0, air: 0 };
    // the team: hostages home and lost, and civilians shot, are shared by everyone
    this.saved = o.carry ? o.carry.saved || 0 : 0;
    this.lost = o.carry ? o.carry.lost || 0 : 0;
    this.civShot = o.carry ? o.carry.civHit || 0 : 0;
    const count = clamp(o.players || 1, 1, 4);
    this.players = [];
    for (let i = 1; i <= count; i++) this.players.push(makePlayer(i, i === 1 ? o.carry : null));
    this.p = this.players[0];       // player 1: the HUD's and the tests' default
  }

  // a player joins in the middle of an operation: with 6 magazines and 4 grenades, and no damage
  addPlayer(id) {
    const pl = makePlayer(id, null);
    pl.spares = 6; pl.grenades = 4;
    this.players.push(pl);
    this.events.push({ k: 'join', pid: id });
    return pl;
  }
  // ---- queries the renderer and the bot use -------------------------------------------------------------------------
  get over() { return this.result !== null; }
  // the battle has ended and its last moments have played out
  get finished() { return this.result !== null && this.t >= this.resultAt + 2.2; }
  get active() { return this.players.filter(p => !p.down); }
  // an entity's screen anchor: the pixel of its ground point and its scale (k), with y as its height above ground
  anchor(e) {
    const p = proj(e.x, e.z, this.camX);
    return { sx: p.sx, gy: p.gy, k: p.k, sy: p.gy - (e.y || 0) * p.k };
  }
  // the screen rectangle an entity can be hit in
  rect(e) {
    const a = this.anchor(e), t = WP.TYPES[e.type] || {};
    if (e.kind === 'boss') {
      const up = clamp(e.rise === undefined ? 1 : e.rise, 0, 1);
      const w = e.w * a.k, h = e.h * a.k, top = a.sy - h * up;
      return { x0: a.sx - w / 2, x1: a.sx + w / 2, y0: top, y1: a.sy + 6 * a.k, headY: top + 0.32 * h };
    }
    if (e.kind === 'rocket' || e.kind === 'pickup') {
      const s = Math.max(e.kind === 'rocket' ? 2 : 4, (e.kind === 'rocket' ? 4 : 6) * a.k);
      return { x0: a.sx - s, x1: a.sx + s, y0: a.sy - s, y1: a.sy + s };
    }
    const w = t.w * a.k, h = t.h * a.k * (e.kind === 'soldier' ? Math.max(0.05, e.rise) : 1);
    return { x0: a.sx - w / 2, x1: a.sx + w / 2, y0: a.gy - h, y1: a.gy, headY: a.gy - h + h * 0.25 };
  }
  // can the crosshair hit this entity right now?
  targetable(e) {
    if (e.dead || e.gone) return false;
    switch (e.kind) {
      case 'soldier': return e.rise >= 0.55;
      case 'vehicle': case 'boat': case 'air': case 'civilian': case 'hostage': case 'animal': case 'crate': case 'pickup': case 'rocket':
        return true;
      case 'boss': return e.state === 'fight';
      default: return false;
    }
  }
  alive(kind) { return this.ents.filter(e => !e.dead && !e.gone && (kind ? e.kind === kind : true)); }
  waveAlive() { return this.ents.some(e => e.wave && !e.dead && !e.gone && (e.kind === 'soldier' || e.kind === 'vehicle' || e.kind === 'boat' || e.kind === 'air')); }
  get accuracy() { const s = this.players.reduce((n, p) => n + p.shots, 0), h = this.players.reduce((n, p) => n + p.hits, 0); return s ? h / s : 0; }
  multiplier(pl = this.p) { return 1 + Math.min(3, Math.floor(pl.streak / 5)); }
  get done2() { return this.done; }

  // ---- the step -----------------------------------------------------------------------------------------------------
  step(dt, inputs = {}) {
    const list = Array.isArray(inputs) ? inputs : [inputs];
    this.events.length = 0;
    this.t += dt;
    this.updatePopups(dt);
    this.updateBooms(dt);
    if (this.result !== null) { this.updateEntities(dt, true); return; }
    this.players.forEach((pl, i) => {
      if (pl.down) return;
      const inp = list[i] || {};
      this.aim(pl, dt, inp);
      this.trigger(pl, dt, inp);
    });
    this.rail(dt);
    this.updateEntities(dt, false);
    this.updateGrenades(dt);
    this.ents = this.ents.filter(e => !e.gone);
    this.checkPhase();
  }

  aim(pl, dt, inp) {
    const T = WP.T;
    if (inp.aim) { pl.cx = inp.aim[0]; pl.cy = inp.aim[1]; }
    else { pl.cx += (inp.mx || 0) * T.crosshairSpeed * dt; pl.cy += (inp.my || 0) * T.crosshairSpeed * dt; }
    pl.cx = clamp(pl.cx, 0, WP.W - 1);
    pl.cy = clamp(pl.cy, 8, WP.PLAY_H - 6);
  }

  rail(dt) {
    const op = this.op;
    if (this.phase === 'rail') {
      if (this.hold) {
        this.holdT += dt;
        if (!this.waveAlive() || this.holdT >= this.hold.max) this.hold = null;
      } else {
        this.dist += op.speed * WP.T.railSpeed * this.tempo * dt;
        const h = op.holds.find(h => !h.used && this.dist >= h.at);
        if (h) { h.used = true; this.hold = { at: h.at, max: h.max * (this.tempo > 1 ? 0.6 : 1), radio: h.radio }; this.holdT = 0; this.dist = h.at; }
      }
      while (this.nextBeat < this.beats.length && this.beats[this.nextBeat].at <= this.dist) this.fireBeat(this.beats[this.nextBeat++]);
      if (this.dist >= op.length) {
        this.dist = op.length;
        this.phase = 'endhold';
        this.events.push({ k: 'radio', key: 'end' });
      }
    }
    this.camX = WP.railX(op.rail, this.dist);
  }

  fireBeat(b) {
    if (b.radio) this.events.push({ k: 'radio', key: b.radio });
    if (b.hold) this.events.push({ k: 'hold' });
    if (b.spawn) for (const s of b.spawn) this.spawn(s.type, s.x, s.z, s);
    if (b.hostage) {
      const h = b.hostage;
      this.spawn('hostage', h.x, h.z, { state: 'held', id: h.id });
      for (let i = 0; i < 2; i++) this.spawn('soldier', h.x + (i ? 22 : -22), h.z + 30 + i * 12, { wave: true, guardOf: h.id });
    }
  }

  spawn(type, x, z, o = {}) {
    const def = WP.TYPES[type] || {};
    const e = {
      id: this.nid++, type, kind: def.kind || 'boss', x, z, y: o.y || 0,
      hp: def.hp || 1, state: o.state || 'hide', t: 0, tg: 0, cd: 0, rise: 0,
      vx: o.vx || 0, wave: !!o.wave, guardOf: o.guardOf, id2: o.id, dead: false, gone: false, deadT: 0, flash: 0,
      upFor: 0, item: o.item, weapon: def.weapon, quota: def.quota, dmg: def.dmg || 1, pk: o.pk, owner: o.owner,
      telegraphMult: def.weapon === 'sniper' ? 1.6 : 1, speed: 0,
    };
    if (e.kind === 'soldier') {
      if (def.rise1 || def.runs) { e.state = 'run'; e.rise = 1; }
      else { e.state = 'hide'; e.t = 0.3 + this.rand() * 1.4; e.upFor = 2.0 + this.rand() * 1.6; }
      if (def.runs) e.cd = 1 + this.rand();
      else e.cd = 0.5 + this.rand() * 1.5;
      if (def.weapon === 'mortar') e.cd = 2.0;
    }
    if (e.kind === 'vehicle' || e.kind === 'boat') { e.cd = 1.5 + this.rand() * 1.2; }
    if (e.kind === 'air') {
      e.cd = 2.0; e.hover = { z: 170, y: 55 }; e.y = 55; e.z = 260; e.state = 'fly';
      e.hp = def.hp; e.speed = 45;
    }
    if (e.kind === 'hostage') { e.rise = 1; }
    if (e.kind === 'rocket') { e.z = z; e.y = o.y || 10; e.pk = o.pk || 'rocket'; }
    if (e.kind === 'crate' && type === 'dynamite') { e.dyn = true; }
    if (e.kind === 'boss') {
      const b = WP.BOSSES[type];
      e.name = b.name; e.hp = Math.round(b.hp * WP.T.bossHealth); e.hpMax = e.hp;
      e.w = b.w; e.h = b.h; e.special = b.special; e.path = b.path; e.shield = !!b.shield; e.shieldUp = !!b.shield;
      e.sprite = b.sprite; e.rate = b.rate; e.volley = b.volley; e.flies = !!b.flies;
      e.z = b.path === 'fly' ? 180 : b.path === 'track' ? 240 : b.path === 'weave' ? 200 : 150;
      e.y = b.flies ? 60 : 0;
      e.x = this.camX; e.state = 'enter'; e.t = 0; e.cd = 2.4; e.rise = 0; e.spec = 0;
    }
    this.ents.push(e);
    return e;
  }

  // ---- entity behaviour ---------------------------------------------------------------------------------------------
  updateEntities(dt, frozen) {
    for (const e of this.ents) {
      if (e.dead) { e.deadT -= dt; if (e.deadT <= 0) e.gone = true; e.tg = 0; continue; }
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 4);
      if (frozen) continue;
      switch (e.kind) {
        case 'soldier': this.soldierAI(e, dt); break;
        case 'vehicle': this.vehicleAI(e, dt); break;
        case 'boat': this.boatAI(e, dt); break;
        case 'air': this.heliAI(e, dt); break;
        case 'civilian': this.walkAI(e, dt, 200); break;
        case 'hostage': this.hostageAI(e, dt); break;
        case 'animal': this.animalAI(e, dt); break;
        case 'pickup': e.t += dt; if (e.t > 9.5) e.gone = true; break;
        case 'rocket': this.projectileAI(e, dt); break;
        case 'boss': this.bossAI(e, dt); break;
        default: break;
      }
    }
  }
  soldierAI(e, dt) {
    if (e.state === 'run') {
      if (e.vx) { e.x += e.vx * dt; if (Math.abs(e.x - this.camX) > 300) { e.gone = true; return; } }
      this.fireCycle(e, dt);
      return;
    }
    if (e.state === 'hide') {
      e.rise = 0; e.t -= dt;
      if (e.t <= 0) e.state = 'rise';
    } else if (e.state === 'rise') {
      e.rise = Math.min(1, e.rise + dt / 0.22);
      if (e.rise >= 1) { e.state = 'up'; e.t = e.upFor; }
    } else if (e.state === 'up') {
      e.t -= dt;
      this.fireCycle(e, dt);
      if (e.t <= 0) { e.state = 'drop'; e.tg = 0; }
    } else if (e.state === 'drop') {
      e.rise = Math.max(0, e.rise - dt / 0.2);
      if (e.rise <= 0) { e.state = 'hide'; e.t = 1.2 + this.rand() * 1.4; e.cd = 1 + this.rand(); }
    }
  }
  vehicleAI(e, dt) {
    // a truck stops at the rail and unloads four soldiers (once)
    if (e.type === 'truck' && !e.unloaded && Math.abs(e.x - this.camX) < 60) {
      e.unloaded = true; e.vx = 0;
      for (let i = 0; i < 4; i++) this.spawn('soldier', e.x - 30 + i * 20, 150 + this.rand() * 30, { wave: true });
      this.events.push({ k: 'unload', id: e.id });
    }
    if (e.vx) {
      e.x += e.vx * dt;
      const lim = 240;
      if (e.x - this.camX > lim) { e.x = this.camX + lim; e.vx = -Math.abs(e.vx); }
      if (e.x - this.camX < -lim) { e.x = this.camX - lim; e.vx = Math.abs(e.vx); }
    }
    if (e.type !== 'truck') this.fireCycle(e, dt);
  }
  boatAI(e, dt) {
    e.x += e.vx * dt;
    if (Math.abs(e.x - this.camX) > 260) { e.vx = -e.vx; e.x = this.camX + clamp(e.x - this.camX, -260, 260); }
    this.fireCycle(e, dt);
  }
  // the gunship flies in from far off, hovers at its station and strafes side to side, until it is shot down
  heliAI(e, dt) {
    if (e.state === 'fly') {
      e.z -= e.speed * dt;
      if (e.z <= e.hover.z) { e.z = e.hover.z; e.state = 'hover'; }
    } else {
      e.x += Math.sin(this.t * 0.7 + e.id) * 40 * dt;
      e.x = clamp(e.x, this.camX - 200, this.camX + 200);
    }
    this.fireCycle(e, dt);
  }
  walkAI(e, dt, lim) {
    e.x += e.vx * dt;
    if (e.x - this.camX > lim) e.vx = -Math.abs(e.vx);
    if (e.x - this.camX < -lim) e.vx = Math.abs(e.vx);
  }
  hostageAI(e, dt) {
    if (e.state === 'held') {
      const guards = this.ents.some(g => g.guardOf === e.id2 && !g.dead && !g.gone);
      if (!guards) { e.state = 'run'; e.vx = (e.x < this.camX ? -1 : 1) * 58; this.events.push({ k: 'freed', id: e.id }); }
      return;
    }
    e.x += e.vx * dt;
    const p = proj(e.x, e.z, this.camX);
    if (p.sx < -24 || p.sx > WP.W + 24) {
      e.gone = true;
      this.saved++; this.players.forEach(pl => { pl.score += 1000 * this.multiplier(pl) / this.players.length; });
      this.events.push({ k: 'saved', id: e.id });
    }
  }
  animalAI(e, dt) {
    if (e.fleeing) e.vx = e.fleeing * 90;
    e.x += e.vx * dt;
    if (Math.abs(e.x - this.camX) > 300) e.gone = true;
  }
  // a projectile flies at the camera; it hits the player when it reaches the screen's near depth (or lands, for shells)
  projectileAI(e, dt) {
    const P = WP.PROJ[e.pk] || WP.PROJ.rocket;
    e.z -= P.speed * dt;
    if (e.z <= 96) {
      this.explode(e.x, 96, 16, null);
      this.hurt(WP.T.enemyDamage * P.dmg * this.diff.damage, 'projectile');
      e.gone = true;
    }
  }
  // the telegraph ring: it starts when the cooldown ends and the shot lands when the ring closes
  fireCycle(e, dt) {
    if (e.tg > 0) {
      e.tg += dt / (WP.T.telegraph * this.diff.telegraph * (e.telegraphMult || 1));
      if (e.tg >= 1) { e.tg = 0; this.fireAt(e); }
    } else {
      e.cd -= dt;
      const ready = e.kind !== 'soldier' || e.rise >= 0.9 || e.state === 'run';
      if (e.cd <= 0 && ready) e.tg = 0.0001;
    }
  }
  fireAt(e) {
    const T = WP.T, dmg = T.enemyDamage * this.diff.damage * e.dmg;
    const gap = (lo, hi) => (lo + this.rand() * (hi - lo)) * T.enemyRate;
    switch (e.weapon) {
      case 'burst': {
        const n = e.type === 'brute' ? 5 : 4;
        for (let i = 0; i < n; i++) this.hurt(dmg * 0.5, 'shot');
        e.cd = gap(2.2, 3.2);
        this.events.push({ k: 'shot', id: e.id, kind: e.kind });
        break;
      }
      case 'sniper': this.hurt(dmg * 1.3, 'sniper'); e.cd = gap(3.0, 4.0); this.events.push({ k: 'shot', id: e.id, kind: 'sniper' }); break;
      case 'knife': this.spawnProj('knife', e); e.cd = gap(2.4, 3.6); break;
      case 'grenade': this.spawnProj('grenade', e); e.cd = gap(2.6, 3.8); break;
      case 'mortar': this.spawnProj('mortar', e); e.cd = 6 * T.enemyRate; break;
      case 'rocket': this.spawnProj('rocket', e); e.cd = gap(3.4, 4.6); break;
      case 'shell': this.spawnProj('shell', e); e.cd = gap(5.0, 6.0); break;
      case 'missile': this.spawnProj('missile', e); e.cd = gap(5.0, 7.0); break;
      case 'gun': default:
        this.hurt(dmg, 'shot');
        e.cd = gap(2.2, 3.8);
        this.events.push({ k: 'shot', id: e.id, kind: e.kind });
    }
  }
  spawnProj(pk, from) {
    this.spawn('rocket', from.x, from.z, { y: from.kind === 'air' ? from.y : 10, pk });
    this.events.push({ k: 'launch', id: from.id, pk });
  }

  // ---- the player's gun and grenades --------------------------------------------------------------------------------
  trigger(pl, dt, inp) {
    const T = WP.T;
    const fury = pl.fury > 0;
    pl.fury = Math.max(0, pl.fury - dt);
    pl.cool -= dt; pl.gcool -= dt;
    pl.muzzle = Math.max(0, pl.muzzle - dt * 14);
    pl.dmgFlash = Math.max(0, pl.dmgFlash - dt * 2.5);
    pl.hitFlash = Math.max(0, pl.hitFlash - dt * 5);
    pl.bloom = Math.max(0, pl.bloom - dt * 3.2);
    if (pl.reload > 0) {
      pl.reload -= dt;
      if (pl.reload <= 0) {
        pl.reload = 0;
        const need = Math.min(T.magSize - pl.mag, this.infinite ? T.magSize : pl.spares * T.magSize);
        if (this.infinite) pl.mag = T.magSize;
        else { pl.mag += need; pl.spares -= Math.ceil(need / T.magSize); if (pl.spares < 0) pl.spares = 0; }
        this.events.push({ k: 'reloaded', pid: pl.id });
      }
    } else if (inp.reload && pl.mag < T.magSize && (this.infinite || pl.spares > 0) && !fury) {
      pl.reload = 1.1; pl.reloads++; this.events.push({ k: 'reload', pid: pl.id });
    }
    // out of everything: the emergency drop comes on its own, whether or not the player is pulling the trigger
    if (!this.infinite && !fury && pl.mag <= 0 && pl.spares <= 0 && pl.reload <= 0) this.outOfAmmo(pl);
    if (inp.grenade && pl.grenades > 0 && pl.gcool <= 0) this.throwGrenade(pl);
    if (inp.fire && pl.reload <= 0 && pl.cool <= 0) {
      if (fury || this.infinite) this.shoot(pl);
      else if (pl.mag <= 0) {
        if (pl.spares > 0) { pl.reload = 1.1; pl.reloads++; this.events.push({ k: 'reload', pid: pl.id }); }
        else this.outOfAmmo(pl);
      } else this.shoot(pl);
    }
  }
  // out of ammo on a forgiving difficulty: a parachute drop lands two magazines in the pouch (a pickup could not be
  // shot for it, because the player has no rounds to shoot with)
  outOfAmmo(pl) {
    if (this.diff.emergency) {
      if (this.t - this.emergencyAt > 14) {
        this.emergencyAt = this.t;
        pl.spares = Math.min(8, pl.spares + 2);
        this.events.push({ k: 'drop', what: 'emergency', pid: pl.id });
      }
    } else if (pl.grenades <= 0 && this.players.every(p => p.grenades <= 0 && p.spares <= 0 && p.mag <= 0)) this.lose('ammo');
  }
  shoot(pl) {
    const T = WP.T, fury = pl.fury > 0;
    if (!this.infinite && !fury) pl.mag -= 1;
    if (this.infinite && pl.mag <= 0) pl.mag = 1;
    pl.shots++; pl.cool = 1 / (T.fireRate * (fury ? 2 : 1)); pl.muzzle = 1;
    if (!fury) pl.bloom = Math.min(1, pl.bloom + 0.22);
    this.events.push({ k: 'shot-fired', x: pl.cx, y: pl.cy, pid: pl.id });
    const r = 2 + 5 * pl.bloom * T.bloom;
    let best = null;
    for (const e of this.ents) {
      if (!this.targetable(e)) continue;
      const R = this.rect(e);
      if (!R) continue;
      if (pl.cx >= R.x0 - r && pl.cx <= R.x1 + r && pl.cy >= R.y0 - r && pl.cy <= R.y1 + r) {
        if (!best || e.z < best.e.z) best = { e, R };
      }
    }
    if (!best) { pl.streak = 0; this.events.push({ k: 'miss', x: pl.cx, y: pl.cy }); return; }
    const head = (best.e.kind === 'boss' || best.e.type === 'brute') && pl.cy < best.R.headY;
    pl.hits++;
    this.applyHit(best.e, head ? (best.e.type === 'brute' ? 4 : 3) : 1, { head, sx: pl.cx, sy: pl.cy }, pl);
  }
  throwGrenade(pl) {
    pl.grenades--; pl.gcool = 0.5;
    const g = unproj(pl.cx, pl.cy, this.camX) || { x: this.camX, z: 170 };
    const z = clamp(g.z, 84, 300);
    this.grens.push({ x: g.x, z, t: 0, dur: 0.7 + (z / 300) * 0.25, sx: pl.cx, sy: pl.cy, owner: pl.id });
    this.events.push({ k: 'throw', pid: pl.id });
  }
  updateGrenades(dt) {
    for (const g of this.grens) {
      g.t += dt;
      if (g.t >= g.dur) {
        g.done = true;
        this.explode(g.x, g.z, 36, this.players[g.owner - 1]);
        this.events.push({ k: 'boom', what: 'grenade' });
      }
    }
    this.grens = this.grens.filter(g => !g.done);
  }

  // ---- hits, kills and blasts ---------------------------------------------------------------------------------------
  applyHit(e, mult, where, pl) {
    pl = pl || this.p;
    pl.hitFlash = 1;
    switch (e.kind) {
      case 'soldier': {
        if (e.guardOf !== undefined && pl) pl.guards++;   // a guard of a worker: the workers can run once the guards are down
        if (e.type === 'brute' && e.hp > 1) {
          e.hp -= mult; e.flash = 1;
          this.popup(where.sx, where.sy, mult > 1 ? 'HEAD' : '', '#ffe060');
          if (e.hp > 0) break;
        }
        this.kill(e, pl);
        this.count(pl, 'soldier', e.quota);
        this.score(pl, WP.TYPES[e.type].score);
        break;
      }
      case 'vehicle': case 'boat': case 'air': {
        e.hp -= mult; e.flash = 1;
        if (e.hp <= 0) { this.kill(e, pl); this.count(pl, e.kind === 'vehicle' ? 'vehicle' : e.kind, e.quota); this.score(pl, WP.TYPES[e.type].score); }
        else this.events.push({ k: 'hitvehicle', id: e.id });
        break;
      }
      case 'boss': {
        if (e.state !== 'fight') break;
        const shielded = e.shield && e.shieldUp && !where.head;
        const dmg = shielded ? mult * 0.25 : mult;
        e.hp -= dmg; e.flash = 1;
        this.popup(where.sx, where.sy, shielded ? 'BLOCKED' : where.head ? 'HEAD' : '', shielded ? '#9ab0c0' : '#ffe060');
        this.events.push({ k: 'bosshit', head: !!where.head, shielded });
        if (e.hp <= 0) this.defeatBoss(e, pl);
        break;
      }
      case 'civilian': this.civHit(e, pl); break;
      case 'hostage':
        this.kill(e, pl);
        this.lost++; pl.score = Math.max(0, pl.score - 1000);
        this.hurt(25, 'hostage', pl);
        this.events.push({ k: 'hostagelost', id: e.id });
        break;
      case 'animal':
        if (!e.hit) {
          e.hit = true;
          this.drop(e.x, e.z, this.rand() < 0.5 ? 'mag' : this.rand() < 0.6 ? 'grenade' : 'med');
          this.score(pl, 50);
          this.events.push({ k: 'animal', id: e.id });
        }
        e.fleeing = e.vx >= 0 ? 1 : -1;
        e.vx = e.fleeing * 90;
        break;
      case 'crate':
        e.gone = true;
        if (e.dyn) { this.explode(e.x, e.z, 400, pl); this.events.push({ k: 'dynamite' }); }
        else this.drop(e.x, e.z, this.rand() < 0.45 ? 'mag' : this.rand() < 0.5 ? 'grenade' : 'med');
        this.score(pl, 100);
        this.booms.push({ x: e.x, z: e.z, r: 10, t: 0 });
        this.events.push({ k: 'crate', id: e.id });
        break;
      case 'pickup':
        this.collect(pl, e.item); e.gone = true;
        break;
      case 'rocket':
        this.booms.push({ x: e.x, z: e.z, r: 12, t: 0 });
        e.gone = true; this.score(pl, 50); pl.intercepts++;
        this.events.push({ k: 'shootdown', pk: e.pk });
        break;
      default: break;
    }
    if (where.sx !== undefined && e.kind !== 'boss') this.popup(where.sx, where.sy, '+' + (this.multiplier(pl) > 1 ? this.multiplier(pl) + 'x' : ''), '#ffffff');
  }
  count(pl, what, quota) {
    pl.kills[what] = (pl.kills[what] || 0) + 1;
    if (quota && this.done[quota] !== undefined) this.done[quota]++;
  }
  kill(e, pl) {
    if (e.dead) return;
    e.dead = true; e.deadT = 0.5; e.tg = 0; e.flash = 1;
    if (pl) { pl.streak++; pl.bestStreak = Math.max(pl.bestStreak, pl.streak); }
    this.events.push({ k: 'kill', what: e.kind, id: e.id, z: e.z, x: e.x, pid: pl && pl.id });
  }
  civHit(e, pl) {
    this.kill(e, pl);
    this.civShot++; pl.score = Math.max(0, pl.score - 500); pl.streak = 0;
    this.hurt(12, 'civilian', pl);
    this.events.push({ k: 'civhit', id: e.id });
  }
  score(pl, base) { pl.score += base * this.multiplier(pl); }
  popup(sx, sy, text, color) { if (sx !== undefined && text) this.popups.push({ x: sx, y: sy, text, color, t: 0 }); }
  updatePopups(dt) {
    for (const q of this.popups) q.t += dt;
    this.popups = this.popups.filter(q => q.t < 0.9);
  }
  updateBooms(dt) {
    for (const b of this.booms) b.t += dt;
    this.booms = this.booms.filter(b => b.t < 1.0);
  }
  // a blast: everything within r (depth counts half, so it is a flat ellipse on the ground) takes what a shot would
  explode(x, z, r, pl) {
    this.booms.push({ x, z, r, t: 0, big: r > 30 });
    for (const e of this.ents.slice()) {
      if (e.dead || e.gone || e.kind === 'animal' || e.kind === 'pickup' || e.kind === 'cover') continue;
      if (Math.hypot(e.x - x, (e.z - z) * 0.5) > r) continue;
      switch (e.kind) {
        case 'soldier': case 'vehicle': case 'boat': case 'air': case 'rocket': case 'crate': case 'hostage': this.applyHit(e, 1, {}, pl || this.p); break;
        case 'civilian': this.civHit(e, pl || this.p); break;
        case 'boss': if (e.state === 'fight') { e.hp -= 2; e.flash = 1; if (e.hp <= 0) this.defeatBoss(e, pl || this.p); } break;
        default: break;
      }
    }
  }
  defeatBoss(e, pl) {
    e.hp = 0;
    this.kill(e, pl);
    if (pl) { pl.kills.boss++; this.score(pl, 5000); }
    this.events.push({ k: 'bossdown', name: e.name });
    this.booms.push({ x: e.x, z: e.z, r: 60, t: 0, big: true });
    this.result = 'won'; this.resultAt = this.t;
  }
  drop(x, z, item) { this.spawn('pickup', x, z, { item }); this.events.push({ k: 'drop', what: item }); }
  collect(pl, item) {
    if (item === 'mag') pl.spares = Math.min(8, pl.spares + 1);
    else if (item === 'grenade') pl.grenades = Math.min(8, pl.grenades + 1);
    else if (item === 'med') pl.damage = Math.max(0, pl.damage - 25);
    else if (item === 'fury') { pl.fury = 10; this.events.push({ k: 'fury', pid: pl.id }); }
    this.events.push({ k: 'pickup', what: item, pid: pl.id });
  }
  // damage to a player: the one named, else a random player still up (shared fire lands on the team)
  hurt(amount, source, pl) {
    if (this.god || this.result !== null) return;
    const up = this.active;
    if (!up.length) return;
    const target = pl && !pl.down ? pl : up[Math.floor(this.rand() * up.length)];
    target.damage = Math.min(100, target.damage + amount);
    target.dmgFlash = 1; target.streak = 0;
    this.events.push({ k: 'hurt', amount, source, pid: target.id });
    if (target.damage >= 100) {
      target.down = true; target.reload = 0;
      this.events.push({ k: 'down', pid: target.id });
      if (!this.active.length) this.lose('down');
    }
  }
  lose(why) {
    if (this.result !== null) return;
    this.result = 'lost'; this.resultAt = this.t;
    this.events.push({ k: 'lost', why });
  }

  // ---- bosses: the path they take, and the attacks ------------------------------------------------------------------
  bossAI(e, dt) {
    if (e.state === 'enter') {
      e.rise = Math.min(1, e.rise + dt / 1.2);
      if (e.rise >= 1) { e.state = 'fight'; this.events.push({ k: 'boss', name: e.name, phase: 'fight' }); }
      return;
    }
    e.t += dt;
    // where it stands: parked, weaving, swaying, tracking, standing or flying in a circle
    switch (e.path) {
      case 'park': e.x = this.camX + 120 * Math.sin(e.t * 0.8) * 0.5; break;
      case 'weave': e.x = this.camX + 80 * Math.sin(e.t * 0.9); break;
      case 'sway': e.x = this.camX + 100 * Math.sin(e.t * 0.5); break;
      case 'track': e.x = this.camX + 260 * Math.sin(e.t * 0.2); break;
      case 'fly': e.x = this.camX + 60 * Math.sin(e.t * 0.6); break;
      default: e.x = this.camX;
    }
    const enraged = e.hp <= e.hpMax / 2;
    if (enraged && !e.enraged) { e.enraged = true; this.events.push({ k: 'boss', name: e.name, phase: 'enraged' }); }
    this.bossSpecial(e, dt, enraged);
    if (e.tg > 0) {
      e.tg += dt / (1.1 * this.diff.telegraph * WP.T.telegraph);
      if (e.tg >= 1) {
        e.tg = 0;
        const n = e.volley + (enraged ? 1 : 0);
        if (e.special === 'salvo') for (let i = 0; i < n; i++) this.spawnProj('missile', e);
        else for (let i = 0; i < n; i++) this.hurt(WP.T.enemyDamage * 0.55 * this.diff.damage, 'boss');
        this.events.push({ k: 'volley', n });
        e.cd = e.rate * WP.T.enemyRate * (enraged ? 0.7 : 1);
      }
    } else {
      e.cd -= dt;
      if (e.cd <= 0) e.tg = 0.0001;
    }
  }
  // the extra things a boss does: paratroopers from the hill, the shield coming down, the flame nozzle, the vents
  bossSpecial(e, dt, enraged) {
    if (e.special === 'paratroopers') {
      e.spec -= dt;
      if (e.spec <= 0) {
        e.spec = 12 / WP.T.density;
        for (const side of [-1, 1]) this.spawn('para', this.camX + side * 170, 150, { wave: true });
        this.events.push({ k: 'radio', key: 'boss.para' });
      }
    }
    if (e.special === 'shield') {
      e.spec -= dt;
      if (e.spec <= 0) { e.shieldUp = !e.shieldUp; e.spec = e.shieldUp ? 4 : 1; }
    }
    if (e.special === 'nozzle' || e.special === 'vents') {
      e.spec -= dt;
      if (e.spec <= 0) {
        e.spec = (enraged ? 6 : 9) * WP.T.enemyRate;
        this.hurt(WP.T.enemyDamage * 1.2 * this.diff.damage, 'flame');
        this.booms.push({ x: e.x, z: e.z + 40, r: 40, t: 0 });
        this.events.push({ k: 'flame' });
      }
    }
  }

  // ---- phases: the quota, the boss, the end ------------------------------------------------------------------------
  quotaMet() { return QUOTA_KEYS.every(k => !this.quota[k] || this.done[k] >= this.quota[k]); }
  checkPhase() {
    if (this.result !== null) return;
    if (this.phase === 'endhold') {
      if (this.quotaMet()) {
        this.phase = 'boss';
        this.spawn(this.op.boss, this.camX, 150, {});
        this.events.push({ k: 'radio', key: this.op.radio.find(r => r[0] === 'end')[1] });
        return;
      }
      // the quota is not met: reinforcements keep coming until it is
      this.reinfT -= 1 / 120;
      if (this.reinfT <= 0) {
        this.reinfT = 4.8 / WP.T.density;
        this.reinfN++;
        const q = this.quota, d = this.done, n = this.reinfN;
        if (q.air && d.air < q.air && n % 4 === 0) this.spawn('heli', this.camX, 260, { wave: true, fly: true });
        else if (q.boat && d.boat < q.boat && n % 3 === 0) this.spawn('skiff', this.camX + 200, 150, { vx: -36, wave: true });
        else if (q.vehicle && d.vehicle < q.vehicle && n % 3 === 1) this.spawn('jeep', this.camX - 230, 190, { vx: 42, wave: true });
        else {
          const side = n % 2 ? -1 : 1;
          this.spawn('soldier', this.camX + side * 150, 150 + this.rand() * 40, { wave: true });
          this.spawn('soldier', this.camX + side * 166, 170 + this.rand() * 30, { wave: true });
        }
      }
    }
  }
  // the dev screen's skip: the rail ends here and the quota counts as met, so the boss comes next
  skipToBoss() {
    if (this.result !== null || this.phase !== 'rail') return;
    this.hold = null;
    this.dist = this.op.length;
    this.phase = 'endhold';
    for (const k of QUOTA_KEYS) this.done[k] = Math.max(this.done[k], this.quota[k] || 0);
    this.camX = WP.railX(this.op.rail, this.dist);
  }
  // ---- snapshot for the tests and the debug handle -----------------------------------------------------------------
  snapshot() {
    const p = this.p;
    return {
      op: this.opId, phase: this.phase, result: this.result, t: +this.t.toFixed(2), dist: Math.round(this.dist), camX: Math.round(this.camX),
      hold: !!this.hold, quota: this.quota, done: Object.assign({}, this.done),
      player: { mag: p.mag, spares: p.spares, grenades: p.grenades, damage: Math.round(p.damage), score: p.score, streak: p.streak, shots: p.shots, hits: p.hits, kills: Object.assign({}, p.kills), cx: Math.round(p.cx), cy: Math.round(p.cy), down: p.down },
      team: { saved: this.saved, lost: this.lost, civShot: this.civShot },
      boss: (() => { const b = this.ents.find(e => e.kind === 'boss'); return b ? { hp: b.hp, state: b.state, dead: b.dead, name: b.name } : null; })(),
      alive: this.ents.filter(e => !e.dead && !e.gone).length,
      hostages: this.ents.filter(e => e.kind === 'hostage' && !e.gone).length,
    };
  }
};
})();
