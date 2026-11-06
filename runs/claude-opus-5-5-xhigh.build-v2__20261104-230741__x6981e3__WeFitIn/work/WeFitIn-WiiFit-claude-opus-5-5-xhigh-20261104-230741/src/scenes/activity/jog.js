// Island Jog: a rail run round the whole island. Coach paces you on a white mobility scooter.
import { ContactShadow, THREE, Trail } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { makeAvatar } from '../../art/avatar.js';
import { Kevin, place } from '../../art/props.js';
import { LOOKS } from '../../data/classmates.js';
import { JOG, JOG_OBSTACLES, JOG_PATH } from '../../data/jog.js';
import { say } from '../../ui/font.js';
import { bar } from '../../ui/widgets.js';
import { topRow } from '../../ui/activity-hud.js';
import { ActivityScene } from './base.js';
import { playerInfo } from './lanes.js';
import { buildIsland } from '../hub.js';

const { CatmullRomCurve3, Raycaster, Vector3 } = THREE;

// The camera is fixed and the island is tall, so whatever stands between it and the path is cut away as you pass.
const CUT_STEP = 1; // metres along the path between looks
const CUT_AHEAD = 5; // gone before you reach it: you need to see what's coming
const CUT_BEHIND = 1.5;
const CUT_HEIGHTS = [0.3, 1.7]; // feet and head

export class JogActivity extends ActivityScene {
  focusV = new Vector3();
  p = new Vector3();
  tan = new Vector3();

