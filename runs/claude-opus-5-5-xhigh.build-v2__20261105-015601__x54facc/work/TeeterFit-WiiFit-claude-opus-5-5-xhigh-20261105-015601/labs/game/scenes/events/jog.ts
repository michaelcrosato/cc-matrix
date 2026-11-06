/**
 * @file Island Jog (PLAN.md section 6): follow Gerald round the coast path, a ring of flags past every landmark. The stick
 * steers; alternating feet at about 2.5 Hz gives +35% speed. Stay within 8 m of him: the Pace Ribbon. Tare hops beside you
 * and talks, the plaques go by. At the end Gerald says the longest thing he will ever say.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'jog');
 */
import { createCharacter, placeActor } from '../../../../engine/sim-api';
import type { Player } from '../bot/players';
import { COAST } from '../data/courses';
import { castOf, enter, isBot, leanForWorld, propFor, say, steps, worldFromLean } from './kit';
import type { Activity, Ctx } from './types';

/** The ribbon's reach, m; how long the path may take, s; how close a flag counts, m. */
const RIBBON = 8;
const LENGTH = 170;
const FLAG_REACH = 3.2;

/** The jog's state. */
interface JogData {
  flag: number;
  inside: number;
  total: number;
  stuck: number;
  lastX: number;
  lastZ: number;
  boost: number;
  lastFoot: string;
  footT: number;
  fast: boolean;
  talk: number;
  gap: number;
}

