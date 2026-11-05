/* MASH TV — 08-collide: the shot collisions, the foe bullets against contestants, the near misses and the tomato splats.
 * It extends World (07) with methods that need no state of their own. */

Object.assign(World.prototype, {
  // player shots against enemies and bosses: the first target hit takes the shot (kernels pierce one more)
  collideShots(dt) {
    for (const s of this.pShots) {
      if (s.dead) continue;
      if (this.boss && this.boss.alive && this.boss.hitBy(s, this)) { if (!s.pierce) { s.dead = true; continue; } }
      for (const e of this.enemies) {
        if (!e.alive || s.hitSet && s.hitSet.has(e)) continue;
        if (MT.dist(s.x, s.y, e.x, e.y) < e.r + s.r) {
          this.damageEnemy(e, s.dmg, s.owner);
          if (s.pierce !== undefined) { (s.hitSet || (s.hitSet = new Set())).add(e); if (--s.pierce < 0) { s.dead = true; } }
          else s.dead = true;
          if (s.dead) break;
        }
      }
    }
    this.pShots = this.pShots.filter(s => !s.dead);
  },
  // foe bullets against contestants: a hit costs what the bullet does; a bullet within 7 is a near miss (+0.5, three a second)
  collideFoes(dt) {
    this.nearMissT = Math.max(0, (this.nearMissT || 0) - dt);
    for (const s of this.fShots) {
      if (s.dead) continue;
      for (const c of this.players) {
        if (!c.inPlay || c.state === 'out') continue;
        const d = MT.dist(s.x, s.y, c.x, c.y);
        if (d < c.r + s.r) {
          if (s.kind === 'shell') this.blastRing(s.x, s.y, 16, 1, null);
          else this.hurtPlayer(c, s.dmg, s);
          s.dead = true; break;
        }
        if (d < 7 + c.r && !s.nearMiss && this.nearMissT <= 0) { s.nearMiss = true; this.nearMissT = .34; this.ratingsAdd(.5, 'near'); }
      }
      if (!s.dead && s.kind === 'shell' && !MT.inArena(s.x, s.y, -6)) { this.blastRing(s.x, s.y, 16, 1, null); s.dead = true; }
    }
    this.fShots = this.fShots.filter(s => !s.dead);
  },
  // a tomato lands: a splat that hurts within 10 and slows walkers for 6 s (§5.8)
  tomatoSplat(l) {
    this.splats.push({ x: l.x, y: l.y, r: 14, t: 6, puddle: true });
    for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, l.x, l.y) < 10) this.hurtPlayer(c, 1, { x: l.x, y: l.y });
    this.emit('splat', { x: l.x, y: l.y });
  },
  // the room's pickups that are placed at its start (capsules on a timer, the keys on belts)
  scheduleItems() {
    for (const it of (this.R.items || [])) {
      const [t, kind, where] = it;
      this.tasks.push(MT.task((function* (W) {
        yield t;
        const at = where === 'center' ? [184, 120] : where === 'drop' ? W.randomFreePoint() : Array.isArray(where) ? [24 + where[0] * 16, 24 + where[1] * 16] : [184, 120];
        W.pickups.push(W.mkPickup(kind === 'bomb' || kind === 'life' ? kind : 'capsule', at[0], at[1], { cap: kind }));
      })(this)));
    }
  }
});
