// 44-view: the presentation of the world. One Rail3D per viewport; the stage's baked batches; dynamic meshes
// (carriers, bosses, vehicles, turbines, water); engine Humanoid rigs driven from the Sim's plain state and drawn as
// billboards; particles, tracers, explosions, fireworks, rain and lightning driven by the Sim's events; the camera's
// presentation offsets (shake, recoil, hit jolt, carrier sway) that never move the aim ray. Reads the Sim only.

const FX = {
  list: [], lights: [], trauma: [0, 0, 0, 0], jolt: [0, 0, 0, 0], recoil: [0, 0, 0, 0], tracers: [], flashes: [], decals: [], lightning: 0, smoke: 0,
  clear() { this.list.length = 0; this.tracers.length = 0; this.lights.length = 0; this.decals.length = 0; this.flashes.length = 0; },
  add(p) { if (this.list.length > 900) this.list.shift(); this.list.push(Object.assign({ v: [0, 0, 0], g: 0, life: .5, t: 0, size: 2, rgb: [255, 220, 150], mode: 'add', drag: 0 }, p)); },
  burst(at, n, o) { const R = fxRand; for (let i = 0; i < n; i++) { const a = R() * 6.283, b = (R() - .3) * 3, s = (o.speed || 60) * (.4 + R() * .8); this.add(Object.assign({}, o, { p: at.slice(), v: [Math.cos(a) * Math.cos(b) * s, Math.sin(a) * Math.cos(b) * s, Math.sin(b) * s + (o.up || 0)], life: (o.life || .5) * (.6 + R() * .7), size: (o.size || 2) * (.6 + R() * .8) })); } },
  light(at, r, k, color, life = .12) { this.lights.push({ p: at.slice(), r, k, color, life, t: 0 }); },
  tracer(a, b, rgb = [255, 230, 160], life = .06) { this.tracers.push({ a: a.slice(), b: b.slice(), rgb, life, t: 0 }); },
  step(dt) {
    for (const p of this.list) { p.t += dt; p.v[2] -= p.g * dt; if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.v[0] *= k; p.v[1] *= k; p.v[2] *= k; } p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt; if (p.grow) p.size += p.grow * dt; }
    this.list = this.list.filter(p => p.t < p.life);
    for (const l of this.lights) l.t += dt; this.lights = this.lights.filter(l => l.t < l.life);
    for (const t of this.tracers) t.t += dt; this.tracers = this.tracers.filter(t => t.t < t.life);
    for (let i = 0; i < 4; i++) { this.trauma[i] = Math.max(0, this.trauma[i] - 1.6 * dt); this.jolt[i] = Math.max(0, this.jolt[i] - 3 * dt); this.recoil[i] = Math.max(0, this.recoil[i] - 6 * dt); }
    this.lightning = Math.max(0, this.lightning - dt * 3); this.smoke = Math.max(0, this.smoke - dt);
  },
  explosion(at, size = 1) {
    const R = fxRand;
    this.burst(at, 18 * size, { rgb: [255, 170, 60], size: 7 * size, speed: 70 * size, life: .45, mode: 'add', drag: 3, grow: 6 });
    this.burst(at, 10 * size, { rgb: [255, 240, 180], size: 4 * size, speed: 30 * size, life: .25, mode: 'add' });
    for (let i = 0; i < 10 * size; i++) this.add({ p: [at[0] + (R() - .5) * 12 * size, at[1] + (R() - .5) * 12 * size, at[2] + R() * 8], v: [(R() - .5) * 20, (R() - .5) * 20, 18 + R() * 20], rgb: [40 + R() * 20 | 0, 38, 40], size: 8 * size, grow: 10, life: 1.6, mode: 'alpha', alpha: .7 });
    this.burst(at, 12 * size, { rgb: [60, 50, 40], size: 1.6, speed: 120 * size, life: 1.2, mode: 'solid', g: 260, up: 60 });
    this.light(at, 220 * size, 1.4, '#ffb060', .35);
  }
};
TC.FX = FX;

