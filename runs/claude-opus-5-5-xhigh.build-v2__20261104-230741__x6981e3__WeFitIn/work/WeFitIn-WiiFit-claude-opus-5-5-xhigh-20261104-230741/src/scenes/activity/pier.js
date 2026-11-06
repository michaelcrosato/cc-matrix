// Pier Jump. Side-on, three attempts, three judges with paddles.
import { RippleField, THREE, toonMaterial, PALETTE, WAVES_CALM, WaterSurface } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { Dot } from '../../core/dot.js';
import { T } from '../../core/tunables.js';
import { makeAvatar } from '../../art/avatar.js';
import { place } from '../../art/props.js';
import { LOOKS } from '../../data/classmates.js';
import { PIER } from '../../data/games.js';
import { BARKS } from '../../data/lines.js';
import { say, sayCentered } from '../../ui/font.js';
import { bar, drawDial, panel } from '../../ui/widgets.js';
import { promptBar } from '../../ui/prompts.js';
import { ActivityScene } from './base.js';
import { playerInfo } from './lanes.js';
import { setSky } from '../sets.js';

const { BoxGeometry, Mesh, Vector3 } = THREE;

export class PierActivity extends ActivityScene {
  ownCamera = true;
  focusV = new Vector3();

  async stage(ctx) {
    setSky(ctx, 14);
    const rip = new RippleField({ size: [90, 26], cells: [120, 36], center: [32, 0] });
    this.ripples = rip;
    this.water = new WaterSurface({ size: [90, 26], at: [32, 0, 0], ripples: rip, waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.cyan, foam: PALETTE.white });
    ctx.scene.add(this.water);
    // Below the waterline, side-on: a wall of sea, or the world would stop at a thin line.
    const deep = new Mesh(new BoxGeometry(600, 14, 60), toonMaterial(PALETTE.blue));
    deep.position.set(30, -7.14, -10);
    ctx.scene.add(deep);
    place(ctx, 'kettlebell-volcano', { at: [-26, -0.5, -40], scale: 0.9 });
    place(ctx, 'foam-roller-hill', { at: [30, -0.4, -40] });
    for (const [x, s] of [[6, 1.2], [14, 0.9], [46, 1.1], [56, 1.3], [-46, 1]]) place(ctx, 'palm', { at: [x, 0, -30], scale: s });
    // The pier, side-on: running up to the lip at x = 0.
    place(ctx, 'pier', { at: [-40, -0.4, 0], yaw: 90, params: { len: 40 } });
    place(ctx, 'pier', { at: [-20, -0.4, 0], yaw: 90, params: { len: 40 } });
    const lip = new Mesh(new BoxGeometry(0.5, 0.26, 3.4), toonMaterial(PALETTE.red));
    lip.position.set(-0.2, 1.22, 0);
    ctx.scene.add(lip);
    for (const [d, c] of [[18, 'sand'], [28, 'cyan'], [38, 'lime']]) {
      const buoy = new Mesh(new BoxGeometry(0.7, 1.1, 0.7), toonMaterial(PALETTE[c]));
      buoy.position.set(d, 0.3, -2.2);
      buoy.castShadow = true;
      ctx.scene.add(buoy);
      place(ctx, 'signpost', { at: [d, 0, -3], scale: 0.7 });
    }
    // The judges' raft.
    const raft = new Mesh(new BoxGeometry(8, 0.5, 2.4), toonMaterial(PALETTE.sand));
    raft.position.set(24, 0.15, -6.4);
    ctx.scene.add(raft);
    this.judges = [];
    const looks = [LOOKS.marguerite, LOOKS.june, LOOKS.coach];
    for (let i = 0; i < 3; i++) {
      const x = 21.6 + i * 2.4;
      const a = await makeAvatar(ctx, looks[i], { at: [x, 0.4, -6.4], yaw: 0, clip: 'Sit', shadow: false });
      const paddle = place(ctx, 'judge-paddle', { at: [x + 0.4, 0.4, -5.6], scale: 1.3, actor: true }).object;
      paddle.visible = false;
      this.judges.push({ a, paddle, x, y: 0.4, score: 0, shown: false });
    }
    const p = playerInfo();
    this.avatar = await makeAvatar(ctx, p.look, { at: [-30, PIER.deckY - 0.85, 0], yaw: 1.57, clip: 'TuckRun', shadow: false });
    this.dot = new Dot(() => this.rng.next());
    this.begin();
  }

