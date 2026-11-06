/**
 * @file The Morning Check (PLAN.md section 6): Tare asks one yes/no question, then three tests: Still Ring, Reach, One
 * Foot. Its share gives the Wobble Age. Day 1 teaches each verb a line at a time, through the same steps.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'morning');
 */
import { breathe, holdAt, type Player } from '../bot/players';
import { STATIONS } from '../data/stations';
import { wobbleAge } from '../scoring';
import { inRing } from '../wobble';
import { after, castOf, enter, leanSeats, say, steps } from './kit';
import type { Activity, Ctx } from './types';

/** Test lengths, s. */
const QUESTION = 9;
const RING = 12;
const NARROW_FROM = 8;
const REACH = 24;
const FOOT = 8;
/** Reach's targets: six at this radius, hold each this long. */
const TARGET_R = 0.16;
const TARGET_AT = 0.5;
const TARGET_HOLD = 0.5;

/** The check's state. */
interface MorningData {
  inside: number;
  footInside: number;
  order: number[];
  target: number;
  held: number;
  foot: 'L' | 'R';
  a: number;
  b: number;
  c: number;
  s: number;
  age?: number;
  reachT: number;
}

/** Where a Reach target stands. */
const targetAt = (slot: number): [number, number] => [
  TARGET_AT * Math.sin((slot * Math.PI) / 3),
  TARGET_AT * Math.cos((slot * Math.PI) / 3),
];