// ---------------------------------------------------------------- looks of the people who are not enemies
const CIV_LOOKS = {
  festival: [{ build: 'heroic', weapon: null, outfit: 'shirt', hair: 'long', colors: { cloth: '#e85a8a', pants: '#2a2a44', hair: '#3a2010', skin: '#e0b090' } }, { build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#4a8ad8', cloth: '#f0f0f0', pants: '#3a3a3a', hair: '#1a1a1a', skin: '#a07050' } }],
  worker: [{ build: 'bulky', weapon: null, outfit: 'shirt', hat: 'cap', colors: { cloth: '#c89a3a', hat: '#f2c12e', pants: '#3a4a6a', skin: '#c08a68' } }],
  fisher: [{ build: 'heroic', weapon: null, outfit: 'coat', hat: 'cap', colors: { coat: '#f2d02e', hat: '#f2d02e', pants: '#2a3a4a', skin: '#b07850' } }],
  hostage: [{ build: 'heroic', size: .98, weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#f0f0f0', cloth: '#7aa0c8', hair: '#a8a8a8', skin: '#c89a74', pants: '#4a4a52' } }]
};
TC.CIV_LOOKS = CIV_LOOKS;

class WorldView {
  constructor(game) { this.game = game; this.R = []; this.rigs = new Map(); this.batches = null; this.stageId = null; this.t = 0; this.seen = new Set(); this.water = null; }
  rail(i) { return this.R[i] || (this.R[i] = new Rail3D()); }
  // bake the stage's geometry once (presentation only)
  setStage(sim) { if (this.stageId === sim.stageId && this.batches && this.simRef === sim) return; this.simRef = sim; this.stageId = sim.stageId; this.batches = sim.builder.bake(); this.rigs.clear(); FX.clear(); this.lights = sim.builder.lights; }
  rigFor(key, look) {
    let r = this.rigs.get(key);
    if (!r) { r = { rig: new E.Humanoid(Object.assign({ size: 1 }, look)), seen: 0 }; this.rigs.set(key, r); }
    r.seen = this.t; return r.rig;
  }
  // update rigs from the Sim (call once per frame with the frame's dt)
  updateRigs(sim, dt) {
    this.t += dt;
    for (const e of sim.enemies) {
      if (!e.look || e.A.ai === 'drone') continue;
      const rig = this.rigFor('e' + e.id, Object.assign({}, e.look, { size: (e.look.size || 1) * e.size }));
      const tp = sim.cameraFor(e.target), d = Math.hypot(tp.x - e.x, tp.y - e.y), aimP = Math.atan2(tp.z - (e.z + 22), d);
      const st = { x: e.x, y: e.y, z: e.z - e.sinkNow + (e.ski ? 4 : 0), vx: e.vel[0] * (e.run || e.state === 'enter' ? 1 : 0) + (e.run ? Math.cos(e.facing) * 90 * e.run : 0), vy: e.vel[1] * (e.run ? 1 : 0) + (e.run ? Math.sin(e.facing) * 90 * e.run : 0), facing: e.facing, point: e.point && !e.dead, aim: e.point ? aimP : 0, hurt: e.hurtT > 0, air: e.air, climb: e.climb, vz: e.climb ? -40 : 0, flip: e.flip || 0 };
      if (e.dead) { st.pose = 'die'; st.vx = 0; st.vy = 0; if (e.death === 'flyback') st.flip = clamp(e.deadT * 1.6, 0, 1) * (e.deadT < .6 ? 1 : 0); }
      else if (e.state === 'hide' && !(e.cover && e.cover.h >= 30) && e.A.ai !== 'shield') st.pose = 'crouch';
      else if (e.ski) st.pose = 'kneel';
      if (e.A.ai === 'runner' && !e.dead) st.pose = null;
      if (e.A.ai === 'rusher' && e.atk) st.attack = E.move('slash', e.atk === 'wind' ? .15 : .6, e.atk === 'wind' ? 'wind' : 'active');
      if (e.A.ai === 'grenadier' && e.lob && e.state === 'fire') st.attack = E.move('throw', .5);
      if (e.side && (e.cover && e.cover.h >= 30)) { const f = e.facing, sd = e.side * 14; st.x += -Math.sin(f) * sd; st.y += Math.cos(f) * sd; }
      rig.update(dt, st);
    }
    for (const c of sim.civilians) {
      const rig = this.rigFor('c' + c.id, CIV_LOOKS[c.kind] ? CIV_LOOKS[c.kind][c.look % CIV_LOOKS[c.kind].length] : CIV_LOOKS.festival[0]);
      rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.state === 'run' ? Math.cos(c.face) * 80 : 0, vy: c.state === 'run' ? Math.sin(c.face) * 80 : 0, facing: c.face, pose: c.dead ? 'die' : c.hostage ? (c.freed ? 'wave' : null) : c.state === 'crouch' ? 'crouch' : null, expr: c.hostage ? 'wince' : 'shout' });
    }
    for (const a of sim.allies) {
      const rig = this.rigFor('a' + a.id, get('speaker', a.agent).rig);
      const f = a.aimAt ? Math.atan2(a.aimAt[1] - a.at[1], a.aimAt[0] - a.at[0]) : a.facing;
      rig.update(dt, { x: a.at[0], y: a.at[1], z: a.at[2], facing: f, point: true, aim: 0 });
    }
    if (sim.cut) for (const a of sim.cut.actors) { const rig = this.rigFor('cut' + a.id, get('speaker', a.id).rig); rig.update(dt, { x: a.at[0], y: a.at[1], z: a.at[2], facing: a.facing || 0, pose: a.pose || null, expr: sim.cut.line && sim.cut.line.speaker === a.id ? 'shout' : null }); }
    if (sim.players.length > 1) for (const p of sim.players) { if (p.left) continue; const cam = sim.cameraFor(p.i), rig = this.rigFor('p' + p.i, get('speaker', p.agent).rig); rig.update(dt, { x: cam.x - Math.cos(cam.yaw) * 6, y: cam.y - Math.sin(cam.yaw) * 6, z: cam.z - (p.c > .5 ? 12 : 24) - 1, facing: cam.yaw, point: p.c < .5, aim: cam.pitch, pose: p.c > .5 ? 'crouch' : p.out ? 'kneel' : null }); }
    const B = sim.boss;
    if (B) this.updateBossRigs(sim, B, dt);
    for (const [k, r] of this.rigs) if (this.t - r.seen > 1) this.rigs.delete(k);
  }
  updateBossRigs(sim, B, dt) {
    const sp = id => get('speaker', id).rig;
    if (B.id === 'stingray') { const rig = this.rigFor('boss', sp('barracuda')); rig.update(dt, { x: B.bx, y: B.by, z: B.bz - (B.duck ? 12 : 0), facing: B.yaw + Math.PI / 2, point: !B.duck && B.phase === 2, air: B.phase === 3 && B.swing < 1, pose: B.defeated ? 'die' : B.duck ? 'crouch' : null, attack: B.atk ? E.move('slash', B.atk === 'wind' ? .2 : .6, B.atk === 'wind' ? 'wind' : 'active') : null, hurt: B.part('barracuda').flashT > 0 }); }
    if (B.id === 'gull') { const rig = this.rigFor('boss', sp('gull')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: B.up > .5, pose: B.defeated ? 'die' : B.up > .5 ? 'kneel' : 'crouch' }); }
    if (B.id === 'hammerhead') { const rig = this.rigFor('boss', sp('hammer')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: B.mode === 'spin' || B.mode === 'sweepFire', aim: -.1, vx: B.mode === 'charge' ? Math.cos(B.yaw) * 95 : B.mode === 'walk' ? Math.cos(B.yaw + 1.57) * 20 : 0, vy: B.mode === 'charge' ? Math.sin(B.yaw) * 95 : 0, sprint: B.mode === 'charge', pose: B.defeated ? 'die' : B.mode === 'stagger' ? 'kneel' : null, attack: B.mode === 'toss' ? E.move('throw', .5) : null, hurt: B.part('body').flashT > 0, expr: 'angry' }); }
    if (B.id === 'krake') { const rig = this.rigFor('boss', sp('krake')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: !B.duck, flip: B.flip || 0, pose: B.defeated ? 'die' : B.duck ? 'crouch' : B.final > 0 ? null : null, vx: B.final > 0 ? 30 : 0, hurt: B.part('krake').flashT > 0, expr: 'angry' }); }
  }
  // the light an actor stands in: ambient + sun + the stage's static lights + this frame's dynamic lights, 0.45..1.25
  lightAt(sim, p) {
    const env = sim.stage.env, amb = env.ambient === undefined ? .4 : env.ambient; let k = amb + (env.sun ? env.sun.k * .6 : .3), r = 0, g = 0, b = 0, best = 0, bc = null;
    for (const l of this.lights) { const d = vdist(l.p, p); if (d < l.r) { const f = (1 - d / l.r); const w = f * f * l.k; k += w; if (w > best) { best = w; bc = l.c; } } }
    for (const l of FX.lights) { const d = vdist(l.p, p); if (d < l.r) { const f = (1 - d / l.r); k += f * f * l.k; } }
    k = clamp(k + FX.lightning * .6, .45, 1.25);
    const tint = bc ? [lerp(1, bc[0] / 255 * 1.2, .25), lerp(1, bc[1] / 255 * 1.2, .25), lerp(1, bc[2] / 255 * 1.2, .25)] : env.ambientColor ? hexRGB(env.ambientColor).map(v => lerp(1, v / 200, .3)) : [1, 1, 1];
    return [k * tint[0], k * tint[1], k * tint[2]];
  }
  // the camera a viewport draws with: the logical pose plus presentation offsets (shake, recoil, jolt, sway)
  presentCam(sim, i) {
    const c = Object.assign({}, sim.cameraFor(i)), set = this.game.settings || {}, reduce = !!this.game.reduceMotion, sk = reduce ? 0 : (set.shake === undefined ? 1 : set.shake);
    const tr = FX.trauma[i] || 0, t = this.t;
    if (sk && tr) { const a = tr * tr * 2.5 * DEG * sk; c.yaw += (TC.vnoise(t * 18, 1, 3) - .5) * 2 * a; c.pitch += (TC.vnoise(t * 18, 2, 4) - .5) * 2 * a; c.roll = (c.roll || 0) + (TC.vnoise(t * 18, 3, 5) - .5) * a; }
    c.pitch += (FX.recoil[i] || 0) * 1.4 * DEG;
    if (FX.jolt[i]) { c.roll = (c.roll || 0) + FX.jolt[i] * 4 * DEG; c.pitch -= FX.jolt[i] * 2 * DEG; }
    if (sim.carrier && !reduce) { c.roll = (c.roll || 0) + Math.sin(t * 1.3) * 1.2 * DEG; c.pitch += Math.sin(t * .9) * .6 * DEG; }
    if (!reduce && sim.phase === 'action') { c.pitch += Math.sin(t * 1.1) * .15 * DEG; }
    return c;
  }
  // ------------------------------------------------------------ draw one viewport
  draw(g, sim, i, vp, o = {}) {
    this.setStage(sim);
    const R = this.rail(i), env = sim.stage.env, cam = o.cam || this.presentCam(sim, i);
    R.wobble = !!(this.game.settings && this.game.settings.wobble);
    const flash = env.lightning ? FX.lightning * .35 : 0;
    R.begin(cam, vp.w, vp.h, Object.assign({}, env, { flashNow: flash }), this.t);
    for (const l of FX.lights) R.addLight(l.p[0], l.p[1], l.p[2], l.r, l.k * (1 - l.t / l.life), l.color);
    for (const b of this.batches) R.drawBatch(b);
    if (env.water) this.drawWater(R, sim, cam, env.water.mat);
    this.drawDynamic(R, sim);
    R.sky(Object.assign({}, env.sky, { flash: FX.lightning * .5 }));
    this.drawActors(R, sim, i);
    this.drawFx(R, sim);
    if (sim.flags.smoke && sim.flags.smoke > sim.t) R.haze(.55, [150, 150, 160]);
    if (sim.players[i] && sim.players[i].c > .3 && sim.phase === 'action') R.vignette(sim.players[i].c * 2.2);
    R.present(g, vp.x, vp.y);
    return R;
  }
  drawWater(R, sim, cam, matId) {
    if (!this.water) this.water = { mesh: TC.makeMesh(G => { for (let x = -8; x < 8; x++) for (let y = -8; y < 8; y++) G.quad([x * 256, y * 256, 0], [(x + 1) * 256, y * 256, 0], [(x + 1) * 256, (y + 1) * 256, 0], [x * 256, (y + 1) * 256, 0], 'sea-night', { tess: false }); }), mats: {} };
    const m = this.water.mesh, M = mat(matId); for (const gq of m.groups) gq.mat = M;
    const sx = Math.round(cam.x / 256) * 256, sy = Math.round(cam.y / 256) * 256;
    R.drawMesh({ mesh: m, x: sx, y: sy, z: sim.water, yaw: 0 });
  }
  drawDynamic(R, sim) {
    const C = sim.carrier;
    if (C && C.mesh) R.drawMesh({ mesh: TC.mesh(C.mesh), x: C.pos[0], y: C.pos[1], z: C.pos[2] + (C.pitch ? 0 : Math.sin(this.t * 1.7) * 1), yaw: C.yaw, pitch: -(C.pitch || 0), roll: C.pitch ? 0 : Math.sin(this.t * 1.3) * .02 });
    const sc = sim.scene;
    if (sc && sc.dyn) sc.dyn(R, sim, this);
    if (sim.stage.dyn) sim.stage.dyn(R, sim, this);
    // objects
    for (const ob of sim.objects) {
      if (ob.dead && ob.kind !== 'crate') continue;
      const p = ob.pos, k = ob.kind, fl = sim.t - (ob.hitAt || -9) < .06 ? .5 : 0;
      if (k === 'barrel') R.drawMesh({ mesh: TC.mesh('objBarrel'), x: p[0], y: p[1], z: p[2] - 10, yaw: 0, flash: fl });
      else if (k === 'tank') R.drawMesh({ mesh: TC.mesh('objTank'), x: p[0], y: p[1], z: p[2] - 14, yaw: 0 });
      else if (k === 'crate' && !ob.dead) R.drawMesh({ mesh: TC.mesh('objCrate'), x: p[0], y: p[1], z: p[2], yaw: 0, s: ob.size ? ob.size[2] / 14 : 1 });
      else if (k === 'lantern') { R.drawMesh({ mesh: TC.mesh('objLantern'), x: p[0], y: p[1], z: p[2] - 4, yaw: this.t }); }
      else if (k === 'bottles') R.drawMesh({ mesh: TC.mesh('objBottles'), x: p[0], y: p[1], z: p[2] - 3, yaw: 0 });
      else if (k === 'intel') { R.drawMesh({ mesh: TC.mesh('objIntel'), x: p[0], y: p[1], z: p[2] - 3, yaw: this.t * .5 }); if ((this.t * 2 | 0) % 2) R.splat(p, 1.6, [120, 255, 160], 'add', .8); }
      else if (k === 'lifering') R.drawMesh({ mesh: TC.mesh('objRing'), x: p[0], y: p[1], z: p[2] - 6, yaw: ob.yaw || 0, pitch: 0 });
      else if (k === 'lock') { R.drawMesh({ mesh: TC.mesh('objLock'), x: p[0], y: p[1], z: p[2] - 6, yaw: ob.yaw || 0 }); R.splat(p, 3 + Math.sin(this.t * 6), [255, 200, 60], 'add', .7); }
      else if (k === 'fwcrate') R.drawMesh({ mesh: TC.mesh('bargeCrate'), x: p[0], y: p[1], z: p[2] - 7, yaw: 0 });
    }
    // projectiles
    for (const pr of sim.projectiles) {
      const p = pr.pos;
      if (pr.kind === 'grenade') { R.splat(p, 2.6, [40, 46, 40], 'solid'); if ((this.t * 10 | 0) % 2) R.splat([p[0], p[1], p[2] + 2], 1, [255, 60, 40], 'add'); }
      else if (pr.kind === 'pgl') { R.splat(p, 2, [60, 70, 60], 'solid'); }
      else if (pr.kind === 'rocket' || pr.kind === 'missile') { const d = vnorm(pr.vel); R.line(p, vsub(p, vmul(d, 10)), [200, 200, 200], 'solid'); R.splat(vsub(p, vmul(d, 11)), 2.5, [255, 180, 80], 'add'); if (fxRand() < .6) FX.add({ p: vsub(p, vmul(d, 12)), v: [0, 0, 6], rgb: [150, 150, 150], size: 3, grow: 6, life: .8, mode: 'alpha', alpha: .5 }); }
      else if (pr.kind === 'harpoon') { const d = vnorm(pr.vel); R.line(p, vsub(p, vmul(d, 16)), [200, 210, 220], 'solid'); R.line(vsub(p, vmul(d, 16)), [sim.boss ? sim.boss.bx : p[0], sim.boss ? sim.boss.by : p[1], sim.boss ? sim.boss.bz + 22 : p[2]], [120, 100, 70], 'solid'); }
      else if (pr.kind === 'torpedo') { R.drawMesh({ mesh: TC.mesh('torpedo'), x: p[0], y: p[1], z: p[2] - 1, yaw: Math.atan2(pr.vel[1], pr.vel[0]) }); if (fxRand() < .8) FX.add({ p: [p[0], p[1], sim.water + .5], v: [0, 0, 4], rgb: [220, 240, 255], size: 3, grow: 4, life: 1.2, mode: 'alpha', alpha: .6 }); }
      else if (pr.kind === 'flare') { R.splat(p, 4, [255, 120, 60], 'add'); R.splat(p, 2, [255, 255, 200], 'add'); FX.light(p, 90, .6, '#ff8040', .05); }
    }
    // the boss
    const B = sim.boss; if (B && B.D.draw) B.D.draw(R, B, sim, this);
  }
  drawActors(R, sim, i) {
    const A = [], self = sim.players[i];
    for (const e of sim.enemies) {
      if (e.A.ai === 'drone') { if (!e.dead || e.deadT < 1.5) R.drawMesh({ mesh: TC.mesh('drone'), x: e.x, y: e.y, z: e.z, yaw: this.t * 2, roll: e.dead ? e.deadT * 3 : Math.sin(this.t * 3 + e.id) * .1, flash: e.flashT > 0 ? .8 : 0 }); continue; }
      if (e.A.ai === 'turret') { R.drawMesh({ mesh: TC.mesh('turretBot'), x: e.x, y: e.y, z: e.z, yaw: e.facing }); R.splat([e.x, e.y, e.z + 18], 2.4 + (e.state === 'aim' ? Math.sin(this.t * 20) * 1.5 : 0), [255, 60, 40], 'add'); continue; }
      if (e.A.board) { R.drawMesh({ mesh: TC.mesh(e.o.civ ? 'cutoutCiv' : 'cutout'), x: e.x, y: e.y, z: e.z, yaw: e.facing, pitch: (1 - e.up) * -1.45, flash: e.flashT > 0 ? .7 : 0 }); continue; }
      if (e.ski) R.drawMesh({ mesh: TC.mesh('jetski'), x: e.x, y: e.y, z: e.z - 1, yaw: e.ski.yaw, roll: Math.sin(this.t * 5 + e.id) * .08, flash: e.flashT > 0 ? .5 : 0 });
      const r = this.rigs.get('e' + e.id); if (!r) continue;
      const fade = e.dead && e.deadT > 2.6 ? 1 - (e.deadT - 2.6) / .6 : 1;
      const cz = e.cover ? (e.cover.ledge ? e.cover.at[2] : e.cover.at[2]) : e.z;
      A.push({ x: e.x, y: e.y, z: e.z - e.sinkNow, chest: 16, h: 34 * e.size, rig: r.rig, flash: e.flashT > 0 ? .75 : 0, alpha: fade, clipZ: e.sinkNow > .5 ? cz - .5 : undefined, light: this.lightAt(sim, [e.x, e.y, e.z + 18]) });
      if (e.A.ai === 'shield' && !e.dead) R.drawMesh({ mesh: TC.mesh('riotShield'), x: e.x + Math.cos(e.facing) * 9, y: e.y + Math.sin(e.facing) * 9, z: e.z, yaw: e.facing, roll: e.shieldDown > 0 ? .9 : 0 });
      if (e.laser > 0 && !e.dead) { const tp = sim.cameraFor(e.target), m = TC.muzzle(e), k = 1 - e.laser / 1.6, to = [lerp(tp.x + 30, tp.x, k), lerp(tp.y + 20, tp.y, k), lerp(tp.z - 10, tp.z - 2, k)]; R.line(m, to, [255, 40, 40], 'add', .9); }
      if (e.glint > 0 && e.state === 'aim') R.splat(TC.muzzle(e), 2 + Math.sin(this.t * 30), [255, 255, 200], 'add');
    }
    for (const c of sim.civilians) { const r = this.rigs.get('c' + c.id); if (r) A.push({ x: c.x, y: c.y, z: c.z, chest: 16, h: 34, rig: r.rig, light: this.lightAt(sim, [c.x, c.y, c.z + 18]), alpha: c.dead && c.deadT > 2.4 ? .5 : 1 }); }
    for (const a of sim.allies) { const r = this.rigs.get('a' + a.id); if (r) A.push({ x: a.at[0], y: a.at[1], z: a.at[2], chest: 16, h: 36, rig: r.rig, light: this.lightAt(sim, a.at) }); }
    if (sim.cut) for (const a of sim.cut.actors) { const r = this.rigs.get('cut' + a.id); if (r) A.push({ x: a.at[0], y: a.at[1], z: a.at[2], chest: 16, h: 40, rig: r.rig, light: this.lightAt(sim, a.at) }); }
    if (sim.players.length > 1) for (const p of sim.players) { if (p.i === i || p.left) continue; const r = this.rigs.get('p' + p.i); if (r) { const cam = sim.cameraFor(p.i); A.push({ x: cam.x - Math.cos(cam.yaw) * 6, y: cam.y - Math.sin(cam.yaw) * 6, z: cam.z - (p.c > .5 ? 12 : 24) - 1, chest: 14, h: 38, rig: r.rig, light: this.lightAt(sim, [cam.x, cam.y, cam.z]) }); } }
    const B = sim.boss;
    if (B && this.rigs.get('boss') && B.D.rigAt) { const at = B.D.rigAt(B), r = this.rigs.get('boss'); const pt = B.parts.find(p => p.human); A.push({ x: at[0], y: at[1], z: at[2], chest: at[3] || 20, h: at[4] || 50, rig: r.rig, flash: pt && pt.flashT > 0 ? .75 : 0, light: this.lightAt(sim, at) }); }
    const cs = R.cs; A.sort((a, b) => vdist([b.x, b.y, b.z], cs.pos) - vdist([a.x, a.y, a.z], cs.pos));
    for (const a of A) { this.shadow(R, a); R.billboard({ x: a.x, y: a.y, z: a.z, chest: a.chest, h: a.h, light: a.light, flash: a.flash, alpha: a.alpha, clipZ: a.clipZ, draw: (g, ox, oy, view) => a.rig.draw(g, ox, oy, view) }); }
  }
  shadow(R, a) { const p = R.project([a.x, a.y, a.z + .3]); if (!p) return; const k = R.F / p[2], rx = 7 * k, ry = 2.6 * k, W = R.W, H = R.H, col = R.col, dep = R.depth; for (let y = Math.max(0, p[1] - ry | 0); y <= Math.min(H - 1, p[1] + ry | 0); y++) for (let x = Math.max(0, p[0] - rx | 0); x <= Math.min(W - 1, p[0] + rx | 0); x++) { const dx = (x - p[0]) / rx, dy = (y - p[1]) / ry; if (dx * dx + dy * dy > 1 || ((x + y) & 1)) continue; const idx = y * W + x; if (dep[idx] < p[2] - 8) continue; const c = col[idx]; col[idx] = 0xff000000 | ((((c >> 16) & 255) * .55) << 16) | ((((c >> 8) & 255) * .55) << 8) | ((c & 255) * .55); } }
  drawFx(R, sim) {
    for (const p of FX.list) { const k = 1 - p.t / p.life; if (p.mode === 'rain') { R.line(p.p, [p.p[0] - p.v[0] * .03, p.p[1] - p.v[1] * .03, p.p[2] - p.v[2] * .03], p.rgb, 'add', .35); continue; } if (p.mode === 'alpha') R.splat(p.p, p.size, p.rgb, 'alpha', (p.alpha || .6) * k); else if (p.mode === 'solid') R.splat(p.p, p.size, p.rgb, 'solid'); else R.splat(p.p, p.size * (.4 + k * .6), p.rgb, 'add', k); }
    for (const t of FX.tracers) R.line(t.a, t.b, t.rgb, 'add', 1 - t.t / t.life);
  }
}
TC.WorldView = WorldView;

