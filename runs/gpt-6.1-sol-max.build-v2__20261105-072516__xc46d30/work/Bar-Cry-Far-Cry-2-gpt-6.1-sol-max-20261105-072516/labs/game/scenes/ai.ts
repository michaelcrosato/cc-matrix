/** @file Patrol, suspicion, squad flanks, suppression, smoke and grass concealment. Dead soldiers keep their worn weapons. */
import { physicsOf, handOff, spawnProp, actOn } from '../../../engine/sim-api';
import { campaign, players, people, value, cheat, distance, mark, type GW } from './state';
import { ground, PLACES } from './map';
import { cellAt, smokeBlocks } from './fire';
import { spawnSoldier } from '../cast/mercs';

export function detectionRange(w: GW, crouched: boolean, inGrass: boolean): number {
  const c = campaign(w),
    night = c.hour > 19 || c.hour < 6;
  return value(w, 'ai.sight') * (crouched && inGrass ? 0.35 : inGrass ? 0.8 : 1) * (night ? 0.6 : 1);
}
export function activate(w: GW): void {
  if (w.tick % 120) return;
  const c = campaign(w);
  if (c.mode === 'title') return;
  for (const site of PLACES) {
    if (site.faction === 'neutral' || c.claimed.includes(site.id)) continue;
    const near = players(w).some((p) => distance(p.actor, site) < 270);
    const live = people(w).some((p) => p.soldier?.data.place === site.id && !p.soldier.data.died);
    const cleared = c.cleared[site.id];
    if (
      !near ||
      live ||
      (cleared !== undefined && w.tick - cleared < value(w, 'ai.respawnHours') * value(w, 'day.minutes') * 150)
    )
      continue;
    if (cleared !== undefined) {
      delete c.cleared[site.id];
      mark(w, 'checkpoint return');
    }
    const roles = [
      'Rifleman',
      'Officer',
      'Sniper',
      'Gunner',
      'Rocketeer',
      site.faction === 'front' ? 'Flamer' : 'Rifleman',
    ];
    for (let k = 0; k < (site.type === 'safehouse' ? 2 : 6); k++) {
      const angle = k * 2.4,
        x = site.x + Math.sin(angle) * 25,
        z = site.z + Math.cos(angle) * 25;
      spawnSoldier(w, x, z, site.faction, site.id, roles[k]);
    }
  }
}
export function soldiers(w: GW): void {
  const c = campaign(w),
    all = people(w),
    seats = players(w);
  let attackers = 0;
  for (const p of all) {
    const a = p.soldier?.data;
    if (!a) continue;
    if (p.health.hp <= 0) {
      if (!a.died) {
        a.died = true;
        handOff(w, p.id, { dead: true, push: [0, 0.5, 1] });
        const owner = all.find((x) => x.id === p.health.hitBy);
        if (owner?.seat) owner.seat.data.kills++;
        const key = p.gunState.data.guns[0];
        spawnProp(
          w,
          {
            prop: `prop:gun-${key.key}-rusted-0`,
            at: [p.actor.x, ground(p.actor.x, p.actor.z) + 0.12, p.actor.z],
            yaw: p.actor.yaw,
          },
          {
            components: {
              usable: {
                data: {
                  key: `drop-${p.id}`,
                  kind: 'gun',
                  label: `Pick up ${key.key}`,
                  x: p.actor.x,
                  y: p.actor.y + 0.5,
                  z: p.actor.z,
                  done: false,
                  extra: JSON.stringify(key),
                },
              },
            },
          },
        );
        w.emit('soldier-down', { id: p.id });
      }
      continue;
    }
    if (!seats.length) continue;
    const target = seats.reduce((x, y) => (distance(p.actor, x.actor) < distance(p.actor, y.actor) ? x : y)),
      d = distance(p.actor, target.actor),
      s = target.seat!.data;
    if (d > 360) {
      p.actor.intents = {};
      continue;
    }
    if (c.fire[cellAt(p.actor.x, p.actor.z)] === 2) a.state = 'Panic';
    if (a.state === 'Panic') {
      p.actor.intents = { move: [Math.cos(c.wind), -Math.sin(c.wind)], b: ['sprint'] };
      if (w.tick % 90 === p.id % 90) actOn(w, p.id, (x) => x.play('action:field-panic-burn'));
      continue;
    }
    if ((w.tick + p.id) % 6 === 0) {
      const dx = target.actor.x - p.actor.x,
        dz = target.actor.z - p.actor.z,
        yaw = Math.atan2(dx, dz),
        angle = Math.abs(Math.atan2(Math.sin(yaw - p.actor.yaw), Math.cos(yaw - p.actor.yaw)));
      const inGrass = c.fire[cellAt(target.actor.x, target.actor.z)] === 1;
      const range = detectionRange(w, target.motion?.stance === 'crouch', inGrass) * (s.smock ? 0.8 : 1);
      const hit = physicsOf(w).raycast(
        [p.actor.x, p.actor.y + 1.4, p.actor.z],
        [dx / Math.max(1, d), 0, dz / Math.max(1, d)],
        { maxDistance: d, groups: ['world', 'prop'] },
      );
      const neutral = Math.hypot(target.actor.x - 760, target.actor.z - 790) < 65;
      const pass =
        target.weapons.slot < 0 &&
        s.vehicle < 0 &&
        (a.faction === 'front' ? c.front : c.authority) >= 1 &&
        Math.hypot(target.actor.vx, target.actor.vz) < 4.6;
      const seen =
        !neutral &&
        !pass &&
        !cheat(w, 'invisible') &&
        d < range &&
        (angle < Math.PI / 3 || a.state === 'Combat') &&
        (!hit || hit.distance > d - 1) &&
        !smokeBlocks(w, p.actor.x, p.actor.z, target.actor.x, target.actor.z);
      const heard =
        w.tick - (c.flags.noise ?? -9999) < 30 &&
        Math.hypot((c.flags.noiseX ?? 0) - p.actor.x, (c.flags.noiseZ ?? 0) - p.actor.z) <
          (c.flags.noiseRadius ?? 120) * value(w, 'ai.hearing');
      a.detect = Math.max(0, Math.min(1, a.detect + (seen ? 0.1 / value(w, 'ai.reaction') : -0.025)));
      if (pass && d < 35) mark(w, 'holstered pass');
      if (!seen && inGrass && target.motion?.stance === 'crouch' && d < 65) mark(w, 'stealth pass');
      if (a.detect >= 1) {
        a.state = 'Combat';
        a.lastX = target.actor.x;
        a.lastZ = target.actor.z;
        a.next = w.tick + 600;
        for (const mate of all)
          if (mate.soldier?.data.place === a.place && mate.id !== p.id) {
            mate.soldier.data.lastX = a.lastX;
            mate.soldier.data.lastZ = a.lastZ;
            if (mate.soldier.data.state === 'Patrol') mate.soldier.data.state = 'Search';
          }
      } else if (heard && a.state === 'Patrol') {
        a.state = 'Suspicious';
        a.lastX = c.flags.noiseX;
        a.lastZ = c.flags.noiseZ;
        a.next = w.tick + 480;
        w.emit('bark', { id: p.id });
      }
      if (a.state === 'Combat' && w.tick > a.next && !seen) a.state = 'Search';
      if ((a.state === 'Search' || a.state === 'Suspicious') && w.tick > a.next + 600) a.state = 'Patrol';
    }
    const combat = a.state === 'Combat',
      angle = w.tick / 400 + p.id * 2.4;
    const tx = combat
      ? a.lastX + Math.sin(angle) * (a.role === 'Sniper' ? 48 : 18)
      : a.state === 'Patrol'
        ? a.homeX + Math.sin(angle) * 9
        : a.lastX;
    const tz = combat
      ? a.lastZ + Math.cos(angle) * (a.role === 'Sniper' ? 48 : 18)
      : a.state === 'Patrol'
        ? a.homeZ + Math.cos(angle) * 9
        : a.lastZ;
    const dx = tx - p.actor.x,
      dz = tz - p.actor.z,
      dist = Math.hypot(dx, dz);
    const b: string[] = [];
    if (combat && attackers < value(w, 'ai.attackers') && d < 110) {
      b.push('fire');
      attackers++;
    }
    if (p.gunState.data.guns[0].jam) b.push('reload');
    p.actor.intents = {
      move: dist > 3 ? [dx / dist, dz / dist] : [0, 0],
      look: combat ? [Math.atan2(target.actor.x - p.actor.x, target.actor.z - p.actor.z), 0] : [Math.atan2(dx, dz), 0],
      ...(combat ? { aim: [target.actor.x, target.actor.y + 1.15, target.actor.z] as [number, number, number] } : {}),
      b,
    };
  }
  for (const site of PLACES) {
    const squad = all.filter((p) => p.soldier?.data.place === site.id);
    if (squad.length && squad.every((p) => p.soldier!.data.died) && c.cleared[site.id] === undefined) {
      c.cleared[site.id] = w.tick;
      mark(w, 'checkpoint clear');
      if (site.type === 'safehouse') {
        c.claimed.push(site.id);
        mark(w, 'safehouse');
        c.save++;
      }
    }
  }
}
