import * as THREE from 'three/webgpu';
import {
  mrt, output, normalView, toonOutlinePass, color, float, vec2, vec4, uv, screenSize, Fn, abs, max,
  smoothstep, mix, uniform, perspectiveDepthToViewZ, time, length, hash, floor, oneMinus,
} from 'three/tsl';

export function makeInk(renderer, scene, camera) {
  const INK = 0x1a1420;
  const u = {
    hull: uniform(0.0028), width: uniform(1.4), boil: uniform(0.5), fadeNear: uniform(30), fadeFar: uniform(90),
    grain: uniform(0.02), near: uniform(camera.near), far: uniform(camera.far), ink: uniform(new THREE.Color(INK)),
  };
  const scenePass = toonOutlinePass(scene, camera, color(INK), u.hull, float(1));
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const colorTex = scenePass.getTextureNode('output');
  const normalTex = scenePass.getTextureNode('normal');
  const depthTex = scenePass.getTextureNode('depth');
  const post = new THREE.PostProcessing(renderer);
  post.outputNode = Fn(() => {
    const cell = floor(uv().mul(vec2(40, 23)));
    const wob = hash(floor(time.mul(8)).add(cell.x).add(cell.y.mul(17))).sub(0.5).mul(u.boil);
    const px = u.width.add(wob).div(screenSize);
    const viewZ = (o) => perspectiveDepthToViewZ(depthTex.sample(uv().add(o)).r, u.near, u.far);
    const n = (o) => normalTex.sample(uv().add(o)).xyz;
    const dx = vec2(px.x, 0);
    const dy = vec2(0, px.y);
    const z0 = viewZ(vec2(0, 0)).abs();
    const dz = max(abs(viewZ(dx).sub(viewZ(dx.negate()))), abs(viewZ(dy).sub(viewZ(dy.negate())))).div(z0.max(0.5));
    const dn = max(length(n(dx).sub(n(dx.negate()))), length(n(dy).sub(n(dy.negate()))));
    const e = max(smoothstep(0.05, 0.12, dz), smoothstep(0.7, 1.1, dn)).mul(oneMinus(smoothstep(u.fadeNear, u.fadeFar, z0)));
    const c = mix(colorTex.rgb, u.ink, e);
    const p = floor(uv().mul(screenSize));
    const g = hash(p.x.add(p.y.mul(1571))).sub(0.5).mul(u.grain);
    return vec4(c.add(g).mul(oneMinus(length(uv().sub(0.5)).mul(0.62).pow(2.2))), 1);
  })();
  return { post, u };
}
