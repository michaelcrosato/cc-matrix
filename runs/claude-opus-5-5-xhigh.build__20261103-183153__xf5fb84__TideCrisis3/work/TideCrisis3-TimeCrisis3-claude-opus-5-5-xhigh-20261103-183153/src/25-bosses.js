/* 25-bosses: the boss framework and the bosses.
 *   def('boss', id, { name, title, card, make(sim, B), step(sim, B, dt), draw(R, B, sim) (presentation), bars(B) })
 * A boss has named parts (hit volumes with hp, optional armor; a weak part pulses gold while it can be hurt), its own
 * rigs and meshes, and every attack goes through the ThreatDirector and the projectile system, so cover, telegraphs and
 * the tests work the same for bosses. Mini-bosses (Bulldog, The Gull, Seawolf) are spawned by a wave and have a bar but
 * no intro card. */
class Boss {
  constructor(sim, D) { this.id = D.id; this.D = D; this.parts = {}; this.t = 0; this.st = 0; this.state = 'intro'; this.dead = false; this.phaseName = 'intro'; this.rigs = []; this.meshes = []; this.mul = tune.enemy.bossHpMul * sim.diff.hp; this.flash = 0; }
  part(id, o) { const hp = (o.hp || 1) * (o.noMul ? 1 : this.mul); return this.parts[id] = Object.assign({ id, alive: true, open: true, flash: 0, vol: null }, o, { hp, max: hp }); }
  set(state, sim) { this.state = state; this.st = 0; if (sim) sim.ev({ type: 'bossstate', id: this.id, state }); }
  hpFrac() { return this.D.frac ? this.D.frac(this) : (() => { let a = 0, b = 0; for (const p of Object.values(this.parts)) if (!p.noBar) { a += Math.max(0, p.hp); b += p.max; } return b ? a / b : 0; })(); }
  rayTest(sim, ray) {
    let best = null;
    for (const p of Object.values(this.parts)) {
      if (!p.alive || !p.vol) continue;
      const v = p.vol, t = v.box ? rayCollider(ray.o, ray.d, v) : v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r);
      if (t >= 0 && (!best || t < best.t)) best = { t, part: p };
    }
    for (const r of this.rigs) if (r.vols && r.hit) for (const k in r.vols) { const v = r.vols[k], t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r); if (t >= 0 && (!best || t < best.t)) best = { t, part: r.hit, zone: k }; }
    return best;
  }
  hit(sim, h, p, dmg, w, at) {
    const part = h.part; if (!part || !part.alive) return false;
    if (part.armor || !part.open) { if (part.onArmor) part.onArmor(sim, this, w); sim.ev({ type: 'impact', at, mat: 'metal', armor: true }); return 0; }
    const k = (h.zone === 'head' ? 2 : h.zone === 'legs' ? .75 : 1) * (part.mul || 1) * (part.weapons && w ? (part.weapons[w] || 1) : 1);
    part.hp -= dmg * k; part.flash = 1; this.flash = .5;
    let pts = addScore(sim, p, 100, null); p.stats.hits++; addHitChain(p); if (h.zone === 'head') p.stats.heads++;
    sim.ev({ type: 'bosshit', part: part.id, at, head: h.zone === 'head' });
    if (part.onHit) part.onHit(sim, this, p, w, dmg * k);
    if (part.hp <= 0 && part.alive) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at }); pts += addScore(sim, p, part.score || 2000, at); if (part.onBreak) part.onBreak(sim, this, p); }
    return pts || 1;
  }
  blast(sim, at, r, dmg, p, kind) {
    this.blastRigs(sim, at, r, dmg, p, kind);
    for (const part of Object.values(this.parts)) {
      if (part.alive && part.vol && part.armor && part.onArmor && V3.dist(part.vol.c || (part.vol.a ? V3.lerp(part.vol.a, part.vol.b, .5) : [part.vol.cx, part.vol.cy, (part.vol.box[2] + part.vol.box[5]) / 2]), at) < r + (part.vol.r || 14)) part.onArmor(sim, this, kind === 'gl' ? 'gl' : 'blast');
      if (!part.alive || !part.vol || part.armor || !part.open) continue;
      const c = part.vol.c || V3.lerp(part.vol.a, part.vol.b, .5), d = V3.dist(c, at); if (d > r + (part.vol.r || 0)) continue;
      part.hp -= dmg * .6 * (part.weapons && kind === 'gl' ? (part.weapons.gl || 1) : 1); part.flash = 1;
      if (part.onHit) part.onHit(sim, this, p, kind === 'gl' ? 'gl' : 'blast', dmg * .6);
      if (part.hp <= 0) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at: c }); if (p) addScore(sim, p, part.score || 2000, c); if (part.onBreak) part.onBreak(sim, this, p); }
    }
  }
  colliders() { return this._cols || []; }
  /** an explosion near a rig-based part (Barracuda, Hammerhead, Krake) hurts it like a hit */
  blastRigs(sim, at, r, dmg, p, kind) {
    for (const rr of this.rigs) {
      const part = rr.hit; if (!part || !part.alive || !part.open || !rr.vols || !rr.vols.torso) continue;
      const c = V3.lerp(rr.vols.torso.a, rr.vols.torso.b, .5), d = V3.dist(c, at); if (d > r + 6) continue;
      const k = dmg * .6 * lerp(1, .4, clamp(d / (r + 6), 0, 1)); part.hp -= k; part.flash = 1; if (part.onHit) part.onHit(sim, this, p, kind === 'gl' ? 'gl' : 'blast', k);
      sim.ev({ type: 'bosshit', part: part.id, at: c });
      if (part.hp <= 0 && part.alive && !part.keepAlive) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at: c }); if (p) addScore(sim, p, part.score || 2000, c); if (part.onBreak) part.onBreak(sim, this, p); }
    }
  }
  defeat(sim) { if (this.dead) return; this.dead = true; this.set('dead', sim); for (const t of sim.threats) if (!t.done) { t.done = true; t.cancelled = true; } sim.ev({ type: 'bossdown', id: this.id, name: this.D.name, mini: !this.D.card }); if (this.D.onDefeat) this.D.onDefeat(sim, this); }
}
TC.Boss = Boss;
function makeBoss(sim, id) {
  const D = reg('boss', id), B = new Boss(sim, D);
  D.make(sim, B);
  if (D.card && sim.mode !== 'range') sim.ev({ type: 'bosscard', id, name: D.name, title: D.title, who: D.speaker });
  sim.ev({ type: 'boss', id, name: D.name });
  return B;
}
TC.makeBoss = makeBoss;
function spawnBoss(sim, id) { sim.boss = makeBoss(sim, id); return sim.boss; }
TC.spawnBoss = spawnBoss;
function bossStep(sim, B, dt) {
  B.t += dt; B.st += dt; B.flash = Math.max(0, B.flash - dt * 4);
  for (const p of Object.values(B.parts)) p.flash = Math.max(0, p.flash - dt * 6);
  if (!B.dead || B.D.stepDead) B.D.step(sim, B, dt);
  for (const r of B.rigs) { if (r.pose) r.rig.update(dt, r.pose); if (r.rig && r.live !== false) r.vols = volsOf(r.rig); }
}
TC.bossStep = bossStep;
/** a boss threat: always, with a telegraph */
function bossThreat(sim, B, kind, tele, pos, o = {}) {
  const tgt = o.target !== undefined ? o.target : pickTarget(sim, pos ? pos() : null); if (tgt < 0) return null;
  const th = requestThreat(sim, tgt, Object.assign({ always: true, tele, kind, src: -1, pos }, o));
  if (th) th.srcAlive = () => !B.dead && (o.alive ? o.alive() : true);
  return th;
}
TC.bossThreat = bossThreat;
/** a world point on a carrier-like frame M from local coordinates */
const L2W = (M, p) => xform(M, p);

