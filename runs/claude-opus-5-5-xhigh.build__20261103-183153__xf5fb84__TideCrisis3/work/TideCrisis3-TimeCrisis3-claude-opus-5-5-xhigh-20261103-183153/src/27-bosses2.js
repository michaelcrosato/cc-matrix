/* 27-bosses2: The Gull (2-3), Hammerhead (2-B), the Seawolf gunship (3-2 and 3-4), Scylla (3-B, phase 1) and
 * Admiral Krake (3-B, phase 2) with the FINAL SHOT. Every attack is a threat or a shootable projectile. */
ENEMY('gull', { name: 'The Gull', hp: 4, score: 8000, elite: true, ai: 'sniper', tele: 1.4, look: { weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#6a7078', cloth: '#4a5056', hair: '#5a6068', pants: '#34383c', skin: '#c8a080' } } });

/* ======================= THE GULL: a laser sniper among three perches on the lighthouse gallery ======================= */
def('boss', 'gull', { name: 'THE GULL', title: 'Black Current marksman', card: false,
  frac: B => B.e ? Math.max(0, B.e.hp) / B.e.hp0 : 0,
  make(sim, B) { B.e = spawnEnemy(sim, 'gull', 'p1', { entry: 'stand' }); B.e.hp = B.e.hp0 = 4 * tune.enemy.bossHpMul; B.perch = 0; sim.say('gull', 'Hold still, little agents.'); },
  step(sim, B, dt) {
    const e = B.e;
    if (!e.alive) { B.defeat(sim); sim.cue('gull-down'); return; }
    // after each shot he moves to another perch along the gallery
    if (e.state === 'hide' && e.st < dt * 1.5 && B.lastState !== 'hide' && B.lastState) { const ids = ['p1', 'p2', 'p3']; B.perch = (B.perch + 1 + (sim.rng('ai') < .5 ? 1 : 0)) % 3; const cv = sim.scene.coversById[ids[B.perch]]; e.cover = cv; e.hide = cv.at.slice(); e.state = 'relocate'; e.st = 0; }
    B.lastState = e.state;
  },
  draw() {}
});

/* ======================= HAMMERHEAD: a minigun, a hatch-door shield, degrading cover ======================= */
def('boss', 'hammerhead', { name: 'HAMMERHEAD', title: 'The enforcer', card: true, speaker: 'hammerhead',
  frac: B => Math.max(0, B.body.hp) / B.body.max,
  make(sim, B) {
    B.rig = makeRig(sim, reg('speaker', 'hammerhead').rig); B.x = 1622; B.y = -18; B.z = 544; B.face = Math.PI; B.shieldUp = true; B.shieldOff = 0; B.coverHp = 3; B.swapped = false; B.lastHitT = -9;
    B.body = B.part('body', { hp: 60, score: 20000, noBar: false, open: true });
    B.shield = B.part('shield', { hp: 1, armor: true, noBar: true, noMul: true, onArmor: (s2, b, w) => { if ((w === 'sg' || w === 'gl') && b.shieldOff <= 0) { b.shieldOff = 1.5; s2.ev({ type: 'shieldoff' }); } } });
    B.r = { rig: B.rig, hit: B.body, pose: null }; B.rigs.push(B.r);
    B.set('advance', sim); B.next = 'sweep'; B.dmgWin = [];
  },
  step(sim, B, dt) {
    const half = B.body.hp <= B.body.max * .5, c = sim.cameraFor(0);
    B.shieldOff = Math.max(0, B.shieldOff - dt);
    if (half && !B.broke) { B.broke = true; B.shieldUp = false; sim.say('hammerhead', 'MY DOOR! YOU BROKE MY DOOR!'); sim.ev({ type: 'explode', at: [B.x, B.y + 10, B.z + 20], r: 30 }); B.set('charge', sim); }
    const shielded = B.shieldUp && B.shieldOff <= 0;
    // the shield: an armored slab in front of him, from the shins up
    const fx = Math.cos(B.face), fy = Math.sin(B.face), sx = B.x + fx * 13, sy = B.y + fy * 13;
    B.shield.alive = shielded; B.shield.vol = shielded ? { box: [sx - 2, sy - 14, B.z + 13, sx + 2, sy + 14, B.z + 48], yaw: B.face, cx: sx, cy: sy } : null;
    let pose = { x: B.x, y: B.y, z: B.z, vx: 0, vy: 0, facing: B.face, point: true, aim: Math.atan2(c.z - (B.z + 36), Math.hypot(c.x - B.x, c.y - B.y)), expr: 'angry', stance: null };
    if (B.dead) { B.fallT = (B.fallT || 0) + dt; B.x += Math.cos(B.face + Math.PI) * dt * 20; pose = { x: B.x, y: B.y, z: B.z - Math.max(0, B.fallT - .6) * B.fallT * 200, facing: B.face, air: B.fallT > .6, pose: B.fallT < .6 ? 'die' : null, expr: 'wince' }; B.r.pose = pose; B.r.hit = null; return; }
    switch (B.state) {
      case 'advance': {   // walks behind his shield; only the shins are open (a shotgun or launcher hit knocks it aside)
        B.face = Math.atan2(c.y - B.y, c.x - B.x); const tx = 1600 + Math.sin(B.t * .5) * 10, ty = -18 + Math.sin(B.t * .8) * 26;
        B.x += (tx - B.x) * dt * .8; B.y += (ty - B.y) * dt * .8; pose.vx = (tx - B.x) * .8; pose.vy = (ty - B.y) * .8;
        if (B.st > 3.2) B.set(B.next, sim);
        break;
      }
      case 'sweep': {   // spin up (a whine, the barrels glow, a big ring), then a sweep: exposed at any moment = hit
        if (B.st < dt * 1.5) { B.hits = {}; for (const p of sim.players) if (!p.out) bossThreat(sim, B, 'sweep', 1.2, () => B.rig.tip(), { target: p.id }); sim.ev({ type: 'spinup', at: [B.x, B.y, B.z + 30] }); if (!sim.flag('minigun')) sim.say('rook', 'Minigun! Get down!'); }
        B.spin = Math.min(1, B.st / 1.2);
        if (B.st > 1.2 && B.st < 3.7) {
          const u = (B.st - 1.2) / 2.5; B.face = Math.atan2(c.y - B.y, c.x - B.x) + (u - .5) * .9;
          if (Math.floor(B.st * 14) !== Math.floor((B.st - dt) * 14)) sim.ev({ type: 'eshot', from: B.rig.tip(), to: [c.x + (u - .5) * 120, c.y - 40, c.z - 10], miss: true, kind: 'gunner' });
          for (const p of sim.players) if (!p.out && p.present && !B.hits[p.id] && p.c < .5) { B.hits[p.id] = true; if (hurtPlayer(sim, p, 'sweep')) sim.ev({ type: 'eshot', from: B.rig.tip(), to: null, p: p.id, kind: 'gunner' }); }
        }
        if (B.st >= 3.7) { B.spin = 0; B.coverHp--; sim.ev({ type: 'coverhit', hp: B.coverHp }); if (B.coverHp <= 0 && !B.swapped) { B.swapped = true; sim.swapSlots(sim.scene.alt); sim.say('kai', "Cover's gone. Moving!"); } B.next = 'grenades'; B.set('advance', sim); }
        break;
      }
      case 'grenades': {   // three grenades in arcs: shoot them near him and they hurt him
        if (B.st > .4 && !B.thrown) {
          B.thrown = true;
          for (let k = 0; k < 3; k++) {
            const tgt = pickTarget(sim, [B.x, B.y]); if (tgt < 0) break;
            const cam = sim.cameraFor(tgt), g = sim.slotGround(tgt), land = [g[0] + Math.cos(cam.yaw) * (30 + k * 12), g[1] + Math.sin(cam.yaw) * (30 + k * 12) + (k - 1) * 14, g[2]], h = B.rig.hand('L'), T = 1.2 + k * .35;
            const pr = sim.launch({ kind: 'grenade', pos: h, vel: [(land[0] - h[0]) / T, (land[1] - h[1]) / T, (land[2] - h[2]) / T + .5 * 300 * T], gravity: 300, life: T + .05, hp: 1, target: tgt, land });
            pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'grenade', src: pr.id, pos: () => pr.pos }); if (pr.th) pr.th.srcAlive = () => pr.alive;
            pr.onShot = p => { if (V3.dist(pr.pos, [B.x, B.y, B.z + 20]) < 70 && !B.dead) { B.body.hp -= 4; B.body.flash = 1; sim.ev({ type: 'bosshit', part: 'body', at: pr.pos.slice() }); if (p) addScore(sim, p, 1000, pr.pos.slice()); } };
          }
          pose.attack = { spec: E.MOVES.throw, phase: 'active', u: .5 };
        }
        if (B.st > 2.6) { B.thrown = false; B.next = 'sweep'; B.set('advance', sim); }
        break;
      }
      case 'charge': {   // below half: no shield, he charges; 6 damage within 1.5 s staggers him, else he slams the cover
        B.face = Math.atan2(c.y - B.y, c.x - B.x);
        if (!B.chargeTo) { const g = sim.slotGround(0); B.chargeFrom = [B.x, B.y]; B.chargeTo = [g[0] + Math.cos(c.yaw) * 34, g[1] + Math.sin(c.yaw) * 34]; B.chargeHp = B.body.hp; B.lunge = 0; }
        B.lunge += dt; const u = Math.min(1, B.lunge / 1.5);
        B.x = lerp(B.chargeFrom[0], B.chargeTo[0], u); B.y = lerp(B.chargeFrom[1], B.chargeTo[1], u); pose.sprint = true; pose.point = false; pose.vx = (B.chargeTo[0] - B.chargeFrom[0]) / 1.5; pose.vy = (B.chargeTo[1] - B.chargeFrom[1]) / 1.5;
        if (B.chargeHp - B.body.hp >= 6) { B.set('stagger', sim); B.chargeTo = null; sim.ev({ type: 'shake', k: .5 }); break; }
        if (u >= 1) { B.th = bossThreat(sim, B, 'slam', .5, () => [B.x, B.y, B.z + 30]); B.set('slam', sim); B.chargeTo = null; }
        break;
      }
      case 'slam': { pose.attack = { spec: E.MOVES.haymaker, phase: B.st < .5 ? 'wind' : 'active', u: Math.min(1, B.st / .5) }; if (B.st > 1) { B.set('back', sim); } break; }
      case 'stagger': { pose.pose = 'kneel'; pose.point = false; pose.hurt = true; if (B.st > 1.6) B.set('back', sim); break; }
      case 'back': { const tx = 1610, ty = -18; pose.vx = (tx - B.x) * 2; pose.vy = (ty - B.y) * 2; B.x += (tx - B.x) * dt * 2; B.y += (ty - B.y) * dt * 2; if (B.st > 1.2) B.set(B.broke ? (sim.rng('boss') < .5 ? 'sweep' : 'charge') : 'advance', sim); break; }
    }
    if (B.spin > 0) pose.point = true;
    B.r.pose = pose;
    if (B.body.hp <= 0 && !B.dead) { sim.say('hammerhead', 'HAMMERHEAD... FALLS... DOWN...'); B.defeat(sim); }
    // the lighthouse beam dazzles now and then
    if (half && Math.floor(B.t / 8) !== Math.floor((B.t - dt) / 8)) sim.ev({ type: 'cutfx', fx: 'flash' });
  },
  hitShield(sim, B, w) { if (w === 'sg' || w === 'gl') { B.shieldOff = 1.5; sim.ev({ type: 'shieldoff' }); } },
  stepDead: true,
  draw(R, B, sim) {
    if (B.dead && B.fallT > 3) return;
    R.rig(B.rig, B.rig.x, B.rig.y, B.rig.z, { flash: B.body.flash });
    if (B.shieldUp && !B.broke) { const off = B.shieldOff > 0 ? 1.4 : 0, a = B.face + off, M = mat34(B.x + Math.cos(a) * 13, B.y + Math.sin(a) * 13, B.z + 13, a, 0, 0, 1.15); R.mesh('hatchshield', M, { flash: B.shield.flash }); }
    if (B.spin > 0) { const t = B.rig.tip(); R.glow(t, 3 + B.spin * 4, [255, 80, 40], B.spin); }
    const cv = ['', 'cracked', 'broken'][3 - Math.max(0, B.coverHp)] || '';
    if (!B.swapped) { const M = mat34(1508, -30, 544, 0, 0, cv === 'cracked' ? .1 : 0); R.mesh('crate1', M, { dim: cv ? .6 : 1 }); R.mesh('crate1', mat34(1508, -14, 544, 0), { dim: cv ? .6 : 1 }); R.mesh('crate1', mat34(1508, 2, 544, 0), {}); }
  }
});

/* ======================= SEAWOLF: the gunship (3-2: strafes, drops troops, retreats; 3-4: pods, then the rotor) ======================= */
function seawolfCommon(final) {
  return {
    name: 'SEAWOLF', title: 'Black Current gunship', card: false,
    frac: B => final ? (Math.max(0, B.pod0.hp) + Math.max(0, B.pod1.hp) + Math.max(0, B.hub.hp)) / (B.pod0.max + B.pod1.max + B.hub.max) : Math.max(0, B.body.hp) / B.body.max,
    make(sim, B) {
      B.final = final; B.pos = final ? [1300, -320, sim.carriers.lift.pos[2] + 60] : [1000, -380, 180]; B.yaw = 0; B.roll = 0; B.rotor = 0;
      if (final) { B.pod0 = B.part('pod0', { hp: 6, weak: true, score: 3000 }); B.pod1 = B.part('pod1', { hp: 6, weak: true, score: 3000 }); B.hub = B.part('hub', { hp: 10, weak: true, open: false, score: 8000 }); }
      else B.body = B.part('body', { hp: 24, weak: true, score: 6000 });
      B.set('arrive', sim); B.fire = 2; B.drops = 0;
    },
    step(sim, B, dt) {
      B.rotor += dt * 30;
      const c = sim.cameraFor(0);
      if (B.dead) { B.pos[2] -= dt * (B.final ? 90 : -40); B.pos[0] += Math.cos(B.yaw) * dt * 80; B.roll += dt * (B.final ? 2 : 0); if (B.final && !B.splashed && B.pos[2] < sim.waterZ()) { B.splashed = true; sim.ev({ type: 'explode', at: B.pos.slice(), r: 120, big: true }); sim.ev({ type: 'splash', at: B.pos.slice() }); } return; }
      const base = B.final ? [c.x + Math.cos(c.yaw) * 200 - Math.sin(c.yaw) * Math.sin(B.t * .25) * 70, c.y + Math.sin(c.yaw) * 200 + Math.cos(c.yaw) * Math.sin(B.t * .25) * 70, c.z + 30 + Math.sin(B.t * .5) * 12] : [820 + Math.sin(B.t * .25) * 30, Math.sin(B.t * .22) * 50, 125 + Math.sin(B.t * .4) * 12];
      if (B.state === 'arrive') { B.pos = V3.lerp(B.pos, base, Math.min(1, dt * .8)); if (B.st > 3) B.set('hover', sim); }
      else if (B.state === 'hover' || B.state === 'strafe') {
        B.pos = V3.lerp(B.pos, base, Math.min(1, dt * 1.2));
        B.fire -= dt;
        if (B.fire <= 0) {   // a strafing burst: a chain of threats with the minimum gap between them
          const tgt = pickTarget(sim, B.pos); B.fire = 3.2 * tune.enemy.fireMul;
          if (tgt >= 0) for (let k = 0; k < 1; k++) { const th = requestThreat(sim, tgt, { always: true, tele: 1.1, kind: 'gunship', src: -1, pos: () => [B.pos[0], B.pos[1], B.pos[2] - 8] }); if (th) { th.srcAlive = () => !B.dead; th.onResolve = () => sim.ev({ type: 'eshot', from: [B.pos[0], B.pos[1], B.pos[2] - 8], to: null, p: tgt, kind: 'gunner' }); } }
          for (let k = 0; k < 6; k++) sim.ev({ type: 'eshot', from: [B.pos[0], B.pos[1], B.pos[2] - 8], to: [c.x + (k - 3) * 20, c.y - 30 + k * 6, c.z - 16], miss: true, kind: 'gunner' });
          if (!B.final && B.drops < 2 && B.t > 6) { B.drops++; sim.cue('seawolf-drop'); }
          if (B.final && B.t > 4 && sim.enemies.filter(e => e.alive && e.carrier === 'lift').length < 1 && B.drops < 2) { B.drops++; for (const s of [-1, 1]) spawnEnemy(sim, 'deckhand', null, { entry: 'rappel', carrier: 'lift', local: [30, s * 12, 3], ropeH: 60 }); }
        }
      }
      B.yaw = Math.atan2(c.y - B.pos[1], c.x - B.pos[0]); B.roll = Math.sin(B.t * .9) * .12;
      B.M = mat34(B.pos[0], B.pos[1], B.pos[2], B.yaw, 0, B.roll);
      if (B.final) {
        B.pod0.vol = B.pod0.alive ? { c: L2W(B.M, [-4, -24, -10]), r: 7 } : null; B.pod1.vol = B.pod1.alive ? { c: L2W(B.M, [-4, 24, -10]), r: 7 } : null;
        B.hub.open = !B.pod0.alive && !B.pod1.alive; B.hub.vol = { c: L2W(B.M, [0, 0, 14]), r: 8 };
        if (B.hub.open && !B.saidHub) { B.saidHub = true; sim.say('juno', 'Pods are down! Hit the rotor hub!'); }
        if (!B.hub.alive) { B.defeat(sim); sim.cue('seawolf2-down'); }
      } else { B.body.vol = { c: L2W(B.M, [0, 0, 0]), r: 14 }; if (B.body.hp <= 0) { B.defeat(sim); sim.say('juno', "He's pulling out! Seawolf is retreating!"); sim.cue('seawolf-down'); } }
    },
    stepDead: true,
    draw(R, B, sim) {
      if (!B.M || (B.dead && (B.splashed || B.pos[2] > 500))) return;
      const M = mat34(B.pos[0], B.pos[1], B.pos[2], B.yaw, 0, B.roll);
      R.mesh('seawolf', M, { flash: (B.body || B.hub).flash * .5 });
      R.mesh('rotor', mulMat34(M, mat34(0, 0, 14, B.rotor)), {});
      R.mesh('rotor', mulMat34(M, mat34(-72, 0, 8, 0, 0, Math.PI / 2, .25)), {});
      if (B.final) { if (B.pod0.alive) R.mesh('pod', mulMat34(M, mat34(-4, -24, -10, 0)), { flash: B.pod0.flash }); if (B.pod1.alive) R.mesh('pod', mulMat34(M, mat34(-4, 24, -10, 0)), { flash: B.pod1.flash }); if (B.hub.open) R.glow(L2W(M, [0, 0, 14]), 8, [255, 200, 80], .6 + .3 * Math.sin(sim.t * 8)); }
      if (B.dead) R.fire(B.pos, 1.5);
      R.light([B.pos[0], B.pos[1], B.pos[2] - 10], 100, .4);
    }
  };
}
def('boss', 'seawolf', seawolfCommon(false));
def('boss', 'seawolf2', seawolfCommon(true));

/* ======================= SCYLLA (3-B phase 1): six knees, claw cannons, missile volleys, topple, cockpit ======================= */
function segMat(a, b, r = 1) {
  const d = V3.sub(b, a), L = V3.len(d) || 1, x = V3.mul(d, 1 / L), up = Math.abs(x[2]) > .9 ? [1, 0, 0] : [0, 0, 1], y = V3.norm(V3.cross(up, x)), z = V3.cross(x, y);
  return [x[0] * L, y[0] * r, z[0] * r, a[0], x[1] * L, y[1] * r, z[1] * r, a[1], x[2] * L, y[2] * r, z[2] * r, a[2]];
}
TC.segMat = segMat;
def('boss', 'scylla', { name: 'SCYLLA', title: "Admiral Krake's crab walker", card: true, speaker: 'krake',
  frac: B => B.phase === 2 ? .5 * Math.max(0, B.kr.hp) / B.kr.max : .5 + .5 * (B.knees.reduce((a, k) => a + Math.max(0, k.hp), 0) + Math.max(0, B.cock.hp)) / (B.knees.reduce((a, k) => a + k.max, 0) + B.cock.max),
  make(sim, B) {
    B.phase = 1; B.pos = [1560, 60, TW.roof]; B.yaw = Math.PI; B.tilt = 0; B.topples = 0; B.gait = 0;
    B.knees = []; for (let i = 0; i < 6; i++) B.knees.push(B.part('knee' + i, { hp: 6, weak: true, score: 2500, leg: i, onBreak: (s, b) => { s.ev({ type: 'explode', at: b.knees[i].vol.c.slice(), r: 30 }); } }));
    B.cock = B.part('cockpit', { hp: 16, weak: true, open: false, score: 10000 });
    B.claw = [0, 0]; B.fire = 2; B.volley = 6; B.set('walk', sim);
    B.kr = B.part('krake', { hp: 32, noBar: true, open: false, score: 30000 });
    B.krig = makeRig(sim, Object.assign({}, reg('speaker', 'krake').rig, { weapon: 'flare' }));
    B.r = { rig: B.krig, hit: null, pose: null, live: false }; B.rigs.push(B.r);
  },
  step(sim, B, dt) {
    if (B.phase === 2) { krakeStep(sim, B, dt); return; }
    const c = sim.cameraFor(0), body = [B.pos[0], B.pos[1], B.pos[2] + 46 - B.tilt * 18];
    B.gait += dt * (B.state === 'walk' ? 2.2 : .6);
    if (B.state === 'walk' || B.state === 'fire') { B.pos[1] = 60 + Math.sin(B.t * .35) * 34; B.pos[0] = 1565 + Math.sin(B.t * .21) * 14; }
    B.yaw = Math.atan2(c.y - B.pos[1], c.x - B.pos[0]);
    B.M = mat34(body[0], body[1], body[2], B.yaw, 0, B.tilt * 1.05);
    // legs: hips on the body, feet on the roof, knees bent up (IK by construction)
    B.legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3, ang = B.yaw + side * (Math.PI / 2) + (k - 1) * .65 * side, hip = L2W(B.M, [(1 - k) * 20, side * 22, 2]);
      const ph = B.gait + (i % 2) * Math.PI, lift = Math.max(0, Math.sin(ph)) * 10 * (B.state === 'walk' ? 1 : .2), fr = 70 + (B.knees[i].alive ? 0 : -18);
      const foot = [B.pos[0] + Math.cos(ang) * fr + Math.cos(B.yaw) * Math.cos(ph) * 8, B.pos[1] + Math.sin(ang) * fr + Math.sin(B.yaw) * Math.cos(ph) * 8, B.pos[2] + lift];
      const mid = V3.lerp(hip, foot, .45); mid[2] += 34 - B.tilt * (side < 0 ? 20 : -6);
      B.legs.push([hip, mid, foot]);
      B.knees[i].vol = B.knees[i].alive ? { c: mid, r: 6.5 } : null;
      B.knees[i].open = B.state !== 'topple';
    }
    B.cock.vol = { c: L2W(B.M, [34, 0, 12]), r: 12 };
    B.claws = [L2W(B.M, [30, -30, -6]), L2W(B.M, [30, 30, -6])];
    const dead = B.knees.filter(k => !k.alive).length;
    switch (B.state) {
      case 'walk': case 'fire': {
        B.fire -= dt;
        if (B.fire <= 0) {
          if (B.volley-- > 0 && sim.rng('boss') < .6) {   // a claw cannon: a charge glow, then the shot
            const ci = sim.rng('boss') < .5 ? 0 : 1; B.charge = ci; B.chargeT = .9;
            const th = bossThreat(sim, B, 'claw', .9, () => B.claws[ci]); if (th) th.onResolve = () => sim.ev({ type: 'eshot', from: B.claws[ci].slice(), to: null, p: th.target, kind: 'gunner' });
            B.fire = 1.6;
          } else {   // a missile volley of six in arcs: shoot them down or take cover
            for (let k = 0; k < 6; k++) {
              const tgt = pickTarget(sim, body); if (tgt < 0) break;
              const cam = sim.cameraFor(tgt), from = L2W(B.M, [-10, (k % 2 ? 1 : -1) * 26, 18]), land = [cam.x + Math.cos(cam.yaw) * (24 + k * 3), cam.y + Math.sin(cam.yaw) * (24 + k * 3) + (k - 2.5) * 10, cam.z - 14], T = 1.6 + k * .38;
              const pr = sim.launch({ kind: 'missile', pos: from, vel: [(land[0] - from[0]) / T, (land[1] - from[1]) / T, (land[2] - from[2]) / T + .5 * 120 * T], gravity: 120, life: T, hp: 1, target: tgt, land, home: true });
              pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'missile', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
            }
            B.volley = 3 + (sim.rng('boss') * 3 | 0); B.fire = 4.2;
          }
        }
        B.chargeT = Math.max(0, (B.chargeT || 0) - dt);
        if (dead >= 3 * (B.topples + 1) && B.topples < 2) { B.topples++; B.set('topple', sim); sim.ev({ type: 'shake', k: .8 }); sim.say('juno', "It's down! Hit the cockpit!"); }
        break;
      }
      case 'topple': {   // on its side: the cockpit hatch opens for 6 s
        B.tilt = Math.min(1, B.st / .6) * (B.st < 6.4 ? 1 : Math.max(0, 1 - (B.st - 6.4) / .8));
        B.cock.open = B.st > .6 && B.st < 6.4;
        if (B.topples >= 2 && B.st > .6) { B.cock.open = true; }
        if (!B.cock.alive || (B.topples >= 2 && B.knees.every(k => !k.alive) && B.st > 1.5)) { B.cockBreak(sim); return; }
        if (B.st > 7.2) { B.tilt = 0; B.cock.open = false; B.set('walk', sim); B.limp = true; }
        break;
      }
    }
  },
  draw(R, B, sim) {
    if (B.phase === 2) { krakeDraw(R, B, sim); return; }
    if (!B.M) return;
    R.mesh('scylla-body', B.M, { flash: B.flash * .4 });
    R.mesh('scylla-hatch', mulMat34(B.M, mat34(18, 0, 22, 0, B.cock.open ? 1.2 : 0)), { flash: B.cock.flash });
    if (B.cock.open) R.glow(B.cock.vol.c, 10, [255, 180, 60], .7);
    for (let i = 0; i < 6; i++) { const [h, m, f] = B.legs[i]; R.mesh('leg', segMat(h, m, 1.3), {}); R.mesh('leg', segMat(m, f, 1), {}); if (B.knees[i].alive) R.mesh('knee', mat34(m[0], m[1], m[2], 0), { flash: B.knees[i].flash, glow: .4 + .3 * Math.sin(sim.t * 6 + i) }); else R.fire(m, .5); }
    for (let k = 0; k < 2; k++) { const at = B.claws[k]; R.mesh('claw', mat34(at[0], at[1], at[2], B.yaw + (k ? .25 : -.25)), {}); if (B.charge === k && B.chargeT > 0) R.glow(L2W(mat34(at[0], at[1], at[2], B.yaw + (k ? .25 : -.25)), [40, 0, 0]), 4 + (1 - B.chargeT) * 6, [255, 90, 40], 1); }
  }
});
/** the cockpit breaks: Krake ejects; the fight moves into the control room */
reg('boss', 'scylla').make = (orig => function (sim, B) {
  orig.call(this, sim, B);
  B.cockBreak = sim2 => {
    B.phase = 2; B.cock.alive = false; for (const k of B.knees) { k.alive = false; k.vol = null; }
    sim2.ev({ type: 'explode', at: B.cock.vol.c.slice(), r: 80, big: true }); sim2.ev({ type: 'bossstate', id: 'scylla', state: 'krake' });
    sim2.say('krake', 'You think a machine is my only weapon? I am the storm!');
    sim2.swapSlots(sim2.scene.alt); sim2.timer = Math.max(sim2.timer, 0) + 90 * sim2.diff.time * tune.time.sceneMul; sim2.ev({ type: 'extend', s: 90 });
    B.kx = 1580; B.ky = -80; B.kz = TW.roof; B.r.live = true; B.r.hit = B.kr; B.kr.open = true; B.kstate = 'enter'; B.kst = 0; B.flares = 0; B.final = 0; B.lever = 0;
    sim2.ev({ type: 'music', song: 'kingtide' });
    B.D = Object.assign({}, B.D, { name: 'ADMIRAL KRAKE' });
  };
})(reg('boss', 'scylla').make);

