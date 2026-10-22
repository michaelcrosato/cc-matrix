// WebGPU renderer, cel-shaded materials, sky, lights, and the toon outline + bloom post chain.
import * as THREE from 'three/webgpu';
import { float, mix, normalize, positionLocal, smoothstep, uniform } from 'three/tsl';
import { toonOutlinePass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

// Three-band ramp for the toon shading: shadow, mid, lit.
function makeGradient() {
  const data = new Uint8Array([88, 88, 88, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const GRADIENT = makeGradient();

// Lit, cel-shaded surface. Gets the ink outline from the post pass automatically.
export function toonMat(hex, { side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  return new THREE.MeshToonNodeMaterial({
    color: new THREE.Color(hex),
    gradientMap: GRADIENT,
    side,
    transparent,
    opacity,
  });
}

// Unlit emissive surface for lasers, engines, and pickups. Colour values above 1 drive the bloom.
export function glowMat(hex, intensity = 3, { additive = true } = {}) {
  const m = new THREE.MeshBasicNodeMaterial();
  m.color = new THREE.Color(hex).multiplyScalar(intensity);
  m.transparent = additive;
  if (additive) {
    m.blending = THREE.AdditiveBlending;
    m.depthWrite = false;
  }
  return m;
}

export class Gfx {
  constructor() {
    this.renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 4000);
    this.camera.position.set(0, 4, 18);

    this.skyUniforms = {
      top: uniform(new THREE.Color(0x071226)),
      bottom: uniform(new THREE.Color(0x1d2e5c)),
    };
    this.buildSky();
    this.buildLights();
    this.buildStars();
    this.scene.fog = new THREE.Fog(0x141f3e, 280, 1800);
  }

  async init(parent) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    await this.renderer.init();
    parent.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'gl';

    // Post chain: toon outline pass (ink lines on toon materials) then additive bloom for glow.
    this.post = new THREE.PostProcessing(this.renderer);
    const scenePass = toonOutlinePass(this.scene, this.camera, new THREE.Color(0x05060c), 0.0035, 1);
    const sceneColor = scenePass.getTextureNode('output');
    this.post.outputNode = sceneColor.add(bloom(sceneColor, 0.42, 0.35, 0.82));

    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(3000, 32, 16);
    const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    const t = normalize(positionLocal).y;
    mat.colorNode = mix(this.skyUniforms.bottom, this.skyUniforms.top, smoothstep(float(-0.15), float(0.55), t));
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xaebfff, 0x2a1d33, 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.7);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90;
    this.sun.shadow.camera.bottom = -90;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.0008;
    this.sun.position.set(40, 80, 30);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.rim = new THREE.DirectionalLight(0x6fa8ff, 0.8);
    this.rim.position.set(-30, 20, -60);
    this.scene.add(this.rim);
  }

  buildStars() {
    const count = 2200;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 2400 + Math.random() * 300;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * u) * 0.9;
      pos[i * 3 + 2] = r * s * Math.sin(th);
      const c = new THREE.Color().setHSL(Math.random() < 0.2 ? 0.58 : 0.12, 0.4, 0.6 + Math.random() * 0.4);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: false, fog: false }));
    this.scene.add(this.stars);
  }

  // Apply a stage's sky palette and fog.
  setAtmosphere({ top, bottom, fog, fogNear = 280, fogFar = 1800, sunColor = 0xfff1d6, hemiSky = 0xaebfff, hemiGround = 0x2a1d33 }) {
    this.skyUniforms.top.value.set(top);
    this.skyUniforms.bottom.value.set(bottom);
    this.scene.fog.color.set(fog);
    this.scene.fog.near = fogNear;
    this.scene.fog.far = fogFar;
    this.sun.color.set(sunColor);
    this.hemi.color.set(hemiSky);
    this.hemi.groundColor.set(hemiGround);
  }

  // Keep the shadow frustum and the sun centred on the play area.
  followFocus(focus) {
    this.sun.position.set(focus.x + 40, focus.y + 80, focus.z + 30);
    this.sun.target.position.copy(focus);
    this.sun.target.updateMatrixWorld();
    this.rim.position.set(focus.x - 30, focus.y + 20, focus.z - 60);
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
  }

  render() {
    this.post.render();
  }
}
