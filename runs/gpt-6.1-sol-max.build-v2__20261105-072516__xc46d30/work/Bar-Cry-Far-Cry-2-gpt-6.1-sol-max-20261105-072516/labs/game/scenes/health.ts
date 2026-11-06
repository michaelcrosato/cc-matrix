/** @file Segmented wounds, interruptible medicine, field surgery, downed players and a buddy's rescue debt. */
import { actOn, placeActor, removeActor, standUp, handOff, spawnProp, removeProp } from '../../../engine/sim-api';
import { campaign, players, people, value, cheat, mark, say, distance, type GW, type Person } from './state';
import { ground } from './map';
import { spawnResident } from '../cast/mercs';
import { exitVehicle } from './vehicles';

export function beginAction(w: GW, p: Person, key: string, seconds: number): boolean {
  const s = p.seat?.data;
  if (!s || s.action || s.down) return false;
  s.action = key;
  if (p.weapons.slot >= 0) p.weapons.last = p.weapons.slot;
  p.weapons.slot = -1;
  if (p.animator) p.animator.weapon = 'none';
  const item =
    key === 'pill'
      ? 'pill-bottle'
      : key === 'repair'
        ? 'wrench'
        : key === 'surgery-burn'
          ? 'lighter'
          : key.startsWith('surgery')
            ? 'surgery-tool'
            : 'syrette';
  s.actionProp = spawnProp(w, {
    prop: `prop:field-${item}`,
    at: [p.actor.x, p.actor.y + 1.1, p.actor.z],
    yaw: p.actor.yaw,
  });
  s.until = w.tick + Math.round(seconds * 60);
  actOn(w, p.id, (a) => a.play(`action:field-${key}`));
  w.emit('body-action', { id: p.id, key });
  return true;
}
function revive(w: GW, p: Person, buddy: number): void {
  const c = campaign(w),
    s = p.seat!.data,
    b = c.buddies[buddy];
  s.down = 0;
  p.health.hp = 40;
  s.rescue = -1;
  b.debt++;
  mark(w, 'rescue');
  say(w, b.key, `That is ${b.debt} you owe me. I write them down.`);
  c.flags.rescued = (c.flags.rescued ?? 0) + 1;
  if (c.contract === 0) {
    placeActor(w, p.id, [336, 3, 1147]);
    s.pills = 4;
    s.fever = 0;
    c.flags.prologueRescue = 1;
  }
  w.emit('rescue', { id: p.id });
}
export function healthStep(w: GW): void {
  const c = campaign(w);
  for (const p of players(w)) {
    const s = p.seat!.data,
      I = s.wants,
      pressed = I.p ?? [];
    if (cheat(w, 'god') && p.health.hp > 0) p.health.hp = Math.max(100, p.health.hp);
    if (s.actionProp >= 0) {
      const item = w.get(s.actionProp)?.sceneProp;
      if (item) {
        const yaw = p.actor.yaw,
          reach = 0.42 + Math.sin(w.tick * 0.13) * 0.025;
        Object.assign(item, {
          x: p.actor.x + Math.sin(yaw) * reach - Math.cos(yaw) * 0.07,
          y: p.actor.y + 1.06,
          z: p.actor.z + Math.cos(yaw) * reach + Math.sin(yaw) * 0.07,
          q: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
        });
      }
    }
    if (p.health.hp <= 0 && s.action) s.action = '';
    if (s.action) {
      if (p.health.hitAt >= w.tick - 1 && s.action.startsWith('surgery')) {
        s.action = '';
        say(w, 'Field note', 'Interrupted. Get behind something solid.');
      } else if (w.tick >= s.until) {
        if (s.action === 'syrette') {
          p.health.hp = Math.min(100, p.health.hp + value(w, 'health.syrette'));
          s.syr--;
          mark(w, 'syrette');
        }
        if (s.action.startsWith('surgery')) {
          p.health.hp = 60;
          mark(w, 'surgery');
        }
        if (s.action === 'pill') {
          s.fever = 0;
          s.pills--;
          s.feverNext = w.tick + Math.round(value(w, 'fever.intervalMin') * 3600 + w.rng('fever').range(-10800, 10800));
          mark(w, 'pill');
        }
        s.action = '';
        c.save++;
      }
    }
    if (!s.action && s.actionProp >= 0) {
      removeProp(w, s.actionProp);
      s.actionProp = -1;
      if (!p.gunState.data.guns[p.weapons.last]?.broken) p.weapons.slot = p.weapons.last;
    }
    if (pressed.includes('heal') && p.health.hp > 0 && p.health.hp < 100) {
      if (p.health.hp <= 20)
        beginAction(w, p, ['surgery-dig', 'surgery-finger', 'surgery-burn'][w.rng('surgery').int(0, 2)], 2.6);
      else if (s.syr > 0) beginAction(w, p, 'syrette', 0.9);
      else say(w, 'Field note', 'No syrettes. The current health segment can still recover.');
    }
    if (pressed.includes('pill') && s.pills > 0) beginAction(w, p, 'pill', 1.2);
    if (p.health.hp > 0 && p.health.hp < 100 && w.tick - p.health.hitAt >= 240 && !s.down && !s.action) {
      const top = Math.ceil(p.health.hp / 20) * 20;
      p.health.hp = Math.min(top, p.health.hp + value(w, 'health.regen') / 60);
    }
    if (p.health.hp <= 0 && !s.down) {
      if (s.vehicle >= 0) exitVehicle(w, p);
      s.down = w.tick + (c.mode === 'contract' ? 2400 : 1500);
      s.downs++;
      mark(w, 'down');
      p.weapons.slot = 0;
      const buddy = c.buddies.findIndex((b) => b.alive && b.debt < 3 && !b.fallen);
      s.rescue = c.mode === 'story' || c.mode === 'attract' ? buddy : -1;
      if (s.rescue >= 0) {
        const b = c.buddies[s.rescue];
        const x = p.actor.x + 30,
          z = p.actor.z - 25;
        if (b.entity < 0) b.entity = spawnResident(w, b.key, x, z, b.key);
        else placeActor(w, b.entity, [x, ground(x, z), z]);
        say(w, b.key, 'Keep your head down. I am making an exception.');
      } else
        say(
          w,
          'Field note',
          c.mode === 'contract' ? 'Hold on. A teammate can revive you.' : 'Reserve not met. No one is coming.',
        );
    }
    if (s.down > 0) {
      if (s.rescue >= 0) {
        const b = c.buddies[s.rescue],
          actor = w.get(b.entity)?.actor;
        if (actor) {
          const dx = p.actor.x - actor.x,
            dz = p.actor.z - actor.z,
            d = Math.hypot(dx, dz);
          actor.character = { ...actor.character, speed: b.key === 'ilse' ? 4.6 : 3.6 };
          actor.intents = { ...actor.intents, move: d > 2 ? [dx / d, dz / d] : [0, 0] };
          if (d < 3 && w.tick % 60 === 0) {
            actOn(w, b.entity, (a) => a.play('action:field-rescue'));
            revive(w, p, s.rescue);
          }
        }
      }
      if (s.down > 0 && w.tick >= s.down) {
        s.down = -1;
        c.flags.gameover = 1;
        w.emit('gameover', {});
      }
    }
  }
  for (const b of c.buddies) {
    if (b.alive && b.fallen > 0 && w.tick >= b.fallen) {
      b.alive = false;
      b.fallen = 0;
      handOff(w, b.entity, { dead: true });
      mark(w, 'buddy death');
      say(w, b.key, 'The ledger closes here.');
    }
  }
}
export function feverStep(w: GW): void {
  const c = campaign(w);
  const interval = value(w, 'fever.intervalMin');
  if (c.flags.feverInterval !== interval) {
    c.flags.feverInterval = interval;
    for (const p of players(w)) if (!p.seat!.data.fever) p.seat!.data.feverNext = w.tick + Math.round(interval * 3600);
  }
  for (const p of players(w)) {
    const s = p.seat!.data;
    if ((w.settings.get<boolean>('game.noFever') && c.mode !== 'attract') || c.flags.cured) {
      s.fever = 0;
      continue;
    }
    if (c.mode === 'title') continue;
    if (!s.fever && w.tick === s.feverNext - 1200) {
      mark(w, 'fever warning');
      say(w, 'Field note', 'The chill before the fever. Keep the bitter pills close.');
    }
    if (!s.fever && w.tick >= s.feverNext) {
      s.fever = w.tick || 1;
      mark(w, 'fever attack');
      w.emit('fever', { id: p.id });
    }
    if (s.fever && w.tick - s.fever > 1800 && !s.mirage) {
      s.mirage = spawnResident(w, 'An unpaid debt', p.actor.x + 15, p.actor.z + 6, 'mirage');
      mark(w, 'mirage');
    }
    if (s.mirage) {
      const m = w.get(s.mirage);
      if (!s.fever || !m?.actor || distance(p.actor, m.actor) < 8 || (m.health?.hp ?? 100) <= 0) {
        if (m) removeActor(w, m.id);
        s.mirage = 0;
      }
    }
    if (s.fever && w.tick - s.fever >= 3600 && !s.down && !cheat(w, 'god')) p.health.hp = 0;
  }
}
export function helpBuddy(w: GW, p: Person, key: string, mercy = false): void {
  const c = campaign(w),
    b = c.buddies.find((x) => x.key === key);
  if (!b || !b.alive || !b.fallen) return;
  if (!mercy && p.seat!.data.syr <= 0) {
    say(w, b.key, 'Then do not promise me a needle.');
    return;
  }
  mark(w, 'mercy prompt');
  if (mercy) {
    b.alive = false;
    b.fallen = 0;
    mark(w, 'buddy death');
    mark(w, 'mercy');
    say(w, key, 'Make it something you can carry.');
  } else if (p.seat!.data.syr > 0) {
    p.seat!.data.syr--;
    b.fallen = 0;
    b.debt = Math.max(-3, b.debt - 1);
    standUp(w, b.entity);
    const body = w.get(b.entity);
    if (body?.health) body.health.hp = 60;
    mark(w, 'buddy saved');
    say(w, key, 'Put it on my account.');
  }
  c.flags.invoiceResolved = 1;
  c.save++;
}

