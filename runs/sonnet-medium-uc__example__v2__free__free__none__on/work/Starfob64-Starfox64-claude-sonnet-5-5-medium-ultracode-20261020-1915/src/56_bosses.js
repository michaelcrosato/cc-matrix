// ===================================================================
//  BOSSES  -  multi-part enemies with phases, procedural leg IK, beams, serpent trail
// ===================================================================
const Bosses = {};
ENEMIES.part = {
  cat: 'part', hp: 10, r: 3, score: 300,
  build: (e) => (e.makeMesh ? e.makeMesh(e) : null),
  die(e) { if (e.onDie) e.onDie(e); else defaultDie(e, 1.7, 0xff9a30, 0x5a4a7a); },
};
function spawnPart(o) {
  const e = spawn('part', o.pos || new V3(), Object.assign({ isBoss: true, isPartOfBoss: true, noRam: true }, o));
  return e;
}
function partsHp(list) { let h = 0; for (const p of list) if (p.alive && p.hp < 900) h += p.hp; return h; }

// ---- beams (telegraphed sweeping hazard)
G.beams = [];
const BEAM_GEO = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; })();
function fireBeam(getOrigin, from, to, tel = 1.1, dur = 1.8, color = 0xff3050, width = 1.6, length = 520) {
  const core = new THREE.Mesh(BEAM_GEO, glowMat(color, 1, false, 2)); const halo = new THREE.Mesh(BEAM_GEO, glowMat(color, 0.35, true, 1.4));
  core.frustumCulled = false; halo.frustumCulled = false;
  G.world.add(core, halo);
  const b = { getOrigin, a: from.clone(), b: to.clone(), t: 0, tel, dur, core, halo, width, length, alive: true, hitT: 0 };
  G.beams.push(b);
  Snd.play('beam');
  return b;
}
function updateBeams(dt) {
  const pl = G.pl;
  for (const b of G.beams) {
    b.t += dt; b.hitT -= dt;
    const o = b.getOrigin();
    const u = clamp((b.t - b.tel) / b.dur, 0, 1);
    const aim = _v1.copy(b.a).lerp(b.b, smooth(u));
    const dir = _v2.copy(aim).sub(o).normalize();
    const active = b.t >= b.tel;
    const w = active ? b.width * (1 + Math.sin(b.t * 40) * 0.08) : 0.12;
    for (const m of [b.core, b.halo]) {
      m.position.copy(o); m.lookAt(_v3.copy(o).add(dir));
      const k = m === b.halo ? (active ? 2.6 : 0.5) : 1;
      m.scale.set(w * k, w * k, b.length);
    }
    b.halo.material.opacity = active ? 0.35 : 0.5 + Math.sin(b.t * 30) * 0.3;
    if (active && !pl.dead && b.hitT <= 0) {
      const toP = _v3.copy(pl.pos).sub(o);
      const along = toP.dot(dir);
      if (along > 0 && along < b.length) {
        const d = toP.addScaledVector(dir, -along).length();
        if (d < b.width * 1.6 + 1.5) { hurt(24, pl.pos, 'crash'); b.hitT = 1.0; }
      }
      if (Math.random() < 0.5) FX.spark(o.clone().addScaledVector(dir, rnd(0, 60)), _v3.set(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)), color_of(b), 0.3, 0.8, 0, 1);
    }
    if (b.t > b.tel + b.dur + 0.15) b.alive = false;
  }
  for (let i = G.beams.length - 1; i >= 0; i--) if (!G.beams[i].alive) { const b = G.beams[i]; G.world.remove(b.core, b.halo); b.core.material.dispose(); b.halo.material.dispose(); G.beams.splice(i, 1); }
}
const color_of = () => 0xff6080;

