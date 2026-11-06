import { Engine, THREE, toonMaterial, PALETTE, setLookLayer, withUrlOptions } from './pixel-engine.js';
const { Mesh, PlaneGeometry, CanvasTexture, NearestFilter, BoxGeometry } = THREE;
class P {
  name = 'proto';
  async setup(ctx) {
    const cv = document.createElement('canvas'); cv.width = 480; cv.height = 270; const g = cv.getContext('2d');
    g.fillStyle = '#d65c4f'; g.fillRect(0, 0, 480, 270); g.fillStyle = '#3c0d24'; g.fillRect(100, 100, 80, 40);
    const tex = new CanvasTexture(cv); tex.magFilter = NearestFilter; tex.minFilter = NearestFilter;
    const geo = new PlaneGeometry(16, 9, 32, 18); geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    const m = new Mesh(geo, toonMaterial(PALETTE.white, { map: tex })); m.receiveShadow = true; ctx.scene.add(m);
    const b = new Mesh(new BoxGeometry(1, 1, 1), toonMaterial(PALETTE.sky)); b.position.set(0, 0.5, 0); b.castShadow = true; setLookLayer(b, 'actors'); ctx.scene.add(b);
    this.tex = tex; this.cv = cv; this.g = g; this.b = b;
    ctx.engine.sun.intensity = 1; ctx.engine.ambient.intensity = 0.55;
    ctx.lights.request({ position: [0, 5.2, 0.4], color: 0xffffff, intensity: 5, radius: 15 });
  }
  update(ctx, dt) { this.g.fillStyle = '#fff'; this.g.fillRect(200 + (ctx.time * 30) % 100, 50, 10, 10); this.tex.needsUpdate = true; ctx.hud.clear(); ctx.hud.text(4, 4, 'PROTO ' + ctx.hud.width + 'X' + ctx.hud.height, {}); const p = ctx.input.pointer; this.pp = [p.x, p.y]; const o = new THREE.Vector3(), d = new THREE.Vector3(); ctx.camera.rayAt(p.x, p.y, o, d); this.ray = [o.y, d.y]; }
  cameraTarget() { return new THREE.Vector3(0,0,0.1); }
  status() { return 'proto ' + JSON.stringify(this.ray); }
}
export const createGame = () => new P();
if (typeof document !== 'undefined') await Engine.start(createGame(), withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, camera: { preset: 'fixed', position: [0, 9.6, 3.1], target: [0, 0, 0.1], fov: 44, minZoom: 1, maxZoom: 1 }, look: { scene: [{ id: 'vignette', params: { intensity: 0.3 } }], actors: { pixel: { size: 1, outline: 0.85, crease: 0.2 }, filters: [] }, environment: { pixel: { size: 1, outline: 0, crease: 0 }, filters: [] } } }));
