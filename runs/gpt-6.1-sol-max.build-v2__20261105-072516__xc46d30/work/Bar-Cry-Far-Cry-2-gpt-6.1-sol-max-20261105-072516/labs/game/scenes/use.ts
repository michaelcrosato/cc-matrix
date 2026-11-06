/** @file Diegetic interaction, carrying, caches, tape playback, repairs and teammate revives. */
import { spawnProp, removeProp, useDoor, actOn, type DoorComponent } from '../../../engine/sim-api';
import { campaign, players, distance, mark, say, type GW, type Person, type Gun } from './state';
import { enterVehicle } from './vehicles';
import { command } from './story';
import { helpBuddy, beginAction } from './health';
import { TAPES } from './content';
import { ground } from './map';
import { gun, weaponId } from '../weapons/guns';

export function addUsable(
  w: GW,
  key: string,
  kind: string,
  label: string,
  x: number,
  z: number,
  prop = 'tinbox',
  extra = '',
): number {
  const y = ground(x, z);
  return spawnProp(
    w,
    { prop: `prop:field-${prop}`, at: [x, y, z], yaw: 0 },
    { components: { usable: { data: { key, kind, label, x, y: y + 0.6, z, done: false, extra } } } },
  );
}
export function useOne(w: GW, p: Person, id: number): void {
  const c = campaign(w),
    s = p.seat!.data,
    e = w.get(id);
  if (!e) return;
  if (e.ride) {
    enterVehicle(w, p, id);
    return;
  }
  const u = e.usable?.data;
  if (!u || u.done) return;
  mark(w, 'use');
  w.emit('use', { id: p.id });
  if (u.kind === 'person') {
    c.flags[`talk:${u.key}`] = 1;
    if (u.key === 'Perpetua' && s.pills < 4) {
      s.pills = 4;
      mark(w, 'clinic supplies');
      c.save++;
    }
    if (u.key === 'Engineer') c.flags.engineerFollowing = 1;
    c.flags.dialogue = id;
    const lines: Record<string, string> = {
      Engineer: 'South along the pipe. I would like to finish the walk.',
      Perpetua: 'Take the bitter ones with water. If there is no water, take them anyway.',
      Cassius: 'The Lord sends rain. I send you, because you are cheaper.',
      Naré: 'You will hear that we are monsters. It is true, but we keep records.',
      Ferreira: 'Everything I sell works. For a while. That is also true of you.',
      Lazare: 'A warrant is just a bill with a better class of envelope.',
      Auctioneer: 'You have brought your own reserve price. How considerate.',
    };
    say(w, u.key, lines[u.key] ?? 'We are still alive. Someone will be disappointed.');
    c.flags.shop = u.key === 'Ferreira' ? 1 : 0;
    const buddy = c.buddies.find((b) => b.key === u.key);
    if (buddy?.fallen) {
      mark(w, 'mercy prompt');
      c.flags.buddyChoice = id;
    }
  } else if (u.kind === 'cache') {
    if (c.caches.includes(u.key)) return;
    s.stones += 7;
    c.caches.push(u.key);
    u.done = true;
    mark(w, 'tin box');
    c.save++;
    say(w, 'Field note', 'Seven rough stones. No name in the box.');
  } else if (u.kind === 'tape') {
    if (!c.tapes.includes(u.key)) c.tapes.push(u.key);
    mark(w, 'tape');
    c.flags[`use:${u.key}`] = 1;
    say(w, 'The Auctioneer', TAPES.find((t) => t[0] === u.key)?.[3] ?? TAPES[5][3]);
    c.save++;
  } else if (u.kind === 'crate') {
    if (!s.carrying) {
      u.extra = '';
      s.carrying = u.key;
      mark(w, 'carry');
      say(w, 'Field note', 'A crate in both hands. A weapon in neither.');
    }
  } else if (u.kind === 'bed') {
    if (!c.claimed.includes(u.extra) && !['mission', 'airstrip'].includes(u.extra)) {
      say(w, 'Field note', 'Clear the guards before you sleep.');
      return;
    }
    c.flags.sleep = id;
  } else if (u.kind === 'armoury') command(w, { kind: 'reissue', seat: s.n });
  else if (u.kind === 'gun') {
    const found = JSON.parse(u.extra) as Gun,
      g = gun(found.key),
      old = p.gunState.data.guns[g.slot];
    p.gunState.data.guns[g.slot] = found;
    p.weapons.slots[g.slot] = weaponId(found.key, found.condition);
    p.weapons.mags[g.slot] = g.mag;
    p.weapons.slot = g.slot;
    p.weapons.last = g.slot;
    u.extra = JSON.stringify(old);
    u.label = `Swap for ${gun(old.key).name}`;
    mark(w, 'picked gun');
  } else {
    c.flags[`use:${u.key}`] = 1;
    if (u.kind === 'objective') {
      u.done = true;
      say(w, 'Field note', 'Paperwork secured. The men who wrote it will want it back.');
    }
    if (u.kind === 'phone')
      say(w, 'Field telephone', 'Salt Works. Bring a clean needle. I have used up the alternatives.');
  }
}
export function useStep(w: GW): void {
  const c = campaign(w);
  for (const p of players(w)) {
    const s = p.seat!.data;
    if (s.vehicle >= 0) continue;
    if (s.useHeld < 0) {
      s.useHeld = 0;
      continue;
    }
    let target = -1,
      best = 2.9,
      prompt = '';
    const yaw = s.wants.look?.[0] ?? p.actor.yaw;
    for (const e of w.query('usable')) {
      const u = e.usable.data;
      if (u.done || u.key === s.carrying || (c.mode === 'contract' && ['person', 'bed'].includes(u.kind))) continue;
      if (e.actor) {
        u.x = e.actor.x;
        u.y = e.actor.y + 1;
        u.z = e.actor.z;
      }
      const d = distance(p.actor, u),
        alignment = d < 0.2 ? 1 : ((u.x - p.actor.x) * Math.sin(yaw) + (u.z - p.actor.z) * Math.cos(yaw)) / d;
      if (d < best && alignment > 0.35) {
        best = d;
        target = e.id;
        prompt = u.label;
      }
    }
    for (const e of w.query('ride', 'sceneProp')) {
      const d = distance(p.actor, e.sceneProp);
      if (d < 3 && (target < 0 || d < best - 0.7) && e.ride.data.hp > 0) {
        best = d;
        target = e.id;
        prompt = e.ride.data.hp < 180 ? 'Enter · hold to repair' : 'Enter ' + e.ride.data.kind;
      }
    }
    for (const door of w.query('door' as never) as unknown as { id: number; door: DoorComponent }[]) {
      const d = Math.hypot(door.door.hinge[0] - p.actor.x, door.door.hinge[2] - p.actor.z);
      if (d < best) {
        target = door.id;
        best = d;
        prompt = 'Open / close door';
      }
    }
    for (const other of players(w)) {
      if (other.id === p.id || other.seat!.data.down <= 0) continue;
      const d = distance(p.actor, other.actor);
      if (d < 3) {
        target = other.id;
        prompt = 'Hold to revive';
      }
    }
    s.target = target;
    s.prompt = prompt;
    const held = (s.wants.b ?? []).includes('interact'),
      press = (s.wants.p ?? []).includes('interact') || (p.weapons.slot < 0 && (s.wants.p ?? []).includes('fire'));
    if (held) s.useHeld++;
    else s.useHeld = 0;
    if (s.carrying) {
      const crate = [...w.query('usable')].find((x) => x.usable.data.key === s.carrying);
      if (crate?.sceneProp)
        Object.assign(crate.sceneProp, {
          x: p.actor.x + Math.sin(yaw) * 0.7,
          y: p.actor.y + 0.9,
          z: p.actor.z + Math.cos(yaw) * 0.7,
        });
      if (press && target >= 0 && w.get(target)?.ride && crate) {
        crate.usable.data.extra = `vehicle:${target}`;
        s.carrying = '';
        enterVehicle(w, p, target);
        mark(w, 'cargo loaded');
        continue;
      }
      if (press) {
        if (crate) {
          Object.assign(crate.usable.data, { x: p.actor.x, y: p.actor.y + 0.6, z: p.actor.z });
          if (crate.sceneProp) crate.sceneProp.y = p.actor.y;
        }
        if (distance(p.actor, { x: 330, z: 1147 }) < 17 && s.carrying.startsWith('quinine')) {
          c.flags.deliveries = (c.flags.deliveries ?? 0) + 1;
          if (crate) {
            crate.usable.data.done = true;
            removeProp(w, crate.id);
          }
          say(w, 'Perpetua', `${c.flags.deliveries} of three. Put it in the shade.`);
        }
        s.carrying = '';
      }
      continue;
    }
    const e = target >= 0 ? w.get(target) : undefined;
    if (e?.ride && e.ride.data.hp < 180 && s.useHeld === 1) beginAction(w, p, 'repair', 3);
    if (e?.ride && e.ride.data.hp < 180 && s.useHeld >= 180) {
      e.ride.data.hp = s.kit > 0 ? 300 : 180;
      if (s.kit > 0) s.kit--;
      e.ride.data.burning = 0;
      s.useHeld = 0;
      mark(w, 'repair');
      say(w, 'Field note', 'It will run. That is a lower standard than it used to be.');
      actOn(w, p.id, (a) => a.play('action:field-repair'));
      continue;
    }
    if (e?.seat && e.seat.data.down > 0 && s.useHeld >= 180) {
      e.seat.data.down = 0;
      e.health!.hp = 40;
      s.revives++;
      s.useHeld = 0;
      mark(w, 'teammate revive');
      continue;
    }
    if (e?.usable?.data.kind === 'person' && s.useHeld >= 120) {
      const b = c.buddies.find((x) => x.key === e.usable!.data.key);
      if (b?.fallen) {
        helpBuddy(w, p, b.key);
        s.useHeld = 0;
      }
    }
    if (press && target >= 0) {
      if ((e as unknown as { door?: DoorComponent })?.door) useDoor(w, target, [p.actor.x, p.actor.y, p.actor.z]);
      else if (e?.ride && e.ride.data.hp < 180) {
        /* A tap enters; a continued hold repairs before entry. */
      } else useOne(w, p, target);
    }
    if (!held && s.released.includes('interact') && e?.ride && e.ride.data.hp < 180) useOne(w, p, target);
    if (s.locator) {
      const near = [...w.query('usable')]
        .filter((x) => x.usable.data.kind === 'cache' && !x.usable.data.done)
        .reduce((d, x) => Math.min(d, distance(p.actor, x.usable.data)), Infinity);
      if (near < 120 && w.tick % Math.max(4, Math.round(6 + (near / 120) * 54)) === 0)
        w.emit('locator', { id: p.id, distance: near });
    }
  }
}