// ---- boss framework
function startBoss(kind) {
  if (G.boss) return;
  const b = Bosses[kind]();
  G.boss = b; b.kind = kind; b.t = 0; b.defeated = false;
  G.rail.baseScale = 0.55;
  Music.play('boss');
  Snd.play('warning');
  HUD.warning('WARNING');
  HUD.bossBar(b.name);
  if (G.attract) HUD.bossBar(b.name);
}
function bossHpFrac(b) { return clamp(b.hpFn() / b.maxHp, 0, 1); }
function defeatBoss(b) {
  if (b.defeated) return;
  b.defeated = true;
  HUD.bossBar(null);
  G.clearT = 0; // stage clear sequence starts (slow-mo, cinematic)
  for (const e of G.ents) if (e.cat === 'enemy' && e.alive && !e.isPartOfBoss) kill(e, { silent: true });
  for (const e of G.ebs) killEB(e, true);
  const root = b.root;
  for (let i = 0; i < 18; i++) {
    later(i * 0.16, () => {
      const p = root.localToWorld(new V3(rnd(-1, 1) * (b.size ? b.size.x : 14), rnd(-0.5, 1) * (b.size ? b.size.y : 6), rnd(-1, 1) * (b.size ? b.size.z : 10)));
      FX.explosion(p, rnd(1, 2.2), pick([0xff9a30, 0xffd060, 0xff5030]));
      Snd.play(i % 3 ? 'explosion' : 'bigExplosion', { pan: Snd.panFor(p) });
      shake(0.5);
    });
  }
  later(3.1, () => {
    const p = root.getWorldPosition(new V3());
    FX.explosion(p, 5, 0xffb040); FX.flash(p, 70, 0xffffff, 1.0); FX.ring(p, 40, 0xffe0a0, 1.2);
    Snd.play('bigExplosion'); Snd.play('nova', { vol: 0.5 }); shake(1); screenFlash(0xffffff, 0.8);
    G.world.remove(root);
    for (const e of G.ents) if (e.isPartOfBoss && e.alive) kill(e, { silent: true });
    if (b.cleanup) b.cleanup();
  });
  later(4.6, () => { G.boss = null; stageClear(); });
}
function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  b.t += dt;
  if (!b.defeated) {
    b.update(dt);
    HUD.bossHp(bossHpFrac(b));
    if (b.core && !b.core.alive) defeatBoss(b);
  }
}
function podMesh(c = 0x40e0ff) {
  const g = new THREE.Group();
  g.add(mk(GEO.sph, tm(0x40486a), { s: 3.4, out: 0.06 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 8, 28), glowMat(c, 0.95, false, 1.8)); ring.scale.setScalar(4.2); ring.rotation.x = Math.PI / 2; g.add(ring);
  g.add(mk(GEO.sph, solidGlow(c, 1.8), { s: 1.4, cast: false }));
  g.userData.mats = [];
  return g;
}
function limb(mesh, a, b, rad) {
  const d = _v1.copy(b).sub(a), len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(rad, Math.max(0.01, len), rad);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}

// ================================================================ BOSS 1 : BULWARK WALKER (stage 1)
Bosses.walker = () => {
  const root = new THREE.Group(); G.world.add(root);
  const purple = tm(0x5a3f8a), dark = tm(0x2a2848), steel = tm(0x7a7898);
  root.add(mk(GEO.box, purple, { p: [0, 0, 0], s: [22, 6, 15], out: 0.12 }));
  root.add(mk(GEO.box, dark, { p: [0, 3.8, 1], s: [14, 3, 9], out: 0.1 }));
  root.add(mk(GEO.sph, steel, { p: [0, 5.6, 1], s: [4, 2.4, 4], out: 0.08 }));
  root.add(mk(GEO.box, steel, { p: [0, -1, -8.5], s: [10, 3.4, 4], out: 0.1 }));
  for (const sx of [-1, 1]) {
    root.add(mk(GEO.box, steel, { p: [12.5 * sx, 0, 0], s: [3, 4, 12], out: 0.1 }));
    root.add(mk(GEO.cyl, dark, { p: [6 * sx, 1.5, -9.5], r: [Math.PI / 2, 0, 0], s: [0.7, 6, 0.7], out: 0.06 }));
  }
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const hx = (i % 2 ? 1 : -1) * 9, hz = i < 2 ? -4.5 : 4.5;
    const upper = mk(GEO.cyl, steel, { out: 0.1 }), lower = mk(GEO.cyl, dark, { out: 0.1 }), foot = mk(GEO.box, steel, { s: [3.4, 1, 4.6], out: 0.08 });
    root.add(upper, lower, foot);
    legs.push({ hip: new V3(hx, -2.5, hz), upper, lower, foot, ph: i * Math.PI * 0.5 + (i % 2) * 0.6 });
  }
  const b = { name: 'BULWARK WALKER', root, parts: [], size: { x: 12, y: 5, z: 8 }, phase: 1, fireT: 3, volley: 0, beamT: 9, spawnT: 8, chargeT: 0, charge: 0, lateral: 0 };
  const mkPod = (sx) => spawnPart({ pos: new V3(), hp: 26, r: 3.6, score: 700, local: new V3(13.5 * sx, 3, -2), makeMesh: () => podMesh(0x40e0ff), fireT: 2 + (sx > 0 ? 1 : 0) });
  b.podL = mkPod(-1); b.podR = mkPod(1);
  const podsUp = () => (b.podL.alive ? 1 : 0) + (b.podR.alive ? 1 : 0);
  b.core = spawnPart({
    pos: new V3(), hp: 64, r: 3, score: 3000, local: new V3(0, 1, -10.8),
    makeMesh: () => { const g = new THREE.Group(); g.add(mk(GEO.sph, solidGlow(0xff3050, 1.6), { s: 2.4, out: 0.06 })); const cage = mk(GEO.dodeca, glowMat(0xff8090, 0.5, true, 1.2), { s: 3.4, cast: false }); g.add(cage); g.userData.cage = cage; return g; },
    shield: () => podsUp() > 0,
  });
  b.body = spawnPart({ pos: new V3(), hp: 9999, r: 9, score: 0, local: new V3(0, 0, 0), lockable: false, shield: () => true, makeMesh: () => null, countHit: false });
  b.parts = [b.podL, b.podR, b.core];
  b.maxHp = 26 * 2 + 64;
  b.hpFn = () => partsHp(b.parts);
  b.update = (dt) => {
    const t = b.t, rail = G.rail;
    const enter = easeOut(clamp(t / 4.5, 0, 1));
    b.lateral = damp(b.lateral, Math.sin(t * 0.42) * 20, 2, dt);
    b.charge = damp(b.charge, b.chargeT > 0 ? 62 : 0, 1.6, dt);
    b.chargeT = Math.max(0, b.chargeT - dt);
    root.position.set(rail.pos.x + b.lateral, GY + 21 + Math.sin(t * 1.3) * 0.8, rail.pos.z + lerp(-330, -118, enter) + b.charge);
    root.rotation.y = Math.sin(t * 0.42) * 0.12 + Math.PI;
    root.rotation.z = Math.cos(t * 0.42) * 0.05;
    root.updateMatrixWorld(true);
    // legs: procedural walk cycle + two-bone IK
    for (const l of legs) {
      const ph = t * 2.0 + l.ph;
      const foot = _v2.set(l.hip.x * 1.7, -16.6 + Math.max(0, Math.sin(ph)) * 3.2, l.hip.z * 1.6 + Math.cos(ph) * 3.2);
      const d = _v3.copy(foot).sub(l.hip), len = Math.min(d.length(), 13.8);
      const dn = d.clone().normalize();
      const out = new V3(Math.sign(l.hip.x), 0.8, 0); out.addScaledVector(dn, -out.dot(dn)).normalize();
      const h = Math.sqrt(Math.max(0, 49 - (len / 2) * (len / 2)));
      const knee = l.hip.clone().addScaledVector(dn, len / 2).addScaledVector(out, h);
      limb(l.upper, l.hip, knee, 0.8); limb(l.lower, knee, foot, 0.65);
      l.foot.position.copy(foot);
    }
    const alive = enter >= 1;
    for (const p of [b.podL, b.podR, b.core, b.body]) {
      if (!p.alive) continue;
      p.pos.copy(root.localToWorld(p.local.clone()));
      p.mesh && p.mesh.quaternion.copy(root.quaternion);
    }
    const pl = G.pl;
    if (b.core.alive) {
      const cage = b.core.mesh.userData.cage;
      cage.rotation.y += dt * 2; cage.rotation.x += dt * 1.3;
      const open = podsUp() === 0;
      b.core.mesh.scale.setScalar(open ? 1 + Math.sin(t * 8) * 0.08 : 0.7);
    }
    if (!alive || pl.dead) return;
    if (podsUp() > 0) {
      for (const p of [b.podL, b.podR]) {
        if (!p.alive) continue;
        p.mesh.children[1].rotation.z += dt * 2;
        p.fireT -= dt;
        if (p.fireT <= 0) {
          p.fireT = rnd(2.4, 3.4) * (podsUp() === 1 ? 0.7 : 1);
          for (let i = 0; i < 3; i++) later(i * 0.22, () => { if (p.alive && !pl.dead) enemyShotAtPlayer(p.pos.clone(), { speed: 72, spread: 3, color: 0x40d8ff }); });
        }
      }
      b.spawnT -= dt;
      if (b.spawnT <= 0) { b.spawnT = 9; for (let i = 0; i < 3; i++) spawn('drone', p0(b), { mode: 'rel', v: 50, amp: 12, ph: i * 2, shot: 1.5 }); }
    } else {
      if (!b.exposed) { b.exposed = true; Radio.say('kestrel', 'The shield pods are down — the core is exposed! Hit it with everything!'); screenFlash(0xff6080, 0.2); Snd.play('warning', { vol: 0.6 }); }
      b.fireT -= dt;
      const rage = b.core.hp < b.core.maxHp * 0.4;
      if (b.fireT <= 0) {
        b.fireT = rage ? 2.1 : 3.0; b.volley++;
        const n = rage ? 13 : 9;
        for (let i = 0; i < n; i++) {
          const d = _v1.copy(pl.pos).sub(b.core.pos).normalize();
          d.x += (i - (n - 1) / 2) * 0.055; d.y += Math.sin(i * 0.9) * 0.02;
          fireEB(b.core.pos.clone(), d, { speed: 62, color: 0xff3a6a });
        }
      }
      b.beamT -= dt;
      if (b.beamT <= 0 && G.beams.length === 0) {
        b.beamT = rage ? 6.5 : 9;
        const o = () => b.core.pos;
        const base = pl.pos.clone();
        fireBeam(o, base.clone().add(new V3(-45, -4, 0)), base.clone().add(new V3(45, 4, 0)), 1.2, 1.9);
      }
      b.spawnT -= dt;
      if (b.spawnT <= 0) { b.spawnT = 8; for (let i = 0; i < 2; i++) spawn('drone', p0(b), { mode: 'rel', v: 50, amp: 12, ph: i * 3, shot: 1.5 }); }
      if (rage && b.chargeT <= 0 && Math.random() < dt * 0.12) b.chargeT = 2.4;
    }
  };
  b.cleanup = () => { for (const p of [b.body]) if (p.alive) removeEnt(p); };
  return b;
};
function p0(b) { return b.root.getWorldPosition(new V3()); }

