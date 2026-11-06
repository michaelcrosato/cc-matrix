/** @file All actors' firearms: wear, jams, clearing, visible reloads, hits, fire weapons and explosions. */
import {
  getWeapon,
  physicsOf,
  entityOfBody,
  damage,
  recoilStep,
  spreadOf,
  strikeEntity,
  actOn,
  spawnProp,
  removeProp,
  defineComponent,
  type Intents,
} from '../../../engine/sim-api';
import { campaign, people, value, cheat, mark, say, type GW, type Person } from './state';
import { wants } from '../cast/mercs';
import { gun, weaponId } from '../weapons/guns';
import { ignite, cellAt } from './fire';
import { ground } from './map';
import { beginMelee } from './melee';
defineComponent('ballistic', {
  description: 'A travelling explosive or incendiary.',
  fields: { data: { type: 'object', default: {}, description: 'Flight, fuse and owner.' } },
});
type Ballistic = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  until: number;
  kind: string;
  owner: number;
  damage: number;
  prop: number;
};

export function blast(w: GW, x: number, y: number, z: number, amount = 100, radius = 12, owner = -1): void {
  for (const p of people(w)) {
    const d = Math.hypot(p.actor.x - x, p.actor.z - z);
    if (d > radius || p.health.hp <= 0 || (p.seat && cheat(w, 'god'))) continue;
    damage(w, p, { amount: amount * (1 - d / radius), from: [x, y, z], source: owner });
  }
  for (const r of w.query('ride', 'sceneProp')) {
    const d = Math.hypot(r.sceneProp.x - x, r.sceneProp.z - z);
    if (d < radius) r.ride.data.hp -= amount * 2 * (1 - d / radius);
  }
  ignite(w, x, z, 1);
  mark(w, 'explosion');
  w.emit('explosion', { at: [x, y, z], scale: 1.6 });
}
function launch(w: GW, p: Person, kind: string, yaw: number, pitch: number, amount = 100): void {
  const speed = kind === 'rocket' ? 45 : kind === 'flare' ? 32 : 16,
    x = p.actor.x,
    y = p.actor.y + 1.45,
    z = p.actor.z;
  const id = spawnProp(w, {
    prop: kind === 'frag' ? 'prop:field-frag' : 'prop:field-projectile',
    at: [x, y, z],
    yaw: 0,
  });
  w.spawn({
    ballistic: {
      data: {
        x,
        y,
        z,
        vx: Math.sin(yaw) * Math.cos(pitch) * speed,
        vy: Math.sin(pitch) * speed + (kind === 'rocket' ? 0 : 3),
        vz: Math.cos(yaw) * Math.cos(pitch) * speed,
        until: w.tick + (kind === 'frag' ? 180 : 300),
        kind,
        owner: p.id,
        damage: amount,
        prop: id,
      },
    },
  } as never);
}
export function projectileStep(w: GW): void {
  for (const e of w.query('ballistic' as never) as unknown as { id: number; ballistic: { data: Ballistic } }[]) {
    const b = e.ballistic.data,
      dx = b.vx / 60,
      dy = b.vy / 60,
      dz = b.vz / 60,
      len = Math.hypot(dx, dy, dz);
    const hit = physicsOf(w).raycast([b.x, b.y, b.z], [dx / len, dy / len, dz / len], {
      maxDistance: len,
      groups: ['world', 'prop', 'actor', 'flyer'],
      exclude: w.get(b.owner)?.actor?.body,
    });
    b.x += dx;
    b.y += dy;
    b.z += dz;
    b.vy -= b.kind === 'rocket' ? 0 : 9.8 / 60;
    const visual = w.get(b.prop)?.sceneProp;
    if (visual) Object.assign(visual, { x: b.x, y: b.y, z: b.z });
    if (!hit && b.y > ground(b.x, b.z) + 0.08 && w.tick < b.until) continue;
    if (b.kind === 'frag' && w.tick < b.until) {
      if (hit) {
        const dot = b.vx * hit.normal.x + b.vy * hit.normal.y + b.vz * hit.normal.z;
        b.vx -= 1.4 * dot * hit.normal.x;
        b.vy -= 1.4 * dot * hit.normal.y;
        b.vz -= 1.4 * dot * hit.normal.z;
        b.x = hit.point.x + hit.normal.x * 0.1;
        b.y = hit.point.y + hit.normal.y * 0.1;
        b.z = hit.point.z + hit.normal.z * 0.1;
      } else {
        b.y = ground(b.x, b.z) + 0.09;
        b.vy = Math.abs(b.vy) * 0.35;
      }
      b.vx *= 0.65;
      b.vz *= 0.65;
      continue;
    }
    if (b.kind === 'rocket' || b.kind === 'frag') blast(w, b.x, b.y, b.z, b.damage, 12, b.owner);
    else {
      ignite(w, b.x, b.z, b.kind === 'molotov' ? 1 : 0);
      w.emit('flare', { at: [b.x, b.y, b.z] });
    }
    removeProp(w, b.prop);
    w.despawn(e.id);
  }
}
function shoot(w: GW, p: Person, intents: Intents): void {
  const W = p.weapons,
    gs = p.gunState.data.guns[W.slot],
    g = gun(gs.key),
    kind = getWeapon(W.slots[W.slot]);
  const rng = w.rng.entity(p.id, 'arms');
  if (!cheat(w, 'noWear')) {
    gs.condition = Math.max(
      0,
      gs.condition -
        value(w, 'wear.perShot') *
          g.wear *
          (p.seat ? [1, 0.7, 0.5][p.seat.data.reliability] : 1) *
          (campaign(w).fire[cellAt(p.actor.x, p.actor.z)] === 2 ? 2 : 1),
    );
    mark(w, 'wear');
    if (gs.condition < 0.08 && rng.chance(0.02)) {
      gs.condition = 0;
      gs.broken = true;
      spawnProp(w, {
        prop: `prop:gun-${gs.key}-rusted-0`,
        at: [p.actor.x, ground(p.actor.x, p.actor.z) + 0.12, p.actor.z],
        yaw: p.actor.yaw,
      });
      W.slot = -1;
      p.health.hp -= 8;
      mark(w, 'gun break');
      say(w, 'Field note', 'The receiver has split. Replace the gun.');
      return;
    }
    if (rng.chance(0.25 * value(w, 'wear.jamK') * Math.pow(Math.max(0, 0.65 - gs.condition), 2) * g.jam)) {
      gs.jam = true;
      mark(w, 'jam');
      w.emit('jam', { id: p.id });
      return;
    }
  }
  let yaw = intents.look?.[0] ?? p.actor.yaw,
    pitch = intents.look?.[1] ?? 0;
  const from: [number, number, number] = [
    p.actor.x,
    p.actor.y + (p.seat?.data.down ? 0.45 : p.motion?.stance === 'crouch' ? 0.81 : 1.52),
    p.actor.z,
  ];
  if (intents.aim) {
    const a = intents.aim;
    yaw = Math.atan2(a[0] - from[0], a[2] - from[2]);
    pitch = Math.atan2(a[1] - from[1], Math.hypot(a[0] - from[0], a[2] - from[2]));
  }
  const spread =
    ((p.soldier ? value(w, 'ai.accuracy') : spreadOf(kind, W.aim, Math.hypot(p.actor.vx, p.actor.vz) > 0.5)) *
      Math.PI) /
    180;
  yaw += rng.range(-spread, spread);
  pitch += rng.range(-spread, spread);
  const dir: [number, number, number] = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  W.shots++;
  W.shot = w.time;
  const kick = recoilStep(kind, W.burst++);
  W.kick = [W.kick[0] + kick[0], W.kick[1] + kick[1]];
  if (!cheat(w, 'ammo')) W.mags[W.slot]--;
  if (g.kind === 'flare' || g.kind === 'rocket')
    launch(w, p, g.kind, yaw, pitch, g.damage * (p.seat ? value(w, 'damage.player') : value(w, 'damage.enemy')));
  if (g.kind === 'flame') {
    for (let d = 3; d < 17; d += 4) ignite(w, from[0] + dir[0] * d, from[2] + dir[2] * d);
  }
  const hit = physicsOf(w).raycast(from, dir, {
    maxDistance: g.kind === 'flame' ? 17 : kind.range,
    groups: ['world', 'prop', 'actor', 'crowd', 'flyer', 'corpse'],
    exclude: p.actor.body,
  });
  const to: [number, number, number] = hit
    ? [hit.point.x, hit.point.y, hit.point.z]
    : [from[0] + dir[0] * kind.range, from[1] + dir[1] * kind.range, from[2] + dir[2] * kind.range];
  let target = hit ? entityOfBody(w, hit.body) : -1;
  if (hit && target < 0) {
    const rag = [...w.query('ragdoll' as never)].find((e) =>
      (e as unknown as { ragdoll: { bodies: number[] } }).ragdoll.bodies.includes(hit.body),
    );
    if (rag) target = rag.id;
  }
  const struck = target >= 0 ? w.get(target) : undefined;
  let counted = false;
  if (struck?.sceneProp) strikeEntity(w, target, from, true, 'shot');
  if (
    g.kind !== 'rocket' &&
    g.kind !== 'flare' &&
    struck?.health &&
    struck.health.hp > 0 &&
    (!struck.seat || !cheat(w, 'god')) &&
    !(p.soldier && campaign(w).buddies.some((b) => b.entity === target && b.fallen > 0))
  ) {
    const head = to[1] > (struck.actor?.y ?? 0) + 1.45,
      amount =
        g.damage *
        (head ? 2.5 : to[1] < (struck.actor?.y ?? 0) + 0.85 ? 0.7 : 1) *
        (p.seat ? value(w, 'damage.player') : value(w, 'damage.enemy'));
    damage(
      w,
      { id: target, health: struck.health },
      { amount: cheat(w, 'oneShot') && p.seat ? 999 : amount, from, at: to, source: p.id },
    );
    W.hits++;
    counted = true;
  }
  if (hit) for (const r of w.query('ride')) if (r.ride.data.body === hit.body) r.ride.data.hp -= g.damage;
  w.emit('gunshot', {
    id: p.id,
    weapon: kind.id,
    from,
    to,
    normal: hit ? [hit.normal.x, hit.normal.y, hit.normal.z] : null,
    body: hit?.body ?? -1,
    target,
    hit: counted,
  });
  if (p.seat) {
    campaign(w).flags.noise = w.tick;
    campaign(w).flags.noiseX = p.actor.x;
    campaign(w).flags.noiseZ = p.actor.z;
    campaign(w).flags.noiseRadius = gs.key === 'whisper' ? 25 : 120;
  }
}
export function arms(w: GW): void {
  for (const p of people(w)) {
    if (!p.weapons || !p.gunState || (p.health.hp <= 0 && !(p.seat && p.seat.data.down > 0))) continue;
    const W = p.weapons,
      I = wants(p),
      pressed = I.p ?? [],
      held = I.b ?? [],
      s = p.seat?.data;
    for (let k = 0; k < p.gunState.data.guns.length; k++) {
      const gs = p.gunState.data.guns[k];
      if (w.settings.get<boolean>('game.noWear') && campaign(w).mode !== 'attract') gs.jam = false;
      let pose = 0;
      if (k === W.slot && gs.jam && gs.clear > 0) pose = Math.min(3, 1 + Math.floor(gs.clear / 18));
      if (k === W.slot && W.reload >= 0) pose = Math.min(3, 1 + Math.floor((W.reload - w.time) * 1.3));
      W.slots[k] = weaponId(gs.key, gs.condition, pose);
    }
    if (s?.meleeUntil && w.tick >= s.meleeUntil) {
      s.meleeUntil = 0;
      if (!s.down && !s.action && !p.gunState.data.guns[W.last]?.broken) W.slot = W.last;
    }
    if (s && (s.vehicle >= 0 || s.action || s.meleeUntil > w.tick)) continue;
    const next = pressed.includes('weapon1')
      ? 0
      : pressed.includes('weapon2')
        ? 1
        : pressed.includes('weapon3')
          ? 2
          : pressed.includes('quickfire')
            ? 0
            : pressed.includes('previous')
              ? (W.slot + W.slots.length - 1) % W.slots.length
              : pressed.includes('swap')
                ? (W.slot + 1) % W.slots.length
                : -1;
    if (pressed.includes('quickfire')) {
      p.gunState.data.guns[0] = { key: 'flare', condition: 1, jam: false, clear: 0, reserve: 12 };
      W.mags[0] = 1;
    }
    if (next >= 0 && p.gunState.data.guns[next]?.broken) {
      say(w, 'Field note', 'The receiver has split. Replace the weapon.');
      continue;
    }
    if (next >= 0) {
      W.slot = next;
      W.last = next;
      W.reload = -1;
      W.ready = w.time + 0.28;
    }
    if (pressed.includes('holster')) W.slot = W.slot >= 0 ? -1 : W.last;
    if (s && (Math.hypot(p.actor.x - 760, p.actor.z - 790) < 65 || s.carrying || s.map)) W.slot = -1;
    if (!p.seat) {
      const aim = I.aim;
      if (Math.hypot(p.actor.x - 760, p.actor.z - 790) < 65 || (aim && Math.hypot(aim[0] - 760, aim[2] - 790) < 65)) {
        W.slot = -1;
        continue;
      }
      if (W.slot < 0 && held.includes('fire') && !p.gunState.data.guns[W.last]?.broken) W.slot = W.last;
    }
    if (p.motion) p.motion.holstered = W.slot < 0;
    if (p.animator) p.animator.weapon = W.slot < 0 ? 'none' : 'gun';
    if (pressed.includes('throw') && s && s.molotovs > 0) {
      launch(w, p, 'molotov', I.look?.[0] ?? p.actor.yaw, (I.look?.[1] ?? 0) + 0.15);
      s.molotovs--;
      w.emit('throw', { id: p.id });
      actOn(w, p.id, (a) => a.play('action:field-throw'));
      mark(w, 'throw');
    }
    if (pressed.includes('frag') && s && s.frags > 0) {
      launch(w, p, 'frag', I.look?.[0] ?? p.actor.yaw, (I.look?.[1] ?? 0) + 0.16);
      s.frags--;
      actOn(w, p.id, (a) => a.play('action:field-throw'));
      mark(w, 'frag');
      w.emit('throw', { id: p.id });
    }
    if (pressed.includes('melee')) {
      beginMelee(w, p);
      continue;
    }
    if (W.slot < 0) {
      if (pressed.includes('fire') && s?.target === -1 && !p.gunState.data.guns[W.last]?.broken) W.slot = W.last;
      continue;
    }
    const gs = p.gunState.data.guns[W.slot],
      g = gun(gs.key);
    W.aim = Math.max(0, Math.min(1, W.aim + (held.includes('aim') ? 1 : -1) / 10));
    W.kick = [W.kick[0] * 0.93, W.kick[1] * 0.93];
    if (gs.jam) {
      if (held.includes('reload')) {
        gs.clear++;
        if (gs.clear === 1) actOn(w, p.id, (a) => a.play('action:field-jam-clear'));
        if (gs.clear >= 54) {
          if (w.rng('clear').chance(0.67)) {
            gs.jam = false;
            mark(w, 'clear');
            w.emit('rack', { id: p.id });
          }
          gs.clear = 0;
        }
      } else gs.clear = 0;
      continue;
    }
    if (W.reload >= 0 && w.time >= W.reload) {
      const amount = Math.min(g.mag - W.mags[W.slot], gs.reserve);
      W.mags[W.slot] += amount;
      gs.reserve -= amount;
      W.reload = -1;
    }
    if (
      (pressed.includes('reload') || W.mags[W.slot] === 0) &&
      W.reload < 0 &&
      gs.reserve > 0 &&
      W.mags[W.slot] < g.mag
    ) {
      W.reload = w.time + (g.slot ? 2.2 : 1.4);
      w.emit('reload', { id: p.id });
    }
    if (
      W.reload < 0 &&
      W.mags[W.slot] > 0 &&
      w.time >= W.next &&
      w.time >= W.ready &&
      (g.auto || !p.seat ? held.includes('fire') : pressed.includes('fire'))
    ) {
      W.next = w.time + 1 / g.rate;
      shoot(w, p, I);
    }
  }
}
