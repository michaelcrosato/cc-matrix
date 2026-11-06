// Vitamin Tray: tilt gravity, not the tray. Colliders stay flat and static; the visual group tilts with the balls as children.
import { SoloActivity } from './solo.js';
import { T } from '../../core/tunables.js';
import { BOARDS, CELL, boardDims } from '../../data/boards.js';
import { place, tileFloor, slab } from '../../art/world.js';
import { say } from '../../ui/font.js';
import { panel } from '../../ui/widgets.js';
import { THREE, RAPIER, toonMaterial, PALETTE, applySky, skyAt } from '../../../pixel-engine.js';
import { SKILLS } from '../../core/drivers.js';

const COL = { R: 'red', B: 'blue', Y: 'sand' };
const GRAV_DEFAULT = -24;
export class TrayActivity extends SoloActivity {
  get duration() { return 60; }
  constructor(app, args) { super(app, args); this.boardIdx = args.board ?? (this.hard ? 2 : (app.slot?.day >= 5 ? 1 : 0)); this.board = BOARDS[this.boardIdx]; }
  goal() { return 'Tilt the tray to roll each vitamin into the cup of its colour. Wrong cups cost three.'; }
  controls() { return [['lean', 'Tilt']]; }
  async stage(ctx) {
    applySky(ctx.engine, skyAt(11));
    const { w, h } = boardDims(this.board), B = this.board;
    this.W = w; this.H = h; this.maxPts = 80;
    tileFloor(ctx, 30, 20, [0, -0.3, 0], 'clinic-tile'); slab(ctx, [30, 0.2, 20], [0, -0.5, 0], 'mist');
    this.grp = new THREE.Group(); ctx.scene.add(this.grp);
    const tray = place(ctx, 'vitamin-tray', [0, -0.14, 0], { scale: 1, parent: this.grp });
    tray.object.scale.set(w * CELL / 5 + 0.1, 1, h * CELL / 4 + 0.1);
    // floor collider (flat, static) and walls
    ctx.physics.addStaticBox({ position: [0, -0.1, 0], halfExtents: [w * CELL / 2 + 0.2, 0.1, h * CELL / 2 + 0.2], friction: 0.4 });
    this.cups = []; this.starts = [];
    const wallMat = toonMaterial(PALETTE.cyan);
    B.rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = (c - w / 2 + 0.5) * CELL, z = (r - h / 2 + 0.5) * CELL;
      if (ch === '#') { ctx.physics.addStaticBox({ position: [x, 0.15, z], halfExtents: [CELL / 2, 0.15, CELL / 2], friction: 0.2 }); const m = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.3, CELL), wallMat); m.position.set(x, 0.15, z); this.grp.add(m); }
      else if (COL[ch]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.12, 10), toonMaterial(PALETTE[COL[ch]])); cup.position.set(x, 0.02, z); this.grp.add(cup); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 4, 10), toonMaterial(PALETTE.white)); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.08, z); this.grp.add(rim); this.cups.push({ c: ch, x, z }); }
      else if (ch === 'o') this.starts.push({ x, z });
    }));
    const r = ctx.random.fork('vit');
    this.cols = B.colors; this.balls = [];
    this.vitaMat = Object.fromEntries(Object.keys(COL).map((k) => [k, toonMaterial(PALETTE[COL[k]])]));
    for (let i = 0; i < 8; i++) { const col = this.cols[Math.floor(r.range(0, this.cols.length)) % this.cols.length]; this.balls.push({ col, i, body: null, mesh: null, state: 'off', t: 0, x: 0, z: 0 }); }
    this.tilt = { x: 0, z: 0, ux: 0, uy: 0 };
    this.grav = ctx.physics.world.gravity;
    this.app.music('lagoon');
    this.spawnAll();
  }
  spawnAll() { this.balls.forEach((b, i) => this.spawn(b, this.starts[i % this.starts.length])); this.pts = 0; this.drops = 0; this.sorted = 0; this.wrong = 0; }
  spawn(b, s) {
    const ctx = this.ctx;
    if (b.body) { ctx.physics.world.removeRigidBody(b.body); b.body = null; }
    const body = ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(s.x + (b.i % 3 - 1) * 0.02, 0.15, s.z + ((b.i >> 1) % 3 - 1) * 0.02).setCcdEnabled(true).setLinearDamping(0.3));
    ctx.physics.world.createCollider(RAPIER.ColliderDesc.ball(0.1).setRestitution(0.25).setFriction(0.25).setDensity(1), body);
    if (!b.mesh) { b.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), this.vitaMat[b.col]); this.grp.add(b.mesh); }
    b.mesh.visible = true; b.body = body; b.state = 'live';
  }
  resetPlay() { if (this.balls) { this.balls.forEach((b, i) => this.spawn(b, this.starts[i % this.starts.length])); this.pts = 0; this.drops = 0; this.sorted = 0; this.wrong = 0; this.tilt.x = this.tilt.z = 0; } }
  botControl(inp, dt) {
    const sk = SKILLS[this.driver.skill]; inp.x = inp.y = 0; if (!sk) return;
    const live = this.balls.filter((b) => b.state === 'live'); if (!live.length) return;
    const b = live.slice().sort((a, c) => (a.i - c.i))[0];
    const p = b.body.translation(), v = b.body.linvel();
    const cup = this.cups.filter((c) => c.c === b.col).sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0]; if (!cup) return;
    const ex = cup.x - p.x, ez = cup.z - p.z;
    const nz = Math.sin(this.pt * 1.3 + b.i) * sk.err * 0.25;
    const lagk = { sloppy: 0.5, average: 0.8, good: 1, expert: 1.1 }[this.driver.skill] ?? 0.8;
    inp.x = Math.max(-1, Math.min(1, (ex * 2.2 - v.x * 1.4) * lagk + nz));
    inp.y = Math.max(-1, Math.min(1, -(ez * 2.2 - v.z * 1.4) * lagk + nz * 0.5));
  }
  playFixed(dt) {
    const inp = this.read(dt, this.pt), k = Math.min(1, dt / 0.12), mx = T.trayMaxTilt * Math.PI / 180;
    this.tilt.ux += (inp.x - this.tilt.ux) * k; this.tilt.uy += (inp.y - this.tilt.uy) * k;
    const th = this.tilt.ux * mx, ph = -this.tilt.uy * mx;
    this.tilt.x = ph; this.tilt.z = -th;
    const g = T.trayGravity;
    this.ctx.physics.world.gravity = { x: Math.sin(th) * g, y: -Math.cos(th) * Math.cos(ph) * g, z: Math.sin(ph) * g };
    const hw = this.W * CELL / 2, hh = this.H * CELL / 2;
    let live = 0;
    for (const b of this.balls) {
      if (b.state === 'wait') { b.t -= dt; if (b.t <= 0) this.spawn(b, this.starts[b.i % this.starts.length]); live++; continue; }
      if (b.state !== 'live') continue; live++;
      const p = b.body.translation();
      const cup = this.cups.find((c) => Math.hypot(c.x - p.x, c.z - p.z) < 0.22);
      if (cup) { this.resolve(b, cup); continue; }
      const c = Math.floor(p.x / CELL + this.W / 2), r = Math.floor(p.z / CELL + this.H / 2);
      const ch = this.board.rows[r]?.[c];
      if (ch === 'g' || Math.abs(p.x) > hw + 0.05 || Math.abs(p.z) > hh + 0.05 || p.y < -0.5) this.drop(b);
    }
    if (live === 0 && this.phase === 'play') this.endEarly();
  }
  resolve(b, cup) {
    this.ctx.physics.world.removeRigidBody(b.body); b.body = null; b.mesh.visible = false; b.state = 'done';
    if (cup.c === b.col) { this.pts += 10; this.sorted++; this.app.sfx('chimeIn'); } else { this.pts -= 3; this.wrong++; this.app.sfx('deny'); }
    this.ctx.particles.burst('sparkle', [cup.x, 0.4, cup.z]);
  }
  drop(b) {
    this.ctx.physics.world.removeRigidBody(b.body); b.body = null; b.mesh.visible = false; b.state = 'wait'; b.t = 3; this.pts -= 1; this.drops++; this.app.sfx('splash', { volume: 0.4 });
  }
  scoreNow() { return Math.max(0, 100 * this.pts / this.maxPts); }
  frameTick(ctx, dt) {
    this.grp.rotation.x = this.tilt.x; this.grp.rotation.z = this.tilt.z;
    for (const b of this.balls) if (b.state === 'live' && b.body) { const p = b.body.translation(); b.mesh.position.set(p.x, p.y, p.z); }
    this.av.root.visible = false; this.av.shadow.visible = false;
    this.cam([0, 6.6, 3.9], [0, 0, 0.2], 34);
  }
  dispose(ctx) { try { ctx.physics.world.gravity = { x: 0, y: GRAV_DEFAULT, z: 0 }; } catch { /* */ } }
  drawPlay(hud) {
    const w = hud.width;
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, 12, 24, `${Math.round(this.scoreNow())}%`, { scale: 2, color: 'sand' });
    say(hud, w - 12, 12, `${Math.max(0, Math.ceil(60 - this.playT))}s`, { anchor: 'r', scale: 2, color: 'white' });
    say(hud, w - 12, 30, `Sorted ${this.sorted}  Wrong ${this.wrong}  Dropped ${this.drops}`, { anchor: 'r', color: 'white' });
    say(hud, w / 2, 18, this.board.name, { anchor: 'c', color: 'mist' });
  }
}