// ================================================================ BOSS 2 : ROTOR STATION (stage 2A)
Bosses.rotor = () => {
  const root = new THREE.Group(); G.world.add(root);
  const ringG = new THREE.Group(); root.add(ringG);
  const steel = tm(0x6a6a88), dark = tm(0x30304a);
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 10, 40), steel); ringMesh.castShadow = true; addOutline(ringMesh, 0.1); ringG.add(ringMesh);
  for (let i = 0; i < 4; i++) { const sp = mk(GEO.box, dark, { p: [Math.cos(i * Math.PI / 2) * 8, Math.sin(i * Math.PI / 2) * 8, 0], r: [0, 0, i * Math.PI / 2], s: [16, 1.2, 1.6], out: 0.08 }); ringG.add(sp); }
  const outer = new THREE.Mesh(new THREE.TorusGeometry(24, 0.5, 6, 48), glowMat(0xff4080, 0.8, true, 1.4)); root.add(outer);
  root.add(mk(GEO.cyl, dark, { p: [0, 0, 4], r: [Math.PI / 2, 0, 0], s: [3, 10, 3], out: 0.08 }), mk(GEO.cyl, dark, { p: [0, 0, -4], r: [Math.PI / 2, 0, 0], s: [2, 6, 2], out: 0.08 }));
  const b = { name: 'ROTOR STATION GLOOM-7', root, parts: [], size: { x: 16, y: 16, z: 4 }, fireT: 2, mineT: 8, spiral: 0, spinA: 0, beamT: 10 };
  b.turrets = [];
  for (let i = 0; i < 4; i++) {
    const t = spawnPart({
      pos: new V3(), hp: 14, r: 2.8, score: 600, ang: i * Math.PI / 2, fireT: 1.5 + i * 0.4,
      makeMesh: () => { const g = new THREE.Group(); g.add(mk(GEO.sph, tm(0x7a3fb5), { s: 2.4, out: 0.07 }), mk(GEO.cyl, dark, { p: [0, 0, -2.2], r: [Math.PI / 2, 0, 0], s: [0.35, 2.6, 0.35], out: 0.05 }), mk(GEO.sph, solidGlow(0xff3050, 1.8), { p: [0, 0.8, -1.6], s: 0.4, cast: false })); return g; },
    });
    b.turrets.push(t);
  }
  const live = () => b.turrets.filter((t) => t.alive).length;
  b.core = spawnPart({
    pos: new V3(), hp: 58, r: 4.6, score: 3000,
    makeMesh: () => { const g = new THREE.Group(); g.add(mk(GEO.sph, tm(0x40486a), { s: 4.6, out: 0.07 })); const e = mk(GEO.sph, solidGlow(0xff3050, 1.6), { s: 2.6, cast: false }); g.add(e); g.userData.eye = e; const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 28), glowMat(0x40e0ff, 0.9, false, 1.8)); ring.scale.setScalar(5.6); g.add(ring); g.userData.ring = ring; return g; },
    shield: () => live() > 0,
  });
  b.parts = [...b.turrets, b.core];
  b.maxHp = 14 * 4 + 58;
  b.hpFn = () => partsHp(b.parts);
  b.update = (dt) => {
    const t = b.t, rail = G.rail, pl = G.pl;
    const enter = easeOut(clamp(t / 4.5, 0, 1));
    const rage = b.core.hp < b.core.maxHp * 0.55;
    root.position.set(rail.pos.x + Math.sin(t * 0.4) * 18, rail.pos.y + 3 + Math.sin(t * 0.7) * 5, rail.pos.z + lerp(-340, -125, enter));
    b.spinA += dt * (live() ? 0.5 : rage ? 1.7 : 0.9);
    ringG.rotation.z = b.spinA;
    outer.rotation.z = -b.spinA * 0.5; outer.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
    root.rotation.y = Math.sin(t * 0.4) * 0.15; root.rotation.x = Math.sin(t * 0.3) * 0.05;
    root.updateMatrixWorld(true);
    for (const tu of b.turrets) {
      if (!tu.alive) continue;
      tu.pos.copy(root.localToWorld(_v1.set(Math.cos(tu.ang + b.spinA) * 16, Math.sin(tu.ang + b.spinA) * 16, 0)));
      aimAt(tu.mesh, pl.pos);
    }
    b.core.pos.copy(root.getWorldPosition(_v1));
    if (b.core.alive) {
      const e = b.core.mesh.userData.eye; e.scale.setScalar(live() ? 0.5 : 1 + Math.sin(t * 9) * 0.12);
      b.core.mesh.userData.ring.rotation.x += dt * 2;
    }
    if (enter < 1 || pl.dead) return;
    for (const tu of b.turrets) {
      if (!tu.alive) continue;
      tu.fireT -= dt;
      if (tu.fireT <= 0) {
        tu.fireT = rnd(2.0, 3.0) * (live() < 3 ? 0.7 : 1);
        for (let i = 0; i < 2; i++) later(i * 0.2, () => { if (tu.alive && !pl.dead) enemyShotAtPlayer(tu.pos.clone(), { speed: 78, spread: 3, color: 0xff7a30 }); });
      }
    }
    if (live() === 0) {
      if (!b.exposed) { b.exposed = true; Radio.say('newt', 'The turrets are offline — the core\'s vulnerable! Shoot the red eye!'); screenFlash(0xff6080, 0.2); }
      b.mineT -= dt;
      if (b.mineT <= 0) { b.mineT = rage ? 5 : 7; for (let i = 0; i < 3; i++) spawn('mine', b.core.pos.clone().add(_v1.set((i - 1) * 8, 0, 0)), { mode: 'rel', drift: 0.2 }); }
      b.fireT -= dt;
      if (b.fireT <= 0) {
        if (rage) {
          b.fireT = 0.12; b.spiral += 0.5;
          for (const k of [0, Math.PI]) {
            const a = b.spiral + k;
            const d = _v1.copy(pl.pos).sub(b.core.pos).normalize();
            d.x += Math.cos(a) * 0.12; d.y += Math.sin(a) * 0.12;
            fireEB(b.core.pos.clone(), d, { speed: 56, color: 0xff4080, shootable: true });
          }
          if (Math.floor(b.spiral) % 24 === 23) b.fireT = 2.0;
        } else {
          b.fireT = 2.6;
          for (let i = 0; i < 8; i++) { const d = _v1.copy(pl.pos).sub(b.core.pos).normalize(); const a = i / 8 * TAU; d.x += Math.cos(a) * 0.1; d.y += Math.sin(a) * 0.1; fireEB(b.core.pos.clone(), d, { speed: 60, color: 0xff4080 }); }
        }
      }
      b.beamT -= dt;
      if (b.beamT <= 0 && G.beams.length === 0) {
        b.beamT = rage ? 7 : 11;
        const base = pl.pos.clone();
        fireBeam(() => b.core.pos, base.clone().add(new V3(0, -26, 0)), base.clone().add(new V3(0, 26, 0)), 1.2, 1.8);
      }
    }
  };
  return b;
};

