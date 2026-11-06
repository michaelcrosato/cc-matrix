/** @file Character factories: every human seat follows one input path, every opponent uses the same guns. */
import {
  createCharacter,
  defineMovement,
  getMovement,
  spawnActor,
  weaponsFor,
  HEALTH,
  type Intents,
} from '../../../engine/sim-api';
import { freshSeat, type GW, type Gun } from '../scenes/state';
import { weaponId } from '../weapons/guns';
import { ground } from '../scenes/map';
import './actions';

const apex = getMovement('movement:apex');
defineMovement('movement:merc', {
  description: 'A heavy mercenary with a short jump and a cautious sprint.',
  character: { ...apex.character, jumpSpeed: Math.sqrt(38.1), speed: 4.2 },
  model: {
    gaits: { run: 4.2, sprint: 6.4, crouch: 2, holstered: 1.05 },
    climb: { attach: 0, cutoff: 0, up: 0 },
    mantle: { glide: 0, boost: false },
    slide: { boost: 0, cap: 6.4 },
  },
});
export const MERC_KEYS = ['ilse', 'tomas', 'yaw', 'mirela'];
export function spawnMerc(w: GW, n: number, x: number, z: number): number {
  const selected = w.settings.get<number>('game.merc'),
    mode = w.settings.get<string>('game.mode');
  const guns: Gun[] = [
    { key: 'pistol', condition: 0.65, jam: false, clear: 0, reserve: 72 },
    { key: 'or7', condition: mode === 'story' ? 0.28 : 0.92, jam: mode === 'story', clear: 0, reserve: 180 },
    { key: 'sprayer', condition: 0.95, jam: false, clear: 0, reserve: 160 },
  ];
  const s = freshSeat(n);
  if (mode === 'story') {
    s.pills = 0;
    s.stones = 0;
  }
  return spawnActor(w, {
    at: [x, Math.max(ground(x, z), 0.3), z],
    yaw: Math.PI,
    player: n === w.settings.get<number>('game.me'),
    character: createCharacter({ movement: 'movement:merc' }),
    holstered: false,
    body: mode === 'contract' ? `body:coop-${n}` : `body:${MERC_KEYS[(selected + n) % 4]}`,
    anim: { build: 'build:adult', weapon: 'gun' },
    components: {
      health: { ...HEALTH, hp: 100 },
      weapons: weaponsFor(
        guns.map((g) => weaponId(g.key, g.condition)),
        1,
      ),
      gunState: { data: { guns } },
      seat: { data: s },
    },
  });
}
export function spawnSoldier(w: GW, x: number, z: number, faction: string, where: string, role = 'Rifleman'): number {
  const rng = w.rng('soldiers'),
    key = role === 'Sniper' ? 'hunter' : role === 'Rocketeer' ? 'postman' : role === 'Flamer' ? 'sprayer' : 'or7';
  const g: Gun = { key, condition: rng.range(0.15, 0.5), jam: false, clear: 0, reserve: 1000 };
  return spawnActor(w, {
    at: [x, ground(x, z), z],
    yaw: rng.range(0, 6.28),
    player: false,
    character: createCharacter({ speed: 2.5 }),
    body: `body:${faction}`,
    anim: { build: 'build:adult', weapon: 'gun' },
    components: {
      health: { ...HEALTH, hp: role === 'Officer' ? 110 : 75 },
      weapons: weaponsFor([weaponId(key, g.condition)], 0),
      gunState: { data: { guns: [g] } },
      soldier: {
        data: {
          faction,
          role,
          place: where,
          state: 'Patrol',
          detect: 0,
          lastX: x,
          lastZ: z,
          homeX: x,
          homeZ: z,
          next: 0,
          died: false,
        },
      },
    },
  });
}
export function spawnResident(w: GW, key: string, x: number, z: number, body = 'civilian'): number {
  const armed: Record<string, object> = MERC_KEYS.includes(body)
    ? {
        weapons: weaponsFor([weaponId('or7', 0.85)]),
        gunState: { data: { guns: [{ key: 'or7', condition: 0.85, jam: false, clear: 0, reserve: 300 }] } },
      }
    : {};
  return spawnActor(w, {
    at: [x, ground(x, z), z],
    yaw: 0,
    player: false,
    character: createCharacter({ speed: 1.2 }),
    body: `body:${body}`,
    anim: { build: 'build:adult' },
    components: {
      ...armed,
      health: { ...HEALTH, hp: 100 },
      usable: {
        data: { key, kind: 'person', label: `Talk to ${key}`, x, y: ground(x, z) + 1, z, done: false, extra: '' },
      },
    },
  });
}
export const wants = (p: { seat?: { data: { wants: Intents } }; actor: { intents: Partial<Intents> } }): Intents =>
  p.seat?.data.wants ?? p.actor.intents;
