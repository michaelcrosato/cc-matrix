// 45-bossdraw: how each boss is drawn (presentation only): its meshes posed from the boss's state, its rig's place,
// weak points pulsing gold, smoke and fire on broken parts. Attached to the boss registry entries (25).
// Reads: WorldView (44), meshes (30).

const weakGlow = (R, view, p, r = 4) => { const k = .6 + .4 * Math.sin(view.t * 8); R.splat(p, r * k, [255, 200, 60], 'add', .55); };
const smokeAt = (p, k = .3) => { if (fxRand() < k) FX.add({ p: p.slice(), v: [(fxRand() - .5) * 8, (fxRand() - .5) * 8, 22], rgb: [50, 48, 50], size: 5, grow: 9, life: 1.8, mode: 'alpha', alpha: .6 }); if (fxRand() < k * .6) FX.add({ p: p.slice(), v: [0, 0, 18], rgb: [255, 140, 40], size: 3, life: .4, mode: 'add' }); };
Object.assign(MESHDEF, { legX: G => { G.box(0, -3, -3, 30, 3, 3, 'steel-paint'); }, footX: G => { G.box(0, -2.4, -2.4, 30, 2.4, 2.4, 'gunmetal'); } });
const leg = (R, a, b, id = 'legX') => { const d = vsub(b, a), L = vlen(d); R.drawMesh({ mesh: TC.mesh(id), x: a[0], y: a[1], z: a[2], yaw: Math.atan2(d[1], d[0]), pitch: -Math.atan2(d[2], Math.hypot(d[0], d[1])), s: L / 30 }); };

