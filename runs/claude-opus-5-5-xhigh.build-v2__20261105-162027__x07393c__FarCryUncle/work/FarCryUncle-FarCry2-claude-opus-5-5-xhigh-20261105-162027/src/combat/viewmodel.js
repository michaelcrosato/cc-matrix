// The hands and what they hold: one model on a custom rig, parented to the camera, played with the engine's clips.
import { THREE, buildModel, compileClips, setLookLayer, toonMaterial, glowMaterial, PALETTE } from '../../pixel-engine.js';
import { handsDef, HANDS_CLIPS, HANDS_RIG, GUN_PARTS } from '../art/viewmodels.js';
import { WEAPONS } from '../content/weapons.js';
import { clamp, lerp } from '../core/rng.js';
const { AnimationMixer, LoopOnce, LoopRepeat, Group, Vector3, Euler } = THREE;
const PROPS = ['p-syrette', 'p-pliers', 'p-bullet', 'p-knife', 'p-lighter', 'p-flame', 'p-wrench', 'p-bottle', 'p-charge', 'p-det', 'p-tablet', 'p-finish', 'p-trk', 'led-off', 'led-on', 'p-mono', 'p-pill', 'w-arm', 'w-burn', 'w-thigh'];
const HOLD = { rifle: 'HoldRifle', pistol: 'HoldPistol', tube: 'HoldTube', melee: 'HoldMelee', none: 'HoldNone' };
export class ViewModel {
  gunId = null; holdName = 'HoldNone'; action = null; actionName = ''; kick = 0; kickRot = 0; adsT = 0; flash = 0; propsOn = new Set(); flame = 0; playCounts = {};
  constructor(game) { this.game = game; }
  build(ctx) {
    const b = buildModel(handsDef);
    this.root = b.object;
    this.group = new Group();
    this.group.add(this.root);
    setLookLayer(this.group, 'actors');
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    ctx.scene.add(ctx.camera.camera);
    ctx.camera.camera.add(this.group);
    this.named = {};
    this.root.traverse((o) => { if (o.name) this.named[o.name] = o; });
    this.clips = {};
    for (const c of compileClips(HANDS_CLIPS, HANDS_RIG, this.root)) this.clips[c.name] = c;
    this.mixer = new AnimationMixer(this.root);
    this.actions = {};
    for (const [name, clip] of Object.entries(this.clips)) { const a = this.mixer.clipAction(clip); this.actions[name] = a; }
    this.hold(this.holdName, 0);
    this.hideAll();
    // Muzzle flash: a hot little star at the end of whatever is in your hand.
    const flash = new THREE.Group();
    for (const [w, h, d, c] of [[0.1, 0.03, 0.03, PALETTE.white], [0.03, 0.1, 0.03, PALETTE.sand], [0.05, 0.05, 0.14, PALETTE.orange]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowMaterial(c)); m.frustumCulled = false; m.castShadow = false; flash.add(m); }
    flash.visible = false;
    setLookLayer(flash, 'actors');
    this.named.Weapon.add(flash);
    this.flashObj = flash;
    // The map: DataTexture plane, drawn by world/map-texture.js, under MapJ.
    this.mapJoint = this.named.MapJ;
    this.named.Leg.visible = false; this.mapJoint.visible = false;
    for (const p of PROPS) if (this.named[p]) this.named[p].visible = false;
  }
  attach(cam) { cam.add(this.group); }
  hideAll() {
    for (const id of Object.keys(GUN_PARTS)) for (const pre of ['g-', 'rust-', 'tape-', 'm-', 'b-']) { const n = this.named[`${pre}${id}`]; if (n) n.visible = false; }
    for (const p of this.propsOn) if (this.named[p]) this.named[p].visible = false;
    this.propsOn.clear();
  }
  setVisible(v) { this.group.visible = v; }
  showGun(id, withEquip) {
    this.hideAll();
    this.gunId = id;
    if (!id) { this.hold('HoldNone', 0.15); return; }
    for (const pre of ['g-', 'm-', 'b-']) { const n = this.named[`${pre}${id}`]; if (n) n.visible = true; }
    const def = WEAPONS[id];
    this.hold(HOLD[def?.cls ?? 'rifle'] ?? 'HoldRifle', 0.12);
    if (withEquip) this.play('Equip');
    this.updateWear(true);
  }
  showProp(...names) {
    this.hideAll();
    this.gunId = null;
    for (const p of names) { if (this.named[p]) { this.named[p].visible = true; this.propsOn.add(p); } }
  }
  /** Rust and tape parts follow the condition of the gun: the only condition readout that counts. */
  updateWear(force) {
    const id = this.gunId; if (!id) return;
    const cond = this.game.weapons.gun?.cond ?? 100;
    const r = this.named[`rust-${id}`], t = this.named[`tape-${id}`];
    if (r) r.visible = cond < 60; if (t) t.visible = cond < 30;
  }
  hold(name, fade = 0.2) {
    const next = this.actions[name];
    if (!next) return;
    if (this.holdName === name && next.isRunning()) return;
    const prev = this.actions[this.holdName];
    next.reset().setLoop(LoopRepeat).play();
    if (prev && prev !== next) { if (this.action) { prev.stop(); next.setEffectiveWeight(this.action ? 0 : 1); } else prev.crossFadeTo(next, fade, false); }
    this.holdName = name;
  }
  /** A one-shot over the hold. Back to the hold when it ends. */
  play(name, { speed = 1, fade = 0.06, keep = false, onEnd } = {}) {
    const a = this.actions[name];
    if (!a) return 0;
    this.playCounts[name] = (this.playCounts[name] ?? 0) + 1;
    const cur = this.action ?? this.actions[this.holdName];
    a.reset();
    const loop = this.clips[name].tracks.length && /(MapHold|TrackerUp|Wrench|Open)$/.test(name);
    a.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    a.play();
    if (cur && cur !== a) { cur.crossFadeTo(a, fade, false); }
    this.action = a; this.actionName = name; this.keepAction = keep; this.onEnd = onEnd ?? null;
    return this.clips[name].duration / speed;
  }
  endAction(fade = 0.15) {
    const a = this.action; if (!a) return;
    const h = this.actions[this.holdName];
    h.enabled = true; h.setEffectiveWeight(1); h.play();
    a.crossFadeTo(h, fade, false);
    this.action = null; this.actionName = ''; this.keepAction = false;
    const f = this.onEnd; this.onEnd = null;
    f?.();
  }
  fire() {
    this.kick = 1; this.flash = 1;
    const id = this.gunId;
    const parts = GUN_PARTS[id];
    if (parts?.muzzle && !WEAPONS[id]?.stream) { this.flashObj.position.set(...parts.muzzle); this.flashObj.rotation.z = this.game.rng.fx.range(0, 3); this.flashObj.visible = true; }
    if (id === 'mule' || id === 'empire') this.pumpAfter = 0.32;
  }
  update(ctx, dt, realDt) {
    const g = this.game;
    this.mixer.update(dt);
    if (this.action && !this.keepAction) {
      const a = this.action;
      if (a.loop !== LoopRepeat && (!a.isRunning() || a.time >= this.clips[this.actionName].duration - 1e-3)) this.endAction();
    }
    if (this.pumpAfter > 0) { this.pumpAfter -= dt; if (this.pumpAfter <= 0 && !this.action) { this.play(this.gunId === 'empire' ? 'UnjamPistol' : 'UnjamRifle', { speed: 1.6 }); g.sfx.play('gun-rack', { volume: 0.45 }); } }
    // Procedural over the mixer: bob, sway, kick, ADS, fever swim.
    const p = g.player;
    const t = g.time;
    const a = g.weapons.aimT;
    const bx = Math.cos(p.bob) * 0.012 * p.bobAmp * (1 - a * 0.85), by = Math.abs(Math.sin(p.bob)) * 0.014 * p.bobAmp * (1 - a * 0.85);
    const swayX = Math.sin(t * 0.8) * 0.003, swayY = Math.sin(t * 1.3) * 0.003;
    const md = ctx.input.mouseDelta;
    this.lagX = lerp(this.lagX ?? 0, clamp(-md.x * 0.0004, -0.025, 0.025), 1 - Math.exp(-dt * 12));
    this.lagY = lerp(this.lagY ?? 0, clamp(md.y * 0.0004, -0.02, 0.02), 1 - Math.exp(-dt * 12));
    this.kick = lerp(this.kick, 0, 1 - Math.exp(-dt * 16));
    this.flash = Math.max(0, this.flash - dt * 12);
    if (this.flash <= 0.4 && this.flashObj) this.flashObj.visible = false;
    const def = WEAPONS[this.gunId] ?? {};
    const hardness = def.kick ? clamp(def.kick * 30, 0.2, 1.4) : 0;
    // ADS: bring the weapon to centre. Rest is x 0.16, y -0.15; centre is x 0, y a little under the eye.
    const adsX = -0.16 * a, adsY = (def.scoped ? 0.0 : 0.084) * a, adsZ = -0.02 * a;
    const fever = g.body.swim ?? 0;
    // At the town limit the gun goes over your shoulder, and comes back at the other side.
    const slung = !!g.weapons.slung;
    if (slung !== !!this.wasSlung) { this.wasSlung = slung; if (!this.action && !g.player.seat && this.gunId && !g.mapUp) this.play(slung ? 'Holster' : 'Equip'); }
    // Lower the gun while someone is talking at you.
    this.lowerT = lerp(this.lowerT ?? 0, g.scene.face || (g.weapons.slung && !this.action && !g.mapUp) ? 1 : 0, 1 - Math.exp(-dt * 7));
    const mapStill = g.mapUp ? 0 : 1;
    this.group.position.set((bx + swayX + this.lagX) * mapStill + adsX + Math.sin(t * 1.7) * 0.02 * fever, (-by + swayY + this.lagY) * mapStill + adsY + Math.sin(t * 1.1) * 0.016 * fever - p.landDip * 0.6 - this.lowerT * 0.34, this.kick * 0.05 * hardness + adsZ);
    this.group.position.y -= g.player.landDip;
    this.group.rotation.set(this.kick * 0.09 * hardness, 0, Math.sin(t * 0.9) * 0.012 * fever);
    if (def.scoped && a > 0.6) this.root.visible = false; else this.root.visible = true;
    this.updateWear();
  }
}
