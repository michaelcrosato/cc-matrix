// Full-body masked figures for wide shots. Pivots carry the hero rig's joint names, so the engine's
// HERO_CLIPS play on them through compileClips and a three.js mixer.
import { buildModel, compileClips, HERO_CLIPS, HERO_RIG, setLookLayer, THREE } from '../../pixel-engine.js';
import { FIGURES } from '../content/models/cast.js';

const { AnimationMixer, LoopOnce, LoopRepeat } = THREE;
const USED = new Set(['Idle', 'IdleLook', 'Walk', 'Wave', 'Sit', 'Shout', 'Victory', 'Hurt', 'HitReact', 'LieIdle', 'Death', 'Grab', 'Triumph', 'Run', 'Sleep', 'Crouch']);
const CLIPDEFS = HERO_CLIPS.filter((c) => USED.has(c.name));

export class Figure {
  constructor(ctx, who, at = [0, 0, 0], yaw = 0, clip = 'Idle') {
    const b = buildModel(FIGURES[who] ?? FIGURES.extra);
    this.object = b.object;
    this.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
    this.object.position.set(...at);
    this.object.rotation.y = yaw;
    setLookLayer(this.object, 'actors');
    ctx.scene.add(this.object);
    this.mixer = new AnimationMixer(this.object);
    this.clips = Object.fromEntries(compileClips(CLIPDEFS, HERO_RIG, this.object).map((c) => [c.name, c]));
    this.action = null;
    this.play(clip);
    this.mixer.update(Math.random() * 2);
  }
  play(name, { once = false, fade = 0.2 } = {}) {
    const clip = this.clips[name] ?? this.clips.Idle;
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    if (this.action === a) return;
    a.reset();
    a.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.play();
    if (this.action) this.action.crossFadeTo(a, fade, false);
    this.action = a;
  }
  update(dt) { this.mixer.update(dt); }
}
