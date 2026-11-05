// 25-bosses: the boss framework (named parts with hp, armor and weak points, HP bars, an intro card, a pattern
// script on the Sim's runner, defeat with slow motion) and the bosses: STINGRAY -> BARRACUDA (1-B), BULLDOG (1-3),
// THE GULL (2-3), HAMMERHEAD (2-B, with cover that degrades), SEAWOLF (3-2), SCYLLA (3-5) and ADMIRAL KRAKE (3-6,
// the FINAL SHOT). Every attack goes through the ThreatDirector and the projectiles (22). Reads: Sim (20).

function makeBoss(sim, id) {
  const D = get('boss', id), parts = [];
  for (const k in D.parts) { const P = D.parts[k]; const hp = P.hp * (P.noMul ? 1 : tune.enemy.bossHpMul); parts.push(Object.assign({ id: k, hp, max: hp, r: 8, pos: null, alive: true, weak: false, hidden: false, armor: false, flashT: 0 }, P, { hp, max: hp })); }
  const B = { id, D, parts, phase: 1, t: 0, defeated: false, outT: 0, intro: D.card === false || sim.mode === 'host' || sim.mode === 'replica' ? 0 : 2.5, x: 0, y: 0, z: 0, yaw: 0, s: {}, minions: [], pose: {} };
  B.part = k => parts.find(p => p.id === k);
  sim.boss = B;
  if (D.init) D.init(B, sim);
  sim.emit('boss', { id, name: D.name, title: D.title, card: B.intro > 0 });
  if (D.time) { sim.timeMax = sim.timer = D.time * sim.diff.timeMul * tune.time.sceneMul; }
  sim.runner.run(D.script(B, sim), B);
  return B;
}
TC.makeBoss = makeBoss;
TC.stepBoss = (sim, dt) => {
  const B = sim.boss; B.t += dt; if (B.intro > 0) B.intro -= dt;
  for (const p of B.parts) p.flashT = Math.max(0, p.flashT - dt);
  if (B.D.pose) B.D.pose(B, sim, dt);
  for (const e of sim.enemies) if (e.ride === B && !e.dead && e.local) { const c = Math.cos(B.yaw), s = Math.sin(B.yaw); e.x = B.x + e.local[0] * c - e.local[1] * s; e.y = B.y + e.local[0] * s + e.local[1] * c; e.z = B.z + e.local[2]; }
  if (B.defeated) B.outT += dt;
};
function damageBoss(sim, part, dmg, o = {}) {
  const B = sim.boss; if (!B || B.defeated || !part.alive || part.hidden) return;
  if (part.armor && !(o.w === 'gl' || o.blast)) { sim.emit('impact', { at: o.at, surf: 'armor' }); sim.emit('armor', { at: o.at }); return; }
  const mul = (part.weakMul || 1) * (o.w === 'sg' && part.sgMul ? part.sgMul : 1);
  part.hp -= dmg * mul; part.flashT = .08;
  sim.emit('bosshit', { part: part.id, at: o.at, p: o.p ? o.p.i : -1 });
  if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); }
  if (part.hp <= 0) { part.hp = 0; part.alive = false; sim.emit('partbreak', { part: part.id, at: part.pos ? part.pos.slice() : o.at }); if (o.p) sim.addScore(o.p, part.score || 3000, part.pos || o.at, 'part'); if (B.D.onPart) B.D.onPart(B, sim, part, o); }
}
TC.damageBoss = damageBoss;
function defeatBoss(sim, B, o = {}) {
  if (B.defeated) return; B.defeated = true; B.outT = 0;
  for (const t of sim.threats) if (!t.done) TC.cancelThreat(sim, t);
  sim.projectiles = sim.projectiles.filter(p => p.team !== 'enemy');
  for (const p of sim.players) if (!p.out && !p.left) sim.addScore(p, B.D.bonus || 20000, null, 'bonus');
  sim.emit('bossdown', { id: B.id, at: [B.x, B.y, B.z + 20], slow: B.D.slow !== false });
  if (B.D.defeatLine) sim.say(B.D.defeatLine[0], B.D.defeatLine[1]);
  if (o.killMinions !== false) for (const e of sim.enemies) if (!e.dead) TC.killEnemy(sim, e, { style: 'crumple' });
}
TC.defeatBoss = defeatBoss;
// the boss is done once outT passes its outro: the scene's clear check waits for it
const bossOver = (B, s = 2.4) => () => B.defeated && B.outT > s;
const barFrac = (B, ids) => { let h = 0, m = 0; for (const p of B.parts) if (ids.includes(p.id)) { h += p.hp; m += p.max; } return m ? h / m : 0; };
TC.bossBars = B => B.D.bars ? B.D.bars(B) : [{ label: B.D.name, f: barFrac(B, B.parts.map(p => p.id)) }];
const boatXY = (B, l) => { const c = Math.cos(B.yaw), s = Math.sin(B.yaw); return [B.x + l[0] * c - l[1] * s, B.y + l[0] * s + l[1] * c, B.z + l[2]]; };
TC.boatXY = boatXY;
function nearestTarget(sim) { const alive = sim.players.filter(p => !p.out && !p.left); return alive.length ? alive[(sim.rng('boss')() * alive.length) | 0].i : 0; }