/* ======================= BULLDOG (1-3): an armored truck smashes in; shoot its gunner, then its fuel tank ======================= */
def('boss', 'bulldog', { name: 'BULLDOG', title: 'Black Current armored truck', card: false,
  make(sim, B) {
    B.path = new E.Path([[1480, -10, 0], [1380, 0, 0], [1262, 0, 0]], { smooth: 'catmull' }); B.d = 0; B.x = 1480; B.y = -10; B.yaw = Math.PI;
    B.fuel = B.part('fuel', { hp: 6, weak: true, score: 5000, onBreak: (sim2, B2, p) => { sim2.explode([B2.x, B2.y, 18], 90, 12, p ? p.id : -1, false, 'bulldog'); B2.defeat(sim2); sim2.cue('bulldog-down'); } });
    sim.carriers.bulldog = { id: 'bulldog', C: { path: [] }, d: 0, M: mat34(B.x, B.y, 0, B.yaw), yaw: B.yaw, pos: [B.x, B.y, 0] };
    B.set('drive', sim); sim.ev({ type: 'sfx', name: 'engine' });
  },
  step(sim, B, dt) {
    if (B.state === 'drive') { B.d = Math.min(B.path.length, B.d + 120 * dt); const p = B.path.at(Math.min(B.path.length - .01, B.d)); B.x = p.x; B.y = p.y; B.yaw = p.angle; if (B.d >= B.path.length) { B.set('stop', sim); sim.ev({ type: 'shake', k: .5 }); sim.say('kai', 'Armored truck! Take out the gunner!'); spawnEnemy(sim, 'gunner', null, { entry: 'stand', carrier: 'bulldog', local: [0, 0, 34], from: [B.x, B.y, 34] }); for (const [s, c] of [[-1, 't1'], [1, 't2']]) spawnEnemy(sim, 'marine', c, { entry: 'run', from: [B.x + 40, B.y + s * 12, 0], delay: 0 }); } }
    if (B.state === 'stop' && B.st > 4 && !sim.flags.fuelSaid) { sim.flags.fuelSaid = true; sim.say('rook', 'Fuel tank! Light it up!'); }
    const M = mat34(B.x, B.y, 0, B.yaw); B.M = M; const C = sim.carriers.bulldog; C.M = M; C.yaw = B.yaw; C.pos = [B.x, B.y, 0];
    B.fuel.vol = { a: L2W(M, [56, -13, 12]), b: L2W(M, [56, 13, 12]), r: 7 };
    B.fuel.open = B.state !== 'drive';
    B._cols = [{ box: [B.x - 36, B.y - 18, 0, B.x + 48, B.y + 18, 44], yaw: B.yaw, cx: B.x, cy: B.y, impact: 'metal', alive: !B.dead }];
    if (B.dead) B._cols = [];
  },
  stepDead: false,
  draw(R, B, sim) { if (B.dead) return; R.mesh('bulldog', B.M, { flash: B.flash * .3 }); R.mesh('fueltank', mulMat34(B.M, mat34(56, 0, 12, Math.PI / 2)), { flash: B.fuel.flash, glow: .3 + .3 * Math.sin(sim.t * 8) }); }
});