// ================================================================ BOSS 3 : LEVIATHAN (stage 2B)
Bosses.leviathan = () => {
  const root = new THREE.Group(); G.world.add(root);
  const b = { name: 'RIFT LEVIATHAN', root, parts: [], size: { x: 6, y: 5, z: 6 }, trail: [], tcum: 0, open: false, cycle: 0, mouth: 0, charge: 0, chargeT: 0, fireT: 0 };
  const headMesh = () => {
    const g = new THREE.Group();
    g.add(mk(GEO.sph, tm(0x5a3f9a), { p: [0, 0, 0], s: [3.6, 2.8, 4.6], out: 0.1 }));
    g.add(mk(GEO.cone, tm(0x7a5ac0), { p: [0, 0.8, -4.3], r: [-Math.PI / 2, 0, 0], s: [2.4, 4.0, 1.4], out: 0.08 }));
    const jaw = new THREE.Group(); jaw.position.set(0, -1.2, -2.6);
    jaw.add(mk(GEO.cone, tm(0x4a3a8a), { p: [0, -0.5, -2.2], r: [-Math.PI / 2, 0, 0], s: [1.8, 3.8, 0.9], out: 0.08 }));
    for (let i = -1; i <= 1; i++) jaw.add(mk(GEO.cone, tm(0xf0f0ff), { p: [i * 0.9, 0.4, -2.0 - Math.abs(i) * 0.3], s: [0.22, 0.7, 0.22] }));
    g.add(jaw); g.userData.jaw = jaw;
    const glow = mk(GEO.sph, solidGlow(0x30ffe0, 1.8), { p: [0, 0, -1.8], s: [1.6, 1.0, 1.0], cast: false }); g.add(glow); g.userData.glow = glow;
    for (const sx of [-1, 1]) g.add(mk(GEO.sph, solidGlow(0xffe040, 2), { p: [2.1 * sx, 1.0, -2.2], s: 0.55, cast: false }));
    for (const sx of [-1, 1]) g.add(mk(GEO.box, tm(0x7a5ac0), { p: [3.4 * sx, 0.5, 0.8], r: [0, 0, 0.5 * sx], s: [2.2, 0.15, 3.2], out: 0.05 }));
    return g;
  };
  b.head = spawnPart({ pos: new V3(), hp: 72, r: 4.4, score: 3500, makeMesh: headMesh, shield: () => !b.open, touchDmg: 24 });
  b.core = b.head;
  b.segs = [];
  for (let i = 0; i < 11; i++) {
    const s = spawnPart({
      pos: new V3(), hp: 9999, r: 3.4 - i * 0.1, score: 0, lockable: false, shield: () => true, countHit: false, idx: i, touchDmg: 18,
      makeMesh: () => { const g = new THREE.Group(); const sc = 3.4 - i * 0.12; g.add(mk(GEO.sph, tm(i % 2 ? 0x5a3f9a : 0x2a8a90), { s: [sc, sc * 0.9, sc * 1.1], out: 0.09 })); g.add(mk(GEO.cone, tm(0x7a5ac0), { p: [0, sc * 0.9, 0], s: [0.5, 1.8, 0.5], out: 0.05 })); g.add(mk(GEO.cone, solidGlow(0x30ffe0, 1.5), { p: [0, -sc * 0.8, 0], r: [Math.PI, 0, 0], s: [0.3, 1.0, 0.3], cast: false })); return g; },
    });
    b.segs.push(s);
  }
  b.parts = [b.head];
  b.maxHp = 72;
  b.hpFn = () => partsHp(b.parts);
  const trailPoint = (d) => {
    // point d units back along the head's trail
    const tr = b.trail; if (!tr.length) return null;
    const target = b.tcum - d;
    for (let i = tr.length - 1; i >= 0; i--) if (tr[i].c <= target) { const a = tr[i], n = tr[Math.min(tr.length - 1, i + 1)]; const k = n.c > a.c ? (target - a.c) / (n.c - a.c) : 0; return new V3(lerp(a.x, n.x, k), lerp(a.y, n.y, k), lerp(a.z, n.z, k)); }
    return new V3(tr[0].x, tr[0].y, tr[0].z);
  };
  b.update = (dt) => {
    const t = b.t, rail = G.rail, pl = G.pl;
    const enter = easeOut(clamp(t / 4.5, 0, 1));
    const rage = b.head.hp < b.head.maxHp * 0.45;
    b.chargeT -= dt;
    if (rage && b.chargeT < -5 && Math.random() < dt * 0.3) b.chargeT = 2.2;
    b.charge = damp(b.charge, b.chargeT > 0 ? 70 : 0, 2.2, dt);
    const sp = rage ? 1.35 : 1;
    const rel = _v1.set(Math.sin(t * 0.7 * sp) * 22 + Math.sin(t * 1.9) * 5, 4 + Math.sin(t * 0.9 * sp + 1) * 10, lerp(-340, -105, enter) + Math.sin(t * 0.45) * 28 + b.charge);
    const hp = new V3(rail.pos.x + rel.x, rail.pos.y + rel.y, rail.pos.z + rel.z);
    // trail stored rail-relative so the body keeps its shape while the rail moves
    const last = b.trail[b.trail.length - 1];
    const cur = { x: rel.x, y: rel.y, z: rel.z - 0, c: 0 };
    if (!last) { cur.c = 0; b.trail.push(cur); }
    else { const dd = Math.hypot(cur.x - last.x, cur.y - last.y, cur.z - last.z); if (dd > 0.8) { cur.c = last.c + dd; b.tcum = cur.c; b.trail.push(cur); if (b.trail.length > 400) b.trail.shift(); } }
    const prev = b.head.pos.clone();
    b.head.pos.copy(hp);
    if (b.head.mesh) {
      const dir = hp.clone().sub(prev); if (dir.lengthSq() > 1e-6) { dir.normalize(); b.head.mesh.lookAt(hp.clone().sub(dir)); }
    }
    b.segs.forEach((s, i) => {
      const p = trailPoint((i + 1) * 6.6);
      if (!p) return;
      const wob = Math.sin(t * 3 - i * 0.7) * 1.4;
      s.pos.set(rail.pos.x + p.x, rail.pos.y + p.y + wob, rail.pos.z + p.z);
      if (s.mesh) { const n = trailPoint(i * 6.6 + 3); if (n) s.mesh.lookAt(_v2.set(rail.pos.x + n.x, rail.pos.y + n.y, rail.pos.z + n.z)); }
    });
    root.position.copy(hp);
    // mouth cycle
    if (enter >= 1 && !pl.dead) {
      b.cycle += dt;
      const closedT = rage ? 2.0 : 3.2, openT = rage ? 3.2 : 3.4;
      if (!b.open && b.cycle > closedT) {
        b.open = true; b.cycle = 0; b.shots = 0; Snd.play('beam', { vol: 0.5 });
        if (!b.hinted) { b.hinted = true; Radio.say('bolt', 'Its mouth is open! Shoot it while it spits!'); }
      } else if (b.open && b.cycle > openT) { b.open = false; b.cycle = 0; }
      if (b.open) {
        b.fireT -= dt;
        if (b.fireT <= 0) { b.fireT = rage ? 0.55 : 0.8; for (const k of (rage ? [-1, 0, 1] : [0])) { const d = _v2.copy(pl.pos).sub(hp).normalize(); d.x += k * 0.09; fireEB(hp.clone().addScaledVector(d, 3), d, { speed: 62, color: 0x30ffe0, big: false }); } }
      }
    }
    b.mouth = damp(b.mouth, b.open ? 0.75 : 0, 9, dt);
    if (b.head.mesh) { b.head.mesh.userData.jaw.rotation.x = b.mouth; b.head.mesh.userData.glow.scale.setScalar(b.open ? 1.4 + Math.sin(t * 20) * 0.2 : 0.5); }
  };
  b.cleanup = () => { for (const s of b.segs) if (s.alive) { FX.explosion(s.pos, 1.2, 0x30ffe0); kill(s, { silent: true }); } };
  return b;
};

