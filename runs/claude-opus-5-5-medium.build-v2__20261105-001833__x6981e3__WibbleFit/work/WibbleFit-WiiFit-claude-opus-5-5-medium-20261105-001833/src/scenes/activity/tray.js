// 5.7 Vitamin Tray. Tilt gravity, not the tray. Colliders stay flat; a visual group tilts.
import { PALETTE, RAPIER, THREE, toonMaterial } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar } from '../../art/avatar.js';
import { box, sea, sky } from '../../art/stage.js';
import { T } from '../../core/tunables.js';
import { BOARDS } from '../../data/boards.js';
import { CAST_LOOKS } from '../../data/classmates.js';
import { say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { ActivityScene } from './base.js';
const { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry } = THREE;
const CELL = 0.72;
const COLORS = { R: 'red', B: 'blue', Y: 'sand' };
const RAD = Math.PI / 180;
export class TraySim {
  t = 0; score = 0; done = false; events = []; ux = 0; uy = 0; sunk = 0; balls = []; cups = []; dropped = 0;
  constructor(cfg, env, rng, scene, boardIndex) { this.cfg = cfg; this.env = env; this.rng = rng; this.scene = scene; this.board = BOARDS[boardIndex]; this.seconds = cfg.seconds ?? 60; this.maxS = 80; }
  maxScore() { return this.maxS; }
  step(dt, u) {
    this.t += dt;
    if (this.t >= this.seconds || this.sunk >= this.balls.length) { this.done = true; return; }
    const k = Math.min(1, dt / 0.12);
    this.ux += (u.x - this.ux) * k; this.uy += (u.y - this.uy) * k;
    const tilt = T.trayMaxTilt * RAD, g = T.trayGravity;
    const w = this.scene.ctx.physics.world;
    w.gravity = { x: Math.sin(tilt * this.ux) * g, y: -g * Math.cos(tilt * Math.hypot(this.ux, this.uy)), z: -Math.sin(tilt * this.uy) * g };
    for (const b of this.balls) {
      if (b.sunk) continue;
      if (b.respawn > 0) { b.respawn -= dt; if (b.respawn <= 0) this.scene.respawn(b); continue; }
      const p = b.body.translation(), v = b.body.linvel();
      b.x = p.x; b.z = p.z; b.vx = v.x; b.vz = v.z;
      if (p.y < -1.5) { this.score = Math.max(0, this.score - 1); this.dropped++; b.respawn = 3; this.scene.hideBall(b); this.events.push({ kind: 'drop', b }); continue; }
      // The right cup takes a vitamin at once. The wrong one takes it only if it lingers.
      let wrong = false;
      for (const c of this.cups) {
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (c.color === b.color && d < CELL * 0.75 && Math.hypot(v.x, v.z) < 3) { b.sunk = true; this.sunk++; this.score += 10; this.scene.hideBall(b); this.events.push({ kind: 'good', b, c }); wrong = false; break; }
        if (c.color !== b.color && d < CELL * 0.45) wrong = c;
      }
      if (b.sunk) continue;
      if (wrong) {
        b.dwell = (b.dwell ?? 0) + dt;
        if (b.dwell >= 0.9) { b.dwell = 0; this.score = Math.max(0, this.score - 3); this.wrong = (this.wrong ?? 0) + 1; b.respawn = 1; this.scene.hideBall(b); this.events.push({ kind: 'bad', b, c: wrong }); }
      } else b.dwell = 0;
    }
  }
  final() { return this.score; }
  result() { return { score: this.score, max: this.maxS, stats: { sunk: this.sunk, dropped: this.dropped } }; }
  bot(driver, out, dt) {
    const sk = driver.skill;
    let ball = this.balls.find((b) => b.id === driver.focus && !b.sunk && !(b.respawn > 0));
    if (!ball) { ball = this.balls.find((b) => !b.sunk && !(b.respawn > 0) && b.x !== undefined); driver.focus = ball?.id; driver.since = this.t; }
    if (!ball) return;
    const cup = this.cups.filter((c) => c.color === ball.color).sort((a, b) => Math.hypot(a.x - ball.x, a.z - ball.z) - Math.hypot(b.x - ball.x, b.z - ball.z))[0];
    if (!cup) return;
    if (this.t - driver.since > 4 + sk.hit * 3) { const i = this.balls.indexOf(ball); const nx = this.balls.slice(i + 1).concat(this.balls.slice(0, i)).find((q) => !q.sunk && !(q.respawn > 0)); driver.focus = nx?.id ?? null; driver.since = this.t; }
    const kp = 0.2 + 0.28 * sk.head, kd = 0.3;
    const noise = (1.3 - sk.head) * 0.7, jx = Math.sin(this.t * 1.7 + 1) * noise, jz = Math.cos(this.t * 2.3) * noise;
    // Good players leave a corner before the wrong vitamin settles in it.
    const risky = sk.head > 0.7 ? this.balls.find((q) => !q.sunk && !(q.respawn > 0) && (q.dwell ?? 0) > 0.62) : null;
    if (risky) { out.x = risky.x > 0 ? -1 : 1; out.y = risky.z > 0 ? 1 : -1; return; }
    const slow = Math.hypot(ball.vx, ball.vz) < 0.25;
    driver.stuck = slow ? (driver.stuck ?? 0) + dt : 0;
    if (driver.stuck > 0.8) { driver.stuck = 0; const i = this.balls.indexOf(ball); const nx = this.balls.slice(i + 1).concat(this.balls.slice(0, i)).find((q) => !q.sunk && !(q.respawn > 0)); driver.focus = nx?.id ?? null; driver.since = this.t; }
    out.x = Math.max(-1, Math.min(1, kp * (cup.x - ball.x) - kd * ball.vx + jx));
    out.y = Math.max(-1, Math.min(1, -(kp * (cup.z - ball.z) - kd * ball.vz + jz)));
  }
}
export class TrayScene extends ActivityScene {
  cameraConfig() { return { preset: 'fixed', position: [0, 11.5, 6.4], target: [0, 0, 0.2], fov: 34 }; }
  makeSim(ctx, lane) {
    if (this.boardIndex === undefined) { const plays = (App.slot?.records ?? App.save.data.dropIn).tray?.plays ?? 0; this.boardIndex = this.hard ? 2 : App.attract ? 1 : plays % BOARDS.length; }
    const sim = new TraySim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`tray-${this.simN = (this.simN ?? 0) + 1}`), this, this.boardIndex);
    if (this.laid) this.layBalls(ctx, sim);
    return sim;
  }
  onResetSims() {}
  async buildStage(ctx) {
    sky(ctx); this.ctx = ctx;
    sea(ctx, 80, 60, -2.2, 0, -14);
    box(ctx, 0, -2.15, 3, 40, 0.2, 18, 'sand', { shadow: false });
    this.group = new Group(); ctx.scene.add(this.group);
    this.playerLane = 0;
    this.lanes.push({ i: 0, who: 'player', driver: this.localDriver(ctx), name: 'You' });
    this.boardIndex = undefined;
    this.lanes[0].sim = this.makeSim(ctx, this.lanes[0]);
    this.buildBoard(ctx, this.lanes[0].sim.board);
    this.laid = true;
    this.layBalls(ctx, this.lanes[0].sim);
    ctx.physics.world.gravity = { x: 0, y: -T.trayGravity, z: 0 };
    this.coach = await makeAvatar(ctx, CAST_LOOKS.coach); this.coach.setAt(-6.4, -2.05, 1.5, 0.8); this.coach.groundY = -2.05;
    ctx.particles.register('fizz', { count: [8, 12], life: [0.3, 0.6], speed: [1, 2.5], gravity: 4, size: [1, 1], colors: ['white', 'lime'] });
  }
  buildBoard(ctx, board) {
    const rows = board.rows, R = rows.length, C = rows[0].length;
    this.W = C * CELL; this.D = R * CELL;
    const lac = toonMaterial(PALETTE.red), rail = toonMaterial(PALETTE.plum);
    const floor = new Mesh(new BoxGeometry(this.W, 0.2, this.D), toonMaterial(PALETTE.white)); floor.position.y = -0.1; floor.receiveShadow = true; this.group.add(floor);
    const under = new Mesh(new BoxGeometry(this.W + 0.6, 0.2, this.D + 0.6), lac); under.position.y = -0.3; this.group.add(under);
    const addStatic = (x, y, z, hx, hy, hz) => { const b = ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)); ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.2).setRestitution(0.25), b); };
    addStatic(0, -0.1, 0, this.W / 2, 0.1, this.D / 2);
    const starts = []; const cups = [];
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      const x = (i - (C - 1) / 2) * CELL, z = (j - (R - 1) / 2) * CELL;
      if (ch === '#') { addStatic(x, 0.25, z, CELL / 2, 0.25, CELL / 2); const m = new Mesh(new BoxGeometry(CELL, 0.5, CELL), rail); m.position.set(x, 0.25, z); m.castShadow = true; this.group.add(m); }
      if (ch === 'o') starts.push([x, z]);
      if (COLORS[ch]) {
        cups.push({ x, z, color: ch });
        const m = new Mesh(new CylinderGeometry(CELL * 0.52, CELL * 0.52, 0.04, 12), toonMaterial(PALETTE[COLORS[ch]])); m.position.set(x, 0.02, z); this.group.add(m);
        const n = new Mesh(new CylinderGeometry(CELL * 0.34, CELL * 0.34, 0.05, 12), toonMaterial(PALETTE.ink)); n.position.set(x, 0.03, z); this.group.add(n);
      }
    }));
    // A gap in the floor where the rail is missing: no collider, so a vitamin falls off the edge.
    this.starts = starts; this.cupDefs = cups;
    this.colours = [...new Set(cups.map((c) => c.color))];
  }
  layBalls(ctx, sim) {
    sim.cups = this.cupDefs;
    if (this.ballObjs) {
      sim.balls = this.ballObjs; sim.balls.forEach((b, i) => { b.sunk = false; b.respawn = 0; b.mesh.visible = true; this.placeBall(b, i); });
      return;
    }
    const geo = new SphereGeometry(0.24, 8, 6);
    sim.balls = this.starts.slice(0, 8).map(([x, z], i) => {
      const color = this.colours[i % this.colours.length];
      const body = ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 0.3, z).setLinearDamping(0.5).setAngularDamping(0.6).setCcdEnabled(true).setCanSleep(false));
      ctx.physics.world.createCollider(RAPIER.ColliderDesc.ball(0.24).setRestitution(0.2).setFriction(0.3).setDensity(2), body);
      const mesh = new Mesh(geo, toonMaterial(PALETTE[COLORS[color]])); mesh.castShadow = true; this.group.add(mesh);
      return { id: i, x, z, vx: 0, vz: 0, color, body, mesh, sunk: false, respawn: 0, home: [x, z] };
    });
    this.ballObjs = sim.balls;
  }
  placeBall(b) { b.body.setTranslation({ x: b.home[0], y: 0.3, z: b.home[1] }, true); b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); b.body.setEnabled?.(true); }
  hideBall(b) { b.mesh.visible = false; b.body.setEnabled?.(false); if (!b.body.setEnabled) b.body.setTranslation({ x: 0, y: -50, z: 0 }, true); }
  respawn(b) { b.mesh.visible = true; b.body.setEnabled?.(true); this.placeBall(b); }
  dispose(ctx) { if (ctx?.physics?.world) ctx.physics.world.gravity = { x: 0, y: -24, z: 0 }; }
  cardInfo() { return { goal: 'Tilt the tray. Roll each vitamin into its own colour.', prompts: [['lean', 'Tilt']] }; }
  onOutro(ctx) { ctx.physics.world.gravity = { x: 0, y: -24, z: 0 }; }
  view(ctx, dt) {
    const s = this.lanes[0].sim;
    if (this.phase === 'intro' || this.phase === 'countdown') ctx.physics.world.gravity = { x: 0, y: -T.trayGravity, z: 0 };
    const tilt = T.trayMaxTilt * RAD;
    this.group.rotation.z = -tilt * s.ux * 0.7; this.group.rotation.x = -tilt * s.uy * 0.7;
    for (const b of s.balls) if (b.mesh.visible) { const p = b.body.translation(); b.mesh.position.set(p.x, p.y, p.z); }
    for (const e of s.events.splice(0)) {
      if (e.kind === 'good') { App.sfx('chimeIn'); ctx.particles.burst('fizz', [e.c.x, 0.3, e.c.z]); if (!App.bark && this.cosmetic.chance(0.3)) App.barkLine('Good. That one is where it belongs.', 'ounce', 1.6); }
      if (e.kind === 'bad') { App.sfx('wobble'); App.barkLine('That is the wrong cup. It will have to go back.', 'ounce', 1.8); }
      if (e.kind === 'drop') { App.sfx('thwap'); }
    }
    this.coach?.update(dt);
  }
  updateAvatars() {}
  drawPlay(ctx, hud) {
    const s = this.lanes[0].sim;
    App.dialCenter.x = hud.width / 2; App.dialCenter.y = hud.height / 2;
    this.drawTopBar(hud, s.score, `${s.board.name}  ${Math.max(0, Math.ceil(s.seconds - s.t))} s  ${s.sunk}/${s.balls.length}`);
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['lean', 'Tilt'], ['pause', 'Pause']]);
    void say;
  }
}