/* ======================= STINGRAY -> BARRACUDA (1-B) ======================= */
def('boss', 'stingray', { name: 'STINGRAY', title: 'Black Current gunboat', card: true, speaker: 'barracuda', time: 100,
  frac(B) { if (B.phase === 1) return .6 + .4 * (B.tur.reduce((a, t) => a + Math.max(0, t.hp), 0) / B.tur.reduce((a, t) => a + t.max, 0)); if (B.phase === 2) return .25 + .35 * Math.max(0, B.bar.hp - B.bar.max * .4) / (B.bar.max * .6); return .25 * Math.max(0, B.bar.hp) / (B.bar.max * .4); },
  make(sim, B) {
    B.phase = 1; B.off = 250; B.tur = [];
    for (const [i, lx] of [[0, -40], [1, 34]].map(a => a)) B.tur.push(B.part('tur' + i, { hp: 12, weak: true, score: 3000, lx, ang: 0, spin: 0, onBreak: (s, b) => { s.ev({ type: 'explode', at: b.tur[i].vol.c.slice(), r: 40, big: true }); } }));
    B.drums = [-56, -16, 46].map((lx, i) => B.part('drum' + i, { hp: 2, weak: false, score: 500, lx, noBar: true, noMul: true, onBreak: (s, b, p) => { const at = b.drums[i].vol.c.slice(); s.explode(at, 40, 0, p ? p.id : -1, false, 'fuel'); for (const t of b.tur) if (t.alive && Math.abs(t.lx - lx) < 44) { t.hp -= 6; t.flash = 1; if (t.hp <= 0) { t.alive = false; t.hp = 0; s.ev({ type: 'partdown', part: t.id, at: t.vol.c.slice() }); t.onBreak(s, b, p); } } } }));
    B.bar = B.part('barracuda', { hp: 30, open: false, score: 10000, noBar: true });
    B.rig = makeRig(sim, reg('speaker', 'barracuda').rig); B.rig2 = makeRig(sim, Object.assign({}, reg('speaker', 'barracuda').rig, { weapon: 'cutlass' }));
    B.r = { rig: B.rig, hit: null, live: true }; B.rigs.push(B.r);
    B.set('approach', sim); B.next = 2; B.fire = 0; B.crew = 0;
    sim.carriers.stingray = { id: 'stingray', C: { path: [] }, d: 0, M: null, yaw: 0, pos: [0, 0, 0] };
    B.pose = () => {};
  },
  step(sim, B, dt) {
    const Cb = sim.carriers.boat2, t = sim.t, us = Cb.pos;
    if (B.dead && B.r) { B.fallT = (B.fallT || 0) + dt; B.r.z -= dt * 40 * B.fallT; B.r.x += Math.cos(Cb.yaw + Math.PI / 2) * dt * 30; B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: B.face, air: true, expr: 'wince' }; B.r.hit = null; }
    B.off = lerp(B.off, B.phase === 3 ? 170 : 230 + Math.sin(t * .3) * 40, Math.min(1, dt * .5));
    const bob = Math.sin(t * 1.3) * 2.5, yaw = Cb.yaw, x = us[0] + Math.cos(yaw) * (B.state === 'approach' ? -260 + B.st * 120 : 40) - Math.sin(yaw) * B.off, y = us[1] + Math.sin(yaw) * (B.state === 'approach' ? -260 + B.st * 120 : 40) + Math.cos(yaw) * B.off;
    B.x = x; B.y = y; B.yaw = yaw; B.roll = Math.sin(t * .9) * .04; B.M = mat34(x, y, -14 + bob, yaw, Math.sin(t * .7) * .02, B.roll);
    const C = sim.carriers.stingray; C.M = B.M; C.yaw = yaw; C.pos = [x, y, -14];
    for (const tu of B.tur) { tu.vol = { c: L2W(B.M, [tu.lx, 0, 14]), r: 8 }; }
    for (const d of B.drums) d.vol = d.alive ? { c: L2W(B.M, [d.lx, 12, 12]), r: 6 } : null;
    if (B.state === 'approach') { if (B.st > 2.2) { B.set('turrets', sim); sim.say('barracuda', "CREST! The Admiral said you'd come. He didn't say you'd be this slow!"); } return; }
    if (B.phase === 1) {
      // turrets spin up (the telegraph) and fire bursts; deck crews come two at a time
      B.fire -= dt;
      const live = B.tur.filter(t2 => t2.alive);
      if (!live.length) { B.phase = 2; B.set('bridge', sim); sim.say('barracuda', 'Enough! You want me? Come and get me!'); for (const e of sim.enemies) if (e.alive && e.carrier === 'stingray') damageEnemy(sim, e, 99, null, 'blast', {}); return; }
      for (const tu of live) { const c = sim.cameraFor(0); const w = tu.vol.c; tu.ang = Math.atan2(c.y - w[1], c.x - w[0]); tu.spin = Math.max(0, tu.spin - dt); }
      if (B.fire <= 0) {
        const tu = live[(B.next++) % live.length]; tu.spin = .9;
        const th = bossThreat(sim, B, 'turret', .9, () => tu.vol.c, { alive: () => tu.alive });
        if (th) { th.onResolve = () => { sim.ev({ type: 'eshot', from: tu.vol.c.slice(), to: null, p: th.target, burst: 5, kind: 'turret' }); }; }
        sim.ev({ type: 'spinup', at: tu.vol.c.slice() });
        B.fire = 2.4 * tune.enemy.fireMul;
      }
      if (sim.enemies.filter(e => e.alive && e.carrier === 'stingray').length < 2 && B.st > 1.5 && B.crew < 8) {
        B.st = 0; for (let k = 0; k < 2; k++) { B.crew++; const lx = -60 + ((B.crew * 37) % 110); spawnEnemy(sim, 'deckhand', null, { entry: 'stand', carrier: 'stingray', local: [lx, -14, 6], from: [x, y, 0] }); }
      }
      return;
    }
    if (B.phase === 2) {
      // Barracuda on the bridge wing: harpoons and torpedoes, ducking behind the armored bridge between volleys
      const at = L2W(B.M, [-2, -12, 33]);
      B.r.x = at[0]; B.r.y = at[1]; B.r.z = at[2];
      const c = sim.cameraFor(0), face = Math.atan2(c.y - at[1], c.x - at[0]);
      if (B.state === 'bridge') { B.bar.open = false; B.r.hide = true; if (B.st > 1.4) { B.set('wing', sim); B.vol = 0; } }
      else if (B.state === 'wing') {
        B.bar.open = true; B.r.hide = false; B.r.hit = B.bar;
        if (B.st > .5 && !B.shot) {
          B.shot = true; const torp = (B.vol++ % 2) === 1, tgt = pickTarget(sim, at); if (tgt < 0) return;
          if (torp) {
            const cam = sim.cameraFor(tgt), from = [at[0], at[1], sim.waterZ()], to = [cam.x + Math.cos(cam.yaw) * 30, cam.y + Math.sin(cam.yaw) * 30, sim.waterZ()];
            const pr = sim.launch({ kind: 'torpedo', pos: from, vel: [0, 0, 0], life: 3, target: tgt, land: to, home: true, hp: 2 });
            pr.th = requestThreat(sim, tgt, { always: true, tele: 2.6, kind: 'torpedo', src: pr.id, pos: () => pr.pos, unblockable: true }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
            if (!sim.flag('torpedo')) sim.say('mari', 'Torpedo in the water! Shoot it!');
            sim.ev({ type: 'prompt', id: 'torpedo' });
          } else {
            const cam = sim.cameraFor(tgt), to = [cam.x, cam.y, cam.z - 4], from = B.rig.tip(), d = V3.dist(from, to);
            const pr = sim.launch({ kind: 'harpoon', pos: from, vel: V3.mul(V3.norm(V3.sub(to, from)), 300), life: d / 300, target: tgt, land: to, home: true, hp: 2, rope: from.slice() });
            pr.th = requestThreat(sim, tgt, { always: true, tele: Math.max(1, d / 300), kind: 'harpoon', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
          }
        }
        if (B.st > 2.4) { B.shot = false; B.set('bridge', sim); }
      }
      B.face = face; B.point = B.state === 'wing';
      B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: face, point: B.point, expr: 'angry', aim: Math.atan2(c.z - (B.r.z + 24), Math.hypot(c.x - B.r.x, c.y - B.r.y)) };
      if (B.bar.hp <= B.bar.max * .4) { B.phase = 3; B.set('swing', sim); B.r.hit = null; sim.say('barracuda', "Enough! I'll do this myself!"); B.burn = true; if (sim.scene.alt) sim.swapSlots(sim.scene.alt); }
      return;
    }
    if (B.phase === 3) {
      // boarding: she swings across on a rope and slashes; cover blocks it; each stagger opens her for 1.5 s
      const Mb = Cb.M, land = L2W(Mb, [24, -2, 0]);
      if (B.state === 'swing') {
        const from = L2W(B.M, [-2, -12, 33]), u = Math.min(1, B.st / 1.6), h = Math.sin(u * Math.PI) * 40;
        B.r.x = lerp(from[0], land[0], u); B.r.y = lerp(from[1], land[1], u); B.r.z = lerp(from[2], land[2], u) + h; B.r.air = u < 1; B.r.rig = B.rig2; B.r.hide = false;
        B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: Cb.yaw + Math.PI / 2, air: u < 1, expr: 'shout' };
        B.rope = [L2W(B.M, [-2, -12, 60]), [B.r.x, B.r.y, B.r.z + 30]];
        if (u >= 1) { B.rope = null; B.set('ready', sim); B.cycles = 0; }
        return;
      }
      B.r.x = land[0]; B.r.y = land[1]; B.r.z = land[2]; B.r.air = false;
      const c = sim.cameraFor(0); B.face = Math.atan2(c.y - B.r.y, c.x - B.r.x);
      if (B.state === 'ready') { B.bar.open = false; B.r.hit = B.bar; if (B.st > .6) { B.set('wind', sim); B.th = bossThreat(sim, B, 'slash', .6 * tune.enemy.teleMul, () => B.rig2.hand()); if (!B.th) B.set('ready', sim); } }
      else if (B.state === 'wind') { B.atk = { spec: 'backslash', phase: 'wind', u: Math.min(1, B.st / .6) }; if (B.th && B.th.done) { B.atk = { spec: 'backslash', phase: 'active', u: .5 }; sim.ev({ type: 'slash', boss: true, res: B.th.result }); if (B.th.result === 'blocked') { B.set('stagger', sim); sim.ev({ type: 'prompt', id: 'open' }); } else B.set('ready', sim); } }
      else if (B.state === 'stagger') { B.atk = null; B.bar.open = true; if (B.st > 1.5) { B.bar.open = false; B.cycles++; B.set('ready', sim); } }
      B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: B.face, attack: B.atk ? { spec: E.MOVES[B.atk.spec], phase: B.atk.phase, u: B.atk.u } : null, pose: B.state === 'stagger' ? 'kneel' : null, hurt: B.state === 'stagger', expr: 'angry' };
      if (B.bar.hp <= 0 && !B.dead) { sim.say('barracuda', "This isn't over, CREST!"); B.defeat(sim); B.fallT = 0; }
    }
  },
  onDefeat(sim, B) { sim.ev({ type: 'slowmo', s: .8 }); for (const e of sim.enemies) if (e.alive && e.carrier === 'stingray') damageEnemy(sim, e, 99, null, 'blast', {}); sim.ev({ type: 'explode', at: [B.x, B.y, 0], r: 120, big: true }); },
  stepDead: true,
  draw(R, B, sim) {
    if (!B.M) return;
    const sinking = B.dead ? Math.min(40, (sim.t - (B.deadT || (B.deadT = sim.t))) * 14) : 0;
    const M = sinking ? mulMat34(mat34(0, 0, -sinking, 0), B.M) : B.M;
    R.mesh('stingray', M, { flash: B.flash * .2 });
    for (const tu of B.tur) if (tu.alive || !B.dead) { const lm = mulMat34(M, mat34(tu.lx, 0, 8, tu.ang - B.yaw)); R.mesh('turret', lm, { flash: tu.flash, dim: tu.alive ? 1 : .35, glow: tu.spin > 0 ? .5 : 0 }); }
    for (const d of B.drums) if (d.alive) R.meshObj('fuel', L2W(M, [d.lx, 12, 6]), d.flash);
    if (B.burn || B.dead) R.fire(L2W(M, [-10, 0, 30]), 1);
    const r = B.r; if (B.phase >= 2 && !r.hide && !(B.dead && B.fallT > 1.2)) R.rig(r.rig, r.rig.x, r.rig.y, r.rig.z, { flash: B.bar.flash });
    if (B.rope) R.line(B.rope[0], B.rope[1], [200, 180, 140]);
  }
});
