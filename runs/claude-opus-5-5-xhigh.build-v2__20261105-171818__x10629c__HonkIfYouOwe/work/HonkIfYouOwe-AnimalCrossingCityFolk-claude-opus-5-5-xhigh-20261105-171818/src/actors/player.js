// The player: movement in fixedUpdate on our own tile collision; presentation in update.
import { THREE } from '../engine.js';
import { Actor } from './rig.js';
import { avatarDef } from '../art/critter.js';
import { moveWithCollision, circleBlocked } from '../world/place.js';
import { tuning } from '../dev/tuning.js';
import { ITEMS } from '../data/items.js';
import { calendarNow } from '../systems/time.js';

let avatarSerial = 0;
export function lookDef(look) {
  avatarSerial++;
  const outfit = ITEMS[look.outfit];
  const hatItem = look.hatItem ? ITEMS[look.hatItem] : null;
  const glassesItem = look.glassesItem ? ITEMS[look.glassesItem] : null;
  return avatarDef({
    ...look,
    shirt: outfit?.shirt ?? look.shirt ?? 'blue',
    trim: outfit?.trim ?? look.trim ?? 'white',
    hat: hatItem?.hat ?? null, hatColor: hatItem?.hatColor, hatTrim: hatItem?.hatTrim,
    glasses: glassesItem?.glasses ?? null, glassesColor: glassesItem?.glassesColor,
  }, `avatar-${avatarSerial}`);
}
export class Player extends Actor {
  constructor(g) {
    super(lookDef(g.world?.player.look ?? { hair: 0 }), { name: 'player', seed: 3 });
    this.g = g;
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.gait = 'Idle';
    this.walkTarget = null;
    this.walkPath = null;
    this.walkThen = null;
    this.locked = false; // a tool pose holds the player still
    this.stepT = 0;
    this.poseTimer = 0;
    this.poseClip = null;
    this.moving = false;
    this.lastMoveAt = 0;
    this.lastStopSquash = 0;
    this.trail = 0;
  }
  applyLook() {
    const look = this.g.world.player.look;
    this.setModel(lookDef(look));
    if (look.pattern != null) this.g.applyPatternShirt?.(this, look.pattern);
    this.held = null; if (this.heldDef) this.hold(this.heldDef, this.heldBuild);
    this.sitting = false;
  }
  /** Fixed-step movement. Returns whether the player moved. */
  fixedStep(dt) {
    const g = this.g;
    const inp = g.ctx.input;
    const place = g.place;
    if (!place || !g.canAct()) { this.speed = 0; this.vx = 0; this.vz = 0; return; }
    if (this.locked || this.poseTimer > 0) { this.speed = 0; return; }
    const axis = inp.moveAxis();
    const padTilt = Math.hypot(inp.padAxis.x, inp.padAxis.y);
    let mx = axis.x, mz = axis.y;
    let mag = Math.min(1, Math.hypot(mx, mz));
    const { right, forward } = g.ctx.camera.groundBasis();
    let dx = right.x * mx + forward.x * mz;
    let dz = right.z * mx + forward.z * mz;
    if (mag > 0.05) { this.cancelWalk(); }
    // Mouse: click to walk, hold to follow
    const wt = this.walkTarget;
    if (mag <= 0.05 && wt) {
      if (this.walkPath && this.walkPath.length) {
        const n = this.walkPath[0];
        const d = Math.hypot(n[0] - this.x, n[2] - this.z);
        if (d < 0.3) { this.walkPath.shift(); }
      }
      const tgt = this.walkPath && this.walkPath.length ? [this.walkPath[0][0], this.walkPath[0][2]] : [wt.x, wt.z];
      const ddx = tgt[0] - this.x, ddz = tgt[1] - this.z;
      const dist = Math.hypot(ddx, ddz);
      const reach = wt.stop ?? 0.15;
      const last = !this.walkPath || this.walkPath.length <= 1;
      const remain = Math.hypot(wt.x - this.x, wt.z - this.z);
      if (last && remain <= reach) {
        const then = this.walkThen;
        this.cancelWalk();
        then?.(g);
      } else if (dist > 0.001) {
        dx = ddx / dist; dz = ddz / dist; mag = 0.95;
      }
    }
    const running = g.inp.running;
    const sneaking = g.inp.sneaking;
    let speed = 0;
    if (mag > 0.05) {
      if (padTilt > 0.05) speed = padTilt < 0.45 ? 1.2 : padTilt < 0.85 ? tuning.walkSpeed : tuning.jogSpeed;
      else speed = mag > 0.05 ? tuning.jogSpeed : 0;
      if (running) speed = tuning.runSpeed;
      if (sneaking) speed = 1.2;
      if (g.heldNet) speed = Math.min(speed, tuning.walkSpeed * 0.75);
      if (g.world.player.buffUntil > g.absMinute() && speed >= tuning.jogSpeed) speed *= 1.25;
      if (g.pushing) speed = Math.min(speed, tuning.walkSpeed);
    }
    this.speed = speed;
    if (speed > 0) {
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      this.turnTo = Math.atan2(dx, dz);
      const moved = moveWithCollision(place, this, dx * speed * dt, dz * speed * dt, 0.28);
      if (!moved) this.speed = 0;
      this.y = place.height(this.x, this.z);
      this.vx = dx * speed; this.vz = dz * speed;
    } else { this.vx = 0; this.vz = 0; }
    const w = g.world.player;
    w.x = this.x; w.z = this.z; w.facing = this.facing;
  }
  walkTo(x, z, { stop = 0.15, then = null, path = true } = {}) {
    this.walkTarget = { x, z, stop };
    this.walkThen = then;
    const place = this.g.place;
    this.walkPath = null;
    if (path && place.nav) {
      const p = place.nav.path([this.x, 0, this.z], [x, 0, z]);
      if (p) this.walkPath = p.slice(1);
    }
  }
  cancelWalk() { this.walkTarget = null; this.walkPath = null; this.walkThen = null; }
  /** Play a tool or verb pose: the player stands still while it runs. */
  pose(name, duration = null, { fade = 0.08, speed = 1 } = {}) {
    this.play(name, fade, { once: true, speed });
    const clip = this.byName.get(name);
    this.poseTimer = duration ?? (clip ? clip.duration / speed : 0.5);
    this.poseClip = name;
  }
  presentation(dt) {
    const g = this.g;
    if (this.poseTimer > 0) {
      this.poseTimer -= dt;
      if (this.poseTimer <= 0) { this.poseClip = null; this.current = this.current; }
    }
    if (!this.poseClip && !this.locked && !this.sitting) {
      let clip = 'Idle';
      let rate = 1;
      if (this.speed > 0.1) {
        if (g.pushing) { clip = 'PushSnow'; rate = 1; }
        else if (this.speed <= 1.4) { clip = 'Tiptoe'; rate = this.speed / 1.2; }
        else if (this.speed <= tuning.walkSpeed + 0.2) { clip = 'Walk'; rate = this.speed / 2.6; }
        else if (this.speed <= tuning.jogSpeed + 0.2) { clip = 'Jog'; rate = this.speed / 4.2; }
        else { clip = 'Run'; rate = this.speed / 6; }
      } else if (g.heldNet) clip = 'NetReady';
      else if (g.idleTime > 12) clip = 'IdleBored';
      if (this.playing !== clip || this.current?.once) this.play(clip, 0.12, { speed: rate });
      else if (this.current) this.current.action.timeScale = rate;
    }
    // An umbrella when it rains, if you own one and your hands are free
    const wet = g.sky?.kind === 'rain' || g.sky?.kind === 'storm';
    const umb = g.world.player.look.umbrella ? ITEMS[g.world.player.look.umbrella] : null;
    this.setUmbrella(wet && umb && g.place?.kind !== 'room' ? { a: umb.a, b: umb.b } : null, wet && umb && g.world.player.look.pattern != null ? g.patternMaterialFor?.(g.world.player.look.pattern) : null);
    // stop squash & footsteps
    if (this.speed > 0.1) {
      this.moving = true;
      this.stepT += dt * (this.speed > 3 ? this.speed * 0.6 : this.speed * 0.9);
      if (this.stepT > 1) {
        this.stepT = 0;
        g.footstep?.();
        if (this.speed > 3.5) g.dust?.(this.x, this.y, this.z);
      }
    } else if (this.moving) {
      this.moving = false;
      this.squashV = -1.2;
    }
    this.update(dt);
  }
}
export { circleBlocked };
export const usedCalendarNow = calendarNow;