// ================================================================ BOSS 4 : GLOOM DREADNOUGHT (stage 3, all-range)
Bosses.dreadnought = () => {
  const root = new THREE.Group(); root.position.set(0, 28, -170); root.rotation.y = 0.55; G.world.add(root);
  root.updateMatrixWorld(true);
  const hull = tm(0x4a4468), plate = tm(0x6a5a8a), dark = tm(0x26243c);
  root.add(mk(GEO.box, hull, { s: [48, 20, 150], out: 0.18 }));
  root.add(mk(GEO.box, plate, { p: [0, 11, -10], s: [38, 3, 110], out: 0.14 }));
  const nose = mk(GEO.box, plate, { p: [0, -1, -82], r: [0, Math.PI / 4, 0], s: [24, 18, 24], out: 0.14 }); root.add(nose);
  root.add(mk(GEO.box, dark, { p: [0, 22, 52], s: [20, 24, 26], out: 0.16 }));
  root.add(mk(GEO.box, plate, { p: [0, 36, 52], s: [26, 3, 32], out: 0.12 }));
  for (const sx of [-1, 1]) {
    root.add(mk(GEO.box, plate, { p: [32 * sx, -2, 20], s: [16, 5, 70], out: 0.14 }));
    root.add(mk(GEO.box, dark, { p: [26 * sx, -2, -4], s: [4, 10, 24], out: 0.1 }));
    const hang = mk(GEO.box, solidGlow(0xff8030, 1.0), { p: [24.2 * sx, 0, -38], s: [0.6, 8, 14], cast: false }); root.add(hang);
  }
  for (let i = -1; i <= 1; i++) root.add(mk(GEO.cyl, dark, { p: [i * 14, 0, 77], r: [Math.PI / 2, 0, 0], s: [5, 8, 5], out: 0.12 }), mk(GEO.circle, glowMat(0xff6040, 0.95, true, 2), { p: [i * 14, 0, 81.2], s: 4.2, cast: false }));
  root.add(mk(GEO.cyl, dark, { p: [0, 0, -92], r: [Math.PI / 2, 0, 0], s: [2.4, 20, 2.4], out: 0.1 }));
  root.add(mk(GEO.sph, solidGlow(0xff3050, 2), { p: [0, 0, -102], s: 3, cast: false }));
  for (let z = -60; z <= 40; z += 20) for (const sx of [-1, 1]) root.add(mk(GEO.box, solidGlow(0xffd870, 1.3), { p: [24.3 * sx, 4, z], s: [0.3, 1.2, 6], cast: false }));
  const b = { name: 'GLOOM DREADNOUGHT', root, parts: [], size: { x: 24, y: 14, z: 70 }, hangT: 6, beamT: 18, spawned: 0 };
  // collidable hull
  const q = root.quaternion;
  const hullE = spawn('pillar', root.localToWorld(new V3(0, 0, 0)), { w: 48, h: 20, d: 150, quat: q.clone(), cap: false, hex: 0x4a4468, noMesh: true });
  hullE.mesh.visible = false;
  const towerE = spawn('pillar', root.localToWorld(new V3(0, 24, 52)), { w: 22, h: 28, d: 28, quat: q.clone(), cap: false, hex: 0x4a4468 });
  towerE.mesh.visible = false;
  b.hullE = [hullE, towerE];
  const mkTurret = (lx, ly, lz, down) => spawnPart({
    pos: new V3(), hp: 18, r: 4, score: 700, local: new V3(lx, ly, lz), fireT: rnd(1, 3), down,
    makeMesh: () => { const g = new THREE.Group(); g.add(mk(GEO.sph, tm(0x7a3fb5), { s: [3.2, 2.4, 3.2], out: 0.08 }), mk(GEO.cyl, dark, { p: [0, 0, -3.4], r: [Math.PI / 2, 0, 0], s: [0.5, 4.2, 0.5], out: 0.06 }), mk(GEO.sph, solidGlow(0xff3050, 1.8), { p: [0, 1, -2], s: 0.55, cast: false })); return g; },
  });
  b.turrets = [mkTurret(-16, 13, -45), mkTurret(16, 13, -45), mkTurret(-16, 13, 12), mkTurret(16, 13, 12), mkTurret(0, -11, -30, true), mkTurret(0, -11, 30, true)];
  const mkGen = (sx) => spawnPart({ pos: new V3(), hp: 30, r: 5, score: 1000, local: new V3(14 * sx, 36, 52), makeMesh: () => podMesh(0x40e0ff) });
  b.gens = [mkGen(-1), mkGen(1)];
  const gensUp = () => b.gens.filter((g) => g.alive).length;
  b.core = spawnPart({
    pos: new V3(), hp: 95, r: 6, score: 6000, local: new V3(0, 24, 40),
    makeMesh: () => { const g = new THREE.Group(); g.add(mk(GEO.sph, solidGlow(0xff3050, 1.7), { s: 3.8, out: 0.07 })); const cage = mk(GEO.dodeca, glowMat(0xff90a0, 0.5, true, 1.3), { s: 5.6, cast: false }); g.add(cage); g.userData.cage = cage; return g; },
    shield: () => gensUp() > 0,
  });
  b.parts = [...b.turrets, ...b.gens, b.core];
  b.maxHp = 18 * 6 + 30 * 2 + 95;
  b.hpFn = () => partsHp(b.parts);
  b.avoid = (pos) => {
    const l = root.worldToLocal(pos.clone());
    const hx = 48 / 2 + 22, hy = 22 / 2 + 20, hz = 150 / 2 + 22;
    if (Math.abs(l.x) < hx && Math.abs(l.y) < hy + 24 && Math.abs(l.z) < hz) {
      const px = hx - Math.abs(l.x), py = hy + 14 - Math.abs(l.y), pz = hz - Math.abs(l.z);
      const v = new V3();
      if (px <= py && px <= pz) v.x = Math.sign(l.x || 1); else if (py <= pz) v.y = Math.sign(l.y || 1); else v.z = Math.sign(l.z || 1);
      return v.transformDirection(root.matrixWorld).multiplyScalar(1.6);
    }
    return null;
  };
  b.update = (dt) => {
    const t = b.t, pl = G.pl;
    root.updateMatrixWorld(true);
    for (const p of [...b.turrets, ...b.gens, b.core]) {
      if (!p.alive) continue;
      p.pos.copy(root.localToWorld(p.local.clone()));
      if (p.mesh) { if (b.turrets.includes(p)) aimAt(p.mesh, pl.pos); else p.mesh.quaternion.copy(root.quaternion); }
    }
    if (b.core.alive) { const c = b.core.mesh.userData.cage; c.rotation.y += dt * 2; b.core.mesh.scale.setScalar(gensUp() ? 0.6 : 1 + Math.sin(t * 8) * 0.08); }
    if (t < 3 || pl.dead) return;
    for (const tu of b.turrets) {
      if (!tu.alive) continue;
      tu.fireT -= dt;
      const d = tu.pos.distanceTo(pl.pos);
      if (tu.fireT <= 0 && d < 340) {
        tu.fireT = rnd(1.8, 3.2);
        for (let i = 0; i < 3; i++) later(i * 0.16, () => { if (tu.alive && !pl.dead) enemyShotAtPlayer(tu.pos.clone(), { speed: 92, spread: 2.5, lead: 0.9, color: 0xff6a30 }); });
      }
    }
    // hangars launch bandits
    b.hangT -= dt;
    const bandits = G.ents.filter((e) => e.kind === 'bandit' && e.alive).length;
    if (b.hangT <= 0 && bandits < 7) {
      b.hangT = gensUp() ? 8 : 5;
      for (const sx of [-1, 1]) {
        const o = root.localToWorld(new V3(26 * sx, 0, -38));
        const fw = new V3(sx, 0, -0.2).transformDirection(root.matrixWorld);
        spawn('bandit', o, { fw, speed: 62 });
      }
      Radio.once('hangar' + Math.floor(t / 20), 'bolt', 'More fighters launching from the hangars!');
    }
    if (gensUp() === 0) {
      if (!b.exposed) { b.exposed = true; Radio.say('kestrel', 'Shield generators are gone! Fob — hit the reactor core on the bridge!'); screenFlash(0xff6080, 0.2); Snd.play('warning', { vol: 0.6 }); }
      b.beamT -= dt;
      if (b.beamT <= 0 && G.beams.length === 0) {
        b.beamT = 16;
        const from = pl.pos.clone().add(new V3(-90, 0, 0)), to = pl.pos.clone().add(new V3(90, 10, 0));
        fireBeam(() => root.localToWorld(new V3(0, 0, -102)), from, to, 1.6, 2.6, 0xff3050, 2.4, 700);
        Radio.say('newt', 'Main cannon charging! Get out of its line!');
      }
    }
  };
  b.cleanup = () => { for (const h of b.hullE) removeEnt(h); };
  return b;
};
