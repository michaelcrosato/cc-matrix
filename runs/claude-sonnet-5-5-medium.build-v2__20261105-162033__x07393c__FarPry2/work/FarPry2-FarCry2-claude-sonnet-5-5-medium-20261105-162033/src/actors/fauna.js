// Atmosphere: gazelle herds that bolt from gunshots and fire, vultures circling burnt ground and bodies. They cannot hurt you.
import { THREE, buildModel } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';

const V3 = THREE.Vector3;
const HERDS = [[-100, 260], [330, 200], [-380, -20], [250, -380]];
export class FaunaSystem {
  name = 'fauna';
  gazelles = []; vultures = [];
  setup(g) {
    this.g = g; g.fauna = this; if (g.session) return;
    const rng = g.ctx.random.fork('fauna'); this.rng = rng;
    for (const [hx, hz] of HERDS) for (let i = 0; i < 6; i++) {
      const o = buildModel('gazelle', { catalog: CATALOG }).object; g.ctx.scene.add(o); const x = hx + rng.range(-15, 15), z = hz + rng.range(-15, 15);
      this.gazelles.push({ o, x, z, yaw: rng.range(0, 6.28), flee: 0, home: [hx, hz], t: rng.range(0, 4), phase: rng.range(0, 6), legs: ['LegFR', 'LegFL', 'LegBR', 'LegBL'].map((n) => o.getObjectByName(n)) });
    }
    for (let i = 0; i < 4; i++) { const o = buildModel('vulture', { catalog: CATALOG }).object; g.ctx.scene.add(o); this.vultures.push({ o, a: rng.range(0, 6.28), c: new V3(), wr: o.getObjectByName('WingR'), wl: o.getObjectByName('WingL'), on: false, r: rng.range(12, 22) }); }
    const scare = (pos, r) => { for (const a of this.gazelles) if (Math.hypot(a.x - pos.x, a.z - pos.z) < r) a.flee = 6; };
    this.scare = scare; g.events.on('shotAt', () => {});
  }
  fixed(g, dt) {
    if (g.session || !this.gazelles.length) return; const f = g.player.feet;
    for (const a of this.gazelles) {
      a.t -= dt; const dp = Math.hypot(a.x - f.x, a.z - f.z);
      if (g.fire.burningAt(a.x + 10, a.z) || g.fire.burningAt(a.x, a.z + 10) || g.fire.burningAt(a.x - 10, a.z) || (g.weapons.lastShot > g.ctx.time - 1.5 && dp < 140) || (dp < 12 && g.player.speed2 > 20)) a.flee = 5;
      if (a.flee > 0) { a.flee -= dt; const dx = a.x - f.x, dz = a.z - f.z, d = Math.hypot(dx, dz) || 1; a.yaw = Math.atan2(-dx, -dz); a.x += dx / d * 9 * dt; a.z += dz / d * 9 * dt; a.sp = 9; }
      else { if (a.t <= 0) { a.t = this.rng.range(3, 8); a.tx = a.home[0] + this.rng.range(-25, 25); a.tz = a.home[1] + this.rng.range(-25, 25); a.graze = this.rng.chance(0.4); } if (a.tx !== undefined && !a.graze) { const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz); if (d > 1) { a.yaw = Math.atan2(-dx, -dz); a.x += dx / d * 1.4 * dt; a.z += dz / d * 1.4 * dt; a.sp = 1.4; } else a.sp = 0; } else a.sp = 0; }
    }
  }
  frame(g, dt) {
    if (g.session) return; const t = g.ctx.time;
    for (const a of this.gazelles) { a.o.position.set(a.x, g.world.heightAt(a.x, a.z), a.z); a.o.rotation.y = a.yaw + Math.PI; a.phase += (a.sp || 0) * dt * 2; const sw = Math.sin(a.phase) * (a.sp ? 0.8 : 0); a.legs[0].rotation.x = sw; a.legs[3].rotation.x = sw; a.legs[1].rotation.x = -sw; a.legs[2].rotation.x = -sw; }
    // vultures circle the nearest dead soldier or burnt cell
    const f = g.player.feet; let focus = null, bd = 220;
    for (const s of g.soldierSys.list) if (!s.alive) { const d = Math.hypot(s.pos.x - f.x, s.pos.z - f.z); if (d < bd) { bd = d; focus = s.pos; } }
    if (!focus && g.fireSys.grid.counts().burnt > 30) { const gr = g.fireSys.grid; const [cx, cz] = gr.cellOf(f.x, f.z); for (let k = 0; k < 40 && !focus; k++) { const i = gr.idx(cx + ((k * 7) % 30) - 15, cz + ((k * 11) % 30) - 15); if (i >= 0 && gr.state[i] === 2) { const [x, z] = gr.cellCenter(i); focus = new V3(x, 0, z); } } }
    this.vultures.forEach((v, i) => { v.on = !!focus; v.o.visible = v.on; if (!focus) return; v.c.lerp(focus, 0.02); v.a += dt * (0.4 + i * 0.05); const x = v.c.x + Math.cos(v.a) * v.r, z = v.c.z + Math.sin(v.a) * v.r; v.o.position.set(x, g.world.heightAt(x, z) + 22 + i * 3, z); v.o.rotation.y = -v.a; const fl = Math.sin(t * 5 + i) * 0.5; v.wr.rotation.z = fl; v.wl.rotation.z = -fl; });
  }
  state() { return { fauna: { gazelles: this.gazelles.length, vultures: this.vultures.filter((v) => v.on).length } }; }
}
