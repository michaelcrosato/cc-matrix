import * as THREE from 'three/webgpu';
import { positionLocal, normalLocal, normalView, vec3, smoothstep, dot, normalize, max, add } from 'three/tsl';

let rampTex = null;

export function toonRamp() {
  if (rampTex) return rampTex;
  const d = new Uint8Array([95, 95, 95, 255, 165, 165, 165, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  rampTex = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  rampTex.minFilter = THREE.NearestFilter;
  rampTex.magFilter = THREE.NearestFilter;
  rampTex.needsUpdate = true;
  return rampTex;
}

export function toon(opts = {}) {
  return new THREE.MeshToonNodeMaterial({ gradientMap: toonRamp(), ...opts });
}

export function wetOrgan(map, beat) {
  const mat = toon({ map });
  mat.positionNode = positionLocal.add(normalLocal.mul(beat.mul(0.03)));
  const glint1 = smoothstep(0.9935, 0.9945, dot(normalView, normalize(vec3(0.22, 0.62, 0.75))));
  const glint2 = smoothstep(0.9975, 0.998, dot(normalView, normalize(vec3(-0.35, 0.5, 0.8))));
  mat.emissiveNode = vec3(1, 0.93, 0.9).mul(max(glint1.mul(0.85), glint2.mul(0.6)));
  void add;
  return mat;
}

export function paintCanvas(hex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const g = canvas.getContext('2d');
  g.fillStyle = hex;
  g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(80, 16, 24, 0.45)';
  g.lineWidth = 2;
  const branch = (x, y, a, len, w) => {
    if (len < 8 || w < 0.4) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x2, y2);
    g.stroke();
    branch(x2, y2, a - 0.5, len * 0.72, w * 0.7);
    branch(x2, y2, a + 0.45, len * 0.66, w * 0.66);
  };
  branch(180, 820, -1.1, 180, 5);
  branch(640, 900, -1.6, 160, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, tex, g };
}

export function flipUVs(geometry) {
  const uvs = geometry.attributes.uv;
  for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - uvs.getY(i));
  uvs.needsUpdate = true;
  return geometry;
}