// ---------------------------------------------------------------- STINGRAY -> BARRACUDA (1-B)
def('boss', 'stingray', { name: 'STINGRAY', title: 'Black Current gunboat', time: 100, bonus: 30000,
  parts: { turretL: { hp: 12, r: 9, weak: true, score: 5000 }, turretR: { hp: 12, r: 9, weak: true, score: 5000 }, barracuda: { hp: 30, r: 7, hidden: true, score: 10000, human: true, weakMul: 1 } },
  bars: B => [{ label: 'STINGRAY', f: barFrac(B, ['turretL', 'turretR']) }, { label: 'BARRACUDA', f: barFrac(B, ['barracuda']) }],
  init(B, sim) { B.home = sim.scene.bossAt.slice(); B.x = B.home[0]; B.y = B.home[1]; B.z = B.home[2]; B.yaw = Math.PI; B.drums = []; B.board = 0; B.swing = 0;
    for (const [i, l] of [[0, [-34, 10, 10]], [1, [6, 12, 10]], [2, [40, 10, 10]]]) { const p = boatXY(B, l); const ob = TC.makeObject(sim, 'barrel', [p[0], p[1], p[2] - 10], { local: false, drum: i, follow: null }); ob.bossMul = 1.8; ob.lpos = l; B.drums.push(ob); } },
  pose(B, sim, dt) {
    if (B.phase < 3) { B.x = B.home[0] + Math.sin(B.t * .35) * 60; B.y = B.home[1] + Math.sin(B.t * .21) * 14; B.z = B.home[2] + Math.sin(B.t * 1.3) * 1.5; }
    B.roll = Math.sin(B.t * 1.1) * .03; B.yaw = Math.PI + Math.sin(B.t * .35) * .05;
    const tl = B.part('turretL'), tr = B.part('turretR'), bc = B.part('barracuda');
    tl.pos = boatXY(B, [-18, 2, 22]); tr.pos = boatXY(B, [24, 2, 22]);
    for (const ob of B.drums) if (!ob.dead) { const p = boatXY(B, ob.lpos); ob.pos = [p[0], p[1], p[2] - 2]; }
    if (B.phase === 3) { const c = sim.poseOf(0, 'stand'), f = [Math.cos(c.yaw), Math.sin(c.yaw)]; const land = [c.x + f[0] * 50, c.y + f[1] * 50, c.z - TC.EYE.stand]; const u = clamp(B.swing, 0, 1); const from = boatXY(B, [0, 0, 40]); B.bx = lerp(from[0], land[0], u); B.by = lerp(from[1], land[1], u); B.bz = lerp(from[2], land[2], u) + Math.sin(u * Math.PI) * 30; }
    else { const p = boatXY(B, [0, -4, 34]); B.bx = p[0]; B.by = p[1]; B.bz = p[2] - (B.duck ? 10 : 0); }
    bc.pos = [B.bx, B.by, B.bz + 22]; bc.hidden = B.phase < 2 || B.duck || (B.phase === 3 && !B.open);
  },
  onPart(B, sim, part) { if (part.id === 'barracuda') { defeatBoss(sim, B); } },
  *script(B, sim) {
    yield () => B.intro <= 0;
    sim.say('barracuda', "CREST! The Admiral said you'd come. He didn't say you'd be this slow!");
    for (const d of B.drums) d.onBreak = (s, ob) => { for (const k of ['turretL', 'turretR']) { const p = B.part(k); if (p.alive && vdist(p.pos, ob.pos) < 60) damageBoss(s, p, 6, { at: p.pos, blast: true }); } };
    // phase 1: the turrets spin up (the whine is the telegraph) and fire bursts; deckhands on deck
    let deck = 0;
    while (B.part('turretL').alive || B.part('turretR').alive) {
      if (sim.enemies.filter(e => !e.dead && e.ride === B).length < 2 && deck < 8) { deck++; const l = [[-40, -6, 10], [36, -6, 10], [0, -8, 10]][deck % 3]; const e = TC.makeEnemy(sim, 'deckhand', null, { at: boatXY(B, l), entry: 'stand', mount: true, noClear: true }); e.ride = B; e.local = l; e.state = 'hide'; e.t = 1; e.cover = { h: 14, peek: ['up'], at: e.local, busy: 0 }; }
      for (const k of ['turretL', 'turretR']) {
        const p = B.part(k); if (!p.alive) continue;
        sim.emit('spinup', { part: k, at: p.pos });
        TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: .8 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'turret', at: p.pos.slice(), always: true });
        yield 1.4;
      }
      yield 1.2;
    }
    // phase 2: Barracuda on the bridge wing: harpoons and torpedoes, ducking between volleys
    B.phase = 2; sim.emit('bossphase', { phase: 2 }); sim.say('barracuda', 'Say hello to the Stingray!');
    let v = 0;
    while (B.part('barracuda').hp > B.part('barracuda').max * .42) {
      B.duck = false; yield .5;
      const tgt = nearestTarget(sim);
      if (v % 2 === 1) { sim.say('mari', 'Torpedo in the water! Shoot it!'); const at = boatXY(B, [10, -14, -8]); at[2] = sim.water + 1; TC.fireRocket(sim, { id: 'boss', target: tgt }, at, 'torpedo', { to: TC.coverPoint(sim, tgt, 20), speed: 115 }); sim.emit('prompt', { id: 'torpedo' }); }
      else TC.fireRocket(sim, { id: 'boss', target: tgt }, [B.bx, B.by, B.bz + 22], 'harpoon');
      yield 2.0; B.duck = true; yield 1.6; v++;
    }
    // phase 3: the Stingray burns, she swings across with her cutlass
    B.phase = 3; B.duck = false; B.open = false; sim.say('barracuda', "Enough! I'll do this myself!"); sim.emit('bossphase', { phase: 3 });
    for (const k of ['turretL', 'turretR']) B.part(k).alive = false;
    while (B.swing < 1) { B.swing += 1 / 120 * 1.2; yield; }
    sim.emit('land', { at: [B.bx, B.by, B.bz] });
    for (let cycle = 0; cycle < 6 && !B.defeated; cycle++) {
      B.atk = 'wind'; const th = TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: .6 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'slash', at: [B.bx, B.by, B.bz + 24], always: true });
      yield () => !th || th.done; B.atk = 'active'; sim.emit('slash', { boss: true, blocked: th ? !th.result : true }); yield .3; B.atk = null;
      B.open = true; sim.emit('stagger', {}); yield 1.5; B.open = false; yield .5;
    }
    if (!B.defeated) { B.open = true; yield () => B.defeated; }
  },
  defeatLine: ['barracuda', "This isn't over, CREST!"]
});

