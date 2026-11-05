// SNIPEOUT HD: effects. Every weapon's look (rockets with smoke, the seeker's spiral, blinking mines, cannon tracers,
// the railshot's beam, the tremor's glowing band, the bulwark bubble, the autopilot ring, the siphon's zigzag), sparks
// on walls, dust on landings, explosions with hull shards, the rescue drone, and the weather (snow, rain, dust, spray).
// Presentation only: it reads the race and its events, never writes to them.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const p0 = [0, 0, 0], p1 = [0, 0, 0];
const FX = SN.fx = {
  shards: [], flakes: null, beams: null, wave: null, lastScrape: {},
  /** make the pooled meshes for a world (beams, the tremor band) */
  init(world) {
    const THREE = E.THREE;
    const mat = world._own(new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const geo = world._own(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true));
    world._fxBeams = [0, 1, 2, 3, 4, 5].map(() => { const m = new THREE.Mesh(geo, world._own(mat.clone())); m.visible = false; m.frustumCulled = false; world.scene.add(m); return m; });
    const n = 12, pos = new Float32Array(n * 2 * 3), idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    world._fxWaves = [0, 1, 2].map(() => { const g = world._own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos.length), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3)); g.setIndex(idx); const m = new THREE.Mesh(g, world._own(new THREE.MeshBasicNodeMaterial({ color: '#5aff6a', transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))); m.visible = false; m.frustumCulled = false; world.scene.add(m); return m; });
    world._drones = [SN.buildDrone(world), SN.buildDrone(world)];
  },
  /** the race's events this step: particles, shake, shards */
  events(race, world, cam) {
    const G = E.current, P = G.particles, pl = race.player, shakeOK = ship => ship && ship.control === 'human';
    for (const e of race.events) {
      const s = e.ship;
      switch (e.t) {
        case 'wall': P.sparks(e.x, e.y, e.z, 6 + Math.min(14, e.impact / 60), Math.atan2(-s.V[1], -s.V[0])); if (shakeOK(s)) { G.shake(Math.min(4, e.impact / 300)); s._rumble = .25; } break;
        case 'scrape': { const k = s.idx; if ((FX.lastScrape[k] || 0) > race.clock - .06) break; FX.lastScrape[k] = race.clock; const sd = e.side || 0; V.addS(p0, s.P, s.R, sd * 24); P.sparks(p0[0], p0[1], p0[2] - 6, 2, Math.atan2(-s.V[1], -s.V[0])); break; }
        case 'land': if (e.hard) { P.dust(s.P[0], s.P[1], s.P[2] - 12, 10); P.sparks(s.P[0], s.P[1], s.P[2] - 10, 8, 0); if (shakeOK(s)) G.shake(3); } else P.dust(s.P[0], s.P[1], s.P[2] - 12, 4); break;
        case 'hit': if (!e.soft) { P.sparks(e.x, e.y, e.z, 10, 0); P.add && P.add({ kind: 'glint', x: e.x, y: e.y, z: e.z + 8, color: SN.WEAPONS[e.weapon] ? SN.WEAPONS[e.weapon].color : '#ffffff', size: 3, life: .4 }); if (shakeOK(s)) { G.shake(e.weapon === 'rail' ? 6 : 3); G.flash(e.weapon === 'rail' ? '#bff8ff' : '#ff4040', .12, .35); } } break;
        case 'elim': P.explosion(e.x, e.y, e.z, 2.2, { shake: shakeOK(s) ? 6 : 1 }); FX.burst(s); if (shakeOK(s)) G.flash('#ffffff', .25, .6); break;
        case 'boom': { const q = race.track.point(e.s, e.u, 10); P.explosion(q[0], q[1], q[2], 1.2, { shake: 0, debris: false }); break; }
        case 'pad': P.glints(s.P[0], s.P[1], s.P[2], 6, '#7af0ff'); break;
        case 'pickup': if (e.pad) P.glints(s.P[0], s.P[1], s.P[2] + 6, 8, '#ffd23f'); break;
        case 'absorb': P.glints(s.P[0], s.P[1], s.P[2] + 8, 14, '#7affb0'); break;
        case 'shotwall': { const q = race.track.point(e.s, e.u, e.h); P.sparks(q[0], q[1], q[2], 5, 0); break; }
        case 'roll': if (e.ok) P.glints(s.P[0], s.P[1], s.P[2], 10, '#ffffff'); break;
        case 'perfectstart': P.glints(s.P[0], s.P[1], s.P[2], 6, '#ffd36a'); break;
        case 'bump': P.sparks(e.x, e.y, e.z, 6, 0); if (shakeOK(s) || shakeOK(e.other)) G.shake(1.5); break;
        case 'rescued': case 'respawn': P.glints(s.P[0], s.P[1], s.P[2], 10, '#7af0ff'); break;
        case 'dodge': if (shakeOK(s)) P.glints(s.P[0], s.P[1], s.P[2], 6, '#5aff6a'); break;
      }
    }
  },
  /** hull shards flying from an explosion */
  burst(s) {
    const col = SN.TEAMS[s.team].colors, rnd = Math.random;
    for (let k = 0; k < 10; k++) FX.shards.push({ x: s.P[0], y: s.P[1], z: s.P[2], vx: s.V[0] * .4 + (rnd() - .5) * 600, vy: s.V[1] * .4 + (rnd() - .5) * 600, vz: 200 + rnd() * 400, a: rnd() * 6, w: (rnd() - .5) * 20, t: 0, c: k % 3 === 0 ? col.secondary : k % 3 === 1 ? col.primary : '#2a2c34', sz: 6 + rnd() * 10 });
  },
  /** draw this frame's effects (in onDraw, before the world renders). alpha: the step fraction for interpolation */
  draw(world, race, dt) {
    const pen = world.pen, T = race.track, t = race.clock;
    pen.at();
    // projectiles and mines
    for (const p of race.weapons.shots) {
      T.point(p.s, p.u, p.h, p0); T.point(p.s - (p.kind === 'cannon' ? 80 : 26), p.u - (p.vu || 0) * .02, p.h, p1);
      if (p.kind === 'cannon') { pen.tube(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 1.6, '#ffe23a'); world.glow(p0[0], p0[1], p0[2], 5, '#ffe23a'); }
      else { pen.tube(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 2.2, p.kind === 'seeker' ? '#ff9a2a' : '#e8e8f0'); pen.cone(p0[0], p0[1], p0[2], p0[0] + (p0[0] - p1[0]) * .3, p0[1] + (p0[1] - p1[1]) * .3, p0[2] + (p0[2] - p1[2]) * .3, 2.4, p.kind === 'seeker' ? '#ff9a2a' : '#ff4a4a');
        world.glow(p1[0], p1[1], p1[2], 6, p.kind === 'seeker' ? '#ffb347' : '#ff7a4a');
        if (Math.random() < .5) E.current.particles.smoke(p1[0], p1[1], p1[2], 1, { size: 3, color: '#b8b0a8' });
        if (p.kind === 'seeker') { const a = t * 30 + p.id; world.glow(p1[0] + Math.cos(a) * 8, p1[1] + Math.sin(a) * 8, p1[2] + Math.sin(a * 1.3) * 6, 3, '#ffd36a'); } }
    }
    for (const m of race.weapons.mines) {
      T.point(m.s, m.u, 6 + Math.sin(t * 4 + m.id) * 2, p0); const a = t * 3 + m.id;
      pen.at(p0[0], p0[1], p0[2], a); pen.ball(0, 0, 0, 7, 7, 5, '#3a2a4a'); for (let k = 0; k < 6; k++) { const b = k * Math.PI / 3; pen.cone(Math.cos(b) * 6, Math.sin(b) * 6, 0, Math.cos(b) * 11, Math.sin(b) * 11, 0, 1.8, '#ff3ad8'); } pen.at();
      if (m.armT <= 0 && Math.floor(t * 4 + m.id) % 2) world.glow(p0[0], p0[1], p0[2] + 7, 4, '#ff2020');
    }
    // beams: the railshot (a white-cyan rod fading) and the siphons (a zigzag of glows)
    const B = world._fxBeams || []; let nb = 0;
    for (const b of race.weapons.beams) {
      if (nb >= B.length) break; const m = B[nb++], k = 1 - b.t / b.dur;
      T.point(b.s + 30, b.u, 16, p0); T.point(b.s + b.len, b.u1, 16, p1);
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], L = Math.hypot(dx, dy, dz) || 1;
      m.visible = true; m.position.set((p0[0] + p1[0]) / 2 / U, (p0[2] + p1[2]) / 2 / U, (p0[1] + p1[1]) / 2 / U);
      m.quaternion.setFromUnitVectors(_up(), _v(dx / L, dz / L, dy / L)); m.scale.set(.3 * (.4 + k), L / U, .3 * (.4 + k)); m.material.color.set('#bff8ff'); m.material.opacity = k;
      for (let q = 0; q < 6; q++) { const f = q / 5; world.glow(p0[0] + dx * f, p0[1] + dy * f, p0[2] + dz * f, 10 * k, '#ffffff'); }
    }
    for (const s of race.ships) {
      if (!s.siphon || !s.siphon.target) continue; const tg = s.siphon.target;
      for (let q = 0; q <= 10; q++) { const f = q / 10, z = Math.sin(f * Math.PI * 6 + t * 30) * 10; world.glow(tg.P[0] + (s.P[0] - tg.P[0]) * f, tg.P[1] + (s.P[1] - tg.P[1]) * f, tg.P[2] + (s.P[2] - tg.P[2]) * f + z + 10, 4, q % 2 ? '#b8ff3a' : '#ffffff'); }
    }
    for (let k = nb; k < B.length; k++) B[k].visible = false;
    // the tremor's glowing band riding the surface
    const W = world._fxWaves || []; let nw = 0;
    for (const w of race.weapons.waves) {
      if (nw >= W.length) break; const m = W[nw++], a = m.geometry.attributes.position.array, fr = T.frameAt(w.s), n = 12;
      for (let i = 0; i < n; i++) { const u = (-1 + 2 * i / (n - 1)) * fr.hw; T.point(w.s, u, 2, p0); T.point(w.s - 40, u, 18 + Math.sin(i + t * 20) * 6, p1); a.set([p0[0] / U, p0[2] / U, p0[1] / U, p1[0] / U, p1[2] / U, p1[1] / U], i * 6); }
      m.geometry.attributes.position.needsUpdate = true; m.visible = true; m.material.opacity = Math.min(1, w.life * 2);
      if (Math.random() < .6) { T.point(w.s, (Math.random() - .5) * fr.hw * 2, 4, p0); E.current.particles.dust(p0[0], p0[1], p0[2], 1); }
    }
    for (let k = nw; k < W.length; k++) W[k].visible = false;
    // the craft's own effects: the autopilot ring, nitro sparks, damage smoke, the rescue drone
    let nd = 0; const D = world._drones || [];
    for (const s of race.ships) {
      if (s.hidden || s.ghost) continue;
      if (s.autoT > 0) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t * 4; world.glow(s.P[0] + Math.cos(a) * 44, s.P[1] + Math.sin(a) * 44, s.P[2] + 4, 3, '#2ae8c8'); }
      if (s.energy < 25 && !s.elim && Math.random() < .3) E.current.particles.smoke(s.P[0] - s.F[0] * 40, s.P[1] - s.F[1] * 40, s.P[2] + 6, 1, { size: 4, color: '#3a3a40' });
      if (s.energy < 12 && !s.elim && Math.random() < .2) E.current.particles.sparks(s.P[0], s.P[1], s.P[2], 2, 0);
      if (s.rescue && nd < D.length) { const d = D[nd++]; d.root.visible = true; d.root.position.set(s.P[0] / U, (s.P[2] + 100) / U, s.P[1] / U); d.root.rotation.y = t * 2; d.beam.scale.y = 100 + Math.sin(t * 9) * 10; }
      if (s.pitting && Math.random() < .5) E.current.particles.glints(s.P[0] + (Math.random() - .5) * 40, s.P[1] + (Math.random() - .5) * 40, s.P[2], 1, '#3aff8a');
    }
    for (let k = nd; k < D.length; k++) D[k].root.visible = false;
    // shards
    for (const q of FX.shards) {
      q.t += dt; q.vz -= 640 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.a += q.w * dt;
      pen.at(q.x, q.y, q.z, q.a, 1, q.a * .7, q.a * 1.3); pen.box(0, 0, 0, q.sz, q.sz * .6, 2, q.c); pen.at();
      if (Math.random() < .3) E.current.particles.smoke(q.x, q.y, q.z, 1, { size: 3 });
    }
    FX.shards = FX.shards.filter(q => q.t < 1.6);
    FX.weather(world, race, dt);
  },
  /** weather near the camera: Borealis snow, Meridian rain, Karakum dust, Solenne sea spray */
  weather(world, race, dt) {
    if (!SN.flags.weather) return;
    const th = SN.THEMES[SN.TRACKS[race.track.id].theme], kind = race.rules.skin === 'overclock' ? null : th.weather, cp = world.camera.pose; if (!kind || !cp) return;
    const F = FX.flakes || (FX.flakes = (rr => Array.from({ length: 160 }, () => ({ x: rr(), y: rr(), z: rr(), s: rr() })))(SN.rng('flakes')));
    const R = 900, t = race.clock;
    for (const f of F) {
      const x = cp.x + ((f.x * 2 - 1) * R), y = cp.y + ((f.y * 2 - 1) * R), zr = kind === 'rain' ? 700 : kind === 'snow' ? 300 : 120;
      const fall = kind === 'rain' ? 1400 : kind === 'snow' ? 120 : 30, z = cp.z + 300 - (((f.z * 1000 + t * fall) % 1000) / 1000) * (zr + 300) + (kind === 'snow' ? Math.sin(t + f.s * 9) * 20 : 0);
      if (kind === 'rain') world.pen.tube(x, y, z, x - 6, y - 4, z - 40, .5, '#8aa0d0');
      else if (kind === 'snow') world.glow(x + Math.sin(t * .7 + f.s * 6) * 30, y, z, 2.2, '#f4f8ff');
      else if (kind === 'dust' && f.s < .35) world.glow(x + t * 120 % 200, y, cp.z - 40 - f.s * 80, 3, '#e8c890');
      else if (kind === 'spray' && f.s < .15) { const g = race.track; world.glow(x, y, 8 + Math.abs(Math.sin(t * 2 + f.s * 40)) * 40, 2.5, '#e8f4ff'); }
    }
  }
};
let _tv = null, _tu = null;
function _v(x, y, z) { const THREE = E.THREE; _tv = _tv || new THREE.Vector3(); return _tv.set(x, y, z); }
function _up() { const THREE = E.THREE; _tu = _tu || new THREE.Vector3(0, 1, 0); return _tu; }
})();
