import * as THREE from 'three/webgpu';
import { INK } from '../data/config.js';

// Inked world-space words: canvas-texture sprites that pop and fade.
const cache = new Map();
function wordTexture(word, colour) {
  const key = word + colour;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  if (g) {
    g.font = '700 120px Fredoka, Arial Rounded MT Bold, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 26; g.strokeStyle = INK; g.strokeText(word, 256, 100);
    g.fillStyle = colour; g.fillText(word, 256, 100);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

export class ComicText {
  constructor(scene) { this.scene = scene; this.items = []; }
  pop(word, x, y, z, { colour = '#FFF4DC', size = 2.4, life = 1.1 } = {}) {
    const mat = new THREE.SpriteNodeMaterial({ map: wordTexture(word, colour), transparent: true, depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.renderOrder = 50;
    s.userData = { t: 0, life, size, vy: 0.7, tilt: (word.length % 2 ? 1 : -1) * 0.12 };
    mat.rotation = s.userData.tilt;
    this.scene.add(s);
    this.items.push(s);
    return s;
  }
  frame(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const s = this.items[i], u = s.userData;
      u.t += dt;
      const k = u.t / u.life;
      const pop = Math.min(1, u.t / 0.1);
      const sc = u.size * (pop < 1 ? pop * 1.25 : 1 + 0.25 * Math.max(0, 1 - (u.t - 0.1) / 0.12));
      s.scale.set(sc, sc * 0.375, 1);
      s.position.y += u.vy * dt;
      s.material.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      if (k >= 1) { this.scene.remove(s); s.material.dispose(); this.items.splice(i, 1); }
    }
  }
  clear() { for (const s of this.items) { this.scene.remove(s); s.material.dispose(); } this.items = []; }
}