// ---------------------------------------------------------------- BULLDOG, the armored truck (1-3 mini-boss)
def('boss', 'bulldog', { name: 'BULLDOG', title: 'Armored truck', card: false, slow: false, bonus: 8000,
  parts: { tank: { hp: 6, r: 8, weak: true, score: 6000, noMul: false } },
  init(B, sim) { const s = sim.scene.bulldog; B.from = s.from; B.to = s.to; B.x = s.from[0]; B.y = s.from[1]; B.z = s.from[2]; B.yaw = Math.atan2(s.to[1] - s.from[1], s.to[0] - s.from[0]); B.u = 0; sim.emit('fx', { kind: 'crash', at: s.from }); },
  pose(B, sim, dt) { B.u = Math.min(1, B.u + dt / 1.6); const k = 1 - Math.pow(1 - B.u, 3); B.x = lerp(B.from[0], B.to[0], k); B.y = lerp(B.from[1], B.to[1], k); B.part('tank').pos = boatXY(B, [-22, -17, 14]); },
  onPart(B, sim, part) { sim.emit('explode', { at: part.pos.slice(), size: 2.2, big: true }); TC.explode(sim, part.pos, 90, 10, {}); sim.say('rook', 'Boom. Scratch one truck.'); defeatBoss(sim, B, { killMinions: false }); },
  *script(B, sim) {
    yield 1.6; sim.say('kai', 'Armored truck! Take out the gunner!');
    const g = TC.makeEnemy(sim, 'gunner', null, { at: boatXY(B, [4, 0, 26]), entry: 'stand', mount: true }); g.ride = B; g.local = [4, 0, 26]; g.cover = { h: 12, peek: ['up'], at: g.local, busy: 0 }; g.state = 'hide'; g.t = .5;
    yield 1.2; for (const l of [[-30, 26, 0], [50, -24, 0]]) { const p = sim.scene.bulldogMen ? sim.scene.bulldogMen[l[0] < 0 ? 0 : 1] : boatXY(B, l); TC.makeEnemy(sim, 'marine', null, { at: p, entry: 'stand' }).state = 'peek'; }
    yield 3; sim.say('rook', 'Fuel tank—light it up!');
    yield () => B.defeated;
  }
});

