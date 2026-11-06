// Everything you see in your own hands. Attached to the camera; one rig per gun, one for tools, one for the map.
import { buildModel, compileClips, PALETTE, setLookLayer, THREE, toonMaterial, twoBoneIK } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { GUN_CLIPS, TOOL_CLIPS } from '../art/clips.js';
import { GUN_RIG, GUN_VIEWMODELS, handsMap, TOOL_RIG, vmDash, vmMg, vmTools } from '../art/viewmodels.js';
import { clamp, lerp } from '../world/geom.js';
const { AnimationMixer, Group, LoopOnce, LoopRepeat, Mesh, PlaneGeometry } = THREE;
const UPPER_ARM = 0.38, FORE_ARM = 0.38, ELBOW = [0, 0, 0], A = new THREE.Vector3(), B = new THREE.Vector3(), Z_AXIS = new THREE.Vector3(0, 0, 1);
const TOOL_ITEMS = ['tool-syrette', 'tool-pliers', 'tool-knife', 'tool-lighter', 'tool-wrench', 'tool-detonator', 'tool-bottle', 'tool-charge', 'tool-tablet', 'tool-revolver', 'tool-tablets', 'tool-tracker', 'tool-monocular', 'prop-forearm', 'prop-thigh', 'prop-burn'];
export class ViewModel {
  rigs = {}; current = null; raise = 0; adsK = 0; bobT = 0; lower = 0; lowerGoal = 0; mapUp = 0; toolName = null; toolT = 0;
  constructor(game) { this.game = game; }
  build(ctx) {
    this.ctx = ctx;
    const cam = ctx.camera.camera;
    ctx.scene.add(cam);
    this.group = new Group(); cam.add(this.group); setLookLayer(this.group, 'actors');
    const make = (def, clips, rig, z = 0) => {
      const b = buildModel(def, { catalog: CATALOG });
      b.object.rotation.y = Math.PI; b.object.position.z = z; if (z) { b.object.scale.setScalar(0.72); b.object.position.y = -0.03; }
      b.object.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
      b.object.visible = false;
      this.group.add(b.object);
      const mixer = new AnimationMixer(b.object), compiled = compileClips(clips, rig, b.object);
      const actions = Object.fromEntries(compiled.map((c) => [c.name, mixer.clipAction(c)]));
      return { object: b.object, mixer, actions, cur: null, rust: b.object.getObjectByName('Rust'), tape: b.object.getObjectByName('Tape') };
    };
    for (const [id, def] of Object.entries(GUN_VIEWMODELS)) this.rigs[id] = make(def, GUN_CLIPS[id], GUN_RIG, -0.3);
    this.rigs.mg = make(vmMg, GUN_CLIPS.mg, GUN_RIG, -0.3);
    this.tools = make(vmTools, TOOL_CLIPS, TOOL_RIG); this.tools.object.position.set(0, 0.2, -0.3); this.tools.object.scale.setScalar(0.85); for (const n of ['Item', 'ItemL']) this.tools.object.getObjectByName(n)?.scale.setScalar(1.6);
    this.items = Object.fromEntries(TOOL_ITEMS.map((n) => [n, this.tools.object.getObjectByName(n)]));
    this.finger = this.tools.object.getObjectByName('Finger');
    this.led = this.tools.object.getObjectByName('tracker-led');
    for (const it of Object.values(this.items)) it.visible = false;
    // The wheel and dash are drawn with the truck you sit in.
    const dash = buildModel(vmDash, { catalog: CATALOG });
    this.dash = dash.object; this.dash.rotation.y = Math.PI; this.dash.visible = false; this.dash.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    this.group.add(this.dash); this.wheelNode = this.dash.getObjectByName('Wheel'); this.wheelY = this.wheelNode.position.y;
    // Your arms, solved each frame: the hands stay on the rim as it turns, the elbows follow.
    this.arms = [1, -1].map((side) => { const bit = (w, l, c) => { const g = new THREE.BoxGeometry(w, w, l), m = new Mesh(g, toonMaterial(c)); m.castShadow = false; m.frustumCulled = false; this.dash.add(m); return m; }; return { side, upper: bit(0.085, UPPER_ARM, PALETTE.sand), fore: bit(0.08, FORE_ARM, PALETTE.sand), hand: bit(0.085, 0.11, PALETTE.orange) }; }); this.arrowNode = this.dash.getObjectByName('Arrow');
    // The map in your hands.
    const hands = buildModel(handsMap, { catalog: CATALOG }); hands.object.rotation.y = Math.PI; hands.object.position.set(0, -0.2, -0.43); hands.object.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    this.mapGroup = new Group(); this.mapGroup.visible = false; this.group.add(this.mapGroup); this.mapGroup.add(hands.object);
    this.mapPlane = new Mesh(new PlaneGeometry(0.5, 0.375), toonMaterial(0xffffff, { map: this.game.mapTex.texture }));
    this.mapPlane.position.set(0, -0.015, -0.42); this.mapPlane.rotation.x = -0.14; this.mapPlane.castShadow = false; this.mapPlane.frustumCulled = false;
    this.mapGroup.add(this.mapPlane); this.mapGroup.scale.set(1.2, 1.2, 1); // About 1:1 with the 480 x 270 frame, so the map's lettering keeps every row.
  }
  show(id) {
    if (this.current === id) return;
    const cur = this.rigs[this.current]; if (cur) { cur.object.visible = false; }
    this.current = id;
    const next = this.rigs[id]; if (!next) return;
    next.object.visible = !this.hideGun;
    this.playGun('Equip', true); this.queueIdle = true;
  }
  playGun(name, once, fade = 0.04) {
    const r = this.rigs[this.current]; if (!r) return 0; const a = r.actions[name]; if (!a) return 0;
    if (r.cur && r.cur !== a) r.cur.fadeOut(fade);
    a.reset().setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once; a.fadeIn(fade).play(); r.cur = a; r.curOnce = once; r.curName = name;
    return a.getClip().duration;
  }
  /** Rust and tape show on the gun itself. No numbers. */
  setCondition(id, cond) { const r = this.rigs[id]; if (!r) return; if (r.rust) r.rust.visible = cond < 60; if (r.tape) r.tape.visible = cond < 30; }
  /** A tool clip: items shown, the gun lowered away. */
  playTool(clip, items = [], { hideGun = true, loop = false } = {}) {
    for (const it of Object.values(this.items)) it.visible = false;
    for (const n of items) if (this.items[n]) this.items[n].visible = true;
    const t = this.tools; t.object.visible = true;
    const a = t.actions[clip]; if (!a) return 0;
    if (t.cur && t.cur !== a) t.cur.fadeOut(0.06);
    a.reset().setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1); a.clampWhenFinished = !loop; a.fadeIn(0.06).play(); t.cur = a; t.curName = clip;
    this.toolName = clip; this.toolT = loop ? Infinity : a.getClip().duration;
    this.hideGun = hideGun; const r = this.rigs[this.current]; if (r) r.object.visible = !hideGun;
    return a.getClip().duration;
  }
  endTool() { this.toolName = null; this.toolT = 0; this.tools.object.visible = false; this.hideGun = false; const r = this.rigs[this.current]; if (r) r.object.visible = !this.allHidden; }
  poseArms() {
    const w = this.wheelNode, c = Math.cos(w.rotation.z), n = Math.sin(w.rotation.z);
    for (const a of this.arms) {
      const rx = a.side * 0.17, ry = 0.02, hand = [w.position.x + rx * c - ry * n, w.position.y + rx * n + ry * c, w.position.z - 0.03], shoulder = [a.side * 0.27, -0.72, -0.12];
      const elbow = twoBoneIK(shoulder, hand, UPPER_ARM, FORE_ARM, [a.side * 0.9, -1.2, 0.2], ELBOW);
      const span = (m, p, q) => { A.fromArray(p); B.fromArray(q); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Z_AXIS, B.sub(A).normalize()); };
      span(a.upper, shoulder, elbow); span(a.fore, elbow, hand); a.hand.position.fromArray(hand); a.hand.quaternion.copy(a.fore.quaternion);
    }
  }
  update(dt, st) {
    const g = this.game, r = this.rigs[this.current];
    this.bobT += dt * (st.speed > 0.2 ? 6 + st.speed * 1.2 : 1.2);
    const swayX = Math.sin(this.bobT) * 0.006 * clamp(st.speed / 5, 0.15, 1.4), swayY = Math.abs(Math.cos(this.bobT)) * 0.01 * clamp(st.speed / 5, 0.1, 1.4);
    this.adsK = lerp(this.adsK, st.ads ? 1 : 0, clamp(dt * 14, 0, 1));
    this.lower = lerp(this.lower, st.lowered ? 1 : 0, clamp(dt * 8, 0, 1));
    const feverSway = st.fever * 0.03;
    const gx = lerp(swayX, -0.127, this.adsK) + Math.sin(this.bobT * 0.31) * feverSway, gy = lerp(-swayY, 0.09, this.adsK) - this.lower * 0.34 + (st.landDip ?? 0) + Math.cos(this.bobT * 0.23) * feverSway;
    this.group.position.set(gx, gy + (st.crouchDip ?? 0), lerp(0, 0.06, this.adsK) + (st.kick ?? 0));
    this.group.rotation.x = st.scoped ? 0 : this.lower * -0.6;
    this.group.visible = !st.hidden;
    if (r) { r.object.visible = !this.hideGun && !st.hideGun && !st.scoped; r.mixer.update(dt); if (r.curOnce && r.cur && !r.cur.isRunning()) { const id = r.actions.Idle; if (id) { r.cur.fadeOut(0.1); id.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.1).play(); r.cur = id; r.curOnce = false; r.curName = 'Idle'; } } }
    if (this.tools.object.visible) { this.tools.mixer.update(dt); this.toolT -= dt; if (this.toolT <= 0 && this.toolName) { this.endTool(); g.events.emit('toolEnd'); } }
    // The map rises and falls in 0.4 s.
    const up = st.mapUp ? 1 : 0;
    this.mapUp = clamp(this.mapUp + Math.sign(up - this.mapUp) * dt / 0.4, 0, 1);
    const e = this.mapUp * this.mapUp * (3 - 2 * this.mapUp);
    this.mapGroup.visible = e > 0.01; this.mapGroup.position.set(0, -0.5 * (1 - e) - this.group.position.y - (st.crouchDip ?? 0), 0.02);
    this.mapGroup.rotation.x = -(1 - e) * 0.8 + st.fever * 0.04 * Math.sin(this.bobT * 0.4);
    this.mapPlane.material.color?.setScalar(1);
    this.dash.visible = !!st.dash;
    if (st.dash) { this.dash.position.set(0, -this.group.position.y + 0.04, 0.04); this.wheelNode.position.y = this.wheelY - e * 0.3; /* The wheel drops out of the way of the raised map. */ this.wheelNode.rotation.z = (st.wheel ?? 0) * 1.5; this.arrowNode.rotation.y = st.arrowYaw ?? 0; this.poseArms(); }
  }
}