  begin(practice = false) {
    this.attempt = 0;
    this.best = 0;
    this.results = [];
    this.isPractice = practice;
    this.startAttempt();
  }

  startAttempt() {
    this.stage2 = 'runup';
    this.st = 0;
    this.speed = PIER.speedLow;
    this.dot.reset();
    this.tuckT = 0;
    this.power = 0;
    this.pressed = false;
    this.ringN = 0; this.ringIn = 0;
    this.cannon = false;
    this.distance = 0;
    this.flight = PIER.flight;
    this.av().play('TuckRun', { fade: 0.2 });
    for (const j of this.judges ?? []) { j.shown = false; j.paddle.visible = false; j.a.play('Sit', { fade: 0.2 }); }
    this.waitT = 0;
    this.styleBonus = 0;
  }

  av() { return this.avatar; }

  botInput(out, dt, brain) {
    out.x = out.y = 0; out.confirm = false;
    if (!brain.p) return;
    const play = brain.play;
    if (this.stage2 === 'runup') {
      brain.lean(out, this.dot, 0, -0.6, dt);
      this.botPress ??= PIER.runup + (this.botRand.next() + this.botRand.next() - 1) * play.timing * 1.4;
      if (this.st >= this.botPress && !this.pressed) { out.confirm = true; this.botPress = undefined; }
    } else if (this.stage2 === 'flight') {
      brain.lean(out, this.dot, 0, 0, dt);
      if (this.flight - this.st < 0.25 && !this.cannon) out.confirm = true;
    }
  }

  stepPlay(ctx, dt, scoring) {
    const inp = this.readPlayer(ctx, dt, this.dial);
    this.st += dt;
    switch (this.stage2) {
      case 'runup': {
        const y = this.dot.y;
        const tuck = y >= PIER.tuck[0] && y <= PIER.tuck[1];
        this.tucked = tuck;
        this.speed = Math.max(PIER.speedLow, Math.min(PIER.speedHigh, this.speed + (tuck ? 2.2 : -0.8) * dt));
        this.dot.step(dt, inp.x, inp.y, T, { noise: App.noiseScale() });
        if (App.dev.god || this.cheatRing) { this.dot.clampTo(0, -0.6, 0.15); this.speed = PIER.speedHigh; }
        if (inp.confirm && this.st >= PIER.runup - PIER.lipWindow) this.jump(ctx); // as you reach the lip, not from halfway down the pier
        else if (this.st >= PIER.runup + PIER.lipWindow) { this.power = 0; this.leap(ctx, scoring); }
        break;
      }
      case 'flight': {
        const m = { inst: PIER.inst, noise: App.noiseScale() };
        this.dot.step(dt, inp.x, inp.y, T, m);
        const ring = App.ringOf(PIER.ring * (this.hardData.ring ?? 1));
        if (App.dev.god || this.cheatRing) this.dot.clampTo(0, 0, ring * 0.8);
        this.ringN++;
        if (Math.hypot(this.dot.x, this.dot.y) <= ring) this.ringIn++;
        if (inp.confirm && this.flight - this.st <= PIER.cannonWindow && !this.cannon) {
          this.cannon = true;
          this.avatar.play('Cannonball', { fade: 0.08 });
          this.styleBonus = 1;
          App.sfx('hop');
        }
        if (this.st >= this.flight) this.splashDown(ctx, scoring);
        break;
      }
      case 'splash':
        if (this.st >= 2.6) this.nextAttempt();
        break;
      default:
        break;
    }
  }

  jump(ctx) {
    const dt = this.st - PIER.runup;
    this.pressed = true;
    this.power = Math.max(0, 1 - Math.abs(dt) / PIER.lipWindow);
    this.leap(ctx, true);
  }

