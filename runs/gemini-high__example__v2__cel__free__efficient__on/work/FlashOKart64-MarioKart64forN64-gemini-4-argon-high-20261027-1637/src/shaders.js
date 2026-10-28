// src/shaders.js
// Three.js R180 WebGPU + TSL (Three Shading Language) Cel-Shading & Inverted-Hull Outline Library

import * as THREE from 'three/webgpu';
import {
  color,
  float,
  vec3,
  normalLocal,
  positionLocal,
  normalWorld,
  positionWorld,
  cameraPosition,
  dot,
  max,
  step,
  mix,
  sin,
  cos,
  fract,
  uv,
  time
} from 'three/tsl';

const outlineMaterialCache = new Map();
const celMaterialCache = new Map();

export function getOutlineMaterial(thickness = 0.04, hexColor = 0x11111a) {
  const key = `${thickness.toFixed(4)}_${hexColor}`;
  if (outlineMaterialCache.has(key)) return outlineMaterialCache.get(key);

  const mat = new THREE.MeshBasicNodeMaterial({
    color: hexColor,
    side: THREE.BackSide
  });
  mat.positionNode = positionLocal.add(normalLocal.mul(float(thickness)));
  outlineMaterialCache.set(key, mat);
  return mat;
}

export function createCelMaterial({
  hexColor = 0xff3333,
  rimColor = 0xffffff,
  rimStrength = 0.28,
  emissiveHex = 0x000000,
  emissiveIntensity = 0.0,
  transparent = false,
  opacity = 1.0,
  side = THREE.FrontSide,
  unique = false
} = {}) {
  const key = `${hexColor}_${rimColor}_${rimStrength}_${emissiveHex}_${emissiveIntensity}_${transparent}_${opacity}_${side}`;
  if (!unique && celMaterialCache.has(key)) {
    return celMaterialCache.get(key);
  }

  const mat = new THREE.MeshToonNodeMaterial({
    color: hexColor,
    transparent,
    opacity,
    side
  });

  // View-dependent stepped cel rim highlight + optional emissive using TSL
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const ndotv = max(dot(normalWorld, viewDir), float(0.0));
  const rimFactor = step(float(0.62), float(1.0).sub(ndotv));
  const rimNode = color(rimColor).mul(rimFactor).mul(float(rimStrength));

  if (emissiveIntensity > 0) {
    mat.emissiveNode = rimNode.add(color(emissiveHex).mul(float(emissiveIntensity)));
  } else {
    mat.emissiveNode = rimNode;
  }

  if (!unique) {
    celMaterialCache.set(key, mat);
  }
  return mat;
}

export function createCelMesh(geometry, matOptions = {}, outlineThickness = 0.04, castShadow = true, receiveShadow = true) {
  const mat = createCelMaterial(matOptions);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  if (outlineThickness > 0) {
    const outlineMesh = new THREE.Mesh(
      geometry,
      getOutlineMaterial(outlineThickness, matOptions.outlineColor ?? 0x111118)
    );
    outlineMesh.castShadow = false;
    outlineMesh.receiveShadow = false;
    mesh.add(outlineMesh);
  }
  return mesh;
}

let cachedRainbowMat = null;
export function createRainbowRoadMaterial() {
  if (cachedRainbowMat) return cachedRainbowMat;
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  const st = uv();
  const band = fract(st.x.mul(float(6.0)));
  const scroll = fract(st.y.mul(float(24.0)).sub(time.mul(float(2.2))));
  const pulse = step(float(0.15), scroll).mul(float(0.18)).add(float(0.82));

  // Stepped cel-shaded 6-band rainbow palette
  const c0 = color(0xff2255);
  const c1 = color(0xff8811);
  const c2 = color(0xffee11);
  const c3 = color(0x11ee55);
  const c4 = color(0x11aaff);
  const c5 = color(0xaa33ff);

  let col = mix(c0, c1, step(float(0.166), band));
  col = mix(col, c2, step(float(0.333), band));
  col = mix(col, c3, step(float(0.500), band));
  col = mix(col, c4, step(float(0.666), band));
  col = mix(col, c5, step(float(0.833), band));

  mat.colorNode = col.mul(pulse);
  cachedRainbowMat = mat;
  return mat;
}

let cachedBoostMat = null;
export function createBoostPadMaterial() {
  if (cachedBoostMat) return cachedBoostMat;
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  const st = uv();
  const chevron = fract(st.y.mul(float(4.0)).sub(time.mul(float(5.5))).add(st.x.sub(float(0.5)).abs().mul(float(1.8))));
  const stripe = step(float(0.45), chevron);
  const cA = color(0xffea00);
  const cB = color(0xff2200);
  mat.colorNode = mix(cA, cB, stripe);
  cachedBoostMat = mat;
  return mat;
}

export function createSkyDome(topHex = 0x1a75ff, bottomHex = 0x99ddff, isSpace = false) {
  const geo = new THREE.SphereGeometry(520, 24, 16);
  const mat = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide,
    depthWrite: false
  });

  // Quantized cel-shaded sky bands based on local Y height
  const h = max(float(0.0), positionLocal.y.div(float(520.0)));
  const band1 = step(float(0.12), h);
  const band2 = step(float(0.32), h);
  const band3 = step(float(0.58), h);
  const steppedH = band1.mul(float(0.25)).add(band2.mul(float(0.35))).add(band3.mul(float(0.40)));

  const cBottom = color(bottomHex);
  const cTop = color(topHex);
  mat.colorNode = mix(cBottom, cTop, steppedH);

  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -100;

  if (isSpace) {
    // Add bright cel-shaded stars & neon planets inside the dome
    const starGroup = new THREE.Group();
    const starGeo = new THREE.OctahedronGeometry(2.6, 0);
    const starColors = [0xffffff, 0xffee55, 0x55ffff, 0xff66ff];
    for (let i = 0; i < 90; i++) {
      const sMat = new THREE.MeshBasicNodeMaterial({ color: starColors[i % starColors.length] });
      const s = new THREE.Mesh(starGeo, sMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() * 0.75 + 0.08) * Math.PI * 0.5;
      const r = 420;
      s.position.set(
        Math.cos(theta) * Math.cos(phi) * r,
        Math.sin(phi) * r * (Math.random() > 0.2 ? 1 : -0.4),
        Math.sin(theta) * Math.cos(phi) * r
      );
      starGroup.add(s);
    }
    dome.add(starGroup);
  }

  return dome;
}