// ---------------------------------------------------------------- THE GULL, a laser sniper among three perches (2-3)
def('boss', 'gull', { name: 'THE GULL', title: 'Black Current sharpshooter', card: false, bonus: 10000,
  parts: { gull: { hp: 4, r: 6, weak: false, score: 6000, human: true } },
  init(B, sim) { B.perches = sim.scene.perches; B.pi = 0; B.up = 0; const p = B.perches[0]; B.x = p[0]; B.y = p[1]; B.z = p[2]; },
  pose(B, sim, dt) { const g = B.part('gull'); g.pos = [B.x, B.y, B.z + (B.up > .5 ? 22 : 14)]; g.hidden = B.up < .5; B.yaw = Math.atan2(sim.poseOf(0, 'stand').y - B.y, sim.poseOf(0, 'stand').x - B.x); },
  onPart(B, sim) { defeatBoss(sim, B, { killMinions: false }); sim.emit('kill', { boss: 'gull', at: [B.x, B.y, B.z + 20], style: 'fall' }); },
  *script(B, sim) {
    sim.say('juno', 'Laser sight! Sniper on the lighthouse!'); yield 1.2; sim.say('gull', 'Hold still, little agents.');
    for (;;) {
      B.up = 1; B.laser = 1.4; const tgt = nearestTarget(sim);
      const th = TC.requestThreat(sim, { src: 'boss', target: tgt, dur: 1.4 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'sniper', at: [B.x, B.y, B.z + 22], always: true });
      B.laserT = tgt; yield () => !th || th.done; sim.emit('eshot', { at: [B.x, B.y, B.z + 22], kind: 'sniper', target: tgt, boss: true }); B.laser = 0;
      yield .8; B.up = 0; yield .6; B.pi = (B.pi + 1) % B.perches.length; const p = B.perches[B.pi]; B.x = p[0]; B.y = p[1]; B.z = p[2]; yield .7;
    }
  }
});

