// The Service Bay: oil and soap, with short animations and a word from Benno.
import { CAR_INFO } from '../../data/cars.js';
import { LINES } from '../../data/text.js';
import { carEntry, changeOil, oilOf, OIL_PRICE, WASH_PRICE, washCar } from '../../sim/career.js';
import { PALETTE, THREE, toonMaterial } from '../../../pixel-engine.js';
import { cr, statusStrip } from './common.js';
const { CylinderGeometry, Mesh } = THREE;
export class ServiceScreen {
  constructor(app) { this.id = 'service'; this.app = app; this.anim = null; }
  stageIt() { const a = this.app, c = carEntry(a.profile); a.scene?.stage?.('service', { car: { carId: c.carId, install: c.install, dirt: c.dirt, y: 0 }, carFixed: true, carYaw: 0, person: 'benno', personClip: 'MechanicWipe', personAt: [3.4, 0, 2.8], personYaw: -1.0, orbit: false, angle: 0.5, radius: 9.4, height: 3, sun: 0.75, lookX: -1.2 }); a.mix.music('socket'); }
  enter(ui) { this.stageIt(); const c = carEntry(this.app.profile), o = oilOf(c); ui.say('benno', o < 1 ? LINES.benno.oilTired : LINES.benno.oilFresh); }
  resume() { this.stageIt(); }
  exit() { this.removeBrushes(); }
  removeBrushes() { if (this.brushes) { for (const b of this.brushes) b.removeFromParent(); this.brushes = null; } }
  draw(ui, dt) {
    const app = this.app, p = app.profile, car = carEntry(p), oil = oilOf(car), w = Math.min(ui.w - 18, 190), x = 8;
    statusStrip(ui, app); ui.text(x, 19, 'SERVICE BAY', { scale: 2, color: 'sand' }); ui.text(x, 37, CAR_INFO[car.carId].short, { color: 'mist' });
    const oilText = oil > 1 ? 'FRESH: +2% POWER' : oil === 1 ? `FINE. ${Math.round(car.kmOil)} KM SINCE A CHANGE` : `TIRED: ${Math.round((oil - 1) * 100)}% POWER`, dirtText = car.dirt > 0.02 ? `${Math.round(car.dirt * 100)}% MUD` : 'CLEAN';
    const A = [['oil', 'OIL CHANGE', OIL_PRICE, oilText, oil < 1 ? 'red' : 'lime'], ['wash', 'CAR WASH', WASH_PRICE, dirtText, car.dirt > 0.02 ? 'orange' : 'lime']];
    A.forEach(([id, name, price, info, col], k) => { const y = 52 + k * 42, h = 37, f = ui.item(id, x, y, w, h, { confirm: () => this.act(ui, id, car), quiet: true }); ui.rect(x, y, w, h, f ? 'navy' : 'night'); ui.text(x + 6, y + 5, name, { color: f ? 'sand' : 'white' }); ui.text(x + w - 6, y + 5, cr(price), { align: 'right', color: p.credits >= price ? 'sand' : 'red' }); ui.text(x + 6, y + 16, info, { color: col }); if (id === 'wash') ui.text(x + 6, y + 26, 'NO EFFECT ON PERFORMANCE.', { color: 'slate' }); else ui.text(x + 6, y + 26, `${Math.round(car.km)} KM ON THE CLOCK`, { color: 'slate' }); });
    ui.prompts([['confirm', 'DO IT'], ['back', 'MAP']]);
    if (this.anim) this.anim(dt);
  }
  act(ui, id, car) {
    const app = this.app, p = app.profile;
    if (this.anim) return;
    if (id === 'oil') { const before = oilOf(car), r = changeOil(p, car); if (!r.ok) { app.mix.sfx('denied'); ui.note('NOT ENOUGH CREDITS.'); return; } app.save(); app.mix.sfx('register'); ui.say('benno', LINES.benno.oilDone); this.dripAnim(before); return; }
    const had = car.dirt, r = washCar(p, { ...car, dirt: car.dirt, wash: 0, install: car.install }); if (!r.ok) { app.mix.sfx('denied'); ui.note('NOT ENOUGH CREDITS.'); return; }
    ui.say('benno', had > 0.02 ? LINES.benno.wash : LINES.benno.washClean); app.mix.sfx('register'); this.washAnim(car, had);
  }
  dripAnim() { const app = this.app, s = app.scene, ctx = app.ctx; let t = 0; this.anim = (dt) => { t += dt; if (s?.car && t < 1.4) { s.car.jack = Math.min(0.5, t) * 0.8; ctx.particles.burst({ count: [1, 1], life: [0.25, 0.4], speed: [0, 0], gravity: 10, size: [1, 1], colors: ['ink', 'plum'] }, [s.base.x, 0.45, s.base.z + 0.8]); } else if (s?.car) { s.car.jack = Math.max(0, s.car.jack - dt); if (s.car.jack <= 0) this.anim = null; } else this.anim = null; }; }
  washAnim(car, had) {
    // Spinning brushes travel the car, foam flies, and the mud dissolves pixel by pixel.
    const app = this.app, s = app.scene, ctx = app.ctx, base = s.base;
    this.removeBrushes(); this.brushes = [-1.3, 1.3].map((sx) => { const m = new Mesh(new CylinderGeometry(0.4, 0.4, 2.2, 8), toonMaterial(PALETTE.lime)); m.position.set(base.x + sx, 1.1, base.z - 3.6); ctx.scene.add(m); return m; });
    let t = 0; const dur = 4;
    app.mix.sfx('splash');
    this.anim = (dt) => {
      t += dt; const f = Math.min(1, t / dur), z = base.z - 3.6 + 7.2 * (f < 0.5 ? f * 2 : 2 - f * 2);
      for (const b of this.brushes) { b.position.z = z; b.rotation.y += dt * 12; ctx.particles.burst('foam', [b.position.x, 0.8 + Math.sin(t * 23) * 0.6, z]); }
      if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) app.mix.sfx('brush');
      if (s?.car) s.car.setDirt(had * (1 - f));
      if (f >= 1) { car.dirt = 0; car.wash = (car.wash ?? 0) + 1; app.save(); this.removeBrushes(); this.anim = null; }
    };
  }
}