/* ======================= ADMIRAL KRAKE (3-B phase 2) and the FINAL SHOT ======================= */
const KSPOTS = [[1584, -96], [1584, -64], [1540, -80], [1572, -110]];
function krakeStep(sim, B, dt) {
  const c = sim.cameraFor(0); B.kst += dt;
  if (B.kr.hp <= B.kr.max * .02 && !B.dead) { B.kr.hp = B.kr.max * .02; B.kr.alive = true; }
  const pose = { x: B.kx, y: B.ky, z: B.kz, facing: Math.atan2(c.y - B.ky, c.x - B.kx), point: true, aim: Math.atan2(c.z - (B.kz + 30), Math.hypot(c.x - B.kx, c.y - B.ky)), expr: 'angry' };
  if (B.dead) { pose.pose = 'die'; pose.point = false; B.r.pose = pose; return; }
  const k = B.kstate;
  if (k === 'enter') { pose.air = B.kst < .6; if (B.kst > 1) { B.kstate = 'shoot'; B.kst = 0; } }
  else if (k === 'dodge') {   // a roll to another console
    const u = Math.min(1, B.kst / .7); B.kx = lerp(B.from[0], B.to[0], u); B.ky = lerp(B.from[1], B.to[1], u); pose.flip = u < 1 ? u : 0; pose.point = false;
    if (u >= 1) { B.kstate = sim.rng('boss') < .3 ? 'smoke' : 'shoot'; B.kst = 0; }
  } else if (k === 'shoot') {   // flares from the pistol: slow, glowing, shootable
    if (B.kst > .5 && B.kst - dt <= .5 || B.kst > 1.3 && B.kst - dt <= 1.3) {
      const tgt = pickTarget(sim, [B.kx, B.ky]); if (tgt >= 0) {
        const cam = sim.cameraFor(tgt), from = B.krig.tip(), to = [cam.x, cam.y, cam.z - 4], d = V3.dist(from, to);
        const pr = sim.launch({ kind: 'flare', pos: from, vel: V3.mul(V3.norm(V3.sub(to, from)), 160), life: d / 160, hp: 1, target: tgt, land: to, home: true });
        pr.th = requestThreat(sim, tgt, { always: true, tele: Math.max(.9, d / 160), kind: 'flare', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
      }
    }
    if (B.kst > 2.2) { const spot = KSPOTS[(sim.rng('boss') * KSPOTS.length) | 0]; B.from = [B.kx, B.ky]; B.to = spot; B.kstate = 'dodge'; B.kst = 0; }
    if (sim.enemies.filter(e => e.alive && !e.civ && !e.ally).length === 0 && B.kst > 1 && (B.summons = (B.summons || 0)) < 4 && sim.rng('boss') < dt * .6) { B.summons++; spawnEnemy(sim, 'redtide', 'd1', { entry: 'door', from: [1600, -50, TW.roof] }); spawnEnemy(sim, 'redtide', 'd2', { entry: 'door', from: [1600, -110, TW.roof] }); }
  } else if (k === 'smoke') { pose.attack = { spec: E.MOVES.throw, phase: 'active', u: .5 }; if (B.kst > .4 && !B.smoked) { B.smoked = true; sim.ev({ type: 'smoke', s: 3 }); } if (B.kst > 1) { B.smoked = false; B.kstate = 'shoot'; B.kst = 0; } }
  else if (k === 'lunge') {   // the FINAL SHOT: he lunges for the master lever; slow motion; hit the lever arm within 3 s
    B.kx = lerp(B.kx, 1590, dt * 3); B.ky = lerp(B.ky, -86, dt * 3); pose.facing = 0; pose.point = false; pose.attack = { spec: E.MOVES.thrust, phase: 'wind', u: Math.min(1, B.kst / 3) };
    B.finalT = Math.max(0, 3 - B.kst); B.lever = Math.min(1, B.kst / 3) * .5;
    if (B.kst > 3) { B.finalT = 0; B.lever = 0; sim.waterRise = (sim.waterRise || 0) + 4; sim.ev({ type: 'surge' }); sim.say('juno', 'The water\'s surging! TIDE RISING!'); B.kstate = 'shoot'; B.kst = 0; B.nextFinal = sim.t + 6; B.leverPart.open = false; }
  }
  if (B.kr.hp <= B.kr.max * .15 && k !== 'lunge' && (!B.nextFinal || sim.t > B.nextFinal)) {
    B.kstate = 'lunge'; B.kst = 0; sim.ev({ type: 'final' }); sim.say('tejada', "He's going for the master lever. Stop him!");
    if (!B.leverPart) B.leverPart = B.part('lever', { hp: 1, noBar: true, noMul: true, score: 50000, onBreak: (s, b, p) => { b.finalHit(s, p); } });
    B.leverPart.alive = true; B.leverPart.hp = 1; B.leverPart.open = true;
  }
  if (B.leverPart) B.leverPart.vol = B.leverPart.open ? { a: [1592, -80, TW.roof + 22], b: [1592, -80, TW.roof + 48], r: 5 } : null;
  B.r.pose = pose;
}
reg('boss', 'scylla').make = (orig => function (sim, B) {
  orig.call(this, sim, B);
  B.finalHit = (sim2, p) => { B.finalT = 0; B.kr.hp = 0; sim2.ev({ type: 'explode', at: [1592, -80, TW.roof + 40], r: 30 }); sim2.say('krake', 'The sea... always... wins...'); B.defeat(sim2); sim2.ev({ type: 'slowmo', s: 1.2 }); void p; };
})(reg('boss', 'scylla').make);
function krakeDraw(R, B, sim) {
  R.rig(B.krig, B.krig.x, B.krig.y, B.krig.z, { flash: B.kr.flash });
}
TC.krakeStep = krakeStep;
