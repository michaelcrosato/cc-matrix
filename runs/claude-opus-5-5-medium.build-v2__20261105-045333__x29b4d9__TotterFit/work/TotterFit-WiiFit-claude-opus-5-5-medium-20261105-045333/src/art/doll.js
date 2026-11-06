import * as THREE from 'three/webgpu';
import { sphere, capsule, torus, cone, cyl, at, box, toon } from './materials.js';
import { Rig } from '../anim/rig.js';
import { DOLL_CLIPS } from '../anim/clips.js';
export const PAINTS = ['#E8443A', '#3B82F6', '#22C55E', '#F5B700', '#E77BB0', '#8E6BD8', '#2FA7A0', '#F58A2E'];
export const SKINS = ['#F2D3A8', '#E2B48A', '#C98F62', '#9A6A45', '#F7E0C2'];
export const HATS = ['none', 'visor', 'beret', 'bucket', 'perm', 'wizard', 'crown'];
function J(name, parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; }
export function makeHat(kind, c = '#3B82F6') {
  const g = new THREE.Group();
  switch (kind) {
    case 'visor': { g.add(at(torus(.21, .03, c), 0, .1, 0)).children[0].rotation.x = Math.PI / 2; const b = sphere(.17, c, 1, .12, 1); b.position.set(0, .1, .2); g.add(b); break; }
    case 'beret': { const b = sphere(.25, c, 1.05, .32, 1.05); b.position.set(.03, .2, 0); b.rotation.z = -.2; g.add(b); break; }
    case 'bucket': { g.add(at(cyl(.2, .23, .17, c), 0, .21, 0)); g.add(at(cyl(.32, .32, .025, c), 0, .13, 0)); break; }
    case 'perm': { for (let i = 0; i < 14; i++) { const a = i * 2.399, r = .09 + (i % 5) * .03; g.add(at(sphere(.095, '#D8D3E8'), Math.cos(a) * r, .15 + (i % 3) * .05, Math.sin(a) * r - .02)); } break; }
    case 'wizard': { g.add(at(cone(.2, .55, '#5B4BB5'), 0, .42, 0)); g.add(at(cyl(.3, .3, .025, '#5B4BB5'), 0, .15, 0)); g.add(at(sphere(.035, '#F5B700'), .06, .42, .13)); break; }
    case 'crown': { g.add(at(cyl(.12, .1, .07, '#F5B700'), 0, .24, 0)); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; g.add(at(cone(.03, .08, '#F5B700', 6), Math.cos(a) * .1, .3, Math.sin(a) * .1)); } break; }
    default: break;
  }
  return g;
}
export function makeDoll({ paint = '#E8443A', shorts = '#2B4A6F', skin = '#F2D3A8', hat = 'none', hatColor = null, height = 1, width = 1 } = {}) {
  const group = new THREE.Group(); // position in the world
  const lean = new THREE.Group(); group.add(lean); // physics rotation, world aligned
  const root = J('root', lean); // facing
  const inner = new THREE.Group(); inner.scale.set(width, height, width); root.add(inner);
  const hips = J('hips', inner, 0, .46, 0);
  const spine = J('spine', hips, 0, .08, 0);
  const head = J('head', spine, 0, .54, 0);
  const shoulderL = J('shoulderL', spine, -.26, .42, 0), shoulderR = J('shoulderR', spine, .26, .42, 0);
  const elbowL = J('elbowL', shoulderL, 0, -.2, 0), elbowR = J('elbowR', shoulderR, 0, -.2, 0);
  const hipL = J('hipL', hips, -.12, -.02, 0), hipR = J('hipR', hips, .12, -.02, 0);
  const kneeL = J('kneeL', hipL, 0, -.2, 0), kneeR = J('kneeR', hipR, 0, -.2, 0);
  const ankleL = J('ankleL', kneeL, 0, -.2, 0), ankleR = J('ankleR', kneeR, 0, -.2, 0);
  const JOINT = '#D9A86C';
  // Body
  const sh = capsule(.2, .06, shorts); sh.scale.set(1.05, 1, .85); hips.add(at(sh, 0, .02, 0));
  const shirt = capsule(.21, .24, paint); shirt.scale.z = .82; spine.add(at(shirt, 0, .24, 0));
  // Head
  head.add(at(sphere(.23, skin), 0, .2, 0));
  const hb = torus(.228, .022, paint); hb.rotation.x = Math.PI / 2 + .1; head.add(at(hb, 0, .3, 0));
  head.add(at(sphere(.024, '#1A1420'), -.08, .23, .205)); head.add(at(sphere(.024, '#1A1420'), .08, .23, .205));
  head.add(at(sphere(.045, '#F4A6A0', 1, .6, .4), -.13, .15, .185)); head.add(at(sphere(.045, '#F4A6A0', 1, .6, .4), .13, .15, .185));
  const mouth = torus(.04, .008, '#1A1420', Math.PI); mouth.rotation.z = Math.PI; head.add(at(mouth, 0, .13, .222));
  const hatG = new THREE.Group(); hatG.position.y = .2; head.add(hatG);
  // Arms: ball joints, skin capsules, mittens
  for (const [s, e, x] of [[shoulderL, elbowL, -1], [shoulderR, elbowR, 1]]) {
    s.add(sphere(.075, JOINT)); s.add(at(capsule(.055, .12, skin), 0, -.1, 0));
    e.add(sphere(.06, JOINT)); e.add(at(capsule(.05, .1, skin), 0, -.1, 0)); e.add(at(sphere(.07, '#FFFFFF'), 0, -.22, 0)); void x;
  }
  // Legs
  for (const [h, k, a] of [[hipL, kneeL, ankleL], [hipR, kneeR, ankleR]]) {
    h.add(at(capsule(.08, .1, skin), 0, -.1, 0)); k.add(sphere(.065, JOINT)); k.add(at(capsule(.07, .1, skin), 0, -.1, 0));
    a.add(at(sphere(.1, '#FFFFFF', 1, .55, 1.5), 0, -.005, .05));
  }
  const joints = { root, hips, spine, head, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR, ankleL, ankleR };
  const rig = new Rig(root, DOLL_CLIPS, 'doll');
  const doll = { group, lean, root, joints, rig, hatG, paint, hat, flailT: 0, bobble: 0, bob: 0, faceYaw: 0, squash: 0, inner,
    setHat(kind, c = hatColor || paint) { while (hatG.children.length) hatG.remove(hatG.children[0]); hatG.add(makeHat(kind, c)); this.hat = kind; },
    setPaint(c) { shirt.material = toon(c); hb.material = toon(c); this.paint = c; },
    setFace(y) { root.rotation.y = y; this.faceYaw = y; },
    setLeanFromQuat(q) { lean.quaternion.set(q.x, q.y, q.z, q.w); },
    setLean(x, z) { // lean toward +x and +z, radians
      const a = Math.hypot(x, z) || 1e-9, s = Math.sin(a / 2); lean.quaternion.set(z / a * s, 0, -x / a * s, Math.cos(a / 2)); },
    tick(dt) {
      rig.update(dt);
      if (this.squash > 0) { this.squash = Math.max(0, this.squash - dt * 3); const v = Math.sin(this.squash * Math.PI) * .22; inner.scale.set(width * (1 + v), height * (1 - v), width * (1 + v)); }
    },
    land() { this.squash = 1; },
  };
  doll.setHat(hat, hatColor || paint);
  rig.play('idle', 0);
  return doll;
}
