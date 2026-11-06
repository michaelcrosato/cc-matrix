import * as THREE from 'three/webgpu';
import {
  mrt, output, normalView, toonOutlinePass, color, float, vec2, vec4, uv, screenSize, Fn, abs, max, sin,
  smoothstep, mix, uniform, perspectiveDepthToViewZ, time, length, hash, floor, oneMinus, step,
} from 'three/tsl';
import { INK } from '../data/config.js';

/** Toon hull plus a screen-space ink pass, with boil, grain, vignette and the ink-blot wipe. */
export function makeInk(renderer, scene, camera) {
  const inkCol = new THREE.Color(INK);
  const u = {
    hull: uniform(0.0028), width: uniform(1.4), boil: uniform(0.5), fadeNear: uniform(30), fadeFar: uniform(90),
    grain: uniform(0.02), near: uniform(camera.near), far: uniform(camera.far), ink: uniform(inkCol),
    wipe: uniform(0), strength: uniform(1),
  };
  const scenePass = toonOutlinePass(scene, camera, color(inkCol), u.hull, float(1));
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const colorTex = scenePass.getTextureNode('output'), normalTex = scenePass.getTextureNode('normal'),
    depthTex = scenePass.getTextureNode('depth');
  const post = new THREE.PostProcessing(renderer);
  post.outputNode = Fn(() => {
    const cell = floor(uv().mul(vec2(40, 23)));
    const wob = hash(floor(time.mul(8)).add(cell.x).add(cell.y.mul(17))).sub(0.5).mul(u.boil);
    const px = u.width.add(wob).div(screenSize);
    const viewZ = (o) => perspectiveDepthToViewZ(depthTex.sample(uv().add(o)).r, u.near, u.far);
    const n = (o) => normalTex.sample(uv().add(o)).xyz;
    const dx = vec2(px.x, 0), dy = vec2(0, px.y);
    const z0 = viewZ(vec2(0, 0)).abs();
    const dz = max(abs(viewZ(dx).sub(viewZ(dx.negate()))), abs(viewZ(dy).sub(viewZ(dy.negate())))).div(z0.max(0.5));
    const dn = max(length(n(dx).sub(n(dx.negate()))), length(n(dy).sub(n(dy.negate()))));
    const e = max(smoothstep(0.05, 0.12, dz), smoothstep(0.7, 1.1, dn)).mul(oneMinus(smoothstep(u.fadeNear, u.fadeFar, z0))).mul(u.strength);
    const c = mix(colorTex.rgb, u.ink, e);
    const p = floor(uv().mul(screenSize));
    const g = hash(p.x.add(p.y.mul(1571))).sub(0.5).mul(u.grain);
    const graded = c.add(g).mul(oneMinus(length(uv().sub(0.5)).mul(0.62).pow(2.2)));
    // The ink-blot wipe: a soft-edged blot grows out of the middle of the frame.
    const q = uv().sub(0.5).mul(vec2(screenSize.x.div(screenSize.y), 1));
    const a = q.y.mul(9).add(sin(q.x.mul(13).add(1.3))).add(sin(q.x.mul(29).add(q.y.mul(11))).mul(0.4));
    const b = q.x.mul(8).add(sin(q.y.mul(17).add(2.1))).add(sin(q.y.mul(31).sub(q.x.mul(7))).mul(0.4));
    const blot = length(q).mul(1.05).add(sin(a).mul(0.05)).add(sin(b).mul(0.05));
    const covered = step(blot, u.wipe.mul(1.2));
    return vec4(mix(graded, u.ink, covered), 1);
  })();
  return { post, u };
}
