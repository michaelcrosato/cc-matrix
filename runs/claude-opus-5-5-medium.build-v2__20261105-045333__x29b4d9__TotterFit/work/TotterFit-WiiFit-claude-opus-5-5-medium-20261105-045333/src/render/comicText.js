import * as THREE from 'three/webgpu';
// Inked world-space words. Canvas-texture sprites that pop and fade.
const cache = new Map();
function tex(word, color) {
  const key = word + color; if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 180; const x = c.getContext('2d');
  if (x) {
    x.font = '700 110px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 24; x.strokeStyle = '#1A1420'; x.strokeText(word, 256, 92); x.fillStyle = color; x.fillText(word, 256, 92);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
export class ComicText {
  constructor(scene) { this.scene = scene; this.list = []; }
  pop(word, x, y, z, color = '#FFD23F', scale = 1, life = 1.1) {
    const mat = new THREE.SpriteNodeMaterial({ map: tex(word, color), transparent: true, depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(mat); s.position.set(x, y, z); s.renderOrder = 10; s.center.set(.5, .5); this.scene.add(s);
    this.list.push({ s, t: 0, life, scale, rot: 0 });
  }
  tick(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i]; o.t += dt; const a = o.t / o.life;
      const pop = Math.min(1, o.t / .12); const sc = o.scale * (pop < 1 ? pop * 1.25 : 1.25 - .25 * Math.min(1, (o.t - .12) / .15));
      o.s.scale.set(2.6 * sc, .91 * sc, 1); o.s.position.y += dt * .4; o.s.material.opacity = a > .7 ? 1 - (a - .7) / .3 : 1;
      if (a >= 1) { this.scene.remove(o.s); o.s.material.dispose(); this.list.splice(i, 1); }
    }
  }
  clear() { for (const o of this.list) { this.scene.remove(o.s); o.s.material.dispose(); } this.list.length = 0; }
}
