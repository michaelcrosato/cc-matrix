// Slackline. X is balance, forward is progress. Stopping to recover is a real choice.
import { RippleField, THREE, toonMaterial, PALETTE, WAVES_CALM, WaterSurface } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { Dot } from '../../core/dot.js';
import { T } from '../../core/tunables.js';
import { makeAvatar } from '../../art/avatar.js';
import { Kevin, place } from '../../art/props.js';
import { BARKS } from '../../data/lines.js';
import { SLACK } from '../../data/slackline.js';
import { sayCentered } from '../../ui/font.js';
import { bar, disc, line, panel } from '../../ui/widgets.js';
import { topRow } from '../../ui/activity-hud.js';
import { ActivityScene } from './base.js';
import { playerInfo } from './lanes.js';
import { setSky } from '../sets.js';

const { BoxGeometry, Mesh, Vector3 } = THREE;

export class SlacklineActivity extends ActivityScene {
  ownCamera = true;

  async stage(ctx) {
    setSky(ctx, 13);
    const rip = new RippleField({ size: [40, 60], cells: [80, 120], center: [0, 15] });
    this.ripples = rip;
    this.water = new WaterSurface({ size: [40, 60], at: [0, 0, 15], ripples: rip, waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.cyan, foam: PALETTE.white });
    ctx.scene.add(this.water);
    ctx.scene.add(new Mesh(new BoxGeometry(260, 0.2, 160), toonMaterial(PALETTE.blue)).translateZ(100).translateY(-0.6));
    place(ctx, 'slack-anchor', { at: [0, 0, -1.6] });
    place(ctx, 'slack-anchor', { at: [0, 0, SLACK.length + 1.6] });
    for (const [x, z] of [[-14, 8], [13, 18], [-11, 26], [9, 4]]) place(ctx, 'medicine-ball', { at: [x, -0.3, z], scale: 1.3 });
    for (const [x, z, s] of [[-7, -3, 1.2], [8, -3, 1.1], [-8, 36, 1.2], [8, 36, 1.2]]) place(ctx, 'palm', { at: [x, 0, z], scale: s });
    const sand1 = new Mesh(new BoxGeometry(24, 0.4, 7), toonMaterial(PALETTE.sand)); sand1.position.set(0, -0.1, -3.8); ctx.scene.add(sand1);
    const sand2 = new Mesh(new BoxGeometry(24, 0.4, 7), toonMaterial(PALETTE.sand)); sand2.position.set(0, -0.1, SLACK.length + 3.8); ctx.scene.add(sand2);
    // The line: segments we move each frame so it sags under your feet.
    const mat = toonMaterial(PALETTE.red);
    this.segs = [];
    this.nSegs = 40;
    for (let i = 0; i < this.nSegs; i++) {
      const m = new Mesh(new BoxGeometry(0.1, 0.07, (SLACK.length + 2) / this.nSegs + 0.05), mat);
      ctx.scene.add(m);
      this.segs.push(m);
    }
    // Flags along the line warn of gusts.
    this.flags = [];
    for (let z = 6; z < SLACK.length; z += 6) {
      const pole = new Mesh(new BoxGeometry(0.12, 3.8, 0.12), toonMaterial(PALETTE.white));
      pole.position.set(2.6, 1.7, z);
      ctx.scene.add(pole);
      const f = new Mesh(new BoxGeometry(0.9, 0.5, 0.05), toonMaterial(PALETTE.orange));
      f.position.set(3.05, 3.3, z);
      ctx.scene.add(f);
      this.flags.push({ z, f, pole });
    }
    const p = playerInfo();
    this.avatar = await makeAvatar(ctx, p.look, { at: [0, SLACK.height, 0], clip: 'ArmsOut', shadow: false, yaw: 0 });
    this.kevin = new Kevin(ctx, { at: [4, 3, SLACK.kevinOn], yaw: 3 });
    this.dot = new Dot(() => this.rng.next());
    this.head = new Vector3();
    this.begin(true);
  }

  begin() {
    this.z = 0;
    this.falls = 0;
    this.lastCheckpoint = 0;
    this.dot.reset();
    this.fallT = 0;
    this.time = 0;
    this.finished = false;
    this.gust = null;
    this.nextGustAt = SLACK.gustEvery;
    this.kevinOn = false;
    this.m = {};
    this.walking = false;
    this.gustSign = 1;
    this.engineScaled = false;
    if (this.avatar) this.avatar.place(0, SLACK.height, 0, 0);
    if (this.kevin) { this.kevin.root.position.set(4, 3, SLACK.kevinOn); this.kevin.state = 'sit'; }
  }

  /** Bots walk only while |x| < .45. */
  botInput(out, dt, brain) {
    brain.lean(out, this.dot, 0, 0, dt);
    out.y = !brain.p ? 0 : Math.abs(this.dot.x) < 0.45 ? 1 : 0;
    this.dot.y = 0;
  }

