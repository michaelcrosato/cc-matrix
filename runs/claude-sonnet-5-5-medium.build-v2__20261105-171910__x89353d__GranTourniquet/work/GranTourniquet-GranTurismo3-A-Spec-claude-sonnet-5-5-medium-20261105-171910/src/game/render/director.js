// The replay director: trackside posts every ~280 m, authored shots, cuts every 4-8 s, battles and slides preferred. Plan section 5 (Replays).
import { THREE } from '../../pixel-engine.js';
const { Vector3 } = THREE;
export class Director {
  constructor(tr, seed = 1) { this.tr = tr; this.posts = []; const L = tr.length, N = tr.N; let s = 80; let r = seed * 9301 % 233280;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    while (s < L) { const i = Math.round(s / tr.ds) % N, side = rnd() < 0.5 ? -1 : 1, off = 15 + rnd() * 10, h = 3 + rnd() * 5, t = side * (tr.width[i] / 2 + off); this.posts.push({ s, pos: new Vector3(tr.x[i] - tr.tz[i] * t, tr.y[i] + h, tr.z[i] + tr.tx[i] * t), fov: 18 + rnd() * 12, kind: 'tele' }); s += 280 + rnd() * 40 - 20; }
    const t0 = tr.width[0] / 2 + 6; this.posts.push({ s: 0, pos: new Vector3(tr.x[0] - tr.tz[0] * t0 - tr.tx[0] * 6, tr.y[0] + 0.7, tr.z[0] + tr.tx[0] * t0 - tr.tz[0] * 6), fov: 40, kind: 'start' });
    const mid = Math.round(N * 0.35); this.posts.push({ s: tr.length * 0.35, pos: new Vector3(tr.x[mid] - tr.tz[mid] * 4, tr.y[mid] + 40, tr.z[mid] + tr.tx[mid] * 4 - 30), fov: 35, kind: 'heli' });
    this.posts.push({ s: 6, pos: new Vector3(tr.x[1], tr.y[1] + 6.4, tr.z[1]), fov: 45, kind: 'gantry' });
    this.cur = null; this.t = 0; this.next = 0; this.look = new Vector3(); this.pos = new Vector3(); this.fov = 40; }
  pick(focus, others) { const L = this.tr.length, s = focus.s, speed = Math.hypot(focus.vx ?? 0, focus.vz ?? 0) + 8; let best = null, bd = 1e9; for (const p of this.posts) { let d = ((p.s - s) % L + L) % L; const want = Math.max(40, speed * 1.6); const sc = Math.abs(d - want) + (p === this.cur ? 400 : 0) + (p.kind === 'heli' ? 100 : 0); if (sc < bd) { bd = sc; best = p; } } return best; }
  update(dt, focus, cam, battle = false) { this.t += dt; if (!this.cur || this.t > this.next) { this.cur = this.pick(focus, []); this.t = 0; this.next = (battle ? 4 : 5 + ((this.cur?.s * 7) % 3)); this.pos.copy(this.cur.pos); if (!this.look.lengthSq()) this.look.set(focus.x, focus.y + 1, focus.z); }
    const k = 1 - Math.exp(-dt * 10); this.look.x += (focus.x - this.look.x) * k; this.look.y += (focus.y + 1 - this.look.y) * k; this.look.z += (focus.z - this.look.z) * k;
    cam.position.copy(this.cur.pos); if (this.cur.kind === 'heli') cam.position.y += Math.sin(this.t * 0.4) * 2; cam.lookAt(this.look); const dist = cam.position.distanceTo(this.look), fov = this.cur.kind === 'tele' ? Math.max(14, Math.min(40, this.cur.fov * 60 / Math.max(30, dist) * 0.9 + 8)) : this.cur.fov; if (Math.abs(cam.fov - fov) > 0.2) { cam.fov += (fov - cam.fov) * 0.2; cam.updateProjectionMatrix(); } }
}