/** Buddies fight on their way to a rescue and accompany accepted alternate plans. */
export function buddyStep(w: GW): void {
  const c = campaign(w);
  if (c.mode === 'title') return;
  const all = people(w),
    seats = players(w);
  for (let k = 0; k < c.buddies.length; k++) {
    const b = c.buddies[k],
      friend = all.find((p) => p.id === b.entity);
    if (!friend || !b.alive) continue;
    if (friend.health.hp <= 0 && !b.fallen) {
      b.fallen = w.tick + 3600;
      friend.health.hp = 15;
      handOff(w, b.entity, { dead: true });
      say(w, b.key, 'My account is running out.');
      mark(w, 'mercy prompt');
    }
    const player =
      seats.find((p) => p.seat!.data.rescue === k && p.seat!.data.down > 0) ?? (b.helped ? seats[0] : undefined);
    if (!player || b.fallen) {
      friend.actor.intents = {};
      continue;
    }
    const dx = player.actor.x - friend.actor.x,
      dz = player.actor.z - friend.actor.z,
      d = Math.hypot(dx, dz);
    const enemy = all
      .filter((p) => p.soldier && p.health.hp > 0 && distance(p.actor, friend.actor) < 65)
      .sort((a, b) => distance(a.actor, friend.actor) - distance(b.actor, friend.actor))[0];
    friend.actor.character = { ...friend.actor.character, speed: b.key === 'ilse' ? 4.6 : 4.0 };
    friend.actor.intents = {
      move: d > (player.seat!.data.down ? 2 : 7) ? [dx / d, dz / d] : [0, 0],
      ...(enemy
        ? {
            aim: [enemy.actor.x, enemy.actor.y + 1.35, enemy.actor.z] as [number, number, number],
            look: [Math.atan2(enemy.actor.x - friend.actor.x, enemy.actor.z - friend.actor.z), 0] as [number, number],
          }
        : {}),
      b: friend.gunState?.data.guns[0].jam ? ['reload'] : enemy ? ['fire', 'aim'] : [],
    };
  }
}

