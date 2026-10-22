// WebGPU renderer (no WebGL fallback), post-processing, sky, lights and the
// cel-shading toolkit: a 4-band toon ramp plus inverted-hull ink outlines.

import * as THREE from 'three/webgpu';
import { pass, uniform, mix, smoothstep, normalize, positionLocal, normalLocal, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

// 4-texel ramp read through the toon material's gradientMap (.r channel).
const ramp = new THREE.DataTexture(
  new Uint8Array([74, 74, 92, 255, 150, 150, 170, 255, 218, 218, 232, 255, 255, 255, 255, 255]),
  4,
  1,
);
ramp.magFilter = THREE.NearestFilter;
ramp.minFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

const toonCache = new Map();
const glowCache = new Map();
const outlineCache = new Map();

export function toonMat(color, emissive = 0x000000, emissiveIntensity = 0) {
  const key = `${color}|${emissive}|${emissiveIntensity}`;
  let m = toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonNodeMaterial({ color, emissive, emissiveIntensity, gradientMap: ramp });
    toonCache.set(key, m);
  }
  return m;
}

// Unlit, bloom-friendly material for lasers, engine glows and HUD-like effects.
export function glowMat(color, opacity = 1) {
  const key = `${color}|${opacity}`;
  let m = glowCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicNodeMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    glowCache.set(key, m);
  }
  return m;
}

// Inverted-hull outline: back faces pushed out along their normals, drawn in ink.
function inkMat(thickness) {
  let m = outlineCache.get(thickness);
  if (!m) {
    m = new THREE.MeshBasicNodeMaterial({ color: 0x0a0d18, side: THREE.BackSide });
    m.positionNode = positionLocal.add(normalLocal.mul(float(thickness)));
    outlineCache.set(thickness, m);
  }
  return m;
}

export function outline(mesh, thickness = 0.04) {
  const ink = new THREE.Mesh(mesh.geometry, inkMat(thickness));
  ink.castShadow = false;
  ink.receiveShadow = false;
  mesh.add(ink);
  return mesh;
}

// Environment presets. Colors are hex; fog distance is in world units.
export const ENVS = {
  plains: {
    top: 0x2d6fd8, bottom: 0xbfe6ff, fog: 0xbfe6ff, fogNear: 160, fogFar: 620,
    hemiSky: 0xcfeeff, hemiGround: 0x3a5a2a, sunColor: 0xfff1d6, sunDir: [0.5, 1, 0.3], stars: 0.15,
  },
  canyon: {
    top: 0x3a2556, bottom: 0xf2a36b, fog: 0xd98a6b, fogNear: 120, fogFar: 460,
    hemiSky: 0xffd2b0, hemiGround: 0x4a2a2a, sunColor: 0xffc58a, sunDir: [-0.6, 0.7, 0.2], stars: 0.2,
  },
  belt: {
    top: 0x04030f, bottom: 0x1e1545, fog: 0x14102b, fogNear: 240, fogFar: 900,
    hemiSky: 0x9aa8ff, hemiGround: 0x20203a, sunColor: 0xe6e0ff, sunDir: [0.3, 0.8, 0.6], stars: 1,
  },
  core: {
    top: 0x0d0520, bottom: 0x4a1a52, fog: 0x2a0f3a, fogNear: 200, fogFar: 800,
    hemiSky: 0xd8a8ff, hemiGround: 0x2c1433, sunColor: 0xffb6e0, sunDir: [0.2, 1, -0.4], stars: 0.6,
  },
};

export class Render {
  constructor(canvas) {
    this.canvas = canvas;
  }

  async init() {
    const r = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    await r.init();
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 1600);

    this.skyTop = uniform(new THREE.Color());
    this.skyBottom = uniform(new THREE.Color());
    const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    skyMat.colorNode = mix(this.skyBottom, this.skyTop, smoothstep(float(-0.1), float(0.6), normalize(positionLocal).y));
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    this.stars = this.makeStars();
    this.scene.add(this.stars);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, Math.PI * 0.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.post = new THREE.PostProcessing(r);
    const scenePass = pass(this.scene, this.camera);
    const color = scenePass.getTextureNode();
    this.post.outputNode = color.add(bloom(color, 0.28, 0.45, 0.85));

    this.applyEnv('belt');
  }

  makeStars() {
    const n = 2400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = 760;
      pos[i * 3] = Math.cos(a) * s * d;
      pos[i * 3 + 1] = u * d;
      pos[i * 3 + 2] = Math.sin(a) * s * d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 });
    return new THREE.Points(g, m);
  }

  applyEnv(name) {
    const e = ENVS[name];
    this.env = name;
    this.skyTop.value.set(e.top);
    this.skyBottom.value.set(e.bottom);
    this.scene.fog = new THREE.Fog(e.fog, e.fogNear, e.fogFar);
    this.hemi.color.set(e.hemiSky);
    this.hemi.groundColor.set(e.hemiGround);
    this.sun.color.set(e.sunColor);
    this.sunOffset = new THREE.Vector3(...e.sunDir).normalize().multiplyScalar(120);
    this.stars.material.opacity = Math.min(1, 0.25 + e.stars * 0.75);
  }

  // Keeps the sky, stars and the sun's shadow box centered on the play area.
  followCamera(center) {
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).add(this.sunOffset);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.post.render();
  }
}
