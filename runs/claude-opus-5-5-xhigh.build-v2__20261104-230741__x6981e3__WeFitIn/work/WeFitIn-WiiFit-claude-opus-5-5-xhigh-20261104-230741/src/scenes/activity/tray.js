// Vitamin Tray. Tilt gravity, not the tray: colliders stay flat, a visual group tilts.
import { RAPIER, THREE, toonMaterial, PALETTE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { place } from '../../art/props.js';
import { BOARDS, TRAY_CELL } from '../../data/boards.js';
import { sayCentered } from '../../ui/font.js';
import { disc, ring as ringLine, line } from '../../ui/widgets.js';
import { topRow } from '../../ui/activity-hud.js';
import { ActivityScene } from './base.js';
import { lagoonSet } from '../sets.js';

const { Box3, BoxGeometry, Group, Mesh, Vector3 } = THREE;
const COLORS = { R: 'red', B: 'blue', Y: 'lime' };
const BALL_R = 0.17;
const CUP_R = 0.27;
const ENTER_SPEED = 2.6;
const SAND_Y = -1.5; // Well below the tray: at full tilt its low corner must not go under the beach.
const FLOOR_TOP = 0.01; // Inside the tilting group, where the tray's floor is.
const PILL_R = 0.225; // The model's radius at the scale it's placed.
const COLOUR_SLIP = 2; // A wrong colour costs so little that a bot needs to slip often for it to show.

export class TrayActivity extends ActivityScene {
  ownCamera = false;
  tiltX = 0; tiltZ = 0;
  count = 0;

  boardIndex() {
    if (this.args.board !== undefined) return this.args.board;
    if (this.hard) return 2;
    const rec = this.mode === 'week' ? App.slot?.records.tray : App.store.data.dropin?.tray;
    return (rec?.plays ?? 0) % BOARDS.length;
  }

  async stage(ctx) {
    this.set = lagoonSet(ctx, { sandY: SAND_Y });
    this.board = BOARDS[this.boardIndex()];
    const rows = this.board.rows;
    const h = rows.length, w = rows[0].length;
    const cell = TRAY_CELL;
    this.halfW = (w * cell) / 2; this.halfD = (h * cell) / 2;
    this.tilt = new Group();
    this.tilt.position.y = 0.3;
    ctx.scene.add(this.tilt);
    const tray = place(ctx, 'tray', { params: { w: Math.min(12, w * cell), d: Math.min(10, h * cell) }, at: [0, -0.18, 0] });
    ctx.scene.remove(tray.object);
    this.tilt.add(tray.object);
    this.starts = [];
    this.cups = [];
    const { physics } = ctx;
    this.savedGravity = { ...physics.world.gravity };
    // A flat, static floor and walls: gravity does the tilting.
    physics.addStaticBox({ position: [0, -0.1, 0], halfExtents: [this.halfW + 3, 0.1, this.halfD + 3], friction: 0.6 });
    // Edges fall away: gaps in the rail drop a vitamin past the floor's edge.
    const wallMat = toonMaterial(PALETTE.navy);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const ch = rows[r][c];
        const x = (c + 0.5) * cell - this.halfW, z = (r + 0.5) * cell - this.halfD;
        if (ch === '#') {
          physics.addStaticBox({ position: [x, 0.4, z], halfExtents: [cell / 2, 0.4, cell / 2], friction: 0.1 });
          const m = new Mesh(new BoxGeometry(cell, 0.26, cell), wallMat);
          m.position.set(x, 0.13, z);
          m.castShadow = true;
          this.tilt.add(m);
        } else if (ch === 'o') this.starts.push([x, z]);
        else if (COLORS[ch]) {
          const cup = place(ctx, 'vitamin-cup', { palette: { cup: COLORS[ch] }, shadow: false });
          ctx.scene.remove(cup.object);
          cup.object.position.set(x, 0, z);
          this.tilt.add(cup.object);
          // Untagged, so it sees dynamic bodies. A ball touches it with its surface: this much radius means its centre is within CUP_R.
          this.cups.push({ x, z, color: ch, trigger: physics.trigger({ cylinder: { halfHeight: 0.5, radius: CUP_R - BALL_R } }, [x, 0.3, z]) });
        } else if (ch === '_') {
          // A gap: nothing in the rail, and a hole in what's visible.
          const m = new Mesh(new BoxGeometry(cell, 0.04, cell), toonMaterial(PALETTE.ink));
          m.position.set(x, 0.01, z);
          this.tilt.add(m);
        }
      }
    }
    this.vits = [];
    const colors = [...new Set(this.cups.map((c) => c.color))];
    for (let i = 0; i < this.board.count; i++) {
      const color = colors[i % colors.length];
      const pill = place(ctx, 'vitamin', { palette: { pill: COLORS[color] }, actor: true, shadow: true, scale: 1.25 }).object;
      ctx.scene.remove(pill);
      // The model stands on its base. Roll it about its own middle, or it swings through the tray.
      const mesh = new Group();
      pill.position.set(0, -new Box3().setFromObject(pill).getCenter(new Vector3()).y, 0);
      mesh.add(pill);
      this.tilt.add(mesh);
      const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.3, 0).setLinearDamping(0.32).setAngularDamping(0.6).setCcdEnabled(true).setCanSleep(false));
      const collider = physics.world.createCollider(RAPIER.ColliderDesc.ball(BALL_R).setFriction(0.3).setRestitution(0.2).setDensity(2), body);
      this.vits.push({ mesh, body, collider, color, done: false, wait: 0, i });
    }
    this.begin();
  }

  spawnPos(i) {
    const s = this.starts[i % this.starts.length];
    const jitter = (i * 2.399) % 6.28;
    return [s[0] + Math.cos(jitter) * 0.04, 0.3, s[1] + Math.sin(jitter) * 0.04];
  }

  begin() {
    this.score = 0;
    this.correct = 0;
    this.wrong = 0;
    this.dropped = 0;
    this.time = 0;
    this.tiltX = 0; this.tiltZ = 0;
    for (const v of this.vits ?? []) {
      v.done = false; v.wait = 0;
      this.respawnVit(v);
    }
  }

  get timeLimit() { return 60 * (this.hardData.time ?? 1); }
  playLength() { return this.timeLimit; }
  isOver() { return this.time >= this.timeLimit || (this.vits && this.vits.every((v) => v.done)); }

  /** Bots: pick a vitamin, tilt it toward its cup, ease off as it nears. */
  botInput(out, dt, brain) {
    out.x = out.y = 0;
    if (!brain.p) return;
    const play = brain.play;
    // Stick with one vitamin until it is in a cup: chasing all eight at once tips everything.
    let best = this.botVit && !this.botVit.done && this.botVit.wait <= 0 ? this.botVit : null;
    let cup = null, bestD = Infinity;
    // Each new vitamin: does this bot actually check the colour?
    if (!best) this.botSlip = brain.rand() < play.miss * COLOUR_SLIP;
    const pool = best ? [best] : this.vits;
    for (const v of pool) {
      if (v.done || v.wait > 0 || v === this.botAvoid) continue;
      const p = v.body.translation();
      for (const c of this.cups) {
        if ((c.color !== v.color) !== !!this.botSlip) continue;
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < bestD) { bestD = d; best = v; cup = c; }
      }
    }
    if (!best || !cup) { this.botAvoid = null; return; }
    this.botVit = best;
    const p = best.body.translation(), vel = best.body.linvel();
    // Wedged behind the others: leave it and try another.
    this.botStuck = Math.hypot(vel.x, vel.z) < 0.12 ? (this.botStuck ?? 0) + dt : 0;
    if (this.botStuck > 1.2) { this.botAvoid = best; this.botVit = null; this.botStuck = 0; }
    // Round the walls: aim for the next cell on the shortest way to the cup.
    const way = this.nextCell(p.x, p.z, cup);
    const k = 0.5 * play.speed, kd = 0.42;
    const t = this.time;
    out.x = (way.x - p.x) * k - vel.x * kd + Math.sin(t * 2.3) * play.wander * 1.2;
    out.y = -(way.z - p.z) * k + vel.z * kd + Math.sin(t * 1.9) * play.wander * 1.2;
    const d = Math.hypot(out.x, out.y);
    const cap = 0.62;
    if (d > cap) { out.x *= cap / d; out.y *= cap / d; }
  }

  /** Breadth-first over the board's cells, keeping off the wrong cups. `ahead`: how far along the way to look. */
  nextCell(px, pz, cup, ahead = 2) {
    const rows = this.board.rows, h = rows.length, w = rows[0].length, cell = TRAY_CELL;
    const toCell = (x, z) => [Math.max(0, Math.min(w - 1, Math.floor((x + this.halfW) / cell))), Math.max(0, Math.min(h - 1, Math.floor((z + this.halfD) / cell)))];
    const [sx, sz] = toCell(px, pz);
    const [tx, tz] = toCell(cup.x, cup.z);
    const key = (x, z) => z * w + x;
    const prev = new Map([[key(tx, tz), -1]]);
    const queue = [[tx, tz]];
    const open = (x, z) => {
      if (x < 0 || z < 0 || x >= w || z >= h) return false;
      const ch = rows[z][x];
      if (ch === '#' || ch === '_') return false;
      return !COLORS[ch] || (x === tx && z === tz);
    };
    while (queue.length) {
      const [x, z] = queue.shift();
      if (x === sx && z === sz) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (!open(nx, nz) || prev.has(key(nx, nz))) continue;
        prev.set(key(nx, nz), key(x, z));
        queue.push([nx, nz]);
      }
    }
    // Look three cells along the way, so a long corridor gets a proper tilt.
    let step = prev.get(key(sx, sz));
    if (step === undefined || step < 0) return { x: cup.x, z: cup.z };
    for (let i = 0; i < ahead; i++) {
      const after = prev.get(step);
      if (after === undefined || after < 0) break;
      step = after;
    }
    const nz = Math.floor(step / w), nx = step - nz * w;
    return { x: (nx + 0.5) * cell - this.halfW, z: (nz + 0.5) * cell - this.halfD };
  }

  stepPlay(ctx, dt, scoring) {
    this.time += dt;
    const dial = { x: ctx.hud.width / 2, y: ctx.hud.height / 2 };
    const inp = this.readPlayer(ctx, dt, dial);
    const lag = Math.min(1, dt / 0.12);
    const maxT = (T.trayMaxTilt * Math.PI) / 180;
    this.tiltX += (inp.x * maxT - this.tiltX) * lag;
    this.tiltZ += (-inp.y * maxT - this.tiltZ) * lag;
    const g = T.trayGravity;
    ctx.physics.world.gravity = { x: Math.sin(this.tiltX) * g, y: -Math.cos(this.tiltX) * Math.cos(this.tiltZ) * g, z: Math.sin(this.tiltZ) * g };
    for (const v of this.vits) {
      if (v.done) continue;
      if (v.wait > 0) {
        v.wait -= dt;
        if (v.wait <= 0) this.respawnVit(v);
        continue;
      }
      const p = v.body.translation();
      if (p.y < -1.2 || Math.abs(p.x) > this.halfW + 2.4 || Math.abs(p.z) > this.halfD + 2.4) { this.dropVit(ctx, v, scoring); continue; }
      // Past the rail the floor is out of bounds: a gap drops a vitamin.
      if (Math.abs(p.x) > this.halfW + 0.05 || Math.abs(p.z) > this.halfD + 0.05) { this.dropVit(ctx, v, scoring); continue; }
      const vel = v.body.linvel();
      if (Math.hypot(vel.x, vel.z) > ENTER_SPEED) continue;
      const c = this.cups.find((cup) => cup.trigger.inside.has(v.collider.handle));
      if (!c) continue;
      // It has left this cup, whatever the trigger last saw: don't let it count twice before the next physics step.
      c.trigger.forget(v.collider.handle);
      if (c.color === v.color) this.scoreVit(ctx, v, c, scoring);
      else this.wrongVit(ctx, v, c, scoring);
    }
  }

  scoreVit(ctx, v, c, scoring) {
    v.done = true;
    v.body.setEnabled(false);
    v.mesh.visible = false;
    if (scoring) { this.score += 10; this.correct++; }
    App.sfx('vitaminIn', { pitch: this.correct });
    ctx.particles.burst('sparkle', [c.x, 0.6, c.z], { count: 8 });
  }

  wrongVit(ctx, v, c, scoring) {
    if (scoring) { this.score -= 3; this.wrong++; }
    App.sfx('vitaminWrong');
    ctx.particles.burst('puff', [c.x, 0.5, c.z]);
    if (this.botVit === v) this.botVit = null;
    this.respawnVit(v);
  }

  dropVit(ctx, v, scoring) {
    if (scoring) { this.score -= 1; this.dropped++; }
    App.sfx('stepMiss');
    v.wait = 3;
    v.body.setEnabled(false);
    v.mesh.visible = false;
  }

  respawnVit(v) {
    const p = this.spawnPos(v.i + this.dropped + this.wrong);
    v.body.setTranslation({ x: p[0], y: 0.34, z: p[1 + 1] }, true);
    v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    v.body.setEnabled(true);
    v.mesh.visible = true;
  }

  result() {
    const max = this.board.count * 10;
    const score = Math.max(0, this.score);
    return { score, max, seconds: this.time, display: `${score} / ${max}` };
  }

  visual() {
    this.tilt.rotation.z = -this.tiltX;
    this.tilt.rotation.x = this.tiltZ;
    for (const v of this.vits) {
      if (v.done || v.wait > 0) continue;
      const p = v.body.translation(), q = v.body.rotation();
      v.mesh.position.set(p.x, p.y - BALL_R + FLOOR_TOP + PILL_R, p.z);
      v.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }

  drawGame(ctx) {
    if (this.phase === 'intro') return;
    const { hud } = ctx;
    const cx = hud.width - 40, cy = 56, r = 22;
    disc(hud, cx, cy, r + 2, 'slate');
    disc(hud, cx, cy, r, 'white');
    const maxT = (T.trayMaxTilt * Math.PI) / 180;
    disc(hud, cx + (this.tiltX / maxT) * (r - 4), cy + (this.tiltZ / maxT) * (r - 4), 3, 'red');
    ringLine(hud, cx, cy, 8, 1, 'teal');
    if (App.device.last === 'mouse' && !this.autopilot) { const p = App.device.pointerArt(ctx); line(hud, hud.width / 2, hud.height / 2, p.x, p.y, 'white', 1); }
    sayCentered(hud, hud.width / 2, 24, this.board.name, { color: 'white', name: 'board-name' });
  }

  drawGameHud(ctx) {
    topRow(ctx.hud, `${Math.ceil(Math.max(0, this.timeLimit - this.time))}s`, `${this.score}`);
  }

  overlayDot() { return `tilt ${this.tiltX.toFixed(2)},${this.tiltZ.toFixed(2)}`; }
  fingerprint() { return `${this.score}|${this.correct}|${this.wrong}|${this.tiltX.toFixed(5)}`; }
  dispose(ctx) { ctx.physics.world.gravity = { x: 0, y: -24, z: 0 }; }
}
