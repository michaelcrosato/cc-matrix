// WebGPU renderer, TSL cel-shading materials, inverted-hull outlines, sky and starfield.
import {
  WebGPURenderer, Scene, PerspectiveCamera, Color, Vector3, Mesh, Group, SphereGeometry,
  MeshBasicNodeMaterial, BackSide, PointsMaterial, Points, BufferGeometry, Float32BufferAttribute,
  NoToneMapping, Fog,
} from 'three/webgpu';
import {
  uniform, vec3, float, dot, normalize, normalWorld, positionWorld, cameraPosition, smoothstep,
  max, mix, pow, reflect, step, positionLocal, normalLocal, clamp,
} from 'three/tsl';

// Shared light rig. Direction is world-space and points from the scene toward the light.
export const LIGHT = {
  dir: uniform(new Vector3(0.45, 0.85, 0.35).normalize()),
  lit: uniform(new Color(1.0, 0.96, 0.86)),
  shadowTint: uniform(new Color(0.34, 0.4, 0.62)),
};

// Three-band cel shading: shadow tint, base colour, hard specular band and a rim light.
export function makeToon(hex, { emissive = 0, rim = null, alpha = 1, glow = false, baseNode = null } = {}) {
  const base = baseNode ?? uniform(new Color(hex));
  const emit = uniform(emissive);
  const rimCol = uniform(new Color(rim ?? 0x9fe8ff));
  const hasRim = rim !== null ? 1 : 0.35;
  const m = new MeshBasicNodeMaterial();
  const n = normalize(normalWorld);
  const view = normalize(cameraPosition.sub(positionWorld));
  const ndl = dot(n, LIGHT.dir);
  // Hard band between shadow and lit side.
  const band = smoothstep(float(-0.08), float(0.06), ndl);
  const shadowCol = base.mul(LIGHT.shadowTint);
  const shaded = mix(shadowCol, base.mul(LIGHT.lit), band);
  // Specular: a single crisp highlight band.
  const half = normalize(LIGHT.dir.add(view));
  const spec = step(float(0.82), pow(max(dot(n, half), float(0)), float(40)));
  // Rim: fresnel-ish outline light on silhouettes.
  const fres = pow(float(1).sub(max(dot(n, view), float(0))), float(3));
  const rimMask = step(float(0.62), fres).mul(float(hasRim));
  let col = shaded.add(LIGHT.lit.mul(spec).mul(0.45)).add(rimCol.mul(rimMask).mul(0.55));
  col = col.add(base.mul(emit));
  m.colorNode = clamp(col, 0, 1);
  if (alpha < 1 || glow) {
    m.transparent = true;
    m.opacityNode = float(alpha);
    m.depthWrite = !glow;
  }
  return m;
}

// Flat, unlit colour: lasers, HUD-like glows, sky.
export function makeBasic(hex, { alpha = 1, additive = false } = {}) {
  const m = new MeshBasicNodeMaterial({ color: hex });
  if (alpha < 1) {
    m.transparent = true;
    m.opacity = alpha;
  }
  if (additive) {
    m.transparent = true;
    m.depthWrite = false;
    m.blending = 2; // AdditiveBlending
  }
  return m;
}

const outlineCache = new Map();
function outlineMaterial(thickness) {
  const key = thickness.toFixed(3);
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new MeshBasicNodeMaterial();
  m.side = BackSide;
  m.colorNode = vec3(0.03, 0.04, 0.08);
  m.positionNode = positionLocal.add(normalLocal.mul(float(thickness)));
  outlineCache.set(key, m);
  return m;
}

// A cel-shaded mesh with an inverted-hull outline, returned as a Group.
export function toonMesh(geometry, hex, { outline = 0.04, ...opts } = {}) {
  const g = new Group();
  g.add(new Mesh(geometry, makeToon(hex, opts)));
  if (outline > 0) g.add(new Mesh(geometry, outlineMaterial(outline)));
  return g;
}

export class Renderer {
  constructor(host) {
    this.host = host;
    this.renderer = new WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = NoToneMapping;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(62, 1, 0.5, 2600);
    this.sky = this.makeSky();
    this.scene.add(this.sky);
    this.stars = new Starfield();
    this.scene.add(this.stars.points);
  }

  async init() {
    await this.renderer.init();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Hold the horizontal field on narrow screens so the ship stays readable.
    this.baseFov = w / h < 1 ? Math.min(90, 62 / (w / h) ** 0.6) : 62;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  makeSky() {
    const geo = new SphereGeometry(1800, 32, 16);
    this.skyTop = uniform(new Color(0x0a1a3a));
    this.skyHorizon = uniform(new Color(0x3a6fb0));
    const m = new MeshBasicNodeMaterial();
    const up = clamp(positionWorld.normalize().y.mul(1.4).add(0.1), 0, 1);
    m.colorNode = mix(this.skyHorizon, this.skyTop, smoothstep(float(0.0), float(0.6), up));
    m.side = BackSide;
    m.depthWrite = false;
    const mesh = new Mesh(geo, m);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return mesh;
  }

  setSky(top, horizon) {
    this.skyTop.value.set(top);
    this.skyHorizon.value.set(horizon);
  }

  setFog(color, near, far) {
    if (color === null) {
      this.scene.fog = null;
      return;
    }
    if (!this.scene.fog) this.scene.fog = new Fog(color, near, far);
    this.scene.fog.color.set(color);
    this.scene.fog.near = near;
    this.scene.fog.far = far;
  }

  render(camera, dt, speed) {
    this.sky.position.copy(camera.position);
    this.stars.update(camera.position, dt, speed);
    this.renderer.render(this.scene, camera);
  }
}

// Stars live in a box around the camera and stream past it at the flight speed.
export class Starfield {
  constructor(count = 1000) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 900;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 500;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 900;
    }
    this.pos = pos;
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    this.mat = new PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85 });
    this.points = new Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }

  update(center, dt, speed) {
    this.points.position.copy(center);
    const arr = this.pos;
    const step = speed * dt;
    for (let i = 2; i < arr.length; i += 3) {
      arr[i] += step;
      if (arr[i] > 450) arr[i] -= 900;
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  setColor(hex) {
    this.mat.color.set(hex);
  }
}
