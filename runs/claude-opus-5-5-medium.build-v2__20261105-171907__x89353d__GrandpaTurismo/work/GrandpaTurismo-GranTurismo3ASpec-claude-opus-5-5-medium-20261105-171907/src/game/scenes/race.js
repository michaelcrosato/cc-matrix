// RaceScene: everything driven. Race, licence test, test drive, time trial, attract clips, couch duel, hub round. Built from a RaceSetup plain object.
import { THREE, Precipitation, toonMaterial, PALETTE, buildModel, setLookLayer, Trail } from '../../pixel-engine.js';
import { RaceSim, getTrack, profileFor, resolveS } from '../sim/race.js';
import { aiDrive } from '../sim/sim.js';
import { assistInput } from '../sim/setups.js';
import { CarView } from '../render/carview.js';
import { buildTrackMeshes, drivingLineMesh, pointAt, vertexMesh, groundHeight } from '../render/trackmesh.js';
import { dressTrack, lampPools } from '../render/dressing.js';
import { setSky, buildSkyDome, followSky, nightOf } from '../render/sky.js';
import { ChaseCam, TVDirector } from '../render/camera.js';
import { SkidMarks } from '../render/skid.js';
import { registerParticles } from '../render/particles.js';
import { drawRaceHud, drawLights, banner, miniMap } from '../ui/racehud.js';
import { rumble } from '../input/pad.js';
import { Person } from '../render/people.js';
import { fmtTime } from '../ui/ui.js';
import { TIPS } from '../data/text.js';
const { Vector3, Mesh, BoxGeometry, ConeGeometry, Color, Group } = THREE;
const SONG_OF = (setup) => (setup.track === 'redclay' ? 'rally' : nightOf(setup.hour) > 0.5 ? 'night' : 'race');
export class RaceScene {
  name = 'race';
  constructor(app, setup, o = {}) { this.app = app; this.rs = setup; this.viewer = !!o.viewer; this.sim = o.sim ?? null; this.seat = o.seat ?? 0; this.target = new Vector3(); this.prev = []; this.views = []; this.fx = { abs: 0, tcs: 0, stb: 0 }; this.lights = []; this.time = 0; this.hold = setup.mode === 'hub' || setup.mode === 'attract' || setup.mode === 'couch' ? 0 : setup.test ? 1.6 : 0.9; this.msg = null; this.msgT = 0; this.msgs = []; this.ghosts = []; this.frozen = false; this.camTV = false; this.lastLight = 0; this.hubLights = -1; this.freeCam = null; this.ended = false; this.tipI = 0; }
  async setup(ctx) {
    const { app, rs: setup } = this;
    if (!this.viewer) app.bind(ctx, this);
    this.ctx = ctx; const { scene, camera } = ctx;
    const cam = camera.camera; cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix();
    this.T = getTrack(setup.track); const T = this.T, tr = T.tr;
    if (!this.sim) { this.sim = new RaceSim({ ...setup, tune: app.dev.tune }); if (setup.onBuilt) setup.onBuilt(this.sim, this); }
    const sim = this.sim;
    registerParticles(ctx.particles);
    // the world
    this.hour = setup.hour; setSky(ctx.engine, this.hour, { rain: setup.rain });
    const speeds = profileFor(setup.track, sim.player.p, setup.rain), pools = setup.track === 'harbour' ? lampPools(tr) : null;
    for (const m of buildTrackMeshes(T, T.id, { speeds, pools: nightOf(this.hour) > 0.2 ? pools : null })) scene.add(m);
    this.dress = dressTrack(ctx, T, setup.mode === 'hub');
    this.dome = buildSkyDome(T.id, this.hour, { rain: setup.rain }); scene.add(this.dome);
    this.skids = new SkidMarks(setup.track === 'redclay' ? 400 : 1400, setup.track === 'redclay' ? PALETTE.plum : PALETTE.ink); scene.add(this.skids.mesh);
    if (setup.rain) { this.rain = new Precipitation({ kind: 'rain', count: 900, area: [60, 26, 60] }); this.rain.wind.set(1.5, 0.5); scene.add(this.rain); }
    this.lineMesh = drivingLineMesh(T, speeds); this.lineMesh.visible = false; scene.add(this.lineMesh);
    this.gantryLights(ctx);
    // cars
    const night = nightOf(this.hour) > 0.3;
    sim.cars.forEach((c, i) => {
      const v = new CarView(c.carId, c.install, { dirt: i === sim.player.idx ? setup.cars[i].dirt ?? 0 : (setup.track === 'redclay' ? 0.4 : 0) });
      scene.add(v.root); this.views.push(v); this.prev.push({ x: c.x, y: c.y, z: c.z, yaw: c.yaw }); c.hudColor = c.seat >= 0 ? 'lime' : 'red';
      if (night) v.nightLamps = true;
    });
    this.focusIdx = sim.cars.find((c) => c.seat === this.seat)?.idx ?? 0;
    this.chase = new ChaseCam(cam, app); this.tv = new TVDirector(T); this.map = miniMap(tr, setup.mode === 'couch' ? 44 : 56);
    if (app.profile?.assists?.line || setup.lineOn) this.lineMesh.visible = true;
    // the player's lamps
    const fv = this.views[this.focusIdx];
    if (nightOf(this.hour) > 0.1 || T.tunnel) {
      this.headL = ctx.lights.request({ position: [0, 1, 0], color: 0xfff0c0, intensity: 16, radius: 26, priority: 8, name: 'head' });
      this.tailL = ctx.lights.request({ position: [0, 1, 0], color: 0xff3030, intensity: 2.2, radius: 5, priority: 3, name: 'tail' });
    }
    if (night) { this.trails = sim.cars.slice(0, 8).map(() => { const t = new Trail({ width: 0.2, life: 0.35, color: PALETTE.red, tail: PALETTE.plum, points: 16 }); scene.add(t); return t; }); }
    void fv;
    // licence furniture
    if (sim.run) this.buildTestFurniture(ctx);
    // the pit crew and the flag marshal
    if (!this.viewer && setup.mode !== 'hub' && (sim.rules.pits || setup.crew)) await this.buildCrew(ctx);
    if (!this.viewer && setup.mode !== 'hub') { this.flagman = await Person.create(ctx, 'marshal', { clip: 'Idle' }); const q = pointAt(tr, 8, -(tr.width[0] / 2 + tr.wallL[0] - 0.6)); this.flagman.root.position.set(q.x, q.y, q.z); this.flagman.root.rotation.y = q.yaw + Math.PI / 2; scene.add(this.flagman.root); const fl = new Mesh(new BoxGeometry(0.05, 0.75, 1.1), toonMaterial(PALETTE.white)); fl.position.set(0, 0.12, 0.55); const chk = new Mesh(new BoxGeometry(0.06, 0.38, 0.55), toonMaterial(PALETTE.ink)); chk.position.set(0, 0.12, 0.3); const hand = this.flagman.root.getObjectByName('HandR'); if (hand) { hand.add(fl, chk); } this.flagman.flag = fl; }
    // hikers on the Cedar path
    this.hikers = []; if (!this.viewer && setup.mode !== 'hub') for (const h of this.dress.hikers ?? []) { const p = await Person.create(ctx, 'hiker', { clip: 'Walk' }), q = pointAt(tr, h.s, h.t), side = Math.sign(h.t), y = groundHeight(T, T.id, q.i, side, Math.abs(h.t) - tr.width[q.i] / 2); ctx.scene.add(p.root); this.hikers.push({ p, x: q.x, y, z: q.z, tx: tr.tx[q.i], tz: tr.tz[q.i], ph: this.hikers.length * 1.7 }); }
    // ghosts of a stored lap
    if (setup.mode === 'trial') this.initTrial();
    // sound
    if (!this.viewer) {
      const seats = sim.cars.filter((c) => c.seat >= 0);
      app.mix.setCars(seats.map((c) => ({ carId: c.carId, params: c.p })));
      if (setup.mode === 'attract' ) app.mix.setCars([{ carId: sim.player.carId, params: sim.player.p }]);
      if (setup.mode !== 'hub' || true) { if (app.settings.raceMusic !== false) app.mix.music(setup.music ?? SONG_OF(setup)); else app.mix.stopMusic(); }
    }
    this.cameraSnap();
    this.lastT = 0; this.tip = TIPS[(sim.setup.seed ?? 0) % TIPS.length];
  }
  gantryLights(ctx) { const tr = this.T.tr, q = pointAt(tr, 0, 0), g = new Group(), hw = Math.min(14, tr.width[q.i] / 2 + 1); this.gLamps = []; for (let i = 0; i < 5; i++) { const m = new Mesh(new BoxGeometry(0.9, 0.7, 0.2), toonMaterial(PALETTE.ink)); m.position.set(-1.9 * 1 + i * 0.95 - 0, 6.6, -0.34); g.add(m); this.gLamps.push(m); } g.position.set(q.x, q.y, q.z); g.rotation.y = q.yaw; ctx.scene.add(g); void hw; this.gGreen = toonMaterial(PALETTE.lime); this.gRed = toonMaterial(PALETTE.red); this.gOff = toonMaterial(PALETTE.ink); const glow = (c) => buildModel({ id: `lamp-${c}`, about: 'gantry lamp', tags: ['lamp'], floats: true, collider: 'none', palette: { l: c }, parts: [{ box: [0.9, 0.7, 0.2], at: [0, 0, 0], c: 'l', glow: true }] }).object; this.gRedM = []; this.gGreenM = []; for (let i = 0; i < 5; i++) { const r = glow('red'), gg = glow('lime'); r.position.copy(this.gLamps[i].position).add(new Vector3(0, 0, -0.08)); gg.position.copy(r.position); r.visible = gg.visible = false; g.add(r, gg); this.gRedM.push(r); this.gGreenM.push(gg); } }
  buildTestFurniture(ctx) {
    const sim = this.sim, R = sim.run, tr = this.T.tr, t = R.test, pos = [], col = [], c = new Color(), quad = (s0, s1, t0, t1, hex, lift = 0.06) => { const a = pointAt(tr, s0, t0), b = pointAt(tr, s0, t1), d = pointAt(tr, s1, t0), e = pointAt(tr, s1, t1); c.set(hex); for (const v of [a, b, d, b, e, d]) { pos.push(v.x, v.y + lift, v.z); col.push(c.r, c.g, c.b); } };
    if (t.box) { const s0 = R.startS + ((t.box.at - (t.from.s ?? 0) + tr.length) % tr.length), s1 = s0 + t.box.len, hw = 5.5; for (const [a, b, u, v] of [[s0, s0 + 0.6, -hw, hw], [s1 - 0.6, s1, -hw, hw], [s0, s1, -hw, -hw + 0.6], [s0, s1, hw - 0.6, hw]]) quad(a, b, u, v, 0xf4f4f4); for (let s = s0 + 2; s < s1 - 1; s += 4) quad(s, s + 1.2, -hw + 1, hw - 1, 0x94b0c2, 0.05); const mk = R.startS + Math.max(30, (s0 - R.startS) * 0.55); quad(mk, mk + 1, -hw, hw, 0xffcd75); }
    if (t.to) { const e = resolveS(t.to, tr), i = Math.round(e / tr.ds) % tr.N, hw = tr.width[i] / 2; for (let k = -Math.ceil(hw); k < hw; k++) quad(e, e + 1.5, k, k + 1, (k & 1) ? 0xf4f4f4 : 0x1a1c2c); }
    if (pos.length) ctx.scene.add(vertexMesh(pos, col));
    this.cones = R.cones.map((k) => { const s = R.startS + k.at, q = pointAt(tr, s, 0), g = new Group(), m = new Mesh(new ConeGeometry(0.34, 0.82, 6), toonMaterial(PALETTE.orange)), b = new Mesh(new BoxGeometry(0.62, 0.08, 0.62), toonMaterial(PALETTE.white)); m.position.y = 0.45; b.position.y = 0.04; m.castShadow = true; g.add(m, b); g.position.set(q.x, q.y, q.z); ctx.scene.add(g); const arrow = new Mesh(new BoxGeometry(0.5, 0.06, 2.4), toonMaterial(k.side > 0 ? PALETTE.lime : PALETTE.sky)), a2 = pointAt(tr, s, k.side * 2.2); arrow.position.set(a2.x, a2.y + 0.05, a2.z); arrow.rotation.y = a2.yaw; ctx.scene.add(arrow); return { k, g, spin: 0, vy: 0 }; });
  }
  async buildCrew(ctx) { this.crew = []; for (const [i, clip] of [[0, 'PitJack'], [1, 'PitWheelGun'], [2, 'PitWheelGun'], [3, 'PitFuel']].map(([i, c]) => [i, c])) { const p = await Person.create(ctx, 'crew', { clip: 'Idle' }); p.root.visible = false; ctx.scene.add(p.root); this.crew.push({ p, clip, i, state: 'off', t: 0 }); } }
  initTrial() { const app = this.app, key = `${this.rs.track}|${this.sim.player.carId}`, g = app.profile.ghosts?.[key]; this.trial = { key, drivers: [Infinity, Infinity], driver: 0, cur: [], best: g ? decodeGhost(g) : null }; if (this.trial.best) this.makeTrialGhost(); }
  makeTrialGhost() { if (this.trialGhost) this.trialGhost.dispose(); const v = new CarView(this.sim.player.carId, null, { ghost: PALETTE.sky }); this.ctx.scene.add(v.root); this.trialGhost = v; }
  // ---- input to sim
  fixedUpdate(ctx) {
    if (this.viewer) return; const app = this.app; app.frameStart(ctx);
    if (this.frozen || app.paused || this.hold > 0) return;
    const sim = this.sim, seats = sim.cars.filter((c) => c.seat >= 0 && !c.ai), inputs = [];
    for (const c of seats) {
      const seat = c.seat, base = app.bot ? app.bot(sim, c, ctx) : app.actions.driving(ctx, seat, 1 / 60), asst = assistInput(app.profile?.assists ?? { abs: true, tcs: 5, asm: 5, auto: true }, sim.run?.test, c.surface === 'dirt' || this.T.tr.surface === 'dirt' ? 'dirt' : null);
      inputs[seat] = { ...base, ...asst, ...(base.force ?? {}) };
    }
    if (this.rs.mode === 'demo' || (sim.run && app.demoBrain)) inputs[0] = sim.run.over ? {} : sim.testBrain(0.97);
    if (app.dev.god) for (const c of seats) c.god = true;
    for (let k = 0; k < sim.cars.length; k++) { const c = sim.cars[k], p = this.prev[k]; p.x = c.x; p.y = c.y; p.z = c.z; p.yaw = c.yaw; }
    sim.step(inputs);
    this.afterStep(ctx);
  }
  afterStep() { const app = this.app, sim = this.sim, me = sim.player; if (this.trial && me.lap >= 1 && sim.frame % 6 === 0) this.trial.cur.push(me.x, me.y, me.z, me.yaw, sim.t - me.lapStart); if (app.session) app.session.tick(sim); }
  // ---- per frame
  update(ctx, dt) {
    const app = this.app, sim = this.sim, realDt = dt;
    if (!this.viewer) app.frameStart(ctx);
    this.time += dt; if (this.hold > 0 && !app.paused) this.hold -= dt;
    ctx.hud.clear();
    const alpha = ctx.physics.alpha ?? 1, focus = sim.cars[this.focusIdx], tr = this.T.tr, st = this.state ??= {};
    // pose
    sim.cars.forEach((c, i) => {
      const p = this.prev[i], a = this.frozen || app.paused || this.viewer ? 1 : alpha; let dy = c.yaw - p.yaw; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI;
      st.x = p.x + (c.x - p.x) * a; st.y = p.y + (c.y - p.y) * a; st.z = p.z + (c.z - p.z) * a; st.yaw = p.yaw + dy * a; st.ax = c.ax; st.ay = c.ay; st.u = c.u; st.delta = c.delta; st.brake = (c.lastInp?.brake ?? 0) > 0.08; st.i = c.loc.i; st.rpm = c.rpm; st.t = this.time; st.vy = c.vy;
      const v = this.views[i]; v.pose(st, app.paused || this.frozen ? 0 : dt, tr); if (c.pit?.state === 'stop' && c.pit.jack) v.root.position.y += c.pit.jack;
      c.vis = { x: st.x, y: st.y, z: st.z, yaw: st.yaw };
    });
    const fv = focus.vis, cam = ctx.camera.camera;
    this.target.set(fv.x, fv.y + 0.5, fv.z);
    // camera
    const ex = this.viewer ? app.actions.driveExtras(ctx, this.seat, dt) : app.ui.top && !app.ui.top.overlay ? { camera: false } : app.actions.driveExtras(ctx, this.seat, dt);
    if (!this.rs.demoOnly && ex.camera && !app.bot) { this.chase.cycle(); app.mix.ui('tick'); }
    if (ctx.input.isDown('MouseRight') && !app.settings.mouseSteer) { ex.orbitX = (ctx.input.mouseDelta.x ?? 0) * 0.3; ex.orbitY = (ctx.input.mouseDelta.y ?? 0) * 0.3; }
    const tvNow = this.rs.cam === 'tv' || (focus.finishT != null && !this.viewer) || (sim.run?.over) || this.camTV;
    if (app.dev.freeCam && !this.viewer) this.updateFreeCam(ctx, cam, dt);
    else if (tvNow) { const g = app.session?.followPos?.(); this.tv.update(cam, g ? { s: g.s ?? 0, x: g.x, y: g.y, z: g.z, u: g.u ?? 0 } : { s: focus.loc.s, x: fv.x, y: fv.y, z: fv.z, u: focus.u }, dt); }
    else this.chase.update({ x: fv.x, y: fv.y, z: fv.z, yaw: fv.yaw, u: focus.u }, dt, ex);
    followSky(this.dome, cam, this.time);
    // recovery
    if (!this.viewer && !sim.done && ex.recoverHeld > 1 && !focus.ai && (!focus.onTrack || Math.hypot(focus.vx, focus.vz) < 2)) { sim.recover(focus); this.chase.snap(); this.app.actions.seat[this.seat].recoverHeld = 0; }
    // hour moves in the endurance
    if (this.rs.hourEnd && !this.viewer) { const f = Math.min(1, sim.metresOf(focus) / (sim.laps * tr.length)), h = this.rs.hour + (this.rs.hourEnd - this.rs.hour) * Math.max(0, f); if (Math.abs(h - this.hour) > 0.02) { this.hour = h; setSky(ctx.engine, h, { rain: this.rs.rain }); if (h > 18.9 && !this.headL) this.headL = ctx.lights.request({ position: [0, 1, 0], color: 0xfff0c0, intensity: 16, radius: 26, priority: 8, name: 'head' }); } }
    // tunnel darkens the sky
    if (this.T.tunnel) { const d = (focus.loc.s - this.T.tunnel.from + tr.length) % tr.length, inside = d < this.T.tunnel.to - this.T.tunnel.from; if (inside !== this.inTunnel) { this.inTunnel = inside; if (inside) { this.savedSun = ctx.engine.sun.intensity; this.savedAmb = ctx.engine.ambient.intensity; ctx.engine.sun.intensity = 0.15; ctx.engine.ambient.intensity = 0.6; } else if (this.savedSun != null) { ctx.engine.sun.intensity = this.savedSun; ctx.engine.ambient.intensity = this.savedAmb; } } }
    // lamps
    if (this.headL) { const sn = Math.sin(fv.yaw), cs = Math.cos(fv.yaw); this.headL.position.set(fv.x + sn * 12, fv.y + 2.2, fv.z + cs * 12); if (this.tailL) this.tailL.position.set(fv.x - sn * 2.6, fv.y + 0.8, fv.z - cs * 2.6); }
    if (this.trails) sim.cars.slice(0, 8).forEach((c, i) => { if (i === this.focusIdx && !tvNow) { this.trails[i].reset(); return; } const t = this.trails[i], sn = Math.sin(c.vis.yaw), cs = Math.cos(c.vis.yaw); t.push(this.tmpV(c.vis.x - sn * 2.1, c.vis.y + 0.72, c.vis.z - cs * 2.1), this.time); t.update(this.time, cam); });
    // world
    this.dress.focus = fv; this.dress.update(app.paused ? 0 : dt, this.time);
    if (this.rain) this.rain.update(dt, this.target);
    this.gantryUpdate();
    if (this.flagman) { this.flagman.update(dt); if (sim.flagT != null || sim.run?.over) this.flagman.play('MarshalFlag'); }
    this.updateGhostCars(ctx, dt);
    if (!this.viewer) this.consumeEvents(ctx, dt);
    this.particlesFor(ctx, dt);
    if (!this.viewer || true) this.sound(ctx, dt, realDt);
    this.updateCrew(ctx, dt);
    for (const h of this.hikers ?? []) { h.p.update(dt); const w = Math.sin(this.time * 0.12 + h.ph), d = Math.cos(this.time * 0.12 + h.ph); h.p.root.position.set(h.x + h.tx * w * 7, h.y, h.z + h.tz * w * 7); h.p.root.rotation.y = Math.atan2(h.tx * Math.sign(d || 1), h.tz * Math.sign(d || 1)); }
    this.updateCones(dt);
    // hud
    this.drawHud(ctx, dt);
    if (this.rs.onUpdate) this.rs.onUpdate(this, dt);
    if (!this.viewer) {
      if (this.rs.mode !== 'attract' && app.session == null && !sim.done && (app.actions.pressed('pause')) && !app.ui.top) app.pause(this);
      if (app.session && app.actions.pressed('pause')) app.session.toggleMenu();
      this.lineMesh.visible = !!(app.profile?.assists?.line || this.rs.lineOn || app.dev.overlays?.line);
      app.frameEnd(ctx, dt);
    }
    if (!this.viewer && sim.done && !this.ended) { this.ended = true; app.raceOver(this); }
    if (this.rs.mode === 'testdrive' && !this.viewer && sim.t > 3 && !sim.done && this.rs.laps === 1 && sim.player.lap === 0 && app.actions.pressed('back')) app.pause(this);
  }
  tmpV(x, y, z) { return (this._tv ??= new Vector3()).set(x, y, z); }
  updateFreeCam(ctx, cam, dt) { const f = (this.freeCam ??= { x: cam.position.x, y: cam.position.y + 4, z: cam.position.z, yaw: 0, pitch: -0.2 }), a = this.app.actions; const mv = ctx.input.moveAxis(), sp = 40 * dt, sn = Math.sin(f.yaw), cs = Math.cos(f.yaw); f.x += (sn * mv.y + cs * mv.x * -1) * sp; f.z += (cs * mv.y - sn * mv.x * -1) * sp; f.yaw -= (ctx.input.mouseDelta.x ?? 0) * 0.004; f.pitch = Math.max(-1.2, Math.min(1.2, f.pitch - (ctx.input.mouseDelta.y ?? 0) * 0.004)); const pad = a.padNow; if (pad) { f.yaw -= (pad.a[2] ?? 0) * dt * 1.5; f.pitch -= (pad.a[3] ?? 0) * dt; f.y += ((pad.b[5] ?? 0) - (pad.b[4] ?? 0)) * sp; } cam.position.set(f.x, f.y, f.z); cam.lookAt(f.x + Math.sin(f.yaw) * Math.cos(f.pitch), f.y + Math.sin(f.pitch), f.z + Math.cos(f.yaw) * Math.cos(f.pitch)); }
  gantryUpdate() { const sim = this.sim, n = sim.phase === 'lights' ? sim.lights : 0, green = sim.green && sim.t - sim.greenT < 3 && !sim.run; for (let i = 0; i < 5; i++) { this.gRedM[i].visible = i < n; this.gGreenM[i].visible = green; } }
  cameraSnap() { const sim = this.sim, c = sim.cars[this.focusIdx], cam = this.ctx.camera.camera; this.chase.init = false; this.chase.update({ x: c.x, y: c.y, z: c.z, yaw: c.yaw, u: c.u }, 1 / 60); void cam; }
  updateGhostCars(ctx, dt) {
    if (this.trialGhost && this.trial?.best) { const b = this.trial.best, me = this.sim.player, t = me.lap >= 1 ? this.sim.t - me.lapStart : 0, n = b.length / 5, i = Math.min(n - 1, Math.floor(t * 10)), o = i * 5; this.trialGhost.pose({ x: b[o], y: b[o + 1], z: b[o + 2], yaw: b[o + 3], u: 30, delta: 0, ax: 0, ay: 0 }, dt, null); this.trialGhost.root.visible = me.lap >= 1; }
    this.app.session?.drawGhosts?.(this, dt);
  }
  updateCones(dt) { if (!this.cones) return; for (const c of this.cones) { if (c.k.hit && !c.k.missed) { c.vy -= 9.8 * dt; if (!c.flown) { c.flown = true; c.vy = 3; } c.g.position.y += c.vy * dt; c.spin += dt * 9; c.g.rotation.x = c.spin; c.g.position.x += dt * 2; if (c.g.position.y < -3) c.g.visible = false; } } }
  // ---- events
  consumeEvents(ctx) {
    const sim = this.sim, app = this.app, mix = app.mix, focus = sim.cars[this.focusIdx]; let shook = false;
    for (const e of sim.takeEvents()) {
      const mine = e.car && e.car.seat >= 0;
      switch (e.t) {
        case 'shift': if (mine) { mix.play('gearClunk'); mix.counts.shift++; this.vib(e.car.seat, 0.1, 0.25, 50); if (e.car.p.exhaustUp) ctx.particles.burst('exhaustPop', this.tail(e.car)); } break;
        case 'wallHit': if (mine || this.close(e.car)) { const pow = Math.min(1, e.v / 18); ctx.particles.burst('sparks', [e.car.x, e.car.y + 0.5, e.car.z], { count: Math.round(6 + pow * 18) }); mix.play('wallThump', { volume: Math.min(1, 0.3 + pow) }); if (mine) { ctx.engine.shake.add(0.2 + pow * 0.5); this.vib(e.car.seat, 0.9, 0.5, 180); if (e.v > 22) ctx.engine.hitstop(0.05); this.views[e.car.idx].jolt = 1; } } break;
        case 'carHit': if ((mine || this.close(e.car)) && !shook) { shook = true; mix.play('carThump', { volume: Math.min(1, 0.3 + e.v / 12) }); ctx.particles.burst('sparks', [e.car.x, e.car.y + 0.6, e.car.z], { count: 5 }); if (mine) { ctx.engine.shake.add(0.2); this.vib(e.car.seat, 0.6, 0.3, 100); } } break;
        case 'land': if (e.air > 0.1 && (mine || this.close(e.car))) { ctx.particles.burst('landDust', [e.car.x, e.car.y + 0.1, e.car.z]); mix.play('landThump', { volume: Math.min(1, 0.4 + e.air) }); this.views[e.car.idx].jolt = 1; if (mine) { ctx.engine.shake.add(0.25); this.vib(e.car.seat, 0.7, 0.2, 120); } } break;
        case 'green': if (sim.startKind !== 'test') { ctx.engine.screen?.flash?.('white', { duration: 0.08 }); mix.play('beepHigh'); this.say('GREEN', 'lime', 1.2); } break;
        case 'lap': if (mine) { mix.play('lapChime'); const best = e.best && e.lap > 0; if (e.time) { this.say(`LAP ${e.lap}  ${fmtTime(e.time)}${best ? '  BEST' : ''}`, best ? 'lime' : 'white', 2.4); if (this.trial) this.trialLap(e.time); } } break;
        case 'finish': if (mine) { mix.play('finalFlag'); this.say(`FINISH  ${fmtTime(e.time)}`, 'sand', 3); ctx.engine.screen?.flash?.('white', { duration: 0.1 }); app.session?.finished(e); if (this.dress.fireworks && e.car.position === 1) this.fwT = 8; } break;
        case 'recover': if (mine) this.chase.snap(); break;
        case 'pitIn': if (mine) { this.say('PIT LANE. 60 KM/H. THE CAR DRIVES ITSELF', 'sand', 3); } break;
        case 'pitStop': this.crewIn(e.car, e.tyres); if (mine) { mix.say(`Your tyres have seen enough. One moment.`, 'benno'); app.ui.subtitle = { lines: [e.tyres ? 'YOUR TYRES HAVE SEEN ENOUGH. ONE MOMENT.' : 'FUEL ONLY. THE TYRES HAVE A LITTLE LEFT.'], speaker: 'BENNO', t: 3 }; } break;
        case 'pitTyres': if (this.crew && e.car === this.crewCar) mix.play('wheelGun'); break;
        case 'pitDone': this.crewOut(e.car); break;
        case 'cone': mix.play('coneHit'); ctx.particles.burst('sparks', [e.x, e.y + 0.3, e.z], { count: 3, colors: ['orange', 'white'] }); break;
        case 'coneMiss': this.say('CONE MISSED  +1 S', 'orange', 1.4); mix.play('denied'); break;
        default: break;
      }
    }
    if (sim.phase === 'lights' && sim.lights !== this.lastLight) { this.lastLight = sim.lights; if (sim.lights > 0) app.mix.play('beepLow'); }
    if (this.fwT > 0) { this.fwT -= 1 / 60; this.fwNext = (this.fwNext ?? 0) - 1 / 60; if (this.fwNext < 0) { this.fwNext = 0.5; const f = focus.vis, seq = (this.fwC = (this.fwC ?? 0) + 1); ctx.particles.burst(seq % 2 ? 'firework' : 'firework2', [f.x + Math.sin(seq * 2.1) * 90, 70 + (seq * 13) % 30, f.z + Math.cos(seq * 1.3) * 90]); app.mix.play('firework', { volume: 0.5 }); } }
  }
  trialLap(time) { const tl = this.trial; const me = this.sim.player, app = this.app; tl.drivers[tl.driver] = Math.min(tl.drivers[tl.driver], time); const key = tl.key, prof = app.profile; const prevBest = prof.ghosts[key]?.time ?? Infinity; if (time < prevBest && !app.dev.dirty) { const arr = tl.cur.slice(); prof.ghosts[key] = encodeGhost(arr, time); tl.best = decodeGhost(prof.ghosts[key]); this.makeTrialGhost(); app.save(); this.say('NEW BEST. THE GHOST IS UPDATED', 'lime', 2.4); } tl.cur = []; void me; }
  vib(seat, strong, weak, ms) { if (this.app.settings.vibration !== false) { const p = this.app.actions.padForSeat(seat); if (p) rumble(p.i, strong, weak, ms); } }
  close(c) { const f = this.sim.cars[this.focusIdx]; return Math.hypot(c.x - f.x, c.z - f.z) < 60; }
  tail(c) { const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw); return [c.x - sn * 2.2, c.y + 0.34, c.z - cs * 2.2]; }
  say(text, color = 'sand', t = 2) { this.msg = text; this.msgColor = color; this.msgT = t; }
  // ---- particles and marks
  particlesFor(ctx, dt) {
    if (this.app.paused) return; const sim = this.sim, f = sim.cars[this.focusIdx], ps = ctx.particles, onDirt = this.T.tr.surface === 'dirt', rain = this.rs.rain;
    this.emit = (this.emit ?? 0) + dt; const go = this.emit > 1 / 30; if (go) this.emit = 0;
    for (const c of sim.cars) {
      if (Math.hypot(c.x - f.x, c.z - f.z) > 140 || c.ghostOnly) continue;
      const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), rx = -cs, rz = sn, speed = Math.hypot(c.vx, c.vz), marking = (c.sliding || c.locked || c.spinning) && speed > 4;
      const sx = c.x - sn * 1.3, sz = c.z - cs * 1.3, T = c.p.T / 2;
      if (marking) { this.skids.lay(c.idx * 2, sx + rx * T, c.y + 0.02, sz + rz * T, rx, rz); this.skids.lay(c.idx * 2 + 1, sx - rx * T, c.y + 0.02, sz - rz * T, rx, rz); } else { this.skids.lift(c.idx * 2); this.skids.lift(c.idx * 2 + 1); }
      if (!go) continue;
      if (marking && !onDirt && c.surface !== 'grass') ps.burst('tyreSmoke', [sx, c.y + 0.25, sz]);
      if ((onDirt || c.surface === 'gravel' || c.surface === 'dirt') && speed > 6) { ps.burst('dust', [sx, c.y + 0.3, sz], { count: speed > 25 ? 2 : 1 }); if (marking) ps.burst('gravelSpray', [sx, c.y + 0.2, sz], { direction: [-sn, 0.5, -cs] }); }
      if (c.surface === 'grass' && speed > 6) ps.burst('dust', [sx, c.y + 0.2, sz], { count: 1, colors: ['green', 'lime', 'plum'] });
      if (rain && speed > 15) ps.burst('rainSpray', [sx, c.y + 0.15, sz]);
      if (c.locked && c === f) { if ((this.lockT = (this.lockT ?? 0) - 1 / 30) < 0) { this.lockT = 0.3; this.app.mix.play('lockChirp'); this.vib(c.seat, 0.4, 0.2, 80); } }
      if (c.onKerb && c === f && speed > 10 && c.p.jolty) this.views[c.idx].jolt = Math.max(this.views[c.idx].jolt, 0.5);
    }
    // assist flashes
    const inp = f.lastInp; if (inp) { this.fx.abs = inp.brake > 0.1 && inp.abs !== false && (f.use?.[0] ?? 0) > 1 ? 0.2 : this.fx.abs - dt; this.fx.tcs = inp.throttle > 0.3 && f.spinning === false && inp.tcs > 0 && (f.use?.[2] ?? 0) > 0.9 ? 0.2 : this.fx.tcs - dt; this.fx.stb = inp.asm > 0 && Math.abs(f.beta) > 0.1 ? 0.2 : this.fx.stb - dt; }
  }
  sound(ctx, dt) {
    if (this.viewer) return;
    const app = this.app, mix = app.mix, sim = this.sim, f = sim.cars[this.focusIdx];
    if (app.paused || this.frozen) { mix.quietDriving(); return; }
    const seats = this.rs.mode === 'attract' ? [f] : sim.cars.filter((c) => c.seat >= 0), speed = Math.hypot(f.vx, f.vz);
    const heard = seats.map((c, i) => ({ rpm: c.rpm, throttle: c.lastInp?.revs ?? c.lastInp?.throttle ?? 0, spool: c.spool, pan: seats.length > 1 ? (i === 0 ? -0.6 : 0.6) : 0, level: 1 }));
    const squeal = Math.min(1, Math.max(0, (Math.max(...f.use) - 1.1) * 0.8)) * (speed > 4 ? 1 : 0) * (this.T.tr.surface === 'dirt' || f.surface === 'grass' ? 0.1 : 1) + (f.locked ? 0.6 : 0);
    const rough = f.surface === 'grass' || f.surface === 'gravel' || f.surface === 'dirt' ? 1 : 0;
    mix.driving(heard, { squeal: Math.min(1, squeal), speed, slip: f.slip, rough, kerb: f.onKerb ? 1 : 0 }, dt);
    if (f.onKerb && this.time % 0.2 < dt) this.vib(f.seat, 0, 0.3, 60);
    if (f.lastInp?.handbrake && !this.hbWas) mix.play('ratchet'); this.hbWas = !!f.lastInp?.handbrake;
    // others
    const cam = ctx.camera.camera, right = (this._r ??= new Vector3()).set(1, 0, 0).applyQuaternion(cam.quaternion), others = sim.cars.filter((c) => c !== f && c.seat < 0).map((c) => ({ x: c.x, y: c.y, z: c.z, rpm: c.rpm, carId: c.carId, d: Math.hypot(c.x - f.x, c.z - f.z) })).sort((a, b) => a.d - b.d);
    mix.otherCars({ position: cam.position, right }, others);
    // crowd swell near stands, rain
    let nearStand = 1e9; for (const s of this.dress.stands) nearStand = Math.min(nearStand, Math.hypot(s.x - f.x, s.z - f.z));
    mix.world('crowd', Math.max(0, 1 - nearStand / 110) * 0.3); if (this.rs.rain) mix.world('rain', 0.5);
  }
  // ---- pit crew
  crewIn(car, tyres) {
    if (!this.crew || (car.seat < 0 && (this.crewCar && this.crewCar !== car))) return; if (car !== this.sim.cars[this.focusIdx] && !this.rs.crew && car.seat < 0) return;
    this.crewCar = car; const sn = Math.sin(car.yaw), cs = Math.cos(car.yaw), rx = -cs, rz = sn; this.app.mix.play('jackUp');
    const slots = [[0, 3.0], [-1.5, 1.6], [1.5, -1.6], [-1.8, -0.4]];
    this.crew.forEach((m, i) => { const [side, along] = slots[i]; m.p.root.visible = true; m.state = 'in'; m.t = 0; m.useTyres = tyres; m.from = { x: car.x + rx * 11, z: car.z + rz * 11 + i * 0.8 }; m.to = { x: car.x + sn * along + rx * side * 1.05, z: car.z + cs * along + rz * side * 1.05 }; m.y = car.y; m.face = Math.atan2(car.x - m.to.x, car.z - m.to.z); m.p.play('Run'); });
    this.jackT = 0.5; car.pit.jack = 0;
  }
  crewOut(car) { if (car !== this.crewCar) return; this.crew.forEach((m) => { m.state = 'out'; m.t = 0; m.p.play('Run'); }); }
  updateCrew(ctx, dt) {
    if (this.app.paused) return;
    if (this.crew) for (const m of this.crew) {
      m.p.update(dt); if (m.state === 'off') continue; const root = m.p.root;
      if (m.state === 'in') { m.t += dt / 0.8; const f = Math.min(1, m.t); root.position.set(m.from.x + (m.to.x - m.from.x) * f, m.y, m.from.z + (m.to.z - m.from.z) * f); root.rotation.y = Math.atan2(m.to.x - m.from.x, m.to.z - m.from.z); if (f >= 1) { m.state = 'work'; root.rotation.y = m.face; m.p.play(m.useTyres || m.i === 3 || m.i === 0 ? m.clip : 'Idle'); if (m.i === 1 || m.i === 2) this.app.mix.play('wheelGun'); } }
      else if (m.state === 'out') { m.t += dt / 0.8; const f = Math.min(1, m.t); root.position.set(m.to.x + (m.from.x - m.to.x) * f, m.y, m.to.z + (m.from.z - m.to.z) * f); root.rotation.y = Math.atan2(m.from.x - m.to.x, m.from.z - m.to.z); if (f >= 1) { m.state = 'off'; root.visible = false; m.p.play('Idle'); } }
    }
    if (this.crewCar?.pit?.state === 'stop') { const c = this.crewCar; c.pit.jack = Math.min(0.15, (c.pit.jack ?? 0) + dt * 0.4); } else if (this.crewCar) this.crewCar = this.crewCar.pit ? this.crewCar : null;
  }
  // ---- hud
  drawHud(ctx) {
    const app = this.app, sim = this.sim, hud = ctx.hud, c = sim.cars[this.focusIdx], setup = this.rs, compact = setup.mode === 'couch';
    if (setup.hud === false || app.dev.hideHud) { app.dev?.drawOverlays?.(this, ctx); return; }
    let gap = null, gapColor = 'lime';
    if (!sim.run && sim.green) {
      if (sim.startKind === 'stagger') { const o = sim.cars.find((x) => x !== c), d = sim.metresOf(c) - sim.metresOf(o) , v = Math.max(5, Math.hypot(c.vx, c.vz)), t = d / v - (c.startDelay - o.startDelay); gap = `${t >= 0 ? '+' : '-'}${Math.abs(t).toFixed(1)} S`; gapColor = t >= 0 ? 'lime' : 'orange'; }
      else if (c.position > 1) { const o = sim.order[c.position - 2], d = sim.metresOf(o) - sim.metresOf(c), v = Math.max(5, Math.hypot(c.vx, c.vz)); gap = `-${(d / v).toFixed(1)} S`; gapColor = 'orange'; }
      else if (sim.order[1]) { const o = sim.order[1], d = sim.metresOf(c) - sim.metresOf(o), v = Math.max(5, Math.hypot(o.vx, o.vz)); gap = `+${(d / v).toFixed(1)} S`; }
    }
    const showing = !(setup.mode === 'demo' && false);
    if (showing && !(app.ui.top && !app.ui.top.overlay && !this.viewer)) drawRaceHud(hud, { sim, car: c, units: app.settings.units, map: this.map, compact, gap, gapColor, flash: { abs: this.fx.abs > 0, tcs: this.fx.tcs > 0, stb: this.fx.stb > 0 }, showWear: !sim.run, tag: app.dev.dirty ? 'DEV' : null });
    if (sim.phase === 'lights') drawLights(hud, sim.lights, Math.round(hud.width / 2), 48, true);
    if (sim.startKind === 'rolling' && sim.phase === 'rolling') { banner(hud, 'ROLLING START. HOLD FORMATION', 44, 'sand', 1); if (hud.width >= 420 && setup.mode !== 'attract') banner(hud, this.tip, 58, 'white', 1); }
    if (this.hold > 0 && setup.test) banner(hud, setup.mode === 'demo' ? 'DEMONSTRATION' : 'READY', 60, 'sand', 2);
    if (setup.mode === 'demo' && Math.floor(this.time * 2) % 2 === 0) banner(hud, 'DEMONSTRATION', 44, 'sand', 1);
    if (c.wrongWay && !sim.done) banner(hud, 'WRONG WAY', 62, 'red', 2);
    if (c.pit) { const st = c.pit; banner(hud, st.state === 'stop' ? `PIT ${st.total.toFixed(1)} S${st.tyreT > 0 ? '  TYRES' : ''}${st.fuelT > 0 ? '  FUEL' : ''}` : 'PIT', 44, 'sand', 1); if (st.state === 'stop' && st.tyreT > 0 && !c.ai) { banner(hud, 'BACK: SKIP THE TYRES', 58, 'white', 1); if (seatDown(app, ctx)) { sim.skipTyres(c); app.actions.consume('pause'); } } }
    if (sim.rules.endurance && !c.pit && !sim.done && (c.fuel < 0.22 || c.wear.reduce((a, b) => a + b, 0) / 4 < 0.3)) { const d = (c.loc.s - this.T.pit.inS + this.T.tr.length) % this.T.tr.length; if (d > this.T.tr.length - 500) banner(hud, 'PIT THIS LAP: KEEP RIGHT', 62, 'orange', 1); else banner(hud, c.fuel < 0.22 ? 'FUEL LOW' : 'TYRES WORN', 62, 'orange', 1); }
    if (this.msgT > 0) { this.msgT -= 1 / 60; banner(hud, this.msg, 26 + 18, this.msgColor, 1); }
    if (c.recoverHeldShow) void 0;
    const held = app.actions.seat[this.seat]?.recoverHeld ?? 0;
    if (held > 0.05 && !sim.done && (!c.onTrack || Math.hypot(c.vx, c.vz) < 2)) { banner(hud, 'HOLD TO RECOVER', 80, 'white', 1); hud.rect(Math.round(hud.width / 2 - 30), 93, Math.round(60 * Math.min(1, held)), 3, 'lime'); }
    app.dev?.drawOverlays?.(this, ctx);
  }
  cameraTarget() { return this.target; }
  status() { const s = this.sim; if (!s) return 'race loading'; if (s.run) return `licence ${s.run.test.id} t=${s.run.time.toFixed(1)} run=${Math.round(s.run.run)} ${s.run.over ? (s.run.failed ? 'fail' : 'done') : ''}`; const c = s.player; return `race ${this.rs.track} lap ${c.lap}/${s.laps} p${c.position}/${s.cars.length} ${s.t.toFixed(1)}`; }
  fingerprint() { return this.sim?.hash() ?? ''; }
  ready(ctx) { this.app.onReady?.(ctx, this); }
  dispose() { if (!this.viewer) { this.app.mix.clearEngines(); this.app.mix.quietDriving(); } }
}
function seatDown(app, ctx) { return app.actions.pressed('back') || ctx.input.wasPressed('KeyX'); }
export function encodeGhost(arr, time) { const n = arr.length / 5, a = new Int16Array(n * 4), ox = arr[0], oz = arr[2], oy = arr[1]; for (let i = 0; i < n; i++) { const o = i * 5; a[i * 4] = Math.round((arr[o] - ox) * 8); a[i * 4 + 1] = Math.round((arr[o + 1] - oy) * 32); a[i * 4 + 2] = Math.round((arr[o + 2] - oz) * 8); a[i * 4 + 3] = Math.round(((arr[o + 3] % 6.2832) * 5000)); } return { time, ox, oy, oz, data: b64(a) }; }
export function decodeGhost(g) { const a = unb64(g.data), n = a.length / 4, out = new Float32Array(n * 5); for (let i = 0; i < n; i++) { const o = i * 5; out[o] = a[i * 4] / 8 + g.ox; out[o + 1] = a[i * 4 + 1] / 32 + g.oy; out[o + 2] = a[i * 4 + 2] / 8 + g.oz; out[o + 3] = a[i * 4 + 3] / 5000; out[o + 4] = i / 10; } return out; }
export function b64(int16) { const u = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
export function unb64(str) { const s = typeof atob !== 'undefined' ? atob(str) : Buffer.from(str, 'base64').toString('binary'), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Int16Array(u.buffer); }
void aiDrive; void setLookLayer;
