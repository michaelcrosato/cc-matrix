// Presentation of a world (a WP.Sim, or a WP.Mirror on a hub client): the Mode 7 pass (floor, sky, scenery, rigs,
// shapes, bosses, projectiles, pickups, world FX), screen FX, the first-person gun. Never feeds back into the sim.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, clamp = E.clamp, rnd = WP.fxr;
const R = WP.Render = { rigs: new Map(), blobs: new Map(), fx: [], screen: [], m7: {}, floors: {}, t: 0, tracers: [], hitm: [], floats: [], arcs: [], flashT: 0, recoil: [0, 0, 0, 0], reloadAnim: [0, 0, 0, 0], throwAnim: [0, 0, 0, 0], gunX: [240, 240, 240, 240], casings: [] };
// ---------------------------------------------------------------------------------------------- floors and the Mode 7 views
R.bakeFloor = (key, stage) => {
  if (R.floors[key]) return R.floors[key];
  const painter = WP.FLOORS[key](stage ? stage.ox : 0, stage ? stage.oy : 0);
  const W = key === 'airB' ? 2048 : key === 'river' ? 2000 : (stage.len || 3000) + 1500, H = key === 'airB' ? 6144 : key === 'river' ? 3900 : 2000;
  const cv = E.mkCanvas(W, H), g = cv.getContext && cv.getContext('2d');
  if (g && g.createImageData) {
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const c = painter(x + 1, y + 1);
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { const j = 1 - ((x + y) >> 1 & 1) * 0, i = ((y + yy) * W + x + xx) * 4, v = ((xx + yy) & 1) ? 1.03 : .97; d[i] = Math.min(255, c[0] * v); d[i + 1] = Math.min(255, c[1] * v); d[i + 2] = Math.min(255, c[2] * v); d[i + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
  }
  return (R.floors[key] = cv);
};
R.viewFor = (stage, part) => {
  const key = stage.id + part; if (R.m7[key]) return R.m7[key];
  const B = part === 'B' ? stage.partB : stage, floor = R.bakeFloor(B.floor, stage);
  const outside = { hill: '#6e7a3a', river: '#3a4a2a', village: '#c4a470', depot: '#5e5a52', kennel: '#2a2822', airfield: '#5a6a3a', airB: '#2a5a7a' }[B.floor] || '#304020';
  return (R.m7[key] = new E.Mode7({ floor, outside, sky: new E.Backdrop(B.sky), fog: B.fog, far: (B.fog && B.fog.far) || 1800 }));
};
// ---------------------------------------------------------------------------------------------- rigs: one per live entity, posed every update
const RIGGED = e => (e.kind === 'infantry' || e.kind === 'civilian' || e.kind === 'hostage') && e.T.rig;
R.rigOf = e => { let r = R.rigs.get(e.id); if (!r) { r = WP.rigNew(e.T.rig); R.rigs.set(e.id, r); WP.customPose(r); } return r; };
R.blobOf = e => { let b = R.blobs.get(e.id); if (!b) { b = WP.blobNew(e.T.blob); R.blobs.set(e.id, b); } return b; };
// custom poses wrapped round solvePose: hands up, bound hands, panic, whistle, rocket on the shoulder
WP.customPose = rig => {
  const base = rig.solvePose; rig.custom = null;
  rig.solvePose = function () {
    base.call(this); const J = this.J, c = this.custom; if (!c || !J || !J.shL) return;
    const set = (k, v) => { J[k] = v; };
    if (c === 'handsUp' || c === 'panic') { const up = c === 'panic' ? 4 : 9; set('elbowL', [J.shL[0] + 1, J.shL[1] - 2, J.shL[2] + up * .55]); set('handL', [J.shL[0] + (c === 'panic' ? 2 : 1), J.shL[1] - (c === 'panic' ? -1 : 2), J.shL[2] + up]); set('elbowR', [J.shR[0] + 1, J.shR[1] + 2, J.shR[2] + up * .55]); set('handR', [J.shR[0] + (c === 'panic' ? 2 : 1), J.shR[1] + (c === 'panic' ? -1 : 2), J.shR[2] + up]); }
    else if (c === 'bound') { set('elbowL', [J.shL[0] - 2, J.shL[1] - 1, J.shL[2] - 4]); set('handL', [J.hipC[0] - 3, J.hipC[1] - .5, J.hipC[2] + 1]); set('elbowR', [J.shR[0] - 2, J.shR[1] + 1, J.shR[2] - 4]); set('handR', [J.hipC[0] - 3, J.hipC[1] + .5, J.hipC[2] + 1]); }
    else if (c === 'whistle') { set('elbowR', [J.shR[0] + 3, J.shR[1] + 1, J.shR[2] - 1]); set('handR', [J.head[0] + 2, J.head[1] + .5, J.head[2] - 2]); }
    else if (c === 'rpg') { set('elbowR', [J.shR[0] + 3, J.shR[1] + 1, J.shR[2] - 2]); set('handR', [J.shR[0] + 5, J.shR[1], J.shR[2]]); set('elbowL', [J.shL[0] + 4, J.shL[1] + 1, J.shL[2] - 2]); set('handL', [J.shL[0] + 8, J.shL[1] + 2, J.shL[2] - .5]); }
    else if (c === 'para') { set('handL', [J.shL[0], J.shL[1] - 1, J.shL[2] + 7]); set('elbowL', [J.shL[0], J.shL[1] - 1.5, J.shL[2] + 3.5]); set('handR', [J.shR[0], J.shR[1] + 1, J.shR[2] + 7]); set('elbowR', [J.shR[0], J.shR[1] + 1.5, J.shR[2] + 3.5]); }
  };
};
R.poseRig = (world, e, dt) => {
  const r = R.rigOf(e), tl = e.tele, gun = e.T.atk === 'gun' || e.T.atk === 'burst' || e.T.atk === 'snipe' || e.T.rig === 'rifleman';
  const st = { x: e.x, y: e.y, z: e.z, vx: e.dead ? 0 : (e.vx || 0), vy: e.dead ? 0 : (e.vy || 0), facing: e.facing, hurt: e.hurtT > 0 ? .8 : 0 };
  r.custom = null;
  if (e.dead) { st.pose = e.wounded ? 'down' : 'die'; }
  else if (e.kind === 'hostage') { if (e.grabbedBy) st.pose = 'kneel'; r.custom = e.grabbedBy ? null : 'bound'; }
  else if (e.kind === 'civilian') { if (e.panic > 0) r.custom = 'panic'; }
  else {
    if (e.pose === 'crouch') st.pose = 'crouch'; else if (e.pose === 'kneel') st.pose = 'kneel';
    if ((tl && tl.kind === 'ring') || tl && tl.kind === 'glint' || e.firing > 0 || e.st === 'aim' || e.st === 'atk') { st.point = gun; st.aim = .05; st.expr = e.firing > 0 ? 'shout' : 'angry'; }
    if (tl && tl.kind === 'throw') { const u = 1 - tl.t / tl.max; st.attack = E.move ? E.move('throw', u * .45) : null; }
    else if (e.throwT > 0) { st.attack = E.move ? E.move('throw', .45 + (1 - e.throwT / .3) * .55) : null; }
    if (tl && tl.kind === 'whistle') r.custom = 'whistle';
    if (e.T.rig === 'rpg') r.custom = 'rpg';
    if (e.chute) { r.custom = 'para'; st.air = true; }
    if (e.stun > 0) st.hurt = 1;
  }
  if (e.firing > 0) e.firing -= dt; if (e.throwT > 0) e.throwT -= dt;
  r.update(dt, st);
};
// ---------------------------------------------------------------------------------------------- the presentation step: rigs, FX emitters, decay
R.update = (world, dt) => {
  R.t += dt; const seen = new Set();
  for (const e of world.ents) {
    seen.add(e.id);
    if (RIGGED(e)) R.poseRig(world, e, dt);
    else if (e.kind === 'animal' && e.T.blob) { const b = R.blobOf(e); b.update(dt, { walk: Math.hypot(e.vx || 0, e.vy || 0) > 1 ? 1 : 0, flap: e.T.fly || e.fled ? 1 : 0, squash: Math.sin(R.t * 8 + e.id) * .05 }); }
    else if (e.kind === 'vehicle' || e.kind === 'boss') {
      if (e.gunner || e.gunner2 || e.type === 'bigEar' || e.type === 'hyenaOne' || e.type === 'warthog' || e.type === 'tuskTower') R.vehRigs(world, e, dt);
      const f = e.dead ? 1 : e.max ? 1 - e.hp / e.max : 0;
      if (f > .5 && rnd() < dt * (f > .75 ? 14 : 6)) R.smoke(e.x + (rnd() - .5) * 16, e.y, e.z + (e.T.h || 20), f > .75 ? '#2a2420' : '#5a5650', 5);
      if (f > .75 && !e.dead && rnd() < dt * 10) R.add('fire', e.x + (rnd() - .5) * 10, e.y, e.z + (e.T.h || 20) * .8, 0, 0, 20, .5, 4);
      if (e.kind === 'boss' && e.parts) for (const p of e.parts) if (p.dead && rnd() < dt * 4) { const w = world.wpWorld ? world.wpWorld(e, p.off) : [e.x, e.y, e.z]; R.smoke(w[0], w[1], w[2], '#3a3430', 4); }
      if (e.spiral) { e.lz = (e.lz || 0) - 40 * dt; }
    } else if (e.kind === 'projectile' && e.T.trail && rnd() < dt * 40) R.smoke(e.x, e.y, e.z, '#c8c0b0', 2.5, .6);
    else if (e.kind === 'pgrenade' && rnd() < dt * 20) R.smoke(e.x, e.y, e.z, '#a0a0a0', 1.5, .4);
  }
  for (const id of R.rigs.keys()) if (!seen.has(id)) R.rigs.delete(id);
  for (const id of R.blobs.keys()) if (!seen.has(id)) R.blobs.delete(id);
  for (const k of ['vrig']) if (R[k]) for (const id of R[k].keys()) if (!seen.has(+String(id).split(':')[0])) R[k].delete(id);
  // world particles
  const wind = (world.stage.wind || 0) * (.7 + .3 * Math.sin(R.t * .8)), wb = WP.basis(world.cam);
  for (const p of R.fx) { if (wind && (p.kind === 'smoke' || p.kind === 'ember' || p.kind === 'dust')) { p.x += wb.rx * wind * 30 * dt; p.y += wb.ry * wind * 30 * dt; } p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.g) { p.vz -= p.g * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } } if (p.kind === 'smoke') { p.vz += 6 * dt; p.size += 6 * dt; } }
  R.fx = R.fx.filter(p => p.life > 0);
  if (R.fx.length > 900) R.fx.splice(0, R.fx.length - 900);
  for (const l of [R.tracers, R.hitm, R.floats, R.arcs, R.casings]) for (const q of l) q.life -= dt;
  R.tracers = R.tracers.filter(q => q.life > 0); R.hitm = R.hitm.filter(q => q.life > 0); R.floats = R.floats.filter(q => q.life > 0); R.arcs = R.arcs.filter(q => q.life > 0);
  for (const c of R.casings) { c.vy += 500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > 262) { c.y = 262; c.vy *= -.4; c.vx *= .6; } }
  R.casings = R.casings.filter(c => c.life > 0);
  for (let i = 0; i < 4; i++) { R.recoil[i] = Math.max(0, R.recoil[i] - dt * 30); R.throwAnim[i] = Math.max(0, R.throwAnim[i] - dt); }
  if (R.flashT > 0) R.flashT -= dt;
  // ambient: rain splashes, embers
  const st = world.stage; if (st.rain && rnd() < dt * 30) { const c = world.cam, w = WP.camToWorld(c, (rnd() - .5) * 300, 40 + rnd() * 260); R.add('splash', w[0], w[1], 0, 0, 0, 40, .3, 1); }
  if (st.embers && rnd() < dt * 12) { const c = world.cam, w = WP.camToWorld(c, (rnd() - .5) * 400, 60 + rnd() * 300); R.add('ember', w[0], w[1], rnd() * 20, (rnd() - .5) * 10, 0, 18 + rnd() * 20, 3, 1.2); }
};
// rigs riding on vehicles and bosses: gunners, the general, sgt. snarl, Tusk
R.vrig = new Map();
R.vehRigs = (world, e, dt) => {
  const want = [];
  if (e.gunner && !e.gunner.dead) want.push(['g1', 'rifleman']); if (e.gunner2 && !e.gunner2.dead) want.push(['g2', 'rifleman']);
  if (e.parts) for (const p of e.parts) if (!p.dead && (p.id === 'gunL' || p.id === 'gunR' || p.id === 'door')) want.push([p.id, 'rifleman']); else if (!p.dead && p.id === 'kragg') want.push([p.id, 'kragg']); else if (!p.dead && p.id === 'snarl') want.push([p.id, 'rifleman']);
  if (e.type === 'tuskTower' && e.phase === 1 && e.tusk) want.push(['tusk', 'tusk']);
  for (const [k, preset] of want) {
    const key = e.id + ':' + k; let r = R.vrig.get(key); if (!r) { r = WP.rigNew(preset); R.vrig.set(key, r); }
    if (k === 'tusk') { const t = e.tusk; r.update(dt, { x: t.x, y: t.y, z: 0, vx: t.st === 'walk' ? -1 : 0, vy: t.st === 'walk' ? 20 : 0, facing: world.cam.angle + Math.PI, point: t.shieldDown > 0, aim: .05, stance: 'guard', expr: 'angry', hurt: e.stun > 0 ? 1 : 0 }); r.custom = null; continue; }
    r.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: world.cam.angle + Math.PI, point: true, aim: .05, expr: k === 'kragg' ? 'shout' : e.tele ? 'angry' : undefined });
  }
};
// ---------------------------------------------------------------------------------------------- FX helpers
R.add = (kind, x, y, z, vx, vy, vz, life, size, color, g) => { R.fx.push({ kind, x, y, z, vx: vx || 0, vy: vy || 0, vz: vz || 0, life, max: life, size: size || 2, color, g: g || 0 }); };
R.smoke = (x, y, z, color, size, life = 1.6) => R.add('smoke', x + (rnd() - .5) * 4, y + (rnd() - .5) * 4, z, (rnd() - .5) * 6, (rnd() - .5) * 6, 8 + rnd() * 8, life, size, color);
R.explosion = (x, y, z, r, big) => {
  const n = Math.round(6 + r / 6);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.28, s = rnd() * r * .9; R.add('fire', x + Math.cos(a) * s * .3, y + Math.sin(a) * s * .3, z + rnd() * r * .3, Math.cos(a) * s, Math.sin(a) * s, 20 + rnd() * r, .35 + rnd() * .35, r * (.15 + rnd() * .15)); }
  for (let i = 0; i < n; i++) R.smoke(x + (rnd() - .5) * r * .6, y + (rnd() - .5) * r * .6, z + rnd() * r * .4, i % 2 ? '#3a3430' : '#5a524a', r * .18, 1.4 + rnd());
  for (let i = 0; i < n; i++) { const a = rnd() * 6.28, s = 40 + rnd() * r * 2; R.add('debris', x, y, z + 4, Math.cos(a) * s, Math.sin(a) * s, 60 + rnd() * 120, 1.2 + rnd(), 1.5 + rnd() * 2, rnd() < .5 ? '#3a3020' : '#6a5a40', 260); }
  for (let i = 0; i < 8; i++) { const a = rnd() * 6.28; R.add('spark', x, y, z + 6, Math.cos(a) * 160, Math.sin(a) * 160, 40 + rnd() * 120, .35, 1, '#ffe080', 200); }
  R.add('shock', x, y, 0, 0, 0, 0, .45, r * 1.1); R.add('flash', x, y, z + 6, 0, 0, 0, .12, r * .9);
};
R.impact = (mat, x, y, z) => {
  if (mat === 'metal') { for (let i = 0; i < 4; i++) { const a = rnd() * 6.28; R.add('spark', x, y, z, Math.cos(a) * 80, Math.sin(a) * 80, 30 + rnd() * 80, .22, 1, '#ffe8a0', 300); } }
  else if (mat === 'wood') { for (let i = 0; i < 3; i++) R.add('debris', x, y, z, (rnd() - .5) * 80, (rnd() - .5) * 80, 50 + rnd() * 60, .6, 1.2, '#b88a50', 300); }
  else if (mat === 'water') { for (let i = 0; i < 5; i++) R.add('splash', x + (rnd() - .5) * 4, y, z, (rnd() - .5) * 20, (rnd() - .5) * 20, 40 + rnd() * 50, .45, 1.2, null, 260); }
  else if (mat === 'flesh') { for (let i = 0; i < 3; i++) R.add('dust', x, y, z, (rnd() - .5) * 30, (rnd() - .5) * 30, 10 + rnd() * 20, .4, 2.5, '#c8b8a0'); }
  else { R.add('dust', x, y, z, (rnd() - .5) * 10, (rnd() - .5) * 10, 14, .55, 3, '#b8a080'); for (let i = 0; i < 2; i++) R.add('debris', x, y, z, (rnd() - .5) * 50, (rnd() - .5) * 50, 40 + rnd() * 40, .5, 1, '#6a5a40', 300); }
};
// ---------------------------------------------------------------------------------------------- drawing helpers inside Mode 7
const tone = c => E.tones(c);
const drawFxParticle = (g, p, sx, sy, k) => {
  const u = p.life / p.max, s = Math.max(1, p.size * k);
  if (p.kind === 'fire') { const c = u > .6 ? '#fff4b0' : u > .35 ? '#ffb040' : '#e0502a'; px.blend(g, .9, 'add', () => px.disc(g, sx, sy - s * .5, s * (.5 + u * .6), c)); }
  else if (p.kind === 'smoke') px.ddisc(g, sx, sy - s, s, p.color || '#5a5650', .55 * u);
  else if (p.kind === 'dust') px.ddisc(g, sx, sy - s * .5, s * (1.4 - u * .4), p.color || '#b8a080', .6 * u);
  else if (p.kind === 'spark') px.rect(g, sx, sy, Math.max(1, k * 1.2), Math.max(1, k * 1.2), u > .5 ? '#fff8d0' : '#ffb040');
  else if (p.kind === 'debris') px.rect(g, sx, sy - s, s, s, p.color);
  else if (p.kind === 'splash') px.rect(g, sx, sy - s, Math.max(1, s * .6), Math.max(1, s), '#d8e8f0');
  else if (p.kind === 'ember') px.blend(g, .8, 'add', () => px.rect(g, sx, sy, Math.max(1, k), Math.max(1, k), u > .5 ? '#ffc060' : '#e06030'));
  else if (p.kind === 'shock') { const rr = p.size * k * (1.2 - u); px.blend(g, .5 * u, 'add', () => { px.ell(g, sx, sy, rr, rr * .25, '#ffd8a0'); }); }
  else if (p.kind === 'flash') px.blend(g, .9, 'add', () => px.disc(g, sx, sy - s * .3, s * 1.2, '#fff8e0'));
  else if (p.kind === 'muzzle') px.blend(g, .95, 'add', () => { px.disc(g, sx, sy, Math.max(2, 3 * k), '#fff4c0'); px.disc(g, sx, sy, Math.max(3, 5 * k), '#ffb040'); });
};
// scenery draw functions: (g, sx, sy, k, o, world)
const D = WP.DRAW = {};
const poly = (g, pts, c) => px.poly(g, pts.map(p => [Math.round(p[0]), Math.round(p[1])]), c);
D.facade = (g, sx, sy, k, o) => {
  const f = o.f, w = f.w * k, h = f.h * k, x0 = sx - w / 2, y0 = sy - h, T1 = tone(f.color), hangar = o.hangar, metal = o.metal;
  // the wall, cut round its openings
  const holes = f.wins.map(([cx, z0, ww, hh]) => [sx + (cx - ww / 2) * k, sy - (z0 + hh) * k, ww * k, hh * k]);
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); for (const [hx, hy, hw, hh] of holes) g.rect(hx + hw, hy, -hw, hh); g.clip('evenodd');
  px.rect(g, x0, y0, w, h, T1.base);
  if (metal || hangar) { for (let x = x0; x < x0 + w; x += Math.max(2, 4 * k)) px.rect(g, x, y0, 1, h, T1.sh); }
  else { for (let i = 0; i < 6; i++) px.rect(g, x0 + ((i * 37) % 100) / 100 * w, y0 + ((i * 53) % 100) / 100 * h, 6 * k, 3 * k, T1.lt); px.rect(g, x0, sy - 6 * k, w, 6 * k, T1.sh); }
  g.restore();
  for (const [hx, hy, hw, hh] of holes) { px.rect(g, hx - k, hy - k, hw + 2 * k, k * 1.5, T1.sh); px.rect(g, hx - k, hy + hh, hw + 2 * k, k * 1.5, T1.lt); if (!hangar) { px.rect(g, hx - 4 * k, hy, 4 * k, hh, '#5a7a4a'); px.rect(g, hx + hw, hy, 4 * k, hh, '#5a7a4a'); } }
  if (hangar) { const T2 = tone(f.roof); px.poly(g, [[x0 - 4 * k, y0], [sx, y0 - 26 * k], [x0 + w + 4 * k, y0]], T2.base); px.line(g, x0 - 4 * k, y0, sx, y0 - 26 * k, T2.lt, Math.max(1, k)); }
  else { const T2 = tone(f.roof); px.poly(g, [[x0 - 6 * k, y0 + 2 * k], [x0 + 8 * k, y0 - 18 * k], [x0 + w - 8 * k, y0 - 18 * k], [x0 + w + 6 * k, y0 + 2 * k]], T2.base); for (let y = y0 - 16 * k; y < y0; y += 4 * k) px.rect(g, x0 - 4 * k, y, w + 8 * k, Math.max(1, k * .8), T2.sh); }
};
D.interior = (g, sx, sy, k, o) => { const f = o.f; for (const [cx, z0, ww, hh] of f.wins) px.rect(g, sx + (cx - ww / 2) * k, sy - (z0 + hh) * k, ww * k, hh * k, '#1a1410'); };
D.mastBase = (g, sx, sy, k) => { px.rect(g, sx - 10 * k, sy - 2 * k, 20 * k, 2 * k, '#4a4a4a'); };
D.mast = (g, sx, sy, k, o, world, e) => {
  const tilt = e && e.dead ? Math.min(1, (e.deadT || 0) / 1.2) * 1.45 : 0, H = 140, s = Math.sin(tilt), c = Math.cos(tilt), C = '#8a8a90', CD = '#5a5a60';
  const P = (lx, z) => [sx + (lx * c + z * s) * k, sy - (z * c - lx * s) * k];
  for (const side of [-1, 1]) { const a = P(side * 10, 0), b = P(side * 3, H); px.line(g, a[0], a[1], b[0], b[1], C, Math.max(1, k * 1.5)); }
  for (let z = 10; z < H; z += 14) { const w0 = 10 - 7 * z / H, w1 = 10 - 7 * (z + 14) / H, a = P(-w0, z), b = P(w1, z + 14), d = P(w0, z), f2 = P(-w1, z + 14); px.line(g, a[0], a[1], b[0], b[1], CD, Math.max(1, k * .8)); px.line(g, d[0], d[1], f2[0], f2[1], CD, Math.max(1, k * .8)); const q = P(-w0, z), q2 = P(w0, z); px.line(g, q[0], q[1], q2[0], q2[1], C, Math.max(1, k * .8)); }
  const pl = P(0, 92); px.rect(g, pl[0] - 12 * k, pl[1], 24 * k, 2 * k, '#6a6a70');
  const top = P(0, H + 3); if (!tilt && (R.t * 2 % 1) < .5) px.blend(g, 1, 'add', () => px.disc(g, top[0], top[1], Math.max(1.5, 2.5 * k), '#ff3020')); else px.disc(g, top[0], top[1], Math.max(1, 1.5 * k), '#802020');
  // the junction box at the base (the weak point)
  if (!tilt) { px.rect(g, sx - 7 * k, sy - 24 * k, 14 * k, 22 * k, '#5e6a3a'); px.rect(g, sx - 5 * k, sy - 22 * k, 10 * k, 3 * k, '#e0b040'); }
  else px.rect(g, sx - 7 * k, sy - 10 * k, 14 * k, 10 * k, '#2a2622');
};
D.dish = (g, sx, sy, k) => { const a = R.t * .8, w = Math.abs(Math.cos(a)) * 22 * k + 3 * k; px.rect(g, sx - k, sy - 14 * k, 2 * k, 14 * k, '#6a6a70'); px.ell(g, sx, sy - 22 * k, w, 14 * k, '#d8d8d0'); px.ell(g, sx + (Math.cos(a) > 0 ? -2 : 2) * k, sy - 22 * k, w * .7, 10 * k, '#a8a8a0'); };
D.bridge = (g, sx, sy, k, o, world) => { const broke = world.bridgeDown; const w = 240 * k; if (broke) { px.line(g, sx - w / 2, sy, sx - w / 2 + 30 * k, sy + 40 * k, '#6a4a2a', Math.max(1, 3 * k)); px.line(g, sx + w / 2, sy, sx + w / 2 - 30 * k, sy + 40 * k, '#6a4a2a', Math.max(1, 3 * k)); return; }
  for (let i = 0; i < 24; i++) { const x = sx - w / 2 + i * w / 24, sag = Math.sin(i / 23 * Math.PI) * 6 * k; px.rect(g, x, sy + sag, w / 24 - 1, 3 * k, i % 2 ? '#8a6a44' : '#7a5a38'); }
  for (const z of [0, 14]) { for (let i = 0; i < 24; i++) { const x = sx - w / 2 + i * w / 24, sag = Math.sin(i / 23 * Math.PI) * 6 * k; px.rect(g, x, sy + sag - (14 - z) * k - 2, w / 24, Math.max(1, k * .7), '#c8a870'); } }
  px.rect(g, sx - w / 2 - 3 * k, sy - 20 * k, 4 * k, 60 * k, '#5a3a22'); px.rect(g, sx + w / 2 - k, sy - 20 * k, 4 * k, 60 * k, '#5a3a22'); };