  stepPlay(ctx, dt, scoring) {
    if (this.finished) return;
    this.time += dt;
    if (this.fallT > 0) {
      this.fallT -= dt / Math.max(0.01, ctx.engine.timeScale || 1);
      if (this.fallT <= 0) this.respawn(ctx);
      return;
    }
    const inp = this.readPlayer(ctx, dt, this.dial);
    const wantWalk = inp.y > 0.3;
    this.walking = wantWalk;
    const instEff = wantWalk ? T.slackWalkInst : SLACK.standInst;
    const m = this.m;
    m.inst = instEff / T.dotInstability;
    m.noise = SLACK.noise * App.noiseScale();
    m.bx = 0;
    // Gusts: every 6 m, telegraphed 1.5 s by flags and wind lines.
    if (!this.gust && this.z >= this.nextGustAt - this.walkLead()) {
      this.gust = { warn: SLACK.gustWarn, blow: SLACK.gustSeconds, sign: this.rng.chance(0.5) ? 1 : -1 };
      this.nextGustAt += SLACK.gustEvery;
      App.sfx('gust', { volume: 0.5 });
    }
    if (this.gust) {
      if (this.gust.warn > 0) this.gust.warn -= dt;
      else {
        this.gust.blow -= dt;
        m.bx += this.gust.sign * T.gustForce * (this.hardData.gust ?? 1);
        if (this.gust.blow <= 0) this.gust = null;
      }
    }
    if (this.kevinOn) m.bx += SLACK.kevinBias * T.dotAuthority * (this.kevinSign ?? 1);
    this.dot.step(dt, inp.x, 0, T, m);
    this.dot.y = 0; this.dot.vy = 0;
    if (App.dev.god || this.cheatRing) this.dot.clampTo(0, 0, 0.6);
    if (wantWalk) this.z = Math.min(SLACK.length, this.z + SLACK.walkSpeed * dt);
    // Checkpoints and Kevin.
    for (const c of SLACK.checkpoints) if (this.z >= c) this.lastCheckpoint = Math.max(this.lastCheckpoint, c);
    if (!this.kevinOn && this.z >= SLACK.kevinOn && this.z < SLACK.kevinOff) {
      this.kevinOn = true;
      this.kevinSign = this.rng.chance(0.5) ? 1 : -1;
      this.kevin.flyTo(this.avatar.root.position.x, SLACK.height + 1.75, this.z, 0.5);
      if (!this.attractMode) App.say('ounce', 'Kevin is on your head. He is staff. Carry on.');
    }
    if (this.kevinOn && this.z >= SLACK.kevinOff) {
      this.kevinOn = false;
      this.kevin.flyTo(-6, 5, this.z + 10, 1.4);
    }
    if (Math.abs(this.dot.x) > SLACK.fallAt) this.fall(ctx);
    if (this.z >= SLACK.length) {
      this.finished = true;
      this.avatar.play('Victory', { fade: 0.2 });
      App.sfx('fanfareSoft');
    }
  }

  walkLead() { return SLACK.gustWarn * SLACK.walkSpeed * 0.5; }

  fall(ctx) {
    this.falls++;
    this.fallT = SLACK.fallSeconds;
    this.avatar.play('Fall', { fade: 0.1 });
    if (!this.attractMode) ctx.engine.timeScale = 0.4;
    this.fallVX = Math.sign(this.dot.x) * -1.3;
    this.fallVY = 0.4;
    App.sfx('wobble');
  }

  respawn(ctx) {
    if (!this.attractMode) ctx.engine.timeScale = App.dev.timeScale;
    this.ripples.splash(this.avatar.root.position.x, this.z, 1.2, 0.2);
    ctx.particles.burst('splash', [this.avatar.root.position.x, 0.2, this.z]);
    App.sfx('splash');
    if (this.scoring && !this.attractMode) App.say('ounce', this.cosmetic.pick(BARKS.fall));
    this.z = this.lastCheckpoint;
    this.dot.reset();
    this.avatar.play('ArmsOut', { fade: 0.2 });
    this.avatar.root.position.y = SLACK.height;
  }

  isOver() {
    if (this.finished && (this.overDelay = (this.overDelay ?? 0) + 1 / 60) > 0.7) return true;
    return this.time >= SLACK.limit;
  }

  playLength() { return SLACK.limit; }

  result() {
    const finished = this.z >= SLACK.length;
    const score = finished ? Math.max(0, Math.min(1000, Math.round(1000 - 60 * this.falls - 8 * (this.time - 27)))) : Math.round((this.z / SLACK.length) * 400);
    let stars = 0;
    if (finished) stars = 1;
    if (finished && this.falls <= 1 && this.time < 45) stars = 2;
    if (finished && this.falls === 0 && this.time < 32) stars = 3;
    return { score, stars, seconds: this.time, display: `${score} pts`, falls: this.falls, finished };
  }

