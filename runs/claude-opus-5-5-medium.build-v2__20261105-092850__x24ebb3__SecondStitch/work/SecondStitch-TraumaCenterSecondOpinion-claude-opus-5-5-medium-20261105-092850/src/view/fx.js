// Particles and small flourishes.
import { buildModel, setLookLayer } from '../../pixel-engine.js';
import { CATALOG, PROP_DEFS } from '../content/models/index.js';
import { TABLE_GAP } from './field.js';

const PRE = {
  blood: { count: [4, 8], life: [0.25, 0.55], speed: [1, 3], spread: 1, gravity: -9, size: [1, 1], colors: ['red', 'plum', 'red'] },
  foam: { count: [2, 3], life: [0.3, 0.6], speed: [0.3, 0.9], gravity: 1, size: [1, 1], colors: ['mist', 'white', 'red'] },
  smokeTool: { count: [1, 2], life: [0.4, 0.8], speed: [0.4, 1], gravity: 1.8, size: [1, 2], colors: ['mist', 'slate', 'slate'] },
  gelfoam: { count: [2, 4], life: [0.3, 0.6], speed: [0.3, 0.7], gravity: 0.7, size: [1, 1], colors: ['cyan', 'white', 'lime'] },
  spark: { count: [3, 6], life: [0.15, 0.35], speed: [1.5, 3.5], gravity: -4, size: [1, 1], colors: ['white', 'sand', 'white'] },
  goo: { count: [12, 22], life: [0.4, 0.9], speed: [1.5, 5], gravity: -9, size: [1, 2], colors: ['plum', 'lime', 'red'] },
  tears: { count: [6, 10], life: [0.3, 0.6], speed: [1, 2.4], gravity: -8, size: [1, 1], colors: ['cyan', 'white', 'sky'] },
  gold: { count: [20, 30], life: [0.5, 1.2], speed: [1, 4], gravity: 0.8, size: [1, 2], colors: ['sand', 'white', 'orange'] },
  plus: { count: [8, 12], life: [0.4, 0.8], speed: [0.8, 2], gravity: 2, size: [1, 1], colors: ['lime', 'cyan', 'white'] },
};

export class Fx {
  constructor(ctx, field, app) {
    this.ctx = ctx; this.field = field; this.app = app; this.flying = [];
    for (const [k, v] of Object.entries(PRE)) ctx.particles.register(k, v);
  }
  blood(x, y, z, n) { this.ctx.particles.burst('blood', [x, y + 0.1, z], n ? { count: n } : {}); }
  smoke(x, y, z) { if ((this.tick = (this.tick ?? 0) + 1) % 3 === 0) this.ctx.particles.burst('smokeTool', [x, y + 0.2, z]); }
  sparkAt(x, y, z) { this.ctx.particles.burst('spark', [x, y + 0.15, z]); }
  inject(x, y, z) { this.ctx.particles.burst('plus', [x, y + 0.3, z]); }
  knock(x, z) { this.ctx.particles.burst('blood', [x, this.field.surface(x, z) + 0.2, z], { count: 10 }); this.ctx.engine.screen.shockwave([x, 0, z], { radius: 0.18, strength: 0.4 }); }
  strainHit(e) { this.ctx.particles.burst('goo', [e.x, this.field.surface(e.x, e.z) + 0.4, e.z]); }
  strainDead(e) { const x = e.x ?? 0, z = e.z ?? 0; this.ctx.particles.burst(e.type === 'miserere' ? 'gold' : 'goo', [x, this.field.surface(x, z) + 0.5, z], { count: 40 }); this.ctx.engine.screen.shockwave([x, 0, z], { radius: 0.4, strength: 0.7 }); }
  done(e, sim) {
    const x = e.x + (e.table ?? 0) * TABLE_GAP, y = this.field.surface(e.x, e.z);
    switch (e.k) {
      case 'pool': case 'bleeder': this.ctx.particles.burst('foam', [x, y + 0.2, e.z], { count: 8 }); break;
      case 'polyp': case 'egg': case 'cyst': case 'clot': this.ctx.particles.burst('goo', [x, y + 0.2, e.z], { count: 8 }); break;
      case 'mask': this.ctx.particles.burst('gelfoam', [x, y + 0.2, e.z], { count: 16 }); break;
      case 'dressing': case 'nick': this.ctx.particles.burst('plus', [x, y + 0.2, e.z]); break;
      case 'eye': this.ctx.particles.burst('tears', [x, y + 0.3, e.z]); break;
      default: break;
    }
    void sim;
  }
  toDish(e, table) {
    const def = PROP_DEFS[{ hook: 'hook', key: 'key', coin: 'coin', card: 'card', magnet: 'magnet', debris: 'debris', tumor: 'tumor', clamp: 'clamp', oldKidney: 'oldKidney', plate: 'plate', tendril: 'tendril' }[e.look] ?? 'hook'];
    const obj = buildModel(def, { catalog: CATALOG }).object.clone(true);
    setLookLayer(obj, 'actors');
    obj.scale.setScalar(0.8);
    const x0 = e.x + table * TABLE_GAP, y0 = this.field.surface(e.x, e.z) + 0.5, z0 = e.z;
    obj.position.set(x0, y0, z0);
    this.ctx.scene.add(obj);
    const dish = this.field.dish;
    const toX = 6.6 + table * TABLE_GAP;
    this.flying.push({ obj, t: 0, x0, y0, z0, x1: toX, y1: dish.y + 0.1, z1: dish.z, spin: 12 });
  }
  update(dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t = Math.min(1, f.t + dt / 0.35);
      const t = f.t;
      f.obj.position.set(f.x0 + (f.x1 - f.x0) * t, f.y0 + (f.y1 - f.y0) * t + Math.sin(t * Math.PI) * 2, f.z0 + (f.z1 - f.z0) * t);
      f.obj.rotation.y += f.spin * dt;
      if (t >= 1) { this.flying.splice(i, 1); this.ctx.particles.burst('spark', [f.x1, f.y1 + 0.1, f.z1], { count: 5 }); }
    }
  }
}
