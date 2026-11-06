import * as THREE from 'three/webgpu';
import { toon } from './materials.js';
import { castOf } from '../data/cast.js';

const MOUTHS = {
  shut: (g, x, y) => { g.fillStyle = '#6a2030'; g.fillRect(x - 18, y, 36, 4); },
  ah: (g, x, y) => { g.fillStyle = '#4a1020'; g.beginPath(); g.ellipse(x, y + 6, 16, 12, 0, 0, Math.PI * 2); g.fill(); },
  ee: (g, x, y) => { g.fillStyle = '#6a2030'; g.fillRect(x - 22, y, 44, 6); },
  oh: (g, x, y) => { g.strokeStyle = '#6a2030'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y + 4, 12, 10, 0, 0, Math.PI * 2); g.stroke(); },
  smile: (g, x, y) => { g.strokeStyle = '#6a2030'; g.lineWidth = 4; g.beginPath(); g.arc(x, y - 6, 18, 0.2, Math.PI - 0.2); g.stroke(); },
  frown: (g, x, y) => { g.strokeStyle = '#6a2030'; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 16, 18, Math.PI + 0.3, -0.3); g.stroke(); },
};

function paintFace(canvas, look, expr) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = look.skin;
  g.fillRect(0, 0, canvas.width, canvas.height);
  const cx = 256;
  const eye = expr.eyes || 'neutral';
  const drawEye = (x) => {
    g.fillStyle = '#fff';
    const h = eye === 'closed' ? 3 : eye === 'narrow' ? 10 : eye === 'wide' ? 22 : 16;
    g.beginPath();
    g.ellipse(x, 232, 18, h, 0, 0, Math.PI * 2);
    g.fill();
    if (eye !== 'closed') {
      g.fillStyle = look.iris;
      g.beginPath();
      g.ellipse(x, 234, 8, eye === 'narrow' ? 6 : 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1a1020';
      g.beginPath();
      g.arc(x, 234, 4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(x - 6, 228, 4, 4);
    }
    g.strokeStyle = '#1a1020';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x - 20, 214);
    g.lineTo(x + 18, 210);
    g.stroke();
  };
  drawEye(cx - 62);
  drawEye(cx + 62);
  const brow = expr.brows || 0;
  g.strokeStyle = look.hair;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(cx - 86, 196 + brow);
  g.lineTo(cx - 40, 190 - brow);
  g.moveTo(cx + 40, 190 - brow);
  g.lineTo(cx + 86, 196 + brow);
  g.stroke();
  g.fillStyle = 'rgba(180, 70, 80, 0.35)';
  g.beginPath();
  g.ellipse(cx - 90, 270, 16, 8, 0, 0, Math.PI * 2);
  g.ellipse(cx + 90, 270, 16, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#8a5048';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx, 250);
  g.lineTo(cx - 4, 278);
  g.stroke();
  const mouth = MOUTHS[expr.mouth] || MOUTHS.shut;
  mouth(g, cx, 340);
  if (expr.sweat) {
    g.fillStyle = '#d8f4ff';
    g.beginPath();
    g.ellipse(cx + 120, 180, 6, 10, 0.4, 0, Math.PI * 2);
    g.fill();
  }
  if (expr.tears) {
    g.fillStyle = 'rgba(180, 220, 255, 0.8)';
    g.fillRect(cx - 70, 246, 4, 18);
    g.fillRect(cx + 66, 246, 4, 18);
  }
}

function reshapeHead(geo) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    if (y < 0) {
      const t = -y;
      const jaw = t > 0.25 ? ((t - 0.25) / 0.75) ** 1.4 : 0;
      x *= 1 - 0.1 * t - 0.42 * jaw;
      z *= 1 - 0.12 * t;
      z += 0.05 * t * t;
      y *= 1 + 0.16 * t;
    }
    z *= 0.94;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function makeBust(who, expr = {}) {
  const cast = castOf(who);
  const look = {
    skin: cast.skin || '#f0c2a0',
    hair: cast.hair || '#2a2118',
    iris: cast.iris || '#3a6ea5',
    cloth: cast.cloth || '#17707A',
  };
  const group = new THREE.Group();
  group.name = `bust-${who}`;
  const headGeo = new THREE.SphereGeometry(1, 48, 36);
  reshapeHead(headGeo);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  paintFace(canvas, look, expr);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  const head = new THREE.Mesh(headGeo, toon({ map }));
  head.castShadow = true;
  group.add(head);
  // Stop above the eyes. 0.55π buried the irises under the cap.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.34), toon({ color: look.hair }));
  cap.position.y = 0.15;
  group.add(cap);
  for (let i = 0; i < 18; i++) {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55 + (i % 5) * 0.08, 6), toon({ color: look.hair }));
    const a = (i / 18) * Math.PI * 2;
    lock.position.set(Math.cos(a) * 0.92, 0.15 - (i % 3) * 0.08, Math.sin(a) * 0.82);
    lock.lookAt(lock.position.x * 2, -1.2, lock.position.z * 2);
    group.add(lock);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.7, 20), toon({ color: look.skin }));
  neck.position.y = -1.18;
  group.add(neck);
  const pts = [new THREE.Vector2(0.34, 0.9), new THREE.Vector2(0.55, 0.82), new THREE.Vector2(1.5, 0.52), new THREE.Vector2(1.95, 0.05), new THREE.Vector2(2.08, -0.8), new THREE.Vector2(2.1, -2.2)];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), toon({ color: look.cloth }));
  torso.scale.z = 0.62;
  torso.position.y = -2.08;
  group.add(torso);
  group.userData.repaint = (next) => {
    paintFace(canvas, look, next || {});
    map.needsUpdate = true;
  };
  return group;
}

const LOOKS = {
  ren: { skin: '#f2c3a4', hair: '#24160f', iris: '#3d6e4a', cloth: '#8e2a3a' },
  bea: { skin: '#8a5a3a', hair: '#1a120e', iris: '#6a3a22', cloth: '#f5b700' },
  bell: { skin: '#e0b090', hair: '#c8c2b4', iris: '#4a6a88', cloth: '#243038' },
  pip: { skin: '#f6d2b8', hair: '#4a2a12', iris: '#2a6adf', cloth: '#3b82f6' },
  sorrento: { skin: '#d9b79a', hair: '#3a3a3a', iris: '#667', cloth: '#d8d2c8' },
  ines: { skin: '#c48862', hair: '#140c0a', iris: '#222', cloth: '#146b42' },
  voss: { skin: '#ecd0b4', hair: '#d8d0c4', iris: '#8a7048', cloth: '#4a3a48' },
  patient: { skin: '#e8b48f', hair: '#5a4030', iris: '#665544', cloth: '#d7ddd8' },
  narration: { skin: '#d7e4e6', hair: '#17707A', iris: '#0B2529', cloth: '#17707A' },
};

export function bustFor(who, expr) {
  const cast = castOf(who);
  cast.skin = LOOKS[who]?.skin || LOOKS.patient.skin;
  cast.hair = LOOKS[who]?.hair || LOOKS.patient.hair;
  cast.iris = LOOKS[who]?.iris || LOOKS.patient.iris;
  cast.cloth = LOOKS[who]?.cloth || LOOKS.patient.cloth;
  return makeBust(who, expr);
}
