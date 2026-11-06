// Everyone who walks: squads by site with a simulation bubble, buddies, civilians, fauna, ground guns, the nav queue.
import { THREE, Boids, buildModel, compileClips, setLookLayer, InstancedBodies } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { SITES, POSTS, CASES } from '../content/sites.js';
import { Soldier } from './soldier.js';
import { Buddy, BUDDIES } from './buddy.js';
import { Civilians } from './civilian.js';
import { Fauna } from './fauna.js';
import { makePerson } from './rig.js';
import { MODELS } from '../art/models.js';
import { clamp, lerp, hash2, wrapAngle } from '../core/rng.js';
import { WEAPONS } from '../content/weapons.js';
const { Vector3 } = THREE;
const BUBBLE = 260, BUBBLE_OUT = 300;
const MILE_FORTY = SITES['mile-forty'].at;
export class Squad {
  members = []; angry = false; alive = 0; flanker = null; clearedAt = null; live = false; alertUntil = 0;
  constructor(game, key, def) { this.game = game; this.key = key; this.def = def; this.alive = def.n; }
  share(x, z, from) {
    for (const m of this.members) {
      if (m === from || m.dead || !m.active) continue;
      if (m.state !== 'alert') { m.lastKnown = { x, z }; m.state = 'searching'; m.searchT = 20; m.sleeping = false; if (Math.hypot(m.x - x, m.z - z) < 70) { m.state = 'alert'; m.reactT = TUNING.enemyReaction + 0.4; m.targetInfo = from.targetInfo; } }
      else m.lastKnown = { x, z };
    }
    this.flanker = this.flanker && !this.flanker.dead ? this.flanker : (this.members.find((m) => !m.dead && m !== from && m.role === 'rifle') ?? null);
  }
  onDeath(s) {
    this.alive = Math.max(0, this.alive - 1);
    if (this.alive === 0) { this.clearedAt = this.game.clock.abs; this.game.events.emit('squad-cleared', this.key, this); }
  }
}
export class Actors {
  soldiers = []; pool = []; squads = new Map(); buddies = []; pathQueue = []; dropped = []; heardT = 0; extra = [];
  scriptedFeverHold = false; bubbleT = 0; nearbyCoverT = 0;
  constructor(game) { this.game = game; this.civilians = new Civilians(game); this.fauna = new Fauna(game); }
  build(ctx) {
    for (const [key, s] of Object.entries(SITES)) if (s.squad) this.addSquadDef(key, { ...s.squad, at: s.at, tower: s.squad.tower, site: s });
    for (const [key, p] of Object.entries(POSTS)) this.addSquadDef(key, { faction: p.faction, n: p.n, at: p.at, post: p, yaw: p.yaw });
    // Guarded cases: three men and a shed, for one case's worth of trouble.
    for (const c of CASES) if (c.hint === 'guarded shed') this.addSquadDef(`case-${c.id}`, { faction: c.at[0] < 0 ? 'concord' : 'harvest', n: 3, at: c.at, noReman: true });
    for (const sq of this.squads.values()) sq.permanent = true;
    for (const b of Object.keys(BUDDIES)) this.buddies.push(new Buddy(this.game, b));
    this.civilians.build(ctx);
    this.fauna.build(ctx);
  }
  /** A new day: the guards at headquarters have short memories, when you are useful. */
  dayRoll() { for (const sq of this.squads.values()) if (sq.def.site?.hq) sq.angry = false; }
  addSquadDef(key, def) { const sq = new Squad(this.game, key, def); this.squads.set(key, sq); return sq; }
  reset() {
    for (const s of this.soldiers) s.despawn();
    this.pool.push(...this.soldiers); this.soldiers.length = 0;
    for (const [k, sq] of this.squads) { if (!sq.permanent) { this.squads.delete(k); continue; } sq.members = []; sq.alive = sq.def.n; sq.clearedAt = null; sq.live = false; sq.angry = false; sq.disabled = false; sq.forceLive = false; }
    this.pathQueue.length = 0;
    for (const d of this.dropped) { this.game.ctx.scene.remove(d.object); this.game.interact.remove(d.usable); }
    this.dropped.length = 0;
    for (const b of this.buddies) b.resetAll();
    this.civilians.reset();
    this.fauna.reset();
  }
  /** Hand back a soldier from the pool. */
  makeSoldier(ctx, o) {
    const s = this.pool.pop() ?? new Soldier(this.game);
    this.soldiers.push(s);
    s.spawn(ctx, o);
    return s;
  }
  release(s) {
    s.despawn();
    const i = this.soldiers.indexOf(s);
    if (i >= 0) this.soldiers.splice(i, 1);
    this.pool.push(s);
  }
  // ---- the bubble ----
  squadOrigin(sq) { return sq.def.at; }
  liveSquad(ctx, sq) {
    sq.live = true;
    const def = sq.def, g = this.game;
    const [cx, cz] = def.at;
    const r = g.rng.ai;
    const count = sq.alive;
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + r.range(-0.4, 0.4), rad = def.post ? r.range(3, 8) : r.range(6, Math.max(10, (def.site?.r ?? 20) * 0.5));
      let x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad;
      if (!g.world.nav.walkable(x, z)) { x = cx + r.range(-2, 2); z = cz + r.range(-2, 2); }
      let role = 'rifle';
      const opts = {};
      if (def.tower && i === 0) { role = 'sniper'; opts.fixed = true; x = cx + def.tower[0]; z = cz + def.tower[1]; opts.y = g.world.heightAt(x, z) + 4.6; }
      else if (i === count - 1 && count >= 5) role = 'mg';
      else if (i === 2 && count >= 8) role = 'rocket';
      const s = this.makeSoldier(ctx, { faction: def.faction, role, x, z, yaw: r.range(-3, 3), squad: sq, duty: def.duty ?? (i % 3 === 2 ? 'patrol' : 'guard'), ...opts });
      sq.members.push(s);
    }
    sq.flanker = sq.members.find((m) => m.role === 'rifle') ?? null;
    g.events.emit('squad-live', sq.key);
  }
  sleepSquad(sq) {
    for (const m of sq.members) if (m.active) this.release(m);
    sq.members = [];
    sq.live = false;
  }
  updateBubble(ctx) {
    const g = this.game;
    if (g.round?.isClient) return;
    const f = g.anchor();
    for (const sq of this.squads.values()) {
      if (sq.disabled) { if (sq.live) this.sleepSquad(sq); continue; }
      if (sq.def.when && !sq.def.when()) { if (sq.live) this.sleepSquad(sq); continue; }
      const [cx, cz] = sq.def.at, d = Math.hypot(cx - f.x, cz - f.z);
      if (!sq.live && (d < BUBBLE || sq.forceLive) && sq.alive > 0) this.liveSquad(ctx, sq);
      else if (sq.live && d > BUBBLE_OUT && !sq.forceLive) this.sleepSquad(sq);
      // A cleared post re-mans after postRemanHours; the source's instant respawn is an annoyance we do not copy.
      if (sq.alive === 0 && sq.clearedAt != null && !sq.def.noReman && g.clock.abs - sq.clearedAt >= TUNING.postRemanHours && d > 120) {
        if (sq.def.post || sq.def.remans) { sq.alive = sq.def.n; sq.clearedAt = null; if (sq.live) this.sleepSquad(sq); g.events.emit('squad-remanned', sq.key); }
      }
    }
  }
  // ---- targets and senses ----
  playerInfo() {
    const g = this.game, f = g.player.feet;
    return { kind: 'player', ref: 'player', x: f.x, y: f.y, z: f.z, eyeY: f.y + (g.player.stance === 'crouch' ? 0.9 : 1.45), fast: g.player.speedNow > 5, inVehicle: !!g.player.seat };
  }
  /** Who this soldier is angry at right now: the player, a buddy, the other army when the truce is over. */
  pickTarget(s) {
    const g = this.game;
    if (s.pickT > 0 && s.cachedTarget) { s.pickT -= 0.1; if (s.cachedTarget.refresh) s.cachedTarget.refresh(); return s.cachedTarget; }
    s.pickT = 0.5;
    let best = null, bd = 1e9;
    if (g.round) {
      for (const m of g.round.liveMercs()) {
        const d = Math.hypot(m.x - s.x, m.z - s.z);
        if (d < bd) { bd = d; best = m.targetInfo(); }
      }
      s.cachedTarget = best;
      return best;
    }
    if (g.hasPlayer && this.hostileToPlayer(s) && !g.dev.invisible) {
      const p = this.playerInfo();
      bd = Math.hypot(p.x - s.x, p.z - s.z); best = p;
      best.refresh = () => { const q = this.playerInfo(); Object.assign(best, q); };
    }
    for (const b of this.buddies) {
      if (!b.active || b.dead || b.isDown) continue;
      const d = Math.hypot(b.x - s.x, b.z - s.z);
      if (d < bd && d < 60) { bd = d; best = b.targetInfo(); }
    }
    if (g.story.war) {
      for (const o of this.soldiers) {
        if (!o.active || o.dead || o.faction === s.faction) continue;
        const d = Math.hypot(o.x - s.x, o.z - s.z);
        if (d < bd && d < 80) { bd = d; const w = o; best = { kind: 'soldier', ref: w, x: w.x, y: w.y, z: w.z, eyeY: w.y + 1.4, fast: false, refresh() { this.x = w.x; this.y = w.y; this.z = w.z; this.eyeY = w.y + 1.4; } }; }
      }
    }
    s.cachedTarget = best;
    return best;
  }
  hostileToPlayer(s) {
    const g = this.game, f = g.player.feet;
    // Inside Mile Forty, while the truce holds, nobody shoots.
    if (g.story.truce && Math.hypot(f.x - SITES['mile-forty'].at[0], f.z - SITES['mile-forty'].at[1]) < SITES['mile-forty'].noFire) return false;
    if (g.story.holdFireFaction === s.faction && !s.squad?.angry) return false;
    // Everyone else shoots on sight, with one exception: their pass, while you hold a contract from them. You also get time
    // to walk out after you report. Fire near them, or walk into the inner yard, and it ends.
    const grace = g.story.grace?.faction === s.faction && g.clock.abs < g.story.grace.until;
    if ((g.story.pass === s.faction || grace) && !s.squad?.angry) {
      const inner = this.innerYard(s.faction);
      if (inner && Math.hypot(f.x - inner.x, f.z - inner.z) < inner.r) return true;
      return false;
    }
    return true;
  }
  innerYard(faction) {
    const site = faction === 'concord' ? SITES['fort-clement'] : faction === 'harvest' ? SITES.granary : null;
    return site ? { x: site.at[0] + site.inner.dx, z: site.at[1] + site.inner.dz, r: site.inner.r } : null;
  }
  visionFor(s, tgt, dist) {
    const g = this.game;
    let v = TUNING.enemyVision * (s.role === 'sniper' ? 1.8 : 1);
    if (tgt.kind === 'player') {
      const p = g.player;
      if (p.stance === 'crouch') v *= 0.55;
      if (p.inGrass && g.ground.kindAt(p.feet.x, p.feet.z) !== 1) v *= p.stance === 'crouch' || !p.moving ? 0.6 : 0.85;
      if (g.clock.isNight()) { v *= 0.45; if (g.time < p.litUntil || g.body.burning > 0 || g.fireView.nearestDist < 30) v *= 2; }
    } else if (g.clock.isNight()) v *= 0.6;
    return v;
  }
  /** A shot rings out: everyone inside the radius wakes. */
  heardGunshot(x, z, radius, who) {
    const g = this.game;
    for (const s of this.soldiers) {
      if (!s.active || s.dead) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d > radius) continue;
      s.sleeping = false;
      if (who === 'player' && s.squad && g.story.pass === s.faction && d < 60) s.squad.angry = true;
      if (s.state === 'idle' || s.state === 'suspicious') { s.state = 'searching'; s.searchT = 20; s.lastKnown = { x: x + g.rng.ai.range(-12, 12), z: z + g.rng.ai.range(-12, 12) }; if (s.barkCool <= 0) { g.voice.bark(s, 'heard'); s.barkCool = 5; } }
      else if (s.state === 'searching') s.lastKnown = { x: x + g.rng.ai.range(-8, 8), z: z + g.rng.ai.range(-8, 8) };
    }
    this.civilians.heard(x, z, radius);
    this.fauna.scare(x, z, radius);
  }
  nearestCover(s, from) {
    const list = s.squad?.def.site?.cover;
    const g = this.game;
    let best = null, bd = 1e9;
    if (list) {
      const [cx, cz] = s.squad.def.at;
      for (const [dx, dz] of list) {
        const x = cx + dx, z = cz + dz, d = Math.hypot(x - s.x, z - s.z);
        if (d < bd) { bd = d; best = { x, z }; }
      }
    }
    if (best && bd < 28) {
      // Stand on the far side from the threat.
      const ax = best.x - from.x, az = best.z - from.z, l = Math.hypot(ax, az) || 1;
      return { x: best.x + (ax / l) * 1.4, z: best.z + (az / l) * 1.4 };
    }
    for (const t of g.treeColliders) {
      const d = Math.hypot(t.x - s.x, t.z - s.z);
      if (d < 12 && d < bd) { bd = d; const ax = t.x - from.x, az = t.z - from.z, l = Math.hypot(ax, az) || 1; best = { x: t.x + (ax / l) * 1.2, z: t.z + (az / l) * 1.2 }; }
    }
    return best;
  }
  requestPath(s) { if (!this.pathQueue.includes(s)) this.pathQueue.push(s); }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    // Paths: at most 2 per step.
    for (let i = 0; i < 2 && this.pathQueue.length; i++) {
      const s = this.pathQueue.shift();
      if (s.dead || !s.active || !s.goal) continue;
      s.path = g.world.nav.path([s.x, s.y, s.z], [s.goal.x, s.y, s.goal.z]);
      s.pathI = 1;
      if (!s.path) { s.goal = null; }
    }
    // Brains at 10 Hz, spread across steps.
    const tick = g.tick;
    for (let i = 0; i < this.soldiers.length; i++) {
      const s = this.soldiers[i];
      if (!s.active || s.dead || s.puppet) continue;
      if ((tick + s.id) % 6 === 0) {
        s.barkCool -= 0.1;
        if (!s.burning) s.perceive(0.1);
        s.tree.tick(0.1);
      }
      s.fixedUpdate(ctx, dt);
    }
    for (const b of this.buddies) b.fixedUpdate(ctx, dt);
    this.civilians.fixedUpdate(ctx, dt);
    if (tick % 30 === 0) this.updateBubble(ctx);
    if (tick % 60 === 7) this.tidyCorpses();
  }
  tidyCorpses() {
    const f = this.game.anchor();
    // Corpses far outside the bubble go back to the pool.
    for (let i = this.soldiers.length - 1; i >= 0; i--) {
      const s = this.soldiers[i];
      if (s.dead && !s.squad?.live && Math.hypot(s.x - f.x, s.z - f.z) > 200) this.release(s);
    }
  }
  update(ctx, dt) {
    for (const s of this.soldiers) s.update(ctx, dt);
    for (const b of this.buddies) b.update(ctx, dt);
    this.civilians.update(ctx, dt);
    this.fauna.update(ctx, dt);
    for (const d of this.dropped) if (d.object) d.object.rotation.y += 0;
  }
  /** A gun off the ground starts at condition 20 to 55. */
  dropGun(s) {
    const g = this.game;
    if (this.dropped.length > 14) { const old = this.dropped.shift(); g.ctx.scene.remove(old.object); g.interact.remove(old.usable); }
    const id = g.rng.ai.chance(0.82) ? 'tractor' : g.rng.ai.chance(0.5) ? 'mule' : 'm38';
    const cond = g.rng.ai.int(20, 55);
    const x = s.x + g.rng.ai.range(-0.5, 0.5), z = s.z + g.rng.ai.range(-0.5, 0.5), y = g.world.heightAt(x, z);
    const build = buildModel('ground-gun', { catalog: MODELS });
    build.object.position.set(x, y + 0.02, z); build.object.rotation.y = g.rng.ai.range(0, 6.28);
    setLookLayer(build.object, 'actors');
    g.ctx.scene.add(build.object);
    const d = { object: build.object, id, cond };
    d.usable = g.interact.add({ x, y: y + 0.2, z, r: 2, verb: () => `TAKE THE ${WEAPONS[id].name}`, when: () => !g.player.seat, onUse: () => { g.weapons.give(id, cond, true); g.ctx.scene.remove(build.object); g.interact.remove(d.usable); this.dropped.splice(this.dropped.indexOf(d), 1); g.sfx.play('gun-equip'); g.events.emit('pickup-gun', id); } });
    this.dropped.push(d);
  }
  // ---- buddies ----
  buddy(id) { return this.buddies.find((b) => b.id === id); }
  rescuer() {
    const g = this.game;
    // They come from the bar. Ines drives further than anyone else will.
    const f = g.player.feet, d = Math.hypot(f.x - MILE_FORTY[0], f.z - MILE_FORTY[1]);
    return this.buddies.find((b) => b.met && !b.dead && g.clock.abs >= b.spentUntil && g.clock.abs >= b.woundedUntil && (b.active || d <= b.def.rescueR)) ?? null;
  }
  startRescue(b) { b.rescue(); }
  liveBuddies() { return this.buddies.filter((b) => b.met && !b.dead); }
  anyStateCounts() { let live = 0; for (const s of this.soldiers) if (s.active && !s.dead) live++; return live; }
}
