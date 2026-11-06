import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, uv, vec2, vec3, vec4, float, Fn, screenSize, luminance, smoothstep, mix, step, atan, fract, floor, max, abs, length, time, perspectiveDepthToViewZ, renderOutput, mx_noise_float } from 'three/tsl';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';

export function createInk(renderer, scene, camera) {
  const u = {
    line: uniform(2.0),            // line half-width in px at 1080p
    lineOn: uniform(1),            // dev toggle
    toneOn: uniform(1),            // dev toggle: halftone + hatching
    danger: uniform(0),            // 0..1: line boil and red vignette, driven by low vitals
    hushRadius: uniform(0),        // 0 = off; grow past 1.6 to cover the screen
    hushCenter: uniform(new THREE.Vector2(0.5, 0.5)), // the tip, in screen uv
    speedLines: uniform(0),        // 0..1 for shouts and cut-ins
    flash: uniform(0),             // 0..1 white flash for defib and stamps
  };
  const sp = pass(scene, camera);
  sp.setMRT(mrt({ output, normal: normalView.mul(0.5).add(0.5) }));
  const colorTex = sp.getTextureNode('output'), normalTex = sp.getTextureNode('normal'), depthTex = sp.getTextureNode('depth');
  const near = float(camera.near), far = float(camera.far);
  const viewZ = (p) => perspectiveDepthToViewZ(depthTex.sample(p).r, near, far);

  const graph = Fn(() => {
    const px = vec2(1).div(screenSize), k = screenSize.y.div(1080), aspect = screenSize.x.div(screenSize.y);
    const tick = floor(time.mul(8));                        // the line "boils" at 8 fps
    const wob = vec2(mx_noise_float(uv().mul(vec2(32, 18)).add(tick.mul(3.7))), mx_noise_float(uv().mul(vec2(18, 32)).add(tick.mul(5.1))))
      .mul(u.danger.mul(3.5).add(1.1)).mul(k).mul(px);
    const p = uv().add(wob);
    const off = uv().sub(u.hushCenter).mul(vec2(aspect, 1));
    const hush = smoothstep(u.hushRadius, u.hushRadius.sub(0.12), length(off)).mul(step(0.001, u.hushRadius));
    const o = px.mul(u.line.add(hush.mul(1.5))).mul(k);

    // ink: normal and depth discontinuities, over 8 neighbours
    const n0 = normalTex.sample(p).xyz, z0 = viewZ(p);
    let edge = float(0);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const q = p.add(o.mul(vec2(dx, dy)));
      edge = max(edge, max(smoothstep(0.3, 0.75, length(normalTex.sample(q).xyz.sub(n0))), smoothstep(0.015, 0.06, abs(viewZ(q).sub(z0)))));
    }
    const base = colorTex.rgb.toVar();
    const lum = luminance(base);

    // manga tone: dots in the shadow band, hatching in the deepest band
    const dots = step(length(fract(uv().mul(screenSize).div(k.mul(7))).sub(0.5)), float(0.36)).mul(smoothstep(0.42, 0.3, lum));
    const sc = uv().mul(screenSize);
    const hatch = step(0.62, fract(sc.x.add(sc.y).div(k.mul(8)))).mul(smoothstep(0.2, 0.1, lum));
    let col = mix(base, mix(base.mul(0.74), base.mul(0.55), hatch.mul(0.6)), max(dots.mul(0.55), hatch.mul(0.6)).mul(u.toneOn));
    col = col.add(mx_noise_float(sc.mul(0.7)).mul(0.018));   // paper grain

    // Hush: sumi-e wash; red is the only colour left
    const red = smoothstep(0.1, 0.32, base.r.sub(max(base.g, base.b)));
    const wash = vec3(0.93, 0.91, 0.86).mul(smoothstep(0.08, 0.72, lum));
    col = mix(col, mix(wash, base.mul(vec3(1.25, 0.8, 0.8)), red), hush);

    // danger vignette
    col = mix(col, vec3(0.75, 0.06, 0.08), smoothstep(0.55, 1.05, length(uv().sub(0.5)).mul(1.5)).mul(u.danger).mul(0.8));

    // speed lines
    const c = uv().sub(0.5).mul(vec2(aspect, 1));
    const rays = step(0.8, fract(mx_noise_float(vec2(atan(c.y, c.x).mul(14), tick)).mul(6))).mul(smoothstep(0.25, 0.62, length(c)));
    col = mix(col, vec3(0.05, 0.03, 0.07), rays.mul(u.speedLines));

    col = mix(col, vec3(0.045, 0.025, 0.07), edge.mul(0.96).mul(u.lineOn));
    return vec4(mix(col, vec3(1), u.flash), 1);
  });

  const post = new THREE.PostProcessing(renderer);
  post.outputColorTransform = false;
  post.outputNode = fxaa(renderOutput(graph()));
  return { post, u };
}