  async stage(ctx) {
    const world = buildIsland(ctx, { walls: false });
    this.water = world.water;
    // Only the island may be cut away, so note it before anything of the run goes in.
    this.scenery = [];
    ctx.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) this.scenery.push(o); });
    this.cuts = null;
    this.curve = new CatmullRomCurve3(JOG_PATH.map(([x, z]) => new Vector3(x, 0.08, z)), true, 'catmullrom', 0.5);
    this.length = this.curve.getLength();
    this.curve.arcLengthDivisions = 800;
    this.curve.updateArcLengths();
    const p = playerInfo();
    this.avatar = await makeAvatar(ctx, p.look, { at: [0, 0.08, 8.5], clip: 'Jog' });
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at: [0, 0.3, 8], clip: 'Sit', shadow: false });
    this.scooter = place(ctx, 'mobility-scooter', { actor: true }).object;
    this.scootShadow = new ContactShadow(0.7);
    ctx.scene.add(this.scootShadow);
    this.trail = new Trail({ width: 0.24, life: 0.5, color: 0x74f0f7, tail: 0xffffff });
    ctx.scene.add(this.trail);
    // Water cups along the way, on either side.
    this.cups = [];
    for (let i = 0; i < JOG.cups; i++) {
      const u = (i + 0.7) / JOG.cups;
      const x = [0.9, -0.9, 0, 1.2, -0.4, 0.5][i % 6];
      const at = this.pointAt(u, x);
      const m = place(ctx, 'water-cup', { at: [at.x, 0.06, at.z], actor: true, shadow: false }).object;
      this.cups.push({ u, x, m, taken: false });
    }
    // Sprinklers, picnics, Dennis stretching, and Kevin.
    this.obs = [];
    for (const o of JOG_OBSTACLES) {
      const at = this.pointAt(o.u, o.x);
      let mesh = null;
      if (o.kind === 'sprinkler') { mesh = place(ctx, 'sprinkler', { at: [at.x, 0.06, at.z], actor: true }).object; } else if (o.kind === 'picnic') { mesh = place(ctx, 'picnic', { at: [at.x, 0.06, at.z], yaw: 30, actor: true }).object; } else if (o.kind === 'dennis') {
        const d = await makeAvatar(ctx, LOOKS.dennis, { at: [at.x, 0.06, at.z], yaw: 1, clip: 'Stretch' });
        this.obs.push({ ...o, av: d });
        continue;
      } else {
        const k = new Kevin(ctx, { at: [at.x, 0.06, at.z], yaw: 1 });
        this.obs.push({ ...o, kevin: k });
        continue;
      }
      this.obs.push({ ...o, mesh });
    }
    this.begin();
  }

  /** Once, when the camera is set: which pieces of island hide which stretches of path. */
  findCuts(ctx) {
    const cam = ctx.camera.camera;
    const toCamera = cam.getWorldDirection(new Vector3()).negate();
    const ray = new Raycaster();
    ray.camera = cam;
    const found = new Map();
    const at = new Vector3();
    for (let d = 0; d <= this.length; d += CUT_STEP) {
      for (const x of [-JOG.strafe, 0, JOG.strafe]) {
        for (const y of CUT_HEIGHTS) {
          this.pointAt(d / this.length, x, at);
          at.y = y;
          ray.set(at, toCamera);
          for (const hit of ray.intersectObjects(this.scenery, false)) {
            // The whole prop goes: half of one, left standing, looks like a mistake.
            let prop = hit.object;
            while (prop.parent !== ctx.scene) prop = prop.parent;
            if (!found.has(prop)) found.set(prop, new Set());
            found.get(prop).add(d);
          }
        }
      }
    }
    this.cuts = [...found].map(([prop, at2]) => ({ prop, at: [...at2] }));
  }

  applyCuts() {
    for (const c of this.cuts) c.prop.visible = !c.at.some((d) => this.dist >= d - CUT_AHEAD && this.dist <= d + CUT_BEHIND);
  }

  pointAt(u, x, out = new Vector3()) {
    const uu = ((u % 1) + 1) % 1;
    this.curve.getPointAt(uu, out);
    this.curve.getTangentAt(uu, this.tan);
    const nx = -this.tan.z, nz = this.tan.x;
    out.x += nx * x; out.z += nz * x;
    return out;
  }

  normalAt(u) {
    this.curve.getTangentAt(((u % 1) + 1) % 1, this.tan);
    return { x: -this.tan.z, z: this.tan.x };
  }

  begin() {
    this.dist = 0;
    this.coachDist = 3;
    this.speed = 0;
    this.cadence = 0;
    this.lastFoot = null;
    this.stepEnergy = 0;
    this.stitchT = 0;
    this.overT = 0;
    this.stumbleT = 0;
    this.inBandT = 0;
    this.time = 0;
    this.cupsGot = 0;
    this.x = 0;
    this.botNext = 0;
    this.botFoot = 'L';
    this.hitCooldown = 0;
    for (const c of this.cups ?? []) { c.taken = false; c.m.visible = true; }
    this.trail?.reset();
  }

  get targetCadence() { return T.jogTargetCadence * (this.hardData.cadence ?? 1); }
  get bandLow() { return this.targetCadence + JOG.bandLow; }
  get bandHigh() { return this.targetCadence + JOG.bandHigh; }

  botInput(out, dt, brain) {
    out.x = out.y = 0; out.stepL = out.stepR = false;
    if (!brain.p) return;
    const play = brain.play;
    if (this.time >= this.botNext) {
      const interval = 1 / (this.targetCadence + Math.sin(this.time * 0.6) * (play.timing > 0.1 ? 1.25 : play.timing > 0.06 ? 0.6 : 0.25));
      const slip = this.botRand.next() < play.miss * 0.3;
      const foot = slip ? this.lastFoot ?? 'L' : (this.lastFoot === 'L' ? 'R' : 'L');
      if (foot === 'L') out.stepL = true; else out.stepR = true;
      this.botNext = this.time + interval + (this.botRand.next() - 0.5) * play.timing;
    }
    // Steer: toward the next cup, around the next obstacle.
    const u = this.dist / this.length;
    let wantX = 0;
    const next = this.cups.find((c) => !c.taken && c.u > u && (c.u - u) * this.length < 14);
    if (next) wantX = next.x;
    for (const o of this.obs) {
      const d = (o.u - u) * this.length;
      if (d > 0 && d < 5 && Math.abs(wantX - o.x) < JOG.hitRadius + 0.05) wantX = o.x + (o.x > 0 ? -1.2 : 1.2);
    }
    const w = Math.max(-1, Math.min(1, (wantX - this.x) * 3)) * play.speed;
    const nrm = this.normalAt(u);
    const { right, forward } = this.ctx.camera.groundBasis();
    out.x = w * (nrm.x * right.x + nrm.z * right.z);
    out.y = w * (nrm.x * forward.x + nrm.z * forward.z);
  }

  stepPlay(ctx, dt, scoring) {
    this.time += dt;
    const inp = this.readPlayer(ctx, dt, { x: ctx.hud.width / 2, y: ctx.hud.height / 2 });
    const step = (foot) => {
      if (foot === this.lastFoot) {
        this.stumbleT = JOG.stumble;
        App.sfx('stepMiss');
        if (this.scoring && !this.attractMode && this.t > (this.remarkT ?? 0)) { this.remarkT = this.t + 5; App.say('ounce', 'Left, right. Not left, left. Left, left is a stumble.'); }
      } else {
        this.stepEnergy += 1;
        App.sfx('step', { volume: 0.2 });
      }
      this.lastFoot = foot;
    };
    if (inp.stepL) step('L');
    if (inp.stepR) step('R');
    // Cadence: smoothed steps/s.
    const rawCadence = this.stepEnergy / dt;
    this.stepEnergy = 0;
    this.cadence += (rawCadence - this.cadence) * Math.min(1, dt / 0.7);
    if (this.stumbleT > 0) this.stumbleT -= dt;
    if (this.cadence > this.bandHigh) { this.overT += dt; if (this.overT >= JOG.stitchAfter && this.stitchT <= 0) { this.stitchT = JOG.stitchSeconds; this.overT = 0; App.sfx('stitch'); if (!this.attractMode) App.say('ounce', 'A stitch. Your side has filed a complaint.'); } } else this.overT = Math.max(0, this.overT - dt);
    if (this.stitchT > 0) this.stitchT -= dt;
    let v = (this.cadence / this.targetCadence) * JOG.speed;
    v = Math.min(v, JOG.speed * 1.35);
    if (this.stitchT > 0) v *= JOG.stitchSpeed;
    if (this.stumbleT > 0) v = 0.4;
    this.speed += (v - this.speed) * Math.min(1, dt * 5);
    if (App.dev.god) this.speed = JOG.speed;
    if (this.cheatRing) this.speed = JOG.speed * 1.4;
    this.dist += this.speed * dt;
    const u0 = this.dist / this.length;
    const inBand = this.cadence >= this.bandLow && this.cadence <= this.bandHigh && this.stitchT <= 0;
    this.inBand = inBand;
    if (inBand && scoring) this.inBandT += dt;
    // Stick direction, on the ground, projected onto the path's normal: right on the stick is right on screen.
    const nrm = this.normalAt(u0);
    const { right, forward } = ctx.camera.groundBasis();
    const worldX = right.x * inp.x + forward.x * inp.y, worldZ = right.z * inp.x + forward.z * inp.y;
    this.x = Math.max(-JOG.strafe, Math.min(JOG.strafe, this.x + (worldX * nrm.x + worldZ * nrm.z) * JOG.strafeSpeed * dt));
    // Coach goes at exactly target speed. More than 12 m behind, she waits, unimpressed.
    if (this.coachDist - this.dist < JOG.wait) this.coachDist = Math.min(this.length + 2, this.coachDist + JOG.speed * dt);
    // Cups and obstacles.
    const u = this.dist / this.length;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    for (const c of this.cups) {
      if (c.taken) continue;
      if (Math.abs((c.u - u) * this.length) < 0.8 && Math.abs(c.x - this.x) < JOG.cupRadius) {
        c.taken = true; c.m.visible = false;
        if (scoring) this.cupsGot++;
        App.sfx('cupGet', { pitch: this.cupsGot * 0.5 });
        ctx.particles.burst('dripDrop', [this.avatar.root.position.x, 1, this.avatar.root.position.z]);
      }
    }
    if (this.hitCooldown <= 0 && !this.cheatRing && !App.dev.god) {
      for (const o of this.obs) {
        if (Math.abs((o.u - u) * this.length) < 0.8 && Math.abs(o.x - this.x) < JOG.hitRadius) {
          this.hitCooldown = 1.2;
          this.stumbleT = 0.7;
          App.sfx('flipFlopThwap', { volume: 0.5 });
          if (o.kind === 'kevin') App.sfx('gullSquawk');
          if (this.scoring && !this.attractMode && this.t > (this.remarkT ?? 0)) { this.remarkT = this.t + 5; App.say('ounce', o.kind === 'dennis' ? 'That was Dennis. He says it\'s fine.' : o.kind === 'kevin' ? 'That was Kevin. He has been told.' : 'Please watch the amenities.'); }
          break;
        }
      }
    }
  }

  isOver() { return this.dist >= this.length || this.time >= JOG.limit; }
  playLength() { return JOG.limit; }

  result() {
    const nominal = (this.length / JOG.speed) * 0.92; // starting from a standstill takes a moment
    const pace = Math.min(1, this.inBandT / nominal);
    const cups = this.cupsGot / JOG.cups;
    const score = Math.round(70 * pace + 30 * cups);
    return { score, seconds: this.time, display: `${score}%`, pace, cups: this.cupsGot };
  }

  visual(ctx, dt) {
    if (!this.cuts) this.findCuts(ctx);
    this.applyCuts();
    const u = Math.min(0.9999, this.dist / this.length);
    const at = this.pointAt(u, this.x, this.p);
    const a = this.avatar.root;
    const uu = u;
    this.curve.getTangentAt(uu, this.tan);
    a.position.set(at.x, 0.08, at.z);
    a.rotation.y = Math.atan2(this.tan.x, this.tan.z);
    if (this.stumbleT > 0) this.avatar.play('Hurt', { fade: 0.08 });
    else if (this.speed < 0.3) this.avatar.play('Idle', { fade: 0.2 });
    else { const act = this.avatar.play('Jog', { fade: 0.15 }); act.timeScale = this.speed / 3; }
    this.avatar.update(dt);
    // Coach and her scooter.
    const cu = Math.min(0.9999, this.coachDist / this.length);
    const cp = this.pointAt(cu, -0.2, new Vector3());
    this.curve.getTangentAt(cu, this.tan);
    const yaw = Math.atan2(this.tan.x, this.tan.z);
    this.scooter.position.set(cp.x, 0.06, cp.z);
    this.scooter.rotation.y = yaw;
    this.scootShadow.place(cp.x, 0.07, cp.z, 0);
    this.coach.root.position.set(cp.x, 0.24, cp.z);
    this.coach.root.rotation.y = yaw;
    this.coach.update(dt);
    for (const o of this.obs) {
      if (o.av) o.av.update(dt);
      if (o.kevin) o.kevin.update(dt);
      if (o.kind === 'sprinkler' && o.mesh) {
        const arm = o.mesh.getObjectByName('arm');
        if (arm) arm.rotation.y = this.t * 6;
      }
    }
    this.trail.push(a.position, ctx.time);
    this.trail.update(ctx.time, ctx.camera.camera);
    this.water?.update(ctx.time);
    this.focusV.set(at.x + this.tan.x * 2, 1, at.z + this.tan.z * 2);
  }

  cameraTarget() { return this.focusV; }

  drawGame(ctx) {
    if (this.phase === 'intro') return;
    const { hud } = ctx;
    const cx = Math.round(hud.width / 2);
    const w = Math.min(hud.width - 60, 240);
    // Cadence: a gauge with its band marked.
    const y = 30;
    const max = this.bandHigh + 1.4;
    hud.rect(cx - w / 2 - 1, y - 1, w + 2, 12, 'ink');
    hud.rect(cx - w / 2, y, w, 10, 'white');
    const bx = cx - w / 2 + (this.bandLow / max) * w;
    hud.rect(Math.round(bx), y, Math.round(((this.bandHigh - this.bandLow) / max) * w), 10, this.inBand ? 'lime' : 'mist');
    const mx = cx - w / 2 + (Math.min(max, this.cadence) / max) * w;
    hud.rect(Math.round(mx) - 2, y - 2, 4, 14, this.stitchT > 0 ? 'red' : 'ink');
    const gap = this.coachDist - this.dist;
    bar(hud, cx - w / 2, y + 14, w, 5, this.dist / this.length, 'cyan', 'ink', 'jog-progress');
    if (gap >= JOG.wait - 0.2) { hud.rect(cx - 80, y + 22, 160, 12, 'navy'); say(hud, cx - 76, y + 24, 'Coach waits, unimpressed.', { color: 'sand', name: 'coach-wait' }); }
    if (this.stitchT > 0) { hud.rect(cx - 30, y + 22, 60, 12, 'navy'); say(hud, cx - 24, y + 24, 'Stitch', { color: 'red', name: 'stitch' }); }
  }

  drawGameHud(ctx) {
    const left = Math.max(0, this.length - this.dist);
    topRow(ctx.hud, `${Math.ceil(left)} m`, `${this.cupsGot}/${JOG.cups} cups`);
  }

  overlayDot() { return `cad ${this.cadence.toFixed(2)} v ${this.speed.toFixed(2)} x ${this.x.toFixed(2)}`; }
  fingerprint() { return `${this.dist.toFixed(4)}|${this.cupsGot}|${this.inBandT.toFixed(4)}`; }
}