// ---------------------------------------------------------------- HAMMERHEAD (2-B): shield advance, rotary sweep, grenades, the charge
def('boss', 'hammerhead', { name: 'HAMMERHEAD', title: 'Enforcer of the Black Current', time: 120, bonus: 40000,
  parts: { body: { hp: 44, r: 10, score: 20000, human: true }, legs: { hp: 999, r: 7, noMul: true, link: 'body' } },
  bars: B => [{ label: 'HAMMERHEAD', f: B.part('body').hp / B.part('body').max }],
  init(B, sim) { const s = sim.scene.hammer; B.track = s.track; B.u = .5; B.x = lerp(s.track[0][0], s.track[1][0], .5); B.y = lerp(s.track[0][1], s.track[1][1], .5); B.z = s.track[0][2]; B.shield = true; B.shieldDown = 0; B.coverHp = 3; B.mode = 'walk'; B.yaw = 0; },
  pose(B, sim, dt) {
    B.shieldDown = Math.max(0, B.shieldDown - dt);
    const c = sim.poseOf(0, 'stand'); B.yaw = Math.atan2(c.y - B.y, c.x - B.x);
    if (B.mode === 'walk') { B.u += dt * .12 * (B.dir || 1); if (B.u > .9 || B.u < .1) B.dir = -(B.dir || 1); B.x = lerp(B.track[0][0], B.track[1][0], B.u); B.y = lerp(B.track[0][1], B.track[1][1], B.u); }
    if (B.mode === 'charge') { const d = vsub([c.x, c.y], [B.x, B.y]), L = Math.hypot(d[0], d[1]); if (L > 52) { B.x += d[0] / L * 95 * dt; B.y += d[1] / L * 95 * dt; } }
    if (B.mode === 'back') { const h = [lerp(B.track[0][0], B.track[1][0], B.u), lerp(B.track[0][1], B.track[1][1], B.u)], d = vsub(h, [B.x, B.y]), L = Math.hypot(d[0], d[1]); if (L > 3) { B.x += d[0] / L * 80 * dt; B.y += d[1] / L * 80 * dt; } else B.mode = 'walk'; }
    const body = B.part('body'), legs = B.part('legs'), fx = Math.cos(B.yaw), fy = Math.sin(B.yaw);
    body.pos = [B.x, B.y, B.z + 30]; legs.pos = [B.x + fx * 4, B.y + fy * 4, B.z + 8]; legs.r = 7;
    const covered = B.shield && B.shieldDown <= 0;
    body.hidden = false; body.armor = covered && B.mode !== 'sweepFire' ? true : false; legs.armor = false;
    if (covered && B.mode !== 'sweepFire' && B.mode !== 'toss') body.armor = true;
    // shotgun or GL hits on the shield knock it aside
  },
  onPart(B, sim, part) { if (part.id === 'body') defeatBoss(sim, B); },
  *script(B, sim) {
    yield () => B.intro <= 0; sim.say('hammer', 'LITTLE AGENTS. BIG MISTAKE.');
    const S = sim.scene.hammer;
    B.onHit = (o) => { if (B.shield && (o.w === 'sg' || o.w === 'gl' || o.blast)) { B.shieldDown = 1.5; sim.emit('shieldknock', { boss: true }); } };
    let n = 0;
    while (!B.defeated) {
      const body = B.part('body');
      if (B.shield && body.hp < body.max * .5) { B.shield = false; sim.emit('fx', { kind: 'doorfall', at: [B.x, B.y, B.z] }); sim.say('hammer', 'MY DOOR! YOU BROKE MY DOOR!'); yield 1.2; }
      if (!B.shield) {
        // the charge: 6 damage within 1.5 s staggers him, otherwise he slams the cover
        B.mode = 'charge'; sim.say('rook', "He's charging!"); const hp0 = body.hp; let tt = 0; yield .8;
        const th = TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: 1.5 * tune.enemy.teleMul, kind: 'slam', at: [B.x, B.y, B.z + 30], always: true });
        while (th && !th.done) { tt += 1 / 120; if (hp0 - body.hp >= 6) { TC.cancelThreat(sim, th); sim.emit('stagger', { boss: true }); B.mode = 'stagger'; break; } yield; }
        if (B.mode === 'stagger') { yield 1.6; } else { sim.emit('slam', {}); degradeCover(sim, B); }
        B.mode = 'back'; yield () => B.mode === 'walk'; yield 1;
        if (sim.rng('boss')() < .6) { sim.emit('fx', { kind: 'beam' }); }
      }
      // B: rotary sweep
      B.mode = 'spin'; sim.emit('spinup', { boss: true, at: [B.x, B.y, B.z + 26] }); if (n === 0) sim.say('rook', 'Minigun! Get down!');
      const tg = nearestTarget(sim);
      const th = TC.requestThreat(sim, { src: 'boss', target: tg, dur: 1.2 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'sweep', at: [B.x, B.y, B.z + 26], always: true, sweep: 2.5 });
      for (const p of sim.players) if (p.i !== tg && !p.out && !p.left) TC.requestThreat(sim, { src: 'boss', target: p.i, dur: 1.2, kind: 'sweep', at: [B.x, B.y, B.z + 26], always: true, sweep: 2.5 });
      yield 1.2; B.mode = 'sweepFire'; yield 2.5; B.mode = 'walk';
      if (th && th.result === false) degradeCover(sim, B);
      yield 1.5;
      // C: grenade volley
      B.mode = 'toss'; for (let g = 0; g < 3; g++) { const gr = TC.lobGrenade(sim, { id: 'boss', target: nearestTarget(sim) }, [B.x, B.y, B.z + 40]); gr.near = true; yield .45; }
      B.mode = 'walk'; yield 2.2; n++;
    }
  },
  onShotdown(sim, pr) { const B = sim.boss; if (pr.kind === 'grenade' && vdist(pr.pos, [B.x, B.y, B.z + 30]) < 140) damageBoss(sim, B.part('body'), 4, { at: pr.pos, blast: true }); },
  defeatLine: ['hammer', 'HAMMERHEAD… FALLS… DOWN…']
});
function degradeCover(sim, B) {
  B.coverHp--; sim.emit('coverhit', { hp: B.coverHp });
  if (B.coverHp <= 0) for (const ob of sim.objects) if (ob.coverProp && !ob.dead) TC.breakObject(sim, ob, {});
  if (B.coverHp <= 0 && !sim.flags.cover2) { sim.flags.cover2 = true; sim.say('kai', "Cover's gone—moving!"); sim.emit('coverswap', {}); sim.scene.slots = sim.scene.slots2; B.coverHp = 3; }
}
// hits on Hammerhead's legs count against his body; the shield knock-aside
const _dmgBoss = damageBoss;
TC.damageBoss = (sim, part, dmg, o = {}) => {
  const B = sim.boss;
  if (B && B.id === 'hammerhead') {
    if (part.id === 'legs') { if (B.shield && B.shieldDown <= 0) { sim.emit('impact', { at: o.at, surf: 'metal' }); } return _dmgBoss(sim, B.part('body'), dmg * .8, Object.assign({}, o, { blast: true })); }
    if (B.onHit) B.onHit(o);
    if (part.armor && (o.w === 'sg' || o.w === 'gl' || o.blast)) { B.shieldDown = 1.5; part.armor = false; sim.emit('shieldknock', { boss: true }); return; }
  }
  return _dmgBoss(sim, part, dmg, o);
};