D.barge = (g, sx, sy, k) => { const T1 = tone('#5a5048'); px.poly(g, [[sx - 50 * k, sy - 6 * k], [sx + 50 * k, sy - 6 * k], [sx + 44 * k, sy + 2 * k], [sx - 44 * k, sy + 2 * k]], T1.base); px.rect(g, sx - 50 * k, sy - 8 * k, 100 * k, 2 * k, T1.lt); };
D.floatDock = (g, sx, sy, k) => { px.rect(g, sx - 30 * k, sy - 4 * k, 60 * k, 4 * k, '#8a6a44'); for (let i = 0; i < 6; i++) px.rect(g, sx - 30 * k + i * 10 * k, sy - 4 * k, 1, 4 * k, '#5a4028'); };
D.waterfall = (g, sx, sy, k) => { const w = 220 * k, h = 160 * k; px.rect(g, sx - w / 2 - 60 * k, sy - h - 20 * k, w + 120 * k, h + 20 * k, '#3a4a3a'); for (let i = 0; i < 30; i++) { const x = sx - w / 2 + (i / 30) * w, off = (R.t * 60 + i * 13) % h; px.rect(g, x, sy - h, w / 30, h, i % 3 ? '#a8c8d0' : '#d8e8f0'); px.rect(g, x, sy - h + off, w / 30, 6 * k, '#ffffff'); } px.ddisc(g, sx, sy, w * .6, '#e8f0f0', .5); };
D.chapel = (g, sx, sy, k) => { const T1 = tone('#ece4d0'); px.rect(g, sx - 30 * k, sy - 70 * k, 60 * k, 70 * k, T1.base); px.rect(g, sx - 12 * k, sy - 130 * k, 24 * k, 60 * k, T1.lt); px.poly(g, [[sx - 15 * k, sy - 130 * k], [sx, sy - 150 * k], [sx + 15 * k, sy - 130 * k]], '#b0583a'); px.rect(g, sx - 8 * k, sy - 70 * k, 16 * k, 14 * k, '#2a2018'); px.rect(g, sx - 3 * k, sy - 120 * k, 6 * k, 8 * k, '#1a1410'); px.rect(g, sx - k / 2, sy - 158 * k, k, 8 * k, '#3a3a3a'); px.rect(g, sx - 3 * k, sy - 155 * k, 6 * k, k, '#3a3a3a'); };
D.fountain = (g, sx, sy, k) => { px.ell(g, sx, sy - 4 * k, 34 * k, 8 * k, '#a8a090'); px.ell(g, sx, sy - 6 * k, 30 * k, 6 * k, '#5ab0c8'); px.rect(g, sx - 3 * k, sy - 24 * k, 6 * k, 18 * k, '#c8c0b0'); for (let i = 0; i < 6; i++) { const a = R.t * 3 + i; px.rect(g, sx + Math.cos(i) * 8 * k, sy - (24 - (a % 1) * 18) * k, Math.max(1, k), Math.max(1, k), '#d8f0ff'); } };
D.waterTower = (g, sx, sy, k) => { for (const s of [-1, 1]) px.line(g, sx + s * 18 * k, sy, sx + s * 12 * k, sy - 70 * k, '#6a6a70', Math.max(1, 2 * k)); px.line(g, sx - 15 * k, sy - 35 * k, sx + 15 * k, sy - 35 * k, '#5a5a60', Math.max(1, k)); px.rect(g, sx - 22 * k, sy - 100 * k, 44 * k, 32 * k, '#8a8a8a'); px.rect(g, sx - 22 * k, sy - 100 * k, 8 * k, 32 * k, '#a8a8a8'); px.poly(g, [[sx - 24 * k, sy - 100 * k], [sx, sy - 112 * k], [sx + 24 * k, sy - 100 * k]], '#6a6a70'); px.rect(g, sx - 26 * k, sy - 70 * k, 52 * k, 2 * k, '#5a5a60'); };
D.cageBlock = (g, sx, sy, k, o, world) => { const w = 260 * k, h = 50 * k; px.rect(g, sx - w / 2, sy - h, w, h, '#4a4a4e'); px.rect(g, sx - w / 2, sy - h - 6 * k, w, 6 * k, '#3a3a3e'); for (let i = 0; i < 5; i++) { const cx = sx - w / 2 + (i + .5) * w / 5; px.rect(g, cx - 16 * k, sy - 40 * k, 32 * k, 40 * k, '#141418'); const open = world.cellsOpen && world.cellsOpen[i]; if (!open) for (let b = 0; b < 6; b++) px.rect(g, cx - 15 * k + b * 6 * k, sy - 40 * k, Math.max(1, k * 1.2), 40 * k, '#8a8a90'); } };
D.flagpole = (g, sx, sy, k) => { px.rect(g, sx, sy - 90 * k, Math.max(1, k), 90 * k, '#a0a0a0'); const wv = Math.sin(R.t * 4) * 2 * k; px.poly(g, [[sx + k, sy - 90 * k], [sx + 30 * k, sy - 86 * k + wv], [sx + 30 * k, sy - 70 * k + wv], [sx + k, sy - 74 * k]], '#b8302a'); if (k > .4) px.sprite(g, WP.SPR.hyena, Math.round(sx + 10 * k), Math.round(sy - 86 * k)); };
D.cliff = (g, sx, sy, k) => { px.poly(g, [[sx - 1400 * k, sy], [sx - 900 * k, sy - 160 * k], [sx - 300 * k, sy - 120 * k], [sx + 200 * k, sy - 180 * k], [sx + 1400 * k, sy - 100 * k], [sx + 1400 * k, sy]], '#0e1420'); };
D.controlTower = (g, sx, sy, k) => { const T1 = tone('#8a8478'); px.rect(g, sx - 14 * k, sy - 90 * k, 28 * k, 90 * k, T1.base); px.rect(g, sx - 14 * k, sy - 90 * k, 6 * k, 90 * k, T1.lt); px.rect(g, sx - 24 * k, sy - 112 * k, 48 * k, 22 * k, '#5a6a7a'); px.rect(g, sx - 22 * k, sy - 108 * k, 44 * k, 12 * k, '#8ab0c8'); px.rect(g, sx - 26 * k, sy - 116 * k, 52 * k, 4 * k, '#3a3a3a'); };
D.oldHowler = (g, sx, sy, k) => { const T1 = tone('#7a7e84'); px.ell(g, sx, sy - 22 * k, 90 * k, 16 * k, T1.base); px.ell(g, sx, sy - 26 * k, 88 * k, 9 * k, T1.lt); px.rect(g, sx - 130 * k, sy - 34 * k, 260 * k, 5 * k, '#d8d4c8'); for (const s of [-1, 1]) { px.ell(g, sx + s * 48 * k, sy - 30 * k, 10 * k, 8 * k, '#3e4a2a'); const a = R.t * 30; px.rect(g, sx + s * 48 * k - Math.abs(Math.cos(a)) * 14 * k, sy - 31 * k, Math.abs(Math.cos(a)) * 28 * k + 1, Math.max(1, k), '#141414'); } px.poly(g, [[sx - 90 * k, sy - 10 * k], [sx - 120 * k, sy + 2 * k], [sx - 80 * k, sy + 2 * k]], '#5a5e64'); px.rect(g, sx + 70 * k, sy - 60 * k, 4 * k, 40 * k, T1.sh); px.rect(g, sx + 60 * k, sy - 30 * k, 40 * k, 3 * k, '#d8d4c8'); if (k > .5) E.font.text(g, 'OLD HOWLER', sx - 30 * k, sy - 26 * k, '#1a1a1a', { outline: false }); };
D.windsock = (g, sx, sy, k, o, world) => { px.rect(g, sx, sy - 40 * k, Math.max(1, k), 40 * k, '#c0c0c0'); const wv = Math.sin(R.t * 5 * (1 + ((world && world.stage.wind) || 0))) * 2 * k; for (let i = 0; i < 4; i++) px.rect(g, sx + i * 5 * k, sy - 40 * k + wv * i / 3, 5 * k, 6 * k - i * k, i % 2 ? '#ffffff' : '#ff6a2a'); };
D.radar = (g, sx, sy, k) => { px.rect(g, sx - 2 * k, sy - 40 * k, 4 * k, 40 * k, '#6a6a70'); const a = R.t * 1.5, w = Math.abs(Math.cos(a)) * 20 * k + 2; px.rect(g, sx - w, sy - 46 * k, w * 2, 8 * k, '#c8c8c0'); };
// ---------------------------------------------------------------------------------------------- the world pass
R.draw = (r, world) => {
  const st = world.stage, part = world.part || 'A', m7 = R.viewFor(st, part), cam = world.cam;
  m7.cam = { x: cam.x, y: cam.y, h: cam.h, angle: cam.angle, pitch: cam.pitch, fov: cam.fov };
  const b = WP.basis(cam), far = ((part === 'B' ? st.partB.fog : st.fog) || {}).far || 1800, hwF = WP.W / 2 / (WP.H / 2 / Math.tan(cam.fov * Math.PI / 360));
  const vis = (x, y, pad = 120) => { const dx = x - cam.x, dy = y - cam.y, dz = dx * b.fx + dy * b.fy; if (dz < 4 || dz > far) return false; const lx = dx * b.rx + dy * b.ry; return Math.abs(lx) < dz * hwF + pad; };
  // scenery
  if (part === 'A') for (const s of st.scenery) {
    const x = st.ox + s.x, y = st.oy + s.y; if (!vis(x, y, s.k === 'draw' ? 400 : 120)) continue;
    if (s.k === 'shape') m7.shape(s.id, x, y, s.z, { facing: s.f, size: s.s });
    else if (s.k === 'draw') { if (s.fn === 'facade') m7.add(x, y - 14, 0, (g, sx, sy, k) => D.interior(g, sx, sy, k, s.o)); m7.add(x, y, s.z, (g, sx, sy, k) => D[s.fn] && D[s.fn](g, sx, sy, k, s.o, world)); }
  }
  // entities
  for (const e of world.ents) {
    if (e.gone) continue; if (!vis(e.x, e.y, e.kind === 'boss' ? 400 : 160)) continue;
    const fade = e.dead && e.kind !== 'boss' && e.kind !== 'prop' && e.kind !== 'vehicle' ? clamp(((e.T.fadeT || 2.5) - (e.deadT || 0)) / .8, 0, 1) : 1;
    if (RIGGED(e)) R.drawRig(m7, e, fade);
    else if (e.kind === 'animal') R.drawAnimal(m7, e);
    else if (e.kind === 'vehicle' || e.kind === 'scenery') R.drawVehicle(m7, world, e);
    else if (e.kind === 'boss') R.drawBoss(m7, world, e);
    else if (e.kind === 'prop') R.drawProp(m7, world, e);
    else if (e.kind === 'projectile' || e.kind === 'pgrenade') R.drawProj(m7, e);
    else if (e.kind === 'pickup') R.drawPickup(m7, e);
  }
  for (const p of R.fx) if (vis(p.x, p.y, 80)) m7.add(p.x, p.y, p.z, (g, sx, sy, k) => drawFxParticle(g, p, sx, sy, k));
  m7.draw(r);
};
R.drawRig = (m7, e, fade) => {
  const rig = R.rigOf(e), clip = e.clip && !e.dead ? e.clip : null, z = e.z + (e.blastZ || 0);
  if (e.hidden) return;
  m7.add(e.x, e.y, z, (g, sx, sy, k) => {
    if (fade <= 0) return;
    if (e.chute) { const s = WP.SPR.chute, sc = Math.max(1, Math.round(k * 2.2)); g.drawImage(s.cv, Math.round(sx - s.w * sc / 2), Math.round(sy - (e.T.h + 24) * k - s.h * sc / 2), s.w * sc, s.h * sc); px.line(g, sx - 6 * k, sy - (e.T.h + 18) * k, sx, sy - e.T.h * .8 * k, '#d8d8d8'); px.line(g, sx + 6 * k, sy - (e.T.h + 18) * k, sx, sy - e.T.h * .8 * k, '#d8d8d8'); }
    const a0 = g.globalAlpha; g.globalAlpha = a0 * fade;
    if (clip) { const x0 = sx + (clip[0] - e.x) * k * (Math.cos(0)), w = (clip[1] - clip[0]) * k; g.save(); g.beginPath(); g.rect(Math.round(sx - w / 2) , Math.round(sy - (clip[3] - z) * k), Math.round(w), Math.round((clip[3] - clip[2]) * k)); g.clip(); }
    rig.draw(g, Math.round(sx), Math.round(sy), m7.view(k));
    if (clip) g.restore();
    g.globalAlpha = a0;
    if (e.T.rig === 'rpg' && !e.dead) { const t0 = WP.SPR.rocket, sc = Math.max(1, Math.round(k * 1.6)); px.rect(g, sx - 9 * k, sy - e.T.h * .78 * k, 20 * k, 3.5 * k, '#4a5a32'); }
    if (e.tele && e.tele.kind === 'whistle') { const bob = Math.sin(R.t * 12) * 2; E.font.text(g, '!', Math.round(sx - 2), Math.round(sy - e.T.h * k - 14 + bob), '#ffe040', { outline: '#000', scale: 2 }); }
    if (e.T.marked && R.marks && R.marks(e)) { px.blend(g, .9, 'add', () => { const y = sy - e.T.h * k - 6; px.poly(g, [[sx - 4, y - 6], [sx + 4, y - 6], [sx, y]], '#ff3030'); }); }
    if (e.kind === 'hostage' && !e.dead) { for (let i = 0; i < 3; i++) px.rect(g, Math.round(sx - 7 + i * 5), Math.round(sy - e.T.h * k - 8), 4, 3, i < e.hp ? '#5ae05a' : '#3a3a3a'); }
  });
};
R.drawAnimal = (m7, e) => {
  if (e.T.shape) { m7.shape(e.T.shape, e.x, e.y, e.z, { facing: e.facing }); if (e.carry) m7.add(e.x, e.y, e.z + 30, (g, sx, sy, k) => { const s = WP.SPR[WP.PICK_SPR[e.carry]]; if (s) g.drawImage(s.cv, Math.round(sx - s.w / 2), Math.round(sy - s.h)); }); return; }
  const b = R.blobOf(e);
  m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { const v = m7.view(k * 1.2); b.draw(g, Math.round(sx), Math.round(sy), v); if (e.carry) { const s = WP.SPR[WP.PICK_SPR[e.carry]]; if (s) { const sc = Math.max(1, Math.round(k)); g.drawImage(s.cv, Math.round(sx - s.w * sc / 2), Math.round(sy - (e.T.r * 2 + 4) * k - s.h * sc), s.w * sc, s.h * sc); } } });
};
R.drawVehicle = (m7, world, e) => {
  const sh = e.T.shape, f = e.facing || 0;
  m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { if (e.T.air) px.ell(g, sx, sy + (e.z) * k * .02, 30 * k, 6 * k, 'rgba(0,0,0,0)'); });
  if (e.dead) m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { if ((e.deadT || 0) > 6) g.globalAlpha *= clamp(1 - (e.deadT - 6), 0, 1); const v = m7.view(k); const spr = E.shapeSprite && E.shapeSprite(sh, { view: v, facing: Math.round(f / Math.PI * 8) / 8 * Math.PI }); if (spr) { g.filter = 'brightness(0.32) saturate(0.3)'; g.drawImage(spr.cv, Math.round(sx - spr.foot[0]), Math.round(sy - spr.foot[1] + (e.T.quota === 'boat' ? Math.min(20, e.deadT * 4) * k : 0))); g.filter = 'none'; } });
  else m7.shape(sh, e.x, e.y, e.z, { facing: f });
  if (e.dead) return;
  // gunners riding it
  const vr = (k2, at) => { const r = R.vrig.get(e.id + ':' + k2); if (!r || !at) return; const w = WP.wp(e, at); m7.add(w[0], w[1] + .5, w[2] - 4, (g, sx, sy, k) => r.draw(g, Math.round(sx), Math.round(sy), m7.view(k))); };
  if (e.gunner && !e.gunner.dead) vr('g1', e.T.gunnerAt); if (e.gunner2 && !e.gunner2.dead) vr('g2', e.T.gunner2At);
  if (e.T.air) R.rotor(m7, e, [0, 4, 28], 40, 1);
  if (e.tele && e.tele.kind === 'glow') { const u = 1 - e.tele.t / e.tele.max; m7.add(e.x, e.y + 1, e.z + (e.T.h || 20) + 4, (g, sx, sy, k) => px.blend(g, .4 + u * .6, 'add', () => px.disc(g, sx, sy, Math.max(2, (3 + u * 6) * k), u > .7 ? '#ffffff' : '#ffb040'))); }
  if (e.firing > 0) m7.add(e.x, e.y + 1, e.z + (e.T.h || 20), (g, sx, sy, k) => drawFxParticle(g, { kind: 'muzzle', life: 1, max: 1 }, sx, sy, k));
};
WP.wp = (e, off) => { const c = Math.cos(e.facing), s = Math.sin(e.facing); return [e.x + c * off[0] - s * off[1], e.y + s * off[0] + c * off[1], e.z + off[2]]; };
R.rotor = (m7, e, off, rad, sc) => { const w = WP.wp(e, off); m7.add(w[0], w[1] + 1, w[2], (g, sx, sy, k) => { const a = R.t * 40, rr = rad * k; px.blend(g, .35, 'normal', () => px.ell(g, sx, sy, rr, rr * .18, '#202020')); for (let i = 0; i < 2; i++) { const c = Math.cos(a + i * Math.PI / 2) * rr; px.line(g, sx - c, sy - 1, sx + c, sy + 1, '#141414', Math.max(1, k)); } px.rect(g, sx - k, sy - 2 * k, 2 * k, 3 * k, '#3a3a3a'); }); };
R.drawProj = (m7, e) => {
  const s = WP.SPR[e.T.sprite];
  if (e.type === 'flame') { m7.add(e.x, e.y, 0, (g, sx, sy, k) => { for (let i = 0; i < 6; i++) { const ox = (i - 2.5) * 6 * k, h = (10 + Math.sin(R.t * 20 + i) * 4) * k; px.blend(g, .9, 'add', () => { px.ell(g, sx + ox, sy - h * .5, 5 * k, h * .6, '#ff8030'); px.ell(g, sx + ox, sy - h * .4, 3 * k, h * .4, '#ffe080'); }); } }); return; }
  m7.add(e.x, e.y, e.z, (g, sx, sy, k) => {
    if (!s) return; const sc = Math.max(1, Math.round(k * 1.4 * (e.type === 'tshell' ? 1.6 : 1)));
    if (e.T.glow || e.type === 'rocket' || e.type === 'missile') px.blend(g, .6, 'add', () => px.disc(g, sx, sy, (sc * 3 + 2), '#ffb040'));
    if (e.T.spin) { const a = R.t * 18, c = Math.cos(a), sn = Math.sin(a), L = 4 * sc; px.line(g, sx - c * L, sy - sn * L, sx + c * L, sy + sn * L, '#d0d0d8', Math.max(1, sc)); px.line(g, sx - c * L, sy - sn * L, sx - c * L * .3, sy - sn * L * .3, '#5a3a22', Math.max(1, sc)); return; }
    g.drawImage(s.cv, Math.round(sx - s.w * sc / 2), Math.round(sy - s.h * sc / 2), s.w * sc, s.h * sc);
    if (e.kind === 'projectile' && !e.friendly) px.blend(g, .5 + .5 * Math.sin(R.t * 20), 'add', () => { const rr = Math.max(5, (e.T.r || 4) * k) + 2; px.line(g, sx - rr, sy - rr, sx - rr + 3, sy - rr, '#ff4040'); px.line(g, sx + rr - 3, sy + rr, sx + rr, sy + rr, '#ff4040'); });
  });
};
R.drawPickup = (m7, e) => {
  const s = WP.SPR[WP.PICK_SPR[e.pk]] || WP.SPR.mag;
  if (e.type === 'chute' && e.st === 'fall') m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { const c = WP.SPR.chute, sc = Math.max(1, Math.round(k * 2)); g.drawImage(c.cv, Math.round(sx - c.w * sc / 2), Math.round(sy - 30 * k - c.h * sc), c.w * sc, c.h * sc); px.line(g, sx - 6 * sc, sy - 30 * k, sx, sy - 6 * k, '#d0d0d0'); px.line(g, sx + 6 * sc, sy - 30 * k, sx, sy - 6 * k, '#d0d0d0'); });
  m7.add(e.x, e.y, e.z, (g, sx, sy, k) => {
    if (e.life < 1.5 && (R.t * 8 % 1) < .4) return;
    const sc = Math.max(1, Math.round(k * 1.3)); px.blend(g, .35 + .2 * Math.sin(R.t * 6), 'add', () => px.disc(g, sx, sy - s.h * sc / 2, s.w * sc * .8 + 3, '#ffe880'));
    g.drawImage(s.cv, Math.round(sx - s.w * sc / 2), Math.round(sy - s.h * sc), s.w * sc, s.h * sc);
  });
};
R.drawProp = (m7, world, e) => {
  const T = e.T;
  if (e.type === 'mast') { m7.add(e.x, e.y, 0, (g, sx, sy, k) => D.mast(g, sx, sy, k, null, world, e)); return; }
  if (e.type === 'rope') { if (!e.dead) m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { px.rect(g, sx - 2 * k, sy - 10 * k, 4 * k, 12 * k, '#c8a870'); px.rect(g, sx - 3 * k, sy - 4 * k, 6 * k, 2 * k, '#8a6a44'); }); return; }
  if (e.type === 'cell') return;
  if (e.dead && !T.keep) { if ((e.deadT || 0) > .05) return; }
  const turn = e.type === 'sandbags' || e.type === 'fuelTank' ? Math.PI / 2 : 0, f = (e.facing || 0) + turn;
  if (e.dead || T.charred) { m7.add(e.x, e.y, e.z, (g, sx, sy, k) => { const v = m7.view(k * (T.size || 1)); const spr = E.shapeSprite && E.shapeSprite(T.shape, { view: v, facing: Math.round(f / Math.PI * 8) / 8 * Math.PI }); if (spr) { g.filter = 'brightness(0.3) saturate(0.3)'; g.drawImage(spr.cv, Math.round(sx - spr.foot[0]), Math.round(sy - spr.foot[1])); g.filter = 'none'; } }); }
  else if (T.shape) m7.shape(T.shape, e.x, e.y, e.z, { facing: f, size: T.size || 1, params: e.o.len ? { len: e.o.len } : undefined });
  if (e.type === 'sandbags' && !e.dead && e.hp < e.max * .6) m7.add(e.x, e.y - 1, e.z, (g, sx, sy, k) => { for (let i = 0; i < 4; i++) px.rect(g, sx + (i * 13 % 40 - 20) * k, sy - (6 + i * 3) * k, 3 * k, 2 * k, '#3a3020'); });
  if (e.type === 'searchlight' && !e.dead && e.beam) { const bm = e.beam; m7.add(bm[0], bm[1], 0, (g, sx, sy, k) => px.blend(g, .35, 'add', () => px.ell(g, sx, sy, 40 * k, 12 * k, '#fff8d0'))); m7.add(e.x, e.y + 1, e.z, (g, sx, sy, k) => { const p2 = m7.project(bm[0], bm[1], 0); if (!p2) return; px.blend(g, .16, 'add', () => px.poly(g, [[sx - 3, sy - 4], [sx + 3, sy - 4], [p2[0] + 40 * p2[2], p2[1]], [p2[0] - 40 * p2[2], p2[1]]], '#fff8d0')); px.blend(g, 1, 'add', () => px.disc(g, sx, sy - 5 * k, Math.max(2, 4 * k), '#ffffff')); }); }
};
R.drawBoss = (m7, world, e) => {
  const blink = (R.t * 3 % 1) < .5, Tn = e.type;
  const partDraw = (p, fn) => { const w = WP.wp(e, p.off); m7.add(w[0], w[1] + 2, w[2], (g, sx, sy, k) => { fn(g, sx, sy, k, p); if (!p.dead && p.phase === e.phase && blink) { const rr = Math.max(4, p.r * k); px.blend(g, .8, 'add', () => { for (let a = 0; a < 16; a++) { const t = a / 16 * 6.283; px.rect(g, Math.round(sx + Math.cos(t) * rr), Math.round(sy + Math.sin(t) * rr), 1, 1, '#ffffff'); } }); } }); };
  const drawShape = (sh, off, sz) => { const w = off ? WP.wp(e, off) : [e.x, e.y, e.z]; if (e.dead) m7.add(w[0], w[1], w[2], (g, sx, sy, k) => { const spr = E.shapeSprite && E.shapeSprite(sh, { view: m7.view(k), facing: Math.round(e.facing / Math.PI * 8) / 8 * Math.PI }); if (spr) { g.filter = 'brightness(0.3)'; g.drawImage(spr.cv, Math.round(sx - spr.foot[0]), Math.round(sy - spr.foot[1])); g.filter = 'none'; } }); else m7.shape(sh, w[0], w[1], w[2], { facing: e.facing, size: sz || 1 }); };
  const rigAt = (key, off) => { const r = R.vrig.get(e.id + ':' + key); if (!r) return; const w = WP.wp(e, off); m7.add(w[0], w[1] + 1, w[2] - 12, (g, sx, sy, k) => r.draw(g, Math.round(sx), Math.round(sy), m7.view(k))); };
  const disc = (c, rad) => (g, sx, sy, k, p) => { const T1 = tone(p.dead ? '#2a2622' : c), rr = Math.max(2, rad * k); px.disc(g, sx, sy, rr, T1.base); px.disc(g, sx - rr * .3, sy - rr * .3, rr * .5, T1.lt); };
  if (Tn === 'ironHog') { drawShape('trainCar', [-62, 0, 0]); drawShape('trainCar', [-120, 0, 0]); drawShape('trainCar', [-178, 0, 0]); }
  if (Tn === 'tuskTower') { R.drawTower(m7, world, e); }
  else drawShape(e.T.shape);
  if (e.T.shape === 'hyenaOne') R.rotor(m7, e, [0, 6, 40], 60, 1);
  for (const p of e.parts) {
    if (p.dead && (p.id === 'gunL' || p.id === 'gunR' || p.id === 'door' || p.id === 'kragg' || p.id === 'snarl')) continue;
    if (p.id === 'dish') partDraw(p, (g, sx, sy, k) => { if (p.dead) { px.rect(g, sx - 4 * k, sy, 8 * k, 4 * k, '#2a2622'); return; } const a = R.t * 1.2, w = Math.abs(Math.cos(a)) * 18 * k + 3 * k; px.ell(g, sx, sy, w, 12 * k, '#d8d8d0'); px.ell(g, sx + (Math.cos(a) > 0 ? -2 : 2) * k, sy, w * .7, 8 * k, '#a8a8a0'); px.rect(g, sx - k, sy - 14 * k, 2 * k, 10 * k, '#6a6a70'); });
    else if (p.id === 'gunL' || p.id === 'gunR' || p.id === 'door' || p.id === 'snarl') { rigAt(p.id, [p.off[0], p.off[1], p.off[2] - 2]); partDraw(p, () => {}); }
    else if (p.id === 'kragg') { rigAt('kragg', p.off); partDraw(p, () => {}); }
    else if (p.id === 'tankL' || p.id === 'tankR') partDraw(p, (g, sx, sy, k) => { const T1 = tone(p.dead ? '#2a2622' : '#c0302a'); px.rect(g, sx - 9 * k, sy - 6 * k, 18 * k, 12 * k, T1.base); px.rect(g, sx - 9 * k, sy - 6 * k, 18 * k, 3 * k, T1.lt); if (e.flame && ((e.flame.side < 0) === (p.id === 'tankL'))) px.blend(g, .7, 'add', () => px.disc(g, sx, sy, (8 + Math.sin(R.t * 30) * 2) * k, '#ff8030')); });
    else if (p.id === 'boiler') partDraw(p, (g, sx, sy, k) => { if (e.vent) px.blend(g, .8, 'add', () => { for (let i = 0; i < 3; i++) px.disc(g, sx + (i - 1) * 8 * k, sy - 8 * k, 4 * k, R.t * 10 % 1 < .5 ? '#ffffff' : '#ff8040'); }); });
    else if (p.id === 'rotor' || p.id === 'cab' || p.id === 'hull' || p.id === 'bridge' || p.id.startsWith('leg') || p.id === 'tusk') partDraw(p, () => {});
    else if (p.id === 'sl1' || p.id === 'sl2') partDraw(p, (g, sx, sy, k) => { if (!p.dead) px.blend(g, 1, 'add', () => px.disc(g, sx, sy, Math.max(2, 5 * k), '#ffffe0')); });
    else partDraw(p, (g, sx, sy, k) => { disc(p.id.includes('turret') || p.id === 'mg' ? '#6a6a62' : p.id.startsWith('pod') ? '#4e5a32' : p.id === 'nose' ? '#5a5a52' : '#7a6a4a', p.r * .9)(g, sx, sy, k, p); if (!p.dead && (p.id.includes('turret') || p.id === 'nose' || p.id === 'cannon')) px.rect(g, sx - k, sy, 2 * k, 10 * k, '#3a3a3a'); });
  }
  if (e.tele && e.tele.kind === 'glow') { const u = 1 - e.tele.t / e.tele.max, part = e.parts.find(p => (p.id === 'cannon' || p.id === 'nose') && !p.dead) || e.parts[0]; const w = WP.wp(e, part.off); m7.add(w[0], w[1] + 3, w[2], (g, sx, sy, k) => px.blend(g, .5 + u * .5, 'add', () => px.disc(g, sx, sy, Math.max(3, (3 + u * 7) * k), u > .7 ? '#ffffff' : '#ffb040'))); }
  if (Tn === 'tuskTower' && e.phase === 1 && e.tusk) { const r = R.vrig.get(e.id + ':tusk'), t = e.tusk; if (r) m7.add(t.x, t.y, 0, (g, sx, sy, k) => { r.draw(g, Math.round(sx), Math.round(sy), m7.view(k)); if (!(t.shieldDown > 0 || t.knocked > 0)) { const T1 = tone('#5a5a62'); px.rect(g, sx - 12 * k, sy - 40 * k, 24 * k, 34 * k, T1.base); px.rect(g, sx - 12 * k, sy - 40 * k, 24 * k, 4 * k, T1.lt); px.rect(g, sx - 6 * k, sy - 30 * k, 12 * k, 3 * k, '#8ab0c8'); } }); }
};
R.drawTower = (m7, world, e) => {
  m7.add(e.x, e.y, 0, (g, sx, sy, k) => {
    const fall = e.towerDown ? Math.min(1, (e.phaseT || (e.phaseT = 0)) + 0) : 0;
    if (e.phase >= 1) { px.poly(g, [[sx - 40 * k, sy], [sx - 20 * k, sy - 14 * k], [sx + 30 * k, sy - 10 * k], [sx + 50 * k, sy]], '#2a2420'); return; }
    const C = '#6a5038'; for (const s of [-22, 22, 0]) px.line(g, sx + s * k, sy, sx + s * .5 * k, sy - 78 * k, C, Math.max(1, 3 * k));
    px.rect(g, sx - 24 * k, sy - 98 * k, 48 * k, 22 * k, '#7a5a3a'); px.rect(g, sx - 20 * k, sy - 94 * k, 40 * k, 8 * k, '#141418'); px.poly(g, [[sx - 28 * k, sy - 98 * k], [sx, sy - 112 * k], [sx + 28 * k, sy - 98 * k]], '#5a5a62');
  });
};
// ---------------------------------------------------------------------------------------------- screen FX
R.screenFx = (g, world) => {
  const st = world.stage;
  // the time of day's grade
  const gr = st.grade; if (gr) px.blend(g, gr[1] * 2, 'multiply', () => px.rect(g, 0, 0, WP.W, WP.PLAY_H, gr[0]));
  // night: a darkness mask with light holes (flare, fires, searchlights, muzzle flashes)
  if (st.dark && world.part !== 'B') {
    const dark = world.flare > 0 ? st.dark * .25 : st.dark;
    const c = R.darkCv || (R.darkCv = E.mkCanvas(WP.W, WP.PLAY_H)); const dg = c.getContext && c.getContext('2d');
    if (dg) {
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, WP.W, WP.PLAY_H); dg.fillStyle = 'rgba(4,8,20,' + dark.toFixed(2) + ')'; dg.fillRect(0, 0, WP.W, WP.PLAY_H);
      dg.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { for (let i = 4; i >= 1; i--) { dg.globalAlpha = a * (1 - i / 5); dg.beginPath(); dg.ellipse(Math.round(x), Math.round(y), r * i / 4, r * i / 4 * .6, 0, 0, 6.283); dg.fill(); } dg.globalAlpha = 1; };
      dg.fillStyle = '#000';
      for (const e of world.ents) {
        if (e.type === 'searchlight' && !e.dead && e.beam) { const p = world.view.project(e.beam[0], e.beam[1], 0); if (p) hole(p[0], p[1], 50 * p[2] + 6, .9); }
        if ((e.firing > 0 || e.kind === 'pickup' || (e.kind === 'projectile' && e.T.glow)) && !e.dead) { const p = world.view.project(e.x, e.y, e.z + 20); if (p) hole(p[0], p[1], 30 * p[2] + 8, .7); }
        if (e.T && e.T.marked && world.flare > 0) { const p = world.view.project(e.x, e.y, e.z + 20); if (p) hole(p[0], p[1], 40 * p[2] + 10, 1); }
      }
      for (const p of R.fx) if (p.kind === 'fire' || p.kind === 'flash') { const q = world.view.project(p.x, p.y, p.z); if (q) hole(q[0], q[1], p.size * q[2] * 3 + 8, .9); }
      for (const s of st.scenery) if (s.id === 'fireDrum' || s.id === 'floodlight') { const q = world.view.project(st.ox + s.x, st.oy + s.y, s.id === 'floodlight' ? 0 : 16); if (q && q[0] > -60 && q[0] < WP.W + 60) hole(q[0], q[1] - (s.id === 'floodlight' ? 0 : 10 * q[2]), (s.id === 'floodlight' ? 70 : 50) * q[2] + 8, .8); }
      for (const p of world.players) if (!p.down) hole(p.x, p.y, 26, .5);
      g.drawImage(c, 0, 0);
    }
  }
  // rain
  if (st.rain) { const n = world.part === 'B' ? 60 : 110; for (let i = 0; i < n; i++) { const x = (i * 97 + R.t * 520 + (i * i) % 37) % (WP.W + 40) - 20, y = (i * 53 + R.t * 700 * (1 + (i % 3) * .2)) % WP.PLAY_H; px.line(g, x, y, x - 3 - (st.wind || 0) * 7, y + 8, i % 4 ? '#8a9ab8' : '#c8d8f0'); } if (Math.sin(R.t * .7) > .997 || R.thunder > 0) { R.thunder = (R.thunder || .15) - 1 / 60; px.blend(g, .4, 'add', () => px.rect(g, 0, 0, WP.W, WP.PLAY_H, '#c8d0ff')); } }
};
// telegraph rings, glints, landing markers, threat arrows, friendly markers, marks for snipers
R.overlays = (g, world, localPid) => {
  const v = world.view;
  for (const e of world.ents) {
    if (e.dead || e.gone || e.hidden) continue;
    const tl = e.tele;
    if (tl && (tl.kind === 'ring' || tl.kind === 'glint' || tl.kind === 'throw' || tl.kind === 'glow')) {
      let pt = v.project(e.x, e.y, e.z + (e.T.h || 24) * .72);
      if (e.type === 'tuskTower' && e.phase === 1 && e.tusk) pt = v.project(e.tusk.x, e.tusk.y, 30);
      else if (e.kind === 'boss' && e.parts) { const p = e.parts.find(q => !q.dead && q.phase === e.phase) || e.parts[0]; const w = WP.wp(e, p.off); pt = v.project(w[0], w[1], w[2]); }
      if (!pt) continue;
      const u = clamp(tl.t / tl.max, 0, 1), col = WP.SEAT[(world.players.find(p => p.pid === tl.pid) || { seat: 0 }).seat] || '#ffffff';
      const x = clamp(pt[0], 8, WP.W - 8), y = clamp(pt[1], 8, WP.PLAY_H - 8);
      if (tl.kind === 'glint') { const s = 3 + (1 - u) * 6 + Math.sin(R.t * 30) * 1.5; px.blend(g, 1, 'add', () => { px.line(g, x - s, y, x + s, y, '#ffffff'); px.line(g, x, y - s, x, y + s, '#ffffff'); px.disc(g, x, y, 2, '#ffffc0'); }); }
      if (tl.kind === 'ring' || tl.kind === 'glint' || tl.kind === 'glow') {
        const rr = 6 + 16 * u, c2 = u > .66 ? '#ffe040' : u > .33 ? '#ff9020' : '#ff3020';
        for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; const ox = Math.cos(t) * rr, oy = Math.sin(t) * rr; px.rect(g, Math.round(x + ox), Math.round(y + oy), 2, 2, a % 2 ? c2 : col); }
        const sw = (1 - u) * 6.283; for (let a = 0; a < 20; a++) { const t = -Math.PI / 2 + sw * a / 20; px.rect(g, Math.round(x + Math.cos(t) * (rr + 3)), Math.round(y + Math.sin(t) * (rr + 3)), 1, 1, '#ffffff'); }
      }
    }
    if (e.kind === 'projectile' && e.type === 'shell') { const p = v.project(e.x, e.y, e.z); if (p) { const x = clamp(p[0], 6, WP.W - 6); px.poly(g, [[x - 5, 16], [x + 5, 16], [x, 23]], (R.t * 6 % 1) < .5 ? '#ff3030' : '#ffffff'); } }
    // threat arrows: telegraphing attackers off screen
    if (tl) { const p = v.project(e.x, e.y, e.z + 20); if (!p || p[0] < 0 || p[0] > WP.W) { const lx = WP.worldToCam(world.cam, e.x, e.y)[0]; const x = lx < 0 ? 6 : WP.W - 6; const y = clamp(p ? p[1] : 120, 30, WP.PLAY_H - 20); px.poly(g, lx < 0 ? [[x - 4, y], [x + 4, y - 6], [x + 4, y + 6]] : [[x + 4, y], [x - 4, y - 6], [x - 4, y + 6]], (R.t * 6 % 1) < .5 ? '#ff3030' : '#ffb040'); } }
    // friendly markers near crosshairs
    if ((e.kind === 'civilian' || e.kind === 'hostage') && WP.settings('markers')) { const p = v.project(e.x, e.y, e.z + (e.T.h || 30) + 8); if (p && world.players.some(q => !q.down && Math.hypot(q.x - p[0], q.y - p[1] - 20) < 46)) px.poly(g, [[p[0] - 4, p[1] - 6], [p[0] + 4, p[1] - 6], [p[0], p[1]]], '#40e060'); }
  }
  // tracers, hit markers, floating scores, damage arcs
  for (const t of R.tracers) { const c = t.fury ? '#ffe040' : t.enemy ? '#ffb070' : '#fff4c0'; px.line(g, t.x0, t.y0, t.x1, t.y1, c, t.enemy ? 1 : 1); }
  for (const h of R.hitm) { const s = h.head ? 5 : 3, c = h.head ? '#ff4040' : '#ffffff'; px.line(g, h.x - s, h.y - s, h.x - 1, h.y - 1, c); px.line(g, h.x + s, h.y - s, h.x + 1, h.y - 1, c); px.line(g, h.x - s, h.y + s, h.x - 1, h.y + 1, c); px.line(g, h.x + s, h.y + s, h.x + 1, h.y + 1, c); if (h.head && h.life > .3) E.font.text(g, WP.TEXT.hud.headshot, Math.round(h.x), Math.round(h.y - 14), '#ff6040', { outline: '#000', align: 'center', font: 'tiny' }); }
  for (const f of R.floats) { const p = v.project(f.x, f.y, f.z + (1 - f.life) * 20); if (p) E.font.text(g, f.text, Math.round(p[0]), Math.round(p[1]), f.color || '#ffe080', { outline: '#000', align: 'center', font: f.big ? undefined : 'tiny' }); }
  for (const a of R.arcs) { if (localPid !== undefined && a.pid !== localPid) continue; const al = a.life / .6, x = a.side < 0 ? 0 : a.side > 0 ? WP.W - 10 : WP.W / 2 - 60; px.blend(g, .7 * al, 'add', () => { if (a.side) px.rect(g, x, 30, 10, WP.PLAY_H - 60, '#ff2020'); else px.rect(g, x, WP.PLAY_H - 8, 120, 8, '#ff2020'); }); }
};
// ---------------------------------------------------------------------------------------------- the first-person SMG
// the WOLF-9 from behind: a pixel-art model in local units (x right, y up the screen from the grip), drawn with px.poly
R.drawGun = (g, p, i, small) => {
  if (p.down) return;
  const sc = small ? .7 : 1.15, base = WP.PLAY_H + 6;
  R.gunX[i] = R.gunX[i] + (p.x - R.gunX[i]) * .2;
  const gx = small ? R.gunX[i] : WP.W * .5 + (R.gunX[i] - WP.W * .5) * .55 + 40;
  const ang = clamp(Math.atan2(p.x - gx, base - p.y) * .6, -.45, .45), rec = R.recoil[i], rl = p.reload > 0 ? 1 - p.reload / WP.T.reloadTime : 1;
  const dip = p.reload > 0 ? Math.sin(rl * Math.PI) * 22 : 0, lift = (base - p.y) * .06;
  const ca = Math.cos(ang), sa = Math.sin(ang), Pt = (x, y) => [gx + (x * ca + y * sa) * sc, base + dip - lift + rec * 3 + (x * sa - y * ca) * sc];
  const Q = (pts, c) => px.poly(g, pts.map(q => Pt(q[0], q[1])), c);
  const fury = p.fury > 0, B = fury ? E.tones('#c8962a') : E.tones('#3a3e44'), M = E.tones('#4e5a32'), SK = E.tones('#c89a74'), SL = E.tones('#4a5a3a');
  // sleeves and hands
  Q([[-34, -6], [-20, 30], [-8, 26], [-14, 6], [-22, -10]], SL.sh); Q([[30, -12], [22, 26], [38, 30], [44, -6]], SL.base);
  // the stock, the receiver, the barrel shroud, the muzzle
  Q([[-6, -4], [6, -4], [8, 18], [-8, 18]], B.sh);
  Q([[-9, 16], [9, 16], [8, 52], [-8, 52]], B.base); Q([[-9, 16], [-4, 16], [-4, 52], [-8, 52]], B.lt); Q([[4, 18], [9, 18], [8, 52], [4, 52]], B.deep);
  Q([[-6, 52], [6, 52], [5, 74], [-5, 74]], B.sh); for (let k = 0; k < 4; k++) Q([[-4, 56 + k * 4], [4, 56 + k * 4], [4, 57 + k * 4], [-4, 57 + k * 4]], B.deep);
  Q([[-3, 74], [3, 74], [3, 80], [-3, 80]], '#141618');
  Q([[-2, 40], [2, 40], [2, 48], [-2, 48]], B.hi);   // the rear sight
  Q([[-1, 74], [1, 74], [1, 79], [-1, 79]], fury ? '#fff0a0' : '#8a9098');   // the front sight
  // the magazine (out and back in on a reload)
  const md = p.reload > 0 ? (rl < .4 ? rl / .4 : rl < .8 ? 1 - (rl - .4) / .4 : 0) * -30 : 0;
  Q([[10, 30 + md], [20, 26 + md], [24, 2 + md], [14, 4 + md]], M.base); Q([[10, 30 + md], [13, 29 + md], [17, 5 + md], [14, 4 + md]], M.lt);
  // the hands on the grip and the shroud
  Q([[-12, 4], [-2, 4], [-1, 18], [-12, 16]], SK.base); Q([[-12, 4], [-8, 4], [-8, 16], [-12, 16]], SK.sh);
  Q([[6, 54], [16, 50], [16, 62], [6, 64]], SK.base); Q([[12, 50], [16, 50], [16, 62], [12, 62]], SK.sh);
  if (fury) px.blend(g, .3 + .2 * Math.sin(R.t * 20), 'add', () => Q([[-12, 14], [12, 14], [8, 80], [-8, 80]], '#ffe060'));
  if (R.flashP && R.flashP[i] > 0) { const m = Pt(0, 84); px.blend(g, 1, 'add', () => { px.disc(g, m[0], m[1], 6 * sc, '#fff8d0'); px.poly(g, [[m[0] - 11 * sc, m[1] + 2], [m[0], m[1] - 16 * sc], [m[0] + 11 * sc, m[1] + 2], [m[0], m[1] + 5]], '#ffc040'); px.disc(g, m[0], m[1], 3 * sc, '#ffffff'); }); }
  if (R.throwAnim[i] > 0) { const u = 1 - R.throwAnim[i] / .4, hx = WP.W * .22 + u * 70, hy = WP.PLAY_H - Math.sin(u * Math.PI) * 70; px.disc(g, hx, hy, 8, SK.base); px.disc(g, hx - 2, hy - 2, 4, SK.lt); px.sprite(g, WP.SPR.grenade, Math.round(hx - 3), Math.round(hy - 14)); }
  R.muzzle = R.muzzle || []; R.muzzle[i] = Pt(0, 82);
};
R.drawCasings = g => { for (const c of R.casings) px.rect(g, Math.round(c.x), Math.round(c.y), 2, 1, '#e0b040'); };
R.marks = e => !!(WP.run && WP.run.perks && WP.run.perks.camp) && e.t < 1.5 && !WP.Play.attract;   // CAMP LOCATED: snipers and mortars marked red at first
WP.settings = k => { const g = WP.game; return g && g.settings ? g.settings[k] : k === 'markers' || k === 'showGun'; };
})();
