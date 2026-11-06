/** @file All durable game data lives in components, including debts, fire and pending actions. */
import {
  defineComponent,
  HEALTH_FIELDS,
  type ActorComponent,
  type AnimatorComponent,
  type Health,
  type Intents,
  type MotionState,
  type ScenePropComponent,
  type WeaponsState,
  type World,
} from '../../../engine/sim-api';

for (const name of ['campaign', 'seat', 'soldier', 'ride', 'usable', 'gunState', 'gameSave'])
  defineComponent(name, {
    description: `Bar Cry ${name} state.`,
    fields: { data: { type: 'object', default: {}, description: 'Serializable deterministic state.' } },
  });
defineComponent('health', { description: 'Wounds and hit history.', fields: HEALTH_FIELDS });

export interface Gun {
  key: string;
  condition: number;
  jam: boolean;
  clear: number;
  reserve: number;
  broken?: boolean;
}
export interface Seat {
  n: number;
  wants: Intents;
  previous: string[];
  released: string[];
  hpMax: number;
  syr: number;
  pills: number;
  stones: number;
  reliability: number;
  capacity: number;
  action: string;
  actionProp: number;
  until: number;
  down: number;
  rescue: number;
  vehicle: number;
  mounted: boolean;
  fever: number;
  feverNext: number;
  mirage: number;
  map: boolean;
  locator: boolean;
  target: number;
  prompt: string;
  carrying: string;
  useHeld: number;
  meleeNext: number;
  meleeUntil: number;
  molotovs: number;
  frags: number;
  kills: number;
  revives: number;
  downs: number;
  smock: boolean;
  kit: number;
}
export interface Buddy {
  key: string;
  alive: boolean;
  debt: number;
  entity: number;
  fallen: number;
  helped: boolean;
}
export interface Campaign {
  mode: string;
  contract: number;
  step: number;
  finished: number[];
  flags: Record<string, number>;
  goal: string;
  message: string;
  speaker: string;
  saidAt: number;
  journal: string[];
  coverage: Record<string, number>;
  front: number;
  authority: number;
  buddies: Buddy[];
  discovered: string[];
  caches: string[];
  tapes: string[];
  owned: string[];
  cleared: Record<string, number>;
  claimed: string[];
  fire: number[];
  fuel: number[];
  timers: number[];
  regrow: number[];
  grass: number[];
  flames: Record<string, number>;
  wind: number;
  windTo: number;
  windSpeed: number;
  windNext: number;
  rain: number;
  hour: number;
  ending: string;
  save: number;
  survival: number;
  run: number;
  started: number;
  extracted: number[];
}
export interface Soldier {
  faction: string;
  role: string;
  place: string;
  state: string;
  detect: number;
  lastX: number;
  lastZ: number;
  homeX: number;
  homeZ: number;
  next: number;
  died: boolean;
}
export interface Ride {
  kind: string;
  body: number;
  blocker: number;
  hp: number;
  yaw: number;
  speed: number;
  spin: number;
  steer: number;
  driver: number;
  wheels: number[];
  heat: number;
  burning: number;
}
export interface Usable {
  key: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  z: number;
  done: boolean;
  extra: string;
}
export interface Game {
  actor: ActorComponent;
  animator: AnimatorComponent;
  motion: MotionState;
  health: Health;
  weapons: WeaponsState;
  campaign: { data: Campaign };
  gameSave: { data: Record<string, unknown> };
  seat: { data: Seat };
  soldier: { data: Soldier };
  ride: { data: Ride };
  usable: { data: Usable };
  gunState: { data: { guns: Gun[] } };
  sceneProp: ScenePropComponent;
}
export type GW = World<Game>;
export type Person = {
  id: number;
  actor: ActorComponent;
  animator: AnimatorComponent;
  motion: MotionState;
  health: Health;
  weapons: WeaponsState;
  gunState: Game['gunState'];
  seat?: Game['seat'];
  soldier?: Game['soldier'];
};
export const campaign = (w: GW): Campaign => w.query('campaign')[0].campaign.data;
export const players = (w: GW): Person[] => [...w.query('actor', 'seat')] as unknown as Person[];
export const people = (w: GW): Person[] => [...w.query('actor', 'health')] as unknown as Person[];
export const value = (w: GW, key: string): number => w.settings.get<number>(`game.${key}`);
export const cheat = (w: GW, key: string): boolean =>
  w.settings.get<boolean>(`game.${key}`) || campaign(w).mode === 'attract';
export function mark(w: GW, key: string): void {
  const c = campaign(w);
  c.coverage[key] = (c.coverage[key] ?? 0) + 1;
}
export function say(w: GW, speaker: string, message: string): void {
  const c = campaign(w);
  Object.assign(c, { message, speaker, saidAt: w.tick });
  c.journal.push(`${speaker}: ${message}`);
  if (c.journal.length > 60) c.journal.shift();
  w.emit('say', { speaker, message });
}
export const distance = (a: { x: number; z: number }, b: { x: number; z: number }): number =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function freshSeat(n: number): Seat {
  return {
    n,
    wants: {},
    previous: [],
    released: [],
    hpMax: 100,
    syr: 3,
    pills: 4,
    stones: 12,
    reliability: 0,
    capacity: 5,
    action: '',
    actionProp: -1,
    until: 0,
    down: 0,
    rescue: -1,
    vehicle: -1,
    mounted: false,
    fever: 0,
    feverNext: 39600,
    mirage: 0,
    map: false,
    locator: false,
    target: -1,
    prompt: '',
    carrying: '',
    useHeld: 0,
    meleeNext: 0,
    meleeUntil: 0,
    molotovs: 4,
    frags: 4,
    kills: 0,
    revives: 0,
    downs: 0,
    smock: false,
    kit: 0,
  };
}
