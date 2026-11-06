// Attract mode. A director with a list of beats, the real game with cheats. Its only job is to show the demo.
import { BEATS } from './beats.js';
const COVER = 0.45;
export class Attract {
  active = false; i = 0; t = 0; dur = 12; transitioning = false; loops = 0; order = BEATS;
  constructor(game) { this.game = game; }
  start() {
    const g = this.game;
    this.active = true; this.i = -1; this.loops = 0; this.returnTo = g.ui.top?.id ?? 'press';
    g.ui.clear(); g.mode = 'attract'; g.save.disabled = true; g.demoTag = true; g.ctx.engine.timeScale = 1;
    Object.assign(g.cheats, { god: true, infiniteAmmo: true, noFever: false, noJams: false, invisible: false, noclip: false });
    g.resetCampaignStateForDemo();
    g.events.emit('attractStart');
    this.next();
  }
  /** One step on; a transition joins the beats. */
  next() {
    if (this.i < 0) { this.swap(); return; }
    this.transitioning = true; this.coverT = COVER; this.game.ctx.engine.screen.cover('dither', { duration: COVER }); this.game.events.emit('attractCover');
  }
  swap() {
    const g = this.game, prev = BEATS[this.i];
    prev?.end?.(g); this.current = null;
    this.i = (this.i + 1) % BEATS.length; if (this.i === 0) this.loops++;
    this.cleanse();
    const b = { ...BEATS[this.i] }; this.current = b; this.t = 0; this.dur = 12;
    g.world.setHour(b.hour, true);
    b.run(g, b);
    g.ctx.engine.screen.reveal('dither', { duration: COVER });
    this.beatsSeen = (this.beatsSeen ?? 0) + 1;
  }
  cleanse() {
    const g = this.game;
    g.bot.reset(); g.talk.clear(); g.cam.override = null; g.world.fire.regrowAll?.(); g.world.land.paintAll(); g.world.burnDirty = true; g.world.pinWind(null); g.world.setWeather('clear');
    g.setRiding(null); if (g.player.vehicle) g.vehicles.exit(true); g.vehicles.clear(); g.actors.clear(); g.buddies.clear(); g.combat.clear(); g.projectiles.clear(); g.player.mapUp = false; g.tracker.setUp(false); g.body.feverActive = false; g.body.fever = 0;
    for (const s of Object.values(g.world.sites)) { s.live = false; s.actors = []; }
    g.player.hp = 100; g.player.burning = 0; g.player.surgery = null; g.player.downT = 0;
  }
  fixed(dt) {
    if (!this.active) return;
    if (this.transitioning) { this.coverT -= dt; if (this.coverT <= 0) { this.transitioning = false; this.swap(); } return; }
    this.t += dt;
    this.current?.tick?.(this.t);
    if (this.t >= this.dur && !this.transitioning) this.next();
  }
  stop() {
    const g = this.game; if (!this.active) return;
    BEATS[this.i]?.end?.(g); this.active = false; this.transitioning = false; g.ctx.engine.screen.clear(); this.cleanse();
    g.demoTag = false; g.save.disabled = false; Object.assign(g.cheats, { god: false, infiniteAmmo: false, noFever: false, noJams: false });
    g.world.reset();
    g.enterTitle(this.returnTo === 'main' ? 'main' : 'press');
  }
}