/** An engineer who has agreed to walk out follows the player and can be lost to the fire. */
export function escortStep(w: GW): void {
  const c = campaign(w);
  if (!c.flags.engineerFollowing || c.flags['altDone-3'] || c.flags['altFailed-3']) return;
  const engineer = [...w.query('actor', 'usable', 'health')].find((p) => p.usable.data.key === 'Engineer'),
    player = players(w)[0];
  if (!engineer || !player) return;
  if (engineer.health.hp <= 0) {
    c.flags['altFailed-3'] = 1;
    c.flags.engineerFollowing = 0;
    handOff(w, engineer.id, { dead: true });
    say(w, 'Tomás', 'That invoice will remain open.');
    return;
  }
  if (Math.hypot(engineer.actor.x - 970, engineer.actor.z - 430) < 15) {
    c.flags['altDone-3'] = 1;
    c.flags.engineerFollowing = 0;
    engineer.actor.intents = {};
    say(w, 'Engineer', 'I will remember the direction.');
    return;
  }
  const dx = player.actor.x - engineer.actor.x,
    dz = player.actor.z - engineer.actor.z,
    d = Math.hypot(dx, dz);
  engineer.actor.character = { ...engineer.actor.character, speed: 3.8 };
  engineer.actor.intents = { move: d > 4 ? [dx / d, dz / d] : [0, 0] };
}