// small dynamic meshes for objects and props
Object.assign(MESHDEF, {
  objBarrel: G => { G.cyl(0, 0, 0, 20, 7, 7, 10, 'barrel-red'); },
  objTank: G => { G.cyl(0, 0, 0, 28, 9, 9, 10, 'tank-white'); G.box(-2, -2, 28, 2, 2, 32, 'iron'); },
  objCrate: G => { G.box(-8, -8, 0, 8, 8, 14, 'crate', { fit: true }); },
  objLantern: G => { G.lathe(0, 0, 0, [[0, 0], [2.5, 1], [3.5, 3], [3.5, 6], [2.5, 8], [0, 9]], 6, 'lantern'); },
  objBottles: G => { for (let i = 0; i < 4; i++) G.box(-5 + i * 3, -1, 0, -3.5 + i * 3, 1, 6 + (i % 2) * 2, i % 2 ? 'bottle' : 'glass'); },
  objIntel: G => { G.box(-1.5, -1.5, 0, 1.5, 1.5, 6, 'bottle'); G.box(-.7, -.7, 6, .7, .7, 8.5, 'bottle'); G.box(-.8, -.8, 8.5, .8, .8, 9.5, 'plank'); },
  objRing: G => { for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2, r = 6; G.quad([Math.cos(a0) * r, -1.5, 6 + Math.sin(a0) * r], [Math.cos(a1) * r, -1.5, 6 + Math.sin(a1) * r], [Math.cos(a1) * (r - 2.5), -1.5, 6 + Math.sin(a1) * (r - 2.5)], [Math.cos(a0) * (r - 2.5), -1.5, 6 + Math.sin(a0) * (r - 2.5)], 'lifering', { double: true, tess: false }); } },
  objLock: G => { G.box(-6, -4, 0, 6, 4, 12, 'gunmetal'); G.box(-4, -4.5, 3, 4, 4.5, 9, 'weak'); },
  torpedo: G => { G.pipe(-10, 10, 0, 0, 2.2, 6, 'gunmetal'); },
  riotShield: G => { G.box(-1, -7, 2, 1, 7, 28, 'gunmetal', { double: true }); G.box(-1.2, -4, 18, 1.2, 4, 22, 'glass'); },
  hatch: G => { G.box(-1.5, -12, 0, 1.5, 12, 34, 'rusted', { double: true }); G.box(-1.8, -4, 22, 1.8, 4, 28, 'glass'); },
  cutout: G => { G.box(-.5, -7, 0, .5, 7, 20, 'cutout', { double: true }); G.cyl(0, 0, 20, 30, 4.5, 4.5, 8, 'cutout'); G.box(-1, -2, -4, 1, 2, 0, 'iron'); },
  cutoutCiv: G => { G.box(-.5, -7, 0, .5, 7, 20, 'awning-blue', { double: true }); G.cyl(0, 0, 20, 30, 4.5, 4.5, 8, 'plywood'); },
  turretBot: G => { G.box(-8, -8, 0, 8, 8, 14, 'steel-paint'); G.box(-4, -4, 14, 4, 4, 20, 'gunmetal'); G.pipe(4, 14, 0, 17, 1.2, 6, 'iron'); }
});
