// The Boat Harpooner: fixed to a rowboat, he only turns and throws, with a red glint on the point first.
import { PALETTE, THREE, glowMaterial, setLookLayer } from '../../../pixel-engine.js';

export const harpooner = {
  /** The red glint on the harpoon's point, all through the wind-up: your warning, and your chance to shoot him first. */
  glint(on) {
    if (on && !this.glintMesh) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), glowMaterial(PALETTE.red));
      m.castShadow = false;
      setLookLayer(m, 'actors');
      m.position.set(0, -0.32, 0.1);
      this.actor.root.getObjectByName('HandR').add(m);
      this.glintMesh = m;
    }
    if (this.glintMesh) this.glintMesh.visible = on;
    if (on) this.area.ctx.lights.request({ position: [this.x, this.y + 1.7, this.z], color: 0xff3030, intensity: 8, radius: 4, lifetime: 0.8 });
  },

  stepFixedThrower(dt, T, dist) {
    this.faceTo(T, dt, 3);
    if (this.cool <= 0 && dist < this.d.throwRange && this.area.director.takeThrow(this)) {
      this.cool = 4;
      this.thrownDone = false;
      this.enter('THROWUP');
    }
  },
};