// ---------------------------------------------------------------- SEAWOLF, the gunship (3-2: pods, then the rotor hub)
def('boss', 'seawolf', { name: 'SEAWOLF', title: 'Gunship', card: false, bonus: 25000,
  parts: { podL: { hp: 10, r: 8, weak: true, score: 6000 }, podR: { hp: 10, r: 8, weak: true, score: 6000 }, hub: { hp: 15, r: 9, weak: true, hidden: true, score: 10000 } },
  bars: B => [{ label: 'SEAWOLF', f: barFrac(B, ['podL', 'podR', 'hub']) }],
  init(B, sim) { B.home = sim.scene.seawolf.slice(); B.x = B.home[0] + 300; B.y = B.home[1] - 200; B.z = B.home[2] + 80; B.yaw = Math.PI; B.bank = 0; B.crash = 0; },
  pose(B, sim, dt) {
    if (B.crash > 0) { B.crash += dt; B.z -= dt * 60 * B.crash; B.yaw += dt * 3; B.x += dt * 30; }
    else { const tx = B.home[0] + Math.sin(B.t * .4) * 90, ty = B.home[1] + Math.cos(B.t * .3) * 30, tz = B.home[2] + Math.sin(B.t * .9) * 10; B.bank = clamp((tx - B.x) * .01, -.3, .3); B.x += (tx - B.x) * Math.min(1, dt * 1.2); B.y += (ty - B.y) * Math.min(1, dt * 1.2); B.z += (tz - B.z) * Math.min(1, dt * 1.2); const c = sim.poseOf(0, 'stand'); B.yaw = lerpAng(B.yaw, Math.atan2(c.y - B.y, c.x - B.x), dt * 2); }
    B.part('podL').pos = boatXY(B, [4, -18, -6]); B.part('podR').pos = boatXY(B, [4, 18, -6]); B.part('hub').pos = [B.x, B.y, B.z + 18];
    B.part('hub').hidden = B.part('podL').alive || B.part('podR').alive || B.crash > 0;
  },
  onPart(B, sim, part) { if (part.id === 'hub') { B.crash = .01; sim.say('rook', 'Scratch one gunship.'); sim.emit('fx', { kind: 'heliCrash' }); defeatBoss(sim, B, { killMinions: false }); } else sim.emit('explode', { at: part.pos.slice(), size: 1.2 }); },
  *script(B, sim) {
    sim.say('juno', "Gunship inbound! It's the Seawolf!"); yield 2.5;
    let n = 0;
    while (!B.defeated) {
      // strafe: a burst of threats on every player
      sim.emit('spinup', { at: [B.x, B.y, B.z] });
      for (const p of sim.players) if (!p.out && !p.left) TC.requestThreat(sim, { src: 'boss', target: p.i, dur: 1.0 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'strafe', at: [B.x, B.y, B.z - 4], always: true });
      yield 2.2;
      if (n % 2 === 0 && (B.part('podL').alive || B.part('podR').alive)) { const tgt = nearestTarget(sim); for (const k of ['podL', 'podR']) if (B.part(k).alive) { TC.fireRocket(sim, { id: 'boss', target: tgt }, B.part(k).pos.slice(), 'rocket'); yield .5; } }
      if (n === 1 || n === 4) { for (const l of [[-10, 0, -20], [10, 0, -20]]) { const at = boatXY(B, l), tgtC = sim.scene.rappelTo; if (tgtC) { const e = TC.makeEnemy(sim, 'marine', null, { at: tgtC[(n + l[0] > 0 ? 1 : 0) % tgtC.length], entry: 'rappel', from: at }); e.cover = { h: 16, peek: ['up'], at: e.to, busy: 1 }; } } sim.say('juno', 'Ropes! More of them!'); }
      if (!B.part('podL').alive && !B.part('podR').alive && n > 0 && !B.saidHub) { B.saidHub = true; sim.say('juno', 'Pods are down! Hit the rotor hub!'); }
      yield 2.4; n++;
    }
  }
});

