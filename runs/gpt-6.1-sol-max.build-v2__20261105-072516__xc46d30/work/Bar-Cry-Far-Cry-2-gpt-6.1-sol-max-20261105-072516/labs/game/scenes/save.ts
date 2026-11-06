/** @file Compact, versioned game saves. Engine captures are reserved for replay verification. */
import { placeActor, setDaytime, spawnProp, removeProp, physicsOf, handOff } from '../../../engine/sim-api';
import { campaign, players, mark, type GW, type Campaign, type Seat, type Gun } from './state';
import { ground } from './map';
import { ignite } from './fire';
interface SavedRide {
  at: [number, number, number];
  q: [number, number, number, number];
  hp: number;
  fuse: number;
}
interface SavedSupply {
  key: string;
  x: number;
  y: number;
  z: number;
  done: boolean;
  vehicle: number;
}
export interface Save {
  version: number;
  seed: number;
  tick: number;
  campaign: Partial<Campaign>;
  seat: {
    data: Seat;
    guns: Gun[];
    x: number;
    z: number;
    hp: number;
    mags: number[];
    ride: number;
    slot: number;
    last: number;
  }[];
  rides: SavedRide[];
  supplies: SavedSupply[];
  friends: { key: string; x: number; z: number; hp: number }[];
  burns: string;
}
export function makeSave(w: GW): Save {
  const c = campaign(w),
    rides = [...w.query('ride', 'sceneProp')];
  const { fire: _fire, fuel: _fuel, timers: _timers, regrow: _regrow, grass: _grass, flames: _flames, ...rest } = c;
  let last = -1,
    count = 0;
  const rle: string[] = [];
  for (const v of c.fire) {
    if (v === last) count++;
    else {
      if (count) rle.push(`${last}:${count}`);
      last = v;
      count = 1;
    }
  }
  rle.push(`${last}:${count}`);
  const data: Save = {
    version: 1,
    seed: w.seed,
    tick: w.tick,
    campaign: rest,
    seat: players(w).map((p) => ({
      data: {
        ...p.seat!.data,
        wants: {},
        previous: [],
        released: [],
        vehicle: -1,
        target: -1,
        carrying: '',
        action: '',
        actionProp: -1,
        meleeNext: 0,
        meleeUntil: 0,
        down: 0,
        rescue: -1,
        mirage: 0,
        fever: p.health.hp <= 0 ? 0 : p.seat!.data.fever,
      },
      guns: p.gunState.data.guns,
      x: p.actor.x,
      z: p.actor.z,
      hp: Math.max(40, p.health.hp),
      mags: p.weapons.mags,
      ride: rides.findIndex((r) => r.id === p.seat!.data.vehicle),
      slot: p.weapons.slot,
      last: p.weapons.last,
    })),
    rides: rides.map((e) => {
      const r = e.ride.data,
        p = physicsOf(w).readBody(r.body);
      return {
        at: [p.position.x, p.position.y, p.position.z],
        q: [p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w],
        hp: r.hp,
        fuse: r.burning > 0 ? Math.max(1, r.burning - w.tick) : 0,
      };
    }),
    supplies: [...w.query('usable', 'sceneProp')]
      .filter((e) => e.usable.data.kind === 'crate')
      .map((e) => ({
        key: e.usable.data.key,
        x: e.sceneProp.x,
        y: e.sceneProp.y,
        z: e.sceneProp.z,
        done: e.usable.data.done,
        vehicle: e.usable.data.extra.startsWith('vehicle:')
          ? rides.findIndex((r) => r.id === Number(e.usable.data.extra.slice(8)))
          : -1,
      })),
    friends: c.buddies.map((b) => {
      const e = w.get(b.entity);
      return { key: b.key, x: e?.actor?.x ?? 760, z: e?.actor?.z ?? 826, hp: e?.health?.hp ?? 0 };
    }),
    burns: rle.join(','),
  };
  return JSON.parse(JSON.stringify(data)) as Save;
}
export function loadSave(w: GW, raw: unknown): void {
  const data = JSON.parse(JSON.stringify(raw)) as Save;
  if (data.version !== 1 || !data.seat?.length || !data.campaign) return;
  const c = campaign(w),
    buddies = c.buddies,
    oldTick = data.tick ?? 0,
    rides = [...w.query('ride', 'sceneProp')];
  Object.assign(c, data.campaign);
  c.mode = 'story';
  delete c.flags.gameover;
  c.flags.auctionAftermath = 0;
  c.windNext = w.tick + Math.max(1, c.windNext - oldTick);
  if (c.flags.noise) c.flags.noise = w.tick - (oldTick - c.flags.noise);
  if (c.flags.firstFever) c.flags.firstFever = w.tick - (oldTick - c.flags.firstFever) || 1;
  for (const key of Object.keys(c.cleared)) c.cleared[key] = w.tick - (oldTick - c.cleared[key]);
  for (const b of c.buddies) {
    b.entity = buddies.find((x) => x.key === b.key)?.entity ?? -1;
    const saved = data.friends?.find((x) => x.key === b.key),
      e = w.get(b.entity);
    if (saved && e?.actor) placeActor(w, b.entity, [saved.x, ground(saved.x, saved.z), saved.z]);
    if (e?.health) e.health.hp = b.alive ? (saved?.hp ?? 100) : 0;
    if (b.fallen > 0) b.fallen = w.tick + Math.max(1, b.fallen - oldTick);
    if ((!b.alive || b.fallen > 0) && e?.animator) handOff(w, b.entity, { dead: true });
    if (!b.alive && e?.usable) e.usable.data.done = true;
  }
  for (let n = 0; n < (data.rides?.length ?? 0); n++) {
    const e = rides[n],
      saved = data.rides[n];
    if (!e) continue;
    physicsOf(w).setBody(e.ride.data.body, {
      position: saved.at,
      rotation: saved.q,
      velocity: [0, 0, 0],
      angularVelocity: [0, 0, 0],
    });
    if (e.ride.data.blocker >= 0) physicsOf(w).setBody(e.ride.data.blocker, { position: saved.at, rotation: saved.q });
    e.ride.data.hp = saved.hp;
    e.ride.data.driver = -1;
    e.ride.data.burning = saved.hp <= 0 ? -1 : saved.fuse > 0 ? w.tick + saved.fuse : 0;
    Object.assign(e.sceneProp, {
      x: saved.at[0],
      y: saved.at[1] - (e.ride.data.kind === 'boat' ? 0.3 : 0.8),
      z: saved.at[2],
      q: [...saved.q],
    });
  }
  for (const saved of data.supplies ?? []) {
    const e = [...w.query('usable', 'sceneProp')].find((e) => e.usable.data.key === saved.key);
    if (!e) continue;
    if (saved.done) {
      e.usable.data.done = true;
      removeProp(w, e.id);
      continue;
    }
    Object.assign(e.usable.data, {
      x: saved.x,
      y: saved.y + 0.6,
      z: saved.z,
      extra: saved.vehicle >= 0 && rides[saved.vehicle] ? `vehicle:${rides[saved.vehicle].id}` : '',
    });
    Object.assign(e.sceneProp, { x: saved.x, y: saved.y, z: saved.z });
  }
  let i = 0;
  for (const token of data.burns.split(',')) {
    const [v, n] = token.split(':').map(Number);
    for (let k = 0; k < n && i < c.fire.length; k++, i++) {
      if (v === 2) {
        const x = ((i % 192) + 0.5) * 8,
          z = (Math.floor(i / 192) + 0.5) * 8;
        ignite(w, x, z);
      } else {
        c.fire[i] = v;
        if (v === 3) {
          const x = ((i % 192) + 0.5) * 8,
            z = (Math.floor(i / 192) + 0.5) * 8;
          spawnProp(w, { prop: 'prop:field-scorch', at: [x, ground(x, z) + 0.025, z], yaw: 0 });
          c.regrow[i] = w.tick + 10800;
          if (c.grass[i] >= 0) {
            removeProp(w, c.grass[i]);
            c.grass[i] = -1;
          }
        }
      }
    }
  }
  for (const saved of data.seat) {
    const p = players(w).find((x) => x.seat!.data.n === saved.data.n);
    if (!p) continue;
    p.seat!.data = {
      ...saved.data,
      wants: {},
      previous: [],
      released: [],
      actionProp: -1,
      meleeNext: 0,
      meleeUntil: 0,
      feverNext: w.tick + Math.max(1, saved.data.feverNext - oldTick),
    };
    if (p.seat!.data.fever) p.seat!.data.fever = w.tick - (oldTick - p.seat!.data.fever) || 1;
    p.gunState.data.guns = saved.guns;
    p.health.hp = saved.hp;
    p.weapons.mags = saved.mags;
    p.weapons.slot = saved.slot ?? 1;
    p.weapons.last = saved.last ?? 1;
    const r = (saved.ride ?? -1) >= 0 ? data.rides[saved.ride] : null;
    let x = saved.x,
      z = saved.z;
    if (r) {
      const yaw = Math.atan2(2 * (r.q[3] * r.q[1] + r.q[0] * r.q[2]), 1 - 2 * (r.q[1] * r.q[1] + r.q[2] * r.q[2]));
      x = r.at[0] + Math.cos(yaw) * 2.4;
      z = r.at[2] - Math.sin(yaw) * 2.4;
    }
    placeActor(w, p.id, [x, Math.max(ground(x, z), 0.12), z]);
  }
  setDaytime(w, { hour: c.hour, rate: 24 / (w.settings.get<number>('game.day.minutes') * 60) });
  mark(w, 'load');
}
export function digest(w: GW): string {
  const c = campaign(w),
    round = (v: number) => Math.round(v * 1000);
  return JSON.stringify({
    tick: w.tick,
    contract: c.contract,
    step: c.step,
    flags: c.flags,
    wind: round(c.wind),
    seats: players(w).map((p) => [
      p.seat!.data.n,
      round(p.actor.x),
      round(p.actor.z),
      round(p.health.hp),
      p.weapons.shots,
      p.gunState.data.guns.map((g) => [round(g.condition), g.jam]),
    ]),
    cars: [...w.query('ride', 'sceneProp')].map((e) => [
      round(e.sceneProp.x),
      round(e.sceneProp.z),
      round(e.ride.data.hp),
    ]),
    burns: c.fire.reduce((a, v, i) => ((a[v] = (a[v] ?? 0) + i + 1), a), [] as number[]),
  });
}