  visual(ctx, dt) {
    const a = this.avatar.root;
    if (this.fallT > 0) {
      this.fallVY -= 12 * dt;
      a.position.x += this.fallVX * dt;
      a.position.y = Math.max(0, a.position.y + this.fallVY * dt);
    } else {
      a.position.x = -this.dot.x * 0.42;
      a.position.y = SLACK.height - this.sagAt(this.z);
    }
    a.position.z = this.z;
    if (this.fallT <= 0 && !this.finished) this.avatar.play(this.walking ? 'SlackWalk' : 'ArmsOut', { fade: 0.2 });
    this.avatar.update(dt);
    if (this.fallT <= 0) this.avatar.lean(-this.dot.x * 1.6, 0, Math.abs(this.dot.x) > 0.7 ? 1.4 : 0, this.t);
    if (this.kevinOn && this.kevin.state !== 'fly') this.kevin.root.position.set(a.position.x, a.position.y + 1.74, a.position.z);
    this.kevin.update(dt);
    // The line sags under your feet.
    const len = SLACK.length + 2;
    this.segs.forEach((s, i) => {
      const z = -1 + ((i + 0.5) / this.nSegs) * len;
      const y = SLACK.height - this.sagAtLine(z);
      s.position.set(0, y - 0.04, z);
    });
    // Flags stream when a gust is coming.
    const blowing = this.gust ? (this.gust.warn > 0 ? 0.5 : 1) * this.gust.sign : 0;
    for (const fl of this.flags) { fl.f.rotation.y = blowing * 0.9 + Math.sin(this.t * 4 + fl.z) * 0.1; fl.f.position.x = 3.05 + blowing * 0.3; }
    this.water?.update(ctx.time);
    this.ripples?.step(dt);
    // Camera, low behind you.
    if (!App.dev.freeCam) {
      const cam = ctx.camera.camera;
      cam.position.set(a.position.x * 0.2, 3.1, this.z - 6.4);
      cam.lookAt(a.position.x * 0.1, 3.2, this.z + 4);
      if (cam.fov !== 46) { cam.fov = 46; cam.updateProjectionMatrix(); }
    }
  }

  sagAt(z) { return this.sagAtLine(z); }
  sagAtLine(z) {
    const span = SLACK.length + 2;
    const u = (z + 1) / span;
    const base = Math.sin(u * Math.PI) * 0.25;
    const dd = (z - this.z) / 2.4;
    return base + 0.26 * Math.exp(-dd * dd) * (this.fallT > 0 ? 0.2 : 1);
  }

  drawGame(ctx) {
    if (this.phase === 'intro') return;
    const { hud } = ctx;
    const w = Math.min(280, hud.width - 40);
    const cx = Math.round(hud.width / 2);
    const y = 34;
    this.dial = { x: cx, y: Math.round(hud.height / 2) };
    panel(hud, cx - w / 2, y - 9, w, 18, { fill: 'white', name: 'balance' });
    hud.rect(cx - 1, y - 9, 2, 18, 'mist');
    const safe = (0.45 / 1.2) * (w / 2);
    hud.rect(cx - Math.round(safe), y - 9, 2, 18, 'lime');
    hud.rect(cx + Math.round(safe) - 2, y - 9, 2, 18, 'lime');
    hud.rect(cx - w / 2, y - 9, 6, 18, 'red');
    hud.rect(cx + w / 2 - 6, y - 9, 6, 18, 'red');
    const dx = cx + (this.dot.x / 1.2) * (w / 2);
    disc(hud, dx, y, 6, 'ink');
    disc(hud, dx, y, 5, 'red');
    bar(hud, cx - w / 2, y + 12, w, 6, this.z / SLACK.length, 'cyan', 'ink', 'progress');
    if (this.gust?.warn > 0) sayCentered(hud, cx, y + 22, this.gust.sign > 0 ? 'Gust from the left!' : 'Gust from the right!', { color: 'sand', name: 'gust' });
    if (this.gust && this.gust.warn <= 0) {
      for (let i = 0; i < 6; i++) {
        const ly = 70 + i * 16;
        const lx = ((this.t * 300 + i * 90) % hud.width);
        const X = this.gust.sign > 0 ? lx : hud.width - lx;
        line(hud, X, ly, X + (this.gust.sign > 0 ? 18 : -18), ly, 'white', 1);
      }
    }
    if (App.device.last === 'mouse' && !this.autopilot) { const p = App.device.pointerArt(ctx); line(hud, this.dial.x, this.dial.y, p.x, p.y, 'white', 1); }
  }

  drawGameHud(ctx) {
    topRow(ctx.hud, `${Math.ceil(Math.max(0, SLACK.limit - this.time))}s`, `${Math.floor(this.z)} m  falls ${this.falls}`);
  }

  overlayDot() { return `x ${this.dot.x.toFixed(2)} z ${this.z.toFixed(1)}`; }
  fingerprint() { return `${this.dot.x.toFixed(6)}|${this.z.toFixed(5)}|${this.falls}`; }
  cameraTarget() { return this.head.set(0, 2, this.z ?? 0); }
}