// ---------------------------------------------------------------- SCYLLA, the crab walker (3-5)
def('boss', 'scylla', { name: 'SCYLLA', title: "Krake's crab walker", time: 90, bonus: 40000,
  parts: Object.assign({ cockpit: { hp: 20, r: 10, weak: true, hidden: true, score: 15000 } }, ...[0, 1, 2, 3, 4, 5].map(i => ({ ['knee' + i]: { hp: 8, r: 6, weak: true, score: 3000 } }))),
  bars: B => [{ label: 'SCYLLA', f: barFrac(B, ['cockpit', 'knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5']) }],
  init(B, sim) { B.home = sim.scene.scyllaAt.slice(); B.x = B.home[0]; B.y = B.home[1]; B.z = B.home[2]; B.yaw = Math.PI; B.topple = 0; B.toppled = false; B.gait = 0; B.downs = 0; },
  pose(B, sim, dt) {
    const c = sim.poseOf(0, 'stand'); if (!B.toppled) { B.gait += dt * 1.4; B.x = B.home[0] + Math.sin(B.t * .3) * 50; B.yaw = Math.atan2(c.y - B.y, c.x - B.x); }
    B.topple = approach(B.topple, B.toppled ? 1 : 0, dt * 1.6);
    B.z = B.home[2] + 40 - B.topple * 26 + (B.toppled ? 0 : Math.abs(Math.sin(B.gait * 2)) * 2);
    for (let i = 0; i < 6; i++) { const side = i < 3 ? -1 : 1, k = i % 3, a = (k - 1) * .7, lift = (i % 2 === (Math.floor(B.gait) % 2) ? Math.max(0, Math.sin(B.gait * Math.PI)) * 6 : 0); B.part('knee' + i).pos = boatXY(B, [Math.cos(a) * 26 * (k === 1 ? 1 : 1) - 0, side * (26 + Math.abs(Math.sin(a)) * 6), -4 + lift - B.topple * 10]); B.part('knee' + i).hidden = false; }
    B.part('cockpit').pos = boatXY(B, [14, 0, 6]); B.part('cockpit').hidden = !B.hatch;
    B.roll = B.topple * .9;
  },
  onPart(B, sim, part) { sim.emit('explode', { at: part.pos.slice(), size: .8 }); if (part.id === 'cockpit') { B.cockpitBroken = true; } },
  *script(B, sim) {
    yield () => B.intro <= 0; sim.say('krake', 'You climbed my tower. Admirable. Now meet my Scylla.');
    const kneesLeft = () => B.parts.filter(p => p.id.startsWith('knee') && p.alive).length;
    let n = 0;
    while (!B.defeated) {
      if (6 - kneesLeft() >= 3 * (B.downs + 1) || (B.downs === 1 && kneesLeft() === 0)) {
        B.downs++; B.toppled = true; sim.emit('fx', { kind: 'topple' }); sim.say('juno', "It's down! Hit the cockpit!"); yield .8; B.hatch = true;
        const t0 = sim.t; yield () => sim.t - t0 > 6 || B.cockpitBroken;
        B.hatch = false;
        if (B.cockpitBroken || B.downs >= 2) { B.toppled = true; sim.emit('explode', { at: [B.x, B.y, B.z + 10], size: 2, big: true }); sim.say('krake', 'You think a machine is my only weapon? I am the storm!'); defeatBoss(sim, B, { killMinions: true }); return; }
        B.toppled = false; yield 1.2; continue;
      }
      // claw cannons: threats with a charge glow
      B.charge = 1; const tgt = nearestTarget(sim);
      const at = boatXY(B, [36, (n % 2 ? 1 : -1) * 22, 10]); sim.emit('spinup', { at });
      TC.requestThreat(sim, { src: 'boss', target: tgt, dur: .9 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'claw', at, always: true });
      yield 1.3; B.charge = 0;
      if (n % 2 === 1) { sim.say('juno', 'Missiles! Shoot them down!'); for (let m = 0; m < 6; m++) { const t2 = nearestTarget(sim), cp = TC.coverPoint(sim, t2, 14); TC.fireRocket(sim, { id: 'boss', target: t2 }, boatXY(B, [-4, (m % 2 ? 1 : -1) * 14, 24]), 'missile', { to: [cp[0] + (m - 2.5) * 10, cp[1], cp[2]], speed: 150 }); yield .32; } }
      yield 1.4; n++;
    }
  }
});

