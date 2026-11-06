// People are the engine's hero, recoloured by swapping mesh materials by name. Overalls, suits, and the four of the cast.
import { compileClips, HERO_CLIPS, HERO_MODEL, HERO_RIG, PALETTE, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { GAME_CLIPS } from '../models/clips.js';
const { AnimationMixer, BoxGeometry, Mesh } = THREE;
const LOOKS = {
  arai: { shirt: 'navy', legs: 'navy', hat: 'ink', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'sand' },
  benno: { shirt: 'orange', legs: 'orange', hat: 'night', shoes: 'ink', face: 'sand', gloves: 'slate' },
  fenn: { shirt: 'white', legs: 'night', hat: 'night', shoes: 'plum', face: 'sand', gloves: 'sand' },
  dell: { shirt: 'teal', legs: 'slate', hat: 'teal', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'sand' },
  crew: { shirt: 'red', legs: 'white', hat: 'red', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'ink' },
  crew2: { shirt: 'blue', legs: 'white', hat: 'blue', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'ink' },
  driver: { shirt: 'red', legs: 'red', hat: 'white', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'white' },
  marshal: { shirt: 'orange', legs: 'white', hat: 'white', shoes: 'ink', face: 'sand', noMoustache: true, gloves: 'white' },
};
const SLOTS = { Overalls: 'legs', ThighR: 'legs', ShinR_Mesh: 'legs', ThighL: 'legs', ShinL_Mesh: 'legs', Shirt: 'shirt', SleeveR: 'shirt', ForearmR_Mesh: 'shirt', SleeveL: 'shirt', ForearmL_Mesh: 'shirt', Hat: 'hat', Brim: 'hat', ShoeR: 'shoes', ShoeL: 'shoes', GloveR: 'gloves', GloveL: 'gloves', ButtonR: 'gloves', ButtonL: 'gloves' };
export const ALL_CLIPS = [...HERO_CLIPS, ...GAME_CLIPS];
export class Person {
  constructor(model, look) {
    this.object = model; this.mixer = new AnimationMixer(model); this.actions = new Map(); this.current = null;
    const L = LOOKS[look] ?? LOOKS.crew;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      const slot = SLOTS[o.name];
      if (slot && L[slot]) o.material = toonMaterial(PALETTE[L[slot]]);
      if (L.noMoustache && o.name === 'Moustache') o.visible = false;
    });
    setLookLayer(model, 'actors');
    for (const clip of compileClips(ALL_CLIPS, HERO_RIG, model)) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }
  play(name, { fade = 0.2, once = false, speed = 1 } = {}) {
    const a = this.actions.get(name); if (!a || a === this.current) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = speed; a.enabled = true; a.setEffectiveWeight(1);
    if (this.current) this.current.crossFadeTo(a, fade, false);
    a.play(); this.current = a;
  }
  update(dt) { this.mixer.update(dt); }
  attachProp(handName, mesh) { let hand = null; this.object.traverse((o) => { if (o.name === handName) hand = o; }); hand?.add(mesh); return mesh; }
}
export async function makePerson(ctx, look) { const m = await ctx.loadModel(HERO_MODEL, { castShadow: true }); return new Person(m.scene, look); }
export const flagProp = (colour = 'red') => { const m = new Mesh(new BoxGeometry(0.9, 0.5, 0.04), toonMaterial(PALETTE[colour])); m.position.set(0.45, -0.1, 0); return m; };