  leap(ctx) {
    this.stage2 = 'flight';
    this.st = 0;
    this.dot.reset();
    this.flight = PIER.flight + ((this.speed - PIER.speedLow) / (PIER.speedHigh - PIER.speedLow)) * 0.6;
    this.avatar.play('Fly', { fade: 0.12 });
    App.sfx('jump');
    ctx.engine.shake.add(0.15);
    this.ringFrac = 0;
    this.distance = this.distanceNow(0.5);
  }

  distanceNow(ringFrac) {
    return this.speed * (0.8 + 0.6 * this.power) * (0.6 + 0.4 * ringFrac) * T.pierBoost;
  }

  splashDown(ctx, scoring) {
    const ringFrac = this.ringN ? this.ringIn / this.ringN : 0;
    this.ringFrac = ringFrac;
    this.distance = this.distanceNow(ringFrac);
    this.stage2 = 'splash';
    this.st = 0;
    const r = { distance: this.distance, ringFrac, power: this.power, cannon: this.cannon };
    if (scoring && !this.isPractice) {
      this.results.push(r);
      this.best = Math.max(this.best, this.distance);
    }
    // Hitstop .1, slow motion for .8 s, huge particles, ripples, shake.
    if (!this.attractMode) {
      ctx.engine.hitstop(0.1);
      ctx.engine.timeScale = 0.25;
      ctx.tweens.call(0.2, () => { if (App.stack.open) return; ctx.engine.timeScale = App.dev.timeScale; });
    }
    const x = this.distance;
    ctx.particles.burst('splashBig', [x, 0.2, 0], { count: this.cannon ? 110 : 70 });
    this.ripples.splash(x, 0, this.cannon ? 2.2 : 1.4, this.cannon ? 0.32 : 0.2);
    App.sfx('splash', { volume: this.cannon ? 1 : 0.8 });
    ctx.engine.shake.add(this.cannon ? 0.7 : 0.4);
    if (!App.settings.reduceFlashes) {
      ctx.engine.screen.shockwave([x, 0.2, 0], { radius: 0.3 });
    }
    this.judge(r);
  }

  judge(r) {
    const quality = Math.min(1, r.distance / 40) * 7 + (r.cannon ? 2 : 0) + r.ringFrac;
    this.judges.forEach((j, i) => {
      j.score = Math.max(0, Math.min(10, Math.round(quality + [-1, 0, 0.5][i])));
      j.shown = true;
      j.paddle.visible = true;
      j.a.play('PaddleUp', { once: true, fade: 0.1 });
    });
    App.sfx('paddle');
    if (!this.attractMode) App.say('ounce', r.distance >= 28 ? 'That was far. I could barely read it from here.' : r.distance >= 18 ? 'A respectable splash. The fish have been told.' : this.cosmetic.pick(BARKS.fall));
  }

  nextAttempt() {
    if (this.isPractice) { this.startAttempt(); return; }
    this.attempt++;
    if (this.attempt >= PIER.attempts) { this.allDone = true; return; }
    this.startAttempt();
  }

  isOver() { return !!this.allDone; }
  playLength() { return 60; }

  result() {
    const best = Math.round(this.best * 10) / 10;
    return { score: best, seconds: this.playT, display: `${best.toFixed(1)} m` };
  }

