// After 10 seconds with no input on the title or main menu: a looping demo using the real game, god mode, bot input and teleports. Any input exits.
import { BEATS } from './beats.js';
import { Bot } from '../core/actions.js';
import { wrapAngle, clamp } from '../core/rng.js';
const IDLE_FRAMES = 600;
export class Attract {
  active = false; idleFrames = 0; beatI = 0; t = 0; gen = null; wait = 0; pred = null; keep = []; loops = 0; returnTo = null;
  constructor(game) { this.game = game; this.bot = new Bot(); }
  /** Runs in update: counts frames with no input on the title or main menu. */
  tick(ctx, inputSeen, realDt = 1 / 60) {
    const g = this.game;
    if (this.active) { if (inputSeen) this.stop(); return; }
    const top = g.ui.menu.top;
    const eligible = g.mode === 'title' && top && top.attractIdle && g.ui.menu.stack.length === 1;
    if (!eligible || inputSeen) { this.idleFrames = 0; return; }
    this.idleFrames += realDt * 60;
    if (this.idleFrames > IDLE_FRAMES + 0.5) this.start();
  }
  start() {
    const g = this.game;
    this.active = true; this.beatI = 0; this.loops = 0;
    this.returnTo = g.ui.menu.top?.id;
    g.ui.menu.clear();
    g.save.disabled = true;
    g.mode = 'attract';
    g.actions.bot = this.bot; this.bot.clear();
    g.dev.god = true; g.dev.infiniteAmmo = true; g.dev.noJams = false; g.dev.noWear = true;
    g.engineResume();
    this.beginBeat();
    g.events.emit('attract-start');
  }
  stop() {
    const g = this.game;
    if (!this.active) return;
    this.active = false;
    this.gen = null;
    g.actions.bot = null; this.bot.clear();
    g.dev.god = false; g.dev.infiniteAmmo = false; g.dev.noWear = false;
    g.ctx.engine.screen.clear();
    g.events.emit('attract-stop');
    g.resetCampaign({ keepScene: true });
    g.save.disabled = false;
    g.mode = 'title';
    g.shell.enterTitle();
    if (this.returnTo === 'main') { g.ui.menu.clear(); g.ui.menu.push(g.shell.mainMenu()); }
    this.idleFrames = 0;
    g.setupTitleScene();
  }
  beginBeat() {
    const g = this.game;
    const b = BEATS[this.beatI];
    this.cleanupBeat();
    g.resetCampaign({ keepScene: true, keepAttract: true });
    g.mode = 'attract';
    g.dev.god = true; g.dev.infiniteAmmo = true; g.dev.noWear = true;
    g.story.flags.arrived = true;
    g.body.syrettes = 5; g.body.tablets = 2;
    g.weapons.give('m38', 100, false);
    g.weapons.give('tractor', 70, true);
    g.clock.set(b.hour);
    g.clock.hour = b.hour;
    if (b.wind) g.wind.pin([b.wind[0], b.wind[1]], b.wind[2]);
    g.sky.apply(g.ctx, b.hour);
    g.sky.setWeather('clear');
    this.t = 0; this.wait = 0; this.pred = null;
    this.bot.clear();
    this.gen = b.run(g, this, this.bot);
    g.hudHidden = false;
    g.titleOverlay = !!b.title;
    g.events.emit('attract-beat', b.id);
    g.ctx.engine.screen.reveal('dither', { duration: 0.35 });
  }
  cleanupBeat() {
    const g = this.game;
    if (g.ui.menu.open) g.ui.menu.clear();
    if (g.player.seat) { if (g.driving.vehicle) g.driving.eject(); else g.player.leaveTrain(g.player.feet.x, g.player.feet.z); }
    g.map.raise(false);
    g.weapons.mounted = null;
    g.ending.endScene = true; g.scene.stop(); g.ending.endScene = false;
    if (g.ending.tableMap) { g.ctx.scene.remove(g.ending.tableMap); g.ending.tableMap = null; }
    g.map.glowScar = false;
    g.places.setTracker(false);
    this.keep = [];
    g.titleOverlay = false;
  }
  /** Fixed step: run the reel. */
  fixedUpdate(ctx, dt) {
    if (!this.active) return;
    const g = this.game, b = BEATS[this.beatI];
    this.t += dt;
    if (this.t >= b.seconds) {
      this.beatI = (this.beatI + 1) % BEATS.length;
      if (this.beatI === 0) this.loops++;
      ctx.engine.screen.cover('dither', { duration: 0.25 });
      g.after(0.28, () => { if (this.active) this.beginBeat(); });
      this.t = -1e9;
      this.gen = null;
      return;
    }
    if (!this.gen) return;
    if (this.pred) { if (!this.pred()) return; this.pred = null; }
    if (this.wait > 0) { this.wait -= dt; if (this.wait > 0) return; }
    const { value, done } = this.gen.next();
    if (done) { this.gen = null; return; }
    if (typeof value === 'number') this.wait = value;
    else if (typeof value === 'function') this.pred = value;
  }
  aimNearest() {
    const g = this.game, e = g.player.eye;
    let best = null, bd = 400;
    for (const s of g.actors.soldiers) { if (!s.active || s.dead) continue; const d = Math.hypot(s.x - e.x, s.z - e.z); if (d < bd) { bd = d; best = s; } }
    if (!best) return;
    const dx = best.x - e.x, dy = best.y + 1.2 - e.y, dz = best.z - e.z;
    const wy = Math.atan2(-dx, -dz), wp = Math.atan2(dy, Math.hypot(dx, dz));
    const rig = g.ctx.camera;
    rig.yaw += wrapAngle(wy - rig.yaw) * 0.08; rig.pitch += (wp - rig.pitch) * 0.08;
  }
  steerAlong(v, pts) {
    const bot = this.bot;
    let bd = 1e9, ti = 0, s = 0;
    for (let i = 0; i + 1 < pts.length; i++) { const d = Math.hypot(pts[i + 1][0] - v.x, pts[i + 1][1] - v.z); if (d < bd && d > 14) { bd = d; ti = i + 1; } }
    const [tx, tz] = pts[ti];
    const err = wrapAngle(Math.atan2(tx - v.x, tz - v.z) - v.yaw);
    bot.move = { x: clamp(err * 1.5, -1, 1), y: 0 };
  }
}