/** Island Jog. */
export const jog: Activity = {
  id: 'jog',
  title: 'Island Jog',
  station: 'plaza',
  map: 'actionMap:balance',
  shot: 'jog',
  wobble: false,
  setup(c) {
    const d: JogData = {
      flag: 0,
      inside: 0,
      total: 0,
      stuck: 0,
      lastX: 0,
      lastZ: 0,
      boost: 0,
      lastFoot: '',
      footT: 999,
      fast: false,
      talk: steps(c, 6),
      gap: 0,
    };
    c.a.data = d as unknown as Record<string, unknown>;
    COAST.forEach(([x, z]) => propFor(c, { prop: 'prop:lineFlag', at: [x, c.ground(x, z), z], yaw: 0 }));
    const speed = c.w.settings.get<number>('game.jog.speed');
    const guest = castOf(c.w, 'guest');
    const gerald = castOf(c.w, 'gerald');
    const [x, z] = [COAST[0][0] - 2, COAST[0][1] - 8];
    if (guest) {
      Object.assign(guest.cast, { hold: false, pose: '', poseT: 0 });
      placeActor(c.w, guest.id, [x, c.ground(x, z), z], 0.2);
      const actor = c.w.get(guest.id)?.actor;
      if (actor) actor.character = createCharacter({ speed, jumpSpeed: 6.5 });
    }
    if (gerald) {
      Object.assign(gerald.cast, { hold: false, pose: '', poseT: 0 });
      placeActor(c.w, gerald.id, [x + 2, c.ground(x + 2, z + 3), z + 3], 0.2);
      const actor = c.w.get(gerald.id)?.actor;
      if (actor) actor.character = createCharacter({ speed: speed * 0.8, jumpSpeed: 6 });
    }
    c.hud.title = 'Island Jog';
    c.hud.feet = true;
    enter(c, 'jog');
    say(c, 'gerald', 'jog.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as JogData;
    const [{ seat }] = c.seats;
    const guest = castOf(c.w, 'guest');
    const gerald = castOf(c.w, 'gerald');
    const me = guest ? c.w.get(guest.id)?.actor : undefined;
    const him = gerald ? c.w.get(gerald.id)?.actor : undefined;
    if (!me || !him) {
      c.a.done = true;
      return;
    }
    const base = c.w.settings.get<number>('game.jog.speed');
    // Feet alternating at about 2.5 Hz: +35%.
    d.footT += 1;
    const foot = seat.pfl ? 'L' : seat.pfr ? 'R' : '';
    if (foot && foot !== d.lastFoot) {
      if (d.footT < c.w.hz * 0.6) d.boost = Math.min(1, d.boost + 0.4);
      d.footT = 0;
      d.lastFoot = foot;
    }
    d.boost = Math.max(0, d.boost - c.w.dt * 0.8);
    const fast = d.boost > 0.3;
    if (fast !== d.fast) {
      d.fast = fast;
      me.character = createCharacter({ speed: base * (fast ? 1.35 : 1), jumpSpeed: 6.5 });
      c.w.emit('jogBoost', { fast });
    }
    // Your move, by the stick, from where the camera looks.
    const cam = isBot(c, seat.index) ? 0 : c.flow.camYaw;
    const [mx, mz] = worldFromLean(seat.lx, seat.ly, cam);
    me.intents = { move: [mx, mz] };
    // Gerald goes flag to flag and does not look back.
    const [fx, fz] = COAST[Math.min(d.flag, COAST.length - 1)];
    const [dx, dz] = [fx - him.x, fz - him.z];
    const dist = Math.hypot(dx, dz);
    him.intents = dist > 0.1 ? { move: [dx / dist, dz / dist] } : {};
    if (dist < FLAG_REACH) {
      d.flag += 1;
      c.w.emit('jogFlag', { flag: d.flag });
    }
    if (c.a.t % 60 === 0) {
      if (Math.hypot(him.x - d.lastX, him.z - d.lastZ) < 1 && c.a.t > 0) {
        d.stuck += 1;
        if (d.stuck >= 2) placeActor(c.w, gerald!.id, [fx, c.ground(fx, fz), fz], him.yaw);
      } else d.stuck = 0;
      [d.lastX, d.lastZ] = [him.x, him.z];
    }
    // The Pace Ribbon.
    d.gap = Math.hypot(me.x - him.x, me.z - him.z);
    d.total += 1;
    if (d.gap <= RIBBON) d.inside += 1;
    // Tare hops beside you, and talks.
    const tare = castOf(c.w, 'tare');
    if (tare) tare.cast.home = [me.x + 1.6, me.z + 1.3];
    d.talk -= 1;
    if (d.talk <= 0) {
      d.talk = steps(c, 14);
      say(c, 'tare', 'jog.chatter');
    }
    c.hud.show = { gap: d.gap, ribbon: RIBBON, inRibbon: d.gap <= RIBBON, flags: d.flag, of: COAST.length, fast };
    c.hud.meter = d.flag / COAST.length;
    c.hud.meterLabel = d.gap <= RIBBON ? 'In the ribbon' : 'Catch Gerald';
    if (d.flag >= COAST.length || c.a.t >= steps(c, LENGTH)) {
      say(c, 'gerald', 'jog.end');
      c.a.done = true;
    }
  },
  teardown(c) {
    const speed = 5.4;
    const guest = castOf(c.w, 'guest');
    const actor = guest ? c.w.get(guest.id)?.actor : undefined;
    if (actor) {
      actor.character = createCharacter({ speed, jumpSpeed: 6.5 });
      actor.intents = {};
    }
    const gerald = castOf(c.w, 'gerald');
    const his = gerald ? c.w.get(gerald.id)?.actor : undefined;
    if (his) {
      his.character = createCharacter({ speed: 3.6, jumpSpeed: 6.5 });
      his.intents = {};
    }
  },
  bot(c, e, player: Player) {
    const { seat } = e;
    seat.act = false;
    if (!player.acts) {
      Object.assign(seat, { lx: 0, ly: 0, fl: 0, fr: 0 });
      return;
    }
    const guest = castOf(c.w, 'guest');
    const gerald = castOf(c.w, 'gerald');
    const me = guest ? c.w.get(guest.id)?.actor : undefined;
    const him = gerald ? c.w.get(gerald.id)?.actor : undefined;
    if (!me || !him) return;
    const [dx, dz] = [him.x - me.x, him.z - me.z];
    const dist = Math.hypot(dx, dz) || 1;
    const go = dist > 2.5 ? 1 : 0.4;
    const late = player.name === 'perfect' ? 0 : player.name === 'human' ? 0.08 : 0.18;
    const [lx, ly] = leanForWorld((dx / dist) * go, (dz / dist) * go);
    seat.lx = lx + late * Math.sin(c.a.t * 0.05);
    seat.ly = ly;
    const cycle = player.name === 'sloppy' ? 40 : 22;
    const t = c.a.t % cycle;
    const left = Math.floor(c.a.t / cycle) % 2 === 0;
    const hurry = dist > 4;
    seat.fl = hurry && left && t < 6 ? 1 : 0;
    seat.fr = hurry && !left && t < 6 ? 1 : 0;
  },
  score(c) {
    const d = c.a.data as unknown as JogData;
    return d.total ? (1000 * d.inside) / d.total : 0;
  },
};
