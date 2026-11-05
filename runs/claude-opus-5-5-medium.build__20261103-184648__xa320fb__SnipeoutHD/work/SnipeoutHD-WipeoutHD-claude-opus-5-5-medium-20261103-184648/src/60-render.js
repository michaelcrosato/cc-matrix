// Rendering (§3.6, §3.7): a World3D per track (terrain carved round the track, the theme's sky, sun and fog, the track's
// meshes, scenery, weather), craft visuals interpolated between steps, the cameras (chase, far chase, cockpit, look back,
// the TV director's trackside shots, free fly) and the weapon effects drawn with the world's pen each frame
(() => {
const SN = globalThis.SN, E = My3D2dge, V = SN.V;
const M = 1 / 16, ZUP = [0, 0, 1];
SN.cam = { rollSign: -1 };   // (World3D rolls the camera with rotateZ: a positive angle tilts its up to the left)
const CAMS = ['chase', 'far', 'cockpit'];
SN.CAMS = CAMS; SN.CAM_NAMES = { chase: 'CHASE', far: 'FAR CHASE', cockpit: 'COCKPIT', tv: 'TV', heli: 'HELI', free: 'FREE CAMERA' };

class View {
  /** a track world (skin 'overclock': the neon-grid world) */
  constructor(game, trackId, skin = 'normal') {
    this.game = game; this.T = SN.getTrack(trackId); this.skin = skin;
    const themeId = this.themeId = skin === 'overclock' ? 'overclock' : this.T.def.theme, th = this.theme = SN.THEMES[themeId];
    this.crafts = new Map(); this.trails = new Map(); this.ghostVis = []; this.race = null; this.fxT = 0; this.flash = 0;
    this.cams = [new Cam(this, 0), new Cam(this, 1)];
    if (!SN.has3D()) { this.world = null; this.spots = this.cameraSpots(); return; }
    const terr = SN.Scenery.terrainFor(this.T, themeId), st = game.settings || {};
    this.height = terr.height;
    const rock = { desert: { colors: ['#b85a30', '#d8884a', '#8a3a20', '#e8b070'], band: 48 }, arctic: { colors: ['#3a4250', '#4a5260', '#2a3038', '#5a6474'], band: 64 }, coast: { colors: ['#8a7a68', '#9a8a74', '#7a6a58', '#a89880'], band: 40 } }[themeId];
    const T = this.T;
    this.world = new E.World3D(game, {
      terrain: { size: 65536, height: terr.height, color: terr.color, far: 26000, cell: 64, rock, bottom: -3000, speckle: themeId === 'overclock' ? 0 : undefined, mottle: themeId === 'overclock' ? 0 : undefined },
      sky: th.sky, fog: th.fog, ambient: th.ambient, sun: Object.assign({ shadow: true, area: 900 }, th.sun),
      torchLights: 0, lights: 4, glowLights: 8, shadows: st.shadows3d !== false, res: st.picture3d || 'pixels',
      filter: { look: st.filter3d || 'clean', bloom: st.bloom !== false },
      camera: { mode: 'fixed', far: 26000, near: 4 }, particleGround: (x, y, z) => T.groundBelow(x, y, z),
      onDraw: (w, r) => this.onDraw(w, r)
    });
    const w = this.world;
    this.trackMesh = SN.TrackMesh.build(w, T, themeId, { height: terr.height });
    this.scen = themeId === 'overclock' ? { anim: [] } : SN.Scenery.scenery(w, T, themeId, terr.height);
    this.weather = SN.Scenery.weather(w, th.weather);
    this.mats = SN.ShipKit.materials(); for (const k in this.mats) w._own(this.mats[k]);
    this.lights = [0, 1, 2, 3].map(() => w.light({ reach: 400, power: 0 }));
    this.spots = this.cameraSpots();
    // warm up: every craft design once (and the ghost material), then build the shaders
    for (const t of SN.TEAMS) this.craft(t.id + ':warm', t.id);
    const gv = this.ghost('warm'); for (const v of this.crafts.values()) { v.group.visible = true; SN.ShipKit.poseCraft(v, T.point(0, 0, 40), [1, 0, 0], [0, 0, 1]); }
    w.camera.fixed = { x: T.C[0] - 400, y: T.C[1], z: T.C[2] + 200, yaw: 0, pitch: -.3, roll: 0, fov: 70 };
    w.prepare();
    for (const v of this.crafts.values()) v.group.visible = false; gv.group.visible = false;
  }
  /** a craft visual for a key (a race slot), built once per team and reused */
  craft(key, team, o = {}) {
    let v = this.crafts.get(key);
    if (!v || v.team !== team || !!v.champion !== !!o.champion) { if (v) this.world.scene.remove(v.group); v = SN.ShipKit.makeCraft(this.world, team, this.mats, o); v.champion = !!o.champion; this.world.scene.add(v.group); this.crafts.set(key, v); }
    return v;
  }
  ghost(key, color = '#aaffff', team = 'kestrel') {
    const k = 'ghost:' + key; let v = this.crafts.get(k);
    if (!v) { v = SN.ShipKit.makeCraft(this.world, team, this.mats, { ghost: true, ghostColor: color }); this.world.scene.add(v.group); this.crafts.set(k, v); }
    v.glowMat.color.set(color); return v;
  }
  /** attach a race: each ship gets its visual */
  bind(race) {
    this.race = race; this.trails.clear();
    if (!this.world) return;
    for (const v of this.crafts.values()) v.group.visible = false;
    for (const sh of race.ships) { sh.vis = this.craft('slot' + sh.i, sh.team, { champion: sh.control === 'human' && SN.save && SN.save.data.unlocked.champion && SN.save.data.livery === 'champion' }); sh.vis.group.visible = true; }
    for (const c of this.cams) c.reset(race);
  }
  /** camera spots for the TV director, every ~200 m on the outside of curves */
  cameraSpots() {
    const T = this.T, out = [], h = this.height || (() => -1e9);
    for (let s = 0, k = 0; s < T.L; s += 180 * 16, k++) {
      const i = T.idx(s); if (T.kind[i] === 1) continue;
      const kap = T.kappa[i], side = Math.abs(kap) > 1 / (300 * 16) ? -Math.sign(kap) : (k % 2 ? 1 : -1), tun = T.flags[i] & 1;
      const off = tun ? T.hw[i] - 4 * 16 : T.hw[i] + (15 + (k * 7) % 15) * 16, up = tun ? 9 * 16 : (6 + (k * 5) % 14) * 16;
      const p = T.point(s, side * off, 0); p[2] += up;
      if (!tun && h(p[0], p[1]) > p[2] - 8) p[2] = h(p[0], p[1]) + 4 * 16;
      out.push({ s, x: p[0], y: p[1], z: p[2], tun: !!tun });
    }
    return out;
  }
  /** the step: cameras for each viewport, weather */
  step(dt) {
    if (!this.world) { for (const c of this.cams) if (c.race) c.step(dt); return; }
    for (let k = 0; k < this.world.cameras.length; k++) { const c = this.cams[k]; if (!c) continue; const pose = c.step(dt); if (pose) this.world.cameras[k].fixed = pose; if (c.cutNow) { this.world.cameras[k]._cutting = true; c.cutNow = false; } }
    this.world.step(dt);
    this.fxT += dt;
  }
  /** every frame, before the camera is placed: craft poses part way between steps, effects with the pen, lights */
  onDraw(w, r) {
    const R = this.race, g = this.game, a = g.paused ? 1 : Math.max(0, Math.min(1, g.alpha)), t = g.real || 0, pen = w.pen, th = this.theme;
    const tm = this.trackMesh, mats = tm.mats;
    // pads pulse (speed pads front to back), weapon pads glow, start lights, the overclock grid's colour
    mats.pad.forEach((m, k) => m.color.setHSL(.54, 1, .35 + .35 * Math.max(0, Math.sin(t * 12 - k * 1.6))));
    mats.wpad.color.setHSL(.11, 1, .4 + .15 * Math.sin(t * 6));
    if (tm.startLights && R) { const n = R.state === 'countdown' ? 3 - Math.max(0, Math.ceil(-R.t)) : 0, go = R.state === 'racing' && R.t < 3; tm.startLights.forEach((m, k) => m.material.color.set(go ? '#3aff6a' : k < n ? '#ff2a2a' : '#300808')); }
    if (tm.gridMeshes) { const z = R ? R.zone || 1 : 1, beat = SN.audio ? SN.audio.beat() : 0; mats.grid.color.setHSL(((z * 37) % 360) / 360, 1, .5 + beat * .15); if (w._skyDome === undefined && w.scene.background) w.scene.background.setHSL(((z * 37) % 360) / 360, 1, .03 + beat * .04); }
    if (tm.timing && R && (t - (this._tb || 0)) > .25) { this._tb = t; const gg = tm.timing.g; gg.fillStyle = '#0a0a12'; gg.fillRect(0, 0, 256, 64); E.font.text(gg, R.state === 'intro' || R.state === 'grid' ? 'SNIPEOUT HD' : SN.fmtTime(Math.max(0, R.t)), 128, 8, '#ffffff', { scale: 3, align: 'center', outline: false }); E.font.text(gg, this.T.name, 128, 40, th.neon, { scale: 2, align: 'center', outline: false }); tm.timing.needsUpdate = true; }
    for (const f of this.scen.anim) f(t);
    w.filter.bloom = g.settings.bloom !== false || this.skin === 'overclock';
    if (!R) return;
    // craft
    const P = [0, 0, 0], F = [0, 0, 0], Uv = [0, 0, 0];
    const cockpitOf = this.cams.filter((c, k) => k < w.cameras.length && c.mode === 'cockpit' && !c.tv).map(c => c.ship);
    for (const sh of R.ships) {
      const v = sh.vis; if (!v) continue;
      V.lerp(sh.prevP, sh.P, a, P); V.norm(V.lerp(sh.prevF, sh.F, a, F)); V.norm(V.lerp(sh.prevU, sh.U, a, Uv));
      const show = !sh.elim && !(cockpitOf.includes(sh) && w.cameras.length === 1) && !(sh.invT > 0 && Math.floor(t * 12) % 2);
      v.group.visible = show; if (!show) continue;
      const roll = sh.prevRoll + (sh.visRoll - sh.prevRoll) * a;
      SN.ShipKit.poseCraft(v, P, F, Uv, roll);
      v.flaps[0].rotation.z = sh.brakeLS * 1.0; v.flaps[1].rotation.z = sh.brakeRS * 1.0;
      const boost = sh.boostT > 0 || sh.nitroT > 0, thr = sh.thrustOn;
      v.glowMat.color.set(boost ? '#ffffff' : SN.TEAM[sh.team].colors[3]); for (const d of v.discs) d.scale.setScalar(.6 + .4 * thr + (boost ? .3 : 0));
      v.shellMat.opacity = sh.shieldT > 0 ? .35 + .15 * Math.sin(t * 20) : sh.hitFlash > 0 ? sh.hitFlash * 2 : 0; v.shellMat.color.set(sh.shieldT > 0 ? '#4a8aff' : '#bff0ff');
      // exhaust trail, boost flame, autopilot ring, damage smoke
      const tr = this.trails.get(sh) || []; this.trails.set(sh, tr);
      const tail = [P[0] - F[0] * 52 + Uv[0] * 7, P[1] - F[1] * 52 + Uv[1] * 7, P[2] - F[2] * 52 + Uv[2] * 7];
      if (!tr.length || V.dist(tr[tr.length - 1], tail) > 8) { tr.push(tail); if (tr.length > 9) tr.shift(); }
      pen.at();
      const ec = SN.TEAM[sh.team].colors[3];
      for (let k = 0; k < tr.length; k++) { const q = tr[k], f = (k + 1) / tr.length; if (V.dist(q, P) > 90) continue; pen.glow(q[0], q[1], q[2], (.6 + 1.8 * f) * (boost ? 1.5 : 1) * (.5 + .5 * thr), boost ? '#ffffff' : ec); }
      if (boost) pen.glow(tail[0] - F[0] * 10, tail[1] - F[1] * 10, tail[2] - F[2] * 10, 8 + Math.sin(t * 40) * 2, sh.nitroT > 0 ? '#ffb000' : '#bff8ff');
      if (sh.autoT > 0) for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2 + t * 4, R2 = V.cross(Uv, F, [0, 0, 0]); pen.glow(P[0] + R2[0] * Math.cos(an) * 40 + F[0] * Math.sin(an) * 40, P[1] + R2[1] * Math.cos(an) * 40 + F[1] * Math.sin(an) * 40, P[2] + 10, 2.4, '#3ae8d0'); }
      if (sh.energy < 25 && !sh.elim && Math.random() < .3) g.particles.smoke(P[0], P[1], P[2] + 8, 1, { size: .6, color: '#3a3a40' });
      if (sh.inPit && Math.random() < .3) g.particles.glints(P[0], P[1], P[2] + 6, 1, '#5aff9a');
      if (sh.rescueT > 0) { pen.ball(P[0], P[1], P[2] + 60, 14, 14, 5, '#e0e0e8'); for (const s2 of [-1, 1]) for (const s3 of [-1, 1]) pen.glow(P[0] + s2 * 18, P[1] + s3 * 18, P[2] + 64, 4, '#ff3a3a'); pen.cone(P[0], P[1], P[2], P[0], P[1], P[2] + 56, 26, '#ffe8a0'); }
    }
    this.fx(pen, a, t);
    if (this.extraDraw) { pen.at(); this.extraDraw(pen); }
    if (SN.Dev && SN.Dev.overlay) { pen.at(); SN.Dev.draw3d(pen, R, this); }
    // ghosts (time trial, hub players)
    for (const gh of this.ghostVis) gh.vis.group.visible = false;
    if (this.ghostList) for (const gh of this.ghostList) {
      const v = gh.vis; if (!gh.pose) { v.group.visible = false; continue; }
      const q = gh.pose, T = this.T, f = T.frameAt(q.s); const Pp = T.point(q.s, q.u, q.h), Fv = V.norm(V.rot(V.copy(f.F), f.U, q.yaw)); v.group.visible = true; SN.ShipKit.poseCraft(v, Pp, Fv, f.U, q.roll || 0);
    }
    // the player's tunnel lights and explosion flashes
    const me = this.cams[0].ship;
    if (me) {
      const inT = this.T.inTunnel(me.s);
      this.lights.forEach((L, k) => { if (k < 3) { L.on = inT; if (inT) { const p = this.T.point(me.s + (k - 1) * 300, 0, 120); L.x = p[0]; L.y = p[1]; L.z = p[2]; L.color = this.trackMesh.tunnelLights[0] || th.neon; L.power = 30; L.reach = 500; } } });
    }
    const L4 = this.lights[3]; if (this.flash > 0) { L4.on = true; L4.power = 60 * this.flash; this.flash = Math.max(0, this.flash - .05); } else L4.on = false;
    if (this.weather) this.weather.update(w.camera.cam, 1 / 60);
  }
  flashAt(x, y, z, color = '#ffb070') { if (!this.world) return; const L = this.lights[3]; L.x = x; L.y = y; L.z = z + 40; L.color = color; L.reach = 900; this.flash = 1; }
  /** weapon effects with the pen */
  fx(pen, a, t) {
    const R = this.race, W = R.weapons, T = this.T, p = [0, 0, 0];
    pen.at();
    for (const q of W.proj) {
      T.point(q.s, q.u, 16, p);
      if (q.kind === 'swarm') { pen.glow(p[0], p[1], p[2], 5, '#ff4a4a'); const b = T.point(q.s - 40, q.u - q.vu * .02, 16); pen.tube(b[0], b[1], b[2], p[0], p[1], p[2], 1.5, '#ffb0a0'); }
      else if (q.kind === 'seeker') { pen.glow(p[0], p[1], p[2], 6, '#ff9a2a'); for (let k = 1; k < 6; k++) { const b = T.point(q.s - k * 30, q.u + Math.sin(t * 20 + k) * 8, 16 + Math.cos(t * 20 + k) * 8); pen.glow(b[0], b[1], b[2], 3 - k * .4, '#ffd0a0'); } }
      else { const b = T.point(q.s - 50, q.u, 16); pen.tube(b[0], b[1], b[2], p[0], p[1], p[2], 1.2, '#fff27a'); pen.glow(p[0], p[1], p[2], 3, '#ffe23a'); }
    }
    for (const m of W.mines) { T.point(m.s, m.u, 8, p); pen.ball(p[0], p[1], p[2], 6, 6, 6, '#5a1a4a'); pen.glow(p[0], p[1], p[2] + 6, m.armed && Math.floor(t * 4 + m.s) % 2 ? 3.5 : 1.5, '#ff3ad0'); for (let k = 0; k < 4; k++) { const an = m.spin * 3 + k * Math.PI / 2; pen.cone(p[0], p[1], p[2], p[0] + Math.cos(an) * 10, p[1] + Math.sin(an) * 10, p[2], 2, '#c83aa0'); } }
    for (const wv of W.waves) { const k = wv.life / .9; for (let u = -1; u <= 1.001; u += .125) { const fr = T.frameAt(wv.s); T.point(wv.s, u * fr.hw, 10 + Math.sin(u * 8 + t * 20) * 6, p); pen.glow(p[0], p[1], p[2], 7 * k + 2, '#5aff6a'); } }
    for (const b of W.beams) { const k = b.life / .4, A = T.point(b.s0, b.u0, 18), B = T.point(b.s1, b.u1, 18), mid = T.point(b.s0 + SN.wrapDiff(b.s0, b.s1, T.L) / 2, (b.u0 + b.u1) / 2, 30); pen.tube(A[0], A[1], A[2], mid[0], mid[1], mid[2], 3 * k + .5, '#ffffff'); pen.tube(mid[0], mid[1], mid[2], B[0], B[1], B[2], 3 * k + .5, '#bff8ff'); pen.glow(B[0], B[1], B[2], 18 * k, '#bff8ff'); }
    for (const sh of R.ships) {
      if (sh.siphonT > 0 && sh.siphonTo) { const A = sh.P, B = sh.siphonTo.P; for (let k = 0; k <= 10; k++) { const f = k / 10, zz = Math.sin(f * 20 + t * 30) * 10; pen.glow(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f + zz + 10, 3, '#b0ff3a'); } }
      if (sh.weapon === 'rail' && sh.charge > 0) { const fr = T.frameAt(sh.s), th = Math.atan2(V.dot(sh.F, fr.R), V.dot(sh.F, fr.F)), A = T.point(sh.s, sh.u, 18), B = T.point(sh.s + 4000, sh.u + 4000 * Math.tan(Math.max(-.5, Math.min(.5, th))), 18); pen.tube(A[0], A[1], A[2], B[0], B[1], B[2], .5, sh.charge >= .8 ? '#ff3a3a' : '#803030'); }
    }
  }
  setGhosts(list) {   // [{ key, color, team, pose }]
    this.ghostList = list; this.ghostVis = list; if (!this.world) return;
    for (const gh of list) gh.vis = this.ghost(gh.key, gh.color, gh.team);
  }
  dispose() { if (this.world) this.world.dispose(); this.world = null; }
}
SN.View = View;
SN.has3D = () => !!(E.World3D && E.World3D.renderer);

/** a camera for one viewport: follows a ship (chase, far, cockpit, look back) or directs (TV) */
class Cam {
  constructor(view, i) { this.view = view; this.i = i; this.mode = 'chase'; this.tv = false; this.Fs = [1, 0, 0]; this.Us = [0, 0, 1]; this.ship = null; this.shot = null; this.free = null; this.lookBack = false; }
  reset(race) { this.race = race; this.ship = race.humans[this.i] || race.ships[0]; this.Fs = V.copy(this.ship.F); this.Us = [0, 0, 1]; this.shot = null; this.cutNow = true; this.intro = 0; }
  set(mode) { this.mode = mode; this.cutNow = true; }
  /** the pose for this step */
  step(dt) {
    const R = this.race, sh = this.ship; if (!R || !sh) return null;
    if (this.free) return this.freePose(dt);
    if (R.state === 'intro') return this.introPose(dt);
    if (this.tv) return this.tvPose(dt);
    return this.follow(sh, dt, this.mode);
  }
  follow(sh, dt, mode) {
    const K = SN.Tune.T, v = Math.max(0, SN.Ship.fwdSpeed(sh)), top = sh.st.top, far = mode === 'far', P = sh.P;
    V.toward(this.Fs, sh.F, Math.min(1, K.camLag * dt)); const want = V.norm(V.lerp(ZUP, sh.U, .6, [0, 0, 0])); V.toward(this.Us, want, Math.min(1, K.camLag * dt * .8));
    const boost = sh.boostT > 0 || sh.nitroT > 0, fovB = K.camFov + K.camFovBoost * Math.min(1.4, (v / top) ** 2) + (boost ? 6 : 0);
    let eye, look, up = this.Us, fov = fovB;
    if (mode === 'cockpit' && !this.lookBack) {
      const fr = SN.frame(sh.F, sh.U, -sh.visRoll * .0); eye = V.addS(V.addS(V.copy(P), sh.F, 20), sh.U, 14); look = V.addS(V.addS(V.copy(P), sh.F, 400), sh.U, 14); up = V.norm(V.rot(V.copy(sh.U), sh.F, sh.visRoll)); fov = 84 + (boost ? 8 : 0) + K.camFovBoost * .5 * (v / top) ** 2;
    } else {
      const d = K.camDistance * (1 + .15 * Math.min(1.5, v / top)) * (far ? 1.5 : 1), hgt = K.camHeight * (far ? 1.6 : 1);
      if (this.lookBack) { eye = V.addS(V.addS(V.copy(P), this.Fs, d), this.Us, hgt); look = V.copy(P); }
      else { eye = V.addS(V.addS(V.copy(P), this.Fs, -d), this.Us, hgt); look = V.addS(V.addS(V.copy(P), sh.F, 120), sh.U, 12); }
      if (far) fov -= 6;
    }
    return this.pose(eye, look, up, fov);
  }
  pose(eye, look, up, fov) {
    const dir = V.norm(V.sub(look, eye, [0, 0, 0])), yaw = Math.atan2(dir[1], dir[0]), pitch = Math.asin(Math.max(-1, Math.min(1, dir[2])));
    const Rf = V.norm(V.cross(ZUP, dir, [0, 0, 0])), Uc = V.cross(dir, Rf, [0, 0, 0]);
    const roll = SN.cam.rollSign * Math.atan2(V.dot(up, Rf), V.dot(up, Uc));
    return { x: eye[0], y: eye[1], z: eye[2], yaw, pitch, roll: isFinite(roll) ? roll : 0, fov: Math.max(20, Math.min(110, fov)) };
  }
  introPose(dt) {
    const R = this.race, T = this.view.T, k = Math.min(1, R.stateT / 6), s = SN.wrap(-900 * 16 * (1 - k) - 60 * 16, T.L), p = T.point(s, Math.sin(k * 3) * 120, 300 * (1 - k) + 160), look = T.point(SN.wrap(s + 500 * 16 * (1 - k) + 200, T.L), 0, 20);
    return this.pose(p, look, ZUP, 64);
  }
  /** the TV director: trackside spots ahead of the target, with heli, chase, nose and low shots between */
  tvPose(dt) {
    const R = this.race, T = this.view.T, sh = this.tvTarget ? this.tvTarget() : this.ship; if (!sh) return null;
    this.shotT = (this.shotT || 0) + dt;
    const sp = this.shot;
    const need = !sp || this.shotT > (sp.hold || 6) || (sp.kind === 'side' && SN.wrapDiff(sp.spot.s, sh.s, T.L) > 400) || (this.forceCut && this.shotT > 1.2) || (sp.ship !== sh && this.shotT > 1.2);
    if (need) {
      this.forceCut = false; this.cuts = (this.cuts || 0) + 1; this.shotT = 0; this.cutNow = true;
      if (this.cuts % 3 === 0) this.shot = { kind: ['heli', 'chase', 'nose', 'low'][Math.floor(this.cuts / 3) % 4], ship: sh, hold: 3 + (this.cuts % 2) * 1.5 };
      else { let best = null; for (const s of this.view.spots) { const ds = SN.wrapDiff(sh.s, s.s, T.L); if (ds > 40 * 16 && ds < 260 * 16 && (!best || ds < best.ds)) best = { s, ds }; } this.shot = best ? { kind: 'side', spot: best.s, ship: sh, hold: 6 } : { kind: 'heli', ship: sh, hold: 3 }; }
    }
    const S = this.shot, P = sh.P;
    if (S.kind === 'side') { const d = V.dist([S.spot.x, S.spot.y, S.spot.z], P); return this.pose([S.spot.x, S.spot.y, S.spot.z], V.addS(V.copy(P), sh.F, 30), ZUP, Math.max(18, Math.min(46, Math.atan(40 * 16 / Math.max(1, d)) * 2 * 180 / Math.PI))); }
    if (S.kind === 'heli') return this.pose([P[0] - sh.F[0] * 60 * 16, P[1] - sh.F[1] * 60 * 16, P[2] + 40 * 16], P, ZUP, 50);
    if (S.kind === 'nose') return this.follow(sh, dt, 'cockpit');
    if (S.kind === 'low') { const q = T.point(sh.s + 30 * 16 + SN.Ship.speed(sh) * this.shotT * .3, sh.u * .5, 16); return this.pose(q, P, ZUP, 55); }
    return this.follow(sh, dt, 'chase');
  }
  freePose(dt) {
    const f = this.free, I = SN.game.input, mv = I.move(), sp = 1600 * dt * (I.down('thrust') ? 3 : 1);
    if (I.padAim) { f.yaw += I.padAim[0] * 2 * dt; f.pitch = Math.max(-1.4, Math.min(1.4, f.pitch - I.padAim[1] * 2 * dt)); }
    const md = I.pointer && I.pointer(); if (md && this._mp && I.down('fire')) { f.yaw += (md[0] - this._mp[0]) * .01; f.pitch = Math.max(-1.4, Math.min(1.4, f.pitch - (md[1] - this._mp[1]) * .01)); } this._mp = md;
    const fx = Math.cos(f.yaw), fy = Math.sin(f.yaw);
    f.x += (fx * -mv[1] - fy * mv[0] * -1) * sp; f.y += (fy * -mv[1] + fx * mv[0]) * sp;
    if (I.down('brakeR')) f.z += sp; if (I.down('brakeL')) f.z -= sp;
    return { x: f.x, y: f.y, z: f.z, yaw: f.yaw, pitch: f.pitch, roll: 0, fov: 70 };
  }
}
SN.Cam = Cam;

/* ---- the hangar: the menus' world (a hall with a turntable and a podium) ---- */
class Hangar {
  constructor(game) {
    this.game = game; if (!SN.has3D()) { this.world = null; return; }
    const rows = [];
    for (let y = 0; y < 18; y++) { let r = ''; for (let x = 0; x < 28; x++) r += (x === 0 || y === 0 || x === 27 || y === 17) ? '#' : (y >= 3 && y <= 4 && x >= 18 && x <= 19) ? '1' : (y >= 3 && y <= 4 && x >= 16 && x <= 17) ? '2' : (y >= 3 && y <= 4 && x >= 20 && x <= 21) ? '3' : '.'; rows.push(r); }
    this.world = new E.World3D(game, {
      level: { rows, ground: 'plain', colors: { base: '#15171e', dark: '#111319', light: '#1a1d26' }, wallSide: 'metal', color: '#1c1e28', legend: { '#': { wall: 120 }, '1': { floor: 24, mark: 'p1' }, '2': { floor: 16, mark: 'p2' }, '3': { floor: 8, mark: 'p3' } } },
      sky: '#05060c', fog: false, ambient: ['#6a7aa8', '#14141c', 1.4], sun: { dir: [.3, .4, -.85], color: '#e8f0ff', intensity: 1.2, area: 300 }, torchLights: 0, lights: 4,
      camera: { mode: 'fixed', far: 4000 }, filter: { bloom: true }, onDraw: (w, r) => this.onDraw(w, r)
    });
    const w = this.world, THREE = E.THREE, sc = w.scene;
    this.mats = SN.ShipKit.materials(); for (const k in this.mats) w._own(this.mats[k]);
    this.crafts = {}; for (const t of SN.TEAMS) { const v = SN.ShipKit.makeCraft(w, t.id, this.mats); sc.add(v.group); v.group.visible = false; this.crafts[t.id] = v; const vc = SN.ShipKit.makeCraft(w, t.id, this.mats, { champion: true }); sc.add(vc.group); vc.group.visible = false; this.crafts[t.id + ':champion'] = vc; }
    // the turntable with a neon ring, a light floor grid, neon strips along the walls' feet
    const tt = new THREE.Mesh(w._own(new THREE.CylinderGeometry(5, 5.4, .5, 40)), w._own(new THREE.MeshLambertNodeMaterial({ color: '#2a2c36' }))); tt.position.set(10.5, .25, 8); sc.add(tt);
    const ring = new THREE.Mesh(w._own(new THREE.TorusGeometry(5.2, .1, 6, 64)), this.neon = w._own(new THREE.MeshBasicNodeMaterial({ color: '#29c8e8' }))); ring.rotation.x = Math.PI / 2; ring.position.set(10.5, .55, 8); sc.add(ring);
    const lineMat = w._own(new THREE.MeshBasicNodeMaterial({ color: '#1c2a3e' }));
    for (let k = 2; k < 27; k += 3) { const a = new THREE.Mesh(w._own(new THREE.BoxGeometry(.05, .02, 16)), lineMat); a.position.set(k, .02, 9); sc.add(a); }
    for (let k = 2; k < 17; k += 3) { const a = new THREE.Mesh(w._own(new THREE.BoxGeometry(26, .02, .05)), lineMat); a.position.set(14, .02, k); sc.add(a); }
    for (const z of [1.1, 16.9]) { const st = new THREE.Mesh(w._own(new THREE.BoxGeometry(26, .12, .12)), this.neon); st.position.set(14, .4, z); sc.add(st); }
    for (let k = 0; k < 5; k++) { const lamp = new THREE.Mesh(w._own(new THREE.BoxGeometry(2.4, .1, .6)), w._own(new THREE.MeshBasicNodeMaterial({ color: '#d8e8ff' }))); lamp.position.set(4 + k * 5, 7.4, 9); sc.add(lamp); }
    this.lights = [w.light({ color: '#29c8e8', reach: 300, power: 40 }), w.light({ color: '#ff3ab4', reach: 300, power: 30 }), w.light({ color: '#ffe0b0', reach: 260, power: 30 })];
    Object.assign(this.lights[0], { x: 60, y: 60, z: 90, power: 14 }); Object.assign(this.lights[1], { x: 300, y: 220, z: 90, power: 10 }); Object.assign(this.lights[2], { x: 300, y: 40, z: 120, power: 10 });
    this.team = 'kestrel'; this.spin = 0; this.mode = 'turntable'; this.rigs = []; this.orbit = 0;
    w.camera.fixed = { x: 160, y: 300, z: 60, yaw: -1.57, pitch: -.2, roll: 0, fov: 50 };
    w.prepare();
  }
  show(team, champion) { this.team = team; this.champion = !!champion; }
  /** the podium: three pilot cards posed */
  podium(pilots) {
    const w = this.world; if (!w) return;
    w.reset(); this.rigs = [];
    pilots.slice(0, 3).forEach((id, k) => { const m = w.marks['p' + (k + 1)][0], rig = SN.rigFor(id, true); const a = w.hero({ x: m.x + 8, y: m.y + 8, z: m.z, rig, facing: Math.PI / 2 }); a.anim = { pose: k === 0 ? 'cheer' : k === 1 ? 'wave' : 'hips', expr: 'smile' }; this.rigs.push(a); });
    this.mode = 'podium';
  }
  turntable() { if (this.world && this.mode !== 'turntable') { this.world.reset(); this.rigs = []; } this.mode = 'turntable'; }
  step(dt) {
    if (!this.world) return; this.spin += dt * .5; this.orbit += dt * .15;
    const w = this.world;
    if (this.mode === 'podium') w.camera.fixed = { x: 296 + Math.sin(this.orbit) * 60, y: 200, z: 70, yaw: -Math.PI / 2 + Math.sin(this.orbit) * .2, pitch: -.12, roll: 0, fov: 46 };
    else w.camera.fixed = { x: 104 + Math.sin(this.orbit) * 8, y: 262, z: 104, yaw: -Math.PI / 2 + .12 + Math.sin(this.orbit) * .05, pitch: -.52, roll: 0, fov: 50 };
    w.step(dt);
  }
  onDraw(w) {
    for (const k in this.crafts) this.crafts[k].group.visible = false;
    const v = this.crafts[this.team + (this.champion ? ':champion' : '')];
    if (v && this.mode === 'turntable') { v.group.visible = true; const a = this.spin + (this.drag || 0); SN.ShipKit.poseCraft(v, [168, 128, 16], [Math.cos(a), Math.sin(a), 0], [0, 0, 1], 0, .95); }
    this.neon.color.set(SN.TEAM[this.team].colors[1]);
  }
}
SN.Hangar = Hangar;
/** a pilot's rig (helmeted for the race and the podium, bare-headed for portraits) */
SN.rigFor = (id, helmet = false) => {
  const p = SN.PILOT[id] || SN.PRINCIPALS[id], team = SN.PILOT[id] ? SN.TEAM[p.team] : null, c = team ? team.colors : ['#3a3a48', '#c8c8d0', '#2a2a34', '#fff'];
  const key = id + (helmet ? ':h' : ''); SN._rigs = SN._rigs || {}; if (SN._rigs[key]) return SN._rigs[key];
  const o = { size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: p.hair || 'short', hood: !!p.hood, colors: { skin: p.skin || '#e0c0a0', hair: p.hc || '#202020', cloth: c[0], coat: c[1], pants: c[2], trim: c[1], glove: c[2], boot: '#1a1a20' } };
  if (helmet) o.hat = { style: 'helmet', color: c[1] };
  return (SN._rigs[key] = new E.Humanoid(o));
};
})();
