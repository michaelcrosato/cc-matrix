/** @file Quinine crates attach to a pickup or boat, can be retrieved, and unload at the clinic when stopped. */
import { Vector3, Quaternion, removeProp } from '../../../engine/sim-api';
import { campaign, mark, say, type GW } from './state';
import { ground } from './map';
export function cargoStep(w: GW): void {
  const c = campaign(w),
    groups = new Map<number, number>();
  for (const e of w.query('usable', 'sceneProp')) {
    const u = e.usable.data;
    if (u.kind !== 'crate' || u.done || !u.extra.startsWith('vehicle:')) continue;
    const id = Number(u.extra.slice(8)),
      r = w.get(id);
    if (!r?.ride || !r.sceneProp || r.ride.data.hp <= 0) {
      u.extra = '';
      u.y = ground(u.x, u.z) + 0.6;
      e.sceneProp.y = u.y - 0.6;
      continue;
    }
    const n = groups.get(id) ?? 0;
    groups.set(id, n + 1);
    const p = r.sceneProp,
      q = new Quaternion(...p.q),
      at = new Vector3(n % 2 ? 0.38 : -0.38, 1.15, -0.9 - Math.floor(n / 2) * 0.65)
        .applyQuaternion(q)
        .add(new Vector3(p.x, p.y, p.z));
    Object.assign(e.sceneProp, { x: at.x, y: at.y, z: at.z, q: [...p.q] });
    Object.assign(u, { x: at.x, y: at.y + 0.6, z: at.z });
    if (Math.hypot(p.x - 330, p.z - 1147) < 18 && r.ride.data.speed < 2) {
      u.done = true;
      u.extra = '';
      c.flags.deliveries = (c.flags.deliveries ?? 0) + 1;
      removeProp(w, e.id);
      c.save++;
      mark(w, 'cargo delivery');
      say(w, 'Perpetua', `${c.flags.deliveries} crates in the shade. Keep the engine clear of the door.`);
    }
  }
}
