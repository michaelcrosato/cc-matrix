// The Long Stand: the plaza at golden hour, everyone watching. Stillness scoring on a data timeline; no way to fail.
import { StillActivity } from './still.js';
import { buildIsland, place } from '../../art/world.js';
import { makeAvatar, playerLook, NPC_LOOKS } from '../../art/avatar.js';
import { Menu } from '../../ui/widgets.js';
import { say } from '../../ui/font.js';
import { T } from '../../core/tunables.js';
import { THREE, Precipitation, applySky, skyAt, buildModel } from '../../../pixel-engine.js';
import { MODELS } from '../../art/models.js';

export const TIMELINE = [
  { t: 0, id: 'stand', ring: 0.4 }, { t: 10, id: 'kevin' }, { t: 20, id: 'sneeze' }, { t: 30, id: 'ring2', ring: 0.34 }, { t: 35, id: 'rain' }, { t: 45, id: 'clap' },
  { t: 50, id: 'ring3', ring: 0.28 }, { t: 55, id: 'june' }, { t: 65, id: 'rumble' }, { t: 75, id: 'sun', ring: 0.24 }, { t: 85, id: 'kevinLeaves' }, { t: 90, id: 'end' },
];
export const LS_SECS = 90;
export class LongStandActivity extends StillActivity {
  constructor(app, args) { super(app, { ...args, pose: { clip: 'Idle', ring: 0.4, twist: 'none', hold: LS_SECS, breath: 0 }, hold: LS_SECS }); }
  get duration() { return LS_SECS; }
  goal() { return 'Stand. That is all. Everything else on the island will try to stop you.'; }
  controls() { return [['lean', 'Lean']]; }
  laneSpecs() { return [{ kind: 'local', name: this.S?.name ?? 'You', look: playerLook(this.S) }]; }
  segment() { return 'hold'; }
  practiceDone() { return true; }
  async build(ctx) { this.fired = new Set(); this.ringNow = 0.4; this.bias = 0; this.noiseMul = 1; this.rainOn = false; this.junes = null; await super.build(ctx); }
  classroom(ctx) {
    this.world = buildIsland(ctx); applySky(ctx.engine, skyAt(17.5));
    this.kevin = buildModel('kevin', { catalog: MODELS }).object; this.kevin.scale.setScalar(0.7); this.kevin.position.set(4, 3, -2); ctx.scene.add(this.kevin);
    this.rain = new Precipitation({ kind: 'rain', count: 2500 }); this.rain.intensity = 0; ctx.scene.add(this.rain);
    this.npcs = {};
    ctx.particles.register('sweat', { count: [3, 5], life: [0.4, 0.8], speed: [1, 2], gravity: 4, size: [1, 1], colors: ['cyan', 'sky', 'white'] });
    ctx.particles.register('confetti', { count: [10, 16], life: [0.8, 1.4], speed: [2, 5], gravity: 6, size: [1, 1], colors: ['red', 'sand', 'lime', 'sky', 'white', 'plum'] });
    ctx.particles.register('zen', { count: [1, 1], life: [2, 3], speed: [0.1, 0.25], gravity: -0.05, size: [1, 1], colors: ['white', 'sky', 'mist'] });
    this.motes = ctx.random.fork('motes');
  }
  async stageExtra(ctx) {
    const mk = async (id, at, clip, yaw) => { const a = await makeAvatar(ctx, NPC_LOOKS[id]); a.setPos(at[0], at[1], at[2], yaw); a.addTo(ctx.scene); a.play(clip); this.npcs[id] = a; };
    await mk('dennis', [-3.2, 0, 1.2], 'Idle', 0.5); await mk('marguerite', [3.0, 0.0, 1.4], 'Idle', -0.5); await mk('june', [1.6, 0, 2.4], 'Idle', -0.2);
    this.coach.setPos(-1.8, 0, 2.2, 0.3); this.coach.shadow.place(-1.8, 0, 2.2, 0); this.coach.play('Idle');
    this.me.avatar.play('Idle');
    this.sneezeT = 0;
    for (const l of this.lanes) l.st = { in: 0, t: 0, inT: 0, was: true, s: 0, bm: 0, bt: 0, outT: 0 };
  }
  resetLanes() { super.resetLanes(); this.fired = new Set(); this.ringNow = 0.4; this.bias = 0; this.noiseMul = 1; }
  ringBase() { return this.ringNow ?? 0.4; }
  poseLane(l) { l.avatar.play('Idle'); }
  fire(ev) {
    const app = this.app, me = this.me, ctx = this.ctx;
    switch (ev.id) {
      case 'stand': this.bark('coach', 'Stand.', 2.5); break;
      case 'kevin': this.bias = 0.1; this.kevinOn = true; app.sfx('squawk'); this.bark('ounce', 'Kevin has landed on you. He is staff. Carry on.', 3); break;
      case 'sneeze': me.dot.impulse(0, -0.6); app.sfx('sneeze'); this.npcs.dennis.play('Sneeze', { loop: false }); this.bark('dennis', 'Sorry. It\'s fine. It\'s just the one nose.', 2.6); break;
      case 'ring2': break;
      case 'rain': this.rainOn = true; this.noiseMul = 1.2; app.sfx('gust'); break;
      case 'clap': this.npcs.marguerite.play('SlowClap'); this.bark('ounce', 'Ignore her.', 2); app.sfx('clap'); break;
      case 'ring3': break;
      case 'june': this.junes = { t: 0 }; this.bark('june', 'Are you nearly done?', 3); break;
      case 'rumble': ctx.engine.shake.add(0.7); app.sfx('rumble'); me.dot.impulse((this.rr.range(-1, 1)) * 0.5, this.rr.range(-1, 1) * 0.5); this.bark('ounce', 'That was the volcano. It is dormant. Mostly.', 3); break;
      case 'sun': this.rainOn = false; this.noiseMul = 1; applySky(ctx.engine, skyAt(18)); app.sfx('fanfare2'); app.music('longstand'); break;
      case 'kevinLeaves': this.bias = 0; this.kevinOn = false; me.dot.impulse(0.3, 0.2); app.sfx('squawk'); break;
      case 'end': this.bark('coach', 'You may blink.', 3); break;
    }
    if (ev.ring) this.ringNow = ev.ring;
  }
  onPlayStart() { this.rr = this.ctx.random.fork('ls'); this.fired = new Set(); this.ringNow = 0.4; this.app.music('longstand'); }
  mods(l, t) {
    const m = { noise: this.noiseMul ?? 1 };
    if (this.bias) m.bx = this.bias * T.gustForce / 1.6;
    return m;
  }
  laneStep(l, inp, dt, practice) {
    if (this.phase === 'play') for (const ev of TIMELINE) if (this.playT >= ev.t && !this.fired.has(ev.id)) { this.fired.add(ev.id); this.fire(ev); }
    super.laneStep(l, inp, dt, practice);
  }
  frameTick(ctx, dt) {
    super.frameTick(ctx, dt); this.world.update(dt);
    for (const a of Object.values(this.npcs)) a.update(dt);
    const head = this.me.avatar.root.position;
    this.kevin.position.set(this.kevinOn ? head.x : 5, this.kevinOn ? 2.05 : 3 + Math.sin(this.t) * 0.1, this.kevinOn ? head.z : -2);
    this.rain.intensity += ((this.rainOn ? 1 : 0) - this.rain.intensity) * Math.min(1, dt * 0.8); this.rain.update(dt, head);
    if (this.junes) { this.junes.t += dt; if (this.junes.t > 6) this.junes = null; }
  }
  extraFrame() {}
  classroomTags() {}
  drawTags() {}
  drawPlay(hud) {
    const me = this.me, w = hud.width;
    this.drawDial(hud, me, this.ringOf(this.ringBase()));
    say(hud, 12, 12, 'The Long Stand', { color: 'white' });
    say(hud, w - 12, 12, `${Math.max(0, Math.ceil(LS_SECS - this.playT))}s`, { anchor: 'r', color: 'white', scale: 2 });
    say(hud, 12, 24, `${Math.round(me.score)}%`, { color: 'sand', scale: 2 });
    if (this.junes) { const d = this.dialFor(hud, me); say(hud, d.cx - 60 + this.junes.t * 22, d.cy + d.r + 14, 'Are you nearly done?', { color: 'mist' }); }
  }
  onResults() {
    const app = this.app;
    this.menu = new Menu([{ label: 'Continue', onSelect: () => app.go('ending', { stars: this.result.stars }) }], { w: 170, rowH: 17, name: 'results' });
    if (this.result.stars === 0) this.resultLine = 'You stood. Sort of.';
  }
  dispose(ctx) { this.rain?.dispose?.(); super.dispose?.(ctx); }
}