Object.assign(get('boss', 'stingray'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('stingray'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.roll || 0 });
    const c = sim.poseOf(0, 'stand');
    for (const k of ['turretL', 'turretR']) { const p = B.part(k); const base = [p.pos[0], p.pos[1], p.pos[2] - 10]; R.drawMesh({ mesh: TC.mesh('turret'), x: base[0], y: base[1], z: base[2], yaw: p.alive ? Math.atan2(c.y - base[1], c.x - base[0]) : B.yaw + .6, flash: p.flashT > 0 ? .7 : 0 }); if (p.alive) weakGlow(R, view, p.pos, 4); else smokeAt(p.pos, .35); }
    if (B.phase >= 3) for (const l of [[-40, 0, 12], [20, 6, 14], [50, -4, 10]]) smokeAt(TC.boatXY(B, l), .4);
    if (B.phase === 2 && !B.duck) weakGlow(R, view, B.part('barracuda').pos, 3);
  },
  rigAt: B => [B.bx, B.by, B.bz - (B.duck ? 12 : 0), 18, 40]
});
Object.assign(get('boss', 'bulldog'), {
  draw(R, B, sim, view) { R.drawMesh({ mesh: TC.mesh('truck'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, flash: B.part('tank').flashT > 0 ? .5 : 0 }); if (B.part('tank').alive) weakGlow(R, view, B.part('tank').pos, 5); else smokeAt([B.x, B.y, B.z + 30], .6); if (B.u < 1) for (let i = 0; i < 2; i++) FX.add({ p: [B.x - Math.cos(B.yaw) * 40, B.y - Math.sin(B.yaw) * 40, B.z + 4], v: [(fxRand() - .5) * 30, (fxRand() - .5) * 30, 10], rgb: [120, 110, 100], size: 6, grow: 10, life: 1, mode: 'alpha', alpha: .5 }); }
});
Object.assign(get('boss', 'gull'), {
  draw(R, B, sim, view) { if (B.laser > 0 && !B.defeated) { const t = sim.threats.find(x => x.src === 'boss' && !x.done); if (t) { const tp = sim.cameraFor(t.target), k = 1 - t.left / t.dur, from = [B.x, B.y, B.z + 22]; R.line(from, [lerp(tp.x + 40, tp.x, k), lerp(tp.y - 30, tp.y, k), lerp(tp.z - 14, tp.z - 1, k)], [255, 40, 40], 'add', 1); } } },
  rigAt: B => [B.x, B.y, B.z, 14, 36]
});
Object.assign(get('boss', 'hammerhead'), {
  draw(R, B, sim, view) {
    if (B.shield) { const down = B.shieldDown > 0, f = B.yaw, d = 18; R.drawMesh({ mesh: TC.mesh('hatch'), x: B.x + Math.cos(f) * d - (down ? Math.sin(f) * 14 : 0), y: B.y + Math.sin(f) * d + (down ? Math.cos(f) * 14 : 0), z: B.z, yaw: f + (down ? 1.1 : 0) }); }
    if (B.mode === 'spin' || B.mode === 'sweepFire') { const m = [B.x + Math.cos(B.yaw) * 30, B.y + Math.sin(B.yaw) * 30, B.z + 34]; R.splat(m, 3 + Math.sin(view.t * 40) * 1.5, [255, 90, 40], 'add'); if (B.mode === 'sweepFire') { FX.light(m, 140, 1, '#ffb060', .05); if (fxRand() < .7) FX.tracer(m, [m[0] + Math.cos(B.yaw) * 400 + (fxRand() - .5) * 200, m[1] + Math.sin(B.yaw) * 400 + (fxRand() - .5) * 200, m[2] - 20 + fxRand() * 30], [255, 220, 140], .05); } }
  },
  rigAt: B => [B.x, B.y, B.z, 30, 64]
});
Object.assign(get('boss', 'seawolf'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('seawolf'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.bank || 0, flash: B.parts.some(p => p.flashT > 0) ? .4 : 0 });
    R.drawMesh({ mesh: TC.mesh('rotor'), x: B.x, y: B.y, z: B.z + 19, yaw: view.t * 24 });
    for (const k of ['podL', 'podR']) { const p = B.part(k); if (p.alive) weakGlow(R, view, p.pos, 4); else smokeAt(p.pos, .3); }
    if (!B.part('hub').hidden) weakGlow(R, view, B.part('hub').pos, 5);
    if (B.crash > 0) smokeAt([B.x, B.y, B.z + 6], .8);
    if (sim.water > -1e8 && B.z - sim.water < 160 && fxRand() < .5) FX.add({ p: [B.x + (fxRand() - .5) * 120, B.y + (fxRand() - .5) * 120, sim.water + 1], v: [0, 0, 10], rgb: [220, 235, 255], size: 4, grow: 6, life: .8, mode: 'alpha', alpha: .5 });
  }
});
Object.assign(get('boss', 'scylla'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('scyllaBody'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.roll || 0, flash: B.parts.some(p => p.flashT > 0) ? .35 : 0 });
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3, a = (k - 1) * .7, knee = B.part('knee' + i);
      const hip = TC.boatXY(B, [Math.cos(a) * 14, side * 18, 8 - B.topple * 6]), foot = TC.boatXY(B, [Math.cos(a) * 44, side * (52 + Math.abs(Math.sin(a)) * 10), -B.z + B.home[2] + (B.toppled ? 4 : 0)]);
      foot[2] = B.home[2]; const kp = knee.pos;
      leg(R, hip, kp); leg(R, kp, foot, 'footX');
      if (knee.alive) weakGlow(R, view, kp, 3.6); else smokeAt(kp, .15);
    }
    if (!B.part('cockpit').hidden) weakGlow(R, view, B.part('cockpit').pos, 7);
    if (B.charge) { const at = TC.boatXY(B, [54, -18, 10]); R.splat(at, 3 + Math.sin(view.t * 30) * 2, [120, 220, 255], 'add'); }
  }
});
Object.assign(get('boss', 'krake'), {
  draw(R, B, sim, view) { R.drawMesh({ mesh: TC.mesh('krakeLever'), x: B.leverAt[0], y: B.leverAt[1], z: B.leverAt[2] - 30, yaw: 0, pitch: B.final > 0 ? -.2 : 0 }); if (B.final > 0) weakGlow(R, view, B.leverAt, 6); },
  rigAt: B => [B.x, B.y, B.z - (B.duck ? 9 : 0), 18, 42]
});
