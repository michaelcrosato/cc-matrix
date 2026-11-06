// People: the engine's hero model, recoloured by swapping mesh materials by name, with its clips and ours.
import { HERO_MODEL, HERO_RIG, HERO_CLIPS, compileClips, setLookLayer, THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { GAME_CLIPS } from '../animation/clips.js';
const { AnimationMixer, LoopRepeat, LoopOnce } = THREE;
export const OUTFITS = {
  arai: { top: 'navy', legs: 'navy', hat: 'white', glove: 'white', shoe: 'ink' },
  benno: { top: 'orange', legs: 'orange', hat: 'night', glove: 'ink', shoe: 'ink' },
  fenn: { top: 'plum', legs: 'plum', hat: 'sand', glove: 'white', shoe: 'ink' },
  dell: { top: 'sky', legs: 'navy', hat: 'sky', glove: 'white', shoe: 'ink' },
  crew: { top: 'red', legs: 'red', hat: 'white', glove: 'ink', shoe: 'ink' },
  driver: { top: 'white', legs: 'white', hat: 'red', glove: 'red', shoe: 'ink' },
  marshal: { top: 'orange', legs: 'white', hat: 'orange', glove: 'white', shoe: 'ink' },
  hiker: { top: 'lime', legs: 'slate', hat: 'sand', glove: 'sand', shoe: 'plum' },
};
const SLOT = { Overalls: 'legs', Shirt: 'top', Hat: 'hat', Brim: 'hat', SleeveR: 'top', SleeveL: 'top', ForearmR_Mesh: 'top', ForearmL_Mesh: 'top', GloveR: 'glove', GloveL: 'glove', ThighR: 'legs', ThighL: 'legs', ShinR_Mesh: 'legs', ShinL_Mesh: 'legs', ShoeR: 'shoe', ShoeL: 'shoe' };
let compiled = null;
export const ALL_CLIPS = () => [...HERO_CLIPS.filter((c) => ['Idle', 'IdleLook', 'Walk', 'Run', 'Wave', 'Sit', 'SideFlip', 'Victory'].includes(c.name)), ...GAME_CLIPS];
export class Person {
  static async create(ctx, outfit = 'crew', o = {}) { const m = await ctx.loadModel(HERO_MODEL, { castShadow: true }); return new Person(m.scene, outfit, o); }
  constructor(root, outfit, o = {}) {
    this.root = root; const f = OUTFITS[outfit] ?? OUTFITS.crew;
    root.traverse((n) => { if (n.isMesh) { const s = SLOT[n.name]; if (s) n.material = toonMaterial(PALETTE[f[s]]); n.receiveShadow = false; n.castShadow = true; } });
    setLookLayer(root, 'actors');
    compiled ??= new WeakMap();
    this.clips = compileClips(ALL_CLIPS(), HERO_RIG, root);
    this.mixer = new AnimationMixer(root); this.actions = {}; for (const c of this.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null; if (o.scale) root.scale.setScalar(o.scale);
    this.play(o.clip ?? 'Idle');
  }
  play(name, o = {}) {
    const a = this.actions[name]; if (!a || this.currentName === name) return; const prev = this.current;
    a.reset(); a.setLoop(o.once ? LoopOnce : LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.timeScale = o.speed ?? 1; a.play();
    if (prev) prev.crossFadeTo(a, o.fade ?? 0.2, false);
    this.current = a; this.currentName = name;
  }
  update(dt) { this.mixer.update(dt); }
}
