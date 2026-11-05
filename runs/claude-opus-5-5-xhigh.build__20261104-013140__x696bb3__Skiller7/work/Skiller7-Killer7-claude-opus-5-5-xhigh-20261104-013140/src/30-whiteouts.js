/* WHITEOUTS (§7.6): people the Föhn touched, laughing themselves invisible. Each type's numbers are in
 * content/enemies.js; their behaviours are here (ai: walker, runner, sled, thrower, twins, plow, inspector, bloom,
 * dancer, crawler). They walk flow fields indoors and straight lines on terrain, keep a metre apart, giggle up when
 * they reach you and burst. */
const WARM_SPOTS = { head: [.6, 0, 30], chest: [2.2, 0, 22], belly: [2.6, 0, 15.5], knee: [1.6, 1.8, 7.5], hand: [2.4, 5.4, 13], back: [-3.2, 0, 20], high: [0, 0, 44] };
const LAUGH_STYLES = ['giggle', 'cackle', 'chuckle', 'wheeze'];
Object.assign(Sim.prototype, {
  spawnEnemy(type, at, o = {}) {
    const ED = S7.ENEMIES[type]; if (!ED) throw new Error('unknown enemy ' + type);
    const p = Array.isArray(at) ? at : [at.x, at.y];
    const x = Array.isArray(at) ? p[0] * M : p[0], y = Array.isArray(at) ? p[1] * M : p[1];
    const size = (o.size || ED.size || 1) * (1 + (S7.rnd('spawn') - .5) * .16);
    const e = {
      id: this.uid++, type, x, y, z: this.grid.floorAt(x, y) + (o.z || 0), facing: Math.atan2(this.hero.y - y, this.hero.x - x), size,
      hp: (o.hp || ED.hp) * T.enemyHP, maxHp: (o.hp || ED.hp) * T.enemyHP, alive: true, reveal: o.reveal || 0, wave: o.wave || null, t: S7.rnd('spawn') * 3,
      speed: (ED.speed[0] + (ED.speed[1] - ED.speed[0]) * S7.rnd('spawn')) * this.diff().speed * T.enemySpeed * (o.speedK || 1),
      warm: o.warm || ED.warm || S7.pick('spawn', ['head', 'chest', 'belly', 'knee', 'hand']), warmSide: S7.rnd('spawn') < .5 ? -1 : 1,
      style: ED.laugh || LAUGH_STYLES[Math.floor(S7.rnd('laugh') * 4)], pitch: (S7.rnd('laugh') - .5) * 6, laughT: 1 + S7.rnd('laugh') * 3,
      tint: ['#f6f2f4', '#f2f6fa', '#f8f4ee', '#f0f6f2', '#f6f0f6'][Math.floor(S7.rnd('spawn') * 5)], kx: 0, ky: 0, giggle: 0,
      shield: !!ED.shield, turned: false, turnT: 0, cycle: 0, passive: !!ED.passive, warmOpen: true, spots: ED.spots ? ED.spots : 0,
      hat: ED.hats ? S7.pick('spawn', ED.hats) : null, vx: 0, vy: 0, data: o.data || {}
    };
    if (o.facing !== undefined) e.facing = o.facing;
    if (ED.init) ED.init(this, e, o);
    this.enemies.push(e);
    this.emit('spawn', { enemy: e });
    return e;
  },
  /** where an enemy's warm spot is this step (world units) */
  warmPos(e) {
    const ED = S7.ENEMIES[e.type];
    if (ED.warmAt) return ED.warmAt(this, e);
    const w = WARM_SPOTS[e.warm] || WARM_SPOTS.chest, f = e.facing + (e.turned ? Math.PI : 0), c = Math.cos(f), s = Math.sin(f), k = e.size;
    let lx = w[0], ly = w[1] * e.warmSide, lz = w[2];
    if (ED.ai === 'twins') { const a = this.time * 1.4 + e.id; lx = Math.cos(a) * 5.5; ly = Math.sin(a) * 5.5; lz = 19; }
    return [e.x + (lx * c - ly * s) * k, e.y + (lx * s + ly * c) * k, e.z + lz * k + (e.sinkZ || 0)];
  },
  updateEnemies(dt) {
    const h = this.hero, pc = [h.x, h.y, h.z];
    const G = this.grid, flow = G.kind === 'level' ? G.flow(Math.floor(h.x / M), Math.floor(h.y / M)) : null;
    const frozenPlay = this.switching || this.areaDef.kind === 'room7' || this.mode === 'frozen' || this.cutscene;
    for (const e of this.enemies) {
      const ED = S7.ENEMIES[e.type];
      if (!e.alive) {   // melting into red slush
        e.melting += dt; if (e.melting > .8) e.gone = true;
        continue;
      }
      e.t += dt;
      if (e.hurtT > 0) e.hurtT -= dt;
      if (e.burn > 0) { e.burn -= dt; e.hp -= 5 * dt; if (e.hp <= 0) { this.kill(e, false); continue; } }
      if (e.marked > 0) e.marked -= dt;
      // laughter: louder and quicker as it nears
      const dist = V.dist2([e.x, e.y], [h.x, h.y]);
      e.laughT -= dt;
      if (e.laughT <= 0 && !ED.silent) {
        e.laughT = (1.6 + S7.rnd('laugh') * 2.4) * clamp(dist / (25 * M), .35, 1.4);
        this.emit('laugh', { enemy: e, style: e.style, at: [e.x, e.y, e.z + 28 * e.size], pitch: e.pitch, loud: clamp(1 - dist / (60 * M), 0, 1) });
        e.laughPose = .5;
      }
      if (e.laughPose > 0) e.laughPose -= dt;
      if (e.kneel > 0) { e.kneel -= dt; continue; }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (frozenPlay && e.giggle > 0) continue;
      // knockback slides
      if (e.kx || e.ky) { this.moveEnemy(e, e.kx * dt, e.ky * dt); e.kx *= Math.pow(.02, dt); e.ky *= Math.pow(.02, dt); if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0; }
      // the giggle-up: 0.35 s of swelling, then the burst
      if (e.giggle > 0) {
        e.giggle += dt;
        if (e.giggle >= .35) { this.burst(e); }
        continue;
      }
      const ai = AI[ED.ai] || AI.walker;
      ai(this, e, ED, dt, flow, dist);
      if (ED.contact && !frozenPlay && dist < 1.5 * M * Math.max(1, e.size) && Math.abs(e.z - h.z) < 2.5 * M && this.mode !== 'frozen') { e.giggle = .001; this.emit('giggleup', { enemy: e }); }
    }
    // keep a metre apart
    const L = this.enemies;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (!a.alive || !b.alive || a.fixed || b.fixed) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = M * (a.size + b.size) * .5;
      if (d > 0 && d < min) { const p = (min - d) / 2 / d; this.moveEnemy(a, -dx * p, -dy * p); this.moveEnemy(b, dx * p, dy * p); }
    }
    this.enemies = this.enemies.filter(e => !e.gone);
  },
  /** move an enemy, sliding along walls; z follows the floor */
  moveEnemy(e, dx, dy) {
    const G = this.grid, ok = (x, y) => G.kind === 'terrain' ? true : G.walkable(Math.floor(x / M), Math.floor(y / M)) && Math.abs(G.floorAt(x, y) - e.z) < 20;
    if (ok(e.x + dx, e.y + dy)) { e.x += dx; e.y += dy; }
    else if (ok(e.x + dx, e.y)) e.x += dx;
    else if (ok(e.x, e.y + dy)) e.y += dy;
    if (!e.fly) e.z = G.floorAt(e.x, e.y) + (e.hover || 0);
  },
  /** walk toward the player along the flow field (indoors) or straight (outdoors) */
  chase(e, dt, flow, speed, wobble) {
    const h = this.hero; let d = this.grid.kind === 'level' ? this.grid.flowDir(flow, e.x, e.y) : null;
    if (!d) { const dx = h.x - e.x, dy = h.y - e.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; }
    if (wobble) { const s = Math.sin(e.t * wobble[1] * TAU) * wobble[0], px = -d[1], py = d[0]; d = [d[0] + px * s, d[1] + py * s]; const l = Math.hypot(d[0], d[1]) || 1; d = [d[0] / l, d[1] / l]; }
    e.vx = d[0] * speed; e.vy = d[1] * speed;
    this.moveEnemy(e, d[0] * speed * dt, d[1] * speed * dt);
    e.facing = Math.atan2(h.y - e.y, h.x - e.x) * .3 + Math.atan2(d[1], d[0]) * .7;
    e.facing = Math.atan2(Math.sin(e.facing), Math.cos(e.facing));
  },
  burst(e) {
    const ED = S7.ENEMIES[e.type], h = this.hero;
    e.alive = false; e.melting = 0; e.burst = true;
    const d = V.dist2([e.x, e.y], [h.x, h.y]);
    if (d < (ED.blast || 1.5) * M * 1.6 && !this.switching && this.areaDef.kind !== 'room7') this.hurtPlayer(ED.contact * T.explodeDamage, [e.x, e.y, e.z + 16], 'burst');
    this.emit('explode', { at: [e.x, e.y, e.z + 16], radius: (ED.blast || 1.5) * M, kind: 'burst', enemy: e });
    if (this.echoRun) this.echoRun.penalty(this, e);
  },
  killAllEnemies() { for (const e of this.enemies) if (e.alive && !S7.ENEMIES[e.type].boss) this.kill(e, true); }
});

