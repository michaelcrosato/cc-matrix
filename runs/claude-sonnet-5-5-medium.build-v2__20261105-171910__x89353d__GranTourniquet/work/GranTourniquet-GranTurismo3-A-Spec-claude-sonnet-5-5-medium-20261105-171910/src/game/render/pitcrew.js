// The pit crew: six people from the cast run in, jack the car 0.15 m, swap wheels, fuel, and run off. Plan section 9 (Pit stop).
import { THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { loadCast } from '../models/cast.js';
const { Vector3 } = THREE;
App.pit = {
  async begin(sc, car) {
    if (car._crew || sc.crewBusy) return; sc.crewBusy = true; const ctx = sc.ctx; const cast = await loadCast(ctx); const tr = sc.sim.tr, c = car.c, v = sc.views.get(car); if (!v) { sc.crewBusy = false; return; }
    const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), rx = -cs, rz = sn, T = (c.p?.T ?? 1.5) / 2 + 0.9, L = c.p.a, B = c.p.b;
    const spots = [{ role: 'crew', x: -T, z: L, clip: 'PitWheelGun' }, { role: 'crew', x: T, z: L, clip: 'PitWheelGun' }, { role: 'crew', x: -T, z: -B, clip: 'PitWheelGun' }, { role: 'crew', x: T, z: -B, clip: 'PitWheelGun' }, { role: 'benno', x: -T - 1.4, z: 0, clip: 'PitJack' }, { role: 'marshal', x: T + 1.6, z: -B - 0.6, clip: 'PitFuel' }];
    const crew = []; for (const s of spots) { const p = await cast.make(s.role); ctx.scene.add(p.root); const goal = new Vector3(c.x + sn * s.z + rx * s.x * -1, c.y, c.z + cs * s.z + rz * s.x * -1); const start = goal.clone().add(new Vector3(rx * 14 * Math.sign(-s.x || 1), 0, rz * 14 * Math.sign(-s.x || 1))); p.root.position.copy(start); p.goal = goal; p.start = start; p.clip = s.clip; p.play('Run'); p.root.rotation.y = Math.atan2(goal.x - start.x, goal.z - start.z); crew.push(p); }
    car._crew = { crew, t: 0, phase: 'in', root: v }; sc.pitCrewList = crew; App.mix?.sfx?.('wrench'); sc.crewBusy = false;
    sc.updatePit = (dt) => { const k = car._crew; if (!k) return; k.t += dt; for (const p of k.crew) { p.update(dt); if (k.phase === 'in') { const f = Math.min(1, k.t / 1.0); p.root.position.lerpVectors(p.start, p.goal, f); if (f >= 1 && p.name !== p.clip) { p.root.rotation.y = Math.atan2(c.vx * 0 + (p.goal.x < c.x ? 1 : -1), 0) + (p.goal.x < c.x ? 0 : Math.PI) - Math.PI / 2 * 0; p.root.lookAt(c.x, p.root.position.y, c.z); p.play(p.clip, { once: p.clip === 'PitWheelGun' }); } } else if (k.phase === 'out') { const f = Math.min(1, k.t / 1.0); p.root.position.lerpVectors(p.goal, p.start, f); } }
      const hide = k.phase === 'service' && k.t > 1.2 && k.t < 3.2 && car.pitState?.tyres; k.root.wheels.forEach((w) => { w.piv.visible = !hide; });
      const lift = k.phase === 'service' || (k.phase === 'in' && k.t > 1) ? 0.15 : 0; k.lift = (k.lift ?? 0) + (lift - (k.lift ?? 0)) * Math.min(1, dt * 8); k.root.body.position.y += 0; k.root.root.position.y += k.lift; if (k.phase === 'out' && k.t > 1.1) { for (const p of k.crew) p.root.removeFromParent(); car._crew = null; sc.updatePit = null; } };
  },
  end(sc, car) { const k = car._crew; if (!k) return; k.phase = 'out'; k.t = 0; for (const p of k.crew) p.play('Run'); App.mix?.sfx?.('jack'); },
};
