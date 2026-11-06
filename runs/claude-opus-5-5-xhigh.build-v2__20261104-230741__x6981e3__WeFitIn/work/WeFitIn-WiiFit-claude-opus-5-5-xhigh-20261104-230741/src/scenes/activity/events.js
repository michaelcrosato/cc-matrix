// Lane events: the same code for solo classes, Family Hour and online ghosts.
import { THREE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { Dot } from '../../core/dot.js';
import { BotBrain, blankInput } from '../../core/drivers.js';
import { CLIP_NAMES } from '../../art/clips.js';
import { drawDial } from '../../ui/widgets.js';

const { Vector3 } = THREE;
const v = new Vector3();

/** Project a world point to art pixels. */
export function worldToArt(ctx, x, y, z) {
  v.set(x, y, z).project(ctx.camera.camera);
  return { x: (v.x + 1) * 0.5 * ctx.hud.width, y: (1 - v.y) * 0.5 * ctx.hud.height };
}

export class Lane {
  constructor(opts) {
    Object.assign(this, { who: null, x: 0, z: 0.8, color: 'red', isPlayer: false, isLocal: false }, opts);
    this.inp = blankInput();
    this.dot = new Dot(opts.rand);
    this.m = {};
    this.score = 0;
    this.brain = null;
    this.state = {};
    this.gone = false;
    this.dial = null;
  }

  get ghost() { return this.driver?.kind === 'ghost'; }
}

export class LaneEvent {
  kind = 'event';
  duration = 60;

  constructor(scene, lanes, rng, opts = {}) {
    this.scene = scene;
    this.ctx = scene.ctx;
    this.lanes = lanes;
    this.rng = rng;
    this.opts = opts;
    this.hard = opts.hard ?? {};
  }

  begin() { for (const l of this.lanes) this.beginLane(l); }
  beginLane() {}

  /** Fill lane.inp for this step, whoever's driving. */
  read(ctx, lane, dt, t) {
    const inp = lane.inp;
    inp.stepL = inp.stepR = inp.confirm = false;
    const d = lane.driver;
    const auto = lane.isPlayer ? App.dev.autopilot : null;
    if (d.kind === 'bot' || auto) {
      const skill = auto ?? d.skill;
      if (!lane.brain || lane.brain.skill !== skill) lane.brain = new BotBrain(skill, lane.rand);
      inp.rate = false;
      this.botInput(lane, inp, dt, t, lane.brain);
    } else if (d.kind === 'pad') d.read(inp);
    else if (d.kind !== 'ghost') d.read(inp, ctx, dt, App, lane.dial);
    return inp;
  }

  /** One fixed step for the whole event. */
  step(ctx, dt, t, scoring = true) {
    this.tick?.(ctx, dt, t, scoring);
    for (const lane of this.lanes) {
      if (lane.gone || lane.ghost) continue;
      this.read(ctx, lane, dt, t);
      this.stepLane(ctx, lane, lane.inp, dt, t, scoring);
    }
  }

  stepLane() {}
  botInput(lane, out) { out.x = out.y = 0; }
  visual() {}
  draw() {}
  scoreOf(lane) { return lane.score; }
  /** 0..1000 for the Medley. */
  normalized(lane) { return Math.max(0, Math.min(1000, Math.round(this.scoreOf(lane) * 10))); }
  /** For ghosts: what this lane's position means, sent as x and y. */
  ghostPos(lane) { return [lane.dot.x, lane.dot.y]; }
  /** For ghosts: the clip and time this lane shows. */
  clipState(lane) {
    const a = lane.avatar?.current;
    if (!a) return [0, 0];
    return [CLIP_NAMES.indexOf(a.getClip().name), a.time];
  }
  /** Show a ghost's lane: lerp, never simulate. */
  ghostVisual(lane, dt) {
    const g = lane.driver;
    g.lerp(dt);
    const av = lane.avatar;
    if (!av) return;
    const name = CLIP_NAMES[g.clip] ?? 'Idle';
    if (this.ghostScrubs?.(name)) av.scrub(name, g.clipTime);
    else av.play(name, { fade: 0.25 });
    av.update(dt);
    av.lean(g.x, g.y);
  }
  dispose() {}
}

/** The dial for a local lane. In 4-mat staging each player gets a small one over their head. */
export function drawLaneDial(ctx, event, lane, ringR, { ringX = 0, ringY = 0, inside = false, brighten = 0, target = null, fade = 1 } = {}) {
  const small = event.lanes.length >= 4 || !event.scene.centreDial;
  let x, y, r;
  if (small) {
    const p = worldToArt(ctx, lane.x, 2.2, lane.z);
    r = 24;
    x = p.x; y = Math.max(r + 16, p.y - r);
    x = Math.max(r + 14, Math.min(ctx.hud.width - r - 26, x));
  } else {
    x = Math.round(ctx.hud.width / 2); y = 56; r = 44;
  }
  lane.dial = { x, y };
  const mouse = lane.isLocal && App.device.last === 'mouse' && lane.driver.kind !== 'pad' && lane.driver.kind !== 'bot' && !App.dev.autopilot ? App.device.pointerArt(ctx) : null;
  drawDial(ctx.hud, { x, y, r, dot: lane.dot, ringR, ringX, ringY, inside, brighten, target, fade, mouse, color: lane.color });
  return { x, y, r };
}