  visual(ctx, dt) {
    const a = this.avatar.root;
    const u = this.stage2 === 'flight' ? Math.min(1, this.st / this.flight) : 1;
    if (this.stage2 === 'runup') {
      const left = PIER.runup - this.st;
      a.position.set(-left * this.speed, PIER.deckY - 0.88, 0);
      a.rotation.y = 1.57;
      this.avatar.action('TuckRun').timeScale = this.speed / 8;
    } else if (this.stage2 === 'flight') {
      const est = this.distanceNow(this.ringN ? this.ringIn / this.ringN : 0.5);
      a.position.x = est * u;
      a.position.y = PIER.deckY - 0.88 + Math.sin(u * Math.PI) * 4.2 - u * (PIER.deckY - 0.5);
      a.position.z = 0;
    } else if (this.stage2 === 'splash') {
      a.position.set(this.distance, Math.max(-1.7, 0.1 - this.st * 2.6), 0);
    }
    this.avatar.update(dt);
    if (this.stage2 === 'flight') this.avatar.lean(this.dot.x * 2, this.dot.y, 0, this.t);
    else if (this.stage2 === 'runup') this.avatar.lean(0, this.dot.y * 0.6, 0, this.t);
    for (const j of this.judges) j.a.update(dt);
    this.water?.update(ctx.time);
    this.ripples?.step(dt);
    this.focusV.set(a.position.x + 5, 3.4, 0);
    if (this.stage2 === 'runup') this.focusV.x = a.position.x + 7;
  }

  cameraTarget() { return this.focusV; }

  drawGame(ctx) {
    if (this.phase === 'intro') return;
    const { hud } = ctx;
    const cx = Math.round(hud.width * 0.5);
    const cy = 56;
    this.dial = { x: cx, y: cy };
    const mouse = App.device.last === 'mouse' && !this.autopilot ? App.device.pointerArt(ctx) : null;
    if (this.stage2 === 'runup') {
      // The tuck zone, low on the dial: hold the Dot in it to build speed.
      const r = 40;
      drawDial(hud, { x: cx, y: cy, r, dot: this.dot, ringR: 0.2, ringY: -0.6, inside: this.tucked, brighten: this.tucked ? 1 : 0, mouse });
      bar(hud, cx - r, cy + r + 5, r * 2, 6, (this.speed - PIER.speedLow) / (PIER.speedHigh - PIER.speedLow), 'orange', 'ink', 'speed');
      sayCentered(hud, cx, cy + r + 13, `${this.speed.toFixed(1)} m/s`, { color: 'white', name: 'speed-label' });
      const left = PIER.runup - this.st;
      if (left < 1 && left > -PIER.lipWindow) {
        const on = Math.abs(left) < PIER.lipWindow;
        promptBar(hud, App.device, [['confirm', on ? 'NOW' : 'Jump']], { y: cy + r + 26 });
      }
    } else if (this.stage2 === 'flight') {
      const r = 40;
      const ring = App.ringOf(PIER.ring * (this.hardData.ring ?? 1));
      drawDial(hud, { x: cx, y: cy, r, dot: this.dot, ringR: ring, inside: Math.hypot(this.dot.x, this.dot.y) <= ring, mouse });
      const inWindow = this.flight - this.st <= PIER.cannonWindow;
      if (inWindow && !this.cannon) promptBar(hud, App.device, [['confirm', 'Cannonball!']], { y: cy + r + 10 });
    } else if (this.stage2 === 'splash') {
      panel(hud, cx - 70, 24, 140, 56, { fill: 'white', name: 'pier-result' });
      sayCentered(hud, cx, 30, `${this.distance.toFixed(1)} m`, { scale: 3, color: 'ink', shadow: false, name: 'distance' });
      let jx = cx - 48;
      for (const j of this.judges) {
        if (j.shown) { hud.rect(jx, 56, 24, 18, 'navy'); sayCentered(hud, jx + 12, 60, String(j.score), { color: 'white', shadow: false, name: 'paddle' }); }
        jx += 36;
      }
    }
    const marks = [`Attempt ${Math.min(this.attempt + 1, PIER.attempts)} of ${PIER.attempts}`, `Best ${this.best.toFixed(1)} m`];
    hud.rect(10, 10, 120, 25, 'navy');
    say(hud, 13, 12, marks[0], { name: 'attempt' });
    say(hud, 13, 23, marks[1], { color: 'sand', name: 'attempt-best' });
  }

  overlayDot() { return `${this.stage2} v ${this.speed.toFixed(1)} p ${this.power.toFixed(2)}`; }
  fingerprint() { return `${this.best.toFixed(4)}|${this.attempt}|${this.dot.x.toFixed(5)}`; }
}