/* ---- behaviours ---- */
const AI = S7.AI = {
  walker(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.25, .5]); },
  runner(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.55, .8]); },
  /** a Tobogganer: rides straight at you, quickly; downhill it speeds up */
  sled(sim, e, ED, dt) {
    const h = sim.hero, dx = h.x - e.x, dy = h.y - e.y, l = Math.hypot(dx, dy) || 1;
    if (!e.dir) e.dir = [dx / l, dy / l];
    e.dir = [e.dir[0] * .97 + dx / l * .03, e.dir[1] * .97 + dy / l * .03];
    const dl = Math.hypot(e.dir[0], e.dir[1]) || 1;
    sim.moveEnemy(e, e.dir[0] / dl * e.speed * dt, e.dir[1] / dl * e.speed * dt);
    e.facing = Math.atan2(e.dir[1], e.dir[0]);
  },
  /** a Snowballer: stands and throws every 2.6 s between 25 and 60 m (ice cubes indoors) */
  thrower(sim, e, ED, dt) {
    const h = sim.hero, d = V.dist2([e.x, e.y], [h.x, h.y]);
    e.facing = Math.atan2(h.y - e.y, h.x - e.x);
    e.throwT = (e.throwT === undefined ? 1 + S7.rnd('spawn') * 1.5 : e.throwT) - dt;
    if (e.throwT <= 0) {
      e.throwT = ED.every || 2.6;
      if (d < (ED.reach || 60) * M && sim.grid.los([e.x, e.y, e.z + 28], [h.x, h.y, h.z + 20])) {
        sim.throwAt([e.x, e.y, e.z + 30 * e.size], sim.grid.kind === 'terrain' || sim.areaDef.outdoor ? 'snowball' : 'icecube', { dmg: ED.throwDmg || 8, speed: 220, g: 120, red: 2 });
        e.throwPose = .4;
      }
    }
    if (e.throwPose > 0) e.throwPose -= dt;
    if (d < 6 * M && ED.flee) sim.moveEnemy(e, -(h.x - e.x) / d * 30 * dt, -(h.y - e.y) / d * 30 * dt);
  },
  twins(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.2, .4]); },
  /** a Plow: an ice slab in front; every 3.5 s it stops, laughs and turns its back for 1.2 s */
  plow(sim, e, ED, dt, flow) {
    e.cycle += dt;
    if (e.turnT > 0) { e.turnT -= dt; e.turned = true; if (e.turnT <= 0) { e.turned = false; e.cycle = 0; } return; }
    if (e.cycle > 3.5) { e.turnT = 1.2; e.cycle = 0; sim.emit('laugh', { enemy: e, style: 'cackle', at: [e.x, e.y, e.z + 30], pitch: -3, loud: 1 }); e.laughPose = 1.2; return; }
    sim.chase(e, dt, flow, e.speed, null);
    e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x);
  },
  /** an Inspector: never attacks; blinks between its three marks every 2.5 s; after 25 s it goes, and comes back */
  inspector(sim, e, ED, dt) {
    e.blinkT = (e.blinkT === undefined ? 2.5 : e.blinkT) - dt;
    e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x);
    const marks = e.data.marks || [];
    if (e.blinkT <= 0 && marks.length) {
      e.blinkT = 2.5; e.mi = ((e.mi || 0) + 1) % marks.length;
      const m = marks[e.mi]; sim.emit('blink', { from: [e.x, e.y, e.z], enemy: e }); e.x = m[0] * M; e.y = m[1] * M; e.z = sim.grid.floorAt(e.x, e.y); e.reveal = Math.max(e.reveal, .6);
    }
    if (e.t > 25 && !e.data.stay) { e.alive = false; e.gone = true; sim.emit('blink', { from: [e.x, e.y, e.z], enemy: e }); sim.say('The Inspector has stepped out.'); }
  },
  /** a Bloom: big, slow; a Giggler buds off every 4 s */
  bloom(sim, e, ED, dt, flow) {
    sim.chase(e, dt, flow, e.speed, [.1, .3]);
    e.budT = (e.budT === undefined ? 4 : e.budT) - dt;
    if (e.budT <= 0 && sim.enemies.filter(x => x.alive).length < 12) { e.budT = 4; const a = S7.rnd('spawn') * TAU; sim.spawnEnemy('giggler', [e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20], { reveal: 2, wave: e.wave }); sim.emit('bud', { at: [e.x, e.y, e.z] }); }
  },
  /** a dancing Giggler at the Jolly Four's ball: waltzes in a circle, closing in on the beat */
  dancer(sim, e, ED, dt, flow) {
    const h = sim.hero; e.ang = (e.ang === undefined ? Math.atan2(e.y - h.y, e.x - h.x) : e.ang) + dt * .9;
    const r = Math.max(1.2 * M, (e.r === undefined ? (e.r = V.dist2([e.x, e.y], [h.x, h.y])) : e.r) - dt * e.speed * .55);
    e.r = r;
    const tx = h.x + Math.cos(e.ang) * r, ty = h.y + Math.sin(e.ang) * r;
    sim.moveEnemy(e, (tx - e.x) * Math.min(1, dt * 4), (ty - e.y) * Math.min(1, dt * 4));
    e.facing = e.ang + Math.PI / 2;
  },
  /** a Cable Crawler: hand over hand along the gondola's cable toward the cabin, bursting on its roof */
  crawler(sim, e, ED, dt) {
    const c = sim.cabinPos ? sim.cabinPos() : [sim.hero.x, sim.hero.y, sim.hero.z + 50];
    const d = V.sub(c, [e.x, e.y, e.z]), L = V.len(d);
    if (L < 1.4 * M) { sim.burst(e); return; }
    e.x += d[0] / L * e.speed * dt; e.y += d[1] / L * e.speed * dt; e.z += d[2] / L * e.speed * dt;
    e.facing = Math.atan2(d[1], d[0]);
  },
  /** stands where it is (window climbers before they jump, frozen tableaux turned) */
  idle(sim, e) { e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x); }
};
