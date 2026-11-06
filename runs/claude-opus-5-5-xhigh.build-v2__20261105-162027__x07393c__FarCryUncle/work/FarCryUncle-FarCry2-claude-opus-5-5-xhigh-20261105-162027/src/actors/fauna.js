// Gazelle herds in open grass and vultures over burnt ground. Atmosphere; they can't hurt you.
import { THREE, buildModel, compileClips, setLookLayer, Boids } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { FAUNA_CLIPS, FAUNA_RIG } from '../art/clips.js';
import { K } from '../world/ground.js';
const { AnimationMixer } = THREE;
export class Fauna {
  herds = []; birds = [];
  constructor(game) { this.game = game; }
  build(ctx) {
    const g = this.game;
    if (!g.views) return;
    const sample = buildModel('gazelle', { catalog: MODELS }).object;
    this.clips = Object.fromEntries(compileClips(FAUNA_CLIPS, FAUNA_RIG, sample).map((c) => [c.name, c]));
    const spots = [[-320, 170], [250, 280], [-120, -80], [420, 120], [-470, 260], [120, -60]];
    const r = ctx.random.fork('herd');
    for (const [hx, hz] of spots) {
      const herd = { hx, hz, animals: [], fleeT: 0, dir: 0 };
      for (let i = 0; i < 6; i++) {
        const o = buildModel('gazelle', { catalog: MODELS }).object;
        setLookLayer(o, 'actors');
        o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
        const x = hx + r.range(-14, 14), z = hz + r.range(-14, 14);
        const mixer = new AnimationMixer(o);
        const graze = mixer.clipAction(this.clips.GazGraze), run = mixer.clipAction(this.clips.GazRun);
        graze.play(); graze.time = r.range(0, 3);
        ctx.scene.add(o);
        herd.animals.push({ o, x, z, y: g.world.heightAt(x, z), yaw: r.range(0, 6.28), mixer, graze, run, running: false, off: r.range(0, 1) });
      }
      this.herds.push(herd);
    }
    // Vultures: a tiny flock circling the highest scar.
    this.flock = new Boids(10, { bounds: { min: [-70, 70, -70], max: [70, 110, 70] }, seed: 11 });
    this.birdCenter = [0, 40, 0];
    for (let i = 0; i < 10; i++) {
      const o = buildModel('vulture', { catalog: MODELS }).object;
      setLookLayer(o, 'actors');
      ctx.scene.add(o);
      this.birds.push({ o, wr: o.getObjectByName('WingR'), wl: o.getObjectByName('WingL'), ph: i * 0.8 });
    }
  }
  reset() {
    for (const h of this.herds) { h.fleeT = 0; for (const a of h.animals) a.running = false; }
  }
  scare(x, z, r) {
    for (const h of this.herds) {
      if (Math.hypot(h.hx - x, h.hz - z) < r * 1.1 && h.fleeT <= 0) { h.fleeT = 7; h.dir = Math.atan2(h.hx - x, h.hz - z); }
    }
  }
  update(ctx, dt) {
    const g = this.game;
    if (!g.views) return;
    const cam = g.camPos;
    for (const h of this.herds) {
      if (g.fireView.nearestDist < 90 && Math.hypot(h.hx - cam.x, h.hz - cam.z) < 200 && h.fleeT <= 0) { h.fleeT = 6; h.dir = g.wind.dir; }
      h.fleeT -= dt;
      const near = Math.hypot(h.hx - cam.x, h.hz - cam.z) < 200;
      for (const a of h.animals) {
        a.o.visible = near;
        if (!near) continue;
        const flee = h.fleeT > 0;
        if (flee !== a.running) { a.running = flee; if (flee) { a.run.reset().play(); a.graze.crossFadeTo(a.run, 0.15, false); } else { a.graze.reset().play(); a.run.crossFadeTo(a.graze, 0.3, false); } }
        if (flee) {
          a.yaw = h.dir + Math.sin(g.time + a.off * 6) * 0.2;
          const nx = a.x + Math.sin(a.yaw) * 11 * dt, nz = a.z + Math.cos(a.yaw) * 11 * dt;
          if (g.ground.kindAt(nx, nz) !== K.WATER && Math.abs(nx) < 620 && Math.abs(nz) < 620) { a.x = nx; a.z = nz; }
          a.y = g.world.heightAt(a.x, a.z);
        }
        a.o.position.set(a.x, a.y, a.z); a.o.rotation.y = a.yaw;
        a.mixer.update(dt);
      }
    }
    if (this.flock) {
      const fire = g.fire;
      // Circle the most recent large burn, or the Cut.
      const c = fire.burntList.length > 20 ? [fire.wx(fire.burntList[fire.burntList.length - 1]), fire.wz(fire.burntList[fire.burntList.length - 1])] : [cam.x + 120, cam.z - 150];
      this.birdCenter[0] += (c[0] - this.birdCenter[0]) * dt * 0.1; this.birdCenter[2] += (c[1] - this.birdCenter[2]) * dt * 0.1;
      this.flock.step(Math.min(dt, 1 / 20));
      for (let i = 0; i < this.birds.length; i++) {
        const b = this.birds[i], p = this.flock.pos, v = this.flock.vel, k = i * 3;
        b.o.position.set(this.birdCenter[0] + p[k], p[k + 1] + 20, this.birdCenter[2] + p[k + 2]);
        b.o.rotation.y = Math.atan2(v[k], v[k + 2]);
        const f = Math.sin(g.time * 2.4 + b.ph) * 0.25;
        if (b.wr) b.wr.rotation.z = f; if (b.wl) b.wl.rotation.z = -f;
      }
    }
  }
}
