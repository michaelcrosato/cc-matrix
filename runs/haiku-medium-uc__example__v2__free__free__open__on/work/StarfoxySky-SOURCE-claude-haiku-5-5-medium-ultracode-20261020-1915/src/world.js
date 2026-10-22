// Environment geometry: scrolling terrain (height function per environment),
// canyon pillars with physics, and recycled background decor (clouds, rocks, crystals).

import * as THREE from 'three/webgpu';
import { toonMat, outline } from './render.js';
import { makeModel } from './models.js';

const STEP = 5;
const TERRAIN_W = 400;
const TERRAIN_D = 1000;
const LOW = new THREE.Color();
const HIGH = new THREE.Color();

const HEIGHT = {
  plains(x, z) {
    return -14 + 2.4 * Math.sin(x * 0.035 + 0.7) * Math.cos(z * 0.022)
      + 1.4 * Math.sin(z * 0.061 + x * 0.013) + 0.5 * Math.sin(x * 0.23 + z * 0.17);
  },
  canyon(x, z) {
    const floor = -14 + 0.9 * Math.sin(z * 0.09) * Math.cos(x * 0.2);
    const wall = Math.pow(Math.max(0, Math.abs(x) - 11), 1.6) * 1.8;
    return floor + Math.min(wall, 90);
  },
  belt() {
    return -60; // open space: no ground
  },
  core(x, z) {
    return -16 + 0.6 * Math.sin(x * 0.07) * Math.sin(z * 0.05);
  },
};

const PALETTE = {
  plains: { low: 0x3d7d3a, high: 0xa9b86a },
  canyon: { low: 0x8a4a2e, high: 0xe0a06a },
  belt: null,
  core: { low: 0x3b2355, high: 0x7d4f9c },
};

function makeCloud(seed) {
  const g = new THREE.Group();
  const mat = toonMat(0xffffff, 0xdfe9ff, 0.15);
  for (let i = 0; i < 4; i++) {
    const s = 3 + ((seed * 7 + i * 13) % 5);
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat);
    m.position.set(((i * 37 + seed) % 9) - 4, ((i * 17) % 4) * 0.4, ((i * 23 + seed) % 7) - 3);
    m.scale.set(1.4, 0.8, 1.2);
    outline(m, 0.05);
    g.add(m);
  }
  return g;
}

export class World {
  constructor(root, physics, envName) {
    this.root = root;
    this.physics = physics;
    this.envName = envName;
    this.height = HEIGHT[envName];
    this.decor = [];

    const pal = PALETTE[envName];
    if (pal) {
      LOW.set(pal.low);
      HIGH.set(pal.high);
      this.geo = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, TERRAIN_W / STEP, TERRAIN_D / STEP);
      this.geo.rotateX(-Math.PI / 2);
      const count = this.geo.attributes.position.count;
      this.baseX = Float32Array.from({ length: count }, (_, i) => this.geo.attributes.position.getX(i));
      this.baseZ = Float32Array.from({ length: count }, (_, i) => this.geo.attributes.position.getZ(i));
      this.geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
      this.mesh = new THREE.Mesh(this.geo, toonMat(0xffffff));
      this.mesh.material.vertexColors = true;
      this.mesh.receiveShadow = true;
      this.mesh.castShadow = false;
      this.mesh.frustumCulled = false;
      root.add(this.mesh);
      this.updateTerrain(0);
    }

    this.decorKinds = envName === 'belt' ? ['rock0', 'rock1', 'rock2'] : envName === 'core' ? ['rock1'] : ['cloud'];
    this.spawnDecor();
  }

  groundY(x, z) {
    return this.height(x, z);
  }

  // Scrolls the terrain grid under the player and re-shapes it from the height function.
  updateTerrain(playerZ) {
    if (!this.mesh) return;
    const zc = Math.round(playerZ / STEP) * STEP;
    this.mesh.position.z = zc;
    const pos = this.geo.attributes.position;
    const col = this.geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const y = this.height(this.baseX[i], this.baseZ[i] + zc);
      pos.array[i * 3 + 1] = y;
      const t = Math.min(1, Math.max(0, (y + 14) / 16));
      col.array[i * 3] = LOW.r + (HIGH.r - LOW.r) * t;
      col.array[i * 3 + 1] = LOW.g + (HIGH.g - LOW.g) * t;
      col.array[i * 3 + 2] = LOW.b + (HIGH.b - LOW.b) * t;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  // Canyon pillar: a static Rapier cylinder with a rock model. Ship must weave around them.
  addPillar(x, z, top) {
    const height = top - this.groundY(x, z);
    const m = makeModel('pillar');
    const base = this.groundY(x, z);
    m.position.set(x, base + height / 2, z);
    m.scale.set(1, height, 1);
    this.root.add(m);
    const entity = { kind: 'pillar', pos: new THREE.Vector3(x, base + height / 2, z) };
    this.physics.addStaticCylinder(entity, 2.4, height / 2, x, base + height / 2, z);
  }

  spawnDecor() {
    for (let i = 0; i < 46; i++) {
      const kind = this.decorKinds[i % this.decorKinds.length];
      const obj = kind === 'cloud' ? makeCloud(i) : makeModel(kind);
      const scale = kind === 'cloud' ? 0.9 + Math.random() * 1.1 : 1.5 + Math.random() * 3.5;
      obj.scale.multiplyScalar(scale);
      this.root.add(obj);
      this.decor.push({ obj, spin: (Math.random() - 0.5) * 0.6 });
      this.placeDecor(this.decor[i], -400 + Math.random() * 480);
    }
  }

  placeDecor(d, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    if (this.envName === 'belt') {
      d.obj.position.set((Math.random() * 2 - 1) * 140, (Math.random() * 2 - 1) * 60, z);
    } else {
      d.obj.position.set(side * (45 + Math.random() * 150), 28 + Math.random() * 60, z);
    }
  }

  // Recycles decor that has fallen behind the camera to the far distance.
  updateDecor(playerZ, dt) {
    for (const d of this.decor) {
      d.obj.rotation.y += d.spin * dt;
      if (d.obj.position.z > playerZ + 60) this.placeDecor(d, playerZ - 400 - Math.random() * 120);
    }
  }
}
