/** @file The always-carried machete: a short forward strike, a visible blade and a real attack window. */
import {
  defineComponent,
  spawnProp,
  removeProp,
  physicsOf,
  entityOfBody,
  strikeEntity,
  damage,
  Vector3,
  Quaternion,
  Euler,
  actOn,
} from '../../../engine/sim-api';
import { people, mark, cheat, type GW, type Person } from './state';
defineComponent('blade', {
  description: 'A short-lived machete action.',
  fields: { data: { type: 'object', default: {}, description: 'Owner, blade prop and attack window.' } },
});
interface Blade {
  owner: number;
  prop: number;
  born: number;
  until: number;
  struck: boolean;
}
export function beginMelee(w: GW, p: Person): void {
  const s = p.seat?.data;
  if (!s || s.down || w.tick < s.meleeNext) return;
  s.meleeNext = w.tick + 42;
  s.meleeUntil = w.tick + 36;
  s.map = false;
  if (p.weapons.slot >= 0) p.weapons.last = p.weapons.slot;
  p.weapons.slot = -1;
  p.animator.weapon = 'none';
  const prop = spawnProp(w, {
    prop: 'prop:field-machete',
    at: [p.actor.x, p.actor.y + 1, p.actor.z],
    yaw: p.actor.yaw,
  });
  w.spawn({ blade: { data: { owner: p.id, prop, born: w.tick, until: w.tick + 36, struck: false } } } as never);
  actOn(w, p.id, (a) => a.play('action:field-machete-chop'));
  mark(w, 'melee');
  w.emit('melee', { id: p.id });
}
function strike(w: GW, p: Person): void {
  const yaw = p.seat?.data.wants.look?.[0] ?? p.actor.yaw,
    from: [number, number, number] = [p.actor.x, p.actor.y + (p.motion?.stance === 'crouch' ? 0.75 : 1.3), p.actor.z];
  const candidates = people(w)
    .filter((t) => {
      const dx = t.actor.x - p.actor.x,
        dz = t.actor.z - p.actor.z,
        d = Math.hypot(dx, dz);
      return (
        t.id !== p.id && t.health.hp > 0 && d < 2.6 && (d < 0.1 || (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d > 0.5)
      );
    })
    .sort(
      (a, b) =>
        Math.hypot(a.actor.x - p.actor.x, a.actor.z - p.actor.z) -
        Math.hypot(b.actor.x - p.actor.x, b.actor.z - p.actor.z),
    );
  const t = candidates[0],
    dir = t
      ? new Vector3(t.actor.x - from[0], t.actor.y + 1.1 - from[1], t.actor.z - from[2]).normalize()
      : new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const hit = physicsOf(w).raycast(from, dir, {
    maxDistance: 2.6,
    groups: ['world', 'prop', 'actor', 'crowd', 'corpse'],
    exclude: p.actor.body,
  });
  if (hit && entityOfBody(w, hit.body) !== t?.id) {
    const id = entityOfBody(w, hit.body);
    if (id >= 0) strikeEntity(w, id, from, true, 'melee');
    if (
      !t ||
      ![...w.query('ragdoll' as never)].some(
        (e) => e.id === t.id && (e as unknown as { ragdoll: { bodies: number[] } }).ragdoll.bodies.includes(hit.body),
      )
    )
      return;
  }
  if (t) {
    damage(w, t, { amount: cheat(w, 'oneShot') ? 999 : 60, from, source: p.id });
    mark(w, 'melee hit');
    w.emit('melee-hit', { at: [t.actor.x, t.actor.y + 1, t.actor.z] });
  }
}
export function meleeStep(w: GW): void {
  for (const e of w.query('blade' as never) as unknown as { id: number; blade: { data: Blade } }[]) {
    const b = e.blade.data,
      p = people(w).find((p) => p.id === b.owner);
    if (!p || p.health.hp <= 0 || w.tick >= b.until || p.seat?.data.action) {
      removeProp(w, b.prop);
      w.despawn(e.id);
      continue;
    }
    const phase = (w.tick - b.born) / 36,
      yaw = p.seat!.data.wants.look?.[0] ?? p.actor.yaw,
      pitch = p.seat!.data.wants.look?.[1] ?? 0,
      swing = Math.sin(phase * Math.PI),
      forward = 0.48 + swing * 0.1,
      right = 0.26 - swing * 0.46,
      eye = p.motion?.stance === 'crouch' ? 0.81 : 1.52;
    const f = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)),
      r = new Vector3(-Math.cos(yaw), 0, Math.sin(yaw)),
      up = new Vector3(-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch));
    const at = new Vector3(p.actor.x, p.actor.y + eye, p.actor.z)
      .add(f.multiplyScalar(forward))
      .add(r.multiplyScalar(right))
      .add(up.multiplyScalar(-0.32));
    const q = new Quaternion().setFromEuler(new Euler(-pitch, yaw, -swing * 0.9, 'YXZ')),
      prop = w.get(b.prop)?.sceneProp;
    if (prop) Object.assign(prop, { x: at.x, y: at.y, z: at.z, q: [q.x, q.y, q.z, q.w] });
    if (!b.struck && phase >= 0.4) {
      b.struck = true;
      strike(w, p);
    }
  }
}
