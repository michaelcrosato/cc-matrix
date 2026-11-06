// Soldiers, friends and puppets. Sim and view apart: a soldier is data plus an optional view.
import { BehaviorTree, bt, CharacterController, THREE } from '../../pixel-engine.js';
import { FACTION_PALETTES, SKINS } from '../art/models.js';
import { TUNING } from '../core/tuning.js';
import { clamp, dist2 } from '../world/geom.js';
import { KIND, WATER_Y } from '../world/terrain.js';
import { PersonView } from './rig.js';
import { mixin } from '../core/mixin.js';
import { SquadPart } from './squad.js';
const { Vector3 } = THREE;
const HATS = { concord: ['soldier-beret', 'soldier-helmet'], harvest: ['soldier-cloth', 'soldier-helmet'], deserter: ['soldier-cloth', 'soldier-beret'] };
const ROLE = { rifle: { hp: 60, speed: 4.2, burst: [3, 5], rate: 7, range: 90 }, mg: { hp: 90, speed: 3.2, burst: [6, 10], rate: 9, range: 100 }, sniper: { hp: 50, speed: 3.4, burst: [1, 1], rate: 0.6, range: 220, accuracy: 2.2 }, rocket: { hp: 70, speed: 3.6, burst: [1, 1], rate: 0.2, range: 110 }, driver: { hp: 55, speed: 4.2, burst: [3, 5], rate: 7, range: 90 } };
const from = new Vector3(), dirV = new Vector3(), moveV = new Vector3();
let nextId = 1;
export class Actors {
  list = []; byId = new Map(); pathBudget = 0; dropped = []; corpses = [];
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('actors'); this.barkClock = 0; }
  /** A soldier in the world. `def`: { faction, role, x, z, duty, site, tag, friendly, name, modelId, palette, hp } */
  spawn(def) {
    const game = this.game, ctx = this.ctx, role = ROLE[def.role] ?? ROLE.rifle, r = this.rng;
    const y = game.world.land.heightAt(def.x, def.z) + (def.y ?? 0);
    const a = {
      id: nextId++, kind: def.kind ?? 'soldier', faction: def.faction, role: def.role ?? 'rifle', spec: role, site: def.site ?? null, tag: def.tag ?? null,
      x: def.x, y, z: def.z, yaw: def.yaw ?? r.range(0, 6.28), homeX: def.x, homeZ: def.z, duty: def.duty ?? 'guard', friendly: !!def.friendly, buddy: def.buddy ?? null,
      hp: (def.hp ?? role.hp) * (def.friendly ? 1 : TUNING.enemyHealth), maxHp: 0, alive: true, state: 'idle', suspicion: 0, reaction: 0, burning: 0, burnPanic: 0, lastKnown: null, searchT: 0,
      burstLeft: 0, nextShot: 0, repositionT: r.range(1, 4), cond: r.range(20, 70), jamT: 0, moveTo: null, path: null, pathI: 0, speedWanted: 0, fireAt: null, lookAtYaw: null, target: null, panicDir: null, down: false, downT: 0, flank: false, dodgeT: 0, stationary: def.duty === 'tower', y0: def.y ?? 0, barkT: 0,
    };
    a.maxHp = a.hp;
    if (!def.puppet) {
      a.ctrl = new CharacterController(ctx.physics, { position: [def.x, y + 0.05, def.z], radius: 0.3, halfHeight: 0.55, speed: role.speed, jumpSpeed: 0, gravity: def.y ? 0 : -24 });
      if (def.y) a.ctrl.body.setTranslation({ x: def.x, y: y + 0.85, z: def.z }, true);
      ctx.physics.tag(a.ctrl.collider, 'npc');
      game.world.own(a.ctrl.collider, 'actor', a);
      a.tree = this.makeTree(a);
      a.brainPhase = (a.id * 7) % 6;
    }
    const pal = def.palette ?? { ...FACTION_PALETTES[def.faction], skin: r.pick(SKINS) };
    a.view = new PersonView(ctx, def.modelId ?? r.pick(HATS[def.faction] ?? HATS.concord), pal, { gun: !def.unarmed });
    a.view.place(a.x, y + (def.y ?? 0) * 0, a.z, a.yaw);
    a.view.setLower('Idle'); a.view.setUpper(a.duty === 'sit' ? 'Idle' : 'AimIdle');
    if (a.duty === 'sit') a.view.setFull('Sit');
    this.list.push(a); this.byId.set(a.id, a);
    return a;
  }
  makeTree(a) {
    const A = (n, f) => bt.action(n, f), C = (n, f) => bt.condition(n, f);
    return new BehaviorTree(bt.selector('soldier',
      bt.sequence('burning', C('on fire?', (s) => s.burning > 0), A('panic', (s, dt) => this.doPanic(s, dt))),
      bt.sequence('fire near', C('fire upwind?', (s) => this.fireNear(s)), A('flee crosswind', (s) => this.doFleeFire(s))),
      bt.sequence('blast near', C('dodge?', (s) => s.dodgeT > 0), A('dodge', (s, dt) => this.doDodge(s, dt))),
      bt.sequence('combat', C('target?', (s) => s.state === 'alert'), A('fight', (s, dt) => this.doCombat(s, dt))),
      bt.sequence('search', C('searching?', (s) => s.state === 'searching'), A('search', (s, dt) => this.doSearch(s, dt))),
      A('duty', (s, dt) => this.doDuty(s, dt)),
    ), a);
  }
  /** Is this actor allowed to shoot at that target right now? */
  hostileTo(a, t) {
    if (t.kind === 'player') return this.game.isHostileToPlayer(a, t);
    if (a.friendly) return !t.friendly && t.faction !== 'none';
    if (t.friendly) return true;
    return this.game.warOn && t.faction !== a.faction;
  }
  targetsOf(a) { return this.game.targetsFor(a); }
  perceive(a, dt) {
    if (a.burning > 0) return;
    const game = this.game, night = game.world.isNight();
    let best = null, bestD = 1e9, seen = 0;
    for (const t of this.targetsOf(a)) {
      if (t.actor === a || !this.hostileTo(a, t) || t.hidden || t.down) continue;
      const d = Math.hypot(t.x - a.x, t.z - a.z);
      let range = TUNING.enemyVision * (a.role === 'sniper' ? 1.6 : 1);
      if (t.kind === 'player') {
        range *= t.crouched ? 0.55 : 1;
        if (game.world.tallGrassAt(t.x, t.z) && t.crouched) range *= 0.6 / 0.55;
        if (night && !t.lit) range *= 0.45; else if (night && t.lit) range *= 0.9;
      } else if (night) range *= 0.6;
      if (d > range) continue;
      const toYaw = Math.atan2(t.x - a.x, t.z - a.z);
      let dy = toYaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > (60 * Math.PI) / 180 && d > 6 && a.state !== 'alert') continue;
      if (!this.los(a, t)) continue;
      if (d < bestD) { bestD = d; best = t; seen = 1 - d / range; }
    }
    a.target = best;
    if (best) {
      a.lastKnown = [best.x, best.z];
      a.suspicion = clamp(a.suspicion + dt * (0.45 + seen * 1.4) * (a.state === 'alert' ? 4 : 1), 0, 1.2);
      a.seenT = 0;
      if (a.suspicion >= 1 && a.state !== 'alert') this.alert(a, best);
      else if (a.suspicion > 0.2 && a.state === 'idle') a.state = 'suspicious';
    } else {
      a.seenT = (a.seenT ?? 0) + dt;
      a.suspicion = Math.max(0, a.suspicion - dt * 0.25);
      if (a.state === 'alert' && a.seenT > 5) { a.state = 'searching'; a.searchT = 20; this.bark(a, 'lost'); }
      if (a.state === 'suspicious' && a.suspicion <= 0) a.state = 'idle';
    }
  }
  alert(a, t) {
    a.state = 'alert'; a.suspicion = 1.2; a.reaction = TUNING.enemyReaction;
    if (t) a.lastKnown = [t.x, t.z];
    this.bark(a, 'spotted');
    // Squad members share the last known position.
    for (const o of this.list) if (o !== a && o.alive && o.ctrl && o.faction === a.faction && Math.hypot(o.x - a.x, o.z - a.z) < 60 && o.state !== 'alert' && o.burning <= 0) { o.state = 'alert'; o.reaction = TUNING.enemyReaction + 0.3; o.lastKnown = a.lastKnown; o.suspicion = 1; }
    this.game.onAlert?.(a);
  }
  los(a, t) {
    from.set(a.x, a.y + 1.5, a.z);
    const ty = t.y + (t.crouched ? 0.7 : 1.3);
    dirV.set(t.x - a.x, ty - from.y, t.z - a.z);
    const d = dirV.length(); dirV.divideScalar(d || 1);
    const hit = this.ctx.physics.castRay(from, dirV, d, undefined, a.ctrl?.body);
    if (!hit) return true;
    if (hit.distance >= d - 0.6) return true;
    const owner = this.game.world.owners.get(hit.collider.handle);
    if (owner?.type === 'player' || owner?.ref === t) return true;
    return owner?.type === 'vehicle' && t.vehicle === owner.ref;
  }
  doFleeFire(a) { const w = this.game.world.wind, side = a.id % 2 ? 1 : -1; a.moveTo = [a.x - w.z * side * 14 + w.x * -6, a.z + w.x * side * 14 + w.z * -6]; a.path = null; a.speedWanted = 1.25; a.fireAt = null; a.fleeingFire = 1; if (this.rng.next() < 0.02) this.bark(a, 'fire'); return 'running'; }
  doPanic(a, dt) {
    a.burning -= dt; a.fireAt = null;
    if (!a.panicDir || this.rng.next() < dt * 2) { const k = this.rng.range(0, 6.28); a.panicDir = [Math.cos(k), Math.sin(k)]; }
    a.moveTo = [a.x + a.panicDir[0] * 6, a.z + a.panicDir[1] * 6]; a.speedWanted = 1.3; a.path = null;
    this.game.world.fire.ignite(a.x, a.z, 1);
    this.damage(a, (a.maxHp / 5) * dt, { fire: true, by: a.burnBy, silent: true });
    return 'running';
  }
  doDodge(a, dt) { a.dodgeT -= dt; a.speedWanted = 1.2; a.fireAt = null; if (!a.moveTo) { const k = this.rng.range(0, 6.283); a.moveTo = [a.x + Math.cos(k) * 7, a.z + Math.sin(k) * 7]; a.path = null; } return 'running'; }
  doCombat(a, dt) {
    const t = a.target;
    a.reaction = Math.max(0, a.reaction - dt);
    if (a.jamT > 0) { a.jamT -= dt; a.fireAt = null; a.speedWanted = 0; return 'running'; }
    if (t) {
      a.lookAtYaw = Math.atan2(t.x - a.x, t.z - a.z);
      if (a.reaction <= 0 && !a.stationaryLock) {
        const d = Math.hypot(t.x - a.x, t.z - a.z);
        if (d < a.spec.range) { a.fireAt = t; if (a.burstLeft <= 0 && a.nextBurst <= 0) { a.burstLeft = this.rng.int(a.spec.burst[0], a.spec.burst[1]); a.nextBurst = this.rng.range(0.7, 1.8); } }
      }
    } else a.fireAt = null;
    a.nextBurst = (a.nextBurst ?? 0) - dt;
    if (a.stationary) { a.speedWanted = 0; return 'running'; }
    a.repositionT -= dt;
    if (a.repositionT <= 0 || (!a.moveTo && !t)) {
      a.repositionT = this.rng.range(4, 8);
      const lk = t ? [t.x, t.z] : a.lastKnown ?? [a.x, a.z];
      const cover = this.findCover(a, lk);
      if (cover) this.goTo(a, cover[0], cover[1]);
      else if (a.id % 3 === 0) { const side = a.id % 2 ? 1 : -1, ang = Math.atan2(lk[1] - a.z, lk[0] - a.x) + side * 1.1; this.goTo(a, lk[0] - Math.cos(ang) * 22, lk[1] - Math.sin(ang) * 22); } // the flanker
      else this.goTo(a, a.x + this.rng.range(-8, 8) + (lk[0] - a.x) * 0.25, a.z + this.rng.range(-8, 8) + (lk[1] - a.z) * 0.25);
      a.speedWanted = 1;
    }
    return 'running';
  }
  findCover(a, threat) {
    const site = a.site ? this.game.world.sites[a.site] : null; if (!site) return null;
    const cover = site.coverPoints ??= (site.def.props ?? []).filter((p) => ['sandbags', 'crate', 'crate-stack', 'oil-drum', 'barrel', 'shack'].includes(p[0])).map((p) => [site.def.at[0] + p[1], site.def.at[1] + p[2]]);
    let best = null, bd = 1e9;
    for (const c of cover) { const d = dist2(c[0], c[1], a.x, a.z); if (d < 14 && d < bd) { const l = Math.hypot(c[0] - threat[0], c[1] - threat[1]) || 1; best = [c[0] + ((c[0] - threat[0]) / l) * 1.3, c[1] + ((c[1] - threat[1]) / l) * 1.3]; bd = d; } }
    return best;
  }
  doSearch(a, dt) {
    a.fireAt = null; a.searchT -= dt;
    if (a.lastKnown && !a.stationary && (!a.moveTo || a.searchGo !== a.lastKnown)) { a.searchGo = a.lastKnown; this.goTo(a, a.lastKnown[0] + this.rng.range(-4, 4), a.lastKnown[1] + this.rng.range(-4, 4)); }
    a.speedWanted = 0.7;
    if (a.searchT <= 0) { a.state = 'idle'; a.lastKnown = null; a.moveTo = null; a.path = null; }
    return 'running';
  }
  doDuty(a, dt) {
    a.fireAt = null;
    const night = this.game.world.isNight();
    if (a.duty === 'patrol') {
      a.speedWanted = 0.45;
      if (!a.moveTo) { a.waitT = (a.waitT ?? 0) - dt; if (a.waitT <= 0) { const R = 16; this.goTo(a, a.homeX + this.rng.range(-R, R), a.homeZ + this.rng.range(-R, R)); a.waitT = this.rng.range(2, 6); } }
    } else if (a.duty === 'follow') {
      const p = this.game.player;
      if (dist2(a.x, a.z, p.x, p.z) > 8) { a.moveTo = [p.x + 3, p.z + 3]; a.path = null; a.speedWanted = 1.2; } else a.moveTo = null;
    } else if (a.duty === 'walkTo' && a.goal) { this.goTo(a, a.goal[0], a.goal[1]); a.speedWanted = a.goalSpeed ?? 1; } else { a.speedWanted = 0; }
    a.asleep = night && a.duty === 'sit';
    return 'running';
  }
  goTo(a, x, z) { a.moveTo = [x, z]; a.path = null; a.pathI = 0; a.wantPath = true; }
  fixed(dt) {
    const game = this.game; this.pathBudget = 2;
    const stepPhase = game.world.stepCount % 6;
    for (const a of [...this.list]) {
      if (!a.alive) continue;
      if (a.down) { this.fixedDown(a, dt); continue; }
      if (!a.ctrl) continue;
      if (a.brainPhase === stepPhase) { this.perceive(a, 0.1); a.tree.tick(0.1); if (!a.ctrl || !a.alive) continue; }
      // Fire on this cell lights people.
      if (a.burning <= 0 && !a.fireproof && game.world.fire.isBurning(a.x, a.z)) { a.burning = 5; a.burnPanic = 1; a.state = 'burning'; this.bark(a, 'fire', true); game.audio.scream(a); }
      this.move(a, dt);
      this.shoot(a, dt);
      if (!a.ctrl) continue;
      a.barkT -= dt;
    }
    for (let i = this.corpses.length - 1; i >= 0; i--) { const c = this.corpses[i]; c.t -= dt; if (c.t < 34 && !c.frozen) { c.frozen = true; c.view.freeze(); } if (c.t <= 0) { c.view.dispose(); this.corpses.splice(i, 1); } }
  }
  move(a, dt) {
    const ctrl = a.ctrl; let mx = 0, mz = 0;
    if (a.wantPath && this.pathBudget > 0 && this.game.nav && a.moveTo) {
      a.wantPath = false; this.pathBudget--;
      if (dist2(a.x, a.z, a.moveTo[0], a.moveTo[1]) > 14) { const p = this.game.nav.path([a.x, 0, a.z], [a.moveTo[0], 0, a.moveTo[1]]); if (p?.length) { a.path = p; a.pathI = 0; } }
    }
    let gx = null, gz = null;
    if (a.path && a.pathI < a.path.length) { gx = a.path[a.pathI][0]; gz = a.path[a.pathI][2]; if (dist2(a.x, a.z, gx, gz) < 1.4) { a.pathI++; if (a.pathI >= a.path.length) { a.path = null; a.moveTo = null; gx = gz = null; } } }
    else if (a.moveTo) { gx = a.moveTo[0]; gz = a.moveTo[1]; if (dist2(a.x, a.z, gx, gz) < 1.0) { a.moveTo = null; gx = gz = null; } }
    const speed = a.speedWanted ?? 0;
    if (gx !== null && speed > 0) {
      const dx = gx - a.x, dz = gz - a.z, l = Math.hypot(dx, dz) || 1;
      mx = (dx / l) * Math.min(1, speed); mz = (dz / l) * Math.min(1, speed);
      if (!a.fireAt && a.lookAtYaw === null) a.yawGoal = Math.atan2(dx, dz);
      else a.yawGoal = a.lookAtYaw ?? Math.atan2(dx, dz);
    } else if (a.lookAtYaw !== null) a.yawGoal = a.lookAtYaw;
    a.lookAtYaw = null;
    ctrl.speed = a.spec.speed * Math.max(1, speed) * (this.game.world.land.waterDepth(a.x, a.z) > 0.3 ? 0.6 : 1);
    if (!a.stationary) { moveV.set(mx, 0, mz); ctrl.setInput(moveV, false, false); ctrl.fixedUpdate(dt); }
    const f = a.stationary ? null : ctrl.feet;
    if (f) { a.x = f.x; a.y = f.y; a.z = f.z; }
    a.moving = Math.hypot(mx, mz) > 0.05;
    if (a.yawGoal !== undefined) { let d = a.yawGoal - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += clamp(d, -5 * dt, 5 * dt); }
    a.runFrac = speed;
  }
  shoot(a, dt) {
    a.nextShot -= dt;
    const t = a.fireAt;
    if (!t || a.burstLeft <= 0 || a.nextShot > 0 || a.burning > 0) return;
    a.nextShot = 1 / a.spec.rate; a.burstLeft--; a.firedT = this.game.world.time;
    // Their guns jam too. That is an opening.
    a.cond = Math.max(0, a.cond - 0.15);
    const jam = TUNING.jamRate * 0.12 * (1 - a.cond / 100) ** 2 * 0.2;
    if (this.rng.next() < jam) { a.jamT = 3; a.burstLeft = 0; a.view?.flashUpper('UnjamSwear'); this.bark(a, 'jammed', true); this.game.audio.at('jam-click', a.x, a.y + 1, a.z, 40); return; }
    if (a.role === 'rocket') { // Rare, slow, and it lights the grass where it lands.
      const dx = t.x - a.x, dy = t.y + 1 - (a.y + 1.5), dz = t.z - a.z, l = Math.hypot(dx, dy, dz) || 1, k = this.rng.range(-0.02, 0.02);
      this.game.projectiles.spawn('rocket', a.x + (dx / l) * 0.9, a.y + 1.5, a.z + (dz / l) * 0.9, dx / l + k, dy / l, dz / l - k, a);
      this.game.audio.at('rocket', a.x, a.y + 1.4, a.z, 300);
    } else this.game.combat.npcShot(a, t);
    if (a.view) a.view.flashUpper('FireRecoil');
  }
  /** Damage. `o`: { by, fire, zone, silent, push } */
  damage(a, dmg, o = {}) {
    if (!a.alive || a.down) return;
    if (a.invulnerable) return;
    a.hp -= dmg;
    if (a.ctrl && o.by && o.by.kind === 'player') { a.lastKnown = [o.by.x, o.by.z]; if (a.state !== 'alert' && !a.friendly) { this.alert(a, o.by); } a.provokedBy = true; }
    if (a.hp <= 0) { if (a.buddy) this.goDown(a, o); else this.kill(a, o); return; }
    if (!o.silent && a.view) { a.view.flashUpper('HitReact'); }
  }
  goDown(a, o = {}) {
    a.hp = 0; a.down = true; a.downT = 40; a.burningDown = !!o.fire; a.moveTo = null; a.fireAt = null;
    a.view?.setFull('WoundedSit');
    this.game.buddies.onDown(a, o);
  }
  fixedDown(a, dt) { a.downT -= dt; if (a.downT <= 0) { a.down = false; this.kill(a, { silent: true, bledOut: true }); } }
  kill(a, o = {}) {
    if (!a.alive) return;
    a.alive = false; a.state = 'dead';
    if (a.ctrl) { this.game.world.owners.delete(a.ctrl.collider.handle); this.ctx.physics.remove(a.ctrl.body); a.ctrl = null; }
    const game = this.game;
    game.events.emit('actorDied', a, o);
    if (!o.silent) this.barkNearby(a, 'down');
    if (a.view) {
      if (o.fire || !o.push || Math.hypot(a.x - game.player.x, a.z - game.player.z) > 70) a.view.setFull('Death', true);
      else a.view.ragdoll(o.push);
      this.corpses.push({ view: a.view, t: 40 });
      if (this.corpses.length > 30) { const c = this.corpses.shift(); c.view.dispose(); }
      a.view = null;
    }
    this.byId.delete(a.id);
    const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1);
    if (a.site) { const s = game.world.sites[a.site]; if (s) { s.actors = s.actors.filter((x) => x !== a); game.onSiteCheck?.(s); } }
  }
  remove(a) { if (a.ctrl) { this.game.world.owners.delete(a.ctrl.collider.handle); this.ctx.physics.remove(a.ctrl.body); a.ctrl = null; } a.view?.dispose(); a.view = null; a.alive = false; this.byId.delete(a.id); const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1); }
  clear() { for (const a of [...this.list]) this.remove(a); for (const c of this.corpses) c.view.dispose(); this.corpses.length = 0; }
  update(dt) {
    const camX = this.game.camX ?? 0, camZ = this.game.camZ ?? 0;
    for (const a of this.list) {
      if (!a.view) continue;
      const dist = Math.hypot(a.x - camX, a.z - camZ);
      a.view.object.visible = dist < 400;
      if (dist > 400) continue;
      const v = a.view;
      if (a.down) { v.place(a.x, a.y, a.z, a.yaw); v.update(dt); continue; }
      v.place(a.x, a.stationary ? this.game.world.land.heightAt(a.x, a.z) + (a.y0 ?? 0) : a.y, a.z, a.yaw);
      if (a.burning > 0) v.setFull('BurnPanic');
      else if (a.asleep && a.state === 'idle') v.setFull('Sleep');
      else if (a.duty === 'sit' && a.state === 'idle') v.setFull('Sit');
      else {
        const run = a.moving && a.runFrac > 0.8, walk = a.moving;
        v.setLower(run ? 'Run' : walk ? 'Walk' : 'Idle', run ? 1.1 : 1);
        v.setUpper(a.state === 'alert' || a.state === 'searching' || a.state === 'suspicious' ? (walk ? 'AimWalk' : 'AimIdle') : 'AimIdle');
      }
      v.update(dt);
    }
    for (const c of this.corpses) c.view.update(dt);
  }
  /** Projected ? and ! over heads, close by. */
  overheads() { return this.list.filter((a) => a.alive && !a.friendly && a.ctrl && (a.state === 'suspicious' || a.state === 'alert') && Math.hypot(a.x - this.game.player.x, a.z - this.game.player.z) < 45); }
}
export { KIND, WATER_Y };
mixin(Actors, SquadPart);