/** The Morning Check. */
export const morning: Activity = {
  id: 'morning',
  title: 'Morning Check',
  station: 'plaza',
  map: 'actionMap:balance',
  shot: 'platform',
  wobble: true,
  setup(c) {
    const rng = c.w.rng('morning');
    const order = [0, 1, 2, 3, 4, 5];
    for (let k = order.length - 1; k > 0; k--) {
      const j = rng.int(0, k);
      [order[k], order[j]] = [order[j], order[k]];
    }
    const d: MorningData = { inside: 0, footInside: 0, order, target: 0, held: 0, foot: rng.chance(0.5) ? 'L' : 'R', a: 0, b: 0, c: 0, s: 0, reachT: 0 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    c.hud.disc = true;
    c.hud.feet = true;
    const guest = castOf(c.w, 'guest');
    const [x, z] = [c.station.x, c.station.z + 1];
    if (guest)
      Object.assign(guest.cast, { hold: true, x, y: c.ground(x, z) + 0.22, z, yaw: Math.PI, pose: '', poseT: 0 });
    const tare = castOf(c.w, 'tare');
    if (tare)
      Object.assign(tare.cast, {
        hold: true,
        x: x + 1.5,
        y: c.ground(x + 1.5, z - 1.4),
        z: z - 1.4,
        yaw: Math.PI - 0.5,
      });
    c.hud.title = 'Morning Check';
    enter(c, 'question');
    say(c, 'tare', `morning.question.${Math.min(6, c.flow.day)}`);
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as MorningData;
    const [{ seat, wobble: wob }] = c.seats;
    leanSeats(c);
    if (c.a.phase === 'question') {
      for (const e of c.seats) [e.wobble.x, e.wobble.y, e.wobble.vx, e.wobble.vy] = [0, 0, 0, 0];
      c.hud.ring = [0, 0, 0.22];
      c.hud.show = { question: true };
      const answered = seat.pfl ? 1 : seat.pfr ? 2 : 0;
      if (answered || after(c, QUESTION)) {
        c.flow.question = answered;
        c.hud.show = {};
        say(c, 'tare', answered === 1 ? 'morning.yes' : answered === 2 ? 'morning.no' : 'morning.silent');
        say(c, 'tare', c.flow.day === 1 ? 'morning.teach.ring' : 'morning.ring');
        enter(c, 'ring');
      }
      return;
    }
    if (c.a.phase === 'ring') {
      const r = c.a.pt >= steps(c, NARROW_FROM) ? 0.16 : 0.22;
      c.hud.ring = [0, 0, r];
      c.hud.meter = 1 - c.a.pt / steps(c, RING);
      c.hud.meterLabel = 'Still Ring';
      if (inRing(wob, 0, 0, r)) d.inside += 1;
      if (c.a.pt >= steps(c, RING)) {
        d.a = d.inside / steps(c, RING);
        say(c, 'tare', c.flow.day === 1 ? 'morning.teach.reach' : 'morning.reach');
        enter(c, 'reach');
      }
      return;
    }
    if (c.a.phase === 'reach') {
      d.reachT += 1;
      const slot = d.order[d.target];
      const [tx, ty] = targetAt(slot);
      c.hud.ring = [tx, ty, TARGET_R];
      c.hud.meter = 1 - c.a.pt / steps(c, REACH);
      c.hud.meterLabel = `Reach ${d.target + 1} of 6`;
      if (inRing(wob, tx, ty, TARGET_R)) {
        d.held += 1;
        if (d.held >= steps(c, TARGET_HOLD)) {
          d.held = 0;
          d.target += 1;
          c.w.emit('reachHit', { n: d.target });
        }
      } else d.held = 0;
      if (d.target >= 6 || c.a.pt >= steps(c, REACH)) {
        d.b = d.target >= 6 ? Math.max(0, 1 - d.reachT / steps(c, REACH)) : 0;
        wob.instMul = 1.6;
        say(c, 'tare', d.foot === 'L' ? 'morning.foot.left' : 'morning.foot.right');
        enter(c, 'foot');
      }
      return;
    }
    if (c.a.phase === 'foot') {
      c.hud.ring = [0, 0, 0.3];
      c.hud.meter = 1 - d.footInside / steps(c, FOOT);
      c.hud.meterLabel = d.foot === 'L' ? 'Left foot' : 'Right foot';
      c.hud.show = { foot: d.foot };
      const heldFoot = d.foot === 'L' ? seat.fl >= 0.5 : seat.fr >= 0.5;
      if (heldFoot && inRing(wob, 0, 0, 0.3)) d.footInside += 1;
      else if (!heldFoot) d.footInside = Math.max(0, d.footInside - 1);
      const tree = castOf(c.w, 'guest');
      if (tree)
        Object.assign(tree.cast, {
          pose: heldFoot ? (d.foot === 'L' ? 'Heron' : 'HeronR') : '',
          poseT: heldFoot ? 0.5 : 0,
        });
      if (c.a.pt >= steps(c, FOOT)) {
        d.c = d.footInside / steps(c, FOOT);
        d.s = 0.45 * d.a + 0.3 * d.b + 0.25 * d.c;
        d.age = wobbleAge(d.s, c.w.settings.get<number>('game.age.k'));
        (c.a.data as Record<string, unknown>).age = d.age;
        wob.instMul = 1;
        const guest = castOf(c.w, 'guest');
        if (guest) Object.assign(guest.cast, { pose: '', poseT: 0 });
        c.a.done = true;
      }
    }
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as MorningData;
    const { seat, wobble } = e;
    seat.fl = seat.fr = 0;
    seat.act = false;
    if (c.a.phase === 'question') {
      seat.lx = seat.ly = 0;
      if (player.acts && c.a.pt === 60) seat.fl = 1;
    } else if (c.a.phase === 'reach') {
      const [tx, ty] = targetAt(d.order[Math.min(5, d.target)]);
      holdAt(c.w, seat, wobble, tx, ty, player);
    } else if (c.a.phase === 'foot') {
      holdAt(c.w, seat, wobble, 0, 0, player);
      if (player.acts) {
        seat.fl = d.foot === 'L' ? 1 : 0;
        seat.fr = d.foot === 'R' ? 1 : 0;
      }
    } else {
      holdAt(c.w, seat, wobble, 0, 0, player);
      breathe(c.w, seat, wobble, { ...player, acts: false });
    }
  },
  score(c) {
    const d = c.a.data as unknown as MorningData;
    return d.s * 1000;
  },
};

/** The Plaza's Tare platform, for the props. */
export const PLATFORM_AT = [STATIONS.plaza.x, STATIONS.plaza.z + 1] as const;