// ---------------------------------------------------------------- ADMIRAL KRAKE (3-6): flares, smoke, Red Tide, the FINAL SHOT
def('boss', 'krake', { name: 'ADMIRAL KRAKE', title: 'Commander of the Black Current', time: 90, bonus: 60000,
  parts: { krake: { hp: 40, r: 7, score: 30000, human: true }, lever: { hp: 1, r: 9, hidden: true, noMul: true, score: 0 } },
  bars: B => [{ label: 'KRAKE', f: B.part('krake').hp / B.part('krake').max }],
  init(B, sim) { const s = sim.scene.krake; B.spots = s.spots; B.si = 0; B.x = s.spots[0][0]; B.y = s.spots[0][1]; B.z = s.spots[0][2]; B.leverAt = s.lever; B.final = 0; B.roll = 0; B.mv = null; B.up = 1; },
  pose(B, sim, dt) {
    if (B.mv) { B.mv.u = Math.min(1, B.mv.u + dt / B.mv.d); B.x = lerp(B.mv.a[0], B.mv.b[0], B.mv.u); B.y = lerp(B.mv.a[1], B.mv.b[1], B.mv.u); B.flip = B.mv.u < 1 ? B.mv.u : 0; if (B.mv.u >= 1) B.mv = null; }
    const c = sim.poseOf(0, 'stand'); B.yaw = Math.atan2(c.y - B.y, c.x - B.x);
    const k = B.part('krake'); k.pos = [B.x, B.y, B.z + (B.duck ? 16 : 25)]; k.hidden = B.final > 0;
    const lv = B.part('lever'); lv.pos = B.leverAt.slice(); lv.hidden = B.final <= 0;
  },
  onPart(B, sim, part) {
    if (part.id === 'lever') { B.finalHit = true; part.alive = true; part.hp = 1; }
    if (part.id === 'krake') { part.alive = true; part.hp = 1; }
  },
  *script(B, sim) {
    yield () => B.intro <= 0;
    const k = B.part('krake'); let n = 0;
    while (!B.defeated) {
      if (k.hp <= k.max * .15 || k.hp <= 1.01) {
        // the FINAL SHOT: he lunges for the master sluice lever; slow motion, a 3-second ring over the lever arm
        sim.say('tejada', "He's going for the master lever—stop him!");
        B.mv = { a: [B.x, B.y], b: [B.leverAt[0] - 14, B.leverAt[1]], u: 0, d: .6 }; yield .6;
        B.final = 3; B.finalHit = false; sim.emit('finalshot', { at: B.leverAt.slice() }); sim.slow = 1;
        while (B.final > 0 && !B.finalHit) { B.final -= 1 / 120; yield; }
        sim.slow = 0;
        if (B.finalHit) { B.final = 0; k.hp = 0; sim.emit('kill', { boss: 'krake', at: [B.x, B.y, B.z + 20] }); defeatBoss(sim, B); sim.say('krake', 'The sea… always… wins…'); return; }
        B.final = 0; sim.water += 3; sim.emit('surge', {}); sim.say('juno', 'TIDE RISING! Again—stop him!'); k.hp = Math.max(2, k.max * .2); yield 1.2;
        B.mv = { a: [B.x, B.y], b: B.spots[0].slice(), u: 0, d: .8 }; yield 1;
        continue;
      }
      // roll to the next console
      B.si = (B.si + 1 + (sim.rng('boss')() * (B.spots.length - 1) | 0)) % B.spots.length; const s = B.spots[B.si];
      B.duck = false; B.mv = { a: [B.x, B.y], b: [s[0], s[1]], u: 0, d: .7 }; sim.emit('roll', {}); yield .8;
      // twin flare pistols
      for (let f = 0; f < 2; f++) { TC.fireRocket(sim, { id: 'boss', target: nearestTarget(sim) }, [B.x, B.y, B.z + 22], 'flare'); yield .5; }
      yield 1.2;
      if (n % 3 === 1) { sim.emit('smoke', { s: 3 }); sim.flags.smoke = sim.t + 3; }
      if (n % 3 === 2 && sim.enemies.filter(e => !e.dead).length < 2) { for (const cv of sim.scene.krake.minions) TC.makeEnemy(sim, 'redtide', cv, { entry: 'roll' }); }
      B.duck = true; yield 1.3; n++;
    }
  },
  defeatLine: ['kai', 'Not today.']
});
